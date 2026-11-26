const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,arenas,kits,platforms,seededRandom,idleInput} = window.DogFight;
const dt = 1/60;
const config = {mode:'solo',p1:'pip',p2:'brisket',stage:'laundry',fetch:true,cpuLevel:'rival'};
const make = cfg => new Battle({...config,...cfg},undefined,seededRandom(78));
const state = w => w.dogs.map(d=>[d.x,d.y,d.vx,d.vy,d.ground,d.damage,d.stocks,d.ledge?.index,d.attack?.moveId]);
const shapes = [['flat','nightmail'],['trio','bandstand']];

test('all five settings share each form’s stock spawns, ledge walls, ceiling, CPU and respawn paths',()=>{
  for(const stage of Object.keys(arenas)) for(const [form,geometry] of shapes) for(const p2 of Object.keys(kits)){
    const w=make({stage,form,p2}), reference=make({stage:geometry,p2});
    assert.equal(w.stage,stage);
    const deck=w.terrain[0], p=w.dogs[0], q=reference.dogs[0];
    assert.deepEqual(w.terrain,platforms(geometry,0));
    const below=deck.y+180+p.stats.height;
    assert.deepEqual(w.solidContact(p,600,below,600,deck.y),reference.solidContact(q,600,below,600,deck.y));
    assert(w.solidContact(p,600,below,600,deck.y)?.ceiling);
    const y=deck.y+3+p.stats.height*.52;
    assert(w.wallContact(p,deck.x1-90,y,deck.x1+20,y)?.wall.left);
    const initialTerrain=w.terrain;
    for(let n=0;n<420;n++){
      if(n===220){ w.dogs[1].x=-200; reference.dogs[1].x=-200; }
      const move={...idleInput,jump:n%100<9,x:n%140<72?1:-1,attack:n%39===0};
      w.step(dt,move); reference.step(dt,move);
      assert.deepEqual(state(w),state(reference));
    }
    assert.equal(initialTerrain,w.terrain);
    assert(w.matchCard.losses.length>=1);
  }
  const ferry=make({stage:'canal'}), dock=ferry.terrain[1].x1;
  ferry.step(dt,idleInput);
  assert.notEqual(ferry.terrain[1].x1,dock);
});

test('a late jump lands on the actual selected layout on both peers',()=>{
  for(const [form,geometry] of shapes){
    const ref=make({mode:'local',stage:geometry});
    const peers=[0,1].map(side=>{
      let world;
      const sent=[], session=new window.DogOnline.OnlineSession({start(config,r){world=new Battle(config,undefined,r);}});
      session.side=side;
      session.send=msg=>{if(msg[0]==='input') sent[msg[2]]=msg[3];};
      session.beginRound(['start',1,'pip','brisket','laundry',78,1,form]);
      return {world,net:session.match,sent};
    });
    const frames=[state(ref)], grounds=[];
    for(let n=0;n<110;n++){
      const inputs=[{...idleInput,jump:n<18},idleInput];
      ref.step(dt,...inputs); frames.push(state(ref)); grounds.push(ref.dogs[0].ground);
      for(const [side,peer] of peers.entries()){
        if(n>=8) peer.net.receive(n-8,peers[1-side].sent[n-8]);
        peer.net.tick(()=>inputs[side],peer.world);
        assert.deepEqual(state(peer.net.confirmedWorld),frames[peer.net.confirmed]);
      }
    }
    assert(grounds.includes(-1));
    assert.equal(grounds.at(-1),form==='flat'?0:1);
    for(const [i,p] of peers.entries()){
      const other=peers[1-i].sent;
      for(let n=p.net.received;n<other.length;n++) p.net.receive(n,other[n]);
      p.net.confirm(p.world);
      assert.deepEqual(state(p.world),state(ref));
      assert.equal(p.net.confirmedWorld.form,form);
    }
  }
});

test('room hosts choose the form once and quickplay uses original arenas',()=>{
  const guest=new window.DogOnline.OnlineSession({start(){}});
  Object.assign(guest,{round:0,action:'join',kind:'clover'});
  const start=['start',1,'pip','clover','laundry',70];
  for(const goal of [1,2]) for(const [form] of shapes) assert(guest.validStart([...start,goal,form]));
  for(const suffix of [[2,'bad'],[4,'flat'],[2,null],[1,'constructor'],[1,'flat',1]]) assert(!guest.validStart([...start,...suffix]));
  guest.beginRound([...start,1,'flat']); start[1]=2;
  assert(!guest.validStart(start)); assert(!guest.validStart([...start,1,'trio'])); assert(guest.validStart([...start,1,'flat']));
  Object.assign(guest,{round:0,action:'quick'}); start[1]=1;
  assert(guest.validStart(start)); assert(!guest.validStart([...start,1,'flat']));
  assert.equal(make({mode:'training',form:'trio'}).form,'original');
  assert.equal(make({mode:'local',form:'flat',lesson:0}).form,'original');
});

