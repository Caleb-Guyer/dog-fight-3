const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib');
const {execFileSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux')throw Error('Run browser input on hosted Linux.');
const {chromium}=require('playwright-core');
const types={js:'application/javascript',html:'text/html',css:'text/css',png:'image/png',ttf:'font/ttf',woff2:'font/woff2'};
function assets(directory,prefix,files){
  for(const f of fs.readdirSync(directory,{withFileTypes:true})){
    const name=path.join(directory,f.name),url=prefix+'/'+f.name;
    if(f.isDirectory()){assets(name,url,files);continue;}
    const ext=path.extname(f.name).slice(1), gzip=['js','html','css'].includes(ext);
    const bytes=fs.readFileSync(name),body=gzip?zlib.gzipSync(bytes,{level:6}):bytes;
    const headers={'Content-Type':types[ext]||'application/octet-stream','Content-Length':body.length};
    if(gzip)headers['Content-Encoding']='gzip';
    files.set(url,{body,headers});
  }
}
const deferred=['dispatch-actors','dispatch-bridge','dispatch-covers','dispatch-film','dispatch-run','dispatch-view','yard-art'];
async function sample(browser,url,build){
  const candidate=build==='new', modern=build!=='old';
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    const page=await context.newPage(), cdp=await context.newCDPSession(page),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:60,downloadThroughput:750000,uploadThroughput:250000});
    await page.goto(url,{waitUntil:'domcontentloaded'});
    const boot=await page.evaluate(async(candidate)=>{
      const cover=document.querySelector('#title-cover');
      if(cover.decode)await cover.decode();
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(cover,0,0,320,180);
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,320,180).data))).join(',');
      const original=DogFight.Battle.prototype.step;
      DogFight.Battle.prototype.step=function(dt,a,b){
        const x=this.dogs[0].x,result=original.apply(this,arguments);
        if(!window.walkedAt && this.lesson && a.x>0 && this.dogs[0].x>x)window.walkedAt=performance.now();
        return result;
      };
      const scripts=performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.endsWith('.js'));
      if(candidate && performance.getEntriesByType('resource').some(r=>new URL(r.name).pathname.endsWith('/fight-fx.png')))
        throw Error('Fight effects downloaded while the player was still on the first menu');
      if(candidate && scripts.some(r=>/\/(score|lesson-guide)\.js$/.test(new URL(r.name).pathname)))throw Error('Optional music and input coaching loaded before first input');
      return {hash,png:candidate?null:canvas.toDataURL('image/png').split(',')[1],ready:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
        scripts:scripts.length,js:scripts.reduce((n,r)=>n+r.decodedBodySize,0),
        payload:performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0)+performance.getEntriesByType('navigation')[0].encodedBodySize};
    },candidate);
    await page.locator('#welcome-play').tap();
    const position=await page.locator('[data-touch=right]').boundingBox();assert(position);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:position.x+position.width/2,y:position.y+position.height/2}]});
    await page.waitForFunction(()=>window.walkedAt>0);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname));
    if(candidate)await page.waitForFunction(()=>performance.getEntriesByType('resource').some(r=>new URL(r.name).pathname.endsWith('/fight-fx.png')));
    assert.equal(resources.some(p=>p.endsWith('/brawl-pixel.woff2')),modern);
    assert.equal(resources.some(p=>p.endsWith('/brawl-pixel.ttf')),!modern);
    if(modern)assert(!resources.some(p=>p.endsWith('/online.css')),'Online room styling stays out of first launch');
    for(const name of deferred)assert.equal(resources.some(p=>p.endsWith('/'+name+'.js')),!modern,name);
    assert.equal(resources.some(p=>p.endsWith('/online.js')),!candidate,'rollback transport');
    assert(!resources.some(p=>p.endsWith('/practice-feedback.js')),'Fight School loads independently of advanced training readouts');
    assert.deepEqual(errors,[]);
    return {...boot,move:await page.evaluate(()=>window.walkedAt)};
  }finally{await context.close();}
}
async function optionalModes(browser,url){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.route('**/practice-feedback.js*',route=>route.abort(),{times:1});
    await page.goto(url+'#training/flick-jump');
    await page.locator('#dispatch-load-retry').click();
    await page.locator('#spacing-flick[aria-pressed="true"]').waitFor();
    assert.match(await page.locator('#recovery-tip').textContent(),/Tap Up and release/);
    await page.locator('#spacing-flick').click();
    assert.equal(await page.locator('#spacing-flick').getAttribute('aria-pressed'),'false');
    assert.equal(await page.evaluate(()=>!!window.DogOnline),false);

    let release;
    const gate=new Promise(resolve=>release=resolve);
    await page.route('**/online.js*',async route=>{await gate;await route.continue();},{times:1});
    await page.goto(url+'?cancel#online/best-of-three',{waitUntil:'domcontentloaded'});
    await page.locator('#dispatch-load-back').click();
    release();
    await page.waitForFunction(()=>!!window.DogOnline);
    assert(await page.locator('#home').isVisible());
    await page.locator('#home-online').click();
    await page.locator('#online-quick').waitFor();
    assert.equal(await page.locator('#online-format').getAttribute('aria-pressed'),'false');

    await page.route('**/online.js*',route=>route.abort(),{times:1});
    await page.goto(url+'?retry#online/best-of-three');
    await page.locator('#dispatch-load-retry').click();
    await page.locator('#online-format[aria-pressed="true"]').waitFor();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'online-create');
    await page.goto(url+'?rulebook#online/rules');
    await page.getByRole('heading',{name:'Friend room rulesets'}).waitFor();
    await page.goto(url+'?invite#room/abc234');
    await page.locator('#online-join').waitFor();
    assert.equal(await page.locator('#online-code').inputValue(),'ABC234');
    await page.goto(url+'?bad#room/x');
    await page.locator('#online-join').waitFor();
    assert.match(await page.locator('#online-status').textContent(),/invalid room code/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
async function recovery(browser,url){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    // Leave the route while its art is in flight, then finish the original request.
    let release;
    const gate=new Promise(resolve=>release=resolve);
    await page.route('**/dispatch-covers.js*',async route=>{await gate;await route.continue();});
    await page.goto(url);await page.locator('#home-adventure').click();await page.locator('#dispatch-load-back').click();
    release();await page.waitForFunction(()=>!!window.DispatchCovers);
    const sameFont=await page.evaluate(async()=>{
      await document.fonts.load('24px "Brawl Pixel"');
      const reference=await new FontFace('Original Pixel','url(./assets/brawl-pixel.ttf)').load();
      document.fonts.add(reference);
      const canvas=document.createElement('canvas');canvas.width=850;canvas.height=115;
      const ctx=canvas.getContext('2d');
      function pixels(family){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for(const [row,size] of [13,20,31].entries()){
          ctx.font=size+'px "'+family+'"';
          ctx.fillText('Pip vs. Brisket · Rematch 0123456789%!',0,32+row*36);
        }
        return ctx.getImageData(0,0,canvas.width,canvas.height).data;
      }
      const a=pixels('Brawl Pixel'),b=pixels('Original Pixel');
      return a.some(v=>v!==0) && a.every((v,i)=>v===b[i]);
    });
    assert(sameFont,'The webfont should render the original arcade lettering pixel for pixel');
    assert(await page.locator('#home').isVisible());
    assert.equal(await page.evaluate(()=>document.activeElement.id),'home-adventure');
    await page.locator('#home-adventure').click();await page.locator('#route-films').click();
    await page.locator('[data-reel=opening]').click();await page.locator('#story-next:enabled').waitFor();
    assert(await page.evaluate(()=>!!window.DispatchFilm && !window.DispatchRun));
    await page.locator('#story-map').click();await page.keyboard.press('Escape');
    const yard='**/yard-art.js*';
    await page.route(yard,route=>route.abort());
    await page.locator('#dispatch-start').click();await page.locator('#story-skip').click();
    await page.locator('#dispatch-load-retry').waitFor();await page.unroute(yard);await page.locator('#dispatch-load-retry').click();
    await page.locator('#dispatch-hud').waitFor();assert.equal(await page.locator('#match-stage').textContent(),'Parcel Alley');
    assert(await page.evaluate(()=>!!window.DispatchActors && !!window.DispatchView));
    // A download failure before the Cup finale must not count as starting or retrying the boss.
    const cupKey='dog-fight-3.cup.pip';
    await page.evaluate(key=>{
      let entry=YardCup.read(null);
      for(let round=0;round<3;round++){
        entry=YardCup.begin(entry,'route-save',2);
        entry=YardCup.finish(entry,{id:'route-save',retries:0,round},true,3,2200);
      }
      localStorage.setItem(key,JSON.stringify(entry));
    },cupKey);
    await page.goto(url+'?cup-final#arcade/pip');await page.route(yard,route=>route.abort(),{times:1});
    await page.locator('[data-do=cup-start]').click();
    await page.getByRole('button',{name:'Retry loading Bell Depot'}).waitFor();
    const run=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).active,cupKey);
    assert.equal((await run()).started,false);assert.equal((await run()).retries,0);
    await page.locator('[data-do=cup-start]').click();await page.locator('#dispatch-hud').waitFor();
    assert.equal((await run()).started,true);assert.equal((await run()).retries,0);
    assert.match(await page.locator('#match-mode').textContent(),/Final boss/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
}
(async()=>{
  const files=new Map();assets('docs','/new',files);assets('previous/docs','/old',files);assets('prior-release/docs','/prior',files);
  assets('before-first-press/docs','/before',files);
  const server=http.createServer((req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    const file=files.get(path.endsWith('/')?path+'index.html':path);
    if(!file){res.writeHead(404);res.end();return;}
    res.writeHead(200,file.headers);res.end(file.body);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try{
    const rows={old:[],prior:[],new:[]};
    for(const order of [['old','prior','new'],['prior','new','old'],['new','old','prior']]){
      for(const build of order)rows[build].push(await sample(browser,origin+'/'+build+'/',build));
    }
    const median=(rows,k)=>Math.round(rows.map(r=>r[k]).sort((a,b)=>a-b)[1]);
    const result=Object.fromEntries(Object.entries(rows).map(([build,r])=>[build,Object.fromEntries(
      ['ready','move','scripts','js','payload'].map(k=>[k,median(r,k)]))]));
    console.log('::notice title=Cold start::'+JSON.stringify(result));
    assert.equal(result.old.scripts-result.new.scripts,9);
    assert.equal(result.prior.scripts-result.new.scripts,1);
    assert(result.old.payload-result.new.payload>55000);
    assert(result.prior.payload-result.new.payload>24000);
    assert(result.prior.js-result.new.js>100000);
    if(rows.old[0].hash!==rows.new[0].hash)console.log('Reference-title '+rows.old[0].png);
    assert.equal(rows.old[0].hash,rows.new[0].hash,'home cover pixels');
    await recovery(browser,origin+'/new/');
    await optionalModes(browser,origin+'/new/');
    const {firstPress,timeFirstPress}=require('./first-press.js');
    await firstPress(browser,origin+'/new/');
    const timings={before:[],new:[]};
    for(const order of [['before','new'],['new','before'],['before','new']]){
      for(const build of order)timings[build].push(await timeFirstPress(browser,origin+'/'+build+'/'));
    }
    const first=Object.fromEntries(Object.entries(timings).map(([build,r])=>[build,
      Object.fromEntries(['press','ready','move'].map(k=>[k,median(r,k)]))]));
    assert(timings.before.every(r=>r.press>=r.ready),'Previous release offered Play tutorial at startup completion');
    assert(timings.new.every(r=>r.press>0 && r.move>=r.press && r.ready>0));
    console.log('::notice title=First press::'+JSON.stringify(first));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
