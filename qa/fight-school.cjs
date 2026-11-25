const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/fight-school.js');
const {Battle,idleInput}=window.DogFight;
const {Lesson,lessons}=window.FightSchool;

function tryLesson(index,play) {
  const id=lessons[index].id, events=[];
  let lesson;
  const w=new Battle({mode:'local',stage:id==='platform'?'picnic':'nightmail',p1:'pip',p2:'brisket',fetch:false,minutes:0},
    (name,e)=>{lesson?.contact(name,e);events.push(name);});
  lesson=new Lesson(index,w);
  for(let n=0;n<260 && !lesson.done && !lesson.missed;n++) {
    const i={...idleInput,quickAttack:true};
    if(play) switch(id) {
      case 'move':i.x=1;break;
      case 'platform':i.jump=n<16 || n===20;break;
      case 'jab':i.attack=n===0;break;
      case 'tilt':i.y=1;i.attack=n===0;break;
      case 'air':i.jump=i.attack=n===0;break;
      case 'guard':i.shield=true;break;
      case 'throw':i.grab=n===0;i.x=w.dogs[0].grip?.phase==='hold'?1:0;break;
      case 'special':i.x=1;i.special=n===0;break;
      case 'return':i.x=1;i.y=n===0?-1:0;i.special=n===0;break;
      case 'stock':i.x=n<34?1:0;i.smash=n<32;i.smashX=1;break;
    }
    if(lesson.canStep(i)){w.step(1/60,i,lesson.partner(i));lesson.afterStep(w);}
  }
  return {lesson,w,events};
}
for (const [index,info] of lessons.entries()) test(info.title+' requires a real action',()=>{
  const attempt=tryLesson(index,true);
  assert(attempt.lesson.done && !attempt.lesson.missed);
  assert(!tryLesson(index,false).lesson.done);
  if(info.id==='stock'){assert(attempt.events.includes('ko'));assert.equal(attempt.w.dogs[1].stocks,2);}
  if(info.id==='return')assert(attempt.lesson.cast && attempt.w.dogs[0].ground===0);
});
