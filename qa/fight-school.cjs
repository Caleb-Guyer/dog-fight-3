const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/fight-school.js');
require('../docs/lesson-guide.js');
const {Battle,idleInput}=window.DogFight;
const {Lesson,lessons}=window.FightSchool;
require('../docs/fight-records.js');
test('after repeated throw KOs the lesson rehearses interrupting the real grab, and a held shield is caught',()=>{
  for(const shield of [true,false])for(const quickAttack of [false,true]){
    let lesson;
    const w=new Battle({mode:'local',stage:'nightmail',p1:'pip',p2:'brisket',fetch:false},(n,e)=>lesson?.contact(n,e));
    const loss={slot:0,zone:'left',frame:130,lastHit:{id:w.dogs[1].kit.throws.back,frame:97}};
    w.matchCard.losses=[loss,{...loss,frame:420,lastHit:{...loss.lastHit,frame:390}}];
    assert.equal(window.FightSchool.rematchLesson(w.matchCard).id,'jab');
    assert.equal(window.FightRecords.coaching(w.matchCard,0).id,'escape-gripEscape');
    w.matchCard.losses[0].frame=700;
    assert.equal(window.FightRecords.throwLosses(w.matchCard,0),1);
    lesson=new Lesson(lessons.findIndex(l=>l.id==='jab'),w,true);
    assert.equal(lesson.canStep(idleInput),false);
    for(let i=0;i<60 && !lesson.done && !lesson.missed;i++){
      const input={...idleInput,quickAttack,shield,attack:!shield && i===0};
      if(lesson.canStep(input)){w.step(1/60,input,lesson.partner(input));lesson.afterStep(w);}
    }
    assert.equal(lesson.done,!shield);assert.equal(lesson.missed,shield);
    if(shield){
      const corner=new window.FightSchool.Corner();
      assert.equal(corner.read(w),'caught');assert.equal(corner.practice,'escape-gripEscape');
    }
  }
});
function guided(id){
  let lesson;
  const events=[],w=new Battle({mode:'local',p1:'pip',p2:'brisket',form:'original',fetch:false,minutes:0,
    stage:id==='platform'?'picnic':'nightmail'},(name,e)=>{lesson?.contact(name,e);events.push(name);});
  lesson=new Lesson(lessons.findIndex(l=>l.id===id),w);
  const guide=lesson.guide=new window.LessonGuide.Guide(id,w.terrain);
  const tick=(input={})=>{
    const p={...idleInput,...input};
    if(lesson.canStep(p)){w.step(1/60,p,lesson.partner(p));lesson.afterStep(w);return true;}
    return false;
  };
  return {w,lesson,guide,events,tick};
}
test('every core lesson waits for physical inputs, then clears through the actual battle with either ground Attack layout',()=>{
  for(const {id} of lessons)for(const quickAttack of [false,true]){
    const {w,lesson,guide:g,tick}=guided(id),start=w.dogs[0].x;
    for(let i=0;i<100;i++)assert.equal(tick({x:-1,special:true}),false,id);
    assert.equal(w.matchFrames,0);assert.equal(w.dogs[0].x,start);assert(!lesson.done);
    for(let n=0;n<240 && !lesson.done;n++){
      const p={quickAttack};
      if(!g.running || g.step.hold)for(const k of g.step.keys){
        if(k==='right')p.x=1;else if(k==='up')p.y=-1;else if(k==='down')p.y=1;
        else if(k!=='center' && k[0]!=='!')p[k]=true;
      }
      tick(p);
    }
    assert(lesson.done && !lesson.missed,id);assert(w.matchFrames>0);
    if(id==='stock')assert.equal(w.dogs[1].stocks,2);
  }
});
test('Pip stays airborne at the second jump and keeps the exact charge until the requested release',()=>{
  const p=guided('platform');
  for(let i=0;i<200;i++)p.tick({jump:true});
  assert.equal(p.guide.index,1);assert.equal(p.w.matchFrames,16);
  for(let i=0;i<200;i++)p.tick();
  assert.equal(p.guide.index,2);assert.equal(p.w.matchFrames,20);
  assert(p.w.dogs[0].ground<0);p.tick({jump:true});
  for(let i=0;i<80;i++)p.tick();assert(p.lesson.done);
  const r=guided('stock');
  for(let i=0;i<120;i++)r.tick({x:1,smash:true,y:1});
  assert.equal(r.w.matchFrames,0);
  for(let i=0;i<120;i++)r.tick({x:1,smash:true});
  assert.equal(r.guide.index,1);const charge=r.w.dogs[0].charge;
  assert(charge>=.48 && charge<.55);
  for(let i=0;i<120;i++)r.tick({x:1,smash:true});
  assert.equal(r.w.dogs[0].charge,charge);
  for(let i=0;i<100;i++)r.tick();
  assert(r.events.includes('hit'));assert(r.events.includes('ko'));assert(r.lesson.done);
});
test('a partial chord or a competing button leaves both fighters and the clock in place',()=>{
  const {w,guide,tick}=guided('air'),[p,r]=w.dogs;
  for(let i=0;i<60;i++)tick({jump:true});
  assert.equal(guide.mask,1);assert.equal(w.matchFrames,0);assert(p.ground>=0);
  tick({jump:true,attack:true,special:true});assert.equal(guide.extra,'special');assert.equal(w.matchFrames,0);
  tick({jump:true,attack:true});assert.equal(w.matchFrames,1);
  for(let i=0;i<50;i++)tick();
  assert(r.damage>0);
});

