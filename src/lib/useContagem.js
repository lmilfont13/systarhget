import { useEffect, useRef, useState } from 'react';

const prefereMenosMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Faz um número "contar" de onde estava até o valor novo.
 * Respeita a opção do sistema "reduzir movimento" (vai direto ao valor).
 */
export function useContagem(valor, duracao = 900) {
  const [atual, setAtual] = useState(prefereMenosMovimento() ? valor : 0);
  const deRef = useRef(atual);

  useEffect(() => {
    const alvo = Number(valor) || 0;
    if (prefereMenosMovimento()) {
      deRef.current = alvo;
      setAtual(alvo); // eslint-disable-line react-hooks/set-state-in-effect -- sem animação
      return undefined;
    }
    const de = deRef.current;
    const inicio = performance.now();
    let quadro;
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - (1 - t) ** 3;
      const v = Math.round(de + (alvo - de) * suave);
      deRef.current = v;
      setAtual(v);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao]);

  return atual;
}
