import { formatCpf, formatExcelDate } from './formatters';
import { cargoParaCarta } from './cargos';

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** CDC (cliente) do promotor, procurando nas chaves usadas pela planilha. */
export function cdcDoPromotor(funcionario) {
  const de = funcionario?.dados_extras || {};
  const direto = de['NC FUNCIONARIO'] || de.NC || de.Cdc || de.CDC || de.cdc || de['Cdc Superior'];
  if (direto) return String(direto);
  const chave = Object.keys(de).find((k) => {
    const up = k.toUpperCase();
    return up.includes('CDC') || up === 'NC' || up.startsWith('NC ') || up.includes('CENTRO DE CUSTO');
  });
  return chave ? String(de[chave]) : '';
}

/**
 * Valores de cada placeholder para um promotor, na mesma regra de Gerar documentos.
 * Chaves são comparadas sem diferenciar maiúsculas na substituição.
 */
export function valoresDaCarta({ funcionario, empresa, loja, cargo, data = new Date() }) {
  const de = funcionario?.dados_extras || {};
  const nome = String(funcionario?.nome || '').toUpperCase();
  const hoje = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const padrao = {
    nome, funcionario_nome: nome, promotor: nome, funcionario: nome,
    cpf: formatCpf(de.CPF),
    rg: String(de.RG ?? de.rg ?? ''),
    cdc: cdcDoPromotor(funcionario),
    cargo: cargoParaCarta(cargo, funcionario),
    empresa: empresa?.nome || '',
    loja: String(loja || ''),
    data: hoje, data_emissao: hoje, 'data de emissão': hoje, data_atual: hoje,
  };
  const ocupadas = new Set(Object.keys(padrao));

  // Colunas extras da planilha entram, mas não sobrescrevem os campos padrão
  // (ex.: a coluna "Cargo" do cadastro não pode vencer o cargo escolhido)
  const v = {};
  for (const [k, val] of Object.entries(de)) {
    const f = formatExcelDate(val, k) ?? '';
    if (!ocupadas.has(k.toLowerCase())) v[k] = f;
    v[`funcionario_${k.toLowerCase()}`] = f;
  }
  Object.assign(v, padrao);
  return v;
}

// Mesma regra de Gerar documentos (inclui "cargo", que contém "rg")
const EM_NEGRITO = ['nome', 'cpf', 'rg', 'funcionario'];

/**
 * Preenche o texto do template ({{campo}} ou [campo]) e remove o que sobrar.
 * Valores em maiúsculas; nome, CPF, RG e cargo em negrito, como nas cartas emitidas hoje.
 */
export function montarCarta({ template, funcionario, empresa, loja, cargo, data }) {
  let texto = String(template?.conteudo || '');
  const valores = valoresDaCarta({ funcionario, empresa, loja, cargo, data });

  // Com valor primeiro e chaves mais longas primeiro (como em Gerar documentos)
  const chaves = Object.keys(valores).sort((a, b) => {
    const va = valores[a] ? 1 : 0;
    const vb = valores[b] ? 1 : 0;
    return va !== vb ? vb - va : b.length - a.length;
  });

  for (const chave of chaves) {
    let valor = String(valores[chave] || '').toUpperCase().trim();
    if (valor && EM_NEGRITO.some((p) => chave.toLowerCase().includes(p))) {
      valor = `<b>${valor}</b>`;
    }
    const e = escapar(chave);
    texto = texto
      .replace(new RegExp(`\\{\\{\\s*${e}\\s*\\}\\}`, 'gi'), valor)
      .replace(new RegExp(`\\[${e}\\]`, 'gi'), valor);
  }

  return texto.replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, '');
}
