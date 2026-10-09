import { listarFuncionarios, listarEmpresas, listarTemplatesPdf, listarTemplatesTexto } from './dados';

/**
 * Carregadores de cada tela. O App usa com React.lazy; o menu chama antes do clique
 * (ao passar o mouse ou focar) para a tela abrir sem espera.
 */
export const telas = {
  '/dashboard': () => import('../pages/Dashboard'),
  '/documentos': () => import('../pages/Documentos'),
  '/historico': () => import('../pages/HistoricoCartas'),
  '/estoque': () => import('../pages/Estoque'),
  '/funcionarios': () => import('../pages/Funcionarios'),
  '/empresas': () => import('../pages/Empresas'),
  '/lojas': () => import('../pages/Lojas'),
  '/templates': () => import('../pages/Templates'),
  '/downloads': () => import('../pages/Downloads'),
  '/auditoria': () => import('../pages/Auditoria'),
  '/configuracoes': () => import('../pages/Configuracoes'),
  '/promotores': () => import('../pages/PortalPromotor'),
  '/carta': () => import('../pages/VisualizadorCarta'),
  '/login': () => import('../pages/Login'),
  '/pedir': () => import('../pages/Pedir'),
  '/solicitacoes': () => import('../pages/Solicitacoes'),
};

/** Dados que cada tela usa, para já virem do cache quando ela abrir. */
const dadosDaTela = {
  '/dashboard': () => Promise.all([listarFuncionarios(), listarEmpresas()]),
  '/documentos': () => Promise.all([listarFuncionarios(), listarEmpresas(), listarTemplatesPdf(), listarTemplatesTexto()]),
  '/promotores': () => Promise.all([listarFuncionarios(), listarEmpresas(), listarTemplatesPdf(), listarTemplatesTexto()]),
  '/templates': () => Promise.all([listarTemplatesPdf(), listarTemplatesTexto(), listarFuncionarios()]),
};

const jaAdiantadas = new Set();

/** Começa a baixar a tela (e os dados dela) antes do clique. Silencioso em caso de erro. */
export function adiantarTela(href) {
  if (!href || jaAdiantadas.has(href)) return;
  jaAdiantadas.add(href);
  telas[href]?.().catch(() => jaAdiantadas.delete(href));
  dadosDaTela[href]?.().catch(() => {});
}

/** Depois que o app abre, aproveita o tempo ocioso para adiantar as telas mais usadas. */
export function adiantarTelasPrincipais() {
  const agendar = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  agendar(() => ['/documentos', '/funcionarios', '/historico'].forEach((h) => telas[h]?.().catch(() => {})));
}
