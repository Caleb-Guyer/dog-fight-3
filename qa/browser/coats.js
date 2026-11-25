const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw new Error('Run browser and input checks on hosted Linux.');
const {chromium} = require('playwright-core');
const root = 'http://127.0.0.1:8080/';

async function test(page) {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'#solo');
  const gallery=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=240; canvas.height=200;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    function sample(kind,coat,pose){
      ctx.clearRect(0,0,240,200);
      DogArt.draw(ctx,kind,116,165,{coat,pose,phase:.55,time:.13,face:-1});
      return ctx.getImageData(0,0,240,200).data;
    }
    const changes=[];
    for(const [kind,kit] of Object.entries(DogFight.kits)){
      if(new Set(DogArt.coatNames[kind].map((_,i)=>DogArt.portrait(kind,i))).size!==4)throw Error(kind+' portraits');
      for(const pose of ['idle','run','ledge',kit.ground[0],kit.air.forward,kit.throws.up]){
        const frames=[0,1,2,3].map(i=>sample(kind,i,pose));
        for(let a=0;a<3;a++)for(let b=a+1;b<4;b++){
          let diff=0,area=0;
          for(let i=0;i<frames[a].length;i+=4){
            if(frames[a][i+3]!==frames[b][i+3])throw Error('Changed silhouette '+kind+' '+pose);
            if(!frames[a][i+3])continue;
            area++;
            if(frames[a][i]!==frames[b][i] || frames[a][i+1]!==frames[b][i+1] || frames[a][i+2]!==frames[b][i+2])diff++;
          }
          changes.push(diff/area);
        }
      }
    }
    return Math.min(...changes);
  });
  assert(gallery>.15,'each coat reads across at least 15% of every tested pose: '+gallery);
  await page.locator('[data-mode=local]').click();
  await page.locator('[data-index="1"]').click();await page.locator('[data-kind=pip]').click();
  await page.locator('#lobby-coat').click();
  assert.equal(await page.locator('[data-coat][aria-pressed=true] strong').textContent(),'Tuxedo');
  assert.match(await page.locator('[data-coat="0"]').textContent(),/Swap with P1/);
  await page.locator('[data-coat="0"]').click();
  await page.locator('[data-index="0"]').click();await page.locator('#lobby-coat').click();
  assert.equal(await page.locator('[data-coat][aria-pressed=true] strong').textContent(),'Tuxedo');
  await page.locator('[data-coat="2"]').click();
  await page.reload();
  assert.match(await page.locator('#preview').getAttribute('aria-label'),/Copper Pip and Honey patch Pip/);
  await page.locator('[data-mode=local]').click();
  await page.evaluate(()=>{
    const art=DogArt;
    window.seen=new Set();
    window.DogArt={...art,draw(ctx,kind,x,y,opts){
      if(ctx.canvas.id==='game')window.seen.add(kind+'/'+opts.coat);
      return art.draw(ctx,kind,x,y,opts);
    }};
  });
  await page.locator('#start').click();
  await page.waitForFunction(()=>seen.has('pip/0') && seen.has('pip/2'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.hud-portrait img')].every((el,i)=>el.src===DogArt.portrait('pip',i?0:2)));
  await page.goto(root+'?mirror#solo/mirror');
  await page.waitForFunction(()=>document.querySelectorAll('.hud-portrait img').length===2 &&
    [...document.querySelectorAll('.hud-portrait img')].every((el,i)=>el.src===DogArt.portrait('pip',i)));
  assert.deepEqual(errors,[]);
}
async function main(){
  const browser=await chromium.launch({executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),headless:true});
  try{await test(await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}));}
  finally{await browser.close();}
}
main().catch(e=>{console.error(e);console.log('::error::'+String(e.stack).replaceAll('\n','%0A'));process.exitCode=1;});
