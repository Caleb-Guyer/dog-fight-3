const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
const {Battle, FinishTape, kits, idleInput, seededRandom} = window.DogFight;

function fight(opening, overrides = {}) {
  const events = [];
  const config = {mode:'solo', cpuLevel:'rival', stage:'nightmail', form:'trio',
    p1:'pip', p2:'brisket', fetch:false, throwOpening:opening, ...overrides};
  const battle = new Battle(config, (name, e) => events.push({name, side:e.direction, id:e.moveId}), seededRandom(31));
  return {battle, events};
}
function advance(battle, frames, stick = () => idleInput) {
  for (let i = 0; i < frames; i++) battle.step(1 / 60, {...idleInput, ...stick(i)}, idleInput);
}
function read(battle) {
  const [target, owner] = battle.dogs;
  return battle.finishingThrow(owner, target, {face:owner.face});
}
test('from the same opening Brisket takes the stock off the top or behind his back', () => {
  for (const [opening, damage, side, zone] of [['perch',110,'up','top'], ['edge',80,'back','left']]) {
    const {battle, events} = fight(opening);
    assert.equal(battle.dogs[0].damage, damage);
    assert.deepEqual(battle.dogs.map(f => f.stocks), [3,3]);
    assert.equal(battle.grapple, null);
    advance(battle, 155);
    assert.equal(events.find(e => e.name === 'throwRelease').side, side);
    assert.equal(battle.matchCard.losses[0].zone, zone);
    assert.equal(battle.matchCard.losses[0].lastHit.id, kits.brisket.throws[side]);
    assert.equal(battle.dogs[0].stocks, 2);
    assert.equal(battle.dogs[0].damage, 0);
  }
});
test('all four Rival dogs convert a KO read with their own move; inward facing can use back throw on either ledge', () => {
  for (const kind of Object.keys(kits)) {
    for (const [opening, side] of [['edge','back'], ['perch',{pip:'back',brisket:'up',noodle:'up',clover:'forward'}[kind]]]) {
      const {battle, events} = fight(opening, {p2:kind});
      battle.dogs[0].damage = 250;
      assert.equal(read(battle), side, kind+' '+opening);
      advance(battle, 150);
      assert.equal(events.find(e => e.name === 'throwRelease').id, kits[kind].throws[side]);
      assert.equal(battle.matchCard.losses[0].lastHit.id, kits[kind].throws[side]);
      assert.equal(events.some(e => e.name === 'pummelHit'), false);
    }
    const {battle} = fight('edge', {p2:kind});
    battle.dogs[0].damage = 250;
    const guard = battle.dogs[1];
    guard.face = -1;
    guard.x = battle.terrain[0].x2 - 30;
    assert.equal(read(battle), 'back');
  }
});
test('a repeated throw loses its finish and a hurt attacker gains one', () => {
  const {battle} = fight('perch');
  const [p,g] = battle.dogs;
  p.damage = 115;
  assert.equal(read(battle), 'up');
  g.moveHistory = Array.from({length:9}, () => ({moveId:g.kit.throws.up, shieldOnly:false}));
  assert.equal(read(battle), null);
  g.moveHistory = [];
  p.damage = 100;
  assert.equal(read(battle), null);
  g.damage = 150;
  assert.equal(read(battle), 'up');
});
test('a jab at GO interrupts the actual standing grab on both openings', () => {
  for (const opening of ['perch','edge']) {
    const {battle, events} = fight(opening);
    advance(battle, 22, i => ({attack:i === 0}));
    assert(battle.dogs[1].damage > 0);
    assert.equal(battle.dogs[0].damage, opening === 'edge' ? 80 : 110);
    assert.equal(battle.grapple, null);
    assert.equal(events.some(e => e.name === 'throwRelease'), false);
  }
});
test('steering during hit freeze and air-dodging lets Pip land with the stock', () => {
  const {battle, events} = fight('perch');
  const p = battle.dogs[0];
  let flight = 0, landed = false;
  for (let i = 0; i < 260 && !landed; i++) {
    const input = !flight ? idleInput : p.tumble?.pending ? {x:-1} :
      {x:Math.abs(320 - p.x) > 10 ? Math.sign(320 - p.x) : 0, shield:flight === 36};
    advance(battle, 1, () => input);
    if (flight || events.some(e => e.name === 'throwRelease')) flight++;
    landed = flight > 8 && p.ground === 0;
  }
  assert(landed);
  assert.equal(p.stocks, 3);
  assert.equal(p.damage, 125);
  assert.equal(events.find(e => e.name === 'throwRelease').side, 'up');
});
test('lower CPU levels and low damage keep their throw decisions; blocking geometry invalidates the read', () => {
  for (const cpuLevel of ['rookie','arcade','rival']) {
    const {battle} = fight('perch', {cpuLevel});
    if (cpuLevel === 'rival') battle.dogs[0].damage = 10;
    battle.finishingThrow = () => assert.fail('unexpected KO read');
    advance(battle, 110);
  }
  const {battle} = fight('perch');
  battle.dogs[0].damage = 125;
  assert.equal(read(battle), 'up');
  battle.layout = {walls:[], terrain:battle.terrain, ceilings:[{x1:0,x2:1200,y:100}]};
  assert.equal(read(battle), null);
});
test('replay rebuilds the same hold, release and stock without recording a special CPU input', () => {
  const {battle} = fight('perch');
  const tape = new FinishTape(), states = [];
  const state = b => [b.matchFrames,b.grapple?.phase,b.grapple?.throwId,
    ...b.dogs.map(f => [f.x,f.y,f.damage,f.stocks]), b.matchCard.losses.length];
  for (let i = 0; i < 150; i++) {
    states.push(state(battle));
    tape.record(battle, idleInput, idleInput);
    advance(battle, 1);
  }
  for (const frame of [0,10,36,64,80,105,121]) {
    const player = tape.playback(frame);
    assert.deepEqual(state(player.battle), states[frame]);
    while (player.step()) {}
    assert.deepEqual(state(player.battle), state(battle));
  }
});
