import { describe, it, expect } from 'vitest';
import { cleanFooterText, dataUrlToBlob } from './cartas.js';
import { roleFromSession } from './auth.jsx';
import { findNavItem } from './navigation.js';

describe('cleanFooterText (rodapé da empresa)', () => {
  it('devolve vazio para valores ausentes', () => {
    expect(cleanFooterText('')).toBe('');
    expect(cleanFooterText(null)).toBe('');
  });
  it('mantém texto simples', () => {
    expect(cleanFooterText('  Rua A, 100 — Fortaleza/CE  ')).toBe('Rua A, 100 — Fortaleza/CE');
  });
  it('extrai o endereço de um JSON salvo no campo', () => {
    expect(cleanFooterText('{"endereco":"Av. B, 200"}')).toBe('Av. B, 200');
    expect(cleanFooterText('{"texto":"Rodapé"}')).toBe('Rodapé');
  });
  it('pega o primeiro item de uma lista entre aspas', () => {
    expect(cleanFooterText('"Linha 1", "Linha 2"')).toBe('Linha 1');
  });
  it('remove aspas soltas nas pontas', () => {
    expect(cleanFooterText('"Rua C, 300"')).toBe('Rua C, 300');
  });
  it('não quebra com JSON inválido', () => {
    expect(cleanFooterText('{quebrado')).toBe('{quebrado');
  });
});

describe('dataUrlToBlob (PDF salvo em base64)', () => {
  const pdfHeader = '%PDF-1.4';
  const base64 = btoa(pdfHeader);

  it('converte data URL com prefixo', async () => {
    const blob = dataUrlToBlob(`data:application/pdf;base64,${base64}`);
    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toBe(pdfHeader);
  });
  it('converte base64 sem prefixo', async () => {
    expect(await dataUrlToBlob(base64).text()).toBe(pdfHeader);
  });
});

describe('roleFromSession (papéis de acesso)', () => {
  it('sem sessão não tem papel', () => {
    expect(roleFromSession(null)).toBeNull();
  });
  it('conta marcada como promotor é promotor', () => {
    expect(roleFromSession({ user: { app_metadata: { role: 'promotor' } } })).toBe('promotor');
  });
  it('qualquer outra conta logada é admin', () => {
    expect(roleFromSession({ user: { app_metadata: {} } })).toBe('admin');
    expect(roleFromSession({ user: { app_metadata: { role: 'outro' } } })).toBe('admin');
  });
  it('papel em user_metadata (editável pelo usuário) é ignorado', () => {
    expect(roleFromSession({ user: { app_metadata: {}, user_metadata: { role: 'promotor' } } })).toBe('admin');
  });
});

describe('findNavItem (título da página no topo)', () => {
  it('raiz abre o Painel', () => {
    expect(findNavItem('/').name).toBe('Painel');
  });
  it('encontra a página atual e seu grupo', () => {
    const item = findNavItem('/funcionarios');
    expect(item.name).toBe('Funcionários');
    expect(item.group).toBe('Cadastros');
  });
  it('rota desconhecida não tem item', () => {
    expect(findNavItem('/nao-existe')).toBeUndefined();
  });
});

describe('toLoginEmail (login por usuário)', async () => {
  const { toLoginEmail, displayName } = await import('./auth.jsx');
  it('converte nome de usuário em e-mail interno', () => {
    expect(toLoginEmail('TARHGET')).toBe('tarhget@systarhget.app');
    expect(toLoginEmail('  Tarhget ')).toBe('tarhget@systarhget.app');
  });
  it('mantém e-mails reais', () => {
    expect(toLoginEmail('Luciano@Empresa.com.br')).toBe('luciano@empresa.com.br');
  });
  it('mostra o nome de usuário no menu', () => {
    expect(displayName({ email: 'tarhget@systarhget.app' })).toBe('TARHGET');
    expect(displayName({ email: 'luciano@empresa.com.br' })).toBe('luciano@empresa.com.br');
  });
});
