import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('pdf_templates').select('*');
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
    console.log(data[0].fields);
  }
}
run();
