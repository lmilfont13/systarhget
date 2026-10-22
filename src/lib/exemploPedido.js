/**
 * O exemplo que aparece dentro da caixa de pedido.
 *
 * Um texto fixo no código ensina o formato, mas com nomes que a pessoa nunca
 * viu. O melhor professor é um pedido dela mesma que já virou carta: mostra a
 * forma certa com a loja e o promotor do dia a dia dela, e prova que aquilo
 * funciona — porque funcionou.
 *
 * Preferimos sempre um pedido **aprovado**: um pedido recusado ensinaria
 * justamente o jeito que não deu certo.
 *
 * (Por que não puxar lojas e promotores direto do banco: o supervisor só tem
 * permissão de ler os próprios pedidos — e abrir as tabelas de cadastro para
 * ele só para enfeitar um placeholder seria trocar segurança por enfeite.)
 */

/** Para quem nunca pediu nada: duas cartas numa frase, do jeito que se fala. */
export const EXEMPLO_PADRAO = 'Ex.: carta pro Adailton no Atacadão Messejana e pra Juliana no Assaí Bezerra de Menezes';

/** Exemplo comprido vira mau exemplo: ninguém copia um parágrafo. */
const LIMITE = 110;

/**
 * A primeira linha aproveitável de um pedido, ou null.
 * Nada de cortar no meio: um exemplo com "…" ensina a escrever "…".
 */
export function linhaDeExemplo(texto) {
  const linha = String(texto ?? '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .find((l) => l.length >= 10);
  return linha && linha.length <= LIMITE ? linha : null;
}

/**
 * O placeholder da caixa. Devolve sempre algo: na pior das hipóteses,
 * o exemplo padrão.
 */
export function exemploDePedido(pedidos) {
  const lista = Array.isArray(pedidos) ? pedidos : [];
  // `meusPedidos` já vem do mais novo para o mais antigo.
  const modelo = lista.find((p) => p?.status === 'aprovada' && linhaDeExemplo(p.texto));
  const linha = modelo && linhaDeExemplo(modelo.texto);
  return linha ? `Ex.: ${linha}` : EXEMPLO_PADRAO;
}
