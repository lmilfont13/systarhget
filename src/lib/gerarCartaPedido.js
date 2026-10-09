import { PDFGenerator } from '../pdf/PDFGenerator';
import { empresaCompleta } from './dados';
import { assetToDataUrl, cleanFooterText } from './cartas';
import { montarCarta } from './montarCarta';

/** Empresa do promotor: a vinculada no cadastro; senão POP/SPAR pelo nome na planilha (como em Gerar documentos). */
export function empresaDoPromotor(funcionario, empresas) {
  const vinculada = empresas.find((e) => String(e.id) === String(funcionario?.empresa_id));
  if (vinculada) return vinculada;
  const nome = String(funcionario?.dados_extras?.Empresa || '').toUpperCase();
  const chave = nome.includes('POP') ? 'POP' : nome.includes('SPAR') ? 'SPAR' : null;
  return chave ? empresas.find((e) => String(e.nome || '').toUpperCase().includes(chave)) || null : null;
}

/** Texto da loja como vai na carta (com endereço, igual à seleção em Gerar documentos). */
export function textoDaLoja(loja) {
  if (!loja) return '';
  return loja.endereco ? `${loja.nome} (${loja.endereco})` : loja.nome;
}

/**
 * Gera o PDF de um item de pedido, com logo, carimbos e rodapé da empresa.
 * Devolve { blob, empresa, nomeArquivo }.
 */
export async function gerarCartaDoItem({ template, funcionario, empresas, loja, cargo }) {
  const empresaBase = empresaDoPromotor(funcionario, empresas);
  // Sem as imagens a carta ainda sai (só sem logo/carimbo); não trava a emissão
  const empresa = empresaBase ? await empresaCompleta(empresaBase).catch(() => empresaBase) : null;
  const conteudo = montarCarta({ template, funcionario, empresa, loja, cargo });

  const [logo, carimbo, carimboResp, assinatura] = await Promise.all([
    assetToDataUrl(empresa?.logo_url),
    assetToDataUrl(empresa?.carimbo_url),
    assetToDataUrl(empresa?.carimbo_funcionario_url),
    assetToDataUrl(empresa?.assinatura_responsavel_url),
  ]);

  const blob = await PDFGenerator.generateFromText(conteudo, {
    logo_url: logo,
    carimbo_url: carimbo,
    carimbo_responsavel_url: carimboResp,
    assinatura_responsavel_url: assinatura,
    footer_text: cleanFooterText(empresa?.rodape),
  });

  const nome = String(funcionario?.nome || '').trim().toUpperCase();
  const nomeArquivo = `CARTA ${nome}${loja ? ` - ${String(loja).toUpperCase()}` : ''}`;
  return { blob, empresa: empresaBase, nomeArquivo };
}
