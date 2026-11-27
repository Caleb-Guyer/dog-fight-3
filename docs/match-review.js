(() => {
  'use strict';
  const {Battle,FinishTape,seededRandom,fighters,moves,specials,smashes,pummels,throws}=window.DogFight;
  const replayTime=n=>Math.floor(n/3600)+':'+String(Math.floor(n/60)%60).padStart(2,'0');
  function decidingExchange(card,winner,openingStocks){
    if(!card?.reason || (winner!==0 && winner!==1))return null;
    const {losses,players}=card,other=1-winner;
    const seat='P'+(winner+1);
    const name=card.relayTeams?seat+'’s pack':(players[winner].kind===players[other].kind?seat+' ':'')+fighters[players[winner].kind].name;
    if(card.reason==='sudden'){
      const first=losses.findLastIndex(loss=>loss.suddenRound && loss.slot===other);
      if(first<0)return null;
      const loss=losses[first];
      return {first,text:name+' won round '+loss.suddenRound+' of Sudden Death at '+replayTime(loss.frame)+'.'};
    }
    let score=(card.openingPoints || (card.points?[0,0]:openingStocks)).slice();
    let margin=score[winner]-score[other], deficit=Math.max(0,-margin), first=null;
    for(let i=0;i<losses.length;){
      const start=i,frame=losses[i].frame;
      // The engine records both sides of a double KO before it declares a leader.
      do {
        const loss=losses[i++];
        if(card.points)score=loss.points;
        else score[loss.slot]=loss.remaining;
      }while(i<losses.length && losses[i].frame===frame);
      const next=score[winner]-score[other];
      if(next>0 && margin<=0)first=start;
      deficit=Math.max(deficit,-next);margin=next;
    }
    if(first===null)return {first:null,text:name+' held the opening lead '+(card.reason==='time'?'until time expired.':'through the final knockout.')};
    const unit=card.points?'point':'stock',when=' at '+replayTime(losses[first].frame);
    if(deficit)return {first,text:'Down '+deficit+' '+unit+(deficit===1?'':'s')+', '+name+' took the lead for good'+when+'.'};
    if(card.reason==='ko' && losses[first].frame===losses.at(-1).frame)return {first,text:name+' won the last-stock exchange'+when+'.'};
    return {first,text:name+' took the lead'+when+' and held it for the rest of the match.'};
  }
  function resultHighlight(anchor,battle,open){
    if(!anchor.isConnected)return;
    const {matchCard:card}=battle;
    const opening=battle.dogs.map((dog,i)=>dog.stocks+card.losses.filter(loss=>loss.slot===i).length);
    const moment=decidingExchange(card,battle.end,opening);
    if(!moment)return;
    const line=document.createElement('p'),button=document.createElement('button');
    line.textContent=moment.text;line.id='result-turning-point';
    anchor.after(line);button.type='button';button.className='utility';button.id='result-highlight';
    button.textContent='Replay deciding exchange';button.onclick=open;line.append(' ',button);
  }
  function recordList(records,recordModes,portrait,showDialog,focusId,sample){
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
    const demo=document.createElement('button');demo.type='button';demo.className='utility';
    demo.id='record-example';demo.textContent='Study a sample replay';demo.onclick=sample;
    document.getElementById('dialog-body').append(demo);
    if(focusId==='sample'){demo.focus({preventScroll:true});return;}
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
      (card.points?(card.openingPoints?row('Opening points',(_,i)=>card.openingPoints[i]):'')+row('Regulation points',(_,i)=>card.points[i])+row('Credited KOs',(_,i)=>losses.filter(l=>l.slot!==i && l.credited).length)+
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
      const mark=Object.keys(defenseStats).find(type=>card.players[i][defenseStats[type]]>0);
      if(!tip && !mark)return '';
      return '<div class="record-tip"><strong>'+heading(i)+' · '+name(i)+'</strong>'+(tip?'<p>'+tip.why+'</p>':'')+
        (mark?'<button type="button" hidden class="utility" data-study-slot="'+i+'" data-study-type="'+mark+'">Review '+name(i)+'’s '+defenseNames[mark].toLowerCase()+'</button>':'')+(!tip?'':
        (inRoom?'<small>'+tip.label+' · Available from Fight Records after leaving the room.</small>':
          '<button class="utility" data-record-drill="'+i+'">'+tip.label+'</button>'))+'</div>';
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
      const player={frame:checkpoint*120,length,battle,step(record,first,second){
        if(this.frame>=length)return false;
        const at=this.frame%120,runs=parts[Math.floor(this.frame/120)].runs;
        if(!at)run=0;
        else if(runs[run+1]?.[0]===at)run++;
        const a=first ?? runs[run][1], b=second ?? runs[run][2];
        if(record)record.record(battle,a,b);
        battle.step(1/60,a,b);this.frame++;return true;
      }};
      while(player.frame<stop)player.step();
      battle.emit=emit;return player;
    }
    // Counters in the six-second checkpoints let older recordings locate events
    // without storing a second timeline or scanning quiet stretches of the fight.
    async defenses(card,active=()=>true){
      if(this.defenseMarks)return this.defenseMarks;
      const marks=[],parts=this.data.parts;
      let slice=performance.now();
      for(let start=0;start<this.length;start+=360){
        if(!active())return null;
        const before=parts[start/120].state.matchCard?.players;
        const after=(parts[start/120+3]?.state.matchCard || card)?.players;
        if(before && after && !before.some((p,i)=>Object.values(defenseStats).some(key=>p[key]!==after[i][key])))continue;
        const player=this.playback(start,(type,e)=>{
          if(!Object.hasOwn(defenseStats,type))return;
          marks.push({type,frame:player.frame+1,slot:e.f.index,dog:e.f.stats.name,dir:e.dir || 0,roll:e.type==='techRoll'});
        });
        const stop=Math.min(start+360,this.length);
        while(player.frame<stop){
          player.step();
          if(performance.now()-slice>6){
            await new Promise(resolve=>setTimeout(resolve,0));
            if(!active())return null;
            slice=performance.now();
          }
        }
      }
      return this.defenseMarks=marks;
    }
    exchange(frame,length=240){
      const player=this.playback(frame),tape=new FinishTape();
      for(let i=0;i<length && player.frame<player.length;i++)player.step(tape);
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
  async function readClip(id,entry,span,finish,withReturn=true){
    const tape=await read(id,span),result=tape.playback(tape.length).battle;
    const losses=finish?[]:entry.card.losses.slice(span.first,span.first+span.losses);
    if(result.stage!==entry.stage || result.form!==entry.form ||
      (finish ? result.end!==entry.winner || result.matchCard.frames!==entry.card.frames :
        !losses.length || !losses.every((l,i)=>{
          const actual=result.matchCard.losses[span.first+i];
          return actual?.frame===l.frame && actual.slot===l.slot && actual.zone===l.zone;
        })))throw Error('Replay differs from its scorecard');
    const clip={tape,first:span.first,losses};
    if(withReturn && span.follow && span.follow.from===span.count){
      try{clip.returnTape=await read(id,span.follow);}catch{/* The knockout is still playable. */}
    }
    return {clip,result};
  }
  async function schoolKnockout(id,entry,lesson){
    const i=window.FightSchool.reviewLoss(entry,lesson);
    if(i<0)return null;
    const c=await catalog(id),span=c?.knockouts.find(s=>s.first<=i && i<s.first+s.losses);
    if(!span)return null;
    const {clip,result}=await readClip(id,entry,span,false,false);
    const mark=window.FinishTools.analyze(clip.tape,0).escape;
    return {from:'lesson',slot:0,result,stock:new StockRetry(clip.tape,null,0,mark)};
  }
  const seconds=frames=>(frames/60).toFixed(1)+' s';
  function koList(clips,from,focus,{showDialog,back,label,open,fight}){
    const choices=clips.map(c=>'<div class="dialog-actions"><button type="button" class="utility" data-ko="'+c.first+'">'+label(c)+'</button>'+
      (fight && c.returnTape?.length?'<button type="button" class="utility" data-return-fight="'+c.first+'" aria-label="Fight from the return after '+label(c)+'">Fight from this return</button>':'')+'</div>').join('');
    showDialog('ko-replays','KO replays','<p>Choose a knockout to watch or play it from either side.</p>'+
      '<div class="option-list">'+choices+'</div><div class="dialog-actions"><button class="utility" id="ko-list-back">'+
      (from==='pause'?'Back to pause':'Back to results')+'</button></div>');
    const root=document.getElementById('dialog-body'), cancel=root.querySelector('#ko-list-back');
    for(const b of root.querySelectorAll('[data-ko]'))b.onclick=()=>open(clips.find(c=>c.first===Number(b.dataset.ko)));
    for(const b of root.querySelectorAll('[data-return-fight]'))b.onclick=()=>fight(clips.find(c=>c.first===Number(b.dataset.returnFight)));
    cancel.onclick=back;
    (root.querySelector('[data-ko="'+(focus ?? clips[0]?.first)+'"]') || cancel).focus();
  }
  class StockRetry {
    constructor(film,fall,slot=0,takeover=null){
      this.film=film;this.slot=slot;this.takeover=takeover;
      this.start=takeover?takeover.frame:film.data.falls.findLast(k=>k.at<fall.at && k.slots.includes(slot))?.at || 0;
      this.end=takeover?film.length:fall.at;
      this.original=film.playback(this.end).battle;
      const losses=this.original.matchCard.losses.filter(l=>l.slot===slot);
      this.number=losses.length;this.loss=losses.at(-1);
    }
    attempt(emit){
      const slot=this.slot,clip=!!this.takeover,replay=this.film.playback(this.start,emit,clip?slot:null),battle=replay.battle;
      const damage=battle.matchCard.players[slot].damage,end=this.end;
      let seen=battle.matchCard.losses.length,stable=0;
      return {battle,frame:this.start,length:end+180,outcome:null,openingDamage:damage,
        step(input=window.DogFight.idleInput,partner){
          if(this.outcome)return false;
          const a=slot===0?input:partner, b=slot===1?input:partner;
          // After the recording ends, the absent opponent releases their controls.
          const recorded=clip?replay.step(input):replay.step(null,a,b);
          if(!recorded)battle.step(1/60,a,b);
          this.frame++;
          const dog=battle.dogs[slot];
          const safe=dog.ground>=0 && !dog.stockLift && !dog.respawning && !dog.ledge && !dog.grip &&
            !dog.tumble && !dog.stun && !dog.floorAction && !dog.impactLag;
          stable=safe?stable+1:0;
          const losses=battle.matchCard.losses;
          if(losses.length>seen && losses.slice(seen).some(l=>l.slot===slot))this.outcome='lost';
          else if(battle.suddenDeath || battle.end!==null)this.outcome=battle.end===slot?'won':'ended';
          else if(this.frame>=end && stable>=12)this.outcome='saved';
          else if(this.frame>=this.length)this.outcome='unsettled';
          seen=losses.length;
          return true;
        }};
    }
    sheet({showDialog,back,play,shake,sample}){
      const begin=this.film.playback(this.start).battle,hero=begin.dogs[this.slot],rival=begin.dogs[1-this.slot],loss=this.loss;
      const versus=begin.mode==='local';
      const id=loss.lastHit?.id, move=(moves[id] || throws[id] || smashes[id] || specials[id] || pummels[id])?.label;
      showDialog('finish-stock','Retry '+(versus?'P'+(this.slot+1)+'’s ':'')+'stock '+this.number,
        '<p>'+(loss.kind?window.DogFight.fighters[loss.kind].name:hero.stats.name)+' lost this stock at '+Math.round(loss.damage)+'% through the '+loss.zone+' blast line.'+
        (move?' The last hit was '+move+'.':'')+'</p><p>Start '+(this.takeover?'at the marked moment':hero.stockLift?'on the respawn lift':begin.matchFrames?'from the recorded position':'at GO')+
        ' against '+rival.stats.name+' at '+Math.round(rival.damage)+'%. Keep your stock and regain your footing through '+
        seconds(this.end-this.start)+', or win the match first.</p>'+
        (versus?'<p>Use P1 controls for '+hero.stats.name+' against the recorded inputs. Choose Play together to use both original seats.</p>':'')+
        (sample?'<p>Brisket opens with Bear Hug. Try Shield + Right as play starts to roll past his paws.</p>':'')+
        '<canvas id="clip-arena" width="640" height="360" role="img" aria-label="Opening position for this stock"></canvas>'+
        '<p id="stock-caption" class="clip-caption" role="status">'+(this.takeover?this.takeover.label:'Opening position')+'</p>'+
        '<div class="dialog-actions"><button class="primary" id="stock-try">'+(this.takeover?'Take over as '+hero.stats.name:versus?'Face the recording':'Play this stock')+'</button>'+
        (versus?'<button class="utility" id="stock-together">Play together</button>':'')+
        '<button class="utility" id="stock-watch">Watch the knockout</button><button class="utility" id="stock-back">Back</button></div>');
      const el=id=>document.getElementById(id), canvas=el('clip-arena'),caption=el('stock-caption');
      const view=new window.DogFightView.FightView();view.shakeEnabled=shake;
      view.draw(canvas,begin,0,begin.time);
      let raf=0;
      el('stock-watch').onclick=()=>{
        cancelAnimationFrame(raf);
        const camera=new window.DogFightView.FightView();camera.shakeEnabled=shake;
        const replay=this.film.playback(this.takeover?this.start:Math.max(this.start,this.end-120),(name,e)=>camera.event(name,e));
        canvas.setAttribute('aria-label','Original knockout replay');caption.textContent='Your knockout · half speed';
        let last=null,carry=0;
        const tick=now=>{
          if(!canvas.isConnected || !canvas.closest('dialog')?.open)return;
          if(last!==null && !document.hidden)carry+=Math.min(100,now-last)*.03;
          last=now;let frames=0;
          while(carry>=1 && replay.frame<this.end){replay.step();carry--;frames++;}
          camera.draw(canvas,replay.battle,frames/60,replay.battle.time);
          if(replay.frame<this.end)raf=requestAnimationFrame(tick);
          else caption.textContent='Recorded knockout · '+loss.zone+' blast line';
        };
        raf=requestAnimationFrame(tick);
      };
      el('stock-back').onclick=()=>{cancelAnimationFrame(raf);back();};
      el('stock-try').onclick=()=>{cancelAnimationFrame(raf);play(false);};
      if(versus)el('stock-together').onclick=()=>{cancelAnimationFrame(raf);play(true);};
      el('stock-try').focus({preventScroll:true});
    }
    comparison(player){
      const original=this.original,elapsed=player.frame-this.start;
      const title={lost:'Stock lost',saved:'Stock saved!',won:'Match won!',ended:'Regulation ended',unsettled:'Still fighting for a landing'}[player.outcome];
      const text={lost:'Your dog crossed the blast line.',saved:'You stayed onstage past the original knockout.',
        won:'You won the match on this stock.',ended:'The clock expired during the attempt.',
        unsettled:'You passed the original knockout but were still in danger three seconds later.'}[player.outcome];
      const damage=b=>Math.round((b.matchCard.players[this.slot].damage-player.openingDamage)*10)/10+'%';
      return {title,html:'<p>'+text+'</p><table class="finish-comparison"><thead><tr><th>Stock '+this.number+'</th>'+
        '<th>Original</th><th>This attempt</th></tr></thead><tbody><tr><th>Time played</th><td>'+seconds(this.end-this.start)+
        '</td><td>'+seconds(elapsed)+'</td></tr><tr><th>Damage dealt</th><td>'+damage(original)+'</td><td>'+damage(player.battle)+'</td></tr></tbody></table>'};
    }
    actions(from,sample){
      return '<div class="dialog-actions"><button class="primary" data-do="trial-retry">Retry stock</button>'+
        '<button class="utility" data-do="trial-replay">Review stock</button><button class="utility" data-do="trial-results">'+
        (sample?'Back to full match':from==='lesson'?'Back to lesson':from==='pause'?'Back to fight':from==='archive'?'Back to match stats':'Back to results')+'</button></div>';
    }
  }
  const defenseStats={knockdown:'knockdowns',tech:'techs',break:'shieldBreaks',parry:'parries'};
  const defenseNames={knockdown:'Missed landing',tech:'Landing tech',break:'Shield break',parry:'Parry'};
  async function sampleFight(){
    const config={mode:'local',stage:'nightmail',p1:'pip',p2:'brisket',minutes:0,fetch:false};
    const battle=new Battle(config,undefined,seededRandom(27)),tape=new FinishTape(true);
    const {idleInput}=window.DogFight;
    battle.resetTraining();battle.dogs[0].damage=35;
    for(let frame=1;frame<=1200;frame++){
      if(frame%90===0)await new Promise(resolve=>setTimeout(resolve,0));
      const gap=battle.dogs[0].x-battle.dogs[1].x;
      const pip={...idleInput,shield:frame===611 || frame>=796 && frame<820 || frame>=880};
      const brisket={...idleInput};
      if(frame===1 || frame===516)brisket.grab=true;
      if(battle.grapple?.phase==='hold')brisket.y=-1;
      if((frame>164 && frame<490 || frame>630 && frame<795) && Math.abs(gap)>52)brisket.x=Math.sign(gap)*.5;
      if(frame>=880 && Math.abs(gap)>57)brisket.x=Math.sign(gap)*.5;
      if(frame>=796 && frame<810 || frame>=900 && (frame-900)%100<40){brisket.smash=true;brisket.smashX=Math.sign(gap);}
      tape.record(battle,pip,brisket);battle.step(1/60,pip,brisket);
    }
    tape.captureKnockouts(battle);
    return {film:new MatchFilm(tape.fullMatch()),card:battle.matchCard,sample:true,selection:{sample:true}};
  }
  function openFilm(context,at,{world,tape,stageName,showDialog,shake,records,cardSheet,resultSheet,stockSheet,trial,clip}){
    if(!context){
      const data=tape?.fullMatch();if(!data)return;
      context={film:new MatchFilm(data)};
    }
    const {film,entry,id,sample}=context,origin=film.data.parts[0].state;
    const card=entry?.card || context.card || world.matchCard;
    const from=entry || sample?'archive':'result';
    const selection=context.selection??={};
    const practice=(frame,slot,mark)=>{
      const landing=mark && ['tech','knockdown'].includes(mark.type) && (origin.mode==='local' || slot===0);
      const start=mark?Math.max(0,frame-(landing?84:24)):frame;
      const {tape,result}=film.exchange(start,mark?frame-start+(landing?60:90):240);
      if(!tape.length)return;
      const review={film:context,frame,entry,id,slot,finish:true,result,from,clip:{tape,losses:[]}};
      if(mark){
        review.moment={...mark,title:defenseNames[mark.type],at:frame-start};
        if(landing)return clip(frame-start,review);
        review.baseline=tape.playback(0).battle.matchCard.players.map(p=>({...p}));
      }
      trial(0,slot,review);
    };
    const moment=sample?null:decidingExchange(card,entry?.winner ?? world?.end,origin.dogs.map(d=>d.stocks));
    const fall=moment && film.data.falls.find(f=>f.first===moment.first);
    const leadIn=moment && (moment.first===null || fall)?Math.max(0,(fall?.at ?? film.length)-180):null;
    if(at==='highlight' || (at===null && selection.highlight)){
      context.highlightOrigin=true;at=leadIn ?? 0;
    }
    watchFilm(film,{stageName,showDialog,shake,card,selection,practice,moment,leadIn,study:m=>practice(m.frame,m.slot,m),
      retryStock:!origin.matchCard.points?(fall,frame,slot)=>stockSheet({film:context,fall,frame,slot,entry,id,
        from,result:from==='archive'?film.playback(film.length).battle:world}):null,
      back:()=>{
        if(sample){records('sample');return;}
        if(entry){cardSheet(0,entry,id,{first:context.highlightOrigin?'highlight':'full'});return;}
        resultSheet();document.querySelector(context.highlightOrigin?'#result-highlight':'[data-do=watch-match]')?.focus();
      }},at);
  }
  function defenseReport(review,attempt){
    const {slot,baseline,moment}=review,other=1-slot;
    const diff=(card,seat,key)=>Math.round((card.players[seat][key]-baseline[seat][key])*10)/10;
    const before=review.result.matchCard,after=attempt.matchCard;
    const row=(label,seat,key,unit='')=>'<tr><th scope="row">'+label+'</th><td>'+diff(before,seat,key)+unit+'</td><td>'+diff(after,seat,key)+unit+'</td></tr>';
    const key=defenseStats[moment.type],count=diff(after,slot,key);
    const title=moment.type==='break'?(count?'Shield broke again':'Shield break avoided'):
      moment.type==='parry'?(count?'Parry landed':'Parry attempt'):moment.title+' practice';
    return {title,html:'<p>P'+(slot+1)+' '+moment.dog+' · '+moment.title+' on match frame '+moment.frame+'</p>'+
      '<table class="finish-comparison"><thead><tr><th>Exchange</th><th>Original</th><th>This attempt</th></tr></thead><tbody>'+
      row('Parries',slot,'parries')+row('Shield breaks suffered',slot,'shieldBreaks')+row('Knockdowns',slot,'knockdowns')+
      row('Damage taken',other,'damage','%')+row('Damage dealt',slot,'damage','%')+'</tbody></table>'};
  }
  function defenseCue(type){
    if(type==='break')return 'Try releasing Shield to parry the incoming hit, or use a roll to escape.';
    if(type==='parry')return 'Hold Shield through the windup, then release it just before contact.';
    return 'Tap Shield just before touching down. Hold sideways with the tap to roll.';
  }
  function defenseActions(){
    return '<div class="dialog-actions"><button class="primary" data-do="trial-retry">Retry exchange</button>'+
      '<button class="utility" data-do="trial-results">Back to full match</button></div>';
  }
  function enableStudy(open){
    for(const b of document.querySelectorAll('[data-study-slot]')){
      b.hidden=false;b.onclick=()=>open({slot:Number(b.dataset.studySlot),type:b.dataset.studyType});
    }
  }
  function defensePanel(root,film,card,selected,watch,practice,stop,at){
    if(!card.players.some(p=>Object.values(defenseStats).some(key=>p[key]>0)))return;
    const panel=document.createElement('details');panel.id='film-defense';
    panel.innerHTML='<summary>Defensive moments</summary><p role="status"></p><div hidden>'+
      '<label>Exchange <select></select></label><div class="dialog-actions">'+
      '<button type="button" class="utility" data-prev>Previous moment</button><button type="button" class="utility" data-next>Next moment</button>'+
      '<button type="button" class="utility" data-lead>Watch lead-in</button>'+
      '<button type="button" class="primary" data-study></button></div></div>';
    root.append(panel);
    const select=panel.querySelector('select'),note=panel.querySelector('p'),controls=panel.querySelector('div');
    const study=panel.querySelector('[data-study]');let marks,revision=0;
    function choose(seek=true){
      const mark=marks[select.selectedIndex];selected.frame=mark.frame;selected.slot=mark.slot;selected.type=mark.type;
      const landing=['knockdown','tech'].includes(mark.type);
      panel.querySelector('[data-prev]').disabled=select.selectedIndex===0;
      panel.querySelector('[data-next]').disabled=select.selectedIndex===marks.length-1;
      note.textContent=landing?'Compare Shield timing on this landing, then try it yourself.':
        mark.type==='break'?'Take over before the shield breaks. Try releasing Shield to parry, or use a roll to escape.':
        'Take over before contact. Release Shield just before the hit to repeat the parry.';
      study.textContent=landing?'Review this landing':mark.type==='break'?'Prevent this break':'Repeat this parry';
      if(seek)watch(mark.frame,false);
    }
    select.onchange=choose;
    panel.querySelector('[data-prev]').onclick=()=>{select.selectedIndex--;choose();};
    panel.querySelector('[data-next]').onclick=()=>{select.selectedIndex++;choose();};
    study.onclick=()=>practice(marks[select.selectedIndex]);
    panel.querySelector('[data-lead]').onclick=()=>watch(Math.max(0,marks[select.selectedIndex].frame-60),true);
    panel.ontoggle=async()=>{
      const mine=++revision;selected.open=panel.open;if(!panel.open)return;
      stop();
      if(marks){choose();return;}
      note.textContent='Finding defensive moments…';
      const current=()=>panel.isConnected && panel.open && revision===mine;
      let found;
      try{found=await film.defenses(card,current);}
      catch{if(current())note.textContent='These moments could not be read. Close and reopen to retry.';return;}
      if(!found || !current())return;
      if(!found.length){note.textContent='The recording contains no defensive moments.';return;}
      marks=found;
      for(const [i,m] of marks.entries())select.add(new Option('P'+(m.slot+1)+' '+m.dog+' · '+defenseNames[m.type]+
        (m.roll?(m.dir<0?' left':' right'):'')+' · frame '+m.frame,String(i)));
      const initial=marks.findLastIndex(m=>(!selected.frame || m.frame===selected.frame) && m.slot===selected.slot && m.type===selected.type);
      select.selectedIndex=initial>=0?initial:0;controls.hidden=false;
      choose(at===selected.frame || (!selected.frame && (!selected.sample || !at)));
    };
    panel.open=selected.open ?? (!!selected.type || selected.sample===true);
  }
  function watchFilm(film,{showDialog,stageName,back,practice,retryStock,card,study,selection,shake,moment,leadIn},at=null){
    const losses=card.losses;
    const time=replayTime;
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
    // Scrubbing pauses immediately, even if Home lands on the current frame.
    function holdTimeline(){if(playing){stop();paint(0);}}
    seek.onpointerdown=holdTimeline;
    seek.onkeydown=e=>{if(['Home','End','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown'].includes(e.key))holdTimeline();};
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
    if(moment && leadIn!=null){
      const line=document.createElement('p'),button=document.createElement('button');
      line.textContent=moment.text;line.id='film-turning-point';
      button.type='button';button.className='utility';button.textContent='Cue deciding exchange';
      button.onclick=()=>{pauseAt(leadIn);el('film-play').focus();};
      line.append(' ',button);marks.before(line);
    }
    if(film.data.falls.length){
      const details=document.createElement('details'),heading=document.createElement('summary');
      details.id='film-knockouts';
      heading.textContent='Knockout lead-ins';details.append(heading);marks.append(details);
      for(const [i,fall] of film.data.falls.entries()){
        const b=document.createElement('button');b.type='button';b.className='utility';
        b.textContent='KO '+(i+1)+' · '+fall.slots.map(n=>'P'+(n+1)).join(' & ')+' · '+time(fall.at);
        b.onclick=()=>{pauseAt(Math.max(0,fall.at-120));el('film-play').focus();};details.append(b);
        for(const [index,slot] of fall.slots.entries()){
          if(!retryStock || (film.data.parts[0].state.mode==='solo' && slot!==0) || losses?.[fall.first+index]?.suddenRound!==0)continue;
          const retry=document.createElement('button');retry.type='button';retry.className='utility';
          retry.dataset.stockAt=fall.at;retry.dataset.stockSlot=slot;
          retry.textContent='Retry '+(film.data.parts[0].state.mode==='local'?'P'+(slot+1)+'’s ':'')+'stock lost at '+time(fall.at);
          retry.onclick=()=>{stop();retryStock(fall,player.frame,slot);};details.append(retry);
        }
      }
    }
    defensePanel(marks,film,card,selection,(frame,play)=>{pauseAt(frame);if(play)el('film-play').click();},study,holdTimeline,at);
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
            const review=await readClip(id,entry,span,finish);
            if(b.isConnected)open({...review,slot,finish,from:'archive',id,entry});
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
        const load=async(selection)=>{
          if(b.disabled)return;
          b.disabled=true;
          try{
            const db=await database();let data;
            try{data=await request(db.transaction('blocks').objectStore('blocks').get([id,-1]));}finally{db.close();}
            const film=new MatchFilm(data),last=film.playback(film.length).battle;
            if(last.stage!==entry.stage || last.form!==entry.form || last.end!==entry.winner || last.matchCard.frames!==entry.card.frames)
              throw Error('Replay differs from its scorecard');
            if(b.isConnected)openFilm(film,selection);
          }catch{if(b.isConnected){status.hidden=false;status.textContent='The full replay could not be opened.';}}
          finally{b.disabled=false;}
        };
        b.onclick=()=>load();enableStudy(load);
        const highlight=document.createElement('button');highlight.type='button';highlight.className='utility';
        highlight.dataset.savedClip='highlight';highlight.textContent='Replay deciding exchange';
        highlight.onclick=()=>load({highlight:true});actions.append(highlight);
        if(focus?.first==='highlight')highlight.focus({preventScroll:true});
      }
      const rows=root.querySelectorAll('.card-timeline li');
      for(const span of c.knockouts)for(let i=0;i<span.losses;i++){
        const row=rows[span.first+i],loss=entry.card.losses[span.first+i];
        if(row && loss)button(row.lastElementChild,'Replay KO',span,loss.slot,false);
      }
      status.hidden=true;status.textContent='';
    }catch{if(card.isConnected)status.textContent='The replay is unavailable on this device. Your match stats are saved.';}
  }
  window.MatchReview={decidingExchange,resultHighlight,sampleFight,schoolKnockout,openFilm,enableStudy,defenseReport,defenseCue,defenseActions,recordList,cardHTML,save,attach,pack,restore,resumeTape,MatchFilm,watchFilm,StockRetry,koList};
})();
