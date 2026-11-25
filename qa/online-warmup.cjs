const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
const {Battle,idleInput,seededRandom,stageForms,fighters}=window.DogFight;
const create=(options={})=>new Battle({mode:'training',p1:'pip',p2:'brisket',stage:'picnic',form:'flat',
  fetch:false,coats:[2,0],warmupPartner:'stand',...options},undefined,seededRandom(37));

test('warm-up uses the room geometry and selected coat, respawns indefinitely, and leaves no match record',()=>{
  for(const p1 of Object.keys(fighters))for(const form of Object.keys(stageForms)){
    const w=create({p1,form});
    assert.equal(w.form,form);assert.equal(w.coatFor(0),2);
    assert.equal(w.matchCard,null);assert.equal(w.clockFrames,null);
    for(let i=0;i<7;i++){
      const f=w.dogs[i%2];f.x=4000;w.knockouts([f]);
      assert.equal(w.end,null);assert.equal(f.stocks,3);assert.equal(f.damage,0);
    }
  }
  assert.equal(create({warmupPartner:undefined}).form,'original');
  const real=create({mode:'local',timeBattle:true,minutes:1});
  assert.equal(real.warmupPartner,undefined);assert.deepEqual(real.matchCard.points,[0,0]);
  assert.equal(real.clockFrames,3600);
});
test('the same partner can take a jab, shield an attack, and fight back with CPU inputs',()=>{
  const w=create(),[player,partner]=w.dogs;
  for(let i=0;i<12;i++)w.step(1/60,{...idleInput,attack:i===0});
  assert(partner.damage>0);const originalDamage=partner.damage;
  w.warmupPartner='shield';
  for(let i=0;i<50;i++)w.step(1/60);
  assert(partner.shield);assert.equal(partner.damage,originalDamage);
  w.warmupPartner='spar';assert(w.cpuControlled(partner));assert(!w.cpuControlled(player));
  for(let i=0;i<480 && !player.damage;i++)w.step(1/60);
  assert(player.damage>0);assert.equal(w.end,null);
});
