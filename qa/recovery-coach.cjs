const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/match-review.js');
require('../docs/recovery-coach.js');
const {Battle,FinishTape,kits,seededRandom,idleInput}=window.DogFight;
const coach=window.RecoveryCoach;

function firstMatchFilm(){
  const battle=new Battle({mode:'solo',p1:'pip',p2:'brisket',stage:'picnic',form:'original',minutes:7,
    schoolFinal:true,cpuLevel:'rookie',fetch:false},undefined,seededRandom(42));
  const tape=new FinishTape(true),left={...idleInput,x:-1};
  while(battle.end===null && tape.count<2400){
    tape.record(battle,left,idleInput);battle.step(1/60,left,idleInput);tape.captureKnockouts(battle);
  }
  assert.equal(battle.end,1);
  return {battle,tape,left,film:new window.MatchReview.MatchFilm(tape.fullMatch())};
}
test('whole-stock retries reproduce three real losses, including a stock longer than the KO clip',()=>{
  const {battle,tape,left,film}=firstMatchFilm(),last=structuredClone(battle.matchCard);
  const falls=film.data.falls.filter(f=>f.slots.includes(0));assert.equal(falls.length,3);
  assert(falls[1].at-falls[0].at>240);
  for(const [i,fall] of falls.entries()){
    const retry=new window.MatchReview.StockRetry(film,fall),p=retry.attempt(()=>{});
    assert.equal(retry.number,i+1);assert.equal(p.frame,i?falls[i-1].at:0);
    assert.equal(!!p.battle.dogs[0].stockLift,i>0);
    while(!p.outcome)p.step(left);
    assert.equal(p.outcome,'lost');assert.equal(p.frame,fall.at);
    assert.deepEqual(p.battle.matchCard,retry.original.matchCard);
    assert.equal(p.battle.random.state,retry.original.random.state);
    assert.equal(p.step(idleInput),false);assert.equal(p.frame,fall.at);
  }
  assert.deepEqual(last,battle.matchCard);
  const restored=window.MatchReview.resumeTape(structuredClone(window.MatchReview.pack(tape)),last.losses);
  const saved=new window.MatchReview.MatchFilm(restored.fullMatch());
  assert.deepEqual(saved.data.falls,film.data.falls);
  const p=new window.MatchReview.StockRetry(saved,saved.data.falls[0]).attempt(()=>{});
  while(!p.outcome)p.step(idleInput);
  assert.equal(p.outcome,'saved');assert.equal(p.frame,falls[0].at);
});

test('passing the recorded knockout in the air requires a landing and can still end in a later KO',()=>{
  const {film}=firstMatchFilm(),falls=film.data.falls.filter(f=>f.slots.includes(0));
  const first=new window.MatchReview.StockRetry(film,falls[0]),p=first.attempt(()=>{});
  while(p.frame<first.end)p.step({...idleInput,jump:p.frame===first.end-6});
  assert.equal(p.outcome,null);assert.equal(p.battle.dogs[0].ground,-1);
  while(!p.outcome)p.step(idleInput);
  assert.equal(p.outcome,'saved');assert(p.frame>first.end);assert.equal(p.battle.dogs[0].ground,0);
  const second=new window.MatchReview.StockRetry(film,falls[1]),q=second.attempt(()=>{});
  while(!q.outcome)q.step(idleInput);
  assert(q.frame>second.end);assert.equal(q.outcome,'lost');
  assert.equal(second.comparison(q).title,'Stock lost');
});

