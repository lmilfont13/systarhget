import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FileEdit, CheckCircle2, Loader2, FileText, Eye, Info, Search, Lock, MessageSquare, Copy, Download, X , Wand2} from 'lucide-react';
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
  const [selectedFuncionarios, setSelectedFuncionarios] = useState([]);
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

  // Estados adicionados para a refatoração
  const [showBranding, setShowBranding] = useState(false);
  const [isMultiFuncModalOpen, setIsMultiFuncModalOpen] = useState(false);
  const [multiFuncData, setMultiFuncData] = useState({});

  // Estados para o compartilhamento de PDF e histórico
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importItems, setImportItems] = useState([]);
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
    const tpl = templates.find(t => String(t.id) === String(templateId));
    if ((tpl?.name || tpl?.nome || '').toLowerCase().includes('nota de d')) {
      setIsImportModalOpen(true);
    }
  };

  const activeTemplate = templates.find(t => String(t.id) === String(selectedTemplate));
  const activeFuncionario = selectedFuncionarios.length > 0 ? funcionarios.find(f => String(f.id) === String(selectedFuncionarios[0])) : null;
  const activeEmpresa = empresas.find(e => String(e.id) === String(selectedEmpresa));
  const isNotaDebito = (activeTemplate?.name || activeTemplate?.nome || '').toLowerCase().includes('nota de d');

  // Sincroniza a empresa automaticamente quando o funcionário é selecionado
  useEffect(() => {
    if (selectedFuncionarios.length > 0 && funcionarios.length > 0) {
      const func = funcionarios.find(f => String(f.id) === String(selectedFuncionarios[0]));
      if (func && func.empresa_id) {
        setSelectedEmpresa(String(func.empresa_id));
      }
    }
  }, [selectedFuncionarios, funcionarios]);

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
          const pop = empresas.find(e => (e.nome || '').toUpperCase().includes('POP'));
          if (pop && String(selectedEmpresa) !== String(pop.id)) {
            targetEmpId = pop.id;
            setSelectedEmpresa(pop.id);
          }
        } else if (empNome.includes('SPAR')) {
          const spar = empresas.find(e => (e.nome || '').toUpperCase().includes('SPAR'));
          if (spar && String(selectedEmpresa) !== String(spar.id)) {
            targetEmpId = spar.id;
            setSelectedEmpresa(spar.id);
          }
        }

        const activeEmpresaRef = empresas.find(e => String(e.id) === String(targetEmpId)) || activeEmpresa;

        // === Injeção Automática de Dados das Empresas POP e SEVEN ===
        const empNomeUpper = (activeEmpresaRef?.nome || '').toUpperCase();
        let companyDetails = {
           razao_social: activeEmpresaRef?.nome || '',
           cnpj: activeEmpresaRef?.cnpj || '',
           endereco: '',
           bairro: '',
           cep: '',
           cidade: '',
           uf: '',
           inscricao_estadual: '',
           complemento: ''
        };

        let numeroNota = '';
        if (empNomeUpper.includes('POP')) {
           companyDetails = {
             razao_social: 'POP TRADE MARKETING E CONSULTORIA LTDA',
             cnpj: '07.272.350/0001-56',
             endereco: 'RUA LUIS CORREA DE MELO, 92',
             bairro: 'SANTO AMARO',
             cep: '04726-220',
             cidade: 'SÃO PAULO',
             uf: 'SP',
             inscricao_estadual: 'ISENTA',
             complemento: ''
           };
        } else if (empNomeUpper.includes('SEVEN')) {
           companyDetails = {
             razao_social: 'SEVEN TRADE MARKETING E CONSULTORIA LTDA',
             cnpj: '13.375.691/0001-50',
             endereco: 'RUA DEMOSTENES, 729',
             bairro: 'CAMPO BELO',
             cep: '04614-013',
             cidade: 'SÃO PAULO',
             uf: 'SP',
             inscricao_estadual: 'ISENTA',
             complemento: 'Sala 1'
           };
        }

        // === Geração Automática do Número da Nota ===
        const prefix = empNomeUpper.includes('POP') ? 'P' : (empNomeUpper.includes('SEVEN') ? 'S' : '');
        if (prefix) {
          const now = new Date();
          const d = String(now.getDate()).padStart(2, '0');
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const y = now.getFullYear();
          numeroNota = `${prefix}${d}${m}${y}`;
        }

        // Apply defaults globally so they can be picked up by any field mapping
        newData['numero'] = numeroNota;
        newData['numero_nota'] = numeroNota;
        newData['Text2'] = numeroNota; // Commonly used in AcroForms for Invoice Number
        newData['razao_social'] = companyDetails.razao_social;
        newData['endereco'] = companyDetails.endereco;
        newData['bairro'] = companyDetails.bairro;
        newData['cep'] = companyDetails.cep;
        newData['cidade'] = companyDetails.cidade;
        newData['uf'] = companyDetails.uf;
        newData['inscricao_estadual'] = companyDetails.inscricao_estadual;
        newData['complemento'] = companyDetails.complemento;
        newData['empresa_cnpj'] = companyDetails.cnpj;

        activeTemplate.fields?.forEach(field => {
          if (!field || !field.name) return;
          const fieldNameLower = (field.name || '').toLowerCase();
          
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
            else if (fieldNameLower === 'numero' || fieldNameLower === 'text2') newData[field.name] = numeroNota || '';
            else if (fieldNameLower === 'razao_social' || fieldNameLower === 'razão social') newData[field.name] = companyDetails.razao_social;
            else if (fieldNameLower === 'endereco' || fieldNameLower === 'endereço') newData[field.name] = companyDetails.endereco;
            else if (fieldNameLower === 'bairro') newData[field.name] = companyDetails.bairro;
            else if (fieldNameLower === 'cep') newData[field.name] = companyDetails.cep;
            else if (fieldNameLower === 'cidade') newData[field.name] = companyDetails.cidade;
            else if (fieldNameLower === 'uf') newData[field.name] = companyDetails.uf;
            else if (fieldNameLower === 'inscricao_estadual' || fieldNameLower === 'inscrição est' || fieldNameLower === 'inscrição estadual') newData[field.name] = companyDetails.inscricao_estadual;
            else if (fieldNameLower === 'complemento') newData[field.name] = companyDetails.complemento;
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
  }, [selectedTemplate, selectedFuncionarios, selectedEmpresa, optaContinuar]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (overrideFormData = null) => {
    if (!activeTemplate) {
      toast.error('Selecione um template primeiro.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const empresa = empresas.find(e => String(e.id) === String(selectedEmpresa));
      
      const getBase64 = async (url) => {
        if (!url) return null;
        if (url.startsWith('data:')) return url;
        try {
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

      const funcsToProcess = selectedFuncionarios.length > 0 ? selectedFuncionarios.map(id => funcionarios.find(f => String(f.id) === String(id))) : [null];
      
      let generatedCount = 0;
      let lastGeneratedBlobUrl = null;
      let lastGeneratedName = null;
      let lastCartaId = null;

      for (const currentFunc of funcsToProcess) {
        let blob;
        let finalFormDataForFunc = { ...(overrideFormData || formData) };
        
        let targetEmpId = selectedEmpresa;
        if (currentFunc) {
            const empNome = String(currentFunc.dados_extras?.['Empresa'] || '').toUpperCase();
            if (empNome.includes('POP')) {
              const pop = empresas.find(e => (e.nome || '').toUpperCase().includes('POP'));
              if (pop) targetEmpId = pop.id;
            } else if (empNome.includes('SPAR')) {
              const spar = empresas.find(e => (e.nome || '').toUpperCase().includes('SPAR'));
              if (spar) targetEmpId = spar.id;
            } else if (currentFunc.empresa_id) {
              targetEmpId = currentFunc.empresa_id;
            }
        }
        const funcEmpresa = empresas.find(e => String(e.id) === String(targetEmpId)) || empresa;
        
        if (currentFunc) {
          const de = currentFunc.dados_extras || {};
          let cdcValue = de['NC FUNCIONARIO'] || de['NC'] || de['Cdc'] || de['CDC'] || de['cdc'] || de['Cdc Superior'] || '';
          if (!cdcValue) {
            const foundKey = Object.keys(de).find(k => {
              const up = k.toUpperCase();
              return up.includes('CDC') || up === 'NC' || up.startsWith('NC ') || up.includes('CENTRO DE CUSTO');
            });
            if (foundKey) cdcValue = de[foundKey];
          }

          const rgValue = de['RG'] || de['rg'] || de['Rg'] || '';
          
          finalFormDataForFunc['Nome'] = (currentFunc.nome || '').toUpperCase();
          finalFormDataForFunc['funcionario_nome'] = (currentFunc.nome || '').toUpperCase();
          finalFormDataForFunc['cpf'] = de['CPF'] || '';
          finalFormDataForFunc['CPF'] = de['CPF'] || '';
          finalFormDataForFunc['rg'] = rgValue;
          finalFormDataForFunc['RG'] = rgValue;
          finalFormDataForFunc['cdc'] = cdcValue;
          finalFormDataForFunc['CDC'] = cdcValue;
          finalFormDataForFunc['cargo'] = currentFunc.cargo ? String(currentFunc.cargo).toLowerCase() : '';
          finalFormDataForFunc['CARGO'] = currentFunc.cargo ? String(currentFunc.cargo).toLowerCase() : '';
          finalFormDataForFunc['empresa'] = funcEmpresa?.nome || '';
          finalFormDataForFunc['EMPRESA'] = funcEmpresa?.nome || '';
          const baseData = overrideFormData || formData;
          finalFormDataForFunc['loja'] = multiFuncData[currentFunc.id]?.['loja'] || multiFuncData[currentFunc.id]?.['LOJA'] || baseData['loja'] || baseData['LOJA'] || '';
          finalFormDataForFunc['LOJA'] = finalFormDataForFunc['loja'];

          if (activeTemplate?.fields) {
            activeTemplate.fields.forEach(field => {
              if (!field || !field.name) return;
              const fieldNameLower = (field.name || '').toLowerCase();
              const displayNameLower = (field.displayName || '').toLowerCase();
              
              if (fieldNameLower.includes('nome') || displayNameLower.includes('nome')) finalFormDataForFunc[field.name] = (currentFunc.nome || '').toUpperCase();
              else if (fieldNameLower.includes('cpf') || displayNameLower.includes('cpf')) finalFormDataForFunc[field.name] = de['CPF'] || '';
              else if (fieldNameLower.includes('rg') || displayNameLower.includes('rg')) finalFormDataForFunc[field.name] = rgValue;
              else if (fieldNameLower.includes('cargo') || displayNameLower.includes('cargo')) finalFormDataForFunc[field.name] = currentFunc.cargo ? String(currentFunc.cargo).toLowerCase() : '';
              else if (fieldNameLower.includes('cdc') || displayNameLower.includes('cdc') || fieldNameLower.includes('nc')) finalFormDataForFunc[field.name] = cdcValue;
              else if (fieldNameLower.includes('empresa') || displayNameLower.includes('empresa')) finalFormDataForFunc[field.name] = funcEmpresa?.nome || '';
            });
          }

          if (currentFunc.dados_extras) {
            Object.keys(currentFunc.dados_extras).forEach(k => {
              finalFormDataForFunc[k] = currentFunc.dados_extras[k] || '';
              finalFormDataForFunc[`funcionario_${k.toLowerCase()}`] = currentFunc.dados_extras[k] || '';
            });
          }
          if (multiFuncData[currentFunc.id]) {
            Object.keys(multiFuncData[currentFunc.id]).forEach(k => {
              finalFormDataForFunc[k] = multiFuncData[currentFunc.id][k];
            });
          }
        }

        const funcEmpresaFinal = empresas.find(e => String(e.id) === String(targetEmpId)) || empresa;
        const funcLogoBase64 = await getBase64(funcEmpresaFinal?.logo_url);
        const funcCarimboBase64 = await getBase64(funcEmpresaFinal?.carimbo_url);
        const funcCarimboRespBase64 = await getBase64(funcEmpresaFinal?.carimbo_funcionario_url);
        const funcAssinaturaRespBase64 = await getBase64(funcEmpresaFinal?.assinatura_responsavel_url);

        if (activeTemplate.type === 'text') {
          let content = activeTemplate.conteudo || '';
          
          // Sort keys: process longer keys and keys with non-empty values first
          // This prevents empty strings in formData from wiping out placeholders
          // before explicit keys with values can replace them
          const sortedKeys = Object.keys(finalFormDataForFunc).sort((a, b) => {
             const valA = finalFormDataForFunc[a] ? 1 : 0;
             const valB = finalFormDataForFunc[b] ? 1 : 0;
             if (valA !== valB) return valB - valA; // Non-empty first
             return b.length - a.length; // Longer keys first
          });

          sortedKeys.forEach(key => {
            let value = String(finalFormDataForFunc[key] || '').toUpperCase().trim();
            if (!value) return; // Skip empty replacements to allow other cases to match

            const keyLower = key.toLowerCase();
            if (keyLower.includes('nome') || keyLower.includes('cpf') || keyLower.includes('rg') || keyLower.includes('funcionario')) {
              if (value && !String(value).startsWith('<b>') && !String(value).startsWith('[')) {
                value = `<b>${value}</b>`;
              }
            }
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            content = content.replace(new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'gi'), value)
                             .replace(new RegExp(`\\[${escapedKey}\\]`, 'gi'), value);
          });
          
          // Second pass: remove any remaining unmatched placeholders
          content = content.replace(/\{\{[^}]+\}\}/g, '')
                           .replace(/\[[^\]]+\]/g, '');
          
          const assets = {
            logo_url: funcLogoBase64,
            carimbo_url: funcCarimboBase64,
            carimbo_responsavel_url: funcCarimboRespBase64,
            assinatura_responsavel_url: funcAssinaturaRespBase64,
            footer_text: cleanFooterText(funcEmpresaFinal?.rodape)
          };

          blob = await PDFGenerator.generateFromText(content, assets);
        } else {
          let base64PDF = activeTemplate.file_url;
          if (base64PDF && base64PDF.startsWith('local:')) {
            base64PDF = localStorage.getItem(`pdf_${activeTemplate.name}`);
          }
          if (!base64PDF) throw new Error("Arquivo PDF base não encontrado.");

          const binaryString = atob(base64PDF.includes(',') ? base64PDF.split(',')[1] : base64PDF);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

          const pdfFinalData = {};
          Object.keys(finalFormDataForFunc).forEach(key => {
            const val = finalFormDataForFunc[key];
            pdfFinalData[key] = typeof val === 'string' ? val.toUpperCase().trim() : val;
          });

          // === Injeção Automática de Dados das Empresas POP e SEVEN no Momento da Geração ===
          const empNomeUpper = (funcEmpresaFinal?.nome || '').toUpperCase();
          if (empNomeUpper.includes('POP')) {
             pdfFinalData['razao_social'] = 'POP TRADE MARKETING E CONSULTORIA LTDA';
             pdfFinalData['empresa'] = 'POP TRADE MARKETING E CONSULTORIA LTDA';
             pdfFinalData['cnpj'] = '07.272.350/0001-56';
             pdfFinalData['endereco'] = 'RUA LUIS CORREA DE MELO, 92';
             pdfFinalData['bairro'] = 'SANTO AMARO';
             pdfFinalData['cep'] = '04726-220';
             pdfFinalData['cidade'] = 'SÃO PAULO';
             pdfFinalData['uf'] = 'SP';
             pdfFinalData['inscricao_estadual'] = 'ISENTA';
             pdfFinalData['complemento'] = '';
          } else if (empNomeUpper.includes('SEVEN')) {
             pdfFinalData['razao_social'] = 'SEVEN TRADE MARKETING E CONSULTORIA LTDA';
             pdfFinalData['empresa'] = 'SEVEN TRADE MARKETING E CONSULTORIA LTDA';
             pdfFinalData['cnpj'] = '13.375.691/0001-50';
             pdfFinalData['endereco'] = 'RUA DEMOSTENES, 729';
             pdfFinalData['bairro'] = 'CAMPO BELO';
             pdfFinalData['cep'] = '04614-013';
             pdfFinalData['cidade'] = 'SÃO PAULO';
             pdfFinalData['uf'] = 'SP';
             pdfFinalData['inscricao_estadual'] = 'ISENTA';
             pdfFinalData['complemento'] = 'Sala 1';
          }

          // === Geração Automática do Número da Nota e Data de Emissão ===
          const prefix = empNomeUpper.includes('POP') ? 'P' : (empNomeUpper.includes('SEVEN') ? 'S' : '');
          const now = new Date();
          const d = String(now.getDate()).padStart(2, '0');
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const y = now.getFullYear();
          const dataAtualStr = `${d}/${m}/${y}`;
          
          if (prefix) {
            const numeroNota = `${prefix}${d}${m}${y}`;
            pdfFinalData['numero'] = numeroNota;
            pdfFinalData['Text2'] = numeroNota; // Mapeamento comum
            pdfFinalData['NÚMERO'] = numeroNota;
            pdfFinalData['número'] = numeroNota;
          }
          
          pdfFinalData['data_emissao'] = dataAtualStr;
          pdfFinalData['data_atual'] = dataAtualStr;
          pdfFinalData['Text4'] = dataAtualStr;
          pdfFinalData['DATA DE EMISSÃO'] = dataAtualStr;

          // Somente usa DEFAULT_CARIMBO se for um campo de carimbo na parte inferior (não logo)
          pdfFinalData.img_logo = funcLogoBase64;
          pdfFinalData.img_carimbo = funcCarimboBase64;
          pdfFinalData.img_carimbo_responsavel = funcCarimboRespBase64;
          pdfFinalData.img_assinatura_responsavel = funcAssinaturaRespBase64;

          blob = await PDFGenerator.fillDocument(bytes, pdfFinalData);
        }

        const nomePromotor = currentFunc?.nome || finalFormDataForFunc['Nome'] || finalFormDataForFunc['funcionario_nome'] || activeTemplate.name || 'documento';
        const fileName = `CARTA ${nomePromotor.trim().toUpperCase()}.pdf`;
        const blobUrl = URL.createObjectURL(blob);

        const getBlobBase64 = (b) => new Promise(res => {
          const reader = new FileReader();
          reader.readAsDataURL(b);
          reader.onloadend = () => res(reader.result);
        });
        
        const base64Data = await getBlobBase64(blob);

        let cartaId = null;
        try {
          const nomeArq = `CARTA ${nomePromotor.trim().toUpperCase()} - Admin`;
          const { data: insertData, error: insertError } = await supabase.from('cartas_geradas').insert({
            funcionario_id: currentFunc?.id || null,
            template_id: activeTemplate?.id || null,
            empresa_id: activeEmpresa?.id || null,
            nome_funcionario: nomePromotor,
            nome_arquivo: nomeArq,
            url_storage: base64Data,
            data_geracao: new Date().toISOString()
          }).select();
          
          if (!insertError && insertData && insertData.length > 0) cartaId = insertData[0].id;
        } catch (dbErr) {
          console.error('Erro ao salvar no histórico:', dbErr);
        }

        // Trigger download automatically
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        generatedCount++;
        lastGeneratedBlobUrl = blobUrl;
        lastGeneratedName = nomePromotor;
        lastCartaId = cartaId;
      }
      
      if (generatedCount === 1) {
        setGeneratedCartaId(lastCartaId);
        setGeneratedCartaName(lastGeneratedName);
        setGeneratedBlobUrl(lastGeneratedBlobUrl);
        // setShareModalOpen(true); // Ocultado a pedido do usuário
      }
      
      toast.success(`${generatedCount} documento(s) gerado(s) com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Erro ao gerar o PDF final.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProcessImport = () => {
    if (importItems.length === 0) {
      toast.error('Cole os dados da planilha primeiro dando Ctrl+V na área indicada.');
      return null;
    }

    const newFormData = { ...formData };
    let totalValue = 0;
    
    const getKeys = (idxCount) => {
      let dKey = idxCount === 1 ? 'DESCRIÇÃO DA DESPESA' : `DESCRIÇÃO DA DESPESA_${idxCount - 1}`;
      let vKey  = idxCount === 1 ? 'VALOR' : `VALOR_${idxCount - 1}`;
      return { descKey: dKey, valKey: vKey };
    };

    importItems.forEach((item, index) => {
      const idxCount = index + 1;
      const { descKey, valKey } = getKeys(idxCount);
      
      newFormData[descKey] = item.cdc && item.cdc !== item.descricao ? `${item.cdc}` : item.descricao;
      newFormData[valKey]  = item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      newFormData[`descricao_${idxCount}`] = newFormData[descKey];
      newFormData[`valor_${idxCount}`]     = newFormData[valKey];
      totalValue += item.valor;
    });
    
    newFormData.total = totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    newFormData.TOTAL = newFormData.total;

    setFormData(newFormData);
    toast.success(`${importItems.length} despesas importadas e somadas! Total: R$ ${newFormData.total}`);
    setIsImportModalOpen(false);
    setImportItems([]);
    return newFormData;
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('text');
    
    if (!pastedData) return;

    const rows = pastedData.split('\n');
    const newItems = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].trim();
      if (!row) continue;
      
      const cols = row.split('\t');
      if (cols.length >= 2) {
        // Excel format with tabs
        const potentialValue = cols[cols.length - 1].trim();
        const valueMatch = potentialValue.match(/^(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$/);
        
        if (valueMatch) {
           let desc = cols.slice(0, cols.length - 1).join(' ').trim();
           desc = desc.replace(/\s*R\$$/i, '').trim();
           const valor = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
           newItems.push({ id: Date.now() + i, descricao: desc, valor, cdc: '' });
           continue;
        }
      }
      
      // Fallback: SAP block or string
      const flatListMatch = row.match(/^(.*?)(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/i) 
                         || row.match(/^(.*?)(?:R\$\s*)?(\d+,\d{2})\s*$/i);
      
      if (flatListMatch && flatListMatch[1].trim().length > 0) {
         let desc = flatListMatch[1].trim();
         desc = desc.replace(/\s*R\$$/i, '').trim();
         const valorStr = flatListMatch[2];
         const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
         newItems.push({ id: Date.now() + i, descricao: desc, valor, cdc: '' });
         continue;
      }
      
      // Lookahead for next line if it's an SAP block split
      if (i + 1 < rows.length) {
         const nextLine = rows[i+1].trim();
         const nextMatch = nextLine.match(/^(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$/);
         if (nextMatch) {
            let desc = row.replace(/\s*R\$$/i, '').trim();
            const valor = parseFloat(nextMatch[1].replace(/\./g, '').replace(',', '.'));
            newItems.push({ id: Date.now() + i, descricao: desc, valor, cdc: '' });
            i++; 
            continue;
         }
      }
    }
    
    if (newItems.length > 0) {
      setImportItems(prev => [...prev, ...newItems]);
      toast.success(`${newItems.length} itens extraídos da planilha!`);
    } else {
      toast.error('Não conseguimos extrair as colunas. Verifique se copiou a Descrição e o Valor do Excel.');
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

  const allLojas = useMemo(() => {
    const lojasSet = new Set();
    empresas.forEach(empresa => {
      if (Array.isArray(empresa.lojas)) {
        empresa.lojas.forEach(loja => lojasSet.add(loja));
      }
    });
    return Array.from(lojasSet).sort();
  }, [empresas]);

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
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A2BE2] hover:bg-purple-700 text-white text-sm font-bold px-5 py-2.5 shadow-md transition-all">
          <Wand2 className="w-4 h-4" />
          Importação Inteligente (Tabela SAP/TOTVS)
        </button>
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
          {!isNotaDebito && (
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
                                  setSelectedFuncionarios(prev => prev.includes(f.id) ? prev : [...prev, f.id]);
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
                  multiple
                  value={selectedFuncionarios}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedFuncionarios(values);
                  }}
                  style={{ minHeight: '120px' }}
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
              {selectedFuncionarios.length > 0 && activeFuncionario && (
                <div className="mt-2 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  {/* Selo da Agência */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm border ${
                    (activeFuncionario.dados_extras?.['Empresa'] || '').toUpperCase().includes('POP') 
                      ? 'bg-sky-50 text-sky-700 border-sky-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      (activeFuncionario.dados_extras?.['Empresa'] || '').toUpperCase().includes('POP') ? 'bg-sky-400' : 'bg-blue-500'
                    }`}></span>
                    {(activeFuncionario.dados_extras?.['Empresa'] || '').toUpperCase().includes('POP') ? 'POP TRADE' : 'SPAR BRASIL'}
                  </span>

                  {/* Selo da Empresa Cliente / CDC */}
                  {(activeFuncionario.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario.dados_extras?.NC || activeFuncionario.dados_extras?.CDC || activeFuncionario.dados_extras?.Cdc || activeFuncionario.dados_extras?.['Cdc Superior']) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm border bg-indigo-50 text-indigo-700 border-indigo-200 animate-in zoom-in-95 duration-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      CLIENTE: {String(activeFuncionario.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario.dados_extras?.NC || activeFuncionario.dados_extras?.CDC || activeFuncionario.dados_extras?.Cdc || activeFuncionario.dados_extras?.['Cdc Superior']).toUpperCase()}
                    </span>
                  )}
                  
                  {!(formData['cdc'] || formData['CDC'] || formData['Cdc']) && (
                    <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">
                      <Info className="w-3 h-3 text-amber-500" /> CDC não localizado
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium italic">Detectado automaticamente</span>
                </div>
              )}
            </div>
          </div>
          )}
          
          {/* Active Empresa Branding Preview */}
          {activeEmpresa && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeEmpresa.logo_url && (
                  <img src={activeEmpresa.logo_url} className="h-8 object-contain" alt="Logo Empresa" />
                )}
                <div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold text-white ${(activeEmpresa.nome || '').toUpperCase().includes('POP') ? 'bg-sky-500 shadow-sm' : 'bg-blue-900 shadow-sm'}`}>
                    {(activeEmpresa.nome || '').toUpperCase().includes('POP') ? 'POP TRADE' : 'SPAR BRASIL'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBranding(!showBranding)}
                className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-semibold transition-colors uppercase tracking-wider"
              >
                <Eye className="w-3 h-3" /> {showBranding ? 'Ocultar Identidade' : 'Ver Identidade Visual'}
              </button>
            </div>
          )}

          {activeEmpresa && showBranding && (
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 mt-3 grid grid-cols-3 gap-4 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-wider">Logo do Topo</p>
                  <div className="h-12 w-full bg-white rounded-lg border border-slate-200/50 flex items-center justify-center p-1.5 overflow-hidden">
                    {activeEmpresa.logo_url ? <img src={activeEmpresa.logo_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-slate-300" />}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-wider">Carimbo e Assinatura</p>
                  <div className="h-12 w-full bg-white rounded-lg border border-slate-200/50 flex items-center justify-center p-1.5 overflow-hidden">
                    {activeEmpresa.carimbo_url ? <img src={activeEmpresa.carimbo_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-slate-300" />}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-wider">Carimbo Responsável</p>
                  <div className="h-12 w-full bg-white rounded-lg border border-slate-200/50 flex items-center justify-center p-1.5 overflow-hidden">
                    {activeEmpresa.carimbo_funcionario_url ? <img src={activeEmpresa.carimbo_funcionario_url} className="max-h-full max-w-full object-contain" /> : <Info className="w-4 h-4 text-slate-300" />}
                  </div>
                </div>
            </div>
          )}
        </div>

        {/* Formulário Dinâmico */}
        {activeTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
            {/* Coluna da Esquerda: Formulário */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedFuncionarios.length > 1) {
                setIsMultiFuncModalOpen(true);
              } else {
                handleGenerate();
              }
            }} className="space-y-6">
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
                  const name = (field.name || '').toLowerCase();
                  const display = (field.displayName || '').toLowerCase();
                  return !name.includes('logo') && !name.includes('carimbo') && !display.includes('carimbo') && !display.includes('logo');
                }).map(field => {
                  const isAutoFilled = !!field.mappedTo;
                  const labelName = isAutoFilled ? field.name : (field.displayName || field.name);
                  const isLojaField = !isAutoFilled && ((field.name || '').toLowerCase() === 'loja' || (field.name || '').toLowerCase() === 'lojas' || (field.name || '').toLowerCase() === 'estabelecimento');
                  
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
      
      {/* Modal de Importação SAP/TOTVS */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Importação SAP/TOTVS</h3>
                  <p className="text-xs text-slate-500">Cole os dados da Nota de Débito</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
              <p className="text-sm text-slate-600">Copie as linhas da sua planilha do Excel ou relatório SAP e clique na área abaixo, depois pressione <kbd className="px-2 py-1 bg-slate-100 rounded border font-mono text-xs text-slate-600">Ctrl + V</kbd></p>
              
              <div 
                onPaste={handlePaste}
                tabIndex="0"
                className="w-full min-h-[100px] border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/50 flex flex-col items-center justify-center text-center p-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-purple-100/50 transition-all group"
              >
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-focus:scale-110 transition-transform">
                  <Wand2 className="w-6 h-6 text-purple-500" />
                </div>
                <h4 className="font-bold text-slate-700">Cole seus dados aqui</h4>
                <p className="text-sm text-slate-500 mt-1">O sistema irá separar as colunas magicamente.</p>
              </div>

              {importItems.length > 0 && (
                <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Descrição da Despesa</th>
                        <th className="px-4 py-3 font-semibold w-32">Valor (R$)</th>
                        <th className="px-4 py-3 font-semibold w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {importItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              value={item.descricao} 
                              onChange={(e) => setImportItems(prev => prev.map(p => p.id === item.id ? { ...p, descricao: e.target.value } : p))}
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-700"
                            />
                          </td>
                          <td className="px-4 py-2 font-mono">
                            <input 
                              type="text" 
                              value={item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                              onChange={(e) => {
                                 const raw = e.target.value.replace(/[^\d,-]/g, '').replace(',', '.');
                                 const val = parseFloat(raw) || 0;
                                 setImportItems(prev => prev.map(p => p.id === item.id ? { ...p, valor: val } : p));
                              }}
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-700 font-medium"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button 
                              onClick={() => setImportItems(prev => prev.filter(p => p.id !== item.id))}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-purple-50/50 border-t border-purple-100">
                      <tr>
                        <td className="px-4 py-3 font-bold text-right text-purple-900">Total:</td>
                        <td className="px-4 py-3 font-bold font-mono text-purple-700">
                           {importItems.reduce((acc, item) => acc + item.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 mt-auto">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const parsedData = handleProcessImport();
                  if (parsedData) {
                    setTimeout(() => {
                      handleGenerate(parsedData);
                    }, 100);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-[#8A2BE2] hover:bg-purple-700 text-white font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
              >
                <Wand2 className="w-4 h-4" /> Processar Dados
              </button>
            </div>
          </div>
        </div>
      )}


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

      {isMultiFuncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Dados dos Funcionários</h3>
                  <p className="text-xs text-slate-500">Preencha os dados específicos para os {selectedFuncionarios.length} funcionários selecionados.</p>
                </div>
              </div>
              <button onClick={() => setIsMultiFuncModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {selectedFuncionarios.map((funcId, idx) => {
                const func = funcionarios.find(f => String(f.id) === String(funcId));
                if (!func) return null;
                return (
                  <div key={func.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="font-bold text-slate-700 text-sm mb-3">{(func.nome || 'Desconhecido').toUpperCase()}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {activeTemplate?.fields?.filter(f => {
                        const low = f.name.toLowerCase();
                        return !['funcionario_nome', 'funcionario_cpf', 'funcionario_rg', 'empresa_nome', 'empresa_rodape'].includes(low) 
                            && !low.includes('nome') && !low.includes('cpf') && !low.includes('rg') && !low.includes('cargo') 
                            && low !== 'cdc' && !low.includes('assinatura') && !low.includes('carimbo');
                      }).map(field => (
                        <div key={field.name}>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {field.name.replace(/_/g, ' ')}
                          </label>
                          {field.name.toLowerCase() === 'loja' ? (
                            <select
                              className="block w-full rounded-lg border-slate-200 bg-white text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={multiFuncData[func.id]?.[field.name] || formData[field.name] || ''}
                              onChange={(e) => setMultiFuncData(prev => ({
                                ...prev,
                                [func.id]: {
                                  ...(prev[func.id] || {}),
                                  [field.name]: e.target.value
                                }
                              }))}
                            >
                              <option value="">Selecione uma loja...</option>
                              {allLojas.map(loja => (
                                <option key={loja} value={loja}>{loja}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="block w-full rounded-lg border-slate-200 bg-white text-xs px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="Preencher..."
                              value={multiFuncData[func.id]?.[field.name] || formData[field.name] || ''}
                              onChange={(e) => setMultiFuncData(prev => ({
                                ...prev,
                                [func.id]: {
                                  ...(prev[func.id] || {}),
                                  [field.name]: e.target.value
                                }
                              }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setIsMultiFuncModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleGenerate();
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Continuar e Gerar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
