const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';

async function check(browser,device){
  const touch=device==='touch',pad=device==='controller';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    if(pad)await page.addInitScript(()=>{
      const buttons=Array.from({length:17},()=>({pressed:false,value:0}));
      const gamepad={id:'Hosted gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[gamepad]});
      window.setButton=(i,on)=>Object.assign(buttons[i],{pressed:on,value:Number(on)});
    });
    async function pressPad(index){
      await page.evaluate(i=>setButton(i,true),index);await page.clock.runFor(48);
      await page.evaluate(i=>setButton(i,false),index);await page.clock.runFor(48);
    }
    const choose=async selector=>{
      if(selector==='#pause' && pad)return pressPad(9);
      const item=page.locator(selector);
      await item.waitFor({state:'visible'});
      if(touch)return item.tap();
      if(selector==='#pause')return item.click();
      await item.focus();
      if(pad)return pressPad(0);
      await page.keyboard.press('Enter');
    };
    await page.goto(root+'#solo/ledge-trap/clover/right');
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){
        if(this.mode==='solo'){
          window.fight=this;
          if(!this.matchFrames)window.opener=[this.dogs[0].kind,this.dogs[1].kind,this.dogs[0].ledge?.left,this.dogs[0].damage,this.stockCount];
        }
        return step.apply(this,args);
      };
    });
    await page.clock.runFor(2610);
    assert.deepEqual(await page.evaluate(()=>opener),['pip','clover',false,120,3]);
    await choose('#pause');await choose('[data-do=lobby]');
    if(device==='keyboard')await page.route('**/versus-rules.js*',route=>route.abort(),{times:1});
    await choose('#cpu-level');
    if(device==='keyboard')await choose('#dispatch-load-retry');
    await page.locator('[data-ledge-guard=pip]').waitFor();
    assert.equal(await page.locator('[data-ledge-guard]').count(),4);
    await choose('[data-ledge-guard=pip]');
    await page.clock.runFor(2490);
    assert.deepEqual(await page.evaluate(()=>opener),['pip','pip',true,120,3]);
    if(pad)await pressPad(2);
    else if(touch)await page.locator('[data-touch=attack]').tap();
    else await page.keyboard.press('j');
    await page.clock.runFor(530);
    assert(await page.evaluate(()=>fight.dogs[1].damage>0),'ledge attack interrupts the guard');
    assert.equal(await page.evaluate(()=>fight.dogs[0].damage),120);
    await choose('#pause');await choose('[data-do=cpu-level]');await choose('[data-ledge-guard=noodle]');
    await page.clock.runFor(2480);
    assert.deepEqual(await page.evaluate(()=>opener),['pip','noodle',true,120,3]);
    assert.equal(await page.evaluate(()=>fight.dogs[1].smashCharge.moveId),'noodleLeadSnap');
    await choose('#pause');await choose('[data-do=rematch]');await page.clock.runFor(2480);
    assert.deepEqual(await page.evaluate(()=>opener),['pip','noodle',true,120,3]);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','controller'])await check(browser,device);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
