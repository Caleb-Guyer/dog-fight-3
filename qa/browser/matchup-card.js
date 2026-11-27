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
    const beforeDuel=await config();
    const records=()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('dog-fight-3.record.1.')).sort());
    const previousRecords=await records();
    await page.goto(root+'?duel'+local);await observe();await choose('#matchup-duel');
    for(const [i,opening] of ['left','right','center'].entries()){
      await choose('[data-opening="'+opening+'"]');await choose('#duel-start');
      if(i===0){
        await choose('#pause');await choose('#duel-resume');
        assert.equal(await page.locator('#match-mode').textContent(),'First-hit duel');
      }
      await page.clock.runFor(950);
      const [left,right]=await page.evaluate(()=>fight.dogs.map(f=>f.x));
      assert(right-left>140 && right-left<155);
      if(opening!=='center'){
        const bounds=await page.evaluate(()=>{const p=fight.terrain[fight.dogs[0].ground];return [p.x1,p.x2];});
        assert.equal(opening==='left'?left-bounds[0]:bounds[1]-right,32);
      }
      await page.keyboard.down('d');await page.clock.runFor(320);await page.keyboard.up('d');
      await page.keyboard.down('j');await page.clock.runFor(34);await page.keyboard.up('j');await page.clock.runFor(350);
      assert.match(await page.locator('#duel-report').textContent(),i===2?/P1 Clover wins the duel/:/P1 Clover takes the point/);
      assert.match(await page.locator('#duel-score').textContent(),new RegExp((i+1)+' – 0'));
      if(i===0){
        await choose('#duel-watch');await page.locator('#clip-arena').waitFor();
        await choose('#duel-impact');const end=await page.locator('#clip-seek').getAttribute('max');
        assert.equal(await page.locator('#clip-seek').inputValue(),end);
        assert.match(await page.locator('#clip-scores').textContent(),/Noodle [1-9]/);
        await choose('#duel-answer');
        assert.match(await page.locator('#match-mode').textContent(),/Opening retry · P2 Noodle/);
        if(pad)await page.evaluate(()=>setButton(4,true));else await page.keyboard.down('/');
        await page.clock.runFor(3200);
        if(pad)await page.evaluate(()=>setButton(4,false));else await page.keyboard.up('/');
        assert.equal(await page.locator('#dialog-title').textContent(),'Blocked the opening');
        assert.match(await page.locator('#dialog-body').textContent(),/Noodle dealt 0% and took 0%/);
        await choose('[data-do=trial-retry]');await page.clock.runFor(3200);
        assert.match(await page.locator('#dialog-title').textContent(),/^Caught by/);
        await choose('[data-do=trial-replay]');await choose('[data-do=clip-back]');
        assert.match(await page.locator('#duel-score').textContent(),/1 – 0/);
      }
      if(i===2){
        await choose('#duel-reply');await page.clock.runFor(3200);await choose('[data-do=trial-results]');
        assert.match(await page.locator('#duel-score').textContent(),/3 – 0/);
      }
    }
    assert(await page.locator('#duel-start').count()===0);assert.deepEqual(await records(),previousRecords);
    await choose('#duel-fight');await page.clock.runFor(2500);
    assert.deepEqual(await page.evaluate(()=>[fight.stockCount,fight.form,fight.dogs.map(f=>f.damage)]),[1,'flat',[0,0]]);
    assert.equal(await config(),beforeDuel);

    await page.goto(root+'?try#solo/tryouts/pip');await page.locator('[data-try-duel]').waitFor();await choose('[data-try-duel]');
    assert.match(await page.locator('#duel-score').textContent(),/P1 Pip/);
    await choose('#duel-back');await choose('#matchup-duel');await choose('#duel-start');await page.clock.runFor(11000);
    assert.match(await page.locator('#duel-report').textContent(),/CPU .* takes the point/);
    await choose('#duel-reply');assert.match(await page.locator('#match-mode').textContent(),/P1 Pip/);
    await page.clock.runFor(3300);await choose('[data-do=trial-results]');
    assert.match(await page.locator('#duel-score').textContent(),/0 – 1/);
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
