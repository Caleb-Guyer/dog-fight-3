const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser playtests.');
const {chromium}=require('playwright-core');
async function run(browser,phone){
  const page=await browser.newPage({viewport:phone?{width:390,height:844}:{width:1280,height:720},
    hasTouch:phone,isMobile:phone,reducedMotion:phone?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:04Z'));
    await page.goto('http://127.0.0.1:8080/#solo/throw-read/perch');
    await page.waitForFunction(()=>!!window.StockCall,null,{polling:50});
    await page.evaluate(()=>{
      window.calls=[];window.ramps=[];
      const draw=StockCall.draw,dog=DogArt.draw,print=CanvasRenderingContext2D.prototype.fillText,ramp=AudioParam.prototype.exponentialRampToValueAtTime;
      let sample;
      AudioParam.prototype.exponentialRampToValueAtTime=function(v,t){if(v===1460 || v===1760)ramps.push(v);return ramp.call(this,v,t);};
      StockCall.draw=function(ctx,w,age,...rest){
        if(age>=72)return draw.call(this,ctx,w,age,...rest);
        sample={canvas:ctx.canvas.id,age,steady:rest.at(-1),labels:[],dogs:[]};calls.push(sample);
        try{return draw.call(this,ctx,w,age,...rest);}finally{sample=null;}
      };
      CanvasRenderingContext2D.prototype.fillText=function(txt,x,y,...rest){
        if(sample){
          const p=new DOMPoint(x,y).matrixTransform(this.getTransform());
          if(p.x<0 || p.x>this.canvas.width || p.y<0 || p.y>this.canvas.height)throw Error('Offscreen score '+txt);
          sample.labels.push(txt);
        }
        return print.call(this,txt,x,y,...rest);
      };
      window.DogArt={...DogArt,draw(ctx,kind,x,y,opts){
        if(sample)sample.dogs.push([kind,opts.pose,opts.coat]);
        return dog.call(this,ctx,kind,x,y,opts);
      }};
    });
    await page.keyboard.press('Shift'); // Unlock audio without steering the launch.
    for(let i=0;i<60 && !await page.evaluate(()=>calls.some(c=>c.canvas==='game' && c.age>=7));i++)await page.clock.runFor(90);
    const call=await page.evaluate(()=>calls.filter(c=>c.canvas==='game').at(-1));
    await page.screenshot({path:'stock-calls-'+(phone?'phone':'desktop')+'.png'});
    assert(call);assert.equal(call.steady,phone);
    assert.deepEqual(call.labels,['STOCKS','2','P1','3','CPU']);
    assert.deepEqual(call.dogs,phone?[]:[['pip','tumble',0]]);
    assert.match(await page.locator('#announce').textContent(),/Pip out at the top blast line.*P1 2, P2 3/);
    assert.deepEqual(await page.evaluate(()=>[...new Set(ramps)]),[1460,1760]);
    await page.clock.runFor(1400);
    await page.locator('#pause').click();await page.locator('[data-do=ko-replays]').click();await page.locator('[data-ko="0"]').click();
    await page.locator('#clip-seek').press('End');
    const replay=await page.evaluate(()=>calls.filter(c=>c.canvas==='clip-arena').at(-1));
    assert.deepEqual(replay.labels,call.labels);assert.equal(replay.age,0);
    // A local prediction can move a dog beyond the line before the other peer's steering arrives.
    const gates=await page.evaluate(()=>{
      const make=()=>new DogFight.Battle({mode:'local',stage:'picnic',p1:'pip',p2:'brisket'},undefined,DogFight.seededRandom(4));
      const predicted=make(),confirmed=make(),view=new DogFightView.FightView(),canvas=document.createElement('canvas');
      canvas.id='rollback-test';canvas.width=640;canvas.height=360;
      const count=()=>calls.filter(c=>c.canvas===canvas.id).length;
      predicted.dogs[0].x=-400;predicted.step(1/60);
      view.draw(canvas,predicted,1/60,0,confirmed);const speculative=count();
      confirmed.dogs[1].x=1800;confirmed.step(1/60);view.draw(canvas,predicted,1/60,0,confirmed);
      return [speculative,count(),calls.at(-1).labels];
    });
    assert.deepEqual(gates,[0,1,['STOCKS','3','P1','2','P2']]);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await run(b,false);await run(b,true);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
