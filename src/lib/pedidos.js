import { supabase } from './supabase';
import { dataUrlToBlob } from './cartas';

/**
 * Pedidos de carta feitos pelos supervisores (área /pedir) e a caixa de entrada do admin.
 */

export const STATUS_PEDIDO = {
  recebida:    { rotulo: 'Recebido',    tom: 'neutro' },
  processando: { rotulo: 'Em análise',  tom: 'andamento' },
  revisao:     { rotulo: 'Em análise',  tom: 'andamento' },
  erro:        { rotulo: 'Em análise',  tom: 'andamento' },
  aprovada:    { rotulo: 'Pronta',      tom: 'sucesso' },
  recusada:    { rotulo: 'Recusada',    tom: 'alerta' },
};

/** Para o admin, os status internos aparecem separados. */
export const STATUS_ADMIN = {
  recebida:    'Na fila',
  processando: 'Agentes trabalhando',
  revisao:     'Para revisar',
  erro:        'Erro',
  aprovada:    'Aprovada',
  recusada:    'Recusada',
};

/** Lê a mensagem de erro que a Edge Function devolveu ({ erro }). */
async function mensagemDaFuncao(error, padrao) {
  try {
    const corpo = await error?.context?.json?.();
    if (corpo?.erro) return corpo.erro;
  } catch {
    // resposta sem JSON
  }
  return padrao;
}

// As funções desta seção são usadas tanto pelo supervisor (/pedir) quanto pelo
// admin (caixa de entrada). O supervisor usa um cliente Supabase com sessão
// própria (ver lib/supabase.js), passado explicitamente aqui; o admin usa o
// cliente padrão, que é o default quando "client" não é informado.
export async function cadastrarSolicitante({ nome, whatsapp, usuario, senha }, client = supabase) {
  const { data, error } = await client.functions.invoke('cadastrar-solicitante', {
    body: { nome, whatsapp, usuario, senha },
  });
  if (error) throw new Error(await mensagemDaFuncao(error, 'Não foi possível criar o cadastro. Tente de novo.'));
  if (data?.erro) throw new Error(data.erro);
}

/** Coloca os agentes para trabalhar no pedido (não bloqueia a tela). */
export async function processarPedido(id, client = supabase) {
  const { data, error } = await client.functions.invoke('processar-solicitacao', { body: { id } });
  if (error) throw new Error(await mensagemDaFuncao(error, 'Os agentes não conseguiram processar agora.'));
  return data;
}

export async function enviarPedido(userId, texto, client = supabase) {
  const { data, error } = await client
    .from('solicitacoes')
    .insert({ solicitante_id: userId, texto: texto.trim() })
    .select('id')
    .single();
  if (error) throw error;
  processarPedido(data.id, client).catch((e) => console.warn('Processamento ficará para o admin:', e));
  return data.id;
}

export async function meuPerfil(userId, client = supabase) {
  const { data } = await client.from('solicitantes').select('nome, usuario, whatsapp, ativo').eq('user_id', userId).maybeSingle();
  return data;
}

