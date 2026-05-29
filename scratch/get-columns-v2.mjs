import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const resEstoque = await supabase.from('estoque').select('*').limit(1);
  if (resEstoque.data && resEstoque.data.length > 0) {
    const row = resEstoque.data[0];
    console.log('ESTOQUE_KEYS: ' + Object.keys(row).join(', '));
    for (const key of Object.keys(row)) {
      let val = row[key];
      if (typeof val === 'string' && val.length > 60) {
        val = val.substring(0, 50) + '...';
      }
      console.log(`  estoque.${key}:`, val);
    }
  } else {
    console.log('ESTOQUE_EMPTY_OR_ERR', resEstoque.error);
  }

  const resProdutos = await supabase.from('produtos').select('*').limit(1);
  if (resProdutos.data && resProdutos.data.length > 0) {
    const row = resProdutos.data[0];
    console.log('PRODUTOS_KEYS: ' + Object.keys(row).join(', '));
    for (const key of Object.keys(row)) {
      let val = row[key];
      if (typeof val === 'string' && val.length > 60) {
        val = val.substring(0, 50) + '...';
      }
      console.log(`  produtos.${key}:`, val);
    }
  } else {
    console.log('PRODUTOS_EMPTY_OR_ERR', resProdutos.error);
  }
}

test();
