const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');
require('../docs/online.js');
require('../docs/match-review.js');
const {Battle,FinishTape,seededRandom,idleInput}=window.DogFight;
const {MatchFilm,pack,resumeTape}=window.MatchReview;
const tick=1/60;
const cfg={mode:'local',stage:'canal',form:'counterweights',fetch:true,p1:'pip',p2:'noodle'};
const snapshot=({emit,random,...state})=>structuredClone({state,seed:random.state});
test('a full match finds four defenses through checkpoint counters, including hits far outside its finish',async()=>{
  const {film,card}=await window.MatchReview.sampleFight(),untouched=structuredClone(film.data);
  assert.equal(await film.defenses(card,()=>false),null);
  const marks=await film.defenses(card);
  assert.deepEqual(marks.map(m=>[m.frame,m.type,m.slot]),[[98,'knockdown',0],[616,'tech',0],[821,'parry',0],[1051,'break',0]]);
  assert.equal(await film.defenses(card),marks);
  assert.deepEqual(film.data,untouched);
  const empty=rounds('local',1100),quiet=new MatchFilm(empty.t.fullMatch());
  quiet.playback=()=>assert.fail('quiet checkpoints should not run simulation');
  assert.deepEqual(await quiet.defenses(empty.w.matchCard),[]);
  for(const delay of [261,262,263]){
    const w=new Battle({...cfg,stage:'nightmail',p2:'brisket',form:'original',fetch:false},undefined,seededRandom(27)),t=new FinishTape(true);
    w.resetTraining();w.dogs[0].damage=35;
    for(let n=0;n<485;n++){
      const p2={...idleInput,grab:n===delay,y:w.grapple?.phase==='hold'?-1:0};
      t.record(w,idleInput,p2);w.step(tick,idleInput,p2);
    }
    const indexed=await new MatchFilm(t.fullMatch()).defenses(w.matchCard);
    assert.deepEqual(indexed.map(m=>m.frame),[delay+98]);
  }
});
test('parrying the recorded shield-breaking hit prevents both the break and incoming damage',async()=>{
  const {film,card}=await window.MatchReview.sampleFight(),mark=(await film.defenses(card)).at(-1);
  const {tape,result}=film.exchange(mark.frame-24,114);
  const original=tape.playback().battle,review={slot:0,moment:{...mark,title:'Shield break'},baseline:original.matchCard.players,result};
  for(const option of ['hold','release','stand']){
    const p=tape.playback(0,()=>{},0);
    while(p.frame<p.length)p.step({...idleInput,shield:option==='hold' || option==='release' && p.frame<22});
    const report=window.MatchReview.defenseReport(review,p.battle);
    const [hero,foe]=p.battle.matchCard.players,[a,b]=original.matchCard.players;
    assert.equal(hero.shieldBreaks-a.shieldBreaks,Number(option==='hold'));
    assert.equal(hero.parries-a.parries,Number(option==='release'));
    assert.equal(foe.damage-b.damage>0,option==='stand');
    assert.equal(report.title,option==='hold'?'Shield broke again':'Shield break avoided');
    assert.match(report.html,/Damage taken/);
  }
  assert.deepEqual(film.playback(film.length).battle.matchCard,card);
});
test('late packets give both players the same P2 knockdown and original landing on the confirmed timeline',async()=>{
  const peers=[0,1].map(side=>{
    const tape=new FinishTape(true),packets=[];let world;
    const s=new window.DogOnline.OnlineSession({start(c,r){world=new Battle(c,undefined,r);}});
    s.side=side;s.send=p=>{if(p[0]==='input')packets[p[2]]=p[3];};
    s.beginRound(['start',1,'brisket','pip','nightmail',27]);
    for(const w of [world,s.match.confirmedWorld]){w.resetTraining();w.dogs[1].damage=35;}
    s.match.onConfirmedInput=(b,a,c)=>tape.record(b,a,c);
    return {tape,net:s.match,world,packets};
  });
  for(let n=0;n<260;n++)for(const [slot,p] of peers.entries()){
    if(n>=7)p.net.receive(n-7,peers[1-slot].packets[n-7]);
    p.net.tick(()=>slot?idleInput:{...idleInput,grab:n===0,y:n>7 && n<40?-1:0},p.world);
  }
  const marks=[];
  for(const [slot,p] of peers.entries()){
    for(let n=p.net.received;n<peers[1-slot].packets.length;n++)p.net.receive(n,peers[1-slot].packets[n]);
    p.net.confirm(p.world);const film=new MatchFilm(p.tape.fullMatch());
    const found=await film.defenses(p.net.confirmedWorld.matchCard);marks.push(found);
    assert.equal(found.length,1);assert.equal(found[0].slot,1);assert.equal(found[0].type,'knockdown');
    const {tape}=film.exchange(found[0].frame-30,60),run=tape.playback(0,()=>{},1);
    while(run.frame<run.length)run.step({...idleInput,shield:run.frame===24});
    assert.equal(run.battle.matchCard.players[1].techs,1);
  }
  assert.deepEqual(marks[0],marks[1]);
});
function rounds(mode,count){
  const w=new Battle({...cfg,mode},undefined,seededRandom(89)),t=new FinishTape(true),states=new Map();
  const frames=new Set([0,1,119,120,239,240,357,359,360,361,615,719,720,721,900,count]);
  for(let i=0;i<=count;i++){
    if(frames.has(i))states.set(i,snapshot(w));
    if(i===count)break;
    const input=i<250 || i%173<12?{...idleInput,x:i<250?-1:.57,attack:i===58,tapped:{attack:i===58}}:idleInput;
    const rival=i%109<8?{...idleInput,x:-.3,jump:i%109===1}:idleInput;
    t.record(w,input,rival);w.step(tick,input,rival);
  }
  t.captureKnockouts(w);return {w,t,states};
}
for(const mode of ['local','solo'])test(mode+' frame zero, block boundaries and sequential play reproduce the complete fight',()=>{
  const {w,t,states}=rounds(mode,1037);
  const replay=new MatchFilm(structuredClone(t.fullMatch())),player=replay.playback();
  for(const [frame,state] of states){
    while(player.frame<frame)assert(player.step());
    assert.deepEqual(snapshot(player.battle),state);
    assert.deepEqual(snapshot(replay.playback(frame).battle),state);
  }
  assert.equal(player.step(),false);assert.equal(t.length,240);
  assert.deepEqual(replay.data.falls.map(f=>f.first),t.knockouts.map(c=>c.first));
  assert(w.matchCard.losses.length>0);
  for(const f of replay.data.falls){
    const before=replay.playback(f.at-1),after=replay.playback(f.at);
    assert.equal(before.battle.matchCard.losses.length,f.first);
    assert.deepEqual(after.battle.matchCard.losses.slice(f.first).map(l=>l.slot),f.slots);
  }
});
test('taking over the opening for four seconds leaves the live score and recording intact',()=>{
  const {t,w}=rounds('local',900),replay=new MatchFilm(t.fullMatch()),before=snapshot(w);
  const {tape,result}=replay.exchange(0),fork=tape.playback(0,undefined,0);
  while(fork.step(idleInput)){}
  assert.equal(fork.frame,240);
  assert(fork.battle.dogs[0].stocks>result.dogs[0].stocks);
  assert.deepEqual(snapshot(replay.playback(240).battle),snapshot(result));
  assert.deepEqual(snapshot(w),before);
  for(const start of [119,720,899]){
    const cut=replay.exchange(start);
    assert.equal(cut.tape.length,Math.min(240,900-start));
    assert.deepEqual(snapshot(cut.result),snapshot(replay.playback(start+cut.tape.length).battle));
  }
});
test('suspending before or after a block boundary preserves early inputs and knockout timestamps',()=>{
  for(const n of [1,120,360,479,903]){
    const {t,w}=rounds('solo',n);
    const restored=resumeTape(structuredClone(pack(t)),w.matchCard.losses,t.returning?t.knockouts.find(c=>c.returnTape===t.returning).first:null);
    for(let i=0;i<250;i++){restored.record(w,idleInput,idleInput);t.record(w,idleInput,idleInput);w.step(tick,idleInput,idleInput);}
    assert.deepEqual(restored.fullMatch(),t.fullMatch());
  }
});
test('continuous holds are compact, and a one-frame tap or fractional stick movement survives compression',()=>{
  const w=new Battle(cfg,undefined,seededRandom(9)),t=new FinishTape(true);
  for(let i=0;i<720;i++){
    const a={...idleInput,x:i===395?.000005:0,tapped:{shield:i===395}};
    t.record(w,a,idleInput);w.step(tick,a,idleInput);
  }
  const data=t.fullMatch();
  assert.equal(data.parts.reduce((n,p)=>n+p.runs.length,0),8);
  assert.equal(data.parts.filter(p=>p.state).length,2);
  assert.equal(data.parts[3].runs[1][1].x,.000005);
  assert.equal(data.parts[3].runs[1][1].tapped.shield,true);
  const legacy=pack(t);delete legacy.film;delete legacy.catalog.whole;
  assert.equal(resumeTape(legacy,w.matchCard.losses).fullMatch(),undefined);
  const damaged=pack(t);damaged.film.parts[0]={runs:[]};
  assert.throws(()=>new MatchFilm(damaged.film));assert.equal(resumeTape(damaged,w.matchCard.losses).length,240);
});
test('both rollback peers save the same confirmed fight from GO despite late remote inputs',()=>{
  const send=[[],[]],worlds=[],records=[new FinishTape(true),new FinishTape(true)];
  const peers=records.map((t,i)=>{
    const s=new window.DogOnline.OnlineSession({start(cfg,rng){worlds[i]=new Battle(cfg,undefined,rng);}});
    s.side=i;s.send=p=>{if(p[0]==='input')send[1-i].push(p);};s.beginRound(['start',1,'pip','noodle','picnic',42]);
    s.match.onConfirmedInput=(b,a,c)=>t.record(b,a,c);return s.match;
  });
  const deliver=i=>{for(const p of send[i].splice(0))assert(peers[i].receive(p[2],p[3]));};
  for(let f=0;f<800;f++){
    if(f%6===0){deliver(0);deliver(1);}
    for(const [i,peer] of peers.entries())peer.tick(()=>({...idleInput,x:i===0 && f<155?-1:0,attack:f%74===11}),worlds[i]);
  }
  const movies=peers.map((p,i)=>{
    deliver(i);p.confirm(worlds[i]);records[i].captureKnockouts(p.confirmedWorld);
    return new MatchFilm(records[i].fullMatch());
  });
  assert.equal(movies[0].length,movies[1].length);assert(movies[0].length>720);
  for(const f of [0,214,500,720,movies[0].length]){
    assert.deepEqual(snapshot(movies[0].playback(f).battle),snapshot(movies[1].playback(f).battle));
  }
  assert.deepEqual(snapshot(movies[0].playback(movies[0].length).battle),snapshot(peers[0].confirmedWorld));
});
