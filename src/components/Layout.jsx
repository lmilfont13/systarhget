import { useState, useRef, useCallback } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FileEdit, Download, Settings,
  FileSignature, Users, Building2, Store, Menu, X, History,
  Package, GripVertical
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
  { id: 'historico',    name: 'Assinaturas',          href: '/historico',    icon: 'History' },
  { id: 'funcionarios', name: 'Funcionários',         href: '/funcionarios', icon: 'Users' },
  { id: 'empresas',     name: 'Empresas',             href: '/empresas',     icon: 'Building2' },
  { id: 'lojas',        name: 'Catálogo',             href: '/lojas',        icon: 'Store' },
  { id: 'estoque',      name: 'Estoque',              href: '/estoque',      icon: 'Package' },
  { id: 'auditoria',    name: 'Auditoria',            href: '/auditoria',    icon: 'History' }, // Placeholder icon if Shield doesn't exist
  { id: 'downloads',    name: 'Downloads',            href: '/downloads',    icon: 'Download' },
  { id: 'configuracoes',name: 'Configurações',        href: '/configuracoes',icon: 'Settings' },
];

const ICON_MAP = {
  Package, LayoutDashboard, FileSignature, FileEdit, History,
  Users, Building2, Store, Download, Settings
};

// Carrega ordem salva ou usa padrão
function loadNavOrder() {
  try {
    const saved = localStorage.getItem('docflow_nav_order');
    if (saved) {
      const ids = JSON.parse(saved);
      // Reconstrói a lista na ordem salva, adicionando itens novos no final
      const ordered = ids
        .map(id => BASE_NAV.find(n => n.id === id))
        .filter(Boolean);
      const missing = BASE_NAV.filter(n => !ids.includes(n.id));
      return [...ordered, ...missing];
    }
  } catch (_) {}
  return BASE_NAV;
}

function saveNavOrder(items) {
  localStorage.setItem('docflow_nav_order', JSON.stringify(items.map(i => i.id)));
}

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = BASE_NAV; // Organização fixa

  const NavItem = ({ item, onClose }) => {
    const IconComp = ICON_MAP[item.icon];

    return (
      <div className="group relative flex items-center rounded-lg transition-all duration-150 select-none">
        <NavLink
          to={item.href}
          onClick={onClose}
          draggable={false}
          className={({ isActive }) =>
            cn(
              isActive
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              'flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors'
            )
          }
        >
          {({ isActive }) => (
            <>
              {IconComp && (
                <IconComp
                  className={cn(
                    isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                  )}
                  aria-hidden="true"
                />
              )}
              {item.name}
            </>
          )}
        </NavLink>
      </div>
    );
  };

  const NavItems = ({ onClose }) => (
    <div className="space-y-0.5">
      {navItems.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          onClose={onClose || (() => {})}
        />
      ))}
    </div>
  );

  return (
    <div className="h-screen w-screen bg-gray-50/50 flex flex-col md:flex-row overflow-hidden">

      {/* Header Mobile */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
          <FileText className="w-5 h-5" />
          <span>DocFlow Hub</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg focus:outline-none"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Backdrop Mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden",
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Drawer Mobile */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 w-64 bg-white z-50 flex flex-col shadow-xl transition-transform duration-300 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <FileText className="w-5 h-5" />
            <span>DocFlow Hub</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded-full"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <NavItems onClose={() => setIsMobileMenuOpen(false)} />
        </nav>
        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">U</div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">Usuário</p>
              <p className="text-gray-500">Plano Pro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm hidden md:flex shrink-0 z-10">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <FileText className="w-6 h-6" />
            <span>DocFlow Hub</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <NavItems />
        </nav>
        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">U</div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">Usuário</p>
              <p className="text-gray-500">Plano Pro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
