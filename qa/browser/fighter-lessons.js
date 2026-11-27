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
async function startCloverSpar(page,mobile=false){
  // Replay the same Rookie opening so each input device gets the same disc-catching window.
  await page.evaluate(()=>{
    const original=crypto.getRandomValues;
    crypto.getRandomValues=function(array){
      if(array instanceof Uint32Array && array.length===1){
        delete crypto.getRandomValues;array[0]=7;return array;
      }
      return original.call(this,array);
    };
  });
  const start=page.locator('[data-class-spar]');
  if(mobile)await start.tap();else await start.click();
  await page.clock.runFor(2490);
}
async function firstExample(browser){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await clock(page);
  try{
    const lessonFile=/\/fighter-lessons\.js(?:\?|$)/;
    let attempts=0;
    await page.route(lessonFile,route=>++attempts===1
      ?route.fulfill({status:503,contentType:'text/plain',body:'Lesson unavailable'})
      :route.continue());
    await page.goto(root+'#tutorial');
    const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.school')).passed);
    await page.locator('#school-coach[data-state=playing]').waitFor();
    await page.locator('#game:focus').waitFor();
    const failed=page.waitForResponse(response=>lessonFile.test(response.url()) && response.status()===503);
    await page.keyboard.press('Enter');
    await failed;
    await page.clock.runFor(40);
    await page.getByText('Lesson example could not load.',{exact:true}).waitFor();
    await page.getByRole('dialog',{name:'Lesson example'}).getByRole('button',{name:'Retry',exact:true}).click();
    await page.locator('#school-coach[data-state=example]').waitFor();
    assert.equal(attempts,2);
    await page.clock.runFor(900);await state(page,'example');
    await page.clock.runFor(1800);await state(page,'example-ended');
    assert.deepEqual(await saved(),[]);
    await page.locator('#school-example').click();
    await state(page,'example');
    await page.keyboard.press('Enter');await state(page,'playing');
    await page.clock.runFor(1700);
    assert.deepEqual(await saved(),[]);
    await page.keyboard.down('d');await page.clock.runFor(1500);await page.keyboard.up('d');
    await state(page,'passed');assert.deepEqual(await saved(),['move']);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
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
    await click('#school-example');
    assert.equal(await page.locator('#school-bindings').textContent(),'D + Q');
    await page.keyboard.down('a');await time(3600);await page.keyboard.up('a');
    await state(page,'example-ended');
    assert.equal(await page.evaluate(()=>localStorage.getItem('dog-fight-3.fighter-lesson.pip-0')),null);
    await page.keyboard.press('Enter');await state(page,'playing');
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
    await tap('#school-example');await state(page,'example');
    assert.equal(await page.locator('#school-bindings').textContent(),'Up + Right + Special');
    await page.clock.runFor(4200);await state(page,'example-ended');
    await tap('#school-next');await state(page,'playing');
    await press(['up','special'],85);await page.clock.runFor(410);await press(['right'],650);
    await state(page,'passed');await tap('#school-next');await tap('[data-class-back]');await state(page,'passed');
    await tap('#school-list');await tap('[data-do=home]');assert(await page.locator('#home').isVisible());
    await page.goto(root+'?direct#fighters/clover/recovery');
    await page.locator('#school-example').waitFor();
    assert.match(await page.locator('#school-title').textContent(),/Fold the sail/);
    await page.goto(root+'?touch-spar#fighters/clover');await startCloverSpar(page,true);
    assert.match(await page.locator('#corner-line').textContent(),/Special/);
    await press(['special'],32);await page.clock.runFor(330);await press(['right','special'],55);
    await page.clock.runFor(760);await tap('#pause');
    assert.match(await page.locator('#dialog-body').textContent(),/Chase the disc · Landed in this fight/);
    await tap('[data-spar-lesson="1"]');await tap('#school-list');
    assert.equal(await page.locator('#match-mode').textContent(),'Sparring · Clover');
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
    await input(0,0,8,100);await state(page,'example');await input(0,0,-1,50);
    assert.match(await page.locator('#school-bindings').textContent(),/Stick up \+ Stick right \+ B/);
    await input(0,0,0,100);await state(page,'playing');await input(0,0,-1,50);
    assert.equal(await page.evaluate(()=>localStorage.getItem('dog-fight-3.fighter-lesson.brisket-1')),null);
    await input(1,-1,1,320);await input(1,0,-1,1900);
    await state(page,'passed');await input(0,0,0,60);
    assert.match(await page.locator(lesson(1)).textContent(),/✓/);
    await page.goto(root+'?pad-spar#fighters/clover');await startCloverSpar(page);
    await input(0,0,1,32);await input(0,0,-1,330);
    await input(1,0,1,55);await input(0,0,-1,760);
    await page.locator('#pause').click();
    assert.match(await page.locator('#dialog-body').textContent(),/Chase the disc · Landed in this fight/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function sparring(browser){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await clock(page);
  const click=s=>page.locator(s).click(),time=ms=>page.clock.runFor(ms);
  try{
    await page.goto(root+'#fighters/clover');
    await page.evaluate(()=>{
      const proto=DogFight.Battle.prototype,step=proto.step;
      proto.step=function(...args){
        const result=step.apply(this,args);
        if(this.mode==='solo')window.sparWorld=this;
        return result;
      };
    });
    await startCloverSpar(page);
    assert.equal(await page.locator('#match-mode').textContent(),'Sparring · Clover');
    assert.equal(await page.evaluate(()=>sparWorld.dogs.map(f=>f.stocks).join()),'3,3');
    await page.keyboard.down('k');await time(32);await page.keyboard.up('k');
    await time(330);await page.keyboard.down('d');await page.keyboard.down('k');await time(55);
    await page.keyboard.up('k');await page.keyboard.up('d');await time(760);
    const position=()=>page.evaluate(()=>[sparWorld.matchFrames,sparWorld.clockFrames,...sparWorld.dogs.map(f=>[f.x,f.y,f.stocks,f.damage])]);
    await click('#pause');const before=await position();
    assert.match(await page.locator('#dialog-body').textContent(),/Chase the disc · Landed in this fight/);
    await click('[data-spar-lesson="1"]');await click('#school-example');await time(700);
    await click('#school-list');assert.equal(await page.locator('#match-mode').textContent(),'Sparring · Clover');
    assert.deepEqual(await position(),before);
    let held='';
    for(let i=0;i<135 && !await page.locator('[data-do=spar-card]').count();i++){
      const key=await page.evaluate(()=>sparWorld.dogs[0].x<sparWorld.dogs[1].x?'a':'d');
      if(key!==held){
        if(held)await page.keyboard.up(held);
        held=key;await page.keyboard.down(held);
      }
      await time(400);
    }
    if(held)await page.keyboard.up(held);
    assert.equal(await page.locator('[data-do=spar-card]').count(),1,
      JSON.stringify({position:await position(),dialog:await page.locator('#dialog-title').textContent(),errors}));
    await page.getByRole('heading',{name:'Sparring result'}).waitFor();
    assert.match(await page.locator('#dialog-body').textContent(),/Chase the disc · Landed in this fight/);
    await click('[data-do=match-card]');await page.locator('.card-stats').waitFor();
    await click('[data-do=card-back]');await click('[data-do=spar-card]');
    assert.match(await page.locator('[data-spar-record]').textContent(),/Signature ✓ · Recovery — · Match win —/);
    await click('[data-class-back]');await page.getByRole('heading',{name:'Sparring result'}).waitFor();
    await page.goto(root+'?reload#fighters/clover');
    assert.match(await page.locator('[data-spar-record]').textContent(),/Signature ✓/);
    await click(dog('pip'));assert.doesNotMatch(await page.locator('[data-spar-record]').textContent(),/✓/);
    await page.goto(root+'?link#fighters/noodle/spar');await page.locator('#pause').waitFor();
    assert.equal(await page.locator('#match-mode').textContent(),'Sparring · Noodle');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await firstExample(b);await keyboard(b);await touch(b);await controller(b);await sparring(b);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
