const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Run browser input on hosted Linux.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';

async function play(browser,device){
  const touch=device==='touch',pad=device==='controller',errors=[];
  const page=await browser.newPage({hasTouch:touch,isMobile:touch,viewport:touch?{width:390,height:844}:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push(e.message));
  try{
    if(pad)await page.addInitScript(()=>{
      const g={id:'Hosted pad',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[g]});
      window.button=(i,on)=>Object.assign(g.buttons[i],{value:Number(on),pressed:on});
    });
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    async function choose(selector){
      const b=page.locator(selector);
      await b.waitFor();
      if(touch)return b.tap();
      await b.focus();
      if(!pad)return page.keyboard.press('Enter');
      const index=selector==='#pause'?9:0;
      await page.evaluate(i=>button(i,true),index);await page.clock.runFor(48);
      await page.evaluate(i=>button(i,false),index);await page.clock.runFor(48);
    }
    const action=id=>'[data-do="'+id+'"]';
    const stored=()=>page.evaluate(()=>localStorage.getItem('dog-fight-3.cup.pip'));
    const observe=()=>page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){window.liveCup=this;return step.apply(this,args);};
    });
    async function rings(slot,count){
      // Advance the scoreboard through the engine's stock transitions, then let the normal UI handle the result.
      await page.evaluate(([i,n])=>{for(let k=0;k<n;k++)liveCup.knockouts([liveCup.dogs[i]]);},[slot,count]);
      await page.clock.runFor(1500);
    }
    await page.goto(root+'#arcade/pip');
    await observe();
    await choose(action('cup-start'));await page.clock.runFor(3500);
    await rings(1,3);
    await choose(action('cup-relay'));
    const board=page.locator('#cup-relay-start');
    await board.waitFor();
    assert.equal(await page.locator('[data-cup-lead]').count(),3);
    assert.match(await page.locator('.cup-relay-arena figcaption').textContent(),/Bandstand/);
    assert(await page.locator('.cup-relay-arena canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(x=>x)));
    const before=await stored();
    await choose('[data-cup-lead=brisket]');assert.match(await page.locator('#cup-relay-order').textContent(),/Brisket → Pip → Noodle/);
    await choose('#cup-relay-back');assert.equal(await stored(),before);
    await choose(action('cup-relay'));await choose('[data-cup-lead=brisket]');await choose('#cup-relay-start');
    await page.clock.runFor(3500);
    assert.deepEqual(await page.evaluate(()=>[liveCup.dogs[0].kind,liveCup.dogs[1].kind,liveCup.cpuLevel,liveCup.form]),['brisket','clover','rival','counterweights']);
    assert.equal(JSON.parse(await stored()).active.relayLead,'brisket');
    await rings(0,1);
    assert.equal(await page.evaluate(()=>liveCup.dogs[0].kind),'pip');
    await choose('#pause');await choose(action('cup-sheet'));
    await page.reload();await observe();
    assert.match(await page.locator(action('cup-start')).textContent(),/Retry round 2/);
    assert.equal(await page.locator(action('cup-relay')).count(),0);
    const active=await stored();
    await page.goto(root+'?exhibit#arcade/pip/relay/3');await observe();
    await choose('#cup-relay-start');await page.clock.runFor(3500);
    await rings(1,3);
    assert.equal(await page.locator('#dialog-title').textContent(),'Relay exhibition won');
    assert.equal(await stored(),active);
    await choose(action('cup-sheet'));await choose(action('cup-start'));await page.clock.runFor(3500);
    assert.equal(await page.evaluate(()=>liveCup.dogs[0].kind),'brisket');
    await rings(1,3);assert.match(await page.locator('#dialog-body').textContent(),/Round 2 relay stamp earned/);
    const saved=JSON.parse(await stored());
    assert.equal(saved.active.wins[1].relayLead,'brisket');assert.equal(saved.active.retries,1);
    await choose(action('cup-sheet'));assert.match(await page.locator('.cup-route-board').textContent(),/Round 2 ✓/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','controller']){
    try{await play(browser,device);}catch(e){throw Error(device+' Cup relay: '+e.stack);}
  }}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
