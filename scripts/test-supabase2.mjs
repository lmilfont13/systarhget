import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const res2 = await supabase.from('funcionarios').select('*').limit(1);
  console.log('Funcionarios columns:', Object.keys(res2.data[0]));
  console.log('Sample data:', res2.data[0]);
}

test();
