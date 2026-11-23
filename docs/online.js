(() => {
  'use strict';

  const prefix = 'dogfight3-cg-versus-v1-';
  const quickId = prefix + 'quickplay';
  const roomAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buttons = ['jump', 'attack', 'smash', 'special', 'shield', 'grab'];
  const axes = ['x', 'y', 'grabX', 'smashX', 'smashY', 'airDodgeX', 'airDodgeY'];
  const lead = 12;
  const fighter = (kind) => typeof kind === 'string' && Object.hasOwn(window.DogFight.fighters, kind);
  const validCode = (value) => typeof value === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(value);
  const randomInt = () => crypto.getRandomValues(new Uint32Array(1))[0];
  const roomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => roomAlphabet[n % 32]).join('');

  function pack(input) {
    const values = axes.map((key) => Math.round(Math.max(-1, Math.min(1, input[key] || 0)) * 127));
    for (const state of [input, input.tapped || {}])
      values.push(buttons.reduce((bits, key, i) => bits | (state[key] ? 1 << i : 0), 0));
    return values;
  }
  function unpack(values) {
    if (!Array.isArray(values) || values.length !== 9 || !values.every((v, i) =>
      Number.isInteger(v) && (i < 7 ? Math.abs(v) <= 127 : v >= 0 && v <= 63))) return null;
    const input = { tapped: {} };
    axes.forEach((key, i) => { input[key] = values[i] / 127; });
    buttons.forEach((key, i) => {
      input[key] = !!(values[7] & (1 << i));
      input.tapped[key] = !!(values[8] & (1 << i));
    });
    return input;
  }
  function seededRandom(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  // Both simulations consume exactly the same numbered inputs, including one-frame taps.
  class MatchFrames {
    constructor(side, round, send) {
      this.side = side;
      this.round = round;
      this.send = send;
      this.local = [];
      this.remote = [];
      this.frame = this.sent = this.received = 0;
      this.lastStep = performance.now();
    }
    receive(number, values) {
      if (number !== this.received || this.remote.length >= lead * 2 + 2) return false;
      const input = unpack(values);
      if (!input) return false;
      this.remote.push(input);
      this.received++;
      return true;
    }
    tick(readInput, world) {
      if (this.local.length < lead) {
        const values = pack(readInput());
        this.local.push(unpack(values));
        this.send(['input', this.round, this.sent++, values]);
      }
      const ready = Math.min(this.local.length, this.remote.length);
      // Drain a short backlog after a delayed packet without making all later inputs feel late.
      const steps = ready >= 4 ? 2 : Math.min(1, ready);
      for (let i = 0; i < steps && world.end === null; i++) {
        const mine = this.local.shift(), other = this.remote.shift();
        world.step(1 / 60, this.side ? other : mine, this.side ? mine : other);
        this.frame++;
        this.lastStep = performance.now();
      }
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
      this.link = this.match = null;
      if (message) this.events.closed(message);
    }
    start(action, kind, code = '') {
      this.close();
      if (!fighter(kind) || !['create', 'join', 'quick'].includes(action)) return;
      if (action === 'join' && !validCode(code)) return this.events.closed('Enter the six-character room code.');
      if (!window.Peer || !window.RTCPeerConnection || navigator.onLine === false)
        return this.events.closed('Online play needs an internet connection and a browser with WebRTC.');
      this.action = action;
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
          const conn = peer.connect(address, { label: 'dogfight3-v1', serialization: 'json', reliable: true });
          if (!conn) return this.close('Could not open a connection. Try again.');
          this.useConnection(peer, conn, false);
          this.later(15000, () => {
            if (quick && ++this.attempts < 3) this.retryQuick();
            else this.close('Could not reach the other player. Try another room or network.');
          });
        }
      });
      peer.on('connection', (conn) => {
        if (this.peer !== peer || !host || conn.label !== 'dogfight3-v1' || this.pending.size >= 8) return conn.close();
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
      this.link = this.match = null;
      this.round = 0;
      clearInterval(this.watch);
      if (conn) conn.close();
      this.status('room', message + ' Your room is open.');
    }
    validStart(msg) {
      return msg.length === 6 && msg[1] === this.round + 1 && fighter(msg[2]) && msg[3] === this.kind &&
        ['picnic', 'laundry'].includes(msg[4]) && Number.isInteger(msg[5]) && msg[5] >= 0 && msg[5] <= 0xffffffff;
    }
    hostRound() {
      const seed = randomInt();
      const stage = this.round ? (this.stage === 'picnic' ? 'laundry' : 'picnic') : (seed % 2 ? 'picnic' : 'laundry');
      const data = ['start', this.round + 1, this.kind, this.remoteKind, stage, seed];
      this.send(data);
      this.beginRound(data);
    }
    beginRound([, round, p1, p2, stage, seed]) {
      this.round = round;
      this.stage = stage;
      this.myVote = this.theirVote = this.finished = false;
      this.myResult = this.theirResult = null;
      this.phase = 'playing';
      this.match = new MatchFrames(this.side, round, (message) => this.send(message));
      this.events.start({ mode: 'local', p1, p2, stage, fetch: true }, seededRandom(seed));
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
        this.theirVote = true;
        this.events.votes();
        if (!this.side && this.myVote) this.hostRound();
      }
    }
    finish(winner) {
      if (this.finished) return;
      this.finished = true;
      this.myResult = winner;
      this.send(['result', this.round, winner]);
      if (this.theirResult !== null && this.theirResult !== winner)
        this.close('The match results did not agree. Find another match.');
    }
    rematch() {
      if (!this.match || !this.finished || this.myVote) return;
      this.myVote = true;
      this.send(['rematch', this.round]);
      this.events.votes();
      if (!this.side && this.theirVote) this.hostRound();
    }
  }
  window.DogOnline = { OnlineSession, validCode };
})();
