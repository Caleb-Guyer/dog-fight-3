const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/engine.js');require('../docs/fighter-lessons.js');
const {Battle,kits,idleInput,seededRandom}=window.DogFight;
const {study,makeTrial,Demonstration}=window.FighterSchool;
for(const kind of Object.keys(kits)){
  test(kind+' demonstrates all four specials with normal fight inputs',()=>{
    for(const [direction,id] of Object.entries(kits[kind].specials)){
      const events=[];
      const movie=new Demonstration(kind,direction,2,(event,e)=>events.push([event,e.moveId]));
      while(!movie.ended)movie.step();
      assert(movie.trial.done && !movie.trial.missed,id);
      assert(events.some(([event,move])=>move===id),id);
      assert.equal(movie.tail,45);
      const copy=new Demonstration(kind,direction,2);
      for(let f=0;f<movie.frame;f++)copy.step();
      assert.deepEqual(copy.battle.dogs.map(d=>[d.x,d.y,d.damage,d.stocks]),movie.battle.dogs.map(d=>[d.x,d.y,d.damage,d.stocks]));
      movie.step();assert.equal(movie.frame,copy.frame);
      const spec=study(kind,direction);
      let lesson;
      const w=new Battle({mode:'local',p1:kind,p2:spec.rival,stage:spec.stage,minutes:0,fetch:false,lesson:spec.index},
        (name,e)=>lesson?.contact(name,e),seededRandom(5));
      lesson=makeTrial(spec.index,w);
      for(let i=0;i<210;i++)if(lesson.canStep(idleInput)){w.step(1/60,idleInput,lesson.partner(idleInput));lesson.afterStep(w);}
      assert.equal(lesson.done,false,'Watching or waiting cannot earn '+id);
    }
  });
}
test('the second beat or returning disc must connect during the same use',()=>{
  for(const kind of ['pip','clover']){
    const spec=study(kind,'neutral'),w=new Battle({mode:'local',p1:kind,p2:spec.rival,stage:spec.stage,fetch:false});
    const trial=makeTrial(spec.index,w),[f,target]=w.dogs;
    const first=()=>{trial.contact('special',{f,moveId:spec.id});trial.contact('hit',{owner:f,f:target,moveId:spec.id});};
    first();first();assert.equal(trial.done,false);
    trial.contact('hit',{owner:f,f:target,moveId:spec.id});assert.equal(trial.done,true);
  }
});
