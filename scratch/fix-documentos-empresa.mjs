import fs from 'fs';
const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

// The problematic lines:
// activeFuncionario.dados_extras?.['Empresa']?.toUpperCase().includes('POP')

code = code.replace(/activeFuncionario\.dados_extras\?\.\['Empresa'\]\?\.toUpperCase\(\)\.includes/g, 
  "(activeFuncionario.dados_extras?.['Empresa'] || '').toUpperCase().includes");

fs.writeFileSync(filePath, code);
console.log("Sucesso!");
