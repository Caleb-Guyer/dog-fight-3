const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,kits,arenas,seededRandom,idleInput}=window.DogFight;
const tick=1/60;
const timings={pip:[7,11,6,6],brisket:[14,14,9,9],noodle:[10,17,7,5],clover:[15,8,8,6]};

test('each side of a missed tech has its own contact frame, damage, and shield punish in the drill',()=>{
  for(const p1 of Object.keys(kits)) for(const p2 of Object.keys(kits)) for(const stage of Object.keys(arenas))
    for(const dir of [-1,1]) for(const back of [false,true]) for(const answer of ['take','block','grab','parry']){
      const w=new Battle({mode:'training',p1,p2,stage,fetch:false},()=>{},seededRandom(4));
      w.resetChasePractice(back?'baitBack':'bait',dir);
      const d=w.chasePractice, contact=timings[p2][Number(back)];
      let blocked=false,parried=false;
      for(let n=0;n<160 && d.phase!=='done';n++){
        const attack=w.dogs[1].attack;
        const release=answer==='parry' && attack?.floorAttack && attack.time*60+1e-6>=contact-3;
        const touch=d.contactFrame!==undefined;
        const input={...idleInput,attack:n===0,shield:n>0 && answer!=='take' && !release && !parried};
        if(answer==='grab' && touch && !blocked){input.grab=true;blocked=true;}
        if(answer==='parry' && touch && !parried){input.attack=true;parried=true;}
        w.step(tick,input);
      }
      assert.equal(d.contactFrame,contact);
      assert.equal(d.contactSide,back?'behind':'in front');
      const slowGrab=p1==='noodle' && (back && ['pip','noodle'].includes(p2) || !back && p2==='clover');
      const outcome={take:'sweep',block:'heldGuard',grab:slowGrab?'lateGrab':'grabPunish',parry:'punished'}[answer];
      assert.equal(d.outcome,outcome,[p1,p2,stage,dir,back,answer].join('/'));
      assert.equal(w.dogs[0].damage,answer==='take'?timings[p2][2+Number(back)]:0);
    }
});

// Start with the ordinary three-stock spawns. Brisket runs in, grabs and down throws.
// Record only player inputs so the exact same exchange can be played over delayed peers.
function stock(kind,slot,guard,solo=false){
  const c={mode:solo?'solo':'local',p1:slot?kind:'brisket',p2:slot?'brisket':kind,
    stage:'picnic',fetch:false,cpuLevel:'rival'};
  const inputs=[],events=[];
  let grabbed=false,swing=false,blockedAt=-2,frame=0;
  const w=new Battle(c,(type,e)=>{
    if(type==='grabCatch')grabbed=true;
    if(type==='getup' && e.type==='floorAttack')swing=true;
    if(type==='block')blockedAt=frame;
    if(['hit','block','getup','tech','grabCatch'].includes(type))events.push([type,e.moveId||e.type]);
  },seededRandom(4));
  for(;frame<218;frame++){
    const f=w.dogs[slot],q=w.dogs[1-slot],gap=Math.abs(q.x-f.x),dir=Math.sign(q.x-f.x)||f.face;
    const a={...idleInput},b={...idleInput};
    if(!grabbed){a.x=dir;a.grab=gap<88;}
    else if(w.grapple){if(w.grapple.phase==='hold')a.y=1;}
    else if(!swing){
      if(gap>f.stats.width+q.stats.width+2)a.x=dir;
      else if(guard==='early' && (q.floorAction || q.ground<0))a.shield=true;
    }else if(guard){a.shield=true;a.grab=frame===blockedAt+1;}
    b.attack=q.floorAction?.type==='downed' && q.floorAction.time>.13;
    const pair=slot?[b,a]:[a,b];
    inputs.push(pair);
    w.step(tick,...pair);
  }
  return {inputs,events,c,w};
}

test('Rival Clover rolls against early shield, swings into a waiting chaser, and can be baited into Bear Hug',()=>{
  const take=stock('clover',0,false,true),late=stock('clover',0,'late',true),early=stock('clover',0,'early',true);
  assert(take.events.some(([k,id])=>k==='hit' && id==='cloverReverseRim'));
  assert(late.events.some(([k,id])=>k==='block' && id==='cloverReverseRim'));
  assert(late.events.some(([k,id])=>k==='grabCatch' && id==='brisketBearHug'));
  assert(early.events.some(([k,id])=>k==='getup' && id==='getupRoll'));
  assert(!early.events.some(([,id])=>id==='cloverReverseRim'));
});

const state=w=>[w.hitStop,w.grapple?.grabId,w.grapple?.phase,...w.dogs.map(f=>[
  f.x,f.y,f.vx,f.vy,f.damage,f.stocks,f.face,f.shield,f.shieldStun,f.stun,f.floorAction?.type,
  f.floorAction?.time,f.attack?.moveId,f.attack?.time,!!f.attack?.connected])];
test('late inputs on either slot reproduce the actual down throw, get-up attack, block, and catch',()=>{
  for(const kind of Object.keys(kits))for(const slot of [0,1]){
    const {inputs,events,c}=stock(kind,slot,'late');
    assert(events.some(([k,id])=>k==='block' && id===kits[kind].floorAttack));
    assert(events.some(([k,id])=>k==='grabCatch' && id==='brisketBearHug'));
    const w=new Battle(c,()=>{},seededRandom(4)),frames=[state(w)];
    const peers=[0,1].map(side=>{
      let world;const packets=[];
      const session=new window.DogOnline.OnlineSession({start(config,r){world=new Battle(config,()=>{},r);}});
      session.side=side;session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,c.p1,c.p2,c.stage,4]);
      return {net:session.match,world,packets};
    });
    for(const [n,pair] of inputs.entries()){
      w.step(tick,...pair);frames.push(state(w));
      for(const [side,p] of peers.entries()){
        if(n>=7)assert(p.net.receive(n-7,peers[1-side].packets[n-7]));
        p.net.tick(()=>pair[side],p.world);
        assert.deepEqual(state(p.net.confirmedWorld),frames[p.net.confirmed]);
      }
    }
    for(const [side,p] of peers.entries()){
      const remote=peers[1-side].packets;
      for(let n=p.net.received;n<remote.length;n++)assert(p.net.receive(n,remote[n]));
      p.net.confirm(p.world);assert.deepEqual(state(p.world),state(w));
    }
  }
});
