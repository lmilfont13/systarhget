import { Construction } from 'lucide-react';

export default function Auditoria() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
      <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
        <Construction className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800">Auditoria (Em Breve)</h1>
      <p className="text-slate-500 max-w-md text-center">
        Esta página está em construção. Por favor, detalhe o que você gostaria de visualizar e acompanhar aqui (logs de acesso, alterações em documentos, relatórios de atividades, etc.)
      </p>
    </div>
  );
}
