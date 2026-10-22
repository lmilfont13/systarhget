import { useCallback, useEffect, useState } from 'react';
import { UserCheck, UserX, Trash2, Loader2, MessageCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Panel, Button, EmptyState, Skeleton } from '../components/ui';
import { listarSupervisores, definirAtivo, excluirSupervisor, podeExcluirSupervisor } from '../lib/supervisores';
import { cn } from '../lib/cn';

const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

function Confirmacao({ supervisor, onCancelar, onConfirmar, ocupado }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Excluir {supervisor.nome}?</h2>
            <p className="mt-1 text-sm text-slate-600">
              A conta some de vez e a pessoa perde o acesso na hora. Não dá para desfazer.
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="h-10 flex-1" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </Button>
          <button
            onClick={onConfirmar}
            disabled={ocupado}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function LinhaSupervisor({ supervisor, onAlternar, onExcluir, ocupado }) {
  const exclusao = podeExcluirSupervisor(supervisor);

  return (
    <li className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5', !supervisor.ativo && 'bg-slate-50/60')}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn('truncate font-medium', supervisor.ativo ? 'text-ink' : 'text-slate-500')}>
            {supervisor.nome}
          </p>
          {!supervisor.ativo && (
            <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
              Desativado
            </span>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
          <span className="font-mono text-xs">{supervisor.usuario}</span>
          {supervisor.whatsapp && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {supervisor.whatsapp}
            </span>
          )}
          <span>
            {supervisor.pedidos === 0
              ? 'nenhum pedido'
              : `${supervisor.pedidos} ${supervisor.pedidos === 1 ? 'pedido' : 'pedidos'}`}
          </span>
          {supervisor.criado_em && <span className="text-slate-400">desde {fmtData.format(new Date(supervisor.criado_em))}</span>}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onAlternar(supervisor)}
          disabled={ocupado}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-ink disabled:opacity-50"
        >
          {supervisor.ativo
            ? <><UserX className="h-4 w-4" aria-hidden="true" /> Desativar</>
            : <><UserCheck className="h-4 w-4" aria-hidden="true" /> Reativar</>}
        </button>

        {/* Excluir só aparece para quem não tem histórico. Quem tem, se desativa:
            apagar levaria junto as cartas já emitidas. */}
        <button
          onClick={() => (exclusao.pode ? onExcluir(supervisor) : toast.info(exclusao.motivo))}
          disabled={ocupado}
          title={exclusao.pode ? 'Excluir de vez' : exclusao.motivo}
          className={cn(
            'inline-flex items-center justify-center rounded-lg border p-1.5 disabled:opacity-50',
            exclusao.pode
              ? 'border-line text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600'
              : 'border-transparent text-slate-300',
          )}
          aria-label={exclusao.pode ? `Excluir ${supervisor.nome}` : `Não dá para excluir ${supervisor.nome}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export default function Supervisores() {
  const [supervisores, setSupervisores] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(null);

  const recarregar = useCallback(() => {
    listarSupervisores()
      .then(setSupervisores)
      .catch(() => {
        setSupervisores([]);
        toast.error('Não consegui carregar os supervisores.');
      });
  }, []);

  useEffect(recarregar, [recarregar]);

  const alternar = async (supervisor) => {
    setOcupado(true);
    try {
      await definirAtivo(supervisor.user_id, !supervisor.ativo);
      toast.success(
        supervisor.ativo
          ? `${supervisor.nome} não pede mais cartas. O histórico continua aqui.`
          : `${supervisor.nome} voltou a pedir cartas.`,
      );
      recarregar();
    } catch {
      toast.error('Não consegui mudar o acesso agora.');
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async () => {
    setOcupado(true);
    try {
      await excluirSupervisor(confirmando.user_id);
      toast.success(`${confirmando.nome} foi excluído.`);
      setConfirmando(null);
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const ativos = (supervisores || []).filter((s) => s.ativo).length;

  return (
    <div className="animate-enter">
      <PageHeader
        title="Supervisores"
        description="Quem pode pedir carta pela área dos supervisores."
      />

      <Panel
        title="Contas"
        icon={UserCheck}
        meta={supervisores ? `${ativos} ${ativos === 1 ? 'ativo' : 'ativos'} de ${supervisores.length}` : null}
        bodyClassName="p-0"
      >
        {supervisores === null ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : supervisores.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Nenhum supervisor ainda"
            description="Os supervisores se cadastram sozinhos na área de pedidos."
            className="py-12"
          />
        ) : (
          <ul className="divide-y divide-line">
            {supervisores.map((s) => (
              <LinhaSupervisor
                key={s.user_id}
                supervisor={s}
                onAlternar={alternar}
                onExcluir={setConfirmando}
                ocupado={ocupado}
              />
            ))}
          </ul>
        )}
      </Panel>

      <p className="mt-4 max-w-prose text-sm text-slate-500">
        Quem já pediu carta não pode ser excluído: apagar a conta levaria junto os pedidos e
        as cartas emitidas por eles, que são documento oficial. Nesse caso, desative — a
        pessoa perde o acesso na hora e o histórico fica inteiro.
      </p>

      {confirmando && (
        <Confirmacao
          supervisor={confirmando}
          ocupado={ocupado}
          onCancelar={() => setConfirmando(null)}
          onConfirmar={excluir}
        />
      )}
    </div>
  );
}
