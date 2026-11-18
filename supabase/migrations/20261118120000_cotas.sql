-- =============================================================================
-- Cotas e leads (revisão de segurança, F1).
--
-- 1. perfis.origem: o aluno escreve nesta coluna direto pela API (grant
--    update (nome, origem)). Sem limite, cabia um JSON de megabytes.
-- 2. progresso: 32 KB por linha, mas sem limite de linhas por aluno; com a
--    chave pública e uma sessão, dava para inserir milhões de linhas.
--    O conteúdo inteiro (lições em etapas, testes, desafios) dá algumas
--    centenas de chaves; 3.000 deixa folga para anos de desafios diários.
-- 3. contatos: os leads B2B saem do log do servidor (dado pessoal) e vêm
--    para cá. Só o servidor (chave secreta) lê e grava.
-- =============================================================================

-- 1. origem com no máximo 4 KB. `not valid` + `validate`: se já existir linha
-- maior, a migration inteira falha (e nada muda), em vez de cortar dados.
alter table public.perfis
  add constraint perfis_origem_tamanho check (origem is null or pg_column_size(origem) <= 4096) not valid;
alter table public.perfis validate constraint perfis_origem_tamanho;

-- 2. no máximo 3.000 linhas de progresso por aluno (só conta na inserção:
-- atualizar uma linha que já existe continua livre).
create function public.limitar_progresso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Trava por aluno: dois inserts ao mesmo tempo não passam juntos do limite.
  perform pg_advisory_xact_lock(hashtextextended('progresso:' || new.usuario_id::text, 0));
  -- Upsert de uma chave que já existe vira update: não é linha nova.
  if exists (select 1 from public.progresso where usuario_id = new.usuario_id and chave = new.chave) then
    return new;
  end if;
  if (select count(*) from public.progresso where usuario_id = new.usuario_id) >= 3000 then
    raise exception 'limite de progresso por aluno atingido' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.limitar_progresso() from public, anon, authenticated;

create trigger progresso_limite_por_aluno
  before insert on public.progresso
  for each row execute function public.limitar_progresso();

-- 3. leads B2B.
create table public.contatos (
  id bigint generated always as identity primary key,
  formulario text not null check (formulario in ('contato', 'indicacao')),
  publico text check (publico in ('empresa', 'universidade')),
  dados jsonb not null check (pg_column_size(dados) <= 8192),
  pagina text check (char_length(pagina) <= 500),
  criado_em timestamptz not null default now()
);

alter table public.contatos enable row level security;
-- Sem nenhuma policy e sem grant: só a chave secreta (service_role) acessa.
revoke all on public.contatos from public, anon, authenticated;
