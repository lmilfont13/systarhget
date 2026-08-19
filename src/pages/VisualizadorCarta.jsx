import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function VisualizadorCarta() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carta, setCarta] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const fetchCarta = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: dbError } = await supabase
        .from('cartas_geradas')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError) throw dbError;
      if (!data) throw new Error('Carta não encontrada.');

      setCarta(data);

      // Converte o base64 do PDF para Blob URL
      if (data.url_storage) {
        const base64Data = data.url_storage.includes(',') 
          ? data.url_storage.split(',')[1] 
          : data.url_storage;
        
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        throw new Error('O arquivo da carta não foi localizado na nuvem.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao carregar o documento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchCarta();
  }, [id]);

  const handleDownload = () => {
    if (!pdfUrl || !carta) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${carta.nome_arquivo || 'CARTA'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Buscando documento oficial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center space-y-4 border border-slate-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Falha ao abrir documento</h2>
          <p className="text-sm text-slate-500 leading-normal">{error}</p>
          <div className="pt-2">
            <button 
              onClick={fetchCarta}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/15"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Detecta se é dispositivo móvel para ajustar exibição do iframe
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5 text-indigo-600 font-bold">
          <FileText className="w-5 h-5" />
          <span className="text-sm tracking-tight">DocFlow Hub - Documentos</span>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          Baixar PDF
        </button>
      </header>

      {/* Main Area */}
      <main className="flex-1 p-4 md:p-8 flex flex-col items-center">
        <div className="max-w-4xl w-full space-y-4 flex flex-col flex-grow">
          {/* Info Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Documento Autêntico
              </span>
              <h1 className="text-base font-bold text-slate-800 mt-1.5 truncate">
                {carta.nome_funcionario}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Emitido em: {new Date(carta.data_geracao || carta.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            <button
              onClick={handleDownload}
              className="sm:w-auto w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold px-5 py-3 rounded-lg transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              Baixar Carta de Apresentação
            </button>
          </div>

          {/* Document Viewer Frame */}
          <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden flex flex-col min-h-[450px]">
            {isMobile ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="max-w-xs space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">Visualização Mobile</h3>
                  <p className="text-xs text-slate-500 leading-normal">
                    Dispositivos móveis podem não renderizar PDFs diretamente em tela. Clique no botão abaixo para baixar e abrir o documento no seu celular.
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-3 rounded-lg transition-all shadow-lg shadow-indigo-600/15"
                >
                  <Download className="w-4 h-4" />
                  Abrir PDF Oficial
                </button>
              </div>
            ) : (
              <iframe
                src={pdfUrl}
                className="w-full flex-grow border-0"
                title={carta.nome_arquivo}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
