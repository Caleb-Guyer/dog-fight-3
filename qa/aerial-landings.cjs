const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
global.window={matchMedia:()=>({matches:false})};
require('../docs/engine.js');require('../docs/fighter-lessons.js');
function inspect(file,marker,expose){
  const source=fs.readFileSync(path.join(__dirname,'../docs',file),'utf8');
  new Function('window',source.replace(marker,expose+';'+marker))(window);
}
inspect('render.js','window.DogFightView = {','window.pose=pose');
inspect('fighters-art.js','window.DogArt = Object.freeze(','window.frameFor=getFrame');
const {kits,moves,idleInput}=window.DogFight;
const {Battle,seededRandom}=window.DogFight;
require('../docs/online.js');
const dt=1/60;
const inputs=(slot,input)=>slot?[idleInput,{...idleInput,...input}]:[{...idleInput,...input},idleInput];
function dodgeLanding(kind,slot,enabled=true){
  const battle=new Battle({mode:'local',p1:kind,p2:kind,stage:'picnic',fetch:false,heldAerials:enabled});
  const dog=battle.dogs[slot],step=input=>battle.step(dt,...inputs(slot,input));
  for(let tick=0;tick<80 && !dog.landingLag;tick++)step({jump:tick<6,shield:tick===14,y:tick===14?1:0});
  const lag=Math.round(dog.landingLag*60);
  assert(lag>7);
  return {battle,dog,lag,step};
}
test('all four dogs carry the held swing through a dodge landing in either seat, then release it after one jump',()=>{
  for(const kind of Object.keys(kits))for(const slot of [0,1])for(const stick of [false,true]){
    const {dog,lag,step}=dodgeLanding(kind,slot),back=-dog.face;
    for(let tick=1;tick<=lag+85;tick++){
      const aim=tick===1?back:0;
      step(stick?{jump:true,aimStick:true,tiltMode:true,smashX:aim,x:-aim}:{jump:true,attack:true,x:aim,quickAttack:!slot});
      if(tick<lag)assert(!dog.jumpSquat && !dog.attack);
      if(tick===lag)assert.equal(dog.jumpSquat.aerial.airSide,'back');
      if(tick===lag+3){assert.equal(dog.attack.moveId,kits[kind].air.back);assert(dog.attack.shortHop);}
      if(tick>lag+60)assert(dog.ground>=0 && !dog.jumpSquat && !dog.attack);
    }
  }
});
test('an early release cancels the extended chord; taps in the original seven frames still work',()=>{
  for(const mode of ['releaseAttack','releaseJump','bothEarly','bothLate','attackOnly','delayedStick','interrupted','legacy']){
    const {battle,dog,lag,step}=dodgeLanding('brisket',0,mode!=='legacy');
    for(let tick=1;tick<=lag+3;tick++){
      const late=mode==='bothLate',early=mode==='bothEarly',aim=tick===1 || late && tick===lag-6;
      const jump=late?tick===lag-6:early?tick===1:mode!=='attackOnly' && !(mode==='releaseJump' && tick>=lag);
      const attack=late?tick===lag-6:early?tick===1:mode!=='delayedStick' && !(mode==='releaseAttack' && tick>=lag);
      step({jump,attack,x:aim?-1:0,aimStick:mode==='delayedStick' && tick>=9,smashY:tick===9?-1:0});
      if(mode==='interrupted' && tick===9)assert(battle.hit(dog,battle.dogs[1],5,100,1,0,'jab',-1));
    }
    if(mode==='delayedStick')assert.equal(dog.attack?.moveId,kits.brisket.air.up);
    else if(mode==='bothLate')assert.equal(dog.attack?.moveId,kits.brisket.air.back);
    else {
      assert(!dog.attack,mode);
      if(['releaseAttack','legacy'].includes(mode))assert(dog.ground<0 && !dog.shortHopFlight,mode);
      if(['releaseJump','bothEarly','attackOnly'].includes(mode))assert(dog.ground>=0,mode);
    }
  }
  const {battle}=dodgeLanding('brisket',0);
  battle.copyFightFrom(dodgeLanding('brisket',0,false).battle);
  assert(!battle.heldAerials);
});
test('late remote releases correct the predicted Hip Check on both seats after an actual Belly Drop',()=>{
  const seed=81;
  const pose=w=>w.dogs.map(f=>[f.x,f.y,f.vy,f.ground,f.face,f.landingLag,f.heldRecoveryJump,
    f.jumpSquat?.time,f.jumpSquat?.aerial?.airSide,f.shortHopFlight,f.attack?.moveId,f.attack?.time]);
  for(const slot of [0,1])for(const release of [false,true]){
    const peers=[0,1].map(side=>{
      let world;const sent=[];
      const session=new window.DogOnline.OnlineSession({start(config,rng){world=new Battle(config,()=>{},rng);}});
      session.side=side;session.heldAerials=true;session.send=p=>{if(p[0]==='input')sent[p[2]]=p[3];};
      session.beginRound(['start',1,'brisket','brisket','picnic',seed]);
      return {net:session.match,world,sent};
    });
    const ref=new Battle({mode:'local',p1:'brisket',p2:'brisket',stage:'picnic'},()=>{},seededRandom(seed));
    const history=[pose(ref)],dog=ref.dogs[slot];let landed=-1,wrong=false;
    for(let tick=0;tick<65;tick++){
      const age=landed<0?0:tick-landed,back=slot?1:-1;
      const pair=inputs(slot,{jump:tick===0 || age>0,attack:tick===0 || age>0 && (!release || age<17),y:tick===0?1:0,x:age===1?back:0});
      ref.step(dt,...pair);history.push(pose(ref));
      if(landed<0 && dog.landingLag>0){assert.equal(dog.landingAerial,'brisketDrop');landed=tick;}
      for(const [side,p] of peers.entries()){
        if(tick>=7)assert(p.net.receive(tick-7,peers[1-side].sent[tick-7]));
        p.net.tick(()=>pair[side],p.world);
        assert.deepEqual(pose(p.net.confirmedWorld),history[p.net.confirmed]);
        if(age===21 && side!==slot)wrong=p.world.dogs[slot].attack?.moveId==='brisketHip' && !dog.attack;
      }
      if(age===21)assert.equal(dog.attack?.moveId,release?undefined:'brisketHip');
    }
    assert(landed>0);assert.equal(wrong,release);
    for(const [side,p] of peers.entries()){
      const packets=peers[1-side].sent;
      for(let i=p.net.received;i<packets.length;i++)assert(p.net.receive(i,packets[i]));
      p.net.confirm(p.world);assert.deepEqual(pose(p.world),pose(ref));
    }
  }
});
for(const [kind,kit] of Object.entries(kits))test(kind+' shows the committed aerial until its first actionable shield frame',()=>{
  const contacts=new Set();
  for(const [side,id] of Object.entries(kit.air)){
    const pose=id+'Land',move=moves[id];
    const pixels=n=>Buffer.from(window.frameFor(kind,pose,n).indices).toString('base64');
    assert.notEqual(pixels(0),pixels(3));contacts.add(pixels(0));
    const flights=[];
    for(const late of [false,true]){
      const film=new window.FighterSchool.Demonstration(kind,'land-'+side,2,null,late);
      assert.equal(film.trial.canStep(idleInput),false);
      const dog=film.battle.dogs[0];
      const lag=late?move.land:Math.ceil(move.land/2);
      let ticks=0,previous=-1;
      while(!film.ended){
        film.step();
        const [actual,phase]=window.pose(dog,null,null);
        if(dog.landingLag>1e-8){
          assert.equal(actual,pose,kind+' '+side);
          assert(phase>=previous && phase<1);previous=phase;ticks++;
        }else assert.notEqual(actual,pose);
      }
      assert.equal(ticks,lag);assert.equal(film.trial.frames,lag);assert.equal(film.trial.shieldAt,lag);
      assert.equal(film.trial.done,!late);assert.equal(film.trial.missed,late);
      flights.push(film.trial.landedAt);
    }
    assert.equal(flights[0],flights[1],'both inputs reach the same touchdown');
  }
  assert.equal(contacts.size,5,'each aerial has a distinct touchdown drawing');
});
test('a canceled Belly Drop still needs a timely guard to pass the playable exercise',()=>{
  const film=new window.FighterSchool.Demonstration('brisket','land-down');
  while(film.trial.landedAt===undefined)film.step();
  const {trial,battle}=film;
  for(let n=1;n<=11;n++){
    const input={...idleInput,shield:n===11};
    assert(trial.canStep(input));battle.step(1/60,input,idleInput);trial.afterStep(battle);
  }
  assert.equal(trial.canceled,true);assert.equal(trial.frames,9);assert.equal(trial.shieldAt,11);
  assert(trial.missed && !trial.done);assert.match(trial.info.miss,/ready after 9 frames/);
});
