const test=require('node:test'),assert=require('node:assert/strict');
global.window={};
require('../docs/engine.js');require('../docs/fight-school.js');require('../docs/match-review.js');
const {Battle,FinishTape,idleInput,seededRandom}=window.DogFight;
const {Corner}=window.FightSchool;
const previous='0000000000000001-0123456789abcdef',current='0000000000000002-0123456789abcdef';
function fight(recover){
  const c=new Corner('return',previous),tape=new FinishTape(true);
  const w=new Battle({mode:'solo',cpuLevel:'rookie',p1:'pip',p2:'brisket',stage:'picnic',minutes:7,stockCount:3,fetch:false},
    (n,e)=>c.target.contact(n,e,w),seededRandom(42));
  let leap=null;
  for(let n=0;n<2600 && w.end===null;n++){
    if(recover && leap===null && w.dogs[0].ground<0 && w.dogs[0].x<w.terrain[0].x1-15)leap=n;
    const i={...idleInput,x:leap===null || c.target.doneAt!==null?-1:1,y:n===leap?-1:0,special:n===leap};
    tape.record(w,i,idleInput);w.step(1/60,i,idleInput);c.target.step(w);
    if(c.target.doneAt!==null)c.target.tapeFrame??=tape.count;
  }
  tape.captureKnockouts(w);assert.equal(w.end,1);
  const entry={mode:'school',stage:'picnic',form:'original',winner:w.end,card:w.matchCard};
  return {entry,tape,frame:c.target.tapeFrame ?? null};
}
test('rematch takeover reproduces the recorded recovery on its exact tick and lets a different response miss it',async()=>{
  const loss=fight(false),rematch=fight(true);assert(rematch.frame>0);assert.equal(loss.frame,null);
  rematch.entry.rematch={previous,skill:'return',frame:rematch.frame};
  const book=new Map([[previous,loss.entry],[current,rematch.entry]]);
  const study=await window.MatchReview.rematchStudy(book,current,rematch.tape,new Map());
  assert.equal(study.before,loss.entry);assert.equal(study.after,rematch.entry);
  assert.equal(study.clips[1],rematch.tape.knockouts[0].tape);
  const {tape,at}=study.exchange;
  const wallBefore=tape.playback(0).battle.dogs[0].x;
  for(const repeat of [true,false,true]){
    const run=study.attempt(tape,()=>{});
    assert.equal(run.battle.dogs[0].x,wallBefore);
    while(run.frame<run.length)run.step(repeat?tape.inputAt(tape.count-tape.length+run.frame,0):idleInput);
    assert.equal(run.target.doneAt,repeat?rematch.frame:null);
  }
  assert.equal(at,Math.min(90,rematch.frame));assert.equal(rematch.entry.card.losses.length,3);
});
test('older and missing records remain readable, a lost scorecard cannot pair with a different match',async()=>{
  const loss=fight(false),entry={...loss.entry,rematch:{previous,skill:'guard',frame:null}};
  for(const earlier of [null,{...loss.entry,mode:'solo'},{...loss.entry,winner:0}]){
    const study=await window.MatchReview.rematchStudy(new Map([[previous,earlier],[current,entry]]),current,loss.tape,new Map());
    assert.equal(study.before,null);assert.equal(study.after,entry);assert.equal(study.exchange,null);
  }
  for(const bad of [null,loss.entry,{...entry,rematch:{previous:'broken',skill:'guard',frame:0}}]){
    assert.equal((await window.MatchReview.rematchStudy(new Map([[current,bad]]),current,null,new Map())).after,null);
  }
});
