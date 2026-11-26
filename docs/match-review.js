(() => {
  'use strict';
  const {Battle,FinishTape,seededRandom,fighters,moves,specials,smashes,pummels,throws}=window.DogFight;
  function recordList(records,recordModes,portrait,showDialog,focusId){
    const rows=records.list();
    const buttons=rows.map(({id,entry})=>{
      const dogs=entry.card.players, winner=dogs[entry.winner];
      const date=new Date(entry.time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
      return '<button data-record-id="'+id+'"><img alt="" src="'+portrait(winner.kind,winner.coat)+'"><span><strong>'+
        (entry.card.relayTeams?'Pack Relay':fighters[dogs[0].kind].name+' vs. '+fighters[dogs[1].kind].name)+'</strong><small>'+recordModes[entry.mode]+
        (entry.card.points?' · Time Battle':'')+(entry.round?' · Game '+entry.round:'')+' · '+window.DogFight.arenas[entry.stage].name+' · '+date+'</small></span><b>'+
        (entry.card.relayTeams?(entry.winner===0?'P1':entry.mode==='solo'?'CPU':'P2')+'’s pack':fighters[winner.kind].name)+' wins</b></button>';
    }).join('');
    showDialog('records','Fight Records',rows.length?
      '<p>Last '+window.FightRecords.limit+' completed fights on this device.</p><div class="saved-games">'+buttons+'</div>'+
      (rows.some(r=>records.transient.has(r.id))?'<p>Storage is unavailable. Recent games are kept in this tab.</p>':''):
      '<p>Your next completed fight will appear here with both fighters’ stats and a knockout recap.</p>'+
      '<div class="dialog-actions"><button class="primary" data-do="record-solo">Play a solo fight</button></div>');
    (Array.from(document.querySelectorAll('[data-record-id]')).find(b=>b.dataset.recordId===focusId) ||
      document.querySelector('[data-record-id],[data-do=record-solo]')).focus({preventScroll:true});
  }
  function cardHTML({games,index,mode,side,form,set,archived,clips,inRoom,recordModes,stageName,cardTime,tenth,portrait,stockLabel}) {
    const game=games[index],card=game.card;
    const {players, losses, frames, reason} = card;
    const slot = i => i===1 && ['solo','school','cup'].includes(mode) ? 'CPU' : 'P'+(i+1);
    const heading=i=>slot(i)+(mode==='online' && i===side?' · YOU':'');
    const name = i => card.relayTeams?card.relayTeams[i].map(kind=>fighters[kind].name).join(' / '):fighters[players[i].kind].name;
    const headings = players.map((p,i) => '<th scope="col"><img alt="" src="' + portrait(p.kind,p.coat) +
      '"><small>' + heading(i) + '</small>' + name(i) + '</th>').join('');
    const row = (label, value) => '<tr><th scope="row">' + label + '</th>' +
      players.map((p,i) => '<td>' + value(p,i) + '</td>').join('') + '</tr>';
    const relayRows=card.relayTeams?['Lead','Second','Anchor'].map((label,k)=>row(label+' damage',(p,i)=>
      fighters[card.relayTeams[i][k]].name+' · '+(k>card.relayTeams[i].indexOf(p.kind)?'On bench':tenth(card.relayDamage[i][k])+'%'))).join(''):'';
    const stats = (card.stockCount?row('Starting stocks',()=>card.stockCount):'') + (card.handicap?row('Starting damage',(_,i)=>card.handicap[i]+'%'):'') + row('Damage dealt', p => tenth(p.damage) + '%') + relayRows + row('Hits landed', p => p.hits) +
      row('Hits blocked', p => p.blocks) + row('Parries', p => p.parries) + row('Shield breaks suffered',p=>p.shieldBreaks) +
      row('Landing techs',p=>p.techs) + row('Knockdowns taken',p=>p.knockdowns) +
      (card.points?row('Regulation points',(_,i)=>card.points[i])+row('Credited KOs',(_,i)=>losses.filter(l=>l.slot!==i && l.credited).length)+
        row('Falls',(_,i)=>losses.filter(l=>l.slot===i && !l.suddenRound).length):row('Stocks lost', (_,i) => losses.filter(loss => loss.slot === i).length));
    const timeline = losses.map((loss,n) => {
      const clip=clips.find(c=>n>=c.first && n<c.first+c.losses.length);
      const hit = loss.lastHit, id = hit?.id;
      const move = (moves[id] || specials[id] || smashes[id] || pummels[id] || throws[id])?.label;
      const last = hit ? 'Last hit at ' + cardTime(hit.frame) + ' · ' + (move || (id === 'ball' ? 'Tennis ball' : 'Hit')) :
        (loss.points?'No hits since respawn':'No hits taken this stock');
      return '<li><time>' + cardTime(loss.frame) + '</time><div><strong>' + slot(loss.slot) + ' ' + (card.relayTeams?fighters[loss.kind].name:name(loss.slot)) +
        ' out at ' + tenth(loss.damage) + '%</strong><span>' +
        (loss.suddenRound ? 'Sudden Death ' + loss.suddenRound + ' · ' : '') +
        (loss.zone ? loss.zone + ' blast line · ' : '') + (loss.points?(loss.credited?'KO for '+name(1-loss.slot):'Self-destruct')+
          ' · P1 '+loss.points[0]+' / P2 '+loss.points[1]:stockLabel(loss.remaining)+' left')+'</span><span>' + last + '</span>'+
          (clip?'<button class="utility" data-card-ko="'+clip.first+'" data-ko-slot="'+loss.slot+'" aria-label="Replay P'+(loss.slot+1)+' knockout at '+cardTime(loss.frame)+'">Replay KO</button>':'')+'</div></li>';
    }).join('');
    const tabs = games.length > 1 ? '<nav class="card-games" aria-label="Game stats">' + games.map((g,i) =>
      '<button class="utility" data-card-game="' + i + '" aria-pressed="' + (i === index) + '">Game ' + (i+1) + '</button>'
    ).join('') + '</nav>' : '';
    const tips=(mode==='local'?[0,1]:[side]).map(i=>{
      const tip=window.FightRecords.coaching(game.card,i);
      if(!tip)return '';
      return '<div class="record-tip"><strong>'+heading(i)+' · '+name(i)+'</strong><p>'+tip.why+'</p>'+
        (inRoom?'<small>'+tip.label+' · Available from Fight Records after leaving the room.</small>':
          '<button class="utility" data-record-drill="'+i+'">'+tip.label+'</button>')+'</div>';
    }).join('');
    return tabs + '<h3 class="card-stage">' +
      (set ? 'Game ' + (index+1) + ' · ' : archived ? recordModes[mode]+' · ' : '') + stageName(game.stage,form) + '</h3><p class="card-finish">' +
      slot(game.winner) + (card.relayTeams?'’s pack':' '+name(game.winner)) + ' wins · ' +
      (reason === 'time' ? 'Time expired' : reason === 'sudden' ? 'Sudden Death' : 'Knockout') + ' · ' + cardTime(frames) + '</p>' +
      '<table class="card-stats" aria-label="Fighter stats"><thead><tr><td></td>' + headings +
      '</tr></thead><tbody>' + stats + '</tbody></table>'+
      (tips?'<h3 class="card-timeline-title">Corner practice</h3>'+tips:'')+'<h3 class="card-timeline-title">'+(card.points?'Scoring timeline':'Stock timeline')+'</h3>' +
      (timeline ? '<ol class="card-timeline">' + timeline + '</ol>' : card.points?'<p>No falls during regulation.</p>':'<p>Both fighters kept all their stocks.</p>') +
      '<div class="dialog-actions"><button class="primary" data-do="card-back">'+(archived?'Back to Fight Records':'Back to results')+'</button></div>';
  }
  // Overlapping knockout windows share checkpoints. Store each block once per game.
  function pack(tape) {
    const blocks=new Map();
    function span(t) {
      for(const b of t.blocks) {
        if ((blocks.get(b.start)?.inputs.length ?? -1)>=b.inputs.length) continue;
        const {emit,random,...state}=b.battle;
        blocks.set(b.start,{state,seed:random.state,inputs:b.inputs});
      }
      const result={start:t.blocks[0].start,count:t.count};
      if(t.from!==undefined)result.from=t.from;
      return result;
    }
    const knockouts=tape.knockouts.map(c=>{
      const result={...span(c.tape),first:c.first,losses:c.losses.length};
      if(c.returnTape?.length)result.follow=span(c.returnTape);
      return result;
    });
    const film=tape.fullMatch();
    return {catalog:{version:1,knockouts,finish:span(tape),whole:!!film},blocks,film};
  }
  class MatchFilm {
    constructor(data){
      const {count,parts,falls}=data;
      if(!Number.isSafeInteger(count) || count<=0 || !Array.isArray(parts) || parts.length!==Math.ceil(count/120) ||
        !Array.isArray(falls))throw Error('Incomplete match replay');
      if(falls.some(f=>!Number.isSafeInteger(f?.at) || f.at<1 || f.at>count || !Array.isArray(f.slots) ||
        !f.slots.length || f.slots.some(slot=>slot!==0 && slot!==1)))throw Error('Invalid knockout timeline');
      for(const [i,part] of parts.entries()){
        const limit=Math.min(120,count-i*120);
        if(!part || !Array.isArray(part.runs) || part.runs[0]?.[0]!==0 ||
          (i%3===0 && (!['solo','local'].includes(part.state?.mode) || !Number.isInteger(part.seed))))throw Error('Missing replay checkpoint');
        let last=-1;
        for(const run of part.runs){
          if(!Array.isArray(run) || !Number.isInteger(run[0]) || run[0]<=last || run[0]>=limit || !run[1] || !run[2])
            throw Error('Invalid recorded controls');
          last=run[0];
        }
      }
      this.data=data;this.length=count;
    }
    playback(target=0,emit=()=>{}){
      const stop=Math.max(0,Math.min(this.length,Math.trunc(target)));
      const checkpoint=Math.floor(Math.min(stop,this.length-1)/360)*3;
      const {parts}=this.data,part=parts[checkpoint],length=this.length;
      const battle=Object.assign(Object.create(Battle.prototype),structuredClone(part.state));
      battle.random=seededRandom(0);battle.random.state=part.seed;battle.emit=()=>{};
      let run=0;
      const player={frame:checkpoint*120,length,battle,step(record){
        if(this.frame>=length)return false;
        const at=this.frame%120,runs=parts[Math.floor(this.frame/120)].runs;
        if(!at)run=0;
        else if(runs[run+1]?.[0]===at)run++;
        const [,a,b]=runs[run];
        if(record)record.record(battle,a,b);
        battle.step(1/60,a,b);this.frame++;return true;
      }};
      while(player.frame<stop)player.step();
      battle.emit=emit;return player;
    }
    exchange(frame){
      const player=this.playback(frame),tape=new FinishTape();
      for(let i=0;i<240 && player.frame<player.length;i++)player.step(tape);
      return {tape,result:player.battle};
    }
  }
  function restore(span,blocks) {
    const tape=new FinishTape();
    tape.count=span.count;
    if(span.from!==undefined){
      if(!Number.isSafeInteger(span.from) || span.from<span.start || span.from>=span.start+120 ||
          span.from>=span.count || span.count-span.from>240)throw Error('Invalid stock return');
      tape.from=span.from;
    }
    if(!Number.isSafeInteger(tape.count) || !Number.isSafeInteger(span.start) || span.start<0 || span.start%120 ||
        tape.count<=span.start || tape.count-span.start>360 || blocks.length!==Math.ceil((tape.count-span.start)/120))
      throw Error('Invalid replay window');
    tape.blocks=blocks.map((b,i)=>{
      const start=span.start+120*i, length=Math.min(120,tape.count-start);
      if(!b || !Number.isInteger(b.seed) || !['solo','local'].includes(b.state?.mode) ||
          !Array.isArray(b.inputs) || b.inputs.length<length)throw Error('Incomplete replay');
      const battle=Object.assign(Object.create(Battle.prototype),b.state);
      battle.emit=()=>{}; battle.random=seededRandom(0); battle.random.state=b.seed;
      return {start,battle,inputs:b.inputs.slice(0,length)};
    });
    return tape;
  }
  function resumeTape(packed,losses,returning){
    if(!packed)return new FinishTape(true);
    const {catalog,blocks}=packed;
    const read=span=>{
      const length=Math.ceil((span.count-span.start)/120);
      if(!Number.isInteger(length) || length<1 || length>3)throw Error('Invalid saved replay');
      return restore(span,Array.from({length},(_,i)=>blocks.get(span.start+120*i)));
    };
    const tape=read(catalog.finish);
    if(catalog.whole && packed.film?.count===tape.count){
      try{
        const film=new MatchFilm(packed.film);
        tape.reel=film.data.parts.slice(0,tape.blocks[0].start/120);
        tape.fallFrames=film.data.falls.slice();
      }catch{/* An unavailable film should not cost the player their suspended fight. */}
    }
    tape.observedLosses=losses.length;
    tape.knockouts=catalog.knockouts.map(span=>{
      const clip={first:span.first,losses:losses.slice(span.first,span.first+span.losses),tape:read(span)};
      if(span.follow)clip.returnTape=read(span.follow);
      if(span.first===returning){
        const follow=clip.returnTape || new FinishTape();
        if(!clip.returnTape)follow.from=follow.count=tape.count;
        // The next recorded input extends the live block already in this return.
        follow.blocks=follow.blocks.map(b=>tape.blocks.find(live=>live.start===b.start) || b);
        tape.returning=clip.returnTape=follow;
      }
      return clip;
    });
    return tape;
  }
  const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  async function database() {
    const opening=indexedDB.open('dog-fight-3.replays',1);
    opening.onupgradeneeded=()=>{for(const name of ['games','blocks'])opening.result.createObjectStore(name);};
    const db=await request(opening); db.onversionchange=()=>db.close(); return db;
  }
  async function save(id,tape) {
    const {catalog,blocks,film}=pack(tape),db=await database();
    async function write(whole){
      const tx=db.transaction(['games','blocks'],'readwrite'),games=tx.objectStore('games'),data=tx.objectStore('blocks');
      const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error || Error('Save cancelled'));});
      try{
        games.put({...catalog,whole},id);
        if(whole)data.put(film,[id,-1]);
        for(const [n,b] of blocks)data.put(b,[id,n]);
        let keep=window.FightRecords.limit;
        games.openKeyCursor(null,'prev').onsuccess=e=>{
          const c=e.target.result;
          if(!c)return;
          if(keep--<=0){
            games.delete(c.key);
            data.delete(IDBKeyRange.bound([c.key,-1],[c.key,Number.MAX_SAFE_INTEGER]));
          }
          c.continue();
        };
      }catch(e){tx.abort();await done.catch(()=>{});throw e;}
      await done;
    }
    try{
      try{await write(!!film);}catch(error){if(!film || error.name!=='QuotaExceededError')throw error;await write(false);}
    }finally{db.close();}
  }
  async function catalog(id) {
    const db=await database();
    try{
      const c=await request(db.transaction('games').objectStore('games').get(id));
      return c?.version===1 && c.finish && Array.isArray(c.knockouts)?c:null;
    }finally{db.close();}
  }
  async function read(id,span) {
    const db=await database();
    try{
      const range=IDBKeyRange.bound([id,span.start],[id,span.count-1]);
      const blocks=await request(db.transaction('blocks').objectStore('blocks').getAll(range,4));
      return restore(span,blocks);
    }finally{db.close();}
  }
  function watchFilm(film,{showDialog,stageName,back,practice,shake},at=null){
    const time=n=>Math.floor(n/3600)+':'+String(Math.floor(n/60)%60).padStart(2,'0');
    showDialog('finish-film','Full match replay',
      '<p id="film-stage" class="clip-caption"></p><canvas id="clip-arena" width="640" height="360" role="img" aria-label="Full match replay"></canvas>'+
      '<div class="clip-status"><span id="clip-scores"></span><output id="film-time"></output></div>'+
      '<input id="clip-seek" type="range" min="0" max="'+film.length+'" aria-label="Match timeline">'+
      '<div class="dialog-actions"><button class="primary" id="film-play"></button><button class="utility" id="film-speed">Speed · 1×</button>'+
      '<button class="utility" id="film-rewind">Back 5 seconds</button><button class="utility" id="film-forward">Forward 5 seconds</button>'+
      '<button class="utility" id="film-step">Step 1 frame</button></div>'+
      '<div id="film-marks" class="dialog-actions"></div><div class="dialog-actions"><button class="utility" id="film-p1"></button>'+
      '<button class="utility" id="film-p2"></button><button class="utility" id="film-back">Back</button></div>',false);
    const el=id=>document.getElementById(id),canvas=el('clip-arena'),seek=el('clip-seek');
    let player,view,raf=0,previous=null,carry=0,rate=1;
    let playing=at===null && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    function paint(dt){
      const fight=player.battle,frame=player.frame,end=frame===film.length;
      view.draw(canvas,fight,dt,fight.time);
      const write=(id,s)=>{const node=el(id);if(node.textContent!==s)node.textContent=s;};
      write('film-play',end?'Watch again':playing?'Pause':'Play');
      write('clip-scores',fight.dogs.map((f,i)=>'P'+(i+1)+' '+f.stats.name+' '+Math.round(f.damage)+'% · '+
        (fight.matchCard?.points?fight.matchCard.points[i]+' pts':f.stocks+' stock'+(f.stocks===1?'':'s'))).join(' / '));
      write('film-time',time(frame)+' / '+time(film.length)+' · Frame '+frame);
      seek.value=frame;seek.setAttribute('aria-valuetext',time(frame)+', frame '+frame);
      el('film-step').disabled=end;el('film-rewind').disabled=!frame;
      el('film-forward').disabled=end;
      for(const i of [0,1]){
        const id='film-p'+(i+1);
        write(id,'Practice as P'+(i+1)+' '+fight.dogs[i].stats.name);el(id).disabled=end;
      }
    }
    function jump(frame){
      view=new window.DogFightView.FightView();view.shakeEnabled=shake;
      player=film.playback(frame,(name,e)=>view.event(name,e));carry=0;previous=null;paint(0);
    }
    function tick(now){
      raf=0;if(!canvas.isConnected || !playing)return;
      if(document.hidden)previous=null;
      else{
        if(previous!==null)carry+=Math.min(.1,(now-previous)/1000)*60*rate;
        previous=now;let steps=0;
        while(carry>=1 && player.frame<player.length){player.step();carry--;steps++;}
        if(player.frame===player.length)playing=false;
        if(steps)paint(steps/60);
      }
      if(playing)raf=requestAnimationFrame(tick);
    }
    const stop=()=>{playing=false;cancelAnimationFrame(raf);raf=0;previous=null;carry=0;};
    const pauseAt=frame=>{stop();jump(frame);};
    jump(at??0);
    el('film-stage').textContent=stageName(player.battle.stage,player.battle.form);
    seek.oninput=()=>pauseAt(Number(seek.value));
    el('film-rewind').onclick=()=>pauseAt(Math.max(0,player.frame-300));
    el('film-forward').onclick=()=>pauseAt(Math.min(player.length,player.frame+300));
    el('film-step').onclick=()=>{stop();if(player.step())paint(1/60);};
    el('film-play').onclick=()=>{
      if(playing)stop();
      else{if(player.frame===player.length)jump(0);playing=true;previous=null;raf=requestAnimationFrame(tick);}
      paint(0);
    };
    el('film-speed').onclick=e=>{rate=rate===1?2:rate===2?.5:1;e.currentTarget.textContent='Speed · '+(rate===.5?'½':rate)+'×';};
    const marks=el('film-marks');
    if(film.data.falls.length){
      const details=document.createElement('details'),heading=document.createElement('summary');
      heading.textContent='Knockout lead-ins';details.append(heading);marks.append(details);
      for(const [i,fall] of film.data.falls.entries()){
        const b=document.createElement('button');b.type='button';b.className='utility';
        b.textContent='KO '+(i+1)+' · '+fall.slots.map(n=>'P'+(n+1)).join(' & ')+' · '+time(fall.at);
        b.onclick=()=>{pauseAt(Math.max(0,fall.at-120));el('film-play').focus();};details.append(b);
      }
    }
    for(const i of [0,1])el('film-p'+(i+1)).onclick=()=>{stop();practice(player.frame,i);};
    el('film-back').onclick=()=>{stop();back();};el('film-play').focus({preventScroll:true});
    if(playing)raf=requestAnimationFrame(tick);
  }
  // Bind only to this render of the card. A slow disk read must never reopen a closed record.
  async function attach(id,entry,pending,open,focus,openFilm) {
    const card=document.querySelector('.card-stats'),root=card.parentNode, status=document.createElement('p');
    status.setAttribute('role','status');status.textContent='Loading saved replays…';card.after(status);
    try{
      await pending;
      const c=await catalog(id);
      if(!card.isConnected)return;
      if(!c)throw Error('Missing replay');
      const button=(parent,title,span,slot,finish)=>{
        const b=document.createElement('button');b.type='button';b.className='utility';b.textContent=title;
        b.dataset.savedClip=finish?'finish':String(span.first);if(!finish)b.dataset.koSlot=slot;
        if(!finish)b.setAttribute('aria-label','Replay P'+(slot+1)+' knockout at '+parent.parentNode.querySelector('time').textContent);
        b.onclick=async()=>{
          try{
            const tape=await read(id,span);
            if(!b.isConnected)return;
            const result=tape.playback(tape.length).battle;
            const losses=finish?[]:entry.card.losses.slice(span.first,span.first+span.losses);
            if(result.stage!==entry.stage || result.form!==entry.form ||
               (finish ? result.end!==entry.winner || result.matchCard.frames!==entry.card.frames :
                 !losses.length || !losses.every((l,i)=>{
                   const actual=result.matchCard.losses[span.first+i];
                   return actual?.frame===l.frame && actual.slot===l.slot && actual.zone===l.zone;
                 })))throw Error('Replay differs from its scorecard');
            const clip={tape,first:span.first,losses};
            if(span.follow && span.follow.from===span.count){
              try{clip.returnTape=await read(id,span.follow);}catch{/* Keep the original knockout playable. */}
            }
            if(b.isConnected)open({clip,slot,finish,result,from:'archive',id,entry});
          }catch{if(b.isConnected){status.hidden=false;status.textContent='This replay could not be opened. Your match stats are still available.';}}
        };
        parent.append(b);
        if(focus?.first===b.dataset.savedClip && (finish || focus.slot===slot))b.focus({preventScroll:true});
      };
      const actions=document.createElement('div');actions.className='dialog-actions';status.before(actions);
      button(actions,'Watch saved finish',c.finish,entry.side,true);
      if(c.whole && openFilm){
        const b=document.createElement('button');b.type='button';b.className='utility';b.textContent='Watch full match';
        b.dataset.savedClip='full';actions.append(b);
        if(focus?.first==='full')b.focus({preventScroll:true});
        b.onclick=async()=>{
          b.disabled=true;
          try{
            const db=await database();let data;
            try{data=await request(db.transaction('blocks').objectStore('blocks').get([id,-1]));}finally{db.close();}
            const film=new MatchFilm(data),last=film.playback(film.length).battle;
            if(last.stage!==entry.stage || last.form!==entry.form || last.end!==entry.winner || last.matchCard.frames!==entry.card.frames)
              throw Error('Replay differs from its scorecard');
            if(b.isConnected)openFilm(film);
          }catch{if(b.isConnected){status.hidden=false;status.textContent='The full replay could not be opened.';}}
          finally{b.disabled=false;}
        };
      }
      const rows=root.querySelectorAll('.card-timeline li');
      for(const span of c.knockouts)for(let i=0;i<span.losses;i++){
        const row=rows[span.first+i],loss=entry.card.losses[span.first+i];
        if(row && loss)button(row.lastElementChild,'Replay KO',span,loss.slot,false);
      }
      status.hidden=true;status.textContent='';
    }catch{if(card.isConnected)status.textContent='The replay is unavailable on this device. Your match stats are saved.';}
  }
  window.MatchReview={recordList,cardHTML,save,attach,pack,restore,resumeTape,MatchFilm,watchFilm};
})();
