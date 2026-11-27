(() => {
  'use strict';
  const {fighters,arenas,stageForms,coatFor}=window.DogFight;
  const dogs=Object.keys(fighters), stages=Object.keys(arenas);
  function cycle(list,value,n) { return list[(list.indexOf(value)+n+list.length)%list.length]; }

  class Selection {
    constructor(settings,random=Math.random,picker=null,fightersOnly=false) {
      this.phase='fighters';
      this.fightersOnly=fightersOnly;
      this.picker=picker;
      this.coats=settings.coatBook.map(book=>({...book}));
      this.dogs=[settings.p1,settings.p2];
      this.draws=this.dogs.map(()=>new window.FightControls.FighterShuffle(dogs,random));
      const raw=settings.coats ?? this.dogs.map((kind,i)=>this.coats[i][kind]??0);
      this.colors=this.dogs.map((_,i)=>coatFor(i,...this.dogs,raw));
      this.stages=[settings.stage,settings.stage];
      this.locked=[false,false];
      this.tieSlot=picker ?? (fightersOnly || random()<.5?0:1);
    }
    get winner() { return this.phase==='stages' && this.locked.every(Boolean) ? this.stages[this.tieSlot] : null; }
    select(i,value) {
      if(this.locked[i] || (this.picker!==null && i!==this.picker))return;
      if(this.phase==='stages'){
        if(stages.includes(value))this.stages[i]=value;
      }else if(dogs.includes(value))this.pickDog(i,value);
    }
    choose(i,dir) {
      this.select(i,this.phase==='stages'?cycle(stages,this.stages[i],dir):cycle(dogs,this.dogs[i],dir));
    }
    shuffle(i) {
      if(this.phase!=='fighters' || this.locked[i] || (this.picker!==null && i!==this.picker))return;
      this.pickDog(i,this.draws[i].draw(this.dogs[i]));
    }
    pickDog(i,kind) {
      this.coats[i][this.dogs[i]]=this.colors[i];
      this.dogs[i]=kind;
      const color=this.coats[i][kind]??0;
      this.colors[i]=kind===this.dogs[1-i] && color===this.colors[1-i]?(color+1)%4:color;
    }
    coat(i,dir) {
      if(this.phase!=='fighters' || this.locked[i] || (this.picker!==null && i!==this.picker))return;
      let color=(this.colors[i]+dir+4)%4;
      if(this.dogs[i]===this.dogs[1-i] && color===this.colors[1-i]) color=(color+dir+4)%4;
      this.colors[i]=color;
    }
    lock(i) {
      if(this.fightersOnly){this.locked[i]=true;return;}
      if(this.picker!==null && this.phase==='fighters' && i===this.picker) {
        this.phase='stages';
        return;
      }
      this.locked[i]=true;
      if(this.picker===null && this.phase==='fighters' && this.locked.every(Boolean)){
        this.phase='stages';this.locked=[false,false];
      }
    }
    back(i) {
      if(this.locked[i]) { this.locked[i]=false; return; }
      if(this.picker!==null) {
        if(i===this.picker)this.phase='fighters';
        return;
      }
      if(this.phase==='stages') {
        this.phase='fighters';this.locked=[true,true];this.locked[i]=false;
      }
    }
  }

  function padMask(pad,previous) {
    if(!pad)return 0;
    const down=n=>pad.buttons[n]?.pressed;
    const axis=(n,dir,bit)=>dir*(pad.axes[n]||0)>((previous & bit) ? .38 : .65);
    return (down(14)||axis(0,-1,1)?1:0) | (down(15)||axis(0,1,2)?2:0) |
      (down(12)||axis(1,-1,4)?4:0) | (down(13)||axis(1,1,8)?8:0) |
      (down(0)?16:0) | (down(1)?32:0) | (down(9)?64:0) | (down(2)?128:0);
  }
  const card=i=>'<section class="couch-seat" data-seat="'+i+'" aria-label="Player '+(i+1)+' selection">'+
    '<header><b>P'+(i+1)+'</b><span data-device></span></header><canvas width="192" height="108" aria-hidden="true"></canvas>'+
    '<div class="couch-choice"><button type="button" data-action="prev" aria-label="Previous choice for player '+(i+1)+'">‹</button>'+
    '<strong data-name></strong><button type="button" data-action="next" aria-label="Next choice for player '+(i+1)+'">›</button></div>'+
    '<small data-detail></small><div class="couch-colors"><button type="button" data-action="shuffle">Random dog</button><button type="button" data-action="coat"></button></div>'+
    '<button type="button" class="couch-lock" data-action="lock"></button></section>';

  function panel(root,settings,keys,pads,{start,leave,sound,announce,drawStageTile,between,lineupReady,padNames=(i,p)=>window.FightControls.padLegend(p)}) {
    const pick=new Selection(settings,Math.random,between?.picker,!!lineupReady);
    const seats=settings.couchSeats || new window.FightControls.Seats(pads), previous=[null,null];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const colors=window.DogArt.coatNames;
    root.innerHTML='<div class="couch-board"><div class="couch-heading"><h3 id="couch-phase"></h3><div id="couch-target" role="group" aria-label="Player to edit">'+
      '<span>Pick for</span><button data-target="0">P1</button><button data-target="1">P2</button></div></div>'+
      '<div id="couch-grid" role="group"></div><div class="couch-seats">'+card(0)+card(1)+
      '</div><footer><p id="couch-call" role="status"></p><button type="button" class="primary" id="couch-start"></button>'+
      '<button type="button" class="utility" id="couch-back"></button></footer><details class="couch-help"><summary>Controls &amp; rules</summary>'+
      '<p id="couch-rules"></p>'+[0,1].map(i=>'<p><b>P'+(i+1)+'</b> · <span data-keys="'+i+'"></span><span data-pad-keys="'+i+'"></span></p>').join('')+'</details></div>';
    const grid=root.querySelector('#couch-grid'), target=root.querySelector('#couch-target'),help=root.querySelector('.couch-help');
    const targets=[...target.querySelectorAll('[data-target]')];
    let edit=pick.picker??0,gridPhase;
    const cards=[...root.querySelectorAll('[data-seat]')].map(el=>({
      el,canvas:el.querySelector('canvas'),name:el.querySelector('[data-name]'),detail:el.querySelector('[data-detail]'),
      coat:el.querySelector('[data-action=coat]'),lock:el.querySelector('[data-action=lock]'),keys:root.querySelector('[data-keys="'+el.dataset.seat+'"]'),
      padKeys:root.querySelector('[data-pad-keys="'+el.dataset.seat+'"]'),
      shuffle:el.querySelector('[data-action=shuffle]'),
      device:el.querySelector('[data-device]'),arrows:el.querySelectorAll('.couch-choice button'),
    }));
    const play=root.querySelector('#couch-start'), back=root.querySelector('#couch-back'), call=root.querySelector('#couch-call');
    if(settings.rotationTags)cards.forEach((c,i)=>{c.el.querySelector('header b').textContent='P'+(i+1)+' · '+settings.rotationTags[i];});
    const lives=settings.stockCount ?? settings.lives ?? 3;
    root.querySelector('#couch-rules').textContent=(settings.bestOfThree?'Best of three':'Single game')+((settings.timeBattle??settings.timed)?' · Time Battle · ':' · '+lives+(lives===1?' stock · ':' stocks · '))+
      (settings.minutes?settings.minutes+' min':'No clock')+' · '+stageForms[settings.stageForm].name+' · Fetch Ball '+(settings.fetch?'on':'off')+
      (settings.handicap?' · P1 '+settings.handicap[0]+'% / P2 '+settings.handicap[1]+'%':'');
    const key=(i,action)=>window.FightControls.keyName(keys[i][action]);
    let lastCel=-1,closed=false;
    function renderGrid(){
      const choosing=pick.phase==='fighters',values=choosing?dogs:stages,choices=choosing?pick.dogs:pick.stages;
      if(gridPhase!==pick.phase)edit=pick.picker??0;
      if(pick.picker!==null)edit=pick.picker;
      else if(pick.locked[edit] && !pick.locked[1-edit])edit=1-edit;
      if(gridPhase!==pick.phase){
        gridPhase=grid.dataset.phase=pick.phase;
        grid.innerHTML=values.map(id=>'<button type="button" data-choice="'+id+'">'+
          (choosing?'<img alt="" src="'+window.DogArt.portrait(id,0)+'">':'<canvas width="240" height="135" aria-hidden="true"></canvas>')+
          '<strong>'+(choosing?fighters[id].name:arenas[id].name)+'</strong><span class="couch-chips" aria-hidden="true"></span></button>').join('');
        if(!choosing)for(const el of grid.querySelectorAll('button'))drawStageTile(el.querySelector('canvas'),el.dataset.choice,settings.stageForm);
      }
      for(const [i,button] of targets.entries()){
        button.disabled=pick.locked[i] || (pick.picker!==null && i!==pick.picker);
        button.setAttribute('aria-pressed',String(i===edit));
      }
      grid.setAttribute('aria-label',(choosing?'Choose a fighter':'Choose an arena')+' for P'+(edit+1));
      for(const el of grid.children){
        const id=el.dataset.choice, selected=choices[edit]===id, players=[];
        el.disabled=pick.locked[edit];
        el.setAttribute('aria-pressed',String(selected));
        for(const i of [0,1]){
          if(choices[i]===id && (choosing || pick.picker===null || i===pick.picker))players.push(i);
        }
        const chips=el.querySelector('.couch-chips');
        chips.innerHTML=players.map(i=>'<b data-chip="'+i+'">P'+(i+1)+(pick.locked[i]?' ✓':'')+'</b>').join('');
        el.setAttribute('aria-label',el.querySelector('strong').textContent+(players.length?', '+players.map(i=>'P'+(i+1)+(pick.locked[i]?' ready':'')).join(' and '):''));
      }
    }
    function paint(time=0) {
      if(pick.phase!=='fighters' && !between) return;
      const cel=reduced.matches?0:Math.floor(time*8);
      if(cel===lastCel)return;
      lastCel=cel;
      cards.forEach(({canvas},i)=>{
        if(between && pick.phase==='stages' && i===pick.picker)return;
        const ctx=canvas.getContext('2d'), locked=pick.locked[i], edge=i?'#7fc8dc':'#f6aa6c';
        ctx.imageSmoothingEnabled=false;
        ctx.fillStyle=i?'#323d52':'#4b3541';ctx.fillRect(0,0,192,108);
        ctx.fillStyle=i?'#3b495b':'#58404a';ctx.fillRect(0,22,192,2);ctx.fillRect(0,72,192,2);
        ctx.fillStyle='#212634';ctx.fillRect(0,89,192,19);
        ctx.fillStyle=edge;ctx.fillRect(0,87,192,2);
        ctx.fillStyle='#64606a';for(let x=10;x<192;x+=24)ctx.fillRect(x,95,10,2);
        window.DogArt.draw(ctx,pick.dogs[i],96,87,{coat:pick.colors[i],face:i?-1:1,scale:1,pose:locked?'win':'idle',time:cel/8});
      });
    }
    function renderCounterpick() {
      const choosing=pick.phase==='fighters', picker=pick.picker, player='P'+(picker+1);
      root.querySelector('#couch-phase').textContent=player+(choosing?' · Keep or change fighter':' · Pick the arena');
      for(const [i,c] of cards.entries()) {
        const active=i===picker, kind=pick.dogs[i], locked=pick.locked[i], arena=active && !choosing;
        c.el.dataset.locked=String(locked);
        c.name.textContent=arena?arenas[pick.stages[i]].name:fighters[kind].name;
        c.detail.textContent=arena?(stageForms[settings.stageForm].description || arenas[pick.stages[i]].description):
          (active?fighters[kind].style:'Won game '+(between.game-1)+' · '+colors[kind][pick.colors[i]]);
        for(const button of c.arrows)button.disabled=!active || locked;
        c.coat.hidden=!active || !choosing;
        c.shuffle.hidden=c.coat.hidden;c.shuffle.disabled=locked;
        c.coat.disabled=locked;
        c.coat.textContent='Coat · '+colors[kind][pick.colors[i]];
        c.lock.textContent=locked?'Ready ✓ · Change':active?(lineupReady?'Lock fighter':choosing?'Choose arena':'Fight here'):'Ready for game '+between.game;
        c.lock.setAttribute('aria-pressed',String(locked));
        c.keys.textContent=(active?key(i,'left')+' / '+key(i,'right')+' choose · '+(choosing?key(i,'up')+' / '+key(i,'down')+' coat · ':''):'')+
          key(i,'attack')+' confirm · '+key(i,'special')+' back'+(active && choosing?' · '+key(i,'grab')+' random':'');
        if(arena)drawStageTile(c.canvas,pick.stages[i],settings.stageForm);
      }
      call.textContent=pick.locked[picker]?(lineupReady?fighters[pick.dogs[picker]].name:arenas[pick.stages[picker]].name)+' selected. Waiting for P'+(2-picker)+' to ready up.':
        (pick.locked[1-picker]?'P'+(2-picker)+' is ready. ':'')+
        (choosing?player+' can keep the same dog or change the matchup.':'Game '+between.game+' starts when both players confirm.');
      play.hidden=true;
      back.textContent=between.fromBracket?'Back to bracket':'Back to results';
    }
    function render() {
      renderGrid();
      if(between){renderCounterpick();lastCel=-1;paint();return;}
      const choosing=pick.phase==='fighters', winner=pick.winner;
      root.querySelector('#couch-phase').textContent=choosing?'Choose your fighters':'Vote for the opening arena';
      cards.forEach((c,i)=>{
        const kind=pick.dogs[i], locked=pick.locked[i];
        c.el.dataset.locked=String(locked);
        c.name.textContent=choosing?fighters[kind].name:arenas[pick.stages[i]].name;
        c.detail.textContent=choosing?fighters[kind].breed+' · '+fighters[kind].style:colors[kind][pick.colors[i]]+' '+fighters[kind].name;
        c.coat.hidden=!choosing;c.coat.disabled=locked;c.coat.textContent='Coat · '+colors[kind][pick.colors[i]];
        c.shuffle.hidden=!choosing;c.shuffle.disabled=locked;
        c.lock.textContent=locked?(choosing?'Ready ✓ · Change':'Voted ✓ · Change'):(choosing?'Ready':'Vote');
        c.lock.setAttribute('aria-pressed',String(locked));
        for(const button of c.arrows)button.disabled=locked;
        c.keys.textContent=key(i,'left')+' / '+key(i,'right')+' choose · '+key(i,'attack')+(choosing?' ready':' vote')+
          ' · '+key(i,'special')+' back'+(choosing?' · '+key(i,'up')+' / '+key(i,'down')+' coat · '+key(i,'grab')+' random':'');
        if(!choosing)drawStageTile(c.canvas,pick.stages[i],settings.stageForm);
      });
      const who=pick.locked[0]?'P1':'P2';
      call.textContent=winner ? (pick.stages[0]===pick.stages[1]?'Both chose ':'Split vote · P'+(pick.tieSlot+1)+' gets the pick · ')+arenas[winner].name+'. Confirm to start.' :
        pick.locked.some(Boolean) ? who+(choosing?' is ready':' voted')+' · Waiting for '+(who==='P1'?'P2':'P1') :
        choosing?(lineupReady?'Ready both dogs to start striking arenas.':'Ready both dogs to open the arena vote.'):'Matching votes choose the arena. A split vote goes to a coin toss.';
      play.hidden=!winner;
      play.textContent=settings.bestOfThree?'Start set':'Start fight';
      back.textContent=choosing?(settings.rotationRound?'Back to lineup':'Back to fighter select'):'Change fighters';
      if(winner)play.focus({preventScroll:true});
      lastCel=-1;paint();
    }
    function launch() {
      if(closed || !pick.winner)return;
      closed=true;start(pick,seats);
    }
    function act(i,action,value) {
      if(closed)return;
      if(action==='back' && help.open){help.open=false;cards[i].lock.focus({preventScroll:true});return;}
      if(between && i!==pick.picker && !['back','confirm'].includes(action))return;
      if(action==='back' && !pick.locked[i] && pick.phase==='fighters'){
        if(between ? i!==pick.picker : pick.locked[1-i])return;
        closed=true;leave();return;
      }
      if(action==='back')pick.back(i);
      else if(action==='confirm') { if(pick.winner)return launch();if(pick.locked[i])return;pick.lock(i); }
      else if(pick.locked[i])return;
      else if(action==='select')pick.select(i,value);
      else if(action==='shuffle'){
        if(pick.phase!=='fighters')return;
        pick.shuffle(i);
      }
      else if(action==='left'||action==='right')pick.choose(i,action==='left'?-1:1);
      else if(pick.phase==='fighters')pick.coat(i,action==='up'?-1:1);
      else return;
      sound('menu');
      if(lineupReady && pick.locked.every(Boolean)){closed=true;lineupReady(pick,seats);return;}
      if(between && pick.winner){launch();return;}
      render();
      const choice=pick.phase==='fighters'?colors[pick.dogs[i]][pick.colors[i]]+' '+fighters[pick.dogs[i]].name:arenas[pick.stages[i]].name;
      if(['left','right','up','down','shuffle','select'].includes(action))announce('P'+(i+1)+' · '+choice);
    }
    target.onclick=e=>{
      const button=e.target.closest('button[data-target]');
      if(!button || button.disabled)return;
      edit=Number(button.dataset.target);renderGrid();
    };
    grid.onclick=e=>{
      const button=e.target.closest('[data-choice]');
      if(button && !button.disabled)act(edit,'select',button.dataset.choice);
    };
    for(const [i,c] of cards.entries())c.el.onclick=e=>{
      const button=e.target.closest('[data-action]');if(!button)return;
      const action=button.dataset.action;
      act(i,{prev:'left',next:'right',coat:'down',shuffle:'shuffle',lock:pick.locked[i]?'back':'confirm'}[action]);
    };
    play.onclick=launch;
    back.onclick=()=>{
      if(between || pick.phase==='fighters'){closed=true;leave();return;}
      pick.phase='fighters';pick.locked=[false,false];render();cards[0].lock.focus({preventScroll:true});
    };
    function poll(pads,time) {
      seats.sync(pads);
      const phase=pick.phase, ready=!!pick.winner;
      for(const [i,c] of cards.entries()){
        const pad=seats.get(i,pads), last=previous[i];
        const mask=padMask(pad,last?.mask||0), index=pad?.index??null;
        const names=padNames(i,pad);
        if(last?.index!==index || last.legend!==names){
          c.device.textContent=pad?'Pad '+(index+1):'Keyboard';
          c.padKeys.textContent=pad?' · '+names[0]+' ready / '+names[1]+' back / '+names[2]+' random':'';
        }
        previous[i]={index,mask,legend:names};
        if(closed || (!between && phase!==pick.phase) || !pad || last?.index!==index)continue;
        const fresh=mask & ~last.mask;
        if(fresh & 32)act(i,'back');
        else {
          if(fresh & 1)act(i,'left');else if(fresh & 2)act(i,'right');
          else if(fresh & 4)act(i,'up');else if(fresh & 8)act(i,'down');
          else if(fresh & 128)act(i,'shuffle');
          if(fresh & 16 && (ready || !pick.winner))act(i,'confirm');
          if(fresh & 64){
            if(ready)launch();
            else if(!closed && phase===pick.phase){
              help.open=!help.open;
              (help.open?help.querySelector('summary'):c.lock).focus();
            }
          }
        }
      }
      if(!closed)paint(time);
    }
    function keyboard(e) {
      if(e.code==='Escape' && help.open){e.preventDefault();help.open=false;help.querySelector('summary').focus();return true;}
      for(const [i,map] of keys.entries()){
        const action=['left','right','up','down','attack','special','grab'].find(a=>map[a]===e.code);
        if(!action)continue;
        e.preventDefault();
        if(!e.repeat)act(i,({attack:'confirm',special:'back',grab:'shuffle'})[action] || action);
        return true;
      }
      return false;
    }
    render();poll(pads,0);cards[pick.picker??0].lock.focus({preventScroll:true});
    return {poll,keyboard,bindings(next){keys=next;render();}};
  }
  function eventConfig(settings,event,seats){
    const pair=event.pair;
    return {...settings,...event.rules,handicap:event.rules?.handicap,p1:pair[0].kind,p2:pair[1].kind,
      coats:pair.map(p=>p.coat),coatBook:pair.map(p=>({[p.kind]:p.coat})),rotationRound:event.bout,
      rotationTags:pair.map(p=>p.name),tourneyRound:event.roundName,bestOfThree:event.sets,couchSeats:seats};
  }
  function finishEvent(event,bout,set,winner){
    const score=set?.score.slice() || [0,0];score[winner]++;
    return (!set || score[winner]===2) && event.finish(bout,winner,score);
  }
  window.CouchSelect={Selection,panel,eventConfig,finishEvent};
})();
