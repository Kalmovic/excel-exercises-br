-- =============================================================================
-- Notas fiscais de serviço (NFS-e) emitidas pelo Asaas a cada pagamento do Stripe.
--
-- Uma linha por pagamento (`origem` = id do checkout ou da fatura no Stripe,
-- único): se o Stripe reenviar o aviso, a linha já existe e a nota não sai duas
-- vezes. Só o servidor (chave secreta) lê e grava.
-- =============================================================================

create table public.notas_fiscais (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users (id) on delete set null,
  origem text not null unique check (char_length(origem) <= 100),
  pagamento text check (char_length(pagamento) <= 100), -- PaymentIntent do Stripe (para cancelar no reembolso)
  valor numeric(10, 2) not null check (valor > 0),
  descricao text not null check (char_length(descricao) <= 1000),
  status text not null default 'pendente' check (status in ('pendente', 'emitida', 'sem_dados', 'erro', 'cancelada')),
  asaas_cliente text check (char_length(asaas_cliente) <= 100),
  asaas_nota text check (char_length(asaas_nota) <= 100),
  erro text check (char_length(erro) <= 2000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index notas_fiscais_pagamento on public.notas_fiscais (pagamento);
create index notas_fiscais_usuario on public.notas_fiscais (usuario_id);

alter table public.notas_fiscais enable row level security;
-- Sem nenhuma policy e sem grant: só a chave secreta (service_role) acessa.
revoke all on public.notas_fiscais from public, anon, authenticated;
