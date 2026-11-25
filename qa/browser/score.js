const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw new Error('Run input and audio playtests on the hosted Linux runner.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function renderScores(page){
  const levels=await page.evaluate(async()=>{
    const {scores,Player,playStep}=YardScore, levels=[];
    for(const s of Object.values(scores)){
      const rate=24000, length=s.form.length*s.meter, barTime=30/s.bpm;
      const c=new OfflineAudioContext(1,Math.ceil((length*barTime+1)*rate),rate);
      const p=new Player(c);
      p.bus=c.createGain();p.bus.gain.value=1;p.bus.connect(c.destination);
      let at=.012;
      for(let i=0;i<length;i++){
        playStep(s,i,false,(inst,n,d,v)=>p.voice(inst,n,at,d,v));
        at+=barTime*(1+(i%2?-1:1)*s.swing);
      }
      const output=await c.startRendering(),data=output.getChannelData(0);
      let peak=0,square=0,tail=0;
      for(let i=0;i<data.length;i++){
        peak=Math.max(peak,Math.abs(data[i]));square+=data[i]*data[i];
        if(i>=data.length-rate*.3)tail=Math.max(tail,Math.abs(data[i]));
      }
      levels.push([s.id,peak,Math.sqrt(square/data.length),tail]);
    }
    return levels;
  });
  assert.equal(levels.length,10);
  for(const [id,peak,rms,tail] of levels){
    assert(peak>.04 && peak<.94 && rms>.009 && tail<.0001,[id,peak,rms,tail].join('/'));
  }
  console.log('::notice title=Sound render::Rendered all 10 scores. Largest full-volume peak '+Math.max(...levels.map(x=>x[1])).toFixed(3)+'.');
}
async function observe(context) {
  await context.addInitScript(()=>{
    let score;
    Object.defineProperty(window,'YardScore',{configurable:true,get:()=>score,set(value){
      score=value;
      const update=value.Player.prototype.update;
      value.Player.prototype.update=function(...args){
        window.band=this;
        return update.apply(this,args);
      };
    }});
  });
}
async function playtest(browser,mobile){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:
    {viewport:{width:1366,height:768}});
  await observe(context);
  const page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const press=async id=>mobile?page.locator('#'+id).tap():page.locator('#'+id).click();
  const playing=id=>page.waitForFunction(key=>window.band?.track===key && band.bus && band.step>0,id);
  try {
    await page.goto(root+'#sound-test');
    assert.equal(await page.locator('#audition-track option').count(),10);
    assert.equal(await page.evaluate(()=>!!window.band),false);
    if(!mobile)await renderScores(page);
    await press('audition-play'); await playing('picnic');
    await page.locator('#audition-track').selectOption('laundry');await playing('laundry');
    await press('audition-mix');
    await page.waitForFunction(()=>band.urgent && document.querySelector('#audition-status').textContent==='Final-stock mix');
    await press('audition-stop');await page.waitForFunction(()=>!band.bus);
    await page.locator('#audition-track').selectOption('win-clover');await playing('win-clover');
    assert(await page.locator('#audition-mix').isHidden());
    await page.waitForFunction(()=>band.finished && document.querySelector('#audition-status').textContent==='Finished');
    await press('audition-play');await playing('win-clover');
    await press('audition-back');
    await page.locator('#option-music').press('Home');await page.waitForFunction(()=>!band.bus);
    assert.equal(await page.locator('#option-volume').inputValue(),'75');
    await page.reload(); await press('audition-play');
    assert.match(await page.locator('#audition-status').textContent(),/Muted/);
    await press('audition-back');assert.equal(await page.locator('#option-music').inputValue(),'0');
    await page.locator('#option-music').press('End');
    if(!mobile){
      await page.goto(root+'?set#solo/night-mail');await page.keyboard.press('j');await playing('nightmail');
      await page.keyboard.press('p');await page.waitForFunction(()=>!band.bus);
      const cursor=await page.evaluate(()=>band.step);await page.waitForTimeout(250);
      assert.equal(await page.evaluate(()=>band.step),cursor);
      await page.locator('[data-do="resume"]').click();await playing('nightmail');
      await page.goto(root+'?final#solo/last-stock');await page.keyboard.press('j');
      await page.evaluate(()=>{DogFight.Battle.prototype.cpu=function(){return {...DogFight.idleInput,x:1,y:this.dogs[1].ground<0?1:0};};});
      await playing('nightmail');await page.waitForFunction(()=>band.urgent);
      await playing('win-pip');await page.waitForFunction(()=>band.finished);
      await page.goto(root+'?film#cutscenes');
      await page.locator('[data-reel]').first().click();
      await page.waitForFunction(()=>!window.band?.bus && !document.querySelector('#dispatch-story').hidden);
    }
    assert.deepEqual(errors,[]);
  } finally {await context.close();}
}
async function main(){
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try {await playtest(browser,false);await playtest(browser,true);}
  finally {await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+e.message.replaceAll('\n','%0A'));process.exitCode=1;});
