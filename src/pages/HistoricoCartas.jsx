import { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Eye, Download, MessageSquare, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function HistoricoCartas() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmissor, setFilterEmissor] = useState('todos');
  const [selectedIds, setSelectedIds] = useState([]);

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

  useEffect(() => {
    // eslint-disable-next-line
    fetchHistorico();
  }, []);

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

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`Tem certeza de que deseja apagar do histórico as ${selectedIds.length} cartas selecionadas? Esta ação é permanente.`)) {
      return;
    }

    toast.loading(`Excluindo ${selectedIds.length} cartas...`, { id: 'batch-del' });

    try {
      const { error } = await supabase
        .from('cartas_geradas')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      
      toast.dismiss('batch-del');
      toast.success(`${selectedIds.length} cartas excluídas com sucesso!`);
      
      setCartas(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      toast.dismiss('batch-del');
      toast.error('Erro ao deletar documentos em lote.');
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

  const handleShareWhatsApp = async (carta) => {
    try {
      toast.loading('Preparando arquivo para envio...', { id: 'share-wa' });
      const base64Data = carta.url_storage;
      const res = await fetch(base64Data);
      const blob = await res.blob();
      const fileName = carta.nome_arquivo.endsWith('.pdf') ? carta.nome_arquivo : `${carta.nome_arquivo}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        toast.dismiss('share-wa');
        await navigator.share({
          files: [file],
          title: fileName,
          text: `Olá, segue o documento de ${carta.nome_funcionario}`
        });
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        toast.dismiss('share-wa');
        toast.success('Arquivo baixado! O WhatsApp Web será aberto para você anexar o PDF.', { duration: 5000 });
        
        setTimeout(() => {
          const text = `Olá, estou enviando o documento de ${carta.nome_funcionario} em anexo.`;
          const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
          window.open(whatsappUrl, '_blank');
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      toast.dismiss('share-wa');
      toast.error('Erro ao compartilhar arquivo pelo WhatsApp.');
    }
  };

  const handleBatchWhatsApp = async () => {
    if (selectedIds.length === 0) return;
    
    toast.loading(`Preparando ${selectedIds.length} arquivos para envio...`, { id: 'batch-wa' });
    
    try {
      const filesToShare = [];
      
      for (const id of selectedIds) {
        const carta = cartas.find(c => c.id === id);
        if (carta) {
          const res = await fetch(carta.url_storage);
          const blob = await res.blob();
          const fileName = carta.nome_arquivo.endsWith('.pdf') ? carta.nome_arquivo : `${carta.nome_arquivo}.pdf`;
          filesToShare.push(new File([blob], fileName, { type: 'application/pdf' }));
        }
      }

      if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        toast.dismiss('batch-wa');
        await navigator.share({
          files: filesToShare,
          title: 'Cartas em Lote',
          text: `Olá, seguem os documentos em anexo.`
        });
        setSelectedIds([]); // limpa seleção
      } else {
        // Fallback for browsers that don't support native sharing
        for (const file of filesToShare) {
          const blobUrl = URL.createObjectURL(file);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          await new Promise(r => setTimeout(r, 400));
        }
        
        toast.dismiss('batch-wa');
        toast.success('Arquivos baixados! O WhatsApp Web será aberto para você anexar todos de uma vez.', { duration: 5000 });
        
        setTimeout(() => {
          const text = `Olá, seguem os documentos em anexo.`;
          const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
          window.open(whatsappUrl, '_blank');
          setSelectedIds([]);
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      toast.dismiss('batch-wa');
      if (e.name !== 'AbortError') {
        toast.error('Erro ao compartilhar arquivos em lote.');
      }
    }
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
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-grow w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por funcionário ou nome de arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white transition-all"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={filterEmissor}
            onChange={(e) => setFilterEmissor(e.target.value)}
            className="block w-full md:w-48 rounded-lg border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white"
          >
            <option value="todos">Todos Emissores</option>
            <option value="admin">Administrador (Painel)</option>
            <option value="supervisor">Supervisor (Portal)</option>
          </select>
        </div>
      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
          <span className="text-sm font-bold text-indigo-800">
            {selectedIds.length} carta{selectedIds.length > 1 ? 's' : ''} selecionada{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20ba56] text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Enviar em Lote
            </button>
            <button
              onClick={handleBatchDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-rose-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Excluir em Lote
            </button>
          </div>
        </div>
      )}

      {/* Grid de Cartas */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredCartas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-xl mx-auto space-y-3">
          <FileText className="w-12 h-12 text-slate-350 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Nenhum registro encontrado</h2>
          <p className="text-xs text-slate-400">
            Nenhuma carta de apresentação foi gerada ainda ou nenhuma corresponde aos filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                      checked={filteredCartas.length > 0 && selectedIds.length === filteredCartas.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredCartas.map(c => c.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          checked={selectedIds.includes(carta.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, carta.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== carta.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-650 font-bold shrink-0">
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
                            onClick={() => handleShareWhatsApp(carta)}
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

      <div className="flex items-center gap-2 text-xs text-slate-400 italic bg-slate-50 p-4 rounded-lg border border-slate-200/50 max-w-2xl">
        <Info className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>O Histórico salva com segurança os documentos gerados pelo time. O gestor pode acompanhar quem emitiu e apagar quando necessário.</span>
      </div>
    </div>
  );
}
