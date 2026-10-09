-- ============================================================================
-- Pedidos de carta com agentes
--
-- 1. Segurança: só administradores e o Portal do Promotor leem o cadastro.
--    (Antes, qualquer conta logada lia funcionários, empresas, templates e lojas.)
-- 2. Supervisores (papel "solicitante") com tabela própria.
-- 3. Pedidos (solicitacoes), resolvidos pelos agentes e aprovados pelo admin.
-- 4. Busca aproximada de promotores e lojas para os agentes.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Leitura do cadastro só para admin e promotor (Portal)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['funcionarios', 'empresas', 'templates', 'pdf_templates', 'lojas'] loop
    execute format('drop policy if exists "systarhget_leitura" on public.%I', t);
    execute format(
      'create policy "systarhget_leitura" on public.%I for select to authenticated
         using (public.app_role() in (''admin'', ''promotor''))', t);
  end loop;
end $$;

drop policy if exists "systarhget_registrar" on public.cartas_geradas;
create policy "systarhget_registrar" on public.cartas_geradas
  for insert to authenticated
  with check (criado_por = auth.uid() and public.app_role() in ('admin', 'promotor'));

-- ---------------------------------------------------------------------------
-- 2. Busca sem acento e por semelhança
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.sem_acento(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

-- ---------------------------------------------------------------------------
-- 3. Supervisores
-- ---------------------------------------------------------------------------
create table if not exists public.solicitantes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nome       text not null check (length(trim(nome)) >= 3),
  whatsapp   text not null default '',
  usuario    text not null unique,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

alter table public.solicitantes enable row level security;

drop policy if exists "solicitante_proprio" on public.solicitantes;
create policy "solicitante_proprio" on public.solicitantes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "systarhget_admin" on public.solicitantes;
create policy "systarhget_admin" on public.solicitantes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Pedidos
-- ---------------------------------------------------------------------------
create table if not exists public.solicitacoes (
  id             uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references public.solicitantes (user_id) on delete cascade,
  texto          text not null check (length(trim(texto)) between 3 and 4000),
  status         text not null default 'recebida'
                 check (status in ('recebida', 'processando', 'revisao', 'aprovada', 'recusada', 'erro')),
  itens          jsonb not null default '[]'::jsonb,
  motivo_recusa  text,
  erro           text,
  aprovado_por   uuid references auth.users (id) on delete set null,
  aprovado_em    timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index if not exists solicitacoes_status_idx on public.solicitacoes (status, criado_em desc);
create index if not exists solicitacoes_solicitante_idx on public.solicitacoes (solicitante_id, criado_em desc);

alter table public.solicitacoes enable row level security;

drop policy if exists "solicitante_le_proprias" on public.solicitacoes;
create policy "solicitante_le_proprias" on public.solicitacoes
  for select to authenticated using (solicitante_id = auth.uid());

-- Supervisor ativo cria pedido só com o texto (o resto é do servidor)
drop policy if exists "solicitante_cria" on public.solicitacoes;
create policy "solicitante_cria" on public.solicitacoes
  for insert to authenticated
  with check (
    solicitante_id = auth.uid()
    and status = 'recebida'
    and itens = '[]'::jsonb
    and aprovado_por is null
    and exists (select 1 from public.solicitantes s where s.user_id = auth.uid() and s.ativo)
  );

drop policy if exists "systarhget_admin" on public.solicitacoes;
create policy "systarhget_admin" on public.solicitacoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists solicitacoes_atualizado_em on public.solicitacoes;
create trigger solicitacoes_atualizado_em
  before update on public.solicitacoes
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists systarhget_auditoria on public.solicitacoes;
create trigger systarhget_auditoria
  after insert or update or delete on public.solicitacoes
  for each row execute function public.audit_trigger();

drop trigger if exists systarhget_auditoria on public.solicitantes;
create trigger systarhget_auditoria
  after insert or update or delete on public.solicitantes
  for each row execute function public.audit_trigger();

-- Caixa de entrada e "Meus pedidos" atualizam sozinhos
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'solicitacoes'
  ) then
    alter publication supabase_realtime add table public.solicitacoes;
  end if;
end $$;

-- Carta ligada ao pedido; template padrão dos pedidos
alter table public.cartas_geradas
  add column if not exists solicitacao_id uuid references public.solicitacoes (id) on delete set null;
create index if not exists cartas_geradas_solicitacao_idx on public.cartas_geradas (solicitacao_id);

alter table public.templates
  add column if not exists padrao_pedidos boolean not null default false;

-- ---------------------------------------------------------------------------
-- 5. Busca para os agentes (só o servidor chama)
-- ---------------------------------------------------------------------------
create or replace function public.buscar_promotores(termo text, limite int default 6)
returns table (id uuid, nome text, cpf text, cargo text, empresa_id uuid, cdc text, semelhanca real)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select public.sem_acento(termo) as t,
           regexp_replace(coalesce(termo, ''), '\D', '', 'g') as digitos
  )
  select f.id, f.nome, f.dados_extras ->> 'CPF', f.cargo, f.empresa_id,
         coalesce(f.dados_extras ->> 'NC FUNCIONARIO', f.dados_extras ->> 'NC', ''),
         greatest(
           extensions.word_similarity(q.t, public.sem_acento(f.nome)),
           case when length(q.digitos) >= 6
                 and regexp_replace(coalesce(f.dados_extras ->> 'CPF', ''), '\D', '', 'g') like '%' || q.digitos || '%'
                then 1 else 0 end
         )::real as semelhanca
    from public.funcionarios f, q
   order by semelhanca desc, f.nome
   limit greatest(1, least(limite, 15))
$$;

create or replace function public.buscar_lojas(termo text, limite int default 6)
returns table (id uuid, nome text, cidade_uf text, semelhanca real)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.nome, l.cidade_uf,
         extensions.word_similarity(public.sem_acento(termo), public.sem_acento(l.nome))::real as semelhanca
    from public.lojas l
   order by semelhanca desc, l.nome
   limit greatest(1, least(limite, 15))
$$;

revoke all on function public.buscar_promotores(text, int) from public, anon, authenticated;
revoke all on function public.buscar_lojas(text, int) from public, anon, authenticated;
grant execute on function public.buscar_promotores(text, int) to service_role;
grant execute on function public.buscar_lojas(text, int) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Supervisor baixa as cartas aprovadas do próprio pedido
-- ---------------------------------------------------------------------------
create or replace function public.cartas_da_solicitacao(p_solicitacao uuid)
returns table (id uuid, nome_funcionario text, nome_arquivo text, url_storage text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.nome_funcionario, c.nome_arquivo, c.url_storage
    from public.cartas_geradas c
    join public.solicitacoes s on s.id = c.solicitacao_id
   where s.id = p_solicitacao
     and s.status = 'aprovada'
     and (s.solicitante_id = auth.uid() or public.is_admin())
$$;

revoke all on function public.cartas_da_solicitacao(uuid) from public, anon;
grant execute on function public.cartas_da_solicitacao(uuid) to authenticated;

commit;
