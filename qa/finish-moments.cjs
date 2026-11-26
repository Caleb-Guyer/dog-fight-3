const test=require('node:test'),assert=require('node:assert/strict');
global.window={};global.document={currentScript:{src:'https://example.test/finish-tools.js'}};
require('../docs/engine.js');require('../docs/finish-tools.js');
const {Battle,FinishTape,idleInput,seededRandom}=window.DogFight;
test('the clinic compares real missed, in-place, rolling and air-dodge landings after the same Brisket throw',()=>{
  const tools=window.FinishTools,{tape,battle}=tools.landingDemo(),before=battle.dogs.map(d=>[d.x,d.y,d.damage,d.stocks]);
  const [fall]=tools.analyze(tape).landings;
  assert.deepEqual([fall.frame,fall.start,fall.type,fall.press],[98,62,'downed',null]);
  for(const lead of [0,5,10,11,16])for(const dir of [-1,0,1]){
    const p=tools.landingPreview(tape,fall,lead,dir);
    assert.equal(p.result.type,lead===16?'airDodgeLand':lead===11?'downed':dir?'techRoll':'tech');
    assert.equal(p.result.press,98-lead);
    if(p.result.type==='techRoll')assert.equal(p.result.dir,dir);
  }
  assert.deepEqual(battle.dogs.map(d=>[d.x,d.y,d.damage,d.stocks]),before);
  assert.equal(tape.playback(98).battle.dogs[0].floorAction.type,'downed');
});
test('landing review finds either local seat across rolling checkpoints and reports a locked second tap',()=>{
  const tools=window.FinishTools;
  for(const slot of [0,1]){
    const w=new Battle({mode:'local',p1:slot?'brisket':'pip',p2:slot?'pip':'brisket',stage:'nightmail',fetch:false},()=>{},seededRandom(91));
    const tape=new FinishTape();
    w.resetTraining();w.dogs[slot].damage=35;
    for(let i=-300;i<150;i++){
      const pair=[idleInput,idleInput];pair[slot]={...idleInput,tapped:{shield:i===86 || i===92}};
      pair[1-slot]={...idleInput,grab:i===0,y:w.grapple?.phase==='hold'?-1:0};
      tape.record(w,...pair);w.step(1/60,...pair);
    }
    const fall=tools.analyze(tape).landings.find(l=>l.slot===slot);
    assert(fall);assert.equal(fall.type,'downed');assert.equal(fall.locked,true);
    assert.match(tools.timing(fall.press,fall.frame,fall.held,fall.locked),/previous tap/);
    const branch=tools.landingPreview(tape,fall,3,-1);
    assert.equal(branch.result.type,'techRoll');assert.equal(branch.result.dir,-1);
  }
});
test('recorded sticks, holds, releases and between-tick taps line up with the displayed frame',()=>{
  const world=new Battle({mode:'local',p1:'clover',p2:'noodle',stage:'picnic',fetch:false},undefined,seededRandom(2));
  const tape=new FinishTape(),read=(n,i=0)=>window.FinishTools.inputFrame(tape,n,i);
  for(let n=1;n<=383;n++){
    const a={...idleInput,x:n>=141 && n<=147?-.5:0,shield:n>=143 && n<=145,
      tapped:{special:n===147,attack:n===150 || n===151},attack:n>=150 && n<=153};
    const b={...idleInput,aimStick:n===151,smashX:1,smashY:-.25,jump:n===156,shortHop:n===156};
    tape.record(world,a,b);world.step(1/60,a,b);
  }
  // This rolling window starts after tick 143, with Shield already held.
  assert.equal(read(0).movement,'Left 50%');assert.deepEqual(read(0).actions,['Shield held']);
  assert.equal(read(0).changed,false);assert.equal(read(1).changed,false);
  assert.deepEqual(read(3).actions,['Shield released']);assert.deepEqual(read(4).actions,['Special tapped']);
  assert.equal(read(5).movement,'Center');assert(read(5).changed);
  assert.deepEqual(read(7).actions,['Attack pressed']);assert.deepEqual(read(8).actions,['Attack pressed']);
  assert.deepEqual(read(9).actions,['Attack held']);assert.equal(read(9).changed,false);
  assert.deepEqual(read(11).actions,['Attack released']);
  assert.equal(read(8,1).aim,'Right 100% + Up 25%');
  assert.deepEqual(read(13,1).actions,['Short hop pressed']);
  assert.deepEqual(read(14,1).actions,['Short hop released']);
});
function play(action,length){
  const world=new Battle({mode:'local',p1:'pip',p2:'brisket',stage:'picnic',minutes:0},undefined,seededRandom(5));
  const [f,r]=world.dogs,tape=new FinishTape(),ground=world.terrain[0].y;
  Object.assign(f,{x:400,y:ground,ground:0,face:1,invuln:0,stockGuard:0});
  Object.assign(r,{x:450,y:ground,ground:0,face:-1,invuln:0,stockGuard:0,stocks:2});
  if(action==='clock')world.clockFrames=5;
  if(action==='ko')Object.assign(r,{y:900,ground:-1,stocks:1});
  for(let n=0;n<length && world.end===null;n++){
    const a={...idleInput,quickAttack:true,attack:action==='jab' && n===5,grab:action==='throw' && n===0,
      x:action==='throw' && n===20?1:0,shield:action==='parry' && n<30};
    const b={...idleInput,quickAttack:true,attack:action==='parry' && n===29};
    tape.record(world,a,b);world.step(1/60,a,b);
  }
  return tape;
}
function launchRecording(opening, slot, releaseFrame, aim) {
  const world=new Battle({stage:'nightmail',form:'trio',mode:slot?'local':'solo',
    cpuLevel:'rival',p1:slot?'brisket':'pip',p2:slot?'pip':'brisket',
    stockCount:slot?1:3,fetch:false,throwOpening:opening},undefined,seededRandom(31));
  if(slot){
    const [guard,p]=world.dogs,y=world.terrain[3].y;
    Object.assign(guard,{x:600,y,ground:3,face:1});
    Object.assign(p,{x:644,y,ground:3,face:-1,damage:125});
  }
  let ko;
  world.emit=(n,e)=>{if(n==='ko' && e.f.index===slot)ko={x:e.x,y:e.y};};
  const tape=new FinishTape(),points=[{x:world.dogs[slot].x,y:world.dogs[slot].y}];
  for(let frame=1;frame<=160 && world.end===null && !ko;frame++){
    const inputs=[slot?{...idleInput,grab:frame===1,y:world.grapple?.phase==='hold'?-1:0}:idleInput,idleInput];
    if(frame===releaseFrame)inputs[slot]={...idleInput,...aim};
    tape.record(world,...inputs);world.step(1/60,...inputs);
    const {x,y}=ko || world.dogs[slot];points.push({x,y});
  }
  tape.captureKnockouts(world);
  return {points,clip:tape.knockouts[0]?.tape,world};
}
for(const [opening,slot] of [['perch',0],['edge',0],['perch',1]]){
  test('launch comparison matches an independent fight frame for frame on '+opening+' for P'+(slot+1),()=>{
    const {clip,points,world}=launchRecording(opening,slot);
    const {launch}=window.FinishTools.analyze(clip,slot);
    assert(launch && launch.slot===slot);
    const original=window.FinishTools.launchFlight(clip,launch);
    assert.deepEqual(original.points,points.slice(launch.frame-1));
    assert.match(original.outcome,/KO at the (top|left) line/);
    const saved=structuredClone(world.matchCard);
    for(const [x,y] of [[0,0],[1,0],[-1,0],[0,-1],[1,1]]){
      const path=window.FinishTools.launchFlight(clip,launch,{x,y});
      const independent=launchRecording(opening,slot,launch.frame,{x,y});
      assert.deepEqual(path.points,independent.points.slice(launch.frame-1,path.frame+1));
      assert(path.frame<=clip.length);
    }
    assert.deepEqual(world.matchCard,saved);
    assert.deepEqual(window.FinishTools.launchFlight(clip,launch),original);
    assert.equal(window.FinishTools.analyze(clip,1-slot).launch,null);
  });
}
test('a fall without a steering window and a time expiry have no launch comparison',()=>{
  assert.equal(window.FinishTools.analyze(play('ko',15),1).launch,null);
  assert.equal(window.FinishTools.analyze(play('clock',30),0).launch,null);
});
for(const [action,label,event] of [['jab','Pip · Quick Paw','hit'],['throw','Pip · Kickoff','throwRelease'],
  ['parry','Pip · Parry','parry'],['ko','Brisket · KO','ko'],['clock','Time expired','win']]){
  test(action+' marker seeks to the exact simulation event',()=>{
    const tape=play(action,65),marks=window.FinishTools.moments(tape),events=[];
    assert.equal(marks.length,1);assert.equal(marks[0].label,label);
    const player=tape.playback(marks[0].frame-1,name=>events.push(name));
    player.step();assert(events.includes(event));assert.equal(player.frame,marks[0].frame);
    assert.deepEqual(window.FinishTools.moments(tape),marks);
  });
}
test('a hit before the rolling clip starts has no jump button',()=>{
  assert.deepEqual(window.FinishTools.moments(play('jab',305)),[]);
});
for(const [kind,label] of [['jab','Attack clash'],['grab','Grab clash'],['air','Traded hits']]){
  test('instant replay finds the '+kind+' exchange from real inputs in either facing, including after a block rolls over',()=>{
    for(const before of [0,245])for(const dir of [-1,1]){
      const w=new Battle({mode:'local',p1:'pip',p2:'pip',stage:'picnic',fetch:false},undefined,seededRandom(42));
      const tape=new FinishTape(true),events=[];
      w.dogs.forEach((f,i)=>Object.assign(f,{x:480+i*dir*(kind==='jab'?100:39),face:i?-dir:dir,ground:0,y:w.terrain[0].y}));
      w.emit=(name,e)=>{if(['attackClash','hit','grabClash'].includes(name))events.push({at:tape.count,name,slot:e.f.index});};
      for(let n=-before;n<90;n++){
        const a={...idleInput,attack:(kind==='jab' && n===44) || (kind==='air' && n===51),
          grab:kind==='grab' && n===44,jump:kind==='air' && n===43,quickAttack:true};
        tape.record(w,a,a);w.step(1/60,a,a);
      }
      const [mark,...rest]=window.FinishTools.analyze(tape,null,null,true).marks;
      assert.equal(rest.length,0);assert.equal(mark.label,label);
      assert.equal(mark.frame,events[0].at-(tape.count-tape.length));assert(mark.frame>30);
      if(kind==='air'){
        assert.equal(events.length,2);assert.equal(events[0].at,events[1].at);
        assert.match(mark.detail,/P1 Pip landed Scramble for 5.1%/);assert.match(mark.detail,/P2 Pip landed Scramble for 5.1%/);
      }
      const original=structuredClone(w.matchCard);
      for(const slot of [0,1]){
        const attempt=tape.playback(mark.frame-30,undefined,slot);
        while(attempt.step({...idleInput,shield:true})){}
        assert.equal(attempt.battle.dogs[slot].damage,0);
        assert.deepEqual(w.matchCard,original);
        assert.deepEqual(tape.playback(tape.length).battle.matchCard,original);
      }
    }
  });
}