function find(tape,slot=0,follow) {
  const search=coach.search(tape,slot,follow);
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
test('an exhausted fall and a clip without the selected human fighter falling offer no landing',()=>{
  const {clip}=record({position:{x:85,y:780,vy:940,usedUp:true}});
  assert.equal(find(clip),null);
  assert.equal(find(record({mode:'local',position:{}}).clip,1),null);
  assert.equal(find(record({position:{}}).clip,1),null);
  assert(find(record({timeBattle:true,position:{}}).clip));
  assert.equal(find(new FinishTape()),null);
});

function twoSeats(slot,{timed=false, kind='noodle',followFrames=4}={}){
  const kinds=slot?['pip',kind]:[kind,'pip'];
  const b=new Battle({mode:'local',p1:kinds[0],p2:kinds[1],stage:'nightmail',fetch:false,timeBattle:timed,minutes:1},undefined,seededRandom(19));
  const tape=new FinishTape(true),history=[];
  let fallenAt=null;
  for(let n=0;n<600 && (fallenAt===null || n<fallenAt+followFrames);n++){
    // The opening idle makes the KO clip start mid-checkpoint in the rolling history.
    const mine={...idleInput,x:n<270?0:slot?1:-1};
    const rival={...idleInput,x:fallenAt===null?0:.5,shield:n%51<9,jump:n%97===30};
    const pair=slot?[rival,mine]:[mine,rival];history.push(pair);
    tape.record(b,...pair);b.step(1/60,...pair);tape.captureKnockouts(b);
    if(fallenAt===null && b.matchCard.losses.some(l=>l.slot===slot))fallenAt=n+1;
  }
  assert(fallenAt>270);
  return {b,tape,history,entry:tape.knockouts[0]};
}

for(const slot of [0,1])for(const timed of [false,true])test('P'+(slot+1)+' can recover the recorded '+(timed?'point':'stock')+' against the other seat’s inputs',()=>{
  const {b,tape,history,entry}=twoSeats(slot,{timed});
  const {tape:clip,returnTape:follow}=entry;
  const before=structuredClone(b.matchCard),plan=find(clip,slot,follow);
  assert(plan);assert.equal(plan.slot,slot);assert.equal(plan.dir,slot?-1:1);
  const original=clip.playback(clip.length).battle;
  const practice=coach.attempt(clip,plan,undefined,follow),ref=clip.playback(plan.start).battle;
  while(!practice.outcome){
    const tick=clip.count-clip.length+practice.frame;
    const input=coach.controls(plan,practice.frame-plan.start),other=history[tick]?.[1-slot] || idleInput;
    ref.step(1/60,...(slot?[other,input]:[input,other]));practice.step(input);
    assert.deepEqual(practice.battle.dogs,ref.dogs,'recorded rival at tick '+tick);
  }
  assert.equal(practice.outcome,'landed');assert.equal(practice.frame,plan.end);
  assert(practice.frame>clip.length+follow.length,'recovery continues past the last recorded input');
  if(timed){assert.equal(practice.battle.matchCard.points[slot],original.matchCard.points[slot]+1);assert.match(coach.feedback(practice,plan),/point/);}
  else assert.equal(practice.battle.dogs[slot].stocks,original.dogs[slot].stocks+1);
  assert.deepEqual(b.matchCard,before);
  const fail=coach.attempt(clip,plan,undefined,follow);
  while(!fail.outcome)fail.step(history[clip.count-clip.length+fail.frame]?.[slot] || idleInput);
  assert.equal(fail.outcome,'fell');assert.equal(fail.frame,clip.length);
  const {catalog,blocks,film}=window.MatchReview.pack(tape);
  const restored=window.MatchReview.resumeTape(structuredClone({catalog,blocks,film}),before.losses).knockouts[0];
  assert.deepEqual(find(restored.tape,slot,restored.returnTape),plan);
});

test('a simultaneous final fall ends either attempt without crediting the new round as a landing',()=>{
  const b=new Battle({mode:'local',p1:'pip',p2:'pip',stage:'nightmail',stockCount:1,fetch:false},undefined,seededRandom(8));
  const tape=new FinishTape(),deck=b.terrain[0];
  for(const [slot,f] of b.dogs.entries())Object.assign(f,{x:slot?deck.x2+50:deck.x1-50,y:deck.y+22,ground:-1,vy:250});
  while(!tape.knockouts.length && tape.count<180){tape.record(b,idleInput,idleInput);b.step(1/60);tape.captureKnockouts(b);}
  const clip=tape.knockouts[0].tape;assert.deepEqual(tape.knockouts[0].losses.map(l=>l.zone),['bottom','bottom']);
  for(const slot of [0,1]){
    const p=coach.attempt(clip,{start:0,dir:slot?-1:1,slot});
    while(!p.outcome)p.step(idleInput);
    assert.equal(p.outcome,'fell');assert.equal(p.battle.suddenDeath.cause,'double');
  }
});
