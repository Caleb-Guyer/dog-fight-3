const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');require('../docs/controls.js');require('../docs/couch-select.js');
const {Selection}=window.CouchSelect, {Seats}=window.FightControls;
const {fighters,arenas,coatFor,Battle,StockSet,idleInput}=window.DogFight;
const dogs=Object.keys(fighters),stages=Object.keys(arenas);
const cfg={stage:'picnic',mode:'local',p1:'pip',p2:'brisket',coatBook:[{},{}],fetch:false};
test('every matchup keeps distinct mirrored coats and a ready dog stays put',()=>{
  for(const p1 of dogs)for(const p2 of dogs)for(const c1 of [0,1,2,3])for(const c2 of [0,1,2,3]){
    const pick=new Selection({...cfg,p1,p2,coatBook:[{[p1]:c1},{[p2]:c2}]});
    assert.deepEqual(pick.colors,[c1,coatFor(1,p1,p2,[c1,c2])]);
    pick.lock(0);pick.choose(0,1);pick.coat(0,-1);
    for(let n=0;n<4;n++){
      pick.choose(1,-1);
      for(let c=0;c<4;c++){
        pick.coat(1,-1);
        if(pick.dogs[1]===p1)assert.notEqual(pick.colors[1],c1);
      }
    }
    assert.equal(pick.colors[0],c1);assert.equal(pick.dogs[0],p1);
  }
});
test('every arena pair resolves once and launches actual local rules',()=>{
  for(const tie of [0,1])for(const left of stages)for(const right of stages){
    let rolls=0;
    const pick=new Selection(cfg,()=>{rolls++;return tie ? .9 : .1;});
    pick.lock(1);assert.equal(pick.phase,'fighters');pick.lock(0);
    assert.equal(pick.phase,'stages');assert.equal(pick.winner,null);
    for(const [i,stage] of [left,right].entries()){
      while(pick.stages[i]!==stage)pick.choose(i,1);
      pick.lock(i);
    }
    const stage=pick.winner;assert.equal(stage,[left,right][tie]);
    pick.choose(0,1);assert.equal(pick.winner,stage);
    pick.back(1);assert.equal(pick.winner,null);pick.lock(1);assert.equal(pick.winner,stage);
    const b=new Battle({...cfg,p1:pick.dogs[0],p2:pick.dogs[1],coats:pick.colors,stage,form:'trio',minutes:3});
    const set=new StockSet(stage);
    assert.equal(set.current.stage,b.stage);assert.equal(b.form,'trio');
    b.step(1/60,idleInput,{...idleInput,x:1});
    assert.equal(b.matchFrames,1);assert.equal(b.clockFrames,3*3600-1);
    assert.deepEqual(b.dogs.map(d=>d.stocks),[3,3]);assert.equal(rolls,1);
    pick.back(1);pick.back(1);assert.equal(pick.phase,'fighters');
    assert.deepEqual(pick.locked,[true,false]);pick.lock(1);
    assert.deepEqual(pick.locked,[false,false]);
  }
});
test('controllers keep seats across hotplug, sparse indices, and a replacement',()=>{
  const a={index:0},b={index:3},c={index:1};
  const seats=new Seats([a,b]);
  seats.sync([b]);assert.equal(seats.get(0,[b]),undefined);assert.equal(seats.get(1,[b]),b);
  seats.sync([c,b]);assert.equal(seats.get(0,[c,b]),c);
  seats.sync([]);seats.sync([b]);assert.equal(seats.get(1,[b]),b);
  const single=new Seats([a]);assert.equal(single.get(1,[a]),a);
  single.sync([a,b]);assert.equal(single.get(0,[a,b]),b);assert.equal(single.get(1,[a,b]),a);
  single.sync([a,b,c]);assert.deepEqual(single.ids,[3,0]);
});

test('the previous loser owns both picks while the winner can ready or withdraw independently',()=>{
  for(const picker of [0,1])for(const p1 of dogs)for(const p2 of dogs)for(const target of dogs)for(const arena of stages){
    const holder=1-picker, pick=new Selection({...cfg,p1,p2,coats:[3,0]},()=>assert.fail('counterpicks never use a coin'),picker);
    const keep=pick.dogs[holder], color=pick.colors[holder];
    pick.choose(holder,1);pick.coat(holder,1);pick.back(holder);
    pick.lock(holder);pick.back(holder);pick.lock(holder);
    while(pick.dogs[picker]!==target)pick.choose(picker,1);
    pick.coat(picker,1);pick.lock(picker);
    assert.equal(pick.phase,'stages');assert.equal(pick.winner,null);
    pick.back(picker);assert.equal(pick.phase,'fighters');assert.equal(pick.locked[holder],true);
    pick.lock(picker);pick.back(holder);pick.choose(holder,1);
    while(pick.stages[picker]!==arena)pick.choose(picker,1);
    pick.lock(picker);pick.choose(picker,-1);assert.equal(pick.winner,null);
    pick.back(picker);pick.lock(picker);pick.lock(holder);
    assert.equal(pick.winner,arena);assert.equal(pick.dogs[holder],keep);assert.equal(pick.colors[holder],color);
    if(target===keep)assert.notEqual(pick.colors[picker],color);
    const battle=new Battle({...cfg,p1:pick.dogs[0],p2:pick.dogs[1],coats:pick.colors,stage:pick.winner,form:'flat'});
    assert.deepEqual(battle.matchCard.players.map(p=>p.kind),pick.dogs);
    assert.deepEqual(battle.matchCard.players.map(p=>p.coat),pick.colors);
  }
});
