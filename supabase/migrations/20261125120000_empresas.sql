-- =============================================================================
-- Licenças para empresas (B2B): organização, vagas, convite e painel do gestor.
--
-- Como funciona:
-- * O dono cria a organização no /admin/empresas (status 'proposta') e manda
--   a fatura pelo Stripe. Quando ela é paga, o webhook chama
--   registrar_pagamento_empresa: a organização fica 'ativa' por 12 meses.
-- * O gestor recebe o link /convite/<codigo_convite> e o repassa à equipe.
--   Cada pessoa que entra (entrar_na_organizacao) ocupa uma vaga.
-- * Membro de organização ativa é Pro: tem_acesso_pro() é a regra única.
-- * O gestor é quem entra com gestor_email: no primeiro acesso dele, gestor_id
--   é preenchido. Só ele vê o painel (painel_gestor) e remove membros.
--
-- Segurança: as duas tabelas têm RLS ligado, nenhuma policy e nenhum grant para
-- anon/authenticated. O site só chega nelas pelas funções abaixo (security
-- definer, search_path vazio), que conferem quem está chamando.
-- =============================================================================

create table public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 160),
  cnpj text not null check (cnpj ~ '^[0-9]{14}$'),
  email_financeiro text not null check (char_length(email_financeiro) between 3 and 200),
  -- Endereço da nota fiscal (a prefeitura exige CEP).
  cep text not null check (cep ~ '^[0-9]{8}$'),
  logradouro text not null check (char_length(logradouro) between 2 and 200),
  numero text not null check (char_length(numero) between 1 and 20),
  complemento text check (char_length(complemento) <= 100),
  bairro text not null check (char_length(bairro) between 2 and 100),
  cidade text not null check (char_length(cidade) between 2 and 100),
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  assentos int not null check (assentos >= 5 and assentos <= 10000),
  preco_por_pessoa_ano numeric(10, 2) not null check (preco_por_pessoa_ano > 0),
  -- A regra de acesso: status 'ativa' e acesso_ate no futuro.
  acesso_ate timestamptz,
  status text not null default 'proposta' check (status in ('proposta', 'ativa', 'vencida', 'cancelada')),
  -- 128 bits aleatórios (gen_random_uuid usa o gerador forte do Postgres): não dá para adivinhar.
  codigo_convite text not null unique default replace(gen_random_uuid()::text, '-', '') check (codigo_convite ~ '^[0-9a-f]{32}$'),
  gestor_id uuid references auth.users (id) on delete set null,
  gestor_email text not null check (char_length(gestor_email) between 3 and 200),
  stripe_cliente_id text unique check (char_length(stripe_cliente_id) <= 100),
  stripe_fatura_id text unique check (char_length(stripe_fatura_id) <= 100), -- a última fatura gerada
  fatura_url text check (char_length(fatura_url) <= 500),
  ultima_fatura_paga text check (char_length(ultima_fatura_paga) <= 100), -- idempotência da renovação
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index organizacoes_gestor on public.organizacoes (gestor_id);
create index organizacoes_gestor_email on public.organizacoes (lower(gestor_email));

create table public.membros_organizacao (
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  email text check (char_length(email) <= 200),
  entrou_em timestamptz not null default now(),
  primary key (organizacao_id, usuario_id)
);

create index membros_organizacao_usuario on public.membros_organizacao (usuario_id);

alter table public.organizacoes enable row level security;
alter table public.membros_organizacao enable row level security;
-- Sem policy e sem grant: só as funções abaixo e a chave secreta (servidor) acessam.
revoke all on public.organizacoes from public, anon, authenticated;
revoke all on public.membros_organizacao from public, anon, authenticated;
grant all on public.organizacoes, public.membros_organizacao to service_role;


-- -----------------------------------------------------------------------------
-- Organização vale agora? (status ativa e dentro do prazo)
-- -----------------------------------------------------------------------------
create function public.organizacao_vigente(o public.organizacoes)
returns boolean
language sql
stable
set search_path = ''
as $$
  select o.status = 'ativa' and o.acesso_ate is not null and o.acesso_ate > now();
$$;

