const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/arcade.js');
const {DogFight,YardCup:cup}=window;
const ticket=run=>({id:run.id,round:run.wins.length,retries:run.retries,relayLead:run.relayLead});
const win=(entry,stock=2,time=1200)=>cup.finish(entry,ticket(entry.active),true,stock,time);

test('every Cup detour keeps its arena, rivals, ordered stock changes and captain coat for all three leads',()=>{
  for(const kind of Object.keys(cup.courses))for(const round of [1,2]){
    const initial=cup.relay(kind,round);
    const captain=cup.courses[kind].bouts[round][0];
    assert.equal(initial.relayTeams[1][0],captain);
    assert.equal(cup.relay(kind,round,captain),null);
    for(const lead of initial.relayTeams[0]){
      const config=cup.stockBout(kind,round,3,lead);
      const w=new DogFight.Battle(config,undefined,DogFight.seededRandom(7));
      assert(DogFight.validRelayTeams(w.relayTeams));
      assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
      assert.equal(w.cpuLevel,'rival');assert.equal(w.form,initial.form);assert.equal(w.stage,initial.stage);
      assert.equal(w.dogs[0].kind,lead);
      w.dogs[1].damage=42;
      for(let i=0;i<3;i++){
        assert.equal(w.dogs[0].kind,w.relayTeams[0][i]);
        if(w.dogs[0].kind===kind)assert.equal(w.coatFor(0),3);
        assert.equal(w.dogs[1].damage,42);
        w.knockouts([w.dogs[0]]);
      }
      assert.equal(w.end,1);
    }
  }
});
test('retry and reload preserve the lead, award each stamp on victory and rank four distinct routes',()=>{
  let entry=cup.read(null);
  for(const mask of [0,1,2,3,3]){
    const prior=entry.clears;
    for(let r=0;r<4;r++){
      const detour=mask & (r===1?1:r===2?2:0);
      const lead=detour?cup.relay('pip',r).relayTeams[0][2]:undefined;
      entry=cup.begin(entry,'run-'+prior,2,'pip',lead);
      if(lead){
        const stale=ticket(entry.active);
        assert.equal(cup.finish(entry,stale,false,0,90),entry);
        assert.equal(cup.begin(entry,'different',0,'pip','pip'),null);
        entry=cup.begin(cup.read(JSON.parse(JSON.stringify(entry))),'unused',0,'pip');
        assert.equal(entry.active.relayLead,lead);assert.equal(entry.active.coat,2);
        assert.equal(cup.finish(entry,stale,true,1,600),null);
      }
      entry=win(entry,2,prior===4?2300:1200);
      if(lead){assert.equal(entry.active.wins.at(-1).relayLead,lead);assert.equal(entry.active.relayLead,undefined);}
    }
    assert.equal(cup.routeMask(entry.last),mask);
    assert.equal(cup.bestFor(entry,entry.last).id,'run-'+Math.min(3,prior));
    entry=cup.read(JSON.parse(JSON.stringify(entry)));
    assert.equal(entry.best.id,'run-0');assert.equal(entry.clears,prior+1);
  }
  assert.deepEqual(Object.keys(entry.relayBests),['1','2','3']);
  assert.equal(cup.stamps(entry),3);
  assert.equal(cup.begin(cup.read(null),'early',1,'pip','noodle'),null);
  assert.equal(cup.read({relayBests:{1:entry.best,2:entry.best}}).relayBests,undefined);
});
