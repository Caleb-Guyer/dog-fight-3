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
