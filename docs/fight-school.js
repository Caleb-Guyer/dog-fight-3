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
      if (!this.example && (this.guideLoading || (this.guide && !this.guide.allows(input))))return false;
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
      if(!this.example)this.guide?.advance(world);
      const f=world.dogs[0];
      if (this.id==='move' && f.x>=600 && f.ground===0) this.done=true;
      if (this.id==='platform' && f.ground===1) this.done=true;
      if (this.id==='return') {
        if (f.attack?.specialSide==='up') this.cast=true;
        if ((this.cast || this.caught) && f.ground===0 && !f.ledge && !f.floorAction) this.done=true;
      }
    }
    drawCourse(ctx){if(!this.example && !this.done)this.guide?.draw(ctx);}
  }
  const cornerTips={
    opening:['jab','First stock','Close in on Brisket. Release the direction and tap {attack} for a jab.'],
    guard:['guard','Under pressure','Hold {shield} before Brisket’s next swing to block it.'],
    grab:['throw','Brisket is shielding','Get within paw’s reach and tap {grab} to catch him through his shield.'],
    finish:['stock','At the edge','Face the edge. Hold {side} + {smash}, then release {smash} to launch Brisket.'],
    jump:['return','Air jump available','Steer {side} toward the ledge and tap {jump} for height.'],
    rise:['return','Recover with Fence Hopper','Aim {up} + {special}, then steer {side} toward the ledge.'],
    hop:['return','Second hop available','Release {special}. Aim {up} and tap {special} again while steering {side}.'],
    drift:['return','Drift toward the ledge','Hold {side} to bring Pip back within reach.'],
    hang:['return','Ledge caught','Tap {side} to climb onto the stage, or tap {jump} to jump from the ledge.'],
    lift:['launch-stock-return','Your next stock','When the lamps turn mint, tap {down} to drop or {jump} to spring off. To replay the stock you lost, choose Retry my stock in Pause.'],
    landing:['launch-stock-catch','Brisket is protected','Make room for his landing. Once his last mail tag goes out, a hit or grab can connect.'],
  };
  function cornerSituation(world){
    const [pip,brisket]=world.dogs, floor=world.terrain[0];
    if(world.end!==null || world.suddenDeath)return '';
    if(pip.stockLift)return 'lift';
    if(pip.respawning)return '';
    if(pip.ledge)return 'hang/'+(pip.ledge.left?'right':'left');
    if(pip.ground<0 && (pip.x<floor.x1 || pip.x>floor.x2)){
      const side=pip.x<floor.x1?'right':'left';
      if(pip.stun>0 || pip.impactLag>0)return 'drift/'+side;
      const move=pip.hopWindow>0?'hop':pip.jumps>0?'jump':!pip.usedUp?'rise':'drift';
      return move+'/'+side;
    }
    if(brisket.stockLift || brisket.stockGuard)return 'landing';
    if(pip.ground<0 || brisket.ground<0 || world.grapple)return '';
    const near=Math.abs(pip.y-brisket.y)<60 && Math.abs(pip.x-brisket.x)<110;
    if(near && brisket.shield)return 'grab';
    if(near && brisket.damage>=105){
      if(brisket.x>pip.x && floor.x2-brisket.x<150)return 'finish/right';
      if(brisket.x<pip.x && brisket.x-floor.x1<150)return 'finish/left';
    }
    const [you,cpu]=world.matchCard.players;
    if(cpu.hits>=2 && !you.blocks && !you.parries)return 'guard';
    return !you.hits && world.matchFrames<=360?'opening':'';
  }
  const targets={
    return:['Get back onstage after going off the edge.','You made it back onstage.'],
    guard:['Block or parry a hit from Brisket.','You defended against Brisket’s hit.'],
    jab:['Land the opening jab on Brisket.','Your opening jab connected.'],
    stock:['Take a stock with Pip’s side smash.','Your side smash took a stock.']
  };
  class RematchTarget {
    constructor(id){this.id=id;this.offstage=false;this.doneAt=null;}
    get title(){return this.doneAt===null?'Rematch target':'Target met';}
    get line(){return targets[this.id][this.doneAt===null?0:1];}
    contact(name,e,world){
      if(this.doneAt!==null)return;
      const who=e.f?.index;
      if(name==='ko' && who===0)this.offstage=false;
      if(this.id==='guard' && who===0 && (name==='block' || name==='parry'))this.doneAt=world.matchFrames;
      if(this.id==='jab' && name==='hit' && who===1 && e.owner?.index===0 && e.moveId===e.owner.kit.ground[0])this.doneAt=world.matchFrames;
      if(this.id==='stock' && name==='ko' && who===1){
        const last=world.matchCard.players[1].lastHit;
        if(last?.id===world.dogs[0].kit.smashes.side && world.matchFrames-last.frame<=600)this.doneAt=world.matchFrames;
      }
    }
    step(world){
      if(this.id!=='return' || this.doneAt!==null)return;
      const pip=world.dogs[0],floor=world.terrain[0];
      if(!pip.stocks || pip.stockLift || pip.respawning){this.offstage=false;return;}
      if(pip.ledge || pip.ground<0 && (pip.x<floor.x1 || pip.x>floor.x2))this.offstage=true;
      if(this.offstage && pip.ground>=0 && !pip.ledge && !pip.floorAction)this.doneAt=world.matchFrames;
    }
  }
  class Corner {
    constructor(id){this.seen=new Set();this.stock=0;this.cue='';this.lesson='jab';this.until=0;
      this.target=Object.hasOwn(targets,id)?new RematchTarget(id):null;}
    get practice(){return this.target?.doneAt===null?this.target.id:this.lesson;}
    read(world){
      const stock=world.dogs[0].stocks, frame=world.matchFrames;
      if(stock!==this.stock){this.stock=stock;this.seen.clear();this.cue='';}
      const cue=cornerSituation(world);
      if(cue!==this.cue){
        this.cue=cue;this.until=0;
        if(cue){
          const id=cue.split('/')[0];
          this.lesson=cornerTips[id][0];
          if(this.lesson==='return')this.until=Infinity;
          else if(!this.seen.has(cue)){this.seen.add(cue);this.until=frame+210;}
        }
      }
      return frame<this.until?cue:'';
    }
  }
  function cornerLine(cue,label){
    const [id,side]=cue.split('/'), [,title,line]=cornerTips[id];
    return [title,line.replace(/\{(\w+)\}/g,(_,action)=>label(action==='side'?side:action))];
  }
  function readProgress(raw) {
    const passed=lessons.filter(l=>Array.isArray(raw?.passed) && raw.passed.includes(l.id)).map(l=>l.id);
    const index=Math.max(0,lessons.findIndex(l=>l.id===raw?.lesson));
    const won=raw?.firstFightWon===true,r=raw?.rematch;
    const rematch=!won && r && Object.hasOwn(targets,r.id) && typeof r.ticket==='string' && /^\d{16}-[0-9a-f]{16}$/.test(r.ticket)?
      {id:r.id,ticket:r.ticket,fight:r.fight===true}:null;
    return {seen:raw?.seen===true,started:raw?.started===true || passed.length>0 || index>0 || !!rematch,
      firstFightWon:won,rematch,
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
  function updateRematch(save,change){
    if(change?.won)save.firstFightWon=true;
    if(save.firstFightWon){save.rematch=null;return;}
    if(change?.loss)save.rematch={id:change.loss,ticket:change.ticket,fight:false};
    if(change?.fight && save.rematch?.ticket===change.fight)save.rematch.fight=true;
  }
  function rematchLesson(card) {
    const falls=card.losses.filter(loss=>loss.slot===0 && loss.zone==='bottom').length;
    if (falls) return {id:'return',button:'Practice recovery',reason:'Pip lost '+falls+(falls===1?' stock':' stocks')+' below the stage. Try reaching the ledge with Up Special.'};
    const [pip,brisket]=card.players;
    if (brisket.hits && !pip.blocks && !pip.parries) return {id:'guard',button:'Practice blocking',reason:'Brisket landed '+brisket.hits+(brisket.hits===1?' hit':' hits')+'. Practice blocking his swing.'};
    if (!pip.hits) return {id:'jab',button:'Practice jabs',reason:'Pip finished without landing a hit. Try a jab when Brisket is within paw’s reach.'};
    return {id:'stock',button:'Practice knockouts',reason:'Practice charging a side smash to finish a stock near the edge.'};
  }
  window.FightSchool={lessons,Lesson,Corner,cornerLine,readProgress,unfinished,rematchLesson,updateRematch};
})();
