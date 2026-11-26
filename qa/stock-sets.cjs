const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if(process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw new Error('Run browser and input checks on the hosted Linux runner.');
const {chromium} = require('playwright-core');
const root='http://127.0.0.1:8080/';
const errors=[];
async function device(browser,mobile,hash) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1160,height:760},
    isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(e.message));
  // Use the shipped PeerJS client and native WebRTC with a signaling service on this runner.
  await page.route('**/vendor/peerjs-1.5.5.min.js',async route=>{
    const res=await route.fetch();
    await route.fulfill({response:res,body:(await res.text())+
      "\nwindow.Peer=class extends window.Peer {constructor(id,options){super(id,{...options,host:'127.0.0.1',port:9001,path:'/df3',secure:false,config:{iceServers:[]}});window.signalingPeer=this;}};"});
  });
  await page.goto(root+hash);
  await observe(page);
  return {page,mobile,press:selector=>mobile?page.locator(selector).tap():page.locator(selector).click()};
}
async function observe(page) {
  await page.evaluate(()=>{
    const art=DogArt;
    window.DogArt={...art,draw(ctx,kind,x,y,options){
      if(ctx.canvas.classList?.contains('victory-shot')) window.lastPodium={kind,coat:options.coat};
      return art.draw(ctx,kind,x,y,options);
    }};
    function observeScore(score){
      const update=score.Player.prototype.update;
      score.Player.prototype.update=function(...args){
        window.observedScore=this;
        return update.apply(this,args);
      };
    }
    if(window.YardScore)observeScore(window.YardScore);
    else Object.defineProperty(window,'YardScore',{configurable:true,set(score){
      Object.defineProperty(window,'YardScore',{value:score,writable:true,configurable:true});
      observeScore(score);
    }});
    const proto=DogFight.Battle.prototype,step=proto.step,cpu=proto.cpu;
    proto.step=function(...args){
      window.observedBattle=this;
      if(window.watchJumps) for(const i of [0,1]) if(args[i+1]?.jump)window.watchJumps[i]=true;
      if(!window.firstControl)window.firstControl={x:args[1].x,grab:args[1].grab,grabTap:!!args[1].tapped?.grab};
      return step.apply(this,args);
    };
    proto.cpu=function(...args){
      if(window.runCpuOff && this.mode==='solo'){
        const [a,b]=this.dogs;
        return {...DogFight.idleInput,x:Math.sign(b.x-a.x)||1,y:b.ground<0?1:0};
      }
      return cpu.apply(this,args);
    };
  });
}
async function fresh(device,game,score){
  const {page}=device;
  await page.waitForFunction(([g,s])=>!document.querySelector('#dialog').open &&
    document.querySelector('#match-set').textContent==='Game '+g+' · '+s,[game,score]);
  assert(await page.locator('#match-set').isVisible());
  assert.deepEqual(await page.locator('#hud .lives').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label'))),['3 stocks','3 stocks']);
}
async function leaveThreeStocks(device,slot,resultSelector='#set-score') {
  const {page,mobile}=device, result=page.locator(resultSelector);
  const touch=mobile && await page.context().newCDPSession(page);
  let held='';
  async function direction(next) {
    if(held===next)return;
    if(held){
      if(mobile)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      else await page.keyboard.up(held);
    }
    held=next;
    if(!held)return;
    if(mobile){
      const b=await page.locator('[data-touch="'+held+'"]').boundingBox();
      assert(b);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});
    }else await page.keyboard.down(held);
  }
  try {
    const end=Date.now()+46000;
    while(Date.now()<end && !await result.isVisible()){
      const side=await page.evaluate(i=>{const w=window.observedBattle;return w && w.dogs[i].x<w.dogs[1-i].x?'left':'right';},slot);
      await direction(mobile?side:side==='left'?'a':'d');
      await page.waitForTimeout(100);
    }
    if(!await result.isVisible()){
      const state=await page.evaluate(()=>({stage:document.querySelector('#match-stage').textContent,
        status:document.querySelector('#online-status').textContent,call:document.querySelector('#countdown').textContent,
        hidden:document.hidden,dialog:document.querySelector('#dialog').open && document.querySelector('#dialog-title').textContent,
        active:[...document.querySelectorAll('.touch-pad .held')].map(el=>el.dataset.touch),
        dogs:window.observedBattle?.dogs.map(f=>[f.x,f.y,f.ground,f.prev.x,f.stocks])}));
      assert.fail('Unfinished stock game '+JSON.stringify(state));
    }
  }finally{await direction('');if(touch)await touch.detach();}
}
async function counterweightOpening(browser){
  const page=await browser.newPage({viewport:{width:1160,height:760},reducedMotion:'reduce'});
  try{
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root+'#solo/canal/counterweights');
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      window.liftRide=[];
      DogFight.Battle.prototype.step=function(...args){
        const result=step.apply(this,args),f=this.dogs[0];
        if(f.ground===1)liftRide.push([f.y,this.terrain[1].y]);
        return result;
      };
    });
    assert.deepEqual(await page.locator('#hud .lives').evaluateAll(es=>es.map(el=>el.getAttribute('aria-label'))),['3 stocks','3 stocks']);
    await page.clock.runFor(2530);
    await page.keyboard.down('Space');await page.clock.runFor(430);await page.keyboard.up('Space');
    await page.clock.runFor(960);
    const ride=await page.evaluate(()=>liftRide);
    assert(ride.length>=8);assert(ride.every(([feet,top])=>feet===top));
    assert(Math.abs(ride[0][0]-ride.at(-1)[0])>1);
  }finally{await page.close();}
  const phone=await device(browser,true,'#solo');
  try{
    await phone.press('#choose-stage');await phone.press('[data-stage-form=counterweights]');
    const boxes=await phone.page.locator('[data-stage-form]').evaluateAll(els=>els.map(el=>{
      const range=document.createRange();range.selectNodeContents(el);
      const text=range.getBoundingClientRect(),box=el.getBoundingClientRect();
      return {fits:text.left>=box.left && text.right<=box.right,height:box.height,top:box.top};
    }));
    assert.equal(boxes.length,4);assert(boxes.every(b=>b.fits && b.height>=44));assert(boxes[2].top>boxes[0].top);
    await phone.press('[data-stage=canal]');assert.match(await phone.page.locator('#stage-title').textContent(),/Counterweights/);
  }finally{await phone.page.close();}
}
async function soloAndLocal(browser){
  const d=await device(browser,false,'#solo'),{page,press}=d;
  const lips=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=1200;canvas.height=675;
    const ctx=canvas.getContext('2d',{willReadFrequently:true}), result=[];
    const color=(x,y)=>[...ctx.getImageData(x,y,1,1).data.slice(0,3)].map(n=>n.toString(16).padStart(2,'0')).join('');
    for(const stage of Object.keys(DogFight.arenas)) for(const form of ['flat','trio','counterweights']){
      for(const time of form==='counterweights'?[0,2,6]:[1.7]){
        const floors=DogFight.platforms(DogFight.stageGeometry(stage,form),time);
        ArenaArt.draw(ctx,stage,time,undefined,form);
        for(const f of floors) result.push([stage,form,color(f.x1+1,f.y),color(f.x2-2,f.y)]);
      }
    }
    return result;
  });
  const colors={picnic:'ffe3ab',laundry:'e8b5aa',canal:'ffe09a',nightmail:'f1c182',bandstand:'ffdfa0'};
  for(const [stage,form,left,right] of lips){
    const expected=stage==='nightmail' && form==='flat'?'ffe3a6':colors[stage];
    assert.deepEqual([left,right],[expected,expected],stage+' '+form+' art lines up with both collision edges');
  }
  await press('[data-mode=local]');await press('#choose-stage');
  await press('[data-stage-form=counterweights]');await press('[data-stage=canal]');
  assert.match(await page.locator('#stage-title').textContent(),/Canal Lock · Counterweights/);
  await page.reload();await observe(page);
  assert.match(await page.locator('#stage-title').textContent(),/Canal Lock · Counterweights/);
  await press('#choose-stage');
  await press('[data-stage-form=trio]');await press('[data-stage=laundry]');
  await press('#choose-stage');await press('[data-stage-form=flat]');await page.keyboard.press('Escape');
  assert.match(await page.locator('#stage-title').textContent(),/Laundry Line · Three platforms/);
  await page.reload();await observe(page);
  assert.match(await page.locator('#stage-title').textContent(),/Laundry Line · Three platforms/);
  await press('[data-mode=local]');await press('#rules-label');await press('[data-format=set]');
  assert.match(await page.locator('#start').textContent(),/Start set/);
  await press('#start');await fresh(d,1,'0–0');
  await page.keyboard.down('d');await page.keyboard.press('u');
  await page.waitForFunction(()=>!!window.firstControl);
  assert.deepEqual(await page.evaluate(()=>window.firstControl),{x:1,grab:false,grabTap:false});
  await page.keyboard.up('d');
  await page.evaluate(()=>window.observedBattle=null);
  await press('#pause');await press('[data-do=rematch]');await fresh(d,1,'0–0');
  await page.waitForFunction(()=>window.observedBattle?.matchFrames>2);
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.observedBattle.dogs[0].ground===1);
  await page.keyboard.up('Space');
  await leaveThreeStocks(d,0);
  assert.match(await page.locator('#set-score').textContent(),/P1 0 – 1 P2/);
  await press('[data-do=match-card]');
  const recap=await page.locator('.card-timeline').innerText();
  await press('[data-record-drill="0"]');
  await press('#return-fight');
  assert.equal(await page.locator('.card-timeline').innerText(),recap);
  await press('[data-do=card-back]');
  assert.match(await page.locator('#set-score').textContent(),/P1 0 – 1 P2/);
  await press('[data-do=set-pick]');await page.keyboard.press('Escape');
  assert.equal(await page.locator('.set-history li').count(),1);
  await press('[data-do=set-pick]');
  const pickButton=(i,action)=>'[data-seat="'+i+'"] [data-action="'+action+'"]';
  await press(pickButton(1,'lock'));
  assert(await page.locator(pickButton(1,'next')).isDisabled());
  await press(pickButton(0,'lock'));await press(pickButton(0,'prev'));await press(pickButton(0,'prev'));
  assert.equal(await page.locator('[data-seat="0"] [data-name]').textContent(),'Canal Lock');
  await press(pickButton(0,'lock'));await fresh(d,2,'0–1');
  assert.equal(await page.locator('#match-stage').textContent(),'Canal Lock · Three platforms');
  await press('#pause');await press('[data-do=rematch]');await fresh(d,2,'0–1');
  await page.goto(root+'?solo-set#solo/best-of-three');await observe(page);await fresh(d,1,'0–0');
  // Feed the solo CPU a controlled walk-off, preserving all three stock and respawn transitions.
  await page.evaluate(()=>window.runCpuOff=true);
  await page.locator('[data-do=cpu-counterpick]').waitFor({timeout:35000});
  assert.match(await page.locator('#dialog-body').textContent(),/Brisket picks Night Mail/);
  await press('[data-do=watch-finish]');await press('#clip-practice');
  await press('#pause');await press('[data-do=return-fight]');
  assert.match(await page.locator('#set-score').textContent(),/P1 1 – 0 CPU/);
  assert.equal(await page.locator('.set-history li').count(),1);
  await press('[data-do=cpu-counterpick]');await fresh(d,2,'1–0');
  await page.locator('[data-do=new-set]').waitFor({timeout:35000});
  assert.match(await page.locator('#set-score').textContent(),/P1 2 – 0 CPU/);
  await press('[data-do=new-set]');await fresh(d,1,'0–0');
  assert.equal(await page.locator('#match-stage').textContent(),'Picnic Table');
  await page.goto(root+'?card#solo/last-stock');await observe(page);
  await page.evaluate(()=>window.runCpuOff=true);
  await page.getByRole('button',{name:'Match stats'}).waitFor({timeout:30000});
  await press('[data-do=match-card]');
  assert.match(await page.locator('.card-timeline').textContent(),/CPU Brisket out at 125%/);
  assert.equal(await page.locator('.card-stats tr').filter({hasText:'Damage dealt'}).locator('td').first().textContent(),'0%');
  assert.equal(await page.locator('[data-card-game]').count(),0);
  await press('[data-do=card-back]');await press('[data-do=rematch]');
  await page.waitForFunction(()=>window.observedBattle?.end===null && window.observedBattle.matchFrames>0);
  assert.equal(await page.evaluate(()=>window.observedBattle.matchCard.losses.length),0);
  await page.close();console.log('Couch counterpick, game-two restart and solo CPU counterpick passed.');
}
async function rivalSet(browser) {
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  await page.goto(root + '#solo');
  await page.locator('#cpu-level').click();
  await page.locator('[data-do=shield-read-set]').click();
  await page.evaluate(() => {
    const proto = DogFight.Battle.prototype, step = proto.step, block = proto.block;
    let active, respond = false;
    window.openingHabits = [];
    proto.block = function(...args) {
      const result = block.apply(this,args);
      if (args[0].index === 0) respond = true;
      return result;
    };
    proto.step = function(...args) {
      if (this !== active) {
        active = this;
        respond = false;
        window.openingHabits.push(this.bot.shieldHabit ? {...this.bot.shieldHabit} : null);
      }
      const result = step.apply(this,args), [p,q] = this.dogs;
      if (p.floorAction?.type === 'shieldRoll') respond = false;
      window.rollState = {x:p.x, gap:q.x-p.x, ready:p.ground >= 0 && !p.grip && !p.floorAction,
        respond, caught:this.bot.rollPunishes || 0, stocks:p.stocks, ended:this.end !== null};
      return result;
    };
  });
  await page.clock.runFor(2450);
  let held = [];
  async function hold(next) {
    for (const key of held.filter(k => !next.includes(k))) await page.keyboard.up(key);
    for (const key of next.filter(k => !held.includes(k))) await page.keyboard.down(key);
    held = next;
  }
  for (let frame = 0; frame < 900; frame++) {
    const state = await page.evaluate(() => window.rollState);
    if (state?.caught) break;
    let next = [];
    if (state?.ready) {
      const toward = state.gap > 0 ? 'd' : 'a', away = state.gap > 0 ? 'a' : 'd';
      next = state.respond ? ['l',away] : Math.abs(state.gap) > 120 ? [toward] : ['l'];
    }
    await hold(next);
    await page.clock.runFor(16);
  }
  assert.equal(await page.evaluate(() => window.rollState?.caught),1,'Noodle catches a repeated roll in game one');
  await hold([]);
  await page.locator('#pause').click();
  assert.match(await page.locator('#dialog-body').textContent(),/grabbed you during roll recovery 1 time/);
  await page.locator('[data-do=resume]').click();
  for (let i = 0; i < 240; i++) {
    const state = await page.evaluate(() => window.rollState);
    if (state.ended) break;
    await hold([state.x < 600 ? 'a' : 'd']);
    await page.clock.runFor(160);
  }
  await hold([]);
  await page.clock.runFor(1600);
  assert.match(await page.locator('#dialog-body').textContent(),/roll away after consecutive blocks.*remember/);
  await page.getByRole('button',{name:'Match stats'}).click();
  assert.match(await page.locator('.card-stage').textContent(),/Game 1/);
  assert.match(await page.getByRole('table',{name:'Fighter stats'}).textContent(),/CPU.*Noodle/);
  assert((await page.locator('.card-timeline li').count())>=3);
  assert.match(await page.locator('.card-timeline').textContent(),/Last hit at/);
  assert((await page.getByRole('row',{name:/Hits blocked/}).locator('td').first().textContent())>0);
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button',{name:'Match stats'}).evaluate(el=>el===document.activeElement));
  await page.locator('[data-do=set-pick]').click();
  await page.locator('[data-stage=canal]').click();
  await page.clock.runFor(3200);
  assert.equal(await page.locator('#match-set').textContent(),'Game 2 · 0–1');
  const habits = await page.evaluate(() => window.openingHabits);
  assert.equal(habits[0],null);
  assert.equal(habits[1].escape,'away');
  assert.equal(habits[1].count,2);
  await page.locator('#pause').click();
  await page.locator('[data-do=rematch]').click();
  await page.clock.runFor(3200);
  assert.deepEqual(await page.evaluate(() => window.openingHabits[2]),habits[1]);
  await page.close();
  console.log('Noodle caught the repeated keyboard roll and remembered it after a three-stock counterpick and restart.');
}
async function onlineSet(browser,phoneBrowser) {
  const host=await device(browser,false,'#controls'), guest=await device(phoneBrowser,true,'#controls');
  const {page:a}=host,{page:b}=guest;
  for(const [d,key] of [[host,'q'],[guest,'v']]){
    await d.press('[data-key="jump"]');await d.page.keyboard.press(key);
    await d.page.goto(root+'?custom-key'+(d===host?'#online/best-of-three':'#online'));await observe(d.page);
    await d.press('#online-coat');await d.press('[data-coat="2"]');
  }
  assert.equal(await a.locator('#online-format').getAttribute('aria-pressed'),'true');
  await a.selectOption('#online-stage','laundry');await a.selectOption('#online-form','flat');
  await host.press('#online-create');
  await a.locator('#online-invite').waitFor();
  const roomCode=await a.locator('#online-room-code').textContent();
  await guest.press('#open-code-pad');
  for(const letter of roomCode)await guest.press('[data-letter="'+letter+'"]');
  assert.equal(await b.locator('#room-digits').textContent(),roomCode);
  await guest.press('#code-join');
  for(const d of [host,guest])await fresh(d,1,'0–0');
  for(const d of [host,guest]){
    await d.page.waitForFunction(()=>window.observedBattle?.matchFrames>12);
    assert.deepEqual(await d.page.evaluate(()=>[0,1].map(i=>observedBattle.coatFor(i))),[2,3]);
    assert.deepEqual(await d.page.evaluate(()=>[window.observedBattle.stage,window.observedBattle.form,window.observedBattle.terrain.length]),['laundry','flat',1]);
    await d.page.evaluate(()=>{window.watchJumps=[false,false];});
  }
  await a.keyboard.down('q');await b.keyboard.down('v');
  for(const d of [host,guest])await d.page.waitForFunction(()=>window.watchJumps.every(Boolean));
  await a.keyboard.up('q');await b.keyboard.up('v');
  const lineups=[
    [{kind:'pip',coat:2},{kind:'pip',coat:3}],
    [{kind:'pip',coat:2},{kind:'noodle',coat:1}],
    [{kind:'noodle',coat:3},{kind:'noodle',coat:1}],
  ];
  for(const [i,loser] of [guest,host,guest].entries()){
    const winner=loser===host?guest:host,slot=loser===host?0:1;
    await leaveThreeStocks(loser,slot);
    for(const d of [loser,winner]){
      await d.page.locator('#set-score').waitFor();
      assert.deepEqual(await d.page.evaluate(()=>window.lastPodium),lineups[i][1-slot]);
      await d.page.waitForFunction(winningSlot=>window.observedScore?.track==='win-'+window.observedBattle?.dogs[winningSlot].kind,1-slot);
    }
    assert.equal(await a.locator('#set-score').textContent(),await b.locator('#set-score').textContent());
    assert.equal(await b.locator('.set-history li').count(),i+1);
    const cards=[];
    for(const d of [host,guest]){
      const archive=await d.page.evaluate(()=>new FightRecords.Book(localStorage).list().map(r=>r.entry).filter(e=>e.mode==='online'));
      assert.equal(archive.length,i+1);
      assert.deepEqual([archive[0].round,archive[0].winner,archive[0].side],[i+1,1-slot,d===host?0:1]);
      assert.equal(archive[0].card.losses.length,3);
      assert.deepEqual(archive[0].card.players.map(({kind,coat})=>({kind,coat})),lineups[i]);
      await d.press('[data-do=match-card]');
      assert.equal(await d.page.locator('[data-record-drill]').count(),0);
      assert.match(await d.page.locator('.card-stage').textContent(),new RegExp('Game '+(i+1)));
      if(i===2){
        await d.press('[data-card-game="0"]');
        assert.match(await d.page.locator('.card-stage').textContent(),/Game 1 · Laundry Line · Flat/);
      }
      const rows=await d.page.locator('.card-timeline li').allTextContents();
      assert(await d.page.locator('.card-stats thead img').evaluateAll((els,lineup)=>els.length===2 &&
        els.every((el,i)=>el.src===DogArt.portrait(lineup[i].kind,lineup[i].coat)),lineups[i===2?0:i]));
      assert.equal(rows.length,3);
      assert(rows.every(s=>s.includes('blast line') && s.includes('No hits taken')));
      const stats=await d.page.locator('.card-stats tbody').innerText();
      cards.push({rows,stats});
      assert(await d.page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await d.press('[data-do=card-back]');
    }
    assert.deepEqual(cards[0],cards[1]);
    if(i===0){
      const scores=[];
      const firstFalls=[];
      const fullScores=[];
      for(const d of [host,guest]){
        await d.press('[data-do=watch-match]');
        await d.page.locator('#clip-seek').press('Home');
        await d.press('#film-forward');
        assert.equal(await d.page.locator('#clip-seek').inputValue(),'300');
        const early=await d.page.locator('#clip-scores').textContent();
        await d.page.locator('#clip-seek').press('End');
        assert.equal(await d.page.locator('#film-marks button').count(),3);
        fullScores.push([early,await d.page.locator('#clip-seek').inputValue(),await d.page.locator('#clip-scores').textContent()]);
        await d.press('#film-back');
        await d.press('[data-do=ko-replays]');
        assert.equal(await d.page.locator('[data-ko]').count(),3);
        await d.press('[data-ko="0"]');
        await d.page.locator('#clip-seek').press('End');
        const firstFall=await d.page.locator('#clip-scores').textContent();
        assert.match(firstFall,/2 stocks/);firstFalls.push(firstFall);
        await d.press('[data-do=clip-back]');await d.press('#ko-list-back');
        await d.press('[data-do=watch-finish]');
        assert.equal(await d.page.locator('#clip-practice').count(),0);
        await d.page.locator('#clip-seek').press('End');
        assert.match(await d.page.locator('#clip-frame').textContent(),/Frame 240 \/ 240/);
        scores.push(await d.page.locator('#clip-scores').textContent());
        await d.press('[data-do=clip-back]');
      }
      assert.equal(scores[0],scores[1]);
      assert.deepEqual(fullScores[0],fullScores[1]);
      assert.equal(firstFalls[0],firstFalls[1]);
      await guest.press('[data-do=practice-finish]');
      await guest.press('[data-finish-slot="1"]');
      await b.getByRole('heading',{name:'Exchange complete'}).waitFor();
      assert.equal(await b.locator('.finish-comparison tbody tr').count(),2);
      assert(await a.locator('[data-do=match-card]').isVisible());
      await guest.press('[data-do=trial-results]');
      assert(await b.locator('[data-do=match-card]').isVisible());
    }
    if(i<2){
      await loser.press('[data-do=set-pick]');
      if(i===0){
        await winner.press('[data-do=online-rematch]');
        await loser.page.getByText('Your opponent is ready.',{exact:true}).waitFor();
        assert(await loser.page.locator('[data-room-coat="2"]').isDisabled());
      }
      await loser.press('[data-room-dog=noodle]');
      if(i===1)assert(await loser.page.locator('[data-room-coat="1"]').isDisabled());
      assert(await loser.page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      const chosenCoat=i===0?1:3;
      await loser.press('[data-room-coat="'+chosenCoat+'"]');await loser.press('[data-do=room-stage]');
      await loser.press('[data-do=room-fighter-back]');
      assert.equal(await loser.page.locator('[data-room-coat][aria-pressed=true]').getAttribute('data-room-coat'),String(chosenCoat));
      await loser.press('[data-do=room-stage]');await loser.press(i===0?'[data-stage=bandstand]':'[data-stage=nightmail]');
      if(i===1){
        await winner.page.waitForFunction(()=>document.querySelector('#net-rematch-status')?.textContent.includes('Noodle · Night Mail'));
        await winner.press('[data-do=online-rematch]');
      }
      for(const d of [host,guest])await fresh(d,i+2,i===0?'1–0':'1–1');
    }else{
      assert.match(await a.locator('#set-score').textContent(),/P1 2 – 1 P2/);
      await guest.press('[data-do=online-rematch]');await host.press('[data-do=online-rematch]');
      for(const d of [host,guest]){await fresh(d,1,'0–0');assert.equal(await d.page.locator('#match-stage').textContent(),'Laundry Line · Flat');}
      for(const d of [host,guest])await d.page.waitForFunction(()=>observedBattle?.stage==='laundry' &&
        observedBattle.dogs.every(f=>f.kind==='noodle') && observedBattle.coatFor(0)===3 && observedBattle.coatFor(1)===1);
    }
  }
  for(const d of [host,guest]){
    await d.page.goto(root+'?finished-set#records');
    assert.equal(await d.page.locator('[data-record-id]').count(),3);
    await d.press('[data-record-id]:first-child');
    await d.page.locator('[data-saved-clip=finish]').waitFor();
    assert.equal(await d.page.locator('[data-saved-clip][data-ko-slot]').count(),3);
    await d.press('[data-saved-clip=finish]');await d.page.locator('#clip-seek').press('End');
    assert.match(await d.page.locator('#clip-scores').textContent(),/Noodle/);
    await d.press('[data-do=clip-back]');await d.page.locator('[data-saved-clip=finish]').waitFor();
    const you=await d.page.locator('.card-stats thead small').allTextContents();
    assert(you[d===host?0:1].includes('YOU'));
    if(d===guest){
      await d.press('[data-record-drill="1"]');await d.press('#return-fight');
      assert.equal(await d.page.locator('#dialog').getAttribute('data-view'),'record-card');
    }
    await d.page.goto(root+'?quick-coats#online');await observe(d.page);
    await d.press('#online-coat');await d.press(d===host?'[data-coat="3"]':'[data-coat="1"]');
  }
  await guest.press('#online-quick');await guest.press('#online-warmup');
  assert.match(await b.locator('#match-set').innerText(),/Searching/);
  await guest.press('[data-touch=attack]');
  await b.waitForFunction(()=>window.observedBattle?.warmupPartner && observedBattle.dogs[1].damage>0);
  await guest.press('#pause');await guest.press('#warmup-cancel');
  assert.match(await b.locator('#online-status').innerText(),/canceled/);
  await guest.press('#online-quick');await guest.press('#online-warmup');
  await host.press('#online-quick');
  for(const d of [host,guest]){
    await d.page.waitForFunction(()=>window.observedBattle?.matchFrames>2);
    const side=(await d.page.locator('#match-mode').textContent()).includes('P1')?0:1;
    const own=d===host?3:1;
    assert.deepEqual(await d.page.evaluate(i=>[observedBattle.coatFor(i),observedBattle.coatFor(1-i)],side),[own,4-own]);
  }
  const desktopSlot=(await a.locator('#match-mode').textContent()).includes('P1')?0:1;
  await leaveThreeStocks(host,desktopSlot,'[data-do=online-rematch]');
  await guest.press('[data-do=rematch-fighters]');await guest.press('[data-room-dog=brisket]');
  await guest.press('[data-do=ready-fighter]');
  await a.waitForFunction(()=>document.querySelector('#net-rematch-status')?.textContent.includes('wants a rematch'));
  await host.press('[data-do=online-rematch]');
  for(const d of [host,guest]){
    await d.page.waitForFunction(i=>observedBattle.dogs[i].kind==='brisket' && observedBattle.matchFrames>1,1-desktopSlot);
    assert.deepEqual(await d.page.evaluate(i=>[observedBattle.dogs[i].kind,observedBattle.coatFor(i),observedBattle.stockCount],desktopSlot),['pip',3,3]);
  }
  await b.close();await a.close();console.log('Desktop and mobile peers agreed on fighter counterpicks, coats, records, set rematch and Quickplay.');
}
async function timedBattles(browser,phone){
  const local=await device(browser,false,'#solo');
  await local.press('[data-mode=local]');
  await local.press('#rules-label');await local.press('[data-scoring=time]');
  assert(await local.page.locator('[data-do=final-count]').isVisible());
  assert(await local.page.locator('[data-opening=defend]').isVisible());
  assert(await local.page.locator('[data-opening=chase]').isVisible());
  assert.equal(await local.page.locator('[data-minutes="0"]').count(),0);
  await local.press('[data-opening=chase]');
  await expectHud(local,['-1 point','0 points']);
  assert.equal(await local.page.locator('#match-clock').textContent(),'0:10');
  await local.page.goto(root+'?after-clock-opening#solo');await observe(local.page);
  await local.press('[data-mode=local]');await local.press('#rules-label');
  await local.press('[data-minutes="1"]');
  await local.page.reload();await observe(local.page);
  assert.match(await local.page.locator('#rules-label').innerText(),/Time Battle · 1 min/);
  await local.press('[data-mode=local]');await local.press('#start');
  async function expectHud(d,points){
    await d.page.waitForFunction(values=>{
      const lives=[...document.querySelectorAll('#hud .lives')];
      return lives.length===2 && lives.every((e,i)=>e.textContent===values[i]);
    },points);
  }
  const zero=['0 points','0 points'], behind=['-1 point','0 points'];
  await expectHud(local,zero);
  await local.page.keyboard.down('a');
  try{await expectHud(local,behind);}finally{await local.page.keyboard.up('a');}
  await local.page.goto(root+'?solo-direct#solo/time-battle');
  await expectHud(local,zero);
  assert.match(await local.page.locator('#match-mode').textContent(),/Solo.*Time Battle/);
  await local.page.close();

  const host=await device(browser,false,'#online'), guest=await device(phone,true,'#online');
  await host.press('#online-create');await host.press('#online-warmup');
  await host.page.waitForFunction(()=>window.observedBattle?.warmupPartner==='stand');
  await host.page.evaluate(()=>signalingPeer.disconnect());
  await host.page.locator('#online-actions').waitFor();
  assert.match(await host.page.locator('#online-status').innerText(),/Lost contact with matchmaking/);
  assert(await host.page.locator('#match').isHidden());
  await host.press('#online-coat');await host.press('[data-coat="2"]');
  await host.page.selectOption('#online-rules','1');await host.page.selectOption('#online-stage','picnic');
  await host.page.selectOption('#online-form','flat');
  await host.press('#online-create');await host.page.locator('#online-invite').waitFor();
  assert.match(await host.page.locator('#online-rules-summary').textContent(),/Time Battle · 1 min/);
  const code=await host.page.locator('#online-room-code').textContent();
  await host.page.evaluate(()=>{window.observedBattle=null;});
  await host.press('#online-warmup');
  const p=host.page;
  await p.waitForFunction(()=>window.observedBattle?.warmupPartner==='stand');
  assert.equal(await p.locator('#match-set').textContent(),'Room '+code);
  assert.equal(await p.locator('#training-tools').isVisible(),false);
  assert.deepEqual(await p.evaluate(()=>[observedBattle.form,observedBattle.terrain.length,observedBattle.coatFor(0)]),['flat',1,2]);
  await p.keyboard.press('j');await p.waitForFunction(()=>observedBattle.dogs[1].damage>0);
  await host.press('#pause');await host.press('[data-warmup-partner=shield]');
  await p.waitForFunction(()=>observedBattle.dogs[1].shield && observedBattle.dogs[1].damage>0);
  await host.press('#pause');await host.press('#warmup-reset');
  await p.waitForFunction(()=>observedBattle.warmupPartner==='shield' && observedBattle.dogs.every(d=>d.damage===0));
  await host.press('#pause');await host.press('#warmup-lobby');
  assert.equal(await p.locator('#online-room-code').innerText(),code);
  assert(await p.locator('#online-copy').isVisible());
  await host.press('#online-warmup');
  await p.evaluate(()=>{
    window.warmPad={index:0,id:'Warm-up pad',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[warmPad]});
    warmPad.buttons[9].pressed=true;
  });
  await p.locator('#warmup-status').waitFor();
  await p.evaluate(()=>{warmPad.buttons[9].pressed=false;});
  await host.press('[data-warmup-partner=spar]');
  await p.waitForFunction(()=>observedBattle.warmupPartner==='spar' && observedBattle.dogs[0].damage>0);
  await host.press('#pause');
  await guest.press('#open-code-pad');
  for(const letter of code)await guest.press('[data-letter="'+letter+'"]');
  await guest.press('#code-join');
  await p.locator('#countdown.opponent-found').waitFor();
  assert.equal(await p.locator('#dialog').evaluate(el=>el.open),false);
  for(const d of [host,guest])await expectHud(d,zero);
  for(const d of [host,guest]){
    await d.page.waitForFunction(()=>window.observedBattle?.mode==='local' && observedBattle.matchFrames>0);
    assert.deepEqual(await d.page.evaluate(()=>[observedBattle.form,observedBattle.coatFor(0),!!observedBattle.warmupPartner,
      ...observedBattle.dogs.map(f=>f.damage)]),['flat',2,false,0,0]);
  }
  await host.page.keyboard.down('a');
  try{await expectHud(host,behind);}finally{await host.page.keyboard.up('a');}
  await expectHud(guest,behind);
  for(const d of [host,guest]){
    await d.page.locator('[data-do=online-rematch]').waitFor({timeout:105000});
    assert.match(await d.page.locator('#dialog-body').innerText(),/P1 -1 point \/ P2 0 points/);
    await d.press('[data-do=match-card]');
    assert.match(await d.page.locator('.card-stats').innerText(),/Regulation points/);
    assert.match(await d.page.locator('.card-timeline').innerText(),/Self-destruct/);
    await d.press('[data-do=card-back]');
  }
  await host.press('[data-recovery-seat="0"]');
  await host.page.locator('#recovery-play').waitFor();
  assert.match(await host.page.locator('#recovery-route').innerText(),/recorded inputs/);
  assert.equal(await guest.page.locator('[data-do=coach-fall]').count(),0);
  await guest.press('[data-do=ko-replays]');await guest.press('[data-ko]');
  await guest.press('[data-clip-recovery="0"]');await guest.page.locator('#recovery-demo').waitFor();
  await guest.press('#recovery-demo');
  await guest.page.waitForFunction(()=>document.querySelector('#recovery-cue')?.textContent.includes('point saved'));
  await guest.press('#recovery-back');await guest.press('[data-do=clip-back]');await guest.press('#ko-list-back');
  await host.press('#recovery-play');await host.page.waitForFunction(()=>document.querySelector('#countdown')?.textContent==='Your move');
  await host.page.keyboard.down('d');await host.page.keyboard.down('Space');
  await host.page.locator('[data-do=trial-results]').waitFor();
  await host.page.keyboard.up('Space');await host.page.keyboard.up('d');
  assert.equal(await host.page.locator('#dialog-title').textContent(),'Point saved!');
  await host.press('[data-do=trial-results]');
  await host.press('[data-do=online-rematch]');await guest.press('[data-do=online-rematch]');
  for(const d of [host,guest]){
    await expectHud(d,zero);
    assert.match(await d.page.locator('#match-mode').textContent(),/Time Battle/);
  }
  console.log('Solo, saved local rules, private WebRTC scoring, two result cards and rematch passed.');
}
async function packRelay(browser){
  const desktop=await device(browser,false,'#solo'),{page:p,press}=desktop;
  const seat=(i,k)=>'[data-relay-seat="'+i+'"][data-relay-slot="'+k+'"]';
  await press('[data-mode=local]');await press('#rules-label');await press('[data-do=pack-relay]');
  await press(seat(0,1));await press('[data-relay-kind=noodle]');
  assert.match(await p.locator(seat(0,2)).innerText(),/Brisket/);
  await press(seat(0,1));await press('[data-relay-kind=clover]');
  await p.selectOption('#relay-stage','nightmail');await p.selectOption('#relay-form','flat');await p.selectOption('#relay-clock','3');
  await press('#relay-play');
  await p.waitForFunction(()=>window.observedBattle?.matchFrames>1);
  assert.match(await p.locator('#match-mode').textContent(),/Pack Relay/);
  assert.equal(await p.locator('#hud .lives img').count(),6);
  const team=['pip','clover','brisket'];
  assert.deepEqual(await p.evaluate(()=>observedBattle.relayTeams[0]),team);
  await p.keyboard.down('d');
  try{await p.waitForFunction(()=>Math.abs(observedBattle.dogs[0].x-observedBattle.dogs[1].x)<72);}
  finally{await p.keyboard.up('d');}
  for(let i=0;i<10 && !await p.evaluate(()=>observedBattle.dogs[1].damage);i++){
    await p.keyboard.press('j');await p.waitForTimeout(130);
  }
  const damage=await p.evaluate(()=>observedBattle.dogs[1].damage);assert(damage>0);
  for(let stocks=3;stocks>0;stocks--){
    await p.keyboard.down('a');
    try{await p.waitForFunction(n=>observedBattle.dogs[0].stocks<n,stocks,{timeout:20000});}
    finally{await p.keyboard.up('a');}
    assert.equal(await p.evaluate(()=>observedBattle.dogs[1].damage),damage);
    if(stocks>1){
      assert.equal(await p.evaluate(()=>observedBattle.dogs[0].kind),team[4-stocks]);
      assert.equal(await p.locator('#hud .lives').first().locator('.lost').count(),4-stocks);
    }
  }
  await p.locator('[data-do=match-card]').waitFor();
  assert.match(await p.locator('#dialog-body').innerText(),/P2’s pack wins/i);
  await press('[data-do=match-card]');
  assert.deepEqual(await p.locator('.card-timeline li strong').allTextContents(),['P1 Pip out at 0%','P1 Clover out at 0%','P1 Brisket out at 0%']);
  assert.match(await p.locator('.card-stats').innerText(),/Lead damage/);
  await press('[data-do=card-back]');await press('[data-do=pack-relay]');
  assert.match(await p.locator(seat(0,1)).innerText(),/Clover/);
  assert.equal(await p.locator('#relay-clock').inputValue(),'3');
  await p.keyboard.press('Escape');await press('[data-do=rematch]');
  await p.waitForFunction(()=>observedBattle.end===null && observedBattle.dogs.every(f=>f.stocks===3 && f.damage===0));
  await p.goto(root+'?archive#records');
  await press('[data-record-id]');await p.locator('.card-timeline').waitFor();
  assert.equal(await p.locator('.card-timeline li').count(),3);
  await press('[data-saved-clip="1"]');assert.match(await p.locator('.clip-caption').innerText(),/P1 Clover/);
  await press('[data-do=clip-back]');
  await p.goto(root+'?reload#local/pack-relay');
  assert.match(await p.locator(seat(0,1)).innerText(),/Clover/);
  await p.close();

  const touch=await device(browser,true,'#solo/pack-relay'), phone=touch.page;
  await touch.press(seat(0,0));await touch.press('[data-relay-kind=clover]');
  await phone.selectOption('#relay-cpu','rookie');
  await phone.evaluate(()=>{
    window.relayPad={index:0,id:'Relay pad',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[relayPad]});
    document.querySelector('#relay-play').focus();relayPad.buttons[0].pressed=true;
  });
  await phone.locator('#countdown').waitFor();
  await phone.evaluate(()=>{relayPad.buttons[0].pressed=false;});
  await phone.waitForFunction(()=>window.observedBattle?.matchFrames>2);
  assert.deepEqual(await phone.evaluate(()=>[observedBattle.mode,observedBattle.cpuLevel,observedBattle.dogs[0].kind]),['solo','rookie','clover']);
  await touch.press('[data-touch=jump]');await phone.waitForFunction(()=>observedBattle.dogs[0].ground<0);
  await phone.close();
  console.log('Both lineups, all three live handoffs, carryover damage, records, rematch and solo touch controls passed.');
}
async function versusRules(browser){
  const {page:p,press}=await device(browser,false,'#solo');await press('[data-mode=local]');
  await press('#rules-label');await press('[data-do=handicap]');
  assert.equal(await p.evaluate(()=>document.activeElement.id),'rules-damage-0');
  await p.selectOption('#rules-choice','preset-1');
  assert.equal(await p.locator('#rules-lives').inputValue(),'1');
  await p.locator('#rules-name').fill('Sunday finals <3');await press('#rules-save');
  const id=await p.locator('#rules-choice').inputValue();assert.match(id,/^[a-f0-9-]{36}$/);
  await p.selectOption('#rules-lives','2');await p.selectOption('#rules-damage-0','30');await p.selectOption('#rules-damage-1','80');
  await press('#rules-update');await press('#rules-share');
  const link=await p.locator('#rules-link').inputValue();
  assert.equal(new URL(link).hash,'#local/rules/stock/2/3/single/flat/off/30-80');
  await press('#rules-use');
  assert.match(await p.locator('#rules-label').textContent(),/2 stocks · 3 min/);
  assert.match(await p.locator('#slots [data-index="1"]').getAttribute('aria-label'),/80%/);
  await press('#pick-together');assert.match(await p.locator('#couch-rules').textContent(),/P1 30% \/ P2 80%/);
  for(const phase of ['Choose your fighters','Vote for the opening arena']){
    assert.equal(await p.locator('#couch-phase').textContent(),phase);
    for(const seat of [0,1])await press('[data-seat="'+seat+'"] [data-action=lock]');
  }
  await press('#couch-start');await p.waitForFunction(()=>window.observedBattle?.matchFrames>1);
  assert.deepEqual(await p.evaluate(()=>[observedBattle.form,observedBattle.fetch,observedBattle.dogs.map(f=>f.stocks)]),['flat',false,[2,2]]);
  assert.equal(await p.locator('#hud .lives i').count(),4);
  assert.deepEqual(await p.evaluate(()=>observedBattle.dogs.map(f=>f.damage)),[30,80]);
  await p.keyboard.down('a');
  try{await p.waitForFunction(()=>observedBattle.dogs[0].stocks===1);}
  finally{await p.keyboard.up('a');}
  assert.equal(await p.locator('#hud .lives').first().locator('.lost').count(),1);
  assert.equal(await p.evaluate(()=>observedBattle.dogs[0].damage),30);
  await p.keyboard.down('a');
  try{await p.locator('[data-do=match-card]').waitFor({timeout:22000});}
  finally{await p.keyboard.up('a');}
  await press('[data-do=match-card]');assert.match(await p.locator('.card-stats').textContent(),/Starting stocks22/);
  assert.match(await p.locator('.card-stats').textContent(),/Starting damage30%80%/);
  assert.equal(await p.locator('.card-timeline li').count(),2);await press('[data-do=card-back]');await press('[data-do=rematch]');
  assert.equal(await p.locator('#hud .lives[aria-label="2 stocks"]').count(),2);
  await p.waitForFunction(()=>window.observedBattle?.end===null && observedBattle.dogs[0].stocks===2);
  assert.deepEqual(await p.evaluate(()=>observedBattle.dogs.map(f=>f.damage)),[30,80]);
  await p.goto(root+'?fresh#local/rules');await p.selectOption('#rules-choice',id);
  assert.equal(await p.locator('#rules-name').inputValue(),'Sunday finals <3');assert.equal(await p.locator('#rules-lives').inputValue(),'2');
  assert.equal(await p.locator('#rules-damage-0').inputValue(),'30');
  await p.selectOption('#rules-clock','0');await p.selectOption('#rules-type','time');
  assert(await p.locator('#rules-lives').isHidden());assert.equal(await p.locator('#rules-clock').inputValue(),'3');
  assert.equal(await p.locator('#rules-clock option[value="0"]').count(),0);
  await press('#rules-remove');await press('#rules-remove');assert.equal(await p.locator('#rules-choice option[value="'+id+'"]').count(),0);
  await press('#rules-back');await p.keyboard.press('Escape');
  await p.goto(root+'?school#tutorial/first-match');
  assert.equal(await p.locator('#hud .lives[aria-label="3 stocks"]').count(),2);
  await observe(p);await p.waitForFunction(()=>window.observedBattle?.matchFrames>0);
  assert.equal(await p.evaluate(()=>observedBattle.spawnDamage),undefined);
  await p.close();
  const phone=await device(browser,true,new URL(link).hash),q=phone.page;
  assert.equal(await q.locator('#rules-choice').inputValue(),'shared');
  assert.equal(await q.locator('#rules-damage-1').inputValue(),'80');
  assert.equal(await q.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.config')||'{}').lives??3),3);
  await q.selectOption('#rules-lives','4');
  await q.evaluate(()=>{
    window.rulesPad={index:0,id:'Rules controller',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[rulesPad]});
    document.querySelector('#rules-lives').focus();rulesPad.buttons[15].pressed=true;
  });
  await q.waitForFunction(()=>document.querySelector('#rules-lives').value==='5');
  await q.evaluate(()=>{rulesPad.buttons[15].pressed=false;});
  await q.selectOption('#rules-format','set');await phone.press('#rules-use');await phone.press('#start');
  await q.waitForFunction(()=>window.observedBattle?.matchFrames>1);
  assert.equal(await q.locator('#hud .lives i').count(),10);assert.match(await q.locator('#match-set').textContent(),/Game 1/);
  await q.goto(root+'?solo#solo/rules');await observe(q);
  await q.selectOption('#rules-choice','preset-3');
  assert.equal(await q.getByLabel('CPU starting damage').inputValue(),'60');
  await phone.press('#rules-use');await phone.press('#start');
  await q.waitForFunction(()=>window.observedBattle?.matchFrames>0);
  assert.deepEqual(await q.evaluate(()=>[observedBattle.mode,...observedBattle.spawnDamage]),['solo',0,60]);
  await q.close();console.log('Named rules survived a reload, a complete two-stock fight, rematch, and transfer to a fresh touch/controller lobby.');
}
async function friendRules(browser,phone){
  const host=await device(browser,false,'#local/rules/stock/2/0/single/counterweights/off'), a=host.page;
  await a.locator('#rules-name').fill('Friday lifts');await host.press('#rules-save');
  const saved=await a.locator('#rules-choice').inputValue();
  await a.goto(root+'?room#online');await observe(a);
  await host.press('#online-rulebook');await a.selectOption('#rules-choice',saved);
  await host.press('#rules-share');
  assert.equal(new URL(await a.locator('#rules-link').inputValue()).hash,'#online/rules/stock/2/0/single/counterweights/off');
  await host.press('#rules-use');await a.selectOption('#online-stage','picnic');
  assert.equal(await a.locator('#online-custom-rules').textContent(),'2 stocks · No clock · Single game · Fetch Ball off');
  await host.press('#online-create');await a.locator('#online-invite').waitFor();
  const code=await a.locator('#online-room-code').textContent();
  const guest=await device(phone,true,'#room/'+code), b=guest.page;
  await guest.press('[data-dog=clover]');await guest.press('#online-join');
  await b.locator('#room-ready').waitFor();
  for(const p of [a,b]){
    assert.equal(await p.locator('#room-terms').textContent(),'2 stocks · No clock · Single game · Fetch Ball off');
    assert.match(await p.locator('#room-arena').textContent(),/Picnic Table · Counterweights/);
    assert.match(await p.locator('#room-pair').textContent(),/Pip vs. Clover/);assert(await p.locator('#match').isHidden());
  }
  await guest.press('#online-cancel');
  await a.waitForFunction(()=>document.querySelector('#online-review').hidden && document.querySelector('#online-invite').offsetWidth);
  assert.equal(await a.locator('#online-room-code').textContent(),code);
  await b.locator('#online-code').fill(code);await guest.press('#online-join');await b.locator('#room-ready').waitFor();
  await host.press('#online-warmup');await a.waitForFunction(()=>window.observedBattle?.warmupPartner==='stand');
  assert.equal(await b.evaluate(()=>document.activeElement.id),'room-ready');
  await b.evaluate(()=>{
    window.readyPad={index:0,id:'Ready controller',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[readyPad]});readyPad.buttons[0].pressed=true;
  });
  await b.locator('#countdown').waitFor();await b.evaluate(()=>{readyPad.buttons[0].pressed=false;});
  for(const p of [a,b]){
    await p.waitForFunction(()=>window.observedBattle?.mode==='local' && observedBattle.matchFrames>0);
    assert.deepEqual(await p.evaluate(()=>[observedBattle.dogs.map(f=>f.stocks),observedBattle.fetch,observedBattle.clockFrames,observedBattle.form]),
      [[2,2],false,null,'counterweights']);
    assert.equal(await p.locator('#hud .lives i').count(),4);assert(await p.locator('#match-clock').isHidden());
  }
  await a.keyboard.down('a');
  try{await a.locator('[data-do=online-rematch]').waitFor({timeout:30000});}finally{await a.keyboard.up('a');}
  for(const d of [host,guest]){
    await d.press('[data-do=match-card]');assert.equal(await d.page.locator('.card-timeline li').count(),2);
    assert.match(await d.page.locator('.card-stats').textContent(),/Starting stocks22/);await d.press('[data-do=card-back]');
  }
  await host.press('[data-do=rematch-fighters]');await host.press('[data-room-dog=noodle]');
  await a.keyboard.press('Escape');
  assert.equal(await a.evaluate(()=>document.activeElement.dataset.do),'rematch-fighters');
  await host.press('[data-do=rematch-fighters]');
  assert.equal(await a.locator('[data-room-dog][aria-pressed=true]').getAttribute('data-room-dog'),'pip');
  for(const d of [host,guest]){
    if(d===guest)await d.press('[data-do=rematch-fighters]');
    await d.press('[data-room-dog=clover]');await d.press('[data-room-coat="2"]');
    assert(await d.page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  }
  await guest.press('[data-do=ready-fighter]');
  await a.getByText('Your opponent is ready.',{exact:true}).waitFor();
  assert(await b.locator('[data-do=rematch-fighters]').isDisabled());
  assert.match(await b.locator('#net-rematch-status').textContent(),/Clover/);
  assert.doesNotMatch(await a.locator('#net-pick-ready').textContent(),/Clover/);
  await host.press('[data-do=ready-fighter]');
  for(const p of [a,b]){
    await p.waitForFunction(()=>observedBattle?.stage!=='picnic' && observedBattle?.matchFrames>1);
    assert.deepEqual(await p.evaluate(()=>[observedBattle.form,observedBattle.fetch,observedBattle.clockFrames,...observedBattle.dogs.map(f=>f.stocks)]),
      ['counterweights',false,null,2,2]);
    assert.deepEqual(await p.evaluate(()=>observedBattle.dogs.map((f,i)=>[f.kind,observedBattle.coatFor(i)])),[['clover',2],['clover',3]]);
  }
  await b.close();await a.close();console.log('Private WebRTC rules, guest review and cancellation, an unchanged room code, warm-up, two KOs and a fresh rematch passed.');
}
async function main(){
  const options={executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
    headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
  const browser=await chromium.launch(options);
  try{
    if(process.argv.includes('--friend-rules')){
      const phone=await chromium.launch(options);
      try{await friendRules(browser,phone);assert.deepEqual(errors,[]);}finally{await phone.close();}
      return;
    }
    if(process.argv.includes('--rulesets')){await versusRules(browser);assert.deepEqual(errors,[]);return;}
    if(process.argv.includes('--pack-relay')){await packRelay(browser);assert.deepEqual(errors,[]);return;}
    if(process.argv.includes('--time-battle')){
      const phone=await chromium.launch(options);
      try{await timedBattles(browser,phone);assert.deepEqual(errors,[]);}finally{await phone.close();}
      return;
    }
    await counterweightOpening(browser);
    await rivalSet(browser);
    await soloAndLocal(browser);
    const phone=await chromium.launch(options);
    try{await onlineSet(browser,phone);}finally{await phone.close();}
    assert.deepEqual(errors,[]);
  }
  finally{await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
