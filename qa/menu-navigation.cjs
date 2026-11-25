const test=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../docs/controls.js');
const {menuNeighbor,menuDirection,MenuRepeat}=window.FightControls;
const rect=(x,y,w,h)=>({left:x,top:y,right:x+w,bottom:y+h});
test('keep a column in a ragged arena grid and a row when crossing a tall cover',()=>{
  const cards=[rect(0,0,200,240),...Array.from({length:4},(_,i)=>rect(213,i*60,140,50))];
  for(const i of [1,2,3,4]){
    const y=cards[i].top+25;
    assert.equal(menuNeighbor(cards,i,'left',y),0);
    assert.equal(menuNeighbor(cards,0,'right',y),i);
  }
  const grid=[rect(0,0,100,50),rect(110,0,96,50),rect(215,0,96,50),rect(0,60,128,55),rect(138,60,140,55)];
  assert.equal(menuNeighbor(grid,1,'down',158),4);
  assert.equal(menuNeighbor(grid,4,'up',158),1);
  assert.equal(menuNeighbor(grid,0,'left',25),0);
  assert.equal(menuNeighbor(grid,2,'right',25),2);
});
test('stick dead zone, diagonal stability, digital priority and deliberate axis changes',()=>{
  const pad={axes:[.44,.48],buttons:Array.from({length:16},()=>({pressed:false}))};
  assert.equal(menuDirection(pad,''),'');
  pad.axes=[.79,.71];assert.equal(menuDirection(pad,''),'right');
  pad.axes=[.70,.78];assert.equal(menuDirection(pad,'right'),'right');
  pad.axes=[.30,.78];assert.equal(menuDirection(pad,'right'),'down');
  pad.axes=[0,.48];assert.equal(menuDirection(pad,'down'),'down');
  pad.axes=[0,.39];assert.equal(menuDirection(pad,'down'),'');
  pad.buttons[14].pressed=true;pad.axes=[0,1];assert.equal(menuDirection(pad,'down'),'left');
});
test('directions fire once on a tap, repeat on a hold, and rearm across menus on release',()=>{
  const repeat=new MenuRepeat(),poll=(key,t,scope='home')=>repeat.poll(key,scope,t);
  assert(poll('down',0));assert(!poll('down',.33));assert(poll('down',.39));
  assert(!poll('down',.45));assert(poll('down',.52));
  assert(!poll('down',.53,'pause'));assert(!poll('down',2,'pause'));
  assert(poll('up',2.01,'pause'));assert(!poll('',2.05,'pause'));
  assert(poll('up',2.1,'pause'));assert(!poll('up',2.2,''));
  assert(!poll('up',2.3,'lobby'));assert(!poll('up',5,'lobby'));
});
