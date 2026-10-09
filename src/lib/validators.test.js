import { describe, it, expect } from 'vitest';
import {
  cpfSchema,
  cnpjSchema,
  emailSchema,
  phoneSchema,
  funcionarioSchema,
  cartaApresentacaoSchema,
  cartaFormSchema,
  validateData,
  validateFormData,
} from './validators.js';

const ok = (schema, value) => expect(schema.safeParse(value).success).toBe(true);
const fails = (schema, value) => expect(schema.safeParse(value).success).toBe(false);

describe('CPF', () => {
  it('aceita com máscara', () => ok(cpfSchema, '123.456.789-10'));
  it('aceita sem máscara', () => ok(cpfSchema, '12345678910'));
  it('rejeita formato incompleto', () => fails(cpfSchema, '123.456.789'));
  it('aceita vazio', () => ok(cpfSchema, ''));
});

describe('CNPJ', () => {
  it('aceita com máscara', () => ok(cnpjSchema, '11.222.333/0001-81'));
  it('aceita sem máscara', () => ok(cnpjSchema, '11222333000181'));
  it('rejeita formato incompleto', () => fails(cnpjSchema, '11.222.333'));
});

describe('E-mail', () => {
  it('aceita e-mail válido', () => ok(emailSchema, 'test@example.com'));
  it('rejeita e-mail inválido', () => fails(emailSchema, 'invalid-email'));
  it('aceita vazio', () => ok(emailSchema, ''));
});

describe('Telefone', () => {
  it('aceita com máscara', () => ok(phoneSchema, '(11) 99999-8888'));
  it('aceita só números', () => ok(phoneSchema, '11999998888'));
  it('rejeita letras', () => fails(phoneSchema, '11 abcde-8888'));
});

describe('Funcionário', () => {
  it('aceita cadastro válido', () =>
    ok(funcionarioSchema, { nome: 'João Silva', email: 'joao@example.com', cpf: '123.456.789-10' }));
  it('rejeita nome curto demais', () => fails(funcionarioSchema, { nome: 'A' }));
  it('rejeita nome longo demais', () => fails(funcionarioSchema, { nome: 'A'.repeat(300) }));
});

describe('Carta de apresentação', () => {
  it('aceita carta válida', () =>
    ok(cartaApresentacaoSchema, { titulo: 'Minha Carta', conteudo: 'Este é um conteúdo válido para a carta' }));
  it('rejeita título curto', () => fails(cartaApresentacaoSchema, { titulo: 'AB', conteudo: 'Conteúdo válido' }));
  it('aceita status conhecido', () =>
    ok(cartaApresentacaoSchema, { titulo: 'Carta de Teste', conteudo: 'Conteúdo da carta', status: 'publicado' }));
  it('rejeita status desconhecido', () =>
    fails(cartaApresentacaoSchema, { titulo: 'Carta de Teste', conteudo: 'Conteúdo da carta', status: 'invalido' }));
});

describe('Formulário de carta', () => {
  it('aceita dados válidos', () => ok(cartaFormSchema, { titulo: 'Formulário de Carta', conteudo: 'Conteúdo válido do formulário' }));
  it('aplica status padrão rascunho', () => {
    const result = cartaFormSchema.safeParse({ titulo: 'Teste', conteudo: 'Conteúdo da carta' });
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('rascunho');
  });
});

describe('validateData', () => {
  it('retorna sucesso para dados válidos', () => {
    expect(validateData({ titulo: 'Teste', conteudo: 'Conteúdo válido' }, cartaFormSchema).success).toBe(true);
  });
  it('retorna erros para dados inválidos', () => {
    const result = validateData({ titulo: 'A' }, cartaFormSchema);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateFormData', () => {
  it('retorna objeto vazio para dados válidos', () => {
    expect(validateFormData({ titulo: 'Teste', conteudo: 'Conteúdo válido' }, cartaFormSchema)).toEqual({});
  });
  it('retorna mapa de erros para dados inválidos', () => {
    expect(Object.keys(validateFormData({ titulo: 'A' }, cartaFormSchema)).length).toBeGreaterThan(0);
  });
});
