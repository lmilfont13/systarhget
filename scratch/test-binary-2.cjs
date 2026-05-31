const fs = require('fs');

const pdfBytes = fs.readFileSync('scratch/Output_Test_Generator_2.pdf');
const content = pdfBytes.toString('utf-8');

if (content.includes('TESTE DESCRICAO 1')) {
  console.log("TEXT IS PRESENT IN THE BINARY PDF!");
} else {
  console.log("TEXT IS NOT IN THE PDF!");
}
