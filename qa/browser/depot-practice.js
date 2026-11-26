const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw Error('Interactive playtests require hosted Linux.');
const {chromium} = require('playwright-core');
const root = 'http://127.0.0.1:8080/';

async function play(browser,touch) {
  const page = await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const errors = [];
  page.on('pageerror',e=>errors.push(e.stack || e.message));
  async function choose(selector) {
    const button=page.locator(selector);
    if(touch) await button.tap();
    else {await button.focus();await page.keyboard.press('Enter');}
  }
  try {
    await page.clock.install({time:new Date('2030-01-01Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root);
    await page.evaluate(()=>localStorage.setItem(DispatchScript.chapters[0].saveKey,
      JSON.stringify({version:2,started:true,room:4,stamps:15,checkpoint:0,pending:'boss'})));
    await page.goto(root+'?depot#adventure');
    await page.route('**/dispatch-actors.js*',route=>route.abort(),{times:1});
    await choose('#dispatch-start');
    await page.getByRole('button',{name:'Retry cutscene'}).waitFor();
    await choose('#story-next');
    await page.waitForFunction(()=>!!window.DispatchActors && !document.querySelector('#film-pause').disabled);
    await page.clock.runFor(200);
    await choose('#story-skip');await page.locator('#dispatch-hud:visible').waitFor();
    await page.evaluate(()=>{
      const step=DispatchRun.prototype.step;
      window.pose = w=>[w.time,w.random.state,w.foes[0].phase,w.foes[0].time,w.foes[0].hp,
        ...w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.stocks,f.damage])];
      DispatchRun.prototype.step=function(...args){
        window.live=this;
        if(window.resuming && !this.bossLesson){window.restored=pose(this);window.resuming=false;}
        return step.apply(this,args);
      };
    });
    await page.clock.runFor(240);await choose('#pause');
    const paused=await page.evaluate(()=>pose(live));
    const campaign=()=>page.evaluate(()=>localStorage.getItem(DispatchScript.chapters[0].saveKey));
    const before=await campaign();
    await choose('[data-boss-pattern=stamp]');
    const shield=page.locator('[data-touch=shield]');
    const remote=touch && await page.context().newCDPSession(page);
    if(touch){
      const box=await shield.boundingBox();
      await remote.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
    }else await page.keyboard.down('l');
    await page.clock.runFor(2800);
    if(touch)await remote.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else await page.keyboard.up('l');
    await page.getByRole('heading',{name:'The lamp closed'}).waitFor();
    assert.equal(await page.evaluate(()=>live.dogs[0].damage),0);
    await choose('[data-boss-pattern=bell]');await page.clock.runFor(2500);
    await page.getByRole('heading',{name:'That one connected'}).waitFor();
    await choose('[data-boss-pattern=charge]');await page.clock.runFor(200);await choose('#pause');
    await page.getByRole('heading',{name:'Boss practice paused'}).waitFor();
    await page.evaluate(()=>{window.resuming=true;});
    await choose('[data-do=boss-return]');await page.clock.runFor(50);
    assert.deepEqual(await page.evaluate(()=>restored),paused);
    assert.equal(await campaign(),before);

    // Set up the final stock, then allow the real stamp and blast boundary to resolve.
    await page.evaluate(()=>{
      const hero=live.dogs[0],boss=live.foes[0];
      hero.stocks=1;hero.x=boss.f.x-90;
    });
    await page.clock.runFor(1250);
    assert.equal(await page.evaluate(()=>live.lastBossHit),'stamp');
    await page.evaluate(()=>{live.dogs[0].y=4000;live.dogs[0].ground=-1;});
    await page.clock.runFor(300);
    await page.getByRole('heading',{name:'Out of stocks'}).waitFor();
    assert.match(await page.locator('#dialog-body').textContent(),/Last hit · Paw stamp/);
    await choose('[data-boss-pattern=stamp]');await page.clock.runFor(1800);
    await choose('[data-do=boss-return]');await page.clock.runFor(50);
    assert.deepEqual(await page.evaluate(()=>[live.dogs[0].stocks,live.dogs[0].damage,live.foes[0].hp,!!live.bossLesson]),[3,0,170,false]);
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try {for(const touch of [false,true])await play(browser,touch);} finally {await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
