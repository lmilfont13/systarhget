import fs from 'fs';
const filePath = 'C:/Users/Luciano/.gemini/antigravity-ide/scratch/docflow-hub/src/pages/Documentos.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

const regex = /<h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gerador de Documentos<\/h1>[\s\S]*?<p className="text-sm text-slate-500 mt-1">Preencha templates de texto ou PDF e gere arquivos prontos para impressão\.<\/p>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const replaceHTML = `<h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gerador de Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha templates de texto ou PDF e gere arquivos prontos para impressão.</p>
        </div>
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A2BE2] hover:bg-purple-700 text-white text-sm font-bold px-5 py-2.5 shadow-md transition-all">
          <Wand2 className="w-4 h-4" />
          Importação Inteligente (Tabela SAP/TOTVS)
        </button>
      </div>`;

if (regex.test(code)) {
    code = code.replace(regex, replaceHTML);
    fs.writeFileSync(filePath, code);
    console.log("Sucesso!");
} else {
    console.log("Falha regex.");
}
