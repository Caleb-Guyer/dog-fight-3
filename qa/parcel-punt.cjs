const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/parcel-punt.js');
const { Run, save, best, meters } = window.ParcelPunt;
const { idleInput, fighters } = window.DogFight;
function tick(run, input) {
  run.step(1 / 60, { ...idleInput, ...input });
}
function punt(kind, { charge = 65, start = 0, jabs = [], position, face = 1 } = {}) {
  const hits = [];
  const run = new Run({ p1: kind }, (event, data) => {
    if (event === 'hit') hits.push(data.moveId);
  });
  if (position !== undefined) Object.assign(run.dogs[0], { x: position, face });
  for (let frame = 0; frame < 1000 && run.end === null; frame++) {
    tick(run, { attack: jabs.includes(frame), smash: frame >= start && frame < start + charge, smashX: face });
  }
  return { run, hits };
}
for (const kind of Object.keys(fighters)) {
  test(kind + ' cuts the tether with its own side smash and gains range with charge', () => {
    const runs = [1, 32, 65].map(charge => punt(kind, { charge }).run);
    assert(runs[0].distance < runs[1].distance && runs[1].distance < runs[2].distance);
    for (const run of runs) {
      assert.equal(run.endReason, 'distance');
      assert.equal(run.flight.move, run.dogs[0].kit.smashes.side);
      assert.equal(run.dogs[1].y, 456);
      assert.equal(run.distance, Math.round(Math.abs(run.flight.vx * run.flight.t)));
      assert(Math.abs(run.flight.y + run.flight.vy * run.flight.t + 322.5 * run.flight.t ** 2 - 456) < .000001);
      assert.equal(run.clock(), meters(run.distance));
    }
    assert.equal(punt(kind).run.distance, runs[2].distance);
  });
}
test('two jabs increase Pip’s range at the same charge and leftward launches score equally', () => {
  const first = punt('pip');
  const combo = punt('pip', { start: 140, jabs: [0, 39] });
  assert.deepEqual(combo.hits, ['pipJab', 'pipJab', 'pipBoltKick']);
  assert(combo.run.distance > first.run.distance);
  const reversed = punt('pip', { position: 666, face: -1 }).run;
  assert(reversed.flight.vx < 0);
  assert.equal(reversed.distance, first.run.distance);
});
test('Noodle’s tip rewards spacing and Clover can hit the bag with a traveling shot', () => {
  assert(punt('noodle', { position: 445 }).run.distance > punt('noodle').run.distance);
  const clover = punt('clover', { position: 390 });
  assert.deepEqual(clover.hits, ['cloverLineDrive']);
  assert.equal(clover.run.endReason, 'distance');
  assert(clover.run.matchFrames > punt('clover').run.matchFrames);
});
test('a side smash that connects on the last frame scores, one frame later expires', () => {
  const contact = punt('pip', { charge: 1 }).run.matchFrames;
  const last = punt('pip', { charge: 1, start: 600 - contact }).run;
  assert.equal(last.endReason, 'distance');
  assert.equal(last.matchFrames, 600);
  assert(last.flight.t > 0);
  const late = punt('pip', { charge: 1, start: 601 - contact }).run;
  assert.equal(late.endReason, 'expired');
  assert.equal(late.flight, undefined);
});
test('idle attempts expire at ten seconds and a fall ends the attempt early', () => {
  const run = new Run({ p1: 'pip' });
  for (let i = 0; i < 599; i++) tick(run);
  assert.equal(run.end, null);
  tick(run); tick(run);
  assert.equal(run.matchFrames, 600);
  assert.equal(run.endReason, 'expired');
  const fall = new Run({ p1: 'pip' });
  for (let i = 0; i < 600 && fall.end === null; i++) tick(fall, { x: -1 });
  assert.equal(fall.endReason, 'fall');
  assert(fall.matchFrames < 600);
});
test('record updates preserve ties and higher scores independently for each dog', async () => {
  const data = new Map();
  global.localStorage = {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)};
  const a = punt('pip').run, tie = punt('pip').run, weaker = punt('pip', {charge: 1}).run;
  await save(a); await save(tie); await save(weaker);
  assert.equal(tie.previous, tie.distance);
  assert.equal(best('pip'), a.distance);
  assert.equal(best('clover'), 0);
  const c = punt('clover').run;
  global.localStorage.setItem = () => { throw Error('storage unavailable'); };
  await save(c);
  assert.equal(c.tabOnly, true);
  assert.equal(best('clover'), c.distance);
  assert.equal(best('pip'), a.distance);
  await save(new Run({ p1: 'brisket' }));
  assert.equal(best('brisket'), 0);
  delete global.localStorage;
});
