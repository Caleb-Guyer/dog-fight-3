(() => {
  'use strict';
  const {versusRules,stockMinutes,validStockCount,stageForms}=window.DogFight;
  const standard=versusRules({fetch:false});
  const presets=[
    {name:'Tournament set',rules:{...standard,bestOfThree:true}},
    {name:'Last dog standing',rules:{...standard,lives:1,minutes:3,stageForm:'flat'}},
    {name:'Fetch frenzy',rules:{...standard,timed:true,minutes:3,fetch:true,stageForm:'trio'}},
  ];
  const prefix='dog-fight-3.ruleset.1.', temporary=new Map();
  const custom=id=>/^[a-f0-9-]{36}$/.test(id);
  function encode(mode,r){
    return '#'+mode+'/rules/'+[r.timed?'time':'stock',r.lives,r.minutes,r.bestOfThree?'set':'single',r.stageForm,r.fetch?'on':'off'].join('/');
  }
  function decode(hash){
    const parts=hash.split('/');
    if(parts.length!==8 || !['#solo','#local','#online'].includes(parts[0]) || parts[1]!=='rules')return null;
    const [type,lives,minutes,format,stageForm,items]=parts.slice(2);
    if(!['stock','time'].includes(type) || !/^[1-5]$/.test(lives) || !['0','1','3','7'].includes(minutes) ||
      type==='time' && minutes==='0' || !['single','set'].includes(format) || !Object.hasOwn(stageForms,stageForm) ||
      !['on','off'].includes(items))return null;
    return {timed:type==='time',lives:Number(lives),minutes:Number(minutes),bestOfThree:format==='set',stageForm,fetch:items==='on'};
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
  function open(root,settings,{storage,hash='',apply,back}){
    const current=versusRules(settings), shared=decode(hash);
    root.innerHTML='<label class="rules-source">Ruleset<select id="rules-choice"></select></label>'+
      '<div class="rules-fields">'+
      '<label>Battle type<select id="rules-type"><option value="stock">Stock</option><option value="time">Time Battle</option></select></label>'+
      '<label id="rules-lives-label">Stocks per dog<select id="rules-lives"></select></label>'+
      '<label>Match clock<select id="rules-clock"></select></label>'+
      '<label>Format<select id="rules-format"><option value="single">Single game</option><option value="set">Best of three</option></select></label>'+
      '<label>Stage form<select id="rules-form"></select></label>'+
      '<label>Fetch Ball<select id="rules-fetch"><option value="on">On</option><option value="off">Off</option></select></label></div>'+
      '<div class="dialog-actions"><button class="primary" id="rules-use">Use these rules</button><button class="utility" id="rules-share">Share link</button><button class="utility" id="rules-back">Back</button></div>'+
      '<input hidden readonly id="rules-link" aria-label="Shareable ruleset link">'+
      '<label class="rules-source">Saved ruleset name<input id="rules-name" maxlength="40" autocomplete="off"></label>'+
      '<div class="dialog-actions"><button class="utility" id="rules-save">Save as new</button><button class="utility" id="rules-update">Update saved ruleset</button>'+
      '<button class="utility" id="rules-remove">Delete saved ruleset</button></div><p role="status" id="rules-status"></p>';
    const $=id=>root.querySelector('#rules-'+id);
    const choice=$('choice'), name=$('name'), status=$('status'), link=$('link');
    let cards=shelf(storage),confirmDelete=false;
    const add=(select,value,label)=>select.add(new Option(label,String(value)));
    for(let n=1;n<=5;n++)add($('lives'),n,n);
    for(const [id,form] of Object.entries(stageForms))add($('form'),id,form.name);
    function choices(id){
      choice.replaceChildren();add(choice,'current','Current match rules');
      if(shared)add(choice,'shared','Shared ruleset');
      const group=label=>{const el=document.createElement('optgroup');el.label=label;choice.append(el);return el;};
      const builtIn=group('Game rulesets');
      presets.forEach((card,i)=>builtIn.append(new Option(card.name,'preset-'+i)));
      if(cards.size){
        const saved=group('Your saved rulesets');
        for(const [id,card] of [...cards].sort((a,b)=>a[1].name.localeCompare(b[1].name)))saved.append(new Option(card.name,id));
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
      return {timed:$('type').value==='time',lives:Number($('lives').value),minutes:Number($('clock').value),
        bestOfThree:$('format').value==='set',stageForm:$('form').value,fetch:$('fetch').value==='on'};
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
    choice.focus({preventScroll:true});
  }
  window.VersusRulebook={encode,decode,open};
})();
