(() => {
  'use strict';
  const {fighters,arenas,stageForms,validCoat} = window.DogFight;
  const prefix='dog-fight-3.record.1.', limit=12;
  const number=n=>Number.isFinite(n) && n>=0;
  const count=n=>Number.isSafeInteger(n) && n>=0;
  const slot=n=>n===0 || n===1;
  const scores=v=>Array.isArray(v) && v.length===2 && v.every(Number.isSafeInteger);
  const zones=['left','right','top','bottom'];
  function valid(entry) {
    if (!entry || !count(entry.time) || entry.time>8.64e15 || !count(entry.round) || !slot(entry.winner) || !slot(entry.side) ||
      !Object.hasOwn(arenas,entry.stage) || !Object.hasOwn(stageForms,entry.form) ||
      !['solo','local','online','cup','school'].includes(entry.mode)) return false;
    const c=entry.card;
    return c && Array.isArray(c.players) && c.players.length===2 && c.players.every(p=>p &&
      Object.hasOwn(fighters,p.kind) && validCoat(p.coat) && number(p.damage) &&
      ['hits','blocks','parries','techs','knockdowns','shieldBreaks'].every(k=>count(p[k]))) &&
      count(c.frames) && ['time','ko','sudden'].includes(c.reason) && Array.isArray(c.losses) &&
      (c.points===undefined || (scores(c.points) && [1,3,7].includes(c.minutes))) &&
      c.losses.every(l=>l && slot(l.slot) && count(l.frame) && number(l.damage) &&
        (c.points && !l.suddenRound ? scores(l.points) && typeof l.credited==='boolean' : count(l.remaining)) &&
        zones.includes(l.zone) && count(l.suddenRound) && (!l.lastHit || typeof l.lastHit.id==='string' && count(l.lastHit.frame)));
  }
  class Book {
    constructor(storage) { this.storage=storage; this.transient=new Map(); }
    keys() {
      const keys=new Set(this.transient.keys());
      try {
        for (let i=0;i<this.storage.length;i++) {
          const key=this.storage.key(i);
          if (key?.startsWith(prefix)) keys.add(key.slice(prefix.length));
        }
      } catch {}
      return [...keys].filter(id=>/^\d{16}-[0-9a-f]{16}$/.test(id)).sort().reverse();
    }
    get(id) {
      if(this.transient.has(id)) return this.transient.get(id);
      try {
        const data=JSON.parse(this.storage.getItem(prefix+id));
        if(valid(data)) return data;
      } catch {}
      return null;
    }
    list() {
      const rows=[];
      for(const id of this.keys()) {
        const entry=this.get(id);
        if(entry)rows.push({id,entry});
        if(rows.length===limit)break;
      }
      return rows;
    }
    add(entry) {
      const random=crypto.getRandomValues(new Uint32Array(2));
      const id=String(entry.time).padStart(16,'0')+'-'+Array.from(random,n=>n.toString(16).padStart(8,'0')).join('');
      // One key per finish lets two tabs add games independently.
      try { this.storage.setItem(prefix+id,JSON.stringify(entry)); }
      catch { this.transient.set(id,entry); }
      for(const old of this.keys().slice(limit)) {
        this.transient.delete(old);
        try { this.storage.removeItem(prefix+old); } catch {}
      }
      return id;
    }
  }
  function coaching(card,who) {
    const p=card.players[who], rival=card.players[1-who], name=fighters[p.kind].name;
    const lost=card.losses.filter(l=>l.slot===who), falls=lost.filter(l=>l.zone==='bottom').length;
    const last=lost.at(-1);
    const times=n=>n===1?'once':n+' times';
    if (p.shieldBreaks) return {id:'shield-breakEscape',label:'Escape a shield break',
      why:name+'’s shield broke '+times(p.shieldBreaks)+'. Practice escaping the stun before the punish lands.'};
    if (falls) return {id:'ledge-training',label:'Practice recovery',
      why:name+' crossed the bottom blast line '+times(falls)+'. Start below the ledge and find the way back with an air jump and Up Special.'};
    if (p.knockdowns) return {id:'launch-escape',label:'Practice a landing tech',
      why:name+' hit the floor in tumble '+times(p.knockdowns)+'. Tap Shield just before impact to land in place or roll.'};
    if(last && last.lastHit && (last.zone==='left' || last.zone==='right' || last.zone==='top')) return {id:'launch-survival',label:'Practice launch influence',
      why:name+(last.points?' lost a point at ':' lost a stock at ')+Math.round(last.damage)+'% at the '+last.zone+' blast line. Try steering a strong launch during the hit freeze.'};
    if(rival.hits && !p.blocks && !p.parries) return {id:'shield-strike',label:'Practice defending a strike',
      why:fighters[rival.kind].name+' landed '+rival.hits+(rival.hits===1?' hit':' hits')+'. '+name+' recorded no blocks or parries. Try the shield timing against an incoming swing.'};
    if(p.blocks) return {id:'shield-crossup',label:'Counter a landing aerial',
      why:name+' blocked '+p.blocks+(p.blocks===1?' hit':' hits')+'. Practice punishing Brisket after a landing aerial touches your shield.'};
    if(!p.hits && !rival.hits) return null;
    return {id:'spacing-approach',label:'Practice a landing aerial',
      why:name+' landed '+p.hits+(p.hits===1?' hit':' hits')+' in this game. Work on placing an aerial just before touching down.'};
  }
  window.FightRecords={Book,coaching,prefix,limit};
})();
