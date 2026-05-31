import fs from 'fs';
const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(/field\.name\.toLowerCase\(\)/g, "(field.name || '').toLowerCase()");

fs.writeFileSync(filePath, code);
console.log("Sucesso!");
