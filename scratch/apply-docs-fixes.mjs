import fs from 'fs';

const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

// 1. STATE & REFERENCES
code = code.replace(
  "const [selectedFuncionario, setSelectedFuncionario] = useState('');",
  "const [selectedFuncionarios, setSelectedFuncionarios] = useState([]);"
);

code = code.replace(
  "setSelectedFuncionario(f.id);",
  "setSelectedFuncionarios(prev => prev.includes(f.id) ? prev : [...prev, f.id]);"
);

code = code.replace(
  /id="funcionario"[\s\S]*?value=\{selectedFuncionario\}[\s\S]*?onChange=\{\(e\) => setSelectedFuncionario\(e\.target\.value\)\}/g,
  `id="funcionario"
                  multiple
                  value={selectedFuncionarios}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedFuncionarios(values);
                  }}
                  style={{ minHeight: '120px' }}`
);

code = code.replace(
  /const activeFuncionario = funcionarios\.find\(f => String\(f\.id\) === String\(selectedFuncionario\)\);/g,
  "const activeFuncionario = selectedFuncionarios.length > 0 ? funcionarios.find(f => String(f.id) === String(selectedFuncionarios[0])) : null;"
);

code = code.replace(
  /\[selectedTemplate, selectedFuncionario, selectedEmpresa, optaContinuar\]/g,
  "[selectedTemplate, selectedFuncionarios, selectedEmpresa, optaContinuar]"
);

