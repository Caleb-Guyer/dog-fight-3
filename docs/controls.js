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
  const stickKey='dog-fight-3.sticks.1.';
  function rawPad(pad){return pad?.sourcePad || pad;}
  function stickAxes(pad){return pad?.axes?.length>=4?4:pad?.axes?.length>=2?2:0;}
  function validSticks(fit,count){
    return (count===2 || count===4) && Array.isArray(fit) && fit.length===count && fit.every(a=>
      Array.isArray(a) && a.length===3 && a.every(Number.isFinite) && a[0]>=-1 && a[2]<=1 &&
      Math.abs(a[1])<=.45 && a[1]-a[0]>=.35 && a[2]-a[1]>=.35);
  }
  function tuneAxes(raw,fit,out){
    out.length=raw.length;
    for(let i=0;i<raw.length;i++){
      const value=raw[i],a=fit[i];
      out[i]=a?Math.max(-1,Math.min(1,(value-a[1])/(value<a[1]?a[1]-a[0]:a[2]-a[1]))):value;
    }
    // Keep shallow angles intact when only one component is close to center.
    for(let i=0;i<fit.length;i+=2)if(out[i]**2+out[i+1]**2<=.045**2)out[i]=out[i+1]=0;
    return out;
  }
  class StickSettings {
    constructor(){this.slots=new Map();}
    entry(pad){
      const raw=rawPad(pad),count=stickAxes(raw);
      let entry=this.slots.get(raw.index);
      if(entry && entry.id===raw.id && entry.count===count && entry.mapping===raw.mapping)return entry;
      const key=stickKey+JSON.stringify([raw.index,raw.id,raw.mapping || '',count]);
      let fit;
      try{fit=JSON.parse(localStorage.getItem(key));}catch{}
      entry={key,id:raw.id,count,mapping:raw.mapping,fit:validSticks(fit,count)?fit:null,view:{index:raw.index,id:raw.id,mapping:raw.mapping,axes:[]}};
      this.slots.set(raw.index,entry);return entry;
    }
    apply(pad){
      const raw=rawPad(pad),{fit,view}=this.entry(raw);
      if(!fit)return raw;
      view.sourcePad=raw;view.connected=raw.connected;view.buttons=raw.buttons;view.vibrationActuator=raw.vibrationActuator;
      tuneAxes(raw.axes,fit,view.axes);return view;
    }
    save(pad,fit){
      const entry=this.entry(pad);
      if(fit!==null && !validSticks(fit,entry.count))throw Error('Incomplete stick calibration');
      entry.fit=fit;
      try{
        if(fit)localStorage.setItem(entry.key,JSON.stringify(fit));else localStorage.removeItem(entry.key);
        return true;
      }catch{return false;}
    }
  }
  const sticks=new StickSettings();
  window.addEventListener?.('storage',e=>{if(!e.key || e.key.startsWith(stickKey))sticks.slots.clear();});
  function readPads(){
    const connected=[];
    try{for(const p of navigator.getGamepads?.() || [])if(p && p.connected!==false)connected.push(sticks.apply(p));}catch{}
    return connected;
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
    constructor(pads) { this.ids=[null,null];this.models=['',''];this.manual=false;this.version=0;this.sync(pads); }
    set(i,pad){
      this.ids[i]=pad?.index ?? null;this.models[i]=pad?.id || '';this.version++;
    }
    sync(pads) {
      if(!pads.length)return;
      const a=this.get(0,pads),b=this.get(1,pads);
      if((a && b) || pads.length===1 && (a || b) || this.manual && (!this.models[0] || a) && (!this.models[1] || b))return;
      // Resolve both returning models before giving spare hardware to an open seat.
      const available=pads.filter(p=>p!==a && p!==b);
      for(let i=0;i<2;i++)if(this.models[i] && !this.get(i,pads)){
        const n=available.findIndex(p=>p.id===this.models[i]);
        if(n>=0)this.set(i,available.splice(n,1)[0]);
      }
      if(this.manual)return;
      const order=pads.length===1?[1,0]:[0,1];
      for(const pad of available){
        const slot=order.find(i=>this.ids[i]===pad.index && !this.get(i,pads)) ??
          order.find(i=>this.ids[i]!==null && !this.get(i,pads)) ?? order.find(i=>!this.get(i,pads));
        if(slot!==undefined)this.set(slot,pad);
      }
    }
    get(i,pads) { return pads.find(p=>p.index===this.ids[i] && (p.id || '')===this.models[i]); }
    copyFrom(other){
      this.ids=other.ids.slice();this.models=other.models.slice();this.manual=other.manual;this.version++;
    }
    assign(i,pad,pads){
      const other=1-i;
      if(pad && this.get(other,pads)===pad)this.set(other,this.get(i,pads));
      this.set(i,pad);this.manual=true;
    }
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
    constructor(){this.index=null;this.id='';this.lost=false;this.ignored=new Map();this.ready=new Map();}
    get(pads){return this.index===null?null:pads.find(p=>p.index===this.index && p.id===this.id);}
    use(pad){this.index=pad.index;this.id=pad.id;this.lost=false;this.ready.clear();}
    active(pad){return pad.buttons.some(b=>b.pressed) || pad.axes.some(n=>Math.abs(n)>.23);}
    pressedMask(pad){
      let bits=0;
      for(let i=0;i<Math.min(17,pad.buttons.length);i++)if(pad.buttons[i].pressed)bits|=1<<i;
      for(let i=0;i<Math.min(4,pad.axes.length);i++){
        if(pad.axes[i]>.23)bits|=1<<(17+2*i);
        if(pad.axes[i]<-.23)bits|=1<<(18+2*i);
      }
      return bits;
    }
    track(pads,playing){
      if(this.lost)return;
      if(this.index!==null){
        if(!this.get(pads)){this.lost=true;this.ready.clear();}
        return;
      }
      if(!playing)return;
      for(const p of pads){
        if(!this.active(p)){this.ignored.delete(p.index);continue;}
        const held=this.ignored.get(p.index);
        if(held && held.id===p.id){
          if(held.waitForNeutral)continue;
          const bits=this.pressedMask(p);
          if(!(bits & ~held.bits)){held.bits=bits;continue;}
        }
        this.use(p);return;
      }
    }
    useOtherInput(pads,waitForNeutral=false){
      this.index=null;this.id='';this.lost=false;this.ready.clear();this.ignored.clear();
      for(const p of pads)if(this.active(p))this.ignored.set(p.index,{id:p.id,bits:this.pressedMask(p),waitForNeutral});
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
  function menuDirection(pad, previous, allowStick=true) {
    const pressed=i=>pad.buttons[i]?.pressed;
    const dx=Number(!!pressed(15))-Number(!!pressed(14)), dy=Number(!!pressed(13))-Number(!!pressed(12));
    let x=dx, y=dy;
    if(!dx && !dy){
      if(!allowStick)return '';
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
  window.FightControls={load,defaults,allowed,occupant,assign,keyName,buttons,names,labelStyles,padLegend,Seats,SoloSeat,FighterShuffle,menuNeighbor,menuDirection,MenuRepeat,sticks,readPads,rawPad,stickAxes,tuneAxes};
})();
