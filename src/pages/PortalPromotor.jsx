import { useState, useEffect, useRef } from 'react';
import { FileEdit, CheckCircle2, Loader2, FileText, Eye, Info, Search, Lock, LogOut, MessageSquare, Copy, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { PDFGenerator } from '../pdf/PDFGenerator';

// Funções Auxiliares de Limpeza de Rodapé e Geração de Carimbo
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

const generateCarimboImage = (signatureDataUrl, name) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const carimboColor = '#0033aa'; // Azul de tinta de carimbo clássico
    ctx.strokeStyle = carimboColor;
    ctx.lineWidth = 3.5;
    
    // Desenha o retângulo externo com cantos arredondados (com fallback para navegadores antigos)
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(10, 10, 380, 120, 8);
    } else {
      ctx.rect(10, 10, 380, 120);
    }
    ctx.stroke();

    // 1. Texto Superior (Nome do Supervisor)
    ctx.fillStyle = carimboColor;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText((name || 'SUPERVISOR').toUpperCase(), 200, 22);

    // 2. Linha divisória
    ctx.strokeStyle = carimboColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(25, 48);
    ctx.lineTo(375, 48);
    ctx.stroke();

    // 3. Texto Inferior (Cargo fixo de Supervisor)
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('SUPERVISOR / RESPONSÁVEL', 200, 110);

    // 4. Desenhar a assinatura digital desenhada por cima no centro
    if (signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.globalAlpha = 0.95;
        ctx.drawImage(img, 70, 42, 260, 68);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = signatureDataUrl;
    } else {
      resolve(canvas.toDataURL('image/png'));
    }
  });
};

