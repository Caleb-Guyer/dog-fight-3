const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, kits, arenas, idleInput, seededRandom} = window.DogFight;
const dt=1/60, seed=42;
const input=(x=0,buttons={})=>({...idleInput,x,grabX:x,...buttons});
const config=(p1,p2,stage='picnic',mode='training')=>({p1,p2,stage,mode,fetch:false});

test('both routes reach real shields in all matchups and arenas, with normal throws after the catch',()=>{
  for(const p1 of Object.keys(kits))for(const p2 of Object.keys(kits))
    for(const stage of Object.keys(arenas))for(const dir of [-1,1]){
      for(const route of ['direct','boostGrab','boostPivot']){
        const w=new Battle(config(p1,p2,stage),()=>{},seededRandom(seed));
        w.resetFootworkPractice(route==='direct'?'boostGrab':route,dir);
        const d=w.footworkPractice;
        for(let i=0;i<80 && d.phase!=='done';i++){
          const grab=route==='direct'?i===0:d.phase==='cancelNow';
          w.step(dt,input(grab && route==='boostPivot'?-dir:dir,{attack:route!=='direct'&&i===0,grab}));
        }
        if(route==='direct'){
          assert.equal(d.outcome,'shortReach');
          assert(d.closestGap>0);
        }else{
          const back=route==='boostPivot';
          assert.equal(d.outcome,back?'boostPivotCatch':'boostCatch',p1+'/'+p2+'/'+stage);
          assert.equal(w.grapple.grabId,back?kits[p1].pivotGrab:kits[p1].dashGrab);
          assert.equal(w.grapple.face,back?-dir:dir);
          for(let i=0;i<120 && w.grapple;i++)
            w.step(dt,w.grapple.phase==='hold'?input(0,{y:-1}):idleInput);
          assert(w.dogs[1].damage>0);
          assert(w.dogs[0].moveHistory.some(entry=>entry.moveId===kits[p1].throws.up));
        }
      }
    }
});

function attempt(kind,delay,reverse=false,freeze=false){
  let cues=0;
  const w=new Battle(config(kind,'pip'),name=>{if(name==='boostGrab')cues++;},seededRandom(seed));
  const f=w.dogs[0];f.x=450;w.dogs[1].x=990;
  for(let i=0;i<20;i++)w.step(dt,input(1));
  w.step(dt,input(1,{attack:true,grab:delay===0}));
  for(let i=1;i<delay;i++)w.step(dt,input(1));
  if(freeze)w.hitStop=3*dt;
  w.step(dt,input(reverse?-1:1,{grab:true}));
  if(freeze)for(let i=0;i<3;i++)w.step(dt,idleInput);
  return {w,f,cues};
}
test('only a fresh grab in the first two dash-attack frames converts, including a tap through hit freeze',()=>{
  for(const kind of Object.keys(kits)){
    for(const t of [1,2])for(const reverse of [false,true])for(const frozen of [false,true]){
      const {f,cues}=attempt(kind,t,reverse,frozen);
      assert.equal(f.attack?.moveId,reverse?kits[kind].pivotGrab:kits[kind].dashGrab);
      assert(f.attack.boostGrab && f.vx>0);
      assert.equal(f.face,reverse?-1:1);
      assert.equal(cues,1);
    }
    const direct=attempt(kind,0);
    assert.equal(direct.f.attack.moveId,kits[kind].dashGrab);
    assert(!direct.f.attack.boostGrab);
    const late=attempt(kind,3);
    assert.equal(late.f.attack.moveId,kits[kind].dashAttack);
    assert.equal(late.cues,0);
    const turn=attempt(kind,1);
    const speed=turn.f.vx;
    turn.w.step(dt,input(-1));
    assert.equal(turn.f.attack.moveId,kits[kind].pivotGrab);
    assert(turn.f.attack.boostGrab && turn.f.vx>0 && turn.f.vx<speed);
  }
});

test('Brisket commits from stock spawns and Pip can spot-dodge and jab the missed Freight Hug',()=>{
  for(const dodge of [false,true]){
    let cue, frame=0;const contacts=[];
    const w=new Battle({...config('pip','brisket','picnic','solo'),cpuLevel:'rival'},(k,e)=>{
      if(k==='boostGrab')cue=frame;
      if(k==='grabCatch' || k==='hit')contacts.push([k,e.moveId]);
    },seededRandom(seed));
    for(;frame<52;frame++){
      const after=frame-cue;
      w.step(dt,input(frame<15?1:0,{shield:frame>=15 && (!dodge || !(after>=15)),
        y:dodge && after===4?1:0, attack:dodge && after===15}));
    }
    assert.equal(cue,24);
    assert.deepEqual(contacts[0],dodge?['hit','pipJab']:['grabCatch','brisketFreightHug']);
    assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
  }
});

const combat=w=>[w.hitStop,w.grapple?.grabId,w.grapple?.phase,...w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,
  f.face,f.damage,f.stocks,f.ground,f.stun,f.attack?.moveId,f.attack?.time,!!f.attack?.boostGrab])];
test('a late remote grab input corrects a predicted dash attack for either player',()=>{
  for(const slot of [0,1])for(const pivot of [false,true]){
    const c=config('brisket','clover','picnic','local'), dir=slot?-1:1;
    const w=new Battle(c,()=>{},seededRandom(seed));
    const peers=[0,1].map(side=>{
      let world;const packets=[];
      const s=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,()=>{},r);}});
      s.side=side;s.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      s.beginRound(['start',1,c.p1,c.p2,c.stage,seed]);
      return {world,net:s.match,packets};
    });
    const history=[combat(w)];let sawBoost=false,corrected=false;
    for(let i=0;i<90;i++){
      const pad=input(i<=30?dir:i===31 && pivot?-dir:0,{attack:i===30,grab:i===31});
      const pair=slot?[idleInput,pad]:[pad,idleInput];
      w.step(dt,...pair);history.push(combat(w));
      sawBoost ||= !!w.dogs[slot].attack?.boostGrab;
      for(const [side,p] of peers.entries()){
        if(i>=6)assert(p.net.receive(i-6,peers[1-side].packets[i-6]));
        p.net.tick(()=>pair[side],p.world);
        if(side!==slot && w.dogs[slot].attack?.boostGrab && !p.world.dogs[slot].attack?.boostGrab)corrected=true;
        assert.deepEqual(combat(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(sawBoost && corrected);
    for(const [side,p] of peers.entries()){
      const other=peers[1-side].packets;
      for(let i=p.net.received;i<other.length;i++)assert(p.net.receive(i,other[i]));
      p.net.confirm(p.world);assert.deepEqual(combat(p.world),combat(w));
    }
  }
});
