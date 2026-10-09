# Pedidos de carta com agentes — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supervisores pedem cartas em texto livre; agentes de IA resolvem promotor/loja/template/cargo; o admin aprova numa caixa de entrada.

**Architecture:** Duas Edge Functions (Deno) no Supabase — cadastro do solicitante e processamento com Claude — gravando em `solicitacoes`. Frontend React ganha `/pedir` (público) e `/solicitacoes` (admin); a prévia/geração do PDF reaproveita `PDFGenerator.generateFromText` via uma função pura nova `montarCarta`.

**Tech Stack:** React 19 + Vite, Supabase (Postgres, RLS, Realtime, Edge Functions/Deno), API Messages da Anthropic (`claude-sonnet-5-5`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-solicitacoes-agentes-design.md`

## Global Constraints

- Papel novo: `app_metadata.role = 'solicitante'`; definido só pela Edge Function com chave de serviço.
- Contas de solicitante: e-mail `usuario@systarhget.app` (mesmo `USER_DOMAIN`), e-mail confirmado na criação.
- Políticas `systarhget_leitura` (funcionarios, empresas, templates, pdf_templates, lojas) e `systarhget_registrar` (cartas_geradas) passam a exigir `public.app_role() in ('admin','promotor')`.
- Segredo `ANTHROPIC_API_KEY` só na Edge Function; nunca no frontend nem no repositório.
- Modelo: `claude-sonnet-5-5`. Status: `recebida`, `processando`, `revisao`, `aprovada`, `recusada`, `erro`.
- Só templates de texto (`templates`) entram no fluxo de pedidos.

## Review Focus

- Solicitante logado tentando ler `funcionarios` pela API → deve receber lista vazia.
- Pedido com promotor inexistente ou ambíguo → item com `confianca: 'revisar'` e alternativas, nunca um id inventado.
- Resposta do Claude fora do JSON esperado / API fora do ar / chave inválida → `status = 'erro'` com mensagem legível e botão Reprocessar.
- Pedido com vários promotores → um item por promotor, aprovados juntos.
- Usuário de cadastro repetido ou com caracteres inválidos → erro claro no formulário.

---

### Task 1: Migração (segurança, tabelas, busca, RPC)

**Files:** Create `supabase/migrations/20261009200000_pedidos_com_agentes.sql`

- [ ] Restringir políticas de leitura/registro a `app_role() in ('admin','promotor')`.
- [ ] `create extension if not exists pg_trgm / unaccent` (schema extensions).
- [ ] Tabelas `solicitantes`, `solicitacoes` (spec), coluna `cartas_geradas.solicitacao_id`, coluna `templates.padrao_pedidos boolean default false`.
- [ ] RLS: solicitante `select/insert` só onde `solicitante_id = auth.uid()` (insert com status `recebida`); admin `all`. `solicitantes`: dono lê o próprio; admin tudo.
- [ ] Funções `buscar_promotores(termo text, limite int)` e `buscar_lojas(termo text, limite int)` (similaridade sem acento), `execute` só para `service_role`.
- [ ] RPC `carta_da_solicitacao(p_solicitacao uuid)` → `(id, nome_funcionario, nome_arquivo, url_storage)` das cartas aprovadas do pedido do próprio usuário.
- [ ] Realtime em `solicitacoes`; gatilho de auditoria; `atualizado_em` por gatilho.
- [ ] Verificar sintaxe com pglast; commit.

### Task 2: Papéis no frontend + `montarCarta`

**Files:** Modify `src/lib/auth.jsx`, `src/components/RequireAuth.jsx`, `src/pages/Login.jsx`; Create `src/lib/montarCarta.js`, `src/lib/montarCarta.test.js`

**Produces:** `roleFromSession` → `'admin' | 'promotor' | 'solicitante' | null`; `montarCarta({ template, funcionario, empresa, loja, cargo }) -> string` (conteúdo com placeholders resolvidos, mesma regra de negrito de Gerar documentos).

- [ ] Testes: `roleFromSession` com `solicitante`; `montarCarta` substitui `{{nome}}`, `{{Cargo}}`/`{{cargo}}`, `{{cpf}}`, `{{loja}}`, `{{Cdc}}`, remove placeholders sobrando.
- [ ] Implementar; RequireAuth manda solicitante para `/pedir`; Login redireciona solicitante para `/pedir`.
- [ ] Testes passam; commit.

### Task 3: Edge Functions

**Files:** Create `supabase/functions/cadastrar-solicitante/index.ts`, `supabase/functions/processar-solicitacao/index.ts`, `supabase/functions/processar-solicitacao/agentes.ts`

**Produces:** `POST cadastrar-solicitante {nome, whatsapp, usuario, senha}` → `{ok}` ou `{erro}`; `POST processar-solicitacao {id}` → `{ok, status}`.

- [ ] Cadastro: valida (usuario `^[a-z0-9._-]{3,30}$`, senha ≥ 8, nome ≥ 3, WhatsApp 10–13 dígitos), cria usuário admin API, insere `solicitantes`.
- [ ] Processamento: confere dono/admin, `status=processando`, Intérprete → Promotores (candidatos via RPC) → Lojas → Conferente (regras), grava `itens` e `status=revisao`; qualquer falha → `status=erro`, `erro`.
- [ ] Saída do Claude validada (id precisa estar entre candidatos).
- [ ] Deploy das duas funções (MCP) e teste com pedido real.

### Task 4: Tela `/pedir`

**Files:** Create `src/pages/Pedir.jsx`, `src/lib/pedidos.js`; Modify `src/App.jsx`, `src/lib/rotas.js`

- [ ] Entrar/cadastrar (chama `cadastrar-solicitante` e depois `signIn`), caixa do pedido (insere e invoca `processar-solicitacao`), "Meus pedidos" com realtime e download via `carta_da_solicitacao`.
- [ ] Captura de tela com dados simulados; commit.

### Task 5: Caixa de entrada `/solicitacoes`

**Files:** Create `src/pages/Solicitacoes.jsx`; Modify `src/lib/navigation.js`, `src/components/Layout.jsx`, `src/App.jsx`, `src/lib/rotas.js`, `src/pages/Documentos.jsx` (ler `loja` e `cargo` da URL junto com `func`)

- [ ] Lista + contador realtime; detalhe com itens editáveis (trocar promotor/loja), prévia do PDF via `montarCarta` + `PDFGenerator.generateFromText`.
- [ ] Aprovar (registra cartas com `solicitacao_id`, status `aprovada`, WhatsApp), Corrigir (link para Gerar documentos), Recusar (motivo), Reprocessar; seletor do template padrão (`templates.padrao_pedidos`).
- [ ] Captura de tela; lint, testes, build; commit; PR.
