/**
 * Regras de para onde o /login manda a pessoa, isoladas aqui porque já
 * causaram dois bugs de tela travada: um papel antigo guardado no navegador
 * sequestrando o destino, e o modo "trocar de conta" que nunca terminava.
 */

/** Destino padrão de cada papel quando ninguém pediu um lugar específico. */
const PADRAO_DO_PAPEL = { promotor: '/promotores', solicitante: '/pedir' };

/**
 * Para onde ir depois de entrar.
 * `from` (a rota protegida que mandou a pessoa pro login) tem prioridade:
 * antes o papel sempre vencia e ignorava pra onde a pessoa queria ir.
 */
export function destinoPosLogin({ role, from } = {}) {
  return from || PADRAO_DO_PAPEL[role] || '/dashboard';
}

/**
 * Se o /login deve redirecionar sozinho em vez de mostrar o formulário.
 * `trocando` (?trocar=1) segura o formulário na tela só enquanto a sessão
 * antiga ainda está aberta — depois de entrar com outra conta ele precisa
 * sair da URL, senão o redirecionamento nunca acontece.
 */
export function deveRedirecionar({ loading, session, recovering, trocando } = {}) {
  return Boolean(!loading && session && !recovering && !trocando);
}
