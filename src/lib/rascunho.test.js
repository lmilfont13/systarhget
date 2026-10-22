import { describe, it, expect } from 'vitest';
import {
  lerRascunho, salvarRascunho, limparRascunho,
  guardarPendente, lerPendente, limparPendente,
  pareceFalhaDeRede,
} from './rascunho';

/** localStorage de mentira, com a mesma cara do de verdade. */
function deposito(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get tamanho() { return m.size; },
  };
}

/** Armazenamento que recusa tudo — aba privada, cota cheia. */
const depositoQuebrado = {
  getItem() { throw new Error('bloqueado'); },
  setItem() { throw new Error('cheio'); },
  removeItem() { throw new Error('bloqueado'); },
};

describe('rascunho', () => {
  it('devolve o que foi digitado', () => {
    const d = deposito();
    salvarRascunho('u1', 'carta pro Adailton no Atacadão', d);
    expect(lerRascunho('u1', d)).toBe('carta pro Adailton no Atacadão');
  });

  it('não devolve rascunho de outro supervisor no mesmo telefone', () => {
    const d = deposito();
    salvarRascunho('u1', 'pedido do Marcos', d);
    expect(lerRascunho('u2', d)).toBe('');
  });

  it('campo vazio apaga, para não ressuscitar o que a pessoa limpou', () => {
    const d = deposito();
    salvarRascunho('u1', 'algo', d);
    salvarRascunho('u1', '   ', d);
    expect(lerRascunho('u1', d)).toBe('');
    expect(d.tamanho).toBe(0);
  });

  it('preserva os espaços e as linhas de dentro do texto', () => {
    // Pedido com várias cartas vem em linhas; perder os \n embaralharia tudo.
    const d = deposito();
    salvarRascunho('u1', 'carta pro Adailton\ncarta pra Juliana\n', d);
    expect(lerRascunho('u1', d)).toBe('carta pro Adailton\ncarta pra Juliana\n');
  });

  it('limpar apaga de verdade', () => {
    const d = deposito();
    salvarRascunho('u1', 'algo', d);
    limparRascunho('u1', d);
    expect(lerRascunho('u1', d)).toBe('');
  });

  it('sem armazenamento, não quebra a tela', () => {
    expect(() => salvarRascunho('u1', 'algo', depositoQuebrado)).not.toThrow();
    expect(lerRascunho('u1', depositoQuebrado)).toBe('');
    expect(() => limparRascunho('u1', depositoQuebrado)).not.toThrow();
    expect(lerRascunho('u1', null)).toBe('');
  });
});

describe('pedido pendente (sem sinal)', () => {
  it('guarda o pedido e a hora da tentativa', () => {
    const d = deposito();
    const p = guardarPendente('u1', 'carta pro Adailton', d, new Date('2026-10-22T15:30:00Z'));
    expect(p.texto).toBe('carta pro Adailton');
    expect(lerPendente('u1', d)).toEqual({ texto: 'carta pro Adailton', em: '2026-10-22T15:30:00.000Z' });
  });

  it('uma tentativa nova substitui a anterior em vez de empilhar', () => {
    // Duas pendências viravam duas cartas iguais para a coordenação conferir.
    const d = deposito();
    guardarPendente('u1', 'primeira tentativa', d);
    guardarPendente('u1', 'tentativa corrigida', d);
    expect(lerPendente('u1', d).texto).toBe('tentativa corrigida');
    expect(d.tamanho).toBe(1);
  });

  it('não guarda pedido vazio', () => {
    const d = deposito();
    expect(guardarPendente('u1', '   ', d)).toBe(null);
    expect(lerPendente('u1', d)).toBe(null);
  });

  it('conteúdo estragado é esquecido, não explode', () => {
    const d = deposito({ 'tarhget:pedido-pendente:u1': '{isso não é json' });
    expect(lerPendente('u1', d)).toBe(null);
  });

  it('pendência sem texto é descartada', () => {
    const d = deposito({ 'tarhget:pedido-pendente:u1': '{"em":"2026-10-22T00:00:00Z"}' });
    expect(lerPendente('u1', d)).toBe(null);
  });

  it('limpar apaga a pendência', () => {
    const d = deposito();
    guardarPendente('u1', 'carta', d);
    limparPendente('u1', d);
    expect(lerPendente('u1', d)).toBe(null);
  });

  it('a pendência de um supervisor não vaza para o outro', () => {
    const d = deposito();
    guardarPendente('u1', 'pedido do Marcos', d);
    expect(lerPendente('u2', d)).toBe(null);
  });

  it('sem armazenamento, não quebra a tela', () => {
    expect(() => guardarPendente('u1', 'carta', depositoQuebrado)).not.toThrow();
    expect(lerPendente('u1', depositoQuebrado)).toBe(null);
  });
});

describe('pareceFalhaDeRede', () => {
  it('reconhece o Wi-Fi que não leva a lugar nenhum', () => {
    // navigator.onLine diz "tem rede", o fetch morre assim. É o caso do
    // corredor da loja, e o pedido merece ser guardado igual ao modo avião.
    expect(pareceFalhaDeRede(new TypeError('Failed to fetch'))).toBe(true);
    expect(pareceFalhaDeRede({ message: 'Load failed' })).toBe(true);
    expect(pareceFalhaDeRede({ message: 'Network request failed' })).toBe(true);
    expect(pareceFalhaDeRede({ name: 'NetworkError', message: '' })).toBe(true);
  });

  it('não confunde recusa do servidor com queda de rede', () => {
    // Guardar um pedido que o banco recusou faria a tela prometer um envio
    // que nunca vai acontecer, e a pessoa nunca saberia o que corrigir.
    expect(pareceFalhaDeRede({ code: '42501', message: 'new row violates row-level security policy' })).toBe(false);
    expect(pareceFalhaDeRede({ message: 'Seu acesso está bloqueado' })).toBe(false);
    expect(pareceFalhaDeRede(null)).toBe(false);
    expect(pareceFalhaDeRede(undefined)).toBe(false);
  });
});
