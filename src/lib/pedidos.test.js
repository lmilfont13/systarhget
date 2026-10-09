import { describe, it, expect } from 'vitest';
import { etapasDoPedido } from './pedidos.js';

const estados = (p) => etapasDoPedido(p).map((e) => e.estado);

describe('etapasDoPedido (linha do tempo do supervisor)', () => {
  it('recém-enviado: agentes trabalhando', () => {
    expect(estados({ status: 'recebida' })).toEqual(['feita', 'atual', 'futura', 'futura']);
    expect(estados({ status: 'processando' })).toEqual(['feita', 'atual', 'futura', 'futura']);
  });
  it('em revisão (ou erro interno): em avaliação, sem expor o erro', () => {
    expect(estados({ status: 'revisao' })).toEqual(['feita', 'feita', 'atual', 'futura']);
    expect(estados({ status: 'erro' })).toEqual(['feita', 'feita', 'atual', 'futura']);
  });
  it('aprovada: tudo feito, com a hora da aprovação', () => {
    const e = etapasDoPedido({ status: 'aprovada', aprovado_em: '2026-10-09T19:12:57Z' });
    expect(e.map((x) => x.estado)).toEqual(['feita', 'feita', 'feita', 'feita']);
    expect(e[3].em).toBe('2026-10-09T19:12:57Z');
  });
  it('recusada: última etapa vira "Recusado"', () => {
    const e = etapasDoPedido({ status: 'recusada' });
    expect(e[3]).toMatchObject({ rotulo: 'Recusado', estado: 'recusada' });
  });
});
