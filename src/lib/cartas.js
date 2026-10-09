import { toast } from 'sonner';
import { supabase } from './supabase';

/**
 * Funções compartilhadas pela emissão de cartas (Gerar documentos e Portal do Promotor)
 * e pelo Histórico. Antes ficavam copiadas em cada tela.
 */

/** Limpa o rodapé da empresa, que às vezes vem salvo como JSON ou entre aspas. */
export function cleanFooterText(text) {
  if (!text) return '';
  let clean = String(text).trim();

  if (clean.startsWith('{') || clean.startsWith('[')) {
    try {
      const obj = JSON.parse(clean);
      if (obj && typeof obj === 'object') {
        return obj.endereco || obj.texto || Object.values(obj)[0] || clean;
      }
    } catch {
      // não é JSON válido: segue com a limpeza de texto
    }
  }

  if (clean.includes('", "') || clean.includes('","')) {
    const match = clean.match(/^"([^"]+)"/);
    if (match && match[1]) return match[1];
  }

  clean = clean.replace(/^"+|"+$/g, '').trim();
  return clean;
}

export const generateUniqueId = () => Date.now().toString();

/** Converte um Blob em data URL (base64). */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Converte um PDF salvo em base64 (com ou sem prefixo data:) de volta para Blob. */
export function dataUrlToBlob(dataUrl, type = 'application/pdf') {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * Carrega uma imagem (logo, carimbo, assinatura) e devolve como data URL.
 * Arquivos do Storage do Supabase são baixados pela API, que respeita o login.
 */
export async function assetToDataUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const marker = '/storage/v1/object/public/';
    if (url.includes('.supabase.co') && url.includes(marker)) {
      const [bucket, ...rest] = url.split(marker)[1].split('/');
      const { data, error } = await supabase.storage.from(bucket).download(decodeURIComponent(rest.join('/')));
      if (!error && data) return blobToDataUrl(data);
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return blobToDataUrl(await res.blob());
  } catch (e) {
    console.error('Falha ao carregar imagem:', url, e);
    return null;
  }
}

/**
 * Registra a carta no histórico. Devolve { id, error } em vez de engolir a falha,
 * para a tela avisar quando o documento foi gerado mas não ficou salvo.
 */
export async function registrarCarta({ funcionarioId, templateId, empresaId, nomeFuncionario, nomeArquivo, pdfBlob, solicitacaoId }) {
  try {
    const urlStorage = await blobToDataUrl(pdfBlob);
    const { data, error } = await supabase
      .from('cartas_geradas')
      .insert({
        funcionario_id: funcionarioId || null,
        template_id: templateId || null,
        empresa_id: empresaId || null,
        nome_funcionario: nomeFuncionario,
        nome_arquivo: nomeArquivo,
        url_storage: urlStorage,
        data_geracao: new Date().toISOString(),
        ...(solicitacaoId ? { solicitacao_id: solicitacaoId } : {}),
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, error: null };
  } catch (error) {
    console.error('Erro ao salvar no histórico:', error);
    return { id: null, error };
  }
}

/** Aviso padrão quando o PDF saiu mas o registro no histórico falhou. */
export function avisarFalhaHistorico() {
  toast.warning('O PDF foi gerado, mas não ficou registrado no histórico.', {
    description: 'Verifique sua conexão. Se persistir, peça ao administrador para revisar as permissões da sua conta.',
    duration: 8000,
  });
}

/** Código curto de conferência: os 8 primeiros caracteres do identificador da carta. */
export const codigoVerificacao = (id) => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();

export const cartaShareUrl = (id) => `${window.location.origin}/carta/${id}`;

export async function copiarLinkCarta(id) {
  if (!id) return;
  try {
    await navigator.clipboard.writeText(cartaShareUrl(id));
    toast.success('Link da carta copiado para a área de transferência!');
  } catch {
    toast.error('Não foi possível copiar. Copie o link manualmente.');
  }
}

/** Dispara o download de um Blob (ou de uma URL de blob já criada). */
export function baixarArquivo(blobOrUrl, fileName) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Compartilha um ou mais PDFs: usa o compartilhamento nativo (celular) quando existe;
 * senão baixa os arquivos e abre o WhatsApp Web com uma mensagem.
 */
export async function compartilharPdfs(files, { titulo, texto, whatsapp }) {
  const toastId = 'share-wa';
  try {
    if (navigator.canShare && navigator.canShare({ files })) {
      toast.dismiss(toastId);
      await navigator.share({ files, title: titulo, text: texto });
      return true;
    }
    // Navegadores bloqueiam vários downloads simultâneos: baixa um de cada vez
    for (const [i, file] of files.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 400));
      baixarArquivo(file, file.name);
    }
    toast.dismiss(toastId);
    toast.success(
      files.length > 1
        ? `${files.length} arquivos baixados! O WhatsApp Web será aberto para você anexar os PDFs.`
        : 'Arquivo baixado! O WhatsApp Web será aberto para você anexar o PDF.',
      { duration: 5000 },
    );
    setTimeout(() => {
      // Com o número, abre direto a conversa com a pessoa
      const numero = String(whatsapp || '').replace(/\D/g, '');
      const fone = numero ? `&phone=${numero.startsWith('55') ? numero : `55${numero}`}` : '';
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}${fone}`, '_blank');
    }, 1500);
    return true;
  } catch (e) {
    // Usuário fechou a janela de compartilhamento: não é erro
    if (e?.name === 'AbortError') return false;
    console.error(e);
    toast.dismiss(toastId);
    toast.error('Erro ao compartilhar arquivo pelo WhatsApp.');
    return false;
  }
}

/** Compartilha a carta recém-gerada (a partir da URL do blob) pelo WhatsApp. */
export async function compartilharCartaWhatsApp(blobUrl, cartaName) {
  if (!blobUrl) return;
  try {
    toast.loading('Preparando arquivo para envio...', { id: 'share-wa' });
    const blob = await (await fetch(blobUrl)).blob();
    const fileName = `CARTA ${String(cartaName || '').trim().toUpperCase()}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });
    await compartilharPdfs([file], {
      titulo: fileName,
      texto: `Olá, estou enviando o documento de ${cartaName} em anexo.`,
    });
  } catch (e) {
    console.error(e);
    toast.dismiss('share-wa');
    toast.error('Erro ao compartilhar arquivo pelo WhatsApp.');
  }
}
