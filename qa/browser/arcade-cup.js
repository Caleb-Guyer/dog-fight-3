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
  await page.goto(root);
  await page.locator('#home-cup').click();
  const roster=page.locator('#cup-select[data-view=roster]');
  await roster.waitFor();assert(!(await page.locator('#dialog').isVisible()));
  await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.cupDog),'brisket');
  await page.keyboard.press('Enter');assert.equal(await roster.locator('[aria-pressed=true]').getAttribute('data-cup-dog'),'brisket');
  for(const kind of ['pip','clover','brisket','noodle']){
    await page.locator('[data-cup-dog='+kind+']').click();
    await tap('cup-sheet');
    const rivals=await page.locator('.cup-stops li strong').allTextContents();
    assert.equal(rivals.length,4);
    assert.equal(rivals[3],'Copper Hound');
    assert(!rivals.map(s=>s.toLowerCase()).includes(kind));
    await page.keyboard.press('Escape');await roster.waitFor();
  }
  await page.locator('[data-cup-dog=pip]').click();
  await page.screenshot({path:'cup-select-desktop.png'});
  await page.locator('[data-cup-dog=noodle]').click();
  await page.locator('[data-do=cup-start]').focus();
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
  await finish(0,'Round 1 lost'); await tap('cup-next');
  await assertRound('brisket','rookie'); await finish(1,'Round 1 clear');
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
  await finish(1,'Round 2 clear');await tap('cup-next');
  await assertRound('pip','rival');await finish(1,'Round 3 clear');
  const fronts=page.locator('.cup-result button:visible');
  assert.deepEqual(await fronts.allTextContents(),['Play round 4','Route card','Match details']);
  assert.equal(await page.locator('#cup-more').getAttribute('aria-expanded'),'false');
  await page.setViewportSize({width:1920,height:830});await page.screenshot({path:'cup-clear-wide.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'cup-clear-phone.png'});
  await page.locator('#cup-more').click();await page.locator('[data-do=watch-match]').waitFor();
  await page.keyboard.press('Escape');assert.equal(await fronts.count(),3);
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
  await page.locator('#pause').click(); await tap('cup-sheet');
  assert.match(await page.locator('[data-do=cup-start]').textContent(),/Retry round 4/);
  await tap('cup-start'); await finish(1,'Arcade Cup clear!');
  const cleared=await record();
  assert.equal(cleared.active,null);assert.equal(cleared.clears,1);assert.equal(cleared.best.retries,2);
  assert.equal(cleared.best.id,saved.active.id);
  assert.equal(cleared.best.wins.length,4);assert(cleared.best.wins.every(w=>w.frames>0));
  assert.equal(await page.evaluate(()=>localStorage.getItem(DispatchScript.saveKey)),null);
  await tap('cup-sheet');
  assert.match(await page.locator('.cup-route-board').textContent(),/Personal best/);
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
  assert.equal(await page.locator('.cup-poster').count(),4);
  const check=await roster.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,bottom:el.querySelector('[data-do=cup-start]').getBoundingClientRect().bottom}));
  assert(check.scroll<=check.width && check.bottom<=844,JSON.stringify(check));
  await page.screenshot({path:'cup-select-phone.png'});
  assert(area.x>=0 && area.x+area.width<=391);
  await page.locator('[data-do=cup-start]').tap();
  await page.locator('#pause').tap();await page.locator('[data-do=cup-sheet]').tap();
  assert.match(await page.locator('[data-do=cup-start]').textContent(),/Retry round 1/);
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
async function main(){
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try {await playCup(browser);await mobileAndFilms(browser);assert.deepEqual(errors,[]);}
  finally {await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
