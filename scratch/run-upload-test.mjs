import { chromium } from 'playwright';

async function run() {
  console.log("Iniciando navegador...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    logs.push(`[error] PAGE ERROR: ${err.message}`);
  });

  console.log("Navegando para http://localhost:5173/empresas...");
  await page.goto('http://localhost:5173/empresas');
  await page.waitForTimeout(3000);

  // Click edit button for TAGG TRADE (which is the 5th row)
  // Let's click the edit button that belongs to TAGG TRADE
  const rowLocator = page.locator('li:has-text("TAGG TRADE")');
  const editBtn = rowLocator.locator('button.hover\\:text-indigo-600');
  
  console.log("Abrindo modal de edição para TAGG TRADE...");
  await editBtn.click();
  await page.waitForTimeout(1500);

  console.log("Clicando no botão Salvar Empresa...");
  const saveBtn = page.locator('button:has-text("Salvar Empresa")');
  await saveBtn.click();
  
  await page.waitForTimeout(3000);

  console.log("=== LOGS DO CONSOLE ===");
  console.log(logs.join('\n'));
  console.log("========================");

  await browser.close();
}

run().catch(console.error);
