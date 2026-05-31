import fs from 'fs';

function testParsing(importText) {
    const allLines = importText.split('\n');
    let itemCount = 0;
    let totalValue = 0;
    
    let i = 0;
    while (i < allLines.length) {
      const line = allLines[i].trim();
      
      // Pular linhas vazias
      if (!line) { i++; continue; }
      
      const flatListMatch = line.match(/^(.*?)(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/i) 
                         || line.match(/^(.*?)(?:R\$\s*)?(\d+,\d{2})\s*$/i);
      
      if (flatListMatch && flatListMatch[1].trim().length > 0) {
         const descricao = flatListMatch[1].trim();
         const valorStr = flatListMatch[2];
         const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
         
         if (descricao && valor > 0) {
            itemCount++;
            totalValue += valor;
            console.log(`[FLAT] Found: ${descricao} | Valor: ${valor}`);
         }
         i++;
         continue;
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
          
          if (descricao && valor > 0) {
            itemCount++;
            console.log(`[BLOCK] Found: ${descricao} | Valor: ${valor}`);
          }
        }
        i = j;
        continue;
      }
      
      i++;
    }
    console.log(`Total items: ${itemCount}`);
}

const input = `64734 - CE - FLD - KENVUE - NEUTROGENA (CLT-SP) (POP)           R$ 120,00
64786 - CE - FLD - SANOFI - EQP FIXA (CLT-SP) (POP)            R$ 210,00
64885 - CE - FLD - SALONPAS - EQP REGULAR (CLT-TP) (POP)       R$
35,00
65260 - CE - FLD - CLIMAZON (CLT-SP) (POP)             R$ 175,00
65474 - CE - FLD - KENVUE (CLT-SP) (POP)               R$ 245,00
65527 - CE - FLD - COLGATE - ELMEX (MAO-SP) (POP)          R$ 35,00
66212 - CE - FLD - KENVUE - EQP DETERM (CLT-SP) (POP)          R$ 35,00
92414 - CE - FLD - LINEA COMPART (CLT) (POP)               R$ 35,00
92992 - CE - FLD - HISENSE TREIN (CLT)(POP)               R$ 35,00
94322 - CE - FLD - HISENSE COPA DO MUNDO (CLT-TP) (POP)        R$
35,00`;

testParsing(input);
