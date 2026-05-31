import fs from 'fs';

const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

// The original logic assumes a single blob is returned and a single modal is opened.
// We will replace the whole try block inside handleGenerate with a version that supports an array.

const oldBlockStart = "if (logoBase64) console.log('Logo carregada com sucesso');";
const oldBlockEnd = "toast.success('Documento gerado com sucesso!');";

const newBlock = `if (logoBase64) console.log('Logo carregada com sucesso');
      else console.warn('Falha ao carregar logo da empresa:', empresa?.nome);

      const funcsToProcess = selectedFuncionarios.length > 0
        ? selectedFuncionarios.map(id => funcionarios.find(f => String(f.id) === String(id))).filter(Boolean)
        : [null]; // Roda pelo menos 1 vez usando o form manual
        
      for (const func of funcsToProcess) {
        // Prepara os dados localmente para o funcionário atual do loop
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
        }

        if (activeTemplate.type === 'text') {
          // Lógica para templates de TEXTO (Atacadão, Geral)
          let content = activeTemplate.conteudo || '';
          Object.keys(localFormData).forEach(key => {
            let value = String(localFormData[key] || '').toUpperCase().trim();
            const keyLower = key.toLowerCase();
            
            // Se for Nome, RG ou CPF, envolvemos com a tag <b> no PDF
            if (keyLower.includes('nome') || keyLower.includes('cpf') || keyLower.includes('rg') || keyLower.includes('funcionario')) {
              if (value && !String(value).startsWith('<b>') && !String(value).startsWith('[')) {
                value = \`<b>\${value}</b>\`;
              }
            }

            // Suporte para {{chave}} e [chave] de forma case-insensitive
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
          // Lógica para templates de PDF (Extensão NDI, etc)
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

          // Injeta as imagens no localFormData para o PDF preencher
          const finalFormData = {};
          Object.keys(localFormData).forEach(key => {
            finalFormData[key] = localFormData[key];
          });
          
          if (logoBase64) finalFormData['img_logo_empresa'] = logoBase64;
          if (carimboBase64) finalFormData['img_carimbo_empresa'] = carimboBase64;
          if (carimboRespBase64) finalFormData['img_assinatura_responsavel'] = carimboRespBase64;

          blob = await PDFGenerator.fillDocument(bytes, finalFormData);
        }
        
        // Baixa ou prepara o documento
        const url = URL.createObjectURL(blob);
        
        // Se houver mais de 1 funcionário, baixa automaticamente direto
        if (funcsToProcess.length > 1) {
            const link = document.createElement('a');
            link.href = url;
            const nomeSufixo = func ? \`_\${func.nome.replace(/\\s+/g, '_')}\` : '';
            link.download = \`CARTA_\${activeTemplate.name.toUpperCase()}\${nomeSufixo}.pdf\`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Se for apenas 1, mantém o comportamento antigo do modal
            setGeneratedBlobUrl(url);
        }
      }
      
      if (funcsToProcess.length > 1) {
         toast.success(\`\${funcsToProcess.length} documentos gerados e baixados com sucesso!\`);
      } else {
         toast.success('Documento gerado com sucesso!');`;

let startIdx = code.indexOf(oldBlockStart);
let endIdx = code.indexOf(oldBlockEnd) + oldBlockEnd.length;

if (startIdx > -1 && endIdx > -1) {
  code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
  fs.writeFileSync(filePath, code);
  console.log('handleGenerate atualizado com sucesso!');
} else {
  console.log('Não foi possível encontrar as âncoras para substituir o handleGenerate.');
}
