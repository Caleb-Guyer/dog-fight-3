const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if(process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw new Error('Run browser and input checks on the hosted Linux runner.');
const {chromium} = require('playwright-core');
const root='http://127.0.0.1:8080/';
const errors=[];
async function device(browser,mobile,hash) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1160,height:760},
    isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(e.message));
  // Use the shipped PeerJS client and native WebRTC with a signaling service on this runner.
  await page.route('**/vendor/peerjs-1.5.5.min.js',async route=>{
    const res=await route.fetch();
    await route.fulfill({response:res,body:(await res.text())+
      "\nwindow.Peer=class extends window.Peer {constructor(id,options){super(id,{...options,host:'127.0.0.1',port:9001,path:'/df3',secure:false,config:{iceServers:[]}});}};"});
  });
  await page.goto(root+hash);
  await observe(page);
  return {page,mobile,press:selector=>mobile?page.locator(selector).tap():page.locator(selector).click()};
}
async function observe(page) {
  await page.evaluate(()=>{
    const proto=DogFight.Battle.prototype,step=proto.step,cpu=proto.cpu;
    proto.step=function(...args){
      window.observedBattle=this;
      if(!window.firstControl)window.firstControl={x:args[1].x,grab:args[1].grab,grabTap:!!args[1].tapped?.grab};
      return step.apply(this,args);
    };
    proto.cpu=function(...args){
      if(window.runCpuOff && this.mode==='solo'){
        const [a,b]=this.dogs;
        return {...DogFight.idleInput,x:Math.sign(b.x-a.x)||1,y:b.ground<0?1:0};
      }
      return cpu.apply(this,args);
    };
  });
}
async function fresh(device,game,score){
  const {page}=device;
  await page.waitForFunction(([g,s])=>!document.querySelector('#dialog').open &&
    document.querySelector('#match-set').textContent==='Game '+g+' · '+s,[game,score]);
  assert(await page.locator('#match-set').isVisible());
  assert.deepEqual(await page.locator('#hud .lives').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label'))),['3 stocks','3 stocks']);
}
async function leaveThreeStocks(device,slot) {
  const {page,mobile}=device, result=page.locator('#set-score');
  const touch=mobile && await page.context().newCDPSession(page);
  let held='';
  async function direction(next) {
    if(held===next)return;
    if(held){
      if(mobile)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      else await page.keyboard.up(held);
    }
    held=next;
    if(!held)return;
    if(mobile){
      const b=await page.locator('[data-touch="'+held+'"]').boundingBox();
      assert(b);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});
    }else await page.keyboard.down(held);
  }
  try {
    const end=Date.now()+46000;
    while(Date.now()<end && !await result.isVisible()){
      const side=await page.evaluate(i=>{const w=window.observedBattle;return w && w.dogs[i].x<w.dogs[1-i].x?'left':'right';},slot);
      await direction(mobile?side:side==='left'?'a':'d');
      await page.waitForTimeout(100);
    }
    if(!await result.isVisible()){
      const state=await page.evaluate(()=>({stage:document.querySelector('#match-stage').textContent,
        status:document.querySelector('#online-status').textContent,call:document.querySelector('#countdown').textContent,
        hidden:document.hidden,dialog:document.querySelector('#dialog').open && document.querySelector('#dialog-title').textContent,
        active:[...document.querySelectorAll('.touch-pad .held')].map(el=>el.dataset.touch),
        dogs:window.observedBattle?.dogs.map(f=>[f.x,f.y,f.ground,f.prev.x,f.stocks])}));
      assert.fail('Unfinished stock game '+JSON.stringify(state));
    }
  }finally{await direction('');if(touch)await touch.detach();}
}
async function soloAndLocal(browser){
  const d=await device(browser,false,'#solo'),{page,press}=d;
  await press('[data-mode=local]');await press('#rules-label');await press('[data-format=set]');
  assert.match(await page.locator('#start').textContent(),/Start set/);
  await press('#start');await fresh(d,1,'0–0');
  await page.keyboard.down('d');await page.keyboard.press('u');
  await page.waitForFunction(()=>!!window.firstControl);
  assert.deepEqual(await page.evaluate(()=>window.firstControl),{x:1,grab:false,grabTap:false});
  await page.keyboard.up('d');
  await press('#pause');await press('[data-do=rematch]');await fresh(d,1,'0–0');
  await leaveThreeStocks(d,0);
  assert.match(await page.locator('#set-score').textContent(),/P1 0 – 1 P2/);
  await press('[data-do=set-pick]');await page.keyboard.press('Escape');
  assert.equal(await page.locator('.set-history li').count(),1);
  await press('[data-do=set-pick]');await press('[data-stage=canal]');await fresh(d,2,'0–1');
  await press('#pause');await press('[data-do=rematch]');await fresh(d,2,'0–1');
  await page.goto(root+'?solo-set#solo/best-of-three');await observe(page);await fresh(d,1,'0–0');
  // Feed the solo CPU a controlled walk-off, preserving all three stock and respawn transitions.
  await page.evaluate(()=>window.runCpuOff=true);
  await page.locator('[data-do=cpu-counterpick]').waitFor({timeout:35000});
  assert.match(await page.locator('#dialog-body').textContent(),/Brisket picks Night Mail/);
  await press('[data-do=cpu-counterpick]');await fresh(d,2,'1–0');
  await page.locator('[data-do=new-set]').waitFor({timeout:35000});
  assert.match(await page.locator('#set-score').textContent(),/P1 2 – 0 CPU/);
  await press('[data-do=new-set]');await fresh(d,1,'0–0');
  assert.equal(await page.locator('#match-stage').textContent(),'Picnic Table');
  await page.close();console.log('Couch counterpick, game-two restart and solo CPU counterpick passed.');
}
async function onlineSet(browser,phoneBrowser) {
  const host=await device(browser,false,'#online'), guest=await device(phoneBrowser,true,'#online');
  const {page:a}=host,{page:b}=guest;
  await host.press('#online-format');await a.selectOption('#online-stage','nightmail');await host.press('#online-create');
  await a.locator('#online-invite').waitFor();await b.locator('#online-code').fill(await a.locator('#online-room-code').textContent());
  await guest.press('#online-join');
  for(const d of [host,guest])await fresh(d,1,'0–0');
  for(const [i,loser] of [guest,host,guest].entries()){
    const winner=loser===host?guest:host,slot=loser===host?0:1;
    await leaveThreeStocks(loser,slot);
    for(const d of [loser,winner])await d.page.locator('#set-score').waitFor();
    assert.equal(await a.locator('#set-score').textContent(),await b.locator('#set-score').textContent());
    assert.equal(await b.locator('.set-history li').count(),i+1);
    if(i<2){
      if(i===0)await winner.press('[data-do=online-rematch]');
      await loser.press('[data-do=set-pick]');await loser.press(i===0?'[data-stage=bandstand]':'[data-stage=nightmail]');
      if(i===1)await winner.press('[data-do=online-rematch]');
      for(const d of [host,guest])await fresh(d,i+2,i===0?'1–0':'1–1');
    }else{
      assert.match(await a.locator('#set-score').textContent(),/P1 2 – 1 P2/);
      await guest.press('[data-do=online-rematch]');await host.press('[data-do=online-rematch]');
      for(const d of [host,guest]){await fresh(d,1,'0–0');assert.equal(await d.page.locator('#match-stage').textContent(),'Night Mail');}
    }
  }
  await b.close();await a.close();console.log('Desktop host and phone guest completed a 2–1 WebRTC set and started another.');
}
async function main(){
  const options={executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
    headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
  const browser=await chromium.launch(options);
  try{
    await soloAndLocal(browser);
    const phone=await chromium.launch(options);
    try{await onlineSet(browser,phone);}finally{await phone.close();}
    assert.deepEqual(errors,[]);
  }
  finally{await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
