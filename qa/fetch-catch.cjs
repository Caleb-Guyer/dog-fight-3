const test=require('node:test'), assert=require('node:assert/strict');
global.window={};
for(const file of ['engine','online','fighter-lessons'])require('../docs/'+file+'.js');
const {Battle,fighters,idleInput,seededRandom}=window.DogFight, dt=1/60;
const config={mode:'local',stage:'picnic',form:'flat',p1:'pip',p2:'brisket',fetch:true,fetchStart:true};
function match(extra={}) {
  const events=[];
  const w=new Battle({...config,...extra},(name,e)=>events.push({name,slot:e.f?.index,vx:e.ball?.vx,vy:e.ball?.vy}),seededRandom(42));
  return {w,events};
}
function ticks(w,count,first={},second={}) {
  for(let n=0;n<count;n++)w.step(dt,{...idleInput,...first},{...idleInput,...second});
}
function catchOpening(w) {
  ticks(w,1,{grab:true});ticks(w,35);assert.equal(w.ball.holder,0);assert.equal(w.ball.hits,2);
}
for(const kind of Object.keys(fighters))test(kind+' picks up at paw height, carries through a jump and aims three throws',()=>{
  for(const y of [-1,0,1]){
    const {w,events}=match({p1:kind});catchOpening(w);
    const initialY=w.ball.y;ticks(w,12,{jump:true});assert(w.ball.y<initialY-8);
    ticks(w,1,{x:-1,y,[y?'grab':'attack']:true});ticks(w,9);
    const shot=events.find(e=>e.name==='swat');
    assert(shot.vx<0);assert.equal(shot.vy,y<0?-640:y>0?540:-120);
    assert.equal(w.ball.holder,undefined);assert.equal(w.ball.hits,2);
    assert.equal(events.filter(e=>e.name==='ballCatch').length,1);
  }
});
test('an active grab catches a golden shot in flight and a late grab takes the hit',()=>{
  for(const inTime of [false,true]){
    const {w}=match(),f=w.dogs[0];
    Object.assign(f,{ground:-1,y:f.y-110,vy:-20});
    Object.assign(w.ball,{x:f.x+82,y:f.y-39,vx:-810,vy:0,hits:3,owner:1});
    ticks(w,1,{grab:inTime});ticks(w,14);
    if(inTime){assert.equal(w.ball.holder,0);assert.equal(w.ball.hits,3);assert.equal(f.damage,0);}
    else{assert.equal(w.ball,null);assert.equal(f.damage,19);}
  }
});
test('a body grab wins over an item in the same reach',()=>{
  const {w}=match(),[a,b]=w.dogs;b.x=a.x+52;
  ticks(w,1,{grab:true});ticks(w,8);assert.equal(w.grapple?.target,1);assert.equal(w.ball.holder,undefined);
});
test('a shielded toss leaves the guard intact and a hit, grab or ring-out releases the carrier',()=>{
  for(const outcome of ['shield','hit','grab','ko']){
    const {w,events}=match(),[a,b]=w.dogs;catchOpening(w);
    if(outcome==='shield'){ticks(w,1,{attack:true},{shield:true});ticks(w,65,{}, {shield:true});
      assert(events.some(e=>e.name==='block'));assert.equal(b.damage,0);assert.equal(b.stocks,3);assert.equal(w.ball.holder,undefined);}
    else if(outcome==='ko'){w.knockouts([a]);assert.equal(w.ball,null);assert.equal(a.stocks,2);}
    else{
      if(outcome==='grab'){b.x=a.x+50;ticks(w,1,{}, {grab:true});ticks(w,14);assert.equal(w.grapple.target,0);}
      else w.hit(a,b,8,155,3,0,'jab',-1);
      assert.equal(w.ball.holder,undefined);assert.equal(w.ball.owner,-1);assert.equal(w.ball.hits,2);
    }
  }
});
test('each Rival catches and returns a loose ball using its standard grab and throw inputs',()=>{
  for(const kind of Object.keys(fighters)){
    const {w,events}=match({mode:'solo',p2:kind,cpuLevel:'rival'}),f=w.dogs[1];
    Object.assign(w.ball,{x:f.x-42,y:f.y-12});ticks(w,95);
    for(const name of ['ballCatch','swat'])assert(events.some(e=>e.name===name && e.slot===1),kind+' '+name);
  }
});
test('a late remote catch and a late remote throw converge on the offline fight and play each cue once',()=>{
  const seed=42, peers=[0,1].map(side=>{
    const packets=[],events=[];let world;
    const session=new window.DogOnline.OnlineSession({start(options,random){
      world=new Battle(options,(name)=>{if(['ballCatch','swat'].includes(name))events.push(name);},random);
    }});
    session.side=side;session.send=p=>packets.push(p);
    session.beginRound(['start',1,'pip','brisket','picnic',seed]);return {world,net:session.match,packets,events};
  });
  const ref=new Battle({...config,form:'original',fetchStart:false},undefined,seededRandom(seed));
  const sample=w=>[w.ball && {...w.ball},w.dogs.map(f=>[f.x,f.y,f.damage,f.stocks])];
  for(const w of [ref,...peers.flatMap(p=>[p.world,p.net.confirmedWorld])]){
    const f=w.dogs[1];w.ball={x:f.x-42,y:f.y-12,vx:0,vy:0,hits:2,age:0,owner:-1};
  }
  const history=[sample(ref)];
  for(let n=0;n<110;n++){
    const pair=[idleInput,{...idleInput,grab:n===1,attack:n===44}];
    ref.step(dt,...pair);history.push(sample(ref));
    for(const [i,p] of peers.entries()){
      if(n>=6){const m=peers[1-i].packets[n-6];assert(p.net.receive(m[2],m[3]));}
      p.net.tick(()=>pair[i],p.world);
      assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
    }
  }
  for(const [i,p] of peers.entries()){
    for(const m of peers[1-i].packets.slice(-6))assert(p.net.receive(m[2],m[3]));
    p.net.confirm(p.world);assert.deepEqual(sample(p.world),sample(ref));assert.deepEqual(p.events,['ballCatch','swat']);
  }
});

