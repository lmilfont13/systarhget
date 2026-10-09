// deno test --allow-env supabase/functions/processar-solicitacao/agentes_test.ts
import { strict as nodeAssert } from 'node:assert';
const assertEquals = (a: unknown, b: unknown) => nodeAssert.deepEqual(a, b);
const assert = (v: unknown) => nodeAssert.ok(v);
import { resolverPedido, ErroAgente } from './agentes.ts';

const ADAILTON = { id: 'f1', nome: 'ADAILTON JOSE RODRIGUES DO NASCIMENTO', cpf: '05551801314', cargo: 'PROMOTOR(A) JR', cdc: 'COLGATE', semelhanca: 0.82 };
const ADAO = { id: 'f2', nome: 'ADAO SILVA', cpf: '1', cargo: 'REPOSITOR', cdc: 'X', semelhanca: 0.4 };
const LOJA = { id: 'l1', nome: 'Atacadão Messejana', cidade_uf: 'Fortaleza/CE', semelhanca: 0.7 };

function dbFalso() {
  const tabela = (dados: unknown[]) => {
    const q = { select: () => q, eq: () => q, limit: () => Promise.resolve({ data: dados }), order: () => Promise.resolve({ data: dados }),
      not: () => q, in: () => Promise.resolve({ data: [{ id: 'f1', nome: ADAILTON.nome, cargo: ADAILTON.cargo, empresa_id: 'e1', dados_extras: { CPF: ADAILTON.cpf } }] }) };
    return q;
  };
  return {
    rpc: (nome: string) => Promise.resolve({ data: nome === 'buscar_promotores' ? [ADAILTON, ADAO] : [LOJA], error: null }),
    from: (t: string) => (t === 'templates' ? tabela([{ id: 't1' }]) : tabela([])),
  } as never;
}

function respostasIA(...jsons: unknown[]) {
  let n = 0;
  globalThis.fetch = (() => {
    const corpo = jsons[Math.min(n++, jsons.length - 1)];
    return Promise.resolve(new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(corpo) }] })));
  }) as typeof fetch;
}

Deno.env.set('ANTHROPIC_API_KEY', 'teste');

Deno.test('resolve promotor e loja escolhidos pela IA', async () => {
  respostasIA(
    { itens: [{ trecho: 'carta pro adailton no atacadao messejana', promotor: 'adailton', loja: 'atacadao messejana', cpf: '', cargo: '', observacao: '' }] },
    { escolhas: [{ caso: 0, id: 'f1', confianca: 'alta', motivo: 'nome bate' }] },
    { escolhas: [{ caso: 0, id: 'l1', confianca: 'alta', motivo: 'mesma loja' }] },
  );
  const [item] = await resolverPedido(dbFalso(), 'carta pro adailton no atacadao messejana');
  assertEquals(item.promotor.id, 'f1');
  assertEquals(item.loja.id, 'l1');
  assertEquals(item.template_id, 't1');
  assertEquals(item.confianca, 'alta');
});

Deno.test('id inventado pela IA é descartado e o item vai para revisão', async () => {
  respostasIA(
    { itens: [{ trecho: 'x', promotor: 'adailton', loja: 'atacadao', cpf: '', cargo: '', observacao: '' }] },
    { escolhas: [{ caso: 0, id: 'id-que-nao-existe', confianca: 'alta' }] },
    { escolhas: [{ caso: 0, id: 'l1', confianca: 'alta' }] },
  );
  const [item] = await resolverPedido(dbFalso(), 'x');
  assertEquals(item.promotor.id, null);
  assertEquals(item.confianca, 'revisar');
  assert(item.avisos.some((a) => a.includes('Não achei')));
});

Deno.test('texto sem pedido vira erro legível', async () => {
  respostasIA({ itens: [] });
  let erro: unknown;
  try { await resolverPedido(dbFalso(), 'bom dia'); } catch (e) { erro = e; }
  assert(erro instanceof ErroAgente);
});

Deno.test('resposta fora do formato vira erro legível', async () => {
  globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({ content: [{ text: 'desculpe' }] })))) as typeof fetch;
  let erro: unknown;
  try { await resolverPedido(dbFalso(), 'carta pro adailton'); } catch (e) { erro = e; }
  assert(erro instanceof ErroAgente);
});
