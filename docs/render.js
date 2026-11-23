(() => {
  'use strict';

  const { clamp, platforms, attackWindow } = window.DogFight;
  const team = ['#ef926e', '#98d0d1'];
  const ink = '#252337';
  const cream = '#fff1c7';
  const gold = '#f4c76a';
  const lilac = '#c5a9d3';
  const chargeColors = { pip: '#ee9775', brisket: gold, noodle: '#e5b47b', clover: lilac };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const snap = (value, cell = 3) => Math.round(value / cell) * cell;
  const effectsAtlas = new Image();
  effectsAtlas.src = './assets/fight-fx.png';
  const atlasRow = { light: 0, impact: 1, block: 2, land: 3, skid: 4, smoke: 5 };

  // Effects are stamped on the same coarse grid as the scenery.
  function pixelLine(ctx, x1, y1, x2, y2, color, thickness = 3, cell = 3) {
    const x = Math.round(x1 / cell),
      y = Math.round(y1 / cell);
    const dx = Math.round(x2 / cell) - x,
      dy = Math.round(y2 / cell) - y;
    const length = Math.max(1, Math.abs(dx), Math.abs(dy));
    ctx.fillStyle = color;
    for (let i = 0; i <= length; i++) {
      ctx.fillRect(
        (x + Math.round((dx * i) / length)) * cell,
        (y + Math.round((dy * i) / length)) * cell,
        thickness,
        thickness,
      );
    }
  }
  function oval(ctx, x, y, rx, ry, color, cell = 3) {
    const rows = Math.max(1, Math.round(ry / cell));
    const cx = snap(x, cell),
      cy = snap(y, cell);
    ctx.fillStyle = color;
    for (let row = -rows; row <= rows; row++) {
      const halfWidth = Math.max(1, Math.round((rx / cell) * Math.sqrt(1 - (row / rows) ** 2)));
      ctx.fillRect(cx - halfWidth * cell, cy + row * cell, (2 * halfWidth + 1) * cell, cell);
    }
  }
  function arc(ctx, x, y, rx, ry, start, end, color, width = 3) {
    const segments = Math.max(4, Math.ceil((Math.abs(end - start) * Math.max(rx, ry)) / 7));
    let ax = x + Math.cos(start) * rx,
      ay = y + Math.sin(start) * ry;
    for (let i = 1; i <= segments; i++) {
      const angle = start + ((end - start) * i) / segments;
      const bx = x + Math.cos(angle) * rx,
        by = y + Math.sin(angle) * ry;
      pixelLine(ctx, ax, ay, bx, by, color, width);
      ax = bx;
      ay = by;
    }
  }
  function fighterTags(ctx, world, leftFighter) {
    ctx.save();
    ctx.font = '14px "Brawl Pixel",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const second = world.mode === 'local' ? 'P2' : world.mode === 'training' ? 'DUMMY' : 'CPU';
    const labels = ['P1', second];
    const widths = labels.map((label) => snap(Math.max(26, ctx.measureText(label).width + 8), 2));
    const tops = world.dogs.map((f) => {
      let top = -f.stats.height;
      if (f.attack?.smashSide === 'up') {
        // Keep the tag clear of both hits of an overhead move, including Noodle's rope.
        for (const box of [f.attack.box, f.attack.second?.box]) {
          if (box) top = Math.min(top, box[1] - box[3]);
        }
      } else if (f.attack?.aim === -1 || f.smashCharge?.side === 'up') top -= 12;
      return snap(f.y + top - 33, 2);
    });
    for (const f of world.dogs) {
      if (!f.stocks) continue;
      const i = f.index,
        rival = world.dogs[1 - i],
        w = widths[i],
        top = tops[i];
      const out = i === leftFighter ? -1 : 1;
      let x = f.x;
      if (rival.stocks) {
        if (Math.abs(top - tops[1 - i]) < 25) {
          const overlap = (w + widths[1 - i]) / 2 + 8 - Math.abs(f.x - rival.x);
          x += out * Math.max(0, overlap / 2);
        }
        if (top + 22 >= rival.y - rival.stats.height - 8 && top <= rival.y + 4) {
          const clearance = w / 2 + rival.stats.width + 17;
          x += out * Math.max(0, clearance - out * (x - rival.x));
        }
      }
      const left = snap(x - w / 2, 2);
      const pointer = snap(clamp(f.x, left + 6, left + w - 6), 2);
      ctx.fillStyle = ink;
      ctx.fillRect(left - 2, top - 2, w + 4, 20);
      ctx.fillRect(pointer - 4, top + 17, 8, 3);
      ctx.fillRect(pointer - 2, top + 20, 4, 2);
      ctx.fillStyle = team[i];
      ctx.fillRect(left, top, w, 16);
      ctx.fillStyle = ink;
      ctx.fillText(labels[i], left + w / 2, top + 8);
    }
    ctx.restore();
  }
  function shadow(ctx, f, terrain) {
    const floor = terrain
      .filter((p) => p.y >= f.y - 3 && f.x >= p.x1 && f.x <= p.x2)
      .sort((a, b) => a.y - b.y)[0];
    if (!floor || floor.y - f.y > 210) return;
    const strength = clamp(1 - (floor.y - f.y) / 236, 0.15, 1);
    ctx.save();
    ctx.globalAlpha = strength * 0.38;
    oval(ctx, f.x, floor.y + 1, 24 * strength + 5, 3, ink);
    ctx.restore();
  }
  function drawPreview(canvas, config, time) {
    const aspect = (canvas.clientWidth || 900) / (canvas.clientHeight || 280);
    const viewportWidth = clamp(660 + (aspect - 1.7) * 190, 680, 1110);
    const viewportHeight = viewportWidth / aspect;
    const picnic = config.stage === 'picnic';
    const t = reduced.matches ? 1.4 : Math.floor(time * 9) / 9;
    const stageTime = picnic ? t : (1.5 * Math.PI + 0.28 * Math.sin(t * 0.75)) / 0.7;
    const ground = platforms(config.stage, stageTime);
    const podiums = picnic ? [ground[1], ground[2]] : [ground[2], ground[3]];
    const positions = podiums.map((p) => (p.x1 + p.x2) / 2);
    const center = (positions[0] + positions[1]) / 2;
    const width = Math.round(viewportWidth),
      height = Math.max(1, Math.round(viewportHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(
      Math.round(viewportWidth / 2 - center),
      Math.round(viewportHeight * (picnic ? 0.69 : 0.8) - podiums[0].y),
    );
    window.ArenaArt.draw(ctx, config.stage, stageTime);
    const scale = clamp((viewportHeight * (picnic ? 0.56 : 0.49)) / 77, 1.55, 3.1);
    [config.p1, config.p2].forEach((kind, i) => {
      const x = snap(positions[i]),
        y = podiums[i].y;
      oval(ctx, x, y + 1, 20 * scale, 2 * scale, '#30293280');
      window.DogArt.draw(ctx, kind, x, y, {
        face: i ? -1 : 1,
        scale,
        time: t + i * 0.42,
        pose: 'idle',
        phase: 0,
      });
    });
    ctx.restore();
  }
  // The drawn paw reaches full extension on the first frame that can deal damage.
  function attackPhase(a) {
    if (a.charging) return 0.08 + 0.28 * a.power;
    if (a.diving) return 0.44 + 0.16 * Math.min(a.diveTime * 4, 1);
    if (a.moveId === 'cloverSail' && !a.folded && a.time >= a.start + a.active) return 0.57;
    if (a.anchor && a.time >= a.start) return 0.45 + Math.min(0.17, (a.time - a.start) * 0.7);
    const beat = attackWindow(a);
    if (a.time < beat.start - 1e-8) {
      const held = a.smashSide ? 0.08 + 0.26 * a.power : 0;
      return held + (0.39 - held) * clamp(a.time / beat.start, 0, 1);
    }
    const activeTime = Math.max(0, a.time - beat.start);
    if (activeTime <= beat.active) return 0.4 + 0.25 * (activeTime / beat.active);
    if (a.second && beat === a)
      return 0.16 + 0.23 * clamp((activeTime - a.active) / (a.second.start - a.start - a.active), 0, 1);
    return 0.68 + 0.32 * clamp((activeTime - beat.active) / (a.end - beat.start - beat.active), 0, 1);
  }
  function attackPose(f) {
    const a = f.attack;
    if (a.riposte) return 'brisketRiposte';
    if (a.folded) return 'fall';
    if (a.diving) return 'pipSlideDive';
    if (a.anchor && a.time + 1e-8 >= a.start) return 'noodleReelLedge';
    if (a.secondPose && attackWindow(a) === a.second) return a.secondPose;
    if (a.moveId) return a.moveId;
    if (a.name === 'recover') return 'rise';
    if (a.name === 'shoulder') return 'heavy';
    if (['disc', 'rope', 'pounce'].includes(a.name)) return 'special';
    if (a.aim < 0) return 'upper';
    if (a.aim > 0) return 'low';
    return a.name === 'heavy' ? 'heavy' : 'attack';
  }
  function pose(f, winner, holder) {
    if (winner === f.index) return ['win', 0];
    if (f.grip) {
      const grip = f.grip;
      const phase = reduced.matches ? 0.25 : (grip.time / 0.64) % 1;
      if (f.index === grip.target) {
        if (grip.phase === 'pummel' && holder?.attack?.pummel) {
          const impact = attackPhase(holder.attack);
          if (impact >= 0.4 && impact < 0.95)
            return [grip.high ? 'grappledHighFlinch' : 'grappledFlinch', impact];
        }
        return [grip.high ? 'grappledHigh' : 'grappled', phase];
      }
      if (f.index === grip.owner) {
        if ((grip.phase === 'throw' || grip.phase === 'pummel') && f.attack)
          return [attackPose(f), attackPhase(f.attack)];
        return [grip.grabId + 'Hold', phase];
      }
    }
    if (f.stun > 0) {
      if (!f.reaction) return ['hurt', 0.3];
      return [f.reaction.hard ? 'launch' : 'hurt', clamp(1 - f.stun / f.reaction.duration, 0, 1)];
    }
    if (f.dodge > 0) return ['dodge', 1 - f.dodge / 0.27];
    if (f.shield) return ['shield', 0];
    if (f.attack) return [attackPose(f), attackPhase(f.attack)];
    if (f.smashCharge && f.charge >= 0) {
      const power = clamp(f.charge / window.DogFight.smashChargeTime, 0, 1);
      return [f.smashCharge.moveId, 0.08 + 0.26 * power];
    }
    if (f.charge >= 0) {
      let windup = 'heavy';
      if (f.charge < 0.115) {
        if (f.chargeAim) windup = f.chargeAim < 0 ? 'upper' : 'low';
        else windup = f.kit.ground[f.chainWindow > 0 ? f.chainNext : 0];
      }
      return [windup, Math.min(0.21, 0.04 + 2 * f.charge)];
    }
    if (f.ledge) return ['ledge', f.ledgeTime];
    if (f.reboundTime > 0) return [f.reboundPose, 0.56 + 0.4 * (1 - f.reboundTime / 0.14)];
    if (f.ground < 0) {
      if (f.vy < 0) return ['jump', clamp(1 + f.vy / f.stats.jump, 0, 1)];
      return ['fall', clamp(f.vy / f.stats.jump, 0, 1)];
    }
    if (f.landTime > 0) return ['land', 1 - f.landTime / 0.12];
    if (f.skidTime > 0) return ['skid', 1 - f.skidTime / 0.14];
    return [Math.abs(f.vx) > 50 ? 'run' : 'idle', 0];
  }
  function glint(ctx, x, y, size, color) {
    const d = Math.max(3, snap(size));
    pixelLine(ctx, x - d, y, x + d, y, color);
    pixelLine(ctx, x, y - d, x, y + d, color);
    ctx.fillStyle = cream;
    ctx.fillRect(snap(x), snap(y), 3, 3);
  }
  function drawSmashCharge(ctx, f) {
    const { side, face, moveId } = f.smashCharge;
    const power = clamp(f.charge / window.DogFight.smashChargeTime, 0, 1);
    const tint = chargeColors[f.kind];
    const up = side === 'up',
      down = side === 'down';
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(face || f.face, 1);
    // The three teeth fill from the feet up. A fixed four-point star marks full power.
    // Both cues depend only on held charge, so a full charge remains steady.
    const baseX = -34,
      baseY = -5;
    for (let i = 0; i < 3; i++) {
      const x = baseX - i * 5,
        y = baseY - i * 3;
      ctx.fillStyle = ink;
      ctx.fillRect(x - 1, y - 1, 6, 5);
      ctx.fillStyle = power >= (i + 1) / 3 - 1e-8 ? tint : '#726775';
      ctx.fillRect(x, y, 4, 3);
    }
    const px = up ? 4 : down ? 35 : 37;
    const py = up ? -f.stats.height - 4 : down ? -6 : -39;
    if (power > 0.1) {
      const step = Math.min(3, Math.ceil(3 * power));
      if (f.kind === 'pip') {
        pixelLine(ctx, px - 8, py - 2, px - 3 - (up ? 1 : 0), py - 4 - step, tint);
        if (step >= 2) pixelLine(ctx, px - 3, py + 4, px + 3, py + 2, cream);
      } else if (f.kind === 'brisket') {
        for (const dir of [-1, 1]) {
          pixelLine(ctx, dir * 25, -4, dir * (28 + step * 3), -8, tint);
          if (step >= 2) pixelLine(ctx, dir * 28, -10, dir * 32, -13 - step, cream);
        }
      } else if (f.kind === 'noodle') {
        const [hx, hy] = window.DogArt.itemPoint(f.kind, moveId, 0.08 + power * 0.26);
        arc(ctx, hx + 4, hy + 3, 5 + step * 2, 5, 0.3, 4.9, tint);
      } else {
        const [hx, hy] = window.DogArt.itemPoint(f.kind, moveId, 0.08 + power * 0.26);
        arc(ctx, hx, hy, 10 + step * 2, 5 + (up ? 2 : 0), 3.1, 5.45, tint);
        if (step >= 2) pixelLine(ctx, hx + 8, hy - 4, hx + 10, hy - 7, cream);
      }
    }
    if (power >= 1 - 1e-8) glint(ctx, px + (up ? 6 : 13), py - (up ? 5 : 6), 6, tint);
    ctx.restore();
  }
  function ropeTrace(ctx, points, tip, sweet) {
    // Underpaint the complete cord before adding its warm braided edge.
    for (const [color, width] of [
      [ink, 6],
      ['#e4ab68', 3],
    ]) {
      for (let i = 1; i < points.length; i++) pixelLine(ctx, ...points[i - 1], ...points[i], color, width);
      arc(ctx, tip[0], tip[1], 7, 5, 0, Math.PI * 2, color, width);
    }
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1],
        [bx, by] = points[i];
      if (Math.hypot(bx - ax, by - ay) > 19)
        pixelLine(
          ctx,
          ax + (bx - ax) * 0.54,
          ay + (by - ay) * 0.54,
          ax + (bx - ax) * 0.62,
          ay + (by - ay) * 0.62,
          '#f7d39a',
        );
    }
    if (sweet) glint(ctx, tip[0] + 6, tip[1] - 3, 5, cream);
  }
  function catchReach(ctx, f, a) {
    if (f.grip) return;
    const phase = attackPhase(a);
    const [x, y, rx] = a.box;
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(f.face, 1);
    if (f.kind === 'noodle') {
      const hand = window.DogArt.itemPoint(f.kind, a.moveId, phase);
      // Pay the loop out before contact. A missed cast winds back into the same paw.
      const extension =
        a.time < a.start
          ? clamp((a.time / a.start - 0.3) / 0.7, 0, 1)
          : 1 - clamp((a.time - a.start - a.active) / (a.end - a.start - a.active), 0, 1);
      if (hand && extension > 0.06) {
        const ex = hand[0] + (x + rx - hand[0]) * extension;
        const ey = hand[1] + (y - hand[1]) * extension;
        const slack = 9 * (1 - extension);
        const tip = [ex, ey];
        ropeTrace(ctx, [hand, [(hand[0] + ex) / 2, (hand[1] + ey) / 2 + slack], tip], tip, false);
      }
    } else if (a.time + 1e-8 >= a.start && a.time < a.start + a.active) {
      const hand = window.DogArt.pawPoint?.(f.kind, a.moveId, phase) || [x + rx - 7, y];
      const [hx, hy] = hand;
      if (f.kind === 'pip') {
        pixelLine(ctx, hx + 1, hy - 6, hx + 8, hy - 9, cream, 2, 2);
        pixelLine(ctx, hx + 2, hy + 1, hx + 9, hy, '#ee9775', 2, 2);
      } else if (f.kind === 'brisket') {
        arc(ctx, hx + 1, hy, 10, 12, -0.97, 0.72, gold);
        pixelLine(ctx, hx + 3, hy + 9, hx - 2, hy + 12, cream);
      } else {
        const rim = window.DogArt.itemPoint(f.kind, a.moveId, phase) || hand;
        arc(ctx, rim[0] - 3, rim[1] + 1, 14, 7, -0.95, 1.29, lilac);
      }
    }
    ctx.restore();
  }
  function gripLead(ctx, owner, grip) {
    if (owner.kind !== 'noodle' || !grip.anchor) return;
    const [name, phase] = pose(owner, null);
    const hand = window.DogArt.itemPoint(owner.kind, name, phase);
    if (!hand) return;
    // Both coordinates are in world space. The loop stays on the captive's chest
    // as the physics moves the pair over a shoulder or across a platform.
    const from = [snap(owner.x, 2) + grip.face * hand[0], snap(owner.y, 2) + hand[1]];
    const tip = [grip.anchor.x, grip.anchor.y];
    ropeTrace(ctx, [from, tip], tip, false);
  }
  function pummelContact(ctx, x, y, kind, face, count, progress) {
    ctx.save();
    ctx.translate(snap(x, 2), snap(y, 2));
    ctx.scale(face, 1);
    const drift = reduced.matches ? 0 : snap(4 * progress, 2);
    const tick = (x1, y1, x2, y2, color) => {
      pixelLine(ctx, x1, y1, x2, y2, ink, 4, 2);
      pixelLine(ctx, x1, y1, x2, y2, color, 2, 2);
    };
    // The brief contact marks all fit on the captive's chest. The held line
    // and disc remain with their regular sprite layers.
    if (kind === 'pip') {
      const tap = count % 2 === 0 ? 2 : -2;
      tick(3 + drift, -3 + tap, 8 + drift, -7 + tap, cream);
      tick(5 + drift, 1 + tap, 11 + drift, 1 + tap, '#ee9775');
    } else if (kind === 'brisket') {
      for (const sign of [-1, 1]) {
        const edge = sign * (11 - drift);
        tick(edge + sign * 3, -5, edge, -2, gold);
        tick(edge, 1, edge + sign * 3, 4, '#f6d69c');
      }
    } else if (kind === 'noodle') {
      // Two tension ticks above the existing knot, with no second strand.
      tick(-5 - drift, -7, -8 - drift, -11, '#a6ceb0');
      tick(2, -8, 4, -12 - drift, cream);
    } else {
      arc(ctx, 1, 0, 10 + drift, 6, -1.1, 0.53, ink, 4);
      arc(ctx, 1, 0, 10 + drift, 6, -1.1, 0.53, lilac, 2);
      tick(6 + drift, -5, 9 + drift, -9, cream);
    }
    ctx.restore();
  }
  function throwVector(move, side, face) {
    const angle = (move.angle * Math.PI) / 180;
    const sign = (side === 'back' || move.reverseLaunch ? -1 : 1) * face;
    return [Math.cos(angle) * sign, -Math.sin(angle)];
  }
  function throwTrail(ctx, x, y, dx, dy, kind, progress) {
    const tint = chargeColors[kind] || cream;
    const travel = reduced.matches ? 0 : progress * 13;
    const stretch = (1 - progress) * (kind === 'brisket' ? 17 : 12);
    // Draw in launch-vector coordinates, while keeping every mark on screen-space pixels.
    const stroke = (from, offset, to, offset2, color, width = 3) =>
      pixelLine(
        ctx,
        x + dx * from - dy * offset,
        y + dy * from + dx * offset,
        x + dx * to - dy * offset2,
        y + dy * to + dx * offset2,
        color,
        width,
      );
    if (kind === 'brisket') {
      stroke(travel - 9, -14 - stretch * 0.24, travel - 3, -6, tint, 4);
      stroke(travel - 3, 6, travel - 10, 15 + stretch * 0.24, tint, 4);
      if (!reduced.matches) stroke(travel - 18, -2, travel - 8, -2, cream);
    } else if (kind === 'clover') {
      stroke(travel - 7 - stretch, -5, travel - 4, -4, lilac);
      stroke(travel - 4, -4, travel + 2, -7, cream, 2);
      stroke(travel - 9 - stretch * 0.6, 5, travel - 1, 4, lilac, 2);
    } else if (kind === 'noodle') {
      stroke(travel - 14 - stretch * 0.5, -4, travel - 8, 1, tint);
      stroke(travel - 8, 1, travel - 3, -4, cream);
      if (!reduced.matches) stroke(travel - 8, 6, travel - 1, 6, tint, 2);
    } else {
      stroke(travel - 10 - stretch, -5, travel - 1, -5, cream);
      stroke(travel - 10 - stretch * 0.65, 4, travel - 4, 3, tint, 2);
    }
  }
  function throwFollowThrough(ctx, f, a) {
    if (!a.thrown || a.time >= a.start + a.active + 0.055) return;
    const progress = clamp((a.time - a.start) / (a.active + 0.055), 0, 1);
    const phase = attackPhase(a);
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(f.face, 1);
    if (f.kind === 'noodle') {
      const hand = window.DogArt.itemPoint(f.kind, a.moveId, phase);
      if (hand) {
        // The released line is loose and visibly short of the departed chest.
        const slack = 0.54 * (1 - progress) ** 2;
        const tip = [
          hand[0] + (a.release[0] - hand[0]) * slack,
          hand[1] + (a.release[1] - hand[1]) * slack + 5,
        ];
        if (Math.hypot(tip[0] - hand[0], tip[1] - hand[1]) > 7)
          ropeTrace(ctx, [hand, [(hand[0] + tip[0]) / 2, (hand[1] + tip[1]) / 2 + 6], tip], tip, false);
      }
    } else if (f.kind === 'clover') {
      const rim = window.DogArt.itemPoint(f.kind, a.moveId, phase);
      if (rim) arc(ctx, rim[0] - 1, rim[1] + 2, 13, 7, -0.98 + progress * 0.3, 0.7 + progress * 0.3, lilac);
    } else if (f.kind === 'pip' && a.throwSide === 'down' && f.ground >= 0) {
      pixelLine(ctx, 27 + progress * 7, -2, 44 + progress * 8, -3, '#dfa879');
    }
    ctx.restore();
  }
  function floorThrow(ctx, x, y, face, heavy, p) {
    const spread = (heavy ? 19 : 12) + (reduced.matches ? 0 : p * (heavy ? 17 : 19));
    for (const side of [-1, 1]) {
      const dir = face * side;
      const extent = heavy || side > 0 ? spread : spread * 0.52;
      pixelLine(ctx, x + dir * 4, y - 1, x + dir * (extent - 5), y - 2, heavy ? '#dba678' : lilac);
      pixelLine(ctx, x + dir * (extent - 5), y - 2, x + dir * extent, y - (heavy ? 6 : 4), cream, 2);
    }
  }
  function smashSwing(ctx, f, a) {
    const beat = attackWindow(a);
    if (a.time + 1e-8 < beat.start || a.time >= beat.start + beat.active) return;
    const p = clamp((a.time - beat.start) / beat.active, 0, 1);
    const second = beat === a.second,
      power = a.power;
    const [x, y, rx, ry] = beat.box || a.box;
    const far = x + rx - 5,
      top = y - ry + 5;
    const wide = power >= 0.65 ? 6 : 3;
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(f.face, 1);
    switch (a.moveId) {
      case 'pipBoltKick':
        pixelLine(ctx, far - 32 + p * 11, y + 8, far, y - 2, cream, wide);
        pixelLine(ctx, far - 30 + p * 13, y + 14, far - 11, y + 8, '#ed9c79');
        if (!reduced.matches) pixelLine(ctx, -25, -19, -43 - 9 * power, -16, '#deb181');
        break;
      case 'pipScissors': {
        const targetX = x + (second ? -rx * 0.58 : rx * 0.76);
        const fromX = targetX + (second ? 20 : -21);
        pixelLine(ctx, fromX, top + 26 - p * 6, targetX, top, cream, wide);
        pixelLine(ctx, fromX + (second ? 7 : -6), top + 24, targetX + (second ? 7 : -7), top + 5, '#ed9c79');
        if (second && !reduced.matches)
          pixelLine(ctx, x + rx * 0.52, top + 15, x + rx * 0.77, top + 3, cream);
        break;
      }
      case 'pipDustDevil': {
        const dir = Math.sign(x) || (second ? -1 : 1);
        ctx.scale(dir, 1);
        const reach = Math.abs(x) + rx - 5;
        arc(ctx, reach * 0.54, y, reach * 0.44, Math.max(7, ry * 0.52), 0.23 + p * 0.48, 2.83, cream, wide);
        pixelLine(ctx, reach - 9 - p * 4, -5, reach + 2, -8 - p * 4, '#d79b70');
        if (!reduced.matches) pixelLine(ctx, reach - 19, -3, reach - 12, -8 - p * 5, gold);
        break;
      }
      case 'brisketHaymaker':
        arc(ctx, x - 3, y, rx * 0.9, ry * 0.78, -0.96 + p * 0.35, 0.86 + p * 0.24, gold, 6);
        pixelLine(ctx, far - 13, y - 8, far - 3, y - 5, cream);
        if (power >= 0.5) pixelLine(ctx, far - 19, y + 9, far - 6, y + 7, cream);
        break;
      case 'brisketRoofRaiser':
        for (const sign of [-1, 1]) {
          const from = x + sign * rx * 0.67;
          pixelLine(ctx, from, top + 32 - 4 * p, from - sign * 8, top + 15, gold, wide);
          pixelLine(ctx, from - sign * 8, top + 15, from - sign * 11, top + 5, cream);
        }
        if (power >= 0.5) pixelLine(ctx, x + 2, top + 9, x + 2, top, cream);
        break;
      case 'brisketQuake': {
        // First contact covers 40% of the radius; the seventh frame reaches both edges.
        const wave = clamp((a.time - a.start) / (a.active - 1 / 60), 0, 1);
        const distance = rx * (0.4 + 0.6 * wave);
        for (const dir of [-1, 1]) {
          const outer = x + dir * distance;
          pixelLine(ctx, x + dir * 22, -3, outer - dir * 13, -3, '#ce936b', wide);
          pixelLine(ctx, outer - dir * 13, -3, outer - dir * 6, -10, gold, wide);
          pixelLine(ctx, outer - dir * 6, -10, outer, -5, cream);
          if (!reduced.matches)
            pixelLine(ctx, outer - dir * 5, -8, outer, -14 - 7 * Math.sin(p * Math.PI), '#cd9976');
        }
        break;
      }
      case 'noodleLeadSnap':
      case 'noodleBellPull':
      case 'noodleSwitchback': {
        const hand = window.DogArt.itemPoint(f.kind, attackPose(f), attackPhase(a));
        const [hx, hy] = hand;
        let tip, path;
        if (a.moveId === 'noodleLeadSnap') {
          tip = [far - Math.max(0, p - 0.57) * 14, y];
          path = [
            hand,
            [hx + (tip[0] - hx) * 0.28, hy + 9 - p * 4],
            [hx + (tip[0] - hx) * 0.67, y - 6 + p * 7],
            tip,
          ];
        } else if (a.moveId === 'noodleBellPull') {
          tip = second ? [x + 2, top + Math.max(0, p - 0.59) * 12] : [far - 4, y - ry * 0.32];
          path = second
            ? [hand, [hx + 6, hy - 11], [tip[0] + 14 - p * 7, tip[1] + 17], tip]
            : [hand, [hx + 10, hy + 10], [x + rx * 0.45, y + ry * 0.64], tip];
        } else {
          // The knot and the hand cross from front to rear on the second contact cel.
          const turn = 1 - 2 * clamp((p - 0.35) / 0.4, 0, 1);
          const tail = 1 - 2 * clamp((p - 0.54) / 0.34, 0, 1);
          tip = [x + (rx - 8) * turn, y - 2 - p * 4];
          path = [
            hand,
            [x - (rx - 8) * tail, y + 1],
            [x - rx * 0.17 * turn, y + ry * 0.54],
            [x + rx * 0.42 * turn, y - 2],
            tip,
          ];
        }
        ropeTrace(ctx, path, tip, a.moveId === 'noodleLeadSnap' && p < 0.68);
        break;
      }
      case 'cloverLineDrive':
        if (a.fired) {
          pixelLine(ctx, 31 + p * 6, y - 3, 47 + p * 7, y - 5, lilac);
          if (!reduced.matches) pixelLine(ctx, 28 + p * 6, y + 4, 41 + p * 6, y + 3, cream);
        }
        break;
      case 'cloverHaloLift': {
        const [hx, hy] = window.DogArt.itemPoint(f.kind, a.moveId, attackPhase(a));
        arc(ctx, hx, hy + 3, rx * 0.68, ry * 0.42, -2.82 + p * 0.2, -0.4 + p * 0.16, lilac, wide);
        glint(ctx, hx - 4, hy - 7, 4 + power * 2, cream);
        break;
      }
      case 'cloverRimRattle': {
        const angle = (second ? Math.PI : 0) + (p - 0.44) * 1.24;
        const ex = x + Math.cos(angle) * rx * 0.78,
          ey = y + Math.sin(angle) * ry * 0.47;
        arc(ctx, x, y, rx * 0.78, ry * 0.47, angle - 1.55, angle - 0.23, lilac, wide);
        oval(ctx, ex, ey, 12, 4, ink, 2);
        oval(ctx, ex, ey - 1, 9, 2, lilac, 2);
        pixelLine(ctx, ex - 3, ey - 2, ex + 3, ey - 2, cream, 2, 2);
        break;
      }
    }
    ctx.restore();
  }
  function kitSwing(ctx, f, a) {
    const beat = attackWindow(a);
    const progress = clamp((a.time - beat.start) / beat.active, 0, 1);
    const active = a.time + 1e-8 >= beat.start && a.time < beat.start + beat.active + 0.018;
    const orbit = a.moveId === 'cloverOrbit';
    if (!active && !(orbit && a.time >= 0.035 && a.time < a.second.start + a.second.active + 0.035)) return;
    ctx.save();
    ctx.translate(snap(f.x), snap(f.y));
    ctx.scale(f.face, 1);
    const [x, y, rx, ry] = a.box;
    if (a.rope) {
      const extension = 1 - 0.3 * Math.max(0, (progress - 0.58) / 0.42);
      const endX = a.rope === 'up' ? x + 3 : a.rope === 'down' ? x + 14 : (x + rx - 6) * extension;
      const endY =
        a.rope === 'up' ? (y - ry + 10) * extension : a.rope === 'down' ? (y + ry - 6) * extension : y;
      const bend = a.rope === 'front' ? Math.round(5 * Math.sin(progress * Math.PI * 2)) : -8;
      const [handX, handY] = window.DogArt.itemPoint?.(f.kind, a.moveId, attackPhase(a)) || [22, -38];
      const pts = [
        [handX, handY],
        [
          handX + (endX - handX) * 0.45 + (a.rope === 'front' ? 0 : bend),
          handY + (endY - handY) * 0.43 + bend,
        ],
        [endX, endY],
      ];
      for (let i = 1; i < pts.length; i++) {
        pixelLine(ctx, ...pts[i - 1], ...pts[i], ink, 6);
        pixelLine(ctx, ...pts[i - 1], ...pts[i], '#dca45d', 3);
      }
      arc(ctx, endX, endY, a.rope === 'front' ? 7 : 12, 6, 0, Math.PI * 2, gold);
    } else if (orbit) {
      const angle = ((a.time - a.start) / (a.second.start - a.start)) * Math.PI * 2;
      const px = Math.cos(angle) * 51,
        py = -39 + Math.sin(angle) * 24;
      arc(ctx, 0, -39, 50, 24, angle - 0.94, angle - 0.1, '#9fbec2');
      oval(ctx, px, py, 11, 4, ink, 2);
      oval(ctx, px, py - 1, 8, 2, '#d6accb', 2);
    } else if (a.airSide === 'neutral') {
      arc(ctx, x, y, rx, ry * 0.84, -2.65 + progress, -1.5 + progress, cream);
      arc(ctx, x, y, rx, ry * 0.84, 0.45 + progress, 1.55 + progress, f.kind === 'brisket' ? gold : cream);
    } else {
      if (a.airSide === 'back') ctx.scale(-1, 1);
      const sideX = Math.abs(x);
      const up = a.airSide === 'up' || a.moveId === 'cloverSet' || a.moveId === 'brisketLift';
      const down = a.airSide === 'down';
      const tint = f.kind === 'clover' ? '#dbc2d8' : f.kind === 'brisket' ? gold : cream;
      if (up) {
        arc(ctx, sideX - 5, y + 5, rx * 0.72, ry * 0.8, -2.65 + progress * 0.5, -0.32, tint, 3);
      } else if (down) {
        const tip = y + ry - 5;
        pixelLine(ctx, sideX + 8, tip - 16 + progress * 6, sideX + 2, tip, tint, a.hard ? 5 : 3);
        pixelLine(ctx, sideX - 9, tip - 15, sideX - 11, tip - 5, cream);
      } else if (a.hard || a.moveId === 'cloverFore' || a.moveId === 'cloverBack') {
        arc(
          ctx,
          sideX - 12,
          y,
          rx * 0.93,
          ry * 0.76,
          -1.16 + progress * 0.35,
          0.72 + progress * 0.35,
          tint,
          a.hard ? 5 : 3,
        );
      } else {
        const end = sideX + rx - 7;
        pixelLine(ctx, end - 15 + progress * 7, y - 2, end, y - 4, tint);
        if (progress < 0.55) pixelLine(ctx, end - 19, y + 5, end - 12, y + 4, gold);
      }
    }
    ctx.restore();
  }
  function specialSwing(ctx, f, a) {
    const id = a.moveId;
    if (a.rope && !a.anchor && !a.reeling) return kitSwing(ctx, f, a);
    const beat = attackWindow(a);
    const active = a.time + 1e-8 >= beat.start && a.time < beat.start + beat.active;
    const progress = clamp((a.time - beat.start) / beat.active, 0, 1);
    ctx.save();
    ctx.translate(snap(f.x), snap(f.y));
    ctx.scale(f.face, 1);
    if (a.anchor || a.reeling) {
      const [hx, hy] = window.DogArt.itemPoint(f.kind, attackPose(f), attackPhase(a));
      const dest = a.anchor || a.reelTarget;
      const extension = a.anchor ? clamp(a.time / a.start, 0, 1) : 1;
      const ex = hx + ((dest.x - f.x) * f.face - hx) * extension;
      const ey = hy + (dest.y - f.y - (a.reeling ? 36 : 0) - hy) * extension;
      const mx = (hx + ex) / 2,
        my = (hy + ey) / 2 + (1 - extension) * 11;
      for (const [color, width] of [
        [ink, 6],
        ['#f1c981', 3],
      ]) {
        pixelLine(ctx, hx, hy, mx, my, color, width);
        pixelLine(ctx, mx, my, ex, ey, color, width);
      }
      arc(ctx, ex, ey, 7, 5, -Math.PI, Math.PI, '#f1c981');
    } else if (id === 'pipBark' && active) {
      const loud = beat !== a,
        x = 32 + progress * 13;
      for (let n = 0; n < (loud ? 3 : 2); n++)
        arc(ctx, x + n * 10, -46, 9 + n * 3, 10 + n * 5, -1.15, 1.05, n === 0 ? gold : cream, 3);
    } else if (id === 'brisketCannon' && a.charging) {
      const spread = 16 + a.power * 14;
      for (const sign of [-1, 1]) {
        pixelLine(ctx, sign * (spread + 8), -4, sign * (spread + 16), -13 - a.power * 8, gold, 3);
        if (a.power > 0.55) pixelLine(ctx, sign * (spread + 8), -15, sign * (spread + 11), -24, cream, 3);
      }
    } else if ((id === 'pipHopper' || id === 'brisketCannon') && active) {
      const trail = id === 'brisketCannon' ? 25 + 13 * a.power : a.secondHop ? 27 : 15;
      for (let j = 0; j < 3; j++)
        pixelLine(
          ctx,
          -17 + j * 13,
          2 + (j % 2) * 5,
          -22 + j * 13,
          trail + (j % 2) * 11,
          j === 1 ? gold : cream,
          3,
        );
    } else if (id === 'cloverSail' && !a.folded && a.time >= a.start) {
      pixelLine(ctx, -25, 3, -46, 5, '#d4bdde', 3);
      pixelLine(ctx, -36, 10, -61, 13, cream, 2);
    } else if (id === 'pipSlide') {
      for (let i = 0; i < 3; i++) {
        if (a.diving) pixelLine(ctx, -20 + i * 11, -53 - i * 4, -22 + i * 11, -65 - i * 7, cream, 3);
        else if (a.time < a.start + a.active)
          pixelLine(ctx, -28 - i * 10, -4 - (i % 2) * 4, -36 - i * 12, -6 - (i % 2) * 7, '#d5a46e', 4);
      }
    } else if (id === 'brisketBrace' && active) {
      if (a.riposte) arc(ctx, 21, -39, 46, 30, -1.18, 0.76, gold, 5);
      else {
        pixelLine(ctx, 29, -58, 35, -53, cream, 3);
        pixelLine(ctx, 35, -53, 36, -42, gold, 4);
      }
    } else if (active && ['pipPounce', 'brisketCharge', 'cloverChase'].includes(id)) {
      for (let j = 0; j < 3; j++)
        pixelLine(ctx, -27, -16 - j * 8, -46 - j * 7, -13 - j * 8, j === 1 ? gold : cream, 3);
    } else if (active && id === 'brisketClinch') {
      arc(ctx, 25, -48, 32, 29, -1.12, 0.83 - progress * 0.5, gold, 4);
    }
    ctx.restore();
  }
  function swing(ctx, f) {
    const a = f.attack;
    // A pummel lands only through its shared grip and has no free melee hitbox.
    if (a?.pummel) return;
    if (a?.grabAttempt) return catchReach(ctx, f, a);
    if (a?.throwSide) return throwFollowThrough(ctx, f, a);
    if (a?.smashSide) return smashSwing(ctx, f, a);
    if (a?.specialSide) return specialSwing(ctx, f, a);
    if (a?.moveId) {
      kitSwing(ctx, f, a);
      return;
    }
    if (!a || a.name === 'disc' || a.time < a.start || a.time > a.start + a.active + 0.02) return;
    const progress = clamp((a.time - a.start) / a.active, 0, 1);
    ctx.save();
    ctx.translate(snap(f.x), snap(f.y - 37));
    ctx.scale(f.face, 1);
    if (a.name === 'rope') {
      const reach = (f.stats.reach + a.reach) * (1 - 0.52 * Math.max(0, (progress - 0.5) / 0.5));
      const knots = [
        [15, 3],
        [reach * 0.3, 9],
        [reach * 0.65, -6],
        [reach, 0],
      ];
      for (let n = 1; n < knots.length; n++) {
        pixelLine(ctx, ...knots[n - 1], ...knots[n], ink, 7);
        pixelLine(ctx, ...knots[n - 1], ...knots[n], '#edbc76', 3);
      }
      arc(ctx, reach - 3, 0, 10, 6, 0, Math.PI * 2, gold);
    } else if (['shoulder', 'pounce', 'recover'].includes(a.name)) {
      for (let j = 0; j < 3; j++) {
        const y = -13 + j * 13;
        pixelLine(ctx, -23, y, -50 - j * 7, y + (a.name === 'recover' ? 19 : 3), j === 1 ? gold : cream);
      }
    } else if (a.aim < 0) {
      arc(ctx, 5, -f.stats.height + 39, 29, 29, -2.7 + progress * 0.45, -0.35, cream);
    } else if (a.aim > 0) {
      arc(ctx, 13, 24, f.stats.reach * 0.6, 9, -0.52, 1.94 - progress * 0.4, cream);
    } else if (a.name === 'grab') {
      const end = f.stats.reach - 13 - progress * 9;
      pixelLine(ctx, end - 14 + progress * 8, -4, end, -4, cream);
      if (progress < 0.55) pixelLine(ctx, end - 18, 2, end - 11, 2, gold);
    } else {
      const hard = a.name === 'heavy';
      const r = f.stats.reach * (hard ? 1.04 : 0.76);
      arc(ctx, 4, 0, r, r * 0.62, -1.06 + progress * 0.4, 0.67 + progress * 0.38, cream, hard ? 5 : 3);
      if (hard && progress < 0.65) arc(ctx, 6, -2, r - 7, r * 0.55, -0.8, 0.15, gold);
    }
    ctx.restore();
  }
  function drawFighter(ctx, f, world, time) {
    shadow(ctx, f, world.terrain);
    if (f.respawning > 0) oval(ctx, f.x, f.y - 3, 42, 5, team[f.index]);
    if (f.smashCharge && f.charge >= 0) drawSmashCharge(ctx, f);
    else if (f.charge > 0.21) {
      const r = 37 + f.charge * 10;
      const spin = reduced.matches ? 0 : (Math.floor(time * 12) * Math.PI) / 8;
      for (let i = 0; i < 4; i++)
        arc(ctx, f.x, f.y - 34, r, r, spin + (i * Math.PI) / 2, spin + (i * Math.PI) / 2 + 0.4, gold);
    }
    const [state, phase] = pose(f, world.end, f.grip ? world.dogs[f.grip.owner] : null);
    ctx.save();
    if (f.invuln > 0.01 && !reduced.matches && Math.floor(time * 12) % 2) ctx.globalAlpha = 0.53;
    window.DogArt.draw(ctx, f.kind, snap(f.x, 2), snap(f.y, 2), {
      face:
        state === 'skid'
          ? f.skidFace
          : f.stun > 0 && f.reaction
            ? f.reaction.face
            : f.smashCharge?.face || f.face,
      scale: 1,
      time: time + f.index * 0.42,
      pose: state,
      phase,
    });
    ctx.restore();
    swing(ctx, f);
    if (f.shield) {
      const r = 34 + f.shieldHP * 15;
      oval(ctx, f.x, f.y - 36, r, r, team[f.index] + '36');
      arc(ctx, f.x, f.y - 36, r, r, 0, Math.PI * 2, team[f.index], 4);
      arc(ctx, f.x, f.y - 36, r - 5, r - 5, 3.75, 4.42, cream);
    }
  }
  const ballPixels = [
    '....kkk....',
    '..kkyyykk..',
    '.kyyyccyyk.',
    '.kyyyccyyk.',
    'kycyyyccyyk',
    'kyycyyyccyk',
    'kyyycyyyyok',
    '.kyccyyyok.',
    '.kcyyyyoak.',
    '..kkookkk..',
    '....kkk....',
  ];
  const tennisFrames = new Map();
  function tennisSprite(charged) {
    if (tennisFrames.has(charged)) return tennisFrames.get(charged);
    const sprite = document.createElement('canvas');
    sprite.width = 11;
    sprite.height = 11;
    const ctx = sprite.getContext('2d');
    const colors = {
      k: ink,
      y: charged ? '#ffc658' : '#c4d96b',
      c: cream,
      o: charged ? '#dd7c43' : '#8caa5c',
      a: '#646b4b',
    };
    ballPixels.forEach((row, y) =>
      [...row].forEach((pixel, x) => {
        if (pixel !== '.') {
          ctx.fillStyle = colors[pixel];
          ctx.fillRect(x, y, 1, 1);
        }
      }),
    );
    tennisFrames.set(charged, sprite);
    return sprite;
  }
  function drawBall(ctx, b, time) {
    if (!b) return;
    const x = snap(b.x, 2),
      y = snap(b.y, 2);
    ctx.save();
    ctx.translate(x, y);
    if (b.hits === 3) {
      const dir = Math.sign(b.vx) || 1;
      pixelLine(ctx, -dir * 45, -5, -dir * 5, -5, '#e67549', 6);
      pixelLine(ctx, -dir * 35, 1, -dir * 5, 1, gold, 8);
      pixelLine(ctx, -dir * 19, 8, -dir * 7, 8, cream);
    }
    const flip = Math.floor(time * (b.owner < 0 ? 3 : 10)) % 2;
    ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(tennisSprite(b.hits === 3), -13, -13, 26, 26);
    ctx.restore();
    for (let i = 0; i < Math.min(2, b.hits); i++) {
      const pawX = x - 7 + i * 10,
        pawY = y - 24;
      ctx.fillStyle = cream;
      ctx.fillRect(pawX, pawY + 4, 6, 3);
      for (const dx of [-1, 2, 5]) ctx.fillRect(pawX + dx, pawY, 2, 3);
    }
  }
  function spark(ctx, x, y, r, color, progress, burst) {
    const spokes = burst ? 9 : 6;
    const inner = r * (0.08 + progress * 0.64);
    const outer = r * (0.75 + progress * 0.32);
    for (let i = 0; i < spokes; i++) {
      const angle = (i * Math.PI * 2) / spokes + (burst ? 0.21 : -0.34);
      const length = i % 2 ? outer * 0.77 : outer;
      const dx = Math.cos(angle),
        dy = Math.sin(angle);
      pixelLine(
        ctx,
        x + inner * dx,
        y + inner * dy,
        x + length * dx,
        y + length * dy,
        color,
        progress < 0.55 ? 6 : 3,
      );
    }
    if (progress < 0.62) {
      const size = snap(r * (0.31 - progress * 0.24));
      ctx.fillStyle = cream;
      ctx.fillRect(snap(x - size), snap(y - 3), size * 2, 6);
      ctx.fillRect(snap(x - 3), snap(y - size), 6, size * 2);
    }
  }
  function drawEffect(ctx, e) {
    const p = 1 - clamp(e.life / e.max, 0, 1);
    if (e.type === 'pummel') {
      pummelContact(ctx, e.x, e.y, e.kind, e.face, e.count, p);
      return;
    }
    if (e.type === 'toss') {
      throwTrail(ctx, e.x, e.y, e.dx, e.dy, e.kind, p);
      return;
    }
    if (e.type === 'throwFloor') {
      floorThrow(ctx, e.x, e.y, e.face, e.heavy, p);
      return;
    }
    if (e.type === 'grip' || e.type === 'escape') {
      const gap = reduced.matches ? 10 : e.type === 'grip' ? 15 - 6 * p : 8 + 12 * p;
      for (const dir of [-1, 1]) {
        const at = e.x + dir * gap;
        pixelLine(ctx, at + dir * 4, e.y - 6, at, e.y - 2, e.color);
        pixelLine(ctx, at, e.y + 2, at + dir * 4, e.y + 6, e.color);
      }
      return;
    }
    if (e.type === 'sweet') {
      glint(ctx, e.x, e.y, reduced.matches ? 4 : e.size * (1 - p * 0.75), e.color);
      return;
    }
    const row = atlasRow[e.type];
    if (row !== undefined && effectsAtlas.naturalWidth) {
      const frame = Math.min(4, Math.floor(p * 5));
      const floor = e.type === 'land' || e.type === 'skid';
      ctx.save();
      ctx.translate(snap(e.x, 2), snap(e.y, 2));
      ctx.scale(e.face, 1);
      ctx.drawImage(
        effectsAtlas,
        frame * 32,
        row * 32,
        32,
        32,
        -e.size / 2,
        (-e.size * (floor ? 27 : 16)) / 32,
        e.size,
        e.size,
      );
      ctx.restore();
      return;
    }
    const radius = e.size * (0.42 + p);
    if (e.type === 'ring') arc(ctx, e.x, e.y, radius, radius * 0.4, 0, Math.PI * 2, e.color);
    else if (!e.behind)
      spark(ctx, e.x, e.y, row === undefined ? radius : radius * 0.38, e.color, p, e.type === 'burst');
  }
  class FightView {
    constructor() {
      this.effects = [];
      this.lastTrail = [-1, -1];
      this.leftFighter = 0;
      this.shake = 0;
      this.zoom = 1;
      this.cx = 600;
      this.cy = 337.5;
    }
    add(type, x, y, color, life, size, face = 1, details) {
      const behind = type === 'smoke' || type === 'land' || type === 'skid';
      this.effects.push({ type, x, y, color, life, max: life, size, face, behind, ...details });
    }
    event(name, e) {
      const f = e.f;
      if (name === 'jump' || name === 'recover')
        this.add('ring', f.x, f.y, name === 'jump' ? cream : team[f.index], 0.23, 21);
      if (name === 'hit' || name === 'block') {
        const face = e.face || 1;
        const point = e.point || { x: f.x - face * f.stats.width * 0.7, y: f.y - f.stats.height * 0.54 };
        if (name === 'block') this.add('block', point.x - face * 7, point.y, team[f.index], 0.16, 54, face);
        else {
          this.add(
            e.emphatic ? 'impact' : 'light',
            point.x,
            point.y,
            e.emphatic ? gold : cream,
            e.emphatic ? 0.19 : 0.14,
            e.emphatic ? (e.name === 'finisher' ? 54 : 62) : 45,
            face,
          );
          if (!reduced.matches && e.emphatic) this.shake = Math.min(7, 2 + e.speed * 0.006);
        }
      }
      if (name === 'break') this.add('ring', f.x, f.y - 38, team[f.index], 0.3, 73);
      if (name === 'counter') this.add('block', f.x + f.face * 26, f.y - 40, gold, 0.22, 65, f.face);
      if (name === 'sweetSpot' && e.point) {
        const tint = e.moveId === 'cloverHaloLift' ? lilac : gold;
        this.add('sweet', e.point.x + (e.face || 1) * 8, e.point.y - 9, tint, 0.17, 8);
      }
      if (name === 'grabCatch') this.add('grip', e.point.x, e.point.y, chargeColors[f.kind], 0.14, 15);
      if (name === 'pummelHit')
        this.add('pummel', e.point.x, e.point.y, chargeColors[f.kind], 0.11, 12, e.face, {
          kind: f.kind,
          count: e.count,
        });
      if (name === 'grabEscape') this.add('escape', e.point.x, e.point.y, '#b9dddd', 0.17, 17);
      if (name === 'grabClash') this.add('block', e.point.x, e.point.y, cream, 0.15, 42);
      if (name === 'throwRelease') {
        const speed = Math.hypot(e.target.vx, e.target.vy);
        const [dx, dy] =
          speed > 0
            ? [e.target.vx / speed, e.target.vy / speed]
            : throwVector(window.DogFight.throws[e.moveId], e.direction, f.face);
        this.add('toss', e.point.x - dx * 6, e.point.y - dy * 6, chargeColors[f.kind], 0.16, 18, e.face, {
          kind: f.kind,
          dx,
          dy,
        });
      }
      if (name === 'throwBounce') {
        const heavy = e.owner.kind === 'brisket';
        this.add('land', e.point.x, e.point.y, cream, heavy ? 0.21 : 0.14, heavy ? 72 : 48, e.face);
        this.add('throwFloor', e.point.x, e.point.y, chargeColors[e.owner.kind], 0.16, 23, e.face, { heavy });
      }
      if (name === 'catch') this.add('star', f.x + f.face * 24, f.y - 40, cream, 0.17, 24);
      if (name === 'skip') this.add('ring', e.x, e.y, gold, 0.14, 15);
      if (name === 'land') this.add('land', f.x, f.y, cream, 0.2, clamp(35 + e.speed * 0.045, 46, 72));
      if (name === 'skid') this.add('skid', f.x - e.face * 9, f.y, cream, 0.18, 56, e.face);
      if (name === 'swat') this.add('star', e.ball.x, e.ball.y, gold, 0.2, 25);
      if (name === 'ko') {
        this.add('burst', clamp(e.x, 30, 1170), clamp(e.y, 38, 620), team[f.index], 0.7, 108);
        if (!reduced.matches) this.shake = 10;
      }
      if (name === 'ledge') this.add('star', f.ledge.x, f.ledge.y, cream, 0.19, 16);
    }
    draw(canvas, world, dt, time) {
      const ctx = canvas.getContext('2d'),
        [a, b] = world.dogs;
      ctx.imageSmoothingEnabled = false;
      const spread = Math.abs(a.x - b.x);
      const vertical = Math.abs(a.y - b.y);
      const off = [a, b].some((f) => f.x < 155 || f.x > 1045 || f.y > 490 || f.y < 80);
      const targetZoom =
        off || reduced.matches ? 1 : clamp(Math.min(1200 / (spread + 505), 675 / (vertical + 345)), 1, 1.5);
      const blend = 1 - Math.exp(-dt * (targetZoom < this.zoom ? 7.5 : 4));
      this.zoom += (targetZoom - this.zoom) * blend;
      const halfW = 600 / this.zoom,
        halfH = 337.5 / this.zoom;
      this.cx += (clamp((a.x + b.x) / 2, halfW, 1200 - halfW) - this.cx) * blend;
      this.cy += (clamp((a.y + b.y) / 2 - 67, halfH, 675 - halfH) - this.cy) * blend;
      const sx = reduced.matches ? 0 : snap(Math.sin(time * 97) * this.shake, 2),
        sy = reduced.matches ? 0 : snap(Math.cos(time * 81) * this.shake * 0.55, 2);
      this.shake = Math.max(0, this.shake - 62 * dt);
      ctx.save();
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, 1200, 675);
      ctx.translate(600 + sx, 337 + sy);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-Math.round(this.cx), -Math.round(this.cy));
      window.ArenaArt.draw(ctx, world.stage, world.time);
      if (spread > 14) this.leftFighter = a.x < b.x ? 0 : 1;
      fighterTags(ctx, world, this.leftFighter);
      for (const f of world.dogs) {
        const speed = Math.hypot(f.vx, f.vy);
        if (!reduced.matches && f.stun > 0 && speed > 460 && world.time - this.lastTrail[f.index] > 0.052) {
          this.lastTrail[f.index] = world.time;
          this.add(
            'smoke',
            f.x - f.vx * 0.028,
            f.y - f.stats.height * 0.48 - f.vy * 0.028,
            cream,
            0.24,
            clamp(speed * 0.052, 27, 54),
          );
        }
      }
      for (const e of this.effects) if (e.behind) drawEffect(ctx, e);
      const poseTime = world.end === null ? world.time : time;
      if (world.grapple) {
        const grip = world.grapple,
          holder = world.dogs[grip.owner],
          captive = world.dogs[grip.target];
        // The holding paws and Noodle's line stay visible for either player slot.
        drawFighter(ctx, captive, world, poseTime);
        drawFighter(ctx, holder, world, poseTime);
        gripLead(ctx, holder, grip);
      } else {
        for (const f of world.dogs) if (f.stocks > 0) drawFighter(ctx, f, world, poseTime);
      }
      for (const d of world.projectiles) {
        drawItem(ctx, d);
      }
      drawBall(ctx, world.ball, world.time);
      for (const e of this.effects) {
        if (!e.behind) drawEffect(ctx, e);
        e.life -= dt;
      }
      this.effects = this.effects.filter((e) => e.life > 0);
      ctx.restore();
      for (const f of world.dogs) {
        const x = (f.x - this.cx) * this.zoom + 600,
          y = (f.y - 35 - this.cy) * this.zoom + 337.5;
        if (f.stocks <= 0 || (x >= 10 && x <= 1190 && y >= 0 && y <= 679)) continue;
        const px = clamp(x, 27, 1173),
          py = clamp(y, 26, 646);
        ctx.fillStyle = ink;
        ctx.fillRect(px - 23, py - 23, 46, 46);
        ctx.fillStyle = team[f.index];
        ctx.fillRect(px - 20, py - 20, 40, 40);
        ctx.save();
        ctx.beginPath();
        ctx.rect(px - 19, py - 19, 38, 38);
        ctx.clip();
        window.DogArt.draw(ctx, f.kind, px, py + 25, { face: f.face, scale: 0.53, time, pose: 'fall' });
        ctx.restore();
      }
    }
  }
  const moveThumbnails = new Map();
  function drawItem(ctx, d) {
    if (d.type === 'drive') {
      const direction = Math.sign(d.vx) || 1;
      const power = clamp(d.power || 0, 0, 1);
      const rim = reduced.matches ? 3 : 2 + (Math.floor(d.age * 12) % 3);
      ctx.save();
      ctx.translate(snap(d.x, 2), snap(d.y, 2));
      ctx.scale(direction, 1);
      pixelLine(ctx, -32 - power * 11, 0, -12, 0, lilac, 4, 2);
      if (!reduced.matches) pixelLine(ctx, -24 - power * 7, 5, -12, 4, '#9089b0', 2, 2);
      oval(ctx, 0, 0, 18, rim + 2, ink, 2);
      oval(ctx, 0, -1, 16, rim, '#a28abb', 2);
      pixelLine(ctx, -8, -2, 5, -2, '#e7c7d9', 2, 2);
      pixelLine(ctx, 10, -2, 15, 0, gold, 2, 2);
      ctx.restore();
      return;
    }
    if (d.type === 'snare') {
      const open = d.platform >= 0 && d.armedIn <= 0;
      for (const [color, width] of [
        [ink, 6],
        ['#e7b674', 3],
      ]) {
        arc(ctx, d.x, d.y - 2, open ? 21 : 12, open ? 5 : 7, 0, Math.PI * 2, color, width);
        pixelLine(ctx, d.x + 6, d.y - 1, d.x + 23, d.y - 6, color, width);
      }
      if (open) pixelLine(ctx, d.x - 15, d.y - 4, d.x - 10, d.y - 6, cream, 2);
      return;
    }
    const h = 2 + (Math.floor(d.age * 12) % 3);
    oval(ctx, d.x, d.y, 20, h + 3, ink, 2);
    oval(ctx, d.x, d.y - 1, 17, h, d.type === 'skip' ? '#e7ad63' : '#ad91ba', 2);
    pixelLine(ctx, d.x - 8, d.y - 2, d.x + 5, d.y - 2, cream, 2, 2);
    if (d.type === 'skip')
      pixelLine(ctx, d.x - Math.sign(d.vx) * 22, d.y - 2, d.x - Math.sign(d.vx) * 35, d.y - 5, '#ecbe7e', 2);
  }
  function throwGuidePartner(ctx, f, side, catching) {
    const a = f.attack;
    const kind = f.kind === 'brisket' ? 'pip' : 'brisket';
    const chestToFeet = window.DogFight.fighters[kind].height * 0.52;
    let x,
      y,
      face = -1,
      victimPose = 'grappled',
      phase = 0.25,
      release = null;
    if (a.pummel) {
      const { kits, grabs } = window.DogFight;
      const grabId = kits[f.kind].grab;
      const hold = grabs[grabId].grip;
      // The first contact frame and the captive's peak recoil share this anchor.
      a.time = a.start;
      x = hold[0] + a.recoil[0];
      y = hold[1] + a.recoil[1];
      f.grip = {
        owner: 0,
        target: 1,
        face: 1,
        grabId,
        phase: 'pummel',
        time: a.time,
        anchor: { x, y },
        high: y < -70,
      };
      [victimPose, phase] = pose({ index: 1, grip: f.grip }, null, f);
    } else if (catching) {
      const hand =
        window.DogArt.itemPoint(f.kind, a.moveId, attackPhase(a)) ||
        window.DogArt.pawPoint?.(f.kind, a.moveId, attackPhase(a)) ||
        a.grip;
      x = f.kind === 'noodle' ? a.box[0] + a.box[2] : clamp(hand[0] + 3, a.grip[0], a.box[0] + a.box[2]);
      y = f.kind === 'noodle' ? a.box[1] : clamp(hand[1], a.box[1] - a.box[3], a.box[1] + a.box[3]);
    } else if (f.kind === 'noodle' && (side === 'back' || side === 'up')) {
      // Show the taut rope one simulation frame before release. This is the same
      // second half of the handoff path that the captive follows during the match.
      a.time = a.start - 1 / 60;
      const t = clamp((2 * a.time) / a.start - 1, 0, 1),
        eased = t * t * (3 - 2 * t);
      x = a.via[0] + (a.release[0] - a.via[0]) * eased;
      y = a.via[1] + (a.release[1] - a.via[1]) * eased;
      face = x < 0 ? 1 : -1;
      victimPose = y < -70 ? 'grappledHigh' : 'grappled';
      f.grip = {
        owner: 0,
        target: 1,
        face: 1,
        phase: 'throw',
        time: a.time,
        anchor: { x, y },
        high: y < -70,
      };
    } else {
      a.thrown = true;
      const [dx, dy] = throwVector(a, side, 1);
      const distance = a.bounce
        ? clamp((-a.release[1] - chestToFeet) / dy, 0, 58)
        : clamp(a.base * 0.065, 12, 26);
      x = a.release[0] + dx * distance;
      y = a.release[1] + dy * distance;
      face = dx < 0 ? -1 : 1;
      victimPose = a.hard ? 'launch' : 'hurt';
      phase = 0.27;
      release = { dx, dy, floor: a.bounce ? { x, y: y + chestToFeet } : null };
    }
    window.DogArt.draw(ctx, kind, x, y + chestToFeet, { face, scale: 1, time: 0, pose: victimPose, phase });
    return release;
  }
  function drawMoveThumbnail(canvas, kind, side, category = 'air') {
    const { kits, moves, specials, smashes, grabs, throws, pummels, fighters } = window.DogFight;
    const grapple = category === 'throws',
      catching = grapple && side === 'grab',
      pummeling = grapple && side === 'pummel';
    const id = catching || pummeling ? kits[kind][side] : kits[kind][category][side];
    const book = { air: moves, specials, smashes, throws: catching ? grabs : pummeling ? pummels : throws };
    const move = book[category][id];
    const target = canvas.getContext('2d');
    const cacheKey = id + '/' + canvas.width + '/' + canvas.height;
    const cached = moveThumbnails.get(cacheKey);
    target.clearRect(0, 0, canvas.width, canvas.height);
    if (cached) {
      target.drawImage(cached, 0, 0);
      return;
    }
    // Fit the whole silhouette, including the rope or disc beyond the dog's body.
    const source = document.createElement('canvas');
    const smash = category === 'smashes';
    source.width = grapple ? 420 : smash ? 400 : 320;
    source.height = grapple ? 330 : smash ? 312 : 272;
    const ctx = source.getContext('2d');
    ctx.translate(smash || grapple ? 190 : 150, grapple ? 190 : smash ? 185 : 158);
    const beat = (id === 'pipScissors' || id === 'noodleBellPull') && move.second ? move.second : move;
    const a = { ...move, moveId: id, time: beat.start + beat.active * 0.35, power: 0.75 };
    if (category === 'air') a.airSide = side;
    else if (smash) {
      a.smashSide = side;
      a.fired = !!a.projectile;
    } else if (grapple) {
      if (catching) a.grabAttempt = true;
      else if (pummeling) a.pummel = true;
      else a.throwSide = side;
    } else a.specialSide = side;
    if (id === 'noodleLasso') a.anchor = { x: 86, y: -86 };
    const fighter = { kind, index: 0, face: 1, x: 0, y: 0, ground: 0, stats: fighters[kind], attack: a };
    const release = grapple ? throwGuidePartner(ctx, fighter, side, catching) : null;
    window.DogArt.draw(ctx, kind, 0, 0, {
      face: 1,
      scale: 1,
      time: 0,
      pose: attackPose(fighter),
      phase: attackPhase(a),
    });
    swing(ctx, fighter);
    if (fighter.grip) gripLead(ctx, fighter, fighter.grip);
    if (pummeling) {
      const point = fighter.grip.anchor;
      pummelContact(ctx, point.x, point.y, kind, 1, 1, 0.25);
    }
    if (release) {
      throwTrail(
        ctx,
        a.release[0] - 6 * release.dx,
        a.release[1] - 6 * release.dy,
        release.dx,
        release.dy,
        kind,
        0.25,
      );
      if (release.floor)
        floorThrow(
          ctx,
          release.floor.x,
          release.floor.y,
          Math.sign(release.dx) || 1,
          kind === 'brisket',
          0.3,
        );
    }
    if (a.projectile)
      drawItem(ctx, {
        type: a.projectile,
        age: 0.14,
        x: a.projectile === 'drive' ? 85 : 73,
        y:
          a.projectile === 'snare'
            ? -6
            : a.projectile === 'skip'
              ? -23
              : a.projectile === 'drive'
                ? -39
                : -43,
        power: a.power,
        platform: 0,
        armedIn: 0,
        vx: 1,
      });
    const { data } = ctx.getImageData(0, 0, source.width, source.height);
    let left = source.width,
      right = -1,
      top = source.height,
      bottom = -1;
    for (let y = 0; y < source.height; y++)
      for (let x = 0; x < source.width; x++) {
        if (!data[(y * source.width + x) * 4 + 3]) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = y;
      }
    if (right < left) return;
    const w = right - left + 1,
      h = bottom - top + 1;
    const scale = Math.min(0.88, (canvas.width - 8) / w, (canvas.height - 8) / h);
    const width = Math.round(w * scale),
      height = Math.round(h * scale);
    target.imageSmoothingEnabled = false;
    target.drawImage(
      source,
      left,
      top,
      w,
      h,
      Math.round((canvas.width - width) / 2),
      Math.round((canvas.height - height) / 2),
      width,
      height,
    );
    const thumbnail = document.createElement('canvas');
    thumbnail.width = canvas.width;
    thumbnail.height = canvas.height;
    thumbnail.getContext('2d').drawImage(canvas, 0, 0);
    moveThumbnails.set(cacheKey, thumbnail);
  }
  window.DogFightView = { FightView, drawPreview, drawMoveThumbnail };
})();
