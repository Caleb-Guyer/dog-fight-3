(() => {
  'use strict';
  const {Battle, idleInput, segmentEntry} = window.DogFight;
  const courses = {
    pip: {name:'Lunch rush', stage:'picnic', start:245,
      tip:'Race along the table, then hop onto the two picnic baskets for the high bells.',
      marks:[[316,417],[440,280],[570,412],[697,330,22],[820,238],[962,412]]},
    brisket: {name:'Tower chime', stage:'bandstand', start:270,
      tip:'Climb the bandstand in steps. Brisket’s overhead attacks reach the bell above each perch.',
      marks:[[347,441],[410,329],[560,255],[654,186,19],[803,326],[912,437]]},
    noodle: {name:'Rooftop relay', stage:'laundry', start:205,
      tip:'Jump the alley or ride the laundry basket across. Save a second jump for the top clothesline.',
      marks:[[295,406],[433,311],[605,293,33],[751,400],[865,224],[987,367]]},
    clover: {name:'Ferry crossing', stage:'canal', start:226,
      tip:'Send a disc through the low bells. Ride the ferry or double-jump for the ones over the water.',
      marks:[[323,411],[476,411],[565,280,32],[675,201],[823,317],[961,409]]},
  };
  const noRivals = [];
  const radius = 16;
  function formatTime(frames, precision = 2) {
    const scale = 10 ** precision, ticks = Math.floor(frames * scale / 60);
    return Math.floor(ticks / (60 * scale)) + ':' +
      String(Math.floor(ticks / scale) % 60).padStart(2,'0') + '.' + String(ticks % scale).padStart(precision,'0');
  }
  function readBest(raw) {
    const value = Number(raw);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  class Run extends Battle {
    constructor(config,event,random) {
      const course = courses[config.p1];
      super({...config,mode:'targets',p2:'pip',stage:course.stage,fetch:false},event,random);
      this.course = course;
      this.dogs[0].x = course.start;
      Object.assign(this.dogs[1],{absent:true,stocks:0});
      this.bells = course.marks.map(([x,y,travel=0])=>({x,y,origin:x,travel,brokenAt:null}));
      this.cleared = 0;
    }
    opponents() { return noRivals; }
    separateGroundedFighters() {}
    move(f,input,dt) { if (!f.absent) super.move(f,input,dt); }
    step(dt,input=idleInput) {
      if (this.end !== null) return;
      this.matchFrames += dt * 60;
      for (const bell of this.bells) if (bell.travel && bell.brokenAt === null)
        bell.x = bell.origin + bell.travel * Math.sin(this.matchFrames * Math.PI / 90);
      super.step(dt,input);
    }
    ring(bell) {
      if (bell.brokenAt !== null || this.end !== null) return;
      bell.brokenAt = this.matchFrames;
      this.cleared++;
      this.emit('ringBell',{f:this.dogs[0],point:bell,count:this.cleared});
      if (this.cleared === this.bells.length) this.finishMatch(0,'clear');
    }
    resolveMelee() {
      const swing = this.activeSwing(this.dogs[0]);
      if (!swing || swing.attack.grabAttempt || swing.attack.commandGrab) return;
      const {x,y,rx,ry} = swing.area;
      for (const bell of this.bells)
        if (bell.brokenAt === null && Math.abs(x-bell.x)<=rx+radius && Math.abs(y-bell.y)<=ry+radius) this.ring(bell);
    }
    discContacts(d,oldX,oldY) {
      const reach = radius + (d.type==='return' ? 16 : d.type==='drive' ? 15 : 13);
      let nearest, first = Infinity;
      for (const bell of this.bells) {
        if (bell.brokenAt !== null) continue;
        const t = segmentEntry(oldX,oldY,d.x-oldX,d.y-oldY,{x:bell.x,y:bell.y,rx:reach,ry:reach});
        if (!Number.isFinite(t)) continue;
        if (d.type === 'return') this.ring(bell);
        else if (t < first) { nearest=bell; first=t; }
      }
      if (nearest) this.ring(nearest);
      return !!nearest;
    }
    updateDiscs(dt,damage) {
      super.updateDiscs(dt,damage);
      for (const d of this.projectiles) {
        if (d.type !== 'snare' || d.platform < 0 || d.armedIn > 0) continue;
        const bell = this.bells.find(b=>b.brokenAt===null && Math.abs(b.x-d.x)<=22+radius && Math.abs(b.y-d.y+3)<=6+radius);
        if (bell) { this.ring(bell); d.caught=true; }
      }
    }
    knockouts(out) {
      if (this.end === null && out.includes(this.dogs[0])) {
        this.end = 1;
        this.endReason = 'fall';
        const f = this.dogs[0];
        this.emit('ko',{f,x:f.x,y:f.y});
      }
    }
  }
  function draw(ctx,run) {
    for (const bell of run.bells) {
      if (bell.brokenAt !== null) continue;
      const x=Math.round(bell.x/2)*2, y=bell.y;
      const box=(dx,dy,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x+dx,y+dy,w,h);};
      box(-6,-24,12,6,'#251d2a'); box(-9,-19,18,7,'#251d2a');
      box(-14,-14,28,20,'#251d2a'); box(-19,4,38,12,'#251d2a'); box(-6,16,12,5,'#251d2a');
      box(-3,-21,6,5,'#f5dfab'); box(-7,-15,14,5,'#fff2b9');
      box(-11,-10,22,17,'#f7b344'); box(6,-9,5,15,'#cd742c');
      box(-8,-8,4,10,'#fff2b9'); box(-15,7,30,5,'#ffe093'); box(-3,14,6,4,'#ed6544');
      box(-3,-5,7,7,'#873e30'); box(-1,-3,3,3,'#fff0bf');
    }
  }
  function preview(canvas,kind,coat) {
    const course=courses[kind], ctx=canvas.getContext('2d');
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    ctx.scale(.5,.5);
    ctx.translate(-60,-145);
    window.ArenaArt.draw(ctx,course.stage,0,{left:60,top:145,right:1140,bottom:499});
    draw(ctx,{bells:course.marks.map(([x,y])=>({x,y,brokenAt:null}))});
    const floor=window.DogFight.platforms(course.stage,0)[0];
    window.DogArt.draw(ctx,kind,course.start,floor.y,{coat,face:1,scale:1,pose:'idle',time:0});
    ctx.restore();
  }
  const sessionBests=new Map();
  const bellKey=kind=>'dog-fight-3.bells.1.'+kind;
  function bellBest(kind) {
    const tab=sessionBests.get(kind) || Infinity;
    let disk;
    try { disk=readBest(localStorage.getItem(bellKey(kind))); } catch {}
    const best=Math.min(tab,disk || Infinity);
    return Number.isFinite(best) ? best : null;
  }
  function saveBellTime(run) {
    const kind=run.dogs[0].kind, key=bellKey(kind);
    const commit=()=>{
      const previous=bellBest(kind);
      run.record=!previous || run.matchFrames<previous;
      if (!run.record) return;
      sessionBests.set(kind,run.matchFrames);
      try { localStorage.setItem(key,String(run.matchFrames)); }
      catch { run.tabOnly=true; }
    };
    return navigator.locks ? navigator.locks.request(key,commit).catch(commit) : Promise.resolve(commit());
  }
  function courseSheet(kind,portraitFor) {
    const {fighters,arenas}=window.DogFight, course=courses[kind], best=bellBest(kind);
    const rows=Object.keys(courses).map(id=>'<button class="cup-dog" data-bell-dog="'+id+'" aria-pressed="'+(id===kind)+
      '"><img alt="" src="'+portraitFor(id)+'"><strong>'+fighters[id].name+'</strong></button>').join('');
    return '<div class="cup-dogs" role="group" aria-label="Choose a dog and course">'+rows+
      '</div><h3 class="card-stage">'+course.name+'</h3><canvas id="bell-map" width="540" height="177" role="img" aria-label="'+
      course.name+' starting layout on '+arenas[course.stage].name+'"></canvas>'+
      '<p>Strike all six bells in any order. Falling out ends the run. '+course.tip+'</p>'+
      '<p id="bell-bindings"></p>'+
      '<p>Personal best · <strong>'+(best?formatTime(best):'No clear yet')+'</strong></p>'+
      '<div class="dialog-actions"><button class="primary" data-do="bells-start">Start course</button></div>';
  }
  function courseResult(run) {
    const best=bellBest(run.dogs[0].kind);
    return '<h3 class="card-stage">'+run.course.name+'</h3><p>'+run.cleared+' / '+run.bells.length+' bells · '+formatTime(run.matchFrames)+'</p>'+
      '<p id="bell-record">'+(best?'Personal best · '+formatTime(best):'No clear yet')+'</p>'+
      '<div class="dialog-actions"><button class="primary" data-do="bells-start">Run again</button>'+
      '<button class="utility" data-do="bells-sheet">Choose course</button><button class="utility" data-do="home">Main menu</button></div>';
  }
  window.BellBreak = {Run,courses,formatTime,readBest,draw,preview,bellBest,saveBellTime,courseSheet,courseResult};
})();
