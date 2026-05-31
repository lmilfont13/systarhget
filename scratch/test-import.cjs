const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('https://docflow-hub-ten.vercel.app/documentos', {waitUntil: 'networkidle0'});
  console.log('Page loaded');
  
  await page.click('.bg-\\[\\#8A2BE2\\]').catch(e => console.log('Btn 1 error', e.message));
  
  await page.waitForSelector('textarea', {timeout: 3000}).catch(() => console.log('No textarea'));
  await page.type('textarea', '100,00\\nTeste');
  
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Importar e Preencher')) {
      await btn.click();
      console.log('Clicked Importar');
    }
  }
  
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Gerar e Baixar PDF')) {
      await btn.click();
      console.log('Clicked Gerar');
    }
  }
  
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
