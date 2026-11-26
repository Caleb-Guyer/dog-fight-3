const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Run browser input on hosted Linux.');
const {chromium}=require('playwright-core'),root='http://127.0.0.1:8080/';
async function play(browser,phone){
  const page=await browser.newPage({viewport:phone?{width:390,height:844}:{width:1280,height:720},isMobile:phone,hasTouch:phone,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=s=>phone?page.locator(s).tap():page.locator(s).click();
  try{
    await page.addInitScript(()=>localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{special:'KeyQ'},{}]})));
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root+(phone?'#moves/pip/neutral':''));
    if(!phone){
      assert.equal(await page.evaluate(()=>!!window.FighterSchool),false);
      await press('[data-enter-mode="local"]');
      await press('#lobby-moves');await press('[data-guide-section="specials"]');
      await page.route('**/fighter-lessons.js*',r=>r.abort(),{times:1});
      await press('[data-watch-special="neutral"]');await press('#dispatch-load-retry');
    }
    await page.locator('#move-frame').waitFor();
    const frame=()=>page.locator('#move-frame').textContent();
    const cleared=()=>page.evaluate(()=>FighterSchool.cleared(localStorage,'pip-2'));
    assert.equal(await page.locator('#dialog-title').textContent(),'Snap Bark');
    assert.equal(await page.locator('#move-play').textContent(),'Play');
    await page.clock.runFor(500);assert.match(await frame(),/^Frame 0 /);
    await press('#move-step');assert.match(await frame(),/^Frame 1 /);
    await press('#move-speed');await press('#move-play');await page.clock.runFor(1600);
    assert.equal(await page.locator('#move-play').textContent(),'Replay');
    assert.match(await page.locator('#move-caption').textContent(),/Both barks connected/);
    assert.equal(await cleared(),false);
    const bounds=await page.locator('#move-arena').boundingBox();
    assert(Math.abs(bounds.width/bounds.height-16/9)<.04);
    await press('#move-try');
    assert.match(await page.locator('#school-count').textContent(),/Pip · Special alone/);
    await press('#school-retry');await press('#school-example');await page.clock.runFor(3200);
    assert.equal(await cleared(),false);
    await press('#school-next');
    if(phone)await press('[data-touch="special"]');else await page.keyboard.press('q');
    await page.clock.runFor(900);
    assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'passed');assert(await cleared());
    await press('#school-next');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.watchSpecial),'neutral');
    await press('[data-watch-special="neutral"]');assert.match(await page.locator('#move-try').textContent(),/Practice again/);
    await press('#move-back');
    if(!phone){
      await page.keyboard.press('Escape');assert(await page.locator('#lobby').isVisible());
      await press('#start');await page.clock.runFor(3500);await press('#pause');
      const clock=await page.locator('#match-clock').textContent();
      await press('[data-do=moves]');await press('[data-guide-section="specials"]');await press('[data-watch-special="up"]');
      assert.equal(await page.locator('#move-try').count(),0);
      await press('#move-play');await page.clock.runFor(4800);assert.equal(await page.locator('#match-clock').textContent(),clock);
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      assert.equal(await page.locator('#dialog').getAttribute('data-view'),'pause');
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function downAirs(browser,device){
  const touch=device==='touch',controller=device==='controller';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1200,height:740},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    if(controller)await page.addInitScript(()=>{
      window.pad={id:'Test controller',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
    });
    await page.clock.install({time:new Date('2031-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2031-01-01T00:00:05Z'));
    const client=touch && await page.context().newCDPSession(page);
    const enter=async(id)=>{
      const el=page.locator(id);await el.waitFor();
      if(touch)return el.tap();
      if(!controller)return el.press('Enter');
      await el.focus();
      for(const on of [true,false]){
        await page.evaluate(v=>Object.assign(pad.buttons[0],{pressed:v,value:Number(v)}),on);
        await page.clock.runFor(32);
      }
    };
    for(const kind of ['pip','brisket','noodle','clover']){
      await page.goto(root+'?'+kind+'#moves/'+kind+'/down-air');
      await enter('#move-speed');await enter('#move-play');await page.clock.runFor(2600);
      assert.equal(await page.locator('#move-play').textContent(),'Replay');
      const clear=()=>page.evaluate(id=>FighterSchool.cleared(localStorage,id),kind+'-4');
      assert.equal(await clear(),false);
      await enter('#move-try');
      const steer=async(actions)=>{
        if(touch){
          const points=[];
          for(const [i,action] of actions.entries()){
            const rect=await page.locator('[data-touch='+action+']').boundingBox();assert(rect,action);
            points.push({id:i+1,x:rect.x+rect.width/2,y:rect.y+rect.height/2});
          }
          await client.send('Input.dispatchTouchEvent',{type:points.length?'touchStart':'touchEnd',touchPoints:points});
        }else if(controller){
          await page.evaluate(a=>{
            pad.axes[0]=Number(a.includes('right'));pad.axes[1]=Number(a.includes('down'));
            Object.assign(pad.buttons[2],{pressed:a.includes('attack'),value:Number(a.includes('attack'))});
          },actions);
        }else{
          for(const [action,key] of [['down','s'],['attack','j'],['right','d']])
            if(actions.includes(action))await page.keyboard.down(key);else await page.keyboard.up(key);
        }
      };
      await steer(['down','attack']);await page.clock.runFor(40);await steer([]);
      if(kind==='pip')await steer(['right']);
      await page.clock.runFor(1250);
      if(kind==='pip')await steer([]);
      assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'passed',kind+' '+device);
      assert(await clear());await enter('#school-next');
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.watchMove),'down-air');
      assert.equal(await page.locator('[data-guide-section="air"]').getAttribute('aria-pressed'),'true');
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(b,false);await play(b,true);for(const device of ['keyboard','touch','controller'])await downAirs(b,device);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
