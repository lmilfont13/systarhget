import fs from 'fs';
import { PDFGenerator } from '../src/pdf/PDFGenerator.js';

async function run() {
  const templatePath = 'public/Modelo_Nota_Debito.pdf';
  const pdfBytes = fs.readFileSync(templatePath);
  
  const pdfFinalData = {
    'empresa_razao': 'TESTE EMPRESA',
    'DESCRIÇÃO DA DESPESA': 'TESTE DESCRICAO 1',
    'VALOR': '100,00',
    'DESCRIÇÃO DA DESPESA_1': 'TESTE DESCRICAO 2',
    'VALOR_1': '200,00',
    'TOTAL': '300,00'
  };

  try {
    const blob = await PDFGenerator.fillDocument(pdfBytes, pdfFinalData);
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync('scratch/Output_Test_Generator.pdf', buffer);
    console.log("PDF gerado em scratch/Output_Test_Generator.pdf");
  } catch (e) {
    console.error(e);
  }
}
run();
