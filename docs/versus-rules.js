(() => {
  'use strict';
  const {versusRules,stockMinutes,validStockCount,validHandicap,stageForms}=window.DogFight;
  const standard=versusRules({fetch:false});
  const presets=[
    {name:'Tournament set',rules:{...standard,bestOfThree:true}},
    {name:'Last dog standing',rules:{...standard,lives:1,minutes:3,stageForm:'flat'}},
    {name:'Fetch frenzy',rules:{...standard,timed:true,minutes:3,fetch:true,stageForm:'trio'}},
    {name:'Give P1 a head start',rules:{...standard,handicap:[0,60]}},
  ];
  const prefix='dog-fight-3.ruleset.1.', temporary=new Map();
  const custom=id=>/^[a-f0-9-]{36}$/.test(id);
  function encode(mode,r){
    const tail=mode!=='online' && validHandicap(r.handicap) && r.handicap.some(Boolean)?'/'+r.handicap.join('-'):'';
    return '#'+mode+'/rules/'+[r.timed?'time':'stock',r.lives,r.minutes,r.bestOfThree?'set':'single',r.stageForm,r.fetch?'on':'off'].join('/')+tail;
  }
  function decode(hash){
    const parts=hash.split('/');
    if(![8,9].includes(parts.length) || !['#solo','#local','#online'].includes(parts[0]) || parts[1]!=='rules')return null;
    const [type,lives,minutes,format,stageForm,items]=parts.slice(2);
    if(!['stock','time'].includes(type) || !/^[1-5]$/.test(lives) || !['0','1','3','7'].includes(minutes) ||
      type==='time' && minutes==='0' || !['single','set'].includes(format) || !Object.hasOwn(stageForms,stageForm) ||
      !['on','off'].includes(items))return null;
    let handicap;
    if(parts.length===9){
      if(parts[0]==='#online' || !/^\d{1,3}-\d{1,3}$/.test(parts[8]))return null;
      handicap=parts[8].split('-').map(Number);
      if(!validHandicap(handicap) || handicap.join('-')!==parts[8])return null;
    }
    return {timed:type==='time',lives:Number(lives),minutes:Number(minutes),bestOfThree:format==='set',stageForm,fetch:items==='on',
      ...(handicap?.some(Boolean)?{handicap}:{})};
  }
  function shelf(storage){
    const cards=new Map();
    try{
      for(let i=0;i<storage.length;i++){
        const key=storage.key(i);
        if(!key?.startsWith(prefix))continue;
        const id=key.slice(prefix.length);
        if(!custom(id))continue;
        let saved;
        try{saved=JSON.parse(storage.getItem(key));}catch{continue;}
        if(typeof saved?.name==='string' && saved.name.trim() && saved.rules && validStockCount(saved.rules.lives))
          cards.set(id,{name:saved.name.slice(0,40),rules:versusRules(saved.rules)});
      }
    }catch{}
    for(const [id,card] of temporary)cards.set(id,card);
    return cards;
  }
  function encodeMatchup(card){
    const rules=encode(card.mode,card).split('/').slice(2);
    return ['#'+card.mode,'matchup',card.p1,card.coats[0],card.p2,card.coats[1],card.stage,card.mode==='local'?'p2':card.cpuLevel,...rules].join('/');
  }
  function decodeMatchup(hash){
    if(typeof hash!=='string')return null;
    const [route,kind,p1,first,p2,second,stage,rival,...tail]=hash.split('/');
    const {fighters,arenas,cpuLevels,coatFor}=window.DogFight;
    if(!['#solo','#local'].includes(route) || kind!=='matchup' || !Object.hasOwn(fighters,p1) || !Object.hasOwn(fighters,p2) ||
      !/^[0-3]$/.test(first) || !/^[0-3]$/.test(second) || !Object.hasOwn(arenas,stage) ||
      !(route==='#local'?rival==='p2':Object.hasOwn(cpuLevels,rival)))return null;
    const rules=decode([route,'rules',...tail].join('/'));
    if(!rules)return null;
    const coats=[Number(first),Number(second)];
    coats[1]=coatFor(1,p1,p2,coats);
    return {mode:route.slice(1),p1,p2,stage,coats,...(route==='#solo'?{cpuLevel:rival}:{}),...rules};
  }
  class OpeningDuel {
    constructor(card,seed){
      this.card=structuredClone(card);
      this.seed=seed;
      this.score=[0,0];
      this.position='center';
      this.point=null;
    }
    place(world){
      const decks=world.terrain.filter(p=>!p.thin);
      const rank=p=>this.position==='center'?p.x2-p.x1:this.position==='left'?-p.x1:p.x2;
      const deck=decks.reduce((a,b)=>rank(a)>=rank(b)?a:b);
      const gap=Math.min(148,deck.x2-deck.x1-64);
      const x=this.position==='left'?deck.x1+32:this.position==='right'?deck.x2-32-gap:(deck.x1+deck.x2-gap)/2;
      world.dogs.forEach((f,i)=>Object.assign(f,{x:x+i*gap,y:deck.y,ground:world.terrain.indexOf(deck),face:i?-1:1}));
      this.point=null;
    }
    opening(world){
      const {players,losses}=world.matchCard;
      const earned=players.map((p,i)=>p.damage>0 || losses.some(l=>l.slot===1-i));
      if(!earned.some(Boolean))return null;
      const winner=earned[0]===earned[1]?null:earned.indexOf(true);
      const point={winner,frame:world.matchFrames};
      if(winner!==null){
        const loss=losses.find(l=>l.slot===1-winner);
        const id=(loss?.lastHit || players[1-winner].lastHit)?.id;
        const {moves,throws,pummels,smashes,specials}=window.DogFight;
        point.move=[moves,throws,pummels,smashes,specials].find(table=>table[id])?.[id].label || world.dogs[winner].lastMove || 'Hit';
        point.damage=Math.round(players[winner].damage*10)/10;
        point.fall=!!loss;
      }
      return point;
    }
    takePoint(world){
      if(this.point || this.score.includes(3))return false;
      this.point=this.opening(world);
      if(!this.point)return false;
      if(this.point.winner!==null)this.score[this.point.winner]++;
      return true;
    }
    get responder(){return this.card.mode==='solo' || this.point.winner===null?0:1-this.point.winner;}
    reply(tape,start,slot,emit){
      const recorded=tape.playback(start,emit,slot),battle=recorded.battle;
      const before={...battle.matchCard.players[slot]};
      const attempt={battle,before,frame:start,length:tape.length+36,step:input=>{
        if(attempt.outcome)return;
        if(attempt.frame<tape.length)recorded.step(input);
        else{
          const idle=window.DogFight.idleInput;
          battle.step(1/60,slot?idle:input,slot?input:idle);
        }
        attempt.frame++;
        const point=this.opening(battle);
        if(point)attempt.outcome=point.winner===null?'Trade':point.winner===slot?'Won the exchange':point.fall?'Lost a stock':'Caught by '+point.move;
        else if(attempt.frame===attempt.length){
          const now=battle.matchCard.players[slot];
          attempt.outcome=now.parries>before.parries?'Parried the opening':now.blocks>before.blocks?'Blocked the opening':'Stayed clear';
        }
      }};
      return attempt;
    }
    reviewPanel(root,tape,slot,watch,practice){
      const f=window.DogFight.fighters[this.card[slot?'p2':'p1']].name;
      root.innerHTML='<p>Watch the last '+(tape.length/60).toFixed(1)+' seconds at half speed. On the retry, use P'+(slot+1)+' controls for '+f+'. '+
        (this.point.fall?'Try spending your jump later or reaching the lip with Up Special.':'Try shielding the swing, stepping out of range, or hitting first.')+'</p>'+
        '<canvas id="clip-arena" width="640" height="360" role="img" aria-label="Replay of the opening point"></canvas>'+
        '<div class="clip-status"><span id="clip-scores"></span><output id="clip-frame"></output></div>'+
        '<input id="clip-seek" type="range" min="0" max="'+tape.length+'" value="0" aria-label="Replay frame">'+
        '<div class="dialog-actions"><button class="primary" id="clip-toggle">Play</button><button class="utility" id="clip-step">Step 1 frame</button>'+
        '<button class="utility" id="duel-impact">'+(this.point.fall?'Go to ring-out':'Go to contact')+'</button><button class="utility" id="duel-answer">Try a response</button>'+
        '<button class="utility" data-do="clip-back">Back to duel</button></div>';
      root.querySelector('#duel-impact').onclick=()=>watch(tape.length);
      root.querySelector('#duel-answer').onclick=practice;
    }
    actions(){
      return '<div class="dialog-actions"><button class="primary" data-do="trial-retry">Try again</button>'+
        '<button class="utility" data-do="trial-replay">Watch point</button><button class="utility" data-do="trial-results">Back to duel</button></div>';
    }
    report(player,slot,showDialog){
      const p=this.point,w=player.battle,names=w.dogs.map((f,i)=>'P'+(i+1)+' '+f.stats.name);
      const original=p.winner===null?'Trade':p.fall?names[1-p.winner]+' fell':names[p.winner]+' landed '+p.move+' for '+p.damage+'%';
      const defense=w.matchCard.players[slot],blocks=defense.blocks-player.before.blocks,parries=defense.parries-player.before.parries;
      const guard=[blocks && blocks+(blocks===1?' block':' blocks'),parries && parries+(parries===1?' parry':' parries')].filter(Boolean).join(' · ');
      showDialog('finish-comparison',player.outcome,'<p>Original point · '+original+'</p><p>This attempt · '+names[slot]+
        ' dealt '+Math.round(w.matchCard.players[slot].damage*10)/10+'% and took '+Math.round(w.matchCard.players[1-slot].damage*10)/10+
        '%.'+(guard?' '+guard+'.':'')+'</p><p>Duel score · '+this.score.join(' – ')+'</p>'+this.actions(),false);
      document.querySelector('[data-do=trial-retry]').focus();
    }
    panel(root,phase,{start,play,back,resume,review}){
      const {fighters}=window.DogFight, card=this.card;
      const names=[card.p1,card.p2].map((kind,i)=>(i===0?'P1':card.mode==='solo'?'CPU':'P2')+' '+fighters[kind].name);
      const p=this.point,done=this.score.includes(3),paused=phase==='pause',playing=phase==='point';
      const report=!playing?'Land the first damaging hit to score. Falling gives your rival the point. A trade on the same frame is a draw. First to three wins.':
        p.winner===null?'Trade on the same frame. Replay the point.':
        names[p.winner]+(done?' wins the duel':' takes the point')+' · '+(p.fall?'Ring-out':p.move+' · '+p.damage+'%');
      const openings=[['center','Center stage'],['left','P1 cornered'],['right',card.mode==='solo'?'CPU cornered':'P2 cornered']];
      const button=(id,label,primary)=>'<button type="button" class="'+(primary?'primary':'utility')+'" id="duel-'+id+'">'+label+'</button>';
      root.innerHTML='<p id="duel-report"></p><strong id="duel-score"></strong>'+
        (!paused && !done?'<h3>Starting position</h3><div class="dialog-actions">'+openings.map(([key,label])=>
          '<button type="button" class="utility" data-opening="'+key+'" aria-pressed="'+(this.position===key)+'">'+label+'</button>').join('')+'</div>':'')+
        '<div class="dialog-actions">'+(paused?button('resume','Resume point',true):'')+
        (!done?button('start',paused?'Restart point':playing?'Next point':'Play first point',!paused):'')+
        (playing?button('watch','Watch point',false)+button('reply','Try a response · '+names[this.responder],false):'')+
        button('fight',card.bestOfThree?'Start full set':'Start full fight',done)+button('back','Matchup card',false)+'</div>';
      const el=id=>root.querySelector('#duel-'+id);
      el('report').textContent=report;
      el('score').textContent=names[0]+'  '+this.score[0]+' – '+this.score[1]+'  '+names[1];
      const choices=root.querySelectorAll('[data-opening]');
      for(const choice of choices)choice.onclick=()=>{
        this.position=choice.dataset.opening;
        for(const other of choices)other.setAttribute('aria-pressed',String(other===choice));
      };
      if(paused)el('resume').onclick=resume;
      if(!done)el('start').onclick=start;
      if(playing){el('watch').onclick=()=>review(false);el('reply').onclick=()=>review(true);}
      el('fight').onclick=play;el('back').onclick=back;
      el(paused?'resume':done?'fight':'start').focus({preventScroll:true});
    }
  }
  function matchupSheet(root,card,{drawPreview,coatNames,stageName,back,play,duel,edit,pinned,pin}){
    const {fighters,cpuLevels}=window.DogFight, hash=encodeMatchup(card);
    const [one,two]=[card.p1,card.p2].map(kind=>fighters[kind].name);
    const format=card.bestOfThree?'Best of three':'Single game', match=card.timed?'Time Battle':card.lives+(card.lives===1?' stock':' stocks');
    const clock=card.minutes?card.minutes+' min':'No clock';
    root.innerHTML='<canvas id="matchup-preview" role="img"></canvas><div class="matchup-fighters"></div>'+
      '<strong id="matchup-stage"></strong><p id="matchup-terms"></p><div class="dialog-actions">'+
      '<button type="button" class="primary" id="matchup-play">'+(card.bestOfThree?'Start set':'Start fight')+'</button>'+
      '<button type="button" class="utility" id="matchup-duel">First-hit duel</button>'+
      '<button type="button" class="utility" id="matchup-pin"></button><button type="button" class="utility" id="matchup-share">Share link</button>'+
      '<button type="button" class="utility" id="matchup-edit">Edit in fighter select</button>'+
      '<button type="button" class="utility" id="matchup-back">Back</button></div>'+
      '<input id="matchup-link" aria-label="Shareable matchup link" hidden readonly><p id="matchup-status" role="status"></p>';
    const el=id=>root.querySelector('#matchup-'+id),status=el('status'),link=el('link');
    root.querySelector('.matchup-fighters').innerHTML=[card.p1,card.p2].map((kind,i)=>'<div><small>'+
      (i===0?'P1':card.mode==='local'?'P2':cpuLevels[card.cpuLevel].name+' CPU')+'</small><strong>'+fighters[kind].name+'</strong><span>'+
      coatNames[kind][card.coats[i]]+(card.handicap?' · '+card.handicap[i]+'%':'')+'</span></div>').join('');
    el('stage').textContent=stageName(card.stage,card.stageForm);
    el('terms').textContent=[match,clock,format,'Fetch '+(card.fetch?'on':'off')].join(' · ');
    const canvas=el('preview');canvas.setAttribute('aria-label',one+' and '+two+' at '+el('stage').textContent);
    drawPreview(canvas,card,1.4,card.coats);
    function sync(){
      const value=pinned(),same=value===hash;
      el('pin').textContent=same?'Remove pin':value?'Replace pinned matchup':'Pin to main menu';
      el('pin').setAttribute('aria-pressed',String(same));
    }
    el('pin').onclick=()=>{
      const remove=pinned()===hash, durable=pin(remove?null:hash);
      status.textContent=(remove?'Pin removed':'Pinned '+one+' vs. '+two)+(durable?'.':' for this visit. Browser storage is unavailable.');
      sync();
    };
    el('share').onclick=async()=>{
      const url=new URL(location.protocol==='file:'?'https://caleb-guyer.github.io/dog-fight-3/':location.href);
      url.search='';url.hash=hash;link.value=url.href;link.hidden=false;link.select();status.textContent='Copy the link to share this matchup.';
      try{await navigator.clipboard.writeText(url.href);if(link.isConnected)status.textContent='Matchup link copied.';}catch{}
    };
    el('back').onclick=back;el('edit').onclick=edit;el('play').onclick=play;
    el('duel').onclick=duel;
    sync();el('play').focus({preventScroll:true});
    return sync;
  }
  function store(storage,id,card){
    try{storage.setItem(prefix+id,JSON.stringify(card));temporary.delete(id);return true;}
    catch{temporary.set(id,card);return false;}
  }
  function quick(settings,stockLabel){
    const choices = stockMinutes.filter(n=>n || !settings.timed).map(n => '<button type="button" class="utility" data-minutes="' + n +
      '" aria-pressed="' + (settings.minutes === n) + '">' + (n ? n + ' min' : 'No clock') + '</button>').join('');
    return (
      '<div class="dialog-actions"><button class="primary" data-do="rulebook">Choose or create a ruleset</button><button class="utility" data-do="handicap">Starting damage</button></div>'+
      (settings.mode==='training'?'':'<div class="dialog-actions"><button class="utility" data-do="matchup-card">Matchup card · Pin or share</button></div>')+
      '<h3>Battle rules</h3><div class="dialog-actions"><button class="utility" data-scoring="stock" aria-pressed="'+!settings.timed+'">Stock</button>'+
      '<button class="utility" data-scoring="time" aria-pressed="'+settings.timed+'">Time Battle</button>'+
      '<button class="utility" data-do="pack-relay">Pack Relay · Choose teams</button></div>'+
      (settings.timed?'<p>Respawn until time expires. Earn one point if a rival falls within ten seconds of your hit. Lose one point whenever you fall. A tie starts Sudden Death.</p>':
      '<p>'+stockLabel(settings.lives)+' each. When time runs out, the dog with more stocks wins. Tied stocks or a double final knockout start Sudden Death.</p>') +
      '<h3>Match format</h3><div class="dialog-actions"><button class="utility" data-format="single" aria-pressed="' + !settings.bestOfThree +
      '">Single game</button><button class="utility" data-format="set" aria-pressed="' + settings.bestOfThree + '">Best of three</button></div>' +
      '<p>In a set, the loser picks the next arena. First to two wins takes the set.</p>' +
      (settings.mode==='training'?'':'<div class="dialog-actions"><button class="utility" data-do="strike-set">Play a stage strike set</button></div>')+
      '<h3>Match clock</h3><div class="dialog-actions">' + choices + '</div>' +
      (settings.timed && settings.mode!=='training'?'<p>Ten seconds left, tied at zero. Both dogs are at 135% by the Night Mail ledge. Take the lead before the bell or fight the tiebreak.</p>'+
      '<div class="dialog-actions"><button class="utility" data-do="final-count">Play the final ten seconds</button></div>'+
      '<p>Try the same ten seconds from opposite scores. Start apart on the main deck at 135%. A credited KO can swing a one-point deficit into a lead.</p>'+
      '<div class="dialog-actions"><button class="utility" data-do="clock-opening" data-opening="defend">Protect a one-point lead</button>'+
      '<button class="utility" data-do="clock-opening" data-opening="chase">Come back from one down</button></div>':'')+
      '<p>Play the last stock with both dogs at 125%. When a hit threatens the match, steer during the close-up to change your launch.</p>' +
      '<div class="dialog-actions"><button class="utility" data-do="last-stock-start">Play last stock</button></div>' +
      '<h3>Sudden Death</h3><p>One stock at 300%. The sides start closing after five seconds. The ceiling and floor follow at ten seconds.</p>' +
      '<div class="dialog-actions"><button class="utility" data-do="sudden-start">Play Sudden Death</button></div>'+
      '<p>Start at the final boundaries. Air jump left out of the Laundry Line gap, or short hop from Moonbell’s top perch. Then fight for the last stock.</p>'+
      '<div class="dialog-actions"><button class="utility" data-sudden-opening="gap">Save the low return</button>'+
      '<button class="utility" data-sudden-opening="perch">Jump under the ceiling</button></div>');
  }
  function open(root,settings,{storage,hash='',focusDamage=false,apply,back}){
    const current=versusRules(settings), shared=decode(hash);
    const local=settings.mode!=='online', opponent=settings.mode==='solo'?'CPU':'P2';
    root.innerHTML='<label class="rules-source">Ruleset<select id="rules-choice"></select></label>'+
      '<div class="rules-fields">'+
      '<label>Battle type<select id="rules-type"><option value="stock">Stock</option><option value="time">Time Battle</option></select></label>'+
      '<label id="rules-lives-label">Stocks per dog<select id="rules-lives"></select></label>'+
      '<label>Match clock<select id="rules-clock"></select></label>'+
      '<label>Format<select id="rules-format"><option value="single">Single game</option><option value="set">Best of three</option></select></label>'+
      '<label>Stage form<select id="rules-form"></select></label>'+
      '<label>Fetch Ball<select id="rules-fetch"><option value="on">On</option><option value="off">Off</option></select></label>'+
      (local?['P1',opponent].map((label,i)=>'<label>'+label+' starting damage<select id="rules-damage-'+i+'" aria-describedby="rules-damage-help"></select></label>').join(''):'')+'</div>'+
      (local?'<p id="rules-damage-help">Each dog starts every stock at its chosen damage. Give the more experienced player a higher percentage to make them easier to launch.</p>':'')+
      '<div class="dialog-actions"><button class="primary" id="rules-use">Use these rules</button><button class="utility" id="rules-share">Share link</button><button class="utility" id="rules-back">Back</button></div>'+
      '<input hidden readonly id="rules-link" aria-label="Shareable ruleset link">'+
      '<label class="rules-source">Saved ruleset name<input id="rules-name" maxlength="40" autocomplete="off"></label>'+
      '<div class="dialog-actions"><button class="utility" id="rules-save">Save as new</button><button class="utility" id="rules-update">Update saved ruleset</button>'+
      '<button class="utility" id="rules-remove">Delete saved ruleset</button></div><p role="status" id="rules-status"></p>';
    const $=id=>root.querySelector('#rules-'+id);
    const choice=$('choice'), name=$('name'), status=$('status'), link=$('link');
    let cards=shelf(storage),confirmDelete=false;
    const add=(select,value,label)=>select.add(new Option(label,String(value)));
    if(local)for(const i of [0,1])for(let n=0;n<=150;n+=10)add($('damage-'+i),n,n+'%');
    for(let n=1;n<=5;n++)add($('lives'),n,n);
    for(const [id,form] of Object.entries(stageForms))add($('form'),id,form.name);
    function choices(id){
      choice.replaceChildren();add(choice,'current','Current match rules');
      if(shared)add(choice,'shared','Shared ruleset');
      const group=label=>{const el=document.createElement('optgroup');el.label=label;choice.append(el);return el;};
      const builtIn=group('Game rulesets');
      presets.forEach((card,i)=>{if(local || !card.rules.handicap)builtIn.append(new Option(card.name,'preset-'+i));});
      const available=[...cards].filter(([,card])=>local || !card.rules.handicap);
      if(available.length){
        const saved=group('Your saved rulesets');
        for(const [id,card] of available.sort((a,b)=>a[1].name.localeCompare(b[1].name)))saved.append(new Option(card.name,id));
      }
      choice.value=id;
      $('update').hidden=$('remove').hidden=!cards.has(id);
    }
    function clock(n){
      const timed=$('type').value==='time', select=$('clock');select.replaceChildren();
      for(const m of stockMinutes.filter(m=>m || !timed))add(select,m,m?m+' min':'No clock');
      select.value=String(timed && !n?3:n);$('lives-label').hidden=timed;
    }
    function read(){
      const handicap=local?[0,1].map(i=>Number($('damage-'+i).value)):null;
      return {timed:$('type').value==='time',lives:Number($('lives').value),minutes:Number($('clock').value),
        bestOfThree:$('format').value==='set',stageForm:$('form').value,fetch:$('fetch').value==='on',
        ...(handicap?.some(Boolean)?{handicap}:{})};
    }
    function clearNotice(){
      confirmDelete=false;$('remove').textContent='Delete saved ruleset';status.textContent='';link.hidden=true;
    }
    function load(){
      clearNotice();
      const id=choice.value, card=cards.get(id) || presets.find((_,i)=>id==='preset-'+i);
      const r=card?.rules || (id==='shared'?shared:current);
      $('type').value=r.timed?'time':'stock';$('lives').value=String(r.lives);clock(r.minutes);
      $('format').value=r.bestOfThree?'set':'single';$('form').value=r.stageForm;$('fetch').value=r.fetch?'on':'off';
      if(local)for(const i of [0,1])$('damage-'+i).value=String(r.handicap?.[i] || 0);
      name.value=card?.name || '';name.placeholder=r.timed?'Time Battle':r.lives+'-stock match';
      $('update').hidden=$('remove').hidden=!cards.has(id);
    }
    function save(id){
      const r=read(), card={name:name.value.trim() || (r.timed?r.minutes+'-minute battle':r.lives+'-stock '+(r.bestOfThree?'set':'match')),rules:r};
      const durable=store(storage,id,card);cards=shelf(storage);choices(id);load();
      status.textContent=durable?'Saved '+card.name+'.':'Saved for this visit. Browser storage is unavailable.';
    }
    choices(shared?'shared':'current');load();
    if(hash.split('/').length>2 && !shared)status.textContent='This link has invalid rules. Your current match rules are shown.';
    choice.onchange=load;
    root.querySelector('.rules-fields').onchange=e=>{
      clearNotice();if(e.target===$('type'))clock(Number($('clock').value));
    };
    name.oninput=clearNotice;
    $('use').onclick=()=>apply(read());$('back').onclick=back;
    $('save').onclick=()=>save(crypto.randomUUID());
    $('update').onclick=()=>{if(cards.has(choice.value))save(choice.value);};
    $('remove').onclick=()=>{
      const id=choice.value;if(!cards.has(id))return;
      if(!confirmDelete){confirmDelete=true;$('remove').textContent='Confirm delete';status.textContent='Delete '+cards.get(id).name+'?';return;}
      try{storage.removeItem(prefix+id);}catch{if(!temporary.has(id)){status.textContent='Could not delete this ruleset.';return;}}
      temporary.delete(id);cards=shelf(storage);choices('current');load();status.textContent='Ruleset deleted.';choice.focus();
    };
    $('share').onclick=async()=>{
      const url=new URL(location.protocol==='file:'?'https://caleb-guyer.github.io/dog-fight-3/':location.href);
      url.search='';url.hash=encode(settings.mode,read());const href=url.href;
      link.value=href;link.hidden=false;link.select();status.textContent='Copy the link to share these rules.';
      try{await navigator.clipboard.writeText(href);if(!link.hidden && link.value===href)status.textContent='Ruleset link copied.';}catch{}
    };
    if(local && focusDamage)$('damage-0').focus();else choice.focus({preventScroll:true});
  }
  function cpuSheet(cpuLevels,level,restart,showGuards) {
    const tells={pip:'Catches jumps with Scissor Kick',brisket:'Meets early climbs with Haymaker',
      noodle:'Spaces Lead Snap to hit with the knot',clover:'Fires Line Drive across the ledge'};
    const returns={pip:'Jump in place and tap Attack to meet Double Pounce.',
      brisket:'Hold Shield at the lip as Shoulder Charge comes through.',
      noodle:'Wait for the rope to catch. Jumping out puts you in Slingshot range.',
      clover:'Watch the disc. Clover can follow it past the ledge.'};
    const dogs=(tips,attribute)=>'<div class="cpu-choices">'+Object.entries(tips).map(([kind,tell])=>
      '<button type="button" '+attribute+'="'+kind+'"><strong>'+window.DogFight.fighters[kind].name+
      '</strong><span>'+tell+'</span></button>').join('')+'</div>';
    const ledgeChoices=showGuards?'<h3>Ledge guards</h3><p>Start a three-stock fight hanging from the ledge at 120%. Choose your Rival.</p>'+
      dogs(tells,'data-ledge-guard')+'<h3>Guard the return</h3><p>You hold the ledge. Your Rival starts far offstage at 60% with a jump in reserve. Both dogs have three stocks.</p>'+
      dogs(returns,'data-returner'):'';
    const choices = Object.entries(cpuLevels).map(([id, cpu]) =>
      '<button type="button" data-cpu="' + id + '" aria-pressed="' + (level === id) + '">' +
      '<strong>' + cpu.name + '</strong><span>' + cpu.tip + '</span></button>').join('');
    return (restart ? '<p>Choose an opponent to replay this match from the same opening.</p>' : '') +
      '<div class="cpu-choices">' + choices + '</div>' + (restart ? '' :
        '<p>Rival watches how you leave shield. In a set, it remembers between games.</p>' +
        '<div class="dialog-actions"><button class="utility" data-do="shield-read-match">Try Rival · Pip vs. Noodle</button>' +
        '<button class="utility" data-do="shield-read-set">Play a Rival set · Pip vs. Noodle</button>' +
        '<button class="utility" data-do="cut-off-clover">Intercept Clover · Pip vs. Clover</button></div>' +
        '<h3>Defend the stock return</h3><p>You just took a stock. Your opponent rides the lift down over you. Shield after their paws leave the lift to block the falling aerial. Hold Shield from GO and they can land beside you and grab.</p>'+
        '<button class="utility" data-do="lift-fight">Face the returning Rival</button>'+
        '<p>On Bandstand, you return above Rival. Drop as the lift lights up to take the high platform. Ride it to the end and watch for a jab as your last tag fades.</p>'+
        '<button class="utility" data-do="return-perch">Take the top platform</button>'+
        '<h3>Under the picnic bench</h3><p>Your Rival is overhead. Show Shield early and they can drop to grab you. Shield after they drop to block an aerial. If they land empty, jump or dodge the grab.</p>'+
        '<button class="utility" data-do="perch-fight">Fight under the bench</button>'+
        '<h3>Make Haymaker miss</h3><p>Brisket has already let his punch go. As Pip, dash left at GO, let the punch pass, then run back in and tap Attack. Switch dogs to see Rival Pip’s timing.</p>' +
        '<div class="dialog-actions"><button class="utility" data-do="dash-back-bait">Dodge the punch as Pip</button>' +
        '<button class="utility" data-do="dash-back-watch">Face Rival Pip as Brisket</button></div>' +
        '<p>Pip has seen Haymaker miss once. Hold Smash through GO, watch his front foot, then release as he steps toward you. Wait too long and he can grab you.</p>' +
        '<button class="utility" data-do="dash-back-delay">Catch Pip stepping in</button>' +
        '<h3>Change your landing</h3><p>You are falling onto the train roof. Rival has seen the same tech twice. Tap Shield just before landing. Center the stick to plant, or hold a side to roll. The fight continues for three stocks.</p>'+
        '<div class="dialog-actions"><button class="utility" data-do="landing-read" data-landing-read="stay">Rival expects you to stay</button>'+
        '<button class="utility" data-do="landing-read" data-landing-read="through">Rival expects a roll through</button></div>'+
        '<p>Escape Brisket’s grab at GO. On the top platform, steer across his up throw and air-dodge toward open ground. At the ledge, try a quick jab before his paws close.</p>' +
        '<div class="dialog-actions"><button class="utility" data-do="throw-read-perch">Top platform · 110%</button>' +
        '<button class="utility" data-do="throw-read-edge">Left ledge · 80%</button></div>') + ledgeChoices;
  }
  function controlsTable(networkGame,settings,keyboard,padFor,strikeKeys,nativeScreen,startName=()=>"Start") {
    const row=(title,key,pad)=>{
      const label=i=>typeof pad==='function'?pad(i):pad;
      const p=label(0), q=label(1);
      return [title,key(0),key(1),networkGame || p===q?p:'P1 '+p+' · P2 '+q];
    };
    const simple=(title,action)=>row(title,i=>keyboard(i,action),i=>padFor(i,action));
    const rows = [
      row('Move / aim',i=>['up','left','down','right'].map(a=>keyboard(i,a)).join(' '),'Stick / D-pad'),
      row('Walk',i=>keyboard(i,'walk')+' + '+keyboard(i,'left')+' / '+keyboard(i,'right'),'Tilt left stick gently'),
      row('Jump',i=>keyboard(i,'jump')+(settings['flickJump'+(i+1)]?' / '+keyboard(i,'up'):''),i=>padFor(i,'jump')+' / flick Up if enabled'),
      simple('Short hop','hop'),simple('Attack','attack'),row('Aim strike ← / → / ↑ / ↓',strikeKeys,'Right stick'),
      row('Smash / charge',i=>keyboard(i,'smash'),i=>padFor(i,'smash')+(settings[i?'tiltStick2':'tiltStick']?'':' / right stick')),
      simple('Special','special'),row('Shield / air dodge / tech',i=>keyboard(i,'shield'),i=>padFor(i,'shield')+' / '+padFor(i,'shieldAlt')),
      row('Light shield',i=>keyboard(i,'walk')+' + '+keyboard(i,'shield'),i=>'Left stick click + '+padFor(i,'shield')+' or partial shield trigger'),
      row('Tilt shield',i=>keyboard(i,'shield')+' + '+keyboard(i,'walk')+' + direction',i=>'Gentle stick / '+padFor(i,'shield')+' + '+padFor(i,'shieldAlt')+' + stick'),
      simple('Grab / throw','grab'),row(networkGame?'Match menu':'Pause',()=>'Esc',startName),
    ];
    if (nativeScreen) rows.push(['Fullscreen', 'F', 'F', '—']);
    return '<table class="control-table"><thead><tr><th>Action</th>' +
      (networkGame ? '<th>Keyboard</th>' : '<th>P1</th><th>P2</th>') + '<th>Gamepad</th></tr></thead><tbody>' +
      rows.map((r) => '<tr>' + (networkGame ? [r[0], r[1], r[3]] : r).map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
  }
  const controlsGuide =
    '<p>Flick a side to dash. Reverse in the first few steps to dash-dance. After a full run your dog plants its paws to turn. On touch, slide from the center dot onto a side arrow to walk, or tap a side arrow to dash.</p>' +
        '<p>In a running jump, tap the opposite direction with Jump to turn your dog while carrying your speed. Steer back toward the rival and hit them with your back air. In the air you can aim a strike independently with the right stick, the aim keys, or a swipe out from Smash on touch.</p>' +
        '<p>On a raised platform, flick Down to drop through with an air jump in reserve. Tap Attack as you fall to swing. Press Down and Attack together for a grounded down tilt. In the air, hold Down as you fall to pass through a perch. Release Down to land on the next one, or swing once your paws clear it. Try Pick your landing in Platform practice. For a low crouch, ease the stick down, hold Walk + Down on a keyboard, or slide from the center dot onto Down on touch.</p>' +
        '<p>Hold Down before a hit to crouch cancel. You take the damage with less knockback. A light, low hit can leave your paws planted. Tap Attack at the spark to answer with a down tilt. Try a stronger launcher or a grab against a crouching rival.</p>' +
        '<p>On the ground, hold Shield and tap Left or Right to roll, or tap Down to spot-dodge in place. Release a raised Shield just before a strike or projectile lands to parry. A melee parry gives you time for a counterattack. Grabs beat a shield release. Try these in Training → Shield practice.</p>' +
        '<p>Holding Shield or blocking a hit shrinks the bubble. An attack can clip an exposed paw or ear. To cover it, ease the stick toward the hit, or hold both Shield buttons and aim freely. On keyboard, hold Walk while aiming with Shield. On touch, hold Shield and drag from the center dot toward the hit.</p>' +
        '<p>While holding Shield, press Jump, Grab, Up + Smash, or Up + Special. On a raised platform, flick a lower diagonal to fall through your shield. Tap Attack with the diagonal for a down air, or aim a different aerial as you fall. Try Shield drop in Platform practice.</p>' +
        '<p>Tap during a blocked hit to start your response as soon as shieldstun ends. An immediate shield grab takes four extra frames to reach. A heavier blow pushes you farther away.</p>' +
        '<p>During the three-frame jump crouch, Up + Smash starts a grounded up smash and Up + Special starts your recovery move. A running up smash carries your speed. On touch, hold Up and slide your other thumb from Jump onto Smash or Special. Try Footwork practice → Catch the landing.</p>' +
        '<p>During the first two frames of a jab opener, tilt, or dash attack, press Jump or Hop and aim to turn the windup into a short-hop aerial. Start a tilt facing away, then aim toward the rival as you jump for a rising back air. Try Footwork practice → Turn into back air.</p>' +
        '<p>In midair, tap Shield with the stick centered to dodge in place. Aim up and toward the stage to slip past an edgeguard and catch the lip. You get one air dodge until you land or grab a ledge. Aim diagonally down and tap Shield to slide onto a platform. Do this just after jumping to wavedash. Try Training → Air-dodge practice or Training → Wavedash.</p>' +
        '<p>Flick a direction during the hit spark to shift your dog. You can slide sideways on the ground or in eight directions in the air. Try escaping the second swing in Training → Combo escape.</p>' +
        '<p>When a strong hit freezes the action, hold a direction across the launch to bend its path. As you tumble toward a platform, tap Shield just before contact to tech. Hold left or right as you land for a tech roll. Try both in Training → Launch practice.</p>' +
        '<p>Your dog crouches for three frames. Hold Short hop for a low jump, or tap Jump and release during the crouch. Hold Jump through the crouch for a full jump. Jump + Attack during the crouch gives a short-hop aerial. Flick Down in the last three rising frames or during descent to fast-fall. Release Down to aim freely. Jump again in midair. Press Jump just above a rival’s head for a footstool, even with your air jump spent. A rival stepped on in the air can tech the fall with Shield. Down + Jump drops through a raised platform.</p><p>Tap Attack alone for your dog’s jab combo. On the ground, aim left, right, up, or down and tap Attack for a tilt. Press left or right and Attack together for a forward tilt. Press Attack once your dog is running for a dash attack. In the air, press Attack alone or aim forward, back, up, or down. Forward follows the way your dog faces.</p><p>For a grounded smash, aim sideways, up, or down. Tap Smash to swing immediately, or hold it and release for more power. Ground Attack starts on the press by default. Each player can choose Hold to smash in Options to charge with Attack from a standstill. With the default Smash stick, hold the right stick in a direction and release to swing. Choose Tilt under Options for instant grounded tilts with the aim stick, aim keys, or a swipe from Smash.</p><p>Press Special alone for Neutral Special, or aim as you press it. Up + Special helps you get back to the stage. While hanging from an edge, tap Attack to climb in and strike. The Move list shows every fighter’s inputs.</p><p>Grabs beat shields. Run and press Grab to reach ahead. Press the opposite direction and Grab together as you turn to catch a pursuer. Once you catch a rival, tap Attack to pummel. Tap it again for another hit, or tap a direction to throw. The escape timer keeps running during pummels. Forward follows your facing at the catch. Press Grab again for forward, or tap action buttons to escape when caught.</p><p>Higher damage sends a dog farther. Three knockouts win a match. In local versus, one controller plays P2. Two controllers play one dog each.</p><div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>';
  function options(settings,cameraButton){
    return '<div class="option-list"><button type="button" data-do="option-sound" aria-pressed="' +
        settings.sound +
        '">Sound <b>' +
        (settings.sound ? 'On' : 'Off') +
        '</b></button><label for="option-volume">Master volume <input type="range" id="option-volume" min="0" max="100" step="5" value="' +
        settings.volume +
        '"><output id="option-volume-value">' +
        settings.volume +
        '%</output></label><label for="option-music">Music level <input type="range" id="option-music" min="0" max="100" step="5" value="'+
        settings.musicVolume+'"><output id="option-music-value">'+settings.musicVolume+'%</output></label>'+
        '<button type="button" id="open-sound-test">Sound Test</button><button type="button" data-do="bindings">Customize controls</button><button type="button" data-do="option-shake" aria-pressed="' +
        settings.shake +
        '">Camera shake <b>' +
        (settings.shake ? 'On' : 'Off') +
        '</b></button>'+cameraButton()+['tiltStick','tiltStick2'].map((key,i)=>'<button type="button" data-do="option-'+key+'" aria-pressed="'+settings[key]+'">P'+(i+1)+
          ' grounded aim stick <b>'+(settings[key]?'Tilt':'Smash')+'</b></button>').join('')+'<p>Also applies to the aim keys and a swipe from Smash on touch.</p>' +
        [1,2].map(slot => {
          const quick = settings['quickAttack'+slot];
          return '<button type="button" data-do="option-quickAttack'+slot+'" aria-pressed="'+quick+'">P'+slot+
            ' ground Attack <b>'+(quick?'On press':'Hold to smash')+'</b></button>';
        }).join('') +
        '<p>On press starts a jab or tilt immediately. Hold Smash to charge. Hold to smash also lets you charge with Attack.</p>' +
        [1,2].map(slot => {
          const enabled = settings['flickJump'+slot];
          return '<button type="button" data-do="option-flickJump'+slot+'" aria-pressed="'+enabled+'">P'+slot+
            ' flick jump <b>'+(enabled?'On':'Off')+'</b></button>';
        }).join('') +
        '<p>Flick the left stick up or tap Up to jump. For an up tilt, aim gently, hold Walk, or slide from the center dot on touch. Online uses your P1 controls.</p></div><div class="dialog-actions"><button class="primary" data-do="close">Done</button></div>';
  }
  function padDiagram(map,legend){
    const actions=Object.keys(map),names=window.FightControls.names;
    const key=(n,other)=>{
      const action=names[actions.find(a=>map[a]===n)] || other;
      return '<span data-pad-key="'+n+'" title="'+legend[n]+' · '+action+'">'+legend[n]+'</span>';
    };
    const stick=(n,name)=>'<div class="check-stick" data-stick="'+n+'" title="'+name+'"><i></i></div>';
    return '<div class="check-pad'+(legend[0]==='Button 1'?' numbered':'')+'" role="img" aria-label="Live controller inputs">'+
      [6,4,7,5].map(n=>key(n)).join('')+
      [8,9].map((n,i)=>key(n,i?'Pause':'Watch example')).join('')+
      [0,1,2,3].map(n=>key(n)).join('')+stick(0,'Move and aim')+stick(2,'Strike stick')+
      '<div class="check-dpad" aria-hidden="true">'+['▲','▼','◀','▶'].map((a,i)=>'<i data-pad-key="'+(12+i)+'">'+a+'</i>').join('')+'</div></div>';
  }
  function testInputs(edit,layout,pad,legend){
    const keyboard=edit.device==='keyboard',map=layout[edit.device][edit.slot],names=window.FightControls.names;
    const pressed=Object.keys(map).filter(k=>keyboard?edit.down.has(map[k]):pad?.buttons[map[k]]?.pressed);
    const diagram=document.querySelector('.check-pad'),labels=pressed.map(k=>names[k]);
    let next=pressed.join(' ');
    if(diagram){
      const axes=[0,1,2,3].map(i=>Math.round(Math.max(-1,Math.min(1,pad?.axes[i] || 0))*10));
      const dirs=['Up','Down','Left','Right'];
      const mask=(pad?.buttons || []).reduce((m,b,i)=>i<16 && b.pressed?m | (1<<i):m,0);
      next+='/'+axes.join(',')+'/'+mask+'/'+(pad?.index??'-');
      if(next===edit.last)return;
      for(const key of diagram.querySelectorAll('[data-pad-key]'))key.classList.toggle('lit',!!(mask & (1<<Number(key.dataset.padKey))));
      for(const stick of diagram.querySelectorAll('[data-stick]')){
        const i=Number(stick.dataset.stick),x=axes[i],y=axes[i+1];
        stick.firstElementChild.style.transform='translate('+x+'px,'+y+'px)';
        const direction=[Math.abs(y)>2?dirs[Number(y>0)]:'',Math.abs(x)>2?dirs[2+Number(x>0)]:''].filter(Boolean).join('-');
        if(direction)labels.push((i?'Strike stick ':'Move stick ')+direction.toLowerCase());
      }
      for(const [i,d] of dirs.entries())if(mask & (1<<(12+i)))labels.push('D-pad '+d.toLowerCase());
      if(mask & 256)labels.push(legend[8]);
    }else if(next===edit.last)return;
    edit.last=next;
    for(const row of document.querySelectorAll('#layout-grid [data-action]'))row.classList.toggle('pressed',pressed.includes(row.dataset.action));
    const line=labels.join(' + ') || (!keyboard && !pad?'Connect a controller and press a button.':'Press or hold controls together.');
    const status=document.getElementById('layout-status');if(status.textContent!==line)status.textContent=line;
  }
  function layoutSheet(edit,layout,settings,prefKeys,message,legend=window.FightControls.padLegend(null),style='auto'){
    const {device,slot,mode}=edit,keyboard=device==='keyboard',testing=mode==='test',pending=mode==='swap'||mode==='reset';
    const controls=window.FightControls;
    const map=layout[device][slot],actions=Object.keys(map);
    const value=a=>keyboard?controls.keyName(map[a]):legend[map[a]];
    const rows=actions.map(a=>{
      const label=controls.names[a];
      const binding=testing?'<kbd>'+value(a)+'</kbd>':keyboard?
        '<button type="button" class="utility" data-key="'+a+'" aria-label="Change '+label+' key, currently '+value(a)+'">'+(mode==='capture' && edit.action===a?'Press a key…':value(a))+'</button>':
        '<select data-pad="'+a+'" aria-label="'+label+' button">'+legend.slice(0,8).map((text,n)=>'<option value="'+n+'"'+(n===map[a]?' selected':'')+'>'+text+'</option>').join('')+'</select>';
      return '<div data-action="'+a+'"><span>'+label+'</span>'+binding+'</div>';
    }).join('');
    return '<div class="layout-switch"><label>Player <select id="layout-slot"><option value="0">P1</option><option value="1">P2</option></select></label>'+
      '<label>Device <select id="layout-device"><option value="keyboard">Keyboard</option><option value="pad">Controller</option></select></label></div>'+
      (!keyboard?'<label class="pad-style">Button labels <select id="pad-label-style">'+Object.entries(controls.labelStyles).map(([id,name])=>
        '<option value="'+id+'"'+(id===style?' selected':'')+'>'+name+'</option>').join('')+'</select></label><button class="utility" data-do="stick-setup">Calibrate sticks</button><button class="utility" data-do="rumble">Controller rumble</button>':'')+
      (!keyboard && testing?padDiagram(layout.pad[slot],legend):'')+
      '<p>'+(testing?(keyboard?'Press your keys to see which actions register.':'Press buttons together or move either stick. '+legend[9]+' leaves the test.') : keyboard?'Choose an action, then press its new key. Both players share this keyboard.':
        'Choose a button for each action. '+legend[0]+' selects and '+legend[1]+' goes back in menus.')+'</p>'+
      '<p id="layout-status" role="status">'+(message || (mode==='capture'?'Press a key for '+controls.names[edit.action]+'. Escape cancels.':
        mode==='reset'?keyboard?'Restore both keyboard layouts to their defaults?':'Restore the P'+(slot+1)+' controller defaults?':'Online uses your P1 layout.'))+'</p>'+
      '<div id="layout-grid"'+(pending?' hidden':'')+'>'+rows+'</div>'+
      (mode==='idle'?'<div class="layout-playstyle" role="group" aria-label="P'+(slot+1)+' fight controls">'+
        prefKeys(slot).map((key,n)=>'<button type="button" class="utility" data-playstyle="'+key+'" aria-pressed="'+settings[key]+'">'+
          ['Ground Attack','Flick jump','Aim stick'][n]+' · '+[settings[key]?'On press':'Hold to smash',settings[key]?'On':'Off',settings[key]?'Tilt':'Smash'][n]+'</button>').join('')+'</div>':'')+
      '<div class="dialog-actions">'+(pending?'<button type="button" class="primary" id="layout-confirm">'+(mode==='swap'?'Swap assignments':'Restore defaults')+'</button>':'')+
      (mode==='idle'?'<button type="button" class="primary" id="layout-test">Test layout</button><button type="button" class="utility" id="layout-profiles">Player profiles</button><button type="button" class="utility" id="layout-reset">'+(keyboard?'Restore keyboards':'Restore controller')+'</button>':'')+
      '<button type="button" class="utility" id="layout-back">'+(pending||mode==='capture'?'Cancel':testing?'Done testing':'Done')+'</button></div>';
  }
  function codePad({showDialog,dismiss,exitDialog,legend}){
    const $=id=>document.getElementById(id);
    const {roomAlphabet,validCode}=window.DogOnline;
    const field=$('online-code');
    let draft=[...field.value.toUpperCase()].filter(c=>roomAlphabet.includes(c)).slice(0,6).join('');
    showDialog('code-pad','Enter room code','<output id="room-digits" aria-live="polite"></output>'+
      '<div class="code-letters" role="group" aria-label="Room code characters">'+[...roomAlphabet].map(c=>
        '<button data-letter="'+c+'" type="button">'+c+'</button>').join('')+'</div>'+
      '<div class="dialog-actions"><button id="code-erase" class="utility" type="button">Erase<span class="pad-legend"> · '+legend[2]+'</span></button>'+
      '<button id="code-cancel" class="utility" type="button">Cancel</button><button id="code-join" class="primary" type="button">Join room</button></div>');
    const grid=document.querySelector('.code-letters'), digits=$('room-digits'), erase=$('code-erase'), join=$('code-join');
    const update=()=>{
      digits.replaceChildren(...Array.from({length:6},(_,i)=>{
        const cell=document.createElement('span');cell.textContent=draft[i]||'·';return cell;
      }));
      digits.setAttribute('aria-label',(draft.split('').join(' ')||'Empty')+' · '+draft.length+' of 6 characters');
      erase.disabled=!draft;
      join.disabled=!validCode(draft);
      for(const button of grid.children)button.disabled=draft.length===6;
    };
    grid.onclick=e=>{
      const button=e.target.closest('[data-letter]');
      if(!button || button.disabled)return;
      draft+=button.dataset.letter;update();
      if(!join.disabled)join.focus();
    };
    erase.onclick=()=>{
      const removed=draft.slice(-1);
      draft=draft.slice(0,-1);update();
      if(removed)grid.querySelector('[data-letter="'+removed+'"]').focus();
    };
    $('code-cancel').onclick=exitDialog;
    join.onclick=()=>{
      if(!validCode(draft))return;
      field.value=draft;dismiss();$('online-join-form').requestSubmit();
    };
    update();(join.disabled?grid.firstElementChild:join).focus();
  }
  function roomFighters(roomDraft,rival,free,played,{portrait,savedCoat,showDialog,coatNames}){
    const {fighters}=window.DogFight;
    const {kind,coat,colors}=roomDraft;
    const roster=Object.entries(fighters).map(([id,f])=>{
      const chosen=colors[id]??savedCoat(0,id);
      const color=!free && id===rival.kind && chosen===rival.coat?(chosen+1)%4:chosen;
      return '<button type="button" class="coat-option" data-room-dog="'+id+'" aria-pressed="'+(kind===id)+'"><img alt="" src="'+
        portrait(id,color)+'"><strong>'+f.name+'</strong><small>'+f.style+'</small></button>';
    }).join('');
    const coats=coatNames[kind].map((name,i)=>{
      const taken=!free && kind===rival.kind && i===rival.coat;
      return '<button class="utility" data-room-coat="'+i+'" aria-pressed="'+(coat===i)+'"'+(taken?' disabled':'')+'>'+
        name+(taken?' · Opponent':'')+'</button>';
    }).join('');
    const action=free?'ready-fighter':'room-stage';
    showDialog('room-fighters',free?'Choose your next fighter':'Counterpick · Game '+(played+1),
      (free?'<p>Both players pick independently. If you pick the same dog and coat, P2 wears the next color.</p>':
        '<p>Your opponent keeps '+coatNames[rival.kind][rival.coat]+' '+fighters[rival.kind].name+'.</p>')+
      '<div class="coat-grid" role="group" aria-label="Choose your fighter">'+roster+'</div>'+
      '<h3 class="card-stage">'+fighters[kind].name+' · Coat</h3><div class="form-choices room-coats" role="group" aria-label="Choose coat">'+coats+'</div>'+
      '<p id="net-pick-ready" role="status"></p><div class="dialog-actions"><button class="primary" data-do="'+action+'">'+
      (free?'Ready as '+fighters[kind].name:'Choose arena')+'</button>'+
      '<button class="utility" data-do="card-back">Back to results</button></div>');
    return action;
  }
  function wireLayout(edit,layout,settings,profileTags,{drawLayouts,leaveLayouts,applyLayouts,openProfiles,style}){
    const $=id=>document.getElementById(id),{mode,slot,device}=edit,keyboard=device==='keyboard',testing=mode==='test',pending=mode==='swap'||mode==='reset';
    const controls=window.FightControls;
    function assignControl() {
      const other=controls.occupant(layout,edit.device,edit.slot,edit.value);
      if(other)profileTags[other.slot]='';
      profileTags[edit.slot]='';
      controls.assign(layout,edit.device,edit.slot,edit.action,edit.value);
      applyLayouts(true);edit.mode='idle';
      drawLayouts(controls.names[edit.action]+' saved.');
    }
    function chooseBinding(action,value) {
      const map=layout[edit.device][edit.slot];
      edit.action=action;edit.value=value;
      if(map[action]===value){edit.mode='idle';drawLayouts();return;}
      const other=controls.occupant(layout,edit.device,edit.slot,value);
      if(!other){assignControl();return;}
      edit.mode='swap';
      const old=edit.device==='keyboard'?controls.keyName(map[action]):edit.legend[map[action]];
      const name=edit.device==='keyboard'?controls.keyName(value):edit.legend[value];
      drawLayouts('Swap '+name+' and '+old+'? P'+(other.slot+1)+' '+controls.names[other.action]+' will move to '+old+'.');
    }
    if($('pad-label-style'))$('pad-label-style').onchange=e=>style(e.target.value);
    $('layout-slot').value=String(slot);$('layout-device').value=device;
    $('layout-slot').onchange=e=>{edit.slot=Number(e.target.value);edit.mode='idle';drawLayouts();$('layout-slot').focus();};
    $('layout-device').onchange=e=>{edit.device=e.target.value;edit.mode='idle';drawLayouts();$('layout-device').focus();};
    $('layout-grid').onclick=e=>{
      const b=e.target.closest('[data-key]');
      if(b){edit.mode='capture';edit.action=b.dataset.key;drawLayouts();}
    };
    $('layout-grid').onchange=e=>{if(e.target.dataset.pad)chooseBinding(e.target.dataset.pad,Number(e.target.value));};
    $('layout-back').onclick=leaveLayouts;
    if(mode==='idle'){
      for(const b of $('dialog-body').querySelectorAll('[data-playstyle]'))b.onclick=()=>{
        const key=b.dataset.playstyle;
        settings[key]=!settings[key];profileTags[slot]='';
        const stored=applyLayouts(true);
        drawLayouts(stored?'P'+(slot+1)+' controls saved.':'Controls updated for this visit.');
        $('dialog-body').querySelector('[data-playstyle="'+key+'"]').focus();
      };
      $('layout-profiles').onclick=()=>openProfiles('bindings',edit.slot);
      $('layout-test').onclick=()=>{edit.mode='test';edit.down.clear();edit.last=null;drawLayouts();};
      $('layout-reset').onclick=()=>{edit.mode='reset';drawLayouts();};
    }
    if(pending) $('layout-confirm').onclick=()=>{
      if(mode==='swap')return assignControl();
      if(keyboard) layout.keyboard=window.FightControls.defaults('keyboard');
      else layout.pad[slot]=window.FightControls.defaults('pad')[slot];
      if(keyboard)profileTags.fill('');else profileTags[slot]='';
      applyLayouts(true);edit.mode='idle';drawLayouts('Default assignments restored.');
    };
    const row=$('layout-grid').querySelector('[data-action="'+edit.action+'"] button, [data-action="'+edit.action+'"] select');
    (pending || testing ? $('layout-back') : row || $('layout-slot')).focus({preventScroll:true});
    return chooseBinding;
  }
  function cupPoster(canvas,id,stage,coat){
    const terrain=window.DogFight.platforms(stage,0),deck=terrain.find(p=>!p.thin);
    const x=Math.round((deck.x1+deck.x2)/2),y=deck.y,left=x-canvas.width/2,top=y-canvas.height+24;
    const ctx=canvas.getContext('2d');ctx.save();ctx.translate(-left,-top);
    window.ArenaArt.draw(ctx,stage,0,{left,top,right:left+canvas.width,bottom:top+canvas.height},'original',terrain);
    window.DogArt.draw(ctx,id,x,y,{pose:'idle',face:1,scale:1.9,time:.35,coat});ctx.restore();
  }
  function cupSelect(root,{kind,entry,course,route,stops,records,offer,tip,storageNote,coatFor,select,back,start,relay}){
    const {fighters}=window.DogFight,run=entry.active,round=run?.wins.length || 0;
    const next=course.bouts[round]?.[0],stop=next?fighters[next].name:'Copper Hound';
    const title=run?(run.started?'Retry round ':'Continue to round ')+(round+1):'Start '+fighters[kind].name+'’s run';
    const button=(key,name,primary=false)=>'<button type="button" class="'+(primary?'primary':'utility')+'" data-do="'+key+'">'+name+'</button>';
    const controls=button('cup-start',title,true);
    const cards=Object.entries(fighters).map(([id,f])=>'<button type="button" class="cup-poster" data-cup-dog="'+id+'" aria-pressed="'+(id===kind)+'" style="--dog-color:'+f.color+'">'+
      '<canvas width="300" height="224" aria-hidden="true"></canvas><span><strong>'+f.name+'</strong><small>'+f.style+'</small></span></button>').join('');
    root.dataset.view=route?'route':'roster';
    root.innerHTML='<div class="cup-select-inner"><header class="cup-select-head"><div><span>Arcade Cup</span><h1>'+
      (route?course.name:'Fighter select')+'</h1></div><button id="cup-back" class="utility">'+(route?'Fighter select':'Main menu')+'</button></header>'+
      (route?'<div class="cup-route-board"><ol class="cup-stops">'+stops+'</ol><p>'+tip+'</p>'+records+'</div>':
      '<div class="cup-posters" role="group" aria-label="Choose your fighter">'+cards+'</div>')+
      '<footer class="cup-ticket"><div>'+(route?'<strong>'+fighters[kind].name+'</strong>':'<strong>'+course.name+'</strong>')+
      '<p>Round '+(round+1)+' of 4 · '+stop+'</p></div><div class="cup-ticket-actions">'+
      (route?offer || button('cup-exhibition','Relay exhibition'):button('cup-sheet','Route card'))+controls+'</div></footer>'+storageNote+'</div>';
    root.querySelector('#cup-back').onclick=route?()=>select(kind,false):back;
    root.querySelector('[data-do=cup-start]').onclick=e=>start(e.currentTarget);
    const routeButton=root.querySelector('[data-do=cup-sheet]');
    if(routeButton)routeButton.onclick=()=>select(kind,true);
    const detour=root.querySelector('[data-do=cup-relay],[data-do=cup-exhibition]');
    if(detour)detour.onclick=()=>relay(detour.dataset.do==='cup-exhibition');
    const art={pip:'picnic',brisket:'nightmail',noodle:'laundry',clover:'canal'};
    for(const b of root.querySelectorAll('[data-cup-dog]')){
      const id=b.dataset.cupDog;
      cupPoster(b.querySelector('canvas'),id,art[id],coatFor(id));
      b.onclick=()=>{if(id===kind)root.querySelector('[data-do=cup-start]').focus();else select(id,false);};
    }
    root.querySelector(route?'[data-do=cup-start]':'[aria-pressed="true"]').focus({preventScroll:true});
  }
  function arenaSelect(root,{stage,form,picking,chooseForm,roomFighter,focusId,draw,reduced,run,music,confirm}){
    const {arenas}=window.DogFight;
    const drawBag=new window.FightControls.FighterShuffle(Object.keys(arenas));
    const tiles=Object.entries(arenas).map(([id,a])=>
      '<button type="button" data-stage="'+id+'"><canvas width="300" height="169" aria-hidden="true"></canvas><span>'+a.name+'</span></button>').join('');
    const forms=Object.entries(stageForms).map(([id,f])=>
      '<button type="button" data-stage-form="'+id+'">'+f.name+'</button>').join('');
    root.innerHTML='<div class="arena-board"><div class="arena-scout"><div class="arena-picture">'+
      '<canvas id="arena-preview" width="640" height="360" role="img"></canvas><button id="arena-motion" type="button"></button></div>'+
      '<div class="arena-caption" aria-live="polite" aria-atomic="true"><h3 id="arena-name"></h3><p id="arena-description"></p></div></div>'+
      '<div class="arena-picks"><h3>Arena</h3><div class="arena-tiles" role="group" aria-label="Arena">'+tiles+
      '<button type="button" id="arena-random"><b aria-hidden="true">?</b><span>Random</span></button></div>'+
      (chooseForm?'<h3>Layout</h3><div class="arena-forms" role="group" aria-label="Stage form">'+forms+'</div>':'')+'</div>'+
      '<footer>'+ (chooseForm?'<div class="arena-tools"><button id="arena-run">Stage Run</button><button id="arena-music">Stage music</button></div>':'')+
      (roomFighter?'<div class="arena-room"><strong>'+roomFighter+'</strong><span id="net-pick-ready" role="status"></span>'+
      '<button data-do="room-fighter-back">Change fighter</button></div>':'')+
      '<button type="button" class="primary" id="arena-confirm">'+(picking?'Lock in arena':'Use arena')+'</button></footer></div>';
    const el=id=>root.querySelector('#arena-'+id);
    const cards=[...root.querySelectorAll('[data-stage]')],layouts=[...root.querySelectorAll('[data-stage-form]')];
    const canvas=el('preview'),motion=el('motion');
    let time=1.4,drawn=-1,preference=reduced.matches,playing=!preference;
    function paint(){
      drawn=Math.floor(time*12);
      draw(canvas,stage,form,drawn/12);
    }
    function describe(){
      for(const b of cards){
        const chosen=b.dataset.stage===stage;
        b.setAttribute('aria-pressed',String(chosen));b.tabIndex=chosen?0:-1;
      }
      for(const b of layouts)b.setAttribute('aria-pressed',String(b.dataset.stageForm===form));
      const name=arenas[stage].name,layout=stageForms[form];
      el('name').textContent=name;
      el('description').textContent=(form==='original'?'':layout.name+' · ')+(layout.description || arenas[stage].description);
      canvas.setAttribute('aria-label',name+' · '+layout.name);
      paint();
    }
    function paintCards(){
      for(const b of cards)draw(b.querySelector('canvas'),b.dataset.stage,form);
    }
    function select(id){
      if(id===stage)return;
      stage=id;describe();
    }
    for(const b of cards){
      b.onfocus=()=>select(b.dataset.stage);
      b.onclick=e=>{
        select(b.dataset.stage);
        if(e.detail===0)el('confirm').focus();
      };
    }
    for(const b of layouts)b.onclick=()=>{
      if(form===b.dataset.stageForm)return;
      form=b.dataset.stageForm;paintCards();describe();
    };
    el('random').onclick=()=>select(drawBag.draw(stage));
    function transport(){
      motion.textContent=playing?'Pause':'Play';
      motion.setAttribute('aria-label',motion.textContent+' stage preview');
    }
    motion.onclick=()=>{playing=!playing;transport();};
    el('confirm').onclick=()=>confirm(stage,form);
    if(chooseForm){
      el('run').onclick=()=>run(stage,form);
      el('music').onclick=()=>music(stage,form);
    }
    paintCards();describe();transport();
    (focusId && root.querySelector('#'+focusId) || cards.find(b=>b.dataset.stage===stage)).focus({preventScroll:true});
    return {tick(dt){
      if(preference!==reduced.matches){preference=reduced.matches;playing=!preference;transport();}
      if(!playing)return;
      time+=dt;
      if(Math.floor(time*12)!==drawn)paint();
    }};
  }
  window.VersusRulebook={arenaSelect,cupSelect,OpeningDuel,codePad,roomFighters,testInputs,wireLayout,layoutSheet,options,encode,decode,encodeMatchup,decodeMatchup,matchupSheet,quick,open,controlsGuide,controlsTable,cpuSheet};
})();
