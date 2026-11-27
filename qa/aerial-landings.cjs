const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
global.window={matchMedia:()=>({matches:false})};
require('../docs/engine.js');require('../docs/fighter-lessons.js');
function inspect(file,marker,expose){
  const source=fs.readFileSync(path.join(__dirname,'../docs',file),'utf8');
  new Function('window',source.replace(marker,expose+';'+marker))(window);
}
inspect('render.js','window.DogFightView = {','window.pose=pose');
inspect('fighters-art.js','window.DogArt = Object.freeze(','window.frameFor=getFrame');
const {kits,moves,idleInput}=window.DogFight;
for(const [kind,kit] of Object.entries(kits))test(kind+' shows the committed aerial until its first actionable shield frame',()=>{
  const contacts=new Set();
  for(const [side,id] of Object.entries(kit.air)){
    const pose=id+'Land',move=moves[id];
    const pixels=n=>Buffer.from(window.frameFor(kind,pose,n).indices).toString('base64');
    assert.notEqual(pixels(0),pixels(3));contacts.add(pixels(0));
    const flights=[];
    for(const late of [false,true]){
      const film=new window.FighterSchool.Demonstration(kind,'land-'+side,2,null,late);
      assert.equal(film.trial.canStep(idleInput),false);
      const dog=film.battle.dogs[0];
      const lag=late?move.land:Math.ceil(move.land/2);
      let ticks=0,previous=-1;
      while(!film.ended){
        film.step();
        const [actual,phase]=window.pose(dog,null,null);
        if(dog.landingLag>1e-8){
          assert.equal(actual,pose,kind+' '+side);
          assert(phase>=previous && phase<1);previous=phase;ticks++;
        }else assert.notEqual(actual,pose);
      }
      assert.equal(ticks,lag);assert.equal(film.trial.frames,lag);assert.equal(film.trial.shieldAt,lag);
      assert.equal(film.trial.done,!late);assert.equal(film.trial.missed,late);
      flights.push(film.trial.landedAt);
    }
    assert.equal(flights[0],flights[1],'both inputs reach the same touchdown');
  }
  assert.equal(contacts.size,5,'each aerial has a distinct touchdown drawing');
});
