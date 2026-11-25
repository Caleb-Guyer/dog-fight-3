const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,kits,arenas,idleInput,seededRandom} = window.DogFight;
const dt = 1/60;
const cfg = {p1:'brisket', p2:'pip', stage:'nightmail', cpuLevel:'rival', fetch:false};
const input = v => ({...idleInput,...v});

test('each dog can recover from either side by matching its dodge to the low or wide mark', () => {
  for (const p1 of Object.keys(kits)) for (const side of ['left','right']) for (const wide of [false,true]) {
    for (const aim of ['inward','diagonal','drift']) {
      const w = new Battle({...cfg,p1,mode:'training'});
      w.resetAirPractice('lastDodge',side,wide);
      const f = w.dogs[0];
      assert.equal(f.jumps,0); assert(f.usedUp && !f.usedDodge);
      for (let n=0;n<155 && w.airPractice.phase!=='done';n++) {
        w.step(dt,input({x:side==='left'?1:-1,y:aim==='diagonal'?-1:0,shield:aim!=='drift' && n===0}));
      }
      const saved = aim === (wide?'inward':'diagonal');
      assert.equal(w.airPractice.outcome,saved?'ledge':'miss');
      if (saved) assert(f.ledge && !f.usedDodge && !f.usedUp);
      w.resetTraining();
      assert.equal(f.ground,0); assert.equal(f.usedDodge,false);
    }
  }
});

test('Rival reaches both marks on every arena using ordinary dodge input, then plays out the stock', () => {
  for (const stage of Object.keys(arenas)) for (const p2 of Object.keys(kits))
    for (const side of ['left','right']) for (const wide of [false,true]) {
      const contacts = [];
      const w = new Battle({...cfg,p2,stage,mode:'solo',dodgeReturn:{side,wide}},(name,e) => {
        if (e?.f?.index===1 && ['dodge','ledge','jump','recover'].includes(name)) contacts.push([name,e.dirX,e.dirY]);
      },seededRandom(42));
      assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
      assert.equal(w.clockFrames,7*3600);
      for (let n=0;n<36 && !w.dogs[1].ledge;n++) w.step(dt,idleInput);
      assert.deepEqual(contacts.map(e=>e[0]),['dodge','ledge']);
      assert.equal(Math.sign(contacts[0][1]),side==='left'?1:-1);
      assert.equal(contacts[0][2]<0,!wide);
      assert.equal(w.dogs[1].ledge.left,side==='left');
      w.dogs[1].ledge=null; w.dogs[1].x=4300;
      w.step(dt,idleInput);
      assert.equal(w.dogs[1].stocks,2); assert(w.dogs[1].stockLift);
    }
});

test('Rival saves the dodge for a reachable lip, respects the regrab lock and uses the dog’s own reach', () => {
  function decide(kind,gap,depth,override={}) {
    const w = new Battle({...cfg,p2:kind,mode:'solo'});
    const f = w.dogs[1], floor = w.terrain[0];
    Object.assign(f,{x:floor.x1-gap,y:floor.y+depth,vx:-100,vy:240,ground:-1,jumps:0,usedUp:true},override);
    return w.lastDodgeInput(f,floor);
  }
  assert(decide('pip',60,100)?.shield);
  assert.equal(decide('pip',29,42,{vx:100}),null);
  assert.equal(decide('pip',60,100,{ledgeLock:1}),null);
  assert.equal(decide('pip',60,100,{usedDodge:true}),null);
  assert.equal(decide('pip',60,100,{hopWindow:.3}),null);
  assert.equal(decide('brisket',154,30),null);
  assert(decide('noodle',154,30)?.shield);
});

test('the player can challenge a returning Rival and change its choice from the lip', () => {
  function react(defend) {
    const hits = [];
    const w = new Battle({...cfg,mode:'solo',dodgeReturn:{side:'left',wide:false}},(name,e) => {
      if (name==='hit') hits.push(e.moveId);
    },seededRandom(42));
    for (let i=0;i<30;i++) w.step(dt,input({shield:defend}));
    return hits;
  }
  assert(react(false).includes('pipRailKick'));
  assert(!react(true).includes('pipRailKick'));
});

test('late directional input reconciles the last dodge, ledge catch and restored resources in both slots', () => {
  const stamp = w => w.dogs.map(f => [f.x,f.y,f.vx,f.vy,f.ledge?.left,f.ledgeCatches,f.jumps,
    f.usedUp,f.usedDodge,f.airDodge?.type,f.airDodge?.x,f.airDodge?.y,f.airDodge?.time]);
  for (const slot of [0,1]) {
    const config = {...cfg,mode:'local'};
    const side = slot?'right':'left';
    const place = w => w.placeLastDodge(side,false,slot);
    const ref = new Battle(config,undefined,seededRandom(17)); place(ref);
    const peers = [0,1].map(side => {
      let world;
      const packets = [];
      const session = new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=side;
      session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,config.p1,config.p2,config.stage,17]);
      place(world);place(session.match.confirmedWorld);
      return {world,net:session.match,packets};
    });
    const history=[stamp(ref)];
    let discrepancy=false, caught=false;
    for (let n=0;n<55;n++) {
      const pair=[idleInput,idleInput];
      pair[slot]=n===1?input({x:slot?-1:1,y:-1,airDodgeX:slot?-1:1,airDodgeY:-1,shield:true}):idleInput;
      ref.step(dt,...pair); history.push(stamp(ref));
      caught ||= !!ref.dogs[slot].ledge;
      for (const [side,p] of peers.entries()) {
        if (n>=7) p.net.receive(n-7,peers[1-side].packets[n-7]);
        p.net.tick(()=>pair[side],p.world);
        discrepancy ||= p.world.dogs[slot].usedDodge !== ref.dogs[slot].usedDodge;
        assert.deepEqual(stamp(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(caught && discrepancy);
    for (const [side,p] of peers.entries()) {
      const remote=peers[1-side].packets;
      for (let n=p.net.received;n<remote.length;n++) p.net.receive(n,remote[n]);
      p.net.confirm(p.world); assert.deepEqual(stamp(p.world),stamp(ref));
    }
  }
});
