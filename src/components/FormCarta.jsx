import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { validateFormData, cartaFormSchema } from '../lib/validators';
import { sanitizeFormData } from '../lib/sanitizer';

/**
 * Componente para editar/criar uma Carta de Apresentação
 * Com validação Zod e sanitização de dados
 */
export default function FormCarta({
  carta = null,
  templates = [],
  funcionarios = [],
  empresas = [],
  onSave,
  onCancel,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    conteudo: '',
    template_id: '',
    funcionario_id: '',
    empresa_id: '',
    status: 'rascunho',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Popular formulário com dados da carta existente
  useEffect(() => {
    if (carta) {
      // eslint-disable-next-line
      setFormData({
        titulo: carta.titulo || '',
        descricao: carta.descricao || '',
        conteudo: carta.conteudo || '',
        template_id: carta.template_id || '',
        funcionario_id: carta.funcionario_id || '',
        empresa_id: carta.empresa_id || '',
        status: carta.status || 'rascunho',
      });
    }
  }, [carta]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Sanitiza o valor antes de armazenar
    const sanitized = sanitizeFormData({ [name]: value })[name];

    setFormData(prev => ({
      ...prev,
      [name]: sanitized,
    }));

    // Remove erro do campo quando usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Valida os dados usando Zod
    const validationErrors = validateFormData(formData, cartaFormSchema);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      setIsSubmitting(true);

      // Sanitiza os dados antes de enviar
      const sanitized = sanitizeFormData(formData);

      // Chama a função de salvamento
      await onSave(sanitized);

      // Limpa erros
      setErrors({});
      toast.success('Carta salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar carta:', error);
      toast.error('Erro ao salvar carta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Título */}
      <div>
        <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
          Título
        </label>
        <input
          type="text"
          id="titulo"
          name="titulo"
          value={formData.titulo}
          onChange={handleChange}
          placeholder="Título da carta de apresentação"
          maxLength="255"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
            errors.titulo ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
          disabled={isSubmitting || loading}
        />
        {errors.titulo && (
          <div className="mt-1 flex items-center text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.titulo}
          </div>
        )}
      </div>

      {/* Descrição */}
      <div>
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
          Descrição (opcional)
        </label>
        <textarea
          id="descricao"
          name="descricao"
          value={formData.descricao}
          onChange={handleChange}
          placeholder="Descrição breve da carta"
          maxLength="1000"
          rows="3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
          disabled={isSubmitting || loading}
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.descricao.length}/1000
        </p>
      </div>

      {/* Conteúdo */}
      <div>
        <label htmlFor="conteudo" className="block text-sm font-medium text-gray-700 mb-2">
          Conteúdo
        </label>
        <textarea
          id="conteudo"
          name="conteudo"
          value={formData.conteudo}
          onChange={handleChange}
          placeholder="Conteúdo da carta de apresentação"
          rows="8"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none font-mono text-sm ${
            errors.conteudo ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
          disabled={isSubmitting || loading}
        />
        {errors.conteudo && (
          <div className="mt-1 flex items-center text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.conteudo}
          </div>
        )}
      </div>

      {/* Template */}
      <div>
        <label htmlFor="template_id" className="block text-sm font-medium text-gray-700 mb-2">
          Template (opcional)
        </label>
        <select
          id="template_id"
          name="template_id"
          value={formData.template_id}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          disabled={isSubmitting || loading}
        >
          <option value="">Selecione um template</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Funcionário */}
      <div>
        <label htmlFor="funcionario_id" className="block text-sm font-medium text-gray-700 mb-2">
          Funcionário (opcional)
        </label>
        <select
          id="funcionario_id"
          name="funcionario_id"
          value={formData.funcionario_id}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          disabled={isSubmitting || loading}
        >
          <option value="">Selecione um funcionário</option>
          {funcionarios.map(func => (
            <option key={func.id} value={func.id}>
              {func.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Empresa */}
      <div>
        <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700 mb-2">
          Empresa (opcional)
        </label>
        <select
          id="empresa_id"
          name="empresa_id"
          value={formData.empresa_id}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          disabled={isSubmitting || loading}
        >
          <option value="">Selecione uma empresa</option>
          {empresas.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          disabled={isSubmitting || loading}
        >
          <option value="rascunho">Rascunho</option>
          <option value="publicado">Publicado</option>
          <option value="arquivado">Arquivado</option>
        </select>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {isSubmitting || loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting || loading}
          className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
