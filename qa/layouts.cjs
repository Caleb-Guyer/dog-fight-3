const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
require('../docs/controls.js');
const {load,assign,occupant,allowed,keyName}=window.FightControls;
require('../docs/player-profiles.js');
const profiles=window.PlayerProfiles;
test('controller legends use the reported mapping, model and vendor IDs',()=>{
  const {padLegend}=window.FightControls;
  const read=(id,mapping='standard',style='auto')=>padLegend({id,mapping},style);
  for(const id of ['DualSense Wireless Controller','Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)']){
    const names=read(id);assert.equal(names[2],'Square');assert.equal(names[8],'Create');
  }
  assert.equal(read('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)')[8],'Share');
  assert.deepEqual(read('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)').slice(0,4),['B','A','Y','X']);
  assert.equal(read('Xbox Wireless Controller')[9],'Menu');
  assert.equal(read('USB gamepad','')[0],'Button 1');
  assert.equal(read('USB gamepad','','positions')[2],'Left');
  assert.equal(read('DualSense Wireless Controller','standard','switch')[9],'+');
});
test('a saved player can take the other seat with an exact, reviewable shared-keyboard swap',()=>{
  const layout=load();assign(layout,'keyboard',0,'attack','KeyQ');assign(layout,'pad',0,'jump',2);
  const saved=profiles.capture(layout,0,[true,false,true],'  Pepper  ');
  assert.equal(saved.name,'Pepper');assert(profiles.valid(saved));
  const original=structuredClone(layout);
  const {next,changed}=profiles.preview(layout,1,saved);
  assert.deepEqual(layout,original);
  assert.deepEqual(next.keyboard[1],saved.keyboard);
  assert.deepEqual(next.pad[1],saved.pad);
  assert.deepEqual(next.pad[0],original.pad[0]);
  assert.deepEqual(changed, Object.keys(layout.keyboard[0]).map(action=>({action,from:layout.keyboard[0][action],to:next.keyboard[0][action]})));
  assert.deepEqual(next,load(next));
  assert.deepEqual(profiles.preview(next,1,saved).changed,[]);
  const padOnly=profiles.preview(layout,1,saved,false);
  assert.deepEqual(padOnly.next.keyboard,original.keyboard);
  assert.deepEqual(padOnly.next.pad,next.pad);assert.deepEqual(padOnly.changed,[]);
});
test('partially overlapping keyboards keep every unaffected key when moving a profile',()=>{
  const layout=load(),saved=profiles.capture(layout,1,[false,true,false],'Skipper');
  saved.keyboard.left='KeyA';saved.keyboard.attack='KeyQ';saved.keyboard.jump='ArrowRight';saved.keyboard.right='ShiftRight';
  const result=profiles.preview(layout,1,saved);
  assert.deepEqual(result.changed,[{action:'left',from:'KeyA',to:'ArrowLeft'}]);
  assert.deepEqual(result.next.keyboard[1],saved.keyboard);
  assert.deepEqual(load(result.next),result.next);
});
test('independent player files survive malformed records, replacement and removal',()=>{
  const data=new Map(),storage={get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const saved=profiles.capture(load(),1,[true,false,false],'Pickle');
  profiles.write(storage,saved.name,saved);profiles.write(storage,'Milo',{...saved,name:'Milo'});
  data.set('dog-fight-3.player.bad','{');
  for(const malformed of [{...saved,prefs:['yes',true,true]},{...saved,keyboard:{...saved.keyboard,left:saved.keyboard.right}},{...saved,pad:{...saved.pad,attack:-1}}])assert(!profiles.valid(malformed));
  assert.deepEqual(profiles.library(storage).map(p=>p.name),['Milo','Pickle']);
  profiles.write(storage,'pickle',{...saved,name:'pickle',prefs:[false,true,true]});
  assert.equal(profiles.library(storage).length,2);
  assert.deepEqual(profiles.library(storage).find(p=>p.name==='pickle').prefs,[false,true,true]);
  profiles.write(storage,'pickle',null);
  assert.deepEqual(profiles.library(storage).map(p=>p.name),['Milo']);
  assert.equal(profiles.write(null,saved.name,saved),false);
  assert.deepEqual(profiles.library(null),[saved]);
  profiles.write(null,saved.name,null);
  assert.deepEqual(profiles.library(null),[]);
});
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
