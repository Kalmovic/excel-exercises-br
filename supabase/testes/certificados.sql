-- Teste das regras dos certificados. Resultado esperado: o erro "CERTIFICADOS OK: ...".
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n int;
  r record;
begin
  insert into auth.users (id, email, aud, role) values (a, 'ca@teste.invalid', 'authenticated', 'authenticated'), (b, 'cb@teste.invalid', 'authenticated', 'authenticated');
  insert into public.certificados (codigo, usuario_id, modulo, nome, acertos, total) values ('ABCD-2345', b, 'busca', 'Beatriz Teste', 5, 5);

  -- 1. código fora do formato é recusado
  begin
    insert into public.certificados (codigo, usuario_id, modulo, nome, acertos, total) values ('abc', a, 'busca', 'Ana', 4, 5);
    raise exception 'FALHA: aceitou código inválido';
  exception when check_violation then null;
  end;

  -- 2. visitante (anon) verifica pelo código e recebe só os campos públicos
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  select * into r from public.verificar_certificado('abcd-2345');
  if r.nome is distinct from 'Beatriz Teste' or r.modulo <> 'busca' then raise exception 'FALHA: verificação pública'; end if;
  begin
    perform 1 from public.certificados;
    raise exception 'FALHA: anon leu a tabela direto';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- 3. aluno A não vê o certificado de B e não consegue se dar um
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.certificados;
  if n <> 0 then raise exception 'FALHA: A viu certificado de B'; end if;
  begin
    insert into public.certificados (codigo, usuario_id, modulo, nome, acertos, total) values ('WXYZ-6789', a, 'busca', 'Ana', 5, 5);
    raise exception 'FALHA: A emitiu o próprio certificado';
  exception when insufficient_privilege then null;
  end;

  raise exception 'CERTIFICADOS OK: 3 verificações passaram (tudo desfeito)';
end;
$$;
