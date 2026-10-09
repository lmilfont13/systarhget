-- ============================================================================
-- REVERSÃO de 20261009150000_seguranca_rls_auditoria.sql
-- Volta as permissões ao estado de 09/10/2026 (tabelas abertas).
-- Use só em emergência: o histórico já gravado em audit_log é mantido.
-- ============================================================================

begin;

-- Gatilhos de auditoria
do $$
declare t text;
begin
  foreach t in array array['funcionarios', 'empresas', 'templates', 'pdf_templates', 'cartas_geradas', 'estoque', 'produtos'] loop
    execute format('drop trigger if exists systarhget_auditoria on public.%I', t);
  end loop;
end $$;

-- Políticas novas
do $$
declare t text;
begin
  foreach t in array array['funcionarios', 'empresas', 'templates', 'pdf_templates', 'estoque', 'produtos', 'movimentacoes', 'cartas_geradas'] loop
    execute format('drop policy if exists "systarhget_leitura" on public.%I', t);
    execute format('drop policy if exists "systarhget_admin" on public.%I', t);
  end loop;
end $$;
drop policy if exists "systarhget_registrar" on public.cartas_geradas;
drop policy if exists "systarhget_proprias" on public.cartas_geradas;
drop policy if exists "systarhget_arquivos_leitura" on storage.objects;
drop policy if exists "systarhget_arquivos_admin" on storage.objects;

-- Estado anterior: RLS desligada nestas tabelas
alter table public.funcionarios disable row level security;
alter table public.empresas disable row level security;
alter table public.templates disable row level security;
alter table public.pdf_templates disable row level security;

-- Políticas antigas
create policy "Public Access" on public.cartas_geradas for all using (true);
create policy "Permitir inserção de logs" on public.cartas_geradas for insert with check (true);
create policy "Acesso total em pdf_templates" on public.pdf_templates for all using (true) with check (true);
create policy "Permitir tudo no estoque" on public.estoque for all using (true);
create policy "Permitir tudo para produtos" on public.produtos for all using (true);
create policy "Permitir tudo para movimentacoes" on public.movimentacoes for all using (true);

create policy "Permitir atualização de carimbos" on storage.objects for update using (bucket_id = 'carimbos');
create policy "Permitir atualização de logos" on storage.objects for update using (bucket_id = 'logos');
create policy "Permitir leitura pública de carimbos" on storage.objects for select using (bucket_id = 'carimbos');
create policy "Permitir leitura pública de logos" on storage.objects for select using (bucket_id = 'logos');
create policy "Permitir upload de carimbos" on storage.objects for insert with check (bucket_id = 'carimbos');
create policy "Permitir upload de logos" on storage.objects for insert with check (bucket_id = 'logos');
create policy "Permitir upload publico flreew_0" on storage.objects for insert with check (bucket_id = 'documents');

commit;
