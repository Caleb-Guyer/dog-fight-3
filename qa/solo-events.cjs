const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/solo-events.js');
const {idleInput,seededRandom,Battle}=window.DogFight;
const {Run,setup,best}=window.SoloEvents;
function play(id,control=()=>({})){
  const calls=[];
  const run=new Run(setup(id),(name,e)=>{if(name==='win')calls.push(e.f.index);},seededRandom(42));
  for(let frame=0;frame<1800 && run.end===null;frame++)run.step(1/60,{...idleInput,...control(frame,run)},idleInput);
  assert.deepEqual(calls,[run.end]);
  return run;
}
test('Wrong Way requires a planted tech and a grounded punish during the missed sweep',()=>{
  assert.match(play('wrong-way').feedback,/missed the landing/);
  assert.match(play('wrong-way',n=>({x:1,shield:n===5})).feedback,/Pip rolled/);
  assert.match(play('wrong-way',n=>({shield:n===5})).feedback,/recovered/);
  const win=play('wrong-way',n=>({shield:n===5,attack:n===34}));
  assert.equal(win.end,0);assert.deepEqual(win.dogs.map(f=>f.damage),[45,4]);
  const store=new Map(),disk={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
  win.save(disk);assert.equal(best(disk,win.eventId),win.matchFrames);
  const slower=play('wrong-way',n=>({shield:n===5,attack:n===36}));
  assert.equal(slower.end,0);slower.save(disk);assert.equal(Number(store.values().next().value),win.matchFrames);
  const miss=play('wrong-way');miss.save(disk);assert.equal(store.size,1);
});
test('High Ground scores only uncontested time and keeps it across separate visits',()=>{
  const win=play('high-ground',n=>({y:n===24?1:0}));assert.equal(win.end,0);assert.equal(win.held,180);
  assert.equal(play('high-ground').end,1);
  const run=new Run(setup('high-ground'),()=>{},seededRandom(42)),[p,r]=run.dogs,top=run.terrain[3];
  const perch=(f,x)=>Object.assign(f,{x,y:top.y,ground:3,stockLift:null,respawning:0,vx:0,vy:0,landingLag:1});
  perch(p,top.x1+20);perch(r,top.x2-20);run.step(1/60,idleInput,idleInput);assert.equal(run.held,0);
  Object.assign(r,{ground:0,x:400,y:run.terrain[0].y});run.step(1/60,idleInput,idleInput);assert.equal(run.held,1);
  perch(r,top.x2-20);run.step(1/60,idleInput,idleInput);assert.equal(run.held,1);
  Object.assign(r,{ground:0,x:400,y:run.terrain[0].y});run.held=179;run.clockFrames=1;
  run.step(1/60,idleInput,idleInput);assert.equal(run.end,0,'the last tick at the horn counts');
});
test('Last Delivery clears on the lead change, expires on a tie, and its ordinary match continues after the same KO',()=>{
  const charge=(n,w)=>({x:Math.sign(w.dogs[1].x-w.dogs[0].x),special:n===12});
  const win=play('last-delivery',charge);assert.equal(win.end,0);assert.deepEqual(win.matchCard.points,[0,-1]);
  const miss=play('last-delivery');assert.equal(miss.end,1);assert.equal(miss.matchFrames,600);
  const tie=new Run(setup('last-delivery'),()=>{},seededRandom(42));tie.matchCard.points=[0,0];tie.clockFrames=1;
  tie.step(1/60,idleInput,idleInput);assert.equal(tie.end,1);assert.equal(tie.suddenDeath,null);
  const normal=new Battle(setup('last-delivery',true),()=>{},seededRandom(42));
  for(let i=0;i<win.matchFrames;i++)normal.step(1/60,{...idleInput,...charge(i,normal)},idleInput);
  assert.deepEqual(normal.matchCard.points,win.matchCard.points);assert.equal(normal.end,null);
});
