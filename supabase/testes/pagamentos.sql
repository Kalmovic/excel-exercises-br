-- Teste de registrar_pagamento (o que o webhook do Stripe chama).
-- Resultado esperado: o erro "PAGAMENTOS OK: ...". Tudo é desfeito no fim.
do $$
declare
  a uuid := gen_random_uuid();
  r text;
  ate timestamptz;
  st text;
begin
  insert into auth.users (id, email, aud, role) values (a, 'pag@teste.invalid', 'authenticated', 'authenticated');
  -- O checkout grava o cliente do Stripe numa linha pendente.
  insert into public.assinaturas (usuario_id, plano, status, stripe_cliente_id, fatura_url) values (a, 'mensal', 'pendente', 'cus_teste', 'https://checkout');

  -- 1. Fatura paga, achada pelo cliente: ativa até a data, fatura some, guarda a assinatura.
  r := public.registrar_pagamento('evt_1', 'invoice.paid', '{}', 'liberar', 'cus_teste', null, 'mensal', '2026-12-20', 'sub_1');
  select acesso_ate, status into ate, st from public.assinaturas where usuario_id = a;
  if r <> 'aplicado' or st <> 'ativa' or ate::date <> date '2026-12-20' then raise exception 'FALHA 1: % % %', r, st, ate; end if;
  if (select fatura_url is not null or stripe_assinatura_id <> 'sub_1' from public.assinaturas where usuario_id = a) then raise exception 'FALHA 1b'; end if;

  -- 2. O mesmo aviso de novo: não aplica duas vezes.
  if public.registrar_pagamento('evt_1', 'invoice.paid', '{}', 'liberar', 'cus_teste', null, 'mensal', '2027-06-01', 'sub_1') <> 'repetido' then raise exception 'FALHA 2'; end if;

  -- 3. Renovação: estende. 4. Aviso velho fora de ordem: não encurta.
  r := public.registrar_pagamento('evt_2', 'invoice.paid', '{}', 'liberar', 'cus_teste', null, 'mensal', '2027-01-20', 'sub_1');
  r := public.registrar_pagamento('evt_3', 'invoice.paid', '{}', 'liberar', 'cus_teste', null, 'mensal', '2026-12-20', 'sub_1');
  if (select acesso_ate::date from public.assinaturas where usuario_id = a) <> date '2027-01-20' then raise exception 'FALHA 3/4'; end if;

  -- 5. Pagamento falhou: atrasada, acesso mantido.
  r := public.registrar_pagamento('evt_4', 'invoice.payment_failed', '{}', 'atrasar', 'cus_teste');
  if (select status from public.assinaturas where usuario_id = a) <> 'atrasada' then raise exception 'FALHA 5'; end if;

  -- 6. Cancelou a renovação: cancelada, acesso mantido. 7. Desistiu de cancelar: ativa de novo.
  r := public.registrar_pagamento('evt_5', 'customer.subscription.updated', '{}', 'cancelar_renovacao', 'cus_teste');
  select acesso_ate, status into ate, st from public.assinaturas where usuario_id = a;
  if st <> 'cancelada' or ate::date <> date '2027-01-20' then raise exception 'FALHA 6'; end if;
  r := public.registrar_pagamento('evt_6', 'customer.subscription.updated', '{}', 'reativar', 'cus_teste');
  if (select status from public.assinaturas where usuario_id = a) <> 'ativa' then raise exception 'FALHA 7'; end if;

  -- 8. Reembolso: acesso termina agora.
  r := public.registrar_pagamento('evt_7', 'charge.refunded', '{}', 'revogar', 'cus_teste');
  if (select acesso_ate > now() from public.assinaturas where usuario_id = a) then raise exception 'FALHA 8'; end if;

  -- 9. Anual pelo aluno do aviso (client_reference_id), mesmo sem linha antes.
  delete from public.assinaturas where usuario_id = a;
  r := public.registrar_pagamento('evt_8', 'checkout.session.completed', '{}', 'liberar', 'cus_novo', a, 'anual', '2027-11-20');
  if (select plano <> 'anual' or stripe_cliente_id <> 'cus_novo' from public.assinaturas where usuario_id = a) then raise exception 'FALHA 9'; end if;

  -- 10. Aviso de quem não existe: registrado, não quebra. 11. Ignorado: só registra.
  if public.registrar_pagamento('evt_9', 'invoice.paid', '{}', 'liberar', 'cus_outro', null, 'mensal', '2027-01-01') <> 'desconhecido' then raise exception 'FALHA 10'; end if;
  if public.registrar_pagamento('evt_10', 'payment_intent.created', '{}', 'ignorar') <> 'ignorado' then raise exception 'FALHA 11'; end if;

  raise exception 'PAGAMENTOS OK: 11 verificações passaram (tudo desfeito)';
end;
$$;
