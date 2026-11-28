const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux')throw Error('Run input playtests on hosted Linux.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';

async function openMatch(browser,touch,controllers=false){
  const page=await browser.newPage({hasTouch:touch,isMobile:touch,viewport:touch?{width:844,height:390}:{width:1100,height:720}});
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  if(!touch)await page.addInitScript(()=>localStorage.setItem('dog-fight-3.config',JSON.stringify({tiltStick:true,tiltStick2:true})));
  if(controllers)await page.addInitScript(()=>{
    window.testPads=[0,1].map(index=>({id:'Strike pad '+index,index,connected:true,mapping:'standard',
      axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));
    Object.defineProperty(navigator,'getGamepads',{value:()=>testPads});
  });
  await page.goto(root+(touch?'#solo/picnic-table':'#local'));
  if(!touch)await page.locator('#start').click();
  await page.locator('#match').waitFor();
  await page.evaluate(()=>{
    window.strikes=[[],[]];
    const step=DogFight.Battle.prototype.step;
    DogFight.Battle.prototype.step=function(dt,a,b){
      const lastSmash=this.dogs.map(f=>f.prev?.smash);
      const result=step.apply(this,arguments);
      for(const [slot,input] of [a,b].entries()){
        if(!input?.tapped?.smash && !input?.tapped?.aimStick && !(input?.smash && !lastSmash[slot]))continue;
        const f=this.dogs[slot];
        strikes[slot].push({x:input.x,aim:[input.smashX,input.smashY],face:f.face,
          move:f.smashCharge?.side || f.attack?.tiltSide || f.attack?.smashSide});
      }
      return result;
    };
  });
  await page.clock.runFor(2600);
  return page;
}
async function controller(browser){
  const page=await openMatch(browser,false,true);
  try{
    const flick=direction=>page.evaluate(d=>{testPads[0].axes[2]=d;testPads[1].axes[2]=-d;},direction);
    await flick(-1);await page.clock.runFor(1100);
    await flick(1);await page.clock.runFor(1100);
    await page.evaluate(()=>{
      for(const [i,pad] of testPads.entries()){
        pad.axes[1]=i?1:-1;
        Object.assign(pad.buttons[7],{pressed:true,value:1});
      }
    });
    await page.clock.runFor(100);
    const logs=await page.evaluate(()=>strikes);
    for(const [i,log] of logs.entries()){
      const first=i?1:-1;
      assert.equal(log.length,3);
      assert.deepEqual(log.map(({aim,move})=>[aim,move]),[
        [[first,0],'forward'],[[-first,0],'forward'],[[0,first],i?'down':'up']
      ]);
      assert.deepEqual(log.slice(0,2).map(s=>s.face),[first,-first]);
    }
  }finally{await page.close();}
}
async function keyboard(browser){
  const page=await openMatch(browser,false);
  try{
    const k=page.keyboard;
    await k.down('a');await k.down('i');await k.up('a');await k.down('d');
    await k.down('ArrowDown');await k.down('n');await k.up('ArrowDown');await k.down('ArrowUp');
    await page.clock.runFor(34);
    const first=await page.evaluate(()=>strikes.map(list=>list[0]));
    assert.deepEqual([first[0].x,first[0].aim,first[0].face,first[0].move],[1,[-1,0],-1,'side']);
    assert.deepEqual([first[1].aim,first[1].move],[[0,1],'down']);
    for(const key of ['i','d','n','ArrowUp'])await k.up(key);
    await page.clock.runFor(1000);
    await k.down('a');await k.press('r');await k.down('y');
    // Both P2 strike keys stay held until after the move. The later tap wins.
    await k.down('Numpad2');await k.down('Numpad8');
    await page.clock.runFor(50);
    const second=await page.evaluate(()=>strikes.map(list=>list[1]));
    assert.deepEqual([second[0].x,second[0].aim,second[0].face,second[0].move],[-1,[1,0],1,'forward']);
    assert.deepEqual([second[1].aim,second[1].move],[[0,-1],'up']);
    await k.up('Numpad8');await k.up('Numpad2');await k.up('y');await k.up('a');
    await page.clock.runFor(500);
    assert.deepEqual(await page.evaluate(()=>strikes.map(list=>list.length)),[2,2]);
  }finally{await page.close();}
}
async function touchscreen(browser){
  const page=await openMatch(browser,true);
  try{
    const session=await page.context().newCDPSession(page);
    async function point(button,id){
      const el=page.locator('[data-touch='+button+']');await el.waitFor();
      const b=await el.boundingBox();return {id,x:b.x+b.width/2,y:b.y+b.height/2};
    }
    const left=await point('left',1),smash=await point('smash',2),right=await point('right',3);
    const send=(type,touchPoints)=>session.send('Input.dispatchTouchEvent',{type,touchPoints});
    await send('touchStart',[left]);await send('touchStart',[left,smash]);
    await send('touchEnd',[]);await send('touchStart',[right]);
    await page.clock.runFor(34);await send('touchEnd',[]);
    const attack=await page.evaluate(()=>strikes[0][0]);
    assert.deepEqual([attack.x,attack.aim,attack.face,attack.move],[1,[-1,0],-1,'side']);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await keyboard(browser);await touchscreen(browser);await controller(browser);}finally{await browser.close();}
})().catch(error=>{console.error(error);console.log('::error::'+String(error.stack).replaceAll('\n','%0A'));process.exitCode=1;});
