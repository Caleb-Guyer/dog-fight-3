const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};
global.document={hidden:false};
require('../docs/engine.js');
require('../docs/online.js');
require('../docs/pad-feedback.js');
const feedback=window.PadFeedback;
const {Battle,idleInput}=window.DogFight;

function controller(){
  const calls=[];
  const vibrationActuator={
    effects:['dual-rumble'],
    playEffect(type,params){calls.push({type,...params});return Promise.resolve('complete');},
    reset(){return Promise.resolve('complete');}
  };
  return {connected:true,vibrationActuator,calls};
}
test('only the human fighter feels a contact, including playing as the second dog in a retry',()=>{
  const hit={f:{index:1},owner:{index:0},damage:4};
  for(const [battle,trial,side,expected] of [
    [{},null,null,[32]], [{hasSecondPlayer:true},null,null,[32,56]],
    [{hasSecondPlayer:true,lesson:{}},null,null,[32]], [{lesson:{example:{}}},null,null,[]],
    [{trainingPlayerSlot:1},null,null,[56]], [{hasSecondPlayer:true},null,1,[56]],
    [{hasSecondPlayer:true},null,0,[32]], [{hasSecondPlayer:true},{slot:1},null,[56]],
    [{},{slot:0,seats:{}},null,[32,56]]
  ]){
    const pads=[controller(),controller()];
    feedback.contact('hit',hit,battle,trial,side,i=>pads[i],[2,1]);
    assert.deepEqual(pads.flatMap(p=>p.calls.map(c=>c.duration)),expected);
    if(expected.length===2)assert.equal(pads[1].calls[0].strongMagnitude,.46*.48);
    if(expected.length===1)assert.equal(pads[0].calls[0].type,'dual-rumble');
    feedback.stop();
  }
});
test('stock loss takes priority over a follow-up and feedback respects strength, focus and device support',async()=>{
  const pad=controller(),e={f:{index:0},owner:{index:1},damage:18};
  const send=(name,level=2)=>feedback.contact(name,e,{},null,null,()=>pad,[level,1]);
  send('ko');send('hit');
  assert.deepEqual(pad.calls.map(c=>c.duration),[145]);feedback.stop();
  send('hit',1);assert.equal(pad.calls.at(-1).duration,95);
  assert.equal(pad.calls.at(-1).strongMagnitude,.84*.48);feedback.stop();
  send('parry');assert.equal(pad.calls.at(-1).weakMagnitude,.92);feedback.stop();
  send('parry',0);document.hidden=true;send('block');document.hidden=false;
  pad.connected=false;send('parry');pad.connected=true;
  pad.vibrationActuator.effects=['trigger-rumble'];send('ko');delete pad.vibrationActuator.effects;
  assert.equal(pad.calls.length,3);
  pad.vibrationActuator.playEffect=()=>{throw new Error('unplugged');};send('ko');
  pad.vibrationActuator.playEffect=()=>Promise.reject(new Error('unavailable'));send('ko');
  await new Promise(resolve=>setImmediate(resolve));feedback.stop();
});
test('late remote shield corrects a real predicted jab before either pad can feel it',()=>{
  for(const shield of [true,false]){
    const peers=[0,1].map(side=>{
      const pad=controller(),packets=[];
      let world;
      const session=new window.DogOnline.OnlineSession({start(config,rng){
        world=new Battle(config,(name,e)=>feedback.contact(name,e,world,null,side,i=>i===0?pad:null,[2,0]),rng);
      }});
      session.side=side;session.send=p=>{if(p[0]==='input')packets.push(p[3]);};
      session.beginRound(['start',1,'pip','brisket','picnic',7]);
      for(const w of [world,session.match.confirmedWorld]){w.dogs[0].x=580;w.dogs[1].x=637;}
      return {net:session.match,world,pad,packets};
    });
    for(let frame=0;frame<6;frame++){
      peers[0].net.tick(()=>({...idleInput,attack:true,quickAttack:true}),peers[0].world);
      peers[1].net.tick(()=>({...idleInput,shield}),peers[1].world);
    }
    assert.equal(peers[0].world.dogs[1].damage,4);
    assert.deepEqual(peers.map(p=>p.pad.calls.length),[0,0]);
    for(const [side,p] of peers.entries()){
      peers[1-side].packets.forEach((packet,i)=>assert(p.net.receive(i,packet)));
      p.net.confirm(p.world);p.net.confirm(p.world);
      assert.equal(p.world.dogs[1].damage,shield?0:4);
    }
    assert.deepEqual(peers.map(p=>p.pad.calls.map(c=>c.duration)),shield?[[],[35]]:[[32],[56]]);
    feedback.stop();
  }
});
