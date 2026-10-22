import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogOut, Send, FileText, ExternalLink, ChevronDown, EyeOff, Eye, Timer, MessageCircle, WifiOff, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, authErrorMessage } from '../lib/auth';
import { Button, Wordmark, Skeleton } from '../components/ui';
import { MarcaDesenhada } from '../components/Lacre';
import { cn } from '../lib/cn';
import {
  STATUS_PEDIDO, cadastrarSolicitante, enviarPedido, conferirPedido, meuPerfil, meusPedidos,
  cartasDoPedido, acompanharPedidos, fraseDoPedido, etapasDoPedido,
} from '../lib/pedidos';
import { linkAvisoEmpresa } from '../lib/avisoEmpresa';
import LinhaEtapas from '../components/LinhaEtapas';
import MesaDoAgente from '../components/MesaDoAgente';
import { CartaoTempoMedio, Indicador, MiniBarras } from '../components/PainelAtendimento';
import { resumoAtendimento, duracaoAtendimento, tempoEsperando, fmtDuracao } from '../lib/tempoAtendimento';
import { previsaoDeEspera, esperaDoPedido, frasePrevisao } from '../lib/previsao';
import { exemploDePedido } from '../lib/exemploPedido';
import {
  lerRascunho, salvarRascunho, limparRascunho,
  guardarPendente, lerPendente, limparPendente, semSinal, pareceFalhaDeRede,
} from '../lib/rascunho';
import { teclaMod } from '../lib/atalhos';

const RECENTES = 3;

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
  const { signIn, client } = useAuth();
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
          await cadastrarSolicitante(f, client);
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

/**
 * Quanto falta, em barra e em palavras.
 *
 * O número vem do histórico do próprio supervisor (ver lib/previsao.js). Sem
 * histórico suficiente não aparece nada: um "cerca de 3 min" inventado valeria
 * menos que o silêncio, porque na segunda vez que errasse ninguém acreditaria
 * mais na tela.
 */
function BarraEspera({ pedido, previsao, agora }) {
  const espera = esperaDoPedido(pedido, previsao, agora);
  if (!espera) return null;
  const frase = frasePrevisao(previsao, espera);

  return (
    <div className="mt-2 sm:pl-2">
      <div
        className="h-1 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(espera.fracao * 100)}
        aria-label="Andamento da espera"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out',
            espera.passouDoNormal ? 'bg-amber-500' : 'bg-brand-500',
          )}
          style={{ width: `${Math.max(3, espera.fracao * 100)}%` }}
        />
      </div>
      <p className={cn('mt-1 text-center text-xs sm:text-left', espera.passouDoNormal ? 'text-amber-700' : 'text-slate-500')}>
        {frase}
      </p>
    </div>
  );
}

/**
 * O miolo de um pedido: a cena do agente trabalhando, a linha do tempo e, no
 * fim, as cartas prontas. Mesmo conteúdo nos dois formatos — acordeão no
 * celular, painel ao lado no computador — para não existirem duas verdades.
 */
function DetalhePedido({ pedido, previsao, agora, grande = false }) {
  const { client } = useAuth();
  const [cartas, setCartas] = useState(null);

  useEffect(() => {
    if (pedido.status !== 'aprovada') return undefined;
    let ativo = true;
    cartasDoPedido(pedido.id, client).then((c) => ativo && setCartas(c)).catch(() => ativo && setCartas([]));
    return () => { ativo = false; };
  }, [pedido.id, pedido.status, client]);

  return (
    <div>
      {/* No painel largo a cena ganha espaço: é ela que conta o que está
          acontecendo enquanto a pessoa espera. */}
      <div className={cn('flex flex-col items-center gap-3', !grande && 'sm:flex-row sm:items-center sm:gap-5')}>
        <MesaDoAgente
          key={pedido.status}
          status={pedido.status}
          className={cn('shrink-0', grande ? 'w-full max-w-sm' : 'w-44')}
        />
        <div className="w-full min-w-0 flex-1">
          <LinhaEtapas pedido={pedido} />
          <p className={cn('mt-1 text-center text-xs text-slate-500', !grande && 'sm:pl-2 sm:text-left')}>
            {fraseDoPedido(pedido)}
          </p>
          <TempoDoPedido pedido={pedido} agora={agora} />
          <BarraEspera pedido={pedido} previsao={previsao} agora={agora} />
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
  );
}

