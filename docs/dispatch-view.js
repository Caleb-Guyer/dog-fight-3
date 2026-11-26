(() => {
  'use strict';
  const { FightView, drawFighter, drawItem, drawEffect, gripLead } = window.DogFightView;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const patterns = {
    stamp: {name:'Paw stamp', hint:'When the front paw rises, shield or back up. Step in and tap Attack as the lamp opens.'},
    charge: {name:'Rail charge', hint:'Jump over the rush or block it. Follow the Hound and turn toward the open lamp before you attack.'},
    bell: {name:'Floor bell', hint:'The bell sends a brass wave along the floor. Jump the crest or block it, then close in and hit the open lamp.'},
  };
  function patternButton(move) {
    return '<button class="utility" data-boss-pattern="'+move+'">'+patterns[move].name+'</button>';
  }
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
      if (phase === 'windup' && e.move !== 'bell' && !f.stun && f.ground >= 0) {
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
      if (phase === 'windup' && e.move === 'bell') {
        // A lifting bell and a travelling clapper count down to the strike, even with sound off.
        const t = Math.min(1, e.time / e.duration), y = -f.stats.height - 7 - Math.round(t * 9);
        ctx.translate(Math.round(f.x), Math.round(f.y + y));
        ctx.fillStyle = '#302333';
        ctx.fillRect(-15, -9, 30, 13); ctx.fillRect(-10, -17, 20, 12);
        ctx.fillStyle = '#d98344';
        ctx.fillRect(-8, -15, 16, 11); ctx.fillRect(-13, -7, 26, 6);
        ctx.fillStyle = '#ffe69c';
        ctx.fillRect(-6, -14, 4, 8); ctx.fillRect(-13, -3, 26, 3);
        ctx.fillRect(reduced.matches ? -2 : Math.round(7 * Math.sin(t * 8)) - 2, 1, 5, 4);
        ctx.fillRect(-15, 10, Math.round(t * 30), 2);
      }
    }
    ctx.restore();
  }
  function drawBellWave(ctx, wave, floor) {
    for (const face of [-1, 1]) {
      const crest = Math.round(wave.x + face * wave.radius);
      if (crest < floor.x1 || crest > floor.x2) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(floor.x1, floor.y - 30, floor.x2 - floor.x1, 34); ctx.clip();
      ctx.translate(crest, floor.y); ctx.scale(face, 1);
      ctx.fillStyle = '#332337';
      ctx.fillRect(-21, -6, 31, 7); ctx.fillRect(-9, -15, 17, 11); ctx.fillRect(-5, -22, 10, 8);
      ctx.fillStyle = '#e48642';
      ctx.fillRect(-18, -5, 26, 5); ctx.fillRect(-7, -13, 13, 9); ctx.fillRect(-3, -20, 6, 9);
      ctx.fillStyle = '#fff0a1';
      ctx.fillRect(0, -19, 3, 7); ctx.fillRect(3, -12, 3, 9); ctx.fillRect(-26, -3, 6, 2);
      ctx.restore();
    }
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
    missionCues({tone,sound,dispatchNotice,stockLabel,mission,sideRoute,cupRound,unlockLift,stored,rivalName}){
      return (name,e)=>{
        this.event(name,e);
        if (name === 'dispatchCheckpoint') {
          tone(485, 735, 0.12);
          tone(735, 980, 0.13, 0.12);
          dispatchNotice(stored() ? 'Checkpoint saved' : 'Checkpoint reached');
        } else if (name === 'dispatchStamp') {
          if (cupRound) return;
          tone(760, 1150, 0.09);
          dispatchNotice(unlockLift?'Postmark collected · Dead Letter Lift unlocked':'Postmark collected');
        } else if (name === 'dispatchSignal') {
          tone(330, 660, 0.19);
          dispatchNotice(e.name + ' raised');
        } else if (name === 'dispatchWave') {
          tone(420, 570, 0.12);
          if (sideRoute) dispatchNotice(mission.stops[e.wave-1]+' · '+rivalName());
          else if (mission.rules === 'horde') dispatchNotice('Wave ' + e.wave);
        } else if (name === 'ko') {
          sound(name, e);
          dispatchNotice(e.f.stats.name + (e.remaining ? ' · ' + stockLabel(e.remaining) + ' left' : ' out'));
        } else if (name === 'stockTie') dispatchNotice('Tiebreak · One stock each');
        else if (name === 'hoist') dispatchNotice('Gantry catch · Armor damaged');
        else if (name === 'dispatchVictory') dispatchNotice(cupRound ? 'Copper Hound defeated' : 'Mission clear');
        else if (name === 'machineWindup') {
          if (e.move === 'bell') { tone(540, 485, 0.22); tone(810, 735, 0.23, 0.36); }
          else tone(e.move === 'charge' ? 240 : 160, e.move === 'charge' ? 390 : 210, 0.18, 0, 'triangle', 0.07);
        } else if (name === 'machineDown') {
          tone(215, 48, 0.18);
          tone(620, 435, 0.12, 0.1);
        } else if (name === 'machineSwing') tone(135, 55, 0.11);
        else sound(name, e);
      };
    }
    static pausePanel(world,showDialog,screenAction) {
      showDialog('pause','Adventure paused','<p>'+world.layout.name+' · '+world.objective+
        '</p><div class="dialog-actions"><button class="primary" data-do="resume">Resume</button><button class="utility" data-do="suspend-mission">Suspend &amp; quit</button><button class="utility" data-do="dispatch-retry">Retry</button><button class="utility" data-do="controls">Controls</button><button class="utility" data-do="moves">Move list</button>'+screenAction+
        '</div><div class="dialog-actions"><button class="utility" data-do="route">Route map</button><button class="utility" data-do="home">Main menu</button></div>'+this.patternChoices(world));
      document.querySelector('[data-do=resume]').focus();
    }
    static fallPanel(world,fightStocks,showDialog,stockLabel){
      showDialog(
        'dispatch-fall',
        world.bridge ? 'Runner down' : 'Out of stocks',
        '<p>Restart at ' + (world.layout.checkpoints[world.checkpoint - 1]?.name || world.layout.name) +
          (world.bridge ? '.' : ' with ' + stockLabel(world.atCheckpoint?.stocks ?? fightStocks) + ' at ' +
          Math.floor(world.atCheckpoint?.damage || 0) + '%.') +
          '</p><div class="dialog-actions"><button class="primary" data-do="dispatch-retry">Retry</button>' +
          (!world.bridge && world.checkpoint ? '<button class="utility" data-do="dispatch-rematch">Restart mission</button>' : '') +
          '<button class="utility" data-do="route">Route map</button></div>'+this.patternChoices(world),
        false,
      );
      document.querySelector('[data-do=dispatch-retry]').focus();
    }
    static patternChoices(world) {
      if (world.layout.rules !== 'boss') return '';
      const last = world.lastBossHit;
      return '<h3>Practice a boss attack</h3>'+
        (last && patterns[last]?'<p>Last hit · '+patterns[last].name+'. '+patterns[last].hint+'</p>':'')+
        '<div class="dialog-actions">'+Object.keys(patterns).map(patternButton).join('')+'</div>';
    }
    static lessonPanel(world, parked, showDialog) {
      const move = world.bossLesson.move, outcome = world.finished;
      const titles = {caught:'That one connected', missed:'The lamp closed', fell:'Pip went offstage', countered:'Clean counter'};
      const advice = outcome === 'countered' ? 'You avoided the hit and struck the open lamp.' : patterns[move].hint;
      const others = Object.keys(patterns).filter(id=>id!==move);
      showDialog(outcome?'boss-result':'pause', outcome?titles[outcome]:'Boss practice paused',
        '<p><strong>'+patterns[move].name+'</strong> · '+advice+'</p><div class="dialog-actions">'+
        (outcome?'':'<button class="primary" data-do="resume">Resume practice</button>')+
        '<button class="'+(outcome?'primary':'utility')+'" data-do="boss-return">'+(parked.finished?'Retry Bell Depot':'Resume Bell Depot')+'</button>'+
        '<button class="utility" data-boss-pattern="'+move+'">Try again</button>'+others.map(patternButton).join('')+'</div>', !outcome);
      document.querySelector(outcome?'[data-do=boss-return]':'[data-do=resume]').focus();
    }
    static updateScoreboard(world,recovery,order,marks,{$,tenth,showPercent,showStocks,recoveryStrip}) {
      const hero=world.dogs[0], foes=world.foes, lead=foes[0];
      const boss=world.layout.rules==='boss', horde=world.layout.rules==='horde';
      $('runner-score').hidden = !!world.bridge;
      $('runner-recovery').hidden = recovery === null;
      if (recovery !== null) $('runner-recovery').innerHTML = recoveryStrip(recovery);
      if (!world.bridge) {
        showPercent($('runner-percent'), hero.damage);
        showStocks($('runner-lives'), hero.stocks, hero.stats.name);
      }
      $('machine-meter').hidden = !lead;
      if (lead) {
        $('machine-name').textContent = horde ? 'Sorting crew' : lead.f.stats.name;
        $('rival-score').hidden = boss;
        $('machine-health').hidden = !boss;
        if (boss) {
          $('machine-health').max = lead.maxHP;
          $('machine-health').value = lead.hp;
        } else {
          $('rival-percent').hidden = horde;
          if (!horde) showPercent($('rival-percent'), lead.f.damage);
          const team = world.sideRoute?'Lift crew':horde ? 'Sorting crew' : world.layout.rules === 'relay' ? 'Cage guards' : lead.f.stats.name;
          showStocks($('rival-lives'), world.rivalStocks, team);
          if (horde) $('rival-score').setAttribute('aria-label', foes.filter((e) => e.f.stocks)
            .map((e) => e.f.stats.name + ' ' + tenth(e.f.damage) + '%').join(', '));
          else $('rival-score').removeAttribute('aria-label');
        }
      }
      $('dispatch-marks').textContent = marks;
      if ($('dispatch-objective').textContent !== order) $('dispatch-objective').textContent = order;
    }
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
      if (world.foes[0]?.wavefront) drawBellWave(ctx, world.foes[0].wavefront, world.terrain[0]);
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
