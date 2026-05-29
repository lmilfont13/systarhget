import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('--- TESTANDO TABELA ESTOQUE ---');
  // 1. Inserir
  const insertPayload = {
    nomeNovo: 'TESTE DE ATIVO INTEGRADO',
    tipo: 'Outro',
    tamanho: 'G',
    modelo: 'Modelo de Teste',
    empresa: 'Empresa Teste',
    imei: '1234567890',
    detalhes: 'Detalhe de teste',
    tipoAssociacao: 'PROMOTOR',
    nomeAssociacao: 'NOME DE TESTE'
  };
  const insertRes = await supabase.from('estoque').insert([insertPayload]).select();
  if (insertRes.error) {
    console.error('Erro ao inserir no estoque:', insertRes.error.message);
  } else {
    console.log('Sucesso ao inserir no estoque! Registro ID:', insertRes.data[0].id);
    const id = insertRes.data[0].id;

    // 2. Atualizar
    const updateRes = await supabase.from('estoque').update({ detalhes: 'Detalhe de teste atualizado' }).eq('id', id).select();
    if (updateRes.error) {
      console.error('Erro ao atualizar estoque:', updateRes.error.message);
    } else {
      console.log('Sucesso ao atualizar estoque! Novo detalhe:', updateRes.data[0].detalhes);
    }

    // 3. Excluir
    const deleteRes = await supabase.from('estoque').delete().eq('id', id);
    if (deleteRes.error) {
      console.error('Erro ao excluir do estoque:', deleteRes.error.message);
    } else {
      console.log('Sucesso ao excluir do estoque!');
    }
  }

  console.log('\n--- TESTANDO TABELA PRODUTOS ---');
  // 1. Inserir
  const insertProdPayload = {
    nome: 'TESTE DE PRODUTO INTEGRADO',
    tipo: 'Outro',
    detalhes: 'Detalhe de teste de produto',
    estoque_minimo: 10
  };
  const insertProdRes = await supabase.from('produtos').insert([insertProdPayload]).select();
  if (insertProdRes.error) {
    console.error('Erro ao inserir produto:', insertProdRes.error.message);
  } else {
    console.log('Sucesso ao inserir produto! Registro ID:', insertProdRes.data[0].id);
    const id = insertProdRes.data[0].id;

    // 2. Atualizar
    const updateProdRes = await supabase.from('produtos').update({ detalhes: 'Detalhe de teste de produto atualizado' }).eq('id', id).select();
    if (updateProdRes.error) {
      console.error('Erro ao atualizar produto:', updateProdRes.error.message);
    } else {
      console.log('Sucesso ao atualizar produto! Novo detalhe:', updateProdRes.data[0].detalhes);
    }

    // 3. Excluir
    const deleteProdRes = await supabase.from('produtos').delete().eq('id', id);
    if (deleteProdRes.error) {
      console.error('Erro ao excluir produto:', deleteProdRes.error.message);
    } else {
      console.log('Sucesso ao excluir produto!');
    }
  }
}

test();
