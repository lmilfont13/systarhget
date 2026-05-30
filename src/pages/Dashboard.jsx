import { useState, useEffect } from 'react';
import { FileText, Users, Star, Download, User, TrendingUp, Building2, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Detecta gênero pelo nome (heurística por terminação)
function detectarGenero(nome) {
  if (!nome) return 'indefinido';
  const parts = nome.trim().toUpperCase().split(' ');
  const primeiro = parts[0];

  // Terminações comuns femininas
  const feminino = ['A', 'ANA', 'INA', 'ENA', 'ONE', 'IANE', 'IENNE', 'ELLE', 'ELLE', 'ISE', 'IZE'];
  const sufixosFem = ['A', 'ÃO'];

  // Nomes explicitamente femininos conhecidos
  const nomesF = new Set([
    'MARIA', 'ANA', 'PATRICIA', 'PATRICIA', 'FERNANDA', 'JULIANA', 'CAMILA', 'AMANDA',
    'JESSICA', 'LETICIA', 'ALINE', 'BEATRIZ', 'RAFAELA', 'GABRIELA', 'MARIANA',
    'BRUNA', 'LARISSA', 'VANESSA', 'PRISCILA', 'RENATA', 'TATIANA', 'SIMONE',
    'CLAUDIA', 'CRISTIANE', 'CRISTINA', 'LUCIANA', 'ADRIANA', 'ANDREIA', 'DANIELLE',
    'DANIELA', 'ELIANE', 'ELISANGELA', 'EVELINE', 'FABIANA', 'FRANCIELE', 'FRANCIELLE',
    'GLEICIANE', 'GRAZIELA', 'ISABELA', 'JANAINA', 'JAQUELINE', 'JOSIANE', 'KARINA',
    'KATIANE', 'KEILA', 'LEILA', 'LIDIANE', 'LUANA', 'LUCIENE', 'LUISA', 'LUZIA',
    'MAIRA', 'MARCIA', 'MARGARETE', 'MARLENE', 'MONIQUE', 'NADIA', 'NATALIA', 'NAYARA',
    'NILZA', 'NOEMIA', 'RAQUEL', 'REGIANE', 'REJANE', 'ROSANA', 'ROSANGELA', 'ROSELI',
    'ROSEMEIRE', 'ROZANGELA', 'SABRINA', 'SAMARA', 'SANDRA', 'SHEILA', 'SILVIA', 'SONIA',
    'SUELI', 'SUZANA', 'TAMIRES', 'TANIA', 'THAIS', 'THAYSSA', 'VALDIRENE', 'VALERIA',
    'VERA', 'VIVIANE', 'WANESSA', 'WELIDA', 'YASMIN', 'ZILDA', 'ALICE', 'ALICIA',
    'CRISLEANE', 'GLEICIELLY', 'CINTIA', 'EDILAINE', 'EDNA', 'ELIETE', 'ELISABETE',
    'ELZA', 'EVELISE', 'FATIMA', 'GENILDA', 'GILMARA', 'GLAUCIA', 'GREICE', 'HORTENCIA',
    'INES', 'IRACEMA', 'IRENE', 'IVONE', 'IZABEL', 'JANE', 'JANIA', 'JOANA', 'JOELMA',
    'JOYCE', 'KAROLINE', 'KATIA', 'LAIS', 'LAYLA', 'LEIDIANE', 'LEONARDA', 'LILIAN',
    'LUANA', 'MADALENA', 'MAIANE', 'MAISA', 'MARCELA', 'MILENA', 'MIRIAM', 'MIRIAN'
  ]);

  const nomesM = new Set([
    'JOAO', 'JOSE', 'PEDRO', 'PAULO', 'CARLOS', 'LUIZ', 'LUIS', 'ANTONIO', 'FRANCISCO',
    'MARCOS', 'LUCAS', 'GABRIEL', 'RAFAEL', 'DANIEL', 'FELIPE', 'RODRIGO', 'ALEXANDRE',
    'ANDERSON', 'ANDRE', 'ANTONIO', 'CAIO', 'CLEITON', 'CLEBER', 'CRISTIANO',
    'DIEGO', 'DIMAS', 'EDSON', 'EDUARDO', 'ELIAS', 'ELVIS', 'EMERSON', 'ERICK',
    'FABIO', 'FERNANDO', 'FLAVIO', 'GEOVANE', 'GILBERTO', 'GIOVANE', 'GUILHERME',
    'GUSTAVO', 'HEITOR', 'HENRIQUE', 'HUGO', 'IGOR', 'ISAAC', 'ISRAEL', 'IVAN',
    'JEAN', 'JEFFERSON', 'JONATHAN', 'JORGE', 'JULIO', 'LEANDRO', 'LEONARDO',
    'LUAN', 'LUIZ', 'MARCELO', 'MARCIO', 'MARIO', 'MATEUS', 'MATHEUS', 'MAURO',
    'MAXWELL', 'MICHEL', 'MIGUEL', 'NILTON', 'OSCAR', 'PAULO', 'RAFAEL', 'REGINALDO',
    'REINALDO', 'RENATO', 'ROBERTO', 'ROGERIO', 'RONALDO', 'RUAN', 'SAMUEL', 'SERGIO',
    'SILVIO', 'TIAGO', 'VAGNER', 'VALDO', 'VINICIUS', 'VITOR', 'WAGNER', 'WALTER',
    'WELLINGTON', 'WESLEY', 'WILLIAM', 'WILLIAN', 'WILSON', 'YAGO', 'JONAS', 'JOELMO',
    'ADAILTON', 'ALISSON', 'ALEX', 'ALEXSANDRO', 'AMILTON', 'ADAO', 'AFONSO',
    'AIRTON', 'ALAN', 'ALBERTO', 'ALDENIR', 'ALDERSON', 'ALEXANDRO', 'ALFREDO',
    'ALLAN', 'ALMIR', 'ALTAIR', 'ALTAMIRO', 'ALTEMIRO', 'ALVES', 'AMANCIO'
  ]);

  if (nomesF.has(primeiro)) return 'F';
  if (nomesM.has(primeiro)) return 'M';
  // fallback por terminação
  if (primeiro.endsWith('A') && !primeiro.endsWith('CA') && !primeiro.endsWith('MA')) return 'F';
  return 'M';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [totalFuncs, setTotalFuncs] = useState(0);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [totalEmpresas, setTotalEmpresas] = useState(0);
  const [funcionarios, setFuncionarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [recentFuncs, setRecentFuncs] = useState([]);

  // Busca de funcionários no dash
  const [dashSearch, setDashSearch] = useState('');

  // Normaliza texto para busca (remove acentos, caixa baixa)
  const normalizar = (str) =>
    String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const funcionariosOrdenados = [...funcionarios].sort((a, b) =>
    String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
  );

  const funcsFiltrados = funcionariosOrdenados.filter(f => {
    const q = normalizar(dashSearch);
    if (!q) return true;
    return (
      normalizar(f.nome).includes(q) ||
      normalizar(f.dados_extras?.CPF).includes(q) ||
      normalizar(f.dados_extras?.Empresa).includes(q) ||
      normalizar(f.cargo).includes(q)
    );
  });

  // Estatísticas de gênero
  const generos = funcionarios.reduce((acc, f) => {
    const g = detectarGenero(f.nome);
    if (g === 'F') acc.f++;
    else acc.m++;
    return acc;
  }, { m: 0, f: 0 });

  const total = generos.m + generos.f;
  const pctM = total > 0 ? Math.round((generos.m / total) * 100) : 0;
  const pctF = total > 0 ? Math.round((generos.f / total) * 100) : 0;

  // Por empresa
  const porEmpresa = empresas.map(emp => ({
    nome: emp.nome,
    total: funcionarios.filter(f => f.empresa_id === emp.id).length
  })).sort((a, b) => b.total - a.total).slice(0, 5);

  useEffect(() => {
    async function loadData() {
      try {
        const [fData, pData, eData] = await Promise.all([
          supabase.from('funcionarios').select('id, nome, cargo, empresa_id, dados_extras, criado_em').order('criado_em', { ascending: false }),
          supabase.from('pdf_templates').select('*', { count: 'exact', head: true }),
          supabase.from('empresas').select('id, nome')
        ]);

        const funcs = fData.data || [];
        setFuncionarios(funcs);
        setTotalFuncs(funcs.length);
        setTotalTemplates(pData.count || 0);
        setEmpresas(eData.data || []);
        setTotalEmpresas((eData.data || []).length);
        setRecentFuncs(funcs.slice(0, 5));
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral do seu sistema de gestão de promotores.</p>
      </div>

      {/* Cards de KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Promotores</p>
            <p className="text-2xl font-black text-gray-900">{isLoading ? '...' : totalFuncs}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Empresas</p>
            <p className="text-2xl font-black text-gray-900">{isLoading ? '...' : totalEmpresas}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Templates</p>
            <p className="text-2xl font-black text-gray-900">{isLoading ? '...' : totalTemplates}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sem Empresa</p>
            <p className="text-2xl font-black text-gray-900">
              {isLoading ? '...' : funcionarios.filter(f => !f.empresa_id).length}
            </p>
          </div>
        </div>
      </div>

      {/* Gênero + Distribuição por Empresa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CARD: Gênero */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Distribuição por Gênero</h3>
            <span className="ml-auto text-xs text-gray-400">{total} promotores</span>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="h-24 flex items-center justify-center text-gray-300 text-sm">Carregando...</div>
            ) : (
              <>
                {/* Barra visual */}
                <div className="flex h-8 w-full rounded-xl overflow-hidden mb-5 shadow-inner">
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-extrabold transition-all duration-700"
                    style={{ width: `${pctM}%` }}
                  >
                    {pctM > 8 ? `${pctM}%` : ''}
                  </div>
                  <div
                    className="bg-pink-400 flex items-center justify-center text-white text-xs font-extrabold transition-all duration-700"
                    style={{ width: `${pctF}%` }}
                  >
                    {pctF > 8 ? `${pctF}%` : ''}
                  </div>
                </div>

                {/* Legenda */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-lg">👨</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Masculino</p>
                      <p className="text-2xl font-black text-blue-900">{generos.m}</p>
                      <p className="text-xs text-blue-500 font-semibold">{pctM}% do total</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-pink-50 rounded-xl p-4 border border-pink-100">
                    <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                      <span className="text-lg">👩</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">Feminino</p>
                      <p className="text-2xl font-black text-pink-900">{generos.f}</p>
                      <p className="text-xs text-pink-500 font-semibold">{pctF}% do total</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CARD: Por Empresa */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Promotores por Empresa</h3>
          </div>
          <div className="p-5 space-y-3">
            {isLoading ? (
              <div className="h-24 flex items-center justify-center text-gray-300 text-sm">Carregando...</div>
            ) : porEmpresa.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma empresa cadastrada.</p>
            ) : (
              porEmpresa.map((emp) => {
                const pct = total > 0 ? Math.round((emp.total / total) * 100) : 0;
                return (
                  <div key={emp.nome} className="flex items-center gap-3">
                    <p className="text-xs font-bold text-gray-700 uppercase w-32 shrink-0 truncate">{emp.nome}</p>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex gap-2 shrink-0 items-center">
                      <span className="text-xs font-black text-gray-800 w-6 text-right">{emp.total}</span>
                      <span className="text-[10px] font-bold text-gray-400 w-9">{pct}%</span>
                    </div>
                  </div>
                );
              })
            )}
            {funcionarios.filter(f => !f.empresa_id).length > 0 && (
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase w-32 shrink-0 truncate italic">Sem empresa</p>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-300 rounded-full"
                    style={{ width: `${total > 0 ? Math.round((funcionarios.filter(f => !f.empresa_id).length / total) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex gap-2 shrink-0 items-center">
                  <span className="text-xs font-black text-gray-500 w-6 text-right">{funcionarios.filter(f => !f.empresa_id).length}</span>
                  <span className="text-[10px] font-bold text-gray-400 w-9">
                    {total > 0 ? Math.round((funcionarios.filter(f => !f.empresa_id).length / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BUSCA DE FUNCIONÁRIOS */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Busca de Funcionários</h3>
          </div>
          <div className="relative flex-1 sm:ml-auto sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={dashSearch}
              onChange={e => setDashSearch(e.target.value)}
              placeholder="Nome, CPF, cargo, conta..."
              className="block w-full rounded-lg border-0 py-2 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium shrink-0">
            {funcsFiltrados.length} de {totalFuncs} — ordem A→Z
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando funcionários...</div>
        ) : funcsFiltrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum funcionário encontrado para "{dashSearch}".</div>
        ) : (
          <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {funcsFiltrados.map(func => {
              const genero = detectarGenero(func.nome);
              const cpf = func.dados_extras?.CPF || '';
              const conta = func.dados_extras?.Empresa || '';
              return (
                <li key={func.id}
                  onClick={() => navigate('/funcionarios')}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-indigo-50/40 cursor-pointer transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${genero === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                    {String(func.nome || '?').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{String(func.nome || '').toUpperCase()}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {func.cargo || 'Sem cargo'}{cpf ? ` • ${cpf}` : ''}{conta ? ` • ${conta}` : ''}
                    </p>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${genero === 'F' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {genero === 'F' ? '♀ Fem' : '♂ Mas'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/funcionarios', icon: Users, label: 'Funcionários', color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
            { to: '/templates', icon: Star, label: 'Templates', color: 'text-yellow-600', bg: 'bg-yellow-50 hover:bg-yellow-100' },
            { to: '/documentos', icon: FileText, label: 'Documentos', color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100' },
            { to: '/empresas', icon: Building2, label: 'Empresas', color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100' },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${item.bg} border border-transparent hover:border-gray-200 transition-all text-center`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
              <span className={`text-xs font-bold ${item.color}`}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
