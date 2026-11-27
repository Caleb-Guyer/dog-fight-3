const assert=require('node:assert/strict');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Playtest only on hosted Linux.');
const {chromium}=require('playwright-core'),{execFileSync}=require('node:child_process');
const root='http://127.0.0.1:8080/';
async function controls(browser,phone){
  const page=await browser.newPage({viewport:phone?{width:390,height:844}:{width:1440,height:900},hasTouch:phone});
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));
  await page.addInitScript(()=>{
    window.pad={id:'Standard',index:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.pad]});
  });
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  await page.goto(root);
  const active=()=>page.evaluate(()=>document.activeElement.id || document.activeElement.outerHTML.split('>').shift());
  const is=async sel=>assert(await page.locator(sel).evaluate(el=>el===document.activeElement),sel+' expected, got '+await active());
  const hold=async(code=-1,x=0,y=0,ms=48)=>{
    await page.evaluate(([n,x,y])=>{pad.buttons.forEach((b,i)=>b.pressed=i===n);pad.axes=[x,y,0,0];},[code,x,y]);
    await page.clock.runFor(ms);
  };
  const tap=async code=>{await hold(code);await hold();};
  const focus=selector=>page.locator(selector).focus();
  await is('#welcome-play');
  // No pointer or direct focus calls during the desktop journey from welcome into fighter select.
  if(!phone){
    await tap(15);await is('#welcome-field');await tap(15);await is('#welcome-dismiss');await tap(0);await is('#home-adventure');
    await hold(-1,.9,0);await hold();
    const row=()=>page.evaluate(()=>[...document.querySelectorAll('.mode-rack button')].indexOf(document.activeElement));
    const entered=await row();assert(entered>=0,'Right should enter the mode rack');
    await tap(14);await is('#home-adventure');await tap(15);assert.equal(await row(),entered);
    for(let i=entered;i!==1;i+=i>1?-1:1)await tap(i>1?12:13);
    await is('[data-enter-mode=solo]');await tap(0);await is('#roster [data-kind=pip]');
    await tap(15);
    const dog=await page.evaluate(()=>document.activeElement.dataset.kind);assert(dog && dog!=='pip');
    await tap(0);await is('#roster [data-kind="'+dog+'"]');await tap(1);
    await is('[data-enter-mode=solo]');await tap(0);await is('#roster [data-kind="'+dog+'"]');
    await tap(9);await page.locator('#game').waitFor({state:'visible'});await page.clock.runFor(3500);
    await tap(9);assert.equal(await page.locator('#dialog').getAttribute('data-view'),'pause');
    await tap(1);assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);
    await page.goto(root+'?menus');
  }
  await focus('#home-options');await tap(0);await is('[data-do=option-sound]');
  await tap(13);await is('#option-volume');
  const volume=()=>page.locator('#option-volume').inputValue();
  const initial=Number(await volume());
  await hold(14);assert.equal(Number(await volume()),initial-5);
  await page.clock.runFor(200);assert.equal(Number(await volume()),initial-5);
  await page.clock.runFor(420);assert(Number(await volume())<=initial-15);
  await hold();
  await tap(13);await is('#option-music');await tap(13);await is('#open-sound-test');await tap(0);
  await is('#audition-track');const original=await page.locator('#audition-track').inputValue();
  await tap(15);assert.notEqual(await page.locator('#audition-track').inputValue(),original);
  await tap(1);await is('#open-sound-test');await tap(1);await is('#home-options');
  // Keyboard travel on the real responsive roster and native Tab navigation after controller use.
  await focus('[data-enter-mode=solo]');await page.keyboard.press('Enter');
  await focus('#roster [data-kind=pip]');await page.keyboard.press('ArrowRight');
  const card=await page.evaluate(()=>document.activeElement.dataset.kind);assert(card && card!=='pip');
  assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('pad-navigation')),false);
  await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement.dataset.kind),card);
  await focus('#choose-stage');await tap(0);
  const before=await active();await tap(13);assert.notEqual(await active(),before,'down should reach the arena below');
  await tap(1);await is('#choose-stage');
  // Layout geometry is consulted on navigation edges only.
  await page.evaluate(()=>{window.reads=0;const get=Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect=function(){if(this.matches('#roster button,.mode-rack button'))reads++;return get.call(this);};});
  await page.clock.runFor(850);assert.equal(await page.evaluate(()=>reads),0);
  await page.goto(root+'?codepad#online');
  await page.locator('#online-code').fill('AB');await focus('#online-code');await tap(0);await is('[data-letter=A]');
  assert.equal(await page.locator('#code-join').isDisabled(),true);
  await tap(15);await tap(0);await tap(2);await is('[data-letter=B]');
  await tap(1);await is('#online-code');assert.equal(await page.locator('#online-code').inputValue(),'AB');
  await focus('#open-code-pad');await tap(0);
  // A A J K fills the final four positions of the draft. A full entry takes focus to Join.
  await tap(0);await tap(0);await tap(13);await is('[data-letter=J]');await tap(0);await tap(15);await tap(0);
  await is('#code-join');assert.equal(await page.locator('#room-digits').textContent(),'ABAAJK');
  await tap(2);await is('[data-letter=K]');await tap(15);await tap(0);
  assert.equal(await page.locator('#room-digits').textContent(),'ABAAJL');
  await tap(1);await is('#open-code-pad');
  assert.equal(await page.locator('#online-code').inputValue(),'AB');
  assert.deepEqual(errors,[]);await page.close();
}
(async()=>{
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try{await controls(browser,false);await controls(browser,true);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
