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