test('an early stock can be saved from its actual stage departure after the fight has moved on',()=>{
  const w=new Battle({mode:'local',stage:'picnic',p1:'pip',p2:'clover',stockCount:5,fetch:false},undefined,seededRandom(9));
  const tape=new FinishTape(),ends=[];
  for(let n=0;n<1200;n++){
    const count=w.matchCard.losses.length,input={...idleInput,x:n<260 || n>550?-1:0};
    tape.record(w,input,idleInput);w.step(1/60,input,idleInput);
    if(w.matchCard.losses.length!==count)ends.push(structuredClone(w.dogs));
  }
  tape.captureKnockouts(w);tape.captureKnockouts(w);
  assert.equal(tape.knockouts.length,4);
  for(const [i,c] of tape.knockouts.entries()){
    assert.equal(c.first,i);assert.deepEqual(c.tape.playback(c.tape.length).battle.dogs,ends[i]);
    const a=window.FinishTools.analyze(c.tape,0);
    assert.equal(a.escape.label,'Before leaving the stage');assert(a.escape.frame<c.tape.length);
    const rehearsal=c.tape.playback(a.escape.frame,undefined,0);
    while(rehearsal.step(idleInput)){}
    assert.equal(rehearsal.battle.dogs[0].stocks,c.losses[0].remaining+1);
    assert.equal(c.tape.playback(c.tape.length).battle.dogs[0].stocks,c.losses[0].remaining);
  }
  assert.equal(w.dogs[0].stocks,1);
  const jab=window.FinishTools.analyze(play('jab',65),1);
  assert.equal(jab.escape.label,'Before Quick Paw');assert(jab.escape.frame<jab.marks[0].frame);
});

