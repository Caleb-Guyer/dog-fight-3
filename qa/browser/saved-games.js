const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
const errors=[];
async function savedRoutes(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(), tap=selector=>page.locator(selector).tap();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root);
  await tap('#welcome-dismiss');
  assert(await page.locator('#home-saves').isHidden());
  await tap('#home-school');await tap('#school-resume');
  await page.goto(root+'?resume');
  assert.match(await page.locator('#home-continue').textContent(),/Lesson 1/);
  await page.evaluate(()=>{
    localStorage.setItem(DispatchScript.saveKey,JSON.stringify({version:2,started:true,room:2,checkpoint:1,
      atCheckpoint:{stocks:2,damage:53.5},playedAt:2}));
    for(const [i,kind] of ['clover','noodle'].entries()) {
      let entry=YardCup.begin(YardCup.read(null),kind+'-save',2);
      if (kind==='noodle') entry=YardCup.finish(entry,{id:entry.active.id,retries:0,round:0},true,3,2500);
      localStorage.setItem('dog-fight-3.cup.'+kind,JSON.stringify({...entry,playedAt:10+i}));
    }
    const school=JSON.parse(localStorage.getItem('dog-fight-3.school'));
    localStorage.setItem('dog-fight-3.school',JSON.stringify({...school,playedAt:1}));
  });
  await page.reload();
  assert.match(await page.locator('#home-continue').textContent(),/Noodle’s Arcade Cup.*Round 2 of 4 · Clover/s);
  assert(await page.locator('#other-saves').isVisible());
  const box=await page.locator('#other-saves').boundingBox();assert(box.x+box.width<=391);
  await tap('#other-saves');
  const rows=page.locator('[data-resume-id]');
  assert.deepEqual(await rows.evaluateAll(els=>els.map(el=>el.dataset.resumeId)),['noodle','clover','adventure','school']);
  assert.match(await rows.nth(1).textContent(),/Retry round/);
  await tap('[data-resume-id=adventure]');
  await page.locator('#dispatch-hud').waitFor();
  assert.equal(await page.locator('#match-stage').textContent(),'Freight Exchange');
  assert.match(await page.locator('#runner-lives').getAttribute('aria-label'),/2 stocks/);
  assert.equal(await page.locator('#runner-percent').textContent(),'53.5%');
  await tap('#pause');await tap('[data-do=home]');
  assert.match(await page.locator('#home-continue').textContent(),/Freight Exchange · last wave/);
  await tap('#other-saves');await tap('[data-resume-id=noodle]');
  await page.waitForFunction(()=>document.querySelector('#match-mode').textContent.includes('Round 2/4'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.cup.noodle')).active.retries),0);
  await page.goto(root+'?interrupt');
  assert.match(await page.locator('#home-continue').textContent(),/Noodle.*Retry round/s);
  await tap('#home-continue');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dog-fight-3.cup.noodle')).active.retries===1);
  await page.goto(root+'?tabs');
  const other=await context.newPage();
  await other.goto(root);
  await other.evaluate(()=>localStorage.removeItem('dog-fight-3.cup.noodle'));
  await page.waitForFunction(()=>document.querySelector('#home-continue').dataset.save==='adventure');
  await other.evaluate(()=>localStorage.clear());
  await page.locator('#school-welcome').waitFor();
  assert(await page.locator('#home-saves').isHidden());
  await context.close();
}
async function graduation(browser) {
  const page=await browser.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const pad={index:0,id:'Hosted controller',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
    window.confirmPad=held=>Object.assign(pad.buttons[0],{pressed:held,value:Number(held)});
  });
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  await page.goto(root);
  // This legacy save predates the first-fight result flag.
  await page.evaluate(()=>localStorage.setItem('dog-fight-3.school',JSON.stringify({
    seen:true,lesson:'stock',passed:FightSchool.lessons.map(l=>l.id)})));
  await page.reload();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'home-continue');
  await page.evaluate(()=>confirmPad(true));await page.clock.runFor(32);
  await page.evaluate(()=>confirmPad(false));await page.clock.runFor(32);
  await page.evaluate(()=>{
    const proto=DogFight.Battle.prototype,step=proto.step;
    proto.step=function(...args){
      if(window.out!==undefined && this.mode==='solo' && this.end===null && this.dogs[window.out].stocks){
        // Stage the blast crossing and let the fight and results code account for each stock.
        const f=this.dogs[window.out];f.x=600;f.y=950;this.knockouts([f]);
      }
      return step.apply(this,args);
    };
    window.out=0;
  });
  await page.clock.runFor(4500);
  assert.equal(await page.locator('#dialog-title').textContent(),'First fight finished');
  assert.match(await page.locator('#dialog-body').textContent(),/3 stocks below the stage/);
  const report=page.locator('.school-result'), summary=report.locator('summary');
  assert.deepEqual(await report.getByRole('button').and(report.locator('button')).allTextContents(),['Practice recovery','Rematch Brisket']);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.schoolReview),'return');
  await summary.click();await report.locator('[data-do=match-card]').click();await page.locator('[data-do=card-back]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'match-card');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');
  assert.equal(await report.locator('details').getAttribute('open'),null);
  await page.locator('[data-school-review=return]').focus();
  await page.evaluate(()=>confirmPad(true));await page.clock.runFor(32);
  await page.evaluate(()=>confirmPad(false));await page.clock.runFor(32);await page.locator('#school-retry').click();
  assert.match(await page.locator('#school-title').textContent(),/Recover/);
  await page.goto(root+'?resume-practice');
  assert.match(await page.locator('#home-continue').textContent(),/Rematch practice · Recover to the stage/);
  await page.locator('#home-continue').focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#school-title').textContent(),/Recover/);
  await page.keyboard.down('w');await page.keyboard.down('k');await page.clock.runFor(80);
  await page.keyboard.up('w');await page.keyboard.up('k');await page.keyboard.down('d');await page.clock.runFor(1650);await page.keyboard.up('d');
  assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'passed');
  assert.equal(await page.locator('#school-next').textContent(),'Rematch Brisket');
  await page.goto(root+'?resume-rematch');
  assert.match(await page.locator('#home-continue').textContent(),/Rematch Brisket · Recover to the stage/);
  await page.evaluate(()=>{
    const proto=DogFight.Battle.prototype,step=proto.step;
    proto.step=function(...args){
      if(this.mode==='solo' && this.end===null){
        window.rematchWorld=this;
        if(window.blastRival){
          this.dogs[1].y=950;this.knockouts([this.dogs[1]]);
        }
      }
      return step.apply(this,args);
    };
  });
  await page.evaluate(()=>confirmPad(true));await page.clock.runFor(32);
  await page.evaluate(()=>confirmPad(false));await page.clock.runFor(2500);
  assert.equal(await page.evaluate(()=>rematchWorld.dogs[0].stocks),3);
  await page.locator('#pause').click();
  assert.match(await page.locator('#rematch-target').textContent(),/Rematch target.*Get back onstage/);
  await page.locator('[data-do=corner-practice]').click();
  assert.match(await page.locator('#school-title').textContent(),/Recover/);
  await page.locator('#school-list').click();
  assert.equal(await page.evaluate(()=>rematchWorld.dogs[0].stocks),3);
  await page.evaluate(()=>{
    const w=rematchWorld,f=w.dogs[0],floor=w.terrain[0];
    Object.assign(f,{x:floor.x1-50,y:floor.y+44,ground:-1,face:1,jumps:1,coyote:0,vx:0,vy:0});
    w.dogs[1].x=floor.x2-10;
  });
  await page.keyboard.down('w');await page.keyboard.down('k');await page.clock.runFor(80);
  await page.keyboard.up('w');await page.keyboard.up('k');await page.keyboard.down('d');await page.clock.runFor(1650);await page.keyboard.up('d');
  assert.equal(await page.locator('#corner-title').textContent(),'Target met');
  await page.evaluate(()=>{
    let entry=YardCup.begin(YardCup.read(null),'earlier-pip-cup',0);
    entry=YardCup.finish(entry,{id:entry.active.id,round:0,retries:0},true,2,1200);
    localStorage.setItem('dog-fight-3.cup.pip',JSON.stringify(entry));
    window.blastRival=true;
  });await page.clock.runFor(4500);
  assert.equal(await page.locator('#dialog-title').textContent(),'First fight won!');
  assert.match(await page.locator('#rematch-target').textContent(),/Target met.*back onstage/);
  assert.match(await report.locator('.school-verdict').textContent(),/Clover on Canal Lock/);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'school-cup');
  assert.deepEqual(await report.getByRole('button').and(report.locator('button')).allTextContents(),['Pip’s Arcade Cup','Rematch Brisket']);
  await page.locator('[data-do=school-cup]').click();
  assert.equal(await page.locator('[data-cup-dog][aria-pressed=true]').getAttribute('data-cup-dog'),'pip');
  assert.equal(await page.locator('[data-do=cup-start]').textContent(),'Continue to round 2');
  await page.evaluate(()=>localStorage.removeItem('dog-fight-3.cup.pip'));
  await page.goto(root+'?finished');
  assert(await page.locator('#home-saves').isHidden());
  await page.goto(root+'?replay#tutorial');
  assert.match(await page.locator('#school-count').textContent(),/1 \/ 10/);
  await page.close();
}
async function personalKnockout(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      const random=crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues=a=>a instanceof Uint32Array && a.length===1?a.fill(42):random(a);
      const buttons=Array.from({length:17},()=>({pressed:false,value:0}));
      Object.defineProperty(navigator,'getGamepads',{value:()=>[{id:'Hosted pad',index:0,mapping:'standard',axes:[0,0,0,0],buttons}]});
      window.reviewStick=on=>Object.assign(buttons[11],{pressed:on,value:Number(on)});
    });
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root+'#tutorial/first-match');
    await page.keyboard.down('a');
    for(let i=0;i<30 && !await page.locator('[data-school-review="return"]').count();i++)await page.clock.runFor(1200);
    await page.keyboard.up('a');
    await page.locator('[data-school-review="return"]').waitFor();
    const report=page.locator('.school-result');
    assert.equal(await report.getByRole('button').and(report.locator('button')).count(),2);
    const bounds=await report.locator('summary').boundingBox();
    assert(bounds.y>=0 && bounds.y+bounds.height<=844);
    await page.screenshot({path:'result-first-loss-phone.png'});
    await report.locator('summary').tap();
    assert(await report.locator('[data-do=watch-match]').isVisible());
    await page.locator('[data-do=home]').tap();await page.locator('#home-records').tap();
    await page.locator('[data-record-id]').first().tap();
    await page.locator('[data-saved-clip][data-ko-slot="0"]').first().waitFor();
    await page.goto(root+'?review-your-stock');await page.locator('#home-continue').tap();
    assert.equal(await page.locator('#school-title').textContent(),'Recover to the stage');
    await page.evaluate(()=>reviewStick(true));await page.clock.runFor(50);
    await page.evaluate(()=>reviewStick(false));await page.clock.runFor(50);
    await page.locator('#stock-try').waitFor();
    assert.equal(await page.locator('#dialog-title').textContent(),'Retry stock 3');
    assert.equal(await page.locator('#stock-caption').textContent(),'Before leaving the stage');
    await page.locator('#stock-watch').tap();await page.clock.runFor(6000);
    assert.match(await page.locator('#stock-caption').textContent(),/Recorded knockout · bottom/);
    await page.locator('#stock-back').tap();await page.locator('#school-recording').tap();
    await page.locator('#stock-try').tap();await page.clock.runFor(1600);
    assert.equal(await page.locator('#countdown').textContent(),'Your move');
    const b=await page.locator('[data-touch=shield]').boundingBox();assert(b);
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
    await page.clock.runFor(3500);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!');
    assert(await page.getByRole('button',{name:'Rematch Brisket',exact:true}).isVisible());
    await page.locator('[data-do=trial-results]').tap();
    assert.equal(await page.locator('#school-title').textContent(),'Recover to the stage');
    assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'playing');
    await page.goto(root+'?after-personal-save');
    assert.match(await page.locator('#home-continue').textContent(),/Rematch Brisket/);
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){
        if(this.mode==='solo' && !window.liveRematch)window.liveRematch=this;
        return step.apply(this,args);
      };
    });
    await page.locator('#home-continue').tap();await page.clock.runFor(2550);
    assert.equal(await page.locator('#hud .lives').first().getAttribute('aria-label'),'3 stocks');
    await page.keyboard.down('a');
    for(let i=0;i<160 && !await page.evaluate(()=>liveRematch.dogs[0].ground<0 && liveRematch.dogs[0].x<liveRematch.terrain[0].x1-15);i++)await page.clock.runFor(16);
    await page.keyboard.up('a');await page.keyboard.down('d');await page.keyboard.down('w');await page.keyboard.down('k');
    await page.clock.runFor(40);await page.keyboard.up('w');await page.keyboard.up('k');
    for(let i=0;i<120 && await page.locator('#corner-title').textContent()!=='Target met';i++)await page.clock.runFor(32);
    await page.keyboard.up('d');assert.equal(await page.locator('#corner-title').textContent(),'Target met');
    await page.keyboard.down('a');
    for(let i=0;i<38 && !await page.locator('[data-do=rematch-film]').count();i++)await page.clock.runFor(1200);
    await page.keyboard.up('a');
    await page.locator('.school-result summary').tap();await page.locator('[data-do=rematch-film]').tap();
    const rink=page.locator('#rematch-rink');
    await rink.locator('canvas').first().waitFor();
    assert.equal(await rink.locator('canvas').count(),2);
    assert(await page.locator('#dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
    await page.locator('#rematch-play').tap();await page.clock.runFor(600);
    const offset=Number(await rink.locator('input').inputValue());assert(offset<0 && offset>-90);
    await page.locator('#rematch-mark').tap();assert.equal(await rink.locator('output').textContent(),'First knockout');
    await page.locator('#rematch-target-film').tap();assert.equal(await rink.locator('canvas').count(),1);
    await page.locator('#rematch-mark').tap();assert.equal(await rink.locator('output').textContent(),'Target');
    await page.locator('#rematch-takeover').tap();await page.clock.runFor(4300);
    await page.locator('[data-do=trial-results]').tap();await page.locator('#rematch-film-back').tap();
    assert.equal(await page.locator('#dialog-title').textContent(),'First fight finished');
    await page.goto(root+'?saved-rematch#records');
    assert.equal(await page.locator('[data-record-id]').count(),2);
    await page.locator('[data-record-id]').first().tap();await page.locator('[data-do=rematch-film]').tap();
    await page.locator('#rematch-target-film').waitFor();assert.equal(await rink.locator('canvas').count(),2);
    await page.locator('#rematch-takeover').tap();await page.clock.runFor(4300);
    await page.locator('[data-do=trial-results]').tap();await page.locator('#rematch-film-back').tap();
    assert.equal(await page.locator('#dialog-title').textContent(),'Match stats');
    assert(await page.locator('[data-do=rematch-film]').evaluate(b=>document.activeElement===b));
  }finally{await page.close();}
}
async function touchRematch(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root);
    await page.evaluate(()=>localStorage.setItem('dog-fight-3.school',JSON.stringify({
      started:true,seen:true,lesson:'stock',passed:FightSchool.lessons.map(l=>l.id),firstFightDone:true,
      rematch:{id:'guard',ticket:'0000000000000001-0123456789abcdef',fight:false}
    })));
    await page.reload();await page.locator('#home-continue').tap();
    assert(await page.locator('#school-recording').isHidden());
    assert.match(await page.locator('#school-count').textContent(),/Rematch practice/);
    await page.locator('#school-example').tap();await page.clock.runFor(1800);
    const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.school')).rematch);
    assert.equal((await saved()).fight,false);
    await page.locator('#school-next').tap();
    const b=await page.locator('[data-touch=shield]').boundingBox(),cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
    await page.clock.runFor(1100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal((await saved()).fight,true);
    await page.locator('#school-next').tap();await page.clock.runFor(3100);
    await page.locator('#pause').tap();
    assert.match(await page.locator('#rematch-target').textContent(),/Rematch target.*Block or parry/);
    assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try {await savedRoutes(browser);await graduation(browser);await touchRematch(browser);await personalKnockout(browser);assert.deepEqual(errors,[]);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
