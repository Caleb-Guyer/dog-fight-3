(() => {
  'use strict';
  const {Battle, fighters, seededRandom} = window.DogFight;
  const events = {
    'wrong-way': {
      name:'Wrong Way', p1:'pip', p2:'brisket', stage:'nightmail', form:'flat', landingRead:'through',
      goal:'Punish Brisket’s missed sweep', time:5,
      brief:'Brisket expects Pip to roll through him. Tap Shield with the stick centered just before touchdown. Tap Attack as he sweeps behind himself.',
      clear:'You planted on the roof and hit Brisket before he recovered.',
    },
    'high-ground': {
      name:'High Ground', p1:'clover', p2:'brisket', stage:'bandstand', form:'original', liftOpening:'perch',
      goal:'Hold the top perch for 3 seconds', time:25,
      brief:'Clover rides the lift above Brisket. Tap Down as the lift lights turn mint. Time adds up while Clover stands alone on the top perch. Keep your stock until you have three seconds.',
      clear:'Clover held the top perch for three seconds.',
    },
    'last-delivery': {
      name:'Last Delivery', p1:'brisket', p2:'pip', stage:'nightmail', form:'flat', finalCount:'chase',
      goal:'Take the lead before the horn', time:10,
      brief:'Brisket starts a point behind Pip with ten seconds left. A credited knockout puts you ahead. Close the distance, or draw Pip toward the blast line.',
      clear:'Brisket overtook Pip before the horn.',
    },
  };
  const ids=Object.keys(events), memory=new Map(), prefix='dog-fight-3.event-best.';
  const stamp=frames=>(frames/60).toFixed(2)+' s';
  function best(store,id){
    let value=0;
    try{value=Number(store.getItem(prefix+id));}catch{}
    return Math.min(memory.get(id) || Infinity, Number.isSafeInteger(value) && value>0?value:Infinity);
  }
  function remember(store,id,frames){
    if(frames>=best(store,id))return;
    memory.set(id,frames);
    const write=()=>{
      try{store.setItem(prefix+id,String(best(store,id)));}catch{}
    };
    if(globalThis.navigator?.locks)navigator.locks.request(prefix+id,write).catch(write);
    else write();
  }
  function setup(id,normal=false){
    const {p1,p2,stage,form,landingRead,liftOpening,finalCount}=events[id];
    return {mode:'solo',p1,p2,stage,form,cpuLevel:'rival',stockCount:3,minutes:finalCount?1:7,
      fetch:false,timeBattle:!!finalCount,landingRead,liftOpening,finalCount,...(normal?{}:{eventId:id})};
  }
  class Run extends Battle {
    constructor(config,emit,random){
      super(config,emit,random);
      this.eventId=config.eventId;
      this.event=events[this.eventId];
      this.clockFrames=this.event.time*60;
      this.held=0;this.feedback='';this.planted=false;this.sweep=false;
      const forward=this.emit;
      this.emit=(type,e)=>{this.observe(type,e);forward(type,e);};
    }
    observe(type,e){
      if(this.feedback || this.end!==null)return;
      if(this.eventId==='high-ground' && type==='ko' && e.f.index===0)this.feedback='Clover lost her stock. Drop from the lift early and keep the top perch in reach.';
      if(this.eventId!=='wrong-way')return;
      if(e.f?.index===0 && type==='tech'){
        this.planted=e.type==='tech';
        if(!this.planted)this.feedback='Pip rolled. Tap Shield with your direction centered to leave Brisket facing the wrong way.';
      }
      if(type==='knockdown' && e.f.index===0)this.feedback='Pip missed the landing. Tap Shield as his paws approach the train roof.';
      if(type==='hit'){
        if(e.owner?.index===0 && this.planted && this.sweep && e.owner.ground>=0)this.cleared=true;
        else this.feedback=e.f.index===0?'Brisket hit Pip first. Plant on landing, then jab toward his back.':'Let the sweep pass before striking from the ground.';
      }
    }
    step(dt,a,b){
      if(this.end!==null)return;
      const before=this.matchFrames,guard=this.dogs[1],swing=guard.attack;
      if(this.eventId==='wrong-way' && this.bot.coveredLanding==='through' && swing?.moveId===guard.kit.tilts.down &&
          swing.time+1e-8>=swing.start+swing.active)this.sweep=true;
      super.step(dt,a,b);
      if(this.eventId==='wrong-way' && this.sweep && guard.attack?.moveId!==guard.kit.tilts.down && !this.cleared)
        this.feedback='Brisket recovered. Tap Attack as Doorstop sweeps past you.';
      if(this.eventId==='high-ground'){
        const [hero,rival]=this.dogs;
        if(hero.ground===3 && !hero.stockLift && !hero.respawning && !hero.grip && !hero.stun &&
            (rival.ground!==3 || rival.stockLift || rival.respawning))this.held+=this.matchFrames-before;
        this.cleared=this.held>=180;
      }
      if(this.eventId==='last-delivery')this.cleared=this.matchCard.points[0]>this.matchCard.points[1];
      if(this.cleared || this.feedback || this.regulationEnd){
        if(!this.cleared && !this.feedback)this.feedback=this.regulationEnd==='time'?'Time ran out.':
          this.eventId==='high-ground'?'The fight ended before Clover held the perch for three seconds.':'The opening ended.';
        super.finishMatch(this.cleared?0:1,this.regulationEnd || 'event');
      }
    }
    // Resolve event objectives after the last playable tick, including a score on the horn.
    startSuddenDeath(cause){this.regulationEnd ||= cause==='time'?'time':'ko';}
    finishMatch(winner,reason){this.regulationEnd ||= reason;}
    progress(){
      if(this.eventId==='high-ground')return (Math.min(180,this.held)/60).toFixed(1)+' / 3.0 s on the top perch';
      if(this.eventId==='last-delivery')return 'Brisket '+this.matchCard.points[0]+' · Pip '+this.matchCard.points[1];
      return this.planted?'Tap Attack as Brisket’s sweep misses.':'Land with Shield and a centered stick.';
    }
    hud(el){
      if(el.hidden)el.hidden=false;
      const label=this.progress();if(el.textContent!==label)el.textContent=label;
      if(el.hasAttribute('aria-label'))el.removeAttribute('aria-label');
    }
    save(store){
      if(this.end===0 && !this.recorded){this.recorded=true;remember(store,this.eventId,this.matchFrames);}
    }
  }
  function board(id,{store,showDialog,open,back,launch,coat}){
    if(!Object.hasOwn(events,id))id=ids.find(key=>!Number.isFinite(best(store,key))) || ids[0];
    const spec=events[id], record=best(store,id);
    const rows=ids.map(key=>{
      const time=best(store,key);
      return '<button type="button" class="utility" aria-pressed="'+(key===id)+'" data-event-pick="'+key+'"><strong>'+
        events[key].name+'</strong><small>'+(Number.isFinite(time)?'✓ '+stamp(time):'Uncleared')+'</small></button>';
    }).join('');
    showDialog('event-board','Event Matches','<div class="event-picks" role="group" aria-label="Choose an event">'+rows+'</div>'+
      '<canvas class="event-preview" id="event-preview" width="640" height="360" role="img" aria-label="'+
      fighters[spec.p1].name+' against '+fighters[spec.p2].name+' at the opening of '+spec.name+'"></canvas>'+
      '<h3>'+spec.goal+'</h3><p>'+spec.brief+'</p><p>'+fighters[spec.p1].name+' vs. '+fighters[spec.p2].name+' · '+
      window.DogFight.arenas[spec.stage].name+' · '+spec.time+' seconds'+(Number.isFinite(record)?' · Best '+stamp(record):'')+'</p>'+
      '<div class="dialog-actions"><button class="primary" id="event-play">Start event</button><button class="utility" id="event-back">Fighter select</button></div>',false);
    const $=key=>document.getElementById(key);
    const preview=new Run({...setup(id),coats:[coat(0,spec.p1),coat(1,spec.p2)]},()=>{},seededRandom(42)),view=new window.DogFightView.FightView();
    view.shakeEnabled=false;view.draw($('event-preview'),preview,0,0);
    for(const b of document.querySelectorAll('[data-event-pick]'))b.onclick=()=>{
      open(b.dataset.eventPick);document.querySelector('[data-event-pick][aria-pressed=true]').focus({preventScroll:true});
    };
    $('event-back').onclick=back;$('event-play').onclick=()=>launch(id);$('event-play').focus({preventScroll:true});
  }
  function panel(run,paused,{showDialog,open,launch,store}){
    const {eventId:id,event:spec}=run,win=run.end===0,record=best(store,id);
    const button=(key,label,primary=false)=>'<button type="button" class="'+(primary?'primary':'utility')+'" id="event-'+key+'">'+label+'</button>';
    showDialog(paused?'pause':'event-result',paused?spec.name+' paused':win?'Event cleared':'Try again',
      '<h3>'+spec.name+' · '+spec.goal+'</h3><p>'+(paused?spec.brief:win?spec.clear:run.feedback)+'</p>'+
      '<p>'+run.progress()+' · '+stamp(run.matchFrames)+(Number.isFinite(record)?' · Best '+stamp(record):'')+'</p>'+
      '<div class="dialog-actions">'+(paused?'<button class="primary" data-do="resume">Resume</button>':'')+
      (!paused && win?button('next','Choose next event',true):'')+button('retry','Retry event',!paused && !win)+
      button('normal','Replay opening as a match')+button('board','Event board')+'</div>',false);
    const $=key=>document.getElementById('event-'+key);
    if($('next'))$('next').onclick=()=>open(ids.find(key=>!Number.isFinite(best(store,key))) || ids[(ids.indexOf(id)+1)%ids.length]);
    $('retry').onclick=()=>launch(id);$('normal').onclick=()=>launch(id,true);$('board').onclick=()=>open(id);
    document.querySelector('#dialog-body .primary').focus();
  }
  window.SoloEvents={events,setup,best,Run,board,panel};
})();
