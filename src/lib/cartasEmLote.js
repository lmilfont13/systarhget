import { zipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { lojasDoFuncionario } from './lojaDoCadastro';

/**
 * Geração de cartas em lote: escolher vários promotores de uma vez,
 * ver quem não tem o necessário e juntar tudo num arquivo só.
 */

const chave = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/** Conta/cliente e CDC do cadastro (mesma leitura tolerante usada no resto do sistema). */
export function contaDe(f) {
  const de = f?.dados_extras || {};
  return chave(de.Empresa || de.EMPRESA || de.Conta || de.CONTA || de.Cliente || de.CLIENTE || '');
}

export function cdcDe(f) {
  const de = f?.dados_extras || {};
  return chave(de['NC FUNCIONARIO'] || de.NC || de.CDC || de.Cdc || de.cdc || '');
}

/** Promotores que batem com os filtros (vazio = todos), em ordem alfabética. */
export function filtrarPromotores(funcionarios, { conta = '', cdc = '', empresaId = '', busca = '' } = {}) {
  const b = chave(busca);
  return funcionarios
    .filter((f) => !conta || contaDe(f) === chave(conta))
    .filter((f) => !cdc || cdcDe(f) === chave(cdc))
    .filter((f) => !empresaId || String(f.empresa_id) === String(empresaId))
    .filter((f) => !b || chave(f.nome).includes(b) || String(f.dados_extras?.CPF || '').includes(busca.trim()))
    .sort((a, b2) => String(a.nome || '').localeCompare(String(b2.nome || ''), 'pt-BR'));
}

/** Valores distintos de conta e CDC, para os filtros. */
export function opcoesDeFiltro(funcionarios) {
  const contas = new Set();
  const cdcs = new Set();
  for (const f of funcionarios) {
    if (contaDe(f)) contas.add(contaDe(f));
    if (cdcDe(f)) cdcs.add(cdcDe(f));
  }
  const ordenar = (s) => [...s].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  return { contas: ordenar(contas), cdcs: ordenar(cdcs) };
}

/**
 * Por que a carta desse promotor não pode sair (ou null se pode).
 * `temCargo` e `loja` vêm da tela, porque dependem do que foi escolhido lá.
 */
export function motivoParaPular(f, { temCargo, precisaLoja, loja }) {
  if (!f) return 'cadastro não encontrado';
  if (!f.empresa_id) return 'sem empresa vinculada';
  if (!temCargo) return 'sem cargo';
  if (precisaLoja && !String(loja || '').trim() && !lojasDoFuncionario(f).length) return 'sem loja';
  return null;
}

/** Nome de arquivo seguro e sem repetir dentro do lote. */
export function nomesUnicos(nomes) {
  const usados = new Map();
  return nomes.map((n) => {
    const limpo = String(n || 'carta').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'carta';
    const base = limpo.replace(/\.pdf$/i, '');
    const k = base.toUpperCase();
    const vezes = (usados.get(k) || 0) + 1;
    usados.set(k, vezes);
    return vezes === 1 ? `${base}.pdf` : `${base} (${vezes}).pdf`;
  });
}

/** ZIP com uma carta por arquivo. arquivos: [{ nome, blob }] */
export async function montarZip(arquivos) {
  const nomes = nomesUnicos(arquivos.map((a) => a.nome));
  const conteudo = {};
  for (let i = 0; i < arquivos.length; i++) {
    conteudo[nomes[i]] = [new Uint8Array(await arquivos[i].blob.arrayBuffer()), { level: 0 }];
  }
  return new Blob([zipSync(conteudo)], { type: 'application/zip' });
}

/** Um PDF só, com todas as cartas em sequência (bom para imprimir). */
export async function juntarPdfs(arquivos) {
  const final = await PDFDocument.create();
  for (const { blob } of arquivos) {
    const doc = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
    const paginas = await final.copyPages(doc, doc.getPageIndices());
    paginas.forEach((p) => final.addPage(p));
  }
  return new Blob([await final.save()], { type: 'application/pdf' });
}

export function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