code = code.replace(
  /\{selectedFuncionario && activeFuncionario && \(/g,
  "{selectedFuncionarios.length > 0 && activeFuncionario && ("
);

// 2. HANDLE GENERATE LOOP
const startStr = "if (logoBase64) console.log('Logo carregada com sucesso');";
const endStr = "setIsGenerating(false);\n    }\n  };";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newGenerateLogic = `if (logoBase64) console.log('Logo carregada com sucesso');
      else console.warn('Falha ao carregar logo da empresa:', empresa?.nome);

      const funcsToProcess = selectedFuncionarios.length > 0
        ? selectedFuncionarios.map(id => funcionarios.find(f => String(f.id) === String(id))).filter(Boolean)
        : [null]; 
        
      let successCount = 0;

      for (const func of funcsToProcess) {
        const localFormData = { ...formData };
        if (func) {
            const de = func.dados_extras || {};
            let cdcValue = de['NC FUNCIONARIO'] || de['NC'] || de['Cdc'] || de['CDC'] || de['cdc'] || de['Cdc Superior'] || '';
            if (!cdcValue) {
                const foundKey = Object.keys(de).find(k => {
                    const up = k.toUpperCase();
                    return up.includes('CDC') || up === 'NC' || up.startsWith('NC ') || up.includes('CENTRO DE CUSTO');
                });
                if (foundKey) cdcValue = de[foundKey];
            }

            localFormData['nome'] = (func.nome || '').toUpperCase();
            localFormData['promotor'] = (func.nome || '').toUpperCase();
            localFormData['funcionario'] = (func.nome || '').toUpperCase();
            localFormData['cpf'] = de['CPF'] || de['cpf'] || '';
            localFormData['rg'] = de['RG'] || de['rg'] || de['Rg'] || '';
            localFormData['cargo'] = func.cargo ? String(func.cargo).toLowerCase() : '';
            localFormData['cdc'] = cdcValue;
            localFormData['empresa'] = cdcValue;
            localFormData['matricula'] = de['MATRICULA'] || '';
            localFormData['ctps'] = de['CTPS'] || '';
            localFormData['serie'] = de['SERIE'] || '';
            localFormData['data'] = new Date().toLocaleDateString('pt-BR');
            localFormData['data_atual'] = new Date().toLocaleDateString('pt-BR');
        }

        if (activeTemplate.type === 'text') {
          let content = activeTemplate.conteudo || '';
          Object.keys(localFormData).forEach(key => {
            let value = String(localFormData[key] || '').toUpperCase().trim();
            const keyLower = key.toLowerCase();
            
            if (keyLower.includes('nome') || keyLower.includes('cpf') || keyLower.includes('rg') || keyLower.includes('funcionario')) {
              if (value && !String(value).startsWith('<b>') && !String(value).startsWith('[')) {
                value = \`<b>\${value}</b>\`;
              }
            }

            const escapedKey = key.replace(/[.*+?^$\{}()|[\\]\\\\]/g, '\\\\$&');
            const regexCurly = new RegExp(\`\\{\\{\${escapedKey}\\}\\}\`, 'gi');
            const regexSquare = new RegExp(\`\\\\[\${escapedKey}\\\\]\`, 'gi');
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
          let base64PDF = activeTemplate.file_url;
          if (base64PDF && base64PDF.startsWith('local:')) {
            base64PDF = localStorage.getItem(\`pdf_\${activeTemplate.name}\`);
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

          const finalFormData = {};
          Object.keys(localFormData).forEach(key => {
            finalFormData[key] = localFormData[key];
          });
          
          if (logoBase64) finalFormData['img_logo'] = logoBase64;
          if (carimboBase64) finalFormData['img_carimbo'] = carimboBase64;
          if (carimboRespBase64) finalFormData['img_carimbo_responsavel'] = carimboRespBase64;

          blob = await PDFGenerator.fillDocument(bytes, finalFormData);
        }
        
        const url = URL.createObjectURL(blob);
        
        if (funcsToProcess.length > 1) {
            const link = document.createElement('a');
            link.href = url;
            const nomeSufixo = func ? \`_\${func.nome.replace(/\\s+/g, '_')}\` : '';
            link.download = \`CARTA_\${activeTemplate.name.toUpperCase()}\${nomeSufixo}.pdf\`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            successCount++;
        } else {
            const nomePromotor = func?.nome || formData['Nome'] || activeTemplate.name || 'documento';
            const fileName = \`CARTA \${nomePromotor.trim().toUpperCase()}.pdf\`;
            
            // Gravar no histórico (apenas no modo individual para não lotar o banco)
            let cartaId = null;
            try {
              const { data: insertData } = await supabase.from('cartas_geradas').insert({
                funcionario_id: func?.id || null,
                template_id: activeTemplate?.id || null,
                empresa_id: empresa?.id || null,
                nome_documento: fileName,
                campos_preenchidos: localFormData
              }).select().single();
              if (insertData) cartaId = insertData.id;
            } catch (e) {
               console.warn("Erro ao salvar histórico", e);
            }

            setGeneratedCartaId(cartaId);
            setGeneratedCartaName(nomePromotor.trim().toUpperCase());
            setGeneratedBlobUrl(url);
            setShareModalOpen(true);
            toast.success('Documento gerado com sucesso!');
        }
      }
      
      if (funcsToProcess.length > 1) {
         toast.success(\`\${successCount} documentos gerados e baixados com sucesso!\`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Erro ao gerar o PDF final.');
    } finally {
      setIsGenerating(false);
    }
  };`;

  code = code.substring(0, startIdx) + newGenerateLogic + code.substring(endIdx + endStr.length);
}

// 3. ADD SMART IMPORT STATE AND MODAL
if (!code.includes('isImportModalOpen')) {
    code = code.replace(
      "const [shareModalOpen, setShareModalOpen] = useState(false);",
      "const [shareModalOpen, setShareModalOpen] = useState(false);\n  const [isImportModalOpen, setIsImportModalOpen] = useState(false);\n  const [importText, setImportText] = useState('');"
    );

    const importFunc = `
  const handleProcessImport = () => {
    if (!importText.trim()) {
      toast.error('Cole os dados da tabela SAP/TOTVS primeiro.');
      return;
    }

    const blocks = importText.split(/\\n\\s*\\n/);
    const newFormData = { ...formData };
    let itemCount = 0;
    let totalValue = 0;

    blocks.forEach(block => {
      const lines = block.split('\\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length < 5) return;
      
      let descricao = '';
      let valor = 0;

      const valorLine = lines.find(l => /^\\d{1,3}(\\.\\d{3})*,\\d{2}$/.test(l) || /^\\d+,\\d{2}$/.test(l));
      if (valorLine) {
        valor = parseFloat(valorLine.replace(/\\./g, '').replace(',', '.'));
      } else if (lines.length >= 4) {
        valor = parseFloat(lines[3].replace(/\\./g, '').replace(',', '.')) || 0;
      }
      
      descricao = lines[lines.length - 1]; 
      
      if (descricao && valor > 0) {
        itemCount++;
        newFormData[\`descricao_\${itemCount}\`] = descricao;
        newFormData[\`valor_\${itemCount}\`] = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        totalValue += valor;
      }
    });

    if (itemCount > 0) {
      newFormData['total'] = totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setFormData(newFormData);
      toast.success(\`\${itemCount} itens importados e Total calculado (R$ \${newFormData['total']})!\`);
      setIsImportModalOpen(false);
      setImportText('');
    } else {
      toast.warning('Não foi possível identificar os itens e valores. Verifique se copiou a tabela completa.');
    }
  };`;

    code = code.replace(
      "const handleCopyLink = () => {",
      importFunc + "\n\n  const handleCopyLink = () => {"
    );

    // FIX FOR HTML STRUCTURE
    const buttonTarget = `<h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gerador de Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha templates de texto ou PDF e gere arquivos prontos para impressão.</p>
        </div>
      </div>`;
    const buttonReplace = `<h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gerador de Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha templates de texto ou PDF e gere arquivos prontos para impressão.</p>
        </div>
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A2BE2] hover:bg-purple-700 text-white text-sm font-bold px-5 py-2.5 shadow-md transition-all">
          <Wand2 className="w-4 h-4" />
          Importação Inteligente (Tabela SAP/TOTVS)
        </button>
      </div>`;

    if (code.includes(buttonTarget)) {
        code = code.replace(buttonTarget, buttonReplace);
    } else {
        console.warn("Nao achou o botao target!");
    }

    const modalHTML = `
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
            
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-sm text-slate-600">Cole abaixo o conteúdo copiado da planilha ou sistema SAP/TOTVS. O sistema irá extrair automaticamente as <b>descrições</b> e <b>valores</b> para preencher o formulário.</p>
              
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Exemplo:\\nCONTRATACAO MENSAL PUBLICIDADE E PROPAGANDA\\n1\\n595,00\\n...\\n64462 CE - FLD - AKZO..."
                className="w-full h-64 rounded-xl border border-slate-200 p-4 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50/50"
              />
            </div>
            
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 mt-auto">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleProcessImport}
                className="px-5 py-2.5 rounded-xl bg-[#8A2BE2] hover:bg-purple-700 text-white font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
              >
                <Wand2 className="w-4 h-4" /> Processar Dados
              </button>
            </div>
          </div>
        </div>
      )}
`;
    
    code = code.replace(
        `{shareModalOpen && (`,
        modalHTML + "\n\n      {shareModalOpen && ("
    );
}

fs.writeFileSync(filePath, code);
console.log('Todas as modificações aplicadas com sucesso!');
