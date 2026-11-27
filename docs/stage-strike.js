(() => {
  'use strict';
  const {arenas,fighters,stageForms,stageGeometry,platforms}=window.DogFight;
  const stages=Object.keys(arenas);
  const preferences={
    pip:['bandstand','laundry','picnic','canal','nightmail'],
    brisket:['nightmail','picnic','canal','bandstand','laundry'],
    noodle:['laundry','canal','picnic','bandstand','nightmail'],
    clover:['nightmail','canal','bandstand','picnic','laundry']
  };
  class Draft {
    constructor(first,picker=null){
      this.picker=picker;
      this.order=picker===null?[first,1-first,1-first,first]:[1-picker,1-picker,picker];
      this.moves=[];
    }
    get remaining(){return stages.filter(s=>!this.moves.some(m=>m.stage===s && m.action!=='pick'));}
    get turn(){return this.order[this.moves.length] ?? null;}
    get action(){return this.picker!==null && this.moves.length===2?'pick':this.picker===null?'strike':'ban';}
    get winner(){return this.turn!==null?null:this.picker===null?this.remaining[0]:this.moves.at(-1).stage;}
    take(slot,stage){
      if(this.turn===null || slot!==this.turn || !this.remaining.includes(stage))return false;
      this.moves.push({slot,stage,action:this.action});return true;
    }
    cpu(dogs,form,previous){
      if(this.turn!==1)return false;
      const value=stage=>{
        if(form!=='original')return stage===previous?-1:0;
        const rival=preferences[dogs[0]].indexOf(stage),mine=preferences[dogs[1]].indexOf(stage);
        return rival-mine*1.4+(stage===previous?-.6:0);
      };
      const choices=this.remaining.slice().sort((a,b)=>value(b)-value(a));
      return this.take(1,this.action==='pick'?choices[0]:choices.at(-1));
    }
  }
  const verbs={strike:'Strike',ban:'Ban',pick:'Pick'};
  const layouts=new Map();
  function layoutFor(stage,form){
    const geometry=stageGeometry(stage,form);
    if(layouts.has(geometry))return layouts.get(geometry);
    const surfaces=platforms(geometry,0),floors=surfaces.filter(p=>!p.thin);
    const midpoint=p=>(p.x1+p.x2)/2;
    const tracks=surfaces.map(p=>({left:midpoint(p),right:midpoint(p),top:p.y,bottom:p.y}));
    // Ten seconds covers a complete trip on the basket, ferry and lifts.
    for(let tick=1;tick<=200;tick++){
      platforms(geometry,tick/20).forEach((p,i)=>{
        const x=midpoint(p),track=tracks[i];
        track.left=Math.min(track.left,x);track.right=Math.max(track.right,x);
        track.top=Math.min(track.top,p.y);track.bottom=Math.max(track.bottom,p.y);
      });
    }
    const layout={geometry,tracks,solidWidth:Math.max(...floors.map(p=>p.x2-p.x1)),
      gap:floors.length>1,upper:surfaces.length-floors.length,
      moving:tracks.filter(t=>t.right-t.left>1 || t.bottom-t.top>1).length};
    layouts.set(geometry,layout);return layout;
  }
  function compareLayouts(last,next){
    if(last.geometry===next.geometry)return 'Same fighting layout as last game.';
    const change=Math.round((next.solidWidth/last.solidWidth-1)*100);
    const width=change===0?'Same length of uninterrupted floor':
      'Longest uninterrupted floor is '+Math.abs(change)+'% '+(change>0?'longer':'shorter');
    return width+(next.gap?' with a gap between decks.':'.')+' '+next.upper+' upper platform'+(next.upper===1?'':'s')+
      (next.moving?' ('+next.moving+' moving).':'.');
  }
  function lossLine(card,slot){
    const labels={left:'left',right:'right',top:'above',bottom:'below'};
    const counts=new Map();
    for(const loss of card?.losses || []){
      if(loss.slot===slot && !loss.suddenRound && Object.hasOwn(labels,loss.zone))
        counts.set(loss.zone,(counts.get(loss.zone) || 0)+1);
    }
    if(!counts.size)return '';
    return 'P'+(slot+1)+' stock losses · '+Array.from(counts,([zone,n])=>labels[zone]+' ×'+n).join(' · ');
  }
  function drawLayout(canvas,layout,time){
    const ctx=canvas.getContext('2d'),surfaces=platforms(layout.geometry,time);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();ctx.scale(canvas.width/1200,canvas.width/1200);ctx.translate(0,-235);
    ctx.strokeStyle='#d2b080';ctx.lineWidth=6;ctx.setLineDash([10,12]);
    for(const t of layout.tracks){
      if(t.right-t.left<1 && t.bottom-t.top<1)continue;
      ctx.beginPath();ctx.moveTo(t.left,t.top);ctx.lineTo(t.right,t.bottom);ctx.stroke();
    }
    for(const p of surfaces){
      ctx.fillStyle=p.thin?'#8edfc3':'#b6c3ce';
      ctx.fillRect(p.x1,p.y,p.x2-p.x1,p.thin?9:23);
      if(!p.thin){
        ctx.fillStyle='#ffca73';
        for(const x of [p.x1,p.x2-13])ctx.fillRect(x,p.y,13,23);
      }
    }
    ctx.restore();
  }
  function panel(root,{draft,dogs,form,game,solo,seats,keys,pads,drawStageTile,leave,start,sound,previousGame,padNames=(i,p)=>window.FightControls.padLegend(p)}){
    let current=draft.winner || draft.remaining[0],closed=false,cpuAt=null;
    const old=[null,null];let connected=pads,shownLegend;
    const turnLegend=()=>{const n=draft.turn ?? 0;return padNames(n,solo?connected[0]:seats.get(n,connected));};
    const player=i=>solo && i===1?'CPU '+fighters[dogs[i]].name:'P'+(i+1)+' '+fighters[dogs[i]].name;
    root.innerHTML='<h3 id="strike-turn" class="card-stage" aria-live="polite"></h3><p id="strike-rules"></p>'+
      '<div id="strike-stages" role="group" aria-label="Arenas">'+stages.map(s=>'<button class="utility" type="button" data-strike-stage="'+s+
        '"><canvas width="160" height="90" aria-hidden="true"></canvas><strong>'+arenas[s].name+'</strong><small></small></button>').join('')+
      '</div><p id="strike-detail"></p>'+(previousGame?'<section id="strike-compare" aria-label="Counterpick comparison">'+
        '<figure><figcaption>Last game · '+arenas[previousGame.stage].name+'</figcaption><canvas width="240" height="58" aria-hidden="true"></canvas></figure>'+
        '<figure><figcaption id="strike-candidate"></figcaption><canvas width="240" height="58" aria-hidden="true"></canvas></figure>'+
        '<small>Gold ends mark ledges. Dotted lines show platform travel.</small>'+
        '<p id="strike-exits"></p><p id="strike-difference" aria-live="polite"></p></section>':'')+
      '<div class="dialog-actions"><button type="button" class="primary" id="strike-confirm"></button>'+
      '<button type="button" class="utility" id="strike-back">Back</button></div><small id="strike-keys"></small>';
    const el=id=>root.querySelector('#strike-'+id),confirm=el('confirm'),cards=[...el('stages').children];
    const diagrams=[...root.querySelectorAll('#strike-compare canvas')];
    const last=previousGame && layoutFor(previousGame.stage,form);
    const reducedMotion=last && matchMedia('(prefers-reduced-motion: reduce)');
    let candidate,previewTime=0,lastPaint=null;
    if(last){
      const exits=el('exits');
      exits.textContent=lossLine(previousGame.card,draft.picker);exits.hidden=!exits.textContent;
    }
    function paintLayouts(){
      drawLayout(diagrams[0],last,previewTime);drawLayout(diagrams[1],candidate,previewTime);
    }
    el('rules').textContent='Game '+game+' · '+stageForms[form].name+' · '+(draft.picker===null?
      'Strike one, two, then one. Play on the arena left standing.':'The winner bans two arenas. The challenger chooses from the other three.');
    const draw=()=>{
      const {turn,winner}=draft,thinking=solo && turn===1;
      if(winner)current=winner;else if(!draft.remaining.includes(current))current=draft.remaining[0];
      el('turn').textContent=winner?'Game '+game+' · '+arenas[winner].name:player(turn)+' · '+verbs[draft.action]+' an arena';
      for(const b of cards){
        const s=b.dataset.strikeStage,move=draft.moves.find(m=>m.stage===s);
        const out=move && move.action!=='pick';
        b.disabled=!!out || !!winner || thinking;b.dataset.out=String(!!out);
        b.setAttribute('aria-pressed',String(current===s));
        b.querySelector('small').textContent=out?'P'+(move.slot+1)+' · '+(move.action==='ban'?'Banned':'Struck'):
          winner===s?'Fight here':current===s?'Selected':'';
      }
      el('detail').textContent=arenas[current].name+' · '+(stageForms[form].description || arenas[current].description);
      if(last){
        candidate=layoutFor(current,form);
        el('candidate').textContent='Selected · '+arenas[current].name;
        el('difference').textContent=compareLayouts(last,candidate);
        paintLayouts();
      }
      confirm.disabled=thinking;confirm.textContent=winner?'Start game '+game:verbs[draft.action]+' '+arenas[current].name;
      const n=turn ?? 0,map=keys[n],key=window.FightControls.keyName;
      const legend=shownLegend=turnLegend();
      el('keys').textContent=thinking?'':winner?'Press '+legend[9]+' or choose Start game.':
        'P'+(n+1)+' · '+key(map.left)+' / '+key(map.right)+' select · '+key(map.attack)+' confirm · D-pad / '+legend[0]+' on controller';
      confirm.dataset.play=String(!!winner);
      if(!thinking && (!root.contains(document.activeElement) || document.activeElement.disabled))confirm.focus({preventScroll:true});
    };
    function choose(slot,delta){
      if(closed || draft.turn!==slot || solo && slot===1)return;
      const open=draft.remaining;
      current=open[(open.indexOf(current)+delta+open.length)%open.length];sound('menu');draw();
    }
    function commit(slot){
      if(closed || solo && slot===1)return;
      if(draft.winner){closed=true;start(draft.winner);return;}
      if(draft.take(slot,current)){sound('menu');draw();}
    }
    for(const b of cards){
      const s=b.dataset.strikeStage;
      drawStageTile(b.querySelector('canvas'),s,form);
      b.onclick=()=>{current=s;draw();confirm.focus({preventScroll:true});};
    }
    confirm.onclick=()=>commit(draft.turn ?? 0);
    el('back').onclick=()=>{closed=true;leave();};
    function keyboard(e){
      const actions=['left','right','up','down','attack','special'];
      for(const [slot,map] of keys.entries()){
        const key=actions.find(k=>map[k]===e.code);if(!key)continue;
        e.preventDefault();
        if(!e.repeat && (!solo || slot===0)){
          if(key==='special' && (slot===draft.turn || draft.winner || solo))el('back').click();
          else if(key==='attack')commit(slot);
          else if(key!=='special')choose(slot,key==='left' || key==='up'?-1:1);
        }
        return true;
      }
      return false;
    }
    function poll(devices,time){
      if(closed)return;
      if(solo && draft.turn===1){
        cpuAt ??= time+.65;
        if(time>=cpuAt){draft.cpu(dogs,form,previousGame?.stage);cpuAt=null;sound('menu');draw();}
      }else cpuAt=null;
      if(last && (last.moving || candidate.moving) && !reducedMotion.matches &&
        (lastPaint===null || time-lastPaint>=.1)){
        previewTime+=lastPaint===null?0:Math.min(.2,time-lastPaint);
        lastPaint=time;paintLayouts();
      }
      connected=devices;seats.sync(devices);
      if(turnLegend()!==shownLegend)draw();
      const turn=draft.turn,ready=!!draft.winner;
      for(let slot=0;slot<(solo?1:2);slot++){
        const pad=solo?devices[0]:seats.get(slot,devices),last=old[slot];
        if(!pad){old[slot]=null;continue;}
        const pressed=i=>!!pad.buttons[i]?.pressed;
        const axis=(i,dir,bit)=>dir*(pad.axes[i] || 0)>((last?.mask & bit) ? .38 : .65);
        const mask=(pressed(14)||pressed(12)||axis(0,-1,1)||axis(1,-1,1)?1:0) |
          (pressed(15)||pressed(13)||axis(0,1,2)||axis(1,1,2)?2:0) | (pressed(0)?4:0) | (pressed(1)?8:0) | (pressed(9)?16:0);
        old[slot]={index:pad.index,mask};
        if(last?.index!==pad.index || !ready && turn!==slot)continue;
        const fresh=mask & ~last.mask;
        if(fresh&8){el('back').click();return;}
        if(fresh&1)choose(slot,-1);else if(fresh&2)choose(slot,1);
        if(fresh&4 || ready && fresh&16)commit(slot);
        if(closed)return;
      }
    }
    draw();poll(pads,performance.now()/1000);
    return {keyboard,poll,bindings(next){keys=next;}};
  }
  function history(games){
    const past={strike:'struck',ban:'banned',pick:'picked'};
    const rows=games.map((game,i)=>{
      const turns=(game.strikes || []).map(move=>'P'+(move.slot+1)+' '+past[move.action]+' '+arenas[move.stage].name);
      return '<p><strong>Game '+(i+1)+' · '+arenas[game.stage].name+'</strong><br>'+turns.join(' · ')+'</p>';
    });
    return '<details id="strike-history"><summary>Stage picks and bans</summary>'+rows.join('')+'</details>';
  }
  const routes={
    picnic:[[1,.5,'Near basket'],[2,.5,'Far basket'],[0,.9,'Table end']],
    laundry:[[2,.5,'Moving basket'],[3,.5,'Upper clothesline'],[1,.8,'Far rooftop']],
    bandstand:[[1,.5,'Left wing'],[3,.5,'Top perch'],[2,.5,'Right wing']],
    canal:[[1,.5,'Cable ferry'],[0,.85,'Gate deck'],[0,1,'Gate ledge']],
    nightmail:[[0,.48,'Center line'],[0,1,'Right ledge'],[0,.82,'Back on deck']],
    counterweights:[[1,.5,'Left lift'],[2,.5,'Right lift'],[0,.86,'Main deck']]
  };
  const routeKey=(card,slot)=>'dog-fight-3.stage-run.1.'+[card.stage,card.stageForm,slot?card.p2:card.p1].join('.');
  const times=new Map(),clock=n=>(n/60).toFixed(2)+' s';
  function storedSplits(store,key){
    let saved;
    try{saved=JSON.parse(store.getItem(key));}catch{}
    if(Array.isArray(saved) && saved.length===3 && saved.every((n,i)=>Number.isSafeInteger(n) && n>(saved[i-1]||0)))return saved;
  }
  function bestSplits(store,key){
    const local=times.get(key),saved=storedSplits(store,key);
    return local && (!saved || local[2]<saved[2])?local:saved;
  }
  function flag(ctx,x,y,n,active){
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    ctx.fillStyle='#211d30';ctx.fillRect(-4,-55,6,55);ctx.fillRect(-3,-54,34,29);
    ctx.fillStyle=active?'#ffcb67':'#c5d0cb';ctx.fillRect(-1,-51,29,23);
    ctx.fillStyle='#282337';ctx.font='bold 19px monospace';ctx.fillText(String(n),8,-33);
    if(active){ctx.fillStyle='#ffcb67';ctx.fillRect(-12,-3,24,3);}
    ctx.restore();
  }
  const markX=(p,fraction)=>p.x1+(p.x2-p.x1)*fraction;
  class StageRun extends window.DogFight.Battle {
    constructor(config,emit,random){
      super(config,emit,random);
      const {card,slot,best}=config.stageRun;
      this.route={card,slot,best,marks:routes[this.geometryStage],splits:[],started:false};
      this.eventId='stage-run';this.event={name:'Stage Run'};
      const floor=this.terrain[0];
      Object.assign(this.dogs[0],{ground:0,x:floor.x1+60,y:floor.y,face:1});
      Object.assign(this.dogs[1],{absent:true,stocks:0});
    }
    cpu(){return window.DogFight.idleInput;}
    opponents(){return [];}
    separateGroundedFighters(){}
    move(f,input,dt){if(!f.absent)super.move(f,input,dt);}
    knockouts(out){if(out.includes(this.dogs[0]))this.finishMatch(1,'fall');}
    step(dt,input=window.DogFight.idleInput){
      const r=this.route;
      if(this.end!==null)return;
      if(!r.started){
        if(!input.x && !input.y && !input.jump && !input.shortHop && !input.special && !input.shield && !input.attack && !input.grab && !input.smash && !Object.values(input.tapped||{}).some(Boolean))return;
        r.started=true;
      }
      super.step(dt,input);
      if(this.end!==null)return;
      const f=this.dogs[0],[index,fraction]=r.marks[r.splits.length],floor=this.terrain[index];
      const reached=fraction===1?f.ledge?.index===index && !f.ledge.left:
        f.ground===index && Math.abs(f.x-markX(floor,fraction))<=30;
      if(reached){
        r.splits.push(Math.round(this.matchFrames));
        this.emit('routeFlag',{f,count:r.splits.length});
        if(r.splits.length===r.marks.length)this.finishMatch(0,'route');
      }
    }
    drawCourse(ctx){
      const r=this.route;
      r.marks.forEach(([index,fraction],i)=>{
        if(i<r.splits.length)return;
        const floor=this.terrain[index];
        flag(ctx,markX(floor,fraction),floor.y,i+1,i===r.splits.length);
      });
    }
    hud(badge){
      const r=this.route,n=r.splits.length,clockEl=document.getElementById('match-clock');
      const mark=r.marks[n],text=mark?(n+1)+'/3 · '+mark[2]:'3/3 · Finished';
      if(badge.textContent!==text){badge.textContent=text;badge.removeAttribute('aria-label');}
      if(badge.hidden)badge.hidden=false;
      if(clockEl.hidden)clockEl.hidden=false;
      const time=clock(this.matchFrames);if(clockEl.textContent!==time)clockEl.textContent=time;
    }
    save(store){
      if(this.end!==0 || this.saved)return;
      this.saved=true;
      const r=this.route,key=routeKey(r.card,r.slot),prior=bestSplits(store,key);
      if(prior && prior[2]<=r.splits[2])return;
      const splits=r.splits.slice();
      times.set(key,splits);
      const write=()=>{
        const old=storedSplits(store,key);
        if(old && old[2]<=splits[2])return;
        try{store.setItem(key,JSON.stringify(splits));}catch{}
      };
      if(globalThis.navigator?.locks)navigator.locks.request(key,write).catch(write);
      else write();
    }
  }
  function routeSheet(card,slot,ui){
    const {root,showDialog,store,start,play,back}=ui;
    const geometry=stageGeometry(card.stage,card.stageForm),marks=routes[geometry],best=bestSplits(store,routeKey(card,slot));
    const options=(values,chosen)=>Object.entries(values).map(([k,v])=>'<option value="'+k+'"'+(k===chosen?' selected':'')+'>'+v.name+'</option>').join('');
    showDialog('stage-routes','Stage Run','<div class="route-picks"><label>Arena <select id="route-arena">'+options(arenas,card.stage)+'</select></label>'+
      '<label>Form <select id="route-form">'+options(stageForms,card.stageForm)+'</select></label></div>'+
      '<canvas id="route-map" width="600" height="160" role="img"></canvas>'+
      '<div class="dialog-actions">'+[card.p1,card.p2].map((kind,i)=>{
        const finish=bestSplits(store,routeKey(card,i));
        return '<button class="utility" data-runner="'+i+'" aria-pressed="'+(slot===i)+'">'+(i===0?'P1':card.mode==='solo'?'CPU':'P2')+' · '+fighters[kind].name+
          (finish?' · '+clock(finish[2]):'')+'</button>';
      }).join('')+'</div>'+
      '<p>Use P1 controls. Land at the numbered flags in order. For a ledge flag, catch the lip. The clock starts on your first input.</p>'+
      '<p id="route-legend"></p><div class="dialog-actions"><button class="primary" id="route-start">Run this stage</button>'+
      '<button class="utility" id="route-play">'+(card.bestOfThree?'Start set here':'Start fight here')+'</button><button class="utility" id="route-back">Arena picker</button></div>');
    const el=id=>root.querySelector('#route-'+id),canvas=el('map');
    const names=marks.map((m,i)=>(i+1)+'. '+m[2]).join(' · ');
    canvas.setAttribute('aria-label',arenas[card.stage].name+' · '+names);
    el('legend').textContent=names+(best?' · Best '+clock(best[2]):'');
    const layout=layoutFor(card.stage,card.stageForm),ctx=canvas.getContext('2d');
    drawLayout(canvas,layout,0);ctx.save();ctx.scale(.5,.5);ctx.translate(0,-235);
    const floors=platforms(geometry,0);
    marks.forEach(([i,fraction],n)=>flag(ctx,markX(floors[i],fraction),floors[i].y,n+1,n===0));ctx.restore();
    function change(next,who,focus){routeSheet(next,who,ui);root.querySelector(focus).focus({preventScroll:true});}
    el('arena').onchange=e=>change({...card,stage:e.target.value},slot,'#route-arena');
    el('form').onchange=e=>change({...card,stageForm:e.target.value},slot,'#route-form');
    for(const b of root.querySelectorAll('[data-runner]'))b.onclick=()=>change(card,Number(b.dataset.runner),'[data-runner="'+b.dataset.runner+'"]');
    el('start').onclick=()=>start(card,slot,best);el('play').onclick=()=>play(card);el('back').onclick=()=>back(card);el('start').focus({preventScroll:true});
  }
  function routePanel(w,paused,{showDialog,root,store,start,board,play}){
    const r=w.route;
    const other=r.slot?r.card.p1:r.card.p2,compare=other!==w.dogs[0].kind && bestSplits(store,routeKey(r.card,1-r.slot));
    const rows=r.marks.map((m,i)=>{
      const t=r.splits[i],prior=r.best?.[i],diff=t && prior?t-prior:null;
      return '<tr><th scope="row">'+m[2]+'</th><td>'+(t?clock(t):'—')+'</td><td>'+(prior?clock(prior):'—')+'</td><td>'+
        (diff===null?'—':diff===0?'Even':clock(Math.abs(diff))+(diff<0?' faster':' slower'))+'</td>'+(compare?'<td>'+clock(compare[i])+'</td>':'')+'</tr>';
    }).join('');
    showDialog(paused?'pause':'event-result',paused?'Stage Run paused':w.end===0?'Route cleared':'Missed the landing',
      '<p>'+arenas[w.stage].name+' · '+stageForms[w.form].name+' · '+w.dogs[0].stats.name+'</p>'+
      '<table class="route-times"><thead><tr><th>Flag</th><th>Run</th><th>Best</th><th>Change</th>'+(compare?'<th>'+fighters[other].name+'</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div class="dialog-actions">'+(paused?'<button class="primary" data-do="resume">Resume</button>':'')+
      '<button id="route-again" class="'+(paused?'utility':'primary')+'">Retry route</button>'+
      (other!==w.dogs[0].kind?'<button class="utility" id="route-swap">Run as '+fighters[other].name+'</button>':'')+'<button class="utility" id="route-fight">'+
      (r.card.bestOfThree?'Start set here':'Start fight here')+'</button><button class="utility" id="event-board">Stage Run setup</button></div>',false);
    root.querySelector('#route-again').onclick=()=>start(r.card,r.slot,bestSplits(store,routeKey(r.card,r.slot)));
    if(root.querySelector('#route-swap'))root.querySelector('#route-swap').onclick=()=>start(r.card,1-r.slot,bestSplits(store,routeKey(r.card,1-r.slot)));
    root.querySelector('#route-fight').onclick=()=>play(r.card);root.querySelector('#event-board').onclick=()=>board(r.card,r.slot);
    root.querySelector('.primary').focus({preventScroll:true});
  }
  window.StageStrike={Draft,panel,history,layoutFor,compareLayouts,lossLine,StageRun,routeSheet,routePanel};
})();
