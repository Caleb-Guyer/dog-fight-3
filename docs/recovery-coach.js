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
      jumped:false,cast:false,dodged:false,caught:false,rolled:false,inward:0,outward:0,
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
        if(dog.airDodge?.type==='directionalAirDodge')this.dodged=true;
        if(dog.ledge)this.caught=true;
        if(dog.floorAction?.type==='ledgeRoll')this.rolled=true;
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
    if (!tick && route.aim) return {...idleInput,...route.aim};
    if (route.dodge && tick===(route.dodgeAt ?? 0)) return {...idleInput,...route.dodge,shield:true,tapped:{shield:true}};
    if(tick===route.rollAt)return {...idleInput,shield:true,tapped:{shield:true}};
    if (tick===upAt) return {...idleInput,x:dir,y:-1,special:true,tapped:{special:true}};
    if (jumpAt!==null && tick>=jumpAt && tick<jumpAt+15)
      return {...idleInput,x:dir,jump:true,tapped:{jump:tick===jumpAt}};
    return {...idleInput,x:dir};
  }
  function routeFrom(tape,start,dir,options,slot,follow) {
    const plan={slot,start,dir,jumpAt:options.jump?0:null,upAt:options.up && !options.jump?0:null};
    if(options.dodge)plan.dodge=options.dodge;
    const p=attempt(tape,plan,undefined,follow), f=p.battle.dogs[slot];
    if ((options.jump && !f.jumps) || (options.up && f.usedUp)) return null;
    while (!p.outcome) {
      const tick=p.frame-start;
      if(options.roll && f.ledge && plan.rollAt===undefined)plan.rollAt=tick;
      if (options.jump && options.up && plan.upAt===null && tick>=15 && f.vy>=0 && !f.ledge && f.ground<0)
        plan.upAt=tick;
      p.step(controls(plan,tick));
    }
    if (p.outcome!=='landed' || (options.jump && !p.jumped) || (options.up && !p.cast) ||
        (plan.dodge && !(p.dodged && p.caught)) || (options.roll && !p.rolled)) return null;
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
          !f.wallAction) {
        const depth=f.y-deck.y, gap=dir>0?deck.x1-f.x:f.x-deck.x2;
        const input=b.lastDodgeInput(f,deck);
        const dodge=input && {x:input.x,y:input.y}, last=samples.at(-1);
        if(!last || original.frame-last.start>=6 || (dodge && (last.dodge?.x!==dodge.x || last.dodge?.y!==dodge.y)))
          samples.push({start:original.frame,dir,dodge,score:Math.abs(depth-36)+Math.abs(gap-68)*.35});
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
    for (const {start,dir,dodge} of samples) {
      for (const options of dodge?[{},{dodge},{dodge,roll:true}]:[{},{jump:true},{up:true},{jump:true,up:true}]) {
        const plan=routeFrom(tape,start,dir,options,slot,follow);
        if (plan) return plan;
        yield;
      }
    }
    return null;
  }

  function* searchLaunch(tape,launch,follow) {
    const {frame,slot}=launch, start=frame-1;
    const opening=tape.playback(start)?.battle, dog=opening?.dogs[slot];
    if(!dog?.tumble?.pending || !opening.hitStop || frame>tape.length ||
        !(opening.mode==='local' || opening.mode==='solo' && slot===0))return null;
    const home=dog.x<opening.stageWidth/2?1:-1;
    const aims=[[home,0],[-home,0],[0,1],[0,-1],[home,-1],[home,1],[-home,-1],[-home,1],[0,0]];
    for(const [x,y] of aims){
      for(const action of ['drift','up','dodgeDown','dodgeIn','jump','dodgeUpIn']){
        const plan={slot,start,aim:{x,y},dir:home,jumpAt:null,upAt:null};
        const p=attempt(tape,plan,undefined,follow), b=p.battle, f=b.dogs[slot];
        p.step(controls(plan,0));
        // Drift back against the launch. If the flight ends outside the deck, aim for that lip.
        const deck=nearestDeck(b,f), path=b.projectLaunch(f,f.vx,f.vy);
        plan.dir=path.x<deck.x1?1:path.x>deck.x2?-1:Math.sign(-f.vx) || home;
        let acted=false;
        while(!p.outcome){
          const t=p.frame-start, dodge=action.startsWith('dodge');
          if(!acted && action!=='drift' && ((!f.stun && !f.tumble?.pending) || dodge && b.canEscapeHitstun(f,false))){
            if(action==='up')plan.upAt=t;
            else if(action==='jump')plan.jumpAt=t;
            else {
              plan.dodgeAt=t;
              plan.dodge={x:action==='dodgeDown'?0:plan.dir,y:action==='dodgeDown'?1:action==='dodgeUpIn'?-1:0};
            }
            acted=true;
          }
          p.step(controls(plan,t));
          if(t%20===0)yield;
        }
        if(p.outcome==='landed' && (action==='drift' || action==='up' && p.cast ||
            action==='jump' && p.jumped || plan.dodge && p.dodged)){
          plan.end=p.frame;
          return plan;
        }
        yield;
      }
    }
    return null;
  }

  function instruction(plan,label) {
    const direction=label(plan.dir>0?'right':'left');
    if(plan.aim){
      const opener='As the hit releases, aim '+stickName(plan.aim,label)+'. Then hold '+direction+'. ';
      const next=plan.dodge?'Aim '+stickName(plan.dodge,label)+' and tap '+label('shield')+' for an air dodge. ':
        plan.upAt!==null?'Aim '+label('up')+' and tap '+label('special')+' to recover. ':
        plan.jumpAt!==null?'Tap '+label('jump')+' for an air jump. ':'';
      return opener+next+'Keep steering '+direction+' to land.';
    }
    if(plan.dodge)return 'Aim '+dodgeAim(plan,label)+' and tap '+label('shield')+' to catch the ledge. '+
      (plan.rollAt!==undefined?'Release '+label('shield')+', then tap it again as your paws catch to roll onto the stage.':'Then hold '+direction+' to climb.');
    if (plan.jumpAt!==null && plan.upAt!==null)
      return 'Hold '+direction+' and '+label('jump')+'. As the jump peaks, press '+label('up')+' + '+label('special')+'. Keep steering toward the stage.';
    if (plan.jumpAt!==null) return 'Hold '+direction+' and press '+label('jump')+' for an air jump. Keep steering toward the stage.';
    if (plan.upAt!==null) return 'Hold '+direction+' and press '+label('up')+' + '+label('special')+'. Keep steering toward the stage.';
    return 'Hold '+direction+' toward the stage until your paws land.';
  }
  function stickName({x,y},label) {
    return [y && label(y<0?'up':'down'),x && label(x>0?'right':'left')].filter(Boolean).join(' + ') || 'center';
  }
  const dodgeAim=(plan,label)=>stickName(plan.dodge,label);
  function aligned(input,aim) {
    const length=Math.hypot(input.x,input.y), target=Math.hypot(aim.x,aim.y);
    return target ? length>=.55 && (aim.x*input.x+aim.y*input.y)/(length*target)>.97 : length<.2;
  }
  function gate(plan,tick,input,label,dog) {
    if(plan.aim && !tick)return aligned(input,plan.aim)?'':stickName(plan.aim,label)+' · Steer the launch';
    if(plan.aim && (tick===1 || tick===plan.dodgeAt+1 || plan.upAt!==null && tick===plan.upAt+1) && input.x*plan.dir<.55)
      return label(plan.dir>0?'right':'left')+' · Drift back';
    if(plan.rollAt!==undefined){
      if(tick===1 && input.shield)return 'Release '+label('shield');
      if(dog?.ledge){
        if(dog.prev.shield && !input.tapped?.shield)return input.shield?'Release '+label('shield'):'';
        return input.shield || input.tapped?.shield?'':label('shield')+' · Roll';
      }
    }
    if(dog?.ledge)return input.x*(dog.ledge.left?1:-1)>.5?'':label(dog.ledge.left?'right':'left')+' · Climb';
    if(tick && tick!==plan.upAt && tick!==plan.jumpAt && tick!==plan.dodgeAt)return '';
    const inward=input.x*plan.dir>.5, side=label(plan.dir>0?'right':'left');
    const pressed=k=>input[k] || input.tapped?.[k];
    if(plan.dodge && tick===(plan.dodgeAt ?? 0)){
      const {x,y}=plan.dodge, length=Math.hypot(input.x,input.y);
      const aimed=plan.aim?aligned(input,plan.dodge):length>=.35 && (x*input.x+y*input.y)/length>=.99;
      if(!pressed('shield') || !aimed)
        return dodgeAim(plan,label)+' + '+label('shield');
    }else if(tick===plan.upAt){
      if(!inward || input.y>=-.55 || !pressed('special'))return side+' + '+label('up')+' + '+label('special');
    }else if(tick===plan.jumpAt){
      if(!inward || !pressed('jump'))return side+' + '+label('jump');
    }else if(!tick && !inward)return side;
    return '';
  }
  function feedback(p,plan,projection=false) {
    if(projection && p.outcome==='landed')return 'You got back onstage with the same stock in '+((p.frame-plan.start)/60).toFixed(1)+' seconds.';
    if(p.outcome==='landed')return (p.battle.matchCard.points && !p.battle.suddenDeath?'You landed onstage and kept the point you lost in the recording.':'You landed onstage with the stock you lost in the recording.')+' Your return took '+((p.frame-plan.start)/60).toFixed(1)+' seconds.';
    if(p.outcome==='restart')return 'Sudden Death started before you landed.';
    if(p.caught)return plan.rollAt!==undefined && !p.rolled?'You reached the ledge. Release Shield, then tap it again on the ledge to roll past the guard.':
      'You reached the ledge. Keep holding toward the stage to finish the climb.';
    if(p.outward>3 && p.outward>p.inward)return 'You steered away from the stage. Turn toward the nearest edge as you start.';
    if(plan.aim && p.outcome==='fell')return p.frame<=plan.start+(plan.dodgeAt ?? plan.upAt ?? plan.jumpAt ?? 1)?
      'You crossed the blast line before the follow-up. Watch the stick direction as the hit releases.':
      'You crossed the blast line on the return. Try Guide my inputs to practice the timing.';
    if(plan.dodge)return p.dodged?'Your dodge missed the ledge. Watch the direction of the example when the dodge starts.':
      'The directional air dodge never started. Aim before you tap Shield.';
    if(plan.jumpAt!==null && !p.jumped)return 'Your air jump never came out. Press Jump as you turn toward the stage.';
    if(plan.upAt!==null && !p.cast)return 'Your Up Special never came out. Aim up as you press Special.';
    return p.outcome==='fell'?'You crossed the blast line. Watch where the example turns toward the stage.':'Your dog was still fighting for a landing when time ran out.';
  }
  function sheet(tape,{showDialog,back,play,label,shake,slot=0,follow,swap,projection,launch},savedPlan) {
    showDialog('finish-recovery',launch?'Survive this launch':'Practice this recovery','<p id="recovery-position" class="clip-caption" hidden></p><p id="recovery-route" role="status">'+(launch?'Trying launch angles and returns…':'Checking the last fall…')+'</p>'+
      '<canvas id="clip-arena" width="640" height="360" role="img" aria-label="Recorded recovery position" hidden></canvas>'+
      '<p id="recovery-cue" role="status"></p><div class="dialog-actions"><button class="primary" id="recovery-play" hidden>Try this recovery</button>'+
      '<button class="utility" id="recovery-guide" hidden>Guide my inputs</button>'+
      '<button class="utility" id="recovery-demo" hidden>Watch the recovery</button><button class="utility" id="recovery-fall" hidden>'+
      (projection?'Watch without input':'Watch my fall')+'</button>'+
      (swap?'<button class="utility" id="recovery-swap">'+swap.title+'</button>':'')+
      '<button class="utility" id="recovery-back">'+(swap?'Fight School':'Back')+'</button></div>');
    const el=id=>document.getElementById(id), backButton=el('recovery-back'), canvas=el('clip-arena');
    const task=launch?searchLaunch(tape,launch,follow):search(tape,slot,follow);
    let plan=savedPlan, raf=0;
    backButton.onclick=()=>{cancelAnimationFrame(raf);back();}; backButton.focus();
    if(swap)el('recovery-swap').onclick=()=>{cancelAnimationFrame(raf);swap.open();};
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
            const action=!t && plan.aim?'Steer the launch · '+stickName(plan.aim,label):
              plan.dodge && t===(plan.dodgeAt ?? 0)?'Air dodge · '+dodgeAim(plan,label):
              t===1 && plan.aim?'Drift · '+label(plan.dir>0?'right':'left'):t===plan.rollAt?'Ledge roll · '+label('shield'):t===plan.upAt?'Up Special':t===plan.jumpAt?'Air jump':'';
            if (action || !t) cue.textContent=action || 'Steer toward the stage';
            p.step(controls(plan,t));
          } else p.step();
          count++;carry-=1/30;
        }
        draw(count/60);
        if (p.outcome || p.frame===p.length) {
          cue.textContent=example?(point?'Landed onstage · point saved.':'Landed onstage with the stock.'):
            (projection?'Without input':'Recorded fall')+(point?' · point lost.':' · stock lost.');return;
        }
        raf=requestAnimationFrame(tick);
      }
      cue.textContent=(example?'Example':projection?'Without input':'Your fall')+' · half speed';
      raf=requestAnimationFrame(tick);
    }
    function ready() {
      if(!plan){el('recovery-route').textContent=launch?'None of the tested launch angles and follow-ups got this stock back onstage. In the replay, try defending before the hit.':'No landing found from the available recovery positions in this clip. Try an earlier frame in the match replay.';return;}
      const battle=tape.playback(plan.start).battle, dog=battle.dogs[slot], where=el('recovery-position');
      where.textContent=(battle.mode==='local'?'P'+(slot+1)+' · ':'')+dog.stats.name+' · '+Math.round(dog.damage)+'% · '+
        (launch?'Impact to landing · '+(plan.end-plan.start)+' frames':(plan.dir>0?'Left':'Right')+' of the ledge · '+dog.jumps+' air '+(dog.jumps===1?'jump':'jumps'));
      where.hidden=false;
      el('recovery-route').textContent=instruction(plan,label)+(battle.mode==='local'?
        ' Use P1 controls. '+battle.dogs[1-slot].stats.name+' repeats the recorded inputs, then releases the controls when the recording ends.':'');
      for(const id of ['clip-arena','recovery-demo','recovery-play','recovery-guide','recovery-fall'])el(id).hidden=false;
      preview(null);
      el('recovery-demo').onclick=()=>preview('demo');el('recovery-fall').onclick=()=>preview('fall');
      el('recovery-play').onclick=()=>{cancelAnimationFrame(raf);play(plan);};
      el('recovery-guide').onclick=()=>{cancelAnimationFrame(raf);play(plan,true);};
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
  function recordFall(source,fromLaunch=false) {
    const tape=new window.DogFight.FinishTape(true), battle=tape.copy(source);
    let launch;
    if(fromLaunch)battle.emit=(name,e)=>{if(name==='launchDI' && e.f.index===0)launch={slot:0,frame:tape.count};};
    for(let tick=0;tick<150 && battle.end===null && !tape.knockouts.length;tick++){
      tape.record(battle,idleInput,idleInput);battle.step(1/60,idleInput,idleInput);tape.captureKnockouts(battle);
    }
    return {battle,tape,launch,clip:tape.knockouts.find(c=>c.losses.some(l=>l.slot===0 && (fromLaunch || l.zone==='bottom')))};
  }
  function example(wide,fromLaunch=false) {
    const {Battle,seededRandom}=window.DogFight;
    const config={mode:'solo',p1:'pip',p2:'brisket',cpuLevel:'rookie',stage:'picnic',fetch:false,stockCount:3};
    if(fromLaunch)Object.assign(config,{stage:'nightmail',form:'trio',cpuLevel:'rival',throwOpening:wide?'edge':'perch'});
    const battle=new Battle(config,undefined,seededRandom(fromLaunch?31:42));
    if(fromLaunch)return {config,...recordFall(battle,true)};
    battle.placeLastDodge(wide?'right':'left',wide,0);
    const floor=battle.terrain[0];
    battle.dogs[1].x=(floor.x1+floor.x2)/2;
    return {config,...recordFall(battle)};
  }
  function actions(review){
    const exit=review.rescue?'Fight School':review.from==='pause'?'Back to fight':
      ['card','archive'].includes(review.from)?'Back to match stats':'Back to results';
    return '<div class="dialog-actions"><button class="primary" data-do="trial-retry">Retry recovery</button>'+
      '<button class="utility" data-do="recovery-speed">'+(review.guided?'Try at match speed':'Guide my inputs')+'</button>'+
      '<button class="utility" data-do="trial-replay">Back to demonstration</button>'+
      '<button class="utility" data-do="trial-results">'+exit+'</button></div>';
  }
  window.RecoveryCoach={attempt,controls,search,searchLaunch,instruction,feedback,sheet,gate,example,recordFall,actions};
})();
