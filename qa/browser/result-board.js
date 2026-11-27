const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux runner.');
const {chromium}=require('playwright-core');

async function check(browser){
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2030-01-01Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto('http://127.0.0.1:8080/#local');
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){
        if(this.mode==='local')window.lastLocal=this;
        return step.apply(this,args);
      };
    });
    const start=async()=>{await page.locator('#start').click();await page.clock.runFor(3000);};
    const leave=async(key,slot,remaining)=>{
      await page.keyboard.down(key);
      try{
        for(let i=0;i<120 && await page.evaluate(i=>lastLocal.dogs[i].stocks,slot)>remaining;i++)
          await page.clock.runFor(250);
      }finally{await page.keyboard.up(key);}
      assert.equal(await page.evaluate(i=>lastLocal.dogs[i].stocks,slot),remaining);
    };
    await start();await leave('ArrowRight',1,2);await leave('a',0,0);await page.clock.runFor(1500);
    assert.deepEqual(await page.locator('.final-score').allTextContents(),['2','0']);
    assert.deepEqual(await page.locator('[data-latest-fall]').evaluateAll(xs=>xs.map(x=>x.dataset.latestFall)),['1','0']);
    for(const [name,width,height] of [['wide',2560,1080],['desktop',1280,720],['landscape',844,390],['phone',390,844]]){
      await page.setViewportSize({width,height});
      const dims=await page.locator('#dialog').evaluate(el=>[el.clientWidth,el.scrollWidth,el.clientHeight,innerWidth,innerHeight]);
      assert(dims[1]<=dims[0]+1 && dims[0]>=dims[3]-20 && dims[2]===dims[4],name+' fills the viewport');
      const rematch=await page.locator('[data-do=rematch]').boundingBox();
      assert(rematch.y>=0 && rematch.y+rematch.height<=height,name+' rematch within reach');
      await page.screenshot({path:'scoreboard-'+name+'.png'});
    }
    for(const slot of [1,0]){
      const row=page.locator('[data-latest-fall="'+slot+'"]');
      await row.click();assert.equal(await page.locator('#dialog-title').textContent(),'KO replay');
      await page.locator('#clip-seek').press('End');
      const scores=await page.locator('#clip-scores').textContent();
      assert.match(scores,slot?/Brisket .*2 stocks/:/Pip .*0 stocks/);
      await page.locator('[data-do=clip-back]').click();
      assert(await row.evaluate(el=>el===document.activeElement));
    }
    await page.locator('#result-review > summary').click();
    assert(await page.locator('[data-do=practice-finish]').isVisible());
    await page.keyboard.press('Escape');
    assert(await page.locator('#result-review:not([open]) > summary').evaluate(el=>el===document.activeElement));
    await page.locator('[data-do=rematch]').click();await page.clock.runFor(3100);
    assert.deepEqual(await page.evaluate(()=>lastLocal.dogs.map(f=>f.stocks)),[3,3]);
    await leave('a',0,0);await page.clock.runFor(1500);
    assert(await page.locator('#result-review:not([open])').isVisible());
    await page.locator('[data-do=lobby]').click();assert(await page.locator('#lobby #start').isVisible());
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await check(browser);}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
