import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Users, Building2, Search, BarChart3, PieChart,
  FileSignature, ArrowUpRight, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/cn';
import { PageHeader, Panel, Button, Skeleton, EmptyState } from '../components/ui';

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

const normalizar = (str) =>
  String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const fmt = new Intl.NumberFormat('pt-BR');

function Stat({ label, value, hint, loading, tone = 'default', to, className }) {
  const Comp = to ? Link : 'div';
  return (
    <Comp
      to={to}
      className={cn(
        'panel flex flex-col gap-2 p-5',
        to && 'hover:border-slate-300',
        className,
      )}
    >
      <p className="text-sm text-slate-500">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className={cn('text-[2rem] font-semibold leading-none tracking-tight tabular-nums', tone === 'alert' && value > 0 ? 'text-signal-600' : 'text-ink')}>
          {fmt.format(value)}
        </p>
      )}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </Comp>
  );
}

function Bar({ label, value, total, muted }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-4">
      <p className={cn('truncate text-sm', muted ? 'text-slate-400' : 'text-slate-700')} title={label}>{label}</p>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-out', muted ? 'bg-slate-300' : 'bg-brand-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-sm tabular-nums">
        <span className="font-medium text-ink">{fmt.format(value)}</span>
        <span className="ml-1.5 text-slate-400">{pct}%</span>
      </p>
    </div>
  );
}

