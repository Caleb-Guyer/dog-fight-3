(() => {
  'use strict';
  // Duration in milliseconds, then the low- and high-frequency motor strengths.
  const cues={
    strike:[32,.10,.48], hurt:[56,.46,.26], launch:[95,.84,.44],
    block:[35,.22,.16], parry:[58,.08,.92], knockout:[145,.94,.22]
  };
  const active=new Map();
  function actuator(pad){
    const motor=pad?.vibrationActuator;
    return pad?.connected!==false && typeof motor?.playEffect==='function' &&
      (!motor.effects || motor.effects.includes('dual-rumble')) ? motor : null;
  }
  function stop(){
    for(const motor of active.keys()){
      try{Promise.resolve(motor.reset?.()).catch(()=>{});}catch{}
    }
    active.clear();
  }
  function pulse(pad,level,effect,force=false){
    const motor=actuator(pad);
    if(!motor || !level || document.hidden)return;
    const [duration,strong,weak]=cues[effect],power=Math.max(strong,weak),now=performance.now();
    const current=active.get(motor);
    if(!force && current?.until>now && current.power>power)return;
    const token={power,until:now+duration},gain=level===2?1:.48;
    active.set(motor,token);
    const clear=()=>{if(active.get(motor)===token)active.delete(motor);};
    try{
      return Promise.resolve(motor.playEffect('dual-rumble',{duration,startDelay:0,
        strongMagnitude:strong*gain,weakMagnitude:weak*gain})).then(()=>true,()=>false).finally(clear);
    }catch{clear();return Promise.resolve(false);}
  }
  function contact(name,e,battle,trial,onlineSide,padFor,levels){
    if(!['hit','block','parry','ko'].includes(name) || !battle || battle.lesson?.example)return;
    const paired=trial?!!trial.seats:onlineSide==null && battle.hasSecondPlayer && !battle.lesson;
    const mine=trial?.slot ?? onlineSide ?? battle.trainingPlayerSlot ?? 0;
    function play(slot,cue){
      if(battle.team)slot=battle.team.findIndex(f=>f.index===slot);
      if(slot!==0 && slot!==1)return;
      const seat=paired?slot:slot===mine?0:-1;
      if(seat>=0 && levels[seat])pulse(padFor(seat),levels[seat],cue);
    }
    const target=e.f?.index,attacker=e.owner?.index;
    const heavy=name==='hit' && (e.emphatic || e.meteor || e.damage>=15);
    play(target,name==='ko'?'knockout':name==='hit'?(heavy?'launch':'hurt'):name);
    if(name==='hit' && attacker!==target)play(attacker,heavy?'hurt':'strike');
  }
  function panel({showDialog,slot,padFor,levels,save,back}){
    showDialog('rumble','Controller rumble',
      '<div class="dialog-actions"><label>Player <select id="rumble-seat"><option value="0">P1</option><option value="1">P2</option></select></label>'+
      '<label>Strength <select id="rumble-level"><option value="0">Off</option><option value="1">Light</option><option value="2">Full</option></select></label></div>'+
      '<p id="rumble-device"></p><div class="dialog-actions" role="group" aria-label="Try an impact">'+
      Object.entries({strike:'Land a jab',hurt:'Take a hit',launch:'Heavy launch',block:'Block',parry:'Parry',knockout:'Lose a stock'}).map(
        ([key,label])=>'<button class="utility" data-pulse="'+key+'">'+label+'</button>').join('')+
      '</div><p id="rumble-result" role="status"></p><button class="utility" id="rumble-back">Back</button>');
    const el=id=>document.getElementById('rumble-'+id),seat=el('seat'),level=el('level'),device=el('device'),result=el('result');
    const samples=Array.from(document.querySelectorAll('[data-pulse]'));
    let last,revision=0;
    const refresh=()=>{
      const i=Number(seat.value),pad=padFor(i),available=!!actuator(pad);
      const strength=levels()[i];
      if(last && last.i===i && last.strength===strength && last.index===pad?.index && last.id===pad?.id && last.available===available)return;
      last={i,strength,index:pad?.index,id:pad?.id,available};
      revision++;level.value=String(strength);result.textContent='';
      device.textContent=!pad?'Connect a controller and press a button.':!available?
        'Rumble is unavailable for '+pad.id+' in this browser.':pad.id+(strength?' · Choose an impact to feel it.':' · Rumble is off.');
      for(const b of samples)b.disabled=!available || !strength;
    };
    seat.value=String(slot);seat.onchange=()=>{stop();refresh();};
    level.onchange=()=>{stop();const stored=save(Number(seat.value),Number(level.value));refresh();if(!stored)result.textContent='Strength changed for this visit.';};
    for(const b of samples)b.onclick=async()=>{
      const version=++revision,i=Number(seat.value);
      const played=await pulse(padFor(i),levels()[i],b.dataset.pulse,true);
      if(result.isConnected && version===revision)result.textContent=played?b.textContent+' · Pulse sent.':'The controller could not play this pulse.';
    };
    el('back').onclick=back;refresh();seat.focus();
    return refresh;
  }
  window.PadFeedback={contact,panel,stop};
})();
