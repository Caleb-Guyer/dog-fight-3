const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw new Error('Use the hosted Linux playtest runner.');
const {chromium}=require('playwright-core');
const current='http://127.0.0.1:8080/', baseline='http://127.0.0.1:8081/';

async function playCourse(browser,mobile) {
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:
    {viewport:{width:1366,height:768}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  const cdp=mobile&&await context.newCDPSession(page);
  const keys={left:'a',right:'d',up:'w',down:'s',jump:'Space',attack:'j',shield:'l',grab:'u',special:'k',smash:'i'};
  let held=[];
  const press=id=>mobile?page.locator('#'+id).tap():page.locator('#'+id).click();
  async function hold(names,ms=0) {
    if(mobile) {
      if(held.length)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const pts=[];
      for(const [i,k] of names.entries()) {
        const b=await page.locator('[data-touch="'+k+'"]').boundingBox();
        assert(b && b.y+b.height<=844,k+' on screen');
        pts.push({id:i+1,x:b.x+b.width/2,y:b.y+b.height/2});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts});
      }
    } else {
      for(const k of held.filter(k=>!names.includes(k)))await page.keyboard.up(keys[k]);
      for(const k of names.filter(k=>!held.includes(k)))await page.keyboard.down(keys[k]);
    }
    held=names;
    if(ms) await page.clock.runFor(ms);
  }
  try {
    await page.goto(current);
    assert(await page.locator('#school-welcome').isVisible());
    if (mobile) {
      await press('welcome-play'); await press('school-list');
      assert.equal(await page.locator('#school-syllabus button').count(),10); await press('school-resume');
    } else {
      await press('welcome-dismiss'); assert(await page.locator('#school-welcome').isHidden());
      await page.reload(); assert(await page.locator('#school-welcome').isHidden());
      await press('home-school'); assert.equal(await page.locator('#school-syllabus button').count(),10);
      await press('school-resume');
    }
    for (let n=0;n<10;n++) {
      assert.match(await page.locator('#school-count').textContent(),new RegExp(' '+(n+1)+' / 10$'));
      const title=await page.locator('#school-title').textContent();
      if(n===0) { await press('school-retry');await hold(['right'],1000); }
      if(n===1) {await hold(['jump'],165);await hold([],80);await hold(['jump'],1200);}
      if(n===2) await hold(['attack'],200);
      if(n===3) await hold(['down','attack'],200);
      if(n===4) await hold(['jump','attack'],250);
      if(n===5) await hold(['shield'],650);
      if(n===6) {await hold(['grab'],250);await hold(['right'],500);}
      if(n===7) await hold(['right','special'],300);
      if(n===8) {await hold(['up','special'],80);await hold(['right'],1650);}
      if(n===9) {await hold(['right','smash'],520);await hold([],1700);}
      await hold([]);
      assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'passed',(mobile?'touch ':'keyboard ')+title);
      if(n===2) {
        await page.goto(current+'?resume#tutorial');
        continue;
      }
      if(mobile) await press('school-next');
      else await page.keyboard.press('Enter');
    }
    assert.match(await page.locator('#match-mode').textContent(),/solo.*rookie/i);
    assert.equal(await page.locator('#hud .lives[aria-label="3 stocks"]').count(),2);
    assert(await page.locator('#school-coach').isHidden());
    await page.clock.runFor(2500);
    assert.match(await page.locator('#corner-line').textContent(),mobile?/tap Attack/:/tap J/);
    const tip=await page.locator('#corner-tip').boundingBox(),pause=await page.locator('#pause').boundingBox();
    assert(tip && tip.x>=0 && tip.x+tip.width<=page.viewportSize().width && tip.y>=pause.y+pause.height,'first-fight cue fits below the match controls');
    const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.school')));
    assert.equal(record.passed.length,10);assert.deepEqual(errors,[]);
    await page.goto(current+'?return');
    assert.match(await page.locator('#home-continue').textContent(),/First stock match/);
    await press('home-continue');
    assert.equal(await page.locator('#hud .lives[aria-label="3 stocks"]').count(),2);
    assert.match(await page.locator('#match-mode').textContent(),/solo.*rookie/i);
    await press('pause');
    const menu=page.locator('#dialog [data-do="home"]');
    if (mobile) await menu.tap(); else await menu.click();
    await press('home-adventure'); await press('dispatch-start'); await press('story-skip');
    await page.locator('#dispatch-hud').waitFor();assert(await page.locator('#match').isVisible());assert(await page.locator('#school-coach').isHidden());assert(await page.locator('#corner-tip').isHidden());
    assert.deepEqual(errors,[]);
  } finally {await context.close();}
}

