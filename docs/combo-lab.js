(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const {moves,specials,smashes,grabs,throws,pummels}=window.DogFight;
  const tenth=n=>Number(n.toFixed(1));
  const comboSources = { example:'Dog’s combo', late:'Late jab', record:'Your take', replay:'Your take',
    flurry:'Pip’s rapid jab', escapeFlurry:'Escape the flurry',
    defend:'Defend this take', mix:'Mix A and B',throwChase:'Chase the up throw',confirm:'Hit confirm',dashPressure:'Dash attack spacing' };
  const comboReplies = { stand: 'Standing', guard: 'Guard', away: 'Flick away', punish:'Block and punish', p2:'Player 2',
    diIn:'Launch DI in',diOut:'Launch DI out',diMix:'Mix launch DI',jumpAway:'Jump away',strike:'Attack back',player:'Live defense' };
  const takeLetter = slot => slot ? 'B' : 'A';
  const openedTakes=new WeakSet();
  function takeName(world,slot) {
    const take=world.comboTakes[slot];
    return takeLetter(slot) + ' · ' + (openedTakes.has(take)?'Tape recording':take?.length?'Your recording':slot?'Landing grab':'Falling aerial');
  }
  function comboMoveName(moveId) {
    return (moves[moveId] || specials[moveId] || smashes[moveId] || grabs[moveId] ||
      throws[moveId] || pummels[moveId])?.label || moveId || 'Hit';
  }
  function comboRow(contact) {
    const { moveId, kind, gap } = contact;
    const name = comboMoveName(moveId);
    const result = kind === 'parry' ? 'parried' : kind === 'block' ? 'blocked' : kind === 'grab' ? 'caught' : tenth(contact.damage) + '%';
    const timing = gap === null ? 'opener' : gap ? gap + 'f opening' :
      kind === 'pummel' || kind === 'throw' ? 'held' : 'no free frame';
    return name + ' · ' + result + ' · ' + timing;
  }
  const compareSources=['late','example','replay','record'];
  function* compareReplies(world){
    const d=world.comboPractice,source=d.source==='record'?'replay':d.source;
    if(!compareSources.includes(source) || (source==='replay' && !d.saved?.length))return;
    // Each reply runs on its own copy. The active take, moving platforms and both players stay parked.
    const tape=new window.DogFight.FinishTape();
    for(const reply of ['stand','guard','away','jumpAway','strike']){
      const sample=tape.copy(world);
      sample.resetComboPractice(source,reply,d.slow,d.slot);
      const attempt=sample.comboPractice;
      let jumpedAt=null,counterAt=null;
      sample.emit=(name,e)=>{if(name==='jump' && e.f?.index===1)jumpedAt??=attempt.hits;};
      while(attempt.phase!=='done' && sample.end===null){
        for(let i=0;i<16 && attempt.phase!=='done' && sample.end===null;i++){
          sample.step(1/60);
          if(attempt.counter)counterAt??=attempt.hits;
        }
        yield null;
      }
      const blocks=attempt.contacts.filter(c=>c.kind==='block').length;
      const outcome=attempt.counter?comboMoveName(attempt.counter.moveId)+' after hit '+counterAt:
        blocks?blocks+(blocks===1?' block':' blocks'):attempt.dodges?'Air dodged':attempt.shifts?'Shifted away':jumpedAt!==null?'Jump after hit '+jumpedAt:'';
      const gap=attempt.contacts.find(c=>c.gap>0);
      const opening=attempt.contacts.length<2?'':gap?gap.gap+'-frame opening before '+comboMoveName(gap.moveId)+'.':
        'No free frame between recorded contacts.';
      yield {reply,hits:attempt.hits,damage:tenth(attempt.damage),outcome,opening};
    }
  }
  function compareSheet(world,showDialog,watch,back){
    const d=world.comboPractice,source=d.source==='record'?'replay':d.source;
    const attacker=world.dogs[0].stats.name,defender=world.dogs[1].stats.name;
    const take=source==='replay'?'Take '+takeLetter(d.slot):comboSources[source];
    showDialog('combo-compare','Compare defenses','<p>'+attacker+' against '+defender+' at '+tenth(d.baseline)+'% · '+take+
      '. Choose a response to watch the same opening.</p><table class="reply-table"><thead><tr><th>Response</th><th>Hits taken</th><th>Damage</th><th>Reply</th></tr></thead>'+
      '<tbody id="reply-rows"></tbody></table><p id="reply-opening" hidden></p><p role="status" id="reply-status">Trying five defenses…</p><div class="dialog-actions">'+
      '<button class="primary" id="reply-play">Play as '+defender+'</button><button class="utility" id="reply-back">Back to practice</button></div>');
    const rows=$('reply-rows'),tests=compareReplies(world);
    $('reply-back').onclick=back;
    $('reply-play').onclick=()=>watch(source,'player',d.slot);
    $('reply-play').focus();
    function advance(){
      if(!rows.isConnected || !rows.closest('dialog').open)return;
      const until=performance.now()+4;
      for(let i=0;i<4;i++){
        const {done,value}=tests.next();
        if(done){$('reply-status').hidden=true;return;}
        if(value){
          const row=rows.insertRow(),button=document.createElement('button');
          button.type='button';button.className='utility';button.dataset.reply=value.reply;button.textContent=comboReplies[value.reply];
          button.onclick=()=>watch(source,value.reply,d.slot);
          row.insertCell().append(button);
          for(const v of [value.hits,value.damage+'%',value.outcome || '—'])row.insertCell().textContent=v;
          if(value.reply==='stand' && value.opening){
            $('reply-opening').textContent='Standing defender · '+value.opening;$('reply-opening').hidden=false;
          }
        }
        if(performance.now()>=until)break;
      }
      requestAnimationFrame(advance);
    }
    advance();
  }
  function startConfirm(world,series){
    if(!series || series.played===series.responses.length){
      const responses=[false,false,false,true,true,true];
      for(let i=responses.length-1;i>0;i--){
        const j=Math.floor(world.random()*(i+1));
        [responses[i],responses[j]]=[responses[j],responses[i]];
      }
      series={responses,played:0,correct:0,confirmed:0,caught:0};
    }
    const d=world.comboPractice;
    Object.assign(d,{series,guard:series.responses[series.played],reply:'stand',phase:'ready',baseline:0});
    world.dogs[1].damage=0;
  }
  function finishConfirm(d,result,correct=false){
    if(d.phase==='done')return;
    d.outcome=result;d.phase='done';
    d.series.played++;
    if(correct){d.series.correct++;d.series[d.opening==='hit'?'confirmed':'caught']++;}
  }
  function confirmInput(world,input){
    const d=world.comboPractice;
    const attack=input.tapped?.attack || input.attack && !d.heldAttack;
    const grab=input.tapped?.grab || input.grab && !d.heldGrab;
    d.heldAttack=!!input.attack;d.heldGrab=!!input.grab;
    if(d.phase==='ready'){
      if(!attack)return null;
      d.phase='active';
    }else if(attack || grab){
      if(!d.opening)finishConfirm(d,'Wait for the first jab to connect before choosing.');
      else if(grab && d.opening==='hit')finishConfirm(d,'Your jab landed. Tap Attack to follow the hit.');
      else if(attack && d.opening==='block')finishConfirm(d,'Your jab hit the shield. Step in and grab.');
      else d.answer=true;
    }
    if(++d.tick>(d.openedAt || 0)+100)
      finishConfirm(d,d.opening==='block'?'The shield held. Close the gap before grabbing.':
        d.opening==='hit'?'The follow-up missed. Stay within striking distance.':'The jab missed. Face the rival and tap Attack.');
    return d.phase==='done'?null:input;
  }
  function confirmContact(world,kind,moveId){
    const d=world.comboPractice;
    if(!d.opening){
      if(moveId!==world.dogs[0].kit.ground[0] || !['hit','block'].includes(kind))
        return finishConfirm(d,'Open with a neutral jab. Center your direction and tap Attack.');
      d.opening=kind;d.openedAt=d.tick;
    }else if(d.answer && (d.opening==='hit' && kind==='hit' || d.opening==='block' && kind==='grab')){
      finishConfirm(d,kind==='grab'?'Caught the shield.':comboMoveName(moveId)+' followed the hit.',true);
    }else{
      finishConfirm(d,'Release Attack after the jab. Choose your next move when it connects.');
    }
  }
  let listedContacts,listedCount=0;
  function readout(world) {
    const d=world.comboPractice;
    const title = d.liveReply?'Defend · '+(d.source==='replay'?'Take '+takeLetter(d.slot):comboSources[d.source]) : ['flurry','escapeFlurry','throwChase','dashPressure'].includes(d.source) ? comboSources[d.source] : d.defending ? (d.phase === 'done' ? 'Take ' + takeName(world,d.playSlot) :
      d.source === 'mix' ? 'Mix A and B' : 'Defend ' + takeName(world,d.slot)) :
      d.phase === 'ready' ? 'Ready to record' : d.source === 'record' && d.phase === 'active' && d.tick < 150
      ? 'Recording' : comboSources[d.source];
    $('combo-summary').textContent = title + (d.defending ? ' · Took ' : ' · ') + d.hits +
      (d.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(d.damage) + '%';
    const last = d.contacts.at(-1);
    const response = [d.shifts ? d.shifts + (d.shifts === 1 ? ' shift' : ' shifts') : '',
      d.dodges ? d.dodges + (d.dodges === 1 ? ' air dodge' : ' air dodges') : ''].filter(Boolean).join(' · ');
    let latest = last ? comboRow(last) + (response ? ' · ' + response : '') :
      d.phase === 'done' ? 'No contact' : d.phase === 'ready' ? 'Move or attack to start.' : 'Waiting for contact';
    if (d.source === 'flurry' && d.phase !== 'done') {
      if (!last) latest = 'Tap Attack for Quick Paw.';
      else if (last.moveId === 'pipJab') latest += ' · Hold Attack now';
      else if (last.moveId === 'pipSpeedBag') latest += ' · Release for Bell Kick';
    }
    if (d.defending) {
      if (d.phase === 'ready') latest = 'You are ' + world.dogs[1].stats.name + ' · Tap Attack to start';
      else if (d.phase === 'countdown') latest = 'Get ready';
      else if (d.counter) latest = (last ? comboRow(last) + ' · ' : '') + 'Your ' + comboMoveName(d.counter.moveId) + ' connected';
      if (d.phase === 'done') latest += ' · Tap Attack to retry';
    } else if(d.reply==='strike' && d.counter){
      latest+=' · '+world.dogs[1].stats.name+' hit back with '+comboMoveName(d.counter.moveId);
    } else if (d.reply === 'punish') {
      if (d.counter) latest += ' · ' + world.dogs[1].stats.name + ' punished with ' + comboMoveName(d.counter.moveId);
      else if (d.phase === 'done' && d.contacts.some(c => c.kind === 'block')) latest += ' · No punish landed';
    } else if (d.reply === 'p2') {
      if (d.phase === 'ready') latest = 'P1 moves to start recording. P2 controls ' + world.dogs[1].stats.name + '.';
      if (d.counter) latest += ' · P2 answered with ' + comboMoveName(d.counter.moveId);
    }
    if(d.source==='throwChase'){
      latest=d.phase==='ready'?'Tap Attack to start the up throw.':d.outcome==='caught'?'Caught with '+comboMoveName(d.followup):
        d.outcome==='landed'?'Rival landed before the follow-up.':d.outcome==='ringOut'?'Ring-out.':
        d.phase==='done'?'Time up.':d.thrown?'Chase the rival before they land.':'Grab into up throw';
    }
    if(d.launchRead)latest+=' · Rival steered '+d.launchRead;
    else if(d.outcome==='landed' && d.reply.startsWith('di'))latest+=' · No tumble. Raise dummy damage to practice DI.';
    if(d.source==='throwChase' && d.phase==='done')latest+=' · Tap Attack to retry';
    if(d.source==='confirm'){
      const s=d.series,complete=s.played===s.responses.length;
      $('combo-summary').textContent='Hit confirm · '+(complete?'Set complete':'Exchange '+(s.played+(d.phase==='done'?0:1))+' of 6')+
        (s.played?' · '+s.correct+'/'+s.played+' correct':'');
      latest=d.phase==='done'?d.outcome+(complete?' Tap Attack for a new set.':' Tap Attack for the next jab.'):
        d.opening==='block'?'Shield! Step in and grab.':d.opening==='hit'?'Hit! Tap Attack again.':'Center your direction and tap Attack.';
    }
    if(d.source==='dashPressure'){
      if(d.phase==='ready')latest='Attack now, or run closer first.';
      if(d.window)latest+=' · '+d.window.frames+'f recovery · '+d.window.gap+' px apart';
      if(d.phase==='done')latest+=' · Tap Attack to retry';
    }
    $('combo-latest').textContent = latest;
    const prior = d.prior;
    $('combo-previous').hidden = d.source==='confirm'?d.series.played!==6:!prior;
    if(d.source==='confirm' && d.series.played===6)$('combo-previous').textContent='Hits confirmed '+d.series.confirmed+'/3 · Shields grabbed '+d.series.caught+'/3';
    else if(prior?.source==='dashPressure' && prior.window)$('combo-previous').textContent='Previous dash · '+prior.window.gap+' px apart · '+
      (prior.counter?comboMoveName(prior.counter):'No punish landed');
    else if (prior) $('combo-previous').textContent = 'Previous · ' + (['mix','defend'].includes(prior.source) ?
      'Defended take ' + takeLetter(prior.slot) : comboSources[prior.source] + ' · ' + comboReplies[prior.reply]) +
      ' at ' + prior.baseline + '% · ' + prior.hits + (prior.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(prior.damage) + '%';
    $('combo-history').hidden = !last;
    const list=$('combo-list');
    if(listedContacts!==d.contacts || listedCount>d.contacts.length){
      listedContacts=d.contacts;listedCount=0;list.replaceChildren();
    }
    while(listedCount<d.contacts.length){
      const row = document.createElement('li');
      row.textContent = comboRow(d.contacts[listedCount++]);
      list.append(row);
    }
    $('combo-replay').disabled = !d.saved?.length;
    $('combo-compare').disabled=d.source==='record' && !d.saved?.length;
    $('combo-reply').querySelector('[value=player]').disabled=!compareSources.includes(d.source) || $('combo-compare').disabled;
    $('combo-restore').hidden = !d.saved?.length;
    for (const [i,option] of Array.from($('combo-slot').options).entries()){
      const label=takeName(world,i);if(option.textContent!==label)option.textContent=label;
    }
  }
  function bindControls(drill,getWorld){
    $('combo-slot').onchange = e => {
      const world=getWorld(), d=world.comboPractice, slot=Number(e.target.value);
      drill('combo',false,d.source==='record'?'record':d.source==='replay' && world.comboTakes[slot]?'replay':'defend',d.reply,slot);
    };
    $('combo-restore').onclick = () => {
      const world=getWorld(), d=world.comboPractice;
      world.comboTakes[d.slot]=null;
      drill('combo',false,'defend',d.reply,d.slot);
    };
    $('combo-reply').onchange = e => {
      const d=getWorld().comboPractice;
      const recorded=d.source==='record' && (d.tape.length || (e.target.value==='player' && d.saved?.length));
      drill('combo',false,recorded?'replay':d.source,e.target.value);
      if(!['p2','player'].includes(e.target.value) && d.source!=='throwChase')e.target.focus({preventScroll:true});
    };
    $('combo-slow').onclick = () => {
      const d=getWorld().comboPractice;
      d.slow=!d.slow;
      $('combo-slow').setAttribute('aria-pressed',String(d.slow));
      $('game').focus({preventScroll:true});
    };
  }
  function setup(world,drill,getWorld){
    if(!$('combo-slot').onchange && drill)bindControls(drill,getWorld);
    const d = world.comboPractice;
    $('combo-reply').value = d.reply;
    $('combo-fight-pip').hidden = d.source !== 'flurry' && d.source !== 'escapeFlurry';
    $('dash-pressure-fight').hidden=d.source!=='dashPressure';
    $('combo-slot').value = String(d.slot);
    $('combo-compare').hidden=!compareSources.includes(d.source);
    $('combo-reply-label').hidden = $('combo-reply').hidden = (d.defending && !d.liveReply) || d.source==='confirm' || d.source==='dashPressure';
    $('combo-slow').setAttribute('aria-pressed', String(d.slow));
    for (const source of Object.keys(comboSources))
      $('combo-' + source).setAttribute('aria-pressed', String(d.source === source));
    const route = { pip: 'Attack, Attack, then Jump + Forward + Attack.', brisket: 'Attack, then Grab. Tap forward to throw.',
      noodle: 'Attack twice, then tap neutral Special.', clover: 'Attack twice, then Jump + Attack.' }[world.dogs[0].kind];
    return d.liveReply?'Use your usual controls for '+world.dogs[1].stats.name+'. Tap Attack to start, release, then defend the opening. Tap Attack after the result to retry.':
      d.source==='dashPressure'?'Start in a run toward '+world.dogs[1].stats.name+'’s shield. Tap Attack now, then try running closer first. Compare the distance and recovery left when the rival checks for a counter.':
      d.source==='confirm'?'Six jabs, three shields. Tap Attack and release. On a hit, follow with Attack. On a shield flash, step in and Grab. Tap Attack after each result for the next exchange.':
      d.source==='throwChase'?'Tap Attack for the opening grab and up throw. You take over on release. Follow the rival and hit them before they land. Tap Attack after the result to retry.':
      d.source === 'flurry' ? 'Tap Attack once. When Quick Paw hits, press Attack again and hold through Cross. Release during Speed Bag for Bell Kick. Try Flick away as the rival’s response.'
      : d.source === 'escapeFlurry' ? 'You control ' + world.dogs[1].stats.name + '. Tap Attack to start. Let Pip hit you once, then flick away during the spark. Re-center between hits to shift again.'
      : d.defending ? 'You control ' + world.dogs[1].stats.name + '. Tap Attack to start. ' +
      (d.source === 'mix' ? 'Each try picks either take. Watch the rival and choose your response.' :
        world.comboTakes[d.slot]?.length ? 'Try shielding, escaping or hitting back against the recording.' :
        d.slot ? 'Hold Shield once. On the next try, spot-dodge just before the rival lands and punish the missed grab.' :
        'Hold Shield through the falling aerial, then try punishing the landing.') :
      d.reply === 'p2' ? 'P2 plays the defender live. Record P1’s opening, then replay it to try a different response.' :
      d.reply === 'punish' ? 'The rival holds Shield. Try a side smash up close, then try hitting at the tip. Watch for the counter after a blocked smash or landing.' :
      d.source === 'record' ? 'Take ' + takeLetter(d.slot) + ' records 2½ seconds from your first input. ' + route :
      d.source === 'late' ? 'The second jab is delayed. Change the rival’s reply to see who can use the opening.' :
      d.source === 'replay' ? 'Replaying your inputs. Change the rival’s reply to compare.' : route + ' Change the rival’s reply to test the same inputs.';
  }
  // Version 1 stores logical inputs after bindings and stick processing. A missing
  // secondary axis is distinct from zero because the fighter falls back to the main stick.
  const buttons=['jump','shortHop','attack','smash','aimStick','special','shield','grab','tiltMode','quickAttack'];
  const axes=['x','y','grabX','airDodgeX','airDodgeY','smashX','smashY'];
  const {fighters,arenas,idleInput}=window.DogFight;
  const prefix='#training/tapes/', storePrefix='df3.practice-tape.v1.';
  function mask(input){
    return buttons.reduce((bits,key,i)=>input?.[key]?bits|(1<<i):bits,0);
  }
  function packTake(take){
    if(!take?.length)return null;
    const runs=[];
    let previous;
    for(const frame of take){
      const state=[mask(frame) | (frame.lightShield && frame.shield?1<<buttons.length:0),mask(frame.tapped),...axes.map(key=>frame[key]??null)];
      while(state.length>2 && state.at(-1)===null)state.pop();
      const signature=JSON.stringify(state);
      if(signature===previous)runs.at(-1)[0]++;
      else runs.push([1,...state]);
      previous=signature;
    }
    return runs;
  }
  const integer=(value,min,max)=>Number.isInteger(value) && value>=min && value<=max;
  function unpackTake(runs,lightGuard){
    if(runs===null)return null;
    if(!Array.isArray(runs) || !integer(runs.length,1,150))throw Error('Take length');
    const frames=[];
    for(const row of runs){
      if(!Array.isArray(row) || !integer(row.length,3,3+axes.length))throw Error('Input fields');
      const [count,held,pressed,...analog]=row;
      if(!integer(count,1,150-frames.length) || !integer(held,0,(1<<(buttons.length+Number(lightGuard)))-1) ||
          !integer(pressed,0,(1<<buttons.length)-1))throw Error('Input timing');
      const frame={...idleInput,tapped:{}};
      buttons.forEach((key,i)=>{
        if(held&(1<<i))frame[key]=true;
        if(pressed&(1<<i))frame.tapped[key]=true;
      });
      if(frame.shield && (held & (1<<buttons.length)))frame.lightShield=true;
      analog.forEach((value,i)=>{
        if(value===null)return;
        if(!Number.isFinite(value) || Math.abs(value)>1)throw Error('Stick position');
        frame[axes[i]]=value;
      });
      for(let i=0;i<count;i++)frames.push(frame);
    }
    return frames;
  }
  function encode(card){
    const {config:c}=card;
    const data=[1,card.name,c.p1,c.p2,c.stage,c.coats,c.shieldPogo,card.damage,card.time,card.slow,card.takes.map(packTake)];
    if(c.impactTech){data[0]=7;data.push(!!c.aimedDrive,!!c.groundSpace,!!c.wallSpring,!!c.risingCatch);}
    else if(c.risingCatch){data[0]=5;data.push(!!c.aimedDrive,!!c.groundSpace,!!c.wallSpring);}
    else if(c.wallSpring){data[0]=4;data.push(!!c.aimedDrive,!!c.groundSpace);}
    else if(c.groundSpace){data[0]=3;data.push(!!c.aimedDrive);}
    else if(c.aimedDrive){data[0]=2;data.push(true);}
    // Strength is an input. Keep the original simulation version inside the extended input format.
    if(card.takes.some(t=>t?.some(f=>f.lightShield && f.shield)))data.unshift(6);
    const bytes=new TextEncoder().encode(JSON.stringify(data));
    return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  }
  function decode(code){
    try{
      if(typeof code!=='string' || code.length>96000 || !/^[A-Za-z0-9_-]+$/.test(code))return null;
      const text=atob(code.replaceAll('-','+').replaceAll('_','/'));
      const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(text,c=>c.charCodeAt(0))));
      const lightGuard=Array.isArray(data) && data[0]===6;
      if(lightGuard)data.shift();
      if(!Array.isArray(data) || !(data[0]===1 && data.length===11 || data[0]===2 && data.length===12 && data[11]===true ||
        data[0]===3 && data.length===12 && typeof data[11]==='boolean' ||
        (data[0]===4 && data.length===13 || data[0]===5 && data.length===14 || data[0]===7 && data.length===15) && data.slice(11).every(v=>typeof v==='boolean')))return null;
      const [version,name,p1,p2,stage,coats,shieldPogo,damage,time,slow,takes]=data;
      if(typeof name!=='string' || !name.trim() || name.length>48 ||
        ![p1,p2].every(id=>typeof id==='string' && Object.hasOwn(fighters,id)) || typeof stage!=='string' || !Object.hasOwn(arenas,stage) ||
        !Array.isArray(coats) || coats.length!==2 || !coats.every(n=>integer(n,0,3)) ||
        typeof shieldPogo!=='boolean' || typeof slow!=='boolean' || !Number.isFinite(damage) || damage<0 || damage>200 ||
        !Number.isFinite(time) || time<0 || time>1e9 || !Array.isArray(takes) || takes.length!==2)return null;
      const config={p1,p2,stage,coats,shieldPogo};
      if([p1,p2].includes('clover'))config.aimedDrive=!!data[11];
      if(version===3 || version>=4 && data[12])config.groundSpace=true;
      if(version===4 || version>=5 && data[13])config.wallSpring=true;
      if(version===5 || version===7 && data[14])config.risingCatch=true;
      if(version===7)config.impactTech=true;
      return {name,config,damage,time,slow,takes:takes.map(t=>unpackTake(t,lightGuard))};
    }catch{return null;}
  }
  function capture(world){
    const d=world.comboPractice, dogs=d?.originalDogs || world.dogs;
    const [p1,p2]=dogs.map(f=>f.kind);
    return {name:fighters[p1].name+' vs '+fighters[p2].name,config:{p1,p2,stage:world.stage,
      coats:[...world.coats],...(world.impactTech?{impactTech:true}:{}),...(world.risingCatch?{risingCatch:true}:{}),...(world.wallSpring?{wallSpring:true}:{}),shieldPogo:!!world.shieldPogo,...(world.groundSpace?{groundSpace:true}:{}),...([p1,p2].includes('clover')?{aimedDrive:!!world.aimedDrive}:{})},damage:world.trainingDamage,time:world.comboMarkTime??world.time,
      slow:d?.slow??true,takes:world.comboTakes || [null,null]};
  }
  function restore(world,card){
    world.setDummyDamage(card.damage);
    world.comboMarkTime=card.time;
    world.comboTakes=card.takes.slice();
    for(const take of world.comboTakes)if(take)openedTakes.add(take);
  }
  function houseTape(){
    const take=act=>Array.from({length:85},(_,i)=>({...idleInput,...act(i)}));
    return {name:'Brisket at the bell',config:{p1:'brisket',p2:'pip',stage:'bandstand',coats:[0,0],shieldPogo:true},
      damage:35,time:0,slow:false,takes:[
        take(i=>({shield:i<8,quickAttack:true,attack:i===18})),
        take(i=>({shield:i<8,grab:i===32,x:i===61?1:0}))
      ]};
  }
  function shelf(hash,world,showDialog,back,play){
    const shared=hash.startsWith(prefix), incoming=shared?decode(hash.slice(prefix.length)):null;
    const choices=[];
    if(incoming)choices.push({card:incoming,group:'Shared'});
    if(world?.comboTakes?.some(t=>t?.length))choices.push({card:capture(world),group:'In this match'});
    choices.push({card:houseTape(),group:'House tape'});
    try{
      for(const key of Object.keys(localStorage).filter(k=>k.startsWith(storePrefix)).sort().reverse()){
        const card=decode(localStorage.getItem(key));
        if(card)choices.push({card,group:'Saved',key});
      }
    }catch{}
    showDialog('practice-tapes','Practice tapes',
      '<label class="practice-search">Choose a tape<select id="tape-pick"></select></label><p id="tape-detail"></p>'+
      '<div class="dialog-actions"><button class="primary" id="tape-mix">Defend a blind mix</button>'+
      '<button class="utility" id="tape-a">Defend A</button><button class="utility" id="tape-b">Defend B</button>'+
      '<button class="utility" id="tape-record">Record your own A</button></div>'+
      '<label class="practice-search">Tape name<input id="tape-name" maxlength="48" autocomplete="off"></label>'+
      '<div class="dialog-actions"><button class="utility" id="tape-save">Save a copy</button>'+
      '<button class="utility" id="tape-link">Get playable link</button><button class="utility" id="tape-remove" hidden>Remove saved tape</button></div>'+
      '<input id="tape-url" aria-label="Playable tape link" readonly hidden><p role="status" id="tape-notice"></p>'+
      '<button class="utility" id="tape-back">Back</button>');
    const pick=$('tape-pick'),name=$('tape-name'),status=$('tape-notice'),url=$('tape-url');
    function select(index){
      pick.replaceChildren(...choices.map((entry,i)=>new Option(entry.group+' · '+entry.card.name,String(i))));
      pick.selectedIndex=index;
      const entry=choices[index], c=entry.card, config=c.config;
      name.value=c.name;url.hidden=true;status.textContent='';$('tape-remove').hidden=!entry.key;
      const take=slot=>c.takes[slot]?.length?c.takes[slot].length+' frames':slot?'Landing grab':'Falling aerial';
      $('tape-detail').textContent=fighters[config.p1].name+' attacks. You play '+fighters[config.p2].name+' at '+c.damage+'% on '+arenas[config.stage].name+
        '. A · '+take(0)+' / B · '+take(1)+'. '+(entry.group==='House tape'?'Watch Brisket lower his shield. Hold Shield against the jab, then try dodging the grab.':'Tap Attack when you’re ready for the exchange.');
    }
    const chosen=()=>choices[pick.selectedIndex].card;
    const named=()=>({...chosen(),name:name.value.trim() || chosen().name});
    pick.onchange=()=>select(pick.selectedIndex);
    for(const [id,source,slot] of [['tape-a','defend',0],['tape-b','defend',1],['tape-mix','mix',0],['tape-record','record',0]])
      $(id).onclick=()=>play(chosen(),source,slot);
    $('tape-save').onclick=()=>{
      const card=named(),code=encode(card);
      try{
        const existing=choices.findIndex(e=>e.key && localStorage.getItem(e.key)===code);
        if(existing>=0){select(existing);status.textContent='Already saved on this device.';return;}
        const key=storePrefix+Date.now()+'-'+crypto.randomUUID();
        localStorage.setItem(key,code);
        choices.push({card,group:'Saved',key});select(choices.length-1);
        status.textContent='Saved on this device.';
      }catch{status.textContent='Device storage is unavailable. Keep a playable link to reopen this tape.';}
    };
    $('tape-remove').onclick=()=>{
      const i=pick.selectedIndex;
      try{localStorage.removeItem(choices[i].key);choices.splice(i,1);select(0);status.textContent='Removed from this device.';}
      catch{status.textContent='Could not remove this tape from device storage.';}
    };
    $('tape-link').onclick=async()=>{
      const link=new URL(location.href);
      link.search='';link.hash=prefix+encode(named());
      url.value=link.href;url.hidden=false;url.focus();url.select();
      status.textContent='Copy this link to play both takes on another device.';
      try{await navigator.clipboard.writeText(link.href);if(!url.hidden && url.value===link.href)status.textContent='Playable link copied.';}catch{}
    };
    $('tape-back').onclick=back;
    select(0);
    if(shared && !incoming)status.textContent='This link could not be read. Choose a tape from the shelf.';
    pick.focus();
  }
  window.ComboLab={readout,setup,compareSheet,compareReplies,startConfirm,confirmInput,confirmContact,finishConfirm,shelf,encode,decode,capture,restore,houseTape};
})();