const ATALHOS = [
  { to: '/documentos', icon: FileText, label: 'Gerar documentos', desc: 'Cartas e notas em PDF, uma a uma ou em lote' },
  { to: '/funcionarios', icon: Users, label: 'Funcionários', desc: 'Cadastro e vínculo com empresas' },
  { to: '/templates', icon: FileSignature, label: 'Templates', desc: 'Modelos de PDF e posição dos campos' },
  { to: '/empresas', icon: Building2, label: 'Empresas', desc: 'Agências, clientes e carimbos' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [totalDocsGerados, setTotalDocsGerados] = useState(0);
  const [funcionarios, setFuncionarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [dashSearch, setDashSearch] = useState('');
  const deferredSearch = useDeferredValue(dashSearch);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [fData, pData, eData, cData] = await Promise.all([
          supabase.from('funcionarios').select('id, nome, cargo, empresa_id, dados_extras, criado_em').order('criado_em', { ascending: false }),
          supabase.from('pdf_templates').select('*', { count: 'exact', head: true }),
          supabase.from('empresas').select('id, nome'),
          supabase.from('cartas_geradas').select('*', { count: 'exact', head: true }),
        ]);
        if (cancelled) return;
        const firstError = [fData, pData, eData, cData].find((r) => r.error)?.error;
        if (firstError) throw firstError;
        setFuncionarios(fData.data || []);
        setTotalTemplates(pData.count || 0);
        setEmpresas(eData.data || []);
        setTotalDocsGerados(cData.count || 0);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        if (!cancelled) setLoadError('Não foi possível carregar os dados. Verifique a conexão e recarregue a página.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  // Cálculos derivados memorizados: não refazem a cada tecla digitada na busca
  const enriched = useMemo(
    () =>
      funcionarios
        .map((f) => ({ ...f, _genero: detectarGenero(f.nome), _busca: normalizar(`${f.nome} ${f.dados_extras?.CPF ?? ''} ${f.dados_extras?.Empresa ?? ''} ${f.cargo ?? ''}`) }))
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')),
    [funcionarios],
  );

  const total = enriched.length;
  const semEmpresa = useMemo(() => enriched.filter((f) => !f.empresa_id).length, [enriched]);

  const generos = useMemo(
    () => enriched.reduce((acc, f) => { if (f._genero === 'F') acc.f++; else acc.m++; return acc; }, { m: 0, f: 0 }),
    [enriched],
  );

  const porEmpresa = useMemo(() => {
    const counts = new Map();
    for (const f of enriched) if (f.empresa_id) counts.set(f.empresa_id, (counts.get(f.empresa_id) || 0) + 1);
    return empresas
      .map((emp) => ({ id: emp.id, nome: emp.nome, total: counts.get(emp.id) || 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [empresas, enriched]);

  const filtrados = useMemo(() => {
    const q = normalizar(deferredSearch);
    return q ? enriched.filter((f) => f._busca.includes(q)) : enriched;
  }, [enriched, deferredSearch]);

  const pctM = total > 0 ? Math.round((generos.m / total) * 100) : 0;
  const pctF = total > 0 ? 100 - pctM : 0;

  return (
    <div>
      <PageHeader
        title="Painel"
        description="Quem está cadastrado, onde está alocado e o que já foi emitido."
        actions={
          <Button as={Link} to="/funcionarios" variant="secondary">
            <Users className="h-4 w-4" aria-hidden="true" />
            Ver funcionários
          </Button>
        }
      />

      {loadError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {loadError}
        </div>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Stat label="Promotores" value={total} loading={isLoading} to="/funcionarios" />
        <Stat label="Empresas" value={empresas.length} loading={isLoading} to="/empresas" />
        <Stat label="Templates" value={totalTemplates} loading={isLoading} to="/templates" />
        <Stat label="Documentos emitidos" value={totalDocsGerados} loading={isLoading} to="/historico" />
        <Stat
          label="Sem empresa"
          value={semEmpresa}
          loading={isLoading}
          tone="alert"
          hint={!isLoading && semEmpresa > 0 ? 'Precisam de vínculo' : undefined}
          to="/funcionarios"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Por empresa */}
        <Panel title="Promotores por empresa" icon={BarChart3} className="lg:col-span-3" bodyClassName="space-y-4 p-5">
          {isLoading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5" />)
          ) : porEmpresa.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma empresa cadastrada"
              description="Cadastre uma empresa para vincular os promotores."
              action={<Button as={Link} to="/empresas" size="sm">Cadastrar empresa</Button>}
            />
          ) : (
            <>
              {porEmpresa.map((emp) => <Bar key={emp.id} label={emp.nome} value={emp.total} total={total} />)}
              {semEmpresa > 0 && (
                <div className="border-t border-line-soft pt-4">
                  <Bar label="Sem vínculo" value={semEmpresa} total={total} muted />
                </div>
              )}
            </>
          )}
        </Panel>

        {/* Gênero */}
        <Panel title="Distribuição por gênero" icon={PieChart} meta={!isLoading && `${fmt.format(total)} pessoas`} className="lg:col-span-2" bodyClassName="flex flex-col justify-center gap-6 p-5">
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <>
              <div className="flex h-2.5 w-full gap-1 overflow-hidden">
                <div className="rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${pctM}%` }} title={`Masculino: ${pctM}%`} />
                <div className="rounded-full bg-signal-500 transition-[width] duration-700" style={{ width: `${pctF}%` }} title={`Feminino: ${pctF}%`} />
              </div>
              <dl className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Masculino', value: generos.m, pct: pctM, dot: 'bg-brand-600' },
                  { label: 'Feminino', value: generos.f, pct: pctF, dot: 'bg-signal-500' },
                ].map((g) => (
                  <div key={g.label}>
                    <dt className="flex items-center gap-2 text-sm text-slate-500">
                      <span className={cn('h-2 w-2 rounded-full', g.dot)} aria-hidden="true" />
                      {g.label}
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-ink">
                      {fmt.format(g.value)}
                      <span className="ml-2 text-sm font-normal text-slate-400">{g.pct}%</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-slate-400">Estimado pelo primeiro nome.</p>
            </>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Diretório */}
        <Panel
          title="Diretório de promotores"
          className="lg:col-span-2"
          actions={
            <label className="relative block w-44 sm:w-64">
              <span className="sr-only">Buscar promotor</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={dashSearch}
                onChange={(e) => setDashSearch(e.target.value)}
                placeholder="Nome, CPF, empresa…"
                className="h-9 w-full border bg-white pl-9 pr-3 text-sm text-ink"
              />
            </label>
          }
        >
          {isLoading ? (
            <div className="space-y-3 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={Search}
              title={dashSearch ? 'Ninguém encontrado' : 'Nenhum promotor cadastrado'}
              description={dashSearch ? 'Confira a grafia ou busque pelo CPF.' : 'Cadastre o primeiro promotor para começar.'}
            />
          ) : (
            <>
              <ul className="max-h-[22rem] divide-y divide-line-soft overflow-y-auto">
                {filtrados.slice(0, 200).map((func) => (
                  <li key={func.id}>
                    <button
                      type="button"
                      onClick={() => navigate('/funcionarios')}
                      className="group flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-slate-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {String(func.nome || '?').trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink group-hover:text-brand-700">{func.nome}</span>
                        <span className="block truncate text-xs text-slate-500">{func.cargo || 'Cargo não informado'}</span>
                      </span>
                      <span className="hidden w-36 text-right text-sm tabular-nums text-slate-500 sm:block">
                        {func.dados_extras?.CPF || '—'}
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-600" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="border-t border-line-soft px-5 py-2.5 text-xs text-slate-500">
                {filtrados.length > 200
                  ? `Mostrando 200 de ${fmt.format(filtrados.length)} — refine a busca para ver os demais`
                  : `${fmt.format(filtrados.length)} de ${fmt.format(total)} promotores`}
              </p>
            </>
          )}
        </Panel>

        {/* Atalhos */}
        <Panel title="Atalhos" bodyClassName="p-2">
          <ul>
            {ATALHOS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="group flex items-start gap-3 rounded-lg p-3 hover:bg-slate-50">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink group-hover:text-brand-700">{item.label}</span>
                    <span className="block text-xs leading-relaxed text-slate-500">{item.desc}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
