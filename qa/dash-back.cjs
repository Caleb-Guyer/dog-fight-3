const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/controls.js');
require('../docs/online.js');
const {Battle, FinishTape, idleInput, kits, seededRandom} = window.DogFight;

function fight(role, overrides = {}) {
  const events = [];
  const battle = new Battle({stage:'picnic',mode:'solo',cpuLevel:'rival',fetch:false,
    p1:role === 'bait' ? 'pip' : 'brisket', p2:role === 'bait' ? 'brisket' : 'pip',
    dashBackOpening:role,...overrides}, (name,e) => events.push({name,id:e.moveId,frame:battle.matchFrames}), seededRandom(42));
  return {battle,events};
}
function tick(b,input = idleInput) { b.step(1/60,{...idleInput,...input},idleInput); }

test('overlapping directions reverse an early dash and retain fighter-specific braking on a full run',()=>{
  const stops=new Set();
  for(const kind of Object.keys(kits))for(const dir of [-1,1])for(const running of [false,true]){
    const input=new window.FightControls.HorizontalInput(),pad={index:0,id:'test'};
    const w=new Battle({mode:'local',stage:'picnic',p1:kind,p2:'clover',fetch:false});
    const f=w.dogs[0];input.last=dir;
    for(let i=0;i<(running?18:3);i++)tick(w,{x:input.samplePad(pad,dir<0,dir>0)});
    const at=f.x;input.last=-dir;
    for(let i=0;i<30;i++){
      const x=input.samplePad(pad,true,true);assert.equal(x,input.keys(true,true));tick(w,{x,grabX:x});
      if(i===0)assert.equal(f.run.face,running?dir:-dir);
      if(f.vx*dir<0){if(running && dir===1)stops.add(Math.round((f.x-at)*10));break;}
    }
    assert(f.vx*dir<0);assert.equal(input.samplePad(pad,dir<0,dir>0),dir);
    assert.equal(input.samplePad({index:1,id:'new'},true,true),0);input.clear();
    assert.equal(input.keys(true,true),0);assert.equal(input.samplePad(pad,true,true),0);
  }
  assert.equal(stops.size,4);
});

test('five frames of network delay correct both players’ overlapping turns to the recorded local fight',()=>{
  const sides=[0,1].map(side=>{
    let battle;const sent=[],session=new window.DogOnline.OnlineSession({start(c,r){battle=new Battle(c,()=>{},r);}});
    session.side=side;session.send=data=>{if(data[0]==='input')sent[data[2]]=data[3];};
    session.beginRound(['start',1,'pip','brisket','picnic',42]);
    return {battle,net:session.match,sent,axis:new window.FightControls.HorizontalInput()};
  });
  const ref=new Battle({mode:'local',stage:'picnic',p1:'pip',p2:'brisket',fetch:true},()=>{},seededRandom(42));
  const pose=w=>w.dogs.map(f=>[f.x,f.vx,f.face,f.run?.face,!!f.run?.turned,f.attack?.moveId]);
  const history=[pose(ref)];let corrected=false;
  for(let t=0;t<40;t++){
    const pair=sides.map(({axis},i)=>{
      const dir=i?-1:1;
      if(t===0)axis.last=dir;
      if(t===3 || t===22)axis.last=-dir;
      const overlap=t>=3&&t<6 || t>=22&&t<27;
      const x=axis.keys(overlap||dir<0,overlap||dir>0);
      return {...idleInput,x,grabX:x,smashX:x,attack:t===30};
    });
    ref.step(1/60,...pair);history.push(pose(ref));
    for(const [i,p] of sides.entries()){
      if(t>=5)assert(p.net.receive(t-5,sides[1-i].sent[t-5]));
      p.net.tick(()=>pair[i],p.battle);
      assert.deepEqual(pose(p.net.confirmedWorld),history[p.net.confirmed]);
      if(t===3 && p.battle.dogs[1-i].vx!==ref.dogs[1-i].vx)corrected=true;
    }
  }
  assert(corrected);
  for(const [i,p] of sides.entries()){
    const packets=sides[1-i].sent;
    for(let n=p.net.received;n<packets.length;n++)assert(p.net.receive(n,packets[n]));
    p.net.confirm(p.battle);assert.deepEqual(pose(p.battle),pose(ref));
  }
});

test('all four Rivals clear Haymaker on foot and punish with their own move on either side', () => {
  for (const kind of Object.keys(kits)) for (const mirror of [false,true]) {
    const {battle:b,events} = fight('watch',{p2:kind});
    if (mirror) for (const f of b.dogs) { f.x = 1200-f.x; f.face *= -1; }
    let retreated = false;
    for (let i=0;i<37;i++) {
      tick(b);
      const f = b.dogs[1];
      if (b.bot.dashBack && f.run?.face === (mirror ? -1 : 1)) retreated = true;
      assert(!f.shield && !f.dodge && !f.floorAction && f.ground === 0);
    }
    assert(retreated,kind);
    const first = events.find(e => e.name === 'hit');
    assert([kits[kind].dashAttack,kits[kind].tilts.forward].includes(first.id));
    assert(first.frame < 39);
    assert.equal(b.dogs[1].damage,0);
    assert.equal(b.bot.missedSmash.id,'brisketHaymaker');
  }
});

