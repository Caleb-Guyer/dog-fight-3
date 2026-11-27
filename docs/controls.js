(() => {
  'use strict';
  const keyboardDefaults = [
    {left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS',jump:'Space',hop:'KeyE',walk:'ShiftLeft',attack:'KeyJ',smash:'KeyI',special:'KeyK',shield:'KeyL',grab:'KeyU',
      aimLeft:'KeyR',aimRight:'KeyY',aimUp:'KeyT',aimDown:'KeyG'},
    {left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',jump:'ShiftRight',hop:'Quote',walk:'ControlRight',attack:'Comma',smash:'KeyN',special:'Period',shield:'Slash',grab:'KeyM',
      aimLeft:'Numpad4',aimRight:'Numpad6',aimUp:'Numpad8',aimDown:'Numpad2'},
  ];
  const padDefaults={jump:0,hop:6,attack:2,smash:7,special:1,shield:4,shieldAlt:5,grab:3};
  const names={left:'Move left',right:'Move right',up:'Aim up',down:'Aim down',jump:'Jump',hop:'Short hop',walk:'Walk',
    attack:'Attack',smash:'Smash',special:'Special',shield:'Shield',shieldAlt:'Second shield',grab:'Grab',
    aimLeft:'Strike left',aimRight:'Strike right',aimUp:'Strike up',aimDown:'Strike down'};
  const buttons=['A','B','X','Y','LB','RB','LT','RT'];
  const legends={
    xbox:[...buttons,'View','Start'],
    modern:[...buttons,'View','Menu'],
    switch:['B','A','Y','X','L','R','ZL','ZR','−','+'],
    ps:['Cross','Circle','Square','Triangle','L1','R1','L2','R2','Share','Options'],
    sense:['Cross','Circle','Square','Triangle','L1','R1','L2','R2','Create','Options'],
    positions:['Bottom','Right','Left','Top','Left bumper','Right bumper','Left trigger','Right trigger','Left menu','Right menu'],
    numbered:Array.from({length:10},(_,i)=>'Button '+(i+1))
  };
  const labelStyles={auto:'Automatic',xbox:'Xbox',switch:'Nintendo Switch',ps:'PlayStation 4',sense:'PlayStation 5',positions:'Button positions'};
  function padLegend(pad,style='auto'){
    const id=pad?.id || '';
    if(style==='xbox')return legends.modern;
    if(style!=='auto' && Object.hasOwn(labelStyles,style))return legends[style];
    if(pad?.mapping==='')return legends.numbered;
    if(/dualsense|054c.*(?:0ce6|0df2)/i.test(id))return legends.sense;
    if(/dualshock.?4|playstation.?4|054c.*(?:05c4|09cc)/i.test(id))return legends.ps;
    if(/switch pro|nintendo.*pro controller|pro controller.*nintendo|057e.*2009/i.test(id))return legends.switch;
    if(/xbox (?:one|series|wireless)/i.test(id))return legends.modern;
    return legends.xbox;
  }
  const symbols={ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',ShiftLeft:'Left Shift',ShiftRight:'Right Shift',
    ControlLeft:'Left Ctrl',ControlRight:'Right Ctrl',Comma:',',Period:'.',Slash:'/',Quote:"'",Backquote:'`',Backslash:'\\',
    Semicolon:';',Minus:'−',Equal:'=',BracketLeft:'[',BracketRight:']',Space:'Space'};
  const keyName=code=>symbols[code] || code.replace(/^Key|^Digit/,'').replace(/^Numpad/,'Num ');
  function allowed(code) {
    return typeof code==='string' && code!=='KeyF' && code!=='KeyP' && (Object.hasOwn(symbols,code) ||
      /^(Key[A-Z]|Digit\d|Numpad(?:\d|Add|Subtract|Multiply|Divide|Decimal))$/.test(code));
  }
  function defaults(device) {
    return (device==='keyboard'?keyboardDefaults:[padDefaults,padDefaults]).map(m=>({...m}));
  }
  function readMap(base,saved,used,valid) {
    const map={...base};
    for(const action of Object.keys(map)){
      const value=saved?.[action] ?? base[action];
      if(!valid(value) || used.has(value))return null;
      used.add(value);map[action]=value;
    }
    return map;
  }
  function load(raw={}) {
    const used=new Set(), keyboard=keyboardDefaults.map((base,i)=>readMap(base,raw?.keyboard?.[i],used,allowed));
    const validPad=n=>Number.isInteger(n) && n>=0 && n<buttons.length;
    const pad=[0,1].map(i=>readMap(padDefaults,raw?.pad?.[i],new Set(),validPad) || {...padDefaults});
    return {keyboard:keyboard.every(Boolean)?keyboard:defaults('keyboard'),pad};
  }
  function occupant(layout,device,slot,value) {
    for(const i of device==='keyboard'?[0,1]:[slot]){
      const action=Object.keys(layout[device][i]).find(action=>layout[device][i][action]===value);
      if(action)return {slot:i,action};
    }
    return null;
  }
  function assign(layout,device,slot,action,value) {
    const map=layout[device][slot], old=map[action], other=occupant(layout,device,slot,value);
    if(other) layout[device][other.slot][other.action]=old;
    map[action]=value;
  }
  class FighterShuffle {
    constructor(roster,random=Math.random) {
      this.roster=roster;
      this.random=random;
      this.remaining=[];
      this.last=null;
    }
    draw(current) {
      if(this.last!==current)this.remaining=this.roster.filter(kind=>kind!==current);
      if(!this.remaining.length)this.remaining=this.roster.slice();
      const choices=this.remaining.filter(kind=>kind!==current);
      if(!choices.length)return current;
      const kind=choices[Math.floor(this.random()*choices.length)];
      this.remaining.splice(this.remaining.indexOf(kind),1);
      this.last=kind;
      return kind;
    }
  }
  class Seats {
    constructor(pads) { this.ids=[null,null]; this.sync(pads); }
    sync(pads) {
      for (const pad of pads) {
        if (this.ids.includes(pad.index)) continue;
        const order=pads.length===1?[1,0]:[0,1];
        const slot=order.find(i=>this.ids[i]!==null && !this.get(i,pads)) ?? order.find(i=>!this.get(i,pads));
        if(slot!==undefined) this.ids[slot]=pad.index;
      }
    }
    get(i,pads) { return pads.find(p=>p.index===this.ids[i]); }
    beginMatch(pads) {
      this.sync(pads);
      this.present=this.connected(pads);
      this.lost=0;
    }
    connected(pads) { return (this.get(0,pads)?1:0) | (this.get(1,pads)?2:0); }
    track(pads) {
      // Look for missing assigned devices before filling their seats with replacement pads.
      this.lost |= this.present & ~this.connected(pads);
      this.sync(pads);
      this.present=this.connected(pads);
    }
  }
  // Only a device that has supplied gameplay input owns the offline player's seat.
  class SoloSeat {
    constructor(){this.index=null;this.id='';this.lost=false;this.waitNeutral=new Map();this.ready=new Map();}
    get(pads){return this.index===null?null:pads.find(p=>p.index===this.index && p.id===this.id);}
    use(pad){this.index=pad.index;this.id=pad.id;this.lost=false;this.ready.clear();}
    active(pad){return pad.buttons.some(b=>b.pressed) || pad.axes.some(n=>Math.abs(n)>.23);}
    track(pads,playing){
      if(this.lost)return;
      if(this.index!==null){
        if(!this.get(pads)){this.lost=true;this.ready.clear();}
        return;
      }
      if(!playing)return;
      for(const p of pads){
        if(!this.active(p)){this.waitNeutral.delete(p.index);continue;}
        if(!this.waitNeutral.has(p.index) || this.waitNeutral.get(p.index)!==p.id){this.use(p);return;}
      }
    }
    useOtherInput(pads){
      this.index=null;this.id='';this.lost=false;this.ready.clear();this.waitNeutral.clear();
      for(const p of pads)if(this.active(p))this.waitNeutral.set(p.index,p.id);
    }
    confirm(pads){
      // A pad can appear with the wake-up button already held. Wait for a neutral sample first.
      for(const index of this.ready.keys())if(!pads.some(p=>p.index===index))this.ready.delete(index);
      for(const p of pads){
        if(!this.active(p)){this.ready.set(p.index,p.id);continue;}
        const select=p.buttons[0]?.pressed && !p.buttons.some((b,i)=>i!==0 && b.pressed) && !p.axes.some(n=>Math.abs(n)>.23);
        if(select && this.ready.has(p.index) && this.ready.get(p.index)===p.id){this.use(p);return p;}
        this.ready.delete(p.index);
      }
      return null;
    }
  }
  // Follow the lane where the player entered a wide card, such as the Adventure cover.
  function menuNeighbor(rects, current, direction, lane) {
    const horizontal=direction==='left' || direction==='right';
    const low=horizontal?'left':'top', high=horizontal?'right':'bottom';
    const crossLow=horizontal?'top':'left', crossHigh=horizontal?'bottom':'right';
    const start=rects[current], forward=direction==='right' || direction==='down';
    const origin=Math.max(start[crossLow],Math.min(start[crossHigh],lane));
    let best=current, bestCost=Infinity;
    for(const [i,r] of rects.entries()){
      if(i===current)continue;
      const gap=forward?r[low]-start[high]:start[low]-r[high];
      if(gap < -2)continue;
      const offset=Math.max(0,r[crossLow]-origin,origin-r[crossHigh]);
      const center=Math.abs((r[crossLow]+r[crossHigh])/2-origin);
      const cost=Math.max(0,gap)+offset*3+center*.12;
      if(cost<bestCost){best=i;bestCost=cost;}
    }
    return best;
  }
  function menuDirection(pad, previous) {
    const pressed=i=>pad.buttons[i]?.pressed;
    const dx=Number(!!pressed(15))-Number(!!pressed(14)), dy=Number(!!pressed(13))-Number(!!pressed(12));
    let x=dx, y=dy;
    if(!dx && !dy){
      x=pad.axes[0]||0; y=pad.axes[1]||0;
      if(Math.max(Math.abs(x),Math.abs(y))<(previous ? .42 : .65))return '';
    }
    const horizontal=previous==='left' || previous==='right';
    const vertical=previous==='up' || previous==='down';
    if(Math.abs(x)+(horizontal ? .15 : 0)>=Math.abs(y)+(vertical ? .15 : 0))return x<0?'left':'right';
    return y<0?'up':'down';
  }
  class MenuRepeat {
    constructor(){this.direction='';this.scope='';this.next=0;}
    poll(direction,scope,time){
      const changed=direction!==this.direction;
      const crossed=scope!==this.scope;
      this.scope=scope;this.direction=direction;
      if(changed || !direction || !scope || crossed){
        // A held direction that opened a new screen must be released or turned first.
        this.next=changed && direction && scope ? time+.38 : Infinity;
        return !!(changed && direction && scope);
      }
      if(time<this.next)return false;
      this.next=time+.12;
      return true;
    }
  }
  window.FightControls={load,defaults,allowed,occupant,assign,keyName,buttons,names,labelStyles,padLegend,Seats,SoloSeat,FighterShuffle,menuNeighbor,menuDirection,MenuRepeat};
})();
