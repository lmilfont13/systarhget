// Teto de gasto com os agentes.
//
// Sem isto, qualquer supervisor autenticado pode disparar pedidos em sequência
// e a conta na Anthropic só aparece no fim do mês. A tabela uso_agentes já
// registrava o custo; agora ela também freia.
//
// O teto é do sistema inteiro, por dia, não por pessoa: o risco que importa é
// a conta total, e um limite por pessoa não impede dez pessoas gastando.

/** Teto diário em dólares. Ajustável por variável de ambiente. */
export function tetoDiarioUsd(): number {
  const configurado = Number(Deno.env.get('TETO_DIARIO_USD'));
  return configurado > 0 ? configurado : 5;
}

/**
 * Decide se ainda dá para gastar.
 * Separado do banco de propósito, para poder ser testado sem subir nada.
 */
export function podeGastar(gastoHojeUsd: number, teto: number): boolean {
  return gastoHojeUsd < teto;
}

/** Quanto já foi gasto hoje, no fuso de São Paulo (onde o dia vira para o time). */
export function inicioDoDiaSaoPaulo(agora = new Date()): string {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);
  // São Paulo é UTC-3 o ano todo desde o fim do horário de verão.
  return `${dia}T03:00:00.000Z`;
}
