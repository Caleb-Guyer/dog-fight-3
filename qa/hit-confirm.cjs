const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');require('../docs/combo-lab.js');
const {Battle,seededRandom,idleInput,fighters}=window.DogFight;
function practice(p1='pip',p2='brisket',stage='nightmail',seed=11){
  const w=new Battle({p1,p2,stage,mode:'training',fetch:false},undefined,seededRandom(seed));
  w.resetComboPractice('confirm');
  return w;
}
function step(w,input={}){
  w.step(1/60,{...idleInput,quickAttack:true,...input},idleInput);
}
function answer(w,wrong=false){
  const d=w.comboPractice;
  for(let n=0;n<125 && d.phase!=='done';n++){
    const age=d.opening?d.tick-d.openedAt:-1;
    step(w,{attack:age>=10 && (age-10)%8===0 && (wrong?d.opening==='block':d.opening==='hit'),
      grab:age>=12 && age%12===0 && (wrong?d.opening==='hit':d.opening==='block'),
      x:d.opening==='block' && age>=2 && age<12?.4:0});
  }
}
test('every pairing can identify three shields and confirm three hits through normal combat inputs',()=>{
  for(const p1 of Object.keys(fighters))for(const p2 of Object.keys(fighters)){
    const w=practice(p1,p2,p1==='noodle'?'laundry':'picnic');
    const series=w.comboPractice.series;
    for(let i=0;i<6;i++){
      step(w);step(w,{attack:true});
      const d=w.comboPractice;
      answer(w);
      assert.equal(d.phase,'done');
      assert.equal(d.series.correct,i+1,p1+' versus '+p2+' · '+d.outcome);
      assert.equal(d.contacts.length,2);
      assert.equal(d.contacts[0].moveId,w.dogs[0].kit.ground[0]);
      assert.equal(d.contacts[1].kind,d.guard?'grab':'hit');
    }
    assert.deepEqual([series.played,series.confirmed,series.caught],[6,3,3]);
    step(w);step(w,{attack:true});
    assert.notEqual(w.comboPractice.series,series);
    assert.equal(w.comboPractice.series.played,0);
  }
});
test('wrong choices, held Attack and a premature second press cannot score a read',()=>{
  for(let seed=1;seed<=8;seed++){
    const w=practice('pip','brisket','picnic',seed);
    step(w,{attack:true});answer(w,true);
    assert.equal(w.comboPractice.phase,'done');assert.equal(w.comboPractice.series.correct,0);
    w.resetComboPractice('confirm');const d=w.comboPractice;
    for(let n=0;n<140;n++)step(w,{attack:true});
    assert.equal(w.comboPractice,d);assert.equal(d.phase,'done');assert.equal(d.series.correct,0);
    w.resetComboPractice('confirm');
    step(w,{attack:true});step(w);step(w,{attack:true});
    assert.equal(w.comboPractice.outcome,'Wait for the first jab to connect before choosing.');
  }
});
test('shuffles repeat with the same seed, and the drill leaves dummy damage and recorded combos available',()=>{
  const orders=new Set();
  for(let seed=1;seed<=15;seed++){
    const order=practice('pip','brisket','picnic',seed).comboPractice.series.responses;
    assert.deepEqual(order,practice('pip','brisket','picnic',seed).comboPractice.series.responses);
    assert.equal(order.filter(Boolean).length,3);orders.add(order.join(''));
  }
  assert(orders.size>3);
  const w=practice();
  w.setDummyDamage(110);w.comboTakes[1]=[{...idleInput,jump:true}];
  w.resetComboPractice('confirm','p2',false,1);
  assert.equal(w.comboPractice.reply,'stand');assert.equal(w.dogs[1].damage,0);
  w.knockouts([w.dogs[0]]);
  assert.equal(w.comboPractice.series.played,1);
  w.resetComboPractice('replay','guard',false,1);
  assert.equal(w.dogs[1].damage,110);assert.equal(w.comboPractice.tape[0].jump,true);
});
