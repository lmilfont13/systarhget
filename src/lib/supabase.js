import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Configure o .env local ou as variáveis do projeto na Vercel.');
}

export const supabase = createClient(supabaseUrl ?? 'http://localhost', supabaseAnonKey ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Cliente separado para a área /pedir (supervisor).
 * Por quê: por padrão o Supabase guarda a sessão numa única chave do localStorage,
 * compartilhada por todas as abas do mesmo navegador. Isso fazia o admin logado numa
 * aba ser desconectado ao entrar como supervisor em outra aba (ou vice-versa). Uma
 * chave de sessão própria para o supervisor resolve: as duas sessões convivem no
 * mesmo navegador, cada uma na sua aba.
 */
export const supabaseSolicitante = createClient(supabaseUrl ?? 'http://localhost', supabaseAnonKey ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-tarhget-pedir-auth',
  },
});