/**
 * Uma linha da lista. No computador ela só seleciona (o detalhe vive no painel
 * ao lado); no celular ela abre e fecha ali mesmo, porque não há espaço para
 * duas colunas e o telefone é onde o supervisor realmente usa isto.
 */
function CartaoPedido({ pedido, aberto, onAlternar, previsao, agora }) {
  const st = STATUS_PEDIDO[pedido.status] || STATUS_PEDIDO.recebida;
  const idPainel = `pedido-${pedido.id}`;

  return (
    <li className={cn(
      'overflow-hidden rounded-xl border bg-white transition-all duration-200',
      aberto ? 'border-line shadow-md lg:border-brand-200 lg:bg-brand-50/40 lg:shadow-none' : 'border-line-soft hover:border-line',
    )}>
      <button
        id={`gatilho-${pedido.id}`}
        onClick={onAlternar}
        aria-expanded={aberto}
        aria-controls={idPainel}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Fita de seleção: no painel lado a lado é o que liga a linha ao
            detalhe da direita. */}
        <span
          aria-hidden="true"
          className={cn('hidden w-0.5 self-stretch rounded-full transition-colors lg:block', aberto ? 'bg-brand-700' : 'bg-transparent')}
        />
        <MiniProgresso pedido={pedido} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink">{pedido.texto}</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs">
            <span className={cn('font-medium', st.tom === 'sucesso' ? 'text-emerald-700' : st.tom === 'alerta' ? 'text-red-700' : 'text-slate-500')}>
              {st.rotulo}
            </span>
            <span className="tabular-nums text-slate-400">{fmtCurto(pedido.criado_em)}</span>
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 lg:hidden', aberto && 'rotate-180')} aria-hidden="true" />
      </button>

      {/* Só no celular: o detalhe abre aqui dentro. */}
      <div id={idPainel} className={cn('grid transition-[grid-template-rows] duration-300 ease-out lg:hidden', aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="border-t border-line-soft px-4 pb-4 pt-3">
            {aberto && <DetalhePedido pedido={pedido} previsao={previsao} agora={agora} />}
          </div>
        </div>
      </div>
    </li>
  );
}

/** "Pronta em 14 min" ou "Aguardando há 6 min". */
function TempoDoPedido({ pedido, agora }) {
  const levou = duracaoAtendimento(pedido);
  const espera = tempoEsperando(pedido, agora);
  if (pedido.status === 'recusada' || (levou == null && espera == null)) return null;
  return (
    <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium tabular-nums text-slate-600 sm:justify-start sm:pl-2">
      <Timer className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
      {levou != null ? `Pronta em ${fmtDuracao(levou)}` : `Aguardando há ${fmtDuracao(espera)}`}
    </p>
  );
}

/** Painel curto do supervisor: tempo médio de retorno, em andamento e cartas prontas. */
function PainelSupervisor({ resumo }) {
  return (
    <section aria-label="Resumo dos seus pedidos" className="grid grid-cols-2 gap-3 sm:grid-cols-[1.35fr_1fr_1fr]">
      <CartaoTempoMedio
        resumo={resumo}
        className="col-span-2 sm:col-span-1"
        vazio="Aparece assim que sua primeira carta ficar pronta."
      />
      <Indicador
        ordem={1}
        rotulo="Em andamento"
        valor={resumo.emAberto}
        detalhe={resumo.emAberto ? `esperando há ${fmtDuracao(resumo.esperaMaisLonga)}` : 'nada pendente'}
      />
      <Indicador ordem={2} rotulo="Cartas prontas" valor={resumo.prontasTotal}>
        <MiniBarras dias={resumo.ultimos7} />
      </Indicador>
    </section>
  );
}

// ------------------------------------------------------------- área do supervisor
function AreaSupervisor({ user }) {
  const { client } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [pedidos, setPedidos] = useState(null);
  // O rascunho volta já na primeira renderização: se a pessoa perdeu a aba no
  // meio do pedido, ela reabre a tela e o texto está lá, não "quase lá".
  const [texto, setTexto] = useState(() => lerRascunho(user.id));
  const [pendente, setPendente] = useState(() => lerPendente(user.id));
  const [comSinal, setComSinal] = useState(() => !semSinal());
  const [enviando, setEnviando] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const [aviso, setAviso] = useState(null); // o que faltou dizer, antes de enviar
  const [avisoEmpresa, setAvisoEmpresa] = useState(null); // link pronto do WhatsApp, depois de enviar
  const [abertoId, setAbertoId] = useState(undefined);
  const [verTodos, setVerTodos] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [listaVisivel, setListaVisivel] = useState(() => {
    try { return localStorage.getItem('tarhget:pedidos-visiveis') !== 'nao'; } catch { return true; }
  });

  // Cada tecla grava. É barato e evita o pior caso: cinco linhas digitadas
  // no corredor da loja e perdidas por uma ligação que derrubou a aba.
  const escrever = (valor) => {
    setTexto(valor);
    setAviso(null);
    salvarRascunho(user.id, valor);
  };

  const alternarLista = (visivel) => {
    setListaVisivel(visivel);
    try { localStorage.setItem('tarhget:pedidos-visiveis', visivel ? 'sim' : 'nao'); } catch { /* sem armazenamento */ }
  };

  // O último pedido já vem aberto: é o que a pessoa acabou de mandar e quer
  // ver andando. Os outros ficam como linha, a um clique de distância.
  useEffect(() => {
    if (abertoId !== undefined || !pedidos?.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- escolha inicial do pedido aberto
    setAbertoId(pedidos[0].id);
  }, [pedidos, abertoId]);

  // Relógio do "aguardando há…"
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const resumo = useMemo(() => resumoAtendimento(pedidos || [], { agora }), [pedidos, agora]);

  // Quanto costuma levar, pelo histórico dele — não por um número no código.
  const previsao = useMemo(() => previsaoDeEspera(pedidos || []), [pedidos]);

  // O exemplo dentro da caixa sai de um pedido dele que já virou carta.
  const exemplo = useMemo(() => exemploDePedido(pedidos || []), [pedidos]);

  // Mostra os mais recentes; o pedido aberto entra mesmo se for mais antigo
  const exibidos = useMemo(() => {
    if (!pedidos) return [];
    if (verTodos) return pedidos;
    const recentes = pedidos.slice(0, RECENTES);
    const aberto = pedidos.find((p) => p.id === abertoId);
    return aberto && !recentes.includes(aberto) ? [...recentes, aberto] : recentes;
  }, [pedidos, verTodos, abertoId]);

  // O pedido que o painel da direita está mostrando.
  const selecionado = useMemo(
    () => (pedidos || []).find((p) => p.id === abertoId) || null,
    [pedidos, abertoId],
  );

  /**
   * Setas andam pela lista, Esc fecha. No computador a lista é um índice e o
   * detalhe vive ao lado: dá para percorrer os pedidos sem tirar a mão do
   * teclado. O foco acompanha a seleção, senão quem usa leitor de tela fica
   * ouvindo o item antigo enquanto o painel já mostra outro.
   */
  const navegarNaLista = (e) => {
    if (e.key === 'Escape') { setAbertoId(null); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const atual = exibidos.findIndex((p) => p.id === abertoId);
    const destino = e.key === 'ArrowDown'
      ? Math.min(exibidos.length - 1, atual + 1)
      : Math.max(0, atual <= 0 ? 0 : atual - 1);
    const alvo = exibidos[destino];
    if (!alvo) return;
    setAbertoId(alvo.id);
    document.getElementById(`gatilho-${alvo.id}`)?.focus();
  };

  const recarregar = useCallback(() => {
    meusPedidos(user.id, client).then(setPedidos).catch(() => setPedidos([]));
  }, [user.id, client]);

  useEffect(() => {
    meuPerfil(user.id, client).then(setPerfil);
    recarregar();
    return acompanharPedidos(recarregar, user.id, client);
  }, [user.id, client, recarregar]);

  /**
   * Manda o pedido que ficou guardado por falta de sinal.
   *
   * Protegido contra repetição: o evento "online" dispara mais de uma vez em
   * troca de Wi-Fi para 4G, e cada disparo viraria uma carta igual na mesa da
   * coordenação. A pendência só é apagada depois que o envio dá certo — se
   * falhar, continua guardada para a próxima chance.
   */
  const enviandoPendente = useRef(false);
  const enviarPendente = useCallback(async () => {
    const guardado = lerPendente(user.id);
    if (!guardado || semSinal() || enviandoPendente.current) return;
    enviandoPendente.current = true;
    try {
      await enviarPedido(user.id, guardado.texto, client);
      limparPendente(user.id);
      setPendente(null);
      toast.success('O pedido que estava guardado acabou de ser enviado.');
      recarregar();
    } catch (err) {
      console.warn('Pedido continua guardado:', err);
    } finally {
      enviandoPendente.current = false;
    }
  }, [user.id, client, recarregar]);

  // O sinal indo e voltando: atualiza o aviso da tela e aproveita a volta
  // para despachar o que ficou para trás.
  useEffect(() => {
    const voltou = () => { setComSinal(true); enviarPendente(); };
    const caiu = () => setComSinal(false);
    window.addEventListener('online', voltou);
    window.addEventListener('offline', caiu);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- envio para o servidor; o setState é só o retorno, depois do await
    enviarPendente(); // pendência de uma visita anterior, já com internet
    return () => {
      window.removeEventListener('online', voltou);
      window.removeEventListener('offline', caiu);
    };
  }, [enviarPendente]);

  /** Sem rede: guarda em vez de perder, e diz isso sem assustar. */
  const guardarParaDepois = (conteudo) => {
    const guardado = guardarPendente(user.id, conteudo);
    if (!guardado) return;
    setPendente(guardado);
    setTexto('');
    setAviso(null);
    limparRascunho(user.id);
    toast('Sem sinal agora. Seu pedido está guardado e sai sozinho quando a internet voltar.');
  };

  const despachar = async () => {
    setEnviando(true);
    try {
      await enviarPedido(user.id, texto, client);
      // Guarda o link antes de limpar o campo: a mensagem é feita do texto.
      setAvisoEmpresa(linkAvisoEmpresa({
        supervisor: perfil?.nome,
        texto,
        site: window.location.origin,
      }));
      setTexto('');
      limparRascunho(user.id);  // saiu do rascunho porque virou pedido
      setAviso(null);
      setAbertoId(undefined);   // efeito vai abrir o pedido novo automaticamente
      setVerTodos(false);       // volta para a lista compacta
      toast.success('Pedido enviado. Você acompanha o andamento aqui embaixo.');
      recarregar();
    } catch (err) {
      console.error(err);
      // Rede caiu no meio do envio: guarda em vez de jogar o texto fora.
      // Acontece com o telefone preso num Wi-Fi da loja que não tem saída —
      // aí navigator.onLine jura que há internet e o envio morre no fetch.
      if (pareceFalhaDeRede(err)) {
        guardarParaDepois(texto);
        return;
      }
      toast.error(perfil && !perfil.ativo ? 'Seu acesso está bloqueado. Fale com o administrador.' : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (texto.trim().length < 3) return;

    // Sem rede não dá para conferir nem enviar: guarda e encerra. Tentar
    // mesmo assim só gastaria dez segundos para terminar em erro.
    if (semSinal()) {
      guardarParaDepois(texto);
      return;
    }

    // Já avisado e mandou de novo: é um "enviar assim mesmo".
    if (aviso) {
      await despachar();
      return;
    }

    setConferindo(true);
    const falta = await conferirPedido(texto, client);
    setConferindo(false);
    if (falta) {
      setAviso(falta);
      return;
    }
    await despachar();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {perfil?.nome ? `Olá, ${perfil.nome.split(' ')[0]}.` : 'Olá.'}
        </h1>
        <p className="text-sm text-slate-500">
          {resumo.emAberto
            ? `Você tem ${resumo.emAberto} ${resumo.emAberto > 1 ? 'pedidos' : 'pedido'} em andamento.`
            : 'Tudo em dia por aqui.'}
        </p>
      </div>

      {pedidos?.length > 0 && <PainelSupervisor resumo={resumo} />}

      <form onSubmit={enviar} className="panel p-5 shadow-lg sm:p-6 lg:max-w-3xl">
        <label htmlFor="pedido" className="block text-lg font-semibold text-ink">
          Qual carta você precisa?
        </label>
        <p className="mt-1 text-sm text-slate-500">Escreva do seu jeito o nome do promotor e a loja. Dá para pedir várias de uma vez.</p>
        <textarea
          id="pedido"
          rows={4}
          maxLength={4000}
          value={texto}
          onChange={(e) => escrever(e.target.value)}
          onKeyDown={(e) => {
            // Quem digita rápido termina a frase e manda sem ir ao mouse.
            // Enter sozinho continua pulando linha: pedido de várias cartas
            // vem em linhas, e enviar por engano custa uma carta errada.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
          placeholder={exemplo}
          className="mt-4 w-full resize-y border bg-white px-3 py-2.5 text-[0.9375rem] leading-relaxed text-ink"
        />

        {/* Faltou promotor ou loja: cobra aqui, antes de virar pedido */}
        {aviso && (
          <div className="mt-3 rounded-xl border border-signal-100 bg-signal-50 px-4 py-3 text-sm text-signal-700" role="alert">
            <p className="font-medium">{aviso.titulo}</p>
            <ul className="mt-1 space-y-0.5">
              {aviso.detalhes.map((linha) => <li key={linha}>{linha}</li>)}
            </ul>
            <p className="mt-2">Complete no campo acima.</p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          {/* Sem sinal, o botão diz a verdade sobre o que vai acontecer. */}
          {!comSinal && (
            <p className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              Sem internet. Seu pedido fica guardado e sai sozinho.
            </p>
          )}
          {comSinal && texto.trim().length >= 3 && (
            <p className="mr-auto hidden text-xs text-slate-400 sm:block">
              {teclaMod} + Enter envia
            </p>
          )}
          <Button type="submit" disabled={enviando || conferindo || texto.trim().length < 3}>
            {enviando || conferindo
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : !comSinal
                ? <Hourglass className="h-4 w-4" aria-hidden="true" />
                : <Send className="h-4 w-4" aria-hidden="true" />}
            {conferindo
              ? 'Conferindo…'
              : !comSinal
                ? 'Guardar para enviar depois'
                : aviso ? 'Enviar assim mesmo' : 'Enviar pedido'}
          </Button>
        </div>
      </form>

      {/* Pedido que não saiu por falta de sinal. Fica visível com o texto à
          mostra: a garantia só serve se a pessoa puder ver o que está salvo. */}
      {pendente && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-900">
                Pedido guardado, esperando internet.
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-amber-800/90">“{pendente.texto}”</p>
              <p className="mt-1 text-xs text-amber-700/80">
                Sai sozinho quando o sinal voltar. Pode fechar a página.
              </p>
            </div>
            <button
              onClick={enviarPendente}
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:border-amber-400"
            >
              Tentar agora
            </button>
          </div>
        </div>
      )}

      {/* Logo depois de enviar: um toque e o WhatsApp abre já escrito.
          Some sozinho quando a pessoa avisa ou dispensa. */}
      {avisoEmpresa && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <MessageCircle className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-emerald-900">
            Pedido registrado. Avise a empresa para alguém já olhar.
          </p>
          <a
            href={avisoEmpresa}
            target="_blank"
            rel="noreferrer"
            onClick={() => setAvisoEmpresa(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Avisar no WhatsApp
          </a>
          <button
            onClick={() => setAvisoEmpresa(null)}
            className="rounded-lg px-2 py-2 text-sm text-emerald-800/70 hover:text-emerald-900"
          >
            Agora não
          </button>
        </div>
      )}

      <section aria-labelledby="titulo-pedidos">
        <div className="mb-3 flex items-center gap-3">
          <h2 id="titulo-pedidos" className="text-base font-semibold text-ink">Meus pedidos</h2>
          {pedidos?.length > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">{pedidos.length}</span>}
          {pedidos?.length > 0 && (
            <button
              onClick={() => alternarLista(!listaVisivel)}
              aria-expanded={listaVisivel}
              aria-controls="lista-pedidos"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-ink"
            >
              {listaVisivel ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
              {listaVisivel ? 'Esconder pedidos' : 'Mostrar pedidos'}
            </button>
          )}
        </div>
        {pedidos === null ? (
          // Três linhas no formato dos pedidos, em vez de um texto cinza: a
          // tela já nasce com a forma que vai ter, sem pular quando chega.
          <ul className="space-y-2" aria-busy="true" aria-label="Carregando seus pedidos">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-line-soft bg-white px-4 py-3">
                <Skeleton className="h-1 w-14 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className={cn('h-3.5 rounded', i === 0 ? 'w-3/4' : i === 1 ? 'w-2/3' : 'w-1/2')} />
                  <Skeleton className="h-2.5 w-24 rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : pedidos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-slate-500">
            Seus pedidos aparecem aqui, com o andamento de cada um.
          </p>
        ) : !listaVisivel ? (
          <button
            onClick={() => alternarLista(true)}
            className="w-full rounded-xl border border-dashed border-line px-4 py-3 text-left text-sm text-slate-500 hover:border-slate-300 hover:text-ink"
          >
            Pedidos escondidos{resumo.emAberto ? ` · ${resumo.emAberto} em andamento` : ''}. Toque para mostrar.
          </button>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-5">
            <div>
              <ul id="lista-pedidos" className="space-y-2" onKeyDown={navegarNaLista}>
                {exibidos.map((p) => (
                  <CartaoPedido
                    key={p.id}
                    pedido={p}
                    previsao={previsao}
                    agora={agora}
                    aberto={abertoId === p.id}
                    onAlternar={() => setAbertoId((a) => (a === p.id ? null : p.id))}
                  />
                ))}
              </ul>
              {pedidos.length > RECENTES && (
                <button
                  onClick={() => setVerTodos((v) => !v)}
                  aria-expanded={verTodos}
                  className="mx-auto mt-3 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  {verTodos ? 'Ver só os recentes' : `Ver todos os ${pedidos.length} pedidos`}
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', verTodos && 'rotate-180')} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Painel do agente, só no computador. Grudado no topo: dá para
                percorrer a lista sem perder a cena de vista. */}
            <div className="hidden lg:sticky lg:top-6 lg:block">
              {selecionado ? (
                <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
                  <p className="text-sm leading-relaxed text-ink">{selecionado.texto}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Pedido de {fmtCurto(selecionado.criado_em)} · {(STATUS_PEDIDO[selecionado.status] || STATUS_PEDIDO.recebida).rotulo}
                  </p>
                  <div className="mt-4 border-t border-line-soft pt-4">
                    <DetalhePedido key={selecionado.id} pedido={selecionado} previsao={previsao} agora={agora} grande />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line px-5 py-12 text-center text-sm text-slate-500">
                  Escolha um pedido na lista para acompanhar aqui.
                  <span className="mt-1 hidden lg:block text-xs text-slate-400">Setas ↑ ↓ andam pela lista; Esc fecha.</span>
                </div>
              )}
            </div>
          </div>
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
        <div className="relative mx-auto flex max-w-2xl items-center gap-3 px-4 py-6 sm:py-8 lg:max-w-5xl">
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

      <main className="mx-auto max-w-2xl px-4 py-8 animate-enter lg:max-w-5xl">
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
            {role === 'admin' && (
              <Button as={Link} to="/login?trocar=1" state={{ from: { pathname: '/solicitacoes' } }} className="mt-4">
                Entrar no painel
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
