import { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Eye, Download, MessageSquare, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function HistoricoCartas() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmissor, setFilterEmissor] = useState('todos');

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cartas_geradas')
        .select('*')
        .order('data_geracao', { ascending: false });

      if (error) throw error;
      setCartas(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar o histórico de cartas.');
    } finally {
      setLoading(false);
    }
  };

  const extrairEmissor = (nomeArquivo) => {
    if (!nomeArquivo) return 'Administrador';
    const parts = nomeArquivo.split(' - ');
    if (parts.length > 1) {
      return parts[1].replace('.pdf', '').replace('Supervisor ', 'Supervisor: ');
    }
    return 'Administrador';
  };

  const extrairNomeExatoArquivo = (nomeArquivo) => {
    if (!nomeArquivo) return 'CARTA.pdf';
    return nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`;
  };

  const handleDelete = async (id, nomeFuncionario) => {
    if (!window.confirm(`Tem certeza de que deseja apagar do histórico a carta gerada para ${nomeFuncionario}? Esta ação é permanente.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cartas_geradas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Carta de ${nomeFuncionario} excluída com sucesso!`);
      // Remove localmente da lista
      setCartas(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao deletar o documento.');
    }
  };

  const handleDownload = (base64Data, nomeArquivo) => {
    try {
      if (!base64Data) {
        toast.error('Arquivo corrompido ou inexistente.');
        return;
      }

      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = extrairNomeExatoArquivo(nomeArquivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download iniciado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao efetuar download do PDF.');
    }
  };

  const handleShareWhatsApp = (id, nomeFuncionario) => {
    const shareUrl = `${window.location.origin}/carta/${id}`;
    const text = `Olá, segue a carta de apresentação de *${nomeFuncionario}*: ${shareUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const filteredCartas = cartas.filter(c => {
    const nome = String(c.nome_funcionario || '').toLowerCase();
    const arquivo = String(c.nome_arquivo || '').toLowerCase();
    const busca = searchTerm.toLowerCase();
    const emissor = extrairEmissor(c.nome_arquivo).toLowerCase();

    const matchesSearch = nome.includes(busca) || arquivo.includes(busca);
    
    let matchesEmissor = true;
    if (filterEmissor === 'admin') {
      matchesEmissor = emissor.includes('admin') || !emissor.includes('supervisor');
    } else if (filterEmissor === 'supervisor') {
      matchesEmissor = emissor.includes('supervisor');
    }

    return matchesSearch && matchesEmissor;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Histórico de Cartas Geradas</h1>
        <p className="text-sm text-slate-500 mt-1">Acompanhe quem gerou as cartas de apresentação, datas e faça a gestão dos arquivos salvos.</p>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-grow w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por funcionário ou nome de arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white transition-all"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={filterEmissor}
            onChange={(e) => setFilterEmissor(e.target.value)}
            className="block w-full md:w-48 rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white"
          >
            <option value="todos">Todos Emissores</option>
            <option value="admin">Administrador (Painel)</option>
            <option value="supervisor">Supervisor (Portal)</option>
          </select>
        </div>
      </div>

      {/* Grid de Cartas */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredCartas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
          <FileText className="w-12 h-12 text-slate-350 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Nenhum registro encontrado</h2>
          <p className="text-xs text-slate-400">
            Nenhuma carta de apresentação foi gerada ainda ou nenhuma corresponde aos filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Promotor / Funcionário</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gerado por</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data de Geração</th>
                  <th scope="col" className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredCartas.map((carta) => {
                  const dataGera = new Date(carta.data_geracao || carta.criado_em);
                  const formatData = dataGera.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const formatHora = dataGera.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={carta.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-650 font-bold shrink-0">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{carta.nome_funcionario}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">{extrairNomeExatoArquivo(carta.nome_arquivo)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          extrairEmissor(carta.nome_arquivo).toLowerCase().includes('supervisor')
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-750 border-indigo-200'
                        }`}>
                          {extrairEmissor(carta.nome_arquivo)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        <div>{formatData}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{formatHora}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => window.open(`/carta/${carta.id}`, '_blank')}
                            className="p-2 text-slate-650 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Visualizar Carta"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(carta.id, carta.nome_funcionario)}
                            className="p-2 text-[#25D366] hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Enviar pelo WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(carta.url_storage, carta.nome_arquivo)}
                            className="p-2 text-slate-650 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Baixar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(carta.id, carta.nome_funcionario)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-200/50 max-w-2xl">
        <Info className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>O Histórico salva com segurança os documentos gerados pelo time. O gestor pode acompanhar quem emitiu e apagar quando necessário.</span>
      </div>
    </div>
  );
}
