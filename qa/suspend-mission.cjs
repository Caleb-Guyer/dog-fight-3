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
require('../docs/fight-school.js');require('../docs/match-review.js');
const {Battle,FinishTape,seededRandom}=window.DogFight;
const config={schoolFinal:true,schoolTarget:'return',stage:'picnic',mode:'solo',p1:'pip',p2:'brisket',stockCount:3,minutes:7,fetch:false,cpuLevel:'rookie'};
function firstMatch(){
  const seed=46,corner=new window.FightSchool.Corner('return');
  const battle=new Battle(config,undefined,seededRandom(seed));
  battle.emit=(n,e)=>corner.target.contact(n,e,battle);
  return {battle,seed,config,corner,tape:new FinishTape(),countdown:0,call:'',lastCount:0};
}
function advance(pos,a=idleInput){
  const {battle,tape,corner}=pos;tape.record(battle,a,idleInput);battle.step(dt,a,idleInput);
  corner.target.step(battle);corner.read(battle);tape.captureKnockouts(battle);
}
function reopen(pos){
  const record=DispatchSuspend.schoolCapture(pos),saved=DispatchSuspend.schoolPosition(structuredClone(record));
  const result=firstMatch(),b=result.battle;Object.assign(b,saved.checkpoint.state);
  b.random.state=saved.checkpoint.seed;b.emit=(n,e)=>saved.corner.target.contact(n,e,b);
  return {...result,...saved,battle:b,seed:saved.checkpoint.openingSeed};
}
test('the first bell, shared grab and rematch target retain their runtime behavior after resume',()=>{
  const p=firstMatch();p.countdown=1.4;p.call='2';p.lastCount=2;
  const start=reopen(p);assert.equal(start.countdown,1.4);assert.equal(start.call,'2');assert.equal(start.tape.length,0);
  const [a,b]=p.battle.dogs;
  Object.assign(a,{x:500,y:p.battle.terrain[0].y,face:1,ground:0});
  Object.assign(b,{x:540,y:a.y,face:-1,ground:0});
  for(let n=0;n<22 && p.battle.grapple?.phase!=='hold';n++)advance(p,{...idleInput,grab:n===0});
  assert(p.battle.grapple);p.corner.target.doneAt=4;p.corner.seen.add('hang/left');
  const restored=reopen(p);assert.deepEqual(restored.corner.seen,p.corner.seen);
  assert.equal(restored.corner.target.title,'Target met');
  assert.equal(restored.battle.grapple,restored.battle.dogs[1].grip);
  for(let n=0;n<175;n++){const a=n===4?{...idleInput,y:-1}:input(n);advance(p,a);advance(restored,a);}
  assert.deepEqual(restored.battle.dogs,p.battle.dogs);assert.deepEqual(restored.battle.matchCard,p.battle.matchCard);
  assert.equal(restored.battle.random.state,p.battle.random.state);
});
for(const delay of [0,22,125,241])test('a first match suspended '+delay+' ticks after a KO keeps the KO and its playable return',()=>{
  const p=firstMatch();
  for(let n=0;n<600 && !p.tape.knockouts.length;n++)advance(p,{...idleInput,x:-1});
  assert.equal(p.tape.knockouts.length,1);
  for(let n=0;n<delay;n++)advance(p);
  const restored=reopen(p);
  for(let n=0;n<260;n++){const a=input(n);advance(p,a);advance(restored,a);}
  assert.deepEqual(restored.battle.matchCard,p.battle.matchCard);
  const snap=t=>{
    const b=t.playback(t.length).battle;return [t.count,t.length,b.dogs,b.matchCard,b.random.state];
  };
  assert.deepEqual(snap(restored.tape),snap(p.tape));
  assert.deepEqual(restored.tape.knockouts.map(c=>[c.first,c.losses,snap(c.tape),snap(c.returnTape)]),
    p.tape.knockouts.map(c=>[c.first,c.losses,snap(c.tape),snap(c.returnTape)]));
});
test('saved stock counts describe both dogs and a damaged record cannot start a first match',()=>{
  const p=firstMatch();p.battle.dogs[0].damage=47.6;p.battle.dogs[1].stocks=2;
  const r=DispatchSuspend.schoolCapture(p);assert.match(DispatchSuspend.schoolCard(r.header).detail,/Pip 3 stocks · 48% \/ Brisket 2 stocks · 0%/);
  r.state.mode='training';assert.throws(()=>DispatchSuspend.schoolPosition(r));
});
