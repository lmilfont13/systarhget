import { linkWhatsApp } from './pedidos';

/**
 * Aviso da empresa pelo WhatsApp do próprio supervisor.
 *
 * Por que assim, e não pelo servidor: mandar sozinho exige a API oficial da
 * Meta, que para mensagem fora da janela de 24h pede modelo aprovado por
 * eles — burocracia desproporcional para um "chegou pedido". Abrindo o
 * WhatsApp já escrito, o supervisor dá um toque e pronto. De quebra, o aviso
 * chega vindo do número dele, o que dá contexto a quem recebe.
 *
 * O envio pelo servidor continua existindo (ver whatsapp.ts) e funciona em
 * paralelo, para quem configurar.
 */

/** Caber no link é o que importa: wa.me engasga com texto muito longo. */
const LIMITE = 700;

/** Número da empresa que recebe os avisos, ou vazio se ninguém configurou. */
export function numeroDaEmpresa() {
  return String(import.meta.env.VITE_WHATSAPP_EMPRESA || '').replace(/\D/g, '');
}

/** A mensagem que o supervisor vai enviar, já escrita. */
export function mensagemParaEmpresa({ supervisor, texto, site } = {}) {
  const pedido = String(texto || '').trim();
  const quem = String(supervisor || '').trim();

  const cabeca = quem ? `📨 Novo pedido de carta — ${quem}` : '📨 Novo pedido de carta';
  const endereco = String(site || '').trim();
  const rodape = endereco ? `\n\nRevisar: ${endereco.replace(/\/$/, '')}/solicitacoes` : '';

  // Corta o pedido, não o resto: o link e quem pediu têm que sobreviver.
  const espacoDoPedido = LIMITE - cabeca.length - rodape.length - 10;
  const recortado = pedido.length > espacoDoPedido ? `${pedido.slice(0, espacoDoPedido)}…` : pedido;

  return `${cabeca}\n\n"${recortado}"${rodape}`;
}

/** O link que abre o WhatsApp já com a mensagem pronta, ou null se não dá. */
export function linkAvisoEmpresa(dados) {
  const numero = numeroDaEmpresa();
  if (!numero) return null;
  return linkWhatsApp(numero, mensagemParaEmpresa(dados));
}
