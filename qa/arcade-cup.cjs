const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
for (const file of ['engine','arcade','dispatch-script','dispatch-run'])
  require('../docs/'+file+'.js');
const {DogFight,DispatchRun,DispatchScript,YardCup:cup} = window;
const ticket = ({active}) => ({id:active.id,retries:active.retries,round:active.wins.length});

function rookieFinisher(kind, respond, legacy=false) {
  const {Battle,FinishTape,idleInput,seededRandom}=DogFight, tape=new FinishTape();
  const events=[], states=[];
  let tick=0, cue=-1;
  const w=new Battle({mode:'solo',cpuLevel:'rookie',p1:kind==='pip'?'brisket':'pip',p2:kind,
    stage:'nightmail',form:'flat',stockCount:3,spawnDamage:[90,0],fetch:false},(name,e)=>{
    if(name==='smashCharge' && e.f.index===1 && cue<0)cue=tick;
    if(['smashCharge','smashRelease','hit','block'].includes(name))
      events.push({name,tick,slot:e.owner?.index ?? e.f.index,id:e.moveId || e.f.attack?.moveId,power:e.f.attack?.power});
  },seededRandom(42));
  if(legacy)delete w.bot.rookieWindup;
  const sample=b=>[b.random.state,b.bot.rookieNext,b.dogs.map(f=>[f.x,f.y,f.face,f.charge,f.damage,f.attack?.moveId,f.attack?.time])];
  for(;tick<220;tick++){
    const input=cue<0?idleInput:{...idleInput,...respond(tick-cue,w)};
    states.push(sample(w));tape.record(w,input,idleInput);w.step(1/60,input);
  }
  states.push(sample(w));
  return {events,cue,tape,states,sample};
}
test('every Rookie commits to a charged finisher that can hit, be blocked, or be interrupted',()=>{
  for(const kind of Object.keys(DogFight.kits)){
    const id=DogFight.kits[kind].smashes.side;
    for(const answer of ['wait','guard','interrupt','jump']){
      const {events,cue}=rookieFinisher(kind,(age,w)=>{
        if(answer==='guard')return {shield:age>9 && age<35};
        if(answer==='interrupt')return {x:age<8?1:0,attack:age===9,quickAttack:true};
        if(answer==='jump'){
          const swing=kind==='pip'?24:33,dir=Math.sign(w.dogs[1].x-w.dogs[0].x);
          return {jump:age<=4,x:age>14 && age<swing?dir*.5:0,aimStick:age===swing,smashY:age===swing?1:0};
        }
        return {};
      });
      const contact=events.find(e=>e.name==='hit' || e.name==='block'),release=events.find(e=>e.name==='smashRelease');
      assert(cue>=0 && contact,kind+' '+answer);
      if(answer==='interrupt'){
        assert.equal(contact.slot,0);assert(contact.tick<cue+18);assert(!release || release.tick>contact.tick);
        continue;
      }
      assert.equal(release.id,id);assert.equal(release.tick-cue,19);assert(release.power>0);
      if(answer==='jump'){
        assert.equal(contact.slot,0);assert(contact.tick>release.tick);
        assert.equal(contact.id,DogFight.kits[kind==='pip'?'brisket':'pip'].air.down);
      }else{
        assert.equal(contact.slot,1);assert.equal(contact.id,id);assert.equal(contact.name,answer==='guard'?'block':'hit');
      }
    }
  }
});
test('the windup survives a stock reset and saved Rookie fights replay their original smash timing',()=>{
  for(const legacy of [false,true]){
    const {events,cue,tape,states,sample}=rookieFinisher('brisket',()=>({}),legacy);
    assert.equal(cue<0,legacy);
    const release=events.find(e=>e.name==='smashRelease');
    assert.equal(release.power>0,!legacy);
    for(const offset of [0,120,release.tick-3,release.tick+6]){
      const replay=tape.playback(offset);
      assert.deepEqual(sample(replay.battle),states[offset]);
      while(replay.step()){}
      assert.deepEqual(sample(replay.battle),states.at(-1));
      replay.battle.resetCpu();assert.equal(!!replay.battle.bot.rookieWindup,!legacy);
    }
  }
});

