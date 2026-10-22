import { describe, it, expect } from 'vitest';
import { previsaoDeEspera, esperaDoPedido, frasePrevisao, arredondarPrevisao, fatia } from './previsao';

const MIN = 60_000;

/** Pedido aprovado que levou `ms` do envio até a carta pronta. */
const aprovado = (ms, fim = '2026-10-20T12:00:00Z') => ({
  status: 'aprovada',
  criado_em: new Date(new Date(fim).getTime() - ms).toISOString(),
  aprovado_em: fim,
});

const aberto = (desdeMs, agora) => ({
  status: 'processando',
  criado_em: new Date(agora - desdeMs).toISOString(),
});

describe('previsaoDeEspera', () => {
  it('não arrisca previsão com histórico curto', () => {
    // Com dois pedidos a mediana é chute. Prefere não dizer nada a dizer errado.
    expect(previsaoDeEspera([aprovado(5 * MIN), aprovado(7 * MIN)])).toBe(null);
  });

  it('usa a mediana do histórico de cartas prontas', () => {
    const p = previsaoDeEspera([2, 4, 6, 8, 10].map((m) => aprovado(m * MIN)));
    expect(p.tipico).toBe(6 * MIN);
    expect(p.amostra).toBe(5);
  });

  it('um pedido esquecido no fim de semana não estraga a previsão dos outros', () => {
    // É por isso que é mediana e não média: 48 h num pedido levaria a
    // previsão para ~10 h e a tela mentiria para todo mundo.
    const p = previsaoDeEspera([
      aprovado(5 * MIN), aprovado(6 * MIN), aprovado(7 * MIN), aprovado(8 * MIN), aprovado(48 * 60 * MIN),
    ]);
    expect(p.tipico).toBe(7 * MIN);
  });

  it('ignora recusados e pedidos em aberto', () => {
    const lista = [
      ...[3, 5, 7, 9].map((m) => aprovado(m * MIN)),
      { status: 'recusada', criado_em: '2026-10-20T10:00:00Z', atualizado_em: '2026-10-20T10:01:00Z' },
      { status: 'processando', criado_em: '2026-10-20T11:00:00Z' },
    ];
    expect(previsaoDeEspera(lista).amostra).toBe(4);
  });

  it('o limite do normal nunca fica abaixo do típico', () => {
    // Senão um pedido nasceria "atrasado" no mesmo segundo em que é criado.
    const p = previsaoDeEspera(Array.from({ length: 6 }, () => aprovado(5 * MIN)));
    expect(p.limite).toBeGreaterThanOrEqual(p.tipico);
  });

  it('aguenta lista vazia ou inválida', () => {
    expect(previsaoDeEspera([])).toBe(null);
    expect(previsaoDeEspera(null)).toBe(null);
    expect(previsaoDeEspera(undefined)).toBe(null);
  });
});

describe('esperaDoPedido', () => {
  const agora = new Date('2026-10-22T12:00:00Z').getTime();
  const previsao = { tipico: 10 * MIN, limite: 20 * MIN, amostra: 9 };

  it('mede a fração já decorrida da espera normal', () => {
    const e = esperaDoPedido(aberto(5 * MIN, agora), previsao, agora);
    expect(e.fracao).toBeCloseTo(0.5, 5);
    expect(e.passouDoNormal).toBe(false);
  });

  it('a barra enche e para, em vez de estourar', () => {
    const e = esperaDoPedido(aberto(90 * MIN, agora), previsao, agora);
    expect(e.fracao).toBe(1);
  });

  it('marca como fora do normal só depois do limite, não do típico', () => {
    expect(esperaDoPedido(aberto(15 * MIN, agora), previsao, agora).passouDoNormal).toBe(false);
    expect(esperaDoPedido(aberto(25 * MIN, agora), previsao, agora).passouDoNormal).toBe(true);
  });

  it('não diz nada sobre pedido já concluído', () => {
    expect(esperaDoPedido({ status: 'aprovada', criado_em: '2026-10-22T11:00:00Z' }, previsao, agora)).toBe(null);
    expect(esperaDoPedido({ status: 'recusada', criado_em: '2026-10-22T11:00:00Z' }, previsao, agora)).toBe(null);
  });

  it('sem previsão, não inventa', () => {
    expect(esperaDoPedido(aberto(5 * MIN, agora), null, agora)).toBe(null);
  });
});

describe('arredondarPrevisao', () => {
  it('nunca promete menos de um minuto', () => {
    // "cerca de 20 segundos" vira uma promessa que a tela não cumpre.
    expect(arredondarPrevisao(12_000)).toBe(MIN);
  });

  it('tira a precisão falsa dos minutos', () => {
    expect(arredondarPrevisao(113_000)).toBe(2 * MIN);
    expect(arredondarPrevisao(14 * MIN + 20_000)).toBe(14 * MIN);
  });

  it('acima de meia hora fala de 5 em 5 minutos', () => {
    expect(arredondarPrevisao(43 * MIN)).toBe(45 * MIN);
  });

  it('acima de três horas fala de meia em meia hora', () => {
    expect(arredondarPrevisao(200 * MIN)).toBe(210 * MIN);
  });

  it('aguenta valor ausente', () => {
    expect(arredondarPrevisao(null)).toBe(null);
    expect(arredondarPrevisao(NaN)).toBe(null);
  });
});

describe('frasePrevisao', () => {
  const previsao = { tipico: 9 * MIN, limite: 20 * MIN, amostra: 9 };

  it('diz o tempo normal de um jeito que não soa a cronômetro', () => {
    const f = frasePrevisao(previsao, { decorrido: MIN, fracao: 0.1, passouDoNormal: false });
    expect(f).toContain('cerca de 9 min');
  });

  it('quando atrasa, admite e garante que não se perdeu', () => {
    // A pessoa que acha que travou manda o pedido de novo — e aí são duas cartas.
    const f = frasePrevisao(previsao, { decorrido: 40 * MIN, fracao: 1, passouDoNormal: true });
    expect(f).toContain('demorando mais que o normal');
    expect(f).toMatch(/não travou/i);
  });

  it('cala a boca quando não há previsão', () => {
    expect(frasePrevisao(null, { fracao: 0.5 })).toBe(null);
    expect(frasePrevisao(previsao, null)).toBe(null);
  });
});

describe('fatia', () => {
  it('pega a posição pedida da lista ordenada', () => {
    const xs = [1, 2, 3, 4, 5];
    expect(fatia(xs, 0)).toBe(1);
    expect(fatia(xs, 0.5)).toBe(3);
    expect(fatia(xs, 1)).toBe(5);
  });

  it('não sai da lista', () => {
    expect(fatia([7], 0.9)).toBe(7);
    expect(fatia([], 0.5)).toBe(null);
  });
});
