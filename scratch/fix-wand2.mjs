import fs from 'fs';
const file = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
  if (!p1.includes('Wand2')) {
    return `import {${p1}, Wand2} from 'lucide-react';`;
  }
  return match;
});

fs.writeFileSync(file, code);
console.log("Sucesso!");
