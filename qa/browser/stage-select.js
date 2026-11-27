const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Run input checks on hosted Linux.');
const {chromium}=require('playwright-core');
const root='http://127.0.0.1:8080/';
async function check(browser,name,viewport){
  const phone=name!=='desktop',page=await browser.newPage({viewport,isMobile:phone,hasTouch:phone,reducedMotion:phone?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      window.pad={index:0,id:'Stage select pad',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
    });
    await page.clock.install({time:new Date('2030-01-01Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    const choose=async s=>{
      if(phone)return page.locator(s).tap();
      await page.locator(s).focus();return page.keyboard.press('Enter');
    };
    const padPress=async n=>{
      for(const down of [true,false]){
        await page.evaluate(([i,v])=>Object.assign(pad.buttons[i],{pressed:v,value:Number(v)}),[n,down]);
        await page.clock.runFor(64);
      }
    };
    if(!phone)await page.route('**/versus-select.css*',r=>r.abort(),{times:1});
    await page.goto(root+(phone?'#local/arenas':'#solo/arenas'));
    if(!phone)await choose('#dispatch-load-retry');
    await page.locator('#arena-confirm').waitFor();
    assert(await page.locator('[data-stage=picnic]').evaluate(b=>b===document.activeElement));
    const title=()=>page.locator('#arena-name').innerText();
    const canvas=()=>page.locator('#arena-preview').evaluate(c=>c.toDataURL());
    if(!phone){
      await padPress(15);assert.match(await title(),/Laundry Line/i);
      await page.keyboard.press('Tab');assert(await page.locator('#arena-random').evaluate(b=>b===document.activeElement));
      assert.match(await title(),/Laundry Line/i);
      await page.keyboard.press('Shift+Tab');await padPress(0);assert(await page.locator('#arena-confirm').evaluate(b=>b===document.activeElement));
    }
    await choose('[data-stage=canal]');assert.match(await title(),/Canal Lock/i);
    assert.equal(await page.locator('#arena-motion').textContent(),phone?'Play':'Pause');
    if(phone){const still=await canvas();await page.clock.runFor(500);assert.equal(await canvas(),still);await choose('#arena-motion');}
    const before=await canvas();await page.clock.runFor(600);assert.notEqual(await canvas(),before);
    await choose('#arena-motion');const frozen=await canvas();await page.clock.runFor(500);assert.equal(await canvas(),frozen);
    await choose('[data-stage-form=counterweights]');assert.match(await page.locator('#arena-description').textContent(),/Two lifts/);
    assert.notEqual(await canvas(),frozen);
    const choices=new Set([await title()]);
    for(let i=0;i<4;i++){await choose('#arena-random');choices.add(await title());}
    assert.equal(choices.size,5);
    await choose('[data-stage=laundry]');await choose('#arena-run');
    assert.equal(await page.locator('#route-arena').inputValue(),'laundry');assert.equal(await page.locator('#route-form').inputValue(),'counterweights');
    await page.selectOption('#route-arena','bandstand');await choose('#route-back');assert.match(await title(),/Moonbell Bandstand/i);
    await choose('#arena-music');assert.equal(await page.locator('#music-stage').inputValue(),'bandstand');
    await choose('#music-back');assert.match(await title(),/Moonbell Bandstand/i);
    assert(await page.locator('#arena-music').evaluate(b=>b===document.activeElement));
    await choose('[data-stage=canal]');
    const dimensions=await page.locator('#dialog').evaluate(d=>[d.clientWidth,d.clientHeight,d.scrollWidth]);
    assert.equal(dimensions[0],viewport.width);assert.equal(dimensions[1],viewport.height);assert(dimensions[2]<=viewport.width);
    const img=await page.locator('#arena-preview').boundingBox();assert(Math.abs(img.width/img.height-16/9)<.02);
    assert(await page.locator('[data-stage-form]').evaluateAll(items=>items.every(b=>{
      const r=document.createRange();r.selectNodeContents(b);
      const label=r.getBoundingClientRect(),button=b.getBoundingClientRect();
      return label.left>=button.left+1 && label.right<=button.right-1;
    })));
    await page.screenshot({path:'arena-select-'+name+'.png'});
    // Cancel the exploration with a controller or keyboard. Even the excursions into Stage Run and music did not save it.
    if(phone)await page.keyboard.press('Escape');else await padPress(1);
    assert.equal(await page.locator('#stage-title').textContent(),'Picnic Table');
    assert(await page.locator('#choose-stage').evaluate(b=>b===document.activeElement));
    await choose('#choose-stage');await choose('[data-stage=canal]');await choose('[data-stage-form=trio]');
    if(phone)await choose('#arena-confirm');else await padPress(9);
    assert.equal(await page.locator('#stage-title').textContent(),'Canal Lock · Three platforms');
    await page.reload();await page.locator('#arena-confirm').waitFor();assert.match(await title(),/Canal Lock/i);
    assert.equal(await page.locator('[data-stage-form=trio]').getAttribute('aria-pressed'),'true');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try{
    for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['landscape',844,390]])
      await check(browser,name,{width,height});
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
