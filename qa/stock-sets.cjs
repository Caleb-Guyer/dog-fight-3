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
      "\nwindow.Peer=class extends window.Peer {constructor(id,options){super(id,{...options,host:'127.0.0.1',port:9001,path:'/df3',secure:false,config:{iceServers:[]}});}};"});
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
    const update=YardScore.Player.prototype.update;
    YardScore.Player.prototype.update=function(...args){
      window.observedScore=this;
      return update.apply(this,args);
    };
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
async function leaveThreeStocks(device,slot) {
  const {page,mobile}=device, result=page.locator('#set-score');
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
async function soloAndLocal(browser){
  const d=await device(browser,false,'#solo'),{page,press}=d;
  const lips=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=1200;canvas.height=675;
    const ctx=canvas.getContext('2d',{willReadFrequently:true}), result=[];
    const color=(x,y)=>[...ctx.getImageData(x,y,1,1).data.slice(0,3)].map(n=>n.toString(16).padStart(2,'0')).join('');
    for(const stage of Object.keys(DogFight.arenas)) for(const form of ['flat','trio']){
      const floors=DogFight.platforms(DogFight.stageGeometry(stage,form),0);
      ArenaArt.draw(ctx,stage,1.7,undefined,form);
      for(const f of floors) result.push([stage,form,color(f.x1+1,f.y),color(f.x2-2,f.y)]);
    }
    return result;
  });
  const colors={picnic:'ffe3ab',laundry:'e8b5aa',canal:'ffe09a',nightmail:'f1c182',bandstand:'ffdfa0'};
  for(const [stage,form,left,right] of lips){
    const expected=stage==='nightmail' && form==='flat'?'ffe3a6':colors[stage];
    assert.deepEqual([left,right],[expected,expected],stage+' '+form+' art lines up with both collision edges');
  }
  await press('[data-mode=local]');await press('#choose-stage');
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
      for(const d of [host,guest]){
        await d.press('[data-do=watch-finish]');
        assert.equal(await d.page.locator('#clip-practice').count(),0);
        await d.page.locator('#clip-seek').press('End');
        assert.match(await d.page.locator('#clip-frame').textContent(),/Frame 240 \/ 240/);
        scores.push(await d.page.locator('#clip-scores').textContent());
        await d.press('[data-do=clip-back]');
      }
      assert.equal(scores[0],scores[1]);
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
    const you=await d.page.locator('.card-stats thead small').allTextContents();
    assert(you[d===host?0:1].includes('YOU'));
    if(d===guest){
      await d.press('[data-record-drill="1"]');await d.press('#return-fight');
      assert.equal(await d.page.locator('#dialog').getAttribute('data-view'),'record-card');
    }
    await d.page.goto(root+'?quick-coats#online');await observe(d.page);
    await d.press('#online-coat');await d.press(d===host?'[data-coat="3"]':'[data-coat="1"]');
  }
  await host.press('#online-quick');await guest.press('#online-quick');
  for(const d of [host,guest]){
    await d.page.waitForFunction(()=>window.observedBattle?.matchFrames>2);
    const side=(await d.page.locator('#match-mode').textContent()).includes('P1')?0:1;
    const own=d===host?3:1;
    assert.deepEqual(await d.page.evaluate(i=>[observedBattle.coatFor(i),observedBattle.coatFor(1-i)],side),[own,4-own]);
  }
  await b.close();await a.close();console.log('Desktop and mobile peers agreed on fighter counterpicks, coats, records, set rematch and Quickplay.');
}
async function main(){
  const options={executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
    headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
  const browser=await chromium.launch(options);
  try{
    await rivalSet(browser);
    await soloAndLocal(browser);
    const phone=await chromium.launch(options);
    try{await onlineSet(browser,phone);}finally{await phone.close();}
    assert.deepEqual(errors,[]);
  }
  finally{await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
