import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const res = await supabase.from('templates').select('*').limit(1);
  console.log('Templates columns:', Object.keys(res.data[0]));
  console.log('Templates sample:', res.data[0]);
}

test();
