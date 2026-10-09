import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, FilePlus2, PanelLeftClose, PanelLeftOpen, ExternalLink, LogOut } from 'lucide-react';
import { useAuth, displayName } from '../lib/auth';
import { NAV_GROUPS, findNavItem } from '../lib/navigation';
import { cn } from '../lib/cn';
import { BrandMark, PageSkeleton } from './ui';
import CommandPalette from './CommandPalette';

const COLLAPSE_KEY = 'systarhget:sidebar-collapsed';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

function Brand({ collapsed }) {
  return (
    <Link to="/dashboard" className="flex min-w-0 items-center gap-3 rounded-lg outline-offset-4" aria-label="SysTarhget — início">
      <BrandMark />
      {!collapsed && (
        <span className="truncate text-[0.9375rem] font-semibold tracking-tight text-white">
          SysTarhget
        </span>
      )}
    </Link>
  );
}

function SidebarNav({ collapsed, onNavigate }) {
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

  const current = findNavItem(location.pathname);

  // Atualiza o título da aba conforme a página
  useEffect(() => {
    document.title = current ? `${current.name} · SysTarhget` : 'SysTarhget';
  }, [current]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* armazenamento indisponível */ }
      return next;
    });
  }, []);

  // Atalho Ctrl/⌘ + K para a busca rápida
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
            <span className="truncate font-medium text-ink">{current?.name ?? 'SysTarhget'}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700 sm:w-64"
              aria-label="Abrir busca rápida"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden flex-1 text-left sm:inline">Buscar…</span>
              <span className="kbd hidden sm:inline-flex">{isMac ? '⌘' : 'Ctrl'} K</span>
            </button>
            <Link
              to="/documentos"
              className="hidden h-9 items-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 sm:inline-flex"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              Gerar documento
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
