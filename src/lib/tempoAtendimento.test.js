import { describe, it, expect } from 'vitest';
import {
  duracaoAtendimento, fmtDuracao, fmtDuracaoCurta, resumoAtendimento, tempoEsperando, porSupervisor,
} from './tempoAtendimento.js';

const AGORA = new Date('2026-10-10T15:00:00Z').getTime();
const iso = (msAtras) => new Date(AGORA - msAtras).toISOString();
const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const aprovado = (criadoAtras, levou) => ({
  status: 'aprovada', criado_em: iso(criadoAtras), aprovado_em: iso(criadoAtras - levou), atualizado_em: iso(criadoAtras - levou),
});

describe('fmtDuracao', () => {
  it('formata minutos, horas e dias', () => {
    expect(fmtDuracao(30_000)).toBe('menos de 1 min');
    expect(fmtDuracao(14 * MIN)).toBe('14 min');
    expect(fmtDuracao(HORA + 5 * MIN)).toBe('1 h 05 min');
    expect(fmtDuracao(2 * HORA)).toBe('2 h');
    expect(fmtDuracao(2 * DIA + 3 * HORA)).toBe('2 d 3 h');
    expect(fmtDuracao(null)).toBe('—');
  });
  it('não mostra "60 min" nem "24 h" por arredondamento', () => {
    expect(fmtDuracao(HORA + 59.8 * MIN)).toBe('2 h');
    expect(fmtDuracao(DIA + 23.8 * HORA)).toBe('2 d');
  });
  it('versão curta para listas', () => {
    expect(fmtDuracaoCurta(HORA + 5 * MIN)).toBe('1h05min');
    expect(fmtDuracaoCurta(14 * MIN)).toBe('14min');
    expect(fmtDuracaoCurta(10_000)).toBe('<1min');
  });
});

describe('duração e espera', () => {
  it('aprovada mede do envio até a aprovação', () => {
    expect(duracaoAtendimento(aprovado(HORA, 20 * MIN))).toBe(20 * MIN);
  });
  it('pedido em aberto não tem duração, mas tem espera', () => {
    const p = { status: 'revisao', criado_em: iso(30 * MIN) };
    expect(duracaoAtendimento(p)).toBeNull();
    expect(tempoEsperando(p, AGORA)).toBe(30 * MIN);
    expect(tempoEsperando(aprovado(HORA, MIN), AGORA)).toBeNull();
  });
});

describe('resumoAtendimento', () => {
  it('média só das aprovadas no período, com espera mais longa dos abertos', () => {
    const r = resumoAtendimento([
      aprovado(2 * HORA, 10 * MIN),
      aprovado(3 * HORA, 30 * MIN),
      { status: 'recusada', criado_em: iso(HORA), atualizado_em: iso(0) },
      { status: 'revisao', criado_em: iso(45 * MIN) },
      { status: 'processando', criado_em: iso(5 * MIN) },
      aprovado(40 * DIA, 5 * HORA), // fora dos 30 dias
    ], { agora: AGORA });
    expect(r.tempoMedio).toBe(20 * MIN);
    expect(r.amostra).toBe(2);
    expect(r.maisRapido).toBe(10 * MIN);
    expect(r.emAberto).toBe(2);
    expect(r.esperaMaisLonga).toBe(45 * MIN);
    expect(r.prontasTotal).toBe(3);
    expect(r.prontasNoPeriodo).toBe(2);
    expect(r.recusadas).toBe(1);
    expect(r.ultimoAtendimento).toBe(10 * MIN);
    expect(r.ultimos7).toHaveLength(7);
    expect(r.ultimos7[6].total).toBe(5);
  });
  it('tendência compara com o período anterior (negativa = mais rápido)', () => {
    const r = resumoAtendimento([aprovado(DIA, HORA), aprovado(35 * DIA, 2 * HORA)], { agora: AGORA });
    expect(r.tendencia).toBeCloseTo(-0.5);
  });
  it('sem pedidos não quebra', () => {
    const r = resumoAtendimento(null, { agora: AGORA });
    expect(r.tempoMedio).toBeNull();
    expect(r.emAberto).toBe(0);
    expect(r.tendencia).toBeNull();
  });
});

describe('porSupervisor', () => {
  it('agrupa por supervisor com totais, tempo médio e último pedido', () => {
    const ana = { solicitante_id: 'a', solicitante: { nome: 'Ana' } };
    const bia = { solicitante_id: 'b', solicitante: { nome: 'Bia' } };
    const g = porSupervisor([
      { ...ana, ...aprovado(2 * HORA, 10 * MIN), itens: [{}, {}] },
      { ...ana, ...aprovado(3 * HORA, 30 * MIN), itens: [{}] },
      { ...ana, status: 'recusada', criado_em: iso(HORA), atualizado_em: iso(0), itens: [] },
      { ...bia, status: 'revisao', criado_em: iso(20 * MIN), itens: [{}] },
    ], { agora: AGORA });
    expect(g.map((x) => x.nome)).toEqual(['Bia', 'Ana']); // quem tem pedido aberto vem primeiro
    const a = g[1];
    expect(a).toMatchObject({ total: 3, cartas: 3, prontas: 2, recusadas: 1, emAberto: 0, tempoMedio: 20 * MIN });
    expect(a.ultimoPedido).toBe(iso(HORA));
    expect(g[0]).toMatchObject({ emAberto: 1, esperaMaisLonga: 20 * MIN, tempoMedio: null });
  });
});
