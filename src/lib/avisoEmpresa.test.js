import { describe, it, expect } from 'vitest';
import { mensagemParaEmpresa } from './avisoEmpresa';

describe('mensagemParaEmpresa', () => {
  it('diz quem pediu e o que pediu', () => {
    const m = mensagemParaEmpresa({ supervisor: 'Marcos Lima', texto: 'carta pro Adailton no Atacadão' });
    expect(m).toContain('Marcos Lima');
    expect(m).toContain('carta pro Adailton no Atacadão');
  });

  it('não deixa a mensagem estourar o limite do link', () => {
    // Pedido com 20 cartas vira um texto enorme; wa.me engasga e o
    // supervisor fica com a tela em branco em vez do WhatsApp aberto.
    const m = mensagemParaEmpresa({ supervisor: 'Marcos', texto: 'x'.repeat(5000) });
    expect(m.length).toBeLessThan(1000);
    expect(m).toContain('…');
  });

  it('funciona sem nome do supervisor', () => {
    const m = mensagemParaEmpresa({ texto: 'carta pro Adailton' });
    expect(m).toContain('carta pro Adailton');
    expect(m).not.toContain('undefined');
  });

  it('inclui o link de revisão quando há endereço do sistema', () => {
    const m = mensagemParaEmpresa({ supervisor: 'Ana', texto: 'carta', site: 'https://sys.app/' });
    expect(m).toContain('https://sys.app/solicitacoes');
  });

  it('omite o link quando não há endereço', () => {
    expect(mensagemParaEmpresa({ texto: 'carta' })).not.toContain('http');
  });
});
