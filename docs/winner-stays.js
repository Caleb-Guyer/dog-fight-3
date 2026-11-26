(() => {
  'use strict';
  const {fighters,validCoat}=window.DogFight, kinds=Object.keys(fighters);
  const key='dog-fight-3.winner-stays.1';
  function player(number,kind,coat=0){
    return {name:'Player '+number,kind,coat,wins:0,played:0,streak:0,best:0};
  }
  const natural=n=>Number.isSafeInteger(n) && n>=0;
  function valid(p){
    return p && typeof p.name==='string' && p.name.trim().length>0 && p.name.length<=16 &&
      Object.hasOwn(fighters,p.kind) && validCoat(p.coat) && [p.wins,p.played,p.streak,p.best].every(natural) &&
      p.streak<=p.best && p.best<=p.wins && p.wins<=p.played;
  }
  class Lineup {
    constructor(settings){
      this.bout=1;this.serial=3;this.sets=!!settings.bestOfThree;
      this.rules=window.DogFight.versusRules(settings);
      this.players=[player(1,settings.p1,settings.coats?.[0]??0),player(2,settings.p2,settings.coats?.[1]??0),player(3,'noodle')];
    }
    static read(storage){
      try{
        const s=JSON.parse(storage.getItem(key));
        if(s && natural(s.bout) && s.bout>0 && natural(s.serial) && typeof s.sets==='boolean' &&
          Array.isArray(s.players) && s.players.length>=3 && s.players.length<=8 && s.players.every(valid) && s.serial>=s.players.length)
          return Object.assign(Object.create(Lineup.prototype),{bout:s.bout,serial:s.serial,sets:s.sets,players:s.players,
            rules:s.rules?window.DogFight.versusRules(s.rules):null});
      }catch{}
      return null;
    }
    save(storage){
      try{storage.setItem(key,JSON.stringify(this));return true;}catch{return false;}
    }
    add(){
      if(this.players.length>=8)return false;
      this.players.push(player(++this.serial,kinds[(this.serial-1)%kinds.length]));return true;
    }
    remove(index){
      if(!Number.isInteger(index)||index<2 || index>=this.players.length || this.players.length===3)return false;
      this.players.splice(index,1);return true;
    }
    remember(dogs,coats){
      for(let i=0;i<2;i++)Object.assign(this.players[i],{kind:dogs[i],coat:coats[i]});
    }
    get pair(){return this.players.slice(0,2);}
    handoff(winner,tags){
      const challenger=1-winner;
      return tags[winner]+' keeps P'+(winner+1)+' · '+this.players[winner].streak+
        ' win streak. Pass P'+(challenger+1)+' to '+this.players[challenger].name+'.';
    }
    finish(bout,winner){
      if(bout!==this.bout || (winner!==0 && winner!==1))return false;
      const champ=this.players[winner],lost=this.players[1-winner];
      champ.played++;lost.played++;champ.wins++;champ.streak++;
      champ.best=Math.max(champ.best,champ.streak);lost.streak=0;
      this.players[1-winner]=this.players.splice(2,1)[0];this.players.push(lost);this.bout++;
      return true;
    }
  }
  function board(root,line,{portrait,save,play,back,end}){
    root.innerHTML='<p>Win to keep your seat. The next challenger takes the other controller.</p>'+
      '<ol class="rotation-line" aria-label="Players in rotation"></ol><p id="rotation-save" role="status"></p>'+
      '<div class="dialog-actions"><button id="rotation-play" class="primary">Choose fighters</button>'+
      '<button id="rotation-add" class="utility">Add player</button><button id="rotation-format" class="utility"></button></div>'+
      '<div class="dialog-actions"><button id="rotation-exit" class="utility">Back</button>'+
      '<button id="rotation-end" class="utility">End rotation</button></div>';
    const $=s=>root.querySelector(s),list=$('.rotation-line');
    function persist(){
      $('#rotation-save').textContent=save()?'Lineup saved in this tab. An unfinished bout restarts from game one.':'Lineup available until this page closes.';
    }
    function draw(){
      list.replaceChildren();
      line.players.forEach((p,i)=>{
        const row=document.createElement('li');row.dataset.rotationSlot=i;
        row.innerHTML='<img alt=""><div><label><strong></strong><input type="text" maxlength="16" autocomplete="off" spellcheck="false"></label><small></small></div>';
        row.querySelector('img').src=portrait(p.kind,p.coat);
        const role=i<2?'P'+(i+1):i===2?'Up next':'In line · '+(i-1);
        row.querySelector('strong').textContent=role;
        const input=row.querySelector('input');input.value=p.name;input.setAttribute('aria-label',role+' player name');
        input.oninput=()=>{const name=input.value.trim();if(name){p.name=name;persist();}};
        input.onblur=()=>{input.value=p.name;};
        const score=p.wins+'W / '+(p.played-p.wins)+'L';
        row.querySelector('small').textContent=fighters[p.kind].name+' · '+score+(p.best?' · Best '+p.best:'')+(p.streak?' · Streak '+p.streak:'');
        if(i>=2 && line.players.length>3){
          const b=document.createElement('button');b.className='utility';b.textContent='Leave line';
          b.setAttribute('aria-label','Remove '+p.name+' from the line');
          b.onclick=()=>{line.remove(i);persist();draw();$('#rotation-add').focus();};row.append(b);
        }
        list.append(row);
      });
      $('#rotation-add').disabled=line.players.length===8;
      $('#rotation-format').textContent='Format · '+(line.sets?'Best of three':'Single game');
      $('#rotation-play').textContent='Choose fighters · Bout '+line.bout;
    }
    $('#rotation-add').onclick=()=>{if(line.add()){persist();draw();list.lastChild.querySelector('input').focus();}};
    $('#rotation-format').onclick=()=>{line.sets=!line.sets;persist();draw();};
    $('#rotation-play').onclick=play;$('#rotation-exit').onclick=back;
    $('#rotation-end').onclick=()=>{
      const actions=$('#rotation-end').parentElement;
      actions.innerHTML='<button class="utility" id="rotation-keep">Keep playing</button><button class="utility" id="rotation-clear">Clear lineup and scores</button>';
      $('#rotation-keep').onclick=()=>board(root,line,{portrait,save,play,back,end});
      $('#rotation-clear').onclick=end;$('#rotation-keep').focus();
    };
    persist();draw();$('#rotation-play').focus({preventScroll:true});
  }
  window.WinnerStays={Lineup,board,key};
})();
