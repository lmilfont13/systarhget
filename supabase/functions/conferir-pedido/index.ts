// Confere o pedido ANTES de enviar, para cobrar o dado que faltou na hora em
// que o supervisor ainda está na tela — em vez de deixar a carta voltar para
// revisão depois.
//
// Roda só o Intérprete (a etapa mais barata das quatro). Não grava nada, não
// procura promotor no cadastro e não gera carta: devolve apenas o que entendeu
// de cada pedido, para a tela dizer o que está faltando.
import { CORS, papelDe, resposta, usuarioDaRequisicao } from './comum.ts';
import { interprete } from './agentes.ts';

const LIMITE_TEXTO = 4000; // o mesmo maxLength do campo na tela

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405);

  const user = await usuarioDaRequisicao(req);
  if (!user) return resposta({ erro: 'Entre na sua conta.' }, 401);

  // Quem pede carta é supervisor; o admin também confere ao testar.
  const papel = papelDe(user);
  if (papel !== 'solicitante' && papel !== 'admin') return resposta({ erro: 'Sem permissão.' }, 403);

  let texto = '';
  try {
    texto = String((await req.json()).texto || '').slice(0, LIMITE_TEXTO);
  } catch {
    return resposta({ erro: 'Dados inválidos.' }, 400);
  }
  if (texto.trim().length < 3) return resposta({ erro: 'Escreva ou fale o pedido.' }, 400);

  try {
    const itens = await interprete(texto, new Date(), undefined, { manterSemPromotor: true });
    // Só o necessário para a tela saber o que falta.
    return resposta({ itens: itens.map((i) => ({ promotor: i.promotor, cpf: i.cpf, loja: i.loja })) });
  } catch (e) {
    console.error('conferir-pedido', e);
    // Conferir é ajuda, não portão: quem chamou trata isso como "não deu" e envia assim mesmo.
    return resposta({ erro: 'Não consegui conferir agora.' }, 503);
  }
});
