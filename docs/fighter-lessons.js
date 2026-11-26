(() => {
  'use strict';
  const {idleInput}=window.DogFight;
  const courses={
    pip:{stage:'picnic',rival:'brisket',lessons:[
      {title:'Bounce twice',task:'Hit Brisket with Right + Special. As Pip bounces, release Special and tap it again toward Brisket.',success:'Both pounces hit. The first hit earned the second leap.',keys:[['right','special'],['right','special']]},
      {title:'Aim the second hop',task:'Use Up + Special below the edge. Release Special, then aim up-right and tap it again to get back.',success:'Pip steered the second Fence Hopper back to the picnic table.',keys:[['up','special'],['up','right','special']]},
    ]},
    brisket:{stage:'nightmail',rival:'pip',lessons:[
      {title:'Counter the windup',task:'Pip will charge a side smash. Use Down + Special as the charge ends so Stand Firm catches the swing.',success:'Stand Firm caught the swing and Brisket landed the return hit.',keys:[['down','special']]},
      {title:'Charge the cannon',task:'Hold Up + Special. Charge the cannon at least halfway, then aim right as you launch. Get back onto the roof.',success:'A charged Kennel Cannon carried Brisket back from below the roof.',keys:[['up','special'],['right']]},
    ]},
    noodle:{stage:'laundry',rival:'brisket',lessons:[
      {title:'Pull into a jab',task:'Center your direction and tap Special to pull Brisket closer with Tug Rope. Tap Attack as the rope retracts.',success:'Noodle brought a distant rival into range and landed the opening jab.',keys:[['special'],['attack']]},
      {title:'Hook the rooftop',task:'Use Up + Special below the left roof. Let Ledge Lasso reel Noodle in, then climb onto the roof.',success:'Noodle attached the lasso, caught the ledge and climbed back onstage.',keys:[['up','special'],['right']]},
    ]},
    clover:{stage:'canal',rival:'pip',lessons:[
      {title:'Chase the disc',task:'Center your direction and tap Special to throw Round Trip. While the disc is ahead, tap Right + Special to chase and catch it.',success:'Clover caught her own disc with Disc Chase.',keys:[['special'],['right','special']]},
      {title:'Fold the sail',task:'Hold Up + Special to open Disc Sail. Steer right. Release Special once you are above the deck, then land.',success:'Clover crossed the gap and folded the sail over safe ground.',keys:[['up','special'],['right']]},
    ]},
  };
  class Trial {
    constructor(index,world){
      const [f,rival]=world.dogs, deck=world.terrain[0];
      this.course=f.kind;this.index=index;this.id=f.kind+'-'+index;
      this.info=courses[f.kind].lessons[index];
      this.ticks=0;this.note='';this.started=this.done=this.missed=false;
      const gap={pip:62,brisket:56,noodle:110,clover:490}[f.kind];
      const x=deck.x1+(deck.x2-deck.x1)*.32;
      for(const [i,d] of world.dogs.entries())Object.assign(d,{x:i?Math.min(deck.x2-32,x+gap):x,y:deck.y,
        ground:0,face:i?-1:1,vx:0,vy:0,invuln:0,stockGuard:0});
      if(index===1){
        const [out,below]={pip:[95,64],brisket:[50,95],noodle:[128,84],clover:[152,24]}[f.kind];
        Object.assign(f,{x:deck.x1-out,y:deck.y+below,ground:-1,jumps:0,coyote:0});
        rival.x=deck.x2-45;
      }
    }
    canStep(input){
      if(this.done || this.missed)return false;
      if(this.index===1 && !this.started && !(input.special || input.tapped?.special))return false;
      this.started=true;this.ticks++;return true;
    }
    partner(){
      if(this.index===0 && this.course==='brisket'){
        const beat=this.ticks%132;
        return {...idleInput,smash:beat>=12 && beat<64,smashX:-1};
      }
      return idleInput;
    }
    contact(name,e){
      if(this.done || this.missed)return;
      if(name==='ko'){this.missed=true;return;}
      const f=e.f,move=e.moveId;
      if(this.index===0){
        if(name==='hit' && f?.index===1 && e.owner?.index===0){
          if(move==='pipPounce'){
            if(e.owner.attack?.secondPounce)this.done=true;
            else this.note='Bounce! Tap Side + Special again now.';
          }
          if(move==='brisketBrace')this.done=true;
          if(move==='noodleTug'){this.pulled=this.ticks;this.note='Rope connected. Release Special while Noodle reels Brisket in.';}
          if(this.pulled && this.ticks-this.pulled<60 && move===e.owner.kit.ground[0])this.done=true;
        }
        if(name==='disc' && move==='cloverRound' && f?.index===0)this.note='Disc out! Aim right and tap Special again.';
        if(name==='catch' && f?.index===0 && f.attack?.moveId==='cloverChase')this.done=true;
      } else if(f?.index===0){
        if(name==='recover'){
          if(move==='pipHopper'){
            this.technique=!!f.attack.secondHop;
            this.note=this.technique?'Steer onto the table.':'Release Special. Aim up-right and press Special again.';
          }
          if(move==='brisketCannon' && f.attack.power>=.5){this.technique=true;this.note='Steer right to finish the return.';}
          if(move==='noodleLasso' && f.attack.anchor)this.hooked=true;
        }
        if(name==='ledge' && this.hooked){this.technique=true;this.note='Hooked! Move right or jump to climb onto the roof.';}
      }
    }
    afterStep(world){
      if(this.done || this.missed)return;
      const f=world.dogs[0],a=f.attack;
      if(this.index===0){
        if(this.course==='brisket'){
          const beat=this.ticks%132;
          this.note=beat>=51 && beat<66?'Brace now! Use Down + Special.':beat>=12 && beat<51?'Pip is charging. Wait for the cue.':this.info.task;
        }else if(this.course==='pip' && !f.followPounce && !a?.secondPounce)this.note='';
        else if(this.course==='noodle' && this.pulled){
          const elapsed=this.ticks-this.pulled;
          if(elapsed>=60)this.note='The opening closed. Retry for the original spacing.';
          else if(elapsed>=21)this.note='Brisket is in reach. Tap Attack now.';
        }
        else if(this.course==='clover' && !world.projectiles.length)this.note='';
        return;
      }
      if(a?.moveId==='brisketCannon' && a.charging && a.power>=.5)this.note='Cannon charged. Aim right and release Special.';
      if(a?.moveId==='cloverSail'){
        const deck=world.terrain[0], over=f.x>=deck.x1 && f.x<=deck.x2 && f.y<deck.y;
        if(over && !a.folded)this.note='You are above the deck. Release Special to fold the sail.';
        if(a.folded && !this.folded){
          this.folded=true;
          this.technique=over;
          this.note=over?'Sail folded. Land on the deck.':'The sail folded outside the deck. Retry to hold it longer.';
        }
      }
      if(f.ground>=0 && !f.ledge && !f.floorAction){
        this.done=!!this.technique;
        this.missed=!this.done;
      }
    }
  }
  const directions={pip:['side','up','neutral','down'],brisket:['down','up','neutral','side'],
    noodle:['neutral','up','side','down'],clover:['side','up','neutral','down']};
  // The signature and recovery studies share the course's original setups and saved clears.
  const extraStudies={
    pip:[
      [58,'Land both beats of Snap Bark on Brisket.','Both barks connected.',['special']],
      [115,'Start above the floor. Aim down and use Dirt Slide to dive, slide and hit Brisket.','The slide popped Brisket off the floor.',['down','special']]
    ],
    brisket:[
      [57,'Use Collar Toss while Pip is shielding beside you.','Collar Toss lifted Pip through his shield.',['special']],
      [150,'Aim right and use Shoulder Charge to cross the gap and hit Pip.','The shoulder connected from outside jab range.',['right','special']]
    ],
    noodle:[
      [139,'Aim right and hook Brisket with Slingshot. Let the rope pull Noodle forward.','Noodle reeled in toward the rival.',['right','special']],
      [170,'Plant Trip Line on the floor. Brisket will walk into the armed snare.','The grounded snare caught Brisket.',['down','special']]
    ],
    clover:[
      [144,'Throw Round Trip past Pip. Let the disc hit on its way out and again on its return.','The same disc hit on both passes.',['special']],
      [240,'Aim down and fire Skip Serve. Let the disc skip along the floor to reach Pip.','The skipping disc reached Pip.',['down','special']]
    ]
  };
  function study(kind,side){
    const index=directions[kind].indexOf(side),id=window.DogFight.kits[kind].specials[side];
    return {index,id,stage:index<2?courses[kind].stage:'picnic',rival:courses[kind].rival,title:window.DogFight.specials[id].label};
  }
  class SpecialTrial {
    constructor(index,world){
      this.course=world.dogs[0].kind;this.index=index;this.id=this.course+'-'+index;
      const spec=study(this.course,directions[this.course][index]);
      const [gap,task,success,keys]=extraStudies[this.course][index-2];
      this.info={title:spec.title,task,success,keys:[keys]};this.move=spec.id;
      this.ticks=0;this.hits=0;this.done=false;this.missed=false;this.started=false;
      const floor=world.terrain[0],x=floor.x1+(floor.x2-floor.x1)*.33;
      for(const [i,d] of world.dogs.entries())Object.assign(d,{x:i?x+gap:x,y:floor.y,ground:0,face:i?-1:1,vx:0,vy:0,invuln:0,stockGuard:0});
      if(this.move==='pipSlide')Object.assign(world.dogs[0],{ground:-1,y:floor.y-60});
      if(this.move==='brisketClinch')world.dogs[1].shield=true;
    }
    canStep(input){
      if(this.done || this.missed || !this.started && !input.special && !input.tapped?.special)return false;
      this.started=true;this.ticks++;return true;
    }
    partner(){
      if(this.move==='noodleTripLine' && this.ticks>=32)return {...idleInput,x:-.58};
      if(this.move==='brisketClinch')return {...idleInput,shield:true};
      return idleInput;
    }
    contact(name,e){
      if(this.done || this.missed)return;
      if(name==='ko'){this.missed=true;return;}
      if(name==='special' && e.f?.index===0 && e.moveId===this.move)this.hits=0;
      if(name!=='hit' || e.owner?.index!==0 || e.f?.index!==1 || e.moveId!==this.move)return;
      this.hits++;
      if(this.move==='noodleSling'){this.hookX=e.owner.x;return;}
      const double=this.move==='pipBark' || this.move==='cloverRound';
      if(!double || this.hits>=2)this.done=true;
      else this.note=this.move==='pipBark'?'First bark landed. Let the second beat play.':'First pass landed. Watch the return.';
    }
    afterStep(world){
      if(this.hookX!==undefined && world.dogs[0].x>this.hookX+22)this.done=true;
      if(!this.done && this.ticks>=180)this.missed=true;
    }
  }
  const shuttleKey='dog-fight-3.shuttle.v1.', sessionRuns=new Map();
  const raceTime=frames=>(frames/60).toFixed(2)+' s';
  function bestRun(storage,kind){
    let best=sessionRuns.get(kind);
    try{
      const run=JSON.parse(storage.getItem(shuttleKey+kind));
      if(run && Number.isInteger(run.frames) && run.frames>0 && run.frames<=600 &&
        Array.isArray(run.track) && run.track.length===1+Math.ceil(run.frames/3) &&
        run.track.every(p=>Array.isArray(p) && p.length===2 && p.every(n=>Number.isInteger(n) && Math.abs(n)<4000)) &&
        (!best || run.frames<best.frames))best=run;
    }catch{}
    return best;
  }
  class Shuttle {
    constructor(world,storage){
      const [f,rival]=world.dogs, deck=world.terrain[0];
      this.course=f.kind;this.index=-1;this.id='shuttle';this.ticks=0;
      this.start=440;this.turn=680;this.floor=deck.y;
      Object.assign(f,{x:this.start,y:deck.y,ground:0,face:1,vx:0,vy:0});
      Object.assign(rival,{x:deck.x2-30,y:deck.y,ground:0,face:-1,vx:0,vy:0});
      this.track=[[this.start,deck.y]];
      for(const kind of Object.keys(courses)){
        const run=bestRun(storage,kind);
        if(run && (!this.pace || run.frames<this.pace.frames))this.pace={...run,kind};
      }
      this.info={title:'Rooftop shuttle',task:'Cross the gold post. Turn and cross the start line on the roof.',
        keys:[['right'],['left']]};
      this.done=this.missed=false;
    }
    canStep(input){
      if(this.done || this.missed)return false;
      if(!this.ticks && !(input.x || input.y || input.attack || input.special || input.jump || input.shield ||
        input.smash || input.grab || Object.values(input.tapped || {}).some(Boolean)))return false;
      this.ticks++;return true;
    }
    partner(){return idleInput;}
    contact(name,e){if(name==='ko' && e.f.index===0)this.missed=true;}
    afterStep(world){
      if(this.missed)return;
      const f=world.dogs[0];
      if(!this.split && f.x>=this.turn){this.split=this.ticks;this.note='Turn back. Cross the mint line on the roof.';}
      this.done=!!this.split && f.x<=this.start && f.ground===0;
      if(this.ticks%3===0 || this.done)this.track.push([Math.round(f.x),Math.round(f.y)]);
      if(this.done)this.info.success=raceTime(this.ticks)+' round trip · '+raceTime(this.split)+' to the turn.';
      else if(this.ticks>=600)this.missed=true;
    }
    saveTime(storage){
      if(!this.done || this.example || this.saved)return;
      this.saved=true;
      const previous=bestRun(storage,this.course);
      if(previous && previous.frames<=this.ticks)return;
      const run={frames:this.ticks,track:this.track};
      sessionRuns.set(this.course,run);
      try{storage.setItem(shuttleKey+this.course,JSON.stringify(run));}catch{}
    }
    drawCourse(ctx){
      const y=this.floor;
      ctx.save();
      for(const [x,color] of [[this.start,'#8de0cb'],[this.turn,'#ffd483']]){
        ctx.fillStyle='#252839';ctx.fillRect(x-4,y-57,8,63);
        ctx.fillStyle=color;ctx.fillRect(x-2,y-55,4,59);ctx.fillRect(x+2,y-54,16,12);
        ctx.fillStyle='#252839';ctx.fillRect(x+5,y-54,4,4);ctx.fillRect(x+9,y-50,4,4);
      }
      if(this.pace){
        const {frames,track,kind}=this.pace,t=Math.min(frames,this.ticks);
        const i=Math.floor(t/3),a=track[i],b=track[i+1] || a;
        const u=(t-i*3)/Math.max(1,Math.min(3,frames-i*3)),x=Math.round(a[0]+(b[0]-a[0])*u),h=Math.round(a[1]+(b[1]-a[1])*u)-7;
        ctx.fillStyle='#252839';ctx.fillRect(x-5,h-14,10,14);ctx.fillRect(x-21,h-29,42,16);
        ctx.fillStyle='#ffc76c';ctx.fillRect(x-2,h-14,4,14);
        ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(kind.toUpperCase(),x,h-17);
      }
      ctx.font='bold 18px monospace';ctx.textAlign='center';
      ctx.fillStyle='#252839';ctx.fillRect((this.start+this.turn)/2-47,y+9,94,26);
      ctx.fillStyle='#f8e2ad';ctx.fillText(raceTime(this.ticks),(this.start+this.turn)/2,y+28);
      ctx.restore();
    }
  }
  const makeTrial=(index,world,storage)=>index===-1?new Shuttle(world,storage):index<2?new Trial(index,world):new SpecialTrial(index,world);
  // Durations are in fight frames. A short hold before each new input lets the
  // viewer read the cue without changing the timing between real inputs.
  const examples={
    move:[[120,'right','Hold right until Pip reaches the middle of the roof.']],
    platform:[[16,'jump','Hold Jump to rise through the bench.'],[4,'','Release Jump while Pip is rising.'],
      [1,'jump','Press Jump again in the air.'],[90,'','Let Pip land on the bench.']],
    jab:[[24,'attack','Leave the direction centered and tap Attack when Brisket is within reach.']],
    tilt:[[24,'down attack','Aim down and tap Attack with both paws planted.']],
    air:[[1,'jump attack','Press Jump and Attack together to start a short-hop aerial.'],[36,'','Let the aerial connect.']],
    guard:[[60,'shield','Hold Shield while Brisket swings at the bubble.']],
    throw:[[8,'grab','Reach through Brisket’s shield with Grab.'],[40,'right','Once Pip has hold of him, press right to throw.']],
    special:[[40,'right special','Aim toward Brisket and press Special to pounce.']],
    return:[[1,'up right special','Aim up and toward the roof, then press Special to launch.'],[120,'right','Keep steering toward the roof as Pip comes down.']],
    stock:[[32,'right smash','Hold right and Smash to charge near the edge.'],[2,'right','Release Smash while facing Brisket.'],
      [120,'','Watch where the charged kick sends him.']],
    'pip-0':[[1,'right special','Pounce toward Brisket.'],[12,'right','Release Special and watch for the bounce.'],
      [1,'right special','Press Special into Brisket again during the bounce.'],[80,'right','Follow the second pounce.']],
    'pip-1':[[1,'up right special','Launch the first Fence Hopper up toward the edge.'],[11,'right','Release Special so Pip can use the second hop.'],
      [1,'up right special','Aim up-right and press Special for the second hop.'],[100,'right','Carry the second hop onto the table.']],
    'brisket-0':[[57,'','Wait while Pip charges. Watch his front paw.'],[1,'down special','Brace just before Pip releases the smash.'],
      [80,'','Stand Firm catches the swing and strikes back.']],
    'brisket-1':[[20,'up right special','Hold Special to charge Kennel Cannon past halfway.'],[140,'right','Release Special and aim right as Brisket launches.']],
    'noodle-0':[[1,'special','Tap Special with the direction centered to cast Tug Rope.'],[24,'','Let go of Special while Noodle reels Brisket in.'],
      [32,'attack','Tap Attack as Brisket comes within jab range.']],
    'noodle-1':[[1,'up right special','Cast Ledge Lasso toward the lip.'],[23,'','Let the rope reel Noodle all the way to the edge.'],
      [90,'right','From the ledge, press toward the roof to climb.']],
    'clover-0':[[1,'special','Throw Round Trip with the direction centered.'],[22,'','Release Special while the disc flies ahead.'],
      [1,'right special','Aim after the disc and press Special to chase.'],[80,'','Watch Clover meet her disc.']],
    'clover-1':[[1,'up right special','Open Disc Sail with Up and Special.'],[39,'right special','Keep holding Special and steer right until the deck is underneath.'],
      [100,'right','Release Special over the deck to fold the sail and land.']],
  };
  class Example {
    constructor(id,lesson){
      const [kind,index]=id.split('-');
      const extra=extraStudies[kind]?.[Number(index)-2];
      if(id==='shuttle')this.shuttle=lesson;
      const sequence=this.shuttle?[[600,'right','Run to the gold post.'],[600,'left','Reverse and run across the start line.']]:
        extra?[[1,extra[3].join(' '),extra[1]],[180,'','Release the controls and watch the exchange.']]:examples[id];
      this.cues=sequence.map(([frames,chord,caption])=>{
        const keys=chord?chord.split(' '):[];
        const input={...idleInput,quickAttack:true};
        for(const key of keys){
          if(key==='right')input.x=1;
          else if(key==='left')input.x=-1;
          else if(key==='up')input.y=-1;
          else if(key==='down')input.y=1;
          else input[key]=true;
        }
        if(input.smash)input.smashX=input.x;
        return {frames,keys,caption,input};
      });
      this.index=0;
      this.frame=-18;
    }
    get cue(){return this.cues[this.index];}
    input(){
      if(this.shuttle?.split && this.index===0){this.index=1;this.frame=-18;}
      if(this.frame===this.cue.frames && this.index+1<this.cues.length){
        this.index++;this.frame=-18;
      }
      return this.frame++<0?null:this.cue.input;
    }
  }
  function hint(info,device,keyFor,padFor){
    function label(action){
      if(device===0)return keyFor(0,action);
      if(device===2)return action[0].toUpperCase()+action.slice(1);
      return ['left','right','up','down'].includes(action)?'Stick '+action:padFor(0,action);
    }
    return info.keys.map(chord=>chord.map(label).join(' + ')).join(' → ');
  }
  const prefix='dog-fight-3.fighter-lesson.', temporary=new Set();
  function cleared(storage,id){
    if(temporary.has(id))return true;
    try{return storage.getItem(prefix+id)==='1';}catch{return false;}
  }
  function mark(storage,id){
    if(cleared(storage,id))return;
    try{storage.setItem(prefix+id,'1');}catch{temporary.add(id);}
  }
  function sheet(kind,{storage,fighters,portrait,savedCoat,showDialog,root,choose,start,cup,back,backLabel}){
    const {lessons}=courses[kind], name=fighters[kind].name;
    const dogs=Object.keys(courses).map(id=>'<button class="cup-dog" data-class-dog="'+id+'" aria-pressed="'+(id===kind)+
      '"><img alt="" src="'+portrait(id,savedCoat(0,id))+'"><strong>'+fighters[id].name+'</strong></button>').join('');
    const buttons=lessons.map((info,i)=>'<button class="utility" data-fighter-lesson="'+i+'">'+
      (i===0?'Signature move':'Recovery')+' · '+info.title+(cleared(storage,kind+'-'+i)?' ✓':'')+'</button>').join('');
    showDialog('fighter-school','Fighter lessons','<div class="cup-dogs" role="group" aria-label="Choose a fighter">'+dogs+
      '</div><h3 class="card-stage">'+name+'</h3><div class="dialog-actions">'+buttons+'</div>'+
      (temporary.size?'<p>Lesson clears are saved for this tab while storage is unavailable.</p>':'')+
      '<div class="dialog-actions"><button class="primary" data-class-cup>'+name+'’s Arcade Cup</button>'+
      '<button class="utility" data-class-back>'+backLabel+'</button><button class="utility" data-do="home">Main menu</button></div>');
    for(const b of root.querySelectorAll('[data-class-dog]'))b.onclick=()=>choose(b.dataset.classDog);
    for(const b of root.querySelectorAll('[data-fighter-lesson]'))b.onclick=()=>start(kind,Number(b.dataset.fighterLesson));
    root.querySelector('[data-class-cup]').onclick=()=>cup(kind);
    root.querySelector('[data-class-back]').onclick=back;
    root.querySelector('[data-class-dog][aria-pressed=true]').focus({preventScroll:true});
  }
  function tryoutSheet(kind,{storage,slot,label,coat,portrait,root,showDialog,choose,start,pick,back}){
    const {fighters,kits}=window.DogFight;
    const dogs=Object.keys(courses).map(id=>{
      const best=bestRun(storage,id);
      return '<button type="button" class="cup-dog" data-try-dog="'+id+'" aria-pressed="'+(id===kind)+'">'+
        '<img alt="" src="'+portrait(id,coat(slot,id))+'"><strong>'+fighters[id].name+'</strong>'+
        (best?'<small>'+raceTime(best.frames)+'</small>':'')+'</button>';
    }).join('');
    const moves=courses[kind].lessons.slice(0,2).map((m,i)=>'<button type="button" class="utility" data-try-run="'+i+'">'+
      (i?'Recovery':'Signature')+' · '+m.title+(cleared(storage,kind+'-'+i)?' ✓':'')+'</button>').join('');
    showDialog('fighter-tryout','Fighter tryouts','<div class="cup-dogs" role="group" aria-label="Dogs to try">'+dogs+'</div>'+
      '<h3 class="card-stage">'+fighters[kind].name+' · '+fighters[kind].style+'</h3><p>'+kits[kind].style+'</p>'+
      '<div class="dialog-actions">'+moves+'<button class="utility" data-try-run="-1">Rooftop shuttle</button></div>'+
      '<p>Use P1 controls. Shuttle times are personal bests. The fastest dog sets the pace on the roof.</p>'+
      '<div class="dialog-actions"><button class="primary" data-try-pick>Pick '+fighters[kind].name+' for '+label+'</button>'+
      '<button class="utility" data-try-back>Back to fighter select</button></div>');
    for(const b of root.querySelectorAll('[data-try-dog]'))b.onclick=()=>choose(b.dataset.tryDog);
    for(const b of root.querySelectorAll('[data-try-run]'))b.onclick=()=>start(kind,Number(b.dataset.tryRun),true);
    root.querySelector('[data-try-pick]').onclick=()=>pick(kind);
    root.querySelector('[data-try-back]').onclick=back;
    root.querySelector('[aria-pressed=true]').focus({preventScroll:true});
  }
  class Demonstration{
    constructor(kind,side,coat,event){
      const spec=study(kind,side);
      this.battle=new window.DogFight.Battle({mode:'local',stage:spec.stage,p1:kind,p2:spec.rival,fetch:false,
        form:'original',minutes:0,lesson:spec.index,coats:[coat,0]},(name,e)=>{this.trial?.contact(name,e);event?.(name,e);},window.DogFight.seededRandom(11));
      this.trial=makeTrial(spec.index,this.battle);this.example=new Example(this.trial.id);
      this.frame=0;this.tail=0;this.ended=false;
    }
    step(){
      if(this.ended)return;
      if(this.trial.done || this.trial.missed){
        this.battle.step(1/60,idleInput,idleInput);this.tail++;
      }else{
        let input=this.example.input();
        while(!input)input=this.example.input();
        if(this.trial.canStep(input)){
          this.battle.step(1/60,input,this.trial.partner(input));this.trial.afterStep(this.battle);
        }
      }
      this.frame++;
      this.ended=this.tail>=45 || this.frame>=300;
    }
  }
  function preview({kind,side,coat,root,shake,reduced,device,keyFor,padFor}){
    const el=id=>root.querySelector('#move-'+id);
    const canvas=el('arena'),toggle=el('play'),speed=el('speed'),output=el('frame'),cue=el('cue'),caption=el('caption');
    let demo,view,playing=!reduced,rate=.5,carry=0;
    const write=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
    function paint(dt){
      view.draw(canvas,demo.battle,dt,demo.battle.time);
      const phase=demo.example.cue, finished=demo.trial.done;
      write(output,'Frame '+demo.frame+' · '+demo.battle.dogs[1].stats.name+' '+Math.round(demo.battle.dogs[1].damage)+'%');
      write(cue,demo.tail?'Release':phase.keys.length?hint({keys:[phase.keys]},device(),keyFor,padFor):'Release');
      write(caption,finished?demo.trial.info.success:phase.caption);
      write(toggle,demo.ended?'Replay':playing?'Pause':'Play');
      el('step').disabled=demo.ended;
    }
    function restart(){
      carry=0;view=new window.DogFightView.FightView();view.shakeEnabled=shake && !reduced;
      demo=new Demonstration(kind,side,coat,(name,e)=>view.event(name,e));paint(0);
    }
    toggle.onclick=()=>{
      if(demo.ended){playing=true;restart();}else{playing=!playing;carry=0;paint(0);}
    };
    el('step').onclick=()=>{playing=false;carry=0;demo.step();paint(1/60);};
    el('restart').onclick=()=>{playing=!reduced;restart();};
    speed.onclick=()=>{rate=rate===1?.5:1;write(speed,rate===1?'Speed · 1×':'Speed · ½×');};
    restart();
    return {tick(dt){
      if(!playing || demo.ended)return;
      carry+=dt*60*rate;
      const frames=Math.floor(carry);
      if(!frames)return;
      carry-=frames;
      for(let i=0;i<frames && !demo.ended;i++)demo.step();
      paint(frames/60);
    }};
  }
  const tiltInputs = {
    forward: 'Forward tilt · Side + Attack',
    up: 'Up tilt · Up + Attack',
    down: 'Down tilt · Down + Attack',
  };
  const airInputs = {
    neutral: 'Attack alone',
    forward: 'Forward + Attack',
    back: 'Back + Attack',
    up: 'Up + Attack',
    down: 'Down + Attack',
  };
  const smashInputs = { side: 'Side + Smash', up: 'Up + Smash', down: 'Down + Smash' };
  const throwInputs = {
    grab: 'Press Grab',
    dashGrab: 'Dash grab · Run + Grab',
    pivotGrab: 'Pivot grab · Reverse + Grab',
    pummel: 'Pummel · Tap Attack',
    forward: 'After catch · Forward',
    back: 'After catch · Back',
    up: 'After catch · Up',
    down: 'After catch · Down',
  };
  const defenseGuide = {
    tumble: {
      label: 'Directional influence',
      input: 'Aim during the hit freeze',
      hint: 'Hold across the launch path to bend it during the freeze. Once hitstun ends, flick a fresh side to right your dog and regain air drift. You keep your jump and air dodge.',
    },
    techRoll: {
      label: 'Tech landing',
      input: 'Tap Shield just before landing',
      hint: 'Leave movement neutral to land in place, or hold left or right to roll through. The roll covers more ground and takes longer to finish.',
    },
    floorAttack: {
      input: 'After a knockdown · tap Attack',
    },
  };
  function guideMoveRow(move, input, direction, category) {
    return (
      '<li><canvas width="124" height="78" data-direction="' +
      direction +
      '" data-category="' +
      category +
      '" aria-hidden="true"></canvas><div><small>' +
      input +
      '</small><strong>' +
      move.label +
      '</strong><span>' +
      move.hint +
      (category === 'air' && move.late ? ' Clean ' + move.dmg + '%. Late ' + move.late.dmg +
        '% from frame ' + Math.round(move.late.start * 60) + '. A short hop deals 85% of these values.' : '') +
      (category === 'air' && move.meteor ? ' A strong spike rebounds off the floor. A falling rival can cancel from flight frame ' +
        (move.meteor + 1) + ' with a saved jump or Up Special.' : '') +
      (move.landingWindow ? ' Landing on frames ' + move.landingWindow[0] + '–' + (move.landingWindow[1] - 1) +
        ' takes ' + move.land + ' frames to recover. A timed Shield press cuts it to ' + Math.ceil(move.land / 2) +
        '. Elsewhere in the move it takes 2.' : '') +
      '</span>'+(category==='specials'?'<button type="button" class="utility" data-watch-special="'+direction+'" aria-label="Watch '+move.label+'">Watch move</button>':'')+'</div></li>'
    );
  }
  function moveGuide(kind,section,{keyFor,padFor,strikeKeys,specialInputs}) {
    const {kits,fighters,moves,smashes,specials,grabs,pummels,throws}=window.DogFight;
    const kit = kits[kind],
      f = fighters[kind];
    const tabs = Object.entries(fighters)
      .map(
        ([key, dog]) =>
          '<button type="button" data-guide-kind="' +
          key +
          '" aria-pressed="' +
          (key === kind) +
          '">' +
          dog.name +
          '</button>',
      )
      .join('');
    const moveSet =
      section === 'throws' ? { ...grabs, ...pummels, ...throws } : { air: moves, smashes, specials }[section];
    const inputs = { air: airInputs, smashes: smashInputs, specials: specialInputs, throws: throwInputs }[
      section
    ];
    const entries =
      section === 'throws'
        ? {
            grab: kit.grab,
            dashGrab: kit.dashGrab,
            pivotGrab: kit.pivotGrab,
            pummel: kit.pummel,
            ...kit.throws,
          }
        : kit[section];
    const rows =
      section === 'defense'
        ? Object.entries(defenseGuide)
            .map(([key, move]) => guideMoveRow(key === 'floorAttack' ? moves[kit.floorAttack] : move, move.input, key, section))
            .join('')
        : Object.entries(entries)
            .map(([side, id]) => guideMoveRow(moveSet[id], inputs[side], side, section))
            .join('');
    const ledgeMove =
      '<h3 class="guide-section">Ledge attack</h3><ul class="move-rows guide-ledge">' +
      guideMoveRow(moves[kit.ledgeAttack], 'While hanging · tap Attack', 'ledge', 'ledge') +
      '</ul><p>Wait below a swing, then choose your get-up. Three amber marks count down to a slip. Damage and repeated catches shorten your grip.</p>';
    const sections =
      '<div class="guide-tabs" role="group" aria-label="Move categories">' +
      [
        ['air', 'Attacks'],
        ['smashes', 'Smash attacks'],
        ['specials', 'Specials &amp; recovery'],
        ['throws', 'Grabs &amp; throws'],
        ['defense', 'Defense'],
      ]
        .map(
          ([key, label]) =>
            '<button type="button" data-guide-section="' +
            key +
            '" aria-pressed="' +
            (section === key) +
            '">' +
            label +
            '</button>',
        )
        .join('') +
      '</div>';
    let contents;
    if (section === 'defense') {
      const { roll, spot } = kit.defense;
      const { neutral, directional } = kit.airDodge;
      const airRows = [
        [
          'neutralAirDodge',
          'Tap Shield in midair',
          'Neutral air dodge',
          'Center your aim and tap Shield to tuck in place. ' +
            f.name +
            ' evades on frames ' +
            neutral[1] +
            '–' +
            neutral[2] +
            ' and can act again sooner than after a directional dodge.',
        ],
        [
          'directionalAirDodge',
          'Aim + tap Shield in midair',
          'Directional air dodge',
          kit.airDodge.tip +
            ' Landing during the dodge gives you ' +
            directional[3] +
            ' frames of landing lag.',
        ],
      ]
        .map(([key, input, label, hint]) => guideMoveRow({ label, hint }, input, key, 'defense'))
        .join('');
      const groundRows = [
        [
          'shieldRoll',
          'Shield + Left or Right',
          'Shield Roll',
          'Roll through a rival, or roll backward to retreat. ' +
            f.name +
            ' finishes a forward roll in ' +
            roll[0] +
            ' frames. A backward roll is shorter and takes two more frames.',
        ],
        [
          'spotDodge',
          'Shield + Down',
          'Spot-dodge',
          'Evade in place, including grabs. ' +
            f.name +
            ' is untouchable on frames ' +
            spot[1] +
            '–' +
            spot[2] +
            ' and finishes on frame ' +
            spot[0] +
            '.',
        ],
        [
          'parry',
          'Release Shield just before contact',
          'Parry',
          'Release within five frames of a strike to take no damage. Counter a melee attacker immediately. A projectile can be parried from a distance.',
        ],
      ]
        .map(([key, input, label, hint]) => guideMoveRow({ label, hint }, input, key, 'defense'))
        .join('');
      contents =
        '<p class="recovery-note">Shield is L for P1, Slash for P2, either bumper on a gamepad, or Shield on touch.</p><h3 class="guide-section">On the ground</h3><p>Keep Shield held and press Jump, Grab, Up + Smash, or Up + Special. Tapping Attack while shielding also grabs straight ahead. If a falling opponent crosses behind you, aim back and tap Jump + Attack together for a back air. You can tap during impact. A grab immediately after a block needs four extra startup frames.</p><p>In <strong>Training → Shield practice</strong>, use Clover’s Disc Hook against Pip’s spaced kick and Brisket’s Belly Drop. Choose Strike or Grab to practice a parry or dodge with your own dog.</p><ul class="move-rows guide-shield">' +
        groundRows +
        '</ul><h3 class="guide-section">On a platform</h3><ul class="move-rows">' +
        guideMoveRow({ label: 'Shield drop', hint: 'Raise Shield, then tap either lower diagonal. Tap Attack with it for ' +
          moves[kit.air.down].label + ', or aim another aerial as you fall. Try it against the up air in Training → Platform practice.' },
          'Hold Shield, then ↙ or ↘', 'platformDrop', 'defense') +
        '</ul><h3 class="guide-section">Shield coverage</h3><ul class="move-rows guide-coverage">' +
        guideMoveRow({ label: 'Tilt shield', hint: 'Shift the bubble toward a low sweep, high aerial or incoming disc. A hit that reaches an exposed part of your dog deals its normal damage. Try Guard low and Guard high in Shield practice.' },
          'Shield + gentle direction', 'shieldTilt', 'defense') +
        '</ul>' + (kit.crawl ? '<h3 class="guide-section">Crawl</h3><ul class="move-rows">' +
          guideMoveRow({label:'Belly crawl', hint:'Hold Down and a side to move low. Noodle can back up without turning. Hold Down alone after moving to stay flat. Try Crawl under the disc in Footwork practice.'},
            'Down + Left or Right', 'crawl', 'defense') + '</ul>' : '') +
        '<h3 class="guide-section">Crouch cancel</h3><ul class="move-rows guide-crouch">' +
        guideMoveRow({ label: 'Crouch cancel', hint: 'You take full damage and two-thirds of the usual launch speed. A light, low blow can leave your paws planted. Tap Attack at the spark for ' +
          moves[kit.tilts.down].label + '. Grabs and tethers can catch a crouch. Try both sides in Training → Combo escape.' }, 'Hold Down before contact', 'crouchHit', 'defense') +
        '</ul><h3 class="guide-section">In the air</h3><p>One dodge per airtime. Landing or catching a ledge refreshes it. Try <strong>Training → Air-dodge practice</strong>.</p><p>For a wavedash, tap Jump, then aim diagonally down and tap Shield. Release the direction to slide forward or backward and keep your facing. Do the same on the way down to waveland on a platform. Try <strong>Training → Wavedash</strong>.</p><ul class="move-rows guide-air-dodge">' +
        airRows +
        '</ul><h3 class="guide-section">At the ledge</h3><p>Tap Down or away to let go. Down + Jump spends your air jump below the lip. Aim inward and tap Attack for ' +
          moves[kit.air.forward].label + ' as you rise. Try both sides in <strong>Training → Ledge timing</strong>.</p><ul class="move-rows guide-ledge-climb">' +
        guideMoveRow({ label: 'Ledge climb', hint: 'On a fresh catch, protection ends ' +
          (kit.ledgeClimb.total - kit.ledgeClimb.protectedThrough) + ' frames before you can act. Hold Shield during the climb to guard as soon as you stand.' },
          'While hanging · press toward the stage', 'ledgeClimb', 'defense') +
        '</ul><p>Release Shield after an air dodge, then tap it again once you catch the lip. Try <strong>Training → Ledge roll practice</strong>.</p><ul class="move-rows guide-ledge-roll">' +
        guideMoveRow(
          { label: kit.ledgeRoll.label, hint: kit.ledgeRoll.tip },
          'While hanging · tap Shield',
          'ledgeRoll',
          'defense',
        ) +
        '</ul><h3 class="guide-section">Ledge trumping</h3><p>Catch an occupied ledge to bump the other dog outward. On a fresh catch, a longer flight gives you more protected time. High damage shortens it. Watch the grip marks under the lip. The last mark turns gold for the final six frames. Regrabs leave you open until you land or take a hit. Try <strong>Edge practice → Long recovery</strong> to time a punish.</p>' +
        '<h3 class="guide-section">Between hits</h3><p>Flick a fresh direction during impact freeze to move a short distance. Center the stick and flick again for a second shift if time allows. On a keyboard or touch screen, tap a direction at the spark. Try <strong>Training → Combo escape</strong> at two distances.</p>' +
        '<h3 class="guide-section">Surviving a finisher</h3><p>On your last stock, two amber chevrons point toward the blast line if a centered stick would carry you out during hitstun. Hold across the throw during the freeze to bend your flight. On shallow launches, Down also slows you and Up adds speed. A late tap of Shield toward the stage queues an air dodge in open air. Try <strong>Training → Launch practice → Survival DI</strong>.</p>' +
        '<h3 class="guide-section">After a knockout</h3><p>Watch the lamps on the airmail lift. When they turn mint, tap Down, a side, Jump, or an aerial move to leave. Leaving early gives you more protection on landing. The last gold mail tag goes dark when you can be hit again. Try both sides in <strong>Training → Launch practice → Take the lift</strong> and <strong>Catch the return</strong>.</p>' +
        '<h3 class="guide-section">After a launch</h3><p>Choose <strong>Training → Launch practice</strong> to take an up throw and try the landing again.</p><p>On a strong meteor, tap Shield just before the platform to stop the bounce. Over open air, tap a fresh Jump or Up + Special when the gold streaks turn mint, then steer home. Try <strong>Spike landing</strong> and <strong>Offstage spike</strong>.</p><ul class="move-rows guide-defense">' +
        rows +
        '</ul><h3 class="guide-section">Stage walls and undersides</h3><p>Jump around a solid deck to reach the lip. If a hit sends you tumbling up into its underside, tap Shield just before contact to stop the bounce. Try <strong>Tech the underside</strong> in Wall tech practice.</p><p>Pip and Noodle can flick away from a solid wall once per airtime. Pip kicks higher, and Noodle travels farther sideways. The kick keeps your remaining air jump and Up Special. In <strong>Training → Wall tech practice</strong>, choose a dog’s wall jump to try both roofs, or take Pip’s Back Heel to practice a wall tech.</p><ul class="move-rows guide-wall">' +
        guideMoveRow(
          {
            label: 'Wall tech',
            hint: 'Tap in the last 11 frames of a tumble into a solid wall. Your dog plants its paws and briefly stops. Your saved air jump is still available.',
          },
          'Tap Shield before impact',
          'wallTech',
          'defense',
        ) +
        guideMoveRow(
          {
            label: 'Wall-tech jump',
            hint: 'Keep Jump held as the tech lands to spring up and away. You can use your saved recovery afterward.',
          },
          'Tap Shield + hold Jump',
          'wallTechJump',
          'defense',
        ) +
        guideMoveRow(
          {
            label: 'Missed wall tech',
            hint: 'Your dog bounces back into open air, still tumbling. An early Shield press locks out another attempt for 28 frames.',
          },
          'Miss the Shield timing',
          'wallBounce',
          'defense',
        ) +
        '</ul>';
    } else if (section === 'throws') {
      contents =
        '<p class="recovery-note"><strong>Grab</strong> Use U (P1), M (P2), Y on a gamepad, or Grab on touch. Grab during a run to catch ahead. Reverse and press Grab together to catch behind. For a boost grab, start a dash attack and tap Grab in its first two frames. Hold back as you grab for a sliding pivot catch. After a catch, tap Attack to pummel or tap a direction to throw. Forward follows your new facing. Grab again also throws forward. Tap action buttons when caught to escape.</p><ul class="move-rows guide-throws">' +
        rows +
        '</ul>';
    } else if (section === 'smashes') {
      contents =
        '<p class="recovery-note"><strong>Charge</strong> Aim and hold Smash (P1 '+keyFor(0,'smash')+', P2 '+keyFor(1,'smash')+', P1 controller '+padFor(0,'smash')+'), then release. A tap swings immediately. Full charge takes one second. You can hold it for one more second before the move fires. Repeating a move lowers its damage and launch power. Try Training → Move freshness → KO test to see when this changes a stock.</p><ul class="move-rows guide-smashes">' +
        rows +
        '</ul>';
    } else if (section === 'specials') {
      contents =
        '<p class="recovery-note"><strong>Offstage</strong> ' +
        kit.recovery +
        '</p><p>In the air, tap neutral Special, then immediately flick behind you for a <strong>B-reverse</strong>. Your dog turns and reverses its sideways speed. Flick back and release <em>before</em> Special for a turnaround that keeps your drift. Combine both inputs for a <strong>wavebounce</strong>. Try Training → Aerial practice.</p><ul class="move-rows guide-specials">' +
        rows +
        '</ul>' +
        ledgeMove;
    } else {
      contents =
        '<h3 class="guide-section">Ground combo</h3><div class="guide-chain">' +
        kit.ground.map((id) => moves[id].label).join(' / ') +
        '</div><p>' +
        kit.combo +
        '</p><p>Walk to a ledge to balance there. Dash to run off. Land an aerial at the tip of a platform with sideways speed to slide off and attack again. Try Training → Edge practice.' +
        '</p><p>When two ground swings meet, both dogs recoil. A swing worth at least 9 percentage points more carries through. You can also bat Clover’s flying discs. Try Training → Footwork practice → Clash jabs.' +
        '</p><p>If the rival misses a landing, tap neutral Attack for ' + moves[kit.ground[0]].label +
        '. You can jab lock twice before finishing with ' + smashes[kit.smashes.down].label + ' (Down + Smash). Try Training → Launch practice → Jab lock.' +
        '</p><h3 class="guide-section">Ground tilts</h3><p>Aim and tap Attack. Angle a forward tilt with a shallow diagonal on the stick, Walk + a diagonal on keyboard, or a slide from the center dot to a diagonal on touch. Aim high to tag a jumper or low to cover a recovery. With Tilt stick enabled, hold Up or Down and flick the aim stick sideways.</p><p>Out of a run, release forward briefly, then press forward and Attack together to slide into a tilt. Reverse and tap Attack to strike behind you while your paws still skid forward. Up and down tilts work straight out of the run.</p><ul class="move-rows guide-tilts">' +
        Object.entries(kit.tilts)
          .map(([side, id]) => guideMoveRow(moves[id], tiltInputs[side], side, 'tilts'))
          .join('') +
        '</ul><h3 class="guide-section">Dash attack</h3><ul class="move-rows guide-dash">' +
        guideMoveRow(moves[kit.dashAttack], 'Run + Attack', 'dash', 'dash') +
        '</ul>' +
        ledgeMove +
        '<h3 class="guide-section">Aerial attacks</h3><p>Jump + Attack gives a rising short-hop aerial. For a low approach, hold Short hop and wait until you are falling to press Attack. Flick Down in the last three frames before the apex or as you descend to fast-fall. Forward follows your facing.</p><p>Press Shield during an aerial in the last seven frames before touchdown to halve its landing recovery, rounded up. Mint streaks at the paws mark a landing cancel. Keep holding Shield to block the reply. Try <strong>Training → Aerial practice → Landing cancel</strong>.</p><p>Each forward air has a clean hit and a softer follow-through. Practice landing the late hit into a jab in <strong>Training → Aerial practice → Landing hits</strong>.</p><p>Steer with the left stick and flick the right stick to swing in a separate direction. On keyboard, aim left/right/up/down with '+strikeKeys(0)+' for P1 or '+strikeKeys(1)+' for P2. On touch, flick outward from Smash. For a running back air, reverse direction with Jump and steer back along your original path. Try <strong>Aerial practice → Approach</strong>.</p><ul class="move-rows guide-airs">' +
        rows +
        '</ul>';
    }
    return '<div class="guide-dogs" role="group" aria-label="Fighter move list">' +
        tabs +
        '</div>' +
        sections +
        contents +
        '<div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>';
  }
  window.FighterSchool={moveGuide,courses,Trial,Example,hint,sheet,tryoutSheet,mark,cleared,study,makeTrial,Demonstration,preview};
})();
