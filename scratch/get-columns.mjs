import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const resEstoque = await supabase.from('estoque').select('*').limit(1);
  if (resEstoque.data && resEstoque.data.length > 0) {
    const copy = { ...resEstoque.data[0] };
    if (copy.imagem_base64) copy.imagem_base64 = copy.imagem_base64.substring(0, 30) + '...';
    if (copy.imagem) copy.imagem = copy.imagem.substring(0, 30) + '...';
    console.log('ESTOQUE KEYS:', Object.keys(resEstoque.data[0]));
    console.log('ESTOQUE ROW 1:', copy);
  } else {
    console.log('ESTOQUE: no rows or error:', resEstoque.error);
  }

  const resProdutos = await supabase.from('produtos').select('*').limit(1);
  if (resProdutos.data && resProdutos.data.length > 0) {
    const copy = { ...resProdutos.data[0] };
    if (copy.imagem_base64) copy.imagem_base64 = copy.imagem_base64.substring(0, 30) + '...';
    if (copy.imagem) copy.imagem = copy.imagem.substring(0, 30) + '...';
    console.log('PRODUTOS KEYS:', Object.keys(resProdutos.data[0]));
    console.log('PRODUTOS ROW 1:', copy);
  } else {
    console.log('PRODUTOS: no rows or error:', resProdutos.error);
    console.log('Tentando inserir um registro temporário em PRODUTOS para ler as colunas...');
    const insertRes = await supabase.from('produtos').insert({ nome: 'temp_teste_123' }).select();
    if (insertRes.data && insertRes.data.length > 0) {
      console.log('PRODUTOS KEYS (via insert):', Object.keys(insertRes.data[0]));
      // deletar o registro temporario
      const tempId = insertRes.data[0].id;
      if (tempId) {
         await supabase.from('produtos').delete().eq('id', tempId);
         console.log('Registro temporário deletado.');
      }
    } else {
      console.log('Não foi possível inserir o registro temporário:', insertRes.error);
    }
  }
}

test();
