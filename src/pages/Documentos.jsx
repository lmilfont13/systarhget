import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FileEdit, CheckCircle2, Loader2, FileText, Eye, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { PDFGenerator } from '../pdf/PDFGenerator';

export default function Documentos() {
  const location = useLocation();
  const [templates, setTemplates] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  
  const [formData, setFormData] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lojas, setLojas] = useState([]);
  const [manualLojas, setManualLojas] = useState({});

  const [searchFuncionario, setSearchFuncionario] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [optaContinuar, setOptaContinuar] = useState(true);

  const filteredFuncionarios = funcionarios.filter(func => {
    const term = String(searchFuncionario || '').toLowerCase();
    const nome = String(func.nome || '').toLowerCase();
    const cpf = String(func.dados_extras?.CPF || '').toLowerCase();
    const de = func.dados_extras || {};
    const cdc = String(de['NC FUNCIONARIO'] || de['NC'] || de['Cdc'] || de['CDC'] || de['cdc'] || de['Cdc Superior'] || '').toLowerCase();
    
    const matchesTerm = nome.includes(term) || cpf.includes(term);
    const matchesEmpresa = !filterEmpresa || cdc.includes(filterEmpresa.toLowerCase());
    
    return matchesTerm && matchesEmpresa;
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [pData, tData, fData, eData] = await Promise.all([
        supabase.from('pdf_templates').select('*'),
        supabase.from('templates').select('*'),
        supabase.from('funcionarios').select('*').order('criado_em', { ascending: false }),
        supabase.from('empresas').select('*').order('criado_em', { ascending: false })
      ]);

      if (pData.error) console.error('Erro ao buscar pdf_templates:', pData.error);
      if (tData.error) console.error('Erro ao buscar templates (texto):', tData.error);

      // Combina os dois tipos de templates
      const allTemplates = [
        ...(pData.data || []).map(t => ({ ...t, type: 'pdf' })),
        ...(tData.data || []).map(t => {
          // Extrai campos do tipo {{campo}} ou [campo] do conteúdo do template de texto
          const placeholdersCurly = t.conteudo?.match(/{{(.*?)}}/g) || [];
          const placeholdersSquare = t.conteudo?.match(/\[(.*?)\]/g) || [];
          const allPlaceholders = [...new Set([...placeholdersCurly, ...placeholdersSquare])];
          
          const fields = allPlaceholders.map(p => {
            const isCurly = p.startsWith('{{');
            const name = isCurly ? p.replace(/{{|}}/g, '').trim() : p.replace(/\[|\]/g, '').trim();
            // Tenta mapear automaticamente alguns nomes comuns
            let mappedTo = '';
            if (name.toLowerCase() === 'empresa') mappedTo = 'empresa_razao';
            if (name.toLowerCase() === 'nome') mappedTo = 'funcionario_nome';
            if (name.toLowerCase() === 'cpf') mappedTo = 'funcionario_cpf';
            
            return { name, mappedTo };
          });
          
          return { ...t, type: 'text', name: t.nome, fields };
        })
      ];

      setTemplates(allTemplates);
      setFuncionarios(fData.data || []);
      setEmpresas(eData.data || []);

      // Carrega lojas locais
      const savedLojas = localStorage.getItem('docflow_lojas');
      if (savedLojas) {
        setLojas(JSON.parse(savedLojas));
      }

      const params = new URLSearchParams(location.search);
      const funcId = params.get('func');
      const tplId = params.get('tpl');
      const empId = params.get('emp');

      if (tplId && allTemplates.find(t => String(t.id) === String(tplId))) {
        setSelectedTemplate(tplId);
      }
      if (funcId && fData.data?.find(f => String(f.id) === String(funcId))) {
        setSelectedFuncionario(funcId);
      }
      if (empId && eData.data?.find(e => String(e.id) === String(empId))) {
        setSelectedEmpresa(empId);
      }
    } catch (error) {
      console.error('Erro geral no fetchData:', error);
      toast.error('Erro ao carregar dados do banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    setFormData({});
  };

  const activeTemplate = templates.find(t => String(t.id) === String(selectedTemplate));
  const activeFuncionario = funcionarios.find(f => String(f.id) === String(selectedFuncionario));
  const activeEmpresa = empresas.find(e => String(e.id) === String(selectedEmpresa));

  // Sincroniza a empresa automaticamente quando o funcionário é selecionado
  useEffect(() => {
    if (selectedFuncionario && funcionarios.length > 0) {
      const func = funcionarios.find(f => String(f.id) === String(selectedFuncionario));
      if (func && func.empresa_id) {
        setSelectedEmpresa(String(func.empresa_id));
      }
    }
  }, [selectedFuncionario, funcionarios]);

  // Auto-preencher dados quando o template, funcionário ou empresa mudar
  useEffect(() => {
    if (activeTemplate && activeFuncionario) {
      try {
        const newData = { ...formData };
        const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
        const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Tenta auto-selecionar a empresa baseado no dado do funcionário
        const empNome = String(activeFuncionario.dados_extras?.['Empresa'] || '').toUpperCase();
        let targetEmpId = selectedEmpresa;

        if (empNome.includes('POP')) {
          const pop = empresas.find(e => e.nome.toUpperCase().includes('POP'));
          if (pop && String(selectedEmpresa) !== String(pop.id)) {
            targetEmpId = pop.id;
            setSelectedEmpresa(pop.id);
          }
        } else if (empNome.includes('SPAR')) {
          const spar = empresas.find(e => e.nome.toUpperCase().includes('SPAR'));
          if (spar && String(selectedEmpresa) !== String(spar.id)) {
            targetEmpId = spar.id;
            setSelectedEmpresa(spar.id);
          }
        }

        const activeEmpresaRef = empresas.find(e => String(e.id) === String(targetEmpId)) || activeEmpresa;

        activeTemplate.fields?.forEach(field => {
          if (!field || !field.name) return;
          const fieldNameLower = field.name.toLowerCase();
          
          if (field.mappedTo) {
            switch (field.mappedTo) {
              case 'empresa_razao': newData[field.name] = activeEmpresaRef?.nome || companySettings.razaoSocial || ''; break;
              case 'empresa_cnpj': newData[field.name] = activeEmpresaRef?.cnpj || companySettings.cnpj || ''; break;
              case 'empresa_email': newData[field.name] = companySettings.email || ''; break;
              case 'empresa_rodape': newData[field.name] = activeEmpresaRef?.rodape || ''; break;
              case 'empresa_logo': newData[field.name] = activeEmpresaRef?.logo_url || ''; break;
              case 'empresa_carimbo': newData[field.name] = activeEmpresaRef?.carimbo_url || ''; break;
              case 'funcionario_nome': newData[field.name] = activeFuncionario?.nome || ''; break;
              case 'funcionario_cpf': newData[field.name] = activeFuncionario?.dados_extras?.CPF || ''; break;
              case 'funcionario_cargo': newData[field.name] = activeFuncionario?.cargo || ''; break;
              case 'data_atual': newData[field.name] = dataAtual; break;
              default: 
                if (activeFuncionario?.dados_extras && activeFuncionario.dados_extras[field.mappedTo] !== undefined) {
                  newData[field.name] = activeFuncionario.dados_extras[field.mappedTo];
                } else {
                  newData[field.name] = '';
                }
            }
          } else {
            const displayNameLower = (field.displayName || '').toLowerCase();
            
            if (displayNameLower.includes('data')) newData[field.name] = dataAtual;
            else if (displayNameLower.includes('rg')) newData[field.name] = activeFuncionario?.dados_extras?.RG || '';
            else if (displayNameLower.includes('cpf')) newData[field.name] = activeFuncionario?.dados_extras?.CPF || '';
            else if (displayNameLower.includes('cargo')) newData[field.name] = activeFuncionario?.cargo || '';
            else if (displayNameLower.includes('empresa')) newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            else if (displayNameLower.includes('nc') || displayNameLower.includes('cdc')) newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            else if (displayNameLower.includes('nome')) newData[field.name] = activeFuncionario?.nome || '';
            else if (displayNameLower.includes('carteira') || displayNameLower.includes('ctps')) newData[field.name] = activeFuncionario?.dados_extras?.['CTPS'] || '';
            else if (displayNameLower.includes('serie')) newData[field.name] = activeFuncionario?.dados_extras?.['SERIE'] || '';
            else if (displayNameLower.includes('matricula')) newData[field.name] = activeFuncionario?.dados_extras?.['MATRICULA'] || '';
            
            else if (fieldNameLower === 'empresa' || fieldNameLower === 'empresa_nome') newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            else if (fieldNameLower === 'promotor' || fieldNameLower === 'funcionario' || fieldNameLower === 'nome') newData[field.name] = activeFuncionario?.nome || '';
            else if (fieldNameLower === 'cargo') newData[field.name] = activeFuncionario?.cargo || '';
            else if (fieldNameLower === 'cpf') newData[field.name] = activeFuncionario?.dados_extras?.CPF || '';
            else if (fieldNameLower === 'rg') newData[field.name] = activeFuncionario?.dados_extras?.RG || '';
            else if (fieldNameLower === 'numero_carteira_trabalho' || fieldNameLower === 'ctps') newData[field.name] = activeFuncionario?.dados_extras?.['CTPS'] || '';
            else if (fieldNameLower === 'série' || fieldNameLower === 'serie') newData[field.name] = activeFuncionario?.dados_extras?.['SERIE'] || '';
            else if (fieldNameLower === 'matricula') newData[field.name] = activeFuncionario?.dados_extras?.['MATRICULA'] || '';
            else if (fieldNameLower === 'loja' || fieldNameLower === 'estabelecimento') newData[field.name] = formData[field.name] || ''; 
            else if (fieldNameLower === 'data' || fieldNameLower === 'data_emissao' || fieldNameLower === 'emissao' || fieldNameLower === 'data_doc') newData[field.name] = dataAtual;
            else if (fieldNameLower === 'nc' || fieldNameLower === 'cdc') newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            else if (fieldNameLower.startsWith('carimbo')) newData[field.name] = ''; 
            else {
              newData[field.name] = formData[field.name] || '';
            }
          }
        });
        // Injeta aliases para placeholders comuns em templates de texto
        const de = activeFuncionario?.dados_extras || {};
        let cdcValue = de['NC FUNCIONARIO'] || de['NC'] || de['Cdc'] || de['CDC'] || de['cdc'] || de['Cdc Superior'] || '';
        
        // Busca agressiva se não encontrar pelas chaves padrão
        if (!cdcValue) {
          const foundKey = Object.keys(de).find(k => {
            const up = k.toUpperCase();
            return up.includes('CDC') || up === 'NC' || up.startsWith('NC ') || up.includes('CENTRO DE CUSTO');
          });
          if (foundKey) cdcValue = de[foundKey];
        }

        const rgValue = de['RG'] || de['rg'] || de['Rg'] || '';
        
        newData['cdc'] = cdcValue;
        newData['CDC'] = cdcValue;
        newData['Cdc'] = cdcValue;
        newData['empresa'] = cdcValue;
        newData['rg'] = rgValue;
        newData['RG'] = rgValue;
        
        // Injeta opções de continuidade
        newData['opta_sim'] = optaContinuar ? 'X' : ' ';
        newData['opta_nao'] = optaContinuar ? ' ' : 'X';
        
        setFormData(newData);
      } catch (err) {
        console.error('Erro no auto-fill:', err);
      }
    }
  }, [selectedTemplate, selectedFuncionario, selectedEmpresa, optaContinuar]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) {
      toast.error('Selecione um template primeiro.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let blob;
      
      const empresa = empresas.find(e => String(e.id) === String(selectedEmpresa));
      
      // Helper ultra-robusto para converter URL em Base64
      const getBase64 = async (url) => {
        if (!url) return null;
        if (url.startsWith('data:')) return url;

        try {
          // Se for uma URL do Supabase, tenta baixar via SDK (mais seguro para CORS)
          if (url.includes('.supabase.co/storage/v1/object/public/')) {
            const parts = url.split('/public/')[1].split('/');
            const bucket = parts[0];
            const filePath = parts.slice(1).join('/');
            
            const { data, error } = await supabase.storage.from(bucket).download(filePath);
            if (!error && data) {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(data);
              });
            }
          }

          // Fallback para fetch normal
          const res = await fetch(url);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error('Falha ao obter imagem:', e);
          return null;
        }
      };

      const logoBase64 = await getBase64(empresa?.logo_url);
      const carimboBase64 = await getBase64(empresa?.carimbo_url);
      const carimboRespBase64 = await getBase64(empresa?.carimbo_funcionario_url);

      if (logoBase64) console.log('Logo carregada com sucesso');
      else console.warn('Falha ao carregar logo da empresa:', empresa?.nome);

      if (activeTemplate.type === 'text') {
        // Lógica para templates de TEXTO (Atacadão, Geral)
        let content = activeTemplate.conteudo || '';
        Object.keys(formData).forEach(key => {
          const value = formData[key] || '';
          // Suporte para {{chave}} e [chave] de forma case-insensitive
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regexCurly = new RegExp(`{{${escapedKey}}}`, 'gi');
          const regexSquare = new RegExp(`\\[${escapedKey}\\]`, 'gi');
          content = content.replace(regexCurly, value).replace(regexSquare, value);
        });
        
        const assets = {
          logo_url: logoBase64,
          carimbo_url: carimboBase64,
          carimbo_responsavel_url: carimboRespBase64,
          footer_text: empresa?.rodape
        };

        blob = await PDFGenerator.generateFromText(content, assets);
      } else {
        // Lógica para templates de PDF (Extensão NDI, etc)
        let base64PDF = activeTemplate.file_url;
        if (base64PDF && base64PDF.startsWith('local:')) {
          base64PDF = localStorage.getItem(`pdf_${activeTemplate.name}`);
        }

        if (!base64PDF) {
          throw new Error("Arquivo PDF base não encontrado na nuvem ou no cache local.");
        }

        const binaryString = atob(base64PDF);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const empresa = empresas.find(e => String(e.id) === String(selectedEmpresa));
        
        // Helper para converter URL em Base64 (mais robusto)
        const getBase64 = async (url) => {
          if (!url) return null;
          return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const dataURL = canvas.toDataURL('image/png');
              resolve(dataURL);
            };
            img.onerror = () => {
              fetch(url).then(res => res.blob()).then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              }).catch(() => resolve(null));
            };
            img.src = url;
          });
        };

        const logoBase64 = await getBase64(empresa?.logo_url);
        const carimboBase64 = await getBase64(empresa?.carimbo_url);
        const carimboRespBase64 = await getBase64(empresa?.carimbo_funcionario_url);

        // Alerta se faltar ativos
        if (!logoBase64 || !carimboBase64 || !carimboRespBase64) {
          toast.warning('Atenção: Algumas imagens (logo ou carimbo) não foram carregadas. Verifique o cadastro da empresa.');
        }

        // Injeta as imagens no formData para o PDF preencher
        const finalFormData = { 
          ...formData,
          img_logo: logoBase64,
          img_carimbo: carimboBase64,
          img_carimbo_responsavel: carimboRespBase64
        };

        blob = await PDFGenerator.fillDocument(bytes, finalFormData);
      }

      // Nome do arquivo: CARTA + NOME DO PROMOTOR (Com Espaço)
      const nomePromotor = activeFuncionario?.nome || formData['Nome'] || formData['funcionario_nome'] || formData['Candidato'] || activeTemplate.name || 'documento';
      const fileName = `CARTA ${nomePromotor.trim().toUpperCase()}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Documento gerado e baixado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Erro ao gerar o PDF final.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerar Documento</h1>
      </div>

      <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border border-gray-100 overflow-hidden p-6 space-y-8">
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="template" className="block text-sm font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                1. Selecionar Template
              </label>
              <select
                id="template"
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
              >
                <option value="">Selecione um arquivo...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.type === 'pdf' ? 'PDF' : 'Texto'}] {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Seleção de Empresa */}
            <div>
              <label htmlFor="empresa" className="block text-sm font-medium leading-6 text-gray-900 flex items-center gap-2">
                2. Selecionar Empresa (Opcional)
              </label>
              <select
                id="empresa"
                value={selectedEmpresa}
                onChange={(e) => setSelectedEmpresa(e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
              >
                <option value="">Nenhuma / Manual</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>

              {activeEmpresa && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2 animate-in fade-in duration-500 shadow-inner">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1.5 mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Preview de Branding</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white shadow-sm ${activeEmpresa.nome.toUpperCase().includes('POP') ? 'bg-[#00AEEF]' : 'bg-[#003366]'}`}>
                      {activeEmpresa.nome.toUpperCase().includes('POP') ? 'POP TRADE' : 'SPAR BRASIL'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 font-medium text-center">Logo</p>
                      <div className="h-10 w-full bg-white rounded border border-gray-200 flex items-center justify-center p-1 overflow-hidden shadow-sm">
                        {activeEmpresa.logo_url ? <img src={activeEmpresa.logo_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-gray-300" />}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 font-medium text-center">Carimbo</p>
                      <div className="h-10 w-full bg-white rounded border border-gray-200 flex items-center justify-center p-1 overflow-hidden shadow-sm">
                        {activeEmpresa.carimbo_url ? <img src={activeEmpresa.carimbo_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-gray-300" />}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 font-medium text-center">Assinatura</p>
                      <div className="h-10 w-full bg-white rounded border border-gray-200 flex items-center justify-center p-1 overflow-hidden shadow-sm">
                        {activeEmpresa.carimbo_funcionario_url ? <img src={activeEmpresa.carimbo_funcionario_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-gray-300" />}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seleção de Funcionário */}
          <div>
            <label htmlFor="funcionario" className="block text-sm font-medium leading-6 text-gray-900">
              3. Selecionar Funcionário (Opcional)
            </label>
            <div className="mt-2 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou CPF..." 
                    value={searchFuncionario}
                    onChange={e => setSearchFuncionario(e.target.value)}
                    className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                  />
                </div>
                <select
                  value={filterEmpresa}
                  onChange={e => setFilterEmpresa(e.target.value)}
                  className="block w-full sm:w-48 rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
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

              <select
                id="funcionario"
                value={selectedFuncionario}
                onChange={(e) => setSelectedFuncionario(e.target.value)}
                className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                size={filteredFuncionarios.length > 0 && searchFuncionario ? Math.min(5, filteredFuncionarios.length + 1) : 1}
              >
                <option value="">Preenchimento manual / Nenhum</option>
                {filteredFuncionarios.map(f => {
                  const cpf = f.dados_extras?.CPF || 'Sem CPF';
                  const emp = (f.dados_extras?.['Empresa'] || '').toUpperCase();
                  const badge = emp.includes('POP') ? ' [POP]' : emp.includes('SPAR') ? ' [SPAR]' : '';
                  return (
                    <option key={f.id} value={f.id}>{f.nome} - {cpf}{badge}</option>
                  );
                })}
              </select>
              
              {selectedFuncionario && activeFuncionario && (
                <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                    activeFuncionario.dados_extras?.['Empresa']?.toUpperCase().includes('POP') 
                      ? 'bg-[#00AEEF] text-white' 
                      : 'bg-[#003366] text-white'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      activeFuncionario.dados_extras?.['Empresa']?.toUpperCase().includes('POP') ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></span>
                    {activeFuncionario.dados_extras?.['Empresa']?.toUpperCase().includes('POP') ? 'POP TRADE' : 'SPAR BRASIL'}
                  </span>
                  {!(formData['cdc'] || formData['CDC'] || formData['Cdc']) && (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                        <Info className="w-3 h-3" /> CDC não localizado
                      </span>
                      <span className="text-[9px] text-gray-400">
                        Chaves: {Object.keys(activeFuncionario.dados_extras || {}).slice(0, 5).join(', ')}...
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400 font-medium italic">Empresa detectada</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulário Dinâmico */}
        {/* Formulário e Pré-visualização */}
        {activeTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
            {/* Coluna da Esquerda: Formulário */}
            <form onSubmit={handleGenerate} className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-indigo-500" />
                Dados do Documento
              </h3>

              {/* Opção de Continuidade (Hap Vida / NDI) */}
              {(activeTemplate.name?.includes('Hap Vida') || activeTemplate.name?.includes('Extensão NDI')) && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3">
                  <p className="text-sm font-semibold text-indigo-900">O colaborador opta pela continuidade do plano?</p>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="opta_plano" 
                        checked={optaContinuar} 
                        onChange={() => {
                          setOptaContinuar(true);
                          setFormData(prev => ({ ...prev, opta_sim: 'X', opta_nao: ' ' }));
                        }}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">SIM (Opto pela continuidade)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="opta_plano" 
                        checked={!optaContinuar} 
                        onChange={() => {
                          setOptaContinuar(false);
                          setFormData(prev => ({ ...prev, opta_sim: ' ', opta_nao: 'X' }));
                        }}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">NÃO (Opto pelo encerramento)</span>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4">
                {activeTemplate.fields?.filter(field => {
                  const name = field.name.toLowerCase();
                  const display = (field.displayName || '').toLowerCase();
                  return !name.includes('logo') && !name.includes('carimbo') && !display.includes('carimbo') && !display.includes('logo');
                }).map(field => {
                  const isAutoFilled = !!field.mappedTo;
                  const labelName = isAutoFilled ? field.name : (field.displayName || field.name);
                  const isLojaField = !isAutoFilled && (field.name.toLowerCase() === 'loja' || field.name.toLowerCase() === 'lojas' || field.name.toLowerCase() === 'estabelecimento');
                  
                  return (
                    <div key={field.name}>
                      <label htmlFor={field.name} className="block text-sm font-medium leading-6 text-gray-900 flex justify-between items-center">
                        <span>
                          {labelName} {isAutoFilled && <span className="text-xs text-indigo-600 font-normal">(Automático)</span>}
                        </span>
                        {isLojaField && lojas.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setManualLojas(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                            className="text-xs text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
                          >
                            {manualLojas[field.name] ? 'Selecionar da Lista' : 'Digitar Manualmente'}
                          </button>
                        )}
                      </label>
                      <div className="mt-1">
                        {isLojaField ? (
                          lojas.length === 0 ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                name={field.name}
                                id={field.name}
                                value={formData[field.name] || ''}
                                onChange={handleInputChange}
                                className="block w-full rounded-md border-0 py-2 px-3 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 text-gray-900"
                                placeholder="Digite o nome da loja..."
                              />
                              <p className="text-[11px] text-gray-400">
                                Dica: Você pode cadastrar lojas para seleção rápida em{' '}
                                <Link to="/lojas" className="text-indigo-600 hover:underline font-semibold">
                                  Lojas
                                </Link>
                                .
                              </p>
                            </div>
                          ) : manualLojas[field.name] ? (
                            <input
                              type="text"
                              name={field.name}
                              id={field.name}
                              value={formData[field.name] || ''}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-0 py-2 px-3 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 text-gray-900 bg-white"
                              placeholder="Digite a loja manualmente..."
                            />
                          ) : (
                            <select
                              name={field.name}
                              id={field.name}
                              value={lojas.some(l => l.nome === formData[field.name] || (l.endereco ? `${l.nome} (${l.endereco})` : l.nome) === formData[field.name]) ? lojas.find(l => l.nome === formData[field.name] || (l.endereco ? `${l.nome} (${l.endereco})` : l.nome) === formData[field.name]).id : ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                if (selectedId === 'manual') {
                                  setManualLojas(prev => ({ ...prev, [field.name]: true }));
                                  setFormData(prev => ({ ...prev, [field.name]: '' }));
                                } else {
                                  const selectedLoja = lojas.find(l => l.id === selectedId);
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    [field.name]: selectedLoja ? (selectedLoja.endereco ? `${selectedLoja.nome} (${selectedLoja.endereco})` : selectedLoja.nome) : '' 
                                  }));
                                }
                              }}
                              className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white"
                            >
                              <option value="">Selecione uma loja...</option>
                              {lojas.map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.nome} {l.cidadeUf ? `(${l.cidadeUf})` : ''}
                                </option>
                              ))}
                              <option value="manual">-- Outra (Digitar Manualmente) --</option>
                            </select>
                          )
                        ) : (
                          <input
                            type="text"
                            name={field.name}
                            id={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleInputChange}
                            className={`block w-full rounded-md border-0 py-2 px-3 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
                              isAutoFilled 
                                ? 'bg-gray-50 text-gray-700 ring-gray-200 focus:ring-indigo-300' 
                                : 'bg-white text-gray-900 ring-gray-300 focus:ring-indigo-600'
                            }`}
                            placeholder={isAutoFilled ? 'Preenchido automaticamente' : `Digite o valor`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Gerar PDF Final</>
                  )}
                </button>
              </div>
            </form>

            {/* Coluna da Direita: Pré-visualização Real-time (Apenas para Texto) */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 flex flex-col h-full min-h-[500px]">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-indigo-500" />
                Pré-visualização
              </h3>
              
              <div className="flex-1 bg-white border border-gray-100 rounded-lg p-8 shadow-inner overflow-y-auto font-serif text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                {activeTemplate.type === 'text' ? (
                  (() => {
                    let preview = activeTemplate.conteudo || '';
                    // Ordena as chaves por tamanho (maiores primeiro) para evitar substituições parciais
                    const keys = Object.keys(formData).sort((a, b) => b.length - a.length);
                    
                    keys.forEach(key => {
                      const value = formData[key] || `[${key}]`;
                      // Escapa caracteres especiais para o RegExp (como SÉRIE ou CARIMBO_1)
                      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      preview = preview.split(`{{${key}}}`).join(value);
                    });
                    return preview;
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                    <FileText className="w-12 h-12 opacity-20" />
                    <p>Pré-visualização disponível apenas para cartas de texto.</p>
                    <p className="text-xs">Para PDFs, os dados serão injetados nos campos do formulário.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 italic">
                <Info className="w-4 h-4" />
                Esta é uma prévia do conteúdo. O PDF final incluirá logos e carimbos.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