export default function PortalPromotor() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('promotor_authenticated') === 'true'
  );
  
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Assinatura Digital do Supervisor
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [supervisorName, setSupervisorName] = useState('SUPERVISOR');
  const [carimboSupervisor, setCarimboSupervisor] = useState(null);

  // Estados para o compartilhamento de PDF e histórico
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [generatedCartaId, setGeneratedCartaId] = useState(null);
  const [generatedCartaName, setGeneratedCartaName] = useState('');
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState(null);

  // Ao carregar a página ou redefinir a autenticação, limpamos a assinatura
  useEffect(() => {
    if (!isAuthenticated) {
      setSignatureImage(null);
      setSupervisorName('SUPERVISOR');
      setCarimboSupervisor(null);
    }
  }, [isAuthenticated]);

  // Gera o carimbo do supervisor em tempo real quando o nome ou a assinatura muda
  useEffect(() => {
    if (signatureImage) {
      generateCarimboImage(signatureImage, supervisorName).then(dataUrl => {
        setCarimboSupervisor(dataUrl);
      });
    } else {
      setCarimboSupervisor(null);
    }
  }, [signatureImage, supervisorName]);

  // Lógica do Canvas de Assinatura
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveSignature();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureImage(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImage(null);
  };

  // Efeito para registrar eventos Touch de forma passiva falsa (evita rolagem da página ao assinar no mobile)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e) => {
      if (e.target === canvas) {
        e.preventDefault();
        startDrawing(e);
      }
    };

    const handleTouchMove = (e) => {
      if (e.target === canvas) {
        e.preventDefault();
        draw(e);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.target === canvas) {
        e.preventDefault();
        stopDrawing();
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDrawing, canvasRef.current]);

  // Senha do portal
  const PORTAL_PASSWORD = '123';

  // Verifica login
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === PORTAL_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('promotor_authenticated', 'true');
      toast.success('Acesso liberado ao Portal Colgate!');
    } else {
      toast.error('Senha incorreta. Tente novamente.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('promotor_authenticated');
    setPassword('');
    setSelectedFuncionario('');
    setFormData({});
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [pData, tData, fData, eData] = await Promise.all([
        supabase.from('pdf_templates').select('*'),
        supabase.from('templates').select('*'),
        supabase.from('funcionarios').select('*').order('criado_em', { ascending: false }),
        supabase.from('empresas').select('*').order('criado_em', { ascending: false })
      ]);

      // Combina os templates
      const allTemplates = [
        ...(pData.data || []).map(t => ({ ...t, type: 'pdf' })),
        ...(tData.data || []).map(t => {
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

      // Carrega lojas
      const savedLojas = localStorage.getItem('docflow_lojas');
      if (savedLojas) {
        setLojas(JSON.parse(savedLojas));
      }

      // 1. Força a seleção do template "Carta de Apresentação Geral"
      const defaultTpl = allTemplates.find(t => t.name.toLowerCase().includes('carta de apresentação geral'));
      if (defaultTpl) {
        setSelectedTemplate(String(defaultTpl.id));
      } else if (allTemplates.length > 0) {
        // Fallback para o primeiro template de texto se não achar pelo nome exato
        const firstTextTpl = allTemplates.find(t => t.type === 'text');
        if (firstTextTpl) setSelectedTemplate(String(firstTextTpl.id));
      }

      // 2. Força a seleção da empresa "POP" ou "POP TRADE"
      const popCompany = (eData.data || []).find(e => e.nome.toUpperCase().includes('POP'));
      if (popCompany) {
        setSelectedEmpresa(String(popCompany.id));
      }

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeTemplate = templates.find(t => String(t.id) === String(selectedTemplate));
  const activeEmpresa = empresas.find(e => String(e.id) === String(selectedEmpresa));
  
  // 3. Filtra funcionários APENAS da conta Colgate
  const colgateFuncionarios = funcionarios.filter(func => {
    const empNome = String(func.dados_extras?.['Empresa'] || '').toUpperCase();
    const cdc = String(func.dados_extras?.['NC FUNCIONARIO'] || func.dados_extras?.['NC'] || func.dados_extras?.['Cdc'] || func.dados_extras?.['CDC'] || '').toUpperCase();
    return empNome.includes('COLGATE') || cdc.includes('COLGATE');
  });

  const activeFuncionario = colgateFuncionarios.find(f => String(f.id) === String(selectedFuncionario));

  // Filtra na busca autocomplete
  const filteredFuncionarios = colgateFuncionarios.filter(func => {
    const term = String(searchFuncionario || '').toLowerCase();
    const nome = String(func.nome || '').toLowerCase();
    const cpf = String(func.dados_extras?.CPF || '').toLowerCase();
    return nome.includes(term) || cpf.includes(term);
  });

  // Auto-preenche dados quando o funcionário muda
  useEffect(() => {
    if (activeTemplate && activeFuncionario) {
      try {
        const newData = { ...formData };
        const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        activeTemplate.fields?.forEach(field => {
          if (!field || !field.name) return;
          if (field.mappedTo) {
            switch (field.mappedTo) {
              case 'empresa_razao': newData[field.name] = activeEmpresa?.nome || ''; break;
              case 'empresa_cnpj': newData[field.name] = activeEmpresa?.cnpj || ''; break;
              case 'empresa_rodape': newData[field.name] = cleanFooterText(activeEmpresa?.rodape); break;
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
            const fieldNameLower = field.name.toLowerCase();
            
            if (displayNameLower.includes('data')) newData[field.name] = dataAtual;
             else if (displayNameLower.includes('rg')) newData[field.name] = activeFuncionario?.dados_extras?.RG || '';
            else if (displayNameLower.includes('cpf')) newData[field.name] = activeFuncionario?.dados_extras?.CPF || '';
            else if (displayNameLower.includes('cargo')) newData[field.name] = activeFuncionario?.cargo ? String(activeFuncionario.cargo).toLowerCase() : '';
            else if (displayNameLower.includes('empresa') || displayNameLower.includes('nc') || displayNameLower.includes('cdc')) {
              newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            }
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
            else if (fieldNameLower === 'data' || fieldNameLower === 'data_emissao') newData[field.name] = dataAtual;
            else if (fieldNameLower === 'nc' || fieldNameLower === 'cdc') newData[field.name] = activeFuncionario?.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario?.dados_extras?.NC || '';
            else {
              newData[field.name] = formData[field.name] || '';
            }
          }
        });
        
        const de = activeFuncionario?.dados_extras || {};
        const cdcValue = de['NC FUNCIONARIO'] || de['NC'] || de['Cdc'] || de['CDC'] || de['cdc'] || '';
        const rgValue = de['RG'] || de['rg'] || '';
        
        newData['cdc'] = cdcValue;
        newData['CDC'] = cdcValue;
        newData['Cdc'] = cdcValue;
        newData['empresa'] = cdcValue;
        newData['rg'] = rgValue;
        newData['RG'] = rgValue;
        
        setFormData(newData);
      } catch (err) {
        console.error(err);
      }
    }
  }, [selectedFuncionario, selectedTemplate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    
    if (!signatureImage) {
      toast.error('Por favor, assine digitalmente no campo de assinatura do supervisor.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let blob;
      
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
          console.error(e);
          return null;
        }
      };

      const logoBase64 = await getBase64(activeEmpresa?.logo_url);
      const carimboBase64 = await getBase64(activeEmpresa?.carimbo_url);
      // Retira a assinatura padrão da Vanessa e utiliza o carimbo gerado com nome e assinatura do supervisor
      const carimboRespBase64 = carimboSupervisor;

      if (activeTemplate.type === 'text') {
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

          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regexCurly = new RegExp(`{{${escapedKey}}}`, 'gi');
          const regexSquare = new RegExp(`\\[${escapedKey}\\]`, 'gi');
          content = content.replace(regexCurly, value).replace(regexSquare, value);
        });
        
        const assets = {
          logo_url: logoBase64,
          carimbo_url: carimboBase64,
          carimbo_responsavel_url: carimboRespBase64,
          footer_text: cleanFooterText(activeEmpresa?.rodape)
        };

        blob = await PDFGenerator.generateFromText(content, assets);
      } else {
        let base64PDF = activeTemplate.file_url;
        if (base64PDF && base64PDF.startsWith('local:')) {
          base64PDF = localStorage.getItem(`pdf_${activeTemplate.name}`);
        }
        const binaryString = atob(base64PDF);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

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

      const nomePromotor = activeFuncionario?.nome || formData['Nome'] || 'documento';
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
        const nomeArq = `CARTA ${nomePromotor.trim().toUpperCase()} - Supervisor ${String(supervisorName || '').trim()}`;
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
      toast.error('Erro ao gerar o PDF final.');
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

  // Se não estiver autenticado, exibe a tela de senha
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-800 via-red-650 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 space-y-6 border border-red-100 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="mb-4 flex justify-center">
              <svg viewBox="0 0 200 150" className="w-44 h-auto mx-auto drop-shadow-md">
                <path d="M 15,15 L 185,15 L 185,75 C 185,120 148,140 100,140 C 52,140 15,120 15,75 Z" fill="#e31b23" />
                <text x="100" y="80" fill="white" fontFamily="'Arial Black', sans-serif" fontSize="30" fontWeight="900" fontStyle="italic" textAnchor="middle" letterSpacing="-1">Colgate</text>
                <path d="M65,94 C80,110 120,110 135,94 C120,103 80,103 65,94 Z" fill="white" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Portal do Promotor</h1>
            <p className="text-sm text-slate-500">Digite a senha para acessar o gerador de cartas.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="pass" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Senha de Acesso</label>
              <input
                type="password"
                id="pass"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[#e31b23] sm:text-sm transition-all"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#e31b23] hover:bg-[#c3121a] text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all"
            >
              Acessar Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Tela do gerador carregando
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#e31b23] mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Carregando portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#e31b23] font-bold">
            <svg viewBox="0 0 200 150" className="w-8 h-auto">
              <path d="M 15,15 L 185,15 L 185,75 C 185,120 148,140 100,140 C 52,140 15,120 15,75 Z" fill="#e31b23" />
              <text x="100" y="80" fill="white" fontFamily="'Arial Black', sans-serif" fontSize="30" fontWeight="900" fontStyle="italic" textAnchor="middle" letterSpacing="-1">C</text>
              <path d="M65,94 C80,110 120,110 135,94 C120,103 80,103 65,94 Z" fill="white" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-950 leading-none">Portal do Promotor Colgate</h1>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Gere cartas de apresentação para o time Colgate / POP</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/50 px-3.5 py-2 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          {colgateFuncionarios.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h2 className="text-lg font-bold text-slate-800">Nenhum promotor Colgate cadastrado</h2>
              <p className="text-sm text-slate-400">
                Não há promotores cadastrados com a identificação "Colgate" em seus dados extras. Cadastre-os no painel administrativo principal.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 md:p-8 space-y-8">
              
              {/* Seleção do Promotor */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-red-50 text-[#e31b23] flex items-center justify-center text-[10px] font-bold">1</span>
                  Selecione o Promotor Colgate
                </label>
                
                <div className="flex flex-col sm:flex-row gap-3 relative">
                  {/* Autocomplete Combobox */}
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
                      className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[#e31b23] sm:text-sm bg-white transition-all"
                    />
                    
                    {/* Autocomplete Dropdown List */}
                    {isSearchFocused && searchFuncionario.trim() !== '' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsSearchFocused(false)} />
                        <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-2xl shadow-xl mt-1.5 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                          {filteredFuncionarios.length === 0 ? (
                            <div className="p-4 text-sm text-slate-400 text-center">Nenhum promotor encontrado</div>
                          ) : (
                            filteredFuncionarios.map(f => {
                              const cpf = f.dados_extras?.CPF || 'Sem CPF';
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedFuncionario(f.id);
                                    setSearchFuncionario('');
                                    setIsSearchFocused(false);
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm hover:bg-red-50/30 transition-colors flex items-center justify-between group"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-700 group-hover:text-[#e31b23] truncate">{String(f.nome || '').toUpperCase()}</p>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">CPF: {cpf}</p>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Dropdown Select Standard */}
                <div>
                  <select
                    id="funcionario"
                    value={selectedFuncionario}
                    onChange={(e) => setSelectedFuncionario(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[#e31b23] sm:text-sm bg-white"
                  >
                    <option value="">-- Clique aqui e escolha o promotor na lista --</option>
                    {colgateFuncionarios.map(f => {
                      const cpf = f.dados_extras?.CPF || 'Sem CPF';
                      return (
                        <option key={f.id} value={f.id}>{String(f.nome || '').toUpperCase()} - {cpf}</option>
                      );
                    })}
                  </select>
                </div>

                {/* Status and detected branding */}
                {selectedFuncionario && activeFuncionario && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    {/* Selo da Agência */}
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

                    {/* Selo da Empresa Cliente / CDC */}
                    {(activeFuncionario.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario.dados_extras?.NC || activeFuncionario.dados_extras?.CDC || activeFuncionario.dados_extras?.Cdc || activeFuncionario.dados_extras?.['Cdc Superior']) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm border bg-indigo-50 text-indigo-700 border-indigo-200 animate-in zoom-in-95 duration-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        CLIENTE: {String(activeFuncionario.dados_extras?.['NC FUNCIONARIO'] || activeFuncionario.dados_extras?.NC || activeFuncionario.dados_extras?.CDC || activeFuncionario.dados_extras?.Cdc || activeFuncionario.dados_extras?.['Cdc Superior']).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Formulário e Pré-visualização */}
              {activeTemplate && activeFuncionario && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                  {/* Coluna da Esquerda: Formulário de Dados */}
                  <form onSubmit={handleGenerate} className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#e31b23]">
                        <FileEdit className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Dados da Carta</h3>
                        <p className="text-xs text-slate-400">Preencha os campos abaixo.</p>
                      </div>
                    </div>

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
                                  <span className="text-[9px] text-[#e31b23] bg-red-50 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                                    Preenchido
                                  </span>
                                )}
                              </span>
                              {isLojaField && lojas.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setManualLojas(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                                  className="text-[10px] text-[#e31b23] hover:text-red-550 font-bold transition-colors uppercase tracking-wider"
                                >
                                  {manualLojas[field.name] ? 'Lista de Lojas' : 'Digitar Manual'}
                                </button>
                              )}
                            </label>
                            
                            <div className="mt-1">
                              {isLojaField ? (
                                lojas.length === 0 ? (
                                  <input
                                    type="text"
                                    name={field.name}
                                    id={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleInputChange}
                                    className="block w-full rounded-xl border-0 py-2.5 px-3.5 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[#e31b23] sm:text-sm text-slate-900 bg-white"
                                    placeholder="Digite o nome da loja..."
                                  />
                                ) : manualLojas[field.name] ? (
                                  <input
                                    type="text"
                                    name={field.name}
                                    id={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleInputChange}
                                    className="block w-full rounded-xl border-0 py-2.5 px-3.5 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[#e31b23] sm:text-sm text-slate-900 bg-white"
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
                                    className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-800 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[#e31b23] sm:text-sm bg-white"
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
                                        : 'bg-white text-slate-900 ring-slate-200 focus:ring-2 focus:ring-[#e31b23]'
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

                    {/* Campo de Nome do Supervisor */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-5">
                      <label htmlFor="supervisorName" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Nome do Supervisor / Responsável
                      </label>
                      <input
                        type="text"
                        id="supervisorName"
                        value={supervisorName}
                        onChange={e => setSupervisorName(e.target.value.toUpperCase())}
                        className="block w-full rounded-xl border-0 py-2.5 px-3.5 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-[#e31b23] sm:text-sm text-slate-900 bg-white"
                        placeholder="SUPERVISOR"
                      />
                    </div>

                    {/* Campo de Assinatura Digital do Supervisor */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          Assinatura Digital do Supervisor
                          <span className="text-[9px] text-[#e31b23] bg-red-50 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                            Obrigatório
                          </span>
                        </span>
                        {signatureImage && (
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="text-[10px] text-red-650 hover:text-red-700 font-bold transition-colors uppercase tracking-wider"
                          >
                            Limpar Assinatura
                          </button>
                        )}
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-2">
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          className="w-full bg-white border border-slate-200 rounded-lg cursor-crosshair touch-none shadow-inner"
                          style={{ maxHeight: '120px' }}
                        />
                        <p className="text-[9px] text-slate-400 text-center font-medium">
                          Assine com o mouse ou o dedo diretamente no quadro acima.
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#e31b23] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#c3121a] hover:shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Gerando Carta...</>
                        ) : (
                          <><CheckCircle2 className="w-5 h-5" /> Gerar e Baixar Carta PDF</>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Coluna da Direita: Pré-visualização da Folha de Papel */}
                  <div className="bg-slate-100/60 rounded-2xl border border-slate-200/80 p-6 flex flex-col h-fit min-h-[600px] shadow-sm lg:sticky lg:top-4 animate-in fade-in slide-in-from-right-3 duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[#e31b23]" />
                        Visualização da Carta
                      </h3>
                      <span className="text-[10px] font-bold text-red-750 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Colgate / POP
                      </span>
                    </div>
                    
                    <div className="flex-1 bg-white border border-slate-200/60 rounded-lg shadow-lg p-10 overflow-y-auto font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-w-full relative min-h-[450px]">
                      {/* Paper corner */}
                      <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-slate-100 to-white border-b border-l border-slate-200 rounded-bl shadow-sm" />
                      
                      {/* Logo POP */}
                      {activeEmpresa?.logo_url && (
                        <div className="flex justify-center mb-6 pb-6 border-b border-slate-100 max-h-16">
                          <img src={activeEmpresa.logo_url} className="max-h-16 object-contain" alt="Logo POP" />
                        </div>
                      )}

                      {/* Content */}
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

                      {/* Stamps */}
                      <div className="flex justify-around items-center border-t border-slate-100 pt-3 mt-4">
                        {activeEmpresa?.carimbo_url && (
                          <div className="flex flex-col items-center gap-1.5">
                            <img src={activeEmpresa.carimbo_url} className="h-14 object-contain" alt="Carimbo" />
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Carimbo POP</span>
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-1.5">
                          {carimboSupervisor ? (
                            <img src={carimboSupervisor} className="h-16 object-contain" alt="Carimbo Supervisor" />
                          ) : (
                            <>
                              <div className="h-14 w-40 border-b border-dashed border-slate-300" />
                              <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider">{supervisorName || 'SUPERVISOR'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      {activeEmpresa?.rodape && (
                        <div className="text-center text-[9px] text-slate-400 mt-6 border-t border-slate-100 pt-3 leading-normal font-sans">
                          {cleanFooterText(activeEmpresa.rodape)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(!selectedFuncionario || !activeFuncionario) && (
                <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
                  <FileText className="w-12 h-12 opacity-30 text-[#e31b23] animate-bounce" />
                  <p className="font-semibold text-slate-600">Aguardando seleção de promotor</p>
                  <p className="text-xs text-slate-400 max-w-xs leading-normal">
                    Selecione um promotor na lista acima para visualizar e gerar o documento correspondente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      {/* Modal de Compartilhamento Premium */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden p-6 md:p-8 space-y-6 border border-slate-100 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShareModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Documento Salvo & Pronto!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  A carta de {generatedCartaName} foi registrada com sucesso no histórico. Escolha como deseja compartilhar:
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
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white py-3.5 text-sm font-bold transition-all"
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
