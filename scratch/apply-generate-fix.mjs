import fs from 'fs';

const file = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(file, 'utf8');

const targetStrStart = `  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) {
      toast.error('Selecione um template primeiro.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let blob;`;

const targetStrEnd = `      toast.success('Documento gerado e registrado no histórico com sucesso!');
    } catch (error) {
      console.error(error);
      console.log('OUTER CATCH ERROR:', error.message, error.stack); toast.error(error.message || 'Erro ao gerar o PDF final.');
    } finally {
      setIsGenerating(false);
    }
  };`;

const startIndex = code.indexOf("const handleGenerate = async (e) => {");
const endIndex = code.indexOf("const handleProcessImport = () => {");

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find handleGenerate bounds");
  process.exit(1);
}

const replacement = `  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) {
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

      const logoBase64 = await getBase64(empresa?.logo_url);
      const carimboBase64 = await getBase64(empresa?.carimbo_url);
      const carimboRespBase64 = await getBase64(empresa?.carimbo_funcionario_url);

      const funcsToProcess = selectedFuncionarios.length > 0 ? selectedFuncionarios.map(id => funcionarios.find(f => String(f.id) === String(id))) : [null];
      
      let generatedCount = 0;
      let lastGeneratedBlobUrl = null;
      let lastGeneratedName = null;
      let lastCartaId = null;

      for (const currentFunc of funcsToProcess) {
        let blob;
        let finalFormDataForFunc = { ...formData };
        
        // Populate current func data
        if (currentFunc) {
          finalFormDataForFunc['Nome'] = currentFunc.nome || '';
          finalFormDataForFunc['funcionario_nome'] = currentFunc.nome || '';
          if (currentFunc.dados_extras) {
            Object.keys(currentFunc.dados_extras).forEach(k => {
              finalFormDataForFunc[k] = currentFunc.dados_extras[k] || '';
              finalFormDataForFunc[\`funcionario_\${k.toLowerCase()}\`] = currentFunc.dados_extras[k] || '';
            });
          }
        }

        if (activeTemplate.type === 'text') {
          let content = activeTemplate.conteudo || '';
          Object.keys(finalFormDataForFunc).forEach(key => {
            let value = String(finalFormDataForFunc[key] || '').toUpperCase().trim();
            const keyLower = key.toLowerCase();
            if (keyLower.includes('nome') || keyLower.includes('cpf') || keyLower.includes('rg') || keyLower.includes('funcionario')) {
              if (value && !String(value).startsWith('<b>') && !String(value).startsWith('[')) {
                value = \`<b>\${value}</b>\`;
              }
            }
            const escapedKey = key.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
            content = content.replace(new RegExp(\`\\{\\{\${escapedKey}\\}\\}\`, 'gi'), value)
                             .replace(new RegExp(\`\\\\[\${escapedKey}\\\\]\`, 'gi'), value);
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
          if (!base64PDF) throw new Error("Arquivo PDF base não encontrado.");

          const binaryString = atob(base64PDF.includes(',') ? base64PDF.split(',')[1] : base64PDF);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

          const pdfFinalData = {};
          Object.keys(finalFormDataForFunc).forEach(key => {
            const val = finalFormDataForFunc[key];
            pdfFinalData[key] = typeof val === 'string' ? val.toUpperCase().trim() : val;
          });
          pdfFinalData.img_logo = logoBase64;
          pdfFinalData.img_carimbo = carimboBase64;
          pdfFinalData.img_carimbo_responsavel = carimboRespBase64;

          blob = await PDFGenerator.fillDocument(bytes, pdfFinalData);
        }

        const nomePromotor = currentFunc?.nome || finalFormDataForFunc['Nome'] || finalFormDataForFunc['funcionario_nome'] || activeTemplate.name || 'documento';
        const fileName = \`CARTA \${nomePromotor.trim().toUpperCase()}.pdf\`;
        const blobUrl = URL.createObjectURL(blob);

        const getBlobBase64 = (b) => new Promise(res => {
          const reader = new FileReader();
          reader.readAsDataURL(b);
          reader.onloadend = () => res(reader.result);
        });
        
        const base64Data = await getBlobBase64(blob);

        let cartaId = null;
        try {
          const nomeArq = \`CARTA \${nomePromotor.trim().toUpperCase()} - Admin\`;
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
        setShareModalOpen(true);
      }
      
      toast.success(\`\${generatedCount} documento(s) gerado(s) com sucesso!\`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Erro ao gerar o PDF final.');
    } finally {
      setIsGenerating(false);
    }
  };
`;

code = code.substring(0, startIndex) + replacement + "\n  " + code.substring(endIndex);
fs.writeFileSync(file, code);
console.log("SUCESSO!!!");
