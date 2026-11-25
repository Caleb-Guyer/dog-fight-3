const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');require('../docs/controls.js');require('../docs/couch-select.js');
const {Selection}=window.CouchSelect, {Seats}=window.FightControls;
const {fighters,arenas,coatFor,Battle,StockSet,idleInput}=window.DogFight;
const dogs=Object.keys(fighters),stages=Object.keys(arenas);
const cfg={stage:'picnic',mode:'local',p1:'pip',p2:'brisket',coatBook:[{},{}],fetch:false};
require('../docs/stage-strike.js');
const {Draft}=window.StageStrike;
test('each seat draws a full roster and consecutive draws never repeat across refills',()=>{
  for(const roll of [0,.45,.99999])for(const start of dogs){
    const pick=new Selection({...cfg,p1:start,p2:start},()=>roll);
    const seen=[start];
    for(let i=1;i<20;i++){
      pick.shuffle(0);seen.push(pick.dogs[0]);
      assert.notEqual(seen[i],seen[i-1]);
      assert.equal(pick.dogs[1],start);
      if(pick.dogs[0]===start)assert.notEqual(pick.colors[0],pick.colors[1]);
      if(i%4===3)assert.equal(new Set(seen.slice(-4)).size,4);
    }
    pick.lock(0);
    const keep=pick.dogs[0], coat=pick.colors[0];
    pick.shuffle(0);assert.equal(pick.dogs[0],keep);
    const other=[start];
    for(let i=0;i<3;i++){pick.shuffle(1);other.push(pick.dogs[1]);}
    assert.equal(new Set(other).size,4);assert.equal(pick.colors[0],coat);
    pick.lock(1);const pair=pick.dogs.slice();pick.shuffle(1);
    assert.deepEqual(pick.dogs,pair);
  }
});
test('random counterpicks respect the winner, the arena phase and saved coats',()=>{
  const pick=new Selection({...cfg,coatBook:[{},{noodle:3}]},()=>.6,1);
  pick.shuffle(0);assert.equal(pick.dogs[0],'pip');
  pick.shuffle(1);assert.equal(pick.dogs[1],'noodle');assert.equal(pick.colors[1],3);
  pick.lock(1);pick.shuffle(1);assert.equal(pick.dogs[1],'noodle');
  pick.lock(1);pick.lock(0);assert.equal(pick.winner,cfg.stage);
});
test('all opening strikes produce exactly one unstruck arena in the 1-2-1 turn order',()=>{
  function walk(first,used){
    const d=new Draft(first);
    for(const s of used){
      assert(!d.take(1-d.turn,s));assert(!d.take(d.turn,'missing'));
      assert(d.take(d.turn,s));assert(!d.take(d.turn,s));
    }
    if(used.length===4){
      assert.deepEqual(d.moves.map(m=>m.slot),[first,1-first,1-first,first]);
      assert.deepEqual(d.moves.map(m=>m.action),Array(4).fill('strike'));
      assert.equal(d.winner,stages.find(s=>!used.includes(s)));
      assert(!d.take(0,d.winner));assert(!d.take(1,d.winner));return;
    }
    assert.equal(d.winner,null);
    for(const s of d.remaining)walk(first,[...used,s]);
  }
  walk(0,[]);walk(1,[]);
});
test('either game winner bans twice, and either loser can counterpick any remaining stage',()=>{
  for(const picker of [0,1])for(const a of stages)for(const b of stages.filter(s=>s!==a)){
    for(const stage of stages.filter(s=>s!==a && s!==b)){
      const d=new Draft(1-picker,picker);
      assert(!d.take(picker,a));assert(d.take(1-picker,a));assert(!d.take(1-picker,a));assert(d.take(1-picker,b));
      assert(!d.take(picker,a));assert(!d.take(picker,b));assert(!d.take(1-picker,stage));
      assert(d.take(picker,stage));assert.equal(d.winner,stage);
      assert.deepEqual(d.moves.map(m=>m.action),['ban','ban','pick']);
    }
  }
});
test('CPU decisions respect the pool, fighter matchup, and standardized stage geometry',()=>{
  for(const p1 of dogs)for(const p2 of dogs)for(const form of ['original','flat','trio'])for(const picker of [null,0,1]){
    const d=new Draft(1,picker);let count=0;
    while(d.turn!==null && count++<5){
      if(d.turn===1)assert(d.cpu([p1,p2],form,'picnic'));
      else{assert(!d.cpu([p1,p2],form,'picnic'));assert(d.take(0,d.remaining[0]));}
    }
    assert(stages.includes(d.winner));assert(!d.cpu([p1,p2],form));
  }
  const choose=(dog,form)=>{
    const d=new Draft(0,1);d.take(0,'picnic');d.take(0,'canal');d.cpu(['pip',dog],form,'laundry');return d.winner;
  };
  assert.equal(choose('brisket','original'),'nightmail');assert.equal(choose('noodle','original'),'laundry');
  assert.equal(choose('brisket','flat'),choose('noodle','flat'));
});
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
