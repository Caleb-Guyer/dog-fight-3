const test=require('node:test'), assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js'); require('../docs/online.js');
const {Battle,FinishTape,kits,idleInput,seededRandom}=window.DogFight, dt=1/60;
const config={p1:'pip',p2:'brisket',stage:'nightmail',fetch:false,cpuLevel:'rival'};
function match(mode,extra={},event) {return new Battle({...config,mode,...extra},event,seededRandom(42));}
function advance(w,n,first={},second={}) {
  for(let i=0;i<n;i++)w.step(dt,{...idleInput,...first},{...idleInput,...second});
}
const pose=w=>w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.ground,f.damage,f.stocks,f.ledge?.index,f.attack?.moveId]);
for(const attacker of Object.keys(kits))test(attacker+' runs off, takes an occupied lip, lands its own back air and gets home',()=>{
  for(const holder of Object.keys(kits))for(const side of ['left','right']){
    const events=[], w=match('training',{p1:attacker,p2:holder,stage:'laundry'},(n,e)=>{
      if(n==='runoffCue')events.push(e.phase);
      if(n==='hit')events.push(e.moveId);
    });
    w.resetLedgeTrumpPractice('runoff',side);const d=w.trumpPractice, before=pose(w),dir=side==='left'?-1:1;
    advance(w,70,{x:dir}); assert.deepEqual(pose(w),before);
    advance(w,1,{attack:true});advance(w,40,{x:dir});
    assert.equal(d.phase,'turn');
    for(const [input,phase] of [[{x:-dir},'caught'],[{y:1,jump:true},'jumping']]){
      advance(w,25,input);assert.equal(d.phase,phase);
      const frozen=pose(w),time=w.time;advance(w,20);assert.equal(w.time,time);assert.deepEqual(pose(w),frozen);
    }
    assert.equal(w.dogs[0].jumps,0);
    advance(w,1,{x:dir,attack:true});
    for(let n=0;n<90 && d.phase!=='done';n++)advance(w,1,{x:-dir});
    assert.equal(d.outcome,'landed');assert.equal(w.dogs[0].ground,d.edge.index);
    assert.deepEqual(events,['go','turn','bump','aim','backAir',kits[attacker].air.back,'landed']);
  }
});
test('Rival uses the technique in ordinary play and the finish replay reproduces the hit',()=>{
  for(const side of ['left','right'])for(const p2 of Object.keys(kits)){
    const events=[],w=match('solo',{p2,stage:'canal',form:'counterweights',runoffTrump:side},(n,e)=>{
      if(n==='hit')events.push(e.moveId);
    }), tape=new FinishTape();
    for(let n=0;n<64;n++){tape.record(w,idleInput,idleInput);advance(w,1);}
    assert(events.includes(kits[p2].air.back));
    assert.deepEqual(pose(tape.playback(tape.length).battle),pose(w));
  }
});
test('a fresh catch, an inner gap, a reserved roll read and the two easier CPUs keep their existing decisions',()=>{
  const w=match('solo',{stage:'laundry',runoffTrump:'left'}),[h,g]=w.dogs;
  h.ledgeTime=0;assert.equal(w.runoffTrumpInput(g,h),null);
  h.ledge=null;const p=w.terrain[0],inner={left:false,index:0,x:p.x2,y:p.y};
  w.hangLedge(h,inner);h.ledgeTime=.6;Object.assign(g,{x:inner.x-50,face:1});assert.equal(w.runoffTrumpInput(g,h),null);
  for(const level of ['rookie','arcade']){
    const world=match('solo',{cpuLevel:level,runoffTrump:'left'});
    for(let n=0;n<70;n++){advance(world,1);assert(!world.bot.runoff);}
  }
  const scout=match('solo',{p2:'noodle',scoutedRoll:{side:'right',delay:.4}});
  advance(scout,1);assert(scout.bot.rollForecast);assert(!scout.bot.runoff);
});
test('a Rival that commits from any eligible standing distance catches the lip without overshooting',()=>{
  for(const p2 of Object.keys(kits))for(let gap=12;gap<=90;gap++){
    let took=false;
    const w=match('solo',{p2,stage:'canal',form:'counterweights',runoffTrump:'left'},name=>{if(name==='ledgeTrump')took=true;});
    w.dogs[1].x=w.dogs[0].ledge.x+gap;
    advance(w,1);assert(w.bot.runoff);
    advance(w,100);assert(took,p2+' · '+gap);assert.equal(w.dogs[1].stocks,3);
  }
});
test('a roll before the catch defeats a committed Rival and a missed back aerial cannot pass the drill',()=>{
  for(const side of ['left','right']){
    const w=match('training');w.resetLedgeTrumpPractice('escape',side);
    advance(w,1,{attack:true});advance(w,7);assert(w.bot.runoff);
    advance(w,1,{shield:true});advance(w,70);assert.equal(w.trumpPractice.outcome,'escaped');assert.equal(w.dogs[0].damage,0);
    const dir=side==='left'?-1:1;
    w.resetLedgeTrumpPractice('runoff',side);w.trumpPractice.slow=false;
    advance(w,1,{attack:true});
    for(let n=0;n<45 && !w.trumpPractice.took;n++)advance(w,1,{x:w.dogs[0].ground<0?-dir:dir});
    assert(w.trumpPractice.took);
    advance(w,1,{jump:true});advance(w,100,{x:-dir});assert.equal(w.trumpPractice.outcome,'empty');
    w.resetTraining(); assert(!w.trumpPractice);assert(!w.bot.runoff);
  }
});
test('late remote roll or back-air inputs reconcile with the same offline stock fight',()=>{
  for(const escape of [false,true]){
    const peers=[0,1].map(side=>{
      const sent=[];let world;
      const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=side;session.send=p=>{if(p[0]==='input')sent[p[2]]=p[3];};
      session.beginRound(['start',1,'pip','brisket','nightmail',42]);
      for(const w of [world,session.match.confirmedWorld])w.placeRunoffTrump('left',1);
      return {world,net:session.match,sent};
    });
    const ref=match('local',{fetch:true});ref.placeRunoffTrump('left',1);
    const history=[pose(ref)];let took=-1,hit=false;
    for(let n=0;n<110;n++){
      const f=ref.dogs[1], after=n-took, attacker=took<0?{x:f.ground>=0?-1:1}:
        after===1?{y:1,jump:true}:after===2?{x:-1,attack:true}:{x:1};
      const pair=[{...idleInput,shield:escape && n===12},{...idleInput,...attacker}];
      ref.step(dt,...pair);history.push(pose(ref));
      if(took<0 && f.ledge && ref.dogs[0].ledgeTrump)took=n;
      if(ref.dogs[0].damage>0)hit=true;
      for(const [i,p] of peers.entries()){
        if(n>=7)assert(p.net.receive(n-7,peers[1-i].sent[n-7]));
        p.net.tick(()=>pair[i],p.world);assert.deepEqual(pose(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert.equal(took>=0,!escape);assert.equal(hit,!escape);
    for(const [i,p] of peers.entries()){
      for(let n=p.net.received;n<110;n++)assert(p.net.receive(n,peers[1-i].sent[n]));
      p.net.confirm(p.world);assert.deepEqual(pose(p.world),pose(ref));
    }
  }
});
