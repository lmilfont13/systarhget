import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
const erros = [];
pg.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
pg.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
let ok = false;
for (let i = 0; i < 24 && !ok; i++) {
  try { await pg.goto('http://localhost:4388/pedir', { waitUntil: 'load', timeout: 3000 }); ok = true; }
  catch { await new Promise((r) => setTimeout(r, 500)); }
}
if (!ok) { console.log('PREVIEW NAO SUBIU'); await b.close(); process.exit(1); }
await pg.waitForTimeout(1500);
console.log('titulo:', await pg.title());
console.log('visivel:', (await pg.locator('main').innerText()).slice(0, 200).replace(/\n/g, ' | '));
const reais = erros.filter((e) => !/supabase|Failed to load resource|net::|ERR_/i.test(e));
console.log('erros reais:', reais.length, JSON.stringify(reais.slice(0, 3)));
await pg.screenshot({ path: '/tmp/smoke/pedir.png', fullPage: true });
await b.close();
