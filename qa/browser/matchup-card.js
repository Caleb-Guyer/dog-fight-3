const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Run browser inputs on hosted Linux.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
const shared='#solo/matchup/clover/2/noodle/1/canal/rival/stock/2/3/set/counterweights/off/20-70';

async function play(browser,device){
  const touch=device==='touch',pad=device==='controller';
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(pad)await context.addInitScript(()=>{
    const g={index:0,id:'Hosted pad',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[g]});
    window.setButton=(n,v)=>Object.assign(g.buttons[n],{pressed:v,value:Number(v)});
  });
  async function button(n){
    await page.evaluate(n=>setButton(n,true),n);await page.clock.runFor(40);
    await page.evaluate(n=>setButton(n,false),n);await page.clock.runFor(40);
  }
  async function choose(selector){
    const target=page.locator(selector);await target.waitFor();
    if(pad && selector==='#pause')return button(9);
    if(touch)return target.tap();
    await target.focus();
    if(pad)return button(0);
    return page.keyboard.press('Enter');
  }
  async function observe(){
    await page.evaluate(()=>{
      const original=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...inputs){window.fight=this;return original.apply(this,inputs);};
    });
  }
  const config=()=>page.evaluate(()=>localStorage.getItem('dog-fight-3.config'));
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root);await choose('#welcome-dismiss');const initial=await config();
    assert(await page.locator('#home-pin').isHidden());
    await page.goto(root+'?invite'+shared);
    await page.locator('#matchup-play').waitFor();
    assert.match(await page.locator('#matchup-stage').textContent(),/Canal Lock.*Counterweights/);
    assert.match(await page.locator('.matchup-fighters').textContent(),/Clover.*20%.*Rival CPU.*Noodle.*70%/);
    assert(await page.locator('#matchup-preview').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(Boolean)));
    await choose('#matchup-share');assert.equal(await page.locator('#matchup-link').inputValue(),root+shared);
    await choose('#matchup-pin');assert.equal(await page.locator('#matchup-pin').getAttribute('aria-pressed'),'true');
    assert.equal(await config(),initial);
    await page.goto(root+'?return');await observe();
    await page.locator('#pin-play').waitFor();
    const inside=await page.locator('#home-pin').boundingBox();assert(inside.x>=0 && inside.x+inside.width<=page.viewportSize().width);
    await page.waitForFunction(()=>document.activeElement.id==='pin-play');
    if(pad)await button(0);else if(touch)await page.locator('#pin-play').tap();else await page.keyboard.press('Enter');
    await page.clock.runFor(2500);
    assert.match(await page.locator('#match-set').textContent(),/Game 1.*0–0/);
    assert.deepEqual(await page.evaluate(()=>[fight.mode,fight.stage,fight.form,fight.cpuLevel,fight.fetch,fight.stockCount,
      fight.dogs.map((f,i)=>[f.kind,fight.coatFor(i),f.damage])]),['solo','canal','counterweights','rival',false,2,[['clover',2,20],['noodle',1,70]]]);
    assert.equal(await config(),initial);
    await choose('#pause');await choose('[data-do=home]');await choose('#pin-view');await choose('#matchup-edit');
    const edited=JSON.parse(await config());
    assert.deepEqual([edited.p1,edited.p2,edited.coatBook[0].clover,edited.coatBook[1].noodle,edited.handicap],['clover','noodle',2,1,[20,70]]);
    await page.goto(root+'?local#local/rules/stock/1/0/single/flat/off');await choose('#rules-use');
    await choose('#rules-label');await choose('[data-do=matchup-card]');
    assert.match(await page.locator('#matchup-pin').textContent(),/Replace/);
    await choose('#matchup-pin');await choose('#matchup-share');
    const local='#local/matchup/clover/2/noodle/1/canal/p2/stock/1/0/single/flat/off';
    assert.equal(await page.locator('#matchup-link').inputValue(),root+local);
    await choose('#matchup-edit');await observe();await choose('#start');await page.clock.runFor(2520);
    assert.deepEqual(await page.evaluate(()=>[fight.mode,fight.clockFrames,fight.stockCount,fight.dogs.map(f=>f.damage)]),['local',null,1,[0,0]]);
    await page.keyboard.down('a');await page.clock.runFor(3800);await page.keyboard.up('a');
    await choose('[data-do=matchup-card]');await choose('#matchup-share');
    assert.equal(await page.locator('#matchup-link').inputValue(),root+local);
    await choose('#matchup-back');await choose('[data-do=home]');await page.locator('#pin-play').waitFor();
    if(device==='keyboard'){
      const tab=await context.newPage();await tab.goto(root+local);await tab.locator('#matchup-pin').click();
      await page.locator('#home-pin').waitFor({state:'hidden'});await tab.close();
    }else{
      await choose('#pin-view');await choose('#matchup-pin');await choose('#matchup-back');
      assert(await page.locator('#home-pin').isHidden());
    }
    await page.goto(root+'?broken'+shared.replace('noodle','unknown'));
    await page.locator('#matchup-back').waitFor();
    assert.equal(await page.locator('#dialog-title').textContent(),'Matchup unavailable');
    await choose('#matchup-back');assert(await page.locator('#home').isVisible());
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','controller'])await play(browser,device);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
