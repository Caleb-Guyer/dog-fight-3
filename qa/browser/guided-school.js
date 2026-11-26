const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux runner for input.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';

async function lesson(browser,device){
  const touch=device==='touch',pad=device==='controller';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},isMobile:touch,hasTouch:touch});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const click=id=>touch?page.locator('#'+id).tap():page.locator('#'+id).click();
  const coach=page.locator('#school-coach'),bindings=page.locator('#school-bindings');
  const clock=ms=>page.clock.runFor(ms);
  try{
    await page.addInitScript(device=>{
      localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{smash:'KeyV'}]}));
      if(device==='controller'){
        window.pad={index:0,id:'Hosted pad',mapping:'standard',axes:[0,0,0,0],connected:true,
          buttons:Array.from({length:17},()=>({value:0,pressed:false}))};
        Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
      }
    },device);
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:03Z'));
    await page.goto(root);
    await click('welcome-play');await click('school-list');await click('syllabus-guide');
    await page.waitForFunction(()=>!!window.LessonGuide,null,{polling:20});await clock(80);
    assert.equal(await coach.getAttribute('data-state'),'guided');
    await click('school-list');await page.locator('[data-lesson="9"]').click();await clock(60);
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      window.ticks=0;DogFight.Battle.prototype.step=function(...args){window.ticks++;return step.apply(this,args);};
    });
    const fingers=new Map(), cdp=touch && await page.context().newCDPSession(page);
    async function hold(action,on){
      if(pad){
        await page.evaluate(([a,v])=>{
          if(a==='right')pad.axes[0]=Number(v);
          else Object.assign(pad.buttons[7],{pressed:v,value:Number(v)});
        },[action,on]);
      }else if(touch){
        if(on){
          const box=await page.locator('[data-touch='+action+']').boundingBox();
          assert(box && box.y>=0 && box.y+box.height<=844);
          fingers.set(action,{id:action==='right'?1:2,x:box.x+box.width/2,y:box.y+box.height/2});
        }else fingers.delete(action);
        await cdp.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',touchPoints:[...fingers.values()]});
      }else{
        const key=action==='right'?'d':'v';
        if(on)await page.keyboard.down(key);else await page.keyboard.up(key);
      }
    }
    await hold('right',true);await clock(560);
    assert.equal(await page.evaluate(()=>ticks),0);
    assert.equal(await bindings.locator('[data-met=true]').count(),1);
    assert.match(await bindings.textContent(),touch?/Smash/:pad?/RT/:/V/);
    if(touch){
      const cues=page.locator('[data-lesson-cue="press"]');
      assert.deepEqual((await cues.evaluateAll(nodes=>nodes.map(n=>n.dataset.touch))).sort(),['right','smash']);
      assert.equal(await cues.first().evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
    }
    await hold('smash',true);await clock(840);
    assert.match(await page.locator('#school-task').textContent(),/kick is charged/);
    if(touch)assert.equal(await page.locator('[data-touch="smash"][data-lesson-cue="release"]').evaluate(n=>getComputedStyle(n).outlineStyle),'dashed');
    const frozen=await page.evaluate(()=>ticks);assert(frozen>20 && frozen<40);
    await clock(650);assert.equal(await page.evaluate(()=>ticks),frozen);
    await hold('smash',false);await hold('right',false);await clock(1100);
    assert.equal(await coach.getAttribute('data-state'),'passed');
    if(touch)assert.equal(await page.locator('[data-lesson-cue]').count(),0);
    assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.school')).passed)).includes('stock'));
    await page.goto(root+'?resume#tutorial');
    await page.waitForFunction(()=>!!window.LessonGuide,null,{polling:20});await clock(80);
    assert.equal(await coach.getAttribute('data-state'),'guided');
    assert.match(await page.locator('#school-task').textContent(),/gold post/);
    await click('school-guide');await clock(80);
    assert.equal(await coach.getAttribute('data-state'),'playing');
    await page.reload();await clock(80);assert.equal(await coach.getAttribute('data-state'),'playing');
    // An unavailable optional lesson asset leaves normal controls playable and offers a retry.
    if(device==='keyboard'){
      await page.route('**/lesson-guide.js*',route=>route.abort(),{times:1});
      await Promise.all([page.waitForEvent('requestfailed',r=>r.url().includes('lesson-guide.js')),
        page.goto(root+'?offline#tutorial/guided/air')]);
      await clock(200);assert.match(await page.locator('#school-guide').textContent(),/Retry guided/);
      await click('school-guide');await page.waitForFunction(()=>!!window.LessonGuide,null,{polling:20});await clock(100);
      assert.equal(await coach.getAttribute('data-state'),'guided');assert.match(await page.locator('#school-task').textContent(),/Jump and Attack/);
      await click('school-example');await page.waitForFunction(()=>!!window.FighterSchool,null,{polling:20});await clock(2600);
      assert.equal(await coach.getAttribute('data-state'),'example-ended');
      assert(!(await page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.school')).passed)).includes('air'));
      await click('school-next');await clock(60);assert.equal(await coach.getAttribute('data-state'),'guided');
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','controller','touch'])await lesson(browser,device);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
