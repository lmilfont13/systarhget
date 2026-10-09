import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, FilePlus2, UserPlus, ExternalLink } from 'lucide-react';
import { NAV_ITEMS } from '../lib/navigation';
import { cn } from '../lib/cn';

const normalize = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const ACTIONS = [
  { id: 'a-doc',   name: 'Gerar documento',      hint: 'Ações', icon: FilePlus2,    href: '/documentos',   keywords: 'carta nova emitir pdf' },
  { id: 'a-func',  name: 'Cadastrar funcionário', hint: 'Ações', icon: UserPlus,     href: '/funcionarios', keywords: 'novo promotor pessoa' },
  { id: 'a-portal', name: 'Abrir portal do promotor', hint: 'Ações', icon: ExternalLink, href: '/promotores', keywords: 'portal externo promotor' },
];

export default function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const all = [
      ...ACTIONS,
      ...NAV_ITEMS.map((i) => ({ id: i.href, name: i.name, hint: i.group, icon: i.icon, href: i.href, keywords: i.keywords })),
    ];
    const q = normalize(query);
    if (!q) return all;
    return all
      .map((item) => {
        const name = normalize(item.name);
        const score = name.startsWith(q) ? 3 : name.includes(q) ? 2 : normalize(item.keywords).includes(q) ? 1 : 0;
        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (item) => {
    onClose();
    if (item) navigate(item.href);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Busca rápida">
      <div className="absolute inset-0 bg-ink/30 animate-overlay" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl animate-enter">
        <div className="flex items-center gap-3 border-b border-line-soft px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            autoFocus
            onKeyDown={onKeyDown}
            placeholder="Ir para uma página ou ação…"
            className="h-14 w-full !border-0 bg-transparent text-[0.9375rem] text-ink !shadow-none outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
          />
          <span className="kbd text-slate-500">Esc</span>
        </div>

        <ul ref={listRef} id="command-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-500">Nada encontrado para “{query}”.</li>
          )}
          {results.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === active;
            return (
              <li
                key={item.id}
                id={`cmd-${item.id}`}
                data-index={index}
                role="option"
                aria-selected={isActive}
                onMouseMove={() => setActive(index)}
                onClick={() => go(item)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-600' : 'text-slate-400')} aria-hidden="true" />
                <span className="flex-1 truncate font-medium">{item.name}</span>
                <span className="text-xs text-slate-400">{item.hint}</span>
                {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
