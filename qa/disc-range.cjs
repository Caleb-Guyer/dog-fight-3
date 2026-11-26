const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
for(const file of ['engine','fighter-lessons','online'])require('../docs/'+file+'.js');
const {Battle,idleInput,seededRandom}=window.DogFight, school=window.FighterSchool;
const config={mode:'local',p1:'clover',p2:'noodle',stage:'nightmail',fetch:false};
const dt=1/60;
function shot(pitch,face,setup={},reply=()=>({})){
  const hits=[];let disc;
  const w=new Battle({...config,p2:setup.pip?'pip':'noodle',aimedDrive:!setup.legacy},(name,e)=>{
    if(name==='disc')disc=w.projectiles.at(-1);
    if(['hit','block','discReflect'].includes(name))hits.push([name,e.f.index,e.moveId]);
  },seededRandom(42));
  const [c,r]=w.dogs,deck=w.terrain[0];
  c.x=setup.edge?(face>0?deck.x2-12:deck.x1+12):600;c.face=face;
  r.x=setup.edge?600:c.x+(setup.gap??180)*face;r.face=-face;
  for(let n=0;n<110;n++){
    if(setup.edge && n===42)Object.assign(r,{x:c.x+face*120,y:deck.y+110,vy:-400,ground:-1,jumps:1,ledgeLock:.5});
    const input={...idleInput,smash:n<30,smashX:face,smashY:n>0?pitch:0};
    w.step(dt,input,{...idleInput,...reply(n,face)});
  }
  return {hits,disc};
}
test('Line Drive catches a jump or a low return on either side, and high fire leaves a grounded opponent alone',()=>{
  for(const face of [-1,1]){
    const hop=n=>({jump:n>=8 && n<23}),home=(n,f)=>({x:n>=42?-f:0});
    assert.equal(shot(-1,face,{},hop).hits[0][0],'hit');
    assert.deepEqual(shot(0,face,{},hop).hits,[]);
    assert.deepEqual(shot(-1,face,{legacy:true},hop).hits,[]);
    assert.deepEqual(shot(-1,face,{},()=>({y:1})).hits,[]);
    assert.equal(shot(1,face,{edge:true},home).hits[0][0],'hit');
    assert.deepEqual(shot(0,face,{edge:true},home).hits,[]);
    const grounded=shot(1,face,{gap:220});
    assert.deepEqual(grounded.hits,[]);assert.equal(grounded.disc.y,450);
    assert.equal(shot(0,face,{gap:100},()=>({shield:true})).hits[0][0],'block');
  }
});
test('Bark sends both pitched trajectories back and changes disc ownership',()=>{
  for(const face of [-1,1])for(const pitch of [-1,1]){
    const {disc,hits}=shot(pitch,face,{pip:true,gap:145},n=>({special:n===26}));
    assert(hits.some(h=>h[0]==='discReflect'));assert.equal(disc.owner,1);
    assert.equal(Math.sign(disc.vy),-pitch);assert.equal(Math.sign(disc.vx),-face);
  }
});
test('three normal shots clear the range, failed rounds and demonstrations preserve the personal best',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  for(const mode of ['example','miss','clear']){
    let trial;
    const w=new Battle({...config,stage:'picnic'},(n,e)=>trial?.contact(n,e,w),seededRandom(42));
    trial=school.makeTrial(-2,w,storage);
    const driver=new school.Example(trial.id,trial);
    if(mode==='example')trial.example=driver;
    assert.equal(trial.canStep(idleInput),false);
    for(let n=0;n<900&&!trial.done&&!trial.missed;n++){
      const i=mode==='miss'?{...idleInput,smash:n%85<12,smashX:1}:driver.input();
      if(i && trial.canStep(i)){w.step(dt,i,idleInput);trial.afterStep(w);}
    }
    assert.equal(trial.done,mode!=='miss');assert.equal(trial.throws,mode==='miss'?6:3);
    trial.saveTime(storage);
    if(mode==='clear')assert.deepEqual(JSON.parse([...data.values()][0]),{throws:3,frames:221});
    else assert.equal(data.size,0);
  }
});
test('late angle changes and release reconcile the actual disc and both fighters on two peers',()=>{
  const sample=w=>[w.dogs.map(f=>[f.x,f.y,f.damage,f.smashCharge?.pitch,f.attack?.moveId,f.attack?.pitch]),
    w.projectiles.map(d=>[d.x,d.y,d.vx,d.vy,d.pitch,d.rangeLeft])];
  for(const slot of [0,1]){
    const cfg={...config,p1:slot?'noodle':'clover',p2:slot?'clover':'noodle'};
    const place=w=>{w.dogs[slot].x=600;w.dogs[slot].face=1;w.dogs[1-slot].x=780;};
    const ref=new Battle(cfg,undefined,seededRandom(17));place(ref);
    const peers=[0,1].map(side=>{
      let world;const packets=[];
      const s=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      s.aimedDrive=true;s.side=side;s.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      s.beginRound(['start',1,cfg.p1,cfg.p2,cfg.stage,17]);place(world);place(s.match.confirmedWorld);
      return {world,net:s.match,packets};
    });
    const history=[sample(ref)];let divergent=false;
    for(let n=0;n<100;n++){
      const pair=[idleInput,idleInput];
      pair[slot]={...idleInput,smash:n<30,smashX:1,smashY:n<12?0:n<26?1:-1};
      pair[1-slot]={...idleInput,jump:n>=8 && n<23};
      ref.step(dt,...pair);history.push(sample(ref));
      for(const [side,p] of peers.entries()){
        if(n>=8)p.net.receive(n-8,peers[1-side].packets[n-8]);
        p.net.tick(()=>pair[side],p.world);
        if(n===26 && side!==slot)divergent=p.world.dogs[slot].smashCharge?.pitch!==ref.dogs[slot].smashCharge?.pitch;
        assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(divergent);assert(ref.dogs[1-slot].damage>0);
    for(const [i,p] of peers.entries()){
      for(let n=p.net.received;n<peers[1-i].packets.length;n++)p.net.receive(n,peers[1-i].packets[n]);
      p.net.confirm(p.world);assert.deepEqual(sample(p.world),sample(ref));
    }
  }
});
