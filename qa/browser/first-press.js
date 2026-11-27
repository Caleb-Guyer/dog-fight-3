const assert = require('node:assert/strict');

// Hold one real download so a press before game initialization is repeatable.
async function holdFile(page, pattern) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(pattern, async route => {
    if (await gate) await route.abort();
    else await route.continue();
  }, {times:1});
  return release;
}

async function firstPress(browser, url) {
  const phone = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const keyboard = await browser.newContext();
  const errors = [];
  try {
    const page = await phone.newPage();
    page.on('pageerror', error => errors.push(error.message));
    let release = await holdFile(page, '**/app.js*');
    await page.goto(url, {waitUntil:'commit'});
    const tutorial = page.locator('#welcome-play'), status = page.locator('#opening-choice');
    await tutorial.tap();
    await tutorial.tap();
    assert.equal(await status.textContent(), 'Opening Fight School…');
    assert.equal(await page.evaluate(() => localStorage.getItem('dog-fight-3.school')), null);
    release(true);
    await page.locator('#opening-error[open]').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'opening-retry');
    await page.locator('#opening-retry').tap();
    await page.locator('#school-coach:not([hidden])').waitFor();
    assert.equal(await page.locator('#school-title').textContent(), 'Take center stage');
    const right = await page.locator('[data-touch="right"]').boundingBox();
    const input = await phone.newCDPSession(page);
    await input.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:right.x+right.width/2, y:right.y+right.height/2}]});
    await page.locator('#school-next:visible').waitFor();
    await input.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    release = await holdFile(page, '**/app.js*');
    await page.reload({waitUntil:'commit'});
    await page.locator('#home-school').waitFor();
    assert(await tutorial.isHidden(), 'a returning player never sees a fresh-save offer');
    await page.locator('#home-continue').tap();
    assert.equal(await status.textContent(), 'Opening saved game…');
    release(true);
    await page.locator('#opening-error[open]').waitFor();
    await page.locator('#opening-retry').tap();
    await page.locator('#school-coach:not([hidden])').waitFor();
    assert.equal(await page.locator('#school-title').textContent(), 'Jump onto a platform');
    assert.equal(await page.evaluate(() => history.state?.dogFightOpening), undefined);

    release = await holdFile(page, '**/app.js*');
    await page.reload({waitUntil:'commit'});
    await page.locator('#home-continue').tap();
    await page.evaluate(() => localStorage.removeItem('dog-fight-3.school'));
    release(false);
    await page.getByText('No saved game to resume.', {exact:true}).waitFor();
    assert(await page.locator('#school-coach').isHidden());
    assert(await page.locator('#home-continue').isHidden());

    const desk = await keyboard.newPage();
    desk.on('pageerror', error => errors.push(error.message));
    release = await holdFile(desk, '**/engine.js*');
    await desk.goto(url, {waitUntil:'commit'});
    await desk.locator('#welcome-play').waitFor();
    assert.equal(await desk.evaluate(() => document.activeElement.id), 'welcome-play');
    await desk.keyboard.press('Enter');
    assert.equal(await desk.locator('#opening-choice').textContent(), 'Opening Fight School…');
    await desk.keyboard.press('Escape');
    assert.equal(await desk.locator('#opening-choice').textContent(), '');
    const school = desk.locator('#home-school');
    await school.focus(); await desk.keyboard.press('Enter');
    const solo = desk.locator('[data-enter-mode="solo"]');
    await solo.focus(); await desk.keyboard.press('Enter');
    assert.equal(await desk.locator('#opening-choice').textContent(), 'Opening Solo fight…');
    release(false);
    await desk.locator('#lobby').waitFor();
    assert(await desk.locator('#school-coach').isHidden());
    assert.equal(await desk.evaluate(() => document.querySelectorAll('[data-opening]').length), 0);

    release = await holdFile(desk, '**/app.js*');
    await desk.goto(url+'?invite', {waitUntil:'commit'});
    await desk.locator('#home-school').click();
    await desk.evaluate(() => { location.hash = '#room/ABC234'; });
    await desk.waitForFunction(() => document.querySelector('#home').inert);
    release(false);
    await desk.locator('#online-lobby').waitFor();
    assert.equal(await desk.locator('#online-code').inputValue(), 'ABC234');
    await desk.locator('#online-home').click();
    await desk.locator('#home-online').click();
    await desk.locator('#online-lobby').waitFor();

    await desk.route('**/arena-art.js*', route => route.abort(), {times:1});
    await desk.goto(url+'?interrupted#online/best-of-three');
    await desk.locator('#opening-error[open]').waitFor();
    await desk.locator('#opening-retry').click();
    await desk.locator('#online-format[aria-pressed="true"]').waitFor();

    const controller = await browser.newPage();
    try {
      controller.on('pageerror', error => errors.push(error.message));
      await controller.addInitScript(() => {
        window.pad = {id:'Standard', index:0, axes:[0,0], buttons:Array.from({length:17}, () => ({pressed:false}))};
        Object.defineProperty(navigator, 'getGamepads', {value:() => [pad]});
      });
      release = await holdFile(controller, '**/app.js*');
      await controller.goto(url, {waitUntil:'commit'});
      await controller.waitForFunction(() => !!window.DogFightView);
      await controller.evaluate(() => {
        const step = DogFight.Battle.prototype.step;
        window.lessonFrames = window.jumpFrames = 0;
        DogFight.Battle.prototype.step = function(dt, input) {
          if (this.lesson) { window.lessonFrames++; if (input.jump) window.jumpFrames++; }
          return step.apply(this, arguments);
        };
        pad.buttons[15].pressed = true;
      });
      await controller.waitForFunction(() => document.activeElement.id === 'welcome-field');
      await controller.evaluate(() => { pad.buttons[15].pressed = false; pad.buttons[14].pressed = true; });
      await controller.waitForFunction(() => document.activeElement.id === 'welcome-play');
      await controller.evaluate(() => { pad.buttons[14].pressed = false; pad.buttons[0].pressed = true; });
      await controller.locator('#welcome-play[data-opening]').waitFor();
      release(false);
      await controller.waitForFunction(() => lessonFrames >= 6);
      assert.equal(await controller.evaluate(() => jumpFrames), 0, 'the menu confirm never becomes an unrequested jump');
      await controller.evaluate(() => { pad.buttons[0].pressed = false; pad.axes[0] = 1; });
      await controller.locator('#school-next:visible').waitFor();
      release = await holdFile(controller, '**/app.js*');
      await controller.reload({waitUntil:'commit'});
      await controller.waitForFunction(() => !!window.FightControls && document.activeElement.id === 'home-continue');
      await controller.evaluate(() => { pad.buttons[0].pressed = true; });
      await controller.locator('#home-continue[data-opening]').waitFor();
      await controller.evaluate(() => { pad.buttons[0].pressed = false; pad.buttons[1].pressed = true; });
      await controller.waitForFunction(() => !document.querySelector('[data-opening]'));
      await controller.evaluate(() => { pad.buttons[1].pressed = false; pad.buttons[0].pressed = true; });
      await controller.locator('#home-continue[data-opening]').waitFor();
      release(false);
      await controller.getByText('Jump onto a platform', {exact:true}).waitFor();
    } finally { await controller.close(); }
    assert.deepEqual(errors, []);
  } finally { await Promise.all([phone.close(), keyboard.close()]); }
}

