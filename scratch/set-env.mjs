import { execSync } from 'child_process';

const envs = [
  { name: 'VITE_SUPABASE_URL', value: 'https://bunnclexcjutrltuybam.supabase.co' },
  { name: 'VITE_SUPABASE_ANON_KEY', value: 'sb_publishable_d_csjPkdDkTkS8blr8Vekw_cxdR2J6k' }
];

const targets = ['production', 'preview', 'development'];

for (const env of envs) {
  // First, remove existing env var to avoid duplicate conflicts
  for (const target of targets) {
    try {
      console.log(`Removing ${env.name} from ${target}...`);
      execSync(`npx vercel env rm ${env.name} ${target} -y`, { stdio: 'inherit' });
    } catch (e) {
      console.log(`Could not remove ${env.name} from ${target} (maybe didn't exist).`);
    }
  }

  // Then, add it back for each target
  for (const target of targets) {
    console.log(`Adding ${env.name} to ${target}...`);
    // Pass the value via stdin without any trailing newlines/args
    execSync(`npx vercel env add ${env.name} ${target}`, {
      input: env.value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  }
}

console.log('Done!');
