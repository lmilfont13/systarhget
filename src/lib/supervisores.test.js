import { describe, it, expect } from 'vitest';
import { podeExcluirSupervisor } from './supervisores';

describe('podeExcluirSupervisor', () => {
  it('libera a exclusão de quem nunca pediu nada', () => {
    expect(podeExcluirSupervisor({ pedidos: 0 })).toEqual({ pode: true });
  });

  it('barra a exclusão de quem já pediu carta', () => {
    // Pedido apagado leva junto a carta que ele gerou: é prova de documento
    // oficial emitido. Quem saiu da empresa se desativa, não se apaga.
    const r = podeExcluirSupervisor({ pedidos: 3 });
    expect(r.pode).toBe(false);
    expect(r.motivo).toContain('3 pedidos');
  });

  it('fala no singular quando é um pedido só', () => {
    expect(podeExcluirSupervisor({ pedidos: 1 }).motivo).toContain('1 pedido ');
  });

  it('trata contagem ausente como histórico desconhecido, e barra', () => {
    // Na dúvida não apaga: o custo de errar para um lado é perder auditoria.
    expect(podeExcluirSupervisor({}).pode).toBe(false);
    expect(podeExcluirSupervisor().pode).toBe(false);
  });
});
