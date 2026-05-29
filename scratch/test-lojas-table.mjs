import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing lojas table...');
  const res = await supabase.from('lojas').select('*').limit(1);
  if (res.error) {
    console.log('Lojas response ERROR:', res.error.message, 'Code:', res.error.code);
  } else {
    console.log('Lojas response SUCCESS, rows:', res.data.length);
    console.log('Sample data:', res.data);
  }
}

test();
