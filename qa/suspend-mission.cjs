const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
for(const name of ['engine','dispatch-script','dispatch-bridge','dispatch-run','dispatch-suspend'])require('../docs/'+name+'.js');
const {DispatchRun,DispatchSuspend,DispatchScript}=window,{idleInput}=window.DogFight,dt=1/60;
function input(n){return {...idleInput,x:n%90<45?.55:-.55,jump:n%67===0,attack:n%19===0,special:n%71===0};}
function continued(run){
  const save=DispatchSuspend.capture(run), restored=new DispatchRun({chapter:run.chapter,room:run.roomIndex});
  DispatchSuspend.restore(restored,structuredClone(save));
  assert.deepEqual(DispatchSuspend.capture(restored).state,save.state);
  for(let i=0;i<180;i++){run.step(dt,input(i));restored.step(dt,input(i));}
  assert.equal(run.random.state,restored.random.state);
  assert.deepEqual(DispatchSuspend.capture(restored).state,DispatchSuspend.capture(run).state);
  return restored;
}
for(const book of DispatchScript.chapters){
  const rooms=book.rooms.map((room,i)=>[i,room]);if(book.bonus)rooms.push([book.bonus.id,book.bonus]);
  for(const [room,script] of rooms)test(script.name+' restores live motion, AI, and the next 180 ticks',()=>{
    const run=new DispatchRun({chapter:book.number,room});
    for(let n=0;n<80;n++)run.step(dt,input(n));
    if(run.bridge){run.bridge.ferryStarted=true;run.bridge.liftStarted=true;}
    const saved=continued(run);
    for(const enemy of saved.foes)assert.equal(enemy,saved.dogs[enemy.f.index].encounter);
    if(saved.bridge)assert(saved.bridge.ferryTime>0 && saved.bridge.liftTime>0);
  });
}
test('a suspended grapple restores both fighters to the same hold and releases the same throw',()=>{
  const run=new DispatchRun({room:1}),[p,r]=run.dogs;
  const ground=run.terrain[0].y;
  Object.assign(p,{x:500,y:ground,ground:0,face:1});Object.assign(r,{x:548,y:ground,ground:0,face:-1});
  for(let n=0;n<35 && run.grapple?.phase!=='hold';n++)run.step(dt,{...idleInput,grab:n===0});
  assert.equal(run.grapple?.phase,'hold');
  const stored=DispatchSuspend.capture(run),copy=new DispatchRun({room:1});
  DispatchSuspend.restore(copy,structuredClone(stored));
  assert.equal(copy.dogs[0].grip,copy.grapple);assert.equal(copy.dogs[1].grip,copy.grapple);
  for(let n=0;n<70;n++){const a={...idleInput,y:n<8?-1:0};run.step(dt,a);copy.step(dt,a);}
  assert(run.dogs[1].damage>0);assert.equal(stored.state.grapple.phase,'hold');
  assert.deepEqual(DispatchSuspend.capture(copy).state,DispatchSuspend.capture(run).state);
});
