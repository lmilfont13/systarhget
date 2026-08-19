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

/**
 * Testes para validadores usando Zod
 * Estes são testes básicos que podem ser expandidos com vitest/jest
 */

const runTests = () => {
  console.log('=== INICIANDO TESTES DE VALIDADORES ===\n');

  let passed = 0;
  let failed = 0;

  const test = (name, fn) => {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(`  Erro: ${error.message}`);
      failed++;
    }
  };

  // Testes para CPF
  test('CPF válido com máscara', () => {
    const result = cpfSchema.safeParse('123.456.789-10');
    if (!result.success) throw new Error('CPF válido foi rejeitado');
  });

  test('CPF válido sem máscara', () => {
    const result = cpfSchema.safeParse('12345678910');
    if (!result.success) throw new Error('CPF válido foi rejeitado');
  });

  test('CPF inválido com formato errado', () => {
    const result = cpfSchema.safeParse('123.456.789');
    if (result.success) throw new Error('CPF inválido foi aceito');
  });

  test('CPF vazio é permitido', () => {
    const result = cpfSchema.safeParse('');
    if (!result.success) throw new Error('CPF vazio foi rejeitado');
  });

  // Testes para CNPJ
  test('CNPJ válido com máscara', () => {
    const result = cnpjSchema.safeParse('11.222.333/0001-81');
    if (!result.success) throw new Error('CNPJ válido foi rejeitado');
  });

  test('CNPJ válido sem máscara', () => {
    const result = cnpjSchema.safeParse('11222333000181');
    if (!result.success) throw new Error('CNPJ válido foi rejeitado');
  });

  test('CNPJ inválido com formato errado', () => {
    const result = cnpjSchema.safeParse('11.222.333');
    if (result.success) throw new Error('CNPJ inválido foi aceito');
  });

  // Testes para Email
  test('Email válido', () => {
    const result = emailSchema.safeParse('test@example.com');
    if (!result.success) throw new Error('Email válido foi rejeitado');
  });

  test('Email inválido', () => {
    const result = emailSchema.safeParse('invalid-email');
    if (result.success) throw new Error('Email inválido foi aceito');
  });

  test('Email vazio é permitido', () => {
    const result = emailSchema.safeParse('');
    if (!result.success) throw new Error('Email vazio foi rejeitado');
  });

  // Testes para Telefone
  test('Telefone válido', () => {
    const result = phoneSchema.safeParse('(11) 99999-8888');
    if (!result.success) throw new Error('Telefone válido foi rejeitado');
  });

  test('Telefone com apenas números', () => {
    const result = phoneSchema.safeParse('11999998888');
    if (!result.success) throw new Error('Telefone válido foi rejeitado');
  });

  // Testes para Funcionário
  test('Funcionário válido', () => {
    const data = {
      nome: 'João Silva',
      email: 'joao@example.com',
      cpf: '123.456.789-10',
    };
    const result = funcionarioSchema.safeParse(data);
    if (!result.success) throw new Error('Funcionário válido foi rejeitado');
  });

  test('Funcionário sem nome é rejeitado', () => {
    const data = {
      nome: 'A', // Muito curto
    };
    const result = funcionarioSchema.safeParse(data);
    if (result.success) throw new Error('Funcionário inválido foi aceito');
  });

  test('Funcionário com nome muito longo é rejeitado', () => {
    const data = {
      nome: 'A'.repeat(300), // Muito longo
    };
    const result = funcionarioSchema.safeParse(data);
    if (result.success) throw new Error('Funcionário inválido foi aceito');
  });

  // Testes para Carta de Apresentação
  test('Carta de Apresentação válida', () => {
    const data = {
      titulo: 'Minha Carta',
      conteudo: 'Este é um conteúdo válido para a carta',
    };
    const result = cartaApresentacaoSchema.safeParse(data);
    if (!result.success) throw new Error('Carta válida foi rejeitada');
  });

  test('Carta sem título é rejeitada', () => {
    const data = {
      titulo: 'AB', // Muito curto
      conteudo: 'Conteúdo válido',
    };
    const result = cartaApresentacaoSchema.safeParse(data);
    if (result.success) throw new Error('Carta inválida foi aceita');
  });

  test('Carta com status válido', () => {
    const data = {
      titulo: 'Carta de Teste',
      conteudo: 'Conteúdo da carta',
      status: 'publicado',
    };
    const result = cartaApresentacaoSchema.safeParse(data);
    if (!result.success) throw new Error('Carta com status válido foi rejeitada');
  });

  test('Carta com status inválido é rejeitada', () => {
    const data = {
      titulo: 'Carta de Teste',
      conteudo: 'Conteúdo da carta',
      status: 'invalido',
    };
    const result = cartaApresentacaoSchema.safeParse(data);
    if (result.success) throw new Error('Carta com status inválido foi aceita');
  });

  // Testes para CartaForm
  test('CartaForm com dados válidos', () => {
    const data = {
      titulo: 'Formulário de Carta',
      conteudo: 'Conteúdo válido do formulário',
    };
    const result = cartaFormSchema.safeParse(data);
    if (!result.success) throw new Error('CartaForm válido foi rejeitado');
  });

  test('CartaForm com status padrão', () => {
    const data = {
      titulo: 'Teste',
      conteudo: 'Conteúdo da carta',
    };
    const result = cartaFormSchema.safeParse(data);
    if (!result.success || result.data.status !== 'rascunho') {
      throw new Error('CartaForm não aplicou status padrão');
    }
  });

  // Testes para validateData helper
  test('validateData retorna sucesso para dados válidos', () => {
    const data = {
      titulo: 'Teste',
      conteudo: 'Conteúdo válido',
    };
    const result = validateData(data, cartaFormSchema);
    if (!result.success) throw new Error('validateData falhou para dados válidos');
  });

  test('validateData retorna erro para dados inválidos', () => {
    const data = {
      titulo: 'A', // Muito curto
    };
    const result = validateData(data, cartaFormSchema);
    if (result.success) throw new Error('validateData aceita dados inválidos');
    if (result.errors.length === 0) throw new Error('validateData não retornou erros');
  });

  // Testes para validateFormData helper
  test('validateFormData retorna objeto vazio para dados válidos', () => {
    const data = {
      titulo: 'Teste',
      conteudo: 'Conteúdo válido',
    };
    const errors = validateFormData(data, cartaFormSchema);
    if (Object.keys(errors).length > 0) {
      throw new Error('validateFormData retornou erros para dados válidos');
    }
  });

  test('validateFormData retorna mapa de erros para dados inválidos', () => {
    const data = {
      titulo: 'A',
    };
    const errors = validateFormData(data, cartaFormSchema);
    if (Object.keys(errors).length === 0) {
      throw new Error('validateFormData não retornou erros para dados inválidos');
    }
  });

  // Resumo dos testes
  console.log('\n=== RESUMO DOS TESTES ===');
  console.log(`✓ Passou: ${passed}`);
  console.log(`✗ Falhou: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n✓ TODOS OS TESTES PASSARAM!');
    return true;
  } else {
    console.log(`\n✗ ${failed} teste(s) falharam.`);
    return false;
  }
};

// Executar testes se for módulo principal
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}

export default runTests;
