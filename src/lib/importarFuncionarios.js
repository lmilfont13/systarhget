import { formatCpf } from './formatters';
import { normalizarCargo } from './cargos';

/**
 * Importação de funcionários em massa (planilha ou foto).
 *
 * A planilha chega como uma matriz de células. Aqui a gente acha a linha de
 * cabeçalho, entende o que é cada coluna e transforma cada linha num cadastro
 * no mesmo formato que a tela usa: { nome, cargo, empresa_id, dados_extras }.
 *
 * Convenção do sistema (mantida aqui): em dados_extras, "Empresa" é a
 * Conta/Cliente (ex.: COLGATE) e "NC FUNCIONARIO" é o CDC. A empresa vinculada
 * (CDC/POP/SPAR...) fica em empresa_id.
 */

const chave = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

// Campo do sistema -> nomes de coluna aceitos (já normalizados por `chave`).
const APELIDOS = {
  nome: ['NOME', 'NOMECOMPLETO', 'FUNCIONARIO', 'NOMEDOFUNCIONARIO', 'COLABORADOR', 'NOMEDOCOLABORADOR', 'PROMOTOR', 'PROMOTORA', 'NOMEPROMOTOR'],
  cargo: ['CARGO', 'FUNCAO'],
  CPF: ['CPF', 'NCPF', 'CPFDOFUNCIONARIO'],
  RG: ['RG', 'IDENTIDADE', 'NRG'],
  CTPS: ['CTPS', 'NCTPS', 'CARTEIRA', 'CARTEIRADETRABALHO', 'NUMEROCTPS'],
  SERIE: ['SERIE', 'SERIECTPS', 'CTPSSERIE'],
  MATRICULA: ['MATRICULA', 'MAT', 'NMATRICULA'],
  'NC FUNCIONARIO': ['CDC', 'NCDC', 'NCFUNCIONARIO', 'NC', 'CENTRODECUSTO', 'CENTROCUSTO', 'CC'],
  Empresa: ['CONTA', 'CLIENTE', 'EMPRESA', 'PROJETO', 'CONTACLIENTE'],
  coligada: ['COLIGADA', 'EMPRESAVINCULADA', 'VINCULO', 'VINCULOEMPRESA'],
};

const CAMPO_POR_APELIDO = new Map(
  Object.entries(APELIDOS).flatMap(([campo, nomes]) => nomes.map((n) => [n, campo])),
);

/** Campo do sistema para um título de coluna, ou null se for coluna livre. */
export function campoDaColuna(titulo) {
  return CAMPO_POR_APELIDO.get(chave(titulo)) || null;
}

