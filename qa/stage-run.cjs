const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/stage-strike.js');
const {arenas,stageForms,fighters,idleInput,seededRandom}=window.DogFight;
const {StageRun}=window.StageStrike;

function runStage(stage,form,kind,slot=0){
  const card={stage,stageForm:form,p1:slot?'pip':kind,p2:slot?kind:'clover'};
  return new StageRun({mode:'solo',stage,form,p1:kind,p2:'pip',fetch:false,minutes:0,stageRun:{card,slot}},()=>{},seededRandom(42));
}
function moveToFlag(w){
  const f=w.dogs[0],[index,fraction]=w.route.marks[w.route.splits.length],p=w.terrain[index];
  const distance=p.x1+(p.x2-p.x1)*fraction-f.x;
  const input={...idleInput,x:Math.abs(distance)<12?0:Math.sign(distance)};
  if(f.ledge)input.x=f.ledge.left?1:-1;
  else if(fraction===1)input.x=f.ground>=0 || f.x<p.x2+6?1:-1;
  else if(f.y>p.y+9 && f.ground>=0 && Math.abs(distance)<145)input.jump=true;
  else if(f.ground<0 && f.y>p.y+4 && f.vy>=-50 && f.jumps>0 && !f.prev.jump)input.jump=true;
  else if(f.ground<0 && f.vy<0 && f.prev.jump)input.jump=true;
  else if(f.ground>=0 && w.terrain[f.ground].thin && f.y<p.y-10 && Math.abs(distance)<55 && !f.prev.y)input.y=1;
  return input;
}
function clear(w){
  for(let frame=0;frame<1800 && w.end===null;frame++){
    const n=w.route.splits.length,[index,fraction]=w.route.marks[n];
    w.step(1/60,moveToFlag(w));
    if(w.route.splits.length>n){
      const f=w.dogs[0];assert.equal(fraction===1?f.ledge?.index:f.ground,index);
      if(fraction===1)assert.equal(f.ledge.left,false);
      assert.equal(w.route.splits[n],w.matchFrames);
    }
  }
  assert.equal(w.end,0,JSON.stringify([w.stage,w.form,w.dogs[0].kind,w.route.splits,w.dogs[0].x,w.dogs[0].y]));
  assert.equal(w.route.splits.length,3);
  return w;
}
for(const kind of Object.keys(fighters))test(kind+' can reach every flag across five arenas and four forms using normal inputs',()=>{
  for(const stage of Object.keys(arenas))for(const form of Object.keys(stageForms)){
    const w=runStage(stage,form,kind);assert(w.dogs[1].absent);
    const terrain=structuredClone(w.terrain);
    for(let n=0;n<90;n++)w.step(1/60,idleInput);
    assert.equal(w.matchFrames,0);assert.deepEqual(w.terrain,terrain);
    clear(w);
    const time=w.matchFrames;w.step(1/60,idleInput);assert.equal(time,w.matchFrames);
  }
});
test('a fall ends the route, completed runs save only a personal best for that dog, arena and form',()=>{
  const records=new Map(),store={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
  const fall=runStage('nightmail','flat','pip');
  for(let n=0;n<1500 && fall.end===null;n++)fall.step(1/60,{...idleInput,x:1,y:1});
  assert.equal(fall.end,1);fall.save(store);assert.equal(records.size,0);
  for(const [stage,form,kind,slot] of [['nightmail','flat','pip',0],['nightmail','flat','brisket',1],['canal','flat','pip',0],['nightmail','original','pip',0]]){
    const key='dog-fight-3.stage-run.1.'+[stage,form,kind].join('.');
    records.set(key,'[7,3,2]');
    const fast=clear(runStage(stage,form,kind,slot));fast.save(store);
    assert.deepEqual(JSON.parse(records.get(key)),fast.route.splits);
    const slow=runStage(stage,form,kind,slot);slow.step(1/60,{...idleInput,shield:true});
    for(let n=0;n<90;n++)slow.step(1/60,idleInput);
    clear(slow).save(store);
    assert(slow.matchFrames>fast.matchFrames);assert.deepEqual(JSON.parse(records.get(key)),fast.route.splits);
  }
  assert.equal(records.size,4);
});
