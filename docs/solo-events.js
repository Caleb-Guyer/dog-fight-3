(() => {
  'use strict';
  const {Battle, fighters, seededRandom,idleInput} = window.DogFight;
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
    'low-road':{
      name:'The Low Road',p1:'pip',p2:'brisket',stage:'nightmail',form:'flat',highReturn:'low',
      goal:'Catch the train roof on the way up',time:10,
      brief:'Pip is below the left lip with his jump spent. Use Up Special, then tap Grab when his head reaches the roof. Hold toward the train to climb.',
      clear:'Pip cut Fence Hopper short and made it onto the roof.',
    },
    'read-the-rival':{
      name:'Read the Rival',p1:'pip',p2:'brisket',stage:'bandstand',form:'flat',time:90,
      goal:'Answer three of four approaches',
      brief:'Watch Brisket’s feet. When he plants and winds up, shield Haymaker. When he takes a step back for a running grab, jump his reach or interrupt him. Learn both with hints, then read four without them.',
      clear:'You read Brisket’s approaches at match speed.',
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
  function setup(id,normal=false,readSeed,rehearse){
    const {p1,p2,stage,form,landingRead,liftOpening,finalCount,highReturn}=events[id];
    return {mode:'solo',p1,p2,stage,form,cpuLevel:'rival',stockCount:3,minutes:finalCount?1:7,
      fetch:false,timeBattle:!!finalCount,landingRead,liftOpening,finalCount,highReturn,...(normal?{}:{eventId:id}),
      ...(id==='read-the-rival' && !normal?{readSeed:readSeed??crypto.getRandomValues(new Uint32Array(1))[0],rehearse}:{})};
  }
  class ApproachSet {
    constructor(config){
      this.seed=config.readSeed;
      this.opening=new Battle(config,undefined,seededRandom(this.seed));
      const random=seededRandom(this.seed),order=['punch','grab','punch','grab'];
      for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      this.rounds=['punch','grab',...order].map((move,i)=>({move,wait:i<2?18:15+Math.floor(random()*21),wind:i<2?34:24+Math.floor(random()*18)}));
      const exam=this.rounds.slice(2);
      const missed=(config.rehearse || []).map(i=>exam[i]).filter(Boolean);
      this.guided=missed.length || 2;
      if(missed.length)this.rounds=[...missed,...exam];
      this.index=0;this.results=[];
    }
    get round(){return this.rounds[this.index];}
    get score(){return this.results.filter(r=>r.ok).length;}
    get scoredFrames(){return this.results.reduce((total,r)=>total+r.age,0);}
    place(w){
      // Start each approach with fresh combat state. The event clock and previous answers belong to the set.
      const {time,matchFrames,clockFrames}=w;
      w.copyFightFrom(this.opening);
      Object.assign(w,{time,matchFrames,clockFrames});
      const floor=w.terrain[0],center=(floor.x1+floor.x2)/2;
      w.dogs.forEach((f,i)=>Object.assign(f,{x:center+(i?52:-52),y:floor.y,ground:0,face:i?-1:1}));
      this.age=0;this.call=null;this.swing=false;this.gaveRoom=false;this.first=null;this.beforeCue=idleInput;
    }
    sample(input=idleInput){
      if(this.call || this.first)return;
      const frame=this.age-this.round.wait;
      if(frame<0){this.beforeCue=input;return;}
      for(const [name,label] of [['jump','Jump'],['shortHop','Short hop'],['shield','Shield'],['attack','Attack'],['grab','Grab']]){
        if(input[name] || input.tapped?.[name]){
          this.first={label,frame,held:frame===0 && !!this.beforeCue[name] && !input.tapped?.[name]};return;
        }
      }
      if(Math.abs(input.x)>.45)this.first={label:'Move',frame,held:frame===0 && Math.sign(input.x)===Math.sign(this.beforeCue.x) && Math.abs(this.beforeCue.x)>.45};
    }
    input(){
      if(this.call)return idleInput;
      const t=this.age-this.round.wait;
      if(t<0)return idleInput;
      if(this.round.move==='punch')return t<this.round.wind?{...idleInput,smash:true,smashX:-1}:idleInput;
      if(t<11)return {...idleInput,x:1};
      if(t<24)return {...idleInput,x:-1};
      return t===24?{...idleInput,x:-1,grab:true}:idleInput;
    }
    resolve(ok,line){
      if(this.call)return;
      this.call={ok,line,age:this.age,move:this.round.move,first:this.first};
      if(this.index>=this.guided)this.results.push(this.call);
    }
    contact(type,e){
      if(this.call)return;
      if(type==='grabCatch' && e.f.index===1)this.resolve(false,'Caught · jump as Brisket runs back in.');
      if(type==='hit' && e.f.index===0)this.resolve(false,'Hit · hold Shield as the glove comes forward.');
      if((type==='block' || type==='parry') && e.f.index===0)this.resolve(true,type==='parry'?'Parried Haymaker':'Blocked Haymaker');
      if((type==='hit' && e.owner?.index===0) || type==='grabCatch' && e.f.index===0){
        const committed=this.age>=this.round.wait;
        this.resolve(committed,committed?'Interrupted Brisket':'Too early · let Brisket show his approach.');
      }
    }
    step(w){
      this.age++;
      if(this.call){
        if(this.age-this.call.age<55)return;
        if(this.index>=this.guided || this.call.ok)this.index++;
        if(this.index===this.rounds.length){
          if(this.score>=3)w.cleared=true;
          else w.feedback='Read '+this.score+' of four. Look for the planted glove or the step back.';
        }else this.place(w);
        return;
      }
      const [pip,brisket]=w.dogs,grab=brisket.attack?.grabAttempt;
      if(brisket.attack?.moveId==='brisketHaymaker')this.swing=true;
      if(this.round.move==='punch' && this.swing && !brisket.attack)this.resolve(false,'Haymaker missed · practice blocking the swing or striking first.');
      if(grab){this.swing=true;if(pip.ground<0 || pip.floorAction || Math.abs(pip.x-brisket.x)>110)this.gaveRoom=true;}
      if(this.round.move==='grab' && this.swing && !grab)this.resolve(this.gaveRoom,this.gaveRoom?'Evaded Freight Hug':'Grab missed · move clear as Brisket runs in.');
      if(this.age>this.round.wait+100)this.resolve(false,'No answer · meet the windup with Shield or interrupt it.');
    }
    status(){
      if(this.index===this.rounds.length)return this.score+' / 4 reads';
      if(this.call)return this.call.line;
      if(this.index<this.guided)return 'Guided '+(this.index+1)+' / '+this.guided+' · '+
        (this.round.move==='punch'?'Shield the planted glove.':'Jump as Brisket runs back.');
      return 'Read '+(this.index-this.guided+1)+' / 4 · '+this.score+' clear';
    }
    recap(){
      if(!this.results.length)return '';
      return '<h3>Scored approaches</h3><ol>'+this.results.map(r=>{
        const first=!r.first?'No response before contact.':r.first.held?r.first.label+' held before the cue.':
          r.first.label+' '+r.first.frame+' frames after the cue.';
        return '<li><strong>'+(r.move==='grab'?'Freight Hug':'Haymaker')+'</strong> · '+r.line+'<br><small>'+first+'</small></li>';
      }).join('')+'</ol>';
    }
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
      if(config.readSeed!==undefined){this.reads=new ApproachSet(config);this.reads.place(this);}
    }
    cpu(dt){return this.reads?this.reads.input():super.cpu(dt);}
    observe(type,e){
      if(this.feedback || this.end!==null)return;
      if(this.reads){this.reads.contact(type,e);return;}
      if(this.eventId==='low-road'){
        if(type==='reachLip' && e.f.index===0)this.reaching=true;
        if(type==='ledge' && e.f.index===0 && e.rising)this.caught=true;
        if(type==='hit' && e.f.index===0)this.reaching=false;
        if(type==='ko' && e.f.index===0)this.feedback=this.caught?'Brisket knocked Pip away. Try rolling past him after the catch.':'Pip missed the roof. Tap Up Special first, then Grab while he is still rising beside the lip.';
      }
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
      this.reads?.sample(a);
      super.step(dt,a,b);
      if(this.reads)this.reads.step(this);
      if(this.eventId==='low-road' && this.dogs[0].ground>=0 && !this.dogs[0].stockLift && !this.dogs[0].floorAction){
        if(this.caught)this.cleared=true;
        else this.feedback='Pip came in high. Tap Grab while his paws are still below the roof.';
      }
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
      if(this.reads)return this.reads.status();
      if(this.eventId==='low-road')return this.caught?'Get back on the roof.':this.reaching?'Hold the lip.':'Up Special, then Grab beside the lip.';
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
      if(this.end===0 && !this.recorded){this.recorded=true;remember(store,this.eventId,this.reads?.scoredFrames??this.matchFrames);}
    }
  }
  function board(id,{store,showDialog,open,back,launch,coat,binding}){
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
      '<h3>'+spec.goal+'</h3><p>'+spec.brief+'</p>'+(id==='read-the-rival'?'<p id="event-bindings"></p>':'')+'<p>'+fighters[spec.p1].name+' vs. '+fighters[spec.p2].name+' · '+
      window.DogFight.arenas[spec.stage].name+' · '+spec.time+' seconds'+(Number.isFinite(record)?' · Best '+stamp(record):'')+'</p>'+
      '<div class="dialog-actions"><button class="primary" id="event-play">Start event</button><button class="utility" id="event-back">Fighter select</button></div>',false);
    const $=key=>document.getElementById(key);
    if($('event-bindings'))$('event-bindings').textContent='Shield · '+binding('shield')+'　Jump · '+binding('jump');
    const preview=new Run({...setup(id,false,42),coats:[coat(0,spec.p1),coat(1,spec.p2)]},()=>{},seededRandom(42)),view=new window.DogFightView.FightView();
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
      '<p>'+run.progress()+' · '+(run.reads?'Scored time '+stamp(run.reads.scoredFrames):stamp(run.matchFrames))+(Number.isFinite(record)?' · Best '+stamp(record):'')+'</p>'+
      '<div class="dialog-actions">'+(paused?'<button class="primary" data-do="resume">Resume</button>':'')+
      (!paused && win?button('next','Choose next event',true):'')+button('retry','Retry event',!paused && !win)+
      (run.reads?(!paused && run.reads.results.some(r=>!r.ok)?button('misses','Rehearse missed reads'):'')+button('shuffle','New mix'):'')+button('normal',run.reads?'Fight Brisket · 3 stocks':'Replay opening as a match')+button('board','Event board')+'</div>'+
      (run.reads && !paused?run.reads.recap():''),false);
    const $=key=>document.getElementById('event-'+key);
    if($('next'))$('next').onclick=()=>open(ids.find(key=>!Number.isFinite(best(store,key))) || ids[(ids.indexOf(id)+1)%ids.length]);
    $('retry').onclick=()=>launch(id,false,run.reads?.seed);if($('shuffle'))$('shuffle').onclick=()=>launch(id);
    if($('misses'))$('misses').onclick=()=>launch(id,false,run.reads.seed,run.reads.results.flatMap((r,i)=>r.ok?[]:[i]));
    $('normal').onclick=()=>launch(id,true);$('board').onclick=()=>open(id);
    document.querySelector('#dialog-body .primary').focus();
  }
  window.SoloEvents={events,setup,best,Run,board,panel};
})();
