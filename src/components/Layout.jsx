import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, FilePlus2, PanelLeftClose, PanelLeftOpen, ExternalLink, LogOut, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import { teclaMod, abrirBuscaRapida } from '../lib/atalhos';
import AtalhosDialog from './AtalhosDialog';
import { useAuth, displayName } from '../lib/auth';
import { adiantarTela, adiantarTelasPrincipais } from '../lib/rotas';
import { NAV_GROUPS, findNavItem } from '../lib/navigation';
import { contarPendentes, acompanharPedidos } from '../lib/pedidos';
import AvisoNovosPedidos from './AvisoNovosPedidos';
import { cn } from '../lib/cn';
import { BrandMark, Wordmark, PageSkeleton } from './ui';
import CommandPalette from './CommandPalette';

const COLLAPSE_KEY = 'systarhget:sidebar-collapsed';
const DICA_KEY = 'tarhget:dica-busca-vista';

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

function Brand({ collapsed }) {
  return (
    <Link to="/dashboard" className="flex min-w-0 items-center gap-3 rounded-lg outline-offset-4" aria-label="Tarhget — início">
      <BrandMark className="text-brand-100" />
      {!collapsed && <Wordmark className="truncate text-brand-50" />}
    </Link>
  );
}

/** Quantos pedidos de carta esperam revisão (atualiza sozinho). */
function usePedidosPendentes() {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const atualizar = () => contarPendentes().then(setTotal).catch(() => {});
    atualizar();
    return acompanharPedidos(atualizar);
  }, []);
  return total;
}

