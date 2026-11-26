const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux') throw Error('Use hosted Linux for browser input.');
const {chromium} = require('playwright-core');

async function play(browser,device) {
  const touch=device==='touch', pad=device==='controller';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},isMobile:touch,hasTouch:touch});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const choose=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  const keys={left:'a',right:'d',attack:'j',smash:'i',shield:'l',jump:'Space',hop:'e'};
  const fingers=new Map();
  try {
    if(pad) await page.addInitScript(()=>{
      const gamepad={index:0,id:'Hosted pad',mapping:'standard',connected:true,axes:[0,0,0,0],
        buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[gamepad]});
      window.padInput=(action,on)=>{
        if(action==='left'||action==='right') gamepad.axes[0]=on?(action==='left'?-1:1):0;
        else Object.assign(gamepad.buttons[{attack:2,smash:7,shield:4,jump:0,hop:6}[action]],{pressed:on,value:Number(on)});
      };
    });
    const client=touch && await page.context().newCDPSession(page);
    async function hold(action,on) {
      if(pad) return page.evaluate(([a,v])=>padInput(a,v),[action,on]);
      if(!touch) return on?page.keyboard.down(keys[action]):page.keyboard.up(keys[action]);
      if(on) {
        const box=await page.locator('[data-touch='+action+']').boundingBox();
        assert(box && box.y>=0 && box.y+box.height<=844,action+' is on screen');
        fingers.set(action,{id:Object.keys(keys).indexOf(action)+1,x:box.x+box.width/2,y:box.y+box.height/2});
      } else fingers.delete(action);
      await client.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',touchPoints:[...fingers.values()]});
    }
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto('http://127.0.0.1:8080/#solo/dash-back/watch');
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      const seen=new WeakSet();
      DogFight.Battle.prototype.step=function(...args){
        if(this.mode==='solo'){
          window.live=this;
          if(!seen.has(this)){
            seen.add(this);window.contacts=[];
            const emit=this.emit;this.emit=(name,e)=>{
              if(['hit','block','grabCatch'].includes(name))window.contacts.push([name,e.moveId]);
              emit(name,e);
            };
          }
        }
        return step.apply(this,args);
      };
    });
    const damage=()=>page.evaluate(()=>live.dogs.map(f=>f.damage));
    const frame=()=>page.evaluate(()=>window.live?.matchFrames??0);
    async function advanceTo(tick) {
      for(let i=0;i<155 && await frame()<tick;i++) await page.clock.runFor(16);
      assert(await frame()>=tick,'simulation reached tick '+tick);
    }
    async function opening(role) {
      await choose('#pause'); await choose('[data-do=lobby]'); await choose('#cpu-level');
      await choose('[data-do=dash-back-'+role+']');
      await page.evaluate(()=>{window.live=null;});
      await page.clock.runFor(2050);
    }
    await page.clock.runFor(3000);
    assert.deepEqual(await damage(),[7,0]);
    await opening('bait');
    await hold('left',true); await advanceTo(5); await hold('left',false);
    await advanceTo(14); await hold('right',true); await advanceTo(21);
    await hold('attack',true); await advanceTo(24); await hold('attack',false); await hold('right',false);
    await advanceTo(36);
    assert.deepEqual(await damage(),[0,7],device+' running punish');
    assert.equal(await page.evaluate(()=>live.stockCount),3);
    await opening('delay');
    await hold('smash',true); await advanceTo(24); await hold('smash',false);
    await advanceTo(42);
    assert((await damage())[1]>20,device+' caught the step');
    await choose('#pause');await choose('[data-do=rematch]');await page.clock.runFor(3050);
    assert.deepEqual(await damage(),[7,0],device+' early release');
    await choose('#pause');await choose('[data-do=lobby]');await choose('#cpu-level');await choose('[data-do=lift-fight]');
    await page.evaluate(()=>{window.live=null;});await page.clock.runFor(2050);await advanceTo(28);
    assert.deepEqual(await page.evaluate(()=>live.dogs.map(f=>f.stocks)),[3,2]);
    await hold('shield',true);await advanceTo(55);
    assert.deepEqual(await page.evaluate(()=>contacts[0]),await page.evaluate(()=>['block',live.dogs[1].kit.air.down]),device+' late shield');
    await hold('shield',false);await choose('#pause');await choose('[data-do=rematch]');
    await page.evaluate(()=>{window.live=null;});await page.clock.runFor(2050);await advanceTo(2);
    await hold('shield',true);await advanceTo(55);await hold('shield',false);
    assert.deepEqual(await page.evaluate(()=>contacts[0]),await page.evaluate(()=>['grabCatch',live.dogs[1].kit.grab]),device+' early shield');
    await page.goto('http://127.0.0.1:8080/?return#solo/stock-return/noodle');
    assert.match(await page.locator('#match-mode').textContent(),/Rival/);
    await page.goto('http://127.0.0.1:8080/?closing#solo/sudden-death/perch');
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...inputs){if(this.suddenDeath)window.live=this;return step.apply(this,inputs);};
    });
    async function reachGo(){
      await page.clock.runFor(1300);
      for(let i=0;i<65 && await page.evaluate(()=>!window.live || live.suddenDeath.intro>0);i++)await page.clock.runFor(16);
      assert.equal(await page.evaluate(()=>live.suddenDeath.intro),0);
      assert.equal(await page.locator('#countdown').textContent(),'GO!');
      assert.match(await page.locator('#match-clock').getAttribute('aria-label'),/final positions/);
    }
    await reachGo();
    await hold('hop',true);await page.clock.runFor(64);await hold('hop',false);
    assert(await page.evaluate(()=>live.dogs[0].ground<0 || live.dogs[0].jumpSquat));
    await page.clock.runFor(590);
    assert.deepEqual(await page.evaluate(()=>[live.end,live.dogs[0].ground]),[null,3]);
    await choose('#pause');await choose('[data-do=lobby]');await choose('#rules-label');
    await choose('[data-sudden-opening=gap]');await reachGo();
    assert.match(await page.locator('#blast-radar').getAttribute('aria-label'),/P1 .+ near the bottom boundary/);
    const pixel=await page.evaluate(()=>{
      const c=document.getElementById('blast-radar'),b=live.blastBounds(),g=DogFight;
      const scale=Math.min((c.width-12)/(live.stageWidth+2*g.blastSideMargin),(c.height-12)/(g.bottomBlastY-g.topBlastY));
      const y=Math.round(c.height/2+(b.top-(g.bottomBlastY+g.topBlastY)/2)*scale);
      return Array.from(c.getContext('2d').getImageData(Math.floor(c.width/2),y,1,1).data);
    });
    assert.deepEqual(pixel,[237,150,121,255],device+' radar draws the current ceiling');
    await hold('left',true);await hold('jump',true);await page.clock.runFor(260);
    await hold('left',false);await hold('jump',false);await page.clock.runFor(505);
    assert.deepEqual(await page.evaluate(()=>[live.end,live.dogs[0].ground]),[null,0],device+' saved the stock');
    await choose('#pause');await choose('[data-do=rematch]');await page.clock.runFor(3000);
    assert.equal(await page.locator('#dialog').getAttribute('data-view'),'result');
    assert.equal(await page.evaluate(()=>live.matchCard.losses[0].zone),'bottom');
    assert.deepEqual(errors,[]);
  } finally { await page.close(); }
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try { for(const device of ['keyboard','touch','controller']) await play(browser,device); }
  finally { await browser.close(); }
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
