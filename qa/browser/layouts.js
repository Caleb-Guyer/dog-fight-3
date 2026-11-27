const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw new Error('Run input playtests on hosted Linux.');
const {chromium}=require('playwright-core'),root='http://127.0.0.1:8080/';
async function run(browser){
  const page=await browser.newPage({viewport:{width:1080,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.pads=[];
    window.makePad=i=>({index:i,id:'Standard test controller '+i,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
    Object.defineProperty(navigator,'getGamepads',{get:()=>()=>window.pads});
  });
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  const click=id=>page.locator('#'+id).click();
  const bind=async(action,key)=>{await page.locator('[data-key="'+action+'"]').click();await page.keyboard.press(key);};
  const observe=()=>page.evaluate(()=>{
    const p=DogFight.Battle.prototype,step=p.step;
    window.samples=[];
    p.step=function(dt,a,b){window.samples.push([a,b]);return step.apply(this,arguments);};
  });
  const pad=async(i,indices,axis=0,ms=50)=>{
    await page.evaluate(([i,buttons,x])=>{
      const p=window.pads[i] ||= window.makePad(i);p.axes[0]=x;
      p.buttons.forEach((b,n)=>{b.pressed=buttons.includes(n);b.value=Number(b.pressed);});
    },[i,indices,axis]);await page.clock.runFor(ms);
  };
  await page.goto(root+'#controls');
  await bind('attack','f');assert.match(await page.locator('#layout-status').textContent(),/reserved/);
  await page.keyboard.press('q');assert.equal(await page.locator('[data-key="attack"]').textContent(),'Q');
  assert(await page.getByRole('button',{name:'Change Attack key, currently Q'}).isVisible());
  await bind('attack',',');assert.match(await page.locator('#layout-status').textContent(),/P2 Attack/);
  await click('layout-back');assert.equal(await page.locator('[data-key="attack"]').textContent(),'Q');
  await bind('attack',',');await click('layout-confirm');
  await page.selectOption('#layout-slot','1');assert.equal(await page.locator('[data-key="attack"]').textContent(),'Q');
  await click('layout-test');await page.keyboard.down('q');await page.keyboard.down('ShiftRight');
  assert.match(await page.locator('#layout-status').textContent(),/Jump \+ Attack/);
  await page.keyboard.up('q');await page.keyboard.up('ShiftRight');await click('layout-back');
  await page.selectOption('#layout-slot','0');await page.selectOption('#layout-device','pad');
  await page.selectOption('[data-pad="jump"]','2');await click('layout-confirm');await click('layout-test');
  await pad(0,[2,4]);assert.match(await page.locator('#layout-status').textContent(),/Jump \+ Shield/);
  await pad(0,[9]);await pad(0,[]);assert(await page.locator('#layout-test').isVisible());

  await page.goto(root+'?course#tutorial');await observe();
  await pad(0,[],1,1000);assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'passed');
  // A is attack in this layout. The A that advances the lesson must be consumed until release.
  await pad(0,[0],0,100);
  assert.match(await page.locator('#school-title').textContent(),/platform/);
  assert.equal(await page.locator('#school-bindings').textContent(),'X');
  assert.equal(await page.evaluate(()=>samples.at(-1)[0].attack),false);
  await pad(0,[]);await pad(0,[2],0,165);await pad(0,[],0,80);await pad(0,[2],0,1200);
  assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'passed');
  await pad(0,[]);await click('school-next');await page.keyboard.down(',');await page.clock.runFor(80);await page.keyboard.up(',');
  assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'passed');
  await click('school-next');await page.keyboard.press('s');await page.clock.runFor(35);
  assert.equal(await page.locator('#school-bindings').textContent(),'S + ,');

  await page.goto(root+'?couch#solo');await page.locator('[data-mode="local"]').click();await click('start');
  await observe();await page.clock.runFor(2500);
  await pad(0,[2]);let sample=await page.evaluate(()=>samples.at(-1));
  assert(!sample[0].jump && !sample[0].attack && sample[1].attack && !sample[1].jump);
  await pad(0,[]);await pad(1,[]);await pad(0,[2]);await pad(1,[2]);
  sample=await page.evaluate(()=>samples.at(-1));assert(sample[0].jump && !sample[0].attack && sample[1].attack);
  await pad(0,[]);await pad(1,[]);await page.keyboard.down(',');await page.keyboard.down('q');
  await page.clock.runFor(35);sample=await page.evaluate(()=>samples.at(-1));assert(sample[0].attack && sample[1].attack);
  await page.keyboard.up(',');await page.keyboard.up('q');
  await page.keyboard.press('p');await page.locator('[data-do="controls"]').click();
  assert.match(await page.locator('.control-table').textContent(),/P1 A · P2 X/);
  await page.locator('[data-do="bindings"]').click();await click('layout-reset');await click('layout-confirm');
  await click('layout-back');assert(await page.locator('.control-table').isVisible());
  await page.locator('[data-do="close"]').click();assert(await page.locator('[data-do="resume"]').isVisible());
  await page.goto(root+'?restore#controls');
  assert.equal(await page.locator('[data-key="attack"]').textContent(),'J');
  await page.evaluate(()=>localStorage.clear());
  await page.goto(root+'?players#local/profiles');
  await click('profile-edit');
  await bind('attack','q');
  await page.selectOption('#layout-device','pad');
  await page.selectOption('[data-pad="jump"]','2');await click('layout-confirm');
  await page.locator('[data-playstyle="quickAttack1"]').click();
  await page.locator('[data-playstyle="tiltStick"]').click();
  await click('layout-back');
  await page.locator('#profile-name').fill('Pup <3');
  await click('profile-save');
  assert.match(await page.locator('#profile-active').textContent(),/P1 · Pup <3/);
  await click('profile-seat-1');await click('profile-use');
  assert.match(await page.locator('#profile-changes').textContent(),/Attack · Q → ,/);
  await click('profile-back');
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.controls')));
  assert.equal((await stored()).keyboard[1].attack,'Comma');
  await click('profile-use');await click('profile-pad-only');
  let seats=await stored();
  assert.deepEqual(seats.keyboard.map(k=>k.attack),['KeyQ','Comma']);
  assert.deepEqual(seats.prefs[1],[false,false,true]);
  assert.equal(seats.pad[1].attack,0);
  await click('profile-use');await click('profile-confirm');
  await page.reload();
  seats=await stored();
  assert.deepEqual(seats.keyboard.map(k=>k.attack),['Comma','KeyQ']);
  assert.deepEqual(seats.tags,['','Pup <3']);
  await click('profile-seat-1');
  assert.equal(await page.locator('#profile-active').textContent(),'P2 · Pup <3');
  await click('profile-back');
  assert(await page.locator('#lobby-profiles').evaluate(el=>el===document.activeElement));
  await click('start');await observe();await page.clock.runFor(2500);
  assert.match(await page.locator('.hud-card.two .hud-name small').textContent(),/P2 · Pup <3/);
  await page.keyboard.down('q');await page.clock.runFor(40);
  sample=await page.evaluate(()=>samples.at(-1));
  assert(!sample[0].attack && sample[1].attack && !sample[1].quickAttack);
  await page.keyboard.up('q');await pad(0,[0]);
  sample=await page.evaluate(()=>samples.at(-1));
  assert(!sample[0].attack && sample[1].attack);
  assert.deepEqual(errors,[]);await page.close();
}
async function controllerCheck(browser){
  const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.pulses=[];
    window.makeController=(index,id)=>({index,id,connected:true,mapping:'standard',axes:[0,0,0,0],
      vibrationActuator:{effects:['dual-rumble'],playEffect(type,params){pulses.push({index,type,...params});return Promise.resolve('complete');},reset(){}},
      buttons:Array.from({length:17},()=>({value:0,pressed:false}))});
    window.pads=[makeController(0,'DualSense Wireless Controller'),makeController(1,'Nintendo Switch Pro Controller')];
    Object.defineProperty(navigator,'getGamepads',{value:()=>window.pads});
  });
  const tick=(ms=80)=>page.clock.runFor(ms);
  const press=async(indices,axes=[0,0,0,0])=>{
    await page.evaluate(([indices,axes])=>{
      pads[0].axes=axes;
      pads[0].buttons.forEach((b,i)=>{b.pressed=indices.includes(i);b.value=Number(b.pressed);});
    },[indices,axes]);await tick();
  };
  const label=n=>page.locator('[data-pad-key="'+n+'"]').textContent();
  const click=id=>page.locator('#'+id).click();
  const hint=()=>page.locator('#school-bindings').textContent();
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.controls')));
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:03Z'));
    await page.goto(root+'#controls/controller');await page.locator('#pad-label-style').waitFor();await tick();
    assert.equal(await label(0),'Cross');assert.equal(await label(6),'L2');
    await press([0,2,4,12],[.75,-.6,-.5,.9]);
    assert.match(await page.locator('#layout-status').textContent(),/Jump \+ Attack \+ Shield \+ Move stick up-right \+ Strike stick down-left \+ D-pad up/);
    assert.deepEqual(await page.locator('[data-pad-key].lit').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.padKey)).sort((a,b)=>a-b)),[0,2,4,12]);
    assert.deepEqual(await page.locator('[data-stick] i').evaluateAll(nodes=>nodes.map(n=>n.style.transform)),['translate(8px, -6px)','translate(-5px, 9px)']);
    await press([]);assert.equal(await page.locator('[data-pad-key].lit').count(),0);
    await page.selectOption('#layout-slot','1');await click('layout-test');
    assert.equal(await label(0),'B');assert.equal(await label(2),'Y');assert.equal(await label(9),'+');
    await page.selectOption('#pad-label-style','positions');assert.equal(await label(0),'Bottom');
    await page.reload();await tick();assert.deepEqual((await stored()).labelStyles,['auto','positions']);
    assert.equal(await label(0),'Cross');
    await page.evaluate(()=>{window.pads=[];});await tick();assert.match(await page.locator('#layout-status').textContent(),/Connect a controller/);
    await page.evaluate(()=>{window.pads=[makeController(0,'Switch Pro Controller')];});await tick();assert.equal(await label(0),'B');
    await click('layout-back');await page.selectOption('[data-pad="attack"]','3');await click('layout-confirm');
    assert.equal((await stored()).pad[0].attack,3);
    await page.goto(root+'?mapped#tutorial/guided/air');
    await page.waitForFunction(()=>!!window.LessonGuide,null,{polling:20});await tick();
    assert.match(await hint(),/Cross.*Triangle/);
    assert.equal(await page.locator('#school-example').textContent(),'Create · Watch example');
    await page.waitForFunction(()=>!!window.PadFeedback,null,{polling:20});
    await press([0,3]);await press([]);await tick(1500);
    assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'passed');
    const contacts=await page.evaluate(()=>pulses);
    assert(contacts.some(p=>p.index===0 && p.duration===32));assert(contacts.every(p=>p.index===0));
    assert.match(await hint(),/Cross to continue/);
    await press([0]);await press([]);assert.match(await hint(),/L1/);
    await page.evaluate(()=>{pads[0]=makeController(0,'Switch Pro Controller');});await tick();
    assert.equal(await page.locator('#dialog[open]').getAttribute('data-view'),'solo-pad-loss');
    assert.match(await page.locator('#solo-pad-info').textContent(),/Pad 1 · Press B/);
    await press([0]);await press([]);
    assert.equal(await page.locator('#dialog[open]').count(),0);
    assert.equal(await page.locator('#school-list').textContent(),'+ · Lessons');
    assert.equal(await page.locator('#school-example').textContent(),'− · Watch example');
    await page.keyboard.down('l');await tick(20);await page.keyboard.up('l');
    assert.equal(await page.locator('#school-example').textContent(),'Watch example');
    await page.goto(root+'?motors#controls/rumble');await page.locator('#rumble-seat').waitFor();await tick();
    const sample=action=>page.locator('[data-pulse="'+action+'"]').click();
    await page.selectOption('#rumble-seat','1');await page.selectOption('#rumble-level','2');await sample('knockout');
    assert.deepEqual(await page.evaluate(()=>pulses.at(-1)),{index:1,type:'dual-rumble',duration:145,startDelay:0,strongMagnitude:.94,weakMagnitude:.22});
    await page.selectOption('#rumble-seat','0');await sample('strike');
    assert.equal(await page.evaluate(()=>pulses.at(-1).weakMagnitude),.48*.48);
    await page.selectOption('#rumble-level','0');assert(await page.locator('[data-pulse=strike]').isDisabled());
    await page.reload();await tick();assert.deepEqual((await stored()).rumble,[0,2]);
    await page.selectOption('#rumble-seat','1');await tick();assert.equal(await page.locator('#rumble-level').inputValue(),'2');
    await page.evaluate(()=>{pads[1].vibrationActuator.playEffect=()=>Promise.reject(new Error('device busy'));});
    await sample('parry');assert.match(await page.locator('#rumble-result').textContent(),/could not play/);
    await page.evaluate(()=>{pads[1].vibrationActuator.effects=['trigger-rumble'];});await tick();
    assert(await page.locator('[data-pulse=parry]').isDisabled());assert.match(await page.locator('#rumble-device').textContent(),/unavailable/);
    await page.evaluate(()=>{window.pads=[];});await tick();assert.match(await page.locator('#rumble-device').textContent(),/Connect a controller/);
    await page.goto(root+'?motor-profile#local/profiles');await click('profile-seat-1');
    await page.locator('#profile-name').fill('Thunder');await click('profile-save');await click('profile-seat-0');
    await click('profile-use');if(await page.locator('#profile-pad-only').isVisible())await click('profile-pad-only');
    assert.deepEqual((await stored()).rumble,[2,2]);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await run(b);await controllerCheck(b);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
