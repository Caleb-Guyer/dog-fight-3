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
