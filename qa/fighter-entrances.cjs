const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/fighter-entrances.js');
const {Battle,FinishTape,idleInput,seededRandom}=window.DogFight;
const create=(settings={})=>new Battle({mode:'solo',stage:'nightmail',p1:'pip',p2:'brisket',...settings},undefined,seededRandom(23));
test('only a fresh versus lineup plays the introductions, including alternate stage layouts and mirror picks',()=>{
  for(const stage of Object.keys(window.DogFight.arenas))for(const form of Object.keys(window.DogFight.stageForms)){
    const world=create({stage,form,mode:'local',p1:'clover',p2:'clover',coats:[1,3]});assert(world.atStartingMarks());
    world.step(1/60,idleInput,idleInput);assert(!world.atStartingMarks());
  }
  for(const settings of [{mode:'training'},{underTableStart:true,stage:'picnic'},{runoffTrump:'left'},
    {throwOpening:'perch',form:'trio'},{suddenStart:true}])assert(!create(settings).atStartingMarks(),JSON.stringify(settings));
});
test('each arrival uses the selected coat, lands exactly on its mark, and leaves both simulation and RNG untouched',()=>{
  const calls=[],ctx={save(){},restore(){},translate(){},scale(){},rotate(){},fillRect(){},globalAlpha:1};
  window.DogArt={draw(_ctx,kind,x,y,opts){calls.push({kind,x,y,...opts});}};
  const signatures=[];
  for(const kind of Object.keys(window.DogFight.fighters)){
    const w=create({p1:kind,p2:kind,coats:[2,1]}),copy=new FinishTape().copy(w);
    const launch=[];
    for(const remaining of [2.4,2.09,1.84,1.55,1.22,.8,.45,.01]){
      window.FighterEntrances.draw(ctx,w.dogs[0],w,remaining,false);launch.push(calls.at(-1));
      window.FighterEntrances.draw(ctx,w.dogs[1],w,remaining,true);
      assert.deepEqual(calls.at(-1),{kind,x:0,y:0,coat:1,face:1,pose:'idle',phase:0,time:0,scale:1});
    }
    assert(launch.every(d=>d.coat===2));assert(launch.some(d=>d.y<0));
    assert(launch.at(-1).x===0 && launch.at(-1).y===0);assert.equal(launch.at(-1).pose,'idle');
    signatures.push(launch.map(d=>[d.pose,d.x,d.y].join('/')).join(','));
    assert.deepEqual(w.dogs,copy.dogs);assert.equal(w.random.state,copy.random.state);assert.equal(w.matchFrames,0);
  }
  assert.equal(new Set(signatures).size,4);
});
test('the ear can distinguish all four short arrival cues',()=>{
  const cues=new Set();
  for(const kind of Object.keys(window.DogFight.fighters)){
    const notes=[];window.FighterEntrances.cue(kind,(start,end,length,delay)=>notes.push([start,end,length,delay]));
    assert(notes.every(n=>n[2]+n[3]<.4));cues.add(JSON.stringify(notes));
  }
  assert.equal(cues.size,4);
});
