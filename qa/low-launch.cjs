const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, kits, moves, idleInput, seededRandom} = window.DogFight;
const config = {mode:'local', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false};
const dt = 1 / 60;
const buttons = values => ({...idleInput, ...values});

function practiceStrike(w, edge, damage, charge = 1) {
  w.resetDrivePractice(edge, damage);
  for (let frame = 0; frame < 150; frame++) w.step(dt, buttons({smash:frame < charge}), idleInput);
  return w.freshnessPractice.last;
}

test('all four side smashes have lower grounded trajectories at low percent, and fully charging raises them', () => {
  for (const p1 of Object.keys(kits)) {
    const w = new Battle({...config, mode:'training', p1});
    const low = practiceStrike(w, false, 0);
    const middle = practiceStrike(w, false, 30);
    const high = practiceStrike(w, false, 60);
    const charged = practiceStrike(w, false, 0, 61);
    assert.equal(low.moveId, kits[p1].smashes.side);
    assert(low.angle <= 4 && middle.angle > low.angle && high.angle >= 30);
    assert(high.launch > middle.launch && middle.launch > low.launch);
    assert(charged.angle > low.angle && charged.damage > low.damage);
  }
});

test('each back air sends an airborne or sweet-spotted rival at its own angle, in either direction', () => {
  for (const p1 of Object.keys(kits)) for (const face of [-1, 1]) {
    const id = kits[p1].air.back, move = moves[id];
    function connect(airborne, sweet) {
      const w = new Battle({...config, p1});
      const [a,b] = w.dogs;
      if (airborne) { b.ground = -1; b.y -= 12; }
      w.hit(b,a,move.dmg,move.base,move.growth,0,'light',face,{x:b.x,y:b.y},move,id,{},true,0,sweet);
      assert.equal(Math.sign(b.vx), face);
      return b;
    }
    const flat = connect(false), air = connect(true);
    assert(Math.abs(flat.vy) < Math.abs(air.vy));
    const expectedY = (target, angle) => -Math.abs(target.vx) * Math.tan(angle * Math.PI / 180) - 40;
    assert(Math.abs(air.vy - expectedY(air, move.angle)) < 1e-7);
    if (move.sweetSpot?.angle != null) {
      const sweet = connect(false, move.sweetSpot);
      assert(Math.abs(sweet.vy - expectedY(sweet, move.sweetSpot.angle)) < 1e-7);
    }
  }
});

test('center and ledge readouts compare fresh attempts and transfer the chosen starting marks into ordinary stocks', () => {
  const w = new Battle({...config, mode:'training'});
  w.setDummyDamage(25);
  const center = practiceStrike(w, false, 0);
  assert.match(center.outcome, /^Ground slide · 37 px$/);
  const edge = practiceStrike(w, true, 0);
  assert.equal(edge.outcome, 'Slid off the edge');
  assert.equal(w.freshnessPractice.previous.last, center);
  w.setDummyDamage(60);
  assert.equal(w.freshnessPractice.previous.last, edge);
  const match = new Battle({...config, mode:'solo', cpuLevel:'rival', driveOpening:{edge:true,damage:60}});
  const opening = f => [f.kind, f.x, f.y, f.ground, f.face, f.damage];
  assert.deepEqual(match.dogs.map(opening), w.dogs.map(opening));
  assert.deepEqual(match.dogs.map(f => f.stocks), [3,3]);
  assert.equal(match.clockFrames, 7*3600);
  assert.equal(match.cpuLevel, 'rival');
  match.dogs[1].x = 4000;
  match.step(dt, idleInput);
  assert.equal(match.dogs[1].stocks, 2);
  assert.equal(match.dogs[1].damage, 0);
  assert(match.dogs[1].stockLift);
  w.resetTraining();
  assert.equal(w.trainingDamage, 25);
  assert.equal(w.dogs[1].damage, 25);
});

