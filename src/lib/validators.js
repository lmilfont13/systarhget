import { z } from 'zod';

/**
 * Schemas Zod para validação de dados
 * Garante integridade de dados e tipos corretos
 */

// Schema base para CPF
export const cpfSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato XXX.XXX.XXX-XX')
  .or(z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos'))
  .or(z.string().length(0)); // Permite vazio

// Schema base para CNPJ
export const cnpjSchema = z
  .string()
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
  .or(z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos'))
  .or(z.string().length(0)); // Permite vazio

// Schema para email
export const emailSchema = z
  .string()
  .email('Email inválido')
  .or(z.string().length(0)); // Permite vazio

// Schema para telefone
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\(\)+]+$/, 'Telefone inválido')
  .or(z.string().length(0)); // Permite vazio

/**
 * Schema para Funcionário
 */
export const funcionarioSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  email: emailSchema.optional(),
  cpf: cpfSchema.optional(),
  telefone: phoneSchema.optional(),
  dados_extras: z.record(z.any()).optional(),
  criado_em: z.date().optional(),
  atualizado_em: z.date().optional(),
});

// Type: Funcionario = z.infer<typeof funcionarioSchema>

/**
 * Schema para Empresa
 */
export const empresaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  cnpj: cnpjSchema.optional(),
  email: emailSchema.optional(),
  telefone: phoneSchema.optional(),
  endereco: z.string().max(500).optional(),
  cidade: z.string().max(100).optional(),
  estado: z.string().length(2).optional(),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  dados_extras: z.record(z.any()).optional(),
  criado_em: z.date().optional(),
  atualizado_em: z.date().optional(),
});

// Type: Empresa = z.infer<typeof empresaSchema>

/**
 * Schema para Carta de Apresentação
 */
export const cartaApresentacaoSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(255),
  descricao: z.string().max(1000).optional(),
  conteudo: z.string().min(10, 'Conteúdo deve ter no mínimo 10 caracteres'),
  template_id: z.string().uuid().optional(),
  funcionario_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  status: z.enum(['rascunho', 'publicado', 'arquivado']).optional(),
  assinado_por: z.string().max(255).optional(),
  data_assinatura: z.date().optional(),
  criado_em: z.date().optional(),
  atualizado_em: z.date().optional(),
  dados_extras: z.record(z.any()).optional(),
});

// export type CartaApresentacao = z.infer<typeof cartaApresentacaoSchema>;

/**
 * Schema para Form de Carta
 * Validação de entrada de usuário
 */
export const cartaFormSchema = z.object({
  titulo: z.string().min(3, 'Título é obrigatório').max(255),
  descricao: z.string().max(1000).optional().default(''),
  conteudo: z.string().min(10, 'Conteúdo é obrigatório'),
  template_id: z.string().uuid('Template inválido').optional(),
  funcionario_id: z.string().uuid('Funcionário inválido').optional(),
  empresa_id: z.string().uuid('Empresa inválida').optional(),
  status: z.enum(['rascunho', 'publicado', 'arquivado']).optional().default('rascunho'),
});

// export type CartaForm = z.infer<typeof cartaFormSchema>;

/**
 * Schema para Documento/Template
 */
export const templateSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  descricao: z.string().max(1000).optional(),
  conteudo_html: z.string().optional(),
  conteudo_json: z.record(z.any()).optional(),
  tipo: z.enum(['carta', 'documento', 'relatorio']).optional(),
  ativo: z.boolean().optional().default(true),
  criado_em: z.date().optional(),
  atualizado_em: z.date().optional(),
});

// export type Template = z.infer<typeof templateSchema>;

/**
 * Schema para filtros de pesquisa
 */
export const searchFiltersSchema = z.object({
  query: z.string().max(255).optional(),
  status: z.enum(['rascunho', 'publicado', 'arquivado']).optional(),
  funcionario_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  data_inicio: z.date().optional(),
  data_fim: z.date().optional(),
  pagina: z.number().int().positive().optional().default(1),
  limite: z.number().int().min(1).max(100).optional().default(20),
});

// export type SearchFilters = z.infer<typeof searchFiltersSchema>;

/**
 * Schema para configurações de usuário
 */
export const userSettingsSchema = z.object({
  tema: z.enum(['claro', 'escuro']).optional().default('claro'),
  idioma: z.enum(['pt-BR', 'en-US', 'es-ES']).optional().default('pt-BR'),
  notificacoes_email: z.boolean().optional().default(true),
  notificacoes_sms: z.boolean().optional().default(false),
  assinatura_padrao: z.string().max(500).optional(),
  dados_extras: z.record(z.any()).optional(),
});

// export type UserSettings = z.infer<typeof userSettingsSchema>;

/**
 * Função helper para validar dados
 * @param {*} data - Dados a validar
 * @param {ZodSchema} schema - Schema Zod a usar
 * @returns {object} { success: boolean, data: *, errors: [] }
 */
export const validateData = (data, schema) => {
  try {
    const validated = schema.parse(data);
    return {
      success: true,
      data: validated,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    }

    return {
      success: false,
      data: null,
      errors: [{ field: 'unknown', message: error.message, code: 'UNKNOWN_ERROR' }],
    };
  }
};

/**
 * Função para validar formulário e retornar mapa de erros
 * @param {*} data - Dados a validar
 * @param {ZodSchema} schema - Schema Zod a usar
 * @returns {object} Mapa de erros por campo
 */
export const validateFormData = (data, schema) => {
  try {
    schema.parse(data);
    return {};
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMap = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        errorMap[field] = err.message;
      });
      return errorMap;
    }
    return { _form: error.message };
  }
};

export default {
  cpfSchema,
  cnpjSchema,
  emailSchema,
  phoneSchema,
  funcionarioSchema,
  empresaSchema,
  cartaApresentacaoSchema,
  cartaFormSchema,
  templateSchema,
  searchFiltersSchema,
  userSettingsSchema,
  validateData,
  validateFormData,
};
