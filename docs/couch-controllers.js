(() => {
  'use strict';
  function panel({showDialog,seats,pads,fighters,keyFor,confirmName,save,back}){
    const {Seats,SoloSeat}=window.FightControls;
    const draft=new Seats([]);draft.copyFrom(seats);
    showDialog('couch-pads','Assign controllers','<div id="controller-seats">'+[0,1].map(i=>
      '<fieldset><legend id="seat-name-'+i+'"></legend><p id="seat-device-'+i+'"></p><div class="dialog-actions">'+
      '<button class="utility" id="seat-pair-'+i+'" aria-label="Assign controller to P'+(i+1)+'">Assign controller</button><button class="utility" id="seat-keys-'+i+'" aria-label="Use keyboard for P'+(i+1)+'">Use keyboard</button></div></fieldset>'
    ).join('')+'</div><p role="status" id="seat-status"></p><div class="dialog-actions"><button class="primary" id="seat-apply">Apply assignments</button>'+
      '<button class="utility" id="seat-back">Cancel</button></div>');
    const el=id=>document.getElementById('seat-'+id);
    let capture=null,slot=-1;
    const notice=msg=>{if(el('status').textContent!==msg)el('status').textContent=msg;};
    function refresh(devices){
      draft.sync(devices);
      for(let i=0;i<2;i++){
        const p=draft.get(i,devices),key=action=>keyFor(i,action);
        const value=p?'Pad '+(p.index+1)+(p.id?' · '+p.id:''):draft.ids[i]!==null?
          (draft.models[i] || 'Pad '+(draft.ids[i]+1))+' · disconnected':
          'Keyboard · '+key('left')+' / '+key('right')+' move · '+key('jump')+' jump · '+key('attack')+' attack';
        if(el('device-'+i).textContent!==value)el('device-'+i).textContent=value;
      }
    }
    function endCapture(message){
      capture=null;notice(message);
      el('apply').disabled=false;el('back').textContent='Cancel';
      el('pair-'+slot).focus({preventScroll:true});
    }
    function cancel(){
      if(capture)endCapture('Assignment canceled.');else back();
    }
    function poll(devices){
      refresh(devices);
      if(!capture)return false;
      const p=capture.confirm(devices);
      if(p){
        draft.assign(slot,p,devices);refresh(devices);
        endCapture('Pad '+(p.index+1)+' assigned to P'+(slot+1)+'.');
      }else notice('P'+(slot+1)+' · Center the sticks and release all buttons. '+
        (devices.length?'Press '+devices.map(p=>confirmName(slot,p)+' on Pad '+(p.index+1)).join(' or ')+'.':'Connect the controller you want to use.'));
      return true;
    }
    for(let i=0;i<2;i++){
      el('name-'+i).textContent='P'+(i+1)+' · '+fighters[i];
      el('pair-'+i).onclick=()=>{
        slot=i;capture=new SoloSeat();el('apply').disabled=true;el('back').textContent='Cancel assignment';poll(pads());
      };
      el('keys-'+i).onclick=()=>{
        if(capture)endCapture('');
        draft.assign(i,null,pads());refresh(pads());notice('P'+(i+1)+' will use the keyboard.');
      };
    }
    el('apply').onclick=()=>{if(!capture)save(draft);};
    el('back').onclick=cancel;
    notice('Assign a controller already in use to swap the two seats.');
    refresh(pads());el('pair-0').focus({preventScroll:true});
    return {poll,cancel};
  }
  window.CouchControllers={panel};
})();
