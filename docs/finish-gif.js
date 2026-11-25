// Runs in a dedicated worker. Each image owns its color table, so coats and stage
// colors stay in the clip even when the camera cuts to a different background.
'use strict';
function indexColors(rgba){
  const counts=new Uint32Array(4096),red=new Uint32Array(4096),green=new Uint32Array(4096),blue=new Uint32Array(4096);
  const bins=new Uint16Array(rgba.length/4),used=[];
  for(let i=0,p=0;i<rgba.length;i+=4,p++){
    const bin=(rgba[i]>>4)*256+(rgba[i+1]>>4)*16+(rgba[i+2]>>4);
    if(!counts[bin]++)used.push(bin);
    red[bin]+=rgba[i];green[bin]+=rgba[i+1];blue[bin]+=rgba[i+2];bins[p]=bin;
  }
  used.sort((a,b)=>counts[b]-counts[a]);
  const bits=Math.max(2,Math.ceil(Math.log2(Math.min(256,used.length))));
  const palette=new Uint8Array(3*(1<<bits)),lookup=new Uint8Array(4096);
  for(const [i,bin] of used.entries()){
    const r=Math.round(red[bin]/counts[bin]),g=Math.round(green[bin]/counts[bin]),b=Math.round(blue[bin]/counts[bin]);
    if(i<256){palette.set([r,g,b],i*3);lookup[bin]=i;continue;}
    let best=Infinity;
    for(let j=0;j<256;j++){
      const d=2*(r-palette[j*3])**2+3*(g-palette[j*3+1])**2+(b-palette[j*3+2])**2;
      if(d<best){best=d;lookup[bin]=j;}
    }
  }
  return {bits,palette,indices:Uint8Array.from(bins,bin=>lookup[bin])};
}
function compress(indices,minBits){
  const clear=1<<minBits, end=clear+1, table=new Map(), bytes=[];
  let bits=minBits+1, next=end+1, buffer=0, buffered=0;
  function write(code){
    buffer|=code<<buffered;buffered+=bits;
    while(buffered>=8){bytes.push(buffer&255);buffer>>>=8;buffered-=8;}
  }
  write(clear);
  let prefix=indices[0];
  for(let i=1;i<indices.length;i++){
    const value=indices[i], pair=prefix*256+value, known=table.get(pair);
    if(known!==undefined){prefix=known;continue;}
    write(prefix);
    if(next===1<<bits && bits<12)bits++;
    if(next<4096)table.set(pair,next++);
    else {write(clear);table.clear();bits=minBits+1;next=end+1;}
    prefix=value;
  }
  write(prefix);
  if(next===1<<bits && bits<12)bits++;
  write(end);
  if(buffered)bytes.push(buffer&255);
  const blocks=new Uint8Array(bytes.length+Math.ceil(bytes.length/255)+1);
  for(let i=0,pos=0;i<bytes.length;i+=255){
    const length=Math.min(255,bytes.length-i);blocks[pos++]=length;
    blocks.set(bytes.slice(i,i+length),pos);pos+=length;
  }
  return blocks;
}
class Animation {
  constructor(w,h){
    this.w=w;this.h=h;
    this.parts=['GIF89a',Uint8Array.of(w&255,w>>8,h&255,h>>8,0x70,0,0,0x21,0xff,11),
      'NETSCAPE2.0',Uint8Array.of(3,1,0,0,0)];
  }
  add(data,delay){
    const {bits,palette,indices}=indexColors(data);
    this.parts.push(Uint8Array.of(0x21,0xf9,4,4,delay&255,delay>>8,0,0,
      0x2c,0,0,0,0,this.w&255,this.w>>8,this.h&255,this.h>>8,0x80|(bits-1)),
      palette,Uint8Array.of(bits),compress(indices,bits));
  }
  finish(){return new Blob([...this.parts,Uint8Array.of(0x3b)],{type:'image/gif'});}
}
let animation;
self.onmessage=({data})=>{
  if(data.type==='start')animation=new Animation(data.width,data.height);
  else if(data.type==='frame')animation.add(new Uint8ClampedArray(data.pixels),data.delay);
  else if(data.type==='finish'){self.postMessage(animation.finish());animation=null;return;}
  self.postMessage('ready');
};
