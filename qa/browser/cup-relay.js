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
    await page.goto(root+'#arcade/brisket');
    const cards=page.locator('#cup-select[data-view=roster]');
    await cards.waitFor();await observe();
    const posters=await cards.locator('.cup-poster canvas:first-child').elementHandles();
    const pip=cards.locator('[data-cup-dog=pip]');
    async function padPress(index){
      await page.evaluate(i=>button(i,true),index);await page.clock.runFor(48);
      await page.evaluate(i=>button(i,false),index);await page.clock.runFor(48);
    }
    if(touch)await pip.tap();
    else if(pad)await padPress(14);
    else await page.keyboard.press('ArrowLeft');
    assert.equal(await pip.getAttribute('aria-pressed'),'true');
    assert.match(await cards.locator('.cup-ticket p').textContent(),/Noodle/);
    assert.equal(await cards.locator('[data-do=cup-start]').textContent(),'Start Pip’s run');
    assert(await Promise.all(posters.map(c=>c.evaluate(node=>node.isConnected))).then(states=>states.every(Boolean)));
    assert.equal(await pip.locator('canvas + canvas').evaluate(c=>getComputedStyle(c).animationName),'cup-idle');
    const moving=await cards.locator('.cup-poster').evaluateAll(dogs=>dogs.map(dog=>{
      const [a,b]=dog.querySelectorAll('canvas');
      const base=a.getContext('2d').getImageData(0,0,a.width,a.height).data;
      const alt=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
      return [base.some((value,i)=>value!==alt[i]),getComputedStyle(b).animationName!=='none'];
    }));
    assert.deepEqual(moving,[[true,true],[true,false],[true,false],[true,false]]);
    assert.equal(await stored(),null);
    if(touch){await pip.tap();assert(await cards.isVisible());await choose(action('cup-start'));}
    else if(pad)await padPress(0);
    else await page.keyboard.press('Enter');
    await page.clock.runFor(3500);
    assert.deepEqual(await page.evaluate(()=>liveCup.dogs.map(dog=>dog.kind)),['pip','noodle']);
    await rings(1,1);
    await choose('#pause');
    assert.deepEqual(await page.locator('#dialog-body button:visible, #dialog-body summary:visible').allTextContents(),
      ['Resume','Cup schedule','More options']);
    const score=()=>page.evaluate(()=>[liveCup.matchFrames,liveCup.random.state,liveCup.matchCard.losses.length,
      ...liveCup.dogs.map(d=>[d.x,d.y,d.stocks,d.damage])]);
    const paused=await score(),beforePeek=await stored();
    await page.evaluate(()=>{window.pausedCup=liveCup;});
    await choose(action('cup-sheet'));
    const schedule=page.locator('.cup-route-board');
    assert.match(await schedule.locator('[aria-current]').innerText(),/Noodle[\s\S]*Fighting now/);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'cup-resume');
    await page.clock.runFor(2000);assert.deepEqual(await score(),paused);
    if(pad)await padPress(1);
    else if(touch)await choose('#dialog-close');
    else await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'cup-sheet');
    await choose(action('cup-sheet'));await choose(action('cup-resume'));await page.clock.runFor(250);
    assert(await page.evaluate(()=>liveCup===pausedCup));
    assert((await score())[0]>paused[0]);assert.equal(await stored(),beforePeek);
    assert.equal(await page.evaluate(()=>liveCup.dogs[1].stocks),2);
    await rings(1,2);
    assert.deepEqual(await page.locator('.cup-result button:visible').allTextContents(),['Play round 2','More options']);
    await choose('#cup-more');await choose(action('cup-sheet'));
    await schedule.waitFor();
    assert.equal(await schedule.locator('li').count(),4);
    assert.match(await schedule.locator('[aria-current]').innerText(),/Clover[\s\S]*Up next/);
    await choose(action('cup-return'));await page.locator('.cup-result').waitFor();
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'cup-sheet');
    assert(await page.locator('#cup-review [data-do=match-card]').isVisible());
    await choose(action('cup-sheet'));
    assert.doesNotMatch(await schedule.innerText(),/relay|detour|stamp|exhibition/i);
    assert.equal(await page.locator('#cup-bonus, [data-do=cup-relay], [data-do=cup-exhibition]').count(),0);
    const saved=JSON.parse(await stored());
    saved.active={...saved.active,started:true,relayLead:'brisket',coat:2};
    await page.evaluate(value=>localStorage.setItem('dog-fight-3.cup.pip',value),JSON.stringify(saved));
    await page.goto(root+'?legacy#arcade/pip/relay/2');
    const roster=page.locator('#cup-select[data-view=roster]');
    await roster.waitFor();await observe();
    assert.equal(await roster.locator('[aria-pressed=true]').getAttribute('data-cup-dog'),'pip');
    assert.equal(await roster.locator(action('cup-start')).textContent(),'Continue to round 2');
    await choose(action('cup-start'));await page.clock.runFor(3500);
    assert.deepEqual(await page.evaluate(()=>[liveCup.dogs[0].kind,liveCup.coatFor(0),liveCup.dogs[1].kind,
      liveCup.dogs.map(dog=>dog.stocks),!!liveCup.relayTeams]),['pip',2,'clover',[3,3],false]);
    assert.equal(JSON.parse(await stored()).active.retries,saved.active.retries);
    await rings(1,3);
    assert.deepEqual(await page.locator('.cup-result button:visible').allTextContents(),['Play round 3','More options']);
    await choose('#cup-more');
    assert.doesNotMatch(await page.locator('.cup-result').innerText(),/relay|detour|stamp|exhibition/i);
    await choose(action('cup-sheet'));await schedule.waitFor();
    const after=JSON.parse(await stored());
    assert.equal(after.active.id,saved.active.id);
    assert.equal(after.active.wins.length,2);
    assert.deepEqual(after.active.wins[0],saved.active.wins[0]);
    assert.equal(after.active.wins[1].relayLead,undefined);
    assert.doesNotMatch(await schedule.innerText(),/relay|detour|stamp|exhibition/i);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','controller']){
    try{await play(browser,device);}catch(e){throw Error(device+' Cup singles progression: '+e.stack);}
  }}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
