-- Teste das regras de RLS. Roda como dono do banco, cria dois alunos falsos,
-- "entra" como o aluno A e tenta o que não pode. No fim, levanta uma exceção
-- de propósito: isso desfaz TUDO (rollback), então o banco fica como estava.
-- Resultado esperado: a mensagem de erro "RLS OK: ...".
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n int;
  como_aluno text := 'authenticated';
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'a@teste.invalid', 'authenticated', 'authenticated'),
    (b, 'b@teste.invalid', 'authenticated', 'authenticated');

  -- o gatilho criou os perfis?
  select count(*) into n from public.perfis where id in (a, b);
  if n <> 2 then raise exception 'FALHA: gatilho não criou os perfis'; end if;

  -- dados do aluno B, gravados como dono do banco
  insert into public.progresso (usuario_id, chave, versao, status, dados) values (b, 'x', 1, 'concluido', '{}');
  insert into public.assinaturas (usuario_id, plano, status, acesso_ate) values (b, 'mensal', 'ativa', now() + interval '30 days');

  -- daqui em diante, somos o aluno A (é o que o token de login faz na API)
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role ' || como_aluno;

  -- 1. não vê o progresso nem a assinatura de B
  select count(*) into n from public.progresso;
  if n <> 0 then raise exception 'FALHA: A viu progresso de B'; end if;
  select count(*) into n from public.assinaturas;
  if n <> 0 then raise exception 'FALHA: A viu assinatura de B'; end if;

  -- 2. grava e lê o próprio progresso
  insert into public.progresso (usuario_id, chave, versao, status, dados) values (a, 'y', 1, 'em-andamento', '{}');
  select count(*) into n from public.progresso;
  if n <> 1 then raise exception 'FALHA: A não leu o próprio progresso'; end if;

  -- 3. não grava progresso em nome de B
  begin
    insert into public.progresso (usuario_id, chave, versao, status, dados) values (b, 'z', 1, 'concluido', '{}');
    raise exception 'FALHA: A gravou progresso de B';
  exception when insufficient_privilege then null; -- esperado: violou a regra
  end;

  -- 4. não altera o progresso de B (o UPDATE simplesmente não acha a linha)
  update public.progresso set status = 'pulado' where usuario_id = b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: A alterou progresso de B'; end if;

  -- 5. não se dá Pro
  begin
    insert into public.assinaturas (usuario_id, plano, status, acesso_ate) values (a, 'anual', 'ativa', now() + interval '1 year');
    raise exception 'FALHA: A criou a própria assinatura';
  exception when insufficient_privilege then null;
  end;

  -- 6. não vira admin
  begin
    update public.perfis set papel = 'admin' where id = a;
    raise exception 'FALHA: A virou admin';
  exception when insufficient_privilege then null;
  end;

  -- 7. pode mudar o próprio nome
  update public.perfis set nome = 'Ana' where id = a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHA: A não conseguiu mudar o nome'; end if;

  -- 8. não lê os eventos de pagamento
  begin
    perform 1 from public.eventos_pagamento;
    raise exception 'FALHA: A leu eventos de pagamento';
  exception when insufficient_privilege then null;
  end;

  raise exception 'RLS OK: 8 verificações passaram (tudo desfeito)';
end;
$$;
