import { describe, it, expect } from 'vitest';
import { normalizarCargo, listaDeCargos, cargoParaCarta, CARGO_PADRAO } from './cargos.js';

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

  it('sem cadastro e sem escolha, usa o cargo padrão PROMOTOR(A)', () => {
    expect(cargoParaCarta('', { cargo: '  ' })).toBe(CARGO_PADRAO);
    expect(cargoParaCarta('', null)).toBe(CARGO_PADRAO);
  });
});

describe('ehCampoRg / ehCampoCargo', async () => {
  const { ehCampoRg, ehCampoCargo } = await import('./cargos.js');
  it('"cargo" não é RG (contém as letras rg)', () => {
    expect(ehCampoRg('Cargo')).toBe(false);
    expect(ehCampoRg('cargo_funcionario')).toBe(false);
    expect(ehCampoCargo('Cargo')).toBe(true);
  });
  it('reconhece RG de verdade', () => {
    expect(ehCampoRg('RG')).toBe(true);
    expect(ehCampoRg('numero_rg')).toBe(true);
    expect(ehCampoRg('RG do funcionário')).toBe(true);
  });
});
