-- ============================================================================
-- SysTarhget — Segurança (RLS por papel) e registro de auditoria
--
-- O QUE MUDA
--   * Só usuários logados leem e gravam as tabelas do sistema.
--   * Conta com app_metadata.role = 'promotor' (Portal do Promotor) só lê
--     cadastros e registra cartas. Qualquer outra conta logada é administradora.
--   * O link público /carta/:id passa a usar a função carta_publica(id), que
--     devolve apenas aquela carta — a tabela deixa de ficar aberta.
--   * Toda criação, alteração e exclusão nas tabelas do sistema fica registrada
--     em audit_log (quem, quando, o quê, antes e depois).
--
-- ANTES DE APLICAR
--   1. Publique o código com a tela de login (senão o painel fica sem dados).
--   2. A conta padrão TARHGET (tarhget@systarhget.app, papel admin) já existe e
--      é usada no painel e no portal. Para uma conta só de portal, crie outra e
--      rode o UPDATE do fim deste arquivo para marcá-la como promotor.
--
-- As tabelas do antigo bot do Telegram (desativado) e assinaturas_pendentes
-- ficam fechadas: os dados são mantidos, mas ninguém lê pela chave pública.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Papel do usuário atual
-- ----------------------------------------------------------------------------
create or replace function public.app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when auth.role() = 'authenticated'
      then coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'admin')
    else null
  end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

-- ----------------------------------------------------------------------------
-- 2. Quem gerou cada carta
-- ----------------------------------------------------------------------------
alter table public.cartas_geradas
  add column if not exists criado_por uuid default auth.uid();

create index if not exists idx_cartas_geradas_criado_em on public.cartas_geradas (criado_em desc);
create index if not exists idx_cartas_geradas_criado_por on public.cartas_geradas (criado_por);

-- ----------------------------------------------------------------------------
-- 3. Remove políticas abertas a qualquer pessoa
-- ----------------------------------------------------------------------------
drop policy if exists "Public Access" on public.cartas_geradas;
drop policy if exists "Permitir inserção de logs" on public.cartas_geradas;
drop policy if exists "Acesso total em pdf_templates" on public.pdf_templates;
drop policy if exists "Permitir tudo no estoque" on public.estoque;
drop policy if exists "Permitir tudo para produtos" on public.produtos;
drop policy if exists "Permitir tudo para movimentacoes" on public.movimentacoes;

