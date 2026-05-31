import fs from 'fs';

const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Mudar o state
code = code.replace(
  "const [selectedFuncionario, setSelectedFuncionario] = useState('');",
  "const [selectedFuncionarios, setSelectedFuncionarios] = useState([]);"
);

// 2. Mudar onClick do autocomplete
code = code.replace(
  "setSelectedFuncionario(f.id);",
  "setSelectedFuncionarios(prev => prev.includes(f.id) ? prev : [...prev, f.id]);"
);

// 3. Mudar o <select id="funcionario">
code = code.replace(
  /id="funcionario"[\s\S]*?value=\{selectedFuncionario\}[\s\S]*?onChange=\{\(e\) => setSelectedFuncionario\(e\.target\.value\)\}/g,
  `id="funcionario"
                  multiple
                  value={selectedFuncionarios}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedFuncionarios(values);
                  }}
                  style={{ minHeight: '120px' }}`
);

// 4. Mudar as referências isoladas
code = code.replace(
  /const activeFuncionario = funcionarios\.find\(f => String\(f\.id\) === String\(selectedFuncionario\)\);/g,
  "const activeFuncionario = selectedFuncionarios.length > 0 ? funcionarios.find(f => String(f.id) === String(selectedFuncionarios[0])) : null;"
);

code = code.replace(
  /\[selectedTemplate, selectedFuncionario, selectedEmpresa, optaContinuar\]/g,
  "[selectedTemplate, selectedFuncionarios, selectedEmpresa, optaContinuar]"
);

code = code.replace(
  /\{selectedFuncionario && activeFuncionario && \(/g,
  "{selectedFuncionarios.length > 0 && activeFuncionario && ("
);

// 5. O handleGenerate é muito complexo para trocar com regex. Vamos buscar o corpo e colocar o loop.
// O handleGenerate começa com "const handleGenerate = async (e) => {" e vai até a linha 500 mais ou menos.
// Felizmente, o handleGenerate da base de código original do usuário já tinha a lógica ou eu posso injetá-la de forma mais contida.
// Para evitar quebrar o arquivo todo, vamos apenas modificar o botão Gerar, ou reescrever a função handleGenerate.
// Ou, vou usar uma abordagem mais sutil: se o usuário selecionou múltiplos, a lógica de geração deve rodar para cada um.

const generateStart = code.indexOf('const handleGenerate = async (e) => {');
const generateEndString = 'toast.success('; 
const generateEnd = code.indexOf(generateEndString, generateStart);

// Ao invés de substituir o handleGenerate gigante, vou usar multi_replace_file_content no próximo tool call que é mais seguro.

fs.writeFileSync(filePath, code);
console.log('Script de replace básico executado. Faltam pequenos ajustes do handleGenerate.');
