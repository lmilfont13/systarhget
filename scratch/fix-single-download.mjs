import fs from 'fs';
const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

const targetStr = `            setGeneratedBlobUrl(url);
            setShareModalOpen(true);
            toast.success('Documento gerado com sucesso!');`;

const replaceStr = `            setGeneratedBlobUrl(url);
            setShareModalOpen(true);
            
            // Baixa o arquivo automaticamente também no modo individual
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Documento gerado com sucesso!');`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync(filePath, code);
console.log("Sucesso!");
