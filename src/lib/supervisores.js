import { supabase } from './supabase';

/**
 * Gestão dos supervisores que pedem carta pela área /pedir.
 *
 * Duas ações, com pesos bem diferentes:
 *
 *  - Desativar: reversível. O supervisor para de criar pedidos (a regra vive
 *    na policy do banco, não só na tela) e o histórico fica inteiro. É o que
 *    se faz quando alguém sai da empresa.
 *
 *  - Excluir: apaga a conta de verdade. E aqui está a armadilha: a chave
 *    estrangeira de solicitacoes é ON DELETE CASCADE, então apagar o
 *    supervisor apaga junto todos os pedidos dele — e as cartas perdem o
 *    vínculo com o pedido que as originou. Como carta é documento oficial
 *    emitido, isso destrói prova. Por isso só liberamos exclusão de quem não
 *    tem pedido nenhum.
 */

/** Se dá para apagar de vez, ou se o histórico obriga a apenas desativar. */
export function podeExcluirSupervisor(supervisor) {
  const pedidos = supervisor?.pedidos;
  if (typeof pedidos !== 'number') {
    return { pode: false, motivo: 'Não consegui conferir o histórico deste supervisor agora.' };
  }
  if (pedidos === 0) return { pode: true };
  return {
    pode: false,
    motivo: `Tem ${pedidos} ${pedidos === 1 ? 'pedido ' : 'pedidos '}no histórico. Apagar levaria junto as cartas emitidas. Desative em vez de excluir.`,
  };
}

/** Todos os supervisores, com quantos pedidos cada um já fez. */
export async function listarSupervisores(client = supabase) {
  const { data, error } = await client
    .from('solicitantes')
    .select('user_id, nome, usuario, whatsapp, ativo, criado_em, solicitacoes(count)')
    .order('nome');
  if (error) throw error;
  return (data || []).map((s) => ({
    ...s,
    pedidos: s.solicitacoes?.[0]?.count ?? 0,
  }));
}

/** Liga ou desliga o acesso, sem tocar no histórico. */
export async function definirAtivo(userId, ativo, client = supabase) {
  const { error } = await client.from('solicitantes').update({ ativo }).eq('user_id', userId);
  if (error) throw error;
}

/**
 * Apaga a conta de vez. Precisa de função no servidor: remover o usuário do
 * auth exige a chave de serviço, que nunca pode ir para o navegador.
 */
export async function excluirSupervisor(userId, client = supabase) {
  const { data, error } = await client.functions.invoke('excluir-supervisor', {
    body: { user_id: userId },
  });
  if (error) {
    let msg = 'Não foi possível excluir agora.';
    try {
      const corpo = await error?.context?.json?.();
      if (corpo?.erro) msg = corpo.erro;
    } catch { /* resposta sem JSON */ }
    throw new Error(msg);
  }
  if (data?.erro) throw new Error(data.erro);
}
