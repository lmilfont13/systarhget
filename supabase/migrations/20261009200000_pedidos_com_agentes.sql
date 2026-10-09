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

-- Políticas antigas (da época do bot, por "dono da empresa") ainda abertas:
-- permitiam a qualquer conta logada criar empresa própria e, com ela, gravar
-- funcionários e templates. Ficam só as políticas do sistema.
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
     where schemaname = 'public'
       and tablename in ('funcionarios', 'empresas', 'templates', 'pdf_templates', 'carimbos', 'cartas_geradas', 'lojas')
       and policyname not like 'systarhget\_%'
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Arquivos (logos, carimbos, assinaturas): só admin e Portal leem; nada público
drop policy if exists "systarhget_arquivos_leitura" on storage.objects;
create policy "systarhget_arquivos_leitura" on storage.objects
  for select to authenticated
  using (bucket_id in ('logos', 'carimbos', 'documents') and public.app_role() in ('admin', 'promotor'));
drop policy if exists "Visualização Pública" on storage.objects;
update storage.buckets set public = false where id in ('logos', 'carimbos', 'documents');

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
    and aprovado_por is null
    and exists (select 1 from public.solicitantes s where s.user_id = auth.uid() and s.ativo)
  );

-- Supervisor não escolhe data, status nem nada além do texto; e no máximo 10 pedidos por hora
create or replace function public.solicitacao_ao_criar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() and auth.role() = 'authenticated' then
    new.id := gen_random_uuid();
    new.status := 'recebida';
    new.criado_em := now();
    new.atualizado_em := now();
    new.motivo_recusa := null;
    new.erro := null;
    new.aprovado_por := null;
    new.aprovado_em := null;
    if (select count(*) from public.solicitacoes s
         where s.solicitante_id = new.solicitante_id and s.criado_em > now() - interval '1 hour') >= 10 then
      raise exception 'Limite de 10 pedidos por hora atingido. Tente mais tarde.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists solicitacoes_ao_criar on public.solicitacoes;
create trigger solicitacoes_ao_criar
  before insert on public.solicitacoes
  for each row execute function public.solicitacao_ao_criar();

drop policy if exists "systarhget_admin" on public.solicitacoes;
create policy "systarhget_admin" on public.solicitacoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Análise dos agentes fica separada: tem nomes e CPFs de outros promotores,
-- então só o admin (e o servidor) lê.
create table if not exists public.solicitacoes_analise (
  solicitacao_id uuid primary key references public.solicitacoes (id) on delete cascade,
  itens          jsonb not null default '[]'::jsonb,
  atualizado_em  timestamptz not null default now()
);

alter table public.solicitacoes_analise enable row level security;

drop policy if exists "systarhget_admin" on public.solicitacoes_analise;
create policy "systarhget_admin" on public.solicitacoes_analise
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
           -- CPF só conta quando os 11 dígitos batem exatamente
           case when length(q.digitos) = 11
                 and lpad(regexp_replace(coalesce(f.dados_extras ->> 'CPF', ''), '\D', '', 'g'), 11, '0') = q.digitos
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
-- 6. Supervisor vê as cartas aprovadas do próprio pedido (abre pelo link /carta/:id)
-- ---------------------------------------------------------------------------
create or replace function public.cartas_da_solicitacao(p_solicitacao uuid)
returns table (id uuid, nome_funcionario text, nome_arquivo text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.nome_funcionario, c.nome_arquivo
    from public.cartas_geradas c
    join public.solicitacoes s on s.id = c.solicitacao_id
   where s.id = p_solicitacao
     and s.status = 'aprovada'
     and (s.solicitante_id = auth.uid() or public.is_admin())
$$;

revoke all on function public.cartas_da_solicitacao(uuid) from public, anon;
grant execute on function public.cartas_da_solicitacao(uuid) to authenticated;

commit;
