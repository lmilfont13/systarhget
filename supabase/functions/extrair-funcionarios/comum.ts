// Utilidades comuns às funções (cópia em cada função para publicar sem pastas extras).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Cliente com a chave de serviço: ignora RLS, só para uso no servidor. */
export function clienteServico(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Usuário dono do token enviado pelo navegador (ou null). */
export async function usuarioDaRequisicao(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await clienteServico().auth.getUser(token);
  if (error) return null;
  return data.user;
}

export const papelDe = (user: { app_metadata?: Record<string, unknown> } | null) => {
  const r = user?.app_metadata?.role;
  return r === 'promotor' || r === 'solicitante' ? r : user ? 'admin' : null;
};
