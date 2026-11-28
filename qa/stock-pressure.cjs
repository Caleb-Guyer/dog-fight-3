const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');
const {Battle,kits,arenas,FinishTape,idleInput,seededRandom}=window.DogFight;
test('both seats can combine a return jump and their own aerial in either order while keeping an air jump',()=>{
  for(const kind of Object.keys(kits))for(const slot of [0,1])for(const jumpFirst of [false,true]){
    for(const side of ['neutral','back','up','down']){
      const w=new Battle({mode:'local',stage:'bandstand',p1:kind,p2:kind,fetch:false},undefined,seededRandom(32));
      const f=w.dogs[slot];w.knockouts([f]);
      const tape=new FinishTape(true);
      for(let n=0;n<24;n++){
        const jump=n===(jumpFirst?17:22),attack=n===(jumpFirst?22:17);
        const inputs=[idleInput,idleInput];
        inputs[slot]={...idleInput,jump,shortHop:jump,attack:attack && side==='neutral',aimStick:attack && side!=='neutral',
          smashX:attack && side==='back'?-f.face:0,smashY:!attack?0:side==='up'?-1:side==='down'?1:0};
        tape.record(w,...inputs);w.step(1/60,...inputs);
      }
      assert.equal(f.stockLift,null);assert.equal(f.attack.moveId,kits[kind].air[side]);
      assert(f.shortHopFlight && f.attack.shortHop);assert.equal(f.jumps,1);
      const replay=tape.playback(19);while(replay.step()){}
      const again=replay.battle.dogs[slot];
      assert.deepEqual([again.attack.moveId,again.y,again.vy,again.jumps,again.stockGuard],
        [f.attack.moveId,f.y,f.vy,1,96/60]);
    }
  }
});
test('a stock return preserves drop speed and first aim, while archived fights keep their original window',()=>{
  function exit(liftChords,first,second,third){
    const w=new Battle({mode:'local',stage:'nightmail',p1:'pip',p2:'brisket',liftChords});
    const f=w.dogs[0];w.knockouts([f]);
    for(let n=0;n<24;n++)w.step(1/60,{...idleInput,...(n===17?first:n===20?second:n===22?third:{})},idleInput);
    return f;
  }
  const down=exit(true,{y:1},{aimStick:true,smashY:-1},{special:true});
  const normal=exit(true,{},{aimStick:true,smashY:-1},{special:true});
  assert.equal(down.attack.moveId,kits.pip.air.up);assert(down.vy>normal.vy+100);
  const dodge=exit(true,{x:-1},{shield:true,airDodgeX:1,airDodgeY:0},{});
  assert.equal(dodge.airDodge.type,'directionalAirDodge');assert.equal(dodge.airDodge.x,1);
  assert(exit(false,{jump:true},{},{}).stockLift?.ready);
  const legacy=exit(false,{},{jump:true},{attack:true});
  assert(!legacy.stockLift && !legacy.attack && legacy.vy<0);
});
function fight(kind,extra={}){
  const events=[];
  const w=new Battle({p1:'pip',p2:kind,mode:'solo',cpuLevel:'rival',stage:'picnic',form:'flat',
    stockCount:3,fetch:false,liftOpening:true,...extra},(name,e)=>events.push({name,id:e.moveId}),seededRandom(42));
  return {w,events};
}
test('a buffered drop aerial meets the defending dog or its shield on a perch and on a flat stage',()=>{
  for(const kind of Object.keys(kits))for(const stage of ['bandstand','nightmail'])for(const shield of [false,true]){
    const hits=[];
    const w=new Battle({mode:'local',p1:kind,p2:'brisket',stage,form:stage==='nightmail'?'flat':'original',fetch:false},
      (name,e)=>{if(['hit','block'].includes(name))hits.push([name,e.moveId]);},seededRandom(12));
    const [hero,guard]=w.dogs;w.knockouts([hero]);
    const lift=hero.stockLift;
    Object.assign(guard,{x:lift.x+12,y:w.terrain[lift.landing].y,ground:lift.landing,face:-1});
    for(let n=0;n<62;n++)w.step(1/60,
      {...idleInput,y:n===17?1:0,aimStick:n===21,smashY:n===21?1:0},{...idleInput,shield:shield && n>=24});
    assert.deepEqual(hits,[[shield?'block':'hit',kits[kind].air.down]]);
    assert.deepEqual(w.dogs.map(f=>f.stocks),[2,3]);
  }
});
test('all sixteen matchups can block the platform aerial or jump free of the committed landing grab',()=>{
  for(const p1 of Object.keys(kits))for(const p2 of Object.keys(kits))for(const choice of ['wait','late','early','jump']){
    const {w,events}=fight(p2,{p1,liftOpening:false,perchApproach:true,form:'original'});
    let dropped=false,buffered=false,jumped=false;
    for(let n=0;n<58;n++){
      const shield=choice==='early' || choice==='jump' || (choice==='late' && dropped);
      tick(w,{shield,jump:choice==='jump' && dropped});
      dropped ||= events.some(e=>e.name==='platformDrop');
      buffered ||= !!w.dogs[1].attack?.landingGrab;
      jumped ||= w.dogs[0].ground<0;
    }
    const label=[p1,p2,choice].join('/');
    assert(dropped,label);assert.deepEqual(w.dogs.map(f=>f.stocks),[3,3]);
    const caught=choice==='early',clear=choice==='jump';
    const expected=clear?undefined:caught?{name:'grabCatch',id:kits[p2].grab}:
      {name:choice==='late'?'block':'hit',id:kits[p2].air.down};
    assert.deepEqual(first(events),expected,label);
    assert.equal(buffered,caught || clear,label);if(clear)assert(jumped,label);
  }
});
test('a second shelf, the opposite facing, protected feet and older recordings rule out the empty drop',()=>{
  for(const reason of ['clear','shelf','facing','protected','legacy','rookie']){
    const {w}=fight('pip',{liftOpening:false,stage:'bandstand',form:'original',cpuLevel:reason==='rookie'?'rookie':'rival'});
    const [foe,f]=w.dogs,ground=reason==='shelf'?3:1,x=reason==='shelf'?504:408;
    Object.assign(f,{ground,x,y:w.terrain[ground].y,face:reason==='facing'?-1:1});
    Object.assign(foe,{x:x+38,ground:0,y:w.terrain[0].y,shield:true,stockGuard:reason==='protected'?1:0});
    if(reason==='legacy')delete w.bot.readPlatforms;
    w.cpu(1/60);assert.equal(!!w.bot.perchGrab,reason==='clear',reason);
  }
});
test('a replay of the platform grab retains the original aim after the defender jumps',()=>{
  const {w}=fight('noodle',{liftOpening:false,perchApproach:true,form:'original'});
  const tape=new FinishTape(true),states=[];
  const state=b=>[b.random.state,structuredClone(b.bot.perchGrab),b.dogs.map(f=>[f.x,f.y,f.ground,f.damage,f.attack?.moveId])];
  for(let i=0;i<70;i++){
    const input={...idleInput,shield:true,jump:i>=16 && i<38};
    states.push(state(w));tape.record(w,input,idleInput);tick(w,input);
  }
  assert(states.some(s=>s[1]?.airborne));
  for(const frame of [0,10,19,37,51]){
    const run=tape.playback(frame);assert.deepEqual(state(run.battle),states[frame]);
    while(run.step()){}assert.deepEqual(state(run.battle),state(w));
  }
});
const tick=(w,p={})=>w.step(1/60,{...idleInput,...p},idleInput);
const first=events=>events.find(e=>['hit','block','grabCatch'].includes(e.name));
function perch(rival,returner='pip',extra={}){
  const events=[];
  const w=new Battle({mode:'solo',cpuLevel:'rival',stage:'bandstand',p1:returner,p2:rival,
    stockCount:3,fetch:false,liftOpening:'perch',...extra},(name,e)=>events.push({name,slot:e.f?.index,
      move:e.moveId,platform:e.platform,frames:e.frames}),seededRandom(42));
  return {w,events};
}
test('every Rival yields a raised perch to a quick protected drop and jabs an unattended late return',()=>{
  for(const rival of Object.keys(kits))for(const returner of Object.keys(kits))for(const quick of [true,false]){
    const {w,events}=perch(rival,returner),[hero,guard]=w.dogs;
    assert.deepEqual(w.dogs.map(f=>f.stocks),[2,3]);assert.equal(hero.stockLift.landing,3);
    for(let n=0;n<(quick?67:169);n++)tick(w,{y:quick && n===24?1:0});
    if(quick){
      assert.equal(hero.ground,3);assert(w.bot.gavePerch);assert.equal(guard.ground,0);
      assert(events.some(e=>e.name==='platformDrop' && e.slot===1 && e.platform===3));
      assert.equal(hero.damage,0);
    }else{
      assert(w.bot.challengedReturn);assert(!w.bot.gavePerch);
      const open=events.findIndex(e=>e.name==='stockOpen' && e.slot===0);
      assert(open>=0);
      assert.equal(events.findIndex(e=>e.name==='hit' && e.slot===0),open+1);
      assert.equal(events[open+1].move,kits[rival].ground[0]);
    }
  }
});
test('the jab remains blockable and a shield grab turns a late return around',()=>{
  const {w,events}=perch('brisket');
  for(let n=0;n<190;n++)tick(w,{shield:n>=165,tapped:{grab:n===169}});
  assert(events.some(e=>e.name==='block' && e.move==='brisketCheck'));
  assert.equal(w.grapple.owner,0);assert.equal(w.dogs[0].damage,0);assert.equal(w.dogs[1].stocks,3);
});
test('a normal KO enables the platform read, but a gap, a rising jump or a different landing keeps it out',()=>{
  for(const reason of ['return','gap','jump','drift','rookie','legacy']){
    const {w}=perch('noodle','pip',{stage:reason==='gap'?'laundry':'bandstand',liftOpening:false,cpuLevel:reason==='rookie'?'rookie':'rival'});
    const [hero,guard]=w.dogs;hero.x=-400;tick(w);assert(hero.stockLift && hero.stocks===2);
    const index=reason==='gap'?2:3,p=w.terrain[index];
    Object.assign(guard,{ground:index,x:reason==='gap'?600:581,y:p.y,face:-1,vx:0});
    Object.assign(hero,{stockLift:null,respawning:0,stockGuard:1.5,ground:-1,x:guard.x-38,
      y:p.y-48,vy:reason==='jump'?-260:310,vx:reason==='drift'?-1000:0});
    if(reason==='legacy')delete w.bot.returnPerches;
    for(let n=0;n<4;n++)tick(w);
    assert.equal(!!w.bot.gavePerch,reason==='return',reason);
  }
});
test('seeking through the platform drop preserves the route, the protected frames and the next CPU decision',()=>{
  const {w}=perch('clover'),tape=new FinishTape(),states=[];
  const sample=b=>[b.random.state,b.bot.gavePerch,b.bot.perchExit&&{...b.bot.perchExit},b.dogs.map(f=>[f.ground,f.x,f.y,f.stockGuard])];
  for(let n=0;n<100;n++){
    states.push(sample(w));const i={...idleInput,y:n===24?1:0};
    tape.record(w,i,idleInput);tick(w,i);
  }
  for(const frame of [0,24,27,32,59,88]){
    const play=tape.playback(frame);assert.deepEqual(sample(play.battle),states[frame]);
    while(play.step()){}assert.deepEqual(sample(play.battle),sample(w));
  }
});
test('all four returning Rivals connect with their own down air on every arena and stage form',()=>{
  for(const kind of Object.keys(kits))for(const stage of Object.keys(arenas))for(const form of ['flat','trio','original']){
    for(const p1 of Object.keys(kits)){
      const {w,events}=fight(kind,{stage,form,p1});
      assert.deepEqual(w.dogs.map(f=>f.stocks),[3,2]);
      for(let i=0;i<55;i++)tick(w);
      assert.deepEqual(first(events),{name:'hit',id:kits[kind].air.down},[kind,p1,stage,form].join('/'));
    }
  }
});
test('the shield read commits at departure; a late block or a jump out beats the corresponding choice',()=>{
  for(const kind of Object.keys(kits))for(const choice of ['early','late','roll','jump']){
    const {w,events}=fight(kind);
    for(let n=0;n<56;n++){
      const input=choice==='early'?{shield:true}:choice==='late'?{shield:n>=28}:
        choice==='roll'?{shield:true,x:n>=28 && n<40?-1:0}:{shield:n<25,jump:n>=25 && n<45,x:n>=25?-1:0};
      tick(w,input);
    }
    const expected=choice==='early' || choice==='roll' && kind==='noodle'?{name:'grabCatch',id:kits[kind].grab}:
      choice==='late'?{name:'block',id:kits[kind].air.down}:undefined;
    assert.deepEqual(first(events),expected,kind+'/'+choice);
  }
});
test('an ordinary KO enables the read on either side; a different perch, a moving defender and lower levels rule it out',()=>{
  for(const side of [-1,1])for(const reason of ['clear','away','running','protected','back','rookie','arcade']){
    const {w}=fight('brisket',{liftOpening:false,cpuLevel:['rookie','arcade'].includes(reason)?reason:'rival'});
    const [p,r]=w.dogs;r.x=-3000;tick(w);
    assert.equal(r.stocks,2);assert(r.stockLift);
    const lift=r.stockLift;r.face=side;
    Object.assign(p,{ground:lift.landing,y:w.terrain[lift.landing].y,x:lift.x+side*(reason==='back'?-44:44)});
    for(let n=0;n<24;n++)tick(w);
    if(reason==='away')p.ground=-1;
    if(reason==='running')p.vx=320;
    if(reason==='protected')p.stockGuard=.5;
    w.cpu(1/60);assert.equal(!!w.bot.liftApproach,reason==='clear',side+'/'+reason);
  }
});
test('replaying the descent preserves the committed read, and older CPU recordings keep their original exit',()=>{
  for(const legacy of [false,true])for(const shield of [false,true]){
    const {w}=fight('noodle'), tape=new FinishTape(true),states=[];
    if(legacy)delete w.bot.liftReadEnabled;
    const state=b=>[b.bot.liftApproach?.grab,b.random.state,b.grapple?.phase,b.dogs.map(f=>[f.x,f.y,f.damage,f.stockGuard,f.attack?.moveId])];
    for(let i=0;i<75;i++){
      const input={...idleInput,shield:i<29 && shield};
      states.push(state(w));tape.record(w,input,idleInput);tick(w,input);
    }
    assert.equal(states.some(s=>s[0]!==undefined),!legacy);
    for(const n of [5,26,39,54]){
      const replay=tape.playback(n);assert.deepEqual(state(replay.battle),states[n]);
      while(replay.step()){}assert.deepEqual(state(replay.battle),state(w));
    }
  }
});