function cornerFight(){
  const world=new Battle({mode:'solo',stage:'picnic',p1:'pip',p2:'brisket',fetch:false,minutes:7});
  const coach=new window.FightSchool.Corner(),[pip,brisket]=world.dogs,floor=world.terrain[0];
  return {world,coach,pip,brisket,floor,read:()=>coach.read(world)};
}
test('Fight School reads the shield below Pip and shows the matching controls and practice',()=>{
  const {world,coach,pip,brisket,read}=cornerFight(),bench=world.terrain[1];
  Object.assign(pip,{ground:1,x:410,y:bench.y});brisket.x=pip.x+20;
  assert.equal(read(),'perch');assert.equal(coach.practice,'platform-below');
  assert.match(window.FightSchool.cornerLine('perch',a=>'['+a+']')[1],/\[down\].*\[attack\]/);
  brisket.shield=true;assert.equal(read(),'perchGrab');assert.equal(coach.practice,'throw');
  assert.match(window.FightSchool.cornerLine('perchGrab',a=>'['+a+']')[1],/\[grab\]/);
  brisket.x+=200;assert.notEqual(read(),'perchGrab');
});
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
  pip.stocks--;pip.stockLift={ready:true};assert.equal(read(),'lift');assert.equal(coach.practice,'launch-stock-return');
  pip.stockLift=null;brisket.shield=true;assert.equal(read(),'grab');
  world.suddenDeath={round:1};assert.equal(read(),'');
});
test('the first fight teaches both sides of a stock change and prioritizes getting back to the edge',()=>{
  const {world,coach,pip,brisket,floor,read}=cornerFight();
  world.beginStockReturn(brisket);
  assert.equal(read(),'landing');assert.equal(coach.practice,'launch-stock-catch');
  Object.assign(pip,{ground:-1,x:floor.x1-60,y:floor.y+20,jumps:1});
  assert.equal(read(),'jump/right');
  world.beginStockReturn(pip);assert.equal(read(),'lift');
  assert.match(window.FightSchool.cornerLine('lift',action=>'['+action+']')[1],/\[down\].*\[jump\]/);
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
  const target=new window.FightSchool.Corner(id).target;
  let lesson;
  const w=new Battle({mode:'local',stage:id==='platform'?'picnic':'nightmail',p1:'pip',p2:'brisket',fetch:false,minutes:0},
    (name,e)=>{if(lesson)target?.contact(name,e,w);lesson?.contact(name,e);events.push(name);});
  lesson=new Lesson(index,w);
  target?.step(w);
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
    if(lesson.canStep(i)){w.step(1/60,i,lesson.partner(i));lesson.afterStep(w);target?.step(w);}
  }
  return {lesson,w,events,target};
}
for (const [index,info] of lessons.entries()) test(info.title+' requires a real action',()=>{
  const attempt=tryLesson(index,true);
  assert(attempt.lesson.done && !attempt.lesson.missed);
  assert(!tryLesson(index,false).lesson.done);
  if(info.id==='stock'){assert(attempt.events.includes('ko'));assert.equal(attempt.w.dogs[1].stocks,2);}
  if(info.id==='return')assert(attempt.lesson.cast && attempt.w.dogs[0].ground===0);
});
test('all four rematch targets recognize performed moves and ignore idle fighters',()=>{
  for(const id of ['return','guard','jab','stock']){
    const index=lessons.findIndex(l=>l.id===id);
    assert.notEqual(tryLesson(index,true).target.doneAt,null,id);
    assert.equal(tryLesson(index,false).target.doneAt,null,id);
  }
});
test('respawning cannot count as recovering and a missed smash cannot earn a knockout',()=>{
  const {world,pip,brisket,floor}=cornerFight();
  const recovery=new window.FightSchool.Corner('return').target;
  Object.assign(pip,{ground:-1,x:floor.x1-55});recovery.step(world);
  recovery.contact('ko',{f:pip},world);
  Object.assign(pip,{ground:0,x:600});recovery.step(world);
  assert.equal(recovery.doneAt,null);
  const stock=new window.FightSchool.Corner('stock').target;
  world.matchCard.players[1].lastHit={id:pip.kit.smashes.side,frame:12};
  world.matchFrames=613;stock.contact('ko',{f:brisket},world);assert.equal(stock.doneAt,null);
  const jab=new window.FightSchool.Corner('jab').target;
  jab.contact('hit',{owner:brisket,f:pip,moveId:brisket.kit.ground[0]},world);assert.equal(jab.doneAt,null);
  const guard=new window.FightSchool.Corner('guard').target;
  guard.contact('parry',{f:pip},world);assert.equal(guard.doneAt,613);
});
test('saved rematch practice survives reload, rejects invalid data and respects a newer result',()=>{
  const {readProgress,updateRematch}=window.FightSchool;
  const a='0000000000000001-0123456789abcdef',b='0000000000000002-0123456789abcdef';
  const save=readProgress({firstFightDone:true});
  assert.equal(save.rematch,null);
  updateRematch(save,{loss:'return',ticket:a});
  const restored=readProgress(save);assert.deepEqual(restored.rematch,{id:'return',ticket:a,fight:false});
  updateRematch(restored,{loss:'guard',ticket:b});updateRematch(restored,{fight:a});
  assert.equal(restored.rematch.fight,false);updateRematch(restored,{fight:b});
  assert.equal(readProgress(restored).rematch.fight,true);
  for(const rematch of [{id:'unknown',ticket:a},{id:'guard',ticket:25}]){
    assert.equal(readProgress({...save,rematch}).rematch,null);
  }
  updateRematch(restored,{won:true});updateRematch(restored,{loss:'stock',ticket:a});
  assert.equal(restored.firstFightWon,true);assert.equal(readProgress(restored).rematch,null);
});
