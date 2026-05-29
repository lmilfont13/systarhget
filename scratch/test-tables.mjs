import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
  'templates',
  'pdf_templates',
  'funcionarios',
  'empresas',
  'lojas',
  'cartas',
  'historico',
  'historico_cartas',
  'configuracoes',
  'estoque',
  'produtos',
  'users'
];

async function test() {
  for (const table of tables) {
    const res = await supabase.from(table).select('*').limit(1);
    if (res.error) {
      console.log(`Table '${table}': ERROR (${res.error.message}, Code: ${res.error.code})`);
    } else {
      console.log(`Table '${table}': SUCCESS (rows: ${res.data.length})`);
    }
  }
}

test();
