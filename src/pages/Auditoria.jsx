import { ShieldCheck } from 'lucide-react';
import { PageHeader, Panel, EmptyState } from '../components/ui';

export default function Auditoria() {
  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Registro de quem fez o quê no sistema: acessos, documentos emitidos e alterações de cadastro."
      />
      <Panel>
        <EmptyState
          icon={ShieldCheck}
          title="O registro de auditoria ainda não está ativo"
          description="Quando for ativado, cada emissão de carta e alteração de cadastro aparece aqui com data e responsável."
          className="py-20"
        />
      </Panel>
    </div>
  );
}
