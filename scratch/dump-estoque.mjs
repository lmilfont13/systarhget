import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Fetching estoque sample...');
  const resEstoque = await supabase.from('estoque').select('*');
  if (resEstoque.error) {
    console.error('Estoque error:', resEstoque.error.message);
  } else {
    console.log('Estoque rows count:', resEstoque.data.length);
    if (resEstoque.data.length > 0) {
      console.log('Estoque columns:', Object.keys(resEstoque.data[0]));
      console.log('Estoque data:', JSON.stringify(resEstoque.data, null, 2));
    }
  }

  console.log('\nFetching produtos sample...');
  const resProdutos = await supabase.from('produtos').select('*');
  if (resProdutos.error) {
    console.error('Produtos error:', resProdutos.error.message);
  } else {
    console.log('Produtos rows count:', resProdutos.data.length);
    if (resProdutos.data.length > 0) {
      console.log('Produtos columns:', Object.keys(resProdutos.data[0]));
      console.log('Produtos data:', JSON.stringify(resProdutos.data, null, 2));
    }
  }
}

test();
