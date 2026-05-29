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
  }
}

test();
