/* Yard band score. Each cell is an eighth note; a dash ties the preceding pitch. */
(() => {
  'use strict';
  const scores = {};
  const pitches = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  function midi(token) {
    const [,letter,accidental,octave]=/^([A-G])([#b]?)(\d)$/.exec(token);
    return (Number(octave)+1)*12+pitches[letter]+(accidental==='#'?1:accidental==='b'?-1:0);
  }
  const verse = [0,1,2,3,0,1,2,4,5,6,7,8,5,6,2,9];
  function score(id,title,bpm,swing,lead,bass,comp,drums,lines,form=verse,loop=true) {
    const bars=lines.split('\n').map(line=>{
      const [chord,...cells]=line.trim().split(/\s+/);
      const minor=chord.endsWith('m'), root=midi(minor?chord.slice(0,-1):chord);
      const notes=cells.map((token,i)=>{
        if(token==='.' || token==='-') return null;
        let steps=1;
        while(cells[i+steps]==='-') steps++;
        return {pitch:midi(token),steps};
      });
      return {root,third:minor?3:4,notes};
    });
    scores[id]={id,title,bpm,swing,lead,bass,comp,drums,bars,form,loop,meter:drums.length};
  }
  score('menu','Gate’s Open',102,.08,'keys','R...F.O.','.t.f.t.f','k.h.s.h.',`C3 E4 - G4 . C5 - B4 G4
    A2m A4 - E4 . . G4 A4 .
    F2 A4 C5 - . F5 - E5 C5
    G2 D5 - B4 . G4 . D4 .
    G2 B4 D5 - . G5 - - .
    D3m F5 - E5 D5 A4 . C5 .
    G2 B4 . D5 - E5 D5 B4 .
    C3 G4 E4 - . C5 . G4 .
    E2m B4 - G4 . E4 . G4 B4
    C3 E5 - D5 C5 - - . .`);
  score('picnic','Table Scraps',144,.07,'pulse','R.O.F.RF','.t..f.t.','k.h.s.hk',`G2 G4 B4 D5 . B4 - A4 G4
    C3 E5 . D5 C5 G4 - . A4
    D3 D5 F#5 . E5 D5 A4 B4 .
    G2 G4 . D4 G4 B4 - . D5
    D3 A4 D5 F#5 . A5 - . F#5
    E3m G5 - B5 . G5 F#5 E5 .
    C3 E5 G5 . E5 D5 C5 B4 .
    A2m A4 - C5 E5 G5 E5 C5 .
    D3 D5 . A4 D5 F#5 - A5 .
    G2 G5 - D5 B4 G4 - - .`);
  score('laundry','Clothesline Waltz',132,.04,'bell','R..F..','.t.f.t','k.hsh.',`D3 F#4 - A4 D5 - .
    A2 C#5 - E5 B4 A4 .
    B2m D5 F#5 - D5 B4 .
    G2 A4 - G4 D4 - .
    A2 E5 - C#5 A4 B4 C#5
    G2 G5 - F#5 E5 D5 B4
    D3 A4 D5 - F#5 - .
    E3m E5 - B4 G4 A4 B4
    A2 C#5 E5 - A5 - .
    D3 D5 - A4 D5 - -`);
  score('bandstand','Moonbell Stomp',124,.24,'horn','R.F.OR.F','.t..f..t','k.hs.hsk',`Bb2 D5 . F5 - . G5 F5 D5
    Eb3 Eb5 G5 . Bb5 - G5 . F5
    F3 C5 . A4 C5 F5 - Eb5 C5
    Bb2 Bb4 - . F4 Bb4 D5 . .
    F3 F5 - A5 . C6 Bb5 A5 .
    G2m Bb5 - A5 G5 D5 - . F5
    C3m G5 . Eb5 C5 . Eb5 G5 .
    Eb3 Bb4 Eb5 . G5 Bb5 - G5 .
    F3 A5 G5 F5 . C5 . A4 C5
    Bb2 D5 F5 . D5 Bb4 - - .`);
  score('nightmail','Overnight Freight',152,0,'reed','R.RF.ROF','..f.t..f','khhskhsh',`E2m B4 - . E5 G5 . F#5 E5
    C3 G4 . C5 E5 - B4 C5 .
    D3 A4 D5 - . F#5 E5 D5 A4
    B2 F#4 - B4 . D#5 - B4 A4
    B2 B4 D#5 F#5 . B5 - A5 F#5
    A2m E5 - . A5 G5 E5 C5 .
    E2m B4 . G5 F#5 E5 B4 . D5
    C3 C5 E5 - . G5 E5 C5 G4
    B2 A4 B4 D#5 F#5 . D#5 B4 .
    E2m G5 - F#5 E5 B4 . E5 -`);
  score('canal','Lockstep',164,0,'mallet','R..O.F','.t..f.','kh.sk.',`A2m E5 A5 . G5 E5 C5
    G2 D5 . G5 B5 - A5
    F2 A5 - F5 E5 C5 .
    E2 G#4 B4 E5 . B4 .
    E2 B4 E5 G#5 B5 - .
    D3m F5 - E5 D5 A4 D5
    A2m E5 . C5 A4 C5 E5
    F2 F5 A5 . C6 A5 F5
    E2 G#5 - E5 B4 D5 E5
    A2m A5 - E5 A4 - .`);
  score('deadletter','Third Floor Bell',118,.06,'mallet','R..OF.R.','.t..f..t','k.hhskh.',`D3m A4 . D5 F5 - E5 D5 .
    Bb2 F4 . Bb4 D5 . A4 - .
    G2m G4 Bb4 . D5 - F5 E5 D5
    A2 C#5 - B4 . A4 . E4 .
    D3m A4 D5 . A5 G5 . F5 D5
    G2m Bb4 - D5 G5 . F5 D5 .
    A2 E5 A5 . G5 E5 . C#5 A4
    D3m F5 E5 D5 - A4 . D5 -`,[0,1,2,3,4,5,6,7]);
  const victories={
    pip:['Pip · Bell lap','pulse','G2 B4 D5 G5 . A5 B5 . D6','G2 B5 A5 G5 - - - - .'],
    brisket:['Brisket · Big finish','horn','C2 C4 . G4 - E4 G4 C5 .','C2 G4 . C5 - - - - .'],
    noodle:['Noodle · Long bow','reed','D3 A4 - D5 F#5 E5 D5 A5 .','D3 F#5 E5 D5 - - - - .'],
    clover:['Clover · Victory toss','bell','F2 F5 A5 C6 . A5 G5 F5 A5','F2 C6 . F5 - - - - .'],
  };
  for(const [kind,[title,lead,a,b]] of Object.entries(victories))
    score('win-'+kind,title,136,0,lead,'R...F...','.t..f...','k...s...',a+'\n'+b,[0,1],false);

  // Schedule short phrases against the audio clock. The simulation and rollback never advance the score.
  const colors={pulse:[1,.53,.2,.13,.09],keys:[1,.28,.12,.04],bell:[1,.05,.32,.03,0,.12],
    horn:[1,.7,.34,.15,.07],reed:[1,.09,.43,.04,.12],mallet:[1,.18,.03,.28],bass:[1,.23,.09]};
  const hz=n=>440*Math.pow(2,(n-69)/12);
  const eighth=(s,step,urgent)=>30/s.bpm*(urgent ? .93 : 1)*(1+(step%2 ? -1 : 1)*s.swing);
  function playStep(s,step,urgent,play) {
    const i=step%s.meter, bar=s.bars[s.form[Math.floor(step/s.meter)%s.form.length]];
    const beat=eighth(s,step,urgent), n=bar.notes[i];
    if(n){
      let duration=0;
      for(let j=0;j<n.steps;j++) duration+=eighth(s,step+j,urgent);
      play(s.lead,n.pitch,duration*.9,.115);
    }
    const bass=s.bass[i], comp=s.comp[i], drum=s.drums[i];
    if(bass!=='.') play('bass',bar.root+(bass==='F'?7:bass==='O'?12:0),beat*(s.bass[(i+1)%s.meter]==='.'?1.45:.71),.15);
    if(comp!=='.') play('keys',bar.root+12+(comp==='t'?bar.third:7),beat*.66,.059);
    if(drum!=='.') play(drum,0,drum==='h' ? .041 : drum==='s' ? .103 : .115,drum==='k' ? .19 : drum==='s' ? .1 : .045);
    if(urgent && i%2===1) play('bell',bar.root+24+(i%4===1?7:bar.third),beat*.5,.052);
    if(urgent && i===s.meter-1 && drum!=='s') play('s',0,.061,.065);
  }
  class Player {
    constructor(context) {
      this.context=context;
      this.waves={};
      for(const [id,harmonics] of Object.entries(colors))
        this.waves[id]=context.createPeriodicWave(new Float32Array(harmonics.length+1),Float32Array.of(0,...harmonics));
      const noise=context.createBuffer(1,Math.ceil(context.sampleRate*.12),context.sampleRate);
      const data=noise.getChannelData(0);
      let seed=7091, last=0;
      for(let i=0;i<data.length;i++){
        seed=(Math.imul(1664525,seed)+1013904223)>>>0;
        const sample=seed/2147483648-1;
        data[i]=(sample-last)*.5;last=sample;
      }
      this.noise=noise;
      this.track=null;this.bus=null;this.step=0;this.future=[];this.finished=false;
    }
    stop() {
      const now=this.context.currentTime;
      if(this.bus){
        const old=this.bus;
        old.gain.cancelScheduledValues(now);
        old.gain.setTargetAtTime(0,now,.009);
        // Scheduled voices can still be in their release tails. The new phrase gets a fresh bus.
        setTimeout(()=>old.disconnect(),100);
        this.bus=null;
      }
      const next=this.future.find(f=>f.time>now);
      if(next)this.step=next.step;
      this.future.length=0;
    }
    restart(){
      this.stop();this.step=0;this.finished=false;this.urgent=false;this.endAt=0;this.duckUntil=0;
    }
    duck(seconds){
      if(this.bus)this.duckUntil=Math.max(this.duckUntil,this.context.currentTime+seconds);
    }
    voice(kind,pitch,time,length,level) {
      const c=this.context, noise=kind==='s'||kind==='h';
      const src=noise?c.createBufferSource():c.createOscillator(), gain=c.createGain();
      if(noise) src.buffer=this.noise;
      else if(kind==='k'){
        src.type='sine';src.frequency.setValueAtTime(108,time);src.frequency.exponentialRampToValueAtTime(43,time+.085);
      } else {
        src.setPeriodicWave(this.waves[kind]);src.frequency.setValueAtTime(hz(pitch),time);
      }
      const attack=kind==='horn' ? .019 : .005;
      gain.gain.setValueAtTime(.0001,time);
      gain.gain.exponentialRampToValueAtTime(level,time+attack);
      gain.gain.exponentialRampToValueAtTime(level*(noise||kind==='bell'||kind==='mallet' ? .23 : .65),time+length*.72);
      gain.gain.exponentialRampToValueAtTime(.0001,time+length);
      src.connect(gain);gain.connect(this.bus);
      src.onended=()=>{src.disconnect();gain.disconnect();};
      src.start(time);src.stop(time+length+.002);
    }
    update(id,intense,volume,playing) {
      const c=this.context, now=c.currentTime;
      if(this.track!==id){this.restart();this.track=id;}
      if(!id || !playing || volume<=0 || c.state!=='running'){
        if(this.bus)this.stop();
        return;
      }
      if(this.finished)return;
      if(!this.bus){
        this.bus=c.createGain();this.bus.gain.value=0;this.bus.connect(c.destination);
        this.volume=-1;this.nextAt=now+.018;
      }
      const ducking=now<this.duckUntil, mix=ducking ? volume*.43 : volume;
      if(mix!==this.volume){
        this.bus.gain.setTargetAtTime(mix,now,ducking ? .009 : .045);this.volume=mix;
      }
      while(this.future.length && this.future[0].time<=now)this.future.shift();
      if(this.nextAt<now)this.nextAt=now+.012;
      const s=scores[id];
      while(this.nextAt<now+.115){
        if(!s.loop && this.step>=s.form.length*s.meter){
          if(now>=this.endAt){this.finished=true;this.stop();}
          break;
        }
        if(this.step%s.meter===0)this.urgent=!!intense;
        const at=this.nextAt;
        this.future.push({time:at,step:this.step});
        playStep(s,this.step,this.urgent,(kind,pitch,length,level)=>{
          this.voice(kind,pitch,at,length,level);this.endAt=Math.max(this.endAt,at+length);
        });
        this.nextAt+=eighth(s,this.step,this.urgent);this.step++;
      }
    }
  }
  window.YardScore={scores,Player,playStep};
})();
