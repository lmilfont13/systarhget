import { createClient } from '@supabase/supabase-js';

const url = 'https://bunnclexcjutrltuybam.supabase.co';
const key = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(url, key);

async function run() {
  const { count, error } = await supabase
    .from('funcionarios')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('TOTAL EMPLOYEES IN DATABASE:', count);
  }
}

run();
