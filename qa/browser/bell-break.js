const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if (process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux') throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
const pilot=require('../bell-pilot.cjs');
const root='http://127.0.0.1:8080/';
async function check(browser,device) {
  const touch=device==='touch', pad=device==='pad';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));});
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  if (pad) await page.addInitScript(()=>{
    const buttons=Array.from({length:17},()=>({pressed:false,value:0}));
    window.testPad={index:0,id:'Hosted controller',axes:[0,0,0,0],buttons};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});
  });
  const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  const gamepad=async id=>{
    await page.evaluate(n=>{window.testPad.buttons[n]={pressed:true,value:1};},id);
    await page.clock.runFor(96);
    await page.evaluate(n=>{window.testPad.buttons[n]={pressed:false,value:0};},id);
    await page.clock.runFor(64);
  };
  const count=()=>page.locator('#match-set').textContent();
  const title=()=>page.locator('#dialog-title').textContent();
  const key='dog-fight-3.bells.1.pip';
  try {
    await page.goto(root);
    assert.equal(await page.evaluate(()=>!!window.BellBreak),false);
    await press('#home-bells');
    await page.locator('#bell-map').waitFor();
    for(const kind of ['noodle','brisket','clover','pip']){
      await press('[data-bell-dog='+kind+']');
      assert(await page.locator('#bell-map').isVisible());
      assert.equal(await page.locator('[data-bell-dog='+kind+']').getAttribute('aria-pressed'),'true');
    }
    if(touch || pad)await press('[data-bell-dog=clover]');
    // Observe public simulation frames to steer with real keys. Never write game state.
    await page.evaluate(()=>{
      const original=BellBreak.Run.prototype.step;
      BellBreak.Run.prototype.step=function(...args){original.apply(this,args);window.observedRun=this;};
    });
    if(pad){await page.locator('[data-do=bells-start]').focus();await gamepad(0);}
    else await press('[data-do=bells-start]');
    await page.clock.runFor(2550);
    assert.match(await count(),/^0 \/ 6 bells$/);
    if(pad)await gamepad(9);else await press('#pause');
    assert.match(await title(),/paused/);
    const frozen=await page.locator('#match-clock').textContent();
    await page.clock.runFor(2500);
    assert.equal(await page.locator('#match-clock').textContent(),frozen);
    if(pad)await gamepad(9);else await press('[data-do=resume]');
    if(touch || pad) {
      if (pad) await gamepad(1);
      else await press('[data-touch=special]');
      await page.clock.runFor(900);
      assert.equal(await count(),'2 / 6 bells');
      if(pad)await gamepad(9);else await press('#pause');
      await press('[data-do=bells-start]');
      assert.equal(await count(),'0 / 6 bells');
      await page.clock.runFor(2450);
      if(touch) {
        const b=await page.locator('[data-touch=left]').boundingBox();
        const session=await page.context().newCDPSession(page);
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]});
        await page.clock.runFor(6500);
        await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      } else {
        await page.evaluate(()=>{window.testPad.axes[0]=-1;});await page.clock.runFor(6500);
        await page.evaluate(()=>{window.testPad.axes[0]=0;});
      }
      assert.equal(await title(),'Missed the landing');
      await press('[data-do=bells-sheet]');
      assert.match(await page.locator('#dialog-body').textContent(),/No clear yet/);
      assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    } else {
      const keys={left:'a',right:'d',up:'w',jump:'Space',attack:'j'};
      async function clear() {
        let held=[];
        for(let turn=0;turn<230;turn++) {
          const state=await page.evaluate(()=>{
            const run=window.observedRun,f=run.dogs[0];
            if(run.end!==null)return null;
            return {kind:f.kind,bell:run.bells.find(b=>b.brokenAt===null),dog:{x:f.x,y:f.y,vy:f.vy,
              ground:f.ground,jumps:f.jumps,prev:f.prev,attack:!!f.attack,command:!!f.command}};
          });
          if(!state)break;
          const p=pilot(state), next=Object.keys(keys).filter(k=>({left:p.x<0,right:p.x>0,up:p.y<0,jump:p.jump,attack:p.attack})[k]);
          for(const k of held.filter(k=>!next.includes(k)))await page.keyboard.up(keys[k]);
          for(const k of next.filter(k=>!held.includes(k)))await page.keyboard.down(keys[k]);
          held=next;await page.clock.runFor(48);
        }
        for(const k of held)await page.keyboard.up(keys[k]);
        await page.clock.runFor(1000);
        assert.equal(await title(),'Course cleared!',await count());
      }
      await clear();
      assert.match(await page.locator('#bell-record').textContent(),/New personal best/);
      const best=await page.evaluate(key=>Number(localStorage.getItem(key)),key);
      assert(best>0);
      await press('[data-do=bells-start]');await page.clock.runFor(7000);await clear();
      assert.equal(await page.evaluate(key=>Number(localStorage.getItem(key)),key),best);
      assert.doesNotMatch(await page.locator('#bell-record').textContent(),/New personal best/);
      await page.goto(root+'?return#bells/pip');
      await page.locator('#bell-map').waitFor();
      assert.doesNotMatch(await page.locator('#dialog-body').textContent(),/No clear yet/);
      await press('[data-bell-dog=brisket]');
      assert.match(await page.locator('#dialog-body').textContent(),/No clear yet/);
    }
    assert.deepEqual(errors,[]);
  } finally { await page.close(); }
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try {for(const device of ['keyboard','touch','pad'])await check(browser,device);}
  finally {await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
