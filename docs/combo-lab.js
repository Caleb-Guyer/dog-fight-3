(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const {moves,specials,smashes,grabs,throws,pummels}=window.DogFight;
  const tenth=n=>Number(n.toFixed(1));
  const comboSources = { example:'Dog’s combo', late:'Late jab', record:'Your take', replay:'Your take',
    flurry:'Pip’s rapid jab', escapeFlurry:'Escape the flurry',
    defend:'Defend this take', mix:'Mix A and B',throwChase:'Chase the up throw',confirm:'Hit confirm' };
  const comboReplies = { stand: 'Standing', guard: 'Guard', away: 'Flick away', punish:'Block and punish', p2:'Player 2',
    diIn:'Launch DI in',diOut:'Launch DI out',diMix:'Mix launch DI' };
  const takeLetter = slot => slot ? 'B' : 'A';
  function takeName(world,slot) {
    return takeLetter(slot) + ' · ' + (world.comboTakes[slot]?.length ? 'Your recording' : slot ? 'Landing grab' : 'Falling aerial');
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
    const title = ['flurry','escapeFlurry','throwChase'].includes(d.source) ? comboSources[d.source] : d.defending ? (d.phase === 'done' ? 'Take ' + takeName(world,d.playSlot) :
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
    $('combo-latest').textContent = latest;
    const prior = d.prior;
    $('combo-previous').hidden = d.source==='confirm'?d.series.played!==6:!prior;
    if(d.source==='confirm' && d.series.played===6)$('combo-previous').textContent='Hits confirmed '+d.series.confirmed+'/3 · Shields grabbed '+d.series.caught+'/3';
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
    $('combo-restore').hidden = !d.saved?.length;
    for (const [i,option] of Array.from($('combo-slot').options).entries()){
      const label=takeName(world,i);if(option.textContent!==label)option.textContent=label;
    }
  }
  function setup(world){
    const d = world.comboPractice;
    $('combo-reply').value = d.reply;
    $('combo-fight-pip').hidden = d.source !== 'flurry' && d.source !== 'escapeFlurry';
    $('combo-slot').value = String(d.slot);
    $('combo-reply-label').hidden = $('combo-reply').hidden = d.defending || d.source==='confirm';
    $('combo-slow').setAttribute('aria-pressed', String(d.slow));
    for (const source of Object.keys(comboSources))
      $('combo-' + source).setAttribute('aria-pressed', String(d.source === source));
    const route = { pip: 'Attack, Attack, then Jump + Forward + Attack.', brisket: 'Attack, then Grab. Tap forward to throw.',
      noodle: 'Attack twice, then tap neutral Special.', clover: 'Attack twice, then Jump + Attack.' }[world.dogs[0].kind];
    return d.source==='confirm'?'Six jabs, three shields. Tap Attack and release. On a hit, follow with Attack. On a shield flash, step in and Grab. Tap Attack after each result for the next exchange.':
      d.source==='throwChase'?'Tap Attack for the opening grab and up throw. You take over on release. Follow the rival and hit them before they land. Tap Attack after the result to retry.':
      d.source === 'flurry' ? 'Tap Attack once. When Quick Paw hits, press Attack again and hold through Cross. Release during Speed Bag for Bell Kick. Try Flick away as the rival’s response.'
      : d.source === 'escapeFlurry' ? 'You control ' + world.dogs[1].stats.name + '. Tap Attack to start. Let Pip hit you once, then flick away during the spark. Re-center between hits to shift again.'
      : d.defending ? 'You control ' + world.dogs[1].stats.name + '. Tap Attack to start. ' +
      (d.source === 'mix' ? 'Each try picks either take. Watch the rival and choose your response.' :
        world.comboTakes[d.slot]?.length ? 'Try shielding, escaping or hitting back against your recording.' :
        d.slot ? 'Hold Shield once. On the next try, spot-dodge just before the rival lands and punish the missed grab.' :
        'Hold Shield through the falling aerial, then try punishing the landing.') :
      d.reply === 'p2' ? 'P2 plays the defender live. Record P1’s opening, then replay it to try a different response.' :
      d.reply === 'punish' ? 'The rival holds Shield. Try a side smash up close, then try hitting at the tip. Watch for the counter after a blocked smash or landing.' :
      d.source === 'record' ? 'Take ' + takeLetter(d.slot) + ' records 2½ seconds from your first input. ' + route :
      d.source === 'late' ? 'The second jab is delayed. Change the rival’s reply to see who can use the opening.' :
      d.source === 'replay' ? 'Replaying your inputs. Change the rival’s reply to compare.' : route + ' Change the rival’s reply to test the same inputs.';
  }
  window.ComboLab={readout,setup,startConfirm,confirmInput,confirmContact,finishConfirm};
})();
