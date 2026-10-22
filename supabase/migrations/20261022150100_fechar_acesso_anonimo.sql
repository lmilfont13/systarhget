-- ATENÇÃO: aplicar esta migration só depois de ler o parágrafo abaixo.
--
-- Este banco é compartilhado com outros apps (bot de WhatsApp, cardápio).
-- Estas tabelas têm policies com papel `public`, que em Postgres significa
-- TODOS os papéis — inclusive `anon`. E a chave anônima do systarhget vai no
-- bundle JavaScript, que é público por definição. Resultado: qualquer pessoa
-- que abra o site consegue ler (e em alguns casos escrever) estas tabelas.
--
--   historico_whatsapp   183 linhas de conversa
--   clientes              20 cadastros
--   conversas              9 registros
--   config                 1 linha, e com UPDATE liberado
--
-- O que NÃO quebra ao aplicar isto:
--   - Qualquer serviço que use a chave `service_role` (bots de servidor, n8n,
--     webhooks). O service_role ignora RLS por completo: estas policies não
--     fazem diferença para ele.
--   - Usuários logados nas telas: clientes, conversas, cardápio e config já
--     têm policies próprias para `authenticated`, criadas em separado.
--
-- O que PODE quebrar:
--   - Algum app que leia ou escreva estas tabelas usando a chave `anon`,
--     sem login. Se você tem algo assim, me diga antes.
--
-- Para desfazer, se algo parar: o bloco comentado no fim recria tudo.

-- Leitura e escrita abertas a qualquer visitante
drop policy if exists "public can read clientes" on public.clientes;
drop policy if exists "public can write clientes" on public.clientes;

drop policy if exists "public can read conversas" on public.conversas;
drop policy if exists "public can write conversas" on public.conversas;

-- As três de historico_whatsapp estão com papel `public`, inclusive a que se
-- chama "service role can write" — o nome diz service role, a policy diz todos.
-- O service_role continua escrevendo sem ela, porque ignora RLS.
drop policy if exists "public can read historico" on public.historico_whatsapp;
drop policy if exists "auth users can read historico" on public.historico_whatsapp;
drop policy if exists "service role can write historico" on public.historico_whatsapp;

-- config com UPDATE aberto é o pior caso: dá para alterar configuração do
-- sistema sem nem estar logado.
drop policy if exists "public can read config" on public.config;
drop policy if exists "public can update config" on public.config;

-- Quem está logado continua lendo o histórico (a tela do bot precisa disso).
create policy historico_leitura_logada on public.historico_whatsapp
  for select to authenticated
  using (true);

-- Tira também o acesso de leitura via GraphQL/REST para quem não fez login.
revoke select on public.clientes, public.conversas, public.historico_whatsapp,
                 public.config, public.cardapio
  from anon;

-- ---------------------------------------------------------------------------
-- DESFAZER (cole no SQL editor se algum app parar de funcionar):
--
--   create policy "public can read clientes" on public.clientes for select using (true);
--   create policy "public can write clientes" on public.clientes for all using (true);
--   create policy "public can read conversas" on public.conversas for select using (true);
--   create policy "public can write conversas" on public.conversas for all using (true);
--   create policy "public can read historico" on public.historico_whatsapp for select using (true);
--   create policy "service role can write historico" on public.historico_whatsapp for all using (true);
--   create policy "public can read config" on public.config for select using (true);
--   create policy "public can update config" on public.config for update using (true);
--   grant select on public.clientes, public.conversas, public.historico_whatsapp,
--                   public.config, public.cardapio to anon;
-- ---------------------------------------------------------------------------
