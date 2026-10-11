import { describe, it, expect } from 'vitest';
import { itensIncompletos, avisoDoQueFalta } from './pedidoCompleto';

describe('itensIncompletos', () => {
  it('não acusa nada quando o item tem promotor e loja', () => {
    expect(itensIncompletos([{ promotor: 'Adailton', loja: 'Atacadão Messejana' }])).toEqual([]);
  });

  it('acusa a loja que faltou', () => {
    expect(itensIncompletos([{ promotor: 'Adailton', loja: '' }]))
      .toEqual([{ promotor: 'Adailton', loja: '', falta: ['loja'] }]);
  });

  it('acusa o promotor que faltou', () => {
    expect(itensIncompletos([{ promotor: '', loja: 'Assaí Bezerra de Menezes' }]))
      .toEqual([{ promotor: '', loja: 'Assaí Bezerra de Menezes', falta: ['promotor'] }]);
  });

  it('aceita CPF no lugar do nome do promotor', () => {
    expect(itensIncompletos([{ promotor: '', cpf: '12345678901', loja: 'Atacadão' }])).toEqual([]);
  });

  it('não se engana com campo só de espaço', () => {
    expect(itensIncompletos([{ promotor: 'Adailton', loja: '   ' }]))
      .toEqual([{ promotor: 'Adailton', loja: '   ', falta: ['loja'] }]);
  });

  it('separa o item incompleto dos que já estão prontos', () => {
    const itens = [
      { promotor: 'Adailton', loja: 'Atacadão Messejana' },
      { promotor: 'Juliana', loja: '' },
    ];
    expect(itensIncompletos(itens)).toEqual([{ promotor: 'Juliana', loja: '', falta: ['loja'] }]);
  });

  it('aguenta lista vazia ou ausente', () => {
    expect(itensIncompletos([])).toEqual([]);
    expect(itensIncompletos()).toEqual([]);
  });
});

describe('avisoDoQueFalta', () => {
  it('fica calado quando está tudo completo', () => {
    expect(avisoDoQueFalta([{ promotor: 'Adailton', loja: 'Atacadão Messejana' }])).toBe(null);
  });

  it('pede promotor e loja quando não entendeu nenhum pedido', () => {
    expect(avisoDoQueFalta([])).toEqual({
      titulo: 'Não entendi nenhum pedido de carta.',
      detalhes: ['Diga o nome do promotor e o nome da loja.'],
    });
  });

  it('cobra a loja identificando pelo promotor', () => {
    expect(avisoDoQueFalta([{ promotor: 'Adailton', loja: '' }])).toEqual({
      titulo: 'Um pedido está incompleto.',
      detalhes: ['Adailton: falta dizer a loja'],
    });
  });

  it('cobra o promotor identificando pela loja', () => {
    expect(avisoDoQueFalta([{ promotor: '', loja: 'Atacadão Messejana' }])).toEqual({
      titulo: 'Um pedido está incompleto.',
      detalhes: ['Atacadão Messejana: falta dizer o promotor'],
    });
  });

  it('lista uma linha por pedido incompleto', () => {
    const itens = [
      { promotor: 'Adailton', loja: '' },
      { promotor: '', loja: 'Assaí Bezerra de Menezes' },
    ];
    expect(avisoDoQueFalta(itens)).toEqual({
      titulo: '2 pedidos estão incompletos.',
      detalhes: ['Adailton: falta dizer a loja', 'Assaí Bezerra de Menezes: falta dizer o promotor'],
    });
  });

  it('cobra os dois dados quando não sobrou nem promotor nem loja', () => {
    expect(avisoDoQueFalta([{ promotor: '', loja: '' }])).toEqual({
      titulo: 'Um pedido está incompleto.',
      detalhes: ['Falta dizer o promotor e a loja'],
    });
  });
});
