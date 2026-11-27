(() => {
  'use strict';
  const {stickAxes,tuneAxes,sticks,rawPad}=window.FightControls;
  const directions=[['left','right'],['up','down']];
  class Measurement {
    constructor(count){
      this.count=count;this.phase='center';this.centerAt=null;this.fit=null;
    }
    sample(axes,time){
      if(this.phase==='center'){
        const values=axes.slice(0,this.count);
        if(values.length!==this.count || values.some(v=>!Number.isFinite(v) || Math.abs(v)>.45)){this.centerAt=null;return;}
        if(this.centerAt===null || values.some((v,i)=>Math.max(this.high[i],v)-Math.min(this.low[i],v)>.04)){
          this.centerAt=time;this.low=values.slice();this.high=values.slice();
        }
        for(let i=0;i<this.count;i++){
          this.low[i]=Math.min(this.low[i],values[i]);this.high[i]=Math.max(this.high[i],values[i]);
        }
        if(time-this.centerAt>=450){
          this.fit=this.low.map((lo,i)=>{const c=(lo+this.high[i])/2;return [c,c,c];});
          this.phase='range';
        }
      }else if(this.phase==='range'){
        for(const [i,a] of this.fit.entries()){
          const v=axes[i];if(!Number.isFinite(v))continue;
          a[0]=Math.min(a[0],Math.max(-1,v));a[2]=Math.max(a[2],Math.min(1,v));
        }
      }
    }
    missing(stick){
      const missing=[];
      for(let axis=0;axis<2;axis++){
        const [lo,c,hi]=this.fit[stick+axis];
        if(c-lo<.35)missing.push(directions[axis][0]);
        if(hi-c<.35)missing.push(directions[axis][1]);
      }
      return missing;
    }
    ready(){
      return this.phase==='range' && !this.missing(0).length && (this.count===2 || !this.missing(2).length);
    }
  }
  function panel({showDialog,preferred,pads,back}){
    showDialog('stick-setup','Calibrate sticks',
      '<label>Controller <select id="stick-device"></select></label>'+
      '<p id="stick-instruction" role="status"></p><div id="stick-readings"></div>'+
      '<div class="dialog-actions"><button class="primary" id="stick-next"></button>'+
      '<button class="utility" id="stick-retry">Start again</button><button class="utility" id="stick-reset">Use factory response</button>'+
      '<button class="utility" id="stick-back">Back</button></div>');
    const el=id=>document.getElementById('stick-'+id),device=el('device'),instruction=el('instruction');
    const readings=el('readings'),next=el('next'),retry=el('retry'),reset=el('reset');
    let selected=preferred?.index,identity,measurement=null,applied='',connected,lastDevices='';
    const meters=[];
    function setText(node,value){if(node.textContent!==value)node.textContent=value;}
    function makeMeters(count){
      meters.length=0;readings.replaceChildren();
      for(let i=0;i<count;i+=2){
        const row=document.createElement('div');row.className='stick-reading';
        row.innerHTML='<div class="stick-field" aria-hidden="true"><i></i><b></b></div><div><strong></strong><div class="stick-values"></div><small></small></div>';
        row.querySelector('strong').textContent=i?'Strike stick':'Movement stick';
        const [raw,game]=row.querySelector('.stick-field').children;
        meters.push({raw,game,value:row.querySelector('.stick-values'),remaining:row.querySelector('small')});
        readings.append(row);
      }
    }
    function refresh(){
      const all=pads(),ids=JSON.stringify(all.map(p=>[p.index,p.id,stickAxes(p)]));
      if(ids!==lastDevices){
        lastDevices=ids;device.replaceChildren();
        for(const p of all)device.add(new Option('Pad '+(p.index+1)+' · '+(p.id || 'Controller'),String(p.index)));
        if(!all.some(p=>p.index===selected))selected=all[0]?.index;
        if(selected!==undefined)device.value=String(selected);
      }
      const pad=all.find(p=>p.index===selected);
      connected=pad && rawPad(pad);
      const entry=connected && sticks.entry(connected);
      if(entry!==identity){
        applied=identity && measurement?'Controller changed. Start a new measurement.':'';
        identity=entry;measurement=null;makeMeters(entry?.count || 0);
      }
      const phase=measurement?.phase || 'idle',count=entry?.count || 0;
      device.disabled=!all.length;
      if(measurement && connected)measurement.sample(connected.axes,performance.now());
      if(measurement && phase!==measurement.phase)return refresh();
      const ready=measurement?.ready() || false;
      const note=!connected?'Connect a controller and press a button.':!count?'This controller has no movement stick.':
        phase==='center'?(count===2?'Let the stick rest.':'Let both sticks rest.')+' Hold still until the center is measured.':
        phase==='range'?(ready?'You can keep turning the sticks. Choose Preview when you have reached every edge.':'Slowly roll each stick around its outer edge. Reach each direction below.'):
        phase==='preview'?'Release the sticks, try a gentle tilt, then push to the edge. Save if the game reads each correctly.':
        applied || (entry.fit?'Saved calibration is active.':'Factory response is active.');
      setText(instruction,note);
      const output=connected && (phase==='preview' || ready?tuneAxes(connected.axes,measurement.fit,[]):sticks.apply(connected).axes);
      for(const [i,m] of meters.entries()){
        const at=i*2,raw=connected.axes,percent=v=>Math.round(v*100);
        const dot=(node,a)=>{const style='translate('+percent(a[at])*.36+'px,'+percent(a[at+1])*.36+'px)';if(node.style.transform!==style)node.style.transform=style;};
        dot(m.raw,raw);dot(m.game,output);
        setText(m.value,'Raw '+percent(raw[at])+'%, '+percent(raw[at+1])+'% · Game '+percent(output[at])+'%, '+percent(output[at+1])+'%');
        const missing=phase==='range'?measurement.missing(at):[];
        setText(m.remaining,phase==='range'?(missing.length?'Still needed · '+missing.join(', '):'All four directions reached'):'');
      }
      next.disabled=!count || phase==='center' || phase==='range' && !ready;
      setText(next,phase==='preview'?'Save calibration':phase==='range'?'Preview response':phase==='center'?'Measuring center':'Start calibration');
      retry.hidden=!measurement;reset.hidden=!entry?.fit || !!measurement;
      setText(el('back'),measurement?'Cancel':'Back');
    }
    function start(){applied='';measurement=new Measurement(stickAxes(connected));refresh();}
    device.onchange=()=>{selected=Number(device.value);refresh();};
    next.onclick=()=>{
      refresh();if(next.disabled || !connected)return;
      if(!measurement)return start();
      if(measurement.phase==='range')measurement.phase='preview';
      else if(measurement.phase==='preview'){
        applied=sticks.save(connected,measurement.fit)?'Calibration saved for this controller and pad number.':'Calibration applied for this visit.';
        measurement=null;
      }
      refresh();
    };
    retry.onclick=()=>{refresh();if(connected)start();};
    reset.onclick=()=>{
      refresh();if(!connected || reset.hidden)return;
      applied=sticks.save(connected,null)?'Factory response restored.':'Factory response restored for this visit.';
      refresh();
    };
    el('back').onclick=back;
    refresh();(next.disabled?el('back'):next).focus({preventScroll:true});return refresh;
  }
  window.StickCalibration={Measurement,panel};
})();
