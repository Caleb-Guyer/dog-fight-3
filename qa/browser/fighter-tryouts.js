const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
const url='http://127.0.0.1:8080/#local/tryouts/clover';
async function play(browser,device){
  const touch=device==='touch',pad=device==='pad';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},isMobile:touch,hasTouch:touch});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(pad=>{
      if(!localStorage.getItem('dog-fight-3.config'))localStorage.setItem('dog-fight-3.config',JSON.stringify({
        mode:'local',p1:'brisket',p2:'pip',stage:'canal',stageForm:'trio',lives:5,minutes:3,fetch:false,
        coatBook:[{brisket:1},{clover:2}]}));
      if(pad){
        const p={index:0,id:'Bench controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
        Object.defineProperty(navigator,'getGamepads',{value:()=>[p]});
        window.steer=x=>{p.axes[0]=x;};
        window.confirm=on=>Object.assign(p.buttons[0],{pressed:on,value:Number(on)});
      }
    },pad);
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    const press=s=>touch?page.locator(s).tap():page.locator(s).click();
    if(!touch && !pad)await page.route('**/fighter-lessons.js*',r=>r.abort(),{times:1});
    await page.goto(url);
    if(!touch && !pad)await press('#dispatch-load-retry');
    await page.getByRole('button',{name:'Pick Clover for Player 1'}).waitFor();
    await press('[data-try-back]');
    assert.match(await page.locator('#rules-label').textContent(),/5 stocks · 3 min/);
    await press('.slot[data-index="1"]');await press('#lobby-tryout');
    await press('[data-try-dog=clover]');await press('[data-try-run="-1"]');
    await page.clock.runFor(500);
    assert.equal(await page.locator('#school-title').textContent(),'Rooftop shuttle');
    const cdp=touch && await page.context().newCDPSession(page);
    async function side(name,ms){
      if(pad)await page.evaluate(x=>steer(x),name==='right'?1:-1);
      else if(touch){
        const r=await page.locator('[data-touch='+name+']').boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});
      }else await page.keyboard.down(name==='right'?'d':'a');
      await page.clock.runFor(ms);
      if(pad)await page.evaluate(()=>steer(0));
      else if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      else await page.keyboard.up(name==='right'?'d':'a');
    }
    await side('right',850);assert.match(await page.locator('#school-task').textContent(),/Turn back/);
    await side('left',1600);assert.match(await page.locator('#school-task').textContent(),/round trip/);
    await press('#school-next');
    assert.match(await page.locator('[data-try-dog=clover]').textContent(),/[0-9]\.[0-9]{2} s/);
    await press('[data-try-dog=noodle]');await press('[data-try-run="-1"]');
    assert.match(await page.locator('#school-count').textContent(),/Pace Clover/);
    await press('#school-example');await page.clock.runFor(5500);
    assert.equal(await page.locator('#school-coach').getAttribute('data-state'),'example-ended');
    assert.equal(await page.evaluate(()=>localStorage.getItem('dog-fight-3.shuttle.v1.noodle')),null);
    await press('#school-list');await press('[data-try-run="0"]');
    assert.equal(await page.locator('#school-title').textContent(),'Pull into a jab');
    await press('#pause');await press('[data-try-run="1"]');
    assert.equal(await page.locator('#school-title').textContent(),'Hook the rooftop');
    await press('#school-list');await press('[data-try-dog=clover]');
    const keep=page.getByRole('button',{name:'Pick Clover for Player 2'});
    if(pad){await keep.focus();await page.evaluate(()=>confirm(true));await page.clock.runFor(48);await page.evaluate(()=>confirm(false));await page.clock.runFor(48);}
    else if(touch)await keep.tap();else{await keep.focus();await page.keyboard.press('Enter');}
    assert.equal(await page.locator('#roster [aria-pressed=true]').getAttribute('data-kind'),'clover');
    const settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.config')));
    assert.deepEqual([settings.mode,settings.p1,settings.p2,settings.stage,settings.stageForm,settings.lives,settings.minutes,settings.fetch,settings.coatBook[1].clover],
      ['local','brisket','clover','canal','trio',5,3,false,2]);
    await press('#start');await page.clock.runFor(3000);
    assert.equal(await page.locator('#hud .lives[aria-label="5 stocks"]').count(),2);
    assert.match(await page.locator('#match-stage').textContent(),/Canal/);
    await page.reload();await page.locator('[data-try-dog=clover] small').waitFor();
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','pad'])await play(browser,device);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
