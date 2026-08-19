import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Fetch TAGG TRADE details first
  const { data: companies, error: fetchErr } = await supabase
    .from('empresas')
    .select('*')
    .eq('nome', 'TAGG TRADE');

  if (fetchErr) {
    console.error('Error fetching company:', fetchErr);
    return;
  }

  if (!companies || companies.length === 0) {
    console.log('Company not found.');
    return;
  }

  const taggTrade = companies[0];
  console.log('TAGG TRADE found:', taggTrade.id);

  // Prepare payload exactly as Empresas.jsx does when email is empty and logo/stamps are unchanged
  const payload = {
    nome: 'TAGG TRADE',
    email_responsavel: `sem-email-${Date.now()}@docflow.local`,
    rodape: 'Av. Afrânio Peixoto, 401 – Butantã – São Paulo – SP / Cep. 05507-000',
    logo_url: taggTrade.logo_url,
    carimbo_url: taggTrade.carimbo_url,
    carimbo_funcionario_url: taggTrade.carimbo_funcionario_url,
    assinatura_responsavel_url: taggTrade.assinatura_responsavel_url
  };

  console.log('Updating...');
  const { data, error } = await supabase
    .from('empresas')
    .update(payload)
    .eq('id', taggTrade.id)
    .select();

  if (error) {
    console.error('=== SUPABASE UPDATE ERROR ===');
    console.error(error);
  } else {
    console.log('Update success!', data);
  }
}

run();
