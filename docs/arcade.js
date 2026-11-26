(() => {
  'use strict';
  const courses = {
    pip:{name:'Express delivery', bouts:[
      ['noodle','picnic','original','Slip inside Noodle’s lead and start a jab string.'],
      ['clover','canal','original','Use the ferry to get above Clover’s returning disc.'],
      ['brisket','nightmail','flat','Bait the heavy swing on the mail-car roof, then dash in.'],
    ]},
    brisket:{name:'Heavy freight', bouts:[
      ['pip','nightmail','flat','Face the center and make Pip come through your shield.'],
      ['noodle','laundry','original','Catch Noodle on a rooftop before he can swing across the gap.'],
      ['clover','bandstand','trio','Meet Clover on her way down with an up smash.'],
    ]},
    noodle:{name:'Over the rooftops', bouts:[
      ['brisket','laundry','original','Fight across the rooftop gap. Save your lead for the return.'],
      ['clover','nightmail','trio','Use the perches to pass above Clover’s disc.'],
      ['pip','canal','original','Hold the lip when Pip chases the ferry.'],
    ]},
    clover:{name:'Around the horn', bouts:[
      ['pip','canal','original','Send a disc along the gate, then cover Pip’s jump.'],
      ['brisket','picnic','trio','Hop between the perches while your disc returns.'],
      ['noodle','laundry','flat','Change the distance between throws to keep Noodle outside his grab.'],
    ]},
  };
  const rounds = 4, levels = ['rookie','arcade','rival'];
  const relayVenues={
    pip:[['bandstand','counterweights'],['laundry','original']],
    brisket:[['nightmail','trio'],['canal','counterweights']],
    noodle:[['picnic','trio'],['laundry','original']],
    clover:[['bandstand','counterweights'],['nightmail','flat']]
  };
  function relay(kind,round,lead=kind){
    if(!Object.hasOwn(courses,kind) || (round!==1 && round!==2))return null;
    const rivals=courses[kind].bouts.map(b=>b[0]), captain=rivals[round];
    const partners=rivals.filter(dog=>dog!==captain), pack=[kind,...partners];
    const first=pack.indexOf(lead);
    if(first<0)return null;
    const [stage,form]=relayVenues[kind][round-1];
    return {stage,form,relayTeams:[[...pack.slice(first),...pack.slice(0,first)],[captain,...partners.reverse()]]};
  }
  const routeMask=run=>(run?.wins[1]?.relayLead?1:0) | (run?.wins[2]?.relayLead?2:0);
  const bestFor=(entry,run)=>routeMask(run)?entry.relayBests?.[routeMask(run)]:entry.best;
  function stamps(entry){
    return Object.values(entry.relayBests || {}).reduce((mask,run)=>mask | routeMask(run),routeMask(entry.active));
  }
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
    return {
      active:validRun(raw?.active,n=>n<rounds) ? raw.active : null,
      best:validRun(raw?.best,n=>n===rounds) ? raw.best : null,
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
  function begin(entry, id, coat, kind, lead) {
    const run = entry.active || {id,coat,retries:0,started:false,wins:[]};
    if(lead && (run.started || !relay(kind,run.wins.length,lead)))return null;
    if(lead)return {...entry,active:{...run,started:true,relayLead:lead}};
    return {...entry,active:{...run,started:true,retries:run.retries + (run.started ? 1 : 0)}};
  }
  function stockBout(kind,round,coat,lead){
    const bout=courses[kind].bouts[round];
    if(!bout)return null;
    const [p2,stage,form]=bout, choice=lead && relay(kind,round,lead);
    return {mode:'solo',p1:kind,p2,stage,form,coats:[coat,0],stockCount:3,timeBattle:false,minutes:7,fetch:false,
      cpuLevel:choice?'rival':levels[round],...(choice?{...choice,p1:choice.relayTeams[0][0],coatBook:[{[kind]:coat},{}]}:{})};
  }
  function finish(entry, attempt, won, lives, elapsed) {
    const run = entry.active;
    if (!run?.started || run.id !== attempt.id || run.retries !== attempt.retries || run.wins.length !== attempt.round || run.relayLead!==attempt.relayLead) return null;
    if (!won) return entry;
    const {relayLead,...prior}=run;
    const next = {...prior,started:false,wins:[...run.wins,{stocks:lives,frames:Math.max(1,Math.round(elapsed)),...(relayLead?{relayLead}:{})}]};
    if (next.wins.length < rounds) return {...entry,active:next};
    const cleared={...entry,active:null,last:next,clears:entry.clears+1};
    if(better(next,bestFor(entry,next))){
      const mask=routeMask(next);
      if(mask)cleared.relayBests={...entry.relayBests,[mask]:next};else cleared.best=next;
    }
    return cleared;
  }
  window.YardCup = {courses,levels,rounds,read,begin,finish,stocks,frames,relay,stockBout,stamps,routeMask,bestFor};
})();
