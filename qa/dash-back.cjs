const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
const {Battle, FinishTape, idleInput, kits, seededRandom} = window.DogFight;

function fight(role, overrides = {}) {
  const events = [];
  const battle = new Battle({stage:'picnic',mode:'solo',cpuLevel:'rival',fetch:false,
    p1:role === 'bait' ? 'pip' : 'brisket', p2:role === 'bait' ? 'brisket' : 'pip',
    dashBackOpening:role,...overrides}, (name,e) => events.push({name,id:e.moveId,frame:battle.matchFrames}), seededRandom(42));
  return {battle,events};
}
function tick(b,input = idleInput) { b.step(1/60,{...idleInput,...input},idleInput); }

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
