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
  function drawOpponent(ctx, e, world, time) {
    const { f, kind, phase } = e;
    if (f.absent) return;
    ctx.save();
    if (Object.hasOwn(window.DogFight.fighters, kind)) {
      if (phase === 'defeat') ctx.globalAlpha = Math.max(0, 1 - e.time / e.duration);
      drawFighter(ctx, f, world, time);
    } else {
      if (phase === 'windup' && !f.stun && f.ground >= 0) {
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
      const pose = phase === 'defeat' ? phase : f.tumble || f.stun || e.hurt > 0 || f.grip ? 'hurt'
        : phase === 'approach' ? (Math.abs(f.vx) > 12 ? 'walk' : 'idle')
        : phase === 'strike' && e.move === 'charge' ? 'charge' : phase;
      const fraction = pose === 'hurt' && e.hurt ? 1 - e.hurt / 0.13
        : phase === 'approach' ? 0 : Math.min(1, e.time / e.duration);
      if (f.respawning > 0) {
        ctx.fillStyle = '#a6d5ce';
        ctx.fillRect(Math.round(f.x - 36), Math.round(f.y), 72, 4);
      }
      if (f.invuln > 0 && !reduced.matches && Math.floor(time * 12) % 2) ctx.globalAlpha = 0.55;
      if (f.tumble && !reduced.matches) {
        const cx = Math.round(f.x), cy = Math.round(f.y - f.stats.height / 2);
        ctx.translate(cx, cy);
        ctx.rotate((Math.sign(f.vx) || f.face) * Math.min(5.5, f.tumble.time * 9));
        ctx.translate(-cx, -cy);
      }
      window.DispatchActors.draw(ctx, kind, Math.round(f.x), Math.round(f.y), {
        face: f.face, pose, phase: fraction, time,
      });
    }
    ctx.restore();
  }
  function drawHordeDamage(ctx, foes) {
    ctx.save();
    ctx.font = '16px "Brawl Pixel", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tags = [];
    for (const { f } of foes) {
      if (!f.stocks || f.absent) continue;
      const x = Math.round(f.x), text = Math.floor(f.damage) + '%';
      const half = Math.ceil(ctx.measureText(text).width / 2) + 5;
      let y = Math.round(f.y - f.stats.height - 14);
      while (tags.some((tag) => Math.abs(tag.x - x) < tag.half + half && Math.abs(tag.y - y) < 19)) y -= 19;
      tags.push({ x, y, half });
      ctx.fillStyle = '#252337';
      ctx.fillRect(x - half, y - 9, half * 2, 18);
      ctx.fillStyle = f.damage >= 110 ? '#ff9c79' : f.damage >= 65 ? '#f4ca78' : '#fff1c7';
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  }
  class DispatchView extends FightView {
    drawEdgePortrait(ctx, f, x, y, time, world) {
      const kind = f.encounter?.kind;
      if (!kind || Object.hasOwn(window.DogFight.fighters, kind)) return super.drawEdgePortrait(ctx, f, x, y, time, world);
      ctx.translate(x, y + 14);
      const scale = kind === 'conductor' ? 0.33 : 0.46;
      ctx.scale(scale, scale);
      window.DispatchActors.draw(ctx, kind, 0, 0, { face: f.face, time, pose: 'hurt' });
    }
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
        floor: world.wave,
        length: l.length,
        combat: !world.bridge,
        stockArena: !!l.rules,
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
      for (const enemy of world.foes) drawOpponent(ctx, enemy, world, t);
      drawFighter(ctx, hero, world, t);
      if (world.grapple) gripLead(ctx, world.dogs[world.grapple.owner], world.grapple);
      if (l.rules === 'horde') drawHordeDamage(ctx, world.foes);
      for (const shot of world.projectiles) drawItem(ctx, shot);
      for (const fx of this.effects) {
        if (!fx.behind) drawEffect(ctx, fx);
        fx.life -= dt;
      }
      this.effects = this.effects.filter((fx) => fx.life > 0);
      ctx.restore();
      if (!world.bridge) this.drawOffscreen(ctx, world, x, top, width, height, 1, t);
    }
  }
  window.DispatchView = DispatchView;
})();
