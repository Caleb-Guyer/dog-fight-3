const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, fighters, gripFramesLeft, idleInput, seededRandom} = window.DogFight;
const tick = 1 / 60;
const config = {mode:'local', p1:'pip', p2:'brisket', stage:'picnic', fetch:false};
const input = changes => ({...idleInput, ...changes});

function lip(w, left) {
  const floor = w.terrain[0];
  return {index:0, left, x:left ? floor.x1 : floor.x2, y:floor.y};
}
function step(w, slot, changes) {
  const pair = [idleInput, idleInput];
  pair[slot] = input(changes);
  w.step(tick, ...pair);
}
test('damage changes hang time on both ledges, with one warning and a usable air jump after slipping', () => {
  for (const kind of Object.keys(fighters)) for (const left of [false,true]) for (const damage of [0,60,120,190]) {
    const events = [];
    const w = new Battle({...config,p1:kind}, name => events.push(name)), f = w.dogs[0];
    f.damage = damage;
    w.hangLedge(f,lip(w,left));
    const frames = 240 - Math.min(120,damage);
    assert.equal(f.ledge.hangFrames,frames);
    for (let n=1; n<frames; n++) {
      step(w,0);
      assert(f.ledge);
      assert.equal(gripFramesLeft(f),frames-n);
      assert.equal(events.includes('ledgeStrain'),n>=frames-45);
    }
    step(w,0);
    assert.equal(events.filter(e=>e==='ledgeStrain').length,1);
    assert.equal(events.filter(e=>e==='ledgeSlip').length,1);
    assert(!f.ledge && f.ground<0 && f.vy>0);
    step(w,0,{jump:true}); assert(f.vy<0);
  }
});
test('a last-frame ledge option wins over expiry for all four fighters', () => {
  for (const kind of Object.keys(fighters)) for (const [button,action] of [
    [{shield:true},'ledgeRoll'], [{x:1},'ledgeClimb'], [{attack:true},'attack'], [{jump:true},'jump']]) {
    const events=[];
    const w=new Battle({...config,p1:kind}, name=>events.push(name)), f=w.dogs[0];
    w.hangLedge(f,lip(w,true));
    f.ledgeTime=(f.ledge.hangFrames-1)*tick;
    step(w,0,button);
    assert(!f.ledge && !events.includes('ledgeSlip'));
    if(action==='attack') assert.equal(f.attack?.moveId,f.kit.ledgeAttack);
    else if(action==='jump') assert(f.vy<0);
    else assert.equal(f.floorAction?.type,action);
  }
});
test('six catches exhaust the grip across ledges, including the dodge and tether routes', () => {
  for (const route of ['fall','dodge','lasso']) for (const restore of ['ground','damage','stock']) {
    const w=new Battle({...config,p1:'noodle'}), [f,guard]=w.dogs;
    f.damage=120;
    for(let n=0;n<6;n++) {
      const edge=lip(w,n%2===0);
      w.hangLedge(f,edge);
      assert.equal(f.ledge.hangFrames,Math.max(75,120-18*n));
      assert.equal(f.ledge.protectedCatch,n===0);
      step(w,0,{y:1}); assert(!f.ledge);
      step(w,0);
    }
    const edge=lip(w,true);
    w.hangLedge(guard,edge);
    const occupied=guard.ledge;
    Object.assign(f,{x:edge.x-(route==='lasso'?85:16),y:edge.y+28,vx:0,vy:0,ground:-1,ledgeLock:0});
    for(let n=0;n<12;n++) {
      step(w,0,route==='dodge'?{shield:n===0}:route==='lasso'?{y:-1,special:n===0}:{});
      if(n===0 && route==='dodge') assert(f.airDodge);
      if(n===0 && route==='lasso') {assert.equal(f.attack?.moveId,'noodleLasso'); assert(!f.attack.anchor);}
      assert(!f.ledge); assert.equal(guard.ledge,occupied);
    }
    w.hangLedge(f,edge);
    assert(!f.ledge && guard.ledge===occupied);
    if(restore==='stock') w.spawn(f,true,false);
    else if(restore==='damage') w.dealDamage(f,3);
    else {
      Object.assign(f,{x:605,y:w.terrain[0].y,ground:0,vx:0,vy:0,attack:null,airDodge:null});
      step(w,0);
    }
    assert.equal(f.ledgeCatches,0);
    w.hangLedge(f,edge); assert(f.ledge?.protectedCatch && !guard.ledge);
  }
});
function exchange(mode,kind,left,route,seed) {
  const events=[];
  const w=new Battle({...config,mode,p1:kind,cpuLevel:'rival',ledgeTrapStart:mode==='solo'},
    (name,e)=>{if(name==='hit') events.push([e.f.index,e.moveId]);},seededRandom(seed));
  if(mode==='training') w.resetClimbPractice('patience',left?'left':'right',false);
  const [f,g]=w.dogs, dir=left?1:-1;
  let rolled=false, attacked=false;
  for(let n=0;n<170;n++) {
    const a={attack:n===0 && mode==='training'};
    if(route==='early' && n===5) a.x=dir;
    if(route==='roll' && !rolled && g.attack?.moveId==='brisketHaymaker' && g.attack.time>=5*tick) {
      a.shield=true; rolled=true;
    } else if(rolled && !attacked && !f.floorAction && !f.ledge) {
      a.attack=true; a.x=dir; attacked=true;
    }
    step(w,0,a);
    if(w.climbPractice?.outcome || (mode==='solo' && events.length))break;
  }
  return {w,events};
}
test('Rival punishes an early climb and Pip can punish the missed smash in a real stock match', () => {
  for(const seed of [4,42,113]) {
    const early=exchange('solo','pip',true,'early',seed), counter=exchange('solo','pip',true,'roll',seed);
    assert.deepEqual(early.events[0],[0,'brisketHaymaker']);
    assert.deepEqual(counter.events[0],[1,'pipStampKick']);
    assert.deepEqual(counter.w.dogs.map(f=>[f.stocks,f.damage]),[[3,120],[3,5]]);
    for(let n=0;n<130;n++)step(counter.w,0);
    assert(counter.w.matchFrames>130 && !counter.w.end);
  }
});
test('each fighter can clear the swing from either ledge and the drill restores the chosen roster', () => {
  for(const kind of Object.keys(fighters)) for(const left of [true,false]) {
    const {w}=exchange('training',kind,left,'roll',42);
    assert.equal(w.climbPractice.outcome,['pip','clover'].includes(kind)?'punished':'escaped');
    assert.equal(w.dogs[0].damage,120);
    const missed=exchange('training',kind,left,'wait',42);
    assert.equal(missed.w.climbPractice.outcome,'slipped');
    const other=new Battle({...config,mode:'training',p1:kind,p2:'clover'});
    other.resetClimbPractice('patience',left?'left':'right',true);
    assert.equal(other.dogs[1].kind,'brisket'); other.resetTraining();
    assert.deepEqual(other.dogs.map(d=>[d.kind,d.damage]),[[kind,0],['clover',0]]);
  }
});
test('a delayed remote ledge roll replaces a predicted slip and both peers confirm the local result', () => {
  const sample=w=>w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.ledge?.hangFrames,f.ledgeTime,f.ledgeCatches,
    f.ledgeProtectionReady,f.ledgeLock,f.floorAction?.type,f.floorAction?.time,f.damage,f.invuln]);
  for(const slot of [0,1]) {
    function prepare(w) {
      const f=w.dogs[slot]; f.damage=120;
      w.hangLedge(f,lip(w,slot===0)); f.ledgeTime=(f.ledge.hangFrames-4)*tick;
    }
    const ref=new Battle(config,undefined,seededRandom(7)); prepare(ref);
    const peers=[0,1].map(side=>{
      let world; const packets=[];
      const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=side; session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,config.p1,config.p2,config.stage,7]);
      for(const w of [world,session.match.confirmedWorld])prepare(w);
      return {world,net:session.match,packets};
    });
    const history=[sample(ref)]; let predictedSlip=false;
    for(let n=0;n<40;n++){
      const pair=[idleInput,idleInput]; pair[slot]=input({shield:n===3});
      ref.step(tick,...pair); history.push(sample(ref));
      for(const [s,p] of peers.entries()){
        if(n>=6)assert(p.net.receive(n-6,peers[1-s].packets[n-6]));
        p.net.tick(()=>pair[s],p.world);
        const guess=p.world.dogs[slot];
        if(s!==slot && ref.dogs[slot].floorAction && !guess.ledge && !guess.floorAction && guess.vy>0) predictedSlip=true;
        assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(predictedSlip);
    for(const [s,p] of peers.entries()){
      const remote=peers[1-s].packets;
      for(let i=p.net.received;i<remote.length;i++)assert(p.net.receive(i,remote[i]));
      p.net.confirm(p.world);
      assert.deepEqual(sample(p.net.confirmedWorld),sample(ref)); assert.deepEqual(sample(p.world),sample(ref));
    }
  }
});
