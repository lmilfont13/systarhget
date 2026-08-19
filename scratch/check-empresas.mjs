import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseAnonKey = 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('empresas').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(d => {
      console.log(`Empresa: ${d.nome}`);
      console.log(`- logo_url: ${d.logo_url ? d.logo_url.substring(0, 100) + '...' : '(null)'}`);
      console.log(`- carimbo_url: ${d.carimbo_url ? d.carimbo_url.substring(0, 100) + '...' : '(null)'}`);
      console.log(`- carimbo_funcionario_url: ${d.carimbo_funcionario_url ? d.carimbo_funcionario_url.substring(0, 100) + '...' : '(null)'}`);
      console.log(`- assinatura_responsavel_url: ${d.assinatura_responsavel_url ? d.assinatura_responsavel_url.substring(0, 100) + '...' : '(null)'}`);
    });
  }
}

check();
