const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Run browser measurements on hosted Linux.');
const {chromium}=require('playwright-core');
const urls={previous:'http://127.0.0.1:8081/',candidate:'http://127.0.0.1:8080/'};
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function sample(browser,url){
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  try{
    await page.goto(url);
    const art=await page.evaluate(async()=>{
      const canvas=document.createElement('canvas');canvas.width=480;canvas.height=160;
      const ctx=canvas.getContext('2d',{willReadFrequently:true}),digests=[];
      const poses=['walk','run','jumpSquat','backDrift','attack','airAttack','launch','tumble','techRoll','ledgeClimb','directionalAirDodge','win'];
      const samples=[];
      for(const coat of [2,3])for(const [i,kind] of Object.keys(DogFight.kits).entries()){
        const kit=DogFight.kits[kind];
        for(const pose of [...poses,...kit.ground,...Object.values(kit.specials),...Object.values(kit.smashes)]){
          const start=performance.now();
          for(let frame=0;frame<16;frame++)DogArt.draw(ctx,kind,60+i*120,122,{coat,pose,phase:frame/15,time:frame*.16,face:i%2?-1:1,
            dodgeX:(frame%3)-1,dodgeY:frame%2?1:-1});
          samples.push(performance.now()-start);
        }
        digests.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,480,160).data))).join(','));
        ctx.clearRect(0,0,480,160);
      }
      return {ms:samples.reduce((a,b)=>a+b,0),digests};
    });
    await page.addInitScript(()=>{
      window.renderSamples=[];const schedule=requestAnimationFrame.bind(window);
      window.requestAnimationFrame=handler=>schedule(stamp=>{const start=performance.now();handler(stamp);window.renderSamples.push([stamp,performance.now()-start]);});
    });
    await page.goto(url+'?sample#solo/night-mail');
    await page.waitForTimeout(3200);await page.evaluate(()=>{window.renderSamples=[];});
    await page.waitForFunction(()=>window.renderSamples.length>=150);
    const fight=await page.evaluate(()=>{
      const rows=window.renderSamples.slice(0,150);
      const p95=xs=>xs.sort((a,b)=>a-b)[Math.floor(xs.length*.95)];
      return {callback:p95(rows.map(r=>r[1])),interval:p95(rows.slice(1).map((r,i)=>r[0]-rows[i][0]))};
    });
    assert.deepEqual(errors,[]);
    return {...fight,...art};
  }finally{await ctx.close();}
}
async function flurry(browser,url){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await page.goto(url+'#training/rapid-jab');await page.clock.runFor(100);
    await page.evaluate(()=>{
      const hud=document.querySelector('#hud');window.removedCards=0;
      new MutationObserver(records=>{for(const r of records)for(const n of r.removedNodes)
        if(n.nodeType===1 && n.matches('.hud-card'))window.removedCards++;}).observe(hud,{childList:true});
    });
    async function until(text){
      for(let n=0;n<180;n++){
        if((await page.locator('#combo-latest').textContent()).includes(text))return;
        await page.clock.runFor(25);
      }
      assert.fail('Did not reach '+text);
    }
    await page.keyboard.down('j');await page.clock.runFor(55);await page.keyboard.up('j');await until('Hold Attack now');
    await page.keyboard.down('j');await until('Bell Kick · 5%');await page.keyboard.up('j');
    assert.match(await page.locator('#combo-summary').textContent(),/8 hits · 20%/);
    assert.deepEqual(await page.locator('#hud .percentage').allTextContents(),['0%','20%']);
    assert.deepEqual(errors,[]);return await page.evaluate(()=>window.removedCards);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{
    const rows={previous:[],candidate:[]};
    for(let n=0;n<3;n++)for(const k of n===1?['candidate','previous']:['previous','candidate'])rows[k].push(await sample(browser,urls[k]));
    const out={};
    for(const k of Object.keys(rows)){
      for(const r of rows[k])assert.deepEqual(r.digests,rows.previous[0].digests);
      out[k]=Object.fromEntries(['ms','callback','interval'].map(m=>[m,Math.round(median(rows[k].map(r=>r[m]))*10)/10]));
      out[k].removedCards=await flurry(browser,urls[k]);
    }
    console.log('::notice title=Fighter rendering::'+JSON.stringify(out));
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'Three alternating cold browser contexts per build, 390×844 with 4× CPU throttling. Animation batch totals include first-time pose and coat drawing. Fight timings cover 150 live Night Mail frames. HUD removals cover one eight-hit flurry.\n\n'+
      '| Build | Animation batch ms | Fight callback p95 ms | Frame interval p95 ms | HUD cards removed |\n| --- | ---: | ---: | ---: | ---: |\n'+
      Object.entries(out).map(([k,r])=>'| '+k+' | '+[r.ms,r.callback,r.interval,r.removedCards].join(' | ')+' |').join('\n')+'\n');
    assert(out.previous.removedCards>=12);assert.equal(out.candidate.removedCards,0);
    assert(out.candidate.ms<out.previous.ms,'First-use drawings should be quicker on the same runner.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('::error::'+e.stack.replaceAll('\n','%0A'));process.exitCode=1;});
