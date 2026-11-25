const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
const {Battle,fighters,idleInput,seededRandom,FinishTape}=window.DogFight;
const tick=1/60;
const press=key=>({...idleInput,[key]:true,tapped:{[key]:true}});
const setup=(p1,p2,mode='training',extra={})=>new Battle({p1,p2,mode,stage:'picnic',fetch:false,cpuLevel:'rival',...extra},undefined,seededRandom(11));
function attempt(world,side,exit,delay){
  world.resetLedgeRollPractice('scout',side);
  const drill=world.rollPractice;
  for(let i=0;i<210 && drill.phase!=='done';i++){
    const input=i===0?press('attack'):i===delay?press(exit):idleInput;
    world.step(tick,input,idleInput);
  }
  assert.equal(drill.phase,'done');
  return drill;
}
test('all sixteen matchups learn two actual ledge rolls on either side and commit to the third',()=>{
  for(const p1 of Object.keys(fighters))for(const p2 of Object.keys(fighters))for(const side of ['left','right']){
    const w=setup(p1,p2);
    for(const count of [1,2]){
      const drill=attempt(w,side,'shield',8);
      assert.equal(drill.rollHabit.count,count);assert.equal(drill.rollForecast,undefined);
    }
    const third=attempt(w,side,'shield',8);
    assert.equal(third.outcome,'caught',p1+'/'+p2+'/'+side);
    assert.equal(third.ledgeRollCatches,1);
    const delay=attempt(w,side,'shield',60);
    assert.equal(delay.outcome,'baited');
    assert.equal(delay.ledgeRollCatches,undefined);
  }
});
test('a different exit breaks the streak and the guard cannot change its prediction after seeing a jump',()=>{
  const w=setup('pip','brisket');
  attempt(w,'left','shield',8);attempt(w,'left','jump',8);
  assert.equal(attempt(w,'left','shield',8).rollHabit.count,1);
  const second=attempt(w,'right','shield',16), timing=second.rollHabit.delay;
  assert(timing>8/60 && timing<17/60);
  const jump=attempt(w,'right','jump',8);
  assert.equal(jump.outcome,'baited');assert(jump.rollForecast.thrown);assert.equal(jump.rollHabit,null);
  assert.equal(attempt(w,'left','shield',8).ledgeRollReads,undefined);
  w.resetLedgeRollPractice('guard','left');
  assert.equal(attempt(w,'left','shield',8).rollHabit.count,1);
});
test('a Rival learns in a normal match, remembers across stocks and reproduces its grab on replay',()=>{
  const w=setup('pip','brisket','solo');
  function catchLedge(){
    const f=w.terrain[0],edge={left:true,x:f.x1,y:f.y,index:0};
    for(const dog of w.dogs)w.spawn(dog,false,false);
    w.hangLedge(w.dogs[0],edge);w.placeRollGuard(edge);
  }
  for(let i=0;i<2;i++){
    catchLedge();
    for(let n=0;n<=8;n++)w.step(tick,n===8?press('shield'):idleInput,idleInput);
    assert.equal(w.bot.rollHabit.count,i+1);assert.equal(w.bot.ledgeRollReads,undefined);
  }
  for(const dog of w.dogs)w.spawn(dog,true,false);
  assert.equal(w.bot.rollHabit.count,2);
  catchLedge();const tape=new FinishTape();
  for(let n=0;n<50 && !w.grapple;n++){
    const input=n===8?press('shield'):idleInput;
    tape.record(w,input,idleInput);w.step(tick,input,idleInput);
  }
  assert.equal(w.bot.ledgeRollCatches,1);
  const replay=tape.playback(tape.length).battle;
  assert.equal(replay.bot.ledgeRollCatches,1);assert.equal(replay.grapple.owner,w.grapple.owner);
  for(const mode of ['local','solo']){
    const neutral=setup('pip','brisket',mode,{cpuLevel:'rookie'});
    neutral.hangLedge(neutral.dogs[0],{index:0,left:true,x:neutral.terrain[0].x1,y:neutral.terrain[0].y});
    neutral.step(tick,press('shield'),idleInput);
    assert.equal(neutral.bot.rollHabit,undefined);
  }
});
