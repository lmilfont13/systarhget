import fs from 'fs';
const file = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("const link = document.createElement('a');", "console.log('REACHED DOWNLOAD CODE', blobUrl); const link = document.createElement('a');");
fs.writeFileSync(file, code);
console.log("Sucesso!");
