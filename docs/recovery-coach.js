(() => {
  'use strict';
  const {idleInput} = window.DogFight;
  const limit = 180;

  function nearestDeck(battle,dog) {
    let best=null, distance=Infinity;
    for (const p of battle.terrain) {
      if (p.thin) continue;
      const dx=Math.max(0,p.x1-dog.x,dog.x-p.x2);
      const d=dx*dx+(p.y-dog.y)**2;
      if (d<distance) { best=p; distance=d; }
    }
    return best;
  }
  function attempt(tape,plan,emit=()=>{},follow) {
    const slot=plan.slot ?? 0, replay=tape.playback(plan.start,emit,slot), battle=replay.battle, dog=battle.dogs[slot];
    const losses=battle.matchCard.losses.length, round=battle.suddenDeath?.round;
    const player={battle,frame:plan.start,length:plan.start+limit,outcome:null,landed:0,
      jumped:false,cast:false,caught:false,inward:0,outward:0,
      step(input) {
        if (this.outcome) return false;
        const jumps=dog.jumps;
        if(input.x*plan.dir>.28)this.inward++;
        if(input.x*plan.dir<-.28)this.outward++;
        if(!replay.step(input)){
          // Continue from the altered position with the rival's next recorded input.
          // The stock-return clip shares the original fight's absolute tick numbers.
          const tick=tape.count+this.frame-tape.length;
          const block=battle.mode==='local' && follow && tick>=follow.from && tick<follow.count &&
            follow.blocks.findLast(b=>b.start<=tick);
          const other=block?block.inputs[tick-block.start][1-slot]:idleInput;
          battle.step(1/60,slot===0?input:other,slot===1?input:other);
        }
        this.frame++;
        if(dog.jumps<jumps && dog.ground<0 && !dog.ledge && dog.vy<0)this.jumped=true;
        if(dog.attack?.specialSide==='up')this.cast=true;
        if(dog.ledge)this.caught=true;
        const safe=dog.ground>=0 && !dog.grip && !dog.floorAction && !dog.stockLift &&
          !dog.stun && !dog.tumble && !dog.respawning && !dog.ledge;
        this.landed=safe?this.landed+1:0;
        if (battle.matchCard.losses.length>losses && battle.matchCard.losses.slice(losses).some(l=>l.slot===slot)) this.outcome='fell';
        else if(battle.suddenDeath?.round!==round)this.outcome='restart';
        else if (this.landed>=6) this.outcome='landed';
        else if (this.frame>=this.length || battle.end!==null) this.outcome='time';
        return true;
      }};
    return player;
  }
  function controls(route,tick) {
    const {dir,jumpAt,upAt}=route;
    if (tick===upAt) return {...idleInput,x:dir,y:-1,special:true,tapped:{special:true}};
    if (jumpAt!==null && tick>=jumpAt && tick<jumpAt+15)
      return {...idleInput,x:dir,jump:true,tapped:{jump:tick===jumpAt}};
    return {...idleInput,x:dir};
  }
  function routeFrom(tape,start,dir,options,slot,follow) {
    const plan={slot,start,dir,jumpAt:options.jump?0:null,upAt:options.up && !options.jump?0:null};
    const p=attempt(tape,plan,undefined,follow), f=p.battle.dogs[slot];
    if ((options.jump && !f.jumps) || (options.up && f.usedUp)) return null;
    while (!p.outcome) {
      const tick=p.frame-start;
      if (options.jump && options.up && plan.upAt===null && tick>=15 && f.vy>=0 && !f.ledge && f.ground<0)
        plan.upAt=tick;
      p.step(controls(plan,tick));
    }
    if (p.outcome!=='landed' || (options.jump && !p.jumped) || (options.up && !p.cast)) return null;
    plan.end=p.frame;
    return plan;
  }
  function* search(tape,slot=0,follow) {
    const original=tape?.length && tape.playback();
    if (!original || !original.battle.matchCard || ![0,1].includes(slot) ||
      !(original.battle.mode==='local' || original.battle.mode==='solo' && slot===0)) return null;
    let samples=[], lastFall=-1;
    while (original.frame<original.length) {
      const b=original.battle, f=b.dogs[slot], deck=nearestDeck(b,f);
      if (f.ground>=0 || f.ledge || f.stockLift) samples=[];
      const dir=deck && (f.x<deck.x1?1:f.x>deck.x2?-1:0);
      if (dir && f.ground<0 && !f.ledge && !f.grip && !f.stun && !f.tumble && !f.attack && !f.airDodge &&
          !f.stockLift && !f.respawning && !f.floorAction && !f.jumpSquat && !f.impactLag && !f.ledgeTrump &&
          (!samples.length || original.frame-samples.at(-1).start>=6)) {
        const depth=f.y-deck.y, gap=dir>0?deck.x1-f.x:f.x-deck.x2;
        samples.push({start:original.frame,dir,score:Math.abs(depth-36)+Math.abs(gap-68)*.35});
      }
      const before=b.matchCard.losses.length;
      original.step();
      if(b.matchCard.losses.length>before){
        const loss=b.matchCard.losses.slice(before).find(l=>l.slot===slot);
        if(loss){
          if(loss.zone==='bottom')lastFall=original.frame;
          if(original.frame<original.length)samples=[];
        }
      }
      if (original.frame%40===0) yield;
    }
    if (lastFall!==original.length) return null;
    samples.sort((a,b)=>a.score-b.score);
    for (const {start,dir} of samples) {
      for (const options of [{},{jump:true},{up:true},{jump:true,up:true}]) {
        const plan=routeFrom(tape,start,dir,options,slot,follow);
        if (plan) return plan;
        yield;
      }
    }
    return null;
  }

  function instruction(plan,label) {
    const direction=label(plan.dir>0?'right':'left');
    if (plan.jumpAt!==null && plan.upAt!==null)
      return 'Hold '+direction+' and '+label('jump')+'. As the jump peaks, press '+label('up')+' + '+label('special')+'. Keep steering toward the stage.';
    if (plan.jumpAt!==null) return 'Hold '+direction+' and press '+label('jump')+' for an air jump. Keep steering toward the stage.';
    if (plan.upAt!==null) return 'Hold '+direction+' and press '+label('up')+' + '+label('special')+'. Keep steering toward the stage.';
    return 'Hold '+direction+' toward the stage until your paws land.';
  }
  function feedback(p,plan) {
    if(p.outcome==='landed')return (p.battle.matchCard.points && !p.battle.suddenDeath?'You landed onstage and kept the point you lost in the recording.':'You landed onstage with the stock you lost in the recording.')+' Your return took '+((p.frame-plan.start)/60).toFixed(1)+' seconds.';
    if(p.outcome==='restart')return 'Sudden Death started before you landed.';
    if(p.caught)return 'You reached the ledge. Keep holding toward the stage to finish the climb.';
    if(p.outward>3 && p.outward>p.inward)return 'You steered away from the stage. Turn toward the nearest edge as you start.';
    if(plan.jumpAt!==null && !p.jumped)return 'Your air jump never came out. Press Jump as you turn toward the stage.';
    if(plan.upAt!==null && !p.cast)return 'Your Up Special never came out. Aim up as you press Special.';
    return p.outcome==='fell'?'You crossed the blast line. Watch where the example turns toward the stage.':'Your dog was still fighting for a landing when time ran out.';
  }
  function sheet(tape,{showDialog,back,play,label,shake,slot=0,follow},savedPlan) {
    showDialog('finish-recovery','Practice this recovery','<p id="recovery-position" class="clip-caption" hidden></p><p id="recovery-route" role="status">Checking the last fall…</p>'+
      '<canvas id="clip-arena" width="640" height="360" role="img" aria-label="Recorded recovery position" hidden></canvas>'+
      '<p id="recovery-cue" role="status"></p><div class="dialog-actions"><button class="primary" id="recovery-play" hidden>Try this recovery</button>'+
      '<button class="utility" id="recovery-demo" hidden>Watch the recovery</button><button class="utility" id="recovery-fall" hidden>Watch my fall</button>'+
      '<button class="utility" id="recovery-back">Back</button></div>');
    const el=id=>document.getElementById(id), backButton=el('recovery-back'), canvas=el('clip-arena');
    const task=search(tape,slot,follow);
    let plan=savedPlan, raf=0;
    backButton.onclick=()=>{cancelAnimationFrame(raf);back();}; backButton.focus();
    function preview(which) {
      cancelAnimationFrame(raf);
      const example=which==='demo', view=new window.DogFightView.FightView();
      view.shakeEnabled=shake;
      const event=(name,e)=>view.event(name,e);
      const p=example?attempt(tape,plan,event,follow):tape.playback(plan.start,event);
      const point=p.battle.matchCard.points && !p.battle.suddenDeath;
      let last=null, carry=0;
      const draw=dt=>view.draw(canvas,p.battle,dt,p.battle.time);
      draw(0);
      if (!which) return;
      const cue=el('recovery-cue');
      function tick(now) {
        if (!canvas.isConnected || !canvas.closest('dialog')?.open) return;
        carry+=last===null || document.hidden?0:Math.min(.05,(now-last)/1000);
        last=now;
        let count=0;
        while (carry>=1/30 && p.frame<p.length && !p.outcome) {
          const t=p.frame-plan.start;
          if (example) {
            const action=t===plan.upAt?'Up Special':t===plan.jumpAt?'Air jump':'';
            if (action || !t) cue.textContent=action || 'Steer toward the stage';
            p.step(controls(plan,t));
          } else p.step();
          count++;carry-=1/30;
        }
        draw(count/60);
        if (p.outcome || p.frame===p.length) {
          cue.textContent=example?(point?'Landed onstage · point saved.':'Landed onstage with the stock.'):(point?'Recorded fall · point lost.':'Recorded fall · stock lost.');return;
        }
        raf=requestAnimationFrame(tick);
      }
      cue.textContent=example?'Example · half speed':'Your fall · half speed';
      raf=requestAnimationFrame(tick);
    }
    function ready() {
      if(!plan){el('recovery-route').textContent='No landing found from the available recovery positions in this clip. Try an earlier frame in the match replay.';return;}
      const battle=tape.playback(plan.start).battle, dog=battle.dogs[slot], where=el('recovery-position');
      where.textContent=(battle.mode==='local'?'P'+(slot+1)+' · ':'')+dog.stats.name+' · '+Math.round(dog.damage)+'% · '+(plan.dir>0?'Left':'Right')+' of the ledge · '+dog.jumps+' air '+(dog.jumps===1?'jump':'jumps');
      where.hidden=false;
      el('recovery-route').textContent=instruction(plan,label)+(battle.mode==='local'?
        ' Use P1 controls. '+battle.dogs[1-slot].stats.name+' repeats the recorded inputs, then releases the controls when the recording ends.':'');
      for(const id of ['clip-arena','recovery-demo','recovery-play','recovery-fall'])el(id).hidden=false;
      preview(null);
      el('recovery-demo').onclick=()=>preview('demo');el('recovery-fall').onclick=()=>preview('fall');
      el('recovery-play').onclick=()=>{cancelAnimationFrame(raf);play(plan);};
      if(document.activeElement===backButton)el('recovery-play').focus({preventScroll:true});
    }
    function check() {
      if(!backButton.isConnected || !backButton.closest('dialog')?.open)return;
      const until=performance.now()+5;
      do {
        const result=task.next();
        if(result.done){plan=result.value;ready();return;}
      } while(performance.now()<until);
      raf=requestAnimationFrame(check);
    }
    if(plan)ready();else raf=requestAnimationFrame(check);
  }
  window.RecoveryCoach={attempt,controls,search,instruction,feedback,sheet};
})();
