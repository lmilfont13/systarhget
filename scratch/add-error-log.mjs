import fs from 'fs';
const file = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("toast.error(error.message || 'Erro ao gerar o PDF final.');", "console.log('OUTER CATCH ERROR:', error.message, error.stack); toast.error(error.message || 'Erro ao gerar o PDF final.');");
fs.writeFileSync(file, code);
console.log("Sucesso!");
