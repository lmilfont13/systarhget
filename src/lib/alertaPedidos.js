/**
 * Som e preferências do alerta de novo pedido (só no navegador do admin).
 * O som é gerado na hora (sem arquivo): duas notas curtas, tipo campainha de balcão.
 */
const CHAVE_MUDO = 'tarhget:alerta-mudo';

export function alertaMudo() {
  try { return localStorage.getItem(CHAVE_MUDO) === '1'; } catch { return false; }
}

export function definirAlertaMudo(mudo) {
  try { localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0'); } catch { /* sem armazenamento */ }
}

let contexto;

export function tocarSino() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    contexto = contexto || new Ctx();
    if (contexto.state === 'suspended') contexto.resume();
    const agora = contexto.currentTime;
    [[880, 0], [1318.5, 0.16]].forEach(([freq, atraso]) => {
      const osc = contexto.createOscillator();
      const vol = contexto.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      vol.gain.setValueAtTime(0.0001, agora + atraso);
      vol.gain.exponentialRampToValueAtTime(0.25, agora + atraso + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + 0.9);
      osc.connect(vol).connect(contexto.destination);
      osc.start(agora + atraso);
      osc.stop(agora + atraso + 1);
    });
  } catch {
    // navegador sem áudio: segue só com o aviso visual
  }
}

/** Pede permissão para avisos do sistema operacional (quando a aba está em segundo plano). */
export async function pedirPermissaoNotificacao() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  try { await Notification.requestPermission(); } catch { /* ignora */ }
}

export function notificarSistema(titulo, corpo, aoClicar) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    const n = new Notification(titulo, { body: corpo, icon: '/favicon.svg', tag: 'tarhget-pedido' });
    n.onclick = () => { window.focus(); aoClicar?.(); n.close(); };
  } catch { /* ignora */ }
}
