const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Run interactive checks on hosted Linux.');
const {chromium}=require('playwright-core');
async function play(browser,profile){
  const touch=profile==='touch', count=profile==='two pads'?2:profile==='keyboard'?0:1;
  const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},isMobile:touch,hasTouch:touch});
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));
  const choose=s=>touch?page.locator(s).tap():page.locator(s).click();
  const step=ms=>page.clock.runFor(ms);
  try{
    await page.addInitScript(n=>{
      window.pads=Array.from({length:n},(_,index)=>({index,id:'Doubles pad '+index,connected:true,mapping:'standard',
        axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))}));
      Object.defineProperty(navigator,'getGamepads',{value:()=>pads});
    },count);
    await page.clock.install({time:new Date('2030-01-01Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto('http://127.0.0.1:8080/'+(profile==='keyboard'?'':'#local/depot-doubles'));
    if(profile==='keyboard'){await choose('[data-enter-mode=local]');await choose('#depot-duo');}
    await page.getByRole('heading',{name:'Bell Depot doubles'}).waitFor();
    const progress=()=>page.evaluate(()=>DispatchScript.chapters.map(c=>localStorage.getItem(c.saveKey)));
    const prior=await progress();
    await page.evaluate(()=>{
      const advance=DispatchRun.prototype.step;
      DispatchRun.prototype.step=function(...args){window.live=this;return advance.apply(this,args);};
    });
    await choose('[data-do=depot-start]');await step(96);
    assert.deepEqual(await page.evaluate(()=>live.team.map(f=>f.stocks)),[3,3]);
    assert.match(await page.locator('#runner-name').innerText(),/^P1 /);
    assert.match(await page.locator('#machine-name').innerText(),/^P2 /);
    assert(await page.locator('#machine-health').isVisible());
    const before=await page.evaluate(()=>live.team.map(f=>f.x));
    const client=touch && await page.context().newCDPSession(page);
    if(touch){
      const box=await page.locator('[data-touch=left]').boundingBox();
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
    }else if(count<2)await page.keyboard.down('a');
    if(count)await page.evaluate(()=>{pads.at(-1).axes[0]=1;if(pads.length===2)pads[0].axes[0]=-1;});
    else await page.keyboard.down('ArrowRight');
    await step(128);
    const after=await page.evaluate(()=>live.team.map(f=>f.x));
    assert(after[0]<before[0] && after[1]>before[1],JSON.stringify({profile,before,after}));
    if(touch)await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else await page.keyboard.up('a');
    await page.keyboard.up('ArrowRight');await page.evaluate(()=>pads.forEach(p=>p.axes[0]=0));
    if(count){
      await page.evaluate(()=>{window.unplugged=pads.pop();});await step(50);
      await page.getByRole('heading',{name:'Controller disconnected'}).waitFor();
      await page.evaluate(()=>pads.push(unplugged));await step(50);
      await choose('#pad-resume');await step(50);
      assert.equal(await page.locator('#countdown').innerText(),'');
    }
    const pause=page.locator('#pause'), box=await pause.boundingBox();
    assert(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('#pause'),
      {x:box.x+box.width/2,y:box.y+box.height/2}));
    await choose('#pause');await page.getByRole('heading',{name:'Bell Depot doubles paused'}).waitFor();
    const clock=await page.evaluate(()=>live.time);await step(500);assert.equal(await page.evaluate(()=>live.time),clock);
    await choose('[data-do=resume]');
    // Start at the final stock and weak armor, then use the normal blast zone and P2 attack binding to finish.
    await page.evaluate(()=>{
      const [first,partner]=live.team,boss=live.foes[0];
      Object.assign(first,{stocks:1,ground:-1,y:3500});
      Object.assign(partner,{x:boss.f.x-55,face:1,vx:0});
      Object.assign(boss,{phase:'stun',duration:2,time:0,hp:2});
    });
    await step(50);
    assert.equal(await page.evaluate(()=>live.team[0].absent),true);
    if(count)await page.evaluate(()=>{pads.at(-1).buttons[2]={value:1,pressed:true};});
    else await page.keyboard.down('Comma');
    await step(200);
    if(count)await page.evaluate(()=>{pads.at(-1).buttons[2]={value:0,pressed:false};});
    else await page.keyboard.up('Comma');
    await step(1050);
    assert.equal(await page.evaluate(()=>live.finished),'exit',JSON.stringify({profile,errors,armor:await page.evaluate(()=>live.foes[0].hp)}));
    await page.getByRole('heading',{name:'Copper Hound defeated'}).waitFor();
    assert.deepEqual(await progress(),prior);
    await choose('[data-do=depot-start]');await step(64);
    assert.deepEqual(await page.evaluate(()=>live.team.map(f=>f.stocks)),[3,3]);
    await choose('#pause');await choose('[data-do=lobby]');
    assert(await page.locator('#depot-duo').isVisible());assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{for(const profile of ['keyboard','one pad','two pads','touch'])await play(browser,profile);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
