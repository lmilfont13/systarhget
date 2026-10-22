import { describe, it, expect } from 'vitest';
import { exemploDePedido, linhaDeExemplo, EXEMPLO_PADRAO } from './exemploPedido';

const pedido = (texto, status = 'aprovada') => ({ texto, status });

describe('linhaDeExemplo', () => {
  it('pega a primeira linha aproveitável', () => {
    expect(linhaDeExemplo('carta pro Adailton no Atacadão\ncarta pra Juliana no Assaí'))
      .toBe('carta pro Adailton no Atacadão');
  });

  it('pula linha curta demais para ensinar algo', () => {
    expect(linhaDeExemplo('oi\n\ncarta pro Adailton no Atacadão')).toBe('carta pro Adailton no Atacadão');
  });

  it('junta espaços e tabulações sobrando', () => {
    expect(linhaDeExemplo('  carta   pro    Adailton  ')).toBe('carta pro Adailton');
  });

  it('recusa texto longo em vez de cortar no meio', () => {
    // Um exemplo terminado em "…" ensina a escrever "…".
    expect(linhaDeExemplo('carta '.repeat(40))).toBe(null);
  });

  it('aguenta texto ausente', () => {
    expect(linhaDeExemplo('')).toBe(null);
    expect(linhaDeExemplo(null)).toBe(null);
    expect(linhaDeExemplo(undefined)).toBe(null);
  });
});

describe('exemploDePedido', () => {
  it('quem nunca pediu vê o exemplo padrão', () => {
    expect(exemploDePedido([])).toBe(EXEMPLO_PADRAO);
    expect(exemploDePedido(null)).toBe(EXEMPLO_PADRAO);
  });

  it('ensina com um pedido do próprio supervisor que deu certo', () => {
    const p = exemploDePedido([pedido('carta pra Lucimar no Pão de Açúcar Aldeota')]);
    expect(p).toBe('Ex.: carta pra Lucimar no Pão de Açúcar Aldeota');
  });

  it('nunca ensina pelo pedido que foi recusado', () => {
    // Era justamente o formato que não funcionou.
    const lista = [
      pedido('carta pro promotor lá daquela loja', 'recusada'),
      pedido('carta pro Adailton no Atacadão Messejana', 'aprovada'),
    ];
    expect(exemploDePedido(lista)).toBe('Ex.: carta pro Adailton no Atacadão Messejana');
  });

  it('ignora pedido ainda em andamento: não se sabe se o formato serviu', () => {
    const lista = [pedido('carta pro Zé', 'processando'), pedido('carta pra Juliana no Assaí Bezerra', 'aprovada')];
    expect(exemploDePedido(lista)).toBe('Ex.: carta pra Juliana no Assaí Bezerra');
  });

  it('usa o pedido aprovado mais recente', () => {
    const lista = [pedido('carta pro Adailton no Atacadão'), pedido('carta antiga pra Juliana no Assaí')];
    expect(exemploDePedido(lista)).toContain('Adailton');
  });

  it('cai no padrão quando o histórico só tem textos inaproveitáveis', () => {
    expect(exemploDePedido([pedido('oi'), pedido('carta '.repeat(40))])).toBe(EXEMPLO_PADRAO);
  });
});
