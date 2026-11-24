const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw new Error('Run these input playtests on the GitHub-hosted Linux runner.');
const { chromium } = require('playwright-core');
const root = 'http://127.0.0.1:8080/';
async function testDevice(browser, mobile) {
  const context = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 800 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root + '#training/combos');
    const text = id => page.locator('#' + id).innerText();
    const activate = id => mobile ? page.locator('#' + id).tap() : page.locator('#' + id).click();
    const ticks = ms => page.clock.runFor(ms);
    await ticks(4100);
    assert.match(await text('combo-summary'), /4 hits · 19%/);
    await activate('combo-slow');
    await page.selectOption('#combo-reply','away');
    await ticks(2100);
    assert.match(await text('combo-summary'), /2 hits · 10%/);
    assert.match(await text('combo-previous'), /Standing at 0% · 4 hits · 19%/);
    assert.match(await text('combo-latest'), /2 shifts/);
    await page.selectOption('#combo-reply','guard');
    await activate('combo-late');
    await ticks(2100);
    assert.match(await text('combo-summary'), /1 hit · 4%/);
    assert.match(await text('combo-latest'), /blocked · 16f opening/);
    await page.selectOption('#combo-reply','stand');
    await activate('combo-record');
    assert.match(await text('combo-summary'), /Ready to record/);
    async function jab() {
      if (mobile) await page.locator('[data-touch="attack"]').tap();
      else await page.keyboard.press('j');
    }
    await jab();
    await ticks(500);
    await jab();
    await ticks(3200);
    assert.match(await text('combo-summary'), /2 hits/);
    const original = await text('combo-latest');
    await activate('combo-replay');
    await ticks(3700);
    assert.equal(await text('combo-latest'), original);
    await page.selectOption('#combo-reply','guard');
    await ticks(3700);
    assert.match(await text('combo-summary'), /1 hit/);
    assert.match(await text('combo-latest'), /blocked/);
    await page.locator('#combo-history summary').click();
    assert.equal(await page.locator('#combo-list li').count(),2);
    if (mobile) {
      const box = await page.locator('#combo-readout').boundingBox();
      assert(box.width <= 390 && box.x >= 0);
    }
    await activate('reset-training');
    assert(await page.locator('#combo-readout').isHidden());
    await activate('combo-training');
    assert(await page.locator('#combo-record').isVisible());
    assert(await page.locator('#combo-replay').isDisabled());
    assert.deepEqual(errors, []);
    console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed examples, recording, replay, reply changes and free-training reset.');
  } finally {
    await context.close();
  }
}
async function main() {
  const executablePath = execFileSync('which', ['google-chrome'], { encoding: 'utf8' }).trim();
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    await testDevice(browser, false);
    await testDevice(browser, true);
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
