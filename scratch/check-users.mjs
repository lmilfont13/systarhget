import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: companies, error } = await supabase.from('empresas').select('nome, auth_user_id');
  if (error) {
    console.error(error);
  } else {
    console.log('Companies auth_user_id:');
    companies.forEach(c => {
      console.log(`- ${c.nome}: auth_user_id = ${c.auth_user_id}`);
    });
  }
}

run();
