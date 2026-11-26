const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/couch-select.js');require('../docs/tournament.js');require('../docs/winner-stays.js');
const {Lineup:Bracket,key}=window.LocalTournament;
const setup={mode:'local',p1:'pip',p2:'brisket',coats:[2,3],lives:2,minutes:3,fetch:false,stageForm:'trio',handicap:[10,70]};
const {eventConfig,finishEvent}=window.CouchSelect;
function bracket(n,sets=false){
  const b=new Bracket({...setup,bestOfThree:sets});
  while(b.players.length<n)b.add();
  while(b.players.length>n)b.remove(b.players.length-1);
  return b;
}
function storage(){
  const data=new Map();
  return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
}
test('every outcome in fields of two through eight advances each actual winner and eliminates each loser once',()=>{
  for(let n=2;n<=8;n++)for(let path=0;path<2**(n-1);path++){
    const b=bracket(n);b.started=true;
    const tree=b.bracket(),byes=tree.stages[0].matches.filter(m=>m.pair.includes(null)).map(m=>m.winner).sort();
    assert.deepEqual(byes,Array.from({length:2**Math.ceil(Math.log2(n))-n},(_,i)=>i));
    const eliminated=new Set();
    for(let i=0;i<n-1;i++){
      const {next}=b.bracket(),side=(path>>i)&1,bout=b.bout;
      assert(next.pair.every(j=>Number.isInteger(j)&&!eliminated.has(j)));
      eliminated.add(next.pair[1-side]);assert(b.finish(bout,side));assert(!b.finish(bout,side));
    }
    const {champion,next}=b.bracket();
    assert.equal(next,null);assert.equal(eliminated.size,n-1);assert(!eliminated.has(champion));
    assert.equal(b.pair,undefined);assert.equal(b.finish(b.bout,0),false);
  }
});
test('a split best-of-three stays in its bracket slot through counterpicks and only seals at two wins',()=>{
  const b=bracket(3,true);b.started=true;const players=b.pair.slice();
  const set=new window.DogFight.StockSet('picnic');
  for(const [game,winner] of [1,0,0].entries()){
    if(game)set.advance('nightmail');
    const cfg=eventConfig(setup,b,null);
    assert.deepEqual(cfg.handicap,[10,70]);assert.equal(cfg.stageForm,'trio');assert.equal(cfg.bestOfThree,true);
    const w=new window.DogFight.Battle({...cfg,mode:'local',stage:'picnic',form:cfg.stageForm,stockCount:cfg.lives,spawnDamage:cfg.handicap});
    assert.deepEqual(w.dogs.map(d=>d.damage),[10,70]);assert.deepEqual(w.dogs.map(d=>d.stocks),[2,2]);
    while(w.end===null)w.knockouts([w.dogs[1-winner]]);
    const bout=b.bout;
    b.remember(['clover','noodle'],[2,1]);assert.equal(finishEvent(b,bout,set,w.end),game===2);
    set.finish(w.end,null,w.matchCard);
    if(game<2){assert.equal(b.bout,1);assert.deepEqual(b.pair,players);}
  }
  assert.deepEqual(b.results,[[2,1]]);assert.equal(b.roundName,'Final');
  assert.equal(b.pair[1],players[0]);assert.deepEqual([b.pair[1].kind,b.pair[1].coat],['clover',2]);
  const disk=storage();assert(b.save(disk));assert.deepEqual(Bracket.read(disk),b);
});
test('seeding, draft and finished saves, unavailable storage, and rotation progress are independent',()=>{
  const disk=storage(),b=bracket(8);
  assert(!b.add());assert(!b.remove(-1));assert(!b.finish(1,0));assert(!b.save(null));
  const original=b.players.map(p=>p.name);b.shuffle(()=>0);
  assert.notDeepEqual(b.players.map(p=>p.name),original);assert.deepEqual(new Set(b.players.map(p=>p.name)),new Set(original));
  const rotation=new window.WinnerStays.Lineup(setup);rotation.save(disk);b.save(disk);
  assert.deepEqual(Bracket.read(disk),b);assert.deepEqual(window.WinnerStays.Lineup.read(disk),rotation);
  b.sets=true;b.syncRules({...setup,lives:5});assert.equal(b.sets,true);assert.equal(b.rules.lives,5);
  b.sets=false;
  b.started=true;assert(!b.remove(0));assert(!b.add());
  b.syncRules({...setup,lives:1});assert.equal(b.rules.lives,5);
  while(b.pair)b.finish(b.bout,1);
  b.save(disk);assert.equal(Bracket.read(disk).bracket().champion,b.bracket().champion);
  for(const bad of [{results:[[2,1]]},{results:[[1,1]]},{started:false},{serial:-2},{players:[{},{}]}]){
    disk.setItem(key,JSON.stringify({...b,...bad}));assert.equal(Bracket.read(disk),null);
  }
});
