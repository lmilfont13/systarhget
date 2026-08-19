import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkLatestTemplate() {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error(error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log("Latest template name:", data[0].name);
    console.log("Fields:", JSON.stringify(data[0].fields, null, 2));
  } else {
    console.log("No templates found.");
  }
}

checkLatestTemplate();
