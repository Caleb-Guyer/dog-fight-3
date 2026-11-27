const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
for(const file of ['engine','dispatch-script','dispatch-run'])require('../docs/'+file+'.js');
const {DispatchRun,DispatchScript,DogFight}=window;
const {idleInput,seededRandom}=DogFight;
const dt=1/60;
function match(p1='pip',p2='brisket'){
  const events=[];
  const run=new DispatchRun({room:DispatchScript.lastRoom,duo:{p1,p2,coats:[1,1]}},(name,e)=>events.push({...e,name}));
  run.random=seededRandom(17);
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
