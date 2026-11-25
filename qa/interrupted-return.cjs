const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,kits,moves,arenas,idleInput,seededRandom} = window.DogFight;
const cfg = {p1:'pip',p2:'noodle',stage:'nightmail',fetch:false};
const dt = 1/60, input = v => ({...idleInput,...v});

test('each recovery can be interrupted, cast again on a fresh input, and steered home on both sides', () => {
  for (const kind of Object.keys(kits)) for (const side of ['left','right']) for (const respond of [false,true]) {
    const hits = [], sequence = [];
    const w = new Battle({...cfg,mode:'training',p1:'brisket',p2:'clover'},(name,e) => {
      if (name==='hit' && e.f.index===0 && e.recoveryRestored) hits.push([e.moveId,e.f.usedUp,e.f.usedDodge,e.f.jumps]);
      if (name==='airCue') sequence.push(e.phase);
    });
    w.setDummyDamage(20);
    w.resetAirPractice('interrupted',side,false,kind);
    const d = w.airPractice, inward = w.dogs[0].face;
    let cast = -1;
    for (let i=0;i<195 && d.phase!=='done';i++) {
      if (respond && cast<0 && d.readyToCast) cast=i;
      const special = i===0 || (cast>=0 && i-cast<(kind==='brisket'?22:kind==='clover'?45:1));
      w.step(dt,input({x:inward,y:-1,special}));
    }
    assert.equal(d.outcome,respond?'saved':'miss');
    assert.deepEqual(hits,[['noodleKnotPoke',false,true,0]]);
    assert.deepEqual(sequence,respond?['clipped','cast','return']:['clipped','cast']);
    w.resetTraining();
    assert.deepEqual(w.dogs.map(f=>f.kind),['brisket','clover']); assert.equal(w.dogs[1].damage,20);
  }
});

test('both stock roles start on the real hit frame across all stages; Rival recasts and returns under normal control', () => {
  for (const stage of Object.keys(arenas)) for (const side of ['left','right'])
    for (const kind of Object.keys(kits)) for (const slot of [0,1]) {
      const config = {...cfg,p1:slot?'noodle':kind,p2:slot?kind:'noodle',stage};
      const ref = new Battle({...config,mode:'local'},undefined,seededRandom(7));
      ref.playRecoveryOpening(side,slot);
      const cast = [];
      const w = new Battle({...config,mode:'solo',cpuLevel:'rival',interruptedReturn:{side,slot}},(name,e)=>{
        if (name==='recover' && e.f.index===slot) cast.push(e.moveId);
      },seededRandom(7));
      assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]); assert.equal(w.clockFrames,7*3600);
      assert.equal(w.matchFrames,0); assert.equal(w.mode,'solo'); assert.equal(w.cpuLevel,'rival');
      const f=w.dogs[slot], original=ref.dogs[slot];
      assert(w.hitStop>0 && f.stun>0 && f.damage===5 && !f.usedUp && f.jumps===0 && f.usedDodge);
      assert.deepEqual([f.x,f.y,f.vx,f.vy,w.hitStop],[original.x,original.y,original.vx,original.vy,ref.hitStop]);
      if (!slot) continue;
      for (let i=0;i<245 && f.ground<0 && !f.ledge && f.stocks===3;i++) w.step(dt,idleInput);
      assert(cast.includes(f.kit.specials.up),kind);
      assert(f.stocks===3 && (f.ledge || f.ground>=0));
    }
});

test('spent resources survive a miss or protected contact, and a downward meteor denies the reset', () => {
  function contact(moveId,damage,invuln,startingDamage) {
    const w=new Battle({...cfg,mode:'local'});
    const [a,f]=w.dogs, move=moves[moveId];
    Object.assign(f,{usedUp:true,usedAir:true,usedDodge:true,usedWallKick:true,jumps:0,ground:-1,damage:startingDamage,invuln});
    w.hit(f,a,damage,move.base,move.growth,0,'light',1,{x:f.x,y:f.y},move,moveId,{});
    assert(f.usedDodge && f.usedWallKick && f.usedAir && f.jumps===0);
    return f;
  }
  assert.equal(contact('pipBackKick',8,0,40).usedUp,false);
  assert.equal(contact('pipBackKick',8,.1,40).usedUp,true);
  assert.equal(contact('pipBackKick',0,0,40).usedUp,true);
  const spike=contact('pipPogo',10,0,130);
  assert(spike.tumble?.meteor && spike.usedUp);
});

test('rollback corrects a predicted unbroken recovery, restores only Up Special, and replays the second cast', () => {
  const stamp = w => [w.hitStop,...w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.damage,f.stun,f.jumps,f.usedUp,
    f.usedDodge,f.hopWindow,f.attack?.moveId,f.attack?.secondHop,f.ledge?.left])];
  for (const slot of [0,1]) {
    const config={...cfg,mode:'local',p1:slot?'noodle':'pip',p2:slot?'pip':'noodle'};
    const side=slot?'right':'left', inward=slot?-1:1;
    const ref=new Battle(config,undefined,seededRandom(17)); ref.placeInterruptedReturn(side,slot);
    const peers=[0,1].map(sideIndex=>{
      let world;
      const packets=[];
      const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=sideIndex;session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,config.p1,config.p2,config.stage,17]);
      for(const w of [world,session.match.confirmedWorld]) w.placeInterruptedReturn(side,slot);
      return {world,net:session.match,packets};
    });
    const history=[stamp(ref)];
    let divergent=false, recast=false;
    for(let n=0;n<115;n++) {
      const pair=[];
      pair[slot]=input({x:inward,grabX:inward,y:-1,special:n===0 || n===19});
      pair[1-slot]=input({aimStick:n===0,tiltMode:true,smashX:-inward});
      ref.step(dt,...pair); history.push(stamp(ref));
      const f=ref.dogs[slot];
      recast ||= n>=19 && f.attack?.moveId==='pipHopper' && !f.attack.secondHop && f.usedUp;
      for(const [i,p] of peers.entries()) {
        if(n>=8)p.net.receive(n-8,peers[1-i].packets[n-8]);
        p.net.tick(()=>pair[i],p.world);
        divergent ||= f.damage>0 && !f.usedUp && p.world.dogs[slot].usedUp;
        assert.deepEqual(stamp(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(divergent && recast);
    for(const [i,p] of peers.entries()) {
      const remote=peers[1-i].packets;
      for(let n=p.net.received;n<remote.length;n++)p.net.receive(n,remote[n]);
      p.net.confirm(p.world);assert.deepEqual(stamp(p.world),stamp(ref));
    }
  }
});
