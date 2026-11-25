const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');require('../docs/pack-relay.js');require('../docs/fight-records.js');
const {Battle,FinishTape,seededRandom,idleInput,kits,validRelayTeams}=window.DogFight;
const {openingTeams,pick}=window.PackRelay;
const teams=[['pip','clover','noodle'],['noodle','pip','brisket']];
const config={mode:'local',p1:'pip',p2:'noodle',stage:'picnic',form:'flat',minutes:7,fetch:false,relayTeams:teams,
  coatBook:[{pip:2,clover:1,noodle:3},{noodle:3,pip:2,brisket:1}]};
const create=(extra={})=>new Battle({...config,...extra},undefined,seededRandom(8));
const step=w=>w.step(1/60,idleInput,idleInput);
const fall=(w,i)=>{w.dogs[i].x=-2000;w.knockouts([w.dogs[i]]);};

test('team setup swaps picked teammates, recalls separate lineups and rejects incomplete saves',()=>{
  const storage={getItem:k=>k.endsWith('local')?JSON.stringify(teams):'[]'};
  const draft=openingTeams({...config,relayTeams:null},storage);
  pick(draft,0,2,'pip');assert.deepEqual(draft[0],['noodle','clover','pip']);
  pick(draft,0,1,'brisket');assert.deepEqual(draft[0],['noodle','brisket','pip']);
  assert.deepEqual(openingTeams(config,storage),teams);
  for(const invalid of [[],[['pip','pip','brisket'],teams[1]],[['fake','pip','clover'],teams[0]]]){
    assert(!validRelayTeams(invalid));assert.equal(create({relayTeams:invalid}).relayTeams,undefined);
  }
  assert(validRelayTeams(openingTeams({...config,relayTeams:null,mode:'solo'},storage)));
});
test('a new teammate uses its own kit, coat and fresh stock on the lift, and the rival keeps damage',()=>{
  const w=create({timeBattle:true});
  const a=w.dogs[0],b=w.dogs[1];
  assert.equal(w.matchCard.points,undefined);
  b.damage=77;a.damage=132;a.moveHistory.push('pipJab');a.usedUp=true;
  const rivalCoat=w.coatFor(1);
  for(const [i,kind] of ['clover','noodle'].entries()){
    fall(w,0);
    assert.deepEqual([a.kind,a.stocks,a.damage,a.usedUp,a.moveHistory.length],[kind,2-i,0,false,0]);
    assert.equal(a.kit.specials.up,kits[kind].specials.up);assert(a.stockLift);
    assert.equal(b.damage,77);assert.equal(w.coatFor(1),rivalCoat);
  }
  assert.notEqual(w.coatFor(0),w.coatFor(1));
  fall(w,0);assert.equal(w.end,1);
  assert.deepEqual(w.matchCard.losses.map(l=>l.kind),teams[0]);
  const data=new Map(),book=new window.FightRecords.Book({setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)});
  const row={time:Date.now(),round:0,mode:'local',side:0,stage:w.stage,form:w.form,winner:w.end,card:w.matchCard};
  assert.deepEqual(book.get(book.add(row)),row);
  row.card.losses[0].kind='bad';assert.equal(book.get(book.add(row)),null);
});
test('simultaneous ring-outs advance both packs, including a winning side that also fell',()=>{
  const w=create();w.knockouts(w.dogs);
  assert.deepEqual(w.dogs.map(d=>[d.kind,d.stocks]),[['clover',2],['pip',2]]);
  fall(w,0);w.knockouts(w.dogs);
  assert.equal(w.end,1);assert.equal(w.dogs[1].kind,'brisket');
  assert.deepEqual(w.matchCard.players.map(p=>p.kind),['noodle','brisket']);
});
test('each dog’s damage stays with its place in the lineup',()=>{
  const w=create(),target=w.dogs[1];
  for(let i=0;i<3;i++){
    w.dealDamage(target,i+4,false,w.dogs[0].kit.ground[0]);
    if(i<2)fall(w,0);
  }
  assert.deepEqual(w.matchCard.relayDamage,[[4,5,6],[0,0,0]]);
  assert.equal(w.matchCard.players[0].damage,15);
});
test('time compares remaining dogs and Sudden Death keeps the active pair after a tie',()=>{
  const w=create();fall(w,1);w.clockFrames=1;step(w);assert.equal(w.end,0);
  const tie=create();tie.knockouts(tie.dogs);tie.clockFrames=1;step(tie);
  assert(tie.suddenDeath);assert.deepEqual(tie.dogs.map(d=>[d.kind,d.damage,d.stocks]),[['clover',300,1],['pip',300,1]]);
  tie.knockouts(tie.dogs);assert.equal(tie.suddenDeath.round,2);
  fall(tie,1);assert.equal(tie.end,0);assert.equal(tie.dogs[0].kind,'clover');
});
test('a finish replay crosses a dog change from saved inputs and leaves the original match intact',()=>{
  const w=create(),tape=new FinishTape();w.dogs[0].x=-2000;
  for(let i=0;i<20;i++){tape.record(w,idleInput,idleInput);step(w);}
  const play=tape.playback(0);assert.equal(play.battle.dogs[0].kind,'pip');
  while(play.step()){}
  assert.equal(play.battle.dogs[0].kind,'clover');
  assert.deepEqual(play.battle.matchCard,w.matchCard);
  fall(play.battle,0);assert.equal(w.dogs[0].kind,'clover');
});
