const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
global.document = {currentScript:{src:'https://example.test/finish-tools.js'}};
require('../docs/engine.js');
require('../docs/finish-tools.js');
const {Battle,FinishTape,idleInput,seededRandom} = window.DogFight;
const {analyze,ledgeDemo,ledgePreview,ledgeAttempt} = window.FinishTools;

test('replaying the lost stock and delaying the same climb produce different real outcomes', () => {
  const {tape,battle} = ledgeDemo();
  const saved = structuredClone(battle.matchCard);
  const marks = analyze(tape).ledges;
  assert.deepEqual(marks,[{frame:0,slot:0,dog:'Pip',left:true}]);
  const branch = (action,delay=0) => ledgePreview(tape,marks[0],action,delay);
  assert.deepEqual(branch('recorded'),branch('climb'));
  assert.match(branch('climb').contact,/Haymaker/);
  assert.equal(branch('climb').text,'Lost the stock');
  assert.equal(branch('roll').text,'Lost the stock');
  assert.match(branch('attack').contact,/Rail Kick/);
  assert.equal(branch('jump').text,'Lost the stock');
  assert.equal(branch('drop').text,'Lost the stock');
  assert.equal(branch('hang').text,'Hanging at the ledge');
  for(const option of ['climb','roll'])assert.deepEqual(branch(option,60),{text:'Onstage',contact:'',frames:100});
  assert.deepEqual(battle.matchCard,saved);
  assert.deepEqual(tape.playback(tape.length).battle.matchCard,saved);
  const clip=tape.knockouts[0],catchFrame=analyze(clip.tape).ledges[0];
  assert(clip.tape.length<60);
  assert.deepEqual(ledgePreview(clip.tape,catchFrame,'climb',60,clip.returnTape),branch('climb',60));
});

test('a right-side catch from either local seat lets each fighter climb through carried drift or use its own get-up attack', () => {
  for(const [slot,kind] of [[1,'noodle'],[0,'clover'],[1,'pip'],[0,'brisket']]){
    const battle = new Battle({mode:'local',p1:slot?'clover':kind,p2:slot?kind:'pip',stage:'nightmail',fetch:false},undefined,seededRandom(31));
    const tape = new FinishTape(), climber=battle.dogs[slot],floor=battle.terrain[0];
    Object.assign(climber,{x:floor.x2+35,y:floor.y+10,ground:-1,face:-1,vy:30,invuln:0});
    for(let n=0;n<70;n++){
      const pair=[idleInput,idleInput];pair[slot]=n<16?{...idleInput,x:-1}:idleInput;
      pair[1-slot]={...idleInput,jump:n===20};
      tape.record(battle,...pair);battle.step(1/60,...pair);
    }
    const [mark]=analyze(tape).ledges;
    assert.equal(mark.slot,slot);assert(mark.frame>0);assert.equal(mark.left,false);
    const read=ledgeAttempt(tape,mark);
    for(let i=0;i<16;i++)read.step(read.reply('climb',0));
    assert.equal(read.battle.dogs[slot].floorAction?.type,'ledgeClimb');
    const strike=ledgeAttempt(tape,mark);
    strike.step(strike.reply('attack',0));
    assert.equal(strike.battle.dogs[slot].attack.moveId,climber.kit.ledgeAttack);
    const hang=ledgeAttempt(tape,mark);
    while(hang.frame<30)hang.step(idleInput);
    assert.equal(hang.battle.dogs[1-slot].y,tape.playback(30).battle.dogs[1-slot].y);
    const short=tape.playback(69).battle;
    const tiny=new FinishTape();
    short.hangLedge(short.dogs[slot],{index:0,left:false,x:floor.x2,y:floor.y});
    tiny.record(short,idleInput,idleInput);
    const catchFrame=analyze(tiny).ledges.find(m=>m.slot===slot);
    assert.equal(ledgePreview(tiny,catchFrame,'recorded',0).frames,1);
    const next=new FinishTape();next.from=1;next.count=4;
    const pair=[idleInput,idleInput];pair[1-slot]={...idleInput,jump:true};
    next.blocks=[{start:0,inputs:[pair,pair,pair,pair]}];
    assert.equal(next.inputAt(0,1-slot),idleInput);
    assert.equal(next.inputAt(4,1-slot),idleInput);
    const continuing=ledgeAttempt(tiny,catchFrame,false,undefined,next);
    const released=ledgeAttempt(tiny,catchFrame);
    for(let n=0;n<20;n++){continuing.step(idleInput);released.step(idleInput);}
    assert(continuing.battle.dogs[1-slot].y<released.battle.dogs[1-slot].y);
  }
});
