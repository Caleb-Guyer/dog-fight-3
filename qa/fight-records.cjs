const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
require('../docs/fight-records.js');
const {Battle,idleInput,seededRandom}=window.DogFight;
const {Book,coaching,limit,prefix}=window.FightRecords;
function memory() {
  const values=new Map();
  return {get length(){return values.size;},key:i=>[...values.keys()][i],setItem:(k,v)=>values.set(k,v),
    getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k)};
}
function round() {
  return new Battle({mode:'local',p1:'pip',p2:'brisket',stage:'nightmail',coats:[1,2],lastStockStart:true},undefined,seededRandom(14));
}
function finish(time) {
  const w=round();
  for(let n=0;n<280 && w.end===null;n++)w.step(1/60,{...idleInput,x:-1});
  assert.equal(w.end,1);
  return {stage:w.stage,form:w.form,side:0,mode:'local',round:0,winner:w.end,time,card:w.matchCard};
}
test('simultaneous tabs keep twelve distinct recent completed games through reload',()=>{
  const storage=memory(),a=new Book(storage),b=new Book(storage);
  const record=finish(2000);
  for(let i=0;i<limit+4;i++)(i%2?a:b).add({...record,time:2000+i});
  const same=a.add({...record,time:3000}),other=b.add({...record,time:3000});
  assert.notEqual(same,other);
  const restored=new Book(storage).list();
  assert.equal(restored.length,limit);assert.equal(storage.length,limit);
  assert.deepEqual(restored.slice(0,2).map(r=>r.entry.time),[3000,3000]);
  assert.deepEqual(restored[0].entry.card,record.card);
  assert.deepEqual(restored.at(-1).entry.time,2006);
  const id=prefix+'9999999999999999-0123456789abcdef';
  storage.setItem(id,'bad');assert.deepEqual(a.list(),restored);
  storage.setItem(id,JSON.stringify({...record,round:'broken'}));assert.deepEqual(a.list(),restored);
});
test('private mode and quota exhaustion keep usable records for the current tab',()=>{
  for(const store of [null,{get length(){throw Error();},setItem(){throw Error();}}]){
    const book=new Book(store),entry=finish(123456);
    const id=book.add(entry);
    assert.deepEqual(book.list(),[{id,entry}]);assert(book.transient.has(id));
  }
});
test('practice is attributed to the right dog, using its own match counters',()=>{
  const w=round(), [a,b]=w.dogs,card=w.matchCard;
  assert.equal(coaching(card,0),null);
  w.beginFloorAction(a,'tech'); w.beginFloorAction(b,'techRoll',1); w.beginFloorAction(b,'downed'); w.beginFloorAction(b,'floorRise');
  assert.deepEqual(card.players.map(p=>[p.techs,p.knockdowns]),[[1,0],[1,1]]);
  assert.equal(coaching(card,1).id,'launch-escape'); assert.equal(coaching(card,0),null);
  w.breakShield(a);
  assert.equal(coaching(card,0).id,'shield-breakEscape'); assert.equal(card.players[0].shieldBreaks,1);
  assert.match(coaching(card,0).why,/Pip/);
  const entry=finish(1);
  assert.equal(coaching(entry.card,0).id,'ledge-training');
  assert.equal(coaching(entry.card,1),null);
  entry.card.losses[0].zone='right';entry.card.losses[0].lastHit={id:'brisketJab',frame:22};
  assert.equal(coaching(entry.card,0).id,'launch-survival');
  entry.card.losses=[];entry.card.players[0].hits=5;
  assert.equal(coaching(entry.card,1).id,'shield-strike');
  entry.card.players[1].blocks=2;assert.equal(coaching(entry.card,1).id,'shield-crossup');
  assert.equal(coaching(entry.card,0).id,'spacing-approach');
  entry.card.players[1].blocks=6;
  assert.equal(coaching(entry.card,0).id,'combo-confirm');
  assert.match(coaching(entry.card,0).why,/blocked 6 hits/);
  assert.equal(coaching(entry.card,1).id,'shield-crossup');
});
test('late tech input corrects both the predicted knockdown and the resulting advice',()=>{
  const cfg={mode:'local',stage:'picnic',p1:'pip',p2:'brisket',fetch:false};
  function falling(battle){
    const f=battle.dogs[1];
    Object.assign(f,{x:800,y:battle.terrain[0].y-20,ground:-1,vy:210,stun:.4});
    battle.startTumble(f,false);
  }
  const ref=new Battle(cfg,undefined,seededRandom(17));falling(ref);
  const peers=[0,1].map(side=>{
    let battle;
    const session=new window.DogOnline.OnlineSession({start(c,r){battle=new Battle(c,undefined,r);}});
    const packets=[];session.side=side;session.send=m=>{if(m[0]==='input')packets[m[2]]=m[3];};
    session.beginRound(['start',1,'pip','brisket','picnic',17]);
    falling(battle);falling(session.match.confirmedWorld);
    return {battle,net:session.match,packets};
  });
  let predicted=false;
  for(let n=0;n<32;n++){
    const pair=[idleInput,{...idleInput,shield:n===1}];ref.step(1/60,...pair);
    for(const [side,peer] of peers.entries()){
      if(n>=8)peer.net.receive(n-8,peers[1-side].packets[n-8]);
      peer.net.tick(()=>pair[side],peer.battle);
      predicted ||= !!peer.battle.matchCard.players[1].knockdowns;
    }
  }
  assert(predicted);
  const defender=ref.matchCard.players[1];assert.deepEqual([defender.techs,defender.knockdowns],[1,0]);
  for(const [side,peer] of peers.entries()){
    const other=peers[1-side].packets;
    for(let i=peer.net.received;i<other.length;i++)peer.net.receive(i,other[i]);
    peer.net.confirm(peer.battle);
    assert.deepEqual(peer.net.confirmedWorld.matchCard,ref.matchCard);
    assert.equal(coaching(peer.net.confirmedWorld.matchCard,1),null);
  }
});
