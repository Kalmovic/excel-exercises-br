-- =============================================================================
-- Certificados de módulo.
--
-- * Quem grava é só o servidor (chave secreta), depois de corrigir de novo as
--   respostas do teste. O aluno não tem permissão de escrita.
-- * O aluno lê os próprios certificados (para listar em Minha conta).
-- * Qualquer pessoa verifica um certificado pelo código, mas só pela função
--   verificar_certificado, que devolve os campos públicos (nunca o usuario_id).
-- =============================================================================
create table public.certificados (
  codigo text primary key check (codigo ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  modulo text not null,
  nome text not null check (char_length(nome) between 3 and 80),
  acertos int not null,
  total int not null,
  emitido_em timestamptz not null default now(),
  unique (usuario_id, modulo) -- um certificado por módulo por aluno
);

alter table public.certificados enable row level security;

create policy "aluno lê os próprios certificados"
  on public.certificados for select
  to authenticated
  using (usuario_id = (select auth.uid()));

revoke all on public.certificados from anon, authenticated;
grant select on public.certificados to authenticated;

-- Verificação pública: entra o código, sai só o que pode ser mostrado.
create function public.verificar_certificado(codigo_buscado text)
returns table (codigo text, nome text, modulo text, acertos int, total int, emitido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.codigo, c.nome, c.modulo, c.acertos, c.total, c.emitido_em
  from public.certificados c
  where c.codigo = upper(codigo_buscado);
$$;

revoke execute on function public.verificar_certificado(text) from public;
grant execute on function public.verificar_certificado(text) to anon, authenticated;
