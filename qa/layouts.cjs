const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
require('../docs/controls.js');
const {load,assign,occupant,allowed,keyName}=window.FightControls;
test('the two keyboards stay disjoint through rebinding, cross-player swaps and reloads',()=>{
  const l=load();assign(l,'keyboard',0,'attack','KeyQ');
  assert.equal(occupant(l,'keyboard',1,'KeyJ'),null);
  assert.deepEqual(occupant(l,'keyboard',0,'Comma'),{slot:1,action:'attack'});
  assign(l,'keyboard',0,'attack','Comma');
  assert.equal(l.keyboard[1].attack,'KeyQ');
  assert.deepEqual(load(JSON.parse(JSON.stringify(l))),l);
  assert.equal(new Set(l.keyboard.flatMap(Object.values)).size,32);
  for(const code of ['Escape','Tab','KeyF','KeyP','MetaLeft','<script>'])assert(!allowed(code));
  for(const code of ['ShiftLeft','ControlRight','KeyZ','Digit1','BracketRight','Numpad4'])assert(allowed(code));
  assert.equal(keyName('ControlRight'),'Right Ctrl');
});
test('pad swaps are per player; an invalid saved keyboard cannot disable a working controller layout',()=>{
  const l=load();
  assign(l,'pad',1,'jump',2);
  assert.deepEqual([l.pad[1].jump,l.pad[1].attack,l.pad[0].jump,l.pad[0].attack],[2,0,0,2]);
  l.keyboard[1].attack='KeyJ';
  const restored=load(l);
  assert.deepEqual(restored.keyboard,load().keyboard);
  assert.deepEqual(restored.pad,l.pad);
  l.pad[0].grab=-1;
  assert.deepEqual(load(l).pad,[load().pad[0],l.pad[1]]);
  assert.deepEqual(load({keyboard:'old format',pad:[{jump:-1}]}),load());
});