test('the human can take the hit, retreat too far to answer, or punish with a running attack', () => {
  for (const answer of ['wait','leave','return']) {
    const {battle:b,events} = fight('bait');
    for (let i=0;i<38;i++) tick(b,answer === 'wait' ? idleInput : answer === 'leave' ? {x:-1} :
      {x:i<5 ? -1 : i<14 ? 0 : 1, tapped:{attack:i===21}});
    assert.equal(events.find(e => e.name === 'hit')?.id,
      {wait:'brisketHaymaker',leave:undefined,return:'pipGrassSkid'}[answer]);
    assert.deepEqual(b.dogs.map(f=>f.stocks),[3,3]);
  }
});

test('a spacing read gives three outcomes depending on when the player lets go', () => {
  for (const hold of [0,10,19,23,27,60]) {
    const {battle:b,events} = fight('delay');
    for (let i=0;i<56;i++) tick(b,{smash:i<hold});
    if (hold<19) assert.equal(events.find(e=>e.name==='hit').id,'pipGrassSkid');
    else if (hold<=27) assert.equal(events.find(e=>e.name==='hit').id,'brisketHaymaker');
    else assert(events.some(e=>e.name==='grabCatch'));
  }
});

test('standing Lead Loop can miss into a punish; the Rivals respect stage edges and immediate swings', () => {
  const {battle:b,events} = fight(undefined,{p1:'noodle'});
  const [p,f] = b.dogs;
  b.mode='local'; p.x=450; f.x=p.x+147+f.stats.width;
  for (let i=0;i<4;i++) tick(b,{grab:i===0});
  b.mode='solo';
  for (let i=0;i<40;i++) tick(b);
  assert.equal(events.find(e=>e.name==='hit').id,'pipGrassSkid');
  assert.equal(b.bot.missedSmash,undefined);
  for (const reason of ['corner','close','rushing','fresh']) {
    const {battle} = fight('watch'), [owner,rival] = battle.dogs;
    if (reason==='corner') {const shift=battle.terrain[0].x2-rival.x-3; owner.x+=shift; rival.x+=shift;}
    if (reason==='close') rival.x=owner.x+38;
    if (reason==='rushing') rival.run={face:-1,age:.4};
    if (reason==='fresh') owner.attack.time=0;
    assert.equal(battle.dashBackPunish(rival,owner),null,reason);
  }
});

test('Rival learns from a miss in an ordinary stock fight with both dogs starting at their arena spawns', () => {
  const {battle:b} = fight(undefined,{p2:'clover',form:'flat'});
  b.random=seededRandom(2);
  let hold=0, dodged=false, remembered=false;
  for (let i=0;i<2400 && !remembered && b.end===null;i++) {
    const [p,r]=b.dogs, dx=r.x-p.x, dir=Math.sign(dx)||1;
    let input=idleInput;
    if (p.ground>=0 && !p.attack && !p.stun && !p.grip && !p.stockLift) {
      if (!hold && !p.smashCharge && i%5===0 && Math.abs(dx)>50 && Math.abs(dx)<174) hold=6;
      if (hold) { input={smashX:dir,smash:true}; hold--; }
      else if (!p.smashCharge) input={x:p.x<250 ? 1 : p.x>950 ? -1 : Math.abs(dx)>156 ? dir : 0,jump:p.y>465};
    }
    tick(b,input);
    dodged ||= !!b.bot.dashBack;
    remembered ||= b.bot.missedSmash?.id==='brisketHaymaker';
  }
  assert(dodged && remembered);
});

test('a live read expires, clears on a new stock, and is never learned on lower levels', () => {
  for (const cpuLevel of ['rookie','arcade','rival']) {
    const {battle:b} = fight('watch',{cpuLevel});
    for (let i=0;i<30;i++) tick(b);
    if (cpuLevel!=='rival') {assert.equal(b.bot.missedSmash,undefined); continue;}
    const read = b.bot.missedSmash;
    assert.equal(read.id,'brisketHaymaker');
    b.time=read.expires+.01;
    assert.equal(b.baitRepeatSmash(b.dogs[1],b.dogs[0]),null);
    assert.equal(b.bot.missedSmash,undefined);
    b.bot.missedSmash = read; b.spawn(b.dogs[0],true);
    assert.equal(b.bot.missedSmash,undefined);
  }
});

test('an input replay retains the footwork and RNG of its recorded CPU, including legacy recordings', () => {
  for (const role of ['watch','delay']) for (const legacy of [false,true]) {
    if (legacy && role==='delay') continue;
    const {battle:b} = fight(role), tape = new FinishTape(true);
    if (legacy) delete b.bot.dashBackEnabled;
    const state = w => [w.random.state,w.bot.missedSmash?.id,w.grapple?.phase,w.dogs.map(f=>[f.x,f.y,f.vx,f.stocks,f.damage,f.attack?.moveId])];
    const states = [];
    for (let i=0;i<85;i++) {
      const input={...idleInput,smash:role==='delay' && i<23};
      states.push(state(b));tape.record(b,input,idleInput);tick(b,input);
    }
    for (const frame of [2,12,20,26,46,72]) {
      const replay=tape.playback(frame);
      assert.deepEqual(state(replay.battle),states[frame]);
      while (replay.step()) {}
      assert.deepEqual(state(replay.battle),state(b));
    }
    if (legacy) assert.equal(states.some(s=>s[1]),false);
  }
});
