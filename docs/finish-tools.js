(() => {
  'use strict';
  const workerURL=new URL('finish-gif.js?v=finish-gif-1',document.currentScript.src);
  const {moves,specials,throws,smashes,pummels}=window.DogFight;
  function analyze(tape,slot){
    const list=[];
    let player,escape=null,knockedOut=false,lifeStart=0;
    const markEscape=(frame,label)=>{escape={frame:Math.max(lifeStart,frame-15),label};};
    player=tape.playback(0,(event,e)=>{
      const frame=player.frame+1;
      let label;
      if(event==='hit' || event==='throwRelease'){
        const who=event==='hit'?e.owner:e.f, id=e.moveId;
        const move=(moves[id] || specials[id] || smashes[id] || pummels[id] || throws[id])?.label || e.name || 'Hit';
        label=(who?who.stats.name+' · ':'')+move;
        const target=event==='hit'?e.f:e.target;
        if(target?.index===slot)markEscape(frame,'Before '+move);
      }else if(event==='ko'){
        label=e.f.stats.name+' · KO';
        if(e.f.index===slot)knockedOut=true;
      }
      else if(event==='parry')label=e.f.stats.name+' · Parry';
      else if(event==='win' && player.battle.endReason==='time')label='Time expired';
      if(!label)return;
      if(list.at(-1)?.frame===frame && list.at(-1).label===label)return;
      list.push({frame,label});
    });
    while(player.frame<player.length){
      const dog=player.battle.dogs[slot];
      const planted=dog && (dog.ground>=0 || dog.ledge) && !dog.stun && !dog.tumble && !dog.grip && !dog.stockLift;
      knockedOut=false;
      player.step();
      if(knockedOut){
        if(player.frame<player.length){escape=null;lifeStart=player.frame;}
      }else if(planted && dog.ground<0 && !dog.ledge && !dog.tumble && !dog.stun && !dog.grip && !dog.reaction){
        markEscape(player.frame,'Before leaving the stage');
      }
    }
    return {marks:list.slice(-4),escape:escape || {frame:Math.max(lifeStart,player.length-90),label:'Before the knockout'}};
  }
  const moments=tape=>analyze(tape).marks;
  function buildGIF(tape,stage,shake,signal,progress){
    return new Promise((resolve,reject)=>{
      if(signal.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
      const arena=document.createElement('canvas'),out=document.createElement('canvas');
      arena.width=1200;arena.height=675;out.width=480;out.height=300;
      const ctx=out.getContext('2d',{willReadFrequently:true});
      const view=new window.DogFightView.FightView();view.shakeEnabled=shake;
      const player=tape.playback(0,(event,e)=>view.event(event,e));
      const worker=new Worker(workerURL);
      const stop=()=>{worker.terminate();signal.removeEventListener('abort',cancel);};
      const fail=e=>{stop();reject(e);};
      const cancel=()=>fail(new DOMException('Cancelled','AbortError'));
      signal.addEventListener('abort',cancel,{once:true});
      worker.onerror=()=>fail(new Error('GIF worker unavailable'));
      worker.onmessageerror=()=>fail(new Error('GIF data unavailable'));
      let drawn=-1;
      worker.onmessage=({data})=>{
        if(data instanceof Blob){stop();resolve(data);return;}
        try{
          if(drawn===player.length){worker.postMessage({type:'finish'});return;}
          const target=drawn<0?0:Math.min(player.length,drawn+3);
          while(player.frame<target)player.step();
          const w=player.battle;
          view.draw(arena,w,drawn<0?0:(target-drawn)/60,w.time);
          ctx.imageSmoothingEnabled=false;ctx.drawImage(arena,0,0,out.width,270);
          ctx.fillStyle='#252337';ctx.fillRect(0,270,out.width,30);
          ctx.font='12px "Brawl Pixel", monospace';ctx.textBaseline='middle';
          w.dogs.forEach((d,i)=>{
            ctx.fillStyle=i?'#a3d9eb':'#ffbb85';ctx.textAlign=i?'right':'left';
            const score=w.matchCard?.points?w.matchCard.points[i]+' pts':d.stocks+' stock'+(d.stocks===1?'':'s');
            ctx.fillText('P'+(i+1)+' '+d.stats.name+'   '+Math.round(d.damage)+'%   '+score,i?474:6,279,220);
          });
          ctx.fillStyle='#f8ebc9';ctx.textAlign='center';ctx.font='10px "Brawl Pixel", monospace';
          ctx.fillText('Dog Fight 3  ·  '+stage+(w.end===null?'':'  ·  '+w.dogs[w.end].stats.name+' wins'),240,293,468);
          drawn=target;
          const next=Math.min(player.length,target+3);
          const delay=target===player.length?75:Math.max(2,Math.round(next*100/60)-Math.round(target*100/60));
          const pixels=ctx.getImageData(0,0,out.width,out.height).data.buffer;
          worker.postMessage({type:'frame',pixels,delay},[pixels]);
          progress(Math.floor(target/player.length*100));
        }catch(e){fail(e);}
      };
      worker.postMessage({type:'start',width:out.width,height:out.height});
    });
  }
  function install({tape,stage,shake,signal,jump,root,filename,slot,escapeReady}){
    const nav=root.querySelector('#clip-moments'),button=root.querySelector('#clip-export'),status=root.querySelector('#clip-export-status');
    const {marks,escape}=analyze(tape,slot);
    escapeReady?.(escape);
    for(const {frame,label} of marks){
      const b=document.createElement('button');b.type='button';b.className='utility';
      b.textContent=label;b.dataset.clipMoment=frame;b.title='Jump to frame '+frame;
      b.onclick=()=>jump(frame);nav.append(b);
    }
    nav.hidden=marks.length===0;
    let url=null,active=null;
    signal.addEventListener('abort',()=>{active?.abort();if(url)URL.revokeObjectURL(url);},{once:true});
    button.onclick=async()=>{
      if(url){
        const link=document.createElement('a');link.download=filename;link.href=url;
        document.body.append(link);link.click();link.remove();return;
      }
      if(active){active.abort();return;}
      active=new AbortController();
      button.textContent='Cancel GIF';status.textContent='Making GIF…';
      try{
        let last=0;
        const blob=await buildGIF(tape,stage,shake,active.signal,p=>{
          const step=Math.min(90,Math.floor(p/10)*10);
          if(step!==last){last=step;status.textContent='Making GIF · '+step+'%';}
        });
        if(signal.aborted)return;
        url=URL.createObjectURL(blob);button.textContent='Download GIF';
        status.textContent='GIF ready · '+Math.ceil(blob.size/1024)+' KB';
      }catch(e){
        if(signal.aborted)return;
        button.textContent='Make GIF';
        status.textContent=e.name==='AbortError'?'GIF cancelled.':'Could not make the GIF. Try again.';
      }finally{active=null;}
    };
  }
  window.FinishTools={install,moments,analyze};
})();
