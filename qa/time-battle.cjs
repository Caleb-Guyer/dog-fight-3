const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
require('../docs/fight-records.js');
const {Battle,idleInput,seededRandom} = window.DogFight;
const settings = {mode:'local',p1:'pip',p2:'brisket',stage:'picnic',fetch:false,timeBattle:true,minutes:1};
const create = (overrides={}) => new Battle({...settings,...overrides},undefined,seededRandom(17));
const step = w => w.step(1/60,idleInput,idleInput);

const {arenas,stageForms,platforms,fighters,FinishTape}=window.DogFight;
const opening=(type,kind='pip')=>create({suddenStart:true,suddenOpening:type,p1:kind,stage:type==='gap'?'laundry':'bandstand'});
const go=w=>{while(w.suddenDeath.intro>0)step(w);};

test('all stage forms use the same boundary schedule and preserve a playable deck',()=>{
  const ordinary=create().blastBounds();
  for(const stage of Object.keys(arenas))for(const form of Object.keys(stageForms)){
    const w=create({stage,form});
    assert.deepEqual(w.blastBounds(3600),ordinary);
    w.clockFrames=1;step(w);
    assert.equal(w.suddenDeath.cause,'time');
    const early=w.blastBounds(300),mid=w.blastBounds(600),half=w.blastBounds(1050),final=w.blastBounds(1500);
    assert.deepEqual(early,ordinary);assert(mid.left>early.left);assert.equal(mid.top,early.top);
    assert.equal(mid.bottom,early.bottom);
    assert.equal(half.top,(final.top+early.top)/2);assert.equal(half.bottom,(final.bottom+early.bottom)/2);
    assert.deepEqual(w.blastBounds(3600),final);
    assert.equal(final.left,365);assert.equal(final.right,835);
    for(const t of [0,2,4,6])for(const p of platforms(w.geometryStage,t)){
      assert(p.y>final.top && p.y<final.bottom,stage+' '+form+' all platform heights stay inside');
    }
    go(w);w.suddenDeath.frames=1049;w.hitStop=.1;
    const frozen=w.blastBounds();step(w);assert.deepEqual(w.blastBounds(),frozen);
    while(w.hitStop>0)step(w);
    step(w);assert.equal(w.blastBounds().top,half.top);
  }
});

test('a side-only saved battle and a mixed-version round retain their original ceiling',()=>{
  const modern=create({suddenStart:true}),previous=create({closingHeight:false,suddenStart:true});
  modern.copyFightFrom(previous);
  for(let round=1;round<=2;round++){
    assert.equal(modern.suddenDeath.round,round);
    assert.deepEqual(modern.blastBounds(2000),{left:365,right:835,top:-172,bottom:765});
    modern.knockouts(modern.dogs);
  }
});

test('the two final boundaries score simultaneous falls, then reopen for a new tiebreak',()=>{
  const w=create();w.clockFrames=1;step(w);go(w);w.suddenDeath.frames=1500;
  const bounds=w.blastBounds();
  Object.assign(w.dogs[0],{x:550,y:bounds.top-2,ground:-1});
  Object.assign(w.dogs[1],{x:660,y:bounds.bottom+2,ground:-1});
  const tape=new FinishTape();tape.record(w,idleInput,idleInput);step(w);
  assert.deepEqual(w.matchCard.losses.map(l=>[l.slot,l.zone,l.suddenRound]),[[0,'top',1],[1,'bottom',1]]);
  assert.deepEqual(w.matchCard.points,[0,0]);assert.equal(w.suddenDeath.intro,90);
  assert.deepEqual(w.blastBounds(),create().blastBounds());
  const replay=tape.playback();replay.step();
  assert.deepEqual(replay.battle.matchCard,w.matchCard);assert.deepEqual(replay.battle.suddenDeath,w.suddenDeath);
});

for(const kind of Object.keys(fighters))test(kind+' can save the low return and short hop on the high perch',()=>{
  for(const [type,action] of [['gap','wait'],['gap','save'],['perch','hop'],['perch','jump']]){
    const w=opening(type,kind);go(w);const f=w.dogs[0];
    let airborne=f.ground<0;
    for(let n=0;n<80 && w.end===null;n++){
      const tap=n<(action==='hop'?2:16);
      w.step(1/60,{...idleInput,jump:tap && action!=='wait',shortHop:tap && action==='hop',x:tap && action==='save'?-1:0},idleInput);
      if(f.ground<0)airborne=true;
      else if(airborne)break;
    }
    if(action==='wait' || action==='jump' && kind!=='brisket'){
      assert.equal(w.end,1);assert.equal(w.matchCard.losses[0].zone,action==='wait'?'bottom':'top');
      const frame=w.matchFrames;step(w);assert.equal(w.matchFrames,frame);assert.equal(w.matchCard.losses.length,1);
    } else {
      assert(airborne);assert.equal(w.end,null);assert.equal(f.ground,type==='gap'?0:3);assert.equal(f.stocks,1);
    }
  }
});

