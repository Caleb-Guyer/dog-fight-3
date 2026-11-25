const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux') throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function play(browser,mobile) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1250,height:760},
    isMobile:mobile,hasTouch:mobile,reducedMotion:mobile?'reduce':'no-preference'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
  try{
    await page.goto(root+'#solo/last-stock');
    // Walk off the roof using ordinary match input, then revisit the confirmed finish.
    await page.keyboard.down('a');
    await page.clock.runFor(5500);
    await page.keyboard.up('a');
    assert.match(await page.locator('#dialog-title').textContent(),/Match result/);
    const photo=page.locator('.victory-shot');
    assert.match(await photo.getAttribute('aria-label'),/Brisket/);
    const result=await page.locator('.winner h3').textContent();
    const poses=await page.evaluate(()=>{
      const canvas=document.createElement('canvas'); canvas.width=152;canvas.height=104;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const out={};
      for(const kind of Object.keys(DogFight.kits)){
        const frames=[];
        for(const t of [0,.17,.34,.51]){
          ctx.clearRect(0,0,152,104);
          DogArt.draw(ctx,kind,78,82,{pose:'win',time:t,scale:.8,coat:2});
          const data=ctx.getImageData(0,0,152,104).data;
          let pixels=0,touchesEdge=false;
          for(let i=3;i<data.length;i+=4)if(data[i]){
            pixels++;const p=(i-3)/4,x=p%152,y=Math.floor(p/152);
            if(!x || !y || x===151 || y===103)touchesEdge=true;
          }
          if(pixels<150 || touchesEdge) throw Error(kind+' clipped podium cel');
          frames.push(canvas.toDataURL());
        }
        out[kind]=new Set(frames).size;
      }
      return out;
    });
    assert.deepEqual(Object.values(poses),[4,4,4,4]);
    await press('[data-do=watch-finish]');
    if(!mobile)await press('#clip-toggle');
    assert.equal(await page.locator('#clip-toggle').textContent(),'Play');
    const frame=()=>page.locator('#clip-frame').textContent();
    const paused=await frame();await page.clock.runFor(400);assert.equal(await frame(),paused);
    await page.locator('#clip-seek').press('Home');await press('#clip-step');
    assert.match(await frame(),/^Frame 1 \/ /);
    await press('#clip-speed');assert.equal(await page.locator('#clip-speed').textContent(),'Speed · 1×');
    await press('#clip-toggle');await page.clock.runFor(5000);
    assert.equal(await page.locator('#clip-toggle').textContent(),'Watch again');
    assert(await page.locator('#clip-practice').isDisabled());
    assert.match(await page.locator('#clip-scores').textContent(),/Pip 125% · 0 stocks/);
    await page.locator('#clip-seek').press('Home');await press('#clip-practice');
    assert.match(await page.locator('#match-mode').textContent(),/Practice/);
    await page.keyboard.down('d');await page.clock.runFor(130);await page.keyboard.up('d');
    await press('#pause');await press('[data-do=return-fight]');
    assert.equal(await page.locator('.winner h3').textContent(),result);
    await press('[data-do=match-card]');
    assert.equal(await page.locator('.card-timeline li').count(),1);
    await press('[data-do=card-back]');await press('[data-do=watch-finish]');
    await page.locator('#clip-seek').press('End');
    assert.match(await page.locator('#clip-scores').textContent(),/Pip 125% · 0 stocks/);
    assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.winner h3').textContent(),result);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(b,false);await play(b,true);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
