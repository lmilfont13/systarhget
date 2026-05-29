import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, FileEdit, Download, Settings, FileSignature, Users, Building2, Store, Menu, X, History, Package } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Estoque', href: '/', icon: Package },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Templates', href: '/templates', icon: FileSignature },
    { name: 'Documentos', href: '/documentos', icon: FileEdit },
    { name: 'Histórico de Cartas', href: '/historico', icon: History },
    { name: 'Funcionários', href: '/funcionarios', icon: Users },
    { name: 'Empresas', href: '/empresas', icon: Building2 },
    { name: 'Lojas', href: '/lojas', icon: Store },
    { name: 'Downloads', href: '/downloads', icon: Download },
    { name: 'Configurações', href: '/configuracoes', icon: Settings },
  ];

  const NavItems = () => (
    <>
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          onClick={() => setIsMobileMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              isActive
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors'
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn(
                  isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500',
                  'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                )}
                aria-hidden="true"
              />
              {item.name}
            </>
          )}
        </NavLink>
      ))}
    </>
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

      {/* Sidebar Mobile (Drawer) */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden",
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      {/* Drawer Content */}
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
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>
        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              U
            </div>
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
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>
        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              U
            </div>
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

