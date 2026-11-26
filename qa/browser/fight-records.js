const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function run(browser,mobile) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
  const entries=()=>page.evaluate(()=>new FightRecords.Book(localStorage).list());
  const timelineFacts=()=>page.locator('.card-timeline :is(time,strong,span)').allTextContents();
  try {
    await page.goto(root+'#records');
    assert(await page.locator('[data-do=record-solo]').isVisible());
    await press('[data-do=record-solo]');assert(await page.locator('#lobby').isVisible());
    await page.goto(root+'?stock#solo/last-stock');
    if(mobile){
      const cdp=await page.context().newCDPSession(page), b=await page.locator('[data-touch=left]').boundingBox();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]});
      await page.clock.runFor(5500);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{
      await page.keyboard.down('a');await page.clock.runFor(5500);await page.keyboard.up('a');
    }
    await press('[data-do=match-card]');
    const first=await entries();
    assert.equal(first.length,1);assert.equal(first[0].entry.mode,'solo');
    assert.equal(first[0].entry.card.losses[0].slot,0);
    const timeline=await timelineFacts();assert.equal(await page.locator('[data-card-ko]').count(),1);
    assert.match(await page.locator('.record-tip').innerText(),/Pip.*bottom blast line/s);
    await press('[data-record-drill="0"]');assert.equal(await page.locator('#match-mode').textContent(),'Training');
    assert.match(await page.locator('#recovery-tip').textContent(),/Special|ledge/);
    if(!mobile){await page.keyboard.down('w');await page.keyboard.press('k');await page.keyboard.up('w');await page.clock.runFor(600);}
    await press('#pause');await press('[data-do=return-fight]');
    assert.deepEqual(await timelineFacts(),timeline);
    await press('[data-do=card-back]');await press('[data-do=watch-finish]');await press('[data-do=clip-back]');
    assert.deepEqual(await entries(),first);
    await press('[data-do=home]');await press('#home-records');
    await press('[data-record-id]');assert.deepEqual(await timelineFacts(),timeline);
    assert.equal(await page.locator('[data-card-ko]').count(),0);
    await press('[data-record-drill="0"]');await press('#return-fight');
    assert.equal(await page.locator('#dialog').getAttribute('data-view'),'record-card');
    await press('[data-do=card-back]');assert.equal(await page.locator('#dialog').getAttribute('data-view'),'records');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.recordId),first[0].id);
    assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await page.goto(root+'?reload#records');
    await press('[data-record-id]');assert.deepEqual(await timelineFacts(),timeline);
    await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'home-records');
    const guarded=await page.evaluate(()=>{
      const book=new FightRecords.Book(localStorage),entry=book.list()[0].entry;
      entry.mode='local';entry.time++;entry.card.players[0].blocks=6;
      entry.card.players[1].hits=1;entry.card.players[1].knockdowns=entry.card.players[1].shieldBreaks=0;
      return book.add(entry);
    });
    await press('#home-records');await press('[data-record-id="'+guarded+'"]');
    assert.equal(await page.locator('[data-record-drill="1"]').textContent(),'Practice hit confirms');
    await press('[data-record-drill="1"]');await page.locator('#combo-confirm[aria-pressed=true]').waitFor();
    assert.match(await page.locator('#hud .hud-name').first().textContent(),/Brisket/);
    await press('#return-fight');
    assert.equal(await page.locator('#dialog').getAttribute('data-view'),'record-card');
    assert.match(await page.locator('.record-tip').last().textContent(),/blocked 6 hits/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await run(browser,false);await run(browser,true);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
