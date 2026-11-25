const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/winner-stays.js');
const {Lineup}=window.WinnerStays;
const fresh=()=>new Lineup({p1:'pip',p2:'clover',coats:[0,2],bestOfThree:false});
test('winners keep either seat and the waiting line advances in arrival order',()=>{
  const r=fresh();r.add();const [a,b,c,d]=r.players;
  assert(r.finish(1,1));assert.deepEqual(r.players,[c,b,d,a]);
  assert(!r.finish(1,1));assert.equal(b.wins,1);
  r.remember(['brisket','clover'],[3,1]);r.finish(2,1);
  assert.deepEqual(r.players,[d,b,a,c]);assert.equal(c.kind,'brisket');assert.equal(c.coat,3);
  r.finish(3,0);assert.deepEqual(r.players,[d,a,c,b]);
  assert.deepEqual([b.wins,b.best,b.streak,b.played],[2,2,0,3]);
  assert.deepEqual([d.wins,d.best,d.streak,d.played],[1,1,1,1]);
});
test('a full set costs one place in line, even after a split first two games',()=>{
  const r=fresh(),s=new window.DogFight.StockSet('picnic'),original=r.players.slice();
  for(const winner of [1,0,1]){
    if(s.score[winner]>=1)r.finish(1,winner);
    s.finish(winner);
    if(s.champion===null){assert.deepEqual(r.players,original);s.advance('laundry');}
  }
  assert.equal(s.champion,1);assert.equal(r.players[1],original[1]);assert.equal(r.bout,2);
  assert.equal(r.players[1].wins,1);
});
test('only waiting players can leave and the lineup stays between three and eight',()=>{
  const r=fresh();assert.equal(r.remove(2),false);
  while(r.add()){}assert.equal(r.players.length,8);assert.equal(r.remove(0),false);assert.equal(r.remove(1),false);
  assert.equal(r.remove(8),false);assert.equal(r.remove(3.7),false);assert(r.remove(7));
  assert(r.add());assert.equal(r.players.at(-1).name,'Player 9');
});
test('reload restores format, players, choices and scores without replaying a win',()=>{
  let data=null;const disk={getItem:()=>data,setItem:(key,value)=>{data=value;}};
  const r=fresh();r.sets=true;r.players[0].name='A < B';r.finish(1,0);
  assert(r.save(disk));const copy=Lineup.read(disk);assert.deepEqual(copy,r);assert(!copy.finish(1,0));
  assert.equal(copy.save(null),false);assert(copy.finish(2,1));
  data='{}';assert.equal(Lineup.read(disk),null);data='bad';assert.equal(Lineup.read(disk),null);
});
