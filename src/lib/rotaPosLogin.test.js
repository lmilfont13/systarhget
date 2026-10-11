import { describe, it, expect } from 'vitest';
import { destinoPosLogin, deveRedirecionar } from './rotaPosLogin';

describe('destinoPosLogin', () => {
  it('manda cada papel pro seu lugar padrão', () => {
    expect(destinoPosLogin({ role: 'promotor' })).toBe('/promotores');
    expect(destinoPosLogin({ role: 'solicitante' })).toBe('/pedir');
    expect(destinoPosLogin({ role: 'admin' })).toBe('/dashboard');
  });

  it('respeita a rota que mandou a pessoa pro login, acima do papel', () => {
    // O bug: uma sessão antiga de supervisor sequestrava o destino e jogava
    // sempre pra /pedir, sem como chegar no painel.
    expect(destinoPosLogin({ role: 'solicitante', from: '/solicitacoes' })).toBe('/solicitacoes');
    expect(destinoPosLogin({ role: 'admin', from: '/solicitacoes' })).toBe('/solicitacoes');
  });

  it('cai no painel quando não há papel nem destino', () => {
    expect(destinoPosLogin()).toBe('/dashboard');
    expect(destinoPosLogin({ role: null })).toBe('/dashboard');
  });
});

describe('deveRedirecionar', () => {
  const logado = { loading: false, session: { user: {} }, recovering: false, trocando: false };

  it('redireciona quem já está logado', () => {
    expect(deveRedirecionar(logado)).toBe(true);
  });

  it('não redireciona sem sessão, carregando ou criando senha nova', () => {
    expect(deveRedirecionar({ ...logado, session: null })).toBe(false);
    expect(deveRedirecionar({ ...logado, loading: true })).toBe(false);
    expect(deveRedirecionar({ ...logado, recovering: true })).toBe(false);
  });

  it('segura o formulário enquanto está trocando de conta', () => {
    expect(deveRedirecionar({ ...logado, trocando: true })).toBe(false);
  });

  it('volta a redirecionar quando a troca termina — senão fica preso no login', () => {
    // O bug: ?trocar=1 ficava na URL depois de entrar, e o redirecionamento
    // pós-login nunca acontecia.
    expect(deveRedirecionar({ ...logado, trocando: false })).toBe(true);
  });
});
