const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const path=require('node:path');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux playtest runner.');
const {chromium}=require('playwright-core'),root='http://127.0.0.1:8080/';
async function play(browser,mobile){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=s=>mobile?page.locator(s).tap():page.locator(s).click();
  const lock=i=>'[data-seat="'+i+'"] [data-action=lock]';
  const snapshot=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('dog-fight-3.tournament.1')));
  async function start(){
    await press('#tourney-play');
    for(let n=0;n<2;n++)for(const i of [0,1])await press(lock(i));
    await press('#couch-start');
  }
  async function fall(until){
    await page.keyboard.down('a');
    try{for(let i=0;i<17 && !await page.locator(until).isVisible();i++)await page.clock.runFor(1000);}
    finally{await page.keyboard.up('a');}
    assert(await page.locator(until).isVisible(),until);
  }
  async function winSet(){
    const before=(await snapshot()).results;
    await fall('[data-do=set-pick]');assert.deepEqual((await snapshot()).results,before);
    await press('[data-do=set-pick]');await press(lock(1));await press(lock(0));await press(lock(0));
    await fall('#rotation-handoff');
  }
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    if(!mobile)await page.addInitScript(()=>{
      window.bracketPad={id:'Shared pad',index:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[bracketPad]});
    });
    await page.goto(root+'#local/rules/stock/1/0/single/flat/off');await press('#rules-use');
    if(!mobile)await page.route('**/tournament.js*',r=>r.abort(),{times:1});
    await press('#tournament');if(!mobile)await press('#dispatch-load-retry');
    for(let i=4;i<8;i++)await press('#tourney-add');
    assert(await page.locator('#tourney-add').isDisabled());
    assert.equal(await page.locator('#tourney-grid section').count(),3);
    const count=mobile?2:3;
    while(await page.locator('#tourney-roster input').count()>count)await page.locator('#tourney-roster li:last-child button').click();
    for(const [i,name] of ['Maple','Ash <3','Clover Club'].slice(0,count).entries())await page.locator('#tourney-roster input').nth(i).fill(name);
    if(!mobile)await press('#tourney-format');
    if(mobile)await press('#tourney-play');
    else{
      await page.locator('#tourney-play').focus();
      await page.evaluate(()=>{bracketPad.buttons[0]={pressed:true,value:1};});await page.clock.runFor(100);
      await page.evaluate(()=>{bracketPad.buttons[0]={pressed:false,value:0};});await page.clock.runFor(100);
    }
    assert.equal(await page.locator('#tourney-roster').count(),0);
    assert.match(await page.locator('#tourney-rules').textContent(),/1 stock · No clock/);
    await press('#tourney-play');await press('#couch-back');assert(await page.locator('#tourney-grid').isVisible());
    await start();
    if(!mobile){
      assert.match(await page.locator('#match-mode').textContent(),/Semifinal 2 · P1 Ash <3 \/ P2 Clover Club/);
      await winSet();
      assert.match(await page.locator('#rotation-handoff').textContent(),/Clover Club advances/);
      await press('[data-do=match-card]');await press('[data-do=card-back]');
      assert.deepEqual((await snapshot()).results,[[0,2]]);
      await page.goto(root+'?resume#local/tournament');
      assert.match(await page.locator('#tourney-call').textContent(),/Final · Maple vs. Clover Club/);
      await start();await winSet();
    }else await fall('#rotation-handoff');
    await press('[data-do=rotation]');
    const champion=mobile?'Ash <3':'Clover Club';
    assert.equal(await page.locator('#tourney-call strong').textContent(),champion+' wins the tournament!');
    assert.equal(await page.locator('#tourney-grid [aria-current]').count(),0);
    assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    if(mobile)assert(await page.locator('.bracket-match').evaluate(el=>el.offsetWidth>=el.parentElement.clientWidth-2));
    assert.equal(await page.locator('#tourney-status').textContent(),'Results saved in this tab.');
    await page.locator('#dialog').screenshot({path:path.join(process.env.RUNNER_TEMP,'bracket-'+(mobile?'phone':'desktop')+'.png')});
    const completed=await snapshot();await page.goto(root+'?champion#local/tournament');
    await page.locator('#tourney-end').waitFor();
    assert.deepEqual(await snapshot(),completed);
    await press('#tourney-end');assert.equal(await page.locator('#tourney-roster input').count(),4);
    await press('#tourney-back');await press('#winner-stays');
    assert.match(await page.locator('#rotation-play').textContent(),/Bout 1/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(browser,false);await play(browser,true);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
