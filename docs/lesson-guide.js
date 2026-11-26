/* Guided Fight School stops the battle clock at a decision. The player's
   controller still drives the same fighter and the lesson judges the result. */
(() => {
  'use strict';
  const sequences={
    move:[
      {say:'Hold right to reach the gold post at center stage.',keys:['right'],hold:true}
    ],
    platform:[
      {say:'Hold Jump to rise through the marked bench.',keys:['jump'],hold:true,frames:16},
      {say:'Release Jump. Pip still has one jump in the air.',keys:['!jump'],hold:true,frames:4},
      {say:'Tap Jump again, then let Pip land on the bench.',keys:['jump']}
    ],
    jab:[
      {say:'Center your direction and tap Attack beside Brisket.',keys:['center','attack'],frames:1},
      {say:'Release Attack to finish the jab.',keys:['!attack']}
    ],
    tilt:[
      {say:'Aim down and tap Attack for Pip’s low sweep.',keys:['down','attack'],frames:1},
      {say:'Let go of Attack as Pip sweeps.',keys:['!attack']}
    ],
    air:[
      {say:'Press Jump and Attack together. The fight waits while you find both buttons.',keys:['jump','attack'],frames:1},
      {say:'Release both buttons and watch Pip’s short-hop aerial.',keys:['!jump','!attack']}
    ],
    guard:[
      {say:'Hold Shield until Brisket’s punch hits the bubble.',keys:['shield'],hold:true}
    ],
    throw:[
      {say:'Center your direction and tap Grab to reach through the shield.',keys:['center','grab'],
        ready:w=>w.grapple?.phase==='hold'},
      {say:'Brisket is caught. Press right to throw him.',keys:['right']}
    ],
    special:[
      {say:'Hold right and tap Special for Double Pounce.',keys:['right','special']}
    ],
    return:[
      {say:'Aim up and tap Special to start Fence Hopper.',keys:['up','special'],
        ready:w=>w.dogs[0].attack?.specialSide==='up'},
      {say:'Steer right toward the marked ledge. Keep holding right to climb if Pip catches it.',keys:['right'],hold:true}
    ],
    stock:[
      {say:'Hold right and Smash to charge Pip’s kick.',keys:['right','smash'],hold:true,
        ready:w=>w.dogs[0].smashCharge?.side==='side' && w.dogs[0].charge>=.48},
      {say:'The kick is charged. Release Smash to send Brisket past the boundary.',keys:['!smash']}
    ]
  };
  const directions={right:i=>i.x>.35,left:i=>i.x<-.35,up:i=>i.y<-.35,down:i=>i.y>.35,
    center:i=>Math.abs(i.x)<.35 && Math.abs(i.y)<.35};
  const buttons=['attack','special','jump','shield','smash','grab','aimStick'];
  function matches(input,key){
    if(key[0]==='!')return !matches(input,key.slice(1));
    return directions[key]?directions[key](input):!!(input[key] || input.tapped?.[key]);
  }
  class Guide{
    constructor(id,terrain){
      this.steps=sequences[id];this.index=0;this.frames=0;this.mask=0;this.running=false;this.revision=0;
      const floor=terrain[0],bench=terrain[1];
      if(id==='move')this.mark={x:600,y:floor.y};
      if(id==='platform')this.mark={x:(bench.x1+bench.x2)/2,y:bench.y,left:bench.x1+6,right:bench.x2-6};
      if(id==='return')this.mark={x:floor.x1,y:floor.y};
    }
    get step(){return this.steps[this.index];}
    allows(input){
      const s=this.step;
      if(this.running && !s.hold)return true;
      let mask=0;
      for(let i=0;i<s.keys.length;i++)if(matches(input,s.keys[i]))mask|=1<<i;
      const vertical=s.keys.includes('right') && Math.abs(input.y)>.45 ? (input.y<0?'up':'down'):null;
      const extra=vertical || buttons.find(key=>!s.keys.includes(key) && !s.keys.includes('!'+key) && matches(input,key));
      const running=!extra && mask===(1<<s.keys.length)-1;
      if(mask!==this.mask || running!==this.running || extra!==this.extra){
        this.mask=mask;this.running=running;this.extra=extra;this.revision++;
      }
      return running;
    }
    advance(world){
      this.frames++;
      const s=this.step;
      if(this.index+1<this.steps.length && (s.ready?s.ready(world):this.frames>=s.frames)){
        this.index++;this.frames=0;this.mask=0;this.running=false;this.extra=undefined;this.revision++;
      }
    }
    render(task,bindings,label){
      task.textContent=this.step.say;
      const status=document.createElement('strong');
      status.textContent=(this.steps.length>1?'Step '+(this.index+1)+'/'+this.steps.length+' · ':'')+
        (this.running?'In motion':'Waiting for you');
      bindings.replaceChildren(status);
      for(const [i,key] of this.step.keys.entries()){
        const token=document.createElement('span'),met=!!(this.mask&(1<<i));
        const name=key==='center'?'Center direction':key[0]==='!'?'Release '+label(key.slice(1)):label(key);
        token.className='guide-key';token.dataset.met=String(met);
        token.textContent=(met?'✓ ':'')+name;bindings.append(' ',token);
      }
      if(this.extra)bindings.append(' · Release '+(this.extra==='aimStick'?'aimed strike':label(this.extra)));
    }
    touchPrompts(buttons,active){
      for(const button of buttons){
        const action=button.dataset.touch==='neutral'?'center':button.dataset.touch;
        const key=active && this.step.keys.find(k=>k===action || k==='!'+action);
        if(key)button.dataset.lessonCue=key[0]==='!'?'release':'press';
        else delete button.dataset.lessonCue;
      }
    }
    draw(ctx){
      if(!this.mark)return;
      const {x,y,left,right}=this.mark;
      ctx.save();
      if(left!==undefined){
        ctx.fillStyle='#292034';ctx.fillRect(left,y-4,right-left,6);
        ctx.fillStyle='#f6cc73';ctx.fillRect(left+2,y-3,right-left-4,2);
      }
      ctx.fillStyle='#292034';ctx.fillRect(x-3,y-35,6,35);ctx.fillRect(x-2,y-35,20,14);
      ctx.fillStyle='#f6cc73';ctx.fillRect(x-1,y-33,2,33);ctx.fillRect(x+1,y-32,14,8);
      ctx.fillStyle='#6e4e38';ctx.fillRect(x+5,y-30,3,3);ctx.fillRect(x+8,y-27,3,2);
      ctx.restore();
    }
  }
  window.LessonGuide={Guide};
})();
