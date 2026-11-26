const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {readFile}=require('node:fs/promises');
if(process.env.GITHUB_ACTIONS!=='true' || process.env.RUNNER_OS!=='Linux') throw Error('Use hosted Linux for browser input.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function exportFinish(page,press,mobile){
  if(!mobile)await press('button:has-text("Retry replay tools")');
  const marker=page.getByRole('button',{name:'Pip · KO',exact:true});
  if(mobile)await marker.tap();else await marker.click();
  const n=await marker.getAttribute('data-clip-moment');
  const selected=await page.locator('#clip-frame').textContent();
  assert(selected.startsWith('Frame '+n+' / '));
  assert.match(await page.locator('#clip-scores').textContent(),/Pip 125% · 0 stocks/);
  await press('#clip-inputs summary');assert.equal(await page.locator('.clip-input-seats').textContent(),'P1 inputs');
  assert.match(await page.locator('.clip-stick').textContent(),/Left/);
  await press('#clip-inputs summary');
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('finish-gif.js'))),false);
  if(!mobile){
    await page.route('**/finish-gif.js*',route=>route.abort(),{times:1});
    await press('#clip-export');
    await page.getByText('Could not make the GIF. Try again.',{exact:true}).waitFor();
  }
  await press('#clip-export');
  const ready=page.getByRole('button',{name:'Download GIF',exact:true});
  await ready.waitFor({timeout:35000});
  const download=page.waitForEvent('download');
  if(mobile)await ready.tap();else await ready.click();
  const file=await download;assert.match(file.suggestedFilename(),/pip-vs-brisket.*\.gif$/);
  const bytes=await readFile(await file.path());assert.equal(bytes.subarray(0,6).toString(),'GIF89a');
  assert(bytes.length<6_000_000);
  const decoded=await page.evaluate(async base64=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const decoder=new ImageDecoder({type:'image/gif',data:bytes});
    await decoder.tracks.ready;const count=decoder.tracks.selectedTrack.frameCount;
    const digests=[],durations=[],dimension=[];
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=300;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    for(const frameIndex of [0,Math.floor(count/2),count-1]){
      const {image}=await decoder.decode({frameIndex});ctx.drawImage(image,0,0);
      dimension.push([image.displayWidth,image.displayHeight]);durations.push(image.duration);image.close();
      const pixels=ctx.getImageData(0,0,480,270).data;
      digests.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))).join(','));
    }
    decoder.close();return {count,digests,durations,dimension};
  },bytes.toString('base64'));
  const length=Number(selected.split('/')[1]);
  assert.equal(decoded.count,1+Math.ceil(length/3));assert(new Set(decoded.digests).size>=2);
  assert.deepEqual(decoded.dimension,[[480,300],[480,300],[480,300]]);
  assert.equal(decoded.durations.at(-1),750000);
  assert.equal(await page.locator('#clip-frame').textContent(),selected);
  assert.equal(await page.locator('#clip-toggle').textContent(),Number(n)===length?'Watch again':'Play');
  console.log((mobile?'Touch':'Desktop')+' downloaded '+decoded.count+' GIF frames, '+bytes.length+' bytes.');
}
async function reviewMidMatch(page,mobile,press){
  await page.goto(root+'?stock-review#solo');
  await press('[data-mode=local]');
  await page.evaluate(()=>{
    const step=DogFight.Battle.prototype.step;
    window.position=w=>[w.matchFrames,w.clockFrames,w.random.state,...w.dogs.map(f=>[f.x,f.y,f.damage,f.stocks])];
    DogFight.Battle.prototype.step=function(){
      if(this.mode==='local')window.liveFight ||= this;
      if(this!==window.liveFight && document.querySelector('#match-mode').textContent==='Stock return · Local versus'){
        if(this!==window.returnFight){window.returnFight=this;window.startPosition=position(this);}
        window.returnInput=arguments[2];
      }
      if(this===window.liveFight && window.checkResume && !window.resumedAt)window.resumedAt=position(this);
      return step.apply(this,arguments);
    };
  });
  await press('#start');await page.clock.runFor(2850);
  const cdp=mobile && await page.context().newCDPSession(page);
  async function move(left){
    if(!mobile)return left?page.keyboard.down('a'):page.keyboard.up('a');
    if(!left)return cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const r=await page.locator('[data-touch=left]').boundingBox();
    return cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});
  }
  async function fall(count){
    await move(true);
    for(let i=0;i<120 && await page.evaluate(()=>liveFight.matchCard.losses.length)<count;i++)await page.clock.runFor(70);
    await move(false);
    assert.equal(await page.evaluate(()=>liveFight.matchCard.losses.length),count);
  }
  await page.keyboard.down('/');await page.clock.runFor(120);await page.keyboard.up('/');await page.clock.runFor(80);
  await fall(1);await page.clock.runFor(4500);await press('#pause');
  const parked=await page.evaluate(()=>position(liveFight));
  await press('[data-do=ko-replays]');await press('[data-return-fight="0"]');
  await page.clock.runFor(80);
  const initial=await page.evaluate(()=>startPosition);
  assert(initial[0]<parked[0]);assert.equal(await page.evaluate(()=>!!returnFight.dogs[0].stockLift),true);
  await page.keyboard.down('ArrowLeft');await page.clock.runFor(110);
  assert.equal(await page.evaluate(()=>returnInput.x),-1);
  await page.keyboard.up('ArrowLeft');await page.clock.runFor(4300);
  assert(await page.evaluate(()=>returnFight.matchFrames-startPosition[0]>240));
  await press('#pause');await press('[data-do=rehearse]');await page.clock.runFor(80);
  assert.deepEqual(await page.evaluate(()=>startPosition),initial);
  assert.deepEqual(await page.evaluate(()=>position(liveFight)),parked);
  await press('#pause');await page.evaluate(()=>window.checkResume=true);
  await press('[data-do=return-fight]');await page.clock.runFor(50);
  assert.deepEqual(await page.evaluate(()=>resumedAt),parked);
  await page.evaluate(()=>{window.checkResume=false;window.resumedAt=null;});await press('#pause');
  const original=await page.evaluate(()=>position(liveFight));
  await press('[data-do=ko-replays]');await press('[data-ko="0"]');
  await page.getByText(/Before leaving the stage · frame/).waitFor();
  await press('#clip-inputs summary');
  await page.locator('#clip-seek').press('End');await page.locator('#clip-seek').press('Home');
  await press('[data-input-seat="1"]');await press('[data-input-next]');
  assert.match(await page.locator('.clip-buttons').textContent(),/Shield pressed/);
  const shieldStart=await page.locator('#clip-frame').textContent();
  await press('#clip-step');assert.match(await page.locator('.clip-buttons').textContent(),/Shield held/);
  await press('[data-input-next]');assert.match(await page.locator('.clip-buttons').textContent(),/Shield released/);
  await press('[data-input-prev]');assert.equal(await page.locator('#clip-frame').textContent(),shieldStart);
  await press('[data-input-seat="0"]');await press('[data-input-next]');
  assert.match(await page.locator('.clip-stick').textContent(),/Left/);
  assert.equal(await page.locator('#clip-toggle').textContent(),'Play');
  assert.equal(await page.locator('#clip-inputs').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  await press('#clip-inputs summary');
  await press('#clip-escape');await page.clock.runFor(5100);
  assert.equal(await page.locator('#dialog-title').textContent(),'Exchange complete');
  assert.match(await page.locator('#dialog-body').textContent(),/You survived the original knockout/);
  assert.deepEqual(await page.evaluate(()=>position(liveFight)),original);
  assert.equal(await page.locator('[data-do=trial-results]').textContent(),'Back to fight');
  await page.evaluate(()=>{window.checkResume=true;});
  await press('[data-do=trial-results]');await page.clock.runFor(70);
  assert.deepEqual(await page.evaluate(()=>resumedAt),original);
  await fall(2);await page.clock.runFor(3200);await fall(3);await page.clock.runFor(1500);
  await press('[data-do=match-card]');
  assert.equal(await page.locator('[data-card-ko]').count(),3);
  await press('[data-card-ko="0"]');await page.locator('#clip-seek').press('End');
  assert.match(await page.locator('#clip-scores').textContent(),/2 stocks/);
  await press('[data-do=clip-back]');assert.equal(await page.locator('[data-card-ko]').count(),3);
  await press('[data-do=card-back]');await press('[data-do=ko-replays]');
  assert.deepEqual(await page.locator('[data-ko]').evaluateAll(el=>el.map(e=>e.dataset.ko)),['2','1','0']);
  assert.equal(await page.locator('[data-return-fight]').count(),2);
  await press('[data-return-fight="1"]');await page.clock.runFor(130);
  assert.equal(await page.evaluate(()=>returnFight.dogs[0].stocks),1);
  await press('#pause');await press('[data-do=return-fight]');
  await page.locator('[data-do=ko-replays]').waitFor();await press('[data-do=ko-replays]');
  await press('#ko-list-back');
  if(cdp)await cdp.detach();
}
async function play(browser,mobile) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1250,height:760},
    isMobile:mobile,hasTouch:mobile,reducedMotion:mobile?'reduce':'no-preference'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
  try{
    await page.goto(root+'#solo/last-stock');
    // Walk off the roof using ordinary match input, then revisit the confirmed finish.
    await page.keyboard.down('a');
    await page.clock.runFor(5500);
    await page.keyboard.up('a');
    assert.match(await page.locator('#dialog-title').textContent(),/Match result/);
    const photo=page.locator('.victory-shot');
    assert.match(await photo.getAttribute('aria-label'),/Brisket/);
    const result=await page.locator('.winner h3').textContent();
    const poses=await page.evaluate(()=>{
      const canvas=document.createElement('canvas'); canvas.width=152;canvas.height=104;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const out={};
      for(const kind of Object.keys(DogFight.kits)){
        const frames=[];
        for(const t of [0,.17,.34,.51]){
          ctx.clearRect(0,0,152,104);
          DogArt.draw(ctx,kind,78,82,{pose:'win',time:t,scale:.8,coat:2});
          const data=ctx.getImageData(0,0,152,104).data;
          let pixels=0,touchesEdge=false;
          for(let i=3;i<data.length;i+=4)if(data[i]){
            pixels++;const p=(i-3)/4,x=p%152,y=Math.floor(p/152);
            if(!x || !y || x===151 || y===103)touchesEdge=true;
          }
          if(pixels<150 || touchesEdge) throw Error(kind+' clipped podium cel');
          frames.push(canvas.toDataURL());
        }
        out[kind]=new Set(frames).size;
      }
      return out;
    });
    assert.deepEqual(Object.values(poses),[4,4,4,4]);
    assert.equal(await page.evaluate(()=>!!window.FinishTools),false);
    if(!mobile)await page.route('**/finish-tools.js*',route=>route.abort(),{times:1});
    await press('[data-do=watch-finish]');
    if(!mobile)await press('#clip-toggle');
    assert.equal(await page.locator('#clip-toggle').textContent(),'Play');
    const frame=()=>page.locator('#clip-frame').textContent();
    const paused=await frame();await page.clock.runFor(400);assert.equal(await frame(),paused);
    await page.locator('#clip-seek').press('Home');await press('#clip-step');
    assert.match(await frame(),/^Frame 1 \/ /);
    await press('#clip-speed');assert.equal(await page.locator('#clip-speed').textContent(),'Speed · 1×');
    await press('#clip-toggle');await page.clock.runFor(5000);
    assert.equal(await page.locator('#clip-toggle').textContent(),'Watch again');
    assert(await page.locator('#clip-practice').isDisabled());
    assert.match(await page.locator('#clip-scores').textContent(),/Pip 125% · 0 stocks/);
    await exportFinish(page,press,mobile);
    await page.locator('#clip-seek').press('Home');await press('#clip-practice');
    assert.match(await page.locator('#match-mode').textContent(),/Practice/);
    await page.keyboard.down('d');await page.clock.runFor(130);await page.keyboard.up('d');
    await press('#pause');await press('[data-do=return-fight]');
    assert.equal(await page.locator('.winner h3').textContent(),result);
    await press('[data-do=match-card]');
    assert.equal(await page.locator('.card-timeline li').count(),1);
    await press('[data-do=card-back]');await press('[data-do=watch-finish]');
    await page.locator('#clip-seek').press('End');
    assert.match(await page.locator('#clip-scores').textContent(),/Pip 125% · 0 stocks/);
    assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.winner h3').textContent(),result);
    await press('[data-do=practice-finish]');await press('[data-finish-slot="1"]');
    assert.match(await page.locator('#match-mode').textContent(),/P2 Brisket/);
    await page.clock.runFor(850);await press('#pause');
    assert.equal(await page.locator('#dialog-title').textContent(),'Practice paused');
    await page.evaluate(()=>{
      const playback=DogFight.FinishTape.prototype.playback;
      DogFight.FinishTape.prototype.playback=function(frame,emit,slot){
        const p=playback.apply(this,arguments),step=p.step;
        p.step=function(input){if(slot===1 && input?.x<-.5)window.droveP2=true;return step.apply(this,arguments);};
        return p;
      };
    });
    await press('[data-do=trial-retry]');
    if(mobile){
      const cdp=await page.context().newCDPSession(page),r=await page.locator('[data-touch=left]').boundingBox();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});
      await page.clock.runFor(3500);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    }else{await page.keyboard.down('a');await page.clock.runFor(3500);await page.keyboard.up('a');}
    assert(await page.evaluate(()=>window.droveP2));
    assert.equal(await page.locator('#dialog-title').textContent(),'Exchange complete');
    assert.equal(await page.locator('.finish-comparison tbody tr').count(),2);
    await press('[data-do=trial-replay]');
    assert.equal(await page.locator('#clip-toggle').textContent(),'Play');
    await page.locator('#clip-seek').press('Home');await press('#clip-exchange');await press('[data-finish-slot="0"]');
    await page.clock.runFor(5300);
    assert.equal(await page.locator('#dialog-title').textContent(),'Exchange complete');
    const pip=page.locator('.finish-comparison tbody tr').first();
    assert.match(await pip.locator('td').first().textContent(),/0 stocks/);
    assert.match(await pip.locator('td').last().textContent(),/1 stock/);
    await press('[data-do=trial-results]');assert.equal(await page.locator('.winner h3').textContent(),result);
    await reviewMidMatch(page,mobile,press);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{await play(b,false);await play(b,true);}finally{await b.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
