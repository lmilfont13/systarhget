import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../lib/cn';
import { useContagem } from '../lib/useContagem';
import { fmtDuracao } from '../lib/tempoAtendimento';

const fmtSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' });

/** Número que conta até o valor (respeita "reduzir movimento"). */
export function Contador({ valor }) {
  return <>{useContagem(valor)}</>;
}

/** Selo de tendência do tempo médio: verde quando ficou mais rápido. */
export function Tendencia({ valor, claro = false }) {
  if (valor == null || !Number.isFinite(valor) || Math.abs(valor) < 0.05) return null;
  const melhor = valor < 0;
  const Icone = melhor ? TrendingDown : TrendingUp;
  const pct = Math.round(Math.abs(valor) * 100);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
        claro
          ? (melhor ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-300/15 text-amber-200')
          : (melhor ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'),
      )}
      title="Comparado com os 30 dias anteriores"
    >
      <Icone className="h-3 w-3" aria-hidden="true" />
      {pct}% {melhor ? 'mais rápido' : 'mais lento'}
    </span>
  );
}

/** Cartão do tempo médio, em destaque (fundo vinho). */
export function CartaoTempoMedio({ resumo, rotulo = 'Tempo médio de retorno', vazio, className, ordem = 0 }) {
  const tem = resumo.tempoMedio != null;
  return (
    <div
      className={cn('surgir relative overflow-hidden rounded-xl bg-brand-950 p-4 text-brand-100 shadow-md', className)}
      style={{ '--atraso': `${ordem * 70}ms` }}
    >
      <span className="luz-vinho right-[-30%] top-[-80%] h-[260%] w-[70%] bg-brand-700/50" aria-hidden="true" />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-200/80">{rotulo}</p>
        <p className="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight text-white tabular-nums">
          {tem ? fmtDuracao(resumo.tempoMedio) : '—'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-200/80">
          {tem ? (
            <>
              <span>{resumo.amostra} {resumo.amostra > 1 ? 'cartas' : 'carta'} em 30 dias</span>
              {resumo.amostra > 1 && <span>mais rápida: {fmtDuracao(resumo.maisRapido)}</span>}
              <Tendencia valor={resumo.tendencia} claro />
            </>
          ) : (
            <span>{vazio}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Cartão simples de indicador. */
export function Indicador({ rotulo, valor, detalhe, alerta = false, children, className, ordem = 0 }) {
  return (
    <div
      className={cn('surgir flex flex-col rounded-xl border border-line bg-white p-4', className)}
      style={{ '--atraso': `${ordem * 70}ms` }}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{rotulo}</p>
      <p className={cn('mt-2 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums', alerta ? 'text-signal-600' : 'text-ink')}>
        {typeof valor === 'number' ? <Contador valor={valor} /> : valor}
      </p>
      {detalhe && <p className={cn('mt-2 text-xs', alerta ? 'text-signal-600' : 'text-slate-400')}>{detalhe}</p>}
      {children}
    </div>
  );
}

/** Barrinhas dos pedidos dos últimos 7 dias (hoje à direita). */
export function MiniBarras({ dias }) {
  const max = Math.max(1, ...dias.map((d) => d.total));
  const total = dias.reduce((a, d) => a + d.total, 0);
  return (
    <div className="mt-auto pt-3" role="img" aria-label={`${total} pedidos nos últimos 7 dias`}>
      <div className="flex h-8 items-end gap-1">
        {dias.map((d, i) => (
          <span
            key={d.dia.toISOString()}
            className={cn('crescer-y flex-1 rounded-sm', i === dias.length - 1 ? 'bg-brand-600' : d.total ? 'bg-brand-200' : 'bg-slate-100')}
            style={{ height: `${Math.max(12, (d.total / max) * 100)}%`, '--atraso': `${200 + i * 40}ms` }}
            title={`${d.dia.toLocaleDateString('pt-BR')}: ${d.total}`}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-center text-[10px] uppercase text-slate-400" aria-hidden="true">
        {dias.map((d) => <span key={d.dia.toISOString()} className="flex-1">{fmtSemana.format(d.dia)}</span>)}
      </div>
    </div>
  );
}
