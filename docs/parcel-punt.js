(() => {
  'use strict';
  const {Battle,idleInput,fighters,smashes,seededRandom}=window.DogFight;
  const origin=600,deck=456,grass=456,gravity=645,limit=600;
  const tips={
    pip:'Open with Quick Paw. Catch the bag in front of Pip and release Bolt Kick.',
    brisket:'Pummel the bag in a Bear Hug, then catch it on the way down with Haymaker.',
    noodle:'Use Lead Loop to reposition the bag. The knot at the tip of Lead Snap launches it harder.',
    clover:'Build damage with a disc or a jab, then leave room for Line Drive to reach the bag.',
  };
  const meters=n=>(n/10).toFixed(1)+' m';
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const memory=new Map(),key=kind=>'dog-fight-3.parcel.1.'+kind;
  function best(kind){
    let disk=0;
    try{disk=Number(localStorage.getItem(key(kind)));}catch{}
    return Math.max(memory.get(kind)||0,Number.isSafeInteger(disk) && disk>0?disk:0);
  }
  function save(run){
    if(run.endReason!=='distance')return Promise.resolve();
    const kind=run.dogs[0].kind;
    const commit=()=>{
      const previous=best(kind);run.previous=previous;
      if(run.distance<=previous)return;
      memory.set(kind,run.distance);
      try{localStorage.setItem(key(kind),String(run.distance));}catch{run.tabOnly=true;}
    };
    return globalThis.navigator?.locks?navigator.locks.request(key(kind),commit).catch(commit):Promise.resolve(commit());
  }
  class Run extends Battle {
    constructor(config,event=()=>{},random=seededRandom(37)){
      const layout={length:1200,terrain:[{x1:335,x2:865,y:deck,thin:false}],walls:[],ceilings:[],
        spawns:[{x:534,ground:0},{x:origin,ground:0}]};
      super({...config,mode:'parcel',stage:'nightmail',p2:'brisket',fetch:false,layout},event,random);
      this.phase='prep';this.distance=0;this.previous=best(config.p1);this.contacts=0;
      this.emit=(name,e)=>{
        if(this.phase==='prep' && ((name==='hit' && e.f===this.dogs[1]) || name==='pummelHit')){
          this.contacts++;
          if(name==='hit' && e.moveId===this.dogs[0].kit.smashes.side){
            const bag=this.dogs[1];
            const landing=(-bag.vy+Math.sqrt(bag.vy**2+2*gravity*Math.max(0,grass-bag.y)))/gravity;
            this.flight={x:bag.x,y:bag.y,vx:bag.vx,vy:bag.vy,t:0,landing,move:e.moveId,damage:bag.damage};
            this.phase='release';
          }
        }
        event(name,e);
      };
    }
    hit(target,owner,damage,base,growth,aim,name,face,point,move,id,...rest){
      // The soft target lifts at the move's listed angle even on a light grounded hit.
      if(target===this.dogs[1] && id===owner.kit.smashes.side && move?.lowLaunch)move={...move,lowLaunch:false};
      return super.hit(target,owner,damage,base,growth,aim,name,face,point,move,id,...rest);
    }
    step(dt,input=idleInput){
      if(this.end!==null)return;
      const [hero,bag]=this.dogs;
      if(this.phase==='prep'){
        this.matchFrames+=dt*60;
        super.step(dt,input,idleInput);
        if(this.phase==='release')return;
        if(this.end!==null)return;
        if(!bag.grip){
          const x=Math.max(origin-110,Math.min(origin+110,bag.x));
          if(x!==bag.x){bag.x=x;bag.vx*=-.35;}
          if(bag.ground>=0 && !bag.stun && !bag.impactLag && !this.hitStop)
            bag.x+=(origin-bag.x)*Math.min(1,dt*3);
        }
        if(this.matchFrames>=limit)this.finishMatch(1,'expired');
        else if(this.matchFrames>=limit-180 && this.matchFrames%60===0)this.emit('tick',{f:hero});
        return;
      }
      if(this.phase==='release'){
        if(this.hitStop>0){super.step(dt,idleInput,idleInput);return;}
        this.phase='flight';this.projectiles=[];bag.ground=-1;bag.tumble=bag.reaction=null;
        this.emit('parcelLaunch',{f:hero});
      }
      const arc=this.flight;
      this.time+=dt;
      this.move(hero,idleInput,dt);
      arc.t=Math.min(arc.landing,arc.t+dt);
      bag.x=arc.x+arc.vx*arc.t;bag.y=arc.y+arc.vy*arc.t+.5*gravity*arc.t**2;
      this.distance=Math.round(Math.abs(bag.x-arc.x));
      if(arc.t===arc.landing){
        bag.y=grass;this.phase='landed';this.finishMatch(0,'distance');
      }
    }
    knockouts(out){
      if(out.includes(this.dogs[0]))return this.finishMatch(1,'fall');
      if(out.includes(this.dogs[1]) && this.phase==='prep'){
        const bag=this.dogs[1],damage=bag.damage;this.spawn(bag,false);bag.damage=damage;
      }
    }
    clock(){return this.phase==='prep'?((limit-this.matchFrames)/60).toFixed(1)+' s':meters(this.distance);}
    label(){
      if(this.phase==='flight' || this.phase==='landed')return smashes[this.flight.move].label+' · '+Math.round(this.flight.damage)+'%';
      return 'Mailbag '+Math.round(this.dogs[1].damage)+'%';
    }
  }
  function bagSprite(ctx,x,y,angle,held){
    ctx.save();ctx.translate(Math.round(x),Math.round(y)-32);ctx.rotate(angle);
    const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    const k='#392f40',tan='#ce9766',light='#ebbd84',red='#b9544d';
    r(-24,-22,48,52,k);r(-29,-14,58,39,k);r(-20,26,40,7,k);
    r(-21,-21,42,47,tan);r(-25,-12,50,35,tan);r(-18,24,36,5,tan);
    r(-19,-20,32,5,light);r(-25,-12,7,31,light);r(18,-9,6,31,'#ae7959');
    r(-17,-29,33,7,k);r(-13,-32,23,6,light);r(-15,-27,30,5,red);
    r(-25,11,50,6,red);r(3,-19,5,43,red);
    r(-13,-13,25,19,k);r(-11,-11,21,15,'#f5ddaa');r(-8,-8,4,3,red);
    r(-3,-5,11,3,'#547b78');r(-8,0,13,2,'#547b78');
    if(held){r(12,-26,6,7,'#ebbd84');}
    ctx.restore();
  }
  function flag(ctx,x,y,label,record){
    x=Math.round(x);const color=record?'#ebad53':'#a8d4bd';
    ctx.fillStyle='#343343';ctx.fillRect(x-2,y-53,5,53);
    ctx.fillStyle=color;ctx.fillRect(x+2,y-51,33,16);ctx.fillRect(x+2,y-35,21,3);
    ctx.fillStyle='#343343';ctx.font='bold 10px monospace';ctx.textAlign='left';ctx.fillText(label,x+4,y-39,30);
  }
  function yard(ctx,left,top,right,bottom,run){
    const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.floor(x),Math.floor(y),w,h);};
    rect(left-1,top-1,right-left+3,bottom-top+3,'#9ebdbc');
    rect(left-1,260,right-left+3,230,'#d7c9a5');
    for(let i=Math.floor(left*.23/310)-1;i<=(right-left*.77)/310;i++){
      const x=i*310+left*.77,y=194+(Math.abs(i)%3)*24;
      rect(x,y,80,5,'#c8d3c3');rect(x+8,y-6,57,6,'#dce0ca');rect(x+22,y-11,24,5,'#dce0ca');
    }
    const parallax=left*.68;
    for(let i=Math.floor((left-parallax)/170)-1;i<=(right-parallax)/170+1;i++){
      const x=i*170+parallax,h=24+Math.abs(i%4)*8;
      rect(x,439-h,120,h,'#849894');rect(x+8,432-h,101,8,'#81908e');
      rect(x+12,445-h,17,7,'#adbbac');rect(x+36,445-h,17,7,'#adbbac');
      rect(x+97,424-h,9,16,'#7e9390');
    }
    rect(left-1,427,right-left+2,47,'#96a27d');rect(left-1,445,right-left+2,5,'#536f65');
    for(let x=Math.floor(left/84)*84;x<right;x+=84){
      rect(x,421,5,34,'#586c63');rect(x+4,423,3,28,'#a4a68a');
      rect(x,433,84,3,'#6c8070');
    }
    rect(left-1,grass,right-left+3,7,'#dad098');rect(left-1,grass+7,right-left+3,8,'#718460');
    rect(left-1,grass+15,right-left+3,Math.max(0,bottom-grass-14),'#7d976d');
    for(let i=Math.floor(left/73)-1;i<=right/73;i++){
      const x=i*73,y=grass+57+(Math.abs(i*13)%27);
      rect(x,y,12,2,'#6d8765');rect(x+3,y-3,2,3,'#6d8765');rect(x+34,y+31,5,2,'#93a97b');
    }
    const start=run.flight?.x??origin,dir=Math.sign(run.flight?.vx)||1;
    for(let n=Math.floor((left-start)/100);n<=(right-start)/100;n++){
      const x=start+n*100;rect(x,grass+2,3,10,'#e8ddb3');
      if(n && n%5===0)flag(ctx,x,grass,Math.abs(n)*10+'m',false);
      else if(n){ctx.fillStyle='#344a40';ctx.textAlign='center';ctx.font='12px monospace';ctx.fillText(Math.abs(n)*10+'m',x,grass+46);}
    }
    if(run.previous)flag(ctx,start+dir*run.previous,grass,'BEST',true);
    rect(335,deck,530,9,'#343343');rect(335,deck+2,530,4,'#f5d194');
    rect(341,deck+9,518,19,'#9b6958');rect(341,deck+23,518,5,'#594b50');
    for(let x=350;x<856;x+=51){rect(x,deck+10,3,13,'#805652');rect(x,deck+12,3,3,'#e5b983');}
    for(const x of [365,477,703,819])rect(x,deck+28,13,4,'#584b4a');
    rect(370,deck-86,7,86,'#594b50');rect(360,deck-105,92,39,'#383543');
    rect(363,deck-102,86,33,'#587b75');ctx.fillStyle='#ffe6ac';ctx.textAlign='center';ctx.font='12px "Brawl Pixel", monospace';
    ctx.fillText('PARCEL',406,deck-87);ctx.fillText('YARD',406,deck-73);
    for(const x of [origin-110,origin+110]){rect(x-5,deck-5,10,5,'#f2d284');rect(x-2,deck-10,4,5,'#b65c4c');}
  }
  function draw(view,canvas,run,dt){
    view.fitCanvas(canvas);
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,[hero,bag]=run.dogs;
    const flight=run.phase==='flight' || run.phase==='landed',x=flight?bag.x:Math.min(715,Math.max(480,(hero.x+bag.x)/2));
    const span=flight?520:Math.max(600,Math.abs(hero.x-bag.x)+290);
    let scale=Math.min(w/span,h/455),cx=x+(flight?Math.sign(run.flight.vx)*38:0),cy=flight?Math.min(344,bag.y-36):Math.min(326,(hero.y+bag.y)/2-90);
    if(flight && (reduced?.matches || view.constructor.fixedCamera)){
      const arc=run.flight,end=arc.x+arc.vx*arc.landing,apex=arc.y-Math.min(0,arc.vy)**2/(2*gravity);
      const min=Math.min(335,arc.x,end)-70,max=Math.max(865,arc.x,end)+70;
      const ceiling=Math.min(185,apex-100),floor=grass+110;
      cx=(min+max)/2;cy=(ceiling+floor)/2;scale=Math.min(w/(max-min),h/(floor-ceiling));
    }
    const left=cx-w/(2*scale),top=cy-h/(2*scale);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.scale(scale,scale);ctx.translate(-Math.round(left),-Math.round(top));
    yard(ctx,left-2,top-2,left+w/scale+2,top+h/scale+2,run);
    if(run.phase==='prep'){
      ctx.strokeStyle='#66595c';ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();
      ctx.moveTo(origin,deck+1);ctx.lineTo(bag.x,bag.y-12);ctx.stroke();ctx.setLineDash([]);
    }
    if(flight){
      for(let i=5;i>0;i--){
        const t=run.flight.t-i*.032;if(t<=0)continue;
        ctx.fillStyle=i%2?'#efd398':'#ebbc81';
        ctx.fillRect(Math.round(run.flight.x+run.flight.vx*t)-3,Math.round(run.flight.y+run.flight.vy*t+.5*gravity*t*t)-32,8-i,4);
      }
    }
    const tilt=flight?run.flight.t*5*Math.sign(run.flight.vx):Math.max(-.32,Math.min(.32,bag.vx/800));
    bagSprite(ctx,bag.x,bag.y,reduced?.matches || run.phase==='landed'?0:tilt,!!bag.grip);
    window.DogFightView.drawFighter(ctx,hero,run,run.time);
    if(run.grapple)window.DogFightView.gripLead(ctx,hero,run.grapple);
    for(const p of run.projectiles)window.DogFightView.drawItem(ctx,p);
    for(const e of view.effects){window.DogFightView.drawEffect(ctx,e);e.life-=dt;}
    view.effects=view.effects.filter(e=>e.life>0);ctx.restore();
  }
  function sheet(kind,portrait){
    const picks=Object.keys(fighters).map(id=>'<button class="cup-dog" data-parcel-dog="'+id+'" aria-pressed="'+(id===kind)+'"><img alt="" src="'+portrait(id)+'"><strong>'+fighters[id].name+'</strong></button>').join('');
    const record=best(kind);
    return '<div class="cup-dogs" role="group" aria-label="Choose a dog">'+picks+'</div><canvas id="parcel-map" width="540" height="156" role="img" aria-label="Start of the parcel measuring field" style="display:block;width:100%;height:auto;image-rendering:pixelated"></canvas>'+
      '<p>You have ten seconds. Build damage on the tethered mailbag, then release a side smash to send it flying. Distance counts in either direction.</p><p>'+tips[kind]+'</p><p id="parcel-binding"></p>'+
      '<p>Personal best · <strong>'+(record?meters(record):'No launch yet')+'</strong></p><div class="dialog-actions"><button class="primary" data-do="parcel-start">Start attempt</button></div>';
  }
  function preview(canvas,kind,coat){
    const ctx=canvas.getContext('2d');ctx.save();ctx.imageSmoothingEnabled=false;ctx.scale(.7,.7);ctx.translate(-215,-327);
    yard(ctx,215,327,990,554,{previous:0});bagSprite(ctx,origin,deck,0,false);
    window.DogArt.draw(ctx,kind,534,deck,{coat,face:1,scale:1,pose:'idle',time:0});ctx.restore();
  }
  function result(run){
    const success=run.endReason==='distance',name=run.dogs[0].stats.name;
    return (success?'<h3 class="card-stage">'+meters(run.distance)+'</h3><p>'+name+' · '+smashes[run.flight.move].label+
      ' · '+Math.round(run.flight.damage)+'% at launch</p>':'<p>'+(run.endReason==='fall'?'You fell off the loading dock.':'The mailbag was still tied when the bell rang.')+' Finish with a side smash before time runs out.</p>')+
      '<p id="parcel-record"></p><div class="dialog-actions"><button class="primary" data-do="parcel-start">Try again</button>'+
      '<button class="utility" data-do="parcel-sheet">Change dog</button><button class="utility" data-do="home">Main menu</button></div>';
  }
  function showResult(run,showDialog,announce,active){
    const $=id=>document.getElementById(id);
    showDialog('parcel-result',run.endReason==='distance'?'Parcel delivered':'Attempt over',result(run),false);
    const update=()=>{
      if(!active())return;
      const record=best(run.dogs[0].kind);
      $('parcel-record').textContent=record?((run.endReason==='distance' && run.distance>run.previous?'New personal best':'Personal best')+
        ' · '+meters(record)+(run.tabOnly?' · This tab':'')):'No distance recorded';
    };
    announce(run.endReason==='distance'?'Parcel delivered. '+meters(run.distance):'Attempt over. '+(run.endReason==='fall'?'Fell off the dock.':'Time expired.'));
    update();run.saved?.then(update);
    document.querySelector('[data-do=parcel-start]').focus();
  }
  function pause(world,showDialog){
      showDialog('pause','Parcel Punt paused','<p>'+world.label()+' · '+world.clock()+'</p><div class="dialog-actions">'+
        '<button class="primary" data-do="resume">Resume</button><button class="utility" data-do="parcel-start">Restart attempt</button>'+
        '<button class="utility" data-do="parcel-sheet">Change dog</button><button class="utility" data-do="home">Main menu</button></div>');
      document.querySelector('[data-do=resume]').focus();
  }
  window.ParcelPunt={Run,draw,sheet,preview,showResult,pause,save,best,meters};
})();
