const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
const {Battle,FinishTape,fighters,idleInput,seededRandom} = window.DogFight;
const tick = 1/60;
const dogs = Object.keys(fighters);
function setup(p1,p2,mode,side,extra={},event) {
  return new Battle({p1,p2,stage:'picnic',fetch:false,cpuLevel:'rival',mode,highReturn:side,...extra},event,seededRandom(42));
}
function attempt(w,side,route) {
  w.resetAirPractice('highReturn',side);
  const drill=w.airPractice, guard=w.dogs[1], inward=side==='left'?1:-1;
  let swung=false, airborne=false, back=false;
  for(let frame=0;frame<195;frame++){
    let input=route(frame,inward);
    if(!frame)input={...input,attack:true,tapped:{attack:true}};
    w.step(tick,input,idleInput);
    if(guard.attack?.moveId===guard.kit.air.forward)swung=true;
    if(guard.ground<0 && !guard.ledge)airborne=true;
    if(airborne && (guard.ground>=0 || guard.ledge))back=true;
  }
  assert(swung && back,guard.kind+' challenged and returned');
  return drill;
}
test('all 16 pairings can jump past the committed swing on either ledge and recover cleanly',()=>{
  for(const hero of dogs)for(const guard of dogs)for(const side of ['left','right']){
    const w=setup(hero,guard,'training',side);
    const read=attempt(w,side,(i,x)=>({...idleInput,x,jump:i>=6 && i<16}));
    assert.equal(read.outcome,'clean',hero+'/'+guard+'/'+side);
    assert(!read.clipped);
  }
});
test('real hits, last-moment air dodges and recoveries after a hit lead to different outcomes',()=>{
  for(const guard of dogs)for(const side of ['left','right']){
    const w=setup('pip',guard,'training',side);
    assert(attempt(w,side,()=>idleInput).clipped);
    assert.equal(attempt(w,side,(i,x)=>({...idleInput,x,shield:i===10})).outcome,'clean');
  }
  const w=setup('pip','brisket','training','left');
  assert.equal(attempt(w,'left',(i,x)=>({...idleInput,x,jump:i===30,special:i===42,y:i===42?-1:0})).outcome,'saved');
});
test('the drill waits for the cue, eats only the start press, and resets after a partial attempt',()=>{
  const w=setup('clover','noodle','training','right',{stage:'laundry'});
  w.resetAirPractice('highReturn','right',false,'brisket');
  const x=w.dogs[0].x;
  for(let i=0;i<30;i++)w.step(tick,{...idleInput,x:-1},idleInput);
  assert.equal(w.dogs[0].x,x);assert.equal(w.airPractice.phase,'ready');
  for(let i=0;i<8;i++)w.step(tick,{...idleInput,attack:true},idleInput);
  assert(w.bot.edgeHop);assert.equal(w.dogs[0].attack,null);
  w.airPractice.slow=false;
  w.resetAirPractice('highReturn','left',false,'brisket');
  assert.equal(w.bot.edgeHop,null);assert.equal(w.airPractice.slow,false);
  w.resetTraining();
  assert.deepEqual(w.dogs.map(f=>f.kind),['clover','noodle']);
});
test('the ordinary Rival decision hits with each dog and its offstage commitment replays deterministically',()=>{
  for(const kind of dogs)for(const side of ['left','right']){
    const events=[];
    const w=setup('pip',kind,'solo',side,{},(name,e)=>{if(name==='hit')events.push(e.moveId);});
    const tape=new FinishTape();
    for(let i=0;i<32;i++){tape.record(w,idleInput,idleInput);w.step(tick,idleInput,idleInput);}
    assert(events.includes(w.dogs[1].kit.air.forward));assert(w.dogs[0].damage>60);
    const replay=tape.playback(tape.length).battle;
    assert.deepEqual(replay.dogs.map(f=>[f.x,f.y,f.damage]),w.dogs.map(f=>[f.x,f.y,f.damage]));
    assert.deepEqual(replay.bot.edgeHop,w.bot.edgeHop);
  }
});
test('Rival stays on deck for a low, distant, or protected opponent and leaves stage gaps alone',()=>{
  for(const change of [f=>f.y+=160,f=>f.x+=180,f=>f.invuln=1,f=>f.vy=-500]){
    const w=setup('pip','brisket','solo','right');change(w.dogs[0]);w.cpu(tick);assert(!w.bot.edgeHop);
  }
  for(const cpuLevel of ['arcade','rookie']){
    const w=setup('pip','brisket','solo','left',{cpuLevel});w.cpu(tick);assert(!w.bot.edgeHop);
  }
  const w=setup('pip','noodle','solo','right',{stage:'laundry'});
  const [hero,guard]=w.dogs, inner=w.terrain[0].x2;
  Object.assign(guard,{ground:0,face:1,x:inner-10,y:w.terrain[0].y});
  Object.assign(hero,{ground:-1,x:inner+88,y:guard.y-100});
  w.cpu(tick);assert(!w.bot.edgeHop);
});
