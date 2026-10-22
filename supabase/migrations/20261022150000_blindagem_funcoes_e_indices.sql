-- Blindagem de banco: nada aqui muda comportamento de tela.
-- São correções apontadas pelos advisors de segurança e performance do Supabase.

-- 1. Funções de gatilho não devem ser chamáveis por RPC.
--    O gatilho continua disparando normalmente: quem o executa é a tabela,
--    não o usuário da API. Hoje qualquer visitante consegue chamar
--    /rest/v1/rpc/audit_trigger.
revoke execute on function public.audit_trigger() from anon, authenticated;
revoke execute on function public.solicitacao_ao_criar() from anon, authenticated;

-- 2. search_path fixo. Sem isso, quem chama a função pode trocar o schema
--    debaixo dela e fazer o código resolver outra tabela.
alter function public.search_historico set search_path = public, pg_temp;
alter function public.find_historico_by_contact_name set search_path = public, pg_temp;

-- 3. Índices nas chaves estrangeiras.
--    Hoje, com poucas linhas, não muda nada; é dívida barata de pagar antes
--    de a tabela crescer, quando o mesmo índice custa downtime.
create index if not exists idx_assinaturas_pendentes_empresa on public.assinaturas_pendentes (empresa_id);
create index if not exists idx_assinaturas_pendentes_funcionario on public.assinaturas_pendentes (funcionario_id);
create index if not exists idx_assinaturas_pendentes_template on public.assinaturas_pendentes (template_id);
create index if not exists idx_bot_auth_bot on public.bot_auth (bot_id);
create index if not exists idx_bots_empresa on public.bots (empresa_id);
create index if not exists idx_carimbos_empresa on public.carimbos (empresa_id);
create index if not exists idx_cartas_geradas_bot on public.cartas_geradas (bot_id);
create index if not exists idx_cartas_geradas_empresa on public.cartas_geradas (empresa_id);
create index if not exists idx_cartas_geradas_funcionario on public.cartas_geradas (funcionario_id);
create index if not exists idx_cartas_geradas_template on public.cartas_geradas (template_id);
create index if not exists idx_empresas_auth_user on public.empresas (auth_user_id);
create index if not exists idx_funcionarios_empresa on public.funcionarios (empresa_id);
create index if not exists idx_pedidos_phone on public.pedidos (phone);
create index if not exists idx_solicitacoes_aprovado_por on public.solicitacoes (aprovado_por);
create index if not exists idx_templates_empresa on public.templates (empresa_id);
create index if not exists idx_uso_agentes_solicitacao on public.uso_agentes (solicitacao_id);

-- 4. auth.uid() envolvido em subconsulta: assim o Postgres resolve uma vez só,
--    em vez de reavaliar linha a linha. Mesmo resultado, custo menor.
drop policy if exists solicitante_le_proprias on public.solicitacoes;
create policy solicitante_le_proprias on public.solicitacoes
  for select to authenticated
  using (solicitante_id = (select auth.uid()));

drop policy if exists solicitante_cria on public.solicitacoes;
create policy solicitante_cria on public.solicitacoes
  for insert to authenticated
  with check (
    solicitante_id = (select auth.uid())
    and status = 'recebida'
    and aprovado_por is null
    -- supervisor desativado não cria pedido: a regra vive aqui, no banco,
    -- e não só na tela.
    and exists (
      select 1 from public.solicitantes s
      where s.user_id = (select auth.uid()) and s.ativo
    )
  );

drop policy if exists solicitante_proprio on public.solicitantes;
create policy solicitante_proprio on public.solicitantes
  for select to authenticated
  using (user_id = (select auth.uid()));
