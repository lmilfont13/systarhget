// Aviso no WhatsApp da empresa quando chega um pedido de carta.
//
// Dois caminhos, porque um deles não é confiável:
//
//   1. WhatsApp Cloud API (Meta) — oficial. É o que se usa em produção.
//        WHATSAPP_TOKEN     — token de acesso do app no Meta for Developers
//        WHATSAPP_PHONE_ID  — "Phone number ID" do número remetente
//        WHATSAPP_DESTINO   — número que recebe, com DDI, só dígitos
//
//   2. CallMeBot — gratuito, mantido por uma pessoa, para avisos pessoais.
//      Vive lotando ("bot is full") e não confirma entrega. Serve para
//      destravar, não para depender.
//        CALLMEBOT_PHONE, CALLMEBOT_APIKEY
//
//   SITE_URL — endereço do sistema (opcional), para o link da caixa de pedidos
//
// Sem nada configurado, não avisa ninguém — e deixa isso registrado no log,
// em vez de sumir em silêncio.
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

export interface ConfigAviso {
  token?: string;
  phoneId?: string;
  destino?: string;
  fone?: string;
  chave?: string;
}

/**
 * Qual caminho usar. A Cloud API ganha quando está completa: é oficial,
 * confirma entrega e não lota. Configuração pela metade não serve — melhor
 * cair no CallMeBot do que falhar achando que avisou.
 */
export function canalDeAviso(c: ConfigAviso): 'cloud' | 'callmebot' | 'nenhum' {
  if (c.token && c.phoneId && c.destino) return 'cloud';
  if (c.fone && c.chave) return 'callmebot';
  return 'nenhum';
}

function configDoAmbiente(): ConfigAviso {
  return {
    token: Deno.env.get('WHATSAPP_TOKEN'),
    phoneId: Deno.env.get('WHATSAPP_PHONE_ID'),
    destino: Deno.env.get('WHATSAPP_DESTINO'),
    fone: Deno.env.get('CALLMEBOT_PHONE'),
    chave: Deno.env.get('CALLMEBOT_APIKEY'),
  };
}

async function enviarPelaCloudApi(c: ConfigAviso, mensagem: string) {
  const url = `https://graph.facebook.com/v21.0/${c.phoneId}/messages`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: c.destino,
      type: 'text',
      text: { preview_url: false, body: mensagem },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) {
    // O corpo da Meta diz exatamente o que houve (janela de 24h fechada,
    // token vencido, número não verificado). Sem ele, o erro é indecifrável.
    throw new Error(`cloud api ${r.status}: ${(await r.text()).slice(0, 300)}`);
  }
}

async function enviarPeloCallMeBot(c: ConfigAviso, mensagem: string) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(c.fone!)}`
    + `&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(c.chave!)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`callmebot ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

/** Avisa a empresa. Nunca derruba o processamento do pedido por causa disso. */
export async function avisarWhatsApp(mensagem: string) {
  const c = configDoAmbiente();
  const canal = canalDeAviso(c);

  if (canal === 'nenhum') {
    console.warn('aviso de WhatsApp não enviado: nenhum canal configurado');
    return;
  }

  try {
    if (canal === 'cloud') await enviarPelaCloudApi(c, mensagem);
    else await enviarPeloCallMeBot(c, mensagem);
  } catch (e) {
    // A carta vale mais que o aviso: o pedido segue mesmo se ninguém for avisado.
    console.error('aviso de WhatsApp falhou', e);
  }
}
