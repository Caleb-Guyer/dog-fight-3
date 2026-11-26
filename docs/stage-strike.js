(() => {
  'use strict';
  const {arenas,fighters,stageForms}=window.DogFight;
  const stages=Object.keys(arenas);
  const preferences={
    pip:['bandstand','laundry','picnic','canal','nightmail'],
    brisket:['nightmail','picnic','canal','bandstand','laundry'],
    noodle:['laundry','canal','picnic','bandstand','nightmail'],
    clover:['nightmail','canal','bandstand','picnic','laundry']
  };
  class Draft {
    constructor(first,picker=null){
      this.picker=picker;
      this.order=picker===null?[first,1-first,1-first,first]:[1-picker,1-picker,picker];
      this.moves=[];
    }
    get remaining(){return stages.filter(s=>!this.moves.some(m=>m.stage===s && m.action!=='pick'));}
    get turn(){return this.order[this.moves.length] ?? null;}
    get action(){return this.picker!==null && this.moves.length===2?'pick':this.picker===null?'strike':'ban';}
    get winner(){return this.turn!==null?null:this.picker===null?this.remaining[0]:this.moves.at(-1).stage;}
    take(slot,stage){
      if(this.turn===null || slot!==this.turn || !this.remaining.includes(stage))return false;
      this.moves.push({slot,stage,action:this.action});return true;
    }
    cpu(dogs,form,previous){
      if(this.turn!==1)return false;
      const value=stage=>{
        if(form!=='original')return stage===previous?-1:0;
        const rival=preferences[dogs[0]].indexOf(stage),mine=preferences[dogs[1]].indexOf(stage);
        return rival-mine*1.4+(stage===previous?-.6:0);
      };
      const choices=this.remaining.slice().sort((a,b)=>value(b)-value(a));
      return this.take(1,this.action==='pick'?choices[0]:choices.at(-1));
    }
  }
  const verbs={strike:'Strike',ban:'Ban',pick:'Pick'};
  function panel(root,{draft,dogs,form,game,solo,seats,keys,pads,drawStageTile,leave,start,sound,previous,padNames=(i,p)=>window.FightControls.padLegend(p)}){
    let current=draft.winner || draft.remaining[0],closed=false,cpuAt=null;
    const old=[null,null];let connected=pads;
    const player=i=>solo && i===1?'CPU '+fighters[dogs[i]].name:'P'+(i+1)+' '+fighters[dogs[i]].name;
    root.innerHTML='<h3 id="strike-turn" class="card-stage" aria-live="polite"></h3><p id="strike-rules"></p>'+
      '<div id="strike-stages" role="group" aria-label="Arenas">'+stages.map(s=>'<button class="utility" type="button" data-strike-stage="'+s+
        '"><canvas width="160" height="90" aria-hidden="true"></canvas><strong>'+arenas[s].name+'</strong><small></small></button>').join('')+
      '</div><p id="strike-detail"></p><div class="dialog-actions"><button type="button" class="primary" id="strike-confirm"></button>'+
      '<button type="button" class="utility" id="strike-back">Back</button></div><small id="strike-keys"></small>';
    const el=id=>root.querySelector('#strike-'+id),confirm=el('confirm'),cards=[...el('stages').children];
    el('rules').textContent='Game '+game+' · '+stageForms[form].name+' · '+(draft.picker===null?
      'Strike one, two, then one. Play on the arena left standing.':'The winner bans two arenas. The challenger chooses from the other three.');
    const draw=()=>{
      const {turn,winner}=draft,thinking=solo && turn===1;
      if(winner)current=winner;else if(!draft.remaining.includes(current))current=draft.remaining[0];
      el('turn').textContent=winner?'Game '+game+' · '+arenas[winner].name:player(turn)+' · '+verbs[draft.action]+' an arena';
      for(const b of cards){
        const s=b.dataset.strikeStage,move=draft.moves.find(m=>m.stage===s);
        const out=move && move.action!=='pick';
        b.disabled=!!out || !!winner || thinking;b.dataset.out=String(!!out);
        b.setAttribute('aria-pressed',String(current===s));
        b.querySelector('small').textContent=out?'P'+(move.slot+1)+' · '+(move.action==='ban'?'Banned':'Struck'):
          winner===s?'Fight here':current===s?'Selected':'';
      }
      el('detail').textContent=arenas[current].name+' · '+(stageForms[form].description || arenas[current].description);
      confirm.disabled=thinking;confirm.textContent=winner?'Start game '+game:verbs[draft.action]+' '+arenas[current].name;
      const n=turn ?? 0,map=keys[n],key=window.FightControls.keyName;
      const legend=padNames(n,solo?connected[0]:seats.get(n,connected));
      el('keys').textContent=thinking?'':winner?'Press '+legend[9]+' or choose Start game.':
        'P'+(n+1)+' · '+key(map.left)+' / '+key(map.right)+' select · '+key(map.attack)+' confirm · D-pad / '+legend[0]+' on controller';
      confirm.dataset.play=String(!!winner);
      if(!thinking && (!root.contains(document.activeElement) || document.activeElement.disabled))confirm.focus({preventScroll:true});
    };
    function choose(slot,delta){
      if(closed || draft.turn!==slot || solo && slot===1)return;
      const open=draft.remaining;
      current=open[(open.indexOf(current)+delta+open.length)%open.length];sound('menu');draw();
    }
    function commit(slot){
      if(closed || solo && slot===1)return;
      if(draft.winner){closed=true;start(draft.winner);return;}
      if(draft.take(slot,current)){sound('menu');draw();}
    }
    for(const b of cards){
      const s=b.dataset.strikeStage;
      drawStageTile(b.querySelector('canvas'),s,form);
      b.onclick=()=>{current=s;draw();confirm.focus({preventScroll:true});};
    }
    confirm.onclick=()=>commit(draft.turn ?? 0);
    el('back').onclick=()=>{closed=true;leave();};
    function keyboard(e){
      const actions=['left','right','up','down','attack','special'];
      for(const [slot,map] of keys.entries()){
        const key=actions.find(k=>map[k]===e.code);if(!key)continue;
        e.preventDefault();
        if(!e.repeat && (!solo || slot===0)){
          if(key==='special' && (slot===draft.turn || draft.winner || solo))el('back').click();
          else if(key==='attack')commit(slot);
          else if(key!=='special')choose(slot,key==='left' || key==='up'?-1:1);
        }
        return true;
      }
      return false;
    }
    function poll(devices,time){
      if(closed)return;
      if(solo && draft.turn===1){
        cpuAt ??= time+.65;
        if(time>=cpuAt){draft.cpu(dogs,form,previous);cpuAt=null;sound('menu');draw();}
      }else cpuAt=null;
      connected=devices;seats.sync(devices);
      const turn=draft.turn,ready=!!draft.winner;
      for(let slot=0;slot<(solo?1:2);slot++){
        const pad=solo?devices[0]:seats.get(slot,devices),last=old[slot];
        if(!pad){old[slot]=null;continue;}
        const pressed=i=>!!pad.buttons[i]?.pressed;
        const axis=(i,dir,bit)=>dir*(pad.axes[i] || 0)>((last?.mask & bit) ? .38 : .65);
        const mask=(pressed(14)||pressed(12)||axis(0,-1,1)||axis(1,-1,1)?1:0) |
          (pressed(15)||pressed(13)||axis(0,1,2)||axis(1,1,2)?2:0) | (pressed(0)?4:0) | (pressed(1)?8:0) | (pressed(9)?16:0);
        old[slot]={index:pad.index,mask};
        if(last?.index!==pad.index || !ready && turn!==slot)continue;
        const fresh=mask & ~last.mask;
        if(fresh&8){el('back').click();return;}
        if(fresh&1)choose(slot,-1);else if(fresh&2)choose(slot,1);
        if(fresh&4 || ready && fresh&16)commit(slot);
        if(closed)return;
      }
    }
    draw();poll(pads,performance.now()/1000);
    return {keyboard,poll,bindings(next){keys=next;}};
  }
  function history(games){
    const past={strike:'struck',ban:'banned',pick:'picked'};
    const rows=games.map((game,i)=>{
      const turns=(game.strikes || []).map(move=>'P'+(move.slot+1)+' '+past[move.action]+' '+arenas[move.stage].name);
      return '<p><strong>Game '+(i+1)+' · '+arenas[game.stage].name+'</strong><br>'+turns.join(' · ')+'</p>';
    });
    return '<details id="strike-history"><summary>Stage picks and bans</summary>'+rows.join('')+'</details>';
  }
  window.StageStrike={Draft,panel,history};
})();
