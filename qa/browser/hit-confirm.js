const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Run browser input on hosted Linux.');
const {chromium}=require('playwright-core');
async function play(browser,device){
  const touch=device==='touch';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},isMobile:touch,hasTouch:touch});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  async function act(action){
    if(touch)return press('[data-touch='+action+']');
    if(device==='keyboard')return page.keyboard.press(action==='attack'?'j':'u');
    const id=action==='attack'?2:3;
    await page.evaluate(i=>{confirmPad.buttons[i]={pressed:true,value:1};},id);
    await page.clock.runFor(70);
    await page.evaluate(i=>{confirmPad.buttons[i]={pressed:false,value:0};},id);
  }
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    if(device==='pad')await page.addInitScript(()=>{
      window.confirmPad={index:0,id:'Practice pad',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[confirmPad]});
    });
    await page.goto('http://127.0.0.1:8080/#training/hit-confirm');
    await page.getByText('Center your direction and tap Attack.',{exact:true}).waitFor();
    assert(await page.locator('#combo-reply').isHidden());
    if(device==='keyboard'){
      await press('#practice-menu');await page.locator('#practice-query').fill('hit confirm');await press('[data-exercise=combo-confirm]');
    }
    const latest=page.locator('#combo-latest');
    for(let i=0;i<6;i++){
      await act('attack');await page.clock.runFor(device==='pad'?475:545);
      const cue=await latest.textContent();
      assert.match(cue,/^(Hit!|Shield!)/);
      await page.evaluate(()=>{window.openingRow=document.querySelector('#combo-list li');});
      await act(cue.startsWith('Shield')?'grab':'attack');
      await page.clock.runFor(500);
      assert.match(await latest.textContent(),/Caught the shield|followed the hit/);
      assert.equal(await page.evaluate(()=>openingRow===document.querySelector('#combo-list li')),true);
    }
    assert.match(await page.locator('#combo-summary').textContent(),/Set complete · 6\/6 correct/);
    assert.equal(await page.locator('#combo-previous').textContent(),'Hits confirmed 3/3 · Shields grabbed 3/3');
    await act('attack');await page.clock.runFor(500);
    assert.match(await page.locator('#combo-summary').textContent(),/Exchange 1 of 6/);
    await page.goto('http://127.0.0.1:8080/?compare#training/compare-defenses');
    await page.locator('#combo-compare:visible').waitFor();
    await press('#combo-compare');await page.clock.runFor(900);
    const rows=page.locator('#reply-rows tr');
    assert.equal(await rows.count(),5);
    assert.deepEqual(await rows.first().locator('td').allTextContents(),['Standing','2','20%','—']);
    assert.deepEqual(await rows.nth(3).locator('td').allTextContents(),['Jump away','1','7%','Jump after hit 1']);
    assert.match(await page.locator('#reply-opening').textContent(),/17-frame opening before Bell Ringer/);
    assert(await page.locator('.reply-table').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
    await press('[data-reply=jumpAway]');await page.clock.runFor(4400);
    assert.match(await page.locator('#combo-summary').textContent(),/1 hit · 7%/);
    await press('#combo-compare');
    if(device==='pad'){
      await page.evaluate(()=>{confirmPad.buttons[0].pressed=true;});await page.clock.runFor(48);
      await page.evaluate(()=>{confirmPad.buttons[0].pressed=false;});await page.clock.runFor(48);
    }else await press('#reply-play');
    assert.match(await latest.textContent(),/You are Pip/);
    await act('attack');await page.clock.runFor(600);
    let client;
    if(touch){
      client=await page.context().newCDPSession(page);
      const b=await page.locator('[data-touch=shield]').boundingBox();
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
    }else if(device==='pad')await page.evaluate(()=>{confirmPad.buttons[4].pressed=true;});
    else await page.keyboard.down('l');
    await page.clock.runFor(5000);
    if(touch)await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else if(device==='pad')await page.evaluate(()=>{confirmPad.buttons[4].pressed=false;});
    else await page.keyboard.up('l');
    assert.match(await page.locator('#combo-summary').textContent(),/Defend · Late jab · Took 0 hits · 0%/);
    assert.match(await latest.textContent(),/blocked.*Tap Attack to retry/);
    await act('attack');await page.clock.runFor(2100);
    assert.match(await latest.textContent(),/Body Check.*7%|Bell Ringer.*13%/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','pad'])await play(browser,device);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
