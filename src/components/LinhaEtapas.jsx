import { Inbox, Bot, Eye, FileCheck2, X, Check } from 'lucide-react';
import { etapasDoPedido } from '../lib/pedidos';
import { cn } from '../lib/cn';

const ICONES = { recebido: Inbox, agentes: Bot, avaliacao: Eye, fim: FileCheck2 };
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? hora.format(d) : diaHora.format(d);
}

/** Linha de etapas do pedido: Recebido → Agentes → Em avaliação → Pronta. */
export default function LinhaEtapas({ pedido }) {
  const etapas = etapasDoPedido(pedido);
  const atual = etapas.findIndex((e) => e.estado === 'atual');
  const feitas = atual === -1 ? etapas.length - 1 : atual;

  return (
    <ol className="relative grid grid-cols-4" aria-label="Andamento do pedido">
      {/* trilho e progresso */}
      <span className="absolute left-[12.5%] right-[12.5%] top-[15px] h-0.5 rounded-full bg-slate-200" aria-hidden="true" />
      <span
        className="absolute left-[12.5%] top-[15px] h-0.5 rounded-full bg-brand-600 transition-[width] duration-700 ease-out"
        style={{ width: `${(feitas / (etapas.length - 1)) * 75}%` }}
        aria-hidden="true"
      />
      {etapas.map((e) => {
        const Icone = e.estado === 'recusada' ? X : e.estado === 'feita' ? (e.chave === 'fim' ? FileCheck2 : Check) : ICONES[e.chave];
        return (
          <li key={e.chave} className="relative flex flex-col items-center text-center" aria-current={e.estado === 'atual' ? 'step' : undefined}>
            <span className="relative flex h-8 w-8 items-center justify-center">
              {e.estado === 'atual' && <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/40" aria-hidden="true" />}
              <span
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-full border-2',
                  e.estado === 'feita' && 'border-brand-700 bg-brand-700 text-white',
                  e.estado === 'atual' && 'border-brand-600 bg-white text-brand-700',
                  e.estado === 'futura' && 'border-slate-200 bg-white text-slate-300',
                  e.estado === 'recusada' && 'border-red-600 bg-red-600 text-white',
                )}
              >
                <Icone className="h-4 w-4" aria-hidden="true" />
              </span>
            </span>
            <span className={cn('mt-1.5 text-xs font-medium leading-tight', e.estado === 'futura' ? 'text-slate-400' : e.estado === 'recusada' ? 'text-red-700' : 'text-ink')}>
              {e.rotulo}
            </span>
            <span className="mt-0.5 min-h-4 text-[11px] tabular-nums text-slate-400">
              {e.estado === 'atual' ? 'agora' : quando(e.em)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
