const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Run browser playtests on hosted Linux.');
const {chromium}=require('playwright-core'), drive=require('../helpers/lift-input.cjs');
const root='http://127.0.0.1:8080/', save='dog-fight-3.last-dispatch.v1';
async function play(browser,phone){
  const page=await browser.newPage({viewport:phone?{width:390,height:844}:{width:2256,height:940},hasTouch:phone,isMobile:phone,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=s=>phone?page.locator(s).tap():page.locator(s).click();
  try{
    await page.addInitScript(({key,phone})=>{
      if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:2,room:3,started:true,stamps:phone?15:7,checkpoint:2}));
    },{key:save,phone});
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root+'#adventure/dead-letter-lift');
    if(!phone){
      assert.equal(await page.locator('#lift-enter').textContent(),'Search Crane House');await press('#lift-enter');
      await page.locator('#dispatch-hud').waitFor();
      await page.keyboard.down('d');await page.keyboard.down('Space');await page.clock.runFor(300);
      await page.keyboard.up('Space');await page.clock.runFor(85);await page.keyboard.down('Space');await page.clock.runFor(350);
      await page.keyboard.up('Space');await page.clock.runFor(360);await page.keyboard.up('d');
      assert.match(await page.locator('#dispatch-notice').textContent(),/Dead Letter Lift unlocked/);
      await press('#pause');await press('[data-do=route]');await press('#route-bonus');
    }
    const before=await page.evaluate(key=>localStorage.getItem(key),save);
    assert.equal(await page.locator('#lift-enter').textContent(),'Ride the lift');await press('#lift-enter');
    await page.locator('#dispatch-hud').waitFor();
    assert.equal(await page.locator('#match-stage').textContent(),'Dead Letter Lift');
    assert.match(await page.locator('#dispatch-objective').textContent(),/Sorting floor.*Noodle/);
    await page.evaluate(()=>{
      const step=DispatchRun.prototype.step;
      DispatchRun.prototype.step=function(dt,input){
        if(!this.sideRoute)return step.call(this,dt,input);
        if(input.attack || input.tapped?.attack)window.hitButton=true;
        if(!window.driveLift)return step.call(this,dt,input);
        if(!this.runFrames)this.random=DogFight.seededRandom(3);
        for(let i=0;i<40 && !this.finished;i++){
          window.floors.add(this.wave);
          step.call(this,dt,window.driveLift(this.runFrames,this));
        }
      };
      window.floors=new Set();
    });
    if(phone)await press('[data-touch=attack]');else await page.keyboard.press('j');
    await page.clock.runFor(100);
    assert(await page.evaluate(()=>window.hitButton));
    const painted=await page.locator('#game').evaluate(c=>{
      const ctx=c.getContext('2d'),{data}=ctx.getImageData(0,0,c.width,c.height);
      let bolts=0,paper=0;
      for(let off=0;off<data.length;off+=64){
        if(data[off]===0xef && data[off+1]===0xc2 && data[off+2]===0x69)bolts++;
        if(data[off]===0x9c && data[off+1]===0x79 && data[off+2]===0x64)paper++;
      }
      return [bolts,paper];
    });
    assert(painted.every(n=>n>0),JSON.stringify(painted));
    await press('#pause');
    await page.addScriptTag({content:'window.driveLift='+drive.toString()});
    await press('[data-do=dispatch-retry]');await page.clock.runFor(11000);
    assert.equal(await page.locator('#dialog-title').textContent(),'Dead Letter Lift clear');
    assert.match(await page.locator('#dialog-body').textContent(),/Personal best · 1 stock left/);
    assert.deepEqual(await page.evaluate(()=>[...floors]),[0,1,2]);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),save),before);
    await page.reload();await page.locator('#lift-enter').waitFor();
    assert.match(await page.locator('#dialog-body').textContent(),/Personal best · 1 stock left/);
    await press('[data-do=route]');assert.match(await page.locator('#route-progress').textContent(),/Crane House/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(b,false);await play(b,true);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
