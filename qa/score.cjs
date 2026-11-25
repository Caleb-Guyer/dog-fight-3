const test=require('node:test');
const assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/score.js');
const {scores,playStep,Player}=window.YardScore;
const {arenas,kits}=window.DogFight;

test('all arenas have full metered scores, a last-stock arrangement and a unique melody',()=>{
  assert.deepEqual(Object.keys(scores).sort(),['menu','deadletter',...Object.keys(arenas),...Object.keys(kits).map(k=>'win-'+k)].sort());
  const melodies=new Set();
  for(const s of Object.values(scores)){
    assert(s.form.every(n=>s.bars[n]));
    assert.equal(s.bass.length,s.meter);assert.equal(s.comp.length,s.meter);
    for(const b of s.bars)assert.equal(b.notes.length,s.meter,s.title);
    const pitches=s.bars.flatMap(b=>b.notes.filter(Boolean).map(n=>n.pitch));
    assert(pitches.length>0);melodies.add(pitches.join(','));
    if(!s.loop)assert.equal(pitches.at(-1)%12,s.bars.at(-1).root%12);
    const counts=[];
    for(const urgent of [false,true]){
      let count=0;
      for(let step=0;step<s.form.length*s.meter;step++)
        playStep(s,step,urgent,(kind,pitch,length,level)=>{
          assert(Number.isFinite(pitch) && length>0 && length<1.8 && level>0 && level<=.2,kind);
          count++;
        });
      counts.push(count);
    }
    if(arenas[s.id])assert(s.form.length===16 && counts[1]>counts[0]);
    if(s.id.startsWith('win-'))assert(!s.loop && s.form.length===2);
  }
  assert.equal(melodies.size,Object.keys(scores).length);
});
function transport(){
  const ctx={currentTime:0,state:'running',sampleRate:24000,createPeriodicWave(){return {};},
    createBuffer(ch,length){return {getChannelData:()=>new Float32Array(length)};},
    createGain(){return {gain:{setTargetAtTime(){},cancelScheduledValues(){}},connect(){},disconnect(){}};}};
  const p=new Player(ctx), notes=[];
  p.voice=(kind,pitch,time,len,vol)=>notes.push([kind,pitch,Number(time.toFixed(5)),len,vol]);
  return {ctx,p,notes};
}
test('audio-clock phrasing holds under different video rates and intensity changes only at a bar',()=>{
  function sample(fps) {
    const {ctx,p,notes}=transport();
    for(let n=0;n<=fps*5;n++){ctx.currentTime=n/fps;p.update('bandstand',false,.4,true);}
    return notes;
  }
  assert.deepEqual(sample(30),sample(144));
  const {ctx,p}=transport();p.update('laundry',false,.4,true);
  ctx.currentTime=.28;p.update('laundry',true,.4,true);assert.equal(p.urgent,false);
  for(let n=18;n<105;n++){
    ctx.currentTime=n/60;p.update('laundry',true,.4,true);
    if(p.step<=6)assert.equal(p.urgent,false);
  }
  assert(p.urgent && p.step>6);
});
test('pauses and muting stop the output, stalls do not burst and victory plays once',()=>{
  const {ctx,p,notes}=transport();
  p.update('picnic',false,.5,true);p.update('picnic',false,.5,false);
  assert.equal(p.bus,null);
  ctx.currentTime=8;p.update('picnic',false,.5,true);
  const count=notes.length;ctx.currentTime=17;p.update('picnic',false,.5,true);
  assert(notes.length-count<=5 && p.nextAt>17);
  p.update('picnic',false,0,true);assert.equal(p.bus,null);
  for(let n=0;n<=300;n++){ctx.currentTime=18+n/60;p.update('win-brisket',false,.4,true);}
  assert(p.finished && !p.bus);const end=notes.length;
  ctx.currentTime=30;p.update('win-brisket',false,.4,true);assert.equal(notes.length,end);
  p.restart();p.update('win-brisket',false,.4,true);assert(!p.finished && notes.length>end);
  p.update(null,false,.4,true);assert.equal(p.bus,null);
});
test('impact ducking lowers the music briefly and keeps the next beat in place',()=>{
  const {p,ctx}=transport();p.update('canal',false,.5,true);
  const beat=p.nextAt;p.duck(.16);ctx.currentTime=.02;p.update('canal',false,.5,true);
  assert.equal(p.volume,.5*.43);assert.equal(p.nextAt,beat);
  ctx.currentTime=.18;p.update('canal',false,.5,true);assert.equal(p.volume,.5);
});
