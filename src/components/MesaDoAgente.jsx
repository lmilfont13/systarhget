import { cn } from '../lib/cn';

/** Em que momento a cena está, a partir do status do pedido. */
function faseDaMesa(status) {
  if (status === 'aprovada') return 'pronta';
  if (status === 'recusada') return 'recusada';
  if (status === 'revisao' || status === 'erro') return 'avaliacao';
  return 'agentes';
}

const T =
  'M8.6 8.4h14.8v3.1h-.9c-.2-1-.6-1.6-1.6-1.7h-3.3v12.3c0 .8.4 1.1 1.4 1.2l.6.1v.9h-7.2v-.9l.6-.1c1-.1 1.4-.4 1.4-1.2V9.8h-3.3c-1 .1-1.4.7-1.6 1.7h-.9z';

/**
 * Cena da mesa: a carta chega, o agente lê com a lupa, a coordenação confere
 * e, quando aprovada, o lacre com o T é carimbado. Só SVG + CSS.
 */
export default function MesaDoAgente({ status, className }) {
  const fase = faseDaMesa(status);
  const legenda = {
    agentes: 'O agente está lendo o pedido e procurando o promotor e a loja',
    avaliacao: 'A carta está na mesa da coordenação para conferência',
    pronta: 'Carta lacrada e pronta',
    recusada: 'Pedido devolvido',
  }[fase];

  return (
    <svg viewBox="0 0 320 132" role="img" aria-label={legenda} className={cn('mesa w-full', `mesa--${fase}`, className)}>
      {/* luz da luminária */}
      <path d="M232 30 L196 108 L292 108 Z" className="mesa-luz" />
      {/* luminária */}
      <g className="fill-brand-900">
        <rect x="262" y="104" width="22" height="4" rx="2" />
        <rect x="271" y="40" width="3" height="66" />
        <path d="M232 22 l26 -8 l16 22 l-36 6 z" />
      </g>

      {/* agente (silhueta) atrás da mesa */}
      <g className="mesa-agente">
        <circle cx="120" cy="50" r="15" className="fill-slate-700" />
        <path d="M92 108 C92 80 104 70 120 70 C136 70 148 80 148 108 Z" className="fill-slate-700" />
        {/* crachá com o T */}
        <rect x="126" y="80" width="12" height="15" rx="2" className="fill-white" />
        <path d={T} transform="translate(127.5 81.5) scale(0.28)" className="fill-brand-700" />
      </g>

      {/* mesa */}
      <rect x="20" y="106" width="280" height="8" rx="2" className="fill-brand-800" />
      <rect x="34" y="114" width="6" height="18" className="fill-brand-900" />
      <rect x="280" y="114" width="6" height="18" className="fill-brand-900" />

      {/* bandeja de saída */}
      <g className="mesa-bandeja">
        <path d="M206 98 h46 l-4 8 h-38 z" className="fill-slate-300" />
        <text x="229" y="96" textAnchor="middle" className="mesa-rotulo">prontas</text>
      </g>

      {/* carta */}
      <g className="mesa-carta">
        <rect x="104" y="84" width="44" height="22" rx="1.5" className="fill-white stroke-slate-300" strokeWidth="1" />
        <rect x="110" y="89" width="22" height="2" rx="1" className="fill-slate-300 mesa-linha" />
        <rect x="110" y="94" width="30" height="2" rx="1" className="fill-slate-300 mesa-linha" />
        <rect x="110" y="99" width="26" height="2" rx="1" className="fill-slate-300 mesa-linha" />
        {/* lacre */}
        <g className="mesa-lacre">
          <circle cx="140" cy="100" r="6" className="fill-brand-700" />
          <path d={T} transform="translate(136.2 96.2) scale(0.24)" className="fill-brand-100" />
        </g>
      </g>

      {/* lupa do agente */}
      <g className="mesa-lupa">
        <circle cx="0" cy="0" r="7" className="fill-white/40 stroke-brand-900" strokeWidth="2.5" />
        <path d="M5 5 l7 7" className="stroke-brand-900" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* marcas de conferência */}
      <g className="mesa-checks">
        <rect x="50" y="56" width="48" height="46" rx="3" className="fill-white stroke-slate-200" strokeWidth="1" />
        <rect x="66" y="52" width="16" height="6" rx="2" className="fill-brand-800" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M58 ${66 + i * 13} l4 4 l8 -8`} className={`mesa-check mesa-check-${i} stroke-emerald-600`} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <rect x="74" y="64" width="18" height="2" rx="1" className="fill-slate-300" />
        <rect x="74" y="77" width="14" height="2" rx="1" className="fill-slate-300" />
        <rect x="74" y="90" width="16" height="2" rx="1" className="fill-slate-300" />
      </g>

      {/* recusado */}
      <g className="mesa-x">
        <circle cx="126" cy="68" r="10" className="fill-red-600" />
        <path d="M122 64 l8 8 M130 64 l-8 8" className="stroke-white" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
