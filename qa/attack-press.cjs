const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, fighters, idleInput, moves, seededRandom} = window.DogFight;
const tick = 1 / 60, cfg = {mode:'local',p1:'pip',p2:'brisket',stage:'picnic',fetch:false};
const input = changes => ({...idleInput,...changes});
const act = (world, changes) => world.step(tick,input(changes),idleInput);

test('each dog commits its jab and aimed tilts on the press, with the normal startup and one swing per hold', () => {
  for (const kind of Object.keys(fighters)) for (const slot of [0,1]) for (const [side,aim] of [
    ['jab',{}],['forward',{x:-1}],['up',{y:-1}],['down',{y:1}],['forward',{x:.5,grabX:1,y:-1}]
  ]) {
    const w=new Battle({...cfg,p1:kind,p2:kind}), f=w.dogs[slot];
    const id=side==='jab'?f.kit.ground[0]:f.kit.tilts[side];
    const press=input({...aim,attack:true,quickAttack:true});
    w.step(tick,slot?idleInput:press,slot?press:idleInput);
    assert.equal(f.attack?.moveId,id);
    assert.equal(f.attack.time,tick);
    assert.equal(f.attack.start,moves[id].start);
    if(aim.grabX)assert.equal(f.attack.tiltAngle,-1);
    const original=f.attack;
    for(let n=0;n<80;n++) {
      const held=input({x:1,attack:true,quickAttack:true});
      w.step(tick,slot?idleInput:held,slot?held:idleInput);
      assert(!f.attack || f.attack===original);
      assert(!f.smashCharge);
    }
  }
});
test('releasing, holding, buffering through landing recovery and using the dedicated smash remain distinct', () => {
  for(const held of [1,4,8,16,30]) for(const quick of [true,false]) {
    let frame=0,hit=0;
    const w=new Battle(cfg,n=>{if(n==='hit'&&!hit)hit=frame;});
    const [f,g]=w.dogs; f.x=580;g.x=637;
    for(frame=1;frame<=42;frame++) act(w,{attack:frame<=held,quickAttack:quick});
    if(quick || held<13) {
      assert.equal(f.lastMove,'Quick Paw');
      assert.equal(hit,quick?3:Math.max(held+1,3)); assert.equal(g.damage,4);
    } else {assert.equal(f.lastMove,'Bolt Kick');assert(g.damage>12);}
  }
  for(const keep of [false,true]){
    const w=new Battle(cfg), f=w.dogs[0];f.landingLag=4*tick;
    act(w,{y:1,attack:true,quickAttack:true});
    assert(!f.attack && f.command);
    for(let n=0;n<8&&!f.attack;n++)act(w,{x:-1,attack:keep,quickAttack:true});
    assert.equal(f.attack?.moveId,f.kit.tilts.down);assert.equal(f.attack.time,tick);
  }
  const w=new Battle(cfg), f=w.dogs[0];
  for(let n=0;n<35;n++)act(w,{quickAttack:true,smash:true,smashY:-1});
  assert.equal(f.smashCharge?.side,'up');act(w,{quickAttack:true});
  assert.equal(f.attack?.moveId,f.kit.smashes.up);assert(f.lastSmashPower>.5);
});
test('the live Rival opening gives Pip a clean intercept and rewards tap timing in both control styles', () => {
  for(const [quick,held,pip,clover] of [[true,30,0,5],[false,30,7.7,0],[false,1,0,5]]) {
    const w=new Battle({...cfg,mode:'solo',p2:'clover',cpuLevel:'rival'},undefined,seededRandom(7));
    for(let i=0;i<49;i++)act(w);
    for(let i=0;i<21;i++)act(w,{x:1,attack:i<held,quickAttack:quick});
    assert.deepEqual(w.dogs.map(f=>Math.round(f.damage*10)/10),[pip,clover]);
    assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
  }
});
test('a grab, a dash attack, a short-hop aerial and an attack cancel keep their input priorities', () => {
  const w=new Battle(cfg), f=w.dogs[0];
  act(w,{attack:true,x:1,quickAttack:true});assert.equal(f.attack?.tiltSide,'forward');
  act(w,{jump:true,x:-1,quickAttack:true});
  for(let n=0;n<4 && !f.attack?.airSide;n++)act(w,{});
  assert(f.attack?.fromWindup);
  for(const [press,expected] of [[{attack:true,jump:true},'air'],[{attack:true,grab:true},'grab'],[{attack:true},'dash']]) {
    const match=new Battle(cfg), dog=match.dogs[0];
    if(expected==='dash')for(let n=0;n<6;n++)act(match,{x:1});
    act(match,{...press,x:expected==='dash'?1:0,quickAttack:true});
    for(let n=0;n<3 && !dog.attack;n++)act(match,{});
    if(expected==='air')assert.equal(dog.attack?.airSide,'neutral');
    if(expected==='grab')assert(dog.attack?.grabAttempt);
    if(expected==='dash')assert.equal(dog.attack?.moveId,dog.kit.dashAttack);
  }
});
test('rollback reproduces a held first-frame tilt and a held smash with opposite player settings on either peer', () => {
  const sample=w=>w.dogs.map(f=>[f.x,f.y,f.face,f.vx,f.damage,f.attack?.moveId,f.attack?.time,
    f.smashCharge?.moveId,f.charge,f.command?.groundDirection,f.chainWindow]);
  for(const fastSlot of [0,1]){
    const ref=new Battle(cfg,undefined,seededRandom(7));
    const peers=[0,1].map(side=>{
      let world;const packets=[];
      const session=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
      session.side=side;session.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
      session.beginRound(['start',1,cfg.p1,cfg.p2,cfg.stage,7]);
      return {net:session.match,world,packets};
    });
    const history=[sample(ref)];let early=false,opponentSmash=false;
    for(let n=0;n<88;n++){
      const inputs=[0,1].map(s=>{
        if(n===75)return input({x:-1,grabX:-1,smashX:1,aimStick:s===fastSlot,tiltMode:s===fastSlot,
          smash:s!==fastSlot,tapped:s===fastSlot?{aimStick:true}:{smash:true}});
        return input({attack:n>=2 && n<27,y:n<42?-1:0,quickAttack:s===fastSlot});
      });
      ref.step(tick,...inputs);history.push(sample(ref));
      if(n===75){
        const tilt=ref.dogs[fastSlot], charge=ref.dogs[1-fastSlot];
        assert.equal(tilt.attack?.tiltSide,'forward');assert.equal(tilt.face,1);
        assert.equal(charge.smashCharge?.side,'side');assert.equal(charge.smashCharge.face,1);
      }
      for(const [s,p] of peers.entries()){
        if(n>=5)assert(p.net.receive(n-5,peers[1-s].packets[n-5]));
        p.net.tick(()=>inputs[s],p.world);
        if(n===2&&s===fastSlot)early=p.world.dogs[s].attack?.tiltSide==='up';
        if(n===24&&s!==fastSlot)opponentSmash=p.world.dogs[s].smashCharge?.side==='up';
        assert.deepEqual(sample(p.net.confirmedWorld),history[p.net.confirmed]);
      }
    }
    assert(early && opponentSmash);
    for(const [s,p] of peers.entries()){
      const remote=peers[1-s].packets;
      for(let n=p.net.received;n<remote.length;n++)assert(p.net.receive(n,remote[n]));
      p.net.confirm(p.world);
      assert.deepEqual(sample(p.world),sample(ref));assert.deepEqual(sample(p.net.confirmedWorld),sample(ref));
    }
  }
});
