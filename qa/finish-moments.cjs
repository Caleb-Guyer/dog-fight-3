const test=require('node:test'),assert=require('node:assert/strict');
global.window={};global.document={currentScript:{src:'https://example.test/finish-tools.js'}};
require('../docs/engine.js');require('../docs/finish-tools.js');
const {Battle,FinishTape,idleInput,seededRandom}=window.DogFight;
function play(action,length){
  const world=new Battle({mode:'local',p1:'pip',p2:'brisket',stage:'picnic',minutes:0},undefined,seededRandom(5));
  const [f,r]=world.dogs,tape=new FinishTape(),ground=world.terrain[0].y;
  Object.assign(f,{x:400,y:ground,ground:0,face:1,invuln:0,stockGuard:0});
  Object.assign(r,{x:450,y:ground,ground:0,face:-1,invuln:0,stockGuard:0,stocks:2});
  if(action==='clock')world.clockFrames=5;
  if(action==='ko')Object.assign(r,{y:900,ground:-1,stocks:1});
  for(let n=0;n<length && world.end===null;n++){
    const a={...idleInput,quickAttack:true,attack:action==='jab' && n===5,grab:action==='throw' && n===0,
      x:action==='throw' && n===20?1:0,shield:action==='parry' && n<30};
    const b={...idleInput,quickAttack:true,attack:action==='parry' && n===29};
    tape.record(world,a,b);world.step(1/60,a,b);
  }
  return tape;
}
for(const [action,label,event] of [['jab','Pip · Quick Paw','hit'],['throw','Pip · Kickoff','throwRelease'],
  ['parry','Pip · Parry','parry'],['ko','Brisket · KO','ko'],['clock','Time expired','win']]){
  test(action+' marker seeks to the exact simulation event',()=>{
    const tape=play(action,65),marks=window.FinishTools.moments(tape),events=[];
    assert.equal(marks.length,1);assert.equal(marks[0].label,label);
    const player=tape.playback(marks[0].frame-1,name=>events.push(name));
    player.step();assert(events.includes(event));assert.equal(player.frame,marks[0].frame);
    assert.deepEqual(window.FinishTools.moments(tape),marks);
  });
}
test('a hit before the rolling clip starts has no jump button',()=>{
  assert.deepEqual(window.FinishTools.moments(play('jab',305)),[]);
});

test('an early stock can be saved from its actual stage departure after the fight has moved on',()=>{
  const w=new Battle({mode:'local',stage:'picnic',p1:'pip',p2:'clover',stockCount:5,fetch:false},undefined,seededRandom(9));
  const tape=new FinishTape(),ends=[];
  for(let n=0;n<1200;n++){
    const count=w.matchCard.losses.length,input={...idleInput,x:n<260 || n>550?-1:0};
    tape.record(w,input,idleInput);w.step(1/60,input,idleInput);
    if(w.matchCard.losses.length!==count)ends.push(structuredClone(w.dogs));
  }
  tape.captureKnockouts(w);tape.captureKnockouts(w);
  assert.equal(tape.knockouts.length,4);
  for(const [i,c] of tape.knockouts.entries()){
    assert.equal(c.first,i);assert.deepEqual(c.tape.playback(c.tape.length).battle.dogs,ends[i]);
    const a=window.FinishTools.analyze(c.tape,0);
    assert.equal(a.escape.label,'Before leaving the stage');assert(a.escape.frame<c.tape.length);
    const rehearsal=c.tape.playback(a.escape.frame,undefined,0);
    while(rehearsal.step(idleInput)){}
    assert.equal(rehearsal.battle.dogs[0].stocks,c.losses[0].remaining+1);
    assert.equal(c.tape.playback(c.tape.length).battle.dogs[0].stocks,c.losses[0].remaining);
  }
  assert.equal(w.dogs[0].stocks,1);
  const jab=window.FinishTools.analyze(play('jab',65),1);
  assert.equal(jab.escape.label,'Before Quick Paw');assert(jab.escape.frame<jab.marks[0].frame);
});

test('double KOs share a clip and long Time Battles retain the latest twelve distinct exchanges',()=>{
  const w=new Battle({mode:'local',stage:'picnic',p1:'pip',p2:'pip',timeBattle:true,minutes:7,fetch:false},undefined,seededRandom(8));
  const tape=new FinishTape();
  w.dogs.forEach(f=>Object.assign(f,{y:860,ground:-1}));
  for(let i=0;i<4100;i++){
    const a={...idleInput,x:-1};tape.record(w,a,idleInput);w.step(1/60,a,idleInput);
    if(i===1){
      const [c]=tape.knockouts;assert.equal(c.losses.length,2);assert.equal(c.tape.length,1);
      assert.deepEqual(c.tape.playback(1).battle.matchCard.points,[-1,-1]);
    }
  }
  tape.captureKnockouts(w);
  assert(w.matchCard.losses.length>14);assert.equal(tape.knockouts.length,12);
  assert(tape.knockouts[0].first>1);
  for(const c of tape.knockouts){
    assert(c.tape.blocks.length<=3);
    const after=c.tape.playback(c.tape.length).battle.matchCard;
    assert.deepEqual(after.points,c.losses.at(-1).points);
    assert.deepEqual(after.losses.at(-1),w.matchCard.losses[c.first+c.losses.length-1]);
  }
});
