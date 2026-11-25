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
  const count = n => Number.isSafeInteger(n) && n >= 0;
  function validRun(run, length) {
    return run && typeof run.id === 'string' && run.id.length > 0 && run.id.length <= 80 &&
      count(run.retries) && typeof run.started === 'boolean' && window.DogFight.validCoat(run.coat) && Array.isArray(run.wins) &&
      length(run.wins.length) && run.wins.every(w=>w && count(w.frames) && w.frames > 0 && count(w.stocks) && w.stocks <= 3);
  }
  function read(raw) {
    return {
      active:validRun(raw?.active,n=>n<rounds) ? raw.active : null,
      best:validRun(raw?.best,n=>n===rounds) ? raw.best : null,
      last:validRun(raw?.last,n=>n===rounds) ? raw.last : null,
      clears:count(raw?.clears) ? raw.clears : 0,
      ...(count(raw?.playedAt) ? {playedAt:raw.playedAt} : {}),
    };
  }
  const stocks = run => run.wins.reduce((n,w)=>n+w.stocks,0);
  const frames = run => run.wins.reduce((n,w)=>n+w.frames,0);
  const better = (run,other) => !other || run.retries < other.retries || (run.retries === other.retries &&
    (stocks(run) > stocks(other) || (stocks(run) === stocks(other) && frames(run) < frames(other))));
  function begin(entry, id, coat) {
    const run = entry.active || {id,coat,retries:0,started:false,wins:[]};
    return {...entry,active:{...run,started:true,retries:run.retries + (run.started ? 1 : 0)}};
  }
  function finish(entry, attempt, won, lives, elapsed) {
    const run = entry.active;
    if (!run?.started || run.id !== attempt.id || run.retries !== attempt.retries || run.wins.length !== attempt.round) return null;
    if (!won) return entry;
    const next = {...run,started:false,wins:[...run.wins,{stocks:lives,frames:Math.max(1,Math.round(elapsed))}]};
    if (next.wins.length < rounds) return {...entry,active:next};
    return {active:null,last:next,best:better(next,entry.best) ? next : entry.best,clears:entry.clears+1};
  }
  window.YardCup = {courses,levels,rounds,read,begin,finish,stocks,frames};
})();
