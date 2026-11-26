(() => {
  'use strict';
  const {clamp,topBlastY}=window.DogFight;
  // Keep the landing in shot when two dogs contest a roof, including the gap between Laundry Line's decks.
  function duel(view,width,height,dt,world,snap){
    const [a,b]=world.dogs;
    if(!a.stocks || !b.stocks || a.absent || b.absent || a.stockLift || b.stockLift || world.end!==null)return false;
    const portrait=width<height*1.08;
    let lipX,lipY,inward,best=Infinity;
    for(const f of world.dogs){
      const other=f===a?b:a;
      for(const p of world.terrain){
        if(p.thin)continue;
        const left=f.x<(p.x1+p.x2)*.5,lip=left?p.x1:p.x2;
        const outside=(f.x-lip)*(left?-1:1),altitude=f.y-p.y;
        if(outside < -52 || outside>225 || altitude < -108 || altitude>204 || Math.abs(other.x-lip)>285)continue;
        const distance=Math.abs(outside)+Math.abs(altitude)*.55;
        if(distance<best){best=distance;lipX=lip;lipY=p.y;inward=left?1:-1;}
      }
    }
    if(lipX===undefined && !portrait)return false;
    // Beyond the playable exchange the wide camera and blast radar take over.
    if(Math.min(a.x,b.x)<-45 || Math.max(a.x,b.x)>world.stageWidth+45 ||
       Math.min(a.y,b.y)<-35 || Math.max(a.y,b.y)>705 || world.suddenDeath)return false;
    let left=Math.min(a.x-a.stats.width,b.x-b.stats.width)-24;
    let right=Math.max(a.x+a.stats.width,b.x+b.stats.width)+24;
    let top=Math.min(a.y-a.stats.height,b.y-b.stats.height)-47,bottom=Math.max(a.y,b.y)+18;
    if(lipX!==undefined){
      left=Math.min(left,lipX,lipX+inward*96);right=Math.max(right,lipX,lipX+inward*96);
      top=Math.min(top,lipY-38);bottom=Math.max(bottom,lipY+38);
    }
    const span=right-left,rise=bottom-top;
    const target=Math.min(portrait?2.12:1.62,width/Math.max(portrait?346:680,span+126),height/(rise+208));
    const blend=snap?1:1-Math.exp(-dt*(target<view.zoom?8:3.5));
    // Follow launch velocity just enough to leave space in front of the action.
    const aimX=(left+right)*.5+clamp((a.vx+b.vx)*.052,-48,48);
    const aimY=(top+bottom)*.5-15+clamp((a.vy+b.vy)*.036,-30,30);
    view.zoom=Math.min(view.zoom+(target-view.zoom)*blend,width/(span+38),height/(rise+82));
    const halfW=width/(2*view.zoom),halfH=height/(2*view.zoom);
    view.cx=clamp(view.cx+(aimX-view.cx)*blend,right-halfW+18,left+halfW-18);
    view.cy=clamp(view.cy+(aimY-view.cy)*blend,bottom-halfH+40,top+halfH-40);
    return true;
  }
  function frame(view,width,height,dt,world,resized,focus,steady){
    const [a,b]=world.dogs,koTest=world.freshnessPractice?.koTest,survival=world.survivalPractice;
    if(!view.fixed && !focus && !world.bells && !koTest && !survival && duel(view,width,height,dt,world,resized))return;
    const spread=Math.abs(a.x-b.x),vertical=Math.abs(a.y-b.y);
    const off=a.x<155 || a.x>1045 || a.y>490 || a.y<80 || b.x<155 || b.x>1045 || b.y>490 || b.y<80;
    const wideShot=Math.min(1,width/1200,height/675);
    let targetZoom = world.bells ? Math.min(width/1060,height/580,1.5) : off || view.fixed ? wideShot :
      clamp(Math.min(width / (spread + 505), height / (vertical + 345)), wideShot, 1.5);
    let launchCenterY, survivalX;
    if (koTest) {
      const floorY = world.terrain[0].y, scale = view.pixelRatio;
      // Keep the roof and blast line clear of the score and menu on small screens.
      const above = clamp(80 * scale, height * 0.11, height * 0.24);
      const below = clamp(78 * scale, height * 0.13, height * 0.22);
      targetZoom = Math.min(width / 575, (height - above - below) / (floorY - topBlastY));
      launchCenterY = (floorY + topBlastY) / 2 + (below - above) / (2 * targetZoom);
    }
    if (survival) {
      const edge = survival.dir > 0 ? world.stageWidth + 115 : -115, floor = world.terrain[survival.ground];
      const inner = survival.lip - survival.dir * 183, outer = edge + survival.dir * 54;
      const high = Math.min(floor.y - 245, a.y - a.stats.height - 78), low = Math.max(floor.y + 88, a.y + 52);
      targetZoom = Math.min(1.45, width / Math.abs(outer - inner), height / (low - high + 152));
      survivalX = (inner + outer) / 2;
      launchCenterY = (low + high) / 2 - 18;
    }
    let focusX,focusY;
    if (focus && !steady && !view.fixed) {
      const left = Math.min(a.x-a.stats.width,b.x-b.stats.width), right = Math.max(a.x+a.stats.width,b.x+b.stats.width);
      const top = Math.min(a.y-a.stats.height,b.y-b.stats.height), bottom = Math.max(a.y,b.y);
      focusX = (right+left)/2;
      focusY = (top+bottom)/2;
      targetZoom = Math.min(2.55,width/(right-left+248),height/(bottom-top+232));
    }
    const blend = resized ? 1 : view.finishReturn && !steady ? 1-Math.exp(-dt*(focus ? 18 : 12)) :
      koTest || survival || world.bells ? 1 : 1 - Math.exp(-dt * (targetZoom < view.zoom ? 7.5 : 4));
    view.zoom += (targetZoom - view.zoom) * blend;
    const halfW = width / (2 * view.zoom), halfH = height / (2 * view.zoom);
    const centerX = world.bells ? 600 : survival ? survivalX : koTest ? world.freshnessPractice.marks[0] + (a.kind === 'clover' ? 176 : 89) :
      halfW >= 600 ? 600 : clamp((a.x + b.x) / 2, halfW, 1200 - halfW);
    const centerY = world.bells ? 324 : koTest || survival ? launchCenterY : halfH >= 337.5 ? 337.5 : clamp((a.y + b.y) / 2 - 67, halfH, 675 - halfH);
    view.cx += ((focusX ?? centerX) - view.cx) * blend;
    view.cy += ((focusY ?? centerY) - view.cy) * blend;
    if (focus && !steady && !view.fixed) {
      view.cx = clamp(view.cx, Math.max(a.x+a.stats.width,b.x+b.stats.width)-halfW+34,
        Math.min(a.x-a.stats.width,b.x-b.stats.width)+halfW-34);
      view.cy = clamp(view.cy, Math.max(a.y,b.y)-halfH+32, Math.min(a.y-a.stats.height,b.y-b.stats.height)+halfH-48);
    }
  }
  window.FightCamera={frame};
})();
