(() => {
  'use strict';
  const { Battle, idleInput, clamp, attackWindow } = window.DogFight;
  const { rooms } = window.DispatchScript;
  const stamina = 64;
  const names = { clipper: 'Ticket Clipper', conductor: 'Copper Hound' };
  class DispatchRun extends Battle {
    constructor({ room = 0, midway = false, hero = 'pip', stamps = 0 }, emit = () => {}) {
      const layout = rooms[room];
      super({ stage: 'dispatch', layout, mode: 'adventure', p1: hero, p2: 'brisket', fetch: false }, emit);
      this.roomIndex = room;
      this.hp = stamina;
      this.maxHP = stamina;
      this.stamps = stamps;
      this.checkpointLit = midway;
      this.signalOn = false;
      this.finished = '';
      this.enemy = null;
      this.wave = midway ? layout.encounters.filter((e) => e.gate < layout.checkpoint).length : 0;
      const f = this.dogs[0];
      if (midway) {
        f.x = layout.checkpoint;
        f.ground = this.floorAt(f.x);
        f.y = this.terrain[f.ground].y;
      }
      this.cameraWidth = 1200;
      this.cameraX = this.cameraTarget();
      this.parkOpponent();
    }
    cameraTarget() {
      const travel = this.layout.length - this.cameraWidth;
      return travel <= 0 ? travel / 2 : clamp(this.dogs[0].x - this.cameraWidth * 0.365, 0, travel);
    }
    setCameraWidth(width) {
      if (width === this.cameraWidth) return;
      this.cameraWidth = width;
      this.cameraX = this.cameraTarget();
    }
    floorAt(x) {
      return this.terrain.findIndex((p) => !p.thin && x >= p.x1 && x <= p.x2);
    }
    parkOpponent() {
      const f = this.dogs[1];
      Object.assign(f, { absent: true, ground: -1, x: -4096, y: 0, respawning: Infinity, invuln: Infinity });
    }
    get gateX() {
      return this.layout.encounters[this.wave]?.gate ?? this.layout.signal?.gate ?? this.layout.exit;
    }
    get gateClosed() {
      return this.wave < this.layout.encounters.length || (!!this.layout.signal && !this.signalOn);
    }
    get objective() {
      if (this.enemy?.hp > 0) return this.layout.combat;
      if (this.layout.signal && !this.signalOn && this.wave >= this.layout.encounters.length)
        return 'Strike the amber signal on the high platform.';
      return this.gateClosed ? this.layout.objective : this.layout.exitHint;
    }
    setPhase(phase, duration) {
      Object.assign(this.enemy, { phase, time: 0, duration });
    }
    spawnMachine(spec) {
      const f = this.dogs[1],
        boss = spec.kind === 'conductor';
      this.spawn(f, false);
      Object.assign(f, { absent: false, x: spec.x, ground: this.floorAt(spec.x), face: -1, jumps: 1 });
      f.y = this.terrain[f.ground].y;
      f.stats = {
        ...f.stats,
        name: names[spec.kind],
        width: boss ? 54 : 26,
        height: boss ? 107 : 64,
        weight: boss ? 3.8 : 1.65,
        speed: boss ? 132 : 145,
      };
      const maxHP = boss ? 84 : 20;
      this.enemy = {
        kind: spec.kind,
        hp: maxHP,
        maxHP,
        phase: 'approach',
        time: 0,
        duration: 1,
        cycle: 0,
        move: 'stamp',
        face: -1,
        spent: false,
        hurt: 0,
        spec,
      };
      this.emit('machineStart', { f });
    }
    knockouts(out) {
      if (out.includes(this.dogs[0])) this.finished = 'fallen';
      if (out.includes(this.dogs[1]) && this.enemy) {
        this.enemy.hp = 0;
        const f = this.dogs[1];
        f.x = this.enemy.spec.x;
        f.ground = this.floorAt(f.x);
        f.y = this.terrain[f.ground].y;
        f.vx = f.vy = 0;
      }
    }
    dealDamage(target, amount, preserveCombo) {
      const armored = target.index === 1 && this.enemy?.kind === 'conductor';
      const scale = armored ? (this.enemy.phase === 'stun' ? 1.4 : 0.46) : 1;
      const applied = super.dealDamage(target, Math.round(amount * scale * 10) / 10, preserveCombo);
      if (target.index === 0) this.hp = Math.max(0, this.hp - applied);
      else if (this.enemy) {
        this.enemy.hp = Math.max(0, this.enemy.hp - applied);
        this.enemy.hurt = 0.13;
        // Machine stamina and knockback are independent, including damage from a pummel.
        target.damage = Math.min(target.damage, 45);
      }
      return applied;
    }
    hit(target, ...args) {
      const planted =
        target.index === 1 && this.enemy?.kind === 'conductor' && target.ground >= 0 && !target.grip;
      const floor = target.ground,
        feet = target.y;
      const connected = super.hit(target, ...args);
      if (connected && planted) {
        // The locomotive stays on its wheels. Its raised lamp sets the real damage window.
        target.ground = floor;
        target.y = feet;
        target.vx = target.vy = target.stun = 0;
        target.tumble = target.floorAction = target.reaction = null;
      }
      return connected;
    }
    catchRival(owner, target, attack) {
      if (target.index === 1 && this.enemy?.kind === 'conductor' && this.enemy.phase !== 'stun') return;
      super.catchRival(owner, target, attack);
    }
    parry(target, owner, ...args) {
      super.parry(target, owner, ...args);
      if (owner.index === 1 && this.enemy?.kind === 'conductor') this.setPhase('stun', 1.25);
    }
    machineInput(dt) {
      const enemy = this.enemy,
        [hero, f] = this.dogs;
      if (!enemy || enemy.hp <= 0 || f.grip) return idleInput;
      const boss = enemy.kind === 'conductor',
        dx = hero.x - f.x,
        dist = Math.abs(dx);
      enemy.hurt = Math.max(0, enemy.hurt - dt);
      // Pausing the windup during hitstun makes a parry a real opening.
      if (f.stun > 0 || f.floorAction || f.ground < 0) return idleInput;
      enemy.time += dt;
      if (enemy.phase === 'approach') {
        enemy.face = dx < 0 ? -1 : 1;
        f.face = enemy.face;
        const next = boss && enemy.cycle % 2 === 1 ? 'charge' : 'stamp';
        const reach = next === 'charge' ? 480 : boss ? 138 : 83;
        if (dist > reach) {
          f.stats.speed = 155;
          return { ...idleInput, x: enemy.face };
        }
        enemy.move = next;
        enemy.spent = false;
        this.setPhase('windup', next === 'charge' ? 0.93 : boss ? 0.74 : 0.55);
        this.emit('machineWindup', { f, kind: enemy.kind, move: next });
      } else if (enemy.phase === 'windup' && enemy.time >= enemy.duration) {
        this.setPhase('strike', enemy.move === 'charge' ? 0.62 : 0.2);
        this.emit('machineSwing', { f, kind: enemy.kind, move: enemy.move });
      } else if (enemy.phase === 'strike' && enemy.time >= enemy.duration) {
        enemy.cycle++;
        this.setPhase('stun', boss ? (enemy.hp <= 42 ? 0.72 : 1.05) : 0.8);
      } else if (enemy.phase === 'stun' && enemy.time >= enemy.duration) this.setPhase('approach', 1);
      f.face = enemy.face;
      if (enemy.phase === 'strike' && enemy.move === 'charge') {
        f.stats.speed = 555;
        return { ...idleInput, x: enemy.face };
      }
      return idleInput;
    }
    machineContact() {
      const e = this.enemy,
        [hero, f] = this.dogs;
      if (!e || e.phase !== 'strike' || e.spent || e.hp <= 0 || f.stun > 0 || f.grip || f.ground < 0) return;
      const boss = e.kind === 'conductor',
        rush = e.move === 'charge';
      const dx = (hero.x - f.x) * e.face,
        low = hero.y,
        high = low - hero.stats.height;
      if (
        dx < (rush ? -45 : -12) - hero.stats.width ||
        dx > (boss ? (rush ? 64 : 106) : 58) + hero.stats.width ||
        high > f.y + 6 ||
        low < f.y - (rush ? 67 : boss ? 73 : 53)
      )
        return;
      e.spent = true;
      const damage = boss ? (rush ? 10 : 13) : 6;
      this.hit(
        hero,
        f,
        damage,
        boss ? 170 : 100,
        1.05,
        0,
        boss ? 'heavy' : 'jab',
        e.face,
        { x: hero.x, y: hero.y - hero.stats.height * 0.55 },
        { angle: rush ? 24 : 42, hard: boss },
      );
    }
    checkSignal() {
      const s = this.layout.signal,
        f = this.dogs[0],
        a = f.attack;
      if (!s || this.signalOn) return;
      let struck = false;
      if (a && !a.grabAttempt && !a.pummel && !a.throwSide) {
        const beat = attackWindow(a);
        if (a.time >= beat.start - 1e-8 && a.time < beat.start + beat.active) {
          const box = this.attackArea(f);
          struck = Math.abs(box.x - s.x) <= box.rx + 22 && Math.abs(box.y - s.y) <= box.ry + 26;
        }
      }
      if (!struck)
        struck = this.projectiles.some(
          (p) => p.owner === 0 && Math.abs(p.x - s.x) < 36 && Math.abs(p.y - s.y) < 38,
        );
      if (struck) {
        this.signalOn = true;
        this.emit('dispatchSignal', { f });
      }
    }
    step(dt, input = idleInput) {
      if (this.finished) return;
      const [hero, robot] = this.dogs,
        wasFrozen = this.hitStop > 0;
      const spec = this.layout.encounters[this.wave];
      if (!this.enemy && spec && hero.x >= spec.at) this.spawnMachine(spec);
      super.step(dt, input, wasFrozen ? idleInput : this.machineInput(dt));
      if (wasFrozen || this.finished) return;
      if (this.hp <= 0) {
        this.finished = 'fallen';
        return;
      }
      const e = this.enemy;
      if (e) {
        if (e.hp <= 0) {
          if (e.phase !== 'defeat') {
            if (this.grapple) this.breakGrapple(false);
            robot.invuln = 2;
            this.setPhase('defeat', 0.52);
            this.emit('machineDown', { f: robot, kind: e.kind });
          }
          e.time += dt;
          if (e.time >= e.duration) {
            this.enemy = null;
            this.wave++;
            this.parkOpponent();
          }
        } else {
          const floor = this.terrain[robot.ground];
          if (floor && !robot.grip) {
            const left = Math.max(floor.x1 + robot.stats.width, e.spec.at - 235),
              right = Math.min(floor.x2 - robot.stats.width, e.spec.gate - 15);
            if (left <= right) robot.x = clamp(robot.x, left, right);
          }
          this.machineContact();
          if (this.hp <= 0) {
            this.finished = 'fallen';
            return;
          }
        }
      }
      hero.x = clamp(
        hero.x,
        hero.stats.width,
        this.gateClosed ? this.gateX - hero.stats.width : this.layout.length - hero.stats.width,
      );
      if (
        !this.checkpointLit &&
        hero.x >= this.layout.checkpoint &&
        hero.y <= this.terrain[this.floorAt(this.layout.checkpoint)].y + 15 &&
        !this.enemy
      ) {
        this.checkpointLit = true;
        this.hp = stamina;
        hero.damage = 0;
        this.emit('dispatchCheckpoint', { f: hero });
      }
      const mark = this.layout.stamp,
        bit = 1 << this.roomIndex;
      if (
        !(this.stamps & bit) &&
        Math.hypot(hero.x - mark.x, hero.y - hero.stats.height * 0.52 - mark.y) < 46
      ) {
        this.stamps |= bit;
        this.emit('dispatchStamp', { f: hero });
      }
      this.checkSignal();
      if (!this.gateClosed && hero.ground >= 0 && hero.x >= this.layout.exit - 12) this.finished = 'exit';
      this.cameraX += (this.cameraTarget() - this.cameraX) * (1 - Math.exp(-dt * 9));
    }
  }
  window.DispatchRun = DispatchRun;
})();
