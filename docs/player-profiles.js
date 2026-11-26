(() => {
  'use strict';
  const controls=window.FightControls, prefix='dog-fight-3.player.';
  const temporary=new Map();
  const cleanName=value=>typeof value==='string'?value.trim().replace(/\s+/gu,' ').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu,'').slice(0,16).trim():'';
  const keyFor=name=>prefix+name.toLowerCase();
  function validMap(map,device){
    if(!map || typeof map!=='object')return false;
    const actions=Object.keys(controls.defaults(device)[0]), values=actions.map(action=>map[action]);
    return new Set(values).size===actions.length && values.every(device==='keyboard'?controls.allowed:
      value=>Number.isInteger(value) && value>=0 && value<controls.buttons.length);
  }
  function valid(profile){
    return profile && !!cleanName(profile.name) && cleanName(profile.name)===profile.name &&
      (profile.rumble===undefined || [0,1,2].includes(profile.rumble)) &&
      validMap(profile.keyboard,'keyboard') && validMap(profile.pad,'pad') &&
      Array.isArray(profile.prefs) && profile.prefs.length===3 && profile.prefs.every(v=>typeof v==='boolean');
  }
  function library(storage){
    const profiles=new Map();
    try{
      for(let i=0;i<storage.length;i++){
        const key=storage.key(i);
        if(!key?.startsWith(prefix))continue;
        try{
          const saved=JSON.parse(storage.getItem(key));
          if(valid(saved) && key===keyFor(saved.name))profiles.set(key,saved);
        }catch{}
      }
    }catch{}
    for(const [key,profile] of temporary){
      if(profile)profiles.set(key,profile);else profiles.delete(key);
    }
    return Array.from(profiles.values()).sort((a,b)=>a.name.localeCompare(b.name));
  }
  function write(storage,name,profile){
    const key=keyFor(name);
    try{
      if(profile)storage.setItem(key,JSON.stringify(profile));else storage.removeItem(key);
      temporary.delete(key);
      return true;
    }catch{
      temporary.set(key,profile);
      return false;
    }
  }
  function capture(layout,slot,prefs,name){
    return {name:cleanName(name),keyboard:{...layout.keyboard[slot]},pad:{...layout.pad[slot]},prefs:[...prefs]};
  }
  function preview(layout,slot,profile,keyboard=true){
    const next=controls.load(layout);
    if(keyboard)for(const action of Object.keys(next.keyboard[slot])){
      controls.assign(next,'keyboard',slot,action,profile.keyboard[action]);
    }
    next.pad[slot]={...profile.pad};
    const old=layout.keyboard[1-slot], other=next.keyboard[1-slot];
    const changed=Object.keys(old).filter(a=>old[a]!==other[a]).map(action=>({action,from:old[action],to:other[action]}));
    return {next,changed};
  }
  function open(root,game){
    let slot=game.slot,selected='',pending=null;
    const el=id=>root.querySelector('#profile-'+id);
    const focus=id=>el(id)?.focus({preventScroll:true});
    function draw(message='',target='seat-'+slot){
      const profiles=library(game.storage);
      const profile=profiles.find(p=>p.name===selected) || profiles.find(p=>p.name===game.tags()[slot]) || profiles[0];
      selected=profile?.name || '';
      const active=game.tags()[slot],seat='P'+(slot+1),other='P'+(2-slot);
      root.innerHTML='<div class="profile-panel"><div class="dialog-actions" role="group" aria-label="Choose player">'+
        [0,1].map(i=>'<button class="utility" id="profile-seat-'+i+'" aria-pressed="'+(i===slot)+'">P'+(i+1)+'</button>').join('')+
        '</div><p id="profile-active"></p><div id="profile-body"></div><p id="profile-status" role="status"></p>'+
        '<div class="dialog-actions"><button class="utility" id="profile-back">Back</button></div></div>';
      el('active').textContent=seat+' · '+(active || 'Seat controls');
      el('status').textContent=message;
      el('back').onclick=()=>{if(pending){pending=null;draw('','use');}else game.back();};
      [0,1].forEach(i=>el('seat-'+i).onclick=()=>{slot=i;pending=null;draw();});
      const body=el('body');
      if(pending){
        const action=pending.type;
        body.innerHTML='<h3 id="profile-question"></h3><ul id="profile-changes"></ul><div class="dialog-actions"><button class="primary" id="profile-confirm"></button>'+
          (action==='apply'?'<button class="utility" id="profile-pad-only">Keep both keyboards</button>':'')+'</div>';
        el('back').textContent='Cancel';
        el('question').textContent=action==='apply'?'Using '+pending.profile.name+' will move these '+other+' keys.':
          action==='delete'?'Delete the saved copy of '+pending.profile.name+'?':'Replace the saved controls for '+pending.profile.name+'?';
        el('confirm').textContent=action==='apply'?'Move keys and apply':action==='delete'?'Delete profile':'Replace profile';
        if(action==='apply'){
          for(const c of pending.changed){
            const li=document.createElement('li');
            li.textContent=controls.names[c.action]+' · '+controls.keyName(c.from)+' → '+controls.keyName(c.to);
            el('changes').append(li);
          }
          el('pad-only').onclick=()=>use(pending.profile,false);
        }
        el('confirm').onclick=()=>{
          if(action==='apply')return use(pending.profile,true,pending.changed);
          if(action==='replace')return saveProfile(pending.profile);
          const saved=write(game.storage,pending.profile.name,null);
          selected='';pending=null;draw(saved?'Saved profile deleted.':'Removed for this visit.','name');
        };
        focus('back');return;
      }
      body.innerHTML='<h3>Saved players</h3><div class="profile-list" role="group" aria-label="Saved players"></div>'+
        (profile?'<p id="profile-detail"></p><div class="dialog-actions"><button class="primary" id="profile-use">Use for '+seat+'</button>'+
          '<button class="utility" id="profile-delete">Delete saved copy</button></div>':'<p>Save your controls below to bring them to either seat.</p>')+
        '<h3>Save '+seat+' controls</h3><label>Player name <input id="profile-name" maxlength="16" autocomplete="off"></label>'+
        '<div class="dialog-actions"><button class="utility" id="profile-save">Save current controls</button>'+
        '<button class="utility" id="profile-edit">Customize controls</button></div>';
      const list=body.querySelector('.profile-list');
      for(const p of profiles){
        const button=document.createElement('button');
        button.className='utility';button.textContent=p.name;
        button.setAttribute('aria-pressed',String(p.name===selected));
        button.onclick=()=>{selected=p.name;draw('','use');};
        list.append(button);
      }
      if(profile){
        const [quick,flick,tilt]=profile.prefs;
        el('detail').textContent='Attack '+controls.keyName(profile.keyboard.attack)+' / '+(game.padNames?.(slot) || controls.buttons)[profile.pad.attack]+
          ' · '+(quick?'Attack on press':'Hold Attack to smash')+' · Flick jump '+(flick?'on':'off')+' · '+(tilt?'Tilt stick':'Smash stick')+
          (profile.rumble===undefined?'':' · Rumble '+['off','light','full'][profile.rumble]);
        el('use').onclick=()=>use(profile,true);
        el('delete').onclick=()=>{pending={type:'delete',profile};draw();};
      }
      let suggested=active || 'Player '+(slot+1);
      if(!active)for(let i=2;profiles.some(p=>keyFor(p.name)===keyFor(suggested));i++)suggested='Player '+(slot+1)+'-'+i;
      el('name').value=suggested;
      el('save').onclick=()=>{
        const name=cleanName(el('name').value);
        if(!name){el('status').textContent='Enter a player name.';focus('name');return;}
        const p=capture(game.layout(),slot,game.prefs(slot),name);
        if(game.rumble)p.rumble=game.rumble(slot);
        if(library(game.storage).some(old=>keyFor(old.name)===keyFor(name))){pending={type:'replace',profile:p};draw();}
        else saveProfile(p);
      };
      el('edit').onclick=()=>game.edit(slot);
      focus(el(target)?target:'name');
    }
    function saveProfile(profile){
      const stored=write(game.storage,profile.name,profile);
      const active=game.apply(slot,game.layout(),game.prefs(slot),profile.name,false);
      pending=null;selected=profile.name;
      draw(stored && active?'Controls saved for '+selected+'.':'Controls saved for this visit.','use');
    }
    function use(profile,keyboard,confirmed){
      const {next,changed}=preview(game.layout(),slot,profile,keyboard);
      if(changed.length && JSON.stringify(changed)!==JSON.stringify(confirmed)){
        pending={type:'apply',profile,changed};draw();return;
      }
      const stored=game.apply(slot,next,profile.prefs,profile.name,!!changed.length,profile.rumble);
      pending=null;
      draw(profile.name+' applied to P'+(slot+1)+(stored?'':' for this visit')+'.'+(keyboard?'':' Both keyboards kept their keys.'),'back');
    }
    draw();
  }
  window.PlayerProfiles={open,capture,preview,valid,library,write};
})();
