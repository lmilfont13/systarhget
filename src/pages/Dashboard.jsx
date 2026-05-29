import { useState, useEffect } from 'react';
import { FileText, Users, Clock, Star, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState([
    { name: 'Funcionários', value: '...', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Templates Salvos', value: '...', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { name: 'Documentos Gerados', value: '-', icon: Download, color: 'text-green-600', bg: 'bg-green-100' },
  ]);

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const { count: funcCount } = await supabase
          .from('funcionarios')
          .select('*', { count: 'exact', head: true });
          
        const { count: templateCount } = await supabase
          .from('pdf_templates')
          .select('*', { count: 'exact', head: true });
        
        setStats([
          { name: 'Funcionários', value: funcCount || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
          { name: 'Templates Salvos', value: templateCount || 0, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { name: 'Documentos Gerados', value: '-', icon: Download, color: 'text-green-600', bg: 'bg-green-100' },
        ]);

        const { data: recentFuncs } = await supabase
          .from('funcionarios')
          .select('id, nome, criado_em')
          .order('criado_em', { ascending: false })
          .limit(4);

        if (recentFuncs) {
          setRecentActivity(recentFuncs.map(f => ({
            id: f.id,
            content: `Novo funcionário:`,
            target: f.nome,
            date: new Date(f.criado_em).toLocaleDateString('pt-BR')
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      }
    }
    
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bem-vindo ao DocFlow Hub. Aqui está o resumo real do seu sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-xl bg-white/80 backdrop-blur-sm p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md"
          >
            <dt>
              <div className={`absolute rounded-lg p-3 ${item.bg}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
              <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            </dd>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ações Rápidas */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Ações Rápidas</h3>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                to="/templates"
                className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-indigo-400 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Star className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Templates</p>
                  <p className="truncate text-sm text-gray-500">Mapear PDFs</p>
                </div>
              </Link>

              <Link
                to="/documentos"
                className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-indigo-400 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Documentos</p>
                  <p className="truncate text-sm text-gray-500">Gerar novos</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Últimos Funcionários Cadastrados</h3>
            <div className="mt-6 flow-root">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma atividade recente.</p>
              ) : (
                <ul role="list" className="-mb-8">
                  {recentActivity.map((event, eventIdx) => (
                    <li key={event.id}>
                      <div className="relative pb-8">
                        {eventIdx !== recentActivity.length - 1 ? (
                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center ring-8 ring-white">
                              <Users className="h-4 w-4 text-blue-500" />
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-gray-500">
                                {event.content}{' '}
                                <span className="font-medium text-gray-900">{event.target}</span>
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              <time dateTime={event.date}>{event.date}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
