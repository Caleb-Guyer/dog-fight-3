const test=require('node:test'),assert=require('node:assert/strict');
global.window={};global.document={currentScript:{src:'https://example.test/finish-tools.js'}};
require('../docs/engine.js');require('../docs/finish-tools.js');
const {Battle,FinishTape,idleInput,seededRandom}=window.DogFight;
test('recorded sticks, holds, releases and between-tick taps line up with the displayed frame',()=>{
  const world=new Battle({mode:'local',p1:'clover',p2:'noodle',stage:'picnic',fetch:false},undefined,seededRandom(2));
  const tape=new FinishTape(),read=(n,i=0)=>window.FinishTools.inputFrame(tape,n,i);
  for(let n=1;n<=383;n++){
    const a={...idleInput,x:n>=141 && n<=147?-.5:0,shield:n>=143 && n<=145,
      tapped:{special:n===147,attack:n===150 || n===151},attack:n>=150 && n<=153};
    const b={...idleInput,aimStick:n===151,smashX:1,smashY:-.25,jump:n===156,shortHop:n===156};
    tape.record(world,a,b);world.step(1/60,a,b);
  }
  // This rolling window starts after tick 143, with Shield already held.
  assert.equal(read(0).movement,'Left 50%');assert.deepEqual(read(0).actions,['Shield held']);
  assert.equal(read(0).changed,false);assert.equal(read(1).changed,false);
  assert.deepEqual(read(3).actions,['Shield released']);assert.deepEqual(read(4).actions,['Special tapped']);
  assert.equal(read(5).movement,'Center');assert(read(5).changed);
  assert.deepEqual(read(7).actions,['Attack pressed']);assert.deepEqual(read(8).actions,['Attack pressed']);
  assert.deepEqual(read(9).actions,['Attack held']);assert.equal(read(9).changed,false);
  assert.deepEqual(read(11).actions,['Attack released']);
  assert.equal(read(8,1).aim,'Right 100% + Up 25%');
  assert.deepEqual(read(13,1).actions,['Short hop pressed']);
  assert.deepEqual(read(14,1).actions,['Short hop released']);
});
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
function launchRecording(opening, slot, releaseFrame, aim) {
  const world=new Battle({stage:'nightmail',form:'trio',mode:slot?'local':'solo',
    cpuLevel:'rival',p1:slot?'brisket':'pip',p2:slot?'pip':'brisket',
    stockCount:slot?1:3,fetch:false,throwOpening:opening},undefined,seededRandom(31));
  if(slot){
    const [guard,p]=world.dogs,y=world.terrain[3].y;
    Object.assign(guard,{x:600,y,ground:3,face:1});
    Object.assign(p,{x:644,y,ground:3,face:-1,damage:125});
  }
  let ko;
  world.emit=(n,e)=>{if(n==='ko' && e.f.index===slot)ko={x:e.x,y:e.y};};
  const tape=new FinishTape(),points=[{x:world.dogs[slot].x,y:world.dogs[slot].y}];
  for(let frame=1;frame<=160 && world.end===null && !ko;frame++){
    const inputs=[slot?{...idleInput,grab:frame===1,y:world.grapple?.phase==='hold'?-1:0}:idleInput,idleInput];
    if(frame===releaseFrame)inputs[slot]={...idleInput,...aim};
    tape.record(world,...inputs);world.step(1/60,...inputs);
    const {x,y}=ko || world.dogs[slot];points.push({x,y});
  }
  tape.captureKnockouts(world);
  return {points,clip:tape.knockouts[0]?.tape,world};
}
for(const [opening,slot] of [['perch',0],['edge',0],['perch',1]]){
  test('launch comparison matches an independent fight frame for frame on '+opening+' for P'+(slot+1),()=>{
    const {clip,points,world}=launchRecording(opening,slot);
    const {launch}=window.FinishTools.analyze(clip,slot);
    assert(launch && launch.slot===slot);
    const original=window.FinishTools.launchFlight(clip,launch);
    assert.deepEqual(original.points,points.slice(launch.frame-1));
    assert.match(original.outcome,/KO at the (top|left) line/);
    const saved=structuredClone(world.matchCard);
    for(const [x,y] of [[0,0],[1,0],[-1,0],[0,-1],[1,1]]){
      const path=window.FinishTools.launchFlight(clip,launch,{x,y});
      const independent=launchRecording(opening,slot,launch.frame,{x,y});
      assert.deepEqual(path.points,independent.points.slice(launch.frame-1,path.frame+1));
      assert(path.frame<=clip.length);
    }
    assert.deepEqual(world.matchCard,saved);
    assert.deepEqual(window.FinishTools.launchFlight(clip,launch),original);
    assert.equal(window.FinishTools.analyze(clip,1-slot).launch,null);
  });
}
test('a fall without a steering window and a time expiry have no launch comparison',()=>{
  assert.equal(window.FinishTools.analyze(play('ko',15),1).launch,null);
  assert.equal(window.FinishTools.analyze(play('clock',30),0).launch,null);
});
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
