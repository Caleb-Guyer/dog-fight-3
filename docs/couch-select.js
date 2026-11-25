(() => {
  'use strict';
  const {fighters,arenas,stageForms,coatFor}=window.DogFight;
  const dogs=Object.keys(fighters), stages=Object.keys(arenas);
  function cycle(list,value,n) { return list[(list.indexOf(value)+n+list.length)%list.length]; }

  // Preserve the other player's controller through disconnects and sparse Gamepad indices.
  class Seats {
    constructor(pads) { this.ids=[null,null]; this.sync(pads); }
    sync(pads) {
      for (const pad of pads) {
        if (this.ids.includes(pad.index)) continue;
        const order=pads.length===1?[1,0]:[0,1];
        const slot=order.find(i=>!this.get(i,pads));
        if(slot!==undefined) this.ids[slot]=pad.index;
      }
    }
    get(i,pads) { return pads.find(p=>p.index===this.ids[i]); }
  }

  class Selection {
    constructor(settings,random=Math.random) {
      this.phase='fighters';
      this.coats=settings.coatBook.map(book=>({...book}));
      this.dogs=[settings.p1,settings.p2];
      const raw=this.dogs.map((kind,i)=>this.coats[i][kind]??0);
      this.colors=this.dogs.map((_,i)=>coatFor(i,...this.dogs,raw));
      this.stages=[settings.stage,settings.stage];
      this.locked=[false,false];
      this.tieSlot=random()<.5?0:1;
    }
    get winner() { return this.phase==='stages' && this.locked.every(Boolean) ? this.stages[this.tieSlot] : null; }
    choose(i,dir) {
      if(this.locked[i])return;
      if(this.phase==='stages'){this.stages[i]=cycle(stages,this.stages[i],dir);return;}
      this.coats[i][this.dogs[i]]=this.colors[i];
      const kind=this.dogs[i]=cycle(dogs,this.dogs[i],dir);
      const color=this.coats[i][kind]??0;
      this.colors[i]=kind===this.dogs[1-i] && color===this.colors[1-i]?(color+1)%4:color;
    }
    coat(i,dir) {
      if(this.phase!=='fighters' || this.locked[i])return;
      let color=(this.colors[i]+dir+4)%4;
      if(this.dogs[i]===this.dogs[1-i] && color===this.colors[1-i]) color=(color+dir+4)%4;
      this.colors[i]=color;
    }
    lock(i) {
      this.locked[i]=true;
      if(this.phase==='fighters' && this.locked.every(Boolean)){
        this.phase='stages';this.locked=[false,false];
      }
    }
    back(i) {
      if(this.locked[i]) { this.locked[i]=false; return; }
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
      (down(0)?16:0) | (down(1)?32:0) | (down(9)?64:0);
  }
  const card=i=>'<section class="couch-seat" data-seat="'+i+'" aria-label="Player '+(i+1)+' selection">'+
    '<header><b>P'+(i+1)+'</b><span data-device></span></header><canvas width="192" height="108" aria-hidden="true"></canvas>'+
    '<div class="couch-choice"><button type="button" data-action="prev" aria-label="Previous choice for player '+(i+1)+'">‹</button>'+
    '<strong data-name></strong><button type="button" data-action="next" aria-label="Next choice for player '+(i+1)+'">›</button></div>'+
    '<small data-detail></small><button type="button" data-action="coat"></button>'+
    '<button type="button" class="couch-lock" data-action="lock"></button><small data-keys></small></section>';

  function panel(root,settings,keys,pads,{start,leave,sound,announce,drawStageTile}) {
    const pick=new Selection(settings), seats=new Seats(pads), previous=[null,null];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const colors=window.DogArt.coatNames;
    root.innerHTML='<h3 id="couch-phase" class="card-stage"></h3><small id="couch-rules"></small><div class="couch-seats">'+card(0)+card(1)+
      '</div><p id="couch-call" role="status"></p><div class="dialog-actions">'+
      '<button type="button" class="primary" id="couch-start"></button><button type="button" class="utility" id="couch-back"></button></div>';
    const cards=[...root.querySelectorAll('[data-seat]')].map(el=>({
      el,canvas:el.querySelector('canvas'),name:el.querySelector('[data-name]'),detail:el.querySelector('[data-detail]'),
      coat:el.querySelector('[data-action=coat]'),lock:el.querySelector('[data-action=lock]'),keys:el.querySelector('[data-keys]'),
      device:el.querySelector('[data-device]'),arrows:el.querySelectorAll('.couch-choice button'),
    }));
    const play=root.querySelector('#couch-start'), back=root.querySelector('#couch-back'), call=root.querySelector('#couch-call');
    root.querySelector('#couch-rules').textContent=(settings.bestOfThree?'Best of three':'Single game')+' · 3 stocks · '+
      (settings.minutes?settings.minutes+' min':'No clock')+' · '+stageForms[settings.stageForm].name+' · Fetch Ball '+(settings.fetch?'on':'off');
    const key=(i,action)=>window.FightControls.keyName(keys[i][action]);
    let lastCel=-1,closed=false;
    function paint(time=0) {
      if(pick.phase!=='fighters') return;
      const cel=reduced.matches?0:Math.floor(time*8);
      if(cel===lastCel)return;
      lastCel=cel;
      cards.forEach(({canvas},i)=>{
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
    function render() {
      const choosing=pick.phase==='fighters', winner=pick.winner;
      root.querySelector('#couch-phase').textContent=choosing?'Choose your fighters':'Vote for the opening arena';
      cards.forEach((c,i)=>{
        const kind=pick.dogs[i], locked=pick.locked[i];
        c.el.dataset.locked=String(locked);
        c.name.textContent=choosing?fighters[kind].name:arenas[pick.stages[i]].name;
        c.detail.textContent=choosing?fighters[kind].breed+' · '+fighters[kind].style:colors[kind][pick.colors[i]]+' '+fighters[kind].name;
        c.coat.hidden=!choosing;c.coat.disabled=locked;c.coat.textContent='Coat · '+colors[kind][pick.colors[i]];
        c.lock.textContent=locked?(choosing?'Ready ✓ · Change':'Voted ✓ · Change'):(choosing?'Ready':'Vote');
        c.lock.setAttribute('aria-pressed',String(locked));
        for(const button of c.arrows)button.disabled=locked;
        c.keys.textContent=key(i,'left')+' / '+key(i,'right')+' choose · '+key(i,'attack')+(choosing?' ready':' vote')+
          ' · '+key(i,'special')+' back'+(choosing?' · '+key(i,'up')+' / '+key(i,'down')+' coat':'');
        if(!choosing)drawStageTile(c.canvas,pick.stages[i],settings.stageForm);
      });
      const who=pick.locked[0]?'P1':'P2';
      call.textContent=winner ? (pick.stages[0]===pick.stages[1]?'Both chose ':'Split vote · P'+(pick.tieSlot+1)+' gets the pick · ')+arenas[winner].name+'. Press Start to play.' :
        pick.locked.some(Boolean) ? who+(choosing?' is ready':' voted')+' · Waiting for '+(who==='P1'?'P2':'P1') :
        choosing?'Ready both dogs to open the arena vote.':'Matching votes choose the arena. A split vote goes to a coin toss.';
      play.hidden=!winner;
      play.textContent=settings.bestOfThree?'Start set':'Start fight';
      back.textContent=choosing?'Back to fighter select':'Change fighters';
      if(winner)play.focus({preventScroll:true});
      lastCel=-1;paint();
    }
    function launch() {
      if(closed || !pick.winner)return;
      closed=true;start(pick,seats);
    }
    function act(i,action) {
      if(closed)return;
      if(action==='back' && !pick.locked[i] && pick.phase==='fighters'){
        if(pick.locked[1-i])return;
        closed=true;leave();return;
      }
      if(action==='back')pick.back(i);
      else if(action==='confirm') { if(pick.locked[i])return;pick.lock(i); }
      else if(pick.locked[i])return;
      else if(action==='left'||action==='right')pick.choose(i,action==='left'?-1:1);
      else if(pick.phase==='fighters')pick.coat(i,action==='up'?-1:1);
      else return;
      sound('menu');render();
      const choice=pick.phase==='fighters'?colors[pick.dogs[i]][pick.colors[i]]+' '+fighters[pick.dogs[i]].name:arenas[pick.stages[i]].name;
      if(['left','right','up','down'].includes(action))announce('P'+(i+1)+' · '+choice);
    }
    for(const [i,c] of cards.entries())c.el.onclick=e=>{
      const button=e.target.closest('[data-action]');if(!button)return;
      const action=button.dataset.action;
      act(i,{prev:'left',next:'right',coat:'down',lock:pick.locked[i]?'back':'confirm'}[action]);
    };
    play.onclick=launch;
    back.onclick=()=>{
      if(pick.phase==='fighters'){closed=true;leave();return;}
      pick.phase='fighters';pick.locked=[false,false];render();cards[0].lock.focus({preventScroll:true});
    };
    function poll(pads,time) {
      seats.sync(pads);
      const phase=pick.phase, ready=!!pick.winner;
      for(const [i,c] of cards.entries()){
        const pad=seats.get(i,pads), last=previous[i];
        const mask=padMask(pad,last?.mask||0), index=pad?.index??null;
        if(last?.index!==index)c.device.textContent=pad?'Pad '+(index+1)+' · A ready / B back':'Keyboard';
        previous[i]={index,mask};
        if(closed || phase!==pick.phase || !pad || last?.index!==index)continue;
        const fresh=mask & ~last.mask;
        if(fresh & 32)act(i,'back');
        else {
          if(fresh & 1)act(i,'left');else if(fresh & 2)act(i,'right');
          else if(fresh & 4)act(i,'up');else if(fresh & 8)act(i,'down');
          if(fresh & 16)act(i,'confirm');
          if(ready && fresh & 64)launch();
        }
      }
      if(!closed)paint(time);
    }
    function keyboard(e) {
      for(const [i,map] of keys.entries()){
        const action=['left','right','up','down','attack','special'].find(a=>map[a]===e.code);
        if(!action)continue;
        e.preventDefault();
        if(!e.repeat)act(i,action==='attack'?'confirm':action==='special'?'back':action);
        return true;
      }
      return false;
    }
    render();poll(pads,0);cards[0].lock.focus({preventScroll:true});
    return {poll,keyboard,bindings(next){keys=next;render();}};
  }
  window.CouchSelect={Selection,Seats,panel};
})();
