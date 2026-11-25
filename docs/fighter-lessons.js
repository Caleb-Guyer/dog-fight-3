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
  function hint(info,device,keyFor,padFor){
    function label(action){
      if(device===0)return keyFor(0,action);
      if(device===2)return action[0].toUpperCase()+action.slice(1);
      return ['right','up','down'].includes(action)?'Stick '+action:padFor(0,action);
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
  window.FighterSchool={courses,Trial,hint,sheet,mark,cleared};
})();
