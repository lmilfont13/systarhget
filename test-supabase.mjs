import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing templates...');
  const res1 = await supabase.from('templates').select('*');
  console.log('Templates response:', res1.error ? res1.error.message : 'OK, rows: ' + res1.data.length);

  console.log('Testing funcionarios...');
  const res2 = await supabase.from('funcionarios').select('*');
  console.log('Funcionarios response:', res2.error ? res2.error.message : 'OK, rows: ' + res2.data.length);
}

test();
