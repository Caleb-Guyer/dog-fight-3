const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux runner for browser input.');
const {chromium}=require('playwright-core');

async function check(browser,device) {
  const touch=device==='touch', pad=device==='controller';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.addInitScript(pad=>{
      const random=crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues=a=>a instanceof Uint32Array && a.length===1?a.fill(42):random(a);
      if(pad){
        const g={id:'Hosted pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
        Object.defineProperty(navigator,'getGamepads',{value:()=>[g]});
        window.controls=(x,jump,y=0,shield=false)=>{g.axes[0]=x;g.axes[1]=y;
          Object.assign(g.buttons[0],{pressed:jump,value:Number(jump)});Object.assign(g.buttons[4],{pressed:shield,value:Number(shield)});};
        window.menuButton=on=>Object.assign(g.buttons[9],{pressed:on,value:Number(on)});
      }else if(!matchMedia('(pointer:coarse)').matches)
        localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{jump:'KeyQ'},{}]}));
    },pad);
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    const client=touch && await page.context().newCDPSession(page);
    let previous=[];
    async function hold(x,jump=false,up=false,shield=false,down=false){
      if(pad)return page.evaluate(args=>controls(...args),[x,jump,up?-1:down?1:0,shield]);
      const next=[...(x?[x<0?'left':'right']:[]),...(jump?['jump']:[]),...(up?['up']:down?['down']:[]),...(shield?['shield']:[])];
      if(touch){
        const points=[];
        for(const action of next){
          const b=await page.locator('[data-touch='+action+']').boundingBox();assert(b,action);
          points.push({id:{left:1,right:1,jump:2,up:3,down:3,shield:4}[action],x:b.x+b.width/2,y:b.y+b.height/2});
        }
        if(previous.some(a=>!next.includes(a)))await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        if(points.length)await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
      }else{
        const keys={left:'a',right:'d',jump:'q',up:'w',down:'s',shield:'l'};
        for(const a of previous)if(!next.includes(a))await page.keyboard.up(keys[a]);
        for(const a of next)if(!previous.includes(a))await page.keyboard.down(keys[a]);
      }
      previous=next;
    }
    const choose=async sel=>{
      const e=page.locator(sel).first();await e.waitFor();
      if(touch)return e.tap();
      if(!pad)return e.click();
      if(sel==='#pause'){await page.evaluate(()=>menuButton(true));await page.clock.runFor(32);
        await page.evaluate(()=>menuButton(false));await page.clock.runFor(32);return;}
      await e.focus();await page.evaluate(()=>controls(0,true));await page.clock.runFor(32);
      await page.evaluate(()=>controls(0,false));await page.clock.runFor(32);
    };
    async function route() {
      await page.locator('#recovery-back').waitFor();
      for(let i=0;i<15 && !await page.locator('#recovery-play').isVisible();i++)await page.clock.runFor(80);
      assert(await page.locator('#recovery-play').isVisible(),device+' '+await page.locator('#recovery-route').textContent());
    }
    const play=()=>choose('#recovery-play');
    const root='http://127.0.0.1:8080/';
    await page.goto(root);await choose('#welcome-play');await choose(pad?'#pause':'#school-list');
    await choose('#dialog-body button:text-is("Recovery clinic")');await route();
    assert.match(await page.locator('#recovery-position').textContent(),/Left.+0 air jumps/);
    await choose('#recovery-guide');await page.clock.runFor(1600);
    const clock=await page.locator('#match-clock').textContent();
    await hold(1,false,false,true);await page.clock.runFor(750);await hold(0);
    assert.equal(await page.locator('#match-clock').textContent(),clock,'wrong angle leaves the recorded frame playable');
    await hold(1,false,true,true);await page.clock.runFor(160);await hold(1);await page.clock.runFor(1800);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!',device+' low');
    await choose('[data-do=recovery-speed]');await page.clock.runFor(1200);
    await hold(1,false,false,true);await page.clock.runFor(140);await hold(1);await page.clock.runFor(2600);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Try the return again',device+' free attempt');
    await choose('[data-do=trial-replay]');await route();await choose('#recovery-swap');await route();
    assert.match(await page.locator('#recovery-position').textContent(),/Right.+0 air jumps/);
    await choose('#recovery-guide');await page.clock.runFor(1200);
    await hold(-1,false,false,true);await page.clock.runFor(140);await hold(-1);await page.clock.runFor(2200);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!',device+' wide');
    await choose('[data-do=trial-results]');await choose('#school-resume');
    assert.equal(await page.locator('#school-title').textContent(),'Take center stage');
    await page.goto('http://127.0.0.1:8080/#tutorial/first-match');
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){if(!window.career && this.mode==='solo')window.career=this;return step.apply(this,args);};
      window.fingerprint=()=>JSON.stringify([career.matchFrames,career.random.state,career.matchCard,career.dogs.map(f=>[f.x,f.y,f.stocks])]);
    });
    await hold(-1);await page.clock.runFor(2400);
    for(let i=0;i<16 && !await page.evaluate(()=>window.career?.matchCard.losses.some(l=>l.slot===0));i++)await page.clock.runFor(250);
    await hold(0);await choose('#pause');
    const frozen=await page.evaluate(()=>fingerprint());
    await choose('[data-do=coach-fall]');await route();
    let line=await page.locator('#recovery-route').textContent();
    assert.match(line,/air jump/);
    if(device==='keyboard')assert.match(line,/Q/);
    await choose('#recovery-demo');await page.clock.runFor(7200);
    assert.match(await page.locator('#recovery-cue').textContent(),/Landed onstage/);
    await choose('#recovery-fall');await page.clock.runFor(8200);
    assert.match(await page.locator('#recovery-cue').textContent(),/stock lost/);
    await play();await page.clock.runFor(1600);
    assert.equal(await page.locator('#countdown').textContent(),'Your move');
    await hold(-1);await page.clock.runFor(3400);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Try the return again');
    await choose('[data-do=trial-retry]');await page.clock.runFor(1200);
    await hold(1,true);await page.clock.runFor(250);await hold(1);await page.clock.runFor(3000);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!',device+' '+line);
    assert.equal(await page.evaluate(()=>fingerprint()),frozen);
    await choose('[data-do=trial-replay]');await route();await choose('#recovery-back');
    assert.equal(await page.locator('#dialog-title').textContent(),'Paused');
    await choose('[data-do=stock-retry]');
    assert.equal(await page.locator('#dialog-title').textContent(),'Retry stock 1');
    await choose('#stock-watch');await page.clock.runFor(4400);
    assert.match(await page.locator('#stock-caption').textContent(),/Recorded knockout · bottom/);
    await choose('#stock-try');await page.clock.runFor(3100);
    assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!');
    assert.match(await page.locator('.finish-comparison').innerText(),/Time played/);
    assert.equal(await page.evaluate(()=>fingerprint()),frozen);
    await choose('[data-do=trial-retry]');await hold(-1);await page.clock.runFor(3000);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Stock lost');
    await choose('[data-do=trial-replay]');await choose('#stock-back');
    assert.equal(await page.locator('#dialog-title').textContent(),'Paused');
    if(device==='keyboard'){
      await choose('[data-do=resume]');await hold(-1);
      for(let i=0;i<20 && !await page.locator('[data-do=watch-finish]').isVisible();i++)await page.clock.runFor(3500);
      await hold(0);await choose('[data-do=coach-fall]');await route();await choose('#recovery-back');
      assert.equal(await page.locator('#dialog-title').textContent(),'First fight finished');
      await choose('[data-do=home]');await choose('#home-records');await choose('[data-record-id]');
      await choose('[data-saved-clip="0"][data-ko-slot="0"]');await choose('#clip-coach');await route();
      await play();await page.clock.runFor(1200);await hold(1,true);await page.clock.runFor(250);
      await hold(1);await page.clock.runFor(3000);await hold(0);
      assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!');
      await choose('[data-do=trial-results]');await page.locator('.card-stats').waitFor();
      await page.locator('[data-saved-clip="0"][data-ko-slot="0"]').waitFor();
      await page.goto('http://127.0.0.1:8080/?stock-archive#records');
      await choose('[data-record-id]');await choose('[data-saved-clip=full]');
      await choose('#film-knockouts summary');await choose('[data-stock-at]');
      assert.equal(await page.locator('#dialog-title').textContent(),'Retry stock 1');
      await choose('#stock-try');await page.clock.runFor(3100);
      assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!');
      await choose('[data-do=trial-results]');await page.locator('[data-saved-clip=full]:focus').waitFor();
      assert.equal(await page.evaluate(()=>new FightRecords.Book(localStorage).list().length),1);
    }
    await page.goto('http://127.0.0.1:8080/?couch#local/rules/time/3/1/single/flat/off');
    await choose('#rules-use');await choose('#slots [data-index="1"]');await choose('#roster [data-kind=pip]');
    await choose('#start');await page.clock.runFor(2500);
    await page.keyboard.down('ArrowRight');await page.clock.runFor(1500);await page.keyboard.up('ArrowRight');
    await choose('#pause');await choose('[data-recovery-seat="1"]');await route();
    assert.match(await page.locator('#recovery-position').textContent(),/P2 · Pip/);
    assert.match(await page.locator('#recovery-route').textContent(),/P1 controls.+recorded inputs/);
    await choose('#recovery-fall');await page.clock.runFor(3200);
    assert.match(await page.locator('#recovery-cue').textContent(),/point lost/);
    await play();await page.clock.runFor(1200);await hold(-1,true);await page.clock.runFor(250);
    await hold(-1);await page.clock.runFor(2200);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Point saved!',device+' P2 recovery');
    assert.match(await page.locator('#dialog-body').textContent(),/kept the point/);
    await choose('[data-do=trial-results]');
    assert.deepEqual(await page.locator('#hud .lives').evaluateAll(rows=>rows.map(r=>r.getAttribute('aria-label'))),['0 points','-1 point']);
    if(device==='keyboard'){
      await page.goto(root+'?last-dodge#tutorial/first-match');
      await page.evaluate(()=>{
        const step=DogFight.Battle.prototype.step;
        DogFight.Battle.prototype.step=function(...args){if(this.mode==='solo')window.firstFight ||= this;return step.apply(this,args);};
      });
      await page.clock.runFor(2600);
      await page.evaluate(()=>firstFight.placeLastDodge('left',false,0));
      await page.clock.runFor(18);
      assert.equal(await page.locator('#corner-title').textContent(),'Air dodge to the ledge');
      await choose('#pause');const before=await page.evaluate(()=>[firstFight.matchFrames,firstFight.random.state,firstFight.dogs[0].y]);
      await choose('[data-do=corner-practice]');await route();
      assert.match(await page.locator('#recovery-route').textContent(),/roll onto the stage/);
      await choose('#recovery-guide');await page.clock.runFor(1400);
      await hold(1,false,true,true);await page.clock.runFor(140);
      assert.match(await page.locator('#countdown').textContent(),/Release/);
      await hold(1);await page.clock.runFor(450);
      assert.match(await page.locator('#countdown').textContent(),/Roll/);
      await hold(0,false,false,true);await page.clock.runFor(120);await hold(1);await page.clock.runFor(1600);await hold(0);
      assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!');
      await choose('[data-do=trial-results]');
      assert.deepEqual(await page.evaluate(()=>[firstFight.matchFrames,firstFight.random.state,firstFight.dogs[0].y]),before);
    }
    await page.goto(root+'#tutorial/launch-survival');await route();
    assert.match(await page.locator('#recovery-position').textContent(),/Pip.+Impact to landing/);
    await choose('#recovery-demo');await page.clock.runFor(4500);
    assert.match(await page.locator('#recovery-cue').textContent(),/Landed onstage/);
    await choose('#recovery-guide');await page.clock.runFor(1500);
    assert.match(await page.locator('#countdown').textContent(),/Steer the launch/);
    const launchClock=await page.locator('#match-clock').textContent();
    await hold(1);await page.clock.runFor(200);assert.equal(await page.locator('#match-clock').textContent(),launchClock);
    await hold(-1);await page.clock.runFor(100);await hold(1);await page.clock.runFor(1200);
    assert.match(await page.locator('#countdown').textContent(),/\+/);
    await hold(0,false,false,true,true);await page.clock.runFor(100);
    await hold(1);await page.clock.runFor(2300);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Stock saved!');
    await choose('[data-do=trial-replay]');await route();await choose('#recovery-swap');await route();
    assert.match(await page.locator('#recovery-route').textContent(),/recover/);
    await choose('#recovery-back');await choose('#dialog-body button:text-is("Launch survival")');await route();
    await choose('#recovery-back');await choose('#dialog-body button:text-is("Ledge clinic")');
    const ledge=page.locator('#clip-ledge[open]');
    await ledge.locator('[data-play]').waitFor();
    assert.match(await ledge.locator('[data-original]').textContent(),/Lost the stock.+Haymaker/);
    assert.match(await ledge.locator('[data-outcome]').textContent(),/Onstage/);
    await choose('#clip-ledge [data-watch]');await page.clock.runFor(4800);
    assert.equal(await page.locator('#dialog-title').textContent(),'Onstage');
    await choose('[data-do=ledge-play]');
    for(let i=0;i<90 && !(await page.locator('#corner-line').textContent()).startsWith('Try');i++)await page.clock.runFor(32);
    assert.match(await page.locator('#corner-line').textContent(),/^Try/);
    await hold(1);await page.clock.runFor(800);await hold(0);
    assert.equal(await page.locator('#dialog-title').textContent(),'Onstage');
    await choose('[data-do=trial-replay]');await ledge.locator('[data-play]').waitFor();
    assert.equal(await ledge.locator('[data-delay]').inputValue(),'60');
    await ledge.locator('[data-delay]').selectOption('0');
    assert.match(await ledge.locator('[data-outcome]').textContent(),/Lost the stock/);
    await choose('#clip-ledge [data-play]');await hold(1);await page.clock.runFor(2400);await hold(0);
    assert.match(await page.locator('#dialog-body').textContent(),/Your get-up · Lost the stock/);
    await choose('[data-do=trial-results]');assert.equal(await page.locator('#dialog-title').textContent(),'Fight School');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','touch','controller']){
    try{await check(browser,device);}catch(error){throw Error(device+' recovery playtest: '+error.stack);}
  }}
  finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
