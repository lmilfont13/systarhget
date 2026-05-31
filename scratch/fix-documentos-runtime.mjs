import fs from 'fs';
const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(
  "if (selectedFuncionario && funcionarios.length > 0) {",
  "if (selectedFuncionarios.length > 0 && funcionarios.length > 0) {"
);

code = code.replace(
  "const func = funcionarios.find(f => String(f.id) === String(selectedFuncionario));",
  "const func = funcionarios.find(f => String(f.id) === String(selectedFuncionarios[0]));"
);

code = code.replace(
  "}, [selectedFuncionario, funcionarios]);",
  "}, [selectedFuncionarios, funcionarios]);"
);

fs.writeFileSync(filePath, code);
console.log("Sucesso!");
