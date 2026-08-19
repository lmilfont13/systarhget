import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('empresas').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    const row = data[0];
    console.log('Columns and types/lengths:');
    for (const key of Object.keys(row)) {
      const val = row[key];
      console.log(`Column "${key}": type of value is ${typeof val}, length/value is ${val ? String(val).length : 'null'}`);
    }
  } else {
    console.log('No rows found in empresas.');
  }
}

check();
