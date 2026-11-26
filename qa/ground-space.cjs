const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,idleInput,kits,seededRandom}=window.DogFight;
const dt=1/60;
function exercise(kind,dir,pattern,plan,worn=false){
  const w=new Battle({p1:kind,p2:'brisket',stage:'nightmail',mode:'training'},undefined,seededRandom(42));
  w.resetFootworkPractice(pattern,dir,false,worn);
  const d=w.footworkPractice;
  let near=null;
  for(let n=0;n<240 && !d.outcome;n++){
    const [a,b]=w.dogs;
    if(near===null && Math.abs(b.x-a.x)<a.stats.width+b.stats.width+14)near=n;
    const brace=pattern==='brace';
    const x=plan==='retreat'?-dir:brace?(plan==='roll' && near!==null && n>near?dir:0):dir;
    w.step(dt,{...idleInput,x,attack:brace && n===0,shield:plan==='guard' || plan==='roll' && near!==null,
      jump:plan==='hop' && n>=5 && n<21,grab:plan==='grab' && n===near});
  }
  return {outcome:d.outcome,distance:d.distance,damage:w.dogs.map(f=>f.damage)};
}
test('a fresh shield holds the chalk in both directions for each dog and worn shields give up more ground',()=>{
  for(const kind of Object.keys(kits))for(const dir of [-1,1]){
    const play=(plan,worn)=>exercise(kind,dir,'brace',plan,worn);
    const still=play('stand'),fresh=play('guard'),worn=play('guard',true);
    assert.equal(still.outcome,'lostLine');assert.equal(fresh.outcome,'heldLine');
    assert(fresh.distance<worn.distance && worn.distance<still.distance);
    assert.deepEqual(fresh.damage,[0,0]);
    assert.equal(play('roll').outcome,'crossed');assert.equal(play('grab').outcome,'caughtRunner');
    assert.equal(play('retreat').outcome,'gaveRoom');
    assert.equal(exercise(kind,dir,'center','push').outcome,'tookGround');
    assert.equal(exercise(kind,dir,'center','hop').outcome,'crossed');
  }
  assert.equal(exercise('pip',1,'brace','guard').distance,22);
  assert.equal(exercise('pip',1,'brace','stand').distance,48);
});
test('an old snapshot uses original body weights and guarding after a braking slide requires planted paws',()=>{
  const cfg={p1:'pip',p2:'brisket',stage:'nightmail',mode:'local'};
  const w=new Battle(cfg),legacy=new Battle({...cfg,groundSpace:false});
  const position=(battle,sliding)=>{
    const [a,b]=battle.dogs;
    Object.assign(a,{x:600,ground:0,shield:true,shieldHP:1,brakingShield:sliding});
    Object.assign(b,{x:642,ground:0});
    battle.separateGroundedFighters();
    return a.x;
  };
  const planted=position(w,false),slide=position(w,true),old=position(legacy,false);
  assert(planted>slide);assert.equal(slide,old);
  w.copyFightFrom(legacy);assert(!w.groundSpace);assert.equal(position(w,false),old);
});
test('late guard inputs roll back the shove and reconcile both peers to the local fight',()=>{
  const cfg={p1:'pip',p2:'brisket',stage:'nightmail',mode:'local',fetch:false};
  const place=w=>{for(const [i,f] of w.dogs.entries())Object.assign(f,{x:i?675:600,face:i?-1:1,ground:0,y:w.terrain[0].y});};
  const state=w=>w.dogs.map(f=>[f.x,f.vx,f.ground,f.shield,f.shieldHP,f.grip?.phase,f.damage]);
  const ref=new Battle(cfg,undefined,seededRandom(17));place(ref);
  const peers=[0,1].map(side=>{
    let world;const packets=[];
    const s=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
    s.groundSpace=true;s.side=side;s.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
    s.beginRound(['start',1,cfg.p1,cfg.p2,cfg.stage,17]);place(world);place(s.match.confirmedWorld);
    return {world,net:s.match,packets};
  });
  const history=[state(ref)];let predictedDifferent=false;
  for(let n=0;n<65;n++){
    const pair=[{...idleInput,shield:n>=9 && n<40},{...idleInput,x:n<44?-1:0}];
    ref.step(dt,...pair);history.push(state(ref));
    for(const [side,p] of peers.entries()){
      if(n>=8)p.net.receive(n-8,peers[1-side].packets[n-8]);
      p.net.tick(()=>pair[side],p.world);
      assert.deepEqual(state(p.net.confirmedWorld),history[p.net.confirmed]);
      if(n>=9 && n<17 && side===1 && p.world.dogs[0].x!==ref.dogs[0].x)predictedDifferent=true;
    }
  }
  assert(predictedDifferent);
  for(const [i,p] of peers.entries()){
    for(let n=p.net.received;n<peers[1-i].packets.length;n++)p.net.receive(n,peers[1-i].packets[n]);
    p.net.confirm(p.world);assert.deepEqual(state(p.world),state(ref));
  }
});
