const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Run input checks on hosted Linux.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';

async function play(browser,profile,viewport){
  const touch=profile!=='desktop';
  const page=await browser.newPage({viewport,isMobile:touch,hasTouch:touch,reducedMotion:touch?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2030-01-01Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
    const choose=id=>press('[data-choice="'+id+'"]');
    const ready=i=>press('[data-seat="'+i+'"] [data-action=lock]');
    await page.goto(root+'#local');await press('#pick-together');
    await page.locator('#couch-grid [data-choice=clover]').waitFor();
    assert.deepEqual(await page.locator('#couch-grid strong').allTextContents(),['Pip','Brisket','Noodle','Clover']);
    await choose('noodle');await press('[data-target="1"]');await choose('noodle');
    assert.deepEqual(await page.locator('[data-choice=noodle] [data-chip]').allTextContents(),['P1','P2']);
    await press('[data-seat="1"] [data-action=coat]');await ready(0);
    assert(await page.locator('[data-target="0"]').isDisabled());
    await choose('clover');
    assert.deepEqual(await page.locator('.couch-choice strong').allTextContents(),['Noodle','Clover']);
    assert.equal(await page.locator('[data-choice=noodle] [data-chip]').textContent(),'P1 ✓');
    const fits=()=>page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.clientWidth>=innerWidth-20 && el.clientHeight===innerHeight);
    assert(await fits(),profile+' fighter roster fills the viewport');
    await page.screenshot({path:'shared-roster-'+profile+'.png'});
    await choose('noodle');await ready(1);
    assert.equal(await page.locator('#couch-grid[data-phase=stages] button').count(),5);
    assert.equal(await page.locator('[data-target="0"]').getAttribute('aria-pressed'),'true');
    await choose('nightmail');await ready(0);await choose('canal');await ready(1);
    assert.match(await page.locator('#couch-call').textContent(),/Split vote/);
    await ready(1);await choose('nightmail');await ready(1);
    assert.match(await page.locator('#couch-call').textContent(),/Both chose Night Mail/);
    assert(await fits(),profile+' arena vote fits');
    await page.screenshot({path:'shared-vote-'+profile+'.png'});
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){window.liveMatch=this;return step.apply(this,args);};
    });
    if(touch)await press('#couch-start');else await page.keyboard.press('j');
    await page.clock.runFor(3200);
    assert.deepEqual(await page.evaluate(()=>[liveMatch.stage,liveMatch.dogs.map(d=>d.kind),[liveMatch.coatFor(0),liveMatch.coatFor(1)]]),
      ['nightmail',['noodle','noodle'],[0,2]]);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{
    for(const [profile,width,height] of [['desktop',1440,900],['phone',390,844],['landscape',844,390]])
      await play(browser,profile,{width,height});
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
