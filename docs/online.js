(() => {
  'use strict';

  const prefix = 'dogfight3-cg-versus-v62-';
  const channel = 'dogfight3-v62';
  const quickId = prefix + 'quickplay';
  const roomAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buttons = ['jump', 'attack', 'smash', 'special', 'shield', 'grab', 'aimStick', 'tiltMode', 'shortHop', 'quickAttack'];
  const axes = ['x', 'y', 'grabX', 'smashX', 'smashY', 'airDodgeX', 'airDodgeY'];
  const predictionLimit = 8;
  const fighter = (kind) => typeof kind === 'string' && Object.hasOwn(window.DogFight.fighters, kind);
  const validCode = (value) => typeof value === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(value);
  const randomInt = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const roomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => roomAlphabet[n % 32]).join('');

  function pack(input) {
    const values = axes.map((key) => Math.round(Math.max(-1, Math.min(1, input[key] || 0)) * 127) || 0);
    for (const state of [input, input.tapped || {}])
      values.push(buttons.reduce((bits, key, i) => bits | (state[key] ? 1 << i : 0), 0));
    return values;
  }
  function validInput(values) {
    return Array.isArray(values) && values.length === 9 && Array.from(values).every((v, i) =>
      Number.isInteger(v) && (i < 7 ? Math.abs(v) <= 127 : v >= 0 && v < (1 << buttons.length)));
  }
  function unpack(values) {
    const input = { tapped: {} };
    axes.forEach((key, i) => { input[key] = values[i] / 127; });
    buttons.forEach((key, i) => {
      input[key] = !!(values[7] & (1 << i));
      input.tapped[key] = !!(values[8] & (1 << i));
    });
    return input;
  }
  const { seededRandom, shieldDirection } = window.DogFight;

  function heldInput(values) {
    if (!values[8]) return values;
    const held = values.slice();
    held[8] = 0;
    return held;
  }

  const silent = () => {};
  const dodgeCues = new Set(['dodge', 'shieldRoll', 'spotDodge', 'ledgeRoll']);

  // The second Battle is a rolling checkpoint. Only it advances on two known inputs.
  class RollbackMatch {
    constructor(side, round, send, config, seed) {
      this.side = side;
      this.round = round;
      this.send = send;
      this.confirmedWorld = new window.DogFight.Battle(config, silent, seededRandom(seed));
      this.pending = [];
      this.remote = [];
      this.frame = this.confirmed = this.received = 0;
      this.prediction = pack({});
      this.lastHeld = 0;
      this.lastShieldAxis = '';
      this.cues = {};
      this.lastStep = performance.now();
    }
    receive(number, values) {
      if (number !== this.received || this.remote.length >= predictionLimit * 2 + 2 || !validInput(values)) return false;
      this.remote.push(values);
      this.received++;
      return true;
    }
    step(world, mine, other, emit) {
      const previous = world.emit;
      world.emit = emit;
      try {
        const first = this.side === 0 ? mine : other;
        const second = this.side === 0 ? other : mine;
        world.step(1 / 60, unpack(first), unpack(second));
      } finally {
        world.emit = previous;
      }
    }
    events(record, present, confirmed) {
      return (name, detail) => {
        if (detail.f?.index === this.side) {
          // An unreceived footstool can turn this air jump into a bounce or this dodge into a floor tech.
          // Movement stays predicted. Play the contact-dependent sound and particles once the reply arrives.
          if (!confirmed && record.nearHead && (name === 'jump' || dodgeCues.has(name))) return;
          let cue;
          if (name === 'jump') cue = record.cues.jump;
          else if (name === 'shieldRoll' || name === 'spotDodge') cue = record.cues.groundDodge;
          else if (dodgeCues.has(name)) cue = record.cues.shield;
          else if (name === 'special' || (name === 'recover' && detail.moveId && detail.moveId !== 'brisketCannon'))
            cue = record.cues.special;
          if (cue) {
            if (cue.played) return;
            cue.played = true;
            return present(name, detail);
          }
        }
        if (confirmed) present(name, detail);
      };
    }
    confirm(world) {
      let correction = false;
      while (this.pending.length && this.remote.length && this.confirmedWorld.end === null) {
        const record = this.pending.shift();
        const actual = this.remote.shift();
        if (actual.some((v, i) => v !== record.other[i])) correction = true;
        this.step(this.confirmedWorld, record.mine, actual, this.events(record, world.emit, true));
        this.prediction = heldInput(actual);
        this.confirmed++;
      }
      if (this.confirmedWorld.end !== null) {
        world.copyFightFrom(this.confirmedWorld);
        this.pending.length = this.remote.length = 0;
      } else if (correction) {
        world.copyFightFrom(this.confirmedWorld);
        for (const record of this.pending) {
          record.other = this.prediction;
          this.step(world, record.mine, record.other, silent);
        }
      }
    }
    advance(mine, world) {
      const pressed = (mine[7] & ~this.lastHeld) | mine[8];
      this.lastHeld = mine[7];
      const shieldBit = 1 << buttons.indexOf('shield');
      const axis = shieldDirection((mine[0] || mine[2])/127, mine[1]/127, this.lastShieldAxis);
      const shieldFlick = !!(mine[7] & shieldBit) && axis && axis !== this.lastShieldAxis;
      this.lastShieldAxis = axis;
      // Buffered actions can shift frames after a correction. Attach feedback to the physical press.
      if (pressed || shieldFlick) {
        this.cues = { ...this.cues };
        for (const key of ['jump', 'shield', 'special']) {
          if (pressed & (1 << buttons.indexOf(key))) this.cues[key] = { played: false };
        }
        if (pressed & shieldBit) this.cues.groundDodge = this.cues.shield;
        else if (shieldFlick) this.cues.groundDodge = { played:false };
      }
      const [a, b] = world.dogs;
      const nearHead = (a.ground < 0 || b.ground < 0) && Math.abs(a.x - b.x) <= a.stats.width + b.stats.width + 68 &&
        Math.abs(a.y - b.y) <= Math.max(a.stats.height, b.stats.height) + 95;
      const record = { mine, other: this.remote[0] || this.prediction, cues: this.cues, nearHead };
      this.pending.push(record);
      this.send(['input', this.round, this.frame++, mine]);
      this.step(world, mine, record.other, this.events(record, world.emit, false));
      if (this.remote.length) this.confirm(world);
    }
    tick(readInput, world) {
      if (this.confirmedWorld.end !== null) return;
      if (this.remote.length && this.pending.length) this.confirm(world);
      if (this.confirmedWorld.end !== null || this.pending.length >= predictionLimit) return;
      const mine = pack(readInput());
      // Close a clock gap after a stalled tab without consuming a second physical press.
      const catchUp = this.remote.length > 2;
      this.advance(mine, world);
      if (catchUp && this.confirmedWorld.end === null) this.advance(heldInput(mine), world);
      this.lastStep = performance.now();
    }
  }

  class OnlineSession {
    constructor(events) {
      this.events = events;
      this.peer = this.link = this.match = null;
      this.pending = new Set();
      this.phase = 'idle';
      this.timer = this.watch = 0;
    }
    status(phase, text) {
      this.phase = phase;
      this.events.status(phase, text, this.code);
    }
    later(ms, fn) {
      clearTimeout(this.timer);
      this.timer = setTimeout(fn, ms);
    }
    disposePeer(notify = false) {
      const peer = this.peer;
      this.peer = null;
      if (notify && this.link?.open) {
        try { this.link.send(['leave']); } catch {}
      }
      for (const c of this.pending) c.close();
      this.pending.clear();
      if (peer && !peer.destroyed) peer.destroy();
    }
    close(message = '') {
      clearTimeout(this.timer);
      clearInterval(this.watch);
      this.phase = 'idle';
      this.disposePeer(true);
      this.link = this.match = this.series = null;
      if (message) this.events.closed(message);
    }
    start(action, kind, code = '', openingStage = '', bestOfThree = false) {
      this.close();
      if (!fighter(kind) || !['create', 'join', 'quick'].includes(action)) return;
      if (action === 'join' && !validCode(code)) return this.events.closed('Enter the six-character room code.');
      if (!window.Peer || !window.RTCPeerConnection || navigator.onLine === false)
        return this.events.closed('Online play needs an internet connection and a browser with WebRTC.');
      this.action = action;
      this.roomSet = action === 'create' && bestOfThree;
      this.openingStage = action === 'create' && Object.hasOwn(window.DogFight.arenas, openingStage) ? openingStage : '';
      this.kind = kind;
      this.code = action === 'create' ? roomCode() : code;
      this.attempts = 0;
      this.round = 0;
      this.register(action !== 'join');
    }
    retryQuick() {
      this.disposePeer();
      this.status('search', 'Looking for another player…');
      this.later(180 + randomInt() % 650, () => this.register(true));
    }
    register(host) {
      this.disposePeer();
      this.side = host ? 0 : 1;
      const quick = this.action === 'quick';
      const address = quick ? quickId : prefix + 'room-' + this.code;
      this.status(quick ? 'search' : 'connecting', quick ? 'Looking for another player…' :
        host ? 'Opening your room…' : 'Joining room ' + this.code + '…');
      let peer;
      try {
        peer = new window.Peer(host ? address : prefix + 'guest-' + crypto.randomUUID(), { secure: true });
      } catch {
        return this.close('Your browser could not open an online connection.');
      }
      this.peer = peer;
      this.later(14000, () => this.close('The matchmaking service did not respond. Try again.'));
      peer.on('open', () => {
        if (this.peer !== peer) return;
        clearTimeout(this.timer);
        if (host) {
          this.status(quick ? 'search' : 'room', quick ? 'Looking for another player…' : 'Waiting for your opponent to join.');
        } else {
          const conn = peer.connect(address, { label: channel, serialization: 'json', reliable: true });
          if (!conn) return this.close('Could not open a connection. Try again.');
          this.useConnection(peer, conn, false);
          this.later(15000, () => {
            if (quick && ++this.attempts < 3) this.retryQuick();
            else this.close('Could not reach the other player. Try another room or network.');
          });
        }
      });
      peer.on('connection', (conn) => {
        if (this.peer !== peer || !host || conn.label !== channel || this.pending.size >= 8) return conn.close();
        this.useConnection(peer, conn, true);
      });
      peer.on('error', (error) => {
        if (this.peer !== peer || this.match) return;
        if (error.type === 'unavailable-id' && host) {
          if (quick) return this.register(false);
          if (++this.attempts < 5) { this.code = roomCode(); return this.register(true); }
        }
        if (error.type === 'peer-unavailable') {
          if (host) return;
          if (quick) return this.retryQuick();
          return this.close('No open room has that code. Check it with your friend.');
        }
        this.close('Could not connect to matchmaking. Try again.');
      });
      peer.on('disconnected', () => {
        if (this.peer === peer && !this.match) this.close('Lost contact with matchmaking. Try again.');
      });
    }
    useConnection(peer, conn, host) {
      this.pending.add(conn);
      const timeout = setTimeout(() => {
        if (this.pending.delete(conn)) conn.close();
      }, 18000);
      const current = () => this.peer === peer;
      const reject = (reason) => {
        conn.send([reason]);
        setTimeout(() => conn.close(), 200);
      };
      conn.on('open', () => {
        if (!current()) return conn.close();
        if (!host) conn.send(['join', this.kind]);
      });
      conn.on('data', (data) => {
        if (!current() || !Array.isArray(data)) return;
        if (conn === this.link) return this.receive(data);
        if (host && data[0] === 'join' && fighter(data[1])) {
          if (this.link) return reject('full');
          this.remoteKind = data[1];
          this.attach(conn);
          this.hostRound();
          if (this.action === 'quick') peer.disconnect();
        } else if (!host && data[0] === 'start' && this.validStart(data)) {
          this.remoteKind = data[2];
          this.attach(conn);
          this.beginRound(data);
        } else if (!host && data[0] === 'full') {
          if (this.action === 'quick') this.retryQuick();
          else this.close('That room already has two players.');
        }
      });
      const lost = () => {
        clearTimeout(timeout);
        this.pending.delete(conn);
        if (!current()) return;
        if (this.link === conn) this.opponentLeft('Your opponent disconnected.');
        else if (!host && !this.link) {
          if (this.action === 'quick') this.retryQuick();
          else this.close('The room closed before the match started.');
        }
      };
      conn.on('close', lost);
      conn.on('error', lost);
    }
    attach(conn) {
      clearTimeout(this.timer);
      this.pending.delete(conn);
      this.link = conn;
      this.lastTraffic = Date.now();
      this.watch = setInterval(() => {
        if (Date.now() - this.lastTraffic > 22000) return this.opponentLeft('Connection timed out.');
        this.send(['ping']);
      }, 3000);
    }
    send(data) {
      if (this.link?.open) this.link.send(data);
    }
    opponentLeft(message) {
      if (this.action !== 'create' || !this.peer?.open) return this.close(message);
      const conn = this.link;
      this.link = this.match = this.series = null;
      this.round = 0;
      clearInterval(this.watch);
      if (conn) conn.close();
      this.status('room', message + ' Your room is open.');
    }
    validStart(msg) {
      const series = msg.length === 7 && msg[6] === 2 && this.action !== 'quick';
      if ((msg.length !== 6 && !series) || (this.round && series !== !!this.series)) return false;
      if (this.series && (!this.finished || !this.theirVote ||
          (this.series.champion === null && msg[4] !== this.nextStage))) return false;
      return msg[1] === this.round + 1 && fighter(msg[2]) && msg[3] === this.kind &&
        typeof msg[4] === 'string' && Object.hasOwn(window.DogFight.arenas, msg[4]) &&
        Number.isInteger(msg[5]) && msg[5] >= 0 && msg[5] <= 0xffffffff;
    }
    hostRound() {
      const seed = randomInt();
      const stages = Object.keys(window.DogFight.arenas);
      const opener = this.openingStage || stages[seed % stages.length];
      const stage = this.series ? (this.series.champion === null ? this.nextStage : opener) :
        this.round ? stages[(stages.indexOf(this.stage) + 1) % stages.length] : opener;
      const data = ['start', this.round + 1, this.kind, this.remoteKind, stage, seed];
      if (this.roomSet) data.push(2);
      this.send(data);
      this.beginRound(data);
    }
    beginRound([, round, p1, p2, stage, seed, firstTo]) {
      if (firstTo === 2) {
        if (!this.series || this.series.champion !== null) this.series = new window.DogFight.StockSet(stage);
        else if (!this.series.advance(stage)) return;
      }
      this.round = round;
      this.stage = stage;
      this.myVote = this.theirVote = this.finished = false;
      this.myResult = this.theirResult = null;
      this.nextStage = this.earlyVote = undefined;
      this.phase = 'playing';
      const config = { mode: 'local', p1, p2, stage, fetch: true };
      this.match = new RollbackMatch(this.side, round, (message) => this.send(message), config, seed);
      this.events.start(config, seededRandom(seed));
    }
    receive(msg) {
      this.lastTraffic = Date.now();
      if (msg[0] === 'leave') return this.opponentLeft('Your opponent left.');
      if (msg[0] === 'ping') return this.send(['pong']);
      if (msg[0] === 'pong') return;
      if (msg[0] === 'start' && this.side === 1 && this.myVote && msg[2] === this.remoteKind && this.validStart(msg))
        return this.beginRound(msg);
      if (!this.match || msg[1] !== this.round) return;
      if (msg[0] === 'input' && !this.finished && !this.match.receive(msg[2], msg[3]))
        return this.close('The match lost synchronization. Find another match.');
      if (msg[0] === 'result') {
        this.theirResult = msg[2];
        if (this.finished && this.theirResult !== this.myResult)
          return this.close('The match results did not agree. Find another match.');
      }
      if (msg[0] === 'rematch') {
        if (this.theirVote || msg.length < 2 || msg.length > 3) return;
        if (this.series && !this.finished) {
          // Ordered peers can reach the same confirmed finish on different render frames.
          if (this.theirResult === 0 || this.theirResult === 1) this.earlyVote = msg;
          return;
        }
        if (this.series && this.theirResult !== this.myResult) return;
        if (!this.validVote(1-this.side, msg[2])) return;
        if (msg[2] !== undefined) this.nextStage = msg[2];
        this.theirVote = true;
        this.events.votes();
        if (!this.side && this.myVote) this.hostRound();
      }
    }
    finish(winner) {
      if (this.finished) return;
      this.finished = true;
      this.myResult = winner;
      if (this.theirResult !== null && this.theirResult !== winner)
        return this.close('The match results did not agree. Find another match.');
      this.series?.finish(winner);
      this.send(['result', this.round, winner]);
      if (this.earlyVote) {
        const msg = this.earlyVote;
        this.earlyVote = undefined;
        this.receive(msg);
      }
    }
    validVote(side, stage) {
      return this.series?.picker === side ? typeof stage === 'string' && Object.hasOwn(window.DogFight.arenas, stage)
        : stage === undefined;
    }
    rematch(stage) {
      if (!this.match || !this.finished || this.myVote || !this.validVote(this.side, stage)) return;
      if (stage !== undefined) this.nextStage = stage;
      this.myVote = true;
      this.send(stage === undefined ? ['rematch', this.round] : ['rematch', this.round, stage]);
      this.events.votes();
      if (!this.side && this.theirVote) this.hostRound();
    }
  }
  window.DogOnline = { OnlineSession, validCode };
})();
