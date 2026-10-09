import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dataUrlToBlob, baixarArquivo, codigoVerificacao } from '../lib/cartas';
import { BrandMark, Wordmark } from '../components/ui';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Selo circular de verificação, no mesmo desenho do carimbo da marca. */
function SeloVerificado() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className="h-20 w-20 shrink-0 text-brand-600 sm:h-24 sm:w-24">
      <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="48" cy="48" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3.4" />
      <path d="M33 49.5l10 10 20-22" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dado({ rotulo, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

export default function VisualizadorCarta() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carta, setCarta] = useState(null);
  const [verificacao, setVerificacao] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const fetchCarta = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!UUID.test(String(id))) throw new Error('Este link de carta não é válido. Confira se ele foi copiado por inteiro.');

      // Link público: as funções devolvem só a carta deste id, sem abrir a tabela
      const [cartaRes, verifRes] = await Promise.all([
        supabase.rpc('carta_publica', { p_id: id }).maybeSingle(),
        supabase.rpc('verificar_carta', { p_id: id }).maybeSingle(),
      ]);

      let { data, error: dbError } = cartaRes;
      // Compatibilidade com bancos onde a migração de segurança ainda não foi aplicada
      if (dbError && (dbError.code === 'PGRST202' || dbError.code === '42883')) {
        ({ data, error: dbError } = await supabase.from('cartas_geradas').select('*').eq('id', id).maybeSingle());
      }

      if (dbError) throw dbError;
      if (!data) throw new Error('Nenhuma carta com este código consta no registro. O documento pode ter sido excluído ou o link está incorreto.');
      if (!data.url_storage) throw new Error('O arquivo desta carta não foi encontrado no registro.');

      setCarta(data);
      // A função de verificação traz o nome da empresa; sem ela, usa os dados da própria carta
      setVerificacao(verifRes.error ? null : verifRes.data);
      setPdfUrl(URL.createObjectURL(dataUrlToBlob(data.url_storage)));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao carregar o documento.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega a carta ao abrir o link
    fetchCarta();
  }, [fetchCarta]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const handleDownload = () => {
    if (pdfUrl && carta) baixarArquivo(pdfUrl, `${carta.nome_arquivo || 'CARTA'}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper p-4" role="status">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
          <p className="text-sm text-slate-500">Conferindo o documento no registro…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
        <div className="panel w-full max-w-md space-y-4 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-600" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">Documento não verificado</h1>
          <p className="text-sm leading-relaxed text-slate-600">{error}</p>
          <button onClick={fetchCarta} className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const emitidaEm = new Date(verificacao?.emitida_em || carta.data_geracao || carta.criado_em);
  const codigo = verificacao?.codigo || codigoVerificacao(carta.id);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-7 w-7" />
          <Wordmark className="text-sm text-brand-800" />
          <span className="hidden text-sm text-slate-400 sm:inline">Verificação de documento</span>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Baixar PDF
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center p-4 sm:p-8">
        <div className="flex w-full max-w-4xl flex-1 flex-col gap-4">
          {/* Selo de verificação */}
          <section className="panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6" aria-labelledby="titulo-verificacao">
            <SeloVerificado />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-brand-700">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Documento autêntico
              </p>
              <h1 id="titulo-verificacao" className="mt-1 truncate text-xl font-semibold tracking-tight text-ink">
                {verificacao?.nome_funcionario || carta.nome_funcionario}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Esta carta consta no registro oficial do sistema. Confira se os dados abaixo batem com o documento apresentado.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Dado rotulo="Emitida em">{dataHora.format(emitidaEm)}</Dado>
                {verificacao?.empresa && <Dado rotulo="Empresa">{verificacao.empresa}</Dado>}
                <Dado rotulo="Código de verificação">
                  <span className="tracking-[0.15em] tabular-nums">{codigo}</span>
                </Dado>
              </dl>
            </div>
          </section>

          {/* Documento */}
          <section className="panel flex min-h-[480px] flex-1 flex-col overflow-hidden" aria-label="Documento">
            {isMobile ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="max-w-xs text-sm text-slate-600">
                  No celular, o PDF abre melhor no aplicativo de documentos.
                </p>
                <button
                  onClick={handleDownload}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Abrir o PDF
                </button>
              </div>
            ) : (
              <iframe src={pdfUrl} className="w-full flex-grow border-0" title={carta.nome_arquivo || 'Carta'} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
