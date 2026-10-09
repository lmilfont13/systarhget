import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Users, Building2, Search, BarChart3, CalendarDays,
  FileSignature, ArrowUpRight, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/cn';
import { PageHeader, Panel, Button, Skeleton, EmptyState } from '../components/ui';


const normalizar = (str) =>
  String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const fmt = new Intl.NumberFormat('pt-BR');
const DIAS_GRAFICO = 30;
const fmtDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const chaveDia = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

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
  const [cartasRecentes, setCartasRecentes] = useState([]);
  const [dashSearch, setDashSearch] = useState('');
  const deferredSearch = useDeferredValue(dashSearch);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const inicio = new Date();
        inicio.setDate(inicio.getDate() - DIAS_GRAFICO);
        const [fData, pData, eData, cData, rData] = await Promise.all([
          supabase.from('funcionarios').select('id, nome, cargo, empresa_id, dados_extras, criado_em').order('criado_em', { ascending: false }),
          supabase.from('pdf_templates').select('id', { count: 'exact', head: true }),
          supabase.from('empresas').select('id, nome'),
          supabase.from('cartas_geradas').select('id', { count: 'exact', head: true }),
          supabase.from('cartas_geradas').select('criado_em').gte('criado_em', inicio.toISOString()),
        ]);
        if (cancelled) return;
        const firstError = [fData, pData, eData, cData, rData].find((r) => r.error)?.error;
        if (firstError) throw firstError;
        setFuncionarios(fData.data || []);
        setTotalTemplates(pData.count || 0);
        setEmpresas(eData.data || []);
        setTotalDocsGerados(cData.count || 0);
        setCartasRecentes(rData.data || []);
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
        .map((f) => ({ ...f, _busca: normalizar(`${f.nome} ${f.dados_extras?.CPF ?? ''} ${f.dados_extras?.Empresa ?? ''} ${f.cargo ?? ''}`) }))
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')),
    [funcionarios],
  );

  const total = enriched.length;
  const semEmpresa = useMemo(() => enriched.filter((f) => !f.empresa_id).length, [enriched]);


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

  const emissoes = useMemo(() => {
    const dias = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    for (let i = DIAS_GRAFICO - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      dias.push({ chave: chaveDia(d), data: d, total: 0 });
    }
    const porChave = new Map(dias.map((d) => [d.chave, d]));
    for (const c of cartasRecentes) {
      const dia = porChave.get(chaveDia(new Date(c.criado_em)));
      if (dia) dia.total += 1;
    }
    return dias;
  }, [cartasRecentes]);
  const totalPeriodo = emissoes.reduce((acc, d) => acc + d.total, 0);
  const maxDia = Math.max(1, ...emissoes.map((d) => d.total));

  return (
    <div>
      <PageHeader
        title="Painel"
        description="Quem está cadastrado, onde está alocado e o que foi emitido no último mês."
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

        {/* Emissões */}
        <Panel
          title="Documentos emitidos"
          icon={CalendarDays}
          meta={!isLoading && `${fmt.format(totalPeriodo)} nos últimos ${DIAS_GRAFICO} dias`}
          className="lg:col-span-2"
          bodyClassName="flex flex-col justify-end p-5"
        >
          {isLoading ? (
            <Skeleton className="h-36" />
          ) : totalPeriodo === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum documento no período"
              description="As cartas emitidas aparecem aqui, dia a dia."
              action={<Button as={Link} to="/documentos" size="sm">Gerar documento</Button>}
              className="py-6"
            />
          ) : (
            <figure>
              <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={`${totalPeriodo} documentos emitidos nos últimos ${DIAS_GRAFICO} dias`}>
                {emissoes.map((d) => (
                  <div key={d.chave} className="group relative flex h-full flex-1 items-end">
                    <div
                      className={cn('w-full rounded-t-[3px] transition-colors', d.total > 0 ? 'bg-brand-500 group-hover:bg-brand-700' : 'bg-slate-100')}
                      style={{ height: d.total > 0 ? `${Math.max(6, (d.total / maxDia) * 100)}%` : '3px' }}
                    />
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white group-hover:block">
                      {fmtDia.format(d.data)}: {d.total}
                    </span>
                  </div>
                ))}
              </div>
              <figcaption className="mt-2 flex justify-between text-xs text-slate-400">
                <span>{fmtDia.format(emissoes[0].data)}</span>
                <span>Hoje</span>
              </figcaption>
            </figure>
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
