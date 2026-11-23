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
  function drawOpponent(ctx, e, world, time, showMeter) {
    const { f, kind, phase } = e;
    if (f.absent) return;
    ctx.save();
    if (kind === 'brisket') {
      if (phase === 'defeat') ctx.globalAlpha = Math.max(0, 1 - e.time / e.duration);
      drawFighter(ctx, f, world, time);
    } else {
      if (phase === 'windup') {
        const width = e.move === 'charge' ? (kind === 'conductor' ? 285 : 178) : f.stats.reach;
        ctx.save();
        ctx.translate(Math.round(f.x), Math.round(f.y));
        ctx.scale(e.face, 1);
        ctx.fillStyle = '#302735';
        ctx.fillRect(8, -3, width, 5);
        ctx.fillStyle = '#efaf62';
        for (let i = 8; i < width + 8; i += 18) ctx.fillRect(i, -3, 8, 4);
        ctx.restore();
      }
      const pose = phase === 'defeat' ? phase : e.hurt > 0 || f.grip ? 'hurt'
        : phase === 'approach' ? (Math.abs(f.vx) > 12 ? 'walk' : 'idle')
        : phase === 'strike' && e.move === 'charge' ? 'charge' : phase;
      const fraction = pose === 'hurt' && e.hurt ? 1 - e.hurt / 0.13
        : phase === 'approach' ? 0 : Math.min(1, e.time / e.duration);
      window.DispatchActors.draw(ctx, kind, Math.round(f.x), Math.round(f.y), {
        face: f.face, pose, phase: fraction, time,
      });
      if (showMeter && e.hp > 0) {
        const x = Math.round(f.x) - 20, y = Math.round(f.y - f.stats.height) - 16;
        ctx.fillStyle = '#242237';
        ctx.fillRect(x, y, 40, 7);
        ctx.fillStyle = '#e8b373';
        ctx.fillRect(x + 2, y + 2, Math.ceil(36 * e.hp / e.maxHP), 3);
      }
    }
    ctx.restore();
  }
  class DispatchView extends FightView {
    event(name, e) {
      super.event(name, e);
      if (name === 'machineSwing' && e.kind === 'conductor' && e.move === 'stamp')
        this.shake = Math.max(this.shake, 5);
    }
    draw(canvas, world, dt) {
      this.fitCanvas(canvas);
      const { width, height } = canvas;
      world.setCameraWidth(width);
      const ctx = canvas.getContext('2d'),
        t = world.time,
        l = world.layout;
      const shake =
        reduced.matches || this.shakeEnabled === false ? 0 : Math.sin(t * 86) * Math.min(5, this.shake);
      const travel = l.length - width;
      const x = Math.round(travel <= 0 ? travel / 2 : Math.max(0, Math.min(travel, world.cameraX + shake)));
      const top = height >= 675 ? Math.round((675 - height) / 2) :
        Math.round(Math.max(0, Math.min(675 - height, world.dogs[0].y - height * 0.65)));
      this.shake = Math.max(0, this.shake - 52 * dt);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(0, -top);
      window.YardArt.draw(ctx, {
        cameraX: x,
        top, width, height,
        time: reduced.matches ? 0 : t,
        terrain: world.terrain,
        room: l.id,
        length: l.length,
        combat: !world.bridge,
        gateX: world.bridge?.nextSignal?.gate,
        gateClosed: !!world.bridge?.nextSignal,
        checkpoints: world.bridge ? l.checkpoints.map((cp, i) => ({ x: cp.x, lit: i < world.checkpoint })) : [],
        exitX: l.exit,
        exitOpen: !world.bridge?.nextSignal,
      });
      ctx.translate(-x, 0);
      if (world.bridge) {
        world.bridge.draw(ctx, world.terrain, x, width);
        if (!(world.stamps & (1 << world.roomIndex))) postmark(ctx, l.stamp.x, l.stamp.y, t);
      }
      for (const fx of this.effects) if (fx.behind) drawEffect(ctx, fx);
      const hero = world.dogs[0];
      for (const enemy of world.foes) drawOpponent(ctx, enemy, world, t, world.foes.length > 1);
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
