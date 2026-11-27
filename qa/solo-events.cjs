const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/solo-events.js');
const {idleInput,seededRandom,Battle}=window.DogFight;
const {Run,setup,best}=window.SoloEvents;
function readSet(seed,skip=[],review){
  const run=new Run(setup('read-the-rival',false,seed,review),()=>{},seededRandom(42));
  let button=null;
  for(let n=0;n<2400 && run.end===null;n++){
    const set=run.reads,brisket=run.dogs[1],i={...idleInput};
    if(!set.age || set.call)button=null;
    if(!set.call && !skip.includes(set.index-set.guided)){
      if(brisket.smashCharge)button='shield';
      else if(brisket.x>660 && brisket.face===-1)button='jump';
      if(button)i[button]=true;
    }
    run.step(1/60,i,idleInput);
  }
  return run;
}
test('Brisket visibly commits to both approaches and the real collisions grade six exchanges',()=>{
  const orders=new Set();
  for(const seed of [1,2,99,88442]){
    const run=readSet(seed),set=run.reads;assert.equal(run.end,0);assert.equal(set.score,4);
    assert.deepEqual(set.results.map(r=>r.move).sort(),['grab','grab','punch','punch']);
    for(const r of set.results){
      assert.equal(r.line,r.move==='grab'?'Evaded Freight Hug':'Blocked Haymaker');
      assert.equal(r.first.label,r.move==='grab'?'Jump':'Shield');assert(r.first.frame>0 && !r.first.held);
    }
    assert(set.scoredFrames<run.matchFrames);assert.equal(run.matchCard.losses.length,0);
    orders.add(set.results.map(r=>r.move).join(','));
  }
  assert(orders.size>1);
});
test('three reads clear, two miss, and guided retries restore precisely the missed timing before the identical exam',()=>{
  const seed=88442,won=readSet(seed,[0]),lost=readSet(seed,[0,2]),review=readSet(seed,[],[0,2]);
  assert.equal(won.end,0);assert.equal(won.reads.score,3);assert.equal(lost.end,1);assert.equal(lost.reads.score,2);
  assert.equal(review.end,0);assert.deepEqual(review.reads.rounds.slice(0,2),[lost.reads.rounds[2],lost.reads.rounds[4]]);
  assert.deepEqual(review.reads.rounds.slice(2),lost.reads.rounds.slice(2));
  const normal=new Battle(setup('read-the-rival',true));assert.equal(normal.stockCount,3);assert.equal(normal.cpuLevel,'rival');assert(!normal.reads);
});
test('camping behind Shield keeps the grab tutorial active and records the held input honestly',()=>{
  const run=new Run(setup('read-the-rival',false,42),()=>{},seededRandom(42));
  while(!run.reads.call)run.step(1/60,{...idleInput,shield:true},idleInput);
  assert.equal(run.reads.call.first.held,true);assert(run.reads.call.ok);
  for(let i=0;i<300 && !(run.reads.index===1 && run.reads.call);i++)run.step(1/60,{...idleInput,shield:true},idleInput);
  assert.equal(run.reads.call.ok,false);assert.match(run.reads.call.line,/Caught/);assert.equal(run.reads.results.length,0);
});
function play(id,control=()=>({})){
  const calls=[];
  const run=new Run(setup(id),(name,e)=>{if(name==='win')calls.push(e.f.index);},seededRandom(42));
  for(let frame=0;frame<1800 && run.end===null;frame++)run.step(1/60,{...idleInput,...control(frame,run)},idleInput);
  assert.deepEqual(calls,[run.end]);
  return run;
}
function atLip(w,slot,side,depth){
  const f=w.dogs[slot],floor=w.terrain[0],lip=side<0?floor.x1:floor.x2;
  Object.assign(f,{ground:-1,x:lip+side*24,y:floor.y+depth,jumps:0,face:-side,ledgeLock:f.kind==='noodle'?.085:0});
}
test('all four rising specials can take either lip from either seat and older rules keep moving',()=>{
  for(const kind of Object.keys(window.DogFight.fighters))for(const slot of [0,1])for(const side of [-1,1])for(const enabled of [true,false]){
    let tick=0,reach,hang;
    const w=new Battle({mode:'local',p1:kind,p2:kind,stage:'picnic',fetch:false,risingCatch:enabled},(n,e)=>{
      if(n==='reachLip')reach=tick;
      if(n==='ledge' && e.rising)hang=tick;
    },seededRandom(15));
    atLip(w,slot,side,kind==='noodle'?72:92);
    for(;tick<30 && hang===undefined;tick++){
      const f=w.dogs[slot],grab=!!w.risingLedge(f) || !enabled && tick===6;
      const i={...idleInput,grab,special:tick===0,y:tick===0?-1:0};
      w.step(1/60,slot?idleInput:i,slot?i:idleInput);
      if(tick===reach || tick===reach+1){assert(!f.ledge);assert(!f.invuln);assert.equal(w.activeSwing(f),null);}
    }
    if(enabled){assert.equal(hang,reach+2);assert.equal(w.dogs[slot].ledge.left,side<0);}
    else{assert.equal(reach,undefined);assert.equal(hang,undefined);}
  }
});
test('Doorstop hits either exposed frame and misses if it arrives after a fresh catch',()=>{
  for(const guardTap of [0,1,2]){
    const events=[];
    const w=new Battle({mode:'local',p1:'pip',p2:'brisket',stage:'picnic',fetch:false},(n,e)=>{
      if(n==='reachLip' || n==='ledge' || (n==='hit' && e.f.index===0))events.push([n,w.matchFrames]);
    },seededRandom(4));
    atLip(w,0,-1,126);w.dogs[1].x=w.terrain[0].x1+60;w.dogs[1].face=-1;
    for(let i=0;i<17;i++)w.step(1/60,{...idleInput,y:i===0?-1:0,special:i===0,grab:!!w.risingLedge(w.dogs[0])},
      {...idleInput,y:i===guardTap?1:0,attack:i===guardTap,quickAttack:i===guardTap});
    assert.equal(events[0][0],'reachLip');
    assert.deepEqual(events[1],[guardTap===2?'ledge':'hit',events[0][1]+guardTap]);
    assert.equal(w.dogs[0].damage>0,guardTap<2);
  }
});
test('The Low Road rewards the actual catch followed by an onstage return',()=>{
  const win=play('low-road',(n,w)=>({y:n===6?-1:0,special:n===6,grab:!!w.risingLedge(w.dogs[0]),x:n>=15?1:0}));
  assert.equal(win.end,0);assert(win.caught);assert(win.dogs[0].ground>=0);
  const miss=play('low-road');assert.equal(miss.end,1);assert.match(miss.feedback,/missed the roof/);
  const regular=new Battle(setup('low-road',true),undefined,seededRandom(42));
  assert.deepEqual([regular.dogs[0].x,regular.dogs[0].ground,regular.stockCount],[regular.terrain[0].x1-24,-1,3]);
});
test('Wrong Way requires a planted tech and a grounded punish during the missed sweep',()=>{
  assert.match(play('wrong-way').feedback,/missed the landing/);
  assert.match(play('wrong-way',n=>({x:1,shield:n===5})).feedback,/Pip rolled/);
  assert.match(play('wrong-way',n=>({shield:n===5})).feedback,/recovered/);
  const win=play('wrong-way',n=>({shield:n===5,attack:n===34}));
  assert.equal(win.end,0);assert.deepEqual(win.dogs.map(f=>f.damage),[45,4]);
  const store=new Map(),disk={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
  win.save(disk);assert.equal(best(disk,win.eventId),win.matchFrames);
  const slower=play('wrong-way',n=>({shield:n===5,attack:n===36}));
  assert.equal(slower.end,0);slower.save(disk);assert.equal(Number(store.values().next().value),win.matchFrames);
  const miss=play('wrong-way');miss.save(disk);assert.equal(store.size,1);
});
test('High Ground scores only uncontested time and keeps it across separate visits',()=>{
  const win=play('high-ground',n=>({y:n===24?1:0}));assert.equal(win.end,0);assert.equal(win.held,180);
  assert.equal(play('high-ground').end,1);
  const run=new Run(setup('high-ground'),()=>{},seededRandom(42)),[p,r]=run.dogs,top=run.terrain[3];
  const perch=(f,x)=>Object.assign(f,{x,y:top.y,ground:3,stockLift:null,respawning:0,vx:0,vy:0,landingLag:1});
  perch(p,top.x1+20);perch(r,top.x2-20);run.step(1/60,idleInput,idleInput);assert.equal(run.held,0);
  Object.assign(r,{ground:0,x:400,y:run.terrain[0].y});run.step(1/60,idleInput,idleInput);assert.equal(run.held,1);
  perch(r,top.x2-20);run.step(1/60,idleInput,idleInput);assert.equal(run.held,1);
  Object.assign(r,{ground:0,x:400,y:run.terrain[0].y});run.held=179;run.clockFrames=1;
  run.step(1/60,idleInput,idleInput);assert.equal(run.end,0,'the last tick at the horn counts');
});
test('Last Delivery clears on the lead change, expires on a tie, and its ordinary match continues after the same KO',()=>{
  const charge=(n,w)=>({x:Math.sign(w.dogs[1].x-w.dogs[0].x),special:n===12});
  const win=play('last-delivery',charge);assert.equal(win.end,0);assert.deepEqual(win.matchCard.points,[0,-1]);
  const miss=play('last-delivery');assert.equal(miss.end,1);assert.equal(miss.matchFrames,600);
  const tie=new Run(setup('last-delivery'),()=>{},seededRandom(42));tie.matchCard.points=[0,0];tie.clockFrames=1;
  tie.step(1/60,idleInput,idleInput);assert.equal(tie.end,1);assert.equal(tie.suddenDeath,null);
  const normal=new Battle(setup('last-delivery',true),()=>{},seededRandom(42));
  for(let i=0;i<win.matchFrames;i++)normal.step(1/60,{...idleInput,...charge(i,normal)},idleInput);
  assert.deepEqual(normal.matchCard.points,win.matchCard.points);assert.equal(normal.end,null);
});
