const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw new Error('Browser tests require the hosted Linux runner.');
const {chromium} = require('playwright-core');
const root = 'http://127.0.0.1:8080/';
const errors = [];
async function playCup(browser) {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>{errors.push(e.message);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));});
  const record=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.cup.noodle')));
  const tap=action=>page.locator('[data-do="'+action+'"]').click();
  const title=async text=>page.getByRole('heading',{name:text,exact:true}).waitFor();
  async function checkResult(primary){
    const actions=page.locator('.cup-result button:visible');
    assert.deepEqual(await actions.allTextContents(),[primary,'More options']);
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),primary);
    assert.doesNotMatch(await page.locator('.cup-result').innerText(),/relay|detour|stamp/i);
  }
  await page.goto(root);
  await page.locator('#home-cup').click();
  const roster=page.locator('#cup-select[data-view=roster]');
  await roster.waitFor();assert(!(await page.locator('#dialog').isVisible()));
  await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.cupDog),'brisket');
  assert.equal(await roster.locator('[aria-pressed=true]').getAttribute('data-cup-dog'),'brisket');
  assert.match(await roster.locator('.cup-ticket p').textContent(),/Pip/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('dog-fight-3.cup.brisket')),null);
  // A delayed save must not launch a fighter the player browsed away from, including A -> B -> A.
  await page.evaluate(()=>{
    const request=navigator.locks.request.bind(navigator.locks);
    navigator.locks.request=(key,task)=>{
      if(key!=='dog-fight-3.cup.brisket')return request(key,task);
      navigator.locks.request=request;
      return new Promise(resolve=>{window.releaseCup=()=>resolve(task());});
    };
  });
  await page.keyboard.press('Enter');await page.waitForFunction(()=>!!window.releaseCup);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
  await page.evaluate(()=>releaseCup());
  assert.equal(await page.evaluate(()=>localStorage.getItem('dog-fight-3.cup.brisket')),null);
  assert(await roster.isVisible());assert(await roster.locator('[data-do=cup-start]').isEnabled());
  for(const kind of ['pip','clover','brisket','noodle']){
    await page.locator('[data-cup-dog='+kind+']').click();
    await tap('cup-sheet');
    const rivals=await page.locator('.cup-stops li strong').allTextContents();
    assert.equal(rivals.length,4);
    assert.equal(rivals[3],'Copper Hound');
    assert(!rivals.map(s=>s.toLowerCase()).includes(kind));
    assert(!(await page.locator('[data-do=cup-exhibition]').isVisible()));
    await page.keyboard.press('Escape');await roster.waitFor();
  }
  await page.locator('[data-cup-dog=pip]').click();
  await page.screenshot({path:'cup-select-desktop.png'});
  await page.locator('[data-cup-dog=noodle]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.cupDog),'noodle');
  await page.keyboard.press('Enter');
  async function observe() {
    await page.evaluate(()=>{
      const proto=DogFight.Battle.prototype, step=proto.step;
      proto.step=function(dt,input,...rest){
        window.fight=this;
        if(input?.x>0) window.moved=true;
        // Force ring-outs in this browser fixture to exercise stock transitions and round routing.
        if(window.ringOut!==undefined && this.end===null && !this.finished){
          const target=this.dogs[window.ringOut];
          if(target?.stocks && (window.koTick=(window.koTick||0)+1)%25===0) this.knockouts([target]);
        }
        return step.call(this,dt,input,...rest);
      };
    });
  }
  await observe();
  await page.waitForFunction(()=>window.fight?.matchFrames>0,null,{timeout:9000}).catch(async e=>{
    const view=await page.evaluate(()=>({mode:document.querySelector('#match-mode').textContent,
      dialog:document.querySelector('#dialog').open && document.querySelector('#dialog-title').textContent,
      action:document.activeElement.outerHTML.slice(0,130),state:document.body.className,
      run:localStorage.getItem('dog-fight-3.cup.noodle'),count:document.querySelector('#countdown').textContent}));
    throw Error('First Cup frame: '+JSON.stringify(view)+' '+errors.join(', ')+' '+e.message);
  });
  await page.keyboard.down('d');
  await page.waitForFunction(()=>window.moved);
  await page.keyboard.up('d');
  async function assertRound(kind,level){
    await page.waitForFunction(([k,l])=>window.fight?.dogs[1].kind===k && fight.cpuLevel===l && fight.end===null,[kind,level]);
    assert.deepEqual(await page.evaluate(()=>fight.dogs.map(d=>d.stocks)),[3,3]);
    assert.equal(await page.evaluate(()=>fight.dogs[0].kind),'noodle');
  }
  async function finish(slot,label) {
    await page.evaluate(i=>window.ringOut=i,slot);
    await title(label);
    await page.evaluate(()=>delete window.ringOut);
  }
  await assertRound('brisket','rookie');
  await finish(0,'Round 1 lost');await checkResult('Retry round 1');
  await page.locator('#cup-more').click();await tap('cup-sheet');
  assert.match(await page.locator('.cup-stops [aria-current]').innerText(),/Brisket[\s\S]*Retry/);
  await tap('cup-return');await title('Round 1 lost');await tap('cup-next');
  await assertRound('brisket','rookie'); await finish(1,'Round 1 clear');
  await checkResult('Play round 2');
  assert(!(await page.locator('[data-do=match-card]').isVisible()));await page.locator('#cup-more').click();
  await tap('match-card'); await tap('card-back'); await title('Round 1 clear');
  const saved=await record();
  assert.equal(saved.active.retries,1); assert.equal(saved.active.wins.length,1);
  await page.goto(root+'?resume#arcade/noodle'); await observe();
  assert.match(await page.locator('[data-do=cup-start]').textContent(),/Continue to round 2/);
  await page.locator('[data-cup-dog=clover]').click();
  assert.match(await page.locator('[data-do=cup-start]').textContent(),/Start Clover/);
  await page.locator('[data-cup-dog=noodle]').click();
  await tap('cup-start');await assertRound('clover','arcade');
  await finish(1,'Round 2 clear');await checkResult('Play round 3');await tap('cup-next');
  await assertRound('pip','rival');await finish(1,'Round 3 clear');
  const fronts=page.locator('.cup-result button:visible');
  await checkResult('Play round 4');
  assert.equal(await page.locator('#cup-more').getAttribute('aria-expanded'),'false');
  await page.setViewportSize({width:1920,height:830});await page.screenshot({path:'cup-clear-wide.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'cup-clear-phone.png'});
  await page.locator('#cup-more').click();await page.locator('[data-do=watch-match]').waitFor();
  await page.keyboard.press('Escape');assert.equal(await fronts.count(),2);
  await page.setViewportSize({width:1280,height:720});await tap('cup-next');
  await page.waitForFunction(()=>window.fight?.mode==='adventure');
  assert.deepEqual(await page.evaluate(()=>[fight.dogs[0].kind,fight.dogs[0].stocks,fight.foes[0].hp]),['noodle',3,170]);
  // Set up the second phase and play its first attack through the regular keyboard handler.
  await page.keyboard.down('l');
  await page.evaluate(()=>{
    const boss=fight.foes[0],hero=fight.dogs[0];
    boss.hp=boss.maxHP/2;boss.phase='approach';boss.time=0;
    hero.x=boss.f.x-165;
  });
  await page.waitForFunction(()=>document.querySelector('#dispatch-objective').textContent.includes('Bell winding up'));
  await page.waitForFunction(()=>fight.foes[0].wavefront?.spent);
  assert.deepEqual(await page.evaluate(()=>[fight.dogs[0].damage,fight.dogs[0].stocks,fight.dogs[0].shieldHP<1]),[0,3,true]);
  await page.keyboard.up('l');
  await page.waitForFunction(()=>document.querySelector('#dispatch-objective').textContent.includes('Lamp open'));
  await page.locator('#pause').click();
  const bossState=()=>page.evaluate(()=>[fight.matchFrames,fight.foes[0].hp,fight.foes[0].phase,
    fight.dogs[0].x,fight.dogs[0].damage,fight.dogs[0].stocks]);
  const atPause=await bossState(),beforePeek=await record();
  await page.screenshot({path:'cup-pause-boss.png'});
  await tap('cup-sheet');
  assert.match(await page.locator('.cup-stops [aria-current]').innerText(),/Copper Hound[\s\S]*Fighting now/);
  assert.deepEqual(await bossState(),atPause);
  await page.keyboard.press('Escape');await title('Arcade Cup paused');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'cup-sheet');
  await page.keyboard.press('Enter');await tap('cup-resume');
  await page.waitForFunction(n=>fight.matchFrames>n,atPause[0]);assert.deepEqual(await record(),beforePeek);
  assert.equal(await page.evaluate(()=>fight.foes[0].hp),atPause[1]);
  await finish(1,'Arcade Cup clear!');
  await checkResult('Choose a fighter');
  const cleared=await record();
  assert.equal(cleared.active,null);assert.equal(cleared.clears,1);assert.equal(cleared.best.retries,1);
  assert.equal(cleared.best.id,saved.active.id);
  assert.equal(cleared.best.wins.length,4);assert(cleared.best.wins.every(w=>w.frames>0));
  assert.equal(await page.evaluate(()=>localStorage.getItem(DispatchScript.saveKey)),null);
  await page.locator('#cup-more').click();await tap('cup-sheet');
  assert.match(await page.locator('.cup-route-board').textContent(),/Personal best/);
  assert.equal(await page.locator('.cup-stops [aria-current]').count(),0);
  assert((await page.locator('.cup-stops b').allTextContents()).every(label=>label.includes('kept')));
  await tap('cup-return');await title('Arcade Cup clear!');assert.deepEqual(await record(),cleared);
  await page.reload();await tap('cup-sheet');
  assert.match(await page.locator('.cup-route-board').textContent(),/1 clear/);
  await page.close();
}
async function mobileAndFilms(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  const scripts=[];
  page.on('request',req=>{if(/\/film-(opening|boss|rescue|ending)\.js/.test(req.url()))scripts.push(req.url());});
  await page.goto(root+'#arcade/clover');
  const roster=page.locator('#cup-select');await roster.waitFor();
  const area=await roster.boundingBox();
  assert.equal(await roster.locator('[aria-pressed=true] canvas + canvas').evaluate(c=>getComputedStyle(c).animationName),'none');
  assert.equal(await page.locator('.cup-poster').count(),4);
  const check=await roster.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,bottom:el.querySelector('[data-do=cup-start]').getBoundingClientRect().bottom}));
  assert(check.scroll<=check.width && check.bottom<=844,JSON.stringify(check));
  await page.screenshot({path:'cup-select-phone.png'});
  assert(area.x>=0 && area.x+area.width<=391);
  await page.locator('[data-do=cup-start]').tap();
  await page.locator('#pause').tap();await page.locator('[data-do=cup-sheet]').tap();
  assert.match(await page.locator('.cup-stops [aria-current]').innerText(),/Pip[\s\S]*Fighting now/);
  const button=await page.locator('[data-do=cup-resume]').boundingBox();
  assert(button.x>=0 && button.x+button.width<=390 && button.y>=0 && button.y+button.height<=844);
  await page.screenshot({path:'cup-schedule-phone.png'});
  await page.locator('#dialog-close').tap();await page.locator('#cup-pause-tools summary').tap();
  await page.locator('[data-do=cup-roster]').tap();await roster.waitFor();
  assert.match(await roster.locator('[data-do=cup-start]').textContent(),/Retry round 1/);
  await roster.locator('[data-do=cup-start]').tap();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dog-fight-3.cup.clover')).active.retries===1);
  await page.goto(root+'?school#tutorial');
  assert(await page.locator('#school-coach').isVisible());
  assert.deepEqual(scripts,[]);
  await page.goto(root+'?film#cutscenes');
  await page.locator('[data-reel=opening]').waitFor();
  assert.equal(await page.locator('[data-reel]:enabled').count(),1);
  await page.route('**/film-opening.js*',route=>route.abort(),{times:1});
  await page.locator('[data-reel=opening]').tap();
  await page.getByRole('button',{name:'Retry cutscene'}).tap();
  await page.waitForFunction(()=>document.querySelector('#film-pause').disabled===false);
  assert.equal(await page.locator('#film-pause').textContent(),'Play');
  await page.locator('#story-next').tap();
  await page.getByRole('button',{name:'Done',exact:true}).tap();
  assert(await page.locator('[data-reel=opening]').isVisible());
  assert.equal(scripts.length,2);
  await page.locator('#dialog-close').tap();
  await page.locator('#dispatch-start').tap(); await page.locator('#story-skip').tap();
  await page.locator('#dispatch-hud').waitFor();
  assert.equal(await page.locator('#runner-name').textContent(),'Pip');
  await page.close();
}
async function returningFighter(browser){
  const page=await browser.newPage({viewport:{width:800,height:450}});
  page.on('pageerror',e=>errors.push(e.message));
  const chosen=page.locator('#cup-select [aria-pressed=true]');
  const start=page.locator('[data-do=cup-start]');
  const saves=()=>page.evaluate(()=>Object.fromEntries(['brisket','noodle','clover'].map(kind=>
    [kind,JSON.parse(localStorage.getItem('dog-fight-3.cup.'+kind))])));
  try {
    for(const kind of ['brisket','noodle']){
      await page.goto(root+'?start='+kind+'#arcade/'+kind);
      await start.click();
      await page.locator('#pause').waitFor();
    }
    const before=await saves();
    assert(before.noodle.playedAt>before.brisket.playedAt);
    await page.goto(root+'?open-cup#arcade');
    await chosen.waitFor();
    assert.equal(await chosen.getAttribute('data-cup-dog'),'noodle');
    assert.equal(await start.textContent(),'Retry round 1');
    assert.deepEqual(await saves(),before);
    await page.locator('[data-cup-dog=clover]').click();
    await page.locator('#cup-back').click();
    await page.locator('#home-cup').click();
    await chosen.waitFor();
    assert.equal(await chosen.getAttribute('data-cup-dog'),'clover');
    await page.goto(root+'?explicit-choice#arcade/brisket');
    await chosen.waitFor();
    assert.equal(await chosen.getAttribute('data-cup-dog'),'brisket');
    assert.deepEqual(await saves(),before);
    await page.goto(root+'?continue-cup');
    await page.locator('#home-continue[data-save=noodle]').click();
    await page.locator('#pause').waitFor();
    const resumed=await saves();
    assert.equal(resumed.noodle.active.id,before.noodle.active.id);
    assert.equal(resumed.noodle.active.retries,before.noodle.active.retries+1);
    assert.deepEqual(resumed.brisket,before.brisket);
    assert.equal(resumed.clover,null);
  } finally {await page.close();}
}
async function main(){
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try {await playCup(browser);await mobileAndFilms(browser);await returningFighter(browser);assert.deepEqual(errors,[]);}
  finally {await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
