const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux browser runner.');
const {chromium}=require('playwright-core'),root='http://127.0.0.1:8080/';
const lesson=i=>'[data-fighter-lesson="'+i+'"]', dog=id=>'[data-class-dog="'+id+'"]';
async function clock(page){
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
}
async function state(page,value){
  assert.equal(await page.locator('#school-coach').getAttribute('data-state'),value,await page.locator('#school-task').innerText());
}
async function keyboard(browser){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{special:'KeyQ'},{}]})));
  await clock(page);
  const click=s=>page.locator(s).click(), time=ms=>page.clock.runFor(ms);
  try{
    await page.goto(root);assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('fighter-lessons.js'))),false);
    await click('#home-school');
    const basic=await page.evaluate(()=>localStorage.getItem('dog-fight-3.school'));
    let release;
    const gate=new Promise(r=>{release=r;});
    await page.route('**/fighter-lessons.js*',async route=>{await gate;await route.continue();});
    await click('[data-do=fighter-classes]');await click('#dispatch-load-back');release();
    await page.evaluate(()=>window.FighterSchool || new Promise(resolve=>
      document.querySelector('script[src*="fighter-lessons.js"]').addEventListener('load',()=>resolve(true),{once:true})));
    assert.equal(await page.locator('#dialog-title').textContent(),'Fight School');
    await click('[data-do=fighter-classes]');await click(dog('pip'));await click(lesson(0));
    assert.match(await page.locator('#school-bindings').textContent(),/D \+ Q/);
    await page.keyboard.down('d');await page.keyboard.down('q');await time(80);await page.keyboard.up('q');await time(120);
    await state(page,'playing');await page.keyboard.down('q');await time(250);await page.keyboard.up('q');await page.keyboard.up('d');
    await state(page,'passed');await page.keyboard.press('Enter');
    assert.match(await page.locator('#school-title').textContent(),/second hop/);
    await page.keyboard.down('w');await page.keyboard.down('d');await page.keyboard.down('q');await time(65);await page.keyboard.up('q');
    await time(135);await page.keyboard.down('q');await time(65);await page.keyboard.up('q');await page.keyboard.up('w');
    await time(1900);await page.keyboard.up('d');await state(page,'passed');
    await click('#school-next');assert.match(await page.locator(lesson(1)).textContent(),/✓/);
    await page.goto(root+'?saved#fighters/pip');assert.match(await page.locator(lesson(0)).textContent(),/✓/);
    assert.match(await page.locator(lesson(1)).textContent(),/✓/);
    await click(dog('clover'));assert.doesNotMatch(await page.locator(lesson(0)).textContent(),/✓/);
    assert.equal(await page.evaluate(()=>localStorage.getItem('dog-fight-3.school')),basic);
    await click('[data-class-cup]');assert.equal(await page.locator('[data-cup-dog=clover]').getAttribute('aria-pressed'),'true');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function touch(browser){
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await clock(page);
  const cdp=await ctx.newCDPSession(page),tap=s=>page.locator(s).tap();
  async function press(actions,ms){
    const points=[];
    for(const action of actions){
      const rect=await page.locator('[data-touch="'+action+'"]').boundingBox();
      assert(rect && rect.y+rect.height<=844,action+' fits screen');
      points.push({id:points.length+1,x:rect.x+rect.width/2,y:rect.y+rect.height/2});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
    }
    await page.clock.runFor(ms);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  try{
    await page.goto(root+'#fighters/noodle');await tap(lesson(0));await tap('#school-retry');
    assert.equal(await page.locator('#school-bindings').textContent(),'Special → Attack');
    await press(['special'],64);
    for(let i=0;i<14 && !(await page.locator('#school-task').textContent()).includes('reels');i++)await page.clock.runFor(16);
    assert.match(await page.locator('#school-task').textContent(),/reels/);
    for(let i=0;i<25 && !(await page.locator('#school-task').textContent()).includes('Tap Attack now');i++)await page.clock.runFor(24);
    assert.match(await page.locator('#school-task').textContent(),/Tap Attack now/);
    await press(['attack'],220);
    await state(page,'passed');await tap('#school-next');
    await press(['up','special'],85);await page.clock.runFor(410);await press(['right'],650);
    await state(page,'passed');await tap('#school-next');await tap('[data-class-back]');await state(page,'passed');
    await tap('#school-list');await tap('[data-do=home]');assert(await page.locator('#home').isVisible());
    assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
}
async function controller(browser){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await clock(page);
  await page.addInitScript(()=>{
    window.pad={id:'Practice pad',index:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.pad]});
  });
  async function input(x,y,button,ms){
    await page.evaluate(([x,y,button])=>{
      pad.axes[0]=x;pad.axes[1]=y;
      pad.buttons.forEach((b,i)=>{b.pressed=i===button;b.value=Number(b.pressed);});
    },[x,y,button]);await page.clock.runFor(ms);
  }
  try{
    await page.goto(root+'#fighters/brisket');await page.locator(lesson(1)).click();
    assert.match(await page.locator('#school-bindings').textContent(),/Stick up \+ B/);
    await input(1,-1,1,320);await input(1,0,-1,1900);
    await state(page,'passed');await input(0,0,0,60);
    assert.match(await page.locator(lesson(1)).textContent(),/✓/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await keyboard(b);await touch(b);await controller(b);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
