const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
const {Battle,kits,idleInput,seededRandom}=window.DogFight;
const dt=1/60;
function chase(kind,rival,reply,seed=9,control=()=>({}),damage=60){
  const launches=[];
  const battle=new Battle({mode:'training',p1:kind,p2:rival,stage:'nightmail',fetch:false},
    (name,e)=>{if(name==='launchDI')launches.push(e);},seededRandom(seed));
  battle.setDummyDamage(damage);battle.resetComboPractice('throwChase',reply,false);
  for(let i=0;i<40;i++)battle.step(dt,{...idleInput,x:1,jump:true});
  assert.equal(battle.comboPractice.phase,'ready');assert.equal(battle.comboPractice.tick,0);
  for(let n=0;n<220 && battle.comboPractice.phase!=='done';n++){
    const input=control(n);
    battle.step(dt,{...idleInput,...input,attack:n===0 || !!input.attack});
  }
  return {battle,d: battle.comboPractice,launches};
}
test('every dog uses its real up throw and identical pre-DI launch for both steering choices',()=>{
  for(const p1 of Object.keys(kits))for(const p2 of Object.keys(kits)){
    const [left,right]=['diIn','diOut'].map(r=>chase(p1,p2,r,9,()=>({}),95));
    for(const run of [left,right]){
      assert.equal(run.d.outcome,'landed');assert.equal(run.d.contacts[1].moveId,kits[p1].throws.up);
      assert.equal(run.launches.length,1);assert.equal(run.d.shifts,0);
    }
    assert.deepEqual(left.launches[0].raw,right.launches[0].raw);
    assert(left.launches[0].velocity.x<right.launches[0].velocity.x);
  }
});
test('a light throw below the tumble threshold keeps its ordinary launch',()=>{
  const [a,b]=['diIn','diOut'].map(r=>chase('pip','brisket',r));
  assert.equal(a.d.launchRead,undefined);assert.equal(b.d.launchRead,undefined);
  assert.equal(a.launches.length,0);assert.equal(a.d.outcome,'landed');
  assert.deepEqual(a.battle.dogs.map(f=>[f.x,f.y,f.damage]),b.battle.dogs.map(f=>[f.x,f.y,f.damage]));
});
test('mixed DI is reproducible from the same seed and can launch to either side',()=>{
  const sides=new Set();
  for(const seed of [13,29,45,71,91,132,229,555,812]){
    const a=chase('brisket','pip','diMix',seed),b=chase('brisket','pip','diMix',seed);
    assert.equal(a.d.launchRead,b.d.launchRead);assert.deepEqual(a.launches[0].velocity,b.launches[0].velocity);
    sides.add(a.d.launchRead);
  }
  assert.equal(sides.size,2);
});
test('following the throw lets Crown Lift catch either route, and a new Attack retries at the saved damage',()=>{
  for(const [reply,dir,strike] of [['diIn',-1,88],['diOut',1,98]]){
    const plan=x=>n=>({x:n>=38?x:0,jump:n>=44 && n<56,y:n===strike?-1:0,attack:n===strike});
    const {battle,d}=chase('brisket','pip',reply,9,plan(dir));
    assert.equal(d.outcome,'caught');assert.equal(d.followup,'brisketCrownLift');
    assert.equal(chase('brisket','pip',reply,9,plan(-dir)).d.outcome,'landed');
    const end=battle.time;battle.step(dt,idleInput);assert.equal(battle.time,end);
    battle.step(dt,{...idleInput,attack:true});assert.equal(battle.comboPractice.phase,'active');
    assert.equal(battle.dogs[1].damage,60);assert.equal(battle.comboPractice.launchRead,undefined);
  }
});
