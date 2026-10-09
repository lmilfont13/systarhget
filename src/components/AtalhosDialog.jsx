import { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { ATALHOS, abrirBuscaRapida } from '../lib/atalhos';

export function Tecla({ children }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line border-b-2 bg-white px-1.5 font-sans text-xs font-medium text-slate-700">
      {children}
    </kbd>
  );
}

export default function AtalhosDialog({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="titulo-atalhos">
      <div className="absolute inset-0 bg-ink/30 animate-overlay" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-2xl animate-enter">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id="titulo-atalhos" className="text-lg font-semibold text-ink">Atalhos de teclado</h2>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-3">
          {ATALHOS.map((a) => (
            <li key={a.descricao} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">{a.descricao}</span>
              <span className="flex shrink-0 items-center gap-1">
                {a.teclas.map((t) => <Tecla key={t}>{t}</Tecla>)}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => { onClose(); abrirBuscaRapida(); }}
          className="mt-6 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700"
        >
          Experimentar a busca rápida
        </button>
      </div>
    </div>
  );
}
