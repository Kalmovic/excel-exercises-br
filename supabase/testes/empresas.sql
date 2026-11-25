-- Teste das licenças para empresas (organizações, convite, painel do gestor,
-- pagamento da fatura). Roda como dono do banco e "entra" como cada pessoa.
-- No fim, levanta uma exceção de propósito: isso desfaz TUDO (rollback).
-- Resultado esperado: a mensagem de erro "EMPRESAS OK: ...".
do $$
declare
  gestor uuid := gen_random_uuid();
  ana uuid := gen_random_uuid();
  bia uuid := gen_random_uuid();
  intruso uuid := gen_random_uuid();
  extras uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  org uuid;
  org2 uuid;
  codigo text;
  codigo2 text;
  r text;
  j jsonb;
  ate timestamptz;
  n int;
  como_aluno text := 'authenticated';
  i int;
begin
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (gestor, 'Gestora@Empresa.invalid', 'authenticated', 'authenticated', now()),
    (ana, 'ana@empresa.invalid', 'authenticated', 'authenticated', now()),
    (bia, 'bia@empresa.invalid', 'authenticated', 'authenticated', now()),
    (intruso, 'intruso@outra.invalid', 'authenticated', 'authenticated', now());
  for i in 1..4 loop
    insert into auth.users (id, email, aud, role, email_confirmed_at) values (extras[i], 'extra' || i || '@empresa.invalid', 'authenticated', 'authenticated', now());
  end loop;

  insert into public.organizacoes (nome, cnpj, email_financeiro, cep, logradouro, numero, bairro, cidade, uf, assentos, preco_por_pessoa_ano, gestor_email, stripe_cliente_id)
    values ('Empresa Teste Ltda', '11222333000181', 'financeiro@empresa.invalid', '20040002', 'Av. Rio Branco', '1', 'Centro', 'Rio de Janeiro', 'RJ', 5, 180, 'gestora@empresa.invalid', 'cus_org')
    returning id, codigo_convite into org, codigo;
  if codigo !~ '^[0-9a-f]{32}$' then raise exception 'FALHA 1: código de convite fraco: %', codigo; end if;
  insert into public.organizacoes (nome, cnpj, email_financeiro, cep, logradouro, numero, bairro, cidade, uf, assentos, preco_por_pessoa_ano, gestor_email, status, acesso_ate)
    values ('Outra SA', '11444777000161', 'fin@outra.invalid', '01310100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', 5, 180, 'chefe@outra.invalid', 'ativa', now() + interval '1 year')
    returning id, codigo_convite into org2, codigo2;

  -- 2. Mínimo de 5 vagas.
  begin
    insert into public.organizacoes (nome, cnpj, email_financeiro, cep, logradouro, numero, bairro, cidade, uf, assentos, preco_por_pessoa_ano, gestor_email)
      values ('Pequena', '11222333000181', 'f@p.invalid', '20040002', 'Rua A', '1', 'Centro', 'Rio', 'RJ', 4, 180, 'g@p.invalid');
    raise exception 'FALHA 2: aceitou 4 vagas';
  exception when check_violation then null;
  end;

  -- 3. Proposta (não paga): convite não entra, ninguém é Pro.
  perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  execute 'set local role ' || como_aluno;
  if public.entrar_na_organizacao(codigo) <> 'inativa' then raise exception 'FALHA 3'; end if;
  if public.entrar_na_organizacao('00000000000000000000000000000000') <> 'invalido' then raise exception 'FALHA 3b'; end if;
  if public.entrar_na_organizacao('nada') <> 'invalido' then raise exception 'FALHA 3c'; end if;
  reset role;

  -- 4. Fatura paga: ativa por 12 meses + 3 dias. Mesmo aviso ou mesma fatura de novo: não estende.
  r := public.registrar_pagamento_empresa('evt_org_1', 'invoice.paid', '{}', 'liberar', org, 'cus_org', 'in_1', '2026-11-25 12:00-03');
  select acesso_ate into ate from public.organizacoes where id = org;
  if r <> 'aplicado' or ate <> timestamptz '2027-11-28 12:00-03' or (select status from public.organizacoes where id = org) <> 'ativa' then
    raise exception 'FALHA 4: % %', r, ate;
  end if;
  if public.registrar_pagamento_empresa('evt_org_1', 'invoice.paid', '{}', 'liberar', org, 'cus_org', 'in_1', '2026-11-25 12:00-03') <> 'repetido' then raise exception 'FALHA 4b'; end if;
  if public.registrar_pagamento_empresa('evt_org_1b', 'invoice.paid', '{}', 'liberar', org, 'cus_org', 'in_1', '2026-11-26 12:00-03') <> 'repetido' then raise exception 'FALHA 4c'; end if;
  if (select acesso_ate from public.organizacoes where id = org) <> ate then raise exception 'FALHA 4d'; end if;
  -- Organização que não existe: registrado, não quebra.
  if public.registrar_pagamento_empresa('evt_org_x', 'invoice.paid', '{}', 'liberar', gen_random_uuid(), 'cus_x', 'in_x', now()) <> 'desconhecido' then raise exception 'FALHA 4e'; end if;
  -- Para os testes de vaga/Pro, o contrato precisa valer hoje.
  update public.organizacoes set acesso_ate = now() + interval '1 year' where id = org;

  -- 5. Ana entra: é Pro; entrar de novo = já é membro. Ela não é gestora.
  perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  execute 'set local role ' || como_aluno;
  if public.tem_acesso_pro() then raise exception 'FALHA 5a: Pro antes de entrar'; end if;
  if (public.convite_publico(codigo)->>'situacao') <> 'aberta' then raise exception 'FALHA 5b'; end if;
  if public.entrar_na_organizacao(upper(codigo)) <> 'entrou' then raise exception 'FALHA 5c'; end if;
  if not public.tem_acesso_pro() then raise exception 'FALHA 5d: membro não é Pro'; end if;
  if public.entrar_na_organizacao(codigo) <> 'ja_membro' then raise exception 'FALHA 5e'; end if;
  if (public.minha_organizacao()->'membro'->>'nome') <> 'Empresa Teste Ltda' then raise exception 'FALHA 5f'; end if;
  if public.painel_gestor('{}') is not null then raise exception 'FALHA 5g: membro viu o painel'; end if;
  if public.remover_membro(ana) <> 'nao_gestor' then raise exception 'FALHA 5h'; end if;
  -- Já está numa organização vigente: não entra em outra.
  if public.entrar_na_organizacao(codigo2) <> 'outra_organizacao' then raise exception 'FALHA 5i'; end if;
  -- Não consulta o acesso de outra pessoa.
  begin
    perform public.tem_acesso_pro(bia);
    raise exception 'FALHA 5j: consultou o acesso de outra pessoa';
  exception when insufficient_privilege then null;
  end;
  -- 6. Sem acesso direto às tabelas.
  begin
    perform 1 from public.organizacoes;
    raise exception 'FALHA 6a: leu organizacoes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.membros_organizacao;
    raise exception 'FALHA 6b: leu membros';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.membros_organizacao (organizacao_id, usuario_id) values (org, ana);
    raise exception 'FALHA 6c: gravou membro direto';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.registrar_pagamento_empresa('evt_falso', 'invoice.paid', '{}', 'liberar', org, null, 'in_falso', now());
    raise exception 'FALHA 6d: aluno chamou a função do webhook';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- 7. Lota: mais 4 entram (5 vagas), a sexta pessoa recebe "lotada".
  for i in 1..4 loop
    perform set_config('request.jwt.claims', json_build_object('sub', extras[i], 'role', 'authenticated')::text, true);
    execute 'set local role ' || como_aluno;
    if public.entrar_na_organizacao(codigo) <> 'entrou' then raise exception 'FALHA 7a (%)', i; end if;
    reset role;
  end loop;
  perform set_config('request.jwt.claims', json_build_object('sub', bia, 'role', 'authenticated')::text, true);
  execute 'set local role ' || como_aluno;
  if (public.convite_publico(codigo)->>'situacao') <> 'lotada' then raise exception 'FALHA 7b'; end if;
  if public.entrar_na_organizacao(codigo) <> 'lotada' then raise exception 'FALHA 7c'; end if;
  reset role;

  -- 8. Gestora: no primeiro acesso vira gestor_id (e-mail sem diferença de maiúsculas); vê o painel.
  insert into public.progresso (usuario_id, chave, versao, status, dados) values
    (ana, 'licao-a', 1, 'concluido', '{"resposta": "segredo"}'),
    (ana, 'licao-b', 1, 'em-andamento', '{}'),
    (ana, 'desafio-x', 1, 'concluido', '{}');
  insert into public.certificados (codigo, usuario_id, modulo, nome, acertos, total) values ('ABCD-EFGH', ana, 'fundamentos', 'Ana Teste', 9, 10);
  perform set_config('request.jwt.claims', json_build_object('sub', gestor, 'role', 'authenticated')::text, true);
  execute 'set local role ' || como_aluno;
  j := public.painel_gestor(array['licao-a', 'licao-b']);
  if j is null then raise exception 'FALHA 8a: gestora sem painel'; end if;
  if (j->'organizacao'->>'usados')::int <> 5 or (j->'organizacao'->>'assentos')::int <> 5 then raise exception 'FALHA 8b: %', j->'organizacao'; end if;
  if jsonb_array_length(j->'membros') <> 5 then raise exception 'FALHA 8c'; end if;
  select m into j from jsonb_array_elements(j->'membros') m where m->>'email' = 'ana@empresa.invalid';
  if (j->>'licoes')::int <> 1 or j->'certificados' <> '["fundamentos"]'::jsonb or j->>'ultimo_acesso' is null then raise exception 'FALHA 8d: %', j; end if;
  if j::text like '%segredo%' then raise exception 'FALHA 8e: painel mostrou respostas'; end if;
  if (public.minha_organizacao()->'gestor'->>'nome') <> 'Empresa Teste Ltda' then raise exception 'FALHA 8f'; end if;
  -- A gestora não é membro (não ocupa vaga) e por isso não é Pro.
  if public.tem_acesso_pro() then raise exception 'FALHA 8g'; end if;

  -- 9. Remove a Ana: a vaga abre, ela deixa de ser Pro. Remover quem não é membro: nao_membro.
  if public.remover_membro(ana) <> 'removido' then raise exception 'FALHA 9a'; end if;
  if public.remover_membro(intruso) <> 'nao_membro' then raise exception 'FALHA 9b'; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role": "service_role"}', true); -- o servidor
  if public.tem_acesso_pro(ana) then raise exception 'FALHA 9c: removida continua Pro'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', bia, 'role', 'authenticated')::text, true);
  execute 'set local role ' || como_aluno;
  if public.entrar_na_organizacao(codigo) <> 'entrou' then raise exception 'FALHA 9d: vaga não abriu'; end if;
  reset role;

  -- 10. Outro gestor não vê nem remove membros desta organização.
  perform set_config('request.jwt.claims', json_build_object('sub', intruso, 'role', 'authenticated')::text, true);
  execute 'set local role ' || como_aluno;
  if public.painel_gestor('{}') is not null then raise exception 'FALHA 10a'; end if;
  if public.remover_membro(bia) <> 'nao_gestor' then raise exception 'FALHA 10b'; end if;
  reset role;

  -- 11. Contrato vencido: ninguém é Pro e o convite avisa.
  update public.organizacoes set acesso_ate = now() - interval '1 day' where id = org;
  perform set_config('request.jwt.claims', '{"role": "service_role"}', true); -- o servidor
  if public.tem_acesso_pro(bia) then raise exception 'FALHA 11a'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  execute 'set local role ' || como_aluno;
  if public.entrar_na_organizacao(codigo) <> 'vencida' then raise exception 'FALHA 11b'; end if;
  reset role;

  perform set_config('request.jwt.claims', '{"role": "service_role"}', true); -- o servidor
  -- 12. Renovação paga antes do fim conta do fim atual; reembolso cancela.
  update public.organizacoes set acesso_ate = timestamptz '2027-11-28 12:00-03' where id = org;
  r := public.registrar_pagamento_empresa('evt_org_2', 'invoice.paid', '{}', 'liberar', org, 'cus_org', 'in_2', '2027-11-01 12:00-03');
  if (select acesso_ate from public.organizacoes where id = org) <> timestamptz '2028-11-28 12:00-03' then raise exception 'FALHA 12a: %', (select acesso_ate from public.organizacoes where id = org); end if;
  if public.registrar_pagamento_empresa('evt_aluno', 'charge.refunded', '{}', 'cancelar', null, 'cus_de_aluno') <> 'nao_empresa' then raise exception 'FALHA 12b'; end if;
  if exists (select 1 from public.eventos_pagamento where id = 'evt_aluno') then raise exception 'FALHA 12c: registrou aviso de aluno'; end if;
  if public.registrar_pagamento_empresa('evt_org_3', 'charge.refunded', '{}', 'cancelar', null, 'cus_org') <> 'aplicado' then raise exception 'FALHA 12d'; end if;
  if (select status <> 'cancelada' or acesso_ate > now() from public.organizacoes where id = org) then raise exception 'FALHA 12e'; end if;
  if public.tem_acesso_pro(bia) then raise exception 'FALHA 12f'; end if;

  -- 13. Visitante sem login (anon): vê o convite, não entra, não chama o resto.
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  if (public.convite_publico(codigo2)->>'nome') <> 'Outra SA' then raise exception 'FALHA 13a'; end if;
  begin
    perform public.entrar_na_organizacao(codigo2);
    raise exception 'FALHA 13b: anon entrou';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.tem_acesso_pro(ana);
    raise exception 'FALHA 13c: anon consultou acesso';
  exception when insufficient_privilege then null;
  end;
  reset role;

  raise exception 'EMPRESAS OK: 13 grupos de verificações passaram (tudo desfeito)';
end;
$$;
