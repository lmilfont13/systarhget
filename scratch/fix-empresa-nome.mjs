import fs from 'fs';
const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(/e\.nome\.toUpperCase\(\)\.includes\('POP'\)/g, "(e.nome || '').toUpperCase().includes('POP')");
code = code.replace(/e\.nome\.toUpperCase\(\)\.includes\('SPAR'\)/g, "(e.nome || '').toUpperCase().includes('SPAR')");
code = code.replace(/activeEmpresa\.nome\.toUpperCase\(\)\.includes\('POP'\)/g, "(activeEmpresa.nome || '').toUpperCase().includes('POP')");

fs.writeFileSync(filePath, code);
console.log("Sucesso!");
