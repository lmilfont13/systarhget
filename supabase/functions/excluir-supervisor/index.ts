// Apaga de vez a conta de um supervisor. Só o admin pode, e só quando o
// supervisor não deixou histórico.
//
// Por que existe no servidor: remover usuário do auth exige a chave de
// serviço, que nunca pode ir para o navegador.
//
// Por que a trava é repetida aqui: a tela já esconde o botão de excluir para
// quem tem pedidos, mas tela é sugestão — qualquer um pode chamar a função
// direto. A regra que vale é esta.
import { CORS, clienteServico, papelDe, resposta, usuarioDaRequisicao } from './comum.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405);

  const user = await usuarioDaRequisicao(req);
  if (!user) return resposta({ erro: 'Entre na sua conta.' }, 401);
  if (papelDe(user) !== 'admin') return resposta({ erro: 'Só o administrador pode excluir supervisores.' }, 403);

  let alvo = '';
  try {
    alvo = String((await req.json()).user_id || '');
  } catch {
    return resposta({ erro: 'Dados inválidos.' }, 400);
  }
  if (!alvo) return resposta({ erro: 'Diga qual supervisor excluir.' }, 400);
  if (alvo === user.id) return resposta({ erro: 'Você não pode excluir a sua própria conta.' }, 400);

  const admin = clienteServico();

  const { data: supervisor } = await admin
    .from('solicitantes')
    .select('user_id, nome')
    .eq('user_id', alvo)
    .maybeSingle();
  if (!supervisor) return resposta({ erro: 'Supervisor não encontrado.' }, 404);

  // A trava que importa: pedido apagado leva junto a carta que gerou (a chave
  // estrangeira é ON DELETE CASCADE), e carta é documento oficial emitido.
  const { count, error: erroContagem } = await admin
    .from('solicitacoes')
    .select('id', { count: 'exact', head: true })
    .eq('solicitante_id', alvo);

  if (erroContagem) {
    console.error('contagem', erroContagem);
    return resposta({ erro: 'Não consegui conferir o histórico. Nada foi excluído.' }, 500);
  }

  if ((count ?? 0) > 0) {
    return resposta({
      erro: `${supervisor.nome} tem ${count} ${count === 1 ? 'pedido' : 'pedidos'} no histórico. Apagar levaria junto as cartas emitidas — desative em vez de excluir.`,
    }, 409);
  }

  // A linha de solicitantes sai junto, por cascata do auth.users.
  const { error } = await admin.auth.admin.deleteUser(alvo);
  if (error) {
    console.error('deleteUser', error);
    return resposta({ erro: 'Não foi possível excluir agora. Tente de novo.' }, 500);
  }

  // Garante a limpeza mesmo que não haja cascata configurada no auth.
  await admin.from('solicitantes').delete().eq('user_id', alvo);

  return resposta({ ok: true, nome: supervisor.nome });
});
