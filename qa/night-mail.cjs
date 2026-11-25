const test=require('node:test'), assert=require('node:assert/strict');
global.window={};
for(const file of ['engine','dispatch-script','dispatch-run']) require('../docs/'+file+'.js');
const [yard,night]=window.DispatchScript.chapters;
const step=run=>run.step(1/60,window.DogFight.idleInput);
function until(run, ready){
  for(let i=0;i<130 && !ready();i++)step(run);
  assert(ready());
}
test('legacy completion unlocks Clover without merging stamps or checkpoints across chapters',()=>{
  const saves=new Map([[yard.saveKey,JSON.stringify({version:1,started:true,room:2,complete:true,stamps:7})]]);
  const storage={getItem:k=>saves.get(k)};
  assert.equal(yard.readSave(storage).complete,true);
  assert.equal(night.readSave(storage).started,false);
  const fresh=night.readSave(storage);
  const progress=night.record(fresh,{room:0,checkpoint:1,atCheckpoint:{stocks:2,damage:37.5}});
  saves.set(night.saveKey,JSON.stringify(progress));
  assert.deepEqual(night.readSave(storage),progress);
  assert.equal(yard.readSave(storage).room,4);
  assert.equal(yard.readSave(storage).stamps,25);
});
test('five crew stocks across two waves, checkpoint restore, and one roof postmark',()=>{
  const run=new window.DispatchRun({chapter:2});
  assert.equal(run.dogs[0].kind,'clover');assert.equal(run.dogs[0].stocks,3);
  assert.equal(run.foes.length,2);
  run.dogs[0].damage=43.5;
  run.knockouts(run.foes.map(e=>e.f));
  until(run,()=>run.wave===1);
  assert.equal(run.checkpoint,1);assert.equal(run.rivalStocks,3);
  const saved=new window.DispatchRun({chapter:2,checkpoint:1,atCheckpoint:run.atCheckpoint});
  assert.equal(saved.dogs[0].damage,43.5);assert.equal(saved.wave,1);
  saved.knockouts(saved.foes.map(e=>e.f));assert.equal(saved.rivalStocks,1);
  saved.knockouts([saved.foes[0].f]);until(saved,()=>saved.finished==='exit');
  assert.equal(saved.stamps,1);
});
test('East Signal Box uses Noodle’s real kit, rival CPU, invulnerable stock returns and three ring-outs',()=>{
  const run=new window.DispatchRun({chapter:2,room:1});
  const foe=run.dogs[1];
  assert.equal(foe.kind,'noodle');assert.equal(foe.stats.name,'Noodle');assert(run.cpuControlled(foe));
  assert.equal(foe.stocks,3);assert.equal(run.foes[0].hp,null);
  const start=foe.x;
  for(let i=0;i<45;i++)step(run);
  assert.notEqual(foe.x,start);
  for(let i=2;i>=0;i--){run.knockouts([foe]);assert.equal(foe.stocks,i);if(i)assert(foe.stockLift);}
  until(run,()=>run.finished==='exit');
  assert.equal(run.stamps,2);
  assert.equal(new window.DispatchRun({room:yard.lastRoom,cupFighter:'noodle'}).layout.id,'depot');
});
