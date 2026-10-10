/**
 * Tempo de atendimento dos pedidos de carta: do envio do supervisor até a carta pronta.
 * Usado no painel do supervisor (/pedir) e na caixa de entrada do admin.
 */

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

export const CONCLUIDOS = ['aprovada', 'recusada'];

/** Quando o atendimento terminou (aprovada: aprovado_em; recusada: última alteração). */
export function fimDoAtendimento(p) {
  if (p?.status === 'aprovada') return p.aprovado_em || null;
  if (p?.status === 'recusada') return p.atualizado_em || null;
  return null;
}

/** Duração em ms do envio até a conclusão; null se ainda não terminou. */
export function duracaoAtendimento(p) {
  const fim = fimDoAtendimento(p);
  if (!fim || !p?.criado_em) return null;
  const ms = new Date(fim).getTime() - new Date(p.criado_em).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/** Há quanto tempo um pedido em aberto está esperando. */
export function tempoEsperando(p, agora = Date.now()) {
  if (!p?.criado_em || CONCLUIDOS.includes(p.status)) return null;
  return Math.max(0, agora - new Date(p.criado_em).getTime());
}

/** 45 s → "menos de 1 min"; 14 min; 1 h 05 min; 2 d 3 h. */
export function fmtDuracao(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < MIN) return 'menos de 1 min';
  if (ms < HORA) return `${Math.round(ms / MIN)} min`;
  if (ms < DIA) {
    const h = Math.floor(ms / HORA);
    const m = Math.round((ms % HORA) / MIN);
    return m === 60 ? `${h + 1} h` : m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
  }
  const d = Math.floor(ms / DIA);
  const h = Math.round((ms % DIA) / HORA);
  return h === 24 ? `${d + 1} d` : h ? `${d} d ${h} h` : `${d} d`;
}

/** Versão curta para listas: "14min", "1h05", "2d3h". */
export function fmtDuracaoCurta(ms) {
  return fmtDuracao(ms).replace('menos de 1 min', '<1min').replace(/ h /, 'h').replace(/ min$/, 'min').replace(/ d /, 'd').replace(/ /g, '');
}

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const mediana = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mesmoDia = (a, b) => a.toDateString() === b.toDateString();

/**
 * Números do painel. O tempo médio considera só as cartas aprovadas nos últimos `dias`
 * (a recusa não é "carta que voltou"). A tendência compara com o período anterior de mesmo tamanho.
 */
export function resumoAtendimento(pedidos, { agora = Date.now(), dias = 30 } = {}) {
  const lista = Array.isArray(pedidos) ? pedidos : [];
  const janela = dias * DIA;
  const hoje = new Date(agora);

  const aprovadas = lista.filter((p) => p.status === 'aprovada' && duracaoAtendimento(p) != null);
  const fimMs = (p) => new Date(fimDoAtendimento(p)).getTime();
  const noPeriodo = aprovadas.filter((p) => agora - fimMs(p) <= janela);
  const anterior = aprovadas.filter((p) => agora - fimMs(p) > janela && agora - fimMs(p) <= 2 * janela);

  const duracoes = noPeriodo.map(duracaoAtendimento);
  const mediaAtual = media(duracoes);
  const mediaAnterior = media(anterior.map(duracaoAtendimento));

  const abertos = lista.filter((p) => !CONCLUIDOS.includes(p.status));
  const esperas = abertos.map((p) => tempoEsperando(p, agora)).filter((x) => x != null);

  const ultimaAprovada = [...aprovadas].sort((a, b) => fimMs(b) - fimMs(a))[0] || null;

  // Pedidos por dia nos últimos 7 dias (mais antigo → hoje), para o mini gráfico
  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(agora - (6 - i) * DIA);
    return { dia: d, total: lista.filter((p) => mesmoDia(new Date(p.criado_em), d)).length };
  });

  return {
    total: lista.length,
    tempoMedio: mediaAtual,
    tempoMediano: mediana(duracoes),
    maisRapido: duracoes.length ? Math.min(...duracoes) : null,
    amostra: duracoes.length,
    // negativa = ficou mais rápido que no período anterior
    tendencia: mediaAtual != null && mediaAnterior ? (mediaAtual - mediaAnterior) / mediaAnterior : null,
    ultimoAtendimento: ultimaAprovada ? duracaoAtendimento(ultimaAprovada) : null,
    emAberto: abertos.length,
    esperaMaisLonga: esperas.length ? Math.max(...esperas) : null,
    prontasHoje: aprovadas.filter((p) => mesmoDia(new Date(fimDoAtendimento(p)), hoje)).length,
    prontasNoPeriodo: noPeriodo.length,
    prontasTotal: aprovadas.length,
    recusadas: lista.filter((p) => p.status === 'recusada').length,
    ultimos7,
  };
}

/**
 * Pedidos agrupados por supervisor, para o admin analisar quem pede o quê.
 * Ordena por quem tem mais pedidos em aberto e, depois, por mais pedidos no total.
 */
export function porSupervisor(pedidos, { agora = Date.now() } = {}) {
  const grupos = new Map();
  for (const p of Array.isArray(pedidos) ? pedidos : []) {
    const id = p.solicitante_id || p.solicitante?.usuario || 'sem-id';
    if (!grupos.has(id)) grupos.set(id, { id, nome: p.solicitante?.nome || 'Supervisor', whatsapp: p.solicitante?.whatsapp || '', pedidos: [] });
    grupos.get(id).pedidos.push(p);
  }
  return [...grupos.values()].map((g) => {
    const r = resumoAtendimento(g.pedidos, { agora, dias: 3650 });
    const ultimo = g.pedidos.reduce((a, p) => (!a || p.criado_em > a ? p.criado_em : a), null);
    return {
      id: g.id,
      nome: g.nome,
      whatsapp: g.whatsapp,
      total: g.pedidos.length,
      cartas: g.pedidos.reduce((a, p) => a + (p.itens?.length || 0), 0),
      prontas: r.prontasTotal,
      recusadas: r.recusadas,
      emAberto: r.emAberto,
      esperaMaisLonga: r.esperaMaisLonga,
      tempoMedio: r.tempoMedio,
      taxaRecusa: g.pedidos.length ? r.recusadas / g.pedidos.length : 0,
      ultimoPedido: ultimo,
    };
  }).sort((a, b) => b.emAberto - a.emAberto || b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}
