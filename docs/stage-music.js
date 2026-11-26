/* Second sides for the five arena records. All notation is in eighth notes. */
(() => {
  'use strict';
  const {scores, score}=window.YardScore;
  const second={picnic:'ant-parade',laundry:'crosswind',bandstand:'lantern-swing',nightmail:'brake-van',canal:'low-water'};
  const tracks=Object.entries(second).flat();
  const home=id=>Object.keys(second).find(stage=>stage===id || second[stage]===id);
  const form=[0,1,2,3,0,1,2,4,5,6,7,8,5,6,2,9];
  score('ant-parade','Ant Parade',122,.13,'keys','R..FO..F','..t..f.t','k.h.s.hh',`F2 . A4 C5 - . A4 F4 .
    Bb2 . D5 F5 - G5 F5 D5 .
    G2m G4 . Bb4 D5 . F5 E5 D5
    C3 E5 - C5 G4 . . C4 E4
    C3 E5 . G5 - . C6 - G5
    D3m F5 A5 - . E5 F5 A5 .
    A2m E5 - C5 A4 . C5 E5 G5
    Bb2 F5 D5 . Bb4 D5 F5 - .
    C3 G5 - E5 C5 . G4 Bb4 E5
    F2 F5 . C5 A4 F4 - - .`,form);
  score('crosswind','Crosswind',158,0,'reed','R.F..OR.','.t.f..t.','kh.sk.hs',`A2 E4 A4 B4 C#5 - . B4 A4
    D3 F#4 A4 D5 E5 - . D5 A4
    E3 B4 . G#4 B4 E5 F#5 E5 .
    A2 C#5 - A4 . E4 - . .
    E3 G#4 B4 E5 . B5 - G#5 .
    F#2m A5 - G#5 F#5 C#5 . E5 .
    D3 F#5 A5 - F#5 E5 D5 A4 .
    B2m B4 D5 F#5 - E5 C#5 B4 .
    E3 B4 - E5 . G#5 E5 B4 G#4
    A2 A4 C#5 E5 - A5 - - .`,form);
  score('lantern-swing','Lantern Swing',112,.28,'mallet','R..FR.O.','..t..f.t','k.hhs.h.',`Eb3 . G4 Bb4 - . G5 F5 Eb5
    C3m G4 . Eb5 G5 - . Bb5 G5
    F3m Ab5 - . F5 C5 . Ab4 C5
    Bb2 D5 . F5 - . D5 Bb4 .
    Bb2 D5 F5 . Ab5 - G5 F5 D5
    Ab2 Eb5 . C5 Eb5 Ab5 - C6 .
    G2m Bb5 - G5 D5 . Bb4 D5 F5
    C3m G5 Eb5 . C5 Eb5 - G5 Bb5
    Bb2 F5 . D5 Bb4 F4 - . D5
    Eb3 Eb5 - Bb4 G4 Eb4 - - .`,form);
  score('brake-van','Brake Van Blues',106,.21,'horn','R.F.OR.F','.t..f..t','k.h.s.sh',`D3 . A4 C5 D5 - - F5 D5
    G2 G4 - . Bb4 B4 D5 - .
    D3 F5 E5 D5 - . C5 A4 .
    A2 C#5 - . A4 E4 G4 A4 .
    A2 E5 G5 - . E5 C#5 A4 .
    G2 B4 D5 - . F5 D5 B4 G4
    G2m Bb4 - D5 F5 - . G5 F5
    D3 A5 F5 E5 D5 . A4 C5 D5
    A2 E5 - G5 . C#5 - E5 G5
    D3 F5 E5 D5 - A4 . D5 -`,form);
  score('low-water','Low Water',100,.04,'bell','R...F.','..t..f','k.h.s.',`E3m B4 - G4 . E4 B4
    C3 C5 - G4 . E4 G4
    A2m E5 D5 C5 A4 - .
    B2 F#4 - D#4 F#4 B4 .
    B2 F#5 - D#5 B4 - .
    G2 G5 - D5 B4 D5 .
    D3 F#5 E5 D5 A4 - .
    C3 E5 G5 - E5 C5 G4
    B2 B4 D#5 F#5 - E5 D#5
    E3m E5 - B4 G4 E4 -`,form);

  const key='dog-fight-3-stage-music-v1', weights=[0,1,2,4];
  class Rotation {
    constructor(storage,random=Math.random){
      this.storage=storage;this.random=random;this.prefs={};this.bags={};this.last={};
      try {
        const saved=JSON.parse(storage.getItem(key));
        for(const stage of Object.keys(second))for(const id of tracks){
          const value=saved?.[stage]?.[id];
          if(weights.includes(value))(this.prefs[stage] ||= {})[id]=value;
        }
      } catch {}
    }
    weight(stage,id){return this.prefs[stage]?.[id] ?? (stage===id?2:second[stage]===id?1:0);}
    save(stage){
      delete this.bags[stage];
      try {this.storage.setItem(key,JSON.stringify(this.prefs));return true;} catch {return false;}
    }
    set(stage,id,value){
      if(!Object.hasOwn(second,stage) || !tracks.includes(id) || !weights.includes(value))return false;
      (this.prefs[stage] ||= {})[id]=value;return this.save(stage);
    }
    reset(stage){delete this.prefs[stage];delete this.last[stage];return this.save(stage);}
    pick(stage){
      let bag=this.bags[stage];
      if(!bag?.length){
        bag=this.bags[stage]=tracks.flatMap(id=>Array(this.weight(stage,id)).fill(id));
        if(!bag.length)return null;
      }
      let choices=bag.filter(id=>id!==this.last[stage]);
      if(!choices.length)choices=bag;
      const id=!this.last[stage] && !this.prefs[stage]?stage:choices[Math.floor(this.random()*choices.length)];
      bag.splice(bag.indexOf(id),1);this.last[stage]=id;return id;
    }
  }
  let rotation;
  const library=storage=>rotation ||= new Rotation(storage);
  const preview={id:'picnic',playing:false,urgent:false};
  const $=id=>document.getElementById(id);
  function soundTest({arenas,bonus,showDialog,play,stop,back,editor}){
    preview.playing=preview.urgent=false;
    const location=id=>arenas[home(id)]?.name || (id==='deadletter'?bonus:id==='menu'?'Main menu':'Victory');
    showDialog('sound-test','Sound Test','<div class="option-list"><label for="audition-track">Track <select id="audition-track">'+
      Object.values(scores).map(t=>'<option value="'+t.id+'">'+location(t.id)+' · '+t.title+'</option>').join('')+
      '</select></label><button id="audition-mix" type="button" aria-pressed="false">Final-stock mix</button></div>'+
      '<p id="audition-status" role="status">Stopped</p><div class="dialog-actions"><button id="audition-play" class="primary">Play from start</button>'+
      '<button id="audition-stop" class="utility">Stop</button><button id="audition-editor" class="utility">Stage music</button>'+
      '<button id="audition-back" class="utility">Options</button></div>');
    const select=$('audition-track'),mix=$('audition-mix');
    select.value=preview.id;
    const setMix=()=>{mix.hidden=!home(select.value) && select.value!=='deadletter';mix.setAttribute('aria-pressed','false');};
    setMix();
    select.onchange=()=>{preview.id=select.value;preview.urgent=false;setMix();play();};
    mix.onclick=()=>{preview.urgent=!preview.urgent;mix.setAttribute('aria-pressed',String(preview.urgent));play(false);};
    $('audition-play').onclick=()=>play();
    $('audition-stop').onclick=stop;
    $('audition-editor').onclick=()=>editor(home(select.value));
    $('audition-back').onclick=back;
    select.focus();
  }
  function editor(stage,{arenas,storage,showDialog,draw,play,stop,fight,back}){
    const mix=library(storage);
    preview.playing=preview.urgent=false;
    showDialog('stage-music','Stage music','<div class="record-sleeve"><canvas id="music-art" width="300" height="169" aria-hidden="true"></canvas>'+
      '<div><label for="music-stage">Arena</label><select id="music-stage">'+Object.entries(arenas).map(([id,a])=>'<option value="'+id+'">'+a.name+'</option>').join('')+
      '</select><label for="music-track">Track</label><select id="music-track"></select></div></div>'+
      '<div class="option-list"><label for="music-frequency">Play frequency <select id="music-frequency"><option value="0">Off</option>'+
      '<option value="1">Rare</option><option value="2">Regular</option><option value="4">Often</option></select></label></div>'+
      '<p id="music-rotation" role="status"></p><div class="dialog-actions"><button class="utility" id="audition-play">Preview</button>'+
      '<button class="utility" id="audition-mix" aria-pressed="false">Final-stock mix</button><button class="utility" id="audition-stop">Stop</button></div>'+
      '<p id="audition-status" role="status">Stopped</p><div class="dialog-actions"><button class="primary" id="music-fight">Fight to this track</button>'+
      '<button class="utility" id="music-reset">Restore this arena</button><button class="utility" id="music-back">Back</button></div>');
    const arena=$('music-stage'),song=$('music-track'),freq=$('music-frequency');
    function describe(saved=true){
      const count=tracks.filter(id=>mix.weight(arena.value,id)>0).length;
      freq.value=mix.weight(arena.value,song.value);
      $('music-rotation').textContent=(count?count+' track'+(count===1?'':'s')+' in rotation.':'Quiet arena. No tracks in rotation.')+(saved?'':' Changes last for this visit.');
    }
    function selectTrack(){
      preview.id=song.value;preview.urgent=false;
      $('audition-mix').setAttribute('aria-pressed','false');describe();
      if(preview.playing)play();
    }
    function selectArena(){
      const id=arena.value;
      song.innerHTML=[id,second[id],...tracks.filter(t=>home(t)!==id)].map(t=>'<option value="'+t+'">'+scores[t].title+'</option>').join('');
      draw($('music-art'),id,'original');selectTrack();
    }
    arena.value=stage;selectArena();
    arena.onchange=selectArena;song.onchange=selectTrack;
    freq.onchange=()=>describe(mix.set(arena.value,song.value,Number(freq.value)));
    $('music-reset').onclick=()=>describe(mix.reset(arena.value));
    $('audition-play').onclick=()=>play();$('audition-stop').onclick=stop;
    $('audition-mix').onclick=()=>{preview.urgent=!preview.urgent;$('audition-mix').setAttribute('aria-pressed',String(preview.urgent));play(false);};
    $('music-fight').onclick=()=>fight(arena.value,song.value);
    $('music-back').onclick=back;
    song.focus({preventScroll:true});
  }
  window.StageMusic={Rotation,tracks,home,library,preview,soundTest,editor};
})();
