import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('--- BUSCANDO TEMPLATES TEXTO ---');
  const res1 = await supabase.from('templates').select('*');
  if (res1.data) {
    res1.data.forEach(t => {
      console.log(`Template Texto: "${t.nome}" (ID: ${t.id})`);
      // O conteudo possui os placeholders
      console.log(`  Conteudo preview:`, t.conteudo?.substring(0, 100) + '...');
    });
  }

  console.log('\n--- BUSCANDO TEMPLATES PDF ---');
  const res2 = await supabase.from('pdf_templates').select('*');
  if (res2.data) {
    res2.data.forEach(t => {
      console.log(`Template PDF: "${t.name}" (ID: ${t.id})`);
      console.log(`  Fields:`, JSON.stringify(t.fields, null, 2));
    });
  }
}

test();
