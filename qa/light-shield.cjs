const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
require('../docs/combo-lab.js');
const {Battle,FinishTape,fighters,idleInput,seededRandom,shieldBubble,shieldContact}=window.DogFight;
const cfg={mode:'local',stage:'picnic',p1:'pip',p2:'brisket',fetch:false};
const tick=1/60;
const guard=light=>({...idleInput,shield:true,...(light?{lightShield:true}:{})});

test('all four dogs can compare two actual Haymaker blocks from the same mark on either ledge',()=>{
  for(const kind of Object.keys(fighters))for(const dir of [-1,1]){
    const world=new Battle({...cfg,mode:'training',p1:kind});
    for(const light of [false,true]){
      world.resetEdgePractice('light',dir,false);
      for(let i=0;i<240 && !world.edgePractice.outcome;i++)world.step(tick,guard(light));
      assert.equal(world.edgePractice.outcome,light?'caughtLip':'heldCorner',kind+' '+dir);
      assert.equal(world.dogs[0].damage,0);
    }
    const {Firm,Light}=world.edgePractice.samples;
    assert.equal(Light.stunFrames-Firm.stunFrames,3);
    assert(Light.energy>Firm.energy && Light.slide>Firm.slide);
    world.resetEdgePractice('light',-dir,false);
    assert.deepEqual(world.edgePractice.samples,{});
  }
});

test('a worn light shield catches a rim poke, switches to firm without a parry, and releases normally',()=>{
  const w=new Battle(cfg),f=w.dogs[0];
  f.shieldHP=.35;
  w.step(tick,guard(false),idleInput);
  const firm=shieldBubble(f),poke={x:firm.x+firm.r+2,y:firm.y,rx:1,ry:1};
  assert.equal(shieldContact(f,poke),null);
  w.step(tick,guard(true),idleInput);
  assert(shieldContact(f,poke));assert.equal(f.shieldDrop,0);
  w.step(tick,guard(false),idleInput);
  assert(f.shield && !f.lightShield && !f.shieldDrop);assert.equal(shieldContact(f,poke),null);
  w.step(tick,guard(true),idleInput);w.step(tick,idleInput,idleInput);
  assert(!f.lightShield && !f.shield && f.parryEligible && f.shieldDrop>0);
});

test('input changes survive film playback and shared drill recordings, while firm-only shares retain their original format',()=>{
  const world=new Battle(cfg,undefined,seededRandom(42)),tape=new FinishTape(true);
  const sequence=[guard(false),guard(true),guard(true),guard(false),idleInput];
  for(const frame of sequence){tape.record(world,frame,idleInput);world.step(tick,frame,idleInput);}
  assert.equal(tape.fullMatch().parts[0].runs.length,4);
  const film=tape.playback();
  for(const frame of sequence){assert(film.step());assert.equal(!!film.battle.dogs[0].lightShield,!!frame.lightShield);}
  assert.equal(film.battle.dogs[0].shieldHP,world.dogs[0].shieldHP);
  const lab=window.ComboLab,card=lab.houseTape();
  card.takes=[sequence,null];
  const code=lab.encode(card),raw=JSON.parse(Buffer.from(code,'base64url'));
  assert.equal(raw[0],6);
  assert.deepEqual(lab.decode(code).takes[0].map(f=>!!f.lightShield),sequence.map(f=>!!f.lightShield));
  assert.equal(lab.decode(Buffer.from(JSON.stringify(raw.slice(1))).toString('base64url')),null);
  card.takes=[[guard(false)],null];
  assert.equal(JSON.parse(Buffer.from(lab.encode(card),'base64url'))[0],raw[1]);
});

test('delayed shield changes reconcile on either seat and peers without the extension keep firm guard',()=>{
  const pose=w=>w.dogs.map(f=>[f.x,f.shield,!!f.lightShield,f.shieldHP]);
  for(const enabled of [true,false])for(const slot of [0,1]){
    const ref=new Battle(cfg,undefined,seededRandom(7));
    const peers=[0,1].map(side=>{
      const sent=[];let world;
      const s=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      s.lightGuard=enabled;s.side=side;s.send=p=>{if(p[0]==='input')sent[p[2]]=p[3];};
      s.beginRound(['start',1,cfg.p1,cfg.p2,cfg.stage,7]);
      return {world,net:s.match,sent};
    });
    let corrected=false;
    for(let n=0;n<27;n++){
      const light=n>=6 && n<15,pair=[idleInput,idleInput];pair[slot]=guard(light);
      const expected=[...pair];expected[slot]=guard(light && enabled);ref.step(tick,...expected);
      for(const [side,p] of peers.entries()){
        if(n>=4)assert(p.net.receive(n-4,peers[1-side].sent[n-4]));
        p.net.tick(()=>pair[side],p.world);
        if(n===6 && side===slot)assert.equal(!!(p.sent[n][7]&1024),enabled);
        if(n===6 && side!==slot)corrected=!p.world.dogs[slot].lightShield;
        if(n===10 && side!==slot)assert.equal(!!p.world.dogs[slot].lightShield,enabled);
      }
    }
    assert(corrected);
    for(const [side,p] of peers.entries()){
      const other=peers[1-side].sent;
      for(let i=p.net.received;i<other.length;i++)assert(p.net.receive(i,other[i]));
      p.net.confirm(p.world);
      assert.deepEqual(pose(p.net.confirmedWorld),pose(ref));assert.deepEqual(pose(p.world),pose(ref));
      assert(!p.net.receive(p.net.received,[0,0,0,0,0,0,0,16,1024]));
      if(!enabled)assert(!p.net.receive(p.net.received,[0,0,0,0,0,0,0,1040,0]));
    }
  }
});
