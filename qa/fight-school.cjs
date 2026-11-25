const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/fight-school.js');
const {Battle,idleInput}=window.DogFight;
const {Lesson,lessons}=window.FightSchool;

function cornerFight(){
  const world=new Battle({mode:'solo',stage:'picnic',p1:'pip',p2:'brisket',fetch:false,minutes:7});
  const coach=new window.FightSchool.Corner(),[pip,brisket]=world.dogs,floor=world.terrain[0];
  return {world,coach,pip,brisket,floor,read:()=>coach.read(world)};
}
test('ringside recovery uses the actual ledge, remaining air jump and both Fence Hopper leaps',()=>{
  for(const side of ['left','right']){
    const {world,coach,pip,floor,read}=cornerFight(), inward=side==='left'?'right':'left';
    Object.assign(pip,{ground:-1,x:side==='left'?floor.x1-55:floor.x2+55,jumps:1});
    assert.equal(read(),'jump/'+inward);
    pip.jumps=0;assert.equal(read(),'rise/'+inward);
    pip.usedUp=true;pip.hopWindow=.6;assert.equal(read(),'hop/'+inward);
    pip.hopWindow=0;assert.equal(read(),'drift/'+inward);
    pip.ledge={left:side==='left'};assert.equal(read(),'hang/'+inward);
    assert.equal(coach.lesson,'return');
    const [title,line]=window.FightSchool.cornerLine(read(),a=>'['+a+']');
    assert.equal(title,'Ledge caught');assert(line.includes('['+inward+']'));
    world.end=1;assert.equal(read(),'');
  }
});
test('ringside tips read a close shield and an outward finish, leave quiet time, and reset on a new stock',()=>{
  const {world,coach,pip,brisket,floor,read}=cornerFight();
  Object.assign(pip,{x:floor.x2-100,y:floor.y,ground:0});
  Object.assign(brisket,{x:floor.x2-50,y:floor.y,ground:0});
  assert.equal(read(),'opening');world.matchFrames+=211;assert.equal(read(),'');
  brisket.shield=true;assert.equal(read(),'grab');assert.equal(coach.lesson,'throw');
  brisket.shield=false;assert.equal(read(),'');
  brisket.damage=112;assert.equal(read(),'finish/right');assert.equal(coach.lesson,'stock');
  pip.x=floor.x1+100;brisket.x=floor.x1+50;assert.equal(read(),'finish/left');
  brisket.damage=0;world.matchCard.players[1].hits=2;assert.equal(read(),'guard');
  world.matchCard.players[0].blocks=1;assert.equal(read(),'');
  pip.stocks--;pip.stockLift={ready:true};assert.equal(read(),'');
  pip.stockLift=null;brisket.shield=true;assert.equal(read(),'grab');
  world.suddenDeath={round:1};assert.equal(read(),'');
});

test('older lesson saves resume the next uncleared skill and distinguish dismissing the welcome',()=>{
  const {readProgress,unfinished}=window.FightSchool;
  assert.equal(readProgress({seen:true,lesson:'move',passed:[]}).started,false);
  assert.equal(readProgress({started:true,lesson:'move'}).started,true);
  const saved=readProgress({seen:true,lesson:'stock',passed:lessons.filter(l=>l.id!=='guard').map(l=>l.id)});
  assert.equal(saved.started,true);
  assert.equal(lessons[unfinished(saved)].id,'guard');
  const all=readProgress({...saved,passed:lessons.map(l=>l.id)});
  assert.equal(unfinished(all),-1); assert.equal(all.firstFightDone,false);
  const malformed=readProgress({playedAt:'-1',lesson:'garbage',passed:['guard','guard','unknown']});
  assert.deepEqual(malformed.passed,['guard']);assert.equal(malformed.playedAt,0);
});
test('a first-fight loss offers a lesson grounded in the stock timeline and hit counts',()=>{
  const advice=(losses,hits,blocks,parries,theirHits)=>window.FightSchool.rematchLesson({
    losses,players:[{hits,blocks,parries},{hits:theirHits}]}).id;
  assert.equal(advice([{slot:0,zone:'bottom'}],1,0,0,1),'return');
  assert.equal(advice([{slot:1,zone:'bottom'}],0,0,0,1),'guard');
  assert.equal(advice([],0,0,1,3),'jab');
  assert.equal(advice([],5,2,0,3),'stock');
});

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
