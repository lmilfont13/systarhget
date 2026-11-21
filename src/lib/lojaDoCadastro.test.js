import { describe, it, expect } from 'vitest';
import { lojasDoFuncionario, valorDaLoja, camposDeLoja } from './lojaDoCadastro';

describe('lojasDoFuncionario', () => {
  it('lê o campo Lojas do cadastro', () => {
    expect(lojasDoFuncionario({ dados_extras: { Lojas: 'COMERCIAL POPULAR' } })).toEqual(['COMERCIAL POPULAR']);
  });
  it('separa várias lojas e tira as repetidas', () => {
    expect(lojasDoFuncionario({ dados_extras: { LOJAS: 'COMERCIAL POPULAR |Comercial Popular | MATEUS ;  ATACADAO' } }))
      .toEqual(['COMERCIAL POPULAR', 'MATEUS', 'ATACADAO']);
  });
  it('aceita Estabelecimento e PDV, e nada quando não há loja', () => {
    expect(lojasDoFuncionario({ dados_extras: { Estabelecimento: 'ASSAI' } })).toEqual(['ASSAI']);
    expect(lojasDoFuncionario({ dados_extras: { pdv: 'X' } })).toEqual(['X']);
    expect(lojasDoFuncionario({ dados_extras: { CPF: '1' } })).toEqual([]);
    expect(lojasDoFuncionario(null)).toEqual([]);
  });
});

describe('valorDaLoja', () => {
  const lojas = [{ id: 1, nome: 'Comercial Popular', endereco: 'Rua A, 10' }, { id: 2, nome: 'Assaí' }];
  it('usa o formato da lista quando a loja está cadastrada', () => {
    expect(valorDaLoja('COMERCIAL POPULAR', lojas)).toEqual({ valor: 'Comercial Popular (Rua A, 10)', conhecida: true });
    expect(valorDaLoja('ASSAI', lojas)).toEqual({ valor: 'Assaí', conhecida: true });
  });
  it('mantém o nome quando não está cadastrada', () => {
    expect(valorDaLoja('MATEUS', lojas)).toEqual({ valor: 'MATEUS', conhecida: false });
  });
});

describe('camposDeLoja', () => {
  it('acha os campos de loja do template', () => {
    expect(camposDeLoja({ fields: [{ name: 'Loja' }, { name: 'cpf' }, { name: 'loja', mappedTo: 'x' }] })).toEqual(['Loja']);
  });
});
