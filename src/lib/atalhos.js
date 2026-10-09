/** Tecla modificadora exibida nas dicas: ⌘ no Mac, Ctrl nos demais. */
export const teclaMod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

/** Abre a busca rápida de qualquer lugar do sistema (ex.: um botão no Painel). */
export function abrirBuscaRapida() {
  window.dispatchEvent(new CustomEvent('tarhget:abrir-busca'));
}

/** Abre a ajuda de atalhos de teclado. */
export function abrirAjudaAtalhos() {
  window.dispatchEvent(new CustomEvent('tarhget:abrir-atalhos'));
}

export const ATALHOS = [
  { teclas: [teclaMod, 'K'], descricao: 'Abrir a busca rápida: promotores, páginas e ações' },
  { teclas: ['↑', '↓'], descricao: 'Navegar pelos resultados da busca' },
  { teclas: ['Enter'], descricao: 'Abrir o resultado; num promotor, gera a carta dele' },
  { teclas: ['Esc'], descricao: 'Fechar a busca ou esta janela' },
  { teclas: ['?'], descricao: 'Mostrar estes atalhos' },
];
