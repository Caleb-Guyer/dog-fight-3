const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use a hosted Linux runner for browser input.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function match(browser,device){
  const touch=device==='touch',pad=device==='controller';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    if(pad)await page.addInitScript(()=>{
      window.pad={id:'Hosted pad',mapping:'standard',index:0,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[window.pad]});
    });
    const choose=async selector=>{
      const el=page.locator(selector);await el.waitFor();
      if(touch)return el.tap();
      if(!pad)return el.click();
      if(selector==='#pause'){
        for(const pressed of [true,false]){
          await page.evaluate(v=>Object.assign(pad.buttons[9],{pressed:v,value:Number(v)}),pressed);
          await page.clock.runFor(48);
        }
        return;
      }
      await el.focus();
      await page.evaluate(()=>Object.assign(pad.buttons[0],{pressed:true,value:1}));await page.clock.runFor(48);
      await page.evaluate(()=>Object.assign(pad.buttons[0],{pressed:false,value:0}));await page.clock.runFor(48);
    };
    await page.goto(root+'#solo');await choose('[data-mode=local]');await choose('#start');
    await page.clock.runFor(7800);
    await choose('#pause');await choose('[data-do=instant-replay]');
    assert.equal(await page.locator('#clip-seek').getAttribute('max'),'240');
    await choose('#clip-exchange');assert.equal(await page.locator('[data-finish-slot]').count(),2);
    await choose('#finish-picker-back');await choose('[data-do=clip-back]');
    assert.equal(await page.locator('#dialog-title').textContent(),'Paused');
    await choose('[data-do=resume]');
    const cdp=touch && await page.context().newCDPSession(page);
    const move=async(on,practice=false)=>{
      if(practice && pad)return page.evaluate(on=>{pad.axes[0]=on?-1:0;},on);
      if(!touch)return on?page.keyboard.down('a'):page.keyboard.up('a');
      if(!on)return cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const b=await page.locator('[data-touch=left]').boundingBox();
      return cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});
    };
    await move(true);
    for(let i=0;i<25 && !await page.locator('[data-do=watch-match]').count();i++)await page.clock.runFor(1100);
    await move(false);
    assert.match(await page.locator('#result-turning-point').textContent(),/took the lead at/);
    assert(await page.locator('#result-review:not([open])').isVisible());
    assert.equal(await page.locator('[data-do=watch-match]').isVisible(),false);
    assert.deepEqual(await page.locator('.final-score').allTextContents(),['3','0']);
    const fall=page.locator('[data-latest-fall="0"]');
    assert.equal(await page.locator('[data-latest-fall="1"]').count(),0);
    await choose('[data-latest-fall="0"]');await page.locator('#clip-seek').press('End');
    assert.match(await page.locator('#clip-scores').textContent(),/Pip .+0 stocks/);
    await choose('[data-do=clip-back]');assert(await fall.evaluate(el=>document.activeElement===el));
    await page.screenshot({path:'result-'+device+'.png'});
    await choose('#result-review > summary');
    assert(await page.locator('#result-highlight').isVisible());
    if(device==='keyboard')await page.screenshot({path:'result-tools.png'});
    await choose('#result-highlight');
    const seek=page.locator('#clip-seek');
    const decidingFrame=Number(await seek.inputValue());assert(decidingFrame>0);
    assert.match(await page.locator('#film-turning-point').textContent(),/took the lead at/);
    await choose('#film-knockouts summary');await choose('#film-knockouts button >> nth=0');
    assert.equal(Number(await seek.inputValue()),decidingFrame+60,'the deciding lead precedes the final stock');
    await choose('#film-turning-point button');assert.equal(Number(await seek.inputValue()),decidingFrame);
    await choose('#film-back');await page.locator('#result-highlight:focus').waitFor();
    await choose('[data-do=watch-match]');
    assert(Number(await seek.getAttribute('max'))>360);
    assert.equal(await seek.inputValue(),'0');
    assert.equal(await page.locator('#film-play').textContent(),'Play');
    await choose('#film-play');await page.clock.runFor(1200);await choose('#film-play');
    const frame=Number(await seek.inputValue());assert(frame>=60 && frame<100);
    await choose('#film-step');assert.equal(Number(await seek.inputValue()),frame+1);
    await choose('#film-speed');assert.match(await page.locator('#film-speed').textContent(),/2×/);
    await choose('#film-knockouts summary');
    const leadIns='#film-knockouts button:not([data-stock-at])',retries='#film-knockouts [data-stock-at][data-stock-slot="0"]';
    assert.equal(await page.locator(leadIns).count(),3);
    assert.equal(await page.locator(retries).count(),3);
    await choose(leadIns+' >> nth=2');const leadFrame=await seek.inputValue();assert(Number(leadFrame)>360);
    await choose(retries+' >> nth=2');assert.equal(await page.locator('#dialog-title').textContent(),'Retry P1’s stock 3');
    await choose('#stock-back');assert.equal(await seek.inputValue(),leadFrame);
    await seek.press('Home');assert.equal(await seek.inputValue(),'0');
    await choose('#film-p1');await page.clock.runFor(850);await move(true,true);
    await page.clock.runFor(4300);await move(false,true);
    await page.locator('[data-do=trial-replay]').waitFor();
    const cells=await page.locator('.finish-comparison tbody tr').first().locator('td').allTextContents();
    assert.notEqual(cells[0],cells[1],'taking over the quiet opening changes the stock');
    await choose('[data-do=trial-replay]');assert.equal(await seek.inputValue(),'0');
    await choose('#film-back');assert.equal(await page.locator('#dialog').getAttribute('data-view'),'result');
    await page.goto(root+'?saved#records');await choose('[data-record-id]');
    await choose('[data-saved-clip=highlight]');assert.equal(Number(await seek.inputValue()),decidingFrame);
    await choose('#film-p1');await page.clock.runFor(5200);await choose('[data-do=trial-replay]');
    assert.equal(Number(await seek.inputValue()),decidingFrame);
    await choose('#film-back');await page.locator('[data-saved-clip=highlight]:focus').waitFor();
    await choose('[data-saved-clip=full]');await seek.press('End');
    assert.equal(await page.locator('#film-play').textContent(),'Watch again');
    await choose('#film-rewind');const savedFrame=await seek.inputValue();
    await choose('#film-p2');await page.clock.runFor(5200);
    await choose('[data-do=trial-replay]');assert.equal(await seek.inputValue(),savedFrame);
    await choose('#film-back');await page.waitForFunction(()=>document.activeElement.dataset.savedClip==='full');
    assert(await page.locator('#dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
    await page.goto(root+'?instant#solo/shoulder-charge');
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){
        window.originalFight ||= this;
        if(this===originalFight && window.resuming && !window.firstResumed)window.firstResumed=fingerprint();
        return step.apply(this,args);
      };
      window.fingerprint=()=>JSON.stringify([originalFight.matchFrames,originalFight.clockFrames,originalFight.random.state,
        originalFight.matchCard,originalFight.dogs.map(f=>[f.x,f.y,f.stocks,f.damage])]);
    });
    await choose('[data-do=resume]');await page.clock.runFor(420);await choose('#pause');
    const frozen=await page.evaluate(()=>fingerprint());
    await choose('[data-do=instant-replay]');
    const shoulder='[data-clip-moment]:has-text("Shoulder Charge")';
    await choose(shoulder);
    const contact=await page.locator('#clip-seek').inputValue();
    assert.match(await page.locator('#clip-retry p').textContent(),/P2 Brisket landed Shoulder Charge for 15%/);
    await choose('#clip-retry button:first-child');
    if(touch){
      const rect=await page.locator('[data-touch=shield]').boundingBox();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:rect.x+rect.width/2,y:rect.y+rect.height/2}]});
    }else if(pad)await page.evaluate(()=>Object.assign(pad.buttons[4],{pressed:true,value:1}));
    else await page.keyboard.down('l');
    await page.clock.runFor(2200);
    if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else if(pad)await page.evaluate(()=>Object.assign(pad.buttons[4],{pressed:false,value:0}));
    else await page.keyboard.up('l');
    const taken=page.getByRole('row',{name:/Damage taken/});
    assert.deepEqual(await taken.locator('td').allTextContents(),['15%','0%'],device);
    assert.equal(await page.evaluate(()=>fingerprint()),frozen);
    await choose('[data-do=trial-replay]');assert.equal(await seek.inputValue(),contact);
    await choose(shoulder);await choose('#clip-retry button:last-child');
    assert.match(await page.locator('#match-mode').textContent(),/P2 Brisket/);
    await page.clock.runFor(2400);await page.evaluate(()=>{window.resuming=true;});
    await choose('[data-do=trial-results]');await page.clock.runFor(100);
    assert.equal(await page.evaluate(()=>firstResumed),frozen);
    await page.goto(root+'?landing-clinic#tutorial/landings');
    const panel=page.locator('#clip-landings');
    await panel.locator('[data-after]').waitFor({state:'visible'});
    assert.match(await panel.locator('[data-before]').textContent(),/Pip · Knocked down. No Shield tap/);
    assert.match(await panel.locator('[data-after]').textContent(),/Landed in place on frame 98/);
    await choose('#clip-landings [data-dir="1"]');
    assert.match(await panel.locator('[data-after]').textContent(),/Rolled right/);
    await choose('[data-guided]');await page.clock.runFor(1700);
    assert.equal(await page.locator('#countdown').textContent(),'Tap Shield',device);
    if(touch)await page.locator('[data-touch=shield]').tap();
    else if(pad)await page.evaluate(()=>Object.assign(pad.buttons[4],{pressed:true,value:1}));
    else await page.keyboard.press('l');
    await page.clock.runFor(650);
    if(pad)await page.evaluate(()=>Object.assign(pad.buttons[4],{pressed:false,value:0}));
    assert.equal(await page.locator('#dialog-title').textContent(),'Landed in place',device);
    assert.match(await page.locator('.finish-comparison').innerText(),/5 frames before impact/);
    await choose('[data-do=landing-speed]');await page.clock.runFor(2300);
    assert.equal(await page.locator('#dialog-title').textContent(),'Knocked down',device);
    await choose('[data-do=trial-results]');
    assert.equal(await page.locator('#dialog-title').textContent(),'Fight School');
    console.log(device+' passed guided and match-speed landing comparison from a recorded throw.');
    await choose('#dialog-body button:text-is("Stage tech clinic")');
    await panel.locator('[data-after]').waitFor({state:'visible'});
    assert.match(await panel.locator('[data-before]').textContent(),/Noodle · Bounced off the wall/);
    assert.match(await panel.locator('[data-after]').textContent(),/Braced against the wall on frame 15/);
    assert.equal(await panel.locator('[data-fall] option').count(),2);
    await choose('#clip-stage-damage');await panel.locator('[data-up]').waitFor();
    assert.match(await panel.locator('[data-after]').textContent(),/too fast to tech/);
    await choose('#clip-landings [data-up]');
    assert.match(await panel.locator('[data-after]').textContent(),/Braced against the wall/);
    if(!touch){
      await choose('#clip-landings [data-wall-jump]');
      assert.match(await panel.locator('[data-after]').textContent(),/Wall-tech jump/);
      await choose('[data-guided]');await page.clock.runFor(1400);
      assert.equal(await page.locator('#countdown').textContent(),'Hold Up');
      if(pad)await page.evaluate(()=>{pad.axes[1]=-1;});else await page.keyboard.down('w');
      await page.clock.runFor(250);
      assert.equal(await page.locator('#countdown').textContent(),'Jump + Shield');
      if(pad)await page.evaluate(()=>{for(const i of [0,4])Object.assign(pad.buttons[i],{pressed:true,value:1});});
      else {await page.keyboard.down('Space');await page.keyboard.down('l');}
      await page.clock.runFor(700);
      if(pad)await page.evaluate(()=>{pad.axes[1]=0;for(const i of [0,4])Object.assign(pad.buttons[i],{pressed:false,value:0});});
      else {await page.keyboard.up('l');await page.keyboard.up('Space');await page.keyboard.up('w');}
      await page.clock.runFor(48);
      assert.equal(await page.locator('#dialog-title').textContent(),'Wall-tech jump',device);
      await choose('[data-do=trial-replay]');await panel.locator('[data-up]').waitFor();await page.clock.runFor(100);
      assert.equal(await panel.locator('[data-wall-jump]').isChecked(),true);
      assert.equal(await panel.locator('[data-up]').isChecked(),true);
    }
    await choose('#clip-stage-other');await panel.locator('[data-after]').waitFor();
    assert.match(await panel.locator('[data-before]').textContent(),/Bounced off the ceiling/);
    assert.equal(await panel.locator('[data-wall-jump]').isVisible(),false);
    await choose('[data-guided]');await page.clock.runFor(1400);
    assert.equal(await page.locator('#countdown').textContent(),'Tap Shield');
    if(touch)await page.locator('[data-touch=shield]').tap();
    else if(pad)await page.evaluate(()=>Object.assign(pad.buttons[4],{pressed:true,value:1}));
    else await page.keyboard.press('l');
    await page.clock.runFor(700);
    if(pad)await page.evaluate(()=>Object.assign(pad.buttons[4],{pressed:false,value:0}));
    assert.equal(await page.locator('#dialog-title').textContent(),'Braced against the ceiling',device);
    await choose('[data-do=trial-results]');
    assert.equal(await page.locator('#dialog-title').textContent(),'Fight School');
    await page.goto(root+'?defense#records');await page.locator('#record-example').waitFor();
    const recordCount=await page.locator('[data-record-id]').count();
    if(device==='keyboard'){await page.goto(root+'?direct#records/study');await page.waitForLoadState('networkidle');}
    else await choose('#record-example');
    const defense=page.locator('#film-defense'),go='#film-defense [data-study]';
    await page.clock.runFor(900);
    await defense.locator('[data-study]').waitFor();
    assert.equal(await defense.locator('select option').count(),4);
    assert.equal(await seek.inputValue(),'98');
    await choose('#film-defense [data-next]');assert.equal(await seek.inputValue(),'616');
    await choose(go);await page.clock.runFor(100);
    assert.match(await panel.locator('[data-before]').textContent(),/Landed in place/);
    await choose('[data-guided]');await page.clock.runFor(1600);
    assert.equal(await page.locator('#countdown').textContent(),'Tap Shield',device);
    if(touch)await page.locator('[data-touch=shield]').tap();
    else if(pad)await page.evaluate(()=>Object.assign(pad.buttons[4],{pressed:true,value:1}));
    else await page.keyboard.press('l');
    await page.clock.runFor(650);
    if(pad)await page.evaluate(()=>Object.assign(pad.buttons[4],{pressed:false,value:0}));
    assert.equal(await page.locator('#dialog-title').textContent(),'Landed in place');
    await choose('[data-do=trial-replay]');await page.clock.runFor(120);
    assert.equal(await page.locator('#dialog-title').textContent(),'Landing tech');
    await choose('[data-do=clip-back]');await page.clock.runFor(120);
    assert.equal(await seek.inputValue(),'616');
    await choose('#film-defense [data-next]');await choose('#film-defense [data-next]');
    assert.match(await defense.locator('select option:checked').textContent(),/Shield break/);
    await choose(go);await page.clock.runFor(3500);
    assert.equal(await page.locator('#dialog-title').textContent(),'Shield break avoided',device);
    const damage=page.locator('.finish-comparison tr').filter({hasText:'Damage taken'});
    assert.deepEqual(await damage.locator('td').allTextContents(),['0%','20.5%']);
    await choose('[data-do=trial-results]');await page.clock.runFor(120);
    assert.equal(await seek.inputValue(),'1051');
    await choose('#film-defense [data-prev]');await choose(go);
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){
        const value=step.apply(this,args);
        if(document.querySelector('#match-mode')?.textContent.startsWith('Defense practice'))window.defenseFrame=this.matchFrames;
        return value;
      };
    });
    async function shield(pressed){
      if(pad)return page.evaluate(v=>Object.assign(pad.buttons[4],{pressed:v,value:Number(v)}),pressed);
      if(!touch)return pressed?page.keyboard.down('l'):page.keyboard.up('l');
      if(!pressed)return cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const b=await page.locator('[data-touch=shield]').boundingBox();
      return cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]});
    }
    await shield(true);await page.clock.runFor(900);
    for(let i=0;i<70 && !await page.evaluate(()=>window.defenseFrame>=819);i++)await page.clock.runFor(12);
    assert.equal(await page.evaluate(()=>window.defenseFrame),819,device);
    await shield(false);await page.clock.runFor(2000);
    assert.equal(await page.locator('#dialog-title').textContent(),'Parry landed',device);
    await choose('[data-do=trial-results]');await page.clock.runFor(100);
    await choose('#film-back');assert.equal(await page.locator('#dialog-title').textContent(),'Fight Records');
    assert.equal(await page.locator('[data-record-id]').count(),recordCount,'sample practice must not create fight records');
    // Save a real, newly finished couch fight in which P2 missed the landing.
    const id=await page.evaluate(async()=>{
      const {Battle,FinishTape,idleInput,seededRandom}=DogFight,tape=new FinishTape(true);
      const w=new Battle({mode:'local',p1:'brisket',p2:'pip',stage:'nightmail',lives:1,minutes:0,fetch:false},undefined,seededRandom(27));
      w.resetTraining();w.dogs[1].damage=35;
      for(let n=0;n<900 && w.end===null;n++){
        const p1={...idleInput,grab:n===0,y:w.grapple?.phase==='hold'?-1:0},p2={...idleInput,x:n>155?1:0};
        tape.record(w,p1,p2);w.step(1/60,p1,p2);
      }
      if(w.end!==0 || w.matchCard.players[1].knockdowns!==1)throw Error('Saved study fixture did not finish');
      tape.captureKnockouts(w);
      const key=new FightRecords.Book(localStorage).add({mode:'local',side:0,round:0,time:Date.now(),winner:w.end,stage:w.stage,form:w.form,card:w.matchCard,replay:true});
      await MatchReview.save(key,tape);return key;
    });
    await page.goto(root+'?saved-defense#records');await choose('[data-record-id="'+id+'"]');
    await choose('[data-study-slot="1"]');await page.clock.runFor(150);
    assert.match(await defense.locator('select option:checked').textContent(),/P2 Pip · Missed landing/);
    await choose(go);await page.clock.runFor(120);
    assert.match(await panel.locator('select option:checked').textContent(),/P2 Pip/);
    await choose('[data-do=clip-back]');await page.clock.runFor(100);await choose('#film-back');
    assert.equal(await page.locator('#dialog').getAttribute('data-view'),'record-card');
    await choose('[data-saved-clip=full]');await choose('#film-knockouts summary');
    const pipStocks='[data-stock-at][data-stock-slot="1"]';
    assert.equal(await page.locator(pipStocks).count(),3);
    await choose(pipStocks+' >> nth=0');
    assert.equal(await page.locator('#dialog-title').textContent(),'Retry P2’s stock 1');
    await choose('#stock-together');
    assert.match(await page.locator('#match-mode').textContent(),/P2 Pip · Play together/);
    if(device==='keyboard'){
      await page.evaluate(()=>{
        const step=DogFight.Battle.prototype.step;
        window.playedBothSeats=false;
        DogFight.Battle.prototype.step=function(dt,a,b){
          if(a?.x<0 && b?.x>0)window.playedBothSeats=true;
          return step.apply(this,arguments);
        };
      });
      await page.keyboard.down('a');await page.keyboard.down('ArrowRight');await page.clock.runFor(1250);
      await page.keyboard.up('a');await page.keyboard.up('ArrowRight');
      assert(await page.evaluate(()=>window.playedBothSeats),'both original seats receive independent input');
    }else await page.clock.runFor(1100);
    await choose('#pause');await choose('[data-do=trial-replay]');await choose('#stock-try');
    await page.clock.runFor(12000);
    assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!',device+' saved P2’s stock against the original P1');
    await choose('[data-do=trial-results]');await page.locator('[data-saved-clip=full]:focus').waitFor();
    if(device==='keyboard'){
      await page.goto(root+'?roll#records/study/stock');await page.waitForLoadState('networkidle');await page.clock.runFor(900);
      await page.locator('#stock-try').waitFor();
      assert.match(await page.locator('#dialog').innerText(),/Haymaker/);
      await choose('#stock-try');await page.keyboard.down('d');await page.keyboard.down('l');
      await page.clock.runFor(1030);await page.keyboard.up('d');await page.keyboard.up('l');
      await page.clock.runFor(21000);
      assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!');
      await choose('[data-do=trial-results]');await page.clock.runFor(900);await page.locator('#film-defense [data-study]').waitFor();
      assert.equal(await seek.inputValue(),'1196','return to the knockout after saving the sample stock');
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function measureSeeking(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    await page.goto(root+'#solo/last-stock');await page.waitForFunction(()=>!!window.MatchReview);
    await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate',{rate:4});
    const result=await page.evaluate(()=>{
      const {Battle,FinishTape,idleInput,seededRandom}=DogFight;
      const w=new Battle({mode:'local',stage:'nightmail',p1:'clover',p2:'pip',minutes:7,timeBattle:true},undefined,seededRandom(81));
      const tape=new FinishTape(true);
      for(let i=0;i<25200;i++){
        const first={...idleInput,x:Math.floor(i/170)%2?1:-1,attack:i%66===0,jump:i%99===0};
        tape.record(w,first,idleInput);w.step(1/60,first,idleInput);
      }
      tape.captureKnockouts(w);
      const film=new MatchReview.MatchFilm(tape.fullMatch()),times=[];
      for(let i=1;i<=24;i++){
        const start=performance.now();film.playback((i*4291)%film.length);times.push(performance.now()-start);
      }
      times.sort((a,b)=>a-b);
      const last=film.playback(film.length).battle;
      return {frames:film.length,checkpoints:film.data.parts.filter(p=>p.state).length,seekP95Ms:+times[22].toFixed(1),
        accurate:last.matchFrames===w.matchFrames && last.dogs.every((f,i)=>f.stocks===w.dogs[i].stocks && f.x===w.dogs[i].x)};
    });
    assert.equal(result.accurate,true);assert.equal(result.frames,25200);assert.equal(result.checkpoints,70);
    console.log('::notice title=Full replay seek::Hosted Chrome, 390x844, 4x CPU throttle: '+JSON.stringify(result));
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','controller'])await match(browser,device);await measureSeeking(browser);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
