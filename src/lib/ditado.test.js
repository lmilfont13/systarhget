import { describe, it, expect } from 'vitest';
import { juntarDitado } from './ditado';

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
