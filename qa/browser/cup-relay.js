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
      const make=index=>({id:'Hosted pad '+index,index,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))});
      window.pads=[make(0),null,null,make(3)];
      Object.defineProperty(navigator,'getGamepads',{value:()=>pads});
      window.button=(i,on,slot=3)=>Object.assign(pads[slot].buttons[i],{value:Number(on),pressed:on});
      button(2,true,0); // A lower-index spare is active when the owner confirms fighter select.
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
      DogFight.Battle.prototype.step=function(...args){window.liveCup=this;window.cupInput=args[1];return step.apply(this,args);};
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
    assert.equal(await cards.locator('.cup-ticket strong').textContent(),'Round 1 of 4');
    assert.equal(await cards.locator('.cup-ticket p').textContent(),'Pip vs. Noodle');
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
    if(pad){
      await page.evaluate(()=>pads[3].axes[0]=.8);await page.clock.runFor(64);
      assert(await page.evaluate(()=>cupInput.x>.7 && !cupInput.attack));
      await page.evaluate(()=>pads[3].axes[0]=0);
    }
    await rings(1,1);
    await choose('#pause');
    assert.deepEqual(await page.locator('#dialog-body button:visible, #dialog-body summary:visible').allTextContents(),
      ['Resume','Cup schedule','More options']);
    const score=()=>page.evaluate(()=>[liveCup.matchFrames,liveCup.random.state,liveCup.matchCard.losses.length,
      ...liveCup.dogs.map(d=>[d.x,d.y,d.stocks,d.damage])]);
    const paused=await score(),beforePeek=await stored();
    await page.evaluate(()=>{window.pausedCup=liveCup;});
    if(pad){
      await page.evaluate(()=>button(0,true,0));await page.clock.runFor(96);
      assert(await page.locator('[data-do=resume]').isVisible());
    }
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
    if(pad){await page.evaluate(()=>button(0,true));await page.clock.runFor(64);}
    if(device==='keyboard'){await page.keyboard.down('Space');await page.keyboard.down('ArrowDown');}
    await rings(1,2);
    if(device==='keyboard'){
      await page.keyboard.down('ArrowDown');await page.keyboard.up('ArrowDown');
      await page.keyboard.down('Space');await page.keyboard.up('Space');
    }
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'cup-next');
    if(pad){await page.evaluate(()=>button(0,false));await page.clock.runFor(64);}
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
    if(pad){
      await choose(action('cup-return'));await page.locator('.cup-result').waitFor();
      await page.locator('[data-do=cup-next]').focus();
      await page.evaluate(()=>{button(0,true,0);pads[3]=null;});await page.clock.runFor(80);
      assert(await page.locator('.cup-result').isVisible());
      await page.evaluate(()=>{button(0,false,0);button(2,false,0);});await page.clock.runFor(64);
      await page.evaluate(()=>button(0,true,0));await page.clock.runFor(120);
      await page.evaluate(()=>{button(0,false,0);pads[0].axes[0]=.8;});await page.clock.runFor(3200);
      assert(await page.evaluate(()=>liveCup.dogs[1].kind==='brisket' && cupInput.x>.7));
      await page.evaluate(()=>{
        const hero=liveCup.dogs[0];
        liveCup.knockouts([hero]);liveCup.knockouts([hero]);
        liveCup.matchFrames=Math.max(120,liveCup.matchFrames);
        liveCup.matchCard.players[0].lastHit={id:'brisketHaymaker',frame:liveCup.matchFrames-91};
        hero.x=liveCup.stageWidth/2;hero.y=liveCup.blastBounds().bottom+1;hero.damage=47;
      });
      await rings(0,1);
      assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Retry round 3');
      assert.equal(await page.locator('.cup-result .winner p').innerText(),'Fell below the stage at 47%');
      await page.evaluate(()=>button(0,true,0));await page.clock.runFor(120);
      await page.evaluate(()=>button(0,false,0));await page.clock.runFor(3200);
      assert(await page.evaluate(()=>liveCup.end===null && liveCup.dogs[0].stocks===3 && cupInput.x>.7));
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','controller']){
    try{await play(browser,device);}catch(e){throw Error(device+' Cup singles progression: '+e.stack);}
  }}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
