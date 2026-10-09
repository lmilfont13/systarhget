import { useState, useEffect } from 'react';
import { Store, Plus, Trash2, Edit2, X, Save, Search, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { capitalizeStoreName } from '../lib/formatters';
import { carregarLojas, salvarLoja, excluirLoja } from '../lib/lojas';

export default function Lojas() {
  const [lojas, setLojas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });

  const [origem, setOrigem] = useState('navegador');

  const fetchLojas = async () => {
    try {
      setIsLoading(true);

      // Lojas citadas no cadastro das empresas entram na lista local
      // (e, com o banco disponível, são enviadas para ele junto com as demais)
      const { data: empresasData } = await supabase.from('empresas').select('lojas');
      let locais = [];
      try { locais = JSON.parse(localStorage.getItem('docflow_lojas') || '[]'); } catch { locais = []; }
      const nomes = new Set(locais.map(l => (l.nome || '').toLowerCase().trim()));
      let mudou = false;
      (empresasData || []).forEach(empresa => {
        (Array.isArray(empresa.lojas) ? empresa.lojas : []).forEach(loja => {
          const limpo = String(loja || '').trim();
          if (!limpo || nomes.has(limpo.toLowerCase())) return;
          nomes.add(limpo.toLowerCase());
          locais.push({ id: 'migrated-' + Math.random().toString(36).slice(2, 11), nome: capitalizeStoreName(limpo), endereco: '', cidadeUf: '', cnpj: '' });
          mudou = true;
        });
      });
      if (mudou) {
        try { localStorage.setItem('docflow_lojas', JSON.stringify(locais)); } catch { /* ignora */ }
      }

      const resultado = await carregarLojas();
      setLojas(resultado.lojas);
      setOrigem(resultado.origem);
    } catch (error) {
      console.error('Erro ao buscar lojas:', error);
      toast.error('Erro ao carregar lojas salvas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega as lojas ao abrir a tela
    fetchLojas();
  }, []);

  const openNew = () => {
    setEditModal({
      isOpen: true,
      data: {
        nome: '',
        endereco: '',
        cidadeUf: '',
        cnpj: ''
      }
    });
  };

  const saveLoja = async () => {
    const { id, nome, endereco, cidadeUf, cnpj } = editModal.data;
    if (!nome.trim()) {
      toast.error('O nome da loja é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const salva = await salvarLoja({ id, nome, endereco, cidadeUf, cnpj }, origem);
      setLojas(prev => (id ? prev.map(l => (l.id === id ? salva : l)) : [salva, ...prev]));
      toast.success(id ? 'Loja atualizada com sucesso!' : 'Loja cadastrada com sucesso!');
      setEditModal({ isOpen: false, data: null });
    } catch (error) {
      console.error(error);
      toast.error(error?.code === '23505' ? 'Já existe uma loja com esse nome.' : 'Erro ao salvar a loja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta loja?')) return;
    try {
      await excluirLoja(id, origem);
      setLojas(prev => prev.filter(l => l.id !== id));
      toast.success('Loja excluída com sucesso.');
    } catch {
      toast.error('Erro ao excluir a loja.');
    }
  };

  const filteredLojas = lojas.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      (l.nome || '').toLowerCase().includes(term) ||
      (l.endereco || '').toLowerCase().includes(term) ||
      (l.cidadeUf || '').toLowerCase().includes(term) ||
      (l.cnpj && l.cnpj.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[1.625rem] font-semibold tracking-tight text-ink">Lojas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre e gerencie as lojas disponíveis para seleção rápida na geração de documentos.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Loja
        </button>
      </div>

      {/* Barra de Busca */}
      {!isLoading && origem === 'navegador' && (
        <div className="rounded-xl border border-signal-100 bg-signal-50 px-4 py-3 text-sm text-signal-700">
          As lojas ainda estão salvas só neste navegador, por isso não aparecem em outros computadores nem no Portal.
          Assim que a atualização do banco for aplicada, elas serão enviadas automaticamente.
        </div>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          name="search"
          id="search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-white shadow-sm"
          placeholder="Buscar loja por nome, endereço, cidade ou CNPJ..."
        />
      </div>

      {/* Listagem de Lojas */}
      <div className="bg-white rounded-xl border border-line overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center gap-3 text-indigo-600">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Carregando lojas...</span>
          </div>
        ) : filteredLojas.length === 0 ? (
          <div className="p-16 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-3">
            <Store className="w-12 h-12 text-gray-300 stroke-[1.5]" />
            <div>
              <p className="font-semibold text-gray-700 text-base">Nenhuma loja encontrada</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm ? 'Tente ajustar os termos da sua busca.' : 'Cadastre sua primeira loja clicando em "Nova Loja".'}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredLojas.map((loja) => (
              <li key={loja.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-900">{loja.nome}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      {loja.cidadeUf && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {loja.cidadeUf}
                        </span>
                      )}
                      {loja.endereco && (
                        <span className="text-gray-400 truncate max-w-xs sm:max-w-md">
                          {loja.endereco}
                        </span>
                      )}
                      {loja.cnpj && (
                        <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono text-xs">
                          CNPJ: {loja.cnpj}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setEditModal({ isOpen: true, data: loja })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(loja.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-100 rounded-md hover:bg-red-50 transition-all shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal Criar/Editar Loja */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900">
                {editModal.data.id ? 'Editar Loja' : 'Nova Loja'}
              </h3>
              <button
                onClick={() => setEditModal({ isOpen: false, data: null })}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Nome da Loja <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editModal.data.nome}
                  onChange={e => setEditModal(p => ({ ...p, data: { ...p.data, nome: e.target.value } }))}
                  className="mt-1.5 block w-full rounded-md border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm"
                  placeholder="Ex: Carrefour Anchieta"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Cidade e UF
                </label>
                <input
                  type="text"
                  value={editModal.data.cidadeUf}
                  onChange={e => setEditModal(p => ({ ...p, data: { ...p.data, cidadeUf: e.target.value } }))}
                  className="mt-1.5 block w-full rounded-md border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm"
                  placeholder="Ex: São Bernardo do Campo - SP"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Endereço
                </label>
                <input
                  type="text"
                  value={editModal.data.endereco}
                  onChange={e => setEditModal(p => ({ ...p, data: { ...p.data, endereco: e.target.value } }))}
                  className="mt-1.5 block w-full rounded-md border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm"
                  placeholder="Ex: Via Anchieta, 3300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  CNPJ da Loja (Opcional)
                </label>
                <input
                  type="text"
                  value={editModal.data.cnpj}
                  onChange={e => setEditModal(p => ({ ...p, data: { ...p.data, cnpj: e.target.value } }))}
                  className="mt-1.5 block w-full rounded-md border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm"
                  placeholder="Ex: 00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setEditModal({ isOpen: false, data: null })}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={saveLoja}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                Salvar Loja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
