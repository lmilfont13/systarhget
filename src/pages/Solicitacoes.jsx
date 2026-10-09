import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Inbox, Bot, RefreshCw, Check, X, PencilLine, Eye, Loader2, MessageCircle, AlertTriangle, Trash2, Copy,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { listarFuncionarios, listarEmpresas, listarTemplatesTexto, invalidar } from '../lib/dados';
import { carregarLojas, cadastrarSeNova } from '../lib/lojas';
import { registrarCarta, cartaShareUrl } from '../lib/cartas';
import { celebrarCarta } from '../lib/celebrar';
import { gerarCartaDoItem, textoDaLoja } from '../lib/gerarCartaPedido';
import {
  STATUS_ADMIN, listarSolicitacoes, acompanharPedidos, processarPedido, concluirPedido,
  recusarPedido, definirTemplatePadrao, salvarItens, linkWhatsApp, cartasDoPedido,
} from '../lib/pedidos';
import { PageHeader, Panel, Button, Skeleton, EmptyState } from '../components/ui';
import CargoSelect from '../components/CargoSelect';
import { cn } from '../lib/cn';

const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const PENDENTES = ['recebida', 'processando', 'revisao', 'erro'];

const TOM_STATUS = {
  recebida: 'bg-slate-100 text-slate-600',
  processando: 'bg-amber-50 text-amber-800',
  revisao: 'bg-brand-50 text-brand-700',
  erro: 'bg-red-50 text-red-700',
  aprovada: 'bg-emerald-50 text-emerald-700',
  recusada: 'bg-slate-100 text-slate-500',
};
const TOM_CONFIANCA = {
  alta: ['bg-emerald-50 text-emerald-700', 'Confiança alta'],
  media: ['bg-amber-50 text-amber-800', 'Confira'],
  revisar: ['bg-red-50 text-red-700', 'Revisar'],
};

/** Valor do seletor de loja: "id:<uuid>" para cadastrada, "nova:<texto>" para nova. */
const valorLoja = (loja) => (loja?.id ? `id:${loja.id}` : loja?.nome ? `nova:${loja.nome}` : '');