test('launch forecasts and saved playback follow the moving floor at the tick of impact',()=>{
  const w=opening('gap');go(w);w.suddenDeath.frames=1100;
  const f=w.dogs[0];Object.assign(f,{y:w.blastBounds().bottom-16,vy:330,stun:.15});
  const forecast=w.projectLaunch(f,0,f.vy);
  assert.equal(forecast.zone,'bottom');
  const ordinary=create({stage:'laundry'});assert.equal(ordinary.projectLaunch(f,0,f.vy).zone,'');
  const tape=new FinishTape();
  while(w.end===null && tape.length<20){tape.record(w,idleInput,idleInput);step(w);}
  assert.equal(tape.length,forecast.ticks);assert.equal(w.matchCard.losses[0].zone,'bottom');
  const replay=tape.playback(0);while(replay.step()){}
  assert.deepEqual(replay.battle.blastBounds(),w.blastBounds());assert.deepEqual(replay.battle.matchCard,w.matchCard);
});

test('eight frames of rollback undo a predicted fall when the remote player saves the stock',()=>{
  const w=opening('gap');go(w);w.suddenDeath.frames=1490;
  const peers=[0,1].map(side=>{
    let world;const out=[];
    const room=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
    room.side=side;room.send=m=>{out[m[2]]=m[3];};
    room.beginRound(['start',1,'pip','brisket','laundry',17,1,'original']);
    world.copyFightFrom(w);room.match.confirmedWorld.copyFightFrom(w);
    return {world,match:room.match,out};
  });
  let predictedFall=false;
  for(let i=0;i<60;i++){
    const a={...idleInput,x:i<16?-1:0,jump:i<16},inputs=[a,idleInput];
    w.step(1/60,...inputs);
    for(const [side,p] of peers.entries()){
      if(i>=8)assert(p.match.receive(i-8,peers[1-side].out[i-8]));
      p.match.tick(()=>inputs[side],p.world);
    }
    if(peers[1].world.end===1)predictedFall=true;
  }
  assert(predictedFall);assert.equal(w.dogs[0].ground,0);
  const fightersAtRest=world=>world.dogs.map(({prev,...fighter})=>fighter);
  for(const [side,p] of peers.entries()){
    const other=peers[1-side].out;
    for(let i=p.match.received;i<other.length;i++)assert(p.match.receive(i,other[i]));
    p.match.confirm(p.world);
    for(const world of [p.world,p.match.confirmedWorld]){
      assert.equal(world.end,null);assert.deepEqual(fightersAtRest(world),fightersAtRest(w));assert.deepEqual(world.matchCard,w.matchCard);
      assert.deepEqual(world.blastBounds(),w.blastBounds());
    }
  }
  assert.deepEqual(peers[0].world.dogs,peers[1].world.dogs);
});

test('credited KOs, self-destructs and respawns use a fresh ten-second credit window per life',()=>{
  const w=create(), target=w.dogs[1];
  const fall=()=>{target.x=4000;w.knockouts([target]);};
  assert.equal(w.clockFrames,3600);
  w.dealDamage(target,8,false,'pipJab');
  w.matchFrames=600;
  fall();
  assert.deepEqual(w.matchCard.points,[1,-1]);
  assert.equal(w.matchCard.losses[0].credited,true);
  fall();
  w.dealDamage(target,7,false,'pipJab');
  w.matchFrames+=601;
  fall();
  fall();
  assert.deepEqual(w.matchCard.points,[1,-4]);
  assert.deepEqual(w.matchCard.losses.map(x=>x.credited),[true,false,false,false]);
  assert.deepEqual(w.matchCard.losses[0].points,[1,-1]);
  assert.equal(w.end,null);
  w.clockFrames=1;
  step(w);
  assert.equal(w.end,0);
  assert.equal(w.endReason,'time');
  const data=new Map();
  const book=new window.FightRecords.Book({setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)});
  const entry={time:Date.now(),round:0,winner:w.end,side:0,stage:w.stage,form:w.form,mode:w.mode,card:w.matchCard};
  assert.deepEqual(book.get(book.add(entry)),entry);
});

