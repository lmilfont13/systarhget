import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateLojas() {
  console.log('Fetching empresas...');
  const { data: empresas, error: empError } = await supabase.from('empresas').select('id, lojas');
  if (empError) {
    console.error('Error fetching empresas:', empError);
    return;
  }

  console.log('Fetching existing lojas...');
  const { data: existingLojas, error: lojError } = await supabase.from('lojas').select('nome');
  if (lojError) {
    console.error('Error fetching lojas:', lojError);
    return;
  }
  const existingNames = new Set(existingLojas.map(l => l.nome));

  const newLojasToInsert = new Set();
  
  empresas.forEach(emp => {
    if (Array.isArray(emp.lojas)) {
      emp.lojas.forEach(loja => {
        if (loja && !existingNames.has(loja)) {
          newLojasToInsert.add(loja);
        }
      });
    }
  });

  const arrayToInsert = Array.from(newLojasToInsert).map(nome => ({ nome, empresa_id: null }));
  
  if (arrayToInsert.length === 0) {
    console.log('No new lojas to migrate.');
    return;
  }

  console.log(`Inserting ${arrayToInsert.length} new lojas...`);
  
  const { error: insertError } = await supabase.from('lojas').insert(arrayToInsert);
  if (insertError) {
    console.error('Error inserting lojas:', insertError);
  } else {
    console.log('Migration completed successfully!');
  }
}

migrateLojas();
