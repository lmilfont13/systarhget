const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    Promise.all(msg.args().map(a => a.jsonValue())).then(args => {
      console.log('BROWSER:', ...args);
    });
  });
  
  await page.goto('https://docflow-hub-ten.vercel.app/documentos', {waitUntil: 'networkidle0'});
  
  await page.evaluate(() => {
     window.traceLog = [];
     const oldFetch = window.fetch;
     window.fetch = async (...args) => {
        console.log("FETCHING", args[0]);
        return oldFetch(...args);
     };
  });
  
  // Select first template
  await page.evaluate(() => {
     const select = document.querySelector('select');
     select.value = select.options[1].value;
     select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if(!ta) {
       // Open modal
       const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Importação Inteligente'));
       if(btn) btn.click();
    }
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if(ta) {
       ta.value = "100,00\\nTeste";
       ta.dispatchEvent(new Event('input', {bubbles: true}));
       const importBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Importar e Preencher'));
       if(importBtn) importBtn.click();
    }
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
     console.log('CLICKING SUBMIT');
     const submit = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Gerar e Baixar PDF'));
     if(submit) submit.click();
  });
  
  await new Promise(r => setTimeout(r, 8000));
  await browser.close();
})();