test('both ring-outs on the last tick count before Sudden Death and regulation points survive the tiebreak',()=>{
  const w=create();
  for(const dog of w.dogs){w.dealDamage(dog,5,false,'pipJab');dog.x=dog.index?4000:-4000;}
  w.clockFrames=1;step(w);
  assert.equal(w.end,null);
  assert.deepEqual(w.matchCard.points,[0,0]);
  assert(w.matchCard.losses.every(x=>x.credited));
  assert.equal(w.suddenDeath.cause,'time');
  assert.deepEqual(w.dogs.map(d=>[d.stocks,d.damage]),[[1,300],[1,300]]);
  w.knockouts(w.dogs);
  assert.equal(w.suddenDeath.round,2);
  w.knockouts([w.dogs[0]]);
  assert.equal(w.end,1);
  assert.equal(w.matchCard.reason,'sudden');
  assert.deepEqual(w.matchCard.points,[0,0]);
  const decisive=create();
  decisive.clockFrames=1;decisive.dogs[1].x=4000;step(decisive);
  assert.equal(decisive.end,0);
  assert.deepEqual(decisive.matchCard.points,[0,-1]);
});

test('the chosen duration requires a clock and stock fights keep stock elimination',()=>{
  for(const minutes of [1,3,7])assert.equal(create({minutes}).clockFrames,3600*minutes);
  assert.equal(create({minutes:0}).clockFrames,10800);
  for(const opt of [{timeBattle:false},{lastStockStart:true},{suddenStart:true}]){
    const w=create(opt);
    assert.equal(w.matchCard.points,undefined);
    while(w.end===null)w.knockouts([w.dogs[1]]);
    assert.equal(w.end,0);
  }
  assert.equal(create({mode:'training'}).matchCard,null);
});

test('an eight-frame input delay confirms the same scoring ring-out as an offline battle',()=>{
  const reference=create();
  const peers=[0,1].map(side=>{
    const out=[];
    let world;
    const room=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
    room.side=side;
    room.send=msg=>{if(msg[0]==='input')out[msg[2]]=msg[3];};
    room.beginRound(['start',1,'pip','brisket','picnic',17,1,'original','time-score-1',1]);
    return {match:room.match,world,out};
  });
  let ringOut=false;
  for(let i=0;i<300;i++){
    const pair=[{...idleInput,x:-1},idleInput];
    reference.step(1/60,...pair);
    for(const [side,p] of peers.entries()){
      if(i>=8)p.match.receive(i-8,peers[1-side].out[i-8]);
      p.match.tick(()=>pair[side],p.world);
    }
    if(reference.matchCard.losses.length){ringOut=true;break;}
  }
  assert(ringOut);
  for(const [side,p] of peers.entries()){
    const other=peers[1-side].out;
    for(let i=p.match.received;i<other.length;i++)p.match.receive(i,other[i]);
    p.match.confirm(p.world);
    assert.deepEqual(p.match.confirmedWorld.matchCard,reference.matchCard);
    assert.deepEqual(p.world.matchCard.points,reference.matchCard.points);
  }
});

test('a delayed two-stock room with no clock or Fetch confirms the same elimination as local play',()=>{
  const config={mode:'local',p1:'pip',p2:'brisket',stage:'picnic',form:'flat',fetch:false,stockCount:2,minutes:0};
  const reference=new Battle(config,undefined,window.DogFight.seededRandom(131));
  const peers=[0,1].map(side=>{
    const out=[];let world;
    const room=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
    room.side=side;room.send=msg=>{out[msg[2]]=msg[3];};
    room.beginRound(['start',1,'pip','brisket','picnic',131,1,'flat','room-rules-1','stock',2,0,false]);
    return {out,world,match:room.match};
  });
  for(let i=0;i<1200 && reference.end===null;i++){
    const pair=[{...idleInput,x:-1},idleInput];reference.step(1/60,...pair);
    for(const [side,p] of peers.entries()){
      if(i>=8)p.match.receive(i-8,peers[1-side].out[i-8]);
      p.match.tick(()=>pair[side],p.world);
    }
  }
  assert.equal(reference.end,1);
  for(const [side,p] of peers.entries()){
    const other=peers[1-side].out;
    for(let i=p.match.received;i<other.length;i++)p.match.receive(i,other[i]);
    p.match.confirm(p.world);
    assert.equal(p.world.end,1);assert.equal(p.world.fetch,false);assert.equal(p.world.clockFrames,null);
    assert.deepEqual(p.match.confirmedWorld.matchCard,reference.matchCard);
  }
});
