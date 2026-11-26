(() => {
  'use strict';
  const workerURL=new URL('finish-gif.js?v=finish-gif-1',document.currentScript.src);
  const {moves,specials,throws,smashes,pummels,grabs,idleInput}=window.DogFight;
  function moveName(id,fallback) {
    return (moves[id] || specials[id] || smashes[id] || pummels[id] || throws[id] || grabs[id])?.label ||
      (fallback==='ball'?'Fetch Ball':fallback || 'Hit');
  }
  const exitNames={drop:'Drop',step:'Step off',jump:'Jump',action:'Action exit',auto:'Automatic drop'};
  function returnTrace(){
    return {exits:[null,null],marks:[],firstHit:null,observe(event,e,frame){
      let label;
      if(event==='stockReady')label='Lift ready';
      if(event==='stockLeave'){
        this.exits[e.f.index]={option:e.option,protection:e.frames,frame};
        label=exitNames[e.option];
      }
      if(event==='stockOpen')label='Protection ended';
      if(label)label=e.f.stats.name+' · '+label;
      if(event==='hit' && !this.firstHit && e.owner){
        this.firstHit=e.owner.stats.name+' · '+(e.name || 'Hit');
        label=this.firstHit;
      }
      if(label)this.marks.push({frame,label});
    }};
  }
  function returnComparison(recorded,attempt,losses,names){
    const row=(label,a,b)=>'<tr><th scope="row">'+label+'</th><td>'+a+'</td><td>'+b+'</td></tr>';
    const exit=e=>e?exitNames[e.option]+' on frame '+e.frame:'Still on lift';
    const protection=e=>e?e.protection+' frames':'On lift';
    return losses.map(l=>{
      const a=recorded.exits[l.slot],b=attempt.exits[l.slot];
      const dog='P'+(l.slot+1)+' '+names[l.slot];
      return row(dog+' exit',exit(a),exit(b))+row(dog+' protection',protection(a),protection(b));
    }).join('')+row('First hit',recorded.firstHit || 'No hit',attempt.firstHit || 'No hit');
  }
  function analyze(tape,slot,follow,allMoments=false){
    const list=[];
    const seat=f=>'P'+(f.index+1)+' '+f.stats.name;
    const percent=n=>(Math.round(n*10)/10)+'%';
    let player,escape=null,knockedOut=false,lifeStart=0,launch=null,contact=null,grip=null;
    const markEscape=(frame,label)=>{escape={frame:Math.max(lifeStart,frame-15),label};};
    player=tape.playback(0,(event,e)=>{
      const frame=player.frame+1;
      if(follow){follow.observe(event,e,frame);return;}
      let label,detail,hit;
      if(event==='grabCatch' && e.target.index===slot){
        grip={frame,slot,owner:e.f.index,kind:'grab',move:moveName(e.moveId,'Grab'),from:lifeStart};
        contact=grip;
      }else if(event==='grabEscape' && e.f.index===slot){
        contact=grip=null;
      }else if(event==='hit' || event==='throwRelease'){
        const who=event==='hit'?e.owner:e.f, id=e.moveId;
        const move=moveName(id,e.name);
        label=(who?who.stats.name+' · ':'')+move;
        const target=event==='hit'?e.f:e.target;
        if(event==='hit' && who && target && who.index!==target.index){
          hit={owner:who.index,target:target.index};
          detail=seat(who)+' landed '+move+' for '+percent(e.damage)+'.';
        }
        if(target?.index===slot){
          launch=null;markEscape(frame,'Before '+move);
          if(event==='throwRelease' || e.name==='throw' || pummels[id]){
            contact=grip;
            if(grip)markEscape(grip.frame,'Before '+grip.move);
            if(event==='throwRelease')grip=null;
          }else{
            grip=null;
            contact=who?{frame,slot,owner:who.index,kind:'hit',move,from:lifeStart}:null;
          }
        }
      }else if(event==='launchDI' && e.f.index===slot){
        launch={frame,slot,raw:e.raw};
      }else if(event==='ko'){
        label=e.f.stats.name+' · KO';
        if(e.f.index===slot)knockedOut=true;
      }
      else if(event==='attackClash'){
        label=e.projectile?'Disc clash':'Attack clash';
        if(e.winner!=null){
          const winner=player.battle.dogs[e.winner];
          label=winner.stats.name+' · Breakthrough';
          detail=seat(winner)+' won the clash and the attack carried through.';
        }else detail=e.projectile?'The swing knocked the disc out of play.':'Both attacks recoiled when their hitboxes met.';
      }
      else if(event==='grabClash'){label='Grab clash';detail='Both dogs grabbed on the same frame and pushed apart.';}
      else if(event==='parry')label=e.f.stats.name+' · Parry';
      else if(event==='win' && player.battle.endReason==='time')label='Time expired';
      if(!label)return;
      if(hit){
        const other=list.findLast(m=>m.frame===frame && m.hit?.owner===hit.target && m.hit.target===hit.owner);
        if(other){
          other.label='Traded hits';other.detail+=' '+detail;delete other.hit;return;
        }
      }
      const last=list.at(-1);
      if(last?.frame===frame && last.label===label && (!hit || last.hit?.owner===hit.owner))return;
      list.push({frame,label,...(detail?{detail}:{}),...(hit?{hit}:{})});
    });
    while(player.frame<player.length){
      const dog=player.battle.dogs[slot];
      const planted=dog && (dog.ground>=0 || dog.ledge) && !dog.stun && !dog.tumble && !dog.grip && !dog.stockLift;
      knockedOut=false;
      player.step();
      if(knockedOut){
        if(player.frame<player.length){escape=null;launch=null;contact=grip=null;lifeStart=player.frame;}
      }else if(dog && (dog.ground>=0 || dog.ledge || dog.grip)){
        launch=null;
        if(!dog.grip && !dog.stun && !dog.reaction && !dog.tumble && !dog.impactLag)contact=grip=null;
      }else if(planted && dog.ground<0 && !dog.ledge && !dog.tumble && !dog.stun && !dog.grip && !dog.reaction){
        markEscape(player.frame,'Before leaving the stage');contact=grip=null;
      }
    }
    // A solo CPU has no recorded stick to substitute. Both seats of a two-player tape do.
    return {marks:follow?follow.marks:allMoments?list:list.slice(-4),launch:knockedOut && (slot===0 || player.battle.mode==='local') ? launch : null,
      contact:knockedOut && (slot===0 || player.battle.mode==='local')?contact:null,
      escape:escape || {frame:Math.max(lifeStart,player.length-90),label:'Before the knockout'}};
  }
  const moments=tape=>analyze(tape).marks;
  const buttons={jump:'Jump',shortHop:'Short hop',attack:'Attack',special:'Special',smash:'Smash',shield:'Shield',grab:'Grab',aimStick:'Strike stick'};
  function controlsAt(tape,frame,slot){
    // Frame n shows the result of tick n. A rolling clip can already have held controls at frame zero.
    const tick=tape.count-tape.length+frame-1;
    const block=tape.blocks.findLast(b=>b.start<=tick);
    return block?.inputs[tick-block.start]?.[slot] || window.DogFight.idleInput;
  }
  function stick(x=0,y=0){
    const horizontal=Math.round(x*100),vertical=Math.round(y*100);
    return [horizontal && (horizontal<0?'Left ':'Right ')+Math.abs(horizontal)+'%',
      vertical && (vertical<0?'Up ':'Down ')+Math.abs(vertical)+'%'].filter(Boolean).join(' + ') || 'Center';
  }
  function launchFlight(tape, launch, aim) {
    const {slot,frame} = launch;
    let ko = null;
    const player = tape.playback(frame-1, (event,e) => {
      if (event === 'ko' && e.f.index === slot) {
        ko = {x:e.x,y:e.y,zone:e.zone,bounds:player.battle.blastBounds()};
      }
    }, slot);
    const battle = player.battle, dog = battle.dogs[slot];
    const points = [{x:dog.x,y:dog.y}];
    const terrain = battle.terrain.map(p => ({x1:p.x1,x2:p.x2,y:p.y,thin:p.thin}));
    const width=battle.stageWidth;
    let bounds=battle.blastBounds();
    while (player.frame < player.length && battle.end === null && !ko) {
      const tick = player.frame+1;
      const recorded = controlsAt(tape,tick,slot);
      player.step(tick === frame && aim ? {...recorded,...aim} : recorded);
      bounds=ko?.bounds || battle.blastBounds();
      points.push(ko ? {x:ko.x,y:ko.y} : {x:dog.x,y:dog.y});
    }
    const outcome = ko ? 'KO at the '+ko.zone+' line' : dog.ledge ? 'Holding the ledge' :
      dog.ground >= 0 ? 'Onstage' : 'Still airborne';
    return {points,terrain,width,bounds,inset:bounds.left+window.DogFight.blastSideMargin,outcome,frame:player.frame};
  }
  function drawFlights(canvas, recorded, attempt) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const {topBlastY,bottomBlastY,blastSideMargin} = window.DogFight;
    const scale = Math.min((w-20)/(recorded.width+2*blastSideMargin),(h-16)/(bottomBlastY-topBlastY));
    const x = value => Math.round(w/2+(value-recorded.width/2)*scale);
    const y = value => Math.round(h/2+(value-(bottomBlastY+topBlastY)/2)*scale);
    ctx.fillStyle='#262937';ctx.fillRect(0,0,w,h);
    const bounds=recorded.bounds;
    const left=x(bounds.left),right=x(bounds.right);
    ctx.strokeStyle='#b77973';ctx.lineWidth=1;
    ctx.strokeRect(left+.5,y(bounds.top)+.5,right-left,y(bounds.bottom)-y(bounds.top));
    for(const p of recorded.terrain){
      ctx.fillStyle=p.thin?'#9eaeaa':'#d5c3a0';
      ctx.fillRect(x(p.x1),y(p.y),Math.max(1,x(p.x2)-x(p.x1)),p.thin?2:4);
    }
    function path(points,original) {
      ctx.strokeStyle=ctx.fillStyle=original?'#ffd274':'#8ae5d1';
      ctx.lineWidth=original?4:2;
      ctx.setLineDash(original?[5,4]:[]);
      ctx.beginPath();
      points.forEach((p,i)=>i?ctx.lineTo(x(p.x),y(p.y)):ctx.moveTo(x(p.x),y(p.y)));
      ctx.stroke();ctx.setLineDash([]);
      const end=points.at(-1),ex=x(end.x),ey=y(end.y);
      if(original)ctx.strokeRect(ex-4,ey-4,8,8);
      else {ctx.beginPath();ctx.arc(ex,ey,3,0,2*Math.PI);ctx.fill();}
    }
    path(recorded.points,true);path(attempt.points,false);
  }
  function launchPanel(nav,tape,launch,jump,practice,signal) {
    const choices=[
      ['Up-left','↖',-1,-1],['Up','↑',0,-1],['Up-right','↗',1,-1],
      ['Left','←',-1,0],['Center','•',0,0],['Right','→',1,0],
      ['Down-left','↙',-1,1],['Down','↓',0,1],['Down-right','↘',1,1],
    ];
    const panel=document.createElement('details');
    panel.id='clip-launch';
    panel.innerHTML='<summary>Compare launch steering</summary><p>Change the stick as the hit releases. Later inputs play as recorded.</p>'+
      '<div class="flight-study"><div class="flight-stick" role="group" aria-label="Launch direction">'+
      choices.map(([name,glyph])=>'<button type="button" class="utility" aria-label="'+name+'" title="'+name+'">'+glyph+'</button>').join('')+
      '</div><canvas width="360" height="206" role="img"></canvas></div>'+
      '<p class="flight-key"></p><p class="flight-result" role="status"></p><button type="button" class="utility" data-fly>Play from impact</button>';
    nav.before(panel);
    const pad=[...panel.querySelectorAll('.flight-stick button')],canvas=panel.querySelector('canvas');
    const key=panel.querySelector('.flight-key'),info=panel.querySelector('.flight-result');
    let recorded, selected=Math.abs(launch.raw.y)>Math.abs(launch.raw.x)?3:1;
    const attempts=new Map();
    function compare(index){
      selected=index;
      const [name,,x,y]=choices[index];
      recorded ??= launchFlight(tape,launch);
      if(!attempts.has(index))attempts.set(index,launchFlight(tape,launch,{x,y}));
      const other=attempts.get(index);
      drawFlights(canvas,recorded,other);
      pad.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
      const before='Recorded · '+recorded.outcome+' on frame '+recorded.frame;
      const after=name+' · '+other.outcome+' on frame '+other.frame;
      key.textContent=before;info.textContent=after;
      canvas.setAttribute('aria-label','Dashed recorded path and solid '+name.toLowerCase()+' path. '+before+'. '+after+'.');
    }
    panel.addEventListener('toggle',()=>{if(panel.isConnected && panel.open){jump(launch.frame-1);compare(selected);}}, {signal});
    pad.forEach((b,i)=>b.onclick=()=>compare(i));
    panel.querySelector('[data-fly]').onclick=()=>practice(launch.frame-1,launch.slot);
  }
  function defenseChoices(dog) {
    return dog.ground>=0
      ? [['guard','Hold Shield'],['parry','Tap Shield'],['spot','Spot-dodge'],['jump','Jump'],['attack','Tap Attack']]
      : [['guard','Air dodge'],['jump','Jump'],['attack','Tap Attack']];
  }
  function defenseInput(action,tick) {
    if(action==='guard' || action==='parry' && tick===0)return {...idleInput,shield:true,tapped:tick===0?{shield:true}:undefined};
    if(action==='jump')return {...idleInput,jump:true,tapped:tick===0?{jump:true}:undefined};
    if(tick>0)return idleInput;
    if(action==='spot')return {...idleInput,y:1,shield:true,tapped:{shield:true}};
    return {...idleInput,attack:true,tapped:{attack:true}};
  }
  function defenseReply(tape,contact,lead,action='recorded',emit=()=>{}) {
    const start=Math.max(contact.from,contact.frame-lead),end=Math.min(tape.length,contact.frame+18);
    const slot=contact.slot,events=[];
    let player;
    function observe(name,e){
      emit(name,e);
      const frame=player.frame+1;
      if(name==='grabCatch')events.push({frame,text:e.f.stats.name+' caught '+e.target.stats.name+' with '+moveName(e.moveId,'Grab')});
      if(name==='hit')events.push({frame,text:e.owner.stats.name+' hit '+e.f.stats.name+' with '+moveName(e.moveId,e.name)});
      if(name==='block')events.push({frame,text:e.f.stats.name+' blocked '+moveName(e.moveId,e.attackName)});
      if(name==='parry')events.push({frame,text:e.f.stats.name+' parried'});
      if(name==='attackClash')events.push({frame,text:'The attacks clashed'});
      if(name==='grabClash')events.push({frame,text:'The grabs clashed'});
      if(name==='break')events.push({frame,text:e.f.stats.name+' lost their shield'});
      if(name==='footstool')events.push({frame,text:e.f.stats.name+' jumped off '+e.target.stats.name});
      if(name==='ko')events.push({frame,text:e.f.stats.name+' lost a stock'});
    }
    player=tape.playback(start,observe,action==='recorded'?null:slot);
    return {player,start,end,events,step(){
      if(player.frame>=end || player.battle.end!==null)return false;
      return player.step(action==='recorded'?undefined:defenseInput(action,player.frame-start));
    }};
  }
  function defensePanel(nav,tape,contact,jump,practice,signal) {
    const panel=document.createElement('details');
    panel.id='clip-defense';
    panel.innerHTML='<summary>Defend the '+contact.kind+' · '+contact.move+'</summary>'+
      '<p class="defense-prompt"></p><div class="defense-timing" role="group" aria-label="Start before contact"></div>'+
      '<div class="defense-choices" role="group" aria-label="Defensive reply"></div>'+
      '<canvas width="512" height="288" role="img" aria-label="Preview of the selected reply"></canvas>'+
      '<p class="defense-result" role="status"></p><div class="dialog-actions">'+
      '<button type="button" class="utility" data-watch-reply>Watch at half speed</button>'+
      '<button type="button" class="primary" data-play-defense>Try it myself</button></div>';
    nav.before(panel);
    const timing=panel.querySelector('.defense-timing'),choices=panel.querySelector('.defense-choices');
    const canvas=panel.querySelector('canvas'),info=panel.querySelector('.defense-result');
    const timings=[...new Set([3,8,15].map(n=>Math.min(n,contact.frame-contact.from)))];
    let lead=timings[Math.min(1,timings.length-1)],action='recorded',start=0,animation=0;
    function stop(){cancelAnimationFrame(animation);animation=0;}
    function button(root,text,key,value,select){
      const b=document.createElement('button');b.type='button';b.className='utility';
      b.textContent=text;b.dataset[key]=value;b.onclick=select;root.append(b);
    }
    function preview(animate){
      stop();
      const view=new window.DogFightView.FightView();view.shakeEnabled=false;
      const reply=defenseReply(tape,contact,lead,action,(name,e)=>view.event(name,e));
      const {player}=reply;
      function draw(dt){view.draw(canvas,player.battle,dt,player.battle.time);}
      function report(){
        info.textContent=reply.events.length?reply.events.slice(0,3).map(e=>e.text+' · frame '+e.frame).join('. '):
          'No hit or grab through frame '+player.frame+'.';
      }
      if(!animate){
        let frozen=false;
        while(reply.step()){
          if(!frozen && reply.events.length){draw(0);frozen=true;}
        }
        if(!frozen)draw(0);
        report();return;
      }
      info.textContent='Playing from frame '+reply.start+'.';
      draw(0);let last=null,carry=0;
      function tick(now){
        if(!panel.open || !panel.isConnected || signal.aborted)return;
        if(last!==null)carry+=Math.min(now-last,100)*.03;
        last=now;let steps=0;
        while(carry>=1 && reply.step()){carry--;steps++;}
        if(steps)draw(steps/60);
        if(player.frame>=reply.end || player.battle.end!==null){report();return;}
        animation=requestAnimationFrame(tick);
      }
      animation=requestAnimationFrame(tick);
    }
    function show(){
      start=contact.frame-lead;
      const battle=tape.playback(start).battle,defender=battle.dogs[contact.slot],attacker=battle.dogs[contact.owner];
      panel.querySelector('.defense-prompt').textContent=attacker.stats.name+(contact.kind==='grab'?' caught ':' hit ')+defender.stats.name+
        ' with '+contact.move+' on frame '+contact.frame+'. Try a reply as '+defender.stats.name+'.';
      jump(start);
      for(const b of timing.children)b.setAttribute('aria-pressed',String(Number(b.dataset.lead)===lead));
      const options=[['recorded','Recorded'],...defenseChoices(defender)];
      if(!options.some(([key])=>key===action))action='recorded';
      choices.replaceChildren();
      for(const [key,label] of options){
        button(choices,label,'reply',key,()=>{
          action=key;
          for(const b of choices.children)b.setAttribute('aria-pressed',String(b.dataset.reply===key));
          preview(false);
        });
        choices.lastElementChild.setAttribute('aria-pressed',String(action===key));
      }
      preview(false);
    }
    for(const frames of timings)button(timing,frames+' frames before','lead',String(frames),()=>{lead=frames;show();});
    panel.addEventListener('toggle',()=>panel.open && panel.isConnected?show():stop(),{signal});
    panel.querySelector('[data-play-defense]').onclick=()=>practice(start,contact.slot);
    panel.querySelector('[data-watch-reply]').onclick=()=>preview(true);
    signal.addEventListener('abort',stop,{once:true});
  }
  function inputFrame(tape,frame,slot){
    const input=controlsAt(tape,frame,slot),previous=frame?controlsAt(tape,frame-1,slot):input;
    const movement=stick(input.x,input.y);
    const strike=sample=>sample.aimStick || sample.tapped?.aimStick || sample.smash || sample.tapped?.smash ?
      stick(sample.smashX??sample.x,sample.smashY??sample.y):'';
    const aim=strike(input), actions=[];
    let changed=movement!==stick(previous.x,previous.y) || aim!==strike(previous);
    for(const [key,label] of Object.entries(buttons)){
      const held=!!input[key],was=!!previous[key],tap=!!(frame && input.tapped?.[key]);
      if(held!==was || tap || (!was && previous.tapped?.[key]))changed=true;
      if(key==='jump' && (input.shortHop || (!held && previous.shortHop)))continue;
      if(held)actions.push(label+(tap || !was?' pressed':' held'));
      else if(tap)actions.push(label+' tapped');
      else if(was)actions.push(label+' released');
    }
    return {movement,aim,actions,changed:!!frame && changed};
  }
  function inputPanel(nav,{tape,twoPlayers,initialSeat,frame,jump,signal}){
    const panel=document.createElement('details');
    panel.id='clip-inputs';
    panel.innerHTML='<summary>Recorded inputs</summary><div class="clip-input-seats" role="group" aria-label="Recorded player">'+
      (twoPlayers?'<button type="button" class="utility" data-input-seat="0">P1</button><button type="button" class="utility" data-input-seat="1">P2</button>':'<strong>P1 inputs</strong>')+
      '</div><p class="clip-stick"></p><p class="clip-buttons"></p><div class="dialog-actions">'+
      '<button type="button" class="utility" data-input-prev>Previous change</button><button type="button" class="utility" data-input-next>Next change</button></div>';
    nav.before(panel);
    const seats=[...panel.querySelectorAll('[data-input-seat]')],move=panel.querySelector('.clip-stick'),actions=panel.querySelector('.clip-buttons');
    const prev=panel.querySelector('[data-input-prev]'),next=panel.querySelector('[data-input-next]');
    let slot=twoPlayers?initialSeat:0;
    const history=[];
    function update(opening=false){
      if((!panel.open && !opening) || !panel.isConnected)return;
      if(!history[slot]){
        const rows=Array.from({length:tape.length+1},(_,n)=>inputFrame(tape,n,slot));
        history[slot]={rows,changes:rows.flatMap((r,n)=>r.changed?[n]:[])};
      }
      const {rows,changes}=history[slot],cursor=frame(),row=rows[cursor];
      for(const b of seats)b.setAttribute('aria-pressed',String(Number(b.dataset.inputSeat)===slot));
      const steer='Move · '+row.movement+(row.aim?'   /   Strike aim · '+row.aim:'');
      const keys=row.actions.join(' · ') || 'No buttons';
      if(move.textContent!==steer)move.textContent=steer;
      if(actions.textContent!==keys)actions.textContent=keys;
      prev.disabled=!(changes[0]<cursor);
      next.disabled=!(changes.at(-1)>cursor);
    }
    for(const b of seats)b.onclick=()=>{slot=Number(b.dataset.inputSeat);update();};
    function seekChange(dir){
      const cursor=frame(),changes=history[slot].changes;
      const n=dir<0?changes.findLast(v=>v<cursor):changes.find(v=>v>cursor);
      if(n!==undefined)jump(n);
    }
    prev.onclick=()=>seekChange(-1);next.onclick=()=>seekChange(1);
    panel.querySelector('summary').onclick=()=>{if(!panel.open)update(true);};
    panel.addEventListener('toggle',()=>update(),{signal});
    return update;
  }
  function buildGIF(tape,stage,shake,signal,progress){
    return new Promise((resolve,reject)=>{
      if(signal.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
      const arena=document.createElement('canvas'),out=document.createElement('canvas');
      arena.width=1200;arena.height=675;out.width=480;out.height=300;
      const ctx=out.getContext('2d',{willReadFrequently:true});
      const view=new window.DogFightView.FightView();view.shakeEnabled=shake;
      const player=tape.playback(0,(event,e)=>view.event(event,e));
      const worker=new Worker(workerURL);
      const stop=()=>{worker.terminate();signal.removeEventListener('abort',cancel);};
      const fail=e=>{stop();reject(e);};
      const cancel=()=>fail(new DOMException('Cancelled','AbortError'));
      signal.addEventListener('abort',cancel,{once:true});
      worker.onerror=()=>fail(new Error('GIF worker unavailable'));
      worker.onmessageerror=()=>fail(new Error('GIF data unavailable'));
      let drawn=-1;
      worker.onmessage=({data})=>{
        if(data instanceof Blob){stop();resolve(data);return;}
        try{
          if(drawn===player.length){worker.postMessage({type:'finish'});return;}
          const target=drawn<0?0:Math.min(player.length,drawn+3);
          while(player.frame<target)player.step();
          const w=player.battle;
          view.draw(arena,w,drawn<0?0:(target-drawn)/60,w.time);
          ctx.imageSmoothingEnabled=false;ctx.drawImage(arena,0,0,out.width,270);
          ctx.fillStyle='#252337';ctx.fillRect(0,270,out.width,30);
          ctx.font='12px "Brawl Pixel", monospace';ctx.textBaseline='middle';
          w.dogs.forEach((d,i)=>{
            ctx.fillStyle=i?'#a3d9eb':'#ffbb85';ctx.textAlign=i?'right':'left';
            const score=w.matchCard?.points?w.matchCard.points[i]+' pts':d.stocks+' stock'+(d.stocks===1?'':'s');
            ctx.fillText('P'+(i+1)+' '+d.stats.name+'   '+Math.round(d.damage)+'%   '+score,i?474:6,279,220);
          });
          ctx.fillStyle='#f8ebc9';ctx.textAlign='center';ctx.font='10px "Brawl Pixel", monospace';
          ctx.fillText('Dog Fight 3  ·  '+stage+(w.end===null?'':'  ·  '+w.dogs[w.end].stats.name+' wins'),240,293,468);
          drawn=target;
          const next=Math.min(player.length,target+3);
          const delay=target===player.length?75:Math.max(2,Math.round(next*100/60)-Math.round(target*100/60));
          const pixels=ctx.getImageData(0,0,out.width,out.height).data.buffer;
          worker.postMessage({type:'frame',pixels,delay},[pixels]);
          progress(Math.floor(target/player.length*100));
        }catch(e){fail(e);}
      };
      worker.postMessage({type:'start',width:out.width,height:out.height});
    });
  }
  function install({tape,stage,shake,signal,jump,root,filename,slot,escapeReady,twoPlayers,initialSeat,frame,practiceLaunch,follow,retryMoment}){
    const nav=root.querySelector('#clip-moments'),button=root.querySelector('#clip-export'),status=root.querySelector('#clip-export-status');
    const {marks,escape,launch,contact}=analyze(tape,slot,follow,!!retryMoment);
    escapeReady?.(escape);
    if(contact && practiceLaunch)defensePanel(nav,tape,contact,jump,practiceLaunch,signal);
    if(launch && practiceLaunch)launchPanel(nav,tape,launch,jump,practiceLaunch,signal);
    let selected=null,panel,line,lead;
    if(retryMoment && marks.length){
      panel=document.createElement('section');panel.id='clip-retry';panel.hidden=true;
      panel.innerHTML='<p aria-live="polite"></p><div class="dialog-actions"><button type="button" class="utility">Try as P1</button><button type="button" class="utility">Try as P2</button></div>';
      nav.after(panel);line=panel.querySelector('p');
      panel.querySelectorAll('button').forEach((b,i)=>{b.onclick=()=>retryMoment(lead,i,selected.frame);});
    }
    function select(mark){
      if(!panel)return;
      selected=mark;lead=Math.max(0,mark.frame-30);
      line.textContent=(mark.detail || mark.label+'.')+' Try again from '+(mark.frame-lead)+' frame'+(mark.frame-lead===1?'':'s')+' before contact.';
      panel.hidden=false;
    }
    for(const mark of marks){
      const {frame,label}=mark;
      const b=document.createElement('button');b.type='button';b.className='utility';
      b.textContent=label;b.dataset.clipMoment=frame;b.title='Jump to frame '+frame;
      b.onclick=()=>{jump(frame);select(mark);};nav.append(b);
    }
    if(panel && marks.some(m=>m.frame===frame()))select(marks.find(m=>m.frame===frame()));
    nav.hidden=marks.length===0;
    let url=null,active=null;
    signal.addEventListener('abort',()=>{active?.abort();if(url)URL.revokeObjectURL(url);},{once:true});
    button.onclick=async()=>{
      if(url){
        const link=document.createElement('a');link.download=filename;link.href=url;
        document.body.append(link);link.click();link.remove();return;
      }
      if(active){active.abort();return;}
      active=new AbortController();
      button.textContent='Cancel GIF';status.textContent='Making GIF…';
      try{
        let last=0;
        const blob=await buildGIF(tape,stage,shake,active.signal,p=>{
          const step=Math.min(90,Math.floor(p/10)*10);
          if(step!==last){last=step;status.textContent='Making GIF · '+step+'%';}
        });
        if(signal.aborted)return;
        url=URL.createObjectURL(blob);button.textContent='Download GIF';
        status.textContent='GIF ready · '+Math.ceil(blob.size/1024)+' KB';
      }catch(e){
        if(signal.aborted)return;
        button.textContent='Make GIF';
        status.textContent=e.name==='AbortError'?'GIF cancelled.':'Could not make the GIF. Try again.';
      }finally{active=null;}
    };
    const sync=inputPanel(nav,{tape,twoPlayers,initialSeat,frame,jump,signal});
    return ()=>{sync();if(panel && selected)panel.hidden=frame()!==selected.frame;};
  }
  window.FinishTools={install,moments,analyze,inputFrame,launchFlight,defenseReply,returnTrace,returnComparison};
})();
