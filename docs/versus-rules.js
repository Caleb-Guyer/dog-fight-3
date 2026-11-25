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
  function store(storage,id,card){
    try{storage.setItem(prefix+id,JSON.stringify(card));temporary.delete(id);return true;}
    catch{temporary.set(id,card);return false;}
  }
  function quick(settings,stockLabel){
    const choices = stockMinutes.filter(n=>n || !settings.timed).map(n => '<button type="button" class="utility" data-minutes="' + n +
      '" aria-pressed="' + (settings.minutes === n) + '">' + (n ? n + ' min' : 'No clock') + '</button>').join('');
    return (
      '<div class="dialog-actions"><button class="primary" data-do="rulebook">Choose or create a ruleset</button><button class="utility" data-do="handicap">Starting damage</button></div>'+
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
      '<p>Play the last stock with both dogs at 125%. When a hit threatens the match, steer during the close-up to change your launch.</p>' +
      '<div class="dialog-actions"><button class="utility" data-do="last-stock-start">Play last stock</button></div>' +
      '<p>Sudden Death starts both dogs at 300% on one stock. The side boundaries close in after five seconds.</p>' +
      '<div class="dialog-actions"><button class="utility" data-do="sudden-start">Play Sudden Death</button></div>');
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
  window.VersusRulebook={encode,decode,quick,open};
})();
