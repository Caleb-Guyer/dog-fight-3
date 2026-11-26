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
    await move(false);await choose('[data-do=watch-match]');
    const seek=page.locator('#clip-seek');
    assert(Number(await seek.getAttribute('max'))>360);
    assert.equal(await seek.inputValue(),'0');
    assert.equal(await page.locator('#film-play').textContent(),'Play');
    await choose('#film-play');await page.clock.runFor(1200);await choose('#film-play');
    const frame=Number(await seek.inputValue());assert(frame>=60 && frame<100);
    await choose('#film-step');assert.equal(Number(await seek.inputValue()),frame+1);
    await choose('#film-speed');assert.match(await page.locator('#film-speed').textContent(),/2×/);
    await choose('#film-marks summary');assert.equal(await page.locator('#film-marks button').count(),3);
    await choose('#film-marks button:last-child');assert(Number(await seek.inputValue())>360);
    await seek.press('Home');assert.equal(await seek.inputValue(),'0');
    await choose('#film-p1');await page.clock.runFor(850);await move(true,true);
    await page.clock.runFor(4300);await move(false,true);
    await page.locator('[data-do=trial-replay]').waitFor();
    const cells=await page.locator('.finish-comparison tbody tr').first().locator('td').allTextContents();
    assert.notEqual(cells[0],cells[1],'taking over the quiet opening changes the stock');
    await choose('[data-do=trial-replay]');assert.equal(await seek.inputValue(),'0');
    await choose('#film-back');assert.equal(await page.locator('#dialog').getAttribute('data-view'),'result');
    await page.goto(root+'?saved#records');await choose('[data-record-id]');
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
