import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const logs = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('LOG:', text);
  });
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });

  console.log('--- Navigating to game ---');
  await page.goto('http://157.173.212.62:2567/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Check page content
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('--- Page body text ---');
  console.log(bodyText.substring(0, 500));

  // Check for error overlay
  const errorOverlay = await page.evaluate(() => {
    const el = document.getElementById('error-overlay');
    return el ? el.innerText : null;
  });
  if (errorOverlay) {
    console.log('--- ERROR OVERLAY ---');
    console.log(errorOverlay);
  }

  // Click Play button
  const buttons = await page.$$('button');
  let foundPlay = false;
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    console.log('Found button:', text);
    if (text && text.includes('Play')) {
      console.log('>>> Clicking Play');
      await b.click();
      foundPlay = true;
      break;
    }
  }

  if (!foundPlay) {
    console.log('NO PLAY BUTTON FOUND');
    await browser.close();
    process.exit(1);
  }

  await new Promise(r => setTimeout(r, 1500));

  // Now look for AI buttons
  const buttons2 = await page.$$('button');
  for (const b of buttons2) {
    const text = await page.evaluate(el => el.textContent, b);
    console.log('Found button:', text);
  }

  // Click Medium AI
  let foundAi = false;
  for (const b of buttons2) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Medium')) {
      console.log('>>> Clicking Medium AI');
      await b.click();
      foundAi = true;
      break;
    }
  }

  if (!foundAi) {
    // Try any AI button
    for (const b of buttons2) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && (text.includes('AI') || text.includes('Easy'))) {
        console.log('>>> Clicking:', text);
        await b.click();
        foundAi = true;
        break;
      }
    }
  }

  // Wait for game to load
  await new Promise(r => setTimeout(r, 3000));

  // Check error overlay again
  const errorOverlay2 = await page.evaluate(() => {
    const el = document.getElementById('error-overlay');
    return el ? el.innerText : null;
  });
  if (errorOverlay2) {
    console.log('--- ERROR OVERLAY (after game start) ---');
    console.log(errorOverlay2);
  }

  // Check if canvas exists
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'NO CANVAS FOUND';
    return {
      width: canvas.width,
      height: canvas.height,
      display: canvas.style.display,
      visible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    };
  });
  console.log('--- Canvas Info ---');
  console.log(JSON.stringify(canvasInfo, null, 2));

  // Check what's on screen - is scene rendered?
  const screenCheck = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas' };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'No context' };
    
    // Sample some pixels
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return { error: 'Canvas dimensions are 0', w, h };
    
    const samples = [];
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      const d = ctx.getImageData(x, y, 1, 1).data;
      samples.push({ x, y, r: d[0], g: d[1], b: d[2], a: d[3] });
    }
    return { w, h, samples };
  });
  console.log('--- Screen Check (pixel samples) ---');
  console.log(JSON.stringify(screenCheck, null, 2));

  // Check for any DOM child elements that might be the HUD
  const domInfo = await page.evaluate(() => {
    const root = document.getElementById('root');
    if (!root) return 'No root';
    return root.innerHTML.substring(0, 2000);
  });
  console.log('--- Root innerHTML ---');
  console.log(domInfo);

  // Log all console errors
  if (errors.length > 0) {
    console.log('=== ALL PAGE ERRORS ===');
    errors.forEach(e => console.log(e));
  }

  console.log('=== ALL CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));

  await browser.close();
  console.log('--- Done ---');
})().catch(e => {
  console.error('Test script error:', e);
  process.exit(1);
});
