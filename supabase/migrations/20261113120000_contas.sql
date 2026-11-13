-- =============================================================================
-- Contas, progresso e assinatura do Planilhês.
--
-- Como ler este arquivo:
-- * O Supabase cria sozinho a tabela `auth.users` (e-mail, login, sessões).
--   Nós nunca escrevemos nela: as nossas tabelas, no schema `public`,
--   apontam para ela pelo id do usuário (uuid).
-- * O site conversa com o banco usando a chave pública (publishable). Ela fica
--   no navegador de propósito, então NÃO é ela que protege os dados.
-- * Quem protege é o RLS (Row Level Security): regras dentro do próprio
--   Postgres que filtram cada SELECT/INSERT/UPDATE/DELETE pelo usuário logado.
--   `auth.uid()` devolve o id de quem fez a requisição (lido do token de login).
--   Tabela com RLS ligado e sem regra = ninguém de fora acessa.
-- * O nosso servidor (webhook de pagamento) usa a chave secreta, que ignora o
--   RLS. Ela fica só nas variáveis de ambiente da Vercel, nunca no navegador.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- perfis: um por usuário, criado automaticamente no cadastro.
-- -----------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text check (char_length(nome) <= 80),
  -- Papel decide o acesso ao /admin. Só muda pelo painel do Supabase ou SQL.
  papel text not null default 'aluno' check (papel in ('aluno', 'admin')),
  -- De onde o aluno veio (utm, indicação), copiado do navegador no 1º login.
  origem jsonb,
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy "aluno lê o próprio perfil"
  on public.perfis for select
  to authenticated
  using (id = (select auth.uid()));

create policy "aluno edita o próprio perfil"
  on public.perfis for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Privilégios por coluna: mesmo editando o próprio perfil, o aluno só pode
-- mexer em `nome` e `origem`. Sem isso, bastaria um UPDATE em `papel` pelo
-- console do navegador para virar admin.
revoke all on public.perfis from anon, authenticated;
grant select on public.perfis to authenticated;
grant update (nome, origem) on public.perfis to authenticated;

-- Gatilho (trigger): quando o Supabase cria um usuário em auth.users, criamos
-- o perfil dele. `security definer` faz a função rodar com a permissão de quem
-- a criou (o dono do banco), porque o aluno não tem permissão de INSERT.
-- `set search_path = ''` evita que alguém "sequestre" nomes de tabela.
create function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id) values (new.id);
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();


-- -----------------------------------------------------------------------------
-- progresso: uma linha por questão (a mesma chave do navegador: slug ou
-- "licao#etapa"). `dados` guarda o objeto inteiro que o site já usa
-- (conteúdos das células, tentativas, histórico...), e as colunas soltas
-- servem para consultas (ex.: quantos concluíram o módulo X).
-- -----------------------------------------------------------------------------
create table public.progresso (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  chave text not null check (char_length(chave) <= 120),
  versao int not null,
  status text not null check (status in ('em-andamento', 'concluido', 'pulado')),
  dados jsonb not null check (pg_column_size(dados) <= 32768),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, chave)
);

alter table public.progresso enable row level security;

-- Uma regra para as 4 operações: só as próprias linhas.
create policy "aluno mexe no próprio progresso"
  on public.progresso for all
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

revoke all on public.progresso from anon, authenticated;
grant select, insert, update, delete on public.progresso to authenticated;


-- -----------------------------------------------------------------------------
-- estado_aluno: o resto do que hoje mora no localStorage, numa linha só.
-- -----------------------------------------------------------------------------
create table public.estado_aluno (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  trofeus jsonb not null default '{}',      -- modulo -> data da conquista
  preferencias jsonb not null default '{}', -- ex.: pularIntro
  ofensiva jsonb not null default '[]',     -- dias com atividade (AAAA-MM-DD)
  testes jsonb not null default '{}',       -- resultado dos testes de módulo
  atualizado_em timestamptz not null default now(),
  check (pg_column_size(trofeus) + pg_column_size(preferencias)
         + pg_column_size(ofensiva) + pg_column_size(testes) <= 65536)
);

alter table public.estado_aluno enable row level security;

create policy "aluno mexe no próprio estado"
  on public.estado_aluno for all
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

revoke all on public.estado_aluno from anon, authenticated;
grant select, insert, update, delete on public.estado_aluno to authenticated;


-- -----------------------------------------------------------------------------
-- assinaturas: quem é Pro e até quando. O aluno só LÊ a própria linha.
-- Quem escreve é o nosso servidor, ao receber o webhook do Asaas (com a chave
-- secreta). Por isso não existe nenhum GRANT de escrita para `authenticated`:
-- ninguém se dá Pro pelo navegador.
-- -----------------------------------------------------------------------------
create table public.assinaturas (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  plano text not null check (plano in ('mensal', 'anual')),
  status text not null check (status in ('pendente', 'ativa', 'atrasada', 'cancelada')),
  -- A regra de acesso é só esta: acesso_ate no futuro = Pro.
  acesso_ate timestamptz,
  asaas_cliente_id text,
  asaas_assinatura_id text unique,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.assinaturas enable row level security;

create policy "aluno lê a própria assinatura"
  on public.assinaturas for select
  to authenticated
  using (usuario_id = (select auth.uid()));

revoke all on public.assinaturas from anon, authenticated;
grant select on public.assinaturas to authenticated;


-- -----------------------------------------------------------------------------
-- eventos_pagamento: cada aviso (webhook) do Asaas, gravado ANTES de ser
-- aplicado. A chave primária é o id do evento: se o Asaas mandar o mesmo
-- aviso duas vezes, o segundo INSERT falha e o evento não é aplicado de novo
-- (idempotência). Também serve de histórico para auditoria.
-- RLS ligado e nenhuma regra: só o servidor (chave secreta) acessa.
-- -----------------------------------------------------------------------------
create table public.eventos_pagamento (
  id text primary key,
  tipo text not null,
  payload jsonb not null,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  erro text
);

alter table public.eventos_pagamento enable row level security;
revoke all on public.eventos_pagamento from anon, authenticated;