function dropMatch(extra={}){
  return match({stage:'nightmail',form:'original',fetchStart:false,dropCatchOpening:'drop',...extra});
}
for(const kind of Object.keys(fighters))test(kind+' can drop without recovery, swing to recatch, or aim a normal toss',()=>{
  for(const option of ['drop','recatch','aim','attack','legacy']){
    const {w,events}=dropMatch({p1:kind}),f=w.dogs[0];
    w.ball.hits=3;
    if(option==='legacy') w.itemDrops=false;
    ticks(w,1,option==='attack'?{attack:true}:{grab:true,x:option==='aim'?-1:0});
    if(['legacy','attack','aim'].includes(option)){
      assert(f.attack.ballToss);ticks(w,7);
      assert(events.some(e=>e.name==='swat' && (option!=='aim'||e.vx<0)));continue;
    }
    assert.equal(f.attack,null);assert(w.ball.dropped);assert.equal(w.ball.owner,0);
    if(option==='recatch'){
      ticks(w,1,{attack:true,y:-1});
      assert.equal(w.ball.holder,0);assert.equal(w.ball.hits,3);
      assert(f.attack.itemCatch);assert.equal(f.attack.airSide,'up');
      assert.deepEqual(events.filter(e=>['ballDrop','ballCatch'].includes(e.name)).map(e=>e.name),['ballDrop','ballCatch']);
    }else{
      ticks(w,36);assert.equal(w.dogs[1].damage,5);assert.equal(w.ball.hits,3);assert.equal(w.ball.owner,-1);
    }
  }
});
test('a rival can intercept the dropped ball with its aerial or shield the landing',()=>{
  for(const defend of ['catch','shield','move away']){
    const {w,events}=dropMatch(),[a,b]=w.dogs;
    ticks(w,1,{grab:true},{shield:defend==='shield'});
    if(defend==='catch'){
      Object.assign(b,{x:w.ball.x+b.stats.width*.55,y:a.y,ground:-1,vy:35,face:-1});
      ticks(w,1,{}, {attack:true});assert.equal(w.ball.holder,1);assert(b.attack.itemCatch);assert.equal(w.ball.hits,2);
    }else {
      if(defend==='move away')b.x+=320;
      ticks(w,48,{}, {shield:defend==='shield'});assert.equal(b.damage,0);
      assert.equal(events.some(e=>e.name==='block'),defend==='shield');assert.equal(w.ball.owner,-1);
      assert.equal(w.ball.dropped,undefined);
    }
  }
});
test('Rival lets a drop hit an open landing and takes the ball back above a shield',()=>{
  for(const shield of [false,true]){
    const {w,events}=dropMatch({mode:'solo',cpuLevel:'rival',dropCatchOpening:'defend'});
    ticks(w,22,{shield});assert(events.some(e=>e.name==='ballDrop' && e.slot===1));
    assert.equal(events.some(e=>e.name==='ballCatch' && e.slot===1),shield);
    if(shield){assert.equal(w.dogs[0].damage,0);assert(events.some(e=>e.name==='block'));}
    else assert.equal(w.dogs[0].damage,4);
  }
});
test('late remote drop and aerial inputs correct both peers to the recorded offline frames',()=>{
  const options={...config,stage:'nightmail',form:'original',dropCatchOpening:'defend',fetchStart:false};
  const relevant=new Set(['ballDrop','ballCatch','swat']);
  const peers=[0,1].map(side=>{
    const packets=[],events=[];
    let world;
    const session=new window.DogOnline.OnlineSession({start(config,random){
      world=new Battle(config,name=>{if(relevant.has(name))events.push(name);},random);
    }});
    session.side=side;session.send=m=>packets.push(m);
    session.beginRound(['start',1,'pip','brisket','nightmail',42]);
    const opening=new Battle(options,undefined,seededRandom(42));
    for(const state of [world,session.match.confirmedWorld])state.copyFightFrom(opening);
    return {packets,net:session.match,world,events};
  });
  const events=[],ref=new Battle(options,name=>{if(relevant.has(name))events.push(name);},seededRandom(42));
  const sample=w=>structuredClone([w.ball,w.dogs.map(f=>[f.x,f.y,f.damage,f.stocks,f.attack?.airSide,f.attack?.itemCatch]),w.random.state]);
  const hist=[sample(ref)];
  for(let n=0;n<85;n++){
    const pair=[idleInput,{...idleInput,grab:n===2,attack:n===4 || n===55}];
    ref.step(dt,...pair);hist.push(sample(ref));
    for(const [i,p] of peers.entries()){
      if(n>=7){const m=peers[1-i].packets[n-7];assert(p.net.receive(m[2],m[3]));}
      p.net.tick(()=>pair[i],p.world);assert.deepEqual(sample(p.net.confirmedWorld),hist[p.net.confirmed]);
    }
  }
  assert.deepEqual(events,['ballDrop','ballCatch','swat']);
  for(const [i,p] of peers.entries()){
    for(const m of peers[1-i].packets.slice(-7))assert(p.net.receive(m[2],m[3]));
    p.net.confirm(p.world);assert.deepEqual(sample(p.world),sample(ref));assert.deepEqual(p.events,events);
  }
});
