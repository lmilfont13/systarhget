const importText = `64462 - CE - FLD - AKZO - CORAL PROG VAREJO (CLT-SP) (POP)\tR$\t595,00
64479 - CE - FLD - AKZO - PROG EXEC (CLT-SP) (POP)\tR$\t140,00
64579 - CE - FLD - COLGATE - EQP FIXA (CLT-SP) (POP)\tR$\t1.890,00`;

const allLines = importText.split('\n');
let itemCount = 0;

for (let i = 0; i < allLines.length; i++) {
  const line = allLines[i].trim();
  if (!line) continue;
  
  const flatListMatch = line.match(/^(.*?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$/);
  console.log(`Line ${i}:`, line);
  console.log(`Match:`, flatListMatch);
}
