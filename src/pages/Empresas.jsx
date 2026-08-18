import { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Trash2, Edit2, Loader2, X, Save, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal State
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) {
        throw error;
      }
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      toast.error('Erro ao carregar empresas do banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024 * 2) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setEditModal(prev => ({
          ...prev,
          data: { ...prev.data, [field]: reader.result }
        }));
        setImageErrors(prev => ({ ...prev, [field]: false }));
        toast.success('Upload de imagem processado com sucesso!');
        setIsSubmitting(false);
      };
      reader.onerror = () => {
        toast.error('Erro ao ler a imagem.');
        setIsSubmitting(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao processar imagem.');
      setIsSubmitting(false);
    }
  };

  const openNew = () => {
    setImageErrors({});
    setEditModal({
      isOpen: true,
      data: {
        nome: '',
        email_responsavel: '',
        rodape: '',
        logo_url: '',
        carimbo_url: '',
        carimbo_funcionario_url: '',
        assinatura_responsavel_url: ''
      }
    });
  };

  const saveEmpresa = async () => {
    const { id, nome, email_responsavel, rodape, logo_url, carimbo_url, carimbo_funcionario_url, assinatura_responsavel_url } = editModal.data;
    if (!nome) {
      toast.error('O nome da empresa é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { 
        nome, 
        email_responsavel: email_responsavel ? email_responsavel.trim() : `sem-email-${Date.now()}@docflow.local`, 
        rodape, 
        logo_url, 
        carimbo_url, 
        carimbo_funcionario_url, 
        assinatura_responsavel_url 
      };

      if (id) {
        const { error } = await supabase.from('empresas').update(payload).eq('id', id);
        if (error) throw error;
        setEmpresas(prev => prev.map(e => e.id === id ? { ...e, ...payload } : e));
        toast.success('Empresa atualizada!');
      } else {
        const { data, error } = await supabase.from('empresas').insert([payload]).select();
        if (error) throw error;
        setEmpresas(prev => [data[0], ...prev]);
        toast.success('Empresa cadastrada!');
      }
      
      setEditModal({ isOpen: false, data: null });
    } catch (error) {
      console.error(error);
      const errMsg = error.message || error.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      toast.error(`Erro ao salvar: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta empresa?')) return;
    try {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) throw error;
      setEmpresas(prev => prev.filter(e => e.id !== id));
      toast.success('Empresa excluída.');
    } catch (error) {
      toast.error('Erro ao excluir.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie as empresas para injetar automaticamente Logo, Carimbo e Rodapé nas cartas.
          </p>
        </div>
        <button 
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-lg border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : empresas.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">Nenhuma empresa cadastrada.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {empresas.map((empresa) => (
              <li key={empresa.id} className="flex items-center justify-between p-6 hover:bg-gray-50/50">
                <div className="flex items-center gap-4">
                  {empresa.logo_url ? (
                    <img src={empresa.logo_url} alt="Logo" className="w-12 h-12 object-contain rounded-md bg-white border border-gray-200 p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-indigo-50 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-indigo-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{empresa.nome}</h3>
                    <p className="text-xs text-gray-500">{(empresa.email_responsavel && !empresa.email_responsavel.includes('sem-email-')) ? empresa.email_responsavel : 'Sem e-mail'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    setImageErrors({});
                    setEditModal({ isOpen: true, data: { ...empresa, email_responsavel: empresa.email_responsavel?.includes('sem-email-') ? '' : empresa.email_responsavel } });
                  }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(empresa.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between bg-gray-50">
              <h3 className="text-lg font-semibold">{editModal.data.id ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <button onClick={() => setEditModal({ isOpen: false, data: null })}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                  <input type="text" value={editModal.data.nome} onChange={e => setEditModal(p => ({...p, data: {...p.data, nome: e.target.value}}))} className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">E-mail Responsável</label>
                  <input type="email" value={editModal.data.email_responsavel} onChange={e => setEditModal(p => ({...p, data: {...p.data, email_responsavel: e.target.value}}))} className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Texto do Rodapé</label>
                  <textarea value={editModal.data.rodape || ''} onChange={e => setEditModal(p => ({...p, data: {...p.data, rodape: e.target.value}}))} rows={3} className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Ex: Matriz - Rua Paulista, 1000..."></textarea>
                </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                {/* Logo Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-2 uppercase tracking-wide">Logomarca</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-gray-50 transition-colors h-32 flex flex-col justify-center">
                    {editModal.data.logo_url ? (
                      <div className="relative group h-full flex items-center justify-center">
                        <img 
                          src={editModal.data.logo_url} 
                          alt="Logo" 
                          className={`max-h-24 object-contain ${imageErrors.logo_url ? 'hidden' : ''}`} 
                          onLoad={() => setImageErrors(prev => ({ ...prev, logo_url: false }))}
                          onError={() => setImageErrors(prev => ({ ...prev, logo_url: true }))}
                        />
                        {imageErrors.logo_url && (
                          <div className="flex flex-col items-center text-gray-400">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-[10px]">URL corrompida</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-md">
                          <ImageIcon className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">Trocar</span>
                          <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={e => handleImageUpload(e, 'logo_url')} />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-[10px] text-indigo-600 font-medium">Upload Logo</span>
                        <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={e => handleImageUpload(e, 'logo_url')} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Carimbo Empresa Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-2 uppercase tracking-wide">Carimbo Empresa</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-gray-50 transition-colors h-32 flex flex-col justify-center">
                    {editModal.data.carimbo_url ? (
                      <div className="relative group h-full flex items-center justify-center">
                        <img 
                          src={editModal.data.carimbo_url} 
                          alt="Carimbo" 
                          className={`max-h-24 object-contain mix-blend-multiply ${imageErrors.carimbo_url ? 'hidden' : ''}`} 
                          onLoad={() => setImageErrors(prev => ({ ...prev, carimbo_url: false }))}
                          onError={() => setImageErrors(prev => ({ ...prev, carimbo_url: true }))}
                        />
                        {imageErrors.carimbo_url && (
                          <div className="flex flex-col items-center text-gray-400">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-[10px]">URL corrompida</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-md">
                          <ImageIcon className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">Trocar</span>
                          <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={e => handleImageUpload(e, 'carimbo_url')} />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-[10px] text-indigo-600 font-medium">Upload Carimbo</span>
                        <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={e => handleImageUpload(e, 'carimbo_url')} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Carimbo Responsável Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-2 uppercase tracking-wide">Carimbo Resp.</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-gray-50 transition-colors h-32 flex flex-col justify-center">
                    {editModal.data.carimbo_funcionario_url ? (
                      <div className="relative group h-full flex items-center justify-center">
                        <img 
                          src={editModal.data.carimbo_funcionario_url} 
                          alt="Carimbo Resp" 
                          className={`max-h-24 object-contain mix-blend-multiply ${imageErrors.carimbo_funcionario_url ? 'hidden' : ''}`} 
                          onLoad={() => setImageErrors(prev => ({ ...prev, carimbo_funcionario_url: false }))}
                          onError={() => setImageErrors(prev => ({ ...prev, carimbo_funcionario_url: true }))}
                        />
                        {imageErrors.carimbo_funcionario_url && (
                          <div className="flex flex-col items-center text-gray-400">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-[10px]">URL corrompida</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-md">
                          <ImageIcon className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">Trocar</span>
                          <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={e => handleImageUpload(e, 'carimbo_funcionario_url')} />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-[10px] text-indigo-600 font-medium">Upload Carimbo Resp</span>
                        <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={e => handleImageUpload(e, 'carimbo_funcionario_url')} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Assinatura Responsável Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-2 uppercase tracking-wide">Assinatura Resp.</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-gray-50 transition-colors h-32 flex flex-col justify-center">
                    {editModal.data.assinatura_responsavel_url ? (
                      <div className="relative group h-full flex items-center justify-center">
                        <img 
                          src={editModal.data.assinatura_responsavel_url} 
                          alt="Assinatura Resp" 
                          className={`max-h-24 object-contain mix-blend-multiply ${imageErrors.assinatura_responsavel_url ? 'hidden' : ''}`} 
                          onLoad={() => setImageErrors(prev => ({ ...prev, assinatura_responsavel_url: false }))}
                          onError={() => setImageErrors(prev => ({ ...prev, assinatura_responsavel_url: true }))}
                        />
                        {imageErrors.assinatura_responsavel_url && (
                          <div className="flex flex-col items-center text-gray-400">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-[10px]">URL corrompida</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-md">
                          <ImageIcon className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">Trocar</span>
                          <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={e => handleImageUpload(e, 'assinatura_responsavel_url')} />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-[10px] text-indigo-600 font-medium">Upload Assinatura</span>
                        <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={e => handleImageUpload(e, 'assinatura_responsavel_url')} />
                      </label>
                    )}
                  </div>
                </div>

              </div>
      </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setEditModal({ isOpen: false, data: null })} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md">Cancelar</button>
              <button onClick={saveEmpresa} disabled={isSubmitting} className="inline-flex items-center gap-2 px-6 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Empresa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
