const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux runner.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function play(browser,touch){
  const page=await browser.newPage(touch?{viewport:{width:844,height:390},hasTouch:true,isMobile:true}:{viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const click=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  try{
    await page.clock.install({time:new Date('2030-01-01Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(touch?root+'#local/fetch':root);
    if(!touch){
      assert.equal(await page.evaluate(()=>!!window.MoveGuide || !!window.FighterSchool),false);
      await click('[data-enter-mode=local]');await click('#ball-info');await click('[data-do=fetch-match]');
    }
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){window.fight=this;return step.apply(this,args);};
    });
    await page.clock.runFor(2650);
    if(touch)await click('[data-touch=grab]');else await page.keyboard.press('u');
    await page.clock.runFor(450);
    assert.equal(await page.evaluate(()=>fight.ball.holder),0);
    assert.match(await page.locator('#grapple-prompt').textContent(),/Pip has the ball/);
    if(touch)await click('[data-touch=attack]');else await page.keyboard.press('j');
    await page.clock.runFor(1100);
    assert.equal(await page.evaluate(()=>fight.dogs[1].damage),6);
    assert(await page.locator('#grapple-prompt').isHidden());
    if(!touch){
      await click('#pause');await page.route('**/move-guide.js*',r=>r.abort(),{times:1});
      await click('[data-do=moves]');await page.locator('#dispatch-load-retry').waitFor();await click('#dispatch-load-retry');
      await page.locator('[data-guide-section=defense]').waitFor();await click('[data-guide-section=defense]');
      assert(await page.locator('.guide-defense canvas').count()>0);
      await click('[data-guide-section=specials]');assert.equal(await page.locator('[data-watch-special]').count(),4);
      await click('[data-do=close]');assert(await page.locator('[data-do=resume]').isVisible());
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function airDrop(browser,touch,defend=false){
  const page=await browser.newPage(touch?{viewport:{width:844,height:390},hasTouch:true,isMobile:true}:{viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2030-01-01Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(root+(defend?'#solo/defend-drop':'#solo/drop-catch'));
    await page.waitForFunction(()=>!!window.DogFight?.Battle,null,{polling:50});
    await page.evaluate(()=>{
      window.itemEvents=[];
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){
        if(window.fight!==this){
          window.fight=this;const emit=this.emit;
          this.emit=(name,data)=>{if(['ballDrop','ballCatch','block'].includes(name))itemEvents.push(name);emit(name,data);};
        }
        return step.apply(this,args);
      };
    });
    if(defend)await page.keyboard.down('l');
    await page.clock.runFor(2330);
    for(let n=0;n<40 && !(await page.evaluate(()=>!!window.fight));n++)await page.clock.runFor(16);
    assert(await page.evaluate(()=>window.fight?.stage==='nightmail'));
    if(defend){
      await page.clock.runFor(350);await page.keyboard.up('l');
      const sample=await page.evaluate(()=>({damage:fight.dogs[0].damage,events:itemEvents}));
      assert.equal(sample.damage,0);assert.deepEqual(sample.events.slice(0,3),['ballDrop','ballCatch','block']);
    }else{
      async function press(action,key){
        if(touch){
          const box=await page.locator('[data-touch='+action+']').boundingBox();assert(box);
          await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
        }else await page.keyboard.press(key);
        await page.clock.runFor(32);
      }
      assert.match(await page.locator('#grapple-prompt').textContent(),/Neutral Grab to drop/);
      await press('grab','u');assert(await page.evaluate(()=>fight.ball.dropped));
      assert.match(await page.locator('#grapple-prompt').textContent(),/dropped the ball/);
      await press('attack','j');
      assert.deepEqual(await page.evaluate(()=>[fight.ball.holder,fight.ball.hits,fight.dogs[0].attack?.itemCatch]),[0,2,true]);
      assert.match(await page.locator('#grapple-prompt').textContent(),/Aerial catch/);
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{
    await play(browser,false);await play(browser,true);
    await airDrop(browser,false);await airDrop(browser,true);await airDrop(browser,false,true);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
