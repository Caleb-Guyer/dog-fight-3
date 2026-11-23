(() => {
  'use strict';
  const { attackWindow } = window.DogFight;
  const smooth = (t) => t * t * (3 - 2 * t);
  // Wait at each landing so a runner can board from either bank.
  function shuttle(time, trip, wait) {
    const cycle = 2 * (trip + wait), t = time % cycle;
    if (t <= wait) return 0;
    if (t <= wait + trip) return smooth((t - wait) / trip);
    if (t <= 2 * wait + trip) return 1;
    return 1 - smooth((t - 2 * wait - trip) / trip);
  }
  class DispatchBridge {
    constructor(room, checkpoint) {
      this.room = room;
      this.signals = room.checkpoints[checkpoint - 1]?.signals || 0;
      this.raised = room.spans.map((_, i) => this.signals & (1 << i) ? 1 : 0);
      this.ferryIndex = room.terrain.length + room.spans.length;
      this.liftIndex = this.ferryIndex + 1;
      const eastBank = room.checkpoints[checkpoint - 1]?.x >= room.ferry.to;
      this.ferryTime = eastBank ? room.ferry.duration + 1.15 : 0;
      this.liftTime = 0;
      this.ferryStarted = false;
      this.liftStarted = false;
    }
    get nextSignal() {
      return this.room.signals.find((_, i) => !(this.signals & (1 << i)));
    }
    geometry(dt, rider) {
      const { terrain, spans, ferry, lift } = this.room;
      if (rider?.ground === this.ferryIndex) this.ferryStarted = true;
      if (rider?.ground === this.liftIndex) this.liftStarted = true;
      if (this.ferryStarted) this.ferryTime += dt;
      if (this.liftStarted) this.liftTime += dt;
      const x = ferry.from + (ferry.to - ferry.from) * shuttle(this.ferryTime, ferry.duration, 1.15);
      const y = lift.bottom + (lift.top - lift.bottom) * shuttle(this.liftTime, lift.duration, 0.9);
      return [...terrain, ...spans.map((p, i) => {
        if (this.signals & (1 << i)) this.raised[i] = Math.min(1, this.raised[i] + dt / 0.9);
        return { ...p, y: p.y + (1 - smooth(this.raised[i])) * 385 };
      }), { x1: x, x2: x + ferry.width, y: ferry.y, thin: true },
      { x1: lift.x1, x2: lift.x2, y, thin: true }];
    }
    objective(x) {
      if (!(this.signals & 1)) return this.room.signals[0].order;
      if (x < 1770) return 'Cross the west drawspan to Cable Dock.';
      if (x < 2830) return 'Board the cable ferry. Ride it to the far bank.';
      if (!(this.signals & 2)) return this.room.signals[1].order;
      return 'Cross the east drawspan to Bell Depot.';
    }
    strikeSignal(run) {
      const s = this.nextSignal;
      if (!s) return;
      const f = run.dogs[0], a = f.attack;
      let struck = false;
      if (a && !a.grabAttempt && !a.pummel && !a.throwSide && !a.projectile && !a.anchor && !a.charging) {
        const beat = attackWindow(a);
        if (a.time >= beat.start - 1e-8 && a.time < beat.start + beat.active) {
          const box = run.attackArea(f);
          struck = Math.abs(box.x - s.x) <= box.rx + 21 && Math.abs(box.y - s.y) <= box.ry + 24;
        }
      }
      if (struck || run.projectiles.some((p) => p.owner === 0 && Math.abs(p.x - s.x) < 35 && Math.abs(p.y - s.y) < 37)) {
        this.signals |= 1 << this.room.signals.indexOf(s);
        run.emit('dispatchSignal', { f, name: s.name });
      }
    }
    draw(ctx, terrain, left, width) {
      // Ink the actual moving collision surfaces, so their machinery stays attached to the deck.
      const room = this.room, ink = '#262439', iron = '#596575', brass = '#dda966', paper = '#ead3a1';
      const rect = (x, y, w, h, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
      };
      const inView = (x1, x2) => x2 >= left && x1 <= left + width;
      const { ferry, lift } = room;
      if (inView(ferry.from - 40, ferry.to + ferry.width + 50)) {
        const deck = terrain[this.ferryIndex], x = deck.x1, y = deck.y;
        for (const anchor of [ferry.from + 7, ferry.to + ferry.width - 7]) {
          rect(anchor - 7, y - 174, 14, 174, ink);
          rect(anchor - 4, y - 166, 4, 158, iron);
          rect(anchor - 13, y - 176, 26, 13, brass);
        }
        rect(ferry.from, y - 166, ferry.to - ferry.from + ferry.width, 5, ink);
        rect(ferry.from, y - 166, ferry.to - ferry.from + ferry.width, 2, paper);
        for (const offset of [19, ferry.width - 24]) {
          rect(x + offset, y - 165, 4, 163, ink);
          rect(x + offset - 5, y - 171, 14, 12, brass);
        }
        rect(x, y, ferry.width, 6, paper);
        rect(x + 5, y + 6, ferry.width - 10, 17, '#446b6c');
        for (let i = 11; i < ferry.width - 10; i += 21) rect(x + i, y + 11, 5, 4, brass);
      }
      if (inView(lift.x1 - 35, lift.x2 + 30)) {
        const deck = terrain[this.liftIndex];
        for (const rail of [lift.x1 + 8, lift.x2 - 16]) {
          rect(rail, lift.top - 55, 8, lift.bottom - lift.top + 66, ink);
          for (let y = lift.top - 41; y <= lift.bottom; y += 22) rect(rail + 2, y, 4, 6, iron);
        }
        rect(lift.x1 - 8, lift.top - 60, lift.x2 - lift.x1 + 16, 12, ink);
        rect(lift.x1 - 3, lift.top - 58, lift.x2 - lift.x1 + 6, 4, brass);
        rect(lift.x1, deck.y, lift.x2 - lift.x1, 5, paper);
        rect(lift.x1 + 4, deck.y + 5, lift.x2 - lift.x1 - 8, 15, '#9e644b');
        for (let x = lift.x1 + 14; x < lift.x2 - 5; x += 23) rect(x, deck.y + 9, 8, 5, brass);
      }
      room.spans.forEach((span, i) => {
        if (!inView(span.x1 - 10, span.x2 + 10)) return;
        const y = terrain[room.terrain.length + i].y;
        rect(span.x1, y, span.x2 - span.x1, 4, paper);
        for (let x = span.x1 + 6; x < span.x2 - 10; x += 26) rect(x, y + 7, 11, 5, brass);
      });
      room.signals.forEach((s, i) => {
        if (!inView(s.x - 25, s.x + 25)) return;
        const on = !!(this.signals & (1 << i)), dx = on ? 10 : -10;
        rect(s.x - 19, s.y + 12, 38, 25, ink);
        rect(s.x - 15, s.y + 17, 30, 15, iron);
        for (let k = 0; k <= 5; k++) rect(s.x + k * dx / 5 - 3, s.y + 16 - k * 4, 7, 6, paper);
        rect(s.x + dx - 9, s.y - 15, 18, 16, ink);
        rect(s.x + dx - 6, s.y - 12, 12, 10, on ? '#79d6a9' : '#ffb458');
      });
    }
  }
  window.DispatchBridge = DispatchBridge;
})();
