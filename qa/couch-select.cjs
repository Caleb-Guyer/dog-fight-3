const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');require('../docs/controls.js');require('../docs/couch-select.js');
const {Selection}=window.CouchSelect, {Seats}=window.FightControls;
const {fighters,arenas,coatFor,Battle,StockSet,idleInput}=window.DogFight;
const dogs=Object.keys(fighters),stages=Object.keys(arenas);
const cfg={stage:'picnic',mode:'local',p1:'pip',p2:'brisket',coatBook:[{},{}],fetch:false};
function testPad(index,id){
  return {index,id,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
}
test('partial travel claims a solo seat only on a mapped Shield button and still respects keyboard takeover',()=>{
  const seat=new window.FightControls.SoloSeat(), pad=testPad(2,'USB'), mapping={shield:6,shieldAlt:5};
  pad.buttons[7].value=.45;pad.buttons[6].value=.12;
  seat.track([pad],true,mapping);assert.equal(seat.index,null);
  pad.buttons[6].value=.45;seat.track([pad],true,mapping);assert.equal(seat.get([pad]),pad);
  seat.useOtherInput([pad]);seat.track([pad],true,mapping);assert.equal(seat.index,null);
  pad.buttons[6].value=0;seat.track([pad],true,mapping);
  pad.buttons[6].value=.45;seat.track([pad],true,mapping);assert.equal(seat.get([pad]),pad);
});
test('a solo dog belongs to the actively used controller and stays put when another pad goes away',()=>{
  const seat=new window.FightControls.SoloSeat(),spare=testPad(0,'Spare'),owner=testPad(5,'Owner');
  spare.axes[1]=.12;
  seat.track([spare,owner],true);
  seat.track([owner],true);assert.equal(seat.lost,false);assert.equal(seat.index,null);
  owner.axes[0]=-.7;
  seat.track([spare,owner],false);assert.equal(seat.index,null);
  seat.track([spare,owner],true);assert.equal(seat.get([spare,owner]),owner);
  spare.buttons[9].pressed=true;seat.track([spare],false);
  assert.equal(seat.lost,true);assert.equal(seat.get([spare]),undefined);
});
test('a new pad in the same slot waits for neutral and a fresh isolated confirm',()=>{
  const seat=new window.FightControls.SoloSeat(),owner=testPad(2,'Old'),replacement=testPad(2,'New');
  owner.buttons[2].pressed=true;seat.track([owner],true);
  seat.track([replacement],true);assert.equal(seat.lost,true);
  replacement.buttons[0].pressed=true;assert.equal(seat.confirm([replacement]),null);
  replacement.buttons[0].pressed=false;seat.confirm([replacement]);
  replacement.axes[0]=.8;replacement.buttons[0].pressed=true;assert.equal(seat.confirm([replacement]),null);
  replacement.axes[0]=0;assert.equal(seat.confirm([replacement]),null);
  replacement.buttons[0].pressed=false;seat.confirm([replacement]);
  replacement.buttons[0].pressed=true;replacement.buttons[2].pressed=true;
  assert.equal(seat.confirm([replacement]),null);replacement.buttons[2].pressed=false;
  assert.equal(seat.confirm([replacement]),null);
  replacement.buttons[0].pressed=false;seat.confirm([replacement]);seat.confirm([]);
  replacement.buttons[0].pressed=true;assert.equal(seat.confirm([replacement]),null);
  replacement.buttons[0].pressed=false;seat.confirm([replacement]);replacement.buttons[0].pressed=true;
  assert.equal(seat.confirm([replacement]),replacement);assert.equal(seat.lost,false);
});
test('keyboard or touch takeover ignores held controls until the pad returns to neutral',()=>{
  const seat=new window.FightControls.SoloSeat(),a=testPad(3),b=testPad(5,'Spare');
  a.buttons[2].pressed=true;seat.track([a,b],true);assert.equal(seat.index,3);
  b.axes[0]=1;seat.useOtherInput([a,b],true);seat.track([a,b],true);assert.equal(seat.index,null);
  seat.track([b],true);assert.equal(seat.lost,false);
  b.axes[0]=0;seat.track([b],true);b.axes[0]=.9;seat.track([b],true);
  assert.equal(seat.get([b]),b);
});
test('a deliberate new controller input after a keyboard tap restores the controller prompts',()=>{
  const seat=new window.FightControls.SoloSeat(),pad=testPad(2,'USB');
  pad.buttons[4].pressed=true;seat.track([pad],true);seat.useOtherInput([pad]);
  seat.track([pad],true);assert.equal(seat.index,null);
  pad.buttons[5].pressed=true;seat.track([pad],true);assert.equal(seat.get([pad]),pad);
});
test('pad loss retains both seats and a replacement rejoins its owner at a new index',()=>{
  const a={index:2}, b={index:5}, replacement={index:7};
  const seats=new Seats([a,b]);seats.beginMatch([a,b]);
  seats.track([b]);assert.equal(seats.lost,1);assert.equal(seats.get(1,[b]),b);
  seats.track([b,replacement]);assert.equal(seats.present,3);
  assert.deepEqual(seats.ids,[7,5]);assert.equal(seats.lost,1);
  seats.lost=0;seats.track([]);assert.equal(seats.lost,3);
  seats.track([b]);assert.equal(seats.present,2);assert.equal(seats.lost,3);
  seats.beginMatch([b]);assert.equal(seats.lost,0);assert.equal(seats.present,2);
});
test('local seats recognize swapped browser slots and returning models before assigning a spare',()=>{
  const {Seats}=window.FightControls;
  const p=(index,id)=>({index,id}),a=p(0,'Yellow'),b=p(1,'Blue');
  const seats=new Seats([a,b]);seats.beginMatch([a,b]);
  const swapped=[p(0,'Blue'),p(1,'Yellow')];
  seats.track(swapped);assert.equal(seats.lost,3);assert.deepEqual(seats.ids,[1,0]);
  assert.deepEqual([0,1].map(i=>seats.get(i,swapped).id),['Yellow','Blue']);
  seats.beginMatch(swapped);seats.track([]);seats.track([p(4,'Blue')]);
  assert.equal(seats.present,2);seats.track([p(2,'Spare'),p(4,'Blue'),p(8,'Yellow')]);
  assert.deepEqual(seats.ids,[8,4]);assert.equal(seats.lost,3);
  seats.beginMatch([p(8,'Yellow'),p(4,'Blue')]);seats.track([p(8,'Replacement'),p(4,'Blue')]);
  assert.equal(seats.lost,1);assert.equal(seats.get(0,[p(8,'Replacement')]).id,'Replacement');
});
test('identical controllers swap by physical input, and a keyboard seat stays free across the set',()=>{
  const {Seats}=window.FightControls,p=(index,id='USB pad')=>({index,id});
  const pads=[p(0),p(1)],live=new Seats(pads),draft=new Seats([]);draft.copyFrom(live);
  draft.assign(0,pads[1],pads);assert.deepEqual(draft.ids,[1,0]);assert.deepEqual(live.ids,[0,1]);
  live.copyFrom(draft);live.beginMatch(pads);
  live.assign(1,null,pads);live.sync(pads);assert.deepEqual(live.ids,[1,null]);
  live.beginMatch(pads);live.track([pads[0],p(3,'Spare')]);
  assert.equal(live.lost,1);assert.equal(live.present,0);assert.equal(live.get(1,pads),undefined);
  live.track([p(3,'Spare')]);assert.equal(live.present,0);
  const replacement=p(3,'Spare');
  live.assign(0,replacement,[replacement]);live.beginMatch([replacement,...pads]);
  assert.deepEqual(live.ids,[3,null]);assert.equal(live.get(1,pads),undefined);
});
test('a keyboard-only match accepts a first controller for P2 and reports a same-tick replacement',()=>{
  const seats=new Seats([]), a={index:1}, b={index:4};
  seats.beginMatch([]);seats.track([]);assert.equal(seats.lost,0);
  seats.track([a]);assert.equal(seats.present,2);assert.equal(seats.lost,0);
  seats.track([b]);assert.equal(seats.lost,2);assert.equal(seats.present,2);assert.equal(seats.get(1,[b]),b);
});
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
test('counterpick diagrams use the match floor, gaps and full platform travel on every arena form',()=>{
  const {layoutFor,compareLayouts}=window.StageStrike;
  for(const stage of stages)for(const form of Object.keys(window.DogFight.stageForms)){
    const layout=layoutFor(stage,form),battle=new Battle({...cfg,stage,form});
    const floors=battle.terrain.filter(surface=>!surface.thin);
    assert.equal(layout.gap,floors.length>1);
    assert.equal(layout.solidWidth,Math.max(...floors.map(p=>p.x2-p.x1)));
    assert.equal(layout.upper,battle.terrain.length-floors.length);
    for(let frame=0;frame<600;frame++){
      const terrain=window.DogFight.platforms(battle.geometryStage,frame/60);
      terrain.forEach((p,i)=>{
        const t=layout.tracks[i],x=(p.x1+p.x2)/2;
        assert(x>=t.left-.1 && x<=t.right+.1 && p.y>=t.top-.1 && p.y<=t.bottom+.1);
      });
    }
  }
  const last=layoutFor('nightmail','original'),split=layoutFor('laundry','original');
  assert.match(compareLayouts(last,split),/56% shorter with a gap/);
  assert.match(compareLayouts(split,last),/126% longer.*0 upper/);
  assert.equal(layoutFor('picnic','flat'),last);
  assert.equal(compareLayouts(layoutFor('canal','flat'),last),'Same fighting layout as last game.');
  assert.equal(layoutFor('picnic','counterweights').moving,2);
  assert.equal(layoutFor('nightmail','original').moving,0);
});
test('counterpick exits describe the losing seat across regulation stocks and allow older sets without cards',()=>{
  const {lossLine}=window.StageStrike;
  const card={losses:[{slot:0,zone:'bottom'},{slot:1,zone:'right'},
    {slot:0,zone:'bottom'},{slot:0,zone:'left'},{slot:0,zone:'top',suddenRound:1}]};
  assert.equal(lossLine(card,0),'P1 stock losses · below ×2 · left ×1');
  assert.equal(lossLine(card,1),'P2 stock losses · right ×1');
  assert.equal(lossLine(undefined,0),'');
  assert.equal(lossLine({losses:[]},1),'');
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
