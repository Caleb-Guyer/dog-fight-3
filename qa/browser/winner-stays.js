const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux playtest runner.');
const {chromium}=require('playwright-core'),root='http://127.0.0.1:8080/';
const lock=i=>'[data-seat="'+i+'"] [data-action=lock]',name=i=>'[data-rotation-slot="'+i+'"] input';
async function clock(page){
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
}
async function vote(press){
  for(let n=0;n<2;n++)for(const i of [0,1])await press(lock(i));
  await press('#couch-start');
}
async function couch(browser){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await clock(page);
  await page.addInitScript(()=>{
    const pad={index:2,id:'Shared seat',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[null,null,pad]});
  });
  const press=s=>page.locator(s).click(), label=s=>page.locator(s).textContent();
  const walkOff=async(selector)=>{
    await page.keyboard.down('a');
    for(let i=0;i<23 && !await page.locator(selector).isVisible();i++)await page.clock.runFor(1900);
    await page.keyboard.up('a');assert(await page.locator(selector).isVisible(),selector);
  };
  const storage=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('dog-fight-3.winner-stays.1')));
  try{
    await page.goto(root+'#local/pick-together');assert.equal(await page.evaluate(()=>!!window.WinnerStays),false);
    await vote(press);await walkOff('[data-do=match-card]');await press('#result-review summary');await press('[data-do=rotation]');
    assert.match(await label('#rotation-play'),/Bout 2/);
    assert.deepEqual(await page.locator('.rotation-line input').evaluateAll(xs=>xs.map(x=>x.value)),['Player 3','Player 2','Player 1']);
    await page.locator(name(0)).fill('Scout');await page.locator(name(1)).fill('Rex <K9>');await page.locator(name(2)).fill('Moss');
    await press('#rotation-format');assert.match(await label('#rotation-format'),/Best of three/);
    await press('#rotation-play');
    assert.equal(await label('[data-seat="1"] header b'),'P2 · Rex <K9>');
    assert.match(await label('[data-seat="1"] [data-device]'),/Pad 3/);
    await vote(press);assert.match(await label('#match-mode'),/Bout 2 · P1 Scout \/ P2 Rex <K9>/);
    await walkOff('[data-do=set-pick]');
    assert.equal((await storage()).bout,2);
    await press('[data-do=set-pick]');await press(lock(1));await press('[data-seat="0"] [data-action=next]');
    await press(lock(0));await press(lock(0));
    assert.match(await label('#match-set'),/Game 2 · 0–1/);
    await walkOff('#rotation-handoff');assert.match(await label('#rotation-handoff'),/Rex <K9> keeps P2 · 2 win streak. Pass P1 to Moss/);
    const complete=await storage();assert.equal(complete.bout,3);assert.equal(complete.players[0].name,'Moss');
    assert.equal(complete.players[2].kind,'clover');
    await press('[data-do=watch-finish]');await press('[data-do=clip-back]');
    await press('[data-do=match-card]');await press('[data-do=card-back]');assert.deepEqual(await storage(),complete);
    await press('[data-do=rotation]');await press('#rotation-play');await press('#couch-back');
    assert.match(await label('#rotation-play'),/Bout 3/);
    await page.goto(root+'?resume#local/winner-stays');
    assert.match(await label('#rotation-play'),/Bout 3/);assert.deepEqual(await storage(),complete);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function touch(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await clock(page);
  const press=s=>page.locator(s).tap();
  try{
    await page.goto(root+'#local/winner-stays');
    for(let i=3;i<8;i++)await press('#rotation-add');
    assert(await page.locator('#rotation-add').isDisabled());
    await press('[data-rotation-slot="4"] button');assert.equal(await page.locator('.rotation-line li').count(),7);
    await page.locator(name(0)).fill('Maple');await page.locator(name(1)).fill('Ash');await page.locator(name(2)).fill('Fern');
    assert(await page.locator('#dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await press('#rotation-end');await press('#rotation-keep');await press('#rotation-play');await vote(press);
    await page.keyboard.down('ArrowRight');
    for(let i=0;i<23 && !await page.locator('#rotation-handoff').isVisible();i++)await page.clock.runFor(1900);
    await page.keyboard.up('ArrowRight');
    assert.match(await page.locator('#rotation-handoff').textContent(),/Maple keeps P1 · 1 win streak. Pass P2 to Fern/);
    await press('[data-do=rotation]');await press('#rotation-end');await press('#rotation-clear');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('dog-fight-3.winner-stays.1')),null);
    assert(await page.locator('#winner-stays').isVisible());assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await couch(browser);await touch(browser);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
