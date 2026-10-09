/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

/**
 * Papéis:
 *  - 'promotor': conta usada no Portal do Promotor. Só lê cadastros e registra cartas.
 *  - 'solicitante': supervisor que pede cartas pela área /pedir. Não vê o cadastro.
 *  - 'admin': qualquer outra conta. Acesso completo ao painel.
 * O papel vem de app_metadata.role, que só pode ser definido pelo painel do Supabase
 * (o usuário não consegue alterá-lo pelo navegador).
 */
export function roleFromSession(session) {
  const role = session?.user?.app_metadata?.role;
  if (!session) return null;
  if (role === 'promotor' || role === 'solicitante') return role;
  return 'admin';
}

/** Domínio usado para contas por nome de usuário (sem e-mail real), como TARHGET. */
export const USER_DOMAIN = 'systarhget.app';

/** "TARHGET" vira "tarhget@systarhget.app"; e-mails passam como estão. */
export function toLoginEmail(login) {
  const value = String(login || '').trim().toLowerCase();
  return value.includes('@') ? value : `${value}@${USER_DOMAIN}`;
}

/** Nome para exibir: usuário (TARHGET) para contas por nome, e-mail para as demais. */
export function displayName(user) {
  const email = user?.email || '';
  if (email.endsWith(`@${USER_DOMAIN}`)) return email.split('@')[0].toUpperCase();
  return email;
}

/** Conta usada pelo Portal do Promotor. A senha fica só no Supabase. */
export const PORTAL_EMAIL = toLoginEmail(import.meta.env.VITE_PORTAL_EMAIL || 'TARHGET');

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(email), password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    if (!String(email).includes('@')) {
      throw new Error('Contas por nome de usuário não recebem e-mail. Peça ao administrador para trocar a senha.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecovering(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      role: roleFromSession(session),
      loading,
      recovering,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
    }),
    [session, loading, recovering, signIn, signOut, sendPasswordReset, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

/** Traduz os erros mais comuns do Supabase Auth para mensagens acionáveis. */
export function authErrorMessage(error) {
  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Usuário ou senha incorretos.';
  if (msg.includes('email not confirmed')) return 'Confirme o e-mail pelo link enviado antes de entrar.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (msg.includes('password should be') || msg.includes('at least')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Sem conexão com o servidor. Verifique a internet.';
  return error?.message || 'Não foi possível concluir. Tente de novo.';
}
