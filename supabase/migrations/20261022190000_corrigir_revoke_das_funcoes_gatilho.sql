-- Correção da migration 20261022150000.
--
-- Lá eu escrevi:
--     revoke execute on function public.audit_trigger() from anon, authenticated;
--
-- e não adiantou. Motivo: no Postgres, função nasce com EXECUTE concedido a
-- PUBLIC. Tirar de `anon` não tira o que vem de PUBLIC, e `anon` continua
-- executando por herança. Dava para ver na coluna proacl: o `=X/postgres`,
-- com o lado esquerdo vazio, é justamente a permissão de PUBLIC.
--
-- O revoke tem que mirar PUBLIC. Depois devolvemos só a quem precisa —
-- e, para função de gatilho, ninguém precisa: quem a executa é a tabela.

revoke execute on function public.audit_trigger() from public, anon, authenticated;
revoke execute on function public.solicitacao_ao_criar() from public, anon, authenticated;

-- carta_publica e verificar_carta continuam abertas de propósito: é por elas
-- que alguém confere a autenticidade de uma carta sem ter conta no sistema.
