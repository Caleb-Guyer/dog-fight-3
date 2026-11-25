const assert=require('node:assert/strict');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')
  throw Error('Browser playtests run on hosted Linux only.');
const {chromium}=require('playwright-core');
const {execFileSync}=require('node:child_process');
const root='http://127.0.0.1:8080/';
const yard='dog-fight-3.last-dispatch.v1', night='dog-fight-3.night-mail.v1';
async function story(browser,mobile){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:2304,height:960},
    hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log('::error::'+e.stack.replaceAll('\n','%0A'));});
  const act=async sel=>{
    const control=page.locator(sel);
    await control.waitFor({state:'visible'});
    if(mobile)await control.tap();
    else { await control.focus(); await page.keyboard.press('Enter'); }
  };
  const get=sel=>page.locator(sel).textContent();
  const visible=sel=>page.locator(sel).first().waitFor({state:'visible'});
  await page.goto(root+'#adventure');
  await visible('#route-stops button');
  assert.equal(await page.locator('#route-switch').isVisible(),false);
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:2,started:true,complete:true,room:4,stamps:31,pending:'ending'})),yard);
  await page.reload();await act('#dispatch-start');await act('#story-skip');
  await act('#next-chapter');
  assert.equal(await get('#route-runner-name'),'Clover');assert.equal(await page.locator('#route-stops button').count(),2);
  await act('#dispatch-start');
  await page.waitForFunction(()=>window.DispatchFilms?.nightmail && !document.querySelector('#film-pause').disabled);
  const still=()=>page.locator('#story-cover').evaluate(c=>c.toDataURL());
  const departure=await still();
  await act('#story-next');assert.notEqual(await still(),departure);
  await act('#story-next');await visible('#dispatch-hud');
  assert.equal(await get('#runner-name'),'Clover');
  assert.equal(await get('#match-stage'),'Night Mail Roof');
  await page.evaluate(()=>{
    const step=DispatchRun.prototype.step;
    DispatchRun.prototype.step=function(dt,input){
      window.activeRun=this;
      if(input.x)window.steered=true;
      if(window.trimWave && this.wave===0){this.knockouts(this.foes.filter(e=>!e.f.absent).map(e=>e.f));window.trimWave=false;}
      if(window.clear && !this.finished && !this.clearDelay){
        const live=this.foes.filter(e=>!e.f.absent && e.f.stocks);
        if(live.length)this.knockouts(live.map(e=>e.f));
      }
      return step.call(this,dt,input);
    };
    window.trimWave=true;
  });
  await page.waitForFunction(()=>window.activeRun?.wave===1);
  if(!mobile){await page.keyboard.down('d');await page.waitForFunction(()=>window.steered);await page.keyboard.up('d');}
  await act('#pause');await act('[data-do=home]');await page.goto(root+'?resume');
  await visible('#home-continue');assert.match(await get('#home-continue'),/brake van/);
  await act('#home-continue');await visible('#dispatch-hud');
  assert.match(await get('#dispatch-objective'),/Wave 2/);
  await page.evaluate(()=>{
    const step=DispatchRun.prototype.step;
    DispatchRun.prototype.step=function(dt,input){
      if(!this.finished && !this.clearDelay){
        const live=this.foes.filter(e=>!e.f.absent && e.f.stocks);
        if(live.length)this.knockouts(live.map(e=>e.f));
      }
      return step.call(this,dt,input);
    };
  });
  await act('[data-next-stop="1"]');await visible('#dispatch-hud');
  assert.equal(await get('#machine-name'),'Noodle');
  await page.waitForFunction(()=>window.DispatchFilms?.firstlight && document.querySelector('#story-title').textContent==='Two short rings' && !document.querySelector('#film-pause').disabled);
  const signal=await still();await act('#story-next');assert.notEqual(await still(),signal);
  await act('#story-next');await act('[data-do=close]');
  assert.match(await get('#route-marks'),/2 \/ 2/);
  await act('#route-films');assert.equal(await page.locator('[data-reel]:enabled').count(),2);
  await act('#dialog-close');await act('#route-switch');
  assert.equal(await get('#route-chapter'),'The Silent Yard');assert.match(await get('#route-marks'),/5 \/ 5/);
  assert.deepEqual(await page.evaluate(([a,b])=>[a,b].map(k=>JSON.parse(localStorage.getItem(k)).complete),[yard,night]),[true,true]);
  assert.deepEqual(errors,[]);await context.close();
}
(async()=>{
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try{for(const mobile of [false,true])await story(browser,mobile);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
