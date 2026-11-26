(() => {
  'use strict';

  const fighters = {
    pip: {
      name: 'Pip',
      breed: 'Jack Russell',
      style: 'Speedster',
      move: 'Double Pounce',
      tip: 'Land a Side Special, then use Side Special again to spring after your rival.',
      speed: 390,
      jump: 690,
      weight: 0.86,
      reach: 57,
      height: 70,
      width: 23,
      color: '#ff8451',
    },
    brisket: {
      name: 'Brisket',
      breed: 'Bulldog',
      style: 'Heavyweight',
      move: 'Shoulder Charge',
      tip: 'Charge through a rival for a big launch. Leave room to skid to a stop.',
      speed: 275,
      jump: 626,
      weight: 1.23,
      reach: 64,
      height: 69,
      width: 31,
      color: '#83c9e8',
    },
    noodle: {
      name: 'Noodle',
      breed: 'Dachshund',
      style: 'Trickster',
      move: 'Tug Rope',
      tip: 'Snag a rival with Neutral Special. Up Special casts the rope at a nearby ledge.',
      speed: 322,
      jump: 650,
      weight: 0.96,
      reach: 70,
      height: 62,
      width: 29,
      color: '#54d6bb',
    },
    clover: {
      name: 'Clover',
      breed: 'Border collie',
      style: 'Playmaker',
      move: 'Round Trip',
      tip: 'Throw a returning disc, then herd your rival into its path home.',
      speed: 349,
      jump: 673,
      weight: 1,
      reach: 60,
      height: 77,
      width: 25,
      color: '#bb9af1',
    },
  };
  const arenas = {
    picnic: {
      name: 'Picnic Table',
      description: 'A broad tabletop with two raised platforms.',
      spawn: [397, 803],
    },
    laundry: {
      name: 'Laundry Line',
      description: 'Two rooftops and a basket that crosses the gap.',
      movingPlatform: 2,
      spawn: [355, 852],
    },
    bandstand: {
      name: 'Moonbell Bandstand',
      description: 'Two low wings lead to a high center platform over a narrow stage.',
      spawn: [380, 820],
    },
    nightmail: {
      name: 'Night Mail',
      description: 'One long mail-car roof. Land on the deck or recover along its sides.',
      spawn: [397, 803],
    },
    canal: {
      name: 'Canal Lock',
      description: 'Ride the cable ferry out past either end of the lock gate.',
      movingPlatform: 1,
      spawn: [397, 803],
    },
  };
  const stageForms = {
    original: {name:'Original'},
    flat: {name:'Flat', geometry:'nightmail', description:'One wide deck with no upper platforms.'},
    trio: {name:'Three platforms', geometry:'bandstand', description:'Two low platforms and a high center perch.'},
  };
  const stageGeometry = (stage, form) => stageForms[form]?.geometry || stage;
  const validCoat = value => Number.isInteger(value) && value >= 0 && value < 4;
  const validRelayTeams=teams=>Array.isArray(teams) && teams.length===2 && Array.from(teams).every(team=>
    Array.isArray(team) && team.length===3 && new Set(team).size===3 && Array.from(team).every(kind=>typeof kind==='string' && Object.hasOwn(fighters,kind)));
  function relayCoats(teams,book){
    const coats=teams.map((team,i)=>team.map(kind=>validCoat(book?.[i]?.[kind])?book[i][kind]:0));
    teams[1].forEach((kind,k)=>{
      const other=teams[0].indexOf(kind);
      if(other>=0)coats[1][k]=coatFor(1,kind,kind,[coats[0][other],coats[1][k]]);
    });
    return coats;
  }
  function coatFor(slot, first, second, choices) {
    const one = validCoat(choices?.[0]) ? choices[0] : 0;
    const two = validCoat(choices?.[1]) ? choices[1] : 0;
    return slot === 0 ? one : first === second && one === two ? (two + 1) % 4 : two;
  }
  const idleInput = Object.freeze({
    x: 0,
    y: 0,
    jump: false,
    shortHop: false,
    attack: false,
    smash: false,
    aimStick: false,
    special: false,
    shield: false,
    grab: false,
  });
  class StockSet {
    constructor(stage) {
      this.games = [{stage, winner:null}];
      this.score = [0, 0];
    }
    get current() { return this.games[this.games.length - 1]; }
    get openingRead() { return this.games[this.games.length - 2]?.rivalRead ?? null; }
    get champion() { return this.score.includes(2) ? this.score.indexOf(2) : null; }
    get picker() {
      return this.current.winner !== null && this.champion === null ? 1 - this.current.winner : null;
    }
    finish(winner, rivalRead, matchCard) {
      if (this.current.winner !== null || (winner !== 0 && winner !== 1)) return false;
      this.current.winner = winner;
      if (matchCard) this.current.card = structuredClone(matchCard);
      if (rivalRead) this.current.rivalRead = {...rivalRead};
      this.score[winner]++;
      return true;
    }
    advance(stage) {
      if (this.picker === null || !Object.hasOwn(arenas, stage)) return false;
      this.games.push({stage, winner:null});
      return true;
    }
    cpuPick(kind) {
      const choices = {
        pip:['bandstand','laundry'], brisket:['nightmail','picnic'],
        noodle:['laundry','canal'], clover:['nightmail','canal'],
      }[kind];
      return choices.find(stage => !this.games.some(game => game.stage === stage)) ||
        choices.find(stage => stage !== this.current.stage);
    }
  }
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const topBlastY = -172;
  const floorCrossing = (from, to, floor) => to === from ? 1 : clamp((floor - from) / (to - from), 0, 1);
  const crouchLaunchScale = 2 / 3;
  const rageScale = damage => 1 + .10 * clamp((damage - 35) / 115, 0, 1);
  const finishingLaunch = (move, name) => !move?.setupHit && !move?.second && !move?.pull && !move?.bounce && name !== 'snare';
  const launchStrength=(base,growth,damage,weight,power,rage)=>(base+damage*growth)*(.75+.25*power)*rage/weight;
  const launchStun=(speed,rage,move)=>Math.max(move?.stun || 0,clamp(.115+speed*.00036,.14,.58*rage));
  const canStayPlanted = (vx, vy) => Math.hypot(vx, vy) <= 150 && Math.abs(vy) <= 96;
  function groundedLift(move, grounded, speed, sweet) {
    if (!grounded || !move?.lowLaunch || sweet?.angle != null) return 1;
    return smoothStep(clamp((speed - 250) / 150, 0, 1));
  }
  const toward = (value, target, amount) => value + clamp(target - value, -amount, amount);
  const inputWindow = 7 / 60;
  // Convert the local control preference before recording or sending the regular Jump button.
  function applyFlickJump(state, input, vertical, gentle, freshUp = false) {
    const up = -vertical;
    const button = !!input.jump;
    const pressedButton = button && state.button === false;
    const shieldPress = input.shield && (!state.shield || input.tapped.shield);
    state.button = button;
    state.shield = input.shield;
    let flick = false;
    if (freshUp || up <= .32) {
      state.armed = true;
      state.travel = 0;
      state.held = false;
    }
    if (up < .5) state.held = false;
    if (up > .32 && state.armed) {
      if (gentle || shieldPress || input.attack || input.special || input.grab || input.smash || input.aimStick) {
        state.armed = false;
      } else if (up >= .68) {
        // A full diagonal on a circular stick has only .707 vertical travel.
        state.armed = false;
        state.held = flick = true;
      } else {
        state.travel++;
        if (state.travel >= 3) state.armed = false;
      }
    }
    input.jump = button || !!state.held;
    if (flick || (pressedButton && state.held)) input.tapped.jump = true;
  }
  const spotCounterLead = 4 / 60;
  // One second spent outside a dodge restores one level. Store game time so rollback and half speed agree.
  const dodgeWear = f => Math.ceil(Math.max(0, (f.dodgeFatigue || 0) - 1e-8));
  function dodgeTiming(f, frames, extra = 0) {
    const wear = dodgeWear(f), [total, first, last] = frames;
    return { wear, duration:(total + extra + 2*wear)/60, safeFrom:(first + wear)/60,
      safeUntil:(last + 1 - wear)/60 };
  }
  function spendDodge(f, frames, extra = 0) {
    const timing = dodgeTiming(f, frames, extra);
    f.dodgeFatigue = Math.min(3, timing.wear + 1);
    return timing;
  }
  const landingGrabFrames = 4;
  const landingCancelWindow = 7 / 60;
  const runStick = 0.55;
  const dashShieldReady = f => f.run && !f.run.turned && f.run.age + 1e-8 >= 3 / 60 &&
    f.vx * f.run.face > f.kit.footwork.walk;
  const pivotWindow = 7 / 60;
  const ledgeDriftGrace = 12 / 60;
  const hangingFeet = [0, -13, 46];
  const sameLedge = (a, b) => a && b && a.index === b.index && a.left === b.left;
  function smoothStep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function rollProgress(action, time) {
    return smoothStep((time - 2 / 60) / (action.duration - 8 / 60));
  }
  function rollDistance(f, action) {
    return action.distance ?? (65 + f.stats.speed * 0.15) * (action.type === 'techRoll' ? 1 : 0.88);
  }
  const tumbleSpeed = 430;
  const finalHitExtra = 12 / 60;
  const maxDI = (18 * Math.PI) / 180;
  const verticalLaunch = Math.sin(65 * Math.PI / 180);
  const stockMinutes = [1, 3, 7, 0];
  const validStockCount=n=>Number.isInteger(n) && n>=1 && n<=5;
  const validHandicap=pair=>Array.isArray(pair) && pair.length===2 && [pair[0],pair[1]].every(
    n=>Number.isInteger(n) && n>=0 && n<=150 && n%10===0);
  function versusRules(config={}){
    const timed=(config.timeBattle ?? config.timed)===true;
    const lives=config.stockCount ?? config.lives, form=config.form ?? config.stageForm;
    return {timed,lives:validStockCount(lives)?lives:3,
      ...(validHandicap(config.handicap) && config.handicap.some(Boolean)?{handicap:config.handicap.slice()}:{}),
      minutes:stockMinutes.includes(config.minutes) && (!timed || config.minutes)?config.minutes:timed?3:7,
      bestOfThree:config.bestOfThree===true,stageForm:Object.hasOwn(stageForms,form)?form:'original',fetch:config.fetch!==false};
  }
  const warmupPartners={stand:{title:'Stand still',tag:'DUMMY'},shield:{title:'Hold shield',tag:'SHIELD'},spar:{title:'Spar with CPU',tag:'CPU'}};
  const blastSideMargin = 115, bottomBlastY = 765;
  const blastZone = (x, y, width, inset = 0) => x < -blastSideMargin + inset ? 'left' : x > width + blastSideMargin - inset ? 'right' :
    y < topBlastY ? 'top' : y > bottomBlastY ? 'bottom' : '';
  function launchInfluence(vx, vy, input) {
    const speed = Math.hypot(vx, vy), stick = Math.hypot(input.x, input.y);
    if (!speed || stick <= 0.2) return { x: vx, y: vy, angle: 0, scale: 1 };
    const magnitude = Math.max(1, stick), x = input.x / magnitude, y = input.y / magnitude;
    const angle = maxDI * clamp((vx * y - vy * x) / speed, -1, 1);
    const dx = vx * Math.cos(angle) - vy * Math.sin(angle);
    const dy = vx * Math.sin(angle) + vy * Math.cos(angle);
    // Steep throws and meteors keep their speed. Analog diagonals share one circular range.
    const scale = Math.abs(dy) >= speed * verticalLaunch ? 1 : 1 - y * (y > 0 ? 0.08 : 0.095);
    return { x: dx * scale, y: dy * scale, angle, scale };
  }
  const octant = Math.PI / 4;
  const diagonal = Math.SQRT1_2;
  const shiftDirections = [
    [1, 0], [diagonal, diagonal], [0, 1], [-diagonal, diagonal],
    [-1, 0], [-diagonal, -diagonal], [0, -1], [diagonal, -diagonal],
  ];
  function shiftSector(input, previous = -1) {
    // grabX carries the full horizontal input even when a keyboard player holds Walk.
    const x = input.grabX || input.x || 0, y = input.y || 0, magnitude = Math.hypot(x, y);
    if (magnitude < 0.35) return -1;
    if (magnitude < 0.72) return previous;
    const angle = Math.atan2(y, x);
    // Keep a held analog stick from retriggering at an octant boundary.
    if (previous >= 0 && Math.cos(angle - previous * octant) > Math.cos(octant * 0.75)) return previous;
    return (Math.round(angle / octant) + 8) % 8;
  }
  const techWindow = 11 / 60;
  const techLockout = 28 / 60;
  const maxTechSpeed = 900;
  // Gravity alone cannot turn a fall into an untechable spike.
  function floorImpactSpeed(vy, downLaunch, time) {
    return Math.min(vy, (downLaunch || 0) * Math.pow(0.68, time));
  }
  const shieldDropTime = 10 / 60;
  const parryWindow = 5 / 60;
  const shieldGrabPenalty = 4 / 60;
  const jumpSquatTime = 3 / 60;
  const shortHopDamage = .85;
  const fastFallBufferFrames = 3;
  const liftArrival = 24 / 60, liftWait = 120 / 60;
  const liftReserve = time => clamp(96 - Math.round(Math.max(0, time - liftArrival) * 36), 24, 96);
  const protectionTime = f => Math.max(f.invuln || 0, f.respawning || 0, f.stockGuard || 0,
    f.shieldBreak?.phase === 'pop' ? 1/60 : 0);
  const shortCatchFrames = 15;
  const maxLedgeCatches = 6;
  const gripWarningFrames = 45;
  function ledgeHangLimit(f, previousCatches) {
    return Math.max(75, 240 - Math.min(120, Math.floor(f.damage)) - 18 * previousCatches);
  }
  function gripFramesLeft(f) {
    return (f.ledge.hangFrames ?? ledgeHangLimit(f, 0)) - Math.round(f.ledgeTime * 60);
  }
  function ledgeGuardFrames(f) {
    if (!f.ledgeProtectionReady) return 0;
    const airFrames = Math.round(f.airborneTime * 60);
    const flightBonus = clamp(Math.floor((airFrames - 8) / 2), 0, 30);
    return Math.max(6, shortCatchFrames + flightBonus - Math.floor(f.damage / 8));
  }
  const turnaroundWindow = 4, bReverseWindow = 3;
  const isReversalPractice = drill => drill?.pattern === 'reverse' || drill?.pattern === 'wavebounce';
  const isFootstoolPractice = drill => drill?.pattern === 'footstool' || drill?.pattern === 'footstoolTech';
  const cpuLevels = {
    rookie: { name: 'Rookie', tip: 'Leaves a beat between attacks. Practice spacing and whiff punishes.' },
    arcade: { name: 'Arcade', tip: 'Mixes approaches, combos and defensive counters.' },
    rival: { name: 'Rival', tip: 'Learns repeated spot-dodges after you block. Vary your escape.' },
  };
  function seededRandom(seed) {
    const next = () => {
      next.state = (Math.imul(next.state, 1664525) + 1013904223) >>> 0;
      return next.state / 4294967296;
    };
    next.state = seed >>> 0;
    return next;
  }
  // Total frames and initial invulnerability frames for each landing option.
  const floorFrames = {
    tech: [19, 13],
    techRoll: [29, 17],
    downed: [75, 0],
    floorRise: [23, 10],
    getupRoll: [34, 13],
    floorAttack: [null, 6], // Each dog's get-up attack supplies its own duration.
  };
  const attackHold = 0.21;
  const smashChargeTime = 1;
  const smashHoldLimit = 2;
  const aimFor = (y) => (y < -0.45 ? -1 : y > 0.45 ? 1 : 0);
  // Dodge frames are [total, first untouchable frame, last untouchable frame], at 60 Hz.
  const kits = {
    pip: {
      footwork: { walk: 174, burst: 198, acceleration: 1980, traction: 3600, tiltBrake: 2880, reverseFrames: 7 },
      defense: { rollDistance: 132, roll: [24, 2, 11], spot: [18, 2, 9] },
      // Air options add a fourth value for landing lag. Travel and ledge timing are in frames.
      airDodge: {
        neutral: [24, 2, 11, 6],
        directional: [34, 3, 13, 11],
        travel: [3, 16],
        distance: 118,
        ledgeFrame: 8,
        tip: 'Pip finishes his burst fastest. Save it for a late cut toward the ledge.',
      },
      ground: ['pipJab', 'pipCross', 'pipHeel'],
      tilts: { forward: 'pipStampKick', up: 'pipChinFlick', down: 'pipDewclaw' },
      dashAttack: 'pipGrassSkid',
      ledgeAttack: 'pipRailKick',
      floorAttack: 'getupSweep',
      ledgeClimb: { total: 26, lift: 12, plant: 19, protectedThrough: 23, distance: 19, crest: 8 },
      ledgeRoll: {
        label: 'Rail Tuck',
        total: 23,
        safe: [2, 12],
        plant: 6,
        arrive: 16,
        distance: 96,
        tip: 'Pip rolls just past a close guard. Tap Attack as he turns to jab first.',
      },
      grab: 'pipCollarTag',
      dashGrab: 'pipTagDash',
      pivotGrab: 'pipHeelHook',
      pummel: 'pipPawDrum',
      throws: { forward: 'pipKickoff', back: 'pipSlipTurn', up: 'pipPopFly', down: 'pipTumbleTrip' },
      smashes: { side: 'pipBoltKick', up: 'pipScissors', down: 'pipDustDevil' },
      specials: { neutral: 'pipBark', side: 'pipPounce', up: 'pipHopper', down: 'pipSlide' },
      recovery:
        'Aim Up + Special for the first hop. Release Special, then press Up + Special again while tilting toward the ledge to redirect the second hop.',
      air: {
        neutral: 'pipSpin',
        forward: 'pipDiveKick',
        back: 'pipBackKick',
        up: 'pipFlip',
        down: 'pipPogo',
      },
      style: 'Rush in, land two quick paws, then kick the rival out or jump after the second hit.',
      combo:
        'Tap Attack three times for Heel Kick. Tap once and hold the second Attack through Cross to start Speed Bag. Release for Bell Kick. For an aerial finish, press Jump, Forward and Attack together as Cross connects.',
      airAccel: 1060,
      airDrift: { speed: 314, brake: 1600, friction: 112 },
      wallKick: { rise:715, push:224, frames:5 },
      gravity: 1.0,
      fallSpeed: 630,
      fastFallSpeed: 855,
    },
    brisket: {
      footwork: { walk: 121, burst: 122, acceleration: 1580, traction: 1540, tiltBrake: 740, reverseFrames: 4 },
      defense: { rollDistance: 96, roll: [32, 4, 17], spot: [25, 3, 15] },
      airDodge: {
        neutral: [32, 4, 18, 8],
        directional: [45, 5, 20, 17],
        travel: [5, 23],
        distance: 96,
        ledgeFrame: 12,
        tip: 'Brisket travels the shortest distance and stays untouchable longest. Drift close before you commit.',
      },
      ground: ['brisketCheck', 'brisketLift'],
      tilts: { forward: 'brisketGateCheck', up: 'brisketCrownLift', down: 'brisketDoorstop' },
      dashAttack: 'brisketYardBuster',
      ledgeAttack: 'brisketPorchBump',
      floorAttack: 'brisketMatSlap',
      ledgeClimb: { total: 36, lift: 18, plant: 27, protectedThrough: 32, distance: 23, crest: 4 },
      ledgeRoll: {
        label: 'Porch Roll',
        total: 36,
        safe: [4, 19],
        plant: 10,
        arrive: 24,
        distance: 113,
        tip: 'Brisket takes longer to tuck his shoulder, then stays untouchable the longest.',
      },
      grab: 'brisketBearHug',
      shoulderCarry: { lift:8/60, rest:[-8,-77], walk:177, air:118, hop:582 },
      dashGrab: 'brisketFreightHug',
      pivotGrab: 'brisketGateSwing',
      pummel: 'brisketBearSqueeze',
      throws: {
        forward: 'brisketYardHeave',
        back: 'brisketSuplex',
        up: 'brisketPress',
        down: 'brisketSitSlam',
      },
      smashes: { side: 'brisketHaymaker', up: 'brisketRoofRaiser', down: 'brisketQuake' },
      specials: {
        neutral: 'brisketClinch',
        side: 'brisketCharge',
        up: 'brisketCannon',
        down: 'brisketBrace',
      },
      recovery:
        'Line up beside the ledge. Hold Up + Special to crouch, then release Special for a vertical launch. A longer charge climbs higher.',
      air: {
        neutral: 'brisketCurl',
        forward: 'brisketRam',
        back: 'brisketHip',
        up: 'brisketCrown',
        down: 'brisketDrop',
      },
      style:
        'Get close. A shoulder check sets up a heavy uppercut, and a belly drop punishes anyone underneath.',
      combo:
        'Tap Attack for Body Check. As the shoulder connects, tap Attack for Bell Ringer or press Grab for Bear Hug. Once you catch the rival, tap a direction to throw.',
      airAccel: 540,
      airDrift: { speed: 226, brake: 820, friction: 66 },
      gravity: 1.17,
      fallSpeed: 740,
      fastFallSpeed: 960,
    },
    noodle: {
      footwork: { walk: 144, burst: 151, acceleration: 1820, traction: 2180, tiltBrake: 1260, reverseFrames: 5 },
      crawl: {forward: 104, back: 72, height: 28},
      defense: { rollDistance: 150, roll: [30, 3, 15], spot: [22, 2, 12] },
      airDodge: {
        neutral: [28, 3, 14, 7],
        directional: [40, 4, 15, 14],
        travel: [4, 21],
        distance: 151,
        ledgeFrame: 10,
        tip: 'Noodle travels farthest. Start farther out when you want to catch the lip.',
      },
      ground: ['noodleTrip', 'noodleReel', 'noodleSnap'],
      tilts: { forward: 'noodleKnotPoke', up: 'noodleLoopLift', down: 'noodleTailBroom' },
      dashAttack: 'noodleLeadSweep',
      ledgeAttack: 'noodleLatchWhip',
      floorAttack: 'noodleLeashLash',
      ledgeClimb: { total: 31, lift: 15, plant: 24, protectedThrough: 29, distance: 17, crest: 3 },
      ledgeRoll: {
        label: 'Slipknot Roll',
        total: 39,
        safe: [3, 15],
        plant: 7,
        arrive: 23,
        distance: 153,
        tip: 'Noodle rolls farthest. A guard who waits at the end can grab him while he unwinds.',
      },
      grab: 'noodleLeadLoop',
      dashGrab: 'noodleRunningLoop',
      pivotGrab: 'noodleBackcast',
      pummel: 'noodleKnotTug',
      throws: {
        forward: 'noodleSlingCast',
        back: 'noodleReverseReel',
        up: 'noodleFlagpole',
        down: 'noodleSlackSnap',
      },
      smashes: { side: 'noodleLeadSnap', up: 'noodleBellPull', down: 'noodleSwitchback' },
      specials: { neutral: 'noodleTug', side: 'noodleSling', up: 'noodleLasso', down: 'noodleTripLine' },
      recovery:
        'Cast Up + Special from outside a solid ledge. The rope hooks the edge and reels you to it. From farther out, jump closer before casting.',
      air: {
        neutral: 'noodleCoil',
        forward: 'noodleCast',
        back: 'noodleTail',
        up: 'noodleLoop',
        down: 'noodleHook',
      },
      style: 'Fight at rope length. Reel a rival in, then whip them away from the ledge.',
      combo:
        'Tap Attack for Ankle Tap, then again for Reel In. After the pull connects, tap Attack for Whiplash or press Special for Tug Rope.',
      airAccel: 715,
      airDrift: { speed: 258, brake: 1160, friction: 83 },
      wallKick: { rise:624, push:334, frames:7 },
      gravity: 0.93,
      fallSpeed: 545,
      fastFallSpeed: 730,
    },
    clover: {
      footwork: { walk: 160, burst: 174, acceleration: 2010, traction: 2920, tiltBrake: 1930, reverseFrames: 6 },
      defense: { rollDistance: 116, roll: [26, 3, 13], spot: [20, 2, 11] },
      airDodge: {
        neutral: [26, 3, 13, 5],
        directional: [36, 3, 14, 9],
        travel: [3, 18],
        distance: 128,
        ledgeFrame: 9,
        tip: 'Clover has the quickest landing recovery. Aim down toward a platform to set up your next attack.',
      },
      ground: ['cloverTap', 'cloverSet'],
      tilts: { forward: 'cloverOneTwoPass', up: 'cloverCanopyTap', down: 'cloverBackspin' },
      dashAttack: 'cloverRimRush',
      ledgeAttack: 'cloverRimVault',
      floorAttack: 'cloverReverseRim',
      ledgeClimb: { total: 29, lift: 13, plant: 21, protectedThrough: 26, distance: 22, crest: 7 },
      ledgeRoll: {
        label: 'Rim Cartwheel',
        total: 29,
        safe: [3, 14],
        plant: 7,
        arrive: 21,
        distance: 125,
        tip: 'Clover pivots over her disc and lands farther in than Brisket, ready to turn sooner.',
      },
      grab: 'cloverDiscHook',
      dashGrab: 'cloverScoopSlide',
      pivotGrab: 'cloverRimTurn',
      pummel: 'cloverRimTap',
      throws: {
        forward: 'cloverForehandPass',
        back: 'cloverBankPass',
        up: 'cloverSetToss',
        down: 'cloverSkipToss',
      },
      smashes: { side: 'cloverLineDrive', up: 'cloverHaloLift', down: 'cloverRimRattle' },
      specials: { neutral: 'cloverRound', side: 'cloverChase', up: 'cloverSail', down: 'cloverServe' },
      recovery:
        'Use Up + Special to rise onto the disc. Keep Special held and steer left or right to sail toward the stage. Release Special to drop onto it.',
      air: {
        neutral: 'cloverOrbit',
        forward: 'cloverFore',
        back: 'cloverBack',
        up: 'cloverVolley',
        down: 'cloverSkip',
      },
      style: 'Pop the rival up with the disc. Jump on contact to meet them with a volley.',
      combo:
        'Tap Attack twice. When Set Point connects, press Jump, Up and Attack together for Sky Volley. Jump with Attack alone for both beats of Orbit.',
      airAccel: 950,
      airDrift: { speed: 330, brake: 1870, friction: 140 },
      gravity: 0.96,
      fallSpeed: 585,
      fastFallSpeed: 790,
    },
  };
  // Frames are [startup, active, recovery] at 60 Hz. Boxes are [forward, down from feet, half-width, half-height].
  // The launch angle is measured above horizontal. Negative angles spike an airborne opponent.
  // An aerial pays its full landing lag from the first landingWindow frame up to (excluding) the second.
  const moves = {
    getupSweep: {
      label: 'Kickstand',
      hint: 'Kick forward on frame 7, then back on frame 11. Pip gets to his feet quickly.',
      frames: [7, 3, 17], box: [25, -19, 28, 17], floorAttack: true,
      dmg: 6, base: 147, growth: 2.5, angle: 32,
      late: { start: 11 / 60, active: 3 / 60, box: [-25,-18,27,16], rear: true, dmg: 6, base: 147, growth: 2.5, angle: 32 },
    },
    brisketMatSlap: {
      label: 'Mat Slap',
      hint: 'Plant both paws on frame 14. Both sides take 9%, but Brisket takes the longest to stand after a miss.',
      frames: [14, 5, 24], box: [0, -19, 64, 18], floorAttack: true, around: true,
      dmg: 9, base: 183, growth: 2.9, angle: 35,
    },
    noodleLeashLash: {
      label: 'Leash Lash',
      hint: 'The rope reaches far ahead on frame 10. The shorter backswing comes on frame 17.',
      frames: [10, 4, 20], box: [42,-17,43,16], floorAttack: true,
      dmg: 7, base: 153, growth: 2.6, angle: 26,
      late: { start: 17 / 60, active: 4 / 60, box: [-25,-20,26,18], rear: true, dmg: 5, base: 133, growth: 2.3, angle: 32 },
    },
    cloverReverseRim: {
      label: 'Reverse Rim',
      hint: 'Turn the disc behind on frame 8, then sweep farther forward on frame 15.',
      frames: [8, 4, 20], box: [-30,-20,30,18], floorAttack: true, rear: true,
      dmg: 6, base: 141, growth: 2.45, angle: 38,
      late: { start: 15 / 60, active: 4 / 60, box: [36,-18,35,17], dmg: 8, base: 170, growth: 2.8, angle: 29 },
    },
    // Climb points are [frame, distance inward from the lip, feet below the surface].
    pipRailKick: {
      label: 'Rail Kick',
      hint: 'Swing over the lip on one paw and kick low. Pip lands quickly enough to chase the rival inward.',
      ledgeAttack: true,
      frames: [7, 5, 11],
      climb: [
        [3, -9, 26],
        [7, 9, 5],
        [12, 28, 0],
      ],
      box: [35, -21, 33, 17],
      dmg: 7,
      base: 160,
      growth: 3.1,
      angle: 22,
    },
    brisketPorchBump: {
      label: 'Porch Bump',
      hint: 'Haul up and drive your shoulder onto the stage. The shove hits hard, but a miss leaves you open.',
      ledgeAttack: true,
      frames: [13, 6, 19],
      climb: [
        [5, -8, 29],
        [10, 4, 12],
        [13, 17, 0],
        [18, 36, 0],
      ],
      box: [38, -36, 39, 28],
      dmg: 12,
      base: 234,
      growth: 4.25,
      angle: 30,
      hard: true,
    },
    noodleLatchWhip: {
      label: 'Latch Whip',
      hint: 'Hang on with one paw and snap the lead across the edge. A distant rival gets pulled toward your landing spot.',
      ledgeAttack: true,
      frames: [9, 6, 13],
      climb: [
        [4, -10, 29],
        [9, -3, 14],
        [15, 12, 6],
        [18, 20, 0],
      ],
      box: [65, -29, 57, 15],
      dmg: 6,
      base: 124,
      growth: 1.85,
      angle: 35,
      pull: true,
      stun: 0.32,
    },
    cloverRimVault: {
      label: 'Rim Vault',
      hint: 'Vault over the edge and scoop with the held disc. It sends a rival above you as you land farther in.',
      ledgeAttack: true,
      frames: [10, 5, 14],
      climb: [
        [4, -7, 27],
        [8, 9, 0],
        [10, 20, -12],
        [15, 32, -11],
        [19, 42, 0],
      ],
      box: [28, -47, 33, 37],
      dmg: 8,
      base: 236,
      growth: 3.1,
      angle: 77,
    },
    pipStampKick: {
      label: 'Stamp Kick',
      angleHeight: 23, angleChange: 17,
      hint: 'Plant one foot and snap the other straight out. The quick recovery lets you chase the low launch.',
      frames: [3, 4, 7],
      box: [42, -31, 29, 17],
      dmg: 5,
      base: 144,
      growth: 2.85,
      angle: 26,
    },
    pipChinFlick: {
      label: 'Chin Flick',
      hint: 'Flick a paw under the chin. On contact, press Jump, Forward and Attack together to follow with Flying Kick.',
      frames: [4, 4, 8],
      box: [19, -74, 32, 33],
      dmg: 5,
      base: 210,
      growth: 2.4,
      angle: 76,
      stun: 0.27,
      jumpCancel: true,
    },
    pipDewclaw: {
      label: 'Dewclaw',
      hint: 'Crouch and rake the rival’s ankles. At close range, release Down and tap Attack again for Quick Paw.',
      frames: [3, 3, 6],
      box: [34, -12, 29, 13],
      dmg: 4,
      base: 84,
      growth: 1.45,
      angle: 14,
      stun: 0.32,
    },
    brisketGateCheck: {
      label: 'Gate Check',
      angleHeight: 27, angleChange: 13,
      hint: 'Shove with the broad side of your forearm. The flat launch pushes rivals toward the edge.',
      frames: [7, 5, 13],
      box: [44, -38, 39, 23],
      dmg: 10,
      base: 218,
      growth: 3.85,
      angle: 22,
    },
    brisketCrownLift: {
      label: 'Crown Lift',
      hint: 'Drive the top of your head upward. It catches landings over either shoulder.',
      frames: [6, 6, 12],
      box: [4, -78, 41, 33],
      dmg: 9,
      base: 239,
      growth: 3.6,
      angle: 83,
      around: true,
    },
    brisketDoorstop: {
      label: 'Doorstop',
      hint: 'Stamp one foot just ahead of you. It pops a grounded rival up in front of your paws.',
      frames: [6, 4, 11],
      box: [39, -9, 32, 17],
      dmg: 8,
      base: 178,
      growth: 2.8,
      angle: 64,
    },
    noodleKnotPoke: {
      label: 'Knot Poke',
      angleHeight: 32, angleChange: 15,
      hint: 'Poke straight out with the lead. The line deals 5%, and the knot at the tip deals 7%.',
      frames: [5, 4, 10],
      box: [65, -34, 53, 13],
      dmg: 5,
      base: 143,
      growth: 2.7,
      angle: 29,
      sweetSpot: { box: [110, -35, 14, 26], bonus: 2, launch: 1.12 },
    },
    noodleLoopLift: {
      label: 'Loop Lift',
      hint: 'Send a narrow loop high above your head. It catches a falling rival and lifts them close.',
      frames: [6, 5, 10],
      box: [16, -78, 30, 48],
      dmg: 6,
      base: 205,
      growth: 2.45,
      angle: 82,
      pull: true,
      lift: 245,
      stun: 0.26,
    },
    noodleTailBroom: {
      label: 'Tail Broom',
      hint: 'Sweep your tail along the floor. It pops a standing rival up and knocks an airborne rival downward just off the ledge.',
      frames: [4, 5, 9],
      box: [48, -5, 43, 14],
      dmg: 5,
      base: 155,
      growth: 2.95,
      angle: -24,
    },
    cloverOneTwoPass: {
      label: 'One-Two Pass',
      angleHeight: 25, angleChange: 19,
      hint: 'Tap once to check with your free paw for 2%, then flick the disc forward for another 4%.',
      frames: [4, 3, 14],
      box: [34, -37, 23, 17],
      dmg: 2,
      base: 63,
      growth: 0.7,
      angle: 23,
      pull: true,
      stun: 0.2,
      secondPose: 'cloverOneTwoPassFinish',
      second: {
        start: 10 / 60,
        active: 4 / 60,
        box: [50, -39, 35, 23],
        dmg: 4,
        base: 157,
        growth: 2.95,
        angle: 31,
      },
    },
    cloverCanopyTap: {
      label: 'Canopy Tap',
      hint: 'Meet the rival with the flat of the disc overhead. The nearly straight-up launch keeps them above you.',
      frames: [5, 5, 8],
      box: [12, -83, 41, 30],
      dmg: 6,
      base: 226,
      growth: 2.85,
      angle: 88,
    },
    cloverBackspin: {
      label: 'Backspin',
      hint: 'Hook the rim low and flick it back toward you. Catch the rival close to send them behind you.',
      frames: [5, 4, 10],
      box: [41, -15, 31, 16],
      dmg: 6,
      base: 375,
      growth: 2.25,
      angle: 42,
      reverse: true,
    },
    pipGrassSkid: {
      label: 'Grass Skid',
      hint: 'Slide in heel-first for a quick, low kick. Pip recovers fast enough to chase.',
      dashAttack: true,
      frames: [4, 6, 10],
      box: [34, -15, 31, 15],
      carry: 1.08,
      brake: 1700,
      dmg: 7,
      base: 176,
      growth: 3.35,
      angle: 21,
    },
    brisketYardBuster: {
      label: 'Yard Buster',
      hint: 'Lead with the shoulder. The first four frames of contact hit hardest, and a miss leaves Brisket open.',
      dashAttack: true,
      frames: [9, 11, 21],
      box: [44, -34, 39, 29],
      carry: 1.48,
      brake: 710,
      dmg: 14,
      base: 241,
      growth: 4.75,
      angle: 33,
      hard: true,
      late: {
        start: 13 / 60,
        active: 7 / 60,
        box: [34, -30, 32, 26],
        dmg: 8,
        base: 146,
        growth: 3.05,
        angle: 27,
      },
    },
    noodleLeadSweep: {
      label: 'Lead Sweep',
      hint: 'Plant your paws and sweep the lead along the ground. Catch a rival at the tip to pull them into paw range.',
      dashAttack: true,
      frames: [7, 5, 14],
      box: [73, -18, 55, 15],
      carry: 0.92,
      brake: 1420,
      dmg: 6,
      base: 119,
      growth: 1.7,
      angle: 34,
      pull: true,
      stun: 0.36,
    },
    cloverRimRush: {
      label: 'Rim Rush',
      hint: 'Skim the disc low, then scoop upward for a second hit. Jump as the rim pops the rival up to follow with an aerial.',
      dashAttack: true,
      frames: [5, 4, 20],
      box: [39, -18, 35, 16],
      carry: 1.1,
      brake: 1110,
      dmg: 3,
      base: 64,
      growth: 0.65,
      angle: 35,
      pull: true,
      lift: 150,
      stun: 0.27,
      setupHit: true,
      secondPose: 'cloverRimRushPop',
      second: {
        start: 13 / 60,
        active: 5 / 60,
        box: [37, -54, 39, 41],
        dmg: 6,
        base: 232,
        growth: 3.3,
        angle: 78,
        stun: 0.3,
        jumpCancel: true,
      },
    },
    pipJab: {
      lockFrames: 23,
      label: 'Quick Paw',
      frames: [3, 4, 6],
      box: [35, -39, 35, 25],
      dmg: 4,
      base: 84,
      growth: 2,
      angle: 21,
      stun: 0.2,
      link: 3,
    },
    pipCross: {
      label: 'Cross',
      frames: [3, 5, 6],
      box: [39, -37, 40, 25],
      dmg: 4,
      base: 94,
      growth: 2.1,
      angle: 26,
      stun: 0.23,
      step: 122,
      link: 3,
      jumpCancel: true,
    },
    pipHeel: {
      label: 'Heel Kick',
      frames: [5, 6, 12],
      box: [44, -33, 44, 27],
      dmg: 9,
      base: 220,
      growth: 4.65,
      angle: 31,
      step: 175,
      hard: true,
    },
    pipSpeedBag: {
      label: 'Speed Bag',
      frames: [2, 2, 2],
      box: [31, -30, 35, 25],
      dmg: 1.4, base: 36, growth: .24, angle: 12,
      setupHit: true, hitStopFrames: 3,
    },
    pipBellKick: {
      label: 'Bell Kick',
      frames: [4, 4, 14],
      box: [42, -31, 42, 27],
      dmg: 5, base: 174, growth: 3.4, angle: 42,
      step: 90, hard: true,
    },
    pipSpin: {
      label: 'Scramble',
      hint: 'A fast paw-wheel that catches rivals on either side.',
      frames: [3, 8, 7],
      box: [0, -36, 49, 33],
      dmg: 6,
      base: 128,
      growth: 3.0,
      angle: 48,
      land: 3,
      landingWindow: [3, 12],
    },
    pipDiveKick: {
      label: 'Flying Kick',
      hint: 'The extended heel kicks the rival away. The trailing paw pops them up for Quick Paw on landing.',
      frames: [4, 10, 6],
      box: [44, -34, 37, 24],
      dmg: 8,
      base: 165,
      growth: 4.0,
      angle: 27,
      burst: 205,
      late: { start: 7 / 60, active: 7 / 60, box: [33, -24, 32, 21], dmg: 4, base: 96, growth: 2.0, angle: 62, stun: 0.29 },
      land: 5,
      landingWindow: [3, 14],
    },
    pipBackKick: {
      lowLaunch: true,
      label: 'Back Heel',
      hint: 'A quick heel strike behind you with a low launch.',
      frames: [3, 4, 10],
      box: [-39, -32, 33, 21],
      dmg: 8,
      base: 158,
      growth: 4.1,
      angle: 19,
      land: 4,
      landingWindow: [2, 10],
    },
    pipFlip: {
      label: 'Flip Kick',
      hint: 'Catch the rival high over your forehead with the heel to launch almost straight up.',
      frames: [3, 6, 8],
      box: [12, -82, 36, 34],
      dmg: 7,
      base: 160,
      growth: 3.55,
      angle: 80,
      sweetSpot: { label: 'High heel', box: [12, -104, 16, 12], bonus: 2, launch: 1.10, angle: 88 },
      land: 4,
      landingWindow: [3, 11],
    },
    pipPogo: {
      label: 'Pogo Paw',
      hint: 'Kick down. A clean hit bounces Pip upward once per airtime.',
      frames: [4, 11, 9],
      box: [4, 1, 35, 34],
      dmg: 9,
      base: 160,
      growth: 4.15,
      angle: -67,
      meteor: 14,
      pogo: true,
      land: 7,
      landingWindow: [3, 20],
    },
    brisketCheck: {
      lockFrames: 35,
      label: 'Body Check',
      frames: [5, 7, 12],
      box: [35, -36, 37, 29],
      dmg: 7,
      base: 88,
      growth: 2.0,
      angle: 16,
      stun: 0.34,
      step: 120,
      link: 5,
      grabCancel: true,
    },
    brisketLift: {
      label: 'Bell Ringer',
      frames: [8, 6, 18],
      box: [39, -47, 46, 47],
      dmg: 13,
      base: 252,
      growth: 5.2,
      angle: 72,
      step: 145,
      hard: true,
    },
    brisketCurl: {
      label: 'Barrel Roll',
      hint: 'Tuck into a broad body hit on both sides. The windup leaves time to dodge.',
      frames: [7, 11, 14],
      box: [0, -35, 52, 38],
      dmg: 11,
      base: 192,
      growth: 4.4,
      angle: 40,
      land: 9,
      landingWindow: [4, 24],
    },
    brisketRam: {
      label: 'Air Ram',
      hint: 'The leading shoulder launches hard. Clip them with the falling body to land close enough for Body Check.',
      frames: [8, 12, 13],
      box: [41, -38, 39, 30],
      dmg: 13,
      base: 227,
      growth: 5.0,
      angle: 29,
      burst: 310,
      hard: true,
      late: { start: 12 / 60, active: 8 / 60, box: [23, -26, 33, 27], dmg: 7, base: 122, growth: 2.6, angle: 53, stun: 0.37 },
      land: 12,
      landingWindow: [4, 27],
    },
    brisketHip: {
      lowLaunch: true,
      label: 'Hip Check',
      hint: 'Back into them at close range for a heavy hip check. Grazing them at full reach gives a softer bump.',
      frames: [6, 6, 15],
      box: [-39, -33, 37, 27],
      dmg: 12,
      base: 238,
      growth: 5.2,
      angle: 18,
      sweetSpot: { label: 'Hip smash', box: [-31, -33, 14, 17], bonus: 3, launch: 1.13, angle: 12 },
      hard: true,
      land: 10,
      landingWindow: [4, 20],
    },
    brisketCrown: {
      label: 'Crown Bump',
      hint: 'Lead with your forehead for a strong vertical launch.',
      frames: [6, 7, 12],
      box: [5, -78, 40, 35],
      dmg: 10,
      base: 194,
      growth: 4.5,
      angle: 84,
      land: 8,
      landingWindow: [4, 18],
    },
    brisketDrop: {
      label: 'Belly Drop',
      hint: 'Hang briefly, then plunge. The landing can catch a rival beside you.',
      frames: [10, 17, 18],
      box: [1, -3, 47, 33],
      dmg: 15,
      base: 238,
      growth: 5.6,
      angle: -74,
      meteor: 16,
      plunge: true,
      hard: true,
      land: 18,
      landingWindow: [1, 46],
    },
    noodleTrip: {
      lockFrames: 29,
      label: 'Ankle Tap',
      frames: [4, 6, 9],
      box: [42, -18, 46, 19],
      dmg: 4,
      base: 110,
      growth: 2.15,
      angle: 18,
      stun: 0.27,
      link: 4,
    },
    noodleReel: {
      label: 'Reel In',
      frames: [5, 7, 10],
      box: [62, -35, 65, 20],
      dmg: 5,
      base: 105,
      growth: 2.35,
      angle: 32,
      pull: true,
      stun: 0.3,
      link: 4,
      specialCancel: true,
      rope: 'front',
    },
    noodleSnap: {
      label: 'Whiplash',
      frames: [6, 6, 15],
      box: [57, -37, 54, 26],
      dmg: 8,
      base: 200,
      growth: 4.7,
      angle: 24,
      hard: true,
      rope: 'front',
    },
    noodleCoil: {
      label: 'Coil Sweep',
      hint: 'Uncoil your tail in a wide sweep that reaches farther behind you.',
      frames: [5, 9, 9],
      box: [-8, -32, 64, 25],
      dmg: 7,
      base: 145,
      growth: 3.45,
      angle: 38,
      land: 5,
      landingWindow: [3, 17],
    },
    noodleCast: {
      label: 'Slip Lead',
      hint: 'The outward cast reaches farthest. The shorter returning loop draws the rival in for Ankle Tap.',
      frames: [7, 13, 7],
      box: [65, -37, 61, 17],
      dmg: 6,
      base: 128,
      growth: 2.65,
      angle: 34,
      pull: true,
      stun: 0.27,
      land: 7,
      landingWindow: [5, 20],
      rope: 'front',
      late: { start: 11 / 60, active: 9 / 60, box: [47, -27, 46, 20], dmg: 4, base: 88, growth: 1.65, angle: 28, pull: true, stun: 0.32 },
    },
    noodleTail: {
      lowLaunch: true,
      label: 'Tail Flick',
      hint: 'Catch them at the very tip of the tail to send them skimming offstage.',
      frames: [4, 6, 12],
      box: [-57, -29, 51, 18],
      dmg: 9,
      base: 169,
      growth: 3.85,
      angle: 17,
      sweetSpot: { label: 'Tail tip', box: [-97, -29, 11, 16], bonus: 3, launch: 1.14, angle: 9 },
      land: 5,
      landingWindow: [2, 13],
    },
    noodleLoop: {
      label: 'Lasso Loop',
      hint: 'Hook a rival high above your head with the rope.',
      frames: [6, 8, 10],
      box: [9, -94, 31, 44],
      dmg: 7,
      base: 151,
      growth: 3.65,
      angle: 78,
      land: 6,
      landingWindow: [4, 18],
      rope: 'up',
    },
    noodleHook: {
      label: 'Underhook',
      hint: 'Reach below the platform and pull a rival upward toward you.',
      frames: [7, 8, 13],
      box: [17, 18, 31, 49],
      dmg: 7,
      base: 165,
      growth: 3.2,
      angle: 82,
      pull: true,
      lift: 285,
      land: 8,
      landingWindow: [4, 21],
      rope: 'down',
    },
    cloverTap: {
      lockFrames: 26,
      label: 'Disc Tap',
      frames: [4, 5, 8],
      box: [36, -37, 37, 25],
      dmg: 4,
      base: 80,
      growth: 1.65,
      angle: 35,
      stun: 0.27,
      link: 3,
    },
    cloverSet: {
      label: 'Set Point',
      frames: [5, 7, 12],
      box: [37, -47, 45, 40],
      dmg: 6,
      base: 270,
      growth: 3.2,
      angle: 83,
      stun: 0.31,
      step: 115,
      jumpCancel: true,
      link: 1,
    },
    cloverOrbit: {
      label: 'Orbit',
      hint: 'The disc circles twice. Stay close to land both beats.',
      frames: [4, 4, 19],
      box: [0, -38, 58, 33],
      dmg: 3,
      base: 62,
      growth: 0.9,
      angle: 33,
      stun: 0.23,
      land: 7,
      landingWindow: [3, 22],
      second: { start: 12 / 60, active: 5 / 60, dmg: 6, base: 161, growth: 3.4, angle: 57 },
    },
    cloverFore: {
      label: 'Forehand',
      hint: 'The leading rim sends the rival outward. Brush them with the end of the sweep for a lift into Disc Tap.',
      frames: [5, 10, 7],
      box: [45, -42, 42, 26],
      dmg: 8,
      base: 164,
      growth: 3.85,
      angle: 34,
      late: { start: 8 / 60, active: 7 / 60, box: [33, -27, 35, 23], dmg: 5, base: 104, growth: 2.0, angle: 73, stun: 0.30 },
      land: 5,
      landingWindow: [3, 15],
    },
    cloverBack: {
      lowLaunch: true,
      label: 'Backhand',
      hint: 'The broad face of the disc sends the rival out. Scoop them on its upper rim to loft them for a chase.',
      frames: [4, 5, 11],
      box: [-44, -39, 39, 22],
      dmg: 8,
      base: 173,
      growth: 4.1,
      angle: 23,
      sweetSpot: { label: 'Rim scoop', box: [-65, -54, 15, 10], bonus: 1, launch: 1.04, angle: 60 },
      land: 4,
      landingWindow: [2, 12],
    },
    cloverVolley: {
      label: 'Sky Volley',
      hint: 'An upward disc swipe. Use it immediately after jumping out of Set Point.',
      frames: [3, 7, 9],
      box: [22, -75, 46, 40],
      dmg: 8,
      base: 174,
      growth: 3.85,
      angle: 80,
      land: 4,
      landingWindow: [2, 12],
    },
    cloverSkip: {
      label: 'Skip Shot',
      hint: 'Slice downward and forward with the disc to spike an airborne rival.',
      frames: [5, 7, 12],
      box: [29, -1, 36, 31],
      dmg: 9,
      base: 169,
      growth: 4.1,
      angle: -49,
      meteor: 12,
      land: 7,
      landingWindow: [3, 18],
    },
  };
  const specials = {
    pipBark: {
      label: 'Snap Bark',
      hint: 'Two quick barks in front of Pip. The louder second bark can send an incoming disc back at its thrower.',
      frames: [3, 4, 17],
      box: [38, -40, 36, 25],
      dmg: 3,
      base: 64,
      growth: 1,
      angle: 18,
      stun: 0.22,
      second: { start: 11 / 60, active: 5 / 60, dmg: 5, base: 152, growth: 3.7, angle: 31, reflectsDisc:true },
    },
    pipPounce: {
      label: 'Double Pounce',
      hint: 'Spring sideways. After a clean hit, tap Side + Special again for one more pounce.',
      frames: [3, 12, 10],
      box: [40, -34, 38, 30],
      dmg: 9,
      base: 162,
      growth: 4.25,
      angle: 32,
    },
    pipHopper: {
      label: 'Fence Hopper',
      hint: 'Leap up, then tap Up + Special again for a second leap. Aim either hop left or right.',
      frames: [2, 7, 8],
      box: [14, -67, 34, 40],
      dmg: 6,
      base: 153,
      growth: 3.5,
      angle: 70,
    },
    pipSlide: {
      label: 'Dirt Slide',
      hint: 'Slide under a rival and pop up at their feet. From the air, dive to the floor to start the slide.',
      frames: [9, 7, 12],
      box: [2, -20, 43, 31],
      dmg: 9,
      base: 173,
      growth: 4.15,
      angle: 71,
      around: true,
    },
    brisketClinch: {
      label: 'Collar Toss',
      hint: 'Scoop up a nearby rival and toss them overhead. Catches shielding or braced rivals.',
      frames: [6, 5, 19],
      box: [34, -37, 32, 29],
      dmg: 11,
      base: 195,
      growth: 4.4,
      angle: 73,
      commandGrab: true,
      hard: true,
    },
    brisketCharge: {
      label: 'Shoulder Charge',
      hint: 'Commit to a long sideways shoulder charge. Brisket needs room to brake afterward.',
      frames: [7, 16, 13],
      box: [45, -36, 40, 31],
      dmg: 15,
      base: 230,
      growth: 5.1,
      angle: 30,
      hard: true,
    },
    brisketCannon: {
      label: 'Kennel Cannon',
      hint: 'Hold Special to charge, then release to blast upward. A tap gives a shorter launch.',
      frames: [3, 13, 13],
      box: [6, -70, 39, 45],
      dmg: 10,
      base: 185,
      growth: 4.2,
      angle: 79,
      hard: true,
    },
    brisketBrace: {
      label: 'Stand Firm',
      hint: 'Brace just before a strike. Brisket stops the hit and answers with a short counter. Grabs beat the stance.',
      frames: [4, 12, 18],
      box: [39, -39, 45, 38],
      dmg: 13,
      base: 218,
      growth: 4.7,
      angle: 39,
      hard: true,
    },
    noodleTug: {
      label: 'Tug Rope',
      hint: 'Throw the rope straight ahead and yank a rival toward you.',
      frames: [6, 7, 15],
      box: [86, -39, 86, 19],
      dmg: 8,
      base: 132,
      growth: 3.3,
      angle: 32,
      rope: 'front',
    },
    noodleSling: {
      label: 'Slingshot',
      hint: 'Hook a rival and pull Noodle toward them. The cast reaches farther than a normal strike.',
      frames: [5, 8, 15],
      box: [82, -37, 78, 19],
      dmg: 7,
      base: 100,
      growth: 2.35,
      angle: 27,
      stun: 0.24,
      rope: 'front',
    },
    noodleLasso: {
      label: 'Ledge Lasso',
      hint: 'Catch a solid ledge and reel Noodle to it. Without an edge in reach, Noodle hops and lashes overhead.',
      frames: [5, 11, 22],
      box: [17, -88, 32, 49],
      dmg: 7,
      base: 156,
      growth: 3.6,
      angle: 75,
      rope: 'up',
    },
    noodleTripLine: {
      label: 'Trip Line',
      hint: 'Drop a rope snare. It stays on the first platform it touches and trips one grounded rival. A new snare replaces the old one.',
      frames: [7, 5, 15],
      box: [48, -8, 29, 12],
      dmg: 6,
      base: 116,
      growth: 2.3,
      angle: 70,
      stun: 0.34,
      projectile: 'snare',
    },
    cloverRound: {
      label: 'Round Trip',
      hint: 'Throw a disc that curves home. It can hit once on the way out and once on the return.',
      frames: [7, 3, 13],
      box: [38, -40, 29, 18],
      dmg: 7,
      base: 145,
      growth: 3.2,
      angle: 32,
      projectile: 'return',
    },
    cloverChase: {
      label: 'Disc Chase',
      hint: 'Dash sideways. A nearby Round Trip disc ahead pulls the dash toward it, and Clover can catch it early.',
      frames: [3, 11, 12],
      box: [37, -39, 35, 30],
      dmg: 8,
      base: 165,
      growth: 3.8,
      angle: 32,
    },
    cloverSail: {
      label: 'Disc Sail',
      hint: 'Rise onto the disc. Hold Special and steer to glide, or let go to drop early.',
      frames: [3, 18, 36],
      box: [3, -7, 50, 27],
      dmg: 7,
      base: 150,
      growth: 3.5,
      angle: 54,
      around: true,
    },
    cloverServe: {
      label: 'Skip Serve',
      hint: 'Skim a low disc across the arena. It bounces twice off platform tops and disappears on contact with a rival.',
      frames: [6, 4, 14],
      box: [36, -20, 29, 16],
      dmg: 8,
      base: 158,
      growth: 3.6,
      angle: 34,
      projectile: 'skip',
    },
  };
  const smashes = {
    pipBoltKick: {
      lowLaunch: true,
      label: 'Bolt Kick',
      hint: 'Pip springs forward with both feet. The short windup lets you punish a missed attack.',
      frames: [6, 5, 14],
      box: [46, -36, 40, 27],
      dmg: 12,
      base: 208,
      growth: 4.7,
      angle: 32,
      burst: 405,
      hard: true,
    },
    pipScissors: {
      label: 'Scissor Kick',
      hint: 'One heel lifts a nearby rival into a second kick straight overhead.',
      frames: [4, 4, 22],
      box: [14, -55, 48, 35],
      dmg: 3,
      base: 61,
      growth: 0.8,
      angle: 76,
      stun: 0.28,
      lift: 175,
      pull: true,
      setupHit: true,
      secondPose: 'pipScissorsFinish',
      second: {
        start: 12 / 60,
        active: 5 / 60,
        box: [6, -85, 48, 45],
        dmg: 10,
        base: 210,
        growth: 4.8,
        angle: 84,
        hard: true,
        around: true,
      },
    },
    pipDustDevil: {
      label: 'Dust Devil',
      hint: 'Kick low in front, then sweep behind. Turn your back to the ledge for the stronger second kick.',
      frames: [5, 4, 21],
      box: [45, -18, 36, 18],
      dmg: 10,
      base: 187,
      growth: 4.35,
      angle: 24,
      hard: true,
      secondPose: 'pipDustDevilRear',
      second: {
        start: 14 / 60,
        active: 5 / 60,
        box: [-49, -20, 37, 20],
        dmg: 13,
        base: 211,
        growth: 4.9,
        angle: 26,
        rear: true,
        hard: true,
      },
    },
    brisketHaymaker: {
      lowLaunch: true,
      label: 'Haymaker',
      hint: 'Release Smash to plant your feet. When the gold shoulder marks appear, one hit worth up to 8% deals damage without stopping the punch. Grabs still catch you.',
      frames: [12, 5, 24],
      armor: { first:5, limit:8 },
      box: [54, -41, 47, 34],
      dmg: 17,
      base: 242,
      growth: 5.5,
      angle: 33,
      hard: true,
    },
    brisketRoofRaiser: {
      label: 'Roof Raiser',
      hint: 'Drive upward with Brisket’s head and shoulders. The wide hit catches rivals on either side and launches them almost straight up.',
      frames: [8, 7, 22],
      box: [0, -75, 55, 46],
      dmg: 15,
      base: 222,
      growth: 5,
      angle: 87,
      around: true,
      hard: true,
    },
    brisketQuake: {
      label: 'Quake Stomp',
      hint: 'Slam both paws down. The shockwave spreads along the floor on both sides. Stand close for the biggest hit.',
      frames: [13, 7, 25],
      box: [0, -12, 103, 16],
      dmg: 14,
      base: 210,
      growth: 4.7,
      angle: 49,
      around: true,
      hard: true,
      shockwave: true,
      sweetSpot: { box: [0, -30, 66, 31], bonus: 4, launch: 1.14 },
    },
    noodleLeadSnap: {
      lowLaunch: true,
      label: 'Lead Snap',
      hint: 'Crack the lead straight ahead. The knot at the far end hits much harder than the middle of the rope.',
      frames: [9, 5, 20],
      box: [86, -39, 82, 21],
      dmg: 11,
      base: 176,
      growth: 4.35,
      angle: 29,
      hard: true,
      rope: 'front',
      sweetSpot: { box: [153, -40, 29, 33], bonus: 5, launch: 1.23 },
    },
    noodleBellPull: {
      label: 'Bell Pull',
      hint: 'Catch a nearby rival in an upward loop, then snap the rope above Noodle’s head to launch them.',
      frames: [7, 5, 25],
      box: [14, -57, 55, 38],
      dmg: 4,
      base: 58,
      growth: 0.8,
      angle: 82,
      pull: true,
      lift: 215,
      stun: 0.32,
      setupHit: true,
      rope: 'up',
      secondPose: 'noodleBellPullFinish',
      second: {
        start: 17 / 60,
        active: 6 / 60,
        box: [9, -95, 54, 54],
        dmg: 11,
        base: 209,
        growth: 4.85,
        angle: 83,
        around: true,
        hard: true,
      },
    },
    noodleSwitchback: {
      label: 'Switchback',
      hint: 'Sweep the rope low on both sides and sling the rival across Noodle. A rival on your left flies right.',
      frames: [9, 7, 19],
      box: [3, -19, 77, 22],
      dmg: 13,
      base: 218,
      growth: 4.8,
      angle: 27,
      around: true,
      reverse: true,
      hard: true,
      rope: 'low',
    },
    cloverLineDrive: {
      lowLaunch: true,
      label: 'Line Drive',
      hint: 'Fire the disc straight ahead. A longer charge gives it more speed, range, and knockback.',
      frames: [9, 3, 18],
      box: [39, -39, 34, 20],
      dmg: 12,
      base: 186,
      growth: 4.65,
      angle: 30,
      projectile: 'drive',
      hard: true,
    },
    cloverHaloLift: {
      label: 'Halo Lift',
      hint: 'Lift the disc over Clover’s head. Catch a jumping rival with its top rim for a stronger launch.',
      frames: [7, 7, 16],
      box: [7, -79, 46, 46],
      dmg: 12,
      base: 189,
      growth: 4.5,
      angle: 80,
      around: true,
      hard: true,
      sweetSpot: { box: [6, -111, 37, 23], bonus: 5, launch: 1.19 },
    },
    cloverRimRattle: {
      label: 'Rim Rattle',
      hint: 'Spin the disc around your paws. The first pass catches low on either side so the second can knock the rival out.',
      frames: [6, 5, 20],
      box: [0, -20, 59, 21],
      dmg: 3,
      base: 56,
      growth: 0.7,
      angle: 38,
      stun: 0.26,
      around: true,
      setupHit: true,
      secondPose: 'cloverRimRattleFinish',
      second: {
        start: 14 / 60,
        active: 5 / 60,
        box: [0, -23, 73, 27],
        dmg: 10,
        base: 195,
        growth: 4.65,
        angle: 31,
        around: true,
        hard: true,
      },
    },
  };
  // A grip, via point or release point locates the captive's chest relative to the holder's feet.
  const grabs = {
    pipCollarTag: {
      label: 'Collar Tag',
      hint: 'A quick paw to the collar. Stay close enough to touch noses.',
      frames: [3, 4, 12],
      box: [32, -39, 22, 21],
      grip: [34, -45],
      hold: 1.1,
      reel: 0.07,
    },
    brisketBearHug: {
      label: 'Bear Hug',
      hint: 'Wrap both paws around a nearby rival. Tap Special to shoulder them, walk or hop, then aim and tap Grab to throw.',
      frames: [6, 6, 22],
      box: [32, -43, 28, 34],
      grip: [29, -63],
      hold: 1.48,
      reel: 0.14,
    },
    noodleLeadLoop: {
      label: 'Lead Loop',
      hint: 'Cast the lead straight ahead. A distant catch takes longer to reel in.',
      frames: [10, 5, 25],
      box: [79, -45, 74, 13],
      grip: [57, -43],
      hold: 1.05,
      reel: 0.1,
      reelSpeed: 510,
    },
    cloverDiscHook: {
      label: 'Disc Hook',
      hint: 'Slide forward with the disc and hook a rival over its rim.',
      frames: [6, 5, 16],
      box: [37, -40, 24, 22],
      grip: [42, -51],
      hold: 1.18,
      reel: 0.1,
      step: 285,
    },
  };
  // Carry is the fraction of incoming run speed retained in the original direction.
  // Brake is ground deceleration in world units per second squared.
  Object.assign(grabs, {
    pipTagDash: {
      ...grabs.pipCollarTag,
      label: 'Tag Dash',
      hint: 'Keep your stride and dart a paw forward. Pip reaches first and recovers quickly on a miss.',
      frames: [4, 4, 13],
      box: [40, -34, 27, 21],
      carry: 1.06,
      brake: 1450,
    },
    pipHeelHook: {
      ...grabs.pipCollarTag,
      label: 'Heel Hook',
      hint: 'Plant a heel and hook low behind you. The sharp stop is good for a close pursuer.',
      frames: [4, 5, 13],
      box: [51, -32, 26, 20],
      carry: 0.34,
      brake: 2100,
    },
    brisketFreightHug: {
      ...grabs.brisketBearHug,
      label: 'Freight Hug',
      hint: 'Carry your weight forward into a two-paw scoop. Start the reach a few steps out.',
      frames: [8, 6, 24],
      box: [44, -47, 34, 35],
      carry: 1.24,
      brake: 720,
    },
    brisketGateSwing: {
      ...grabs.brisketBearHug,
      label: 'Gate Swing',
      hint: 'Swing both paws wide behind you. Brisket keeps sliding as the catch opens.',
      frames: [7, 7, 23],
      box: [52, -53, 44, 36],
      carry: 0.78,
      brake: 950,
    },
    noodleRunningLoop: {
      ...grabs.noodleLeadLoop,
      label: 'Running Loop',
      hint: 'Cast the lead low from a moving start. The loop reaches well ahead of your paws.',
      frames: [9, 5, 26],
      box: [85, -32, 70, 13],
      carry: 0.9,
      brake: 940,
    },
    noodleBackcast: {
      ...grabs.noodleLeadLoop,
      label: 'Backcast',
      hint: 'Throw a long, narrow loop over your shoulder. Catch a pursuer while skidding away.',
      frames: [8, 5, 27],
      box: [96, -47, 84, 14],
      carry: 0.55,
      brake: 1200,
    },
    cloverScoopSlide: {
      ...grabs.cloverDiscHook,
      label: 'Scoop Slide',
      hint: 'Slide the disc close to the floor and scoop the rival onto its rim.',
      frames: [6, 6, 18],
      box: [48, -27, 30, 20],
      carry: 1.15,
      brake: 810,
    },
    cloverRimTurn: {
      ...grabs.cloverDiscHook,
      label: 'Rim Turn',
      hint: 'Plant one foot and sweep the disc upward behind you to catch a low jumper.',
      frames: [5, 5, 16],
      box: [49, -59, 35, 29],
      carry: 0.5,
      brake: 1500,
    },
  });
  // Recoil offsets the captive's chest from this dog's usual grip until the strike recovers.
  const pummels = {
    pipPawDrum: {
      label: 'Paw Drum',
      hint: 'Keep one paw on the collar and drum with the other. A fast 1% tap.',
      frames: [2, 2, 6],
      dmg: 1,
      recoil: [7, -2],
      hitPause: 1,
    },
    brisketBearSqueeze: {
      label: 'Bear Squeeze',
      hint: 'Lift and squeeze for 4%. The long windup gives the rival time to wriggle free.',
      frames: [7, 4, 14],
      dmg: 4,
      recoil: [-5, -12],
      hitPause: 2,
    },
    noodleKnotTug: {
      label: 'Knot Tug',
      hint: 'Give the loop a short tug. Each pull draws the rival toward you for 2%.',
      frames: [4, 3, 8],
      dmg: 2,
      recoil: [-19, -4],
      hitPause: 1,
    },
    cloverRimTap: {
      label: 'Rim Tap',
      hint: 'Flick the disc rim under the collar for 3%, then settle back into the hold.',
      frames: [5, 3, 11],
      dmg: 3,
      recoil: [4, -13],
      hitPause: 1,
    },
  };
  const throws = {
    pipKickoff: {
      label: 'Kickoff',
      hint: 'Plant one foot and boot the rival straight out of paw range.',
      frames: [5, 3, 10],
      via: [26, -50],
      release: [50, -48],
      dmg: 7,
      base: 226,
      growth: 4.0,
      angle: 26,
    },
    pipSlipTurn: {
      label: 'Slip Turn',
      hint: 'Duck under the collar and flick the rival low behind you.',
      frames: [7, 4, 9],
      via: [1, -65],
      release: [-43, -43],
      dmg: 8,
      base: 237,
      growth: 4.35,
      angle: 20,
    },
    pipPopFly: {
      label: 'Pop Fly',
      hint: 'Pop the rival straight up. Jump as they leave your paws to chase with an aerial.',
      frames: [5, 3, 10],
      via: [24, -53],
      release: [13, -82],
      dmg: 5,
      base: 345,
      growth: 2.0,
      angle: 83,
      jumpCancel: true,
      link: 2,
      stun: 0.3,
    },
    pipTumbleTrip: {
      label: 'Tumble Trip',
      hint: 'Sweep their feet for a short forward tumble. Dash after the landing.',
      frames: [6, 2, 6],
      via: [43, -58],
      release: [55, -39],
      dmg: 6,
      base: 142,
      growth: 2.05,
      angle: 24,
      stun: 0.31,
    },
    brisketYardHeave: {
      label: 'Yard Heave',
      hint: 'Wind up at the shoulder and heave the rival in a heavy forward arc.',
      frames: [12, 4, 20],
      via: [9, -93],
      release: [63, -76],
      dmg: 12,
      base: 305,
      growth: 5.15,
      angle: 38,
      hard: true,
    },
    brisketSuplex: {
      label: 'Backyard Suplex',
      hint: 'Arch backward and sling the rival over your shoulder. Face inward at the edge.',
      frames: [14, 4, 22],
      via: [0, -105],
      release: [-56, -40],
      dmg: 13,
      base: 330,
      growth: 5.5,
      angle: 40,
      hard: true,
    },
    brisketPress: {
      label: 'Bench Press',
      hint: 'Press the rival overhead, then send them almost straight up.',
      frames: [11, 4, 18],
      via: [12, -74],
      release: [1, -104],
      dmg: 11,
      base: 375,
      growth: 5.05,
      angle: 88,
      hard: true,
    },
    brisketSitSlam: {
      label: 'Sit-Down Slam',
      hint: 'Drive the rival into the floor for a high bounce. Over a gap they keep falling.',
      frames: [13, 4, 20],
      via: [25, -94],
      release: [43, -54],
      dmg: 15,
      base: 315,
      growth: 4.1,
      angle: -73,
      hard: true,
      bounce: { lift: 330, scale: 0.35, carry: 0.65 },
    },
    noodleSlingCast: {
      label: 'Sling Cast',
      hint: 'Swing a wide loop and release at full lead length in front of you.',
      frames: [10, 4, 16],
      via: [28, -92],
      release: [91, -65],
      dmg: 9,
      base: 238,
      growth: 4.25,
      angle: 32,
    },
    noodleReverseReel: {
      label: 'Reverse Reel',
      hint: 'Whip the lead across your back. Its low, long release reaches past the ledge.',
      frames: [11, 4, 18],
      via: [-10, -86],
      release: [-82, -49],
      dmg: 10,
      base: 270,
      growth: 4.65,
      angle: 19,
    },
    noodleFlagpole: {
      label: 'Flagpole',
      hint: 'Hoist the rival to the top of the loop before sending them skyward.',
      frames: [11, 3, 14],
      via: [47, -81],
      release: [15, -119],
      dmg: 8,
      base: 322,
      growth: 3.65,
      angle: 76,
    },
    noodleSlackSnap: {
      label: 'Slack Snap',
      hint: 'Let the loop drop outward, then snap the rival inward to your feet for a follow-up.',
      frames: [8, 3, 7],
      via: [83, -57],
      release: [66, -40],
      dmg: 6,
      base: 115,
      growth: 1.5,
      angle: 33,
      reverseLaunch: true,
      stun: 0.34,
    },
    cloverForehandPass: {
      label: 'Forehand Pass',
      hint: 'Flick the rival off the disc on a fast, flat line.',
      frames: [6, 3, 12],
      via: [22, -55],
      release: [62, -54],
      dmg: 8,
      base: 267,
      growth: 4.3,
      angle: 12,
    },
    cloverBankPass: {
      label: 'Bank Pass',
      hint: 'Roll the rival around the rim and send them high behind you.',
      frames: [9, 3, 13],
      via: [-5, -84],
      release: [-48, -68],
      dmg: 9,
      base: 250,
      growth: 4.15,
      angle: 54,
    },
    cloverSetToss: {
      label: 'Set Toss',
      hint: 'Set the rival just ahead and above you. Jump on release and meet them with Sky Volley.',
      frames: [7, 3, 13],
      via: [31, -58],
      release: [36, -82],
      dmg: 6,
      base: 326,
      growth: 2.15,
      angle: 72,
      jumpCancel: true,
      link: 2,
      stun: 0.34,
    },
    cloverSkipToss: {
      label: 'Skip Toss',
      hint: 'Skim the rival off the rim. They skip once on the first platform they hit.',
      frames: [8, 3, 12],
      via: [53, -66],
      release: [66, -54],
      dmg: 8,
      base: 270,
      growth: 3.55,
      angle: -26,
      bounce: { lift: 125, scale: 0.15, carry: 1.05 },
    },
  };
  for (const move of [moves, specials, smashes, grabs, pummels, throws].flatMap(Object.values)) {
    const [startup, active, recovery] = move.frames;
    move.start = startup / 60;
    move.active = active / 60;
    move.end = (startup + active + recovery) / 60;
  }
  function airDirection(x, y, facing) {
    if (Math.abs(y) > 0.45 && Math.abs(y) >= Math.abs(x) * 0.75) return y < 0 ? 'up' : 'down';
    if (Math.abs(x) > 0.28) return x * facing > 0 ? 'forward' : 'back';
    return 'neutral';
  }
  function groundDirection(x, y) {
    const side = airDirection(x, y, 1);
    return side === 'back' ? 'forward' : side;
  }
  const verticalAim = (side) => (side === 'up' ? -1 : side === 'down' ? 1 : 0);
  const platform = (x1, x2, y, thin = false) => ({ x1, x2, y, thin });
  function platforms(stage, time) {
    if (stage === 'canal') {
      const center = 600 - 444 * Math.sin(time * Math.PI / 4.8);
      return [platform(160, 1040, 455), platform(center - 96, center + 96, 365, true)];
    }
    if (stage === 'nightmail') return [platform(160, 1040, 455)];
    if (stage === 'picnic')
      return [platform(160, 1040, 455), platform(315, 508, 325, true), platform(705, 898, 325, true)];
    if (stage === 'bandstand')
      return [platform(222, 978, 480), platform(318, 522, 384, true),
        platform(678, 882, 384, true), platform(486, 714, 294, true)];
    const basket = 600 + Math.sin(time * 0.7) * 123;
    return [
      platform(130, 520, 450),
      platform(680, 1070, 450),
      platform(basket - 69.5, basket + 69.5, 367, true),
      platform(805, 935, 310, true),
    ];
  }
  function stageHull(stage) {
    const bands =
      stage === 'laundry'
        ? [
            [0, 0, 15],
            [3, 15, 18],
            [9, 18, 225],
          ]
        : stage === 'canal' ? [[0, 0, 15], [6, 15, 102], [15, 102, 126]]
        : stage === 'nightmail' ? [[0, 0, 12], [6, 12, 96], [18, 96, 114]]
        : stage === 'bandstand' ? [[0, 0, 15], [3, 15, 24], [9, 24, 36], [18, 36, 45]] : [
            [0, 0, 14],
            [5, 14, 22],
            [12, 22, 27],
            [18, 27, 30],
          ];
    const walls = [], ceilings = [];
    for (const [index, p] of platforms(stage, 0).entries()) {
      if (p.thin) continue;
      for (const [i, [inset, top, bottom]] of bands.entries()) {
        const x1 = p.x1 + inset, x2 = p.x2 - inset, y = p.y + bottom;
        for (const left of [true,false]) walls.push({x:left ? x1 : x2, top:p.y+top, bottom:y, index, left});
        // A narrower band leaves a short exposed underside at each shoulder of the hull.
        const next = bands[i+1];
        if (next) ceilings.push({x1,x2:p.x1+next[0],y,index}, {x1:p.x2-next[0],x2,y,index});
        else ceilings.push({x1,x2,y,index});
      }
    }
    return {walls, ceilings};
  }
  const stageHulls = Object.fromEntries(Object.keys(arenas).map(stage => [stage, stageHull(stage)]));
  function newFighter(kind, index) {
    return {
      kind,
      index,
      stats: fighters[kind],
      kit: kits[kind],
      stocks: 3,
      damage: 0,
      moveHistory: [],
      face: index ? -1 : 1,
      prev: idleInput,
      specialFlick: null,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ground: -1,
      run: null,
      teeter: 0,
      landingAerial: '',
      stickTicks: 0,
      sprintDir: 0,
      strideDistance: 0,
      jumps: 2,
      usedUp: false,
      usedAir: false,
      usedDodge: false,
      dodgeFatigue: 0,
      usedPogo: false,
      stun: 0,
      reaction: null,
      hitShift: null,
      tumble: null,
      righting: 0,
      wallAction: null,
      usedWallKick: false,
      wallKickDir: 0,
      floorAction: null,
      techBuffer: 0,
      techLock: 0,
      invuln: 0,
      respawning: 0,
      stockLift: null,
      stockGuard: 0,
      ledge: null,
      ledgeLock: 0,
      ledgeDropJump: false,
      ledgeTime: 0,
      ledgeCatches: 0,
      airborneTime: 0,
      ledgeProtectionReady: true,
      ledgeTrump: null,
      drop: 0,
      dropPlatform: -1,
      dropPrep: null,
      airPassHold: 0,
      downTicks: 0,
      crouch: false,
      crawling: false,
      shield: false,
      shieldHP: 1,
      shieldBreak: null,
      shieldLeanX: 0,
      shieldLeanY: 0,
      shieldImpact: 0,
      shieldAxis: '',
      brakingShield: false,
      guardIntent: '',
      shieldDrop: 0,
      parryEligible: false,
      impactLag: 0,
      clashRecoil: null,
      shieldStun: 0,
      shieldGrabWindow: 0,
      parryFlash: 0,
      parryFace: index ? -1 : 1,
      dodge: 0,
      airDodge: null,
      guardAim: null,
      charge: -1,
      chargeDirection: 'neutral',
      chargeTilt: 0,
      chargeReleased: false,
      chargingCross: false,
      chargeSlide: 0,
      smashCharge: null,
      grip: null,
      regrabLock: 0,
      throwBounce: null,
      lastSmashPower: null,
      attack: null,
      lastMove: '',
      landingFollowUntil: 0,
      landingLag: 0,
      waveSlide: 0,
      takeoffWindow: 0,
      shortHopFlight: false,
      command: null,
      guardBuffer: 0,
      chainNext: 0,
      chainWindow: 0,
      followPounce: 0,
      hopWindow: 0,
      jumpBuffer: 0,
      heldRecoveryJump: false,
      queuedShortHop: false,
      footstools: 0,
      footstoolLock: 0,
      jumpSquat: null,
      fastFall: false,
      fastFallBuffer: 0,
      cutJump: false,
      coyote: 0,
      landTime: 0,
      landDuration: 0.12,
      skidTime: 0,
      skidFace: index ? -1 : 1,
      reboundTime: 0,
      reboundPose: 'special',
    };
  }
  function cancelCharge(f) {
    f.chargingCross = false;
    f.charge = -1;
    f.chargeDirection = 'neutral';
    f.chargeTilt = 0;
    f.chargeReleased = false;
    f.chargeSlide = 0;
    f.smashCharge = null;
  }
  function shieldDirection(x, y, previous) {
    // Use a lower threshold to retain an existing stick direction across small analog fluctuations.
    if (y >= (previous === 'down' ? 0.4 : 0.62) && y >= Math.abs(x) * 0.85) return 'down';
    const side = x < 0 ? 'left' : 'right';
    return Math.abs(x) >= (previous === side ? 0.4 : 0.62) ? side : '';
  }
  function downDiagonal(aim) {
    return !!aim && aim.y > 0.14 && Math.abs(aim.x) > 0.14;
  }
  function shieldDropAngle(input) {
    const side = Math.abs(input.x);
    return side >= 0.58 && input.y >= 0.58 && Math.min(side, input.y) >= Math.max(side, input.y) * 0.65;
  }
  function dodgeProgress(kit, time) {
    const [first, last] = kit.travel;
    return smoothStep((time * 60 - first + 1) / (last - first + 1));
  }
  const dodgeCatch = {reach:31, above:-16, below:78};
  const slideCarry = 1.25, slideFriction = 0.4;
  function beginAttack(f, name, aim, power, moveId) {
    cancelCharge(f);
    f.ledgeDropJump = false;
    f.heldRecoveryJump = false;
    f.run = null;
    f.lastSmashPower = null;
    f.shield = false;
    f.landTime = 0;
    f.skidTime = 0;
    f.reboundTime = 0;
    f.chainNext = 0;
    f.chainWindow = 0;
    const move =
      moves[moveId] ||
      specials[moveId] ||
      smashes[moveId] ||
      grabs[moveId] ||
      pummels[moveId] ||
      throws[moveId];
    f.attack = { name, moveId, aim, power, time: 0, hitBeat: -1, ballHit: false, fired: false, ...move };
    f.lastMove = move.label;
  }
  function ledgePosition(move, time = move.time) {
    const frame = time * 60;
    let previous = hangingFeet;
    for (const next of move.climb) {
      if (frame < next[0] - 1e-8) {
        const t = (frame - previous[0]) / (next[0] - previous[0]);
        return {
          x: previous[1] + (next[1] - previous[1]) * t,
          y: previous[2] + (next[2] - previous[2]) * t,
          planted: false,
        };
      }
      previous = next;
    }
    return { x: previous[1], y: previous[2], planted: true };
  }
  function beginLedgeAttack(f) {
    const edge = f.ledge;
    beginAttack(f, 'ledgeAttack', 0, 0, f.kit.ledgeAttack);
    f.attack.edge = edge;
    f.attack.planted = false;
    f.face = edge.left ? 1 : -1;
    f.ledge = f.command = null;
    f.jumpBuffer = f.guardBuffer = 0;
    f.ledgeLock = 0.52;
    f.invuln = Math.min(f.invuln, Math.max(0, f.attack.start - 1 / 60 - 1e-8));
  }
  function ledgeRollAction(roll, edge, maxDistance = roll.distance) {
    return {
      type: 'ledgeRoll',
      edge,
      dir: edge.left ? 1 : -1,
      time: 0,
      duration: roll.total / 60,
      plantAt: roll.plant / 60,
      arriveAt: roll.arrive / 60,
      safeFrom: roll.safe[0] / 60,
      safeUntil: (roll.safe[1] + 1) / 60,
      distance: Math.min(roll.distance, maxDistance),
    };
  }
  function ledgeRollPosition(action, time = action.time) {
    const planted = time + 1e-8 >= action.plantAt;
    return {
      x: hangingFeet[1] + (action.distance - hangingFeet[1]) * smoothStep(time / action.arriveAt),
      y: planted ? 0 : hangingFeet[2] * (1 - smoothStep(time / action.plantAt)),
      planted,
    };
  }
  function ledgeClimbPosition(kit, time, distance = kit.distance) {
    const tick = time * 60;
    if (tick + 1e-8 >= kit.plant) return { x: distance, y: 0, planted: true };
    if (tick < kit.lift) {
      const pull = smoothStep(tick / kit.lift);
      return { x: hangingFeet[1] + 6 * pull, y: hangingFeet[2] * (1 - pull), planted: false };
    }
    const step = (tick - kit.lift) / (kit.plant - kit.lift);
    return { x: -7 + (distance + 7) * smoothStep(step), y: -kit.crest * Math.sin(Math.PI * step), planted: false };
  }
  function readDashFlick(f, axis, previous) {
    const amount = Math.abs(axis);
    if (amount < 0.23 || axis * previous < 0) f.stickTicks = 0;
    if (amount < runStick || axis * f.sprintDir < 0) f.sprintDir = 0;
    if (amount >= 0.74 && (f.stickTicks < 3 || amount - Math.abs(previous) >= 0.43))
      f.sprintDir = Math.sign(axis);
    if (amount >= 0.23) f.stickTicks = Math.min(3, f.stickTicks + 1);
  }
  function moveOnFoot(f, axis, dt) {
    const kit = f.kit.footwork, dir = f.sprintDir;
    let run = f.run;
    if (dir && run && dir !== run.face) {
      if (run.age >= kit.reverseFrames / 60 - 1e-8 || run.turned) {
        // A full run must brake. The old facing remains available for a pivot grab.
        run.turned = true;
        run.grace = Math.max(0, run.grace - dt);
        f.vx = toward(f.vx, 0, kit.traction * 1.3 * dt);
        if (run.grace > 1e-8 || Math.abs(f.vx) > 1e-8) return;
      }
      run = null;
    }
    if (dir) {
      if (!run) {
        run = f.run = { face: dir, age: 0, grace: pivotWindow, turned: false };
        f.skidTime = 0;
        f.vx = dir * Math.max(kit.burst, f.vx * dir);
      }
      run.age = Math.min(1, run.age + dt);
      run.grace = pivotWindow;
      run.turned = false;
      f.vx = toward(f.vx, axis * f.stats.speed, kit.acceleration * dt);
    } else {
      if (run) {
        run.age += dt;
        run.grace -= dt;
        if (run.grace <= 1e-8 || (axis && Math.abs(f.vx) <= kit.walk)) f.run = null;
      }
      f.vx = toward(f.vx, axis * kit.walk, kit.traction * dt);
    }
  }
  function airVelocity(f, vx, axis, dt) {
    const drift = f.kit.airDrift;
    if (Math.abs(axis) < 0.12) return toward(vx, 0, drift.friction * dt);
    const target = axis * drift.speed;
    // Carry excess takeoff speed. Holding the original direction bleeds it off at the dog's air friction.
    if (vx * Math.sign(axis) > Math.abs(target)) return toward(vx, target, drift.friction * dt);
    const strength = 0.3 + 0.7 * Math.abs(axis);
    const acceleration = (vx * axis < 0 ? drift.brake : f.kit.airAccel) * strength;
    return toward(vx, target, acceleration * dt);
  }
  const boostBrake = .65, boostCarry = 1.15;
  function dashGrabReach(f, boost) {
    const grab = grabs[f.kit.dashGrab], strike = moves[f.kit.dashAttack];
    let speed = Math.abs(f.vx), travel = 0;
    if (boost) {
      speed = Math.max(0, speed * strike.carry - strike.brake / 60);
      travel = speed / 60;
    }
    speed *= boost ? Math.max(boostCarry,grab.carry) : grab.carry;
    const frames = Math.round((grab.start + grab.active) * 60);
    for (let tick = 1; tick < frames; tick++) {
      speed = Math.max(0, speed - grab.brake * (boost ? boostBrake : 1) / 60);
      travel += speed / 60;
    }
    return travel + grab.box[0] + grab.box[2];
  }
  function beginGrab(f, style, runFace, aim, shieldGrab = false, boostGrab = false) {
    const id = style === 'pivot' ? f.kit.pivotGrab : style === 'dash' ? f.kit.dashGrab : f.kit.grab;
    if (style !== 'standing') f.face = style === 'pivot' ? -runFace : runFace;
    beginAttack(f, 'grab', aim, 0, id);
    const attack = f.attack;
    attack.grabAttempt = true;
    if (f.ground < 0) attack.airGrab = true;
    attack.grabStyle = style;
    attack.runFace = runFace;
    if (boostGrab) {
      attack.boostGrab = true;
      attack.brake *= boostBrake;
      if (style === 'dash') attack.carry = Math.max(boostCarry,attack.carry);
    }
    if (shieldGrab) {
      attack.shieldGrab = true;
      attack.start += shieldGrabPenalty;
      attack.end += shieldGrabPenalty;
      f.vx = 0;
    } else if (style !== 'standing') f.vx = runFace * Math.max(0, f.vx * runFace) * attack.carry;
    else if (f.ground >= 0 && attack.step) f.vx = f.face * Math.max(attack.step, f.vx * f.face);
  }
  function forwardTiltAngle(x, y, moveX) {
    const walking = Math.abs(x) > 0.9 && Math.abs(moveX) > 0.28 && Math.abs(moveX) < 0.6;
    return Math.abs(x) > 0.28 && Math.abs(y) >= 0.27 &&
      (walking || Math.abs(y) < Math.abs(x) * 0.75) ? Math.sign(y) : 0;
  }
  function angleForwardTilt(attack, dir) {
    const shifted = ([x,y,rx,ry]) => [x - 3, y + dir * attack.angleHeight, rx, ry];
    attack.tiltAngle = dir;
    attack.box = shifted(attack.box);
    attack.angle -= dir * attack.angleChange;
    if (attack.second) attack.second = { ...attack.second, box: shifted(attack.second.box),
      angle: attack.second.angle - dir * attack.angleChange };
    if (attack.sweetSpot) attack.sweetSpot = { ...attack.sweetSpot, box: shifted(attack.sweetSpot.box) };
  }
  function groundStrike(f, side, heldFor, slideDir = 0, tiltAngle = 0) {
    const step = f.chainWindow > 0 ? f.chainNext : 0;
    const chain = f.kit.ground;
    const tilt = f.kit.tilts[side];
    const name = tilt ? 'tilt' : step === 0 ? 'jab' : step === chain.length - 1 ? 'finisher' : 'jab2';
    beginAttack(f, name, verticalAim(side), 0, tilt || chain[step]);
    // The windup begins on the press, including a tap released during recovery.
    f.attack.time = Math.min(heldFor, f.attack.start - 1 / 60);
    if (tilt) {
      f.attack.tiltSide = side;
      if (side === 'forward' && tiltAngle) {
        angleForwardTilt(f.attack, tiltAngle);
        f.lastMove += tiltAngle < 0 ? ' · high' : ' · low';
      }
      if (slideDir && f.vx * slideDir > 0) f.attack.slideDir = slideDir;
    }
    else if (step < chain.length - 1) {
      f.chainNext = step + 1;
      f.chainWindow = f.attack.end + 0.23;
    }
    if (f.attack.step) f.vx += f.face * f.attack.step;
  }
  function smashPower(heldFor) {
    return clamp(heldFor / smashChargeTime, 0, 1);
  }
  function activeArmor(f) {
    const a = f.attack;
    return f.ground >= 0 && (!f.encounter || f.encounter.kind === f.kind) && a?.armor && !a.armorSpent &&
      a.time + 1e-8 >= a.armor.first / 60 && a.time + 1e-8 < a.start ? a.armor : null;
  }
  const smashStrength = (power) => 1 + 0.4 * power;
  function lockSmash(f, button, aim, face, command) {
    const side = aim < 0 ? 'up' : aim > 0 ? 'down' : 'side';
    f.smashCharge = { moveId: f.kit.smashes[side], side, face: face || f.face, button };
    f.face = f.smashCharge.face;
    f.chargeSlide = command?.jumpSlide || 0;
    if (!f.chargeSlide) f.vx = 0;
    if (command?.fromJumpSquat) f.smashCharge.fromJumpSquat = true;
    f.shield = false;
    f.chainWindow = f.landTime = f.skidTime = 0;
  }
  function releaseSmash(f) {
    const { moveId, side, face, fromJumpSquat, spotCounter } = f.smashCharge;
    const slide = f.chargeSlide;
    const power = smashPower(f.charge);
    f.face = face;
    beginAttack(f, 'heavy', verticalAim(side), power, moveId);
    f.attack.smashSide = side;
    if (spotCounter) f.attack.spotCounter = true;
    if (fromJumpSquat) {
      f.attack.fromJumpSquat = true;
      if (slide && f.vx * slide > 0) f.attack.slideDir = slide;
    }
    f.lastSmashPower = power;
  }
  function cancelableWindup(f) {
    if (f.ground < 0 || f.stun || f.grip || f.shield || f.floorAction || f.dodge ||
        f.shieldStun || f.landingLag || f.clashRecoil || f.jumpSquat || f.smashCharge ||
        f.impactLag || f.stockLift || (f.encounter && f.encounter.kind !== f.kind)) return null;
    const a = f.attack;
    if (a) {
      if (!['jab','tilt','dash'].includes(a.name) || a.spotCounter || a.hitBeat >= 0 ||
          a.connected || a.time > 2/60 + 1e-8 || a.time + 1e-8 >= a.start) return null;
      return a.moveId;
    }
    // A held Attack tracks the jab or tilt's startup before release chooses it over a smash.
    if (f.charge < 0 || f.charge > 2/60 + 1e-8) return null;
    const id = f.kit.tilts[f.chargeDirection] || (!f.chainWindow && f.kit.ground[0]);
    return id && f.charge + 1e-8 < moves[id].start ? id : null;
  }
  function aerialStrike(f, command) {
    const side = command.airSide;
    f.face = command.facing;
    beginAttack(f, 'aerial', side === 'up' ? -1 : side === 'down' ? 1 : 0, 0, f.kit.air[side]);
    f.attack.airSide = side;
    if (f.shortHopFlight) f.attack.shortHop = true;
    if (command.fromWindup) f.attack.fromWindup = command.fromWindup;
    if (f.attack.plunge) {
      f.fastFall = false;
      f.cutJump = false;
      f.vx *= 0.35;
      f.vy = Math.min(0, f.vy);
    }
  }
  function attackWindow(attack, time = attack.time) {
    const next = attack.second || attack.late;
    return next && time + 1e-8 >= next.start ? next : attack;
  }
  function aerialHitTiming(attack, beat) {
    return attack?.airSide === 'forward' && attack.late ? (beat === attack.late ? 'late' : 'clean') : '';
  }
  function committedLanding(attack, time) {
    const frame = time * 60 + 1e-6;
    return frame >= attack.landingWindow[0] && frame < attack.landingWindow[1];
  }
  function timeToFloor(f, height) {
    const gravity = 1540 * f.kit.gravity;
    return (Math.sqrt(f.vy * f.vy + 2 * gravity * Math.max(0, height)) - f.vy) / gravity;
  }
  // The newest connection has the most weight. A shield-only entry counts half.
  const staleWeights = [90, 82, 74, 66, 58, 50, 42, 34, 26];
  function moveFreshness(f, moveId, use) {
    if (use?.moveEntry) return use.moveEntry.power;
    let deduction = 0;
    for (let i = 0; i < f.moveHistory.length; i++) {
      const entry = f.moveHistory[i];
      if (entry.moveId === moveId) deduction += staleWeights[i] * (entry.shieldOnly ? 0.5 : 1);
    }
    return (1000 - deduction) / 1000;
  }
  function scaledDamage(damage, power, use) {
    if (use?.shortHop) power *= shortHopDamage;
    return power === 1 ? damage : Math.round(damage * power * 10) / 10;
  }
  function rememberMove(f, moveId, use, power, shieldOnly) {
    if (!moveId || (f.encounter && f.encounter.kind !== f.kind)) return;
    if (use?.moveEntry) {
      if (!shieldOnly) use.moveEntry.shieldOnly = false;
      return;
    }
    const entry = { moveId, power, shieldOnly };
    if (use) use.moveEntry = entry;
    f.moveHistory.unshift(entry);
    if (f.moveHistory.length > staleWeights.length) f.moveHistory.pop();
  }
  function savedMoveHistory(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.slice(0, staleWeights.length).filter(e => e && typeof e.moveId === 'string' &&
      [moves, specials, smashes, throws, pummels].some(table => Object.hasOwn(table, e.moveId)))
      .map(e => ({ moveId: e.moveId, shieldOnly: e.shieldOnly === true }));
  }
  function strikeStrength(a) {
    if (a.smashSide) return smashStrength(a.power);
    return a.moveId === 'brisketCannon' ? 1 + a.power * 0.35 : 1;
  }
  function sweetSpotAt(f, beat, x, y) {
    if (!beat.sweetSpot) return null;
    const [sx, sy, rx, ry] = beat.sweetSpot.box;
    return Math.abs((x - f.x) * f.face - sx) <= rx && Math.abs(y - f.y - sy) <= ry ? beat.sweetSpot : null;
  }
  function isSweetPractice(d) {
    return d?.pattern === 'sweet' || d?.pattern === 'sweetAligned';
  }
  const sweetAerialSide = {pip:'up', brisket:'back', noodle:'back', clover:'back'};
  function overlapPoint(a, b) {
    const left = Math.max(a.x - a.rx, b.x - b.rx), right = Math.min(a.x + a.rx, b.x + b.rx);
    const top = Math.max(a.y - a.ry, b.y - b.ry), bottom = Math.min(a.y + a.ry, b.y + b.ry);
    return left <= right && top <= bottom ? { x: (left + right) / 2, y: (top + bottom) / 2 } : null;
  }
  function shieldBubble(f) {
    const full = Math.hypot(f.stats.width, f.stats.height * 0.43) + 5;
    return {
      x: f.x + f.shieldLeanX * f.stats.width * 0.65,
      y: f.y - f.stats.height * (0.52 - f.shieldLeanY * 0.25),
      r: full * (0.29 + 0.71 * clamp(f.shieldHP, 0, 1)),
    };
  }
  function shieldRim(b, x, y) {
    const dx = x - b.x, dy = y - b.y, length = Math.hypot(dx, dy);
    return length ? { x: b.x + dx / length * b.r, y: b.y + dy / length * b.r } : { x: b.x, y: b.y - b.r };
  }
  function canParry(f) {
    return f.parryEligible && f.ground >= 0 && f.shieldDrop > shieldDropTime - parryWindow + 1e-8;
  }
  function shieldContact(f, area) {
    if (!f.shield && !canParry(f)) return null;
    const b = shieldBubble(f);
    const x = clamp(b.x, area.x - area.rx, area.x + area.rx);
    const y = clamp(b.y, area.y - area.ry, area.y + area.ry);
    if ((x - b.x) ** 2 + (y - b.y) ** 2 > b.r ** 2) return null;
    const rim = x === b.x && y === b.y ? shieldRim(b, area.x, area.y) : shieldRim(b, x, y);
    return { x: clamp(rim.x, area.x - area.rx, area.x + area.rx), y: clamp(rim.y, area.y - area.ry, area.y + area.ry) };
  }
  // Earliest contact of a moving projectile and the circular shield during this tick.
  function shieldEntry(b, x, y, dx, dy, radius) {
    const ox = x - b.x, oy = y - b.y, c = ox * ox + oy * oy - (b.r + radius) ** 2;
    if (c <= 0) return 0;
    const speed2 = dx * dx + dy * dy, dot = ox * dx + oy * dy, disc = dot * dot - speed2 * c;
    if (!speed2 || dot >= 0 || disc < 0) return Infinity;
    const t = (-dot - Math.sqrt(disc)) / speed2;
    return t <= 1 ? t : Infinity;
  }
  // Time of first contact along the disc's path, including discs starting inside a box.
  function segmentEntry(x, y, dx, dy, box) {
    let enter = 0, leave = 1;
    for (const [origin, step, center, radius] of [[x, dx, box.x, box.rx], [y, dy, box.y, box.ry]]) {
      if (!step) {
        if (Math.abs(origin - center) > radius) return Infinity;
      } else {
        const a = (center - radius - origin) / step, b = (center + radius - origin) / step;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
      }
    }
    return enter <= leave ? enter : Infinity;
  }
  const physicalSwings = new Set(['jab', 'jab2', 'finisher', 'tilt', 'dash', 'heavy', 'aerial']);
  const physicalSpecials = new Set(['brisketCharge', 'pipSlide', 'noodleTug', 'noodleSling']);
  function canClash({ f, attack }) {
    return (!f.encounter || f.encounter.kind === f.kind) && !attack.shockwave &&
      (physicalSwings.has(attack.name) || physicalSpecials.has(attack.moveId));
  }
  function clashDamage({ f, attack, beat }, point) {
    const damage = (beat.dmg + (sweetSpotAt(f, beat, point.x, point.y)?.bonus || 0)) * strikeStrength(attack);
    return scaledDamage(damage, moveFreshness(f, attack.moveId, attack), attack);
  }
  const clashMargin = 9;
  function recoilFromClash({ f, attack }, damage, away) {
    const duration = Math.min(22, 6 + Math.round(damage * 0.85)) / 60;
    f.clashRecoil = { time: 0, duration };
    f.attack = f.run = null;
    f.chainWindow = f.chainNext = f.hopWindow = f.followPounce = 0;
    f.vx = away * (112 + 4 * Math.min(damage, 23)) / f.stats.weight;
    if (attack.plunge) f.fastFall = false;
  }
  function restoreAir(f) {
    f.shortHopFlight = false;
    f.ledgeDropJump = false;
    f.usedWallKick = false;
    f.wallKickDir = 0;
    f.footstools = 0;
    f.drop = 0;
    f.dropPlatform = -1;
    f.dropPrep = null;
    f.airPassHold = 0;
    f.crouch = f.crawling = false;
    f.jumpSquat = null;
    f.fastFall = false;
    f.fastFallBuffer = 0;
    f.jumps = 2;
    f.usedUp = false;
    f.usedAir = false;
    f.usedDodge = false;
    f.airDodge = f.guardAim = null;
    f.dodge = f.guardBuffer = 0;
    f.usedPogo = false;
    f.followPounce = 0;
    f.hopWindow = 0;
    f.cutJump = false;
    f.reboundTime = 0;
  }
  function controlsFall(f) {
    return !f.stun && !f.tumble && !f.grip && !f.ledge && !f.ledgeTrump && !f.wallAction && !f.clashRecoil && !f.shieldBreak &&
      !f.airDodge && !f.throwBounce && !f.attack?.plunge && !f.attack?.motionLocked;
  }
  function fallVelocity(f, vy, dt, controlled) {
    if (f.fastFall) return Math.max(vy, f.kit.fastFallSpeed);
    const terminal = controlled ? Math.max(vy, f.kit.fallSpeed) : 970;
    return Math.min(vy + 1540 * f.kit.gravity * dt, terminal);
  }
  function framesToApex(f) {
    return Math.max(0, Math.ceil(-f.vy * 60 / (1540 * f.kit.gravity) - 1e-8));
  }
  function canCancelMeteor(f) {
    const t = f.tumble;
    return !!t?.meteor && !t.pending && f.stun > 0 && f.vy > 0 && f.ground < 0 && (f.jumps > 0 || !f.usedUp) &&
      t.time * 60 + 1e-8 >= moves[t.meteor].meteor;
  }
  // A fading launch opens a dodge first, then a slower, closer-to-neutral aerial reply.
  function fadeWindow(time, speed, stun, aerial) {
    return stun > 1/60 + 1e-8 && stun <= (aerial ? 7 : 10)/60 + 1e-8 &&
      time + 1e-8 >= (aerial ? 17 : 14)/60 && speed <= (aerial ? 370 : 470);
  }
  function jumpRunDirection(f) {
    const run = f.run;
    return run && (run.turned || run.age + 1e-8 >= f.kit.footwork.reverseFrames / 60) &&
      f.vx * run.face >= f.kit.footwork.walk ? run.face : 0;
  }
  function bufferSquatInput(f, input) {
    const squat = f.jumpSquat;
    if (squat.time + 1e-8 >= jumpSquatTime) return;
    if (squat.runDir && (squat.turned || input.x * squat.runDir <= -runStick)) {
      squat.turned = true;
      f.face = -squat.runDir;
    }
    if (f.command?.type === 'attack') squat.aerial ??= f.command;
    // A buffered stick direction stays fixed on the screen as the dog turns underneath it.
    const aerial = squat.aerial;
    if (aerial && aerial.facing !== f.face) {
      if (aerial.airSide === 'forward') aerial.airSide = 'back';
      else if (aerial.airSide === 'back') aerial.airSide = 'forward';
      aerial.facing = f.face;
    }
    if (!input.jump || input.shortHop || squat.aerial) squat.short = true;
  }
  function bodyHeight(f) {
    const action = f.floorAction;
    if (!action && f.ground >= 0 && f.crouch && f.crawling) return f.kit.crawl.height;
    if (!action || action.safeFrom !== undefined)
      return f.ground >= 0 && (f.crouch || (f.stun > 0 && f.reaction?.planted)) ? f.stats.height * 0.68 : f.stats.height;
    if (action.type === 'downed') return f.stats.height * 0.42;
    const rise = clamp((action.time / action.duration - 0.55) / 0.45, 0, 1);
    return f.stats.height * (0.55 + 0.45 * rise);
  }
  function comboExample(kind, tick, late) {
    if (late) return { ...idleInput, attack: tick === 0 || tick === 30 };
    switch (kind) {
      case 'brisket': return { ...idleInput, attack: tick === 0, grab: tick === 11, x: tick === 25 ? 1 : 0 };
      case 'noodle': return { ...idleInput, attack: tick === 0 || tick === 11, special: tick === 22 };
      case 'clover': return { ...idleInput, attack: [0,10,20].includes(tick), jump: tick === 20 };
      default: return { ...idleInput, attack: [0,9,17].includes(tick), jump: tick === 17, x: tick === 17 ? 1 : 0 };
    }
  }
  function comboHopInput(kind, tick, slot) {
    const landing = kind === 'brisket' ? 27 : 34;
    return {...idleInput, jump:tick === 0, shortHop:tick === 0,
      attack:slot === 0 && tick === landing - 8,
      grab:slot === 1 && tick === landing - 2, x:slot === 1 && tick === landing + 26 ? 1 : 0};
  }
  class Battle {
    constructor(config, event = () => {}, random = Math.random) {
      this.stage = config.stage;
      this.coats = [0,1].map(i => validCoat(config.coats?.[i]) ? config.coats[i] : 0);
      if(config.mode==='training' && Object.hasOwn(warmupPartners,config.warmupPartner))this.warmupPartner=config.warmupPartner;
      this.form = (config.mode === 'solo' || config.mode === 'local' || this.warmupPartner) && config.lesson === undefined &&
        Object.hasOwn(stageForms, config.form) ? config.form : 'original';
      this.layout = config.layout || null;
      this.stageWidth = this.layout?.length || 1200;
      this.mode = config.mode;
      this.cpuLevel = config.mode === 'solo' && Object.hasOwn(cpuLevels, config.cpuLevel) ? config.cpuLevel : 'arcade';
      this.fetch = config.fetch;
      this.time = 0;
      this.end = null;
      this.endReason = '';
      this.matchFrames = 0;
      this.suddenDeath = null;
      const versus = this.mode === 'solo' || this.mode === 'local';
      if(versus && config.lesson===undefined && !config.suddenStart && !config.lastStockStart && validRelayTeams(config.relayTeams)){
        this.relayTeams=config.relayTeams.map(team=>team.slice());
        this.relayCoats=relayCoats(this.relayTeams,config.coatBook);
        this.coats=this.relayCoats.map(team=>team[0]);
      }
      const timed=versus && !this.relayTeams && config.timeBattle===true && config.lesson===undefined && !config.lastStockStart && !config.suddenStart;
      const minutes = timed && !config.minutes ? 3 : stockMinutes.includes(config.minutes) ? config.minutes : 7;
      this.clockFrames = versus && minutes ? minutes * 3600 : null;
      this.emit = event;
      this.random = this.mode === 'training' && random === Math.random
        ? seededRandom(Math.floor(random() * 0x100000000)) : random;
      this.dogs = [newFighter(this.relayTeams?.[0][0] || config.p1,0),newFighter(this.relayTeams?.[1][0] || config.p2,1)];
      this.stockCount=versus && !timed && !this.relayTeams && config.lesson===undefined && !config.schoolFinal &&
        validStockCount(config.stockCount)?config.stockCount:3;
      if(versus && !this.relayTeams && config.lesson===undefined && !config.schoolFinal && !config.suddenStart &&
        !config.lastStockStart && validHandicap(config.spawnDamage) && config.spawnDamage.some(Boolean))
        this.spawnDamage=config.spawnDamage.slice();
      for(const f of this.dogs)f.stocks=this.stockCount;
      this.terrain = this.layout?.terrain || platforms(this.geometryStage, 0);
      this.ledgeClaims = [];
      this.grapple = null;
      this.projectiles = [];
      this.ball = null;
      this.nextBall = 4;
      this.trainingDamage = 0;
      this.wallPractice = null;
      this.trumpPractice = null;
      this.rollPractice = null;
      this.climbPractice = null;
      this.launchPractice = null;
      this.meteorPractice = null;
      this.stockPractice = null;
      this.survivalPractice = null;
      this.shieldPractice = null;
      this.footworkPractice = null;
      this.freshnessPractice = null;
      this.wavePractice = null;
      this.escapePractice = null;
      this.platformPractice = null;
      this.spacingPractice = null;
      this.chasePractice = null;
      this.airPractice = null;
      this.lastCombo = { hits: 0, damage: 0 };
      this.hitStop = 0;
      this.finalHitHold = 0;
      this.resetCpu();
      if (this.cpuLevel === 'rival' && config.rivalRead) this.bot.shieldHabit = {...config.rivalRead};
      if (this.mode === 'training') this.resetTraining();
      else if (versus && config.suddenStart) this.startSuddenDeath();
      else for (const f of this.dogs) {
        this.spawn(f, false);
        if (versus && config.lastStockStart) { f.stocks = 1; f.damage = 125; }
      }
      if (config.underTableStart && this.mode === 'solo' && this.geometryStage === 'picnic') {
        const [hero, guard] = this.dogs, floor = this.terrain[0];
        Object.assign(hero, {x:floor.x1+23, y:floor.y+40+hero.stats.height, ground:-1, jumps:1, damage:90, face:-1});
        Object.assign(guard, {x:floor.x1+65, y:floor.y, ground:0, face:-1});
      }
      if (config.ledgeTrapStart && this.mode === 'solo') {
        const floor = this.terrain[0];
        this.setLedgeTrap({index:0, left:true, x:floor.x1, y:floor.y});
      }
      if (config.highReturn && this.mode === 'solo') this.placeHighReturn(config.highReturn);
      if(config.scoutedRoll && this.mode==='solo' && this.cpuLevel==='rival'){
        const left=config.scoutedRoll.side!=='right', floors=this.terrain.filter(p=>!p.thin);
        const floor=left?floors[0]:floors.at(-1);
        const edge={index:this.terrain.indexOf(floor),left,x:left?floor.x1:floor.x2,y:floor.y};
        this.hangLedge(this.dogs[0],edge);
        this.placeRollGuard(edge);
        this.bot.rollHabit={count:2,delay:config.scoutedRoll.delay};
      }
      if (config.driveOpening && this.mode === 'solo') this.placeDriveFighters(config.driveOpening.edge, config.driveOpening.damage);
      if(this.mode==='solo' && this.stage==='nightmail' && this.form==='trio' && ['perch','edge'].includes(config.throwOpening)){
        const [p,guard]=this.dogs,perch=config.throwOpening==='perch';
        const ground=perch?3:0,floor=this.terrain[ground],face=perch?-1:1,x=perch?(floor.x1+floor.x2)/2:floor.x1+30;
        Object.assign(guard,{x,y:floor.y,ground,face});
        Object.assign(p,{x:x+face*(guard.stats.width+p.stats.width+2),y:floor.y,ground,face:-face,damage:perch?110:80});
        beginGrab(guard,'standing',0,0);
      }
      if (config.dodgeReturn && this.mode === 'solo') this.placeLastDodge(config.dodgeReturn.side, config.dodgeReturn.wide, 1);
      if (config.shieldLanding && this.mode === 'solo') {
        const {dir,cross} = config.shieldLanding;
        const opening = new Battle({...config,mode:'local'},undefined,this.random);
        opening.cpuLevel = this.cpuLevel;
        opening.placeShieldLanding(1,dir,cross);
        for (let i=0;i<16 && !opening.dogs[1].shieldStun;i++)
          opening.step(1/60,opening.landingApproach(dir,i===0),{...idleInput,shield:true});
        opening.mode = this.mode;
        opening.clockFrames = this.clockFrames;
        opening.matchFrames = 0;
        this.copyFightFrom(opening);
      }
      if (config.interruptedReturn && this.mode === 'solo') {
        const {side,slot} = config.interruptedReturn;
        const opening = new Battle({...config,mode:'local'}, undefined, this.random);
        opening.playRecoveryOpening(side,slot);
        opening.mode = this.mode;
        opening.cpuLevel = this.cpuLevel;
        opening.bot = this.bot;
        opening.clockFrames = this.clockFrames;
        opening.matchFrames = 0;
        this.copyFightFrom(opening);
      }
      this.matchCard = versus && config.lesson === undefined ? {
        players:this.dogs.map(f => ({kind:f.kind, coat:this.coatFor(f.index), damage:0, hits:0, blocks:0, parries:0,
          techs:0, knockdowns:0, shieldBreaks:0, lastHit:null})),
        losses:[],
        ...(this.stockCount!==3?{stockCount:this.stockCount}:{}),
        ...(this.spawnDamage?{handicap:this.spawnDamage.slice()}:{}),
        ...(this.relayTeams ? {relayTeams:this.relayTeams,relayDamage:[[0,0,0],[0,0,0]]} : {}),
        ...(timed ? {points:[0,0],minutes} : {}),
      } : null;
    }
    get geometryStage() { return stageGeometry(this.stage, this.form); }
    coatFor(slot) {
      return this.mode === 'adventure' ? 0 : coatFor(slot,this.dogs[0].kind,this.dogs[1].kind,this.coats);
    }
    resetCpu() {
      const memory = this.bot;
      this.bot = {timer:0, pulse:{}, hold:0, guard:0, landingGuardUntil:0, jumpHold:0, hop:null, hopDelay:0, smashHold:0};
      if (memory) for (const key of ['shieldHabit','spotReads','spotBaits','spotPunishes','rollReads','rollPunishes','rollHabit','ledgeRollReads','ledgeRollCatches'])
        if (memory[key] !== undefined) this.bot[key] = memory[key];
    }
    spawn(f, fromKO, useLift = this.mode !== 'training' || !!this.stockPractice) {
      if (this.matchCard) this.matchCard.players[f.index].lastHit = null;
      if (fromKO && (this.mode === 'solo' || this.warmupPartner==='spar')) {
        this.bot.pressure = null;
        this.bot.ledgeReturn = null;
        this.bot.ledgeTrap = null;
        this.bot.rollForecast = null;
        this.bot.jumpIn = null;
        this.bot.shieldWatch = 0;
        this.bot.rookieNext = 0;
      }
      if (this.grapple && (this.dogs.length === 2 || f.grip)) this.breakGrapple(false);
      const point = this.layout?.spawns[f.index];
      const ground = point ? point.ground : this.geometryStage === 'laundry' && f.index === 1 ? 1 : 0;
      const stocks = f.stocks, previous = f.prev;
      Object.assign(f, newFighter(f.kind, f.index));
      f.stocks = stocks;
      if(this.spawnDamage && !this.suddenDeath)f.damage=this.spawnDamage[f.index];
      f.x = point?.x ?? arenas[this.geometryStage].spawn[f.index];
      f.y = this.terrain[ground].y;
      f.ground = ground;
      if (f.index === 1) {
        this.bot.edgeHop = null;
        this.bot.juggleRead = this.bot.driftEscape = null;
        this.bot.jumpHold = 0;
        this.bot.hop = null;
        this.bot.platformRoute = null;
        this.bot.ascent = null;
        this.bot.wavePlatform = null;
        this.bot.backAir = null;
        this.bot.specialTurn = null;
        this.bot.passRead = null;
        this.bot.rollChase = null;
        this.bot.lastRoll = 0;
        this.bot.punishedTech = null;
        this.bot.climbRead = null;
        this.bot.guardRead = null;
        this.bot.airRead = null;
      }
      if (fromKO) {
        if (previous) f.prev = previous;
        if (useLift) this.beginStockReturn(f);
        else {
          f.invuln = 1.55;
          f.respawning = 0.42;
        }
      }
      if (this.mode === 'training' && f.index === 1) f.damage = this.trainingDamage;
    }
    beginStockReturn(f, lane = f.index) {
      const ground = this.layout?.spawns[lane]?.ground ?? (this.geometryStage === 'laundry' && lane === 1 ? 1 : 0);
      const floor = this.terrain[ground], middle = (floor.x1 + floor.x2) / 2;
      const x = this.terrain.filter(p => !p.thin).length > 1 ? middle :
        clamp(middle + (lane ? 62 : -62), floor.x1 + f.stats.width, floor.x2 - f.stats.width);
      let landing = ground;
      let clearance = floor.y - 146;
      for (const [i, p] of this.terrain.entries())
        if (x >= p.x1 && x <= p.x2) {
          clearance = Math.min(clearance, p.y - 78);
          if (p.y < this.terrain[landing].y && (this.layout || i !== arenas[this.geometryStage]?.movingPlatform)) landing = i;
        }
      const y = clearance;
      f.stockLift = { x, y, landing, time: 0, ready: false, exit: null };
      f.x = x; f.y = y - 80;
      f.vx = f.vy = f.invuln = f.stockGuard = 0;
      f.face = lane ? -1 : 1;
      f.ground = -1;
      f.jumps = 1;
      f.respawning = liftArrival + liftWait;
      this.emit('stockLift', { f, point: { x, y } });
    }
    advanceStockReturn(f, input, dt) {
      const lift = f.stockLift;
      lift.time += dt;
      f.respawning = Math.max(0, liftArrival + liftWait - lift.time);
      const descent = Math.min(1, lift.time / liftArrival);
      f.x = lift.x;
      f.y = lift.y - 80 * (1 - descent) ** 2;
      if (lift.time + 1e-8 < liftArrival) return false;
      if (!lift.ready) {
        lift.ready = true;
        this.emit('stockReady', { f, point: { x: f.x, y: f.y } });
      }
      if (!lift.exit && f.respawning > 1e-8) return false;
      const exit = lift.exit, option = exit?.option || 'auto', frames = liftReserve(lift.time);
      f.stockLift = null;
      f.respawning = 0;
      f.stockGuard = frames / 60;
      f.vx = (exit?.input.x || 0) * f.kit.airDrift.speed * 0.72;
      f.vy = option === 'jump' ? -f.stats.jump * 0.88 : option === 'drop' ? 285 : 88;
      if (option === 'step') f.face = Math.sign(f.vx);
      f.cutJump = option === 'jump';
      if (exit && Object.keys(exit.input.tapped).length) {
        const command = { ...exit.input, jump: false, tapped: { ...exit.input.tapped, jump: false } };
        this.captureInput(f, command);
        f.prev = { ...input };
      }
      if (option === 'jump') this.emit('jump', { f });
      const drill = this.stockPractice;
      if (drill?.slot === f.index && drill.phase === 'active') {
        drill.frames = frames;
        drill.option = option;
      }
      this.emit('stockLeave', { f, option, frames, point: { x: lift.x, y: lift.y } });
      return true;
    }
    setDummyDamage(value) {
      const damage = clamp(Number(value) || 0, 0, 200);
      const lab = this.freshnessPractice;
      if (lab?.drive) return this.resetDrivePractice(lab.drive.edge, damage);
      if (lab) return this.resetFreshnessPractice(true, lab.guard, lab.koTest, damage, lab.rageDamage);
      this.trainingDamage = damage;
      this.dogs[1].damage = this.trainingDamage;
      this.lastCombo = { hits: 0, damage: 0 };
    }
    resetTraining(ledge = false, fromHang = false, needsPlatforms = false) {
      this.trainingPartner = false;
      if (this.grapple) this.breakGrapple(false);
      if (this.launchPractice?.original) {
        this.dogs = this.launchPractice.original.dogs;
        this.stage = this.launchPractice.original.stage;
        this.terrain = platforms(this.geometryStage, this.time);
      }
      if (this.meteorPractice) this.dogs = this.meteorPractice.originalDogs;
      if (this.freshnessPractice?.original) {
        this.dogs = this.freshnessPractice.original.dogs;
        this.trainingDamage = this.freshnessPractice.original.damage;
      }
      if (this.footworkPractice) this.dogs = this.footworkPractice.originalDogs;
      if (this.airPractice?.originalDogs) this.dogs = this.airPractice.originalDogs;
      if (this.comboPractice?.originalDogs) this.dogs = this.comboPractice.originalDogs;
      if (this.climbPractice?.originalDogs) this.dogs = this.climbPractice.originalDogs;
      if (this.spacingPractice?.originalDogs) this.dogs = this.spacingPractice.originalDogs;
      if (this.escapePractice) this.dogs = this.escapePractice.originalDogs;
      if (this.shieldPractice?.originalDogs) this.dogs = this.shieldPractice.originalDogs;
      if (this.platformPractice?.originalStage) {
        this.stage = this.platformPractice.originalStage;
        this.terrain = platforms(this.geometryStage, this.time);
      }
      if (this.wallPractice) {
        this.stage = this.wallPractice.original.stage;
        this.dogs = this.wallPractice.original.dogs;
        this.terrain = platforms(this.geometryStage, this.time);
        this.wallPractice = null;
      }
      if (this.practiceHomeStage) {
        this.stage = this.practiceHomeStage;
        this.terrain = platforms(this.geometryStage, this.time);
        this.practiceHomeStage = null;
      }
      if (needsPlatforms && this.terrain.length < 3) {
        this.practiceHomeStage = this.stage;
        this.stage = 'picnic';
        this.terrain = platforms(this.geometryStage, this.time);
      }
      this.ledgeClaims.length = 0;
      this.trumpPractice = null;
      this.rollPractice = null;
      this.climbPractice = null;
      this.launchPractice = null;
      this.meteorPractice = null;
      this.stockPractice = null;
      this.survivalPractice = null;
      this.shieldPractice = null;
      this.footworkPractice = null;
      this.freshnessPractice = null;
      this.wavePractice = null;
      this.escapePractice = null;
      this.platformPractice = null;
      this.spacingPractice = null;
      this.chasePractice = null;
      this.airPractice = null;
      this.dogs.forEach((f) => this.spawn(f, false));
      this.comboPractice = null;
      this.bot.blockedSwing = null;
      this.edgePractice = null;
      this.projectiles = [];
      this.ball = null;
      this.nextBall = 4;
      this.hitStop = 0;
      this.finalHitHold = 0;
      this.lastCombo = { hits: 0, damage: 0 };
      if (ledge) {
        const [f, dummy] = this.dogs;
        const left = ledge !== 'right';
        const solid = this.terrain.filter((p) => !p.thin);
        const floor = left ? solid[0] : solid[solid.length - 1];
        const edge = { x: left ? floor.x1 : floor.x2, y: floor.y, index: this.terrain.indexOf(floor), left };
        const face = left ? 1 : -1;
        const strike = moves[f.kit.ledgeAttack];
        const spacing = ledgePosition(strike, strike.start).x + strike.box[0] + strike.box[2];
        Object.assign(dummy, { x: edge.x + face * spacing, y: floor.y, ground: edge.index, face: -face });
        if (fromHang) this.hangLedge(f, edge);
        else Object.assign(f, { x: edge.x - face * 68, y: floor.y + 65, face, ground: -1, jumps: 1 });
        return edge;
      } else {
        const [player, dummy] = this.dogs,
          surface = this.terrain[0];
        player.x = (surface.x1 + surface.x2) / 2 - 28;
        dummy.x = player.x + player.stats.width + dummy.stats.width + 3;
        dummy.ground = player.ground = 0;
        dummy.y = player.y = surface.y;
      }
    }
    resetEdgePractice(pattern = 'lip', dir = 1, slow = true) {
      const timeCatch = pattern === 'shortCatch' || pattern === 'longCatch';
      const corner = pattern === 'corner' || pattern === 'inside';
      const atDeck = pattern === 'lip' || timeCatch || corner;
      this.resetTraining(false, false, !atDeck);
      const [f, rival] = this.dogs;
      const deck = this.geometryStage === 'laundry' && (!atDeck || dir > 0) ? 1 : 0;
      const ground = atDeck ? deck : this.geometryStage === 'laundry' ? 3 : dir > 0 ? 1 : 2;
      const surface = this.terrain[ground], lip = dir > 0 ? surface.x2 : surface.x1;
      this.edgePractice = { pattern, dir, slow, ground, lip, timeCatch, phase: 'ready', ticks: 0, landed: false, frames: 0, outcome: '' };
      if (corner) {
        const mark = lip - dir * (pattern === 'corner' ? 0 : 27);
        Object.assign(this.edgePractice, { corner, mark, blocked:false, slipped:false, cue:false });
        Object.assign(f, { x:mark, y:surface.y, ground, face:-dir });
        Object.assign(rival, { x:mark - dir * (f.stats.width + rival.stats.width + 8), y:surface.y, ground, face:dir });
      } else if (timeCatch) {
        Object.assign(f, { x: lip - dir * 6, y: surface.y, ground, face: dir });
        const long = pattern === 'longCatch';
        Object.assign(rival, { x: lip + dir * 22, y: surface.y - (long ? 120 : 6),
          vy: long ? -420 : 110, ground: -1, face: -dir, jumps: 1 });
      } else if (pattern === 'lip') {
        Object.assign(f, { x: lip - dir * 40, y: surface.y, ground, face: dir });
        this.hangLedge(rival, { index: ground, x: lip, y: surface.y, left: dir < 0 });
      } else {
        const distance = pattern === 'deep' ? 63 : 31;
        Object.assign(f, { x: lip - dir * distance, y: surface.y - 30, ground: -1, vx: dir * 260, vy: 150, jumps: 1, face: dir });
        Object.assign(rival, { x: lip + dir * 58, y: this.terrain[deck].y, ground: deck, face: -dir });
      }
    }
    edgeRivalInput() {
      const d = this.edgePractice, [f, rival] = this.dogs;
      if (d.phase === 'done') return idleInput;
      d.ticks++;
      if (d.corner) {
        if (d.ticks <= 36) return { ...idleInput, smash:true, smashX:d.dir };
        const attack = rival.attack;
        if (!d.cue && attack?.smashSide && attack.start - attack.time <= 4 / 60 + 1e-8) {
          d.cue = true;
          this.emit('cornerCue', { f:rival });
        }
        return idleInput;
      }
      if (d.timeCatch) {
        if (rival.ledge && rival.ledgeTime * 60 >= d.guardFrames + 10 - 1e-8)
          return { ...idleInput, shield: true, tapped: { shield: true } };
        return idleInput;
      }
      if (d.pattern !== 'lip') return idleInput;
      if (d.phase === 'approach' && (f.x - d.lip) * d.dir >= -4) {
        d.phase = 'atLip';
        d.ticks = 0;
      }
      if (d.phase !== 'atLip') return idleInput;
      if (d.ticks === 16) {
        this.emit('edgeCue', { f: rival });
        return { ...idleInput, y: 1 };
      }
      if (d.ticks === 17) return { ...idleInput, jump: true };
      if (d.ticks === 26) return { ...idleInput, attack: true };
      return idleInput;
    }
    finishEdgePractice(outcome, moveId) {
      const d = this.edgePractice;
      if (!d || d.phase === 'done') return;
      d.phase = 'done';
      d.outcome = outcome;
      this.emit('edgeResult', { f: this.dogs[0], outcome, moveId, frames: d.frames });
    }
    checkEdgePractice() {
      const d = this.edgePractice, [f,rival] = this.dogs;
      if (d.phase === 'done') return;
      if (d.corner) {
        if (d.slipped) {
          if (f.ledge) this.finishEdgePractice('caughtLip');
          else if (f.ground >= 0) this.finishEdgePractice('backOnstage');
          else if (d.ticks > 180 || f.y > this.terrain[d.ground].y + 150) this.finishEdgePractice('pushedOff');
        } else if (d.blocked && f.impactLag <= 1e-8 && f.shieldStun <= 1e-8) this.finishEdgePractice('heldCorner');
        else if (d.ticks > 100 && !d.blocked) this.finishEdgePractice('avoided');
        return;
      }
      if (d.timeCatch) {
        if (rival.ledge && !rival.invuln && d.phase === 'hanging') {
          d.phase = 'open';
          this.emit('edgeOpen', { f: rival });
        } else if (d.guardFrames && !rival.ledge) this.finishEdgePractice(d.earlyFrames ? 'tooEarly' : 'rolledAway');
        return;
      }
      if (d.pattern === 'lip') {
        if (f.ledge && !rival.ledge) this.finishEdgePractice('claimed');
        else if (d.phase === 'approach' && !rival.ledge) this.finishEdgePractice('waited');
        else if (d.phase === 'atLip' && d.ticks > 70) this.finishEdgePractice('missed');
        return;
      }
      if (f.ground === d.ground) {
        if (!d.landed) { d.landed = true; this.emit('edgeLand', { f }); }
        if (f.landingLag <= 1e-8) this.finishEdgePractice('settled');
      } else if ((d.landed && (f.ground >= 0 || f.ledge)) || d.ticks > 100) this.finishEdgePractice('missed');
      else if (!d.landed && f.y > this.terrain[d.ground].y + 5) this.finishEdgePractice('overshot');
    }
    get trainingPlayerSlot() { return this.comboPractice?.defending ? 1 : 0; }
    get hasSecondPlayer() {
      return this.mode === 'local' || (this.mode === 'training' && (this.trainingPartner ||
        (this.comboPractice?.reply === 'p2' && !this.comboPractice.defending)));
    }
    copyFightFrom(source) {
      const {emit, random, ...state} = source;
      // Copy one graph so both ends of a grab and fighter keys in hit ledgers stay linked.
      Object.assign(this, structuredClone(state));
      this.random.state = random.state;
    }
    saveTrainingMoment() {
      // Copy one graph. Both dogs can share a grip, and some hit ledgers refer to a fighter by identity.
      const {dogs, terrain, ledgeClaims, grapple, projectiles, ball, nextBall, hitStop, finalHitHold,
        time, trainingDamage, lastCombo, bot} = this;
      return {seed:this.random.state, state:structuredClone({dogs, terrain, ledgeClaims, grapple, projectiles,
        ball, nextBall, hitStop, finalHitHold, time, trainingDamage, lastCombo, bot})};
    }
    restoreTrainingMoment(moment) {
      Object.assign(this,structuredClone(moment.state));
      if (moment.seed !== undefined) this.random.state = moment.seed;
    }
    resetComboPractice(source = 'record', reply = 'stand', slow = true, slot = this.comboPractice?.slot ?? 0, advance = false) {
      const previous = this.comboPractice;
      this.comboTakes ??= [null,null];
      const tape = this.comboTakes[slot];
      const flurry = source === 'flurry' || source === 'escapeFlurry';
      const defending = source === 'defend' || source === 'mix' || source === 'escapeFlurry';
      const markTime = this.comboMarkTime ??= this.time;
      this.resetTraining();
      this.time = markTime;
      this.terrain = this.layout?.terrain || platforms(this.geometryStage, markTime);
      const originalDogs = flurry && this.dogs[0].kind !== 'pip' ? this.dogs : null;
      if (originalDogs) {
        const [lead, rival] = originalDogs, pip = newFighter('pip',0);
        Object.assign(pip,{x:lead.x,y:lead.y,ground:lead.ground});
        rival.x = pip.x + pip.stats.width + rival.stats.width + 3;
        this.dogs = [pip,rival];
      }
      if (source === 'replay' && !tape?.length) source = 'record';
      const prior = previous && (previous.phase === 'done' || previous.contacts.length) ? { source: previous.source, reply: previous.reply,
        slot:previous.playSlot ?? previous.slot, hits: previous.hits, damage: previous.damage, baseline: previous.baseline } : previous?.prior;
      this.comboPractice = { source, reply, slow, markTime, slot, defending, originalDogs, phase: source === 'record' || source === 'throwChase' || flurry || defending ? 'ready' : 'active',
        tape: source === 'replay' ? tape : [], saved: tape, baseline: this.trainingDamage, prior,
        tick: 0, clock: 0, contacts: [], hits: 0, damage: 0, firstFree: null, shifts: 0, dodges: 0 };
      if(source==='confirm')window.ComboLab.startConfirm(this,advance?previous?.series:null);
    }
    comboPlayerInput(input) {
      const d = this.comboPractice;
      if (d.phase === 'done') return null;
      if(d.source==='confirm')return window.ComboLab.confirmInput(this,input);
      if (d.phase === 'ready') {
        if(d.source==='throwChase'){
          if(!input.attack && !input.tapped?.attack)return null;
          d.consumeAttack=true;
        }
        if (!input.x && !input.y && !['attack','special','grab','jump','shortHop','shield','smash','aimStick']
            .some(key => input[key] || input.tapped?.[key])) return null;
        d.phase = 'active';
      }
      const tick = d.tick++;
      if(d.source==='throwChase'){
        if(tick>=210){d.phase='done';return null;}
        if(d.consumeAttack){
          d.consumeAttack=!!input.attack;
          input={...input,attack:false,tapped:{...input.tapped,attack:false}};
        }
        if(d.thrown)return input;
        return {...idleInput,grab:tick===0,y:this.grapple?.phase==='hold'?-1:0};
      }
      const length = d.defending ? d.tape.length || 80 : d.source === 'record' || d.source === 'flurry' ? 150 : d.source === 'replay' ? d.tape.length : 55;
      if (tick >= length + 60) { d.phase = 'done'; return null; }
      if (tick >= length) return idleInput;
      if (d.source === 'flurry') return input;
      if (d.source === 'escapeFlurry') return {...idleInput,quickAttack:true,attack:tick === 0 || tick >= 9};
      if (d.defending) return d.tape[tick] || comboHopInput(this.dogs[0].kind, tick, d.playSlot);
      if (d.source === 'replay') return d.tape[tick];
      if (d.source !== 'record') return comboExample(this.dogs[0].kind, tick, d.source === 'late');
      d.tape.push({ ...input, tapped: { ...input.tapped } });
      if (tick === 0) this.comboTakes[d.slot] = d.saved = d.tape;
      return input;
    }
    comboRivalInput(dt, frozen) {
      const d = this.comboPractice, rival = this.dogs[1];
      if(d.source==='confirm')return d.guard && (this.dogs[0].attack || d.opening)?{...idleInput,shield:true}:idleInput;
      if (d.reply === 'punish') {
        if (rival.grip?.owner === rival.index && rival.grip.phase === 'hold')
          return {...idleInput, x:rival.face, grabX:rival.face};
        return this.shieldPunishInput(rival,this.dogs[0]) || {...idleInput, shield:rival.ground >= 0};
      }
      if (!d.contacts.length || rival.grip) return idleInput;
      if (d.reply === 'away' && frozen)
        return { ...idleInput, x: Math.sign(rival.x - this.dogs[0].x) || this.dogs[0].face };
      if (d.reply !== 'guard') return idleInput;
      if (rival.ground >= 0) return { ...idleInput, shield: true };
      if (frozen || (rival.stun > dt + 1e-8 && !this.canEscapeHitstun(rival,false)) ||
          rival.usedDodge || rival.airDodge || rival.ledge) return idleInput;
      return { ...idleInput, shield: true, tapped: { shield: !rival.guardBuffer } };
    }
    comboContact(target, kind, moveId, damage = 0) {
      const d = this.comboPractice;
      if ((d?.defending || d?.reply === 'punish' || d?.reply === 'p2') && d.phase === 'active' && target.index === 0 && !d.counter &&
          (kind === 'hit' || kind === 'grab' || kind === 'throw'))
        d.counter = {kind, moveId, damage};
      if (!d || d.phase !== 'active' || target.index !== 1) return;
      const gap = !d.contacts.length ? null : d.firstFree === null ? 0 : d.clock - d.firstFree + 1;
      d.contacts.push({ kind, moveId, damage, gap });
      if(d.source==='confirm')window.ComboLab.confirmContact(this,kind,moveId);
      if(d.source==='throwChase'){
        if(kind==='throw')d.thrown=true;
        else if(d.thrown && kind==='hit' && target.ground<0 && !d.outcome){
          d.outcome='caught';d.followup=moveId;d.phase='done';
        }
      }
      d.firstFree = null;
      if (kind !== 'grab' && kind !== 'block' && kind !== 'parry') { d.hits++; d.damage += damage; }
    }
    resetLaunchPractice(pattern, dir = 1, slow = true, chase = false) {
      const pauseAtWindow = this.launchPractice?.pauseAtWindow ?? true;
      this.resetTraining();
      if (pattern === 'breakaway') {
        const original = {dogs:this.dogs,stage:this.stage};
        this.stage = 'nightmail';
        this.terrain = platforms(this.geometryStage,this.time);
        const player = newFighter('clover',0), rival = newFighter('pip',1), y = this.terrain[0].y;
        this.dogs = [player,rival];
        Object.assign(rival,{x:600,y,ground:0,face:dir});
        Object.assign(player,{x:600+dir*(rival.stats.width+player.stats.width+2),y,ground:0,face:-dir,damage:153});
        this.launchPractice = {original,pattern,dir,slow,late:chase,pauseAtWindow,phase:'waiting',frame:0,opened:false};
        return;
      }
      if (pattern === 'juggle') {
        const original = { dogs: this.dogs, stage: this.stage };
        this.stage = 'picnic';
        this.terrain = platforms(this.geometryStage, this.time);
        const player = this.dogs[0], rival = newFighter('brisket', 1), floor = this.terrain[0];
        this.dogs = [player,rival];
        Object.assign(rival, { x:600, y:floor.y, ground:0, face:dir });
        Object.assign(player, { x:600 + dir*(rival.stats.width + player.stats.width + 3), y:floor.y,
          ground:0, face:-dir, damage:80 });
        this.launchPractice = { original, pattern, dir, chase, slow, floor:0, origin:rival.x, phase:'waiting', time:0, grabStarted:false };
        return;
      }
      this.dogs[0].damage = 90;
      this.launchPractice = { phase: 'ready', time: 0, grabStarted: false };
    }
    resetSurvivalPractice(dir = 1, slow = true, damage, study = this.survivalPractice?.study ?? false,
        pattern = this.survivalPractice?.pattern ?? 'survival') {
      this.resetTraining();
      const [dog, rival] = this.dogs;
      const ground = this.terrain.reduce((best, surface, i, all) => {
        if (surface.thin) return best;
        return (dir > 0 ? surface.x2 > all[best].x2 : surface.x1 < all[best].x1) ? i : best;
      }, 0);
      const floor = this.terrain[ground], lip = dir > 0 ? floor.x2 : floor.x1;
      const gap = dog.stats.width + rival.stats.width + 2;
      const forehand = rival.kind === 'clover', face = forehand ? dir : -dir;
      const moveId = rival.kit.throws[forehand ? 'forward' : 'back'];
      // The distance from the outside lip to the blast line differs on each stage.
      // Start each matchup at the first few percent where its actual throw threatens a stock.
      const speeds = {
        picnic: { pip: 745.6, brisket: 824, noodle: 672, clover: 763 },
        laundry: { pip: 699, brisket: 746, noodle: 608, clover: 707 },
        bandstand: { pip: 854.4, brisket: 938, noodle: 792, clover: 871 },
      };
      const move = throws[moveId];
      // The canal gate and mail car share the picnic table's lip and blast lines.
      const launchSpeed = (speeds[this.stage] ?? speeds.picnic)[rival.kind];
      const percent = Math.ceil((launchSpeed * dog.stats.weight - move.base) / move.growth - move.dmg);
      const baseline = clamp(Math.round(damage ?? percent), 0, 200);
      Object.assign(rival, { x: lip - dir * (forehand ? 64 : 14), y: floor.y, face, ground });
      Object.assign(dog, { x: rival.x + face * gap, y: floor.y, face: -face, ground, damage: baseline });
      this.survivalPractice = { pattern, dir, slow, baseline, ground, lip, phase: 'ready', ticks: 0, moveId,
        grabSent: false, released: false, free: false, angle: 0, scale: 1, zone: '', outcome: '', trace: [], previous: null,
        study, preview:null, lockedAim:null, studyPressed:false };
    }
    studySurvivalLaunch(d, input) {
      const f = this.dogs[0], prior = d.preview;
      if (!prior || input.x !== prior.aim.x || input.y !== prior.aim.y) {
        const aim = { x:input.x, y:input.y };
        const velocity = launchInfluence(f.vx, f.vy, aim);
        const points = [{x:f.x, y:f.y}];
        const path = this.projectLaunch(f, velocity.x, velocity.y, points);
        d.preview = { aim, points, path };
        this.emit('survivalAim', {f});
      }
      const launch = prior && (input.tapped?.attack || (input.attack && !d.studyPressed));
      d.studyPressed = !!input.attack;
      if (!launch) return true;
      d.lockedAim = d.preview.aim;
      d.preview = null;
      return false;
    }
    survivalInput() {
      const d = this.survivalPractice;
      if (d.ticks >= 10 && !d.grabSent) {
        d.grabSent = true;
        return { ...idleInput, grab: true, tapped: { grab: true } };
      }
      return d.ticks >= 38 && this.grapple?.phase === 'hold' ? { ...idleInput, x: d.dir } : idleInput;
    }
    finishSurvivalPractice(outcome) {
      const d = this.survivalPractice;
      if (d.phase === 'done') return;
      d.phase = 'done';
      d.outcome = outcome;
      this.emit('survivalResult', { f: this.dogs[0], outcome });
    }
    checkSurvivalPractice() {
      const d = this.survivalPractice, f = this.dogs[0];
      if (!d.released) {
        if (d.ticks > 110) this.finishSurvivalPractice('miss');
        return;
      }
      if (!d.free && !f.tumble?.pending && (!d.trace.length || d.ticks % 3 === 0 || f.stun <= 0))
        d.trace.push({ x: f.x, y: f.y - f.stats.height * 0.52 });
      if (f.tumble && !f.tumble.pending && !d.cue && f.stun > 0 && f.stun <= inputWindow - 1 / 60 + 1e-8) {
        d.cue = true;
        this.emit('survivalBuffer', { f });
      }
      if (f.ledge || f.ground >= 0) this.finishSurvivalPractice(f.ledge ? 'ledge' : 'land');
      else if (!d.free && f.stun <= 0 && !f.tumble?.pending) {
        d.free = true;
        this.emit('survivalFree', { f });
      }
    }
    resetStockPractice(pattern = 'stockReturn', dir = 1, slow = true) {
      this.resetTraining();
      if (this.geometryStage === 'canal') {
        // Start the ferry clear of both return lanes for the scripted landing grab.
        this.time = 1;
        this.terrain = platforms(this.geometryStage, this.time);
      }
      const slot = pattern === 'stockCatch' ? 1 : 0, lane = dir > 0 ? slot : 1 - slot;
      const dog = this.dogs[slot], guard = this.dogs[1 - slot];
      this.stockPractice = { pattern, dir, slow, slot, phase: 'ready', after: 0, frames: 0, option: '',
        sent: false, live: false, covered: false, outcome: '' };
      dog.damage = 0;
      this.beginStockReturn(dog, lane);
      const lift = dog.stockLift, floor = this.terrain[lift.landing];
      const gap = (guard.stats.width + dog.stats.width) * 0.85 + 4;
      guard.x = clamp(lift.x + (lane ? -gap : gap), floor.x1 + 5, floor.x2 - 5);
      guard.y = floor.y;
      guard.ground = lift.landing;
      guard.face = Math.sign(lift.x - guard.x) || (lane ? 1 : -1);
    }
    stockPracticeInput() {
      const d = this.stockPractice, lift = this.dogs[d.slot].stockLift;
      if (d.slot === 1)
        return lift && lift.time + 1e-8 >= liftArrival + 0.4 ? { ...idleInput, y: 1 } : idleInput;
      if (d.frames && d.after + 1e-8 >= 30 / 60 && !d.sent) {
        d.sent = true;
        return { ...idleInput, grab: true, tapped: { grab: true } };
      }
      return idleInput;
    }
    finishStockPractice(outcome) {
      const d = this.stockPractice;
      if (d.phase !== 'active') return;
      d.phase = 'done';
      d.outcome = outcome;
      this.emit('stockResult', { f: this.dogs[d.slot], outcome });
    }
    checkStockPractice(dt) {
      const d = this.stockPractice, guard = this.dogs[1 - d.slot];
      if (d.frames) d.after += dt;
      if (this.grapple?.target === d.slot) this.finishStockPractice(d.slot ? 'timed' : 'caught');
      else if (!d.slot && guard.damage > this.trainingDamage) this.finishStockPractice('hit');
      else if (d.live && !guard.attack?.grabAttempt)
        this.finishStockPractice(d.slot ? (d.covered ? 'early' : 'miss') : (d.covered ? 'protected' : 'clear'));
      else if (d.after > 5) this.finishStockPractice('timeout');
    }
    resetMeteorPractice(pattern = 'spikeFloor', dir = 1, slow = true, startingDamage = 100) {
      this.resetTraining(false, false, pattern !== 'spikeEdge');
      const originalDogs = this.dogs, player = originalDogs[0], pip = newFighter('pip', 1);
      const offstage = pattern === 'spikeEdge';
      const platform = offstage ? (this.geometryStage === 'laundry' && dir > 0 ? 1 : 0) :
        this.geometryStage === 'laundry' || dir > 0 ? 2 : 1;
      const floor = this.terrain[platform], lip = dir > 0 ? floor.x2 : floor.x1;
      const x = offstage ? lip + dir * 42 : (floor.x1 + floor.x2) / 2;
      const baseline = clamp(Number(startingDamage) || 0, 0, 200);
      Object.assign(player, { x, y: floor.y - (offstage ? 93 : 53), ground: -1, face: -dir, damage: baseline, jumps: 1 });
      Object.assign(pip, { x: x - dir * 12, y: player.y - 64, ground: -1, face: dir, jumps: 1 });
      this.dogs = [player, pip];
      this.meteorPractice = { originalDogs, pattern, dir, slow, baseline, platform, phase: 'ready', time: 0, cancel: '', outcome: '' };
    }
    meteorPracticeInput() {
      const d = this.meteorPractice, pip = this.dogs[1];
      if (!d.swung) {
        d.swung = true;
        return { ...idleInput, aimStick: true, smashY: 1 };
      }
      if (d.pattern !== 'spikeEdge' || pip.ground >= 0 || pip.attack) return idleInput;
      const floor = this.terrain[d.platform], lip = d.dir > 0 ? floor.x2 : floor.x1;
      const x = (pip.x - lip) * d.dir > -26 ? -d.dir : 0;
      if (pip.ledge) return { ...idleInput, x: -d.dir };
      if (pip.y > floor.y - 18 && pip.vy > 100 && x) {
        if (pip.jumps) return { ...idleInput, x, jump: true, tapped: { jump: true } };
        if (!pip.usedUp) return { ...idleInput, x, y: -1, special: true, tapped: { special: true } };
      }
      return { ...idleInput, x };
    }
    finishMeteorPractice(outcome) {
      const d = this.meteorPractice;
      if (d.phase === 'done') return;
      d.phase = 'done';
      d.outcome = outcome;
      this.emit('meteorResult', { f: this.dogs[0], outcome, option: d.cancel });
    }
    checkMeteorPractice(dt) {
      const d = this.meteorPractice, f = this.dogs[0];
      if (d.phase === 'done') return;
      d.time += dt;
      if (d.phase === 'strike') {
        if (f.tumble?.meteor) d.phase = 'flight';
        else if (f.damage > d.baseline) this.finishMeteorPractice('weak');
        else if (d.time > 0.6) this.finishMeteorPractice('avoided');
      } else if (f.floorAction?.type === 'tech' || f.floorAction?.type === 'techRoll')
        this.finishMeteorPractice(f.floorAction.type);
      else if (f.tumble && !f.tumble.meteor && f.vy < 0 && d.pattern === 'spikeFloor')
        this.finishMeteorPractice(d.hardSpeed ? 'hardImpact' : 'bounce');
      else if (f.ledge || f.ground >= 0) this.finishMeteorPractice(d.cancel ? 'saved' : 'returned');
    }
    resetPlatformPractice(pattern = 'below', slow = true) {
      this.resetTraining(false, false, pattern === 'top' || pattern === 'below');
      if (pattern === 'ferry') {
        const originalStage = this.stage;
        this.stage = 'canal';
        this.time = 0;
        this.terrain = platforms(this.geometryStage, this.time);
        this.bot.ascent = null;
        const [rider, challenger] = this.dogs, [gate, ferry] = this.terrain;
        Object.assign(rider, { x:ferry.x1 + 80, y:ferry.y, ground:1, face:-1 });
        Object.assign(challenger, { x:370, y:gate.y, ground:0, face:1 });
        this.platformPractice = { pattern, defend:true, platform:1, originalStage, slow, phase:'ready', outcome:'' };
        return;
      }
      if (pattern === 'hold' || pattern === 'shield-drop' || pattern === 'layers') {
        const originalStage = this.stage;
        this.stage = 'bandstand';
        this.terrain = platforms(this.geometryStage, this.time);
        const [guard, challenger] = this.dogs, top = this.terrain[3];
        if (pattern === 'layers') {
          const wing = this.terrain[1], mark = (top.x1 + wing.x2) / 2;
          Object.assign(guard,{x:mark, y:top.y, ground:3, face:1});
          Object.assign(challenger,{x:mark + guard.stats.width + challenger.stats.width, y:this.terrain[0].y, ground:0, face:-1});
          this.platformPractice = {pattern, platform:3, originalStage, slow, phase:'ready', outcome:''};
          return;
        }
        if (pattern === 'shield-drop') {
          const wing = this.terrain[2], mark = (wing.x1 + wing.x2) / 2;
          Object.assign(guard, { x: mark, y: wing.y, ground: 2, face: 1 });
          Object.assign(challenger, { x: mark + 23, y: this.terrain[0].y, ground: 0, face: -1 });
          this.platformPractice = { pattern, platform: 2, originalStage, slow, phase: 'ready', ticks: 0, outcome: '' };
          return;
        }
        Object.assign(guard, { x: top.x2 - 46, y: top.y, ground: 3, face: 1 });
        Object.assign(challenger, { x: arenas.bandstand.spawn[1], y: this.terrain[0].y, ground: 0, face: -1 });
        this.platformPractice = { pattern, defend:true, platform: 3, originalStage, mark: guard.x, phase: 'ready', outcome: '' };
        return;
      }
      const onTop = pattern === 'top';
      const platform = this.geometryStage === 'laundry' ? (onTop ? 2 : 3) : 1;
      const perch = this.terrain[platform], center = (perch.x1 + perch.x2) / 2;
      const [f, rival] = this.dogs;
      const gap = onTop ? f.stats.width + rival.stats.width + 2 : 15;
      f.ground = platform;
      f.x = center - gap / 2;
      f.y = perch.y;
      rival.x = center + gap / 2;
      rival.ground = onTop ? platform : this.terrain.findIndex(p => !p.thin && rival.x >= p.x1 && rival.x <= p.x2);
      rival.y = this.terrain[rival.ground].y;
      this.platformPractice = { platform, pattern, phase: 'ready', swing: false, outcome: '' };
    }
    finishPlatformPractice(outcome, moveId) {
      const drill = this.platformPractice;
      if (!drill || drill.phase === 'done') return;
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('platformResult', { f: this.dogs[0], outcome, moveId });
    }
    checkPlatformPractice() {
      const drill = this.platformPractice, f = this.dogs[0];
      if (drill.phase === 'done') return;
      if (drill.pattern === 'layers') {
        if (drill.phase === 'ready') {
          if (f.ground < 0 && f.vy < 0) drill.phase = 'rise';
          else if (f.ground !== drill.platform) this.finishPlatformPractice('missed');
          return;
        }
        if (f.ground >= 0) {
          const landing = f.ground === 3 ? 'top' : f.ground === 1 && drill.phase === 'belowTop' ? 'wing' :
            f.ground === 0 && drill.phase === 'fall' ? 'deck' : 'missed';
          this.finishPlatformPractice(landing);
        }
        else if (f.ledge || f.respawning) this.finishPlatformPractice('missed');
        else if (drill.phase === 'rise' && f.vy >= 0) {
          drill.phase = 'apex';
          this.emit('platformClimb',{f});
        }
        return;
      }
      if (drill.pattern === 'shield-drop') {
        if (drill.phase === 'fall' && f.ground >= 0) this.finishPlatformPractice('landed');
        else if (drill.phase === 'exposed' && f.ground >= 0) this.finishPlatformPractice('early');
        else if ((drill.phase === 'blocked' || drill.phase === 'approach') && f.ground !== drill.platform)
          drill.phase = 'exposed';
        else if (drill.ticks > (drill.phase === 'fall' ? 140 : 73))
          this.finishPlatformPractice(drill.phase === 'blocked' ? 'held' : 'missed');
        return;
      }
      if (drill.defend) {
        const rival = this.dogs[1];
        if (drill.pattern === 'hold' && drill.phase === 'climbing' && rival.ground === 2) {
          drill.phase = 'wing';
          this.emit('platformClimb', { f: rival });
        }
        if (rival.ground === drill.platform) this.finishPlatformPractice('claimed');
        else if (f.ground >= 0 && f.ground !== drill.platform) this.finishPlatformPractice('vacated');
        return;
      }
      if (drill.phase === 'fall') {
        if (f.ground >= 0 || f.ledge) this.finishPlatformPractice('landed');
      } else if (f.ground !== drill.platform) this.finishPlatformPractice('left');
      else if (f.attack) drill.swing = true;
      else if (drill.swing) this.finishPlatformPractice('stayed');
    }
    resetChasePractice(role = 'attack', dir = 1, slow = true, response) {
      const last=role==='readTech' && this.chasePractice?.role===role ? this.chasePractice : null;
      this.resetTraining();
      const bait = role === 'bait' || role === 'baitBack';
      const slot = role === 'defend' ? 0 : 1;
      const target = this.dogs[slot], striker = this.dogs[1 - slot];
      const ground = this.geometryStage === 'laundry' && dir < 0 ? 1 : 0;
      const floor = this.terrain[ground], mark = (floor.x1 + floor.x2) / 2;
      Object.assign(striker, { x: mark - dir * (striker.stats.width + target.stats.width + 4),
        y: floor.y, ground, face: dir });
      // Start in the final part of a fall. The normal tumble, terrain and input decide the landing.
      Object.assign(target, { x: mark - dir * 8, y: floor.y - 78, ground: -1, face: -dir,
        vx: dir * 38, vy: 185, jumps: 1, stun: 0.65 });
      if (role === 'baitBack') target.face = dir;
      this.startTumble(target, false);
      this.chasePractice = { role, slot, dir, ground, mark, slow, bait, phase: 'ready', time: 0, locks: 0, outcome: '' };
      if(role==='readTech'){
        Object.assign(this.chasePractice,{response:response ?? last?.response ?? 'mix',caught:last?.caught || 0,tries:last?.tries || 0});
        this.bot.punishedTech=last?.punished || null;
        this.chasePractice.punished=this.bot.punishedTech;
      }
    }
    finishChase(outcome) {
      const drill = this.chasePractice;
      if (drill.phase === 'done') return;
      drill.phase = 'done';
      drill.outcome = outcome;
      if(drill.role==='readTech' && drill.response==='mix'){
        drill.tries++;
        if(outcome==='caught' || outcome==='grabPunish')drill.caught++;
      }
      this.emit('chaseResult', { f: this.dogs[drill.slot], outcome });
    }
    chaseHit(target, moveId, previousLocks, locks) {
      const drill = this.chasePractice;
      if (drill.phase === 'done') return;
      if (target.index !== drill.slot) {
        if (moves[moveId]?.floorAttack) this.finishChase('sweep');
        return;
      }
      if(drill.role==='readTech'){
        this.finishChase(drill.phase==='getup'?'escaped':'early');
        return;
      }
      if (drill.bait) {
        this.finishChase(drill.phase === 'getup' ? 'punished' : 'interrupted');
        return;
      }
      if (locks) {
        drill.phase = 'locked';
        drill.locks = locks;
        this.emit('chaseCue', { f: target, phase: 'locked', locks });
      } else if (previousLocks) {
        const starter = this.dogs[1 - drill.slot].kit.ground[0];
        this.finishChase(moveId === starter ? 'third' : 'finish');
      } else this.finishChase(drill.phase === 'fall' ? 'early' : drill.phase === 'getup' ? 'caught' : 'launched');
    }
    chasePracticeInput() {
      const d = this.chasePractice, target = this.dogs[d.slot], striker = this.dogs[1 - d.slot];
      if (d.phase === 'done') return idleInput;
      const floor = target.floorAction;
      if(d.role==='readTech'){
        if(!target.tumble)return idleInput;
        if(target.techBuffer>0)return {...idleInput,x:target.tumble.rollDir};
        if(target.techLock>1e-8 || this.floorAhead(target,7/60)<0)return idleInput;
        const x=this.chooseLandingTech(target,striker,this.terrain[d.ground],d.response);
        return {...idleInput,x,shield:true,tapped:{shield:true}};
      }
      if (d.bait) {
        if (floor?.type === 'downed') return {...idleInput, attack: floor.time >= 8 / 60};
        return idleInput;
      }
      if (d.role === 'attack') {
        if (floor?.type !== 'downed') return idleInput;
        const rollAt = floor.locks ? floor.duration - 4 / 60 : 8 / 60;
        return floor.time + 1e-8 >= rollAt ? { ...idleInput, x: d.dir } : idleInput;
      }
      if (floor?.type === 'downed' && d.locks < 2) return this.chaseJabInput(striker, target) || idleInput;
      if (d.phase === 'getup' && !d.punish && floor &&
          floor.time * 60 >= 18 - moves[striker.kit.ground[0]].frames[0]) {
        d.punish = true;
        return { ...idleInput, tapped: { attack: true } };
      }
      return idleInput;
    }
    checkChasePractice(dt) {
      const d = this.chasePractice, target = this.dogs[d.slot];
      if (d.phase === 'done') return;
      d.time += dt;
      if(d.role==='readTech' && d.phase==='getup' && !d.opened && target.floorAction && !protectionTime(target)){
        d.opened=true;
        this.emit('chaseCue',{f:target,phase:'opening'});
      }
      if (d.bait && d.phase === 'getup' && !target.floorAction && target.stun <= 1e-8) {
        const chaser = this.dogs[1 - d.slot];
        const lateGrab = chaser.attack?.grabAttempt || chaser.command?.type === 'grab';
        this.finishChase(d.guarded ? lateGrab ? 'lateGrab' : 'heldGuard' : 'escaped');
      }
      else if (d.phase === 'getup' && !target.floorAction && (d.role === 'attack' || d.role==='readTech' || d.punish))
        this.finishChase('escaped');
      else if (d.time > 4 || target.ledge || target.respawning || this.dogs[1 - d.slot].respawning)
        this.finishChase('away');
    }
    resetSpacingPractice(pattern = 'approach', dir = 1, slow = true, shieldGrab = true) {
      const previous = this.spacingPractice;
      this.resetTraining();
      const [f, guard] = this.dogs;
      if (pattern === 'airPower') {
        // A flat roof lets the same standing target receive both jumps without a platform intervening.
        if (this.geometryStage !== 'nightmail') {
          this.practiceHomeStage = this.stage;
          this.stage = 'nightmail';
          this.terrain = platforms(this.geometryStage, this.time);
        }
        const floor = this.terrain[0], mid = (floor.x1+floor.x2)/2;
        const gap = f.stats.width + guard.stats.width;
        Object.assign(f,{x:mid-dir*gap/2, y:floor.y, ground:0, face:dir});
        Object.assign(guard,{x:mid+dir*gap/2, y:floor.y, ground:0, face:-dir});
        this.spacingPractice = {pattern, dir, slow, phase:'ready', ground:0, mark:f.x, cueY:floor.y-guard.stats.height,
          frames:0, time:0, hits:0, damage:0, baseline:guard.damage,
          previous:previous?.pattern === pattern && previous.dir === dir && previous.baseline === guard.damage
            ? previous.result || previous.previous : null};
        return;
      }
      let ground = this.geometryStage === 'laundry' && dir < 0 ? 1 : 0;
      if (pattern === 'footstoolTech') {
        // Give the jumper a clear approach above the landing, including on stacked platforms.
        for (const [i, p] of this.terrain.entries()) {
          const best = this.terrain[ground];
          if (p.y < best.y || (p.y === best.y && (p.x1-best.x1)*dir < 0)) ground = i;
        }
      }
      const floor = this.terrain[ground], approach = pattern === 'approach';
      if (pattern === 'fastfall') {
        const originalDogs = this.dogs, pip = newFighter('pip',1);
        this.dogs = [f,pip];
        const middle = (floor.x1+floor.x2)/2;
        Object.assign(pip,{x:middle+dir*27.5,y:floor.y,ground,face:-dir,shield:true,damage:this.trainingDamage});
        Object.assign(f,{x:middle-dir*27.5,y:floor.y,ground:-1,face:dir,vy:-f.stats.jump*.6,jumps:1,shortHopFlight:true});
        // Start on this dog's short-hop arc with time for its neutral aerial to come out.
        const lead = f.kind === 'brisket' ? 7 : 5;
        while (framesToApex(f) > lead) {
          f.vy = fallVelocity(f,f.vy,1/60,true);
          f.y += f.vy/60;
        }
        this.spacingPractice = {pattern, dir, slow, ground, originalDogs, mark:f.x, phase:'ready', time:0,
          pauseAtApex:previous?.pauseAtApex ?? true, apex:false, fast:false, blockAt:null, landing:null};
        return;
      }
      if (pattern === 'sweet' || pattern === 'sweetAligned') {
        const side = sweetAerialSide[f.kind], moveId = f.kit.air[side], move = moves[moveId];
        const aligned = pattern === 'sweetAligned';
        const [dx, dy] = aligned ? move.sweetSpot.box :
          { pip: [12,-64], brisket: [-72,-33], noodle: [-52,-29], clover: [-62,-30] }[f.kind];
        const face = side === 'back' ? -dir : dir;
        const x = (floor.x1 + floor.x2 - face * dx) / 2, y = Math.min(...this.terrain.map(p => p.y)) - 40;
        Object.assign(f, {x, y, face, ground:-1, vy:-45, jumps:1});
        Object.assign(guard, {x:x+face*dx, y:y+dy+guard.stats.height*.52, face:-dir, ground:-1, vy:-45, jumps:1});
        this.spacingPractice = {pattern, slow, dir, moveId, side, ground, phase:'ready', time:0,
          previous:isSweetPractice(previous) && previous.moveId === moveId ? previous.result || previous.previous : null};
        return;
      }
      if (pattern === 'footstool' || pattern === 'footstoolTech') {
        const rescue = pattern === 'footstool', lip = dir > 0 ? floor.x1 : floor.x2;
        const x = rescue ? lip - dir * 69 : (floor.x1 + floor.x2) / 2;
        const [jumper, target] = rescue ? [f, guard] : [guard, f];
        Object.assign(target, { x, y: floor.y + (rescue ? target.stats.height + 14 : -113),
          ground: -1, vy: 28, face: -dir, jumps: 1 });
        Object.assign(jumper, { x, y: target.y - target.stats.height - 62,
          ground: -1, vy: 285, face: dir, jumps: 0, usedUp: true });
        this.spacingPractice = {pattern, dir, ground, slow, mark: rescue ? lip : x, phase:'ready',
          time:0, cue:false, stepped:false, outcome:''};
        return;
      }
      if (pattern === 'cancel') {
        // Fall just outside the down air's reach. The challenger can still reach the landing with a low tilt.
        const gap = f.kind === 'brisket' ? 66 + guard.stats.width : f.stats.width + guard.stats.width + 13;
        const center = (floor.x1 + floor.x2) / 2, mark = center - dir * gap / 2;
        Object.assign(f, { x: mark, y: floor.y - (f.kind === 'brisket' ? 72 : 30), ground: -1, face: -dir, vy: -32, jumps: 1 });
        Object.assign(guard, { x: mark + dir * gap, y: floor.y, ground, face: -dir });
        this.spacingPractice = { pattern, dir, slow, ground, mark, phase: 'ready', time: 0, contact: '',
          airborne: true, landing: null, after: 0, cue: false, sent: false, outcome: '' };
        return;
      }
      if (pattern === 'reverse' || pattern === 'wavebounce') {
        const originX = (floor.x1 + floor.x2) / 2, behind = pattern === 'reverse';
        const guardOn = !behind && shieldGrab;
        const reach = guardOn ? { pip: 104, brisket: 55, noodle: 128, clover: 130 }[f.kind] :
          { pip: 32, brisket: 25, noodle: 74, clover: 78 }[f.kind] + guard.stats.width;
        Object.assign(f, { x: originX, y: floor.y - 23, vy: -96, vx: dir * (guardOn ? f.stats.speed : f.kit.airDrift.speed),
          ground: -1, face: dir, jumps: 1 });
        Object.assign(guard, { x: originX + (behind ? -dir : dir) * reach, y: floor.y, ground,
          face: behind ? dir : -dir, shield: guardOn || (behind && f.kind === 'brisket') });
        this.spacingPractice = { pattern, dir, slow, ground, originX, mark: originX, phase: 'ready', time: 0,
          guard: guardOn, turn: '', cast: '', contact: '', damage: 0, airborne: true, landing: null, outcome: '' };
        return;
      }
      if (pattern === 'landing') {
        // Run-in distance and the two takeoff-relative floor marks for each dog's short hop.
        const [runIn, softMark, cleanMark] = {
          pip: [224, 95, 155], brisket: [180, 41, 76], noodle: [240, 58, 119], clover: [216, 79, 134],
        }[f.kind];
        const gap = runIn + guard.stats.width, middle = (floor.x1 + floor.x2) / 2;
        Object.assign(guard, { x: middle + dir * gap / 2, y: floor.y, ground, face: -dir });
        Object.assign(f, { x: middle - dir * gap / 2, y: floor.y, ground, face: dir,
          vx: dir * f.stats.speed, sprintDir: dir, stickTicks: 3, prev: { ...idleInput, x: dir, grabX: dir } });
        this.spacingPractice = { pattern, dir, slow, ground, mark: f.x + dir * softMark, cleanMark: f.x + dir * cleanMark,
          phase: 'ready', time: 0, contact: '', timing: '', damage: 0, airborne: false, landing: null, outcome: '',
          swung: false, peak: null, flickJump: previous?.pattern === 'landing' ? previous.flickJump : undefined,
          previousPeak: previous?.pattern === 'landing' && previous.dir === dir
            ? (previous.peak?.complete ? previous.peak : previous.previousPeak) : null };
        return;
      }
      const gap = approach ? 66 + f.stats.speed * 0.045 : f.stats.width + guard.stats.width + 1;
      const corner = dir > 0 ? floor.x1 : floor.x2;
      const guardX = corner + dir * (floor.x2 - floor.x1) * (approach ? 0.39 : 0.17);
      Object.assign(guard, { x: guardX, y: floor.y, ground, face: approach ? -dir : dir, shield: true });
      Object.assign(f, { x: guardX + (approach ? -1 : 1) * dir * gap, y: floor.y, ground, face: dir,
        vx: dir * f.stats.speed, sprintDir: dir, stickTicks: 3, prev: { ...idleInput, x: dir, grabX: dir } });
      moveOnFoot(f, dir, 1 / 60);
      f.run.age = 0.4;
      const grab = grabs[guard.kit.grab].box;
      const mark = guardX + dir * (approach ? f.stats.width + guard.stats.width + 6 : grab[0] + grab[2] + f.stats.width + 10);
      this.spacingPractice = { pattern, dir, slow, ground, gap, mark, phase: 'ready', time: 0, contact: '', turned: false,
        airborne: false, landing: null, grabSent: false, outcome: '' };
    }
    spacingPracticeInput() {
      const drill = this.spacingPractice, guard = this.dogs[1];
      if (drill.phase === 'done' || isSweetPractice(drill) || drill.pattern === 'airPower') return idleInput;
      if (drill.pattern === 'fastfall') {
        if (drill.blockAt !== null && !drill.reply) {
          drill.reply = true;
          return {...idleInput,shield:true,jump:true,attack:true,tapped:{jump:true,attack:true}};
        }
        return {...idleInput,shield:true};
      }
      if (isFootstoolPractice(drill)) {
        if (drill.pattern === 'footstoolTech' && !drill.sent && this.footstoolTarget(guard)) {
          drill.sent = true;
          return { ...idleInput, jump: true };
        }
        return idleInput;
      }
      if (drill.pattern === 'cancel') {
        if (drill.landing !== null && !drill.sent) {
          const lag = moves[this.dogs[0].kit.air.down].land, startup = moves[guard.kit.tilts.down].frames[0];
          // The low strike always challenges the same frame, whether the player canceled or missed.
          if (drill.after >= lag - 1 - startup) {
            drill.sent = true;
            return { ...idleInput, y: 1, tapped: { attack: true } };
          }
        }
        return idleInput;
      }
      if (isReversalPractice(drill)) {
        if (drill.blocked && drill.landing !== null && !drill.grabSent && guard.shieldStun < 1e-8 && guard.impactLag < 1e-8) {
          drill.grabSent = true;
          return { ...idleInput, shield: true, tapped: { grab: true } };
        }
        return { ...idleInput, shield: drill.guard || (drill.pattern === 'reverse' && this.dogs[0].kind === 'brisket'),
          y: drill.guard && this.dogs[0].kind === 'clover' ? -0.45 : 0 };
      }
      if (drill.pattern === 'landing') return drill.contact ? { ...idleInput, shield: true } : idleInput;
      if (drill.landing !== null && !drill.grabSent && guard.shieldStun < 1e-8 && guard.impactLag < 1e-8) {
        drill.grabSent = true;
        return { ...idleInput, shield: true, tapped: { grab: true } };
      }
      return { ...idleInput, shield: true };
    }
    finishSpacingPractice(outcome) {
      const drill = this.spacingPractice;
      if (drill.phase === 'done') return;
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('spacingResult', { f: this.dogs[0], outcome, moveId: drill.contact });
    }
    checkSpacingPractice(dt) {
      const drill = this.spacingPractice, [f, guard] = this.dogs;
      if (drill.phase !== 'active') return;
      drill.time += dt;
      if (drill.pattern === 'airPower') {
        if (f.ground < 0) drill.airborne = true;
        if ((f.ground < 0 && !f.jumps) || (f.attack && f.attack.moveId !== f.kit.air.neutral))
          return this.finishSpacingPractice('other');
        if (!drill.cued && !f.attack && f.ground < 0 && f.vy > 0 && f.y >= drill.cueY) {
          drill.cued = true;
          this.emit('airPowerCue',{f});
        }
        if (drill.airborne && f.ground >= 0 && !f.attack && f.landingLag <= 1e-8) {
          if (drill.hits) drill.result = {short:drill.short, hits:drill.hits, damage:drill.damage, frames:drill.frames};
          this.finishSpacingPractice(drill.hits ? 'landed' : 'miss');
        } else if (drill.time > 4) this.finishSpacingPractice('miss');
        return;
      }
      if (drill.pattern === 'fastfall') {
        if (f.ground >= 0 && drill.landing === null) drill.landing = this.time;
        if (drill.parried && guard.stun <= 0) this.finishSpacingPractice('parried');
        else if (drill.time > 1.1) this.finishSpacingPractice(drill.blockAt === null ? 'miss' : 'clear');
        return;
      }
      if (isSweetPractice(drill)) {
        if (drill.time > .65 || f.ground >= 0) this.finishSpacingPractice('miss');
        return;
      }
      if (isFootstoolPractice(drill)) {
        if (drill.pattern === 'footstool') {
          if (!drill.cue && this.footstoolTarget(f)) {
            drill.cue = true;
            this.emit('footstoolCue', {f});
          }
          if (f.ledge || f.ground >= 0) this.finishSpacingPractice(drill.stepped ? 'saved' : 'otherSave');
          else if (f.y > this.terrain[drill.ground].y + 235 || drill.time > 3) this.finishSpacingPractice('fell');
        } else if (f.floorAction) this.finishSpacingPractice(f.floorAction.type);
        else if (f.ground >= 0 || drill.time > 2) this.finishSpacingPractice(drill.stepped ? 'landed' : 'evaded');
        return;
      }
      if (drill.pattern === 'cancel' && drill.landing !== null) drill.after++;
      const peak = drill.peak;
      if (peak && !peak.complete) {
        // Compare the first jump only. A second jump or recovery can change its apex.
        if (f.jumps === 0 || f.usedUp || f.stun || f.airDodge) drill.peak = null;
        else {
          if (f.y < peak.y) { peak.y = f.y; peak.x = f.x; }
          if (f.vy >= 0 || f.ground >= 0) peak.complete = true;
        }
      }
      if (f.ground < 0) drill.airborne = true;
      else if (drill.airborne && drill.landing === null) {
        drill.landing = (f.x - guard.x) * drill.dir;
        drill.landingX = f.x;
        this.emit('spacingLand', { f, gap: drill.landing });
      }
      if (drill.pattern === 'cancel') {
        if (!drill.cue && this.landingCancelAhead(f)) {
          drill.cue = true;
          this.emit('spacingCancelCue', { f });
        }
        if (drill.landing !== null && drill.contact !== f.kit.air.down) this.finishSpacingPractice('other');
        else if (drill.time > 1.3 || f.ledge || f.respawning) this.finishSpacingPractice('miss');
        return;
      }
      if (isReversalPractice(drill)) {
        if (!drill.cast && f.attack) drill.cast = f.attack.moveId;
        if (guard.attack?.grabAttempt && guard.attack.time + 1e-8 >= guard.attack.start) drill.grabLive = true;
        if (f.grip?.owner === 1) return this.finishSpacingPractice('caught');
        if (f.respawning || f.ledge || drill.time > 1.8) return this.finishSpacingPractice('away');
        if (drill.blocked && (!drill.grabSent || guard.attack || guard.command)) return;
        if (drill.landing === null || (!drill.contact && drill.time < 0.65)) return;
        const travel = (drill.landingX - drill.originX) * drill.dir;
        if (drill.cast && drill.cast !== f.kit.specials.neutral) this.finishSpacingPractice('other');
        else if (!drill.contact) this.finishSpacingPractice('miss');
        else if (drill.blocked && !drill.grabLive) this.finishSpacingPractice(drill.damage ? 'intercept' : 'guarded');
        else if (drill.turn && (drill.turn === 'turnaround' ? travel < 2 : travel > -2)) this.finishSpacingPractice('short');
        else this.finishSpacingPractice(drill.turn || 'straight');
        return;
      }
      if (drill.pattern === 'landing') {
        if (f.attack?.airSide) drill.swung = true;
        if (f.respawning || guard.respawning || f.ledge) this.finishSpacingPractice('away');
        else if (drill.landing !== null && !drill.contact)
          this.finishSpacingPractice(drill.peak?.complete && !drill.swung ? 'jumpOnly' : 'miss');
        else if (drill.time > 1.6) this.finishSpacingPractice(drill.timing === 'clean' ? 'clean' : drill.contact ? 'escaped' : 'miss');
        else if (drill.contact && f.ground >= 0 && !drill.jabCue && f.landingLag <= 5 / 60 + 1e-8) {
          drill.jabCue = true;
          this.emit('spacingJab', { f });
        }
        return;
      }
      if (f.grip?.target === 0) return this.finishSpacingPractice('caught');
      if (drill.grabSent && !guard.attack && !guard.command) {
        if (drill.contact !== f.kit.air.back) return this.finishSpacingPractice(drill.contact ? 'other' : 'miss');
        const approach = drill.pattern === 'approach';
        const placed = approach ? drill.turned && drill.landing > 0 : drill.landing > drill.gap + 20;
        this.finishSpacingPractice(placed ? (approach ? 'crossed' : 'spaced') : 'close');
      } else if (f.ledge || f.respawning || drill.time > 3) this.finishSpacingPractice('away');
    }
    resetEscapePractice(spacing = 'tip', slow = true, startingDamage = 0) {
      this.resetTraining();
      const originalDogs = this.dogs, player = originalDogs[0];
      const floor = this.terrain[0];
      if (spacing === 'carry') {
        this.practiceHomeStage = this.stage;
        this.stage = 'nightmail';
        this.terrain = platforms(this.geometryStage,this.time);
        const gate = this.terrain[0], start = gate.x2 - 174;
        const brisket = newFighter('brisket',0), pip = newFighter('pip',1);
        this.dogs = [brisket,pip];
        Object.assign(brisket,{x:start,y:gate.y,ground:0,face:1});
        Object.assign(pip,{x:start+58,y:gate.y,ground:0,face:-1,damage:85});
        this.escapePractice = { originalDogs,spacing,slow,gripDrill:true,phase:'ready',time:0,
          start,mark:start+100,baseline:85 };
        return;
      }
      if (spacing === 'gripEscape' || spacing === 'gripThrow') {
        const rival = originalDogs[1], middle = (floor.x1 + floor.x2)/2;
        const gap = player.stats.width + rival.stats.width + 4;
        const baseline = clamp(Number(startingDamage) || 0, 0, 200);
        Object.assign(player,{x:middle-gap/2,y:floor.y,ground:0,face:1,damage:spacing==='gripEscape'?baseline:0});
        Object.assign(rival,{x:middle+gap/2,y:floor.y,ground:0,face:-1,damage:spacing==='gripThrow'?this.trainingDamage:0});
        this.escapePractice = {originalDogs,spacing,slow,baseline,gripDrill:true,phase:'ready',time:0};
        return;
      }
      if (spacing === 'counter' || spacing === 'break') {
        const defend = spacing === 'counter', rival = defend ? newFighter('pip', 1) : originalDogs[1];
        const middle = (floor.x1 + floor.x2) / 2, gap = player.stats.width + rival.stats.width + 5;
        const baseline = defend ? clamp(Number(startingDamage) || 0, 0, 200) : 0;
        Object.assign(player, { x: middle - gap / 2, y: floor.y, ground: 0, face: 1, damage: baseline });
        Object.assign(rival, { x: middle + gap / 2, y: floor.y, ground: 0, face: -1, damage: this.trainingDamage, crouch: !defend });
        this.dogs = [player, rival];
        this.escapePractice = { originalDogs, spacing, slow, baseline, phase: 'ready', time: 0, contact: '', outcome: '' };
        return;
      }
      const clover = newFighter('clover', 1);
      clover.x = (floor.x1 + floor.x2) / 2 + 30;
      const reach = spacing === 'close' ? clover.stats.width + 4 : smashes.cloverRimRattle.box[2] - 1;
      player.x = clover.x - reach - player.stats.width;
      clover.y = player.y = floor.y;
      clover.ground = player.ground = 0;
      clover.damage = this.trainingDamage;
      this.dogs = [player, clover];
      this.escapePractice = { originalDogs, spacing, slow, phase: 'ready', time: 0, outward: 0, outcome: '' };
    }
    escapePracticeInput(dt) {
      const drill = this.escapePractice, clover = this.dogs[1];
      if (drill.gripDrill) return this.gripPracticeInput(drill,dt);
      if (drill.spacing === 'counter' || drill.spacing === 'break') return this.crouchPracticeInput(dt);
      if (drill.phase === 'windup') {
        drill.time += dt;
        if (drill.time + 1e-8 >= 24 / 60) {
          drill.phase = 'swing';
          return { ...idleInput, smash: true, smashY: 1 };
        }
      } else if (drill.phase === 'swing' || drill.phase === 'follow') {
        const a = clover.attack;
        if (a?.moveId === 'cloverRimRattle' && a.time + 1e-8 >= a.second.start + a.second.active)
          this.finishEscapePractice(drill.phase === 'swing' ? 'missed' : drill.outward > 0 ? 'escaped' : 'clear');
        else if (!a && !clover.smashCharge) this.finishEscapePractice('interrupted');
      }
      return idleInput;
    }
    gripPracticeInput(drill, dt) {
      if (drill.phase === 'done' || drill.phase === 'ready') return idleInput;
      const grip = this.grapple, holder = drill.spacing !== 'gripEscape';
      if (drill.phase === 'flight') {
        const rival = this.dogs[1], floor = this.terrain[0];
        const x = rival.x > floor.x2-16 ? -1 : rival.x < floor.x1+16 ? 1 : 0;
        const dodge = x && !rival.stun && !rival.airDodge && !rival.usedDodge;
        return { ...idleInput, x, shield:!!dodge, tapped:{shield:!!dodge},
          jump:!!x && !rival.airDodge && rival.usedDodge && rival.y>floor.y-55 && rival.jumps>0 };
      }
      if (grip) {
        if (grip.owner !== (holder ? 0 : 1)) {
          this.finishEscapePractice('wrongGrip');
          return idleInput;
        }
        if (drill.phase !== 'gripped') {
          drill.phase = 'gripped';
          this.emit('escapeCue',{f:this.dogs[0],phase:'gripped'});
        }
        if (grip.phase === 'throw') return idleInput;
        if (holder) {
          const beat = Math.floor((grip.elapsed*60 + 1e-8)/(drill.spacing === 'carry' ? 9 : 6));
          return { ...idleInput, x:beat ? (beat%2 ? 1 : -1) : 0 };
        }
        if (grip.phase === 'hold' && grip.pummelCount < 2) return { ...idleInput, tapped:{attack:true} };
        return grip.pummelCount >= 2 ? { ...idleInput, x:grip.face } : idleInput;
      }
      drill.time += dt;
      if (!holder && !drill.sent && drill.time >= .2) {
        drill.sent = true;
        return {...idleInput,grab:true};
      }
      if (drill.time > 1) this.finishEscapePractice('missedGrab');
      return idleInput;
    }
    finishGripPractice(grip, thrown) {
      const d = this.escapePractice;
      if (!d?.gripDrill || d.phase === 'done') return;
      d.struggles = grip.struggles;
      d.pummels = grip.pummelCount;
      d.moveId = grip.throwId;
      if (d.spacing === 'carry' && thrown) {
        d.phase = 'flight';
        d.distance = Math.round(this.dogs[0].x-d.start);
        this.emit('escapeCue',{f:this.dogs[0],phase:'flight'});
        return;
      }
      this.finishEscapePractice(thrown ? 'throwLanded' : 'brokeFree');
    }
    crouchPracticeInput(dt) {
      const d = this.escapePractice, [player, rival] = this.dogs;
      if (d.phase === 'done') return idleInput;
      d.time += dt;
      if (d.spacing === 'break') {
        if (this.grapple?.owner === 0) {
          if (d.phase !== 'gripped') {
            d.phase = 'gripped';
            this.emit('escapeCue', { f: player, phase: 'gripped' });
          }
          return idleInput;
        }
        if (d.phase === 'gripped') { this.finishEscapePractice('slipped'); return idleInput; }
        if (d.time > 3) this.finishEscapePractice(d.contact === 'plant' ? 'safe' : 'noContact');
        return this.crouchCounterInput(rival, player) || { ...idleInput, y: 0.6 };
      }
      if (d.phase === 'windup' && d.time + 1e-8 >= 24 / 60) {
        d.phase = 'swing';
        return { ...idleInput, x: -1, attack: true, tapped: { attack: true } };
      }
      if (d.phase === 'answer' && !d.follow && !rival.attack && !rival.stun) {
        d.follow = true;
        return { ...idleInput, attack: true, tapped: { attack: true } };
      }
      if (d.time > 1.5) this.finishEscapePractice(d.phase === 'swing' ? 'noContact' : d.contact === 'plant' ? 'held' : 'away');
      return idleInput;
    }
    gradeCrouchHit(owner, moveId, name, braced, planted, priorAttack) {
      const d = this.escapePractice;
      if (!d || d.phase === 'done') return;
      if (d.spacing === 'break') {
        if (owner.index === 1) return this.finishEscapePractice('reversed');
        if (name === 'throw') return this.finishEscapePractice('threw');
        if (!planted) return this.finishEscapePractice('opened');
      } else if (d.spacing === 'counter') {
        if (owner.index === 0) {
          d.answerMove = moveId;
          const punished = d.contact === 'plant' && priorAttack?.moveId === 'pipStampKick';
          return this.finishEscapePractice(punished ? 'punished' : d.contact === 'plant' ? 'answered' : d.contact ? 'afterKick' : 'first');
        }
        if (d.follow) return this.finishEscapePractice('followHit');
        if (braced && !planted) return this.finishEscapePractice('lifted');
      } else return;
      d.phase = 'answer';
      d.contact = planted ? 'plant' : 'stand';
      this.emit('escapeCue', { f: this.dogs[0], phase: d.contact, moveId });
    }
    finishEscapePractice(outcome) {
      const drill = this.escapePractice;
      if (!drill || drill.phase === 'done') return;
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('escapeResult', { f: this.dogs[0], outcome, spacing: drill.spacing, outward: drill.outward });
    }
    resetWavePractice(pattern = 'back', dir = 1, slow = true) {
      this.resetTraining(false, false, pattern !== 'back');
      this.time = 0;
      this.terrain = platforms(this.geometryStage, 0);
      const [f, rival] = this.dogs;
      const platform = pattern === 'back' ? 0 : this.geometryStage === 'laundry' ? 2 : dir > 0 ? 1 : 2;
      const floor = this.terrain[platform], span = floor.x2 - floor.x1;
      const grab = grabs[(pattern === 'back' ? rival : f).kit.grab];
      const reach = grab.box[0] + grab.box[2] + (pattern === 'back' ? f : rival).stats.width;
      const gap = pattern === 'back' ? reach - 15 + (grab.step ? 12 : 0) : Math.min(span - 22, reach + 42);
      const center = (floor.x1 + floor.x2) / 2;
      Object.assign(rival, { x: center + dir * gap / 2, y: floor.y, ground: platform, face: -dir, shield: pattern === 'platform' });
      Object.assign(f, { x: center - dir * gap / 2, y: floor.y, ground: platform, face: dir });
      if (pattern === 'platform') Object.assign(f, { ground: -1, y: floor.y - 24, vy: 40, jumps: 1 });
      this.wavePractice = { pattern, platform, dir, slow, phase: 'ready', frame: 0, outcome: '',
        start: f.x - floor.x1, contact: null, distance: 0, forward: false, grabSent: false };
    }
    wavePracticeInput() {
      const d = this.wavePractice;
      if (d.pattern === 'platform') return { ...idleInput, shield: true };
      if (d.phase === 'active' && d.frame === 14) {
        d.grabSent = true;
        return { ...idleInput, tapped: { grab: true } };
      }
      return idleInput;
    }
    checkWavePractice() {
      const d = this.wavePractice;
      if (d.phase !== 'active') return;
      const [f, rival] = this.dogs, floor = this.terrain[d.platform];
      if (f.waveSlide && f.ground === d.platform && d.contact === null) {
        d.contact = f.x - floor.x1;
        d.forward = f.vx * d.dir > 0;
        this.emit('waveContact', { f, dir: Math.sign(f.vx) });
      }
      if (d.contact !== null && f.waveSlide && f.ground === d.platform && !f.grip) {
        d.distance = Math.round(Math.abs(f.x - floor.x1 - d.contact));
      }
      let outcome = '';
      if (f.grip) {
        if (f.grip.owner !== 0) outcome = 'caught';
        else outcome = d.pattern === 'platform' && d.contact !== null && d.forward ? 'grabbed' : 'otherGrab';
      } else if (f.respawning || f.ledge || (f.ground >= 0 && f.ground !== d.platform)) outcome = 'missedFloor';
      else if (d.pattern === 'back' && d.grabSent && !rival.attack && !rival.command)
        outcome = d.contact !== null && !d.forward && f.face === d.dir ? 'clear' : 'otherDodge';
      else if (d.pattern === 'platform') {
        if (f.attack?.grabAttempt) d.grabSent = true;
        else if (d.grabSent && !f.command) outcome = 'short';
      }
      if (!outcome && d.frame >= 150) outcome = 'late';
      if (outcome) {
        d.phase = 'done';
        d.outcome = outcome;
        this.emit('waveResult', { f, outcome });
      }
    }
    resetFreshnessPractice(repeat = false, guard = false, koTest = false, damage, rageDamage = null) {
      const prior = this.freshnessPractice;
      const rageTest = rageDamage !== null;
      const same = prior && !prior.drive && prior.koTest === koTest && (prior.rageDamage != null) === rageTest;
      const histories = repeat && same && !rageTest ? this.dogs.map(f => f.moveHistory) : null;
      this.resetTraining();
      const original = koTest ? { dogs: this.dogs, damage: this.trainingDamage } : null;
      if (koTest) {
        const player = this.dogs[0];
        this.dogs = [player, newFighter('pip', 1)];
        // The bandstand's lower deck leaves more distance to the top blast line.
        const threshold = this.geometryStage === 'bandstand'
          ? { pip: 117, brisket: 109, noodle: 115, clover: 137 }
          : { pip: 115, brisket: 105, noodle: 108, clover: 132 };
        this.trainingDamage = damage ?? (same ? prior.baseline : threshold[player.kind] - (rageTest ? 10 : 0));
        if (rageTest) player.damage = rageDamage;
      } else if (damage !== undefined) this.trainingDamage = damage;
      this.time = 0;
      this.terrain = this.layout?.terrain || platforms(this.geometryStage, 0);
      const floor = this.terrain[0];
      // The shorter launch must have a permanent roof underneath it on Laundry Line.
      const middle = koTest && this.geometryStage === 'laundry' ?
        (this.dogs[0].kind === 'clover' ? floor.x2 - 60 : floor.x1 + 46) : (floor.x1 + floor.x2) / 2;
      const gap = koTest ? 52 : 64;
      this.dogs.forEach((f, i) => {
        if (histories) f.moveHistory = histories[i];
        Object.assign(f, { ground: 0, x: middle + (i ? gap : -gap) / 2, y: floor.y, face: i ? -1 : 1 });
      });
      this.dogs[1].damage = this.trainingDamage;
      this.dogs[1].shield = guard;
      const comparable = repeat && same && prior.guard === guard && prior.baseline === this.trainingDamage;
      this.freshnessPractice = { waiting: true, guard, koTest, rageDamage, original, last: null, trace: [], revision: 0,
        marks: this.dogs.map(f => f.x), baseline: this.trainingDamage,
        previous: comparable ? prior.last ? { last: prior.last, trace: prior.trace, rageDamage: prior.rageDamage } : prior.previous : null };
    }
    placeDriveFighters(edge, damage) {
      const floor = this.terrain[0];
      const mark = edge ? floor.x2 - 4 : (floor.x1 + floor.x2) / 2 + 32;
      const [attacker, defender] = this.dogs;
      Object.assign(attacker, {x:mark - 64, y:floor.y, ground:0, face:1});
      Object.assign(defender, {x:mark, y:floor.y, ground:0, face:-1, damage});
    }
    resetDrivePractice(edge = false, damage = 0) {
      const prior = this.freshnessPractice;
      const previous = !prior?.drive ? null : prior.last ? {
        last:prior.last, trace:prior.trace, edge:prior.drive.edge, baseline:prior.baseline,
      } : prior.previous;
      this.resetFreshnessPractice();
      const lab = this.freshnessPractice;
      lab.original = {dogs:this.dogs, damage:this.trainingDamage};
      lab.baseline = this.trainingDamage = damage;
      lab.drive = {edge};
      lab.previous = previous;
      this.placeDriveFighters(edge, damage);
      lab.marks = this.dogs.map(f => f.x);
    }
    sampleFreshness(owner, use, moveId, power, damage, response, blocked = false) {
      const lab = this.freshnessPractice;
      if (!lab || owner.index !== 0 || !moveId) return;
      const sample = use?.sample || { moveId, power, hits: 0, blocks: 0, damage: 0, launch: 0, shieldFrames: 0 };
      if (sample !== lab.last || sample.outcome) lab.trace = [];
      sample.outcome = '';
      if (blocked) {
        sample.blocks++;
        sample.shieldFrames = response;
      } else {
        sample.hits++;
        sample.damage += damage;
        sample.launch = response;
        if (lab.drive && response > 0) {
          const target = this.dogs[1];
          sample.angle = Math.round(Math.atan2(-target.vy, Math.abs(target.vx)) * 180 / Math.PI);
          sample.slide = !!target.reaction?.groundSlide;
          sample.startX = target.x;
          lab.trace = [[target.x, target.y]];
        }
      }
      if (use) use.sample = sample;
      lab.last = sample;
      lab.revision++;
    }
    traceFreshness(out) {
      const lab = this.freshnessPractice, report = lab?.last;
      if (!report?.launch || report.outcome) return;
      const target = this.dogs[1];
      const landed = target.ground >= 0 || target.ledge;
      if (out) report.outcome = target.y < topBlastY ? 'Top KO' : 'KO';
      else if (report.slide) {
        if (target.ground < 0) report.outcome = 'Slid off the edge';
        else if (target.stun <= 0) report.outcome = 'Ground slide · ' + Math.round(Math.abs(target.x - report.startX)) + ' px';
      }
      else if (landed) report.outcome = target.ledge ? 'Ledge catch' : 'Landed';
      const last = lab.trace.at(-1), y = target.y;
      if (lab.trace.length < 130 && (!last || report.outcome || Math.hypot(target.x - last[0], y - last[1]) >= (report.slide ? 5 : 16)))
        lab.trace.push([target.x, y]);
      if (report.outcome) lab.revision++;
    }
    resetFootworkPractice(pattern = 'bait', dir = 1, slow = true) {
      const pauseOnWindup = this.footworkPractice?.pauseOnWindup ?? true;
      this.resetTraining();
      const originalDogs = this.dogs;
      const discRole = pattern === 'reflect' ? 'bark' : pattern === 'returnFire' ? 'cast' : '';
      const boost = pattern === 'boostGrab' || pattern === 'boostPivot';
      const playerKind = {crawl:'noodle', returnFire:'clover', reflect:'pip', power:'pip', armor:'brisket', armorGrab:'pip'}[pattern];
      const player = playerKind ? newFighter(playerKind, 0) : originalDogs[0];
      const kind = { bait: 'brisket', match: player.kind, power: 'brisket', disc: 'clover', brake: 'pip',
        pivot: player.kind, antiAir: originalDogs[1].kind, angleHigh: originalDogs[1].kind,
        angleLow: originalDogs[1].kind, cancelDash: originalDogs[1].kind, cancelTurn: originalDogs[1].kind,
        crawl:'clover', reflect:'clover', returnFire:'pip', dashShield:'brisket', armor:'pip', armorGrab:'brisket' }[pattern];
      const dummy = newFighter(boost ? originalDogs[1].kind : kind, 1);
      this.dogs = [player, dummy];
      const floor = this.terrain[0], center = (floor.x1 + floor.x2) / 2;
      const box = grabs[dummy.kit.grab].box, jab = moves[player.kit.ground[0]];
      const gap = discRole ? 254 : ({crawl:180, disc:225, power:135, armor:58, armorGrab:58}[pattern] ?? (jab.box[0] + jab.box[2]) * 2 - 14);
      dummy.x = pattern === 'bait' ? center + 45 : center + dir * gap / 2;
      let mark = pattern === 'bait' ? dummy.x - box[0] - box[2] - player.stats.width + 5 : center;
      player.x = pattern === 'bait' ? mark - 27 : center - dir * gap / 2;
      if (pattern === 'crawl') mark = player.x + dir * 45;
      player.face = dir;
      dummy.face = -dir;
      dummy.ground = player.ground = 0;
      dummy.y = player.y = floor.y;
      dummy.damage = this.trainingDamage;
      if (pattern === 'dashShield') {
        player.x = center - dir * 112;
        dummy.x = center + dir * 72;
        mark = center - dir * 15;
      }
      if (pattern === 'cancelDash' || pattern === 'cancelTurn' || boost) {
        const running = pattern === 'cancelDash' || boost;
        player.x = mark = center - dir * 55;
        if (running) {
          Object.assign(player, {vx:dir * player.stats.speed, sprintDir:dir, stickTicks:3,
            prev:{...idleInput, x:dir, grabX:dir}});
          moveOnFoot(player, dir, 1/60);
          player.run.age = .4;
        }
        if (boost) {
          const gap = pattern === 'boostPivot' ? -(player.stats.width + dummy.stats.width + 3) :
            dummy.stats.width + (dashGrabReach(player,false) + dashGrabReach(player,true)) / 2;
          dummy.x = player.x + dir * gap;
          dummy.face = pattern === 'boostPivot' ? dir : -dir;
        } else {
          dummy.x = player.x + dir * (running ? 55 : 58);
          dummy.y = floor.y - (running ? 100 : 45);
          dummy.vy = running ? -70 : -95;
          dummy.ground = -1;
        }
      }
      if (pattern === 'angleHigh' || pattern === 'angleLow') {
        const low = pattern === 'angleLow';
        const move = moves[player.kit.tilts.forward];
        const [x,y,rx,ry] = move.box;
        player.x = low ? (dir > 0 ? floor.x2 : floor.x1) - dir * 20 : center - dir * 50;
        mark = player.x;
        dummy.x = player.x + dir * (x + rx + dummy.stats.width * 0.45 - 3);
        dummy.y = floor.y + y + (low ? ry + dummy.stats.height * .92 + 15 : -ry + dummy.stats.height * .12 - 5);
        dummy.vy = low ? -140 : -255;
        dummy.ground = -1;
        dummy.ledgeLock = 0.3;
      }
      if (pattern === 'brake' || pattern === 'pivot' || pattern === 'antiAir') {
        player.x = mark - dir * 78;
        const [x, , reach] = moves[player.kit.tilts.forward].box;
        dummy.x = pattern === 'brake' ? mark + dir * (x + reach + dummy.stats.width + 5) :
          player.x - dir * (x + reach + dummy.stats.width - 14);
        dummy.face = pattern === 'pivot' ? dir : -dir;
        if (pattern === 'antiAir') {
          const [offset, , radius] = smashes[player.kit.smashes.up].box;
          dummy.x = mark + dir * (offset + radius + dummy.stats.width + 13);
        }
        const shift = clamp(0, floor.x1 + 12 - Math.min(player.x, dummy.x), floor.x2 - 12 - Math.max(player.x, dummy.x));
        mark += shift;
        player.x += shift;
        dummy.x += shift;
      }
      const discBeat = { pip: 60, brisket: 64, noodle: 65, clover: 62 };
      const sendAt = {disc:discBeat[player.kind], power:74, armor:79, armorGrab:69}[pattern] ?? 75;
      this.footworkPractice = { phase: 'ready', pattern, dir, slow: pattern !== 'bait' && slow,
        mark, originalDogs, tell: 0, beat: 0, sent: false, sendAt, outcome: '' };
      if (discRole) this.footworkPractice.discRole = discRole;
      if (boost) this.footworkPractice.boost = true;
      if (boost || pattern === 'cancelDash' || pattern === 'cancelTurn') this.footworkPractice.pauseOnWindup = pauseOnWindup;
    }
    footworkInput(dt) {
      const drill = this.footworkPractice, [player, dummy] = this.dogs;
      if (drill.pattern === 'crawl') {
        if (drill.phase === 'done' || drill.phase === 'ready') return idleInput;
        drill.tell += dt;
        if (!drill.sent && drill.tell >= .2) {
          drill.sent = true;
          return {...idleInput,special:true};
        }
        const disc = this.projectiles.find(d => d.owner === 1 && d.type === 'return');
        if (disc) {
          const side = (disc.x-player.x)*drill.dir;
          if (player.crouch && Math.abs(side) < player.stats.width) {
            if (!disc.back) drill.duckedOut = true;
            else if (disc.vx * drill.dir > 0) drill.duckedBack = true;
          }
          if (drill.phase === 'count' && drill.duckedOut && side < -player.stats.width-16) {
            drill.phase = 'under';
            this.emit('footworkCue',{f:player,phase:'under'});
          }
        } else if (drill.duckedBack && drill.phase === 'under') {
          if ((player.x-drill.mark)*drill.dir < -1) this.finishFootwork('shortCrawl');
          else {
            drill.phase = 'inside';
            drill.tell = 0;
            this.emit('footworkCue',{f:player,phase:'inside'});
          }
        }
        if (drill.phase === 'inside' && !drill.lowSent && drill.tell >= .23) {
          drill.lowSent = true;
          return {...idleInput,y:1,special:true};
        }
        if (drill.tell > 2.5) this.finishFootwork('avoided');
        return idleInput;
      }
      if (drill.pattern === 'dashShield') {
        if (drill.phase === 'done') return idleInput;
        if (drill.phase === 'ready' && (player.x - drill.mark) * drill.dir >= -1) {
          drill.phase = 'atMark';
          this.emit('footworkCue', {f:player, phase:'atMark'});
          return {...idleInput, x:-drill.dir * .5, tapped:{attack:true}};
        }
        if (drill.phase === 'ready' && drill.braced) {
          if (!player.shield) drill.braced = false;
          else if (!player.vx) this.finishFootwork('shortStop');
        }
        if (drill.phase === 'guarded') {
          const swing = dummy.attack;
          if (!swing || swing.end - swing.time < 3 / 60) drill.jumpQueued = true;
          if (dummy.ground < 0) drill.airborne = true;
          if (drill.airborne && (player.y - dummy.y > 75 || dummy.ground >= 0)) this.finishFootwork('jumpedClear');
          return {...idleInput, jump:!!drill.jumpQueued};
        }
        if (drill.phase === 'atMark' && (drill.tell += dt) > .75)
          this.finishFootwork('avoided');
        return idleInput;
      }
      if (drill.discRole) {
        if (drill.phase === 'done') return idleInput;
        drill.tell += dt;
        if (drill.tell > 2.2) {
          this.finishFootwork(drill.reflected ? 'returnMiss' : 'missedSwing');
          return idleInput;
        }
        if (drill.discRole === 'cast') return this.cpuDiscResponse(dummy) || idleInput;
        if (!drill.sent && drill.tell >= .4) {
          drill.sent = true;
          return {...idleInput,special:true};
        }
        return idleInput;
      }
      if (drill.pauseOnWindup !== undefined) {
        if (drill.boost) {
          if (drill.phase !== 'done' && (drill.tell += dt) >= .8)
            this.finishFootwork(drill.closestGap === undefined ? 'swingMiss' : 'shortReach');
          return {...idleInput,shield:true};
        }
        if (player.attack?.fromWindup) drill.aerial = true;
        if (drill.phase !== 'done' && (drill.tell += dt) >= .75)
          this.finishFootwork(drill.aerial ? 'airMiss' : 'groundMiss');
        return idleInput;
      }
      if (drill.pattern === 'angleHigh' || drill.pattern === 'angleLow') {
        if (drill.phase === 'swing' && (drill.tell += dt) >= .45) this.finishFootwork('missedAngle');
        return idleInput;
      }
      if (drill.pattern === 'brake' || drill.pattern === 'pivot' || drill.pattern === 'antiAir') {
        if (drill.phase === 'done') return idleInput;
        if (drill.phase === 'ready' && player.run) drill.phase = 'approach';
        if (drill.phase === 'approach' && (player.x - drill.mark) * drill.dir >= -1) {
          drill.phase = 'atMark';
          this.emit('footworkCue', { phase: 'atMark', f: player });
        }
        if (drill.phase !== 'ready') {
          drill.tell += dt;
          if (drill.tell > 1.55 || (player.x - drill.mark) * drill.dir > 100) this.finishFootwork('overshot');
          else if (drill.pattern === 'pivot') return { ...idleInput, x: drill.dir };
          else if (drill.pattern === 'antiAir') {
            if (!drill.sent && drill.tell >= 4/60) {
              drill.sent = true;
              return { ...idleInput, jump:true };
            }
            if (drill.sent && dummy.ground >= 0 && !dummy.jumpSquat) return { ...idleInput, shield:true };
          }
        }
        return idleInput;
      }
      if (drill.pattern !== 'bait') {
        if (drill.phase === 'done') return idleInput;
        drill.tell += dt;
        const frame = Math.round(drill.tell * 60);
        if (frame === 24 || frame === 48 || frame === 72) {
          drill.beat = frame / 24;
          this.emit('footworkCue', { phase: drill.beat === 3 ? 'go' : 'count', beat: drill.beat, f: player });
        }
        // The dummy commits on a fixed count. Player input never changes its timing.
        if (drill.pattern === 'armorGrab') {
          if (frame >= drill.sendAt - 7 && frame < drill.sendAt) return {...idleInput, smash:true};
          if (frame === drill.sendAt) drill.phase = 'swing';
          if (frame >= 120) this.finishFootwork('missedSwing');
          return idleInput;
        }
        if (!drill.sent && frame >= drill.sendAt) {
          drill.sent = true;
          drill.phase = 'swing';
          const button = drill.pattern === 'disc' ? 'special' : 'attack';
          return { ...idleInput, tapped: { [button]: true } };
        }
        if (frame >= (drill.pattern === 'disc' ? 152 : 99)) this.finishFootwork('missedSwing');
        return idleInput;
      }
      if (drill.phase === 'ready' && player.ground === 0 && player.x >= drill.mark) {
        drill.phase = 'tell';
        this.emit('footworkCue', { phase: 'tell', f: player });
      }
      if (drill.phase === 'tell') {
        drill.tell += dt;
        if (drill.tell + 1e-8 >= 12 / 60) {
          drill.phase = 'reach';
          return { ...idleInput, grab: true };
        }
      }
      const a = dummy.attack;
      if (drill.phase === 'reach' && a?.grabAttempt && a.time + 1e-8 >= a.start + a.active) {
        drill.phase = 'opening';
        this.emit('footworkCue', { phase: 'opening', f: player });
      } else if (drill.phase === 'reach' && !a) this.finishFootwork(dummy.regrabLock > 0 ? 'clash' : 'late');
      else if (drill.phase === 'opening' && !a) this.finishFootwork('late');
      return idleInput;
    }
    gradeFootwork(target, projectile = false) {
      const drill = this.footworkPractice;
      if (!drill || drill.phase === 'done') return;
      if (drill.pattern === 'crawl') {
        if (target.index === 1 && !projectile) this.finishFootwork(drill.phase === 'inside' ? 'caughtServe' : 'earlyHit');
        return;
      }
      if (drill.pattern === 'armor' || drill.pattern === 'armorGrab') {
        const attacker = this.dogs[1-target.index], a = attacker.attack;
        if (a?.grabAttempt) this.finishFootwork(activeArmor(target) ? 'caughtArmor' : 'ordinaryGrab');
        else if (a?.moveId === 'brisketHaymaker') this.finishFootwork(a.armorSpent ? 'armoredPunch' : 'cleanPunch');
        else this.finishFootwork('interruptedPunch');
        return;
      }
      if (drill.pattern === 'dashShield') {
        const grabbed = target.index === 1 && drill.phase === 'guarded' && this.dogs[0].attack?.grabAttempt;
        this.finishFootwork(grabbed ? 'caughtCounter' : target.index === 0 ? 'ranIntoSwing' : 'intercepted');
        return;
      }
      if (drill.discRole) {
        if (!projectile) this.finishFootwork('otherHit');
        return;
      }
      if (drill.pauseOnWindup !== undefined) {
        if (target.index !== 1) return;
        if (drill.boost) {
          const a = this.dogs[0].attack;
          this.finishFootwork(a?.boostGrab ? (a.grabStyle === 'pivot' ? 'boostPivotCatch' : 'boostCatch') :
            a?.grabAttempt ? 'regularCatch' : 'groundHit');
          return;
        }
        const player = this.dogs[0], a = player.attack, dash = drill.pattern === 'cancelDash';
        const route = a?.fromWindup === (dash ? player.kit.dashAttack : player.kit.tilts.forward) &&
          a.airSide === (dash ? 'up' : 'back');
        this.finishFootwork(route ? (dash ? 'risingCatch' : 'backCatch') : 'otherHit');
        return;
      }
      if (drill.pattern === 'angleHigh' || drill.pattern === 'angleLow') {
        const swing = this.dogs[0].attack;
        if (target.index === 1) this.finishFootwork(swing?.tiltAngle === (drill.pattern === 'angleLow' ? 1 : -1)
          ? 'angledHit' : 'otherHit');
        return;
      }
      if (drill.pattern === 'antiAir') {
        if (target.index !== 1) return;
        const move = this.dogs[0].attack;
        const catchInAir = target.ground < 0 && move?.fromJumpSquat;
        this.finishFootwork(catchInAir && move.slideDir === drill.dir ? 'slideCatch' :
          catchInAir && move.specialSide === 'up' ? 'specialCatch' : 'otherCatch');
        return;
      }
      if (drill.pattern === 'brake' || drill.pattern === 'pivot') {
        if (target.index === 1) {
          const player = this.dogs[0], move = player.attack;
          const facing = drill.pattern === 'pivot' ? -drill.dir : drill.dir;
          const slide = move?.slideDir === drill.dir && player.face === facing;
          this.finishFootwork(slide ? 'slidingHit' : move?.dashAttack ? 'dashHit' : 'plantedHit');
        }
        return;
      }
      if (this.footworkPractice.pattern !== 'bait') {
        this.finishFootwork(target.index === 0 ? 'hitTaken' : 'hitFirst');
        return;
      }
      const a = target.attack;
      if (target.index === 0) this.finishFootwork('caught');
      else if (a?.grabAttempt && a.time + 1e-8 >= a.start + a.active)
        this.finishFootwork('punish', Math.ceil((a.end - a.time) * 60 - 1e-8));
      else this.finishFootwork(this.footworkPractice.phase === 'opening' ? 'late' : 'early');
    }
    finishFootwork(outcome, remaining = 0) {
      const drill = this.footworkPractice;
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('footworkResult', { f: this.dogs[0], outcome, remaining });
    }
    resetWallPractice(side = 'left', runner = '', heavy = false) {
      this.resetTraining();
      const original = { stage: this.stage, dogs: this.dogs };
      this.stage = runner === 'ceiling' ? 'picnic' : 'laundry';
      this.terrain = platforms(this.geometryStage, this.time);
      if (runner === 'ceiling') {
        const dir = side === 'left' ? 1 : -1, floor = this.terrain[0];
        const x = (dir > 0 ? floor.x1 : floor.x2) + dir * 30;
        this.dogs = [newFighter('noodle',0), newFighter('pip',1)];
        const [noodle,pip] = this.dogs;
        const feet = floor.y + 30 + noodle.stats.height + 35;
        Object.assign(noodle, {x,y:feet,ground:-1,face:-dir,jumps:1,damage:90});
        Object.assign(pip, {x:x+dir*14,y:feet+58,ground:-1,face:-dir,jumps:1});
        this.wallPractice = {phase:'ready', side, inward:dir, ceiling:true, original};
        return;
      }
      const inward = side === 'right' ? 1 : -1;
      const roof = this.terrain[inward === 1 ? 1 : 0];
      const lip = inward === 1 ? roof.x1 : roof.x2;
      if (runner === 'pip' || runner === 'noodle') {
        const hero = newFighter(runner,0), rival = newFighter(original.dogs[1].kind,1);
        const wall = stageHulls.laundry.walls.find(w => w.index === (inward === 1 ? 1 : 0) &&
          w.left === (inward === 1) && w.top <= roof.y + 65 && w.bottom >= roof.y + 65);
        Object.assign(hero, { x:wall.x - inward*hero.stats.width, y:roof.y+65+hero.stats.height*.52,
          ground:-1, face:inward, jumps:1, vy:85 });
        Object.assign(rival, { x:lip+inward*155, y:roof.y, ground:wall.index, face:-inward });
        this.dogs = [hero,rival];
        this.wallPractice = { phase:'ready', runner, side, inward, original, roof:wall.index, outcome:'' };
        return;
      }
      this.dogs = [newFighter('noodle', 0), newFighter('pip', 1)];
      const [noodle, pip] = this.dogs;
      Object.assign(noodle, { x: lip - inward * 58, y: roof.y + 121, face: inward, damage: heavy ? 185 : 90, jumps: 1 });
      Object.assign(pip, {
        x: lip - inward * 106,
        y: roof.y + 121,
        face: -inward,
        jumps: 1,
        damage: this.trainingDamage,
      });
      this.wallPractice = { phase: 'ready', time: 0, side, inward, heavy, swung: false, outcome: '', original };
    }
    finishWallReturn(f, route, platform) {
      const d = this.wallPractice;
      if (!d?.runner || f.index !== 0 || d.phase !== 'return') return;
      d.phase = 'done';
      d.route = route === 'landed' && this.terrain[platform]?.thin ? 'platform' : route;
      d.crossed = platform !== undefined && platform !== d.roof && d.route !== 'platform';
      d.outcome = route === 'out' ? 'missed' : f.usedWallKick && f.jumps && !f.usedUp ? 'saved' : 'returned';
      d.jumps = f.jumps;
      this.emit('wallReturn', { f });
    }
    placeShieldLanding(slot,dir,cross) {
      const floor = this.terrain[0], middle = (floor.x1+floor.x2)/2;
      // On Canal, leave the ferry a clear lane for the duration of the dive.
      const ferry = this.geometryStage === 'canal' && platforms(this.geometryStage,this.time+.15)[1];
      const x = ferry ? middle + ((ferry.x1+ferry.x2)/2 < middle ? 1 : -1)*(floor.x2-floor.x1)*.3 : middle;
      const guard = this.dogs[slot], aerial = this.dogs[1-slot];
      Object.assign(guard,{x,y:floor.y,face:dir,ground:0,shield:true,prev:{...idleInput,shield:true}});
      Object.assign(aerial,{x:x+dir*(cross?18:74),y:floor.y-110,vx:-dir*360,vy:180,face:-dir,ground:-1,jumps:1});
    }
    landingApproach(dir,attack) {
      return {...idleInput,x:-dir,aimStick:attack,smashX:0,smashY:1};
    }
    resetShieldPractice(pattern = 'strike', worn = true, landingChoice, landingSide) {
      const slow = this.shieldPractice?.slow ?? true;
      const choice = landingChoice ?? this.shieldPractice?.landingChoice ?? 'front';
      const dir = landingSide ?? this.shieldPractice?.dir ?? 1;
      this.resetTraining();
      this.shieldPractice = { pattern, phase: 'ready', time: 0, outcome: '', lastDodge: '' };
      if (pattern === 'crossup') {
        const cross = choice === 'mix' ? this.random()<.5 : choice === 'behind';
        Object.assign(this.shieldPractice,{originalDogs:this.dogs,landingChoice:choice,cross,dir,slow});
        this.dogs = [this.dogs[0],newFighter('brisket',1)];
        this.dogs[1].damage = this.trainingDamage;
        this.placeShieldLanding(0,dir,cross);
        return;
      }
      if (pattern === 'breakEscape' || pattern === 'breakPunish') {
        const d = this.shieldPractice, floor = this.terrain[0], middle = (floor.x1 + floor.x2)/2;
        d.brokenSlot = pattern === 'breakEscape' ? 0 : 1;
        const gap = this.dogs[0].stats.width + this.dogs[1].stats.width + 5;
        this.dogs.forEach((f,i) => Object.assign(f,{x:middle+(i ? gap : -gap)/2, y:floor.y, ground:0, face:i ? -1 : 1}));
        this.dogs[d.brokenSlot].shieldHP = .035;
        return;
      }
      if (pattern === 'dodgeTiming' || pattern === 'counterGrab') {
        if (pattern === 'dodgeTiming') {
          this.shieldPractice.originalDogs = this.dogs;
          this.dogs = [this.dogs[0], newFighter('pip', 1)];
          this.shieldPractice.attempt = 0;
        }
        const [player, rival] = this.dogs, floor = this.terrain[0];
        const middle = (floor.x1 + floor.x2) / 2;
        const gap = player.stats.width + rival.stats.width + 4;
        Object.assign(player, { x: middle - gap/2, y: floor.y, ground: 0, face: 1 });
        Object.assign(rival, { x: middle + gap/2, y: floor.y, ground: 0, face: -1 });
        this.shieldPractice.slow = true;
      } else if (['emptyHop','fallingAir','mixHop','yourHop'].includes(pattern)) {
        const [player, rival] = this.dogs, floor = this.terrain[0];
        const middle = (floor.x1 + floor.x2) / 2, gap = player.stats.width + rival.stats.width + (pattern === 'yourHop' ? 3 : 42);
        Object.assign(player,{x:middle-gap/2,y:floor.y,ground:0,face:1});
        Object.assign(rival,{x:middle+gap/2,y:floor.y,ground:0,face:-1});
        const grab = pattern === 'mixHop' ? this.random() < .5 : pattern === 'emptyHop';
        this.shieldPractice.jumpIn = this.planJumpIn(rival,player,grab);
        this.shieldPractice.slow = slow;
      } else if (pattern === 'low' || pattern === 'high' || pattern === 'poke') {
        const drill = this.shieldPractice, attacking = pattern === 'poke';
        drill.coverage = true;
        drill.worn = worn;
        drill.originalDogs = this.dogs;
        const player = this.dogs[0], dummy = attacking ? this.dogs[1] : newFighter('noodle', 1);
        const floor = this.terrain[0], middle = (floor.x1 + floor.x2) / 2;
        const low = moves[player.kit.tilts.down].box;
        const gap = attacking ? low[0] + low[2] + 18 : pattern === 'low' ? 109 : 138;
        Object.assign(player, { x: middle - gap / 2, y: floor.y, ground: 0, face: 1 });
        Object.assign(dummy, { x: middle + gap / 2, y: floor.y, ground: 0, face: -1, damage: this.trainingDamage });
        (attacking ? dummy : player).shieldHP = worn ? 0.3 : 1;
        if (attacking) { dummy.shield = true; dummy.shieldLeanY = -1; }
        this.dogs = [player, dummy];
      } else if (pattern === 'kick' || pattern === 'drop') {
        const drill = this.shieldPractice;
        drill.originalDogs = this.dogs;
        this.dogs = [newFighter('clover', 0), newFighter(pattern === 'kick' ? 'pip' : 'brisket', 1)];
        const [player, dummy] = this.dogs;
        const floor = this.terrain[0];
        const spacing = pattern === 'kick' ? 110 : 58;
        player.x = (floor.x1 + floor.x2 - spacing) / 2;
        dummy.x = player.x + spacing;
        player.ground = dummy.ground = 0;
        player.y = dummy.y = floor.y;
        dummy.damage = this.trainingDamage;
      }
    }
    setLedgeTrap(edge) {
      const [climber,guard] = this.dogs, dir = edge.left ? 1 : -1;
      climber.damage = 120;
      this.hangLedge(climber, edge);
      const [reach,,radius] = smashes[guard.kit.smashes.side].box;
      Object.assign(guard,{x:edge.x + dir*(reach+radius+climber.stats.width+4),
        y:edge.y, ground:edge.index, face:-dir, vx:0, vy:0});
    }
    resetClimbPractice(role = 'escape', side = 'left', slow = true) {
      const edge = this.resetTraining(side);
      if (role === 'patience') {
        const originalDogs = this.dogs;
        this.dogs = [originalDogs[0],newFighter('brisket',1)];
        this.setLedgeTrap(edge);
        this.climbPractice = {role,side,slow,originalDogs,slot:0,phase:'ready',time:0};
        return;
      }
      const rise = role === 'rise' || role === 'coverRise';
      const slot = role === 'trap' || role === 'coverRise' ? 1 : 0;
      const climber = this.dogs[slot], guard = this.dogs[1 - slot];
      this.hangLedge(climber, edge);
      const spacing = rise ? 68 : climber.kit.ledgeClimb.distance + guard.stats.width + climber.stats.width + 1;
      Object.assign(guard, { x: edge.x + climber.face * spacing, y: edge.y, ground: edge.index, face: -climber.face });
      this.climbPractice = { role, side, slow, slot, phase: 'ready', time: 0,
        climbAt: Math.min(14, climber.ledge.guardFrames), climbed: false, jabbed: false, outcome: '' };
      if (rise) this.climbPractice.route = {edge, dir:climber.face};
    }
    climbPracticeInput(dt) {
      const drill = this.climbPractice;
      if (drill.phase === 'done') return idleInput;
      drill.time += dt;
      const climber = this.dogs[drill.slot], guard = this.dogs[1 - drill.slot];
      if (drill.role === 'patience') {
        const trap = this.ledgeSmashInput(guard,climber,drill);
        if (trap) return trap;
        return {...idleInput,shield:drill.swung && !guard.attack};
      }
      if (drill.route) {
        if (drill.role === 'coverRise')
          return drill.time >= .20 ? this.ledgeReturnInput(climber,drill.route) || idleInput : idleInput;
        if (!drill.jabbed && drill.time >= .30) {
          drill.jabbed = true;
          if (!drill.contact && !guard.stun && !guard.attack) return {...idleInput,y:1,tapped:{attack:true}};
        }
        return idleInput;
      }
      if (drill.role === 'trap') {
        if (climber.ledge && drill.time + 1e-8 >= drill.climbAt / 60) return { ...idleInput, x: climber.face };
        return drill.climbed ? { ...idleInput, shield: true } : idleInput;
      }
      const action = climber.floorAction;
      const jab = moves[guard.kit.ground[0]];
      if (action?.type === 'ledgeClimb' && !drill.jabbed && action.time + jab.start >= action.duration + 1 / 60 - 1e-8) {
        drill.jabbed = true;
        return { ...idleInput, tapped: { attack: true } };
      }
      return idleInput;
    }
    finishClimbPractice(outcome) {
      const drill = this.climbPractice;
      if (!drill || drill.phase === 'done') return;
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('climbResult', { f: this.dogs[0], outcome });
    }
    checkClimbPractice() {
      const drill = this.climbPractice;
      if (drill.phase !== 'active') return;
      const climber = this.dogs[drill.slot], guard = this.dogs[1 - drill.slot];
      if (drill.role === 'patience') {
        const swing = guard.attack;
        if (swing?.moveId === guard.kit.smashes.side) {
          if (!drill.swung) this.emit('climbCue',{f:climber,phase:'swing'});
          drill.swung = true;
          if (!drill.passed && swing.time + 1e-8 >= swing.start+swing.active) {
            drill.passed = true;
            this.emit('climbCue',{f:climber,phase:'opening'});
          }
        }
        if (drill.passed && !swing && climber.ground >= 0 && !climber.floorAction && !climber.attack)
          this.finishClimbPractice('escaped');
        else if (climber.y > guard.y+170 || drill.time > 5) this.finishClimbPractice('fell');
        return;
      }
      if (drill.route) {
        if (climber.grip?.target === drill.slot) return this.finishClimbPractice('intercepted');
        if (climber.ledge && drill.released) return this.finishClimbPractice('regrab');
        if (!climber.ledge && !drill.released) return this.finishClimbPractice('otherExit');
        if (drill.released && climber.ground >= 0)
          return this.finishClimbPractice(drill.contact ? 'landedHit' : 'landedClear');
        if (climber.y > drill.route.edge.y+210 || drill.time > 3)
          return this.finishClimbPractice('fell');
        return;
      }
      if (!climber.ledge && !drill.climbed) return this.finishClimbPractice('other');
      const attack = guard.attack;
      if (drill.role === 'trap' && attack?.moveId === guard.kit.ground[0]) {
        drill.jabbed = true;
        if (attack.time >= attack.start + attack.active - 1e-8 && (climber.ledge || climber.invuln > 0))
          return this.finishClimbPractice('early');
      }
      if (drill.time > (drill.role === 'trap' ? 100 : 65) / 60)
        this.finishClimbPractice(drill.jabbed ? 'missed' : 'waited');
    }
    resetLedgeRollPractice(pattern = 'guard', side = 'left') {
      const memory=pattern==='scout' && this.rollPractice?.pattern==='scout'?this.rollPractice.rollHabit:null;
      this.resetTraining(side, true);
      const [f, dummy] = this.dogs;
      const distance = f.kit.ledgeRoll.distance;
      const clearance = f.stats.width + dummy.stats.width;
      const spacing = pattern === 'read' ? distance + clearance + 1 : Math.min(45, distance - clearance - 2);
      dummy.x = f.ledge.x + f.face * spacing;
      this.rollPractice = {
        pattern,
        side,
        phase: 'ready',
        time: 0,
        acted: false,
        rolled: false,
        evaded: false,
        outcome: '',
      };
      if(pattern==='scout'){
        this.placeRollGuard(f.ledge);
        this.rollPractice.rollHabit=memory;
      }
    }
    placeRollGuard(edge){
      const [climber,guard]=this.dogs, inward=edge.left?1:-1;
      const floor=this.terrain[edge.index];
      const reach=Math.min(climber.kit.ledgeRoll.distance*.73,(floor.x2-floor.x1)/2);
      Object.assign(guard,{x:edge.x+inward*reach,y:edge.y,ground:edge.index,face:-inward,vx:0,vy:0});
    }
    resetLedgeTrumpPractice(role = 'take', side = 'left') {
      const edge = this.resetTraining(side);
      const defender = role === 'defend';
      const holder = this.dogs[defender ? 0 : 1];
      const incoming = this.dogs[1 - holder.index];
      const dir = edge.left ? 1 : -1;
      this.hangLedge(holder, edge);
      Object.assign(incoming, {
        face: dir,
        ground: -1,
        jumps: 1,
        x: edge.x - dir * (defender ? 95 : 50),
        y: edge.y + (defender ? -125 : 27),
        vx: dir * (defender ? 65 : 40),
        vy: defender ? 0 : -80,
      });
      this.trumpPractice = { role, side, edge, phase: defender ? 'approach' : 'ready', cast: false };
    }
    trumpPracticeInput() {
      const drill = this.trumpPractice;
      if (drill.role !== 'defend' || drill.phase !== 'approach') return idleInput;
      const dummy = this.dogs[1];
      const dir = drill.edge.left ? 1 : -1;
      if (
        dummy.kind === 'noodle' &&
        !drill.cast &&
        sameLedge(this.nearestLedge(dummy, 188, -35, 165), drill.edge)
      ) {
        drill.cast = true;
        return { ...idleInput, y: -1, special: true };
      }
      const dx = drill.edge.x - dir * 9 - dummy.x;
      return { ...idleInput, x: clamp((dx * 6 - dummy.vx * 0.5) / dummy.stats.speed, -1, 1) };
    }
    finishRollPractice(outcome) {
      const drill = this.rollPractice;
      if (drill?.phase !== 'active') return;
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('rollResult', { f: this.dogs[0], pattern: drill.pattern, outcome, evaded: drill.evaded });
    }
    rollPracticeInput(dt) {
      const drill = this.rollPractice;
      if (drill.phase !== 'active') return idleInput;
      const [f, dummy] = this.dogs;
      drill.time += dt;
      if(drill.pattern==='scout'){
        const choice=this.predictLedgeRoll(dummy,f,drill);
        if(choice)return choice;
        if(!drill.rollForecast && !drill.acted && drill.time>=.32){
          drill.acted=true;
          return {...idleInput,x:dummy.face*.5,quickAttack:true,tapped:{attack:true}};
        }
        if(drill.time>1.25 && (!drill.rollForecast || this.time>drill.rollForecast.strikeAt+.6) && !dummy.attack && !f.floorAction)
          this.finishRollPractice(drill.rollForecast?.thrown?'baited':drill.rolled?'observed':'clear');
        return idleInput;
      }
      const read = drill.pattern === 'read';
      const cue = read ? (f.kit.ledgeRoll.arrive + 3) / 60 - grabs[dummy.kit.grab].start : 3 / 60;
      if (!drill.acted && drill.time + 1e-8 >= cue) {
        drill.acted = true;
        return read ? { ...idleInput, grab: true } : { ...idleInput, attack: true, x: dummy.face };
      }
      if (drill.time > (f.kit.ledgeRoll.total + 15) / 60 && !dummy.attack && !f.floorAction) {
        const past = (f.x - dummy.x) * (drill.side === 'left' ? 1 : -1) > 0;
        this.finishRollPractice(drill.rolled && past ? 'passed' : 'clear');
      }
      return idleInput;
    }
    placeLastDodge(side, wide, slot) {
      const f = this.dogs[slot], guard = this.dogs[1-slot], solid = this.terrain.filter(p => !p.thin);
      const inward = side === 'left' ? 1 : -1, floor = inward > 0 ? solid[0] : solid.at(-1);
      const lip = inward > 0 ? floor.x1 : floor.x2;
      const gap = wide ? f.kit.airDodge.distance + 17 : 61;
      Object.assign(f, {x:lip - inward*gap, y:floor.y + (wide ? 22 : 117), ground:-1, face:inward,
        vx:-inward*120, vy:240, jumps:0, usedUp:true, usedDodge:false});
      Object.assign(guard, {x:lip + inward*46, y:floor.y, ground:this.terrain.indexOf(floor), face:-inward});
    }
    placeInterruptedReturn(side,slot) {
      const f = this.dogs[slot], guard = this.dogs[1-slot], inward = side === 'left' ? 1 : -1;
      const floors = this.terrain.filter(p => !p.thin), floor = inward > 0 ? floors[0] : floors.at(-1);
      const lip = inward > 0 ? floor.x1 : floor.x2;
      // Put each dog's first recovery in reach of an ordinary Knot Poke on its first active frame.
      const [gap,depth] = {pip:[105,75],brisket:[65,0],noodle:[65,25],clover:[65,75]}[f.kind];
      Object.assign(f,{x:lip-inward*gap,y:floor.y+depth,face:inward,ground:-1,jumps:0,usedDodge:true,vy:80});
      Object.assign(guard,{x:lip+inward*10,y:floor.y,ground:this.terrain.indexOf(floor),face:-inward});
    }
    playRecoveryOpening(side,slot) {
      this.placeInterruptedReturn(side,slot);
      const f = this.dogs[slot], inward = f.face;
      const pair = [idleInput,idleInput];
      for (let frame=0;frame<12;frame++) {
        pair[slot] = {...idleInput,x:inward,y:-1,special:frame===0};
        pair[1-slot] = {...idleInput,aimStick:frame===0,tiltMode:true,smashX:-inward};
        this.step(1/60,...pair);
        if (f.stun && !f.usedUp) break;
      }
    }
    placeHighReturn(side) {
      const outward = side === 'right' ? 1 : -1, floors = this.terrain.filter(p => !p.thin);
      const floor = outward < 0 ? floors[0] : floors.at(-1), lip = outward < 0 ? floor.x1 : floor.x2;
      const [returner, guard] = this.dogs;
      Object.assign(returner, {x:lip+outward*108, y:floor.y-108, ground:-1, jumps:1,
        vx:-outward*90, vy:25, face:-outward, damage:60});
      Object.assign(guard, {x:lip-outward*10, y:floor.y, ground:this.terrain.indexOf(floor), face:outward});
    }
    resetAirPractice(pattern = 'neutral', side = 'left', wide = false, kind) {
      const high = pattern === 'highReturn';
      const slow = (high || pattern === 'interrupted') && (this.airPractice?.pattern !== pattern || this.airPractice.slow);
      this.resetTraining();
      const originalDogs = high || pattern === 'interrupted' ? this.dogs : null;
      if (originalDogs) {
        this.dogs = [newFighter(kind || originalDogs[0].kind,0),newFighter(high ? originalDogs[1].kind : 'noodle',1)];
        this.dogs[1].damage = this.trainingDamage;
      }
      const [f, dummy] = this.dogs;
      const solid = this.terrain.filter((p) => !p.thin);
      const platform = side === 'left' ? solid[0] : solid[solid.length - 1];
      const inward = side === 'left' ? 1 : -1;
      const edge = inward > 0 ? platform.x1 : platform.x2;
      if (high) this.placeHighReturn(side);
      else if (originalDogs) this.placeInterruptedReturn(side,0);
      else if (pattern === 'lastDodge') this.placeLastDodge(side, wide, 0);
      else if (pattern === 'edge') {
        Object.assign(f, {
          x: edge - inward * 72,
          y: platform.y + 40,
          ground: -1,
          vy: -140,
          face: inward,
          jumps: 1,
        });
        Object.assign(dummy, {
          x: edge + inward * 12,
          y: platform.y,
          ground: this.terrain.indexOf(platform),
          face: -inward,
        });
      }
      this.airPractice = { pattern, side, wide, originalDogs, slow, phase: 'ready', time: 0, evaded: '', outcome: '' };
      if (high) this.airPractice.platform = dummy.ground;
    }
    finishAirPractice(outcome) {
      const drill = this.airPractice;
      if (!drill || drill.phase === 'done') return;
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('airResult', { f: this.dogs[0], pattern: drill.pattern, outcome, evaded: drill.evaded });
    }
    airPracticeInput(dt) {
      const drill = this.airPractice;
      const [f, dummy] = this.dogs;
      if (drill.pattern === 'highReturn') {
        const floor = this.terrain[drill.platform];
        if (f.ledge || f.ground >= 0) this.finishAirPractice(drill.clipped ? 'saved' : drill.counter ? 'counter' : 'clean');
        if (drill.phase === 'approach' || this.bot.edgeHop) {
          const input = this.rivalEdgeHop(dummy,f,floor,floor.x1,floor.x2);
          if (input?.jump) {
            drill.phase = 'swing';
            this.emit('airCue',{f:dummy,pattern:drill.pattern,phase:'takeoff'});
          }
          if (input) return input;
        }
        if (dummy.ground >= 0 || dummy.ledge) return idleInput;
        const inside = clamp(dummy.x,floor.x1+52,floor.x2-52), under = dummy.x >= floor.x1 && dummy.x <= floor.x2;
        return this.cpuRecoveryInput(dummy,floor,inside,under,!under || dummy.y>floor.y+28,
          {...idleInput,x:Math.sign(inside-dummy.x)}) || idleInput;
      }
      if (drill.phase === 'done') return idleInput;
      if (drill.pattern === 'interrupted') {
        if (drill.phase === 'approach') {
          drill.phase = 'swing';
          return {...idleInput,aimStick:true,tiltMode:true,smashX:dummy.face};
        }
        if (drill.phase === 'clipped' && !drill.readyToCast && f.stun <= inputWindow) {
          drill.readyToCast = true;
          this.emit('airCue',{f,pattern:drill.pattern,phase:'cast'});
        }
        if (f.ledge || f.ground >= 0) this.finishAirPractice(drill.recast ? 'saved' : 'returned');
        return idleInput;
      }
      if (drill.pattern === 'lastDodge') {
        if (f.ledge) this.finishAirPractice('ledge');
        else if (f.ground >= 0) this.finishAirPractice('land');
        else if (f.y > dummy.y + 220) this.finishAirPractice('miss');
        return idleInput;
      }
      const edge = drill.pattern === 'edge';
      const strike = dummy.kit.tilts[edge ? 'forward' : 'up'];
      drill.time += dt;
      if (drill.phase === 'approach') {
        const inReach = f.ground < 0 && f.vy >= 0 && dummy.y - f.y <= 82;
        if (edge ? drill.time + 1e-8 >= 4 / 60 : inReach) {
          drill.phase = 'swing';
          drill.time = 0;
          this.emit('airCue', { f, pattern: drill.pattern, moveId: strike });
          return { ...idleInput, attack: true, x: edge ? dummy.face : 0, y: edge ? 0 : -1 };
        }
        if (drill.time > 2.6 || (drill.time > 0.2 && f.ground >= 0)) this.finishAirPractice('miss');
      } else if (edge) {
        if (f.ledge) this.finishAirPractice('ledge');
        else if (f.ground >= 0) this.finishAirPractice('land');
        else if (f.y > dummy.y + 155 || drill.time > 2) this.finishAirPractice('miss');
      } else if (drill.time > 0.25 && !dummy.attack) this.finishAirPractice(drill.evaded ? 'evade' : 'miss');
      return idleInput;
    }
    finishShieldPractice(outcome, landingFrames = 0) {
      const drill = this.shieldPractice;
      if (!drill || !['attack', 'windup', 'counter'].includes(drill.phase)) return;
      if (outcome === 'block' && drill.originalDogs && !drill.coverage && drill.pattern !== 'dodgeTiming') {
        drill.phase = 'counter';
        drill.time = 0;
        this.emit('shieldCue', { f: this.dogs[0], phase: 'counter', pattern: drill.pattern });
        return;
      }
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('shieldResult', {
        f: this.dogs[0],
        pattern: drill.pattern,
        outcome,
        lastDodge: drill.lastDodge,
        gap: Math.round(drill.closestGap || 0),
        landingFrames,
      });
    }
    recordPracticeDodge(target, overlaps) {
      const drill = this.shieldPractice;
      if (target.index !== 0 || drill?.phase !== 'attack') return;
      const action = target.floorAction?.type;
      if (action === 'shieldRoll' || (action === 'spotDodge' && overlaps && target.invuln > 0))
        drill.lastDodge = action;
    }
    shieldPracticeInput(dt, input) {
      const drill = this.shieldPractice;
      if (drill.pattern === 'crossup') {
        const [guard,aerial] = this.dogs;
        if (drill.phase === 'done') return idleInput;
        if (drill.phase === 'ready') {
          drill.phase = 'attack';
          return this.landingApproach(drill.dir,true);
        }
        drill.time += dt;
        if (drill.phase === 'counter' && !drill.landing && aerial.ground >= 0 && !guard.shieldStun && !guard.impactLag) {
          drill.landing = (aerial.x-guard.x)*drill.dir < 0 ? 'behind' : 'front';
          this.emit('shieldCue',{f:guard,phase:drill.landing,pattern:drill.pattern});
        }
        const reach = guard.attack;
        if (drill.phase === 'counter' && reach?.grabAttempt && reach.time >= reach.start + reach.active)
          this.finishShieldPractice('whiffGrab');
        else if (drill.time > 1) this.finishShieldPractice('waited');
        return aerial.ground < 0 ? this.landingApproach(drill.dir,false) : {...idleInput,shield:true};
      }
      if (drill.brokenSlot !== undefined) {
        if (drill.brokenSlot === 1) return {...idleInput,shield:true};
        // Let the defender escape a visible charge. The release always comes on the same beat.
        if (drill.phase !== 'dizzy' && drill.phase !== 'awake') return idleInput;
        drill.time += dt;
        if (drill.phase === 'awake' && drill.time > 2.5)
          this.guardBreakCue(this.dogs[0], 'clear', drill.frames, drill.struggles);
        return {...idleInput, smash:drill.time >= .65 && drill.time < 1.67, smashY:-1};
      }
      if (drill.pattern === 'dodgeTiming') return this.dodgeTimingInput(drill, dt);
      if (drill.pattern === 'yourHop') {
        const player = this.dogs[0];
        if (drill.phase === 'ready' && (input.jump || input.shortHop || input.tapped?.jump || input.tapped?.shortHop))
          drill.phase = 'attack';
        if (drill.phase === 'attack') {
          drill.airborne ||= player.ground < 0;
          if (!drill.cued && this.canBufferLandingGrab(player,input.x)) {
            drill.cued = true;
            this.emit('shieldCue',{f:player,phase:'touchdown',pattern:drill.pattern});
          }
          if (drill.airborne && player.ground >= 0 && !player.attack && !player.command) {
            drill.time += dt;
            if (drill.time > .40) this.finishShieldPractice('miss');
          }
        }
        return {...idleInput,shield:drill.phase !== 'done'};
      }
      if (drill.phase === 'ready' && input.shield) {
        drill.phase = 'windup';
        this.emit('shieldCue', { f: this.dogs[0], phase: 'windup', pattern: drill.pattern });
      }
      if (drill.coverage) return this.shieldCoverageInput(drill, dt);
      if (drill.jumpIn) {
        if (drill.phase === 'done' || drill.phase === 'ready') return idleInput;
        drill.time += dt;
        if (drill.time < .22) return idleInput;
        drill.phase = 'attack';
        const cmd = this.jumpInInput(this.dogs[1], drill.jumpIn);
        if (!cmd) this.finishShieldPractice('miss');
        return cmd || idleInput;
      }
      if (drill.originalDogs) return this.shieldAerialInput(drill, dt);
      if (drill.phase === 'windup') {
        drill.time += dt;
        if (drill.time + 1e-8 < 32 / 60) {
          return drill.pattern === 'strike'
            ? { ...idleInput, smash: true, smashX: this.dogs[1].face }
            : idleInput;
        }
        drill.phase = 'attack';
        drill.time = 0;
        this.emit('shieldCue', { f: this.dogs[0], phase: 'attack', pattern: drill.pattern });
        return drill.pattern === 'grab' || drill.pattern === 'counterGrab' ? { ...idleInput, grab: true } : idleInput;
      }
      if (drill.phase === 'attack') {
        drill.time += dt;
        const dummy = this.dogs[1];
        if (drill.pattern === 'counterGrab') {
          const player = this.dogs[0], dodge = player.floorAction;
          if (!drill.cued && drill.lastDodge === 'spotDodge' && dodge?.type === 'spotDodge' &&
              dodge.time + inputWindow + 1e-8 >= dodge.duration - spotCounterLead) {
            drill.cued = true;
            this.emit('shieldCue', { f:player, phase:'counterTap', pattern:drill.pattern });
          }
          if (drill.time > 1.2) this.finishShieldPractice('miss');
          return { ...idleInput, shield:true };
        }
        if (drill.time > 0.3 && !dummy.attack && !this.projectiles.some((d) => d.owner === 1))
          this.finishShieldPractice('miss');
      }
      return idleInput;
    }
    dodgeTimingInput(drill, dt) {
      const [player, trainer] = this.dogs, dodge = player.floorAction;
      if (drill.phase === 'done') return idleInput;
      if (drill.phase !== 'attack') {
        if (dodge?.type !== 'spotDodge') {
          if (drill.phase === 'again' && !drill.restored && !dodgeWear(player)) {
            drill.restored = true;
            this.emit('shieldCue', { f:player, pattern:drill.pattern, phase:'restored' });
          }
          return idleInput;
        }
        drill.attempt++;
        drill.phase = 'attack';
        drill.time = 0;
        drill.swung = false;
        drill.wear = dodge.wear;
        drill.lastDodge = '';
        this.emit('shieldCue', { f:player, pattern:drill.pattern, phase:'sweep', dodge });
      }
      drill.time += dt;
      const sweep = moves[trainer.kit.tilts.down];
      // The last active frame tests the last protected frame of the player's fresh spot-dodge.
      const start = (player.kit.defense.spot[2] + 2)/60 - sweep.start - sweep.active;
      if (!drill.swung && dodge?.type === 'spotDodge' && dodge.time + dt + 1e-8 >= start) {
        drill.swung = true;
        return { ...idleInput, y:1, tapped:{attack:true} };
      }
      if (drill.swung && !trainer.attack && !dodge) {
        if (drill.lastDodge !== 'spotDodge') this.finishShieldPractice('miss');
        else if (drill.attempt === 2) this.finishShieldPractice(drill.wear ? 'wornClear' : 'freshClear');
        else {
          drill.phase = 'again';
          this.emit('shieldCue', { f:player, pattern:drill.pattern, phase:'again' });
        }
      } else if (drill.time > 1.2) this.finishShieldPractice('miss');
      return idleInput;
    }
    shieldCoverageInput(drill, dt) {
      if (drill.phase === 'done') return idleInput;
      drill.time += dt;
      if (drill.pattern === 'poke') {
        const dummy = this.dogs[1];
        if (!dummy.shield && dummy.stun > 0) this.finishShieldPractice('woreOut');
        else if (drill.time > 3) this.finishShieldPractice('miss');
        return { ...idleInput, shield: true, y: -0.5 };
      }
      if (drill.phase === 'attack') {
        if (drill.time > 0.7) this.finishShieldPractice('miss');
        return idleInput;
      }
      const high = drill.pattern === 'high';
      if (high && !drill.jumped && drill.time + 1e-8 >= 13 / 60) {
        drill.jumped = true;
        return { ...idleInput, jump: true };
      }
      if (drill.time + 1e-8 < 30 / 60) return idleInput;
      drill.phase = 'attack';
      drill.time = 0;
      this.emit('shieldCue', { f: this.dogs[0], phase: 'attack', pattern: drill.pattern });
      return high ? { ...idleInput, aimStick: true, smashX: -1 } : { ...idleInput, y: 1, attack: true };
    }
    shieldAerialInput(drill, dt) {
      if (drill.phase === 'ready' || drill.phase === 'done') return idleInput;
      const [player, dummy] = this.dogs;
      const kick = drill.pattern === 'kick';
      drill.time += dt;
      if (drill.phase === 'windup' && drill.time + 1e-8 >= 16 / 60) {
        drill.phase = 'attack';
        drill.time = 0;
        return { ...idleInput, jump: true };
      }
      if (drill.phase === 'attack') {
        const height = this.terrain[0].y - dummy.y;
        if (!drill.swung && dummy.ground < 0 && dummy.vy >= 0 && (!kick || height <= 31)) {
          drill.swung = true;
          this.emit('shieldCue', { f: player, phase: 'attack', pattern: drill.pattern });
          return kick ? { ...idleInput, x: -1, attack: true } : { ...idleInput, y: 1, attack: true };
        }
        if ((drill.swung && dummy.ground >= 0) || drill.time > 1.6) this.finishShieldPractice('miss');
      } else if (drill.phase === 'counter') {
        const grab = player.attack?.grabAttempt && player.attack;
        if (grab && grab.time + 1e-8 >= grab.start + grab.active)
          this.finishShieldPractice(kick && drill.closestGap > 0 ? 'spaced' : 'late');
        if (drill.time > 1.15) this.finishShieldPractice('waited');
        if (kick && drill.time < 0.48) return { ...idleInput, x: 1 };
        if (!kick && dummy.ground >= 0 && dummy.landingLag <= dt + 1e-8)
          return { ...idleInput, jump: true };
      }
      return idleInput;
    }
    practiceInput(dt) {
      const drill = this.launchPractice;
      if (drill.pattern === 'breakaway') {
        if (drill.phase === 'opening') {
          drill.phase = 'lift';
          return {...idleInput, aimStick:true, tiltMode:true, smashY:-1};
        }
        if (drill.phase === 'lift' && this.dogs[0].tumble?.fromHit) drill.phase = 'chase';
        if (drill.phase !== 'chase') return idleInput;
        const frame = drill.frame++;
        if (frame >= 65) {
          this.finishBreakaway(drill.evaded ? 'evaded' : 'clear');
          return idleInput;
        }
        return {...idleInput, jump:frame>=10 && frame<22, aimStick:frame===(drill.late ? 25 : 13), smashX:drill.dir};
      }
      if (drill.phase === 'ready') {
        drill.time += dt;
        if (drill.time >= 0.32 && !drill.grabStarted) {
          drill.grabStarted = true;
          return { ...idleInput, grab: true };
        }
        if (this.grapple && drill.time >= 0.95) return { ...idleInput, y: -1 };
      } else if (drill.pattern === 'juggle' && drill.phase === 'flight') {
        const [player,rival] = this.dogs;
        return this.juggleInput(rival, player, drill);
      } else if (drill.phase === 'flight') {
        const [player, dummy] = this.dogs;
        if (player.tumble && player.vy > 0 && dummy.ground >= 0) {
          const p = this.terrain[dummy.ground];
          const spacing = (dummy.stats.width + player.stats.width + 7) * (dummy.x < player.x ? -1 : 1);
          const mark = clamp(player.x + player.vx * 0.1 + spacing, p.x1 + 20, p.x2 - 20);
          if (Math.abs(mark - dummy.x) > 7) return { ...idleInput, x: Math.sign(mark - dummy.x) };
        }
      }
      return idleInput;
    }
    finishBreakaway(outcome, moveId) {
      const d=this.launchPractice;
      d.phase='done';
      d.outcome=outcome;
      this.emit('breakawayResult',{f:this.dogs[0],outcome,moveId});
    }
    juggleInput(guard, foe, read) {
      const floor = this.terrain[read.floor], dir = read.dir;
      const room = dir > 0 ? floor.x2 - guard.x : guard.x - floor.x1;
      const travel = read.chase && room > 25 ? dir : 0;
      if (read.swung) return { ...idleInput, x:guard.ground < 0 ? travel : 0, jump:!!read.hop && guard.vy < 0 };
      const projectedHeight = t => foe.y + foe.vy*t + 770*foe.kit.gravity*t*t;
      if (read.chase) {
        read.high ||= foe.y < floor.y - 230;
        if (guard.ground >= 0 && read.high && foe.vy > 0 && projectedHeight(.3) >= floor.y - 145) {
          read.hop = true;
          return { ...idleInput, x:travel, jump:true };
        }
        if (guard.ground < 0 && read.hop) {
          const up = moves[guard.kit.air.up], t = up.start;
          if (foe.vy > 0 && projectedHeight(t) - foe.stats.height*.52 >= guard.y + guard.vy*t + up.box[1] - up.box[3] - foe.stats.height*.3) {
            read.swung = true;
            return { ...idleInput, x:travel, jump:true, aimStick:true, smashY:-1 };
          }
          return { ...idleInput, x:travel, jump:true };
        }
      }
      const up = moves[guard.kit.tilts.up];
      if ((!read.chase || !read.high) && foe.vy > 0 && projectedHeight(up.start) - foe.stats.height*.52 >= guard.y + up.box[1] - up.box[3]) {
        read.swung = true;
        return { ...idleInput, y:-1, tapped:{ attack:true } };
      }
      if (read.chase) return { ...idleInput, x:travel };
      const stepBack = clamp(read.origin - dir * 20, floor.x1 + 6, floor.x2 - 6);
      return !guard.attack && (guard.x - stepBack) * dir > 0 ? { ...idleInput, x:-dir*.7 } : idleInput;
    }
    finishJuggle(outcome) {
      const d = this.launchPractice;
      if (d?.pattern !== 'juggle' || d.phase === 'done') return;
      d.phase = 'done';
      d.outcome = outcome;
      this.emit('juggleResult', { f:this.dogs[0], outcome });
    }
    checkJuggle() {
      const d = this.launchPractice, f = this.dogs[0];
      if (d.phase !== 'flight') return;
      if (f.ground < 0 && (f.usedDodge || f.jumps < d.airJumps || f.usedUp)) d.spent = true;
      if (!d.cue && f.tumble && !f.tumble.pending && !f.stun) {
        d.cue = true;
        this.emit('juggleCue', { f, dir:d.dir });
      }
      if (f.floorAction) this.finishJuggle(f.floorAction.type === 'downed' ? 'downed' : 'tech');
      else if (f.ground >= 0) this.finishJuggle(d.wiggled && !d.spent ? 'clean' : 'landed');
      else if (f.ledge) this.finishJuggle('ledge');
    }
    projectLaunch(f, vx, vy, points) {
      const dt = 1 / 60, drag = Math.pow(0.68, dt);
      const downLaunch = f.tumble?.pending ? Math.max(0, vy) : f.tumble?.downLaunch;
      const stop = f.tumble?.meteor && (f.jumps || !f.usedUp)
        ? Math.min(f.stun, moves[f.tumble.meteor].meteor * dt) : f.stun;
      const path = { x: f.x, y: f.y, ticks: 0, zone: '', contact:'', drop: f.drop, dropPlatform: f.dropPlatform };
      // A wall, landing or first actionable frame ends the forecast. Each can change the flight.
      for (let n = 1; n * dt < stop - 1e-8; n++) {
        const x = path.x, y = path.y, time = this.time + n * dt;
        vx *= drag;
        vy = Math.min(vy + 1540 * f.kit.gravity * dt, 970);
        path.x += vx * dt;
        path.y += vy * dt;
        path.ticks = n;
        if (points) points.push({x:path.x, y:path.y});
        path.drop = Math.max(0, path.drop - dt);
        const terrain = !this.layout && arenas[this.geometryStage]?.movingPlatform != null ? platforms(this.geometryStage, time) : this.terrain;
        const solid = this.solidContact(f, x, y, path.x, path.y);
        if (solid) {
          path.contact = solid.ceiling ? 'ceiling' : 'wall';
          path.hardImpact = Math.abs(solid.ceiling ? vy : vx) >= maxTechSpeed;
          break;
        }
        if (vy >= 0 && this.landingSurface(path, y, x, f.tumble?.meteor ? dt : 0, terrain, time) >= 0) {
          path.contact = 'floor';
          path.hardImpact = !f.throwBounce && floorImpactSpeed(vy, downLaunch, (f.tumble?.time || 0) + n * dt) >= maxTechSpeed;
          break;
        }
        path.zone = blastZone(path.x, path.y, this.stageWidth, this.blastInset(path.ticks));
        if (path.zone) break;
        if (!path.dodgeFrame && (f.tumble?.pending || f.tumble?.fromHit) && !f.tumble.meteor && !f.usedDodge && !f.throwBounce &&
            fadeWindow(f.tumble.time+n*dt,Math.hypot(vx,vy),f.stun-n*dt,false)) {
          const future={...f,...path,vx,vy};
          if (this.floorAhead(future,techWindow+dt)<0 && !this.solidAhead(future,techWindow+dt)) path.dodgeFrame=n+1;
        }
      }
      return path;
    }
    cpuLaunchAim(f) {
      const home = f.x < this.stageWidth / 2 ? 1 : -1;
      const normal = { x: home, y: Math.abs(f.vx) > Math.abs(f.vy) ? -1 : 0 };
      const margin = p => Math.min(p.x + 115 - this.blastInset(p.ticks), this.stageWidth + 115 - p.x - this.blastInset(p.ticks), p.y - topBlastY, 765 - p.y);
      const forecast = input => {
        const v = launchInfluence(f.vx, f.vy, input);
        return this.projectLaunch(f, v.x, v.y);
      };
      const usual = forecast(normal);
      const readImpact = this.cpuLevel === 'rival';
      if (!usual.zone && margin(usual) >= 80 && !(readImpact && usual.hardImpact)) return normal;
      const floors = this.terrain.filter(p => !p.thin);
      const deck = floors.reduce((best, p) => Math.abs(f.x - clamp(f.x, p.x1, p.x2)) <
        Math.abs(f.x - clamp(f.x, best.x1, best.x2)) ? p : best);
      const score = p => p.zone ? -10000 + p.ticks : margin(p) - Math.max(0, p.y - deck.y) * 0.35 -
        (readImpact && p.hardImpact ? 1000 : 0);
      let best = normal, bestScore = score(usual);
      for (const x of [home, 0, -home]) for (const y of [-1, 0, 1]) {
        const value = score(forecast({ x, y }));
        if (value > bestScore + 1e-6) { bestScore = value; best = { x, y }; }
      }
      return best;
    }
    releaseLaunch(f, input) {
      const raw = { x: f.vx, y: f.vy };
      let aim = f.index === 0 && this.survivalPractice?.lockedAim;
      const combo=this.comboPractice;
      if(f.index===1 && combo && !combo.defending && ['diIn','diOut','diMix'].includes(combo.reply)){
        const inward=combo.reply==='diMix'?this.random()<.5:combo.reply==='diIn';
        const away=Math.sign(f.x-this.dogs[0].x) || this.dogs[0].face;
        aim={x:inward?-away:away,y:0};
        combo.launchRead=inward?'in':'out';
      }
      const v = launchInfluence(f.vx, f.vy, aim || input);
      f.vx = v.x;
      f.vy = v.y;
      f.tumble.pending = false;
      f.tumble.fromHit = true;
      f.tumble.downLaunch = Math.max(0, v.y);
      if (this.survivalPractice && f.index === 0) {
        this.survivalPractice.angle = v.angle;
        this.survivalPractice.scale = v.scale;
        if (f.tumble.finalHit) this.survivalPractice.releaseZone = this.projectLaunch(f,v.x,v.y).zone;
        this.survivalPractice.trace.push({ x: f.x, y: f.y - f.stats.height * 0.52 });
      }
      this.emit('launchDI', {
        f,
        angle: v.angle,
        scale: v.scale,
        raw,
        velocity: { x: f.vx, y: f.vy },
        point: { x: f.x, y: f.y - f.stats.height * 0.52 },
      });
    }
    blastInset(aheadFrames = 0) {
      return this.suddenDeath ? clamp((this.suddenDeath.frames + aheadFrames - 300) / 1080, 0, 1) * 480 : 0;
    }
    startSuddenDeath(cause = 'direct') {
      this.suddenDeath = { round:(this.suddenDeath?.round || 0) + 1, intro:90, frames:0, cause };
      this.clockFrames = null;
      this.grapple = this.ball = null;
      this.projectiles = [];
      this.ledgeClaims = [];
      this.hitStop = 0;
      this.finalHitHold = 0;
      this.lastCombo = { hits:0, damage:0 };
      this.resetCpu();
      for (const f of this.dogs) {
        this.spawn(f, false);
        f.stocks = 1;
        f.damage = 300;
      }
    }
    finishMatch(winner, reason) {
      this.end = winner;
      this.endReason = reason;
      if (this.matchCard) {
        this.matchCard.frames = this.matchFrames;
        this.matchCard.reason = reason;
      }
      this.emit('win', { f:this.dogs[winner] });
    }
    step(dt, input1 = idleInput, input2 = idleInput) {
      if (this.end !== null) return;
      const frames = dt * 60;
      if (this.suddenDeath?.intro > 0) {
        this.suddenDeath.intro = Math.max(0, this.suddenDeath.intro - frames);
        this.dogs[0].prev = { ...input1 };
        if (this.mode === 'local') this.dogs[1].prev = { ...input2 };
        return;
      }
      const holdingFinish = this.finalHitHold > 0;
      if (!holdingFinish && (this.mode === 'solo' || this.mode === 'local')) this.matchFrames += frames;
      if (this.suddenDeath && this.hitStop <= 0) this.suddenDeath.frames += frames;
      this.stepFighters(dt, input1, input2);
      if (this.clockFrames === null || holdingFinish) return;
      this.clockFrames = Math.max(0, this.clockFrames - frames);
      if (this.clockFrames > 1e-8 || this.end !== null) return;
      const [first,second] = this.matchCard?.points || this.dogs.map(f=>f.stocks);
      if (first === second) this.startSuddenDeath('time');
      else this.finishMatch(first > second ? 0 : 1, 'time');
    }
    stepFighters(dt, input1, input2) {
      const breakaway = this.launchPractice?.pattern === 'breakaway' && this.launchPractice;
      if (breakaway) {
        if (breakaway.phase === 'waiting') {
          if (!input1.attack && !input1.tapped?.attack) return;
          breakaway.phase='opening';
          breakaway.consumeAttack=true;
        }
        if (breakaway.consumeAttack) {
          breakaway.consumeAttack=!!input1.attack;
          input1={...input1,attack:false,tapped:{...input1.tapped,attack:false}};
        }
        if (breakaway.phase==='chase' && !breakaway.opened && this.canEscapeHitstun(this.dogs[0],true)) {
          breakaway.opened=true;
          breakaway.paused=breakaway.pauseAtWindow;
          breakaway.previous=this.dogs[0].prev;
          this.emit('breakawayWindow',{f:this.dogs[0]});
        }
        if (breakaway.paused && breakaway.pauseAtWindow) {
          const key=['shield','aimStick','attack','jump'].find(k=>input1.tapped?.[k] || (input1[k] && !breakaway.previous[k]));
          breakaway.previous=input1;
          if (!key) return;
          breakaway.consumeJump=key==='jump';
          input1={...input1,tapped:{...input1.tapped,[key]:true}};
          breakaway.paused=false;
        }
        if (breakaway.consumeJump) {
          breakaway.consumeJump=!!input1.jump;
          input1={...input1,jump:false,tapped:{...input1.tapped,jump:false}};
        }
        if (breakaway.phase==='opening' || breakaway.phase==='lift') input1=idleInput;
      }
      const juggle = this.launchPractice?.pattern === 'juggle' && this.launchPractice;
      if (juggle?.phase === 'waiting') {
        if (!input1.attack && !input1.tapped?.attack) return;
        juggle.phase = 'ready';
      }
      const edge = this.edgePractice;
      if (edge?.phase === 'ready') {
        const start = edge.corner ? input1.shield : edge.pattern === 'lip' ? input1.x || input1.jump :
          input1.attack || input1.tapped?.attack;
        if (!start) return;
        edge.phase = 'approach';
        if (edge.timeCatch) edge.startHeld = true;
      }
      if (edge?.startHeld) {
        edge.startHeld = !!input1.attack;
        input1 = { ...input1, attack: false, tapped: { ...input1.tapped, attack: false } };
      }
      let combo = this.comboPractice;
      if (combo) {
        if(combo.source==='throwChase' || combo.source==='confirm'){
          if(combo.phase==='done' && (input1.tapped?.attack || (input1.attack && !combo.chaseHeld))){
            this.resetComboPractice(combo.source,combo.reply,combo.slow,combo.slot,true);
            combo=this.comboPractice;
          }
          combo.chaseHeld=!!input1.attack;
        }
        if (combo.defending) {
          const tap = input1.tapped?.attack || (input1.attack && !combo.attackHeld);
          combo.attackHeld = !!input1.attack;
          if (combo.phase === 'done' && tap) {
            this.resetComboPractice(combo.source, combo.reply, combo.slow, combo.slot);
            combo = this.comboPractice;
            combo.attackHeld = !!input1.attack;
          }
          if (combo.phase === 'ready') {
            if (!tap) return;
            combo.playSlot = combo.source === 'mix' ? Math.min(1,Math.floor(this.random()*2)) : combo.slot;
            combo.tape = combo.source === 'escapeFlurry' ? [] : this.comboTakes[combo.playSlot] || [];
            combo.phase = 'countdown';
            combo.lead = 30;
            combo.consumeAttack = true;
          }
          if (combo.consumeAttack) {
            combo.consumeAttack = !!input1.attack;
            input1 = {...input1, attack:false, tapped:{...input1.tapped,attack:false}};
          }
          if (combo.phase === 'countdown') {
            if (--combo.lead > 0) return;
            combo.phase = 'active';
          }
          input2 = input1;
        } else if (combo.reply !== 'p2') input2 = this.comboRivalInput(dt, this.hitStop > 0);
        input1 = this.comboPlayerInput(input1);
        if (!input1) return;
      }
      let exercise = this.stockPractice || this.survivalPractice;
      if (exercise && exercise.phase !== 'active') {
        const tap = input1.tapped?.attack || (input1.attack && !this.dogs[0].prev.attack);
        if (!tap || exercise.consumeAttack) {
          exercise.consumeAttack = !!input1.attack && exercise.consumeAttack;
          this.dogs[0].prev = { ...input1 };
          return;
        }
        if (exercise.phase === 'done') {
          if (this.survivalPractice) {
            const last = exercise.trace;
            this.resetSurvivalPractice(exercise.dir, exercise.slow, exercise.baseline);
            this.survivalPractice.previous = last;
          }
          else this.resetStockPractice(exercise.pattern, exercise.dir, exercise.slow);
          exercise = this.stockPractice || this.survivalPractice;
        }
        exercise.phase = 'active';
        exercise.consumeAttack = true;
        if (this.stockPractice) this.emit('stockStart', { f: this.dogs[exercise.slot] });
        else this.emit('survivalStart', { f: this.dogs[0] });
      }
      if (exercise?.consumeAttack) {
        exercise.consumeAttack = !!input1.attack;
        input1 = { ...input1, attack: false, tapped: { ...input1.tapped, attack: false } };
      }
      if (exercise?.study && exercise.phase === 'active' && exercise.released &&
          !exercise.lockedAim && this.dogs[0].tumble?.pending) {
        if (this.studySurvivalLaunch(exercise, input1)) return;
        exercise.consumeAttack = !!input1.attack;
        input1 = { ...input1, attack:false, tapped:{ ...input1.tapped, attack:false } };
      }
      let meteorDrill = this.meteorPractice;
      if (meteorDrill?.phase === 'ready' || meteorDrill?.phase === 'done') {
        const tap = input1.tapped?.attack || (input1.attack && !this.dogs[0].prev.attack);
        if (tap && !meteorDrill.consumeAttack) {
          if (meteorDrill.phase === 'done') {
            this.resetMeteorPractice(meteorDrill.pattern, meteorDrill.dir, meteorDrill.slow, meteorDrill.baseline);
            meteorDrill = this.meteorPractice;
          }
          meteorDrill.phase = 'strike';
          meteorDrill.consumeAttack = true;
          this.emit('meteorStart', { f: this.dogs[0] });
        } else if (meteorDrill.phase === 'ready') return;
      }
      if (meteorDrill?.consumeAttack) {
        meteorDrill.consumeAttack = !!input1.attack;
        input1 = { ...input1, attack: false, tapped: { ...input1.tapped, attack: false } };
      }
      const wave = this.wavePractice;
      if (wave?.phase === 'ready') {
        if (!['jump', 'shield', 'grab', 'attack'].some(key => input1[key] || input1.tapped?.[key])) return;
        wave.phase = 'active';
      }
      if (this.freshnessPractice?.waiting) {
        if (!input1.x && !input1.y && !['jump', 'attack', 'smash', 'special', 'grab', 'shield', 'aimStick']
          .some(key => input1[key] || input1.tapped?.[key])) return;
        this.freshnessPractice.waiting = false;
      }
      const footwork = this.footworkPractice;
      if (footwork && footwork.pauseOnWindup !== undefined) {
        const attack = input1.attack || input1.tapped?.attack || input1.aimStick || input1.tapped?.aimStick;
        const grab = input1.grab || input1.tapped?.grab;
        if (footwork.phase === 'ready') {
          if (!attack && !(footwork.boost && grab)) return;
          footwork.phase = 'starting';
          footwork.attackHeld = !!input1.attack;
        } else if (footwork.phase === 'starting' || footwork.phase === 'cancelNow') {
          if (footwork.phase === 'starting' && cancelableWindup(this.dogs[0])) {
            footwork.phase = 'cancelNow';
            this.emit('footworkCue', {f:this.dogs[0], phase:'cancelNow', moveId:cancelableWindup(this.dogs[0])});
          }
          if (footwork.phase === 'cancelNow' && footwork.pauseOnWindup &&
              !(footwork.boost ? grab : input1.jump || input1.shortHop || input1.tapped?.jump || input1.tapped?.shortHop)) {
            const continueSwing = input1.tapped?.attack || (input1.attack && !footwork.attackHeld);
            footwork.attackHeld = !!input1.attack;
            if (!continueSwing) return;
            footwork.consumeAttack = true;
          }
          footwork.phase = 'swing';
        }
        if (footwork.consumeAttack) {
          footwork.consumeAttack = !!input1.attack;
          input1 = {...input1, attack:false, tapped:{...input1.tapped,attack:false}};
        }
      }
      if (footwork?.phase === 'ready' && (footwork.pattern === 'angleHigh' || footwork.pattern === 'angleLow')) {
        if (!(input1.attack || input1.tapped?.attack || input1.aimStick || input1.tapped?.aimStick)) return;
        footwork.phase = 'swing';
      }
      if (footwork?.discRole === 'cast' && footwork.phase === 'ready') {
        if (!input1.special && !input1.tapped?.special) return;
        footwork.phase = 'swing';
      }
      if (footwork && (footwork.discRole === 'bark' || ['disc','power','match','armor','armorGrab','crawl'].includes(footwork.pattern))) {
        if (footwork.phase === 'ready') {
          if (!input1.attack && !input1.tapped?.attack) return;
          footwork.phase = 'count';
          footwork.consumeAttack = true;
        }
        if (footwork.consumeAttack) {
          footwork.consumeAttack = !!input1.attack;
          input1 = { ...input1, attack: false, tapped: { ...input1.tapped, attack: false } };
        }
      }
      const chase = this.chasePractice;
      if (chase?.phase === 'ready') {
        if (!input1.attack && !input1.tapped?.attack) return;
        chase.phase = 'fall';
        chase.consumeAttack = true;
        this.emit('chaseCue', { f: this.dogs[chase.slot], phase: 'fall' });
      }
      if (chase?.consumeAttack) {
        chase.consumeAttack = !!input1.attack;
        input1 = { ...input1, attack: false, tapped: { ...input1.tapped, attack: false } };
      }
      let spacing = this.spacingPractice;
      if (spacing?.pattern === 'airPower' && spacing.phase === 'done') {
        const f = this.dogs[0];
        const retry = input1.tapped?.jump || input1.tapped?.shortHop || (input1.jump && !f.prev.jump);
        if (!retry) {
          f.prev = {...input1};
          return;
        }
        this.resetSpacingPractice('airPower', spacing.dir, spacing.slow);
        spacing = this.spacingPractice;
        this.emit('spacingRetry',{f:this.dogs[0]});
      }
      if (spacing?.pattern === 'fastfall' && spacing.phase === 'active') {
        const f = this.dogs[0];
        if (!spacing.apex && f.ground < 0 && framesToApex(f) <= fastFallBufferFrames) {
          spacing.apex = true;
          spacing.resumed = !spacing.pauseAtApex;
          this.emit('apexCue',{f});
        }
        if (spacing.apex && spacing.pauseAtApex && !spacing.resumed) {
          if (input1.y < .65 && !input1.shield && !input1.tapped?.shield) return;
          spacing.resumed = true;
        }
      }
      if (spacing?.pattern === 'cancel' && spacing.phase !== 'active') {
        const tap = input1.tapped?.attack || (input1.attack && !this.dogs[0].prev.attack);
        const stick = input1.tapped?.aimStick || (input1.aimStick && !this.dogs[0].prev.aimStick);
        this.dogs[0].prev = { ...input1 };
        if (spacing.phase === 'done') {
          if (tap) {
            this.resetSpacingPractice('cancel', spacing.dir, spacing.slow);
            this.spacingPractice.previousFrames = spacing.frames;
            this.dogs[0].prev = { ...input1 };
            this.emit('spacingRetry', { f: this.dogs[0] });
          }
          return;
        }
        if (!tap && !stick) return;
        input1 = { ...input1, tapped: { ...input1.tapped, attack: !!tap, aimStick: !!stick } };
        spacing.phase = 'active';
        this.emit('spacingCancelStart', { f: this.dogs[0] });
      }
      if (isReversalPractice(spacing) && spacing.phase === 'done' &&
          (input1.tapped?.attack || (input1.attack && !this.dogs[0].prev.attack))) {
        this.resetSpacingPractice(spacing.pattern, spacing.dir, spacing.slow, spacing.guard);
        this.emit('spacingRetry', { f: this.dogs[0] });
        return;
      }
      if (spacing?.phase === 'ready') {
        const start = isSweetPractice(spacing) || spacing.pattern === 'fastfall' ? input1.attack || input1.tapped?.attack || input1.aimStick || input1.tapped?.aimStick :
          isFootstoolPractice(spacing) ? input1.attack || input1.tapped?.attack :
          isReversalPractice(spacing) ? Math.abs(input1.x) > 0.28 || input1.special || input1.tapped?.special
          : input1.jump || input1.tapped?.jump;
        if (!start) return;
        spacing.phase = 'active';
        if (isFootstoolPractice(spacing)) spacing.consumeAttack = true;
      }
      if (spacing?.consumeAttack) {
        spacing.consumeAttack = !!input1.attack;
        input1 = { ...input1, attack:false, tapped:{ ...input1.tapped, attack:false } };
      }
      if (spacing?.pattern === 'airPower' && spacing.phase === 'active') spacing.frames++;
      if (isSweetPractice(spacing) && spacing.phase === 'done' && !this.hitStop) {
        if (spacing.flightFrames >= 24) return;
        spacing.flightFrames = (spacing.flightFrames || 0) + 1;
      }
      if (this.climbPractice) {
        const drill = this.climbPractice;
        if (drill.phase === 'ready') {
          if (drill.role === 'coverRise') {
            if (!input1.shield && !input1.attack && !input1.tapped?.attack) return;
            drill.consumeAttack = !!(input1.attack || input1.tapped?.attack);
          } else if (drill.role === 'trap' || drill.role === 'patience') {
            if (!input1.attack && !input1.tapped?.attack) return;
            drill.consumeAttack = true;
          } else if (!(Math.abs(input1.x) > 0.45 || input1.y > 0.5 || input1.attack || input1.jump ||
              input1.shield || input1.tapped?.attack || input1.tapped?.jump || input1.tapped?.shield)) return;
          drill.phase = 'active';
          this.emit('climbCue', { f: this.dogs[0], phase: 'start' });
        }
        if (drill.consumeAttack) {
          drill.consumeAttack = !!input1.attack;
          input1 = { ...input1, attack: false, tapped: { ...input1.tapped, attack: false } };
        }
      }
      if (this.escapePractice?.gripDrill) {
        const d = this.escapePractice;
        if (d.phase === 'ready') {
          const key = d.spacing === 'gripEscape' ? 'attack' : 'grab';
          if (!input1.tapped?.[key] && !(input1[key] && !this.dogs[0].prev[key])) return;
          d.phase = 'approach';
          d.consumeAttack = key === 'attack';
          this.emit('escapeCue',{f:this.dogs[0],phase:'approach'});
        }
        if (d.consumeAttack) {
          d.consumeAttack = !!input1.attack;
          input1 = {...input1,attack:false,tapped:{...input1.tapped,attack:false}};
        }
      } else if (this.escapePractice?.spacing === 'break') {
        const drill = this.escapePractice;
        if (drill.phase === 'ready') {
          if (!input1.x && !input1.y && !['attack','grab','jump','smash','special','aimStick'].some(key=>input1[key] || input1.tapped?.[key])) return;
          drill.phase = 'approach';
        }
      } else if (this.escapePractice) {
        let drill = this.escapePractice;
        const start = input1.tapped?.attack || (input1.attack && !this.dogs[0].prev.attack);
        if (drill.phase === 'ready' || drill.phase === 'done') {
          if (start && !drill.consumeAttack) {
            if (drill.phase === 'done') this.resetEscapePractice(drill.spacing, drill.slow, drill.baseline);
            drill = this.escapePractice;
            drill.phase = 'windup';
            drill.consumeAttack = true;
            this.emit('escapeCue', { f: this.dogs[0], phase: 'windup' });
          } else if (drill.phase === 'ready') return;
        }
        if (drill.consumeAttack) {
          drill.consumeAttack = !!input1.attack;
          input1 = { ...input1, attack: false, tapped: { ...input1.tapped, attack: false } };
        }
      }
      let guardDrill = this.shieldPractice;
      if (guardDrill?.pattern === 'crossup' && guardDrill.phase === 'ready' && !input1.shield) return;
      if (guardDrill?.brokenSlot !== undefined && guardDrill.phase === 'ready') {
        if (guardDrill.brokenSlot === 0 ? !input1.shield :
            !input1.x && !input1.smash && !input1.tapped?.smash && !input1.attack && !input1.aimStick) return;
        guardDrill.phase = 'wear';
      }
      if (guardDrill?.jumpIn && guardDrill.phase === 'ready' && (guardDrill.pattern === 'yourHop'
          ? !(input1.jump || input1.shortHop || input1.tapped?.jump || input1.tapped?.shortHop) : !input1.shield)) return;
      if (guardDrill?.coverage && guardDrill.pattern !== 'poke' && guardDrill.phase === 'done') {
        if (!input1.shield) guardDrill.released = true;
        else if (guardDrill.released) {
          this.resetShieldPractice(guardDrill.pattern, guardDrill.worn);
          guardDrill = this.shieldPractice;
        }
      }
      if (guardDrill?.coverage && guardDrill.phase === 'ready') {
        if (guardDrill.pattern === 'poke') {
          if (!input1.x && !input1.y && !['attack','smash','special','jump','grab','aimStick'].some(k => input1[k] || input1.tapped?.[k])) return;
          guardDrill.phase = 'attack';
        } else if (!input1.shield) return;
      }
      const guardTop = this.platformPractice;
      if (guardTop?.pattern === 'shield-drop' && guardTop.phase === 'ready') {
        if (!input1.shield) return;
        guardTop.phase = 'approach';
      }
      if (guardTop?.defend) {
        if (guardTop.phase === 'ready') {
          if (!input1.attack && !input1.tapped?.attack) return;
          guardTop.phase = 'climbing';
          guardTop.consumeAttack = true;
          this.emit('platformClimb', { f: this.dogs[1] });
        }
        if (guardTop.consumeAttack) {
          guardTop.consumeAttack = !!input1.attack;
          input1 = { ...input1, attack: false, tapped: { ...input1.tapped, attack: false } };
        }
      }
      const wallDrill = this.wallPractice;
      if (wallDrill?.runner && wallDrill.phase === 'ready') {
        if (Math.abs(input1.x) < .28 && !input1.jump && !input1.tapped?.jump && !input1.special && !input1.tapped?.special) return;
        wallDrill.phase = 'return';
      } else if (wallDrill?.phase === 'ready') {
        this.dogs[0].prev = { ...input1 };
        if (wallDrill.ceiling) {
          if (!input1.attack && !input1.tapped?.attack) return;
        } else {
          wallDrill.time += dt;
          if (wallDrill.time + 1e-8 < 0.75) return;
        }
        wallDrill.phase = 'swing';
        this.emit('wallCue', { f: this.dogs[0] });
      }
      if (this.trumpPractice?.phase === 'ready') {
        if (!(Math.abs(input1.x) > 0.2 || input1.jump || input1.shield || input1.special || input1.attack))
          return;
        this.trumpPractice.phase = 'approach';
      }
      if (this.rollPractice?.phase === 'ready') {
        if(this.rollPractice.pattern==='scout'){
          if(!input1.attack && !input1.tapped?.attack)return;
          this.rollPractice.cueHeld=true;
        }
        if (
          !(
            input1.shield ||
            input1.tapped?.shield ||
            input1.attack ||
            input1.tapped?.attack ||
            input1.jump ||
            input1.tapped?.jump ||
            Math.abs(input1.x) > 0.45 ||
            input1.y > 0.5
          )
        )
          return;
        this.rollPractice.phase = 'active';
      }
      if(this.rollPractice?.cueHeld){
        this.rollPractice.cueHeld=!!input1.attack;
        input1={...input1,attack:false,tapped:{...input1.tapped,attack:false}};
      }
      if (this.airPractice?.phase === 'ready') {
        const start =
          this.airPractice.pattern === 'highReturn' ? input1.attack || input1.tapped?.attack :
          this.airPractice.pattern === 'interrupted' ? input1.y < -.48 && (input1.special || input1.tapped?.special) :
          this.airPractice.pattern === 'neutral'
            ? input1.jump
            : Math.hypot(input1.x, input1.y) >= 0.35 || input1.shield || input1.jump || input1.special;
        if (!start) return;
        this.airPractice.phase = 'approach';
        if (this.airPractice.pattern === 'highReturn') this.airPractice.cueHeld = true;
        this.emit('airStart', { f: this.dogs[0], pattern: this.airPractice.pattern });
      }
      if (this.airPractice?.cueHeld) {
        this.airPractice.cueHeld = !!input1.attack;
        input1 = {...input1,attack:false,tapped:{...input1.tapped,attack:false}};
      }
      if (this.hitStop > 0) {
        this.captureInput(this.dogs[0], input1);
        if (this.hasSecondPlayer || combo) this.captureInput(this.dogs[1], input2);
        if (this.finalHitHold > 0)
          this.finalHitHold = this.finalHitHold <= dt + 1e-8 ? 0 : this.finalHitHold - dt;
        else this.hitStop = this.hitStop <= dt + 1e-8 ? 0 : this.hitStop - dt;
        for (const f of this.dogs) {
          const human = f.index === 0 ? input1 : this.hasSecondPlayer || combo ? input2 : null;
          if (f.hitShift) {
            // A CPU can read a second swing once. It must re-center and flick under the same rules.
            const cpu = f.hitShift.cpuDirection && f.hitShift.remaining <= 4 ? { x: f.hitShift.cpuDirection } : idleInput;
            this.shiftDuringHit(f, human || cpu);
          }
          if (!this.hitStop && f.tumble?.pending)
            this.releaseLaunch(f, human || f.tumble.finalAim || (this.cpuControlled(f) ? this.cpuLaunchAim(f) : idleInput));
        }
        return;
      }
      this.time += dt;
      if (combo) combo.clock++;
      if (this.survivalPractice) this.survivalPractice.ticks++;
      if (wave?.phase === 'active') wave.frame++;
      const old = this.terrain;
      if (this.layout) this.terrain = this.layout.terrain;
      else if (this.mode === 'training' || arenas[this.geometryStage]?.movingPlatform != null)
        this.terrain = platforms(this.geometryStage, this.time);
      let second = input2;
      if (this.mode === 'solo') second = this.cpu(dt);
      else if (this.mode === 'training' && !combo && !this.trainingPartner) second = this.trainingRivalInput(dt, input1);
      const settingUpWallHit = wallDrill?.phase === 'swing';
      const inputs = [
        this.launchPractice?.phase === 'ready' || (this.survivalPractice && !this.survivalPractice.released) ||
          (this.escapePractice?.spacing === 'carry' && this.escapePractice.phase === 'flight') ||
          settingUpWallHit ? idleInput : input1,
        ...(Array.isArray(second) ? second : [second]),
      ];
      if (settingUpWallHit && !wallDrill.swung) {
        inputs[1] = wallDrill.ceiling ? {...idleInput, y:-1, attack:true} : {...idleInput, x:wallDrill.inward, attack:true};
        wallDrill.swung = true;
      }
      for (const f of this.dogs) {
        f.hitShift = null;
        if (f.stockGuard > 0) {
          f.stockGuard = f.stockGuard <= dt + 1e-8 ? 0 : f.stockGuard - dt;
          if (!f.stockGuard) this.emit('stockOpen', { f, point: { x: f.x, y: f.y - f.stats.height * 0.5 } });
        }
        if (f.ground !== -1) {
          f.x += this.terrain[f.ground].x1 - old[f.ground].x1;
          if (f.impactLag > 1e-8 || f.shieldStun > 1e-8) f.y = this.terrain[f.ground].y;
        }
        this.captureInput(f, inputs[f.index]);
      }
      // Read both fighters' jump and dodge intentions from the same frame before either body moves.
      for (const f of this.dogs) {
        if (f.jumpBuffer > dt && f.ground < 0) {
          const target = this.footstoolTarget(f);
          if (target) this.footstool(f, target);
        }
      }
      for (const f of this.dogs) {
        if (f.impactLag > 1e-8) f.impactLag = f.impactLag <= dt + 1e-8 ? 0 : f.impactLag - dt;
        else {
          const wasDodging = f.airDodge || f.floorAction?.wear !== undefined;
          if (!f.grip) this.move(f, inputs[f.index], dt);
          if (f.dodgeFatigue && !wasDodging && !f.airDodge && f.floorAction?.wear === undefined)
            f.dodgeFatigue = Math.max(0, f.dodgeFatigue - dt);
        }
        f.techBuffer = Math.max(0, f.techBuffer - dt);
        f.techLock = Math.max(0, f.techLock - dt);
      }
      if (settingUpWallHit) this.dogs[0].prev = { ...input1 };
      // All attacks that connect this frame read the same pre-contact damage, including a disc trading with a paw.
      const damageAtContact = this.dogs.map(f => f.damage);
      if (this.grapple) this.advanceGrapple(dt);
      for (const f of this.dogs) {
        if (f.ground >= 0) {
          f.airborneTime = 0;
          f.ledgeCatches = 0;
          f.ledgeProtectionReady = true;
          f.ledgeTrump = null;
          f.wallAction = null;
        }
      }
      if (this.ledgeClaims.length) this.resolveLedgeClaims();
      this.separateGroundedFighters();
      this.resolveMelee(damageAtContact);
      for (const f of this.dogs) if (f.attack?.landed) f.attack = null;
      this.updateDiscs(dt, damageAtContact);
      if (juggle) this.checkJuggle();
      if (this.platformPractice) this.checkPlatformPractice();
      if (edge) this.checkEdgePractice();
      if (this.climbPractice) this.checkClimbPractice();
      if (this.spacingPractice) this.checkSpacingPractice(dt);
      if (wave) this.checkWavePractice();
      if (this.chasePractice) this.checkChasePractice(dt);
      if (meteorDrill) this.checkMeteorPractice(dt);
      if (this.stockPractice) this.checkStockPractice(dt);
      if (this.survivalPractice) this.checkSurvivalPractice();
      if (
        this.fetch && !this.suddenDeath &&
        !combo &&
        !edge &&
        !this.platformPractice &&
        !this.spacingPractice &&
        !this.chasePractice &&
        !meteorDrill &&
        !exercise &&
        !this.escapePractice &&
        !this.footworkPractice &&
        !this.freshnessPractice &&
        !this.wavePractice &&
        !this.launchPractice &&
        !this.shieldPractice &&
        !this.airPractice &&
        !this.rollPractice &&
        !this.climbPractice &&
        !this.trumpPractice &&
        !wallDrill
      )
        this.updateBall(dt);
      const inset = this.blastInset();
      const out = this.dogs.filter(f => !f.absent && blastZone(f.x, f.y, this.stageWidth, inset));
      if(combo?.source==='throwChase' && combo.thrown && !combo.outcome){
        const rival=this.dogs[1];
        if(out.length || rival.ground>=0 || rival.ledge){
          combo.outcome=out.length?'ringOut':'landed';combo.phase='done';
        }
      }
      if (out.includes(this.dogs[0]) && (this.airPractice?.pattern === 'interrupted' || this.airPractice?.pattern === 'highReturn'))
        this.finishAirPractice('miss');
      const carryDrill = this.escapePractice;
      if (carryDrill?.spacing === 'carry' && carryDrill.phase !== 'done') {
        const rival = this.dogs[1];
        if (out.includes(this.dogs[0])) this.finishEscapePractice('fell');
        else if (out.includes(rival)) this.finishEscapePractice('ringOut');
        else if (carryDrill.phase === 'flight' && (rival.ground >= 0 || rival.ledge))
          this.finishEscapePractice('returned');
      }
      if (this.freshnessPractice) this.traceFreshness(out.includes(this.dogs[1]));
      if (out.length) this.knockouts(out);
    }
    trainingRivalInput(dt, player) {
      if(this.warmupPartner==='spar')return this.cpu(dt);
      if(this.warmupPartner==='shield')return {...idleInput,shield:this.dogs[1].ground>=0};
      if (this.platformPractice?.pattern === 'layers') return idleInput;
      if (this.edgePractice) return this.edgeRivalInput();
      if (this.survivalPractice) return this.survivalInput();
      if (this.stockPractice) return this.stockPracticeInput();
      if (this.meteorPractice) return this.meteorPracticeInput();
      if (this.platformPractice?.pattern === 'shield-drop') {
        const drill = this.platformPractice, rival = this.dogs[1];
        if (drill.phase === 'done') return idleInput;
        drill.ticks++;
        if (drill.ticks === 19) return { ...idleInput, jump: true };
        if (rival.ground < 0 && !drill.swung) {
          drill.swung = true;
          return { ...idleInput, y: -1, attack: true };
        }
        return drill.swung && rival.ground >= 0 ? { ...idleInput, shield: true } : idleInput;
      }
      if (this.platformPractice?.defend) {
        const drill = this.platformPractice;
        if (drill.phase === 'done') return idleInput;
        const mark = drill.mark ?? this.terrain[drill.platform].x1 + 80;
        return this.cpuAscentInput(this.dogs[1], { ground: drill.platform, x: mark }, this.dogs[0]) || idleInput;
      }
      if (this.wavePractice) return this.wavePracticeInput();
      if (this.freshnessPractice) return this.freshnessPractice.guard ? { ...idleInput, shield: true } : idleInput;
      if (this.chasePractice) return this.chasePracticeInput();
      if (this.spacingPractice) return this.spacingPracticeInput();
      if (this.escapePractice) return this.escapePracticeInput(dt);
      if (this.footworkPractice) return this.footworkInput(dt);
      if (this.launchPractice) return this.practiceInput(dt);
      if (this.shieldPractice) return this.shieldPracticeInput(dt, player);
      if (this.airPractice) return this.airPracticeInput(dt);
      if (this.rollPractice) return this.rollPracticeInput(dt);
      if (this.climbPractice) return this.climbPracticeInput(dt);
      if (this.trumpPractice) return this.trumpPracticeInput();
      return idleInput;
    }
    separateGroundedFighters(a = this.dogs[0], b = this.dogs[1]) {
      if (a.ground < 0 || a.ground !== b.ground || a.respawning || b.respawning) return;
      if ([a, b].some((f) => f.attack?.moveId === 'pipSlide' && f.attack.time < f.attack.start)) return;
      if ([a, b].some((f) => f.floorAction?.dir && f.floorAction.type !== 'ledgeClimb')) return;
      const spacing = a.stats.width + b.stats.width;
      const overlap = spacing - Math.abs(a.x - b.x);
      if (overlap <= 0) return;
      const climber = [a, b].find((f) => f.floorAction?.type === 'ledgeClimb');
      const aIsLeft = climber ? (climber.floorAction.dir === 1) === (climber === a) : a.x <= b.x;
      const [left, right] = aIsLeft ? [a, b] : [b, a];
      const surface = this.terrain[left.ground];
      const share = right.stats.weight / (left.stats.weight + right.stats.weight);
      left.x = clamp(left.x - (spacing + left.x - right.x) * share, surface.x1 - 3, surface.x2 - spacing + 3);
      right.x = left.x + spacing;
    }
    captureInput(f, input) {
      const was = f.prev;
      if (!input.attack && f.attack?.holdForFlurry) f.attack.holdForFlurry = false;
      if (!input.attack && f.attack?.flurryBeat) f.attack.finishFlurry = true;
      const pressed = (key) => input.tapped?.[key] || (input[key] && !was[key]);
      if (f.shieldBreak) {
        const state = f.shieldBreak;
        const sector = shiftSector(input, state.sector);
        const flick = sector >= 0 && sector !== state.sector;
        // A direction used to struggle is already held when the dog wakes behind its shield.
        f.shieldAxis = shieldDirection(input.x || input.grabX || 0, input.y, f.shieldAxis);
        if (state.phase === 'dizzy' && !this.hitStop &&
            (flick || ['jump','shortHop','attack','smash','special','shield','grab','aimStick'].some(pressed))) {
          f.stun = Math.max(0, f.stun - 5/60);
          state.struggles++;
        }
        state.sector = sector;
        f.prev = { ...input };
        return;
      }
      const side = Math.sign(input.x);
      f.wallKickDir = f.kit.wallKick && !f.usedWallKick && f.ground < 0 && !f.ledge && !f.tumble && !this.hitStop &&
        Math.abs(input.x) >= .72 && (was.x * side < .55 || pressed('jump')) ? side : 0;
      const grabX = input.grabX ?? input.x;
      if (!input.jump || (f.ground < 0 && !f.attack?.airSide && !f.airDodge) ||
          f.stockLift || f.grip || f.floorAction || f.stun || f.clashRecoil)
        f.heldRecoveryJump = false;
      if (f.stockLift) {
        const r = f.stockLift;
        if (!r.exit && r.time + 1e-8 >= liftArrival - 4 / 60) {
          const side = Math.abs(input.x) >= 0.45 && was.x * Math.sign(input.x) < 0.45;
          const drop = input.y >= 0.45 && was.y < 0.45;
          const action = ['grab','special','aimStick','attack','shield'].find(pressed);
          const jump = pressed('jump');
          if (side || drop || jump || action) {
            const command = { ...idleInput, x: input.x, y: input.y, grabX,
              smashX: input.smashX, smashY: input.smashY, tiltMode: input.tiltMode, quickAttack: input.quickAttack,
              airDodgeX: input.airDodgeX, airDodgeY: input.airDodgeY, tapped: {} };
            if (action) { command[action] = !!input[action]; command.tapped[action] = true; }
            r.exit = { option: jump ? 'jump' : action ? 'action' : drop ? 'drop' : 'step', input: command };
          }
        }
        f.prev = { ...input };
        return;
      }
      const previousAxis = f.shieldAxis;
      f.shieldAxis = shieldDirection(input.x || grabX, input.y, previousAxis);
      f.prev = { ...input };
      if (f.respawning > 0) return;
      if (f.ledge) {
        const dir = f.ledge.left ? 1 : -1;
        const release = (input.y > .5 && was.y <= .5) || (input.x*dir < -.5 && was.x*dir >= -.5);
        // Preserve the order of taps through hitstop. Attack and Shield on the release frame still choose their get-ups.
        if (release && f.command?.type !== 'attack' && !f.jumpBuffer && !f.guardBuffer && !pressed('attack') && !pressed('shield')) {
          f.ledge.dropQueued = true;
          f.ledge.climbQueued = false;
        } else if (!f.ledge.dropQueued && input.x*dir > .45 && was.x*dir <= .45) f.ledge.climbQueued = true;
      }
      if (f.tumble) {
        const dir = Math.sign(input.x);
        const quickSide = Math.abs(input.y) < .5 && Math.abs(input.x) >= .74 && was.x * dir < .74 &&
          (f.stickTicks < 3 || was.x * dir <= .3);
        f.tumble.wiggle = quickSide && !f.tumble.pending && !this.hitStop && f.impactLag <= 1e-8 &&
          f.stun <= 1 / 60 + 1e-8 ? dir : 0;
      }
      readDashFlick(f, input.x, was.x);
      const horizontal = Math.abs(input.y) < 0.5 && Math.abs(input.x) >= 0.65 ? Math.sign(input.x) : 0;
      const flick = horizontal && was.x * horizontal < 0.55 ? horizontal : 0;
      // A neutral special buffered near the end of another move can carry its directional follow-up.
      const buffered = f.command;
      if (buffered?.turnFrames > 0) {
        buffered.turnFrames--;
        if (f.ground < 0 && flick === -(buffered.turnTo || buffered.facing)) buffered.reverseQueued = true;
      }
      if (f.ground >= 0 || f.grip || f.ledge || f.stun || f.dodge || f.floorAction) f.specialFlick = null;
      else {
        if (f.specialFlick && --f.specialFlick.frames === 0) f.specialFlick = null;
        if (flick) {
          const a = f.attack;
          if (a?.airNeutral && !a.reversed && flick === -f.face &&
              a.time <= bReverseWindow / 60 + 1e-8 && a.time < a.start - 1e-8)
            a.reverseQueued = true;
          f.specialFlick = { dir: flick, frames: turnaroundWindow + 1 };
        }
      }
      const down = input.y || 0, lastDown = was.y || 0;
      if (down < 0.28) f.downTicks = 0;
      const downFlick = down >= 0.74 && lastDown < 0.74 && (f.downTicks < 3 || down - lastDown >= 0.45);
      if (down >= 0.28) f.downTicks = Math.min(3, f.downTicks + 1);
      if (downFlick && this.terrain[f.ground]?.thin && !f.grip && !this.hitStop && f.impactLag <= 1e-8)
        f.dropPrep ??= { platform: f.ground, frames: 0 };
      if (f.ground < 0 && !f.fastFall && down >= .65 && lastDown < .65 && controlsFall(f) &&
          framesToApex(f) <= fastFallBufferFrames) f.fastFallBuffer = fastFallBufferFrames;
      const floor = f.floorAction;
      if (
        f.ground >= 0 &&
        !floor &&
        !f.grip &&
        !f.attack &&
        !f.stun &&
        f.landingLag <= 1e-8 &&
        f.charge < 0 &&
        f.shieldDrop <= 1e-8
      ) {
        if (input.shield && was.shield && f.shield && this.terrain[f.ground]?.thin &&
            shieldDropAngle(input) && !shieldDropAngle(was)) {
          f.guardIntent = 'platformDrop';
        } else if (input.shield && f.shieldAxis && f.guardIntent !== 'platformDrop' &&
            (pressed('shield') || f.shieldAxis !== previousAxis)) {
          // Keep direction-first roll chords during the first two dash frames.
          // Once running, adding Shield to held forward braces in that lane.
          const brace = dashShieldReady(f) && previousAxis === f.shieldAxis &&
            f.shieldAxis === (f.run.face > 0 ? 'right' : 'left');
          f.guardIntent = brace ? '' : f.shieldAxis;
        } else if (f.shield && was.shield && !input.shield && !f.guardIntent) {
          f.guardIntent = f.shieldStun > 1e-8 ? 'lower' : 'release';
        } else if (input.shield && (f.guardIntent === 'lower' || f.guardIntent === 'release')) {
          f.guardIntent = '';
        }
      }
      if (floor?.type === 'downed') {
        const firstChoice = floor.locks ? floor.duration : 12 / 60;
        if (floor.time + inputWindow + 1e-8 >= firstChoice) {
          if (pressed('attack')) floor.choice = { type: 'floorAttack', dir: 0 };
          else if (pressed('jump') || (input.y < -0.5 && was.y >= -0.5))
            floor.choice = { type: 'floorRise', dir: 0 };
          else if (Math.abs(grabX) > 0.5 && (was.grabX ?? was.x) * Math.sign(grabX) <= 0.5)
            floor.choice = { type: 'getupRoll', dir: Math.sign(grabX) };
        }
        return;
      }
      const spotStrike = floor?.type === 'spotDodge' &&
        (pressed('attack') || pressed('smash') || pressed('aimStick')) &&
        !pressed('jump') && !pressed('shortHop') && !pressed('grab') && !pressed('special');
      if (floor && floor.duration - floor.time > inputWindow + (spotStrike ? spotCounterLead : 0) + 1e-8) return;
      if (f.grip || f.attack?.grabAttempt) {
        const grip = f.grip;
        const face = grip?.face ?? f.face;
        const direction = airDirection(grabX, input.y, face);
        const changed =
          direction !== 'neutral' && direction !== airDirection(was.grabX ?? was.x, was.y, face);
        if (grip) {
          if (grip.phase !== 'throw') {
            if (f.index === grip.owner) {
              // One tap can be buffered. A throw always takes priority over another pummel.
              if (grip.carry || grip.pending === 'hoist') {
                if (pressed('grab') && grip.carry) grip.pending = direction === 'neutral' ? 'forward' : direction;
                else if (grip.carry && !grip.pending && pressed('attack')) grip.pending = 'pummel';
                if (grip.carry && f.ground >= 0 && grip.phase !== 'pummel' &&
                    (pressed('jump') || pressed('shortHop'))) grip.carry.hop = true;
              } else if (!grip.pending && f.kit.shoulderCarry && pressed('special')) {
                grip.pending = 'hoist';
              } else if ((!grip.pending || grip.pending === 'pummel') && (changed || pressed('grab'))) {
                grip.pending = changed ? direction : 'forward';
              } else if (!grip.pending && pressed('attack')) grip.pending = 'pummel';
            } else {
              const sector = shiftSector(input, grip.struggleSector);
              const flick = sector >= 0 && sector !== grip.struggleSector;
              grip.struggleSector = sector;
              if (flick || ['jump','shortHop','attack','smash','special','shield','grab','aimStick'].some(pressed)) {
                grip.remaining -= .135;
                grip.struggles++;
                grip.struggleFlash = 6 / 60;
                this.emit('grabStruggle', {f, owner:this.dogs[grip.owner], count:grip.struggles});
              }
            }
          }
          // A late jump or attack can be buffered into a designated aerial follow-up.
          if (
            grip.phase !== 'throw' ||
            grip.owner !== f.index ||
            !f.attack?.jumpCancel ||
            f.attack.time < f.attack.start - 3 / 60
          )
            return;
        }
        if (!grip) {
          const a = f.attack;
          if (
            a.grabStyle === 'dash' &&
            f.ground >= 0 &&
            a.time <= 2 / 60 + 1e-8 &&
            grabX * a.runFace <= -runStick
          ) {
            // Accept a reversal just after Grab as part of the same button chord.
            beginGrab(f, 'pivot', a.runFace, a.aim, false, a.boostGrab);
            f.attack.time = a.time;
          } else if (a.grabStyle === 'standing' && changed && a.time < a.start + a.active)
            a.queuedThrow = direction;
        }
      }
      if (pressed('jump') || pressed('shortHop')) {
        f.queuedShortHop = !!input.shortHop;
        f.jumpBuffer = inputWindow;
        const a = f.attack;
        const lastHit = a?.second || a;
        const recovering = f.ground >= 0 && (f.landingLag > 1e-8 || (a && a.time + 1e-8 >= lastHit.start + lastHit.active));
        const landingSoon = f.ground < 0 && (a?.airSide || f.airDodge) && this.floorAhead(f, inputWindow) >= 0;
        f.heldRecoveryJump = !!(input.jump && !f.stun && !f.grip && !f.floorAction &&
          !f.clashRecoil && !f.jumpSquat && (recovering || landingSoon));
        if (f.run) f.run.turnJump = false;
      }
      if (f.jumpBuffer > 0 && f.run && input.x * f.run.face <= -runStick) f.run.turnJump = true;
      if (pressed('shield')) {
        f.guardBuffer = inputWindow;
        // The swing clock pauses in hitstop. A held Shield cannot refresh the landing tap.
        if (f.ground < 0 && f.attack?.airSide && !f.tumble) f.attack.landingPress = f.attack.time;
        // Keep the initial world-space aim when Shield is tapped during a freeze or recovery.
        f.guardAim = { x: input.airDodgeX ?? input.grabX ?? input.x, y: input.airDodgeY ?? input.y };
        if (f.tumble) {
          if (f.techLock <= 1e-8) {
            f.techBuffer = techWindow;
            f.techLock = techLockout;
            f.tumble.techDir = Math.abs(input.x) > 0.45 ? Math.sign(input.x) : 0;
          }
          if (
            f.stun + 1e-8 >= inputWindow ||
            this.floorAhead(f, techWindow + 1 / 60) >= 0 ||
            this.solidAhead(f, techWindow + 1 / 60)
          )
            f.guardBuffer = 0;
        }
      }
      if (f.command?.grabStyle === 'dash' && grabX * f.command.runFace <= -runStick)
        f.command.grabStyle = 'pivot';
      if (f.command && !input[f.command.button || f.command.type]) f.command.released = true;
      if (f.charge >= 0 && !input[f.smashCharge?.button || 'attack']) f.chargeReleased = true;
      if (!input.special) {
        if (f.attack?.specialSide === 'up') f.attack.released = true;
      }
      const button = pressed('grab')
        ? 'grab'
        : pressed('special')
          ? 'special'
          : pressed('aimStick') ? 'aimStick' : pressed('smash') ? 'smash' : pressed('attack') ? 'attack' : null;
      if (button) {
        const stickAerial = button === 'aimStick' && (!f.ledge || f.ledge.dropQueued) &&
          (f.ground < 0 || f.jumpSquat || f.jumpBuffer > 0 || f.guardIntent === 'platformDrop');
        const stickTilt = button === 'aimStick' && input.tiltMode && f.ground >= 0 && !stickAerial;
        const guardGrab = button === 'attack' && input.shield && (f.shield || (pressed('shield') && !f.parryFlash)) && f.ground >= 0 &&
          Math.abs(input.y) < .45 && f.guardIntent !== 'platformDrop' &&
          !f.jumpBuffer && !f.jumpSquat && !f.floorAction && !f.attack && !f.stun && !f.grip && f.charge < 0;
        const type = guardGrab ? 'grab' : button === 'aimStick' ? (stickAerial || stickTilt ? 'attack' : 'smash') : button;
        const independent = button === 'aimStick' || button === 'smash';
        const x = independent ? (input.smashX ?? input.x) : type === 'grab' ? grabX : input.x;
        const y = independent ? (input.smashY ?? input.y) : input.y;
        const side = airDirection(x, y, f.face);
        const groundX = button === 'attack' && f.ground >= 0 ? grabX : x;
        f.command = {
          type,
          aim: type === 'smash' ? verticalAim(side) : aimFor(y),
          face: Math.abs(groundX) > 0.2 ? Math.sign(groundX) : 0,
          facing: f.face,
          airSide: side,
          life: inputWindow,
          heldFor: 0,
          released: !input[button],
        };
        if (button === 'aimStick') f.command.button = button;
        if (type === 'grab' && this.canBufferLandingGrab(f,input.x)) f.command.landGrab = true;
        // These controls commit to a normal on the press, including when buffered during recovery.
        // Skip the hold-to-smash timer so the move starts with its full windup on the first free frame.
        if (stickTilt || (button === 'attack' && input.quickAttack)) f.command.released = true;
        if (stickAerial) f.command.airOnly = true;
        if (type === 'special' && side === 'neutral' && f.ground < 0) {
          f.command.turnFrames = bReverseWindow;
          if (f.specialFlick?.dir === -f.face) f.command.turnTo = f.specialFlick.dir;
        }
        if (type === 'special') f.specialFlick = null;
        if (f.ground >= 0 && (f.shield || input.shield)) {
          if (type === 'grab' && (guardGrab || f.shield)) f.command.face = f.face;
          f.command.shieldCounter = (type === 'special' || type === 'smash') && side === 'up';
          if (type === 'grab' && f.shield && (f.shieldStun > 1e-8 || f.shieldGrabWindow > 1e-8))
            f.command.shieldGrab = true;
        }
        if (type === 'attack') {
          const direction = groundDirection(groundX, y);
          let angle = forwardTiltAngle(groundX, y, stickTilt ? groundX : input.x);
          if (stickTilt && direction === 'forward' && !angle && Math.abs(input.y) >= 0.45)
            angle = Math.sign(input.y);
          f.command.tiltAngle = angle;
          f.command.groundDirection = angle ? 'forward' : direction;
        }
        if (type === 'grab' && f.attack?.dashAttack && !input.shield && !f.jumpBuffer && cancelableWindup(f)) {
          f.command.runFace = f.face;
          f.command.grabStyle = grabX * f.face <= -runStick ? 'pivot' : 'dash';
          f.command.boostGrab = true;
          f.attack = null;
        } else if (
          (type === 'grab' || type === 'attack') &&
          f.run &&
          f.ground >= 0 &&
          !input.shield &&
          !f.stun &&
          !f.dodge &&
          !f.landingLag
        ) {
          const steering = Math.abs(grabX) >= runStick ? Math.sign(grabX) : 0;
          const coasting = f.vx * f.run.face >= f.stats.speed * 0.4;
          if (type === 'grab') {
            if (steering === -f.run.face || (!steering && f.run.turned)) f.command.grabStyle = 'pivot';
            else if (coasting) f.command.grabStyle = 'dash';
            if (f.command.grabStyle) f.command.runFace = f.run.face;
          } else if (coasting) {
            const aimed = f.command.groundDirection !== 'neutral';
            const braking = f.run.grace < pivotWindow - 1e-8 || Math.abs(input.x) < runStick;
            if (aimed && (stickTilt || braking || f.run.turned || steering === -f.run.face ||
                f.command.groundDirection !== 'forward')) f.command.slideDir = f.run.face;
            else if (!stickTilt && !f.run.turned && steering !== -f.run.face) f.command.runFace = f.run.face;
          }
        }
      }
      if (canCancelMeteor(f) && !f.tumble.cancel) {
        if (pressed('special') && f.command?.airSide === 'up' && f.command.type === 'special' && !f.usedUp)
          f.tumble.cancel = f.command;
        else if (pressed('jump') && f.jumps > 0) f.tumble.cancel = 'jump';
      }
      if (f.tumble?.fromHit && !f.tumble.escape) {
        const combo=this.comboPractice;
        if (combo?.contacts.length && f.index===1 && combo.firstFree===null &&
            (this.canEscapeHitstun(f,false) || this.canEscapeHitstun(f,true))) combo.firstFree=combo.clock;
        const dodge = pressed('shield');
        const aerial = !dodge && (button === 'attack' || button === 'aimStick') && f.command?.type === 'attack';
        if ((dodge || aerial) && this.canEscapeHitstun(f,!!aerial)) {
          f.tumble.escape = {aerial:!!aerial, frames:Math.ceil(f.stun*60-1e-8)-1,
            command:aerial ? f.command : null, aim:dodge ? f.guardAim : null};
        }
      }
      if ((pressed('jump') || pressed('shortHop')) && !input.shield && !f.guardBuffer &&
          (!f.command || f.command.type === 'attack')) {
        const source = cancelableWindup(f);
        if (source) {
          const airSide = button === 'aimStick' ? f.command.airSide : airDirection(input.x, input.y, f.face);
          f.attack = f.run = null;
          f.chainWindow = f.chainNext = 0;
          cancelCharge(f);
          f.command = {type:'attack', airOnly:true, airSide, facing:f.face, face:0, life:inputWindow,
            heldFor:0, released:true, fromWindup:source};
        }
      }
      if (f.jumpSquat) bufferSquatInput(f, input);
    }
    canEscapeHitstun(f, aerial) {
      const t=f.tumble;
      if (!t?.fromHit || t.pending || t.meteor || f.throwBounce || f.grip || f.wallAction ||
          f.floorAction || f.ledge || f.ground >= 0 || f.impactLag || f.attack || f.ledgeTrump ||
          (!aerial && f.usedDodge) || (f.encounter && f.encounter.kind !== f.kind)) return false;
      return fadeWindow(t.time,Math.hypot(f.vx,f.vy),f.stun,aerial) &&
        this.floorAhead(f,techWindow+1/60)<0 && !this.solidAhead(f,techWindow+1/60);
    }
    floorAhead(f, horizon) {
      if (f.vy < 0) return -1;
      let soonest = horizon + 1e-8,
        result = -1;
      for (const [i, p] of this.terrain.entries()) {
        const height = p.y - f.y;
        if (height < (f.drop > 0 ? -1e-8 : -2) || (p.thin && f.drop > 0 && f.dropPlatform === i)) continue;
        const t = timeToFloor(f, height);
        if (t >= soonest) continue;
        const x = f.x + f.vx * t;
        const atContact = !this.layout && i === arenas[this.geometryStage]?.movingPlatform ? platforms(this.geometryStage, this.time + t)[i] : p;
        if (x < atContact.x1 - 6 || x > atContact.x2 + 6) continue;
        soonest = t;
        result = i;
      }
      return result;
    }
    canBufferLandingGrab(f, axis) {
      if (f.ground >= 0 || f.vy <= 0 || f.attack || !controlsFall(f)) return false;
      const dt = 1/60, path = {x:f.x, y:f.y, drop:f.drop, dropPlatform:f.dropPlatform};
      let vx = f.vx, vy = f.vy;
      for (let i=0; i<landingGrabFrames; i++) {
        const oldY = path.y;
        vx = airVelocity(f,vx,axis,dt);
        vy = fallVelocity(f,vy,dt,true);
        path.x += vx*dt;
        path.y += vy*dt;
        path.drop = Math.max(0,path.drop-dt);
        const time = this.time + i * dt;
        const terrain = i && !this.layout && arenas[this.geometryStage]?.movingPlatform != null ? platforms(this.geometryStage,time) : this.terrain;
        if (this.landingSurface(path,oldY,path.x-vx*dt,dt,terrain,time) >= 0) return true;
      }
      return false;
    }
    landingCancelAhead(f) {
      const a = f.attack;
      if (f.ground >= 0 || !a?.airSide || (a.plunge && !a.fired)) return false;
      const floor = this.floorAhead(f, 6 / 60);
      if (floor < 0) return false;
      const frames = Math.max(1, Math.round(timeToFloor(f, this.terrain[floor].y - f.y) * 60));
      return committedLanding(a, a.time + frames / 60);
    }
    shiftDuringHit(f, input) {
      const shift = f.hitShift;
      const previous = shift.sector;
      shift.sector = shiftSector(input, previous);
      shift.cooldown = Math.max(0, shift.cooldown - 1);
      shift.remaining--;
      if (!shift.remaining) f.hitShift = null;
      if (shift.sector < 0 || shift.sector === previous || shift.cooldown) return;
      const [dx, dy] = shiftDirections[shift.sector];
      const x = f.x, y = f.y;
      let nextX = x + dx * 12, nextY = y + (shift.ground >= 0 ? 0 : dy * 12);
      if (shift.ground >= 0) {
        const floor = this.terrain[shift.ground];
        nextX = clamp(nextX, Math.min(x, floor.x1), Math.max(x, floor.x2));
      }
      const solid = this.solidContact(f, x, y, nextX, nextY);
      if (solid?.ceiling) nextY = solid.feet;
      else if (solid) nextX = clamp(solid.x, Math.min(x, nextX), Math.max(x, nextX));
      if (nextY > y) {
        const travelY = nextY - y;
        for (const [i, floor] of this.terrain.entries()) {
          if ((floor.thin && f.drop > 0 && f.dropPlatform === i) || floor.y < y || floor.y > nextY) continue;
          const crossing = x + (nextX - x) * (floor.y - y) / travelY;
          if (crossing >= floor.x1 - 5 && crossing <= floor.x2 + 5) nextY = floor.y;
        }
      }
      if (x === nextX && y === nextY) return;
      shift.cooldown = 4;
      if (this.comboPractice && f.index === 1) this.comboPractice.shifts++;
      f.x = nextX;
      f.y = nextY;
      this.emit('hitShift', { f, point: { x, y: y - f.stats.height * 0.52 }, dx: nextX - x, dy: nextY - y });
      if (this.escapePractice?.phase === 'follow' && f.index === 0) this.escapePractice.outward += x - nextX;
    }
    wallContact(f, x, y, nextX, nextY, head = false) {
      const dx = nextX - x;
      if (Math.abs(dx) < 1e-8) return null;
      const dir = -Math.sign(dx),
        dy = nextY - y,
        offset = f.stats.height * (head ? 1 : .52), chest = y - offset;
      let first = null;
      for (const wall of this.layout?.walls || stageHulls[this.geometryStage].walls) {
        if ((wall.left ? -1 : 1) !== dir || (x - wall.x) * dir < -1e-8) continue;
        const contactX = wall.x + dir * f.stats.width * (head ? .45 : 1);
        let enter = Math.max(0, (contactX - x) / dx);
        let leave = Math.min(1, (wall.x - x) / dx);
        if (Math.abs(dy) > 1e-8) {
          const top = (wall.top - chest) / dy,
            bottom = (wall.bottom - chest) / dy;
          enter = Math.max(enter, Math.min(top, bottom));
          leave = Math.min(leave, Math.max(top, bottom));
        } else if (chest < wall.top || chest > wall.bottom) continue;
        if (enter > leave + 1e-8 || (first && enter >= first.t)) continue;
        const feet = y + dy * enter;
        if (head && feet - f.stats.height * .52 <= wall.bottom) continue;
        first = { wall, dir, x:contactX, feet, pointY:feet-offset, t:enter };
      }
      return first;
    }
    solidContact(f, x, y, nextX, nextY) {
      let first = this.wallContact(f, x, y, nextX, nextY);
      if (nextY >= y) return first;
      const head = y - f.stats.height, radius = f.stats.width * .45;
      const ceilings = this.layout ? this.layout.ceilings || [] : stageHulls[this.geometryStage].ceilings;
      // A rising head can meet the side of the bottom band before the chest reaches it.
      if (ceilings.length && x !== nextX) {
        const side = this.wallContact(f, x, y, nextX, nextY, true);
        if (side && (!first || side.t < first.t)) first = side;
      }
      for (const ceiling of ceilings) {
        if (head < ceiling.y - 1e-8 || nextY - f.stats.height > ceiling.y) continue;
        const t = clamp((head - ceiling.y) / (y - nextY), 0, 1);
        if (first && first.t <= t) continue;
        const atX = x + (nextX - x) * t;
        if (atX + radius <= ceiling.x1 || atX - radius >= ceiling.x2) continue;
        first = {ceiling, t, x:atX, feet:ceiling.y + f.stats.height};
      }
      return first;
    }
    wallForKick(f, dir) {
      const chest = f.y - f.stats.height * .52;
      return (this.layout?.walls || stageHulls[this.geometryStage].walls).find(wall =>
        (wall.left ? -1 : 1) === dir && chest >= wall.top && chest <= wall.bottom &&
        Math.abs((f.x - wall.x) * dir - f.stats.width) <= 7);
    }
    kickOffWall(f, wall, dir) {
      const kick = f.kit.wallKick;
      f.ledgeDropJump = false;
      f.wallAction = { type:'wallKick', time:0, duration:kick.frames/60, wall, dir };
      f.usedWallKick = true;
      f.shortHopFlight = false;
      f.x = wall.x + dir * f.stats.width;
      f.face = dir;
      f.vx = dir * kick.push;
      f.vy = -kick.rise;
      f.fastFall = f.cutJump = f.heldRecoveryJump = false;
      f.jumpBuffer = f.coyote = f.takeoffWindow = 0;
      f.ledgeLock = Math.max(f.ledgeLock, f.wallAction.duration);
      if (this.mode === 'solo' && f.index === 1 && this.cpuLevel === 'rival')
        this.bot.wallReturn = { platform:wall.index, inward:-dir, until:this.time + .95 };
      this.emit('wallKick', { f, dir, wall, point:{x:wall.x, y:f.y - f.stats.height*.52} });
    }
    solidAhead(f, horizon) {
      let { x, y, vx, vy } = f;
      // Sample the tumbling arc a frame at a time so a shallow plank is as hittable as a brick wall.
      for (let elapsed = 0; elapsed + 1e-8 < horizon; elapsed += 1 / 60) {
        const dt = Math.min(1 / 60, horizon - elapsed);
        vx *= Math.pow(0.68, dt);
        const free = f.stun <= elapsed + dt;
        if (free) vx += f.prev.x * 175 * dt;
        vy = Math.min(vy + 1540 * f.kit.gravity * dt, 970);
        const nextX = x + vx * dt,
          nextY = y + vy * dt;
        const contact = this.solidContact(f, x, y, nextX, nextY);
        if (contact) {
          contact.hard = !free && Math.abs(contact.ceiling ? vy : vx) >= maxTechSpeed;
          return contact;
        }
        x = nextX;
        y = nextY;
      }
      return null;
    }
    hitCeiling(f, contact, oldY) {
      const {ceiling, feet} = contact, speed = -f.vy;
      const point = {x:clamp(contact.x, ceiling.x1, ceiling.x2), y:ceiling.y};
      f.y = feet;
      f.vy = 0;
      if (!f.tumble) {
        if (speed > 180 && oldY > feet + .1) this.emit('ceilingBump', {f,point});
        return;
      }
      const hard = f.stun > 0 && speed >= maxTechSpeed;
      const tech = !hard && f.techBuffer > 1e-8;
      if (tech) {
        this.clearTumble(f, 'Ceiling tech');
        f.reaction = f.command = f.throwBounce = null;
        f.stun = f.jumpBuffer = f.guardBuffer = f.coyote = 0;
        f.cutJump = false;
        f.invuln = Math.max(f.invuln, 10/60);
        f.wallAction = {type:'ceilingTech', time:0, duration:7/60, dir:f.face};
      } else {
        f.vy = speed * .72;
        f.vx *= .82;
        f.tumble.downLaunch = f.vy;
        f.tumble.meteor = f.tumble.cancel = null;
      }
      f.techBuffer = 0;
      const name = tech ? 'ceilingTech' : 'ceilingBounce';
      if (this.wallPractice?.ceiling && f.index === 0 && this.wallPractice.phase === 'flight') {
        this.wallPractice.phase = 'done';
        this.wallPractice.outcome = name;
      }
      this.emit(name, {f, point, speed, hard});
    }
    hitWall(f, contact, jump) {
      const { wall, dir, feet } = contact;
      f.x = contact.x;
      f.y = feet;
      const speed = Math.abs(f.vx), hard = f.stun > 0 && speed >= maxTechSpeed;
      const type = !hard && f.techBuffer > 1e-8 ? (jump ? 'wallTechJump' : 'wallTech') : 'wallBounce';
      if (type === 'wallBounce') {
        f.techBuffer = 0;
        f.vx = -f.vx * 0.72;
        f.vy *= 0.82;
        if (f.tumble.downLaunch) f.tumble.downLaunch *= 0.82;
      } else {
        this.clearTumble(f, jump ? 'Wall-tech jump' : 'Wall tech');
        f.reaction = f.command = f.guardAim = f.throwBounce = null;
        f.stun = f.jumpBuffer = f.guardBuffer = f.coyote = 0;
        f.cutJump = false;
        f.face = jump ? dir : -dir;
        f.vx = jump ? dir * 290 : 0;
        f.vy = jump ? -f.stats.jump * 0.92 : 0;
        f.invuln = Math.max(f.invuln, (jump ? 9 : 12) / 60);
        f.ledgeLock = (jump ? 8 : 10) / 60 - 1e-8;
      }
      f.wallAction = { type, time: 0, duration: (type === 'wallBounce' ? 6 : jump ? 8 : 10) / 60, dir, wall };
      if (this.wallPractice?.phase === 'flight' && f.index === 0) {
        this.wallPractice.phase = 'done';
        this.wallPractice.outcome = hard ? 'hardImpact' : type;
        this.wallPractice.speed = speed;
      }
      this.emit(type, { f, wall, dir, hard, speed, point: { x:wall.x, y:contact.pointY } });
    }
    clearTumble(f, option) {
      if (f.tumble && f.index === 0 && this.launchPractice?.phase === 'flight' && this.launchPractice.pattern !== 'juggle') {
        this.launchPractice.phase = 'escaped';
        this.emit('tumbleEscape', { f, option });
      }
      f.tumble = null;
      f.wallAction = null;
      f.techBuffer = 0;
    }
    footstoolTarget(f) {
      if (f.ground >= 0 || f.coyote || f.attack || f.command || f.ledge || f.stun || f.stockLift || f.respawning ||
          f.grip || f.guardBuffer || f.impactLag || f.footstoolLock || f.airDodge || f.dodge || f.wallAction ||
          f.clashRecoil || f.ledgeTrump || f.throwBounce || f.floorAction || (f.encounter && f.kind !== f.encounter.kind)) return null;
      for (const r of this.opponents(f)) {
        if (r.grip || r.ledge || r.ledgeTrump || r.floorAction || r.wallAction || r.stockLift || r.footstoolLock ||
            r.airDodge || r.impactLag || protectionTime(r) || r.dodge || r.attack?.specialSide || this.activeSwing(r) ||
            (r.ground < 0 && r.guardBuffer && !r.usedDodge && !r.attack && !r.stun && !r.clashRecoil) ||
            (r.encounter && r.kind !== r.encounter.kind)) continue;
        const head = r.y - bodyHeight(r), gap = head - f.y, closing = f.vy - r.vy;
        if (closing < -105 || gap < -9 || gap > 14 + Math.max(0, closing) / 60 ||
            Math.abs(f.x - r.x) > r.stats.width * .82 + f.stats.width * .32) continue;
        if (this.terrain.some(p => f.x >= p.x1 && f.x <= p.x2 && f.y <= p.y && head >= p.y)) continue;
        return r;
      }
      return null;
    }
    footstool(f, target) {
      const head = target.y - bodyHeight(target), airborne = target.ground < 0;
      f.shortHopFlight = false;
      f.ledgeDropJump = false;
      this.clearTumble(f, 'Footstool');
      f.y = Math.min(f.y, head);
      f.vy = -f.stats.jump * [1.08, .78, .56][Math.min(f.footstools, 2)];
      f.footstools++;
      f.jumpBuffer = f.righting = f.guardBuffer = f.hopWindow = 0;
      f.reboundTime = 12 / 60;
      f.reboundPose = 'footstool';
      f.fastFall = false;
      f.cutJump = true;
      f.reaction = null;
      f.lastMove = 'Footstool';
      target.footstoolLock = f.footstoolLock = 25 / 60;
      const guarding = target.shield || (target.prev.shield && !target.attack && !target.stun && !target.landingLag &&
        !target.jumpSquat && target.charge < 0 && !target.shieldDrop);
      if (airborne || !guarding) {
        target.shortHopFlight = false;
        target.ledgeDropJump = false;
        target.attack = target.command = target.run = target.jumpSquat = target.reaction = null;
        target.jumpBuffer = target.guardBuffer = target.coyote = target.hopWindow = target.chainWindow = 0;
        target.cutJump = target.fastFall = false;
        cancelCharge(target);
        target.stun = Math.max(target.stun, (airborne ? 18 : 9) / 60);
        target.reaction = { planted: !airborne, hard: airborne, face: target.face, duration: target.stun };
        if (airborne) {
          target.throwBounce = null;
          target.vy = Math.max(300, target.vy);
          this.startTumble(target, false);
        }
      }
      this.emit('footstool', { f, target, airborne, point: { x: target.x, y: head } });
      if (isFootstoolPractice(this.spacingPractice)) this.spacingPractice.stepped = true;
    }
    startTumble(f, pending) {
      f.tumble = {
        time: 0,
        pending,
        willTech: this.cpuControlled(f) && this.random() < (this.cpuLevel === 'rookie' ? 0.28 : 0.72),
      };
    }
    beginFloorAction(f, type, dir = 0) {
      const [total, safe] = floorFrames[type];
      const read=f.tumble?.techChoice;
      const skid = type === 'downed' && (!f.encounter || f.encounter.kind === f.kind)
        ? clamp(f.vx * 0.57, -265, 265) : 0;
      f.tumble = f.reaction = f.attack = f.command = f.run = null;
      f.shield = f.cutJump = false;
      f.vx = skid;
      f.vy = f.stun = f.techBuffer = f.guardBuffer = f.jumpBuffer = f.landingLag = 0;
      f.invuln = safe / 60;
      const duration = type === 'floorAttack' ? moves[f.kit.floorAttack].end : total / 60;
      f.floorAction = { type, time: 0, duration, dir };
      if(read && (type==='tech' || type==='techRoll'))f.floorAction.techChoice=read;
      if (type === 'floorAttack') beginAttack(f, 'floorAttack', 0, 0, f.kit.floorAttack);
      const event =
        type === 'downed' ? 'knockdown' : type === 'tech' || type === 'techRoll' ? 'tech' : 'getup';
      if (this.matchCard && event!=='getup') this.matchCard.players[f.index][event==='tech'?'techs':'knockdowns']++;
      if (f.index === 0 && this.launchPractice?.phase === 'flight' && this.launchPractice.pattern !== 'juggle')
        this.launchPractice.phase = 'landed';
      this.emit(event, { f, type, dir, point: { x: f.x, y: f.y } });
      const chase = this.chasePractice;
      if (chase && chase.phase !== 'done' && f.index === chase.slot) {
        if(chase.role==='readTech' && event==='tech'){
          chase.choice=read;
          chase.phase='getup';
          this.emit('chaseCue',{f,phase:'getup',type});
        }else if (event === 'tech') this.finishChase(type);
        else {
          chase.phase = type === 'downed' ? 'down' : 'getup';
          this.emit('chaseCue', { f, phase: chase.phase, type });
        }
      }
    }
    beginGroundDodge(f, intent) {
      const dir = intent === 'down' ? 0 : intent === 'left' ? -1 : 1;
      const backRoll = !!dir && dir !== f.face;
      const defense = f.kit.defense;
      const type = dir ? 'shieldRoll' : 'spotDodge';
      f.floorAction = {
        type,
        dir,
        backRoll,
        time: 0,
        ...spendDodge(f, dir ? defense.roll : defense.spot, backRoll ? 2 : 0),
        distance: dir ? defense.rollDistance * (backRoll ? 0.9 : 1) : 0,
      };
      f.shield = f.brakingShield = false;
      f.shieldDrop = f.guardBuffer = f.landTime = f.skidTime = f.chainWindow = f.vx = f.vy = 0;
      f.command = f.run = null;
      f.lastMove = dir ? 'Shield Roll' : 'Spot-dodge';
      this.emit(type, { f, dir, wear:f.floorAction.wear, point: { x: f.x, y: f.y } });
    }
    beginLedgeOption(f, type) {
      const edge = f.ledge;
      this.observeLedgeExit(f,type==='ledgeRoll');
      const platform = this.terrain[edge.index];
      const kit = f.kit[type];
      const available = platform.x2 - platform.x1 - 2;
      const action = type === 'ledgeRoll' ? ledgeRollAction(kit, edge, available) : {
        type, edge, dir: edge.left ? 1 : -1, time: 0, duration: kit.total / 60,
        distance: Math.min(available, kit.distance), safeFrom: 0,
        safeUntil: edge.protectedCatch ? (kit.protectedThrough + 1) / 60 : 0,
      };
      f.floorAction = action;
      f.ledge = f.guardAim = f.attack = f.command = f.run = null;
      f.shield = false;
      f.guardIntent = '';
      f.invuln = f.shieldDrop = f.guardBuffer = f.jumpBuffer = 0;
      f.landTime = f.skidTime = f.reboundTime = f.chainWindow = 0;
      f.face = action.dir;
      f.ledgeLock = action.duration;
      f.lastMove = kit.label || 'Ledge climb';
      if (type === 'ledgeClimb' && this.climbPractice?.slot === f.index) this.climbPractice.climbed = true;
      if (type === 'ledgeRoll' && f.index === 0 && this.rollPractice?.phase === 'active') this.rollPractice.rolled = true;
      this.emit(type, { f, dir: action.dir, edge, point: { x: edge.x, y: edge.y } });
    }
    beginAirDodge(f) {
      f.ledgeDropJump = false;
      f.fastFall = false;
      const aim = f.guardAim || idleInput;
      const length = Math.hypot(aim.x, aim.y);
      const directed = length >= 0.35;
      const kit = f.kit.airDodge;
      const frames = directed ? kit.directional : kit.neutral;
      const timing = spendDodge(f, frames);
      const type = directed ? 'directionalAirDodge' : 'neutralAirDodge';
      const x = directed ? aim.x / length : 0;
      const y = directed ? aim.y / length : 0;
      this.clearTumble(f, 'Air dodge');
      f.airDodge = {
        type,
        x,
        y,
        time: 0,
        ...timing,
        landingLag: (frames[3] + timing.wear) / 60,
        fromHop: f.takeoffWindow > 1e-8,
      };
      f.usedDodge = true;
      if (this.comboPractice && f.index === 1) this.comboPractice.dodges++;
      f.dodge = f.airDodge.duration;
      f.vx = f.vy = f.coyote = f.guardBuffer = f.jumpBuffer = f.reboundTime = 0;
      f.cutJump = false;
      f.run = f.throwBounce = f.guardAim = f.command = null;
      f.lastMove = directed ? 'Directional air dodge' : 'Neutral air dodge';
      this.emit('dodge', { f, type, dirX: x, dirY: y, wear:timing.wear });
    }
    advanceAirDodge(f, dt) {
      const a = f.airDodge;
      const before = a.time;
      a.time = Math.min(a.duration, before + dt);
      f.dodge = Math.max(0, a.duration - a.time);
      if (a.type === 'neutralAirDodge') return a.time < a.safeUntil - 1e-8;
      const kit = f.kit.airDodge;
      const last = kit.travel[1];
      if (a.time > last / 60 + 1e-8) {
        f.vx = 0;
        if (before <= last / 60 + 1e-8) f.vy = 0;
        return false;
      }
      // Integrate one eased path. A diagonal covers the same distance as a cardinal input.
      const speed = ((dodgeProgress(kit, a.time) - dodgeProgress(kit, before)) * kit.distance) / dt;
      f.vx = a.x * speed;
      f.vy = a.y * speed;
      return true;
    }
    advanceFloor(f, dt) {
      const a = f.floorAction;
      const before = a.time;
      a.time += dt;
      if (a.safeFrom !== undefined) {
        if (a.time + 1e-8 >= a.safeFrom && a.time < a.safeUntil - 1e-8)
          f.invuln = Math.max(f.invuln, a.safeUntil - a.time - 1e-8);
      } else if (a.time + 1e-8 >= floorFrames[a.type][1] / 60) f.invuln = 0;
      if (a.type === 'downed') {
        const floor = this.terrain[f.ground];
        f.y = floor.y;
        if (f.vx) {
          f.x += f.vx * dt;
          if (f.x < floor.x1 - 7 || f.x > floor.x2 + 7) {
            f.floorAction = null;
            f.ground = -1;
            f.y = floor.y + 1;
            f.vy = 45;
            f.coyote = 0;
            f.jumps = 1;
            this.startTumble(f, false);
            this.emit('floorSlip', { f, point: { x: f.x, y: floor.y }, dir: Math.sign(f.vx) });
            return;
          }
          f.vx = toward(f.vx, 0, (850 + 0.2 * f.kit.footwork.traction) * dt);
        }
        const firstChoice = a.locks ? a.duration : 12 / 60;
        if (a.time + 1e-8 >= firstChoice && a.choice) this.beginFloorAction(f, a.choice.type, a.choice.dir);
        else if (a.time + 1e-8 >= a.duration) this.beginFloorAction(f, 'floorRise');
        return;
      }
      if (a.type === 'ledgeRoll' || a.type === 'ledgeClimb') {
        const platform = this.terrain[a.edge.index];
        const climb = a.type === 'ledgeClimb';
        const local = climb ? ledgeClimbPosition(f.kit.ledgeClimb, a.time, a.distance) : ledgeRollPosition(a);
        const x = climb && f.ground >= 0 ? f.x : (a.edge.left ? platform.x1 : platform.x2) + a.dir * local.x;
        const y = platform.y + local.y;
        f.vx = (x - f.x) / dt;
        f.vy = (y - f.y) / dt;
        f.x = x;
        f.y = y;
        if (local.planted && f.ground < 0) {
          f.ground = a.edge.index;
          if (climb) f.vx = f.vy = 0;
          this.emit(a.type + 'Plant', { f, dir: a.dir, edge: a.edge, point: { x, y } });
        }
      } else if (a.dir) {
        const stage = this.terrain[f.ground];
        f.x = clamp(
          f.x + a.dir * rollDistance(f, a) * (rollProgress(a, a.time) - rollProgress(a, before)),
          stage.x1 + 2,
          stage.x2 - 2,
        );
      }
      if (f.attack?.floorAttack) f.attack.time = a.time;
      if (a.time + 1e-8 >= a.duration) {
        if (a.type === 'shieldRoll' || a.type === 'ledgeRoll') f.face = -a.dir;
        f.floorAction = f.attack = null;
        if (a.type === 'ledgeRoll' || a.type === 'ledgeClimb') {
          f.vx = f.vy = 0;
          this.emit(a.type + 'End', { f, dir: a.dir, edge: a.edge, point: { x: f.x, y: f.y } });
        }
      }
    }
    advanceJumpSquat(f, input, dt) {
      if (!f.jumpSquat) {
        const short = f.queuedShortHop && (f.jumpBuffer > 0 || f.heldRecoveryJump);
        f.queuedShortHop = false;
        f.heldRecoveryJump = false;
        const run = f.run;
        const runDir = jumpRunDirection(f);
        f.jumpSquat = { time: 0, short, aerial: null, runDir,
          turned: !!runDir && (f.face === -runDir || !!run.turnJump) };
        bufferSquatInput(f, input);
        f.run = null;
        cancelCharge(f);
        if (this.cpuControlled(f)) this.bot.jumpHold = this.bot.hop && f.kind !== 'brisket' ? 2 / 60 : 0.34;
      }
      const squat = f.jumpSquat;
      if (squat.time + 1e-8 < jumpSquatTime) {
        squat.time += dt;
        const floor = this.terrain[f.ground];
        f.x = clamp(f.x + f.vx * dt, floor.x1 - 7, floor.x2 + 7);
        f.y = floor.y;
        f.jumpBuffer = 0;
        return false;
      }
      f.vy = -f.stats.jump * (squat.short ? 0.60 : 1);
      f.shortHopFlight = !!squat.short;
      const drill = this.spacingPractice;
      if (f.index === 0 && drill?.pattern === 'airPower') drill.short = f.shortHopFlight;
      if (f.index === 0 && drill?.pattern === 'landing' && !drill.airborne) {
        drill.peak = { short: squat.short, floorY: f.y, x: f.x, y: f.y, complete: false };
      }
      if (squat.turned) {
        if (this.spacingPractice && f.index === 0) this.spacingPractice.turned = true;
        this.emit('turnJump', { f, dir: squat.runDir, point: { x: f.x, y: f.y } });
      }
      if (squat.aerial) f.command = squat.aerial;
      f.jumpSquat = null;
      return true;
    }
    leavePlatform(f, fromShield = false) {
      const platform = f.ground;
      const point = { x: f.x, y: this.terrain[platform].y };
      f.ground = -1;
      f.y = point.y;
      f.vy = 110;
      f.jumps = 1;
      f.drop = 0.24;
      f.dropPlatform = platform;
      f.coyote = f.jumpBuffer = f.chainWindow = f.landTime = f.skidTime = f.reboundTime = 0;
      f.fastFall = f.cutJump = f.crouch = f.crawling = false;
      f.run = f.throwBounce = null;
      cancelCharge(f);
      this.emit('platformDrop', { f, platform, point, fromShield });
      const drill = this.platformPractice;
      if (drill?.pattern === 'shield-drop' && f.index === 0 && drill.phase !== 'done') {
        drill.phase = fromShield && drill.phase === 'blocked' ? 'fall' : 'exposed';
        return;
      }
      if (drill?.phase === 'ready' && (drill.pattern === 'below' || drill.pattern === 'top') && f.index === 0 && platform === drill.platform) {
        if (drill.pattern === 'top') this.finishPlatformPractice('left');
        else drill.phase = 'fall';
      }
    }
    move(f, input, dt) {
      if (f.shieldBreak) return this.advanceShieldBreak(f, dt);
      const lastTeeter = f.teeter;
      f.teeter = 0;
      if (f.stockLift && !this.advanceStockReturn(f, input, dt)) return;
      if (f.ground < 0 && !f.ledge && !f.floorAction && !f.attack?.edge && !f.respawning)
        f.airborneTime = Math.min(f.airborneTime + dt, 68 / 60);
      const prep = f.dropPrep;
      f.dropPrep = null;
      const wasCrawling = f.crouch && f.crawling;
      f.crawling = false;
      f.crouch = false;
      if (f.ground < 0) f.shieldStun = f.shieldGrabWindow = 0;
      else if (f.shieldStun > 1e-8) {
        // The guard stays up. Keep a tapped response and its original aim until the block ends.
        f.shieldStun = f.shieldStun <= dt + 1e-8 ? 0 : f.shieldStun - dt;
        const floor = this.terrain[f.ground];
        f.x += f.vx * dt;
        f.vx *= Math.pow(0.72, dt * 60);
        if (f.x < floor.x1 - 7 || f.x > floor.x2 + 7) {
          const dir = f.x < floor.x1 ? -1 : 1, lip = dir < 0 ? floor.x1 : floor.x2;
          // Joined deck pieces still support a sliding fighter. A gap exposes the air below.
          const next = this.terrain.findIndex(p => p !== floor && Math.abs(p.y - floor.y) <= 2 &&
            p.x1 <= lip + 1 && p.x2 >= lip - 1 && f.x >= p.x1 && f.x <= p.x2);
          f.ground = next;
          if (next >= 0) f.y = this.terrain[next].y;
          else {
            f.shield = f.parryEligible = false;
            f.guardIntent = '';
            f.guardAim = null;
            f.guardBuffer = f.shieldGrabWindow = f.shieldStun = f.coyote = 0;
            f.jumps = 1;
            f.vy = 0;
            if (this.edgePractice?.corner && f.index === 0) this.edgePractice.slipped = true;
            this.emit('shieldSlip', { f, dir, point:{x:lip, y:floor.y} });
          }
        }
        return;
      }
      f.stun = f.stun <= dt + 1e-8 ? 0 : f.stun - dt;
      for (const key of [
        'invuln',
        'ledgeLock',
        'drop',
        'dodge',
        'followPounce',
        'hopWindow',
        'jumpBuffer',
        'footstoolLock',
        'guardBuffer',
        'shieldDrop',
        'shieldGrabWindow',
        'parryFlash',
        'chainWindow',
        'landTime',
        'landingLag',
        'takeoffWindow',
        'skidTime',
        'reboundTime',
        'righting',
        'coyote',
        'respawning',
        'regrabLock',
      ])
        f[key] = Math.max(0, f[key] - dt);
      if (f.landingLag <= 1e-8 || f.ground < 0) {
        f.waveSlide = 0;
        f.landingAerial = '';
      }
      if ((f.reaction?.planted || f.reaction?.groundSlide) && !f.stun) f.reaction = null;
      if (f.respawning > 0) return;
      if (f.ledgeTrump) {
        f.ledgeTrump.time += dt;
        if (f.ledgeTrump.time + 1e-8 >= f.ledgeTrump.duration) f.ledgeTrump = null;
      }
      if (f.airDodge && f.airDodge.time + 1e-8 >= f.airDodge.duration) {
        f.airDodge = null;
        f.dodge = 0;
      }
      if (f.command) {
        f.command.life -= dt;
        if (!f.command.released) f.command.heldFor += dt;
        if (f.command.life < -0.00001) f.command = null;
      }
      if (f.clashRecoil) {
        f.clashRecoil.time += dt;
        if (f.clashRecoil.time + 1e-8 >= f.clashRecoil.duration) f.clashRecoil = null;
      }
      if (f.tumble?.escape) {
        const {aerial,frames,command,aim}=f.tumble.escape;
        this.clearTumble(f,aerial ? 'Aerial' : 'Air dodge');
        f.stun = f.jumpBuffer = f.guardBuffer = 0;
        f.command = f.reaction = null;
        if (aerial) {
          aerialStrike(f,command);
          f.attack.hitstunCancelFrames=frames;
        }
        else {
          f.guardAim=aim;
          this.beginAirDodge(f);
          f.airDodge.hitstunCancelFrames=frames;
        }
        if (f.index===0 && this.launchPractice?.pattern==='breakaway') {
          this.launchPractice.saved=frames;
        }
        this.emit('hitstunCancel',{f,frames,option:aerial?'aerial':'dodge',moveId:f.attack?.moveId,
          point:{x:f.x,y:f.y-f.stats.height*.52}});
      }
      if (f.tumble?.cancel && f.tumble.meteor) {
        const { cancel, meteor } = f.tumble, jump = cancel === 'jump';
        this.clearTumble(f, jump ? 'Jump' : 'Up Special');
        f.stun = f.vy = f.guardBuffer = 0;
        f.reaction = null;
        f.vx *= 0.45;
        f.jumpBuffer = jump ? inputWindow : 0;
        f.command = jump ? null : cancel;
        if (this.meteorPractice && f.index === 0) this.meteorPractice.cancel = jump ? 'jump' : 'special';
        this.emit('meteorCancel', { f, moveId: meteor, option: jump ? 'jump' : 'special',
          point: { x: f.x, y: f.y - f.stats.height * 0.5 } });
      }
      const jumpTap = f.jumpBuffer > 0 || (f.heldRecoveryJump && f.ground >= 0) || !!f.jumpSquat;
      if (f.ledge?.dropQueued) {
        this.observeLedgeExit(f,false);
        this.releaseLedge(f, false);
        if (this.climbPractice?.route && this.climbPractice.slot === f.index) {
          this.climbPractice.released = true;
          this.emit('climbCue',{f:this.dogs[0],phase:'release'});
        }
      }
      const jumpingFromLedge = jumpTap && !!f.ledge;
      const attackTap = f.command?.type === 'attack';
      const guardIntent = f.guardIntent;
      f.guardIntent = '';
      if (f.wallAction) {
        const action = f.wallAction;
        action.time += dt;
        if (action.time + 1e-8 >= action.duration) f.wallAction = null;
        else if (action.type === 'wallTech' || action.type === 'ceilingTech') return;
      }
      const floorAction = f.floorAction;
      const spotCounter = floorAction?.type === 'spotDodge' && !jumpTap &&
        (f.command?.type === 'attack' || f.command?.type === 'smash') &&
        floorAction.time + dt + 1e-8 >= floorAction.duration - spotCounterLead;
      if (spotCounter) {
        f.floorAction = null;
        if (f.command.type === 'attack') {
          f.command.released = true;
          // Dodge frames cannot pay for the strike's startup.
          f.command.heldFor = 0;
        }
      } else if (floorAction) return this.advanceFloor(f, dt);
      if (f.tumble) {
        if (f.tumble.pending) this.releaseLaunch(f, input);
        const wasReady = canCancelMeteor(f);
        f.tumble.time += dt;
        if (!wasReady && canCancelMeteor(f)) this.emit('meteorWindow', { f, moveId: f.tumble.meteor,
          point: { x: f.x, y: f.y - f.stats.height * 0.45 } });
      }
      if (f.ledge) {
        const previousGrip = gripFramesLeft(f);
        f.ledgeTime += dt;
        const inward = f.ledge.left ? 1 : -1;
        const steerIn = input.x * inward > 0.45;
        if (!steerIn) f.ledge.carriedIn = false;
        if (attackTap) {
          this.observeLedgeExit(f,false);
          beginLedgeAttack(f);
        }
        else if (!jumpTap && f.guardBuffer > 0) {
          this.beginLedgeOption(f, 'ledgeRoll');
          return this.advanceFloor(f, dt);
        } else if (jumpTap) {
          this.observeLedgeExit(f,false);
          f.x = f.ledge.x + inward * 19;
          f.y = f.ledge.y;
          f.ground = f.ledge.index;
          f.ledge = null;
          f.invuln = Math.min(f.invuln, (shortCatchFrames - 1) / 60 - 1e-8);
          f.ledgeLock = 0.52;
          f.guardBuffer = 0;
          f.guardAim = null;
        } else if (f.ledge.climbQueued || (steerIn && (!f.ledge.carriedIn || f.ledgeTime + 1e-8 >= ledgeDriftGrace))) {
          this.beginLedgeOption(f, 'ledgeClimb');
          return this.advanceFloor(f, dt);
        } else {
          const framesLeft = gripFramesLeft(f);
          if (previousGrip > gripWarningFrames && framesLeft <= gripWarningFrames) this.emit('ledgeStrain', {f,edge:f.ledge});
          if (framesLeft > 0) return;
          this.releaseLedge(f, true);
        }
      }
      const getup = f.attack;
      if (getup?.edge && !getup.planted) {
        getup.time += dt;
        const position = ledgePosition(getup);
        const x = getup.edge.x + f.face * position.x;
        const y = getup.edge.y + position.y;
        f.vx = position.planted ? 0 : (x - f.x) / dt;
        f.vy = position.planted ? 0 : (y - f.y) / dt;
        f.x = x;
        f.y = y;
        if (position.planted) {
          getup.planted = true;
          f.ground = getup.edge.index;
        }
        return;
      }
      let grounded = f.ground !== -1;
      const current = f.attack;
      if (
        current?.moveId === 'pipHopper' &&
        f.hopWindow > 0 &&
        current.time >= 0.1 &&
        f.command?.type === 'special' &&
        f.command.airSide === 'up'
      )
        f.attack = null;
      if (grounded && current?.connected && current.time + 1e-8 >= current.start + (current.link || 0) / 60) {
        const chainTap = attackTap && f.command.groundDirection === 'neutral' && f.chainWindow > 0;
        const jumpFollow =
          jumpTap && (current.jumpCancel || (current.hitBeat === 1 && current.second?.jumpCancel));
        const ropeFollow =
          f.command?.type === 'special' && f.command.airSide === 'neutral' && current.specialCancel;
        const throwFollow = f.command?.type === 'grab' && current.grabCancel;
        if (chainTap && current.moveId === 'pipJab') f.command.confirmedCross = true;
        if (chainTap || jumpFollow || ropeFollow || throwFollow) f.attack = null;
        else if (current.holdForFlurry && !f.command && !input.shield && !input.jump &&
            groundDirection(input.x,input.y) === 'neutral') {
          beginAttack(f,'jab2',0,0,'pipSpeedBag');
          f.attack.flurryBeat = 1;
        }
      }
      if (f.wallKickDir && !grounded && !f.attack && !f.command && !f.grip && !f.tumble && !f.stun &&
          !f.reboundTime && !f.wallAction && !f.airDodge && !f.dodge && !f.guardBuffer && !f.ledgeTrump &&
          !f.impactLag && !f.clashRecoil && (!f.encounter || f.encounter.kind === f.kind)) {
        const wall = this.wallForKick(f, f.wallKickDir);
        if (wall) this.kickOffWall(f, wall, f.wallKickDir);
      }
      const ready =
        !f.attack &&
        !f.clashRecoil &&
        !f.airDodge &&
        !f.ledgeTrump &&
        f.wallAction?.type !== 'wallTechJump' && f.wallAction?.type !== 'wallKick' &&
        f.stun <= 0 &&
        f.dodge <= 0 &&
        f.landingLag <= 1e-8;
      const shieldExit = spotCounter || jumpTap || f.command?.type === 'grab' || f.command?.shieldCounter;
      if (shieldExit || f.shieldDrop < 1e-8) f.shieldDrop = 0;
      if (guardIntent && ready && grounded && !shieldExit && !f.shieldDrop && f.charge < 0) {
        if (guardIntent === 'platformDrop') {
          if (f.shield && this.terrain[f.ground].thin) {
            f.shield = f.parryEligible = false;
            f.guardBuffer = 0;
            this.leavePlatform(f, true);
            grounded = false;
          }
        } else if (guardIntent === 'release' || guardIntent === 'lower') {
          if (f.shield) {
            f.shieldDrop = shieldDropTime;
            f.parryEligible = guardIntent === 'release';
            f.vx = 0;
          }
        } else {
          this.beginGroundDodge(f, guardIntent);
          return this.advanceFloor(f, dt);
        }
      }
      const free = ready && !f.shieldDrop;
      const pressure = this.spacingPractice;
      if (pressure?.pattern === 'fastfall' && pressure.phase === 'active' && pressure.blockAt !== null && grounded && free) {
        const key = f.index === 0 ? 'attackerReady' : 'defenderReady';
        pressure[key] ??= Math.round((this.time-pressure.blockAt)*60);
      }
      const combo = this.comboPractice;
      if (combo?.contacts.length && f.index === 1 && free && combo.firstFree === null)
        combo.firstFree = combo.clock;
      const direction = aimFor(input.y);
      const waveChord = jumpTap && !f.command && f.guardBuffer > 0 && downDiagonal(f.guardAim);
      const wasShielding = f.shield;
      f.shield = free && grounded && input.shield && f.charge < 0 && !shieldExit;
      if (!f.shield) f.brakingShield = false;
      else if (!wasShielding) {
        f.brakingShield = !!dashShieldReady(f);
        if (f.brakingShield) {
          this.emit('dashShield', {f, dir:f.run.face, point:{x:f.x, y:f.y}});
          if (f.index === 0 && this.footworkPractice?.pattern === 'dashShield')
            this.footworkPractice.braced = true;
        }
      }
      if (f.index === 0 && f.shield && !wasShielding && pressure?.pattern === 'fastfall' && pressure.phase === 'active')
        this.emit('apexGuard',{f});
      if (f.shield) {
        if (!wasShielding) f.shieldLeanX = f.shieldLeanY = 0;
        const x = input.x || 0, y = input.y || 0;
        const length = Math.max(0.5, Math.hypot(x, y));
        f.shieldLeanX = toward(f.shieldLeanX, x / length, 15 * dt);
        f.shieldLeanY = toward(f.shieldLeanY, y / length, 15 * dt);
      } else if (!f.shieldDrop) f.shieldLeanX = f.shieldLeanY = 0;
      if (!f.shield) f.shieldGrabWindow = 0;
      if (grounded && input.shield && !f.jumpSquat && !waveChord) f.guardBuffer = 0;
      f.shieldHP = clamp(f.shieldHP + (f.shield ? -0.13 : 0.24) * dt, 0, 1);
      if (f.shield && f.shieldHP <= 0) return this.breakShield(f);
      if (free && !grounded && f.guardBuffer > 0 && !f.usedDodge) {
        this.beginAirDodge(f);
      }
      const canStand = grounded && free && !f.shield && !f.jumpSquat && !jumpingFromLedge;
      const dogMovement = !f.encounter || f.encounter.kind === f.kind;
      const stanceFree = canStand && dogMovement && f.charge < 0;
      const canJump = jumpTap && !f.smashCharge && (f.jumps > 0 || f.coyote > 0) &&
        !(f.tumble && f.techBuffer > 1e-8 && this.solidAhead(f, f.techBuffer));
      // Up Smash and Up Special can replace the three grounded takeoff frames. An aim-stick aerial stays an aerial.
      const up = f.command;
      const cancelTakeoff = canJump && free && grounded && !jumpingFromLedge && dogMovement &&
        (!f.jumpSquat || f.jumpSquat.time + 1e-8 < jumpSquatTime) &&
        up?.airSide === 'up' && (up.type === 'smash' || up.type === 'special');
      if (cancelTakeoff) {
        const dir = f.jumpSquat ? f.jumpSquat.runDir : jumpRunDirection(f);
        up.fromJumpSquat = true;
        if (up.type === 'smash' && dir && f.vx * dir > 0) up.jumpSlide = dir;
        if (f.jumpSquat?.turned && !up.face) up.facing = f.face;
        f.jumpSquat = null;
        f.jumpBuffer = 0;
        f.heldRecoveryJump = false;
        cancelCharge(f);
      }
      const droppingByJump = canStand && canJump && !attackTap && !waveChord && direction === 1 && this.terrain[f.ground].thin;
      // Let a Down + Attack chord keep its tilt. A new aim after releasing Down can punch through on departure.
      const earlyAerial = prep?.frames > 0 && attackTap && direction !== 1;
      let dropNow = droppingByJump;
      if (stanceFree && !input.shield && !jumpTap && prep?.platform === f.ground && (!f.command || earlyAerial)) {
        prep.frames++;
        if (prep.frames >= 3 || earlyAerial) dropNow = true;
        else f.dropPrep = prep;
      }
      f.crouch = stanceFree && !jumpTap && !f.command && !dropNow &&
        (!!f.dropPrep || (direction === 1 && (Math.abs(input.x) < 0.55 ||
          (f.kit.crawl && input.y + .12 >= Math.abs(input.x)))));
      f.crawling = !!(f.crouch && !f.dropPrep && f.kit.crawl && (Math.abs(input.x) > .23 || wasCrawling));
      if (grounded && free && !jumpTap && !f.crouch && !dropNow && Math.abs(input.x) > 0.16 && f.charge < 0 && !f.shield)
        f.face = Math.sign(input.x);
      if (
        grounded &&
        free &&
        !f.shield &&
        f.charge < 0 &&
        !f.skidTime &&
        Math.abs(f.vx) > f.stats.speed * 0.68 &&
        input.x * Math.sign(f.vx) < 0.1
      ) {
        f.skidFace = Math.sign(f.vx);
        f.skidTime = 0.14;
        this.emit('skid', { f, face: f.skidFace });
      }
      if (free && f.stun <= 0 && f.dodge <= 0 && !f.shield) {
        if (dropNow) this.leavePlatform(f);
        else if (canJump && !cancelTakeoff) {
          this.clearTumble(f, 'Jump');
          f.righting = 0;
          f.throwBounce = null;
          const groundJump = grounded && !jumpingFromLedge;
          if (groundJump) {
            if (!this.advanceJumpSquat(f, input, dt)) return;
          } else {
            f.shortHopFlight = false;
            if (f.coyote > 0) f.jumps = 2;
            f.vy = -f.stats.jump * (f.jumps === 2 ? 1 : 0.91);
            if (this.cpuControlled(f)) this.bot.jumpHold = this.bot.hop && f.kind !== 'brisket' ? 0.07 : 0.34;
          }
          f.jumps--;
          f.takeoffWindow = groundJump ? 5 / 60 : 0;
          f.cutJump = !groundJump && !f.ledgeDropJump;
          f.ledgeDropJump = false;
          f.fastFall = false;
          this.emit('jump', { f });
          const drill = this.climbPractice;
          if (drill?.route && drill.released && drill.phase === 'active' && f.index === drill.slot && !grounded) {
            drill.airJump = true;
            this.emit('climbCue',{f:this.dogs[0],phase:'rise'});
          }
          f.ground = -1;
          f.coyote = 0;
          f.jumpBuffer = 0;
          cancelCharge(f);
          f.chainWindow = 0;
          f.landTime = 0;
          f.skidTime = 0;
          f.reboundTime = 0;
        }
        if (f.command?.airOnly && f.ground >= 0) f.command = null;
        const command = f.command;
        if (f.charge >= 0 && (f.smashCharge || !command || command.type === 'attack')) {
          const before = f.charge;
          if (!f.chargeReleased) f.charge += dt;
          if (!f.smashCharge && !f.chargeReleased) {
            const x = input.grabX ?? input.x;
            const angle = forwardTiltAngle(x, input.y, input.x);
            const side = angle ? 'forward' : groundDirection(x, input.y);
            if (Math.abs(x) > 0.28) f.face = Math.sign(x);
            if (side !== 'neutral') {
              f.chargeDirection = side;
              f.chargeTilt = angle;
            }
            if (f.charge >= attackHold) {
              lockSmash(f, 'attack', verticalAim(f.chargeDirection), f.face);
              this.emit('smashCharge', { f });
            }
          }
          if (f.smashCharge && before < smashChargeTime && f.charge >= smashChargeTime)
            this.emit('smashReady', { f });
          const heldCross = f.chargingCross && input.attack && !f.chargeReleased && f.chargeDirection === 'neutral';
          if (heldCross || f.chargeReleased || f.charge + 1e-8 >= smashHoldLimit || (!f.smashCharge && command)) {
            if (f.smashCharge) {
              releaseSmash(f);
              this.emit('smashRelease', { f });
            } else {
              groundStrike(f, f.chargeDirection, f.charge, f.chargeSlide, f.chargeTilt);
              if (heldCross && f.attack.moveId === 'pipCross') f.attack.holdForFlurry = true;
            }
          }
        } else if (command && (command.type !== 'smash' || f.ground >= 0) &&
            !(command.landGrab && this.canBufferLandingGrab(f,input.x))) {
          f.throwBounce = null;
          f.command = null;
          const neutralInAir = command.type === 'special' && command.airSide === 'neutral' && f.ground < 0;
          if (command.face && !neutralInAir && (f.ground >= 0 || command.type !== 'attack')) f.face = command.face;
          if (command.type === 'grab') {
            const style = f.ground >= 0 && command.grabStyle ? command.grabStyle : 'standing';
            beginGrab(f, style, style === 'standing' ? 0 : command.runFace, command.aim, command.shieldGrab, command.boostGrab);
            if (command.boostGrab)
              this.emit('boostGrab', {f, dir:command.runFace, moveId:f.attack.moveId});
            if (command.landGrab && f.ground >= 0) f.attack.landingGrab = true;
          } else if (command.type === 'special') this.special(f, command);
          else if (command.type === 'smash') {
            f.charge = 0;
            f.chargeReleased = false;
            lockSmash(f, command.button || 'smash', command.aim, command.face || command.facing, command);
            if (command.jumpSlide) this.emit('skid', {f, face:command.jumpSlide});
            if (command.released) {
              releaseSmash(f);
              this.emit('smashRelease', { f });
            } else this.emit('smashCharge', { f });
          } else if (f.ground < 0) {
            aerialStrike(f, command);
            if (command.fromWindup) this.emit('attackCancel', {f, source:command.fromWindup,
              moveId:f.attack.moveId, face:f.face, point:{x:f.x,y:f.y}});
          }
          else if (command.runFace) {
            f.face = command.runFace;
            beginAttack(f, 'dash', 0, 0, f.kit.dashAttack);
            f.vx = f.face * Math.max(0, f.vx * f.face) * f.attack.carry;
          } else if (command.released) {
            groundStrike(f, command.groundDirection, command.heldFor, command.slideDir, command.tiltAngle);
            if (f.attack.moveId === 'pipCross') f.attack.holdForFlurry = !command.button && !!input.attack;
          } else {
            f.charge = command.heldFor;
            f.chargingCross = !!command.confirmedCross;
            f.chargeSlide = command.slideDir || 0;
            f.chargeDirection = command.groundDirection;
            f.chargeTilt = command.tiltAngle || 0;
            f.chargeReleased = false;
          }
          if (spotCounter) {
            const strike = f.attack || f.smashCharge;
            strike.spotCounter = true;
            this.emit('spotCounter', { f, moveId: strike.moveId });
          }
        }
      }
      if (dogMovement && free && f.ground < 0 && f.tumble?.wiggle && !f.attack && !f.airDodge &&
          !f.wallAction && !f.techBuffer && !f.throwBounce && !f.grip) {
        const dir = f.tumble.wiggle;
        this.clearTumble(f, 'Tumble wiggle');
        f.righting = 8 / 60;
        f.reaction = null;
        if (f.index === 0 && this.launchPractice?.pattern === 'juggle') this.launchPractice.wiggled = true;
        if (f.index === 0 && this.mode === 'solo' && this.bot.juggleRead)
          this.bot.lastDrift = dir * this.bot.juggleRead.throwFace;
        this.emit('tumbleWiggle', { f, dir, point:{ x:f.x, y:f.y - f.stats.height * .52 } });
      }
      if (f.cutJump && (!input.jump || f.vy >= 0)) {
        if (!input.jump && f.vy < -265) f.vy *= 0.55;
        f.cutJump = false;
      }
      if (f.attack) {
        if (f.tumble) this.clearTumble(f, 'Aerial action');
        const a = f.attack;
        if (a.reverseQueued) {
          a.reverseQueued = false;
          if (f.ground < 0 && a.airNeutral && !a.reversed) {
            a.reversed = true;
            f.face = -f.face;
            f.vx = -f.vx;
            this.specialTurn(f, a.turned ? 'wavebounce' : 'bReverse');
          }
        }
        a.time += dt;
        if (
          a.shieldGrab && a.step &&
          a.time > shieldGrabPenalty + 1e-8 && a.time - dt <= shieldGrabPenalty + 1e-8
        )
          f.vx = f.face * a.step;
        if (a.projectile && !a.fired && a.time + 1e-8 >= a.start) {
          a.fired = true;
          this.throwItem(f, a);
        }
        if (a.specialSide && this.advanceSpecial(f, a, input, dt)) return;
        if (a.plunge && a.time < a.start - 1e-8) f.vy = Math.min(f.vy, -1540 * f.kit.gravity * dt);
        if ((a.plunge || a.burst) && !a.fired && a.time + 1e-8 >= a.start) {
          a.fired = true;
          if (a.plunge) f.vy = 685;
          if (a.burst) f.vx = f.face * Math.max(a.burst, f.vx * f.face + a.burst * 0.5);
        }
        if (a.time + 1e-8 >= a.end && a.flurryBeat && grounded) {
          if (a.finishFlurry || a.flurryBeat >= 5) {
            beginAttack(f,'finisher',0,0,'pipBellKick');
            f.vx += f.face*f.attack.step;
          } else {
            a.flurryBeat++;
            a.time = 0;
          }
        } else if (a.time >= a.end) f.attack = null;
      }
      const sliding = f.attack?.motionLocked;
      const onFoot = grounded && f.ground >= 0 && free && !f.attack && !f.shield &&
        f.charge < 0 && !f.dodge && dogMovement;
      if (f.clashRecoil) {
        f.vx = toward(f.vx, 0, (grounded ? f.kit.footwork.traction * 0.35 : 120) * dt);
      } else if (f.waveSlide) {
        f.vx = toward(f.vx, 0, f.kit.footwork.traction * slideFriction * dt);
      } else if (f.tumble) {
        f.vx *= Math.pow(0.68, dt);
        if (!f.stun) f.vx += input.x * 175 * dt;
      } else if (f.ground >= 0 && f.stun > 0 && f.reaction?.planted) {
        f.vx = toward(f.vx, 0, f.kit.footwork.traction * 0.45 * dt);
      } else if (f.ground >= 0 && f.stun > 0 && f.reaction?.groundSlide) {
        f.vx = toward(f.vx, 0, f.kit.footwork.traction * .18 * dt);
      } else if (f.stun > 0 || f.ledgeTrump || f.wallAction?.type === 'wallTechJump' || f.wallAction?.type === 'wallKick') {
        f.vx *= Math.pow(0.68, dt);
        f.vx += input.x * 100 * dt;
      } else if (f.ground >= 0 && f.attack?.brake) {
        f.vx = toward(f.vx, 0, f.attack.brake * dt);
      } else if (f.ground >= 0 && (f.chargeSlide || f.attack?.slideDir)) {
        f.vx = toward(f.vx, 0, f.kit.footwork.tiltBrake * dt);
      } else if (f.shield && f.brakingShield) {
        f.vx = toward(f.vx, 0, f.kit.footwork.traction * dt);
        if (!f.vx) f.brakingShield = false;
      } else if (onFoot && f.crouch) {
        if (!f.dropPrep) {
          const crawl = f.crawling && f.kit.crawl;
          const speed = crawl && Math.abs(input.x) > .23 ? input.x * (input.x * f.face < 0 ? crawl.back : crawl.forward) : 0;
          f.vx = toward(f.vx, speed, f.kit.footwork.traction * dt);
          if (crawl) f.strideDistance += Math.abs(f.vx) * dt;
        }
        f.run = null;
      } else if (onFoot) {
        moveOnFoot(f, input.x, dt);
        f.strideDistance += Math.abs(f.vx) * dt;
      } else if (f.ground < 0 && dogMovement && !f.airDodge && f.dodge <= 0 &&
          (!f.attack || (f.attack.airSide && !f.attack.plunge && !f.attack.burst))) {
        f.vx = airVelocity(f, f.vx, input.x, dt);
      } else if (!f.airDodge && f.dodge <= 0 && !sliding) {
        const onFloor = f.ground >= 0;
        const planted =
          f.shield ||
          f.shieldDrop > 0 ||
          f.charge >= 0 ||
          (onFloor && (f.landingLag > 1e-8 || f.attack?.tiltSide || f.attack?.ledgeAttack));
        const mobility = planted ? 0 : f.attack ? (onFloor ? 0.12 : 0.65) : 1;
        const steppingJab = f.attack?.step && f.attack.time < f.attack.start;
        const drag = onFloor ? (steppingJab ? 560 : 2630) : Math.abs(input.x) > 0.1 ? f.kit.airAccel : 155;
        f.vx = toward(f.vx, input.x * f.stats.speed * mobility, drag * dt);
      }
      if (!onFoot) f.run = null;
      const dodgeGlide = f.airDodge && this.advanceAirDodge(f, dt);
      const oldX = f.x,
        oldY = f.y;
      f.x += f.vx * dt;
      if (f.ground >= 0) {
        const p = this.terrain[f.ground];
        // Walking plants the lead paw at the lip. Committed motion and knockback keep their travel.
        const crawling = f.crouch && f.crawling;
        if (onFoot && !f.run && (!f.crouch || crawling) && !f.waveSlide && !f.tumble && !f.reaction &&
            !f.skidTime && !f.landingLag && !f.jumpSquat && !f.clashRecoil && Math.abs(f.vx) <= f.kit.footwork.walk + 1e-8) {
          const side = Math.sign(input.x) || lastTeeter;
          const lip = side > 0 ? p.x2 : p.x1;
          if (side && (side === f.face || crawling) && (f.x - lip) * side >= -1e-8 && (oldX - lip) * side <= 7 &&
              !this.terrain.some(other => other !== p && Math.abs(other.y - p.y) <= 2 &&
                lip + side * 2 >= other.x1 && lip + side * 2 <= other.x2)) {
            const plantedX = side > 0 ? Math.max(oldX, lip) : Math.min(oldX, lip);
            f.strideDistance -= Math.abs(f.x - plantedX);
            f.x = plantedX;
            f.vx = 0;
            f.teeter = side;
            if (lastTeeter !== side) this.emit('teeter', { f, dir: side, point: { x: lip, y: p.y } });
          }
        }
        if (f.x < p.x1 - 7 || f.x > p.x2 + 7) {
          const cancel = f.landingAerial && f.landingLag > 1e-8 && !f.stun && !f.grip;
          if (f.brakingShield) f.shield = f.brakingShield = false;
          f.ground = -1;
          f.waveSlide = 0;
          f.dropPrep = null;
          f.crouch = f.crawling = false;
          f.jumps = 1;
          f.coyote = cancel || f.reaction?.groundSlide ? 0 : 0.085;
          if (cancel) {
            const frames = Math.round(f.landingLag * 60);
            const moveId = f.landingAerial;
            f.landingLag = f.landTime = 0;
            f.landingAerial = '';
            if (f.command?.button === 'aimStick' && f.command.type === 'smash') {
              f.command.type = 'attack';
              f.command.airOnly = true;
            }
            if (f.index === 0 && this.edgePractice && this.edgePractice.phase !== 'done') this.edgePractice.frames = frames;
            this.emit('edgeCancel', { f, moveId, frames, dir: Math.sign(f.vx), point: { x: f.vx < 0 ? p.x1 : p.x2, y: p.y } });
          }
        } else {
          f.y = p.y;
          f.vy = 0;
        }
      }
      if (f.ground < 0) {
        if (f.charge >= 0) cancelCharge(f);
        // A tap can fast-fall onto a perch. Keep Down held for three free air frames to pass it.
        const passing = input.y >= .74 && !input.shield && !f.attack && !f.command && !f.floorAction &&
          !f.dodge && controlsFall(f) && (!f.encounter || f.encounter.kind === f.kind);
        f.airPassHold = passing ? Math.min(3,(f.airPassHold || 0) + 1) : 0;
        if (!dodgeGlide) {
          const controlled = controlsFall(f);
          if (!controlled || (f.fastFallBuffer && framesToApex(f) > fastFallBufferFrames)) f.fastFallBuffer = 0;
          if (!controlled || f.vy < 0) f.fastFall = false;
          f.vy = fallVelocity(f,f.vy,dt,controlled);
          if (f.fastFallBuffer && f.vy >= -1e-8) {
            f.fastFall = true;
            f.fastFallBuffer = 0;
            f.vy = Math.max(f.vy, f.kit.fastFallSpeed);
            if (f.index === 0 && this.spacingPractice?.pattern === 'fastfall') this.spacingPractice.fast = true;
            this.emit('fastFall', { f, point:{x:f.x, y:f.y - f.stats.height*.65} });
          } else if (f.fastFallBuffer) f.fastFallBuffer--;
        } else f.fastFallBuffer = 0;
        f.y += f.vy * dt;
        const contact = this.solidContact(f, oldX, oldY, f.x, f.y);
        if (contact?.ceiling) {
          this.hitCeiling(f, contact, oldY);
          return;
        } else if (contact) {
          if (f.tumble) {
            this.hitWall(f, contact, input.jump);
            return;
          }
          f.x = contact.x;
          f.vx = 0;
        }
        if (f.vy >= 0) {
          const meteor = f.tumble?.meteor;
          let landing = meteor || f.airPassHold === 3 ? this.landingSurface(f, oldY, oldX, dt) : this.landingSurface(f, oldY);
          if (f.airPassHold === 3 && this.terrain[landing]?.thin) {
            const platform = landing;
            f.drop = .24;
            f.dropPlatform = platform;
            landing = this.landingSurface(f, oldY, oldX, dt, this.terrain, this.time, true);
            const drill = this.platformPractice;
            if (f.index === 0 && drill?.pattern === 'layers' && drill.phase !== 'done') {
              if (platform === drill.platform) drill.phase = 'belowTop';
              else if (platform === 1 && drill.phase === 'belowTop') drill.phase = 'fall';
              else this.finishPlatformPractice('missed');
            }
            this.emit('airPlatformPass',{f,platform,point:{x:f.x,y:this.terrain[platform].y}});
          }
          const source = this.terrain[f.dropPlatform];
          if (f.drop > 0 && (!source || f.y > source.y + 3 || landing >= 0)) {
            f.drop = 0;
            f.dropPlatform = -1;
          }
          if (landing >= 0) {
            const landingSpeed = f.vy;
            if (meteor) {
              const floor = this.terrain[landing], t = floorCrossing(oldY, f.y, floor.y);
              f.x = clamp(oldX + (f.x - oldX) * t, floor.x1, floor.x2);
            }
            const speed = f.tumble && floorImpactSpeed(landingSpeed, f.tumble.downLaunch, f.tumble.time);
            const hard = !f.throwBounce && f.stun > 0 && speed >= maxTechSpeed;
            if (hard || (meteor && f.techBuffer <= 1e-8)) {
              const moveId = f.tumble.meteor, floor = this.terrain[landing];
              f.y = floor.y - 1;
              f.vy = -Math.min(700, landingSpeed * 0.72);
              f.vx *= 0.76;
              f.stun = Math.max(f.stun, Math.min(20 / 60, Math.abs(f.vy) / 1700));
              f.tumble.meteor = null;
              f.tumble.cancel = null;
              f.tumble.downLaunch = f.techBuffer = 0;
              if (hard && this.meteorPractice && f.index === 0) this.meteorPractice.hardSpeed = speed;
              this.emit(meteor ? 'meteorBounce' : 'floorBounce', { f, moveId, hard, platform: landing,
                speed: hard ? speed : landingSpeed, point: { x: f.x, y: floor.y } });
              return;
            }
            if (f.throwBounce) {
              const { lift, scale, carry, moveId, owner } = f.throwBounce;
              f.throwBounce = null;
              f.y = this.terrain[landing].y - 1;
              f.vy = -Math.min(650, lift + landingSpeed * scale);
              f.vx *= carry;
              if (Math.hypot(f.vx, f.vy) >= tumbleSpeed) this.startTumble(f, false);
              this.emit('throwBounce', {
                f,
                owner: this.dogs[owner],
                moveId,
                point: { x: f.x, y: f.y + 1 },
                face: Math.sign(f.vx) || f.face,
              });
              return;
            }
            f.ground = landing;
            if (this.wallPractice?.runner) this.finishWallReturn(f, 'landed', landing);
            if (f.attack?.airNeutral) f.attack.airNeutral = false;
            if (f.command?.airOnly) f.command = null;
            f.y = this.terrain[landing].y;
            f.vy = 0;
            if (f.airDodge) {
              f.landingLag = f.airDodge.landingLag;
              f.waveSlide = downDiagonal(f.airDodge) && Math.abs(f.vx) > 1 ? Math.sign(f.vx) : 0;
              if (f.waveSlide) {
                // Carry the sideways impulse at contact. Late, steep dodges carry less speed.
                f.vx *= slideCarry;
                f.lastMove = f.airDodge.fromHop ? 'Wavedash' : 'Waveland';
                this.emit('waveland', { f, dir: Math.sign(f.vx), point: { x: f.x, y: f.y }, speed: Math.abs(f.vx) });
              } else f.vx = clamp(f.vx * 0.24, -f.stats.speed * 0.75, f.stats.speed * 0.75);
              f.guardBuffer = 0;
              this.emit('airDodgeLand', { f, type: f.airDodge.type });
            }
            if (f.tumble) {
              restoreAir(f);
              if (f.techBuffer > 1e-8) {
                const dir = Math.abs(input.x) > 0.45 ? Math.sign(input.x) : f.tumble.techDir || 0;
                this.beginFloorAction(f, dir ? 'techRoll' : 'tech', dir);
              } else this.beginFloorAction(f, 'downed');
              return;
            }
            if (f.attack?.airSide) {
              const a = f.attack;
              const committed = committedLanding(a, a.time);
              const lead = a.landingPress === undefined ? null : a.time - a.landingPress;
              const canceled = committed && lead !== null && lead <= landingCancelWindow + 1e-8;
              const frames = canceled ? Math.ceil(a.land / 2) : committed ? a.land : 2;
              f.landingLag = frames / 60;
              f.landingAerial = committed ? a.moveId : '';
              if (canceled) {
                f.guardBuffer = 0;
                this.emit('landingCancel', { f, moveId: a.moveId, frames, full: a.land, point: { x: f.x, y: f.y } });
              }
              const drill = this.spacingPractice;
              if (drill?.pattern === 'cancel' && drill.phase === 'active' && f.index === 0) {
                drill.contact = a.moveId;
                drill.frames = frames;
                drill.canceled = canceled;
                drill.lead = lead === null ? null : Math.round(lead * 60);
              }
              a.landed = true;
            }
            if (f.attack?.diving) {
              f.attack.diving = false;
              f.attack.time = 0;
              this.emit('slide', { f });
            } else if (f.attack?.moveId === 'cloverSail' || f.attack?.moveId === 'pipHopper') {
              f.attack.landed = true;
            }
            restoreAir(f);
            f.righting = 0;
            if (f.waveSlide || f.attack?.airSide || landingSpeed > 225) {
              f.landDuration = Math.max(0.12, f.landingLag);
              f.landTime = f.landDuration;
            }
            if (landingSpeed > 225 && !f.waveSlide) this.emit('land', { f, speed: landingSpeed });
            if (f.stun > 0) f.stun *= 0.62;
          }
        }
        if (f.ground < 0 && !f.ledgeLock && !f.stun && input.y < 0.55) {
          const a = f.airDodge;
          if (a && a.y < 0.5 && a.time + 1e-8 >= f.kit.airDodge.ledgeFrame / 60) {
            const edge = this.nearestLedge(f, dodgeCatch.reach, dodgeCatch.above, dodgeCatch.below);
            if (edge && a.x * (edge.left ? 1 : -1) >= 0) this.ledgeClaims.push({ f, edge });
          } else if (!a && !f.dodge && f.vy > -125) this.tryLedge(f, 33, 80);
        }
        const a = f.airDodge;
        if (a && a.time + 1e-8 >= a.safeFrom && a.time < a.safeUntil - 1e-8)
          f.invuln = Math.max(f.invuln, dt - 1e-8);
      }
    }
    landingSurface(f, oldY, oldX = f.x, dt = 0, terrain = this.terrain, time = this.time, solidOnly = false) {
      let landing = -1;
      for (const [i, p] of terrain.entries()) {
        if (p.thin && (solidOnly || (f.drop > 0 && f.dropPlatform === i))) continue;
        if (oldY > p.y + (f.drop > 0 ? 1e-8 : 2) || f.y < p.y ||
            (landing >= 0 && p.y >= terrain[landing].y)) continue;
        const t = dt ? floorCrossing(oldY, f.y, p.y) : 1;
        const x = oldX + (f.x - oldX) * t;
        const surface = dt && !this.layout && i === arenas[this.geometryStage]?.movingPlatform
          ? platforms(this.geometryStage, time - (1 - t) * dt)[i] : p;
        if (x >= surface.x1 - 5 && x <= surface.x2 + 5) landing = i;
      }
      return landing;
    }
    nearestLedge(f, horizontal, above, below) {
      if (f.ledgeCatches >= maxLedgeCatches) return null;
      let best = null,
        distance = Infinity;
      for (const [index, p] of this.terrain.entries()) {
        if (p.thin || f.y < p.y + above || f.y > p.y + below) continue;
        for (const left of [true, false]) {
          const x = left ? p.x1 : p.x2;
          if ((left ? f.x > x + 2 : f.x < x - 2) || Math.abs(f.x - x) > horizontal) continue;
          const length = Math.hypot(f.x - x, f.y - p.y);
          if (length < distance) {
            distance = length;
            best = { x, y: p.y, index, left };
          }
        }
      }
      return best;
    }
    resolveLedgeClaims() {
      // Both dogs get to act before a catch takes the lip. Break a same-tick tie with the match RNG.
      const [a, b] = this.ledgeClaims;
      if (b && sameLedge(a.edge, b.edge) && this.random() < 0.5) this.ledgeClaims.reverse();
      for (const { f, edge } of this.ledgeClaims) this.hangLedge(f, edge);
      this.ledgeClaims.length = 0;
    }
    hangLedge(f, edge) {
      if (sameLedge(f.ledge, edge) || f.ledgeCatches >= maxLedgeCatches) return;
      const rival = this.dogs.find((other) => other !== f && sameLedge(other.ledge, edge));
      const trump = !!rival;
      const guardFrames = ledgeGuardFrames(f), protectedCatch = guardFrames > 0;
      const inward = edge.left ? 1 : -1;
      if (trump) {
        rival.ledge = null;
        rival.ledgeTrump = { time: 0, duration: 10 / 60, dir: -inward };
        rival.ledgeLock = 20 / 60 - 1e-8;
        rival.invuln = rival.jumpBuffer = rival.guardBuffer = 0;
        rival.command = rival.guardAim = null;
        rival.face = inward;
        rival.vx = -inward * 185;
        rival.vy = -230;
      }
      this.clearTumble(f, 'Ledge catch');
      f.clashRecoil = null;
      f.impactLag = f.shieldStun = f.shieldGrabWindow = 0;
      f.shieldDrop = f.parryFlash = 0;
      f.guardIntent = '';
      f.run = null;
      f.throwBounce = null;
      f.face = inward;
      // Give a player drifting toward the stage a moment to choose a get-up attack.
      const previousCatches = f.ledgeCatches ?? 0;
      const hangFrames = ledgeHangLimit(f, previousCatches);
      f.ledgeCatches = previousCatches + 1;
      f.ledge = { ...edge, carriedIn: f.prev.x * inward > 0.45, protectedCatch, guardFrames, hangFrames };
      f.ledgeTrump = null;
      f.ledgeProtectionReady = false;
      f.airborneTime = f.ledgeTime = 0;
      f.x = edge.x + f.face * hangingFeet[1];
      f.y = edge.y + hangingFeet[2];
      f.vx = f.vy = 0;
      f.ground = -1;
      f.attack = f.command = null;
      cancelCharge(f);
      f.invuln = Math.max(0, guardFrames / 60 - 1e-8);
      f.jumpBuffer = f.guardBuffer = f.chainWindow = 0;
      if (this.wallPractice?.runner) this.finishWallReturn(f, 'ledge', edge.index);
      restoreAir(f);
      const drill = this.trumpPractice;
      if (
        drill?.phase === 'approach' &&
        sameLedge(edge, drill.edge) &&
        f.index === (drill.role === 'take' ? 0 : 1)
      )
        drill.phase = 'caught';
      const edgeDrill = this.edgePractice;
      if (edgeDrill?.timeCatch && edgeDrill.phase === 'approach' && f.index === 1) {
        edgeDrill.guardFrames = guardFrames;
        edgeDrill.phase = 'hanging';
      }
      this.emit('ledge', { f, protectedCatch, guardFrames, trump });
      if (trump)
        this.emit('ledgeTrump', { f, target: rival, edge, dir: inward, point: { x: edge.x, y: edge.y } });
    }
    releaseLedge(f, slipped) {
      const edge = f.ledge;
      f.ledge = null;
      f.ledgeDropJump = true;
      f.invuln = Math.min(f.invuln,(shortCatchFrames-1)/60-1e-8);
      f.ledgeLock = .45;
      f.coyote = 0;
      f.vy = 65;
      f.jumps = 1;
      this.emit(slipped ? 'ledgeSlip' : 'ledgeRelease', {f,edge});
      if (slipped && this.climbPractice?.role === 'patience' && f.index === 0) this.finishClimbPractice('slipped');
    }
    tryLedge(f, horizontal, below) {
      const edge = this.nearestLedge(f, horizontal, 5, below);
      if (edge) this.ledgeClaims.push({ f, edge });
      return !!edge;
    }
    catchRival(owner, target, attack) {
      this.rememberTechPunish(target);
      if(this.chasePractice?.role==='readTech' && target.index===1 && this.chasePractice.phase!=='done')
        this.finishChase(target.floorAction?.techChoice?'grabPunish':this.chasePractice.phase==='getup'?'escaped':'early');
      if (this.climbPractice?.role === 'patience' && owner.index === 0)
        this.finishClimbPractice(this.climbPractice.passed ? 'grabbed' : 'interrupted');
      if (this.chasePractice?.bait && target.index === 1 && this.chasePractice.phase !== 'done')
        this.finishChase(this.chasePractice.phase === 'getup' ? 'grabPunish' : 'interrupted');
      const pressure = this.bot.pressure;
      if (owner.index === 1 && target.index === 0 && pressure?.roll && pressure.strike === attack &&
          target.floorAction?.type === 'shieldRoll' && target.floorAction.dir === pressure.roll.dir)
        this.bot.rollPunishes = (this.bot.rollPunishes || 0) + 1;
      this.comboContact(target, 'grab', attack.moveId);
      const spec = grabs[attack.moveId];
      this.gradeFootwork(target);
      const landingFrames = Math.ceil(target.landingLag * 60 - 1e-8);
      const face = owner.face;
      const chest = target.y - target.stats.height * 0.52;
      const from = [(target.x - owner.x) * face, chest - owner.y];
      const extra = spec.reelSpeed ? Math.abs(from[0] - spec.grip[0]) / spec.reelSpeed : 0;
      const hold = spec.hold + Math.min(0.75, target.damage * 0.005);
      const grip = {
        owner: owner.index,
        target: target.index,
        face,
        grabId: attack.moveId,
        holdPose: owner.kit.grab + 'Hold',
        phase: 'reel',
        time: 0,
        from,
        anchor: { x: target.x, y: chest },
        high: false,
        reelTime: spec.reel + extra,
        capacity: hold,
        remaining: hold,
        struggleSector: shiftSector(target.prev),
        struggles: 0,
        struggleFlash: 0,
        elapsed: 0,
        pending: attack.queuedThrow || null,
        pummelCount: 0,
        direction: null,
        throwId: null,
        comboLink: target.stun > 0,
      };
      if(owner.index===1){
        const scout=this.rollPractice?.pattern==='scout'?this.rollPractice:this.bot;
        const plan=scout.rollForecast;
        if(plan?.rolled && plan.thrown && this.time-plan.grabAt<=spec.start+spec.active+.04)
          scout.ledgeRollCatches=(scout.ledgeRollCatches || 0)+1;
      }
      this.grapple = owner.grip = target.grip = grip;
      target.shortHopFlight = false;
      if (target.shieldBreak) this.endShieldBreak(target, 'grabbed', attack.moveId);
      for (const f of [owner, target]) {
        f.ledgeDropJump = false;
        f.dropPrep = null;
        f.crouch = f.crawling = false;
        cancelCharge(f);
        f.impactLag = f.shieldStun = f.shieldGrabWindow = 0;
        f.wallAction = null;
        f.ledgeTrump = null;
        f.tumble = f.floorAction = null;
        f.airDodge = f.guardAim = null;
        f.waveSlide = f.takeoffWindow = 0;
        f.dodge = 0;
        f.techBuffer = 0;
        f.guardIntent = '';
        f.shieldDrop = f.parryFlash = 0;
        f.run = null;
        f.attack = f.command = f.reaction = f.throwBounce = f.clashRecoil = null;
        f.jumpSquat = null;
        f.fastFall = false;
        f.fastFallBuffer = 0;
        f.chainWindow = f.jumpBuffer = f.guardBuffer = f.reboundTime = f.landingLag = f.stun = 0;
        f.hopWindow = f.followPounce = f.landTime = f.skidTime = 0;
        f.shield = f.cutJump = false;
      }
      owner.vx = 0;
      if (target.ground >= 0) target.jumps = 1;
      target.vx = target.vy = target.coyote = target.drop = 0;
      target.ground = -1;
      target.ledge = null;
      target.face = -face;
      if (this.edgePractice?.timeCatch && owner.index === 0)
        this.finishEdgePractice(this.edgePractice.guardFrames ? 'timedGrab' : 'intercepted', attack.moveId);
      this.emit('grabCatch', {
        f: owner,
        target,
        face,
        point: { ...grip.anchor },
        moveId: grip.grabId,
        grabStyle: attack.grabStyle,
      });
      if (this.shieldPractice?.pattern === 'yourHop' && owner.index === 0)
        this.finishShieldPractice(attack.landingGrab ? 'bufferedGrab' : attack.airGrab ? 'airGrab' : 'landGrab');
      else if (this.shieldPractice?.phase === 'counter' && owner.index === 0)
        this.finishShieldPractice(landingFrames > 0 ? 'punish' : 'lateCatch', landingFrames);
      else this.finishShieldPractice(target.index === 0 ? 'grabbed' : this.shieldPractice?.pattern === 'poke' ? 'caughtGuard' : 'interrupted');
      this.finishAirPractice(target.index === 0 ? 'hit' : 'interrupted');
      this.finishRollPractice(target.index === 0 ? 'caught' : 'counter');
    }
    clearGrapple() {
      const grip = this.grapple;
      const owner = this.dogs[grip.owner],
        target = this.dogs[grip.target];
      this.grapple = owner.grip = target.grip = null;
      return { owner, target };
    }
    breakGrapple(escaped) {
      const grip = this.grapple;
      const { owner, target } = this.clearGrapple();
      owner.attack = owner.command = null;
      target.regrabLock = 0.4;
      target.ledgeLock = 0.16;
      target.vx = (Math.sign(target.x - owner.x) || grip.face) * (escaped ? 155 : 54);
      target.vy = escaped ? -150 : -55;
      if (escaped) {
        owner.stun = 0.18;
        target.invuln = 0.2;
        this.emit('grabEscape', { f: target, owner, face: grip.face, point: { ...grip.anchor } });
        this.finishGripPractice(grip,false);
      }
    }
    positionCaptive(grip, from, to, progress) {
      const owner = this.dogs[grip.owner],
        target = this.dogs[grip.target];
      const t = clamp(progress, 0, 1);
      const ease = t * t * (3 - 2 * t);
      const x = from[0] + (to[0] - from[0]) * ease,
        y = from[1] + (to[1] - from[1]) * ease;
      grip.anchor.x = owner.x + x * grip.face;
      grip.anchor.y = owner.y + y;
      grip.high = y < -70;
      target.x = grip.anchor.x;
      target.y = grip.anchor.y + target.stats.height * 0.52;
      target.face = (x < 0 ? 1 : -1) * grip.face;
    }
    advancePummel(grip, owner, target, rest) {
      const attack = owner.attack;
      attack.time = grip.time;
      const activeEnd = attack.start + attack.active;
      const pressure =
        attack.time < attack.start
          ? attack.time / attack.start
          : 1 - clamp((attack.time - activeEnd) / (attack.end - activeEnd), 0, 1);
      this.positionCaptive(grip, rest, attack.contact, pressure);
      if (!attack.connected && attack.time + 1e-8 >= attack.start) {
        attack.connected = true;
        const power = moveFreshness(owner, attack.moveId, attack);
        rememberMove(owner, attack.moveId, attack, power, false);
        const damage = this.dealDamage(target, scaledDamage(attack.dmg, power), grip.comboLink, attack.moveId);
        this.comboContact(target, 'pummel', attack.moveId, damage);
        this.sampleFreshness(owner, attack, attack.moveId, power, damage, 0);
        grip.comboLink = true;
        grip.pummelCount++;
        this.hitStop = Math.max(this.hitStop, attack.hitPause / 60);
        this.emit('pummelHit', {
          f: owner,
          target,
          moveId: attack.moveId,
          face: grip.face,
          point: { ...grip.anchor },
          count: grip.pummelCount,
          damage,
          power,
        });
        if (this.escapePractice?.gripDrill && this.escapePractice.phase === 'gripped')
          this.emit('escapeCue',{ f:this.dogs[0],phase:'pummel',count:grip.pummelCount });
      }
      // A throw can take over after contact. Start its windup from the captive's actual position.
      if (grip.pending && grip.pending !== 'pummel' && attack.time + 1e-8 >= activeEnd)
        grip.throwFrom = [(grip.anchor.x - owner.x) * grip.face, grip.anchor.y - owner.y];
      else if (attack.time + 1e-8 < attack.end) return;
      owner.attack = null;
      grip.phase = 'hold';
      grip.time = 0;
    }
    moveShoulderCarry(grip, owner, dt) {
      const spec = owner.kit.shoulderCarry, carry = grip.carry;
      const walking = grip.phase === 'hold' && !grip.pending;
      const axis = walking ? owner.prev.x : 0;
      const ground = this.terrain[owner.ground];
      const speed = ground ? spec.walk : spec.air;
      owner.vx = toward(owner.vx, axis * speed, (ground ? 1450 : 820) * dt);
      if (walking && carry.hop && ground) {
        owner.ground = -1;
        owner.jumps = 1;
        owner.vy = -spec.hop;
        this.emit('jump',{f:owner});
      }
      if (grip.phase !== 'hoist') carry.hop = false;
      const nextX = owner.x + owner.vx * dt;
      const wall = owner.ground < 0 && this.wallContact(owner,owner.x,owner.y,nextX,owner.y);
      if (wall) owner.vx = 0;
      owner.x = wall ? wall.x : nextX;
      if (owner.ground >= 0 && (owner.x < ground.x1-5 || owner.x > ground.x2+5)) {
        owner.ground = -1;
        owner.jumps = 1;
      }
      carry.steps += Math.abs(owner.vx)*dt;
      const drill = this.escapePractice;
      if (drill?.spacing === 'carry' && walking && !drill.atMark && owner.x >= drill.mark) {
        drill.atMark = true;
        this.emit('escapeCue',{f:owner,phase:'atMark'});
      }
    }
    advanceGrapple(dt) {
      const grip = this.grapple;
      const owner = this.dogs[grip.owner],
        target = this.dogs[grip.target];
      const grab = grabs[grip.grabId];
      const oldX = owner.x;
      const rest = grip.carry ? owner.kit.shoulderCarry.rest : grab.grip;
      grip.time += dt;
      grip.elapsed += dt;
      grip.struggleFlash = Math.max(0, grip.struggleFlash - dt);
      owner.invuln = Math.max(0, owner.invuln - dt);
      owner.drop = Math.max(0, owner.drop - dt);
      if (grip.carry) this.moveShoulderCarry(grip,owner,dt);
      // An airborne catch still falls, with both dogs riding the same platform on landing.
      if (owner.ground < 0) {
        const oldY = owner.y;
        owner.vy = Math.min(970, owner.vy + 1540 * owner.kit.gravity * dt);
        owner.y += owner.vy * dt;
        const landing = owner.vy >= 0 ? this.landingSurface(owner, oldY, oldX, dt) : -1;
        if (landing >= 0) {
          owner.ground = landing;
          owner.y = this.terrain[landing].y;
          owner.vy = 0;
          restoreAir(owner);
        }
      }
      if (grip.phase === 'reel') {
        this.positionCaptive(grip, grip.from, grab.grip, grip.time / grip.reelTime);
        if (grip.time + 1e-8 < grip.reelTime) return;
        grip.phase = 'hold';
        grip.time = 0;
      }
      if (grip.phase !== 'throw') {
        grip.remaining -= dt;
        if (grip.remaining <= 0) return this.breakGrapple(true);
      }
      if (grip.phase === 'hoist') {
        this.positionCaptive(grip,grip.carry.from,rest,grip.time/owner.kit.shoulderCarry.lift);
        if (grip.time + 1e-8 < owner.kit.shoulderCarry.lift) return;
        grip.phase = 'hold';
        grip.time = 0;
      }
      if (grip.phase === 'pummel') {
        this.advancePummel(grip, owner, target, rest);
        if (grip.phase === 'pummel') return;
      }
      if (grip.phase === 'hold') {
        if (!grip.throwFrom) this.positionCaptive(grip, rest, rest, 1);
        if (!grip.pending) return;
        if (grip.pending === 'hoist') {
          grip.carry = { from:grip.throwFrom || grab.grip, steps:0, hop:false };
          grip.throwFrom = null;
          grip.phase = 'hoist';
          grip.pending = null;
          grip.time = 0;
          owner.lastMove = 'Shoulder Carry';
          this.emit('shoulderCarry',{f:owner,target,point:{...grip.anchor}});
          if (this.escapePractice?.spacing === 'carry') this.emit('escapeCue',{f:owner,phase:'carrying'});
          return;
        }
        if (grip.pending === 'pummel') {
          grip.phase = 'pummel';
          grip.time = 0;
          grip.pending = null;
          beginAttack(owner, 'pummel', 0, 0, owner.kit.pummel);
          const attack = owner.attack;
          attack.pummel = true;
          attack.contact = [rest[0] + attack.recoil[0], rest[1] + attack.recoil[1]];
          return;
        }
        grip.phase = 'throw';
        grip.time = 0;
        grip.direction = grip.pending;
        grip.throwId = owner.kit.throws[grip.direction];
        beginAttack(
          owner,
          'throw',
          grip.direction === 'up' ? -1 : grip.direction === 'down' ? 1 : 0,
          0,
          grip.throwId,
        );
        owner.attack.throwSide = grip.direction;
      }
      const attack = owner.attack;
      attack.time = grip.time;
      const t = attack.time / attack.start;
      if (t < 0.5) this.positionCaptive(grip, grip.throwFrom || rest, attack.via, t * 2);
      else this.positionCaptive(grip, attack.via, attack.release, t * 2 - 1);
      if (attack.time + 1e-8 < attack.start) return;
      this.clearGrapple();
      const face = grip.direction === 'back' || attack.reverseLaunch ? -grip.face : grip.face;
      const point = { ...grip.anchor };
      attack.thrown = true;
      attack.preserveCombo = grip.comboLink;
      attack.connected = this.hit(
        target,
        owner,
        attack.dmg,
        attack.base,
        attack.growth,
        attack.aim,
        'throw',
        face,
        point,
        attack,
        grip.throwId,
        attack,
      );
      if (attack.connected && attack.bounce)
        target.throwBounce = { ...attack.bounce, owner: owner.index, moveId: grip.throwId };
      target.regrabLock = 0.35;
      if (attack.connected) this.finishGripPractice(grip,true);
      this.emit('throwRelease', {
        f: owner,
        target,
        face,
        direction: grip.direction,
        moveId: grip.throwId,
        point,
      });
    }
    specialTurn(f, turn) {
      const d = this.spacingPractice;
      if (isReversalPractice(d) && d.phase === 'active' && f.index === 0) d.turn = turn;
      this.emit('specialTurn', { f, moveId: f.attack.moveId, turn, face: f.face, vx: f.vx,
        point: { x: f.x, y: f.y - f.stats.height * 0.45 } });
    }
    special(f, command) {
      const side = ['forward', 'back'].includes(command.airSide) ? 'side' : command.airSide;
      const id = f.kit.specials[side];
      const air = f.ground < 0;
      const secondHop = id === 'pipHopper' && f.hopWindow > 0 && f.usedUp;
      const follow = id === 'pipPounce' && f.followPounce > 0;
      if ((side === 'up' && f.usedUp && !secondHop) || (side === 'side' && air && f.usedAir && !follow))
        return;
      const names = {
        pipPounce: 'pounce',
        brisketCharge: 'shoulder',
        noodleTug: 'rope',
        cloverRound: 'disc',
      };
      beginAttack(
        f,
        side === 'up' ? 'recover' : names[id] || 'special',
        side === 'up' ? -1 : side === 'down' ? 1 : 0,
        0,
        id,
      );
      const a = f.attack;
      a.specialSide = side;
      const retry = this.airPractice;
      if (retry?.pattern === 'interrupted' && retry.phase === 'clipped' && f.index === 0 && side === 'up') {
        retry.phase = 'return';
        retry.recast = true;
        this.emit('airCue',{f,pattern:retry.pattern,phase:'return',moveId:id});
      }
      if (command.fromJumpSquat) a.fromJumpSquat = true;
      a.released = !!command.released;
      if (air && side === 'neutral') {
        a.airNeutral = true;
        a.reverseQueued = !!command.reverseQueued;
        if (command.turnTo && command.turnTo !== f.face) {
          f.face = command.turnTo;
          a.turned = true;
          this.specialTurn(f, 'turnaround');
        }
      }
      if (side === 'side' && air) f.usedAir = true;
      if (side === 'up') {
        f.usedUp = true;
        f.jumps = 0;
        f.coyote = 0;
        f.cutJump = false;
        f.followPounce = 0;
      }
      switch (id) {
        case 'pipPounce':
          f.cutJump = false;
          a.secondPounce = follow;
          if (!air) f.jumps = 1;
          f.followPounce = 0;
          f.usedAir = a.motionLocked = true;
          f.ground = -1;
          f.vy = follow ? -283 : -240;
          f.vx = f.face * 550;
          break;
        case 'pipHopper':
          a.secondHop = secondHop;
          a.motionLocked = true;
          f.hopWindow = secondHop ? 0 : 0.74;
          f.ground = -1;
          f.vy = secondHop ? -555 : -805;
          f.vx = command.face ? command.face * (secondHop ? 415 : 280) : clamp(f.vx * 0.4, -110, 110);
          break;
        case 'pipSlide':
          a.motionLocked = true;
          a.diving = air;
          a.diveTime = 0;
          f.cutJump = false;
          break;
        case 'brisketCharge':
          a.motionLocked = true;
          break;
        case 'brisketCannon':
          a.charging = a.motionLocked = true;
          a.chargeTime = 0;
          f.vx = f.vy = 0;
          break;
        case 'noodleLasso': {
          const edge = air && !f.ledgeLock && this.nearestLedge(f, 188, -35, 165);
          a.anchor = edge && Math.hypot(edge.x - f.x, edge.y - f.y) <= 220 ? edge : null;
          f.ground = -1;
          a.motionLocked = true;
          if (a.anchor) {
            f.face = a.anchor.left ? 1 : -1;
            f.vx = f.vy = 0;
          } else {
            f.vy = -510;
            f.vx = command.face * 120;
          }
          break;
        }
        case 'cloverChase': {
          a.disc = null;
          let nearest = 275;
          for (const disc of this.projectiles) {
            if (
              disc.owner !== f.index ||
              disc.type !== 'return' ||
              disc.caught ||
              (disc.x - f.x) * f.face <= 0
            )
              continue;
            const distance = Math.hypot(disc.x - f.x, disc.y - (f.y - 41));
            if (distance < nearest) {
              a.disc = disc;
              nearest = distance;
            }
          }
          if (a.disc) {
            a.active = 0.5;
            a.end = a.start + a.active + 0.14;
          }
          a.motionLocked = true;
          f.vx = f.face * 360;
          break;
        }
        case 'cloverSail':
          f.ground = -1;
          a.motionLocked = true;
          f.vy = -655;
          f.vx = (command.face || f.face) * 205;
          break;
      }
      if (a.motionLocked || side === 'up') f.fastFall = false;
      this.emit(side === 'up' && id !== 'brisketCannon' ? 'recover' : 'special', { f, moveId: id });
    }
    advanceSpecial(f, a, input, dt) {
      switch (a.moveId) {
        case 'pipSlide':
          if (a.diving) {
            a.diveTime += dt;
            a.time = 0;
            f.vx = f.face * 135;
            f.vy = Math.max(560, f.vy);
            if (a.diveTime > 0.55) f.attack = null;
          } else f.vx = a.time < a.start ? f.face * 495 : toward(f.vx, 0, 2700 * dt);
          break;
        case 'brisketCharge':
          if (a.time >= a.start && a.time < a.start + a.active) f.vx = f.face * 625;
          else f.vx = toward(f.vx, 0, 1850 * dt);
          break;
        case 'brisketCannon':
          if (a.charging) {
            a.chargeTime += dt;
            a.power = clamp(a.chargeTime / 0.42, 0, 1);
            a.time = 0;
            if (a.chargeTime < 0.075 || (!a.released && a.power < 1)) return true;
            a.charging = false;
            a.time = a.start;
            f.ground = -1;
            f.vy = -(660 + 420 * a.power);
            f.vx = input.x * 160;
            this.emit('recover', { f, moveId: a.moveId });
          } else if (a.time > a.start + a.active) a.motionLocked = false;
          break;
        case 'noodleSling':
          if (a.reeling) {
            const rival = a.reelTarget;
            const dx = rival.x - f.face * (f.stats.width + rival.stats.width - 4) - f.x;
            f.vx = clamp(dx / dt, -700, 700);
            if (Math.abs(dx) < 5 || a.time >= a.reelEnd) a.reeling = a.motionLocked = false;
          }
          break;
        case 'noodleLasso':
          if (a.anchor) {
            if (a.time + 1e-8 < a.start) return true;
            const dx = a.anchor.x + (a.anchor.left ? -13 : 13) - f.x;
            const dy = a.anchor.y + 46 - f.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= 615 * dt) this.ledgeClaims.push({ f, edge: a.anchor });
            else {
              f.x += (dx / distance) * 615 * dt;
              f.y += (dy / distance) * 615 * dt;
            }
            return true;
          }
          if (a.time > a.start + a.active) a.motionLocked = false;
          break;
        case 'cloverChase':
          if (a.time < a.start) break;
          if (a.disc && (a.disc.owner !== f.index || !this.projectiles.includes(a.disc))) {
            a.disc = null;
            a.time = Math.max(a.time, a.start + a.active);
          }
          if (a.time < a.start + a.active) {
            if (a.disc) {
              const dx = a.disc.x - f.x,
                dy = a.disc.y - (f.y - 41),
                dist = Math.hypot(dx, dy) || 1;
              if (dist < 31) {
                a.disc.caught = true;
                a.disc = null;
                a.time = a.start + a.active;
                f.vx *= 0.42;
                this.emit('catch', { f });
              } else {
                f.vx = (dx / dist) * 735;
                if (f.ground >= 0 && dy < -14) {
                  f.ground = -1;
                  f.jumps = 1;
                  f.usedAir = true;
                }
                if (f.ground < 0) {
                  f.cutJump = false;
                  f.vy = clamp((dy / dist) * 695, -355, 355);
                }
              }
            } else f.vx = f.face * 480;
          } else f.vx = toward(f.vx, 0, 1700 * dt);
          break;
        case 'cloverSail':
          if (a.released && !a.folded && a.time >= 0.16) {
            a.folded = true;
            a.end = Math.min(a.end, a.time + 0.1);
            f.vy = Math.max(42, f.vy);
          }
          if (!a.folded) {
            const steer = Math.abs(input.x) > 0.16 ? input.x : f.face * 0.56;
            f.vx = toward(f.vx, steer * 410, 1280 * dt);
            if (Math.abs(f.vx) > 70) f.face = Math.sign(f.vx);
            f.vy = Math.min(f.vy, 32);
          }
          break;
      }
      return false;
    }
    throwItem(f, a) {
      const type = a.projectile;
      const d = {
        type,
        moveId: a.moveId,
        owner: f.index,
        age: 0,
        x: f.x + f.face * (type === 'snare' ? 53 : 32),
        y: f.y - (type === 'snare' ? 10 : type === 'skip' ? 27 : 43),
        vx: f.face * (type === 'snare' ? 48 : type === 'skip' ? 448 : 580),
        vy: type === 'return' ? -48 : 110,
        hit: [false, false],
        back: false,
        platform: -1,
        bounces: 0,
        armedIn: 0.15,
      };
      if (type === 'snare')
        this.projectiles = this.projectiles.filter((item) => item.owner !== f.index || item.type !== 'snare');
      if (type === 'drive') {
        d.x = f.x + f.face * 37;
        d.y = f.y - 39;
        d.vx = f.face * (560 + 260 * a.power);
        d.vy = 0;
        d.power = a.power;
        d.rangeLeft = 215 + 150 * a.power;
      }
      this.projectiles.push(d);
      const drill = this.footworkPractice;
      if (drill?.pattern === 'crawl' && drill.phase !== 'done' && f.index === 1)
        this.emit('footworkCue',{f,phase:type === 'return' ? 'castHigh' : 'castLow'});
      if (drill?.discRole && type === 'return' && drill.phase !== 'done') {
        drill.phase = 'swing';
        this.emit('footworkCue',{f,phase:'cast'});
      }
      this.emit(type === 'snare' ? 'ropeCast' : 'disc', { f, moveId: a.moveId });
    }
    attackArea(f) {
      const a = f.attack;
      if (a.box) {
        const [x, y, rx, ry] = a.landed && a.plunge ? [0, -17, 63, 22] : attackWindow(a).box || a.box;
        const spread = a.shockwave ? 0.4 + 0.6 * clamp((a.time - a.start) / (a.active - 1 / 60), 0, 1) : 1;
        return { x: f.x + f.face * x, y: f.y + y, rx: rx * spread, ry };
      }
      const reach = f.stats.reach + a.reach;
      if (a.aim === -1) return { x: f.x + f.face * 7, y: f.y - f.stats.height - 13, rx: 42, ry: 47 };
      return {
        x: f.x + f.face * reach * 0.57,
        y: f.y - (a.aim === 1 ? 18 : 39),
        rx: reach * 0.56,
        ry: a.name === 'rope' ? 18 : 29,
      };
    }
    cpuControlled(f) {
      return (this.mode === 'solo' || this.warmupPartner==='spar') && f.index === 1;
    }
    opponents(f) {
      return [this.dogs[1 - f.index]];
    }
    activeSwing(f) {
      const attack = f.attack;
      if (!attack || f.impactLag > 1e-8 || attack.pummel || attack.throwSide || attack.projectile ||
          attack.anchor || attack.charging || attack.diving || (attack.moveId === 'brisketBrace' && !attack.riposte))
        return null;
      const beat = attackWindow(attack);
      if (attack.time + 1e-8 < beat.start || attack.time >= beat.start + beat.active - 1e-8) return null;
      return { f, attack, beat, area: this.attackArea(f), beatIndex: attack.flurryBeat ?? (beat === attack.second ? 1 : 0) };
    }
    clashGroundSwings(active) {
      const ground = active.filter(s => s.f.ground >= 0 && !s.attack.airSide && canClash(s));
      const recoil = new Map();
      for (let i = 0; i < ground.length; i++) {
        const a = ground[i], rivals = this.opponents(a.f);
        for (const b of ground.slice(i + 1)) {
          if (!rivals.includes(b.f) || a.attack.hitTargets?.get(b.f) === a.beatIndex ||
              b.attack.hitTargets?.get(a.f) === b.beatIndex) continue;
          const point = overlapPoint(a.area, b.area);
          if (!point) continue;
          const da = clashDamage(a, point), db = clashDamage(b, point);
          const direction = Math.sign(b.f.x - a.f.x) || a.f.face;
          const winner = da >= db + clashMargin ? a : db >= da + clashMargin ? b : null;
          if (winner !== a) recoil.set(a, [da, -direction]);
          if (winner !== b) recoil.set(b, [db, direction]);
          this.clashContact(a.f, b.f, point, winner?.f);
        }
      }
      for (const [swing, [damage, away]] of recoil) recoilFromClash(swing, damage, away);
    }
    clashContact(a, b, point, winner, projectile = false) {
      this.hitStop = Math.max(this.hitStop, (winner ? 2 : 3) / 60);
      const face = winner ? Math.sign((winner === a ? b : a).x - winner.x) || winner.face : a.face;
      this.emit('attackClash', { f: a, target: b, point, winner: winner?.index ?? null, face, projectile });
      const drill = this.footworkPractice;
      if (drill?.phase !== 'swing') return;
      if (projectile && drill.pattern === 'disc') this.finishFootwork(winner === b ? 'overpowered' : 'batted');
      else if (drill.pattern === 'match' || drill.pattern === 'power')
        this.finishFootwork(winner ? winner.index === 0 ? 'brokeThrough' : 'overpowered' : 'matched');
    }
    resolveMelee(damageAtContact = this.dogs.map(f => f.damage)) {
      // Collect both active hitboxes before either hit can interrupt the other fighter.
      const hits = [],
        catches = [],
        swats = [];
      const active = this.dogs.map(f => this.activeSwing(f)).filter(Boolean);
      if (active.length > 1) this.clashGroundSwings(active);
      for (const { f, attack, beat, beatIndex, area } of active) {
        if (f.attack !== attack) continue;
        for (const rival of this.opponents(f)) {
          const height = bodyHeight(rival);
          const overlaps =
            Math.abs(rival.x - area.x) <= area.rx + rival.stats.width &&
            Math.abs(rival.y - height * 0.52 - area.y) <= area.ry + height * 0.4;
          if (this.shieldPractice) this.recordPracticeDodge(rival, overlaps);
          if (this.launchPractice?.pattern==='breakaway' && rival.index===0 && rival.airDodge && rival.invuln>0 && overlaps)
            this.launchPractice.evaded=true;
          const edge = this.edgePractice;
          if (edge?.timeCatch && edge.phase === 'hanging' && f.index === 0 && rival.ledge && overlaps && rival.invuln > 0)
            edge.earlyFrames = Math.ceil(rival.invuln * 60);
          if (
            this.rollPractice?.phase === 'active' &&
            rival.index === 0 &&
            rival.floorAction?.type === 'ledgeRoll' &&
            rival.invuln > 0 &&
            overlaps
          )
            this.rollPractice.evaded = true;
          if (
            this.airPractice?.phase === 'swing' &&
            rival.index === 0 &&
            rival.airDodge &&
            rival.invuln > 0 &&
            overlaps
          )
            this.airPractice.evaded = rival.airDodge.type;
          if (attack.grabAttempt) {
            const stock = this.stockPractice;
            if (stock?.phase === 'active' && rival.index === stock.slot) {
              stock.live = true;
              if (overlaps && (rival.stockLift || rival.stockGuard)) stock.covered = true;
            }
            const drill = this.shieldPractice;
            const approach = this.footworkPractice;
            if (f.index === 0 && approach?.boost && approach.phase !== 'done') {
              const remaining = Math.max(0,Math.abs(rival.x-area.x)-area.rx-rival.stats.width);
              approach.closestGap = Math.min(approach.closestGap ?? Infinity,remaining);
            }
            if (f.index === 0 && drill?.phase === 'counter') {
              const gap = Math.max(0, Math.abs(rival.x - area.x) - area.rx - rival.stats.width);
              drill.closestGap = Math.min(drill.closestGap ?? Infinity, gap);
            }
            if (
              !this.grapple &&
              !protectionTime(rival) &&
              (!rival.dodge || rival.airDodge) &&
              !rival.regrabLock &&
              rival.floorAction?.type !== 'downed' &&
              (attack.grabStyle === 'standing' || (rival.x - f.x) * f.face >= 0) &&
              overlaps
            )
              catches.push({ f, rival, attack });
            continue;
          }
          const rear = beat.rear || attack.airSide === 'back';
          const bothSides =
            beat.around || attack.around || attack.airSide === 'neutral' || (attack.plunge && attack.landed);
          const hitFacing = (x) => {
            const face = bothSides ? Math.sign(x - f.x) || f.face : rear ? -f.face : f.face;
            return attack.reverse ? -face : face;
          };
          if (
            !attack.ballHit &&
            this.ball &&
            Math.abs(this.ball.x - area.x) < area.rx + 14 &&
            Math.abs(this.ball.y - area.y) < area.ry + 14
          ) {
            attack.ballHit = true;
            swats.push({
              f,
              aim: attack.aim,
              face: hitFacing(this.ball.x),
              distance: Math.hypot(this.ball.x - area.x, this.ball.y - area.y),
            });
          }
          if (attack.hitTargets?.get(rival) === beatIndex || protectionTime(rival)) continue;
          if (attack.dashAttack && (rival.x - f.x) * f.face < 0) continue;
          if (attack.edge && (rival.x - attack.edge.x) * f.face < 0) continue;
          if (!overlaps && (!rival.shield && !canParry(rival) || attack.commandGrab)) continue;
          hits.push({
            f, rival, attack, beat, beatIndex, area,
            face: hitFacing(rival.x),
            bodySweet: overlaps && sweetSpotAt(f, beat, rival.x, rival.y - height * 0.52),
            bodyPoint: overlaps && {
              x: clamp(area.x, rival.x - rival.stats.width, rival.x + rival.stats.width),
              y: clamp(area.y, rival.y - height * 0.92, rival.y - height * 0.12),
            },
          });
        }
      }
      if (swats.length) {
        const [first, second] = swats;
        const winner =
          second &&
          (second.distance < first.distance || (second.distance === first.distance && this.random() < 0.5))
            ? second
            : first;
        this.swat(winner.f, winner.aim, winner.face);
      }
      const connectedHits = [];
      for (const hit of hits) {
        const { f, rival, attack, beat, face } = hit;
        // Other attackers may have shrunk or broken this shield on the same tick.
        const guard = !attack.commandGrab && shieldContact(rival, hit.area);
        const point = guard || hit.bodyPoint;
        if (!point) continue;
        (attack.hitTargets ??= new Map()).set(rival, hit.beatIndex);
        attack.hitBeat = hit.beatIndex;
        const sweet = guard ? sweetSpotAt(f, beat, guard.x, guard.y) : hit.bodySweet;
        const strength = strikeStrength(attack);
        const launch = (beat.setupHit ? 1 : strength) * (sweet?.launch || 1);
        attack.connected = this.hit(
          rival,
          f,
          (beat.dmg + (sweet?.bonus || 0)) * strength,
          beat.base * launch,
          beat.growth * launch,
          attack.aim,
          attack.name,
          face,
          point,
          attack.moveId ? beat : null,
          attack.moveId,
          attack,
          !!guard,
          damageAtContact[f.index],
          sweet,
        );
        if (attack.connected) connectedHits.push(hit);
        if (sweet && attack.connected) this.emit('sweetSpot', { f, point, face, moveId: attack.moveId });
        if (attack.connected && attack.name === 'rope') {
          rival.vx = -face * Math.max(185, Math.abs(rival.vx) * 0.8);
          if (attack.sample) attack.sample.launch = Math.hypot(rival.vx, rival.vy);
        }
        if (attack.connected && attack.moveId === 'noodleSling') {
          attack.reeling = attack.motionLocked = true;
          attack.reelTarget = rival;
          attack.reelEnd = attack.time + 0.17;
        }
      }
      for (const { f, attack } of connectedHits) {
        attack.connected = true;
        if (f.attack !== attack) continue;
        if (attack.pogo && !attack.landed && !f.usedPogo) {
          f.usedPogo = true;
          f.fastFall = false;
          f.cutJump = false;
          f.vy = -465;
          f.reboundPose = attack.moveId;
        } else if (attack.name === 'pounce') {
          f.vy = -300;
          f.vx *= 0.48;
          f.followPounce = attack.secondPounce ? 0 : 0.72;
          f.reboundPose = 'pipPounce';
        } else continue;
        f.reboundTime = 0.14;
        f.attack = null;
      }
      if (!catches.length) return;
      // One pair of paws can seize one opponent. Choose the nearest reachable body.
      const nearest = new Map();
      for (const entry of catches) {
        const { f, rival, attack } = entry, prev = nearest.get(f);
        if (f.attack === attack && (!prev || Math.abs(rival.x - f.x) < Math.abs(prev.rival.x - f.x)))
          nearest.set(f, entry);
      }
      const ready = [...nearest.values()];
      if (ready.length === 2) {
        for (const { f } of ready) {
          f.attack = f.command = null;
          f.stun = 0.18;
          f.regrabLock = 0.28;
          f.vx = -f.face * 155;
        }
        const [a, b] = this.dogs;
        this.emit('grabClash', { f: a, target: b, point: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 39 } });
      } else if (ready.length === 1) {
        const { f, rival, attack } = ready[0];
        this.catchRival(f, rival, attack);
      }
    }
    breakShield(f) {
      f.shield = false;
      f.impactLag = f.shieldStun = f.shieldGrabWindow = 0;
      f.command = null;
      f.jumpBuffer = f.guardBuffer = 0;
      f.shieldDrop = f.parryFlash = 0;
      f.guardIntent = '';
      f.reaction = null;
      f.shieldAxis = '';
      f.coyote = f.chainWindow = f.takeoffWindow = f.waveSlide = f.landingLag = 0;
      f.heldRecoveryJump = f.queuedShortHop = f.cutJump = f.fastFall = f.crouch = f.crawling = f.parryEligible = false;
      f.guardAim = f.dropPrep = f.run = f.jumpSquat = null;
      f.shieldHP = 0;
      f.stun = 1/60;
      f.y -= 1;
      f.ground = -1;
      f.jumps = 1;
      f.vx = 0;
      f.vy = -485;
      f.shieldBreak = { phase:'pop', time:0, sector:shiftSector(f.prev), struggles:0 };
      if (this.matchCard) this.matchCard.players[f.index].shieldBreaks++;
      cancelCharge(f);
      this.emit('break', { f });
      this.guardBreakCue(f, 'pop');
    }
    advanceShieldBreak(f, dt) {
      const state = f.shieldBreak;
      state.time += dt;
      if (state.phase === 'pop') {
        const oldY = f.y;
        f.vy = fallVelocity(f, f.vy, dt, false);
        f.y += f.vy * dt;
        const ground = f.vy >= 0 ? this.landingSurface(f, oldY, f.x, dt) : -1;
        if (ground < 0) return;
        f.ground = ground;
        f.y = this.terrain[ground].y;
        f.vy = 0;
        restoreAir(f);
        f.shieldHP = .65;
        f.stun = (150 - Math.min(60, Math.floor(f.damage * .4))) / 60;
        state.phase = 'dizzy';
        state.time = 0;
        this.emit('dizzyLand', {f, point:{x:f.x,y:f.y}});
        this.guardBreakCue(f, 'dizzy');
      } else {
        f.y = this.terrain[f.ground].y;
        f.stun = Math.max(0, f.stun - dt);
        if (f.stun <= 1e-8) this.endShieldBreak(f, 'awake');
      }
    }
    endShieldBreak(f, outcome, moveId) {
      const state = f.shieldBreak;
      f.shieldBreak = null;
      f.stun = 0;
      this.guardBreakCue(f, outcome, Math.round(state.time * 60), state.struggles, moveId);
    }
    guardBreakCue(f, phase, frames = 0, struggles = 0, moveId) {
      const d = this.shieldPractice;
      if (!d || d.brokenSlot !== f.index || d.phase === 'done') return;
      d.phase = phase;
      if (!['pop','dizzy'].includes(phase)) {
        d.outcome = phase;
        d.frames = frames;
        d.struggles = struggles;
        // A defender who wakes before the swing can still see and answer the charge.
        if (phase !== 'awake' || d.brokenSlot === 1) d.phase = 'done';
      }
      this.emit('shieldCue', { f, phase, pattern:d.pattern, frames, struggles, moveId });
    }
    dealDamage(target, damage, preserveCombo, hitId) {
      if (damage > 0) {
        target.shortHopFlight = false;
        target.ledgeProtectionReady = true;
        target.ledgeCatches = 0;
      }
      const applied = Math.min(damage, 999 - target.damage);
      if (this.matchCard && hitId && damage > 0) {
        const attacker = this.matchCard.players[1 - target.index];
        attacker.hits++;
        attacker.damage += applied;
        if(this.relayTeams){
          const seat=1-target.index,member=this.relayTeams[seat].indexOf(this.dogs[seat].kind);
          this.matchCard.relayDamage[seat][member]+=applied;
        }
        this.matchCard.players[target.index].lastHit = {id:hitId, frame:this.matchFrames};
      }
      if (this.mode === 'training' && (target.index === 1 || this.trainingPartner)) {
        if ((target.stun <= 0 && !preserveCombo) || (this.trainingPartner && this.lastCombo.target !== target.index))
          this.lastCombo = { hits: 0, damage: 0 };
        if (this.trainingPartner) this.lastCombo.target = target.index;
        this.lastCombo.hits++;
        this.lastCombo.damage += applied;
      }
      target.damage += applied;
      return applied;
    }
    parry(target, owner, face, point, projectile) {
      if (this.matchCard) this.matchCard.players[target.index].parries++;
      if (this.chasePractice?.bait && this.chasePractice.phase === 'getup' && target.index === 0 && owner.attack?.floorAttack) {
        this.chasePractice.guarded = true;
        this.emit('chaseCue', {f:owner, phase:'sweepParry'});
      }
      const brace = projectile ? -face : Math.sign(owner.x - target.x) || -face;
      target.shieldDrop = 0;
      target.shieldGrabWindow = 0;
      target.parryFlash = 12 / 60;
      target.parryFace = brace || target.face;
      target.lastMove = 'Parry';
      if (owner.attack?.moveId === 'brisketHaymaker' && this.footworkPractice?.pattern === 'armorGrab' &&
          this.footworkPractice.phase !== 'done') this.finishFootwork('parriedPunch');
      if (this.edgePractice?.corner && target.index === 0) this.finishEdgePractice('parriedCorner');
      if (this.spacingPractice?.pattern === 'cancel' && this.spacingPractice.sent && target.index === 0)
        this.finishSpacingPractice('parried');
      if (this.spacingPractice?.pattern === 'fastfall' && this.spacingPractice.phase === 'active' &&
          target.index === 0 && owner.attack?.moveId === 'pipSpin') {
        this.spacingPractice.parried = true;
        this.emit('apexParry',{f:target});
      }
      if (!projectile) {
        if (this.climbPractice?.role === 'patience' && target.index === 0)
          this.finishClimbPractice('parriedPunch');
        if (this.climbPractice?.role === 'coverRise' && target.index === 0 && owner.attack?.airSide)
          this.finishClimbPractice('parriedRise');
        owner.attack = owner.floorAction = owner.run = owner.command = owner.reaction = null;
        owner.fastFall = false;
        owner.jumpBuffer = owner.guardBuffer = owner.chainWindow = owner.hopWindow = owner.reboundTime = 0;
        owner.vx *= 0.25;
        owner.stun = Math.max(owner.stun, 14 / 60);
      }
      this.hitStop = Math.max(this.hitStop, 5 / 60);
      this.emit('parry', {
        f: target,
        owner,
        projectile,
        face: target.parryFace,
        point: point || {
          x: target.x + target.parryFace * target.stats.width,
          y: target.y - target.stats.height / 2,
        },
      });
      if (target.index === 0) this.finishShieldPractice('parry');
      if (target.index === 0 && this.footworkPractice?.pattern === 'dashShield' && this.footworkPractice.phase === 'atMark')
        this.finishFootwork('parriedApproach');
      if (this.escapePractice?.spacing === 'counter' && this.escapePractice.phase === 'swing' && target.index === 0)
        this.finishEscapePractice('parriedKick');
      if (target.index === 0 && (this.platformPractice?.defend || this.platformPractice?.pattern === 'shield-drop'))
        this.finishPlatformPractice('parried');
    }
    block(target, owner, damage, name, face, point, projectile, moveId, use, power) {
      if (this.matchCard) this.matchCard.players[target.index].blocks++;
      if (this.chasePractice?.bait && this.chasePractice.phase === 'getup' && target.index === 0 && moves[moveId]?.floorAttack) {
        this.chasePractice.guarded = true;
        this.emit('chaseCue', {f:owner, phase:'sweepBlock'});
      }
      target.brakingShield = false;
      const approach = this.footworkPractice;
      if (approach?.boost && approach.phase !== 'done' && target.index === 1 && use?.dashAttack)
        this.finishFootwork('guardedDash');
      if (target.index === 0 && approach?.pattern === 'dashShield' && approach.phase === 'atMark') {
        approach.phase = 'guarded';
        this.emit('footworkCue', {f:target, phase:approach.braced ? 'dashBlocked' : 'standingBlock'});
      }
      this.comboContact(target, 'block', moveId || name);
      if (this.footworkPractice?.pattern === 'antiAir' && this.footworkPractice.phase !== 'done' && target.index === 1)
        this.finishFootwork('caughtShield');
      // Use the damage of this hitbox, including sweet spots, late hits and smash charge.
      const scale = projectile ? 0.24 : name === 'aerial' ? 0.29 : name === 'heavy' ? 0.48 : 0.53;
      const stunFrames = clamp(Math.round(1 + damage * scale), 2, 15);
      const impactFrames = clamp(1 + Math.floor(damage * (projectile ? 0.16 : 0.23)), 2, 7);
      const away = projectile ? face : Math.sign(target.x - owner.x) || face;
      const bubble = shieldBubble(target);
      target.shieldImpact = point ? Math.atan2(point.y - bubble.y, point.x - bubble.x) : away > 0 ? Math.PI : 0;
      const push = Math.min(295, 35 + damage * (projectile ? 3 : 8));
      if (!projectile && !owner.stun && !owner.grip) {
        owner.impactLag = Math.max(owner.impactLag, impactFrames / 60);
        owner.vx -= away * push * (owner.ground >= 0 ? 0.8 : 0.45);
      }
      target.shieldHP -= damage * 0.027;
      const broken = target.shieldHP <= 0;
      if (target.index === 1 && owner.index === 0 &&
          (this.cpuLevel === 'rival' || (!this.comboPractice?.defending && this.comboPractice?.reply === 'punish')))
        this.bot.blockedSwing = !broken && !projectile && (use?.airSide || use?.smashSide) ? use : null;
      if (this.shieldPractice?.brokenSlot === target.index && this.shieldPractice.phase === 'awake')
        this.guardBreakCue(target, 'guarded', this.shieldPractice.frames, this.shieldPractice.struggles, moveId);
      if (this.cpuLevel === 'rival' && owner.index === 1 && target.index === 0 && !projectile &&
          owner.ground >= 0 && owner.ground === target.ground && !broken) {
        const brain = this.bot, previous = brain.pressure;
        // A multi-hit move gives the defender one chance to respond after the last hit.
        const sameSwing = previous && previous.swing === use;
        if (previous && !sameSwing && !previous.observed) brain.shieldHabit = null;
        const read = sameSwing ? previous.read : brain.shieldHabit?.count >= 2 ? brain.shieldHabit : null;
        if (read && !sameSwing) {
          const key = read.escape === 'spot' ? 'spotReads' : 'rollReads';
          brain[key] = (brain[key] || 0) + 1;
        }
        let roll = null;
        if (read && read.escape !== 'spot') {
          const floor = this.terrain[target.ground], dir = read.escape === 'away' ? away : -away;
          const back = target.face !== dir, timing = dodgeTiming(target, target.kit.defense.roll, back ? 2 : 0);
          const landing = target.x + dir * target.kit.defense.rollDistance * (back ? .9 : 1);
          roll = {dir, mark:clamp(landing, floor.x1 + 2, floor.x2 - 2) - floor.x1,
            catchAt:read.delay + timing.safeUntil + 2/60, expires:read.delay + timing.duration + .12};
        }
        brain.pressure = { swing: use, opens: this.time + (impactFrames + stunFrames) / 60, x: target.x,
          ground: owner.ground, face: away, read, roll, observed:sameSwing && previous.observed,
          expectedSafeEnd: target.kit.defense.spot[2] - dodgeWear(target) };
      }
      if (broken) this.breakShield(target);
      else {
        target.impactLag = Math.max(target.impactLag, impactFrames / 60);
        target.shieldStun = Math.max(target.shieldStun, stunFrames / 60);
        target.shieldGrabWindow = shieldGrabPenalty;
        target.vx = away * push;
        target.run = null;
        if (this.edgePractice?.corner && target.index === 0) this.edgePractice.blocked = true;
      }
      this.sampleFreshness(owner, use, moveId, power, 0, stunFrames, true);
      const timing = use?.airSide ? aerialHitTiming(use, attackWindow(use)) : '';
      this.emit('block', { f: target, owner, point, attackName: name, face: away, moveId, impactFrames, stunFrames, projectile, power, timing });
      if (this.escapePractice?.spacing === 'counter' && target.index === 0 && moveId === 'pipStampKick')
        this.finishEscapePractice('shieldedKick');
      if (!broken && this.escapePractice?.spacing === 'break' && this.escapePractice.contact === 'plant' && target.index === 0)
        this.finishEscapePractice('blockedReply');
      if (this.platformPractice?.defend && target.index === 0 && !broken) this.finishPlatformPractice('guarded', moveId);
      if (this.platformPractice?.pattern === 'shield-drop' && !broken) {
        const drill = this.platformPractice;
        if (target.index === 0 && drill.phase === 'approach' && moveId === owner.kit.air.up) {
          drill.phase = 'blocked';
          this.emit('platformBlock', { f: target, moveId });
        } else if (target.index === 1 && drill.phase === 'fall') this.finishPlatformPractice('guardedReply', moveId);
      }
      const spacing = this.spacingPractice;
      if (spacing?.pattern === 'fastfall' && spacing.phase === 'active') {
        if (owner.index === 0 && spacing.blockAt === null && moveId === owner.kit.air.neutral) spacing.blockAt = this.time;
        if (target.index === 0 && moveId === 'pipSpin') this.finishSpacingPractice('blocked');
      }
      if (spacing?.pattern === 'cancel' && spacing.phase === 'active' && target.index === 0 && moveId === owner.kit.tilts.down)
        this.finishSpacingPractice('blocked');
      if (!broken && spacing?.guard && spacing.phase === 'active' && owner.index === 0 && target.index === 1 &&
          moveId === owner.kit.specials.neutral) {
        spacing.blocked = true;
        spacing.contact = moveId;
        this.emit('spacingContact', { f: owner, moveId });
      }
      if (this.spacingPractice?.phase === 'active' && owner.index === 0 && target.index === 1 &&
          this.spacingPractice.pattern === 'landing' && this.spacingPractice.contact) this.finishSpacingPractice('guarded');
      else if (this.spacingPractice?.phase === 'active' && owner.index === 0 && target.index === 1 &&
          owner.attack?.airSide && !this.spacingPractice.contact) {
        this.spacingPractice.contact = moveId;
        this.emit('spacingContact', { f: owner, moveId });
      }
      if (this.climbPractice?.role === 'patience')
        this.finishClimbPractice(target.index === 0 ? 'blockedPunch' : 'guardedReply');
      else if (this.climbPractice?.climbed && target.index === this.climbPractice.slot && moveId === owner.kit.ground[0])
        this.finishClimbPractice(this.climbPractice.role === 'trap' ? 'late' : 'guarded');
      if (this.climbPractice?.role === 'coverRise' && target.index === 0 && use?.airSide)
        this.finishClimbPractice('blockedRise');
      if (target.index === 0) this.finishShieldPractice(broken ? 'break' : 'block');
      else if (['counterGrab','crossup'].includes(this.shieldPractice?.pattern)) this.finishShieldPractice('counterBlocked');
      else if (this.shieldPractice?.pattern === 'yourHop') this.finishShieldPractice('blockedAir');
      else if (this.shieldPractice?.pattern === 'poke') this.finishShieldPractice(broken ? 'brokeGuard' : 'sealed');
    }
    hit(target, owner, damage, base, growth, aim, name, face, point, move, moveId, use, covered = true, ownerDamage = owner.damage, sweet = null) {
      if (protectionTime(target)) return false;
      if (target.grip?.target === target.index) return false;
      const grab = name === 'throw' || move?.commandGrab;
      const projectile = !!move?.projectile || name === 'ball' || name === 'disc' || name === 'snare';
      const chase = this.chasePractice;
      if (chase?.bait && chase.phase === 'getup' && owner.index === chase.slot && use?.floorAttack) {
        chase.contactFrame = Math.round(use.time * 60);
        chase.contactSide = (target.x - owner.x) * owner.face < 0 ? 'behind' : 'in front';
      }
      if (!grab && canParry(target)) {
        if (this.comboPractice?.defending) this.comboContact(target, 'parry', moveId || name);
        this.parry(target, owner, face, point, projectile);
        return false;
      }
      const power = moveId ? moveFreshness(owner, moveId, use) : 1;
      damage = scaledDamage(damage, power, use);
      const stance = target.attack;
      if (
        !grab &&
        stance?.moveId === 'brisketBrace' &&
        !stance.riposte &&
        stance.time + 1e-8 >= stance.start &&
        stance.time < stance.start + stance.active
      ) {
        stance.riposte = true;
        stance.time = 0;
        stance.start = 3 / 60;
        stance.active = 7 / 60;
        stance.end = 0.37;
        stance.dmg = clamp(8 + damage * 0.7, 11, 22);
        target.face = Math.sign(owner.x - target.x) || target.face;
        target.invuln = 0.075;
        this.emit('counter', { f: target, point });
        return false;
      }
      const guarded = target.shield && !grab && covered;
      rememberMove(owner, moveId, use, power, guarded);
      if (guarded) {
        this.block(target, owner, damage, name, face, point, projectile, moveId, use, power);
        if (moveId === 'brisketHaymaker' && this.footworkPractice?.pattern === 'armorGrab' &&
            this.footworkPractice.phase !== 'done') this.finishFootwork('blockedPunch');
        return false;
      }
      const armor = activeArmor(target);
      if (armor && damage > 0 && damage <= armor.limit && !grab && !move?.pull && !move?.bounce &&
          name !== 'snare' && name !== 'rope') {
        stance.armorSpent = true;
        const applied = this.dealDamage(target, damage, false, moveId || name);
        this.comboContact(target, 'hit', moveId || name, applied);
        this.sampleFreshness(owner, use, moveId, power, applied, 0);
        this.hitStop = Math.max(this.hitStop, 3/60);
        this.emit('hit', {f:target, owner, name, moveId, face, point, power, damage:applied, speed:0, armored:true});
        return true;
      }
      const poked = target.shield && !grab && !covered;
      const caughtDodge = target.airDodge?.hitstunCancelFrames && target.airDodge.time>=target.airDodge.safeUntil-1e-8;
      const parryPunish = owner.index === 0 && target.index === 1 && owner.ground >= 0 && target.stun > 0 &&
        this.spacingPractice?.pattern === 'fastfall' && this.spacingPractice.parried;
      const pressure = this.bot.pressure;
      if (pressure?.strike && pressure.strike === use && !pressure.scored && target.index === 0 &&
          owner.index === 1 && target.floorAction?.type === 'spotDodge') {
        pressure.scored = true;
        this.bot.spotPunishes = (this.bot.spotPunishes || 0) + 1;
      }
      if (poked) this.emit('shieldPoke', { f: target, owner, attackName: name, moveId, point, face });
      if (target.shieldBreak) this.endShieldBreak(target, 'punished', moveId);
      else if (this.shieldPractice?.brokenSlot === target.index && this.shieldPractice.phase === 'awake')
        this.guardBreakCue(target, 'lateHit', this.shieldPractice.frames, this.shieldPractice.struggles, moveId);
      target.heldRecoveryJump = false;
      this.gradeFootwork(target,projectile);
      const floorAtHit = target.floorAction;
      this.rememberTechPunish(target);
      if(chase?.role==='readTech' && target.index===chase.slot && floorAtHit?.techChoice)this.finishChase('caught');
      const landingAtHit = target.landingLag;
      const downed = floorAtHit?.type === 'downed' ? floorAtHit : null;
      const previousLocks = downed?.locks || 0;
      if (downed && target.ground >= 0 && owner.ground >= 0 && move?.lockFrames && previousLocks < 2 &&
          (!target.encounter || target.encounter.kind === target.kind) && (!owner.encounter || owner.encounter.kind === owner.kind)) {
        const applied = this.dealDamage(target, damage, previousLocks > 0, moveId || name);
        this.comboContact(target, 'lock', moveId, applied);
        this.sampleFreshness(owner, use, moveId, power, applied, 0);
        downed.locks = previousLocks + 1;
        downed.time = 0;
        downed.duration = move.lockFrames / 60;
        downed.choice = null;
        target.vx = face * (60 + damage * 5);
        owner.chainWindow = owner.chainNext = 0;
        this.hitStop = Math.max(this.hitStop, 3 / 60);
        this.emit('hit', { f: target, owner, speed: 0, name, moveId, face, point, lock: downed.locks, power, damage: applied });
        if (this.chasePractice) this.chaseHit(target, moveId, previousLocks, downed.locks);
        return true;
      }
      if (target.grip) this.breakGrapple(false);
      // Read the stance at contact. An attack, jump, grab or committed platform drop opens the stance.
      const braced = target.ground >= 0 && target.crouch && !stance && !target.floorAction && !target.dropPrep && !target.stun &&
        !grab && !move?.pull && !move?.bounce && name !== 'snare' && name !== 'rope';
      target.clashRecoil = null;
      target.ledgeTrump = null;
      target.crouch = target.crawling = false;
      target.dropPrep = null;
      target.wallAction = null;
      target.throwBounce = null;
      target.floorAction = target.tumble = null;
      target.airDodge = target.guardAim = null;
      target.waveSlide = target.takeoffWindow = 0;
      target.guardIntent = '';
      target.impactLag = target.shieldStun = target.shieldGrabWindow = 0;
      target.shieldDrop = target.parryFlash = 0;
      target.techBuffer = target.dodge = 0;
      const applied = this.dealDamage(target, damage, previousLocks > 0 || move?.preserveCombo, moveId || name);
      const comparison = this.spacingPractice;
      if (comparison?.pattern === 'airPower' && comparison.phase === 'active' && owner.index === 0 &&
          moveId === owner.kit.air.neutral) {
        comparison.hits++;
        comparison.damage = Math.round((comparison.damage + applied) * 10) / 10;
      }
      this.comboContact(target, name === 'throw' ? 'throw' : 'hit', moveId || name, applied);
      const finish = finishingLaunch(move, name);
      const rage = finish && growth > 0 && name !== 'ball' ? rageScale(ownerDamage) : 1;
      const speed = launchStrength(base,growth,target.damage,target.stats.weight,power,rage);
      const lift = groundedLift(move, target.ground >= 0, speed * (braced ? crouchLaunchScale : 1), sweet);
      // Brisket's landing shockwave and a weak grounded spike still pop the rival up.
      const meteor = !!move?.meteor && !(use?.plunge && use.landed) && speed * (braced ? crouchLaunchScale : 1) >= tumbleSpeed;
      if (move) {
        const degrees = sweet?.angle ?? move.angle;
        const angle = ((degrees < 0 && target.ground >= 0 && !meteor ? 46 : degrees) * lift * Math.PI) / 180;
        target.vx = face * speed * Math.cos(angle);
        target.vy = -speed * Math.sin(angle) - (angle >= 0 ? 40 * lift : 0);
        if (move.pull) {
          const spacing = owner.stats.width + target.stats.width;
          let pocket = owner.x + face * (spacing - 4);
          let rate = 9.5;
          if (move.edge) {
            // Reel toward the paws that will land onstage, over the duration of the hitstun.
            pocket = move.edge.x + face * (ledgePosition(move, move.end).x + spacing + 2);
            rate = 1 / move.stun;
          }
          target.vx = clamp((pocket - target.x) * rate, -350, 350);
          if (move.lift) target.vy = -Math.max(move.lift, Math.abs(target.vy));
        }
      } else {
        const upward = aim < 0,
          downward = aim > 0 && target.ground < 0;
        target.vx = face * speed * (upward ? 0.34 : downward ? 0.48 : 0.93);
        target.vy = downward ? speed * 0.8 : -speed * (upward ? 1.13 : 0.59) - 48;
      }
      const groundAtHit = target.ground;
      // A meteor sends the defender down with the recovery options they held before impact.
      const recoveryRestored = target.usedUp && applied > 0 && owner !== target && !(meteor && target.vy > 0) &&
        (groundAtHit < 0 || stance?.specialSide === 'up');
      if (recoveryRestored) target.usedUp = false;
      if (braced) {
        target.vx *= crouchLaunchScale;
        target.vy *= crouchLaunchScale;
      }
      const planted = braced && canStayPlanted(target.vx, target.vy);
      const groundSlide = lift === 0 && !planted;
      if (planted || groundSlide) target.vy = 0;
      else {
        if (groundAtHit >= 0) target.jumps = 1;
        target.y -= 1;
        target.ground = -1;
      }
      target.coyote = 0;
      target.jumpSquat = null;
      target.ledgeDropJump = false;
      target.fastFall = false;
      target.fastFallBuffer = 0;
      target.cutJump = false;
      target.chainWindow = 0;
      target.hopWindow = target.followPounce = 0;
      target.command = null;
      target.jumpBuffer = 0;
      target.guardBuffer = 0;
      target.landTime = 0;
      target.landingLag = 0;
      target.landingFollowUntil = 0;
      target.skidTime = 0;
      target.run = null;
      target.reboundTime = 0;
      target.righting = 0;
      target.ledge = null;
      target.ledgeLock = 0.28;
      target.attack = null;
      cancelCharge(target);
      target.shield = false;
      target.stun = launchStun(speed,rage,move);
      if (planted) target.stun = (2 + Math.floor(Math.abs(target.vx) / 48)) / 60;
      else if (braced) target.stun *= crouchLaunchScale;
      const emphatic =
        !!move?.hard || (name === 'heavy' && !move?.setupHit) || name === 'shoulder' || speed > 630;
      target.reaction = { duration: target.stun, face: planted ? target.face : -face, hard: emphatic || speed > 460, planted, groundSlide };
      const launchSpeed = Math.hypot(target.vx, target.vy);
      this.sampleFreshness(owner, use, moveId, power, applied, launchSpeed);
      if (finish && launchSpeed >= tumbleSpeed) {
        this.startTumble(target, true);
        if (meteor && target.vy > 0) {
          target.tumble.meteor = moveId;
          target.stun = Math.max(target.stun, (move.meteor + (braced ? 3 : 6)) / 60);
          target.reaction.duration = target.stun;
        }
      }
      if (this.wallPractice?.phase === 'swing' && target.index === 0 && moveId === (this.wallPractice.ceiling ? 'pipFlip' : 'pipBackKick'))
        this.wallPractice.phase = 'flight';
      if (moveId === 'brisketPress' && this.cpuControlled(owner) && target.tumble && owner.ground >= 0) {
        const chase = !!this.bot.lastDrift;
        this.bot.juggleRead = { floor:owner.ground, origin:owner.x, dir:(this.bot.lastDrift || 1) * owner.face,
          throwFace:owner.face, chase, until:this.time + 2.5 };
        this.bot.lastDrift = 0;
      }
      if (target.index === 0 && this.launchPractice?.phase === 'ready' && name === 'throw') {
        this.launchPractice.phase = 'flight';
        if (this.launchPractice.pattern === 'juggle') this.launchPractice.airJumps = target.jumps;
      } else if (this.launchPractice?.pattern === 'juggle' && this.launchPractice.phase === 'flight') {
        this.launchPractice.finisher = moveId;
        this.finishJuggle(target.index === 0 ? 'juggled' : 'counter');
      }
      const opener = !!(move?.second || move?.setupHit);
      const hitFrames = target.tumble ? clamp(4 + Math.floor(launchSpeed / 180), 6, 9)
        : move?.hitStopFrames ?? (opener ? 6 : emphatic ? 4 : 2);
      target.hitShift = grab || name === 'snare' ? null : {
        ground: groundAtHit, remaining: hitFrames, cooldown: 0, sector: shiftSector(target.prev),
        cpuDirection: opener && this.cpuControlled(target) && this.random() < 0.45
          ? Math.sign(target.x - owner.x) || face : 0,
      };
      this.hitStop = Math.max(this.hitStop, hitFrames / 60);
      if (
        this.trumpPractice?.role === 'defend' &&
        this.trumpPractice.phase === 'approach' &&
        target.index === 1
      )
        this.trumpPractice.phase = 'intercepted';
      const timing = aerialHitTiming(use, move);
      this.emit('hit', { f: target, owner, speed, name, moveId, face, point, emphatic, power, damage: applied, timing,
        meteor: !!target.tumble?.meteor, recoveryRestored });
      const breakaway = this.launchPractice;
      if (breakaway?.pattern==='breakaway' && breakaway.phase==='chase') {
        if (owner.index===0) this.finishBreakaway(use?.hitstunCancelFrames ? 'counter' : 'otherHit',moveId);
        else this.finishBreakaway(caughtDodge ? 'caughtDodge' : 'caught',moveId);
      }
      const edge = this.edgePractice;
      if (edge && edge.phase !== 'done') {
        if (target.index === 0) this.finishEdgePractice('caught', moveId);
        else if (edge.corner) this.finishEdgePractice('interrupted', moveId);
        else if (edge.timeCatch) this.finishEdgePractice(edge.guardFrames ? 'timedHit' : 'intercepted', moveId);
        else if (edge.pattern === 'lip') this.finishEdgePractice(owner.ground === edge.ground ? 'covered' : 'offstage', moveId);
        else this.finishEdgePractice(edge.frames && owner.ground < 0 && use?.airSide ? 'followup' : 'other', moveId);
      }
      if (this.survivalPractice && this.survivalPractice.moveId === moveId && target.index === 0)
        this.survivalPractice.released = true;
      if (target.tumble?.pending && (!target.encounter || target.encounter.kind === target.kind) &&
          ((target.stocks === 1 && this.mode !== 'training') || (target.index === 0 && this.survivalPractice))) {
        const line = this.projectLaunch(target, target.vx, target.vy);
        if (line.zone && !line.dodgeFrame) {
          target.tumble.threat = line.zone;
          if (this.survivalPractice) this.survivalPractice.zone = line.zone;
          const finalHit = this.survivalPractice?.pattern === 'lastStock' ||
            ((this.mode === 'local' || this.mode === 'solo') && owner.stocks === 1 && target.stocks === 1);
          if (finalHit) {
            this.finalHitHold = finalHitExtra;
            target.tumble.finalHit = true;
            if (this.cpuControlled(target)) target.tumble.finalAim = this.cpuLaunchAim(target);
          }
          this.emit('blastThreat', { f: target, zone: line.zone, finalHit, point: { x: target.x, y: target.y - target.stats.height * 0.52 } });
        }
      }
      if (timing === 'late' && this.cpuControlled(owner)) owner.landingFollowUntil = this.time + 0.55;
      const spacing = this.spacingPractice;
      if (spacing?.pattern === 'fastfall' && spacing.phase === 'active' && target.index === 0 && moveId === 'pipSpin')
        this.finishSpacingPractice('clipped');
      if (parryPunish && spacing.phase === 'active') {
        spacing.punish = moveId;
        this.finishSpacingPractice('punish');
      }
      if (isSweetPractice(spacing) && spacing.phase === 'active' && owner.index === 0 && target.index === 1) {
        spacing.contact = moveId;
        spacing.point = {x:point.x, y:point.y};
        spacing.result = { label: sweet?.label || 'Body hit', damage: applied, speed: Math.round(Math.hypot(target.vx, target.vy)),
          dx:target.vx*spacing.dir, dy:target.vy, angle:Math.round(Math.atan2(-target.vy, Math.abs(target.vx))*180/Math.PI) };
        this.finishSpacingPractice(moveId !== spacing.moveId ? 'other' : sweet ? 'sweet' : 'body');
      }
      if (spacing?.pattern === 'cancel' && spacing.phase === 'active') {
        if (target.index === 0 && moveId === owner.kit.tilts.down) this.finishSpacingPractice('caught');
        else if (owner.index === 0) {
          spacing.reply = moveId;
          spacing.damage = applied;
          this.finishSpacingPractice('interrupt');
        }
      }
      if (spacing?.pattern === 'landing' && spacing.phase === 'active' && owner.index === 0 && target.index === 1) {
        if (!spacing.contact && timing) {
          spacing.contact = moveId;
          spacing.timing = timing;
          spacing.damage = applied;
          this.emit('spacingContact', { f: owner, moveId });
        } else if (spacing.contact && owner.ground >= 0 && moveId === owner.kit.ground[0])
          this.finishSpacingPractice(this.lastCombo.hits === 2 ? 'string' : 'gap');
        else this.finishSpacingPractice('other');
      }
      if (isReversalPractice(spacing) && spacing.phase === 'active' && owner.index === 0 && target.index === 1 &&
          moveId === owner.kit.specials.neutral) {
        spacing.contact = moveId;
        spacing.damage = Math.round((spacing.damage + applied) * 10) / 10;
        this.emit('spacingContact', { f: owner, moveId });
      }
      if (braced) this.emit('crouchCancel', { f: target, owner, moveId, planted, face, frames: Math.ceil(target.stun * 60 - 1e-8),
        point: { x: target.x, y: this.terrain[groundAtHit].y } });
      if (this.escapePractice) this.gradeCrouchHit(owner, moveId, name, braced, planted, stance);
      if (this.chasePractice) this.chaseHit(target, moveId, previousLocks, 0);
      if (this.climbPractice?.phase === 'active') {
        const drill = this.climbPractice;
        if (drill.role === 'patience') {
          this.finishClimbPractice(target.index === 0 ? 'punched' : drill.passed ? 'punished' : 'interrupted');
        } else if (drill.route) {
          if (target.index === drill.slot) this.finishClimbPractice('intercepted');
          else if (drill.role === 'coverRise') this.finishClimbPractice('hitByRise');
          else if (drill.airJump && use?.airSide && !drill.contact) {
            drill.contact = moveId;
            this.emit('climbCue',{f:owner,phase:'strike',moveId});
          }
        } else {
          const jab = drill.climbed && target.index === drill.slot && moveId === owner.kit.ground[0];
          this.finishClimbPractice(jab ? (drill.role === 'trap' ? 'timed' : 'caught') : 'other');
        }
      }
      if (this.platformPractice?.defend) {
        const drill = this.platformPractice;
        if (owner.index === 1) this.finishPlatformPractice('tagged', moveId);
        else if (drill.pattern === 'ferry' || (drill.phase === 'wing' && target.y < this.terrain[2].y - 3)) this.finishPlatformPractice('intercept', moveId);
        else this.finishPlatformPractice('low', moveId);
      } else if (this.platformPractice?.pattern === 'shield-drop') {
        const drill = this.platformPractice;
        if (target.index === 0) this.finishPlatformPractice('tagged', moveId);
        else this.finishPlatformPractice(drill.phase === 'fall' && owner.ground < 0 && owner.attack?.airSide ? 'counter' : 'intercept', moveId);
      } else if (this.platformPractice && owner.index === 0 && target.index === 1) {
        const drill = this.platformPractice;
        if (drill.phase === 'fall' && owner.attack?.airSide && owner.ground < 0 && owner.vy >= 0)
          this.finishPlatformPractice('aerial', moveId);
        else if (drill.pattern === 'top' && owner.ground === drill.platform && moveId === owner.kit.tilts.down)
          this.finishPlatformPractice('tilt', moveId);
        else this.finishPlatformPractice('other', moveId);
      }
      if (['tip','close'].includes(this.escapePractice?.spacing) && owner.index === 1 && target.index === 0 && moveId === 'cloverRimRattle') {
        if (opener && this.escapePractice.phase === 'swing') {
          this.escapePractice.phase = 'follow';
          this.emit('escapeCue', { f: target, phase: 'follow' });
        } else if (!opener && this.escapePractice.phase !== 'done')
          this.finishEscapePractice(this.escapePractice.phase === 'follow' ? 'caught' : 'missed');
      }
      if (this.shieldPractice) {
        const counter = this.shieldPractice.phase === 'counter';
        if (counter && this.shieldPractice.pattern === 'crossup' && owner.index === 0 && use?.airSide === 'back')
          this.finishShieldPractice(landingAtHit > 1e-8 ? 'rearPunish' : 'lateAir',Math.ceil(landingAtHit*60-1e-8));
        else if (target.index === 0 && this.shieldPractice.pattern === 'dodgeTiming' &&
            floorAtHit?.type === 'spotDodge' && floorAtHit.wear > 0 && moveId === owner.kit.tilts.down)
          this.finishShieldPractice('dodgeClipped');
        else if (target.index === 0) this.finishShieldPractice(poked ? 'poked' : 'hit');
        else if (this.shieldPractice.pattern === 'counterGrab' && this.shieldPractice.lastDodge === 'spotDodge' &&
            stance?.grabAttempt && stance.time + 1e-8 >= stance.start + stance.active) {
          const frames = Math.max(0, Math.ceil((stance.end - stance.time) * 60 - 1e-8));
          this.finishShieldPractice(owner.attack?.spotCounter ? 'spotPunish' : 'ordinaryPunish', frames);
        } else if (this.shieldPractice.pattern === 'poke') this.finishShieldPractice(poked ? 'found' : 'hitOpen');
        else this.finishShieldPractice(counter ? 'counterHit' : 'interrupted');
      }
      if (this.airPractice?.pattern === 'highReturn' && this.airPractice.phase !== 'done') {
        const drill = this.airPractice;
        if (target.index === 0) drill.clipped = true;
        else drill.counter = true;
        this.emit('airCue',{f:target,pattern:drill.pattern,phase:target.index === 0 ? 'clipped' : 'counterHit'});
      } else if (this.airPractice?.pattern === 'interrupted') {
        if (target.index === 0 && recoveryRestored && this.airPractice.phase !== 'done') {
          this.airPractice.phase = 'clipped';
          this.airPractice.readyToCast = false;
          this.emit('airCue',{f:target,pattern:'interrupted',phase:'clipped',moveId});
        }
      } else this.finishAirPractice(target.index === 0 ? 'hit' : 'interrupted');
      this.finishRollPractice(target.index === 0 ? 'hit' : 'counter');
      return true;
    }
    discContacts(d, oldX, oldY, damage, rivals, impact) {
      const returning = d.type === 'return', dx = d.x - oldX, dy = d.y - oldY;
      const radius = returning ? 16 : d.type === 'drive' ? 15 : 13, contacts = [];
      for (const f of rivals) {
        const swing = this.activeSwing(f);
        if (swing?.beat.reflectsDisc && dx * f.face < 0) {
          const area = swing.area, front = (area.x-f.x)*f.face + area.rx + radius;
          const rx = (front-12)/2;
          const time = segmentEntry(oldX,oldY,dx,dy,{x:f.x+(12+rx)*f.face,y:area.y,rx,ry:area.ry+7});
          if (time < Infinity) contacts.push({time,f,swing,reflect:true});
        }
        const slot = (d.back ? 1 : 0) + 2 * f.index;
        if (returning && d.hit[slot]) continue;
        const height = bodyHeight(f);
        const low = f.floorAction || f.crouch;
        const body = { x: f.x, rx: f.stats.width + radius,
          y: returning ? f.y - (low ? height * 0.52 : 39) : f.y - height / 2 - (d.type === 'skip' ? 1 : 0),
          ry: returning ? (low ? height * 0.5 + 8 : 42) : height / 2 + (d.type === 'skip' ? 6 : 5) };
        let bodyTime = segmentEntry(oldX, oldY, dx, dy, body);
        // A dog finishing an intangible roll has already cleared a disc leaving its hurtbox.
        const stillInside = Math.abs(d.x - body.x) <= body.rx && Math.abs(d.y - body.y) <= body.ry;
        if (!bodyTime && !stillInside) bodyTime = Infinity;
        if (bodyTime < Infinity && this.shieldPractice && d.type === 'drive') this.recordPracticeDodge(f, true);
        const bubble = (f.shield || canParry(f)) && shieldBubble(f);
        const guardTime = bubble ? shieldEntry(bubble, oldX, oldY, dx, dy, 9) : Infinity;
        const timeOfHit = Math.min(bodyTime, guardTime);
        if (timeOfHit < Infinity && !protectionTime(f))
          contacts.push({ time: timeOfHit, f, slot, bubble: guardTime <= bodyTime && bubble });
        if (!swing || !canClash(swing)) continue;
        const { area } = swing;
        const time = segmentEntry(oldX, oldY, dx, dy, { ...area, rx: area.rx + radius, ry: area.ry + 7 });
        if (time < Infinity) contacts.push({ time, f, swing });
      }
      contacts.sort((a, b) => a.time - b.time || Number(!!b.swing) - Number(!!a.swing) || a.f.index - b.f.index);
      const owner = this.dogs[d.owner];
      for (const { time, f, swing, slot, bubble, reflect } of contacts) {
        const point = { x: oldX + dx * time, y: oldY + dy * time };
        if (swing) {
          if (f.attack !== swing.attack) continue;
          if (reflect) {
            d.owner = f.index;
            d.reflected = true;
            d.x = point.x; d.y = point.y;
            d.vx = f.face * clamp(Math.abs(d.vx)*1.25,550,1025);
            if (d.type === 'return') d.vy = -d.vy;
            if (d.type === 'drive') d.rangeLeft = 215 + 150*d.power;
            d.age = 0; d.back = false; d.hit = []; d.moveEntry = null; d.sample = null;
            this.emit('discReflect',{f,target:owner,moveId:d.moveId,point,face:f.face});
            const drill = this.footworkPractice;
            if (drill?.discRole && drill.phase !== 'done') {
              drill.reflected = true;
              this.emit('footworkCue',{f,phase:'reflected'});
            }
            return false;
          }
          const a = swing.area;
          point.x = clamp(point.x, a.x - a.rx, a.x + a.rx);
          point.y = clamp(point.y, a.y - a.ry, a.y + a.ry);
          const power = clashDamage(swing, point);
          const discDamage = scaledDamage(damage, moveFreshness(owner, d.moveId, d));
          const winner = discDamage >= power + clashMargin ? owner : power >= discDamage + clashMargin ? f : null;
          if (winner !== f && (f.ground >= 0 || winner === owner))
            recoilFromClash(swing, power, Math.sign(dx) || -f.face);
          this.clashContact(f, owner, point, winner, true);
          if (winner !== owner) return true;
        } else {
          impact(f, Math.sign(d.vx), bubble ? shieldRim(bubble, point.x, point.y) : point, !!bubble);
          if (!returning) return true;
          d.hit[slot] = true;
        }
      }
      return false;
    }
    updateDiscs(dt, damageAtContact = this.dogs.map(f => f.damage)) {
      this.projectiles = this.projectiles.filter((d) => {
        const owner = this.dogs[d.owner];
        if (d.caught) return false;
        const rivals = this.opponents(owner);
        d.age += dt;
        const oldX = d.x, oldY = d.y;
        const spec = smashes[d.moveId] || specials[d.moveId] || specials.cloverRound;
        const strength = d.type === 'drive' ? smashStrength(d.power) : 1;
        const damage = d.reflected ? Math.round(spec.dmg * strength * 1.25) : spec.dmg * strength;
        const launch = d.reflected ? strength * 1.1 : strength;
        const impact = (target, direction, point, covered) => {
          const parrying = canParry(target);
          const hit = this.hit(
            target,
            owner,
            damage,
            spec.base * launch,
            spec.growth * launch,
            0,
            d.type === 'drive' ? 'heavy' : d.type === 'snare' ? 'snare' : 'disc',
            direction || owner.face,
            point,
            spec,
            d.moveId,
            d,
            covered,
            damageAtContact[owner.index],
          );
          const drill = this.footworkPractice;
          if (drill?.pattern === 'crawl' && target.index === 0 && drill.phase !== 'done') {
            if (d.type === 'return' && hit) this.finishFootwork(d.back ? 'returnHit' : 'castHit');
            else if (d.type === 'skip' && hit) this.finishFootwork('lowHit');
            else if (parrying || covered) this.finishFootwork(d.type === 'skip' ? 'lowGuard' : 'highGuard');
          }
          if (drill?.discRole && drill.phase !== 'done' && d.moveId === 'cloverRound') {
            if (hit) this.finishFootwork(d.reflected ? 'returnedHit' : 'discHit');
            else if (parrying) this.finishFootwork(d.reflected ? 'returnParry' : 'castParry');
            else if (covered) this.finishFootwork(d.reflected ? 'returnGuard' : 'castGuard');
          }
        };
        if (d.type === 'drive') {
          const step = Math.min(d.rangeLeft, Math.abs(d.vx) * dt);
          const face = Math.sign(d.vx);
          d.x += face * step;
          d.rangeLeft -= step;
          if (this.discContacts(d, oldX, oldY, damage, rivals, impact)) return false;
          if (this.ball && Math.abs(d.x - this.ball.x) < 29 && Math.abs(d.y - this.ball.y) < 19) {
            this.swat(this.dogs[d.owner], 0, Math.sign(d.vx));
            return false;
          }
          return d.rangeLeft > 0 && d.x > -130 && d.x < this.stageWidth + 130;
        }
        if (d.type === 'snare' || d.type === 'skip') {
          if (d.platform >= 0) {
            const p = this.terrain[d.platform];
            d.x = p.x1 + d.offset;
            d.y = p.y - 3;
            d.armedIn -= dt;
            if (d.armedIn <= 0) {
              const area = { x: d.x, y: d.y - 3, rx: 22, ry: 6 };
              for (const f of rivals) {
                if (f.ground !== d.platform || protectionTime(f)) continue;
                const guard = shieldContact(f, area);
                if (!guard && Math.abs(f.x - d.x) >= f.stats.width + area.rx) continue;
                impact(f, Math.sign(f.x - owner.x), guard || { x: d.x, y: d.y }, !!guard);
                return false;
              }
            }
          } else {
            d.x += d.vx * dt;
            d.vy += (d.type === 'snare' ? 900 : 875) * dt;
            d.y += d.vy * dt;
            if (d.vy > 0) {
              let landing = -1;
              this.terrain.forEach((p, i) => {
                if (
                  d.x >= p.x1 &&
                  d.x <= p.x2 &&
                  oldY <= p.y &&
                  d.y >= p.y &&
                  (landing < 0 || p.y < this.terrain[landing].y)
                )
                  landing = i;
              });
              if (landing >= 0) {
                const p = this.terrain[landing];
                d.y = p.y - 3;
                if (d.type === 'snare') {
                  d.platform = landing;
                  d.offset = d.x - p.x1;
                } else {
                  if (d.bounces === 2) return false;
                  d.bounces++;
                  d.vy = d.bounces === 1 ? -240 : -175;
                  this.emit('skip', { x: d.x, y: d.y, f: owner });
                }
              }
            }
            if (d.type === 'skip' && this.discContacts(d, oldX, oldY, damage, rivals, impact)) return false;
          }
          return d.age < 2.65 && d.x > -135 && d.x < this.stageWidth + 135 && d.y < 780;
        }
        if (d.age > 0.46) {
          d.back = true;
          const dx = owner.x - d.x,
            dy = owner.y - 41 - d.y,
            len = Math.hypot(dx, dy) || 1;
          d.vx = toward(d.vx, (dx / len) * 730, 2550 * dt);
          d.vy = toward(d.vy, (dy / len) * 730, 2150 * dt);
          if (len < 25 && d.age > 0.58) return false;
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (this.discContacts(d, oldX, oldY, damage, rivals, impact)) return false;
        return d.age < 2.6 && d.x > -130 && d.x < this.stageWidth + 130;
      });
    }
    swat(f, aim, face = f.face) {
      const b = this.ball;
      b.hits = Math.min(3, b.hits + 1);
      b.owner = f.index;
      b.age = 0;
      const speed = [0, 445, 640, 880][b.hits];
      b.vx = speed * face * (aim === -1 ? 0.6 : 1);
      b.vy = aim === -1 ? -480 : aim === 1 ? 90 : -95;
      this.emit('swat', { f, ball: b });
    }
    updateBall(dt) {
      if (!this.ball) {
        this.nextBall -= dt;
        if (this.nextBall <= 0)
          this.ball = {
            x: this.geometryStage === 'laundry' ? 425 : 600,
            y: 135,
            vx: 58,
            vy: 25,
            hits: 0,
            owner: -1,
            age: 0,
          };
        return;
      }
      const b = this.ball, oldX = b.x, oldY = b.y;
      b.age += dt;
      b.vy += (b.hits === 3 ? 280 : 840) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      for (const p of this.terrain) {
        if (b.vy <= 0 || b.x < p.x1 || b.x > p.x2 || oldY + 12 > p.y + 1 || b.y + 12 < p.y) continue;
        b.y = p.y - 12;
        b.vy = b.vy > 90 ? -b.vy * 0.52 : 0;
        b.vx *= b.hits === 3 ? 0.96 : 0.78;
        break;
      }
      if (b.owner >= 0 && Math.abs(b.vx) > 150) {
        const target = this.dogs[1 - b.owner];
        const height = bodyHeight(target);
        const low = target.floorAction || target.crouch;
        const dx = b.x - oldX, dy = b.y - oldY;
        const bodyTime = segmentEntry(oldX, oldY, dx, dy, { x: target.x, rx: target.stats.width + 11,
          y: target.y - (low ? height * 0.52 : 37), ry: low ? height * 0.5 + 10 : 43 });
        const bubble = (target.shield || canParry(target)) && shieldBubble(target);
        const guardTime = bubble ? shieldEntry(bubble, oldX, oldY, dx, dy, 11) : Infinity;
        const time = Math.min(guardTime, bodyTime);
        if (!protectionTime(target) && time < Infinity) {
          const covered = guardTime <= bodyTime, x = oldX + time * dx, y = oldY + time * dy;
          this.hit(
            target,
            this.dogs[b.owner],
            b.hits === 3 ? 19 : 4 + b.hits,
            b.hits === 3 ? 290 : 110,
            b.hits === 3 ? 6.2 : 2.2,
            0,
            'ball',
            Math.sign(b.vx),
            covered ? shieldRim(bubble, x, y) : { x, y },
            null, null, null, covered,
          );
          if (b.hits === 3) {
            this.ball = null;
            this.nextBall = 4;
            return;
          }
          b.owner = -1;
          b.vx *= -0.28;
          b.vy = -200;
        }
      }
      if (b.x < -60 || b.x > 1260 || b.y > 715 || b.age > 20) {
        this.ball = null;
        this.nextBall = 3.5;
      }
    }
    finishingThrow(owner, target, grip) {
      // A neutral launch is visible to both players. The captive can still steer during hit freeze.
      let quickest = Infinity, pick = null;
      const rage = rageScale(owner.damage);
      for (const [side, id] of Object.entries(owner.kit.throws)) {
        const move = throws[id];
        if (!finishingLaunch(move, 'throw')) continue;
        const power = moveFreshness(owner, id);
        const damage = Math.min(999, target.damage + scaledDamage(move.dmg, power));
        const speed = launchStrength(move.base, move.growth, damage, target.stats.weight, power, rage);
        const face = side === 'back' || move.reverseLaunch ? -grip.face : grip.face;
        const angle = move.angle * Math.PI / 180;
        const vx = face * speed * Math.cos(angle), vy = -speed * Math.sin(angle) - 40;
        if (Math.hypot(vx, vy) < tumbleSpeed) continue;
        const release = {...target, x:owner.x + move.release[0] * grip.face,
          y:owner.y + move.release[1] + target.stats.height * .52 - 1,
          stun:launchStun(speed, rage, move), tumble:{pending:true, time:0}, throwBounce:null};
        const path = this.projectLaunch(release, vx, vy);
        const frames = move.frames[0] + path.ticks;
        if (path.zone && !path.dodgeFrame && frames < quickest) {
          pick = side;
          quickest = frames;
        }
      }
      return pick;
    }
    loseStock(f) {
      if (f.grip) this.breakGrapple(false);
      const points=this.suddenDeath ? null : this.matchCard?.points;
      const hit=this.matchCard?.players[f.index].lastHit;
      const credited=!!hit && this.matchFrames-hit.frame<=600;
      if(points){
        points[f.index]--;
        if(credited)points[1-f.index]++;
      }else if (this.mode !== 'training') f.stocks--;
      if (this.matchCard) this.matchCard.losses.push({
        slot:f.index, frame:this.matchFrames, damage:f.damage,
        ...(this.relayTeams ? {kind:f.kind,coat:this.coatFor(f.index)} : {}),
        ...(points ? {credited,points:points.slice()} : {remaining:f.stocks}),
        zone:blastZone(f.x, f.y, this.stageWidth, this.blastInset()),
        suddenRound:this.suddenDeath?.round || 0, lastHit:this.matchCard.players[f.index].lastHit,
      });
      this.projectiles = this.projectiles.filter((d) => d.owner !== f.index);
      this.emit('ko', { f, x: f.x, y: f.y, stageWidth: this.stageWidth, remaining: f.stocks });
    }
    knockouts(out) {
      if (this.wallPractice?.runner && out.includes(this.dogs[0])) this.finishWallReturn(this.dogs[0], 'out');
      if (this.edgePractice?.timeCatch) this.finishEdgePractice('missed');
      if (this.comboPractice?.source==='confirm')window.ComboLab.finishConfirm(this.comboPractice,'A dog left the stage before the follow-up.');
      else if (this.comboPractice) this.comboPractice.phase = 'done';
      if (this.survivalPractice && out.includes(this.dogs[0])) {
        this.loseStock(this.dogs[0]);
        this.finishSurvivalPractice('ko');
        return;
      }
      for (const f of out) {
        if (this.stockPractice) this.finishStockPractice('ko');
        if (f.index === 0 && this.launchPractice) {
          if (this.launchPractice.pattern === 'juggle') this.finishJuggle('out');
          else this.launchPractice.phase = 'out';
        }
        if (f.index === 0 && this.meteorPractice) this.finishMeteorPractice('ko');
        this.loseStock(f);
      }
      const eliminated = this.dogs.filter((f) => f.stocks <= 0);
      if(this.relayTeams && !this.suddenDeath){
        for(const f of out){
          if(f.stocks<=0)continue;
          const seat=f.index, next=3-f.stocks;
          f.kind=this.relayTeams[seat][next];
          this.coats[seat]=this.relayCoats[seat][next];
          this.spawn(f,true);
          Object.assign(this.matchCard.players[seat],{kind:f.kind,coat:this.coats[seat]});
          this.emit('relayEntry',{f});
        }
      }
      if (eliminated.length === 1) {
        this.finishMatch(1 - eliminated[0].index, this.suddenDeath ? 'sudden' : 'ko');
        return;
      }
      if (eliminated.length === 2) return this.startSuddenDeath('double');
      if(!this.relayTeams || this.suddenDeath)out.forEach((f) => this.spawn(f, true));
    }
    crouchCounterInput(f, foe) {
      if (!f.reaction?.planted || !f.stun || f.ground < 0 || f.command || protectionTime(foe)) return null;
      const low = moves[f.kit.tilts.down], [x, y, rx, ry] = low.box;
      const time = f.stun + low.start;
      const gap = (foe.x + foe.vx * time - f.x) * f.face;
      const height = foe.y - f.y - bodyHeight(foe) * 0.5;
      if (Math.abs(gap - x) > rx + foe.stats.width || Math.abs(height - y) > ry + bodyHeight(foe) * 0.4) return null;
      return { ...idleInput, y: 0.6, tapped: { attack: true } };
    }
    shieldPunishInput(f, foe) {
      const swing = this.bot.blockedSwing;
      if (!swing) return null;
      const guarding = {...idleInput, shield:true};
      const sameSwing = foe.attack === swing;
      const recovery = sameSwing ? swing.end - swing.time : foe.landingLag;
      const landingNear = sameSwing && foe.ground < 0 && foe.vy >= 0 && this.floorAhead(foe,.22) === f.ground;
      if (!f.shield || f.ground < 0 || f.stun || f.grip || f.command || protectionTime(foe) ||
          (foe.attack && !sameSwing) || foe.grip || foe.stun || recovery <= 0 ||
          (foe.ground !== f.ground && !landingNear)) {
        this.bot.blockedSwing = null;
        return null;
      }
      // Keep guarding a descending attack and any second swing. Judge the actual landing, including cancels.
      if (landingNear || f.impactLag > 0 || f.shieldStun > 0 ||
          (sameSwing && swing.second && swing.time < swing.second.start + swing.second.active)) return guarding;
      const back = moves[f.kit.air.back], startup = jumpSquatTime + back.start;
      // On the last landing frame the attacker can already raise Shield before hit detection.
      if (foe.ground === f.ground && (foe.x-f.x)*f.face < -foe.stats.width/2 && startup < recovery-1e-8) {
        const [x,y,rx,ry] = back.box, height = bodyHeight(foe);
        const gap = (foe.x + foe.vx*Math.min(.05,startup) - f.x - f.vx*jumpSquatTime)*f.face;
        const rise = f.stats.jump*.6*back.start - .5*1540*f.kit.gravity*back.start*back.start;
        if (Math.abs(gap-x) <= rx+foe.stats.width-2 && Math.abs(foe.y-height*.52-f.y+rise-y) <= ry+height*.4) {
          this.bot.blockedSwing = null;
          return {...guarding,jump:true,aimStick:true,smashX:-f.face,tapped:{jump:true,aimStick:true}};
        }
      }
      const grab = grabs[f.kit.grab], smash = smashes[f.kit.smashes.up];
      for (const move of foe.damage >= 75 ? [smash,grab] : [grab,smash]) {
        const isGrab = move === grab;
        const startup = move.start + (isGrab && f.shieldGrabWindow > 0 ? shieldGrabPenalty : 0);
        if (startup + 1/60 > recovery || (isGrab && foe.regrabLock)) continue;
        const [x,y,rx,ry] = move.box, height = bodyHeight(foe);
        const dx = (foe.x + foe.vx*Math.min(startup,.05) - f.x)*f.face;
        if ((!isGrab && !move.around && dx < -2) || Math.abs(dx-x) > rx+foe.stats.width-3 ||
            Math.abs(foe.y-height*.52-f.y-y) > ry+height*.4) continue;
        this.bot.blockedSwing = null;
        return isGrab ? {...guarding,tapped:{grab:true}} : {...guarding,smashY:-1,tapped:{smash:true}};
      }
      return guarding;
    }
    cpuGuard(f, foe) {
      if (f.ground < 0 || f.attack || f.stun || f.charge >= 0 || f.dodge || f.landingLag) return null;
      if (f.shieldDrop > 1e-8) return idleInput;
      const dx = foe.x - f.x;
      if (f.parryFlash > 0 && foe.stun > 0 && Math.abs(dx) <= f.stats.reach + 15)
        return { ...idleInput, x: Math.sign(dx), tapped: { attack: true } };
      const a = foe.attack;
      if (!a?.box || !a.moveId || a.time >= a.start + a.active || a.pummel || a.throwSide) return null;
      const wait = a.start - a.time;
      const [x, y, rx, ry] = a.box;
      const contact = foe.x + foe.vx * Math.max(0, wait) + foe.face * x;
      if (
        Math.abs(f.x - contact) > rx + f.stats.width + 12 ||
        Math.abs(f.y - f.stats.height * 0.52 - foe.y - y) > ry + f.stats.height * 0.4 + 6
      )
        return null;
      const brain = this.bot;
      if (brain.guardRead?.attack !== a) {
        const grab = a.grabAttempt || a.commandGrab;
        const chance = this.random();
        let choice = chance < 0.3 ? (grab ? 'spot' : 'parry') : chance < 0.47 ? 'roll' : null;
        if (choice === 'spot' && this.cpuLevel === 'rival' && dodgeWear(f)) {
          const [, first, last] = f.kit.defense.spot;
          if (a.active*60 > last-first+1-2*dodgeWear(f)+1e-8 && wait >= 3/60)
            choice = 'jump';
        }
        if (!choice && chance < .80 && this.cpuLevel === 'rival' && f.shield && a.smashSide === 'side' &&
            !a.projectile && foe.ground === f.ground) {
          const floor = this.terrain[f.ground];
          const room = dx < 0 ? floor.x2 - f.x : f.x - floor.x1;
          if (room < 5 && a.power >= .25) choice = 'roll';
        }
        // Sometimes commit to a low stance against a visible light swing the opponent has used before.
        if (!choice && chance < 0.77 && !grab && !a.pull && !a.projectile && !f.shield && !f.dropPrep &&
            foe.moveHistory.some(entry => entry.moveId === a.moveId) && Number.isFinite(a.angle)) {
          const rage = a.growth > 0 && finishingLaunch(a, a.name) ? rageScale(foe.damage) : 1;
          const speed = (a.base + (f.damage + a.dmg) * a.growth) * rage / f.stats.weight;
          const lift = groundedLift(a, f.ground >= 0, speed * crouchLaunchScale);
          const angle = Math.max(a.angle, 0) * lift * Math.PI / 180;
          if (canStayPlanted(crouchLaunchScale * speed * Math.cos(angle), crouchLaunchScale * (40 * lift + speed * Math.sin(angle))))
            choice = 'crouch';
        }
        let aim;
        if (f.shield && f.shieldHP < 0.55 && !grab && chance >= 0.47 && chance < 0.88) {
          const swing = { x: contact, y: foe.y + y + foe.vy * Math.max(0, wait), rx, ry };
          if (!shieldContact(f, swing)) {
            const centerY = f.y - f.stats.height * 0.52;
            const dx = clamp(f.x, swing.x - rx, swing.x + rx) - f.x;
            const dy = clamp(centerY, swing.y - ry, swing.y + ry) - centerY;
            const length = Math.hypot(dx, dy) || 1;
            aim = { x: 0.5 * dx / length, y: 0.5 * dy / length };
            choice = 'cover';
          }
        }
        brain.guardRead = { attack: a, choice, used: false, aim };
      }
      const read = brain.guardRead;
      if (read.used || !read.choice) return null;
      brain.hold = brain.guard = 0;
      if (read.choice === 'jump') {
        read.used = true;
        brain.jumpHold = .20;
        const away = -Math.sign(dx), floor = this.terrain[f.ground];
        const aim = f.x + away*55;
        return { ...idleInput, jump:true, x:aim > floor.x1 && aim < floor.x2 ? away : 0 };
      }
      if (read.choice === 'cover') return { ...idleInput, ...read.aim, shield: true };
      if (read.choice === 'crouch') return { ...idleInput, y: 0.6 };
      const dodge = read.choice === 'spot' ? f.kit.defense.spot : f.kit.defense.roll;
      if (
        wait > (read.choice === 'parry' ? 3 / 60 : (dodge[1] + dodgeWear(f) + 2) / 60) ||
        (read.choice === 'parry' && !f.shield)
      )
        return { ...idleInput, shield: true };
      read.used = true;
      if (read.choice === 'parry') return idleInput;
      if (read.choice === 'spot') return { ...idleInput, shield: true, y: 1 };
      const p = this.terrain[f.ground];
      const away = -Math.sign(dx) || -f.face;
      const destination = f.x + away * f.kit.defense.rollDistance;
      return {
        ...idleInput,
        shield: true,
        x: destination > p.x1 + 5 && destination < p.x2 - 5 ? away : -away,
      };
    }
    lastDodgeInput(f, platform) {
      if (f.jumps || !f.usedUp || f.hopWindow > 0 || f.usedDodge || f.dodge || f.attack || f.stun ||
          f.impactLag || f.grip || f.wallAction || f.ledgeTrump || f.ledgeCatches >= maxLedgeCatches) return null;
      const inward = f.x < platform.x1 ? 1 : f.x > platform.x2 ? -1 : 0;
      if (!inward) return null;
      const lip = inward > 0 ? platform.x1 : platform.x2;
      const gap = (lip-f.x)*inward, depth = f.y-platform.y, kit = f.kit.airDodge;
      if (gap > kit.distance + dodgeCatch.reach || depth < dodgeCatch.above || depth > kit.distance + dodgeCatch.below) return null;
      // Save the dodge if steering alone can catch this lip.
      let x = f.x, y = f.y, vx = f.vx, vy = f.vy;
      for (let frame=1; frame<=kit.travel[1] && y<=platform.y+80; frame++) {
        vx = airVelocity(f,vx,inward,1/60);
        vy = fallVelocity(f,vy,1/60,!f.tumble);
        x += vx/60; y += vy/60;
        const remaining = (lip-x)*inward;
        if (remaining >= -2 && remaining <= 33 && y >= platform.y+5 && y <= platform.y+80 &&
            vy > -125 && f.ledgeLock <= frame/60) return null;
      }
      // Only spend it if the dog's actual eased path enters the catch window on a legal frame.
      for (let frame=kit.ledgeFrame; frame<=kit.travel[1]; frame++) {
        if (f.ledgeLock > frame/60) continue;
        const travel = kit.distance*dodgeProgress(kit,frame/60);
        for (const [across,up] of [[1,0],[diagonal,diagonal],[0,1]]) {
          const remaining = gap-across*travel, height = depth-up*travel;
          if (remaining >= -2 && remaining <= dodgeCatch.reach && height >= dodgeCatch.above && height <= dodgeCatch.below)
            return {...idleInput,x:across*inward,y:-up,shield:true,tapped:{shield:true}};
        }
      }
      return null;
    }
    cpuAirEvade(f, foe, platform, offstage) {
      const attack = foe.attack;
      if (
        f.ground >= 0 ||
        f.stun ||
        f.usedDodge ||
        f.attack ||
        f.tumble ||
        !attack?.box ||
        attack.projectile ||
        attack.pummel ||
        attack.throwSide
      )
        return null;
      const beat = attackWindow(attack),
        wait = beat.start - attack.time;
      const kit = f.kit.airDodge;
      if (wait < -1e-8 || wait > (kit.directional[1] + dodgeWear(f) + 3) / 60) return null;
      const [x, y, rx, ry] = beat.box || attack.box;
      const dx = f.x + f.vx * wait - (foe.x + foe.vx * wait + x * foe.face);
      const dy = f.y + f.vy * wait - f.stats.height * 0.52 - (foe.y + foe.vy * wait + y);
      if (Math.abs(dx) > rx + f.stats.width + 9 || Math.abs(dy) > ry + f.stats.height * 0.4 + 8) return null;
      if (this.bot.airRead === attack) return null;
      this.bot.airRead = attack;
      if (this.random() >= 0.48) return null;
      let aimX = 0,
        aimY = 0;
      if (offstage) {
        if (f.x >= platform.x1 && f.x <= platform.x2) return null;
        const leftEdge = f.x < platform.x1;
        const edgeX = leftEdge ? platform.x1 : platform.x2;
        const gap = Math.abs(edgeX - f.x);
        if (gap > kit.distance * 0.76 + 26 || f.y > platform.y + kit.distance * 0.64 + 30) return null;
        aimX = leftEdge ? 1 : -1;
        if (f.y > platform.y + 24) aimY = -1;
      } else if (this.random() < 0.32) {
        const away = Math.sign(f.x - foe.x) || f.face;
        const end = f.x + away * kit.distance;
        aimX = end > platform.x1 + 25 && end < platform.x2 - 25 ? away : 0;
      }
      return { ...idleInput, x: aimX, y: aimY, shield: true, tapped: { shield: true } };
    }
    chaseJabInput(f, foe) {
      const down = foe.floorAction;
      if (f.ground < 0 || f.ground !== foe.ground || down?.type !== 'downed' || f.floorAction || f.stun)
        return null;
      if (f.attack || f.landingLag || f.command || f.charge >= 0 || down.time < 3 / 60) return idleInput;
      const dx = foe.x - f.x, dir = Math.sign(dx) || f.face, move = moves[f.kit.ground[0]];
      const reach = move.box[0] + move.box[2] + foe.stats.width;
      if (Math.abs(dx) > reach + 35) return null;
      if (Math.abs(dx) > reach - 6 || f.face !== dir) return { ...idleInput, x: dir * 0.5 };
      if (down.locks >= 2) return { ...idleInput, smashY: 1, tapped: { smash: true } };
      return { ...idleInput, tapped: { attack: true } };
    }
    rememberTechPunish(f){
      const choice=f.floorAction?.techChoice;
      if(!choice)return;
      this.bot.punishedTech=choice;
      if(this.chasePractice?.role==='readTech')this.chasePractice.punished=choice;
    }
    chooseLandingTech(f,foe,floor,response='mix'){
      const away=Math.sign(f.x-foe.x) || -f.face;
      const travel=rollDistance(f,{type:'techRoll'});
      const landingX=clamp(f.x+f.vx*4/60,floor.x1+2,floor.x2-2);
      // Read visible pursuit and room at the lip when pressing Shield. Keep that choice through contact.
      const closing=foe.vx*away>foe.kit.footwork.walk*.75;
      const far=Math.abs(foe.x-landingX)>travel+45;
      const weights={away:far?1:closing?2:6,stay:far?9:2,through:far?1:closing?7:2};
      for(const [choice,dir] of [['away',away],['through',-away]]){
        const end=landingX+dir*travel;
        if(end<floor.x1+8 || end>floor.x2-8)weights[choice]=0;
      }
      const last=this.bot.punishedTech;
      if(last)weights[last]*=.2;
      let choice=response;
      if(response==='mix'){
        const pick=this.random()*(weights.away+weights.stay+weights.through);
        choice=pick<weights.away?'away':pick<weights.away+weights.stay?'stay':'through';
      }
      f.tumble.techChoice=choice;
      f.tumble.rollDir=choice==='away'?away:choice==='through'?-away:0;
      return f.tumble.rollDir;
    }
    cpuRollChaseInput(f, foe) {
      const roll = foe.floorAction, brain = this.bot;
      if (roll?.type !== 'techRoll' && roll?.type !== 'getupRoll') {
        brain.rollChase = null;
        return null;
      }
      if (roll.time + 1e-8 < 6 / 60 || f.ground < 0 || foe.ground !== f.ground || Math.abs(foe.x - f.x) > 230)
        return null;
      let chase = brain.rollChase;
      if (chase?.roll !== roll) {
        // Read the visible roll. Remember in or away relative to the rival, including on a mirrored stage.
        const side = roll.dir * (Math.sign(foe.x - f.x) || f.face);
        const follow = this.random() < (brain.lastRoll === side ? 0.78 : 0.30);
        brain.lastRoll = side;
        chase = brain.rollChase = { roll, follow, swung: false };
      }
      if (!chase.follow || chase.swung || f.stun || f.grip || f.dodge || f.shield || f.charge >= 0) return null;
      if (f.attack || f.landingLag || f.command) return idleInput;
      const floor = this.terrain[f.ground], low = moves[f.kit.tilts.down], travel = rollDistance(foe, roll) * roll.dir;
      const now = rollProgress(roll, roll.time);
      const position = time => clamp(foe.x + travel * (rollProgress(roll, time) - now), floor.x1 + 2, floor.x2 - 2);
      const ahead = position(roll.time + low.start);
      const reach = low.box[0] + low.box[2] + foe.stats.width - 4;
      if (protectionTime(foe) < low.start && Math.abs(ahead - f.x) <= reach) {
        chase.swung = true;
        return { ...idleInput, x: (Math.sign(ahead - f.x) || f.face) * 0.5, y: 1, tapped: { attack: true } };
      }
      const end = position(roll.duration), dir = Math.sign(end - f.x);
      if (f.run?.face === dir && f.vx * dir > 0) {
        const dash = moves[f.kit.dashAttack], speed = Math.abs(f.vx) * dash.carry;
        const travelTime = Math.min(dash.start, speed / dash.brake);
        const carry = speed * travelTime - 0.5 * dash.brake * travelTime * travelTime;
        const gap = (position(roll.time + dash.start) - f.x) * dir;
        const room = dir > 0 ? floor.x2 - f.x : f.x - floor.x1;
        if (protectionTime(foe) < dash.start && gap > 0 && gap <= carry + dash.box[0] + dash.box[2] + foe.stats.width - 4 &&
            room > speed * speed / (2 * dash.brake) + f.stats.width) {
          chase.swung = true;
          return { ...idleInput, x: dir, tapped: { attack: true } };
        }
      }
      return { ...idleInput, x: Math.abs(end - f.x) > reach - 8 ? Math.sign(end - f.x) : 0 };
    }
    cpuWavelandInput(f, foe) {
      const brain = this.bot, platform = foe.ground, floor = this.terrain[platform];
      if (!floor || !foe.shield || protectionTime(foe) || f.stun || f.tumble || f.grip || f.attack || f.ledge) {
        brain.wavePlatform = null;
        return null;
      }
      const dx = foe.x - f.x, gap = Math.abs(dx), dir = Math.sign(dx);
      const box = grabs[f.kit.grab].box, reach = box[0] + box[2] + foe.stats.width;
      if (brain.wavePlatform !== platform) brain.wavePlatform = null;
      if (brain.wavePlatform === platform) {
        if (f.airDodge || (f.waveSlide && f.landingLag > 3 / 60)) return idleInput;
        brain.wavePlatform = null;
        if (f.ground === platform && gap <= reach && dx * f.face > 0)
          return { ...idleInput, tapped: { grab: true } };
      }
      const height = floor.y - f.y;
      if (f.ground >= 0 || f.airDodge || f.usedDodge || f.vy < 0 || height < 10 || height > 58 ||
          f.dodge || f.floorAction || f.command || dx * f.face <= 0 || gap < reach + 6 ||
          gap > reach + 100 || this.floorAhead(f, 0.45) !== platform) return null;
      const kit = f.kit.airDodge;
      let previous = 0;
      for (let frame = kit.travel[0]; frame <= kit.travel[1]; frame++) {
        const travel = diagonal * kit.distance * dodgeProgress(kit, frame / 60);
        const at = platform === arenas[this.geometryStage]?.movingPlatform && !this.layout ?
          platforms(this.geometryStage, this.time + frame / 60)[platform] : floor;
        if (f.y + travel >= at.y) {
          const contact = f.x + dir * travel - at.x1;
          const span = at.x2 - at.x1;
          if (contact < 3 || contact > span - 3) return null;
          // Measure the slide and the defender's position relative to the same deck.
          let stop = contact, velocity = (travel - previous) * 60 * slideCarry;
          for (let tick = 1; tick < kit.directional[3]; tick++) {
            velocity = Math.max(0, velocity - f.kit.footwork.traction * slideFriction / 60);
            stop += dir * velocity / 60;
          }
          const remaining = (foe.x - floor.x1 - stop) * dir;
          if (stop < 4 || stop > span - 4 || remaining < -foe.stats.width || remaining > reach - 3) return null;
          brain.wavePlatform = platform;
          brain.hold = brain.guard = brain.jumpHold = 0;
          brain.hop = null;
          return { ...idleInput, x: dir, y: 1, shield: true, tapped: { shield: true } };
        }
        previous = travel;
      }
      return null;
    }
    cpuBackAirInput(f, foe) {
      const brain = this.bot;
      let pass = brain.backAir;
      if (!pass) {
        const run = f.run, floor = this.terrain[f.ground];
        if (!run || !floor || f.ground !== foe.ground || !foe.shield || f.attack || f.stun || f.landingLag ||
            f.shield || f.charge >= 0 || run.turned || run.age < f.kit.footwork.reverseFrames / 60 ||
            f.vx * run.face < f.stats.speed * 0.75 || brain.passRead === run) return null;
        // A worn shield or a recent grab escape gives the CPU a reason to try a passing aerial.
        if (foe.shieldHP > 0.84 && !foe.regrabLock) return null;
        const gap = (foe.x - f.x) * run.face;
        const runway = run.face > 0 ? floor.x2 - foe.x : foe.x - floor.x1;
        if (gap < 72 || gap > 125 || runway < f.stats.width + foe.stats.width + 50) return null;
        brain.passRead = run;
        if (this.random() >= 0.43) return null;
        const flight = 2 * f.stats.jump * 0.6 / (1540 * f.kit.gravity);
        const carry = Math.abs(f.vx) * (jumpSquatTime + flight) - (f.stats.width + foe.stats.width) * 0.75;
        pass = brain.backAir = { dir: run.face, ground: f.ground, takeoffGap: Math.min(110, carry),
          phase: 'run', frames: 0, airborne: false };
        brain.hop = null;
        brain.hold = brain.guard = brain.jumpHold = 0;
      }
      if (f.ground < 0) pass.airborne = true;
      if (f.stun || f.tumble || f.grip || f.ledge || f.airDodge || ++pass.frames > 62 ||
          (pass.airborne && f.ground >= 0) || (pass.phase === 'run' && (!f.run || !foe.shield))) {
        brain.backAir = null;
        return null;
      }
      if (pass.phase === 'run') {
        if ((foe.x - f.x) * pass.dir > pass.takeoffGap) return { ...idleInput, x: pass.dir };
        pass.phase = 'jump';
        return { ...idleInput, x: -pass.dir, jump: true, tapped: { jump: true } };
      }
      if (pass.phase === 'jump' && f.jumpSquat) {
        pass.phase = 'swing';
        return { ...idleInput, x: pass.dir, aimStick: true, smashX: pass.dir };
      }
      const floor = this.terrain[pass.ground];
      const runout = pass.dir > 0 ? floor.x2 - f.x : f.x - floor.x1;
      return { ...idleInput, x: runout > f.stats.width + 35 ? pass.dir : -pass.dir };
    }
    // Take intermediate platforms when the occupied one is above a single full jump.
    // Each leg spends a grounded jump, so the dog still has its air jump if intercepted.
    cpuAscentInput(f, goal, foe) {
      const brain = this.bot, floors = this.terrain, dest = floors[goal.ground];
      if (!dest?.thin || f.stun || f.tumble || f.grip || f.ledge || f.airDodge || f.floorAction ||
          f.shield || f.shieldStun || f.respawning || f.ground === goal.ground) {
        brain.ascent = null;
        return null;
      }
      let route = brain.ascent;
      if (route && route.goal !== goal.ground) route = brain.ascent = null;
      if (!route) {
        const from = floors[f.ground];
        if (!from || f.attack || f.charge >= 0) return null;
        const peak = f.stats.jump ** 2 / (2 * 1540 * f.kit.gravity) - f.stats.jump / 120;
        const moving = !this.layout && goal.ground === arenas[this.geometryStage]?.movingPlatform;
        let step = goal.ground;
        if (from.y - dest.y <= peak) {
          if (!moving) return null;
        } else {
          // Score both wings by the ground approach and the horizontal gap to the next tier.
          step = -1;
          let best = Infinity;
          for (const [i, p] of floors.entries()) {
            if (!p.thin || p.y >= from.y || from.y - p.y > peak || p.y <= dest.y || p.y - dest.y > peak) continue;
            const gap = Math.max(0, dest.x1 - p.x2, p.x1 - dest.x2);
            if (gap > f.kit.airDrift.speed * f.stats.jump / (1540 * f.kit.gravity)) continue;
            const cost = Math.abs(f.x - clamp(f.x, p.x1 + 18, p.x2 - 18)) +
              Math.abs(goal.x - clamp(goal.x, p.x1 + 18, p.x2 - 18)) * 0.5;
            if (cost < best) { best = cost; step = i; }
          }
          if (step < 0) return null;
        }
        route = brain.ascent = { goal: goal.ground, step, from: f.ground, swung: false };
        brain.hop = brain.backAir = null;
      }
      if (f.ground === route.step) {
        route.from = route.step;
        route.step = route.goal;
        route.settle = 8;
      }
      if (f.ground >= 0 && f.ground !== route.from) { brain.ascent = null; return null; }
      const to = floors[route.step], from = floors[route.from];
      const inset = route.step === route.goal ? 24 : 50;
      let landing = clamp(goal.x, to.x1 + inset, to.x2 - inset);
      if (!this.layout && route.step === arenas[this.geometryStage]?.movingPlatform) {
        // Lead the ferry by this dog's remaining flight to its descending crossing.
        const airborne = f.ground < 0, gravity = 1540 * f.kit.gravity;
        const vy = airborne ? f.vy : -f.stats.jump;
        const disc = vy * vy + 2 * gravity * (to.y - f.y);
        const flight = Math.max(0, (Math.sqrt(Math.max(0, disc)) - vy) / gravity);
        const squat = airborne ? 0 : Math.max(0, jumpSquatTime - (f.jumpSquat?.time || 0));
        landing += platforms(this.geometryStage, this.time + squat + flight)[route.step].x1 - to.x1;
      }
      const takeoff = clamp(landing, from.x1 + 18, from.x2 - 18);
      if (f.ground >= 0 && !f.jumpSquat) {
        if (route.settle > 0) { route.settle--; return idleInput; }
        const gap = takeoff - f.x;
        if (Math.abs(gap) > 35) return { ...idleInput, x: Math.sign(gap) };
        if (f.prev.jump || f.landingLag || f.attack) return idleInput;
        return { ...idleInput, jump: true };
      }
      const dx = landing - f.x - f.vx * 0.15;
      const x = Math.abs(dx) < 5 ? 0 : clamp(dx / 42, -1, 1);
      const input = { ...idleInput, x, jump: !!f.jumpSquat };
      if (route.step === route.goal && f.ground < 0 && !route.swung && !f.attack && !protectionTime(foe)) {
        const move = moves[f.kit.air.up], t = move.start, [bx, by, rx, ry] = move.box;
        const rise = f.vy*t + 0.5*1540*f.kit.gravity*t*t;
        if (Math.abs(foe.x + foe.vx*t - f.x - f.vx*t - bx*f.face) <= rx + foe.stats.width &&
            Math.abs(foe.y - bodyHeight(foe)*0.5 - f.y - rise - by) <= ry + bodyHeight(foe)*0.32) {
          route.swung = true;
          return { ...input, y: -1, attack: true, tapped: { attack: true } };
        }
      }
      return input;
    }
    cpuPlatformInput(f, foe) {
      const brain = this.bot;
      const floor = this.terrain[foe.ground];
      const strike = moves[f.kit.air.down], [x, y, rx, ry] = strike.box;
      const targetX = foe.x + foe.vx * strike.start;
      const reach = Math.abs(targetX - (f.x + f.vx * strike.start + f.face * x));
      if (!floor || foe.shield || protectionTime(foe) || f.stun || f.attack || f.grip || f.dodge ||
          f.shield || f.shieldDrop || f.charge >= 0 || f.landingLag ||
          f.x < floor.x1 + 10 || f.x > floor.x2 - 10 || reach > rx + foe.stats.width) {
        brain.platformRoute = null;
        return null;
      }
      let route = brain.platformRoute;
      if (!route) {
        const height = foe.y - f.y;
        const descending = f.ground < 0;
        if (brain.timer > 0 || height < 55 || height > (descending ? 290 : 200)) return null;
        if (descending && (this.cpuLevel !== 'rival' || !controlsFall(f) || f.command || f.floorAction)) return null;
        const perch = descending ? this.floorAhead(f,.24) : f.ground;
        if (!this.terrain[perch]?.thin || this.terrain[perch].y >= floor.y) return null;
        route = brain.platformRoute = { perch, landing: foe.ground, airFrames: 0, descending };
        brain.hop = null;
        brain.jumpHold = brain.guard = brain.hold = 0;
      }
      if (foe.ground !== route.landing || (f.ground >= 0 && f.ground !== route.perch)) {
        brain.platformRoute = null;
        return null;
      }
      if (f.ground === route.perch)
        return f.prev.y >= 0.74 && !f.dropPrep ? idleInput : { ...idleInput, y: 1 };
      if (route.descending) {
        const next = this.floorAhead(f,.24);
        if (this.terrain[next]?.thin && this.terrain[next].y < floor.y) return {...idleInput,y:1};
        if (!strike.plunge && f.y + f.vy*strike.start >= floor.y) {
          const quick = moves[f.kit.air.neutral], [cx,, radius] = quick.box;
          if (quick.start < strike.start && Math.abs(targetX - f.x - cx*f.face) <= radius + foe.stats.width) {
            brain.platformRoute = null;
            return {...idleInput,attack:true,tapped:{attack:true}};
          }
        }
      }
      // Release Down before the aerial. Read the rival's height against this dog's own active window.
      route.airFrames++;
      const travel = strike.plunge ? 685 * Math.min(strike.active / 2, 0.09)
        : f.kit.fastFallSpeed * (strike.start + Math.min(strike.active / 2, 0.09));
      if ((!route.descending && route.airFrames < 2) || f.y + y + ry + travel < foe.y - bodyHeight(foe) * 0.92) return idleInput;
      brain.platformRoute = null;
      return { ...idleInput, y: 1, attack: true, tapped: { attack: true } };
    }
    observeLedgeExit(f,roll){
      if(f.index!==0)return;
      const scout=this.rollPractice?.pattern==='scout'?this.rollPractice:
        this.mode==='solo' && this.cpuLevel==='rival'?this.bot:null;
      if(!scout)return;
      const guard=this.dogs[1];
      if(guard.stockLift || guard.respawning || Math.abs(guard.x-f.ledge.x)>360 || Math.abs(guard.y-f.ledge.y)>180)return;
      if(scout.rollForecast?.edge===f.ledge)scout.rollForecast.rolled=roll;
      if(!roll){scout.rollHabit=null;return;}
      const previous=scout.rollHabit,delay=Math.min(f.ledgeTime,2.5);
      scout.rollHabit={count:previous?2:1,delay:previous?(previous.delay+delay)/2:delay};
    }
    predictLedgeRoll(guard,climber,scout){
      const edge=climber.ledge;
      let plan=scout.rollForecast;
      if(guard.ground<0 || guard.stun || guard.grip || guard.attack || guard.floorAction || guard.shieldBreak ||
          guard.shield || guard.landingLag || guard.charge>=0 || guard.smashCharge || guard.jumpSquat){
        if(plan)plan.closed=true;
        return null;
      }
      if(edge && edge!==plan?.edge && scout.rollHabit?.count===2 && guard.ground===edge.index && Math.abs(guard.x-edge.x)<235){
        const floor=this.terrain[edge.index],inward=edge.left?1:-1,roll=climber.kit.ledgeRoll,grab=grabs[guard.kit.grab];
        const landing=edge.x+inward*Math.min(roll.distance,floor.x2-floor.x1-2);
        const face=(landing-guard.x)*inward>=0?inward:-inward;
        const x=clamp(landing-face*Math.min(grab.box[0],65),floor.x1+guard.stats.width,floor.x2-guard.stats.width);
        const strikeAt=this.time-climber.ledgeTime+scout.rollHabit.delay+(roll.arrive+3)/60-grab.start;
        if(strikeAt<this.time-.05)return null;
        plan=scout.rollForecast={edge,x,face,strikeAt};
        scout.ledgeRollReads=(scout.ledgeRollReads || 0)+1;
      }
      if(!plan || plan.closed || plan.thrown)return null;
      if(guard.ground!==plan.edge.index || this.time>plan.strikeAt+.12){plan.closed=true;return null;}
      const gap=plan.x-guard.x;
      if(Math.abs(gap)>8)return {...idleInput,x:Math.sign(gap)*.63};
      if(guard.face!==plan.face)return {...idleInput,x:plan.face*.5};
      if(this.time+1e-8<plan.strikeAt)return idleInput;
      plan.thrown=true;plan.grabAt=this.time;
      return {...idleInput,grab:true,tapped:{grab:true}};
    }
    ledgeSmashInput(f, foe, brain) {
      const edge = foe.ledge, plan = brain.ledgeTrap;
      if (plan && !f.smashCharge) plan.released = true;
      if (f.kind !== 'brisket' || f.stun || f.grip || f.shieldBreak || f.floorAction || f.attack || f.ground < 0) return null;
      if (plan && !plan.released && f.smashCharge?.side === 'side') {
        const action = foe.floorAction;
        // Commit as the climb or roll becomes visible. A patient opponent can wait out the charge.
        const opening = action?.type === 'ledgeClimb' ? foe.kit.ledgeClimb.protectedThrough - 12 : 4;
        const exposed = !edge && (!action || action.time * 60 >= opening);
        if (exposed || this.time + 1e-8 >= plan.deadline) {
          plan.released = true;
          return idleInput;
        }
        return {...idleInput,smash:true,smashX:f.face};
      }
      if (!edge || plan?.edge === edge || f.smashCharge || f.command || f.charge >= 0 || f.shield || f.landingLag ||
          f.run || f.ground !== edge.index || f.face !== (edge.left ? -1 : 1)) return null;
      const gap = (edge.x - f.x) * f.face, move = smashes[f.kit.smashes.side];
      const reach = move.box[0]+move.box[2]+foe.stats.width;
      if (gap < reach || gap > reach+foe.kit.ledgeClimb.distance-3) return null;
      brain.ledgeTrap = {edge, deadline:this.time + (52 + Math.floor(this.random()*18))/60};
      return {...idleInput,smash:true,smashX:f.face};
    }
    cpuRecoveryInput(f, closest, inside, under, unsafe, result) {
      if (f.attack?.charging) {
        result.x = Math.sign(inside - f.x);
        result.special = f.attack.chargeTime < (f.y > closest.y + 60 ? 0.36 : 0.22);
        return result;
      }
      if (f.attack?.moveId === 'cloverSail') {
        result.x = Math.sign(inside - f.x);
        result.special = !under || f.y > closest.y - 32;
        return result;
      }
      if (unsafe) {
        if (this.cpuLevel === 'rival' && !f.tumble && !f.stun && !f.attack && !f.wallAction && !f.airDodge &&
            f.y - f.stats.height > closest.y + 4) {
          const outward = f.x < (closest.x1 + closest.x2)/2 ? -1 : 1;
          const lip = outward < 0 ? closest.x1 : closest.x2;
          if ((f.x - lip) * outward < f.stats.width * .45 + 2)
            return {...idleInput, x:outward};
        }
        if (this.cpuLevel === 'rival' && f.kit.wallKick && !f.usedWallKick && !f.jumps && !f.attack &&
            !f.tumble && !f.stun && !f.wallAction && !f.airDodge && f.y > closest.y + 78) {
          const away = f.x < (closest.x1 + closest.x2)/2 ? -1 : 1;
          if (this.wallForKick(f, away)) return { ...idleInput, x:away, tapped:{jump:true} };
        }
        this.bot.platformRoute = null;
        this.bot.hop = null;
        result.x = Math.sign(inside - f.x);
        if (!f.stun && !f.dodge) {
          const secondHop = f.kind === 'pip' && f.hopWindow > 0 && f.vy > -395;
          const canHook = f.kind === 'noodle' && !f.usedUp && this.nearestLedge(f, 180, -24, 155);
          if (
            secondHop ||
            (!f.attack && (canHook || (!f.usedUp && !f.jumps && f.y > closest.y + 5 && f.vy > -140)))
          ) {
            result.y = -1;
            result.special = true;
            result.tapped = { special: true };
          } else if (!f.attack && f.vy > 30 && f.y > closest.y - 13 && f.jumps > 0) result.jump = true;
        }
        return result;
      }
      return null;
    }
    rivalEdgeHop(f, foe, floor, left, right) {
      const plan = this.bot.edgeHop;
      if (plan) {
        if (f.stun || f.grip || f.tumble || f.ledge || f.airDodge || f.wallAction || f.stockLift ||
            this.time > plan.until || (f.ground >= 0 && !f.jumpSquat) || (plan.swung && !f.attack && !f.command)) {
          this.bot.edgeHop = null;
          return null;
        }
        if (f.jumpSquat) return {...idleInput,x:plan.outward};
        if (!plan.swung && this.time >= plan.swingAt) {
          plan.swung = true;
          return {...idleInput,x:plan.outward,aimStick:true,smashX:plan.outward,tapped:{aimStick:true}};
        }
        return {...idleInput,x:plan.swung ? -plan.outward : plan.outward};
      }
      if (f.ground < 0 || f.attack || f.stun || f.command || f.landingLag || f.shield || f.shieldDrop ||
          f.impactLag || f.floorAction || f.jumpSquat || f.charge >= 0 || f.grip || f.run?.turned ||
          !floor || floor.thin || foe.ground >= 0 || foe.ledge || foe.stockLift || foe.attack || foe.airDodge ||
          protectionTime(foe) || foe.absent) return null;
      const outward = foe.x < left ? -1 : foe.x > right ? 1 : 0;
      const lip = outward < 0 ? left : right;
      if (!outward || f.face !== outward || outward*(lip-f.x) > 38 || outward*(lip-f.x) < -6 ||
          outward*(foe.x-lip) < 48 || outward*(foe.x-lip) > 155 ||
          foe.y >= floor.y-38 || foe.y < floor.y-180 || foe.vy < -190) return null;
      const move = moves[f.kit.air.forward], [cx,cy,rx,ry] = move.box;
      // Project the current flight only. A jump or dodge after takeoff can beat the commitment.
      const windup = 8/60, flight = windup+move.start, contact = jumpSquatTime+flight;
      const guardY = f.y-f.stats.jump*.6*flight+770*f.kit.gravity*flight*flight;
      const rivalY = foe.y+foe.vy*contact+770*foe.kit.gravity*contact*contact;
      const reach = (foe.x+foe.vx*contact-f.x)*outward;
      const drift = Math.min(f.kit.airDrift.speed*flight, Math.max(0,f.vx*outward)*flight+f.kit.airAccel*flight*flight*.5);
      if (Math.abs(reach-drift-cx) > rx+foe.stats.width-5 ||
          Math.abs(rivalY-bodyHeight(foe)*.52-guardY-cy) > ry+bodyHeight(foe)*.4-4) return null;
      this.bot.hop = null;
      this.bot.edgeHop = {outward,swingAt:this.time+jumpSquatTime+windup,until:this.time+1,swung:false};
      return {...idleInput,x:outward,jump:true,shortHop:true,tapped:{jump:true}};
    }
    cpuCoverLip(f, foe) {
      const floor = this.terrain[f.ground];
      if (!floor || floor.thin || f.stun || f.grip || f.shield || f.shieldDrop || f.attack || f.charge >= 0 ||
          f.landingLag || f.ledge || f.dodge || f.floorAction || f.jumpSquat || foe.floorAction || foe.attack?.edge ||
          foe.ground >= 0 || (!foe.ledge && !foe.ledgeLock)) return null;
      const dir = foe.x < floor.x1 ? -1 : foe.x > floor.x2 ? 1 : 0;
      const lip = dir < 0 ? floor.x1 : floor.x2;
      if (!dir || Math.abs(foe.x - lip) > 55 || Math.abs(f.x - lip) > 95 ||
          Math.abs(foe.y - floor.y) > 85) return null;
      const move = moves[f.kit.tilts.down], [x,y,rx,ry] = move.box, height = bodyHeight(foe);
      const t = move.start, rise = foe.ledge ? 0 : foe.vy*t + 770*foe.kit.gravity*t*t;
      if (f.face === dir && !f.run && protectionTime(foe) <= t &&
          Math.abs(foe.x + foe.vx*t - f.x - dir*x) <= rx + foe.stats.width &&
          Math.abs(foe.y + rise - height*.52 - f.y - y) <= ry + height*.4)
        return { ...idleInput, y: 1, tapped: { attack: true } };
      return { ...idleInput, x: dir * .5 };
    }
    cpuPlatformGuard(f, foe, floor) {
      const incoming = foe.attack;
      if (!this.terrain[f.ground]?.thin || f.attack || f.stun || f.grip || f.floorAction ||
          f.shieldDrop || f.jumpSquat || f.charge >= 0 || f.landingLag || foe.ground >= 0 ||
          incoming?.airSide !== 'up' || foe.y <= f.y || protectionTime(foe)) return null;
      const dx = foe.x - f.x;
      if (f.shield && f.shieldGrabWindow > 0) {
        const [x,,reach] = moves[f.kit.air.down].box;
        const inReach = Math.abs(dx - f.face * x) <= reach + foe.stats.width;
        if (!floor || !inReach || f.x < floor.x1 + 32 || f.x > floor.x2 - 32) return { ...idleInput, shield: true };
        if (f.guardIntent === 'platformDrop') return { ...idleInput, shield: true };
        return { ...idleInput, shield: true, x: Math.sign(dx) || f.face, y: 1, attack: true };
      }
      const lead = Math.max(0, incoming.start - incoming.time);
      const [x, y, rx, ry] = incoming.box;
      if (incoming.time >= incoming.start + incoming.active ||
          Math.abs(dx + foe.vx * lead + x * foe.face) > rx + f.stats.width ||
          Math.abs(foe.y + foe.vy * lead + y - (f.y - bodyHeight(f) / 2)) > ry + bodyHeight(f) / 2)
        return null;
      return { ...idleInput, shield: true };
    }
    cpuTiltChoice(f, foe, preferred, exposedOnly = false) {
      const dx = foe.x - f.x, face = Math.sign(dx) || f.face;
      const id = side => side === 'neutral' ? f.kit.ground[f.chainWindow > 0 ? f.chainNext : 0] : f.kit.tilts[side];
      const repeated = moveFreshness(f, id(preferred)) < 0.86;
      const options = exposedOnly ? ['down','up','forward','neutral'] : repeated ? [preferred, 'neutral', 'forward', 'down', 'up'] : [preferred];
      let best = null, power = -1;
      for (const side of options) {
        if ((side === 'forward' && f.run) || (side === 'neutral' && face !== f.face)) continue;
        const moveId = id(side), move = moves[moveId];
        const [x, y, rx, ry] = move.box;
        const gap = Math.abs(dx) + foe.vx * face * move.start;
        const height = foe.y + foe.vy * move.start - bodyHeight(foe) * 0.52 - f.y;
        if (Math.abs(gap - x) > rx + foe.stats.width || Math.abs(height - y) > ry + bodyHeight(foe) * 0.4) continue;
        if (exposedOnly && shieldContact(foe, { x: f.x + face * x - foe.vx * move.start,
          y: f.y + y - foe.vy * move.start, rx, ry })) continue;
        const freshness = moveFreshness(f, moveId);
        if (freshness > power) { best = side; power = freshness; }
      }
      return best;
    }
    cpuSpecialTurnInput(f, foe, floor, unsafe) {
      const brain = this.bot, plan = brain.specialTurn;
      if (plan) {
        brain.specialTurn = null;
        if (unsafe || f.ground >= 0 || f.grip || f.stun || f.ledge) return null;
        if (plan.step === 'flick') return f.attack?.airNeutral ? { ...idleInput, x: -f.face } : null;
        if (f.attack || f.specialFlick?.dir !== -f.face) return null;
        if (plan.turn === 'wavebounce') brain.specialTurn = { step: 'flick' };
        return { ...idleInput, special: true, tapped: { special: true } };
      }
      if (unsafe || brain.timer > 0 || f.ground >= 0 || f.attack || f.command || f.stun || f.tumble || f.dodge ||
          f.ledge || f.grip || f.vx * f.face < f.kit.airDrift.speed * 0.45 ||
          protectionTime(foe) || foe.ledge || foe.grip || (foe.shield && f.kind !== 'brisket')) return null;
      const behind = (foe.x - f.x) * f.face < -5;
      const safeX = f.x - f.vx * 0.25, canReverse = safeX > floor.x1 + 18 && safeX < floor.x2 - 18;
      if (!behind && (!canReverse || !['noodle','clover'].includes(f.kind) || !(foe.attack || foe.vx * f.face < -120))) return null;
      const turn = behind ? (canReverse ? 'bReverse' : 'turnaround') : 'wavebounce';
      const move = specials[f.kit.specials.neutral], t = move.start + (turn === 'bReverse' ? 0 : 1 / 60);
      const nextY = f.y + f.vy * t + 770 * f.kit.gravity * t * t;
      const rivalY = foe.ground >= 0 ? foe.y : foe.y + foe.vy * t + 770 * foe.kit.gravity * t * t;
      const nextX = f.x + (canReverse ? -f.vx : f.vx) * t;
      const gap = (foe.x + foe.vx * t - nextX) * (behind ? -f.face : f.face);
      const [x, y, rx, ry] = move.box;
      const reach = move.projectile ? 185 : x + rx;
      if (nextY >= floor.y || gap < Math.max(-2, x - rx - foe.stats.width) || gap > reach + foe.stats.width - 5 ||
          Math.abs(rivalY - bodyHeight(foe) * 0.52 - nextY - y) > ry + bodyHeight(foe) * 0.4 - 4) return null;
      brain.hop = null;
      brain.timer = 0.45;
      brain.specialTurn = { turn, step: turn === 'bReverse' ? 'flick' : 'cast' };
      return turn === 'bReverse' ? { ...idleInput, special: true, tapped: { special: true } } : { ...idleInput, x: -f.face };
    }
    cpuSweetAerial(f, foe) {
      if (f.ground >= 0 || f.attack || f.command || f.stun || f.tumble || f.airDodge || f.ledge ||
          foe.shield || foe.ledge || protectionTime(foe)) return null;
      const side = sweetAerialSide[f.kind], move = moves[f.kit.air[side]], t = move.start;
      if (this.floorAhead(f, t) >= 0) return null;
      const y = f.y + f.vy*t + 770*f.kit.gravity*t*t;
      const landing = foe.ground < 0 ? this.floorAhead(foe,t) : foe.ground;
      const feet = landing >= 0 ? this.terrain[landing].y : foe.y + foe.vy*t + 770*foe.kit.gravity*t*t;
      const centerX = foe.x + (foe.vx - f.vx)*t;
      if (!sweetSpotAt(f, move, centerX, feet - bodyHeight(foe)*.52 - (y-f.y))) return null;
      this.bot.hop = null;
      this.bot.hold = this.bot.guard = 0;
      this.bot.timer = .2;
      return { ...idleInput, aimStick:true, smashX:side === 'back' ? -f.face : 0,
        smashY:side === 'up' ? -1 : 0, tapped:{aimStick:true} };
    }
    cpuDownAir(f, foe, floor) {
      if (f.ground >= 0 || f.attack || f.stun || f.tumble || f.airDodge || f.ledge || f.command ||
          protectionTime(foe) || foe.shield || foe.ledge || foe.y - f.y < foe.stats.height * 0.42 ||
          (foe.ground >= 0 && foe.damage < 45)) return null;
      const move = moves[f.kit.air.down], t = move.start;
      const x = f.x + f.vx * t;
      const off = x < floor.x1 + 4 || x > floor.x2 - 4;
      if (off && (move.plunge || (!f.jumps && f.usedUp) || f.y > floor.y + 10 ||
          x < floor.x1 - 80 || x > floor.x2 + 80)) return null;
      const y = move.plunge ? f.y : f.y + f.vy * t + 770 * f.kit.gravity * t * t;
      const rivalY = foe.ground >= 0 ? foe.y : foe.y + foe.vy * t + 770 * foe.kit.gravity * t * t;
      const [cx, cy, rx, ry] = move.box;
      if (Math.abs((foe.x + foe.vx * t - x) * f.face - cx) > rx + foe.stats.width - 4 ||
          Math.abs(rivalY - bodyHeight(foe) * 0.52 - (y + cy)) > ry + bodyHeight(foe) * 0.4 - 4) return null;
      this.bot.hop = null;
      this.bot.hold = this.bot.guard = 0;
      this.bot.timer = 0.2;
      return { ...idleInput, x: off ? Math.sign((floor.x1 + floor.x2) / 2 - f.x) : 0,
        aimStick: true, smashY: 1, tapped: { aimStick: true } };
    }
    cpuDashShield(f, foe) {
      const swing = foe.attack;
      if (!swing?.box || swing.projectile || (swing.smashSide !== 'side' && swing.tiltSide !== 'forward') ||
          swing.time < 2 / 60 || swing.time >= swing.start + swing.active ||
          f.ground < 0 || f.ground !== foe.ground || f.attack || f.grip || f.floorAction || f.stun ||
          f.impactLag || f.shieldStun || f.shieldGrabWindow || f.command || f.jumpSquat ||
          (!dashShieldReady(f) && !(f.shield && f.brakingShield))) return null;
      const dir = Math.sign(foe.x - f.x), gap = Math.abs(foe.x - f.x);
      if (foe.face !== -dir || (!f.shield && f.run.face !== dir)) return null;
      const windup = Math.max(0, swing.start - swing.time);
      const [offset,,radius] = swing.box;
      const closing = (f.vx - foe.vx) * dir;
      if (windup > .15 || gap - closing * windup > offset + radius + f.stats.width + 8) return null;
      return {...idleInput, x:f.shield ? 0 : dir, shield:true};
    }
    cpuDiscResponse(f) {
      if (f.ground < 0 || f.stun || f.impactLag || f.grip || f.attack || f.command || f.floorAction ||
          f.charge >= 0 || f.smashCharge || f.jumpSquat || f.respawning) return null;
      for (const d of this.projectiles) {
        if (d.owner === f.index || d.type === 'snare' || d.caught || !d.vx) continue;
        const dx = d.x-f.x, approach = -Math.sign(dx)*d.vx;
        if (f.kit.crawl && !f.dodge && !f.jumpBuffer && !f.dropPrep && (d.type === 'return' || d.type === 'drive')) {
          const gap = Math.abs(dx) - f.stats.width - 16;
          if (gap <= 0 || (approach > 0 && gap <= approach * .22)) {
            const lead = gap > 0 ? gap / approach : 0;
            const height = f.y - d.y - d.vy * lead;
            if (height > f.kit.crawl.height + 9 && height < 81 && !f.shield && !f.shieldDrop) {
              const dir = Math.sign(this.dogs[d.owner].x - f.x);
              return {...idleInput,x:dir * .6,y:.68};
            }
          }
        }
        if (approach <= 0 || Math.abs(d.y-f.y+40)>52) continue;
        const arrival = (Math.abs(dx)-f.stats.width-16)/approach;
        if (d.reflected && arrival >= -.09 && arrival <= .24)
          return {...idleInput,shield:true};
        if (f.kind !== 'pip' || f.shield || f.shieldDrop || f.face*dx <= 0) continue;
        const bark = specials.pipBark, [offset,,radius] = bark.box;
        const toMuzzle = (Math.abs(dx)-offset-radius-14)/approach;
        if (toMuzzle < bark.second.start-2/60 || toMuzzle > .36) continue;
        if (d.type === 'return' && !d.back && d.age+toMuzzle > .46 && Math.abs(dx)>240) continue;
        if (toMuzzle > bark.second.start+2/60) return idleInput;
        return {...idleInput,special:true,tapped:{special:true}};
      }
      return null;
    }
    cpuLiftExit(f, foe) {
      const lift = f.stockLift;
      if (!lift.ready) return idleInput;
      const dx = foe.x - f.x, move = foe.attack;
      const camping = Math.abs(dx) < 145 && foe.y > f.y && foe.y - f.y < 195;
      if (camping && (foe.smashCharge || (move && move.time < move.start + move.active)) &&
          lift.time < liftArrival + 0.38) return idleInput;
      const floor = this.terrain[lift.landing], space = floor.x2 - f.x > f.x - floor.x1 ? 1 : -1;
      let side = dx ? -Math.sign(dx) : space;
      if (f.x + side * 82 < floor.x1 + 12 || f.x + side * 82 > floor.x2 - 12) side = space;
      return { ...idleInput, y: 1, x: camping ? side * 0.84 : 0 };
    }
    cpuWaitForReturn(f, foe) {
      if ((!foe.stockLift && !foe.stockGuard) || f.ground < 0 || f.stun || f.dodge || f.floorAction || f.grip) return null;
      if (f.attack || f.command) return idleInput;
      const dx = foe.x - f.x, floor = this.terrain[f.ground], jab = moves[f.kit.ground[0]];
      if (!foe.stockLift && foe.ground === f.ground && foe.stockGuard <= jab.start + 1e-8 && !foe.shield &&
          f.face * dx >= 0 && Math.abs(dx + (foe.vx - f.vx) * jab.start) <= jab.box[0] + jab.box[2] + foe.stats.width - 3)
        return { ...idleInput, tapped: { attack: true } };
      const away = dx ? -Math.sign(dx) : f.x < (floor.x1 + floor.x2) / 2 ? 1 : -1;
      const safe = clamp(foe.x + away * 158, floor.x1 + 38, floor.x2 - 38);
      const gap = safe - f.x;
      if (Math.abs(dx) < 152 && Math.abs(gap) > 7)
        return { ...idleInput, x: Math.sign(gap) * (Math.abs(gap) > 42 ? 1 : 0.48) };
      return { ...idleInput, shield: !foe.stockLift && Math.abs(dx) < 108 && Math.abs(foe.y - f.y) < 89 };
    }
    rookieNeutral(f, foe) {
      if (f.ground < 0 || f.ground !== foe.ground || f.floorAction || f.ledge || foe.ledge ||
          f.tumble || f.dodge || f.grip || protectionTime(foe)) return null;
      const brain = this.bot, dx = foe.x - f.x, dir = Math.sign(dx) || f.face;
      if (foe.floorAction) {
        brain.rookieNext = this.time + .28;
        return idleInput;
      }
      const tilt = moves[f.kit.tilts.forward], jab = moves[f.kit.ground[0]];
      const reach = tilt.box[0] + tilt.box[2] + foe.stats.width - 6;
      if (f.attack || f.command || f.stun || f.landingLag || f.clashRecoil || f.impactLag) return idleInput;
      if (Math.abs(dx) > reach || f.face !== dir) {
        brain.rookieNext = this.time + .28;
        return { ...idleInput, x: dir * (Math.abs(dx) > reach + 112 ? 1 : .5) };
      }
      brain.rookieNext ||= this.time + .28;
      if (this.time < brain.rookieNext) return idleInput;
      brain.rookieNext = this.time + .56 + this.random() * .24;
      if (foe.attack && foe.attack.time >= .1 && this.random() < .45) {
        brain.rookieGuard = this.time + .18;
        return { ...idleInput, shield:true };
      }
      if (foe.shield && Math.abs(dx) <= grabs[f.kit.grab].box[0] + grabs[f.kit.grab].box[2] + foe.stats.width &&
          this.random() < .52) return { ...idleInput, tapped:{grab:true} };
      if (foe.damage >= 75 && this.random() < .44) return { ...idleInput, smashX:dir, tapped:{smash:true} };
      const close = Math.abs(dx) <= jab.box[0] + jab.box[2] + foe.stats.width;
      return close && this.random() < .55 ? { ...idleInput, tapped:{attack:true} } :
        { ...idleInput, aimStick:true, tiltMode:true, smashX:dir };
    }
    attackCancelInput(f, foe) {
      if (foe.ground >= 0 || foe.ledge || foe.airDodge || foe.grip || protectionTime(foe) ||
          f.guardBuffer || f.command) return null;
      const source = cancelableWindup(f);
      if (!source) return null;
      const floor = this.terrain[f.ground], height = bodyHeight(foe);
      const reaches = (move, t, rise) => {
        const x = f.x + f.vx*t;
        if (x < floor.x1 + f.stats.width || x > floor.x2 - f.stats.width) return false;
        const feet = foe.y + foe.vy*t + 770*foe.kit.gravity*t*t;
        const [bx,by,rx,ry] = move.box;
        return Math.abs((foe.x + foe.vx*t - x)*f.face - bx) <= rx + foe.stats.width - 3 &&
          Math.abs(feet - height*.52 - (f.y + rise + by)) <= ry + height*.4 - 3;
      };
      const ground = f.attack || moves[source], elapsed = f.attack?.time ?? f.charge;
      for (let t = ground.start - elapsed; t < ground.start + ground.active - elapsed - 1e-8; t += 1/60) {
        if (reaches(ground,t,0)) return null;
      }
      const behind = (foe.x - f.x)*f.face < -8;
      const air = moves[f.kit.air[behind ? 'back' : 'up']], t = jumpSquatTime + air.start;
      const rise = -f.stats.jump*.60*air.start + 770*f.kit.gravity*air.start*air.start;
      if (this.floorAhead(foe,t) >= 0 || !reaches(air,t,rise)) return null;
      this.bot.hop = null;
      this.bot.timer = .25;
      return {...idleInput, x:behind ? -f.face : 0, y:behind ? 0 : -1, jump:true, tapped:{jump:true}};
    }
    tumbleReply(f,foe) {
      const swing=foe.attack;
      if (!f.tumble?.fromHit || !swing?.airSide || protectionTime(foe) || foe.ground>=0) return null;
      const dodge=this.canEscapeHitstun(f,false), aerial=this.canEscapeHitstun(f,true);
      if (!dodge && !aerial) return null;
      const overlaps=(striker,target,box,t)=>{
        const [x,y,rx,ry]=box, height=bodyHeight(target);
        const dx=target.x-striker.x+(target.vx-striker.vx)*t;
        const dy=target.y-striker.y+(target.vy-striker.vy)*t+770*(target.kit.gravity-striker.kit.gravity)*t*t;
        return Math.abs(dx*striker.face-x)<=rx+target.stats.width &&
          Math.abs(dy-height*.52-y)<=ry+height*.4;
      };
      let impact=Infinity;
      for (let n=1;n<=10;n++) {
        const t=n/60, beat=attackWindow(swing,swing.time+t);
        if (beat.box && swing.time+t+1e-8>=beat.start && swing.time+t<beat.start+beat.active-1e-8 &&
            overlaps(foe,f,beat.box,t)) {impact=t;break;}
      }
      if (aerial) {
        const toward=Math.sign(foe.x-f.x)||f.face, side=toward===f.face?'forward':'back';
        for (const aim of ['neutral',side,'down']) {
          const move=moves[f.kit.air[aim]];
          if (move.start>=impact || move.start>swing.end-swing.time || !overlaps(f,foe,move.box,move.start)) continue;
          return {...idleInput,aimStick:true,tapped:{aimStick:true},smashX:aim===side?toward:0,smashY:aim==='down'?1:0};
        }
      }
      const [,first,last]=f.kit.airDodge.neutral, wear=dodgeWear(f);
      if (dodge && impact>=(first+wear)/60 && impact<=(last-wear)/60)
        return {...idleInput,shield:true,tapped:{shield:true}};
      return null;
    }
    angledTiltInput(f, foe) {
      if (f.ground < 0 || f.run || f.attack || f.landingLag || f.stun || f.grip || f.shield || f.floorAction ||
          f.command || f.charge >= 0 || foe.ground >= 0 || foe.ledge || protectionTime(foe)) return null;
      const move = moves[f.kit.tilts.forward], [x,y,rx,ry] = move.box;
      const t = move.start, dx = foe.x + foe.vx*t - f.x;
      if (Math.abs(Math.abs(dx) - (x-3)) > rx + foe.stats.width - 3) return null;
      const height = bodyHeight(foe);
      const dy = foe.y + foe.vy*t + 770*foe.kit.gravity*t*t - height*.52 - (f.y+y);
      const reach = ry + height*.4, angle = Math.sign(dy);
      if (Math.abs(dy) <= reach || Math.abs(dy - angle * move.angleHeight) > reach - 2 ||
          this.floorAhead(foe, t) >= 0) return null;
      return { ...idleInput, aimStick:true, tiltMode:true, smashX:Math.sign(dx), smashY:angle*.5 };
    }
    runningAntiAir(f, foe) {
      if (!f.run || f.ground < 0 || f.attack || f.command || f.landingLag || f.stun || f.shield || f.charge >= 0 ||
          foe.ground >= 0 || foe.vy < 0 || foe.airDodge || foe.ledge || foe.grip || foe.stockLift || protectionTime(foe))
        return null;
      const dir = jumpRunDirection(f);
      if (!dir || dir !== f.face || (foe.x - f.x) * dir <= 0) return null;
      const move = smashes[f.kit.smashes.up], t = move.start, floor = this.terrain[f.ground];
      const speed = Math.abs(f.vx), brake = f.kit.footwork.tiltBrake;
      const stopX = f.x + dir * speed * speed / (2 * brake);
      if (stopX < floor.x1 + 8 || stopX > floor.x2 - 8 || this.floorAhead(foe,t) >= 0) return null;
      const slideTime = Math.min(t, speed / brake);
      const contactX = f.x + dir * slideTime * (speed - brake * slideTime / 2);
      const [x,y,rx,ry] = move.box;
      const gap = (foe.x + foe.vx * t - contactX) * dir;
      const height = foe.fastFall ? foe.y + foe.kit.fastFallSpeed * t : foe.y + foe.vy*t + 770*foe.kit.gravity*t*t;
      if (Math.abs(gap - x) > rx + foe.stats.width - 5 ||
          Math.abs(height - foe.stats.height/2 - (f.y+y)) > ry + foe.stats.height/2 - 6) return null;
      return { ...idleInput, smashY:-1, tapped:{jump:true, smash:true} };
    }
    ledgeReturnInput(f, route) {
      if (f.grip || f.stun || f.tumble || f.ledgeTrump || f.ground >= 0 || f.stockLift) return null;
      if (f.ledge) {
        if (route.started || !sameLedge(f.ledge,route.edge)) return null;
        if (f.prev.y > .5) return idleInput;
        route.started = true;
        return {...idleInput,y:1,jump:true,tapped:{jump:true}};
      }
      if (!route.started || f.y > route.edge.y+80) return null;
      const x = route.dir;
      if (!route.swung && f.vy < 0) {
        route.swung = true;
        return {...idleInput,x,jump:true,aimStick:true,smashX:x};
      }
      const floor = this.terrain[route.edge.index];
      const mark = Math.min(115,(floor.x2-floor.x1)/2);
      return {...idleInput,x:clamp((mark-(f.x-route.edge.x)*x-f.vx*x*.1)/25,-1,1)*x,jump:f.vy<0};
    }
    rivalLedgeReturn(f, foe) {
      if (!this.bot.ledgeReturn) {
        const edge = f.ledge, attack = foe.attack;
        if (!edge || foe.ground !== edge.index || protectionTime(foe) || foe.shield) return null;
        const swing = moves[f.kit.air.forward];
        const whiff = attack && !attack.connected && attack.time >= attack.start+attack.active &&
          attack.end-attack.time >= swing.start+2/60;
        if (!whiff && !foe.smashCharge) return null;
        const dir = edge.left ? 1 : -1, gap = (foe.x-edge.x)*dir;
        if (gap < 32 || gap > swing.box[0]+swing.box[2]+foe.stats.width-18) return null;
        this.bot.ledgeReturn = {edge,dir};
      }
      const input = this.ledgeReturnInput(f,this.bot.ledgeReturn);
      if (!input) this.bot.ledgeReturn = null;
      return input;
    }
    readShieldEscape(f, foe) {
      const brain = this.bot, p = brain.pressure;
      if (!p) return null;
      if (p.sent && !p.strike && (p.roll ? f.attack?.grabAttempt && this.time - p.sentAt <= inputWindow :
          f.attack?.moveId === f.kit.tilts.down))
        p.strike = f.attack;
      const elapsed = this.time - p.opens;
      if (f.stun || f.grip || f.floorAction || f.ground !== p.ground || elapsed > (p.roll?.expires ?? .55)) {
        if (!p.observed) brain.shieldHabit = null;
        brain.pressure = null;
        return null;
      }
      if (!p.observed && elapsed >= -1e-8) {
        const action = foe.floorAction;
        if (action?.type === 'spotDodge' || action?.type === 'shieldRoll') {
          const escape = action.dir === 0 ? 'spot' : action.dir === p.face ? 'away' : 'through';
          const delay = Math.max(0, elapsed - action.time);
          const last = brain.shieldHabit;
          brain.shieldHabit = last?.escape === escape ? {escape, count:2, delay:(last.delay + delay) / 2} :
            {escape, count:1, delay};
          p.observed = true;
        } else if (foe.floorAction || foe.jumpSquat || foe.ground < 0 || foe.attack || elapsed > .32) {
          brain.shieldHabit = null;
          p.observed = true;
        }
      }
      if (!p.read || p.sent) return null;
      // Commit to the timing learned from earlier blocks, even if this time the defender jumps away.
      if (f.attack || f.impactLag || f.landingLag || f.command || f.charge >= 0) return idleInput;
      if (p.roll) {
        // The defender can make this grab miss. Chase the predicted place on the platform.
        const gap = this.terrain[p.ground].x1 + p.roll.mark - f.x;
        const dir = Math.sign(gap) || f.face;
        const running = f.run?.face === dir && !f.run.turned && f.vx * dir >= f.stats.speed * .4;
        const grab = grabs[running ? f.kit.dashGrab : f.kit.grab];
        const speed = running ? Math.abs(f.vx) * grab.carry : 0;
        const slide = running ? Math.min(grab.start, speed / grab.brake) : 0;
        const travel = running ? (speed - grab.brake * slide / 2) * slide : 0;
        const reach = grab.box[0] + grab.box[2] + foe.stats.width - 9 + travel;
        if (Math.abs(gap) > reach) return {...idleInput, x:dir};
        if (f.face !== dir) return {...idleInput, x:dir * .5};
        if (elapsed + grab.start < p.roll.catchAt) return idleInput;
        p.sent = true;
        p.sentAt = this.time;
        return {...idleInput, x:running ? dir : 0, tapped:{grab:true}};
      }
      const low = moves[f.kit.tilts.down], gap = (p.x - f.x) * p.face;
      const reach = low.box[0] + low.box[2] + foe.stats.width - 9;
      if (gap > reach) return { ...idleInput, x: p.face * .5 };
      if (elapsed + low.start < p.read.delay + (p.expectedSafeEnd + 2) / 60)
        return f.face === p.face ? idleInput : { ...idleInput, x:p.face*.5 };
      p.sent = true;
      brain.spotBaits = (brain.spotBaits || 0) + 1;
      return { ...idleInput, x:p.face*.5, y:1, tapped:{attack:true} };
    }
    planJumpIn(f, foe, grab) {
      const dir = Math.sign(foe.x - f.x) || f.face;
      // Commit to the space in front of the shield. A defender who moves can make either option miss.
      return {dir, mark:foe.x-dir*(f.stats.width+foe.stats.width+1), ground:f.ground, grab,
        jumped:false, airborne:false, sent:false, frames:0};
    }
    jumpInInput(f, plan) {
      if (++plan.frames > 90 || f.stun || f.tumble || f.grip || f.ledge || f.floorAction || f.airDodge ||
          (f.ground >= 0 && f.ground !== plan.ground)) return null;
      const x = clamp((plan.mark-f.x-f.vx*.10)/22,-1,1);
      if (!plan.jumped) {
        if ((plan.mark-f.x)*plan.dir > 65) return {...idleInput,x:plan.dir};
        plan.jumped = true;
        return {...idleInput,x:plan.dir,jump:true,shortHop:true};
      }
      if (f.ground < 0) plan.airborne = true;
      const landed = plan.airborne && f.ground >= 0;
      if (!plan.sent) {
        const horizon = plan.grab ? 2/60 : moves[f.kit.air.neutral].start + 4/60;
        if (landed || (f.ground < 0 && this.floorAhead(f,horizon) === plan.ground)) {
          if (landed && !plan.grab) return null;
          plan.sent = true;
          if (plan.grab) return {...idleInput,grab:true,grabX:plan.dir};
          return {...idleInput,x,aimStick:true,smashX:0,smashY:0};
        }
      } else if (landed && !f.attack && !f.command) return null;
      return {...idleInput,x:landed ? 0 : x};
    }
    rivalJumpIn(f, foe, dt) {
      const brain = this.bot;
      brain.shieldWatch = foe.shield ? Math.min(.5,(brain.shieldWatch || 0)+dt) : 0;
      if (!brain.jumpIn) {
        if (brain.shieldWatch < .20 || this.time < (brain.nextJumpIn || 0) || !f.run || f.ground !== foe.ground ||
            f.ground < 0 || f.attack || f.stun || f.command || f.charge >= 0 || f.shield || f.floorAction ||
            f.landingLag || f.jumpSquat || protectionTime(foe) || f.run.turned) return null;
        const dir = f.run.face, gap = (foe.x-f.x)*dir, floor = this.terrain[f.ground];
        if (dir !== f.face || gap < 85 || gap > 218 || foe.x < floor.x1+50 || foe.x > floor.x2-50) return null;
        brain.jumpIn = this.planJumpIn(f,foe,!brain.missedHopGrab);
        brain.missedHopGrab = false;
        brain.nextJumpIn = this.time + 1.6;
        brain.hop = null;
        brain.jumpHold = brain.guard = brain.hold = 0;
      }
      const plan = brain.jumpIn, input = this.jumpInInput(f,plan);
      if (!input) {
        brain.missedHopGrab = plan.grab && plan.sent && !f.grip;
        brain.jumpIn = null;
      }
      return input;
    }
    cpu(dt) {
      const f = this.dogs[1],
        foe = this.dogs[0],
        brain = this.bot;
      if (brain.boostApproach) {
        const dir = brain.boostApproach;
        brain.boostApproach = 0;
        if (f.attack?.dashAttack && cancelableWindup(f)) return {...idleInput,x:dir,grab:true};
      }
      if (f.stockLift) return this.cpuLiftExit(f, foe);
      // A direction held through the catch would queue a throw before Rival can assess the hold.
      if (this.cpuLevel === 'rival' && foe.damage >= 65 && f.ground >= 0 && f.attack?.grabAttempt &&
          f.attack.time < f.attack.start + f.attack.active && !f.grip) return idleInput;
      if(f.tumble?.techChoice && f.techBuffer>0)return {...idleInput,x:f.tumble.rollDir};
      if (f.shieldBreak) {
        if (f.shieldBreak.phase === 'pop' || this.cpuLevel === 'rookie') return idleInput;
        const beat = Math.floor((f.shieldBreak.time * 60 + 1e-8) / (this.cpuLevel === 'rival' ? 6 : 12));
        return {...idleInput, x:beat % 2 ? 1 : -1};
      }
      if (this.cpuLevel === 'rival' && foe.shieldBreak && f.ground >= 0 &&
          !f.stun && !f.grip && !f.attack && !f.impactLag &&
          (f.ground === foe.ground || (foe.shieldBreak.phase === 'pop' &&
            foe.x >= this.terrain[f.ground].x1 && foe.x <= this.terrain[f.ground].x2))) {
        const dir = Math.sign(foe.x - f.x) || f.face;
        if (!f.smashCharge && Math.abs(foe.x - f.x) > f.stats.width + foe.stats.width + 8)
          return {...idleInput, x:dir * (Math.abs(foe.x - f.x) < 140 ? .5 : 1)};
        if (foe.shieldBreak.phase === 'pop') return idleInput;
        const move = smashes[f.kit.smashes.up];
        return {...idleInput, smash:!f.smashCharge || (f.charge < 1 && foe.stun > move.start + .15),
          smashX:dir*.35, smashY:-1};
      }
      brain.jumpHold = Math.max(0, brain.jumpHold - dt);
      const result = { ...idleInput, jump: brain.jumpHold > 0 };
      if (brain.wallReturn) {
        const route = brain.wallReturn, floor = this.terrain[route.platform];
        const lip = route.inward > 0 ? floor.x1 : floor.x2;
        if (f.usedWallKick && !f.grip && !f.tumble && !f.stun && !f.ledgeTrump && !f.attack &&
            this.time < route.until && (f.vy < 0 || f.y < floor.y+45 ||
              (Math.abs(f.x + f.vx*4/60 - lip) < 33 && f.y < floor.y+78))) return { ...idleInput, x:route.inward };
        brain.wallReturn = null;
      }
      if (this.grapple) {
        const grip = this.grapple;
        brain.jumpIn = null;
        brain.ledgeReturn = null;
        if (brain.pressure) {
          if (!brain.pressure.observed) brain.shieldHabit = null;
          brain.pressure = null;
        }
        result.jump = false;
        if (grip.phase === 'throw') return result;
        if (grip.target === f.index) {
          if (this.cpuLevel === 'rival') {
            const beat = Math.floor((grip.elapsed*60 + 1e-8)/6);
            if (beat > 0) result.x = beat%2 ? 1 : -1;
          } else result.attack = Math.floor(this.time * 6) % 2 === 0;
        } else if (grip.carry) {
          if (grip.phase !== 'hold') return result;
          const floor = this.terrain[f.ground], solid = this.terrain.filter(p=>!p.thin);
          const dir = f.x-solid[0].x1 < solid[solid.length-1].x2-f.x ? -1 : 1;
          const room = !floor ? 0 : dir > 0 ? floor.x2 - f.x : f.x - floor.x1;
          return { ...idleInput, x:dir, grab:room <= 28 || grip.remaining <= .34 };
        } else if (
          grip.phase === 'hold' &&
          !grip.pending &&
          (grip.time >= 0.13 || grip.pummelCount || grip.remaining < 0.4)
        ) {
          const floor = this.terrain[f.ground];
          const rival=this.cpuLevel==='rival';
          const edge = floor && (!rival || !floor.thin) && Math.min(f.x - floor.x1, floor.x2 - f.x) < 145;
          if (this.cpuLevel === 'rival' && f.kit.shoulderCarry && floor && !floor.thin &&
              foe.damage >= 60 && grip.remaining > .78) {
            const solid = this.terrain.filter(p=>!p.thin);
            const left = floor === solid[0] ? f.x-floor.x1 : Infinity;
            const right = floor === solid[solid.length-1] ? floor.x2-f.x : Infinity;
            const distance = Math.min(left,right);
            if (distance >= 60 && distance <= 165) return {...idleInput,special:true};
          }
          if(rival && floor && foe.damage>=65){
            const side=this.finishingThrow(f,foe,grip);
            if(side)return {...idleInput,x:side==='forward'?grip.face:side==='back'?-grip.face:0,y:verticalAim(side)};
          }
          if (edge && foe.damage >= 40) result.x = f.x - floor.x1 < floor.x2 - f.x ? -1 : 1;
          else if (
            grip.pummelCount < (foe.damage >= 35 ? 2 : 1) &&
            grip.remaining > pummels[f.kit.pummel].end + 0.32 &&
            (this.cpuLevel !== 'rival' || grip.struggles < 2 ||
              grip.remaining > pummels[f.kit.pummel].end * (1 + .135*grip.struggles/grip.elapsed) + .18)
          )
            result.attack = true;
          else if (foe.damage < 65 && (f.kind === 'clover' || f.kind === 'pip')) result.y = -1;
          else if (!edge && f.kind === 'brisket' && foe.damage >= 40 && foe.damage < 115) result.y = -1;
          else if (foe.damage < 55) result.y = 1;
          else result.x = grip.face;
          if (!edge && !result.attack) {
            const side = result.y === -1 ? 'up' : result.y === 1 ? 'down' : 'forward';
            const current = moveFreshness(f, f.kit.throws[side]);
            if (current < 0.86) {
              const options = ['up','down','forward'];
              const fresh = options.reduce((best, s) => moveFreshness(f, f.kit.throws[s]) >
                moveFreshness(f, f.kit.throws[best]) ? s : best, side);
              result.x = fresh === 'forward' ? grip.face : 0;
              result.y = verticalAim(fresh);
            }
          }
        }
        return result;
      }
      const solid = this.terrain.filter((p) => !p.thin);
      const under = solid.find((p) => f.x >= p.x1 + 3 && f.x <= p.x2 - 3);
      const closest = solid.reduce((best, p) =>
        Math.abs(f.x - clamp(f.x, p.x1, p.x2)) < Math.abs(f.x - clamp(f.x, best.x1, best.x2)) ? p : best,
      );
      const outerLeft = solid[0].x1,
        outerRight = solid[solid.length - 1].x2;
      const outside = f.x < outerLeft || f.x > outerRight;
      const unsafe = f.ground < 0 && (outside || f.y > closest.y + 28 || (!under && f.y > closest.y - 46));
      if (this.suddenDeath?.frames > 300 && f.ground >= 0 && !f.attack && !f.stun && !f.grip && !f.floorAction) {
        const inset = this.blastInset(45);
        const inward = f.x < inset - 65 ? 1 : f.x > this.stageWidth + 65 - inset ? -1 : 0;
        const floor = this.terrain[f.ground];
        if (inward && f.x + inward*45 > floor.x1 && f.x + inward*45 < floor.x2) return { ...idleInput, x:inward };
      }
      if (this.cpuLevel === 'rookie') {
        if (brain.rookieGuard > this.time && !f.stun && f.ground >= 0) return { ...idleInput, shield:true };
        const basic = this.rookieNeutral(f, foe);
        if (basic) return basic;
      } else if (this.cpuLevel === 'rival') {
        const intercept = this.rivalEdgeHop(f,foe,this.terrain[f.ground],outerLeft,outerRight);
        if (intercept) return intercept;
        const jab = f.attack;
        if (jab && f.kind === 'pip' && f.ground >= 0 && !f.grip) {
          const gap = (foe.x-f.x)*f.face;
          const near = gap >= 0 && gap < 62 + foe.stats.width && foe.y > f.y - 38;
          if (jab.moveId === 'pipJab' && jab.connected && near && foe.damage < 55 && !foe.shield) {
            const tap = !jab.flurryPressed;
            jab.flurryPressed = true;
            return {...idleInput,quickAttack:true,attack:true,tapped:{attack:tap}};
          }
          if ((jab.holdForFlurry && foe.damage < 60) || jab.flurryBeat) return {...idleInput,attack:near && !foe.shield};
        }
        const forecast=this.predictLedgeRoll(f,foe,brain);
        if(forecast)return forecast;
        const trap = this.ledgeSmashInput(f,foe,brain);
        if (trap) return trap;
        const punish = this.shieldPunishInput(f,foe);
        if (punish) return punish;
        if (f.floorAction?.type === 'spotDodge') {
          const dodge = f.floorAction, grab = foe.attack, gap = (foe.x - f.x) * f.face;
          const wait = Math.max(0, dodge.duration - spotCounterLead - dodge.time);
          if (!f.command && grab?.grabAttempt && grab.time >= grab.start + grab.active &&
              wait <= inputWindow && f.ground === foe.ground && gap >= 0) {
            for (const id of [f.kit.ground[0], f.kit.tilts.forward]) {
              const move = moves[id];
              if (gap <= move.box[0] + move.box[2] + foe.stats.width && wait + move.start <= grab.end - grab.time)
                return { ...idleInput, x:id === f.kit.ground[0] ? 0 : f.face*.5, tapped:{attack:true} };
            }
          }
          return idleInput;
        }
        const answer = (!unsafe && (this.cpuDiscResponse(f) || this.cpuDashShield(f, foe))) ||
          this.rivalLedgeReturn(f, foe) || this.readShieldEscape(f, foe) || this.rivalJumpIn(f, foe, dt) ||
          this.attackCancelInput(f, foe) || this.runningAntiAir(f, foe) || this.angledTiltInput(f, foe);
        if (answer) return answer;
        if (f.run && !f.run.turned && f.ground >= 0 && f.ground === foe.ground && foe.shield &&
            brain.shieldWatch >= 3/60 && brain.shieldWatch <= .18 && !brain.missedHopGrab &&
            !f.stun && !f.attack && !f.shield && !f.command && f.charge < 0 && !f.jumpSquat && !f.floorAction &&
            !foe.shieldStun && !protectionTime(foe) && f.vx*f.run.face > f.stats.speed*.75) {
          const dir = f.run.face, gap = (foe.x-f.x)*dir - foe.stats.width;
          if (gap > dashGrabReach(f,false)+2 && gap < dashGrabReach(f,true)-2) {
            brain.boostApproach = dir;
            return {...idleInput,x:dir,tapped:{attack:true}};
          }
        }
        // Space a quick forward tilt at the shield's rim. In close the normal grab mixup still applies.
        if (foe.shield && f.ground >= 0 && f.ground === foe.ground && !f.attack && !f.stun && !f.grip &&
            !f.floorAction && !f.shield && !f.command && !f.landingLag && f.charge < 0 &&
            this.time >= (brain.nextProbe || 0) && !protectionTime(foe)) {
          const tilt = moves[f.kit.tilts.forward], gap = Math.abs(foe.x - f.x);
          const reach = tilt.box[0] + tilt.box[2] + foe.stats.width + (f.run ? Math.abs(f.vx) * tilt.start * .5 : 0);
          if (gap > f.stats.width + foe.stats.width + 4 && gap <= reach) {
            brain.nextProbe = this.time + .68;
            return { ...idleInput, x:f.run?.face || 0, aimStick:true, tiltMode:true, smashX:Math.sign(foe.x-f.x) };
          }
        }
      }
      if (unsafe && !f.jumps && this.footstoolTarget(f) === foe) {
        brain.jumpHold = .22;
        return { ...idleInput, x: Math.sign((closest.x1 + closest.x2) / 2 - f.x), jump:true, tapped:{jump:true} };
      }
      const read = brain.juggleRead;
      if (read) {
        if (!unsafe && !f.stun && !f.tumble && !f.ledge && !f.floorAction && foe.ground < 0 && !foe.ledge &&
            !foe.stockLift && this.time < read.until && !(read.swung && !f.attack && !f.command && f.ground >= 0))
          return this.juggleInput(f, foe, read);
        brain.juggleRead = null;
      }
      const wait = this.cpuWaitForReturn(f, foe);
      if (wait) return wait;
      brain.timer -= dt;
      brain.hold = Math.max(0, brain.hold - dt);
      brain.guard = Math.max(0, brain.guard - dt);
      const dx = foe.x - f.x,
        far = Math.abs(dx);
      const platformGuard = this.cpuPlatformGuard(f, foe, under);
      if (platformGuard) return platformGuard;
      const lipGuard = this.cpuCoverLip(f, foe);
      if (lipGuard) return lipGuard;
      const canChallenge = foe.ground >= 0 && far < 150 && !foe.stun && !foe.grip &&
        !foe.attack?.grabAttempt && !foe.attack?.commandGrab;
      if (brain.landingGuardUntil > this.time) {
        if (canChallenge && !f.stun && !f.grip && (f.ground >= 0 || f.attack?.airSide))
          return { ...idleInput, shield: true };
        brain.landingGuardUntil = 0;
      }
      const swing = f.attack;
      if (this.cpuLevel === 'rival' && !unsafe && swing?.airSide === 'neutral' && foe.shield &&
          !f.fastFall && !f.fastFallBuffer && f.vy < 0 && framesToApex(f) <= fastFallBufferFrames &&
          controlsFall(f) && f.prev.y < .65 && foe.ground >= 0 && far < 85) {
        const floor = this.terrain[foe.ground], landingX = f.x + f.vx*.14;
        if (f.y < floor.y && floor.y-f.y <= 85 && landingX > floor.x1+f.stats.width && landingX < floor.x2-f.stats.width)
          return {...idleInput,y:1};
      }
      if (swing?.airSide && swing.landingPress === undefined && !f.prev.shield && foe.ground >= 0 &&
          far < 150 && this.landingCancelAhead(f)) {
        if (canChallenge && f.landingFollowUntil <= this.time)
          brain.landingGuardUntil = this.time + (9 + swing.land) / 60;
        return { ...idleInput, x: canChallenge ? 0 : f.prev.x, shield: true };
      }
      if (brain.specialTurn) {
        const follow = this.cpuSpecialTurnInput(f, foe, closest, unsafe);
        if (follow) return follow;
      }
      if (f.attack?.moveId === f.kit.ground[0]) f.landingFollowUntil = 0;
      if (f.landingFollowUntil > this.time && !unsafe && !f.stun && !f.grip && !f.floorAction && foe.stun > 0) {
        if (f.command?.type === 'attack' || f.charge >= 0) return idleInput;
        const towardRival = Math.sign(dx), floor = under || closest;
        if (f.ground < 0 && f.attack?.airSide === 'forward') {
          const ahead = f.x + towardRival * 30;
          return { ...idleInput, x: ahead >= floor.x1 && ahead <= floor.x2 ? towardRival : 0 };
        }
        if (f.ground >= 0 && !f.attack && towardRival === f.face) {
          const jab = moves[f.kit.ground[0]], reach = jab.box[0] + jab.box[2] + foe.stats.width;
          const wait = f.landingLag + jab.start;
          if (far + (foe.vx - f.vx) * f.face * wait <= reach && foe.stun + dt >= wait) {
            if (f.landingLag > 4 / 60 + 1e-8) return idleInput;
            brain.hold = brain.guard = brain.jumpHold = 0;
            return { ...idleInput, tapped: { attack: true } };
          }
        }
      }
      const counter = !unsafe && this.crouchCounterInput(f, foe);
      if (counter) return counter;
      if (f.reaction?.planted && f.stun && f.command) return idleInput;
      if ((f.clashRecoil && f.clashRecoil.duration - f.clashRecoil.time > 3 / 60) ||
          (foe.clashRecoil && f.command?.type === 'attack')) return idleInput;
      if (foe.clashRecoil && f.ground >= 0 && f.ground === foe.ground && !f.attack &&
          !f.stun && !f.grip && !f.floorAction && !f.shield && !f.command && f.charge < 0) {
        const jab = moves[f.kit.ground[0]], window = foe.clashRecoil.duration - foe.clashRecoil.time;
        const ownLag = f.clashRecoil ? f.clashRecoil.duration - f.clashRecoil.time : 0;
        const reach = jab.box[0] + jab.box[2] + foe.stats.width;
        if (Math.sign(dx) === f.face && far <= reach && window + dt >= jab.start + ownLag) {
          brain.hold = brain.guard = brain.jumpHold = 0;
          return { ...idleInput, tapped: { attack: true } };
        }
      }
      const opponentOffstage =
        foe.ground < 0 && (foe.x < outerLeft - 5 || foe.x > outerRight + 5 || foe.y > closest.y + 38);
      const targetX = opponentOffstage ? clamp(foe.x, closest.x1 + 37, closest.x2 - 37) : foe.x;
      const spacing = f.kind === 'noodle' ? 88 : f.kind === 'clover' ? 57 : 40;
      result.x = Math.abs(targetX - f.x) > (opponentOffstage ? 10 : spacing) ? Math.sign(targetX - f.x) : 0;
      if (f.floorAction) {
        result.x = 0;
        result.jump = false;
        const down = f.floorAction;
        if (down.type === 'downed' && !down.choice && down.time >= (down.locks ? down.duration - 5 / 60 : 15 / 60)) {
          const sweep = moves[f.kit.floorAttack];
          const inReach = beat => {
            const [x,y,rx,ry] = beat.box;
            const side = (dx + foe.vx * beat.start) * f.face;
            const height = bodyHeight(foe);
            const chest = foe.y + foe.vy * beat.start - height * .52;
            return Math.abs(side - x) < rx + foe.stats.width - 3 && Math.abs(chest - f.y - y) < ry + height * .4;
          };
          const canSweep = this.cpuLevel === 'rival' ? inReach(sweep) || (sweep.late && inReach(sweep.late)) : far < 70;
          if (canSweep && !foe.shield && foe.charge < 0 && !foe.attack?.smashSide && !down.locks) {
            result.attack = true;
            result.tapped = { attack: true };
          } else if (far < 140) {
            const away = -Math.sign(dx) || -f.face, floor = this.terrain[f.ground];
            result.x = f.x + 90 * away > floor.x1 && f.x + 90 * away < floor.x2 ? away : -away;
          } else result.jump = true;
        }
        return result;
      }
      const solidImpact = f.tumble && this.solidAhead(f, 7 / 60);
      if (solidImpact) {
        result.x = 0;
        if (this.cpuLevel === 'rival' && solidImpact.hard) return result;
        result.jump = !solidImpact.ceiling && f.tumble.willTech && f.y > solidImpact.wall.top + f.stats.height;
        if (f.tumble.willTech && f.techLock <= 1e-8) {
          result.shield = true;
          result.tapped = { shield: true };
        }
        return result;
      }
      if (this.cpuLevel==='rival' && this.canEscapeHitstun(f,false)) {
        const zone=this.projectLaunch(f,f.vx,f.vy).zone;
        if (zone) return {...idleInput,shield:true,tapped:{shield:true},
          x:zone==='left'?1:zone==='right'?-1:0,y:zone==='top'?1:zone==='bottom'?-1:0};
      }
      if (f.tumble && !f.tumble.pending && !f.usedDodge && f.stun > 0 && f.stun <= inputWindow - dt + 1e-8 &&
          this.floorAhead(f, techWindow + dt) < 0) {
        const x = f.x + f.vx * (f.stun + 4 * dt), y = f.y + f.vy * (f.stun + 4 * dt);
        const out = blastZone(x, y, this.stageWidth, this.blastInset(f.stun * 60 + 4));
        if (out) {
          const inward = f.x < closest.x1 ? 1 : f.x > closest.x2 ? -1 : Math.sign(this.stageWidth / 2 - f.x);
          const duck = out === 'top' ? 1 : f.y > closest.y + 25 ? -1 : 0;
          return { ...idleInput, x: inward, y: duck, shield: !f.guardBuffer };
        }
      }
      if (canCancelMeteor(f) && this.floorAhead(f, 0.24) < 0) {
        const inward = f.x < closest.x1 ? 1 : f.x > closest.x2 ? -1 : Math.sign((closest.x1 + closest.x2) / 2 - f.x);
        if (f.jumps) return { ...idleInput, x: inward, jump: true, tapped: { jump: true } };
        return { ...idleInput, x: inward, y: -1, special: true, tapped: { special: true } };
      }
      if (this.cpuLevel==='rival' && !unsafe) {
        const reply=this.tumbleReply(f,foe);
        if (reply) return reply;
      }
      if (brain.driftEscape) {
        const d = brain.driftEscape;
        if (!f.tumble && !f.stun && !f.grip && f.ground < 0 && !f.ledge && !f.wallAction &&
            this.time <= d.until && (d.x - f.x) * d.dir > 3)
          return { ...idleInput, x:d.dir };
        brain.driftEscape = null;
      }
      if (f.tumble && !unsafe) {
        result.jump = false;
        result.x = 0;
        const landing = this.floorAhead(f, 7 / 60);
        if (landing >= 0 && f.tumble.willTech && f.techLock <= 1e-8) {
          if (this.cpuLevel === 'rival' && f.tumble.downLaunch >= maxTechSpeed &&
              this.projectLaunch(f, f.vx, f.vy).hardImpact) return result;
          const p = this.terrain[landing];
          const away = -Math.sign(dx);
          result.x = this.cpuLevel==='rival' ? this.chooseLandingTech(f,foe,p) :
            far < 140 && f.x + 95 * away > p.x1 && f.x + 95 * away < p.x2 ? away : 0;
          result.shield = true;
          result.tapped = { shield: true };
          f.tumble.rollDir = result.x;
        } else if (f.techBuffer > 0) result.x = f.tumble.rollDir || 0;
        else if (!f.tumble.pending && f.stun <= dt + 1e-8 && under && foe.ground >= 0 &&
            f.y < foe.y - 80 && far < 110 && this.floorAhead(f, .20) < 0) {
          const away = Math.sign(f.x - foe.x) || f.face;
          const dir = f.x + away * 85 > under.x1 && f.x + away * 85 < under.x2 ? away : -away;
          if (f.prev.x * dir <= .3 && (dir > 0 ? under.x2 - f.x : f.x - under.x1) > 45) {
            result.x = dir;
            brain.driftEscape = { dir, x:clamp(f.x + dir * 110,under.x1 + 10,under.x2 - 10), until:this.time + .45 };
          }
        }
        return result;
      }
      const chaseInput = this.chaseJabInput(f, foe);
      if (chaseInput) return chaseInput;
      const readRoll = this.cpuRollChaseInput(f, foe);
      if (readRoll) return readRoll;
      if (f.ledge) {
        const edge = f.ledge;
        const face = edge.left ? 1 : -1;
        const guardDistance = (foe.x - edge.x) * face;
        const threat = foe.attack;
        const incomingDodge =
          foe.airDodge &&
          foe.airDodge.x * face > 0.3 &&
          guardDistance < 0 &&
          guardDistance > -90 &&
          Math.abs(foe.y - edge.y) < 85;
        if (sameLedge(threat?.anchor, edge) || incomingDodge)
          return { ...idleInput, shield: true, tapped: { shield: true } };
        const finalBeat = threat?.second || threat;
        if (
          foe.ground === edge.index &&
          foe.face === -face &&
          threat?.box &&
          !threat.projectile &&
          threat.time < finalBeat.start + finalBeat.active &&
          guardDistance >= 0 &&
          guardDistance + foe.stats.width + f.stats.width <= f.kit.ledgeRoll.distance
        ) {
          const remaining = finalBeat.start + finalBeat.active - threat.time;
          const exitLead = (f.kit.ledgeRoll.safe[0] + 2) / 60;
          if (f.invuln > remaining + exitLead) return idleInput;
          return { ...idleInput, shield: true, tapped: { shield: true } };
        }
        const strike = moves[f.kit.ledgeAttack];
        const contact = ledgePosition(strike, strike.start);
        const [x, y, rx, ry] = strike.box;
        const gap = (foe.x + foe.vx * strike.start - edge.x) * face;
        const height = foe.y + foe.vy * strike.start - foe.stats.height * 0.52 - edge.y;
        result.x = face;
        result.jump = false;
        if (
          !foe.shield &&
          !protectionTime(foe) &&
          gap >= 0 &&
          Math.abs(gap - contact.x - x) <= rx + foe.stats.width &&
          Math.abs(height - contact.y - y) <= ry + foe.stats.height * 0.4
        ) {
          result.attack = true;
          result.tapped = { attack: true };
        }
        return result;
      }
      const climb = foe.floorAction;
      if (climb?.type === 'ledgeClimb' && f.ground === climb.edge.index && !f.grip && !f.attack && !f.stun) {
        const jab = moves[f.kit.ground[0]];
        const landingX = climb.edge.x + climb.dir * climb.distance;
        const gap = (f.x - landingX) * climb.dir;
        if (gap >= -3 && gap <= jab.box[0] + jab.box[2] + foe.stats.width) {
          if (brain.climbRead?.action !== climb) {
            const timing = climb.safeUntil ? foe.kit.ledgeClimb.protectedThrough + 1 : foe.kit.ledgeClimb.lift;
            const read = timing - jab.frames[0] + Math.floor(this.random() * 11) - 3;
            brain.climbRead = { action: climb, tick: Math.min(foe.kit.ledgeClimb.total - 1, read) };
          }
          const read = brain.climbRead;
          if (f.face !== -climb.dir) return { ...idleInput, x: -climb.dir * 0.5 };
          if (!read.swung && climb.time * 60 + 1e-8 >= read.tick) {
            read.swung = true;
            return { ...idleInput, tapped: { attack: true } };
          }
          return idleInput;
        }
      } else if (climb?.type !== 'ledgeClimb') brain.climbRead = null;
      const inside = clamp(f.x, closest.x1 + 52, closest.x2 - 52);
      const airDefense = (unsafe && this.cpuLevel === 'rival' && this.lastDodgeInput(f, closest)) ||
        this.cpuAirEvade(f, foe, closest, unsafe);
      if (airDefense) {
        brain.platformRoute = null;
        brain.ascent = null;
        brain.backAir = null;
        return airDefense;
      }
      if (unsafe) brain.backAir = brain.ascent = null;
      const ascent = !unsafe && this.cpuAscentInput(f, foe, foe);
      if (ascent) return ascent;
      const waveInput = this.cpuWavelandInput(f, foe);
      if (waveInput) return waveInput;
      const passInput = !unsafe && this.cpuBackAirInput(f, foe);
      if (passInput) return passInput;
      const platformInput = !unsafe && this.cpuPlatformInput(f, foe);
      if (platformInput) return platformInput;
      if (this.cpuLevel === 'rival' && !unsafe && brain.timer <= 0) {
        const sweet = this.cpuSweetAerial(f, foe);
        if (sweet) return sweet;
      }
      const specialTurn = this.cpuSpecialTurnInput(f, foe, closest, unsafe);
      if (specialTurn) return specialTurn;
      const downward = brain.timer <= 0 && this.cpuDownAir(f, foe, closest);
      if (downward) return downward;
      const recovery = this.cpuRecoveryInput(f,closest,inside,under,unsafe,result);
      if (recovery) return recovery;
      if (f.smashCharge?.button === 'smash') {
        result.x = result.y = 0;
        result.jump = false;
        result.smash = f.charge < brain.smashHold;
        return result;
      }
      const defense = this.cpuGuard(f, foe);
      if (defense) return defense;
      if (brain.timer <= 0 && foe.shield && foe.shieldHP < 0.55 && f.ground >= 0 && f.ground === foe.ground &&
          !f.attack && !f.shield && !f.stun && !f.run && !f.landingLag && !f.command && f.charge < 0 && Math.sign(dx) === f.face) {
        const opening = this.cpuTiltChoice(f, foe, 'down', true);
        if (opening) {
          brain.timer = 0.18;
          brain.hold = brain.guard = 0;
          return { ...idleInput, x: opening === 'forward' ? f.face : 0,
            y: opening === 'up' ? -1 : opening === 'down' ? 1 : 0, tapped: { attack: true } };
        }
      }
      if (
        under &&
        f.ground >= 0 &&
        far > 110 &&
        ((result.x > 0 && f.x > under.x2 - 34) || (result.x < 0 && f.x < under.x1 + 34))
      ) {
        if (foe.y <= f.y + 10 && foe.x >= solid[0].x1 && foe.x <= solid[solid.length - 1].x2)
          result.jump = true;
        else result.x = 0;
      }
      if (far > 10 && far < 95 && f.face !== Math.sign(dx)) result.x = Math.sign(dx);
      if (f.run && f.ground >= 0 && !result.jump && !protectionTime(foe)) {
        const face = Math.sign(dx);
        const pivot = face === -f.run.face;
        // A missed grab leaves a visible opening on either side of a moving dog.
        const missed = foe.attack;
        if (missed?.grabAttempt && !foe.grip && missed.time >= missed.start + missed.active &&
            f.ground === foe.ground && f.vx * f.run.face >= f.stats.speed * 0.4) {
          const tilt = moves[f.kit.tilts.forward], brake = f.kit.footwork.tiltBrake;
          const duration = Math.min(tilt.start, Math.abs(f.vx) / brake);
          const strikeX = f.x + (f.vx - f.run.face * brake * duration / 2) * duration;
          const stopX = f.x + f.vx * Math.abs(f.vx) / (2 * brake);
          const floor = this.terrain[f.ground];
          if (missed.end - missed.time >= tilt.start && stopX > floor.x1 && stopX < floor.x2 &&
              Math.abs((foe.x - strikeX) * face - tilt.box[0]) <= tilt.box[2] + foe.stats.width) {
            brain.hold = brain.guard = 0;
            brain.hop = null;
            return { ...idleInput, x: f.run.face, aimStick: true, tiltMode: true, smashX: face };
          }
        }
        const grab = grabs[pivot ? f.kit.pivotGrab : f.kit.dashGrab];
        const wantsGrab = pivot || foe.shield || foe.crouch || foe.landingLag > grab.start;
        const move = wantsGrab ? grab : moves[f.kit.dashAttack];
        const [x, y, rx, ry] = move.box;
        const speed = Math.max(0, f.vx * f.run.face) * move.carry;
        const time = Math.min(move.start, speed / move.brake);
        const contactX = f.x + f.run.face * (speed - (move.brake * time) / 2) * time;
        const distance = (foe.x + foe.vx * move.start - contactX) * face;
        const platform = this.terrain[f.ground];
        const room = face > 0 ? platform.x2 - f.x : f.x - platform.x1;
        const ready = wantsGrab
          ? !foe.regrabLock
          : brain.timer <= 0 &&
            result.x === face &&
            !opponentOffstage &&
            room > (speed * speed) / (2 * move.brake) + 8;
        if (
          ready &&
          contactX >= platform.x1 + 8 &&
          contactX <= platform.x2 - 8 &&
          distance > 0 &&
          Math.abs(distance - x) <= rx + foe.stats.width &&
          Math.abs(foe.y - foe.stats.height * 0.52 - f.y - y) <= ry + foe.stats.height * 0.4
        ) {
          brain.hold = brain.guard = 0;
          brain.hop = null;
          result.x = face;
          const button = wantsGrab ? 'grab' : 'attack';
          result[button] = true;
          result.tapped = { [button]: true };
          return result;
        }
      }
      if (brain.timer <= 0) {
        brain.timer = 0.12 + this.random() * 0.14;
        brain.pulse = {};
        const above = f.y - foe.y;
        const smashReach = f.kind === 'clover' ? 220 : f.kind === 'noodle' ? 153 : 86;
        const canStrike = f.ground >= 0 && !f.attack && !f.stun && f.charge < 0 && !foe.shield;
        if (
          canStrike &&
          far < smashReach &&
          above > -20 &&
          above < 120 &&
          (above > 30 || foe.damage > 48) &&
          this.random() < 0.31
        ) {
          const up = above > 30 && far < 75;
          const down = !up && far < 78 && (foe.face === f.face || this.random() < 0.43);
          result.x = Math.sign(dx);
          result.y = up ? -1 : down ? 1 : 0;
          result.jump = false;
          result.smash = true;
          result.tapped = { smash: true };
          brain.smashHold = above > 30 ? 0.035 : foe.stun > 0.15 ? 0.35 : 0.09 + this.random() * 0.18;
          brain.hold = brain.guard = 0;
          brain.hop = null;
          return result;
        }
        if (canStrike && !result.jump && !protectionTime(foe) && far < 155) {
          const face = Math.sign(dx) || f.face;
          const closing = foe.vx * face < -40;
          const aimLow = above < -6 || (far < 75 && (closing || foe.attack));
          const side = this.cpuTiltChoice(f, foe, above > 24 ? 'up' : aimLow ? 'down' : 'forward');
          if (side && this.random() < 0.36) {
            brain.hold = brain.guard = 0;
            brain.hop = null;
            result.x = side === 'neutral' ? 0 : face;
            result.y = verticalAim(side);
            result.attack = true;
            result.tapped = { attack: true };
            return result;
          }
        }
        if (foe.y < f.y - 52 && far < 240 && f.jumps > 0) brain.pulse.jump = true;
        if (Math.abs(foe.y - f.y) < 105 && !f.attack && !f.stun) {
          const clearRun = dx >= 0 ? closest.x2 - f.x : f.x - closest.x1;
          const safeSpecial = clearRun > (f.kind === 'brisket' ? 295 : f.kind === 'pip' ? 185 : -1);
          if (far < (f.kind === 'noodle' ? 150 : 91)) {
            if (
              f.ground >= 0 &&
              Math.abs(foe.y - f.y) < 48 &&
              (((foe.shield || foe.crouch) && this.random() < 0.8) || this.random() < (f.kind === 'noodle' ? 0.2 : 0.13))
            )
              brain.pulse.grab = true;
            else if (foe.attack && this.random() < 0.37) brain.guard = 0.24;
            else if (safeSpecial && this.random() < 0.22) brain.pulse.special = true;
            else brain.hold = foe.damage > 60 && this.random() < 0.49 ? 0.26 + this.random() * 0.18 : 0.07;
          } else if (
            f.ground >= 0 &&
            !opponentOffstage &&
            under &&
            clearRun > 155 &&
            far < 148 &&
            this.random() < 0.38
          ) {
            brain.pulse.jump = true;
            brain.hop = f.kind === 'brisket' ? 'down' : f.kind === 'clover' ? 'neutral' : 'forward';
            brain.hopDelay = f.kind === 'brisket' ? 0.23 : 0.09;
          } else if (safeSpecial && far < (f.kind === 'clover' ? 350 : 180) && this.random() < 0.52)
            brain.pulse.special = true;
        }
        result.jump ||= !!brain.pulse.jump;
        result.special = !!brain.pulse.special;
        result.grab = !!brain.pulse.grab;
        if (result.grab && f.kind === 'brisket' && far < 61 && this.random() < 0.3) {
          result.grab = false;
          result.special = true;
          result.x = result.y = 0;
        } else if (result.special) {
          const choice = this.random();
          if (
            (f.kind === 'clover' && far > 145) ||
            (f.kind === 'noodle' && choice < 0.54) ||
            (far < 58 && choice < 0.45)
          )
            result.x = result.y = 0;
          else if (f.ground >= 0 && choice > 0.69) {
            result.x = 0;
            result.y = 1;
          } else result.x = Math.sign(dx);
        }
      }
      if (f.ground < 0 && foe.y > f.y + 90 && !unsafe) result.y = 1;
      result.attack = brain.hold > 0;
      result.shield = brain.guard > 0;
      if (result.shield) result.x = result.y = 0;
      if (brain.hop) {
        brain.hopDelay -= dt;
        if (f.stun || f.respawning || brain.hopDelay < -0.15) brain.hop = null;
        else if (f.ground < 0 && !f.attack && brain.hopDelay <= 0) {
          result.smashX = brain.hop === 'forward' ? f.face : 0;
          result.smashY = brain.hop === 'down' ? 1 : 0;
          result.aimStick = true;
          result.attack = false;
          result.special = result.grab = result.shield = false;
          result.tapped = { aimStick: true };
          brain.hop = null;
          brain.hold = 0;
        }
      }
      const a = f.attack;
      if (
        f.ground >= 0 &&
        a?.connected &&
        !a.botFollow &&
        (f.chainWindow > 0 || a.jumpCancel) &&
        a.time + dt >= a.start + (a.link || 0) / 60
      ) {
        a.botFollow = true;
        if (this.random() < 0.88) {
          result.x = 0;
          result.y = 0;
          result.attack = true;
          result.grab = result.special = result.shield = false;
          result.tapped = { attack: true };
          brain.hold = 0;
          if (a.jumpCancel && (a.moveId === 'cloverSet' || (foe.y < f.y - 15 && this.random() < 0.5))) {
            result.jump = true;
            result.y = -1;
            result.tapped.jump = true;
          } else if (a.grabCancel && Math.min(foe.x - closest.x1, closest.x2 - foe.x) < 110) {
            result.attack = false;
            result.grab = true;
            result.tapped = { grab: true };
          } else if (a.specialCancel && far > 100) {
            result.attack = false;
            result.special = true;
            result.tapped = { special: true };
          }
        }
      }
      return result;
    }
  }
  // Keep four seconds of controls plus the checkpoint that precedes their first tick.
  // A checkpoint owns its random generator and the complete shared graph of dogs and grabs.
  class FinishTape {
    constructor() { this.blocks=[]; this.count=0; this.knockouts=[]; this.observedLosses=null; }
    get length() { return Math.min(240,this.count); }
    copy(source) {
      const battle=Object.create(Battle.prototype);
      battle.emit=()=>{};
      battle.random=seededRandom(0);
      battle.copyFightFrom(source);
      return battle;
    }
    record(battle,first,second) {
      this.captureKnockouts(battle);
      if (this.count%120===0) {
        this.blocks.push({start:this.count,battle:this.copy(battle),inputs:[]});
        if (this.blocks.length>3) this.blocks.shift();
      }
      this.blocks.at(-1).inputs.push([this.input(first),this.input(second)]);
      this.count++;
    }
    captureKnockouts(battle) {
      const losses=battle.matchCard?.losses;
      if(!losses)return;
      const first=this.observedLosses;
      this.observedLosses=losses.length;
      if(first===null || first>=losses.length || !this.count)return;
      // Inputs are recorded before the tick. Seal the window after the knockout tick has resolved.
      // Completed blocks stay immutable. Only the current block can still receive more inputs.
      const clip=new FinishTape();
      clip.count=this.count;
      clip.blocks=this.blocks.slice();
      const last=clip.blocks.length-1;
      clip.blocks[last]={...clip.blocks[last],inputs:clip.blocks[last].inputs.slice()};
      this.knockouts.push({first,losses:losses.slice(first),tape:clip});
      if(this.knockouts.length>12)this.knockouts.shift();
    }
    input(value) {
      if (!value || value===idleInput) return idleInput;
      return value.tapped ? {...value,tapped:{...value.tapped}} : {...value};
    }
    playback(offset=0,emit=()=>{},liveSlot=null) {
      if (!this.length) return null;
      const frame=clamp(Math.trunc(offset),0,this.length), start=this.count-this.length;
      const block=this.blocks.findLast(b=>b.start<=start+frame);
      const battle=this.copy(block.battle);
      const inputs=this.blocks.filter(b=>b.start>=block.start).flatMap(b=>b.inputs);
      let index=0;
      while (index<start+frame-block.start) battle.step(1/60,...inputs[index++]);
      // Seek with the original rules before handing the CPU fighter to a human.
      if(liveSlot===1 && battle.mode==='solo')battle.mode='local';
      battle.emit=emit;
      return {battle,frame,length:this.length,step(live=idleInput){
        if (this.frame>=this.length) return false;
        const [first,second]=inputs[index++];
        battle.step(1/60,liveSlot===0?live:first,liveSlot===1?live:second);
        this.frame++;
        return true;
      }};
    }
  }
  window.DogFight = {
    cpuLevels,
    stockMinutes,
    validStockCount,validHandicap,versusRules,
    validRelayTeams,relayCoats,
    warmupPartners,
    seededRandom,
    fighters,
    kits,
    moves,
    specials,
    smashes,
    grabs,
    pummels,
    throws,
    smashChargeTime,
    smashPower,
    moveFreshness,
    savedMoveHistory,
    inputWindow,
    arenas,
    stageForms,
    stageGeometry,
    validCoat,
    coatFor,
    platforms,
    topBlastY,
    bottomBlastY,
    blastSideMargin,
    Battle,
    FinishTape,
    StockSet,
    idleInput,
    applyFlickJump,
    rageScale,
    clamp,
    attackWindow,
    segmentEntry,
    activeArmor,
    canCancelMeteor,
    launchInfluence,
    liftReserve,
    gripWarningFrames,
    gripFramesLeft,
    maxLedgeCatches,
    protectionTime,
    isReversalPractice,
    isFootstoolPractice,
    isSweetPractice,
    bodyHeight,
    shieldBubble,
    shieldDirection,
    shieldContact,
    ledgePosition,
    ledgeRollAction,
    ledgeRollPosition,
    ledgeClimbPosition,
  };
})();
