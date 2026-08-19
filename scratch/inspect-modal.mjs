import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/empresas');
  await page.waitForTimeout(3000);

  // Click edit button of the first row
  const editBtn = page.locator('button.hover\\:text-indigo-600').first();
  await editBtn.click();
  await page.waitForTimeout(1500);

  // Print the innerHTML of the Logomarca container
  const logoHTML = await page.evaluate(() => {
    // Find the first column in the grid
    const label = Array.from(document.querySelectorAll('label')).find(el => el.textContent === 'Logomarca');
    if (label) {
      return label.parentElement.innerHTML;
    }
    return 'Label not found';
  });

  console.log("=== LOGOMARCA CONTAINER HTML ===");
  console.log(logoHTML);
  console.log("================================");

  await browser.close();
}

run().catch(console.error);
