const fs = require('fs');

const pdfBytes = fs.readFileSync('scratch/Output_Test_Generator.pdf');
const content = pdfBytes.toString('utf-8');

if (content.includes('TESTE EMPRESA')) {
  console.log("TESTE EMPRESA IS IN THE PDF!");
} else {
  console.log("TESTE EMPRESA IS NOT IN THE PDF!");
}
