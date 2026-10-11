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
  'not-allowed': 'Preciso da permissão do microfone. Libere nas configurações do navegador.',
  'service-not-allowed': 'Preciso da permissão do microfone. Libere nas configurações do navegador.',
  'no-speech': 'Não ouvi nada. Toque no microfone e fale de novo.',
  'audio-capture': 'Não achei um microfone neste aparelho.',
  network: 'Sem conexão para transcrever. Confira a internet.',
};

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

  const iniciar = useCallback(() => {
    if (!recRef.current) return;
    setErro('');
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
