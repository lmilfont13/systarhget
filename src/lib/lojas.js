import { supabase } from './supabase';
import { capitalizeStoreName } from './formatters';
import { invalidar } from './dados';

/**
 * Lojas cadastradas.
 *
 * Antes ficavam só no navegador (localStorage), então sumiam em outro computador
 * ou ao limpar o cache. Agora ficam na tabela `lojas` do banco. Enquanto a
 * migração não for aplicada, o sistema continua usando o navegador.
 * Na primeira vez que o banco estiver disponível, as lojas salvas no navegador
 * são enviadas para lá automaticamente.
 */

const CHAVE_LOCAL = 'docflow_lojas';
const CHAVE_IMPORTADO = 'docflow_lojas_importadas_em';

const tabelaInexistente = (e) => e && (e.code === '42P01' || e.code === 'PGRST205' || /relation .*lojas/i.test(e.message || ''));

function lerLocal() {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function gravarLocal(lista) {
  try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(lista)); } catch { /* armazenamento cheio ou bloqueado */ }
}

const doBanco = (r) => ({ id: r.id, nome: r.nome, endereco: r.endereco || '', cidadeUf: r.cidade_uf || '', cnpj: r.cnpj || '' });
const paraBanco = (l) => ({ nome: capitalizeStoreName(String(l.nome || '').trim()), endereco: l.endereco || '', cidade_uf: l.cidadeUf || '', cnpj: l.cnpj || '' });
const chaveNome = (nome) => String(nome || '').trim().toLowerCase();

/** Envia ao banco as lojas que só existem neste navegador (uma vez). */
async function importarDoNavegador(doServidor) {
  const locais = lerLocal();
  if (locais.length === 0) return doServidor;
  const existentes = new Set(doServidor.map((l) => chaveNome(l.nome)));
  const novas = [];
  for (const l of locais) {
    const chave = chaveNome(l.nome);
    if (!chave || existentes.has(chave)) continue;
    existentes.add(chave); // também evita repetidos dentro da própria lista local
    novas.push(l);
  }
  if (novas.length === 0) {
    try { localStorage.setItem(CHAVE_IMPORTADO, new Date().toISOString()); } catch { /* ignora */ }
    return doServidor;
  }
  const { data, error } = await supabase.from('lojas').insert(novas.map(paraBanco)).select('*');
  if (error) {
    console.warn('Não foi possível importar as lojas deste navegador:', error.message);
    return doServidor;
  }
  try { localStorage.setItem(CHAVE_IMPORTADO, new Date().toISOString()); } catch { /* ignora */ }
  return [...doServidor, ...data.map(doBanco)];
}

/**
 * Lista as lojas. Devolve { lojas, origem } — origem 'banco' ou 'navegador'.
 */
export async function carregarLojas() {
  const { data, error } = await supabase.from('lojas').select('*').order('nome');
  if (tabelaInexistente(error)) return { lojas: lerLocal(), origem: 'navegador' };
  if (error) throw error;
  const lojas = await importarDoNavegador(data.map(doBanco));
  gravarLocal(lojas); // cópia local para uso offline
  return { lojas: lojas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), origem: 'banco' };
}

/** Cria ou atualiza uma loja. Devolve a loja salva. */
export async function salvarLoja(loja, origem) {
  if (origem === 'banco') {
    const dados = paraBanco(loja);
    const consulta = loja.id && !String(loja.id).match(/^\d+$|^migrated-/)
      ? supabase.from('lojas').update(dados).eq('id', loja.id).select('*').single()
      : supabase.from('lojas').insert(dados).select('*').single();
    const { data, error } = await consulta;
    if (error) throw error;
    invalidar('lojas');
    return doBanco(data);
  }
  const lista = lerLocal();
  const salva = { ...loja, nome: capitalizeStoreName(String(loja.nome || '').trim()), id: loja.id || Date.now().toString() };
  gravarLocal(loja.id ? lista.map((l) => (l.id === loja.id ? salva : l)) : [salva, ...lista]);
  return salva;
}

export async function excluirLoja(id, origem) {
  if (origem === 'banco') {
    const { error } = await supabase.from('lojas').delete().eq('id', id);
    if (error) throw error;
    invalidar('lojas');
  }
  gravarLocal(lerLocal().filter((l) => l.id !== id));
}

/** Cadastra rapidamente uma loja digitada na hora de gerar a carta (se ainda não existir). */
export async function cadastrarSeNova(nome, lojasAtuais, origem) {
  const limpo = capitalizeStoreName(String(nome || '').trim());
  if (!limpo || lojasAtuais.some((l) => chaveNome(l.nome) === chaveNome(limpo))) return null;
  try {
    return await salvarLoja({ nome: limpo, endereco: '', cidadeUf: '', cnpj: '' }, origem);
  } catch (e) {
    console.warn('Não foi possível cadastrar a loja automaticamente:', e.message);
    return null;
  }
}
