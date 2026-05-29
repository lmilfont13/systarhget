import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Settings, Trash2, X, Save, Cloud, CloudOff, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { PDFGenerator } from '../pdf/PDFGenerator';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [extraFields, setExtraFields] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mappingModal, setMappingModal] = useState({ isOpen: false, template: null });
  const [textModal, setTextModal] = useState({ isOpen: false, template: null });
  const fileInputRef = useRef(null);

  const MAPPING_OPTIONS = [
    { value: '', label: 'Preenchimento Manual' },
    { value: 'empresa_razao', label: 'Empresa: Razão Social' },
    { value: 'empresa_cnpj', label: 'Empresa: CNPJ' },
    { value: 'empresa_rodape', label: 'Empresa: Rodapé' },
    { value: 'funcionario_nome', label: 'Funcionário: Nome (Candidato)' },
    { value: 'funcionario_cpf', label: 'Funcionário: CPF' },
    { value: 'funcionario_rg', label: 'Funcionário: RG' },
    { value: 'funcionario_cargo', label: 'Funcionário: Cargo' },
    { value: 'Cdc', label: 'JSON: Cdc (Equipe)' },
    { value: 'PIS', label: 'JSON: PIS' },
    { value: 'Horário', label: 'JSON: Horário' },
    { value: 'Número Carteira Profissional', label: 'JSON: Nº Carteira' },
    { value: 'Série', label: 'JSON: Série' },
    { value: 'opta_sim', label: 'Opção: Opto pela continuidade (X)' },
    { value: 'opta_nao', label: 'Opção: Opto pelo encerramento (X)' },
    { value: 'data_atual', label: 'Data Atual (Fortaleza, ...)' },
    ...extraFields.map(field => ({ value: field, label: `Extra: ${field}` }))
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const [pData, tData, fData] = await Promise.all([
        supabase.from('pdf_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('templates').select('*').order('criado_em', { ascending: false }),
        supabase.from('funcionarios').select('dados_extras')
      ]);
      
      const allTemplates = [
        ...(pData.data || []).map(t => ({ ...t, type: 'pdf' })),
        ...(tData.data || []).map(t => ({ ...t, type: 'text', name: t.nome }))
      ];

      setTemplates(allTemplates);

      // Extract unique keys from all employees' dados_extras
      if (fData.data) {
        const keys = new Set();
        fData.data.forEach(f => {
          if (f.dados_extras) {
            Object.keys(f.dados_extras).forEach(k => {
              if (k !== 'CPF') keys.add(k);
            });
          }
        });
        setExtraFields(Array.from(keys));
      }
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      toast.error('Erro ao carregar templates.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      toast.error('Por favor, envie um arquivo PDF válido.');
      return;
    }

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const fields = await PDFGenerator.extractFields(buffer);
      
      // Converte o arquivo para Base64 usando FileReader
      const base64PDF = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // Pega apenas a string base64
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });

      // Em vez de salvar no localStorage (que se perde), vamos salvar direto no banco de dados!
      const templateData = {
        name: file.name,
        fields: fields.map(f => ({ ...f, mappedTo: '' })),
        file_url: base64PDF, // Salvando o Base64 na nuvem!
      };

      const { data, error } = await supabase.from('pdf_templates').insert([templateData]).select();
      if (error) throw error;

      setTemplates(prev => [data[0], ...prev]);
      toast.success(`Template salvo na nuvem! Foram detectados ${fields.length} campos.`);
    } catch (error) {
      console.error(error);
      toast.error('Falha ao processar o PDF. ' + (error.message || ''));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeTemplate = async (id, fileName, type = 'pdf') => {
    if (!window.confirm(`Excluir o template "${fileName}"?`)) return;
    
    try {
      const table = type === 'text' ? 'templates' : 'pdf_templates';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      
      if (type === 'pdf') {
        localStorage.removeItem(`pdf_${fileName}`);
      }
      
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template removido.');
    } catch (error) {
      toast.error('Erro ao excluir template.');
    }
  };

  const openMapping = async (template) => {
    // Tenta pegar da nuvem primeiro, depois tenta do localStorage se for um template antigo
    let base64 = template.file_url;
    if (base64 && base64.startsWith('local:')) {
      base64 = localStorage.getItem(`pdf_${template.name}`);
    }
    
    let pdfUrl = null;
    
    if (base64) {
      try {
        // Converte base64 de volta para Uint8Array
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Gera um preview do PDF com os nomes malucos preenchidos dentro dos campos
        pdfUrl = await PDFGenerator.generatePreviewWithFieldNames(bytes);
      } catch (e) {
        console.error('Erro ao gerar preview', e);
        pdfUrl = `data:application/pdf;base64,${base64}`; // Fallback
      }
    }

    setMappingModal({ 
      isOpen: true, 
      template: JSON.parse(JSON.stringify(template)),
      pdfUrl
    });
  };

  const handleMappingChange = (fieldName, property, value) => {
    setMappingModal(prev => {
      const updatedFields = prev.template.fields.map(f => {
        if (f.name === fieldName) {
          return { ...f, [property]: value };
        }
        return f;
      });
      return { ...prev, template: { ...prev.template, fields: updatedFields } };
    });
  };

  const saveMapping = async () => {
    try {
      const { error } = await supabase
        .from('pdf_templates')
        .update({ fields: mappingModal.template.fields })
        .eq('id', mappingModal.template.id);
        
      if (error) throw error;

      setTemplates(prev => prev.map(t => t.id === mappingModal.template.id ? mappingModal.template : t));
      toast.success('Mapeamento salvo com sucesso!');
      setMappingModal({ isOpen: false, template: null, pdfUrl: null });
    } catch (error) {
      toast.error('Erro ao salvar mapeamento.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Faça upload dos seus PDFs e mapeie os campos para preenchimento automático.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              const name = prompt("Digite o nome do novo template de texto:");
              if (!name) return;
              try {
                const { data, error } = await supabase
                  .from('templates')
                  .insert([{ nome: name, conteudo: '' }])
                  .select();
                if (error) throw error;
                toast.success('Novo template de texto criado!');
                fetchTemplates();
                // Abre o modal de edição imediatamente
                setTextModal({ 
                  isOpen: true, 
                  template: { 
                    id: data[0].id, 
                    name: data[0].nome, 
                    conteudo: '', 
                    fields: [] 
                  } 
                });
              } catch (e) {
                toast.error('Erro ao criar template.');
              }
            }}
            className="inline-flex items-center gap-2 rounded-md bg-white border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Template Texto
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Processando...' : 'Novo Template PDF'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="application/pdf" 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        {templates.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">Nenhum template salvo.</div>
        ) : (
          <ul role="list" className="divide-y divide-gray-100">
            {templates.map((template) => {
              const isCloudSaved = template.type === 'text' || (template.file_url && !template.file_url.startsWith('local:'));
              
              return (
              <li key={template.id} className="flex items-center justify-between gap-x-6 p-6 hover:bg-gray-50/50">
                <div className="flex min-w-0 gap-x-4 items-center">
                  <div className={`h-10 w-10 flex-none rounded-lg flex items-center justify-center ${isCloudSaved ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <FileText className={`h-6 w-6 ${isCloudSaved ? 'text-green-600' : 'text-orange-600'}`} />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold leading-6 text-gray-900">{template.name}</p>
                      {isCloudSaved ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          <Cloud className="w-3 h-3" /> Nuvem
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20" title="Exclua e faça o upload novamente para salvar na nuvem">
                          <CloudOff className="w-3 h-3" /> Apenas Local (Apague e refaça)
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs leading-5 text-gray-500">
                      {template.fields?.length || 0} campos detectados
                    </p>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-x-4">
                  {template.type === 'pdf' ? (
                    <button 
                      onClick={() => openMapping(template)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Mapear Campos
                    </button>
                  ) : (
                    <button 
                      onClick={() => setTextModal({ isOpen: true, template: { ...template } })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Editar Texto
                    </button>
                  )}
                  <button 
                    onClick={() => removeTemplate(template.id, template.name, template.type)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </li>
            )})}
          </ul>
        )}
      </div>

      {/* Modal de Edição de Texto */}
      {textModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Editar Template de Texto: {textModal.template.name}
              </h3>
              <button onClick={() => setTextModal({ isOpen: false, template: null })} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Template</label>
                <input 
                  type="text" 
                  value={textModal.template.name}
                  onChange={(e) => setTextModal(p => ({ ...p, template: { ...p.template, name: e.target.value } }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo da Carta</label>
                <p className="text-xs text-gray-500 mb-2">Use `{"{{Nome}}"}` para campos que mudam. Ex: "Prezado `{"{{Nome}}"}`,"</p>
                <textarea 
                  value={textModal.template.conteudo}
                  onChange={(e) => {
                    const content = e.target.value;
                    const matches = content.match(/{{(.*?)}}/g) || [];
                    const uniqueFields = [...new Set(matches.map(m => m.replace(/{{|}}/g, '')))];
                    
                    const existingFields = textModal.template.fields || [];
                    const newFields = uniqueFields.map(name => {
                      const existing = existingFields.find(f => f.name === name);
                      return existing || { name, type: 'text', mappedTo: '', displayName: name };
                    });

                    setTextModal(p => ({ ...p, template: { ...p.template, conteudo: content, fields: newFields } }));
                  }}
                  rows={15}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border py-2 px-3 font-mono"
                />
              </div>

              {/* Mapeamento de Placeholders para Texto */}
              {textModal.template.fields?.length > 0 && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-200 bg-gray-100 flex justify-between items-center">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase">Mapeamento de Placeholders</h4>
                    <span className="text-[10px] text-gray-500">{textModal.template.fields.length} placeholders detectados</span>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {textModal.template.fields.map((field, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-xs font-mono text-indigo-600 bg-indigo-50/30 w-1/3">
                            {'{{' + field.name + '}}'}
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={field.mappedTo || ''}
                              onChange={(e) => {
                                const newFields = [...textModal.template.fields];
                                newFields[index].mappedTo = e.target.value;
                                setTextModal(p => ({ ...p, template: { ...p.template, fields: newFields } }));
                              }}
                              className="w-full text-xs border-gray-300 rounded-md p-1.5 border focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">Preenchimento Manual</option>
                              <optgroup label="Empresa">
                                <option value="empresa_razao">Razão Social</option>
                                <option value="empresa_cnpj">CNPJ</option>
                                <option value="empresa_rodape">Rodapé</option>
                              </optgroup>
                              <optgroup label="Funcionário">
                                <option value="funcionario_nome">Nome Completo</option>
                                <option value="funcionario_cargo">Cargo</option>
                                <option value="funcionario_cpf">CPF</option>
                                <option value="RG">RG (Info Extra)</option>
                                <option value="CTPS">CTPS (Info Extra)</option>
                                <option value="SERIE">Série CTPS (Info Extra)</option>
                                <option value="MATRICULA">Matrícula (Info Extra)</option>
                                <option value="NC FUNCIONARIO">NC / CDC (Info Extra)</option>
                              </optgroup>
                              <optgroup label="Geral">
                                <option value="data_atual">Data Atual</option>
                              </optgroup>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <button onClick={() => setTextModal({ isOpen: false, template: null })} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md">Cancelar</button>
              <button 
                onClick={async () => {
                  try {
                    // Prepara o objeto de atualização
                    const updateData = { 
                      nome: textModal.template.name, 
                      conteudo: textModal.template.conteudo 
                    };
                    
                    if (String(textModal.template.id).startsWith('local_')) {
                      // Se for um template novo, faz um INSERT
                      const { error } = await supabase
                        .from('templates')
                        .insert([{ 
                          nome: textModal.template.name, 
                          conteudo: textModal.template.conteudo 
                        }]);
                      if (error) throw error;
                    } else {
                      // Se já existir, faz um UPDATE
                      const { error } = await supabase
                        .from('templates')
                        .update(updateData)
                        .eq('id', textModal.template.id);
                      if (error) throw error;
                    }
                    toast.success('Template salvo com sucesso!');
                    fetchTemplates();
                    setTextModal({ isOpen: false, template: null });
                  } catch (e) {
                    console.error('Erro ao salvar template:', e);
                    toast.error('Erro ao salvar as alterações.');
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mapeamento */}
      {mappingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Mapear Campos: {mappingModal.template.name}
              </h3>
              <button onClick={() => setMappingModal({ isOpen: false, template: null, pdfUrl: null })} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-100">
              {/* Esquerda: Visualização do PDF */}
              <div className="flex-1 p-4 flex flex-col h-full border-r border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Visualização do Documento
                </h4>
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
                  {mappingModal.pdfUrl ? (
                    <iframe 
                      src={mappingModal.pdfUrl} 
                      className="w-full h-full border-0" 
                      title="Visualização PDF"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                      <FileText className="w-8 h-8 opacity-50" />
                      <p>PDF não encontrado no cache local.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Direita: Lista de Campos */}
              <div className="w-full lg:w-[450px] flex flex-col h-full bg-white">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Associe os nomes dos campos (gerados pelo PDF) com os dados do sistema. Olhe o documento ao lado para identificar cada campo.
                  </p>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 space-y-3">
                  {mappingModal.template.fields?.map(field => (
                    <div key={field.name} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-gray-900 break-all">{field.name}</p>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 uppercase">
                          {field.type}
                        </span>
                      </div>
                      <div>
                        <select
                          value={field.mappedTo || ''}
                          onChange={(e) => handleMappingChange(field.name, 'mappedTo', e.target.value)}
                          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white"
                        >
                          {MAPPING_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {(!field.mappedTo || field.mappedTo === '') && (
                          <input
                            type="text"
                            placeholder="Como quer chamar esse campo na tela? (Ex: Cidade)"
                            value={field.displayName || ''}
                            onChange={(e) => handleMappingChange(field.name, 'displayName', e.target.value)}
                            className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => setMappingModal({ isOpen: false, template: null, pdfUrl: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveMapping}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Salvar Mapeamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
