(() => {
  'use strict';
  const {clamp,fighters}=window.DogFight;
  const teams=['#ef926e','#98d0d1'],ink='#252337',paper='#fff1c7',gold='#f4c76a';
  function describe(call){
    const outs=call.exits.map(d=>'P'+(d.slot+1)+' '+fighters[d.kind].name+' out at the '+d.zone+' blast line');
    return outs.join('. ')+'. '+(call.points?'Points':'Stocks remaining')+'. P1 '+call.score[0]+', P2 '+call.score[1]+'.';
  }
  function spark(ctx,x,y,r,color){
    ctx.fillStyle=color;
    ctx.fillRect(x-2,y-r,4,r*2);ctx.fillRect(x-r,y-2,r*2,4);ctx.fillRect(x-4,y-4,8,8);
  }
  function exitMark(ctx,d,age,scale,left,top,zoom,steady){
    const {width:w,height:h}=ctx.canvas;
    const x=Math.round(clamp((d.x-left)*zoom,19*scale,w-19*scale));
    const y=Math.round(clamp((d.y-top)*zoom,19*scale,h-19*scale));
    const tint=teams[d.slot];
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    if(steady){
      spark(ctx,0,0,11,tint);
    }else if(d.zone==='top'){
      // A single arc, with the sprite shrinking into a glint above the playfield.
      const t=Math.min(1,age/43), u=1-t;
      const px=Math.round((d.face || 1)*28*t*u),py=Math.round(78*u*u+6);
      if(t<.82){
        ctx.fillStyle=tint;
        ctx.fillRect(px-13,py+9,4,9);ctx.fillRect(px+3,py+16,3,13);
        window.DogArt.draw(ctx,d.kind,px,py,{pose:'tumble',phase:t,time:t*.8,face:d.face,coat:d.coat,scale:.18+.70*u*u});
      }
      if(t>.48)spark(ctx,px,py-5,Math.max(3,Math.round(12*Math.sin(Math.PI*(t-.48)/.64))),paper);
    }else{
      // Local +x points out through the line. Shorten the trail toward the exit as it burns out.
      if(d.zone==='left')ctx.rotate(Math.PI);
      else if(d.zone==='bottom')ctx.rotate(Math.PI/2);
      const t=Math.min(1,age/42),length=Math.round((1-t)*118)+10;
      const half=Math.round(3+9*(1-t));
      ctx.fillStyle=ink;
      ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-14,-half-4);ctx.lineTo(-length-8,1);
      ctx.lineTo(-18,half+5);ctx.closePath();ctx.fill();
      ctx.fillStyle=tint;
      ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-16,-half);ctx.lineTo(-length,1);
      ctx.lineTo(-20,half);ctx.closePath();ctx.fill();
      ctx.fillStyle=paper;ctx.fillRect(-Math.round(length*.53),-2,Math.round(length*.53)+5,4);
      for(const side of [-1,1]){
        ctx.fillStyle=tint;
        ctx.fillRect(-length*.69,side*(half+7),length*.28,3);
        ctx.fillRect(-length*.84,side*(half+13),5,3);
      }
    }
    ctx.restore();
  }
  function tally(ctx,call,age,scale,steady,solo){
    const {width,height}=ctx.canvas, center=Math.round(width/2);
    const y=Math.round(height*.265);
    ctx.save();ctx.translate(center,y);ctx.scale(scale,scale);ctx.textAlign='center';ctx.textBaseline='middle';
    const offset=steady?0:Math.round(12*Math.max(0,1-age/8)**2);
    const caption=call.exits.length===2?'DOUBLE KO':call.points?(call.exits[0].credited?'KO':'SELF-DESTRUCT'):'STOCKS';
    ctx.font='11px "Brawl Pixel", monospace';
    const half=Math.ceil(Math.max(28,ctx.measureText(caption).width/2+8));
    ctx.fillStyle=ink;ctx.fillRect(-half,-23,half*2,16);
    ctx.fillStyle=paper;ctx.fillText(caption,0,-15);
    for(let i=0;i<2;i++){
      const side=i?1:-1,x=side*(35+offset);
      ctx.fillStyle=ink;ctx.fillRect(x-24,-6,48,34);ctx.fillRect(x-28,-2,56,25);
      ctx.fillStyle=teams[i];ctx.fillRect(x-23,24,46,3);
      ctx.font='21px "Brawl Pixel", monospace';ctx.fillText(String(call.score[i]),x,12,45);
      ctx.font='8px "Brawl Pixel", monospace';ctx.fillStyle=paper;
      ctx.fillText(i?(solo?'CPU':'P2'):'P1',x,-2);
    }
    ctx.fillStyle=gold;ctx.fillRect(-4,9,8,3);
    ctx.restore();
  }
  function draw(ctx,world,age,left,top,zoom,steady){
    if(age<0 || age>=72)return;
    const call=world.stockCall,{width,height}=ctx.canvas;
    const scale=clamp(Math.min(width/580,height/540),.58,2);
    ctx.save();
    if(age<46){
      ctx.globalAlpha*=clamp((46-age)/10,0,1);
      for(const d of call.exits)exitMark(ctx,d,age,scale,left,top,zoom,steady);
    }
    ctx.restore();ctx.save();
    ctx.globalAlpha*=clamp((72-age)/12,0,1);
    tally(ctx,call,age,scale,steady,world.mode==='solo');
    ctx.restore();
  }
  window.StockCall={draw,describe};
})();
