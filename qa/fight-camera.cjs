const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/fight-camera.js');
const {Battle,seededRandom}=window.DogFight;
const make=(options={})=>new Battle({mode:'solo',stage:'nightmail',p1:'pip',p2:'brisket',minutes:7,
  runoffTrump:'left',...options},undefined,seededRandom(42));
const camera=()=>({cx:600,cy:337.5,zoom:1,pixelRatio:720/390,fixed:false,finishReturn:0});
const frame=(v,w,width=720,height=1184,snap=true)=>window.FightCamera.frame(v,width,height,1/60,w,snap,null,false);
function visible(v,width,height,x,y){
  assert(Math.abs(x-v.cx)*v.zoom<width/2 && Math.abs(y-v.cy)*v.zoom<height/2,
    JSON.stringify({v,x,y,width,height}));
}
function checkDogs(v,w,width,height){
  for(const f of w.dogs){
    visible(v,width,height,f.x-f.stats.width,f.y-f.stats.height-34);
    visible(v,width,height,f.x+f.stats.width,f.y+6);
  }
}
test('each fighter and either contested landing fit together on phones and wide displays',()=>{
  for(const [p1,p2] of [['pip','brisket'],['clover','noodle']])for(const side of ['left','right']){
    for(const [width,height] of [[720,1184],[1200,675],[2000,720]]){
      const w=make({p1,p2,runoffTrump:side}),v=camera(),edge=w.dogs[0].ledge;
      frame(v,w,width,height);checkDogs(v,w,width,height);
      visible(v,width,height,edge.x+(side==='left'?1:-1)*96,edge.y);
      assert(v.zoom>1.2);
      const still={...v};frame(v,w,width,height,false);assert.deepEqual(v,still);
    }
  }
});
test('interior Laundry Line ledges frame the correct landing deck',()=>{
  const w=make({stage:'laundry'}),v=camera();
  for(const i of [0,1]){
    const p=w.terrain[i],lip=i?p.x1:p.x2,inside=i?1:-1;
    Object.assign(w.dogs[0],{x:lip-inside*15,y:p.y+53,ground:-1});
    Object.assign(w.dogs[1],{x:lip+inside*38,y:p.y,ground:i});
    frame(v,w);assert(Math.abs(v.cx-lip)<85);visible(v,720,1184,lip+inside*96,p.y);checkDogs(v,w,720,1184);
  }
});
test('a sudden separation fits immediately and a return to close range zooms in gradually',()=>{
  const w=make(),v=camera();frame(v,w);const close=v.zoom,b=w.dogs[1],start=b.x;
  b.x=965;b.y=90;b.vx=800;b.vy=-500;frame(v,w,720,1184,false);
  const far=v.zoom;assert(far<close*.6);checkDogs(v,w,720,1184);
  Object.assign(b,{x:start,y:455,vx:0,vy:0});frame(v,w,720,1184,false);
  assert(v.zoom>far && v.zoom<close-.5);checkDogs(v,w,720,1184);
});
test('wide preference, lost stocks and distant launches use the full-stage view',()=>{
  for(const mode of ['fixed','out','blast']){
    const v=camera(),w=make();if(mode==='fixed')v.fixed=true;
    if(mode==='out')w.dogs[0].stocks=0;if(mode==='blast')w.dogs[0].x=-142;
    frame(v,w);assert.equal(v.zoom,.6);assert.equal(v.cx,600);
  }
});
test('survival practice retains its dedicated lip-to-blast-line view',()=>{
  const w=make(),v=camera(),p=w.terrain[0];w.survivalPractice={dir:-1,ground:0,lip:p.x1};
  frame(v,w);visible(v,720,1184,-115,p.y);visible(v,720,1184,p.x1+180,p.y);
  const prior={...v};v.fixed=true;frame(v,w);assert.equal(v.zoom,prior.zoom);assert.equal(v.cx,prior.cx);
});
