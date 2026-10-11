/**
 * O que falta num pedido de carta, a partir do que o Intérprete entendeu.
 *
 * Serve pra cobrar o supervisor na hora do pedido, em vez de deixar a carta
 * voltar pra revisão depois. Toda carta precisa de duas coisas: quem é o
 * promotor (nome ou CPF) e qual é a loja.
 *
 * As frases evitam artigo antes de nome próprio ("do Adailton", "da Juliana")
 * porque acertar o gênero a partir do primeiro nome erra demais.
 */

const vazio = (valor) => !String(valor ?? '').trim();

/** Os itens que não dá pra transformar em carta ainda, com o que falta em cada um. */
export function itensIncompletos(itens) {
  return (itens || []).flatMap((item) => {
    const falta = [];
    if (vazio(item.promotor) && vazio(item.cpf)) falta.push('promotor');
    if (vazio(item.loja)) falta.push('loja');
    return falta.length ? [{ ...item, falta }] : [];
  });
}

/** Uma linha por item: pelo que dá pra identificar o pedido, e o que falta nele. */
function linhaDoItem(item) {
  if (item.falta.length === 2) return 'Falta dizer o promotor e a loja';
  const conhecido = String(item.promotor ?? '').trim() || String(item.loja ?? '').trim();
  const pendente = item.falta[0] === 'loja' ? 'a loja' : 'o promotor';
  return `${conhecido}: falta dizer ${pendente}`;
}

/**
 * O aviso pra mostrar antes de enviar, ou null quando está tudo certo.
 * Formato: { titulo, detalhes: [...] } — a tela lista os detalhes.
 */
export function avisoDoQueFalta(itens) {
  const lista = itens || [];
  if (lista.length === 0) {
    return {
      titulo: 'Não entendi nenhum pedido de carta.',
      detalhes: ['Diga o nome do promotor e o nome da loja.'],
    };
  }

  const incompletos = itensIncompletos(lista);
  if (incompletos.length === 0) return null;

  return {
    titulo: incompletos.length === 1 ? 'Um pedido está incompleto.' : `${incompletos.length} pedidos estão incompletos.`,
    detalhes: incompletos.map(linhaDoItem),
  };
}
