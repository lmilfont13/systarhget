// Recebe o id de um pedido, coloca os agentes para resolver e deixa pronto para revisão.
// Pode ser chamado pelo supervisor dono do pedido (logo após enviar) ou pelo admin (reprocessar).
import { CORS, clienteServico, papelDe, resposta, usuarioDaRequisicao } from './comum.ts';
import { ErroAgente, resolverPedido } from './agentes.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405);

  const user = await usuarioDaRequisicao(req);
  if (!user) return resposta({ erro: 'Entre na sua conta.' }, 401);

  let id = '';
  try {
    id = String((await req.json()).id || '');
  } catch {
    return resposta({ erro: 'Dados inválidos.' }, 400);
  }

  const db = clienteServico();
  const { data: pedido } = await db.from('solicitacoes').select('id, solicitante_id, texto, status, atualizado_em').eq('id', id).maybeSingle();
  if (!pedido) return resposta({ erro: 'Pedido não encontrado.' }, 404);

  const ehAdmin = papelDe(user) === 'admin';
  if (!ehAdmin && pedido.solicitante_id !== user.id) return resposta({ erro: 'Sem permissão.' }, 403);
  if (pedido.status === 'aprovada' || pedido.status === 'recusada') return resposta({ ok: true, status: pedido.status });
  if (!ehAdmin && pedido.status !== 'recebida') return resposta({ ok: true, status: pedido.status });

  // Evita dois processamentos ao mesmo tempo (libera depois de 2 minutos)
  const recente = Date.now() - new Date(pedido.atualizado_em).getTime() < 120_000;
  if (pedido.status === 'processando' && recente) return resposta({ ok: true, status: 'processando' });

  await db.from('solicitacoes').update({ status: 'processando', erro: null }).eq('id', id);

  try {
    const itens = await resolverPedido(db, pedido.texto);
    await db.from('solicitacoes').update({ status: 'revisao', itens, erro: null }).eq('id', id);
    return resposta({ ok: true, status: 'revisao' });
  } catch (e) {
    console.error('processar', e);
    const msg = e instanceof ErroAgente ? e.message : 'Falha inesperada ao processar. Use "Reprocessar".';
    await db.from('solicitacoes').update({ status: 'erro', erro: msg }).eq('id', id);
    return resposta({ ok: false, status: 'erro', erro: msg });
  }
});
