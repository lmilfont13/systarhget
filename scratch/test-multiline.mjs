const importText = `64462 - CE - FLD - AKZO - CORAL PROG VAREJO (CLT-SP) (POP)
R$
595,00
64479 - CE - FLD - AKZO - PROG EXEC (CLT-SP) (POP)
R$
140,00`;

const allLines = importText.split('\n');
let itemCount = 0;
const newFormData = {};

for (let i = 0; i < allLines.length;) {
  const line = allLines[i].trim();
  if (!line) { i++; continue; }

  const flatListMatch = line.match(/^(.*?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$/);
  if (flatListMatch) {
     console.log('Flat match!', flatListMatch[1]);
     i++; continue;
  }

  const isDescriptionLine = line.length > 5 
    && !/^\d+$/.test(line)
    && !line.match(/^\d+,\d{2}$/)
    && !line.match(/^GERES\d+/)
    && !/^R\$\s*$/.test(line);

  if (isDescriptionLine) {
    const blockLines = [];
    let j = i;
    let nonEmptyCount = 0;
    while (j < allLines.length && nonEmptyCount < 10) {
      const bl = allLines[j].trim();
      if (bl) {
        blockLines.push(bl);
        nonEmptyCount++;
      }
      j++;
      if (nonEmptyCount >= 2 && j < allLines.length) {
        const nextLine = allLines[j] ? allLines[j].trim() : '';
        if (nextLine.length > 5 && !/^\d+$/.test(nextLine) && !nextLine.match(/^\d+,\d{2}$/) && !/^R\$\s*$/.test(nextLine)) {
          const hasValue = blockLines.some(b => b.match(/^R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/) || b.match(/^(\d{1,3}(?:\.\d{3})*,\d{2})$/));
          if (hasValue) break;
        }
      }
    }
    
    if (blockLines.length >= 2) {
      const descricao = blockLines[0];
      let valor = 0;
      for (let k = 1; k < blockLines.length; k++) {
        const vMatch = blockLines[k].match(/^(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$/);
        if (vMatch) {
          const parsed = parseFloat(vMatch[1].replace(/\./g, '').replace(',', '.'));
          if (parsed > valor) valor = parsed;
        }
      }
      console.log('Block match!', descricao, 'Valor:', valor);
    }
    i = j;
  } else {
    i++;
  }
}
