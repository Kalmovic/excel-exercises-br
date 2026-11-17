-- =============================================================================
-- Troca do Asaas pelo Stripe.
--
-- Antes, a função do banco lia o aviso do Asaas direto. Agora o servidor
-- traduz o aviso do Stripe numa AÇÃO simples (src/lib/pagamento-stripe.ts) e
-- o banco só aplica. Assim o banco não depende do formato do Stripe (que muda
-- entre versões da API), e a tradução fica fácil de testar.
--
-- Continua igual: idempotência pelo id do aviso, tudo numa transação, linha
-- travada com `for update`, só o servidor executa.
-- =============================================================================

-- Assinaturas pendentes do teste com o Asaas (antes do lançamento): não valem mais.
delete from public.assinaturas where status = 'pendente';

alter table public.assinaturas
  drop column asaas_cliente_id,
  drop column asaas_assinatura_id,
  drop column asaas_cobranca_id,
  add column stripe_cliente_id text unique,
  add column stripe_assinatura_id text unique;

drop function public.aplicar_evento_pagamento(jsonb);

create function public.registrar_pagamento(
  p_evento_id text,
  p_tipo text,
  p_payload jsonb,
  p_acao text,                     -- liberar | atrasar | cancelar_renovacao | reativar | revogar | ignorar
  p_cliente text default null,     -- id do cliente no Stripe (cus_...)
  p_usuario uuid default null,     -- quando o aviso traz o aluno (client_reference_id)
  p_plano text default null,       -- mensal | anual (só em "liberar")
  p_acesso_ate timestamptz default null,
  p_assinatura text default null   -- id da assinatura no Stripe (sub_...)
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
begin
  if p_evento_id is null or p_tipo is null or p_acao is null then
    raise exception 'aviso sem id, tipo ou ação';
  end if;

  -- 1. Idempotência: o mesmo aviso nunca é aplicado duas vezes.
  insert into public.eventos_pagamento (id, tipo, payload) values (p_evento_id, p_tipo, p_payload)
    on conflict (id) do nothing;
  if exists (select 1 from public.eventos_pagamento where id = p_evento_id and processado_em is not null) then
    return 'repetido';
  end if;
  if p_acao = 'ignorar' then
    update public.eventos_pagamento set processado_em = now() where id = p_evento_id;
    return 'ignorado';
  end if;

  -- 2. De quem é: o aluno do aviso ou, se não vier, o dono do cliente no Stripe.
  v_usuario := coalesce(p_usuario, (select usuario_id from public.assinaturas where stripe_cliente_id = p_cliente));
  if v_usuario is null then
    update public.eventos_pagamento set processado_em = now(), erro = 'aluno não encontrado' where id = p_evento_id;
    return 'desconhecido';
  end if;
  perform 1 from public.assinaturas where usuario_id = v_usuario for update;

  -- 3. A ação.
  if p_acao = 'liberar' then
    if p_acesso_ate is null then raise exception 'liberar sem data'; end if;
    insert into public.assinaturas as a (usuario_id, plano, status, acesso_ate, stripe_cliente_id, stripe_assinatura_id)
      values (v_usuario, coalesce(p_plano, 'mensal'), 'ativa', p_acesso_ate, p_cliente, p_assinatura)
    on conflict (usuario_id) do update set
      plano = coalesce(p_plano, a.plano),
      status = 'ativa',
      -- greatest: aviso repetido ou fora de ordem nunca encurta o acesso.
      acesso_ate = greatest(coalesce(a.acesso_ate, excluded.acesso_ate), excluded.acesso_ate),
      stripe_cliente_id = coalesce(a.stripe_cliente_id, excluded.stripe_cliente_id),
      stripe_assinatura_id = coalesce(excluded.stripe_assinatura_id, a.stripe_assinatura_id),
      fatura_url = null,
      atualizado_em = now();
  elsif p_acao = 'atrasar' then
    update public.assinaturas set status = 'atrasada', atualizado_em = now()
      where usuario_id = v_usuario and status <> 'cancelada';
  elsif p_acao = 'cancelar_renovacao' then
    -- O período já pago continua valendo até acesso_ate.
    update public.assinaturas set status = 'cancelada', atualizado_em = now() where usuario_id = v_usuario;
  elsif p_acao = 'reativar' then
    update public.assinaturas set status = 'ativa', atualizado_em = now()
      where usuario_id = v_usuario and status = 'cancelada' and acesso_ate > now();
  elsif p_acao = 'revogar' then
    -- Reembolso (garantia de 7 dias): acesso termina agora.
    update public.assinaturas
      set status = 'cancelada', acesso_ate = least(coalesce(acesso_ate, now()), now()), atualizado_em = now()
      where usuario_id = v_usuario;
  else
    raise exception 'ação desconhecida: %', p_acao;
  end if;

  update public.eventos_pagamento set processado_em = now() where id = p_evento_id;
  return 'aplicado';
end;
$$;

revoke execute on function public.registrar_pagamento(text, text, jsonb, text, text, uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.registrar_pagamento(text, text, jsonb, text, text, uuid, text, timestamptz, text) to service_role;
