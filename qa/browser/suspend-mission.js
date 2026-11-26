const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Browser input runs on hosted Linux.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function play(browser,touch){
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=async sel=>{
    const button=page.locator(sel);await button.waitFor({state:'visible'});
    if(touch)await button.tap();else {await button.focus();await page.keyboard.press('Enter');}
  };
  const run=ms=>page.clock.runFor(ms);
  const watch=()=>page.evaluate(()=>{
    const step=DispatchRun.prototype.step;
    window.fingerprint=w=>[w.runFrames,w.time,w.random.state,w.wave,w.checkpoint,w.cameraX,
      ...w.dogs.map(d=>[d.kind,d.x,d.y,d.vx,d.vy,d.damage,d.stocks,d.ground])];
    DispatchRun.prototype.step=function(){
      window.firstFrame ||= fingerprint(this);window.liveRun=this;
      return step.apply(this,arguments);
    };
  });
  try{
    await page.clock.install({time:new Date('2030-01-01Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root);
    await page.evaluate(()=>localStorage.setItem(DispatchScript.chapters[0].saveKey,JSON.stringify({version:2,started:true,room:1,checkpoint:0,stamps:1})));
    await page.goto(root+'?fight#adventure');await press('#dispatch-start');
    await page.getByText('The Weigh House',{exact:true}).filter({visible:true}).first().waitFor();
    await page.waitForFunction(()=>!!window.DispatchRun);await watch();await run(100);
    if(touch)await press('[data-touch=jump]');else await page.keyboard.press('Space');
    await run(120);await press('#pause');
    const expected=await page.evaluate(()=>fingerprint(liveRun));
    await press('[data-do=suspend-mission]');
    await page.waitForFunction(()=>document.getElementById('home-continue').dataset.save==='suspend-1-1');
    assert.equal(await page.locator('#continue-title').textContent(),'The Weigh House');
    assert.match(await page.locator('#continue-detail').textContent(),/^Suspended · \d stocks? · \d+%$/);
    assert.equal(await page.locator('#continue-action').textContent(),'Resume mission');
    const old=await page.evaluate(async()=>(await DispatchSuspend.list())[0]);
    // A fresh document has only the persistent stores, with no live battle or cached mission scripts.
    await page.goto(root+'?resume');await page.waitForFunction(()=>document.querySelector('#home-continue').dataset.save==='suspend-1-1');
    await press('#home-continue');await page.getByRole('heading',{name:'Mission ready'}).waitFor();
    await watch();await run(500);assert.equal(await page.evaluate(()=>!!window.liveRun),false);
    await press('[data-do=resume]');await run(70);assert.deepEqual(await page.evaluate(()=>firstFrame),expected);
    await press('#pause');
    await page.evaluate(()=>{
      const put=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(){
        if(this.name==='runs'){IDBObjectStore.prototype.put=put;throw new DOMException('Full','QuotaExceededError');}
        return put.apply(this,arguments);
      };
    });
    await press('[data-do=suspend-mission]');await page.getByRole('alert').filter({hasText:'could not save'}).waitFor();
    assert.equal(await page.evaluate(async()=>(await DispatchSuspend.list())[0].token),old.token);
    await press('[data-do=suspend-mission]');await page.locator('#home:visible').waitFor();
    await page.evaluate(h=>DispatchSuspend.clear(h),old);
    const fresh=await page.evaluate(async()=>(await DispatchSuspend.list())[0]);assert.notEqual(fresh.token,old.token);
    await press('#home-continue');await page.getByRole('heading',{name:'Mission ready'}).waitFor();await press('[data-do=resume]');await run(70);
    for(let i=0;i<3;i++){await page.evaluate(()=>liveRun.knockouts(liveRun.foes.map(e=>e.f)));await run(700);}
    await run(2000);
    await page.waitForFunction(async()=>(await DispatchSuspend.list()).length===0);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function firstFight(browser,touch){
  const page=await browser.newPage(touch?{viewport:{width:844,height:390},hasTouch:true,isMobile:true}:{viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=async selector=>{
    const b=page.locator(selector);await b.waitFor({state:'visible'});
    if(touch)await b.tap();else {await b.focus();await page.keyboard.press('Enter');}
  };
  const watch=()=>page.evaluate(()=>{
    const step=DogFight.Battle.prototype.step;
    window.summary=w=>[w.matchFrames,w.clockFrames,w.random.state,w.time,w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.damage,f.stocks,f.ground]),w.matchCard.losses.length];
    DogFight.Battle.prototype.step=function(...args){
      if(this.mode==='solo'){window.first ||= summary(this);window.live=this;}
      return step.apply(this,args);
    };
  });
  try{
    await page.clock.install({time:new Date('2030-01-01Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root+'#tutorial/first-match');await watch();await page.clock.runFor(2500);
    assert.equal(await page.evaluate(()=>!!window.PracticeDirectory),false);
    const cdp=touch && await page.context().newCDPSession(page);
    async function left(held){
      if(!touch)return held?page.keyboard.down('a'):page.keyboard.up('a');
      if(!held)return cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const r=await page.locator('[data-touch=left]').boundingBox();
      return cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});
    }
    await left(true);
    for(let n=0;n<15 && !await page.evaluate(()=>live.matchCard.losses.length);n++)await page.clock.runFor(300);
    await left(false);await page.clock.runFor(240);
    assert.equal(await page.evaluate(()=>live.dogs[0].stocks),2);
    await page.waitForFunction(async()=>window.DispatchSuspend && (await DispatchSuspend.list()).some(h=>h.id==='school-stock' && h.stocks===2));
    await press('#pause');const parked=await page.evaluate(()=>summary(live));
    await press('[data-do=school-suspend]');await page.locator('#home:visible').waitFor();
    assert.match(await page.locator('#continue-detail').textContent(),/Pip 2 stocks.*Brisket [123] stocks?/);
    await page.goto(root+'?resume-school');await page.waitForFunction(()=>document.querySelector('#home-continue').dataset.save==='school-stock');
    await press('#home-continue');await page.getByRole('heading',{name:'First match ready'}).waitFor();
    await watch();await page.clock.runFor(400);assert.equal(await page.evaluate(()=>!!window.live),false);
    await press('[data-do=resume]');await page.clock.runFor(120);
    assert.deepEqual(await page.evaluate(()=>first),parked);
    await press('#pause');await press('[data-do=ko-replays]');await press('[data-ko="0"]');
    assert.match(await page.locator('.clip-caption').textContent(),/Pip/);
    await press('[data-do=clip-back]');
    await page.keyboard.press('Escape');
    if(!await page.locator('[data-do=resume]').isVisible())await press('#pause');
    await press('[data-do=practice]');await page.locator('#practice-query').fill('jab lock');
    assert(await page.locator('[data-exercise=launch-escape]').isVisible());
    assert.equal(await page.evaluate(()=>!!window.PracticeDirectory),true);
    await press('#dialog-close');await press('[data-do=resume]');await page.clock.runFor(180);
    // Leave the last committed checkpoint readable through a failed write and a subsequent retry.
    await page.evaluate(()=>{
      window.storagePut=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){
        if(this.name==='runs')throw new DOMException('Full','QuotaExceededError');
        return storagePut.apply(this,args);
      };
    });
    await press('#pause');await press('[data-do=school-suspend]');
    await page.getByRole('alert').filter({hasText:'could not save'}).waitFor();
    await page.evaluate(()=>{IDBObjectStore.prototype.put=storagePut;});await press('[data-do=school-suspend]');
    await page.locator('#home:visible').waitFor();
    const conflict=await page.evaluate(async()=>{
      const record=await DispatchSuspend.load('school-stock'),slot=()=>({previous:record.header,began:Date.now(),writes:Promise.resolve()});
      const a=slot(),b=slot(),next=structuredClone(record);next.header.token=crypto.randomUUID();
      await DispatchSuspend.writeSchool(a,next);
      let refused=false;try{await DispatchSuspend.writeSchool(b,record);}catch{refused=true;}
      await DispatchSuspend.writeSchool(b,null);
      return refused && (await DispatchSuspend.load('school-stock')).header.token===next.header.token;
    });
    assert(conflict);
    await press('#home-continue');await page.getByRole('heading',{name:'First match ready'}).waitFor();await press('[data-do=resume]');
    await left(true);
    for(let i=0;i<20 && !await page.locator('[data-do=watch-finish]').isVisible();i++)await page.clock.runFor(1800);
    await left(false);await page.getByRole('heading',{name:'First fight finished'}).waitFor();
    await page.waitForFunction(async()=>!(await DispatchSuspend.list()).some(h=>h.id==='school-stock'));
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(browser,false);await play(browser,true);await firstFight(browser,false);await firstFight(browser,true);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