revoke execute on function public.organizacao_vigente(public.organizacoes) from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- tem_acesso_pro: assinatura própria em dia OU membro de organização vigente.
-- O aluno só pergunta por si mesmo; o servidor (chave secreta, sem auth.uid())
-- pergunta por qualquer um.
-- -----------------------------------------------------------------------------
create function public.tem_acesso_pro(p_usuario uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := coalesce(p_usuario, auth.uid());
begin
  if v_usuario is null then return false; end if;
  if auth.uid() is not null and v_usuario <> auth.uid() then
    raise exception 'só dá para consultar o próprio acesso' using errcode = 'insufficient_privilege';
  end if;
  return exists (select 1 from public.assinaturas a where a.usuario_id = v_usuario and a.acesso_ate > now())
      or exists (
        select 1 from public.membros_organizacao m
        join public.organizacoes o on o.id = m.organizacao_id
        where m.usuario_id = v_usuario and o.status = 'ativa' and o.acesso_ate > now()
      );
end;
$$;

revoke execute on function public.tem_acesso_pro(uuid) from public, anon;
grant execute on function public.tem_acesso_pro(uuid) to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- Gestor: quem entra com o gestor_email vira o gestor_id (no primeiro acesso).
-- Interna: chamada por minha_organizacao e painel_gestor.
-- -----------------------------------------------------------------------------
create function public.vincular_gestor()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_email text;
begin
  if v_usuario is null then return; end if;
  -- Só e-mail confirmado (o login por código confirma o e-mail).
  select lower(u.email) into v_email from auth.users u where u.id = v_usuario and u.email_confirmed_at is not null;
  if v_email is null then return; end if;
  update public.organizacoes
    set gestor_id = v_usuario, atualizado_em = now()
    where gestor_id is null and lower(gestor_email) = v_email and status <> 'cancelada';
end;
$$;

revoke execute on function public.vincular_gestor() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- minha_organizacao: para "Minha conta". A organização de que o aluno é membro
-- (a vigente primeiro) e se ele é o gestor de alguma.
-- -----------------------------------------------------------------------------
create function public.minha_organizacao()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_membro jsonb;
  v_gestor jsonb;
begin
  if v_usuario is null then return null; end if;
  perform public.vincular_gestor();
  select jsonb_build_object('nome', o.nome, 'acesso_ate', o.acesso_ate, 'vigente', public.organizacao_vigente(o))
    into v_membro
    from public.membros_organizacao m join public.organizacoes o on o.id = m.organizacao_id
    where m.usuario_id = v_usuario
    order by public.organizacao_vigente(o) desc, o.acesso_ate desc nulls last
    limit 1;
  select jsonb_build_object('nome', o.nome) into v_gestor
    from public.organizacoes o where o.gestor_id = v_usuario and o.status <> 'cancelada'
    order by o.criado_em desc limit 1;
  if v_membro is null and v_gestor is null then return null; end if;
  return jsonb_build_object('membro', v_membro, 'gestor', v_gestor);
end;
$$;

revoke execute on function public.minha_organizacao() from public, anon;
grant execute on function public.minha_organizacao() to authenticated;


-- -----------------------------------------------------------------------------
-- convite_publico: o que a tela do convite mostra ANTES de entrar (sem login).
-- Só o nome da empresa e a situação; nada de e-mails nem de membros.
-- -----------------------------------------------------------------------------
create function public.convite_publico(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nome', o.nome,
    'situacao', case
      when o.status = 'cancelada' then 'cancelada'
      when o.status = 'proposta' then 'inativa'
      when not public.organizacao_vigente(o) then 'vencida'
      when (select count(*) from public.membros_organizacao m where m.organizacao_id = o.id) >= o.assentos then 'lotada'
      else 'aberta'
    end,
    'membro', exists (select 1 from public.membros_organizacao m where m.organizacao_id = o.id and m.usuario_id = auth.uid())
  )
  from public.organizacoes o
  where o.codigo_convite = lower(p_codigo);
$$;

revoke execute on function public.convite_publico(text) from public;
grant execute on function public.convite_publico(text) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- entrar_na_organizacao: o aluno logado ocupa uma vaga.
-- Resultado: 'entrou' | 'ja_membro' | 'invalido' | 'inativa' | 'vencida' |
--            'cancelada' | 'lotada' | 'outra_organizacao' | 'sem_login'
-- Concorrência: `for update` trava a organização (duas pessoas não pegam a
-- última vaga juntas) e o advisory lock trava o aluno (ele não entra em duas
-- organizações ao mesmo tempo).
-- -----------------------------------------------------------------------------
create function public.entrar_na_organizacao(p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_org public.organizacoes%rowtype;
  v_usados int;
begin
  if v_usuario is null then return 'sem_login'; end if;
  if p_codigo is null or p_codigo !~ '^[0-9a-fA-F]{32}$' then return 'invalido'; end if;

  perform pg_advisory_xact_lock(hashtextextended('organizacao-membro:' || v_usuario::text, 0));
  select * into v_org from public.organizacoes where codigo_convite = lower(p_codigo) for update;
  if not found then return 'invalido'; end if;

  if exists (select 1 from public.membros_organizacao where organizacao_id = v_org.id and usuario_id = v_usuario) then
    return 'ja_membro';
  end if;
  if v_org.status = 'cancelada' then return 'cancelada'; end if;
  if v_org.status = 'proposta' then return 'inativa'; end if;
  if not public.organizacao_vigente(v_org) then return 'vencida'; end if;

  -- No máximo uma organização vigente por pessoa.
  if exists (
    select 1 from public.membros_organizacao m join public.organizacoes o on o.id = m.organizacao_id
    where m.usuario_id = v_usuario and m.organizacao_id <> v_org.id and public.organizacao_vigente(o)
  ) then
    return 'outra_organizacao';
  end if;

  select count(*) into v_usados from public.membros_organizacao where organizacao_id = v_org.id;
  if v_usados >= v_org.assentos then return 'lotada'; end if;

  insert into public.membros_organizacao (organizacao_id, usuario_id, email)
    values (v_org.id, v_usuario, (select u.email from auth.users u where u.id = v_usuario));
  return 'entrou';
end;
$$;

revoke execute on function public.entrar_na_organizacao(text) from public, anon;
grant execute on function public.entrar_na_organizacao(text) to authenticated;


-- -----------------------------------------------------------------------------
-- painel_gestor: só para o gestor logado. Dados da organização, vagas e, por
-- membro: e-mail, nome, lições concluídas (entre as chaves da trilha que o site
-- manda), último acesso e os módulos certificados. Nada de respostas.
-- -----------------------------------------------------------------------------
create function public.painel_gestor(p_licoes text[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_org public.organizacoes%rowtype;
begin
  if v_usuario is null then return null; end if;
  perform public.vincular_gestor();
  select * into v_org from public.organizacoes
    where gestor_id = v_usuario and status <> 'cancelada'
    order by public.organizacao_vigente(organizacoes) desc, criado_em desc
    limit 1;
  if not found then return null; end if;

  return jsonb_build_object(
    'organizacao', jsonb_build_object(
      'nome', v_org.nome,
      'status', case when v_org.status = 'ativa' and not public.organizacao_vigente(v_org) then 'vencida' else v_org.status end,
      'acesso_ate', v_org.acesso_ate,
      'assentos', v_org.assentos,
      'usados', (select count(*) from public.membros_organizacao where organizacao_id = v_org.id),
      'codigo_convite', v_org.codigo_convite
    ),
    'membros', coalesce((
      select jsonb_agg(jsonb_build_object(
          'usuario_id', m.usuario_id,
          'email', m.email,
          'nome', p.nome,
          'entrou_em', m.entrou_em,
          'licoes', (select count(*) from public.progresso g
                      where g.usuario_id = m.usuario_id and g.status = 'concluido' and g.chave = any (coalesce(p_licoes, '{}'))),
          'ultimo_acesso', greatest(
            (select max(g.atualizado_em) from public.progresso g where g.usuario_id = m.usuario_id),
            (select e.atualizado_em from public.estado_aluno e where e.usuario_id = m.usuario_id)
          ),
          'certificados', coalesce((select jsonb_agg(c.modulo order by c.emitido_em) from public.certificados c where c.usuario_id = m.usuario_id), '[]'::jsonb)
        ) order by m.entrou_em)
      from public.membros_organizacao m
      left join public.perfis p on p.id = m.usuario_id
      where m.organizacao_id = v_org.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.painel_gestor(text[]) from public, anon;
grant execute on function public.painel_gestor(text[]) to authenticated;


-- -----------------------------------------------------------------------------
-- remover_membro: só o gestor, só da própria organização. Libera a vaga.
-- Resultado: 'removido' | 'nao_membro' | 'nao_gestor'
-- -----------------------------------------------------------------------------
create function public.remover_membro(p_usuario uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_org uuid;
begin
  if v_usuario is null then return 'nao_gestor'; end if;
  select id into v_org from public.organizacoes
    where gestor_id = v_usuario and status <> 'cancelada'
    order by public.organizacao_vigente(organizacoes) desc, criado_em desc
    limit 1
    for update;
  if v_org is null then return 'nao_gestor'; end if;
  delete from public.membros_organizacao where organizacao_id = v_org and usuario_id = p_usuario;
  if not found then return 'nao_membro'; end if;
  return 'removido';
end;
$$;

revoke execute on function public.remover_membro(uuid) from public, anon;
grant execute on function public.remover_membro(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- registrar_pagamento_empresa: o que o webhook do Stripe chama para a fatura
-- da empresa (paga → ativa; reembolso ou contestação → cancelada).
-- Mesma idempotência de registrar_pagamento (eventos_pagamento pelo id do aviso),
-- mais a fatura: a mesma fatura paga nunca estende o acesso duas vezes.
--
-- p_acao 'liberar': p_organizacao, p_fatura e p_pago_em obrigatórios.
--   acesso_ate = pagamento + 12 meses + 3 dias de tolerância. Renovação paga
--   antes do fim: os 12 meses contam do fim do contrato atual (sem perder dias).
-- p_acao 'cancelar': acha a organização pelo cliente do Stripe. Se o cliente
--   não é de empresa, devolve 'nao_empresa' SEM registrar nada (o webhook segue
--   para registrar_pagamento, do aluno individual).
-- -----------------------------------------------------------------------------
create function public.registrar_pagamento_empresa(
  p_evento_id text,
  p_tipo text,
  p_payload jsonb,
  p_acao text,
  p_organizacao uuid default null,
  p_cliente text default null,
  p_fatura text default null,
  p_pago_em timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizacoes%rowtype;
  v_base timestamptz;
begin
  if p_evento_id is null or p_tipo is null or p_acao not in ('liberar', 'cancelar') then
    raise exception 'aviso sem id, tipo ou ação válida';
  end if;

  if p_acao = 'cancelar' then
    select * into v_org from public.organizacoes
      where (p_organizacao is not null and id = p_organizacao) or (p_cliente is not null and stripe_cliente_id = p_cliente)
      limit 1 for update;
    if not found then return 'nao_empresa'; end if;
  end if;

  insert into public.eventos_pagamento (id, tipo, payload) values (p_evento_id, p_tipo, p_payload)
    on conflict (id) do nothing;
  if exists (select 1 from public.eventos_pagamento where id = p_evento_id and processado_em is not null) then
    return 'repetido';
  end if;

  if p_acao = 'liberar' then
    if p_organizacao is null or p_fatura is null or p_pago_em is null then raise exception 'liberar sem organização, fatura ou data'; end if;
    select * into v_org from public.organizacoes where id = p_organizacao for update;
    if not found then
      update public.eventos_pagamento set processado_em = now(), erro = 'organização não encontrada' where id = p_evento_id;
      return 'desconhecido';
    end if;
    if v_org.ultima_fatura_paga = p_fatura then
      update public.eventos_pagamento set processado_em = now() where id = p_evento_id;
      return 'repetido';
    end if;
    v_base := case
      when v_org.status = 'ativa' and v_org.acesso_ate > p_pago_em then v_org.acesso_ate - interval '3 days'
      else p_pago_em
    end;
    update public.organizacoes set
      status = 'ativa',
      acesso_ate = greatest(v_base, p_pago_em) + interval '12 months' + interval '3 days',
      ultima_fatura_paga = p_fatura,
      stripe_cliente_id = coalesce(stripe_cliente_id, p_cliente),
      fatura_url = null,
      atualizado_em = now()
      where id = v_org.id;
  else
    update public.organizacoes set
      status = 'cancelada',
      acesso_ate = least(coalesce(acesso_ate, now()), now()),
      atualizado_em = now()
      where id = v_org.id;
  end if;

  update public.eventos_pagamento set processado_em = now() where id = p_evento_id;
  return 'aplicado';
end;
$$;

revoke execute on function public.registrar_pagamento_empresa(text, text, jsonb, text, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.registrar_pagamento_empresa(text, text, jsonb, text, uuid, text, text, timestamptz) to service_role;
