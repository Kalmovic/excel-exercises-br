-- Teste das cotas (migration 20261118120000_cotas.sql). Roda como dono do banco,
-- entra como um aluno falso e tenta passar dos limites. No fim, levanta uma
-- exceção de propósito: isso desfaz TUDO (rollback).
-- Resultado esperado: a mensagem de erro "COTAS OK: ...".
do $$
declare
  a uuid := gen_random_uuid();
  n int;
begin
  insert into auth.users (id, email, aud, role) values (a, 'cotas@teste.invalid', 'authenticated', 'authenticated');

  -- 2999 linhas de progresso já gravadas (como dono do banco, para ser rápido)
  insert into public.progresso (usuario_id, chave, versao, status, dados)
    select a, 'chave-' || i, 1, 'concluido', '{}' from generate_series(1, 2999) i;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- 1. origem pequena: pode; grande: não
  update public.perfis set origem = '{"utm_source":"instagram"}' where id = a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHA: não gravou origem pequena'; end if;
  begin
    update public.perfis set origem = jsonb_build_object('x', repeat(md5(random()::text), 300)) where id = a;
    raise exception 'FALHA: aceitou origem de ~10 KB';
  exception when check_violation then null;
  end;

  -- 2. a linha 3000 entra; a 3001 não
  insert into public.progresso (usuario_id, chave, versao, status, dados) values (a, 'a-3000', 1, 'concluido', '{}');
  begin
    insert into public.progresso (usuario_id, chave, versao, status, dados) values (a, 'a-3001', 1, 'concluido', '{}');
    raise exception 'FALHA: passou de 3000 linhas de progresso';
  exception when check_violation then null;
  end;

  -- 3. no limite, atualizar (e o upsert de uma chave que já existe) continua valendo
  update public.progresso set status = 'pulado' where usuario_id = a and chave = 'a-3000';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHA: não atualizou no limite'; end if;
  insert into public.progresso (usuario_id, chave, versao, status, dados) values (a, 'a-3000', 2, 'concluido', '{}')
    on conflict (usuario_id, chave) do update set versao = excluded.versao;
  select versao into n from public.progresso where usuario_id = a and chave = 'a-3000';
  if n <> 2 then raise exception 'FALHA: upsert no limite não atualizou'; end if;

  -- 4. o aluno não lê nem grava leads
  begin
    perform 1 from public.contatos;
    raise exception 'FALHA: aluno leu contatos';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.contatos (formulario, dados) values ('contato', '{}');
    raise exception 'FALHA: aluno gravou contato';
  exception when insufficient_privilege then null;
  end;

  -- 5. nem o visitante
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    perform 1 from public.contatos;
    raise exception 'FALHA: anon leu contatos';
  exception when insufficient_privilege then null;
  end;

  raise exception 'COTAS OK: 5 verificações passaram (tudo desfeito)';
end;
$$;
