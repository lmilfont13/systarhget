-- Quanto os agentes de IA gastaram em cada processamento de pedido (só o admin vê)
create table if not exists public.uso_agentes (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid references public.solicitacoes(id) on delete set null,
  chamadas int not null default 0,
  tokens_entrada int not null default 0,
  tokens_saida int not null default 0,
  custo_usd numeric(12, 6) not null default 0,
  cotacao_dolar numeric(8, 4) not null,
  custo_brl numeric(12, 4) not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists uso_agentes_criado_em_idx on public.uso_agentes (criado_em desc);

alter table public.uso_agentes enable row level security;

drop policy if exists systarhget_uso_agentes_admin on public.uso_agentes;
create policy systarhget_uso_agentes_admin on public.uso_agentes
  for select to authenticated using (public.is_admin());
-- Gravação só pela Edge Function (service_role, que ignora RLS)
