const test=require('node:test');
const assert=require('node:assert/strict');
const pilot=require('./bell-pilot.cjs');
global.window={};
require('../docs/engine.js');
require('../docs/bell-break.js');
const {Run,courses,formatTime,readBest}=window.BellBreak;
const {idleInput}=window.DogFight;
const tick=(run,input=idleInput)=>run.step(1/60,{...idleInput,...input});

for (const kind of Object.keys(courses)) test(kind+' clears all six with fight inputs',()=>{
  const hits=[];
  const run=new Run({p1:kind},(name,e)=>{
    if (name==='ringBell') hits.push({n:e.count,air:e.f.ground<0,move:e.f.lastMove});
  });
  for (let n=0;n<900 && run.end===null;n++) {
    tick(run,pilot({dog:run.dogs[0],bell:run.bells.find(b=>b.brokenAt===null),kind}));
  }
  assert.equal(run.endReason,'clear');
  assert.deepEqual(hits.map(h=>h.n),[1,2,3,4,5,6]);
  assert(hits.every(h=>h.move));
  assert(hits.some(h=>h.air));
  assert.equal(run.matchFrames,Math.max(...run.bells.map(b=>b.brokenAt)));
  const time=run.matchFrames;tick(run);assert.equal(run.matchFrames,time);
  assert.deepEqual(run.opponents(run.dogs[0]),[]);
});
test('walking through a bell and grabbing it leave it intact; only an active strike rings',()=>{
  const run=new Run({p1:'pip'});
  for (let i=0;i<50;i++) tick(run,{x:i<17?1:0,grab:i===8});
  assert.equal(run.cleared,0);
  const start=new Run({p1:'pip'});
  tick(start,{x:1,attack:true});assert.equal(start.cleared,0);
  tick(start);assert.equal(start.cleared,0);
  tick(start);assert.equal(start.cleared,1);
  for(let i=0;i<50;i++)tick(start);
  assert.equal(start.cleared,1);
});
test('Round Trip rings two separate bells while Clover stands still',()=>{
  const run=new Run({p1:'clover'});
  for(let i=0;i<100;i++)tick(run,{special:i===0});
  assert.equal(run.cleared,2);
  assert(run.bells[0].brokenAt<run.bells[1].brokenAt);
  assert.equal(run.dogs[0].x,courses.clover.start);
});
test('walking off ends a run; a retry restores every bell and the moving bell phase',()=>{
  const run=new Run({p1:'noodle'});
  for(let i=0;i<360;i++)tick(run,{x:-1});
  assert.equal(run.endReason,'fall');assert.equal(run.cleared,0);
  const retry=new Run({p1:'noodle'});
  assert.equal(retry.matchFrames,0);assert(retry.bells.every(b=>b.brokenAt===null && b.x===b.origin));
  for(let i=0;i<45;i++)tick(retry);
  const moving=retry.bells.find(b=>b.travel);
  assert.equal(moving.x,moving.origin+moving.travel);
});
test('time displays one or two decimal places and rejects a corrupt record',()=>{
  assert.equal(formatTime(3599),'0:59.98');assert.equal(formatTime(3606,1),'1:00.1');
  assert.equal(readBest('233'),233);
  for (const value of [null,'',0,-3,3.2,'Infinity','[]','oops']) assert.equal(readBest(value),null);
});
