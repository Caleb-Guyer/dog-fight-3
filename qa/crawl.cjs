const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle,kits,arenas,bodyHeight,idleInput,seededRandom}=window.DogFight;
const dt=1/60;
const pad=(x=0,y=0,buttons={})=>({...idleInput,x,y,...buttons});

test('Noodle stays low going forward and backward, stops at either lip, and can still drop through',()=>{
  for(const dir of [-1,1]){
    const w=new Battle({mode:'local',stage:'picnic',p1:'noodle',p2:'pip',fetch:false});
    const f=w.dogs[0], platform=w.terrain.findIndex(p=>p.thin), p=w.terrain[platform];
    Object.assign(f,{ground:platform,x:(p.x1+p.x2)/2,y:p.y,face:1});
    for(let i=0;i<14;i++)w.step(dt,pad(dir,.68),idleInput);
    // A mostly horizontal stick walks or runs. A lower diagonal enters the crawl.
    assert(!f.crawling);
    f.vx=0;f.run=null;f.face=1;
    const gentle=64/127;
    for(let i=0;i<12;i++)w.step(dt,pad(dir*gentle,gentle),idleInput);
    assert.equal(f.face,1);assert.equal(bodyHeight(f),28);
    assert.equal(f.vx,dir*gentle*(dir>0?104:72));
    for(let i=0;i<6;i++)w.step(dt,pad(0,gentle),idleInput);
    assert(f.crawling && !f.vx);
    for(let i=0;i<400;i++)w.step(dt,pad(dir*gentle,gentle),idleInput);
    assert.equal(f.x,dir>0?p.x2:p.x1);assert.equal(f.ground,platform);
    w.step(dt,idleInput,idleInput);
    assert(!f.crawling && !f.crouch);
    for(let i=0;i<4;i++)w.step(dt,pad(0,1),idleInput);
    assert.equal(f.ground,-1);assert(!f.crawling);
  }
  for(const kind of Object.keys(kits)){
    const w=new Battle({mode:'local',stage:'picnic',p1:kind,p2:'pip',fetch:false});
    for(let i=0;i<24;i++)w.step(dt,pad(1,1),idleInput);
    assert.equal(w.dogs[0].crawling,kind==='noodle');
  }
});

test('actual disc crossings and the low serve decide the mirrored drill on every arena',()=>{
  for(const stage of Object.keys(arenas)) for(const dir of [-1,1])for(const softened of [false,true])
    for(const route of ['stand','rise','wait','stay','guard','tilt']){
      const w=new Battle({mode:'training',p1:'pip',p2:'brisket',stage,fetch:false});
      w.resetFootworkPractice('crawl',dir);
      const d=w.footworkPractice, strength=softened?64/127:1;
      let tilted=false;
      for(let i=0;i<240 && d.phase!=='done';i++){
        let a=pad(dir*strength,strength,{attack:i===0});
        if(route==='stand'||(route==='rise' && d.phase==='under'))a=pad(0,0,{attack:i===0});
        if(route==='wait' && i>5)a=pad(0,strength);
        if(d.phase==='inside' && route==='guard')a=pad(0,0,{shield:true});
        if(d.phase==='inside' && route==='tilt'){a=pad(dir*.5,0,{attack:!tilted});tilted=true;}
        w.step(dt,a);
      }
      assert.equal(d.outcome,{stand:'castHit',rise:'returnHit',wait:'shortCrawl',stay:'lowHit',guard:'lowGuard',tilt:'caughtServe'}[route],
        [stage,dir,softened,route].join('/'));
      if(route==='tilt')assert.equal(w.dogs[0].lastMove,'Knot Poke');
      w.resetTraining();assert.equal(w.dogs[0].kind,'pip');assert.equal(w.dogs[1].kind,'brisket');
    }
});

test('three-stock Rival matches allow a crawl under Round Trip, a low scoop, and Tail Broom counterplay',()=>{
  for(const choice of ['run','crawl','sweep','cast','serve']){
    const pitcher=choice==='cast'||choice==='serve',events=[];
    const w=new Battle({mode:'solo',cpuLevel:'rival',stage:'picnic',fetch:false,
      p1:pitcher?'clover':'noodle',p2:pitcher?'noodle':'clover'},
      (k,e)=>{if(k==='hit'||k==='grabCatch')events.push(e.moveId);},seededRandom(pitcher?19:4));
    let crawled=false;
    for(let i=0;i<100;i++){
      let a=pad(1,choice==='run'?0:1);
      if(pitcher)a=i<16?pad(1):pad(0,choice==='serve' && i===16?1:0,{special:i===16});
      else if(choice==='sweep' && i>=50)a=pad(0,1,{attack:i===50});
      w.step(dt,a);
      crawled ||= w.dogs[1].crawling;
    }
    const first={run:'cloverRound',crawl:'cloverScoopSlide',sweep:'noodleTailBroom',cast:'noodleLeadSweep',serve:'cloverServe'};
    assert.equal(events[0],first[choice]);
    if(pitcher)assert.equal(crawled,choice==='cast');
  }
});

const state=w=>[w.hitStop,w.projectiles.map(d=>[d.type,d.x,d.y,d.back,...d.hit]),
  ...w.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.ground,f.damage,f.stocks,!!f.crouch,!!f.crawling,f.attack?.moveId,f.shield])];
test('late crawl and shield inputs correct predicted hits in both rollback slots',()=>{
  for(const slot of [0,1]){
    const c={mode:'local',stage:'picnic',p1:slot?'clover':'noodle',p2:slot?'noodle':'clover',fetch:false};
    const dir=slot?-1:1,events=[];
    const w=new Battle(c,(k,e)=>{if(k==='hit'||k==='block')events.push([k,e.moveId]);},seededRandom(19));
    const peers=[0,1].map(side=>{
      let world;const packets=[];
      const session=new window.DogOnline.OnlineSession({start(config,r){world=new Battle(config,()=>{},r);}});
      session.side=side;session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,c.p1,c.p2,c.stage,19]);return {world,net:session.match,packets};
    });
    const history=[state(w)];let predictedHit=false;
    for(let i=0;i<180;i++){
      const noodle=i>129?idleInput:i>102?pad(0,0,{shield:true}):pad(dir,i<28?0:1);
      const clover=i<15?pad(-dir):pad(0,i===108?1:0,{special:i===19||i===108});
      const pair=slot?[clover,noodle]:[noodle,clover];
      w.step(dt,...pair);history.push(state(w));
      for(const [side,p] of peers.entries()){
        if(i>=8)assert(p.net.receive(i-8,peers[1-side].packets[i-8]));
        p.net.tick(()=>pair[side],p.world);
        if(side!==slot && i<40 && p.world.dogs[slot].damage>w.dogs[slot].damage)predictedHit=true;
        assert.deepEqual(state(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert.deepEqual(events,[['block','cloverServe']]);assert(predictedHit);
    for(const [side,p] of peers.entries()){
      const remote=peers[1-side].packets;
      for(let i=p.net.received;i<remote.length;i++)assert(p.net.receive(i,remote[i]));
      p.net.confirm(p.world);assert.deepEqual(state(p.world),state(w));
    }
  }
});
