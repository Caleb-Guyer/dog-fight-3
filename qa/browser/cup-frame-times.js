const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {attachPad,pipInput}=require('./cup-full-run.js');
const {chromium}=require('playwright-core');

function observeFrames(){
  let frame;
  window.cupMeter={samples:[],ticks:0,hits:0,firstMove:0,confirm:0,record:()=>frame};
  const meter=window.cupMeter;
  addEventListener('keydown',e=>{if(e.code==='Enter' && !meter.confirm)meter.confirm=performance.now();},true);
  const raf=requestAnimationFrame.bind(window);
  window.requestAnimationFrame=callback=>raf(stamp=>{
    frame={stamp,draw:0,sim:0,reads:0,painted:false};
    const start=performance.now();
    callback(stamp);
    if(frame.painted && meter.ticks && meter.samples.length<240){
      frame.work=performance.now()-start;
      meter.samples.push(frame);
    }
    frame=null;
  });
}
function measureFight(){
  const meter=window.cupMeter,game=document.querySelector('#game');
  for(const key of ['clientWidth','clientHeight']){
    const read=Object.getOwnPropertyDescriptor(Element.prototype,key).get;
    Object.defineProperty(game,key,{get(){
      const f=meter.record();
      if(f)f.reads++;
      return read.call(this);
    }});
  }
  const view=DogFightView.FightView.prototype,draw=view.draw;
  view.draw=function(canvas,...args){
    const frame=meter.record(),start=performance.now();
    const result=draw.call(this,canvas,...args);
    if(canvas===game && frame){frame.painted=true;frame.draw+=performance.now()-start;}
    return result;
  };
  const battle=DogFight.Battle.prototype,step=battle.step;
  battle.step=function(dt,a,b){
    const x=this.dogs[0].x,frame=meter.record(),start=performance.now();
    const result=step.call(this,dt,a,b);
    if(frame)frame.sim+=performance.now()-start;
    meter.ticks++;meter.hits=this.matchCard.players.reduce((n,p)=>n+p.hits,0);
    if(!meter.firstMove && a.x && this.dogs[0].x!==x)meter.firstMove=performance.now();
    return result;
  };
}
const percentile=(values,q)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1];
async function trial(browser,port,resize){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const cdp=await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.addInitScript(observeFrames);
    await page.goto('http://127.0.0.1:'+port+'/#arcade/pip');
    await page.locator('#cup-select [data-cup-dog=pip][aria-pressed=true]').waitFor();
    await page.evaluate('('+attachPad.toString()+')('+pipInput.toString()+')');
    await page.evaluate(measureFight);
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>cupMeter.samples.length===240,null,{polling:100});
    const {samples,ticks,hits,firstMove,confirm,opponent,stage}=await page.evaluate(()=>({
      ...cupFight(),samples:cupMeter.samples,hits:cupMeter.hits,firstMove:cupMeter.firstMove,confirm:cupMeter.confirm
    }));
    assert.equal(stage,'picnic');assert.equal(opponent,'noodle');
    assert(firstMove>confirm && confirm>0 && ticks>=200 && hits>0,'the Cup must respond to input and land hits');
    if(resize){
      await page.locator('#pause').tap();
      const paused=await page.evaluate(()=>cupFight().ticks);
      for(const viewport of [{width:844,height:390},{width:1920,height:720},{width:390,height:844}]){
        await page.setViewportSize(viewport);
        await page.waitForFunction(()=>{
          const c=document.querySelector('#game'),r=c.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height);
          const scale=Math.min(Math.max(675/h,720/w),2880/Math.max(w,h));
          return w>0 && h>0 && c.width===Math.round(w*scale) && c.height===Math.round(h*scale);
        },null,{polling:50});
        assert.equal(await page.evaluate(()=>cupFight().ticks),paused);
      }
    }
    assert.deepEqual(errors,[]);
    return {reads:samples.reduce((n,s)=>n+s.reads,0),firstMove,fromConfirm:firstMove-confirm,
      draw:percentile(samples.map(s=>s.draw),.95),sim:percentile(samples.map(s=>s.sim),.95),
      callback:percentile(samples.map(s=>s.work),.95),interval:percentile(samples.slice(1).map((s,i)=>s.stamp-samples[i].stamp),.95)};
  }finally{await context.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{
    const runs={baseline:[],candidate:[]};
    for(let sample=0;sample<3;sample++)for(const key of sample===1?['candidate','baseline']:['baseline','candidate']){
      runs[key].push(await trial(browser,key==='baseline'?8081:8080,key==='candidate' && sample===2));
    }
    const median={};
    for(const [build,rows] of Object.entries(runs))median[build]=Object.fromEntries(Object.keys(rows[0]).map(key=>
      [key,Number(percentile(rows.map(r=>r[key]),.5).toFixed(1))]));
    assert(runs.baseline.every(r=>r.reads>=480));
    assert(runs.candidate.every(r=>r.reads<=3));
    const summary='Pip vs Noodle on Picnic Table. Hosted Chromium, 390×844, 4× CPU throttle. '+
      'Median of three fresh contexts per build in alternating order, 240 presented fight frames per trial.';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n\n```json\n'+JSON.stringify({median,runs},null,2)+'\n```\n');
    console.log('::notice title=Cup frame times::'+JSON.stringify(median));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
