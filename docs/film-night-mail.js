/* The east line, the brake van and the clockbag, on the film's native pixel grid. */
(() => {
  'use strict';
  const {c, plate, dog, steam, train, stationClock, ease} = window.DispatchFilmArt;
  function riverside(p, view, scroll, dawn) {
    const sky=dawn?'#797687':'#202b44', water=dawn?'#787e86':'#344660';
    p.rect(view.left,view.top,view.right-view.left,view.bottom-view.top,sky);
    const bank=plate('east-bank-'+dawn,320,158,q=>{
      for(let i=0;i<39;i++) q.rect((i*89)%319,(i*i*11)%72,1+i%2,1,dawn?'#baac9c':'#9894a4');
      q.oval(245,38,12,12,dawn?'#f0bd8d':'#d1ccb0');
      q.oval(240,34,10,10,sky);
      for(let i=0;i<17;i++){
        const x=i*20-5,h=(i*13)%21;
        q.poly([x,112,x,88-h,x+8,81-h,x+17,87-h,x+17,112],dawn?'#686b7d':'#384461');
        q.rect(x+3,91-h,2,3,i%4?sky:c.sand);
      }
      q.rect(0,109,320,49,water);
      for(let i=0;i<55;i++) q.rect(i*31%320,112+(i*17%44),2+i%7,1,dawn?'#9b9693':'#4a5d73');
      for(let x=0;x<320;x+=40){
        q.path([x,105,x+18,87,x+38,104],dawn?'#565a68':'#2e394e',2);
        q.rect(x,104,40,4,c.night); q.rect(x+18,107,4,13,c.night);
      }
    });
    const offset=Math.round(scroll)%320;
    for(let x=320*Math.floor((view.left+offset)/320)-offset;x<view.right;x+=320) p.image(bank,x,0);
    p.rect(view.left,156,view.right-view.left,Math.max(0,view.bottom-156),water);
  }
  function van(p,x,y) {
    const carriage=plate('east-mail-van',112,44,q=>{
      q.rect(1,6,110,30,c.ink);q.rect(4,8,104,24,c.green);
      q.poly([0,7,5,2,101,0,111,4,111,7],c.slate);
      q.path([4,4,98,2,105,4],c.steel,2);
      for(let i=8;i<100;i+=16){
        q.rect(i,10,11,9,c.ink);q.rect(i+1,11,9,5,c.navy);q.rect(i+2,11,2,3,c.steel);
      }
      q.rect(1,24,110,1,c.ochre);q.rect(2,32,108,3,c.night);
      for(const wheel of [17,30,83,96]){q.oval(wheel,36,6,6,c.ink);q.oval(wheel,36,3,3,c.slate);}
    });
    p.image(carriage, x,y);
  }
  function semaphore(p,x,y,red,lower) {
    p.rect(x-3,y-68,6,71,c.ink);p.rect(x-1,y-65,2,65,c.steel);
    const endY=y-73+Math.round(lower*17);
    p.line(x,y-55,x+24,endY,c.ink,5);p.line(x+3,y-55,x+23,endY+1,c.coral,3);
    p.rect(x-7,y-63,13,21,c.ink);p.oval(x,y-57,4,4,red?c.coral:c.brick);p.oval(x,y-47,4,4,red?c.green:c.mint);
  }
  function bankEdge(p,v,y) {
    p.rect(v.left,y,v.right-v.left,Math.max(0,v.bottom-y),c.night);
    p.rect(v.left,y,v.right-v.left,2,c.wheat);
    for(let x=Math.floor(v.left/24)*24;x<v.right;x+=24)p.path([x,y+3,x-3,y+9,x+14,y+9],c.slate);
  }
  window.DispatchFilms.nightmail=(p,part,t,v)=>{
    riverside(p,v,t*(part?9:2),false);
    if(!part){
      const x=197-135*ease(0,5.3,t);
      for(let i=-1;i<4;i++) van(p,x+i*113,112);
      p.image(train(),x+112,89,99,60);
      steam(p,x+182-t*2,90,42,11,'#576777','#8b9596');
      bankEdge(p,v,146);semaphore(p,44,146,false,0);
      dog(p,'clover',99,146,.8,1,'idle',.5,t);
    }else{
      bankEdge(p,v,160);
      for(let i=-1;i<4;i++)van(p,144+i*113,107);
      const f=ease(1.6,4.7,t),rise=Math.sin(f*Math.PI)*36;
      const x=83+93*f,y=158-50*f-rise;
      const disc=ease(.8,3.3,t);
      p.oval(87+124*disc,133-35*disc-32*Math.sin(disc*Math.PI),7,2,c.aqua);
      dog(p,'clover',x,y,.82,1,f===1?'land':f?'jump':'idle',f,t);
      semaphore(p,264,143,false,.15);
    }
  };
  window.DispatchFilms.firstlight=(p,part,t,v)=>{
    riverside(p,v,0,true);
    bankEdge(p,v,148);
    if(!part){
      const brake=ease(0,4,t),x=25+70*brake;
      p.image(train(),x,86,102,62);
      van(p,x-111,107);semaphore(p,235,148,t>.9,ease(.7,1.5,t));
      dog(p,'clover',210,150,.76,1,'land',brake,t);
      dog(p,'noodle',80,151,.7,1,t<2?'run':'idle',brake,t);
    }else{
      dog(p,'clover',104,150,.85,1,'idle',.5,t);
      dog(p,'noodle',215,151,.78,-1,'idle',.5,t);
      const lift=ease(1.7,3.8,t);
      p.poly([135,153,132,142,140,127,145,125,142,119,158,118,156,125,166,130,174,148,171,153],c.brick);
      p.path([136,146,142,132,149,127,160,132,169,147],c.ochre,2);
      for(const [x,y,r] of [[143,134,5],[161,131,6],[151,127,8]]){
        const cy=y-lift*(151-x/2)*.16;
        stationClock(p,x,cy,r);
        p.line(x,cy,x+Math.sin(t*2)*r*.6,cy-Math.cos(t*2)*r*.6,c.ink);
      }
    }
  };
})();
