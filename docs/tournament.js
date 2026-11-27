(() => {
  'use strict';
  const {fighters,arenas,StockSet,validCoat,versusRules}=window.DogFight;
  const kinds=Object.keys(fighters),key='dog-fight-3.tournament.1';
  const seeds={2:[1,2],4:[1,4,2,3],8:[1,8,4,5,2,7,3,6]};
  const rounds={2:'Final',4:'Semifinals',8:'Quarterfinals'};
  function entrant(n,kind,coat=0){return {name:'Player '+n,kind,coat};}
  function validScore(score,sets){
    const goal=sets?2:1;
    return Array.isArray(score) && score.length===2 && score.every(n=>Number.isInteger(n) && n>=0 && n<=goal) &&
      Math.max(...score)===goal && score[0]!==score[1];
  }
  class Bracket {
    constructor(settings){
      this.rules=versusRules(settings);this.sets=this.rules.bestOfThree;
      this.started=false;this.serial=4;this.results=[];this.progress=null;this.playedAt=0;
      this.players=[entrant(1,settings.p1,settings.coats?.[0]),entrant(2,settings.p2,settings.coats?.[1]),
        entrant(3,'noodle'),entrant(4,'clover')];
    }
    static read(storage){
      try{
        const s=JSON.parse(storage.getItem(key));
        if(!s || !Array.isArray(s.players) || s.players.length<2 || s.players.length>8 ||
          !s.players.every(p=>p && typeof p.name==='string' && p.name.trim() && p.name.length<=16 && Object.hasOwn(fighters,p.kind) && validCoat(p.coat)) ||
          !Number.isSafeInteger(s.serial) || s.serial<s.players.length || typeof s.started!=='boolean' || typeof s.sets!=='boolean' ||
          !Array.isArray(s.results) || s.results.length>s.players.length-1 || !s.started && s.results.length ||
          !s.results.every(score=>validScore(score,s.sets)))return null;
        const bracket=Object.assign(Object.create(Bracket.prototype),{rules:versusRules(s.rules || {}),players:s.players,
          started:s.started,results:s.results,sets:s.sets,serial:s.serial,progress:s.progress || null,playedAt:Number.isSafeInteger(s.playedAt)?s.playedAt:0});
        if(!bracket.restoreSet())bracket.progress=null;
        return bracket;
      }catch{return null;}
    }
    save(storage){try{storage.setItem(key,JSON.stringify(this));return true;}catch{return false;}}
    syncRules(settings){
      if(this.started)return;
      const ownFormat=this.sets!==this.rules.bestOfThree;
      this.rules=versusRules(settings);
      if(!ownFormat)this.sets=this.rules.bestOfThree;
    }
    add(){
      if(this.started || this.players.length>=8)return false;
      this.players.push(entrant(++this.serial,kinds[(this.serial-1)%kinds.length]));return true;
    }
    remove(i){
      if(this.started || this.players.length<=2 || !Number.isInteger(i) || !this.players[i])return false;
      this.players.splice(i,1);return true;
    }
    shuffle(random=Math.random){
      if(this.started)return;
      for(let i=this.players.length-1;i>0;i--){
        const j=Math.floor(random()*(i+1));
        [this.players[i],this.players[j]]=[this.players[j],this.players[i]];
      }
    }
    bracket(){
      const size=2**Math.ceil(Math.log2(this.players.length));
      // Null is an opening bye. Undefined is a player who has yet to qualify.
      let field=seeds[size].map(n=>n<=this.players.length?n-1:null),played=0,next=null;
      const stages=[];
      while(field.length>1){
        const matches=[];
        for(let i=0;i<field.length;i+=2){
          const pair=field.slice(i,i+2),match={pair,title:field.length===2?'Final':(field.length===4?'Semifinal ':'Quarterfinal ')+(i/2+1)};
          if(pair.includes(null))match.winner=pair.find(id=>id!==null);
          else if(pair.every(Number.isInteger)){
            match.score=this.results[played++];
            if(match.score)match.winner=pair[Number(match.score[1]>match.score[0])];
            else if(!next)next=match;
          }
          matches.push(match);
        }
        stages.push({title:rounds[field.length],matches});field=matches.map(m=>m.winner);
      }
      return {stages,next,champion:field[0]};
    }
    get bout(){return this.results.length+1;}
    get roundName(){return this.bracket().next?.title;}
    get pair(){return this.bracket().next?.pair.map(i=>this.players[i]);}
    remember(dogs,coats){this.pair.forEach((p,i)=>Object.assign(p,{kind:dogs[i],coat:coats[i]}));}
    restoreSet(){
      const p=this.progress;
      if(!p || !this.started || !this.sets || !this.pair || p.bout!==this.bout ||
        !Number.isInteger(p.seed) || p.seed<0 || p.seed>0xffffffff ||
        !Array.isArray(p.games) || !p.games.length || p.games.length>3)return null;
      let set;
      for(const [i,g] of p.games.entries()){
        if(!g || typeof g.stage!=='string' || !Object.hasOwn(arenas,g.stage))return null;
        if(!set)set=new StockSet(g.stage);
        else if(!set.advance(g.stage))return null;
        if(g.winner===null){
          if(i!==p.games.length-1 || g.card)return null;
        }else if(!window.FightRecords.validCard(g.card) || !set.finish(g.winner,null,g.card) || set.champion!==null)return null;
      }
      return set;
    }
    openGame(bout,set,seed){
      if(!this.started || !this.sets || bout!==this.bout || !this.pair || set.current.winner!==null)return seed;
      const old=this.progress;
      this.playedAt=Date.now();
      if(old?.bout===bout && old.games.length===set.games.length && old.games.at(-1).winner===null && old.games.at(-1).stage===set.current.stage)return old.seed;
      this.progress={bout,seed,games:structuredClone(set.games)};
      return seed;
    }
    finishGame(bout,set,winner,card){
      if(bout!==this.bout || this.progress?.bout!==bout || this.progress.games.length!==set.games.length ||
        this.progress.games.at(-1).winner!==null || !set.finish(winner,null,card))return false;
      if(set.champion!==null)return this.finish(bout,winner,set.score);
      this.progress.games=structuredClone(set.games);this.playedAt=Date.now();return true;
    }
    finish(bout,winner,score){
      if(!this.started || bout!==this.bout || !this.pair || (winner!==0 && winner!==1))return false;
      const result=score || (winner?[0,1]:[1,0]);
      if(!validScore(result,this.sets) || result[winner]<=result[1-winner])return false;
      this.results.push(result.slice());this.progress=null;this.playedAt=Date.now();return true;
    }
    continueCard(){
      if(!this.started || !this.pair)return null;
      const set=this.restoreSet(),first=this.pair[0];
      const detail=this.roundName+(set?' · Game '+(set.games.length+Number(set.picker!==null))+' · P1 '+set.score[0]+' – '+set.score[1]+' P2':' · Choose fighters');
      return {id:'tournament',title:'Local tournament',kind:first.kind,coat:first.coat,playedAt:this.playedAt,detail,action:'Open bracket'};
    }
    handoff(winner,tags){
      return this.bracket().champion!==undefined?tags[winner]+' wins the tournament!':tags[winner]+' advances. Next up is '+this.pair.map(p=>p.name).join(' vs. ')+'.';
    }
  }
  function board(root,line,{portrait,save,play,back,end}){
    const btn=(id,label,primary=false)=>'<button type="button" class="'+(primary?'primary':'utility')+'" id="tourney-'+id+'">'+label+'</button>';
    const el=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
    const get=id=>root.querySelector('#tourney-'+id);
    const state=line.bracket(),champ=line.players[state.champion],set=line.restoreSet();
    const game=set && set.games.length+Number(set.picker!==null);
    const icon=(p)=>{const img=new Image();img.alt='';img.src=portrait(p.kind,p.coat);return img;};
    const persist=()=>{
      const message=champ?'Results saved in this tab.':line.started?'Progress saved in this tab. Completed games count when you return.':'Signup saved in this tab.';
      get('status').textContent=save()?message:'Progress lasts until you leave this page.';
    };
    const redraw=()=>board(root,line,{portrait,save,play,back,end});
    root.innerHTML=(line.started?'':'<p>Enter two to eight players in seed order. Higher seeds receive first-round byes.</p><ol class="rotation-line" id="tourney-roster"></ol>'+
      '<div class="dialog-actions">'+btn('add','Add player')+btn('shuffle','Shuffle seeds')+btn('format',line.sets?'Best of three':'Single game')+'</div>')+
      '<div id="tourney-call" aria-live="polite"></div><div id="tourney-grid" aria-label="Tournament bracket"></div>'+
      '<p id="tourney-rules"></p><div class="dialog-actions">'+(champ?'':btn('play',set?(set.picker===null?'Restart game ':'Counterpick for game ')+game:line.started?'Choose fighters':'Start tournament',true))+
      btn('back','Back')+btn('end',champ?'New tournament':'Clear tournament')+'</div><p role="status" id="tourney-status"></p>';
    const r=line.rules;
    get('rules').textContent=[line.sets?'Best of three':'Single game',r.timed?'Time Battle':r.lives+(r.lives===1?' stock':' stocks'),
      r.minutes?r.minutes+' min':'No clock',window.DogFight.stageForms[r.stageForm].name,'Fetch '+(r.fetch?'on':'off'),
      ...(r.handicap?['P1 '+r.handicap[0]+'% / P2 '+r.handicap[1]+'%']:[])].join(' · ');
    function drawTree(){
      const grid=get('grid');grid.replaceChildren();
      for(const stage of state.stages){
        const col=el('section',''),pairs=el('div','');pairs.className='bracket-pairs';col.append(el('h3',stage.title),pairs);
        for(const m of stage.matches){
          const card=el('div','');card.className='bracket-match';card.setAttribute('aria-label',m.title);
          if(line.started && m===state.next)card.setAttribute('aria-current','step');
          const score=m.score || (m===state.next && set?.score);
          for(const [side,id] of m.pair.entries()){
            const p=line.players[id],row=el('div','');
            if(p){row.append(el('small','#'+(id+1)),icon(p),el('span',p.name));if(score)row.append(el('b',String(score[side])));}
            else row.append(el('small',id===null?'Bye':'To be decided'));
            if(p && m.winner===id)row.className='bracket-winner';
            card.append(row);
          }
          pairs.append(card);
        }
        grid.append(col);
      }
      const call=get('call');call.replaceChildren();
      if(champ)call.append(icon(champ),el('strong',champ.name+' wins the tournament!'));
      else if(line.started){
        call.append(el('strong',state.next.title+' · '+line.pair.map(p=>p.name).join(' vs. ')));
        if(set)call.append(el('span',set.picker===null?'Game '+game+' restarts on '+arenas[set.current.stage].name+'.':
          line.pair[set.picker].name+' chooses the fighter and arena for game '+game+'.'));
      }
    }
    if(!line.started){
      line.players.forEach((p,i)=>{
        const row=el('li',''),wrap=el('div',''),label=el('label',''),input=document.createElement('input');
        input.value=p.name;input.maxLength=16;input.autocomplete='off';input.setAttribute('aria-label','Seed '+(i+1)+' name');
        label.append(el('strong','#'+(i+1)),input);wrap.append(label);row.append(icon(p),wrap);
        input.oninput=()=>{const name=input.value.trim();if(name){p.name=name;persist();drawTree();}};
        input.onblur=()=>{input.value=p.name;};
        if(line.players.length>2){
          const b=el('button','Remove');b.className='utility';b.setAttribute('aria-label','Remove seed '+(i+1));
          b.onclick=()=>{line.remove(i);redraw();get('add').focus();};row.append(b);
        }
        get('roster').append(row);
      });
      get('add').disabled=line.players.length===8;
      get('add').onclick=()=>{line.add();redraw();get('roster').lastChild.querySelector('input').focus();};
      get('shuffle').onclick=()=>{line.shuffle();redraw();get('shuffle').focus();};
      get('format').onclick=()=>{line.sets=!line.sets;redraw();get('format').focus();};
    }
    if(!champ)get('play').onclick=()=>{if(line.started)return play();line.started=true;line.playedAt=Date.now();redraw();};
    get('back').onclick=back;
    get('end').onclick=()=>{
      if(champ)return end();
      const actions=get('end').parentElement;
      actions.innerHTML=btn('keep','Keep tournament',true)+btn('clear','Clear players and results');
      get('keep').onclick=redraw;get('clear').onclick=end;get('keep').focus();
    };
    drawTree();persist();(get('play') || get('end')).focus({preventScroll:true});
  }
  window.LocalTournament={Lineup:Bracket,board,key};
})();
