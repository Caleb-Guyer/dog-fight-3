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
