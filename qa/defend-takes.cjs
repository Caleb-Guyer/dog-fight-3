const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, idleInput, seededRandom, kits, arenas} = window.DogFight;
const dt = 1/60, seed = 42;
const input = values => ({...idleInput, grabX:0, smashX:0, smashY:0, airDodgeX:0, airDodgeY:0, tapped:{}, ...values});
const config = (p1='pip',p2='brisket',stage='nightmail') => ({p1,p2,stage,mode:'training',fetch:true});
function arm(w) {
  const mark = w.comboPractice.markTime;
  w.step(dt,input({attack:true}));
  for(let i=1;i<29;i++) w.step(dt,idleInput);
  assert.equal(w.time,mark);
  assert.equal(w.comboPractice.phase,'countdown');
  assert.equal(w.comboPractice.tick,0);
}
function defend(w,reply) {
  arm(w);
  for(let i=0;i<220 && w.comboPractice.phase!=='done';i++)
    w.step(dt,input(reply(i)));
  assert.equal(w.comboPractice.phase,'done');
  return w.comboPractice;
}

test('the opening hop can hit or grab through a held shield in every fighter and arena combination',()=>{
  for(const p1 of Object.keys(kits)) for(const p2 of Object.keys(kits)) for(const stage of Object.keys(arenas)) {
    const w=new Battle(config(p1,p2,stage),()=>{},seededRandom(seed));
    for(const slot of [0,1]) {
      w.resetComboPractice('defend','stand',false,slot);
      assert.equal(w.trainingPlayerSlot,1);
      const d=defend(w,()=>({shield:true}));
      if(slot===0) {
        assert(d.contacts.some(c=>c.kind==='block' && c.moveId===kits[p1].air.neutral));
        assert.equal(d.damage,0);
      } else {
        assert.deepEqual(d.contacts.map(c=>c.kind),['grab','throw']);
        assert.equal(d.contacts[1].moveId,kits[p1].throws.forward);
      }
    }
  }
});

test('a new blind attempt waits for input, can repeat either slot, and scores a live parry or whiff punish',()=>{
  let pick=.25;
  const w=new Battle(config(),()=>{},()=>pick);
  w.resetComboPractice('mix','stand',true);
  const first=defend(w,i=>({shield:i<24}));
  assert.equal(first.playSlot,0);
  assert.deepEqual(first.contacts.map(c=>c.kind),['parry']);
  const tick=first.tick;
  for(let i=0;i<60;i++) w.step(dt,idleInput);
  assert.equal(first.tick,tick);
  pick=.75;
  const second=defend(w,i=>({shield:i<50,y:i===32?1:0,attack:i===51}));
  assert.equal(second.playSlot,1);
  assert.equal(second.prior.slot,0);
  assert.equal(second.damage,0);
  assert.deepEqual(second.counter,{kind:'hit',moveId:'brisketCheck',damage:7});
  const again=defend(w,()=>({shield:true}));
  assert.equal(again.playSlot,1);
  assert.equal(again.damage,7);
  w.resetTraining();
  assert.equal(w.trainingPlayerSlot,0);
});

function combat(w) {
  return [w.hitStop,w.grapple?.phase,w.grapple?.grabId,...w.dogs.map(f=>[
    f.x,f.y,f.vx,f.vy,f.ground,f.damage,f.stun,f.attack?.moveId,f.attack?.time,f.jumpSquat?.time,
    f.impactLag,f.shield,f.shieldStun,f.shieldHP,f.floorAction?.type,f.hitShift?.sector])];
}
function peer(side,c) {
  let world;
  const packets=[];
  const session=new window.DogOnline.OnlineSession({start(options,rng){ world=new Battle(options,()=>{},rng); }});
  session.side=side;
  session.send=packet=>{if(packet[0]==='input') packets[packet[2]]=packet[3];};
  session.beginRound(['start',1,c.p1,c.p2,c.stage,seed]);
  return {world,net:session.match,packets};
}
test('two independently recorded takes survive other drills and use real defender input on every frame of rollback',()=>{
  const c=config('clover','pip','laundry'), w=new Battle(c,()=>{},seededRandom(seed));
  for(let i=0;i<40;i++) w.step(dt);
  const mark=w.time, recordings=[];
  for(const slot of [0,1]){
    w.resetComboPractice('record','stand',false,slot);
    const take=[];
    for(let i=0;i<92;i++){
      const pad=slot ? input({grab:i===0,x:i===27?1:0,grabX:i===27?1:0}) :
        input({jump:i===20,tapped:{attack:[0,10,20].includes(i)}});
      take.push(structuredClone(pad));
      w.step(dt,pad);
      if(pad.tapped)pad.tapped.attack=false;
    }
    assert.deepEqual(w.comboTakes[slot],take);
    recordings.push(take);
  }
  w.resetPlatformPractice('hold');
  w.resetComboPractice('record','stand',false,0);
  for(let i=0;i<10;i++)w.step(dt,idleInput);
  assert.deepEqual(w.comboTakes,recordings);
  for(const slot of [0,1]){
    w.resetComboPractice('defend','stand',false,slot);arm(w);
    const ref=new Battle({...c,mode:'local'},()=>{},seededRandom(seed));
    const peers=[peer(0,c),peer(1,c)];
    for(const b of [ref,...peers.flatMap(p=>[p.world,p.net.confirmedWorld])]){
      b.time=mark; b.terrain=window.DogFight.platforms(c.stage,mark); b.resetTraining();
    }
    const history=[combat(ref)];
    for(let i=0;i<110;i++){
      const answer=slot ? input({shield:true,x:i===3?-1:0,grabX:i===3?-1:0}) :
        input({x:w.hitStop>0?1:0,grabX:w.hitStop>0?1:0});
      const pair=[recordings[slot][i] || idleInput,answer];
      w.step(dt,answer);ref.step(dt,...pair);
      assert.deepEqual(combat(w),combat(ref));
      history.push(combat(ref));
      for(const [side,p] of peers.entries()){
        if(i>=6) assert(p.net.receive(i-6,peers[1-side].packets[i-6]));
        p.net.tick(()=>pair[side],p.world);
        assert.deepEqual(combat(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    for(const [side,p] of peers.entries()){
      const other=peers[1-side].packets;
      for(let i=p.net.received;i<other.length;i++)assert(p.net.receive(i,other[i]));
      p.net.confirm(p.world);
      assert.deepEqual(combat(p.world),combat(w));
    }
    if(slot===0)assert(w.comboPractice.shifts>0);
    assert.deepEqual(w.comboTakes,recordings);
  }
});
