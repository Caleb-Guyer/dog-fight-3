const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,kits,arenas,seededRandom,idleInput}=window.DogFight;
const tick=1/60;
const timings={pip:[7,11,6,6],brisket:[14,14,9,9],noodle:[10,17,7,5],clover:[15,8,8,6]};

test('all four Rivals commit to the earlier landing habit and can be fooled on either side',()=>{
  for(const p2 of Object.keys(kits))for(const sign of [-1,1])for(const read of ['stay','through'])for(const roll of [false,true]){
    const hits=[],swings=[];
    const w=new Battle({mode:'solo',cpuLevel:'rival',p1:'pip',p2,stage:'nightmail',form:'flat',landingRead:read,fetch:false},
      (type,e)=>{if(type==='hit')hits.push([e.owner.index,e.moveId]);},seededRandom(42));
    if(sign<0)for(const d of w.dogs){d.face*=-1;d.x=w.stageWidth-d.x;d.vx*=-1;}
    for(let i=0;i<35;i++){
      w.step(tick,{...idleInput,shield:i===5,x:roll && i>=5 && i<15?sign:0});
      if(w.dogs[1].attack)swings.push(w.dogs[1].attack.moveId);
    }
    assert.equal(w.bot.coveredLanding,read);
    assert.equal(swings[0],kits[p2].tilts.down);
    assert.equal(hits.some(([owner,id])=>owner===1 && id===kits[p2].tilts.down),roll===(read==='through'),p2+' '+sign+' '+read);
    assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);assert.equal(w.end,null);
  }
});
test('ordinary Rival learns relative directions across sides, resets on a missed tech, and old checkpoints retain their decisions',()=>{
  const cfg={mode:'solo',cpuLevel:'rival',p1:'pip',p2:'brisket',stage:'nightmail'};
  const w=new Battle(cfg,undefined,seededRandom(42));
  function land(world,mirror,choice){
    const [f,g]=world.dogs,deck=world.terrain[0];
    Object.assign(f,{x:600,y:deck.y,ground:0});Object.assign(g,{x:600+65*mirror,y:deck.y,ground:0,face:-mirror});
    world.beginFloorAction(f,choice===null?'downed':choice?'techRoll':'tech',choice*mirror);
  }
  for(const mirror of [1,-1]){land(w,mirror,1);assert.equal(w.bot.coverTech,undefined);}
  land(w,1,0);
  assert.equal(w.bot.coverTech.choice,1);assert(w.terrain[0].x1+w.bot.coverTech.offset>w.dogs[0].x);
  assert.deepEqual(w.bot.landingHabit,{choice:0,count:1});
  delete w.bot.coverTech;land(w,1,null);assert.equal(w.bot.landingHabit.count,0);
  const legacy=new Battle(cfg,undefined,seededRandom(42));delete legacy.bot.landingHabit;
  w.copyFightFrom(legacy);
  for(let i=0;i<3;i++)land(w,1,0);
  assert.equal(w.bot.coverTech,undefined);assert.equal(w.bot.landingHabit,undefined);
});
test('a saved solo replay reproduces the commitment and Pip can jab the missed sweep in a real stock fight',()=>{
  const hits=[];
  const w=new Battle({mode:'solo',cpuLevel:'rival',p1:'pip',p2:'brisket',stage:'nightmail',landingRead:'through'},
    (t,e)=>{if(t==='hit')hits.push(e.moveId);},seededRandom(42));
  const tape=new window.DogFight.FinishTape(true);
  for(let i=0;i<46;i++){
    const a={...idleInput,shield:i===5,attack:i===30};
    tape.record(w,a,idleInput);w.step(tick,a);
  }
  assert.equal(hits[0],'pipJab');
  assert.deepEqual(w.dogs.map(d=>d.damage),[45,4]);
  const copy=tape.playback(13);assert.equal(copy.battle.bot.coverTech.choice,1);
  while(copy.step()){}
  assert.deepEqual(copy.battle.matchCard,w.matchCard);assert.deepEqual(copy.battle.bot,w.bot);
});

