const importText = `64462 - CE - FLD - AKZO - CORAL PROG VAREJO (CLT-SP) (POP)\tR$\t595,00
64479 - CE - FLD - AKZO - PROG EXEC (CLT-SP) (POP)\tR$\t140,00
64579 - CE - FLD - COLGATE - EQP FIXA (CLT-SP) (POP)\tR$\t1.890,00`;

const allLines = importText.split('\n');
let itemCount = 0;
const newFormData = {};
let totalValue = 0;
let tabelaValores = '';

let i = 0;
while (i < allLines.length) {
  const line = allLines[i].trim();
  if (!line) { i++; continue; }
  
  // Previous Logic
  const flatListMatch = line.match(/^(.*?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$/);
  if (flatListMatch) {
     const descricao = flatListMatch[1].trim();
     const valorStr = flatListMatch[2];
     const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
     console.log('FlatListMatch:', descricao, valor);
     i++;
     continue;
  }

  const isDescriptionLine = line.length > 5 
    && !/^\d+$/.test(line)
    && !line.match(/^\d+,\d{2}$/)
    && !line.match(/^GERES\d+/)
    && !/^R\$\s*$/.test(line);

  if (isDescriptionLine) {
    console.log('Desc line:', line);
    i++;
  } else {
    i++;
  }
}
