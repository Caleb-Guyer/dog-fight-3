const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser playtests.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function play(browser,device){
  const phone=device==='touch',pad=device==='pad',reduced=device==='reduced';
  const page=await browser.newPage({viewport:phone?{width:390,height:844}:pad?{width:1920,height:720}:{width:1280,height:720},
    hasTouch:phone,isMobile:phone,reducedMotion:reduced?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    if(pad)await page.addInitScript(()=>{
      window.testPad={id:'QA controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],
        buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[testPad,null,null,null]});
    });
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:03Z'));
    if(phone){
      await page.goto(root+'#solo');await page.locator('[data-kind=noodle]').tap();
      await page.locator('[data-index="1"]').tap();await page.locator('[data-kind=clover]').tap();
      await page.locator('#start').tap();
    }else await page.goto(root+'#solo/night-mail');
    await page.waitForFunction(()=>!!window.FighterEntrances,null,{polling:50});
    await page.evaluate(()=>{
      const draw=FighterEntrances.draw,names=FighterEntrances.names,cue=FighterEntrances.cue,dog=DogArt.draw,step=DogFight.Battle.prototype.step;
      const print=CanvasRenderingContext2D.prototype.fillText;
      window.walks=[];window.plates=[];window.sounds=[];window.stepped=0;let current,onPlate=false;
      FighterEntrances.draw=function(ctx,f,w,remaining,steady){
        current={kind:f.kind,remaining,steady,frame:w.matchFrames,x:f.x,y:f.y};
        try{draw.call(this,ctx,f,w,remaining,steady);walks.push(current);}finally{current=null;}
      };
      window.DogArt={...DogArt,draw(ctx,kind,x,y,options){if(current)Object.assign(current,{dx:x,dy:y,pose:options.pose});return dog.call(this,ctx,kind,x,y,options);}};
      FighterEntrances.names=function(...args){onPlate=true;try{return names.apply(this,args);}finally{onPlate=false;}};
      CanvasRenderingContext2D.prototype.fillText=function(s,x,y,width){
        if(onPlate){const p=new DOMPoint(x,y).matrixTransform(this.getTransform()),half=width*this.getTransform().a*.5;
          assertPlate(p.x-half>=0 && p.x+half<=this.canvas.width && p.y>=0 && p.y<=this.canvas.height);plates.push(s);}
        return print.apply(this,arguments);
      };
      function assertPlate(inFrame){if(!inFrame)throw Error('A nameplate was cropped');}
      FighterEntrances.cue=function(kind,...args){sounds.push(kind);return cue.call(this,kind,...args);};
      DogFight.Battle.prototype.step=function(...args){
        if(this.mode==='solo'){window.fight=this;window.stepped++;if(!window.firstInput)window.firstInput=structuredClone(args[1]);}
        return step.apply(this,args);
      };
    });
    const pair=phone?['noodle','clover']:['pip','brisket'];
    const match=await page.locator('#announce').textContent();assert.match(match,new RegExp('P1 '+pair[0]+' versus CPU '+pair[1],'i'));
    await page.keyboard.press('Shift');await page.clock.runFor(640);
    assert.deepEqual(await page.evaluate(()=>[...new Set(plates)]),['P1  '+pair[0].toUpperCase(),'CPU  '+pair[1].toUpperCase()]);
    if(phone || device==='keyboard')await page.screenshot({path:'entrance-'+device+'.png'});
    const pause=page.locator('#pause'),resume=page.locator('[data-do=resume]');
    await pause.click();const left=await page.evaluate(()=>walks.at(-1).remaining);
    await page.clock.runFor(360);assert.equal(await page.evaluate(()=>walks.at(-1).remaining),left);await resume.click();
    await page.clock.runFor(1020);assert.equal(await page.evaluate(()=>stepped),0);
    // Tap and release Attack during the count, but hold Right through GO.
    if(phone){
      await page.locator('[data-touch=attack]').tap();
      const cdp=await page.context().newCDPSession(page),r=await page.locator('[data-touch=right]').boundingBox();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});
    }else if(pad){
      await page.evaluate(()=>{testPad.buttons[2].pressed=true;});await page.clock.runFor(32);
      await page.evaluate(()=>{testPad.buttons[2].pressed=false;testPad.axes[0]=1;});
    }else{await page.keyboard.press('j');await page.keyboard.down('d');}
    await page.clock.runFor(980);
    const state=await page.evaluate(()=>({input:firstInput,frames:fight.matchFrames,stepped,sounds,
      motion:walks.some(w=>w.dx || w.dy),introStepped:walks.some(w=>w.frame!==0),closing:walks.at(-1).remaining}));
    assert(state.frames>=8 && state.frames<23,JSON.stringify(state));
    assert(state.input.x>.7 && !state.input.attack && !state.input.tapped?.attack);assert(!state.introStepped);
    assert.equal(state.motion,!reduced);assert.deepEqual(state.sounds,pair);assert(state.closing<.05);
    const count=await page.evaluate(()=>walks.length);await page.clock.runFor(140);assert.equal(await page.evaluate(()=>walks.length),count);
    await page.goto(root+'?position#solo/throw-read/perch');await page.clock.runFor(150);
    assert.equal(await page.evaluate(()=>!!window.FighterEntrances),false);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function timedOpening(browser,animated){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    // Same build and stage. Missing entrance art exercises the standard in-game fallback.
    await page.route('**/fighter-entrances.js*',r=>animated?r.continue():r.abort());
    await page.goto(root+'#solo');
    await page.locator('[data-kind=noodle]').tap();
    await page.locator('[data-index="1"]').tap();await page.locator('[data-kind=clover]').tap();
    await page.evaluate(()=>{
      const draw=DogFightView.FightView.prototype.draw;window.costs=[];window.finished=false;
      DogFightView.FightView.prototype.draw=function(canvas,...args){
        const active=!!this.entrance && canvas.id==='game',start=performance.now();
        const result=draw.call(this,canvas,...args);
        if(active)costs.push([start,performance.now()-start]);
        else if(costs.length)window.finished=true;
        return result;
      };
    });
    await page.locator('#start').tap();await page.waitForFunction(()=>window.finished);
    return await page.evaluate(()=>{
      const p95=xs=>Number(xs.sort((a,b)=>a-b)[Math.floor(xs.length*.95)].toFixed(1));
      return {frames:costs.length,work:p95(costs.map(r=>r[1])),interval:p95(costs.slice(1).map((r,i)=>r[0]-costs[i][0]))};
    });
  }finally{await page.close();}
}
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{
    for(const device of ['keyboard','touch','pad','reduced'])await play(b,device);
    const groups=[[],[]];
    for(const mode of [0,1,1,0,0,1])groups[mode].push(await timedOpening(b,!!mode));
    const mid=(rows,field)=>rows.map(r=>r[field]).sort((a,b)=>a-b)[1];
    const [base,opening]=groups.map(rows=>Object.fromEntries(['frames','work','interval'].map(f=>[f,mid(rows,f)])));
    console.log('::notice title=Opening frame delivery::'+JSON.stringify({base,opening}));
    assert(opening.frames>=90 && opening.work<=Math.max(14,base.work+4) && opening.interval<=Math.max(26,base.interval+5));
  }finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
