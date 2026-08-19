import { useState, useEffect } from 'react';
import { FileText, Users, Star, Building2, Search, BarChart3, PieChart, Activity, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Detecta gênero pelo nome (heurística por terminação)
function detectarGenero(nome) {
  if (!nome) return 'indefinido';
  const parts = nome.trim().toUpperCase().split(' ');
  const primeiro = parts[0];

  const nomesF = new Set([
    'MARIA', 'ANA', 'PATRICIA', 'FERNANDA', 'JULIANA', 'CAMILA', 'AMANDA',
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
    'MADALENA', 'MAIANE', 'MAISA', 'MARCELA', 'MILENA', 'MIRIAM', 'MIRIAN'
  ]);

  const nomesM = new Set([
    'JOAO', 'JOSE', 'PEDRO', 'PAULO', 'CARLOS', 'LUIZ', 'LUIS', 'ANTONIO', 'FRANCISCO',
    'MARCOS', 'LUCAS', 'GABRIEL', 'RAFAEL', 'DANIEL', 'FELIPE', 'RODRIGO', 'ALEXANDRE',
    'ANDERSON', 'ANDRE', 'CAIO', 'CLEITON', 'CLEBER', 'CRISTIANO',
    'DIEGO', 'DIMAS', 'EDSON', 'EDUARDO', 'ELIAS', 'ELVIS', 'EMERSON', 'ERICK',
    'FABIO', 'FERNANDO', 'FLAVIO', 'GEOVANE', 'GILBERTO', 'GIOVANE', 'GUILHERME',
    'GUSTAVO', 'HEITOR', 'HENRIQUE', 'HUGO', 'IGOR', 'ISAAC', 'ISRAEL', 'IVAN',
    'JEAN', 'JEFFERSON', 'JONATHAN', 'JORGE', 'JULIO', 'LEANDRO', 'LEONARDO',
    'LUAN', 'MARCELO', 'MARCIO', 'MARIO', 'MATEUS', 'MATHEUS', 'MAURO',
    'MAXWELL', 'MICHEL', 'MIGUEL', 'NILTON', 'OSCAR', 'REGINALDO',
    'REINALDO', 'RENATO', 'ROBERTO', 'ROGERIO', 'RONALDO', 'RUAN', 'SAMUEL', 'SERGIO',
    'SILVIO', 'TIAGO', 'VAGNER', 'VALDO', 'VINICIUS', 'VITOR', 'WAGNER', 'WALTER',
    'WELLINGTON', 'WESLEY', 'WILLIAM', 'WILLIAN', 'WILSON', 'YAGO', 'JONAS', 'JOELMO',
    'ADAILTON', 'ALISSON', 'ALEX', 'ALEXSANDRO', 'AMILTON', 'ADAO', 'AFONSO',
    'AIRTON', 'ALAN', 'ALBERTO', 'ALDENIR', 'ALDERSON', 'ALEXANDRO', 'ALFREDO',
    'ALLAN', 'ALMIR', 'ALTAIR', 'ALTAMIRO', 'ALTEMIRO', 'ALVES', 'AMANCIO'
  ]);

  if (nomesF.has(primeiro)) return 'F';
  if (nomesM.has(primeiro)) return 'M';
  if (primeiro.endsWith('A') && !primeiro.endsWith('CA') && !primeiro.endsWith('MA')) return 'F';
  return 'M';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [totalFuncs, setTotalFuncs] = useState(0);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [totalEmpresas, setTotalEmpresas] = useState(0);
  const [totalDocsGerados, setTotalDocsGerados] = useState(0);
  const [funcionarios, setFuncionarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  
  const [dashSearch, setDashSearch] = useState('');

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

  const generos = funcionarios.reduce((acc, f) => {
    const g = detectarGenero(f.nome);
    if (g === 'F') acc.f++;
    else acc.m++;
    return acc;
  }, { m: 0, f: 0 });

  const total = generos.m + generos.f;
  const pctM = total > 0 ? Math.round((generos.m / total) * 100) : 0;
  const pctF = total > 0 ? Math.round((generos.f / total) * 100) : 0;

  const porEmpresa = empresas.map(emp => ({
    nome: emp.nome,
    total: funcionarios.filter(f => f.empresa_id === emp.id).length
  })).sort((a, b) => b.total - a.total).slice(0, 5);

  useEffect(() => {
    async function loadData() {
      try {
        const [fData, pData, eData, cData] = await Promise.all([
          supabase.from('funcionarios').select('id, nome, cargo, empresa_id, dados_extras, criado_em').order('criado_em', { ascending: false }),
          supabase.from('pdf_templates').select('*', { count: 'exact', head: true }),
          supabase.from('empresas').select('id, nome'),
          supabase.from('cartas_geradas').select('*', { count: 'exact', head: true })
        ]);

        const funcs = fData.data || [];
        setFuncionarios(funcs);
        setTotalFuncs(funcs.length);
        setTotalTemplates(pData.count || 0);
        setEmpresas(eData.data || []);
        setTotalEmpresas((eData.data || []).length);
        setTotalDocsGerados(cData.count || 0);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Painel de Controle</h1>
          <p className="mt-1 text-sm text-slate-500">Visão corporativa do sistema de gestão de promotores</p>
        </div>
      </div>

      {/* Cards de KPI - Corporate Style */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Promotores', value: totalFuncs, icon: Users, color: 'text-blue-600', hoverBg: 'bg-blue-600', iconBg: 'bg-blue-50' },
          { label: 'Empresas', value: totalEmpresas, icon: Building2, color: 'text-violet-600', hoverBg: 'bg-violet-600', iconBg: 'bg-violet-50' },
          { label: 'Templates', value: totalTemplates, icon: Star, color: 'text-emerald-600', hoverBg: 'bg-emerald-600', iconBg: 'bg-emerald-50' },
          { label: 'Docs Gerados', value: totalDocsGerados, icon: FileText, color: 'text-amber-600', hoverBg: 'bg-amber-600', iconBg: 'bg-amber-50' },
          { label: 'Sem Empresa', value: funcionarios.filter(f => !f.empresa_id).length, icon: Activity, color: 'text-rose-600', hoverBg: 'bg-rose-600', iconBg: 'bg-rose-50' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white border border-slate-200 shadow-sm p-5 flex flex-col justify-center rounded-lg relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{kpi.label}</p>
              <div className={`p-1.5 rounded-md ${kpi.iconBg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-80`} />
              </div>
            </div>
            <p className="text-2xl font-light text-slate-800 tracking-tight">{isLoading ? '-' : kpi.value}</p>
            {/* Subtle bottom accent line */}
            <div className={`absolute bottom-0 left-0 h-[3px] ${kpi.hoverBg} w-0 group-hover:w-full transition-all duration-500`}></div>
          </div>
        ))}
      </div>

      {/* Gênero + Distribuição por Empresa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CARD: Gênero */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Distribuição por Gênero</h3>
            <span className="ml-auto text-xs font-medium text-slate-400">{total} registros</span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {isLoading ? (
              <div className="h-24 flex items-center justify-center text-slate-400 text-sm">Carregando dados...</div>
            ) : (
              <>
                <div className="flex h-3 w-full bg-slate-100 overflow-hidden mb-6 rounded-md">
                  <div
                    className="bg-blue-500 transition-all duration-700"
                    style={{ width: `${pctM}%` }}
                    title={`Masculino: ${pctM}%`}
                  ></div>
                  <div
                    className="bg-pink-400 transition-all duration-700"
                    style={{ width: `${pctF}%` }}
                    title={`Feminino: ${pctF}%`}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1 border-l-2 border-blue-500 pl-4">
                    <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest">Masculino</p>
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-light text-slate-800">{generos.m}</p>
                      <p className="text-xs text-slate-500 mb-1">{pctM}%</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 border-l-2 border-pink-400 pl-4">
                    <p className="text-[10px] font-semibold text-pink-600 uppercase tracking-widest">Feminino</p>
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-light text-slate-800">{generos.f}</p>
                      <p className="text-xs text-slate-500 mb-1">{pctF}%</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CARD: Por Empresa */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-500" />
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Promotores por Empresa</h3>
          </div>
          <div className="p-6 space-y-4 flex-1">
            {isLoading ? (
              <div className="h-24 flex items-center justify-center text-slate-400 text-sm">Carregando dados...</div>
            ) : porEmpresa.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhuma empresa cadastrada.</p>
            ) : (
              porEmpresa.map((emp) => {
                const pct = total > 0 ? Math.round((emp.total / total) * 100) : 0;
                return (
                  <div key={emp.nome} className="flex items-center gap-4">
                    <p className="text-xs font-medium text-slate-600 uppercase w-36 shrink-0 truncate">{emp.nome}</p>
                    <div className="flex-1 h-1.5 bg-slate-100 overflow-hidden rounded-md">
                      <div
                        className="h-full bg-violet-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex gap-3 shrink-0 items-center justify-end w-16">
                      <span className="text-xs font-semibold text-slate-800">{emp.total}</span>
                      <span className="text-[10px] text-slate-400">{pct}%</span>
                    </div>
                  </div>
                );
              })
            )}
            {funcionarios.filter(f => !f.empresa_id).length > 0 && (
              <div className="flex items-center gap-4 mt-2 pt-3 border-t border-slate-50">
                <p className="text-xs font-medium text-slate-400 uppercase w-36 shrink-0 truncate">Sem vínculo</p>
                <div className="flex-1 h-1.5 bg-slate-50 overflow-hidden rounded-sm">
                  <div
                    className="h-full bg-slate-300"
                    style={{ width: `${total > 0 ? Math.round((funcionarios.filter(f => !f.empresa_id).length / total) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex gap-3 shrink-0 items-center justify-end w-16">
                  <span className="text-xs font-semibold text-slate-500">{funcionarios.filter(f => !f.empresa_id).length}</span>
                  <span className="text-[10px] text-slate-400">
                    {total > 0 ? Math.round((funcionarios.filter(f => !f.empresa_id).length / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BUSCA DE FUNCIONÁRIOS */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Diretório de Promotores</h3>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={dashSearch}
                onChange={e => setDashSearch(e.target.value)}
                placeholder="Pesquisar registros..."
                className="block w-full border border-slate-200 py-1.5 pl-9 pr-3 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-xs bg-white rounded-md placeholder:text-slate-400 transition-colors outline-none"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {isLoading ? (
              <div className="p-10 text-center text-xs text-slate-400">Carregando diretório...</div>
            ) : funcsFiltrados.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">Nenhum registro encontrado para a busca.</div>
            ) : (
              <>
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-2 flex text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  <div className="w-10"></div>
                  <div className="flex-1">Nome Completo</div>
                  <div className="w-32 hidden sm:block">CPF</div>
                  <div className="w-24 text-right">Status</div>
                </div>
                <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {funcsFiltrados.map(func => {
                    const genero = detectarGenero(func.nome);
                    const cpf = func.dados_extras?.CPF || '—';
                    return (
                      <li key={func.id}
                        onClick={() => navigate('/funcionarios')}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors group">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${genero === 'F' ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {String(func.nome || '?').charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                            {String(func.nome || '').toUpperCase()}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {func.cargo || 'Não especificado'}
                          </p>
                        </div>
                        <div className="w-32 hidden sm:block text-xs text-slate-500 font-mono">
                          {cpf}
                        </div>
                        <div className="w-24 text-right">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${genero === 'F' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                            {genero === 'F' ? 'Feminino' : 'Masculino'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="p-3 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 text-center uppercase tracking-widest">
                  Mostrando {funcsFiltrados.length} de {totalFuncs} registros
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Acesso Rápido</h3>
          </div>
          <div className="p-5 flex flex-col gap-3">
            {[
              { to: '/funcionarios', icon: Users, label: 'Gestão de Promotores', desc: 'Cadastros e vínculos', color: 'text-blue-600', bg: 'bg-blue-50' },
              { to: '/templates', icon: Star, label: 'Templates de PDF', desc: 'Configuração de layouts', color: 'text-amber-600', bg: 'bg-amber-50' },
              { to: '/documentos', icon: FileText, label: 'Gerar Documentos', desc: 'Emissão em lote', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { to: '/empresas', icon: Building2, label: 'Cadastro de Empresas', desc: 'Agências e Lojas', color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map((item, idx) => (
              <Link key={idx} to={item.to}
                className="flex items-center gap-4 p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white transition-all rounded-lg group">
                <div className={`w-10 h-10 ${item.bg} ${item.color} flex items-center justify-center rounded-lg shrink-0 group-hover:scale-105 transition-transform`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{item.label}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">{item.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
