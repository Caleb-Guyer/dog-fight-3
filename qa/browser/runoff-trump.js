const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Use the hosted Linux runner.');
const {chromium}=require('playwright-core');
async function play(browser,device) {
  const touch=device==='touch',pad=device==='pad';
  const page=await browser.newPage(touch?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{viewport:{width:1180,height:760}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(pad=>{
      localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{attack:'KeyQ'},{}]}));
      if(pad){
        const p={index:0,id:'Arcade pad',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
        Object.defineProperty(navigator,'getGamepads',{value:()=>[p]});
        window.padInput=keys=>{
          p.axes[0]=Number(keys.includes('right'))-Number(keys.includes('left'));
          p.axes[1]=Number(keys.includes('down'));
          for(const [action,n] of Object.entries({jump:0,attack:2,shield:4})){
            p.buttons[n].pressed=keys.includes(action);p.buttons[n].value=Number(p.buttons[n].pressed);
          }
        };
      }
    },pad);
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto('http://127.0.0.1:8080/#training/runoff-trump');
    const cdp=touch&&await page.context().newCDPSession(page), keys={left:'a',right:'d',down:'s',jump:'Space',attack:'q',shield:'l'};
    const press=id=>touch?page.locator(id).tap():page.locator(id).click(), status=page.locator('#trump-status');
    let held=[];
    async function input(actions){
      if(pad)await page.evaluate(k=>padInput(k),actions);
      else if(touch){
        if(held.length)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        const points=[];
        for(const action of actions){
          const b=await page.locator('[data-touch="'+action+'"]').boundingBox();assert(b && b.y>=0 && b.y+b.height<=845);
          points.push({id:points.length+1,x:b.x+b.width/2,y:b.y+b.height/2});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
        }
      }else{
        for(const k of held)if(!actions.includes(k))await page.keyboard.up(keys[k]);
        for(const k of actions)if(!held.includes(k))await page.keyboard.down(keys[k]);
      }
      held=actions;
    }
    const state=()=>status.getAttribute('data-result');
    async function until(target){
      for(let n=0;n<70 && await state()!==target;n++)await page.clock.runFor(55);
      assert.equal(await state(),target,device+' · '+await status.textContent());
    }
    await input(['attack']);await until('go');
    await input(['left']);await until('turn');await page.clock.runFor(500);assert.equal(await state(),'turn');
    await input(['right']);await until('bump');await input([]);await page.clock.runFor(400);
    await input(['down','jump']);await until('aim');await input(['left','attack']);await page.clock.runFor(50);
    await input(['right']);await until('landed');await input([]);
    assert.match(await status.textContent(),/Back Heel.*back onstage/);
    await press('#trump-escape');await press('#trump-side');await press('#trump-speed');
    assert.match(await status.textContent(),/Right ledge/);
    await input(['attack']);await until('go');await input(['shield']);await until('escaped');await input([]);
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){if(this.mode==='solo')window.fight=this;return step.apply(this,args);};
    });
    await press('#trump-fight');await page.clock.runFor(3650);
    assert.deepEqual(await page.evaluate(()=>[fight.mode,fight.cpuLevel,fight.stockCount,fight.dogs[0].kind,fight.dogs[1].kind]),['solo','rival',3,'pip','brisket']);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','pad','touch'])await play(browser,device);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
