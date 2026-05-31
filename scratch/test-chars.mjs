import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('pdf_templates').select('id, name, fields');
  const nota = data.find(t => t.name.toUpperCase().includes('MODELO_NOTA'));
  
  if (nota) {
    console.log(`Template: ${nota.name}`);
    for (const f of nota.fields.slice(12, 16)) {
        console.log(`Field Name: "${f.name}"`, "Length:", f.name.length);
        console.log(f.name.split('').map(c => c.charCodeAt(0)));
    }
  }
}
run();
