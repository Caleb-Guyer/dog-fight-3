(() => {
  'use strict';
  const { Battle, idleInput, clamp, shieldContact } = window.DogFight;
  const { chapters, fightStocks } = window.DispatchScript;
  const isDog = kind => Object.hasOwn(window.DogFight.fighters, kind);
  const machines = {
    clipper: { name: 'Ticket Clipper', width: 26, height: 64, weight: 1.03, speed: 157, reach: 59,
      windup: 0.53, damage: 7, base: 155, growth: 3.6 },
    puncher: { name: 'Punch Press', width: 23, height: 53, weight: 0.89, speed: 206, reach: 82,
      windup: 0.39, damage: 5, base: 113, growth: 3.1 },
    porter: { name: 'Baggage Porter', width: 34, height: 58, weight: 1.27, speed: 139, reach: 80,
      windup: 0.79, damage: 9, base: 215, growth: 5.1 },
    conductor: { name: 'Copper Hound', width: 54, height: 107, weight: 3.8, speed: 156, reach: 106,
      windup: 0.74, damage: 16, base: 255, growth: 5.7 },
  };
  function phase(enemy, name, duration) {
    enemy.phase = name;
    enemy.time = 0;
    enemy.duration = duration;
  }
  class DispatchRun extends Battle {
    constructor({ chapter = 1, room = 0, checkpoint = 0, stamps = 0, atCheckpoint = null, cupFighter, coat = 0 }, emit = () => {}) {
      const {rooms, chapterFighter, bonus} = chapters[chapter-1];
      const sideRoute = !!bonus && room===bonus.id;
      const script = sideRoute ? bonus : rooms[room], saved = script.checkpoints[checkpoint - 1];
      const bridge = script.signals ? new window.DispatchBridge(script, checkpoint) : null;
      const layout = bridge ? { ...script, terrain: bridge.geometry(0) } :
        sideRoute ? {...script,terrain:script.terrain.map(p=>({...p}))} : script;
      const cupBoss = script.rules === 'boss' && Object.hasOwn(window.DogFight.fighters,cupFighter);
      super({ stage: 'dispatch', layout, mode: 'adventure', p1: cupBoss ? cupFighter : chapterFighter, p2: 'brisket', fetch: false }, emit);
      this.random=window.DogFight.seededRandom(Math.floor(this.random()*0x100000000));
      this.cupCoat = cupBoss && window.DogFight.validCoat(coat) ? coat : 0;
      this.roomIndex = room;
      this.sideRoute=sideRoute;
      this.runFrames=0;
      this.chapter = chapter;
      this.atCheckpoint = saved && !bridge ? atCheckpoint : null;
      const runner = this.dogs[0];
      runner.stocks = this.atCheckpoint?.stocks ?? fightStocks;
      runner.damage = this.atCheckpoint?.damage ?? 0;
      runner.moveHistory = window.DogFight.savedMoveHistory(this.atCheckpoint?.moveHistory);
      this.clearDelay = 0;
      this.stamps = stamps;
      this.checkpoint = saved ? checkpoint : 0;
      this.bridge = bridge;
      this.finished = '';
      this.wave = saved?.wave || 0;
      this.waveWait = 0;
      this.foes = [];
      if (bridge) {
        const f = this.dogs[0];
        if (saved) {
          f.x = saved.x;
          f.ground = this.terrain.findIndex((p) => !p.thin && f.x >= p.x1 && f.x <= p.x2);
          f.y = this.terrain[f.ground].y;
        }
        this.park(this.dogs[1]);
      } else this.startWave();
      this.cameraWidth = 1200;
      this.cameraX = this.cameraTarget();
    }
    cameraTarget() {
      const travel = this.layout.length - this.cameraWidth, hero = this.dogs[0];
      if (travel <= 0) return travel / 2;
      if (this.bridge) return clamp(hero.x - this.cameraWidth * 0.37, 0, travel);
      const rivals = this.opponents(hero);
      const nearest = rivals.reduce((best, f) =>
        !best || Math.abs(f.x - hero.x) < Math.abs(best.x - hero.x) ? f : best, null);
      const lead = nearest ? clamp((nearest.x - hero.x) / 2, -this.cameraWidth * 0.21, this.cameraWidth * 0.21) : 0;
      return clamp(hero.x + lead - this.cameraWidth / 2, 0, travel);
    }
    coatFor(slot) { return slot === 0 ? this.cupCoat : 0; }
    setCameraWidth(width) {
      if (width === this.cameraWidth) return;
      this.cameraWidth = width;
      this.cameraX = this.cameraTarget();
    }
    get rivalStocks() {
      let stocks = this.foes.reduce((n, e) => n + e.f.stocks, 0);
      if (this.layout.rules === 'relay')
        for (const wave of this.layout.waves.slice(this.wave + 1))
          for (const reserve of wave) stocks += reserve.stocks;
      return stocks;
    }
    get objective() {
      const boss = this.foes[0];
      if (boss?.kind === 'conductor') {
        if (boss.phase === 'windup' && boss.move === 'bell') return 'Bell winding up · Jump the floor wave or shield.';
        const wave = boss.wavefront, hero = this.dogs[0];
        if (wave && !wave.spent && wave.radius <= Math.abs(hero.x - wave.x) + hero.stats.width + 10)
          return 'Floor wave · Jump over the brass crest.';
        if (boss.phase === 'stun') return 'Lamp open · Hit the Copper Hound!';
      }
      if (this.sideRoute) return this.layout.stops[this.wave]+' · '+(this.wave+1)+' of 3 · '+this.foes[0].f.stats.name;
      if (this.bridge) return this.bridge.objective(this.dogs[0].x);
      if (this.layout.rules === 'horde') {
        const n = this.rivalStocks;
        return 'Wave ' + (this.wave + 1) + ' of ' + this.layout.waves.length +
          ' · ' + n + (n === 1 ? ' crew stock' : ' crew stocks') +
          (this.layout.orders ? ' · ' + this.layout.orders[this.wave] : '');
      }
      return this.layout.objective;
    }
    cpuControlled(f) {
      return isDog(f.encounter?.kind);
    }
    opponents(f) {
      if (f.index) return f.absent ? [] : [this.dogs[0]];
      return this.foes.filter((e) => e.f.stocks > 0 && !e.f.absent).map((e) => e.f);
    }
    separateGroundedFighters() {
      const bodies = [this.dogs[0], ...this.opponents(this.dogs[0])];
      for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++) super.separateGroundedFighters(bodies[i], bodies[j]);
    }
    park(f) {
      Object.assign(f, { absent: true, attack: null, stockLift: null, stockGuard: 0, ground: -1, x: -4096, y: 0, respawning: Infinity, invuln: Infinity });
    }
    placeOpponent(e, returning) {
      const { f, spec } = e, hero = this.dogs[0], floor = this.terrain[0];
      this.spawn(f, returning, false);
      f.absent = false;
      f.x = spec.x;
      if ((this.wave || returning) && Math.abs(f.x - hero.x) < 150)
        f.x = clamp(hero.x + (hero.x < this.stageWidth / 2 ? 225 : -225), floor.x1 + 50, floor.x2 - 50);
      f.face = f.x < hero.x ? 1 : -1;
      if (machines[e.kind]) f.stats = { ...f.stats, ...machines[e.kind] };
      f.encounter = e;
      if (returning && isDog(e.kind)) this.beginStockReturn(f);
      Object.assign(e, { cycle: 0, move: 'stamp', face: f.face, spent: false, hurt: 0, jumpHold: 0 });
      if (e.kind === 'conductor') { e.wavefront = null; e.nextBell = 0; }
      phase(e, 'approach', 1);
    }
    startWave() {
      if (this.sideRoute) this.cpuLevel=this.layout.levels[this.wave];
      this.foes = this.layout.waves[this.wave].map((spec, i) => {
        const index = i + 1, f = this.dogs[index] || { kind: 'brisket', index };
        this.dogs[index] = f;
        f.kind = isDog(spec.kind) ? spec.kind : 'brisket';
        f.stocks = spec.stocks;
        const e = { kind: spec.kind, hp: spec.hp ?? null, maxHP: spec.hp ?? null, f, spec };
        this.placeOpponent(e, false);
        this.emit('machineStart', { f, kind: e.kind });
        return e;
      });
      this.dogs.length = this.foes.length + 1;
    }
    knockouts(out) {
      const hero = this.dogs[0];
      if (this.bridge) { this.finished = 'fallen'; return; }
      // Resolve the whole physics tick before choosing a winner, including simultaneous last stocks.
      for (const f of out) {
        const e = f.encounter;
        if (e?.kind === 'conductor') {
          // Throwing the locomotive off its rails costs it armor. The overhead hoist reels it back.
          e.hp = Math.max(0, e.hp - 36);
          if (e.hp > 0) {
            this.placeOpponent(e, true);
            this.emit('hoist', { f });
            continue;
          }
        }
        this.loseStock(f);
      }
      const lastWave = this.wave + 1 === this.layout.waves.length;
      const rivalOut = out.find((f) => f.index && f.stocks === 0);
      const tie = hero.stocks === 0 && rivalOut && lastWave && this.foes.every((e) => e.f.stocks <= 0) &&
        this.layout.rules !== 'boss';
      if (tie) {
        // Re-enter with the rival lost on this tick. Previously eliminated teammates stay out.
        hero.stocks = rivalOut.stocks = 1;
      }
      for (const f of out) {
        if (f.encounter?.kind === 'conductor' && f.encounter.hp > 0) continue;
        if (f.stocks <= 0) {
          if (!f.index) { this.finished = 'fallen'; continue; }
          this.park(f);
          this.emit('machineDown', { f, kind: f.encounter.kind });
        } else if (f.index) this.placeOpponent(f.encounter, true);
        else this.spawn(hero, true);
      }
      if (tie) this.emit('stockTie', { f: hero });
    }
    dealDamage(target, amount, preserveCombo) {
      const e = target.encounter, boss = e?.kind === 'conductor';
      const scale = boss ? (e.phase === 'stun' ? 1.4 : 0.46) : 1;
      const applied = super.dealDamage(target, boss ? Math.round(amount * scale * 10) / 10 : amount, preserveCombo);
      if (e) e.hurt = 0.13;
      if (boss) {
        e.hp = Math.max(0, e.hp - applied);
        target.damage = Math.min(target.damage, 45);
      }
      return applied;
    }
    hit(target, ...args) {
      const planted = target.encounter?.kind === 'conductor' && target.ground >= 0 && !target.grip;
      const floor = target.ground, feet = target.y;
      const connected = super.hit(target, ...args);
      if (connected && planted) {
        target.ground = floor;
        target.y = feet;
        target.vx = target.vy = target.stun = 0;
        target.tumble = target.floorAction = target.reaction = null;
      }
      return connected;
    }
    catchRival(owner, target, attack) {
      if (target.encounter?.kind === 'conductor' && target.encounter.phase !== 'stun') return;
      super.catchRival(owner, target, attack);
    }
    parry(target, owner, ...args) {
      super.parry(target, owner, ...args);
      if (owner.encounter?.kind === 'conductor') phase(owner.encounter, 'stun', 1.25);
    }
    machineInput(e, dt) {
      const { f, kind } = e, hero = this.dogs[0];
      if (!f.stocks || (f.respawning && !f.stockLift) || (kind === 'conductor' && e.hp <= 0)) return idleInput;
      if (isDog(kind)) return this.cpu(dt);
      if (f.grip || f.impactLag > 1e-8) return idleInput;
      if (f.ledge) return { ...idleInput, x: f.ledge.left ? 1 : -1, jump: true };
      e.jumpHold = Math.max(0, e.jumpHold - dt);
      if (f.floorAction?.type === 'downed') return { ...idleInput, jump: true };
      if (f.stun > 0 || f.floorAction) return idleInput;
      const floor = this.terrain[0], body = machines[kind], boss = kind === 'conductor';
      if (f.ground < 0) {
        const edge = f.x < floor.x1 ? floor.x1 : f.x > floor.x2 ? floor.x2 : null;
        if (edge === null || boss) return e.jumpHold ? { ...idleInput, jump: true } : idleInput;
        f.stats.speed = Math.max(body.speed, 216);
        const x = Math.sign(edge - f.x);
        if (!e.jumpHold && f.jumps && f.vy > 50 && f.y > floor.y - 45) {
          e.jumpHold = 0.26;
          return { ...idleInput, x, jump: true, tapped: { jump: true } };
        }
        return { ...idleInput, x, jump: e.jumpHold > 0 };
      }
      const dx = hero.x - f.x;
      e.time += dt;
      if (e.phase === 'approach') {
        e.face = dx < 0 ? -1 : 1;
        f.face = e.face;
        if (!boss && Math.abs(dx) < 140 && Math.abs(f.y - hero.y) > 74) {
          if (hero.y > f.y && this.terrain[f.ground].thin)
            return { ...idleInput, jump: true, y: 1, tapped: { jump: true } };
          if (hero.ground >= 0 && hero.y < f.y && kind !== 'porter') {
            e.jumpHold = 0.3;
            return { ...idleInput, jump: true, tapped: { jump: true } };
          }
        }
        const bell = boss && e.hp <= e.maxHP / 2 && e.cycle >= (e.nextBell || 0) && !e.wavefront;
        const rush = kind === 'porter' || (boss && e.cycle % 2 === 1);
        const reach = rush ? (boss ? 475 : 235) : body.reach + 23;
        if (!bell && Math.abs(dx) > reach) {
          f.stats.speed = body.speed;
          const target = clamp(hero.x, floor.x1 + body.width + 12, floor.x2 - body.width - 12);
          return Math.abs(target - f.x) > 7 ? { ...idleInput, x: Math.sign(target - f.x) } : idleInput;
        }
        e.move = bell ? 'bell' : rush ? 'charge' : 'stamp';
        e.spent = false;
        phase(e, 'windup', bell ? 0.9 : boss && rush ? 0.93 : body.windup);
        this.emit('machineWindup', { f, kind, move: e.move });
      } else if (e.phase === 'windup' && e.time >= e.duration) {
        if (e.move === 'bell') {
          e.wavefront = { x: f.x, radius: 0, spent: false };
          e.nextBell = e.cycle + 3;
        }
        phase(e, 'strike', e.move === 'charge' ? (boss ? 0.62 : 0.46) : 0.2);
        this.emit('machineSwing', { f, kind, move: e.move });
      } else if (e.phase === 'strike' && e.time >= e.duration) {
        e.cycle++;
        phase(e, 'stun', e.move === 'bell' ? 1.45 : boss ? (e.hp < e.maxHP / 2 ? 0.75 : 1.05) : kind === 'puncher' ? 0.48 : 0.8);
      } else if (e.phase === 'stun' && e.time >= e.duration) phase(e, 'approach', 1);
      f.face = e.face;
      if (e.phase === 'strike' && e.move === 'charge') {
        const lip = e.face > 0 ? floor.x2 - f.x : f.x - floor.x1;
        if (lip < body.width + 12) {
          f.vx = 0;
          e.cycle++;
          phase(e, 'stun', boss ? 0.95 : 0.8);
          return idleInput;
        }
        f.stats.speed = boss ? 555 : 458;
        return { ...idleInput, x: e.face };
      }
      return idleInput;
    }
    machineContact(e) {
      const { f, kind } = e, hero = this.dogs[0];
      if (e.move === 'bell') return;
      if (e.phase !== 'strike' || e.spent || !f.stocks || f.respawning || f.stun > 0 || f.grip || f.ground < 0) return;
      if (hero.stockLift || hero.stockGuard) return;
      const body = machines[kind], boss = kind === 'conductor', rush = e.move === 'charge';
      const dx = (hero.x - f.x) * e.face;
      const back = rush ? -36 : -12, front = boss && rush ? 64 : body.reach, high = boss ? 73 : body.height - 10;
      const guard = shieldContact(hero, { x: f.x + e.face * (front + back) / 2, rx: (front - back) / 2,
        y: f.y + (6 - high) / 2, ry: (high + 6) / 2 });
      if (!guard && (dx < back - hero.stats.width || dx > front + hero.stats.width ||
          hero.y - hero.stats.height > f.y + 6 || hero.y < f.y - high)) return;
      e.spent = true;
      this.hit(hero, f, boss && rush ? 13 : body.damage, body.base, body.growth, 0,
        boss ? 'heavy' : 'jab', e.face, guard || { x: hero.x, y: hero.y - hero.stats.height * 0.55 },
        { angle: rush ? 29 : boss ? 62 : 42, hard: boss || kind === 'porter' }, null, null, !!guard);
    }
    advanceBell(e, dt) {
      const wave = e.wavefront, floor = this.terrain[0], hero = this.dogs[0];
      const previous = wave.radius;
      wave.radius += 430 * dt;
      const face = hero.x < wave.x ? -1 : 1;
      const edge = face < 0 ? wave.x - floor.x1 : floor.x2 - wave.x;
      if (!wave.spent && previous <= edge && !hero.stockLift && !hero.stockGuard) {
        // Sweep the short distance between ticks and truncate the wave at the stage lip.
        const front = Math.min(edge, wave.radius + 10), back = Math.max(0, previous - 10);
        const x = wave.x + face * (back + front) / 2, rx = (front - back) / 2;
        const area = { x, rx, y: floor.y - 11, ry: 11 };
        const guard = shieldContact(hero, area);
        if (guard || (Math.abs(hero.x - x) <= rx + hero.stats.width &&
            hero.y >= floor.y - 22 && hero.y - hero.stats.height <= floor.y)) {
          wave.spent = true;
          this.hit(hero, e.f, 10, 195, 4.1, 0, 'heavy', face, guard || { x, y: area.y },
            { angle: 52, hard: true, projectile: true }, null, null, !!guard);
        }
      }
      if (wave.radius > Math.max(wave.x - floor.x1, floor.x2 - wave.x)) e.wavefront = null;
    }
    savePoint() {
      this.checkpoint++;
      const f = this.dogs[0];
      this.atCheckpoint = this.bridge ? null : { stocks: f.stocks, damage: f.damage };
      if (this.atCheckpoint && f.moveHistory.length)
        this.atCheckpoint.moveHistory = window.DogFight.savedMoveHistory(f.moveHistory);
      this.emit('dispatchCheckpoint', { f, checkpoint: this.checkpoint, atCheckpoint: this.atCheckpoint });
    }
    awardMark() {
      if(this.sideRoute)return;
      const bit = 1 << this.roomIndex;
      if (this.stamps & bit) return;
      this.stamps |= bit;
      this.emit('dispatchStamp', { f: this.dogs[0] });
    }
    updateCrossing() {
      const f = this.dogs[0], l = this.layout, gate = this.bridge.nextSignal?.gate;
      f.x = clamp(f.x, f.stats.width, (gate ?? l.length) - f.stats.width);
      this.bridge.strikeSignal(this);
      const cp = l.checkpoints[this.checkpoint];
      if (cp && f.x >= cp.x && f.ground >= 0) this.savePoint();
      if (Math.hypot(f.x - l.stamp.x, f.y - f.stats.height * 0.52 - l.stamp.y) < 43) this.awardMark();
      if (!this.bridge.nextSignal && f.ground >= 0 && f.x >= l.exit - 12) this.finished = 'exit';
    }
    updateFight(dt) {
      const l = this.layout;
      for (const e of this.foes) {
        const { f } = e;
        if (f.absent) continue;
        e.hurt = Math.max(0, e.hurt - dt);
        if (e.kind === 'conductor' && e.hp <= 0) {
          e.wavefront = null;
          if (f.grip) this.breakGrapple(false);
          f.stocks = 0;
          f.attack = null;
          phase(e, 'defeat', 0.8);
          this.emit('machineDown', { f, kind: e.kind });
        } else if (machines[e.kind]) {
          if (e.wavefront) this.advanceBell(e, dt);
          this.machineContact(e);
        }
      }
      if (this.foes.some((e) => e.f.stocks > 0)) return;
      if (this.wave + 1 === l.waves.length) {
        this.clearDelay = 0.85;
        this.emit('dispatchVictory', { f: this.dogs[0] });
        return;
      }
      this.waveWait += dt;
      if (this.waveWait < 0.85) return;
      this.wave++;
      this.waveWait = 0;
      if (l.checkpoints[this.checkpoint]?.wave === this.wave) this.savePoint();
      this.startWave();
      this.emit('dispatchWave', { f: this.dogs[0], wave: this.wave + 1 });
    }
    step(dt, input = idleInput) {
      if (this.finished) return;
      if(this.sideRoute && !this.clearDelay)this.runFrames++;
      if (this.clearDelay > 0) {
        this.time += dt;
        this.clearDelay = Math.max(0, this.clearDelay - dt);
        for (const e of this.foes) if (e.phase === 'defeat') e.time += dt;
        if (!this.clearDelay) { this.awardMark(); this.finished = 'exit'; }
        return;
      }
      const frozen = this.hitStop > 0;
      if (this.sideRoute && !frozen) {
        const shelves=this.layout.shelves[this.wave], motion=25*Math.sin((this.time+dt)*1.25);
        for(let i=0;i<2;i++){
          const platform=this.layout.terrain[i+1], target=shelves[i]+(i ? -motion : motion);
          platform.y+=clamp(target-platform.y,-62*dt,62*dt);
        }
      }
      if (this.bridge && !frozen) this.layout.terrain = this.bridge.geometry(dt, this.dogs[0]);
      const inputs = this.foes.length && !frozen ? this.foes.map((e) => this.machineInput(e, dt)) : idleInput;
      super.step(dt, input, inputs);
      if (frozen || this.finished) return;
      if (this.bridge) this.updateCrossing();
      else this.updateFight(dt);
      this.cameraX += (this.cameraTarget() - this.cameraX) * (1 - Math.exp(-dt * 9));
    }
  }
  window.DispatchRun = DispatchRun;
})();
