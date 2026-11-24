(() => {
  'use strict';

  const { clamp, platforms, attackWindow, topBlastY, shieldBubble, isReversalPractice } = window.DogFight;
  const team = ['#ef926e', '#98d0d1'];
  const teamColor = (fighter) => team[fighter.index === 0 ? 0 : 1];
  const ink = '#252337';
  const cream = '#fff1c7';
  const gold = '#f4c76a';
  const lilac = '#c5a9d3';
  const mint = '#9fe4d7';
  const parryDuration = 12 / 60;
  const shieldDropDuration = 10 / 60;
  const wallOptions = new Set(['wallTech', 'wallTechJump', 'wallBounce']);
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
      if (f.floorAction?.type === 'downed') top *= 0.58;
      else if (f.floorAction?.type === 'floorAttack') top *= 0.75;
      else if (f.floorAction?.type === 'ledgeRoll') {
        const a = f.floorAction;
        // Clover's disc-supported handstand lifts her hind paws above the usual tag position.
        const height = f.kind === 'clover' ? 100 : 74;
        const lift = clamp(
          Math.min(a.time / a.plantAt, (a.duration - a.time) / (a.duration - a.arriveAt)),
          0,
          1,
        );
        top -= (height - f.stats.height) * lift;
      }
      if (f.airDodge?.y > 0) top -= 16 * f.airDodge.y;
      if (f.attack?.smashSide === 'up' || f.attack?.tiltSide === 'up') {
        // Keep the tag above overhead attacks, including Noodle's raised loops.
        for (const box of [f.attack.box, f.attack.second?.box]) {
          if (box) top = Math.min(top, box[1] - box[3]);
        }
      } else if (f.attack?.aim === -1 || f.smashCharge?.side === 'up') top -= 12;
      if (f.stockGuard) top = Math.min(top, -f.stats.height - 7);
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
    const rooftops = config.stage === 'laundry';
    const t = reduced.matches ? 1.4 : Math.floor(time * 9) / 9;
    const stageTime = rooftops ? (1.5 * Math.PI + 0.28 * Math.sin(t * 0.75)) / 0.7 : t;
    const ground = platforms(config.stage, stageTime);
    const podiums = rooftops ? [ground[2], ground[3]] : [ground[1], ground[2]];
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
    const left = Math.round(center - width / 2);
    const top = Math.round(podiums[0].y - height * (rooftops ? 0.8 : 0.69));
    ctx.translate(-left, -top);
    window.ArenaArt.draw(ctx, config.stage, stageTime, { left, top, right: left + width, bottom: top + height });
    const scale = clamp((viewportHeight * (rooftops ? 0.49 : 0.56)) / 77, 0.8, 3.1);
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
    // A lingering hit is the follow-through of the same swing.
    const beat = a.late ? a : attackWindow(a);
    if (a.airSide && a.late && a.time >= a.start) {
      const late = a.late, end = late.start + late.active;
      if (a.time < late.start) return 0.4 + 0.15 * (a.time - a.start) / (late.start - a.start);
      if (a.time < end) return 0.55 + 0.25 * (a.time - late.start) / late.active;
      return 0.8 + 0.2 * clamp((a.time - end) / (a.end - end), 0, 1);
    }
    if (a.time < beat.start - 1e-8) {
      const held = a.smashSide ? 0.08 + 0.26 * a.power : 0;
      return held + (0.39 - held) * clamp(a.time / beat.start, 0, 1);
    }
    const activeTime = Math.max(0, a.time - beat.start);
    const preparingSecondPose =
      (a.dashAttack || a.tiltSide) && a.secondPose && beat === a && a.time + 1e-8 >= a.start + a.active;
    if (activeTime <= beat.active && !preparingSecondPose) return 0.4 + 0.25 * (activeTime / beat.active);
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
    if (a.tiltAngle) {
      const strike = a.secondPose && a.time + 1e-8 >= a.start + a.active ? a.secondPose : a.moveId;
      return strike + (a.tiltAngle < 0 ? 'High' : 'Low');
    }
    if ((a.dashAttack || a.tiltSide) && a.secondPose && a.time + 1e-8 >= a.start + a.active)
      return a.secondPose;
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
    if (f.stockLift) return ['idle', 0];
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
        const canonical = f.kit?.grab || window.DogFight.kits[f.kind]?.grab || grip.grabId;
        return [grip.holdPose || canonical + 'Hold', phase];
      }
    }
    if (f.floorAction) {
      const action = f.floorAction;
      if (action.type === 'downed' && action.locks) return ['jabLock', clamp(action.time / action.duration, 0, 1)];
      if (action.type === 'downed') return ['downed', clamp(action.time / 0.2, 0, 1)];
      if (action.type === 'floorAttack' && f.attack?.floorAttack)
        return ['floorAttack', attackPhase(f.attack)];
      return [
        action.type === 'getupRoll' ? 'techRoll' : action.type,
        clamp(action.time / action.duration, 0, 1),
      ];
    }
    if (f.ledgeTrump) return ['ledgeTrump', clamp(f.ledgeTrump.time / f.ledgeTrump.duration, 0, 1)];
    if (f.wallAction) return [f.wallAction.type, clamp(f.wallAction.time / f.wallAction.duration, 0, 1)];
    if (f.tumble) return ['tumble', 0];
    if (f.clashRecoil) return ['clashRecoil', f.clashRecoil.time / f.clashRecoil.duration];
    if (f.stun > 0) {
      if (!f.reaction) return ['hurt', 0.3];
      if (f.reaction.planted && f.ground >= 0) return ['crouchHit', clamp(1 - f.stun / f.reaction.duration, 0, 1)];
      return [f.reaction.hard ? 'launch' : 'hurt', clamp(1 - f.stun / f.reaction.duration, 0, 1)];
    }
    if (f.airDodge) return [f.airDodge.type, clamp(f.airDodge.time / f.airDodge.duration, 0, 1)];
    if (f.dodge > 0) return ['dodge', 1 - f.dodge / 0.27];
    if (f.waveSlide) return [f.waveSlide * f.face < 0 ? 'wavelandBack' : 'waveland',
      clamp(1 - f.landingLag * 60 / f.kit.airDodge.directional[3], 0, 1)];
    if (f.jumpSquat) return [f.jumpSquat.turned ? 'turnJumpSquat' : 'jumpSquat', clamp((f.jumpSquat.time * 60 - 1) / 2, 0, 1)];
    if (f.shield) return ['shield', 0];
    if (f.crouch) return ['crouch', 0];
    if (f.attack) return [attackPose(f), attackPhase(f.attack)];
    if (f.smashCharge && f.charge >= 0) {
      const power = clamp(f.charge / window.DogFight.smashChargeTime, 0, 1);
      return [f.smashCharge.moveId, 0.08 + 0.26 * power];
    }
    if (f.charge >= 0) {
      const windup = f.kit.tilts?.[f.chargeDirection] || f.kit.ground[f.chainWindow > 0 ? f.chainNext : 0];
      return [windup, Math.min(0.21, 0.04 + 2 * f.charge)];
    }
    if (f.parryFlash > 0 && f.ground >= 0) return ['parry', clamp(1 - f.parryFlash / parryDuration, 0, 1)];
    if (f.ledge) return ['ledge', f.ledgeTime];
    if (f.reboundTime > 0) return [f.reboundPose, f.reboundPose === 'footstool'
      ? reduced.matches ? .62 : clamp(1 - f.reboundTime * 5, 0, 1) : 0.56 + 0.4 * (1 - f.reboundTime / 0.14)];
    if (f.ground < 0) {
      if (f.righting > 1e-8) return ['righting', reduced.matches ? .9 : clamp(1 - f.righting * 60 / 8, 0, 1)];
      if (f.vx * f.face < -85) return ['backDrift', clamp(0.5 + f.vy / (2 * f.stats.jump), 0, 1)];
      if (f.vy < 0) return ['jump', clamp(1 + f.vy / f.stats.jump, 0, 1)];
      return ['fall', clamp(f.vy / f.stats.jump, 0, 1)];
    }
    if (f.teeter) return ['teeter', 0];
    if (f.landTime > 0) return ['land', clamp(1 - f.landTime / (f.landDuration || 0.12), 0, 1)];
    if (f.skidTime > 0) return ['skid', 1 - f.skidTime / 0.14];
    if (f.run && f.sprintDir === f.run.face && f.run.age < f.kit.footwork.reverseFrames / 60)
      return ['dashStart', clamp(f.run.age * 60 / f.kit.footwork.reverseFrames, 0, 1)];
    return [Math.abs(f.vx) > 16 ? (f.run ? 'run' : 'walk') : 'idle', 0];
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
      if (tip) arc(ctx, tip[0], tip[1], 7, 5, 0, Math.PI * 2, color, width);
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
    if (sweet && tip) glint(ctx, tip[0] + 6, tip[1] - 3, 5, cream);
  }
  function movingGrabFeet(ctx, f) {
    const a = f.attack;
    if (!a?.grabAttempt || (a.grabStyle !== 'dash' && a.grabStyle !== 'pivot') || f.ground < 0 || f.grip)
      return;
    const pivot = a.grabStyle === 'pivot';
    const duration = a.start + a.active + (pivot ? 0.075 : 0.045);
    if (a.time >= duration) return;
    const phase = clamp(a.time / duration, 0, 1);
    const speed = clamp(Math.abs(f.vx) / f.stats.speed, 0, 1.25);
    const travel = a.runFace || (pivot ? -f.face : f.face);
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(travel, 1);
    // Trailing pawprints point back along a dash. A pivot leaves the tail of a
    // skid behind the dog and kicks a little dust beyond the planted lead foot.
    const dust = '#c69d78',
      light = '#efcf99';
    if (reduced.matches) {
      if (pivot) pixelLine(ctx, 7, -1, 20, -1, dust, 2, 2);
      else pixelLine(ctx, -29, -2, -18, -2, dust, 2, 2);
    } else if (pivot) {
      const toe = 15 + snap(speed * 6, 2);
      const plume = 5 + snap(Math.sin(Math.PI * phase) * 8, 2);
      pixelLine(ctx, -15 - (1 - phase) * 13, -1, 2, -1, dust, 3);
      pixelLine(ctx, 5, -1, toe, -1, light, 2, 2);
      pixelLine(ctx, toe, -2, toe + plume * 0.6, -5, dust, 3);
      pixelLine(ctx, toe + plume * 0.6, -5, toe + plume, -7 - plume * 0.2, light, 2, 2);
      if (phase > 0.22 && phase < 0.78)
        pixelLine(ctx, toe + plume - 1, -12, toe + plume + 2, -14, dust, 2, 2);
    } else {
      const reach = 23 + snap(speed * 16 + (1 - phase) * 6, 2);
      pixelLine(ctx, -reach, -2, -13, -2, dust, 3);
      pixelLine(ctx, -reach + 2, -5, -24, -5, light, 2, 2);
      if (speed > 0.3 && phase < 0.74) pixelLine(ctx, -reach - 5, -7, -reach - 10, -10, dust, 2, 2);
    }
    ctx.restore();
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
        const slack = (a.grabStyle === 'pivot' ? -12 : a.grabStyle === 'dash' ? 5 : 9) * (1 - extension);
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
  function ledgeSwing(ctx, f, a) {
    const phase = attackPhase(a);
    const active = a.time + 1e-8 >= a.start && a.time < a.start + a.active - 1e-8;
    const rootX = snap(f.x, 2),
      rootY = snap(f.y, 2);
    ctx.save();
    ctx.translate(rootX, rootY);
    ctx.scale(f.face, 1);
    const lip = a.edge ? [(a.edge.x - rootX) * f.face, a.edge.y - rootY] : null;
    const letGo = a.start + (f.kind === 'noodle' ? a.active : f.kind === 'pip' ? 2 / 60 : 0);
    if (lip && !a.planted && a.time < letGo - 1e-8) {
      const support = window.DogArt.pawPoint(f.kind, a.moveId, phase, f.kind === 'pip' ? 'front' : 'rear');
      if (support && Math.hypot(support[0] - lip[0], support[1] - lip[1]) < 13) {
        // The scrape belongs to the fixed corner. The animated paw lets go as the body rises.
        pixelLine(ctx, lip[0] - 3, lip[1] + 2, lip[0] - 7, lip[1] + 5, '#ddb280', 2, 2);
        if (!reduced.matches) pixelLine(ctx, lip[0] - 5, lip[1] - 3, lip[0] - 9, lip[1] - 4, cream, 2, 2);
      }
    }
    if (f.kind === 'noodle') {
      const hand = window.DogArt.itemPoint(f.kind, a.moveId, phase);
      const cast = clamp((a.time / a.start - 0.32) / 0.68, 0, 1);
      const withdraw = clamp(
        (a.time - a.start - a.active) / Math.min(0.145, a.end - a.start - a.active),
        0,
        1,
      );
      const length = cast * (1 - withdraw) ** 2;
      if (hand && length > 0.07) {
        const [x, y, rx] = a.box;
        const span = (x + rx - 6 - hand[0]) * length;
        const tip = [hand[0] + span, hand[1] + (y - hand[1]) * length];
        const progress = clamp((a.time - a.start) / a.active, 0, 1);
        const sag = reduced.matches ? 7 : 7 + 5 * Math.sin(Math.PI * progress);
        const low = Math.min(lip ? lip[1] - 3 : 0, tip[1] + sag * length);
        // One inward cast, rising to its eyelet from just above the top of the rail.
        ropeTrace(
          ctx,
          [
            hand,
            [hand[0] + span * 0.29, hand[1] + (low - hand[1]) * 0.88],
            [hand[0] + span * 0.67, low],
            tip,
          ],
          tip,
          false,
        );
      }
    } else if (active) {
      const follow = phase >= 0.54;
      if (f.kind === 'pip') {
        const [toe, sole] = follow ? [40, -14] : [36, -20];
        pixelLine(ctx, toe - 18, sole + 11, toe - 7, sole + 8, '#d79972', 3, 2);
        pixelLine(ctx, toe - 7, sole + 8, toe + 1, sole + 1, cream, 2, 2);
        if (!reduced.matches) pixelLine(ctx, toe - 11, sole + 12, toe - 5, sole + 10, '#edb487', 2, 2);
      } else if (f.kind === 'brisket') {
        const [shoulder, height] = follow ? [50, -34] : [42, -38];
        arc(ctx, shoulder - 6, height + 2, 12, 14, -1.26, 0.53, gold, 4);
        pixelLine(ctx, shoulder - 1, height - 2, shoulder + 5, height, cream, 2, 2);
        if (!reduced.matches)
          pixelLine(ctx, shoulder - 9, height + 15, shoulder - 2, height + 10, '#cd9d71', 2, 2);
      } else {
        const rim = window.DogArt.itemPoint(f.kind, a.moveId, phase);
        if (rim) {
          const [x, y] = rim;
          const [fromX, fromY] = window.DogArt.itemPoint(f.kind, a.moveId, 0.3);
          const low = Math.min(fromY, lip ? lip[1] - 4 : -3);
          const turn = Math.max(fromX, x) + 3;
          pixelLine(ctx, fromX - 4, low, turn, (low + y) / 2 + 3, '#ad92b9', 2, 2);
          pixelLine(ctx, turn, (low + y) / 2 + 3, x + 2, y + 4, lilac);
          pixelLine(ctx, x + 2, y + 4, x, y + 1, cream, 2, 2);
        }
      }
    }
    ctx.restore();
  }
  function dashFootwork(ctx, f) {
    const a = f.attack;
    if (!a?.dashAttack || f.ground < 0) return;
    const last = a.second || a;
    if (a.time > last.start + last.active + 0.055) return;
    const speed = reduced.matches ? 0 : clamp(Math.abs(f.vx) / f.stats.speed, 0, 1.5);
    const tail = -snap(32 + speed * 12, 2);
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(f.face, 1);
    if (f.kind === 'pip') {
      // Two shallow tracks slide under the outstretched soles.
      pixelLine(ctx, tail - 7, -1, 10, -1, '#bd916c', 3, 2);
      pixelLine(ctx, tail - 1, -3, -16, -3, '#efd09c', 2, 2);
      if (speed > 0.28) pixelLine(ctx, tail - 5, -5, tail - 10, -9, '#d5b080', 2, 2);
    } else if (f.kind === 'brisket') {
      pixelLine(ctx, tail - 3, -2, -13, -2, '#b98c69', 4, 2);
      if (!reduced.matches) {
        pixelLine(ctx, tail - 2, -3, tail - 10, -9, '#deb582', 4, 2);
        pixelLine(ctx, tail - 9, -10, tail - 14, -11, '#efd09c', 2, 2);
        if (speed > 0.34) pixelLine(ctx, tail - 17, -7, tail - 21, -10, '#c79873', 3, 2);
      }
    } else {
      pixelLine(ctx, tail - 4, -2, -24, -2, '#d4ac82', 2, 2);
    }
    ctx.restore();
  }
  function dashSwing(ctx, f, a) {
    const beat = attackWindow(a);
    const active = a.time + 1e-8 >= beat.start && a.time < beat.start + beat.active - 1e-8;
    if (!active && f.kind !== 'noodle') return;
    const p = clamp((a.time - beat.start) / beat.active, 0, 1);
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(f.face, 1);
    if (f.kind === 'noodle') {
      const hand = window.DogArt.itemPoint(f.kind, a.moveId, attackPhase(a));
      const withdraw = clamp(
        (a.time - a.start - a.active) / Math.min(0.17, a.end - a.start - a.active),
        0,
        1,
      );
      const cast = clamp((a.time / a.start - 0.28) / 0.72, 0, 1) * (1 - withdraw) ** 2;
      if (hand && cast > 0.06) {
        const [x, y, rx, ry] = a.box;
        // The knot's outer edge reaches the live low hitbox. The lead draws back into
        // the same painted grip once the inward-tugging contact window closes.
        const tip = [hand[0] + (x + rx - 6 - hand[0]) * cast, hand[1] + (y - hand[1]) * cast];
        const bend = Math.min(-4, y + ry - 3);
        const slack = reduced.matches ? 0.5 : 0.35 + 0.6 * Math.sin(Math.PI * p);
        const middle = [hand[0] + (tip[0] - hand[0]) * 0.56, (hand[1] + tip[1]) / 2];
        middle[1] += (bend - middle[1]) * slack * cast;
        ropeTrace(ctx, [hand, middle, tip], tip, false);
      }
    } else if (f.kind === 'clover') {
      const rim = window.DogArt.itemPoint(f.kind, attackPose(f), attackPhase(a));
      if (rim) {
        const [x, y] = rim;
        if (beat === a.second) {
          // Trace the low scoop into the raised rim; the disc itself stays in the paw.
          const [lowX, lowY] = window.DogArt.itemPoint(f.kind, a.moveId, 0.62);
          const midX = Math.max(lowX, x) + 3,
            midY = (y + lowY) / 2;
          pixelLine(ctx, lowX, lowY, midX, midY, '#a990b5', 2, 2);
          pixelLine(ctx, midX, midY, x + 4, y + 5, lilac);
          pixelLine(ctx, x + 4, y + 5, x, y + 1, cream, 2, 2);
          if (!reduced.matches) pixelLine(ctx, x + 12, y + 19, x + 10, y + 10, '#d9c1d9', 2, 2);
        } else {
          pixelLine(ctx, x - 30, y + 1, x - 18, y + 6, '#ad94bc', 2, 2);
          pixelLine(ctx, x - 18, y + 6, x - 3, y + 3, lilac);
          pixelLine(ctx, x - 3, y + 3, x, y + 1, cream, 2, 2);
        }
      }
    } else if (f.kind === 'brisket') {
      const late = beat === a.late;
      const [x, y, rx, ry] = beat.box;
      const shoulderX = x + rx - (late ? 16 : 13),
        shoulderY = y - (late ? 4 : 6);
      if (late) {
        pixelLine(ctx, shoulderX, shoulderY, shoulderX + 6, shoulderY + 4, '#dab77e', 2, 2);
      } else {
        arc(ctx, shoulderX - 6, shoulderY + 2, 13, ry * 0.56, -1.05, 0.72, gold, 4);
        pixelLine(ctx, shoulderX - 1, shoulderY - 2, shoulderX + 5, shoulderY + 1, cream, 2, 2);
        if (!reduced.matches) pixelLine(ctx, -30, y - 4, -49, y - 2, '#dfba84', 3);
      }
    } else {
      const [x, y, rx, ry] = a.box;
      const follow = attackPhase(a) >= 0.54;
      const toe = x + rx - (follow ? 9 : 13),
        sole = y + ry - (follow ? 8 : 10);
      pixelLine(ctx, toe - 13, sole + 6, toe - 3, sole + 4, cream, 2, 2);
      pixelLine(ctx, toe - 3, sole + 4, toe + 5, sole - 2, '#e49e76', 2, 2);
    }
    ctx.restore();
  }
  function tiltLead(ctx, f, a, phase) {
    const hand = window.DogArt.itemPoint(f.kind, attackPose(f), phase);
    if (!hand) return;
    const [x, y, rx, ry] = a.box;
    const payOut = clamp((a.time / a.start - 0.28) / 0.72, 0, 1);
    const windIn = clamp((a.time - a.start - a.active) / Math.min(0.13, a.end - a.start - a.active), 0, 1);
    const length = payOut * (1 - windIn);
    if (length < 0.08) return;
    const point = (ex, ey) => [hand[0] + (ex - hand[0]) * length, hand[1] + (ey - hand[1]) * length];
    if (a.tiltSide === 'up') {
      // The free end folds back to the neck of a tall loop, all on one continuous cord.
      const top = y - ry;
      const neck = point(x + rx * 0.28, y + ry * 0.05);
      ropeTrace(
        ctx,
        [
          hand,
          neck,
          point(x + rx * 0.6, y - ry * 0.26),
          point(x + rx * 0.5, y - ry * 0.73),
          point(x + rx * 0.18, top),
          point(x - rx * 0.12, top),
          point(x - rx * 0.43, y - ry * 0.73),
          point(x - rx * 0.55, y - ry * 0.34),
          point(x - rx * 0.33, y + ry * 0.02),
          point(x + rx * 0.08, y + ry * 0.12),
          neck,
        ],
        null,
        false,
      );
    } else {
      // The compact knot at the far end marks the sweet spot of the straight poke.
      const tip = point(x + rx - 7, y);
      const bow = reduced.matches ? 0 : 5 * (1 - length);
      ropeTrace(ctx, [hand, [(hand[0] + tip[0]) / 2, (hand[1] + tip[1]) / 2 + bow], tip], tip, false);
      pixelLine(ctx, tip[0] - 3, tip[1] - 4, tip[0] + 2, tip[1] + 4, gold, 3, 2);
      pixelLine(ctx, tip[0], tip[1] - 4, tip[0] + 3, tip[1], cream, 2, 2);
    }
  }
  function tiltSwing(ctx, f, a, floor) {
    const beat = attackWindow(a);
    if (a.slideDir && f.ground >= 0 && Math.abs(f.vx) > 40) {
      const trail = Math.round(Math.abs(f.vx) / 20), back = -a.slideDir;
      const heel = snap(f.x + back * f.stats.width * 0.6, 2), y = snap(f.y, 2);
      pixelLine(ctx, heel + back * 4, y - 2, heel + back * trail, y - 2, '#dbc8a2', 2, 2);
      pixelLine(ctx, heel + back * (trail + 4), y - 3, heel + back * (trail + 8), y - 5, '#b89979', 2, 2);
    }
    const lead = f.kind === 'noodle' && a.tiltSide !== 'down';
    if (!lead && (a.time + 1e-8 < beat.start || a.time >= beat.start + beat.active - 1e-8)) return;
    const phase = attackPhase(a),
      state = attackPose(f),
      follow = phase >= 0.54;
    const [x, y, rx] = beat.box || a.box;
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(f.face, 1);
    if (lead) {
      tiltLead(ctx, f, a, phase);
    } else {
      const tap = a.moveId === 'cloverOneTwoPass' && beat !== a.second;
      const wrist = window.DogArt.pawPoint(f.kind, state, phase, tap ? 'rear' : 'front');
      const [wx, wy] = wrist || [x + rx - 9, y];
      switch (a.moveId) {
        case 'pipStampKick': {
          const heel = follow ? 38 : 40, height = (follow ? -26 : -30) + (a.tiltAngle || 0) * 19;
          pixelLine(ctx, heel - 11, height + 5, heel + 1, height + 1, '#ed9c79', 3, 2);
          pixelLine(ctx, heel + 1, height + 1, heel + 5, height - 2, cream, 2, 2);
          break;
        }
        case 'pipChinFlick':
          pixelLine(ctx, wx - 6, wy + 14, wx + 2, wy + 7, '#ed9c79', 3, 2);
          pixelLine(ctx, wx + 2, wy + 7, wx + 1, wy, cream, 2, 2);
          break;
        case 'pipDewclaw':
          pixelLine(ctx, wx - 12, wy + 5, wx + 2, wy, cream, 2, 2);
          pixelLine(ctx, wx - 6, wy + 9, wx + 6, wy + 4, '#ed9c79', 2, 2);
          break;
        case 'brisketGateCheck':
          pixelLine(ctx, wx - 9, wy - 7, wx + 3, wy - 7, gold, 3, 2);
          pixelLine(ctx, wx + 3, wy - 7, wx + 7, wy - 1, cream, 3, 2);
          pixelLine(ctx, wx + 2, wy + 4, wx + 7, wy + 1, '#dca771', 2, 2);
          break;
        case 'brisketCrownLift': {
          const [crest, crown] = follow ? [2, -86] : [4, -82];
          pixelLine(ctx, crest - 11, crown + 6, crest - 15, crown, gold, 3, 2);
          pixelLine(ctx, crest + 10, crown + 4, crest + 14, crown - 3, gold, 3, 2);
          pixelLine(ctx, crest + 1, crown + 1, crest + 1, crown - 5, cream, 2, 2);
          break;
        }
        case 'brisketDoorstop': {
          const toe = 42,
            sole = follow ? -6 : -8;
          pixelLine(ctx, toe - 8, sole + 6, toe + 2, sole + 6, '#d3a37b', 3, 2);
          pixelLine(ctx, toe + 2, sole + 6, toe + 5, sole + 1, gold, 3, 2);
          pixelLine(ctx, toe + 5, sole + 1, toe + 7, sole - 4, cream, 2, 2);
          break;
        }
        case 'noodleTailBroom': {
          const [tip, low] = follow ? [88, -6] : [78, -8];
          const worldX = f.x + f.face * tip;
          const overEdge = floor && (worldX < floor.x1 || worldX > floor.x2);
          // The stroke starts at the painted taper and dips below the lip where the tail clears it.
          pixelLine(ctx, tip - 3, low, tip + 2, low + 3, '#e0b176', 2, 2);
          pixelLine(ctx, tip + 2, low + 3, tip + 3, low + 6, cream, 2, 2);
          if (overEdge) pixelLine(ctx, tip + 3, low + 6, tip - 2, low + 12, '#d5ab72', 2, 2);
          break;
        }
        case 'cloverOneTwoPass':
        case 'cloverCanopyTap':
        case 'cloverBackspin': {
          if (tap) {
            pixelLine(ctx, wx - 5, wy + 2, wx + 4, wy, cream, 2, 2);
            pixelLine(ctx, wx + 2, wy - 4, wx + 7, wy - 6, lilac, 2, 2);
            break;
          }
          const rim = window.DogArt.itemPoint(f.kind, state, phase);
          if (!rim) break;
          const [dx, dy] = rim;
          if (a.tiltSide === 'forward') {
            pixelLine(ctx, dx - 21, dy + 4, dx - 9, dy + 5, '#aa91b7', 2, 2);
            pixelLine(ctx, dx - 9, dy + 5, dx + 1, dy + 1, lilac);
          } else if (a.tiltSide === 'up') {
            pixelLine(ctx, dx - 9, dy + 13, dx - 8, dy + 6, lilac, 3, 2);
            pixelLine(ctx, dx - 8, dy + 6, dx, dy + 1, cream, 2, 2);
            if (!reduced.matches) pixelLine(ctx, dx + 4, dy + 9, dx + 4, dy + 5, '#bba7c6', 2, 2);
          } else {
            const outer = Math.min(
              x + rx - 3,
              Math.max(dx, window.DogArt.itemPoint(f.kind, state, 0.4)[0]) + 5,
            );
            pixelLine(ctx, outer - 11, dy + 6, outer - 2, dy + 5, '#ab91b4', 2, 2);
            pixelLine(ctx, outer - 2, dy + 5, outer + 1, dy + 1, lilac);
            pixelLine(ctx, outer + 1, dy + 1, dx, dy - 1, cream, 2, 2);
          }
          break;
        }
      }
    }
    ctx.restore();
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
    const [x, y, rx, ry] = beat.box || a.box;
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
  function floorSweep(ctx, f, a) {
    if (a.time + 1e-8 < a.start || a.time >= a.start + a.active - 1e-8) return;
    const [x, y, rx, ry] = a.box;
    const phase = attackPhase(a);
    const early = phase < 0.54;
    let forward, rear;
    if (f.kind === 'brisket') {
      forward = window.DogArt.pawPoint(f.kind, 'floorAttack', phase, 'front');
      rear = window.DogArt.pawPoint(f.kind, 'floorAttack', phase, 'rear');
    } else if (f.kind === 'noodle') {
      forward = window.DogArt.itemPoint(f.kind, 'floorAttack', phase);
      rear = early ? [-54, -20] : [-58, -20];
    } else if (f.kind === 'clover') {
      const disc = window.DogArt.itemPoint(f.kind, 'floorAttack', phase);
      forward = early ? disc : [50, -18];
      rear = early ? [-56, -20] : disc;
    } else {
      forward = early ? [52, -18] : [46, -14];
      rear = early ? [-50, -20] : [-52, -22];
    }
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(f.face, 1);
    // One sweep spans both sides on every active frame. Its leading edge switches
    // with the striking limb as the dog turns over.
    for (const [sign, point] of [
      [1, forward],
      [-1, rear],
    ]) {
      const leading = (sign === 1) === early;
      const near = x + sign * (rx - 25),
        outer = x + sign * (rx - 3);
      const low = y + ry * 0.65;
      pixelLine(ctx, near, low, outer - sign * 6, low - 2, leading ? chargeColors[f.kind] : '#c3a98a', 3, 2);
      const color = leading ? cream : '#bda084';
      pixelLine(ctx, outer - sign * 6, low - 2, outer, low - 7, color, 2, 2);
      if (point) pixelLine(ctx, outer, low - 7, point[0], point[1] + 1, color, 2, 2);
    }
    ctx.restore();
  }
  function floorRollTrack(ctx, f) {
    const action = f.floorAction;
    if (!action || !action.dir || (action.type !== 'techRoll' && action.type !== 'getupRoll')) return;
    const p = action.time / action.duration;
    if (p < 0.08 || p > 0.88) return;
    const skid = reduced.matches ? 0 : snap(Math.sin(p * Math.PI) * 7, 2);
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(action.dir, 1);
    const end = -f.stats.width - skid;
    pixelLine(ctx, end - 13, -2, end + 4, -2, action.type === 'techRoll' ? '#8cc4bb' : '#c99f79', 3, 2);
    if (!reduced.matches) pixelLine(ctx, end - 17, -6, end - 23, -9, '#ddc29a', 2, 2);
    ctx.restore();
  }
  function ledgeRollTrail(ctx, f) {
    const a = f.floorAction;
    if (a?.type !== 'ledgeRoll' || a.time + 1e-8 < a.safeFrom || a.time + 1e-8 >= a.safeUntil) return;
    const planted = a.time + 1e-8 >= a.plantAt;
    const inward = (f.x - a.edge.x) * a.dir;
    const back = -f.stats.width - (planted ? 15 : 23);
    const shoulder = planted ? -20 : -f.stats.height * 0.42;
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(a.dir, 1);
    // This short sweep follows the trailing shoulder only while the fighter can evade.
    for (const [color, width] of [
      ['#52686a', 4],
      ['#b5cbbd', 2],
    ]) {
      pixelLine(ctx, back - 3, shoulder + 7, back - 5, shoulder + 1, color, width, 2);
      pixelLine(ctx, back - 5, shoulder + 1, back - 1, shoulder - 7, color, width, 2);
    }
    if (!planted && !reduced.matches) {
      const lipY = a.edge.y - f.y;
      pixelLine(ctx, -inward - 4, lipY + 4, -inward - 9, lipY + 7, '#c9aa86', 2, 2);
    } else if (planted) {
      // Only solid ground leaves a tread behind the roll, even at the first touching frame.
      const end = f.stats.width * 0.66;
      const start = Math.min(inward - 2, end + (reduced.matches ? 9 : 17));
      if (start > end + 2) pixelLine(ctx, -start, -2, -end, -2, '#c7ac8c', 2, 2);
    }
    ctx.restore();
  }
  function ledgeRollDust(ctx, e, p) {
    const drift = reduced.matches ? 0 : snap(6 * p, 2);
    ctx.save();
    ctx.translate(snap(e.x, 2), snap(e.y, 2));
    ctx.scale(e.face, 1);
    ctx.globalAlpha *= Math.min(1, (1 - p) * 2);
    if (e.type === 'lipDust') {
      // A grain slips down the outer face of the platform as the paw pushes away.
      pixelLine(ctx, -3 - drift, 1 + drift, -7 - drift, 3 + drift, '#bda185', 3, 2);
      if (!reduced.matches)
        pixelLine(ctx, -10 - drift, 6 + 2 * drift, -12 - drift, 7 + 2 * drift, '#b59b87', 2, 2);
    } else {
      const back = Math.min(e.room - 1, 18 + drift);
      if (back > 5) {
        pixelLine(ctx, -4, -1, -back + 3, -2, '#b99274', 3, 2);
        pixelLine(ctx, -back + 3, -2, -back, -5, '#dfbc91', 2, 2);
      }
      if (!reduced.matches) pixelLine(ctx, 4, -1, 9 + drift, -3, '#ccad8b', 2, 2);
    }
    ctx.restore();
  }
  function slippingPaw(ctx, f, face, phase, lip) {
    if (phase < 0.23 || phase >= 0.72) return;
    const paw = window.DogArt.pawPoint(f.kind, 'ledgeTrump', phase, 'rear');
    if (!paw) return;
    const x = f.x + face * paw[0],
      y = f.y + paw[1];
    // Leave the shared corner to the new holder until the two paws visibly separate.
    if (lip && Math.hypot(x - lip.x, y - lip.y) < 15) return;
    ctx.save();
    ctx.translate(snap(x, 2), snap(y, 2));
    ctx.scale(face, 1);
    ctx.globalAlpha *= clamp((0.72 - phase) * 4.5, 0, 1);
    const end = reduced.matches ? 9 : 13;
    const drop = f.vy < 0 ? 3 : -3;
    pixelLine(ctx, 4, 0, end, drop, '#746c78', 3, 2);
    pixelLine(ctx, 4, 0, end - 2, drop, '#c7bac4', 2, 2);
    ctx.restore();
  }
  function ledgeCatchMark(ctx, e, p) {
    ctx.save();
    ctx.translate(snap(e.x, 2), snap(e.y, 2));
    ctx.scale(e.face, 1);
    ctx.globalAlpha *= Math.min(1, (1 - p) * 2);
    if (e.type === 'ledgeClaim') {
      // A single team-colored hook wraps around the corner where the hands change places.
      const rise = reduced.matches ? 0 : snap(Math.min(1, p * 2) * 2, 2);
      for (const [color, width] of [
        [ink, 5],
        [e.color, 3],
      ]) {
        pixelLine(ctx, -7, 5, -7, 1, color, width, 2);
        pixelLine(ctx, -7, 1, -1, -6 - rise, color, width, 2);
        pixelLine(ctx, -1, -6 - rise, 10, -6 - rise, color, width, 2);
      }
      if (e.protectedCatch) pixelLine(ctx, -1, -6 - rise, 3, -6 - rise, cream, 2, 2);
    } else {
      // A vulnerable regrab makes a quiet scrape against the vertical face.
      pixelLine(ctx, -3, 6, -3, 2, '#847c87', 3, 2);
      pixelLine(ctx, -3, 2, 1, 0, '#b8a9a0', 2, 2);
    }
    ctx.restore();
  }
  function shieldSlip(ctx, f) {
    const a = f.floorAction;
    if (a?.type !== 'shieldRoll' && a?.type !== 'spotDodge') return;
    if (a.time + 1e-8 < a.safeFrom || a.time + 1e-8 >= a.safeUntil) return;
    const p = reduced.matches ? 0.45 : (a.time - a.safeFrom) / (a.safeUntil - a.safeFrom);
    const edge = f.stats.width + 5;
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y, 2));
    ctx.scale(a.dir || f.face, 1);
    if (a.type === 'shieldRoll') {
      // A short crescent follows the rolling shoulder. Its open end points along travel.
      const skid = snap(5 * Math.sin(Math.PI * p), 2);
      arc(ctx, -8, -21, edge + skid, 21, 2.82, 3.82, '#b0b5c5', 3);
      pixelLine(ctx, -edge - skid - 21, -2, -edge - 3, -2, '#d4b38d', 3, 2);
      if (!reduced.matches) pixelLine(ctx, -edge - skid - 14, -14, -edge - 8, -13, '#a093ac', 2, 2);
    } else {
      // The foot stays planted. Upright slip marks sit where the muzzle just was.
      const high = -f.stats.height * 0.81;
      const x = edge + 6;
      pixelLine(ctx, x - 4, high - 2, x, high + 6, '#c3b7cf', 3, 2);
      pixelLine(ctx, x, high + 6, x, high + 16, '#c3b7cf', 3, 2);
      if (!reduced.matches) pixelLine(ctx, x + 6, high + 4, x + 6, high + 11, '#90889e', 2, 2);
      pixelLine(ctx, -7, -1, 1, -1, '#c4ac91', 2, 2);
    }
    ctx.restore();
  }
  // Keep diagonal strokes on the pixel grid, including unsnapped gamepad angles.
  function airStroke(ctx, dx, dy, from, to, lane, color, width) {
    pixelLine(
      ctx,
      from * dx - lane * dy,
      from * dy + lane * dx,
      to * dx - lane * dy,
      to * dy + lane * dx,
      color,
      width,
      2,
    );
  }
  function airDodgeSlip(ctx, f) {
    const a = f.airDodge;
    if (!a || a.time + 1e-8 < a.safeFrom || a.time + 1e-8 >= a.safeUntil) return;
    const progress = reduced.matches ? 0.5 : (a.time - a.safeFrom) / (a.safeUntil - a.safeFrom);
    ctx.save();
    ctx.translate(snap(f.x, 2), snap(f.y - f.stats.height * 0.51, 2));
    if (a.type === 'neutralAirDodge') {
      // Facing inward on both sides, the brackets hold their place around the tucked body.
      const span = f.stats.width * 1.4 + 11 - snap(4 * Math.sin(progress * Math.PI), 2);
      for (const sign of [-1, 1]) {
        const x = sign * span;
        for (const [color, width] of [
          ['#615d70', 4],
          ['#ddcedb', 2],
        ]) {
          pixelLine(ctx, x + sign * 5, -10, x, -5, color, width, 2);
          pixelLine(ctx, x, -5, x, 3, color, width, 2);
          pixelLine(ctx, x, 3, x + sign * 4, 7, color, width, 2);
        }
        if (!reduced.matches) pixelLine(ctx, x + sign * 9, -2, x + sign * 11, -2, '#bdb4cb', 2, 2);
      }
    } else {
      // A shallow dodge stretches the paws and tail across the wake, especially on Noodle.
      const shallow = Math.max(0, Math.abs(a.x) - Math.abs(a.y));
      const radius =
        Math.hypot(a.x * (f.stats.width + 6), a.y * f.stats.height * 0.43) +
        shallow * (f.kind === 'noodle' ? 24 : 14);
      const rear = -radius - 2;
      const length = reduced.matches ? 17 : 19 + Math.round(9 * Math.sin(progress * Math.PI));
      for (const [lane, stretch] of [
        [-7, length],
        [7, Math.round(length * 0.64)],
      ]) {
        airStroke(ctx, a.x, a.y, rear - stretch, rear + 2, lane, '#56636c', 4);
        airStroke(ctx, a.x, a.y, rear - stretch, rear - 2, lane, lane < 0 ? mint : '#a4c4c4', 2);
      }
      if (!reduced.matches) airStroke(ctx, a.x, a.y, rear - length - 8, rear - length - 5, -7, '#bccdca', 2);
    }
    ctx.restore();
  }
  function airDodgeStart(ctx, e, p) {
    // Short marks at takeoff stay muted during the vulnerable startup frames.
    ctx.save();
    ctx.translate(snap(e.x, 2), snap(e.y, 2));
    ctx.globalAlpha *= (1 - p) * 0.74;
    if (e.type === 'airGather') {
      const span = e.size - (reduced.matches ? 0 : snap(p * 6, 2));
      for (const sign of [-1, 1]) pixelLine(ctx, sign * span, 0, sign * (span + 6), 0, '#c7b8cb', 2, 2);
    } else {
      for (const sign of [-1, 1]) airStroke(ctx, e.dx, e.dy, -14, -5, sign * 9, '#a5b8bc', 2);
    }
    ctx.restore();
  }
  function fallingShield(ctx, f) {
    const left = clamp(f.shieldDrop / shieldDropDuration, 0, 1);
    const b = shieldBubble(f), radius = b.r;
    ctx.save();
    ctx.translate(snap(b.x, 2), snap(b.y, 2));
    ctx.scale(f.face, 1);
    ctx.globalAlpha *= left * 0.55;
    arc(ctx, 0, 0, radius, radius, 0.22, 0.83, teamColor(f), 2);
    if (!reduced.matches) arc(ctx, 0, 0, radius, radius, 2.3, 2.66, teamColor(f), 2);
    ctx.restore();
  }
  function raisedShield(ctx, f) {
    const b = shieldBubble(f), color = teamColor(f);
    oval(ctx, b.x, b.y, b.r, b.r, color + '36');
    arc(ctx, b.x, b.y, b.r, b.r, 0, Math.PI * 2, color, 4);
    const shine = Math.hypot(f.shieldLeanX, f.shieldLeanY) > 0.12 ? Math.atan2(f.shieldLeanY, f.shieldLeanX) : -2.2;
    arc(ctx, b.x, b.y, b.r - 3, b.r - 3, shine - 0.34, shine + 0.34, cream);
    if (f.shieldStun > 1e-8) {
      const contact = f.shieldImpact;
      const dent = Math.min(7, (f.impactLag + f.shieldStun) * 38);
      arc(ctx, b.x, b.y, b.r, b.r, contact - 0.6, contact + 0.6, cream, 3);
      arc(ctx, b.x, b.y, b.r - dent, b.r - dent, contact - 0.4, contact + 0.4, cream, 2);
    }
  }
  function swing(ctx, f, floor) {
    const a = f.attack;
    // A pummel lands only through its shared grip and has no free melee hitbox.
    if (a?.pummel) return;
    if (a?.floorAttack) return floorSweep(ctx, f, a);
    if (a?.grabAttempt) return catchReach(ctx, f, a);
    if (a?.throwSide) return throwFollowThrough(ctx, f, a);
    if (a?.ledgeAttack) return ledgeSwing(ctx, f, a);
    if (a?.dashAttack) return dashSwing(ctx, f, a);
    if (a?.tiltSide) return tiltSwing(ctx, f, a, floor);
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
  function drawMailLift(ctx, f, time) {
    const x = snap(f.x, 2), y = snap(f.y, 2);
    const step = reduced.matches ? 0 : Math.floor(time * 14) % 4;
    ctx.save();
    ctx.translate(x, y);
    for (const side of [-1, 1]) {
      const hub = side * 38, blade = [11, 7, 3, 7][step];
      ctx.fillStyle = ink;
      ctx.fillRect(hub - 4, 2, 8, 12);
      ctx.fillRect(hub - blade - 2, 0, blade * 2 + 4, 4);
      ctx.fillStyle = gold;
      ctx.fillRect(hub - blade, 0, blade * 2, 2);
      ctx.fillRect(hub - 2, 5, 4, 7);
    }
    ctx.fillStyle = ink;
    ctx.fillRect(-35, 0, 70, 10);
    ctx.fillRect(-28, 10, 56, 8);
    ctx.fillStyle = '#bb8b64';
    ctx.fillRect(-26, 8, 52, 8);
    ctx.fillStyle = cream;
    ctx.fillRect(-32, 2, 64, 6);
    ctx.fillRect(-14, 8, 28, 6);
    for (const [i, start] of [-28, -19, 13, 22].entries())
      pixelLine(ctx, start, 6, start + 4, 2, i % 2 ? '#4a8181' : '#b8584d', 2, 2);
    pixelLine(ctx, -14, 8, 0, 13, '#94694f', 2, 2);
    pixelLine(ctx, 0, 13, 14, 8, '#94694f', 2, 2);
    ctx.fillStyle = f.stockLift.ready ? mint : gold;
    for (const at of [-22, 18]) ctx.fillRect(at, 10, 4, 4);
    ctx.restore();
  }
  function drawReturnTags(ctx, f) {
    const frames = f.stockLift ? window.DogFight.liftReserve(f.stockLift.time) : f.stockGuard * 60;
    const count = Math.ceil(frames / 24 - 1e-8);
    const x = snap(f.x - 15, 2), y = snap(f.stockLift ? f.y + 23 : f.y - f.stats.height - 12, 2);
    for (let i = 0; i < 4; i++) {
      const at = x + i * 8;
      ctx.fillStyle = ink;
      ctx.fillRect(at, y, 7, 7);
      ctx.fillStyle = i < count ? (count === 1 ? gold : mint) : '#665762';
      ctx.fillRect(at + 1, y + 1, 5, i < count ? 5 : 2);
      if (i < count) {
        ctx.fillStyle = cream;
        ctx.fillRect(at + 2, y + 1, 2, 2);
      }
    }
  }
  function drawFighter(ctx, f, world, time) {
    shadow(ctx, f, world.terrain);
    const danger = f.tumble?.threat;
    if (danger && f.tumble.time < 8 / 60) {
      const dx = danger === 'left' ? -1 : danger === 'right' ? 1 : 0;
      const dy = danger === 'top' ? -1 : danger === 'bottom' ? 1 : 0;
      const spread = reduced.matches ? 0 : Math.min(8, Math.floor(f.tumble.time * 90));
      const x = f.x + dx * (f.stats.width + 17 + spread), y = f.y - f.stats.height * 0.5 + dy * (f.stats.height * 0.5 + 14 + spread);
      for (const offset of [0, 11]) for (const [color, weight] of [[ink, 7], [offset ? gold : '#f68866', 4]]) {
        const at = x + dx * offset, up = y + dy * offset;
        for (const side of [-1, 1]) pixelLine(ctx, at - dx * 9 + dy * side * 9, up - dy * 9 + dx * side * 9, at, up, color, weight, 2);
      }
    }
    floorRollTrack(ctx, f);
    ledgeRollTrail(ctx, f);
    shieldSlip(ctx, f);
    airDodgeSlip(ctx, f);
    if (f.fastFall && !reduced.matches) {
      const y = f.y - f.stats.height + 8;
      for (const side of [-1, 1]) {
        const x = f.x + side * (f.stats.width + 3);
        pixelLine(ctx, x + side * 2, y - 9, x, y + (side === f.face ? 9 : 4), teamColor(f), 2, 2);
      }
    }
    movingGrabFeet(ctx, f);
    dashFootwork(ctx, f);
    if (f.stockLift) drawMailLift(ctx, f, time);
    else if (f.respawning > 0) oval(ctx, f.x, f.y - 3, 42, 5, teamColor(f));
    if (f.smashCharge && f.charge >= 0) drawSmashCharge(ctx, f);
    else if (f.charge > 0.21) {
      const r = 37 + f.charge * 10;
      const spin = reduced.matches ? 0 : (Math.floor(time * 12) * Math.PI) / 8;
      for (let i = 0; i < 4; i++)
        arc(ctx, f.x, f.y - 34, r, r, spin + (i * Math.PI) / 2, spin + (i * Math.PI) / 2 + 0.4, gold);
    }
    const [state, phase] = pose(f, world.end, f.grip ? world.dogs[f.grip.owner] : null);
    let face = f.face,
      spriteTime = time + f.index * 0.42;
    if (state === 'teeter' && reduced.matches) spriteTime = 0;
    if (state === 'tumble') {
      face = f.reaction?.face || f.face;
      spriteTime = reduced.matches ? 0.21 : f.tumble.time;
      if (f.tumble.meteor && !f.tumble.pending) {
        const open = window.DogFight.canCancelMeteor(f), y = f.y - f.stats.height * 0.52;
        for (const side of [-1, 1]) {
          const x = f.x + side * (f.stats.width + 5);
          if (open) {
            pixelLine(ctx, x + side * 7, y + 4, x, y - 4, ink, 5, 2);
            pixelLine(ctx, x + side * 7, y + 4, x, y - 4, mint, 3, 2);
            pixelLine(ctx, x, y - 4, x - side * 3, y + 1, cream, 2, 2);
          } else {
            const reach = reduced.matches ? 11 : clamp(f.vy / 33, 8, 24);
            pixelLine(ctx, x - f.vx * 0.026, y - reach, x, y - 2, gold, 3, 2);
          }
        }
      }
    } else if (state === 'ledgeTrump') {
      face = -f.ledgeTrump.dir;
      spriteTime = reduced.matches ? 0 : f.ledgeTrump.time;
    } else if (f.wallAction?.type === state) {
      // The paws face the surface even when the fighter's velocity already points away.
      face = -f.wallAction.dir;
      spriteTime = f.wallAction.time;
    } else if (f.floorAction) {
      if (state === 'techRoll' || state === 'shieldRoll' || state === 'ledgeRoll')
        face = f.floorAction.dir || f.face;
      spriteTime = reduced.matches ? 0 : f.floorAction.time;
    } else if (f.airDodge) {
      spriteTime = reduced.matches ? 0 : f.airDodge.time;
    } else if (state === 'parry') face = f.parryFace || f.face;
    else if (state === 'skid') face = f.skidFace;
    else if (state === 'walk' || state === 'run')
      spriteTime = f.strideDistance / (state === 'walk' ? 100 : 235);
    else if (f.stun > 0 && f.reaction) face = f.reaction.face;
    else if (f.smashCharge) face = f.smashCharge.face;
    ctx.save();
    if (
      f.invuln > 0.01 &&
      state !== 'ledge' &&
      !f.floorAction &&
      !f.airDodge &&
      !f.wallAction &&
      !(f.parryFlash > 0) &&
      !reduced.matches &&
      Math.floor(time * 12) % 2
    )
      ctx.globalAlpha = 0.53;
    window.DogArt.draw(ctx, f.kind, snap(f.x, 2), snap(f.y, 2), {
      face,
      scale: 1,
      time: spriteTime,
      pose: state,
      phase,
      backRoll: state === 'shieldRoll' && f.floorAction.backRoll,
      dodgeX: f.airDodge ? f.airDodge.x * f.face : 0,
      dodgeY: f.airDodge?.y || 0,
    });
    ctx.restore();
    if (state === 'ledge' && f.invuln > 0 && f.ledge.guardFrames) {
      // Chalk grip marks underneath the lip stay legible with reduced motion.
      const remaining = Math.ceil(f.invuln * 60), marks = Math.ceil(remaining / 12);
      const inward = f.ledge.left ? 1 : -1, y = snap(f.ledge.y + 7, 2);
      for (let i = 0; i < marks; i++) {
        const x = snap(f.ledge.x + inward * (5 + i * 6), 2);
        pixelLine(ctx, x, y + 4, x + inward * 2, y, ink, 5, 2);
        pixelLine(ctx, x, y + 4, x + inward * 2, y, remaining <= 6 ? gold : mint, 2, 2);
      }
    }
    if (f.stockLift || f.stockGuard > 0) drawReturnTags(ctx, f);
    if (state === 'ledgeTrump') slippingPaw(ctx, f, face, phase, world.dogs[1 - f.index]?.ledge);
    swing(ctx, f, world.terrain[f.ground]);
    if (f.shield) raisedShield(ctx, f);
    else if (
      f.shieldDrop > 0 &&
      !(f.parryFlash > 0) &&
      !f.floorAction &&
      !f.attack &&
      !f.grip &&
      f.ground >= 0
    )
      fallingShield(ctx, f);
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
  function landingEffect(ctx, e, p) {
    ctx.save();
    ctx.translate(snap(e.x, 2), snap(e.y, 2));
    ctx.globalAlpha *= Math.min(1, (1 - p) * 2);
    const spread = e.size + (reduced.matches ? 0 : snap(12 * p, 2));
    if (e.type === 'techLand') {
      for (const sign of [-1, 1]) {
        const end = sign * (spread + (sign === e.dir ? 5 : 0));
        pixelLine(ctx, sign * 7, -1, end - sign * 6, -2, mint, 3, 2);
        pixelLine(ctx, end - sign * 6, -2, end, -8, cream, 2, 2);
      }
      const accent = (e.dir || 1) * (spread + 4);
      if (p < 0.65) glint(ctx, accent, -10, reduced.matches ? 3 : 5, mint);
    } else if (e.type === 'knockDust') {
      for (const sign of [-1, 1]) {
        const edge = sign * spread;
        pixelLine(ctx, sign * 11, -2, edge - sign * 5, -2, '#be9779', 4, 2);
        pixelLine(ctx, edge - sign * 5, -2, edge, -7, '#e2bc8d', 3, 2);
        if (!reduced.matches) pixelLine(ctx, edge + sign * 4, -8, edge + sign * 7, -11, '#cfaa83', 2, 2);
      }
    } else if (e.type === 'spotStep') {
      for (const sign of [-1, 1]) pixelLine(ctx, sign * 8, -1, sign * (spread - 2), -3, '#b6a49e', 2, 2);
    } else {
      ctx.scale(e.face, 1);
      pixelLine(ctx, -13, -2, -spread, -2, '#d6b58b', 2, 2);
      if (!reduced.matches) pixelLine(ctx, -spread - 2, -4, -spread - 5, -7, '#c39875', 2, 2);
    }
    ctx.restore();
  }
  function wallContactMark(ctx, e, p) {
    // The collision point stays on the brick or plank once the dog has left it.
    const lift = Math.min(e.size, e.y - e.wall.top);
    const drop = Math.min(e.size - 2, e.wall.bottom - e.y);
    const drift = reduced.matches ? 0 : snap(6 * p, 2);
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    ctx.scale(e.face, 1);
    ctx.globalAlpha *= Math.min(1, (1 - p) * 2);
    if (e.type === 'wallBounce') {
      // A stubby impact notch and a loose flake follow the missed shoulder check.
      pixelLine(ctx, -2, -Math.min(4, lift), -2, Math.min(4, drop), '#70525b', 4, 2);
      pixelLine(ctx, -2, 0, 3, -2, '#eaa57a', 3, 2);
      pixelLine(ctx, 5 + drift, 2 + drift, 11 + drift, 5 + drift, '#90676a', 4, 2);
      pixelLine(ctx, 5 + drift, 2 + drift, 9 + drift, 4 + drift, e.color, 2, 2);
      if (!reduced.matches) pixelLine(ctx, 6 + drift, -6, 9 + 2 * drift, -8, '#cfa184', 2, 2);
    } else {
      // Two interrupted scuffs leave the gripping paw visible between them.
      for (const [color, width] of [
        ['#455460', 4],
        [e.color, 2],
      ]) {
        pixelLine(ctx, -2, -Math.min(4, lift), -2, -lift, color, width, 2);
        pixelLine(ctx, -2, -lift, 2, -lift, color, width, 2);
        pixelLine(ctx, -2, Math.min(4, drop), -2, drop, color, width, 2);
      }
      if (e.type === 'wallTechJump') {
        // A short diagonal points up and away, independent of the dog's original facing.
        const end = reduced.matches ? 16 : 20;
        pixelLine(ctx, 4 + drift, -4 - drift, end + drift, -15 - drift, '#536473', 4, 2);
        pixelLine(ctx, 4 + drift, -4 - drift, end + drift, -15 - drift, cream, 2, 2);
      } else {
        pixelLine(ctx, -2, drop, 3, drop, cream, 2, 2);
      }
    }
    ctx.restore();
  }
  function parryContact(ctx, x, y, face, projectile, p) {
    ctx.save();
    ctx.translate(snap(x, 2), snap(y, 2));
    ctx.scale(face || 1, 1);
    ctx.globalAlpha *= Math.min(1, (1 - p) * 2.3);
    const shift = reduced.matches ? 0 : snap(6 * p, 2);
    // The gold diamond marks the collision. The aqua pieces glance back toward the incoming blow.
    const widths = [0, 1, 1, 2, 2, 4, 7, 4, 2, 2, 1, 1, 0];
    for (let row = 0; row < widths.length; row++) {
      const w = widths[row] * 2;
      const y = (row - 6) * 2;
      ctx.fillStyle = ink;
      ctx.fillRect(-w - 2, y, w * 2 + 4, 2);
      if (!w) continue;
      ctx.fillStyle = gold;
      ctx.fillRect(-w, y, w * 2, 2);
      if (row >= 2 && row <= 9) {
        ctx.fillStyle = cream;
        const core = Math.max(1, w - 3);
        ctx.fillRect(-core - 1, y, core * 2, 2);
      }
    }
    for (const [color, width] of [
      [ink, 4],
      [mint, 2],
    ]) {
      pixelLine(ctx, 8 + shift, -8, 15 + shift, -16, color, width, 2);
      if (!reduced.matches) pixelLine(ctx, 9 + shift, 7, 15 + shift, 12, color, width, 2);
      if (projectile) pixelLine(ctx, 17 + shift, -2, 27 + shift, -4, color, width, 2);
    }
    ctx.restore();
  }
  function launchDirections(ctx, trace) {
    const length = 146;
    const steeredLength = length * trace.scale;
    const base = trace.raw,
      steered = trace.velocity;
    ctx.save();
    ctx.translate(snap(trace.x, 2), snap(trace.y, 2));
    const stroke = (x1, y1, x2, y2, color, width) => {
      const pad = Math.floor(width / 2);
      pixelLine(ctx, x1 - pad, y1 - pad, x2 - pad, y2 - pad, color, width, 2);
    };
    const along = (unit, start, end, color, width) =>
      stroke(unit.x * start, unit.y * start, unit.x * end, unit.y * end, color, width);
    const dashes = (color, width) => {
      for (let at = 10; at < length - 8; at += 24)
        along(base, at, Math.min(at + 9, length - 7), color, width);
    };
    // A straight launch still shows the amber dashes around its aqua center.
    dashes(ink, 8);
    along(steered, 7, steeredLength, ink, 6);
    dashes(gold, 6);
    along(steered, 7, steeredLength, mint, 3);
    const bx = base.x * length,
      by = base.y * length;
    arc(ctx, bx, by, 6, 6, 0, Math.PI * 2, ink, 5);
    arc(ctx, bx, by, 6, 6, 0, Math.PI * 2, gold, 3);
    const sx = steered.x * steeredLength,
      sy = steered.y * steeredLength;
    for (const [color, width] of [
      [ink, 6],
      [mint, 3],
    ]) {
      for (const sign of [-1, 1]) {
        stroke(
          sx - steered.x * 10 - sign * steered.y * 6,
          sy - steered.y * 10 + sign * steered.x * 6,
          sx,
          sy,
          color,
          width,
        );
      }
    }
    ctx.fillStyle = ink;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = cream;
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
  function launchKey(ctx, trace, displayedWidth) {
    const degrees = Math.round((trace.turn * 180) / Math.PI);
    const speed = Math.round(trace.scale * 100);
    const second = (degrees ? 'Yours · ' + degrees + '° turn' : 'Yours · no turn') + (speed === 100 ? '' : ' · ' + speed + '% speed');
    ctx.save();
    ctx.font = '19px "Brawl Pixel", monospace';
    const width = Math.ceil(Math.max(ctx.measureText('Unsteered').width, ctx.measureText(second).width)) + 48;
    const scale = Math.min(clamp(820 / (displayedWidth || 820), 1, 2.15), 460 / width);
    ctx.translate(28, Math.max(18, Math.ceil((64 * ctx.canvas.width) / (displayedWidth || 1200))));
    ctx.scale(scale, scale);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, width, 47);
    ctx.fillStyle = '#383247';
    ctx.fillRect(2, 2, width - 4, 43);
    pixelLine(ctx, 7, 13, 13, 13, gold, 3, 2);
    pixelLine(ctx, 18, 13, 24, 13, gold, 3, 2);
    arc(ctx, 29, 13, 3, 3, 0, Math.PI * 2, gold, 2);
    pixelLine(ctx, 7, 33, 30, 33, mint, 3, 2);
    pixelLine(ctx, 25, 29, 30, 33, mint, 2, 2);
    pixelLine(ctx, 25, 37, 30, 33, mint, 2, 2);
    ctx.fillStyle = cream;
    ctx.fillText('Unsteered', 39, 13);
    ctx.fillText(second, 39, 33);
    ctx.restore();
  }
  function drawEffect(ctx, e) {
    const p = 1 - clamp(e.life / e.max, 0, 1);
    if (e.type === 'shieldPoke') {
      const reach = reduced.matches ? 12 : 9 + snap(p * 15, 2);
      for (const side of [-1, 1]) {
        pixelLine(ctx, e.x + side * reach, e.y - 5, e.x + side * (reach + 5), e.y - 11, ink, 5, 2);
        pixelLine(ctx, e.x + side * reach, e.y - 5, e.x + side * (reach + 5), e.y - 11, '#ffae7b', 2, 2);
      }
      return;
    }
    if (e.type === 'crouchCancel') {
      const spread = reduced.matches ? 2 : snap(p * 13, 2);
      for (const side of [-1, 1]) {
        const x = e.x + side * (e.size + spread), y = e.y - 2;
        pixelLine(ctx, x, y, x + side * 8, y - (e.planted ? 3 : 9), ink, 5, 2);
        pixelLine(ctx, x, y, x + side * 7, y - (e.planted ? 3 : 8), e.planted ? mint : gold, 2, 2);
      }
      return;
    }
    if (e.type === 'edgeCancel') {
      const trail = reduced.matches ? 5 : snap(3 + 12 * p, 2);
      for (const offset of [0, 6]) {
        const x = e.x + (trail + offset) * e.face, y = e.y + offset;
        pixelLine(ctx, x - 9 * e.face, y - 4, x, y, ink, 5, 2);
        pixelLine(ctx, x - 8 * e.face, y - 4, x, y, offset ? cream : mint, 2, 2);
      }
      return;
    }
    if (e.type === 'platformDrop') {
      const spread = reduced.matches ? 0 : Math.round(p * 7);
      for (const side of [-1, 1]) {
        const x = e.x + side * (e.size + spread);
        if (e.fromShield) {
          pixelLine(ctx, x, e.y - 6, x + 5 * side, e.y - 1, mint, 3, 2);
          pixelLine(ctx, x + 5 * side, e.y + 2, x + 2 * side, e.y + 6, cream, 2, 2);
        } else pixelLine(ctx, x, e.y, x + 5 * side, e.y - 3, cream, 2, 2);
      }
      return;
    }
    if (e.type === 'stockLeave') {
      const spread = reduced.matches ? 8 : Math.round(16 * p);
      for (const side of [-1, 1]) {
        const at = e.x + side * (30 + spread), y = e.y + 5 + spread * 0.5;
        pixelLine(ctx, at, y, at + side * 8, y + 4, mint, 3, 2);
        pixelLine(ctx, at + side * 5, y + 7, at + side * 10, y + 7, cream, 2, 2);
      }
      return;
    }
    if (e.type === 'landingCancel') {
      const slip = reduced.matches ? 0 : snap(p * 11, 2);
      for (const side of [-1, 1]) {
        const x = e.x + side * (e.size + slip);
        for (const [color, width] of [[ink, 5], [mint, 3]]) {
          pixelLine(ctx, x, e.y - 2, x + side * 8, e.y - 2, color, width, 2);
          pixelLine(ctx, x + side * 8, e.y - 2, x + side * 13, e.y - 7, color, width, 2);
        }
      }
      return;
    }
    if (e.type === 'specialTurn') {
      const extent = reduced.matches ? 15 : 10 + 13 * p, dir = e.face;
      const at = e.x + dir * (e.size + extent), y = e.y + 5;
      for (const [color, width] of [[ink, 5], [e.color, 3]]) {
        pixelLine(ctx, at - dir * 13, y - 5, at - dir * 17, y, color, width, 2);
        pixelLine(ctx, at - dir * 17, y, at, y, color, width, 2);
        pixelLine(ctx, at, y, at - dir * 5, y - 5, color, width, 2);
      }
      if (e.wave) pixelLine(ctx, at - dir * 19, y + 5, at - dir * 10, y + 5, cream, 2, 2);
      return;
    }
    if (e.type === 'meteorBounce' || e.type === 'meteorCancel') {
      const bounce = e.type === 'meteorBounce', spread = reduced.matches ? 6 : 4 + p * 17;
      for (const side of [-1, 1]) {
        const x = e.x + side * spread, y = e.y - (reduced.matches ? 2 : 7 * Math.sin(p * Math.PI));
        pixelLine(ctx, x, y, x + side * 9, y - (bounce ? 8 : -6), e.color, 4, 2);
        pixelLine(ctx, x + side * 9, y - (bounce ? 8 : -6), x + side * 14, y - (bounce ? 5 : -4), cream, 2, 2);
      }
      if (bounce) pixelLine(ctx, e.x - spread, e.y + 2, e.x + spread, e.y + 2, gold, 3, 2);
      return;
    }
    if (e.type === 'hitShift') {
      const length = Math.hypot(e.dx, e.dy), x = e.dx / length, y = e.dy / length;
      const reach = reduced.matches ? 7 : 12 - 6 * p;
      for (const offset of [-5, 4]) {
        const tailX = e.x - x * e.size - y * offset, tailY = e.y - y * e.size + x * offset;
        pixelLine(ctx, tailX, tailY, tailX + x * reach, tailY + y * reach, offset < 0 ? mint : cream, 3, 2);
      }
      return;
    }
    if (e.type === 'attackClash') {
      const spread = reduced.matches ? 3 : snap(p * 13, 2);
      const reach = p > 0.65 ? 5 : 10;
      for (const side of [-1, 1]) for (const vertical of [-1, 1]) {
        const lead = e.breakthrough && e.face === side ? 8 : 0;
        const x = e.x + side * (4 + spread), y = e.y + vertical * (3 + spread / 2);
        const endX = x + side * (reach + lead), endY = y + vertical * reach;
        pixelLine(ctx, x, y, endX, endY, ink, 5, 2);
        pixelLine(ctx, x, y, endX, endY, lead ? gold : e.projectile ? mint : cream, 3, 2);
      }
      if (p < 0.5) glint(ctx, e.x, e.y, reduced.matches ? 4 : 7, cream);
      if (e.breakthrough) pixelLine(ctx, e.x + e.face * spread, e.y,
        e.x + e.face * (spread + 20), e.y - 1, gold, 3, 2);
      return;
    }
    if (e.type === 'jabLock') {
      const out = e.size + (reduced.matches ? 0 : snap(9 * p, 2));
      for (const side of [-1,1]) {
        const x = e.x + side * out;
        pixelLine(ctx, x - side * 7, e.y - 1, x, e.y - 2, '#e8bd85', 3, 2);
        pixelLine(ctx, x, e.y - 2, x + side * 4, e.y - 7, cream, 2, 2);
        if (e.count === 2) pixelLine(ctx, x + side * 7, e.y - 3, x + side * 10, e.y - 6, gold, 3, 2);
      }
      return;
    }
    if (wallOptions.has(e.type)) return wallContactMark(ctx, e, p);
    if (e.type === 'airGather' || e.type === 'airWake') return airDodgeStart(ctx, e, p);
    if (e.type === 'lipDust' || e.type === 'ledgePlant') return ledgeRollDust(ctx, e, p);
    if (e.type === 'ledgeClaim' || e.type === 'ledgeRegrab') return ledgeCatchMark(ctx, e, p);
    if (e.type === 'techLand' || e.type === 'knockDust' || e.type === 'riseScuff' || e.type === 'spotStep') {
      landingEffect(ctx, e, p);
      return;
    }
    if (e.type === 'parry') return parryContact(ctx, e.x, e.y, e.face, e.projectile, p);
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
      this.pendingLaunch = null;
      this.launchTrace = null;
      this.lastTrail = [-1, -1];
      this.leftFighter = 0;
      this.shake = 0;
      this.zoom = 1;
      this.cx = 600;
      this.cy = 337.5;
    }
    fitCanvas(canvas) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      // Size the world camera to the display. A single scale keeps the art pixels square.
      const scale = Math.min(Math.max(675 / h, 720 / w), 2880 / Math.max(w, h));
      const width = Math.max(1, Math.round(w * scale)), height = Math.max(1, Math.round(h * scale));
      if (canvas.width === width && canvas.height === height) return false;
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    add(type, x, y, color, life, size, face = 1, details) {
      const behind = type === 'smoke' || type === 'land' || type === 'skid';
      this.effects.push({ type, x, y, color, life, max: life, size, face, behind, ...details });
    }
    event(name, e) {
      const f = e.f;
      if (name === 'stockLeave') this.add(name, e.point.x, e.point.y, mint, 0.18, 24);
      if (name === 'landingCancel') this.add(name, e.point.x, e.point.y, mint, 0.18, f.stats.width * 0.7);
      if (name === 'edgeCancel') this.add(name, e.point.x, e.point.y, mint, 0.16, 12, e.dir);
      if (name === 'specialTurn') this.add(name, e.point.x, e.point.y, e.turn === 'turnaround' ? gold : mint,
        0.16, f.stats.width, e.turn === 'turnaround' ? e.face : Math.sign(e.vx) || e.face, { wave: e.turn === 'wavebounce' });
      if (name === 'meteorBounce' || name === 'meteorCancel')
        this.add(name, e.point.x, e.point.y, name === 'meteorBounce' ? '#ec946a' : mint, 0.22, 20);
      if (name === 'attackClash') this.add(name, e.point.x, e.point.y, cream, 0.17, 14, e.face,
        { breakthrough: e.winner !== null, projectile: e.projectile });
      if (name === 'platformDrop') this.add(name, e.point.x, e.point.y, cream, e.fromShield ? 11 / 60 : 8 / 60,
        f.stats.width / 2, f.face, { fromShield: e.fromShield });
      if (name === 'crouchCancel') this.add(name, e.point.x, e.point.y, mint, 0.16, f.stats.width * 0.8, e.face, { planted: e.planted });
      if (name === 'shieldPoke') this.add(name, e.point.x, e.point.y, cream, 0.16, 12, e.face);
      if (name === 'hitShift')
        this.add('hitShift', e.point.x, e.point.y, mint, 8 / 60, f.stats.width + 4, 1, { dx: e.dx, dy: e.dy });
      if (name === 'launchDI' && f.index === 0) {
        const base = Math.hypot(e.raw.x, e.raw.y),
          speed = Math.hypot(e.velocity.x, e.velocity.y);
        if (base && speed)
          this.pendingLaunch = {
            fighter: f,
            x: e.point.x,
            y: e.point.y,
            raw: { x: e.raw.x / base, y: e.raw.y / base },
            velocity: { x: e.velocity.x / speed, y: e.velocity.y / speed },
            turn: Math.abs(e.angle),
            scale: speed / base,
          };
      }
      if (name === 'tech') this.add('techLand', e.point.x, e.point.y, mint, 0.19, 18, 1, { dir: e.dir });
      if (wallOptions.has(name)) {
        this.add(name, e.point.x, e.point.y, name === 'wallBounce' ? '#e0a379' : mint, 0.17, 13, e.dir, {
          wall: e.wall,
        });
      }
      if (name === 'ledgeRoll' || name === 'ledgeRollPlant' || name === 'ledgeClimb' || name === 'ledgeClimbPlant') {
        const plant = name.endsWith('Plant');
        this.add(
          plant ? 'ledgePlant' : 'lipDust',
          e.point.x,
          e.point.y,
          '#c9aa86',
          plant ? 0.16 : 0.13,
          12,
          e.dir,
          { behind: true, room: (e.point.x - e.edge.x) * e.dir },
        );
      }
      if (name === 'knockdown')
        this.add('knockDust', e.point.x, e.point.y, cream, 0.24, 17 + f.stats.width * 0.45);
      if (name === 'floorSlip') this.add('riseScuff', e.point.x, e.point.y, cream, 0.12, 18, e.dir);
      if (name === 'getup' && (e.type === 'floorRise' || e.type === 'getupRoll'))
        this.add('riseScuff', e.point.x, e.point.y, cream, 0.14, 23, e.dir || f.face);
      if (name === 'shieldRoll' || name === 'spotDodge') {
        const roll = name === 'shieldRoll';
        this.add(
          roll ? 'riseScuff' : 'spotStep',
          e.point.x,
          e.point.y,
          cream,
          0.12,
          roll ? 23 : 14,
          e.dir || f.face,
          { behind: true },
        );
      }
      if (name === 'parry')
        this.add('parry', e.point.x, e.point.y, gold, parryDuration, 12, e.face, {
          projectile: e.projectile,
        });
      if (name === 'dodge' && (e.type === 'neutralAirDodge' || e.type === 'directionalAirDodge')) {
        const neutral = e.type === 'neutralAirDodge';
        this.add(
          neutral ? 'airGather' : 'airWake',
          f.x,
          f.y - f.stats.height * 0.51,
          lilac,
          7 / 60,
          f.stats.width + 12,
          f.face,
          { behind: true, dx: e.dirX, dy: e.dirY },
        );
      }
      if (name === 'jump' || name === 'recover')
        this.add('ring', f.x, f.y, name === 'jump' ? cream : teamColor(f), 0.23, 21);
      if (name === 'footstool') this.add('ring', e.point.x, e.point.y, mint, .18, 22);
      if (name === 'hit' || name === 'block') {
        const face = e.face || 1;
        const point = e.point || { x: f.x - face * f.stats.width * 0.7, y: f.y - f.stats.height * 0.54 };
        if (name === 'block') {
          const frames = e.impactFrames || 2;
          this.add('block', point.x - face * 7, point.y, teamColor(f), (7 + frames) / 60, 34 + frames * 5, face);
        }
        else if (e.lock) {
          this.add('jabLock', f.x, f.y, cream, 0.16, f.stats.width * 0.8, face, { count: e.lock });
          this.add('light', point.x, point.y, gold, 0.09, 22, face);
        } else {
          this.add(
            e.emphatic ? 'impact' : 'light',
            point.x,
            point.y,
            e.emphatic ? gold : e.timing === 'late' ? mint : cream,
            e.emphatic ? 0.19 : 0.14,
            (e.emphatic ? (e.name === 'finisher' ? 54 : 62) : e.timing === 'late' ? 28 : 45) * (0.65 + 0.35 * (e.power ?? 1)),
            face,
          );
          if (!reduced.matches && e.emphatic) this.shake = Math.min(7, 2 + e.speed * 0.006);
        }
      }
      if (name === 'break') this.add('ring', f.x, f.y - 38, teamColor(f), 0.3, 73);
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
      if (name === 'waveland') this.add('skid', e.point.x - e.dir * 8, e.point.y, cream, 0.22,
        clamp(30 + e.speed * 0.06, 40, 64), e.dir);
      if (name === 'skid') this.add('skid', f.x - e.face * 9, f.y, cream, 0.18, 56, e.face);
      if (name === 'turnJump') this.add('skid', f.x - e.dir * 8, f.y, '#d6b687', 0.13, 28, e.dir);
      if (name === 'swat') this.add('star', e.ball.x, e.ball.y, gold, 0.2, 25);
      if (name === 'ko') {
        this.add('burst', clamp(e.x, 30, (e.stageWidth ?? 1200) - 30), clamp(e.y, 38, 620), teamColor(f), 0.7, 108);
        if (!reduced.matches) this.shake = 10;
      }
      if (name === 'ledgeTrump' || (name === 'ledge' && !e.trump)) {
        const claimed = name === 'ledgeTrump',
          edge = e.edge || f.ledge;
        // A simultaneous first arrival can mark this lip before the winning catch is resolved.
        this.effects = this.effects.filter(
          (effect) => !effect.lip || effect.lip.index !== edge.index || effect.lip.left !== edge.left,
        );
        const protectedCatch = e.protectedCatch ?? f.ledge?.protectedCatch ?? true;
        const type = claimed ? 'ledgeClaim' : protectedCatch ? 'star' : 'ledgeRegrab';
        const point = e.point || edge;
        this.add(
          type,
          point.x,
          point.y,
          claimed ? teamColor(f) : cream,
          type === 'ledgeRegrab' ? 0.12 : 0.19,
          16,
          e.dir || (edge.left ? 1 : -1),
          { lip: edge, protectedCatch },
        );
      }
    }
    draw(canvas, world, dt, time) {
      const resized = this.fitCanvas(canvas);
      const { width, height } = canvas;
      const ctx = canvas.getContext('2d'),
        [a, b] = world.dogs;
      const practice = world.mode === 'training' && world.end === null && world.launchPractice?.pattern !== 'juggle' && world.launchPractice;
      if (this.launchTrace && this.launchTrace.practice !== practice) this.launchTrace = null;
      if (practice && practice.phase !== 'ready' && !this.launchTrace && this.pendingLaunch?.fighter === a)
        this.launchTrace = { ...this.pendingLaunch, practice };
      this.pendingLaunch = null;
      ctx.imageSmoothingEnabled = false;
      const spread = Math.abs(a.x - b.x);
      const vertical = Math.abs(a.y - b.y);
      const off = [a, b].some((f) => f.x < 155 || f.x > 1045 || f.y > 490 || f.y < 80);
      const wideShot = Math.min(1, width / 1200, height / 675);
      const koTest = world.freshnessPractice?.koTest;
      const survival = world.survivalPractice;
      let targetZoom = off || reduced.matches ? wideShot :
        clamp(Math.min(width / (spread + 505), height / (vertical + 345)), wideShot, 1.5);
      let launchCenterY, survivalX;
      if (koTest) {
        const floorY = world.terrain[0].y, scale = height / (canvas.clientHeight || height);
        // Keep the roof and blast line clear of the score and menu on small screens.
        const above = clamp(80 * scale, height * 0.11, height * 0.24);
        const below = clamp(78 * scale, height * 0.13, height * 0.22);
        targetZoom = Math.min(width / 575, (height - above - below) / (floorY - topBlastY));
        launchCenterY = (floorY + topBlastY) / 2 + (below - above) / (2 * targetZoom);
      }
      if (survival) {
        const edge = survival.dir > 0 ? world.stageWidth + 115 : -115, floor = world.terrain[survival.ground];
        const inner = survival.lip - survival.dir * 183, outer = edge + survival.dir * 54;
        const high = Math.min(floor.y - 245, a.y - a.stats.height - 78), low = Math.max(floor.y + 88, a.y + 52);
        targetZoom = Math.min(1.45, width / Math.abs(outer - inner), height / (low - high + 152));
        survivalX = (inner + outer) / 2;
        launchCenterY = (low + high) / 2 - 18;
      }
      const blend = resized || koTest || survival ? 1 : 1 - Math.exp(-dt * (targetZoom < this.zoom ? 7.5 : 4));
      this.zoom += (targetZoom - this.zoom) * blend;
      const halfW = width / (2 * this.zoom), halfH = height / (2 * this.zoom);
      const centerX = survival ? survivalX : koTest ? world.freshnessPractice.marks[0] + (a.kind === 'clover' ? 176 : 89) :
        halfW >= 600 ? 600 : clamp((a.x + b.x) / 2, halfW, 1200 - halfW);
      const centerY = koTest || survival ? launchCenterY : halfH >= 337.5 ? 337.5 : clamp((a.y + b.y) / 2 - 67, halfH, 675 - halfH);
      this.cx += (centerX - this.cx) * blend;
      this.cy += (centerY - this.cy) * blend;
      const steady = reduced.matches || this.shakeEnabled === false;
      const sx = steady ? 0 : snap(Math.sin(time * 97) * this.shake, 2),
        sy = steady ? 0 : snap(Math.cos(time * 81) * this.shake * 0.55, 2);
      this.shake = Math.max(0, this.shake - 62 * dt);
      ctx.save();
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, width, height);
      ctx.translate(width / 2 + sx, height / 2 + sy);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-Math.round(this.cx), -Math.round(this.cy));
      const left = Math.round(this.cx) - halfW - sx / this.zoom;
      const top = Math.round(this.cy) - halfH - sy / this.zoom;
      window.ArenaArt.draw(ctx, world.stage, world.time, {
        left, top, right: left + 2 * halfW, bottom: top + 2 * halfH,
      });
      if (world.suddenDeath) {
        const inset = world.blastInset();
        for (const dir of [1,-1]) {
          const line = dir === 1 ? -115 + inset : world.stageWidth + 115 - inset;
          const outer = dir === 1 ? left : left + 2*halfW;
          if ((line - outer)*dir < 0) continue;
          ctx.fillStyle = 'rgba(146, 35, 42, .43)';
          ctx.fillRect(outer, top, line - outer, halfH * 2);
          ctx.fillStyle = '#3c2431';
          ctx.fillRect(line-2, top, 5, halfH*2);
          for (let y=Math.floor(top/26)*26; y<top+halfH*2; y+=26) {
            pixelLine(ctx, line-dir*5, y, line, y+5, gold, 3, 2);
            pixelLine(ctx, line, y+5, line-dir*5, y+10, gold, 3, 2);
          }
        }
      }
      if (world.wavePractice) {
        const d = world.wavePractice, floor = world.terrain[d.platform], x = floor.x1 + d.start;
        const forward = d.pattern === 'back' ? -d.dir : d.dir, tip = x + forward * 21, y = floor.y + 5;
        pixelLine(ctx, x, y, tip, y, cream, 3, 2);
        pixelLine(ctx, tip - forward * 6, y - 5, tip, y, cream, 3, 2);
        if (d.contact !== null) {
          const land = floor.x1 + d.contact, end = land + d.distance * (d.forward ? d.dir : -d.dir);
          pixelLine(ctx, land, y + 5, end, y + 5, ink, 5, 2);
          pixelLine(ctx, land, y + 5, end, y + 5, mint, 3, 2);
          for (const at of [land, end]) pixelLine(ctx, at, y + 1, at, y + 6, gold, 3, 2);
        }
      }
      if (world.freshnessPractice) {
        const lab = world.freshnessPractice, floor = world.terrain[0].y;
        if (koTest) {
          for (let x = Math.floor(left / 28) * 28; x < left + 2 * halfW; x += 28)
            pixelLine(ctx, x, topBlastY, x + 14, topBlastY, '#cc807b', 3, 2);
          ctx.save();
          ctx.font = '15px "Brawl Pixel", monospace';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = ink;
          const at = canvas.clientHeight < 500 && width > height ? left + halfW * 0.6 : left + 14;
          ctx.fillRect(at, topBlastY - 23, 10 + ctx.measureText('Top blast line').width, 21);
          ctx.fillStyle = cream;
          ctx.fillText('Top blast line', at + 5, topBlastY - 5);
          ctx.restore();
        }
        for (const x of lab.marks) {
          pixelLine(ctx, x - 8, floor + 4, x + 8, floor + 4, cream, 3, 2);
          pixelLine(ctx, x, floor + 4, x, floor + 10, cream, 2, 2);
        }
        for (const [trail, previous] of [[lab.previous?.trace, true], [lab.trace, false]]) {
          if (!trail) continue;
          for (let i = 1; i < trail.length; i++) {
            if (previous && i % 2 === 0) continue;
            const [x, y] = trail[i - 1], [endX, endY] = trail[i];
            if (previous) {
              pixelLine(ctx, x - 3, y, endX - 3, endY, ink, 7, 2);
              pixelLine(ctx, x - 2, y, endX - 2, endY, mint, 5, 2);
            } else {
              pixelLine(ctx, x - 1, y, endX - 1, endY, ink, 4, 2);
              pixelLine(ctx, x, y, endX, endY, gold, 2, 2);
            }
          }
        }
      }
      if (world.escapePractice) {
        const drill = world.escapePractice, floor = world.terrain[0].y;
        // Three chalk ticks count in the swing. The arrow draws at the defender's feet on contact.
        if (drill.phase === 'windup' || drill.phase === 'swing') {
          for (let i = 0; i < 3; i++) {
            const x = b.x - 12 + i * 9;
            pixelLine(ctx, x, floor + 10, x + 3, floor + 4, ink, 5, 2);
            pixelLine(ctx, x, floor + 10, x + 3, floor + 4, drill.time * 60 >= i * 8 ? gold : '#887d7c', 2, 2);
          }
        }
        if (drill.phase === 'follow' && a.hitShift) {
          const x = a.x - a.stats.width - 15, y = a.y - 12;
          for (const [color, width] of [[ink, 6], [mint, 3]]) {
            pixelLine(ctx, x, y, x + 15, y, color, width, 2);
            pixelLine(ctx, x, y, x + 6, y - 6, color, width, 2);
            pixelLine(ctx, x, y, x + 6, y + 6, color, width, 2);
          }
        }
      }
      if (world.chasePractice) {
        const d = world.chasePractice, floor = world.terrain[d.ground], x = snap(d.mark, 2), y = floor.y + 5;
        pixelLine(ctx, x - 15, y + 4, x - 8, y, cream, 2, 2);
        pixelLine(ctx, x + 8, y, x + 15, y + 4, cream, 2, 2);
        for (let i = 0; i < d.locks; i++) pixelLine(ctx, x - 3 + i * 5, y + 5, x + i * 5, y, gold, 3, 2);
      }
      if (world.spacingPractice) {
        const drill = world.spacingPractice, floor = world.terrain[drill.ground];
        const x = snap(drill.mark, 2), y = floor.y + 5;
        if (window.DogFight.isFootstoolPractice(drill)) {
          const rescue = drill.pattern === 'footstool', dog = rescue ? b : a;
          const y = snap(drill.stepped && !rescue ? floor.y : dog.y - dog.stats.height, 2);
          const x = snap(dog.x, 2), lit = drill.stepped || drill.cue;
          for (const side of [-1, 1]) {
            const at = x + side * (dog.stats.width + 7);
            pixelLine(ctx, at, y, at + side * 9, y, ink, 5, 2);
            pixelLine(ctx, at, y, at + side * 9, y, lit ? mint : gold, 2, 2);
          }
        } else if (isReversalPractice(drill)) {
          for (const [color, width] of [[ink, 6], [cream, 3]]) {
            pixelLine(ctx, x, y - 3, x, y + 8, color, width, 2);
            pixelLine(ctx, x, y + 3, x + drill.dir * 15, y + 3, color, width, 2);
            pixelLine(ctx, x + drill.dir * 15, y + 3, x + drill.dir * 10, y - 2, color, width, 2);
          }
          if (drill.landingX !== undefined) pixelLine(ctx, x, y + 8, drill.landingX, y + 8, mint, 2, 2);
        } else if (drill.pattern === 'cancel') {
          const lit = drill.cue && drill.landing === null;
          for (const side of [-1, 1]) {
            const at = x + side * 24;
            for (const [color, width] of [[ink, 6], [lit || drill.canceled ? mint : gold, 3]]) {
              pixelLine(ctx, at, y, at + side * 13, y, color, width, 2);
              pixelLine(ctx, at + side * 13, y, at + side * 13, y - (lit ? 14 : 5), color, width, 2);
            }
          }
        } else if (drill.pattern === 'landing') {
          // A fork and a single stripe stay distinct against all three floors.
          for (const [at, fork, tint] of [[x, true, gold], [snap(drill.cleanMark, 2), false, mint]]) {
            for (const color of [ink, tint]) {
              const w = color === ink ? 6 : 3;
              pixelLine(ctx, at - (fork ? 10 : 7), y + 5, at, y - 2, color, w, 2);
              if (fork) pixelLine(ctx, at, y - 2, at + 10, y + 5, color, w, 2);
            }
          }
        } else {
          for (const color of [ink, cream]) {
            const w = color === ink ? 5 : 2;
            pixelLine(ctx, x - 11, y + 2, x + 11, y + 2, color, w, 2);
            pixelLine(ctx, x - 11, y - 1, x - 11, y + 3, color, w, 2);
            pixelLine(ctx, x + 11, y - 1, x + 11, y + 3, color, w, 2);
          }
        }
        if (drill.landingX !== undefined) {
          const at = snap(drill.landingX, 2);
          pixelLine(ctx, at - 4, y + 9, at, y + 5, mint, 3, 2);
          pixelLine(ctx, at, y + 5, at + 4, y + 9, mint, 3, 2);
        }
      }
      if (world.edgePractice) {
        const d = world.edgePractice, x = snap(d.lip, 2), y = snap(world.terrain[d.ground].y, 2);
        const released = d.pattern === 'lip' && d.phase === 'atLip' && d.ticks >= 16 && d.ticks < 26;
        const color = released || d.frames ? mint : cream;
        pixelLine(ctx, x - d.dir * 12, y + 4, x, y + 4, ink, 5, 2);
        pixelLine(ctx, x, y + 4, x, y + 12, ink, 5, 2);
        pixelLine(ctx, x - d.dir * 12, y + 4, x, y + 4, color, 2, 2);
        pixelLine(ctx, x, y + 4, x, y + 12, color, 2, 2);
      }
      const juggle = world.launchPractice;
      if (juggle?.pattern === 'juggle' && juggle.phase === 'flight' && juggle.cue && a.tumble) {
        const y = snap(a.y - a.stats.height / 2, 2);
        for (const dir of juggle.chase ? [-1,1] : [juggle.dir]) {
          const x = snap(a.x + dir * (a.stats.width + 12), 2);
          for (const [color, weight] of [[ink,6],[mint,3]]) {
            pixelLine(ctx,x-dir*7,y-6,x,y,color,weight,2);
            pixelLine(ctx,x,y,x-dir*7,y+6,color,weight,2);
          }
        }
      }
      if (world.footworkPractice && ['match', 'power', 'disc'].includes(world.footworkPractice.pattern)) {
        const drill = world.footworkPractice, x = snap(drill.mark, 2), y = world.terrain[0].y + 9;
        for (let i = 0; i < 3; i++) {
          const lamp = x + (i - 1) * 16;
          ctx.fillStyle = ink;
          ctx.fillRect(lamp - 6, y - 4, 12, 8);
          ctx.fillStyle = drill.beat > i ? (i === 2 ? mint : gold) : '#726d76';
          ctx.fillRect(lamp - 4, y - 2, 8, 4);
          if (i === 2 && drill.beat === 3) pixelLine(ctx, lamp - 3, y + 6, lamp + 3, y + 6, mint, 2, 2);
        }
      } else if (world.footworkPractice) {
        const x = snap(world.footworkPractice.mark, 2), y = world.terrain[0].y;
        const chalk = ['opening', 'atMark'].includes(world.footworkPractice.phase) ? mint : cream;
        for (const side of [-1, 1]) {
          pixelLine(ctx, x + side * 10, y + 11, x, y + 1, ink, 5, 2);
          pixelLine(ctx, x + side * 9, y + 10, x, y + 1, chalk, 3, 2);
        }
        pixelLine(ctx, x, y + 9, x, y + 15, chalk, 2, 2);
        if (world.footworkPractice.phase === 'tell') {
          const hand = b.x - 37, top = b.y - 51;
          pixelLine(ctx, hand - 7, top - 12, hand - 3, top - 5, gold, 3, 2);
          pixelLine(ctx, hand - 14, top - 5, hand - 7, top - 2, cream, 2, 2);
        }
      }
      if (survival) {
        const boundary = survival.dir > 0 ? world.stageWidth + 115 : -115;
        for (let y = Math.floor(top / 22) * 22; y < top + 2 * halfH; y += 22) {
          pixelLine(ctx, boundary, y, boundary, y + 11, ink, 5, 2);
          pixelLine(ctx, boundary, y + 2, boundary, y + 9, '#ec977b', 3, 2);
        }
        for (const [trail, previous] of [[survival.previous, true], [survival.trace, false]]) {
          if (!trail?.length) continue;
          for (let i = 1; i < trail.length; i++) {
            if (previous && i % 2 === 0) continue;
            const p = trail[i - 1], q = trail[i];
            pixelLine(ctx, p.x, p.y, q.x, q.y, ink, previous ? 5 : 4, 2);
            pixelLine(ctx, p.x, p.y, q.x, q.y, previous ? gold : mint, 2, 2);
          }
        }
        if (survival.cue && !survival.free && survival.phase === 'active') {
          const x = a.x - survival.dir * (a.stats.width + 18), y = a.y - a.stats.height * 0.55 - 7;
          for (const [color, size] of [[ink, 7], [mint, 4]]) {
            pixelLine(ctx, x + survival.dir * 11, y, x, y, color, size, 2);
            pixelLine(ctx, x, y + 11, x, y, color, size, 2);
            pixelLine(ctx, x + survival.dir * 13, y + 13, x, y, color, size, 2);
          }
        }
      }
      if (this.launchTrace) launchDirections(ctx, this.launchTrace);
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
        // Keep the hands that actually hold the lip visible for either player slot.
        const order = a.ledge && b.ledgeTrump ? [b, a] : world.dogs;
        for (const f of order) if (f.stocks > 0) drawFighter(ctx, f, world, poseTime);
      }
      for (const d of world.projectiles) {
        drawItem(ctx, d);
      }
      drawBall(ctx, world.ball, world.time);
      for (const e of this.effects) {
        if (!e.behind) drawEffect(ctx, e);
        if (e.type !== 'parry' || !(world.hitStop > 0)) e.life -= dt;
      }
      this.effects = this.effects.filter((e) => e.life > 0);
      ctx.restore();
      this.drawOffscreen(ctx, world, left, top, width, height, this.zoom, time);
      if (this.launchTrace) launchKey(ctx, this.launchTrace, canvas.clientWidth);
    }
    drawEdgePortrait(ctx, f, x, y, time) {
      window.DogArt.draw(ctx, f.kind, x, y + 25, { face: f.face, scale: 0.53, time, pose: 'fall' });
    }
    drawOffscreen(ctx, world, left, top, width, height, zoom, time) {
      for (const f of world.dogs) {
        const x = (f.x - left) * zoom, y = (f.y - 35 - top) * zoom;
        if (f.absent || f.stocks <= 0 || (x >= 10 && x <= width - 10 && y >= 0 && y <= height + 4)) continue;
        const px = clamp(x, 27, width - 27), py = clamp(y, 26, height - 29);
        ctx.fillStyle = ink;
        ctx.fillRect(px - 23, py - 23, 46, 46);
        ctx.fillStyle = teamColor(f);
        ctx.fillRect(px - 20, py - 20, 40, 40);
        ctx.save();
        ctx.beginPath();
        ctx.rect(px - 19, py - 19, 38, 38);
        ctx.clip();
        this.drawEdgePortrait(ctx, f, px, py, time);
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
      x *= f.face;
      face = -f.face;
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
  function guideLedge(ctx, edge, width) {
    ctx.save();
    ctx.translate(snap(edge.x, 2), snap(edge.y, 2));
    // A short cutaway of the picnic plank leaves the drop visible on the left.
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, width, 13);
    ctx.fillRect(3, 13, width - 11, 4);
    ctx.fillRect(13, 16, 8, 13);
    ctx.fillStyle = '#ab7253';
    ctx.fillRect(2, 3, width - 5, 8);
    ctx.fillRect(5, 11, width - 15, 3);
    ctx.fillRect(15, 15, 4, 12);
    ctx.fillStyle = '#e4ac72';
    ctx.fillRect(1, 1, width - 2, 3);
    ctx.fillStyle = '#674f50';
    ctx.fillRect(6, 6, 4, 4);
    ctx.fillStyle = '#f2c78e';
    ctx.fillRect(6, 6, 2, 2);
    pixelLine(ctx, 29, 8, 45, 8, '#815b50', 2, 2);
    ctx.restore();
  }
  function guideWall(ctx, wall) {
    // Cut away three courses of Laundry's warm brickwork under the overhanging roof trim.
    const h = wall.bottom - wall.top;
    ctx.save();
    ctx.translate(wall.x, wall.top);
    ctx.fillStyle = ink;
    ctx.fillRect(-6, -8, 34, 7);
    ctx.fillRect(-3, -2, 31, 4);
    ctx.fillStyle = '#474057';
    ctx.fillRect(0, 0, 26, h - 3);
    ctx.fillRect(0, h - 3, 17, 3);
    ctx.fillStyle = '#b47b6c';
    ctx.fillRect(3, 3, 23, h - 7);
    ctx.fillRect(3, h - 4, 14, 4);
    ctx.fillStyle = '#885f68';
    ctx.fillRect(2, 0, 25, 6);
    for (let i = 0; i < 3; i++) {
      const y = 12 + i * 16;
      ctx.fillRect(3, y, 23, 2);
      ctx.fillRect(i % 2 ? 10 : 18, y + 2, 2, Math.min(14, h - y - 5));
    }
    ctx.fillStyle = '#e6b187';
    ctx.fillRect(-4, -6, 31, 3);
    ctx.fillStyle = '#c98b73';
    ctx.fillRect(6, 16, 7, 2);
    ctx.fillRect(15, 32, 8, 2);
    ctx.restore();
  }
  function defenseThumbnail(source, kind, side) {
    source.width = 320;
    source.height = 228;
    const ctx = source.getContext('2d');
    ctx.translate(160, 148);
    const f = { kind, x: 0, y: 0, face: 1, stats: window.DogFight.fighters[kind] };
    let phase = 0,
      time = 0,
      wallMark = null;
    if (side === 'platformDrop') {
      const surface = -Math.round(f.stats.height * 0.65);
      pixelLine(ctx, -63, surface + 2, 63, surface + 2, '#885f68', 6, 2);
      pixelLine(ctx, -65, surface, 65, surface, '#e6b187', 3, 2);
      drawEffect(ctx, { type: 'platformDrop', x: 0, y: surface, life: 0.09, max: 11 / 60,
        size: f.stats.width + 6, fromShield: true });
      phase = 0.45;
    } else if (side === 'crouchHit') {
      phase = 0.3;
      pixelLine(ctx, -43, 1, 42, 1, '#94765f', 3, 2);
      drawEffect(ctx, { type: 'crouchCancel', x: 0, y: 0, life: 0.14, max: 0.16, size: f.stats.width * 0.8, planted: true });
    } else if (side === 'tumble') {
      time = 0.21;
      pixelLine(ctx, -52, -5, -35, -15, '#c6a984', 3, 2);
      pixelLine(ctx, -45, -1, -36, -7, cream, 2, 2);
    } else if (side === 'ledgeClimb') {
      const kit = window.DogFight.kits[kind].ledgeClimb;
      const tick = Math.round(kit.lift * 0.85);
      const feet = window.DogFight.ledgeClimbPosition(kit, tick / 60);
      f.x = feet.x;
      f.y = feet.y;
      phase = tick / kit.total;
      guideLedge(ctx, { x: 0, y: 0 }, 65);
    } else if (side === 'ledgeRoll') {
      const roll = window.DogFight.kits[kind].ledgeRoll;
      const tick = Math.round(roll.plant + (roll.safe[1] - roll.plant) * 0.35);
      const edge = { x: 0, y: 0, index: 0, left: true };
      const action = window.DogFight.ledgeRollAction(roll, edge);
      action.time = tick / 60;
      const body = window.DogFight.ledgeRollPosition(action);
      f.x = body.x;
      f.y = body.y;
      f.floorAction = action;
      phase = action.time / action.duration;
      guideLedge(ctx, edge, Math.max(65, Math.round(body.x + f.stats.width + 9)));
      ledgeRollTrail(ctx, f);
    } else if (wallOptions.has(side)) {
      const y = -Math.round(f.stats.height * 0.52);
      const wall = { x: f.stats.width, top: y - 25, bottom: y + 31 };
      guideWall(ctx, wall);
      const jump = side === 'wallTechJump';
      const bounce = side === 'wallBounce';
      phase = jump ? 0.32 : bounce ? 0.5 : 0.4;
      // Keep the original contact on the masonry as the two airborne snapshots separate.
      f.x = jump ? -12 : bounce ? -18 : 0;
      f.y = jump ? -Math.round(f.stats.jump * 0.034) : bounce ? 3 : 0;
      wallMark = { type: side, x: wall.x, y, wall, face: -1, size: 13, color: bounce ? '#e0a379' : mint };
    } else if (side === 'neutralAirDodge' || side === 'directionalAirDodge') {
      const directed = side === 'directionalAirDodge';
      const [total, first, last] = window.DogFight.kits[kind].airDodge[directed ? 'directional' : 'neutral'];
      const tick = Math.round(first + (last - first) * (directed ? 0.7 : 0.5));
      phase = tick / total;
      f.airDodge = {
        type: side,
        time: tick / 60,
        duration: total / 60,
        safeFrom: first / 60,
        safeUntil: (last + 1) / 60,
        x: directed ? Math.SQRT1_2 : 0,
        y: directed ? -Math.SQRT1_2 : 0,
      };
      airDodgeSlip(ctx, f);
    } else {
      pixelLine(ctx, -49, 1, 50, 1, '#736477', 2, 2);
      if (side === 'techRoll') {
        phase = 0.42;
        f.floorAction = { type: 'techRoll', time: phase, duration: 1, dir: 1 };
        landingEffect(ctx, { type: 'techLand', x: -25, y: 0, size: 11, dir: 1 }, 0.3);
        floorRollTrack(ctx, f);
      } else if (side === 'floorAttack') {
        const move = window.DogFight.moves.getupSweep;
        f.attack = { ...move, time: move.start + move.active * 0.32, moveId: 'getupSweep' };
        phase = attackPhase(f.attack);
      } else if (side === 'shieldRoll' || side === 'spotDodge') {
        const rolling = side === 'shieldRoll';
        const [total, first, last] = window.DogFight.kits[kind].defense[rolling ? 'roll' : 'spot'];
        const tick = Math.round(first + (last - first) * (rolling ? 0.63 : 0.57));
        phase = tick / total;
        f.floorAction = {
          type: side,
          time: tick / 60,
          duration: total / 60,
          dir: rolling ? 1 : 0,
          safeFrom: first / 60,
          safeUntil: (last + 1) / 60,
        };
        shieldSlip(ctx, f);
      } else if (side === 'parry') {
        phase = 0.28;
      }
    }
    window.DogArt.draw(ctx, kind, f.x, f.y, {
      face: 1,
      scale: 1,
      time,
      pose: side === 'platformDrop' ? 'fall' : side === 'shieldTilt' ? 'shield' : side,
      phase,
      dodgeX: f.airDodge?.x || 0,
      dodgeY: f.airDodge?.y || 0,
    });
    if (side === 'shieldTilt') raisedShield(ctx, { ...f, index: 0, shieldHP: 0.30, shieldLeanX: 0.5, shieldLeanY: 0.85 });
    if (f.attack) floorSweep(ctx, f, f.attack);
    if (wallMark) wallContactMark(ctx, wallMark, 0.25);
    if (side === 'parry') {
      const [x, y] =
        kind === 'clover'
          ? window.DogArt.itemPoint(kind, side, phase)
          : window.DogArt.pawPoint(kind, side, phase);
      parryContact(ctx, x + 8, y - 3, 1, false, phase);
    }
  }
  function drawMoveThumbnail(canvas, kind, side, category = 'air') {
    const target = canvas.getContext('2d');
    const cacheKey = [kind, category, side, canvas.width, canvas.height].join('/');
    const cached = moveThumbnails.get(cacheKey);
    target.clearRect(0, 0, canvas.width, canvas.height);
    if (cached) {
      target.drawImage(cached, 0, 0);
      return;
    }
    const source = document.createElement('canvas');
    if (category === 'defense') {
      defenseThumbnail(source, kind, side);
      fitThumbnail(canvas, source, cacheKey);
      return;
    }
    const { kits, moves, specials, smashes, grabs, throws, pummels, fighters } = window.DogFight;
    const grapple = category === 'throws',
      movingCatch = grapple && (side === 'dashGrab' || side === 'pivotGrab'),
      catching = grapple && (side === 'grab' || movingCatch),
      pummeling = grapple && side === 'pummel';
    const dash = category === 'dash';
    const ledge = category === 'ledge';
    const kit = kits[kind];
    const singleMove = ledge ? kit.ledgeAttack : dash ? kit.dashAttack : null;
    const id = singleMove || (catching || pummeling ? kit[side] : kit[category][side]);
    const book = {
      air: moves,
      dash: moves,
      ledge: moves,
      tilts: moves,
      specials,
      smashes,
      throws: catching ? grabs : pummeling ? pummels : throws,
    };
    const move = book[category][id];
    // Fit the whole silhouette, including the rope or disc beyond the dog's body.
    const smash = category === 'smashes';
    source.width = movingCatch ? 520 : grapple ? 420 : smash ? 400 : 320;
    source.height = grapple ? 330 : smash ? 312 : 272;
    const ctx = source.getContext('2d');
    ctx.translate(movingCatch ? 260 : smash || grapple ? 190 : 150, grapple ? 190 : smash ? 185 : 158);
    const beat =
      (id === 'pipScissors' || id === 'noodleBellPull' || dash || category === 'tilts') && move.second
        ? move.second
        : move;
    const a = {
      ...move,
      moveId: id,
      time: ledge ? move.start : beat.start + beat.active * (dash ? 0.25 : 0.35),
      power: 0.75,
    };
    if (category === 'air') a.airSide = side;
    else if (category === 'tilts') a.tiltSide = side;
    else if (smash) {
      a.smashSide = side;
      a.fired = !!a.projectile;
    } else if (grapple) {
      if (catching) {
        a.grabAttempt = true;
        a.grabStyle = side === 'pivotGrab' ? 'pivot' : side === 'dashGrab' ? 'dash' : 'standing';
        a.runFace = 1;
      } else if (pummeling) a.pummel = true;
      else a.throwSide = side;
    } else if (!dash && !ledge) a.specialSide = side;
    if (id === 'noodleLasso') a.anchor = { x: 86, y: -86 };
    const fighter = { kind, index: 0, face: 1, x: 0, y: 0, ground: 0, stats: fighters[kind], attack: a };
    if (ledge) {
      const body = window.DogFight.ledgePosition(a);
      a.edge = { x: -body.x, y: -body.y, index: 0, left: true };
      a.planted = body.planted;
      fighter.ground = body.planted ? 0 : -1;
      guideLedge(ctx, a.edge, Math.max(77, Math.round(body.x + a.box[0] + a.box[2] + 4)));
    }
    if (dash) {
      fighter.vx = fighter.stats.speed;
      dashFootwork(ctx, fighter);
    }
    if (movingCatch) {
      // Keep the incoming run rightward for both diagrams. The pivot catches
      // behind that run, with its own paws, disc or rope genuinely facing left.
      fighter.face = side === 'pivotGrab' ? -1 : 1;
      fighter.vx = fighter.stats.speed * (side === 'pivotGrab' ? 0.28 : 0.82);
      movingGrabFeet(ctx, fighter);
    }
    const release = grapple ? throwGuidePartner(ctx, fighter, side, catching) : null;
    window.DogArt.draw(ctx, kind, 0, 0, {
      face: fighter.face,
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
    fitThumbnail(canvas, source, cacheKey);
  }
  function fitThumbnail(canvas, source, cacheKey) {
    const target = canvas.getContext('2d');
    const { data } = source.getContext('2d').getImageData(0, 0, source.width, source.height);
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
  window.DogFightView = {
    FightView,
    drawPreview,
    drawMoveThumbnail,
    drawFighter,
    drawItem,
    drawEffect,
    gripLead,
  };
})();
