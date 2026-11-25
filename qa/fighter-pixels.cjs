const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
global.window={};require('../docs/engine.js');
const repo=path.join(__dirname,'..'),reference='f818ae42d59c605a19b69b4dabab76df7c103ce7';
const before=process.env.DF3_ART_REFERENCE?fs.readFileSync(process.env.DF3_ART_REFERENCE,'utf8'):
  execFileSync('git',['show',reference+':docs/fighters-art.js'],{cwd:repo,encoding:'utf8'});
const after=fs.readFileSync(path.join(repo,'docs/fighters-art.js'),'utf8');
function art(source){
  const scope={DogFight:window.DogFight},document={createElement(){
    const canvas={};
    canvas.getContext=()=>({
      createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
      putImageData:image=>{canvas.digest=createHash('sha256').update(image.data).digest('hex');},
    });
    return canvas;
  }};
  new Function('window','document',source.replace('window.DogArt = Object.freeze(',
    'window.cels={poses,kitMoves,frameNumber,getFrame,frameCanvas}; window.DogArt = Object.freeze('))(scope,document);
  return scope.cels;
}
for(const kind of Object.keys(window.DogFight.fighters))test(kind+' keeps its animation pixels, coats and attachment points',()=>{
  const a=art(before),b=art(after);
  let count=0;
  for(const pose of new Set(a.poses)){
    if(a.kitMoves[pose] && !pose.startsWith(kind))continue;
    const numbers=new Set();
    for(let t=0;t<=240;t++)for(const back of [false,true])
      numbers.add(a.frameNumber(pose,t/23,t/240,kind,back));
    for(const n of numbers)for(let dir=0;dir<(pose==='directionalAirDodge'?8:1);dir++){
      const prev=a.getFrame(kind,pose,n,dir),next=b.getFrame(kind,pose,n,dir),id=[kind,pose,n,dir].join('/');
      for(const field of ['width','height','x','y','item','paws','indices'])assert.deepEqual(next[field],prev[field],id+' '+field);
      for(let coat=0;coat<4;coat++)
        assert.equal(b.frameCanvas(next,kind,coat).digest,a.frameCanvas(prev,kind,coat).digest,id+' coat '+coat);
      count++;
    }
  }
  console.log(kind,count,'cels × four coats');
});
