import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('empresas').select('nome, logo_url');
  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(d => {
      console.log(`Empresa: ${d.nome}`);
      if (!d.logo_url) {
        console.log('Logo: (vazio)');
      } else if (d.logo_url.startsWith('data:image')) {
        console.log(`Logo: Base64 (length: ${d.logo_url.length})`);
      } else {
        console.log(`Logo: ${d.logo_url}`);
      }
    });
  }
}

test();
