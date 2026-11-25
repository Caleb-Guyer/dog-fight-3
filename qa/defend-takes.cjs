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

function pressureTrial(p2, controls, damage=0, p1='brisket') {
  const c=config(p1,p2), events=[], tape=[];
  const w=new Battle(c,(kind,e)=>events.push([kind,e.moveId]),seededRandom(seed));
  w.resetComboPractice('record','punish',false);
  w.dogs[0].damage=damage;
  const decide=w.comboRivalInput.bind(w);
  w.comboRivalInput=(dt,frozen)=>{
    const answer=decide(dt,frozen);
    tape.push([player,answer]);
    return answer;
  };
  let player;
  for(let i=0;i<120;i++){
    player=input(controls(i));
    w.step(dt,player);
  }
  return {w,tape,events,counter:w.comboPractice.counter?.moveId};
}
const haymaker=i=>({smash:i===0});
const spaced=i=>({x:i<9?-1:0,smash:i===11,smashX:1});

test('a Rival can grab an unsafe smash, launch at high damage or decline an out-of-range punish',()=>{
  for(const [kind,kit] of Object.entries(kits)){
    const close=pressureTrial(kind,haymaker);
    assert.equal(close.counter,kit.grab);
    assert(close.events.some(([type,move])=>type==='hit' && move===kit.throws.forward));
    assert.equal(pressureTrial(kind,haymaker,80).counter,kit.smashes.up);
    const tip=pressureTrial(kind,spaced);
    assert(tip.events.some(([type,move])=>type==='block' && move==='brisketHaymaker'));
    assert.equal(tip.counter,kind==='noodle'?kit.grab:undefined);
    if(kind!=='noodle')assert(tip.tape.every(([,reply])=>!reply.tapped?.grab && !reply.tapped?.smash));
  }
});

test('a landing cancel changes the answer to the same blocked aerial, and an empty hop beats guard',()=>{
  const barrel=i=>({jump:i===0,shortHop:i===0,attack:i===18});
  const unsafe=pressureTrial('pip',barrel);
  assert.equal(unsafe.counter,'pipCollarTag');
  const safe=pressureTrial('pip',i=>({...barrel(i),shield:i>=21}));
  assert(safe.events.some(([type,move])=>type==='block' && move==='brisketCurl'));
  assert(safe.events.some(([type])=>type==='landingCancel'));
  assert.equal(safe.counter,undefined);
  const empty=pressureTrial('pip',i=>({jump:i===0,shortHop:i===0,grab:i===25,x:i===53?1:0,grabX:i===53?1:0}));
  assert.deepEqual(empty.w.comboPractice.contacts.map(c=>c.kind),['grab','throw']);
  assert.equal(empty.w.dogs[0].damage,0);
  assert.equal(empty.w.dogs[1].damage,12);
  const orbit=i=>({jump:i===0,shortHop:i===0,attack:i===16});
  const twoHits=pressureTrial('pip',orbit,0,'clover');
  assert.deepEqual(twoHits.w.comboPractice.contacts.map(c=>[c.kind,c.moveId]),[['block','cloverOrbit'],['block','cloverOrbit']]);
  assert.equal(twoHits.counter,'pipScissors');
  assert.equal(pressureTrial('pip',i=>({...orbit(i),shield:i>=30}),0,'clover').counter,undefined);
});

test('ordinary three-stock Rival Pip punishes an approaching Brisket from spawn',()=>{
  const events=[];
  const w=new Battle({...config('brisket','pip','picnic'),mode:'solo',cpuLevel:'rival',fetch:false},
    (kind,e)=>{if(kind==='grabCatch'||kind==='block')events.push([kind,e.moveId,e.f.index]);},seededRandom(75));
  for(let i=0;i<110;i++){
    const [a,b]=w.dogs,dx=b.x-a.x;
    w.step(dt,input({x:Math.abs(dx)>60?Math.sign(dx):0,smash:Math.abs(dx)<76 && i%22===0,smashX:Math.sign(dx)}));
  }
  assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
  assert.deepEqual(events.slice(0,2),[['block','brisketHaymaker',1],['grabCatch','pipCollarTag',1]]);
});

test('shield counters replay as ordinary local inputs on two delayed rollback peers',()=>{
  const c=config('brisket','pip');
  for(const damage of [0,80]){
    const trial=pressureTrial('pip',haymaker,damage);
    const ref=new Battle({...c,mode:'local'},()=>{},seededRandom(seed)), peers=[peer(0,c),peer(1,c)];
    for(const w of [ref,...peers.flatMap(p=>[p.world,p.net.confirmedWorld])]){
      w.resetTraining();w.dogs[0].damage=damage;
    }
    const history=[combat(ref)];
    for(const [i,pair] of trial.tape.entries()){
      ref.step(dt,...pair);
      history.push(combat(ref));
      for(const [side,p] of peers.entries()){
        if(i>=6)assert(p.net.receive(i-6,peers[1-side].packets[i-6]));
        p.net.tick(()=>pair[side],p.world);
        assert.deepEqual(combat(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert.deepEqual(combat(ref),combat(trial.w));
    for(const [side,p] of peers.entries()){
      const other=peers[1-side].packets;
      for(let i=p.net.received;i<other.length;i++)assert(p.net.receive(i,other[i]));
      p.net.confirm(p.world);
      assert.deepEqual(combat(p.world),combat(ref));
    }
  }
});
