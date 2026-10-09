import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth, authErrorMessage } from '../lib/auth';
import { Wordmark, Button } from '../components/ui';
import { MarcaDesenhada } from '../components/Lacre';

function Field({ label, id, ...props }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
      <input id={id} className="h-10 w-full border bg-white px-3 text-[0.9375rem] text-ink" {...props} />
    </div>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export default function Login() {
  const { session, role, loading, recovering, signIn, sendPasswordReset, updatePassword } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('login'); // login | forgot | sent
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!loading && session && !recovering) {
    const from = location.state?.from?.pathname;
    return <Navigate to={role === 'promotor' ? '/promotores' : from || '/dashboard'} replace />;
  }

  const run = (fn) => async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onLogin = run(() => signIn(email, password));
  const onForgot = run(async () => { await sendPasswordReset(email); setMode('sent'); });
  const onNewPassword = run(async () => {
    if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
    await updatePassword(password);
  });

  let title = 'Entrar';
  let subtitle = 'Use seu usuário ou e-mail e a senha.';
  let body;

  if (recovering) {
    title = 'Criar nova senha';
    subtitle = 'Escolha uma senha com pelo menos 8 caracteres.';
    body = (
      <form onSubmit={onNewPassword} className="space-y-4">
        <Field label="Nova senha" id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar nova senha
        </Button>
      </form>
    );
  } else if (mode === 'forgot') {
    title = 'Recuperar senha';
    subtitle = 'Enviamos um link para você criar uma senha nova.';
    body = (
      <form onSubmit={onForgot} className="space-y-4">
        <Field label="E-mail" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          Enviar link
        </Button>
        <button type="button" onClick={() => { setMode('login'); setError(''); }} className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para o login
        </button>
      </form>
    );
  } else if (mode === 'sent') {
    title = 'Confira seu e-mail';
    subtitle = `Se ${email} tiver uma conta, o link para criar a senha chega em alguns minutos.`;
    body = (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-3 text-sm text-brand-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          Link enviado. Ele vale por 1 hora.
        </div>
        <Button variant="secondary" className="h-10 w-full" onClick={() => setMode('login')}>Voltar para o login</Button>
      </div>
    );
  } else {
    body = (
      <form onSubmit={onLogin} className="space-y-4">
        <Field label="Usuário ou e-mail" id="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <Field label="Senha" id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="h-10 w-full" disabled={busy || loading}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Entrar
        </Button>
        <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="w-full text-center text-sm text-slate-500 hover:text-brand-700">
          Esqueci minha senha
        </button>
      </form>
    );
  }

  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[1.05fr_1fr]">
      {/* Lado da marca: vinho profundo, luz em movimento e o selo se desenhando */}
      <section className="relative flex min-h-56 items-center justify-center overflow-hidden bg-brand-950 px-6 py-10 text-brand-100 lg:min-h-dvh">
        <span className="luz-vinho left-[-10%] top-[-15%] h-[70%] w-[70%] bg-brand-700/70" aria-hidden="true" />
        <span className="luz-vinho bottom-[-20%] right-[-15%] h-[65%] w-[65%] bg-brand-500/35 [animation-delay:-8s]" aria-hidden="true" />
        <div className="relative flex flex-col items-center text-center">
          <MarcaDesenhada className="h-24 w-24 text-brand-100 sm:h-32 sm:w-32 lg:h-56 lg:w-56" />
          <div className="palavra-marca mt-6 lg:mt-10">
            <Wordmark className="text-2xl tracking-[0.32em] text-white lg:text-[2.6rem]" />
            <p className="mt-3 hidden max-w-xs text-sm leading-relaxed text-brand-200/80 lg:block">
              Cartas de apresentação e gestão de promotores, emitidas e registradas num só lugar.
            </p>
          </div>
        </div>
      </section>

      {/* Lado do formulário */}
      <section className="flex items-start justify-center px-4 py-8 lg:items-center lg:py-10">
        <div className="w-full max-w-sm animate-enter">
          <div className="panel p-6 shadow-lg sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mt-1 mb-6 text-sm text-slate-500">{subtitle}</p>
            {body}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">Problemas para entrar? Fale com o administrador do sistema.</p>
        </div>
      </section>
    </div>
  );
}
