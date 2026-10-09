// Recebe o id de um pedido, coloca os agentes para resolver e deixa pronto para revisão.
// Pode ser chamado pelo supervisor dono do pedido (logo após enviar) ou pelo admin (reprocessar).
import { CORS, clienteServico, papelDe, resposta, usuarioDaRequisicao } from './comum.ts';
import { ErroAgente, resolverPedido } from './agentes.ts';
import { avisarWhatsApp, mensagemDoPedido } from './whatsapp.ts';

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

  // Troca para "processando" só se ninguém mudou o pedido desde a leitura (atômico)
  const { data: tomado, error: erroTomar } = await db.from('solicitacoes')
    .update({ status: 'processando', erro: null })
    .eq('id', id).eq('status', pedido.status).eq('atualizado_em', pedido.atualizado_em)
    .select('id');
  if (erroTomar) return resposta({ erro: 'Não foi possível iniciar o processamento.' }, 500);
  if (!tomado?.length) return resposta({ ok: true, status: 'processando' });

  // Avisa no WhatsApp só no primeiro processamento (pedido recém-chegado)
  const primeiraVez = pedido.status === 'recebida';
  const nomeSupervisor = async () => {
    const { data } = await db.from('solicitantes').select('nome').eq('user_id', pedido.solicitante_id).maybeSingle();
    return data?.nome || 'Supervisor';
  };

  try {
    const itens = await resolverPedido(db, pedido.texto);
    const { error: erroAnalise } = await db.from('solicitacoes_analise')
      .upsert({ solicitacao_id: id, itens, atualizado_em: new Date().toISOString() });
    if (erroAnalise) throw erroAnalise;
    const { error: erroStatus } = await db.from('solicitacoes').update({ status: 'revisao', erro: null }).eq('id', id);
    if (erroStatus) throw erroStatus;
    if (primeiraVez) await avisarWhatsApp(mensagemDoPedido(await nomeSupervisor(), pedido.texto, itens));
    return resposta({ ok: true, status: 'revisao' });
  } catch (e) {
    console.error('processar', e);
    const msg = e instanceof ErroAgente ? e.message : 'Falha inesperada ao processar. Use "Reprocessar".';
    await db.from('solicitacoes').update({ status: 'erro', erro: msg }).eq('id', id);
    if (primeiraVez) await avisarWhatsApp(mensagemDoPedido(await nomeSupervisor(), pedido.texto, null, msg));
    return resposta({ ok: false, status: 'erro', erro: msg });
  }
});
