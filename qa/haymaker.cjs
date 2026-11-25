const assert = require('node:assert/strict');
const {test} = require('node:test');
global.window = {};
require('../docs/engine.js');
require('../docs/online.js');
const {Battle, activeArmor, idleInput, seededRandom} = window.DogFight;
const seed = 42, dt = 1/60;

function stockInput(frame, answer, slot) {
  const disc = answer.startsWith('disc'), dir = slot ? -1 : 1;
  const stride = frame < (disc ? 36 : 35) ? dir : 0;
  const brisket = {...idleInput, x:stride, grabX:stride};
  const rival = {...idleInput, x:-stride, grabX:-stride};
  if (disc) {
    brisket.shield = frame >= 38 && frame < 66;
    brisket.smash = frame >= 80 && frame < 110;
    rival.special = frame === 43;
    rival.attack = answer === 'discAndJab' && frame === 115;
  } else {
    brisket.smash = frame >= 57 && frame < (answer === 'hold' ? 100 : 77);
    if (answer === 'heavy') rival.smash = frame >= 57 && frame < 80;
    else if (answer === 'grab') rival.grab = frame === 83;
    else rival.attack = frame === ({early:78,first:79,last:85}[answer] ?? 83);
  }
  return slot ? [rival,brisket] : [brisket,rival];
}

function snapshot(world) {
  return [world.hitStop, world.grapple?.grabId, world.projectiles.map(p=>[p.x,p.y,p.back]),
    world.dogs.map(f=>[f.x,f.y,f.vx,f.vy,f.face,f.stocks,f.damage,f.stun,f.ground,f.charge,
      f.attack?.moveId,f.attack?.time,!!activeArmor(f),!!f.attack?.armorSpent,f.grip?.phase,
      f.moveHistory.map(m=>[m.moveId,m.shieldOnly])])];
}

function stockExchange(answer, slot) {
  const foe = answer.startsWith('disc') ? 'clover' : 'pip';
  const config = {mode:'local',stage:'nightmail',fetch:true,p1:slot?foe:'brisket',p2:slot?'brisket':foe};
  const record = events => (kind,e) => {
    if (['hit','grabCatch','block','attackClash'].includes(kind))
      events.push([kind,e.moveId,e.f.index,!!e.armored,e.damage]);
  };
  const hits = [], ref = new Battle(config,record(hits),seededRandom(seed));
  const peers = [0,1].map(side=>{
    let world;
    const events = [], tape = [];
    const session = new window.DogOnline.OnlineSession({start(options,random) {
      world = new Battle(options,record(events),random);
    }});
    session.side = side;
    session.send = packet => { if (packet[0] === 'input') tape[packet[2]] = packet[3]; };
    session.beginRound(['start',1,config.p1,config.p2,config.stage,seed]);
    return {net:session.match,world,events,tape};
  });
  const history = [snapshot(ref)];
  let wrongPrediction = false;
  for (let frame=0; frame<145; frame++) {
    const inputs = stockInput(frame,answer,slot);
    ref.step(dt,...inputs); history.push(snapshot(ref));
    for (const [side,p] of peers.entries()) {
      const lag = side ? 7 : 5, remote = peers[1-side];
      if (frame >= lag) assert(p.net.receive(frame-lag,remote.tape[frame-lag]));
      p.net.tick(()=>inputs[side],p.world);
      assert.deepEqual(snapshot(p.net.confirmedWorld),history[p.net.confirmed]);
      if (p.world.dogs[slot].damage !== ref.dogs[slot].damage || !!p.world.grapple !== !!ref.grapple)
        wrongPrediction = true;
    }
  }
  for (const [side,p] of peers.entries()) {
    const remote = peers[1-side].tape;
    for (let frame=p.net.received; frame<remote.length; frame++) assert(p.net.receive(frame,remote[frame]));
    p.net.confirm(p.world);
    assert.deepEqual(snapshot(p.world),snapshot(ref));
    assert.deepEqual(p.events,hits);
  }
  return {hits,wrongPrediction};
}

test('a three-stock Haymaker absorbs one light hit, with the same release window in both rollback slots',()=>{
  for (const slot of [0,1]) {
    for (const answer of ['hold','early','first','last','jab','heavy','grab','disc','discAndJab']) {
      const {hits,wrongPrediction} = stockExchange(answer,slot);
      const summaries = hits.map(([type,move,,armored])=>[type,move,armored]);
      const disc = ['block','cloverRound',false], punch = ['hit','brisketHaymaker',false];
      const expected = {
        hold:[['hit','pipJab',false]], early:[['hit','pipJab',false]],
        heavy:[['hit','pipBoltKick',false]], grab:[['grabCatch','pipCollarTag',false]],
        disc:[disc,['hit','cloverRound',true],punch],
        discAndJab:[disc,['hit','cloverTap',true],['hit','cloverRound',false]],
      }[answer] || [['hit','pipJab',true],punch];
      assert.deepEqual(summaries,expected,answer);
      if (['jab','grab'].includes(answer)) assert(wrongPrediction,answer);
      for (const [,move,f,armored,damage] of hits.filter(hit=>hit[3])) {
        assert.equal(f,slot);
        assert.equal(damage,move === 'cloverRound' ? 7 : 4);
        assert(armored);
      }
    }
  }
});

test('the limit uses incoming damage after staling, including at the percent cap',()=>{
  for (const [damage,repeats,absorbs] of [[8,0,true],[8.1,0,false],[9,0,false],[9,2,true]]) {
    const events=[];
    const w=new Battle({mode:'local',stage:'picnic',p1:'brisket',p2:'pip',fetch:false},
      (name,e)=>{if(name==='hit')events.push(e);},seededRandom(seed));
    const [brisket,pip]=w.dogs;
    w.step(dt,{...idleInput,smash:true},idleInput);
    for(let n=0;n<12&&!activeArmor(brisket);n++)w.step(dt,idleInput,idleInput);
    assert(activeArmor(brisket));
    brisket.damage=998;
    for(let n=0;n<repeats;n++)pip.moveHistory.push({moveId:'pipFlip',shieldOnly:false,power:1});
    w.hit(brisket,pip,damage,200,3,0,'aerial',-1,{x:brisket.x,y:brisket.y-35},
      window.DogFight.moves.pipFlip,'pipFlip',{});
    assert.equal(events.length,1);
    assert.equal(events[0].damage,1);
    assert.equal(brisket.damage,999);
    assert.equal(!!events[0].armored,absorbs);
    assert.equal(brisket.attack?.moveId==='brisketHaymaker',absorbs);
    assert.equal(pip.moveHistory.length,repeats+1);
  }
});
