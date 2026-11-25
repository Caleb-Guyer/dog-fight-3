const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
const {Battle, idleInput, seededRandom, arenas, fighters} = window.DogFight;
const tick = 1 / 60;
const state = ({emit, random, ...battle}) => ({battle, seed:random.state});

test('rehearsing every arena preserves the original and repeats the CPU, stage and stock clock', () => {
  const roster = Object.keys(fighters);
  const input = (frame, dir) => ({...idleInput, x:frame % 78 < 34 ? dir : 0,
    attack:frame % 17 === 5, jump:frame % 61 === 3, special:frame % 87 === 11});
  for (const [i, stage] of Object.keys(arenas).entries()) {
    const config = {stage, mode:'solo', p1:roster[i % 4], p2:roster[(i + 1) % 4], cpuLevel:'rival', fetch:true};
    const original = new Battle(config, undefined, seededRandom(19 + i));
    for (let f = 0; f < 273; f++) original.step(tick, input(f,1), idleInput);
    const mark = structuredClone(state(original));
    const attempt = new Battle(config, undefined, seededRandom(0));
    attempt.copyFightFrom(original);
    assert.deepEqual(state(attempt), mark);
    assert.notEqual(attempt.random, original.random);
    assert.notEqual(attempt.dogs[0], original.dogs[0]);
    for (let f = 0; f < 100; f++) attempt.step(tick, input(f,1), idleInput);
    const first = structuredClone(state(attempt));
    attempt.copyFightFrom(original);
    for (let f = 0; f < 100; f++) attempt.step(tick, input(f,1), idleInput);
    assert.deepEqual(state(attempt), first);
    attempt.copyFightFrom(original);
    for (let f = 0; f < 100; f++) attempt.step(tick, input(f,-1), idleInput);
    assert.notDeepEqual(state(attempt), first);
    assert.deepEqual(state(original), mark);
    for (let f = 0; f < 100; f++) original.step(tick, input(f,1), idleInput);
    assert.deepEqual(state(original), first);
  }
});