async function ringside(browser){
  const ctx=await browser.newContext(),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{attack:'KeyQ'}]}));
    });
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:03Z'));
    await page.goto(current+'#tutorial/first-match');
    await page.evaluate(()=>{
      const old=DogFight.Battle.prototype.step;
      window.stateOf=w=>({frame:w.matchFrames,clock:w.clockFrames,dogs:w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.damage,f.stocks,f.jumps]),card:structuredClone(w.matchCard)});
      DogFight.Battle.prototype.step=function(...args){
        if(this.mode==='solo' && !window.original)window.original=this;
        if(this===window.original && window.watchResume && !window.resumed)window.resumed=stateOf(this);
        return old.apply(this,args);
      };
    });
    await page.clock.runFor(2510);
    const line=page.locator('#corner-line'),tip=page.locator('#corner-tip');
    assert.match(await line.textContent(),/tap Q/);
    await page.evaluate(()=>{
      window.ringPad={index:0,id:'Ringside pad',buttons:Array.from({length:17},()=>({pressed:false})),axes:[0,0,0,0]};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[ringPad]});
      ringPad.buttons[4].pressed=true;
    });
    await page.clock.runFor(40);assert.match(await line.textContent(),/tap X/);
    await page.keyboard.press('w');await page.clock.runFor(40);assert.match(await line.textContent(),/tap Q/);
    await page.evaluate(()=>{ringPad.buttons[5].pressed=true;});
    await page.clock.runFor(40);assert.match(await line.textContent(),/tap X/);
    await page.evaluate(()=>{ringPad.buttons[4].pressed=ringPad.buttons[5].pressed=false;});
    await page.keyboard.down('a');
    for(let n=0;n<100 && !(await tip.getAttribute('data-cue'))?.startsWith('jump/right');n++)await page.clock.runFor(32);
    await page.keyboard.up('a');
    assert.match(await line.textContent(),/Steer D.*Space/);
    await page.locator('#pause').click();
    const parked=await page.evaluate(()=>stateOf(original));
    const practice=page.locator('[data-do=corner-practice]');
    assert.match(await practice.textContent(),/Recover/);await practice.click();
    assert.equal(await page.locator('#school-count').textContent(),'First fight practice');
    await page.locator('#school-example').click();
    await page.locator('#school-coach[data-state=example]').waitFor();
    await page.locator('#school-next').click();await page.locator('#school-retry').click();
    await page.keyboard.down('w');await page.keyboard.down('k');await page.clock.runFor(80);
    await page.keyboard.up('k');await page.keyboard.up('w');await page.keyboard.down('d');await page.clock.runFor(1650);await page.keyboard.up('d');
    assert.equal(await page.locator('#school-next').textContent(),'Return to fight');
    assert(await page.locator('#school-next').isVisible());
    assert.deepEqual(await page.evaluate(()=>stateOf(original)),parked);
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.school')).passed),[]);
    await page.evaluate(()=>{window.watchResume=true;});
    await page.locator('#school-next').click();await page.clock.runFor(48);
    assert.deepEqual(await page.evaluate(()=>window.resumed),parked);
    await page.locator('#pause').click();await page.locator('[data-do=corner-toggle]').click();
    await page.locator('[data-do=resume]').click();await page.clock.runFor(50);assert(await tip.isHidden());
    await page.reload();await page.clock.runFor(2500);assert(await tip.isHidden());
    await page.locator('#pause').click();
    assert.equal(await page.locator('[data-do=corner-toggle]').getAttribute('aria-pressed'),'false');
    await page.locator('[data-do=corner-toggle]').click();await page.locator('[data-do=resume]').click();
    await page.clock.runFor(32);assert(await tip.isVisible());
    await page.keyboard.down('a');
    for(let n=0;n<150 && !(await tip.getAttribute('data-cue'))?.startsWith('lift/');n++)await page.clock.runFor(60);
    await page.keyboard.up('a');assert.match(await line.textContent(),/lamps turn mint/);
    await page.locator('#pause').click();assert.match(await practice.textContent(),/Take the lift/);await practice.click();
    await page.locator('#launch-stock-return').waitFor({state:'visible'});
    assert.equal(await page.locator('#launch-stock-return').getAttribute('aria-pressed'),'true');
    await page.locator('#return-fight').click();await page.clock.runFor(50);
    assert.match(await line.textContent(),/lamps turn mint/);
    assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
}
async function benchmark(browser,url,phone=false) {
  const context=await browser.newContext(phone?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:
    {viewport:{width:1366,height:768}});
  const page=await context.newPage();
  if (phone) {
    const cdp=await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  }
  await page.addInitScript(()=>{
    window.samples=[];
    const schedule=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=handler=>schedule(stamp=>{
      const t=performance.now();handler(stamp);window.samples.push([stamp,performance.now()-t]);
    });
  });
  try {
    await page.goto(url);
    const boot=await page.evaluate(()=>({
      ready:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
      hiddenRoster:document.querySelectorAll('#roster button').length
    }));
    const idleReads=await page.evaluate(async()=>{
      let reads=0;
      const d=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetWidth');
      Object.defineProperty(HTMLElement.prototype,'offsetWidth',{...d,get(){reads++;return d.get.call(this);}});
      await new Promise(resolve=>setTimeout(resolve,600));
      Object.defineProperty(HTMLElement.prototype,'offsetWidth',d);return reads;
    });
    await page.goto(url+'?bench#solo/night-mail');
    await page.keyboard.press('Shift');
    await page.waitForTimeout(3000);
    await page.evaluate(()=>{window.samples.length=0;});
    await page.waitForFunction(()=>window.samples.length>=120);
    const frame=await page.evaluate(()=>{
      const a=window.samples.slice(0,120);
      const p95=xs=>xs.sort((a,b)=>a-b)[Math.floor(xs.length*.95)];
      return {work:p95(a.map(r=>r[1])),interval:p95(a.slice(1).map((r,i)=>r[0]-a[i][0]))};
    });
    return {...boot,idleReads,...frame};
  } finally {await context.close();}
}
async function main() {
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try {
    await playCourse(browser,false); await playCourse(browser,true);await ringside(browser);
    const rows={baseline:[],candidate:[]};
    for(const n of [0,1,2]) for(const k of n===1?['candidate','baseline']:['baseline','candidate'])
      rows[k].push(await benchmark(browser,k==='baseline'?baseline:current));
    const median=(xs,k)=>xs.map(x=>x[k]).sort((a,b)=>a-b)[1];
    const summary=k=>['ready','hiddenRoster','idleReads','work','interval'].map(m=>median(rows[k],m).toFixed(1)).join(' | ');
    const result='Median of three cold contexts on hosted Chromium at 1366×768. Idle reads count button-width queries over 600 ms. Fight samples span 120 frames.\n\n'+
      '| Build | Menu DOM ready (ms) | Hidden roster buttons | Idle layout reads | Fight callback p95 (ms) | Display interval p95 (ms) |\n| --- | ---: | ---: | ---: | ---: | ---: |\n'+
      '| Previous | '+summary('baseline')+' |\n| Fight School | '+summary('candidate')+' |\n';
    console.log(result);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,result);
    console.log('::notice title=Fight School timings::'+JSON.stringify(rows));
    assert.equal(median(rows.candidate,'hiddenRoster'),0); assert.equal(median(rows.candidate,'idleReads'),0);
    assert(median(rows.baseline,'idleReads')>0 && median(rows.baseline,'hiddenRoster')>0);
    const phone=[];
    for (let n=0;n<3;n++) phone.push(await benchmark(browser,current,true));
    const note='Emulated phone, 390×844 with 4× CPU throttling. Median menu DOM ready '+median(phone,'ready').toFixed(1)+
      ' ms, fight callback p95 '+median(phone,'work').toFixed(1)+' ms, frame interval p95 '+median(phone,'interval').toFixed(1)+' ms.';
    console.log('::notice title=Phone timing::'+note);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n'+note+'\n');
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+e.message.replaceAll('\n','%0A'));process.exitCode=1;});