function ItemPedido({ item, indice, pedidoId, funcionarios, lojas, editavel, onChange, onRemover, onPrevia, previaAtiva, gerando }) {
  const alternativas = useMemo(() => item.promotor?.alternativas || [], [item.promotor?.alternativas]);
  const outros = useMemo(
    () => funcionarios.filter((f) => !alternativas.some((a) => a.id === f.id)).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')),
    [funcionarios, alternativas],
  );
  const func = funcionarios.find((f) => f.id === item.promotor?.id);
  const [tom, rotulo] = TOM_CONFIANCA[item.confianca] || TOM_CONFIANCA.revisar;

  const corrigirHref = `/documentos?${new URLSearchParams({
    pedido: pedidoId,
    ...(item.promotor?.id ? { func: item.promotor.id } : {}),
    ...(item.template_id ? { tpl: item.template_id } : {}),
    ...(item.loja?.nome ? { loja: textoDaLoja(lojas.find((l) => l.id === item.loja.id) || { nome: item.loja.nome }) } : {}),
    ...(item.cargo ? { cargo: item.cargo } : {}),
  })}`;

  return (
    <div className={cn('rounded-xl border p-4', previaAtiva ? 'border-brand-300 bg-brand-50/30' : 'border-line bg-white')}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">Carta {indice + 1}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tom)}>{rotulo}</span>
        {item.carta_id && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Emitida</span>}
        {editavel && (
          <button onClick={onRemover} className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label={`Tirar a carta ${indice + 1} do pedido`}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {item.trecho && <p className="mb-3 text-xs italic text-slate-500">“{item.trecho}”</p>}

      <div className="grid gap-3 2xl:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor={`prom-${indice}`}>
            Promotor <span className="font-normal text-slate-400">(escrito: {item.promotor?.mencionado || '—'})</span>
          </label>
          <select
            id={`prom-${indice}`}
            disabled={!editavel}
            value={item.promotor?.id || ''}
            onChange={(e) => {
              const f = funcionarios.find((x) => x.id === e.target.value);
              onChange({ ...item, promotor: { ...item.promotor, id: f?.id || null, nome: f?.nome || '', confianca: 'alta' } });
            }}
            className={cn('h-10 w-full border bg-white px-3 text-sm text-ink', !item.promotor?.id && 'border-red-300')}
          >
            <option value="">Escolha o promotor…</option>
            {alternativas.length > 0 && (
              <optgroup label="Sugestões dos agentes">
                {alternativas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </optgroup>
            )}
            <optgroup label="Todos os promotores">
              {outros.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </optgroup>
          </select>
          {func && <p className="text-xs text-slate-400">CPF {func.dados_extras?.CPF || '—'} · {func.cargo || 'sem cargo'}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor={`loja-${indice}`}>
            Loja <span className="font-normal text-slate-400">(escrito: {item.loja?.mencionada || '—'})</span>
          </label>
          <select
            id={`loja-${indice}`}
            disabled={!editavel}
            value={valorLoja(item.loja)}
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith('id:')) {
                const l = lojas.find((x) => x.id === v.slice(3));
                onChange({ ...item, loja: { ...item.loja, id: l.id, nome: l.nome, nova: false, confianca: 'alta' } });
              } else {
                onChange({ ...item, loja: { ...item.loja, id: null, nome: v.slice(5), nova: true } });
              }
            }}
            className={cn('h-10 w-full border bg-white px-3 text-sm text-ink', !item.loja?.nome && 'border-red-300')}
          >
            {!item.loja?.nome && <option value="">Escolha a loja…</option>}
            {item.loja?.mencionada && (
              <option value={`nova:${item.loja.mencionada}`}>Nova: {item.loja.mencionada} (cadastrar ao aprovar)</option>
            )}
            {lojas.map((l) => <option key={l.id} value={`id:${l.id}`}>{l.nome}{l.cidadeUf ? ` (${l.cidadeUf})` : ''}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block text-xs font-semibold text-slate-500">Cargo na carta</span>
        {editavel ? (
          <CargoSelect semRotulo value={item.cargo || ''} onChange={(cargo) => onChange({ ...item, cargo })} funcionarios={funcionarios} cargoDoCadastro={func?.cargo} />
        ) : (
          <p className="text-sm text-ink">{item.cargo || func?.cargo || '—'}</p>
        )}
      </div>

      {item.avisos?.length > 0 && editavel && (
        <ul className="mt-3 space-y-1">
          {item.avisos.map((a) => (
            <li key={a} className="flex items-start gap-1.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {a}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onPrevia} disabled={!item.promotor?.id || gerando}>
          {gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />} Prévia
        </Button>
        {editavel && (
          <Button size="sm" variant="ghost" as={Link} to={corrigirHref}>
            <PencilLine className="h-3.5 w-3.5" aria-hidden="true" /> Corrigir em Gerar documentos
          </Button>
        )}
        {item.carta_id && (
          <Button size="sm" variant="ghost" as="a" href={`/carta/${item.carta_id}`} target="_blank" rel="noreferrer">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Abrir carta emitida
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Solicitacoes() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState(null);
  const [filtro, setFiltro] = useState('pendentes');
  const [abertoId, setAbertoId] = useState(null);
  const [rascunho, setRascunho] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [lojas, setLojas] = useState({ lojas: [], origem: 'banco' });
  const [previa, setPrevia] = useState({ indice: null, url: null, carregando: false });
  const [acao, setAcao] = useState(null); // 'aprovar' | 'recusar' | 'reprocessar'
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [agora, setAgora] = useState(() => Date.now());

  // Relógio para liberar "Reprocessar" quando os agentes travarem
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const recarregar = useCallback(() => {
    listarSolicitacoes().then(setPedidos).catch((e) => {
      console.error(e);
      toast.error('Não foi possível carregar os pedidos.');
      setPedidos([]);
    });
  }, []);

  useEffect(() => {
    recarregar();
    Promise.all([listarFuncionarios(), listarEmpresas(), listarTemplatesTexto(), carregarLojas()])
      .then(([f, e, t, l]) => { setFuncionarios(f); setEmpresas(e); setTemplates(t); setLojas(l); })
      .catch((e) => console.error(e));
    return acompanharPedidos(recarregar);
  }, [recarregar]);

  const visiveis = useMemo(
    () => (pedidos || []).filter((p) => (filtro === 'pendentes' ? PENDENTES.includes(p.status) : true)),
    [pedidos, filtro],
  );
  const aberto = (pedidos || []).find((p) => p.id === abertoId) || null;
  const travado = aberto?.status === 'processando' && agora - new Date(aberto.atualizado_em).getTime() > 120_000;
  const editavel = aberto && (['revisao', 'erro', 'recebida'].includes(aberto.status) || travado);
  const templatePadrao = templates.find((t) => t.padrao_pedidos);

  // Ao abrir outro pedido (ou quando os agentes terminam), carrega os itens no rascunho
  const chaveItens = aberto ? `${aberto.id}:${aberto.status}:${JSON.stringify(aberto.itens).length}` : '';
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza o rascunho com o pedido aberto
    setRascunho(aberto?.itens || []);
    setPrevia((p) => { if (p.url) URL.revokeObjectURL(p.url); return { indice: null, url: null, carregando: false }; });
    setRecusando(false);
    setMotivo('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveItens]);

  const templateDoPedido = templates.find((t) => t.id === rascunho[0]?.template_id) || templatePadrao || templates[0];

  const mostrarPrevia = async (indice) => {
    const item = rascunho[indice];
    const funcionario = funcionarios.find((f) => f.id === item?.promotor?.id);
    if (!funcionario || !templateDoPedido) return;
    setPrevia((p) => ({ ...p, indice, carregando: true }));
    try {
      const lojaCad = lojas.lojas.find((l) => l.id === item.loja?.id);
      const { blob } = await gerarCartaDoItem({
        template: templateDoPedido, funcionario, empresas,
        loja: lojaCad ? textoDaLoja(lojaCad) : item.loja?.nome || '', cargo: item.cargo,
      });
      setPrevia((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
        return { indice, url: URL.createObjectURL(blob), carregando: false };
      });
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível montar a prévia.');
      setPrevia((p) => ({ ...p, carregando: false }));
    }
  };

  // Abre a prévia da primeira carta automaticamente
  useEffect(() => {
    if (rascunho[0]?.promotor?.id && templateDoPedido && funcionarios.length && previa.indice === null && !previa.carregando) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- monta a prévia ao abrir o pedido
      mostrarPrevia(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunho, templateDoPedido?.id, funcionarios.length]);

  const atualizarItem = (i, novo) => setRascunho((r) => r.map((x, j) => (j === i ? novo : x)));
  const removerItem = (i) => setRascunho((r) => r.filter((_, j) => j !== i));

  const prontoParaAprovar = rascunho.length > 0 && rascunho.every((i) => i.promotor?.id && i.loja?.nome) && templateDoPedido;

  const aprovar = async () => {
    if (!prontoParaAprovar) return;
    setAcao('aprovar');
    try {
      const itensFinais = [];
      let lojasAtuais = lojas.lojas;
      for (const item of rascunho) {
        // Já emitida numa tentativa anterior: não emite de novo
        if (item.carta_id) { itensFinais.push(item); continue; }
        const funcionario = funcionarios.find((f) => f.id === item.promotor.id);
        if (!funcionario) throw new Error(`Promotor da carta ${itensFinais.length + 1} não encontrado no cadastro.`);
        let lojaCad = lojasAtuais.find((l) => l.id === item.loja?.id);
        if (!lojaCad && item.loja?.nova) {
          const criada = await cadastrarSeNova(item.loja.nome, lojasAtuais, lojas.origem);
          if (criada) { lojaCad = criada; lojasAtuais = [...lojasAtuais, criada]; }
        }
        const lojaTexto = lojaCad ? textoDaLoja(lojaCad) : item.loja.nome;
        const { blob, empresa, nomeArquivo } = await gerarCartaDoItem({
          template: templateDoPedido, funcionario, empresas, loja: lojaTexto, cargo: item.cargo,
        });
        const { id, error } = await registrarCarta({
          funcionarioId: funcionario.id, templateId: templateDoPedido.id, empresaId: empresa?.id,
          nomeFuncionario: String(funcionario.nome).toUpperCase(), nomeArquivo, pdfBlob: blob, solicitacaoId: aberto.id,
        });
        if (error) throw error;
        itensFinais.push({ ...item, template_id: templateDoPedido.id, carta_id: id, loja: { ...item.loja, id: lojaCad?.id || null, nome: lojaCad?.nome || item.loja.nome } });
        // Guarda a carta emitida na hora: se algo falhar depois, ela não é emitida de novo
        const parcial = [...itensFinais, ...rascunho.slice(itensFinais.length)];
        setRascunho(parcial);
        await salvarItens(aberto.id, parcial);
      }
      await concluirPedido(aberto.id, user.id, itensFinais);
      setLojas((l) => ({ ...l, lojas: lojasAtuais }));
      invalidar('lojas');
      celebrarCarta({ quantidade: itensFinais.length, nome: itensFinais.length === 1 ? itensFinais[0].promotor.nome : undefined });
      recarregar();
    } catch (e) {
      console.error(e);
      toast.error(`Não foi possível concluir: ${e.message || 'tente de novo'}. As cartas já emitidas ficaram salvas e não serão repetidas.`);
    } finally {
      setAcao(null);
    }
  };

  const recusar = async () => {
    if (motivo.trim().length < 3) return;
    setAcao('recusar');
    try {
      await recusarPedido(aberto.id, motivo);
      toast.success('Pedido recusado. O supervisor vê o motivo na área dele.');
      recarregar();
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível recusar.');
    } finally {
      setAcao(null);
    }
  };

  const reprocessar = async () => {
    if (aberto.status === 'revisao' && !window.confirm('Reprocessar descarta os ajustes feitos nesta revisão. Continuar?')) return;
    setAcao('reprocessar');
    try {
      const r = await processarPedido(aberto.id);
      if (r?.status === 'erro') toast.error(r.erro || 'Os agentes não conseguiram resolver este pedido.');
      recarregar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAcao(null);
    }
  };

  const salvarRascunho = async () => {
    try {
      await salvarItens(aberto.id, rascunho);
      toast.success('Ajustes salvos.');
    } catch {
      toast.error('Não foi possível salvar os ajustes.');
    }
  };

  const mudarTemplatePadrao = async (id) => {
    try {
      await definirTemplatePadrao(id || null);
      const t = await listarTemplatesTexto({ atualizar: true });
      setTemplates(t);
      toast.success(id ? 'Template padrão dos pedidos definido.' : 'Os agentes voltam a usar o template mais usado.');
    } catch {
      toast.error('Não foi possível salvar o template padrão.');
    }
  };

  // Cartas emitidas do pedido (pela aprovação aqui ou pelo "Corrigir" em Gerar documentos)
  const [cartasAprovadas, setCartasAprovadas] = useState([]);
  useEffect(() => {
    if (aberto?.status !== 'aprovada') return undefined;
    let ativo = true;
    cartasDoPedido(aberto.id).then((c) => ativo && setCartasAprovadas(c)).catch(() => {});
    return () => { ativo = false; };
  }, [aberto?.id, aberto?.status]);

  const mensagemWhats = aberto?.status === 'aprovada'
    ? `Olá, ${String(aberto.solicitante?.nome || '').split(' ')[0]}! ${cartasAprovadas.length > 1 ? 'As cartas estão prontas' : 'A carta está pronta'}:\n` +
      cartasAprovadas.map((c) => `• ${c.nome_funcionario}: ${cartaShareUrl(c.id)}`).join('\n') +
      `\n\nVocê também encontra em ${window.location.origin}/pedir`
    : '';

  return (
    <>
      <PageHeader
        title="Pedidos de carta"
        description="Pedidos dos supervisores, já resolvidos pelos agentes. Confira e aprove."
        actions={
          <Button variant="secondary" as="a" href="/pedir" target="_blank" rel="noreferrer">
            <Copy className="h-4 w-4" aria-hidden="true" /> Área dos supervisores
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {/* Lista */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {[['pendentes', 'Para revisar'], ['todas', 'Todos']].map(([k, r]) => (
              <button key={k} onClick={() => setFiltro(k)} className={cn('h-8 rounded-md', filtro === k ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink')}>
                {r}{k === 'pendentes' && pedidos ? ` (${pedidos.filter((p) => PENDENTES.includes(p.status)).length})` : ''}
              </button>
            ))}
          </div>

          {pedidos === null ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
          ) : visiveis.length === 0 ? (
            <EmptyState icon={Inbox} title={filtro === 'pendentes' ? 'Nada para revisar' : 'Nenhum pedido ainda'}
              description="Envie o link da área dos supervisores para a equipe pedir as cartas por lá." />
          ) : (
            <ul className="space-y-2">
              {visiveis.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setAbertoId(p.id)}
                    className={cn('w-full rounded-xl border p-3 text-left transition-colors', p.id === abertoId ? 'border-brand-300 bg-brand-50/50' : 'border-line bg-white hover:border-slate-300')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{p.solicitante?.nome || 'Supervisor'}</span>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', TOM_STATUS[p.status])}>
                        {p.status === 'processando' && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden="true" />}
                        {STATUS_ADMIN[p.status]}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.texto}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {fmtData.format(new Date(p.criado_em))}
                      {p.itens.length > 0 && ` · ${p.itens.length} carta${p.itens.length > 1 ? 's' : ''}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Panel title="Template dos pedidos" bodyClassName="space-y-2 p-4">
            <select value={templatePadrao?.id || ''} onChange={(e) => mudarTemplatePadrao(e.target.value)} className="h-10 w-full border bg-white px-3 text-sm text-ink" aria-label="Template padrão dos pedidos">
              <option value="">Automático (o mais usado)</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{String(t.nome).trim()}</option>)}
            </select>
            <p className="text-xs text-slate-400">É o modelo que os agentes usam para montar as cartas pedidas.</p>
          </Panel>
        </div>

        {/* Detalhe */}
        {!aberto ? (
          <div className="hidden items-center justify-center rounded-2xl border border-dashed border-line p-10 text-center text-sm text-slate-500 lg:flex">
            Escolha um pedido para ver o que os agentes encontraram.
          </div>
        ) : (
          <div className="min-w-0 space-y-4">
            <Panel
              title={aberto.solicitante?.nome || 'Supervisor'}
              meta={`${fmtData.format(new Date(aberto.criado_em))}${aberto.solicitante?.whatsapp ? ` · WhatsApp ${aberto.solicitante.whatsapp}` : ''}`}
              bodyClassName="p-5"
            >
              <blockquote className="rounded-lg bg-slate-50 px-4 py-3 text-[0.9375rem] leading-relaxed text-ink">{aberto.texto}</blockquote>

              {aberto.status === 'processando' && (
                <p className="mt-4 flex items-center gap-2 text-sm text-amber-800">
                  <Bot className="h-4 w-4" aria-hidden="true" /> Os agentes estão lendo o pedido e procurando no cadastro…
                </p>
              )}
              {aberto.status === 'erro' && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {aberto.erro || 'Os agentes não conseguiram resolver.'}
                </p>
              )}
              {aberto.status === 'recusada' && aberto.motivo_recusa && (
                <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">Recusado: {aberto.motivo_recusa}</p>
              )}
            </Panel>

            {rascunho.length > 0 && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                <div className="space-y-3">
                  {rascunho.map((item, i) => (
                    <ItemPedido
                      key={`${aberto.id}-${i}`}
                      item={item}
                      indice={i}
                      pedidoId={aberto.id}
                      funcionarios={funcionarios}
                      lojas={lojas.lojas}
                      editavel={editavel}
                      onChange={(novo) => atualizarItem(i, novo)}
                      onRemover={() => removerItem(i)}
                      onPrevia={() => mostrarPrevia(i)}
                      previaAtiva={previa.indice === i}
                      gerando={previa.carregando && previa.indice === i}
                    />
                  ))}
                </div>
                <div className="min-h-[28rem] overflow-hidden rounded-xl border border-line bg-slate-100 xl:sticky xl:top-20 xl:self-start">
                  {previa.url ? (
                    <iframe title="Prévia da carta" src={`${previa.url}#toolbar=0&view=FitH`} className="h-[36rem] w-full bg-white" />
                  ) : (
                    <div className="flex h-[28rem] items-center justify-center p-6 text-center text-sm text-slate-500">
                      {previa.carregando ? <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-label="Montando prévia" /> : 'A prévia da carta aparece aqui.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ações */}
            {editavel && (
              <div className="panel flex flex-wrap items-center gap-2 p-4">
                <Button onClick={aprovar} disabled={!prontoParaAprovar || !!acao}>
                  {acao === 'aprovar' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                  {rascunho.length > 1 ? `Aprovar e emitir ${rascunho.length} cartas` : 'Aprovar e emitir'}
                </Button>
                {rascunho.length > 0 && <Button variant="secondary" onClick={salvarRascunho} disabled={!!acao}>Salvar ajustes</Button>}
                <Button variant="secondary" onClick={reprocessar} disabled={!!acao}>
                  {acao === 'reprocessar' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  Reprocessar
                </Button>
                <Button variant="ghost" onClick={() => setRecusando((v) => !v)} disabled={!!acao} className="sm:ml-auto">
                  <X className="h-4 w-4" aria-hidden="true" /> Recusar
                </Button>
                {!prontoParaAprovar && rascunho.length > 0 && (
                  <p className="w-full text-xs text-red-700">Escolha o promotor e a loja de todas as cartas para aprovar.</p>
                )}
                {recusando && (
                  <div className="w-full space-y-2 border-t border-line-soft pt-3">
                    <label htmlFor="motivo" className="text-xs font-semibold text-slate-500">Motivo (o supervisor vai ver)</label>
                    <textarea id="motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border bg-white px-3 py-2 text-sm" placeholder="Ex.: promotor desligado, peça a carta do substituto." />
                    <Button variant="danger" size="sm" onClick={recusar} disabled={motivo.trim().length < 3 || !!acao}>Recusar pedido</Button>
                  </div>
                )}
              </div>
            )}

            {aberto.status === 'aprovada' && (
              <div className="panel flex flex-wrap items-center gap-3 p-4">
                <p className="text-sm text-slate-600">Aprovado. O supervisor já vê {cartasAprovadas.length > 1 ? `as ${cartasAprovadas.length} cartas` : 'a carta'} na área dele.</p>
                {aberto.solicitante?.whatsapp && cartasAprovadas.length > 0 && (
                  <Button as="a" href={linkWhatsApp(aberto.solicitante.whatsapp, mensagemWhats)} target="_blank" rel="noreferrer" className="sm:ml-auto">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Enviar no WhatsApp
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
