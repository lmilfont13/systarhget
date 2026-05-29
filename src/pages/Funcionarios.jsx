import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Trash2, Edit2, Loader2, X, Save, FileText, Copy, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Funcionarios() {
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nome: '', cpf: '', cargo: '' });
  
  // Modal de Edição
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });
  const [newExtraKey, setNewExtraKey] = useState('');
  const [newExtraValue, setNewExtraValue] = useState('');

  // Modal de Template (Splash)
  const [templateModal, setTemplateModal] = useState({ isOpen: false, funcId: null, empresaId: null });

  // Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');

  const filteredFuncionarios = funcionarios.filter(func => {
    if (!func) return false;
    const term = (searchTerm || '').toLowerCase();
    const nome = String(func.nome || '').toLowerCase();
    const cpf = String(func.dados_extras?.CPF || '').toLowerCase();
    const de = func.dados_extras || {};
    const cdc = String(de['NC FUNCIONARIO'] || de['NC'] || de['Cdc'] || de['CDC'] || de['cdc'] || de['Cdc Superior'] || '').toLowerCase();
    
    const matchesTerm = nome.includes(term) || cpf.includes(term);
    const matchesEmpresa = !filterEmpresa || cdc.includes(filterEmpresa.toLowerCase());
    
    return matchesTerm && matchesEmpresa;
  });

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  const fetchFuncionarios = async () => {
    try {
      const [fData, pData, tData] = await Promise.all([
        supabase.from('funcionarios').select('*').order('criado_em', { ascending: false }),
        supabase.from('pdf_templates').select('id, name'),
        supabase.from('templates').select('id, nome')
      ]);

      if (fData.error) throw fData.error;
      
      const allTemplates = [
        ...(pData.data || []).map(t => ({ ...t, type: 'pdf' })),
        ...(tData.data || []).map(t => ({ ...t, type: 'text', name: t.nome }))
      ];

      setFuncionarios(fData.data || []);
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.cpf) {
      toast.error('Nome e CPF são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nome: formData.nome,
        cargo: formData.cargo,
        dados_extras: { CPF: formData.cpf }
      };

      const { data, error } = await supabase
        .from('funcionarios')
        .insert([payload])
        .select();

      if (error) throw error;
      
      setFuncionarios(prev => [data[0], ...prev]);
      setFormData({ nome: '', cpf: '', cargo: '' });
      toast.success('Funcionário cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      toast.error('Erro ao salvar funcionário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    
    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFuncionarios(prev => prev.filter(f => f.id !== id));
      toast.success('Funcionário excluído.');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir funcionário.');
    }
  };

  const openEdit = (func) => {
    // Garante que dados_extras seja um objeto
    const extraData = func.dados_extras || {};
    setEditModal({ isOpen: true, data: { ...func, dados_extras: { ...extraData } } });
  };

  const handleDuplicate = (func) => {
    // Garante que dados_extras seja um objeto
    const extraData = { ...(func.dados_extras || {}) };
    
    // Limpa dados pessoais críticos para garantir que o usuário preencha os novos
    const keysToClear = ['CPF', 'RG', 'CTPS', 'SERIE', 'Série', 'SÉRIE', 'Matrícula', 'MATRICULA'];
    keysToClear.forEach(key => {
      if (extraData[key]) extraData[key] = '';
    });

    setEditModal({ 
      isOpen: true, 
      data: { 
        nome: `(COPIA) ${func.nome}`,
        cargo: func.cargo,
        empresa_id: func.empresa_id,
        dados_extras: extraData
      } 
    });
  };

  const handleEditChange = (field, value) => {
    setEditModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const handleExtraChange = (key, value) => {
    setEditModal(prev => ({
      ...prev,
      data: {
        ...prev.data,
        dados_extras: { ...prev.data.dados_extras, [key]: value }
      }
    }));
  };

  const addExtraField = () => {
    if (!newExtraKey.trim()) return;
    handleExtraChange(newExtraKey.trim(), newExtraValue);
    setNewExtraKey('');
    setNewExtraValue('');
  };

  const removeExtraField = (keyToRemove) => {
    setEditModal(prev => {
      const newExtras = { ...prev.data.dados_extras };
      delete newExtras[keyToRemove];
      return { ...prev, data: { ...prev.data, dados_extras: newExtras } };
    });
  };

  const saveEdit = async () => {
    try {
      const { id, nome, cargo, dados_extras, empresa_id } = editModal.data;
      
      if (id) {
        // Atualização normal
        const { error } = await supabase
          .from('funcionarios')
          .update({ nome, cargo, dados_extras, empresa_id })
          .eq('id', id);

        if (error) throw error;
        setFuncionarios(prev => prev.map(f => f.id === id ? editModal.data : f));
        toast.success('Funcionário atualizado!');
      } else {
        // Inserção (Duplicação)
        const { data, error } = await supabase
          .from('funcionarios')
          .insert([{ nome, cargo, dados_extras, empresa_id }])
          .select();

        if (error) throw error;
        setFuncionarios(prev => [data[0], ...prev]);
        toast.success('Funcionário duplicado com sucesso!');
      }
      
      setEditModal({ isOpen: false, data: null });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar funcionário.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie o banco de dados de funcionários. Você poderá usar esses dados para preencher PDFs rapidamente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulário de Cadastro */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              Novo Funcionário
            </h3>
            
            <div>
              <label htmlFor="nome" className="block text-sm font-medium leading-6 text-gray-900">Nome Completo</label>
              <div className="mt-1">
                <input
                  type="text"
                  name="nome"
                  id="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="João da Silva"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-medium leading-6 text-gray-900">CPF</label>
              <div className="mt-1">
                <input
                  type="text"
                  name="cpf"
                  id="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cargo" className="block text-sm font-medium leading-6 text-gray-900">Cargo</label>
              <div className="mt-1">
                <input
                  type="text"
                  name="cargo"
                  id="cargo"
                  value={formData.cargo}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="Analista Administrativo"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar'}
            </button>
          </form>
        </div>

        {/* Lista de Funcionários */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3">
              <h3 className="text-sm font-medium text-gray-900">Funcionários Cadastrados</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou CPF..." 
                  value={searchTerm || ''}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                <select
                  value={filterEmpresa}
                  onChange={e => setFilterEmpresa(e.target.value)}
                  className="block w-full sm:w-48 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  <option value="">Todos os CDCs</option>
                  {[...new Set(funcionarios.map(f => {
                    const de = f.dados_extras || {};
                    return de['NC FUNCIONARIO'] || de['NC'] || de['Cdc'] || de['CDC'] || de['cdc'] || de['Cdc Superior'];
                  }).filter(Boolean))].sort().map(cdc => (
                    <option key={cdc} value={cdc}>{cdc}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : filteredFuncionarios.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Nenhum funcionário encontrado.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 h-[600px] overflow-y-auto">
                {filteredFuncionarios.map((func) => {
                  const cpf = func?.dados_extras?.CPF || 'Sem CPF';
                  const empNome = String(func.dados_extras?.['Empresa'] || '').toUpperCase();
                  const isPop = empNome.includes('POP');
                  const isSpar = empNome.includes('SPAR');
                  return (
                  <li key={func.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase shrink-0">
                        {String(func.nome || '?').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{func.nome || 'Sem Nome'}</p>
                          {empNome && (isPop || isSpar) && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shadow-sm border ${
                              isPop ? 'bg-[#00AEEF] text-white border-[#00AEEF]' : 'bg-[#003366] text-white border-[#003366]'
                            }`}>
                              {isPop ? 'POP' : 'SPAR'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{func.cargo || 'Sem Cargo'} • CPF: {cpf}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-4">
                      <button 
                        onClick={() => setTemplateModal({ isOpen: true, funcId: func.id, empresaId: func.empresa_id })}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Gerar Documento"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDuplicate(func)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEdit(func)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(func.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                )})}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Splash/Modal de Seleção de Template */}
      {templateModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Gerar Documento Rápido
              </h3>
              <button 
                onClick={() => setTemplateModal({ isOpen: false, funcId: null, empresaId: null })} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">Escolha um template para preencher automaticamente com os dados do funcionário selecionado:</p>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/documentos?func=${templateModal.funcId}&tpl=${t.id}${templateModal.empresaId ? `&emp=${templateModal.empresaId}` : ''}`)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-sm transition-all flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <FileText className={`w-5 h-5 ${t.type === 'pdf' ? 'text-indigo-500' : 'text-orange-500'} group-hover:text-indigo-600`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-700 group-hover:text-indigo-700">{t.name}</span>
                      <span className="text-[10px] uppercase text-gray-400 font-bold">{t.type === 'pdf' ? 'PDF Form' : 'Carta de Texto'}</span>
                    </div>
                  </button>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-3">Nenhum template salvo ainda.</p>
                    <button
                      onClick={() => navigate('/templates')}
                      className="text-indigo-600 text-sm font-medium hover:underline"
                    >
                      Ir para Templates
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Funcionário */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {editModal.data?.id ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Copy className="w-5 h-5 text-amber-600" />}
                {editModal.data?.id ? 'Editar Funcionário' : 'Duplicar Funcionário'}
              </h3>
              <button onClick={() => setEditModal({ isOpen: false, data: null })} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    value={editModal.data.nome}
                    onChange={e => handleEditChange('nome', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cargo</label>
                  <input
                    type="text"
                    value={editModal.data.cargo || ''}
                    onChange={e => handleEditChange('cargo', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Campos Extras (Banco de Dados)</h4>
                
                <div className="space-y-3 mb-4">
                  {Object.entries(editModal.data.dados_extras || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={key}
                        className="block w-1/3 rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm py-2 px-3 border text-gray-500 font-medium"
                      />
                      <input
                        type="text"
                        value={val || ''}
                        onChange={e => handleExtraChange(key, e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                      />
                      <button
                        onClick={() => removeExtraField(key)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                        title="Remover campo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input
                    type="text"
                    placeholder="Nome do Campo (ex: Estado)"
                    value={newExtraKey}
                    onChange={e => setNewExtraKey(e.target.value)}
                    className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                  />
                  <input
                    type="text"
                    placeholder="Valor"
                    value={newExtraValue}
                    onChange={e => setNewExtraValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addExtraField()}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                  />
                  <button
                    onClick={addExtraField}
                    className="p-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md font-medium text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => setEditModal({ isOpen: false, data: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm ${
                  editModal.data?.id ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {editModal.data?.id ? <Save className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {editModal.data?.id ? 'Salvar Alterações' : 'Confirmar Duplicação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
