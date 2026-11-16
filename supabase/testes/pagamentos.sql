-- Teste da função aplicar_evento_pagamento (o que o webhook do Asaas chama).
-- Cria um aluno falso, simula os avisos e desfaz tudo no fim (a exceção final).
-- Resultado esperado: o erro "PAGAMENTOS OK: ...".
do $$
declare
  a uuid := gen_random_uuid();
  r text;
  ate timestamptz;
  st text;
  ev jsonb;
begin
  insert into auth.users (id, email, aud, role) values (a, 'pag@teste.invalid', 'authenticated', 'authenticated');
  insert into public.assinaturas (usuario_id, plano, status, asaas_assinatura_id, fatura_url)
    values (a, 'mensal', 'pendente', 'sub_teste', 'https://exemplo/fatura');

  -- 1. Cartão confirmado: ativa, acesso até vencimento + 1 mês + 3 dias, fatura some.
  ev := jsonb_build_object('id', 'evt_1', 'event', 'PAYMENT_CONFIRMED',
          'payment', jsonb_build_object('id', 'pay_1', 'subscription', 'sub_teste', 'dueDate', '2026-11-16'));
  r := public.aplicar_evento_pagamento(ev);
  select acesso_ate, status into ate, st from public.assinaturas where usuario_id = a;
  if r <> 'aplicado' or st <> 'ativa' or ate::date <> date '2026-12-19' then
    raise exception 'FALHA 1: % % %', r, st, ate; end if;
  if (select fatura_url from public.assinaturas where usuario_id = a) is not null then raise exception 'FALHA 1b: fatura'; end if;

  -- 2. O mesmo aviso de novo: não aplica duas vezes.
  if public.aplicar_evento_pagamento(ev) <> 'repetido' then raise exception 'FALHA 2: repetido'; end if;

  -- 3. RECEIVED do mesmo pagamento (outro aviso): não estende de novo.
  r := public.aplicar_evento_pagamento(jsonb_build_object('id', 'evt_2', 'event', 'PAYMENT_RECEIVED',
          'payment', jsonb_build_object('id', 'pay_1', 'subscription', 'sub_teste', 'dueDate', '2026-11-16')));
  if (select acesso_ate::date from public.assinaturas where usuario_id = a) <> date '2026-12-19' then raise exception 'FALHA 3: duplicou'; end if;

  -- 4. Renovação de dezembro: estende até 19/01.
  r := public.aplicar_evento_pagamento(jsonb_build_object('id', 'evt_3', 'event', 'PAYMENT_CONFIRMED',
          'payment', jsonb_build_object('id', 'pay_2', 'subscription', 'sub_teste', 'dueDate', '2026-12-16')));
  if (select acesso_ate::date from public.assinaturas where usuario_id = a) <> date '2027-01-19' then raise exception 'FALHA 4: renovação'; end if;

  -- 5. Aviso atrasado do pagamento de novembro chegando depois: não encurta.
  r := public.aplicar_evento_pagamento(jsonb_build_object('id', 'evt_4', 'event', 'PAYMENT_RECEIVED',
          'payment', jsonb_build_object('id', 'pay_1b', 'subscription', 'sub_teste', 'dueDate', '2026-11-16')));
  if (select acesso_ate::date from public.assinaturas where usuario_id = a) <> date '2027-01-19' then raise exception 'FALHA 5: encurtou'; end if;

  -- 6. Atraso: status atrasada, acesso mantido.
  r := public.aplicar_evento_pagamento(jsonb_build_object('id', 'evt_5', 'event', 'PAYMENT_OVERDUE',
          'payment', jsonb_build_object('id', 'pay_3', 'subscription', 'sub_teste', 'dueDate', '2027-01-16')));
  select acesso_ate, status into ate, st from public.assinaturas where usuario_id = a;
  if st <> 'atrasada' or ate::date <> date '2027-01-19' then raise exception 'FALHA 6: atraso % %', st, ate; end if;

  -- 7. Cancelou a renovação: cancelada, mas o período pago continua.
  r := public.aplicar_evento_pagamento(jsonb_build_object('id', 'evt_6', 'event', 'SUBSCRIPTION_DELETED',
          'subscription', jsonb_build_object('id', 'sub_teste')));
  select acesso_ate, status into ate, st from public.assinaturas where usuario_id = a;
  if st <> 'cancelada' or ate::date <> date '2027-01-19' then raise exception 'FALHA 7: cancelamento % %', st, ate; end if;

  -- 8. Reembolso: acesso termina agora.
  r := public.aplicar_evento_pagamento(jsonb_build_object('id', 'evt_7', 'event', 'PAYMENT_REFUNDED',
          'payment', jsonb_build_object('id', 'pay_2', 'subscription', 'sub_teste', 'dueDate', '2026-12-16')));
  if r <> 'reembolsado' or (select acesso_ate from public.assinaturas where usuario_id = a) > now() then raise exception 'FALHA 8: reembolso'; end if;

  -- 9. Anual (cobrança avulsa, achada pela referência externa = id do aluno): 1 ano + 3 dias da data paga.
  update public.assinaturas set plano = 'anual', status = 'pendente', acesso_ate = null, asaas_assinatura_id = null where usuario_id = a;
  r := public.aplicar_evento_pagamento(jsonb_build_object('id', 'evt_8', 'event', 'PAYMENT_RECEIVED',
          'payment', jsonb_build_object('id', 'pay_anual', 'externalReference', a::text, 'dueDate', '2026-11-19', 'paymentDate', '2026-11-17')));
  if (select acesso_ate::date from public.assinaturas where usuario_id = a) <> date '2027-11-20' then raise exception 'FALHA 9: anual'; end if;

  -- 10. Aviso de quem não existe: registrado, não quebra.
  if public.aplicar_evento_pagamento(jsonb_build_object('id', 'evt_9', 'event', 'PAYMENT_RECEIVED',
          'payment', jsonb_build_object('id', 'pay_x', 'subscription', 'sub_outra'))) <> 'desconhecido' then raise exception 'FALHA 10'; end if;

  raise exception 'PAGAMENTOS OK: 10 verificações passaram (tudo desfeito)';
end;
$$;
