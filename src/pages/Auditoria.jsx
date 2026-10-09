import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ChevronDown, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/cn';
import { PageHeader, Panel, EmptyState, Button, Skeleton } from '../components/ui';

const PAGE_SIZE = 50;

const TABELAS = {
  funcionarios: { singular: 'funcionário', label: 'Funcionários' },
  empresas: { singular: 'empresa', label: 'Empresas' },
  templates: { singular: 'template de texto', label: 'Templates de texto' },
  pdf_templates: { singular: 'template de PDF', label: 'Templates de PDF' },
  cartas_geradas: { singular: 'documento', label: 'Documentos emitidos' },
  estoque: { singular: 'item de estoque', label: 'Estoque' },
  produtos: { singular: 'produto', label: 'Catálogo de produtos' },
};

const OPERACOES = {
  INSERT: { verbo: 'criou', tone: 'bg-brand-50 text-brand-700' },
  UPDATE: { verbo: 'alterou', tone: 'bg-signal-50 text-signal-700' },
  DELETE: { verbo: 'excluiu', tone: 'bg-red-50 text-red-700' },
};

// Campos técnicos que não interessam a quem lê o histórico
const CAMPOS_OCULTOS = new Set(['id', 'criado_em', 'created_at', 'atualizado_em', 'criado_por']);

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function nomeDoRegistro(evento) {
  const r = evento.depois || evento.antes || {};
  return r.nome || r.nome_funcionario || r.name || r.nome_arquivo || r.nomeNovo || (evento.registro_id ? `#${String(evento.registro_id).slice(0, 8)}` : '');
}

