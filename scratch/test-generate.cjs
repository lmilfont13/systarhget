const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    Promise.all(msg.args().map(a => a.jsonValue())).then(args => {
      console.log('LOG:', ...args);
    });
  });
  page.on('pageerror', error => console.log('ERROR:', error.message));
  
  await page.goto('https://docflow-hub-ten.vercel.app/documentos', {waitUntil: 'networkidle0'});
  console.log('Page loaded');
  
  await page.evaluate(() => {
     const select = document.querySelector('select');
     select.value = select.options[1].value;
     const evt = new Event('change', { bubbles: true });
     select.dispatchEvent(evt);
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Importação Inteligente'));
    if(btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if(ta) {
       ta.value = "100,00\\nTeste";
       ta.dispatchEvent(new Event('input', {bubbles: true}));
    }
    const importBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Importar e Preencher'));
    if(importBtn) importBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
     const submit = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Gerar e Baixar PDF'));
     if(submit) submit.click();
  });
  
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
