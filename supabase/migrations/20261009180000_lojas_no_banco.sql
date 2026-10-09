-- ============================================================================
-- Lojas no banco de dados
--
-- Antes as lojas cadastradas ficavam só no navegador de quem cadastrou:
-- não apareciam em outro computador e sumiam ao limpar o cache.
-- Depois desta migração, a tela Lojas, o gerador de documentos e o Portal leem
-- desta tabela. As lojas que estiverem salvas no navegador são enviadas para cá
-- automaticamente na primeira vez que alguém abrir o sistema nesse navegador.
-- ============================================================================

begin;

create table if not exists public.lojas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (length(trim(nome)) > 0),
  endereco   text not null default '',
  cidade_uf  text not null default '',
  cnpj       text not null default '',
  criado_em  timestamptz not null default now()
);

-- Evita lojas duplicadas com o mesmo nome (ignorando maiúsculas e espaços)
create unique index if not exists lojas_nome_unico on public.lojas (lower(trim(nome)));

alter table public.lojas enable row level security;

drop policy if exists "systarhget_leitura" on public.lojas;
create policy "systarhget_leitura" on public.lojas
  for select to authenticated using (true);

drop policy if exists "systarhget_admin" on public.lojas;
create policy "systarhget_admin" on public.lojas
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Auditoria (mesmo gatilho das outras tabelas)
drop trigger if exists systarhget_auditoria on public.lojas;
create trigger systarhget_auditoria
  after insert or update or delete on public.lojas
  for each row execute function public.audit_trigger();

commit;
