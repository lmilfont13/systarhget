/**
 * Mostra o selo de lacre por cima da tela quando uma carta fica pronta.
 * Quem desenha é <SeloCartaGerada /> (montado uma vez no App).
 */
export const EVENTO_CARTA_GERADA = 'tarhget:carta-gerada';

export function celebrarCarta({ nome, quantidade = 1 } = {}) {
  if (!(quantidade > 0)) return;
  window.dispatchEvent(new CustomEvent(EVENTO_CARTA_GERADA, { detail: { nome, quantidade } }));
}