export async function meusPedidos(userId, client = supabase) {
  const { data, error } = await client
    .from('solicitacoes')
    .select('id, texto, status, motivo_recusa, criado_em, atualizado_em, aprovado_em')
    .eq('solicitante_id', userId)
    .order('criado_em', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function cartasDoPedido(id, client = supabase) {
  const { data, error } = await client.rpc('cartas_da_solicitacao', { p_solicitacao: id });
  if (error) throw error;
  return data || [];
}

/** Assina mudanças em pedidos (todos, ou só os do supervisor). Devolve a função de cancelar. */
export function acompanharPedidos(aoMudar, userId, client = supabase) {
  const canal = client
    .channel(`pedidos-${userId || 'todos'}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'solicitacoes',
      ...(userId ? { filter: `solicitante_id=eq.${userId}` } : {}),
    }, aoMudar)
    .subscribe();
  return () => client.removeChannel(canal);
}

// ---------------------------------------------------------------- admin

export async function listarSolicitacoes() {
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('id, solicitante_id, texto, status, motivo_recusa, erro, criado_em, atualizado_em, aprovado_em, solicitante:solicitantes(nome, whatsapp, usuario), analise:solicitacoes_analise(itens)')
    .order('criado_em', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map((s) => {
    const analise = Array.isArray(s.analise) ? s.analise[0] : s.analise;
    return { ...s, itens: analise?.itens || [] };
  });
}

export async function contarPendentes() {
  const { count } = await supabase
    .from('solicitacoes')
    .select('id', { count: 'exact', head: true })
    .in('status', ['recebida', 'processando', 'revisao', 'erro']);
  return count || 0;
}

export async function salvarItens(id, itens) {
  const { error } = await supabase.from('solicitacoes_analise').upsert({ solicitacao_id: id, itens, atualizado_em: new Date().toISOString() });
  if (error) throw error;
}

export async function concluirPedido(id, userId, itens) {
  await salvarItens(id, itens);
  const { error } = await supabase
    .from('solicitacoes')
    .update({ status: 'aprovada', aprovado_por: userId, aprovado_em: new Date().toISOString(), erro: null })
    .eq('id', id);
  if (error) throw error;
}

/** Conclui o pedido sem mexer na análise (carta emitida por "Corrigir" em Gerar documentos). */
export async function marcarPedidoAprovado(id) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('solicitacoes')
    .update({ status: 'aprovada', aprovado_por: user?.id ?? null, aprovado_em: new Date().toISOString(), erro: null })
    .eq('id', id);
  if (error) throw error;
}

export async function recusarPedido(id, motivo) {
  const { error } = await supabase.from('solicitacoes').update({ status: 'recusada', motivo_recusa: motivo.trim() }).eq('id', id);
  if (error) throw error;
}

export async function definirTemplatePadrao(templateId) {
  const { error: e1 } = await supabase.from('templates').update({ padrao_pedidos: false }).eq('padrao_pedidos', true);
  if (e1) throw e1;
  if (!templateId) return;
  const { error: e2 } = await supabase.from('templates').update({ padrao_pedidos: true }).eq('id', templateId);
  if (e2) throw e2;
}

/** PDFs das cartas emitidas para o pedido, prontos para anexar (admin). */
export async function arquivosDoPedido(id) {
  const { data, error } = await supabase
    .from('cartas_geradas')
    .select('nome_arquivo, url_storage')
    .eq('solicitacao_id', id)
    .order('criado_em');
  if (error) throw error;
  return (data || [])
    .filter((c) => c.url_storage)
    .map((c) => new File([dataUrlToBlob(c.url_storage)], `${String(c.nome_arquivo || 'CARTA').replace(/[\\/:*?"<>|]/g, '-')}.pdf`, { type: 'application/pdf' }));
}

/** Link de WhatsApp com a mensagem para o supervisor. */
export function linkWhatsApp(whatsapp, texto) {
  const numero = String(whatsapp || '').replace(/\D/g, '');
  const comPais = numero && !numero.startsWith('55') ? `55${numero}` : numero;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}

/**
 * Etapas que o supervisor vê na linha do tempo do pedido.
 * estado: 'feita' | 'atual' | 'futura' | 'recusada'; em: data/hora (ISO) quando conhecida.
 */
export function etapasDoPedido(p) {
  const s = p?.status;
  const analisado = ['revisao', 'erro', 'aprovada', 'recusada'].includes(s);
  const fim = s === 'aprovada' || s === 'recusada';
  return [
    { chave: 'recebido', rotulo: 'Recebido', estado: 'feita', em: p?.criado_em },
    { chave: 'agentes', rotulo: 'Agentes', estado: analisado ? 'feita' : 'atual', em: ['revisao', 'erro'].includes(s) ? p?.atualizado_em : null },
    { chave: 'avaliacao', rotulo: 'Em avaliação', estado: fim ? 'feita' : analisado ? 'atual' : 'futura', em: null },
    s === 'recusada'
      ? { chave: 'fim', rotulo: 'Recusado', estado: 'recusada', em: p?.atualizado_em }
      : { chave: 'fim', rotulo: 'Pronta', estado: s === 'aprovada' ? 'feita' : 'futura', em: p?.aprovado_em },
  ];
}

/** Frase curta sobre o momento do pedido. */
export function fraseDoPedido(p) {
  switch (p?.status) {
    case 'recebida':
    case 'processando': return 'Os agentes estão lendo seu pedido e procurando o promotor e a loja.';
    case 'revisao':
    case 'erro': return 'A carta foi montada e está com a coordenação para conferência.';
    case 'aprovada': return 'Carta pronta. Abra abaixo ou aguarde o link no WhatsApp.';
    case 'recusada': return 'A coordenação não aprovou este pedido.';
    default: return '';
  }
}

/**
 * Quanto os agentes de IA já gastaram (R$), para o rodapé discreto da caixa de entrada.
 * Devolve null se a tabela ainda não existir ou se não houver permissão.
 */
export async function custoDosAgentes() {
  const { data, error } = await supabase
    .from('uso_agentes')
    .select('custo_brl, criado_em, solicitacao_id')
    .order('criado_em', { ascending: true })
    .limit(5000);
  if (error) return null;
  const linhas = data || [];
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  return {
    total: linhas.reduce((a, l) => a + Number(l.custo_brl || 0), 0),
    noMes: linhas.filter((l) => new Date(l.criado_em) >= inicioMes).reduce((a, l) => a + Number(l.custo_brl || 0), 0),
    pedidos: new Set(linhas.map((l) => l.solicitacao_id).filter(Boolean)).size,
    desde: linhas[0]?.criado_em || null,
  };
}
