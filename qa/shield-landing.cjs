const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,kits,arenas,idleInput,seededRandom} = window.DogFight;
const dt = 1/60, guard = {...idleInput,shield:true};
const config = {p1:'pip',p2:'clover',stage:'nightmail',fetch:false};

function runDash(p1,p2,delay,mode,legacy=false){
  const events=[];
  const w=new Battle({...config,p1,p2,mode,cpuLevel:'rival',dashPressure:true,stockCount:3,minutes:7},
    (name,e)=>{if(['block','hit','grabCatch'].includes(name))events.push([name,e.moveId]);},seededRandom(42));
  if(mode==='training')w.resetComboPractice('dashPressure');
  if(legacy)delete w.bot.readDashAttacks;
  const start=w.dogs.map(d=>[d.x,d.y,d.face,d.vx,d.stocks]);
  for(let n=0;n<=126;n++){
    const input=n<delay?{x:1}:n===delay?{attack:true,tapped:{attack:true}}:{shield:true};
    w.step(dt,{...idleInput,...input});
  }
  return {w,start,events};
}

test('all sixteen shield matchups read real running attacks and take the same opening into a stock fight',()=>{
  for(const p1 of Object.keys(kits))for(const p2 of Object.keys(kits))for(const delay of [0,14]){
    const practice=runDash(p1,p2,delay,'training'),fight=runDash(p1,p2,delay,'solo');
    const label=[p1,p2,delay].join(' '),drill=practice.w.comboPractice;
    assert.deepEqual(fight.start,practice.start,label);assert(fight.start.every(d=>d[4]===3));
    assert(drill.window.frames>0 && drill.window.gap>0,label);assert.equal(drill.phase,'done');
    const first=practice.events.findIndex(e=>e[0]!=='block'),blocks=p1==='clover'?2:1;
    assert.deepEqual(practice.events.slice(0,blocks),Array.from({length:blocks},()=>['block',kits[p1].dashAttack]),label);
    assert.deepEqual(fight.events.slice(0,blocks),practice.events.slice(0,blocks),label);
    if(drill.counter){
      assert.equal(first,blocks,label);
      assert.deepEqual(fight.events[first],practice.events[first],label);
      assert.equal(drill.counter.moveId,practice.events[first][1],label);
    }
  }
});

test('dash spacing changes the actual counter, preserves the previous read, and respects old recorded brains',()=>{
  const tip=runDash('brisket','pip',0,'training').w, close=runDash('brisket','pip',9,'training').w;
  assert.equal(tip.comboPractice.counter.moveId,kits.pip.air.forward);
  assert.equal(close.comboPractice.counter.moveId,kits.pip.grab);assert(tip.comboPractice.window.gap>close.comboPractice.window.gap);
  assert(!runDash('noodle','pip',0,'training').w.comboPractice.counter);
  assert.equal(runDash('noodle','noodle',0,'training').w.comboPractice.counter.moveId,kits.noodle.grab);
  assert(!runDash('brisket','pip',9,'training',true).w.comboPractice.counter);
  const old=tip.comboPractice;tip.step(dt,{...idleInput,attack:true,tapped:{attack:true}});
  assert.equal(tip.comboPractice.phase,'ready');assert.equal(tip.comboPractice.prior.counter,old.counter.moveId);
  for(let i=0;i<8;i++)tip.step(dt,{...idleInput,attack:true});
  assert.equal(tip.comboPractice.phase,'ready');tip.step(dt,idleInput);
  for(let i=0;i<9;i++)tip.step(dt,{...idleInput,x:1});
  tip.step(dt,{...idleInput,attack:true});for(let i=0;i<100;i++)tip.step(dt,guard);
  assert.equal(tip.comboPractice.counter.moveId,kits.pip.grab);
});

