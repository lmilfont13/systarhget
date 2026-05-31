import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function testFill() {
  const templatePath = 'public/Modelo_Nota_Debito.pdf'; // Adjust if it's different
  // Try to find the local file
  let pdfBytes;
  if (fs.existsSync(templatePath)) {
    pdfBytes = fs.readFileSync(templatePath);
  } else {
    // try to fetch it if we have URL, but wait, test-pdf.mjs downloaded it?
    // Let's just create a test script that fetches the template from Supabase
    console.log("Template locally not found?");
    return;
  }
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
      const fieldName = field.getName();
      if (fieldName === 'DESCRIÇÃO DA DESPESA') {
          console.log("Setting field:", fieldName);
          try {
             field.setText("TESTE 123");
             field.setFontSize(9);
          } catch(e) {
             console.log("Error:", e.message);
          }
      }
  }
  
  // Save without flattening
  const pdfBytesModified = await pdfDoc.save();
  fs.writeFileSync('public/Test_NotFlattened.pdf', pdfBytesModified);

  // Save with flattening
  form.flatten();
  const pdfBytesFlattened = await pdfDoc.save();
  fs.writeFileSync('public/Test_Flattened.pdf', pdfBytesFlattened);
  
  console.log("Done.");
}
testFill();
