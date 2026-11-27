const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Run browser input on hosted Linux.');
const {chromium}=require('playwright-core');
async function play(browser,device){
  const touch=device==='touch',pad=device==='controller';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    if(pad)await page.addInitScript(()=>{
      const g={index:0,id:'Hosted pad',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[g]});
      window.setEventPad=(key,on)=>{
        if(key==='right')g.axes[0]=on?1:0;
        else if(key==='up')g.axes[1]=on?-1:0;
        else if(key==='down')g.axes[1]=on?1:0;
        else Object.assign(g.buttons[{ok:0,jump:0,pause:9,shield:4,attack:2,special:1,grab:3}[key]],{pressed:on,value:Number(on)});
      };
    });
    const choose=async selector=>{
      const el=page.locator(selector);await el.waitFor();
      if(touch)return el.tap();
      if(!pad)return el.press('Enter');
      await el.focus();
      for(const on of [true,false]){
        await page.evaluate(([key,on])=>setEventPad(key,on),[selector==='#pause'?'pause':'ok',on]);await page.clock.runFor(48);
      }
    };
    const cdp=touch && await page.context().newCDPSession(page),fingers=new Map();
    const keys={shield:'l',attack:'j',down:'s',right:'d',special:'k',up:'w',grab:'u',jump:'Space'};
    async function hold(key,on){
      if(pad)return page.evaluate(([key,on])=>setEventPad(key,on),[key,on]);
      if(!touch)return on?page.keyboard.down(keys[key]):page.keyboard.up(keys[key]);
      if(on){
        const b=await page.locator('[data-touch='+key+']').boundingBox();assert(b);
        fingers.set(key,{id:Object.keys(keys).indexOf(key)+1,x:b.x+b.width/2,y:b.y+b.height/2});
      }else fingers.delete(key);
      await cdp.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',touchPoints:[...fingers.values()]});
    }
    await page.goto('http://127.0.0.1:8080/#solo');await choose('#event-matches');
    const board=page.locator('#dialog[data-view=event-board]');await board.waitFor();
    assert.equal(await board.locator('[data-event-pick]').count(),5);
    const layout=await board.evaluate(d=>({width:d.clientWidth,scroll:d.scrollWidth,
      wide:[...d.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>d.getBoundingClientRect().right).map(e=>e.id || e.textContent.slice(0,30))}));
    assert(layout.scroll<=layout.width+1,device+' board fits '+JSON.stringify(layout));
    assert(await page.locator('#event-preview').evaluate(c=>c.width>0 && c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v>0)));
    const observe=()=>page.evaluate(()=>{
      const step=SoloEvents.Run.prototype.step;
      SoloEvents.Run.prototype.step=function(...args){step.apply(this,args);window.run=this;};
    });
    await observe();
    async function start(selector='#event-play'){
      await page.evaluate(()=>window.run=null);await choose(selector);await page.clock.runFor(2100);
      if(touch){
        const hud=await page.evaluate(()=>{
          const pause=document.querySelector('#pause'),p=pause.getBoundingClientRect();
          const goal=document.querySelector('#match-set').getBoundingClientRect();
          return {pauseReachable:pause.contains(document.elementFromPoint(p.x+p.width/2,p.y+p.height/2)),
            goalFits:goal.width>0 && goal.x>=0 && goal.right<=innerWidth && goal.top>=p.bottom};
        });
        assert.deepEqual(hud,{pauseReachable:true,goalFits:true});
      }
    }
    async function to(frame){
      for(let i=0;i<170 && await page.evaluate(()=>window.run?.matchFrames || 0)<frame;i++)await page.clock.runFor(16);
      assert(await page.evaluate(n=>window.run?.matchFrames>=n,frame),device+' reached '+frame);
    }
    async function result(clear){
      const panel=page.locator('#dialog[data-view=event-result]');
      for(let i=0;i<35 && !await panel.isVisible();i++)await page.clock.runFor(100);
      const state=await page.evaluate(()=>({view:document.getElementById('dialog').dataset.view,frame:window.run?.matchFrames,
        event:window.run?.eventId,end:window.run?.end,feedback:window.run?.feedback,call:document.getElementById('countdown').textContent}));
      assert(await panel.isVisible(),device+' result '+JSON.stringify(state)+' '+errors.join(', '));
      assert.equal(await page.locator('#dialog-title').textContent(),clear?'Event cleared':'Try again',device+' '+JSON.stringify(state));
    }
    await start();await result(false);
    assert.match(await page.locator('#dialog-body').textContent(),/missed the landing/);
    await start('#event-retry');await to(5);await hold('shield',true);await to(12);await hold('shield',false);
    await to(34);await hold('attack',true);await to(37);await hold('attack',false);await result(true);
    await choose('#event-next');assert.equal(await page.locator('[aria-pressed=true][data-event-pick]').getAttribute('data-event-pick'),'high-ground');
    await start();await to(24);await hold('down',true);await to(26);await hold('down',false);await page.clock.runFor(5900);
    await result(true);assert.match(await page.locator('#dialog-body').textContent(),/3.0 \/ 3.0 s/);
    await choose('#event-next');await start();await hold('right',true);await to(19);await hold('special',true);
    await to(22);await hold('special',false);await page.clock.runFor(1900);await hold('right',false);await result(true);
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith(FightRecords.prefix)).length),0);
    await choose('#event-normal');await page.clock.runFor(2800);
    assert.match(await page.locator('#match-mode').textContent(),/Solo.*Time Battle/);
    await page.goto('http://127.0.0.1:8080/?reload#solo/events/high-ground');
    await board.waitFor();assert.equal(await board.locator('[data-event-pick] small').evaluateAll(nodes=>nodes.filter(n=>n.textContent.includes('✓')).length),3);
    await observe();await choose('[data-event-pick=low-road]');await start();
    await to(6);await hold('up',true);await hold('special',true);await to(9);await hold('special',false);await hold('up',false);
    for(let i=0;i<16 && !await page.evaluate(()=>!!run.risingLedge(run.dogs[0]));i++)await page.clock.runFor(16);
    assert(await page.evaluate(()=>!!run.risingLedge(run.dogs[0])));
    await hold('grab',true);await page.clock.runFor(75);await hold('grab',false);
    assert(await page.evaluate(()=>run.caught));await hold('right',true);await page.clock.runFor(2100);await hold('right',false);await result(true);
    await choose('#event-board');await choose('[data-event-pick=high-ground]');
    await choose('#event-play');await page.clock.runFor(2600);await choose('#pause');
    assert.match(await page.locator('#dialog-title').textContent(),/High Ground paused/);
    await choose('#event-board');await choose('#event-back');assert(await page.locator('#event-matches').evaluate(b=>document.activeElement===b));
    await page.goto('http://127.0.0.1:8080/?school#tutorial');await choose('#school-list');await choose('#school-read');
    await page.locator('#event-bindings').waitFor();await observe();await start();await to(1);
    for(let round=0;round<6;round++){
      let action=null,cue;
      for(let i=0;i<60 && !cue;i++){
        await page.clock.runFor(48);
        cue=await page.evaluate(()=>{
          const g=run.dogs[1];
          if(g.smashCharge)return 'punch';
          if(g.x>660 && g.face===-1)return 'grab';
          return null;
        });
      }
      assert(cue,device+' saw approach '+round);
      if(round!==2)action=cue==='punch'?'shield':'jump';
      else if(cue==='grab')action='shield';
      if(action)await hold(action,true);
      for(let i=0;i<65 && !await page.evaluate(()=>!!run.reads.call);i++)await page.clock.runFor(48);
      if(action)await hold(action,false);
      assert.equal(await page.evaluate(()=>run.reads.call.ok),round!==2,device+' answered '+cue);
      for(let i=0;i<40 && await page.evaluate(n=>run.reads.index===n,round);i++)await page.clock.runFor(48);
    }
    await result(true);assert.match(await page.locator('#dialog-body').textContent(),/3 \/ 4 reads/);
    assert.equal(await page.locator('#dialog-body ol li').count(),4);
    const seed=await page.evaluate(()=>run.reads.seed);await start('#event-misses');await to(1);
    assert.deepEqual(await page.evaluate(()=>[run.reads.seed,run.reads.guided]),[seed,1]);
    await choose('#pause');await choose('#event-normal');await page.clock.runFor(2600);
    assert.match(await page.locator('#match-mode').textContent(),/Solo.*Rival/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','controller'])await play(browser,device);}
  finally{await browser.close();}
})().catch(e=>{console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