test('a front block opens a shield grab, pummel and throw; a cross-up opens each dog’s back air', () => {
  for (const dog of Object.keys(kits)) for (const dir of [-1,1])
    for (const response of ['front','dedicated','behind','miss','wait']) {
      const events = [];
      const w = new Battle({...config,mode:'training',p1:dog},(name,e)=>events.push({...e,name,id:e.moveId}));
      w.setDummyDamage(17);
      const front = response==='front' || response==='dedicated';
      w.resetShieldPractice('crossup',true,front?'front':'behind',dir);
      const drill=w.shieldPractice, [f,foe]=w.dogs;
      for (let i=0;i<20;i++) w.step(dt,idleInput);
      assert.equal(drill.phase,'ready');
      let read=0, pummel=false, aimThrow=false;
      for (let i=0;i<140;i++) {
        let input=guard;
        if (drill.landing) {
          read++;
          if (read===1 && response!=='wait') input=response==='behind' ? {...idleInput,jump:true,x:-dir} :
            {...guard,[response==='dedicated'?'grab':'attack']:true,x:response==='miss'?-dir:0,grabX:response==='miss'?-dir:0};
          if (read===2 && response==='behind') input={...idleInput,x:-dir,attack:true};
        }
        if (front && f.grip?.phase==='hold') {
          if (!pummel) { input={...guard,tapped:{attack:true}}; pummel=true; }
          else if (f.grip.pummelCount && !aimThrow) { input={...guard,x:dir,grabX:dir}; aimThrow=true; }
        }
        w.step(dt,input);
        if (front ? events.some(e=>e.name==='throwRelease') : drill.phase==='done') break;
      }
      assert.deepEqual(events.filter(e=>e.name==='shieldCue').map(e=>e.phase),['counter',front?'front':'behind']);
      const results=events.filter(e=>e.name==='shieldResult'); assert.equal(results.length,1);
      assert.equal(results[0].outcome,front?'punish':response==='behind'?'rearPunish':response==='miss'?'whiffGrab':'waited');
      if (front) {
        assert(events.some(e=>e.name==='grabCatch' && e.id===kits[dog].grab && e.grabStyle==='standing'));
        assert(events.some(e=>e.name==='pummelHit') && events.some(e=>e.name==='throwRelease'));
      } else if (response==='behind') assert(events.some(e=>e.name==='hit' && e.id===kits[dog].air.back));
      else assert.equal(foe.damage,17);
      if (front || response==='behind') assert(results[0].landingFrames>0);
      w.resetTraining();
      assert.deepEqual(w.dogs.map(f=>f.kind),[dog,'clover']); assert.equal(w.dogs[1].damage,17);
    }
});

test('mixed practice deals both sides, keeps the mirror and speed, and identifies the actual touchdown', () => {
  const w=new Battle({...config,mode:'training'},undefined,seededRandom(42)), landings=new Set();
  w.resetShieldPractice('crossup',true,'mix',-1);
  w.shieldPractice.slow=false;
  for (let i=0;i<16;i++) {
    w.resetShieldPractice('crossup');
    const d=w.shieldPractice;
    assert.equal(d.dir,-1); assert.equal(d.slow,false); assert.equal(d.landingChoice,'mix');
    for (let n=0;n<60 && !d.landing;n++) w.step(dt,guard);
    const [f,a]=w.dogs;
    assert.equal(d.landing,(a.x-f.x)*f.face<0?'behind':'front');
    assert.equal(d.landing,d.cross?'behind':'front');landings.add(d.landing);
  }
  assert.equal(landings.size,2);
});