-- ----------------------------------------------------------------------------
-- 4. Cadastros: logados leem, só admin altera
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['funcionarios', 'empresas', 'templates', 'pdf_templates'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "systarhget_leitura" on public.%I', t);
    execute format(
      'create policy "systarhget_leitura" on public.%I for select to authenticated using (true)', t);

    execute format('drop policy if exists "systarhget_admin" on public.%I', t);
    execute format(
      'create policy "systarhget_admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Estoque: só admin
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['estoque', 'produtos', 'movimentacoes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "systarhget_admin" on public.%I', t);
    execute format(
      'create policy "systarhget_admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Cartas geradas: admin tudo; promotor registra e vê as próprias
-- ----------------------------------------------------------------------------
alter table public.cartas_geradas enable row level security;

drop policy if exists "systarhget_admin" on public.cartas_geradas;
create policy "systarhget_admin" on public.cartas_geradas
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "systarhget_registrar" on public.cartas_geradas;
create policy "systarhget_registrar" on public.cartas_geradas
  for insert to authenticated
  with check (criado_por = auth.uid());

drop policy if exists "systarhget_proprias" on public.cartas_geradas;
create policy "systarhget_proprias" on public.cartas_geradas
  for select to authenticated
  using (criado_por = auth.uid());

-- Link público de uma carta: devolve só a linha pedida
create or replace function public.carta_publica(p_id uuid)
returns setof public.cartas_geradas
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.cartas_geradas where id = p_id limit 1
$$;

revoke all on function public.carta_publica(uuid) from public;
grant execute on function public.carta_publica(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. Arquivos (logos e carimbos): logados leem, só admin envia ou troca
-- ----------------------------------------------------------------------------
drop policy if exists "Permitir atualização de carimbos" on storage.objects;
drop policy if exists "Permitir atualização de logos" on storage.objects;
drop policy if exists "Permitir leitura pública de carimbos" on storage.objects;
drop policy if exists "Permitir leitura pública de logos" on storage.objects;
drop policy if exists "Permitir upload de carimbos" on storage.objects;
drop policy if exists "Permitir upload de logos" on storage.objects;
drop policy if exists "Permitir upload publico flreew_0" on storage.objects;

drop policy if exists "systarhget_arquivos_leitura" on storage.objects;
create policy "systarhget_arquivos_leitura" on storage.objects
  for select to authenticated
  using (bucket_id in ('logos', 'carimbos', 'documents'));

drop policy if exists "systarhget_arquivos_admin" on storage.objects;
create policy "systarhget_arquivos_admin" on storage.objects
  for all to authenticated
  using (bucket_id in ('logos', 'carimbos', 'documents') and public.is_admin())
  with check (bucket_id in ('logos', 'carimbos', 'documents') and public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Tabelas sem uso (bot do Telegram desativado) e assinaturas pendentes
-- ----------------------------------------------------------------------------
drop policy if exists "Usuários veem apenas seus bots" on public.bots;
drop policy if exists "Permitir atualização" on public.assinaturas_pendentes;
drop policy if exists "Permitir inserção" on public.assinaturas_pendentes;
drop policy if exists "Permitir leitura total para todos (para a rota pública)" on public.assinaturas_pendentes;

do $$
declare
  t text;
begin
  -- RLS ligada e nenhuma política: só a chave service_role (painel do Supabase) acessa
  foreach t in array array['bots', 'bot_auth', 'blocked_dates', 'solicitacoes_correios'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- A tela de Templates limpa assinaturas ao excluir um template
alter table public.assinaturas_pendentes enable row level security;
drop policy if exists "systarhget_admin" on public.assinaturas_pendentes;
create policy "systarhget_admin" on public.assinaturas_pendentes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. Auditoria
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id            bigint generated always as identity primary key,
  ocorreu_em    timestamptz not null default now(),
  usuario_id    uuid,
  usuario_email text,
  tabela        text not null,
  operacao      text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id   text,
  antes         jsonb,
  depois        jsonb
);

create index if not exists idx_audit_log_ocorreu_em on public.audit_log (ocorreu_em desc);
create index if not exists idx_audit_log_tabela on public.audit_log (tabela, ocorreu_em desc);

alter table public.audit_log enable row level security;
drop policy if exists "systarhget_auditoria_leitura" on public.audit_log;
create policy "systarhget_auditoria_leitura" on public.audit_log
  for select to authenticated
  using (public.is_admin());
-- Sem política de escrita: só o gatilho (security definer) grava.

-- Troca textos longos (PDFs em base64, imagens) por um aviso de tamanho
create or replace function public.audit_compact(j jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(
      k,
      case
        when jsonb_typeof(v) = 'string' and length(v #>> '{}') > 500
          then to_jsonb('[conteúdo omitido: ' || length(v #>> '{}') || ' caracteres]')
        else v
      end
    ),
    '{}'::jsonb
  )
  from jsonb_each(j) as e(k, v)
$$;

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes  jsonb;
  v_depois jsonb;
begin
  if tg_op <> 'INSERT' then v_antes := public.audit_compact(to_jsonb(old)); end if;
  if tg_op <> 'DELETE' then v_depois := public.audit_compact(to_jsonb(new)); end if;

  -- Ignora UPDATE que não mudou nada
  if tg_op = 'UPDATE' and v_antes = v_depois then
    return new;
  end if;

  insert into public.audit_log (usuario_id, usuario_email, tabela, operacao, registro_id, antes, depois)
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    tg_table_name,
    tg_op,
    coalesce(v_depois ->> 'id', v_antes ->> 'id'),
    v_antes,
    v_depois
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['funcionarios', 'empresas', 'templates', 'pdf_templates', 'cartas_geradas', 'estoque', 'produtos'] loop
    execute format('drop trigger if exists systarhget_auditoria on public.%I', t);
    execute format(
      'create trigger systarhget_auditoria after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

commit;

-- ============================================================================
-- OPCIONAL: marcar uma conta como promotor (só acessa o Portal)
-- ============================================================================
-- update auth.users
--    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "promotor"}'
--  where email = 'supervisores@systarhget.app';
