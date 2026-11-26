const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
require('../docs/match-review.js');
global.document={currentScript:{src:'https://example.test/finish-tools.js'}};
require('../docs/finish-tools.js');
const {Battle,FinishTape,seededRandom,idleInput}=window.DogFight;
const dt=1/60;
function state({emit,random,...fields}) { return {fields,seed:random.state}; }
function archive(tape) {
  const {catalog,blocks}=structuredClone(window.MatchReview.pack(tape));
  const restore=span=>window.MatchReview.restore(span,[...blocks].filter(([start])=>start>=span.start && start<span.count)
    .sort(([a],[b])=>a-b).map(([,b])=>b));
  return {catalog,blocks,restore};
}

test('saved finish and knockout windows share blocks while preserving simultaneous losses and exact boundary frames',()=>{
  const w=new Battle({mode:'local',stage:'picnic',p1:'pip',p2:'brisket'},undefined,seededRandom(71));
  const tape=new FinishTape();
  for(const dog of w.dogs)Object.assign(dog,{ground:-1,y:w.terrain[0].y+900});
  for(let i=0;i<360;i++){
    tape.record(w,idleInput,idleInput);w.step(dt,idleInput,idleInput);
  }
  tape.captureKnockouts(w);
  const {catalog,blocks,restore}=archive(tape);
  assert.equal(catalog.knockouts.length,1);
  assert.equal(catalog.knockouts[0].losses,2);
  const ko=tape.knockouts[0].tape, saved=restore(catalog.knockouts[0]);
  assert(blocks.size<ko.blocks.length+tape.blocks.length);
  for(const n of [0,ko.length])assert.deepEqual(state(saved.playback(n).battle),state(ko.playback(n).battle));
  assert.deepEqual(state(restore(catalog.finish).playback(tape.length).battle),state(w));
  assert.throws(()=>window.MatchReview.restore(catalog.finish,[]));
});

test('both delayed peers can revisit the same confirmed non-final knockout after the replay ring rolls over',()=>{
  const queues=[[],[]],worlds=[],tapes=[new FinishTape(),new FinishTape()];
  const peers=tapes.map((tape,i)=>{
    const session=new window.DogOnline.OnlineSession({start(cfg,rng){worlds[i]=new Battle(cfg,undefined,rng);}});
    session.side=i;session.send=p=>{if(p[0]==='input')queues[1-i].push(p);};
    session.beginRound(['start',1,'pip','clover','picnic',22]);
    session.match.onConfirmedInput=(world,a,b)=>tape.record(world,a,b);
    return session.match;
  });
  const deliver=i=>{for(const p of queues[i].splice(0))assert(peers[i].receive(p[2],p[3]));};
  for(let n=0;n<700;n++){
    if(n%7===0){deliver(0);deliver(1);}
    peers.forEach((p,i)=>{
      p.tick(()=>({...idleInput,x:i===0 && n<160?-1:0}),worlds[i]);
      assert(tapes[i].knockouts.length<=p.confirmedWorld.matchCard.losses.length);
    });
  }
  peers.forEach((p,i)=>{deliver(i);p.confirm(worlds[i]);tapes[i].captureKnockouts(p.confirmedWorld);});
  assert.equal(tapes[0].knockouts.length,1);assert.equal(tapes[1].knockouts.length,1);
  const [a,b]=tapes.map(t=>t.knockouts[0]);
  assert.deepEqual(a.losses,b.losses);assert.equal(a.losses[0].remaining,2);
  assert.equal(a.returnTape.length,240);
  for(const n of [0,24,143,240])assert.deepEqual(state(a.returnTape.playback(n).battle),state(b.returnTape.playback(n).battle));
  assert(a.tape.count<tapes[0].count-240);
  for(let n=1;n<=a.tape.length;n++){
    for(const slot of [0,1])assert.deepEqual(window.FinishTools.inputFrame(a.tape,n,slot),window.FinishTools.inputFrame(b.tape,n,slot));
  }
  assert(Array.from({length:a.tape.length},(_,i)=>window.FinishTools.inputFrame(a.tape,i+1,0).movement).includes('Left 100%'));
  for(const offset of [0,8,a.tape.length])assert.deepEqual(state(a.tape.playback(offset).battle),state(b.tape.playback(offset).battle));
  const live=peers.map(p=>structuredClone(state(p.confirmedWorld)));
  for(const c of [a,b]){
    const fork=c.tape.playback(0,undefined,0);while(fork.step(idleInput)){}
    assert.equal(fork.battle.dogs[0].stocks,3);
  }
  peers.forEach((p,i)=>assert.deepEqual(state(p.confirmedWorld),live[i]));
});

