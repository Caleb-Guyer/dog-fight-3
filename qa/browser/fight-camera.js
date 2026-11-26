const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser playtests.');
const {chromium}=require('playwright-core');
const route='http://127.0.0.1:8080/#solo/runoff-trump';
async function observe(page){
  await page.waitForFunction(()=>!!window.FightCamera,null,{polling:50});
  await page.evaluate(()=>{
    const frame=FightCamera.frame;
    FightCamera.frame=function(v,width,height,dt,w,...rest){
      frame.call(this,v,width,height,dt,w,...rest);if(w.mode!=='solo')return;
      const canvas=document.querySelector('#game'),scale=canvas.clientWidth/width;
      window.shot={fixed:v.fixed,zoom:v.zoom,dogHeight:w.dogs[0].stats.height*v.zoom*scale,
        tick:w.matchFrames,dogs:w.dogs.map(f=>[f.x,f.y]),
        visible:w.dogs.every(f=>Math.abs(f.x-v.cx)+f.stats.width<width/(2*v.zoom) &&
          f.y-f.stats.height-32>v.cy-height/(2*v.zoom) && f.y<v.cy+height/(2*v.zoom))};
    };
  });
}
async function play(browser,width,height,reduced=false){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const mode=page.locator('[data-do=camera-mode]'),pause=page.locator('#pause'),resume=page.locator('[data-do=resume]');
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:04Z'));
    await page.goto(route);await observe(page);await page.clock.runFor(2950);
    const follow=await page.evaluate(()=>window.shot);assert(follow.visible);
    const controls=await page.locator('.touch-actions button').evaluateAll(buttons=>buttons.map(b=>{
      const r=document.createRange();r.selectNodeContents(b);
      const text=r.getBoundingClientRect(),rect=b.getBoundingClientRect();
      return {label:b.textContent,readable:text.left>=rect.left+2 && text.right<=rect.right-2 &&
        rect.left>=0 && rect.right<=innerWidth && rect.bottom<=innerHeight && rect.height>=37};
    }));
    assert.equal(controls.length,7);assert(controls.every(c=>c.readable),JSON.stringify(controls));
    if(width===390 && !reduced)await page.screenshot({path:'fight-camera-follow.png'});
    await pause.tap();
    if(reduced){
      assert(follow.fixed);assert(await mode.isDisabled());assert.match(await mode.textContent(),/reduced motion/);
    }else{
      assert.equal(follow.fixed,false);assert.equal(await mode.getAttribute('aria-pressed'),'false');
      await mode.tap();assert.equal(await mode.getAttribute('aria-pressed'),'true');await resume.tap();
      const wide=await page.evaluate(()=>window.shot);
      assert(wide.fixed && wide.visible);assert.deepEqual(wide.dogs,follow.dogs);
      assert(follow.dogHeight>wide.dogHeight*2,JSON.stringify({follow,wide}));
      if(width===390)await page.screenshot({path:'fight-camera-wide.png'});
      console.log(width+'px viewport, Pip: '+follow.dogHeight.toFixed(1)+'px follow, '+wide.dogHeight.toFixed(1)+'px wide.');
      await page.reload();await observe(page);await page.clock.runFor(100);
      assert((await page.evaluate(()=>window.shot)).fixed);await pause.tap();
      await mode.tap();assert.equal(await mode.getAttribute('aria-pressed'),'false');
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(browser,390,844);await play(browser,320,680);await play(browser,390,844,true);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
