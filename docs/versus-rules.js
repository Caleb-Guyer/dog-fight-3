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
  function matchupSheet(root,card,{drawPreview,coatNames,stageName,back,play,edit,pinned,pin}){
    const {fighters,cpuLevels}=window.DogFight, hash=encodeMatchup(card);
    const [one,two]=[card.p1,card.p2].map(kind=>fighters[kind].name);
    const format=card.bestOfThree?'Best of three':'Single game', match=card.timed?'Time Battle':card.lives+(card.lives===1?' stock':' stocks');
    const clock=card.minutes?card.minutes+' min':'No clock';
    root.innerHTML='<canvas id="matchup-preview" role="img"></canvas><div class="matchup-fighters"></div>'+
      '<strong id="matchup-stage"></strong><p id="matchup-terms"></p><div class="dialog-actions">'+
      '<button type="button" class="primary" id="matchup-play">'+(card.bestOfThree?'Start set':'Start fight')+'</button>'+
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
        '<h3>Make Haymaker miss</h3><p>Brisket has already let his punch go. As Pip, dash left at GO, let the punch pass, then run back in and tap Attack. Switch dogs to see Rival Pip’s timing.</p>' +
        '<div class="dialog-actions"><button class="utility" data-do="dash-back-bait">Dodge the punch as Pip</button>' +
        '<button class="utility" data-do="dash-back-watch">Face Rival Pip as Brisket</button></div>' +
        '<p>Pip has seen Haymaker miss once. Hold Smash through GO, watch his front foot, then release as he steps toward you. Wait too long and he can grab you.</p>' +
        '<button class="utility" data-do="dash-back-delay">Catch Pip stepping in</button>' +
        '<p>Escape Brisket’s grab at GO. On the top platform, steer across his up throw and air-dodge toward open ground. At the ledge, try a quick jab before his paws close.</p>' +
        '<div class="dialog-actions"><button class="utility" data-do="throw-read-perch">Top platform · 110%</button>' +
        '<button class="utility" data-do="throw-read-edge">Left ledge · 80%</button></div>') + ledgeChoices;
  }
  function controlsTable(networkGame,settings,keyboard,padFor,strikeKeys,nativeScreen) {
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
      row('Tilt shield',i=>keyboard(i,'shield')+' + '+keyboard(i,'walk')+' + direction',i=>'Gentle stick / '+padFor(i,'shield')+' + '+padFor(i,'shieldAlt')+' + stick'),
      simple('Grab / throw','grab'),[networkGame ? 'Match menu' : 'Pause','Esc','Esc','Start'],
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
  function layoutSheet(edit,layout,settings,prefKeys,message){
    const {device,slot,mode}=edit,keyboard=device==='keyboard',testing=mode==='test',pending=mode==='swap'||mode==='reset';
    const controls=window.FightControls;
    const map=layout[device][slot],actions=Object.keys(map);
    const value=a=>keyboard?controls.keyName(map[a]):controls.buttons[map[a]];
    const rows=actions.map(a=>{
      const label=controls.names[a];
      const binding=testing?'<kbd>'+value(a)+'</kbd>':keyboard?
        '<button type="button" class="utility" data-key="'+a+'" aria-label="Change '+label+' key, currently '+value(a)+'">'+(mode==='capture' && edit.action===a?'Press a key…':value(a))+'</button>':
        '<select data-pad="'+a+'" aria-label="'+label+' button">'+controls.buttons.map((text,n)=>'<option value="'+n+'"'+(n===map[a]?' selected':'')+'>'+text+'</option>').join('')+'</select>';
      return '<div data-action="'+a+'"><span>'+label+'</span>'+binding+'</div>';
    }).join('');
    return '<div class="layout-switch"><label>Player <select id="layout-slot"><option value="0">P1</option><option value="1">P2</option></select></label>'+
      '<label>Device <select id="layout-device"><option value="keyboard">Keyboard</option><option value="pad">Controller</option></select></label></div>'+
      '<p>'+(testing?(keyboard?'Press your keys to see which actions register.':'Press controller buttons to test them. Start leaves the test.') : keyboard?'Choose an action, then press its new key. Both players share this keyboard.':
        'Choose a button for each action. A and B still select and go back in menus.')+'</p>'+
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
  window.VersusRulebook={layoutSheet,options,encode,decode,encodeMatchup,decodeMatchup,matchupSheet,quick,open,controlsGuide,controlsTable,cpuSheet};
})();
