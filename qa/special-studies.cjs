const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/fighter-lessons.js');
const {Battle,kits,idleInput,seededRandom}=window.DogFight;
const {study,makeTrial,Demonstration}=window.FighterSchool;
for(const kind of Object.keys(kits))test(kind+' down-air example clears its own contact and landing challenge',()=>{
  const events=[],movie=new Demonstration(kind,'down-air',2,(name,e)=>events.push({name,move:e.moveId,splash:e.owner?.attack?.landed,meteor:e.meteor}));
  while(!movie.ended)movie.step();
  assert(movie.trial.done && !movie.trial.missed);
  const id=kits[kind].air.down;
  if(kind==='pip')assert(events.some(e=>e.name==='pogoShield' && e.move===id));
  else assert(events.some(e=>e.name==='hit' && e.move===id &&
    (kind!=='brisket' || e.splash) && (kind!=='clover' || e.meteor)));
  const attempt=new Demonstration(kind,'down-air',0),trial=attempt.trial;
  for(let n=0;n<170;n++){
    if(trial.canStep(idleInput))assert.fail('idle input must leave the setup ready');
  }
  for(let n=0;n<170;n++){
    const a={...idleInput,attack:n===0,x:-1};
    if(trial.canStep(a)){attempt.battle.step(1/60,a,trial.partner());trial.afterStep(attempt.battle);}
  }
  assert(trial.missed && !trial.done);
});
test('Pogo Paw springs once per flight off a guard, while a parry, broken shield or whiff gives no bounce',()=>{
  for(const kind of ['body','shield','parry','break','spent','legacy','whiff'])for(const dir of [1,-1]){
    const events=[],w=new Battle({mode:'local',p1:'pip',p2:'brisket',stage:'nightmail',shieldPogo:kind!=='legacy'},
      n=>events.push(n),seededRandom(5));
    makeTrial(4,w);const [f,r]=w.dogs;
    if(dir<0)for(const dog of w.dogs){dog.face*=-1;dog.x=1200-dog.x;dog.vx*=-1;}
    if(kind==='whiff')r.x+=140*dir;
    if(kind==='break')r.shieldHP=.04;
    if(kind==='spent')f.usedPogo=true;
    if(kind==='body')r.shield=false;
    for(let n=0;n<4;n++)w.step(1/60,{...idleInput,y:n===0?1:0,attack:n===0},
      {...idleInput,shield:kind!=='body' && (kind!=='parry' || n<2)});
    assert.equal(events.filter(e=>e==='pogoShield').length,Number(kind==='shield'),kind);
    assert.equal(f.jumps,1);assert.equal(f.usedPogo,['body','shield','spent'].includes(kind));
    if(kind==='shield' || kind==='body')assert.equal(f.vy,kind==='shield'?-340:-465);
    else assert(f.vy>=0);
    assert.equal(r.damage,kind==='body'?9:0);
    if(kind==='parry')assert(events.includes('parry'));
    if(kind==='break')assert(r.shieldBreak);
    if(kind==='shield'){
      assert(r.shieldStun>0 && f.impactLag>0);
      for(let i=0;i<95 && f.ground<0;i++)w.step(1/60,idleInput,idleInput);
      assert(f.ground>=0 && !f.usedPogo);
    }
  }
});
test('a late opponent shield corrects a predicted clean bounce to the lower rebound on both peers',()=>{
  require('../docs/online.js');
  const config={mode:'local',stage:'nightmail',p1:'pip',p2:'brisket',fetch:false},seed=19;
  const ref=new Battle(config,undefined,seededRandom(seed));makeTrial(4,ref);
  ref.dogs[1].shield=false;
  const peers=[0,1].map(side=>{
    const packets=[],events=[];
    let world;
    const s=new window.DogOnline.OnlineSession({start(cfg,rng){world=new Battle(cfg,n=>events.push(n),rng);}});
    s.side=side;s.send=p=>packets.push(p);s.beginRound(['start',1,'pip','brisket','nightmail',seed]);
    for(const w of [world,s.match.confirmedWorld])w.copyFightFrom(ref);
    return {net:s.match,world,packets,events};
  });
  const sample=w=>w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.jumps,f.ground,f.usedPogo,f.damage,f.shieldHP]);
  const history=[sample(ref)];
  for(let n=0;n<55;n++){
    const input=[{...idleInput,x:n?1:0,y:n?0:1,attack:!n},{...idleInput,shield:true}];
    ref.step(1/60,...input);history.push(sample(ref));
    for(const [i,p] of peers.entries()){
      if(n>=7){const msg=peers[1-i].packets[n-7];assert(p.net.receive(msg[2],msg[3]));}
      p.net.tick(()=>input[i],p.world);
      assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
    }
  }
  for(const [i,p] of peers.entries()){
    for(const msg of peers[1-i].packets.slice(-7))assert(p.net.receive(msg[2],msg[3]));
    p.net.confirm(p.world);
    assert.deepEqual(sample(p.world),sample(ref));assert.equal(p.events.filter(n=>n==='pogoShield').length,1);
  }
});
for(const kind of Object.keys(kits)){
  test(kind+' demonstrates all four specials with normal fight inputs',()=>{
    for(const [direction,id] of Object.entries(kits[kind].specials)){
      const events=[];
      const movie=new Demonstration(kind,direction,2,(event,e)=>events.push([event,e.moveId]));
      while(!movie.ended)movie.step();
      assert(movie.trial.done && !movie.trial.missed,id);
      assert(events.some(([event,move])=>move===id),id);
      assert.equal(movie.tail,45);
      const copy=new Demonstration(kind,direction,2);
      for(let f=0;f<movie.frame;f++)copy.step();
      assert.deepEqual(copy.battle.dogs.map(d=>[d.x,d.y,d.damage,d.stocks]),movie.battle.dogs.map(d=>[d.x,d.y,d.damage,d.stocks]));
      movie.step();assert.equal(movie.frame,copy.frame);
      const spec=study(kind,direction);
      let lesson;
      const w=new Battle({mode:'local',p1:kind,p2:spec.rival,stage:spec.stage,minutes:0,fetch:false,lesson:spec.index},
        (name,e)=>lesson?.contact(name,e),seededRandom(5));
      lesson=makeTrial(spec.index,w);
      for(let i=0;i<210;i++)if(lesson.canStep(idleInput)){w.step(1/60,idleInput,lesson.partner(idleInput));lesson.afterStep(w);}
      assert.equal(lesson.done,false,'Watching or waiting cannot earn '+id);
    }
  });
}
test('the second beat or returning disc must connect during the same use',()=>{
  for(const kind of ['pip','clover']){
    const spec=study(kind,'neutral'),w=new Battle({mode:'local',p1:kind,p2:spec.rival,stage:spec.stage,fetch:false});
    const trial=makeTrial(spec.index,w),[f,target]=w.dogs;
    const first=()=>{trial.contact('special',{f,moveId:spec.id});trial.contact('hit',{owner:f,f:target,moveId:spec.id});};
    first();first();assert.equal(trial.done,false);
    trial.contact('hit',{owner:f,f:target,moveId:spec.id});assert.equal(trial.done,true);
  }
});
