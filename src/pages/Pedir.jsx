import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogOut, Send, FileText, ExternalLink, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, authErrorMessage } from '../lib/auth';
import { Button, Wordmark } from '../components/ui';
import { MarcaDesenhada } from '../components/Lacre';
import { cn } from '../lib/cn';
import {
  STATUS_PEDIDO, cadastrarSolicitante, enviarPedido, meuPerfil, meusPedidos,
  cartasDoPedido, acompanharPedidos, fraseDoPedido, etapasDoPedido,
} from '../lib/pedidos';
import LinhaEtapas from '../components/LinhaEtapas';
import MesaDoAgente from '../components/MesaDoAgente';

const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
/** Hoje mostra a hora; outros dias, a data. */
const fmtCurto = (iso) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? fmtHora.format(d) : fmtDia.format(d);
};

function Campo({ label, id, dica, ...props }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
      <input id={id} className="h-10 w-full border bg-white px-3 text-[0.9375rem] text-ink" {...props} />
      {dica && <p className="text-xs text-slate-400">{dica}</p>}
    </div>
  );
}

// ------------------------------------------------------------- entrar / cadastrar
function Acesso() {
  const { signIn } = useAuth();
  const [modo, setModo] = useState('entrar');
  const [f, setF] = useState({ nome: '', whatsapp: '', usuario: '', senha: '' });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const mudar = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    setOcupado(true);
    try {
      if (modo === 'cadastrar') {
        try {
          await cadastrarSolicitante(f);
        } catch (err) {
          setErro(err.message);
          return;
        }
      }
      await signIn(f.usuario.trim().toLowerCase(), f.senha);
    } catch (err) {
      setErro(authErrorMessage(err));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="panel p-6 shadow-lg sm:p-8">
      <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium" role="tablist">
        {[['entrar', 'Entrar'], ['cadastrar', 'Criar cadastro']].map(([k, rotulo]) => (
          <button
            key={k}
            role="tab"
            aria-selected={modo === k}
            onClick={() => { setModo(k); setErro(''); }}
            className={cn('h-9 rounded-md', modo === k ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink')}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <form onSubmit={enviar} className="space-y-4">
        {modo === 'cadastrar' && (
          <>
            <Campo label="Seu nome" id="nome" required minLength={3} autoComplete="name" value={f.nome} onChange={mudar('nome')} />
            <Campo label="WhatsApp com DDD" id="whatsapp" required inputMode="tel" autoComplete="tel" placeholder="(85) 99999-9999" value={f.whatsapp} onChange={mudar('whatsapp')} dica="É por aqui que a carta pronta pode chegar até você." />
          </>
        )}
        <Campo label="Usuário" id="usuario" required autoCapitalize="none" spellCheck={false} autoComplete="username" value={f.usuario} onChange={mudar('usuario')} dica={modo === 'cadastrar' ? 'Sem espaços. Ex.: joao.silva' : undefined} />
        <Campo label="Senha" id="senha" type="password" required minLength={modo === 'cadastrar' ? 8 : undefined} autoComplete={modo === 'cadastrar' ? 'new-password' : 'current-password'} value={f.senha} onChange={mudar('senha')} />
        {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" className="h-10 w-full" disabled={ocupado}>
          {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {modo === 'cadastrar' ? 'Criar cadastro e entrar' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------- um pedido
const TOM_SEGMENTO = { feita: 'bg-brand-700', atual: 'bg-brand-400 animate-pulse', futura: 'bg-slate-200', recusada: 'bg-red-500' };

/** Quatro traços que resumem o andamento sem abrir o pedido. */
function MiniProgresso({ pedido }) {
  return (
    <span className="flex w-14 shrink-0 gap-0.5" aria-hidden="true">
      {etapasDoPedido(pedido).map((e) => (
        <span key={e.chave} className={cn('h-1 flex-1 rounded-full', TOM_SEGMENTO[e.estado])} />
      ))}
    </span>
  );
}

function CartaoPedido({ pedido, aberto, onAlternar }) {
  const st = STATUS_PEDIDO[pedido.status] || STATUS_PEDIDO.recebida;
  const [cartas, setCartas] = useState(null);
  const idPainel = `pedido-${pedido.id}`;

  useEffect(() => {
    if (pedido.status !== 'aprovada' || !aberto) return;
    let ativo = true;
    cartasDoPedido(pedido.id).then((c) => ativo && setCartas(c)).catch(() => ativo && setCartas([]));
    return () => { ativo = false; };
  }, [pedido.id, pedido.status, aberto]);

  return (
    <li className={cn('overflow-hidden rounded-xl border bg-white transition-shadow', aberto ? 'border-line shadow-md' : 'border-line-soft hover:border-line')}>
      <button
        onClick={onAlternar}
        aria-expanded={aberto}
        aria-controls={idPainel}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <MiniProgresso pedido={pedido} />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{pedido.texto}</span>
        <span className={cn('hidden shrink-0 text-xs font-medium sm:inline', st.tom === 'sucesso' ? 'text-emerald-700' : st.tom === 'alerta' ? 'text-red-700' : 'text-slate-500')}>
          {st.rotulo}
        </span>
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-400">{fmtCurto(pedido.criado_em)}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', aberto && 'rotate-180')} aria-hidden="true" />
      </button>

      <div id={idPainel} className={cn('grid transition-[grid-template-rows] duration-300 ease-out', aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="border-t border-line-soft px-4 pb-4 pt-3">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
              {aberto && <MesaDoAgente key={pedido.status} status={pedido.status} className="w-44 shrink-0" />}
              <div className="w-full min-w-0 flex-1">
                <LinhaEtapas pedido={pedido} />
                <p className="mt-1 text-center text-xs text-slate-500 sm:text-left sm:pl-2">{fraseDoPedido(pedido)}</p>
              </div>
            </div>
            {pedido.status === 'recusada' && pedido.motivo_recusa && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Motivo: {pedido.motivo_recusa}</p>
            )}
            {pedido.status === 'aprovada' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {cartas === null && <span className="text-xs text-slate-400">Carregando cartas…</span>}
                {cartas?.map((c) => (
                  <a key={c.id} href={`/carta/${c.id}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50">
                    <FileText className="h-4 w-4" aria-hidden="true" /> {c.nome_funcionario || 'Abrir carta'}
                    <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

// ------------------------------------------------------------- área do supervisor
function AreaSupervisor({ user }) {
  const [perfil, setPerfil] = useState(null);
  const [pedidos, setPedidos] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [abertoId, setAbertoId] = useState(undefined);
  const [listaVisivel, setListaVisivel] = useState(() => {
    try { return localStorage.getItem('tarhget:pedidos-visiveis') !== 'nao'; } catch { return true; }
  });

  const alternarLista = (visivel) => {
    setListaVisivel(visivel);
    try { localStorage.setItem('tarhget:pedidos-visiveis', visivel ? 'sim' : 'nao'); } catch { /* sem armazenamento */ }
  };

  // Abre sozinho o pedido mais recente ainda em andamento (uma vez)
  useEffect(() => {
    if (abertoId !== undefined || !pedidos?.length) return;
    const emAndamento = pedidos.find((p) => !['aprovada', 'recusada'].includes(p.status));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- escolha inicial do pedido aberto
    setAbertoId((emAndamento || pedidos[0]).id);
  }, [pedidos, abertoId]);

  const resumo = useMemo(() => {
    if (!pedidos?.length) return '';
    const andamento = pedidos.filter((p) => !['aprovada', 'recusada'].includes(p.status)).length;
    const prontas = pedidos.filter((p) => p.status === 'aprovada').length;
    return [andamento && `${andamento} em andamento`, prontas && `${prontas} ${prontas > 1 ? 'prontas' : 'pronta'}`].filter(Boolean).join(' · ');
  }, [pedidos]);

  const recarregar = useCallback(() => {
    meusPedidos(user.id).then(setPedidos).catch(() => setPedidos([]));
  }, [user.id]);

  useEffect(() => {
    meuPerfil(user.id).then(setPerfil);
    recarregar();
    return acompanharPedidos(recarregar, user.id);
  }, [user.id, recarregar]);

  const enviar = async (e) => {
    e.preventDefault();
    if (texto.trim().length < 3) return;
    setEnviando(true);
    try {
      await enviarPedido(user.id, texto);
      setTexto('');
      toast.success('Pedido enviado. Você acompanha o andamento aqui embaixo.');
      recarregar();
    } catch (err) {
      console.error(err);
      toast.error(perfil && !perfil.ativo ? 'Seu acesso está bloqueado. Fale com o administrador.' : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={enviar} className="panel p-5 shadow-lg sm:p-6">
        <label htmlFor="pedido" className="block text-lg font-semibold text-ink">
          {perfil?.nome ? `Olá, ${perfil.nome.split(' ')[0]}. Qual carta você precisa?` : 'Qual carta você precisa?'}
        </label>
        <p className="mt-1 text-sm text-slate-500">Escreva do seu jeito o nome do promotor e a loja. Dá para pedir várias de uma vez.</p>
        <textarea
          id="pedido"
          rows={4}
          maxLength={4000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: carta pro Adailton no Atacadão Messejana e pra Juliana no Assaí Bezerra de Menezes"
          className="mt-4 w-full resize-y border bg-white px-3 py-2.5 text-[0.9375rem] leading-relaxed text-ink"
        />
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={enviando || texto.trim().length < 3}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Enviar pedido
          </Button>
        </div>
      </form>

      <section aria-labelledby="titulo-pedidos">
        <div className="mb-3 flex items-center gap-3">
          <h2 id="titulo-pedidos" className="text-base font-semibold text-ink">Meus pedidos</h2>
          {resumo && <span className="text-xs text-slate-400">{resumo}</span>}
          {pedidos?.length > 0 && (
            <button
              onClick={() => alternarLista(!listaVisivel)}
              aria-expanded={listaVisivel}
              aria-controls="lista-pedidos"
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-ink"
            >
              {listaVisivel ? 'Ocultar' : 'Mostrar'}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', listaVisivel && 'rotate-180')} aria-hidden="true" />
            </button>
          )}
        </div>
        {pedidos === null ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : pedidos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-slate-500">
            Seus pedidos aparecem aqui, com o andamento de cada um.
          </p>
        ) : listaVisivel && (
          <ul id="lista-pedidos" className="space-y-2">
            {pedidos.map((p) => (
              <CartaoPedido key={p.id} pedido={p} aberto={abertoId === p.id} onAlternar={() => setAbertoId((a) => (a === p.id ? null : p.id))} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------- página
export default function Pedir() {
  const { session, user, role, loading, signOut } = useAuth();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="relative overflow-hidden bg-brand-950 text-brand-100">
        <span className="luz-vinho left-[-10%] top-[-60%] h-[220%] w-[60%] bg-brand-700/60" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-2xl items-center gap-3 px-4 py-6 sm:py-8">
          <MarcaDesenhada className="h-11 w-11 text-brand-100 sm:h-12 sm:w-12" />
          <div className="min-w-0">
            <Wordmark className="text-lg tracking-[0.28em] text-white" />
            <p className="text-sm text-brand-200/80">Pedidos de carta de apresentação</p>
          </div>
          {session && (
            <button onClick={signOut} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-brand-100/80 hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 animate-enter">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="Carregando" /></div>
        ) : !session ? (
          <div className="mx-auto max-w-sm">
            <p className="mb-5 text-center text-sm text-slate-500">Supervisores e coordenadores: peça a carta dos seus promotores por aqui.</p>
            <Acesso />
          </div>
        ) : role === 'solicitante' ? (
          <AreaSupervisor user={user} />
        ) : (
          <div className="panel p-6 text-center">
            <p className="text-sm text-slate-600">
              {role === 'admin'
                ? 'Você entrou como administrador. Os pedidos dos supervisores chegam na caixa de entrada do painel.'
                : 'Esta área é para supervisores. Saia e entre com o seu usuário de supervisor.'}
            </p>
            {role === 'admin' && <Button as={Link} to="/solicitacoes" className="mt-4">Abrir caixa de entrada</Button>}
          </div>
        )}
      </main>
    </div>
  );
}
