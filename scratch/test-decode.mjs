import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('empresas').select('nome, logo_url').eq('nome', 'POP TRADE');
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    const base64 = data[0].logo_url;
    if (base64 && base64.startsWith('data:image')) {
      const base64Data = base64.split(';base64,')[1];
      fs.writeFileSync('scratch/pop-trade-logo.png', Buffer.from(base64Data, 'base64'));
      console.log('Successfully wrote pop-trade-logo.png');
    } else {
      console.log('Not a base64 logo:', base64);
    }
  }
}

test();
