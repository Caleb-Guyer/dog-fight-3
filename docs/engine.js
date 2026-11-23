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
    smash: false,
    special: false,
    shield: false,
    grab: false,
  });
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const toward = (value, target, amount) => value + clamp(target - value, -amount, amount);
  const inputWindow = 7 / 60;
  const runStick = 0.55;
  const runSpeed = 0.6;
  const pivotWindow = 7 / 60;
  const ledgeDriftGrace = 12 / 60;
  const hangingFeet = [0, -13, 46];
  const sameLedge = (a, b) => a && b && a.index === b.index && a.left === b.left;
  function smoothStep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }
  const tumbleSpeed = 430;
  const maxDI = (18 * Math.PI) / 180;
  const techWindow = 11 / 60;
  const techLockout = 28 / 60;
  const shieldDropTime = 10 / 60;
  const parryWindow = 5 / 60;
  const jumpSquatTime = 3 / 60;
  // Total frames and initial invulnerability frames for each landing option.
  const floorFrames = {
    tech: [19, 13],
    techRoll: [29, 17],
    downed: [75, 0],
    floorRise: [23, 10],
    getupRoll: [34, 13],
    floorAttack: [36, 6],
  };
  const attackHold = 0.21;
  const smashChargeTime = 1;
  const smashHoldLimit = 2;
  const aimFor = (y) => (y < -0.45 ? -1 : y > 0.45 ? 1 : 0);
  // Dodge frames are [total, first untouchable frame, last untouchable frame], at 60 Hz.
  const kits = {
    pip: {
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
        'Tap Attack three times for Heel Kick. For an aerial finish, press Jump, Forward and Attack together as Cross connects.',
      airAccel: 1060,
      gravity: 1.0,
      fallSpeed: 630,
      fastFallSpeed: 855,
    },
    brisket: {
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
      gravity: 1.17,
      fallSpeed: 740,
      fastFallSpeed: 960,
    },
    noodle: {
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
      gravity: 0.93,
      fallSpeed: 545,
      fastFallSpeed: 730,
    },
    clover: {
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
      label: 'Get-up Sweep',
      frames: [11, 6, 19],
      box: [0, -21, 59, 19],
      floorAttack: true,
      around: true,
      dmg: 7,
      base: 165,
      growth: 2.7,
      angle: 29,
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
      land: 3,
      landingWindow: [3, 12],
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
      landingWindow: [3, 14],
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
      land: 4,
      landingWindow: [2, 10],
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
      pogo: true,
      land: 7,
      landingWindow: [3, 20],
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
      land: 9,
      landingWindow: [4, 24],
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
      land: 12,
      landingWindow: [4, 27],
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
      plunge: true,
      hard: true,
      land: 18,
      landingWindow: [1, 46],
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
      landingWindow: [3, 17],
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
      landingWindow: [5, 20],
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
      hint: 'Sweep the disc forward to send your opponent outward.',
      frames: [5, 7, 10],
      box: [45, -42, 42, 26],
      dmg: 8,
      base: 164,
      growth: 3.85,
      angle: 34,
      land: 5,
      landingWindow: [3, 15],
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
      land: 7,
      landingWindow: [3, 18],
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
  const smashes = {
    pipBoltKick: {
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
      label: 'Haymaker',
      hint: 'Plant your feet and throw a heavy straight punch. It has a slow windup and sends rivals far sideways.',
      frames: [12, 5, 24],
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
      hint: 'Wrap both paws around a nearby rival and lift them off their feet. Holds longest.',
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
  // Only the plank ends, roof fascias and brickwork have vertical collision faces.
  function stageWalls(stage) {
    const bands =
      stage === 'laundry'
        ? [
            [0, 0, 15],
            [3, 15, 18],
            [9, 18, 225],
          ]
        : [
            [0, 0, 14],
            [5, 14, 22],
            [12, 22, 27],
            [18, 27, 30],
          ];
    return platforms(stage, 0).flatMap((p, index) =>
      p.thin
        ? []
        : bands.flatMap(([inset, top, bottom]) =>
            [true, false].map((left) => ({
              x: left ? p.x1 + inset : p.x2 - inset,
              top: p.y + top,
              bottom: p.y + bottom,
              index,
              left,
            })),
          ),
    );
  }
  const solidWalls = { picnic: stageWalls('picnic'), laundry: stageWalls('laundry') };
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
      run: null,
      jumps: 2,
      usedUp: false,
      usedAir: false,
      usedDodge: false,
      usedPogo: false,
      stun: 0,
      reaction: null,
      tumble: null,
      wallAction: null,
      floorAction: null,
      techBuffer: 0,
      techLock: 0,
      invuln: 0,
      respawning: 0,
      ledge: null,
      ledgeLock: 0,
      ledgeTime: 0,
      ledgeProtectionReady: true,
      ledgeTrump: null,
      drop: 0,
      shield: false,
      shieldHP: 1,
      shieldAxis: '',
      guardIntent: '',
      shieldDrop: 0,
      parryFlash: 0,
      parryFace: index ? -1 : 1,
      dodge: 0,
      airDodge: null,
      guardAim: null,
      charge: -1,
      chargeDirection: 'neutral',
      chargeReleased: false,
      smashCharge: null,
      grip: null,
      regrabLock: 0,
      throwBounce: null,
      lastSmashPower: null,
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
      jumpSquat: null,
      fastFall: false,
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
    f.charge = -1;
    f.chargeDirection = 'neutral';
    f.chargeReleased = false;
    f.smashCharge = null;
  }
  function shieldDirection(x, y, previous) {
    // Use a lower threshold to retain an existing stick direction across small analog fluctuations.
    if (y >= (previous === 'down' ? 0.4 : 0.62) && y >= Math.abs(x) * 0.85) return 'down';
    const side = x < 0 ? 'left' : 'right';
    return Math.abs(x) >= (previous === side ? 0.4 : 0.62) ? side : '';
  }
  function beginAttack(f, name, aim, power, moveId) {
    cancelCharge(f);
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
  function trackGroundRun(f, axis, dt) {
    const direction = Math.abs(axis) >= runStick ? Math.sign(axis) : 0;
    if (direction && f.vx * direction >= f.stats.speed * runSpeed) {
      if (f.run?.face !== direction) f.run = { face: direction, grace: 0, turned: false };
      f.run.grace = pivotWindow;
      f.run.turned = false;
    } else if (f.run) {
      if (direction) f.run.turned = direction !== f.run.face;
      f.run.grace -= dt;
      if (f.run.grace <= 1e-8) f.run = null;
    }
  }
  function beginGrab(f, style, runFace, aim) {
    const id = style === 'pivot' ? f.kit.pivotGrab : style === 'dash' ? f.kit.dashGrab : f.kit.grab;
    if (style !== 'standing') f.face = style === 'pivot' ? -runFace : runFace;
    beginAttack(f, 'grab', aim, 0, id);
    const attack = f.attack;
    attack.grabAttempt = true;
    attack.grabStyle = style;
    attack.runFace = runFace;
    if (style !== 'standing') f.vx = runFace * Math.max(0, f.vx * runFace) * attack.carry;
    else if (f.ground >= 0 && attack.step) f.vx = f.face * Math.max(attack.step, f.vx * f.face);
  }
  function groundStrike(f, side, heldFor) {
    const step = f.chainWindow > 0 ? f.chainNext : 0;
    const chain = f.kit.ground;
    const tilt = f.kit.tilts[side];
    const name = tilt ? 'tilt' : step === 0 ? 'jab' : step === chain.length - 1 ? 'finisher' : 'jab2';
    beginAttack(f, name, verticalAim(side), 0, tilt || chain[step]);
    // The windup begins on the press, including a tap released during recovery.
    f.attack.time = Math.min(heldFor, f.attack.start - 1 / 60);
    if (tilt) f.attack.tiltSide = side;
    else if (step < chain.length - 1) {
      f.chainNext = step + 1;
      f.chainWindow = f.attack.end + 0.23;
    }
    if (f.attack.step) f.vx += f.face * f.attack.step;
  }
  function smashPower(heldFor) {
    return clamp(heldFor / smashChargeTime, 0, 1);
  }
  const smashStrength = (power) => 1 + 0.4 * power;
  function lockSmash(f, button, aim, face) {
    const side = aim < 0 ? 'up' : aim > 0 ? 'down' : 'side';
    f.smashCharge = { moveId: f.kit.smashes[side], side, face: face || f.face, button };
    f.face = f.smashCharge.face;
    f.vx = 0;
    f.shield = false;
    f.chainWindow = f.landTime = f.skidTime = 0;
  }
  function releaseSmash(f) {
    const { moveId, side, face } = f.smashCharge;
    const power = smashPower(f.charge);
    f.face = face;
    beginAttack(f, 'heavy', verticalAim(side), power, moveId);
    f.attack.smashSide = side;
    f.lastSmashPower = power;
  }
  function aerialStrike(f, command) {
    const side = command.airSide;
    f.face = command.facing;
    beginAttack(f, 'aerial', side === 'up' ? -1 : side === 'down' ? 1 : 0, 0, f.kit.air[side]);
    f.attack.airSide = side;
    if (f.attack.plunge) {
      f.fastFall = false;
      f.cutJump = false;
      f.vx *= 0.35;
      f.vy = Math.min(0, f.vy);
    }
  }
  function attackWindow(attack) {
    const next = attack.second || attack.late;
    return next && attack.time + 1e-8 >= next.start ? next : attack;
  }
  function restoreAir(f) {
    f.jumpSquat = null;
    f.fastFall = false;
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
    return !f.stun && !f.tumble && !f.grip && !f.ledge && !f.ledgeTrump && !f.wallAction &&
      !f.airDodge && !f.throwBounce && !f.attack?.plunge && !f.attack?.motionLocked;
  }
  function bufferSquatInput(f, input) {
    const squat = f.jumpSquat;
    if (squat.time + 1e-8 >= jumpSquatTime) return;
    if (f.command?.type === 'attack') squat.aerial ??= f.command;
    if (!input.jump || squat.aerial) squat.short = true;
  }
  function bodyHeight(f) {
    const action = f.floorAction;
    if (!action || action.safeFrom !== undefined) return f.stats.height;
    if (action.type === 'downed') return f.stats.height * 0.42;
    const rise = clamp((action.time / action.duration - 0.55) / 0.45, 0, 1);
    return f.stats.height * (0.55 + 0.45 * rise);
  }
  function cpuLaunchAim(f) {
    const towardCenter = f.x < 600 ? 1 : -1;
    return { x: towardCenter, y: Math.abs(f.vx) > Math.abs(f.vy) ? -1 : 0 };
  }
  class Battle {
    constructor(config, event = () => {}, random = Math.random) {
      this.stage = config.stage;
      this.layout = config.layout || null;
      this.stageWidth = this.layout?.length || 1200;
      this.mode = config.mode;
      this.fetch = config.fetch;
      this.time = 0;
      this.end = null;
      this.emit = event;
      this.random = random;
      this.dogs = [newFighter(config.p1, 0), newFighter(config.p2, 1)];
      this.terrain = this.layout?.terrain || platforms(this.stage, 0);
      this.ledgeClaims = [];
      this.grapple = null;
      this.projectiles = [];
      this.ball = null;
      this.nextBall = 4;
      this.trainingDamage = 0;
      this.wallPractice = null;
      this.trumpPractice = null;
      this.rollPractice = null;
      this.launchPractice = null;
      this.shieldPractice = null;
      this.airPractice = null;
      this.lastCombo = { hits: 0, damage: 0 };
      this.hitStop = 0;
      this.bot = {
        timer: 0,
        pulse: {},
        hold: 0,
        guard: 0,
        jumpHold: 0,
        hop: null,
        hopDelay: 0,
        smashHold: 0,
      };
      if (this.mode === 'training') this.resetTraining();
      else this.dogs.forEach((f) => this.spawn(f, false));
    }
    spawn(f, fromKO) {
      if (this.grapple && (this.dogs.length === 2 || f.grip)) this.breakGrapple(false);
      const point = this.layout?.spawns[f.index];
      const ground = point ? point.ground : this.stage === 'laundry' && f.index === 1 ? 1 : 0;
      const stocks = f.stocks;
      Object.assign(f, newFighter(f.kind, f.index));
      f.stocks = stocks;
      f.x = point?.x ?? arenas[this.stage].spawn[f.index];
      f.y = this.terrain[ground].y;
      f.ground = ground;
      if (f.index === 1) {
        this.bot.jumpHold = 0;
        this.bot.hop = null;
        this.bot.guardRead = null;
        this.bot.airRead = null;
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
    resetTraining(ledge = false, fromHang = false) {
      if (this.wallPractice) {
        this.stage = this.wallPractice.original.stage;
        this.dogs = this.wallPractice.original.dogs;
        this.terrain = platforms(this.stage, this.time);
        this.wallPractice = null;
      }
      this.ledgeClaims.length = 0;
      this.trumpPractice = null;
      this.rollPractice = null;
      this.launchPractice = null;
      this.shieldPractice = null;
      this.airPractice = null;
      this.dogs.forEach((f) => this.spawn(f, false));
      this.projectiles = [];
      this.ball = null;
      this.nextBall = 4;
      this.hitStop = 0;
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
    resetLaunchPractice() {
      this.resetTraining();
      this.dogs[0].damage = 90;
      this.launchPractice = { phase: 'ready', time: 0, grabStarted: false };
    }
    resetWallPractice(side = 'left') {
      this.resetTraining();
      const original = { stage: this.stage, dogs: this.dogs };
      this.stage = 'laundry';
      this.terrain = platforms(this.stage, this.time);
      const inward = side === 'right' ? 1 : -1;
      const roof = this.terrain[inward === 1 ? 1 : 0];
      const lip = inward === 1 ? roof.x1 : roof.x2;
      this.dogs = [newFighter('noodle', 0), newFighter('pip', 1)];
      const [noodle, pip] = this.dogs;
      Object.assign(noodle, { x: lip - inward * 58, y: roof.y + 121, face: inward, damage: 90, jumps: 1 });
      Object.assign(pip, {
        x: lip - inward * 106,
        y: roof.y + 121,
        face: -inward,
        jumps: 1,
        damage: this.trainingDamage,
      });
      this.wallPractice = { phase: 'ready', time: 0, side, inward, swung: false, outcome: '', original };
    }
    resetShieldPractice(pattern = 'strike') {
      this.resetTraining();
      this.shieldPractice = { pattern, phase: 'ready', time: 0, outcome: '', lastDodge: '' };
    }
    resetLedgeRollPractice(pattern = 'guard', side = 'left') {
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
    resetAirPractice(pattern = 'neutral', side = 'left') {
      this.resetTraining();
      const [f, dummy] = this.dogs;
      const solid = this.terrain.filter((p) => !p.thin);
      const platform = side === 'left' ? solid[0] : solid[solid.length - 1];
      const inward = side === 'left' ? 1 : -1;
      const edge = inward > 0 ? platform.x1 : platform.x2;
      if (pattern === 'edge') {
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
      this.airPractice = { pattern, side, phase: 'ready', time: 0, evaded: '', outcome: '' };
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
      if (drill.phase === 'done') return idleInput;
      const [f, dummy] = this.dogs;
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
    finishShieldPractice(outcome) {
      const drill = this.shieldPractice;
      if (!drill || (drill.phase !== 'attack' && drill.phase !== 'windup')) return;
      drill.phase = 'done';
      drill.outcome = outcome;
      this.emit('shieldResult', {
        f: this.dogs[0],
        pattern: drill.pattern,
        outcome,
        lastDodge: drill.lastDodge,
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
      if (drill.phase === 'ready' && input.shield) {
        drill.phase = 'windup';
        this.emit('shieldCue', { f: this.dogs[0], phase: 'windup', pattern: drill.pattern });
      }
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
        return drill.pattern === 'grab' ? { ...idleInput, grab: true } : idleInput;
      }
      if (drill.phase === 'attack') {
        drill.time += dt;
        const dummy = this.dogs[1];
        if (drill.time > 0.3 && !dummy.attack && !this.projectiles.some((d) => d.owner === 1))
          this.finishShieldPractice('miss');
      }
      return idleInput;
    }
    practiceInput(dt) {
      const drill = this.launchPractice;
      if (drill.phase === 'ready') {
        drill.time += dt;
        if (drill.time >= 0.32 && !drill.grabStarted) {
          drill.grabStarted = true;
          return { ...idleInput, grab: true };
        }
        if (this.grapple && drill.time >= 0.95) return { ...idleInput, y: -1 };
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
    releaseLaunch(f, input) {
      const raw = { x: f.vx, y: f.vy };
      const speed = Math.hypot(raw.x, raw.y);
      // The perpendicular component rotates the launch once. Parallel input preserves the line.
      const stick = Math.hypot(input.x, input.y);
      const cross = (raw.x * input.y - raw.y * input.x) / (speed * Math.max(1, stick));
      const angle = stick > 0.2 ? maxDI * clamp(cross, -1, 1) : 0;
      f.vx = raw.x * Math.cos(angle) - raw.y * Math.sin(angle);
      f.vy = raw.x * Math.sin(angle) + raw.y * Math.cos(angle);
      f.tumble.pending = false;
      this.emit('launchDI', {
        f,
        angle,
        raw,
        velocity: { x: f.vx, y: f.vy },
        point: { x: f.x, y: f.y - f.stats.height * 0.52 },
      });
    }
    step(dt, input1 = idleInput, input2 = idleInput) {
      if (this.end !== null) return;
      const wallDrill = this.wallPractice;
      if (wallDrill?.phase === 'ready') {
        wallDrill.time += dt;
        this.dogs[0].prev = { ...input1 };
        if (wallDrill.time + 1e-8 < 0.75) return;
        wallDrill.phase = 'swing';
        this.emit('wallCue', { f: this.dogs[0] });
      }
      if (this.trumpPractice?.phase === 'ready') {
        if (!(Math.abs(input1.x) > 0.2 || input1.jump || input1.shield || input1.special || input1.attack))
          return;
        this.trumpPractice.phase = 'approach';
      }
      if (this.rollPractice?.phase === 'ready') {
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
      if (this.airPractice?.phase === 'ready') {
        const start =
          this.airPractice.pattern === 'neutral'
            ? input1.jump
            : Math.hypot(input1.x, input1.y) >= 0.35 || input1.shield || input1.jump || input1.special;
        if (!start) return;
        this.airPractice.phase = 'approach';
        this.emit('airStart', { f: this.dogs[0], pattern: this.airPractice.pattern });
      }
      if (this.hitStop > 0) {
        this.captureInput(this.dogs[0], input1);
        if (this.mode === 'local') this.captureInput(this.dogs[1], input2);
        this.hitStop = this.hitStop <= dt + 1e-8 ? 0 : this.hitStop - dt;
        if (!this.hitStop) {
          for (const f of this.dogs) {
            if (!f.tumble?.pending) continue;
            const input =
              f.index === 0
                ? input1
                : this.mode === 'local'
                  ? input2
                  : this.cpuControlled(f)
                    ? cpuLaunchAim(f)
                    : idleInput;
            this.releaseLaunch(f, input);
          }
        }
        return;
      }
      this.time += dt;
      const old = this.terrain;
      this.terrain = this.layout?.terrain || platforms(this.stage, this.time);
      const second =
        this.mode === 'solo'
          ? this.cpu(dt)
          : this.mode === 'local' || this.mode === 'adventure'
            ? input2
            : this.launchPractice
              ? this.practiceInput(dt)
              : this.shieldPractice
                ? this.shieldPracticeInput(dt, input1)
                : this.airPractice
                  ? this.airPracticeInput(dt)
                  : this.rollPractice
                    ? this.rollPracticeInput(dt)
                    : this.trumpPractice
                      ? this.trumpPracticeInput()
                      : idleInput;
      const settingUpWallHit = wallDrill?.phase === 'swing';
      const inputs = [
        this.launchPractice?.phase === 'ready' || settingUpWallHit ? idleInput : input1,
        ...(Array.isArray(second) ? second : [second]),
      ];
      if (settingUpWallHit && !wallDrill.swung) {
        inputs[1] = { ...idleInput, x: wallDrill.inward, attack: true };
        wallDrill.swung = true;
      }
      for (const f of this.dogs) {
        if (f.ground !== -1) f.x += this.terrain[f.ground].x1 - old[f.ground].x1;
        this.captureInput(f, inputs[f.index]);
        if (!f.grip) this.move(f, inputs[f.index], dt);
        f.techBuffer = Math.max(0, f.techBuffer - dt);
        f.techLock = Math.max(0, f.techLock - dt);
      }
      if (settingUpWallHit) this.dogs[0].prev = { ...input1 };
      if (this.grapple) this.advanceGrapple(dt);
      for (const f of this.dogs) {
        if (f.ground >= 0) {
          f.ledgeProtectionReady = true;
          f.ledgeTrump = null;
          f.wallAction = null;
        }
      }
      if (this.ledgeClaims.length) this.resolveLedgeClaims();
      this.separateGroundedFighters();
      this.resolveMelee();
      for (const f of this.dogs) if (f.attack?.landed) f.attack = null;
      this.updateDiscs(dt);
      if (
        this.fetch &&
        !this.launchPractice &&
        !this.shieldPractice &&
        !this.airPractice &&
        !this.rollPractice &&
        !this.trumpPractice &&
        !wallDrill
      )
        this.updateBall(dt);
      const out = this.dogs.filter(
        (f) => !f.absent && (f.x < -115 || f.x > this.stageWidth + 115 || f.y > 765 || f.y < -172),
      );
      if (out.length) this.knockouts(out);
    }
    separateGroundedFighters(a = this.dogs[0], b = this.dogs[1]) {
      if (a.ground < 0 || a.ground !== b.ground || a.respawning || b.respawning) return;
      if ([a, b].some((f) => f.attack?.moveId === 'pipSlide' && f.attack.time < f.attack.start)) return;
      if ([a, b].some((f) => f.floorAction?.dir)) return;
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
      const grabX = input.grabX ?? input.x;
      const previousAxis = f.shieldAxis;
      f.shieldAxis = shieldDirection(grabX, input.y, previousAxis);
      f.prev = { ...input };
      if (f.respawning > 0) return;
      if (f.ground < 0 && f.vy >= 0 && input.y >= 0.65 && !(was.y >= 0.65) && controlsFall(f))
        f.fastFall = true;
      const floor = f.floorAction;
      if (
        f.ground >= 0 &&
        !floor &&
        !f.grip &&
        !f.attack &&
        !f.stun &&
        !f.landingLag &&
        f.charge < 0 &&
        f.shieldDrop <= 1e-8
      ) {
        if (input.shield && f.shieldAxis && (pressed('shield') || f.shieldAxis !== previousAxis)) {
          f.guardIntent = f.shieldAxis;
        } else if (f.shield && was.shield && !input.shield && !f.guardIntent) {
          f.guardIntent = 'release';
        }
      }
      if (floor?.type === 'downed') {
        if (floor.time + inputWindow >= 12 / 60) {
          if (pressed('attack')) floor.choice = { type: 'floorAttack', dir: 0 };
          else if (pressed('jump') || (input.y < -0.5 && was.y >= -0.5))
            floor.choice = { type: 'floorRise', dir: 0 };
          else if (Math.abs(grabX) > 0.5 && (was.grabX ?? was.x) * Math.sign(grabX) <= 0.5)
            floor.choice = { type: 'getupRoll', dir: Math.sign(grabX) };
        }
        return;
      }
      if (floor && floor.duration - floor.time > inputWindow) return;
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
              if ((!grip.pending || grip.pending === 'pummel') && (changed || pressed('grab'))) {
                grip.pending = changed ? direction : 'forward';
              } else if (!grip.pending && pressed('attack')) grip.pending = 'pummel';
            } else if (['jump', 'attack', 'smash', 'special', 'shield', 'grab'].some(pressed)) {
              grip.remaining -= 0.135;
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
            beginGrab(f, 'pivot', a.runFace, a.aim);
            f.attack.time = a.time;
          } else if (a.grabStyle === 'standing' && changed && a.time < a.start + a.active)
            a.queuedThrow = direction;
        }
      }
      if (pressed('jump')) f.jumpBuffer = inputWindow;
      if (pressed('shield')) {
        f.guardBuffer = inputWindow;
        // Keep the initial world-space aim when Shield is tapped during a freeze or recovery.
        f.guardAim = { x: input.airDodgeX ?? input.grabX ?? input.x, y: input.airDodgeY ?? input.y };
        if (f.tumble) {
          if (f.techLock <= 1e-8) {
            f.techBuffer = techWindow;
            f.techLock = techLockout;
            f.tumble.techDir = Math.abs(input.x) > 0.45 ? Math.sign(input.x) : 0;
          }
          if (
            f.stun > 0 ||
            this.floorAhead(f, techWindow + 1 / 60) >= 0 ||
            this.wallAhead(f, techWindow + 1 / 60)
          )
            f.guardBuffer = 0;
        }
      }
      if (f.command?.grabStyle === 'dash' && grabX * f.command.runFace <= -runStick)
        f.command.grabStyle = 'pivot';
      if (f.command && !input[f.command.type]) f.command.released = true;
      if (f.charge >= 0 && !input[f.smashCharge?.button || 'attack']) f.chargeReleased = true;
      if (!input.special) {
        if (f.attack?.specialSide === 'up') f.attack.released = true;
      }
      const type = pressed('grab')
        ? 'grab'
        : pressed('special')
          ? 'special'
          : pressed('smash')
            ? 'smash'
            : pressed('attack')
              ? 'attack'
              : null;
      if (type) {
        const x = type === 'smash' ? (input.smashX ?? input.x) : type === 'grab' ? grabX : input.x;
        const y = type === 'smash' ? (input.smashY ?? input.y) : input.y;
        const side = airDirection(x, y, f.face);
        const groundX = type === 'attack' && f.ground >= 0 ? grabX : x;
        f.command = {
          type,
          aim: type === 'smash' ? verticalAim(side) : aimFor(y),
          face: Math.abs(groundX) > 0.2 ? Math.sign(groundX) : 0,
          facing: f.face,
          airSide: side,
          life: inputWindow,
          heldFor: 0,
          released: !input[type],
        };
        if (type === 'attack') f.command.groundDirection = groundDirection(groundX, y);
        if (
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
          } else if (
            coasting &&
            !f.run.turned &&
            steering !== -f.run.face &&
            side !== 'up' &&
            side !== 'down'
          ) {
            f.command.runFace = f.run.face;
          }
        }
      }
      if (f.jumpSquat) bufferSquatInput(f, input);
    }
    floorAhead(f, horizon) {
      if (f.vy < 0) return -1;
      const gravity = 1540 * f.kit.gravity;
      let soonest = horizon + 1e-8,
        result = -1;
      for (const [i, p] of this.terrain.entries()) {
        const height = p.y - f.y;
        if (height < -2 || (p.thin && f.drop > 0)) continue;
        const t = (Math.sqrt(f.vy * f.vy + 2 * gravity * Math.max(0, height)) - f.vy) / gravity;
        if (t >= soonest) continue;
        const x = f.x + f.vx * t;
        const atContact = p.thin && this.stage === 'laundry' ? platforms(this.stage, this.time + t)[i] : p;
        if (x < atContact.x1 - 6 || x > atContact.x2 + 6) continue;
        soonest = t;
        result = i;
      }
      return result;
    }
    wallContact(f, x, y, nextX, nextY) {
      const dx = nextX - x;
      if (Math.abs(dx) < 1e-8) return null;
      const dir = -Math.sign(dx),
        dy = nextY - y,
        chest = y - f.stats.height * 0.52;
      let first = null;
      for (const wall of this.layout?.walls || solidWalls[this.stage]) {
        if ((wall.left ? -1 : 1) !== dir || (x - wall.x) * dir < -1e-8) continue;
        const contactX = wall.x + dir * f.stats.width;
        let enter = Math.max(0, (contactX - x) / dx);
        let leave = Math.min(1, (wall.x - x) / dx);
        if (Math.abs(dy) > 1e-8) {
          const top = (wall.top - chest) / dy,
            bottom = (wall.bottom - chest) / dy;
          enter = Math.max(enter, Math.min(top, bottom));
          leave = Math.min(leave, Math.max(top, bottom));
        } else if (chest < wall.top || chest > wall.bottom) continue;
        if (enter > leave + 1e-8 || (first && enter >= first.t)) continue;
        first = { wall, dir, x: contactX, feet: y + dy * enter, t: enter };
      }
      return first;
    }
    wallAhead(f, horizon) {
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
        const contact = this.wallContact(f, x, y, nextX, nextY);
        if (contact) return contact;
        x = nextX;
        y = nextY;
      }
      return null;
    }
    hitWall(f, contact, jump) {
      const { wall, dir, feet } = contact;
      f.x = contact.x;
      f.y = feet;
      const type = f.techBuffer > 1e-8 ? (jump ? 'wallTechJump' : 'wallTech') : 'wallBounce';
      if (type === 'wallBounce') {
        f.vx = -f.vx * 0.72;
        f.vy *= 0.82;
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
        this.wallPractice.outcome = type;
      }
      this.emit(type, { f, wall, dir, point: { x: wall.x, y: feet - f.stats.height * 0.52 } });
    }
    clearTumble(f, option) {
      if (f.tumble && f.index === 0 && this.launchPractice?.phase === 'flight') {
        this.launchPractice.phase = 'escaped';
        this.emit('tumbleEscape', { f, option });
      }
      f.tumble = null;
      f.wallAction = null;
      f.techBuffer = 0;
    }
    startTumble(f, pending) {
      f.tumble = {
        time: 0,
        pending,
        willTech: this.cpuControlled(f) && this.random() < 0.72,
      };
    }
    beginFloorAction(f, type, dir = 0) {
      const [total, safe] = floorFrames[type];
      f.tumble = f.reaction = f.attack = f.command = f.run = null;
      f.shield = f.cutJump = false;
      f.vx = f.vy = f.stun = f.techBuffer = f.guardBuffer = f.jumpBuffer = f.landingLag = 0;
      f.invuln = safe / 60;
      f.floorAction = { type, time: 0, duration: total / 60, dir };
      if (type === 'floorAttack') beginAttack(f, 'floorAttack', 0, 0, 'getupSweep');
      const event =
        type === 'downed' ? 'knockdown' : type === 'tech' || type === 'techRoll' ? 'tech' : 'getup';
      if (f.index === 0 && this.launchPractice?.phase === 'flight') this.launchPractice.phase = 'landed';
      this.emit(event, { f, type, dir, point: { x: f.x, y: f.y } });
    }
    beginGroundDodge(f, intent) {
      const dir = intent === 'down' ? 0 : intent === 'left' ? -1 : 1;
      const backRoll = !!dir && dir !== f.face;
      const defense = f.kit.defense;
      const [total, firstSafe, lastSafe] = dir ? defense.roll : defense.spot;
      const type = dir ? 'shieldRoll' : 'spotDodge';
      f.floorAction = {
        type,
        dir,
        backRoll,
        time: 0,
        duration: (total + (backRoll ? 2 : 0)) / 60,
        safeFrom: firstSafe / 60,
        safeUntil: (lastSafe + 1) / 60,
        distance: dir ? defense.rollDistance * (backRoll ? 0.9 : 1) : 0,
      };
      f.shield = false;
      f.shieldDrop = f.guardBuffer = f.landTime = f.skidTime = f.chainWindow = f.vx = f.vy = 0;
      f.command = f.run = null;
      f.lastMove = dir ? 'Shield Roll' : 'Spot-dodge';
      this.emit(type, { f, dir, point: { x: f.x, y: f.y } });
    }
    beginLedgeRoll(f) {
      const edge = f.ledge;
      const platform = this.terrain[edge.index];
      const roll = f.kit.ledgeRoll;
      const action = ledgeRollAction(roll, edge, platform.x2 - platform.x1 - 2);
      f.floorAction = action;
      f.ledge = f.guardAim = f.attack = f.command = f.run = null;
      f.shield = false;
      f.guardIntent = '';
      f.invuln = f.shieldDrop = f.guardBuffer = f.jumpBuffer = 0;
      f.landTime = f.skidTime = f.reboundTime = f.chainWindow = 0;
      f.face = action.dir;
      f.ledgeLock = action.duration;
      f.lastMove = roll.label;
      if (f.index === 0 && this.rollPractice?.phase === 'active') this.rollPractice.rolled = true;
      this.emit('ledgeRoll', { f, dir: action.dir, edge, point: { x: edge.x, y: edge.y } });
    }
    beginAirDodge(f) {
      f.fastFall = false;
      const aim = f.guardAim || idleInput;
      const length = Math.hypot(aim.x, aim.y);
      const directed = length >= 0.35;
      const kit = f.kit.airDodge;
      const [duration, first, last, landing] = directed ? kit.directional : kit.neutral;
      const type = directed ? 'directionalAirDodge' : 'neutralAirDodge';
      const x = directed ? aim.x / length : 0;
      const y = directed ? aim.y / length : 0;
      this.clearTumble(f, 'Air dodge');
      f.airDodge = {
        type,
        x,
        y,
        time: 0,
        duration: duration / 60,
        safeFrom: first / 60,
        safeUntil: (last + 1) / 60,
        landingLag: landing / 60,
      };
      f.usedDodge = true;
      f.dodge = f.airDodge.duration;
      f.vx = f.vy = f.coyote = f.guardBuffer = f.jumpBuffer = f.reboundTime = 0;
      f.cutJump = false;
      f.run = f.throwBounce = f.guardAim = f.command = null;
      f.lastMove = directed ? 'Directional air dodge' : 'Neutral air dodge';
      this.emit('dodge', { f, type, dirX: x, dirY: y });
    }
    advanceAirDodge(f, dt) {
      const a = f.airDodge;
      const before = a.time;
      a.time = Math.min(a.duration, before + dt);
      f.dodge = Math.max(0, a.duration - a.time);
      if (a.type === 'neutralAirDodge') return a.time < a.safeUntil - 1e-8;
      const kit = f.kit.airDodge;
      const [first, last] = kit.travel;
      if (a.time > last / 60 + 1e-8) {
        f.vx = 0;
        if (before <= last / 60 + 1e-8) f.vy = 0;
        return false;
      }
      // Integrate one eased path. A diagonal covers the same distance as a cardinal input.
      const travel = (time) => smoothStep((time * 60 - first + 1) / (last - first + 1));
      const speed = ((travel(a.time) - travel(before)) * kit.distance) / dt;
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
        if (a.time + 1e-8 >= 12 / 60 && a.choice) this.beginFloorAction(f, a.choice.type, a.choice.dir);
        else if (a.time + 1e-8 >= a.duration) this.beginFloorAction(f, 'floorRise');
        return;
      }
      if (a.type === 'ledgeRoll') {
        const platform = this.terrain[a.edge.index];
        const local = ledgeRollPosition(a);
        const x = (a.edge.left ? platform.x1 : platform.x2) + a.dir * local.x;
        const y = platform.y + local.y;
        f.vx = (x - f.x) / dt;
        f.vy = (y - f.y) / dt;
        f.x = x;
        f.y = y;
        if (local.planted && f.ground < 0) {
          f.ground = a.edge.index;
          this.emit('ledgeRollPlant', { f, dir: a.dir, edge: a.edge, point: { x, y } });
        }
      } else if (a.dir) {
        const progress = (t) => smoothStep((t - 2 / 60) / (a.duration - 8 / 60));
        const stage = this.terrain[f.ground];
        const distance = a.distance ?? (65 + f.stats.speed * 0.15) * (a.type === 'techRoll' ? 1 : 0.88);
        f.x = clamp(
          f.x + a.dir * distance * (progress(a.time) - progress(before)),
          stage.x1 + 2,
          stage.x2 - 2,
        );
      }
      if (f.attack?.floorAttack) f.attack.time = a.time;
      if (a.time + 1e-8 >= a.duration) {
        if (a.type === 'shieldRoll' || a.type === 'ledgeRoll') f.face = -a.dir;
        f.floorAction = f.attack = null;
        if (a.type === 'ledgeRoll') {
          f.vx = f.vy = 0;
          this.emit('ledgeRollEnd', { f, dir: a.dir, edge: a.edge, point: { x: f.x, y: f.y } });
        }
      }
    }
    advanceJumpSquat(f, input, dt) {
      if (!f.jumpSquat) {
        f.jumpSquat = { time: 0, short: false, aerial: null };
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
      if (squat.aerial) f.command = squat.aerial;
      f.jumpSquat = null;
      return true;
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
        'shieldDrop',
        'parryFlash',
        'chainWindow',
        'landTime',
        'landingLag',
        'skidTime',
        'reboundTime',
        'coyote',
        'respawning',
        'regrabLock',
      ])
        f[key] = Math.max(0, f[key] - dt);
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
      const jumpTap = f.jumpBuffer > 0 || !!f.jumpSquat;
      const jumpingFromLedge = jumpTap && !!f.ledge;
      const attackTap = f.command?.type === 'attack';
      const guardIntent = f.guardIntent;
      f.guardIntent = '';
      if (f.wallAction) {
        const action = f.wallAction;
        action.time += dt;
        if (action.time + 1e-8 >= action.duration) f.wallAction = null;
        else if (action.type === 'wallTech') return;
      }
      if (f.floorAction) return this.advanceFloor(f, dt);
      if (f.tumble) {
        if (f.tumble.pending) this.releaseLaunch(f, input);
        f.tumble.time += dt;
      }
      if (f.ledge) {
        f.ledgeTime += dt;
        const inward = f.ledge.left ? 1 : -1;
        const steerIn = input.x * inward > 0.45;
        if (!steerIn) f.ledge.carriedIn = false;
        if (attackTap) beginLedgeAttack(f);
        else if (!jumpTap && f.guardBuffer > 0) {
          this.beginLedgeRoll(f);
          return this.advanceFloor(f, dt);
        } else if (
          jumpTap ||
          (steerIn && (!f.ledge.carriedIn || f.ledgeTime + 1e-8 >= ledgeDriftGrace)) ||
          f.ledgeTime > 2
        ) {
          f.x = f.ledge.x + inward * 19;
          f.y = f.ledge.y;
          f.ground = f.ledge.index;
          f.ledge = null;
          f.ledgeLock = 0.52;
          f.guardBuffer = 0;
          f.guardAim = null;
          if (!jumpTap) f.jumpBuffer = 0;
        } else if (input.y > 0.5 || input.x * inward < -0.5) {
          f.ledge = null;
          f.ledgeLock = 0.45;
          f.guardBuffer = 0;
          f.guardAim = null;
          f.vy = 65;
          f.jumps = 1;
        } else return;
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
        const chainTap = attackTap && f.command.groundDirection === 'neutral' && f.chainWindow > 0;
        const jumpFollow =
          jumpTap && (current.jumpCancel || (current.hitBeat === 1 && current.second?.jumpCancel));
        const ropeFollow =
          f.command?.type === 'special' && f.command.airSide === 'neutral' && current.specialCancel;
        const throwFollow = f.command?.type === 'grab' && current.grabCancel;
        if (chainTap || jumpFollow || ropeFollow || throwFollow) f.attack = null;
      }
      const ready =
        !f.attack &&
        !f.airDodge &&
        !f.ledgeTrump &&
        f.wallAction?.type !== 'wallTechJump' &&
        f.stun <= 0 &&
        f.dodge <= 0 &&
        f.landingLag <= 1e-8;
      const shieldExit = jumpTap || f.command?.type === 'grab';
      if (shieldExit || f.shieldDrop < 1e-8) f.shieldDrop = 0;
      if (guardIntent && ready && grounded && !shieldExit && !f.shieldDrop && f.charge < 0) {
        if (guardIntent === 'release') {
          if (f.shield) {
            f.shieldDrop = shieldDropTime;
            f.vx = 0;
          }
        } else {
          this.beginGroundDodge(f, guardIntent);
          return this.advanceFloor(f, dt);
        }
      }
      const free = ready && !f.shieldDrop;
      const direction = aimFor(input.y);
      f.shield = free && grounded && input.shield && f.charge < 0 && f.command?.type !== 'grab' && !jumpTap;
      if (grounded && input.shield && !f.jumpSquat) f.guardBuffer = 0;
      f.shieldHP = clamp(f.shieldHP + (f.shield ? -0.13 : 0.24) * dt, 0, 1);
      if (f.shield && f.shieldHP <= 0) this.breakShield(f);
      if (free && !grounded && f.guardBuffer > 0 && !f.usedDodge) {
        this.beginAirDodge(f);
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
        if (
          !f.smashCharge &&
          jumpTap &&
          (f.jumps > 0 || f.coyote > 0) &&
          !(f.tumble && f.techBuffer > 1e-8 && this.wallAhead(f, f.techBuffer))
        ) {
          this.clearTumble(f, 'Jump');
          f.throwBounce = null;
          if (grounded && !f.jumpSquat && !attackTap && !jumpingFromLedge && direction === 1 && this.terrain[f.ground].thin) {
            f.drop = 0.24;
            f.y += 9;
            f.vy = 110;
            f.jumps = 1;
          } else {
            const groundJump = grounded && !jumpingFromLedge;
            if (groundJump) {
              if (!this.advanceJumpSquat(f, input, dt)) return;
            } else {
              if (f.coyote > 0) f.jumps = 2;
              f.vy = -f.stats.jump * (f.jumps === 2 ? 1 : 0.91);
              if (this.cpuControlled(f)) this.bot.jumpHold = this.bot.hop && f.kind !== 'brisket' ? 0.07 : 0.34;
            }
            f.jumps--;
            f.cutJump = !groundJump;
            f.fastFall = false;
            this.emit('jump', { f });
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
        const command = f.command;
        if (f.charge >= 0 && (f.smashCharge || !command || command.type === 'attack')) {
          const before = f.charge;
          if (!f.chargeReleased) f.charge += dt;
          if (!f.smashCharge && !f.chargeReleased) {
            const x = input.grabX ?? input.x;
            const side = groundDirection(x, input.y);
            if (Math.abs(x) > 0.28) f.face = Math.sign(x);
            if (side !== 'neutral') f.chargeDirection = side;
            if (f.charge >= attackHold) {
              lockSmash(f, 'attack', verticalAim(f.chargeDirection), f.face);
              this.emit('smashCharge', { f });
            }
          }
          if (f.smashCharge && before < smashChargeTime && f.charge >= smashChargeTime)
            this.emit('smashReady', { f });
          if (f.chargeReleased || f.charge + 1e-8 >= smashHoldLimit || (!f.smashCharge && command)) {
            if (f.smashCharge) {
              releaseSmash(f);
              this.emit('smashRelease', { f });
            } else groundStrike(f, f.chargeDirection, f.charge);
          }
        } else if (command && (command.type !== 'smash' || f.ground >= 0)) {
          f.throwBounce = null;
          f.command = null;
          if (command.face && (f.ground >= 0 || command.type !== 'attack')) f.face = command.face;
          if (command.type === 'grab') {
            const style = f.ground >= 0 && command.grabStyle ? command.grabStyle : 'standing';
            beginGrab(f, style, style === 'standing' ? 0 : command.runFace, command.aim);
          } else if (command.type === 'special') this.special(f, command);
          else if (command.type === 'smash') {
            f.charge = 0;
            f.chargeReleased = false;
            lockSmash(f, 'smash', command.aim, command.face || command.facing);
            if (command.released) {
              releaseSmash(f);
              this.emit('smashRelease', { f });
            } else this.emit('smashCharge', { f });
          } else if (f.ground < 0) aerialStrike(f, command);
          else if (command.runFace) {
            f.face = command.runFace;
            beginAttack(f, 'dash', 0, 0, f.kit.dashAttack);
            f.vx = f.face * Math.max(0, f.vx * f.face) * f.attack.carry;
          } else if (command.released) groundStrike(f, command.groundDirection, command.heldFor);
          else {
            f.charge = command.heldFor;
            f.chargeDirection = command.groundDirection;
            f.chargeReleased = false;
          }
        }
      }
      if (f.cutJump && (!input.jump || f.vy >= 0)) {
        if (!input.jump && f.vy < -265) f.vy *= 0.55;
        f.cutJump = false;
      }
      if (f.attack) {
        if (f.tumble) this.clearTumble(f, 'Aerial action');
        const a = f.attack;
        a.time += dt;
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
        if (a.time >= a.end) f.attack = null;
      }
      const sliding = f.attack?.motionLocked;
      if (f.tumble) {
        f.vx *= Math.pow(0.68, dt);
        if (!f.stun) f.vx += input.x * 175 * dt;
      } else if (f.stun > 0 || f.ledgeTrump || f.wallAction?.type === 'wallTechJump') {
        f.vx *= Math.pow(0.68, dt);
        f.vx += input.x * 100 * dt;
      } else if (f.ground >= 0 && f.attack?.brake) {
        f.vx = toward(f.vx, 0, f.attack.brake * dt);
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
      if (grounded && f.ground >= 0 && free && !f.attack && !f.shield && f.charge < 0 && !f.dodge)
        trackGroundRun(f, input.grabX ?? input.x, dt);
      else f.run = null;
      const dodgeGlide = f.airDodge && this.advanceAirDodge(f, dt);
      const oldX = f.x,
        oldY = f.y;
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
        if (f.charge >= 0) cancelCharge(f);
        if (!dodgeGlide) {
          const controlled = controlsFall(f);
          if (!controlled || f.vy < 0) f.fastFall = false;
          const terminal = controlled ? Math.max(f.vy, f.kit.fallSpeed) : 970;
          f.vy = f.fastFall ? Math.max(f.vy, f.kit.fastFallSpeed) : Math.min(f.vy + 1540 * f.kit.gravity * dt, terminal);
        }
        f.y += f.vy * dt;
        const contact = this.wallContact(f, oldX, oldY, f.x, f.y);
        if (contact) {
          if (f.tumble) {
            this.hitWall(f, contact, input.jump);
            return;
          }
          f.x = contact.x;
          f.vx = 0;
        }
        if (f.vy >= 0) {
          const landing = this.landingSurface(f, oldY);
          if (landing >= 0) {
            const landingSpeed = f.vy;
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
            f.y = this.terrain[landing].y;
            f.vy = 0;
            if (f.airDodge) {
              f.landingLag = f.airDodge.landingLag;
              f.vx = clamp(f.vx * 0.24, -f.stats.speed * 0.75, f.stats.speed * 0.75);
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
              const frame = a.time * 60 + 1e-6;
              const committed = frame >= a.landingWindow[0] && frame < a.landingWindow[1];
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
            if (f.attack?.airSide || landingSpeed > 225) {
              f.landDuration = Math.max(0.12, f.landingLag);
              f.landTime = f.landDuration;
            }
            if (landingSpeed > 225) this.emit('land', { f, speed: landingSpeed });
            if (f.stun > 0) f.stun *= 0.62;
          }
        }
        if (f.ground < 0 && !f.ledgeLock && !f.stun && input.y < 0.55) {
          const a = f.airDodge;
          if (a && a.y < 0.5 && a.time + 1e-8 >= f.kit.airDodge.ledgeFrame / 60) {
            const edge = this.nearestLedge(f, 31, -16, 78);
            if (edge && a.x * (edge.left ? 1 : -1) >= 0) this.ledgeClaims.push({ f, edge });
          } else if (!a && !f.dodge && f.vy > -125) this.tryLedge(f, 33, 80);
        }
        const a = f.airDodge;
        if (a && a.time + 1e-8 >= a.safeFrom && a.time < a.safeUntil - 1e-8)
          f.invuln = Math.max(f.invuln, dt - 1e-8);
      }
    }
    landingSurface(f, oldY) {
      let landing = -1;
      for (const [i, p] of this.terrain.entries()) {
        if (p.thin && f.drop > 0) continue;
        if (
          f.x >= p.x1 - 5 &&
          f.x <= p.x2 + 5 &&
          oldY <= p.y + 2 &&
          f.y >= p.y &&
          (landing < 0 || p.y < this.terrain[landing].y)
        )
          landing = i;
      }
      return landing;
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
    resolveLedgeClaims() {
      // Both dogs get to act before a catch takes the lip. Break a same-tick tie with the match RNG.
      const [a, b] = this.ledgeClaims;
      if (b && sameLedge(a.edge, b.edge) && this.random() < 0.5) this.ledgeClaims.reverse();
      for (const { f, edge } of this.ledgeClaims) this.hangLedge(f, edge);
      this.ledgeClaims.length = 0;
    }
    hangLedge(f, edge) {
      if (sameLedge(f.ledge, edge)) return;
      const rival = this.dogs.find((other) => other !== f && sameLedge(other.ledge, edge));
      const trump = !!rival;
      const protectedCatch = f.ledgeProtectionReady;
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
      f.shieldDrop = f.parryFlash = 0;
      f.guardIntent = '';
      f.run = null;
      f.throwBounce = null;
      f.face = inward;
      // Give a player drifting toward the stage a moment to choose a get-up attack.
      f.ledge = { ...edge, carriedIn: f.prev.x * inward > 0.45, protectedCatch };
      f.ledgeTrump = null;
      f.ledgeProtectionReady = false;
      f.ledgeTime = 0;
      f.x = edge.x + f.face * hangingFeet[1];
      f.y = edge.y + hangingFeet[2];
      f.vx = f.vy = 0;
      f.ground = -1;
      f.attack = f.command = null;
      cancelCharge(f);
      f.invuln = protectedCatch ? 15 / 60 - 1e-8 : 0;
      f.jumpBuffer = f.guardBuffer = f.chainWindow = 0;
      restoreAir(f);
      const drill = this.trumpPractice;
      if (
        drill?.phase === 'approach' &&
        sameLedge(edge, drill.edge) &&
        f.index === (drill.role === 'take' ? 0 : 1)
      )
        drill.phase = 'caught';
      this.emit('ledge', { f, protectedCatch, trump });
      if (trump)
        this.emit('ledgeTrump', { f, target: rival, edge, dir: inward, point: { x: edge.x, y: edge.y } });
    }
    tryLedge(f, horizontal, below) {
      const edge = this.nearestLedge(f, horizontal, 5, below);
      if (edge) this.ledgeClaims.push({ f, edge });
      return !!edge;
    }
    catchRival(owner, target, attack) {
      const spec = grabs[attack.moveId];
      const face = owner.face;
      const chest = target.y - target.stats.height * 0.52;
      const from = [(target.x - owner.x) * face, chest - owner.y];
      const extra = spec.reelSpeed ? Math.abs(from[0] - spec.grip[0]) / spec.reelSpeed : 0;
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
        remaining: spec.hold + Math.min(0.75, target.damage * 0.005),
        pending: attack.queuedThrow || null,
        pummelCount: 0,
        direction: null,
        throwId: null,
        comboLink: target.stun > 0,
      };
      this.grapple = owner.grip = target.grip = grip;
      for (const f of [owner, target]) {
        cancelCharge(f);
        f.wallAction = null;
        f.ledgeTrump = null;
        f.tumble = f.floorAction = null;
        f.airDodge = f.guardAim = null;
        f.dodge = 0;
        f.techBuffer = 0;
        f.guardIntent = '';
        f.shieldDrop = f.parryFlash = 0;
        f.run = null;
        f.attack = f.command = f.reaction = f.throwBounce = null;
        f.jumpSquat = null;
        f.fastFall = false;
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
      this.emit('grabCatch', {
        f: owner,
        target,
        face,
        point: { ...grip.anchor },
        moveId: grip.grabId,
        grabStyle: attack.grabStyle,
      });
      this.finishShieldPractice(target.index === 0 ? 'grabbed' : 'interrupted');
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
        const damage = this.dealDamage(target, attack.dmg, grip.comboLink);
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
        });
      }
      // A throw can take over after contact. Start its windup from the captive's actual position.
      if (grip.pending && grip.pending !== 'pummel' && attack.time + 1e-8 >= activeEnd)
        grip.throwFrom = [(grip.anchor.x - owner.x) * grip.face, grip.anchor.y - owner.y];
      else if (attack.time + 1e-8 < attack.end) return;
      owner.attack = null;
      grip.phase = 'hold';
      grip.time = 0;
    }
    advanceGrapple(dt) {
      const grip = this.grapple;
      const owner = this.dogs[grip.owner],
        target = this.dogs[grip.target];
      const grab = grabs[grip.grabId];
      grip.time += dt;
      owner.invuln = Math.max(0, owner.invuln - dt);
      owner.drop = Math.max(0, owner.drop - dt);
      // An airborne catch still falls, with both dogs riding the same platform on landing.
      if (owner.ground < 0) {
        const oldY = owner.y;
        owner.vy = Math.min(970, owner.vy + 1540 * owner.kit.gravity * dt);
        owner.y += owner.vy * dt;
        const landing = owner.vy >= 0 ? this.landingSurface(owner, oldY) : -1;
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
      if (grip.phase === 'pummel') {
        this.advancePummel(grip, owner, target, grab.grip);
        if (grip.phase === 'pummel') return;
      }
      if (grip.phase === 'hold') {
        if (!grip.throwFrom) this.positionCaptive(grip, grab.grip, grab.grip, 1);
        if (!grip.pending) return;
        if (grip.pending === 'pummel') {
          grip.phase = 'pummel';
          grip.time = 0;
          grip.pending = null;
          beginAttack(owner, 'pummel', 0, 0, owner.kit.pummel);
          const attack = owner.attack;
          attack.pummel = true;
          attack.contact = [grab.grip[0] + attack.recoil[0], grab.grip[1] + attack.recoil[1]];
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
      if (t < 0.5) this.positionCaptive(grip, grip.throwFrom || grab.grip, attack.via, t * 2);
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
      );
      if (attack.connected && attack.bounce)
        target.throwBounce = { ...attack.bounce, owner: owner.index, moveId: grip.throwId };
      target.regrabLock = 0.35;
      this.emit('throwRelease', {
        f: owner,
        target,
        face,
        direction: grip.direction,
        moveId: grip.throwId,
        point,
      });
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
      if (type === 'drive') {
        d.x = f.x + f.face * 37;
        d.y = f.y - 39;
        d.vx = f.face * (560 + 260 * a.power);
        d.vy = 0;
        d.power = a.power;
        d.rangeLeft = 215 + 150 * a.power;
      }
      this.projectiles.push(d);
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
      return this.mode === 'solo' && f.index === 1;
    }
    opponents(f) {
      return [this.dogs[1 - f.index]];
    }
    resolveMelee() {
      // Collect both active hitboxes before either hit can interrupt the other fighter.
      const hits = [],
        catches = [],
        swats = [];
      for (const f of this.dogs) {
        const attack = f.attack;
        if (
          !attack ||
          attack.pummel ||
          attack.throwSide ||
          attack.projectile ||
          attack.anchor ||
          attack.charging ||
          attack.diving ||
          (attack.moveId === 'brisketBrace' && !attack.riposte)
        )
          continue;
        const beat = attackWindow(attack);
        if (attack.time + 1e-8 < beat.start || attack.time >= beat.start + beat.active - 1e-8) continue;
        // A late hit changes the strength of one swing. Only a second strike can hit twice.
        const beatIndex = beat === attack.second ? 1 : 0;
        const area = this.attackArea(f);
        for (const rival of this.opponents(f)) {
          const height = bodyHeight(rival);
          const overlaps =
            Math.abs(rival.x - area.x) <= area.rx + rival.stats.width &&
            Math.abs(rival.y - height * 0.52 - area.y) <= area.ry + height * 0.4;
          if (this.shieldPractice) this.recordPracticeDodge(rival, overlaps);
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
            if (
              !this.grapple &&
              !rival.invuln &&
              !rival.respawning &&
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
          if (attack.hitTargets?.get(rival) === beatIndex || rival.invuln > 0 || rival.respawning > 0) continue;
          if (attack.dashAttack && (rival.x - f.x) * f.face < 0) continue;
          if (attack.edge && (rival.x - attack.edge.x) * f.face < 0) continue;
          if (!overlaps) continue;
          (attack.hitTargets ??= new Map()).set(rival, beatIndex);
          attack.hitBeat = beatIndex;
          let sweet = null;
          if (beat.sweetSpot) {
            const [sx, sy, rx, ry] = beat.sweetSpot.box;
            if (
              Math.abs((rival.x - f.x) * f.face - sx) <= rx &&
              Math.abs(rival.y - height * 0.52 - f.y - sy) <= ry
            )
              sweet = beat.sweetSpot;
          }
          hits.push({
            f,
            rival,
            attack,
            beat,
            sweet,
            face: hitFacing(rival.x),
            point: {
              x: clamp(area.x, rival.x - rival.stats.width, rival.x + rival.stats.width),
              y: clamp(area.y, rival.y - height, rival.y - 4),
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
      for (const { f, rival, attack, beat, face, point, sweet } of hits) {
        const strength = attack.smashSide
          ? smashStrength(attack.power)
          : attack.moveId === 'brisketCannon'
            ? 1 + attack.power * 0.35
            : 1;
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
        );
        if (sweet && attack.connected) this.emit('sweetSpot', { f, point, face, moveId: attack.moveId });
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
      f.shieldDrop = f.parryFlash = 0;
      f.guardIntent = '';
      f.reaction = null;
      f.shieldHP = 0.24;
      f.stun = 0.85;
      cancelCharge(f);
      this.emit('break', { f });
    }
    dealDamage(target, damage, preserveCombo) {
      if (damage > 0) target.ledgeProtectionReady = true;
      const applied = Math.min(damage, 999 - target.damage);
      if (this.mode === 'training' && target.index === 1) {
        if (target.stun <= 0 && !preserveCombo) this.lastCombo = { hits: 0, damage: 0 };
        this.lastCombo.hits++;
        this.lastCombo.damage += applied;
      }
      target.damage += applied;
      return applied;
    }
    parry(target, owner, face, point, projectile) {
      const brace = projectile ? -face : Math.sign(owner.x - target.x) || -face;
      target.shieldDrop = 0;
      target.parryFlash = 12 / 60;
      target.parryFace = brace || target.face;
      target.lastMove = 'Parry';
      if (!projectile) {
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
    }
    hit(target, owner, damage, base, growth, aim, name, face, point, move, moveId) {
      if (target.invuln > 0 || target.respawning > 0) return false;
      if (target.grip?.target === target.index) return false;
      const grab = name === 'throw' || move?.commandGrab;
      if (!grab && target.ground >= 0 && target.shieldDrop > shieldDropTime - parryWindow + 1e-8) {
        this.parry(
          target,
          owner,
          face,
          point,
          !!move?.projectile || name === 'ball' || name === 'disc' || name === 'snare',
        );
        return false;
      }
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
        if (target.index === 0) this.finishShieldPractice('block');
        return false;
      }
      if (target.grip) this.breakGrapple(false);
      target.ledgeTrump = null;
      target.wallAction = null;
      target.throwBounce = null;
      target.floorAction = target.tumble = null;
      target.airDodge = target.guardAim = null;
      target.guardIntent = '';
      target.shieldDrop = target.parryFlash = 0;
      target.techBuffer = target.dodge = 0;
      this.dealDamage(target, damage, move?.preserveCombo);
      const speed = (base + target.damage * growth) / target.stats.weight;
      if (move) {
        const angle = ((move.angle < 0 && target.ground >= 0 ? 46 : move.angle) * Math.PI) / 180;
        target.vx = face * speed * Math.cos(angle);
        target.vy = -speed * Math.sin(angle) - (angle >= 0 ? 40 : 0);
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
      if (target.ground >= 0) target.jumps = 1;
      target.y -= 1;
      target.ground = -1;
      target.coyote = 0;
      target.jumpSquat = null;
      target.fastFall = false;
      target.cutJump = false;
      target.chainWindow = 0;
      target.hopWindow = target.followPounce = 0;
      target.command = null;
      target.jumpBuffer = 0;
      target.guardBuffer = 0;
      target.landTime = 0;
      target.landingLag = 0;
      target.skidTime = 0;
      target.run = null;
      target.reboundTime = 0;
      target.ledge = null;
      target.ledgeLock = 0.28;
      target.attack = null;
      cancelCharge(target);
      target.shield = false;
      target.stun = clamp(0.115 + speed * 0.00036, 0.14, 0.58);
      if (move?.stun) target.stun = Math.max(target.stun, move.stun);
      const emphatic =
        !!move?.hard || (name === 'heavy' && !move?.setupHit) || name === 'shoulder' || speed > 630;
      target.reaction = { duration: target.stun, face: -face, hard: emphatic || speed > 460 };
      const launchSpeed = Math.hypot(target.vx, target.vy);
      const finish = !move?.setupHit && !move?.second && !move?.pull && !move?.bounce && name !== 'snare';
      if (finish && launchSpeed >= tumbleSpeed) this.startTumble(target, true);
      if (this.wallPractice?.phase === 'swing' && target.index === 0 && moveId === 'pipBackKick')
        this.wallPractice.phase = 'flight';
      if (target.index === 0 && this.launchPractice?.phase === 'ready' && name === 'throw') {
        this.launchPractice.phase = 'flight';
      }
      const hitFrames = target.tumble ? clamp(4 + Math.floor(launchSpeed / 180), 6, 9) : emphatic ? 4 : 2;
      this.hitStop = Math.max(this.hitStop, hitFrames / 60);
      if (
        this.trumpPractice?.role === 'defend' &&
        this.trumpPractice.phase === 'approach' &&
        target.index === 1
      )
        this.trumpPractice.phase = 'intercepted';
      this.emit('hit', { f: target, owner, speed, name, moveId, face, point, emphatic });
      this.finishShieldPractice(target.index === 0 ? 'hit' : 'interrupted');
      this.finishAirPractice(target.index === 0 ? 'hit' : 'interrupted');
      this.finishRollPractice(target.index === 0 ? 'hit' : 'counter');
      return true;
    }
    updateDiscs(dt) {
      this.projectiles = this.projectiles.filter((d) => {
        const owner = this.dogs[d.owner];
        if (d.caught) return false;
        const rivals = this.opponents(owner);
        d.age += dt;
        const impact = (target, direction) => {
          const spec = smashes[d.moveId] || specials[d.moveId] || specials.cloverRound;
          const strength = d.type === 'drive' ? smashStrength(d.power) : 1;
          this.hit(
            target,
            owner,
            spec.dmg * strength,
            spec.base * strength,
            spec.growth * strength,
            0,
            d.type === 'drive' ? 'heavy' : d.type === 'snare' ? 'snare' : 'disc',
            direction || owner.face,
            { x: d.x, y: d.y },
            spec,
            d.moveId,
          );
        };
        if (d.type === 'drive') {
          const step = Math.min(d.rangeLeft, Math.abs(d.vx) * dt);
          const face = Math.sign(d.vx);
          d.x += face * step;
          d.rangeLeft -= step;
          for (const target of rivals) {
            if (Math.abs(target.x - d.x) > target.stats.width + 15 ||
                d.y < target.y - bodyHeight(target) - 5 || d.y > target.y + 5) continue;
            if (this.shieldPractice) this.recordPracticeDodge(target, true);
            if (!target.invuln && !target.respawning) {
              impact(target, face);
              return false;
            }
          }
          if (this.ball && Math.abs(d.x - this.ball.x) < 29 && Math.abs(d.y - this.ball.y) < 19) {
            this.swat(owner, 0, face);
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
            const target = d.armedIn <= 0 && rivals.find((f) =>
              f.ground === d.platform && !f.invuln && Math.abs(f.x - d.x) < f.stats.width + 22);
            if (target) {
              impact(target, Math.sign(target.x - owner.x));
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
            const target = d.type === 'skip' && rivals.find((f) =>
              !f.invuln && !f.respawning && Math.abs(f.x - d.x) < f.stats.width + 13 &&
              d.y >= f.y - bodyHeight(f) - 7 && d.y <= f.y + 5);
            if (target) {
              impact(target, Math.sign(d.vx));
              return false;
            }
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
        const pass = d.back ? 1 : 0;
        for (const target of rivals) {
          const height = bodyHeight(target), slot = pass + 2 * target.index;
          if (!d.hit[slot] && Math.abs(target.x - d.x) < target.stats.width + 16 &&
              Math.abs(target.y - (target.floorAction ? height * 0.52 : 39) - d.y) <
                (target.floorAction ? height * 0.5 + 8 : 42) && target.invuln <= 0) {
            impact(target, Math.sign(d.vx));
            d.hit[slot] = true;
          }
        }
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
        const height = bodyHeight(target);
        if (
          target.invuln <= 0 &&
          Math.abs(b.x - target.x) < target.stats.width + 11 &&
          Math.abs(b.y - target.y + (target.floorAction ? height * 0.52 : 37)) <
            (target.floorAction ? height * 0.5 + 10 : 43)
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
    loseStock(f) {
      if (f.grip) this.breakGrapple(false);
      if (this.mode !== 'training') f.stocks--;
      this.projectiles = this.projectiles.filter((d) => d.owner !== f.index);
      this.emit('ko', { f, x: f.x, y: f.y, stageWidth: this.stageWidth, remaining: f.stocks });
    }
    knockouts(out) {
      for (const f of out) {
        if (f.index === 0 && this.launchPractice) this.launchPractice.phase = 'out';
        this.loseStock(f);
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
        const choice = chance < 0.3 ? (grab ? 'spot' : 'parry') : chance < 0.47 ? 'roll' : null;
        brain.guardRead = { attack: a, choice, used: false };
      }
      const read = brain.guardRead;
      if (read.used || !read.choice) return null;
      brain.hold = brain.guard = 0;
      const dodge = read.choice === 'spot' ? f.kit.defense.spot : f.kit.defense.roll;
      if (
        wait > (read.choice === 'parry' ? 3 / 60 : (dodge[1] + 2) / 60) ||
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
      if (wait < -1e-8 || wait > (kit.directional[1] + 3) / 60) return null;
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
    cpu(dt) {
      const f = this.dogs[1],
        foe = this.dogs[0],
        brain = this.bot;
      brain.jumpHold = Math.max(0, brain.jumpHold - dt);
      const result = { ...idleInput, jump: brain.jumpHold > 0 };
      if (this.grapple) {
        const grip = this.grapple;
        result.jump = false;
        if (grip.phase === 'throw') return result;
        if (grip.target === f.index) {
          result.attack = Math.floor(this.time * 6) % 2 === 0;
        } else if (
          grip.phase === 'hold' &&
          !grip.pending &&
          (grip.time >= 0.13 || grip.pummelCount || grip.remaining < 0.4)
        ) {
          const floor = this.terrain[f.ground];
          const edge = floor && Math.min(f.x - floor.x1, floor.x2 - f.x) < 145;
          if (edge && foe.damage >= 40) result.x = f.x - floor.x1 < floor.x2 - f.x ? -1 : 1;
          else if (
            grip.pummelCount < (foe.damage >= 35 ? 2 : 1) &&
            grip.remaining > pummels[f.kit.pummel].end + 0.32
          )
            result.attack = true;
          else if (foe.damage < 65 && (f.kind === 'clover' || f.kind === 'pip')) result.y = -1;
          else if (foe.damage < 55) result.y = 1;
          else result.x = grip.face;
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
      if (f.floorAction) {
        result.x = 0;
        result.jump = false;
        if (f.floorAction.type === 'downed' && f.floorAction.time >= 15 / 60) {
          if (far < 70 && !foe.shield) {
            result.attack = true;
            result.tapped = { attack: true };
          } else if (far < 140) {
            const away = -Math.sign(dx);
            result.x = f.x + 90 * away > closest.x1 && f.x + 90 * away < closest.x2 ? away : -away;
          } else result.jump = true;
        }
        return result;
      }
      const wall = f.tumble && this.wallAhead(f, 7 / 60);
      if (wall) {
        result.x = 0;
        result.jump = f.tumble.willTech && f.y > wall.wall.top + f.stats.height;
        if (f.tumble.willTech && f.techLock <= 1e-8) {
          result.shield = true;
          result.tapped = { shield: true };
        }
        return result;
      }
      if (f.tumble && !unsafe) {
        result.jump = false;
        result.x = 0;
        const landing = this.floorAhead(f, 7 / 60);
        if (landing >= 0 && f.tumble.willTech && f.techLock <= 1e-8) {
          const p = this.terrain[landing];
          const away = -Math.sign(dx);
          result.x = far < 140 && f.x + 95 * away > p.x1 && f.x + 95 * away < p.x2 ? away : 0;
          result.shield = true;
          result.tapped = { shield: true };
          f.tumble.rollDir = result.x;
        } else if (f.techBuffer > 0) result.x = f.tumble.rollDir || 0;
        return result;
      }
      if (foe.floorAction?.type === 'downed' && f.ground >= 0 && far < f.stats.reach + 15 && !f.attack) {
        result.x = Math.sign(dx);
        result.y = 1;
        result.attack = true;
        result.tapped = { attack: true };
        return result;
      }
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
        if (
          foe.ground === edge.index &&
          foe.face === -face &&
          threat?.box &&
          !threat.projectile &&
          threat.time < threat.start + threat.active &&
          guardDistance >= 0 &&
          guardDistance + foe.stats.width + f.stats.width <= f.kit.ledgeRoll.distance
        ) {
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
          !foe.invuln &&
          !foe.respawning &&
          gap >= 0 &&
          Math.abs(gap - contact.x - x) <= rx + foe.stats.width &&
          Math.abs(height - contact.y - y) <= ry + foe.stats.height * 0.4
        ) {
          result.attack = true;
          result.tapped = { attack: true };
        }
        return result;
      }
      const inside = clamp(f.x, closest.x1 + 52, closest.x2 - 52);
      const airDefense = this.cpuAirEvade(f, foe, closest, unsafe);
      if (airDefense) return airDefense;
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
      if (f.smashCharge?.button === 'smash') {
        result.x = result.y = 0;
        result.jump = false;
        result.smash = f.charge < brain.smashHold;
        return result;
      }
      const defense = this.cpuGuard(f, foe);
      if (defense) return defense;
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
      if (f.run && f.ground >= 0 && !result.jump && !foe.invuln) {
        const face = Math.sign(dx);
        const pivot = face === -f.run.face;
        const grab = grabs[pivot ? f.kit.pivotGrab : f.kit.dashGrab];
        const wantsGrab = pivot || foe.shield || foe.landingLag > grab.start;
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
        if (canStrike && !result.jump && !foe.invuln && far < 155) {
          const face = Math.sign(dx) || f.face;
          const closing = foe.vx * face < -40;
          const aimLow = above < -6 || (far < 75 && (closing || foe.attack));
          const side = above > 24 ? 'up' : aimLow ? 'down' : 'forward';
          const tilt = moves[f.kit.tilts[side]];
          const [x, y, rx, ry] = tilt.box;
          const height = foe.y + foe.vy * tilt.start - foe.stats.height * 0.52 - f.y;
          if (
            (side !== 'forward' || !f.run) &&
            Math.abs(far + foe.vx * face * tilt.start - x) <= rx + foe.stats.width &&
            Math.abs(height - y) <= ry + foe.stats.height * 0.4 &&
            this.random() < 0.36
          ) {
            brain.hold = brain.guard = 0;
            brain.hop = null;
            result.x = face;
            result.y = verticalAim(side);
            result.attack = true;
            result.tapped = { attack: true };
            return result;
          }
        }
        if (foe.y < f.y - 52 && far < 240 && f.jumps > 0) brain.pulse.jump = true;
        if (f.ground >= 0 && this.terrain[f.ground].thin && foe.y > f.y + 70 && far < 240) {
          brain.pulse.jump = true;
          brain.pulse.down = true;
        }
        if (Math.abs(foe.y - f.y) < 105 && !f.attack && !f.stun) {
          const clearRun = dx >= 0 ? closest.x2 - f.x : f.x - closest.x1;
          const safeSpecial = clearRun > (f.kind === 'brisket' ? 295 : f.kind === 'pip' ? 185 : -1);
          if (far < (f.kind === 'noodle' ? 150 : 91)) {
            if (
              f.ground >= 0 &&
              Math.abs(foe.y - f.y) < 48 &&
              ((foe.shield && this.random() < 0.8) || this.random() < (f.kind === 'noodle' ? 0.2 : 0.13))
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
        if (brain.pulse.down) result.y = 1;
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
    smashes,
    grabs,
    pummels,
    throws,
    smashChargeTime,
    smashPower,
    arenas,
    platforms,
    Battle,
    idleInput,
    clamp,
    attackWindow,
    ledgePosition,
    ledgeRollAction,
    ledgeRollPosition,
  };
})();
