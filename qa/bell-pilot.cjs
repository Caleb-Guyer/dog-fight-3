// Reads the same position, bell and movement state a player can see. Only returns controller input.
function pilot({dog,bell,kind}) {
  const dx=bell.x-dog.x, dy=dog.y-bell.y;
  const gap=kind==='noodle' && dog.x>446 && dog.x<682 && dx>35;
  const wantsJump=gap || dy>93 && Math.abs(dx)<170;
  const jump=wantsJump && !dog.prev.jump && (dog.ground>=0 || dog.jumps>0 && dog.vy>-100 && dy>80);
  return {
    x:Math.abs(dx)>24?Math.sign(dx):0,
    y:dy>68 || Math.abs(dx)<38 && dy>15 && dy<100 ? -1 : 0,
    jump:!!(jump || dog.prev.jump && dog.vy < -170),
    attack:!dog.attack && !dog.command && !dog.prev.attack && Math.abs(dx)<90 && dy<100 && dy>-10,
  };
}
module.exports=pilot;
