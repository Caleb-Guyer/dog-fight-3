const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, idleInput, kits, moves, seededRandom} = window.DogFight;
const dt=1/60, cfg={mode:'local',p1:'pip',p2:'brisket',stage:'nightmail',fetch:false};
const input=a=>({...idleInput,...a});
function place(w,slot,dir) {
  const f=w.dogs[slot], g=w.dogs[1-slot];
  f.x=600;g.x=600+dir*(f.stats.width+g.stats.width); f.face=dir;g.face=-dir;
}
function step(w,slot,change) {
  const pair=[idleInput,idleInput]; pair[slot]=input(change); w.step(dt,...pair);
}
function takeoff(w,slot,style) {
  for(let n=0;n<4;n++) step(w,slot,{jump:style!=='tap'||n===0,shortHop:style==='hop',
    attack:style==='chord' && n===0});
  assert(w.dogs[slot].ground<0);
}
test('the takeoff sets aerial power for all four dogs, both slots and every aim',()=>{
  const directions={forward:{x:1},back:{x:-1},up:{y:-1},down:{y:1},neutral:{}};
  for(const kind of Object.keys(kits)) for(const slot of [0,1]) for(const style of ['full','tap','hop','chord'])
    for(const [side,aim] of Object.entries(style==='chord'?{neutral:{}}:directions)) {
      const w=new Battle({...cfg,p1:kind,p2:kind}), f=w.dogs[slot]; f.face=1;
      takeoff(w,slot,style);
      if(style!=='chord')step(w,slot,{attack:true,...aim});
      assert.equal(f.attack?.moveId,f.kit.air[side]);
      assert.equal(!!f.attack.shortHop,style!=='full');
    }
});
test('a jump after a short hop and an actual ledge catch restore regular aerials; specials keep their own power',()=>{
  for(const kind of Object.keys(kits)) {
    const w=new Battle({...cfg,p1:kind}),f=w.dogs[0];
    takeoff(w,0,'hop');step(w,0);step(w,0,{jump:true});step(w,0,{attack:true});
    assert.equal(f.attack?.airSide,'neutral'); assert(!f.attack.shortHop && !f.shortHopFlight);
    const edge=new Battle({...cfg,p1:kind}),p=edge.dogs[0],floor=edge.terrain[0];
    takeoff(edge,0,'tap'); Object.assign(p,{x:floor.x1-14,y:floor.y+15,vy:80});
    step(edge,0); assert(p.ledge && !p.shortHopFlight);
    step(edge,0,{jump:true});step(edge,0,{attack:true}); assert(p.attack && !p.attack.shortHop);
    const special=new Battle({...cfg,p1:kind});takeoff(special,0,'hop');
    step(special,0,{special:true});assert.equal(special.dogs[0].attack?.moveId,kits[kind].specials.neutral);
    assert(!special.dogs[0].attack.shortHop);
  }
});
test('sweet spots and stale moves use the same per-hit calculation, including shield pressure',()=>{
  for(const guard of [false,true]) for(const short of [false,true]) {
    const w=new Battle({...cfg,p1:'noodle'}),[f,g]=w.dogs;
    takeoff(w,0,short?'tap':'full');step(w,0,{attack:true,x:-1});
    const a=f.attack,id=f.kit.air.back,spot=moves[id].sweetSpot;
    assert.equal(a.moveId,id);assert.equal(!!a.shortHop,short);
    a.time=a.start; f.x=650; f.y=452; f.face=1;
    const [dx,dy]=spot.box;
    Object.assign(g,{x:f.x+dx,y:f.y+dy+g.stats.height*.52,ground:-1,shield:guard,face:1});
    if(guard)g.x-=window.DogFight.shieldBubble(g).r;
    f.moveHistory.unshift({moveId:id,shieldOnly:false});
    const hits=[];
    w.emit=(name,e)=>{if(name==='hit'||name==='block')hits.push([name,e]);};
    w.resolveMelee();assert.equal(hits.length,1);
    const [name,e]=hits[0];assert.equal(name,guard?'block':'hit');
    const expected=Math.round((moves[id].dmg+spot.bonus)*.91*(short?.85:1)*10)/10;
    if(guard){assert.equal(g.damage,0);assert(Math.abs((1-g.shieldHP)-expected*.027)<1e-8);}
    else assert.equal(g.damage,expected);
    assert.equal(f.moveHistory.length,2);
  }
});
test('the jump comparison measures the actual hits and free frame, keeps the prior result and restores the stage',()=>{
  for(const kind of Object.keys(kits)) for(const dir of [-1,1]) {
    const w=new Battle({...cfg,mode:'training',stage:'laundry',p1:kind});
    const results=[];
    for(const short of [true,false]) {
      w.resetSpacingPractice('airPower',dir,true);
      const d=w.spacingPractice,[f,g]=w.dogs;
      assert.equal(w.stage,'nightmail'); assert.equal(d.previous?.damage,results[0]?.damage);
      let swung=false;
      for(let n=1;n<=110 && !d.outcome;n++) {
        const attack=d.cued && !swung;
        if(attack)swung=true;
        step(w,0,{jump:true,shortHop:short,attack});
        if(d.outcome){assert.equal(d.frames,n);assert(f.ground>=0 && !f.attack && f.landingLag<=1e-8);}
      }
      assert.equal(d.outcome,'landed');assert.equal(d.result.short,short);
      assert(Math.abs(d.damage-g.damage)<1e-8);results.push(d.result);
    }
    assert(results[0].frames<results[1].frames);
    if(kind==='clover')assert.deepEqual(results.map(r=>[r.hits,r.damage]),[[2,7.7],[1,3]]);
    else assert.equal(results[0].damage,Math.round(results[1].damage*.85*10)/10);
    w.resetTraining();assert.equal(w.stage,'laundry');assert.equal(w.spacingPractice,null);
  }
});
test('holding Jump keeps the result on screen and the next press starts another comparison',()=>{
  const w=new Battle({...cfg,mode:'training'});
  w.resetSpacingPractice('airPower',1,false);
  const first=w.spacingPractice;
  for(let n=0;n<100 && !first.outcome;n++)step(w,0,{jump:true,attack:first.cued});
  assert.equal(first.outcome,'landed');
  for(let n=0;n<30;n++)step(w,0,{jump:true});
  assert.equal(w.spacingPractice,first);
  step(w,0);step(w,0,{jump:true,shortHop:true});
  const second=w.spacingPractice;
  assert.notEqual(second,first);assert.deepEqual(second.previous,first.result);
  for(let n=0;n<100 && !second.outcome;n++)step(w,0,{jump:true,shortHop:true,attack:second.cued});
  assert.equal(second.result.damage,5.1);
  assert.equal(second.previous.damage,6);
});
test('a late Jump release corrects hop height and damage on both rollback peers',()=>{
  const sample=w=>w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.shortHopFlight,f.attack?.moveId,
    f.attack?.shortHop,f.attack?.time,f.damage,f.stun,f.landingLag]);
  for(const slot of [0,1]){
    const config={...cfg,p1:slot?'brisket':'pip',p2:slot?'pip':'brisket'};
    const ref=new Battle(config,undefined,seededRandom(7));place(ref,slot,1);
    const peers=[0,1].map(side=>{
      let world;const packets=[];
      const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=side;session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,config.p1,config.p2,config.stage,7]);
      for(const w of [world,session.match.confirmedWorld])place(w,slot,1);
      return {world,net:session.match,packets};
    });
    const history=[sample(ref)];let corrected=false;
    for(let n=0;n<65;n++){
      const pair=[idleInput,idleInput];pair[slot]=input({jump:n===3,attack:n===23});
      ref.step(dt,...pair);history.push(sample(ref));
      for(const [s,p] of peers.entries()){
        if(n>=6)assert(p.net.receive(n-6,peers[1-s].packets[n-6]));
        p.net.tick(()=>pair[s],p.world);
        const predicted=p.world.dogs[slot];
        if(s!==slot && ref.dogs[slot].shortHopFlight && predicted.ground<0 && !predicted.shortHopFlight)corrected=true;
        assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(corrected);assert.equal(ref.dogs[1-slot].damage,5.1);
    for(const [s,p] of peers.entries()){
      const remote=peers[1-s].packets;
      for(let n=p.net.received;n<remote.length;n++)assert(p.net.receive(n,remote[n]));
      p.net.confirm(p.world);
      assert.deepEqual(sample(p.world),sample(ref)); assert.deepEqual(sample(p.net.confirmedWorld),sample(ref));
    }
  }
});