test('double KOs share a clip and long Time Battles retain the latest twelve distinct exchanges',()=>{
  const w=new Battle({mode:'local',stage:'picnic',p1:'pip',p2:'pip',timeBattle:true,minutes:7,fetch:false},undefined,seededRandom(8));
  const tape=new FinishTape();
  w.dogs.forEach(f=>Object.assign(f,{y:860,ground:-1}));
  for(let i=0;i<4100;i++){
    const a={...idleInput,x:-1};tape.record(w,a,idleInput);w.step(1/60,a,idleInput);
    if(i===1){
      const [c]=tape.knockouts;assert.equal(c.losses.length,2);assert.equal(c.tape.length,1);
      assert.deepEqual(c.tape.playback(1).battle.matchCard.points,[-1,-1]);
    }
  }
  tape.captureKnockouts(w);
  assert(w.matchCard.losses.length>14);assert.equal(tape.knockouts.length,12);
  assert(tape.knockouts[0].first>1);
  for(const c of tape.knockouts){
    assert(c.tape.blocks.length<=3);
    const after=c.tape.playback(c.tape.length).battle.matchCard;
    assert.deepEqual(after.points,c.losses.at(-1).points);
    assert.deepEqual(after.losses.at(-1),w.matchCard.losses[c.first+c.losses.length-1]);
  }
});
test('a recorded grab can be escaped from either seat before a late throw, including a clip starting inside the hold',()=>{
  const tools=window.FinishTools;
  for(const slot of [0,1]){
    const w=new Battle({mode:'local',p1:slot?'brisket':'pip',p2:slot?'pip':'brisket',stage:'nightmail',fetch:false});
    w.resetTraining();
    const tape=new FinishTape(),partial=new FinishTape(),short=new FinishTape();
    let thrown=0;
    w.emit=(name)=>{if(name==='throwRelease')thrown++;};
    for(let n=0;n<110;n++){
      const inputs=[idleInput,idleInput];
      inputs[1-slot]={...idleInput,grab:n===1,attack:n===18,y:n===52?-1:0};
      tape.record(w,...inputs);
      if(n>=20)partial.record(w,...inputs);
      if(n<20)short.record(w,...inputs);
      w.step(1/60,...inputs);
    }
    assert.equal(thrown,1);
    const saved=structuredClone(w.matchCard);
    for(const recording of [tape,partial]){
      const [hold]=tools.analyze(recording).holds;
      assert.equal(hold.slot,slot);assert.equal(hold.frame===0,recording===partial);
      const original=tools.holdPreview(recording,hold,'recorded');
      assert.match(original.text,/Throw committed/);assert.equal(original.inputs,0);
      const held=tools.holdPreview(recording,hold,'held');
      assert.equal(held.inputs,1);
      for(const action of ['alternate','stick']){
        const result=tools.holdPreview(recording,hold,action);
        assert.equal(result.text,'Escaped the grab');assert(result.frames<original.frames);assert(result.inputs>1);
      }
    }
    const clip=tools.holdPreview(short,tools.analyze(short).holds[0],'recorded');
    assert.equal(clip.text,'Still held at the end of the clip');
    assert.deepEqual(w.matchCard,saved);
  }
});
for(const [opening,slot] of [['edge',0],['perch',0],['perch',1]]){
  test('rewinding the throw on '+opening+' gives P'+(slot+1)+' control before the actual grab',()=>{
    const {clip}=launchRecording(opening,slot),f=window.FinishTools;
    const saved=clip.playback(clip.length).battle.matchCard;
    const {escape,contact}=f.analyze(clip,slot);
    assert.equal(contact.kind,'grab');assert.equal(contact.move,'Bear Hug');
    const [hold]=f.analyze(clip).holds;
    assert.equal(hold.frame,contact.frame);
    assert.match(f.holdPreview(clip,hold,'alternate').text,/Throw committed/);
    assert.equal(escape.label,'Before Bear Hug');assert(escape.frame<contact.frame);
    assert.equal(clip.playback(escape.frame).battle.grapple,null);
    const run=(key,lead)=>{
      const r=f.defenseReply(clip,contact,lead,key);
      while(r.step()){}
      return r;
    };
    const recorded=run('recorded',8);
    assert.deepEqual(recorded.player.battle.dogs,clip.playback(recorded.end).battle.dogs);
    assert.match(recorded.events[0].text,/Brisket caught Pip with Bear Hug/);
    assert.equal(recorded.events[0].frame,contact.frame);
    assert.match(run('guard',8).events[0].text,/Brisket caught Pip/);
    assert.match(run('attack',3).events[0].text,/Pip hit Brisket with Quick Paw/);
    const dodge=run('spot',3);assert(!dodge.events.some(e=>e.text.includes('caught Pip')));
    assert.deepEqual(clip.playback(clip.length).battle.matchCard,saved);
    assert.equal(f.analyze(clip,1-slot).contact,null);
  });
}
test('block, parry, clash and jump previews match an independent fight at both timings',()=>{
  const options={stage:'nightmail',form:'trio',mode:'local',p1:'pip',p2:'brisket',stockCount:3,fetch:false};
  function setup(){
    const w=new Battle(options,undefined,seededRandom(31)),p=w.terrain[0];
    Object.assign(w.dogs[0],{x:p.x1+3,y:p.y,ground:0,face:1,damage:420});
    Object.assign(w.dogs[1],{x:p.x1+45,y:p.y,ground:0,face:-1});return w;
  }
  const original=setup(),tape=new FinishTape();
  const rival=n=>n===14?{...idleInput,tapped:{attack:true}}:idleInput;
  for(let n=1;n<=180 && !original.matchCard.losses.length;n++){
    tape.record(original,idleInput,rival(n));original.step(1/60,idleInput,rival(n));
  }
  const contact=window.FinishTools.analyze(tape,0).contact;
  assert.equal(contact.kind,'hit');assert.equal(contact.move,'Body Check');assert.equal(contact.frame,18);
  for(const lead of [3,8,15])for(const key of ['guard','parry','jump','spot','attack','recorded']){
    const r=window.FinishTools.defenseReply(tape,contact,lead,key),w=setup();
    while(r.step()){}
    for(let n=1;n<=r.end;n++){
      const first=n===r.start+1,live=n>r.start;
      let a=idleInput;
      if(live){
        if(key==='jump')a={...idleInput,jump:true,tapped:first?{jump:true}:undefined};
        if(key==='guard' || key==='parry' && first)a={...idleInput,shield:true,tapped:first?{shield:true}:undefined};
        if(key==='attack' && first)a={...idleInput,attack:true,tapped:{attack:true}};
        if(key==='spot' && first)a={...idleInput,y:1,shield:true,tapped:{shield:true}};
      }
      w.step(1/60,a,rival(n));
    }
    assert.deepEqual(r.player.battle.dogs,w.dogs,key+' at '+lead);
    if(key==='parry')assert.equal(r.events.some(e=>e.text==='Pip parried'),lead===3);
    if(key==='guard')assert.match(r.events[0].text,/Pip blocked Body Check/);
    if(key==='attack' && lead===3)assert.match(r.events[0].text,/clashed/);
  }
});
test('a fall without a recorded attack or a time win offers no defensive reply',()=>{
  assert.equal(window.FinishTools.analyze(play('ko',15),1).contact,null);
  assert.equal(window.FinishTools.analyze(play('clock',30),0).contact,null);
});
