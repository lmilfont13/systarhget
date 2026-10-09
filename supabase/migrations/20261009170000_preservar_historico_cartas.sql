-- ============================================================================
-- 1. Preserva o histórico de cartas ao excluir uma empresa
--    Antes: excluir uma empresa apagava em cascata todas as cartas dela.
--    Agora: as cartas ficam no histórico e só perdem o vínculo com a empresa.
--    (Templates já funcionavam assim.)
--
-- 2. Verificação pública de autenticidade
--    verificar_carta(id) devolve só os dados de conferência (sem o PDF, sem CPF)
--    para o selo mostrado no link público da carta.
-- ============================================================================

begin;

alter table public.cartas_geradas
  drop constraint if exists cartas_geradas_empresa_id_fkey;

alter table public.cartas_geradas
  add constraint cartas_geradas_empresa_id_fkey
  foreign key (empresa_id) references public.empresas (id) on delete set null;

create or replace function public.verificar_carta(p_id uuid)
returns table (
  id uuid,
  nome_funcionario text,
  empresa text,
  emitida_em timestamptz,
  codigo text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         c.nome_funcionario,
         e.nome::text,
         coalesce(c.data_geracao, c.criado_em),
         upper(substr(replace(c.id::text, '-', ''), 1, 8))
    from public.cartas_geradas c
    left join public.empresas e on e.id = c.empresa_id
   where c.id = p_id
   limit 1
$$;

revoke all on function public.verificar_carta(uuid) from public;
grant execute on function public.verificar_carta(uuid) to anon, authenticated;

commit;
