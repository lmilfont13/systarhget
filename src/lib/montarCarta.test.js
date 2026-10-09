import { describe, it, expect } from 'vitest';
import { montarCarta, cdcDoPromotor } from './montarCarta.js';
import { roleFromSession } from './auth.jsx';

const funcionario = {
  nome: 'Adailton Jose Rodrigues do Nascimento',
  cargo: 'PROMOTOR(A) JR',
  dados_extras: { CPF: '05551801314', 'NC FUNCIONARIO': 'COLGATE', RG: 2007005, Cargo: 'PROMOTOR(A) JR' },
};
const empresa = { nome: 'POP TRADE MARKETING E CONSULTORIA LTDA' };
const template = {
  conteudo: 'A Loja\n{{loja}}\nRef.: Apresentação de {{Cargo}}\nSr. (a) {{nome}}, CPF {{cpf}}, função {{cargo}} da {{Cdc}} pela {{empresa}}. {{logo}} [extra]',
};

describe('montarCarta', () => {
  const texto = montarCarta({ template, funcionario, empresa, loja: 'Atacadão Messejana', cargo: '' });

  it('preenche loja, nome, CPF, CDC e empresa', () => {
    expect(texto).toContain('ATACADÃO MESSEJANA');
    expect(texto).toContain('<b>ADAILTON JOSE RODRIGUES DO NASCIMENTO</b>');
    expect(texto).toContain('<b>05551801314</b>');
    expect(texto).toContain('da COLGATE');
    expect(texto).toContain('pela POP TRADE MARKETING E CONSULTORIA LTDA');
  });

  it('usa o cargo do cadastro no automático, nas duas grafias', () => {
    expect(texto).toContain('Apresentação de <b>PROMOTOR(A) JR</b>');
    expect(texto).toContain('função <b>PROMOTOR(A) JR</b>');
  });

  it('usa o cargo escolhido quando informado', () => {
    const t = montarCarta({ template, funcionario, empresa, loja: 'X', cargo: 'repositor(a)' });
    expect(t).toContain('Apresentação de <b>REPOSITOR(A)</b>');
  });

  it('remove placeholders sem valor', () => {
    expect(texto).not.toMatch(/\{\{|\[extra\]/);
  });
});

describe('cdcDoPromotor', () => {
  it('acha o CDC em chaves alternativas', () => {
    expect(cdcDoPromotor({ dados_extras: { 'Centro de Custo': 'UNILEVER' } })).toBe('UNILEVER');
    expect(cdcDoPromotor({})).toBe('');
  });
});

describe('roleFromSession com supervisor', () => {
  it('reconhece o papel solicitante', () => {
    expect(roleFromSession({ user: { app_metadata: { role: 'solicitante' } } })).toBe('solicitante');
    expect(roleFromSession({ user: { app_metadata: {} } })).toBe('admin');
  });
});
