const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
async function play(browser,device){
  const touch=device==='touch',pad=device==='pad';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(pad=>{
      localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{attack:'KeyQ'},{}]}));
      if(pad){
        const p={index:0,id:'Test pad',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
        Object.defineProperty(navigator,'getGamepads',{value:()=>[p]});
        window.button=(i,held)=>Object.assign(p.buttons[i],{pressed:held,value:Number(held)});
      }
    },pad);
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto('http://127.0.0.1:8080/#training/roll-habit');
    const click=s=>touch?page.locator(s).tap():page.locator(s).click();
    async function input(action){
      if(pad){
        const i={attack:2,shield:4,jump:0}[action];
        await page.evaluate(i=>button(i,true),i);await page.clock.runFor(34);await page.evaluate(i=>button(i,false),i);
      }else if(touch)await page.locator('[data-touch='+action+']').tap();
      else await page.keyboard.press({attack:'q',shield:'l',jump:'Space'}[action]);
      await page.clock.runFor(34);
    }
    const status=page.locator('#roll-status');
    const attempt=async action=>{
      await input('attack');await page.clock.runFor(100);await input(action);await page.clock.runFor(1600);
    };
    assert.equal(await page.locator('#roll-fight').isVisible(),false);
    await attempt('shield');assert.match(await status.textContent(),/1\/2/);
    await click('#roll-side');await attempt('shield');assert.match(await status.textContent(),/2\/2/);
    await click('#roll-scout');await attempt('shield');assert.equal(await status.getAttribute('data-result'),'caught');
    if(touch){
      await click('#roll-scout');await attempt('jump');
      assert.equal(await status.getAttribute('data-result'),'baited');assert.match(await status.textContent(),/0\/2/);
      assert.equal(await page.locator('#roll-fight').isVisible(),false);
      return;
    }
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){
        const out=step.apply(this,args);if(this.mode==='solo')window.solo=this;return out;
      };
    });
    await click('#roll-fight');
    for(let n=0;n<120 && !await page.evaluate(()=>!!window.solo);n++)await page.clock.runFor(32);
    assert.deepEqual(await page.evaluate(()=>[solo.cpuLevel,solo.stockCount,solo.dogs[0].ledge?.left,solo.bot.rollHabit.count]),['rival',3,false,2]);
    await page.clock.runFor(100);await input('shield');await page.clock.runFor(600);
    assert.equal(await page.evaluate(()=>solo.bot.ledgeRollCatches),1);
    await click('#pause');assert.match(await page.locator('#dialog-body').textContent(),/covered your ledge roll 1 time and grabbed you during 1 roll/);
  }finally{await page.close();assert.deepEqual(errors,[]);}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','pad','touch'])await play(browser,device);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
