(() => {
  'use strict';
  const {clamp}=window.DogFight;
  const ink='#252337',paper='#ffebbe',brass='#e8b75a',steel='#82949a',rope='#cd9659';
  const teams=['#f19871','#91ced0'];
  const beat=(time,start,end)=>clamp((time-start)/(end-start),0,1);
  const snap=n=>Math.round(n/2)*2;
  function rect(ctx,x,y,w,h,color){
    ctx.fillStyle=color;ctx.fillRect(snap(x),snap(y),w,h);
  }
  // Local x points toward the other dog. Each entrance finishes at the real spawn point.
  function pose(kind,time){
    let x=0,y=0,action='idle',phase=0;
    if(kind==='pip'){
      const leap=beat(time,.18,.82);
      x=-48*(1-beat(time,0,.82));y=-43*4*leap*(1-leap);
      action=time<.18?'dashStart':time<.82?'jump':time<1.04?'land':time<1.53?'win':'idle';
      phase=time<.18?beat(time,0,.18):time<.82?leap:beat(time,.82,1.04);
    }else if(kind==='brisket'){
      const roll=beat(time,0,.76),hop=beat(time,.74,1.06);
      x=-58*(1-roll)**2-12*(1-hop);
      y=-12*(1-hop)-19*4*hop*(1-hop);
      action=time<.74?'crouch':time<1.06?'jump':time<1.30?'land':time<1.68?'win':'idle';
      phase=time<1.06?hop:beat(time,1.06,1.30);
    }else if(kind==='noodle'){
      const swing=beat(time,0,.88),drop=beat(time,.88,1.16);
      x=-46*(1-swing)**2+10*Math.sin(Math.PI*swing);
      y=-24*(1-drop**2)-37*(1-swing)**2;
      action=time<.88?'jump':time<1.16?'fall':time<1.40?'land':time<1.72?'win':'idle';
      phase=time<.88?swing:time<1.16?drop:beat(time,1.16,1.40);
    }else{
      const run=beat(time,.06,.75),catchDisc=beat(time,.62,1.18);
      x=-50*(1-run);y=-25*4*catchDisc*(1-catchDisc);
      action=time<.62?'run':time<.94?'jump':time<1.18?'win':time<1.38?'land':time<1.70?'win':'idle';
      phase=time<1.18?catchDisc:beat(time,1.18,1.38);
    }
    return {x:snap(x),y:snap(y),action,phase};
  }
  function envelope(ctx,x,y){
    rect(ctx,x-14,y-9,30,18,ink);rect(ctx,x-12,y-7,26,14,paper);
    for(let i=0;i<5;i++){
      rect(ctx,x-12+i*2,y-6+i,4,2,'#a27760');
      rect(ctx,x+9-i*2,y-6+i,4,2,'#a27760');
    }
    rect(ctx,x+7,y-5,4,4,'#c35e4d');
  }
  function handcart(ctx,x,time){
    ctx.save();ctx.translate(snap(x),0);
    rect(ctx,-32,-15,65,7,ink);rect(ctx,-30,-13,61,3,'#cb9159');
    rect(ctx,-32,-39,6,26,ink);rect(ctx,-32,-37,2,22,steel);rect(ctx,-38,-41,12,5,ink);
    for(const px of [-22,20]){
      rect(ctx,px-5,-9,10,8,ink);rect(ctx,px-3,-7,6,4,steel);
      rect(ctx,px-2+(Math.floor(time*14)%2)*2,-7,2,2,paper);
    }
    ctx.restore();
  }
  function lead(ctx,x,y){
    // A stepped, twisted lead with a loop at the free end.
    for(let i=0;i<19;i++){
      const at=x+(i-18)*.52;
      rect(ctx,at-2,y-(18-i)*5,6,6,ink);
      rect(ctx,at,y-(18-i)*5,2,5,i%2?brass:rope);
    }
    rect(ctx,x-3,y,10,8,ink);rect(ctx,x-1,y,6,5,rope);rect(ctx,x+1,y,2,3,ink);
  }
  function disc(ctx,x,y,time){
    ctx.save();ctx.translate(snap(x),snap(y));ctx.rotate(Math.sin(time*9)*.36);
    rect(ctx,-15,-3,30,6,ink);rect(ctx,-11,-6,22,12,ink);
    rect(ctx,-13,-2,26,4,'#6b9e90');rect(ctx,-10,-4,20,6,'#8acbbc');
    rect(ctx,-6,-3,11,2,paper);rect(ctx,6,0,4,2,brass);ctx.restore();
  }
  function props(ctx,kind,t,p){
    if(kind==='pip' && t<.91){
      const arc=beat(t,0,.91);
      envelope(ctx,-69+105*arc,-19-24*Math.sin(Math.PI*arc));
    }else if(kind==='brisket' && t<1.49){
      ctx.globalAlpha*=1-beat(t,1.23,1.49);
      handcart(ctx,t<.74?p.x:-12-60*beat(t,.74,1.49),t);
    }else if(kind==='noodle' && t<1.35){
      const pull=beat(t,.88,1.35);
      ctx.globalAlpha*=1-beat(t,1.18,1.35);
      lead(ctx,p.x+13,-24*(1-pull)-33-115*pull-37*(1-beat(t,0,.88))**2);
    }else if(kind==='clover' && t<.94){
      const arc=beat(t,0,.94);
      disc(ctx,-72+88*arc,-37-49*Math.sin(Math.PI*arc*.89)-21*arc,t);
    }
  }
  function draw(ctx,f,world,remaining,reduced){
    const t=Math.max(0,2.4-remaining-.32*f.index);
    const p=reduced?{x:0,y:0,action:'idle',phase:0}:pose(f.kind,t);
    ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.face,1);
    const width=28+Math.round(p.y*.15);
    ctx.fillStyle='#25233766';ctx.fillRect(p.x-width,0,width*2,3);
    if(!reduced){ctx.save();props(ctx,f.kind,t,p);ctx.restore();}
    window.DogArt.draw(ctx,f.kind,p.x,p.y,{coat:world.coatFor(f.index),face:1,pose:p.action,
      phase:p.phase,time:reduced?0:t,scale:1});
    ctx.restore();
  }
  function names(ctx,world,seats){
    const canvas=ctx.canvas,ratio=canvas.clientWidth?canvas.width/canvas.clientWidth:1;
    const matrix=ctx.getTransform(),w=canvas.width/ratio,h=canvas.height/ratio;
    const size=w<540?12:16, height=size+10;
    ctx.save();ctx.setTransform(ratio,0,0,ratio,0,0);ctx.textAlign='center';ctx.textBaseline='middle';
    for(const f of world.dogs){
      const label=seats[f.index]+'  '+f.stats.name.toUpperCase();
      ctx.font=size+'px "Brawl Pixel",monospace';
      const width=Math.min(w/2-12,Math.ceil(ctx.measureText(label).width)+18);
      const at=(matrix.a*f.x+matrix.e)/ratio;
      const left=clamp(Math.round(at-width/2),f.index?w/2+2:4,f.index?w-width-4:w/2-width-2);
      const y=clamp(Math.round((matrix.d*f.y+matrix.f)/ratio)+9,6,h-height-6);
      ctx.fillStyle=ink;ctx.fillRect(left,y,width,height);ctx.fillStyle=teams[f.index];
      ctx.fillRect(left+2,y+height-3,width-4,2);ctx.fillStyle=paper;
      ctx.fillText(label,left+width/2,y+height/2-1,width-10);
    }
    ctx.restore();
  }
  // Short arrival sounds leave space for the countdown bell.
  function cue(kind,tone){
    if(kind==='pip'){tone(820,1090,.07,0,'triangle',.045);tone(610,840,.09,.075,'triangle',.045);}
    else if(kind==='brisket'){tone(135,49,.15,0,'triangle',.13);tone(290,115,.055,.045,'square',.027);}
    else if(kind==='noodle'){tone(470,265,.16,0,'triangle',.064);tone(790,490,.12,.04,'sine',.036);}
    else{tone(550,1120,.12,0,'sine',.06);tone(1150,710,.09,.12,'sine',.045);}
  }
  window.FighterEntrances={draw,names,cue};
})();
