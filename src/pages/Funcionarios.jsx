import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Trash2, Edit2, Loader2, X, Save, FileText, Copy, Info, Search, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Funcionarios() {
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    cargo: '',
    rg: '',
    ctps: '',
    serie: '',
    matricula: '',
    cdc: '',
    empresaConta: '',
    empresa_id: ''
  });
  
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
      const [fData, pData, tData, eData] = await Promise.all([
        supabase.from('funcionarios').select('*').order('criado_em', { ascending: false }),
        supabase.from('pdf_templates').select('id, name'),
        supabase.from('templates').select('id, nome'),
        supabase.from('empresas').select('id, nome')
      ]);

      if (fData.error) throw fData.error;
      
      const allTemplates = [
        ...(pData.data || []).map(t => ({ ...t, type: 'pdf' })),
        ...(tData.data || []).map(t => ({ ...t, type: 'text', name: t.nome }))
      ];

      setFuncionarios(fData.data || []);
      setTemplates(allTemplates);
      setEmpresas(eData.data || []);
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
        nome: String(formData.nome || '').toUpperCase().trim(),
        cargo: formData.cargo,
        empresa_id: formData.empresa_id || null,
        dados_extras: {
          CPF: formData.cpf,
          RG: formData.rg || '',
          CTPS: formData.ctps || '',
          SERIE: formData.serie || '',
          MATRICULA: formData.matricula || '',
          'NC FUNCIONARIO': formData.cdc || '',
          'Empresa': formData.empresaConta || ''
        }
      };

      const { data, error } = await supabase
        .from('funcionarios')
        .insert([payload])
        .select();

      if (error) throw error;
      
      setFuncionarios(prev => [data[0], ...prev]);
      setFormData({
        nome: '',
        cpf: '',
        cargo: '',
        rg: '',
        ctps: '',
        serie: '',
        matricula: '',
        cdc: '',
        empresaConta: '',
        empresa_id: ''
      });
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
    const extraData = func.dados_extras || {};
    setEditModal({ isOpen: true, data: { ...func, dados_extras: { ...extraData } } });
  };

  const handleDuplicate = (func) => {
    const extraData = { ...(func.dados_extras || {}) };
    
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
      const nomeUpper = String(nome || '').toUpperCase().trim();
      
      if (id) {
        const { error } = await supabase
          .from('funcionarios')
          .update({ nome: nomeUpper, cargo, dados_extras, empresa_id: empresa_id || null })
          .eq('id', id);

        if (error) throw error;
        
        // Atualiza a lista local com o nome em caixa alta
        const updatedData = { ...editModal.data, nome: nomeUpper };
        setFuncionarios(prev => prev.map(f => f.id === id ? updatedData : f));
        toast.success('Funcionário atualizado!');
      } else {
        const { data, error } = await supabase
          .from('funcionarios')
          .insert([{ nome: nomeUpper, cargo, dados_extras, empresa_id: empresa_id || null }])
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
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Funcionários</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie o cadastro de promotores e colaboradores da sua operação.
          </p>
        </div>
        <button
          onClick={() => setEditModal({
            isOpen: true,
            data: {
              nome: '',
              cargo: '',
              empresa_id: '',
              dados_extras: {
                CPF: '',
                RG: '',
                CTPS: '',
                SERIE: '',
                MATRICULA: '',
                'NC FUNCIONARIO': '',
                'Empresa': ''
              }
            }
          })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-3 shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Funcionário
        </button>
      </div>

      <div className="w-full">
        {/* Lista de Funcionários */}
        <div>
          <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Funcionários Cadastrados</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou CPF..." 
                  value={searchTerm || ''}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2 px-3.5 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                />
                <select
                  value={filterEmpresa}
                  onChange={e => setFilterEmpresa(e.target.value)}
                  className="block w-full sm:w-48 rounded-xl border-0 py-2 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white"
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
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredFuncionarios.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-medium">
                Nenhum funcionário encontrado.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 h-[650px] overflow-y-auto">
                {filteredFuncionarios.map((func) => {
                  const cpf = func?.dados_extras?.CPF || 'Sem CPF';
                  const empNome = String(func.dados_extras?.['Empresa'] || '').toUpperCase();
                  const isPop = empNome.includes('POP');
                  const isSpar = empNome.includes('SPAR');
                  return (
                    <li key={func.id} className="flex items-center justify-between p-4 hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-extrabold uppercase shrink-0">
                          {String(func.nome || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">{String(func.nome || 'Sem Nome').toUpperCase()}</p>
                            {empNome && (isPop || isSpar) && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase shadow-sm border ${
                                isPop ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {isPop ? 'POP' : 'SPAR'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{func.cargo || 'Sem Cargo'} • CPF: {cpf}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-4">
                        <button 
                          onClick={() => setTemplateModal({ isOpen: true, funcId: func.id, empresaId: func.empresa_id })}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Gerar Documento"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDuplicate(func)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEdit(func)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(func.id)}
                          className="p-2 text-slate-400 hover:text-red-655 hover:bg-red-50 rounded-xl transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Splash/Modal de Seleção de Template */}
      {templateModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Gerar Documento Rápido
              </h3>
              <button 
                onClick={() => setTemplateModal({ isOpen: false, funcId: null, empresaId: null })} 
                className="text-gray-400 hover:text-gray-605 transition-colors p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4 font-medium">Escolha o template para preenchimento automático:</p>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/documentos?func=${templateModal.funcId}&tpl=${t.id}${templateModal.empresaId ? `&emp=${templateModal.empresaId}` : ''}`)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-sm transition-all flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <FileText className={`w-4 h-4 ${t.type === 'pdf' ? 'text-indigo-500' : 'text-orange-500'} group-hover:text-indigo-600`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700 group-hover:text-indigo-700 text-sm">{t.name}</span>
                      <span className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">{t.type === 'pdf' ? 'Formulário PDF' : 'Carta de Texto'}</span>
                    </div>
                  </button>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-3">Nenhum template salvo ainda.</p>
                    <button
                      onClick={() => navigate('/templates')}
                      className="text-indigo-600 text-sm font-semibold hover:underline"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                {editModal.data?.id ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Copy className="w-5 h-5 text-amber-600" />}
                {editModal.data?.id ? 'Editar Cadastro' : 'Duplicar Cadastro'}
              </h3>
              <button onClick={() => setEditModal({ isOpen: false, data: null })} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Seção 1: Informações Básicas */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider w-fit">1. Informações Básicas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={editModal.data.nome || ''}
                      onChange={e => handleEditChange('nome', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cargo</label>
                    <input
                      type="text"
                      value={editModal.data.cargo || ''}
                      onChange={e => handleEditChange('cargo', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vínculo Empresa</label>
                    <select
                      value={editModal.data.empresa_id || ''}
                      onChange={e => handleEditChange('empresa_id', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border bg-white shadow-sm transition-all"
                    >
                      <option value="">Nenhum Vínculo...</option>
                      {empresas.map(e => (
                        <option key={e.id} value={e.id}>{e.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados de Identidade & Trabalho */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider w-fit">2. Documentação da Carta</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CPF</label>
                    <input
                      type="text"
                      value={editModal.data.dados_extras?.CPF || ''}
                      onChange={e => handleExtraChange('CPF', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">RG</label>
                    <input
                      type="text"
                      value={editModal.data.dados_extras?.RG || ''}
                      onChange={e => handleExtraChange('RG', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CTPS (Nº Carteira)</label>
                    <input
                      type="text"
                      value={editModal.data.dados_extras?.CTPS || ''}
                      onChange={e => handleExtraChange('CTPS', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Série CTPS</label>
                    <input
                      type="text"
                      value={editModal.data.dados_extras?.SERIE || ''}
                      onChange={e => handleExtraChange('SERIE', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Matrícula</label>
                    <input
                      type="text"
                      value={editModal.data.dados_extras?.MATRICULA || ''}
                      onChange={e => handleExtraChange('MATRICULA', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CDC / Centro de Custo</label>
                    <input
                      type="text"
                      value={editModal.data.dados_extras?.['NC FUNCIONARIO'] || ''}
                      onChange={e => handleExtraChange('NC FUNCIONARIO', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Conta / Cliente / Empresa</label>
                    <input
                      type="text"
                      value={editModal.data.dados_extras?.Empresa || ''}
                      onChange={e => handleExtraChange('Empresa', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border shadow-sm transition-all"
                      placeholder="Ex: Colgate"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Custom Fields */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider w-fit mb-4">3. Outros Campos Personalizados</h4>
                
                <div className="space-y-3 mb-4">
                  {Object.entries(editModal.data.dados_extras || {})
                    .filter(([key]) => !['CPF', 'RG', 'CTPS', 'SERIE', 'MATRICULA', 'NC FUNCIONARIO', 'Empresa'].includes(key))
                    .map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
                        <input
                          type="text"
                          readOnly
                          value={key}
                          className="block w-1/3 rounded-xl border-slate-200 bg-slate-50 shadow-sm sm:text-sm py-2 px-3 border text-slate-500 font-medium"
                        />
                        <input
                          type="text"
                          value={val || ''}
                          onChange={e => handleExtraChange(key, e.target.value)}
                          className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-550 sm:text-sm py-2 px-3 border"
                        />
                        <button
                          onClick={() => removeExtraField(key)}
                          className="p-2 text-red-500 hover:bg-red-55 border border-transparent rounded-xl transition-all"
                          title="Remover campo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  
                  {Object.entries(editModal.data.dados_extras || {})
                    .filter(([key]) => !['CPF', 'RG', 'CTPS', 'SERIE', 'MATRICULA', 'NC FUNCIONARIO', 'Empresa'].includes(key)).length === 0 && (
                      <p className="text-xs text-slate-400 italic">Nenhum campo personalizado cadastrado.</p>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Nome do Campo (ex: Estado)"
                    value={newExtraKey}
                    onChange={e => setNewExtraKey(e.target.value)}
                    className="block w-1/3 rounded-xl border-slate-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
                  />
                  <input
                    type="text"
                    placeholder="Valor"
                    value={newExtraValue}
                    onChange={e => setNewExtraValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addExtraField()}
                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
                  />
                  <button
                    onClick={addExtraField}
                    type="button"
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => setEditModal({ isOpen: false, data: null })}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white border border-transparent rounded-xl shadow-md transition-all ${
                  editModal.data?.id ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-amber-600 hover:bg-amber-500'
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
