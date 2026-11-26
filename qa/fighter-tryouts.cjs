const test=require('node:test'), assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/fighter-lessons.js');
const {Battle,seededRandom,idleInput}=window.DogFight,school=window.FighterSchool;
const data=new Map();
const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
function lane(kind){
  const battle=new Battle({mode:'local',p1:kind,p2:'pip',stage:'nightmail',form:'original',lesson:-1,
    minutes:0,fetch:false},(n,e)=>battle.lesson?.contact(n,e),seededRandom(17));
  battle.lesson=school.makeTrial(-1,battle,storage);
  return battle;
}
function tick(battle,input){
  const l=battle.lesson;
  if(!input || !l.canStep(input))return;
  battle.step(1/60,input,l.partner());l.afterStep(battle);
}
function race(kind,example=false,delay=0){
  const battle=lane(kind),l=battle.lesson;
  if(example)l.example=new school.Example(l.id,l);
  for(let i=0;i<55;i++)tick(battle,idleInput);
  assert.equal(l.ticks,0);
  for(let i=0;i<650 && !l.done && !l.missed;i++){
    const x=l.split ? (delay-->0?0:-1) : 1;
    tick(battle,example?l.example.input():{...idleInput,x});
  }
  assert(l.done);
  assert(l.split>0 && l.split<l.ticks);
  assert(battle.dogs[0].x<=l.start && battle.dogs[0].ground===0);
  assert.equal(l.track.length,1+Math.ceil(l.ticks/3));
  l.saveTime(storage);
  return l;
}
test('a hand-run shuttle and the demonstration use identical fight physics for each dog',()=>{
  const results=new Set();
  for(const kind of Object.keys(school.courses)){
    const before=data.size,example=race(kind,true);
    assert.equal(data.size,before);
    const human=race(kind);
    assert.deepEqual(human.track,example.track);
    assert.equal(human.ticks,example.ticks);
    assert.equal(JSON.parse(data.get('dog-fight-3.shuttle.v1.'+kind)).frames,human.ticks);
    results.add(human.ticks);
  }
  assert.equal(results.size,4);
});
test('the fastest saved route paces every dog and a slower run keeps the personal best',()=>{
  const record=race('pip'),slow=race('pip',false,30);
  assert(slow.ticks>record.ticks);
  for(const kind of Object.keys(school.courses)){
    const p=lane(kind).lesson.pace;
    assert.equal(p.kind,'pip');assert.equal(p.frames,record.ticks);assert.deepEqual(p.track,record.track);
  }
});
test('crossing the start alone cannot finish; a fall or a timeout cannot set a time',()=>{
  const miss=lane('clover'),start=miss.lesson.start,before=data.get('dog-fight-3.shuttle.v1.clover');
  for(let i=0;i<400 && !miss.lesson.missed;i++)tick(miss,{...idleInput,x:-1});
  assert(miss.lesson.track[0][0]===start && miss.lesson.missed && !miss.lesson.done);
  const idle=lane('clover');tick(idle,{...idleInput,shield:true});
  for(let i=0;i<660;i++)tick(idle,idleInput);
  assert(idle.lesson.missed && !idle.lesson.done);assert.equal(idle.lesson.ticks,600);
  miss.lesson.saveTime(storage);idle.lesson.saveTime(storage);
  assert.equal(data.get('dog-fight-3.shuttle.v1.clover'),before);
});
test('damaged or inaccessible local storage still allows racing',()=>{
  const w=lane('noodle');
  for(const bad of [{getItem:()=>'{broken'}, {getItem:()=>'{"frames":1,"track":[null,null]}'},
    {getItem:()=>{throw Error('private storage');}}]){
    const l=school.makeTrial(-1,w,bad);
    assert.equal(l.id,'shuttle');assert.equal(l.ticks,0);
  }
});