test('both delayed peers can replay a pummel, escape the hold early, and reopen the same grab from the archive',()=>{
  const peers=[0,1].map(side=>{
    const tape=new FinishTape(),packets=[];let world;
    const s=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
    s.side=side;s.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
    s.beginRound(['start',1,'pip','brisket','nightmail',7]);
    for(const w of [world,s.match.confirmedWorld])w.resetTraining();
    s.match.onConfirmedInput=(w,a,b)=>tape.record(w,a,b);
    return {tape,world,net:s.match,packets};
  });
  for(let n=0;n<90;n++)for(const [side,p] of peers.entries()){
    if(n>=6)assert(p.net.receive(n-6,peers[1-side].packets[n-6]));
    p.net.tick(()=>side?{...idleInput,grab:n===1,attack:n===18,y:n===52?-1:0}:idleInput,p.world);
  }
  const review=peers.map((p,side)=>{
    for(let n=p.net.received;n<peers[1-side].packets.length;n++)assert(p.net.receive(n,peers[1-side].packets[n]));
    p.net.confirm(p.world);
    const saved=archive(p.tape),restored=saved.restore(saved.catalog.finish),tools=window.FinishTools;
    const [hold]=tools.analyze(restored).holds;assert.equal(hold.slot,0);
    const replies=['recorded','alternate'].map(action=>tools.holdPreview(restored,hold,action));
    assert.match(replies[0].text,/Throw committed/);assert.equal(replies[1].text,'Escaped the grab');
    assert.deepEqual(restored.playback(restored.length).battle.dogs,p.net.confirmedWorld.dogs);
    return {hold,replies};
  });
  assert.deepEqual(review[0],review[1]);
});
test('the return begins on the knockout frame and every saved checkpoint reproduces both dogs',()=>{
  const w=new Battle({mode:'solo',p1:'pip',p2:'brisket',stage:'nightmail',form:'trio',cpuLevel:'rival',throwOpening:'perch'},undefined,seededRandom(42));
  const t=new FinishTape(),frames=[];
  for(let i=0;i<560;i++){
    t.record(w,idleInput,idleInput);w.step(dt,idleInput,idleInput);
    if(w.matchCard.losses.length===1 && frames.length<=240)frames.push(structuredClone(state(w)));
  }
  const ko=t.knockouts[0],f=ko.returnTape,store=archive(t),span=store.catalog.knockouts[0].follow,saved=store.restore(span);
  assert.equal(f.from,ko.tape.count);assert.equal(f.length,240);assert.equal(saved.length,240);
  assert.deepEqual(state(saved.playback(0).battle),state(ko.tape.playback(ko.tape.length).battle));
  for(const n of [0,1,24,119,120,144,239,240])assert.deepEqual(state(saved.playback(n).battle),frames[n]);
  for(const b of f.blocks)assert(store.blocks.has(b.start));
  assert.throws(()=>store.restore({...span,from:span.count}));
});
test('a return takeover compares a real jump against an automatic drop and leaves the original recording alone',()=>{
  const w=new Battle({mode:'local',p1:'pip',p2:'brisket',stage:'nightmail'},undefined,seededRandom(42));
  w.dogs[0].x=-400;const t=new FinishTape();
  for(let i=0;i<270;i++){t.record(w,idleInput,idleInput);w.step(dt,idleInput,idleInput);}
  const ko=t.knockouts[0],f=ko.returnTape,tools=window.FinishTools;
  const before=structuredClone(state(f.playback(f.length).battle));
  const recorded=tools.returnTrace(),edited=tools.returnTrace();tools.analyze(f,0,recorded);
  const branch=f.playback(0,(name,e)=>edited.observe(name,e,branch.frame+1),0);
  while(branch.frame<branch.length)branch.step(branch.frame===24?{...idleInput,jump:true}:idleInput);
  assert.equal(recorded.exits[0].option,'auto');assert.equal(recorded.exits[0].protection,24);
  assert.equal(edited.exits[0].option,'jump');assert(edited.exits[0].protection>=95);
  assert(recorded.marks.some(m=>m.label.includes('Protection ended')));
  assert.match(tools.returnComparison(recorded,edited,ko.losses,['Pip','Brisket']),/Automatic drop.*Jump on frame.*24 frames.*9[56] frames/);
  assert.deepEqual(state(f.playback(f.length).battle),before);
});
test('the next knockout seals a partial return and a match-ending fall starts no new clip',()=>{
  const w=new Battle({mode:'local',stockCount:2,p1:'pip',p2:'brisket',stage:'picnic'},undefined,seededRandom(3)),t=new FinishTape();
  w.dogs[0].x=-400;
  for(let i=0;i<30;i++){
    if(i===13)w.dogs[1].x=1600;
    t.record(w,idleInput,idleInput);w.step(dt,idleInput,idleInput);
  }
  const first=t.knockouts[0],second=t.knockouts[1];
  assert.equal(first.returnTape.count,second.tape.count);assert(first.returnTape.length<24);
  w.knockouts([w.dogs[0]]);t.captureKnockouts(w);
  assert.notEqual(w.end,null);assert.equal(t.knockouts.at(-1).returnTape,undefined);
  assert.equal(t.returning,null);
});

