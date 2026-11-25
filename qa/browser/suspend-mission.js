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
    assert.match(await page.locator('#home-continue').textContent(),/The Weigh House.*Suspended.*Resume mission/);
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
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(browser,false);await play(browser,true);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
