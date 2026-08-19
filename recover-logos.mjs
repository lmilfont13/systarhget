import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function recoverImages() {
  const { data: empresas, error } = await supabase.from('empresas').select('*');
  if (error) {
    console.error('Error fetching empresas:', error);
    return;
  }

  const fields = ['logo_url', 'carimbo_url', 'carimbo_funcionario_url', 'assinatura_responsavel_url'];
  
  for (const empresa of empresas) {
    let updated = false;
    const updatePayload = {};

    for (const field of fields) {
      const url = empresa[field];
      if (url && url.startsWith('https://bunnclexcjutrltuybam.supabase.co/storage/v1/object/public/')) {
        console.log(`Recovering ${field} for ${empresa.nome}...`);
        try {
          const parts = url.split('/public/')[1].split('/');
          const bucket = parts[0];
          const filePath = parts.slice(1).join('/');
          
          const { data: signedData, error: signError } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60);
          if (signError) throw signError;
          
          const res = await fetch(signedData.signedUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = `data:${res.headers.get('content-type') || 'image/jpeg'};base64,${buffer.toString('base64')}`;
          
          updatePayload[field] = base64;
          updated = true;
          console.log(`Converted ${field} to base64 (${base64.length} bytes).`);
        } catch (err) {
          console.error(`Failed to recover ${field} for ${empresa.nome}:`, err.message);
        }
      }
    }

    if (updated) {
      const { error: updateError } = await supabase.from('empresas').update(updatePayload).eq('id', empresa.id);
      if (updateError) {
        console.error(`Failed to save recovered images for ${empresa.nome}:`, updateError);
      } else {
        console.log(`Successfully saved recovered images for ${empresa.nome}`);
      }
    }
  }
}

recoverImages().then(() => console.log('Done'));