test('staling can turn lift into a slide while crouching and shielding keep their own reactions', () => {
  function swing(damage, stale, defense) {
    let contact;
    const w = new Battle(config, (name,e) => {
      if (name === 'hit' || name === 'block') contact = {name, reaction:e.f.reaction, damage:e.f.damage, vy:e.f.vy};
    });
    w.placeDriveFighters(false,damage);
    if (stale) w.dogs[0].moveHistory = Array.from({length:9}, () => ({moveId:'pipBoltKick',power:1,shieldOnly:false}));
    for (let n=0;n<50;n++) w.step(dt,buttons({smash:n===10}),buttons(defense));
    return contact;
  }
  const fresh = swing(12,false,{}), stale = swing(12,true,{});
  assert(fresh.vy < 0 && stale.reaction.groundSlide && stale.damage < fresh.damage);
  const crouch = swing(0,false,{y:1});
  assert(crouch.reaction.planted && !crouch.reaction.groundSlide);
  const block = swing(0,false,{shield:true});
  assert.equal(block.name,'block'); assert.equal(block.damage,0);
});

test('a flat hit sliding off either lip leaves one air jump without a coyote jump', () => {
  for (const face of [-1, 1]) {
    const w = new Battle(config);
    const [a,b] = w.dogs, floor = w.terrain[0];
    b.x = face > 0 ? floor.x2-4 : floor.x1+4;
    a.x = b.x - face*64; a.face = face; b.face = -face;
    let left = false, recovered = false;
    for (let n = 0; n < 55; n++) {
      const jump = left && b.jumps === 1 && b.stun <= 0 && !w.hitStop;
      w.step(dt, buttons({smash:n === 0}), buttons({jump}));
      if (!left && b.ground < 0) { assert.equal(b.coyote, 0); assert.equal(b.jumps, 1); left = true; }
      if (jump && b.vy < 0 && b.jumps !== 1) { recovered = true; break; }
    }
    assert(left && recovered);
  }
});

test('delayed jump corrects a predicted grounded slide to an aerial launch on both peers', () => {
  const stamp = w => [w.hitStop, ...w.dogs.map(f => [f.x,f.y,f.vx,f.vy,f.damage,f.ground,f.jumps,f.stun,
    f.reaction?.groundSlide,f.attack?.moveId,f.moveHistory.map(h=>h.moveId)])];
  for (const slot of [0,1]) {
    const cfg = {...config,p1:slot?'brisket':'pip',p2:slot?'pip':'brisket'};
    const ref = new Battle(cfg, undefined, seededRandom(17));
    function place(w) {
      const a = w.dogs[slot], b = w.dogs[1-slot];
      a.face = slot ? -1 : 1; b.face = -a.face; a.x = 600; b.x = a.x + 64*a.face;
    }
    place(ref);
    const peers = [0,1].map(side => {
      let world;
      const packets = [];
      const session = new window.DogOnline.OnlineSession({start(c,r){ world = new Battle(c,undefined,r); }});
      session.side = side;
      session.send = p => { if (p[0] === 'input') packets[p[2]] = p[3]; };
      session.beginRound(['start',1,cfg.p1,cfg.p2,cfg.stage,17]);
      place(world); place(session.match.confirmedWorld);
      return {world, net:session.match, packets};
    });
    const history = [stamp(ref)];
    let predictedSlide = false;
    for (let n = 0; n < 65; n++) {
      const pair = [];
      pair[slot] = buttons({smash:n===0}); pair[1-slot] = buttons({jump:n===3});
      ref.step(dt,...pair); history.push(stamp(ref));
      for (const [side,p] of peers.entries()) {
        if (n >= 8) p.net.receive(n-8,peers[1-side].packets[n-8]);
        p.net.tick(()=>pair[side],p.world);
        predictedSlide ||= p.world.dogs[1-slot].reaction?.groundSlide && ref.dogs[1-slot].vy < 0;
        assert.deepEqual(stamp(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(predictedSlide);
    for (const [side,p] of peers.entries()) {
      const remote = peers[1-side].packets;
      for (let n=p.net.received;n<remote.length;n++) p.net.receive(n,remote[n]);
      p.net.confirm(p.world);
      assert.deepEqual(stamp(p.world),stamp(ref));
    }
  }
});
