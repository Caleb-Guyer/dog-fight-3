const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
for(const file of ['engine','dispatch-script','dispatch-run'])require('../docs/'+file+'.js');
const {DispatchRun,DispatchScript,DogFight}=window;
const {idleInput,seededRandom}=DogFight;
const dt=1/60;
function match(p1='pip',p2='brisket',rallySeat){
  const events=[];
  const run=new DispatchRun({room:DispatchScript.lastRoom,duo:{p1,p2,coats:[1,1],rallySeat}},(name,e)=>events.push({...e,name}));
  if(!run.rally)run.random=seededRandom(17);
  return {run,events,boss:run.foes[0]};
}
function pursue(run,dog,tick){
  const boss=run.foes[0].f,dx=boss.x-dog.x, face=Math.sign(dx),floor=run.terrain[0];
  const off=dog.x<floor.x1 || dog.x>floor.x2;
  const enemy=run.foes[0],wave=enemy.wavefront;
  if(!off && dog.ground>=0 && ((enemy.phase==='windup' && enemy.duration-enemy.time<0.4 || enemy.phase==='strike') && Math.abs(dx)<175 ||
    wave && Math.abs(Math.abs(dog.x-wave.x)-wave.radius)<85)) return {...idleInput,shield:true};
  return {...idleInput,x:off?(dog.x<floor.x1?1:-1):Math.abs(dx)>64 || Math.abs(dx)>3 && face!==dog.face?face:0,
    jump:off && tick%30<12,y:off?-1:0,special:off && !dog.jumps && tick%8<2,
    attack:Math.abs(dx)<139 && Math.abs(dog.y-boss.y)<75 && tick%8<2};
}
test('same-dog partners have different coats, spawn marks and hitstop buffers',()=>{
  const {run,boss}=match('clover','clover'),[a,b]=run.team;
  assert(run.hasSecondPlayer);
  assert.notEqual(a.x,b.x);
  assert.deepEqual([run.coatFor(a.index),run.coatFor(b.index)],[1,2]);
  assert.deepEqual(run.opponents(a),[boss.f]);assert.deepEqual(run.opponents(b),[boss.f]);
  run.hitStop=dt;
  run.step(dt,{...idleInput,shield:true},{...idleInput,attack:true});
  assert(a.prev.shield && !a.prev.attack && b.prev.attack && !boss.f.prev.attack);
  assert.equal(b.command.type,'attack');
  run.step(dt);
  assert(b.attack);
});
test('the bell hits both sides once and respects each shield independently',()=>{
  for(const guard of [-1,0,1]){
    const {run,boss,events}=match();
    boss.hp=boss.maxHP/2;
    run.team.forEach((f,i)=>f.x=boss.f.x+(i?165:-165));
    for(let i=0;i<133;i++)run.step(dt,{...idleInput,shield:guard===0},{...idleInput,shield:guard===1});
    const contacts=events.filter(e=>e.name==='hit'||e.name==='block');
    assert.deepEqual(run.team.map(f=>contacts.filter(e=>e.f===f).map(e=>e.name)),[0,1].map(i=>[i===guard?'block':'hit']));
  }
});
test('a stamp can catch both partners once and a windup keeps its facing',()=>{
  const {run,boss,events}=match();
  const [a,b]=run.team;
  a.x=boss.f.x-110;b.x=boss.f.x+65;
  run.step(dt);assert.equal(boss.phase,'windup');assert.equal(boss.face,1);
  a.x=boss.f.x+60;b.x=boss.f.x+82;
  for(let t=0;t<76;t++)run.step(dt);
  assert.deepEqual(events.filter(e=>e.name==='hit').map(e=>e.f.index).sort(),[0,2]);
});
test('friendly jabs and grabs pass through an ally',()=>{
  const {run,events}=match();
  const [a,b]=run.team;
  a.x=225;b.x=260;
  for(let i=0;i<64;i++)run.step(dt,{...idleInput,attack:i===0,grab:i===34});
  assert.equal(b.damage,0);assert(!b.grip);
  assert(!events.some(e=>e.f===b && e.owner===a));
});
for(const [p1,p2] of [['pip','noodle'],['clover','brisket']])test(p1+' and '+p2+' both hit the boss and clear a full doubles fight',()=>{
  const {run,events,boss}=match(p1,p2);
  for(let tick=1;tick<8000 && !run.finished;tick++)run.step(dt,...run.team.map(f=>pursue(run,f,tick)));
  assert.equal(run.finished,'exit');assert.equal(boss.hp,0);assert.equal(run.stamps,0);
  for(const f of run.team)assert(events.some(e=>e.name==='hit' && e.f===boss.f && e.owner===f));
});
for(const lost of [0,1])test('P'+(2-lost)+' can finish after the other dog loses its last stock',()=>{
  const {run,boss}=match();
  const fallen=run.team[lost],survivor=run.team[1-lost];
  fallen.stocks=1;fallen.ground=-1;fallen.y=4000;run.step(dt);
  assert(fallen.absent);assert.equal(run.finished,'');
  assert.deepEqual(run.opponents(boss.f),[survivor]);
  for(let tick=1;tick<8000 && !run.finished;tick++)run.step(dt,...run.team.map(f=>f.absent?idleInput:pursue(run,f,tick)));
  assert.equal(boss.hp,0);assert.equal(run.finished,'exit');
});
test('each player returns on a separate lift and losing both final stocks ends the match',()=>{
  const {run}=match();
  run.knockouts(run.team);
  assert.deepEqual(run.team.map(f=>f.stocks),[2,2]);
  assert(run.team.every(f=>f.stockLift));assert.notEqual(run.team[0].x,run.team[1].x);
  run.team.forEach(f=>f.stocks=1);run.knockouts(run.team);assert.equal(run.finished,'fallen');
  const campaign=new DispatchRun({room:DispatchScript.lastRoom});assert(!campaign.hasSecondPlayer);
  assert.equal(campaign.foes[0].maxHP,170);
});
function controlSeat(run,seat,input){
  run.step(dt,seat===0?input:idleInput,seat===1?input:idleInput);
}
const jump={...idleInput,jump:true},chord={...jump,shield:true};
for(const seat of [0,1])test('P'+(seat+1)+' spends a spare once after 30 uninterrupted jump ticks',()=>{
  const {run,events}=match(),receiver=run.team[seat],donor=run.team[1-seat];
  receiver.stocks=1;Object.assign(receiver,{ground:-1,y:4000});donor.damage=57;
  controlSeat(run,seat,chord);
  assert(receiver.absent && run.stockOffer.release);
  for(let i=0;i<40;i++)controlSeat(run,seat,chord);
  assert.deepEqual(run.borrowed,[0,0]);
  controlSeat(run,seat,idleInput);
  for(let i=0;i<18;i++)controlSeat(run,seat,jump);
  assert.equal(run.stockOffer.held,18);controlSeat(run,seat,idleInput);
  for(let i=0;i<29;i++)controlSeat(run,seat,jump);
  assert.equal(donor.stocks,3);assert(receiver.absent);
  controlSeat(run,seat,jump);
  assert.equal(receiver.stocks,1);assert.equal(receiver.damage,0);
  assert(!receiver.absent && receiver.stockLift);assert.equal(donor.stocks,2);assert.equal(donor.damage,57);
  for(let i=0;i<12;i++)controlSeat(run,seat,chord);
  assert.equal(receiver.stockLift.exit,null);assert.equal(events.filter(e=>e.name==='stockShare').length,1);
  assert(run.opponents(run.foes[0].f).includes(receiver));
});
test('only the eliminated player can take a stock, including a quick chord during hitstop',()=>{
  const {run,events}=match('noodle','pip',1),[donor,receiver]=run.team;
  assert.equal(run.stockOffer.seat,1);assert.equal(donor.damage,60);
  controlSeat(run,0,chord);assert(receiver.absent);
  run.hitStop=3*dt;
  controlSeat(run,1,{...idleInput,shield:true,tapped:{jump:true}});
  assert(receiver.stockLift);assert.equal(run.stockOffer,null);
  assert.deepEqual(run.team.map(f=>f.stocks),[1,1]);assert.equal(events.filter(e=>e.name==='ko').length,0);
  run.knockouts([receiver]);controlSeat(run,1,chord);
  assert(receiver.absent && !run.stockOffer && !run.finished);assert.equal(donor.stocks,1);
});
test('the last stock, a resolved boss defeat, and a same-tick donor knockout take precedence over sharing',()=>{
  for(const condition of ['last','boss','blast']){
    const {run,boss,events}=match('pip','brisket',0),[receiver,donor]=run.team;
    for(let i=0;i<29;i++)controlSeat(run,0,jump);
    if(condition==='last')donor.stocks=1;
    if(condition==='boss')boss.hp=0;
    if(condition==='blast')Object.assign(donor,{ground:-1,y:4000});
    controlSeat(run,0,jump);
    assert(receiver.absent && !run.stockOffer);assert.equal(events.filter(e=>e.name==='stockShare').length,0);
    assert.equal(donor.stocks,condition==='boss'?2:1);
    if(condition==='blast')assert(donor.stockLift);
  }
});
for(const seat of [0,1])test('P'+(seat+1)+' can return, leave the lift, hit the boss and clear the seeded rally',()=>{
  function play(){
    const {run,boss,events}=match('pip','brisket',seat);
    assert.equal(boss.hp,boss.maxHP/2);
    controlSeat(run,seat,chord);assert(!run.rally.countered);
    for(let tick=1;tick<8000 && !run.finished;tick++){
      run.step(dt,...run.team.map(f=>f.stockLift?{...idleInput,x:tick%4<2?1:0}:pursue(run,f,tick)));
    }
    assert.equal(run.finished,'exit');assert.equal(run.rally.countered,true);
    assert.deepEqual(events.filter(e=>e.name==='rallyHit').map(e=>e.seat),[seat]);
    assert(events.some(e=>e.name==='hit' && e.owner===run.team[seat] && e.f===boss.f));
    return [run.time,run.random.state,run.team.map(f=>[f.stocks,f.damage])];
  }
  assert.deepEqual(play(),play());
});
