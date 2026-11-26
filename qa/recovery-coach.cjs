const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/match-review.js');
require('../docs/recovery-coach.js');
const {Battle,FinishTape,kits,seededRandom,idleInput}=window.DogFight;
const coach=window.RecoveryCoach;

function find(tape) {
  const search=coach.search(tape);
  let result;
  do {result=search.next();} while(!result.done);
  return result.value;
}
function record({kind='pip',side=-1,position,mode='solo',timeBattle=false}={}) {
  const b=new Battle({mode,cpuLevel:'rookie',stage:'picnic',p1:kind,p2:'brisket',fetch:false,timeBattle},()=>{},seededRandom(42));
  const tape=new FinishTape(true), [dog,rival]=b.dogs, deck=b.terrain[0];
  if (position) {
    const edge=side<0?deck.x1:deck.x2;
    Object.assign(dog,{x:edge+side*78,y:deck.y+44,vx:side*45,vy:115,jumps:0,coyote:0,ground:-1,face:-side},position);
    rival.x=(deck.x1+deck.x2)/2;
  }
  for(let i=0;i<600 && !tape.knockouts.length;i++){
    const input={...idleInput,x:position?0:side};
    tape.record(b,input,idleInput);b.step(1/60,input,idleInput);tape.captureKnockouts(b);
  }
  assert(tape.knockouts.length);
  return {b,tape,clip:tape.knockouts[0].tape};
}
function play(clip,plan,input) {
  const p=coach.attempt(clip,plan);
  while(!p.outcome)p.step(input(p.frame-plan.start));
  return p;
}
test('each dog uses real inputs to save a bottom knockout on both stage edges',()=>{
  for(const kind of Object.keys(kits)) for(const side of [-1,1]){
    const {b,clip}=record({kind,side,position:{}}),before=structuredClone(b.matchCard);
    const plan=find(clip);assert(plan,kind);assert.equal(plan.dir,-side);
    assert.equal(plan.upAt,0,'no air jumps available');
    const recorded=clip.playback(clip.length).battle, p=play(clip,plan,t=>coach.controls(plan,t));
    assert.equal(p.outcome,'landed');assert.equal(p.frame,plan.end);assert(p.cast);
    assert.equal(p.battle.dogs[0].stocks,recorded.dogs[0].stocks+1);assert(p.battle.dogs[0].ground>=0);
    assert.deepEqual(b.matchCard,before);
    assert.equal(p.step(idleInput),false);
    assert.equal(play(clip,plan,()=>idleInput).outcome,'fell');
  }
});
test('a full stock match records an actionable jump, and a long two-action return can finish past the original knockout',()=>{
  for(const kind of ['pip','noodle']){
    const {clip}=record({kind}),plan=find(clip);assert(plan);
    assert.equal(plan.jumpAt,0);assert.equal(plan.dir,1);
    const p=play(clip,plan,t=>coach.controls(plan,t));assert.equal(p.outcome,'landed');assert(p.jumped);
    if(kind==='noodle'){assert(plan.upAt>0);assert(p.cast);assert(plan.end>clip.length);}
    const fail=play(clip,plan,()=>({...idleInput,x:-1}));assert.equal(fail.outcome,'fell');
    assert.match(coach.feedback(fail,plan),/away from the stage/);
    assert.match(coach.instruction(plan,a=>'['+a+']'),/\[right\].*\[jump\]/);
  }
});
test('saved and suspended clips preserve the checkpoint, random state and demonstrated inputs',()=>{
  const {b:live,clip,tape}=record({kind:'noodle'}),plan=find(clip);
  const {catalog,blocks,film}=window.MatchReview.pack(tape);
  const saved=window.MatchReview.resumeTape(structuredClone({catalog,blocks,film}),live.matchCard.losses).knockouts[0].tape;
  const restored=find(saved);assert.deepEqual(restored,plan);
  const a=play(clip,plan,t=>coach.controls(plan,t)),b=play(saved,restored,t=>coach.controls(restored,t));
  assert.equal(a.battle.random.state,b.battle.random.state);
  assert.deepEqual(a.battle.dogs.map(f=>[f.x,f.y,f.damage,f.stocks]),b.battle.dogs.map(f=>[f.x,f.y,f.damage,f.stocks]));
});
test('an exhausted fall below the stage, a local fight and a timed fight offer no coached landing',()=>{
  const {clip}=record({position:{x:85,y:780,vy:940,usedUp:true}});
  assert.equal(find(clip),null);
  assert.equal(find(record({mode:'local',position:{}}).clip),null);
  assert.equal(find(record({timeBattle:true,position:{}}).clip),null);
  assert.equal(find(new FinishTape()),null);
});
