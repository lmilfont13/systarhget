import { describe, it, expect } from 'vitest';
import { juntarDitado, pedirMicrofone, estadoDaPermissao, origemDoBloqueio } from './ditado';

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

describe('estadoDaPermissao', () => {
  const permissionsFalso = (state) => ({ query: () => Promise.resolve({ state, addEventListener() {} }) });

  it('devolve o estado que o navegador informa', async () => {
    expect(await estadoDaPermissao(permissionsFalso('denied'))).toBe('denied');
    expect(await estadoDaPermissao(permissionsFalso('granted'))).toBe('granted');
    expect(await estadoDaPermissao(permissionsFalso('prompt'))).toBe('prompt');
  });

  it('devolve null quando o navegador não sabe responder', async () => {
    // Safari não aceita consultar 'microphone'.
    expect(await estadoDaPermissao({ query: () => Promise.reject(new Error('x')) })).toBe(null);
    expect(await estadoDaPermissao(undefined)).toBe(null);
  });
});

describe('origemDoBloqueio', () => {
  it('aponta o site quando foi o próprio navegador que negou', () => {
    expect(origemDoBloqueio('denied')).toBe('site');
  });

  it('aponta o sistema quando o navegador não é quem está negando', () => {
    // Windows com "aplicativos da área de trabalho" desligado, ou antivírus
    // com escudo de microfone: a permissão do site está em ordem e mesmo
    // assim o getUserMedia é recusado. Mandar a pessoa no cadeado seria
    // mandá-la para o lugar errado.
    expect(origemDoBloqueio('granted')).toBe('sistema');
    expect(origemDoBloqueio('prompt')).toBe('sistema');
  });

  it('aponta o sistema quando não dá para consultar a permissão', () => {
    expect(origemDoBloqueio(null)).toBe('sistema');
    expect(origemDoBloqueio(undefined)).toBe('sistema');
  });
});

describe('pedirMicrofone: de que tipo foi a recusa', () => {
  const recusa = (name) => ({ getUserMedia: () => Promise.reject(Object.assign(new Error(name), { name })) });

  it('marca como recusa de permissão quando foi negado', async () => {
    expect((await pedirMicrofone(recusa('NotAllowedError'))).negouPermissao).toBe(true);
  });

  it('não marca como permissão quando o problema é outro', async () => {
    // Sem microfone ou microfone ocupado não têm nada a ver com permissão:
    // mandar a pessoa mexer em configuração seria desperdiçar o tempo dela.
    expect((await pedirMicrofone(recusa('NotFoundError'))).negouPermissao).toBe(false);
    expect((await pedirMicrofone(recusa('NotReadableError'))).negouPermissao).toBe(false);
  });
});
