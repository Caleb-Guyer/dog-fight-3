const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/stock-call.js');
const {Battle,idleInput,seededRandom,FinishTape}=window.DogFight;
const create=(cfg={},emit)=>new Battle({mode:'local',stage:'picnic',p1:'pip',p2:'brisket',minutes:7,fetch:false,...cfg},emit,seededRandom(31));
const tick=w=>w.step(1/60,idleInput,idleInput);
test('the unscripted high-platform throw records the losing dog and before/after replay frames',()=>{
  const calls=[],battle=create({mode:'solo',stage:'nightmail',form:'trio',cpuLevel:'rival',throwOpening:'perch',coats:[2,3]},
    (name,e)=>{if(name==='ringOutScore')calls.push(structuredClone(e));}),tape=new FinishTape();
  while(!calls.length && tape.count<250){tape.record(battle,idleInput,idleInput);tick(battle);}
  assert.equal(calls.length,1);const c=calls[0];
  assert.equal(c.exits[0].zone,'top');assert.equal(c.exits[0].coat,2);assert.deepEqual(c.score,[2,3]);
  assert.match(window.StockCall.describe(c),/P1 Pip out at the top blast line.*P1 2, P2 3/);
  assert.equal(tape.playback(tape.length-1).battle.stockCall,null);
  assert.deepEqual(tape.playback(tape.length).battle.stockCall,c);
  for(let i=0;i<72;i++)tick(battle);
  assert.equal(battle.stockCall,null);
});
test('both outgoing relay dogs get the same score before replacement fighters spawn',()=>{
  const w=create({p2:'noodle',relayTeams:[['pip','clover','noodle'],['noodle','pip','brisket']],
    coatBook:[{pip:2,clover:1,noodle:0},{noodle:3,pip:2,brisket:1}]});
  w.dogs[0].x=-300;w.dogs[1].x=1640;tick(w);
  assert.deepEqual(w.stockCall.exits.map(d=>[d.zone,d.kind,d.coat]),[['left','pip',2],['right','noodle',3]]);
  assert.deepEqual(w.stockCall.score,[2,2]);assert.deepEqual(w.dogs.map(f=>f.kind),['clover','pip']);
});
test('a double final KO displays its 0–0 score during the sudden-death introduction and expires before GO',()=>{
  const w=create({stockCount:1});
  w.dogs[0].x=-200;w.dogs[1].x=1600;tick(w);
  assert.deepEqual(w.stockCall.score,[0,0]);assert.equal(w.suddenDeath.round,1);
  for(let i=0;i<72;i++)tick(w);
  assert.equal(w.stockCall,null);assert(w.suddenDeath.intro>0);
});
test('Time Battle distinguishes a credited fall and a self-destruct with signed scores',()=>{
  const w=create({timeBattle:true});
  w.dealDamage(w.dogs[1],18,false,'pipJab');w.dogs[1].x=2000;tick(w);
  assert(w.stockCall.points && w.stockCall.exits[0].credited);assert.deepEqual(w.stockCall.score,[1,-1]);
  const f=w.dogs[0];Object.assign(f,{y:1000,ground:-1});tick(w);
  assert.equal(w.stockCall.exits[0].zone,'bottom');assert.equal(w.stockCall.exits[0].credited,false);
  assert.deepEqual(w.stockCall.score,[0,-1]);
});
test('rollback from a predicted elimination clears the presentation with the discarded stock',()=>{
  const actual=create(),predicted=create();predicted.dogs[0].x=-200;tick(predicted);
  assert(predicted.stockCall);tick(actual);predicted.copyFightFrom(actual);
  assert.equal(predicted.stockCall,null);
  actual.dogs[1].x=1600;tick(actual);predicted.copyFightFrom(actual);
  assert.deepEqual(predicted.stockCall,actual.stockCall);
});

test('lead calls distinguish taking, keeping and tying the lead on signed points',()=>{
  const describe=(points,score,exits,solo=false)=>window.StockCall.describe({points,score,
    exits:exits.map(([slot,credited])=>({slot,credited,kind:slot?'pip':'brisket',zone:'right'}))},solo);
  assert.match(describe(true,[0,1],[[0,true]],true),/CPU takes the lead\.$/); // P1 led 1–0 before the hit.
  assert.match(describe(true,[-1,0],[[0,false]]),/P2 takes the lead\.$/);
  assert.match(describe(true,[-1,-1],[[0,false]]),/All square\.$/);
  assert.match(describe(true,[3,-2],[[0,true]]),/P1 leads\.$/);
  assert.match(describe(true,[0,0],[[0,true],[1,true]]),/Still tied\.$/);
  assert.match(describe(false,[1,1],[[1]]),/Last stock each\.$/);
  assert.match(describe(false,[0,1],[[0]],true),/CPU wins\.$/);
  assert.match(describe(false,[0,0],[[0],[1]]),/Sudden Death\.$/);
});
