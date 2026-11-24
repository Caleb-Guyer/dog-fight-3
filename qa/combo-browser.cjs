const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw new Error('Run these input playtests on the GitHub-hosted Linux runner.');
const { chromium } = require('playwright-core');
const root = 'http://127.0.0.1:8080/';
async function testEdges(page, mobile) {
  await page.goto(root + '#training/edges');
  const status = page.locator('#edge-status');
  const activate = id => mobile ? page.locator('#' + id).tap() : page.locator('#' + id).click();
  const session = mobile && await page.context().newCDPSession(page);
  const touch = (type, touchPoints = []) => session.send('Input.dispatchTouchEvent', {type, touchPoints});
  async function point(id, name) {
    const el = page.locator('[data-touch="' + name + '"]');
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    assert(box && box.width > 0, name);
    return {id, x:box.x + box.width/2, y:box.y + box.height/2};
  }
  async function waitFor(result, limit = 100) {
    for (let i = 0; i < limit; i++) {
      if (await status.getAttribute('data-result') === result) return;
      await page.clock.runFor(32);
    }
    assert.fail('Expected ' + result + ', saw "' + await status.innerText() + '" (' + await page.locator('#recovery-tip').innerText() + ')');
  }
  async function attack(down = false) {
    if (!mobile) {
      if (down) await page.keyboard.down('s');
      await page.keyboard.press('j');
      if (down) await page.keyboard.up('s');
    } else if (down) {
      const d = await point(1,'down'), a = await point(2,'attack');
      await touch('touchStart',[d]);
      await touch('touchStart',[d,a]);
      await touch('touchEnd');
    } else await page.locator('[data-touch="attack"]').tap();
  }
  if (mobile) {
    const center = await point(1, 'neutral'), right = await point(1, 'right');
    await touch('touchStart', [center]);
    await touch('touchMove', [right]);
  } else {
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('d');
  }
  await waitFor('teeter');
  assert.match(await status.innerText(), /Balanced/);
  await waitFor('edgeCue');
  if (mobile) await touch('touchEnd');
  else { await page.keyboard.up('d'); await page.keyboard.up('ShiftLeft'); }
  await attack(true);
  await waitFor('covered');
  assert.match(await status.innerText(), /caught the ledge jump/);
  await activate('edge-tip');
  await attack();
  await waitFor('edgeLand');
  assert.match(await status.innerText(), /9f landing/);
  await waitFor('edgeCancel');
  assert.match(await status.innerText(), /6f saved/);
  await attack(true);
  await waitFor('followup');
  assert.match(await status.innerText(), /Belly Drop connected · 6f saved/);
  await activate('edge-deep');
  await activate('edge-side');
  assert.match(await status.innerText(), /Drifting left/);
  await activate('edge-slow');
  await attack();
  await waitFor('settled');
  await activate('reset-training');
  assert(await status.isHidden());
  await activate('edge-training');
  assert(await page.locator('#edge-tip').isVisible());
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed ledge walk, timed low tilt, edge cancel, follow-up and mirrored deep landing.');
  await page.goto(root + '#training/ledge-catch');
  assert.match(await status.innerText(), /Short recovery/);
  await attack();
  await waitFor('ledge');
  assert.match(await status.innerText(), /0% · 15f protected/);
  await attack(true);
  await waitFor('tooEarly');
  assert.match(await status.innerText(), /protection left/);
  await activate('edge-longCatch');
  await activate('edge-side');
  await attack();
  await waitFor('ledge');
  assert.match(await status.innerText(), /0% · 34f protected/);
  await waitFor('edgeOpen');
  await attack(true);
  await waitFor('timedHit');
  assert.match(await status.innerText(), /Doorstop caught the hang · 34f catch/);
  await activate('edge-shortCatch');
  const damage = page.getByRole('slider', {name:'Dummy damage'});
  if (mobile) {
    await damage.scrollIntoViewIfNeeded();
    const box = await damage.boundingBox();
    await page.touchscreen.tap(box.x + box.width - 8, box.y + box.height/2);
  } else await damage.press('End');
  assert(Number(await damage.inputValue()) >= 120);
  await attack();
  await waitFor('ledge');
  assert.match(await status.innerText(), /6f protected/);
  await attack(true);
  await waitFor('timedHit');
  assert.match(await status.innerText(), /Doorstop caught the hang · 6f catch/);
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed short and long catches, changing rival damage and punishing the worn catch.');
}
async function testTumble(page, mobile) {
  await page.goto(root + '#training/tumble');
  const status = page.locator('#launch-status');
  const activate = id => mobile ? page.locator('#' + id).tap() : page.locator('#' + id).click();
  const attack = () => mobile ? page.locator('[data-touch="attack"]').tap() : page.keyboard.press('j');
  const session = mobile && await page.context().newCDPSession(page);
  async function side(dir) {
    if (!mobile) {
      await page.keyboard.up('a'); await page.keyboard.up('d');
      if (dir) await page.keyboard.down(dir === 'left' ? 'a' : 'd');
    } else {
      if (side.held) await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      if (dir) {
        const el = page.locator('[data-touch="' + dir + '"]');
        await el.scrollIntoViewIfNeeded();
        const b = await el.boundingBox();
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]});
      }
      side.held = !!dir;
    }
  }
  async function waitFor(result) {
    for(let i=0;i<85;i++) {
      if(await status.getAttribute('data-result')===result) return;
      await page.clock.runFor(80);
    }
    assert.fail('Expected '+result+', saw '+await status.innerText());
  }
  assert.match(await status.innerText(),/Escape the juggle/);
  await attack();
  await waitFor('juggled');
  assert.match(await status.innerText(),/Crown Lift caught you/);
  await activate('launch-juggle');
  await attack();
  await waitFor('juggleCue');
  await side('right');
  await waitFor('clean');
  assert.match(await status.innerText(),/jump and dodge saved/);
  await side(null);
  await activate('juggle-chase');
  await attack();
  await waitFor('juggleCue');
  await side('right');
  await waitFor('juggled');
  assert.match(await status.innerText(),/Crown Bump caught you/);
  await side(null);
  await activate('launch-side');
  await attack();
  await waitFor('juggleCue');
  await side('left');
  await page.clock.runFor(240);
  await side('right');
  await waitFor('clean');
  await side(null);
  await activate('reset-training');
  assert(await status.isHidden());
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard')+' passed neutral landing, tumble wiggle, aerial chase and reversed drift.');
}
async function testBraking(page, mobile) {
  const activate = locator => mobile ? locator.tap() : locator.click();
  const button = id => activate(page.locator('#' + id));
  const status = page.locator('#footwork-status');
  const cdp = mobile && await page.context().newCDPSession(page);
  const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:points});
  async function point(name, id) {
    const el = page.locator('[data-touch="' + name + '"]');
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    return {id, x:box.x + box.width / 2, y:box.y + box.height / 2};
  }
  async function waitFor(result) {
    for (let i = 0; i < 110; i++) {
      if (await status.getAttribute('data-result') === result) return;
      await page.clock.runFor(32);
    }
    assert.fail('Expected ' + result + ', saw ' + await status.innerText());
  }
  const run = async dir => {
    if (mobile) await touch('touchStart', [await point(dir, 1)]);
    else await page.keyboard.down(dir === 'right' ? 'd' : 'a');
    await waitFor('atMark');
  };
  const release = async () => {
    if (mobile) await touch('touchEnd');
    else { await page.keyboard.up('d'); await page.keyboard.up('a'); }
  };
  const hit = async dir => {
    if (mobile) await touch('touchStart', [await point(dir, 1), await point('attack', 2)]);
    else { await page.keyboard.down(dir === 'right' ? 'd' : 'a'); await page.keyboard.press('j'); }
  };

  await page.goto(root + '#training/braking');
  await run('right');
  await hit('right');
  await waitFor('dashHit'); await release();
  await button('footwork-brake');
  await run('right');
  await release(); await page.clock.runFor(40);
  if (mobile) await touch('touchStart', [await point('right', 1)]);
  await hit('right'); await page.clock.runFor(40); await release();
  await waitFor('slidingHit');
  assert.match(await status.innerText(), /Stamp Kick · sliding hit/);

  await page.goto(root);
  await button('home-options');
  const option = page.locator('[data-do="option-tiltStick"]');
  assert.match(await option.innerText(), /Smash/);
  await activate(option);
  assert.match(await option.innerText(), /Tilt/);
  await page.reload(); await button('home-options');
  assert.equal(await option.getAttribute('aria-pressed'), 'true');
  await activate(page.locator('#dialog-body [data-do="close"]'));
  await page.goto(root + '#training/braking');
  await button('footwork-pivot'); await button('footwork-side');
  await run('left');
  if (mobile) {
    const left = await point('left', 1), thumb = await point('smash', 2);
    await touch('touchStart', [left, thumb]);
    await page.clock.runFor(48);
    await touch('touchMove', [left, {...thumb, x:thumb.x + 21}]);
    await page.clock.runFor(48);
  } else await page.keyboard.press('y');
  await waitFor('slidingHit');
  assert.match(await status.innerText(), /Stamp Kick · caught the chase/);
  await release();
  await button('reset-training');
  assert(await status.isHidden());
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed dash attack, brake tilt, saved tilt-stick setting and mirrored pivot punish.');
}
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
    console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed examples, recording, replay, reply changes and free-training reset.');
    await testEdges(page, mobile);
    await testTumble(page, mobile);
    await testBraking(page, mobile);
    assert.deepEqual(errors, []);
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
main().catch(error => {
  console.error(error);
  console.log('::error::' + error.message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n','%0A'));
  process.exitCode = 1;
});
