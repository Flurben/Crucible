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
    if (msg.type() === 'error') console.log('LOG ERROR:', text);
  });
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });

  console.log('--- Navigating to LOCAL game ---');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Check initial page
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('--- Initial page text ---');
  console.log(bodyText.substring(0, 300));

  // Click Play
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Play')) {
      console.log('>>> Clicking Play');
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1500));

  // Click Medium AI
  const buttons2 = await page.$$('button');
  for (const b of buttons2) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Medium')) {
      console.log('>>> Clicking Medium AI');
      await b.click();
      break;
    }
  }

  // Wait for game to load
  await new Promise(r => setTimeout(r, 3000));

  // Check error overlay
  const errorOverlay = await page.evaluate(() => {
    const el = document.getElementById('error-overlay');
    return el ? el.innerText : null;
  });
  if (errorOverlay) {
    console.log('--- ERROR OVERLAY ---');
    console.log(errorOverlay);
    await browser.close();
    process.exit(1);
  } else {
    console.log('✓ No error overlay');
  }

  // Check canvas
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'NO CANVAS FOUND';
    return {
      width: canvas.width,
      height: canvas.height,
      visible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0,
    };
  });
  console.log('--- Canvas Info ---');
  console.log(JSON.stringify(canvasInfo, null, 2));

  // Sample pixels
  const screenCheck = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas' };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'No context' };
    
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return { error: 'Canvas dimensions are 0', w, h };
    
    const samples = [];
    const points = [
      [w/2, h/2],
      [50, 50],
      [w-50, 50],
      [50, h-50],
      [w-50, h-50],
    ];
    
    for (const [x, y] of points) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      samples.push({ x, y, r: d[0], g: d[1], b: d[2], a: d[3] });
    }
    return { w, h, samples };
  });
  console.log('--- Screen Check (pixel samples) ---');
  console.log(JSON.stringify(screenCheck, null, 2));

  // Test camera pan with mouse move
  console.log('--- Testing camera pan (mouse to right edge) ---');
  const canvas = await page.$('canvas');
  await canvas.hover();
  await page.mouse.move(1200, 360);
  await new Promise(r => setTimeout(r, 1500));
  
  // Sample center again
  const screenCheck2 = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas' };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'No context' };
    
    const w = canvas.width;
    const h = canvas.height;
    const d = ctx.getImageData(w/2, h/2, 1, 1).data;
    return { center: { r: d[0], g: d[1], b: d[2], a: d[3] } };
  });
  console.log('--- Center pixel after pan ---');
  console.log(JSON.stringify(screenCheck2, null, 2));

  // Test keyboard input
  await page.keyboard.down('ArrowRight');
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.up('ArrowRight');
  await new Promise(r => setTimeout(r, 500));

  // Test unit selection - click near center
  await page.mouse.click(640, 360);
  await new Promise(r => setTimeout(r, 500));

  // Check for errors
  if (errors.length > 0) {
    console.log('=== ALL PAGE ERRORS ===');
    errors.forEach(e => console.log(e));
  } else {
    console.log('✓ No page errors');
  }

  // Check HUD
  const rootHTML = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'no root');
  console.log('--- HUD present ---');
  console.log(rootHTML.substring(0, 1000));

  await browser.close();
  console.log('--- DONE: Local game test complete ---');
})().catch(e => {
  console.error('Test script error:', e);
  process.exit(1);
});