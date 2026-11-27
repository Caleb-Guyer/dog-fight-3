const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/versus-rules.js');require('../docs/winner-stays.js');
const {Battle,FinishTape,idleInput,stockMinutes,stageForms,versusRules,seededRandom}=window.DogFight;
const {encode,decode}=window.VersusRulebook;
const config={mode:'local',stage:'picnic',p1:'pip',p2:'brisket',fetch:false};
const create=extra=>new Battle({...config,...extra},undefined,seededRandom(11));
const step=w=>w.step(1/60,idleInput,idleInput);
const {OpeningDuel}=window.VersusRulebook;
test('duel openings use solid ground across every stage and form, facing the rival with either seat cornered',()=>{
  for(const stage of Object.keys(window.DogFight.arenas))for(const form of Object.keys(stageForms)){
    const card={...config,stage,stageForm:form,handicap:[20,70]};
    const duel=new OpeningDuel(card,11);
    for(const position of ['center','left','right']){
      const w=create({...card,form,spawnDamage:card.handicap});
      duel.position=position;duel.place(w);
      const [a,b]=w.dogs,deck=w.terrain[a.ground],solid=w.terrain.filter(p=>!p.thin);
      assert.equal(a.ground,b.ground);assert(!deck.thin);
      assert.equal(a.y,deck.y);assert.equal(b.y,deck.y);assert.deepEqual([a.face,b.face],[1,-1]);
      assert.equal(b.x-a.x,148);
      if(position==='center')assert.equal((a.x+b.x)/2,(deck.x1+deck.x2)/2);
      if(position==='left')assert.equal(a.x,Math.min(...solid.map(p=>p.x1))+32);
      if(position==='right')assert.equal(b.x,Math.max(...solid.map(p=>p.x2))-32);
      step(w);assert.equal(duel.takePoint(w),false);
    }
    assert.deepEqual(duel.card,card);
  }
});
test('blocked jabs and empty grabs keep the duel live while a clean jab or pummel takes exactly one point',()=>{
  for(const action of ['hit','block','grab']){
    const w=create(),duel=new OpeningDuel(config,11);duel.place(w);w.dogs[1].x=w.dogs[0].x+55;
    for(let i=0;i<40;i++){
      w.step(1/60,{...idleInput,attack:action==='grab'?i===20:i===3,quickAttack:action!=='grab' && i===3,grab:action==='grab' && i===1},
        {...idleInput,shield:action==='block'});
      if(action==='grab' && i===18){assert(w.grapple);assert.equal(duel.point,null);}
      if(duel.takePoint(w)){assert.equal(duel.takePoint(w),false);break;}
    }
    assert.deepEqual(duel.score,[action==='block'?0:1,0]);
    if(action==='block'){assert.equal(w.matchCard.players[1].blocks,1);assert.equal(duel.point,null);}
    else assert.deepEqual([duel.point.move,duel.point.damage],action==='grab'?['Paw Drum',1]:['Quick Paw',4]);
  }
});
test('double falls draw the point and three individual falls finish the duel without changing the selected rules',()=>{
  const card={...config,minutes:3,stageForm:'trio',bestOfThree:true,lives:5,fetch:true};
  const duel=new OpeningDuel(card,19);
  for(let i=0;i<4;i++){
    const w=create();duel.place(w);
    w.dogs[0].x=-2000;if(i===0)w.dogs[1].x=4000;
    step(w);assert(duel.takePoint(w));
    assert.equal(duel.point.winner,i===0?null:1);assert.deepEqual(duel.score,[0,i]);
    if(i)assert(duel.point.fall);
  }
  assert.equal(duel.takePoint(create()),false);assert.deepEqual(duel.card,card);
});
test('a seeded solo rival can win a reproducible opening against an idle player',()=>{
  const run=()=>{
    const card={...config,mode:'solo',cpuLevel:'rival'},duel=new OpeningDuel(card,25);
    const w=new Battle(card,undefined,seededRandom(duel.seed));duel.place(w);
    for(let i=0;i<600 && !duel.point;i++){w.step(1/60,idleInput);duel.takePoint(w);}
    assert.equal(duel.point?.winner,1);return duel.point;
  };
  assert.deepEqual(run(),run());
});
function recordOpening(mode,commands,mark){
  const card={...config,mode,cpuLevel:'rival'};
  const world=new Battle(card,undefined,seededRandom(25)),tape=new FinishTape(),duel=new OpeningDuel(card,25);
  duel.place(world);mark?.(world);
  for(let frame=0;frame<700 && !duel.point;frame++){
    const pair=commands(frame);
    tape.record(world,...pair);world.step(1/60,...pair);duel.takePoint(world);
  }
  assert(duel.point);
  return {world,tape,duel};
}
function answer({duel,tape},input){
  const start=Math.max(0,tape.length-45);
  const reply=duel.reply(tape,start,duel.responder,()=>{});
  for(let i=0;i<100 && !reply.outcome;i++)reply.step(input(i));
  assert(reply.outcome);return reply;
}
test('replaying a late opening and answering it with a shield or jab leaves the recorded contact and score intact',()=>{
  const round=recordOpening('local',i=>[{...idleInput,attack:i===410,quickAttack:i===410},idleInput],
    w=>{w.dogs[1].x=w.dogs[0].x+48;});
  const {tape,duel,world}=round;
  assert.equal(tape.length,240);assert(tape.blocks.length<=3);assert.equal(tape.reel,undefined);assert.equal(duel.responder,1);
  const original=structuredClone(world.matchCard);
  const last=tape.playback(tape.length-1);assert.equal(duel.opening(last.battle),null);
  last.step();assert.deepEqual(last.battle.matchCard,original);
  for(const [name,input] of [
    ['Caught by Quick Paw',()=>idleInput],
    ['Blocked the opening',()=>({...idleInput,shield:true})],
    ['Won the exchange',i=>({...idleInput,quickAttack:i===2,attack:i===2})]
  ])assert.equal(answer(round,input).outcome,name);
  assert.deepEqual(world.matchCard,original);assert.deepEqual(duel.score,[1,0]);
  assert.deepEqual(tape.playback(tape.length).battle.matchCard,original);
});
test('a solo defender can evade the CPU opening and a falling player can take a different route',()=>{
  const solo=recordOpening('solo',()=>[idleInput,idleInput]);
  const fall=recordOpening('local',()=>[{...idleInput,x:-1},idleInput]);
  for(const round of [solo,fall])assert.equal(round.duel.responder,0);
  assert.equal(answer(solo,()=>idleInput).outcome,'Caught by Yard Buster');
  assert.equal(answer(solo,()=>({...idleInput,x:-1})).outcome,'Stayed clear');
  assert.equal(answer(fall,()=>({...idleInput,x:-1})).outcome,'Lost a stock');
  assert.equal(answer(fall,()=>idleInput).outcome,'Stayed clear');
  assert.deepEqual(solo.duel.score,[0,1]);assert.deepEqual(fall.duel.score,[0,1]);
});
test('matchup links replay both coats, arena form, opponent and starting rules in a fresh battle',()=>{
  const {decodeMatchup,encodeMatchup}=window.VersusRulebook;
  const {fighters,coatFor,arenas,cpuLevels}=window.DogFight;
  for(const p1 of Object.keys(fighters))for(const p2 of Object.keys(fighters))
    for(const mode of ['local','solo'])for(const stage of Object.keys(arenas))for(const stageForm of Object.keys(stageForms)){
      const coats=[2,coatFor(1,p1,p2,[2,2])], timed=stageForm==='trio';
      const card={mode,p1,p2,coats,stage,...(mode==='solo'?{cpuLevel:Object.keys(cpuLevels).at(-1)}:{}),
        ...versusRules({timed,lives:2,minutes:3,bestOfThree:true,stageForm,fetch:false,handicap:[70,20]})};
      const decoded=decodeMatchup(encodeMatchup(card));
      assert.deepEqual(decoded,card);
      const battle=create({...decoded,spawnDamage:decoded.handicap,stockCount:decoded.lives,timeBattle:decoded.timed,form:decoded.stageForm});
      assert.deepEqual(battle.dogs.map((f,i)=>[f.kind,battle.coatFor(i),f.damage]),[[p1,coats[0],70],[p2,coats[1],20]]);
      assert.equal(battle.clockFrames,10800);assert.equal(battle.form,stageForm);assert.equal(battle.fetch,false);
      assert.equal(!!battle.matchCard.points,timed);
    }
});
test('invalid matchup links cannot partially apply settings and a mirror gets distinct coats',()=>{
  const {decodeMatchup}=window.VersusRulebook;
  const hash='#solo/matchup/pip/0/pip/0/bandstand/rival/stock/5/0/single/original/on';
  assert.deepEqual(decodeMatchup(hash).coats,[0,1]);
  for(const h of [null,{},'',hash.slice(0,-2),hash+'/0-900',hash+'/0-10/more',hash.replace('rival','p2'),
    hash.replace('solo','local'),hash.replace('pip','constructor'),hash.replace('bandstand','toString'),
    hash.replace('/0/pip','/00/pip'),hash.replace('single','bracket'),hash.replace('stock','time'),hash.replace('solo','online')])
    assert.equal(decodeMatchup(h),null);
});
test('shared links retain every playable rule; invalid or incomplete links cannot import a partial setup',()=>{
  for(const timed of [true,false])for(const minutes of stockMinutes.filter(n=>n || !timed))
    for(const lives of [1,2,3,4,5])for(const stageForm of Object.keys(stageForms))
      for(const fetch of [false,true])for(const bestOfThree of [false,true])for(const mode of ['solo','local']){
        const rules={timed,minutes,lives,stageForm,fetch,bestOfThree};
        assert.deepEqual(decode(encode(mode,rules)),rules);
      }
  for(const suffix of ['stock/6/1/single/trio/on','time/2/0/single/flat/off','stock/1/1/typo/trio/on','stock/5/7/single/fake/on','stock/2/7']){
    assert.equal(decode('#local/rules/'+suffix),null);
  }
});
test('custom stocks carry through respawns, the finish replay and a clock tie',()=>{
  for(const n of [1,2,3,4,5]){
    const w=create({stockCount:n});
    for(let i=n;i>1;i--){w.knockouts([w.dogs[0]]);assert.equal(w.dogs[0].stocks,i-1);assert.equal(w.end,null);}
    w.dogs[0].stockLift=null;w.dogs[0].respawning=0;w.dogs[0].x=-2000;
    const tape=new FinishTape();tape.record(w,idleInput,idleInput);step(w);
    const replay=tape.playback(0);replay.step();assert.equal(replay.battle.end,1);
    assert.deepEqual(replay.battle.matchCard,w.matchCard);
    assert.deepEqual(w.matchCard.losses.map(l=>l.remaining),Array.from({length:n},(_,i)=>n-i-1));
    const tie=create({stockCount:n,minutes:1});tie.clockFrames=1;step(tie);
    assert(tie.suddenDeath);assert.deepEqual(tie.dogs.map(f=>f.stocks),[1,1]);
  }
});
test('tutorials, team relays, Time Battle and dedicated three-stock setups keep their own rules',()=>{
  const three=extra=>assert.deepEqual(create(extra).dogs.map(f=>f.stocks),[3,3]);
  for(const stockCount of [-1,0,6,2.5,'2',undefined])three({stockCount});
  for(const extra of [{schoolFinal:true},{lesson:0},{timeBattle:true},{mode:'training'},
    {relayTeams:[['pip','noodle','clover'],['brisket','noodle','clover']]}])three({stockCount:5,...extra});
  three({lives:5});assert.deepEqual(create({stockCount:5,lastStockStart:true}).dogs.map(f=>f.stocks),[1,1]);
});
test('a rotation remembers its opening rules across a tab reload and accepts older lineups',()=>{
  const {Lineup}=window.WinnerStays;
  let stored;const storage={setItem:(k,v)=>{stored=v;},getItem:()=>stored};
  const line=new Lineup({...config,stockCount:5,minutes:0,bestOfThree:true,form:'flat'});
  line.save(storage);assert.deepEqual(Lineup.read(storage).rules,versusRules({...config,lives:5,minutes:0,bestOfThree:true,stageForm:'flat'}));
  const old=JSON.parse(stored);delete old.rules;stored=JSON.stringify(old);
  assert.equal(Lineup.read(storage).players.length,3);
});
test('starting damage round-trips independently per seat through local links and saved rules',()=>{
  const base=versusRules(config);
  for(const mode of ['local','solo'])for(let a=0;a<=150;a+=10)for(let b=0;b<=150;b+=10){
    const rules=versusRules({...base,handicap:[a,b]});
    assert.deepEqual(decode(encode(mode,rules)),rules);
    assert.deepEqual(rules.handicap,a || b?[a,b]:undefined);
  }
  const link=encode('local',{...base,handicap:[10,90]});
  for(const tail of ['0','0-05','-1-0','160-0','2-10','0-0-0','/'])
    assert.equal(decode(link.replace('10-90',tail)),null);
  assert.equal(decode(link.replace('#local','#online')),null);
  assert.deepEqual(decode(encode('online',{...base,handicap:[10,90]})),base);
});
test('stock and timed handicaps survive a KO and its replay without inflating damage dealt',()=>{
  for(const mode of ['solo','local'])for(const timeBattle of [false,true]){
    const pair=[20,80],w=create({mode,spawnDamage:pair,timeBattle});
    pair[1]=150;
    assert.deepEqual(w.dogs.map(f=>f.damage),[20,80]);
    const tape=new FinishTape();
    w.dogs[1].damage=122;w.dogs[1].x=-2000;
    tape.record(w,idleInput,idleInput);step(w);
    assert.deepEqual(w.dogs.map(f=>f.damage),[20,80]);
    assert(w.dogs[1].stockLift);
    assert.deepEqual(w.matchCard.handicap,[20,80]);
    assert.deepEqual(w.matchCard.players.map(f=>f.damage),[0,0]);
    assert.equal(w.matchCard.losses[0].damage,122);
    const replay=tape.playback(0);replay.step();
    assert.deepEqual(replay.battle.dogs,w.dogs);
    assert.deepEqual(replay.battle.matchCard,w.matchCard);
    w.startSuddenDeath('double');
    assert.deepEqual(w.dogs.map(f=>f.damage),[300,300]);
  }
});
test('handicap preferences only take effect in an ordinary versus match launched with them',()=>{
  const config={spawnDamage:[90,150]};
  for(const extra of [{handicap:[90,150]}, {...config,schoolFinal:true},{...config,lesson:0},
    {...config,mode:'training'},{...config,relayTeams:[['pip','noodle','clover'],['brisket','noodle','clover']]},
    ...[[10],[20,200],['20',60],[0,1]].map(spawnDamage=>({spawnDamage}))]){
    const battle=create(extra);
    assert.deepEqual(battle.dogs.map(f=>f.damage),[0,0]);
    assert.equal(battle.matchCard?.handicap,undefined);
  }
  assert.deepEqual(create({...config,lastStockStart:true}).dogs.map(f=>f.damage),[125,125]);
});
