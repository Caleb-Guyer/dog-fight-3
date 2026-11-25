// A repeatable Pip player for the three-floor fight. Every action goes through Battle.step.
module.exports=function liftInput(frame,world) {
  const [pip,opponent]=world.dogs, deck=world.terrain[0], input={...window.DogFight.idleInput};
  const side=Math.sign(opponent.x-pip.x)||pip.face, gap=Math.abs(opponent.x-pip.x);
  const inward=pip.x<deck.x1?1:pip.x>deck.x2?-1:0;
  if(pip.stockLift){input.x=side;input.y=1;}
  else if(pip.ledge)input.jump=true;
  else if(inward){
    input.x=inward;
    if(pip.vy>20){
      input.jump=!!pip.jumps;
      if(!pip.jumps){input.y=-1;input.special=frame%4===0;}
    }
  }else if(!opponent.absent){
    input.x=gap>64?side:0;
    if(opponent.y<pip.y-56 && pip.ground>=0){input.jump=true;input.x=side;}
    if(pip.ground>=0 && gap<112 && Math.abs(opponent.y-pip.y)<76){
      input.smash=frame%22<12;input.smashX=side;
    }
    if(pip.ground<0 && gap<125){
      input.aimStick=frame%4===0;input.smashX=side;input.x=Math.sign(590-pip.x)*.65;
    }
    if(pip.grip){input.x=side;input.tapped={grab:true};}
  }
  return input;
};
