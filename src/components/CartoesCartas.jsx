import { Edit2, Trash2, Eye, Archive, Download, Share2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente para exibir lista de cartas de apresentação
 * Com ações de editar, deletar, visualizar, arquivar, etc
 */
export default function CartoesCartas({
  cartas = [],
  loading = false,
  onEdit,
  onDelete,
  onView,
  onArchive,
  onDownload,
  onShare,
  funcionarios = [],
  empresas = [],
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cartas || cartas.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma carta encontrada</h3>
        <p className="text-gray-600">Crie uma nova carta de apresentação para começar</p>
      </div>
    );
  }

  const getFuncionarioNome = (id) => {
    if (!id) return '-';
    const func = funcionarios.find(f => f.id === id);
    return func?.nome || '-';
  };

  const getEmpresaNome = (id) => {
    if (!id) return '-';
    const emp = empresas.find(e => e.id === id);
    return emp?.nome || '-';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'publicado':
        return 'bg-green-100 text-green-800';
      case 'rascunho':
        return 'bg-yellow-100 text-yellow-800';
      case 'arquivado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'publicado':
        return 'Publicado';
      case 'rascunho':
        return 'Rascunho';
      case 'arquivado':
        return 'Arquivado';
      default:
        return status;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cartas.map(carta => (
        <div
          key={carta.id}
          className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition p-4 flex flex-col h-full"
        >
          {/* Header da Carta */}
          <div className="flex-1">
            {/* Título */}
            <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
              {carta.titulo || 'Sem título'}
            </h3>

            {/* Status Badge */}
            <div className="mb-3">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(carta.status)}`}>
                {getStatusLabel(carta.status)}
              </span>
            </div>

            {/* Descrição */}
            {carta.descricao && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                {carta.descricao}
              </p>
            )}

            {/* Detalhes */}
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {carta.funcionario_id && (
                <p>
                  <span className="font-medium">Funcionário:</span> {getFuncionarioNome(carta.funcionario_id)}
                </p>
              )}
              {carta.empresa_id && (
                <p>
                  <span className="font-medium">Empresa:</span> {getEmpresaNome(carta.empresa_id)}
                </p>
              )}
              {carta.data_assinatura && (
                <p>
                  <span className="font-medium">Assinado em:</span> {new Date(carta.data_assinatura).toLocaleDateString('pt-BR')}
                </p>
              )}
              {carta.assinado_por && (
                <p>
                  <span className="font-medium">Por:</span> {carta.assinado_por}
                </p>
              )}
            </div>

            {/* Data de criação */}
            {carta.criado_em && (
              <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                Criado em: {new Date(carta.criado_em).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          {/* Footer com Ações */}
          <div className="border-t border-gray-100 mt-4 pt-4 flex gap-2 flex-wrap">
            {/* Botão Visualizar */}
            <button
              onClick={() => {
                if (onView) onView(carta.id);
              }}
              className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-sm font-medium"
              title="Visualizar carta"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Ver</span>
            </button>

            {/* Botão Editar */}
            <button
              onClick={() => {
                if (onEdit) onEdit(carta.id);
              }}
              className="flex items-center gap-1 px-3 py-2 bg-amber-100 text-amber-600 rounded hover:bg-amber-200 transition text-sm font-medium"
              title="Editar carta"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </button>

            {/* Botão Download */}
            {onDownload && (
              <button
                onClick={() => onDownload(carta.id)}
                className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-600 rounded hover:bg-green-200 transition text-sm font-medium"
                title="Baixar carta"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Baixar</span>
              </button>
            )}

            {/* Botão Compartilhar */}
            {onShare && (
              <button
                onClick={() => onShare(carta.id)}
                className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition text-sm font-medium"
                title="Compartilhar carta"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
            )}

            {/* Botão Arquivar */}
            {onArchive && carta.status !== 'arquivado' && (
              <button
                onClick={() => onArchive(carta.id)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition text-sm font-medium"
                title="Arquivar carta"
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Arquivar</span>
              </button>
            )}

            {/* Botão Deletar */}
            <button
              onClick={() => {
                if (window.confirm('Tem certeza que deseja deletar esta carta?')) {
                  if (onDelete) onDelete(carta.id);
                }
              }}
              className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm font-medium"
              title="Deletar carta"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Deletar</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