for(const mode of ['local','solo']) test(mode+' can seek or replay the final 240 ticks exactly',()=>{
  const cfg={mode,p1:'clover',p2:'noodle',stage:'canal',form:'original',fetch:true,coats:[2,1]};
  const battle=new Battle(cfg,undefined,seededRandom(75)), tape=new FinishTape(), expected=new Map();
  const input={...idleInput,tapped:{special:false}};
  for(let n=0;n<739;n++){
    input.x=n%120<60?.5:-.5;input.special=input.tapped.special=n%87===0;input.jump=n%73===0;
    const second={...idleInput,x:-input.x,attack:n%13===0};
    tape.record(battle,input,second);
    battle.step(dt,{...input,tapped:{...input.tapped}},second);
    if([499,500,517,600,738,739].includes(n+1)) expected.set(n+1,structuredClone(state(battle)));
  }
  assert.equal(tape.length,240);assert(tape.blocks.length<=3);
  const original=structuredClone(state(battle));
  for(const offset of [0,1,18,101,239,240]){
    const player=tape.playback(offset);
    assert.deepEqual(state(player.battle),expected.get(499+offset));
    while(player.step()) {}
    assert.deepEqual(state(player.battle),original);
  }
  const practice=tape.playback(1);
  practice.battle.dogs[0].stocks=0;
  assert.deepEqual(state(battle),original);
});

test('a new tape keeps shared grip references, releases, coats and a clock finish',()=>{
  const battle=new Battle({mode:'local',stage:'picnic',p1:'brisket',p2:'clover',coats:[3,2]},undefined,seededRandom(7));
  Object.assign(battle.dogs[0],{x:600,face:1});
  Object.assign(battle.dogs[1],{x:661,face:-1});
  battle.step(dt,{...idleInput,grab:true},idleInput);
  for(let n=0;n<50 && battle.grapple?.phase!=='hold';n++) battle.step(dt,idleInput,idleInput);
  assert.equal(battle.grapple.phase,'hold');
  battle.clockFrames=75;battle.dogs[1].stocks=2;
  const tape=new FinishTape();assert.equal(tape.playback(),null);
  for(let n=0;n<100 && battle.end===null;n++){
    const first={...idleInput,x:n===28?1:0,attack:n===0};
    tape.record(battle,first,idleInput);battle.step(dt,first,idleInput);
  }
  assert.equal(battle.endReason,'time');
  const stored=archive(tape);
  assert.equal(stored.catalog.knockouts.length,0);
  const clip=stored.restore(stored.catalog.finish).playback();
  assert.equal(clip.battle.dogs[0].grip,clip.battle.grapple);
  assert.equal(clip.battle.dogs[1].grip,clip.battle.grapple);
  assert.notEqual(clip.battle.grapple,tape.blocks[0].battle.grapple);
  while(clip.step()) {}
  assert.deepEqual(state(clip.battle),state(battle));
});

