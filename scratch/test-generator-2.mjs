import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
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

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
    const fieldName = field.getName();
    let value = pdfFinalData[fieldName];

    if (value === undefined) {
        const fieldNameLower = fieldName.toLowerCase();
        const fieldNameNorm = fieldNameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const numMatch = fieldNameLower.match(/(\d+)$/);
        if (numMatch) {
            const idx = numMatch[1];
            if (fieldNameNorm.includes('descricao')) {
                value = pdfFinalData[`descricao_${idx}`];
            }
        }
    }
    
    if (value !== undefined) {
        console.log(`WILL SET [${fieldName}] to [${value}]`);
        if (field.constructor.name === 'PDFTextField') {
            field.setText(String(value));
        }
    } else {
        console.log(`[${fieldName}] is undefined`);
    }
  }

  form.flatten();
  const modified = await pdfDoc.save();
  fs.writeFileSync('scratch/Output_Test_Generator_2.pdf', modified);
}
run();
