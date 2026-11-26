(() => {
  'use strict';
  const {fighters,arenas,stageForms,cpuLevels,stockMinutes,validRelayTeams,relayCoats}=window.DogFight;
  const roster=Object.keys(fighters);
  function openingTeams(config,storage){
    let teams=config.relayTeams;
    if(!validRelayTeams(teams)){
      try{teams=JSON.parse(storage.getItem('dog-fight-3.relay.'+config.mode));}catch{}
    }
    if(validRelayTeams(teams))return teams.map(team=>team.slice());
    return [config.p1,config.p2].map((lead,i)=>{
      const order=i?roster.slice().reverse():roster;
      return [lead,...order.filter(kind=>kind!==lead)].slice(0,3);
    });
  }
  function pick(teams,seat,slot,kind){
    const team=teams[seat],prior=team.indexOf(kind);
    if(prior>=0)team[prior]=team[slot];
    team[slot]=kind;
  }
  function sheet(config,{storage,portrait,showDialog,root,start,back}){
    const teams=openingTeams(config,storage);
    const names=['P1',config.mode==='solo'?'CPU':'P2'];
    let seat=0,slot=0;
    const options=(items,current)=>Object.entries(items).map(([id,item])=>'<option value="'+id+'"'+
      (id===current?' selected':'')+'>'+item.name+'</option>').join('');
    showDialog('pack-relay','Pack Relay','<p>Choose three dogs in fight order. Each dog has one stock. A teammate enters at 0% after a knockout.</p>'+
      '<div id="relay-lineups"></div><h3 id="relay-pick-label"></h3><div class="cup-dogs" id="relay-roster" role="group" aria-labelledby="relay-pick-label"></div>'+
      '<div class="relay-settings"><label>Arena<select id="relay-stage">'+options(arenas,config.stage)+'</select></label>'+
      '<label>Stage form<select id="relay-form">'+options(stageForms,config.form)+'</select></label>'+
      '<label>Clock<select id="relay-clock">'+stockMinutes.map(n=>'<option value="'+n+'"'+(n===config.minutes?' selected':'')+'>'+
        (n?n+' min':'No clock')+'</option>').join('')+'</select></label>'+
      (config.mode==='solo'?'<label>CPU<select id="relay-cpu">'+options(cpuLevels,config.cpuLevel)+'</select></label>':'')+'</div>'+
      '<div class="dialog-actions"><button class="primary" id="relay-play">Start relay</button><button class="utility" id="relay-back">Back</button></div>');
    function draw(){
      const coats=relayCoats(teams,config.coatBook);
      root.querySelector('#relay-lineups').innerHTML=teams.map((team,i)=>'<div class="relay-row" role="group" aria-label="'+names[i]+' pack">'+
        '<b>'+names[i]+'</b>'+team.map((kind,k)=>'<button type="button" class="cup-dog" data-relay-seat="'+i+'" data-relay-slot="'+k+
          '" aria-pressed="'+(seat===i && slot===k)+'" aria-label="'+names[i]+', dog '+(k+1)+', '+fighters[kind].name+'">'+
          '<img alt="" src="'+portrait(kind,coats[i][k])+'"><strong>'+(k+1)+' · '+fighters[kind].name+'</strong></button>').join('')+'</div>').join('');
      root.querySelector('#relay-pick-label').textContent='Choose '+names[seat]+'’s '+['lead','second dog','anchor'][slot];
      root.querySelector('#relay-roster').innerHTML=roster.map(kind=>{
        const k=teams[seat].indexOf(kind), coat=k<0?config.coatBook?.[seat]?.[kind] || 0:coats[seat][k];
        return '<button type="button" class="cup-dog" data-relay-kind="'+kind+'" aria-pressed="'+(k===slot)+'"><img alt="" src="'+
          portrait(kind,coat)+'"><strong>'+fighters[kind].name+'</strong></button>';
      }).join('');
    }
    draw();
    root.querySelector('#relay-lineups').onclick=e=>{
      const b=e.target.closest('[data-relay-slot]');if(!b)return;
      seat=Number(b.dataset.relaySeat);slot=Number(b.dataset.relaySlot);draw();
      root.querySelector('[data-relay-kind][aria-pressed=true]').focus({preventScroll:true});
    };
    root.querySelector('#relay-roster').onclick=e=>{
      const b=e.target.closest('[data-relay-kind]');if(!b)return;
      pick(teams,seat,slot,b.dataset.relayKind);draw();
      root.querySelector('[data-relay-slot][aria-pressed=true]').focus({preventScroll:true});
    };
    root.querySelector('#relay-back').onclick=back;
    root.querySelector('#relay-play').onclick=()=>{
      try{storage.setItem('dog-fight-3.relay.'+config.mode,JSON.stringify(teams));}catch{}
      start({...config,p1:teams[0][0],p2:teams[1][0],relayTeams:teams,stage:root.querySelector('#relay-stage').value,
        form:root.querySelector('#relay-form').value,minutes:Number(root.querySelector('#relay-clock').value),
        cpuLevel:root.querySelector('#relay-cpu')?.value || config.cpuLevel});
    };
    root.querySelector('[data-relay-slot][aria-pressed=true]').focus({preventScroll:true});
  }
  function cupSheet(kind,round,coat,exhibition,{showDialog,root,portrait,drawStageTile,stageName,back,start}){
    const opening=window.YardCup.relay(kind,round),[allies,rivals]=opening.relayTeams;
    const coats=relayCoats(opening.relayTeams,[{[kind]:coat},{}]);
    let lead=kind;
    const face=(id,coat)=>'<img alt="" src="'+portrait(id,coat)+'"><strong>'+fighters[id].name+'</strong>';
    const venue=stageName(opening.stage,opening.form);
    showDialog('cup-relay',exhibition?'Relay exhibition':'Round '+(round+1)+' · Pack Relay',
      '<figure class="cup-relay-arena"><canvas width="320" height="180" aria-hidden="true"></canvas><figcaption>'+venue+'</figcaption></figure>'+
      '<p>Three dogs, one stock each. '+(exhibition?'Practice the round '+(round+1)+' detour from '+fighters[kind].name+'’s Cup. Earn its stamp during a scored run.':'Beat the Rival pack to stamp this stop on '+fighters[kind].name+'’s route.')+'</p>'+
      '<h3 id="cup-lead-label">Choose your lead</h3><div class="cup-relay-team" role="group" aria-labelledby="cup-lead-label">'+
      allies.map((id,i)=>'<button type="button" class="cup-dog" data-cup-lead="'+id+'" aria-pressed="'+(i===0)+'">'+face(id,coats[0][i])+'</button>').join('')+
      '</div><p id="cup-relay-order" aria-live="polite"></p><h3>Rival lineup</h3><ol class="cup-relay-team">'+
      rivals.map((id,i)=>'<li>'+face(id,coats[1][i])+'</li>').join('')+'</ol>'+
      '<div class="dialog-actions"><button id="cup-relay-start" class="primary">Start relay</button>'+
      '<button id="cup-relay-back" class="utility">Back</button></div>');
    drawStageTile(root.querySelector('canvas'),opening.stage,opening.form);
    const buttons=root.querySelectorAll('[data-cup-lead]');
    function select(id){
      lead=id;
      for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.cupLead===id));
      root.querySelector('#cup-relay-order').textContent='Fight order · '+window.YardCup.relay(kind,round,id).relayTeams[0].map(k=>fighters[k].name).join(' → ');
    }
    for(const b of buttons)b.onclick=()=>select(b.dataset.cupLead);
    root.querySelector('#cup-relay-start').onclick=()=>start(lead);
    root.querySelector('#cup-relay-back').onclick=back;
    select(lead);buttons[0].focus({preventScroll:true});
  }
  window.PackRelay={openingTeams,pick,sheet,cupSheet};
})();
