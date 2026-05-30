import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Loader2, X, Save, FileText, Copy, Search, Building2, Link2, BarChart3, Tag, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

// Cores distintas para badges de empresas (empresa vinculada - CDC/POP/SPAR etc.)
const EMPRESA_COLORS = [
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-500' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300', dot: 'bg-violet-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', dot: 'bg-cyan-500' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
];

function getEmpresaColor(empresaId, allEmpresas) {
  if (!empresaId) return null;
  const idx = allEmpresas.findIndex(e => e.id === empresaId);
  if (idx < 0) return EMPRESA_COLORS[0];
  return EMPRESA_COLORS[idx % EMPRESA_COLORS.length];
}

export default function Funcionarios() {
  const navigate = useNavigate();
  const [funcionarios, setFuncionarios] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Edição completa
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });
  const [newExtraKey, setNewExtraKey] = useState('');
  const [newExtraValue, setNewExtraValue] = useState('');

  // Modal de Template
  const [templateModal, setTemplateModal] = useState({ isOpen: false, funcId: null, empresaId: null });

  // Modal de Associação Rápida (empresa + conta + CDC)
  const [assocModal, setAssocModal] = useState({ isOpen: false, func: null });
  const [assocEmpresaId, setAssocEmpresaId] = useState('');
  const [assocConta, setAssocConta] = useState('');
  const [assocCdc, setAssocCdc] = useState('');
  const [isSavingAssoc, setIsSavingAssoc] = useState(false);

  // Painel Resumo
  const [showResumo, setShowResumo] = useState(false);

  // Busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresaId, setFilterEmpresaId] = useState('');
  const [showSemEmpresa, setShowSemEmpresa] = useState(false);

  // Normaliza texto removendo acentos para busca sensitiva
  const norm = (str) =>
    String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const filteredFuncionarios = funcionarios
    .filter(func => {
      if (!func) return false;
      const q = norm(searchTerm);
      const matchesTerm = !q || (
        norm(func.nome).includes(q) ||
        norm(func.dados_extras?.CPF).includes(q) ||
        norm(func.dados_extras?.Empresa).includes(q) ||
        norm(func.cargo).includes(q)
      );
      if (showSemEmpresa) return matchesTerm && !func.empresa_id;
      const matchesEmpresa = !filterEmpresaId || func.empresa_id === filterEmpresaId;
      return matchesTerm && matchesEmpresa;
    })
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

  useEffect(() => { fetchFuncionarios(); }, []);

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

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    try {
      const { error } = await supabase.from('funcionarios').delete().eq('id', id);
      if (error) throw error;
      setFuncionarios(prev => prev.filter(f => f.id !== id));
      toast.success('Funcionário excluído.');
    } catch (error) {
      toast.error('Erro ao excluir funcionário.');
    }
  };

  const openEdit = (func) => {
    setEditModal({ isOpen: true, data: { ...func, dados_extras: { ...(func.dados_extras || {}) } } });
  };

  const handleDuplicate = (func) => {
    const extraData = { ...(func.dados_extras || {}) };
    ['CPF', 'RG', 'CTPS', 'SERIE', 'Série', 'SÉRIE', 'Matrícula', 'MATRICULA'].forEach(k => { if (extraData[k]) extraData[k] = ''; });
    setEditModal({ isOpen: true, data: { nome: `(COPIA) ${func.nome}`, cargo: func.cargo, empresa_id: func.empresa_id, dados_extras: extraData } });
  };

  const handleEditChange = (field, value) => setEditModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  const handleExtraChange = (key, value) => setEditModal(prev => ({ ...prev, data: { ...prev.data, dados_extras: { ...prev.data.dados_extras, [key]: value } } }));

  const addExtraField = () => {
    if (!newExtraKey.trim()) return;
    handleExtraChange(newExtraKey.trim(), newExtraValue);
    setNewExtraKey(''); setNewExtraValue('');
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
        const { error } = await supabase.from('funcionarios').update({ nome: nomeUpper, cargo, dados_extras, empresa_id: empresa_id || null }).eq('id', id);
        if (error) throw error;
        setFuncionarios(prev => prev.map(f => f.id === id ? { ...editModal.data, nome: nomeUpper } : f));
        toast.success('Funcionário atualizado!');
      } else {
        const { data, error } = await supabase.from('funcionarios').insert([{ nome: nomeUpper, cargo, dados_extras, empresa_id: empresa_id || null }]).select();
        if (error) throw error;
        setFuncionarios(prev => [data[0], ...prev]);
        toast.success('Funcionário cadastrado com sucesso!');
      }
      setEditModal({ isOpen: false, data: null });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar funcionário.');
    }
  };

  // Abre modal de associação rápida
  const openAssocModal = (func) => {
    setAssocModal({ isOpen: true, func });
    setAssocEmpresaId(func.empresa_id || '');
    
    const getExtraTolerante = (extras, possiveisChaves) => {
      if (!extras) return '';
      for (const [k, v] of Object.entries(extras)) {
        if (possiveisChaves.includes(String(k).toUpperCase().trim())) return v;
      }
      return '';
    };

    setAssocConta(getExtraTolerante(func.dados_extras, ['EMPRESA', 'CONTA', 'CLIENTE']));
    setAssocCdc(getExtraTolerante(func.dados_extras, ['NC FUNCIONARIO', 'CDC', 'Nº CDC', 'N° CDC', 'NC_FUNCIONARIO', 'NC']));
  };

  // Salva associação rápida (empresa, conta, cdc)
  const saveAssociacao = async () => {
    if (!assocModal.func) return;
    setIsSavingAssoc(true);
    try {
      const novosDadosExtras = {
        ...(assocModal.func.dados_extras || {}),
        Empresa: assocConta.toUpperCase().trim(),
        'NC FUNCIONARIO': assocCdc.toUpperCase().trim(),
      };
      const { error } = await supabase
        .from('funcionarios')
        .update({ empresa_id: assocEmpresaId || null, dados_extras: novosDadosExtras })
        .eq('id', assocModal.func.id);
      if (error) throw error;
      setFuncionarios(prev => prev.map(f =>
        f.id === assocModal.func.id
          ? { ...f, empresa_id: assocEmpresaId || null, dados_extras: novosDadosExtras }
          : f
      ));
      toast.success('Associação salva com sucesso!');
      setAssocModal({ isOpen: false, func: null });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar associação.');
    } finally {
      setIsSavingAssoc(false);
    }
  };

  // Resumo por empresa
  const resumoPorEmpresa = empresas.map(emp => ({
    ...emp,
    total: funcionarios.filter(f => f.empresa_id === emp.id).length,
    color: getEmpresaColor(emp.id, empresas)
  })).sort((a, b) => b.total - a.total);
  const semEmpresaCount = funcionarios.filter(f => !f.empresa_id).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Funcionários</h1>
          <p className="mt-1 text-sm text-slate-500">Gerencie promotores, contas e empresas vinculadas.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowResumo(v => !v)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-sm transition-all ${showResumo ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Resumo por Empresa
          </button>
          <button
            onClick={() => setEditModal({ isOpen: true, data: { nome: '', cargo: '', empresa_id: '', dados_extras: { CPF: '', RG: '', CTPS: '', SERIE: '', MATRICULA: '', 'NC FUNCIONARIO': '', 'Empresa': '' } } })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Funcionário
          </button>
        </div>
      </div>

      {/* Painel Resumo por Empresa */}
      {showResumo && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Distribuição por Empresa</h3>
            <span className="ml-auto text-xs text-slate-400 font-medium">{funcionarios.length} funcionários no total</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumoPorEmpresa.map((emp) => {
              const pct = funcionarios.length > 0 ? Math.round((emp.total / funcionarios.length) * 100) : 0;
              const col = emp.color;
              return (
                <button key={emp.id} onClick={() => { setFilterEmpresaId(emp.id); setShowSemEmpresa(false); setShowResumo(false); }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border ${col.border} ${col.bg} hover:opacity-80 transition-all text-left`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${col.bg} border ${col.border}`}>
                    <Building2 className={`w-4 h-4 ${col.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-extrabold uppercase truncate ${col.text}`}>{emp.nome}</p>
                    <div className="mt-1 h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full ${col.dot} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xl font-black ${col.text}`}>{emp.total}</p>
                    <p className={`text-[9px] font-bold uppercase ${col.text} opacity-60`}>{pct}%</p>
                  </div>
                </button>
              );
            })}
            <button onClick={() => { setShowSemEmpresa(true); setFilterEmpresaId(''); setShowResumo(false); }}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100 border border-slate-200">
                <Link2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold uppercase text-slate-500">Sem Empresa</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Não associados</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-black text-slate-600">{semEmpresaCount}</p>
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  {funcionarios.length > 0 ? Math.round((semEmpresaCount / funcionarios.length) * 100) : 0}%
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Lista de Funcionários */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              Funcionários Cadastrados
              {(filterEmpresaId || showSemEmpresa) && (
                <button onClick={() => { setFilterEmpresaId(''); setShowSemEmpresa(false); }}
                  className="ml-1 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold hover:bg-indigo-200 transition-all">
                  {showSemEmpresa ? 'Sem empresa' : (empresas.find(e => e.id === filterEmpresaId)?.nome || '')} ✕
                </button>
              )}
            </h3>
            <span className="text-xs text-slate-400">{filteredFuncionarios.length} de {funcionarios.length}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Buscar por nome, CPF ou conta..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="block w-full rounded-xl border-0 py-2 pl-9 pr-3 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm" />
            </div>
            <select value={filterEmpresaId} onChange={e => { setFilterEmpresaId(e.target.value); setShowSemEmpresa(false); }}
              className="block w-full sm:w-48 rounded-xl border-0 py-2 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white">
              <option value="">Todas as Empresas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : filteredFuncionarios.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500 font-medium">Nenhum funcionário encontrado.</div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
            {filteredFuncionarios.map((func) => {
              const cpf = func?.dados_extras?.CPF || 'Sem CPF';

              const getExtraTolerante = (extras, possiveisChaves) => {
                if (!extras) return '';
                for (const [k, v] of Object.entries(extras)) {
                  const keyNorm = String(k).toUpperCase().trim();
                  if (possiveisChaves.includes(keyNorm)) return v;
                }
                return '';
              };

              const conta = getExtraTolerante(func?.dados_extras, ['EMPRESA', 'CONTA', 'CLIENTE']); // Ex: COLGATE
              const cdc = getExtraTolerante(func?.dados_extras, ['NC FUNCIONARIO', 'CDC', 'Nº CDC', 'N° CDC', 'NC_FUNCIONARIO', 'NC']); // Ex: 1234

              const empresaVinculada = empresas.find(e => e.id === func.empresa_id);
              const cor = getEmpresaColor(func.empresa_id, empresas);
              const semEmp = !func.empresa_id;

              // Não mostrar badge de conta se é igual ou muito similar à empresa vinculada
              // (ex: evitar "POP TRADE" + "POP TRADE MARKETING E CONSULTORIA LTDA")
              const empNomeNorm = (empresaVinculada?.nome || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
              const contaNorm = conta.toUpperCase().replace(/[^A-Z0-9]/g, '');
              const contaERedundante = empNomeNorm.length > 0 && (
                contaNorm.includes(empNomeNorm) || empNomeNorm.includes(contaNorm)
              );
              const contaParaMostrar = contaERedundante ? '' : conta;

              return (
                <li key={func.id} className="p-4 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar + Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-extrabold uppercase shrink-0 mt-0.5">
                        {String(func.nome || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Nome */}
                        <p className="text-sm font-bold text-slate-900 truncate">{String(func.nome || 'Sem Nome').toUpperCase()}</p>
                        {/* Sub-info */}
                        <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{func.cargo || 'Sem Cargo'} • CPF: {cpf}</p>

                        {/* SELOS - linha de badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {/* Selo 1: Empresa Vinculada (CDC, POP, SPAR etc.) */}
                          {empresaVinculada && cor ? (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border flex items-center gap-1 ${cor.bg} ${cor.text} ${cor.border}`}>
                              <Building2 className="w-2.5 h-2.5" />
                              {empresaVinculada.nome}
                            </span>
                          ) : semEmp ? (
                            <button onClick={() => openAssocModal(func)}
                              className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border border-dashed border-slate-300 text-slate-400 bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1"
                              title="Clique para associar empresa">
                              <Link2 className="w-2.5 h-2.5" /> Sem empresa
                            </button>
                          ) : null}

                          {/* Selo 2: Conta/Cliente — só aparece se diferente da empresa vinculada */}
                          {contaParaMostrar ? (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border border-amber-300 bg-amber-50 text-amber-800 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              {contaParaMostrar}
                            </span>
                          ) : !contaERedundante ? (
                            <button onClick={() => openAssocModal(func)}
                              className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border border-dashed border-amber-300 text-amber-500 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-400 transition-all flex items-center gap-1"
                              title="Clique para associar conta (ex: COLGATE)">
                              <Tag className="w-2.5 h-2.5" /> Sem conta
                            </button>
                          ) : null}

                          {/* Selo 3: CDC */}
                          {cdc ? (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border border-slate-300 bg-slate-100 text-slate-600 flex items-center gap-1">
                              <Hash className="w-2.5 h-2.5" />
                              CDC: {cdc}
                            </span>
                          ) : (
                            <button onClick={() => openAssocModal(func)}
                              className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border border-dashed border-slate-300 text-slate-400 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all flex items-center gap-1"
                              title="Clique para associar CDC">
                              <Hash className="w-2.5 h-2.5" /> Sem CDC
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setTemplateModal({ isOpen: true, funcId: func.id, empresaId: func.empresa_id })}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Gerar Documento">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => openAssocModal(func)}
                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all" title="Associar Empresa / Conta / CDC">
                        <Building2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDuplicate(func)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Duplicar">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(func)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(func.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ============================================
          MODAL: ASSOCIAÇÃO RÁPIDA (Empresa + Conta + CDC)
          ============================================ */}
      {assocModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-indigo-50/40">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-600" />
                Associação Rápida
              </h3>
              <button onClick={() => setAssocModal({ isOpen: false, func: null })} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nome do funcionário */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  {String(assocModal.func?.nome || '?').charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Funcionário</p>
                  <p className="text-sm font-bold text-slate-900 uppercase">{assocModal.func?.nome}</p>
                </div>
              </div>

              {/* SEÇÃO 1: Empresa Vinculada */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  Empresa (CDC / POP / SPAR...)
                </label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  <button onClick={() => setAssocEmpresaId('')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2.5 text-sm ${assocEmpresaId === '' ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-500">Sem empresa</span>
                    {assocEmpresaId === '' && <span className="ml-auto text-slate-500 font-black text-xs">✓</span>}
                  </button>
                  {empresas.map((emp) => {
                    const col = getEmpresaColor(emp.id, empresas);
                    const isSelected = assocEmpresaId === emp.id;
                    return (
                      <button key={emp.id} onClick={() => setAssocEmpresaId(emp.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2.5 text-sm ${isSelected ? `${col.border} ${col.bg} ring-2 ring-offset-1 ring-indigo-200` : 'border-slate-200 hover:bg-slate-50'}`}>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${col.bg} border ${col.border} shrink-0`}>
                          <Building2 className={`w-3 h-3 ${col.text}`} />
                        </div>
                        <span className={`font-bold uppercase ${isSelected ? col.text : 'text-slate-700'}`}>{emp.nome}</span>
                        {isSelected && <span className={`ml-auto font-black text-xs ${col.text}`}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SEÇÃO 2: Conta/Cliente */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  Conta / Cliente
                  <span className="text-[9px] normal-case text-slate-400 font-normal ml-1">ex: COLGATE, UNILEVER, NESTLE</span>
                </label>
                <input
                  type="text"
                  value={assocConta}
                  onChange={e => setAssocConta(e.target.value)}
                  placeholder="Ex: COLGATE"
                  className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm py-2.5 px-3 border shadow-sm uppercase"
                />
              </div>

              {/* SEÇÃO 3: CDC */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  CDC / Centro de Custo
                  <span className="text-[9px] normal-case text-slate-400 font-normal ml-1">ex: 10045, 8821-SP</span>
                </label>
                <input
                  type="text"
                  value={assocCdc}
                  onChange={e => setAssocCdc(e.target.value)}
                  placeholder="Ex: 10045"
                  className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm py-2.5 px-3 border shadow-sm uppercase"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button onClick={() => setAssocModal({ isOpen: false, func: null })}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button onClick={saveAssociacao} disabled={isSavingAssoc}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-xl shadow-md transition-all disabled:opacity-60">
                {isSavingAssoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar Associações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          MODAL: SELEÇÃO DE TEMPLATE
          ============================================ */}
      {templateModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Gerar Documento Rápido
              </h3>
              <button onClick={() => setTemplateModal({ isOpen: false, funcId: null, empresaId: null })}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4 font-medium">Escolha o template para preenchimento automático:</p>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {templates.map(t => (
                  <button key={t.id}
                    onClick={() => navigate(`/documentos?func=${templateModal.funcId}&tpl=${t.id}${templateModal.empresaId ? `&emp=${templateModal.empresaId}` : ''}`)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                      <FileText className={`w-4 h-4 ${t.type === 'pdf' ? 'text-indigo-500' : 'text-orange-500'}`} />
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
                    <button onClick={() => navigate('/templates')} className="text-indigo-600 text-sm font-semibold hover:underline">Ir para Templates</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          MODAL: EDIÇÃO COMPLETA DE FUNCIONÁRIO
          ============================================ */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                {editModal.data?.id ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                {editModal.data?.id ? 'Editar Cadastro' : editModal.data?.nome?.startsWith('(COPIA)') ? 'Duplicar Cadastro' : 'Novo Cadastro'}
              </h3>
              <button onClick={() => setEditModal({ isOpen: false, data: null })} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Seção 1: Básico */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider w-fit">1. Informações Básicas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input type="text" value={editModal.data.nome || ''} onChange={e => handleEditChange('nome', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cargo</label>
                    <input type="text" value={editModal.data.cargo || ''} onChange={e => handleEditChange('cargo', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vínculo Empresa</label>
                    <select value={editModal.data.empresa_id || ''} onChange={e => handleEditChange('empresa_id', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border bg-white shadow-sm">
                      <option value="">Nenhum Vínculo...</option>
                      {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Documentação */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider w-fit">2. Documentação da Carta</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CPF</label>
                    <input type="text" value={editModal.data.dados_extras?.CPF || ''} onChange={e => handleExtraChange('CPF', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">RG</label>
                    <input type="text" value={editModal.data.dados_extras?.RG || ''} onChange={e => handleExtraChange('RG', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CTPS (Nº Carteira)</label>
                    <input type="text" value={editModal.data.dados_extras?.CTPS || ''} onChange={e => handleExtraChange('CTPS', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Série CTPS</label>
                    <input type="text" value={editModal.data.dados_extras?.SERIE || ''} onChange={e => handleExtraChange('SERIE', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Matrícula</label>
                    <input type="text" value={editModal.data.dados_extras?.MATRICULA || ''} onChange={e => handleExtraChange('MATRICULA', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3 text-slate-400" />CDC / Centro de Custo</span>
                    </label>
                    <input type="text" value={editModal.data.dados_extras?.['NC FUNCIONARIO'] || ''} onChange={e => handleExtraChange('NC FUNCIONARIO', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm py-2 px-3 border shadow-sm" placeholder="Ex: 10045" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-amber-400" />Conta / Cliente / Empresa</span>
                    </label>
                    <input type="text" value={editModal.data.dados_extras?.Empresa || ''} onChange={e => handleExtraChange('Empresa', e.target.value)}
                      className="block w-full rounded-xl border-slate-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 sm:text-sm py-2 px-3 border shadow-sm" placeholder="Ex: COLGATE, UNILEVER, NESTLE" />
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
                      <div key={key} className="flex items-center gap-2">
                        <input type="text" readOnly value={key} className="block w-1/3 rounded-xl border-slate-200 bg-slate-50 sm:text-sm py-2 px-3 border text-slate-500" />
                        <input type="text" value={val || ''} onChange={e => handleExtraChange(key, e.target.value)}
                          className="block w-full rounded-xl border-slate-200 sm:text-sm py-2 px-3 border" />
                        <button onClick={() => removeExtraField(key)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  {Object.entries(editModal.data.dados_extras || {}).filter(([key]) => !['CPF', 'RG', 'CTPS', 'SERIE', 'MATRICULA', 'NC FUNCIONARIO', 'Empresa'].includes(key)).length === 0 && (
                    <p className="text-xs text-slate-400 italic">Nenhum campo personalizado cadastrado.</p>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <input type="text" placeholder="Nome do Campo" value={newExtraKey} onChange={e => setNewExtraKey(e.target.value)}
                    className="block w-1/3 rounded-xl border-slate-200 sm:text-sm py-2 px-3 border" />
                  <input type="text" placeholder="Valor" value={newExtraValue} onChange={e => setNewExtraValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addExtraField()}
                    className="block w-full rounded-xl border-slate-200 sm:text-sm py-2 px-3 border" />
                  <button onClick={addExtraField} type="button"
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditModal({ isOpen: false, data: null })}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button onClick={saveEdit}
                className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all ${editModal.data?.id ? 'bg-indigo-600 hover:bg-indigo-500' : editModal.data?.nome?.startsWith('(COPIA)') ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                {editModal.data?.id ? <Save className="w-4 h-4" /> : editModal.data?.nome?.startsWith('(COPIA)') ? <Copy className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editModal.data?.id ? 'Salvar Alterações' : editModal.data?.nome?.startsWith('(COPIA)') ? 'Confirmar Duplicação' : 'Cadastrar Funcionário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