test('each dog commits to each requested tech on the mirrored training landings and escapes an idle chaser',()=>{
  for(const rival of Object.keys(kits))for(const stage of Object.keys(arenas))for(const dir of [-1,1]){
    const w=new Battle({p1:'pip',p2:rival,mode:'training',stage,fetch:false},()=>{},seededRandom(3));
    for(const [choice,direction] of [['stay',0],['away',dir],['through',-dir]]){
      w.resetChasePractice('readTech',dir,true,choice);
      let floor=null,seenOpening=false;
      for(let n=0;n<90 && w.chasePractice.phase!=='done';n++){
        w.step(tick,{...idleInput,attack:n===0});
        floor ||= w.dogs[1].floorAction;
        seenOpening ||= !!w.chasePractice.opened;
      }
      assert.equal(floor?.type,direction?'techRoll':'tech');
      assert.equal(floor.dir,direction);assert.equal(floor.techChoice,choice);
      assert(seenOpening);assert.equal(w.chasePractice.outcome,'escaped');assert.equal(w.chasePractice.tries,0);
    }
  }
});

test('landing reads score real hits and grabs, remember the punished option, and keep both roll paths onstage',()=>{
  const w=new Battle({p1:'pip',p2:'clover',mode:'training',stage:'picnic',fetch:false},()=>{},()=>.3);
  for(const reply of ['swing','grab','wait']){
    w.resetChasePractice('readTech',1,true);
    let sent=false;
    for(let n=0;n<100 && w.chasePractice.phase!=='done';n++){
      const [p,q]=w.dogs, a=q.floorAction, side=Math.sign(q.x-p.x)||p.face;
      const input={...idleInput,attack:n===0};
      if(reply==='swing' && a){
        input.x=side;
        if(a.time*60>=12 && !p.attack){input.x=side*.4;input.y=1;input.tapped={attack:true};}
      }else if(reply==='grab' && !sent && a && a.time*60>=10){input.grab=sent=true;}
      w.step(tick,input);
    }
    const d=w.chasePractice;
    if(reply==='swing'){assert.equal(d.choice,'away');assert.equal(d.outcome,'caught');assert(w.dogs[1].damage>0);}
    if(reply==='grab'){assert.equal(d.choice,'stay');assert.equal(d.outcome,'grabPunish');assert(w.grapple);}
    if(reply==='wait'){assert.equal(d.outcome,'escaped');assert.equal(d.caught,2);assert.equal(d.tries,3);}
  }
  for(const side of [-1,1]){
    const f=w.dogs[1],foe=w.dogs[0],p=w.terrain[0];
    f.x=side<0?p.x1+12:p.x2-12;f.vx=0;f.tumble={};foe.x=f.x-side*36;
    for(let i=0;i<101;i++){
      w.random=()=>(i+.1)/101;
      assert.notEqual(w.chooseLandingTech(f,foe,p),side);
    }
  }
});

test('from the same three-stock opening, running after a down throw changes Rival Clover’s recovery',()=>{
  function play(chase){
    let grabbed=false,thrown=false,choice;
    const w=new Battle({mode:'solo',cpuLevel:'rival',p1:'brisket',p2:'clover',stage:'picnic',fetch:false},(name,e)=>{
      if(name==='grabCatch' && e.f.index===0)grabbed=true;
      if(name==='throwRelease')thrown=true;
      if(name==='tech' && e.f.index===1)choice=[e.f.floorAction.techChoice,e.dir];
    },seededRandom(61));
    for(let n=0;n<220 && !choice;n++){
      const [a,b]=w.dogs,dir=Math.sign(b.x-a.x)||a.face;
      const input={...idleInput};
      if(!grabbed){input.x=dir;input.grab=Math.abs(b.x-a.x)<88;}
      else if(w.grapple?.phase==='hold')input.y=1;
      else if(thrown && chase)input.x=dir;
      w.step(tick,input);
    }
    assert(grabbed && thrown);assert(w.dogs.every(d=>d.stocks===3));return choice;
  }
  assert.deepEqual(play(false),['away',1]);assert.deepEqual(play(true),['through',-1]);
});

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
