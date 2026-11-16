-- =============================================================================
-- Pagamentos (Asaas): o que falta na tabela de assinaturas e a função que o
-- webhook chama para aplicar cada aviso de pagamento.
--
-- Por que uma função no banco, e não código no servidor:
-- * Ela roda numa TRANSAÇÃO: gravar o aviso e mudar o acesso acontecem juntos
--   ou não acontecem. Se algo falhar no meio, nada fica pela metade, e o Asaas
--   reenvia o aviso depois (ele tenta de novo quando recebe erro).
-- * `for update` trava a linha da assinatura enquanto o aviso é aplicado: dois
--   avisos chegando ao mesmo tempo são aplicados um depois do outro.
-- =============================================================================

-- Mensal = assinatura no Asaas (asaas_assinatura_id). Anual = cobrança avulsa
-- (asaas_cobranca_id). fatura_url = página de pagamento ainda não paga.
alter table public.assinaturas
  add column asaas_cobranca_id text unique,
  add column fatura_url text;

create function public.aplicar_evento_pagamento(evento jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev_id text := evento->>'id';
  tipo text := evento->>'event';
  pg jsonb := evento->'payment';
  assinatura_id text := coalesce(evento->'payment'->>'subscription', evento->'subscription'->>'id');
  linha public.assinaturas%rowtype;
  base date;
  novo_acesso timestamptz;
begin
  if ev_id is null or tipo is null then
    raise exception 'evento sem id ou sem tipo';
  end if;

  -- 1. Idempotência: cada aviso é gravado pelo id. Repetido e já aplicado = nada a fazer.
  insert into public.eventos_pagamento (id, tipo, payload) values (ev_id, tipo, evento)
    on conflict (id) do nothing;
  if exists (select 1 from public.eventos_pagamento where id = ev_id and processado_em is not null) then
    return 'repetido';
  end if;

  -- 2. De quem é: pela assinatura (mensal), pela cobrança (anual) ou pela
  --    referência externa, que é o id do aluno.
  select * into linha from public.assinaturas a
    where (assinatura_id is not null and a.asaas_assinatura_id = assinatura_id)
       or (pg is not null and a.asaas_cobranca_id = pg->>'id')
       or (pg is not null and a.usuario_id::text = pg->>'externalReference')
    limit 1
    for update;
  if not found then
    update public.eventos_pagamento set processado_em = now(), erro = 'aluno não encontrado' where id = ev_id;
    return 'desconhecido';
  end if;

  -- 3. O efeito de cada tipo de aviso.
  if tipo in ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') then
    -- Mensal: o período pago vai do vencimento até o vencimento seguinte.
    -- Anual: 1 ano a partir do dia em que pagou.
    -- + 3 dias de tolerância (compensação do boleto, cartão recusado e refeito).
    -- greatest(): o mesmo pagamento avisado duas vezes (CONFIRMED e depois
    -- RECEIVED) ou fora de ordem nunca encurta nem duplica o acesso.
    if linha.plano = 'anual' then
      base := coalesce(pg->>'confirmedDate', pg->>'paymentDate', pg->>'dueDate')::date;
      novo_acesso := (base + interval '1 year' + interval '3 days')::timestamptz;
    else
      base := (pg->>'dueDate')::date;
      novo_acesso := (base + interval '1 month' + interval '3 days')::timestamptz;
    end if;
    update public.assinaturas
      set status = 'ativa',
          acesso_ate = greatest(coalesce(acesso_ate, novo_acesso), novo_acesso),
          fatura_url = null,
          atualizado_em = now()
      where usuario_id = linha.usuario_id;

  elsif tipo = 'PAYMENT_OVERDUE' then
    -- Atrasou: continua com acesso até acesso_ate (que já tem a tolerância).
    update public.assinaturas set status = 'atrasada', atualizado_em = now()
      where usuario_id = linha.usuario_id and status <> 'cancelada';

  elsif tipo in ('PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED') then
    -- Reembolso (garantia de 7 dias) ou contestação no cartão: acesso termina agora.
    update public.assinaturas
      set status = 'cancelada', acesso_ate = least(coalesce(acesso_ate, now()), now()), atualizado_em = now()
      where usuario_id = linha.usuario_id;
    update public.eventos_pagamento set processado_em = now() where id = ev_id;
    return 'reembolsado'; -- o servidor também cancela a assinatura no Asaas

  elsif tipo in ('SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED') then
    -- Cancelou a renovação: o período já pago continua valendo.
    update public.assinaturas set status = 'cancelada', atualizado_em = now()
      where usuario_id = linha.usuario_id;
  end if;

  update public.eventos_pagamento set processado_em = now() where id = ev_id;
  return 'aplicado';
end;
$$;

-- Só o servidor (chave secreta = papel service_role) chama esta função.
revoke execute on function public.aplicar_evento_pagamento(jsonb) from public, anon, authenticated;
grant execute on function public.aplicar_evento_pagamento(jsonb) to service_role;
