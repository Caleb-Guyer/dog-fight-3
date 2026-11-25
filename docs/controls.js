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
  // Keep a player's dog assigned to their pad when the other player unplugs.
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
  window.FightControls={load,defaults,allowed,occupant,assign,keyName,buttons,names,Seats};
})();
