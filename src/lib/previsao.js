import { duracaoAtendimento, fmtDuracao } from './tempoAtendimento';

/**
 * Quanto tempo a carta normalmente leva — dito em número, não em "processando".
 *
 * Por que isto existe: ninguém odeia esperar, odeia não saber quanto. A tela
 * antiga dizia "os agentes estão lendo seu pedido" e nada mais; o supervisor
 * ficava olhando, recarregando e, na dúvida, pedindo de novo.
 *
 * A previsão sai do histórico real do próprio supervisor, não de um chute
 * fixo no código: se a coordenação dele responde em 5 minutos, é o que ele vê;
 * se responde em 2 horas, também. Usamos a mediana porque um pedido que ficou
 * o fim de semana parado não pode empurrar a previsão de todos os outros.
 */

/** Com menos que isto a mediana é chute; melhor não dizer nada. */
const AMOSTRA_MINIMA = 4;

/** Acima deste ponto do histórico a espera deixa de ser "normal". */
const FATIA_LIMITE = 0.85;

const MIN = 60_000;

/** Valor na posição `p` (0..1) de uma lista já ordenada. */
export function fatia(ordenados, p) {
  if (!ordenados.length) return null;
  const i = Math.min(ordenados.length - 1, Math.max(0, Math.round(p * (ordenados.length - 1))));
  return ordenados[i];
}

/**
 * Arredonda para um número que soe humano: "cerca de 2 min" em vez de
 * "cerca de 1 min 53 s". Um número exagerado de precisão numa estimativa
 * passa uma certeza que ela não tem.
 */
export function arredondarPrevisao(ms) {
  if (ms == null || !Number.isFinite(ms)) return null;
  if (ms < 90_000) return Math.max(MIN, Math.round(ms / 15_000) * 15_000);  // de 15 em 15 s
  if (ms < 30 * MIN) return Math.round(ms / MIN) * MIN;                      // minuto cheio
  if (ms < 3 * 60 * MIN) return Math.round(ms / (5 * MIN)) * 5 * MIN;        // de 5 em 5 min
  return Math.round(ms / (30 * MIN)) * 30 * MIN;                             // de meia em meia hora
}

/**
 * O tempo típico e o limite do normal, a partir das cartas que já ficaram
 * prontas. Devolve null enquanto não houver histórico suficiente.
 */
export function previsaoDeEspera(pedidos, { amostraMinima = AMOSTRA_MINIMA } = {}) {
  const duracoes = (Array.isArray(pedidos) ? pedidos : [])
    .filter((p) => p?.status === 'aprovada')
    .map(duracaoAtendimento)
    .filter((ms) => ms != null && ms > 0)
    .sort((a, b) => a - b);

  if (duracoes.length < amostraMinima) return null;

  const tipico = fatia(duracoes, 0.5);
  return {
    tipico,
    // O limite nunca pode ficar abaixo do típico, senão todo pedido nasce atrasado.
    limite: Math.max(tipico, fatia(duracoes, FATIA_LIMITE)),
    amostra: duracoes.length,
  };
}

/**
 * Onde este pedido está dentro da espera normal.
 * Devolve null para pedido já concluído ou sem previsão.
 */
export function esperaDoPedido(pedido, previsao, agora = Date.now()) {
  if (!previsao || !pedido?.criado_em) return null;
  if (pedido.status === 'aprovada' || pedido.status === 'recusada') return null;

  const decorrido = Math.max(0, agora - new Date(pedido.criado_em).getTime());
  if (!Number.isFinite(decorrido)) return null;

  return {
    decorrido,
    // Trava em 1: a barra cheia já diz "passou da hora", não precisa estourar.
    fracao: Math.min(1, previsao.tipico ? decorrido / previsao.tipico : 1),
    passouDoNormal: decorrido > previsao.limite,
  };
}

/**
 * A frase que vai na tela. Quando passa do normal ela diz isso com franqueza
 * e, no mesmo sopro, que o pedido não se perdeu — é exatamente aí que a
 * pessoa pensa em pedir de novo.
 */
export function frasePrevisao(previsao, espera) {
  if (!previsao || !espera) return null;
  const tipico = fmtDuracao(arredondarPrevisao(previsao.tipico));
  return espera.passouDoNormal
    ? `Está demorando mais que o normal (${tipico}). Não travou: segue na fila.`
    : `Normalmente fica pronto em cerca de ${tipico}.`;
}
