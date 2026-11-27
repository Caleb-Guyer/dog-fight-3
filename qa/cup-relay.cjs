const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/arcade.js');
const {DogFight,YardCup:cup}=window;
const win={stocks:2,frames:800};

test('a saved relay resumes at its round with the chosen Cup dog, coat and previous wins',()=>{
  for(const kind of Object.keys(cup.courses))for(const round of [1,2]){
    const wins=Array.from({length:round},()=>({...win}));
    const active={id:'old-run',wins,started:true,coat:2,retries:3,relayLead:'noodle'};
    let entry=cup.read({active});
    assert.deepEqual(entry.active,{id:'old-run',wins,started:false,coat:2,retries:3});
    entry=cup.begin(entry,'unused',0);
    assert.equal(entry.active.retries,3);
    const ticket={id:'old-run',round,retries:3};
    assert.equal(cup.finish(entry,{...ticket,relayLead:'noodle'},true,2,900),null);
    const world=new DogFight.Battle(cup.stockBout(kind,round,entry.active.coat),undefined,DogFight.seededRandom(7));
    assert.equal(world.dogs[0].kind,kind);
    assert.equal(world.coatFor(0),2);
    assert.deepEqual(world.dogs.map(dog=>dog.stocks),[3,3]);
    assert.equal(!!world.relayTeams,false);
    assert.equal(world.cpuLevel,cup.levels[round]);
    const advanced=cup.finish(entry,ticket,true,1,900);
    assert.deepEqual(advanced.active.wins,[...wins,{stocks:1,frames:900}]);
  }
});

test('one Cup best includes valid historical clears and persists when the next run finishes',()=>{
  const singles={id:'solo',started:false,retries:2,coat:0,wins:Array.from({length:4},()=>({...win}))};
  const legacy={...singles,id:'relay',retries:0,wins:[win,{...win,relayLead:'brisket'},win,win]};
  let entry=cup.read({best:singles,last:legacy,relayBests:{1:legacy,2:singles},clears:4});
  assert.equal(entry.best.id,'relay');
  assert.deepEqual(entry.relayBests,{1:legacy});
  assert.equal(entry.last.id,'relay');
  assert.equal(cup.read({best:{...singles,retries:0},relayBests:{1:legacy}}).best.id,'solo');
  for(let round=0;round<4;round++){
    entry=cup.begin(entry,'new',0);
    entry=cup.finish(entry,{id:'new',round,retries:0},true,3,500);
  }
  assert.equal(entry.best.id,'new');
  assert.equal(entry.clears,5);
  assert.deepEqual(cup.read(entry),entry);
});
