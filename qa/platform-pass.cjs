const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,idleInput,kits,seededRandom}=window.DogFight;
const config={mode:'local',stage:'bandstand',p1:'pip',p2:'brisket',fetch:false};
const dt=1/60;
const input=change=>({...idleInput,...change});
function dropPosition(w,slot) {
  const f=w.dogs[slot],g=w.dogs[1-slot];
  Object.assign(f,{ground:-1,x:504,y:225,vy:190,face:1,jumps:0,usedDodge:true,usedUp:true});
  Object.assign(g,{ground:0,x:522,y:480,face:-1});
}
test('both players choose three different landings without spending or refreshing an air resource',()=>{
  for(const kind of Object.keys(kits))for(const slot of [0,1])for(const target of [3,1,0]){
    const passes=[];
    const w=new Battle({...config,p1:kind,p2:kind},(k,e)=>{if(k==='airPlatformPass')passes.push(e.platform);});
    dropPosition(w,slot);const f=w.dogs[slot];
    for(let n=0;n<120 && f.ground<0;n++) {
      const held=target===0 || (target===1 && !passes.length) || n===0;
      const pair=[idleInput,idleInput];pair[slot]=input({y:held?1:0});w.step(dt,...pair);
      if(f.ground<0)assert(f.usedUp && f.usedDodge && !f.jumps);
    }
    assert.deepEqual(passes,target===3?[]:target===1?[3]:[3,1]);
    assert.equal(f.ground,target);assert.equal(f.jumps,2);
  }
});
test('an aerial or tumble still contacts a thin floor, and a late flick can fast-fall onto it',()=>{
  for(const state of ['aerial','tumble','late']){
    const w=new Battle(config),f=w.dogs[0];dropPosition(w,0);
    if(state==='tumble'){f.stun=.6;w.startTumble(f,false);}
    if(state==='late')f.y=285;
    for(let n=0;n<75 && f.ground<0;n++)w.step(dt,input({y:1,aimStick:state==='aerial' && n===0,smashY:-1}),idleInput);
    assert.equal(f.ground,3,state);
  }
});
test('a moving ferry can be crossed and the solid gate below catches the dog',()=>{
  const passes=[];const w=new Battle({...config,stage:'canal'},(k,e)=>{if(k==='airPlatformPass')passes.push(e.platform);});
  const f=w.dogs[0];Object.assign(f,{x:555,y:304,ground:-1,vy:100});
  for(let n=0;n<100 && f.ground<0;n++)w.step(dt,input({y:1}),idleInput);
  assert.deepEqual(passes,[1]);assert.equal(f.ground,0);
});
test('every matchup can fast-fall through both perches and score a real aerial in practice',()=>{
  for(const p1 of Object.keys(kits))for(const p2 of Object.keys(kits)){
    const w=new Battle({...config,mode:'training',stage:'laundry',p1,p2});
    w.resetPlatformPractice('layers');const d=w.platformPractice;
    let diving=false,swung=false;
    for(let n=0;n<110 && !d.outcome;n++) {
      if(d.phase==='apex')diving=true;
      const attack=!swung && d.phase==='fall';if(attack)swung=true;
      w.step(dt,input({jump:n<8,y:diving && (!swung || p1==='brisket')?1:0,attack}));
    }
    assert.equal(d.outcome,'aerial',p1+' vs '+p2);assert(w.dogs[1].damage>0);
    w.resetTraining();assert.equal(w.stage,'laundry');
  }
});
test('a descending Rival attacks through both perches in a three-stock fight',()=>{
  for(const kind of Object.keys(kits)){
    const passes=[],hits=[];
    const w=new Battle({...config,mode:'solo',cpuLevel:'rival',p1:'brisket',p2:kind},(k,e)=>{
      if(k==='airPlatformPass' && e.f.index===1)passes.push(e.platform);
      if(k==='hit' && e.f.index===0)hits.push(e.moveId);
    },seededRandom(24));
    dropPosition(w,1);w.bot.timer=0;
    for(let n=0;n<80 && !hits.length;n++)w.step(dt,idleInput);
    assert.deepEqual(passes,[3,1]);assert.deepEqual(hits,[kits[kind].air[kind==='noodle'?'neutral':'down']]);
    assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
  }
});
test('late Down releases roll back a predicted pass to a real landing on either peer',()=>{
  const sample=w=>w.dogs.map(f=>[f.x,f.y,f.vy,f.ground,f.airPassHold,f.dropPlatform,f.fastFall,f.jumps,f.usedUp,f.usedDodge]);
  for(const slot of [0,1]){
    const ref=new Battle(config,undefined,seededRandom(42));dropPosition(ref,slot);
    const peers=[0,1].map(side=>{
      let world;const packets=[];
      const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=side;session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,config.p1,config.p2,config.stage,42]);
      for(const w of [world,session.match.confirmedWorld])dropPosition(w,slot);
      return {world,net:session.match,packets};
    });
    const history=[sample(ref)];let diverged=false;
    for(let n=0;n<55;n++){
      const pair=[idleInput,idleInput];pair[slot]=input({y:n<8?1:0});
      ref.step(dt,...pair);history.push(sample(ref));
      for(const [s,p] of peers.entries()){
        if(n>=7)p.net.receive(n-7,peers[1-s].packets[n-7]);
        p.net.tick(()=>pair[s],p.world);
        if(ref.dogs[slot].ground===1 && p.world.dogs[slot].y>ref.terrain[1].y+3)diverged=true;
        assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert.equal(ref.dogs[slot].ground,1);assert(diverged);
    for(const [s,p] of peers.entries()){
      const remote=peers[1-s].packets;
      for(let n=p.net.received;n<remote.length;n++)p.net.receive(n,remote[n]);
      p.net.confirm(p.world);assert.deepEqual(sample(p.world),sample(ref));
      assert.deepEqual(sample(p.net.confirmedWorld),sample(ref));
    }
  }
});
