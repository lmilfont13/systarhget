import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing insert with dummy email...');
  const payload = { 
    nome: 'Teste de Empresa 3', 
    email_responsavel: `sem-email-${Date.now()}@docflow.local`, 
    rodape: '', 
    logo_url: '', 
    carimbo_url: '', 
    carimbo_funcionario_url: '', 
    assinatura_responsavel_url: '' 
  };
  const { data, error } = await supabase.from('empresas').insert([payload]).select();
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success:', data);
    await supabase.from('empresas').delete().eq('id', data[0].id);
  }
}

test();
