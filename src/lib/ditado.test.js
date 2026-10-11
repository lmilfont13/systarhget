import { describe, it, expect } from 'vitest';
import { juntarDitado, pedirMicrofone } from './ditado';

/** Erro no formato que o navegador devolve (o nome é o que importa). */
const erroDoNavegador = (name) => Object.assign(new Error(name), { name });

function mediaDevicesFalso(resultado) {
  const parados = [];
  const devices = {
    getUserMedia: () => {
      if (resultado instanceof Error) return Promise.reject(resultado);
      return Promise.resolve({ getTracks: () => [{ stop: () => parados.push('parou') }] });
    },
  };
  return { devices, parados };
}

describe('pedirMicrofone', () => {
  it('libera quando a pessoa autoriza', async () => {
    const { devices } = mediaDevicesFalso('ok');
    expect(await pedirMicrofone(devices)).toEqual({ ok: true });
  });

  it('desliga o microfone depois de confirmar a permissão', async () => {
    // Só queríamos a autorização: quem grava de verdade é o reconhecedor de fala.
    const { devices, parados } = mediaDevicesFalso('ok');
    await pedirMicrofone(devices);
    expect(parados).toEqual(['parou']);
  });

  it('avisa quando a permissão foi negada ou está bloqueada', async () => {
    const { devices } = mediaDevicesFalso(erroDoNavegador('NotAllowedError'));
    const r = await pedirMicrofone(devices);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/bloqueado/i);
  });

  it('avisa quando não há microfone no aparelho', async () => {
    const { devices } = mediaDevicesFalso(erroDoNavegador('NotFoundError'));
    const r = await pedirMicrofone(devices);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/microfone/i);
  });

  it('avisa quando outro programa está usando o microfone', async () => {
    const { devices } = mediaDevicesFalso(erroDoNavegador('NotReadableError'));
    const r = await pedirMicrofone(devices);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/outro programa|em uso/i);
  });

  it('não trava quando o navegador não tem a API de mídia', async () => {
    // Sem como pedir antes: deixa o reconhecedor tentar e falar por si.
    expect(await pedirMicrofone(undefined)).toEqual({ ok: true });
  });
});

describe('juntarDitado', () => {
  it('começa o texto quando o campo está vazio', () => {
    expect(juntarDitado('', 'carta pro Adailton')).toBe('carta pro Adailton');
  });

  it('emenda o trecho novo com um espaço', () => {
    expect(juntarDitado('carta pro Adailton', 'no Atacadão Messejana'))
      .toBe('carta pro Adailton no Atacadão Messejana');
  });

  it('não dobra o espaço quando o texto já termina com um', () => {
    expect(juntarDitado('carta pro Adailton ', 'no Atacadão'))
      .toBe('carta pro Adailton no Atacadão');
  });

  it('respeita a quebra de linha que a pessoa digitou', () => {
    expect(juntarDitado('carta pro Adailton\n', 'e pra Juliana no Assaí'))
      .toBe('carta pro Adailton\ne pra Juliana no Assaí');
  });

  it('ignora trecho vazio ou só de espaço', () => {
    expect(juntarDitado('carta pro Adailton', '   ')).toBe('carta pro Adailton');
    expect(juntarDitado('carta pro Adailton', '')).toBe('carta pro Adailton');
  });

  it('aguenta campo ausente', () => {
    expect(juntarDitado(undefined, 'carta pro Adailton')).toBe('carta pro Adailton');
  });
});
