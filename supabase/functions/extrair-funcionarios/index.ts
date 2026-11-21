// Lê uma foto (ou PDF) de uma lista de funcionários e devolve as linhas.
//
// Não grava nada: a tela mostra o que foi lido para o admin conferir e corrigir
// antes de cadastrar. Só o admin usa.
import { CORS, papelDe, resposta, usuarioDaRequisicao } from './comum.ts';

const MODELO = 'claude-sonnet-5-5';
const LIMITE_BASE64 = 7_000_000; // ~5 MB de arquivo
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const SISTEMA = `Você lê fotos e documentos com listas de funcionários (planilhas impressas, fichas, prints, listas escritas à mão) de uma empresa brasileira de trade marketing.

Extraia UMA linha por pessoa. Responda SOMENTE com JSON no formato:
{"linhas":[{"nome":"","cpf":"","rg":"","cargo":"","ctps":"","serie":"","matricula":"","cdc":"","conta":"","outros":{}}],"aviso":""}

Regras:
- "nome": nome completo, como está escrito. Linha sem nome não entra.
- "cpf", "rg", "ctps", "serie", "matricula": copie os números exatamente como aparecem. Não invente dígitos; se estiver ilegível, deixe vazio.
- "cargo": função (ex.: PROMOTOR, REPOSITOR, SUPERVISOR).
- "cdc": centro de custo / CDC / NC, se houver.
- "conta": cliente / conta / projeto (ex.: COLGATE, NESTLE), se houver.
- "outros": qualquer outra coluna útil (telefone, cidade, loja, admissão...), com o título da coluna como chave.
- Campo que não existe no documento fica "".
- "aviso": frase curta se algo ficou ilegível ou duvidoso; senão "".
- Se não houver lista de pessoas na imagem, devolva {"linhas":[],"aviso":"Não encontrei uma lista de funcionários nesta imagem."}`;

const txt = (v: unknown, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405);

  const user = await usuarioDaRequisicao(req);
  if (!user) return resposta({ erro: 'Entre na sua conta.' }, 401);
  if (papelDe(user) !== 'admin') return resposta({ erro: 'Sem permissão.' }, 403);

  let arquivo = '';
  let tipo = '';
  try {
    const corpo = await req.json();
    arquivo = String(corpo.arquivo || '');
    tipo = String(corpo.tipo || '');
  } catch {
    return resposta({ erro: 'Dados inválidos.' }, 400);
  }
  if (!TIPOS.includes(tipo)) return resposta({ erro: 'Envie uma foto (JPG, PNG) ou um PDF.' }, 400);
  if (!arquivo || arquivo.length > LIMITE_BASE64) return resposta({ erro: 'Arquivo vazio ou grande demais (máx. 5 MB).' }, 400);

  const chave = Deno.env.get('ANTHROPIC_API_KEY');
  if (!chave) return resposta({ erro: 'A chave da IA (ANTHROPIC_API_KEY) não está configurada no Supabase.' }, 500);

  const bloco = tipo === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: tipo, data: arquivo } }
    : { type: 'image', source: { type: 'base64', media_type: tipo, data: arquivo } };

  let r: Response;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 8000,
        system: SISTEMA,
        messages: [{ role: 'user', content: [bloco, { type: 'text', text: 'Extraia os funcionários desta imagem.' }] }],
      }),
      signal: AbortSignal.timeout(110_000),
    });
  } catch (e) {
    console.error('anthropic fetch', e);
    return resposta({ erro: 'A IA demorou demais para ler a imagem. Tente de novo ou use uma foto mais nítida.' }, 503);
  }

  if (!r.ok) {
    const corpo = await r.text();
    console.error('anthropic', r.status, corpo.slice(0, 500));
    if (r.status === 401 || r.status === 403) return resposta({ erro: 'A chave da IA foi recusada. Atualize a ANTHROPIC_API_KEY nos secrets das Edge Functions do Supabase.' }, 503);
    if (corpo.includes('credit balance')) return resposta({ erro: 'A conta da IA está sem créditos (console.anthropic.com → Billing).' }, 503);
    if (r.status === 429 || r.status === 529) return resposta({ erro: 'A IA está ocupada agora. Tente em alguns minutos.' }, 503);
    return resposta({ erro: `A IA não conseguiu ler a imagem (erro ${r.status}).` }, 502);
  }

  const dados = await r.json();
  const texto: string = (dados.content || []).map((c: { text?: string }) => c.text || '').join('');
  const ini = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  let lido: { linhas?: unknown[]; aviso?: unknown } = {};
  try {
    lido = JSON.parse(texto.slice(ini, fim + 1));
  } catch {
    return resposta({ erro: 'A IA devolveu uma resposta fora do formato. Tente de novo.' }, 502);
  }

  const linhas = (Array.isArray(lido.linhas) ? lido.linhas : []).slice(0, 500).map((l) => {
    const o = (l || {}) as Record<string, unknown>;
    const outros: Record<string, string> = {};
    if (o.outros && typeof o.outros === 'object') {
      for (const [k, v] of Object.entries(o.outros as Record<string, unknown>).slice(0, 20)) {
        if (txt(k, 40) && txt(v)) outros[txt(k, 40)] = txt(v);
      }
    }
    return {
      ...outros,
      nome: txt(o.nome), CPF: txt(o.cpf, 30), RG: txt(o.rg, 30), cargo: txt(o.cargo, 80),
      CTPS: txt(o.ctps, 30), SERIE: txt(o.serie, 20), MATRICULA: txt(o.matricula, 30),
      'NC FUNCIONARIO': txt(o.cdc, 40), Empresa: txt(o.conta, 80),
    };
  }).filter((l) => l.nome);

  return resposta({ linhas, aviso: txt(lido.aviso, 300) });
});
