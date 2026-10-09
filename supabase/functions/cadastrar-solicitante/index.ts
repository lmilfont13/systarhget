// Cadastro rápido do supervisor que pede cartas pela área /pedir.
// Cria a conta já confirmada, com o papel "solicitante" (sem acesso ao cadastro).
import { CORS, clienteServico, resposta } from './comum.ts';

const DOMINIO = 'systarhget.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return resposta({ erro: 'Dados inválidos.' }, 400);
  }

  const nome = String(corpo.nome ?? '').trim().replace(/\s+/g, ' ');
  const usuario = String(corpo.usuario ?? '').trim().toLowerCase();
  const senha = String(corpo.senha ?? '');
  const whatsapp = String(corpo.whatsapp ?? '').replace(/\D/g, '');

  if (nome.length < 3 || nome.length > 80) return resposta({ erro: 'Informe seu nome completo.' }, 400);
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
    return resposta({ erro: 'O usuário precisa ter de 3 a 30 letras, números, ponto, hífen ou sublinhado, sem espaços.' }, 400);
  }
  if (senha.length < 8 || senha.length > 72) return resposta({ erro: 'A senha precisa ter pelo menos 8 caracteres.' }, 400);
  if (whatsapp.length < 10 || whatsapp.length > 13) return resposta({ erro: 'Informe o WhatsApp com DDD.' }, 400);

  const admin = clienteServico();
  const { data, error } = await admin.auth.admin.createUser({
    email: `${usuario}@${DOMINIO}`,
    password: senha,
    email_confirm: true,
    app_metadata: { role: 'solicitante' },
    user_metadata: { nome },
  });

  if (error || !data.user) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return resposta({ erro: 'Esse usuário já existe. Escolha outro ou entre com a sua senha.' }, 409);
    }
    console.error('createUser', error);
    return resposta({ erro: 'Não foi possível criar o cadastro agora. Tente de novo.' }, 500);
  }

  const { error: erroPerfil } = await admin
    .from('solicitantes')
    .insert({ user_id: data.user.id, nome, whatsapp, usuario });

  if (erroPerfil) {
    console.error('solicitantes', erroPerfil);
    await admin.auth.admin.deleteUser(data.user.id);
    return resposta({ erro: 'Não foi possível concluir o cadastro. Tente de novo.' }, 500);
  }

  return resposta({ ok: true });
});