/** Texto de uma célula (datas viram dd/mm/aaaa). */
export function textoDaCelula(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '';
    const dd = String(v.getUTCDate()).padStart(2, '0');
    const mm = String(v.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${v.getUTCFullYear()}`;
  }
  return String(v).replace(/\s+/g, ' ').trim();
}

/** Lê CSV/TXT separado por ; , ou tab (detecta sozinho), com aspas. */
export function lerCsv(texto) {
  const limpo = String(texto || '').replace(/^\uFEFF/, '');
  const primeira = limpo.split(/\r?\n/).find((l) => l.trim()) || '';
  const contar = (c) => primeira.split(c).length - 1;
  const sep = [';', '\t', ','].sort((a, b) => contar(b) - contar(a))[0];

  const linhas = [];
  let linha = [];
  let celula = '';
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') { celula += '"'; i++; }
      else if (c === '"') aspas = false;
      else celula += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(celula); celula = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpo[i + 1] === '\n') i++;
      linha.push(celula); linhas.push(linha); linha = []; celula = '';
    } else celula += c;
  }
  if (celula !== '' || linha.length) { linha.push(celula); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => String(c).trim()));
}

/** Índice da linha de cabeçalho: a primeira (entre as 15 primeiras) com coluna de nome. */
export function acharCabecalho(matriz) {
  const limite = Math.min(matriz.length, 15);
  for (let i = 0; i < limite; i++) {
    if ((matriz[i] || []).some((c) => campoDaColuna(textoDaCelula(c)) === 'nome')) return i;
  }
  return -1;
}

const acharEmpresa = (nome, empresas) => {
  const k = chave(nome);
  if (!k) return null;
  return (
    empresas.find((e) => chave(e.nome) === k) ||
    empresas.find((e) => chave(e.nome).startsWith(k) || k.startsWith(chave(e.nome))) ||
    null
  );
};

/**
 * Converte objetos simples (vindos da foto ou de cada linha da planilha)
 * em cadastros prontos para gravar.
 * Cada objeto: { nome, cargo, CPF, RG, ..., coligada, <outras colunas> }.
 */
export function montarCadastro(campos, empresas = []) {
  const dados_extras = {};
  let nome = '';
  let cargo = '';
  let empresa_id = null;
  let coligadaNaoEncontrada = '';

  for (const [titulo, valor] of Object.entries(campos)) {
    const v = textoDaCelula(valor);
    if (!v) continue;
    const campo = campoDaColuna(titulo) || (titulo in APELIDOS ? titulo : null);
    if (campo === 'nome') nome = v.toUpperCase();
    else if (campo === 'cargo') cargo = normalizarCargo(v);
    else if (campo === 'coligada') {
      const emp = acharEmpresa(v, empresas);
      if (emp) empresa_id = emp.id;
      else coligadaNaoEncontrada = v;
    } else if (campo === 'CPF') dados_extras.CPF = formatCpf(v);
    else if (campo === 'Empresa' || campo === 'NC FUNCIONARIO') dados_extras[campo] = v.toUpperCase();
    else if (campo) dados_extras[campo] = v;
    else dados_extras[String(titulo).trim()] = v;
  }

  return { nome, cargo, empresa_id, dados_extras, coligadaNaoEncontrada };
}

/** Matriz da planilha -> { cadastros, colunasIgnoradas, erro }. */
export function planilhaParaCadastros(matriz, empresas = []) {
  const ini = acharCabecalho(matriz);
  if (ini < 0) {
    return { cadastros: [], erro: 'Não achei a coluna de nome. A planilha precisa ter um cabeçalho com "Nome" (ou "Funcionário", "Colaborador", "Promotor").' };
  }
  const titulos = matriz[ini].map((t, i) => textoDaCelula(t) || `Coluna ${i + 1}`);
  const cadastros = [];
  for (const linha of matriz.slice(ini + 1)) {
    const campos = {};
    titulos.forEach((t, i) => { campos[t] = linha?.[i]; });
    const c = montarCadastro(campos, empresas);
    if (c.nome) cadastros.push(c);
  }
  if (!cadastros.length) return { cadastros, erro: 'A planilha não tem nenhuma linha com nome preenchido.' };
  return { cadastros, erro: '' };
}

const soDigitos = (s) => String(s || '').replace(/\D/g, '');

/**
 * Marca cada cadastro como novo, repetido no arquivo ou já existente no sistema
 * (pelo CPF; sem CPF, pelo nome).
 */
export function marcarSituacao(cadastros, existentes = []) {
  const cpfs = new Map();
  const nomes = new Map();
  for (const f of existentes) {
    const cpf = soDigitos(f?.dados_extras?.CPF);
    if (cpf) cpfs.set(cpf.padStart(11, '0'), f);
    if (f?.nome) nomes.set(chave(f.nome), f);
  }
  const vistos = new Set();
  return cadastros.map((c) => {
    const cpf = soDigitos(c.dados_extras?.CPF).padStart(11, '0');
    const temCpf = soDigitos(c.dados_extras?.CPF).length > 0;
    const id = temCpf ? `cpf:${cpf}` : `nome:${chave(c.nome)}`;
    let situacao = 'novo';
    let existente = null;
    if (vistos.has(id)) situacao = 'repetido';
    else {
      existente = temCpf ? cpfs.get(cpf) : nomes.get(chave(c.nome));
      if (existente) situacao = 'existente';
    }
    vistos.add(id);
    return { ...c, situacao, existenteId: existente?.id || null };
  });
}

/** Aplica a associação escolhida (empresa / conta / CDC) a um cadastro. Campo vazio não muda nada. */
export function aplicarAssociacao(cadastro, { empresaId, conta, cdc }) {
  const dados_extras = { ...(cadastro.dados_extras || {}) };
  if (conta && conta.trim()) dados_extras.Empresa = conta.trim().toUpperCase();
  if (cdc && cdc.trim()) dados_extras['NC FUNCIONARIO'] = cdc.trim().toUpperCase();
  return {
    ...cadastro,
    empresa_id: empresaId ? empresaId : cadastro.empresa_id || null,
    dados_extras,
  };
}
