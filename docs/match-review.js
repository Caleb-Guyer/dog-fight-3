(() => {
  'use strict';
  const {Battle,FinishTape,seededRandom,fighters,moves,specials,smashes,pummels,throws}=window.DogFight;
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
    return {catalog:{version:1,knockouts,finish:span(tape)},blocks};
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
  const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  async function database() {
    const opening=indexedDB.open('dog-fight-3.replays',1);
    opening.onupgradeneeded=()=>{for(const name of ['games','blocks'])opening.result.createObjectStore(name);};
    const db=await request(opening); db.onversionchange=()=>db.close(); return db;
  }
  async function save(id,tape) {
    const {catalog,blocks}=pack(tape),db=await database();
    try {
      const tx=db.transaction(['games','blocks'],'readwrite'),games=tx.objectStore('games'),data=tx.objectStore('blocks');
      const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error || Error('Save cancelled'));});
      try{
        games.put(catalog,id);
        for(const [n,b] of blocks)data.put(b,[id,n]);
        let keep=window.FightRecords.limit;
        games.openKeyCursor(null,'prev').onsuccess=e=>{
          const c=e.target.result;
          if(!c)return;
          if(keep--<=0){
            games.delete(c.key);
            data.delete(IDBKeyRange.bound([c.key,0],[c.key,Number.MAX_SAFE_INTEGER]));
          }
          c.continue();
        };
      }catch(e){tx.abort();await done.catch(()=>{});throw e;}
      await done;
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
  // Bind only to this render of the card. A slow disk read must never reopen a closed record.
  async function attach(id,entry,pending,open,focus) {
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
      const rows=root.querySelectorAll('.card-timeline li');
      for(const span of c.knockouts)for(let i=0;i<span.losses;i++){
        const row=rows[span.first+i],loss=entry.card.losses[span.first+i];
        if(row && loss)button(row.lastElementChild,'Replay KO',span,loss.slot,false);
      }
      status.hidden=true;status.textContent='';
    }catch{if(card.isConnected)status.textContent='The replay is unavailable on this device. Your match stats are saved.';}
  }
  window.MatchReview={cardHTML,save,attach,pack,restore};
})();