test('two rollback peers keep only confirmed ticks after delayed corrections',()=>{
  const queues=[[],[]], tapes=[new FinishTape(),new FinishTape()], worlds=[];
  const peers=tapes.map((tape,i)=>{
    const session=new window.DogOnline.OnlineSession({start(cfg,rng){worlds[i]=new Battle(cfg,undefined,rng);}});
    session.side=i;session.send=msg=>{if(msg[0]==='input') queues[1-i].push(msg);};
    session.beginRound(['start',1,'noodle','clover','nightmail',22]);
    session.match.onConfirmedInput=(world,a,b)=>tape.record(world,a,b);
    return session.match;
  });
  function deliver(i){for(const msg of queues[i].splice(0))assert(peers[i].receive(msg[2],msg[3]));}
  for(let n=0;n<399;n++){
    if(n%6===0) {deliver(0);deliver(1);}
    for(const [i,match] of peers.entries()){
      match.tick(()=>({...idleInput,x:Math.sin(n/17+i),jump:(n+i)%59===0,special:(n+i)%137===0}),worlds[i]);
      assert.equal(tapes[i].count,match.confirmed);
    }
  }
  assert(peers.some(p=>p.pending.length>0));
  for(const [i,match] of peers.entries()){deliver(i);match.confirm(worlds[i]);}
  assert.equal(tapes[0].count,tapes[1].count);
  const final=state(peers[0].confirmedWorld);
  const branches=tapes.map(t=>t.playback(90,undefined,1));
  for(const branch of branches)while(branch.step({...idleInput,x:-1,shield:true})){}
  assert.deepEqual(state(branches[0].battle),state(branches[1].battle));
  assert.notDeepEqual(state(branches[0].battle),final);
  for(const [i,tape] of tapes.entries()){
    const player=tape.playback();
    while(player.step()) {}
    assert.deepEqual(state(player.battle),final);
    assert.deepEqual(state(peers[i].confirmedWorld),final);
    const stored=archive(tape), saved=stored.restore(stored.catalog.finish);
    assert.deepEqual(state(saved.playback(saved.length).battle),final);
    const fork=saved.playback(90,undefined,1);
    while(fork.step({...idleInput,x:-1,shield:true})){}
    assert.deepEqual(state(fork.battle),state(branches[i].battle));
  }
});

for(const slot of [0,1])test('P'+(slot+1)+' can save a stock and retry both exact input streams',()=>{
  const original=new Battle({mode:'local',p1:'clover',p2:'pip',stage:'picnic',fetch:false},undefined,seededRandom(68));
  const tape=new FinishTape(), deck=original.terrain[0], dog=original.dogs[slot];
  Object.assign(dog,{x:deck.x1+70,y:deck.y,ground:0,stocks:1});
  Object.assign(original.dogs[1-slot],{x:deck.x2-170,y:deck.y,ground:0,stocks:1});
  const controls=[];
  for(let i=0;i<230 && original.end===null;i++){
    const pair=[idleInput,idleInput];
    pair[slot]={...idleInput,x:-1,y:dog.ground<0?1:0};
    pair[1-slot]={...idleInput,x:i%80<40?-.35:.35,jump:i===12,attack:i===50};
    controls.push(pair);tape.record(original,...pair);original.step(dt,...pair);
  }
  assert.equal(original.end,1-slot);
  const baseline=structuredClone(state(original));
  const offset=5;
  function run(repeatFall){
    const p=tape.playback(offset,undefined,slot);
    while(p.frame<p.length)p.step(repeatFall?controls[p.frame][slot]:idleInput);
    return p.battle;
  }
  assert.deepEqual(state(run(true)),baseline);
  const saved=run(false);assert.equal(saved.dogs[slot].stocks,1);assert.equal(saved.end,null);
  assert.deepEqual(state(run(false)),state(saved));
  assert.deepEqual(state(original),baseline);
  const film=tape.playback();while(film.step()){}assert.deepEqual(state(film.battle),baseline);
});

test('taking over the Solo CPU preserves its position and accepts human controls during hitstop',()=>{
  const world=new Battle({mode:'solo',p1:'brisket',p2:'noodle',stage:'canal',fetch:false},undefined,seededRandom(72));
  const tape=new FinishTape();
  for(let i=0;i<150;i++){
    const input={...idleInput,x:i%20<9?.4:0,shield:i%15<3};
    tape.record(world,input,idleInput);world.step(dt,input,idleInput);
  }
  const normal=tape.playback(29), branch=tape.playback(29,undefined,1);
  assert.deepEqual(branch.battle.dogs,normal.battle.dogs);assert.equal(normal.battle.mode,'solo');
  assert.equal(branch.battle.mode,'local');assert.equal(branch.battle.hasSecondPlayer,true);
  const sample={...idleInput,x:.83,jump:true,tapped:{attack:true}},seen=[];
  const capture=branch.battle.captureInput;
  branch.battle.captureInput=function(f,input){seen[f.index]=input;return capture.call(this,f,input);};
  branch.battle.hitStop=.1;branch.step(sample);assert.equal(seen[1],sample);
  assert.equal(seen[0].x,0);assert.equal(seen[0].jump,false);
  const p1=tape.playback(29,undefined,0);assert.equal(p1.battle.mode,'solo');
});
