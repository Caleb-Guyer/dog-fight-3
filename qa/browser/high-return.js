const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Run browser input on hosted Linux.');
const {chromium}=require('playwright-core');
async function play(browser,device){
  const touch=device==='touch', pad=device==='pad';
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},isMobile:touch,hasTouch:touch});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const press=s=>touch?page.locator(s).tap():page.locator(s).click();
  try{
    await page.addInitScript(pad=>{
      localStorage.setItem('dog-fight-3.controls',JSON.stringify({keyboard:[{attack:'KeyQ'},{}]}));
      if(pad){
        const p={index:0,id:'Arcade pad',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
        Object.defineProperty(navigator,'getGamepads',{value:()=>[p]});
        window.hold=(index,on)=>Object.assign(p.buttons[index],{pressed:on,value:Number(on)});
        window.axis=x=>{p.axes[0]=x;};
      }
    },pad);
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto('http://127.0.0.1:8080/#training/beat-the-edgeguard');
    const status=page.locator('#air-status'), state=()=>status.getAttribute('data-result');
    const time=ms=>page.clock.runFor(ms);
    const start=async()=>{
      if(pad){await page.evaluate(()=>hold(2,true));await time(34);await page.evaluate(()=>hold(2,false));}
      else if(touch)await press('[data-touch=attack]');else await page.keyboard.press('q');
    };
    assert.equal(await state(),'ready');await time(400);assert.equal(await state(),'ready');
    await press('#air-speed');assert.equal(await page.locator('#air-speed').getAttribute('aria-pressed'),'false');
    await start();await time(1700);assert.equal(await state(),'miss',await status.textContent());
    await press('#air-highReturn');await press('#air-side');
    await page.locator('#air-dog').selectOption('noodle');
    assert.match(await status.textContent(),/Noodle · right ledge/);
    await start();await time(90);
    if(pad){
      await page.evaluate(()=>{axis(-1);hold(0,true);});await time(140);await page.evaluate(()=>hold(0,false));
      await time(1400);await page.evaluate(()=>axis(0));
    }else if(touch){
      const cdp=await page.context().newCDPSession(page), points=[];
      for(const action of ['left','jump']){
        const box=await page.locator('[data-touch='+action+']').boundingBox();
        assert(box && box.y>=0 && box.y+box.height<=844,action+' on screen');
        points.push({id:points.length+1,x:box.x+box.width/2,y:box.y+box.height/2});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
      }
      await time(1400);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{
      await page.keyboard.down('a');await page.keyboard.down('Space');await time(140);await page.keyboard.up('Space');
      await time(1400);await page.keyboard.up('a');
    }
    assert.equal(await state(),'clean',device+' '+await status.textContent());
    await page.evaluate(()=>{
      const step=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(...args){if(this.mode==='solo')window.mainFight=this;return step.apply(this,args);};
    });
    await press('#air-return-fight');await time(3700);
    assert.deepEqual(await page.evaluate(()=>[mainFight.mode,mainFight.cpuLevel,mainFight.stockCount,...mainFight.dogs.map(f=>f.kind)]),['solo','rival',3,'noodle','brisket']);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const device of ['keyboard','pad','touch'])await play(browser,device);}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
