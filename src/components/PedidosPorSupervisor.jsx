import { useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { cn } from '../lib/cn';
import { fmtDuracao } from '../lib/tempoAtendimento';

const fmtDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const CHAVE = 'tarhget:por-supervisor-aberto';

function lerAberto() {
  try { return localStorage.getItem(CHAVE) !== 'nao'; } catch { return true; }
}

/** Quadro do admin: pedidos de cada supervisor. Clicar numa linha filtra a lista de pedidos. */
export default function PedidosPorSupervisor({ grupos, selecionado, onSelecionar }) {
  const [aberto, setAberto] = useState(lerAberto);
  const alternar = () => {
    setAberto((v) => {
      try { localStorage.setItem(CHAVE, v ? 'nao' : 'sim'); } catch { /* sem armazenamento */ }
      return !v;
    });
  };
  if (!grupos.length) return null;

  return (
    <section className="panel mb-6 overflow-hidden" aria-labelledby="titulo-supervisores">
      <button
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls="tabela-supervisores"
        className="flex w-full items-center gap-2 px-5 py-3.5 text-left hover:bg-slate-50"
      >
        <Users className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <h2 id="titulo-supervisores" className="text-sm font-semibold text-ink">Pedidos por supervisor</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">{grupos.length}</span>
        <span className="ml-auto hidden text-xs text-slate-400 sm:inline">Clique num supervisor para ver só os pedidos dele</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 text-slate-400 transition-transform sm:ml-0', aberto && 'rotate-180')} aria-hidden="true" />
      </button>

      {aberto && (
        <div id="tabela-supervisores" className="max-h-80 overflow-auto border-t border-line-soft">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium">Supervisor</th>
                <th className="px-3 py-2 text-right font-medium">Pedidos</th>
                <th className="px-3 py-2 text-right font-medium">Cartas</th>
                <th className="px-3 py-2 text-right font-medium">Prontas</th>
                <th className="px-3 py-2 text-right font-medium">Recusadas</th>
                <th className="px-3 py-2 text-right font-medium">Em aberto</th>
                <th className="px-3 py-2 text-right font-medium">Tempo médio</th>
                <th className="px-5 py-2 text-right font-medium">Último pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {grupos.map((g) => {
                const ativo = selecionado === g.id;
                return (
                  <tr
                    key={g.id}
                    onClick={() => onSelecionar(ativo ? null : g.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelecionar(ativo ? null : g.id); } }}
                    tabIndex={0}
                    aria-selected={ativo}
                    className={cn('cursor-pointer tabular-nums transition-colors focus:outline-none focus-visible:bg-brand-50', ativo ? 'bg-brand-50' : 'hover:bg-slate-50')}
                  >
                    <td className="whitespace-nowrap px-5 py-2.5">
                      <span className={cn('font-medium', ativo ? 'text-brand-700' : 'text-ink')}>{g.nome}</span>
                      {g.whatsapp && <span className="ml-2 hidden text-xs text-slate-400 sm:inline">{g.whatsapp}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink">{g.total}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{g.cartas}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">{g.prontas}</td>
                    <td className={cn('px-3 py-2.5 text-right', g.recusadas ? 'text-red-700' : 'text-slate-400')}>
                      {g.recusadas}
                      {g.recusadas > 0 && <span className="ml-1 text-xs text-slate-400">({Math.round(g.taxaRecusa * 100)}%)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {g.emAberto
                        ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700" title={`O mais antigo espera há ${fmtDuracao(g.esperaMaisLonga)}`}>{g.emAberto}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{g.tempoMedio != null ? fmtDuracao(g.tempoMedio) : '—'}</td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{g.ultimoPedido ? fmtDia.format(new Date(g.ultimoPedido)) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
