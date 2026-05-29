import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import Documentos from './pages/Documentos';
import Downloads from './pages/Downloads';
import Configuracoes from './pages/Configuracoes';
import Funcionarios from './pages/Funcionarios';
import Empresas from './pages/Empresas';
import Lojas from './pages/Lojas';
import PortalPromotor from './pages/PortalPromotor';
import HistoricoCartas from './pages/HistoricoCartas';
import VisualizadorCarta from './pages/VisualizadorCarta';
import Estoque from './pages/Estoque';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Estoque />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="templates" element={<Templates />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="funcionarios" element={<Funcionarios />} />
          <Route path="empresas" element={<Empresas />} />
          <Route path="lojas" element={<Lojas />} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="downloads" element={<Downloads />} />
          <Route path="historico" element={<HistoricoCartas />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
        <Route path="promotores" element={<PortalPromotor />} />
        <Route path="carta/:id" element={<VisualizadorCarta />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
