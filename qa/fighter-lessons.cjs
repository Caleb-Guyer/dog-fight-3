const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/fight-school.js');
require('../docs/fighter-lessons.js');
const {Battle,idleInput}=window.DogFight;
const {Trial,courses,cleared,mark,hint}=window.FighterSchool;

function practice(kind,index,control){
  const course=courses[kind];
  let lesson;
  const battle=new Battle({mode:'local',p1:kind,p2:course.rival,stage:course.stage,minutes:0,lesson:index,fetch:false},
    (name,event)=>lesson?.contact(name,event));
  lesson=new Trial(index,battle);
  const f=battle.dogs[0];
  for(let frame=0;frame<250 && !lesson.missed && !lesson.done;frame++){
    const input={...idleInput,...control(frame,f)};
    if(!lesson.canStep(input))continue;
    battle.step(1/60,input,lesson.partner(input));
    lesson.afterStep(battle);
  }
  return {battle,lesson};
}
const ground={
  pip:n=>({x:1,special:n===0 || n===13}),
  brisket:n=>({y:1,special:n===57}),
  noodle:n=>({special:n===0,attack:n===25}),
  clover:n=>({special:n===0 || n===23,x:n===23?1:0}),
};
function recover(kind,n,f){
  return {x:f.ledge?Number(n%24===0):1,y:n===0 || (kind==='pip' && n===12)?-1:0,
    special:n===0 || (kind==='pip' && n===12) || (kind==='brisket' && n<20) || (kind==='clover' && n<40)};
}
for(const kind of Object.keys(courses)){
  test(kind+' signature requires contact and the follow-up',()=>{
    const idle=practice(kind,0,()=>({}));assert.equal(idle.lesson.done,false);
    assert.equal(practice(kind,0,n=>n===0?ground[kind](0):{}).lesson.done,false);
    assert.equal(practice(kind,0,ground[kind]).lesson.done,true);
  });
  test(kind+' waits for the player and requires the recovery to finish onstage',()=>{
    const idle=practice(kind,1,()=>({x:1}));assert.equal(idle.lesson.ticks,0);
    assert.equal(idle.lesson.done,false);assert.equal(idle.battle.dogs[0].ground,-1);
    const wrong=practice(kind,1,n=>({special:n===0}));assert.equal(wrong.lesson.done,false);
    assert.equal(wrong.lesson.missed,true);
    const correct=practice(kind,1,(n,f)=>recover(kind,n,f));
    assert.equal(correct.lesson.done,true);assert(correct.battle.dogs[0].ground>=0);
  });
}
test('folding outside the deck does not count even if the sail carries Clover closer',()=>{
  const {lesson}=practice('clover',1,(n,f)=>({...recover('clover',n,f),special:n<12}));
  assert.equal(lesson.done,false);assert.equal(lesson.technique,false);
});
test('fighter checkmarks save independently and work with blocked storage',()=>{
  const disk=new Map([['dog-fight-3.school','basic checkpoint']]);
  const storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
  mark(storage,'pip-0');mark(storage,'clover-1');
  assert.equal(disk.size,3);assert.equal(disk.get('dog-fight-3.school'),'basic checkpoint');
  assert.equal(cleared(storage,'pip-0'),true);assert.equal(cleared(storage,'clover-0'),false);
  mark(undefined,'noodle-0');assert.equal(cleared(undefined,'noodle-0'),true);
});
test('chord hints follow the current device and layout',()=>{
  const info=courses.noodle.lessons[0],key=(i,k)=>({special:'Q',attack:'J'})[k],pad=(i,k)=>({special:'Y',attack:'X'})[k];
  assert.equal(hint(info,0,key,pad),'Q → J');assert.equal(hint(info,1,key,pad),'Y → X');
  assert.equal(hint(info,2,key,pad),'Special → Attack');
});
const {Lesson,lessons}=window.FightSchool;
const demos=lessons.map((l,i)=>[l.id,i,Lesson,'pip','brisket',l.id==='platform'?'picnic':'nightmail']);
for(const [kind,course] of Object.entries(courses))for(const [i] of course.lessons.entries())
  demos.push([kind+'-'+i,i,Trial,kind,course.rival,course.stage]);
for(const [id,index,Type,p1,p2,stage] of demos)test('the '+id+' example clears the actual lesson through displayed inputs',()=>{
  let lesson;
  const world=new Battle({mode:'local',p1,p2,stage,minutes:0,lesson:index,fetch:false},(name,e)=>lesson?.contact(name,e));
  lesson=new Type(index,world);
  const example=new window.FighterSchool.Example(id), observed=new Set();
  for(let n=0;n<600 && !lesson.done && !lesson.missed;n++){
    const input=example.input();
    if(!input){observed.add(example.index);continue;}
    assert(observed.has(example.index),'input gets a readable cue before the action');
    const {keys}=example.cue;
    assert.equal(input.x,Number(keys.includes('right')));
    assert.equal(input.y,Number(keys.includes('down'))-Number(keys.includes('up')));
    for(const key of ['attack','smash','grab','jump','special','shield'])assert.equal(input[key],keys.includes(key));
    if(lesson.canStep(input)){world.step(1/60,input,lesson.partner(input));lesson.afterStep(world);}
  }
  assert(lesson.done && !lesson.missed);
  if(id.endsWith('-1') || id==='return')assert(world.dogs[0].ground>=0);
});