function lifts(extra={}) {return make({stage:'canal',mode:'local',form:'counterweights',...extra});}
function advance(w,count,input=idleInput) {
  for(let n=0;n<count;n++)w.step(dt,{...idleInput,...(typeof input==='function'?input(n):input)},idleInput);
}
test('each arena keeps both recovery ledges and a fixed main deck under two opposing lifts',()=>{
  for(const stage of Object.keys(arenas)){
    const w=lifts({stage}),[deck]=w.terrain, dog=w.dogs[0];
    const heights=[];
    for(let side of [-1,1]){
      dog.x=side<0?deck.x1-12:deck.x2+12;dog.y=deck.y+25;
      assert.equal(w.nearestLedge(dog,40,0,45).left, side<0);
    }
    w.spawn(dog,false);
    for(let n=0;n<=480;n++){
      const [floor,left,right]=w.terrain;
      assert.deepEqual(floor,deck);
      assert(Math.abs(left.y+right.y-756)<1e-7);
      if(n%120===0)heights.push(Math.round(left.y));
      advance(w,1);
    }
    assert.deepEqual(heights,[378,445,378,311,378]);
    w.knockouts([dog]);
    assert.equal(dog.stockLift.landing,0);assert.equal(dog.stocks,2);
  }
});
for(const kind of Object.keys(kits))test(kind+' can short-hop onto the low lift and needs an air jump at the high point',()=>{
  for(const [start,low,double,ground] of [[96,true,false,1],[335,false,false,0],[335,false,true,1]]){
    const w=lifts({p1:kind}),f=w.dogs[0];
    advance(w,start);
    advance(w,100,n=>({shortHop:low&&n===0,jump:!low&&(n<19||double&&n>=20&&n<38)}));
    assert.equal(f.ground,ground);
    if(low){
      for(let n=0;n<130;n++){advance(w,1);assert.equal(f.y,w.terrain[1].y);}
      advance(w,1,{shield:true});
      advance(w,1,{shield:true,x:.72,y:.72});
      assert.equal(f.ground,-1);assert.equal(f.dropPlatform,1);
      advance(w,60);assert.equal(f.ground,0);
    }
  }
});
test('a rising lift intercepts a fall sooner than a retreating one and carries dogs through hitstop',()=>{
  for(const ground of [1,2]){
    const w=lifts(),f=w.dogs[0],p=w.terrain[ground];
    Object.assign(f,{x:(p.x1+p.x2)/2,y:p.y-8,ground:-1,vy:55});
    const soon=w.floorAhead(f,4*dt);
    assert.equal(soon,ground===2?2:-1);
    advance(w,4);
    assert.equal(f.ground,soon);
    advance(w,8);assert.equal(f.ground,ground);
    f.impactLag=6*dt;
    for(let n=0;n<6;n++){advance(w,1);assert.equal(f.y,w.terrain[ground].y);}
    Object.assign(f,{ground:-1,y:w.terrain[ground].y+7,vy:100});
    advance(w,40);assert.equal(f.ground,0);
  }
});
test('a resting Fetch Ball follows either cable through both turnarounds',()=>{
  for(const ground of [1,2]){
    const w=lifts(),p=w.terrain[ground];
    w.ball={x:(p.x1+p.x2)/2,y:p.y-12,vx:0,vy:0,hits:0,owner:-1,age:0};
    for(let n=0;n<485;n++){advance(w,1);assert.equal(w.ball.y,w.terrain[ground].y-12);}
  }
});
test('delayed room inputs reconcile a jump, cable ride and drop to the offline match',()=>{
  const peers=[0,1].map(side=>{
    const sent=[];let world;
    const session=new window.DogOnline.OnlineSession({start(options,rng){world=new Battle(options,undefined,rng);}});
    Object.assign(session,{side,round:0,action:side?'join':'create',kind:side?'brisket':'pip'});
    session.send=msg=>{if(msg[0]==='input')sent[msg[2]]=msg[3];};
    const start=['start',1,'pip','brisket','canal',78,1,'counterweights'];
    if(side)assert(session.validStart(start));
    session.beginRound(start);
    return {world,net:session.match,sent};
  });
  const ref=lifts(),sample=w=>[...state(w),w.terrain.map(p=>p.y)],history=[sample(ref)],visited=new Set();
  for(let n=0;n<260;n++){
    const inputs=[{...idleInput,jump:n<22,y:n===145?1:0}, {...idleInput,jump:n>=22&&n<44 || n>=45&&n<65}];
    ref.step(dt,...inputs);history.push(sample(ref));visited.add(ref.dogs[0].ground);
    for(const [i,p] of peers.entries()){
      if(n>=8)assert(p.net.receive(n-8,peers[1-i].sent[n-8]));
      p.net.tick(()=>inputs[i],p.world);
      assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
    }
  }
  assert.deepEqual([...visited].sort(),[-1,0,1]);assert.equal(ref.dogs[0].ground,0);
  for(const [i,p] of peers.entries()){
    for(let n=p.net.received;n<260;n++)assert(p.net.receive(n,peers[1-i].sent[n]));
    p.net.confirm(p.world);assert.deepEqual(sample(p.world),sample(ref));
  }
});
