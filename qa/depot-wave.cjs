const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
for (const name of ['engine', 'dispatch-script', 'dispatch-run', 'dispatch-suspend']) require('../docs/' + name + '.js');
const { DispatchRun, DispatchSuspend } = window;
const { idleInput } = window.DogFight;
const dt = 1 / 60;

function depot(distance = -165, armor = 85) {
  const events = [];
  const run = new DispatchRun({ room: 4 }, (name, event) => events.push({ name, move: event.move }));
  const boss = run.foes[0], hero = run.dogs[0];
  boss.hp = armor;
  hero.x = boss.f.x + distance;
  return { run, boss, hero, events };
}
function step(run, count, controls = () => idleInput) {
  for (let i = 0; i < count; i++) run.step(dt, controls());
}
test('half armor cues the bell for 54 ticks before sending the wave in both directions', () => {
  const full = depot(-100, 86);
  step(full.run, 1);
  assert.equal(full.boss.move, 'stamp');
  for (const side of [-1, 1]) {
    const { run, boss, hero, events } = depot(side * 165);
    step(run, 54);
    assert.match(run.objective, /Jump.*shield/);
    assert.equal(boss.wavefront, null);
    step(run, 1);
    assert.match(run.objective, /Floor wave/);
    assert.deepEqual(events.filter(e => e.move === 'bell').map(e => e.name), ['machineWindup', 'machineSwing']);
    step(run, 63);
    assert.equal(hero.damage, 10);
    assert.equal(events.filter(e => e.name === 'hit').length, 1);
    assert.match(run.objective, /Lamp open/);
    const hp = boss.hp;
    run.dealDamage(boss.f, 10);
    assert.equal(hp - boss.hp, 14);
  }
});
for (const defense of ['jump', 'shield', 'parry', 'shelf']) {
  test(defense + ' clears the bell crest and leaves three stocks', () => {
    const { run, hero, boss, events } = depot();
    if (defense === 'shelf') Object.assign(hero, { ground: 1, x: 300, y: run.terrain[1].y });
    step(run, 142, () => {
      const radius = boss.wavefront?.radius || 0;
      return { ...idleInput, jump: defense === 'jump' && radius > 65 && radius < 150,
        shield: defense === 'shield' || (defense === 'parry' && radius < 98) };
    });
    assert.equal(hero.damage, 0);
    assert.equal(hero.stocks, 3);
    const contacts = events.filter(e => ['hit', 'block', 'parry'].includes(e.name)).map(e => e.name);
    assert.deepEqual(contacts, defense === 'shield' ? ['block'] : defense === 'parry' ? ['parry'] : []);
    assert.match(run.objective, /Lamp open/);
  });
}
test('suspending an incoming or spent wave preserves its position and single contact', () => {
  for (const frames of [65, 85]) {
    const { run, hero, boss } = depot();
    step(run, frames);
    assert.equal(boss.wavefront.spent, frames === 85);
    const restored = new DispatchRun({ room: 4 });
    DispatchSuspend.restore(restored, structuredClone(DispatchSuspend.capture(run)));
    step(run, 45); step(restored, 45);
    assert.equal(hero.damage, 10);
    assert.deepEqual(DispatchSuspend.capture(restored).state, DispatchSuspend.capture(run).state);
  }
});
test('hoisting or defeating the boss clears a travelling wave', () => {
  for (const hoist of [true, false]) {
    const { run, boss } = depot();
    step(run, 60);
    assert(boss.wavefront);
    if (hoist) run.knockouts([boss.f]);
    else { boss.hp = 0; run.step(dt, idleInput); }
    assert.equal(boss.wavefront, null);
  }
});
