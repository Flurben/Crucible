import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:2567/');

  await new Promise(r => setTimeout(r, 1000));
  
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Play')) {
      console.log('Clicking Play');
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));
  
  const buttons2 = await page.$$('button');
  for (const b of buttons2) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('AI') && text.includes('Medium')) {
      console.log('Clicking Medium AI');
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();