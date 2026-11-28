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
          if(target?.stocks && (window.koTick=(window.koTick||0)+1)%25===0){
            if(window.finalLoss && target.index===0 && target.stocks===1){
              target.x=this.blastBounds().right+1;target.damage=112.5;
              this.matchCard.players[0].lastHit={id:'brisketHaymaker',frame:this.matchFrames-18};
            }
            this.knockouts([target]);
          }
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
  await page.evaluate(()=>{
    const rival=fight.dogs[1];
    fight.knockouts([rival]);fight.knockouts([rival]);rival.damage=116.4;window.finalLoss=true;
  });
  await finish(0,'Round 1 lost');await checkResult('Retry round 1');
  assert.equal(await page.locator('.cup-result .winner p').innerText(),'Out at 112.5% · Last hit was Haymaker');
  await page.evaluate(()=>delete window.finalLoss);
  assert.equal(await page.locator('.cup-result .victory-shot').getAttribute('aria-label'),'Brisket on the winner’s podium');
  await page.locator('#cup-more').click();
  const options=page.locator('#cup-review button:visible');
  assert.deepEqual(await options.allTextContents(),['Cup schedule','Match stats','Watch full match','Main menu']);
  await tap('cup-sheet');
  assert.match(await page.locator('.cup-stops [aria-current]').innerText(),/Brisket[\s\S]*Retry/);
  await tap('cup-return');await title('Round 1 lost');await tap('cup-next');
  await assertRound('brisket','rookie'); await finish(1,'Round 1 clear');
  await checkResult('Play round 2');
  assert.match(await page.locator('.cup-result .winner p').innerText(),/^3 stocks left · Next up, Clover$/);
  assert(!(await page.locator('[data-do=match-card]').isVisible()));await page.locator('#cup-more').click();
  await tap('match-card'); await tap('card-back'); await title('Round 1 clear');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'match-card');
  const saved=await record();
  assert.equal(saved.active.retries,1); assert.equal(saved.active.wins.length,1);
  await page.goto(root+'?resume#arcade/noodle'); await observe();
  assert.match(await page.locator('[data-do=cup-start]').textContent(),/Continue to round 2/);
  await page.locator('[data-cup-dog=clover]').click();
  assert.match(await page.locator('[data-do=cup-start]').textContent(),/Start Clover/);
  await page.locator('[data-cup-dog=noodle]').click();
  await tap('cup-start');await assertRound('clover','arcade');
  await page.evaluate(()=>{fight.knockouts([fight.dogs[1]]);fight.clockFrames=1;});
  await title('Round 2 clear');await checkResult('Play round 3');
  assert.match(await page.locator('.winner p').innerText(),/^Time expired · 3–2 stocks · Next up, Pip$/);
  await tap('cup-next');await assertRound('pip','rival');
  await page.evaluate(()=>{fight.clockFrames=1;});
  await page.waitForFunction(()=>fight.suddenDeath && !fight.suddenDeath.intro);
  await finish(1,'Round 3 clear');
  assert.equal(await page.locator('.winner p').innerText(),'Sudden Death KO · Next up, Copper Hound');
  const fronts=page.locator('.cup-result button:visible');
  await checkResult('Play round 4');
  assert.equal(await page.locator('#cup-more').getAttribute('aria-expanded'),'false');
  await page.evaluate(()=>{
    const proto=DogFightView.FightView.prototype,draw=proto.draw;
    window.resultRedraws=[];
    proto.draw=function(canvas,battle,dt,time,confirmed,phase){
      if(canvas.id==='game' && battle.end!==null)resultRedraws.push([innerWidth,phase]);
      return draw.apply(this,arguments);
    };
  });
  for(const [width,height,name] of [[1920,830,'wide'],[390,844,'phone']]){
    await page.setViewportSize({width,height});
    await page.waitForFunction(w=>resultRedraws.some(([width])=>width===w),width);
    assert(await page.evaluate(()=>resultRedraws.every(([,phase])=>phase==='results')));
    await page.screenshot({path:'cup-clear-'+name+'.png'});
  }
  await page.locator('#cup-more').click();await page.locator('[data-do=watch-match]').waitFor();
  assert.deepEqual(await options.allTextContents(),['Cup schedule','Match stats','Watch full match','Main menu']);
  for(const button of await options.all()){
    const bounds=await button.boundingBox();
    assert(bounds.height>=44 && bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=390 && bounds.y+bounds.height<=844);
  }
  await page.screenshot({path:'cup-options-phone.png'});
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
  // Put the hero on the final stock and let the boss land its real half-armor bell.
  await page.evaluate(()=>{
    const hero=fight.dogs[0],boss=fight.foes[0];
    hero.stocks=1;hero.x=boss.f.x-165;
    Object.assign(boss,{hp:27.4,phase:'approach',time:0,cycle:3,nextBell:3,wavefront:null});
  });
  await page.waitForFunction(()=>fight.lastBossHit==='bell');
  await finish(0,'Round 4 lost');await checkResult('Retry round 4');
  const podium=page.locator('.cup-result .victory-shot');
  assert.equal(await podium.getAttribute('aria-label'),'Copper Hound on the winner’s podium');
  assert.equal(await page.locator('.cup-result .winner h3').textContent(),'Copper Hound wins');
  assert.equal(await page.locator('.cup-result .winner p').innerText(),'28 armor left. Jump the bell wave.');
  assert.equal(await page.locator('#dispatch-hud').isVisible(),false);
  assert.equal(await page.locator('#dispatch-orders').isVisible(),false);
  // Compare against the actor drawn in the fight, including a stable cel when motion is reduced.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>{
    const shown=document.querySelector('.cup-result canvas');
    const reference=document.createElement('canvas');reference.width=152;reference.height=104;
    DogFightView.drawPodium(reference,'conductor',0,28);
    return shown.toDataURL()===reference.toDataURL();
  });
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'cup-boss-loss-phone.png'});
  const keep=await record();
  await tap('cup-next');
  await page.waitForFunction(()=>fight?.mode==='adventure' && fight.foes[0].hp===170 && !fight.finished);
  assert.deepEqual(await page.evaluate(()=>[fight.dogs[0].kind,fight.dogs[0].stocks]),['noodle',3]);
  const retry=await record();
  assert.equal(retry.active.id,keep.active.id);assert.deepEqual(retry.active.wins,keep.active.wins);
  assert.equal(retry.active.retries,keep.active.retries+1);
  await finish(1,'Arcade Cup clear!');
  await checkResult('Choose a fighter');
  assert.equal(await podium.getAttribute('aria-label'),'Noodle on the winner’s podium');
  const cleared=await record();
  assert.equal(cleared.active,null);assert.equal(cleared.clears,1);assert.equal(cleared.best.retries,2);
  assert.equal(cleared.best.id,saved.active.id);
  assert.equal(cleared.best.wins.length,4);assert(cleared.best.wins.every(w=>w.frames>0));
  assert.equal(await page.evaluate(()=>localStorage.getItem(DispatchScript.saveKey)),null);
  await page.locator('#cup-more').click();
  assert.deepEqual(await options.allTextContents(),['Cup schedule','Main menu']);
  await tap('cup-sheet');
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
    const modes=page.locator('.mode-rack button');
    for(const size of [{width:800,height:450},{width:390,height:844},{width:1280,height:720}]){
      await page.setViewportSize(size);
      const list=await page.locator('.mode-rack').evaluate(el=>({used:el.scrollHeight,available:el.clientHeight}));
      assert(list.used<=list.available+1,JSON.stringify({size,list}));
      for(const button of await modes.all()){
        await button.scrollIntoViewIfNeeded();
        const hit=await button.evaluate(el=>{
          const r=el.getBoundingClientRect(), x=r.left+r.width/2, center=r.top+r.height/2;
          return [r.height,el.contains(document.elementFromPoint(x,center))];
        });
        assert(hit[0]>=44 && hit[1],JSON.stringify({size,label:await button.textContent(),hit}));
      }
      await modes.first().scrollIntoViewIfNeeded();
      await page.screenshot({path:'cup-home-'+size.width+'.png'});
    }
    await page.setViewportSize({width:800,height:450});
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
async function bossEntrance(browser,device){
  const phone=device==='phone',pad=device==='pad';
  const page=await browser.newPage({viewport:phone?{width:390,height:844}:{width:1920,height:800},
    hasTouch:phone,isMobile:phone,reducedMotion:phone?'reduce':'no-preference'});
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(pad=>{
      const key='dog-fight-3.cup.clover';
      if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({active:{id:'boss-entrance',coat:2,retries:0,
        started:false,wins:[1,2,3].map(stocks=>({stocks,frames:2400}))}}));
      if(!pad)return;
      const p={index:0,id:'Hosted pad',mapping:'standard',connected:true,axes:[0,0,0,0],
        buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[p]});
      window.jump=on=>Object.assign(p.buttons[0],{pressed:on,value:Number(on)});
    },pad);
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root+'#arcade/clover');
    const start=page.locator('[data-do=cup-start]'),call=page.locator('#countdown');
    for(const retry of [false,true]){
      await start.waitFor();assert.equal(await start.textContent(),retry?'Retry round 4':'Continue to round 4');
      if(pad){
        await start.focus();await page.evaluate(()=>jump(true));await page.clock.runFor(48);
        await page.evaluate(()=>jump(false));
      }else if(phone)await start.tap();else await start.click();
      await page.locator('#dispatch-hud').waitFor();
      assert.equal(await call.textContent(),retry?'1':'3');
      assert(!(await page.locator('#dispatch-orders').isVisible()));
      assert.equal(await page.locator('#machine-name').textContent(),'Copper Hound');
      assert.match(await page.locator('#announce').textContent(),/Clover versus Copper Hound.*Bell Depot/);
      await page.evaluate(()=>{
        window.poses=[];window.liveFrames=[];
        const draw=DispatchView.prototype.draw,step=DispatchRun.prototype.step,actor=DispatchActors.draw;
        DispatchView.prototype.draw=function(canvas,w,...args){window.depot=w;window.depotView=this;return draw.call(this,canvas,w,...args);};
        window.DispatchActors={...DispatchActors,draw(ctx,kind,x,y,opts){
          if(kind==='conductor' && window.depotView?.cupOpening?.remaining){
            const f=depot.dogs[0],m=ctx.getTransform();
            const visible=(px,py)=>{const p=new DOMPoint(px,py).matrixTransform(m);
              return p.x>=0 && p.x<=ctx.canvas.width && p.y>=0 && p.y<=ctx.canvas.height;};
            if(!visible(x-90,y-140) || !visible(x+85,y) || !visible(f.x-42,f.y-75) || !visible(f.x+42,f.y))
              throw Error('Finalists cropped during the countdown');
            poses.push(opts.pose);
          }
          return actor(ctx,kind,x,y,opts);
        }};
        DispatchRun.prototype.step=function(dt,input,...args){
          if(!liveFrames.length)liveFrames.push([document.getElementById('countdown').textContent,!!input.tapped?.jump]);
          return step.call(this,dt,input,...args);
        };
      });
      if(!retry){
        await page.clock.runFor(900);assert.equal(await call.textContent(),'2');
        const frozen=()=>page.evaluate(()=>[depot.matchFrames,depot.time,depot.dogs[0].damage,depot.foes[0].hp,
          depot.foes[0].time,depotView.cupOpening.remaining]);
        const before=await frozen();
        assert.deepEqual(before.slice(0,5),[0,0,0,170,0]);
        await page.locator('#pause').click();await page.clock.runFor(900);assert.deepEqual(await frozen(),before);
        await page.locator('[data-do=resume]').click();
        await page.clock.runFor(440);
        if(!pad)await page.screenshot({path:'cup-boss-arrival-'+device+'.png'});
      }
      // Run up to the last five frames. The same released button must reach the first gameplay tick on every device.
      for(let i=0;i<90;i++){
        if(await page.evaluate(()=>window.depotView?.cupOpening?.remaining<=.085))break;
        await page.clock.runFor(16);
      }
      assert(await page.evaluate(()=>depotView.cupOpening.remaining>0 && depotView.cupOpening.remaining<=.085));
      if(pad){await page.evaluate(()=>jump(true));await page.clock.runFor(16);await page.evaluate(()=>jump(false));}
      else if(phone)await page.locator('[data-touch=jump]').tap();
      else await page.keyboard.press('Space');
      await page.clock.runFor(160);
      assert.deepEqual(await page.evaluate(()=>liveFrames),[['GO!',true]]);
      assert(await page.evaluate(()=>depot.dogs[0].ground<0 && depot.dogs[0].stocks===3));
      const poses=await page.evaluate(()=>[...new Set(window.poses)]);
      assert.deepEqual(poses,phone || retry?['idle']:['walk','windup','strike','idle']);
      await page.clock.runFor(420);
      assert.equal(await call.textContent(),'');assert(await page.locator('#dispatch-orders').isVisible());
      assert(!(await page.locator('#dispatch-marks').isVisible()));
      if(!retry)await page.reload();
    }
  }finally{await page.close();}
}
async function main(){
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try {await playCup(browser);await mobileAndFilms(browser);await returningFighter(browser);
    for(const device of ['desktop','phone','pad'])await bossEntrance(browser,device);assert.deepEqual(errors,[]);}
  finally {await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
