# Pedidos de carta com agentes — desenho

Data: 2026-10-09 · Aprovado em conversa por Luciano ("manda bala")

## Objetivo

Supervisores e coordenadores pedem cartas de apresentação em texto livre, numa área
própria. Agentes de IA interpretam o pedido, encontram o promotor e a loja no cadastro e
deixam a carta montada. O administrador confere numa caixa de entrada e aprova, corrige
ou recusa. A carta aprovada fica disponível para o supervisor na área dele e pode ser
enviada pelo WhatsApp.

Sucesso = um pedido como "carta pro Adailton no Atacadão Messejana" chega à caixa de
entrada já com promotor, loja, template e cargo certos e a prévia do PDF, e o admin
aprova com um clique.

## Decisões (do usuário)

- Solicitantes: supervisores e coordenadores.
- Pedido: texto livre (pode ter vários promotores num pedido).
- Motor: IA do Claude via API (chave da Anthropic guardada como segredo no Supabase).
- Entrega: na própria área do supervisor **e** link pelo WhatsApp.

## Fora do escopo (v1)

Anexos (foto/planilha), notificação automática por WhatsApp, emissão sem aprovação,
templates de PDF com campos (só templates de texto, que são as cartas de apresentação).

## Papéis e segurança

- Novo papel `solicitante` em `app_metadata.role` (definido só pelo servidor).
- **Correção necessária:** hoje qualquer conta logada lê funcionários, empresas,
  templates e lojas (políticas `systarhget_leitura` com `true`) e pode inserir em
  `cartas_geradas`. Essas políticas passam a exigir `app_role() in ('admin','promotor')`.
  Solicitante não lê cadastro nenhum — só os próprios pedidos e as cartas aprovadas deles.
- Frontend: `roleFromSession` reconhece `solicitante`; essas contas só acessam `/pedir`.

## Dados

`solicitantes` — `user_id` (PK, FK auth.users), `nome`, `whatsapp`, `usuario`,
`ativo` (bool, admin pode bloquear), `criado_em`.

`solicitacoes` — `id`, `solicitante_id`, `texto`, `status`
(`recebida` → `processando` → `revisao` → `aprovada` | `recusada` | `erro`), `motivo_recusa`,
`erro`, `criado_em`, `atualizado_em`, `aprovado_por`, `aprovado_em`.

`solicitacoes_analise` — `solicitacao_id`, `itens` jsonb (uma entrada por carta pedida).
Tabela separada e só do admin, porque os itens trazem nomes e CPFs de outros promotores.

Item: `{ trecho, promotor: {id, nome, confianca, alternativas[]}, loja: {id|null, nome,
confianca, nova}, template_id, cargo, avisos[], confianca: 'alta'|'media'|'revisar',
carta_id|null }`.

`cartas_geradas` ganha `solicitacao_id` (nullable) para ligar a carta ao pedido.

RLS: solicitante lê/insere só as próprias `solicitacoes` (insere apenas `texto`);
admin tudo. Carta aprovada: o solicitante baixa pela RPC `carta_da_solicitacao(id)`
(security definer, confere que o pedido é dele). Realtime ligado em `solicitacoes`.
Auditoria com o gatilho existente.

## Funções no servidor (Supabase Edge Functions)

1. `cadastrar-solicitante` (pública): recebe nome, WhatsApp, usuário e senha; cria a conta
   com `usuario@systarhget.app`, e-mail já confirmado e papel `solicitante`; grava em
   `solicitantes`. Valida tamanho/formato e recusa usuário repetido.
2. `processar-solicitacao` (exige login; dono do pedido ou admin): roda os agentes e grava
   `itens` + `status = revisao` (ou `erro` com a mensagem). Usa a chave de serviço e o
   segredo `ANTHROPIC_API_KEY`.

## Agentes

Executados em sequência dentro de `processar-solicitacao`:

1. **Intérprete** (Claude): texto → lista de `{trecho, promotor_mencionado,
   cpf_mencionado, loja_mencionada, cargo_mencionado, observacao}`. Saída JSON validada.
2. **Promotores**: para cada item, busca candidatos no banco (`pg_trgm` + `unaccent` em
   nome; CPF exato) e o Claude escolhe entre os candidatos, com confiança e alternativas.
   Nunca inventa: só pode escolher um id da lista.
3. **Lojas**: mesmo esquema na tabela `lojas`; se nada servir, marca `nova` com o nome
   como escrito.
4. **Conferente** (regras): template = o marcado como padrão em Configurações (fallback:
   o template de texto mais usado); cargo = mencionado ou o do cadastro; avisa se o
   promotor está sem empresa, sem CPF, ou se há dúvida; calcula a confiança final.

Modelo: `claude-sonnet-5-5`, saídas curtas em JSON. Erros da API viram `status = erro`
com mensagem legível; o admin pode reprocessar.

## Telas

**`/pedir` (pública, fora do painel)** — visual da marca (mesmo lado vinho do login).
Sem conta: entrar ou cadastrar-se. Com conta: caixa "Descreva o pedido" + exemplos;
lista "Meus pedidos" com status e botão de baixar quando aprovada; motivo quando recusada.

**`/solicitacoes` (painel, admin)** — item no menu com contador de pendentes (realtime).
Lista à esquerda; ao abrir: texto original, cartões por item (promotor, loja, cargo,
template, confiança, avisos, trocar promotor/loja por um seletor) e a prévia do PDF
montada no navegador com o gerador atual. Ações: **Aprovar** (gera e registra cada carta
com `solicitacao_id`, status `aprovada`, oferece WhatsApp com o link `/carta/:id`),
**Corrigir** (abre Gerar documentos com promotor/loja/cargo preenchidos), **Recusar**
(motivo), **Reprocessar** (quando `erro`).

A montagem do texto da carta é extraída para `src/lib/montarCarta.js` (função pura,
testada), usada pela caixa de entrada; Gerar documentos não muda nesta versão.

## Testes

- Unitários: `montarCarta`, detecção de papel, validação do item do agente.
- SQL: políticas (solicitante não lê funcionários; lê só os próprios pedidos).
- Edge: execução com pedido de exemplo contra o banco real após o deploy.
- Telas: capturas com dados simulados.

## O que o usuário faz

1. Merge do PR. 2. Rodar a migração no SQL Editor. 3. Criar a chave em
console.anthropic.com e colar no Supabase (Edge Functions → Secrets →
`ANTHROPIC_API_KEY`). 4. Publicar as duas funções (eu publico se o acesso permitir).
