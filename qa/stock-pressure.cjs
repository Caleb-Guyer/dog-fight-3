const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');
const {Battle,kits,arenas,FinishTape,idleInput,seededRandom}=window.DogFight;
function fight(kind,extra={}){
  const events=[];
  const w=new Battle({p1:'pip',p2:kind,mode:'solo',cpuLevel:'rival',stage:'picnic',form:'flat',
    stockCount:3,fetch:false,liftOpening:true,...extra},(name,e)=>events.push({name,id:e.moveId}),seededRandom(42));
  return {w,events};
}
const tick=(w,p={})=>w.step(1/60,{...idleInput,...p},idleInput);
const first=events=>events.find(e=>['hit','block','grabCatch'].includes(e.name));
test('all four returning Rivals connect with their own down air on every arena and stage form',()=>{
  for(const kind of Object.keys(kits))for(const stage of Object.keys(arenas))for(const form of ['flat','trio','original']){
    for(const p1 of Object.keys(kits)){
      const {w,events}=fight(kind,{stage,form,p1});
      assert.deepEqual(w.dogs.map(f=>f.stocks),[3,2]);
      for(let i=0;i<55;i++)tick(w);
      assert.deepEqual(first(events),{name:'hit',id:kits[kind].air.down},[kind,p1,stage,form].join('/'));
    }
  }
});
test('the shield read commits at departure; a late block or a jump out beats the corresponding choice',()=>{
  for(const kind of Object.keys(kits))for(const choice of ['early','late','roll','jump']){
    const {w,events}=fight(kind);
    for(let n=0;n<56;n++){
      const input=choice==='early'?{shield:true}:choice==='late'?{shield:n>=28}:
        choice==='roll'?{shield:true,x:n>=28 && n<40?-1:0}:{shield:n<25,jump:n>=25 && n<45,x:n>=25?-1:0};
      tick(w,input);
    }
    const expected=choice==='early' || choice==='roll' && kind==='noodle'?{name:'grabCatch',id:kits[kind].grab}:
      choice==='late'?{name:'block',id:kits[kind].air.down}:undefined;
    assert.deepEqual(first(events),expected,kind+'/'+choice);
  }
});
test('an ordinary KO enables the read on either side; a different perch, a moving defender and lower levels rule it out',()=>{
  for(const side of [-1,1])for(const reason of ['clear','away','running','protected','back','rookie','arcade']){
    const {w}=fight('brisket',{liftOpening:false,cpuLevel:['rookie','arcade'].includes(reason)?reason:'rival'});
    const [p,r]=w.dogs;r.x=-3000;tick(w);
    assert.equal(r.stocks,2);assert(r.stockLift);
    const lift=r.stockLift;r.face=side;
    Object.assign(p,{ground:lift.landing,y:w.terrain[lift.landing].y,x:lift.x+side*(reason==='back'?-44:44)});
    for(let n=0;n<24;n++)tick(w);
    if(reason==='away')p.ground=-1;
    if(reason==='running')p.vx=320;
    if(reason==='protected')p.stockGuard=.5;
    w.cpu(1/60);assert.equal(!!w.bot.liftApproach,reason==='clear',side+'/'+reason);
  }
});
test('replaying the descent preserves the committed read, and older CPU recordings keep their original exit',()=>{
  for(const legacy of [false,true])for(const shield of [false,true]){
    const {w}=fight('noodle'), tape=new FinishTape(true),states=[];
    if(legacy)delete w.bot.liftReadEnabled;
    const state=b=>[b.bot.liftApproach?.grab,b.random.state,b.grapple?.phase,b.dogs.map(f=>[f.x,f.y,f.damage,f.stockGuard,f.attack?.moveId])];
    for(let i=0;i<75;i++){
      const input={...idleInput,shield:i<29 && shield};
      states.push(state(w));tape.record(w,input,idleInput);tick(w,input);
    }
    assert.equal(states.some(s=>s[0]!==undefined),!legacy);
    for(const n of [5,26,39,54]){
      const replay=tape.playback(n);assert.deepEqual(state(replay.battle),states[n]);
      while(replay.step()){}assert.deepEqual(state(replay.battle),state(w));
    }
  }
});
