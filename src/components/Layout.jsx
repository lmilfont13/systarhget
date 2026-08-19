import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FileEdit, Download, Settings,
  FileSignature, Users, Building2, Store, Menu, X, History,
  Package, Sparkles, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Lista base de itens de navegação
const BASE_NAV = [
  { id: 'dashboard',    name: 'Dashboard',            href: '/dashboard',    icon: 'LayoutDashboard' },
  { id: 'templates',    name: 'Templates',            href: '/templates',    icon: 'FileSignature' },
  { id: 'documentos',   name: 'Documentos',           href: '/documentos',   icon: 'FileEdit' },
  { id: 'historico',    name: 'Histórico de Cartas',  href: '/historico',    icon: 'History' },
  { id: 'funcionarios', name: 'Funcionários',         href: '/funcionarios', icon: 'Users' },
  { id: 'empresas',     name: 'Empresas',             href: '/empresas',     icon: 'Building2' },
  { id: 'lojas',        name: 'Lojas',                href: '/lojas',        icon: 'Store' },
  { id: 'estoque',      name: 'Estoque',              href: '/estoque',      icon: 'Package' },
  { id: 'auditoria',    name: 'Auditoria',            href: '/auditoria',    icon: 'History' },
  { id: 'downloads',    name: 'Downloads',            href: '/downloads',    icon: 'Download' },
  { id: 'configuracoes',name: 'Configurações',        href: '/configuracoes',icon: 'Settings' },
];

const ICON_MAP = {
  Package, LayoutDashboard, FileSignature, FileEdit, History,
  Users, Building2, Store, Download, Settings
};

// Logo Component
const Logo = ({ size = 'default' }) => (
  <div className="flex items-center gap-3">
    <div className={cn(
      'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30',
      size === 'default' ? 'w-9 h-9' : 'w-8 h-8'
    )}>
      <Sparkles className={cn(
        'text-white',
        size === 'default' ? 'w-5 h-5' : 'w-4 h-4'
      )} />
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 opacity-0 blur-sm group-hover:opacity-40 transition-opacity" />
    </div>
    <div>
      <span className={cn(
        'font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent',
        size === 'default' ? 'text-lg' : 'text-base'
      )}>
        SysTarhget
      </span>
      <span className={cn(
        'font-light text-indigo-300 ml-1',
        size === 'default' ? 'text-lg' : 'text-base'
      )}>
        Pro
      </span>
    </div>
  </div>
);

// User Avatar Component
const UserAvatar = () => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
        U
      </div>
      {/* Status ring */}
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-sm" />
    </div>
    <div className="text-sm min-w-0">
      <p className="font-medium text-slate-200 truncate">Usuário</p>
      <p className="text-[10px] text-slate-500 font-mono mt-0.5" title="Data e hora da última atualização do sistema">
        v. {typeof __APP_VERSION_DATE__ !== 'undefined' ? __APP_VERSION_DATE__ : ''}
      </p>
    </div>
  </div>
);

const NavItem = ({ item, onClose }) => {
  const IconComp = ICON_MAP[item.icon];

  return (
    <NavLink
      to={item.href}
      onClick={onClose}
      draggable={false}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-white/10 text-white shadow-lg shadow-indigo-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Indicador lateral animado */}
          <div
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300',
              isActive
                ? 'h-6 bg-gradient-to-b from-indigo-400 to-violet-400 opacity-100'
                : 'h-0 bg-indigo-400 opacity-0 group-hover:h-4 group-hover:opacity-50'
            )}
          />

          {/* Ícone */}
          {IconComp && (
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
              isActive
                ? 'bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-indigo-300'
                : 'text-slate-500 group-hover:text-slate-300'
            )}>
              <IconComp className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
          )}

          {/* Nome */}
          <span className={cn(
            'truncate transition-colors duration-200',
            isActive ? 'text-white' : ''
          )}>
            {item.name}
          </span>

          {/* Seta no hover */}
          <ChevronRight className={cn(
            'ml-auto h-3.5 w-3.5 transition-all duration-200',
            isActive
              ? 'text-indigo-300 opacity-100'
              : 'opacity-0 group-hover:opacity-40 text-slate-500'
          )} />
        </>
      )}
    </NavLink>
  );
};

const NavItems = ({ onClose }) => (
  <div className="space-y-1">
    {BASE_NAV.map((item) => (
      <NavItem
        key={item.id}
        item={item}
        onClose={onClose || (() => {})}
      />
    ))}
  </div>
);

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden" style={{ background: '#f7f8fc' }}>

      {/* Header Mobile */}
      <header className="h-16 flex items-center justify-between px-4 md:hidden shrink-0 z-20" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      }}>
        <Logo size="small" />
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg focus:outline-none transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Backdrop Mobile */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300 md:hidden",
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto backdrop-blur-sm bg-black/60"
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Drawer Mobile */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 w-72 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}
      >
        <div className="h-16 flex items-center justify-between px-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Logo size="small" />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto sidebar-scroll">
          <NavItems onClose={() => setIsMobileMenuOpen(false)} />
        </nav>
        <div className="px-4 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <UserAvatar />
        </div>
      </div>

      {/* Sidebar Desktop */}
      <div
        className="w-[260px] hidden md:flex flex-col shrink-0 z-10"
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Logo />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto sidebar-scroll">
          <NavItems />
        </nav>

        {/* User */}
        <div className="px-4 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <UserAvatar />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden h-full mesh-bg">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto" style={{ animation: 'fade-in 0.3s ease-out' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
