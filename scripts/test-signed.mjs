import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.storage.from('logos').createSignedUrl('nf7kazbc1a.jpg', 60);
  console.log("Signed URL Error:", error);
  console.log("Signed URL Data:", data);
}

test();
