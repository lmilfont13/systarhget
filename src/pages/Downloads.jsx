import { Download, FileText, Calendar } from 'lucide-react';

export default function Downloads() {
  const documents = [
    { id: 1, name: 'Contrato_Prestacao_Servicos_João.pdf', template: 'Contrato de Serviço', date: '10/05/2026 14:30', size: '156 KB' },
    { id: 2, name: 'Procuracao_Maria_Silva.pdf', template: 'Procuração', date: '10/05/2026 11:15', size: '89 KB' },
    { id: 3, name: 'Recibo_001.pdf', template: 'Recibo Padrão', date: '09/05/2026 16:45', size: '45 KB' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Downloads</h1>
        <p className="mt-1 text-sm text-gray-500">
          Histórico de documentos gerados recentemente. Eles ficam disponíveis no seu navegador.
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-lg border border-gray-100 overflow-hidden">
        <ul role="list" className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-x-6 p-6 hover:bg-gray-50/50 transition-colors">
              <div className="flex min-w-0 gap-x-4 items-center">
                <div className="h-10 w-10 flex-none rounded-lg bg-green-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="text-sm font-semibold leading-6 text-gray-900">
                    {doc.name}
                  </p>
                  <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {doc.template}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {doc.date}
                    </span>
                    <span>•</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-none items-center gap-x-4">
                <button className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4 text-gray-500" />
                  Baixar Novamente
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
