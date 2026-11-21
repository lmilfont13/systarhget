/**
 * Loja que já está no cadastro do funcionário (campo personalizado "Loja",
 * "Lojas", "Estabelecimento" ou "PDV"). Serve para a carta já vir com a loja.
 *
 * Um promotor pode atender várias lojas: "MATEUS | ATACADAO". Elas vêm
 * separadas por | ; ou quebra de linha.
 */

const chave = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const CAMPOS_DE_LOJA = new Set(['LOJA', 'LOJAS', 'ESTABELECIMENTO', 'PDV', 'LOJASATENDIDAS', 'LOJAATENDIDA']);

/** Lojas do cadastro, sem repetidas, na ordem em que foram escritas. */
export function lojasDoFuncionario(funcionario) {
  const extras = funcionario?.dados_extras || {};
  const campo = Object.keys(extras).find((k) => CAMPOS_DE_LOJA.has(chave(k)));
  if (!campo) return [];
  const vistas = new Set();
  const lista = [];
  for (const parte of String(extras[campo] ?? '').split(/[|;\n]/)) {
    const nome = parte.replace(/\s+/g, ' ').trim();
    if (!nome || vistas.has(chave(nome))) continue;
    vistas.add(chave(nome));
    lista.push(nome);
  }
  return lista;
}

/**
 * Valor que o campo de loja da carta deve receber para esse nome.
 * Se a loja existe no cadastro de Lojas, usa o mesmo formato da lista
 * ("Nome (endereço)"), para a lista já aparecer selecionada.
 * Devolve { valor, conhecida }.
 */
export function valorDaLoja(nome, lojas = []) {
  const k = chave(nome);
  const loja = k ? lojas.find((l) => chave(l.nome) === k) : null;
  if (loja) return { valor: loja.endereco ? `${loja.nome} (${loja.endereco})` : loja.nome, conhecida: true };
  return { valor: String(nome || '').trim(), conhecida: false };
}

/** Nomes dos campos de loja de um template (loja / lojas / estabelecimento, sem mapeamento automático). */
export function camposDeLoja(template) {
  return (template?.fields || [])
    .filter((f) => f?.name && !f.mappedTo && ['loja', 'lojas', 'estabelecimento'].includes(f.name.toLowerCase()))
    .map((f) => f.name);
}
