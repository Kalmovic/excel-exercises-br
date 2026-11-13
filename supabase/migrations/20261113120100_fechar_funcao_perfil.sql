-- A função do gatilho roda como dono do banco (security definer). Ela só deve
-- ser chamada pelo gatilho em auth.users, nunca pela API (/rest/v1/rpc/...).
-- Por padrão o Postgres dá EXECUTE a todos (PUBLIC); aqui tiramos.
revoke execute on function public.criar_perfil() from public, anon, authenticated;