function SidebarNav({ collapsed, onNavigate }) {
  const pendentes = usePedidosPendentes();
  return (
    <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label} className={cn(gi > 0 && 'mt-6')}>
          {collapsed ? (
            gi > 0 && <div className="mx-3 mb-3 border-t border-white/10" />
          ) : (
            <p className="mb-1.5 px-3 text-xs font-medium text-white/40">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={onNavigate}
                    onMouseEnter={() => adiantarTela(item.href)}
                    onFocus={() => adiantarTela(item.href)}
                    draggable={false}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-white/[0.08] text-white'
                          : 'text-white/60 hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-300 transition-opacity',
                            isActive ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand-200' : 'text-white/45 group-hover:text-white/70')} aria-hidden="true" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                        {item.href === '/solicitacoes' && pendentes > 0 && (
                          <span
                            className={cn('rounded-full bg-brand-500 px-1.5 text-[11px] font-semibold leading-5 text-white tabular-nums', collapsed ? 'absolute right-1 top-0.5 min-w-4 text-center leading-4' : 'ml-auto')}
                            aria-label={`${pendentes} pedidos para revisar`}
                          >
                            {pendentes}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed }) {
  const { user, signOut } = useAuth();
  const version = typeof __APP_VERSION_DATE__ !== 'undefined' ? __APP_VERSION_DATE__ : '';
  const email = displayName(user);
  const initial = (email.charAt(0) || '?').toUpperCase();
  return (
    <div className="space-y-1 border-t border-white/[0.08] p-3">
      <Link
        to="/promotores"
        className={cn(
          'flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white',
          collapsed && 'justify-center px-0',
        )}
        title="Portal do promotor"
      >
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span>Portal do promotor</span>}
      </Link>
      <div className={cn('flex items-center gap-3 rounded-lg px-3 py-2', collapsed && 'flex-col gap-2 px-0')}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white" title={email} aria-hidden="true">
          {initial}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white/80" title={email}>{email}</p>
            {version && <p className="truncate text-[11px] text-white/30" title="Data da última atualização do sistema">Versão de {version}</p>}
          </div>
        )}
        <button
          onClick={signOut}
          className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [atalhosOpen, setAtalhosOpen] = useState(false);

  const current = findNavItem(location.pathname);

  // Atualiza o título da aba conforme a página
  useEffect(() => {
    document.title = current ? `${current.name} · Tarhget` : 'Tarhget';
  }, [current]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* armazenamento indisponível */ }
      return next;
    });
  }, []);

  // Com o app aberto, adianta em segundo plano as telas mais usadas
  useEffect(() => { adiantarTelasPrincipais(); }, []);

  // Atalhos: Ctrl/⌘ + K abre a busca; "?" mostra a ajuda (fora de campos de texto)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAtalhosOpen(false);
        setPaletteOpen((o) => !o);
        return;
      }
      const digitando = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));
      if (e.key === '?' && !digitando && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setPaletteOpen(false);
        setAtalhosOpen(true);
      }
    };
    const abrirBusca = () => { setAtalhosOpen(false); setPaletteOpen(true); };
    const abrirAtalhos = () => { setPaletteOpen(false); setAtalhosOpen(true); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('tarhget:abrir-busca', abrirBusca);
    window.addEventListener('tarhget:abrir-atalhos', abrirAtalhos);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('tarhget:abrir-busca', abrirBusca);
      window.removeEventListener('tarhget:abrir-atalhos', abrirAtalhos);
    };
  }, []);

  // Dica do atalho na primeira vez que a pessoa entra no sistema neste navegador
  useEffect(() => {
    let vista = true;
    try { vista = localStorage.getItem(DICA_KEY) === '1'; } catch { /* sem armazenamento: não mostra */ }
    if (vista) return;
    const t = setTimeout(() => {
      toast(`Dica: aperte ${teclaMod} + K para buscar`, {
        description: 'Digite o nome ou CPF de um promotor e gere a carta dele direto, sem passar pelos menus.',
        duration: 12000,
        action: { label: 'Experimentar', onClick: () => abrirBuscaRapida() },
      });
      try { localStorage.setItem(DICA_KEY, '1'); } catch { /* ignora */ }
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  // Trava a rolagem do fundo enquanto o menu mobile está aberto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-paper">
      {/* Menu lateral — desktop */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col bg-ink transition-[width] duration-200 ease-out md:flex',
          collapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        <div className={cn('flex h-14 items-center border-b border-white/[0.08] px-4', collapsed && 'justify-center px-0')}>
          <Brand collapsed={collapsed} />
        </div>
        <SidebarNav collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} />
      </aside>

      {/* Menu lateral — mobile */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/50 transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-ink transition-[transform,visibility] duration-200 ease-out md:hidden',
          mobileOpen ? 'translate-x-0 shadow-2xl' : 'invisible -translate-x-full',
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/[0.08] px-4">
          <Brand />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
        <SidebarFooter />
      </aside>

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-ink md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={toggleCollapsed}
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink md:inline-flex"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>

          <div className="flex min-w-0 items-center gap-2 text-sm">
            {current && <span className="hidden text-slate-400 sm:inline">{current.group}</span>}
            {current && <span className="hidden text-slate-300 sm:inline" aria-hidden="true">/</span>}
            <span className="truncate font-medium text-ink">{current?.name ?? 'Tarhget'}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700 sm:w-72"
              aria-label="Abrir busca rápida"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden flex-1 truncate text-left sm:inline">Buscar promotor ou página</span>
              <span className="kbd hidden sm:inline-flex">{teclaMod} K</span>
            </button>
            <button
              onClick={() => setAtalhosOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-ink md:inline-flex"
              aria-label="Atalhos de teclado"
              title="Atalhos de teclado (?)"
            >
              <Keyboard className="h-[18px] w-[18px]" />
            </button>
            <AvisoNovosPedidos />
            <Link
              to="/documentos"
              onMouseEnter={() => adiantarTela('/documentos')}
              className="hidden h-9 items-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 sm:inline-flex"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              Gerar documento
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div key={location.pathname + location.search} className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {atalhosOpen && <AtalhosDialog onClose={() => setAtalhosOpen(false)} />}
    </div>
  );
}
