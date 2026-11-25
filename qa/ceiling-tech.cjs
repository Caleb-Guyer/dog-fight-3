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
