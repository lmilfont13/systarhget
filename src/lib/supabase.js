import { createClient } from '@supabase/supabase-js';

// Tenta obter as variáveis via Vite (import.meta.env) se disponível
// Verifica se import.meta está disponível (ambiente Vite)
let supabaseUrl;
let supabaseAnonKey;
if (typeof import.meta !== 'undefined' && import.meta.env) {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
}

// Fallback para Node (process.env) – carrega .env automaticamente
if (!supabaseUrl || !supabaseAnonKey) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    dotenv.config();
  } catch (_) {}
  supabaseUrl ??= process.env.VITE_SUPABASE_URL;
  supabaseAnonKey ??= process.env.VITE_SUPABASE_ANON_KEY;
}
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️  Faltam as variáveis de ambiente do Supabase! Verifique .env ou as configurações do Vercel.');
}


export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
