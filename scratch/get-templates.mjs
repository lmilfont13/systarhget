import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('templates').select('*');
  if (error) console.error(error);
  else {
     data.forEach(t => {
        console.log(`TEMPLATE: ${t.name} (${t.type})`);
        console.log(`CONTENT: ${t.conteudo ? t.conteudo.substring(0, 200) + '...' : 'N/A'}`);
     });
  }
}
run();
