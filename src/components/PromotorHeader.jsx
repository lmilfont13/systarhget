import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Componente header para o portal de promotores
 * Com menu responsivo e logout
 */
export default function PromotorHeader({
  promoterName = 'Promotor',
  onLogout,
  onMenuToggle,
  menuOpen = false,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja fazer logout?')) {
      setShowUserMenu(false);
      if (onLogout) onLogout();
    }
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 hover:bg-blue-700 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-blue-600">
                D
              </div>
              <h1 className="text-white font-bold text-lg hidden sm:block">
                DocFlow Hub
              </h1>
            </div>
          </div>

          {/* Título da Página */}
          <div className="flex-1 text-center">
            <h2 className="text-white font-semibold text-sm sm:text-base">
              Portal de Promotores
            </h2>
          </div>

          {/* Menu do Usuário */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition text-white text-sm"
            >
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="font-semibold text-sm">
                  {promoterName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline font-medium">{promoterName}</span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 py-2">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{promoterName}</p>
                  <p className="text-xs text-gray-500">Promotor</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}

            {/* Click outside para fechar dropdown */}
            {showUserMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
