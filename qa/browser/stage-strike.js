const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core'),root='http://127.0.0.1:8080/';
async function play(browser,solo){
  const page=await browser.newPage({viewport:solo?{width:390,height:844}:{width:1280,height:720},hasTouch:solo,isMobile:solo});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(solo=>{
    localStorage.setItem('dog-fight-3.config',JSON.stringify({stageForm:solo?'flat':'original',fetch:false,lives:1,minutes:3}));
    localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{attack:'KeyQ'},{}]}));
    window.pads=[0,1].map(index=>({index,id:'Pad '+index,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));
    Object.defineProperty(navigator,'getGamepads',{value:()=>window.pads});
  },solo);
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  const press=s=>solo?page.locator(s).tap():page.locator(s).click();
  const tally=()=>page.locator('[data-out=true]').count();
  const turn=async()=>Number((await page.locator('#strike-turn').textContent()).match(/^P([12])/)[1])-1;
  const tapPad=async(slot,n)=>{
    for(const state of [true,false]){
      await page.evaluate(([i,b,v])=>{pads[i].buttons[b].pressed=v;pads[i].buttons[b].value=Number(v);},[slot,n,state]);
      await page.clock.runFor(45);
    }
  };
  const face=async slot=>{if(slot===0)await page.keyboard.press('q');else await tapPad(1,0);};
  const start=async(game)=>{
    assert.equal(await page.locator('#strike-confirm').textContent(),'Start game '+game);
    const arena=await page.locator('[data-strike-stage][aria-pressed=true] strong').textContent();
    await press('#strike-confirm');
    assert.equal(await page.locator('#match-stage').textContent(),solo?arena+' · Flat':arena);
    assert.match(await page.locator('#match-set').textContent(),new RegExp('Game '+game));
  };
  const lose=async slot=>{
    const key=slot?'ArrowRight':'a';await page.keyboard.down(key);
    for(let n=0;n<40 && !await page.locator('#set-score').isVisible();n++)await page.clock.runFor(650);
    await page.keyboard.up(key);assert(await page.locator('#set-score').isVisible());
  };
  try{
    if(solo){
      await page.goto(root+'#solo');assert.equal(await page.evaluate(()=>!!window.StageStrike),false);
      assert.equal(await page.locator('link[href*="versus-select.css"]').count(),0);
      await page.route('**/versus-select.css*',route=>route.abort(),{times:1});
      await press('#rules-label');await press('[data-do=strike-set]');
      await press('#dispatch-load-retry');
      await page.locator('#strike-turn').waitFor();
      assert.equal(await page.locator('#strike-compare').count(),0);
      assert.equal(await page.locator('#strike-stages').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3);
      assert(await page.locator('#dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      for(let step=0;step<8 && await page.locator('#strike-confirm').getAttribute('data-play')!=='true';step++){
        if(await page.locator('#strike-confirm').isDisabled())await page.clock.runFor(710);
        else{
          await page.locator('[data-strike-stage]:enabled').last().tap();
          await press('#strike-confirm');
        }
      }
      assert.equal(await tally(),4);await start(1);await lose(0);
      await press('[data-do=strike-next]');await page.clock.runFor(1600);
      assert.equal(await tally(),2);assert.equal(await turn(),0);
      assert.match(await page.locator('#strike-exits').textContent(),/P1 stock losses/);
      assert.equal(await page.locator('#strike-difference').textContent(),'Same fighting layout as last game.');
      assert(await page.locator('#dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      await page.locator('[data-strike-stage]:enabled').first().tap();await press('#strike-confirm');
      await start(2);
    }else{
      await page.goto(root+'#local/stage-strike');
      await page.locator('#couch-phase').waitFor();
      await face(0);await face(1);await page.locator('#strike-confirm').waitFor();
      for(let n=0;n<4;n++){
        const seat=await turn();await face(1-seat);assert.equal(await tally(),n);
        if(seat===0)await page.keyboard.press('d');else await tapPad(1,15);
        await face(seat);assert.equal(await tally(),n+1);
      }
      await start(1);await lose(1);assert.match(await page.locator('#set-score').textContent(),/1 – 0/);
      await press('[data-do=strike-next]');await tapPad(1,15);
      assert.equal(await page.locator('[data-seat="1"] [data-name]').textContent(),'Noodle');
      await face(1);await face(0);assert.equal(await turn(),0);
      assert.match(await page.locator('#strike-exits').textContent(),/P2 stock losses/);
      await press('[data-strike-stage=canal]');
      assert.equal(await page.locator('#strike-candidate').textContent(),'Selected · Canal Lock');
      const preview=page.locator('#strike-compare canvas').last();
      const pixels=()=>preview.evaluate(c=>c.toDataURL());
      const first=await pixels();await page.clock.runFor(650);assert.notEqual(await pixels(),first);
      await page.emulateMedia({reducedMotion:'reduce'});
      const frozen=await pixels();await page.clock.runFor(650);assert.equal(await pixels(),frozen);
      await press('[data-strike-stage=nightmail]');
      assert.equal(await page.locator('#strike-candidate').textContent(),'Selected · Night Mail');
      assert.equal(await tally(),0);
      await face(0);await press('#strike-back');await press('[data-do=strike-next]');
      assert.equal(await tally(),1);assert.equal(await turn(),0);
      await face(0);assert.equal(await turn(),1);
      await face(0);assert.equal(await page.locator('#strike-confirm').getAttribute('data-play'),'false');
      await tapPad(1,15);await face(1);await start(2);
      await lose(0);assert.match(await page.locator('#set-score').textContent(),/1 – 1/);
      await press('[data-do=strike-next]');await face(0);await face(1);
      assert.equal(await turn(),1);await face(1);await face(1);assert.equal(await turn(),0);
      await face(0);await start(3);await lose(1);
      assert.match(await page.locator('#set-score').textContent(),/2 – 1/);
      assert.equal(await page.locator('.set-history li').count(),3);
      await press('#result-review summary');await press('#strike-history summary');
      assert.match(await page.locator('#strike-history p').nth(1).textContent(),/P1 banned.*P1 banned.*P2 picked/);
      await press('[data-do=new-set]');assert.equal(await tally(),0);
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(b,false);await play(b,true);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
