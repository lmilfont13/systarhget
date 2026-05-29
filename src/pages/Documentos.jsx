import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FileEdit, CheckCircle2, Loader2, FileText, Eye, Info, Search, Lock, MessageSquare, Copy, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { PDFGenerator } from '../pdf/PDFGenerator';

// Função Auxiliar de Limpeza de Rodapé
const cleanFooterText = (text) => {
  if (!text) return '';
  let clean = text.trim();
  
  if (clean.startsWith('{') || clean.startsWith('[')) {
    try {
      const obj = JSON.parse(clean);
      if (typeof obj === 'object') {
        return obj.endereco || obj.texto || Object.values(obj)[0] || clean;
      }
    } catch (e) {
      // ignore
    }
  }
  
  if (clean.includes('", "') || clean.includes('","')) {
    const match = clean.match(/^"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  clean = clean.replace(/^"+|"+$/g, '').trim();
  return clean;
};

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Estados para o compartilhamento de PDF e histórico
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [generatedCartaId, setGeneratedCartaId] = useState(null);
  const [generatedCartaName, setGeneratedCartaName] = useState('');
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState(null);

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
          const allPlaceholdersRaw = [...new Set([...placeholdersCurly, ...placeholdersSquare])];
          
          const seen = new Set();
          const fields = [];
          
          allPlaceholdersRaw.forEach(p => {
            const isCurly = p.startsWith('{{');
            const name = isCurly ? p.replace(/{{|}}/g, '').trim() : p.replace(/\[|\]/g, '').trim();
            const nameLower = name.toLowerCase();
            
            if (!seen.has(nameLower)) {
              seen.add(nameLower);
              let mappedTo = '';
              if (nameLower === 'empresa') mappedTo = 'empresa_razao';
              if (nameLower === 'nome') mappedTo = 'funcionario_nome';
              if (nameLower === 'cpf') mappedTo = 'funcionario_cpf';
              fields.push({ name, mappedTo });
            }
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
      let tplId = params.get('tpl');
      const empId = params.get('emp');

      // Se nenhum template foi passado na URL, busca pela "Carta de Apresentação Geral" como padrão
      if (!tplId && allTemplates.length > 0) {
        const defaultTpl = allTemplates.find(t => t.name.toLowerCase().includes('carta de apresentação geral'));
        if (defaultTpl) {
          tplId = String(defaultTpl.id);
        }
      }

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
              case 'empresa_rodape': newData[field.name] = cleanFooterText(activeEmpresaRef?.rodape); break;
              case 'empresa_logo': newData[field.name] = activeEmpresaRef?.logo_url || ''; break;
              case 'empresa_carimbo': newData[field.name] = activeEmpresaRef?.carimbo_url || ''; break;
              case 'funcionario_nome': newData[field.name] = (activeFuncionario?.nome || '').toUpperCase(); break;
              case 'funcionario_cpf': newData[field.name] = activeFuncionario?.dados_extras?.CPF || ''; break;
              case 'funcionario_cargo': newData[field.name] = activeFuncionario?.cargo ? String(activeFuncionario.cargo).toLowerCase() : ''; break;
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
            else if (displayNameLower.includes('cargo')) newData[field.name] = activeFuncionario?.cargo ? String(activeFuncionario.cargo).toLowerCase() : '';
            else if (displayNameLower.includes('empresa')) newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            else if (displayNameLower.includes('nc') || displayNameLower.includes('cdc')) newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            else if (displayNameLower.includes('nome')) newData[field.name] = (activeFuncionario?.nome || '').toUpperCase();
            else if (displayNameLower.includes('carteira') || displayNameLower.includes('ctps')) newData[field.name] = activeFuncionario?.dados_extras?.['CTPS'] || '';
            else if (displayNameLower.includes('serie')) newData[field.name] = activeFuncionario?.dados_extras?.['SERIE'] || '';
            else if (displayNameLower.includes('matricula')) newData[field.name] = activeFuncionario?.dados_extras?.['MATRICULA'] || '';
            
            else if (fieldNameLower === 'empresa' || fieldNameLower === 'empresa_nome') newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            else if (fieldNameLower === 'promotor' || fieldNameLower === 'funcionario' || fieldNameLower === 'nome') newData[field.name] = (activeFuncionario?.nome || '').toUpperCase();
            else if (fieldNameLower === 'cargo') newData[field.name] = activeFuncionario?.cargo ? String(activeFuncionario.cargo).toLowerCase() : '';
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
          let value = String(formData[key] || '').toUpperCase().trim();
          const keyLower = key.toLowerCase();
          
          // Se for Nome, RG ou CPF, envolvemos com a tag <b> no PDF
          if (keyLower.includes('nome') || keyLower.includes('cpf') || keyLower.includes('rg') || keyLower.includes('funcionario')) {
            if (value && !String(value).startsWith('<b>') && !String(value).startsWith('[')) {
              value = `<b>${value}</b>`;
            }
          }

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
          footer_text: cleanFooterText(empresa?.rodape)
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
        const finalFormData = {};
        Object.keys(formData).forEach(key => {
          const val = formData[key];
          finalFormData[key] = typeof val === 'string' ? val.toUpperCase().trim() : val;
        });
        finalFormData.img_logo = logoBase64;
        finalFormData.img_carimbo = carimboBase64;
        finalFormData.img_carimbo_responsavel = carimboRespBase64;

        blob = await PDFGenerator.fillDocument(bytes, finalFormData);
      }

      // Nome do arquivo: CARTA + NOME DO PROMOTOR (Com Espaço)
      const nomePromotor = activeFuncionario?.nome || formData['Nome'] || formData['funcionario_nome'] || formData['Candidato'] || activeTemplate.name || 'documento';
      const fileName = `CARTA ${nomePromotor.trim().toUpperCase()}.pdf`;

      const blobUrl = URL.createObjectURL(blob);

      // Converte o blob em base64
      const getBlobBase64 = (b) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(b);
          reader.onloadend = () => resolve(reader.result);
        });
      };
      
      const base64Data = await getBlobBase64(blob);

      // Salva no banco de dados
      let cartaId = null;
      try {
        const nomeArq = `CARTA ${nomePromotor.trim().toUpperCase()} - Admin`;
        const { data: insertData, error: insertError } = await supabase.from('cartas_geradas').insert({
          funcionario_id: activeFuncionario?.id || null,
          template_id: activeTemplate?.id || null,
          empresa_id: activeEmpresa?.id || null,
          nome_funcionario: nomePromotor,
          nome_arquivo: nomeArq,
          url_storage: base64Data,
          data_geracao: new Date().toISOString()
        }).select();
        
        if (!insertError && insertData && insertData.length > 0) {
          cartaId = insertData[0].id;
        }
      } catch (dbErr) {
        console.error('Erro ao salvar no histórico:', dbErr);
      }

      setGeneratedCartaId(cartaId);
      setGeneratedCartaName(nomePromotor);
      setGeneratedBlobUrl(blobUrl);
      setShareModalOpen(true);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Documento gerado e registrado no histórico com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Erro ao gerar o PDF final.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedCartaId) return;
    const shareUrl = `${window.location.origin}/carta/${generatedCartaId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link da carta copiado para a área de transferência!');
  };

  const handleWhatsAppShare = () => {
    if (!generatedCartaId) return;
    const shareUrl = `${window.location.origin}/carta/${generatedCartaId}`;
    const text = `Olá, segue a carta de apresentação de *${generatedCartaName}*: ${shareUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gerador de Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha templates de texto ou PDF e gere arquivos prontos para impressão.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 md:p-8 space-y-8">
        
        {/* Painel de Configurações */}
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 space-y-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 pb-3">
            Configuração Inicial do Documento
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selecionar Template */}
            <div className="space-y-2">
              <label htmlFor="template" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">1</span>
                1. Selecionar Template
              </label>
              <select
                id="template"
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white"
              >
                <option value="">Selecione um arquivo...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.type === 'pdf' ? 'PDF' : 'Texto'}] {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selecionar Empresa */}
            <div className="space-y-2">
              <label htmlFor="empresa" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">2</span>
                2. Selecionar Empresa (Opcional)
              </label>
              <select
                id="empresa"
                value={selectedEmpresa}
                onChange={(e) => setSelectedEmpresa(e.target.value)}
                className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white"
              >
                <option value="">Nenhuma / Manual</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Selecionar Funcionário (com autocomplete) */}
          <div className="grid grid-cols-1 gap-6 border-t border-slate-200/40 pt-6">
            <div className="space-y-2 relative">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">3</span>
                3. Selecionar Funcionário (Opcional)
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Autocomplete Search input */}
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou CPF..." 
                    value={searchFuncionario}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={e => {
                      setSearchFuncionario(e.target.value);
                      setIsSearchFocused(true);
                    }}
                    className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 sm:text-sm bg-white transition-all"
                  />
                  
                  {/* Floating dropdown results */}
                  {isSearchFocused && searchFuncionario.trim() !== '' && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSearchFocused(false)} />
                      <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-2xl shadow-xl mt-1.5 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                        {filteredFuncionarios.length === 0 ? (
                          <div className="p-4 text-sm text-slate-400 text-center">Nenhum funcionário encontrado</div>
                        ) : (
                          filteredFuncionarios.map(f => {
                            const cpf = f.dados_extras?.CPF || 'Sem CPF';
                            const emp = (f.dados_extras?.['Empresa'] || '').toUpperCase();
                            const isPop = emp.includes('POP');
                            const isSpar = emp.includes('SPAR');
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setSelectedFuncionario(f.id);
                                  setSearchFuncionario('');
                                  setIsSearchFocused(false);
                                }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50/50 transition-colors flex items-center justify-between group"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-slate-700 group-hover:text-indigo-600 truncate">{String(f.nome || '').toUpperCase()}</p>
                                  <p className="text-xs text-slate-400 font-mono mt-0.5">CPF: {cpf}</p>
                                </div>
                                {(isPop || isSpar) && (
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ml-2 border ${
                                    isPop ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                    {isPop ? 'POP' : 'SPAR'}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* CDC filter select */}
                <select
                  value={filterEmpresa}
                  onChange={e => setFilterEmpresa(e.target.value)}
                  className="block w-full sm:w-48 rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm bg-white"
                >
                  <option value="">Filtrar por CDC</option>
                  {[...new Set(funcionarios.map(f => {
                    const de = f.dados_extras || {};
                    return de['NC FUNCIONARIO'] || de['NC'] || de['Cdc'] || de['CDC'] || de['cdc'] || de['Cdc Superior'];
                  }).filter(Boolean))].sort().map(cdc => (
                    <option key={cdc} value={cdc}>{cdc}</option>
                  ))}
                </select>
              </div>

              {/* Híbrido: Select Standard dropdown */}
              <div className="mt-2">
                <select
                  id="funcionario"
                  value={selectedFuncionario}
                  onChange={(e) => setSelectedFuncionario(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm bg-white transition-all"
                >
                  <option value="">-- Selecione ou mude o funcionário da lista --</option>
                  {filteredFuncionarios.map(f => {
                    const cpf = f.dados_extras?.CPF || 'Sem CPF';
                    const emp = (f.dados_extras?.['Empresa'] || '').toUpperCase();
                    const badge = emp.includes('POP') ? ' [POP]' : emp.includes('SPAR') ? ' [SPAR]' : '';
                    return (
                      <option key={f.id} value={f.id}>{String(f.nome || '').toUpperCase()} - {cpf}{badge}</option>
                    );
                  })}
                </select>
              </div>

              {/* Status and detected branding */}
              {selectedFuncionario && activeFuncionario && (
                <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm border ${
                    activeFuncionario.dados_extras?.['Empresa']?.toUpperCase().includes('POP') 
                      ? 'bg-sky-50 text-sky-700 border-sky-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      activeFuncionario.dados_extras?.['Empresa']?.toUpperCase().includes('POP') ? 'bg-sky-400' : 'bg-blue-500'
                    }`}></span>
                    {activeFuncionario.dados_extras?.['Empresa']?.toUpperCase().includes('POP') ? 'POP TRADE' : 'SPAR BRASIL'}
                  </span>
                  {!(formData['cdc'] || formData['CDC'] || formData['Cdc']) && (
                    <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">
                      <Info className="w-3 h-3 text-amber-500" /> CDC não localizado
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium italic">Empresa detectada automaticamente</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Active Empresa Branding Preview */}
          {activeEmpresa && (
            <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3 shadow-inner animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identidade Visual da Empresa</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold text-white ${activeEmpresa.nome.toUpperCase().includes('POP') ? 'bg-sky-500 shadow-sm' : 'bg-blue-900 shadow-sm'}`}>
                  {activeEmpresa.nome.toUpperCase().includes('POP') ? 'POP TRADE' : 'SPAR BRASIL'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-wider">Logo do Topo</p>
                  <div className="h-12 w-full bg-slate-50/50 rounded-lg border border-slate-200/50 flex items-center justify-center p-1.5 overflow-hidden">
                    {activeEmpresa.logo_url ? <img src={activeEmpresa.logo_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-slate-300" />}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-wider">Carimbo e Assinatura</p>
                  <div className="h-12 w-full bg-slate-50/50 rounded-lg border border-slate-200/50 flex items-center justify-center p-1.5 overflow-hidden">
                    {activeEmpresa.carimbo_url ? <img src={activeEmpresa.carimbo_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-slate-300" />}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-wider">Carimbo Responsável</p>
                  <div className="h-12 w-full bg-slate-50/50 rounded-lg border border-slate-200/50 flex items-center justify-center p-1.5 overflow-hidden">
                    {activeEmpresa.carimbo_funcionario_url ? <img src={activeEmpresa.carimbo_funcionario_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-slate-300" />}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formulário Dinâmico */}
        {activeTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
            {/* Coluna da Esquerda: Formulário */}
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Dados Variáveis</h3>
                  <p className="text-xs text-slate-400">Preencha os campos abaixo para injetar no documento final.</p>
                </div>
              </div>

              {/* Opção de Continuidade (Hap Vida / NDI) */}
              {(activeTemplate.name?.includes('Hap Vida') || activeTemplate.name?.includes('Extensão NDI')) && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/60 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Opção de Plano (Hap Vida / NDI)</p>
                  <p className="text-xs text-slate-500">O colaborador opta pela continuidade do plano?</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all select-none shadow-sm flex-1">
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
                      <span className="text-xs font-semibold text-slate-700">SIM (Manter Plano)</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all select-none shadow-sm flex-1">
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
                      <span className="text-xs font-semibold text-slate-700">NÃO (Cancelar Plano)</span>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-5">
                {activeTemplate.fields?.filter(field => {
                  const name = field.name.toLowerCase();
                  const display = (field.displayName || '').toLowerCase();
                  return !name.includes('logo') && !name.includes('carimbo') && !display.includes('carimbo') && !display.includes('logo');
                }).map(field => {
                  const isAutoFilled = !!field.mappedTo;
                  const labelName = isAutoFilled ? field.name : (field.displayName || field.name);
                  const isLojaField = !isAutoFilled && (field.name.toLowerCase() === 'loja' || field.name.toLowerCase() === 'lojas' || field.name.toLowerCase() === 'estabelecimento');
                  
                  return (
                    <div key={field.name} className="space-y-1.5">
                      <label htmlFor={field.name} className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          {labelName} 
                          {isAutoFilled && (
                            <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                              Automatizado
                            </span>
                          )}
                        </span>
                        {isLojaField && lojas.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setManualLojas(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                            className="text-[10px] text-indigo-600 hover:text-indigo-500 font-bold transition-colors uppercase tracking-wider"
                          >
                            {manualLojas[field.name] ? 'Lista de Lojas' : 'Digitar Manual'}
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
                                className="block w-full rounded-xl border-0 py-2.5 px-3.5 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm text-slate-900 bg-white"
                                placeholder="Digite o nome da loja..."
                              />
                              <p className="text-[10px] text-slate-400 leading-normal">
                                Dica: Cadastre suas lojas em{' '}
                                <Link to="/lojas" className="text-indigo-600 hover:underline font-bold">
                                  Lojas
                                </Link>{' '}
                                para seleção rápida com endereço automático.
                              </p>
                            </div>
                          ) : manualLojas[field.name] ? (
                            <input
                              type="text"
                              name={field.name}
                              id={field.name}
                              value={formData[field.name] || ''}
                              onChange={handleInputChange}
                              className="block w-full rounded-xl border-0 py-2.5 px-3.5 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm text-slate-900 bg-white"
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
                              className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm bg-white"
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
                          <div className="relative">
                            <input
                              type="text"
                              name={field.name}
                              id={field.name}
                              readOnly={isAutoFilled}
                              value={formData[field.name] || ''}
                              onChange={handleInputChange}
                              className={`block w-full rounded-xl border-0 py-2.5 px-3.5 shadow-sm ring-1 ring-inset sm:text-sm sm:leading-6 transition-all ${
                                isAutoFilled 
                                  ? 'bg-slate-50/80 text-slate-500 ring-slate-100 pr-10 cursor-not-allowed font-medium' 
                                  : 'bg-white text-slate-900 ring-slate-200 focus:ring-2 focus:ring-indigo-500'
                              }`}
                              placeholder={isAutoFilled ? 'Preenchido automaticamente' : `Digite o valor`}
                            />
                            {isAutoFilled && (
                              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Gerando Documento...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> Gerar e Baixar PDF</>
                  )}
                </button>
              </div>
            </form>

            {/* Coluna da Direita: Pré-visualização Real-time (Apenas para Texto) */}
            <div className="bg-slate-100/60 rounded-2xl border border-slate-200/80 p-6 flex flex-col h-fit min-h-[600px] shadow-sm lg:sticky lg:top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-500" />
                  Visualização da Emissão
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {activeTemplate.type === 'text' ? 'Carta Dinâmica' : 'PDF Estático'}
                </span>
              </div>
              
              {activeTemplate.type === 'text' ? (
                <div className="flex-1 bg-white border border-slate-200/60 rounded-lg shadow-lg p-10 overflow-y-auto font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-w-full relative min-h-[450px]">
                  {/* Visual Effect: Paper Sheet Corner */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-slate-100 to-white border-b border-l border-slate-200 rounded-bl shadow-sm" />
                  
                  {/* Live Logo Preview inside paper */}
                  {activeEmpresa?.logo_url && (
                    <div className="flex justify-center mb-6 pb-6 border-b border-slate-100 max-h-16">
                      <img src={activeEmpresa.logo_url} className="max-h-16 object-contain" alt="Logo Empresa" />
                    </div>
                  )}

                  {/* Letter content */}
                  <div 
                    className="min-h-[250px] whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: (() => {
                        let preview = activeTemplate.conteudo || '';
                        
                        // Escapa HTML básico antes para segurança, mas permite b e strong
                        preview = preview
                          .replace(/&/g, "&amp;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;");
                        
                        preview = preview
                          .replace(/&lt;b&gt;/gi, "<b>")
                          .replace(/&lt;\/b&gt;/gi, "</b>")
                          .replace(/&lt;strong&gt;/gi, "<strong>")
                          .replace(/&lt;\/strong&gt;/gi, "</strong>");

                        const keys = Object.keys(formData).sort((a, b) => b.length - a.length);
                        keys.forEach(key => {
                          let value = String(formData[key] || `[${key}]`).toUpperCase().trim();
                          const keyLower = key.toLowerCase();
                          
                          if (keyLower.includes('nome') || keyLower.includes('cpf') || keyLower.includes('rg') || keyLower.includes('funcionario')) {
                            if (value && !String(value).startsWith('<b>') && !String(value).startsWith('[')) {
                              value = `<b>${value}</b>`;
                            }
                          }

                          preview = preview.split(`{{${key}}}`).join(value);
                        });
                        return preview;
                      })()
                    }}
                  />

                  {/* Live Stamps and Signature Preview inside paper */}
                  {(activeEmpresa?.carimbo_url || activeEmpresa?.carimbo_funcionario_url) && (
                    <div className="flex justify-around items-center border-t border-slate-100 pt-3 mt-4">
                      {activeEmpresa.carimbo_url && (
                        <div className="flex flex-col items-center gap-1.5">
                          <img src={activeEmpresa.carimbo_url} className="h-14 object-contain" alt="Carimbo" />
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Carimbo Empresa</span>
                        </div>
                      )}
                      {activeEmpresa.carimbo_funcionario_url && (
                        <div className="flex flex-col items-center gap-1.5">
                          <img src={activeEmpresa.carimbo_funcionario_url} className="h-14 object-contain" alt="Assinatura" />
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Assinatura / Carimbo Resp.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Footer Text Preview inside paper */}
                  {activeEmpresa?.rodape && (
                    <div className="text-center text-[9px] text-slate-400 mt-6 border-t border-slate-100 pt-3 leading-normal font-sans">
                      {cleanFooterText(activeEmpresa.rodape)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 bg-white border border-slate-200/60 rounded-lg shadow-lg flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4 min-h-[450px]">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <p className="font-semibold text-slate-600 text-sm">Preenchimento de Form PDF</p>
                    <p className="text-xs text-slate-400 leading-normal">
                      Os dados preenchidos no formulário serão injetados nos campos mapeados do PDF base.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 italic">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>O arquivo gerado conterá a folha timbrada, assinaturas e carimbos corporativos configurados.</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Modal de Compartilhamento Premium */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden p-6 md:p-8 space-y-6 border border-slate-100 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShareModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-650 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Documento Salvo & Pronto!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  A carta de {generatedCartaName} foi registrada no histórico com sucesso. Escolha uma opção para compartilhar:
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleWhatsAppShare}
                disabled={!generatedCartaId}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba56] active:scale-[0.99] text-white py-3.5 text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-50"
              >
                <MessageSquare className="w-5 h-5 fill-white" />
                Enviar pelo WhatsApp
              </button>

              <button
                onClick={handleCopyLink}
                disabled={!generatedCartaId}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-[0.99] py-3.5 text-sm font-bold transition-all disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                Copiar Link da Carta
              </button>

              <button
                onClick={() => {
                  if (generatedBlobUrl) {
                    const link = document.createElement('a');
                    link.href = generatedBlobUrl;
                    link.download = `CARTA ${generatedCartaName.toUpperCase()}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 active:scale-[0.99] text-white py-3.5 text-sm font-bold transition-all"
              >
                <Download className="w-4 h-4" />
                Baixar Novamente
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
