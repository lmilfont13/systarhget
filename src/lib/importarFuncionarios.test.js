import { describe, it, expect } from 'vitest';
import {
  lerCsv, campoDaColuna, acharCabecalho, planilhaParaCadastros,
  montarCadastro, marcarSituacao, aplicarAssociacao, textoDaCelula,
} from './importarFuncionarios';

const empresas = [{ id: 'e1', nome: 'POP TRADE' }, { id: 'e2', nome: 'SPAR' }];

describe('lerCsv', () => {
  it('detecta ponto e vírgula e respeita aspas', () => {
    expect(lerCsv('Nome;CPF\n"Silva; Ana";123\n')).toEqual([['Nome', 'CPF'], ['Silva; Ana', '123']]);
  });
  it('detecta vírgula e ignora linhas vazias', () => {
    expect(lerCsv('\uFEFFNome,Cargo\r\n\r\nJoão,Promotor')).toEqual([['Nome', 'Cargo'], ['João', 'Promotor']]);
  });
});

describe('colunas', () => {
  it('reconhece variações de título', () => {
    expect(campoDaColuna('Nome Completo')).toBe('nome');
    expect(campoDaColuna('Função')).toBe('cargo');
    expect(campoDaColuna('Nº CDC')).toBe('NC FUNCIONARIO');
    expect(campoDaColuna('Conta')).toBe('Empresa');
    expect(campoDaColuna('Projeto')).toBe('Empresa');
    expect(campoDaColuna('Coligada')).toBe('coligada');
    expect(campoDaColuna('Telefone')).toBeNull();
  });
  it('acha o cabeçalho mesmo com título acima', () => {
    expect(acharCabecalho([['RELAÇÃO DE PROMOTORES'], [], ['Nome', 'CPF']])).toBe(2);
    expect(acharCabecalho([['a', 'b']])).toBe(-1);
  });
});

describe('planilhaParaCadastros', () => {
  it('monta cadastros no formato da tela', () => {
    const { cadastros, erro } = planilhaParaCadastros([
      ['Nome', 'CPF', 'Cargo', 'CDC', 'Cliente', 'Coligada', 'Telefone'],
      ['maria souza', 1234567890, 'promotora', 'sp01', 'colgate', 'pop trade', '1199'],
      ['', '', '', '', '', '', ''],
    ], empresas);
    expect(erro).toBe('');
    expect(cadastros).toHaveLength(1);
    expect(cadastros[0]).toMatchObject({
      nome: 'MARIA SOUZA',
      cargo: 'PROMOTORA',
      empresa_id: 'e1',
      dados_extras: { CPF: '01234567890', 'NC FUNCIONARIO': 'SP01', Empresa: 'COLGATE', Telefone: '1199' },
    });
  });
  it('avisa quando não há coluna de nome', () => {
    expect(planilhaParaCadastros([['CPF'], ['1']]).erro).toMatch(/coluna de nome/);
  });
  it('guarda coligada que não existe para avisar', () => {
    const c = montarCadastro({ nome: 'A', coligada: 'XYZ' }, empresas);
    expect(c.empresa_id).toBeNull();
    expect(c.coligadaNaoEncontrada).toBe('XYZ');
  });
  it('datas viram dd/mm/aaaa', () => {
    expect(textoDaCelula(new Date(Date.UTC(2020, 0, 5)))).toBe('05/01/2020');
  });
});

describe('marcarSituacao', () => {
  it('marca existente por CPF, repetido no arquivo e novo', () => {
    const existentes = [{ id: 'f1', nome: 'X', dados_extras: { CPF: '012.345.678-90' } }];
    const r = marcarSituacao([
      { nome: 'A', dados_extras: { CPF: '01234567890' } },
      { nome: 'B', dados_extras: { CPF: '111' } },
      { nome: 'B2', dados_extras: { CPF: '00000000111' } },
      { nome: 'C', dados_extras: {} },
    ], existentes);
    expect(r.map((x) => x.situacao)).toEqual(['existente', 'novo', 'repetido', 'novo']);
    expect(r[0].existenteId).toBe('f1');
  });
});

describe('aplicarAssociacao', () => {
  it('preenche só o que foi informado', () => {
    const c = { nome: 'A', empresa_id: 'e2', dados_extras: { CPF: '1', Empresa: 'OLD' } };
    expect(aplicarAssociacao(c, { empresaId: '', conta: 'nestle', cdc: '' })).toEqual({
      nome: 'A', empresa_id: 'e2', dados_extras: { CPF: '1', Empresa: 'NESTLE' },
    });
  });
});

describe('planilha de aprovados', () => {
  it('aceita a coluna APROVADO como nome e guarda loja/cidade', () => {
    const { cadastros } = planilhaParaCadastros([
      ['LOJAS', 'CIDADE', 'APROVADO', 'CPF'],
      ['ASSAI - MONTESE', 'FORTALEZA-CE', 'ARISCE CASTRO BONIFACIO', '043.639.313-10'],
    ]);
    expect(cadastros[0]).toMatchObject({
      nome: 'ARISCE CASTRO BONIFACIO',
      dados_extras: { LOJAS: 'ASSAI - MONTESE', CIDADE: 'FORTALEZA-CE', CPF: '043.639.313-10' },
    });
  });
});
