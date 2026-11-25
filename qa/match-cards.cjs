const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, StockSet, seededRandom, idleInput, kits, moves} = window.DogFight;
const cfg = {mode:'local',p1:'pip',p2:'brisket',stage:'picnic',fetch:false};
const create = options => new Battle({...cfg,...options}, undefined, seededRandom(17));
const dt = 1/60;
function place(w) {
  const [a,b] = w.dogs;
  Object.assign(a,{x:600,face:1});
  Object.assign(b,{x:659,face:-1});
}
function step(w, a, b) {
  w.step(dt, {...idleInput,...a}, {...idleInput,...b});
}
function until(w, predicate) {
  for (let i=0;i<100 && !predicate();i++) step(w);
  assert(predicate());
}
test('a pummel into a throw records the right move, damage and blast line for all four fighters', () => {
  for (const p1 of Object.keys(kits)) {
    const w = create({p1}), [,b] = w.dogs, [attacker, defender] = w.matchCard.players;
    place(w);
    step(w,{grab:true});
    until(w,()=>w.grapple?.phase === 'hold');
    assert.equal(attacker.hits,0);
    step(w,{attack:true});
    until(w,()=>w.grapple?.pummelCount === 1);
    assert.equal(defender.lastHit.id,kits[p1].pummel);
    step(w,{y:-1});
    until(w,()=>!!w.dogs[0].attack?.thrown);
    assert.equal(attacker.hits,2);
    assert.equal(attacker.damage,b.damage);
    const hit = {...defender.lastHit}, percent = b.damage;
    assert.equal(hit.id,kits[p1].throws.up);
    b.x = 4000;
    until(w,()=>w.matchCard.losses.length===1);
    assert.deepEqual(w.matchCard.losses[0],{slot:1,frame:w.matchFrames,damage:percent,remaining:2,
      zone:'right',suddenRound:0,lastHit:hit});
    assert.equal(defender.lastHit,null);
  }
});
test('parries, blocked hits, damage caps and sudden-death starting percentages stay distinct', () => {
  const w = create({suddenStart:true}), [a,b] = w.dogs, [p,q] = w.matchCard.players;
  const jab = moves.pipJab;
  const hit = () => w.hit(b,a,jab.dmg,jab.base,jab.growth,0,'light',1,{x:b.x,y:b.y},jab,'pipJab',{});
  assert.equal(p.damage,0);
  Object.assign(b,{parryEligible:true,shieldDrop:10/60});
  hit();
  assert.equal(q.parries,1);
  Object.assign(b,{shield:true,parryEligible:false,shieldDrop:0});
  hit();
  assert.equal(q.blocks,1);
  assert.equal(p.hits,0);
  Object.assign(b,{shield:false,damage:998});
  hit();
  assert.equal(p.hits,1);
  assert.equal(p.damage,1);
  w.knockouts(w.dogs);
  assert.deepEqual(w.matchCard.losses.map(l=>[l.suddenRound,l.damage,l.lastHit?.id]),[[1,300,undefined],[1,999,'pipJab']]);
  w.knockouts([a]);
  assert.equal(w.matchCard.losses[2].suddenRound,2);
  assert.equal(w.matchCard.losses[2].lastHit,null);
  assert.equal(w.matchCard.reason,'sudden');
  assert.equal(p.damage,1);
  const set = new StockSet(w.stage);
  assert(set.finish(w.end,null,w.matchCard));
  assert(set.advance('canal'));
  const next = create();
  next.dogs[1].stocks=2; next.clockFrames=1; step(next);
  assert(set.finish(next.end,null,next.matchCard));
  assert.equal(set.current.card.reason,'time');
  assert.deepEqual(set.current.card.losses,[]);
  assert.equal(set.games[0].card.losses.length,3);
  assert.equal(create({mode:'training'}).matchCard,null);
});
test('an eight-frame-late shield removes a predicted hit from the card on both rollback peers', () => {
  const ref=create();
  place(ref);
  const peers=[0,1].map(side=>{
    let world;
    const packets=[];
    const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
    session.side=side;
    session.send=msg=>{if(msg[0]==='input') packets[msg[2]]=msg[3];};
    session.beginRound(['start',1,'pip','brisket','picnic',17]);
    place(world); place(session.match.confirmedWorld);
    return {net:session.match,world,packets};
  });
  let sawPrediction=false;
  const history=[structuredClone(ref.matchCard)];
  for(let n=0;n<40;n++){
    const pair=[{...idleInput,attack:n===0},{...idleInput,shield:true}];
    ref.step(dt,...pair);
    history.push(structuredClone(ref.matchCard));
    for(const [side,p] of peers.entries()){
      if(n>=8) p.net.receive(n-8,peers[1-side].packets[n-8]);
      p.net.tick(()=>pair[side],p.world);
      sawPrediction ||= p.world.matchCard.players[0].hits>0;
      assert.deepEqual(p.net.confirmedWorld.matchCard,history[p.net.confirmed]);
    }
  }
  assert(sawPrediction);
  assert.equal(ref.matchCard.players[1].blocks,1);
  assert.equal(ref.matchCard.players[0].hits,0);
  for(const [side,p] of peers.entries()){
    const other=peers[1-side].packets;
    for(let i=p.net.received;i<other.length;i++) p.net.receive(i,other[i]);
    p.net.confirm(p.world);
    assert.deepEqual(p.world.matchCard,ref.matchCard);
  }
});
