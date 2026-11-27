const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');require('../docs/online.js');
const {Battle,kits,arenas,idleInput,seededRandom}=window.DogFight;
const dt=1/60,seed=26;
const input=(x,buttons={})=>({...idleInput,x,grabX:x,...buttons});
const stock=(p1,p2,extra={})=>({p1,p2,mode:'local',stage:'picnic',fetch:false,...extra});

function running(kind,dir,delay,buttons,enabled=true){
  const w=new Battle(stock(kind,'pip',{dashSmash:enabled}),()=>{},seededRandom(seed));
  const f=w.dogs[0];f.x=560;w.dogs[1].x=dir>0?1010:190;
  for(let i=0;i<18;i++)w.step(dt,input(dir));
  w.step(dt,input(dir,{attack:true}));
  for(let i=1;i<delay;i++)w.step(dt,idleInput);
  const start=f.x;w.step(dt,input(0,buttons));
  return {w,f,start};
}
test('each dog can carry a two-frame dash windup into its own grounded up smash and charge it',()=>{
  const travel=new Set();
  for(const kind of Object.keys(kits))for(const dir of [-1,1]){
    const up=kits[kind].smashes.up;
    for(const delay of [1,2]){
      const {w,f,start}=running(kind,dir,delay,{smash:true,smashY:-1});
      assert.equal(f.smashCharge.moveId,up);assert(f.smashCharge.dashCancel);
      assert(f.vx*dir>0);assert.equal(f.face,dir);
      w.step(dt,idleInput);assert(f.attack.dashCancel && !f.attack.fromJumpSquat);
      assert.equal(f.ground,0);
      while(f.attack && f.attack.time<f.attack.start)w.step(dt,idleInput);
      assert((f.x-start)*dir>1);if(delay===1)travel.add(Math.round((f.x-start)*dir*10)/10);
    }
    const {w,f}=running(kind,dir,1,{smash:true,smashY:-1});
    for(let n=0;n<42;n++)w.step(dt,input(0,{smash:true,smashY:-1}));
    assert.equal(f.vx,0);w.step(dt,idleInput);
    assert(f.attack.dashCancel && f.lastSmashPower>0 && !f.attack.slideDir);
    assert.equal(f.attack.moveId,up);
    for(const [delay,buttons,enabled] of [[3,{smash:true,smashY:-1},true],[1,{smash:true,smashY:1},true],
      [1,{smash:true,smashX:dir},true],[1,{aimStick:true,smashY:-1,tiltMode:true},true],
      [1,{shield:true,smash:true,smashY:-1},true],[1,{smash:true,smashY:-1},false]]){
      const {f}=running(kind,dir,delay,buttons,enabled);
      assert.equal(f.attack?.moveId,kits[kind].dashAttack);assert(!f.smashCharge);
    }
    assert(running(kind,dir,1,{aimStick:true,smashY:-1}).f.smashCharge.dashCancel);
  }
  assert.equal(travel.size,4,'each dog travels a different distance before the swing connects');
});
test('the practice hop can be caught in both directions for all matchups on all arenas',()=>{
  for(const p1 of Object.keys(kits))for(const p2 of Object.keys(kits))for(const stage of Object.keys(arenas))for(const dir of [-1,1]){
    const w=new Battle(stock(p1,p2,{stage,mode:'training'}),()=>{},seededRandom(seed));
    w.resetFootworkPractice('boostSmash',dir,false);
    const d=w.footworkPractice;
    for(let i=0;i<70 && d.phase!=='done';i++)
      w.step(dt,input(i===0?dir:0,{attack:i===0,smash:d.phase==='cancelNow',smashY:-1}));
    assert.equal(d.outcome,'boostSmashCatch',[p1,p2,stage,dir].join('/'));
    assert(w.dogs[1].damage>0 && w.dogs[0].ground>=0);
  }
});
const pose=w=>w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.stocks,f.damage,f.face,f.charge,f.chargeSlide,
  f.smashCharge?.moveId,!!f.smashCharge?.dashCancel,f.attack?.moveId,f.attack?.time,!!f.attack?.dashCancel]);
test('rollback restores a missed conversion on both seats; old snapshots retain the old dash swing',()=>{
  for(const slot of [0,1])for(const kind of Object.keys(kits)){
    const dir=slot?-1:1,c=stock(kind,kind),ref=new Battle(c,()=>{},seededRandom(seed));
    const peers=[0,1].map(side=>{
      let world;const sent=[];
      const s=new window.DogOnline.OnlineSession({start(config,r){world=new Battle(config,()=>{},r);}});
      s.side=side;s.dashSmash=true;s.send=p=>{if(p[0]==='input')sent[p[2]]=p[3];};
      s.beginRound(['start',1,kind,kind,c.stage,seed]);return {net:s.match,world,sent};
    });
    const history=[pose(ref)];let predictedWrong=false;
    for(let i=0;i<65;i++){
      const pair=[idleInput,idleInput];
      pair[slot]=input(i<=20?dir:0,{attack:i===20,smash:i===21,smashY:i===21?-1:0});
      ref.step(dt,...pair);history.push(pose(ref));
      for(const [side,p] of peers.entries()){
        if(i>=5)assert(p.net.receive(i-5,peers[1-side].sent[i-5]));
        p.net.tick(()=>pair[side],p.world);
        if(side!==slot && ref.dogs[slot].attack?.dashCancel && !p.world.dogs[slot].attack?.dashCancel)predictedWrong=true;
        assert.deepEqual(pose(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(predictedWrong);
    for(const [side,p] of peers.entries()){
      const other=peers[1-side].sent;
      for(let i=p.net.received;i<other.length;i++)assert(p.net.receive(i,other[i]));
      p.net.confirm(p.world);assert.deepEqual(pose(p.world),pose(ref));
    }
    ref.copyFightFrom(new Battle({...c,dashSmash:false}));assert(!ref.dashSmash);
  }
});

test('Rival reacts to a falling opponent in its dash windup, and leaves an out-of-reach target alone',()=>{
  for(const [kind,height] of Object.entries({pip:85,brisket:135,noodle:105,clover:135})){
    for(const gap of [15,240]){
      const w=new Battle(stock('pip',kind,{mode:'solo',cpuLevel:'rival',form:'flat'}),()=>{},seededRandom(99));
      const [player,rival]=w.dogs;
      // Play the run and first windup frame, then hand the same live dog to the Rival CPU.
      w.mode='local';player.x=260;rival.x=690;
      for(let i=0;i<15;i++)w.step(dt,idleInput,input(-1));
      w.step(dt,idleInput,input(-1,{attack:true}));
      Object.assign(player,{x:rival.x-gap,y:rival.y-height,ground:-1,vy:100,vx:0});
      w.mode='solo';w.step(dt,idleInput);
      assert.equal(!!rival.attack?.dashCancel,gap===15,kind);
      if(gap===15){
        assert.equal(rival.attack.moveId,kits[kind].smashes.up);
        for(let i=0;i<25;i++)w.step(dt,idleInput);
        assert(player.damage>0);
      }
    }
  }
});
