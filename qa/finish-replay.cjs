const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,FinishTape,seededRandom,idleInput}=window.DogFight;
const dt=1/60;
function state({emit,random,...fields}) { return {fields,seed:random.state}; }

for(const mode of ['local','solo']) test(mode+' can seek or replay the final 240 ticks exactly',()=>{
  const cfg={mode,p1:'clover',p2:'noodle',stage:'canal',form:'original',fetch:true,coats:[2,1]};
  const battle=new Battle(cfg,undefined,seededRandom(75)), tape=new FinishTape(), expected=new Map();
  const input={...idleInput,tapped:{special:false}};
  for(let n=0;n<739;n++){
    input.x=n%120<60?.5:-.5;input.special=input.tapped.special=n%87===0;input.jump=n%73===0;
    const second={...idleInput,x:-input.x,attack:n%13===0};
    tape.record(battle,input,second);
    battle.step(dt,{...input,tapped:{...input.tapped}},second);
    if([499,500,517,600,738,739].includes(n+1)) expected.set(n+1,structuredClone(state(battle)));
  }
  assert.equal(tape.length,240);assert(tape.blocks.length<=3);
  const original=structuredClone(state(battle));
  for(const offset of [0,1,18,101,239,240]){
    const player=tape.playback(offset);
    assert.deepEqual(state(player.battle),expected.get(499+offset));
    while(player.step()) {}
    assert.deepEqual(state(player.battle),original);
  }
  const practice=tape.playback(1);
  practice.battle.dogs[0].stocks=0;
  assert.deepEqual(state(battle),original);
});

test('a new tape keeps shared grip references, releases, coats and a clock finish',()=>{
  const battle=new Battle({mode:'local',stage:'picnic',p1:'brisket',p2:'clover',coats:[3,2]},undefined,seededRandom(7));
  Object.assign(battle.dogs[0],{x:600,face:1});
  Object.assign(battle.dogs[1],{x:661,face:-1});
  battle.step(dt,{...idleInput,grab:true},idleInput);
  for(let n=0;n<50 && battle.grapple?.phase!=='hold';n++) battle.step(dt,idleInput,idleInput);
  assert.equal(battle.grapple.phase,'hold');
  battle.clockFrames=75;battle.dogs[1].stocks=2;
  const tape=new FinishTape();assert.equal(tape.playback(),null);
  for(let n=0;n<100 && battle.end===null;n++){
    const first={...idleInput,x:n===28?1:0,attack:n===0};
    tape.record(battle,first,idleInput);battle.step(dt,first,idleInput);
  }
  assert.equal(battle.endReason,'time');
  const clip=tape.playback();
  assert.equal(clip.battle.dogs[0].grip,clip.battle.grapple);
  assert.equal(clip.battle.dogs[1].grip,clip.battle.grapple);
  assert.notEqual(clip.battle.grapple,tape.blocks[0].battle.grapple);
  while(clip.step()) {}
  assert.deepEqual(state(clip.battle),state(battle));
});

test('two rollback peers keep only confirmed ticks after delayed corrections',()=>{
  const queues=[[],[]], tapes=[new FinishTape(),new FinishTape()], worlds=[];
  const peers=tapes.map((tape,i)=>{
    const session=new window.DogOnline.OnlineSession({start(cfg,rng){worlds[i]=new Battle(cfg,undefined,rng);}});
    session.side=i;session.send=msg=>{if(msg[0]==='input') queues[1-i].push(msg);};
    session.beginRound(['start',1,'noodle','clover','nightmail',22]);
    session.match.onConfirmedInput=(world,a,b)=>tape.record(world,a,b);
    return session.match;
  });
  function deliver(i){for(const msg of queues[i].splice(0))assert(peers[i].receive(msg[2],msg[3]));}
  for(let n=0;n<399;n++){
    if(n%6===0) {deliver(0);deliver(1);}
    for(const [i,match] of peers.entries()){
      match.tick(()=>({...idleInput,x:Math.sin(n/17+i),jump:(n+i)%59===0,special:(n+i)%137===0}),worlds[i]);
      assert.equal(tapes[i].count,match.confirmed);
    }
  }
  assert(peers.some(p=>p.pending.length>0));
  for(const [i,match] of peers.entries()){deliver(i);match.confirm(worlds[i]);}
  assert.equal(tapes[0].count,tapes[1].count);
  const final=state(peers[0].confirmedWorld);
  for(const [i,tape] of tapes.entries()){
    const player=tape.playback();
    while(player.step()) {}
    assert.deepEqual(state(player.battle),final);
    assert.deepEqual(state(peers[i].confirmedWorld),final);
  }
});
