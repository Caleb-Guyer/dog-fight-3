const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux') throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function clock(page){
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
}
async function controllers(browser) {
  const page=await browser.newPage({viewport:{width:1280,height:720}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.makePad=index=>({index,id:'Test pad '+index,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
    window.pads=[makePad(0)];
    Object.defineProperty(navigator,'getGamepads',{value:()=>window.pads});
    localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{attack:'KeyQ'},{}]}));
    localStorage.setItem('dog-fight-3.config',JSON.stringify({stageForm:'flat',bestOfThree:true,fetch:false,minutes:3}));
  });
  await clock(page);
  const press=s=>page.locator(s).click();
  const held=async(index,buttons=[],x=0)=>{
    await page.evaluate(([index,buttons,x])=>{
      const p=window.pads[index];p.axes[0]=x;
      p.buttons.forEach((b,n)=>{b.pressed=buttons.includes(n);b.value=Number(b.pressed);});
    },[index,buttons,x]);
    await page.clock.runFor(48);
  };
  const pad=async(i,buttons,x)=>{await held(i,buttons,x);await held(i);};
  const name=i=>page.locator('[data-seat="'+i+'"] [data-name]').textContent();
  const phase=()=>page.locator('#couch-phase').textContent();
  try{
    await page.goto(root);assert.equal(await page.evaluate(()=>!!window.CouchSelect),false);
    await press('[data-enter-mode=local]');await press('#pick-together');
    assert.match(await page.locator('[data-seat="1"] [data-device]').textContent(),/Pad 1/);
    await pad(0,[9]);assert(await page.locator('.couch-help[open]').isVisible());
    assert.match(await page.locator('[data-keys="0"]').innerText(),/Q ready/);
    await pad(0,[1]);assert.equal(await page.locator('.couch-help').getAttribute('open'),null);
    await page.keyboard.press('d');assert.equal(await name(0),'Brisket');
    await page.keyboard.press('s');
    const coat=await page.locator('[data-seat="0"] [data-action=coat]').textContent();
    await page.keyboard.press('q');await page.keyboard.press('a');
    assert.equal(await name(0),'Brisket');
    await held(0,[],1);await page.clock.runFor(500);assert.equal(await name(1),'Noodle');
    await held(0);await pad(0,[],-1);assert.equal(await name(1),'Brisket');
    await pad(0,[12]);assert.notEqual(await page.locator('[data-seat="1"] [data-action=coat]').textContent(),coat);
    await page.evaluate(()=>{window.pads[4]=makePad(4);});await page.clock.runFor(48);
    assert.match(await page.locator('[data-seat="0"] [data-device]').textContent(),/Pad 5/);
    await pad(0,[0]);assert.match(await phase(),/arena/);
    await pad(4,[],1);await held(0,[],-1);await held(0);
    await pad(4,[0]);assert(await page.locator('#couch-start').isHidden());
    await pad(0,[0]);const vote=await page.locator('#couch-call').textContent();
    assert.match(vote,/Split vote.*(Laundry Line|Canal Lock)/);
    await pad(0,[1]);await pad(0,[0]);assert.equal(await page.locator('#couch-call').textContent(),vote);
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(dt,a,b){window.lastBattle=this;window.inputPair=[a,b];return step.apply(this,arguments);};
    });
    await held(0,[0,9]);await held(0,[0]);await page.clock.runFor(2650);
    const initial=await page.evaluate(()=>({dogs:lastBattle.dogs.map(d=>d.kind),coats:[0,1].map(i=>lastBattle.coatFor(i)),
      stage:lastBattle.stage,form:lastBattle.form,fetch:lastBattle.fetch,clock:lastBattle.clockFrames,jump:inputPair[1].jump}));
    assert.deepEqual(initial.dogs,['brisket','brisket']);assert.deepEqual(initial.coats,[2,3]);assert.equal(initial.form,'flat');
    assert.equal(initial.fetch,false);assert.equal(initial.jump,false);assert(initial.clock<=10800 && initial.clock>10720);
    assert.equal(initial.stage,vote.includes('Laundry Line')?'laundry':'canal');
    assert.match(await page.locator('#match-set').textContent(),/Game 1/);
    // Pad 0 picked for P2 before pad 4 joined. Removing P1 cannot give P2 a different dog.
    await held(0);await page.evaluate(()=>{window.pads[4]=null;});await held(0);
    assert.match(await page.locator('#pad-loss-seats').textContent(),/Q attack/);
    await press('#pad-resume');await page.clock.runFor(2500);await held(0,[2],1);
    assert.deepEqual(await page.evaluate(()=>inputPair.map(x=>[x.attack,x.x])),[[false,0],[true,1]]);
    await held(0,[],1);
    for(let i=0;i<18 && !await page.locator('#set-score').isVisible();i++)await page.clock.runFor(2000);
    assert.match(await page.locator('#set-score').textContent(),/P1 1 – 0 P2/);
    await held(0);await pad(0,[0]);
    assert.match(await phase(),/P2.*fighter/);
    await page.keyboard.press('d');assert.equal(await name(0),'Brisket');
    await pad(0,[],1);assert.equal(await name(1),'Noodle');
    await pad(0,[0]);assert.match(await phase(),/P2.*arena/);
    await pad(0,[1]);assert.match(await phase(),/fighter/);
    await pad(0,[0]);await pad(0,[],1);
    const nextArena=await name(1);await pad(0,[0]);
    assert.match(await page.locator('#couch-call').textContent(),/Waiting for P1/);
    await page.keyboard.press('q');
    await page.clock.runFor(2500);assert.match(await page.locator('#match-set').textContent(),/Game 2/);
    assert.match(await page.locator('#match-stage').textContent(),new RegExp(nextArena));
    assert.deepEqual(await page.evaluate(()=>lastBattle.dogs.map(d=>d.kind)),['brisket','noodle']);
    await page.evaluate(()=>{window.pads[4]=makePad(4);});await held(4,[2],-1);
    assert.deepEqual(await page.evaluate(()=>inputPair.map(x=>[x.attack,x.x])),[[true,-1],[false,0]]);
    await held(4,[],-1);
    for(let i=0;i<22 && !await page.locator('#set-score').isVisible();i++)await page.clock.runFor(2000);
    assert.match(await page.locator('#set-score').textContent(),/P1 1 – 1 P2/);await held(4);
    await page.keyboard.press('q');assert.match(await phase(),/P1.*fighter/);
    await pad(0,[0]);await pad(0,[1]);await pad(0,[],1);assert.equal(await name(1),'Noodle');
    await pad(0,[0]);await pad(4,[],-1);assert.equal(await name(0),'Pip');
    await pad(4,[0]);await pad(4,[0]);await page.clock.runFor(2500);
    assert.equal(await page.locator('#match-set').textContent(),'Game 3 · 1–1');
    // P1 switched from Brisket to Pip. Its first-game win still belongs to Brisket.
    await held(0,[],1);
    for(let i=0;i<22 && !await page.locator('#set-score').isVisible();i++)await page.clock.runFor(2000);
    assert.match(await page.locator('#set-score').textContent(),/P1 2 – 1 P2/);
    assert.deepEqual(await page.locator('.set-history li strong').allTextContents(),['P1 Brisket','P2 Noodle','P1 Pip']);
    await press('[data-do=match-card]');await press('[data-card-game="0"]');
    assert.match(await page.locator('.card-stats th[scope=col]').last().textContent(),/Brisket/);
    await press('[data-card-game="1"]');assert.match(await page.locator('.card-stats th[scope=col]').last().textContent(),/Noodle/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function reconnectInFight(browser) {
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      window.pad=i=>({index:i,id:'Hosted pad '+i,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))});
      window.pads=[pad(0),pad(1)];
      Object.defineProperty(navigator,'getGamepads',{value:()=>pads});
    });
    await clock(page);await page.goto(root);
    await page.locator('[data-enter-mode=local]').click();
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(dt,a,b){
        if(window.captureOpening && !window.openingInputs)
          window.openingInputs=[a,b].map(input=>[input.jump,input.attack,input.x]);
        window.battle=this;window.inputs=[a,b];return step.apply(this,arguments);
      };
    });
    await page.locator('#start').click();await page.clock.runFor(2900);
    const state=()=>page.evaluate(()=>[battle.matchFrames,battle.clockFrames,...battle.dogs.flatMap(d=>[d.x,d.y,d.damage,d.stocks])]);
    const snapshot=await state();
    await page.evaluate(()=>{pads[0].connected=false;pads[1].axes[0]=.8;});
    await page.clock.runFor(800);
    const resume=page.locator('#pad-resume');
    assert.equal(await resume.textContent(),'Use keyboard for P1');
    await page.keyboard.press('Escape');await page.clock.runFor(300);
    assert.deepEqual(await state(),snapshot);
    await page.evaluate(()=>{pads[3]=pad(3);pads[3].buttons[0].pressed=true;pads[3].buttons[2].pressed=true;});
    await page.clock.runFor(300);
    assert.equal(await resume.textContent(),'Resume match');
    assert(await resume.evaluate(e=>e===document.activeElement),'a direction held in the fight must leave Resume focused');
    assert.match(await page.locator('#pad-loss-seats').textContent(),/P1 · Pad 4.*P2 · Pad 2/);
    await page.evaluate(()=>{pads[3].buttons[0].pressed=false;});await page.clock.runFor(40);
    await page.evaluate(()=>{pads[3].buttons[0].pressed=true;});await page.clock.runFor(2100);
    assert.deepEqual(await state(),snapshot);
    await page.clock.runFor(500);
    assert((await state())[0]>snapshot[0]);
    const call=page.locator('#countdown');
    assert.equal(await call.textContent(),'GO!','both players can still read the cue after control returns');
    assert.deepEqual(await page.evaluate(()=>inputs.map(i=>[i.attack,i.jump,i.x>0])),[[false,false,false],[false,false,true]]);
    await page.evaluate(()=>{pads[3].buttons[0].pressed=false;pads[3].buttons[2].pressed=false;});await page.clock.runFor(40);
    await page.evaluate(()=>{pads[3].buttons[2].pressed=true;});await page.clock.runFor(40);
    assert.equal(await page.evaluate(()=>inputs[0].attack),true);
    await page.locator('#pause').click();const paused=await state();
    await page.evaluate(()=>{pads[1]=null;});await page.clock.runFor(150);
    await page.locator('[data-do=resume]').click();await page.clock.runFor(70);
    assert.equal(await resume.textContent(),'Use keyboard for P2');assert.deepEqual(await state(),paused);
    await resume.click();await page.clock.runFor(2500);
    await page.keyboard.down('ArrowLeft');await page.clock.runFor(40);
    assert.equal(await page.evaluate(()=>inputs[1].x),-1);await page.keyboard.up('ArrowLeft');
    await page.locator('#pause').click();
    const manualPause=await state();
    await page.locator('[data-do=resume-countdown]').click();
    assert.equal(await call.textContent(),'3');
    await page.evaluate(()=>{pads[3].buttons[2].pressed=false;window.captureOpening=true;});
    await page.clock.runFor(950);
    assert.equal(await call.textContent(),'2');
    await page.keyboard.press('Comma');
    await page.clock.runFor(850);
    assert.equal(await call.textContent(),'1');
    assert.deepEqual(await state(),manualPause);
    await page.keyboard.down('ArrowLeft');
    await page.evaluate(()=>{pads[3].buttons[0].pressed=true;});
    await page.clock.runFor(740);
    assert.equal(await call.textContent(),'GO!');
    assert.deepEqual(await page.evaluate(()=>openingInputs),[[true,false,0],[false,false,-1]]);
    assert((await state())[0]>manualPause[0]);
    await page.keyboard.up('ArrowLeft');
    await page.clock.runFor(350);
    assert.equal(await call.textContent(),'');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function assignControllers(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      window.makePad=(index,id)=>({index,id,connected:true,mapping:'standard',axes:[0,0,0,0],
        buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
      window.pads=[makePad(0,'Gold'),makePad(1,'Blue')];
      Object.defineProperty(navigator,'getGamepads',{value:()=>pads});
    });
    await clock(page);await page.goto(root+'#local/controllers');
    const el=id=>page.locator('#'+id),tick=(ms=75)=>page.clock.runFor(ms);
    const button=async(i,pressed=[],x=0)=>{
      await page.evaluate(([i,pressed,x])=>{
        pads[i].axes[0]=x;pads[i].buttons.forEach((b,n)=>{b.pressed=pressed.includes(n);b.value=Number(b.pressed);});
      },[i,pressed,x]);await tick();
    };
    const swap=async()=>{
      await el('seat-pair-0').tap();await button(1,[0,2]);assert(await el('seat-apply').isDisabled());
      await button(1,[],.6);await button(1,[0],.6);assert(await el('seat-apply').isDisabled());
      await button(1);await button(1,[0]);await tick(240);await button(1);
      assert.match(await el('seat-device-0').textContent(),/Pad 2 · Blue/);
      assert.match(await el('seat-device-1').textContent(),/Pad 1 · Gold/);
      assert(await el('seat-apply').isEnabled());
    };
    await el('seat-pair-0').waitFor();await tick();
    assert(await el('controller-seats').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await swap();await el('seat-back').tap();
    await el('controls').tap();await page.locator('[data-do=couch-pads]').tap();
    assert.match(await el('seat-device-0').textContent(),/Pad 1 · Gold/);
    await swap();await el('seat-apply').tap();await page.locator('[data-do=close]').tap();
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(dt,a,b){window.battle=this;window.inputs=[a,b];return step.apply(this,arguments);};
    });
    await el('start').tap();await tick(2700);await button(1,[2]);
    const attacks=()=>page.evaluate(()=>inputs.map(i=>i.attack));
    const frozen=()=>page.evaluate(()=>[battle.matchFrames,battle.clockFrames,battle.random.state,
      ...battle.dogs.flatMap(d=>[d.kind,d.x,d.y,d.vx,d.vy,d.damage,d.stocks])]);
    assert.deepEqual(await attacks(),[true,false]);await button(1);const snapshot=await frozen();
    await page.evaluate(()=>{pads=[makePad(0,'Blue'),makePad(1,'Gold')];});await tick(600);
    assert.match(await el('pad-loss-seats').textContent(),/P1 · Pad 1 · Blue.*P2 · Pad 2 · Gold/);
    assert.deepEqual(await frozen(),snapshot);
    await page.locator('[data-do=couch-pads]').tap();
    await el('seat-pair-1').tap();await page.keyboard.press('Escape');assert(await el('seat-apply').isEnabled());
    await el('seat-back').tap();await el('pad-resume').tap();await tick(2600);
    await button(0,[2]);assert.deepEqual(await attacks(),[true,false]);await button(0);
    await button(1,[2]);assert.deepEqual(await attacks(),[false,true]);await button(1);
    await el('pause').tap();const paused=await frozen();await page.locator('[data-do=couch-pads]').tap();
    await el('seat-keys-0').tap();await el('seat-apply').tap();assert.deepEqual(await frozen(),paused);
    await page.locator('[data-do=resume]').tap();await tick(90);
    await button(0,[2]);assert.deepEqual(await attacks(),[false,false]);
    await page.keyboard.down('j');await tick();assert.deepEqual(await attacks(),[true,false]);await page.keyboard.up('j');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function soloReconnect(browser,touch){
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const run=ms=>page.clock.runFor(ms);
  const snapshot=()=>page.evaluate(()=>[observedSteps,live.time,live.hitStop,live.runFrames,live.matchFrames,live.clockFrames,
    ...live.dogs.flatMap(d=>[d.x,d.y,d.vx,d.vy,d.damage,d.stocks])]);
  const loss=page.locator('#dialog[open][data-view="solo-pad-loss"]');
  const backup=loss.locator('#solo-pad-backup');
  try{
    await page.addInitScript(()=>{
      window.makePad=(index,id)=>({index,id,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))});
      window.pads=[makePad(0,'Spare pad'),null,null,makePad(3,'Primary pad')];
      Object.defineProperty(navigator,'getGamepads',{value:()=>pads});
    });
    await clock(page);
    if(touch){
      await page.goto(root);
      await page.evaluate(()=>localStorage.setItem(DispatchScript.chapters[0].saveKey,JSON.stringify({version:2,started:true,room:1,checkpoint:0,stamps:1})));
      await page.goto(root+'?solo-pad#adventure');await page.locator('#dispatch-start').tap();
      await page.getByText('The Weigh House',{exact:true}).filter({visible:true}).first().waitFor();
      await page.waitForFunction(()=>!!window.DispatchRun);
    }else await page.goto(root+'#tutorial/first-match');
    await page.evaluate(touch=>{
      const proto=touch?DispatchRun.prototype:DogFight.Battle.prototype,step=proto.step;
      window.jumpSamples=0;window.observedSteps=0;
      proto.step=function(dt,input){
        window.live=this;window.lastInput=input;observedSteps++;if(input?.jump)jumpSamples++;
        return step.apply(this,arguments);
      };
    },touch);
    await run(2800);
    await page.evaluate(()=>{pads[0]=null;});await run(60);
    assert.equal(await loss.count(),0);
    await page.evaluate(()=>{pads[0]=makePad(0,'Spare pad');pads[3].axes[0]=.8;});
    await run(60);assert((await page.evaluate(()=>lastInput.x))>.7);
    await page.evaluate(()=>{pads[3].axes[0]=0;pads[0].buttons[9].pressed=true;});await run(60);
    assert.equal(await page.locator('#dialog[open]').count(),0);
    await page.evaluate(()=>{pads[0].buttons[9].pressed=false;});await run(40);
    const before=await snapshot();
    await page.evaluate(()=>{
      pads[3]=makePad(3,'Replacement pad');pads[3].buttons[0].pressed=true;
      pads[3].buttons[2].pressed=true;pads[0].axes[0]=.95;
    });
    await run(300);assert.equal(await backup.textContent(),touch?'Resume with touch':'Resume with keyboard');
    assert.match(await loss.textContent(),/Pad 4/);
    await page.keyboard.press('Escape');await run(600);assert.deepEqual(await snapshot(),before);
    if(touch){
      await backup.tap();await run(120);
      assert.equal(await page.evaluate(()=>lastInput.x),0);
      await page.locator('[data-touch=jump]').tap();await run(65);
      assert((await page.evaluate(()=>jumpSamples))>0);
    }else{
      await page.evaluate(()=>{pads[3].buttons[2].pressed=false;});await run(80);
      assert.deepEqual(await snapshot(),before);
      await page.evaluate(()=>{pads[3].buttons[0].pressed=false;});await run(40);
      await page.evaluate(()=>{pads[3].buttons[0].pressed=true;});await run(100);
      assert.equal(await loss.count(),0);
      assert.deepEqual(await page.evaluate(()=>[jumpSamples,lastInput.x,lastInput.attack]),[0,0,false]);
      await page.evaluate(()=>{pads[3].buttons[0].pressed=false;pads[3].buttons[2].pressed=true;});
      await run(60);assert.equal(await page.evaluate(()=>lastInput.attack),true);
      await page.locator('#pause').click();const parked=await snapshot();
      await page.evaluate(()=>{pads[3]=null;});await run(150);
      await page.locator('[data-do=resume]').click();await run(80);assert.deepEqual(await snapshot(),parked);
      await backup.click();await run(80);assert.equal(await page.evaluate(()=>lastInput.x),0);
      await page.keyboard.down('KeyA');await run(50);assert.equal(await page.evaluate(()=>lastInput.x),-1);
      await page.keyboard.up('KeyA');
    }
    assert((await snapshot())[0]>before[0],'the simulation must resume stepping after the player takes over');assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function shuffleDraft(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.testPad={index:0,id:'Guest pad',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});
  });
  await clock(page);
  try{
    await page.goto(root);await page.locator('[data-enter-mode=solo]').tap();
    const slot=i=>page.locator('#slots [data-index="'+i+'"] .slot-name').textContent();
    const random=page.locator('#lobby-random');
    for(const i of [0,1]){
      await page.locator('#slots [data-index="'+i+'"]').tap();
      const other=await slot(1-i),seen=[await slot(i)];
      for(let n=0;n<3;n++){
        await random.tap();seen.push(await slot(i));assert.equal(await slot(1-i),other);
        assert.equal(await page.evaluate(()=>document.activeElement.id),'lobby-random');
      }
      assert.equal(new Set(seen).size,4);
    }
    const chosen=[await slot(0),await slot(1)];
    await page.locator('#start').tap();
    assert.match(await page.locator('#match-stage').textContent(),/Picnic Table/);
    await page.goto(root+'#local/pick-together');
    const name=i=>page.locator('[data-seat="'+i+'"] [data-name]').textContent();
    assert.deepEqual([await name(0),await name(1)],chosen);
    await page.keyboard.press('u');const keyboardPick=await name(0);assert.notEqual(keyboardPick,chosen[0]);
    await page.keyboard.press('j');await page.keyboard.press('u');assert.equal(await name(0),keyboardPick);
    await page.evaluate(()=>{testPad.buttons[2].pressed=true;});await page.clock.runFor(250);
    const padPick=await name(1);assert.notEqual(padPick,chosen[1]);
    await page.clock.runFor(300);assert.equal(await name(1),padPick);
    await page.locator('[data-seat="1"] [data-action=shuffle]').tap();assert.notEqual(await name(1),padPick);
    const pair=[await name(0),await name(1)];
    await page.locator('[data-seat="1"] [data-action=lock]').tap();
    for(const i of [0,1])await page.locator('[data-seat="'+i+'"] [data-action=lock]').tap();
    await page.locator('#couch-start').tap();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.config')));
    assert.deepEqual([saved.p1,saved.p2],pair.map(n=>n.toLowerCase()));assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function handheld(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await clock(page);
  const press=s=>page.locator(s).tap(), btn=(i,k)=>'[data-seat="'+i+'"] [data-action="'+k+'"]';
  try{
    await page.goto(root+'#local/best-of-three');
    assert.match(await page.locator('#couch-rules').textContent(),/Best of three/);
    await press(btn(0,'prev'));await press(btn(1,'next'));await press(btn(0,'coat'));
    await press('#couch-back');assert.equal(await page.evaluate(()=>document.activeElement.id),'pick-together');
    await press('#pick-together');assert.equal(await page.locator('[data-seat="0"] [data-name]').textContent(),'Pip');
    for(const i of [0,1])await press(btn(i,'lock'));
    await press('#couch-back');assert.equal(await page.locator('#couch-phase').textContent(),'Choose your fighters');
    // The two keyboard layouts can also lock and choose independently without a controller.
    await page.keyboard.press('a');await page.keyboard.press('ArrowRight');
    await page.keyboard.press('j');await page.keyboard.press(',');
    for(const i of [0,1])await press(btn(i,'next'));
    for(const i of [1,0])await press(btn(i,'lock'));
    assert.match(await page.locator('#couch-call').textContent(),/Both chose Laundry Line/);
    assert(await page.locator('#dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    assert(await page.locator('.couch-seats').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await press('#couch-start');
    assert.equal(await page.locator('#match-stage').textContent(),'Laundry Line');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.config')));
    assert.deepEqual([saved.p1,saved.p2],['clover','noodle']);
    await page.keyboard.down('ArrowRight');
    for(let i=0;i<24 && !await page.locator('#set-score').isVisible();i++)await page.clock.runFor(2000);
    await page.keyboard.up('ArrowRight');await press('[data-do=set-pick]');
    await press(btn(0,'lock'));await press(btn(1,'prev'));await press(btn(1,'coat'));
    assert.equal(await page.locator('[data-seat="1"] [data-name]').textContent(),'Brisket');
    await press(btn(1,'lock'));await press(btn(1,'next'));
    assert(await page.locator('#dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await press(btn(1,'lock'));
    assert.equal(await page.locator('#match-set').textContent(),'Game 2 · 1–0');
    assert.equal(await page.locator('#match-stage').textContent(),'Moonbell Bandstand');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await controllers(b);await handheld(b);await shuffleDraft(b);await reconnectInFight(b);await assignControllers(b);await soloReconnect(b,false);await soloReconnect(b,true);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
