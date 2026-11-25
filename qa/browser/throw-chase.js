const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Run browser input on hosted Linux.');
const {chromium}=require('playwright-core');
async function play(browser,touch){
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=sel=>touch?page.locator(sel).tap():page.locator(sel).click();
  const attack=()=>touch?press('[data-touch=attack]'):page.keyboard.press('j');
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    if(!touch)await page.route('**/combo-lab.js*',r=>r.abort(),{times:1});
    await page.goto('http://127.0.0.1:8080/#training/throw-chase');
    if(!touch)await press('#dispatch-load-retry');
    const latest=page.locator('#combo-latest');
    await page.getByText('Tap Attack to start the up throw.',{exact:true}).waitFor();
    assert.equal(await page.locator('#combo-reply').inputValue(),'diMix');
    assert.equal(await page.locator('#dummy-damage').inputValue(),'60');
    for(const reply of ['diIn','diOut']){
      await page.selectOption('#combo-reply',reply);
      await attack();await page.clock.runFor(4500);
      assert.match(await latest.textContent(),new RegExp('landed.*steered '+(reply==='diIn'?'in':'out')));
      await press('#combo-history summary');
      assert.match(await page.locator('#combo-list').textContent(),/Bench Press/);
      await press('#combo-history summary');
    }
    await attack();await page.clock.runFor(100);
    assert.doesNotMatch(await latest.textContent(),/landed/);
    await press('#practice-menu');await page.locator('#practice-query').fill('chase the up throw');
    await press('[data-exercise="combo-throwChase"]');assert.match(await latest.textContent(),/Tap Attack to start/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(browser,false);await play(browser,true);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
