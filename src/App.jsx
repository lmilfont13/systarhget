import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './lib/auth';
import { PageSkeleton } from './components/ui';

// Cada página vira um arquivo separado, baixado só quando é aberta.
// Telas pesadas (gerador de PDF, portal) deixam de pesar no primeiro carregamento.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Templates = lazy(() => import('./pages/Templates'));
const Documentos = lazy(() => import('./pages/Documentos'));
const Downloads = lazy(() => import('./pages/Downloads'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Funcionarios = lazy(() => import('./pages/Funcionarios'));
const Empresas = lazy(() => import('./pages/Empresas'));
const Lojas = lazy(() => import('./pages/Lojas'));
const PortalPromotor = lazy(() => import('./pages/PortalPromotor'));
const HistoricoCartas = lazy(() => import('./pages/HistoricoCartas'));
const VisualizadorCarta = lazy(() => import('./pages/VisualizadorCarta'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Auditoria = lazy(() => import('./pages/Auditoria'));
const Login = lazy(() => import('./pages/Login'));

function StandaloneFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageSkeleton />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }}
        />
        <Routes>
          <Route path="login" element={<Suspense fallback={null}><Login /></Suspense>} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="templates" element={<Templates />} />
            <Route path="documentos" element={<Documentos />} />
            <Route path="funcionarios" element={<Funcionarios />} />
            <Route path="empresas" element={<Empresas />} />
            <Route path="lojas" element={<Lojas />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="historico" element={<HistoricoCartas />} />
            <Route path="auditoria" element={<Auditoria />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="promotores" element={<Suspense fallback={<StandaloneFallback />}><PortalPromotor /></Suspense>} />
          <Route path="carta/:id" element={<Suspense fallback={<StandaloneFallback />}><VisualizadorCarta /></Suspense>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
