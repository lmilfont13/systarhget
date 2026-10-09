import { describe, it, expect } from 'vitest';
import { normalizarCargo, listaDeCargos, cargoParaCarta } from './cargos.js';

describe('cargos', () => {
  it('padroniza maiúsculas e espaços', () => {
    expect(normalizarCargo('  promotor(a)   de trade  ')).toBe('PROMOTOR(A) DE TRADE');
    expect(normalizarCargo(null)).toBe('');
  });

  it('lista os cargos do mais usado ao menos usado, sem repetir nem vazios', () => {
    const lista = listaDeCargos([
      { cargo: 'Promotor(a) JR' }, { cargo: 'PROMOTOR(A)  JR' }, { cargo: 'Repositor(a)' }, { cargo: '' }, {},
    ]);
    expect(lista).toEqual([
      { cargo: 'PROMOTOR(A) JR', total: 2 },
      { cargo: 'REPOSITOR(A)', total: 1 },
    ]);
  });

  it('no automático usa o cargo do cadastro', () => {
    expect(cargoParaCarta('', { cargo: 'promotor (a) pleno' })).toBe('PROMOTOR (A) PLENO');
  });

  it('a função escolhida substitui o cargo do cadastro', () => {
    expect(cargoParaCarta('repositor(a)', { cargo: 'PROMOTOR' })).toBe('REPOSITOR(A)');
  });

  it('sem cadastro e sem escolha, fica vazio (a tela avisa)', () => {
    expect(cargoParaCarta('', { cargo: '  ' })).toBe('');
  });
});
