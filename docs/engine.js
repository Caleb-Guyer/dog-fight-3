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
      spawn: [355, 852],
    },
  };
  const idleInput = Object.freeze({
    x: 0,
    y: 0,
    jump: false,
    attack: false,
    special: false,
    shield: false,
    grab: false,
  });
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const toward = (value, target, amount) => value + clamp(target - value, -amount, amount);
  const inputWindow = 7 / 60;
  const aimFor = (y) => (y < -0.45 ? -1 : y > 0.45 ? 1 : 0);
  const kits = {
    pip: {
      ground: ['pipJab', 'pipCross', 'pipHeel'],
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
        'Tap Attack three times for Heel Kick. For an aerial finish, press Jump, Forward and Attack together as Cross connects.',
      airAccel: 1060,
      gravity: 1.0,
    },
    brisket: {
      ground: ['brisketCheck', 'brisketLift'],
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
        'Tap Attack for Body Check. As the shoulder connects, tap Attack for Bell Ringer or press Grab to throw the rival sideways.',
      airAccel: 540,
      gravity: 1.17,
    },
    noodle: {
      ground: ['noodleTrip', 'noodleReel', 'noodleSnap'],
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
      gravity: 0.93,
    },
    clover: {
      ground: ['cloverTap', 'cloverSet'],
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
      gravity: 0.96,
    },
  };
  // Frames are [startup, active, recovery] at 60 Hz. Boxes are [forward, down from feet, half-width, half-height].
  // The launch angle is measured above horizontal. Negative angles spike an airborne opponent.
  const moves = {
    pipJab: {
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
    pipSpin: {
      label: 'Scramble',
      hint: 'A fast paw-wheel that catches rivals on either side.',
      frames: [3, 8, 7],
      box: [0, -36, 49, 33],
      dmg: 6,
      base: 128,
      growth: 3.0,
      angle: 48,
      land: 4,
    },
    pipDiveKick: {
      label: 'Flying Kick',
      hint: 'Kick forward and gain a short burst of speed.',
      frames: [4, 7, 9],
      box: [44, -34, 37, 24],
      dmg: 8,
      base: 165,
      growth: 4.0,
      angle: 27,
      burst: 205,
      land: 5,
    },
    pipBackKick: {
      label: 'Back Heel',
      hint: 'A quick heel strike behind you with a low launch.',
      frames: [3, 4, 10],
      box: [-39, -32, 33, 21],
      dmg: 8,
      base: 158,
      growth: 4.1,
      angle: 19,
      land: 5,
    },
    pipFlip: {
      label: 'Flip Kick',
      hint: 'Catch an opponent overhead with a rising heel.',
      frames: [3, 6, 8],
      box: [12, -82, 36, 34],
      dmg: 7,
      base: 160,
      growth: 3.55,
      angle: 80,
      land: 4,
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
      pogo: true,
      land: 6,
    },
    brisketCheck: {
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
      land: 8,
    },
    brisketRam: {
      label: 'Air Ram',
      hint: 'Commit your weight to a forward shoulder. It carries you past the hit.',
      frames: [8, 9, 16],
      box: [41, -38, 39, 30],
      dmg: 13,
      base: 227,
      growth: 5.0,
      angle: 29,
      burst: 310,
      hard: true,
      land: 10,
    },
    brisketHip: {
      label: 'Hip Check',
      hint: 'Bump backward with the strongest horizontal launch in this kit.',
      frames: [6, 6, 15],
      box: [-39, -33, 37, 27],
      dmg: 12,
      base: 238,
      growth: 5.2,
      angle: 18,
      hard: true,
      land: 9,
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
      land: 7,
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
      plunge: true,
      hard: true,
      land: 14,
    },
    noodleTrip: {
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
    },
    noodleCast: {
      label: 'Slip Lead',
      hint: 'Cast a long, narrow loop forward and pull the rival within reach.',
      frames: [7, 7, 13],
      box: [65, -37, 61, 17],
      dmg: 6,
      base: 128,
      growth: 2.65,
      angle: 34,
      pull: true,
      stun: 0.27,
      land: 7,
      rope: 'front',
    },
    noodleTail: {
      label: 'Tail Flick',
      hint: 'A long tailswipe directly behind you. Its low angle can send a rival offstage.',
      frames: [4, 6, 12],
      box: [-57, -29, 51, 18],
      dmg: 9,
      base: 169,
      growth: 3.85,
      angle: 17,
      land: 6,
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
      land: 7,
      rope: 'down',
    },
    cloverTap: {
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
      land: 6,
      second: { start: 12 / 60, active: 5 / 60, dmg: 6, base: 161, growth: 3.4, angle: 57 },
    },
    cloverFore: {
      label: 'Forehand',
      hint: 'Sweep the disc forward to send your opponent outward.',
      frames: [5, 7, 10],
      box: [45, -42, 42, 26],
      dmg: 8,
      base: 164,
      growth: 3.85,
      angle: 34,
      land: 5,
    },
    cloverBack: {
      label: 'Backhand',
      hint: 'A fast backward disc swipe with a flatter launch.',
      frames: [4, 5, 11],
      box: [-44, -39, 39, 22],
      dmg: 8,
      base: 173,
      growth: 4.1,
      angle: 23,
      land: 5,
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
      land: 7,
    },
  };
  const specials = {
    pipBark: {
      label: 'Snap Bark',
      hint: 'Two quick barks in front of Pip. Stay close enough for the louder second bark.',
      frames: [3, 4, 17],
      box: [38, -40, 36, 25],
      dmg: 3,
      base: 64,
      growth: 1,
      angle: 18,
      stun: 0.22,
      second: { start: 11 / 60, active: 5 / 60, dmg: 5, base: 152, growth: 3.7, angle: 31 },
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
  for (const move of [...Object.values(moves), ...Object.values(specials)]) {
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
  const platform = (x1, x2, y, thin = false) => ({ x1, x2, y, thin });
  function platforms(stage, time) {
    if (stage === 'picnic')
      return [platform(160, 1040, 455), platform(315, 508, 325, true), platform(705, 898, 325, true)];
    const basket = 600 + Math.sin(time * 0.7) * 123;
    return [
      platform(130, 520, 450),
      platform(680, 1070, 450),
      platform(basket - 69.5, basket + 69.5, 367, true),
      platform(805, 935, 310, true),
    ];
  }
  function newFighter(kind, index) {
    return {
      kind,
      index,
      stats: fighters[kind],
      kit: kits[kind],
      stocks: 3,
      damage: 0,
      face: index ? -1 : 1,
      prev: idleInput,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ground: -1,
      jumps: 2,
      usedUp: false,
      usedAir: false,
      usedDodge: false,
      usedPogo: false,
      stun: 0,
      reaction: null,
      invuln: 0,
      respawning: 0,
      ledge: null,
      ledgeLock: 0,
      ledgeTime: 0,
      drop: 0,
      shield: false,
      shieldHP: 1,
      dodge: 0,
      charge: -1,
      chargeAim: 0,
      attack: null,
      lastMove: '',
      landingLag: 0,
      command: null,
      guardBuffer: 0,
      chainNext: 0,
      chainWindow: 0,
      followPounce: 0,
      hopWindow: 0,
      jumpBuffer: 0,
      cutJump: false,
      coyote: 0,
      landTime: 0,
      skidTime: 0,
      skidFace: index ? -1 : 1,
      reboundTime: 0,
      reboundPose: 'special',
    };
  }
  const attacks = {
    quick: { start: 0.045, active: 0.095, end: 0.23, dmg: 6, base: 137, growth: 3.35, reach: 0 },
    heavy: { start: 0.095, active: 0.14, end: 0.48, dmg: 13, base: 225, growth: 5.5, reach: 15 },
    grab: { start: 0.065, active: 0.095, end: 0.39, dmg: 8, base: 210, growth: 3.95, reach: -11 },
  };
  function beginAttack(f, name, aim = 0, power = 0, moveId = null) {
    f.charge = -1;
    f.shield = false;
    f.landTime = 0;
    f.skidTime = 0;
    f.reboundTime = 0;
    f.chainNext = 0;
    f.chainWindow = 0;
    const move = moveId ? moves[moveId] || specials[moveId] : attacks[name];
    f.attack = { name, moveId, aim, power, time: 0, hitBeat: -1, ballHit: false, fired: false, ...move };
    const common = {
      quick: aim < 0 ? 'Up Tilt' : aim > 0 ? 'Low Tilt' : 'Quick Strike',
      heavy: 'Charged Strike',
      grab: 'Throw',
      recover: 'Up Special',
    };
    f.lastMove = move.label || common[name] || f.stats.move;
  }
  function groundStrike(f, aim, heldFor) {
    if (heldFor >= 0.21) {
      beginAttack(f, 'heavy', aim, clamp(heldFor / 0.85, 0, 1));
      return;
    }
    const step = f.chainWindow > 0 ? f.chainNext : 0;
    const chain = f.kit.ground;
    const moveId = aim === 0 ? chain[step] : null;
    const name = !moveId ? 'quick' : step === 0 ? 'jab' : step === chain.length - 1 ? 'finisher' : 'jab2';
    beginAttack(f, name, aim, 0, moveId);
    // The windup begins on the press, including a tap released during recovery.
    f.attack.time = Math.min(heldFor, f.attack.start - 1 / 60);
    if (moveId && step < chain.length - 1) {
      f.chainNext = step + 1;
      f.chainWindow = f.attack.end + 0.23;
    }
    if (f.attack.step) f.vx += f.face * f.attack.step;
  }
  function aerialStrike(f, command) {
    const side = command.airSide;
    f.face = command.facing;
    beginAttack(f, 'aerial', side === 'up' ? -1 : side === 'down' ? 1 : 0, 0, f.kit.air[side]);
    f.attack.airSide = side;
    if (f.attack.plunge) {
      f.cutJump = false;
      f.vx *= 0.35;
      f.vy = 0;
    }
  }
  function attackWindow(attack) {
    return attack.second && attack.time + 1e-8 >= attack.second.start ? attack.second : attack;
  }
  function restoreAir(f) {
    f.jumps = 2;
    f.usedUp = false;
    f.usedAir = false;
    f.usedDodge = false;
    f.usedPogo = false;
    f.followPounce = 0;
    f.hopWindow = 0;
    f.cutJump = false;
    f.reboundTime = 0;
  }
  class Battle {
    constructor(config, event = () => {}, random = Math.random) {
      this.stage = config.stage;
      this.mode = config.mode;
      this.fetch = config.fetch;
      this.time = 0;
      this.end = null;
      this.emit = event;
      this.random = random;
      this.dogs = [newFighter(config.p1, 0), newFighter(config.p2, 1)];
      this.terrain = platforms(this.stage, 0);
      this.projectiles = [];
      this.ball = null;
      this.nextBall = 4;
      this.trainingDamage = 0;
      this.lastCombo = { hits: 0, damage: 0 };
      this.hitStop = 0;
      this.bot = { timer: 0, pulse: {}, hold: 0, guard: 0, jumpHold: 0, hop: null, hopDelay: 0 };
      if (this.mode === 'training') this.resetTraining();
      else this.dogs.forEach((f) => this.spawn(f, false));
    }
    spawn(f, fromKO) {
      const ground = this.stage === 'laundry' && f.index === 1 ? 1 : 0;
      const stocks = f.stocks;
      Object.assign(f, newFighter(f.kind, f.index));
      f.stocks = stocks;
      f.x = arenas[this.stage].spawn[f.index];
      f.y = this.terrain[ground].y;
      f.ground = ground;
      if (f.index === 1) {
        this.bot.jumpHold = 0;
        this.bot.hop = null;
      }
      if (fromKO) {
        f.invuln = 1.55;
        f.respawning = 0.42;
      }
      if (this.mode === 'training' && f.index === 1) f.damage = this.trainingDamage;
    }
    setDummyDamage(value) {
      this.trainingDamage = clamp(Number(value) || 0, 0, 200);
      this.dogs[1].damage = this.trainingDamage;
      this.lastCombo = { hits: 0, damage: 0 };
    }
    resetTraining(ledge = false) {
      this.dogs.forEach((f) => this.spawn(f, false));
      this.projectiles = [];
      this.ball = null;
      this.nextBall = 4;
      this.hitStop = 0;
      this.lastCombo = { hits: 0, damage: 0 };
      if (ledge) {
        const f = this.dogs[0],
          right = ledge === 'right';
        const ground = this.terrain.filter((p) => !p.thin);
        const edge = right ? ground[ground.length - 1] : ground[0];
        f.x = right ? edge.x2 + 68 : edge.x1 - 68;
        f.y = edge.y + 65;
        f.face = right ? -1 : 1;
        f.ground = -1;
        f.jumps = 1;
      } else {
        const [player, dummy] = this.dogs,
          surface = this.terrain[0];
        player.x = (surface.x1 + surface.x2) / 2 - 28;
        dummy.x = player.x + player.stats.width + dummy.stats.width + 3;
        dummy.ground = player.ground = 0;
        dummy.y = player.y = surface.y;
      }
    }
    step(dt, input1 = idleInput, input2 = idleInput) {
      if (this.end !== null) return;
      if (this.hitStop > 0) {
        this.captureInput(this.dogs[0], input1);
        if (this.mode === 'local') this.captureInput(this.dogs[1], input2);
        this.hitStop = this.hitStop <= dt + 1e-8 ? 0 : this.hitStop - dt;
        return;
      }
      this.time += dt;
      const old = this.terrain;
      this.terrain = platforms(this.stage, this.time);
      const second = this.mode === 'solo' ? this.cpu(dt) : this.mode === 'local' ? input2 : idleInput;
      const inputs = [input1, second];
      for (const f of this.dogs) {
        if (f.ground !== -1) f.x += this.terrain[f.ground].x1 - old[f.ground].x1;
        this.captureInput(f, inputs[f.index]);
        this.move(f, inputs[f.index], dt);
      }
      this.separateGroundedFighters();
      this.resolveMelee();
      for (const f of this.dogs) if (f.attack?.landed) f.attack = null;
      this.updateDiscs(dt);
      if (this.fetch) this.updateBall(dt);
      const out = this.dogs.filter((f) => f.x < -115 || f.x > 1315 || f.y > 765 || f.y < -172);
      if (out.length) this.knockouts(out);
    }
    separateGroundedFighters() {
      const [a, b] = this.dogs;
      if (a.ground < 0 || a.ground !== b.ground || a.respawning || b.respawning) return;
      if ([a, b].some((f) => f.attack?.moveId === 'pipSlide' && f.attack.time < f.attack.start)) return;
      const spacing = a.stats.width + b.stats.width;
      const overlap = spacing - Math.abs(a.x - b.x);
      if (overlap <= 0) return;
      const [left, right] = a.x <= b.x ? [a, b] : [b, a];
      const surface = this.terrain[left.ground];
      const share = right.stats.weight / (left.stats.weight + right.stats.weight);
      left.x = clamp(left.x - overlap * share, surface.x1 - 3, surface.x2 - spacing + 3);
      right.x = left.x + spacing;
    }
    captureInput(f, input) {
      const was = f.prev;
      const pressed = (key) => input.tapped?.[key] || (input[key] && !was[key]);
      f.prev = { ...input };
      if (f.respawning > 0) return;
      if (pressed('jump')) f.jumpBuffer = inputWindow;
      if (pressed('shield')) f.guardBuffer = inputWindow;
      if (f.command?.type === 'attack' && !input.attack) f.command.released = true;
      if (!input.special) {
        if (f.command?.type === 'special') f.command.released = true;
        if (f.attack?.specialSide === 'up') f.attack.released = true;
      }
      const type = pressed('grab')
        ? 'grab'
        : pressed('special')
          ? 'special'
          : pressed('attack')
            ? 'attack'
            : null;
      if (type) {
        f.command = {
          type,
          aim: aimFor(input.y),
          face: Math.abs(input.x) > 0.2 ? Math.sign(input.x) : 0,
          facing: f.face,
          airSide: airDirection(input.x, input.y, f.face),
          life: inputWindow,
          heldFor: 0,
          released: (type === 'attack' || type === 'special') && !input[type],
        };
      }
    }
    move(f, input, dt) {
      for (const key of [
        'stun',
        'invuln',
        'ledgeLock',
        'drop',
        'dodge',
        'followPounce',
        'hopWindow',
        'jumpBuffer',
        'guardBuffer',
        'chainWindow',
        'landTime',
        'landingLag',
        'skidTime',
        'reboundTime',
        'coyote',
        'respawning',
      ])
        f[key] = Math.max(0, f[key] - dt);
      if (f.respawning > 0) return;
      if (f.command) {
        f.command.life -= dt;
        if (!f.command.released) f.command.heldFor += dt;
        if (f.command.life < -0.00001) f.command = null;
      }
      const jumpTap = f.jumpBuffer > 0;
      const attackTap = f.command?.type === 'attack';
      if (f.ledge) {
        f.ledgeTime += dt;
        const inward = f.ledge.left ? 1 : -1;
        if (jumpTap || input.x * inward > 0.45 || attackTap || f.ledgeTime > 2) {
          f.x = f.ledge.x + inward * 19;
          f.y = f.ledge.y;
          f.ground = f.ledge.index;
          f.ledge = null;
          f.ledgeLock = 0.52;
          if (!jumpTap) f.jumpBuffer = 0;
          if (attackTap) {
            f.command = null;
            beginAttack(f, 'quick');
          }
        } else if (input.y > 0.5 || input.x * inward < -0.5) {
          f.ledge = null;
          f.ledgeLock = 0.45;
          f.vy = 65;
          f.jumps = 1;
        } else return;
      }
      const grounded = f.ground !== -1;
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
        const chainTap = attackTap && f.command.aim === 0 && f.chainWindow > 0;
        const jumpFollow = jumpTap && current.jumpCancel;
        const ropeFollow =
          f.command?.type === 'special' && f.command.airSide === 'neutral' && current.specialCancel;
        const throwFollow = f.command?.type === 'grab' && current.grabCancel;
        if (chainTap || jumpFollow || ropeFollow || throwFollow) f.attack = null;
      }
      const free = !f.attack && f.stun <= 0 && f.dodge <= 0 && f.landingLag <= 0;
      const direction = aimFor(input.y);
      f.shield = free && grounded && input.shield && f.charge < 0 && f.command?.type !== 'grab' && !jumpTap;
      if (grounded && input.shield) f.guardBuffer = 0;
      f.shieldHP = clamp(f.shieldHP + (f.shield ? -0.13 : 0.24) * dt, 0, 1);
      if (f.shield && f.shieldHP <= 0) this.breakShield(f);
      if (free && !grounded && f.guardBuffer > 0 && !f.usedDodge) {
        f.guardBuffer = 0;
        f.usedDodge = true;
        f.dodge = 0.27;
        f.invuln = 0.22;
        f.cutJump = false;
        f.vx = input.x * 445;
        f.vy = input.y * 290 - 25;
        this.emit('dodge', { f });
      }
      if (grounded && free && !jumpTap && Math.abs(input.x) > 0.16 && f.charge < 0 && !f.shield)
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
        if (f.jumpBuffer > 0 && (f.jumps > 0 || f.coyote > 0)) {
          if (grounded && direction === 1 && this.terrain[f.ground].thin) {
            f.drop = 0.24;
            f.y += 9;
            f.vy = 110;
            f.jumps = 1;
          } else {
            if (f.coyote > 0) f.jumps = 2;
            f.vy = -f.stats.jump * (f.jumps === 2 ? 1 : 0.91);
            f.jumps--;
            f.cutJump = true;
            if (this.mode === 'solo' && f.index === 1)
              this.bot.jumpHold = this.bot.hop && f.kind !== 'brisket' ? 0.07 : 0.34;
            this.emit('jump', { f });
          }
          f.ground = -1;
          f.coyote = 0;
          f.jumpBuffer = 0;
          f.charge = -1;
          f.chainWindow = 0;
          f.landTime = 0;
          f.skidTime = 0;
          f.reboundTime = 0;
        }
        const command = f.command;
        if (f.charge >= 0 && (!command || command.type === 'attack')) {
          if (input.attack && !command) f.charge += dt;
          if (direction) f.chargeAim = direction;
          if (!input.attack || f.charge >= 0.85 || f.ground < 0 || command)
            groundStrike(f, f.chargeAim, f.charge);
        } else if (command) {
          f.command = null;
          if (command.face && (f.ground >= 0 || command.type !== 'attack')) f.face = command.face;
          if (command.type === 'grab') beginAttack(f, 'grab', command.aim);
          else if (command.type === 'special') this.special(f, command);
          else if (f.ground < 0) aerialStrike(f, command);
          else if (command.released) groundStrike(f, command.aim, command.heldFor);
          else {
            f.charge = command.heldFor;
            f.chargeAim = command.aim;
          }
        }
      }
      if (f.cutJump && (!input.jump || f.vy >= 0)) {
        if (!input.jump && f.vy < -265) f.vy *= 0.55;
        f.cutJump = false;
      }
      if (f.attack) {
        const a = f.attack;
        a.time += dt;
        if (a.specialSide && this.advanceSpecial(f, a, input, dt)) return;
        if (a.plunge && a.time < a.start - 1e-8) f.vy = -1540 * f.kit.gravity * dt;
        if ((a.plunge || a.burst) && !a.fired && a.time + 1e-8 >= a.start) {
          a.fired = true;
          if (a.plunge) f.vy = 685;
          if (a.burst) f.vx = f.face * Math.max(a.burst, f.vx * f.face + a.burst * 0.5);
        }
        if (a.time >= a.end) f.attack = null;
      }
      const sliding = f.attack?.motionLocked;
      if (f.stun > 0) {
        f.vx *= Math.pow(0.68, dt);
        f.vx += input.x * 100 * dt;
      } else if (f.dodge <= 0 && !sliding) {
        const onFloor = f.ground >= 0;
        const mobility = f.shield || f.charge >= 0 ? 0 : f.attack ? (onFloor ? 0.12 : 0.65) : 1;
        const steppingJab = f.attack?.step && f.attack.time < f.attack.start;
        const drag = onFloor ? (steppingJab ? 560 : 2630) : Math.abs(input.x) > 0.1 ? f.kit.airAccel : 155;
        f.vx = toward(f.vx, input.x * f.stats.speed * mobility, drag * dt);
      }
      const oldY = f.y;
      f.x += f.vx * dt;
      if (f.ground >= 0) {
        const p = this.terrain[f.ground];
        if (f.x < p.x1 - 7 || f.x > p.x2 + 7) {
          f.ground = -1;
          f.jumps = 1;
          f.coyote = 0.085;
        } else {
          f.y = p.y;
          f.vy = 0;
        }
      }
      if (f.ground < 0) {
        const gravity =
          f.dodge > 0 ? 430 : (input.y > 0.55 && f.vy > 0 && f.stun <= 0 ? 2580 : 1540) * f.kit.gravity;
        f.vy = Math.min(f.vy + gravity * dt, 970);
        f.y += f.vy * dt;
        if (f.vy >= 0) {
          let landing = -1;
          this.terrain.forEach((p, i) => {
            if (p.thin && f.drop > 0) return;
            if (
              f.x >= p.x1 - 5 &&
              f.x <= p.x2 + 5 &&
              oldY <= p.y + 2 &&
              f.y >= p.y &&
              (landing < 0 || p.y < this.terrain[landing].y)
            )
              landing = i;
          });
          if (landing >= 0) {
            const landingSpeed = f.vy;
            f.ground = landing;
            f.y = this.terrain[landing].y;
            f.vy = 0;
            if (f.attack?.airSide) {
              const a = f.attack,
                last = a.second || a;
              const committed = a.time + 1e-8 >= a.start && a.time < last.start + last.active + 0.05;
              f.landingLag = (committed ? a.land : 2) / 60;
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
            if (landingSpeed > 225) {
              f.landTime = 0.12;
              this.emit('land', { f, speed: landingSpeed });
            }
            if (f.stun > 0) f.stun *= 0.62;
          }
        }
        if (f.ground < 0 && !f.ledgeLock && !f.stun && !f.dodge && input.y < 0.55 && f.vy > -125)
          this.tryLedge(f, 33, 80);
      }
    }
    nearestLedge(f, horizontal, above, below) {
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
    hangLedge(f, edge) {
      f.ledge = edge;
      f.ledgeTime = 0;
      f.x = edge.x + (edge.left ? -13 : 13);
      f.y = edge.y + 46;
      f.vx = f.vy = 0;
      f.face = edge.left ? 1 : -1;
      f.ground = -1;
      f.attack = f.command = null;
      f.charge = -1;
      f.invuln = 0.25;
      f.jumpBuffer = f.guardBuffer = f.chainWindow = 0;
      restoreAir(f);
      this.emit('ledge', { f });
    }
    tryLedge(f, horizontal, below) {
      const edge = this.nearestLedge(f, horizontal, 5, below);
      if (edge) this.hangLedge(f, edge);
      return !!edge;
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
      a.released = !!command.released;
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
      this.emit(side === 'up' && id !== 'brisketCannon' ? 'recover' : 'special', { f, moveId: id });
    }
    advanceSpecial(f, a, input, dt) {
      if (a.projectile && !a.fired && a.time + 1e-8 >= a.start) {
        a.fired = true;
        this.throwItem(f, a);
      }
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
            const rival = this.dogs[1 - f.index];
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
            if (distance <= 615 * dt) this.hangLedge(f, a.anchor);
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
          if (a.disc && !this.projectiles.includes(a.disc)) {
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
      this.projectiles.push(d);
      this.emit(type === 'snare' ? 'ropeCast' : 'disc', { f, moveId: a.moveId });
    }
    attackArea(f) {
      const a = f.attack;
      if (a.box) {
        const [x, y, rx, ry] = a.landed && a.plunge ? [0, -17, 63, 22] : a.box;
        return { x: f.x + f.face * x, y: f.y + y, rx, ry };
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
    resolveMelee() {
      // Collect both active hitboxes before either hit can interrupt the other fighter.
      const hits = [],
        swats = [];
      for (const f of this.dogs) {
        const attack = f.attack;
        if (
          !attack ||
          attack.projectile ||
          attack.anchor ||
          attack.charging ||
          attack.diving ||
          (attack.moveId === 'brisketBrace' && !attack.riposte)
        )
          continue;
        const beat = attackWindow(attack);
        if (attack.time + 1e-8 < beat.start || attack.time >= beat.start + beat.active - 1e-8) continue;
        const beatIndex = beat === attack ? 0 : 1;
        const area = this.attackArea(f);
        const rival = this.dogs[1 - f.index];
        const rear = attack.airSide === 'back';
        const bothSides = attack.around || attack.airSide === 'neutral' || (attack.plunge && attack.landed);
        const hitFacing = (x) => (bothSides ? Math.sign(x - f.x) || f.face : rear ? -f.face : f.face);
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
        if (attack.hitBeat === beatIndex || rival.invuln > 0 || rival.respawning > 0) continue;
        if (
          Math.abs(rival.x - area.x) > area.rx + rival.stats.width ||
          Math.abs(rival.y - rival.stats.height * 0.52 - area.y) > area.ry + rival.stats.height * 0.4
        )
          continue;
        attack.hitBeat = beatIndex;
        hits.push({
          f,
          rival,
          attack,
          beat,
          face: hitFacing(rival.x),
          point: {
            x: clamp(area.x, rival.x - rival.stats.width, rival.x + rival.stats.width),
            y: clamp(area.y, rival.y - rival.stats.height, rival.y - 4),
          },
        });
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
      for (const { f, rival, attack, beat, face, point } of hits) {
        const strength =
          attack.name === 'heavy' || attack.moveId === 'brisketCannon' ? 1 + attack.power * 0.35 : 1;
        attack.connected = this.hit(
          rival,
          f,
          beat.dmg * strength,
          beat.base * strength,
          beat.growth * strength,
          attack.aim,
          attack.name,
          face,
          point,
          attack.moveId ? beat : null,
          attack.moveId,
        );
        if (attack.connected && attack.name === 'rope')
          rival.vx = -face * Math.max(185, Math.abs(rival.vx) * 0.8);
        if (attack.connected && attack.moveId === 'noodleSling') {
          attack.reeling = attack.motionLocked = true;
          attack.reelTarget = rival;
          attack.reelEnd = attack.time + 0.17;
        }
      }
      for (const { f, attack } of hits) {
        if (!attack.connected || f.attack !== attack) continue;
        if (attack.pogo && !attack.landed && !f.usedPogo) {
          f.usedPogo = true;
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
    }
    breakShield(f) {
      f.shield = false;
      f.reaction = null;
      f.shieldHP = 0.24;
      f.stun = 0.85;
      f.charge = -1;
      this.emit('break', { f });
    }
    hit(target, owner, damage, base, growth, aim, name, face, point, move, moveId) {
      if (target.invuln > 0 || target.respawning > 0) return false;
      const grab = name === 'grab' || move?.commandGrab;
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
      if (target.shield && !grab) {
        target.shieldHP -= damage * 0.027;
        if (target.shieldHP <= 0) this.breakShield(target);
        this.emit('block', { f: target, point, face });
        return false;
      }
      if (this.mode === 'training' && target.index === 1) {
        if (target.stun <= 0) this.lastCombo = { hits: 0, damage: 0 };
        this.lastCombo.hits++;
        this.lastCombo.damage += Math.min(damage, 999 - target.damage);
      }
      target.damage = Math.min(999, target.damage + damage);
      const speed = (base + target.damage * growth) / target.stats.weight;
      if (move) {
        const angle = ((move.angle < 0 && target.ground >= 0 ? 46 : move.angle) * Math.PI) / 180;
        target.vx = face * speed * Math.cos(angle);
        target.vy = -speed * Math.sin(angle) - (angle >= 0 ? 40 : 0);
        if (move.pull) {
          const pocket = owner.x + face * (owner.stats.width + target.stats.width - 4);
          target.vx = clamp((pocket - target.x) * 9.5, -350, 350);
          if (move.lift) target.vy = -Math.max(move.lift, Math.abs(target.vy));
        }
      } else {
        const upward = aim < 0,
          downward = aim > 0 && target.ground < 0;
        target.vx = face * speed * (upward ? 0.34 : downward ? 0.48 : 0.93);
        target.vy = downward ? speed * 0.8 : -speed * (upward ? 1.13 : 0.59) - 48;
      }
      if (target.ground >= 0) target.jumps = 1;
      target.y -= 1;
      target.ground = -1;
      target.coyote = 0;
      target.cutJump = false;
      target.chainWindow = 0;
      target.hopWindow = target.followPounce = 0;
      target.command = null;
      target.jumpBuffer = 0;
      target.guardBuffer = 0;
      target.landTime = 0;
      target.landingLag = 0;
      target.skidTime = 0;
      target.reboundTime = 0;
      target.ledge = null;
      target.ledgeLock = 0.28;
      target.attack = null;
      target.charge = -1;
      target.shield = false;
      target.stun = clamp(0.115 + speed * 0.00036, 0.14, 0.58);
      if (move?.stun) target.stun = Math.max(target.stun, move.stun);
      const emphatic = !!move?.hard || name === 'heavy' || name === 'shoulder' || speed > 630;
      target.reaction = { duration: target.stun, face: -face, hard: emphatic || speed > 460 };
      this.hitStop = Math.max(this.hitStop, emphatic ? 4 / 60 : 2 / 60);
      this.emit('hit', { f: target, owner, speed, name, moveId, face, point, emphatic });
      return true;
    }
    updateDiscs(dt) {
      this.projectiles = this.projectiles.filter((d) => {
        const owner = this.dogs[d.owner],
          target = this.dogs[1 - d.owner];
        if (d.caught) return false;
        d.age += dt;
        const impact = (direction) => {
          const spec = specials[d.moveId] || specials.cloverRound;
          this.hit(
            target,
            owner,
            spec.dmg,
            spec.base,
            spec.growth,
            0,
            d.type === 'snare' ? 'snare' : 'disc',
            direction || owner.face,
            { x: d.x, y: d.y },
            spec,
            d.moveId,
          );
        };
        if (d.type === 'snare' || d.type === 'skip') {
          if (d.platform >= 0) {
            const p = this.terrain[d.platform];
            d.x = p.x1 + d.offset;
            d.y = p.y - 3;
            d.armedIn -= dt;
            if (
              d.armedIn <= 0 &&
              target.ground === d.platform &&
              !target.invuln &&
              Math.abs(target.x - d.x) < target.stats.width + 22
            ) {
              impact(Math.sign(target.x - owner.x));
              return false;
            }
          } else {
            const oldY = d.y;
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
            if (
              d.type === 'skip' &&
              !target.invuln &&
              !target.respawning &&
              Math.abs(target.x - d.x) < target.stats.width + 13 &&
              d.y >= target.y - target.stats.height - 7 &&
              d.y <= target.y + 5
            ) {
              impact(Math.sign(d.vx));
              return false;
            }
          }
          return d.age < 2.65 && d.x > -135 && d.x < 1335 && d.y < 780;
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
        const pass = d.back ? 1 : 0;
        if (
          !d.hit[pass] &&
          Math.abs(target.x - d.x) < target.stats.width + 16 &&
          Math.abs(target.y - 39 - d.y) < 42 &&
          target.invuln <= 0
        ) {
          impact(Math.sign(d.vx));
          d.hit[pass] = true;
        }
        return d.age < 2.6 && d.x > -130 && d.x < 1330;
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
            x: this.stage === 'picnic' ? 600 : 425,
            y: 135,
            vx: 58,
            vy: 25,
            hits: 0,
            owner: -1,
            age: 0,
          };
        return;
      }
      const b = this.ball,
        oldY = b.y;
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
        if (
          target.invuln <= 0 &&
          Math.abs(b.x - target.x) < target.stats.width + 11 &&
          Math.abs(b.y - target.y + 37) < 43
        ) {
          this.hit(
            target,
            this.dogs[b.owner],
            b.hits === 3 ? 19 : 4 + b.hits,
            b.hits === 3 ? 290 : 110,
            b.hits === 3 ? 6.2 : 2.2,
            0,
            'ball',
            Math.sign(b.vx),
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
    knockouts(out) {
      for (const f of out) {
        this.emit('ko', { f, x: f.x, y: f.y });
        if (this.mode !== 'training') f.stocks--;
        this.projectiles = this.projectiles.filter((d) => d.owner !== f.index);
      }
      const eliminated = this.dogs.filter((f) => f.stocks <= 0);
      if (eliminated.length === 1) {
        this.end = 1 - eliminated[0].index;
        this.emit('win', { f: this.dogs[this.end] });
        return;
      }
      if (eliminated.length === 2)
        this.dogs.forEach((f) => {
          f.stocks = 1;
        });
      out.forEach((f) => this.spawn(f, true));
    }
    cpu(dt) {
      const f = this.dogs[1],
        foe = this.dogs[0],
        brain = this.bot;
      brain.jumpHold = Math.max(0, brain.jumpHold - dt);
      const result = { ...idleInput, jump: brain.jumpHold > 0 };
      const solid = this.terrain.filter((p) => !p.thin);
      const under = solid.find((p) => f.x >= p.x1 + 3 && f.x <= p.x2 - 3);
      const closest = solid.reduce((best, p) =>
        Math.abs(f.x - clamp(f.x, p.x1, p.x2)) < Math.abs(f.x - clamp(f.x, best.x1, best.x2)) ? p : best,
      );
      const outerLeft = solid[0].x1,
        outerRight = solid[solid.length - 1].x2;
      const outside = f.x < outerLeft || f.x > outerRight;
      const unsafe = f.ground < 0 && (outside || f.y > closest.y + 28 || (!under && f.y > closest.y - 46));
      brain.timer -= dt;
      brain.hold = Math.max(0, brain.hold - dt);
      brain.guard = Math.max(0, brain.guard - dt);
      const dx = foe.x - f.x,
        far = Math.abs(dx);
      const opponentOffstage =
        foe.ground < 0 && (foe.x < outerLeft - 5 || foe.x > outerRight + 5 || foe.y > closest.y + 38);
      const targetX = opponentOffstage ? clamp(foe.x, closest.x1 + 37, closest.x2 - 37) : foe.x;
      const spacing = f.kind === 'noodle' ? 88 : f.kind === 'clover' ? 57 : 40;
      result.x = Math.abs(targetX - f.x) > (opponentOffstage ? 10 : spacing) ? Math.sign(targetX - f.x) : 0;
      if (f.ledge) {
        result.x = f.ledge.left ? 1 : -1;
        return result;
      }
      const inside = clamp(f.x, closest.x1 + 52, closest.x2 - 52);
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
        brain.hop = null;
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
      if (brain.timer <= 0) {
        brain.timer = 0.12 + this.random() * 0.14;
        brain.pulse = {};
        if (foe.y < f.y - 52 && far < 240 && f.jumps > 0) brain.pulse.jump = true;
        if (f.ground >= 0 && this.terrain[f.ground].thin && foe.y > f.y + 70 && far < 240) {
          brain.pulse.jump = true;
          brain.pulse.down = true;
        }
        if (Math.abs(foe.y - f.y) < 105 && !f.attack && !f.stun) {
          const clearRun = dx >= 0 ? closest.x2 - f.x : f.x - closest.x1;
          const safeSpecial = clearRun > (f.kind === 'brisket' ? 295 : f.kind === 'pip' ? 185 : -1);
          if (far < 91) {
            if (foe.shield && this.random() < 0.8) brain.pulse.grab = true;
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
        if (brain.pulse.down) result.y = 1;
        result.special = !!brain.pulse.special;
        result.grab = !!brain.pulse.grab;
        if (result.grab && f.kind === 'brisket' && far < 61) {
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
      if (brain.hop) {
        brain.hopDelay -= dt;
        if (f.stun || f.respawning || brain.hopDelay < -0.15) brain.hop = null;
        else if (f.ground < 0 && !f.attack && brain.hopDelay <= 0) {
          result.x = brain.hop === 'forward' ? f.face : 0;
          result.y = brain.hop === 'down' ? 1 : 0;
          result.attack = true;
          result.special = result.grab = result.shield = false;
          result.tapped = { attack: true };
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
  window.DogFight = {
    fighters,
    kits,
    moves,
    specials,
    arenas,
    platforms,
    Battle,
    idleInput,
    clamp,
    attackWindow,
  };
})();
