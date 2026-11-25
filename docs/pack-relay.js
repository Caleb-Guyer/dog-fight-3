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
  window.PackRelay={openingTeams,pick,sheet};
})();
