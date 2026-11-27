const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, fighters, seededRandom, idleInput} = window.DogFight;
const tick = 1/60;
const config = {mode:'local', stage:'picnic', p1:'noodle', p2:'pip', fetch:false};
const input = (changes={}) => ({...idleInput,...changes});
const hull = {picnic:30, laundry:225, bandstand:45, nightmail:114, canal:126};

function intoBrick(w,slot,dir){
  const f=w.dogs[slot],x=dir===1?511:689;
  Object.assign(f,{x:x+dir*(f.stats.width+5),y:534+f.stats.height*.52,vx:-dir*480,vy:-10,
    ground:-1,jumps:1,stun:.4,ledgeLock:.3,usedUp:true,usedDodge:true});
  w.startTumble(f,false);return f;
}
test('all four dogs can spring on each of nine brace frames on either wall with the protection left from contact',()=>{
  for(const kind of Object.keys(fighters))for(const dir of [-1,1])for(const frame of [1,2,3,4,5,6,7,8,9,10]){
    const events=[],w=new Battle({...config,stage:'laundry',p1:kind},(name,e)=>{if(name==='wallTechJump')events.push(e.delay);});
    const f=intoBrick(w,0,dir);
    w.step(tick,input({shield:true}),idleInput);
    assert.equal(f.wallAction.type,'wallTech');
    for(let n=1;n<=frame;n++)w.step(tick,input({jump:n===frame}),idleInput);
    if(frame===10){assert.deepEqual(events,[]);assert.equal(f.jumps,0);continue;}
    assert.deepEqual(events,[frame]);
    assert.equal(f.wallAction.type,'wallTechJump');assert.equal(f.wallAction.dir,dir);
    assert.equal(f.vx,dir*290);assert.equal(f.vy,-f.stats.jump*.92);
    assert(f.invuln<=Math.min(9,12-frame)/60+1e-8);assert.equal(f.jumps,1);
    assert(f.usedUp && f.usedDodge);assert.equal(f.jumpBuffer,0);
  }
});
test('Rival braces below a high guard and spends its wall spring only when the guard drops to cover the low exit',()=>{
  for(const dir of [-1,1])for(const follows of [true,false]){
    const w=new Battle({...config,stage:'laundry',mode:'solo',cpuLevel:'rival'},undefined,seededRandom(11));
    const f=intoBrick(w,1,dir),foe=w.dogs[0];f.tumble.willTech=true;
    Object.assign(foe,{ground:-1,x:f.x+dir*60,y:f.y-50,vy:0});
    w.step(tick,idleInput);assert.equal(f.wallAction?.type,'wallTech');
    for(let n=0;n<4;n++)w.step(tick,idleInput);
    if(follows)foe.y=f.y+25;
    w.step(tick,idleInput);
    assert.equal(f.wallAction.type,follows?'wallTechJump':'wallTech');assert.equal(f.jumps,1);
  }
});
test('a delayed remote Jump rewinds a planted tech on both seats and an older snapshot keeps its original brace',()=>{
  const cfg={...config,stage:'laundry'};
  const state=w=>w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.jumps,f.invuln,f.wallAction?.type]);
  for(const slot of [0,1]){
    const ref=new Battle(cfg,undefined,seededRandom(7));intoBrick(ref,slot,-1);
    const old=new Battle({...cfg,wallSpring:false},undefined,seededRandom(7));intoBrick(old,slot,-1);
    const peers=[0,1].map(side=>{
      let world;const sent=[];
      const s=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      s.wallSpring=true;s.side=side;s.send=p=>{if(p[0]==='input')sent[p[2]]=p[3];};
      s.beginRound(['start',1,cfg.p1,cfg.p2,cfg.stage,7]);
      for(const w of [world,s.match.confirmedWorld])intoBrick(w,slot,-1);
      return {world,net:s.match,sent};
    });
    const history=[state(ref)];let predictedBrace=false;
    for(let n=0;n<26;n++){
      const pair=[idleInput,idleInput];pair[slot]=input({shield:n===0,jump:n===5});
      ref.step(tick,...pair);old.step(tick,...pair);history.push(state(ref));
      if(n===5){assert.equal(ref.dogs[slot].wallAction.type,'wallTechJump');assert.equal(old.dogs[slot].wallAction.type,'wallTech');}
      for(const [side,p] of peers.entries()){
        if(n>=4)p.net.receive(n-4,peers[1-side].sent[n-4]);
        p.net.tick(()=>pair[side],p.world);
        if(n===5 && side!==slot)predictedBrace=p.world.dogs[slot].wallAction?.type==='wallTech';
        assert.deepEqual(state(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(predictedBrace);
    for(const [side,p] of peers.entries()){
      const other=peers[1-side].sent;
      for(let i=p.net.received;i<other.length;i++)p.net.receive(i,other[i]);
      p.net.confirm(p.world);assert.deepEqual(state(p.world),state(ref));
    }
    ref.copyFightFrom(old);assert(!ref.wallSpring);
  }
});
test('guided wall springs and low holds both return by lasso from either side without spending the air jump',()=>{
  for(const side of ['left','right'])for(const spring of [true,false]){
    const w=new Battle({...config,mode:'training'},undefined,seededRandom(12));w.resetWallPractice(side,'spring');
    const d=w.wallPractice,f=w.dogs[0];let cast=false,paused=0;
    for(let n=0;n<160&&!f.ledge;n++){
      if(d.waiting && !d.choice)paused++;
      const choose=paused>30 && d.phase==='brace';
      const special=d.phase==='done' && !f.wallAction && !cast;
      if(special){assert.equal(f.jumps,1);cast=true;}
      w.step(tick,input({attack:n===0||choose&&!spring,shield:d.phase==='flight',
        jump:choose&&spring,x:d.phase==='done'?d.inward:0,y:special?-1:0,special}),idleInput);
      if(paused>0 && paused<=30)assert.equal(f.wallAction.time,3/60);
    }
    assert(cast && f.ledge);assert.equal(d.outcome,spring?'wallTechJump':'wallTech');
    assert.equal(f.ledge.index,side==='left'?0:1);
  }
});

test('each solid section stops rising fighters at its underside while thin platforms remain passable', () => {
  for (const [stage, depth] of Object.entries(hull)) for (const kind of Object.keys(fighters)) {
    const w = new Battle({...config,stage,p1:kind}), f = w.dogs[0];
    for (const [i,p] of w.terrain.entries()) {
      const x = (p.x1+p.x2)/2, feet = p.y+depth+f.stats.height;
      if (p.thin) {
        assert.equal(w.solidContact(f,x,p.y+f.stats.height+3,x,p.y+f.stats.height-3),null);
        continue;
      }
      const hit = w.solidContact(f,x,feet+20,x,feet-20);
      assert.equal(hit?.ceiling?.index,i);
      assert.equal(hit.feet,feet);
      assert.equal(hit.t,.5);
      assert.equal(w.solidContact(f,x,feet-3,x,feet+18),null);
      Object.assign(f,{x,y:feet+5, ground:-1,vy:-680,vx:0,jumps:1,usedUp:true});
      w.step(tick,idleInput,idleInput);
      assert.equal(f.y,feet); assert.equal(f.vy,0);
      assert.equal(f.jumps,1); assert(f.usedUp); assert.equal(f.ground,-1);
    }
  }
});

function prepareLaunch(w,slot,speed) {
  const f=w.dogs[slot];
  Object.assign(f,{x:610,y:485+f.stats.height+22,ground:-1,vy:-speed,vx:0,stun:.35,jumps:1,usedUp:true});
  w.startTumble(f,false);
  f.tumble.fromHit=true;
  return f;
}
test('a diagonal rise can clear the alley but cannot cut through a bottom corner into the roof', () => {
  for(const side of [-1,1]){
    const w=new Battle({...config,stage:'laundry',p1:'pip'}), f=w.dogs[0], roof=w.terrain[side===1?0:1];
    const lip=side===1?roof.x2:roof.x1;
    Object.assign(f,{x:lip+side*8,y:757,ground:-1,vx:-side*380,vy:-1050,jumps:0});
    let passedInside=false;
    for(let n=0;n<42&&f.stocks===3&&!f.ledge;n++){
      const y=f.y;
      w.step(tick,input({x:-side}),idleInput);
      if(f.stocks===3&&y>roof.y&&f.y<=roof.y&&(f.x-lip)*side < -12)passedInside=true;
    }
    assert(!passedInside);
    assert.equal(w.solidContact(f,600,757,600,690),null);
  }
});
test('timing, tech lockout and upward impact speed govern the rebound on both slots', () => {
  for (const slot of [0,1]) for (const [speed,lock,shield,expect] of [
    [530,0,true,'ceilingTech'],[530,0,false,'ceilingBounce'],[530,.3,true,'ceilingBounce'],[1100,0,true,'ceilingBounce']]) {
    const events=[];
    const w=new Battle(config,(name,e)=>{if(name.startsWith('ceiling'))events.push([name,e.hard]);});
    const f=prepareLaunch(w,slot,speed); f.techLock=lock;
    const forecast=w.projectLaunch(f,0,-speed);
    assert.equal(forecast.contact,'ceiling');
    assert.equal(forecast.hardImpact,speed>900);
    for (let n=0;n<10&&!events.length;n++) {
      const tap=input({shield:n===0&&shield});
      w.step(tick,slot?idleInput:tap,slot?tap:idleInput);
    }
    assert.deepEqual(events,[[expect,speed>900]]);
    assert.equal(f.jumps,1); assert(f.usedUp); assert(!f.usedDodge);
    if(expect==='ceilingTech') {assert(!f.tumble && !f.stun); assert(f.invuln>0);}
    else assert(f.tumble && f.vy>0);
  }
});
test('the mirrored kick drill uses actual aerial contact and a lasso back to the ledge', () => {
  for(const side of ['left','right']) {
    const w = new Battle({...config,stage:'nightmail',mode:'training',p1:'brisket',p2:'clover'});
    w.resetWallPractice(side,'ceiling');
    const f=w.dogs[0], d=w.wallPractice, lip=side==='left'?160:1040;
    let tapped=false, cast=false;
    for(let n=0;n<70&&!f.ledge;n++) {
      const shield=!tapped&&d.phase==='flight'; tapped ||= shield;
      const outside=(f.x-lip)*d.inward<0;
      const special=d.outcome==='ceilingTech' && outside && !cast; cast ||= special;
      w.step(tick,input({attack:n===0,shield,x:d.phase==='done'?-d.inward:0,y:special?-1:0,special}),idleInput);
    }
    assert(tapped && cast && f.ledge); assert.equal(d.outcome,'ceilingTech');
    assert.equal(f.damage,97); assert.equal(f.ledge.x,lip);
    w.resetTraining();
    assert.deepEqual(w.dogs.map(dog=>dog.kind),['brisket','clover']); assert.equal(w.stage,'nightmail');
  }
});
test('the stock opening rewards clearing the hull and each Rival can route around either lip', () => {
  for(const drift of [false,true]) {
    const w=new Battle({...config,mode:'solo',cpuLevel:'rival',underTableStart:true},undefined,seededRandom(42));
    const f=w.dogs[0]; let fired=false;
    for(let n=0;n<100&&!f.ledge&&f.stocks===3;n++) {
      const special=!fired && (!drift || f.x<159); fired ||= special;
      w.step(tick,input({x:drift?-1:0,y:special?-1:0,special}),idleInput);
    }
    assert.equal(f.stocks,drift?3:2); assert.equal(!!f.ledge,drift);
  }
  for(const kind of Object.keys(fighters)) for(const dir of [-1,1]) {
    const w=new Battle({...config,p2:kind,mode:'solo',cpuLevel:'rival'},undefined,seededRandom(42));
    const f=w.dogs[1], lip=dir===1?160:1040;
    Object.assign(f,{x:lip+dir*23,y:495+f.stats.height,ground:-1,vy:0,vx:0,jumps:1});
    for(let n=0;n<115&&f.ground<0&&!f.ledge;n++)w.step(tick,idleInput,idleInput);
    assert(f.ledge || f.ground>=0,kind);assert.equal(f.stocks,3);
  }
});

test('a late remote Shield corrects a predicted ceiling bounce on either peer', () => {
  const sample=w=>w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.stun,f.tumble?.time,f.wallAction?.type,f.invuln,f.techLock,f.usedDodge]);
  for(const slot of [0,1]){
    const reference=new Battle(config,undefined,seededRandom(7)); prepareLaunch(reference,slot,530);
    const peers=[0,1].map(side=>{
      let world; const packets=[];
      const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=side;session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,config.p1,config.p2,config.stage,7]);
      for(const w of [world,session.match.confirmedWorld])prepareLaunch(w,slot,530);
      return {world,net:session.match,packets};
    });
    const history=[sample(reference)]; let wrongBounce=false;
    for(let n=0;n<24;n++){
      const pair=[idleInput,idleInput];pair[slot]=input({shield:n===1});
      reference.step(tick,...pair);history.push(sample(reference));
      for(const [s,p] of peers.entries()){
        if(n>=6)assert(p.net.receive(n-6,peers[1-s].packets[n-6]));
        p.net.tick(()=>pair[s],p.world);
        if(s!==slot && reference.dogs[slot].wallAction?.type==='ceilingTech' && p.world.dogs[slot].vy>0)wrongBounce=true;
        assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(wrongBounce);
    for(const [s,p] of peers.entries()){
      const remote=peers[1-s].packets;
      for(let i=p.net.received;i<remote.length;i++)assert(p.net.receive(i,remote[i]));
      p.net.confirm(p.world);assert.deepEqual(sample(p.world),sample(reference));
    }
  }
});
