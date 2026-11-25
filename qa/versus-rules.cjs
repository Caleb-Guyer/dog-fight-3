const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/versus-rules.js');require('../docs/winner-stays.js');
const {Battle,FinishTape,idleInput,stockMinutes,stageForms,versusRules,seededRandom}=window.DogFight;
const {encode,decode}=window.VersusRulebook;
const config={mode:'local',stage:'picnic',p1:'pip',p2:'brisket',fetch:false};
const create=extra=>new Battle({...config,...extra},undefined,seededRandom(11));
const step=w=>w.step(1/60,idleInput,idleInput);
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
