import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * PDFGenerator.js
 * Módulo central para manipulação e preenchimento de PDFs utilizando pdf-lib.
 */

export class PDFGenerator {
  /**
   * Extrai os campos de formulário (AcroForms) de um PDF.
   * @param {Uint8Array | ArrayBuffer} pdfBytes 
   * @returns {Array<{ name: string, type: string }>}
   */
  static async extractFields(pdfBytes) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      return fields.map(field => {
        let type = 'unknown';
        if (field.constructor.name === 'PDFTextField') type = 'text';
        if (field.constructor.name === 'PDFCheckBox') type = 'checkbox';
        if (field.constructor.name === 'PDFRadioGroup') type = 'radio';
        if (field.constructor.name === 'PDFDropdown') type = 'dropdown';
        
        return {
          name: field.getName(),
          type
        };
      });
    } catch (error) {
      console.error("Erro ao extrair campos do PDF:", error);
      throw new Error("Não foi possível ler os campos do PDF. O arquivo pode estar corrompido ou protegido.");
    }
  }

  /**
   * Preenche um PDF com os dados fornecidos.
   * Pode preencher tanto campos nativos (AcroForms) quanto coordenadas manuais (futuro).
   * @param {Uint8Array | ArrayBuffer} pdfBytes - Arquivo PDF original
   * @param {Object} data - Objeto chave/valor com os dados a preencher
   * @param {Array} customCoordinates - (Opcional) Array com { text, x, y, pageIndex } para inserir texto solto
   * @returns {Promise<string>} O Blob URL do novo PDF preenchido
   */
  static async fillDocument(pdfBytes, data, customCoordinates = []) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // 1. Tentar preencher campos AcroForm nativos
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      console.log('--- CAMPOS DETECTADOS NO PDF ---');
      fields.forEach(f => console.log(`Campo: ${f.getName()}`));
      console.log('-------------------------------');
      
      for (const field of fields) {
        const fieldName = field.getName();
        const fieldNameLower = fieldName.toLowerCase();
        
        // Procura o valor no data (correspondência exata ou parcial para campos comuns)
        let value = data[fieldName];
        
        if (value === undefined) {
          // Tenta encontrar por palavras-chave se não houver match exato
          if (fieldNameLower.includes('data') || fieldNameLower.includes('emissao')) value = data['data_atual'] || data['data'] || data['data_emissao'];
          else if (fieldNameLower.includes('nome') || fieldNameLower.includes('promotor')) value = data['funcionario_nome'] || data['promotor'];
          else if (fieldNameLower.includes('cargo')) value = data['funcionario_cargo'] || data['cargo'];
          else if (fieldNameLower.includes('cpf')) value = data['funcionario_cpf'] || data['cpf'];
          else if (fieldNameLower.includes('empresa')) value = data['empresa_razao'] || data['empresa'];
        }

        if (value !== undefined) {
          try {
            // Se o campo for de imagem (convencionado pelo nome começar com img_)
            if (fieldName.startsWith('img_') && value) {
              const imageSource = String(value);
              let imageBytes;

              if (imageSource.startsWith('http')) {
                // É uma URL, precisamos baixar
                const response = await fetch(imageSource);
                const arrayBuffer = await response.arrayBuffer();
                imageBytes = new Uint8Array(arrayBuffer);
              } else {
                // Assume que é base64
                const cleanBase64 = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;
                const binaryString = atob(cleanBase64);
                imageBytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  imageBytes[i] = binaryString.charCodeAt(i);
                }
              }
              
              let image;
              try {
                // Tenta carregar como PNG primeiro
                image = await pdfDoc.embedPng(imageBytes);
              } catch (e) {
                // Se falhar, tenta como JPG
                image = await pdfDoc.embedJpg(imageBytes);
              }

              // Pega a localização do campo no PDF
              const widgets = field.acroField.getWidgets();
              if (widgets && widgets.length > 0) {
                const rect = widgets[0].getRectangle();
                const pages = pdfDoc.getPages();
                const page = pages[0]; 

                page.drawImage(image, {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                });
                
                field.acroField.setFlags(2); // Hidden flag
              }
            } 
            // Campos de texto normais
            else if (field.constructor.name === 'PDFTextField') {
              field.setText(String(value));
              field.setFontSize(9); // Força uma fonte menor para evitar cortes
            } else if (field.constructor.name === 'PDFCheckBox') {
              if (value === true || value === 'true' || value === 'Sim') {
                field.check();
              } else {
                field.uncheck();
              }
            }
          } catch (e) {
            console.error(`Erro ao preencher campo ${fieldName}:`, e);
          }
        }
      }
      
      // Achata o formulário para evitar edições futuras e exibir o texto puramente
      form.flatten();

      // 2. Preencher textos por coordenadas (caso o usuário tenha mapeado X/Y na tela Templates)
      if (customCoordinates && customCoordinates.length > 0) {
        const pages = pdfDoc.getPages();
        for (const coord of customCoordinates) {
          const page = pages[coord.pageIndex || 0];
          if (page) {
            // Se o dado (valor) existir, escreve. Senão, tenta escrever o texto literal
            const textToDraw = data[coord.key] || coord.text || '';
            if (textToDraw) {
              page.drawText(String(textToDraw), {
                x: coord.x,
                y: page.getHeight() - coord.y, // Ajuste caso a origem HTML seja diferente do PDF (que é inferior esquerdo)
                size: coord.size || 12,
                color: rgb(0, 0, 0),
              });
            }
          }
        }
      }

      // 3. Salvar o documento preenchido
      const pdfBytesModified = await pdfDoc.save();
      return new Blob([pdfBytesModified], { type: 'application/pdf' });
      
    } catch (error) {
      console.error("Erro na geração do PDF:", error);
      throw new Error("Falha ao gerar o documento PDF final. Verifique os dados fornecidos.");
    }
  }

  static async generateFromText(content, assets = {}) {
    const pdfDoc = await PDFDocument.create();
    // A4: [595.28, 841.89]
    let page = pdfDoc.addPage([595.28, 841.89]);
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 60;
    const { width, height } = page.getSize();
    const fontSize = 10.5;
    
    let cursorY = height - margin;

    // Helper para carregar imagens (URL ou Base64)
    const embedImage = async (url) => {
      if (!url) return null;
      try {
        let imageBytes;
        if (typeof url === 'string' && url.startsWith('data:')) {
          const base64 = url.split(',')[1];
          const binaryString = atob(base64);
          imageBytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        } else {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          imageBytes = await response.arrayBuffer();
        }

        try {
          return await pdfDoc.embedPng(imageBytes);
        } catch (e) {
          try {
            return await pdfDoc.embedJpg(imageBytes);
          } catch (e2) {
            console.error('Falha ao embutir imagem (PNG e JPG):', e2);
            return null;
          }
        }
      } catch (e) {
        console.error('Erro geral ao embutir imagem:', e);
        return null;
      }
    };
    
    // 1. Inserir Logo e Data
    const logoImg = await embedImage(assets.logo_url);
    if (logoImg) {
      const dims = logoImg.scale(0.65); // Aumentado significativamente
      page.drawImage(logoImg, {
        x: margin,
        y: height - margin - dims.height,
        width: dims.width,
        height: dims.height,
      });
    }

    // Data (Topo Direita)
    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const localidade = "Fortaleza"; 
    const headerDate = `${localidade}, ${dataAtual}`;
    const headerDateWidth = font.widthOfTextAtSize(headerDate, 10);
    page.drawText(headerDate, {
      x: width - margin - headerDateWidth,
      y: height - margin - 10,
      size: 10,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    cursorY = height - margin - 120;

    // 2. Inserir Conteúdo (Texto)
    const cleanContent = content
      .replace(/<[^>]*>/g, '') 
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ''); 
    
    const rawLines = cleanContent.split('\n');
    const maxWidth = width - (margin * 2);

    for (const rawLine of rawLines) {
      if (cursorY < margin + 150) { 
        // No single page mode, we don't add pages, but we could add a check if needed.
        // For now, we follow user request for single page.
      }
      
      const isTitle = rawLine.startsWith('AO ') || rawLine.startsWith('Ref.:') || (rawLine.toUpperCase() === rawLine && rawLine.length > 5);
      const isHeaderSection = rawLine.trim().endsWith(':') && rawLine.length < 50;
      const activeFont = (isTitle || isHeaderSection) ? fontBold : font;
      const activeSize = isTitle ? fontSize + 0.5 : fontSize;

      const words = rawLine.trim().split(' ');
      if (words.length === 0 || rawLine.trim() === '') {
        cursorY -= fontSize * 1.2;
        continue;
      }

      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = activeFont.widthOfTextAtSize(testLine, activeSize);
        
        if (testWidth > maxWidth && currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y: cursorY,
            size: activeSize,
            font: activeFont,
            color: rgb(0.05, 0.05, 0.05),
          });
          cursorY -= activeSize * 1.5;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y: cursorY,
          size: activeSize,
          font: activeFont,
          color: rgb(0.05, 0.05, 0.05),
        });
        cursorY -= activeSize * (isTitle ? 2.0 : 1.8);
      }
    }

    // 3. Inserir Carimbos (Forçado na mesma página se houver espaço)
    const stampImg = await embedImage(assets.carimbo_url);
    const stampRespImg = await embedImage(assets.carimbo_responsavel_url);
    
    if (stampImg || stampRespImg) {
      // Se o texto chegou muito perto do rodapé, move os carimbos para uma nova página
      if (cursorY < 250) { 
        page = pdfDoc.addPage([595.28, 841.89]);
        cursorY = height - margin;
      }

      const baseStampY = 120; 

      if (stampRespImg) {
        const dims = stampRespImg.scale(0.55); // Ajustado para não ser gigante
        page.drawImage(stampRespImg, {
          x: margin,
          y: baseStampY,
          width: dims.width,
          height: dims.height,
        });
      }

      if (stampImg) {
        const dims = stampImg.scale(0.55);
        page.drawImage(stampImg, {
          x: width - margin - dims.width,
          y: baseStampY,
          width: dims.width,
          height: dims.height,
        });
      }
    }

    // 4. Rodapé Dinâmico
    const footerText = assets.footer_text || "Documento gerado pelo DocFlow Hub";
    const rWidth = font.widthOfTextAtSize(footerText, 7);
    page.drawText(footerText, { 
      x: width/2 - rWidth/2, 
      y: 25, 
      size: 7, 
      font: font, 
      color: rgb(0.4, 0.4, 0.4) 
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  /**
   * Gera um PDF de Preview onde cada campo de texto é preenchido com seu próprio nome.
   * Isso ajuda o usuário a visualizar onde cada campo confuso (ex: "text_4hnqw") está localizado na folha.
   * @param {Uint8Array} pdfBytes 
   * @returns {Promise<string>} O Blob URL do PDF de preview
   */
  static async generatePreviewWithFieldNames(pdfBytes) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    fields.forEach(field => {
      const name = field.getName();
      try {
        if (field.constructor.name === 'PDFTextField') {
          // Preenche o campo com o nome dele mesmo e um fundo clarinho
          field.setText(name);
        } else if (field.constructor.name === 'PDFCheckBox') {
          field.check(); // Marca o checkbox para dar destaque visual
        }
      } catch (e) {
        console.warn(`Não foi possível preencher o preview do campo ${name}`, e);
      }
    });

    // Achatar é fundamental! Sem isso, muitos leitores de PDF (como os de navegadores)
    // não renderizam o texto dos campos que não foram interagidos.
    form.flatten();

    const pdfBytesModified = await pdfDoc.save();
    
    // Retorna a URL do blob para carregar instantaneamente no iframe sem travar o navegador
    const blob = new Blob([pdfBytesModified], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }
}
