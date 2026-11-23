(() => {
  'use strict';
  const { FightView, drawFighter, drawItem, drawEffect, gripLead } = window.DogFightView;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function postmark(ctx, x, y, time) {
    const rise = reduced.matches ? 0 : Math.round(Math.sin(time * 3) * 3);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + rise));
    ctx.fillStyle = '#25243a';
    ctx.fillRect(-16, -19, 32, 38);
    ctx.fillStyle = '#f4ce76';
    ctx.fillRect(-13, -17, 26, 34);
    ctx.fillStyle = '#995b40';
    ctx.fillRect(-9, -13, 18, 26);
    for (let i = -11; i < 14; i += 7) {
      ctx.fillStyle = '#25243a';
      ctx.fillRect(-16, i, 5, 3);
      ctx.fillRect(11, i, 5, 3);
    }
    ctx.fillStyle = '#ffedbb';
    ctx.fillRect(-6, 0, 12, 6);
    ctx.fillRect(-8, -4, 4, 4);
    ctx.fillRect(-2, -7, 4, 5);
    ctx.fillRect(4, -4, 4, 4);
    ctx.restore();
  }
  function drawSignal(ctx, s, on) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = '#252237';
    ctx.fillRect(-19, 7, 38, 25);
    ctx.fillRect(-4, -18, 8, 30);
    ctx.fillStyle = '#87808e';
    ctx.fillRect(-15, 11, 30, 15);
    const dx = on ? 10 : -10;
    ctx.strokeStyle = '#eee1b7';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(dx, -4);
    ctx.stroke();
    ctx.fillStyle = on ? '#7ad9ad' : '#ffb352';
    ctx.fillRect(dx - 7, -12, 14, 13);
    ctx.fillStyle = '#201d32';
    ctx.fillRect(-10, 22, 20, 4);
    ctx.restore();
  }
  class DispatchView extends FightView {
    event(name, e) {
      super.event(name, e);
      if (name === 'machineSwing' && e.kind === 'conductor' && e.move === 'stamp')
        this.shake = Math.max(this.shake, 5);
    }
    draw(canvas, world, dt) {
      const ctx = canvas.getContext('2d'),
        t = world.time,
        l = world.layout;
      const shake =
        reduced.matches || this.shakeEnabled === false ? 0 : Math.sin(t * 86) * Math.min(5, this.shake);
      const x = Math.round(Math.max(0, Math.min(l.length - 1200, world.cameraX + shake)));
      this.shake = Math.max(0, this.shake - 52 * dt);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      window.YardArt.draw(ctx, {
        cameraX: x,
        width: 1200,
        height: 675,
        time: reduced.matches ? 0 : t,
        terrain: world.terrain,
        room: l.id,
        length: l.length,
        gateX: world.gateX,
        gateClosed: world.gateClosed,
        checkpointX: l.checkpoint,
        checkpointLit: world.checkpointLit,
        exitX: l.exit,
        exitOpen: !world.gateClosed,
      });
      ctx.translate(-x, 0);
      if (!(world.stamps & (1 << world.roomIndex))) postmark(ctx, l.stamp.x, l.stamp.y, t);
      if (l.signal) drawSignal(ctx, l.signal, world.signalOn);
      for (const fx of this.effects) if (fx.behind) drawEffect(ctx, fx);
      const [hero, f] = world.dogs,
        enemy = world.enemy;
      if (enemy) {
        const phase = enemy.phase;
        if (phase === 'windup') {
          const boss = enemy.kind === 'conductor',
            width = enemy.move === 'charge' ? 290 : boss ? 128 : 74;
          ctx.save();
          ctx.translate(Math.round(f.x), Math.round(f.y));
          ctx.scale(enemy.face, 1);
          ctx.fillStyle = '#302735';
          ctx.fillRect(10, -3, width, 5);
          ctx.fillStyle = '#efaf62';
          for (let i = 10; i < 10 + width; i += 18) ctx.fillRect(i, -3, 8, 4);
          ctx.restore();
        }
        const pose =
          phase === 'defeat'
            ? 'defeat'
            : enemy.hurt > 0 || f.grip
              ? 'hurt'
              : phase === 'approach'
                ? Math.abs(f.vx) > 12
                  ? 'walk'
                  : 'idle'
                : phase === 'strike' && enemy.move === 'charge'
                  ? 'charge'
                  : phase;
        const fraction =
          pose === 'hurt' && enemy.hurt > 0
            ? 1 - enemy.hurt / 0.13
            : phase === 'approach'
              ? 0
              : Math.min(1, enemy.time / enemy.duration);
        window.DispatchActors.draw(ctx, enemy.kind, Math.round(f.x), Math.round(f.y), {
          face: f.face,
          pose,
          phase: fraction,
          time: t,
        });
      }
      drawFighter(ctx, hero, world, t);
      if (world.grapple) gripLead(ctx, world.dogs[world.grapple.owner], world.grapple);
      for (const shot of world.projectiles) drawItem(ctx, shot);
      for (const fx of this.effects) {
        if (!fx.behind) drawEffect(ctx, fx);
        fx.life -= dt;
      }
      this.effects = this.effects.filter((fx) => fx.life > 0);
      ctx.restore();
    }
  }
  window.DispatchView = DispatchView;
})();
