/**
 * Ditado por voz para o pedido de carta.
 *
 * Usa o reconhecimento de fala do próprio navegador (Web Speech API): não
 * custa nada por uso e não precisa de servidor. Em troca, erra mais em nome
 * próprio — o que o pipeline absorve em parte, porque a busca de promotor e
 * loja já é aproximada (pg_trgm/unaccent).
 *
 * Tudo que depende dessa API está trancado neste arquivo de propósito: se um
 * dia a transcrição errar demais, dá pra trocar por uma função de servidor
 * (Whisper e afins) sem mexer na tela.
 *
 * Atenção: nessa API o áudio é transcrito pelos servidores do navegador
 * (no Chrome, os do Google). Vai junto nome de promotor e de loja.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const Reconhecimento =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/** Se dá pra ditar neste navegador (Firefox, por exemplo, não tem). */
export const ditadoSuportado = Boolean(Reconhecimento);

/** Emenda o trecho ditado no que já está escrito, sem dobrar espaço. */
export function juntarDitado(atual, novo) {
  const trecho = String(novo ?? '').trim();
  if (!trecho) return String(atual ?? '');
  const texto = String(atual ?? '');
  if (!texto) return trecho;
  return /\s$/.test(texto) ? `${texto}${trecho}` : `${texto} ${trecho}`;
}

const MENSAGEM_ERRO = {
  'not-allowed': 'O microfone está bloqueado para este site. Libere no cadeado da barra de endereço.',
  // Outra coisa, bem diferente: a permissão está dada, mas o navegador não tem
  // o serviço de transcrição (acontece em Brave, Opera e Chromium de Linux).
  'service-not-allowed': 'Este navegador não tem o serviço de transcrição. Abra o sistema no Chrome ou no Edge.',
  'no-speech': 'Não ouvi nada. Toque no microfone e fale de novo.',
  'audio-capture': 'Não achei um microfone neste aparelho.',
  network: 'Sem conexão para transcrever. Confira a internet.',
};

const MENSAGEM_PERMISSAO = {
  NotAllowedError: 'O microfone está bloqueado para este site. Libere no cadeado da barra de endereço.',
  SecurityError: 'O microfone está bloqueado para este site. Libere no cadeado da barra de endereço.',
  NotFoundError: 'Não achei um microfone neste aparelho.',
  DevicesNotFoundError: 'Não achei um microfone neste aparelho.',
  NotReadableError: 'O microfone está em uso por outro programa. Feche o outro e tente de novo.',
  TrackStartError: 'O microfone está em uso por outro programa. Feche o outro e tente de novo.',
};

/**
 * Pede o microfone e ESPERA a resposta, antes de ligar o reconhecedor.
 *
 * É isso que conserta o "liberei e não adianta": quando `start()` é quem
 * dispara o pedido de permissão, o Chrome mata aquela sessão na hora, com
 * 'not-allowed', sem esperar a pessoa responder. Quem clicou em "permitir
 * desta vez" caía nessa a cada clique, pra sempre.
 *
 * Só queremos a autorização aqui — quem grava de verdade é o reconhecedor —,
 * então o microfone é desligado em seguida.
 */
export async function pedirMicrofone(mediaDevices) {
  // Navegador sem a API: não dá pra perguntar antes; deixa o reconhecedor tentar.
  if (!mediaDevices?.getUserMedia) return { ok: true };
  try {
    const stream = await mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((faixa) => faixa.stop());
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: MENSAGEM_PERMISSAO[e?.name] || 'Não consegui usar o microfone agora.' };
  }
}

/**
 * Microfone do formulário.
 * `aoTranscrever` recebe cada trecho já finalizado, para o campo ir crescendo
 * enquanto a pessoa fala (dá pra ditar em várias tacadas e misturar com o que
 * foi digitado).
 */
export function useDitado(aoTranscrever) {
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState('');
  const recRef = useRef(null);
  const callbackRef = useRef(aoTranscrever);
  useEffect(() => { callbackRef.current = aoTranscrever; }, [aoTranscrever]);

  // Um reconhecedor só, vivo enquanto a tela estiver aberta.
  useEffect(() => {
    if (!Reconhecimento) return undefined;
    const rec = new Reconhecimento();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (evento) => {
      let finalizado = '';
      let emAndamento = '';
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        if (resultado.isFinal) finalizado += resultado[0].transcript;
        else emAndamento += resultado[0].transcript;
      }
      if (finalizado) callbackRef.current?.(finalizado);
      setParcial(emAndamento);
    };

    rec.onerror = (evento) => {
      // 'aborted' é o nosso próprio parar(); não é erro para mostrar.
      if (evento.error === 'aborted') return;
      setErro(MENSAGEM_ERRO[evento.error] || 'Não consegui usar o microfone agora.');
    };

    rec.onend = () => {
      setOuvindo(false);
      setParcial('');
    };

    recRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.abort(); } catch { /* já estava parado */ }
      recRef.current = null;
    };
  }, []);

  const iniciar = useCallback(async () => {
    if (!recRef.current) return;
    setErro('');

    // A permissão vem primeiro e é esperada: se deixarmos o start() disparar o
    // pedido, o Chrome encerra a sessão antes da pessoa responder.
    const permissao = await pedirMicrofone(navigator.mediaDevices);
    if (!permissao.ok) {
      setErro(permissao.erro);
      return;
    }

    try {
      recRef.current.start();
      setOuvindo(true);
    } catch {
      // start() reclama se já estiver ouvindo; nesse caso não há o que fazer.
    }
  }, []);

  const parar = useCallback(() => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch { /* já estava parado */ }
    setOuvindo(false);
    setParcial('');
  }, []);

  const alternar = useCallback(() => {
    if (ouvindo) parar();
    else iniciar();
  }, [ouvindo, iniciar, parar]);

  return { suportado: ditadoSuportado, ouvindo, parcial, erro, iniciar, parar, alternar };
}
