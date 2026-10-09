// Aviso automático no WhatsApp do administrador quando chega um pedido.
// Usa o CallMeBot (gratuito, para avisos pessoais). Sem os segredos configurados, não faz nada.
//   CALLMEBOT_PHONE  — número com DDI, ex.: 5585999999999
//   CALLMEBOT_APIKEY — chave que o CallMeBot manda no WhatsApp ao ativar
//   SITE_URL         — endereço do sistema (opcional), para o link da caixa de pedidos
import type { ItemResolvido } from './agentes.ts';

export function mensagemDoPedido(supervisor: string, texto: string, itens: ItemResolvido[] | null, erro?: string) {
  const linhas = [`📨 *Novo pedido de carta* — ${supervisor}`, `"${texto.slice(0, 200)}"`];
  if (itens?.length) {
    linhas.push('');
    for (const i of itens.slice(0, 10)) {
      const quem = i.promotor.nome || `? (${i.promotor.mencionado})`;
      const onde = i.loja.nome || '?';
      const selo = i.confianca === 'alta' ? '✅' : i.confianca === 'media' ? '🟡' : '🔴';
      linhas.push(`${selo} ${quem} → ${onde}`);
    }
  }
  if (erro) linhas.push('', `⚠️ ${erro}`);
  const site = Deno.env.get('SITE_URL');
  if (site) linhas.push('', `Revisar: ${site.replace(/\/$/, '')}/solicitacoes`);
  return linhas.join('\n');
}

export async function avisarWhatsApp(mensagem: string) {
  const fone = Deno.env.get('CALLMEBOT_PHONE');
  const chave = Deno.env.get('CALLMEBOT_APIKEY');
  if (!fone || !chave) return;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(fone)}&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(chave)}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) console.error('callmebot', r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error('callmebot', e);
  }
}