test('Rival reads three-stock landings across the roster and stages and declines an unsafe back air', () => {
  for (const stage of Object.keys(arenas)) for (const dog of Object.keys(kits))
    for (const dir of [-1,1]) for (const cross of [false,true]) {
      const events=[];
      const w=new Battle({...config,p1:'brisket',p2:dog,stage,mode:'solo',cpuLevel:'rival',shieldLanding:{dir,cross}},
        (name,e)=>events.push([name,e.moveId]),seededRandom(42));
      const [a,f]=w.dogs;
      assert.deepEqual(w.dogs.map(d=>[d.stocks,d.damage]),[[3,0],[3,0]]);
      assert.equal(w.matchFrames,0);assert.equal(w.clockFrames,7*3600);
      assert(f.shieldStun>0 && w.bot.blockedSwing===a.attack && w.bot.blockedSwing);
      for (let n=0;n<45 && !events.some(e=>e[0]==='grabCatch'||e[0]==='hit');n++)
        w.step(dt,{...idleInput,x:-dir});
      assert(events.some(([name,id])=>cross ? name==='hit' && id===kits[dog].air.back : name==='grabCatch' && id===kits[dog].grab),
        [stage,dog,dir,cross].join(' '));
      if (!cross) continue;
      w.bot.blockedSwing={}; Object.assign(f,{shield:true,ground:0,impactLag:0,shieldStun:0,stun:0,command:null,grip:null});
      Object.assign(a,{ground:0,x:f.x-dir*48,y:f.y,stun:0,attack:null,landingLag:dt});
      assert(!w.shieldPunishInput(f,a)?.jump);
      a.landingLag=1; a.x=f.x-dir*280; w.bot.blockedSwing={};
      assert(!w.shieldPunishInput(f,a)?.jump);
    }
});

test('a real landing cancel makes Rival Brisket choose his faster up smash while the other back airs still punish', () => {
  for (const dog of Object.keys(kits)) for (const dir of [-1,1]) {
    const events=[];
    const w=new Battle({...config,p1:'brisket',p2:dog,mode:'solo',cpuLevel:'rival',shieldLanding:{dir,cross:true}},
      (name,e)=>events.push([name,e.moveId]),seededRandom(42));
    for (let n=0;n<22;n++) w.step(dt,{...idleInput,x:n<13?-dir:0,shield:n>=7});
    assert(events.some(([name,id])=>name==='landingCancel' && id===kits.brisket.air.down));
    const expected=dog==='brisket'?kits.brisket.smashes.up:kits[dog].air.back;
    assert(events.some(([name,id])=>name==='hit' && id===expected));
    assert(!events.some(([name])=>name==='block'));
  }
});

test('eight-frame rollback corrects predicted shield grabs and back airs in either player slot', () => {
  const stamp=w=>[w.hitStop,...w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.face,f.ground,f.damage,f.shield,
    f.shieldStun,f.landingLag,f.grip?.owner,f.grip?.phase,f.attack?.moveId,f.attack?.time])];
  for (const slot of [0,1]) for (const cross of [false,true]) {
    const dir=slot?-1:1;
    const cfg={...config,mode:'local',p1:slot?'brisket':'pip',p2:slot?'pip':'brisket'};
    const ref=new Battle(cfg,undefined,seededRandom(7));ref.placeShieldLanding(slot,dir,cross);
    const peers=[0,1].map(index=>{
      let world; const packets=[];
      const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=index;session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,cfg.p1,cfg.p2,cfg.stage,7]);
      for (const w of [world,session.match.confirmedWorld]) w.placeShieldLanding(slot,dir,cross);
      return {world,net:session.match,packets};
    });
    const history=[stamp(ref)];
    let divergent=false,connected=false;
    for (let n=0;n<68;n++) {
      const pair=[],reply=n===23;
      pair[1-slot]={...ref.landingApproach(dir,n===0),grabX:-dir};
      pair[slot]={...guard,x:cross&&reply?-dir:0,grabX:cross&&reply?-dir:0,attack:reply,jump:cross&&reply};
      ref.step(dt,...pair);history.push(stamp(ref));
      connected ||= cross?ref.dogs[1-slot].damage>0:ref.dogs[slot].grip?.owner===slot;
      for (const [i,p] of peers.entries()) {
        if (n>=8) p.net.receive(n-8,peers[1-i].packets[n-8]);
        p.net.tick(()=>pair[i],p.world);
        divergent ||= n>=23 && i!==slot && p.world.dogs[slot].attack?.moveId!==ref.dogs[slot].attack?.moveId;
        assert.deepEqual(stamp(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(connected && divergent);
    for (const [i,p] of peers.entries()) {
      const remote=peers[1-i].packets;
      for (let n=p.net.received;n<remote.length;n++) p.net.receive(n,remote[n]);
      p.net.confirm(p.world);assert.deepEqual(stamp(p.world),stamp(ref));
    }
  }
});
