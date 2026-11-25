const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
for(const name of ['engine','dispatch-script','dispatch-bridge','dispatch-run'])require('../docs/'+name+'.js');
const liftInput=require('./helpers/lift-input.cjs');
const [yard,night]=window.DispatchScript.chapters, lift=yard.bonus;
const {idleInput,seededRandom}=window.DogFight;
const start=()=>new window.DispatchRun({room:lift.id,stamps:15});
test('the actual Crane House double jump collects the lift ticket, including on an old save',()=>{
  const initial={version:2,started:true,room:3,checkpoint:2,stamps:7};
  const read=value=>yard.readSave({getItem:()=>JSON.stringify(value)});
  let save=read(initial);assert(!yard.liftUnlocked(save));
  const w=new window.DispatchRun({...save},(event)=>{if(event==='dispatchStamp')save=yard.record(save,{room:3,stamp:3});});
  for(let i=0;i<75;i++)w.step(1/60,{...idleInput,x:1,jump:i<18 || i>=23 && i<39});
  assert(yard.liftUnlocked(read(save)));assert.equal(save.checkpoint,2);assert.equal(w.stamps,15);
  assert(yard.liftUnlocked(read({version:1,started:true,room:2,complete:true,stamps:7})));
  assert(!night.bonus);assert.equal(yard.rooms.length,5);
});
test('three distinct opponents take real hits and lose stocks in a continuous playable clear',()=>{
  const hits=[], roster=[], stockFalls=[];
  const w=new window.DispatchRun({room:lift.id,stamps:15},(name,e)=>{
    if(name==='hit' && e.owner.index===0)hits.push(e.f.kind);
    if(name==='ko')stockFalls.push([e.f.kind,e.remaining]);
    if(name==='machineStart')roster.push(e.f.kind);
    assert.notEqual(name,'dispatchCheckpoint');assert.notEqual(name,'dispatchStamp');
  });
  w.random=seededRandom(3);
  for(let frame=0;frame<14400 && !w.finished;frame++)w.step(1/60,liftInput(frame,w));
  assert.equal(w.finished,'exit');assert.deepEqual(roster,['noodle','brisket','clover']);
  for(const kind of roster){assert(hits.includes(kind));assert(stockFalls.some(([who,count])=>who===kind && !count));}
  assert.equal(w.dogs[0].kind,'pip');assert.equal(w.dogs[0].stocks,1);
  assert.equal(w.cpuLevel,'rival');assert(w.runFrames>1200);assert.equal(w.stamps,15);
});
test('the moving shelf carries grounded paws and another session starts at the original height',()=>{
  const a=start(), b=start(), p=a.dogs[0], startY=b.terrain[1].y;
  Object.assign(p,{ground:1,x:340,y:startY});
  for(let i=0;i<12;i++)a.step(1/60,idleInput);
  assert(a.terrain[1].y>startY);assert.equal(p.y,a.terrain[1].y);
  assert.equal(b.terrain[1].y,startY);assert.equal(lift.terrain[1].y,startY);
  a.hitStop=.1;const paused=p.y;a.step(1/60,idleInput);assert.equal(a.terrain[1].y,paused);
});
test('bonus records prefer stocks then clear time, survive a reload, and stay separate from the chapter',()=>{
  const data=new Map([[yard.saveKey,'untouched']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  for(const clear of [{stocks:1,frames:500},{stocks:2,frames:700},{stocks:1,frames:200},{stocks:2,frames:603}])
    yard.liftBest(storage,clear);
  assert.deepEqual(yard.liftBest(storage),{stocks:2,frames:603});assert.equal(data.get(yard.saveKey),'untouched');
  data.set(lift.bestKey,'{"stocks":8,"frames":2}');assert.equal(yard.liftBest(storage),null);
  assert.deepEqual(yard.liftBest(null,{stocks:1,frames:5},{stocks:1,frames:3}),{stocks:1,frames:3});
});
