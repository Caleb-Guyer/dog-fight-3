(() => {
  'use strict';

  const prefix = 'dogfight3-cg-versus-v71-';
  const channel = 'dogfight3-v71';
  const counterpickFeature = 'fighter-counterpick';
  const timeFeature = 'time-score-1';
  const roomFeature='room-rules-1';
  const rematchFeature='rematch-fighters-1';
  const dropFeature='air-item-drop-1';
  const heightFeature='closing-height-1';
  const driveFeature='aimed-drive-1';
  const pogoFeature='shield-pogo-1';
  const spaceFeature='ground-space-1';
  const resumeFeature='resume-inputs-1';
  const resumeChannel=channel+'-resume';
  const resumeTime=18000;
  function readRoomRules(msg){
    if(msg.length!==13 || msg[8]!==roomFeature || !['stock','time'].includes(msg[9]) ||
      !window.DogFight.validStockCount(msg[10]) || !window.DogFight.stockMinutes.includes(msg[11]) ||
      (msg[9]==='time' && !msg[11]) || typeof msg[12]!=='boolean')return null;
    return {timed:msg[9]==='time',lives:msg[10],minutes:msg[11],fetch:msg[12],bestOfThree:msg[6]===2,stageForm:msg[7]};
  }
  const validTime = minutes => [1,3,7].includes(minutes);
  const quickId = prefix + 'quickplay';
  const roomAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buttons = ['jump', 'attack', 'smash', 'special', 'shield', 'grab', 'aimStick', 'tiltMode', 'shortHop', 'quickAttack'];
  const axes = ['x', 'y', 'grabX', 'smashX', 'smashY', 'airDodgeX', 'airDodgeY'];
  const predictionLimit = 8;
  const historySize=predictionLimit*2+2;
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
    constructor(side, round, send, config, seed, keepInputs) {
      this.side = side;
      this.round = round;
      this.send = send;
      this.confirmedWorld = new window.DogFight.Battle(config, silent, seededRandom(seed));
      this.pending = [];
      this.sent=keepInputs?new Array(historySize):null;
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
    inputsFrom(first){
      if(!this.sent || !Number.isSafeInteger(first) || first<Math.max(0,this.frame-historySize) || first>this.frame)return null;
      return Array.from({length:this.frame-first},(_,i)=>this.sent[(first+i)%historySize]);
    }
    step(world, mine, other, emit) {
      const previous = world.emit;
      world.emit = emit;
      try {
        const first = this.side === 0 ? mine : other;
        const second = this.side === 0 ? other : mine;
        const a=unpack(first), b=unpack(second);
        if (world===this.confirmedWorld) this.onConfirmedInput?.(world,a,b);
        world.step(1 / 60, a, b);
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
      if(this.sent)this.sent[this.frame%historySize]=mine;
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
      this.stopRecovery();
      this.roomTicket=null;
      this.phase = 'idle';
      this.disposePeer(true);
      this.link = this.match = this.series = null;
      this.offer=null;this.accepted=false;
      if (message) this.events.closed(message);
    }
    start(action, kind, code = '', openingStage = '', bestOfThree = false, form = 'original', coat = 0, timeMinutes = 0, rules = null) {
      this.close();
      if (!fighter(kind) || !['create', 'join', 'quick'].includes(action)) return;
      if (action === 'join' && !validCode(code)) return this.events.closed('Enter the six-character room code.');
      if (!window.Peer || !window.RTCPeerConnection || navigator.onLine === false)
        return this.events.closed('Online play needs an internet connection and a browser with WebRTC.');
      this.action = action;
      this.roomSet = action === 'create' && bestOfThree;
      this.timeMinutes = action === 'create' && validTime(timeMinutes) ? timeMinutes : 0;
      this.roomForm = action === 'create' && Object.hasOwn(window.DogFight.stageForms,form) ? form : 'original';
      this.roomRules=action==='create' && rules?window.DogFight.versusRules(rules):null;
      this.customRound=false;
      if(this.roomRules){
        this.roomForm=this.roomRules.stageForm;this.roomSet=this.roomRules.bestOfThree;
        this.timeMinutes=this.roomRules.timed?this.roomRules.minutes:0;
      }
      this.openingStage = action === 'create' && Object.hasOwn(window.DogFight.arenas, openingStage) ? openingStage : '';
      this.kind = kind;
      this.coat = window.DogFight.validCoat(coat) ? coat : 0;
      this.remoteCoat = 0;
      this.fighterPicks = false;
      this.rematchPicks = false;
      this.itemDrops=false;
      this.closingHeight=false;
      this.shieldPogo=false;
      this.aimedDrive=false;
      this.groundSpace=false;
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
        if (this.peer !== peer || !host || this.pending.size >= 8) return conn.close();
        if(conn.label===resumeChannel && this.roomTicket && conn.peer===this.opponentId)return this.useConnection(peer,conn,true,true);
        if(conn.label!==channel)return conn.close();
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
    useConnection(peer, conn, host, restoring=false, attempt=0) {
      if (!host && !restoring) this.itemDrops=this.closingHeight=this.shieldPogo=this.aimedDrive=this.groundSpace=false;
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
        if(!host && restoring){
          if(this.recovery?.dial!==conn)return conn.close();
          return conn.send(['resume',this.roomTicket,this.round,attempt,this.match.received]);
        }
        if (!host) conn.send(this.action === 'join' ? ['join',this.kind,this.coat,counterpickFeature,timeFeature,roomFeature,rematchFeature,dropFeature,heightFeature,pogoFeature,driveFeature,spaceFeature,resumeFeature] :
          ['join',this.kind,this.coat,rematchFeature,dropFeature,heightFeature,pogoFeature,driveFeature,spaceFeature]);
      });
      conn.on('data', (data) => {
        if (!current() || !Array.isArray(data)) return;
        if (conn === this.link) return this.receive(data);
        if(!this.pending.has(conn))return;
        if(restoring){
          const [type,ticket,round,sequence,first]=data;
          if(data.length!==5 || type!==(host?'resume':'resumed') || ticket!==this.roomTicket ||
              !this.canRecover() || round!==this.round || conn.peer!==this.opponentId ||
              this.recovery && Date.now()>=this.recovery.until || !Number.isSafeInteger(sequence) ||
              (host ? sequence<=this.resumeAttempt : sequence!==attempt || this.recovery?.dial!==conn))return conn.close();
          const missing=this.match.inputsFrom(first);
          if(!missing)return conn.close();
          const previous=this.link;
          this.stopRecovery();
          this.attach(conn,sequence);
          if(previous && previous!==conn)previous.close();
          if(host)this.send(['resumed',ticket,round,sequence,this.match.received]);
          missing.forEach((input,i)=>this.send(['input',round,first+i,input]));
          if(this.finished)this.send(['result',round,this.myResult]);
          if(this.link===conn && this.match){
            this.match.lastStep=performance.now();
            this.events.recovery?.(false);
          }
          return;
        }
        if (host && data[0] === 'join' && fighter(data[1])) {
          if (this.link || this.recovery) return reject('full');
          const rules=this.roomRules;
          this.customRound=!!rules && data[5]===roomFeature;
          if(rules && !this.customRound && (!rules.fetch || !rules.timed && (rules.lives!==3 || rules.minutes!==7))){
            this.status('room','Ask your opponent to reload the game to play these room rules.');return reject('rules-version');
          }
          if (this.timeMinutes && data[4] !== timeFeature) {
            this.status('room','Ask your opponent to reload the game to join this Time Battle.');
            return reject('rules-version');
          }
          this.remoteKind = data[1];
          this.remoteCoat = window.DogFight.validCoat(data[2]) ? data[2] : 0;
          this.fighterPicks = this.roomSet && data[3] === counterpickFeature && window.DogFight.validCoat(data[2]);
          this.rematchPicks = data[this.action === 'quick' ? 3 : 6] === rematchFeature && window.DogFight.validCoat(data[2]);
          this.itemDrops=data.includes(dropFeature) && window.DogFight.validCoat(data[2]);
          this.closingHeight=data.includes(heightFeature) && window.DogFight.validCoat(data[2]);
          this.aimedDrive=data.includes(driveFeature) && window.DogFight.validCoat(data[2]);
          this.groundSpace=data.includes(spaceFeature) && window.DogFight.validCoat(data[2]);
          this.shieldPogo=data.includes(pogoFeature) && window.DogFight.validCoat(data[2]);
          // Ordered delivery puts both players' colors in the opening match configuration.
          if (window.DogFight.validCoat(data[2])) {
            const reply=['coat',this.coat];
            if (this.fighterPicks) reply.push(counterpickFeature);
            if (this.itemDrops) reply.push(dropFeature);
            if (this.closingHeight) reply.push(heightFeature);
            if (this.shieldPogo) reply.push(pogoFeature);
            if (this.aimedDrive) reply.push(driveFeature);
            if (this.groundSpace) reply.push(spaceFeature);
            if(this.action==='create' && data.includes(resumeFeature)){
              this.roomTicket=crypto.randomUUID();
              reply.push(resumeFeature,this.roomTicket);
            }
            if (this.rematchPicks) reply.push(rematchFeature);
            conn.send(reply);
          }
          this.attach(conn);
          this.hostRound(this.customRound);
          if (this.action === 'quick') peer.disconnect();
        } else if (!host && !this.round && data[0] === 'coat' && window.DogFight.validCoat(data[1])) {
          this.remoteCoat = data[1];
          this.fighterPicks = this.action === 'join' && data[2] === counterpickFeature;
          this.rematchPicks = data.at(-1) === rematchFeature;
          this.itemDrops=data.includes(dropFeature);
          this.closingHeight=data.includes(heightFeature);
          this.aimedDrive=data.includes(driveFeature);
          this.groundSpace=data.includes(spaceFeature);
          this.shieldPogo=data.includes(pogoFeature);
          const key=data.indexOf(resumeFeature),ticket=data[key+1];
          if(this.action==='join' && key>=0 && typeof ticket==='string' && /^[0-9a-f-]{36}$/i.test(ticket))this.roomTicket=ticket;
        } else if (!host && this.action==='join' && !this.round && data[0]==='room-offer' && readRoomRules(data) && this.validStart(data)){
          this.remoteKind=data[2];this.offer=['start',...data.slice(1)];this.attach(conn);
          this.status('review','Review the host’s rules before starting.');
        } else if (!host && data[0] === 'start' && data[8]!==roomFeature && this.validStart(data)) {
          this.remoteKind = data[2];
          this.attach(conn);
          this.beginRound(data);
        } else if (!host && data[0] === 'rules-version') {
          this.close('Reload the game to join this room with its selected rules.');
        } else if (!host && data[0] === 'full') {
          if (this.action === 'quick') this.retryQuick();
          else this.close('That room already has two players.');
        }
      });
      const lost = () => {
        clearTimeout(timeout);
        const wasPending=this.pending.delete(conn);
        if (!current()) return;
        if(this.link===conn){
          if(this.canRecover())this.startRecovery();else this.opponentLeft('Your opponent disconnected.');
        }else if(restoring){
          if(this.recovery?.dial===conn)this.recovery.dial=null;
        }else if (wasPending && !host && !this.link && !this.recovery) {
          if (this.action === 'quick') this.retryQuick();
          else this.close('The room closed before the match started.');
        }
      };
      conn.on('close', lost);
      conn.on('error', lost);
    }
    attach(conn,sequence=0) {
      clearTimeout(this.timer);
      clearInterval(this.watch);
      this.pending.delete(conn);
      this.link = conn;
      this.resumeAttempt=sequence;
      this.opponentId=conn.peer;
      this.lastTraffic = Date.now();
      this.watch = setInterval(() => {
        if(this.canRecover() && Date.now()-this.lastTraffic>6500)return this.startRecovery();
        if (Date.now() - this.lastTraffic > 22000) return this.opponentLeft('Connection timed out.');
        this.send(['ping']);
      }, 3000);
    }
    canRecover(){
      return !!(this.roomTicket && this.match?.sent && this.peer && !this.peer.destroyed && (!this.finished || this.theirResult===null && !this.myVote));
    }
    stopRecovery(){
      if(this.recovery)clearInterval(this.recovery.timer);
      this.recovery=null;
    }
    startRecovery(){
      if(this.recovery)return;
      const recovery={until:Date.now()+resumeTime,dial:null,attemptAt:0};
      this.recovery=recovery;
      clearInterval(this.watch);
      const previous=this.link;
      this.link=null;
      previous?.close();
      this.events.recovery?.(true);
      const retry=()=>{
        if(this.recovery!==recovery)return;
        const now=Date.now(),peer=this.peer;
        if(now>=recovery.until || !peer || peer.destroyed)return this.opponentLeft('Could not reconnect to your opponent.');
        if(peer.disconnected){try{peer.reconnect();}catch{}return;}
        if(this.side!==1 || !peer.open || now-recovery.attemptAt<3500)return;
        recovery.attemptAt=now;
        recovery.dial?.close();
        try{
          const conn=peer.connect(this.opponentId,{label:resumeChannel,serialization:'json',reliable:true});
          recovery.dial=conn;
          if(conn)this.useConnection(peer,conn,false,true,++this.resumeAttempt);
        }catch{
          recovery.dial=null;
        }
      };
      recovery.timer=setInterval(retry,500);
      retry();
    }
    send(data) {
      if (this.link?.open) this.link.send(data);
    }
    opponentLeft(message) {
      if (this.action !== 'create' || !this.peer?.open) return this.close(message);
      this.stopRecovery();
      this.roomTicket=null;
      const conn = this.link;
      this.link = this.match = this.series = null;
      this.offer=null;this.accepted=this.customRound=false;
      this.round = 0;
      clearInterval(this.watch);
      if (conn) conn.close();
      this.status('room', message + ' Your room is open.');
    }
    get canRepick() {
      return !!this.rematchPicks && this.finished && (!this.series || this.series.champion !== null);
    }
    nextLineup() {
      if (!this.round || !this.roster) return null;
      if (this.canRepick) return this.roster.map((dog,i)=>this.readyPicks[i] || dog);
      if (!this.nextPick) return this.roster;
      return this.roster.map((dog,i)=>i===this.series?.picker ? this.nextPick : dog);
    }
    validStart(msg) {
      const form = msg[7] ?? 'original';
      const timed = msg.length === 10;
      const rules=readRoomRules(msg);
      if (timed && (this.action !== 'join' || msg[8] !== timeFeature || !validTime(msg[9]))) return false;
      if(rules && this.action!=='join')return false;
      if(this.round && (!!rules!==!!this.customRound ||
        (rules?Object.keys(rules).some(k=>rules[k]!==this.roomRules[k]):(timed?msg[9]:0)!==(this.timeMinutes||0))))return false;
      if (msg.length === 8 || timed || rules) {
        if (this.action === 'quick' || ![1,2].includes(msg[6]) ||
            typeof msg[7] !== 'string' || !Object.hasOwn(window.DogFight.stageForms,form)) return false;
      } else if (msg.length !== 6 && !(msg.length === 7 && msg[6] === 2)) return false;
      const series = msg[6] === 2;
      if (this.round && this.rematchPicks && (!this.finished || !this.myVote || !this.theirVote)) return false;
      if ((this.action === 'quick' && series) || (this.round && (series !== !!this.series || form !== this.roomForm))) return false;
      if (this.series && (!this.finished || !this.theirVote ||
          (this.series.champion === null && msg[4] !== this.nextStage))) return false;
      const lineup=this.nextLineup();
      const agreed=lineup ? msg[2]===lineup[0].kind && msg[3]===lineup[1].kind : fighter(msg[2]) && msg[3]===this.kind;
      return msg[1] === this.round + 1 && agreed &&
        typeof msg[4] === 'string' && Object.hasOwn(window.DogFight.arenas, msg[4]) &&
        Number.isInteger(msg[5]) && msg[5] >= 0 && msg[5] <= 0xffffffff;
    }
    hostRound(preview=false) {
      const seed = randomInt();
      const stages = Object.keys(window.DogFight.arenas);
      const opener = this.openingStage || stages[seed % stages.length];
      const stage = this.series ? (this.series.champion === null ? this.nextStage : opener) :
        this.round ? stages[(stages.indexOf(this.stage) + 1) % stages.length] : opener;
      const dogs=this.nextLineup()?.map(d=>d.kind) || [this.kind,this.remoteKind];
      const data = ['start', this.round + 1, ...dogs, stage, seed];
      if(this.customRound){
        const rules=this.roomRules;
        data.push(this.roomSet?2:1,this.roomForm,roomFeature,rules.timed?'time':'stock',rules.lives,rules.minutes,rules.fetch);
      }else if (this.timeMinutes) data.push(this.roomSet ? 2 : 1, this.roomForm || 'original', timeFeature, this.timeMinutes);
      else if (this.roomForm && this.roomForm !== 'original') data.push(this.roomSet ? 2 : 1, this.roomForm);
      else if (this.roomSet) data.push(2);
      if(preview){
        this.offer=data;this.send(['room-offer',...data.slice(1)]);
        this.status('room','Your opponent is reviewing the match.');return;
      }
      this.send(data);
      this.beginRound(data);
    }
    acceptRules(){
      if(this.phase!=='review' || this.side!==1 || !this.offer || this.accepted)return;
      this.accepted=true;this.send(['room-ready',this.offer[5]]);
      if(this.offer)this.status('ready','Ready. Starting the fight…');
    }
    get preview(){
      if(!this.offer)return null;
      return {p1:this.offer[2],p2:this.offer[3],stage:this.offer[4],rules:readRoomRules(this.offer)};
    }
    beginRound(data) {
      const [, round, p1, p2, stage, seed, firstTo, form = 'original', feature, minutes]=data;
      const rules=readRoomRules(data);
      const coats = this.nextLineup()?.map(d=>d.coat) || (this.side === 1 ? [this.remoteCoat,this.coat] : [this.coat,this.remoteCoat]);
      if (firstTo === 2) {
        if (!this.series || this.series.champion !== null) this.series = new window.DogFight.StockSet(stage);
        else if (!this.series.advance(stage)) return;
      }
      this.round = round;
      this.roster=[p1,p2].map((kind,i)=>({kind,coat:window.DogFight.coatFor(i,p1,p2,coats)}));
      this.stage = stage;
      this.roomForm = form;
      this.offer=null;this.accepted=false;this.customRound=!!rules;
      if(rules)this.roomRules=rules;
      this.timeMinutes = rules ? (rules.timed?rules.minutes:0) : feature === timeFeature && validTime(minutes) ? minutes : 0;
      this.myVote = this.theirVote = this.finished = false;
      this.readyPicks = [null,null];
      this.myResult = this.theirResult = null;
      this.nextStage = this.nextPick = this.earlyVote = undefined;
      this.phase = 'playing';
      const config = { mode: 'local', p1, p2, stage, form, coats, fetch: true };
      if (this.itemDrops===false) config.itemDrops=false;
      if (this.closingHeight===false) config.closingHeight=false;
      if (this.shieldPogo===false) config.shieldPogo=false;
      if (this.aimedDrive===false) config.aimedDrive=false;
      if (this.groundSpace===false) config.groundSpace=false;
      if(rules)Object.assign(config,{stockCount:rules.lives,minutes:rules.minutes,fetch:rules.fetch});
      if (this.timeMinutes) Object.assign(config, {timeBattle:true,minutes:this.timeMinutes});
      this.match = new RollbackMatch(this.side, round, (message) => this.send(message), config, seed,!!this.roomTicket);
      this.events.start(config, seededRandom(seed));
    }
    receive(msg) {
      this.lastTraffic = Date.now();
      if (msg[0] === 'leave') return this.opponentLeft('Your opponent left.');
      if (msg[0] === 'ping') return this.send(['pong']);
      if (msg[0] === 'pong') return;
      if(!this.round && this.offer){
        if(this.side===0 && msg.length===2 && msg[0]==='room-ready' && msg[1]===this.offer[5]){
          const start=this.offer;this.send(start);this.beginRound(start);
        }else if(this.side===1 && this.accepted && msg.length===this.offer.length && msg.every((v,i)=>v===this.offer[i]))this.beginRound(msg);
        return;
      }
      if (msg[0] === 'start' && this.side === 1 && this.myVote && this.validStart(msg))
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
        if (this.theirVote || ![2,3,4,5].includes(msg.length)) return;
        if ((this.series || this.rematchPicks) && !this.finished) {
          // Ordered peers can reach the same confirmed finish on different render frames.
          if (this.theirResult === 0 || this.theirResult === 1) this.earlyVote = msg;
          return;
        }
        if ((this.series || this.rematchPicks) && this.theirResult !== this.myResult) return;
        const repick = msg.length === 4;
        if (repick && !this.canRepick) return;
        const stage = repick ? undefined : msg[2], kind = repick ? msg[2] : msg[3], coat = repick ? msg[3] : msg[4];
        if (!this.validVote(1-this.side,stage,kind,coat)) return;
        this.keepPick(1-this.side,stage,kind,coat);
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
      this.series?.finish(winner, null, this.match?.confirmedWorld.matchCard);
      this.send(['result', this.round, winner]);
      if (this.earlyVote) {
        const msg = this.earlyVote;
        this.earlyVote = undefined;
        this.receive(msg);
      }
    }
    validVote(side, stage, kind, coat) {
      if (this.canRepick) return stage===undefined && ((kind===undefined && coat===undefined) ||
        (fighter(kind) && window.DogFight.validCoat(coat)));
      if(this.series?.picker!==side)return stage===undefined && kind===undefined && coat===undefined;
      if(typeof stage!=='string' || !Object.hasOwn(window.DogFight.arenas,stage))return false;
      if(kind===undefined && coat===undefined)return true;
      const winner=this.roster[1-side];
      return this.fighterPicks && fighter(kind) && window.DogFight.validCoat(coat) && (kind!==winner.kind || coat!==winner.coat);
    }
    keepPick(side,stage,kind,coat) {
      if (this.canRepick) {
        if (kind!==undefined) this.readyPicks[side]={kind,coat};
        return;
      }
      if (stage !== undefined) this.nextStage = stage;
      if (kind !== undefined) this.nextPick = {kind,coat};
    }
    rematch(stage,kind,coat) {
      if (!this.match || !this.finished || this.myVote || !this.validVote(this.side,stage,kind,coat)) return;
      this.keepPick(this.side,stage,kind,coat);
      this.myVote = true;
      const vote=['rematch',this.round];
      if(stage!==undefined)vote.push(stage);
      if(kind!==undefined)vote.push(kind,coat);
      this.send(vote);
      this.events.votes();
      if (!this.side && this.theirVote) this.hostRound();
    }
  }
  window.DogOnline = { OnlineSession, validCode, roomAlphabet };
})();