function formatValor(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function camposAlterados(evento) {
  const antes = evento.antes || {};
  const depois = evento.depois || {};
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  return [...chaves]
    .filter((k) => !CAMPOS_OCULTOS.has(k))
    .filter((k) => evento.operacao !== 'UPDATE' || JSON.stringify(antes[k]) !== JSON.stringify(depois[k]))
    .filter((k) => evento.operacao === 'UPDATE' || formatValor(evento.operacao === 'DELETE' ? antes[k] : depois[k]) !== '—')
    .map((k) => ({ campo: k, antes: antes[k], depois: depois[k] }));
}

function Evento({ evento }) {
  const [aberto, setAberto] = useState(false);
  const op = OPERACOES[evento.operacao] ?? OPERACOES.UPDATE;
  const tabela = TABELAS[evento.tabela]?.singular ?? evento.tabela;
  const campos = aberto ? camposAlterados(evento) : null;

  return (
    <li>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50"
      >
        <span className={cn('mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium', op.tone)}>{op.verbo}</span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="text-slate-500">{tabela} </span>
          <span className="font-medium text-ink">{nomeDoRegistro(evento)}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {evento.usuario_email || 'Sistema ou integração'}
          </span>
        </span>
        <time className="shrink-0 text-xs tabular-nums text-slate-400" dateTime={evento.ocorreu_em}>
          {dataHora.format(new Date(evento.ocorreu_em))}
        </time>
        <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>
      {aberto && (
        <div className="border-t border-line-soft bg-slate-50 px-5 py-3">
          {campos.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum campo visível mudou.</p>
          ) : (
            <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-[10rem_1fr]">
              {campos.map((c) => (
                <div key={c.campo} className="contents">
                  <dt className="truncate font-medium text-slate-600" title={c.campo}>{c.campo}</dt>
                  <dd className="min-w-0 break-words text-slate-700">
                    {evento.operacao === 'UPDATE' ? (
                      <>
                        <span className="text-red-700 line-through decoration-red-300">{formatValor(c.antes)}</span>
                        <span className="mx-1.5 text-slate-400" aria-hidden="true">→</span>
                        <span className="text-brand-800">{formatValor(c.depois)}</span>
                      </>
                    ) : (
                      formatValor(evento.operacao === 'DELETE' ? c.antes : c.depois)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </li>
  );
}

export default function Auditoria() {
  const [eventos, setEventos] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [tabela, setTabela] = useState('');
  const [operacao, setOperacao] = useState('');
  const [usuario, setUsuario] = useState('');
  const [recarregar, setRecarregar] = useState(0);

  const consultar = useCallback(
    (offset) => {
      let q = supabase
        .from('audit_log')
        .select('id, ocorreu_em, usuario_email, tabela, operacao, registro_id, antes, depois')
        .order('ocorreu_em', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (tabela) q = q.eq('tabela', tabela);
      if (operacao) q = q.eq('operacao', operacao);
      if (usuario.trim()) q = q.ilike('usuario_email', `%${usuario.trim()}%`);
      return q;
    },
    [tabela, operacao, usuario],
  );

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      setStatus('loading');
      const { data, error } = await consultar(0);
      if (cancelado) return;
      if (error) {
        const ausente = error.code === '42P01' || error.code === 'PGRST205' || /audit_log/.test(error.message || '');
        setStatus(ausente ? 'missing' : 'error');
        setEventos([]);
        return;
      }
      setEventos(data);
      setTemMais(data.length === PAGE_SIZE);
      setStatus('ready');
    }, 250);
    return () => { cancelado = true; clearTimeout(t); };
  }, [consultar, recarregar]);

  const carregarMais = async () => {
    setCarregandoMais(true);
    const { data, error } = await consultar(eventos.length);
    setCarregandoMais(false);
    if (error) return;
    setEventos((prev) => [...prev, ...data]);
    setTemMais(data.length === PAGE_SIZE);
  };

  const filtrosAtivos = Boolean(tabela || operacao || usuario.trim());
  const opcoesTabela = useMemo(() => Object.entries(TABELAS), []);

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Quem criou, alterou ou excluiu cada registro, e quando. O registro é feito pelo próprio banco e não pode ser editado."
        actions={
          <Button variant="secondary" onClick={() => setRecarregar((n) => n + 1)} disabled={status === 'loading'}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Atualizar
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
        <label className="block">
          <span className="sr-only">Filtrar por usuário</span>
          <input
            type="search"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Filtrar por e-mail do usuário"
            className="h-9 w-full border bg-white px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="sr-only">Cadastro</span>
          <select value={tabela} onChange={(e) => setTabela(e.target.value)} className="h-9 w-full border bg-white px-3 text-sm">
            <option value="">Todos os cadastros</option>
            {opcoesTabela.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Ação</span>
          <select value={operacao} onChange={(e) => setOperacao(e.target.value)} className="h-9 w-full border bg-white px-3 text-sm">
            <option value="">Todas as ações</option>
            <option value="INSERT">Criações</option>
            <option value="UPDATE">Alterações</option>
            <option value="DELETE">Exclusões</option>
          </select>
        </label>
      </div>

      <Panel>
        {status === 'loading' && (
          <div className="space-y-3 p-5">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        )}

        {status === 'missing' && (
          <EmptyState
            icon={ShieldCheck}
            title="A auditoria ainda não foi ativada no banco"
            description="Aplique a migração de segurança do Supabase. A partir daí, cada criação, alteração e exclusão aparece aqui."
            className="py-16"
          />
        )}

        {status === 'error' && (
          <EmptyState
            icon={AlertTriangle}
            title="Não foi possível carregar a auditoria"
            description="Verifique a conexão. Se persistir, confirme que sua conta é de administrador."
            className="py-16"
          />
        )}

        {status === 'ready' && eventos.length === 0 && (
          <EmptyState
            icon={ShieldCheck}
            title={filtrosAtivos ? 'Nenhum registro com esses filtros' : 'Nenhuma alteração registrada ainda'}
            description={filtrosAtivos ? 'Limpe os filtros para ver todo o histórico.' : 'As próximas mudanças em cadastros, estoque e documentos aparecem aqui.'}
            className="py-16"
          />
        )}

        {status === 'ready' && eventos.length > 0 && (
          <>
            <ul className="divide-y divide-line-soft">
              {eventos.map((e) => <Evento key={e.id} evento={e} />)}
            </ul>
            {temMais && (
              <div className="border-t border-line-soft p-3 text-center">
                <Button variant="ghost" size="sm" onClick={carregarMais} disabled={carregandoMais}>
                  {carregandoMais && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
