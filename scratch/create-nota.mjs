import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function createNotaTemplate() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const form = pdfDoc.getForm();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawField = (name, x, y, w, h, isBold = false, isMultiline = false) => {
    const field = form.createTextField(name);
    field.addToPage(page, { x, y, width: w, height: h });
    if (isBold) field.updateAppearances(fontBold);
    if (isMultiline) field.enableMultiline();
  };

  const drawButtonImg = (name, x, y, w, h) => {
    const field = form.createTextField(name);
    field.addToPage(page, { x, y, width: w, height: h });
  };

  const margin = 40;
  let cursorY = height - 50;

  // TOP LEFT: Company Logo/Stamp box
  page.drawRectangle({
    x: margin, y: cursorY - 70, width: 220, height: 90,
    borderColor: rgb(0, 0, 0), borderWidth: 1
  });
  drawButtonImg('img_carimbo', margin + 5, cursorY - 65, 210, 80);

  // TOP RIGHT: Header
  page.drawText('NOTA DE DÉBITO', { x: width - margin - 150, y: cursorY + 5, size: 14, font: fontBold });
  
  page.drawText('NÚMERO', { x: width - margin - 180, y: cursorY - 25, size: 10, font: font });
  page.drawRectangle({ x: width - margin - 100, y: cursorY - 30, width: 100, height: 16, borderColor: rgb(0,0,0), borderWidth: 1 });
  drawField('numero', width - margin - 98, cursorY - 28, 96, 12);

  page.drawText('DATA DE EMISSÃO', { x: width - margin - 180, y: cursorY - 45, size: 10, font: font });
  page.drawRectangle({ x: width - margin - 80, y: cursorY - 50, width: 80, height: 16, borderColor: rgb(0,0,0), borderWidth: 1 });
  drawField('data_emissao', width - margin - 78, cursorY - 48, 76, 12);

  cursorY -= 100;

  // Company Details
  const fontSize = 10;
  page.drawText('Razão Social:', { x: margin, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 70, y: cursorY - 2 }, end: { x: width - margin, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_razao', margin + 72, cursorY - 1, 400, 12, true);
  cursorY -= 18;

  page.drawText('Endereço:', { x: margin, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 60, y: cursorY - 2 }, end: { x: margin + 270, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_endereco', margin + 62, cursorY - 1, 200, 12);
  
  page.drawText('Complemento:', { x: margin + 280, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 355, y: cursorY - 2 }, end: { x: width - margin, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_complemento', margin + 357, cursorY - 1, 150, 12);
  cursorY -= 18;

  page.drawText('Bairro:', { x: margin, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 60, y: cursorY - 2 }, end: { x: margin + 270, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_bairro', margin + 62, cursorY - 1, 200, 12);
  
  page.drawText('Cidade:', { x: margin + 280, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 325, y: cursorY - 2 }, end: { x: width - margin, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_cidade', margin + 327, cursorY - 1, 180, 12);
  cursorY -= 18;

  page.drawText('CEP:', { x: margin, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 60, y: cursorY - 2 }, end: { x: margin + 270, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_cep', margin + 62, cursorY - 1, 100, 12);
  
  page.drawText('UF:', { x: margin + 280, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 300, y: cursorY - 2 }, end: { x: width - margin, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_uf', margin + 302, cursorY - 1, 50, 12);
  cursorY -= 18;

  page.drawText('CNPJ:', { x: margin, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 60, y: cursorY - 2 }, end: { x: margin + 270, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_cnpj', margin + 62, cursorY - 1, 150, 12);
  
  page.drawText('Inscrição Est:', { x: margin + 280, y: cursorY, size: fontSize, font: fontBold });
  page.drawLine({ start: { x: margin + 355, y: cursorY - 2 }, end: { x: width - margin, y: cursorY - 2 }, thickness: 1, color: rgb(0,0,0) });
  drawField('empresa_ie', margin + 357, cursorY - 1, 150, 12);
  cursorY -= 40;

  // Table Config
  const rowHeight = 16;
  const col1Width = 430;
  const col2Width = width - (margin * 2) - col1Width;
  
  // Table Header
  page.drawRectangle({
    x: margin, y: cursorY, width: width - (margin * 2), height: rowHeight,
    color: rgb(0, 0, 0)
  });
  
  page.drawText('DESCRIÇÃO DA DESPESA', { x: margin + 140, y: cursorY + 4, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('VALOR', { x: margin + col1Width + 25, y: cursorY + 4, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  
  cursorY -= rowHeight;

  // Table Rows (18 rows)
  for (let i = 0; i < 18; i++) {
    page.drawRectangle({
      x: margin, y: cursorY, width: col1Width, height: rowHeight,
      borderColor: rgb(0, 0, 0), borderWidth: 0.5
    });
    page.drawRectangle({
      x: margin + col1Width, y: cursorY, width: col2Width, height: rowHeight,
      borderColor: rgb(0, 0, 0), borderWidth: 0.5
    });

    const descName = i === 0 ? 'DESCRIÇÃO DA DESPESA' : `DESCRIÇÃO DA DESPESA_${i}`;
    const valName = i === 0 ? 'VALOR' : `VALOR_${i}`;

    drawField(descName, margin + 2, cursorY + 2, col1Width - 4, rowHeight - 4);
    
    page.drawText('R$', { x: margin + col1Width + 2, y: cursorY + 4, size: 9, font: font });
    drawField(valName, margin + col1Width + 15, cursorY + 2, col2Width - 18, rowHeight - 4);

    cursorY -= rowHeight;
  }

  // Footer Row (Total)
  page.drawRectangle({
    x: margin, y: cursorY, width: col1Width, height: rowHeight,
    color: rgb(1, 0.8, 0), borderColor: rgb(0, 0, 0), borderWidth: 0.5
  });
  page.drawText('TOTAL', { x: margin + 200, y: cursorY + 4, size: 9, font: fontBold });

  page.drawRectangle({
    x: margin + col1Width, y: cursorY, width: col2Width, height: rowHeight,
    color: rgb(1, 0.8, 0), borderColor: rgb(0, 0, 0), borderWidth: 0.5
  });
  page.drawText('R$', { x: margin + col1Width + 2, y: cursorY + 4, size: 9, font: fontBold });
  drawField('TOTAL', margin + col1Width + 15, cursorY + 2, col2Width - 18, rowHeight - 4, true);

  cursorY -= 40;

  // Observações
  page.drawText('OBSERVAÇÕES', { x: margin, y: cursorY, size: 9, font: fontBold });
  cursorY -= 15;
  page.drawRectangle({
    x: margin, y: cursorY - 60, width: width - (margin * 2), height: 70,
    borderColor: rgb(0, 0, 0), borderWidth: 1.5
  });
  page.drawText('INSERIR DADOS BANCÁRIOS', { x: margin + 5, y: cursorY, size: 9, font: fontBold });
  page.drawText('BANCO: ', { x: margin + 5, y: cursorY - 15, size: 9, font: fontBold });
  drawField('banco', margin + 45, cursorY - 15, 150, 10, true);
  
  page.drawText('AGÊNCIA: ', { x: margin + 5, y: cursorY - 30, size: 9, font: fontBold });
  drawField('agencia', margin + 55, cursorY - 30, 150, 10, true);

  page.drawText('CONTA CORRENTE: ', { x: margin + 5, y: cursorY - 45, size: 9, font: fontBold });
  drawField('conta_corrente', margin + 100, cursorY - 45, 150, 10, true);
  
  cursorY -= 80;

  // Signature Block
  page.drawText('Recebi (nome) do Fornecedor informado, os comprovantes constados na NOTA DE DÉBITO', { x: margin, y: cursorY, size: 8, font: fontBold });
  cursorY -= 60;
  
  // Signatures
  drawButtonImg('img_assinatura_responsavel', margin + 10, cursorY, 150, 50);
  drawButtonImg('img_carimbo_responsavel', margin + 180, cursorY, 150, 50);

  cursorY -= 15;
  page.drawText('ASSINATURA E CARIMBO DA AFILIADA', { x: margin, y: cursorY, size: 8, font: fontBold });


  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('./public/Modelo_Nota_Debito.pdf', pdfBytes);
  console.log('PDF Form generated at ./public/Modelo_Nota_Debito.pdf');
}

createNotaTemplate().catch(console.error);
