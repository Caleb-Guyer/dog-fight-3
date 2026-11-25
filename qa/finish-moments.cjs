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
