import { useEffect, useState } from 'react';
import { EVENTO_CARTA_GERADA } from '../lib/celebrar';
import { cn } from '../lib/cn';

const T_PATH =
  'M8.6 8.4h14.8v3.1h-.9c-.2-1-.6-1.6-1.6-1.7h-3.3v12.3c0 .8.4 1.1 1.4 1.2l.6.1v.9h-7.2v-.9l.6-.1c1-.1 1.4-.4 1.4-1.2V9.8h-3.3c-1 .1-1.4.7-1.6 1.7h-.9z';

/** Contorno irregular de cera derretida (calculado uma vez, sempre igual). */
const BORDA_CERA = (() => {
  const n = 28;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 46 + 2.6 * Math.sin(a * 5 + 0.7) + 1.6 * Math.sin(a * 9 + 2.1) + 1.1 * Math.cos(a * 13);
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  });
  const meio = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const ini = meio(pts[n - 1], pts[0]);
  let d = `M${ini[0].toFixed(2)} ${ini[1].toFixed(2)}`;
  pts.forEach((p, i) => {
    const m = meio(p, pts[(i + 1) % n]);
    d += ` Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${m[0].toFixed(2)} ${m[1].toFixed(2)}`;
  });
  return `${d}Z`;
})();

/** Marca da Tarhget que se desenha ao abrir (tela de login). */
export function MarcaDesenhada({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="15.4" stroke="currentColor" strokeWidth="0.25" opacity="0.35" pathLength="1" className="tracar tracar-lento" />
      <circle cx="16" cy="16" r="14.2" stroke="currentColor" strokeWidth="1.1" pathLength="1" className="tracar" transform="rotate(-90 16 16)" />
      <path d={T_PATH} fill="currentColor" className="carimbar-leve" />
    </svg>
  );
}

/**
 * Mini vitrine do que o sistema faz, pro login: a carta chega e a IA confere
 * cada linha — a mesma cena da mesa do agente (ver MesaDoAgente.jsx), só que
 * compacta, tocando uma vez na abertura, como prova da frase "carta pronta
 * em minutos".
 */
export function CartaConferida({ className }) {
  return (
    <svg viewBox="0 0 88 56" fill="none" aria-hidden="true" className={cn('selo-cartao', className)}>
      <rect x="8" y="7" width="48" height="42" rx="2.5" className="fill-white" />
      {[
        { y: 17, w: 26 },
        { y: 25, w: 32 },
        { y: 33, w: 20 },
      ].map((l, i) => (
        <rect key={i} x="15" y={l.y} width={l.w} height="2.4" rx="1.2" className="fill-slate-300" />
      ))}
      {[17, 25, 33].map((y, i) => (
        <path
          key={y}
          d={`M63 ${y + 1.2} l2.6 2.6 l5.4 -5.4`}
          className="selo-check stroke-emerald-500"
          style={{ '--atraso': `${1.35 + i * 0.15}s` }}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** Selo de lacre de cera com o T da marca. */
function SeloCera({ className }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="cera" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#C4665D" />
          <stop offset="38%" stopColor="#7E1F17" />
          <stop offset="100%" stopColor="#3F0603" />
        </radialGradient>
        <radialGradient id="cera-miolo" cx="60%" cy="65%" r="70%">
          <stop offset="0%" stopColor="#66130C" />
          <stop offset="100%" stopColor="#580A05" />
        </radialGradient>
      </defs>
      <path d={BORDA_CERA} fill="url(#cera)" />
      <circle cx="50" cy="50" r="33" fill="url(#cera-miolo)" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#DC9891" strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="50" cy="50" r="29.5" fill="none" stroke="#240302" strokeOpacity="0.5" strokeWidth="0.6" />
      {/* T em relevo: sombra embaixo, brilho em cima */}
      <g transform="translate(50 50) scale(1.7) translate(-16 -16)">
        <path d={T_PATH} fill="#240302" opacity="0.7" transform="translate(0.35 0.4)" />
        <path d={T_PATH} fill="#DC9891" opacity="0.55" transform="translate(-0.25 -0.3)" />
        <path d={T_PATH} fill="#A03E35" />
      </g>
    </svg>
  );
}

/**
 * Ao gerar uma carta, o lacre "carimba" a tela por 2 segundos.
 * Clique ou Esc fecham antes.
 */
export default function SeloCartaGerada() {
  const [selo, setSelo] = useState(null);

  useEffect(() => {
    const onGerada = (e) => setSelo({ ...e.detail, chave: Date.now() });
    window.addEventListener(EVENTO_CARTA_GERADA, onGerada);
    return () => window.removeEventListener(EVENTO_CARTA_GERADA, onGerada);
  }, []);

  useEffect(() => {
    if (!selo) return undefined;
    const fim = setTimeout(() => setSelo(null), 2300);
    const onKey = (e) => { if (e.key === 'Escape') setSelo(null); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(fim); window.removeEventListener('keydown', onKey); };
  }, [selo]);

  if (!selo) return null;
  const varias = selo.quantidade > 1;

  return (
    <div
      key={selo.chave}
      className="lacre-palco fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
      onClick={() => setSelo(null)}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-44 w-44 sm:h-52 sm:w-52">
        <span className="lacre-onda absolute inset-0 rounded-full border-2 border-brand-300" />
        <SeloCera className="lacre-carimbo relative h-full w-full drop-shadow-[0_18px_30px_rgb(36_3_2/0.45)]" />
      </div>
      <div className="lacre-texto mt-6 text-center">
        <p className="font-marca text-2xl font-semibold tracking-[0.06em] text-white">
          {varias ? `${selo.quantidade} cartas lacradas` : 'Carta lacrada'}
        </p>
        {!varias && selo.nome && (
          <p className="mt-1.5 max-w-xs truncate text-sm text-brand-100/80">{selo.nome}</p>
        )}
      </div>
    </div>
  );
}
