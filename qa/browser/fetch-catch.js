const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux runner.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function play(browser,touch){
  const page=await browser.newPage(touch?{viewport:{width:844,height:390},hasTouch:true,isMobile:true}:{viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const click=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  try{
    await page.clock.install({time:new Date('2030-01-01Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(touch?root+'#local/fetch':root);
    if(!touch){
      assert.equal(await page.evaluate(()=>!!window.FighterSchool),false);
      await click('[data-enter-mode=local]');await click('#ball-info');await click('[data-do=fetch-match]');
    }
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){window.fight=this;return step.apply(this,args);};
    });
    await page.clock.runFor(2650);
    if(touch)await click('[data-touch=grab]');else await page.keyboard.press('u');
    await page.clock.runFor(450);
    assert.equal(await page.evaluate(()=>fight.ball.holder),0);
    assert.match(await page.locator('#grapple-prompt').textContent(),/Pip has the ball/);
    if(touch)await click('[data-touch=attack]');else await page.keyboard.press('j');
    await page.clock.runFor(1100);
    assert.equal(await page.evaluate(()=>fight.dogs[1].damage),6);
    assert(await page.locator('#grapple-prompt').isHidden());
    if(!touch){
      await click('#pause');await page.route('**/fighter-lessons.js*',r=>r.abort(),{times:1});
      await click('[data-do=moves]');await page.locator('#dispatch-load-retry').waitFor();await click('#dispatch-load-retry');
      await page.locator('[data-guide-section=defense]').waitFor();await click('[data-guide-section=defense]');
      assert(await page.locator('.guide-defense canvas').count()>0);
      await click('[data-guide-section=specials]');assert.equal(await page.locator('[data-watch-special]').count(),4);
      await click('[data-do=close]');assert(await page.locator('[data-do=resume]').isVisible());
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(browser,false);await play(browser,true);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
