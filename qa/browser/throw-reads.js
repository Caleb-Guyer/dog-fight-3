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
      window.confirmButton = on => Object.assign(controller.buttons[0], {pressed:on,value:Number(on)});
      window.steer = (x,y=0) => { controller.axes[0]=x;controller.axes[1]=y; };
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
    await press('#pause');
    await page.evaluate(()=>{window.liveStock=fight;window.beforeStudy=JSON.stringify(fight.matchCard);});
    await press('[data-do=ko-replays]');await press('[data-ko="0"]');
    const select=async selector=>{
      const item=page.locator(selector);
      if(touch)await item.tap();
      else{
        await item.focus();
        if(pad){
          await page.evaluate(()=>confirmButton(true));await page.clock.runFor(48);
          await page.evaluate(()=>confirmButton(false));await page.clock.runFor(48);
        }else await page.keyboard.press('Enter');
      }
    };
    await select('#clip-grip summary');
    await page.locator('[data-grip-original]').filter({hasText:/Throw committed/}).waitFor();
    await page.selectOption('[data-grip-action]','held');
    assert.match(await page.locator('[data-grip-result]').textContent(),/1 escape input\./);
    await select('[data-grip-play]');await page.clock.runFor(1200);
    assert.equal(await page.locator('#countdown').textContent(),'Your move');
    assert.match(await page.locator('#match-clock').textContent(),/Grip.*%/);
    if(pad)await page.evaluate(()=>attackButton(true));
    else if(touch)await page.locator('[data-touch=attack]').tap();
    else await page.keyboard.down('j');
    await page.clock.runFor(900);
    if(pad)await page.evaluate(()=>attackButton(false));
    else if(!touch)await page.keyboard.up('j');
    assert.match(await page.locator('#dialog-body').textContent(),/This attempt · Throw committed.*1 escape input\./);
    assert(await page.evaluate(()=>JSON.stringify(liveStock.matchCard)===beforeStudy));
    await press('[data-do=trial-replay]');
    await page.locator('#clip-grip[open]').waitFor();
    await select('#clip-defense summary');
    await page.locator('.defense-result').filter({hasText:/Brisket caught Pip with Bear Hug/}).waitFor();
    await select('[data-reply=guard]');
    assert.match(await page.locator('.defense-result').textContent(),/Brisket caught Pip/);
    await select('[data-lead="3"]');await select('[data-reply=spot]');
    assert.match(await page.locator('.defense-result').textContent(),/No hit or grab/);
    await select('[data-reply=attack]');
    assert.match(await page.locator('.defense-result').textContent(),/Pip hit Brisket with Quick Paw/);
    const picture=page.locator('#clip-defense canvas'),box=await picture.boundingBox();
    assert(box.width>150 && box.x>=0 && box.x+box.width<=page.viewportSize().width+1);
    await select('[data-watch-reply]');await page.clock.runFor(1100);
    assert.match(await page.locator('.defense-result').textContent(),/Pip hit Brisket/);
    await select('[data-play-defense]');
    // A native details toggle may arrive after its dialog closed for takeover.
    await page.locator('#clip-defense').evaluate(el=>el.dispatchEvent(new Event('toggle')));
    if(pad)await page.evaluate(()=>attackButton(true));
    else if(touch){
      const a=await page.locator('[data-touch=attack]').boundingBox();
      await finger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:a.x+a.width/2,y:a.y+a.height/2}]});
    }else await page.keyboard.down('j');
    await page.clock.runFor(915);
    if(pad)await page.evaluate(()=>attackButton(false));
    else if(touch)await finger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else await page.keyboard.up('j');
    await page.clock.runFor(2500);
    assert.match(await page.locator('#dialog-body').textContent(),/You survived the original knockout/);
    assert(await page.evaluate(()=>JSON.stringify(liveStock.matchCard)===beforeStudy));
    await press('[data-do=trial-replay]');
    await select('#clip-launch > summary');
    await select('#clip-launch button[aria-label=Center]');
    await page.locator('.flight-result').filter({hasText:/Center · KO at the left line/}).waitFor();
    const figure=page.locator('#clip-launch canvas'),original=await figure.evaluate(c=>c.toDataURL());
    await select('#clip-launch button[aria-label=Right]');
    assert.match(await page.locator('.flight-result').textContent(),/Right · Still airborne/);
    assert.notEqual(await figure.evaluate(c=>c.toDataURL()),original);
    const bounds=await figure.boundingBox();
    assert(bounds.width>110 && bounds.x>=0 && bounds.x+bounds.width<=page.viewportSize().width+1);
    assert(Math.abs(bounds.width/bounds.height-360/206)<.02);
    await select('[data-save-launch]');await page.locator('#recovery-back').waitFor();
    for(let n=0;n<40 && !await page.locator('#recovery-play').isVisible();n++)await page.clock.runFor(80);
    assert.match(await page.locator('#recovery-position').textContent(),/Impact to landing/);
    await select('#recovery-demo');await page.clock.runFor(6000);
    assert.match(await page.locator('#recovery-cue').textContent(),/Landed onstage/);
    assert(await page.evaluate(()=>JSON.stringify(liveStock.matchCard)===beforeStudy));
    await select('#recovery-back');await select('#clip-launch > summary');
    await select('[data-fly]');
    if(pad)await page.evaluate(()=>steer(1));
    else if(touch){
      const box=await page.locator('[data-touch=right]').boundingBox();
      await finger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2,y:box.y+box.height/2}]});
    }else await page.keyboard.down('d');
    await page.clock.runFor(1700);
    if(pad)await page.evaluate(()=>steer(0));
    else if(touch)await finger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else await page.keyboard.up('d');
    assert.match(await page.locator('#dialog-body').textContent(),/You survived the original knockout/);
    assert(await page.evaluate(()=>JSON.stringify(liveStock.matchCard)===beforeStudy));
    await press('[data-do=trial-results]');
    assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);
    if(device==='keyboard'){
      await page.goto('http://127.0.0.1:8080/?school-replay#tutorial/first-match');
      await page.locator('#game').waitFor();
      await page.keyboard.down('a');
      for(let i=0;i<12 && !await page.locator('[data-do=watch-finish]').isVisible();i++)await page.clock.runFor(4000);
      await page.keyboard.up('a');
      assert.equal(await page.locator('[data-do=watch-finish]').textContent(),'Replay my last stock');
      await press('[data-do=watch-finish]');await page.locator('#clip-frame').waitFor();
      await press('[data-do=clip-back]');
      assert.equal(await page.locator('#dialog-title').textContent(),'First fight finished');
    }
    await page.goto('http://127.0.0.1:8080/?study#tutorial/launch-lab');
    const x=page.locator('[data-axis=x]'),y=page.locator('[data-axis=y]');
    await x.waitFor();await page.clock.runFor(80);
    assert.equal(await x.inputValue(),'0');
    await select('[data-aim-search]');await page.locator('#recovery-back').waitFor();
    for(let n=0;n<32 && !(await page.locator('#recovery-route').textContent()).includes('ended offstage');n++)await page.clock.runFor(80);
    assert.match(await page.locator('#recovery-route').textContent(),/with this stick position ended offstage/);
    await select('#recovery-back');await x.waitFor();
    if(pad){
      await select('[data-read-pad]');await page.evaluate(()=>steer(.76,.28));await page.clock.runFor(100);
      await page.evaluate(()=>confirmButton(true));await page.clock.runFor(80);
      assert.match(await page.locator('[data-pad-note]').textContent(),/Right 76%.*Down 28%/);
      await page.evaluate(()=>{confirmButton(false);steer(0);});await page.clock.runFor(80);
    }else if(touch){
      for(const [slider,pos] of [[x,.88],[y,.64]]){
        const bounds=await slider.boundingBox();await slider.tap({position:{x:Math.round(bounds.width*pos),y:Math.floor(bounds.height/2)}});
      }
    }else{
      await x.focus();await page.keyboard.press('End');
      for(let n=0;n<24;n++)await page.keyboard.press('ArrowLeft');
      await y.focus();for(let n=0;n<28;n++)await page.keyboard.press('ArrowRight');
    }
    await page.clock.runFor(100);
    const aim=[Number(await x.inputValue())/100,Number(await y.inputValue())/100];
    if(touch)assert(aim[0]>.55 && aim[1]>.1,JSON.stringify(aim));else assert.deepEqual(aim,[.76,.28]);
    assert.match(await page.locator('.flight-result').textContent(),/Right .*Down .*Still airborne/);
    assert.match(await page.locator('[data-angle]').textContent(),/° clockwise.*% of original launch speed/);
    await page.evaluate(()=>{
      const proto=DogFight.Battle.prototype,release=proto.releaseLaunch,step=proto.step;
      proto.releaseLaunch=function(f,input){
        if(!document.getElementById('dialog').open && f.index===0){window.chosenRelease=[input.x,input.y];window.studyBattle=this;}
        return release.apply(this,arguments);
      };
      proto.step=function(dt,input){
        if(window.studyBattle===this && !window.followupInput)window.followupInput=[input.x,input.y];
        return step.apply(this,arguments);
      };
    });
    await select('[data-aim-play]');await page.clock.runFor(2000);
    const release=await page.evaluate(()=>chosenRelease);assert.deepEqual(release,aim);
    assert.deepEqual(await page.evaluate(()=>followupInput),[0,0]);
    await select('[data-do=trial-replay]');await x.waitFor();await page.clock.runFor(100);
    assert.deepEqual([Number(await x.inputValue())/100,Number(await y.inputValue())/100],aim);
    await select('[data-aim-search]');await page.locator('#recovery-back').waitFor();
    for(let n=0;n<32 && !await page.locator('#recovery-play').isVisible();n++)await page.clock.runFor(80);
    assert.match(await page.locator('#recovery-route').textContent(),/selected stick position plays on the release frame/);
    await select('#recovery-demo');await page.clock.runFor(6000);
    assert.match(await page.locator('#recovery-cue').textContent(),/Landed onstage/);
    if(device==='keyboard'){
      await select('#recovery-guide');await page.clock.runFor(1500);
      assert.match(await page.locator('#countdown').textContent(),/Drift back/);
      await page.keyboard.down('d');await page.clock.runFor(1100);
      assert.match(await page.locator('#countdown').textContent(),/\+/);
      await page.keyboard.down('w');await page.keyboard.down('k');await page.clock.runFor(100);
      await page.keyboard.up('k');await page.keyboard.up('w');await page.clock.runFor(2700);await page.keyboard.up('d');
      assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!');
      await select('[data-do=trial-replay]');await page.locator('#recovery-back').waitFor();
    }
    await select('#recovery-back');await x.waitFor();await select('[data-recorded]');await page.clock.runFor(60);
    assert.equal(await x.inputValue(),'0');assert.equal(await y.inputValue(),'0');
    await select('[data-do=clip-back]');await page.locator('#school-resume').waitFor();
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
