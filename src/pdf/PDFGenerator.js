import { PDFDocument, rgb, StandardFonts, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from 'pdf-lib';
import { DEFAULT_CARIMBO } from './defaultCarimbo';

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
  static async extractFields(pdfInput) {
    try {
      let pdfBytes = pdfInput;
      if (typeof pdfInput === 'string') {
        if (pdfInput.startsWith('http')) {
           const response = await fetch(pdfInput);
           pdfBytes = await response.arrayBuffer();
        } else {
           const binaryString = atob(pdfInput.replace(/^data:application\/pdf;base64,/, ''));
           const len = binaryString.length;
           pdfBytes = new Uint8Array(len);
           for (let i = 0; i < len; i++) {
             pdfBytes[i] = binaryString.charCodeAt(i);
           }
        }
      }
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      return fields.map(field => {
        let type = 'unknown';
        if (field instanceof PDFTextField) type = 'text';
        if (field instanceof PDFCheckBox) type = 'checkbox';
        if (field instanceof PDFRadioGroup) type = 'radio';
        if (field instanceof PDFDropdown) type = 'dropdown';
        
        let y = 0;
        let x = 0;
        try {
          const widgets = field.acroField.getWidgets();
          if (widgets.length > 0) {
            const rect = widgets[0].getRectangle();
            y = rect.y;
            x = rect.x;
          }
        } catch (e) { }
  
        return {
          name: field.getName(),
          type,
          y,
          x
        };
      }).sort((a, b) => {
        if (Math.abs(b.y - a.y) > 5) return b.y - a.y;
        return a.x - b.x;
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
        const fieldNameNorm = fieldName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Procura o valor no data (correspondência exata ou parcial para campos comuns)
        let value = data[fieldName];
        
        if (value === undefined) {
          // Busca case-insensitive geral
          const matchKey = Object.keys(data).find(k => k.toLowerCase() === fieldNameLower);
          if (matchKey) value = data[matchKey];
        }

        if (value === undefined) {
          // Busca com normalização de acentos (Descrição → descricao)
          const matchKeyNorm = Object.keys(data).find(k => 
            k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === fieldNameNorm
          );
          if (matchKeyNorm) value = data[matchKeyNorm];
        }

        if (value === undefined) {
          // Busca por palavras-chave
          if (fieldNameLower.includes('data') || fieldNameLower.includes('emissao')) value = data['data_atual'] || data['data'] || data['data_emissao'];
          else if (fieldNameLower.includes('nome') || fieldNameLower.includes('promotor')) value = data['funcionario_nome'] || data['promotor'];
          else if (fieldNameLower.includes('cargo')) value = data['funcionario_cargo'] || data['cargo'];
          else if (fieldNameLower.includes('cpf')) value = data['funcionario_cpf'] || data['cpf'];
          else if (fieldNameLower.includes('empresa')) value = data['empresa_razao'] || data['empresa'];
          else if (fieldNameLower === 'text4') value = data['data_emissao'] || data['data_atual'];
          // Busca descricao_N / valor_N por índice numérico no nome do campo
          else {
            const numMatch = fieldNameLower.match(/(\d+)$/);
            if (numMatch) {
              const idx = numMatch[1];
              if (fieldNameNorm.includes('descricao') || fieldNameNorm.includes('descr') || fieldNameNorm.includes('cdc') || fieldNameNorm.includes('servico')) {
                value = data[`descricao_${idx}`] || data[`Descricao_${idx}`] || data[`DESCRICAO_${idx}`];
              } else if (fieldNameNorm.includes('valor') || fieldNameNorm.includes('vl') || fieldNameNorm.includes('preco')) {
                value = data[`valor_${idx}`] || data[`Valor_${idx}`] || data[`VALOR_${idx}`];
              }
            }
          }
        }

        if (value === undefined && fieldName.startsWith('img_') && fieldName.includes('carimbo')) {
          value = DEFAULT_CARIMBO;
        }

        if (value !== undefined) {
           try {
            // Se o campo for de imagem (convencionado pelo nome começar com img_)
            if (fieldName.startsWith('img_')) {
              let imageSource = value ? String(value) : '';
              if (!imageSource && fieldName.includes('carimbo')) {
                 imageSource = DEFAULT_CARIMBO;
              }
              
              if (imageSource) {
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
            else if (field instanceof PDFTextField) {
              // Limpamos o campo original para evitar sobreposição ou bugs do AcroForm
              field.setText('');
              
              const widgets = field.acroField.getWidgets();
              if (widgets.length > 0) {
                const widget = widgets[0];
                const rect = widget.getRectangle();
                
                // Vamos tentar achar a página do widget
                // Se não achar, desenha na primeira página por segurança
                const pages = pdfDoc.getPages();
                let targetPage = pages[0];
                
                // Desenhar o texto manualmente por cima do campo original
                // Isso ignora qualquer limitação de fonte ou overflow do PDF original!
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                targetPage.drawText(String(value), {
                  x: rect.x + 2,
                  y: rect.y + 2, // Quase na base do retângulo
                  size: 8,       // Tamanho pequeno garantido
                  font: font,
                  color: rgb(0, 0, 0),
                  maxWidth: rect.width - 4, // Faz quebra de linha se for muito longo
                });
              }
            } else if (field instanceof PDFCheckBox) {
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
      
      // Manter os campos como editáveis para garantir que os visualizadores (como Chrome e Acrobat) 
      // gerem as aparências dinamicamente, evitando textos invisíveis.

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

      // Achatar o formulário para garantir que o texto seja visível em todos os leitores de PDF
      try {
        form.flatten();
      } catch (e) {
        console.warn("Aviso ao achatar formulário:", e);
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
    // Limpa todas as tags HTML EXCETO <b>, <strong>, </b>, </strong> para mantermos negritos sob medida
    const cleanContent = content
      .replace(/<(?!b\b|strong\b|\/b\b|\/strong\b)[^>]*>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF\n<>\/a-zA-Z]/g, ''); 
    
    const rawLines = cleanContent.split('\n');
    const maxWidth = width - (margin * 2);

    for (const rawLine of rawLines) {
      // Regra de títulos inteiros em negrito (ex: AO CLIENTE, seções inteiras em maiúsculas sem tags)
      const isTitle = (rawLine.toUpperCase() === rawLine && rawLine.length > 5 && !rawLine.includes('<') && !rawLine.startsWith('REF.:'));
      const isHeaderSection = rawLine.trim().endsWith(':') && rawLine.length < 50;
      const defaultLineBold = isTitle || isHeaderSection;
      const activeSize = isTitle ? fontSize + 0.5 : fontSize;

      if (rawLine.includes('[TAB]')) {
         const parts = rawLine.split('[TAB]');
         const lText = parts[0].replace(/<\/?[^>]+(>|$)/g, "").trim();
         const rText = parts[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
         
         page.drawText(lText, { x: margin, y: cursorY, size: activeSize, font: font, color: rgb(0.05, 0.05, 0.05) });
         const rWidth = font.widthOfTextAtSize(rText, activeSize);
         page.drawText(rText, { x: width - margin - rWidth, y: cursorY, size: activeSize, font: font, color: rgb(0.05, 0.05, 0.05) });
         
         cursorY -= activeSize * 1.8;
         continue;
      }

      // Tokenização inteligente de palavras preservando a formatação de negrito no meio da linha
      const wordsWithFormat = [];
      let boldActive = false;
      
      // Quebra a linha por tags de negrito
      const parts = rawLine.split(/(<\/?[b|strong]>)/gi);
      for (const part of parts) {
        if (!part) continue;
        const partLower = part.toLowerCase();
        if (partLower === '<b>' || partLower === '<strong>') {
          boldActive = true;
        } else if (partLower === '</b>' || partLower === '</strong>') {
          boldActive = false;
        } else {
          // Quebra em palavras preservando espaços
          const words = part.split(/(\s+)/);
          for (const word of words) {
            if (word) {
              wordsWithFormat.push({ text: word, isBold: boldActive || defaultLineBold });
            }
          }
        }
      }

      if (wordsWithFormat.length === 0) {
        cursorY -= fontSize * 1.2;
        continue;
      }

      let currentLineWords = [];
      let currentLineWidth = 0;

      for (const wordObj of wordsWithFormat) {
        const activeFont = wordObj.isBold ? fontBold : font;
        const wordWidth = activeFont.widthOfTextAtSize(wordObj.text, activeSize);

        if (currentLineWidth + wordWidth > maxWidth && currentLineWords.length > 0) {
          // Desenha a linha acumulada na tela, palavra por palavra com a respectiva fonte
          let drawX = margin;
          for (const w of currentLineWords) {
            const f = w.isBold ? fontBold : font;
            page.drawText(w.text, {
              x: drawX,
              y: cursorY,
              size: activeSize,
              font: f,
              color: rgb(0.05, 0.05, 0.05),
            });
            drawX += f.widthOfTextAtSize(w.text, activeSize);
          }
          
          cursorY -= activeSize * 1.5;
          currentLineWords = [wordObj];
          currentLineWidth = wordWidth;
        } else {
          currentLineWords.push(wordObj);
          currentLineWidth += wordWidth;
        }
      }

      // Desenha as palavras restantes da linha
      if (currentLineWords.length > 0) {
        let drawX = margin;
        for (const w of currentLineWords) {
          const f = w.isBold ? fontBold : font;
          page.drawText(w.text, {
            x: drawX,
            y: cursorY,
            size: activeSize,
            font: f,
            color: rgb(0.05, 0.05, 0.05),
          });
          drawX += f.widthOfTextAtSize(w.text, activeSize);
        }
        cursorY -= activeSize * (isTitle ? 2.0 : 1.8);
      }
    }

    // 3. Inserir Carimbos e Assinatura (Forçado na mesma página se houver espaço)
    const stampImg = await embedImage(assets.carimbo_url);
    const stampRespImg = await embedImage(assets.carimbo_responsavel_url);
    const signatureImg = await embedImage(assets.assinatura_responsavel_url);
    
    if (stampImg || stampRespImg || signatureImg) {
      // Se o texto chegou perto do rodapé, move os carimbos para uma nova página
      if (cursorY < 180) { 
        page = pdfDoc.addPage([595.28, 841.89]);
        cursorY = height - margin;
      }

      // Calcula o Y dinamicamente para o carimbo ficar colado ao final do texto (margem de assinatura)
      const MAX_STAMP_WIDTH = 180;
      const MAX_STAMP_HEIGHT = 80;
      
      const getScaledDims = (img) => {
         let w = img.width;
         let h = img.height;
         const scaleW = MAX_STAMP_WIDTH / w;
         const scaleH = MAX_STAMP_HEIGHT / h;
         const scale = Math.min(scaleW, scaleH, 1);
         return { width: w * scale, height: h * scale };
      };

      let maxImgHeight = 80;
      if (stampRespImg) maxImgHeight = Math.max(maxImgHeight, getScaledDims(stampRespImg).height);
      if (stampImg) maxImgHeight = Math.max(maxImgHeight, getScaledDims(stampImg).height);
      if (signatureImg) maxImgHeight = Math.max(maxImgHeight, getScaledDims(signatureImg).height);

      let baseStampY = cursorY - maxImgHeight + 40;
      
      // Margem mínima de segurança para não chocar com o rodapé físico da folha
      if (baseStampY < 75) {
        baseStampY = 75;
      }

      if (stampRespImg) {
        const dims = getScaledDims(stampRespImg);
        page.drawImage(stampRespImg, {
          x: margin,
          y: baseStampY,
          width: dims.width,
          height: dims.height,
        });
      }

      if (stampImg) {
        const dims = getScaledDims(stampImg);
        page.drawImage(stampImg, {
          x: width - margin - dims.width,
          y: baseStampY,
          width: dims.width,
          height: dims.height,
        });
      }

      if (signatureImg) {
        const dims = getScaledDims(signatureImg);
        page.drawImage(signatureImg, {
          x: (width / 2) - (dims.width / 2),
          y: baseStampY,
          width: dims.width,
          height: dims.height,
        });
      }
      
      // Atualiza o cursorY para ficar abaixo dos carimbos (caso tenhamos mais elementos)
      cursorY = baseStampY;
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
