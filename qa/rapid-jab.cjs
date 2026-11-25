const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/online.js');
const {Battle,idleInput,seededRandom}=window.DogFight;
const cfg={mode:'local',p1:'pip',p2:'brisket',stage:'nightmail',fetch:false},dt=1/60;
const input=values=>({...idleInput,...values});
function position(w,slot){
  const f=w.dogs[slot],g=w.dogs[1-slot],face=slot?-1:1;
  Object.assign(f,{x:600,face});Object.assign(g,{x:600+face*(f.stats.width+g.stats.width+3),face:-face});
}
const basic=['pipJab','pipCross'];
const string=n=>[...basic,...Array(n).fill('pipSpeedBag'),'pipBellKick'];
test('either side can tap for Heel Kick, release a short string, or hold five distinct beats with either control setting',()=>{
  for(const slot of [0,1])for(const quickAttack of [false,true])for(const route of ['tap','early','full','miss']){
    const hits=[];
    const w=new Battle({...cfg,p1:slot?'brisket':'pip',p2:slot?'pip':'brisket'},(e,d)=>{if(e==='hit')hits.push(d.moveId);});
    position(w,slot);
    const f=w.dogs[slot],g=w.dogs[1-slot];
    if(route==='miss')g.x+=f.face*250;
    for(let n=0;n<140;n++){
      const attack=n===0 || (route==='tap'?[9,18].includes(n):n>=9 && n<(route==='early'?22:105));
      const pair=[idleInput,idleInput];pair[slot]=input({attack,quickAttack});w.step(dt,...pair);
    }
    const expected=route==='tap'?[...basic,'pipHeel']:route==='miss'?[]:string(route==='early'?1:5);
    assert.deepEqual(hits,expected);
    if(route==='full'){
      assert.equal(Math.round(g.damage*10)/10,20);
      assert.equal(f.moveHistory.filter(entry=>entry.moveId==='pipSpeedBag').length,1);
    }
    if(route==='miss')assert(!['Speed Bag','Bell Kick'].includes(f.lastMove));
  }
});
test('the defender can shift on hit sparks or shield the opening, without replacing their saved takes or fighters',()=>{
  for(const [percent,reply,damage] of [[0,'stand',20],[0,'away',14.4],[75,'away',8],[0,'shield',0]]){
    const w=new Battle({...cfg,mode:'training',p1:'noodle'});
    w.setDummyDamage(percent);const tape=[input({jump:true})];w.comboTakes=[tape,null];
    w.resetComboPractice('escapeFlurry');const d=w.comboPractice;
    assert.equal(w.trainingPlayerSlot,1);assert.equal(w.dogs[0].kind,'pip');
    for(let n=0;n<200;n++)w.step(dt,input({attack:n===0,shield:reply==='shield',x:reply==='away'&&w.hitStop?1:0}));
    assert.equal(d.phase,'done');assert.equal(Math.round(d.damage*10)/10,damage);
    if(reply==='away')assert(d.shifts>=2);
    if(reply==='shield')assert(d.contacts.some(c=>c.kind==='block'));
    w.resetComboPractice('flurry');assert.equal(w.trainingPlayerSlot,0);
    assert.equal(w.comboTakes[0],tape);w.resetTraining();assert.deepEqual(w.dogs.map(f=>f.kind),['noodle','brisket']);
  }
});
test('Rival Pip confirms a jab into five beats from the ordinary stock match spawn',()=>{
  const hits=[];const w=new Battle({...cfg,mode:'solo',p1:'brisket',p2:'pip',cpuLevel:'rival'},(e,d)=>{
    if(e==='hit' && d.owner.index===1)hits.push(d.moveId);
  },seededRandom(30));
  for(let n=0;n<190&&!hits.includes('pipBellKick');n++)w.step(dt,idleInput);
  assert.deepEqual(hits.slice(-8),string(5));assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
});
test('late release during the rapid jab corrects predicted beats, damage, and stale history on both peers',()=>{
  const sample=w=>[w.hitStop,...w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.damage,f.stun,f.chainNext,
    f.attack?.moveId,f.attack?.time,f.attack?.flurryBeat,f.attack?.finishFlurry,f.moveHistory.map(h=>[h.moveId,h.power])])];
  for(const slot of [0,1]){
    const config={...cfg,p1:slot?'brisket':'pip',p2:slot?'pip':'brisket'};
    const ref=new Battle(config,undefined,seededRandom(17));position(ref,slot);
    const peers=[0,1].map(side=>{
      let world;const packets=[];
      const s=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      s.side=side;s.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      s.beginRound(['start',1,config.p1,config.p2,config.stage,17]);
      for(const w of [world,s.match.confirmedWorld])position(w,slot);
      return {world,net:s.match,packets};
    });
    const history=[sample(ref)];let divergentFinish=false;
    for(let n=0;n<100;n++){
      const pair=[idleInput,idleInput];pair[slot]=input({quickAttack:true,attack:n===0 || n>=9 && n<22});
      ref.step(dt,...pair);history.push(sample(ref));
      for(const [s,p] of peers.entries()){
        if(n>=8)p.net.receive(n-8,peers[1-s].packets[n-8]);
        p.net.tick(()=>pair[s],p.world);
        if(ref.dogs[slot].attack?.moveId==='pipBellKick' && p.world.dogs[slot].attack?.moveId==='pipSpeedBag')divergentFinish=true;
        assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(divergentFinish);assert.equal(ref.dogs[1-slot].damage,14.4);
    for(const [s,p] of peers.entries()){
      for(let n=p.net.received;n<peers[1-s].packets.length;n++)p.net.receive(n,peers[1-s].packets[n]);
      p.net.confirm(p.world);assert.deepEqual(sample(p.world),sample(ref));
    }
  }
});
