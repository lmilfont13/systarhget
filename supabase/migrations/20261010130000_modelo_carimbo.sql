-- Modelo do carimbo nas cartas, por empresa:
--   'unico'    = assinatura do responsável por cima do carimbo da empresa (um bloco só)
--   'separado' = carimbo do responsável (com a assinatura) à esquerda e o da empresa à direita
alter table public.empresas
  add column if not exists modelo_carimbo text not null default 'unico';

do $$ begin
  alter table public.empresas
    add constraint empresas_modelo_carimbo_ck check (modelo_carimbo in ('unico', 'separado'));
exception when duplicate_object then null; end $$;

-- A SPAR continua no modelo com imagens separadas
update public.empresas set modelo_carimbo = 'separado' where trim(upper(nome)) like 'SPAR%';
