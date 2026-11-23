(() => {
  'use strict';
  const { Battle, idleInput, clamp } = window.DogFight;
  const { rooms } = window.DispatchScript;
  const machines = {
    clipper: { name: 'Ticket Clipper', width: 26, height: 64, weight: 1.65, speed: 151, reach: 59, windup: 0.53, damage: 6 },
    puncher: { name: 'Punch Press', width: 23, height: 53, weight: 1.36, speed: 206, reach: 82, windup: 0.39, damage: 4 },
    porter: { name: 'Baggage Porter', width: 34, height: 58, weight: 2.1, speed: 133, reach: 80, windup: 0.79, damage: 7 },
    conductor: { name: 'Copper Hound', width: 54, height: 107, weight: 3.8, speed: 156, reach: 106, windup: 0.74, damage: 13 },
  };
  function phase(enemy, name, duration) {
    enemy.phase = name;
    enemy.time = 0;
    enemy.duration = duration;
  }
  class DispatchRun extends Battle {
    constructor({ room = 0, checkpoint = 0, hero = 'pip', stamps = 0 }, emit = () => {}) {
      const script = rooms[room], saved = script.checkpoints[checkpoint - 1];
      const bridge = script.signals ? new window.DispatchBridge(script, checkpoint) : null;
      const layout = bridge ? { ...script, terrain: bridge.geometry(0) } : script;
      super({ stage: 'dispatch', layout, mode: 'adventure', p1: hero, p2: 'brisket', fetch: false }, emit);
      this.roomIndex = room;
      this.hp = this.maxHP = 64;
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
    setCameraWidth(width) {
      if (width === this.cameraWidth) return;
      this.cameraWidth = width;
      this.cameraX = this.cameraTarget();
    }
    get objective() {
      if (this.bridge) return this.bridge.objective(this.dogs[0].x);
      const left = this.foes.filter((e) => e.hp > 0).length;
      if (this.layout.id === 'exchange')
        return left ? 'Wave ' + (this.wave + 1) + ' of ' + this.layout.waves.length + ' · ' + left + (left === 1 ? ' machine left' : ' machines left')
          : 'Sorting floor clear';
      if (this.layout.id === 'alley')
        return (this.wave ? 'Last cage guard' : 'First cage guard') + ' · Free Noodle.';
      return this.layout.objective;
    }
    cpuControlled(f) {
      return f.encounter?.kind === 'brisket';
    }
    opponents(f) {
      if (f.index) return f.absent ? [] : [this.dogs[0]];
      return this.foes.filter((e) => e.hp > 0).map((e) => e.f);
    }
    separateGroundedFighters() {
      const bodies = [this.dogs[0], ...this.opponents(this.dogs[0])];
      for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++) super.separateGroundedFighters(bodies[i], bodies[j]);
    }
    park(f) {
      Object.assign(f, { absent: true, attack: null, ground: -1, x: -4096, y: 0, respawning: Infinity, invuln: Infinity });
    }
    startWave() {
      const hero = this.dogs[0], layout = this.layout;
      this.foes = layout.waves[this.wave].map((spec, i) => {
        const index = i + 1, f = this.dogs[index] || { kind: 'brisket', index, stocks: 1 };
        this.dogs[index] = f;
        this.spawn(f, false);
        f.absent = false;
        f.x = spec.x;
        // Returning enemies enter away from the runner, including after a corner finish.
        if (this.wave && Math.abs(f.x - hero.x) < 130) {
          const surface = this.terrain[0];
          f.x = clamp(hero.x + (hero.x < layout.length / 2 ? 195 : -195), surface.x1 + 42, surface.x2 - 42);
        }
        f.face = f.x < hero.x ? 1 : -1;
        const body = machines[spec.kind];
        if (body) f.stats = { ...f.stats, ...body };
        const e = { kind: spec.kind, hp: spec.hp, maxHP: spec.hp, f, spec, phase: 'approach', time: 0,
          duration: 1, cycle: 0, move: 'stamp', face: f.face, spent: false, hurt: 0, jumpHold: 0 };
        f.encounter = e;
        this.emit('machineStart', { f, kind: e.kind });
        return e;
      });
      this.dogs.length = this.foes.length + 1;
    }
    knockouts(out) {
      for (const f of out) {
        if (!f.index) this.finished = 'fallen';
        else if (f.encounter) {
          f.encounter.hp = 0;
          // A ring-out can happen outside the visible stage. Leave the body there.
          f.vx = f.vy = 0;
          f.ground = -1;
        }
      }
    }
    dealDamage(target, amount, preserveCombo) {
      const e = target.encounter;
      const scale = e?.kind === 'conductor' ? (e.phase === 'stun' ? 1.4 : 0.46) : 1;
      const applied = super.dealDamage(target, Math.round(amount * scale * 10) / 10, preserveCombo);
      if (e) {
        e.hp = Math.max(0, e.hp - applied);
        e.hurt = 0.13;
        if (machines[e.kind]) target.damage = Math.min(target.damage, 45);
      } else if (target.index === 0) this.hp = Math.max(0, this.hp - applied);
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
      if (e.hp <= 0) return idleInput;
      if (kind === 'brisket') return this.cpu(dt);
      if (f.grip) return idleInput;
      if (f.ledge) return { ...idleInput, x: f.ledge.left ? 1 : -1, jump: true };
      e.jumpHold = Math.max(0, e.jumpHold - dt);
      if (f.floorAction?.type === 'downed') return { ...idleInput, jump: true };
      if (f.stun > 0 || f.floorAction || f.ground < 0) return e.jumpHold ? { ...idleInput, jump: true } : idleInput;
      const body = machines[kind], boss = kind === 'conductor', dx = hero.x - f.x;
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
        const rush = kind === 'porter' || (boss && e.cycle % 2 === 1);
        const reach = rush ? (boss ? 475 : 235) : body.reach + 23;
        if (Math.abs(dx) > reach) {
          f.stats.speed = body.speed;
          return { ...idleInput, x: e.face };
        }
        e.move = rush ? 'charge' : 'stamp';
        e.spent = false;
        phase(e, 'windup', boss && rush ? 0.93 : body.windup);
        this.emit('machineWindup', { f, kind, move: e.move });
      } else if (e.phase === 'windup' && e.time >= e.duration) {
        phase(e, 'strike', e.move === 'charge' ? (boss ? 0.62 : 0.46) : 0.2);
        this.emit('machineSwing', { f, kind, move: e.move });
      } else if (e.phase === 'strike' && e.time >= e.duration) {
        e.cycle++;
        phase(e, 'stun', boss ? (e.hp < e.maxHP / 2 ? 0.75 : 1.05) : kind === 'puncher' ? 0.48 : 0.8);
      } else if (e.phase === 'stun' && e.time >= e.duration) phase(e, 'approach', 1);
      f.face = e.face;
      if (e.phase === 'strike' && e.move === 'charge') {
        f.stats.speed = boss ? 555 : 458;
        return { ...idleInput, x: e.face };
      }
      return idleInput;
    }
    machineContact(e) {
      const { f, kind } = e, hero = this.dogs[0];
      if (e.phase !== 'strike' || e.spent || e.hp <= 0 || f.stun > 0 || f.grip || f.ground < 0) return;
      const body = machines[kind], boss = kind === 'conductor', rush = e.move === 'charge';
      const dx = (hero.x - f.x) * e.face;
      if (dx < (rush ? -36 : -12) - hero.stats.width ||
          dx > (boss && rush ? 64 : body.reach) + hero.stats.width ||
          hero.y - hero.stats.height > f.y + 6 || hero.y < f.y - (boss ? 73 : body.height - 10)) return;
      e.spent = true;
      this.hit(hero, f, boss && rush ? 10 : body.damage, boss ? 170 : 100, 1.05, 0,
        boss ? 'heavy' : 'jab', e.face, { x: hero.x, y: hero.y - hero.stats.height * 0.55 },
        { angle: rush ? 24 : 42, hard: boss });
    }
    savePoint() {
      this.checkpoint++;
      this.hp = this.maxHP;
      this.dogs[0].damage = 0;
      this.emit('dispatchCheckpoint', { f: this.dogs[0], checkpoint: this.checkpoint });
    }
    awardMark() {
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
      const hero = this.dogs[0], l = this.layout;
      for (const e of this.foes) {
        const { f } = e;
        if (e.hp > 0) {
          e.hurt = Math.max(0, e.hurt - dt);
          if (machines[e.kind]) {
            if (f.ground >= 0 && !f.grip) {
              const p = this.terrain[f.ground];
              if (!p.thin) f.x = clamp(f.x, p.x1 + f.stats.width, p.x2 - f.stats.width);
            }
            this.machineContact(e);
          }
        } else if (!f.absent) {
          if (e.phase !== 'defeat') {
            if (f.grip) this.breakGrapple(false);
            f.invuln = 2;
            f.attack = null;
            phase(e, 'defeat', 0.48);
            this.emit('machineDown', { f, kind: e.kind });
          }
          e.time += dt;
          if (e.time >= e.duration) this.park(f);
        }
      }
      if (l.id !== 'weighhouse') hero.x = clamp(hero.x, hero.stats.width, l.length - hero.stats.width);
      if (this.hp <= 0) { this.finished = 'fallen'; return; }
      if (this.foes.some((e) => !e.f.absent)) return;
      const last = this.wave + 1 === l.waves.length;
      this.waveWait += dt;
      if (this.waveWait < (last ? 0.25 : 0.85)) return;
      if (last) {
        this.awardMark();
        this.finished = 'exit';
        return;
      }
      this.wave++;
      this.waveWait = 0;
      if (l.checkpoints[this.checkpoint]?.wave === this.wave) this.savePoint();
      else this.hp = Math.min(this.maxHP, this.hp + 8);
      this.startWave();
      this.emit('dispatchWave', { f: hero, wave: this.wave + 1 });
    }
    step(dt, input = idleInput) {
      if (this.finished) return;
      const frozen = this.hitStop > 0;
      if (this.bridge && !frozen) this.layout.terrain = this.bridge.geometry(dt, this.dogs[0]);
      const inputs = this.foes.length && !frozen ? this.foes.map((e) => this.machineInput(e, dt)) : idleInput;
      super.step(dt, input, inputs);
      if (frozen || this.finished) return;
      if (this.hp <= 0) { this.finished = 'fallen'; return; }
      if (this.bridge) this.updateCrossing();
      else this.updateFight(dt);
      this.cameraX += (this.cameraTarget() - this.cameraX) * (1 - Math.exp(-dt * 9));
    }
  }
  window.DispatchRun = DispatchRun;
})();
