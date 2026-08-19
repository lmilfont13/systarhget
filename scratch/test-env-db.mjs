import { createClient } from '@supabase/supabase-js';

const url1 = process.env.VITE_SUPABASE_URL;
const key1 = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing .env URL:', url1);
const supabase1 = createClient(url1, key1);

async function run() {
  try {
    const { data, error } = await supabase1.from('templates').select('*').limit(1);
    if (error) {
      console.log('Error with .env URL:', error);
    } else {
      console.log('Success with .env URL, data:', data);
    }
  } catch (err) {
    console.error('Catch error with .env URL:', err);
  }

  // Also test standard fetch to see if it resolves
  try {
    const res = await fetch(url1);
    console.log('Fetch .env URL response status:', res.status);
  } catch (err) {
    console.error('Fetch .env URL failed:', err);
  }
}

run();
