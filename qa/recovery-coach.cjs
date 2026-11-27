const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/match-review.js');
require('../docs/recovery-coach.js');
require('../docs/fight-school.js');
const {Battle,FinishTape,kits,seededRandom,idleInput}=window.DogFight;
const coach=window.RecoveryCoach;

function landingRoute(clip,launch){
  const search=coach.searchLaunch(clip.tape,launch,clip.returnTape);
  let next;
  do{next=search.next();}while(!next.done);
  return next.value;
}
for(const wide of [false,true])test('a real '+(wide?'edge':'perch')+' throw gets a playable return beyond the original knockout',()=>{
  const {clip,battle,launch}=coach.example(wide,true), plan=landingRoute(clip,launch);
  assert.equal(plan.start,launch.frame-1);assert(plan.end>clip.tape.length);
  assert.equal(clip.losses[0].zone,wide?'left':'top');
  const active=structuredClone(battle.matchCard), seed=battle.random.state;
  for(const good of [false,true]){
    const trial=coach.attempt(clip.tape,plan,undefined,clip.returnTape);
    const gate=input=>coach.gate(plan,trial.frame-plan.start,input,a=>a,trial.battle.dogs[plan.slot]);
    assert.match(gate(idleInput),/Steer the launch/);
    while(!trial.outcome){
      const t=trial.frame-plan.start, input=coach.controls(plan,t);
      if(t===(wide?plan.upAt:plan.dodgeAt))assert.match(gate(idleInput),wide?/special/:/down.*shield/);
      assert.equal(gate(input),'');
      trial.step(good?input:idleInput);
    }
    assert.equal(trial.outcome,good?'landed':'fell');
    assert.equal(trial.battle.dogs[0].stocks,good?3:2);
    if(good){assert.equal(trial.frame,plan.end);assert(wide?trial.cast:trial.dodged);}
  }
  assert.deepEqual(battle.matchCard,active);assert.equal(battle.random.state,seed);
});
for(const damage of [105,125])test('P2 recovery at '+damage+'% only offers a route when the landing was verified',()=>{
  const b=new Battle({mode:'local',p1:'brisket',p2:'pip',stage:'nightmail',form:'trio',stockCount:3,fetch:false},undefined,seededRandom(31));
  const [brisket,pip]=b.dogs, y=b.terrain[3].y;
  Object.assign(brisket,{x:600,y,ground:3,face:1});Object.assign(pip,{x:644,y,ground:3,face:-1,damage});
  const tape=new FinishTape(true);let launch,exit;
  b.emit=(name,e)=>{if(name==='launchDI' && e.f.index===1)launch={slot:1,frame:tape.count};};
  for(let tick=0;tick<240 && (exit===undefined || tick<exit+95);tick++){
    const guard=exit===undefined?{...idleInput,grab:tick===0,y:b.grapple?.phase==='hold'?-1:0}:{...idleInput,x:.4};
    tape.record(b,guard,idleInput);b.step(1/60,guard,idleInput);tape.captureKnockouts(b);
    if(tape.knockouts.length && exit===undefined)exit=tick;
  }
  const clip=tape.knockouts[0], plan=landingRoute(clip,launch);
  if(damage===125){assert.equal(plan,null);return;}
  assert.equal(plan.slot,1);
  const practice=coach.attempt(clip.tape,plan,undefined,clip.returnTape);
  while(!practice.outcome)practice.step(coach.controls(plan,practice.frame-plan.start));
  assert.equal(practice.outcome,'landed');assert.equal(practice.battle.dogs[1].stocks,3);
  assert.deepEqual(clip.losses,b.matchCard.losses.slice(0,1));assert.equal(b.dogs[1].stocks,2);
});

