/**
 * O que o supervisor digitou nunca se perde.
 *
 * Dois problemas diferentes, resolvidos aqui:
 *
 *   1. Rascunho. Ele digita cinco linhas no corredor do Atacadão, chega uma
 *      ligação, o navegador descarta a aba, e ao voltar o campo está vazio.
 *      Guardamos a cada tecla e devolvemos ao abrir a tela.
 *
 *   2. Pedido pendente. Ele aperta "Enviar" justo onde não tem sinal. Em vez
 *      de um "não foi possível enviar" que joga o trabalho fora, guardamos o
 *      pedido e mandamos sozinhos quando a internet voltar.
 *
 * Tudo por supervisor (a chave leva o id), porque o mesmo telefone às vezes é
 * usado por mais de uma pessoa. E tudo tolerante a falha: em aba privada, com
 * armazenamento cheio ou bloqueado, o acesso lança — e aí a tela precisa
 * continuar funcionando sem a rede de segurança, nunca quebrar por causa dela.
 */

const chaveRascunho = (userId) => `tarhget:rascunho:${userId || 'anon'}`;
const chavePendente = (userId) => `tarhget:pedido-pendente:${userId || 'anon'}`;

/** O localStorage, ou null onde ele não existe/está bloqueado. */
function padrao() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // Safari em aba privada lança só ao tocar no objeto
  }
}

function ler(store, chave) {
  try {
    return store?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

function gravar(store, chave, valor) {
  try {
    if (valor === null) store?.removeItem(chave);
    else store?.setItem(chave, valor);
  } catch {
    // armazenamento cheio ou bloqueado: seguimos sem a rede de segurança
  }
}

// ----------------------------------------------------------------- rascunho

export function lerRascunho(userId, store = padrao()) {
  return ler(store, chaveRascunho(userId)) || '';
}

/** Salva o rascunho; texto vazio apaga, para não ressuscitar o que foi limpo. */
export function salvarRascunho(userId, texto, store = padrao()) {
  const limpo = String(texto ?? '');
  gravar(store, chaveRascunho(userId), limpo.trim() ? limpo : null);
}

export function limparRascunho(userId, store = padrao()) {
  gravar(store, chaveRascunho(userId), null);
}

// ------------------------------------------------------- pedido sem sinal

/**
 * Guarda um pedido que não conseguiu sair. Um por supervisor: se ele tentar de
 * novo, é o mesmo pedido corrigido, não dois pedidos — duas cartas iguais dão
 * mais trabalho para a coordenação do que um envio perdido.
 */
export function guardarPendente(userId, texto, store = padrao(), agora = new Date()) {
  const limpo = String(texto ?? '').trim();
  if (!limpo) return null;
  const pendente = { texto: limpo, em: agora.toISOString() };
  gravar(store, chavePendente(userId), JSON.stringify(pendente));
  return pendente;
}

export function lerPendente(userId, store = padrao()) {
  const bruto = ler(store, chavePendente(userId));
  if (!bruto) return null;
  try {
    const p = JSON.parse(bruto);
    return p && typeof p.texto === 'string' && p.texto.trim() ? { texto: p.texto, em: p.em || null } : null;
  } catch {
    return null; // conteúdo estragado: melhor esquecer que travar a tela
  }
}

export function limparPendente(userId, store = padrao()) {
  gravar(store, chavePendente(userId), null);
}

/**
 * Se o erro foi a rede falhando, e não o servidor recusando o pedido.
 *
 * É o caso mais comum no corredor da loja: o telefone está preso num Wi-Fi
 * que não leva a lugar nenhum, então `navigator.onLine` diz que há rede e o
 * envio morre em "Failed to fetch". Aí o pedido merece a mesma rede de
 * segurança do modo avião — guardar em vez de perder. Um erro de permissão ou
 * de validação, não: aquele precisa aparecer para a pessoa corrigir.
 */
export function pareceFalhaDeRede(erro) {
  if (!erro) return false;
  if (typeof TypeError !== 'undefined' && erro instanceof TypeError) return true;
  const texto = `${erro.message || ''} ${erro.name || ''}`.toLowerCase();
  // "Load failed" é o Safari; "Failed to fetch", os demais.
  return /failed to fetch|networkerror|load failed|network request failed|err_internet|err_network|timeout/.test(texto);
}

/**
 * Se o navegador diz que está sem rede. Quando ele não sabe informar,
 * assumimos que há rede: tentar e falhar é melhor que recusar sem tentar.
 */
export function semSinal() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
