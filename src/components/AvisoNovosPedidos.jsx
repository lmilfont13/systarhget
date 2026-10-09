import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  alertaMudo, definirAlertaMudo, tocarSino, pedirPermissaoNotificacao, notificarSistema,
} from '../lib/alertaPedidos';

/**
 * Fica de ouvido nos pedidos: quando um supervisor envia um, toca a campainha,
 * mostra um aviso em qualquer tela do painel e pisca o título da aba.
 * Também é o botão de sino do topo (liga/desliga o som).
 */
export default function AvisoNovosPedidos() {
  const navigate = useNavigate();
  const [mudo, setMudo] = useState(alertaMudo);
  const [novos, setNovos] = useState(0);

  useEffect(() => {
    const canal = supabase
      .channel(`aviso-pedidos-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitacoes' }, async ({ new: pedido }) => {
        const { data } = await supabase.from('solicitantes').select('nome').eq('user_id', pedido.solicitante_id).maybeSingle();
        const quem = data?.nome || 'Um supervisor';
        const resumo = String(pedido.texto || '').slice(0, 140);
        const abrir = () => navigate(`/solicitacoes?abrir=${pedido.id}`);

        if (!alertaMudo()) tocarSino();
        setNovos((n) => n + 1);
        toast(`Novo pedido de carta · ${quem}`, {
          description: `“${resumo}”`,
          duration: 20000,
          action: { label: 'Abrir', onClick: abrir },
        });
        notificarSistema(`Novo pedido de ${quem}`, resumo, abrir);
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [navigate]);

  // Pisca o título da aba até a pessoa voltar para ela
  useEffect(() => {
    if (!novos) return undefined;
    const original = document.title;
    let alterna = false;
    const t = setInterval(() => {
      alterna = !alterna;
      document.title = alterna ? `(${novos}) Novo pedido · Tarhget` : original;
    }, 1200);
    const voltar = () => { if (!document.hidden) setNovos(0); };
    document.addEventListener('visibilitychange', voltar);
    window.addEventListener('focus', voltar);
    return () => {
      clearInterval(t);
      document.title = original;
      document.removeEventListener('visibilitychange', voltar);
      window.removeEventListener('focus', voltar);
    };
  }, [novos]);

  const alternar = () => {
    const proximo = !mudo;
    setMudo(proximo);
    definirAlertaMudo(proximo);
    if (!proximo) {
      tocarSino();
      pedirPermissaoNotificacao();
      toast.success('Alerta de novos pedidos ligado.');
    } else {
      toast('Som dos alertas desligado. O aviso na tela continua.');
    }
  };

  return (
    <button
      onClick={alternar}
      className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink sm:inline-flex"
      aria-label={mudo ? 'Ligar som dos novos pedidos' : 'Desligar som dos novos pedidos'}
      title={mudo ? 'Som dos novos pedidos: desligado' : 'Som dos novos pedidos: ligado'}
    >
      {mudo ? <BellOff className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
    </button>
  );
}
