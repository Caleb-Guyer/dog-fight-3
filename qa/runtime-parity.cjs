const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function peer(engine, side, fighters) {
  const context = vm.createContext({ window: {}, structuredClone, performance });
  for (const file of [engine, 'online.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../docs', file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  const { DogFight, DogOnline } = context.window;
  const tape = new DogFight.FinishTape(true);
  const packets = [];
  let world;
  const session = new DogOnline.OnlineSession({
    start(config, random) { world = new DogFight.Battle(config, undefined, random); }
  });
  session.side = side;
  session.send = ([type, round, frame, input]) => {
    if (type === 'input') packets[frame] = input;
  };
  session.beginRound(['start', 1, ...fighters, 'nightmail', 27]);
  for (const battle of [world, session.match.confirmedWorld]) battle.resetTraining();
  session.match.onConfirmedInput = (battle, a, b) => tape.record(battle, a, b);
  return { net: session.match, world, tape, packets, idle: DogFight.idleInput };
}

for (const fighters of [['brisket', 'pip'], ['clover', 'noodle']]) {
  test('source and browser builds agree after late inputs and record the same replay for ' + fighters.join(' vs '), () => {
    const peers = [peer('engine.js', 0, fighters), peer('runtime/engine.js', 1, fighters)];
    for (let frame = 0; frame < 300; frame++) {
      for (const [slot, p] of peers.entries()) {
        if (frame >= 7) assert(p.net.receive(frame - 7, peers[1 - slot].packets[frame - 7]));
        p.net.tick(() => ({
          ...p.idle,
          grab: slot === 0 && frame === 0,
          y: slot === 0 && frame > 10 && frame < 32 ? -1 : 0,
          attack: frame % 46 === slot,
          jump: frame === 150 + slot,
          x: frame > 160 && frame < 200 ? (slot ? -1 : 1) : 0
        }), p.world);
      }
    }
    for (const [slot, p] of peers.entries()) {
      for (let n = p.net.received; n < 300; n++) assert(p.net.receive(n, peers[1 - slot].packets[n]));
      p.net.confirm(p.world);
      assert.equal(p.net.confirmed, 300);
      assert.equal(p.net.pending.length, 0);
    }
    const snapshot = p => structuredClone(p.net.confirmedWorld.saveTrainingMoment());
    assert.deepEqual(snapshot(peers[0]), snapshot(peers[1]));
    assert.deepEqual(structuredClone(peers[0].tape.fullMatch()), structuredClone(peers[1].tape.fullMatch()));
  });
}
