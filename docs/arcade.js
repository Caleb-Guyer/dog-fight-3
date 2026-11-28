(() => {
  'use strict';
  const courses = {
    pip:{name:'Express delivery', bouts:[
      ['noodle','picnic','original'],
      ['clover','canal','original'],
      ['brisket','nightmail','flat'],
    ]},
    brisket:{name:'Heavy freight', bouts:[
      ['pip','nightmail','flat'],
      ['noodle','laundry','original'],
      ['clover','bandstand','trio'],
    ]},
    noodle:{name:'Over the rooftops', bouts:[
      ['brisket','laundry','original'],
      ['clover','nightmail','trio'],
      ['pip','canal','original'],
    ]},
    clover:{name:'Around the horn', bouts:[
      ['pip','canal','original'],
      ['brisket','picnic','trio'],
      ['noodle','laundry','flat'],
    ]},
  };
  const rounds = 4, levels = ['rookie','arcade','rival'];
  const routeMask=run=>(run?.wins[1]?.relayLead?1:0) | (run?.wins[2]?.relayLead?2:0);
  const count = n => Number.isSafeInteger(n) && n >= 0;
  const validLead=(lead,round)=>lead===undefined || ((round===1 || round===2) && typeof lead==='string' && Object.hasOwn(courses,lead));
  function validRun(run, length) {
    return run && typeof run.id === 'string' && run.id.length > 0 && run.id.length <= 80 &&
      count(run.retries) && typeof run.started === 'boolean' && window.DogFight.validCoat(run.coat) && Array.isArray(run.wins) &&
      length(run.wins.length) && validLead(run.relayLead,run.wins.length) && (!run.relayLead || run.started) &&
      run.wins.every((w,i)=>w && count(w.frames) && w.frames > 0 && count(w.stocks) && w.stocks <= 3 && validLead(w.relayLead,i));
  }
  function read(raw) {
    const relayBests={};
    for(const mask of [1,2,3]){
      const run=raw?.relayBests?.[mask];
      if(validRun(run,n=>n===rounds) && routeMask(run)===mask)relayBests[mask]=run;
    }
    let active=validRun(raw?.active,n=>n<rounds) ? raw.active : null;
    if(active?.relayLead){
      // Resume an unfinished team round as a fresh singles round at the same stop.
      const {relayLead,...saved}=active;
      active={...saved,started:false};
    }
    let best=validRun(raw?.best,n=>n===rounds) ? raw.best : null;
    for(const run of Object.values(relayBests))if(better(run,best))best=run;
    return {
      active,
      best,
      last:validRun(raw?.last,n=>n===rounds) ? raw.last : null,
      clears:count(raw?.clears) ? raw.clears : 0,
      ...(Object.keys(relayBests).length?{relayBests}:{}),
      ...(count(raw?.playedAt) ? {playedAt:raw.playedAt} : {}),
    };
  }
  const stocks = run => run.wins.reduce((n,w)=>n+w.stocks,0);
  const frames = run => run.wins.reduce((n,w)=>n+w.frames,0);
  const better = (run,other) => !other || run.retries < other.retries || (run.retries === other.retries &&
    (stocks(run) > stocks(other) || (stocks(run) === stocks(other) && frames(run) < frames(other))));
  function begin(entry, id, coat) {
    const run = entry.active || {id,coat,retries:0,started:false,wins:[]};
    const {saved,...active}=run;
    return {...entry,active:{...active,started:true,retries:run.retries + (run.started ? 1 : 0)}};
  }
  function stockBout(kind,round,coat){
    const bout=courses[kind].bouts[round];
    if(!bout)return null;
    const [p2,stage,form]=bout;
    return {mode:'solo',p1:kind,p2,stage,form,coats:[coat,0],stockCount:3,timeBattle:false,minutes:7,fetch:false,
      cpuLevel:levels[round]};
  }
  function finish(entry, attempt, won, lives, elapsed) {
    const run = entry.active;
    if (!run?.started || run.saved || run.id !== attempt.id || run.retries !== attempt.retries || run.wins.length !== attempt.round || attempt.relayLead!==undefined) return null;
    if (!won) return entry;
    const next = {...run,started:false,wins:[...run.wins,{stocks:lives,frames:Math.max(1,Math.round(elapsed))}]};
    if (next.wins.length < rounds) return {...entry,active:next};
    const cleared={...entry,active:null,last:next,clears:entry.clears+1};
    if(better(next,entry.best))cleared.best=next;
    return cleared;
  }
  window.YardCup = {courses,levels,rounds,read,begin,finish,stocks,frames,stockBout};
})();
