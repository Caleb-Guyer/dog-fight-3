const {test}=require('node:test');
const assert=require('node:assert/strict');
global.window={matchMedia:()=>({matches:false}),ArenaArt:{draw(){}}};
global.document={createElement:()=>({getContext:()=>({
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},
})})};
for(const file of ['engine','fighters-art','render'])require('../docs/'+file+'.js');
const {arenas,stageForms,fighters,kits,moves}=window.DogFight;

// Capture the destination of each actual trimmed sprite on the two podiums.
function preview(width,height){
  const stack=[],sprites=[];
  let tx=0,ty=0,face=1;
  const context={
    save(){stack.push([tx,ty,face]);},restore(){[tx,ty,face]=stack.pop();},
    translate(x,y){tx+=face*x;ty+=y;},scale(x){face*=x;},fillRect(){},
    drawImage(image,x,y,w,h){
      const left=tx+face*x,right=tx+face*(x+w);
      sprites.push({left:Math.min(left,right),right:Math.max(left,right),top:ty+y,bottom:ty+y+h});
    },
  };
  return {clientWidth:width,clientHeight:height,sprites,getContext:()=>context};
}

test('both roster sprites fit at rest and throughout each tilt, on every arena and moving lift',()=>{
  for(const size of [[320,390],[390,360],[840,90],[1440,550],[3440,1050]]){
    const canvas=preview(...size);
    for(const stage of Object.keys(arenas))for(const stageForm of Object.keys(stageForms)){
      for(const kind of Object.keys(fighters)){
        const moveId=kits[kind].tilts.forward;
        for(const time of [0,2,4,6])for(const slot of [0,1]){
          for(const elapsed of [-1,0,.2,.4,.6,.8,.99]){
            const pick=elapsed<0?null:{slot,moveId,start:time-elapsed*moves[moveId].end*2};
            canvas.sprites.length=0;
            window.DogFightView.drawPreview(canvas,{stage,stageForm,p1:kind,p2:kind},time,[0,0],pick);
            assert.equal(canvas.sprites.length,2);
            assert(Math.abs(canvas.height*size[0]/size[1]-canvas.width)<size[0]/size[1]+1);
            for(const s of canvas.sprites){
              assert(s.left>=canvas.width*.03 && s.right<=canvas.width*.97 &&
                s.top>=0 && s.bottom<=canvas.height,JSON.stringify({size,stage,stageForm,kind,slot,time,elapsed,s}));
            }
          }
        }
      }
    }
  }
});
