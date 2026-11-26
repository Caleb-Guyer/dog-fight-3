const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
const {Battle,FinishTape,fighters,idleInput,seededRandom}=window.DogFight;
const beat=1/60;
function exchange(hero,guard,side,exit,opts={}) {
  const hits=[],sweet=[],shots=[],dir=side==='left'?1:-1;
  const tape=opts.record && new FinishTape();
  const world=new Battle({mode:'solo',cpuLevel:'rival',stage:'nightmail',fetch:false,p1:hero,p2:guard,
    ledgeTrapStart:side,...opts.config},(event,e)=>{
    if(event==='hit')hits.push([e.f.index,e.moveId]);
    if(event==='sweetSpot')sweet.push(e.moveId);
    if(event==='disc')shots.push([world.matchFrames,e.moveId]);
  },seededRandom(42));
  const [climber,sentry]=world.dogs;
  let release,firstCharge;
  for(let frame=0;frame<55;frame++) {
    const input={...idleInput};
    if(exit==='jump' && frame>=8 && frame<33){input.x=dir;input.jump=true;}
    if(exit==='rise' && frame===8)input.x=dir;
    if(exit==='strike' && frame===8)input.attack=true;
    if(exit==='roll'){
      if(frame===8)input.shield=true;
      if(frame>8 && !climber.ledge && !climber.floorAction){
        input.quickAttack=input.attack=true;input.x=dir;
      }
    }
    if(tape)tape.record(world,input,idleInput);
    world.step(beat,input,idleInput);
    if(!frame)firstCharge=sentry.smashCharge?.moveId;
    if(!release && sentry.attack?.moveId===firstCharge)release=frame;
  }
  return {world,hits,sweet,shots,tape,firstCharge,release};
}
const openings={
  pip:['pipScissors','jump','strike'],brisket:['brisketHaymaker','rise','jump'],
  noodle:['noodleLeadSnap','rise','roll'],clover:['cloverLineDrive','rise','jump'],
};
for(const [guard,[smash,bad,good]] of Object.entries(openings)){
  test(guard+' threatens a specific ledge exit while all four climbers can beat the read on either side',()=>{
    for(const hero of Object.keys(fighters))for(const side of ['left','right']){
      const caught=exchange(hero,guard,side,bad), escape=exchange(hero,guard,side,good);
      assert.equal(caught.firstCharge,smash);
      assert.deepEqual(caught.hits[0],[0,smash],hero+'/'+side);
      assert(!escape.hits.some(([slot,move])=>slot===0 && move===smash));
      if(guard==='noodle')assert(caught.sweet.includes(smash));
      if(guard==='clover')assert.deepEqual(caught.shots[0],escape.shots[0]);
      if(guard==='pip' || guard==='noodle')assert.equal(escape.hits[0][0],1);
      assert.equal(escape.world.dogs[0].stocks,3);
    }
  });
}
test('opening replay preserves the CPU commitment, the projectile and the actual hit',()=>{
  for(const [guard,[,exit]] of Object.entries(openings)){
    const {world,tape}=exchange('pip',guard,'right',exit,{record:true});
    const copy=tape.playback(tape.length).battle;
    const sample=battle=>battle.dogs.map(f=>[f.x,f.y,f.damage,f.stocks,f.lastMove]);
    assert.deepEqual(sample(copy),sample(world));
    assert.deepEqual(copy.projectiles,world.projectiles);
    assert.equal(copy.bot.ledgeTrap?.deadline,world.bot.ledgeTrap?.deadline);
  }
});
test('a natural ledge catch can trigger the guard while lower CPU levels and unsafe positions do not',()=>{
  for(const guard of Object.keys(fighters)){
    for(const cpuLevel of ['rookie','arcade','rival']){
      const w=new Battle({mode:'solo',p1:'clover',p2:guard,stage:'laundry',cpuLevel},undefined,seededRandom(19));
      const floor=w.terrain[1],edge={x:floor.x2,y:floor.y,index:1,left:false};
      const [p,g]=w.dogs;
      w.hangLedge(p,edge);
      Object.assign(g,{x:edge.x-w.ledgeTrapSpacing(g,p),y:edge.y,ground:1,face:1});
      if(cpuLevel==='rival'){
        g.x-=140;w.cpu(beat);assert(!w.bot.ledgeTrap);g.x+=140;
        g.face=-1;w.cpu(beat);assert(!w.bot.ledgeTrap);g.face=1;
      }
      w.step(beat,idleInput,idleInput);
      assert.equal(!!w.bot.ledgeTrap,cpuLevel==='rival');
      w.spawn(g,true,false);assert(!w.bot.ledgeTrap);
    }
  }
});
