import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('pdf_templates').select('id, name, fields');
  const nota = data.find(t => t.name.toUpperCase().includes('NOTA'));
  if (nota) {
    console.log(`Fields for ${nota.name}:`);
    console.log(nota.fields);
  } else {
    console.log('No NOTA DE DÉBITO found in pdf_templates.');
  }
}
run();
