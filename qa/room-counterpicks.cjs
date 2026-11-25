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
function room(sources) {
  const queue=[], links=[new EventEmitter(),new EventEmitter()];
  const peers=sources.map((source,side)=>{
    const context={window:{DogFight:window.DogFight},crypto,performance,setInterval:()=>0,setTimeout:()=>0,clearInterval(){},clearTimeout(){}};
    vm.runInNewContext(source,context);
    const s=new context.window.DogOnline.OnlineSession({start(){},status(){},votes(){},closed:message=>assert.fail(message)});
    Object.assign(s,{side,round:0,kind:'pip',coat:2,roomSet:side===0,action:side?'join':'create',openingStage:'picnic',roomForm:'flat',peer:{}});
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
