import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('pdf_templates').select('id, name, fields');
  const notas = data.filter(t => t.name.toUpperCase().includes('MODELO'));
  
  for (const nota of notas) {
    console.log(`\nTemplate: ${nota.name}`);
    const fieldsNames = nota.fields.map(f => f.name);
    console.log(`Fields (${fieldsNames.length}):\n${fieldsNames.join('\n')}`);
  }
}
run();