async function timeFirstPress(browser, url, returning=false) {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {offline:false,latency:60,downloadThroughput:750000,uploadThroughput:250000});
    const button=returning?'#home-continue':'#welcome-play';
    await page.addInitScript(selector => {
      if(selector==='#home-continue')localStorage.setItem('dog-fight-3.school',JSON.stringify({seen:true,started:true,lesson:'move',passed:[],playedAt:1}));
      document.addEventListener('click', event => {
        if (event.isTrusted && event.target.closest(selector)) window.firstPressAt = performance.now();
      }, true);
    },button);
    await page.goto(url, {waitUntil:'commit'});
    await page.locator(button).tap();
    await page.locator('#school-coach:not([hidden])').waitFor();
    await page.evaluate(() => {
      const step = DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step = function(dt, input) {
        const x = this.dogs[0].x, result = step.apply(this, arguments);
        if (!window.firstMoveAt && this.lesson && input.x > 0 && this.dogs[0].x > x) window.firstMoveAt = performance.now();
        return result;
      };
    });
    const right = await page.locator('[data-touch="right"]').boundingBox();
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:right.x+right.width/2, y:right.y+right.height/2}]});
    await page.waitForFunction(() => !!window.firstMoveAt);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    return await page.evaluate(() => ({press:window.firstPressAt, move:window.firstMoveAt,
      ready:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd}));
  } finally { await context.close(); }
}

module.exports = {firstPress, timeFirstPress, holdFile};
