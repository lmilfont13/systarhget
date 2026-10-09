import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper" role="status" aria-label="Verificando acesso">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
    </div>
  );
}

/** Libera a rota só para contas com o papel indicado; os demais vão para o login. */
export default function RequireAuth({ role = 'admin', children }) {
  const { session, role: userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role === 'admin' && userRole === 'promotor') return <Navigate to="/promotores" replace />;
  if (role === 'admin' && userRole === 'solicitante') return <Navigate to="/pedir" replace />;
  return children;
}
