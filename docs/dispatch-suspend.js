(() => {
  'use strict';
  const database='dog-fight-3.suspended', format=1;
  function mission(chapter,room){
    const book=window.DispatchScript.chapters.find(b=>b.number===chapter);
    return book && (book.bonus?.id===room?book.bonus:Number.isInteger(room)?book.rooms[room]:null);
  }
  function capture(run){
    if(run.mode!=='adventure' || run.finished || !mission(run.chapter,run.roomIndex))throw Error('Mission unavailable');
    const {emit,random,...state}=run;
    const dog=run.dogs[0],id='suspend-'+run.chapter+'-'+run.roomIndex;
    const header={format,id,token:crypto.randomUUID(),chapter:run.chapter,room:run.roomIndex,playedAt:Date.now(),stocks:dog.stocks,damage:dog.damage};
    return {header,seed:random.state,state:structuredClone(state)};
  }
  function restore(run,record){
    const {header,seed,state}=record;
    if(!valid(record) || header.chapter!==run.chapter || header.room!==run.roomIndex ||
       state.dogs[0].kind!==run.dogs[0].kind)throw Error('Incompatible mission');
    // IndexedDB clones the whole graph, including both ends of a grab and the crew's fighter references.
    Object.assign(run,state);
    run.random.state=seed;
    if(run.bridge)Object.setPrototypeOf(run.bridge,window.DispatchBridge.prototype);
  }
  function valid(record){
    if(!record?.header || !record.state)return false;
    const {header:h,state:s}=record,book=window.DispatchScript.chapters[h.chapter-1];
    return h.format===format && mission(h.chapter,h.room) && s.chapter===h.chapter && s.roomIndex===h.room &&
      s.mode==='adventure' && !s.finished && Number.isInteger(record.seed) && s.dogs?.[0]?.kind===book.chapterFighter &&
      Array.isArray(s.terrain) && Array.isArray(s.foes);
  }
  const schoolId='school-stock';
  function schoolCapture(position){
    const {battle,tape,corner,countdown,lastCount,call,seed:openingSeed}=position;
    if(battle.mode!=='solo' || battle.end!==null || !position.config.schoolFinal || !corner || !tape)
      throw Error('First match unavailable');
    tape.captureKnockouts(battle);
    const {emit,random,...state}=battle;
    const [pip,brisket]=battle.dogs;
    const header={format,id:schoolId,token:crypto.randomUUID(),playedAt:Date.now(),stocks:pip.stocks,
      damage:pip.damage,rivalStocks:brisket.stocks,rivalDamage:brisket.damage,coat:battle.coatFor(0)};
    return structuredClone({header,state,openingSeed,seed:random.state,corner,countdown,lastCount,call,
      packed:tape.length?window.MatchReview.pack(tape):null,
      returning:tape.returning?tape.knockouts.find(c=>c.returnTape===tape.returning)?.first:null});
  }
  function schoolPosition(record){
    const {state,corner,header}=record;
    if(header?.id!==schoolId || header.format!==format || state?.end!==null || state?.mode!=='solo' ||
        state.stage!=='picnic' || state.dogs?.[0]?.kind!=='pip' || state.dogs?.[1]?.kind!=='brisket' ||
        !Number.isInteger(record.seed) || !Number.isInteger(record.openingSeed) || !(corner?.seen instanceof Set))
      throw Error('Saved first match unavailable');
    const coach=new window.FightSchool.Corner(corner.target?.id);
    const target=coach.target && Object.assign(coach.target,corner.target);
    Object.assign(coach,corner,{target});
    return {checkpoint:record,corner:coach,tape:window.MatchReview.resumeTape(record.packed,state.matchCard.losses,record.returning),
      countdown:record.countdown,lastCount:record.lastCount,call:record.call};
  }
  function writeSchool(slot,record){
    const write=slot.writes.then(()=>transact('readwrite',(headers,runs,done)=>{
      const read=headers.get(schoolId);
      read.onsuccess=()=>{
        const current=read.result;
        const owned=slot.previous?current?.token===slot.previous.token:!current || current.playedAt<slot.began;
        if(!owned){done(false);return;}
        if(record){headers.put(record.header);runs.put(record,schoolId);}
        else {headers.delete(schoolId);runs.delete(schoolId);}
        done(true);
      };
    })).then(written=>{
      if(!written){
        if(record)throw Error('Another tab has a newer first match.');
        return;
      }
      slot.previous=record?.header || null;
    });
    slot.writes=write.catch(()=>{});
    return write;
  }
  function schoolCard(h){
    const score=(n,p)=>n+(n===1?' stock':' stocks')+' · '+Math.round(p)+'%';
    return {...h,kind:'pip',title:'First stock match',action:'Resume fight',
      detail:'Pip '+score(h.stocks,h.damage)+' / Brisket '+score(h.rivalStocks,h.rivalDamage)};
  }
  function transact(mode,operation){
    return new Promise((resolve,reject)=>{
      const opening=indexedDB.open(database,1);
      let blocked=false;
      opening.onblocked=()=>{blocked=true;reject(Error('Mission storage is busy'));};
      opening.onupgradeneeded=()=>{
        opening.result.createObjectStore('headers',{keyPath:'id'});
        opening.result.createObjectStore('runs');
      };
      opening.onerror=()=>reject(opening.error);
      opening.onsuccess=()=>{
        const db=opening.result;
        if(blocked){db.close();return;}
        const tx=db.transaction(['headers','runs'],mode);
        let result;
        tx.oncomplete=()=>{db.close();resolve(result);};
        tx.onabort=()=>{db.close();reject(tx.error || Error('Save interrupted'));};
        try{operation(tx.objectStore('headers'),tx.objectStore('runs'),value=>{result=value;});}
        catch(error){tx.abort();reject(error);}
      };
    });
  }
  function save(run){
    const record=capture(run);
    return transact('readwrite',(headers,runs,done)=>{
      headers.put(record.header);runs.put(record,record.header.id);done(record.header);
    });
  }
  function list(){
    return transact('readonly',(headers,runs,done)=>{
      const read=headers.getAll();
      read.onsuccess=()=>done(read.result.filter(h=>h.format===format && (h.id===schoolId || mission(h.chapter,h.room))).map(h=>{
        if(h.id===schoolId)return schoolCard(h);
        const book=window.DispatchScript.chapters[h.chapter-1];
        return {...h,kind:book.chapterFighter,title:mission(h.chapter,h.room).name,action:'Resume mission',
          detail:'Suspended · '+h.stocks+(h.stocks===1?' stock':' stocks')+' · '+Math.round(h.damage)+'%'};
      }));
    });
  }
  async function load(id){
    const record=await transact('readonly',(headers,runs,done)=>{
      const read=runs.get(id);read.onsuccess=()=>done(read.result);
    });
    if(id===schoolId && record?.header?.id===schoolId)return record;
    if(!valid(record))throw Error('Saved mission unavailable');
    return record;
  }
  function clear(header){
    return transact('readwrite',(headers,runs)=>{
      const read=headers.get(header.id);
      read.onsuccess=()=>{if(read.result?.token===header.token){headers.delete(header.id);runs.delete(header.id);}};
    });
  }
  window.DispatchSuspend={capture,restore,save,list,load,clear,schoolCapture,schoolPosition,schoolCard,writeSchool};
})();
