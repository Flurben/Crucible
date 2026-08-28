import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  await page.goto('http://157.173.212.62:2567/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Play')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));

  const buttons2 = await page.$$('button');
  for (const b of buttons2) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Medium')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 3000));

  const rootHTML = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'no root');
  console.log('ROOT HTML:', rootHTML.substring(0, 5000));

  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});