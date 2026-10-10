import { supabase } from './supabase';

/**
 * Camada de dados compartilhada entre as telas.
 *
 * Por quê: os PDFs dos templates e as imagens das empresas ficam salvos no banco
 * em base64 (≈2 MB no total). Antes, cada tela baixava tudo isso só para montar
 * listas. Agora:
 *  - as listas vêm sem os campos pesados e ficam em cache por alguns instantes,
 *    então trocar de tela é imediato;
 *  - o PDF do template e as imagens da empresa são baixados só quando usados,
 *    uma única vez por sessão.
 */

const TTL_LISTAS = 60_000; // 1 minuto
const cache = new Map(); // chave -> { em, promessa }

function emCache(chave, ttl, carregar) {
  const atual = cache.get(chave);
  if (atual && (ttl === Infinity || Date.now() - atual.em < ttl)) return atual.promessa;
  const promessa = carregar().catch((erro) => {
    cache.delete(chave); // não guarda falhas
    throw erro;
  });
  cache.set(chave, { em: Date.now(), promessa });
  return promessa;
}

/** Descarta o cache de um tipo de dado (ou de tudo) depois de uma alteração. */
export function invalidar(...chaves) {
  if (chaves.length === 0) return cache.clear();
  for (const chave of [...cache.keys()]) {
    if (chaves.some((c) => chave === c || chave.startsWith(`${c}:`))) cache.delete(chave);
  }
}

async function resultado(consulta) {
  const { data, error } = await consulta;
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Funcionários
// ---------------------------------------------------------------------------
export function listarFuncionarios({ atualizar = false } = {}) {
  if (atualizar) invalidar('funcionarios');
  return emCache('funcionarios', TTL_LISTAS, () =>
    resultado(supabase.from('funcionarios').select('*').order('criado_em', { ascending: false })),
  );
}

// ---------------------------------------------------------------------------
// Empresas: lista sem imagens; imagens sob demanda
// ---------------------------------------------------------------------------
export const CAMPOS_IMAGEM_EMPRESA = ['logo_url', 'carimbo_url', 'carimbo_funcionario_url', 'assinatura_responsavel_url'];
const CAMPOS_EMPRESA_LEVES = 'id, nome, email_responsavel, criado_em, ativo, lojas, rodape, modelo_carimbo';

export function listarEmpresas({ atualizar = false } = {}) {
  if (atualizar) invalidar('empresas');
  return emCache('empresas', TTL_LISTAS, () =>
    resultado(supabase.from('empresas').select(CAMPOS_EMPRESA_LEVES).order('criado_em', { ascending: false })),
  );
}

/** Logo, carimbos e assinatura de uma empresa (baixados uma vez por sessão). */
export function imagensEmpresa(id) {
  if (!id) return Promise.resolve({});
  return emCache(`empresas:imagens:${id}`, Infinity, async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select(CAMPOS_IMAGEM_EMPRESA.join(', '))
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ?? {};
  });
}

/** Junta as imagens à empresa (para quem precisa do objeto completo). */
export async function empresaCompleta(empresa) {
  if (!empresa?.id) return empresa ?? null;
  return { ...empresa, ...(await imagensEmpresa(empresa.id)) };
}

// ---------------------------------------------------------------------------
// Templates: lista sem o arquivo PDF; arquivo sob demanda
// ---------------------------------------------------------------------------
export function listarTemplatesPdf({ atualizar = false } = {}) {
  if (atualizar) invalidar('templates');
  return emCache('templates:pdf', TTL_LISTAS, () =>
    resultado(supabase.from('pdf_templates').select('id, name, fields, created_at').order('created_at', { ascending: false })),
  );
}

export function listarTemplatesTexto({ atualizar = false } = {}) {
  if (atualizar) invalidar('templates');
  return emCache('templates:texto', TTL_LISTAS, () =>
    resultado(supabase.from('templates').select('*').order('criado_em', { ascending: false })),
  );
}

/** Conteúdo (base64) do PDF de um template, baixado uma vez por sessão. */
export function arquivoTemplatePdf(id) {
  return emCache(`templates:arquivo:${id}`, Infinity, async () => {
    const { data, error } = await supabase.from('pdf_templates').select('file_url').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data?.file_url) throw new Error('Arquivo PDF do template não encontrado.');
    return data.file_url;
  });
}

/** Converte o base64 salvo (com ou sem prefixo data:) em bytes para o gerador de PDF. */
export function base64ParaBytes(base64) {
  const limpo = base64.includes(',') ? base64.split(',')[1] : base64;
  const bin = atob(limpo);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------
// Uso dos templates (para saber o que pode ser excluído)
// ---------------------------------------------------------------------------
/** Mapa template_id -> { total, ultimo } a partir do histórico de cartas. */
export async function usoDosTemplates() {
  const linhas = await resultado(supabase.from('cartas_geradas').select('template_id, criado_em').not('template_id', 'is', null));
  const uso = new Map();
  for (const { template_id: id, criado_em: quando } of linhas) {
    const atual = uso.get(id) ?? { total: 0, ultimo: null };
    atual.total += 1;
    if (!atual.ultimo || quando > atual.ultimo) atual.ultimo = quando;
    uso.set(id, atual);
  }
  return uso;
}