for(const kind of Object.keys(kits))test(kind+' saves exhausted low and wide falls from either edge and either seat',()=>{
  for(const slot of [0,1])for(const side of ['left','right'])for(const wide of [false,true]){
    const battle=new Battle({mode:'local',p1:slot?'brisket':kind,p2:slot?kind:'brisket',stage:'picnic',fetch:false},undefined,seededRandom(42));
    battle.placeLastDodge(side,wide,slot);
    const tape=new FinishTape(true);
    while(!tape.knockouts.length && tape.count<90){
      tape.record(battle,idleInput,idleInput);battle.step(1/60,idleInput,idleInput);tape.captureKnockouts(battle);
    }
    const clip=tape.knockouts[0].tape,plan=find(clip,slot),label=k=>k;
    assert(plan?.dodge && (wide?!plan.dodge.y:plan.dodge.y<0),kind+'/'+slot+'/'+side+'/'+wide);
    const good=coach.controls(plan,0),wrong={...good,y:wide?-1:0};
    assert(coach.gate(plan,0,wrong,label));assert.equal(coach.gate(plan,0,good,label),'');
    const landed=coach.attempt(clip,plan),miss=coach.attempt(clip,plan);
    while(!landed.outcome)landed.step(coach.controls(plan,landed.frame-plan.start));
    while(!miss.outcome)miss.step(miss.frame===plan.start?wrong:{...idleInput,x:plan.dir});
    assert(landed.dodged && landed.caught);assert.equal(landed.outcome,'landed');
    assert.equal(landed.battle.dogs[slot].stocks,3);assert.equal(miss.outcome,'fell');
  }
});
test('projecting an immediate dodge for Fight School keeps the actual stock, clock and opponent intact',()=>{
  const cfg={mode:'solo',schoolFinal:true,p1:'pip',p2:'brisket',stage:'picnic',cpuLevel:'rookie',fetch:false};
  for(const wide of [false,true]){
    const w=new Battle(cfg,undefined,seededRandom(42)),side=wide?'right':'left';
    w.placeLastDodge(side,wide,0);
    const corner=new window.FightSchool.Corner('return'),cue=corner.read(w);
    assert.equal(cue,wide?'across/left':'slant/right');assert.equal(corner.practice,'air-lastDodge');
    const snapshot=b=>[b.matchFrames,b.clockFrames,b.random.state,b.dogs.map(f=>[f.x,f.y,f.stocks,f.usedDodge]),b.matchCard.losses.length];
    const before=snapshot(w),{clip}=coach.recordFall(w);
    assert.equal(clip.losses[0].slot,0);assert.deepEqual(snapshot(w),before);
    const demo=coach.example(wide),plan=find(demo.clip.tape);
    const result=play(demo.clip.tape,plan,n=>coach.controls(plan,n));
    assert.equal(result.outcome,'landed');assert.equal(demo.battle.dogs[0].stocks,2);
    assert.match(coach.instruction(plan,k=>'['+k+']'),wide?/\[left\].*\[shield\]/:/\[up\].*\[right\].*\[shield\]/);
    w.dogs[0].usedDodge=true;assert.equal(corner.read(w),'drift/'+(wide?'left':'right'));
  }
});
test('a guarded ledge requires a second Shield press after the dodge, while a normal climb loses the stock',()=>{
  const w=new Battle({mode:'solo',p1:'pip',p2:'brisket',stage:'picnic',cpuLevel:'rookie',fetch:false},undefined,seededRandom(42));
  w.placeLastDodge('left',false,0);w.step(1/60,idleInput,idleInput);
  const {clip}=coach.recordFall(w), plan=find(clip.tape);
  assert(plan.rollAt>1);
  const held={...idleInput,shield:true,x:1,y:-1};
  assert.match(coach.gate(plan,1,held,k=>k),/Release shield/);
  assert.match(coach.gate(plan,plan.rollAt,idleInput,k=>k,{ledge:{left:true},prev:idleInput}),/shield.*Roll/);
  const saved=play(clip.tape,plan,n=>coach.controls(plan,n));
  assert(saved.rolled && saved.outcome==='landed');
  const climbed=play(clip.tape,plan,n=>n===plan.rollAt?{...idleInput,x:1}:coach.controls(plan,n));
  assert(climbed.caught && !climbed.rolled && climbed.outcome==='fell');
});

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
for(const [kind,technique,observed] of [['pip','double','secondHop'],['brisket','cannon','charged'],['noodle','lasso','hooked'],['clover','sail','folded']]){
  test(kind+' saves its clinic fall on both sides and the same position in a recorded P2 stock',()=>{
    for(const right of [false,true]){
      const {clip}=coach.example(right,false,kind),start=clip.tape.playback().battle;
      const b=new Battle({mode:'local',stage:'picnic',p1:start.dogs[1].kind,p2:kind,fetch:false},undefined,seededRandom(42));
      const source=start.dogs[0];
      for(const field of ['x','y','vx','vy','ground','jumps','coyote','face'])b.dogs[1][field]=source[field];
      b.dogs[0].x=600;
      const tape=new FinishTape(true);
      for(let t=0;t<150 && !tape.knockouts.length;t++){tape.record(b,idleInput,idleInput);b.step(1/60,idleInput,idleInput);tape.captureKnockouts(b);}
      for(const [slot,recording] of [[0,clip.tape],[1,tape.knockouts[0].tape]]){
        const plan=find(recording,slot);assert.equal(plan.technique,technique);assert.equal(plan.dir,right?-1:1);
        const original=recording.playback(recording.length).battle.matchCard;
        const trial=coach.attempt(recording,plan);
        while(!trial.outcome){
          const t=trial.frame-plan.start,good=coach.controls(plan,t),gate=i=>coach.gate(plan,t,i,x=>x,trial.battle.dogs[slot]);
          assert.equal(gate(good),'');
          if(t===plan.releaseAt)assert.match(gate({...good,special:true}),/Release special/);
          if(plan.secondAt!==undefined && t===plan.upAt+1)assert.match(gate({...good,special:true}),/Release special/);
          if(t===plan.secondAt)assert.match(gate({...good,special:false,tapped:{}}),/up.*special/);
          trial.step(good);
        }
        assert(trial[observed]);assert.equal(trial.outcome,'landed');assert.equal(trial.frame,plan.end);
        const missed=play(recording,plan,t=>t===0 && kind!=='noodle'?coach.controls(plan,0):{...idleInput,x:plan.dir});
        assert.equal(missed.outcome,'fell');assert.equal(original.losses.at(-1).slot,slot);
        assert.deepEqual(recording.playback(recording.length).battle.matchCard,original);
      }
    }
  });
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
