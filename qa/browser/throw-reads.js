const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux') throw Error('Use the hosted Linux runner for browser input.');
const {chromium} = require('playwright-core');

async function play(browser, device) {
  const touch = device === 'touch', pad = device === 'gamepad';
  const page = await browser.newPage({viewport:touch ? {width:390,height:844} : {width:1280,height:720}, hasTouch:touch, isMobile:touch});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const press = selector => touch ? page.locator(selector).tap() : page.locator(selector).click();
  try {
    await page.addInitScript(pad => {
      if (!pad) return;
      const controller = {id:'Test pad',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],
        buttons:Array.from({length:17}, () => ({pressed:false,value:0}))};
      Object.defineProperty(navigator, 'getGamepads', {value:() => [controller]});
      window.attackButton = on => Object.assign(controller.buttons[2], {pressed:on,value:Number(on)});
    }, pad);
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto('http://127.0.0.1:8080/#solo/throw-read/'+(touch ? 'perch' : 'edge'));
    await page.evaluate(() => {
      const step = DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step = function(...inputs) {
        if (this.mode === 'solo') {
          window.fight = this;
          if (this.matchFrames === 0) window.opening = this.dogs.map(f => [f.kind,f.damage,f.ground]);
        }
        return step.apply(this,inputs);
      };
    });
    await page.clock.runFor(4900);
    const zone = touch ? 'top' : 'left';
    assert.equal(await page.evaluate(() => fight.matchCard.losses[0]?.zone), zone);
    await press('#pause');
    if (device === 'keyboard') {
      await page.route('**/versus-rules.js*', route => route.abort(), {times:1});
      await press('[data-do=controls]');
      await press('#dispatch-load-retry');
      await page.getByText('Grab / throw', {exact:true}).waitFor();
      await press('[data-do=close]');
    }
    await press('[data-do=lobby]');
    await press('#cpu-level');
    await press('[data-do=throw-read-edge]');
    await page.clock.runFor(2150);
    let finger;
    if (pad) await page.evaluate(() => attackButton(true));
    else if (touch) {
      const box = await page.locator('[data-touch=attack]').boundingBox();
      assert(box && box.width && box.height);
      finger = await page.context().newCDPSession(page);
      await finger.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2,y:box.y+box.height/2}]});
    } else await page.keyboard.down('j');
    await page.clock.runFor(550);
    if (pad) await page.evaluate(() => attackButton(false));
    else if (touch) await finger.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    else await page.keyboard.up('j');
    assert.deepEqual(await page.evaluate(() => opening), [['pip',80,0],['brisket',0,0]]);
    assert.deepEqual(await page.evaluate(() => [fight.cpuLevel,fight.stockCount,fight.dogs[0].stocks,fight.dogs[0].damage]), ['rival',3,3,80]);
    assert(await page.evaluate(() => fight.dogs[1].damage > 0), device+' jab should interrupt the grab');
    await press('#pause');
    await press('[data-do=rematch]');
    await page.clock.runFor(4800);
    assert.equal(await page.evaluate(() => fight.matchCard.losses[0]?.zone), 'left');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try {
    for (const device of ['keyboard','touch','gamepad']) await play(browser,device);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); console.log('::error::'+e.stack.replaceAll('\n','%0A')); process.exitCode=1; });
