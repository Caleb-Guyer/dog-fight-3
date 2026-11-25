(() => {
  'use strict';
  const {idleInput} = window.DogFight;
  // Prompts use action names so the same course can explain each input device.
  const lessons = [
    ['move','Take center stage','Move right from the left side of the roof. Hold the direction until Pip reaches the middle.','You took center stage.'],
    ['platform','Jump onto a platform','Stand under the left bench and hold Jump. You can pass through from below. Release, then press Jump again in the air for extra height. Land on the bench.','The bench caught your landing. Tap Down to drop through in a fight.'],
    ['jab','Deal damage','Stand beside Brisket, center your direction and tap Attack. Watch his percentage when your paw connects.','Higher damage makes the next launch go farther.'],
    ['tilt','Aim a ground attack','Keep your paws on the roof. Aim Down and tap Attack to sweep Brisket with Pip’s down tilt.','Your low sweep connected. Up and forward give Pip different tilts.'],
    ['air','Attack in the air','Stay close. Tap Jump and Attack together for a short-hop aerial. You can also attack after takeoff.','Your aerial connected. Aim forward, back, up or down for different attacks.'],
    ['guard','Block a hit','Stand your ground and hold Shield. Brisket will swing at the bubble.','You blocked the hit. Shields shrink under pressure. A grab can reach through one.'],
    ['throw','Throw a shielding rival','Tap Grab beside Brisket’s shield. Once Pip holds him, tap Right to throw. You can tap Attack to pummel first.','Your throw beat the shield. Try a different direction for a different follow-up.'],
    ['special','Use a special','Face Brisket, hold Right and tap Special for Pip’s Double Pounce. Hit him with the pounce.','Your side special connected. Every dog has four directional specials.'],
    ['return','Recover to the stage','Pip is off the left edge. Use Up + Special and steer right to land on the roof. If you catch the edge, tap Jump or move toward the roof to climb.','You made it back onstage. Save your air jump and Up Special for the return trip.'],
    ['stock','Take a stock','Brisket is at 155% near the right edge. Face him, hold Right + Smash, then release Smash to launch him beyond the boundary.','That knockout cost Brisket a stock. Take all three to win a stock fight.'],
  ].map(([id,title,task,success])=>({id,title,task,success}));

  class Lesson {
    constructor(index, world) {
      this.index = index;
      this.id = lessons[index].id;
      this.done = false;
      this.missed = false;
      this.started = false;
      this.ticks = 0;
      const [pip,brisket] = world.dogs, floor = world.terrain[0];
      let x = 560, rivalX = x + 58;
      if (this.id === 'move') { x = 360; rivalX = 868; }
      if (this.id === 'platform') { x = 411; rivalX = 835; }
      if (this.id === 'return') { x = floor.x1-50; rivalX = 750; }
      if (this.id === 'stock') { x = floor.x2-110; rivalX = x+62; }
      for (const [i,f] of world.dogs.entries()) Object.assign(f,{
        x:i?rivalX:x,y:floor.y,face:i?-1:1,ground:0,vx:0,vy:0,invuln:0,stockGuard:0
      });
      if (this.id === 'return') Object.assign(pip,{ground:-1,y:floor.y+44,jumps:1,coyote:0});
      if (this.id === 'stock') brisket.damage=155;
    }
    canStep(input) {
      if (this.done || this.missed) return false;
      if (this.id === 'return' && !this.started && !(input.special || input.tapped?.special || input.jump || input.tapped?.jump)) return false;
      this.started=true;
      return true;
    }
    partner(input) {
      if (this.id === 'throw') return {...idleInput,shield:true};
      if (this.id === 'guard' && input.shield) {
        this.ticks++;
        return {...idleInput,attack:this.ticks%48===12,quickAttack:true};
      }
      return idleInput;
    }
    contact(name,e) {
      if (this.done || this.missed) return;
      const player=e.f?.index===0, target=e.f?.index===1;
      if (name==='ko') {
        if (target && this.id==='stock' && this.launched) this.done=true;
        else this.missed=true;
      } else if (name==='block' && player && this.id==='guard') this.done=true;
      else if (name==='throwRelease' && player && this.id==='throw') this.done=true;
      else if (name==='ledge' && player && this.id==='return') this.caught=true;
      else if (name==='hit' && target && e.owner?.index===0) {
        const f=e.owner, move=e.moveId;
        if (this.id==='stock' && move===f.kit.smashes.side) this.launched=f.attack?.power>=.15;
        if ((this.id==='jab' && move===f.kit.ground[0]) ||
            (this.id==='tilt' && move===f.kit.tilts.down) ||
            (this.id==='air' && Object.values(f.kit.air).includes(move)) ||
            (this.id==='special' && move===f.kit.specials.side)) this.done=true;
      }
    }
    afterStep(world) {
      const f=world.dogs[0];
      if (this.id==='move' && f.x>=600 && f.ground===0) this.done=true;
      if (this.id==='platform' && f.ground===1) this.done=true;
      if (this.id==='return') {
        if (f.attack?.specialSide==='up') this.cast=true;
        if ((this.cast || this.caught) && f.ground===0 && !f.ledge && !f.floorAction) this.done=true;
      }
    }
  }
  function readProgress(raw) {
    const passed=lessons.filter(l=>Array.isArray(raw?.passed) && raw.passed.includes(l.id)).map(l=>l.id);
    const index=Math.max(0,lessons.findIndex(l=>l.id===raw?.lesson));
    return {seen:raw?.seen===true,started:raw?.started===true || passed.length>0 || index>0,
      firstFightDone:raw?.firstFightDone===true,playedAt:Number.isSafeInteger(raw?.playedAt) && raw.playedAt>0 ? raw.playedAt : 0,
      index,passed};
  }
  function unfinished(progress) {
    for (let n=0;n<lessons.length;n++) {
      const i=(progress.index+n)%lessons.length;
      if (!progress.passed.includes(lessons[i].id)) return i;
    }
    return -1;
  }
  function rematchLesson(card) {
    const falls=card.losses.filter(loss=>loss.slot===0 && loss.zone==='bottom').length;
    if (falls) return {id:'return',button:'Practice recovery',reason:'Pip lost '+falls+(falls===1?' stock':' stocks')+' below the stage. Try reaching the ledge with Up Special.'};
    const [pip,brisket]=card.players;
    if (brisket.hits && !pip.blocks && !pip.parries) return {id:'guard',button:'Practice blocking',reason:'Brisket landed '+brisket.hits+(brisket.hits===1?' hit':' hits')+'. Practice blocking his swing.'};
    if (!pip.hits) return {id:'jab',button:'Practice jabs',reason:'Pip finished without landing a hit. Try a jab when Brisket is within paw’s reach.'};
    return {id:'stock',button:'Practice knockouts',reason:'Practice charging a side smash to finish a stock near the edge.'};
  }
  window.FightSchool={lessons,Lesson,readProgress,unfinished,rematchLesson};
})();
