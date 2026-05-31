import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getFields() {
  // Buscar todos os templates
  const { data: templates, error } = await supabase.from('templates').select('id, nome, file_url, fields').order('nome');
  if (error) { console.error('Erro:', error); return; }

  console.log('\n=== TEMPLATES DISPONÍVEIS ===');
  templates.forEach(t => console.log(`[${t.id}] ${t.nome}`));

  // Procurar o template de nota de débito
  const notaDebito = templates.find(t => 
    (t.nome || '').toUpperCase().includes('NOTA') || 
    (t.nome || '').toUpperCase().includes('DEBITO') ||
    (t.nome || '').toUpperCase().includes('CONTRATA')
  );

  if (!notaDebito) {
    console.log('\nNenhum template de nota/débito encontrado. Listando campos de todos:');
    for (const t of templates) {
      if (t.fields && t.fields.length > 0) {
        console.log(`\n[${t.nome}] campos:`, t.fields.map(f => f.name || f).join(', '));
      }
    }
    return;
  }

  console.log(`\n=== CAMPOS DO TEMPLATE: ${notaDebito.nome} ===`);
  if (notaDebito.fields && notaDebito.fields.length > 0) {
    console.log('Campos (do banco):', JSON.stringify(notaDebito.fields, null, 2));
  }

  // Se tem file_url, tentar extrair campos do PDF
  let base64 = notaDebito.file_url;
  if (base64 && base64.startsWith('local:')) {
    console.log('PDF armazenado localmente (localStorage), não é possível ler via Node.');
    return;
  }

  if (base64) {
    try {
      const cleanB64 = base64.includes(',') ? base64.split(',')[1] : base64;
      const binaryString = atob(cleanB64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      console.log(`\n=== CAMPOS REAIS DO PDF (${fields.length} campos) ===`);
      fields.forEach(f => console.log(`  Campo: "${f.getName()}" [${f.constructor.name}]`));
    } catch(e) {
      console.error('Erro ao ler PDF:', e.message);
    }
  } else {
    console.log('Sem file_url no template.');
  }
}

// Polyfill atob para Node
import { Buffer } from 'buffer';
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

getFields();
