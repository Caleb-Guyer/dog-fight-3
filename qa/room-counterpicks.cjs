const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {EventEmitter}=require('node:events');
global.window={};
require('../docs/engine.js');
const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(path.join(root,'docs/online.js'),'utf8');
const previous=process.env.DF3_LEGACY_ONLINE ? fs.readFileSync(process.env.DF3_LEGACY_ONLINE,'utf8') :
  execFileSync('git',['show','223d9cd62d50343de027055a5b01d164e574a840:docs/online.js'],{cwd:root,encoding:'utf8'});

// Deliver the released clients' real handshake and round messages in order. Timeouts
// are idle in this transport, which never registers a browser or a public room.
function room(sources,timeMinutes=0,rules=null,format='set') {
  const queue=[], links=[new EventEmitter(),new EventEmitter()];
  const peers=sources.map((source,side)=>{
    const context={window:{DogFight:window.DogFight},crypto,performance,setInterval:()=>0,setTimeout:()=>0,clearInterval(){},clearTimeout(){}};
    vm.runInNewContext(source,context);
    const s=new context.window.DogOnline.OnlineSession({start(){},status(){},votes(){},closed:message=>assert.fail(message)});
    Object.assign(s,{side,round:0,kind:'pip',coat:2,roomSet:side===0 && format==='set',
      action:format==='quick'?'quick':side?'join':'create',openingStage:'picnic',roomForm:format==='quick'?'original':'flat',peer:{disconnect(){}}});
    if(!side){
      s.timeMinutes=timeMinutes;
      if(rules)Object.assign(s,{roomRules:rules,roomForm:rules.stageForm,roomSet:rules.bestOfThree,timeMinutes:rules.timed?rules.minutes:0});
    }
    return s;
  });
  function deliver(){
    while(queue.length){const {side,msg}=queue.shift();links[1-side].emit('data',msg);}
  }
  for(const [side,link] of links.entries()){
    link.open=true;link.send=msg=>queue.push({side,msg:structuredClone(msg)});
    peers[side].useConnection(peers[side].peer,link,side===0);
  }
  links.forEach(link=>link.emit('open'));deliver();
  return {peers,deliver};
}
function lineup(s) {
  const w=s.match.confirmedWorld;
  return w.dogs.map((dog,i)=>[dog.kind,w.coatFor(i)]);
}
for(const format of ['single','quick'])test(format+' rematches accept both picks in either order and keep the resolved mirror coats',()=>{
  const {peers,deliver}=room([current,current],0,null,format), [host,guest]=peers;
  for(const peer of peers)assert.equal(peer.rematchPicks,true);
  guest.finish(0);deliver();guest.rematch(undefined,'noodle',3);deliver();
  assert(!host.theirVote);host.finish(0);deliver();assert(host.theirVote);assert(!host.myVote);
  host.rematch(undefined,'noodle',8);assert(!host.myVote);
  host.rematch(undefined,'noodle',3);deliver();
  for(const peer of peers){assert.equal(peer.round,2);assert.deepEqual(lineup(peer),[['noodle',3],['noodle',0]]);peer.finish(1);}
  deliver();host.rematch();deliver();guest.rematch(undefined,'clover',1);guest.rematch(undefined,'pip',2);deliver();
  for(const peer of peers){assert.equal(peer.round,3);assert.deepEqual(lineup(peer),[['noodle',3],['clover',1]]);peer.finish(0);}
  deliver();for(const peer of peers)peer.rematch();deliver();
  for(const peer of peers)assert.deepEqual(lineup(peer),[['noodle',3],['clover',1]]);
});
test('only a completed set opens both fighter picks and the new set resets its score',()=>{
  const {peers,deliver}=room([current,current]), [host,guest]=peers;
  for(const peer of peers)peer.finish(1);
  deliver();assert(!host.canRepick);guest.rematch(undefined,'pip',3);assert(!guest.myVote);
  host.rematch('laundry','brisket',1);guest.rematch();deliver();
  for(const peer of peers)peer.finish(1);
  deliver();assert(host.canRepick && guest.canRepick);
  host.rematch(undefined,'clover',0);guest.rematch(undefined,'noodle',2);deliver();
  for(const peer of peers){assert.deepEqual(lineup(peer),[['clover',0],['noodle',2]]);
    assert.deepEqual(peer.series.score,[0,0]);assert.equal(peer.stage,'picnic');}
});
test('both seats retain the plain rematch when the other client lacks fighter selection',()=>{
  for(const old of [0,1])for(const format of ['single','quick']){
    const sources=[current,current];sources[old]=previous;
    const {peers,deliver}=room(sources,0,null,format);
    const modern=peers[1-old];for(const peer of peers)peer.finish(0);deliver();
    assert(!modern.canRepick);modern.rematch(undefined,'clover',1);assert(!modern.myVote);
    for(const peer of peers)peer.rematch();deliver();for(const peer of peers)assert.equal(peer.round,2);
  }
});
test('changed-fighter votes bind only their own round and seat, with both ready before the next start',()=>{
  const {peers:[host,guest],deliver}=room([current,current],0,null,'quick');
  host.finish(0);guest.finish(0);deliver();guest.rematch(undefined,'brisket',1);
  guest.receive(['start',2,'pip','brisket','laundry',53]);assert.equal(guest.round,1);
  host.receive(['rematch',0,'clover',3]);host.receive(['rematch',1,'missing',1]);host.receive(['rematch',1,'noodle',4]);
  assert.equal(host.theirVote,false);deliver();
  host.receive(['rematch',1,'clover',3]);assert.equal(host.readyPicks[1].kind,'brisket');
  host.rematch();deliver();assert.deepEqual(lineup(guest),[['pip',2],['brisket',1]]);
});
test('a friend previews the exact opening rules before both rollback worlds start and keep them through a set',()=>{
  const rules={lives:2,minutes:0,fetch:false,timed:false,bestOfThree:true,stageForm:'flat'};
  const {peers:[host,guest],deliver}=room([current,current],0,rules);
  assert(!host.match && !guest.match);assert.equal(guest.phase,'review');assert.deepEqual({...guest.preview.rules},rules);
  const start=Array.from(host.offer);guest.receive(start);assert(!guest.match);
  host.receive(['room-ready',start[5]+1]);assert(!host.match);
  guest.acceptRules();guest.acceptRules();
  guest.receive([...start.slice(0,12),true]);assert(!guest.match);
  deliver();
  for(const peer of [host,guest]){
    const world=peer.match.confirmedWorld;
    assert.deepEqual(world.dogs.map(f=>f.stocks),[2,2]);assert.equal(world.clockFrames,null);
    assert.equal(world.fetch,false);assert.equal(world.form,'flat');assert.equal(peer.offer,null);peer.finish(0);
  }
  deliver();guest.rematch('canal','clover',1);host.rematch();deliver();
  for(const peer of [host,guest]){
    const world=peer.match.confirmedWorld;
    assert.equal(peer.round,2);assert.equal(world.stage,'canal');assert.equal(world.fetch,false);
    assert.equal(world.clockFrames,null);assert.equal(world.dogs[1].kind,'clover');assert.equal(world.dogs[1].stocks,2);
  }
  guest.finish(0);host.finish(0);deliver();host.rematch();guest.rematch();deliver();
  assert.equal(guest.round,3);assert.equal(guest.match.confirmedWorld.stockCount,2);assert.deepEqual(guest.series.score,[0,0]);
});
test('hosted Time Battle rules disable Fetch, score falls and preserve the timed clock',()=>{
  const rules={lives:5,minutes:1,fetch:false,timed:true,bestOfThree:false,stageForm:'trio'};
  const {peers,deliver}=room([current,current],0,rules);
  peers[1].acceptRules();deliver();
  for(const s of peers){
    const w=s.match.confirmedWorld;assert.equal(w.clockFrames,3600);assert.equal(w.fetch,false);
    w.knockouts([w.dogs[0]]);assert.deepEqual(w.matchCard.points,[-1,0]);assert.equal(w.dogs[0].stocks,3);
  }
});
test('older guests can play representable stock rules and leave custom rooms available for updated guests',()=>{
  const rules={lives:3,minutes:7,fetch:true,timed:false,bestOfThree:true,stageForm:'flat'};
  const old=room([current,previous],0,rules).peers;
  assert(old.every(s=>s.match));assert.equal(old[0].match.confirmedWorld.fetch,true);
  for(const edit of [{lives:1},{minutes:0},{fetch:false}]){
    const [host,guest]=room([current,previous],0,{...rules,...edit}).peers;
    assert(!host.link && !host.match && !guest.match);assert.equal(host.phase,'room');
  }
});
test('Time Battle rooms agree on match rules across rematches and wait for a compatible guest',()=>{
  const legacy=room([current,previous],1).peers;
  assert(legacy.every(s=>!s.match));
  const {peers,deliver}=room([current,current],3);
  for(const s of peers){
    assert.equal(s.timeMinutes,3);assert.equal(s.match.confirmedWorld.clockFrames,10800);
    assert.deepEqual(s.match.confirmedWorld.matchCard.points,[0,0]);
    s.finish(0);
  }
  deliver();
  peers[1].rematch('canal','clover',1);peers[0].rematch();deliver();
  for(const s of peers){
    assert.equal(s.round,2);assert.equal(s.match.confirmedWorld.stage,'canal');
    assert.equal(s.match.confirmedWorld.clockFrames,10800);
    assert.deepEqual(s.match.confirmedWorld.matchCard.points,[0,0]);
  }
});
for(const legacy of [0,1])test('the previous release can '+(legacy?'join':'host')+' a new client and counterpick its arena',()=>{
  const {peers,deliver}=room(legacy?[current,previous]:[previous,current]);
  const modern=peers[1-legacy];
  assert.equal(modern.fighterPicks,false);
  for(const s of peers)assert.deepEqual(lineup(s),[['pip',2],['pip',3]]);
  // Force the new client to lose so it gets the pick. Its partner only speaks stage votes.
  for(const s of peers)s.finish(legacy);
  deliver();modern.rematch('canal','clover',1);assert.equal(modern.myVote,false);
  modern.rematch('canal');peers[legacy].rematch();deliver();
  for(const s of peers){assert.equal(s.round,2);assert.equal(s.stage,'canal');assert.deepEqual(lineup(s),[['pip',2],['pip',3]]);}
});
test('the losing seat can switch while an early vote, a mirror, or a new set preserves both peers’ lineup',()=>{
  const {peers:[host,guest],deliver}=room([current,current]);
  assert(host.fighterPicks && guest.fighterPicks);
  guest.finish(0);deliver();
  guest.rematch('canal','pip',2);assert.equal(guest.myVote,false);
  guest.rematch('canal','clover',1);deliver();assert.equal(host.theirVote,false);
  host.finish(0);deliver();assert.equal(host.theirVote,true);
  host.rematch('picnic','brisket',2);assert.equal(host.myVote,false);
  host.rematch();deliver();
  for(const s of [host,guest])assert.deepEqual(lineup(s),[['pip',2],['clover',1]]);
  host.finish(1);guest.finish(1);deliver();
  host.rematch('laundry','clover',3);deliver();
  assert.equal(guest.validStart(['start',3,'pip','clover','laundry',403,2,'flat']),false);
  guest.rematch();deliver();
  for(const s of [host,guest])assert.deepEqual(lineup(s),[['clover',3],['clover',1]]);
  host.finish(0);guest.finish(0);deliver();
  for(const s of [host,guest])s.rematch();
  deliver();
  for(const s of [host,guest]){
    assert.deepEqual(lineup(s),[['clover',3],['clover',1]]);
    assert.equal(s.stage,'picnic');assert.deepEqual(s.series.score,[0,0]);
  }
});

test('friend rooms and quickplay enable air drops only when the other seat advertises support',()=>{
  for(const format of ['single','quick'])for(const old of [null,0,1]){
    const versions=[current,current];if(old!==null)versions[old]=previous;
    const {peers,deliver}=room(versions,0,null,format);
    for(let round=1;round<=2;round++){
      for(const [i,peer] of peers.entries()){
        if(old!==i)assert.equal(peer.match.confirmedWorld.itemDrops,old===null);
        assert.equal(peer.round,round);peer.finish(0);
      }
      if(round===1){deliver();peers.forEach(p=>p.rematch());deliver();}
    }
  }
});