test('every route has all three rivals in three-stock fights on playable arena forms',()=>{
  for (const [p1,course] of Object.entries(cup.courses)) {
    assert.deepEqual(course.bouts.map(b=>b[0]).sort(),Object.keys(DogFight.fighters).filter(k=>k!==p1).sort());
    for (const [i,[p2,stage,form]] of course.bouts.entries()) {
      const w=new DogFight.Battle({mode:'solo',p1,p2,stage,form,cpuLevel:cup.levels[i]},undefined,DogFight.seededRandom(17+i*31));
      assert.equal(w.form,form);
      assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
      for(let n=0;n<180;n++) w.step(1/60,DogFight.idleInput);
      assert(w.dogs.every(f=>Number.isFinite(f.x+f.y)));
    }
  }
});
test('a stale loss or clear cannot finish a resumed round or overwrite a newer run',()=>{
  let entry=cup.begin(cup.read(null),'one',3);
  const first=ticket(entry);
  assert.equal(cup.finish(entry,first,false,0,61),entry);
  entry=cup.begin(cup.read(JSON.parse(JSON.stringify(entry))),'unused',0);
  assert.equal(entry.active.retries,1);
  assert.equal(entry.active.coat,3);
  assert.equal(cup.finish(entry,first,true,3,61),null);
  const retry=ticket(entry);
  entry=cup.finish(entry,retry,true,2,256);
  assert.equal(cup.finish(entry,retry,true,3,64),null);
  entry=cup.begin(entry,'unused',0);
  assert.deepEqual(ticket(entry),{id:'one',retries:1,round:1});
  assert.equal(cup.finish(entry,retry,false,0,0),null);
  assert.equal(cup.finish(cup.begin(cup.read(null),'two',0),first,true,3,64),null);
  assert.equal(cup.read({active:{...entry.active,wins:[{stocks:4,frames:10}]}}).active,null);
});
test('every Cup fighter can defend the stamp, charge and bell using the counter on its retry screen',()=>{
  for(const kind of Object.keys(DogFight.fighters))for(const move of ['stamp','charge','bell']){
    for(const defend of [false,true]){
      const fight=new DispatchRun({room:DispatchScript.lastRoom,cupFighter:kind});
      const hero=fight.dogs[0],boss=fight.foes[0];
      const distance={stamp:90,charge:200,bell:165}[move];
      hero.x=boss.f.x-distance;
      if(move==='charge')boss.cycle=1;
      if(move==='bell')boss.hp=28;
      for(let frame=0;frame<230;frame++){
        const input={...DogFight.idleInput};
        if(defend){
          if(move==='stamp' || (move==='charge' && kind==='brisket'))input.shield=true;
          else if(move==='charge')input.jump=(boss.phase==='windup' && boss.time>boss.duration-.08) ||
            (boss.phase==='strike' && boss.time<.2);
          else input.jump=boss.wavefront?.radius>60 && boss.wavefront.radius<155;
        }
        fight.step(1/60,input);
        if(boss.phase==='stun' && (!boss.wavefront || boss.wavefront.radius>distance+40))break;
      }
      assert.equal(boss.phase,'stun');
      assert.equal(hero.damage===0,defend,kind+' against '+move);
      assert.equal(fight.lastBossHit,defend?undefined:move);
    }
  }
});
test('a personal best ranks fewer retries, then stocks kept, then winning time',()=>{
  let entry=cup.read(null);
  function clear(id,retries,stocks,frames) {
    for(let round=0;round<4;round++){
      entry=cup.begin(entry,id,0);
      if(round===0) for(let n=0;n<retries;n++) entry=cup.begin(entry,id,0);
      entry=cup.finish(entry,ticket(entry),true,stocks,frames);
    }
    assert.equal(entry.last.id,id);
    assert.equal(entry.active,null);
  }
  clear('first',1,3,60);
  clear('clean',0,1,300);assert.equal(entry.best.id,'clean');
  clear('stocks',0,2,400);assert.equal(entry.best.id,'stocks');
  clear('time',0,2,250);assert.equal(entry.best.id,'time');
  clear('late',0,2,251);assert.equal(entry.best.id,'time');
  assert.equal(entry.clears,5);
  assert.deepEqual(cup.read(JSON.parse(JSON.stringify(entry))),entry);
});
for(const kind of Object.keys(DogFight.fighters)) test(kind+' can defeat the final boss with fight inputs',()=>{
  const w=new DispatchRun({room:DispatchScript.lastRoom,cupFighter:kind,coat:2});
  assert.equal(w.dogs[0].kind,kind);
  assert.equal(w.coatFor(0),2);
  assert.equal(w.dogs[0].stocks,3);
  w.random=DogFight.seededRandom(11);
  // Walk into jab range, face the machine, and recover if it knocks the dog past the lip.
  for(let tick=1;tick<=8000 && !w.finished;tick++){
    const [hero,boss]=w.dogs, dx=boss.x-hero.x, face=Math.sign(dx);
    const floor=w.terrain[0], off=hero.x<floor.x1 || hero.x>floor.x2;
    let x=Math.abs(dx)>64 || (Math.abs(dx)>3 && face!==hero.face) ? face : 0;
    if(off) x=hero.x<floor.x1 ? 1 : -1;
    w.step(1/60,{...DogFight.idleInput,x,jump:off && tick%30<12,y:off?-1:0,
      special:off && !hero.jumps && tick%8<2,attack:Math.abs(dx)<139 && Math.abs(hero.y-boss.y)<75 && tick%8<2});
  }
  assert.equal(w.finished,'exit');
  assert(w.dogs[0].stocks>0);
  assert.equal(w.foes[0].hp,0);
  assert.equal(new DispatchRun({room:0,cupFighter:kind,coat:2}).dogs[0].kind,DispatchScript.chapterFighter);
  assert.equal(new DispatchRun({room:DispatchScript.lastRoom}).dogs[0].kind,DispatchScript.chapterFighter);
});
