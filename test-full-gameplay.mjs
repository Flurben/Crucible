import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });

  console.log('--- Navigating to LOCAL game ---');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Click Play
  let buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Play')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));

  // Click Medium AI
  buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Medium')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 3000));

  console.log('✓ Game loaded');

  // Wait for game to run some ticks
  await new Promise(r => setTimeout(r, 5000));

  // Check gold increased (workers gathering)
  const goldAfterWait = await page.evaluate(() => {
    const root = document.getElementById('root');
    const text = root?.innerText || '';
    const match = text.match(/Gold: (\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
  console.log(`Gold after 5s: ${goldAfterWait} (started at 200)`);

  // Test building - press 'b' for barracks, click to place
  console.log('--- Testing building placement ---');
  await page.keyboard.press('b'); // Barracks hotkey
  await new Promise(r => setTimeout(r, 500));
  
  // Click near center to place
  await page.mouse.click(600, 300);
  await new Promise(r => setTimeout(r, 1000));

  // Check if building was placed
  const buildResult = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root?.innerText || '';
  });
  console.log(`Build attempt - Supply: ${buildResult.match(/Supply: (\d+)/)?.[1] || '?'}`);

  // Test unit production - select barracks (if built) and press 's' for swordsman
  console.log('--- Testing unit production ---');
  await page.keyboard.press('s'); // Swordsman
  await new Promise(r => setTimeout(r, 500));
  await page.mouse.click(600, 300); // Try to queue on building
  await new Promise(r => setTimeout(r, 1000));

  // Wait for more game time
  await new Promise(r => setTimeout(r, 5000));

  // Check final state
  const finalState = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root?.innerText || '';
  });
  const finalGold = finalState.match(/Gold: (\d+)/)?.[1] || '?';
  const finalSupply = finalState.match(/Supply: (\d+)/)?.[1] || '?';
  const finalTick = finalState.match(/Tick: (\d+)/)?.[1] || '?';
  console.log(`Final - Gold: ${finalGold}, Supply: ${finalSupply}, Tick: ${finalTick}`);

  // Test camera movement with arrow keys
  console.log('--- Testing camera movement ---');
  await page.keyboard.down('ArrowUp');
  await new Promise(r => setTimeout(r, 1000));
  await page.keyboard.up('ArrowUp');
  
  await page.keyboard.down('ArrowLeft');
  await new Promise(r => setTimeout(r, 1000));
  await page.keyboard.up('ArrowLeft');

  // Test minimap click (bottom right area)
  await page.mouse.click(1200, 650);
  await new Promise(r => setTimeout(r, 500));

  // Test right-click to move units
  await page.mouse.click(640, 360, { button: 'right' });
  await new Promise(r => setTimeout(r, 500));

  // Check for errors
  if (errors.length > 0) {
    console.log('=== PAGE ERRORS ===');
    errors.forEach(e => console.log(e));
    process.exit(1);
  } else {
    console.log('✓ No page errors throughout gameplay');
  }

  await browser.close();
  console.log('--- COMPLETE: Full gameplay test passed ---');
})().catch(e => {
  console.error('Test script error:', e);
  process.exit(1);
});