(() => {
  'use strict';
  const {
    fighters,
    kits,
    moves,
    specials,
    smashes,
    grabs,
    pummels,
    throws,
    smashPower,
    moveFreshness,
    arenas,
    Battle,
    StockSet,
    idleInput,
    applyFlickJump,
    rageScale,
    isReversalPractice,
    isFootstoolPractice,
    isSweetPractice,
    cpuLevels,
    stockMinutes,
    seededRandom,
    clamp,
  } = window.DogFight;
  const { FightView, drawPreview, drawMoveThumbnail } = window.DogFightView;
  const $ = (id) => document.getElementById(id);
  const footworkPatterns = ['bait','match','power','armor','armorGrab','disc','reflect','returnFire','crawl',
    'brake','dashShield','pivot','antiAir','angleHigh','angleLow','cancelDash','cancelTurn','boostGrab','boostPivot'];
  const glyphs = {
    paw: [
      '...##.##....',
      '...##.##....',
      '##.##.##.##.',
      '##.......##.',
      '.##.###..##.',
      '...#####....',
      '..#######...',
      '.#########..',
      '.###...###..',
    ],
    sound: [
      '......#..#..',
      '.....##...#.',
      '..####....#.',
      '..####.##..#',
      '..####..#..#',
      '..####.##..#',
      '.....##...#.',
      '......#..#..',
    ],
    muted: [
      '......#.....',
      '.....##.....',
      '..####..#..#',
      '..####...##.',
      '..####...##.',
      '..####..#..#',
      '.....##.....',
      '......#.....',
    ],
    keyboard: [
      '.##########.',
      '##........##',
      '##.#.#.#..##',
      '##........##',
      '##..#.#.#.##',
      '##........##',
      '##..####..##',
      '.##########.',
    ],
    expand: [
      '.####..####.',
      '.#........#.',
      '.#........#.',
      '.#........#.',
      '............',
      '............',
      '.#........#.',
      '.#........#.',
      '.#........#.',
      '.####..####.',
    ],
    collapse: [
      '...#....#...', '...#....#...', '...#....#...', '####....####',
      '............', '............', '####....####', '...#....#...', '...#....#...', '...#....#...',
    ],
    ball: [
      '....####....',
      '..##...###..',
      '.#..#....##.',
      '.#...#....#.',
      '#....##....#',
      '#.....##...#',
      '#......##..#',
      '.##.....#.#.',
      '..###...##..',
      '....####....',
    ],
    info: [
      '...######...',
      '..#......#..',
      '.#...##...#.',
      '.#........#.',
      '.#...##...#.',
      '.#...##...#.',
      '.#...##...#.',
      '..#......#..',
      '...######...',
    ],
    play: [
      '..##........',
      '..####......',
      '..######....',
      '..########..',
      '..########..',
      '..######....',
      '..####......',
      '..##........',
    ],
    pause: [
      '..###..###..',
      '..###..###..',
      '..###..###..',
      '..###..###..',
      '..###..###..',
      '..###..###..',
      '..###..###..',
      '..###..###..',
    ],
    reset: [
      '....#####...',
      '..##.....#..',
      '.#........#.',
      '##........#.',
      '####......#.',
      '###.......#.',
      '.........##.',
      '..#.....##..',
      '...#####....',
    ],
    ledge: [
      '########....',
      '......##....',
      '......##....',
      '......######',
      '............',
      '..#.........',
      '.###........',
      '##.##.......',
      '..#.........',
      '..#.........',
    ],
    close: [
      '.##......##.',
      '..##....##..',
      '...##..##...',
      '....####....',
      '....####....',
      '...##..##...',
      '..##....##..',
      '.##......##.',
    ],
    edit: [
      '........##..',
      '.......####.',
      '......###.#.',
      '.....###.#..',
      '....###.#...',
      '...###.#....',
      '..###.#.....',
      '..####......',
      '..##........',
    ],
    versus: [
      '##........##',
      '###......###',
      '.###....###.',
      '..###..###..',
      '...######...',
      '....####....',
      '...######...',
      '..##.##.##..',
      '.##......##.',
      '##........##',
    ],
    chevron: ['............', '.##......##.', '..##....##..', '...##..##...', '....####....', '.....##.....'],
    signal: [
      '...######...',
      '.##......##.',
      '##..####..##',
      '...##..##...',
      '..##....##..',
      '.....##.....',
      '.....##.....',
    ],
    spark: [
      '......##....',
      '.....###....',
      '....###.....',
      '...###......',
      '..#######...',
      '.....###....',
      '....###.....',
      '...##.......',
    ],
  };
  const icons = Object.fromEntries(
    Object.entries(glyphs).map(([name, rows]) => {
      const top = Math.floor((12 - rows.length) / 2);
      const blocks = [];
      rows.forEach((row, y) => {
        for (const match of row.matchAll(/#+/g)) {
          const width = match[0].length;
          blocks.push('M' + match.index + ' ' + (top + y) + 'h' + width + 'v1h-' + width + 'z');
        }
      });
      return [
        name,
        '<svg viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="' +
          blocks.join('') +
          '"/></svg>',
      ];
    }),
  );
  function svg(name) {
    return icons[name];
  }
  function icon(name) {
    return '<i data-icon="' + name + '">' + svg(name) + '</i>';
  }
  document.querySelectorAll('i[data-icon]').forEach((el) => (el.innerHTML = svg(el.dataset.icon)));
  const portrait = (kind) => window.DogArt.portrait(kind);
  const modes = { solo: 'Solo', local: 'Local versus', training: 'Training' };
  const settings = {
    stage: 'picnic',
    mode: 'solo',
    cpuLevel: 'arcade',
    minutes: 7,
    bestOfThree: false,
    p1: 'pip',
    p2: 'brisket',
    fetch: true,
    sound: true,
    volume: 75,
    musicVolume: 55,
    shake: true,
    tiltStick: false,
    quickAttack1: true,
    quickAttack2: true,
    flickJump1: false,
    flickJump2: false,
  };
  try {
    const s = JSON.parse(localStorage.getItem('dog-fight-3.config') || '{}');
    if (Object.hasOwn(arenas, s.stage)) settings.stage = s.stage;
    if (Object.hasOwn(modes, s.mode)) settings.mode = s.mode;
    if (Object.hasOwn(cpuLevels, s.cpuLevel)) settings.cpuLevel = s.cpuLevel;
    if (stockMinutes.includes(s.minutes)) settings.minutes = s.minutes;
    for (const slot of ['p1', 'p2']) if (Object.hasOwn(fighters, s[slot])) settings[slot] = s[slot];
    for (const key of ['fetch', 'sound', 'shake', 'tiltStick','flickJump1','flickJump2','quickAttack1','quickAttack2','bestOfThree']) if (typeof s[key] === 'boolean') settings[key] = s[key];
    if (Number.isFinite(s.volume)) settings.volume = Math.max(0, Math.min(100, s.volume));
    if (Number.isFinite(s.musicVolume)) settings.musicVolume = Math.max(0, Math.min(100, s.musicVolume));
  } catch {
    /* Settings are optional in private browsing. */
  }
  function save() {
    try {
      localStorage.setItem('dog-fight-3.config', JSON.stringify(settings));
    } catch {}
  }
  function announce(message) {
    $('announce').textContent = message;
  }
  const held = new Set(),
    taps = new Set(),
    touches = new Set(),
    touchTaps = new Set(),
    touchPointers = new Map();
  let walkPointer = null;
  let touchFlick = null, flickAim = null;
  const rightStickHeld = [false, false];
  const shieldTiltLocked = [false, false];
  const flickJumpStates = [{},{}];
  function clearInput() {
    held.clear();
    taps.clear();
    touches.clear();
    touchPointers.clear();
    touchTaps.clear();
    walkPointer = null;
    touchFlick = flickAim = null;
    rightStickHeld.fill(false);
    shieldTiltLocked.fill(false);
    flickJumpStates[0] = {};
    flickJumpStates[1] = {};
    document.querySelectorAll('.touch-pad .held').forEach((el) => el.classList.remove('held'));
  }
  let audioContext;
  let music=null, musicUnlocked=false, musicFocused=true;
  let auditionTrack='picnic', auditionPlaying=false, auditionUrgent=false;
  const missionMusic=['picnic','bandstand','nightmail','canal','nightmail'];
  function unlockMusic() {
    musicUnlocked=true;
    if (audioContext?.state!=='running') audioReady();
  }
  window.addEventListener('pointerdown',unlockMusic,{capture:true,passive:true});
  window.addEventListener('keydown',unlockMusic,{capture:true});
  function updateMusic() {
    if(!musicUnlocked || !audioContext) return;
    const level=settings.sound ? settings.musicVolume/100*settings.volume/100 : 0;
    if(!music && (!level || audioContext.state!=='running')) return;
    music ||= new window.YardScore.Player(audioContext);
    let id='menu', urgent=false, playing=musicFocused && !document.hidden, gain=level;
    if(dialogType==='sound-test'){
      id=auditionTrack;playing=playing && auditionPlaying;urgent=auditionUrgent;
    } else if(page==='dispatch-story') id=null;
    else if(page==='match' && world){
      const fight=online.match?.confirmedWorld || world;
      if(world.mode==='adventure'){
        id=missionMusic[world.roomIndex];
        if(world.finished==='exit')id='win-'+world.dogs[0].kind;
        else if(world.finished==='fallen')id=null;
        else playing=playing && !paused;
      } else if(fight.end!==null){
        id=dialogType && fight.dogs[fight.end] ? 'win-'+fight.dogs[fight.end].kind : null;
      } else {
        id=fight.stage;playing=playing && !paused && countdown<=0;
        urgent=!world.lesson && fight.mode!=='training' && (fight.suddenDeath ||
          (fight.dogs[0].stocks===1 && fight.dogs[1].stocks===1));
        if(world.lesson || fight.mode==='training') gain*=.55;
      }
    }
    music.update(id,urgent,gain,playing);
    if(dialogType==='sound-test') refreshAudition();
  }
  function audioReady() {
    if (!settings.sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audioContext ||= new Audio();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch {}
  }
  function tone(start, end, length, delay = 0, type = 'triangle', volume = 0.085) {
    if (!settings.sound || !settings.volume || !audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime + delay,
      oscillator = audioContext.createOscillator(),
      gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(22, end), now + length);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, (volume * settings.volume) / 75), now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + length + 0.014);
  }
  function sound(name, detail = {}) {
    if(name==='ko' || name==='break') music?.duck(.33);
    else if(name==='parry' || name==='hit' && detail.emphatic) music?.duck(.16);
    if (name === 'hit') {
      if (detail.armored) {
        tone(155, 92, .055, 0, 'triangle', .12);
        tone(750, 460, .04, .008, 'square', .033);
      } else if (detail.lock) {
        const note = detail.lock === 2 ? 285 : 206;
        tone(note, 78, 0.061, 0, 'triangle', 0.09);
        tone(note * 2, note, 0.032, 0.018, 'square', 0.031);
      } else if (detail.timing === 'late' && !detail.emphatic) {
        const pitch = { pip: 410, brisket: 155, noodle: 325, clover: 510 }[detail.owner.kind];
        tone(pitch, pitch * 0.63, 0.045, 0, 'triangle', 0.09);
      } else if (detail.moveId === 'pipSpeedBag') {
        const pitch = detail.owner.attack?.flurryBeat % 2 ? 215 : 270;
        tone(pitch, 70, .044, 0, 'triangle', .09);
        tone(pitch * 2, pitch, .022, .003, 'square', .025);
      } else if (detail.moveId === 'pipBellKick') {
        tone(205, 56, .10, 0, 'triangle', .15);
        tone(880, 640, .09, .008, 'sine', .055);
      } else if (detail.emphatic) {
        tone(218, 56, 0.09, 0, 'sawtooth', 0.059);
        tone(105, 32, 0.19, 0.006, 'triangle', 0.17);
        tone(63, 32, 0.07, 0.05, 'sine', 0.09);
      } else if (detail.moveId && detail.owner.kind === 'noodle') {
        tone(330, 168, 0.06, 0, 'triangle', 0.09);
        tone(525, 335, 0.048, 0.019, 'square', 0.023);
      } else if (detail.moveId && detail.owner.kind === 'clover') {
        tone(590, 805, 0.045, 0, 'triangle', 0.09);
        tone(350, 260, 0.075, 0.012, 'sine', 0.08);
      } else if (detail.moveId && detail.owner.kind === 'brisket') {
        tone(145, 54, 0.095, 0, 'triangle', 0.15);
        tone(255, 95, 0.04, 0, 'square', 0.027);
      } else {
        tone(detail.name === 'jab2' ? 620 : 425, 175, 0.034, 0, 'square', 0.036);
        tone(detail.name === 'jab2' ? 155 : 122, 54, 0.069, 0, 'triangle', 0.095);
      }
    } else if (name === 'parry') {
      tone(1280, 1640, 0.055, 0, 'square', 0.053);
      tone(760, 1260, 0.14, 0.035, 'triangle', 0.085);
    } else if (name === 'platformDrop' && detail.fromShield) {
      tone(690, 250, 0.065, 0, 'triangle', 0.05);
    } else if (name === 'ledgeTrump') {
      tone(490, 245, 0.075, 0, 'triangle', 0.06);
    } else if (name === 'ledgeRoll') {
      tone(215, 86, 0.085, 0, 'triangle', 0.045);
    } else if (name === 'ledgeStrain' || name === 'ledgeSlip') {
      const pitch = name === 'ledgeStrain' ? 440 : 210;
      tone(pitch, pitch / 2, .10, 0, 'triangle', .06);
    } else if (name === 'ledgeClimbPlant') {
      tone(142, 71, 0.046, 0, 'triangle', 0.035);
    } else if (name === 'shieldRoll' || name === 'spotDodge') {
      tone(name === 'shieldRoll' ? 195 : 315, 76, name === 'shieldRoll' ? 0.1 : 0.055, 0, 'triangle', 0.05);
    } else if (name === 'dodge') {
      if (detail.type === 'directionalAirDodge')
        tone(470, 155 - detail.dirY * 55, 0.12, 0, 'triangle', 0.065);
      else tone(260, 370, 0.07, 0, 'sine', 0.07);
    } else if (name === 'waveland') {
      tone(175, 64, 0.095, 0, 'triangle', 0.055);
    } else if (name === 'fastFall') {
      tone(610, 220, .055, 0, 'triangle', .045);
    } else if (name === 'landingCancel') {
      tone(540, 760, 0.055, 0, 'triangle', 0.055);
    } else if (name === 'wallKick') {
      tone(135, 64, .05, 0, 'triangle', .05);
      tone(detail.f.kind === 'pip' ? 590 : 405, 790, .075, .029, 'square', .023);
    } else if (name === 'wallTech' || name === 'wallTechJump' || name === 'ceilingTech') {
      tone(630, 920, 0.052, 0, 'triangle', 0.075);
      if (name === 'wallTechJump') tone(870, 1440, 0.082, 0.04, 'square', 0.024);
    } else if (detail.hard && (name === 'wallBounce' || name === 'meteorBounce' || name === 'floorBounce' || name === 'ceilingBounce')) {
      tone(224, 48, 0.065, 0, 'square', 0.045);
      tone(107, 37, 0.14, 0.025, 'triangle', 0.12);
    } else if (name === 'wallBounce' || name === 'ceilingBounce' || name === 'ceilingBump') {
      tone(165, 56, 0.075, 0, 'triangle', 0.09);
    } else if (name === 'tech') {
      tone(560, 890, 0.055, 0, 'triangle', 0.075);
      tone(910, 1250, 0.07, 0.043, 'square', 0.026);
    } else if (name === 'knockdown') {
      tone(125, 41, 0.1, 0, 'triangle', 0.095);
      tone(110, 50, 0.045, 0.082, 'square', 0.025);
    } else if (name === 'grabCatch') {
      const pitch = { pip: 470, brisket: 130, noodle: 315, clover: 635 }[detail.f.kind];
      tone(pitch * 1.25, pitch, 0.052, 0, 'square', 0.035);
      tone(pitch, pitch * 0.8, 0.065, 0.01, 'triangle', 0.06);
      if (detail.grabStyle === 'dash') tone(pitch * 0.72, pitch, 0.043, 0.027, 'triangle', 0.045);
      if (detail.grabStyle === 'pivot') tone(pitch * 1.42, pitch * 0.9, 0.055, 0.033, 'triangle', 0.05);
    } else if (name === 'pummelHit') {
      const [start, end, wave] = {
        pip: [410, 230, 'square'],
        brisket: [145, 62, 'triangle'],
        noodle: [320, 540, 'triangle'],
        clover: [885, 610, 'sine'],
      }[detail.f.kind];
      tone(start, end, 0.053, 0, wave, wave === 'square' ? 0.033 : 0.085);
      tone(end * 0.7, end * 0.45, 0.055, 0.009, 'triangle', 0.068);
    } else if (name === 'blastThreat') {
      if (detail.finalHit) {
        tone(106, 44, .18, 0, 'triangle', .14);
        tone(58, 36, .13, .13, 'triangle', .09);
      }
      tone(180, 290, 0.075, 0, 'triangle', 0.11);
      tone(310, 160, 0.1, 0.065, 'square', 0.035);
    } else if (name === 'stockReady') {
      tone(360, 445, 0.07, 0, 'triangle', 0.07);
      tone(560, 660, 0.08, 0.06, 'triangle', 0.07);
    } else if (name === 'stockLeave') {
      tone(310, 160, 0.09, 0, 'triangle', 0.055);
    } else if (name === 'stockOpen') {
      tone(720, 430, 0.08, 0, 'sine', 0.07);
    } else if (name === 'specialTurn') {
      const turned = detail.turn === 'turnaround';
      tone(turned ? 300 : 460, turned ? 390 : 235, 0.06, 0, 'triangle', 0.065);
    } else if (name === 'meteorBounce') {
      tone(143, 43, 0.12, 0, 'triangle', 0.15);
      tone(296, 130, 0.055, 0.012, 'square', 0.035);
    } else if (name === 'footstool') {
      tone(165, 95, .06, 0, 'triangle', .08);
      tone(310, 620, .09, .025, 'triangle', .06);
    } else if (name === 'tumbleWiggle') {
      tone(460, 740, 0.065, 0, 'triangle', 0.045);
    } else if (name === 'meteorCancel') {
      tone(360, 680, 0.07, 0, 'triangle', 0.09);
      tone(690, 920, 0.045, 0.034, 'sine', 0.07);
    } else if (name === 'throwBounce') {
      const heavy = detail.moveId === 'brisketSitSlam';
      tone(heavy ? 109 : 430, heavy ? 45 : 650, 0.1, 0, 'triangle', heavy ? 0.14 : 0.065);
    } else if (name === 'discReflect') {
      tone(330, 650, .055, 0, 'triangle', .085);
      tone(640, 1150, .09, .04, 'sine', .09);
    } else if (name === 'attackClash') {
      const pitch = detail.projectile ? 1130 : 880;
      tone(pitch, pitch * 0.72, 0.055, 0, 'square', 0.035);
      tone(pitch * 1.51, pitch * 1.42, 0.09, 0.009, 'sine', 0.085);
      if (detail.winner !== null) tone(270, 105, 0.075, 0.025, 'triangle', 0.105);
    } else if (name === 'edgeCancel') {
      tone(620, 950, 0.055, 0, 'triangle', 0.055);
    } else if (name === 'footworkCue' && detail.beat) {
      const pitch = detail.beat === 3 ? 890 : 490;
      tone(pitch, pitch * 0.96, 0.047, 0, 'triangle', 0.085);
    } else if (name === 'grabEscape' || name === 'grabClash') {
      tone(475, 795, 0.055, 0, 'triangle', 0.065);
    } else if (name === 'smashReady') {
      tone(590, 740, 0.065, 0, 'triangle', 0.08);
      tone(880, 1100, 0.105, 0.048, 'triangle', 0.062);
    } else if (name === 'smashRelease') {
      const pitch = { pip: 400, brisket: 135, noodle: 325, clover: 540 }[detail.f.kind];
      tone(pitch, pitch * 0.52, 0.075, 0, 'triangle', 0.05 + detail.f.attack.power * 0.04);
    } else if (name === 'shieldPoke') {
      tone(1060, 580, 0.055, 0.018, 'triangle', 0.11);
    } else if (name === 'crouchCancel' && detail.planted) {
      tone(155, 83, 0.055, 0.012, 'triangle', 0.075);
    } else if (name === 'sweetSpot') {
      tone(1090, 1420, 0.065, 0, 'triangle', 0.065);
    } else if (name === 'recover' && detail.moveId === 'brisketCannon') {
      tone(95, 46, 0.12, 0, 'sawtooth', 0.048);
      tone(145, 410, 0.15, 0.018, 'triangle', 0.085);
    } else if (name === 'recover' && detail.moveId === 'noodleLasso') {
      tone(500, 175, 0.08, 0, 'triangle', 0.07);
      tone(185, 620, 0.09, 0.075, 'triangle', 0.043);
    } else if (name === 'recover' && detail.moveId === 'cloverSail') {
      tone(330, 545, 0.15, 0, 'sine', 0.09);
      tone(465, 695, 0.18, 0.035, 'triangle', 0.04);
    } else if (name === 'special' && detail.moveId === 'pipBark') {
      tone(375, 170, 0.055, 0.035, 'square', 0.03);
      tone(430, 145, 0.07, 0.17, 'square', 0.04);
    } else if (name === 'counter' || name === 'catch' || name === 'skip') {
      tone(name === 'counter' ? 830 : 560, name === 'counter' ? 350 : 875, 0.07, 0, 'triangle', 0.065);
    } else if (name === 'jump' || name === 'recover')
      tone(name === 'jump' ? 260 : 330, name === 'jump' ? 430 : 720, 0.1, 0, 'triangle', 0.043);
    else if (name === 'ko') {
      tone(690, 71, 0.38, 0, 'sawtooth', 0.056);
      tone(150, 39, 0.47, 0.02, 'sine', 0.13);
    } else if (name === 'block') {
      const weight = (detail.impactFrames || 2) - 2;
      tone(880 - weight * 76, 510 - weight * 62, 0.04 + weight * 0.008, 0, 'square', 0.025);
      tone(520 - weight * 65, 350 - weight * 48, 0.075 + weight * 0.012, 0.012, 'triangle', 0.06);
    } else if (name === 'break') {
      tone(910, 525, 0.044, 0, 'square', 0.025);
      tone(385, 85, 0.08, 0.022, 'triangle', 0.055);
    } else if (name === 'dizzyLand') {
      tone(110, 54, .07, 0, 'triangle', .05);
      tone(700, 615, .11, .035, 'sine', .035);
    } else if (name === 'swat') tone(580, 210, 0.12, 0, 'square', 0.034);
    else if (name === 'land' && detail.speed > 420) tone(90, 45, 0.063, 0, 'triangle', 0.037);
    else if (name === 'tick') tone(390, 420, 0.11);
    else if (name === 'go') {
      tone(390, 720, 0.2);
      tone(650, 900, 0.18, 0.11);
    } else if (name === 'win')
      [392, 494, 587, 784].forEach((v, i) => tone(v, v * 1.02, 0.25, i * 0.11, 'triangle', 0.1));
    else if (name === 'menu') tone(420, 560, 0.065, 0, 'triangle', 0.055);
    else if (name === 'disc' || name === 'special') tone(260, 145, 0.095, 0, 'triangle', 0.037);
  }
  function updateAudio() {
    const label = settings.sound ? 'Mute sound' : 'Enable sound';
    $('sound').innerHTML = icon(settings.sound ? 'sound' : 'muted');
    $('sound').setAttribute('aria-label', label);
    $('sound').title = label;
  }
  let editing = 0,
    page = 'home',
    world = null,
    view = null,
    countdown = 0,
    lastCount = 0,
    resultDelay = 0,
    dialogType = '',
    backToPause = false,
    paused = false;
  let before = performance.now() / 1000,
    accumulator = 0,
    lastPreview = -1,
    hudKey = '';
  const labelFor = (i) => {
    if (world?.lesson) return i ? 'COACH' : 'P1';
    if (online.match) return 'P' + (i + 1) + (i === online.side ? ' · YOU' : '');
    if (page === 'match' && world?.comboPractice?.defending) return i === 0 ? 'REPLAY' : 'YOU';
    if (page === 'match' && world?.hasSecondPlayer && world.mode === 'training') {
      if (i === 1) return 'P2';
      return world.comboPractice && world.comboPractice.source !== 'record' ? 'REPLAY' : 'P1';
    }
    const mode = page === 'match' && world ? world.mode : settings.mode;
    return i === 0 ? 'P1' : mode === 'local' ? 'P2' : mode === 'training' ? 'DUMMY' : 'CPU';
  };
  const slotLabel = (i) =>
    i === 0
      ? 'Player 1'
      : settings.mode === 'local'
        ? 'Player 2'
        : settings.mode === 'training'
          ? 'Training dummy'
          : 'Computer';
  function tip(kind) {
    const f = fighters[kind];
    $('signature').innerHTML = '<strong>' + f.style + '</strong> · ' + kits[kind].style;
  }
  function syncFetch() {
    const toggle = $('fetch-switch');
    toggle.setAttribute('aria-checked', String(settings.fetch));
    toggle.querySelector('.toggle-value').textContent = settings.fetch ? 'On' : 'Off';
  }
  function drawStageTile(canvas, stage) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(canvas.width / 1200, canvas.height / 675);
    window.ArenaArt.draw(ctx, stage, 1.4);
    ctx.restore();
  }
  function syncLobby() {
    $('cpu-level').hidden = settings.mode !== 'solo';
    $('cpu-level').textContent = 'CPU · ' + cpuLevels[settings.cpuLevel].name;
    document
      .querySelectorAll('[data-mode]')
      .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.mode === settings.mode)));
    $('stage-title').textContent = arenas[settings.stage].name;
    const training = settings.mode === 'training';
    $('rules-label').disabled = training;
    $('rules-label').innerHTML = icon('paw') + (training ? 'Unlimited' :
      (settings.bestOfThree ? 'Best of three' : 'Rules') + ' · 3 stocks · ' + (settings.minutes ? settings.minutes + ' min' : 'No clock') + ' ▾');
    $('start').innerHTML =
      icon('play') + '<span>' + (training ? 'Start training' : settings.bestOfThree ? 'Start set' : 'Start fight') + '</span>';
    syncFetch();
    $('picking').innerHTML =
      'Choose for <b class="' + (editing ? 'two' : '') + '">' + labelFor(editing) + '</b>';
    $('slots').innerHTML = [settings.p1, settings.p2]
      .map((kind, i) => {
        const name = fighters[kind].name;
        return `<button class="slot" type="button" data-index="${i}" aria-pressed="${i === editing}" aria-label="Choose ${slotLabel(i)} fighter, currently ${name}">
        <span class="small-tag">${labelFor(i)}</span><span class="slot-name">${name}</span>${icon('edit')}
      </button>`;
      })
      .join('');
    $('roster').innerHTML = Object.entries(fighters)
      .map(([kind, f]) => {
        const badges =
          (kind === settings.p1 ? '<span class="badge">P1</span>' : '') +
          (kind === settings.p2 ? '<span class="badge two">' + labelFor(1) + '</span>' : '');
        return `<button type="button" data-kind="${kind}" class="roster-card ${editing ? 'picking-two' : ''}" aria-pressed="${kind === settings[editing ? 'p2' : 'p1']}" aria-label="Choose ${f.name}, ${f.breed}, ${f.style}">
        <span class="mug"><img src="${portrait(kind)}" alt=""></span>
        <span class="card-copy"><strong>${f.name}</strong><small>${f.breed}</small></span>
        <span class="card-badges">${badges}</span>
      </button>`;
      })
      .join('');
    const thumbnail = $('stage-mini');
    drawStageTile(thumbnail, settings.stage);
    tip(settings[editing ? 'p2' : 'p1']);
    $('preview').setAttribute(
      'aria-label',
      'Preview of ' +
        fighters[settings.p1].name +
        ' and ' +
        fighters[settings.p2].name +
        ' on ' +
        arenas[settings.stage].name,
    );
    lastPreview = -1;
    drawPreview($('preview'), settings, performance.now() / 1000);
  }
  document.querySelector('.mode-tabs').addEventListener('click', (e) => {
    const el = e.target.closest('[data-mode]');
    if (!el) return;
    settings.mode = el.dataset.mode;
    save();
    syncLobby();
    audioReady();
    sound('menu');
  });
  $('slots').addEventListener('click', (e) => {
    const el = e.target.closest('.slot');
    if (!el) return;
    editing = Number(el.dataset.index);
    syncLobby();
    document.querySelector('.slot[data-index="' + editing + '"]').focus({ preventScroll: true });
    sound('menu');
    announce('Choose a fighter for ' + slotLabel(editing));
  });
  $('roster').addEventListener('click', (e) => {
    const el = e.target.closest('[data-kind]');
    if (!el) return;
    const kind = el.dataset.kind;
    settings[editing ? 'p2' : 'p1'] = kind;
    save();
    syncLobby();
    $('roster')
      .querySelector('[data-kind="' + kind + '"]')
      .focus({ preventScroll: true });
    audioReady();
    sound('menu');
    announce(fighters[kind].name + ' selected for ' + slotLabel(editing));
  });
  for (const event of ['pointerover', 'focusin'])
    $('roster').addEventListener(event, (e) => {
      const el = e.target.closest('[data-kind]');
      if (el) tip(el.dataset.kind);
    });
  $('roster').addEventListener('pointerleave', () => tip(settings[editing ? 'p2' : 'p1']));
  $('fetch-switch').onclick = () => {
    settings.fetch = !settings.fetch;
    save();
    syncFetch();
    sound('menu');
  };
  $('sound').onclick = () => {
    settings.sound = !settings.sound;
    save();
    audioReady();
    updateAudio();
    film?.score.mix();
    sound('menu');
  };
  function showDialog(kind, title, html, close = true) {
    if (page === 'dispatch-story' && film) setFilmPaused(true);
    dialogType = kind;
    $('dialog').dataset.view = kind;
    $('dialog-title').textContent = title;
    $('dialog-body').innerHTML = html;
    $('dialog-close').hidden = !close;
    if (!$('dialog').open) $('dialog').showModal();
    if (page === 'match') {
      paused = !online.match;
      clearInput();
    }
  }
  function dismiss() {
    if ($('dialog').open) $('dialog').close();
    dialogType = '';
    backToPause = false;
    paused = false;
    clearInput();
    accumulator = 0;
    before = performance.now() / 1000;
    if (page === 'match') $('game').focus({ preventScroll: true });
  }
  function exitDialog() {
    if (dialogType==='bindings') return leaveLayouts();
    if (dialogType === 'set-pick') return showResult();
    if (dialogType === 'result' || dialogType === 'dispatch-fall' || dialogType === 'online-result') return;
    if (['controls','moves','cpu-level','practice'].includes(dialogType) && backToPause) {
      backToPause = false;
      showPause();
      return;
    }
    dismiss();
  }
  $('dialog-close').onclick = exitDialog;
  $('dialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    exitDialog();
  });
  $('dialog').addEventListener('click', (e) => {
    if (e.target === $('dialog')) exitDialog();
  });
  $('ball-info').onclick = () =>
    showDialog(
      'ball',
      'Fetch Ball',
      '<p>Bat the tennis ball with an attack. Each of the first two swats lights a paw above it. The third swat fires a golden shot that can send a high-damage rival flying.</p><div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>',
    );
  function chooseArena(picking = false) {
    const current = picking ? world.stage : settings.stage;
    const rows = Object.entries(arenas).map(
      ([id, a]) =>
        '<button class="stage-option" type="button" data-stage="' +
        id +
        '" aria-pressed="' +
        (id === current) +
        '"><canvas width="300" height="169" aria-hidden="true"></canvas><span><strong>' +
        a.name +
        '</strong><small>' +
        a.description +
        '</small></span></button>',
    );
    showDialog(picking ? 'set-pick' : 'arenas', picking ? 'Pick the next arena' : 'Choose arena',
      '<div class="stage-options">' + rows.join('') + '</div>');
    document.querySelectorAll('.stage-option').forEach((el) => {
      drawStageTile(el.querySelector('canvas'), el.dataset.stage);
    });
    document.querySelector('[data-stage="' + current + '"]').focus({preventScroll:true});
  }
  $('choose-stage').onclick = () => chooseArena();
  function showControls() {
    backToPause = page === 'match';
    const networkGame = !!online.match || page === 'online-lobby';
    const keyboard=(i,action)=>keyFor(i,action);
    const row=(title,key,pad)=>{
      const label=i=>typeof pad==='function'?pad(i):pad;
      const p=label(0), q=label(1);
      return [title,key(0),key(1),networkGame || p===q?p:'P1 '+p+' · P2 '+q];
    };
    const simple=(title,action)=>row(title,i=>keyboard(i,action),i=>padFor(i,action));
    const rows = [
      row('Move / aim',i=>['up','left','down','right'].map(a=>keyboard(i,a)).join(' '),'Stick / D-pad'),
      row('Walk',i=>keyboard(i,'walk')+' + '+keyboard(i,'left')+' / '+keyboard(i,'right'),'Tilt left stick gently'),
      row('Jump',i=>keyboard(i,'jump')+(settings['flickJump'+(i+1)]?' / '+keyboard(i,'up'):''),i=>padFor(i,'jump')+' / flick Up if enabled'),
      simple('Short hop','hop'),simple('Attack','attack'),row('Aim strike ← / → / ↑ / ↓',strikeKeys,'Right stick'),
      row('Smash / charge',i=>keyboard(i,'smash'),i=>padFor(i,'smash')+(settings.tiltStick?'':' / right stick')),
      simple('Special','special'),row('Shield / air dodge / tech',i=>keyboard(i,'shield'),i=>padFor(i,'shield')+' / '+padFor(i,'shieldAlt')),
      row('Tilt shield',i=>keyboard(i,'shield')+' + '+keyboard(i,'walk')+' + direction',i=>'Gentle stick / '+padFor(i,'shield')+' + '+padFor(i,'shieldAlt')+' + stick'),
      simple('Grab / throw','grab'),[networkGame ? 'Match menu' : 'Pause','Esc','Esc','Start'],
    ];
    if (nativeScreen) rows.push(['Fullscreen', 'F', 'F', '—']);
    const table =
      '<table class="control-table"><thead><tr><th>Action</th>' +
      (networkGame ? '<th>Keyboard</th>' : '<th>P1</th><th>P2</th>') + '<th>Gamepad</th></tr></thead><tbody>' +
      rows.map((r) => '<tr>' + (networkGame ? [r[0], r[1], r[3]] : r).map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
    showDialog(
      'controls',
      'Controls',
      '<div class="dialog-actions"><button class="primary" data-do="bindings">Customize controls</button></div>' + table +
        '<p>Flick a side to dash. Reverse in the first few steps to dash-dance. After a full run your dog plants its paws to turn. On touch, slide from the center dot onto a side arrow to walk, or tap a side arrow to dash.</p>' +
        '<p>In a running jump, tap the opposite direction with Jump to turn your dog while carrying your speed. Steer back toward the rival and hit them with your back air. In the air you can aim a strike independently with the right stick, the aim keys, or a swipe out from Smash on touch.</p>' +
        '<p>On a raised platform, flick Down to drop through with an air jump in reserve. Tap Attack as you fall to swing. Press Down and Attack together for a grounded down tilt. In the air, hold Down as you fall to pass through a perch. Release Down to land on the next one, or swing once your paws clear it. Try Pick your landing in Platform practice. For a low crouch, ease the stick down, hold Walk + Down on a keyboard, or slide from the center dot onto Down on touch.</p>' +
        '<p>Hold Down before a hit to crouch cancel. You take the damage with less knockback. A light, low hit can leave your paws planted. Tap Attack at the spark to answer with a down tilt. Try a stronger launcher or a grab against a crouching rival.</p>' +
        '<p>On the ground, hold Shield and tap Left or Right to roll, or tap Down to spot-dodge in place. Release a raised Shield just before a strike or projectile lands to parry. A melee parry gives you time for a counterattack. Grabs beat a shield release. Try these in Training → Shield practice.</p>' +
        '<p>Holding Shield or blocking a hit shrinks the bubble. An attack can clip an exposed paw or ear. To cover it, ease the stick toward the hit, or hold both Shield buttons and aim freely. On keyboard, hold Walk while aiming with Shield. On touch, hold Shield and drag from the center dot toward the hit.</p>' +
        '<p>While holding Shield, press Jump, Grab, Up + Smash, or Up + Special. On a raised platform, flick a lower diagonal to fall through your shield. Tap Attack with the diagonal for a down air, or aim a different aerial as you fall. Try Shield drop in Platform practice.</p>' +
        '<p>Tap during a blocked hit to start your response as soon as shieldstun ends. An immediate shield grab takes four extra frames to reach. A heavier blow pushes you farther away.</p>' +
        '<p>During the three-frame jump crouch, Up + Smash starts a grounded up smash and Up + Special starts your recovery move. A running up smash carries your speed. On touch, hold Up and slide your other thumb from Jump onto Smash or Special. Try Footwork practice → Catch the landing.</p>' +
        '<p>During the first two frames of a jab opener, tilt, or dash attack, press Jump or Hop and aim to turn the windup into a short-hop aerial. Start a tilt facing away, then aim toward the rival as you jump for a rising back air. Try Footwork practice → Turn into back air.</p>' +
        '<p>In midair, tap Shield with the stick centered to dodge in place. Aim up and toward the stage to slip past an edgeguard and catch the lip. You get one air dodge until you land or grab a ledge. Aim diagonally down and tap Shield to slide onto a platform. Do this just after jumping to wavedash. Try Training → Air-dodge practice or Training → Wavedash.</p>' +
        '<p>Flick a direction during the hit spark to shift your dog. You can slide sideways on the ground or in eight directions in the air. Try escaping the second swing in Training → Combo escape.</p>' +
        '<p>When a strong hit freezes the action, hold a direction across the launch to bend its path. As you tumble toward a platform, tap Shield just before contact to tech. Hold left or right as you land for a tech roll. Try both in Training → Launch practice.</p>' +
        '<p>Your dog crouches for three frames. Hold Short hop for a low jump, or tap Jump and release during the crouch. Hold Jump through the crouch for a full jump. Jump + Attack during the crouch gives a short-hop aerial. Flick Down in the last three rising frames or during descent to fast-fall. Release Down to aim freely. Jump again in midair. Press Jump just above a rival’s head for a footstool, even with your air jump spent. A rival stepped on in the air can tech the fall with Shield. Down + Jump drops through a raised platform.</p><p>Tap Attack alone for your dog’s jab combo. On the ground, aim left, right, up, or down and tap Attack for a tilt. Press left or right and Attack together for a forward tilt. Press Attack once your dog is running for a dash attack. In the air, press Attack alone or aim forward, back, up, or down. Forward follows the way your dog faces.</p><p>For a grounded smash, aim sideways, up, or down. Tap Smash to swing immediately, or hold it and release for more power. Ground Attack starts on the press by default. Each player can choose Hold to smash in Options to charge with Attack from a standstill. With the default Smash stick, hold the right stick in a direction and release to swing. Choose Tilt under Options for instant grounded tilts with the aim stick, aim keys, or a swipe from Smash.</p><p>Press Special alone for Neutral Special, or aim as you press it. Up + Special helps you get back to the stage. While hanging from an edge, tap Attack to climb in and strike. The Move list shows every fighter’s inputs.</p><p>Grabs beat shields. Run and press Grab to reach ahead. Press the opposite direction and Grab together as you turn to catch a pursuer. Once you catch a rival, tap Attack to pummel. Tap it again for another hit, or tap a direction to throw. The escape timer keeps running during pummels. Forward follows your facing at the catch. Press Grab again for forward, or tap action buttons to escape when caught.</p><p>Higher damage sends a dog farther. Three knockouts win a match. In local versus, one controller plays P2. Two controllers play one dog each.</p><div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>',
    );
  }
  $('controls').onclick = showControls;
  const tiltInputs = {
    forward: 'Forward tilt · Side + Attack',
    up: 'Up tilt · Up + Attack',
    down: 'Down tilt · Down + Attack',
  };
  const airInputs = {
    neutral: 'Attack alone',
    forward: 'Forward + Attack',
    back: 'Back + Attack',
    up: 'Up + Attack',
    down: 'Down + Attack',
  };
  const specialInputs = {
    neutral: 'Special alone',
    side: 'Side + Special',
    up: 'Up + Special',
    down: 'Down + Special',
  };
  const smashInputs = { side: 'Side + Smash', up: 'Up + Smash', down: 'Down + Smash' };
  const throwInputs = {
    grab: 'Press Grab',
    dashGrab: 'Dash grab · Run + Grab',
    pivotGrab: 'Pivot grab · Reverse + Grab',
    pummel: 'Pummel · Tap Attack',
    forward: 'After catch · Forward',
    back: 'After catch · Back',
    up: 'After catch · Up',
    down: 'After catch · Down',
  };
  const defenseGuide = {
    tumble: {
      label: 'Directional influence',
      input: 'Aim during the hit freeze',
      hint: 'Hold across the launch path to bend it during the freeze. Once hitstun ends, flick a fresh side to right your dog and regain air drift. You keep your jump and air dodge.',
    },
    techRoll: {
      label: 'Tech landing',
      input: 'Tap Shield just before landing',
      hint: 'Leave movement neutral to land in place, or hold left or right to roll through. The roll covers more ground and takes longer to finish.',
    },
    floorAttack: {
      input: 'After a knockdown · tap Attack',
    },
  };
  function guideMoveRow(move, input, direction, category) {
    return (
      '<li><canvas width="124" height="78" data-direction="' +
      direction +
      '" data-category="' +
      category +
      '" aria-hidden="true"></canvas><div><small>' +
      input +
      '</small><strong>' +
      move.label +
      '</strong><span>' +
      move.hint +
      (category === 'air' && move.late ? ' Clean ' + move.dmg + '%. Late ' + move.late.dmg +
        '% from frame ' + Math.round(move.late.start * 60) + '. A short hop deals 85% of these values.' : '') +
      (category === 'air' && move.meteor ? ' A strong spike rebounds off the floor. A falling rival can cancel from flight frame ' +
        (move.meteor + 1) + ' with a saved jump or Up Special.' : '') +
      (move.landingWindow ? ' Landing on frames ' + move.landingWindow[0] + '–' + (move.landingWindow[1] - 1) +
        ' takes ' + move.land + ' frames to recover. A timed Shield press cuts it to ' + Math.ceil(move.land / 2) +
        '. Elsewhere in the move it takes 2.' : '') +
      '</span></div></li>'
    );
  }
  function showMoves(kind, section = 'air') {
    if (dialogType !== 'moves') backToPause = dialogType === 'pause';
    const kit = kits[kind],
      f = fighters[kind];
    const tabs = Object.entries(fighters)
      .map(
        ([key, dog]) =>
          '<button type="button" data-guide-kind="' +
          key +
          '" aria-pressed="' +
          (key === kind) +
          '">' +
          dog.name +
          '</button>',
      )
      .join('');
    const moveSet =
      section === 'throws' ? { ...grabs, ...pummels, ...throws } : { air: moves, smashes, specials }[section];
    const inputs = { air: airInputs, smashes: smashInputs, specials: specialInputs, throws: throwInputs }[
      section
    ];
    const entries =
      section === 'throws'
        ? {
            grab: kit.grab,
            dashGrab: kit.dashGrab,
            pivotGrab: kit.pivotGrab,
            pummel: kit.pummel,
            ...kit.throws,
          }
        : kit[section];
    const rows =
      section === 'defense'
        ? Object.entries(defenseGuide)
            .map(([key, move]) => guideMoveRow(key === 'floorAttack' ? moves[kit.floorAttack] : move, move.input, key, section))
            .join('')
        : Object.entries(entries)
            .map(([side, id]) => guideMoveRow(moveSet[id], inputs[side], side, section))
            .join('');
    const ledgeMove =
      '<h3 class="guide-section">Ledge attack</h3><ul class="move-rows guide-ledge">' +
      guideMoveRow(moves[kit.ledgeAttack], 'While hanging · tap Attack', 'ledge', 'ledge') +
      '</ul><p>Wait below a swing, then choose your get-up. Three amber marks count down to a slip. Damage and repeated catches shorten your grip.</p>';
    const sections =
      '<div class="guide-tabs" role="group" aria-label="Move categories">' +
      [
        ['air', 'Attacks'],
        ['smashes', 'Smash attacks'],
        ['specials', 'Specials &amp; recovery'],
        ['throws', 'Grabs &amp; throws'],
        ['defense', 'Defense'],
      ]
        .map(
          ([key, label]) =>
            '<button type="button" data-guide-section="' +
            key +
            '" aria-pressed="' +
            (section === key) +
            '">' +
            label +
            '</button>',
        )
        .join('') +
      '</div>';
    let contents;
    if (section === 'defense') {
      const { roll, spot } = kit.defense;
      const { neutral, directional } = kit.airDodge;
      const airRows = [
        [
          'neutralAirDodge',
          'Tap Shield in midair',
          'Neutral air dodge',
          'Center your aim and tap Shield to tuck in place. ' +
            f.name +
            ' evades on frames ' +
            neutral[1] +
            '–' +
            neutral[2] +
            ' and can act again sooner than after a directional dodge.',
        ],
        [
          'directionalAirDodge',
          'Aim + tap Shield in midair',
          'Directional air dodge',
          kit.airDodge.tip +
            ' Landing during the dodge gives you ' +
            directional[3] +
            ' frames of landing lag.',
        ],
      ]
        .map(([key, input, label, hint]) => guideMoveRow({ label, hint }, input, key, 'defense'))
        .join('');
      const groundRows = [
        [
          'shieldRoll',
          'Shield + Left or Right',
          'Shield Roll',
          'Roll through a rival, or roll backward to retreat. ' +
            f.name +
            ' finishes a forward roll in ' +
            roll[0] +
            ' frames. A backward roll is shorter and takes two more frames.',
        ],
        [
          'spotDodge',
          'Shield + Down',
          'Spot-dodge',
          'Evade in place, including grabs. ' +
            f.name +
            ' is untouchable on frames ' +
            spot[1] +
            '–' +
            spot[2] +
            ' and finishes on frame ' +
            spot[0] +
            '.',
        ],
        [
          'parry',
          'Release Shield just before contact',
          'Parry',
          'Release within five frames of a strike to take no damage. Counter a melee attacker immediately. A projectile can be parried from a distance.',
        ],
      ]
        .map(([key, input, label, hint]) => guideMoveRow({ label, hint }, input, key, 'defense'))
        .join('');
      contents =
        '<p class="recovery-note">Shield is L for P1, Slash for P2, either bumper on a gamepad, or Shield on touch.</p><h3 class="guide-section">On the ground</h3><p>Keep Shield held and press Jump, Grab, Up + Smash, or Up + Special. Tapping Attack while shielding also grabs straight ahead. If a falling opponent crosses behind you, aim back and tap Jump + Attack together for a back air. You can tap during impact. A grab immediately after a block needs four extra startup frames.</p><p>In <strong>Training → Shield practice</strong>, use Clover’s Disc Hook against Pip’s spaced kick and Brisket’s Belly Drop. Choose Strike or Grab to practice a parry or dodge with your own dog.</p><ul class="move-rows guide-shield">' +
        groundRows +
        '</ul><h3 class="guide-section">On a platform</h3><ul class="move-rows">' +
        guideMoveRow({ label: 'Shield drop', hint: 'Raise Shield, then tap either lower diagonal. Tap Attack with it for ' +
          moves[kit.air.down].label + ', or aim another aerial as you fall. Try it against the up air in Training → Platform practice.' },
          'Hold Shield, then ↙ or ↘', 'platformDrop', 'defense') +
        '</ul><h3 class="guide-section">Shield coverage</h3><ul class="move-rows guide-coverage">' +
        guideMoveRow({ label: 'Tilt shield', hint: 'Shift the bubble toward a low sweep, high aerial or incoming disc. A hit that reaches an exposed part of your dog deals its normal damage. Try Guard low and Guard high in Shield practice.' },
          'Shield + gentle direction', 'shieldTilt', 'defense') +
        '</ul>' + (kit.crawl ? '<h3 class="guide-section">Crawl</h3><ul class="move-rows">' +
          guideMoveRow({label:'Belly crawl', hint:'Hold Down and a side to move low. Noodle can back up without turning. Hold Down alone after moving to stay flat. Try Crawl under the disc in Footwork practice.'},
            'Down + Left or Right', 'crawl', 'defense') + '</ul>' : '') +
        '<h3 class="guide-section">Crouch cancel</h3><ul class="move-rows guide-crouch">' +
        guideMoveRow({ label: 'Crouch cancel', hint: 'You take full damage and two-thirds of the usual launch speed. A light, low blow can leave your paws planted. Tap Attack at the spark for ' +
          moves[kit.tilts.down].label + '. Grabs and tethers can catch a crouch. Try both sides in Training → Combo escape.' }, 'Hold Down before contact', 'crouchHit', 'defense') +
        '</ul><h3 class="guide-section">In the air</h3><p>One dodge per airtime. Landing or catching a ledge refreshes it. Try <strong>Training → Air-dodge practice</strong>.</p><p>For a wavedash, tap Jump, then aim diagonally down and tap Shield. Release the direction to slide forward or backward and keep your facing. Do the same on the way down to waveland on a platform. Try <strong>Training → Wavedash</strong>.</p><ul class="move-rows guide-air-dodge">' +
        airRows +
        '</ul><h3 class="guide-section">At the ledge</h3><p>Tap Down or away to let go. Down + Jump spends your air jump below the lip. Aim inward and tap Attack for ' +
          moves[kit.air.forward].label + ' as you rise. Try both sides in <strong>Training → Ledge timing</strong>.</p><ul class="move-rows guide-ledge-climb">' +
        guideMoveRow({ label: 'Ledge climb', hint: 'On a fresh catch, protection ends ' +
          (kit.ledgeClimb.total - kit.ledgeClimb.protectedThrough) + ' frames before you can act. Hold Shield during the climb to guard as soon as you stand.' },
          'While hanging · press toward the stage', 'ledgeClimb', 'defense') +
        '</ul><p>Release Shield after an air dodge, then tap it again once you catch the lip. Try <strong>Training → Ledge roll practice</strong>.</p><ul class="move-rows guide-ledge-roll">' +
        guideMoveRow(
          { label: kit.ledgeRoll.label, hint: kit.ledgeRoll.tip },
          'While hanging · tap Shield',
          'ledgeRoll',
          'defense',
        ) +
        '</ul><h3 class="guide-section">Ledge trumping</h3><p>Catch an occupied ledge to bump the other dog outward. On a fresh catch, a longer flight gives you more protected time. High damage shortens it. Watch the grip marks under the lip. The last mark turns gold for the final six frames. Regrabs leave you open until you land or take a hit. Try <strong>Edge practice → Long recovery</strong> to time a punish.</p>' +
        '<h3 class="guide-section">Between hits</h3><p>Flick a fresh direction during impact freeze to move a short distance. Center the stick and flick again for a second shift if time allows. On a keyboard or touch screen, tap a direction at the spark. Try <strong>Training → Combo escape</strong> at two distances.</p>' +
        '<h3 class="guide-section">Surviving a finisher</h3><p>On your last stock, two amber chevrons point toward the blast line if a centered stick would carry you out during hitstun. Hold across the throw during the freeze to bend your flight. On shallow launches, Down also slows you and Up adds speed. A late tap of Shield toward the stage queues an air dodge in open air. Try <strong>Training → Launch practice → Survival DI</strong>.</p>' +
        '<h3 class="guide-section">After a knockout</h3><p>Watch the lamps on the airmail lift. When they turn mint, tap Down, a side, Jump, or an aerial move to leave. Leaving early gives you more protection on landing. The last gold mail tag goes dark when you can be hit again. Try both sides in <strong>Training → Launch practice → Take the lift</strong> and <strong>Catch the return</strong>.</p>' +
        '<h3 class="guide-section">After a launch</h3><p>Choose <strong>Training → Launch practice</strong> to take an up throw and try the landing again.</p><p>On a strong meteor, tap Shield just before the platform to stop the bounce. Over open air, tap a fresh Jump or Up + Special when the gold streaks turn mint, then steer home. Try <strong>Spike landing</strong> and <strong>Offstage spike</strong>.</p><ul class="move-rows guide-defense">' +
        rows +
        '</ul><h3 class="guide-section">Stage walls and undersides</h3><p>Jump around a solid deck to reach the lip. If a hit sends you tumbling up into its underside, tap Shield just before contact to stop the bounce. Try <strong>Tech the underside</strong> in Wall tech practice.</p><p>Pip and Noodle can flick away from a solid wall once per airtime. Pip kicks higher, and Noodle travels farther sideways. The kick keeps your remaining air jump and Up Special. In <strong>Training → Wall tech practice</strong>, choose a dog’s wall jump to try both roofs, or take Pip’s Back Heel to practice a wall tech.</p><ul class="move-rows guide-wall">' +
        guideMoveRow(
          {
            label: 'Wall tech',
            hint: 'Tap in the last 11 frames of a tumble into a solid wall. Your dog plants its paws and briefly stops. Your saved air jump is still available.',
          },
          'Tap Shield before impact',
          'wallTech',
          'defense',
        ) +
        guideMoveRow(
          {
            label: 'Wall-tech jump',
            hint: 'Keep Jump held as the tech lands to spring up and away. You can use your saved recovery afterward.',
          },
          'Tap Shield + hold Jump',
          'wallTechJump',
          'defense',
        ) +
        guideMoveRow(
          {
            label: 'Missed wall tech',
            hint: 'Your dog bounces back into open air, still tumbling. An early Shield press locks out another attempt for 28 frames.',
          },
          'Miss the Shield timing',
          'wallBounce',
          'defense',
        ) +
        '</ul>';
    } else if (section === 'throws') {
      contents =
        '<p class="recovery-note"><strong>Grab</strong> Use U (P1), M (P2), Y on a gamepad, or Grab on touch. Grab during a run to catch ahead. Reverse and press Grab together to catch behind. For a boost grab, start a dash attack and tap Grab in its first two frames. Hold back as you grab for a sliding pivot catch. After a catch, tap Attack to pummel or tap a direction to throw. Forward follows your new facing. Grab again also throws forward. Tap action buttons when caught to escape.</p><ul class="move-rows guide-throws">' +
        rows +
        '</ul>';
    } else if (section === 'smashes') {
      contents =
        '<p class="recovery-note"><strong>Charge</strong> Aim and hold Smash (P1 '+keyFor(0,'smash')+', P2 '+keyFor(1,'smash')+', P1 controller '+padFor(0,'smash')+'), then release. A tap swings immediately. Full charge takes one second. You can hold it for one more second before the move fires. Repeating a move lowers its damage and launch power. Try Training → Move freshness → KO test to see when this changes a stock.</p><ul class="move-rows guide-smashes">' +
        rows +
        '</ul>';
    } else if (section === 'specials') {
      contents =
        '<p class="recovery-note"><strong>Offstage</strong> ' +
        kit.recovery +
        '</p><p>In the air, tap neutral Special, then immediately flick behind you for a <strong>B-reverse</strong>. Your dog turns and reverses its sideways speed. Flick back and release <em>before</em> Special for a turnaround that keeps your drift. Combine both inputs for a <strong>wavebounce</strong>. Try Training → Aerial practice.</p><ul class="move-rows guide-specials">' +
        rows +
        '</ul>' +
        ledgeMove;
    } else {
      contents =
        '<h3 class="guide-section">Ground combo</h3><div class="guide-chain">' +
        kit.ground.map((id) => moves[id].label).join(' / ') +
        '</div><p>' +
        kit.combo +
        '</p><p>Walk to a ledge to balance there. Dash to run off. Land an aerial at the tip of a platform with sideways speed to slide off and attack again. Try Training → Edge practice.' +
        '</p><p>When two ground swings meet, both dogs recoil. A swing worth at least 9 percentage points more carries through. You can also bat Clover’s flying discs. Try Training → Footwork practice → Clash jabs.' +
        '</p><p>If the rival misses a landing, tap neutral Attack for ' + moves[kit.ground[0]].label +
        '. You can jab lock twice before finishing with ' + smashes[kit.smashes.down].label + ' (Down + Smash). Try Training → Launch practice → Jab lock.' +
        '</p><h3 class="guide-section">Ground tilts</h3><p>Aim and tap Attack. Angle a forward tilt with a shallow diagonal on the stick, Walk + a diagonal on keyboard, or a slide from the center dot to a diagonal on touch. Aim high to tag a jumper or low to cover a recovery. With Tilt stick enabled, hold Up or Down and flick the aim stick sideways.</p><p>Out of a run, release forward briefly, then press forward and Attack together to slide into a tilt. Reverse and tap Attack to strike behind you while your paws still skid forward. Up and down tilts work straight out of the run.</p><ul class="move-rows guide-tilts">' +
        Object.entries(kit.tilts)
          .map(([side, id]) => guideMoveRow(moves[id], tiltInputs[side], side, 'tilts'))
          .join('') +
        '</ul><h3 class="guide-section">Dash attack</h3><ul class="move-rows guide-dash">' +
        guideMoveRow(moves[kit.dashAttack], 'Run + Attack', 'dash', 'dash') +
        '</ul>' +
        ledgeMove +
        '<h3 class="guide-section">Aerial attacks</h3><p>Jump + Attack gives a rising short-hop aerial. For a low approach, hold Short hop and wait until you are falling to press Attack. Flick Down in the last three frames before the apex or as you descend to fast-fall. Forward follows your facing.</p><p>Press Shield during an aerial in the last seven frames before touchdown to halve its landing recovery, rounded up. Mint streaks at the paws mark a landing cancel. Keep holding Shield to block the reply. Try <strong>Training → Aerial practice → Landing cancel</strong>.</p><p>Each forward air has a clean hit and a softer follow-through. Practice landing the late hit into a jab in <strong>Training → Aerial practice → Landing hits</strong>.</p><p>Steer with the left stick and flick the right stick to swing in a separate direction. On keyboard, aim left/right/up/down with '+strikeKeys(0)+' for P1 or '+strikeKeys(1)+' for P2. On touch, flick outward from Smash. For a running back air, reverse direction with Jump and steer back along your original path. Try <strong>Aerial practice → Approach</strong>.</p><ul class="move-rows guide-airs">' +
        rows +
        '</ul>';
    }
    showDialog(
      'moves',
      f.name + ' moves',
      '<div class="guide-dogs" role="group" aria-label="Fighter move list">' +
        tabs +
        '</div>' +
        sections +
        contents +
        '<div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>',
    );
    for (const canvas of document.querySelectorAll('[data-direction]'))
      drawMoveThumbnail(canvas, kind, canvas.dataset.direction, canvas.dataset.category);
  }
  $('lobby-moves').onclick = () => showMoves(settings[editing ? 'p2' : 'p1']);
  $('training-moves').onclick = () => showMoves(world.dogs[world.trainingPlayerSlot].kind);
  const screenRoot = document.documentElement;
  const nativeScreen = !!((document.fullscreenEnabled && screenRoot.requestFullscreen) ||
    (document.webkitFullscreenEnabled && screenRoot.webkitRequestFullscreen));
  const embeddedScreen = !nativeScreen && window.self !== window.top;
  const inFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  let triedFullscreen = false, switchingScreen = false;
  function screenLabel() {
    if (embeddedScreen) return 'Open game in new tab';
    return inFullscreen() ? 'Exit fullscreen' : 'Enter fullscreen';
  }
  function updateFullscreen() {
    const button = $('fullscreen'), active = inFullscreen(), label = screenLabel();
    button.hidden = !nativeScreen && !embeddedScreen;
    button.setAttribute('aria-label', label);
    button.title = label + ' (F)';
    button.innerHTML = icon(active ? 'collapse' : 'expand') + '<span>' +
      (embeddedScreen ? 'Open game' : active ? 'Exit fullscreen' : 'Fullscreen') + '</span>';
    for (const action of document.querySelectorAll('[data-do="fullscreen"]')) action.textContent = label;
  }
  function screenAction() {
    return nativeScreen || embeddedScreen ?
      '<button class="utility" type="button" data-do="fullscreen">' + screenLabel() + '</button>' : '';
  }
  async function toggleFullscreen(explicit = true) {
    if (switchingScreen) return;
    if (!nativeScreen) {
      if (explicit && embeddedScreen) window.open(location.href, '_blank', 'noopener');
      return;
    }
    triedFullscreen = true;
    switchingScreen = true;
    try {
      if (inFullscreen()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (screenRoot.requestFullscreen) await screenRoot.requestFullscreen({ navigationUI: 'hide' });
      else await screenRoot.webkitRequestFullscreen();
    } catch {
      if (explicit) announce('The game fills this window. Browser fullscreen is unavailable here.');
    } finally {
      switchingScreen = false;
      updateFullscreen();
    }
  }
  $('fullscreen').onclick = () => toggleFullscreen();
  document.addEventListener('fullscreenchange', updateFullscreen);
  document.addEventListener('webkitfullscreenchange', updateFullscreen);
  updateFullscreen();
  // Use the first play gesture. Leaving fullscreen is respected for the rest of this visit.
  document.addEventListener('click', (e) => {
    if (triedFullscreen || !nativeScreen || inFullscreen() || navigator.userActivation?.isActive === false) return;
    const start = e.target.closest?.('#start, #dispatch-start, [data-stop], [data-reel], #online-quick, #online-create, #online-join');
    if (start && !start.disabled && (e.isTrusted || navigator.userActivation?.isActive)) toggleFullscreen(false);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyF' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey ||
      e.target.closest?.('input, textarea, select, [contenteditable=true]')) return;
    e.preventDefault();
    if (!e.repeat) toggleFullscreen();
  });
  const stockLabel = (n) => n + (n === 1 ? ' stock' : ' stocks');
  const airResources = ['Jump', 'Up Sp.', 'Dodge'];
  function offstageOptions(f, terrain) {
    if (f.ground >= 0 || f.ledge || f.stockLift || f.respawning || !f.stocks || f.floorAction ||
        terrain.some(p => !p.thin && f.x >= p.x1 && f.x <= p.x2 && f.y <= p.y+5)) return null;
    return Number(f.jumps > 0) + 2*Number(!f.usedUp || f.hopWindow > 0) + 4*Number(!f.usedDodge);
  }
  function recoveryStrip(mask) {
    if (mask === null) return '';
    const remaining = ['Air jump','Up Special','Air dodge'].filter((_,i) => mask & (1<<i));
    const label = 'Air jump, Up Special, air dodge · Remaining: ' + (remaining.join(', ') || 'none');
    return '<span class="air-resources" role="img" aria-label="' + label + '" title="' + label + '">' +
      airResources.map((name,i) => '<span' + (mask & (1<<i) ? '' : ' class="spent"') + '>' + name + '</span>').join('') + '</span>';
  }
  function stockPaws(count) {
    return Array.from({ length: 3 }, (_, i) =>
      '<i class="' + (i >= count ? 'lost' : '') + '" data-icon="paw">' + svg('paw') + '</i>').join('');
  }
  const tenth = n => Number(n.toFixed(1));
  function percentDigits(damage) {
    const [whole, fraction] = String(tenth(damage)).split('.');
    return fraction ? whole + '<small>.' + fraction + '</small>' : whole;
  }
  const moveLabel = id => (moves[id] || specials[id] || smashes[id] || pummels[id] || throws[id]).label;
  function freshnessResult(sample) {
    const parts = [];
    if (sample.hits) {
      parts.push(tenth(sample.damage) + '% damage');
      if (sample.launch) parts.push(Math.round(sample.launch) + ' px/s');
      if (Number.isFinite(sample.angle)) parts.push(sample.angle + '° at contact');
    }
    if (sample.blocks) parts.push(sample.shieldFrames + 'f shieldstun');
    if (sample.outcome) parts.push(sample.outcome);
    return parts.join(' · ');
  }
  function updateFreshnessReadout(player, lab) {
    const { last, previous } = lab;
    const id = last?.moveId || previous?.last.moveId;
    $('freshness-name').textContent = lab.drive ? (last ? moveLabel(last.moveId) : 'Launch height') + ' · ' +
      (lab.drive.edge ? 'Ledge' : 'Center') + ' · ' + world.dogs[1].stats.name + ' at ' + lab.baseline + '%' :
      lab.rageDamage != null ? player.stats.name + ' at ' + lab.rageDamage + '% · Rage +' +
      tenth((rageScale(lab.rageDamage) - 1) * 100) + '%' : last ? moveLabel(last.moveId) + ' · ' + tenth(last.power * 100) + '% power' :
      lab.koTest ? smashes[player.kit.smashes.up].label + ' KO test' : 'Move freshness';
    const result = last ? freshnessResult(last) : world.dogs[1].stats.name + ' at ' + lab.baseline + '%';
    if ($('freshness-contact').textContent !== result) $('freshness-contact').textContent = result;
    $('freshness-previous').hidden = !previous;
    if (previous) {
      const label = lab.drive ? moveLabel(previous.last.moveId) + ' at ' + previous.baseline + '% · ' + (previous.edge ? 'Ledge' : 'Center') :
        previous.rageDamage != null ? 'At ' + previous.rageDamage + '%' :
        last?.moveId === previous.last.moveId ? 'Previous' : 'Previous ' + moveLabel(previous.last.moveId);
      $('freshness-previous').textContent = label + ' · ' + freshnessResult(previous.last);
    }
    if (lab.drive) $('freshness-percent').textContent = 'Set rival to ' + (lab.baseline ? 0 : 60) + '%';
    $('freshness-summary').textContent = 'Recent moves ' + player.moveHistory.length + '/9' +
      (id ? ' · Next ' + tenth(moveFreshness(player, id) * 100) + '%' : '');
    $('freshness-list').replaceChildren(...player.moveHistory.map(entry => {
      const li = document.createElement('li');
      li.textContent = moveLabel(entry.moveId) + (entry.shieldOnly ? ' · shield' : '');
      return li;
    }));
  }
  const comboSources = { example:'Dog’s combo', late:'Late jab', record:'Your take', replay:'Your take',
    flurry:'Pip’s rapid jab', escapeFlurry:'Escape the flurry',
    defend:'Defend this take', mix:'Mix A and B' };
  const comboReplies = { stand: 'Standing', guard: 'Guard', away: 'Flick away', punish:'Block and punish', p2:'Player 2' };
  const takeLetter = slot => slot ? 'B' : 'A';
  function takeName(slot) {
    return takeLetter(slot) + ' · ' + (world.comboTakes[slot]?.length ? 'Your recording' : slot ? 'Landing grab' : 'Falling aerial');
  }
  function comboMoveName(moveId) {
    return (moves[moveId] || specials[moveId] || smashes[moveId] || grabs[moveId] ||
      throws[moveId] || pummels[moveId])?.label || moveId || 'Hit';
  }
  function comboRow(contact) {
    const { moveId, kind, gap } = contact;
    const name = comboMoveName(moveId);
    const result = kind === 'parry' ? 'parried' : kind === 'block' ? 'blocked' : kind === 'grab' ? 'caught' : tenth(contact.damage) + '%';
    const timing = gap === null ? 'opener' : gap ? gap + 'f opening' :
      kind === 'pummel' || kind === 'throw' ? 'held' : 'no free frame';
    return name + ' · ' + result + ' · ' + timing;
  }
  function updateComboReadout(d) {
    const title = d.source === 'flurry' || d.source === 'escapeFlurry' ? comboSources[d.source] : d.defending ? (d.phase === 'done' ? 'Take ' + takeName(d.playSlot) :
      d.source === 'mix' ? 'Mix A and B' : 'Defend ' + takeName(d.slot)) :
      d.phase === 'ready' ? 'Ready to record' : d.source === 'record' && d.phase === 'active' && d.tick < 150
      ? 'Recording' : comboSources[d.source];
    $('combo-summary').textContent = title + (d.defending ? ' · Took ' : ' · ') + d.hits +
      (d.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(d.damage) + '%';
    const last = d.contacts.at(-1);
    const response = [d.shifts ? d.shifts + (d.shifts === 1 ? ' shift' : ' shifts') : '',
      d.dodges ? d.dodges + (d.dodges === 1 ? ' air dodge' : ' air dodges') : ''].filter(Boolean).join(' · ');
    let latest = last ? comboRow(last) + (response ? ' · ' + response : '') :
      d.phase === 'done' ? 'No contact' : d.phase === 'ready' ? 'Move or attack to start.' : 'Waiting for contact';
    if (d.source === 'flurry' && d.phase !== 'done') {
      if (!last) latest = 'Tap Attack for Quick Paw.';
      else if (last.moveId === 'pipJab') latest += ' · Hold Attack now';
      else if (last.moveId === 'pipSpeedBag') latest += ' · Release for Bell Kick';
    }
    if (d.defending) {
      if (d.phase === 'ready') latest = 'You are ' + world.dogs[1].stats.name + ' · Tap Attack to start';
      else if (d.phase === 'countdown') latest = 'Get ready';
      else if (d.counter) latest = (last ? comboRow(last) + ' · ' : '') + 'Your ' + comboMoveName(d.counter.moveId) + ' connected';
      if (d.phase === 'done') latest += ' · Tap Attack to retry';
    } else if (d.reply === 'punish') {
      if (d.counter) latest += ' · ' + world.dogs[1].stats.name + ' punished with ' + comboMoveName(d.counter.moveId);
      else if (d.phase === 'done' && d.contacts.some(c => c.kind === 'block')) latest += ' · No punish landed';
    } else if (d.reply === 'p2') {
      if (d.phase === 'ready') latest = 'P1 moves to start recording. P2 controls ' + world.dogs[1].stats.name + '.';
      if (d.counter) latest += ' · P2 answered with ' + comboMoveName(d.counter.moveId);
    }
    $('combo-latest').textContent = latest;
    const prior = d.prior;
    $('combo-previous').hidden = !prior;
    if (prior) $('combo-previous').textContent = 'Previous · ' + (['mix','defend'].includes(prior.source) ?
      'Defended take ' + takeLetter(prior.slot) : comboSources[prior.source] + ' · ' + comboReplies[prior.reply]) +
      ' at ' + prior.baseline + '% · ' + prior.hits + (prior.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(prior.damage) + '%';
    $('combo-history').hidden = !last;
    $('combo-list').replaceChildren(...d.contacts.map(contact => {
      const row = document.createElement('li');
      row.textContent = comboRow(contact);
      return row;
    }));
    $('combo-replay').disabled = !d.saved?.length;
    $('combo-restore').hidden = !d.saved?.length;
    for (const [i,option] of Array.from($('combo-slot').options).entries()) option.textContent = takeName(i);
  }
  function updateHUD() {
    const landing = world.spacingPractice?.pattern === 'landing' && world.spacingPractice;
    const compare = $('hop-compare');
    if (landing || !compare.hidden) {
      const peaks = [];
      for (const [peak, prefix] of [[landing?.peak, ''], [landing?.previousPeak, 'Previous: ']]) {
        if (peak?.complete) peaks.push(prefix + (peak.short ? 'Short hop' : 'Full jump') + ' · ' +
          Math.round(peak.floorY - peak.y) + ' px');
      }
      const comparison = peaks.join(' / ');
      if (compare.textContent !== comparison) compare.textContent = comparison;
      compare.hidden = !comparison;
    }
    if (world.mode === 'adventure') return updateDispatchHUD();
    const confirmed = online.match?.confirmedWorld || world;
    const scores = confirmed.dogs;
    const clock = $('match-clock'), seconds = Math.ceil((confirmed.clockFrames || 0) / 60);
    const hideClock = confirmed.clockFrames === null && !confirmed.suddenDeath;
    if (clock.hidden !== hideClock) clock.hidden = hideClock;
    const clockText = confirmed.suddenDeath ? 'SD' : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0');
    if (clock.textContent !== clockText) clock.textContent = clockText;
    clock.classList.toggle('urgent', !!confirmed.suddenDeath || seconds <= 10);
    const call = $('countdown'), tiebreak = confirmed.suddenDeath;
    call.classList.toggle('sudden', !!tiebreak?.intro);
    if (tiebreak?.intro) {
      const caption = tiebreak.cause === 'time' ? 'Time! Stocks tied' :
        tiebreak.cause === 'double' ? 'Double knockout' : 'One stock each';
      if (call.dataset.caption !== caption) call.dataset.caption = caption;
    }
    const clockLabel = tiebreak ? 'Sudden Death · One stock at 300%' : 'Match clock';
    if (clock.getAttribute('aria-label') !== clockLabel) clock.setAttribute('aria-label', clockLabel);
    const combo = world.lastCombo;
    const grip = world.grapple;
    const prompt = $('grapple-prompt');
    const hideGrip = !grip || grip.phase === 'throw' || !!world.launchPractice || !!world.stockPractice || !!world.survivalPractice;
    if (prompt.hidden !== hideGrip) prompt.hidden = hideGrip;
    if (!prompt.hidden) {
      const holder = world.dogs[grip.owner].stats.name;
      const captive = world.dogs[grip.target].stats.name;
      const holdTip = grappleControls(world,grip);
      const text =
        world.hasSecondPlayer
          ? holder + ' · ' + holdTip + ' / ' + captive + ' · Tap buttons to escape'
          : grip.owner === world.trainingPlayerSlot
            ? holdTip
            : 'Grabbed · Tap action buttons to escape';
      if (prompt.textContent !== text) prompt.textContent = text;
    }
    const player = world.dogs[world.trainingPlayerSlot], lab = world.freshnessPractice;
    const wave = world.wavePractice, comboLab = world.comboPractice;
    if (wave?.pattern === 'platform' && wave.phase === 'active' && wave.contact !== null) {
      const bar = $('wave-recovery'), tip = $('wave-tip'), lag = Math.max(0, Math.ceil(player.landingLag * 60 - 1e-8));
      const canBuffer = player.landingLag <= window.DogFight.inputWindow + 1e-8;
      if (bar.value !== bar.max - lag) bar.value = bar.max - lag;
      if (bar.classList.contains('ready') !== canBuffer) bar.classList.toggle('ready', canBuffer);
      const cue = player.attack?.grabAttempt ? 'Reaching for the shield.' : player.command?.type === 'grab' ? 'Grab queued.' :
        canBuffer ? 'Tap Grab now.' : 'Landing recovery · ' + lag + ' frames';
      if (tip.textContent !== cue) tip.textContent = cue;
    }
    const chargeReadout = $(lab ? 'freshness-charge' : 'training-charge');
    if (lab) {
      $('training-charge').hidden = true;
      $('recovery-tip').hidden = !lab.waiting;
    }
    const power = player.smashCharge ? smashPower(player.charge) : player.lastSmashPower;
    chargeReadout.hidden = world.mode !== 'training' || !!world.wavePractice || power === null || (!!lab && !player.smashCharge);
    if (!chargeReadout.hidden) {
      const value = player.smashCharge
        ? power >= 1
          ? 'Full charge'
          : 'Charging ' + Math.round(power * 100) + '%'
        : 'Released at ' + Math.round(power * 100) + '%';
      if (chargeReadout.textContent !== value) chargeReadout.textContent = value;
    }
    const shownMove = player.smashCharge ? smashes[player.smashCharge.moveId].label : player.lastMove;
    const returns = scores.map((f, i) => {
      if (!f.stockLift) {
        if (f.stockGuard) return f.stockGuard <= 24 / 60 + 1e-8 ? 'Last tag' : 'Protected';
        if (f.ledge && window.DogFight.gripFramesLeft(f) <= window.DogFight.gripWarningFrames) return 'Grip slipping';
        if (f.ledgeCatches >= window.DogFight.maxLedgeCatches) return f.ledge ? 'Last grip' : 'Land to regrab';
        return '';
      }
      if (!f.stockLift.ready) return 'Returning';
      const human = online.match ? online.side === i : world.mode === 'local' || i === 0;
      return human ? '↓ or Jump' : 'Lift ready';
    });
    const recovery = scores.map(f => offstageOptions(f, confirmed.terrain));
    const key =
      scores.map((f, i) => f.kind + ':' + f.damage + ':' + f.stocks + returns[i] + '/' + recovery[i]).join('|') +
      world.mode +
      '/' +
      combo.hits +
      '/' +
      combo.damage +
      '/' +
      (world.mode === 'training' ? shownMove : '') +
      (comboLab ? '/' + [comboLab.phase, comboLab.contacts.length, comboLab.counter?.moveId, comboLab.shifts, comboLab.dodges, comboLab.tick >= 150].join('/') : '') +
      (world.freshnessPractice ? '/' + world.freshnessPractice.revision + '/' + player.moveHistory.length : '');
    if (key === hudKey) return;
    hudKey = key;
    if (comboLab) updateComboReadout(comboLab);
    if (world.freshnessPractice) updateFreshnessReadout(player, world.freshnessPractice);
    const lastMove = $('training-move');
    lastMove.hidden =
      world.mode !== 'training' ||
      !!world.freshnessPractice ||
      !!world.wavePractice || !!comboLab ||
      !shownMove ||
      (shownMove === 'Parry' && world.shieldPractice?.outcome === 'parry');
    if (!lastMove.hidden) lastMove.textContent = shownMove;
    const readout = $('training-combo');
    readout.hidden = world.mode !== 'training' || !!world.freshnessPractice || !!world.wavePractice || !!comboLab || combo.hits === 0;
    if (!readout.hidden) {
      readout.textContent =
        (world.trainingPartner || combo.target === 0 ? 'P' + ((combo.target ?? 1)+1) + ' took ' : '') +
        combo.hits + (combo.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(combo.damage) + '% damage';
    }
    $('hud').innerHTML = scores
      .map((f, i) => {
        const rage = tenth((rageScale(f.damage) - 1) * 100);
        const rageTitle = 'Rage +' + rage + '% knockback';
        const lives =
          world.mode === 'training'
            ? '∞'
            : stockPaws(f.stocks);
        return (
          '<div class="hud-card ' +
          (i ? 'two' : '') +
          '">' + (returns[i] ? '<span class="stock-alert' + (returns[i] === 'Last tag' ? ' last' : '') + '">' + returns[i] + '</span>' : '') + '<span class="hud-portrait"><img alt="" src="' +
          portrait(f.kind) +
          '">' + (rage ? '<span class="rage-meter" role="img" aria-label="' + rageTitle + '" title="' + rageTitle +
            '"><i style="width:' + (rage * 10) + '%"></i></span>' : '') + '</span><div><span class="hud-name"><small>' +
          labelFor(i) +
          '</small>' +
          f.stats.name +
          '</span><strong class="percentage ' +
          (f.damage >= 110 ? 'danger' : f.damage >= 65 ? 'high' : '') +
          '">' +
          percentDigits(f.damage) +
          '%</strong><span class="lives" aria-label="' +
          (world.mode === 'training' ? 'Unlimited stocks' : stockLabel(f.stocks)) +
          '">' +
          lives +
          '</span></div>' + recoveryStrip(recovery[i]) + '</div>'
        );
      })
      .join('');
  }
  let matchConfig, soloSeed, localSet = null, practiceFight = null;
  const frameLab = {mode:'live', count:0, pending:0, renderTime:0};
  let trainingMoment = null;
  function frameState(f) {
    const frames = seconds => Math.ceil(seconds * 60 - 1e-8);
    if (world.hitStop > 0 || f.impactLag > 0) return 'Hitstop ' + frames((world.hitStop + world.finalHitHold) || f.impactLag) + 'f';
    if (f.stockLift) return 'Respawn platform';
    if (f.grip) return 'Grapple';
    if (f.ledge) return 'Hanging';
    if (f.shieldBreak) return f.shieldBreak.phase === 'pop' ? 'Shield break · airborne' : 'Dizzy · ' + frames(f.stun) + 'f';
    if (f.stun > 0) {
      const options=[];
      if (world.canEscapeHitstun(f,false)) options.push('Shield');
      if (world.canEscapeHitstun(f,true)) options.push('Attack');
      return 'Hitstun ' + frames(f.stun) + 'f' + (options.length ? ' · ' + options.join(' or ') : '');
    }
    if (f.shieldStun > 0) return 'Shieldstun ' + frames(f.shieldStun) + 'f';
    if (f.landingLag > 1e-8) return 'Landing recovery ' + frames(f.landingLag) + 'f';
    if (f.jumpSquat) return 'Jump squat ' + Math.round(f.jumpSquat.time * 60) + '/3' +
      (f.jumpSquat.aerial?.fromWindup ? ' · canceled ' + moves[f.jumpSquat.aerial.fromWindup].label : '');
    const dodge = f.airDodge || f.floorAction;
    if (dodge?.wear !== undefined) {
      const label = f.airDodge ? 'Air dodge' : dodge.type === 'spotDodge' ? 'Spot-dodge' : 'Roll';
      const safe = dodge.time + 1e-8 >= dodge.safeFrom && dodge.time < dodge.safeUntil - 1e-8;
      return label + (dodge.wear ? ' · worn ' + dodge.wear : ' · fresh') +
        (safe ? ' · protected' : ' · vulnerable') + ' · ' + frames(dodge.duration - dodge.time) + 'f left';
    }
    if (f.floorAction) return 'Floor action · ' + frames(f.floorAction.duration - f.floorAction.time) + 'f';
    if (f.clashRecoil) return 'Clash recoil';
    if (f.attack) return f.lastMove + (f.attack.fromWindup ? ' · from ' + moves[f.attack.fromWindup].label :
      f.attack.fromJumpSquat ? ' · jump cancel' : '') + ' · frame ' + Math.round(f.attack.time * 60);
    if (f.smashCharge) return 'Charging ' + smashes[f.smashCharge.moveId].label + (f.smashCharge.fromJumpSquat ? ' · jump cancel' : '');
    if (f.shield) return 'Shield up';
    if (f.shieldDrop > 0) return 'Lowering shield';
    return f.ground < 0 ? (f.vy < 0 ? 'Rising' : 'Falling') : 'Grounded';
  }
  function showFrameStatus() {
    const status = $('frame-status');
    if (frameLab.mode === 'live') return;
    if (frameLab.mode === 'armed') {
      status.textContent = world.dogs[world.trainingPlayerSlot].kind === 'brisket' ?
        'Jump, then tap Down + Attack for Belly Drop. Training will freeze on landing.' :
        'Jump, then use an aerial. Training will freeze on landing.';
      return;
    }
    const slot = world.trainingPlayerSlot, player = world.dogs[slot], rival = world.dogs[1-slot];
    const queued = player.heldRecoveryJump ? ' · Jump held' : player.jumpBuffer > 1e-8 && !player.jumpSquat ? ' · Jump buffered' : '';
    status.textContent = 'Frame +' + frameLab.count + '\n' + player.stats.name + ' · ' + frameState(player) + queued +
      '\n' + rival.stats.name + ' · ' + frameState(rival);
  }
  function setFrameMode(mode) {
    frameLab.mode = mode;
    frameLab.count = frameLab.pending = accumulator = 0;
    frameLab.renderTime = performance.now() / 1000;
    $('frame-status').hidden = mode === 'live';
    $('frame-step').hidden = mode !== 'frozen';
    $('frame-toggle').textContent = mode === 'frozen' ? 'Resume play' : 'Frame advance';
    $('frame-toggle').setAttribute('aria-pressed', String(mode === 'frozen'));
    $('frame-landing').setAttribute('aria-pressed', String(mode === 'armed'));
    $('frame-landing').textContent = mode === 'armed' ? 'Cancel landing freeze' : 'Freeze on landing';
    showFrameStatus();
  }
  function toggleFrames() { setFrameMode(frameLab.mode === 'frozen' ? 'live' : 'frozen'); }
  function stepTrainingFrame() {
    if (frameLab.mode !== 'frozen') setFrameMode('frozen');
    frameLab.pending++;
  }
  $('frame-toggle').onclick = toggleFrames;
  $('frame-step').onclick = stepTrainingFrame;
  $('frame-landing').onclick = () => setFrameMode(frameLab.mode === 'armed' ? 'live' : 'armed');
  function momentNotice(action) {
    const text = action + ' · ' + world.dogs.map(f => f.stats.name + ' ' + tenth(f.damage) + '%').join(' / ');
    $('recovery-tip').textContent = text;
    $('recovery-tip').hidden = false;
    announce(text);
    $('game').focus({preventScroll:true});
  }
  $('moment-save').onclick = () => {
    const {cx,cy,zoom,leftFighter,effects,lastTrail,shake} = view;
    trainingMoment = {battle:world.saveTrainingMoment(), mode:frameLab.mode,
      picture:structuredClone({cx,cy,zoom,leftFighter,effects,lastTrail,shake}), renderTime:frameLab.renderTime,
      sticks:rightStickHeld.slice(), tilt:shieldTiltLocked.slice(), flick:structuredClone(flickJumpStates)};
    $('moment-retry').disabled = false;
    momentNotice('Moment saved');
  };
  $('moment-retry').onclick = () => {
    if (!trainingMoment) return;
    world.restoreTrainingMoment(trainingMoment.battle);
    for (const i of [0,1]) {
      rightStickHeld[i] = trainingMoment.sticks[i];
      shieldTiltLocked[i] = trainingMoment.tilt[i];
      flickJumpStates[i] = {...trainingMoment.flick[i]};
    }
    taps.clear();
    touchTaps.clear();
    flickAim = null;
    const boxes = view.contactBoxes;
    view = new FightView($('blast-radar'));
    Object.assign(view,structuredClone(trainingMoment.picture));
    view.shakeEnabled = settings.shake;
    showContactBoxes(boxes);
    setFrameMode(trainingMoment.mode);
    if (frameLab.mode === 'frozen') frameLab.renderTime = trainingMoment.renderTime;
    $('dummy-damage').value = world.trainingDamage;
    $('damage-output').textContent = world.trainingDamage + '%';
    hudKey = '';
    updateHUD();
    view.draw($('game'),world,0,frameLab.renderTime);
    momentNotice('Moment restored');
  };
  function showContactBoxes(enabled) {
    view.contactBoxes = enabled;
    $('training-boxes').setAttribute('aria-pressed', String(enabled));
    $('box-key').hidden = !enabled;
  }
  $('training-boxes').onclick = () => {
    showContactBoxes(!view.contactBoxes);
    $('game').focus({ preventScroll:true });
  };
  function showCpuLevels() {
    const restart = page === 'match';
    backToPause = restart;
    const level = restart ? world.cpuLevel : settings.cpuLevel;
    const choices = Object.entries(cpuLevels).map(([id, cpu]) =>
      '<button type="button" data-cpu="' + id + '" aria-pressed="' + (level === id) + '">' +
      '<strong>' + cpu.name + '</strong><span>' + cpu.tip + '</span></button>').join('');
    showDialog('cpu-level', restart ? 'Replay the opening' : 'CPU opponent',
      (restart ? '<p>Choose an opponent to replay this match from the same opening.</p>' : '') +
      '<div class="cpu-choices">' + choices + '</div>' + (restart ? '' :
        '<p>Rival watches how you leave shield. In a set, it remembers between games.</p>' +
        '<div class="dialog-actions"><button class="utility" data-do="shield-read-match">Try Rival · Pip vs. Noodle</button>' +
        '<button class="utility" data-do="shield-read-set">Play a Rival set · Pip vs. Noodle</button>' +
        '<button class="utility" data-do="cut-off-clover">Intercept Clover · Pip vs. Clover</button></div>'));
    document.querySelector('[data-cpu="' + level + '"]').focus({preventScroll:true});
  }
  $('cpu-level').onclick = showCpuLevels;
  $('rules-label').onclick = () => {
    const choices = stockMinutes.map(n => '<button type="button" class="utility" data-minutes="' + n +
      '" aria-pressed="' + (settings.minutes === n) + '">' + (n ? n + ' min' : 'No clock') + '</button>').join('');
    showDialog('stock-rules', 'Stock match rules',
      '<p>Three stocks each. When time runs out, the dog with more stocks wins. Tied stocks or a double final knockout start Sudden Death.</p>' +
      '<h3>Match format</h3><div class="dialog-actions"><button class="utility" data-format="single" aria-pressed="' + !settings.bestOfThree +
      '">Single game</button><button class="utility" data-format="set" aria-pressed="' + settings.bestOfThree + '">Best of three</button></div>' +
      '<p>In a set, the loser picks the next arena. First to two wins takes the set.</p>' +
      '<h3>Match clock</h3><div class="dialog-actions">' + choices + '</div>' +
      '<p>Play the last stock with both dogs at 125%. When a hit threatens the match, steer during the close-up to change your launch.</p>' +
      '<div class="dialog-actions"><button class="utility" data-do="last-stock-start">Play last stock</button></div>' +
      '<p>Sudden Death starts both dogs at 300% on one stock. The side boundaries close in after five seconds.</p>' +
      '<div class="dialog-actions"><button class="utility" data-do="sudden-start">Play Sudden Death</button></div>');
    document.querySelector('[data-minutes="' + settings.minutes + '"]').focus({preventScroll:true});
  };
  function startShieldReadMatch(series = false) {
    leaveOnline();
    afterStory = null;
    startMatch({ ...settings, p1:'pip', p2:'noodle', mode:'solo', cpuLevel:'rival', stage:'picnic', fetch:false },
      undefined, 42, series ? new StockSet('picnic') : null);
  }
  function startCloverApproach() {
    leaveOnline();
    afterStory = null;
    startMatch({...settings, mode:'solo', p1:'pip', p2:'clover', cpuLevel:'rival', stage:'picnic',
      fetch:false, minutes:7, openingFrames:49}, undefined, 7);
  }
  function fightRivalPip() {
    leaveOnline();
    afterStory = null;
    startMatch({...settings, mode:'solo',p1:'brisket',p2:'pip',cpuLevel:'rival',stage:'nightmail',
      fetch:false,minutes:7},undefined,30);
  }
  function cpuReadReport() {
    if (world.mode !== 'solo' || world.cpuLevel !== 'rival') return '';
    const {spotReads, spotPunishes, rollReads, rollPunishes, shieldHabit} = world.bot;
    let report = '';
    if (spotReads) report += '<p>Rival expected a spot-dodge ' + spotReads + (spotReads === 1 ? ' time' : ' times') +
      ' and caught ' + (spotPunishes || 0) + ' with a delayed down tilt.</p>';
    if (rollReads) report += '<p>Rival predicted ' + rollReads + (rollReads === 1 ? ' shield roll' : ' shield rolls') +
      ' and grabbed you during roll recovery ' + (rollPunishes || 0) + (rollPunishes === 1 ? ' time.' : ' times.') + '</p>';
    if (localSet && shieldHabit && localSet.champion === null) {
      const answer = {spot:'spot-dodge', away:'roll away', through:'roll toward Rival'}[shieldHabit.escape];
      report += '<p>Rival saw you ' + answer + (shieldHabit.count === 1 ? ' after a block.' : ' after consecutive blocks.') +
        (world.end !== null ? ' It will remember that in the next game.' : '') + '</p>';
    }
    return report;
  }
  function startMatch(config = settings, random = Math.random, opening, series = null, {visit, resume, leadInFrames = 0} = {}) {
    music?.restart();
    practiceFight = visit || null;
    const rehearsal = !!visit && config.mode === 'solo';
    trainingMoment = null;
    $('moment-retry').disabled = true;
    $('moment-save').hidden = $('moment-retry').hidden = false;
    $('partner-training').setAttribute('aria-pressed','false');
    localSet = series;
    matchConfig = { ...config };
    $('school-coach').hidden = config.lesson === undefined;
    if (config.mode === 'solo') {
      soloSeed = opening ?? crypto.getRandomValues(new Uint32Array(1))[0];
      random = seededRandom(soloSeed);
    }
    audioReady();
    dismiss();
    page = 'match';
    for (const id of ['home', 'online-lobby', 'dispatch-route', 'dispatch-story', 'dispatch-hud', 'dispatch-orders'])
      $(id).hidden = true;
    $('hud').hidden = false;
    document.body.classList.remove('menu-screen', 'adventure-active', 'with-drill-readout');
    drillSide = null;
    drillWaiting = false;
    practiceSide = 'left';
    $('freshness-readout').hidden = $('freshness-controls').hidden = true;
    $('combo-readout').hidden = $('combo-controls').hidden = true;
    $('wave-readout').hidden = $('wave-patterns').hidden = true;
    showDamageControl(false);
    $('damage-control').hidden = false;
    $('edge-status').hidden = $('edge-patterns').hidden = true;
    $('footwork-status').hidden = $('footwork-patterns').hidden = true;
    $('spacing-status').hidden = $('spacing-patterns').hidden = true;
    $('escape-status').hidden = $('escape-patterns').hidden = true;
    $('platform-status').hidden = $('platform-patterns').hidden = true;
    $('launch-status').hidden = $('launch-patterns').hidden = true;
    $('wall-status').hidden = $('wall-patterns').hidden = true;
    $('shield-status').hidden = $('shield-patterns').hidden = true;
    $('air-status').hidden = $('air-patterns').hidden = true;
    $('roll-status').hidden = $('roll-patterns').hidden = true;
    $('climb-status').hidden = $('climb-patterns').hidden = true;
    $('trump-status').hidden = $('trump-patterns').hidden = true;
    $('recovery-tip').hidden = true;
    document.body.classList.add('playing');
    document.body.classList.toggle('training-active', config.mode === 'training');
    $('lobby').hidden = true;
    $('match').hidden = false;
    view = resume?.view || new FightView($('blast-radar'));
    showContactBoxes(false);
    view.shakeEnabled = settings.shake;
    world = resume?.battle || new Battle({...config, rivalRead:series?.openingRead}, (name, e) => {
      world?.lesson?.contact(name,e);
      view.event(name, e);
      sound(name, e);
      if (world?.launchPractice && e.f?.index === 0) launchFeedback(name, e);
      if (world?.meteorPractice && e.f?.index === 0) meteorFeedback(name, e);
      if (world?.survivalPractice && e.f?.index === 0) survivalFeedback(name, e);
      if (world?.stockPractice && e.f?.index === world.stockPractice.slot && name.startsWith('stock'))
        stockFeedback(name, e);
      if (name === 'chaseCue' || name === 'chaseResult') chaseFeedback(name, e);
      if (world?.wallPractice && e.f?.index === 0) wallFeedback(name, e);
      if (name === 'shieldCue' || name === 'shieldResult') shieldFeedback(name, e);
      if (world?.edgePractice && (name === 'edgeCue' || name === 'edgeLand' || name === 'edgeResult' ||
          (world.edgePractice.corner && (name === 'cornerCue' || (name === 'shieldSlip' && e.f.index === 0))) ||
          name === 'edgeOpen' || (world.edgePractice.timeCatch && name === 'ledge' && e.f.index === 1) ||
          ((name === 'teeter' || name === 'edgeCancel') && e.f.index === 0))) edgeFeedback(name, e);
      if (name === 'footworkCue' || name === 'footworkResult') footworkFeedback(e);
      if (name === 'waveContact' || name === 'waveResult') waveFeedback();
      if (world?.spacingPractice && (name === 'spacingContact' || name === 'spacingLand' || name === 'spacingJab' ||
          name === 'spacingCancelStart' || name === 'spacingCancelCue' || name === 'footstoolCue' || name === 'apexCue' ||
          name === 'apexGuard' || name === 'apexParry' || name === 'airPowerCue' ||
          (name === 'fastFall' && e.f.index === 0 && world.spacingPractice.pattern === 'fastfall') ||
          (name === 'footstool' && isFootstoolPractice(world.spacingPractice)) ||
          name === 'spacingResult' || name === 'spacingRetry' || (name === 'specialTurn' && e.f.index === 0 && isReversalPractice(world.spacingPractice))))
        spacingFeedback(name, e);
      if (name === 'escapeCue' || name === 'escapeResult') escapeFeedback(e);
      if (world?.climbPractice && (name === 'climbCue' || name === 'climbResult' ||
          (name === 'ledgeClimbPlant' && world.climbPractice.role !== 'patience' && world.climbPractice.phase === 'active')))
        climbFeedback(name, e);
      if (name === 'platformResult' || name === 'platformClimb' || name === 'platformBlock' ||
          (name === 'platformDrop' && world?.platformPractice && e.f.index === 0) ||
          (name === 'airPlatformPass' && world?.platformPractice?.pattern === 'layers' && e.f.index === 0))
        platformFeedback(name, e);
      if (name === 'airStart' || name === 'airCue' || name === 'airResult') airFeedback(name, e);
      if (world?.rollPractice && e.f?.index === 0 && (name === 'ledgeRoll' || name === 'rollResult'))
        rollFeedback(name, e);
      if (world?.trumpPractice) trumpFeedback(name, e);
      if (name === 'ledgeRollEnd' && drillSide && e.f.index === 0) {
        $('recovery-tip').textContent =
          e.f.kit.ledgeRoll.label + ' finished. You’re facing the ledge. Tap Attack to jab.';
        drillSide = null;
      }
      if (name === 'blastThreat' && !world.survivalPractice) announce(e.f.stats.name + ' near the ' + e.zone + ' blast line');
      if (name === 'ko') announce(e.f.stats.name + ' knocked out');
      if (name === 'ledge' && drillSide && e.f.index === 0)
        $('recovery-tip').textContent =
          'Caught the ' +
          drillSide +
          ' ledge. Tap Attack for ' +
          moves[e.f.kit.ledgeAttack].label +
          ', tap Shield to roll, or press toward the stage to climb.';
      if (name === 'ko' && drillSide && e.f.index === 0) {
        drillSide = null;
        $('recovery-tip').textContent = 'Missed the ledge. Pick a side to try again.';
      }
      if (name === 'win') resultDelay = 0.7;
    }, random);
    if (config.lesson !== undefined) world.lesson = new window.FightSchool.Lesson(config.lesson,world);
    const openingFrames = leadInFrames || (config.mode === 'solo' && config.openingFrames);
    if (openingFrames && !resume && !rehearsal) {
      const opener = new Battle(config, undefined, seededRandom(soloSeed));
      for (let frame = 0; frame < openingFrames; frame++) opener.step(1 / 60, idleInput, idleInput);
      if (config.openingFrames) {
        opener.matchFrames = 0;
        opener.clockFrames = world.clockFrames;
      }
      world.copyFightFrom(opener);
    }
    if (rehearsal) {
      world.copyFightFrom(visit.battle);
      const {cx, cy, zoom, leftFighter} = visit.view;
      Object.assign(view, {cx, cy, zoom, leftFighter});
    }
    $('training-tools').hidden = config.mode !== 'training';
    $('return-fight').hidden = !visit;
    setFrameMode('live');
    $('dummy-damage').value = '0';
    $('damage-output').textContent = '0%';
    const matchName = online.match ? 'Online · You are P' + (online.side + 1) : config.mode === 'solo' ?
      (rehearsal ? 'Practice' : 'Solo') + ' · ' + cpuLevels[world.cpuLevel].name + ' CPU' : modes[config.mode];
    $('match-mode').textContent = world.lesson ? 'Fight School' : matchName + (config.lastStockStart ? ' · Last stock' : '');
    $('match-stage').textContent = arenas[config.stage].name;
    const set = online.series || localSet;
    $('match-set').hidden = !set;
    if (set) {
      $('match-set').textContent = 'Game ' + set.games.length + ' · ' + set.score.join('–');
      $('match-set').setAttribute('aria-label', 'Best of three, game ' + set.games.length + ', P1 ' + set.score[0] + ', P2 ' + set.score[1]);
    }
    $('pause-label').textContent = online.match ? 'Match menu' : 'Pause';
    const position = rehearsal ? visit : resume;
    countdown = position ? position.countdown : world.lesson || config.mode === 'training' || world.suddenDeath || leadInFrames ? 0 : 2.4;
    lastCount = position?.lastCount || 0;
    resultDelay = 0;
    hudKey = '';
    accumulator = 0;
    $('countdown').textContent = position ? position.call : countdown ? '3' : '';
    $('countdown').classList.remove('net-lag');
    clearInput();
    updateHUD();
    view.draw($('game'), world, 0, 0);
    $('game').focus({ preventScroll: true });
    window.scrollTo(0, 0);
    announce(matchName + ' on ' + arenas[config.stage].name);
  }
  function toLobby() {
    leaveOnline();
    localSet = null;
    practiceFight = null;
    page = 'lobby';
    dismiss();
    world = null;
    view = null;
    document.body.classList.remove('playing', 'training-active', 'adventure-active', 'menu-screen');
    for (const id of ['home', 'online-lobby', 'dispatch-route', 'dispatch-story', 'dispatch-hud', 'dispatch-orders'])
      $(id).hidden = true;
    $('lobby').hidden = false;
    $('match').hidden = true;
    $('countdown').textContent = '';
    syncLobby();
    $('start').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function showPause() {
    if (page !== 'match' || !world || world.end !== null) return;
    if (world.lesson) return schoolList();
    if (online.match) {
      showDialog('online-menu', 'Match menu',
        '<p>The online fight is still running.</p><div class="dialog-actions"><button class="primary" data-do="resume">Return to fight</button><button class="utility" data-do="online-leave">Leave match</button></div>');
      document.querySelector('[data-do=resume]').focus();
      return;
    }
    if (world.mode === 'adventure') {
      if (world.finished) return;
      showDialog(
        'pause',
        'Adventure paused',
        '<p>' +
          world.layout.name +
          ' · ' +
          world.objective +
          '</p><div class="dialog-actions"><button class="primary" data-do="resume">Resume</button><button class="utility" data-do="dispatch-retry">Retry</button><button class="utility" data-do="controls">Controls</button><button class="utility" data-do="moves">Move list</button>' + screenAction() + '</div><div class="dialog-actions"><button class="utility" data-do="route">Route map</button><button class="utility" data-do="home">Main menu</button></div>',
      );
      document.querySelector('[data-do=resume]').focus();
      return;
    }
    showDialog(
      'pause',
      'Paused',
      '<div class="dialog-actions"><button class="primary" data-do="resume">' +
        icon('play') +
        'Resume</button><button class="utility" data-do="controls">' +
        icon('keyboard') +
        'Controls</button><button class="utility" data-do="moves">Move list</button>' + screenAction() + '</div>' +
        (['solo','training'].includes(world.mode) ? '<div class="dialog-actions">' +
          (world.mode === 'solo' ? '<button class="utility" data-do="rehearse">' + (practiceFight ? 'Retry position' : 'Practice this position') + '</button>' : '') +
          '<button class="utility" data-do="practice">Find a drill</button>' +
          (practiceFight ? '<button class="utility" data-do="return-fight">Back to fight</button>' : '') + '</div>' : '') +
        cpuReadReport() + '<div class="dialog-actions">' + (world.mode === 'solo' && !localSet && !practiceFight ?
          '<button class="utility" data-do="cpu-level">Replay with another CPU</button>' : '') +
        (practiceFight ? '' : '<button class="utility" data-do="rematch">' + icon('reset') + 'Restart match</button>') +
        '<button class="utility" data-do="lobby">Fighter select</button><button class="utility" data-do="home">Main menu</button></div>',
    );
    document.querySelector('[data-do=resume]').focus();
  }
  function startNextSetGame(stage) {
    if (localSet?.advance(stage)) startMatch({...matchConfig, stage}, undefined, undefined, localSet);
  }
  function showSetResult(result, set, finish, duration) {
    const net = !!online.match;
    if (!net) set.finish(result.end, result.cpuLevel === 'rival' ? result.bot.shieldHabit : null);
    const champion = set.champion, picker = set.picker;
    const name = i => labelFor(i) + ' ' + result.dogs[i].stats.name;
    const title = champion === null ? 'Game ' + set.games.length + ' result' : 'Set complete';
    const history = set.games.map((g,i) => '<li><span>' + (i+1) + ' · ' + arenas[g.stage].name +
      '</span><strong>' + name(g.winner) + '</strong></li>').join('');
    let action, text, next = '';
    if (champion !== null) {
      action = net ? 'online-rematch' : 'new-set';
      text = 'Play another set';
    } else if (!net && world.mode === 'solo' && picker === 1) {
      const stage = set.cpuPick(result.dogs[1].kind);
      next = '<p>' + name(1) + ' picks ' + arenas[stage].name + '. ' + arenas[stage].description + '</p>';
      action = 'cpu-counterpick';
      text = 'Play game ' + (set.games.length+1);
    } else {
      next = '<p>' + name(picker) + ' picks the next arena.</p>';
      const chooses = !net || online.side === picker;
      action = chooses ? 'set-pick' : 'online-rematch';
      text = chooses ? 'Pick arena' : 'Ready for game ' + (set.games.length+1);
    }
    const winner = champion ?? result.end;
    showDialog(net ? 'online-result' : 'result', title,
      '<div class="winner"><img alt="" src="' + portrait(result.dogs[winner].kind) + '"><div><h3>' + name(winner) +
      (champion === null ? ' wins game ' + set.games.length : ' wins the set') + '</h3><p>' + finish + ' · ' + duration +
      '</p></div></div><h3 id="set-score">Set score · P1 ' + set.score[0] + ' – ' + set.score[1] + ' ' +
      (world.mode === 'solo' ? 'CPU' : 'P2') + '</h3><ol class="set-history" aria-label="Game winners">' + history +
      '</ol>' + next + (net ? '<p id="net-rematch-status" role="status"></p>' : cpuReadReport()) +
      '<div class="dialog-actions"><button class="primary" data-set-next data-do="' + action + '">' + text +
      '</button><button class="utility" data-do="' + (net ? 'online-leave">Online lobby' : 'lobby">Fighter select') +
      '</button></div>', false);
    if (net) updateVotes();
    document.querySelector('[data-set-next]:not(:disabled), [data-do=online-leave]')?.focus();
    announce(title + '. ' + name(winner) + ' wins. Set score ' + set.score.join(' to '));
  }
  function showResult() {
    const result = online.match?.confirmedWorld || world;
    const f = result.dogs[result.end], elapsed = Math.floor(result.matchFrames / 60);
    const duration = Math.floor(elapsed / 60) + 'm ' + String(elapsed % 60).padStart(2, '0') + 's';
    const finish = result.endReason === 'time' ? 'Time expired · ' + result.dogs.map(d=>d.stocks).join('–') + ' stocks (P1–P2)' :
      result.endReason === 'sudden' ? 'Sudden Death KO' : stockLabel(f.stocks);
    if (practiceFight && world.mode === 'solo') {
      showDialog('result', 'Practice finished', '<p>' + f.stats.name + ' wins this attempt. Your fight is paused.</p>' +
        '<div class="dialog-actions"><button class="primary" data-do="rehearse">Retry position</button>' +
        '<button class="utility" data-do="return-fight">Back to fight</button></div>', false);
      document.querySelector('[data-do=rehearse]').focus();
      return;
    }
    const set = online.series || localSet;
    if (set) return showSetResult(result, set, finish, duration);
    if (online.match) {
      const title = result.end === online.side ? 'You win!' : 'Opponent wins';
      showDialog('online-result', title,
        '<div class="winner"><img alt="" src="' + portrait(f.kind) + '"><div><h3>' + f.stats.name +
        ' wins!</h3><p>' + finish + ' · ' + duration + '</p></div></div><p id="net-rematch-status" role="status"></p>' +
        '<div class="dialog-actions"><button class="primary" data-do="online-rematch">Rematch</button><button class="utility" data-do="online-leave">Online lobby</button></div>', false);
      updateVotes();
      document.querySelector('[data-do=online-rematch]').focus();
      announce(title);
      return;
    }
    showDialog(
      'result',
      'Match result',
      '<div class="winner"><img alt="" src="' +
        portrait(f.kind) +
        '"><div><span class="mode-label">' +
        labelFor(f.index) +
        '</span><h3 style="margin-top:9px">' +
        f.stats.name +
        ' wins!</h3><p>' +
        finish + ' · ' +
        duration +
        '</p></div></div>' + cpuReadReport() + '<div class="dialog-actions"><button class="primary" data-do="rematch">' +
        icon('reset') +
        'Rematch</button><button class="utility" data-do="lobby">Fighter select</button><button class="utility" data-do="home">Main menu</button></div>',
      false,
    );
    announce(f.stats.name + ' wins the Golden Tennis Ball');
    document.querySelector('[data-do=rematch]').focus();
  }
  $('start').onclick = () => startMatch(settings, undefined, undefined,
    settings.mode !== 'training' && settings.bestOfThree ? new StockSet(settings.stage) : null);
  $('pause').onclick = showPause;
  $('dialog-body').addEventListener('click', (e) => {
    const format = e.target.closest('[data-format]');
    if (format) {
      settings.bestOfThree = format.dataset.format === 'set';
      save(); dismiss(); syncLobby();
      $('rules-label').focus({preventScroll:true});
      return;
    }
    const rule = e.target.closest('[data-minutes]');
    if (rule && stockMinutes.includes(Number(rule.dataset.minutes))) {
      settings.minutes = Number(rule.dataset.minutes);
      save(); dismiss(); syncLobby();
      $('rules-label').focus({preventScroll:true});
      return;
    }
    if (e.target.closest('[data-do="sudden-start"]')) {
      startMatch({ ...settings, suddenStart:true });
      return;
    }
    if (e.target.closest('[data-do="last-stock-start"]')) {
      startMatch({ ...settings, lastStockStart:true });
      return;
    }
    const choice = e.target.closest('[data-cpu]')?.dataset.cpu;
    if (choice && Object.hasOwn(cpuLevels, choice)) {
      settings.cpuLevel = choice;
      save();
      if (page === 'match') startMatch({ ...matchConfig, cpuLevel:choice }, undefined, soloSeed);
      else {
        dismiss();
        syncLobby();
        $('cpu-level').focus({preventScroll:true});
      }
      return;
    }
    const reel = e.target.closest('[data-reel]');
    if (reel && !reel.disabled) {
      audioReady();
      const key = reel.dataset.reel;
      story(key, () => {
        showRoute();
        showReels(key);
      }, true);
      return;
    }
    const guide = e.target.closest('[data-guide-kind]');
    if (guide) {
      const kind = guide.dataset.guideKind;
      showMoves(kind, document.querySelector('[data-guide-section][aria-pressed=true]').dataset.guideSection);
      document.querySelector('[data-guide-kind="' + kind + '"]').focus({ preventScroll: true });
      return;
    }
    const section = e.target.closest('[data-guide-section]');
    if (section) {
      const key = section.dataset.guideSection;
      showMoves(document.querySelector('[data-guide-kind][aria-pressed=true]').dataset.guideKind, key);
      document.querySelector('[data-guide-section="' + key + '"]').focus({ preventScroll: true });
      return;
    }
    const stage = e.target.closest('[data-stage]');
    if (stage) {
      if (dialogType === 'set-pick') {
        if (online.series) {
          showResult();
          online.rematch(stage.dataset.stage);
        } else startNextSetGame(stage.dataset.stage);
        return;
      }
      settings.stage = stage.dataset.stage;
      save();
      syncLobby();
      sound('menu');
      dismiss();
      return;
    }
    const action = e.target.closest('[data-do]')?.dataset.do;
    if (action==='bindings') openLayouts(dialogType);
    if (action === 'practice') showPractice();
    if (action === 'rehearse') rehearsePosition();
    if (action === 'return-fight') returnToFight();
    if (action === 'set-pick') chooseArena(true);
    if (action === 'cpu-counterpick') startNextSetGame(localSet.cpuPick(world.dogs[1].kind));
    if (action === 'new-set') {
      const stage = localSet.games[0].stage;
      startMatch({...matchConfig, stage}, undefined, undefined, new StockSet(stage));
    }
    if (action === 'online-rematch') online.rematch();
    if (action === 'online-leave') showOnline();
    if (action === 'fullscreen') toggleFullscreen();
    if (action === 'home') showHome();
    if (action === 'route') showRoute();
    if (action === 'dispatch-retry') beginRun(world.roomIndex, world.checkpoint, world.atCheckpoint);
    if (action === 'dispatch-rematch') beginRun(world.roomIndex, 0);
    if (['option-sound', 'option-shake', 'option-tiltStick','option-flickJump1','option-flickJump2','option-quickAttack1','option-quickAttack2'].includes(action)) {
      const key = action.slice('option-'.length);
      settings[key] = !settings[key];
      if (key === 'flickJump1' || key === 'flickJump2') flickJumpStates[key === 'flickJump1' ? 0 : 1] = {};
      save();
      updateAudio();
      audioReady();
      sound('menu');
      showOptions();
      document.querySelector('[data-do="' + action + '"]').focus();
    }
    if (action === 'resume' || action === 'close') exitDialog();
    if (action === 'lobby') toLobby();
    if (action === 'cpu-level') showCpuLevels();
    if (action === 'shield-read-match') startShieldReadMatch();
    if (action === 'cut-off-clover') startCloverApproach();
    if (action === 'shield-read-set') startShieldReadMatch(true);
    if (action === 'rematch') startMatch(matchConfig, undefined, soloSeed, localSet);
    if (action === 'controls') showControls();
    if (action === 'moves') showMoves(world?.dogs[world.trainingPlayerSlot].kind || settings.p1);
  });
  function showDamageControl(counter, fineStep = false, before, partner = false) {
    const control = $('damage-control'), next = $(before || (counter ? 'escape-break' : 'reset-training'));
    if (control.nextElementSibling !== next) next.before(control);
    const label = counter ? 'Your starting damage' : partner ? 'P2 starting damage' : 'Dummy damage';
    $('damage-label').textContent = label;
    $('dummy-damage').setAttribute('aria-label', label);
    $('dummy-damage').step = counter || fineStep ? '1' : '5';
  }
  $('dummy-damage').addEventListener('input', (e) => {
    if (!world) return;
    const d = world.escapePractice;
    if (world.edgePractice?.timeCatch) {
      world.setDummyDamage(e.target.value);
      drill('edge', false, world.edgePractice.pattern);
      e.target.focus({ preventScroll: true });
      return;
    } else if (world.comboPractice) {
      const d = world.comboPractice;
      world.setDummyDamage(e.target.value);
      drill('combo', false, d.source === 'record' && d.tape.length ? 'replay' : d.source, d.reply);
      e.target.focus({ preventScroll: true });
      return;
    } else if (world.survivalPractice) {
      const s = world.survivalPractice;
      world.resetSurvivalPractice(s.dir, s.slow, Number(e.target.value));
      survivalFeedback('survivalReady', {});
      $('damage-output').textContent = world.survivalPractice.baseline + '%';
    } else if (world.meteorPractice) {
      const m = world.meteorPractice;
      world.resetMeteorPractice(m.pattern, m.dir, m.slow, Number(e.target.value));
      meteorFeedback('meteorReady', {});
      $('damage-output').textContent = world.meteorPractice.baseline + '%';
    } else if (d?.gripDrill) {
      if (d.spacing === 'gripThrow') world.setDummyDamage(e.target.value);
      world.resetEscapePractice(d.spacing, d.slow, Number(e.target.value));
      escapeFeedback({phase:'ready'});
      $('damage-output').textContent = e.target.value + '%';
    } else if (d?.spacing === 'counter') {
      world.resetEscapePractice('counter', d.slow, Number(e.target.value));
      $('recovery-tip').textContent = crouchCounterPrompt();
      $('damage-output').textContent = world.escapePractice.baseline + '%';
    } else {
      world.setDummyDamage(e.target.value);
      $('damage-output').textContent = world.trainingDamage + '%';
    }
    hudKey = '';
    updateHUD();
  });
  let drillSide = null,
    drillWaiting = false,
    practiceSide = 'left';
  function reversalTip(d) {
    const back = d.dir > 0 ? 'left' : 'right', forward = d.dir > 0 ? 'right' : 'left';
    return d.pattern === 'reverse' ? 'Drifting ' + forward + ', rival behind. Tap Special with no direction, then flick ' + back +
      ' to reverse into them. On a retry, flick and release ' + back + ' before Special to hit while drifting away.' :
      'Rival ahead. Flick ' + back + ', release, tap Special, then immediately flick ' + forward +
      ' and release. ' + (d.guard && world.dogs[0].kind !== 'brisket' ? 'Land beyond the shield grab.' :
        d.guard ? 'Catch the shield with Collar Toss while sliding back.' : 'Hit the rival while sliding back past the chalk.');
  }
  function spacingFeedback(name, e) {
    const practice = world.spacingPractice, status = $('spacing-status');
    if (practice.pattern === 'airPower') {
      if (name === 'spacingRetry') {
        status.dataset.result = 'ready';
        status.textContent = 'Watch the chalk';
        $('recovery-tip').textContent = 'Tap Attack as your paws reach the chalk on the way down.';
        return;
      }
      if (name === 'airPowerCue') {
        status.dataset.result = 'swing';
        status.textContent = 'Tap Attack';
        return;
      }
      if (name !== 'spacingResult') return;
      const summarize = r => (r.short ? 'Short hop' : 'Full jump') + ' · ' + r.hits +
        (r.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(r.damage) + '% · ready on frame ' + r.frames;
      status.dataset.result = e.outcome;
      status.textContent = practice.result ? summarize(practice.result) : e.outcome === 'other' ? 'Different move' : 'Missed';
      $('recovery-tip').textContent = (practice.previous ? 'Last time you got ' + summarize(practice.previous) + '. ' : '') +
        (practice.result ? 'Press Hop or Jump again to compare.' :
          'Press Hop or Jump to retry. Keep the stick centered and tap Attack as your paws reach the chalk on the way down.');
      return;
    }
    if (practice.pattern === 'fastfall') {
      const tip = $('recovery-tip');
      if (name === 'apexCue') {
        status.dataset.result = 'apex';
        status.textContent = practice.pauseAtApex ? 'Apex · choose your descent' : 'Apex · flick Down';
        tip.textContent = 'Hold Shield alone to float. For a fast-fall, tap Down here and hold Shield through Pip’s reply.';
      } else if (name === 'fastFall') {
        status.dataset.result = 'drop';
        status.textContent = 'Fast-fall · hold Shield';
      } else if (name === 'apexGuard' || name === 'apexParry') {
        status.dataset.result = name;
        status.textContent = name === 'apexGuard' ? 'Guard up' : 'Parry · Up + Attack';
      } else if (e.outcome) {
        status.dataset.result = e.outcome;
        status.textContent = {blocked:'Blocked Scramble',clipped:'Hit by Scramble',miss:'Missed the shield',clear:'Cleared the counter',
          parried:'Parried Scramble',punish:'Parry into ' + (moves[practice.punish]?.label || 'punish')}[e.outcome];
        if (practice.attackerReady != null) status.textContent += ' · grounded and ready +' + practice.attackerReady + 'f';
        else if (e.outcome === 'clipped' && practice.landing === null) status.textContent += ' · still airborne';
        tip.textContent = (practice.defenderReady != null ? 'Pip could jump on frame +' + practice.defenderReady + ' after the block. ' : '') +
          (e.outcome === 'blocked' && world.dogs[0].kind !== 'clover' ?
            'Retry and release Shield at Guard up. Tap Up + Attack on the parry.' :
            'Choose Fast-fall pressure to retry. Turn off Pause at apex to practice the timing.');
      }
      return;
    }
    if (isSweetPractice(practice)) {
      if (!e.outcome) return;
      status.dataset.result = e.outcome;
      const show = r => r.label + ' · ' + r.damage + '% · ' + r.angle + '° · ' + r.speed + ' px/s';
      status.textContent = e.outcome === 'miss' ? 'Missed the rival' : e.outcome === 'other' ?
        'Different move · ' + (moves[practice.contact]?.label || 'hit') : show(practice.result);
      const tip = e.outcome === 'miss' || e.outcome === 'other' ? 'Choose Aerial sweet spots to retry the same spacing.' :
        'Choose Line up sweet spot to compare the same swing at the other spacing.';
      $('recovery-tip').textContent = (practice.previous ? 'Previous hit · ' + show(practice.previous) + '. ' : '') + tip;
      return;
    }
    if (isFootstoolPractice(practice)) {
      const rescue = practice.pattern === 'footstool';
      status.dataset.result = e.outcome || name;
      status.textContent = {
        footstoolCue:'Jump off their head', footstool:rescue ? 'Footstool · steer in' : 'Footstooled · tech the landing',
        saved:'Back onstage · footstool rescue', fell:'Missed the ledge', otherSave:'Recovered without a footstool',
        tech:'Teched in place', techRoll:'Tech roll', downed:'Missed tech', evaded:'Avoided the footstool', landed:'Landed',
      }[e.outcome || name];
      if (e.outcome) $('recovery-tip').textContent = rescue ?
        'Retry from the same height. Hold Jump through the bounce for more lift and steer toward the ledge.' :
        'Retry and tap Shield just before you land. Add left or right to roll through the landing.';
      return;
    }
    if (practice.pattern === 'cancel') {
      const tip = $('recovery-tip'), counter = moves[world.dogs[1].kit.tilts.down].label;
      status.dataset.result = e.outcome || name;
      if (name === 'spacingRetry') {
        status.textContent = 'Down + Attack';
        tip.textContent = 'Press Down + Attack to fall again. Start holding Shield when the chalk turns mint.';
      } else if (name === 'spacingCancelStart') {
        status.textContent = moves[world.dogs[0].kit.air.down].label;
        tip.textContent = practice.previousFrames === undefined ? 'Watch for ' + counter + ' as your paws touch down.' :
          'Watch the chalk beneath your paws. Press and hold Shield as it rises.';
      } else if (name === 'spacingCancelCue') {
        status.textContent = 'Hold Shield now';
        tip.textContent = 'Keep Shield held through ' + counter + ' to block it.';
      }
      else if (name === 'spacingLand' && practice.frames !== undefined) {
        status.textContent = (practice.canceled ? 'Canceled' : 'Landed') + ' · ' + practice.frames + ' frames';
      } else if (e.outcome) {
        const label = { blocked: 'Blocked ' + counter, parried: 'Parried ' + counter, caught: 'Caught by ' + counter,
          interrupt: (moves[practice.reply]?.label || 'Counter') + ' · ' + practice.damage + '%',
          other: 'Different aerial', miss: 'Left the mark' };
        status.textContent = label[e.outcome];
        const recovery = practice.frames === undefined ? '' : 'Landing recovery took ' + practice.frames + ' frames. ';
        const advice = e.outcome === 'caught' ? (practice.canceled ? 'Keep Shield held through the counter. ' :
          practice.lead > 7 ? 'Shield came ' + practice.lead + ' frames before touchdown. Wait for the mint chalk. ' :
          'Press Shield just before touchdown and keep it held. ') :
          practice.previousFrames !== undefined ? 'Your previous landing took ' + practice.previousFrames + '. ' : '';
        const counterTip = e.outcome === 'blocked' && world.dogs[0].kind === 'brisket'
          ? 'Try releasing Shield and tapping ' + (practice.dir > 0 ? 'Right' : 'Left') + ' + Attack on landing for Gate Check. ' : '';
        tip.textContent = recovery + advice + counterTip + 'Tap Attack to retry.';
      }
      return;
    }
    if (isReversalPractice(practice)) {
      const labels = { bReverse: 'B-reverse', turnaround: 'Turnaround', wavebounce: 'Wavebounce', straight: 'Straight cast',
        miss: 'Missed the rival', short: 'Landed near the mark', other: 'Different move', away: 'Left the setup',
        caught: 'Shield grab caught you', intercept: 'Grab interrupted', guarded: 'Rival held shield' };
      const tip = $('recovery-tip');
      status.dataset.result = e.outcome || name;
      if (name === 'spacingRetry') {
        status.textContent = practice.pattern === 'reverse' ? 'Rival behind' : 'Rival ahead';
        tip.textContent = reversalTip(practice);
      } else if (e.outcome) {
        const result = practice.blocked && practice.grabLive && e.outcome !== 'caught' ? ' · grab missed' :
          practice.damage ? ' · ' + practice.damage + '%' : '';
        status.textContent = labels[e.outcome] + result;
        const traveled = Math.round((practice.landingX - practice.originX) * practice.dir);
        const route = Number.isFinite(traveled) ? 'Landed ' + Math.abs(traveled) + ' px ' + (traveled < 0 ? 'back' : 'ahead') + ' of the chalk.' : '';
        const advice = e.outcome === 'caught' ? 'Try the same cast with a wavebounce to land outside the grab.' :
          e.outcome === 'other' ? 'Center the direction when you press Special.' :
          e.outcome === 'miss' ? 'Aim toward the rival as your move comes out.' : route;
        tip.textContent = advice + ' Tap Attack to retry.';
      } else if (name === 'specialTurn') status.textContent = labels[e.turn];
      else if (name === 'spacingContact') status.textContent = practice.blocked ? 'Shield contact' : specials[practice.contact].label + ' · ' + practice.damage + '%';
      return;
    }
    if (practice.pattern === 'landing') {
      const labels = { clean: 'Clean hit · ' + practice.damage + '%', string: 'True combo · ' + world.lastCombo.damage + '%',
        gap: 'Gap before the jab', guarded: (practice.timing === 'clean' ? 'Clean hit' : 'Late hit') + ' · jab shielded',
        escaped: 'Rival escaped', miss: 'Missed the aerial',
        jumpOnly: 'Jump measured', other: 'Different attack', away: 'Left the setup' };
      status.dataset.result = e.outcome || name;
      if (!e.outcome) {
        status.textContent = name === 'spacingJab' ? 'Tap Attack for jab' :
          name === 'spacingLand' ? 'Landed · center the stick' : (practice.timing === 'clean' ? 'Clean hit' : 'Late hit') + ' · ' + practice.damage + '%';
        return;
      }
      status.textContent = labels[e.outcome];
      const tips = { clean: 'The leading hit connected. To try the late hit, swing earlier at the gold fork.',
        string: moves[world.dogs[0].kit.air.forward].label + ' into ' + moves[world.dogs[0].kit.ground[0]].label +
          ' connected before the rival could act. Try the green stripe for the clean hit.',
        guarded: practice.timing === 'clean' ? 'The clean hit gave the rival time to shield your jab. Swing at the gold fork to try the follow-through.' :
          'The rival raised Shield before your jab. Tap Attack as the landing cue appears.',
        gap: 'Both hits landed. The rival had time to act between them.',
        escaped: 'The rival recovered. Release the direction on landing and tap Attack at the jab cue.',
        miss: 'Hold toward the rival for the whole short hop. Tap Attack over either floor mark.',
        jumpOnly: 'Try the other jump height, or hold toward the rival and swing at the gold fork.',
        other: 'Aim forward for the aerial, then center the direction for your jab.',
        away: 'Stay on this stretch of floor for the landing.' };
      $('recovery-tip').textContent = tips[e.outcome] + ' Choose Landing hits to retry.';
      return;
    }
    if (name === 'spacingContact') {
      status.dataset.result = 'contact';
      status.textContent = moves[e.moveId].label + ' hit shield';
    } else if (name === 'spacingLand') {
      status.dataset.result = 'landing';
      status.textContent = 'Landed · watch the grab';
    } else {
      const outcome = e.outcome;
      status.dataset.result = outcome;
      status.textContent = { crossed: 'Landed behind', spaced: 'Outside the grab', caught: 'Grabbed',
        miss: 'Shield untouched', other: 'Different aerial', close: 'Check your landing', away: 'Left the setup' }[outcome];
      const tip = { crossed: 'You tagged the shield and passed the waiting grab.', spaced: 'Your back air touched the shield as you drifted out of reach.',
        caught: 'The grab reached you. Keep moving through the landing.', miss: 'Swing toward the shield during takeoff.',
        other: 'Your back air strikes behind your facing.', close: practice.pattern === 'approach'
          ? 'Turn during the running jump, then carry your back air past the guard.' : 'Keep drifting away after your hit.',
        away: 'Use a short hop to keep the fight on this stretch of floor.' }[outcome];
      $('recovery-tip').textContent = tip + ' Choose ' + (practice.pattern === 'approach' ? 'Approach' : 'Retreat') + ' to retry.';
    }
  }
  function ledgeTrapCounterTip(f) {
    if (f.kind === 'brisket' || f.kind === 'noodle')
      return 'Stay below the fist until it extends, then tap Attack for ' + moves[f.kit.ledgeAttack].label + '.';
    return 'As the punch comes forward, tap Shield to roll. Aim inward and tap Attack as your paws land.';
  }
  function climbFeedback(name, e) {
    const drill = world.climbPractice, status = $('climb-status'), trap = drill.role === 'trap';
    if (drill.role === 'patience') {
      const outcome = e.outcome || e.phase;
      const [label, tip] = {
        start:['Brisket is charging', 'Stay on the ledge and watch his front paw.'],
        swing:['Haymaker released', ledgeTrapCounterTip(world.dogs[0])],
        opening:['Punch missed', world.dogs[0].ledge ? 'Tap Attack from the lip or roll in while Brisket recovers.' :
          'Brisket is recovering. Aim toward him and tap Attack.'],
        punched:['Caught by Haymaker', 'Hold the lip through the charge. An early climb gives Brisket a target.'],
        punished:['Whiff punished', 'Your hit caught Brisket before he recovered.'],
        grabbed:['Grab punish', 'Your grab caught Brisket after the swing.'],
        interrupted:['Beat the punch', 'You reached Brisket first. Try waiting for his swing.'],
        blockedPunch:['Haymaker blocked', 'Your shield took the blow. Try rolling through the swing.'],
        parriedPunch:['Haymaker parried', 'You released Shield just before the punch landed.'],
        guardedReply:['Brisket blocked', 'Roll a little earlier to leave more time for your counter.'],
        escaped:['Back onstage', 'You got past the punch with your stock intact.'],
        slipped:['Lost your grip', 'Leave before the last amber mark disappears.'],
        fell:['Missed the return', 'Try Shield while hanging to roll onto the stage.'],
      }[outcome];
      status.dataset.result = outcome;
      status.textContent = label;
      $('recovery-tip').textContent = tip + (e.outcome ? ' Choose Wait out Haymaker to retry.' : '');
      return;
    }
    if (drill.route) {
      const cover = drill.role === 'coverRise', inward = drill.route.dir > 0 ? 'right' : 'left';
      const outcome = e.outcome || e.phase;
      const label = {
        start:cover ? 'Watch the lip' : 'At the ledge', release:cover ? 'Paws released' : 'Jump back in',
        rise:cover ? 'Rival rising' : 'Aim ' + inward + ' + Attack',
        strike:(moves[e.moveId]?.label || 'Aerial') + ' connected',
        landedHit:(moves[drill.contact]?.label || 'Aerial') + ' · back onstage',
        landedClear:'Back onstage', regrab:'Caught the ledge again', fell:'Below the ledge',
        otherExit:'Used a get-up option', intercepted:cover ? 'Return intercepted' : 'Guard caught the return',
        blockedRise:'Rising aerial blocked', parriedRise:'Rising aerial parried', hitByRise:'Caught by the rising aerial',
      };
      status.dataset.result = outcome;
      status.textContent = label[outcome];
      const tip = $('recovery-tip');
      if (outcome === 'strike') tip.textContent = 'Keep drifting ' + inward + ' and land onstage.';
      else if (e.outcome) tip.textContent = cover ? 'Choose Cover the return to retry. Hold Shield through the swing, or release just before it hits.' :
        outcome === 'landedHit' ? 'Choose Cover the return to defend against the same route.' :
        'Choose Attack from below to retry. Tap Down + Jump, release Down, then hold ' + inward + ' and tap Attack.';
      return;
    }
    const labels = {
      start: trap ? 'Watch the ledge' : 'Climbing', plant: trap ? 'Paws down · jab' : 'Hold Shield',
      guarded: 'Jab blocked', caught: 'Caught standing', timed: 'Climb caught',
      late: 'Jab shielded', early: 'Swung early', missed: 'Swing missed', waited: 'Rival guarded', other: 'Different option',
    };
    const outcome = e.outcome || (name === 'ledgeClimbPlant' ? 'plant' : 'start');
    status.dataset.result = outcome;
    status.textContent = labels[outcome];
    if (name !== 'climbResult') return;
    const tips = {
      guarded: 'Your shield was up on the first free frame.', caught: 'Hold Shield once the climb starts. The jab arrives as you can first act.',
      timed: 'Your jab reached the rival in the opening before shield.', late: 'The rival was already shielding. Jab closer to the paw plant.',
      early: 'Your jab ended before the opening. Wait for the feet to come over the lip.',
      missed: 'The jab missed. Stay within reach of the spot where the rival stands.',
      waited: 'Jab as the paws touch down.', other: 'Try the short inward climb for this setup.',
    };
    $('recovery-tip').textContent = tips[outcome] + ' Choose ' + (trap ? 'Set the trap' : 'Get up') + ' to retry.';
  }
  function platformFeedback(name, e) {
    const label = moves[e.moveId]?.label;
    const below = world.platformPractice.pattern === 'below';
    const status = $('platform-status'), tip = $('recovery-tip');
    if (world.platformPractice.pattern === 'layers') {
      const drill = world.platformPractice;
      if (name === 'platformDrop' || (drill.phase === 'done' && name !== 'platformResult')) return;
      const feedback = {
        apex:['At the apex','Tap Down and release to land on top. Hold it to pass through.'],
        belowTop:['Through the top','Release Down to land on the side perch. Hold it to go through both.'],
        fall:['Through both perches',world.dogs[0].kind === 'brisket' ? 'Keep Down held and tap Attack for Belly Drop.' : 'Release Down and tap Attack to catch the rival on the deck.'],
        top:['Top perch','Next time hold Down from the apex until your paws clear the top.'],
        wing:['Side perch','You passed the top and caught the next perch. Keep Down held longer to reach the deck.'],
        deck:['Landed on the deck','Try an aerial as soon as you clear the side perch.'],
        aerial:[label + ' hit the rival','You passed both perches and attacked on the way down.'],
        other:['Hit from another angle','Try a falling aerial after passing both perches.'],
        missed:['Left the perches','Jump straight up from the chalk to try all three landings.'],
      }[e.outcome || drill.phase];
      if (feedback) {
        status.dataset.result = e.outcome || drill.phase;
        status.textContent = feedback[0];
        tip.textContent = feedback[1] + (e.outcome ? ' Choose Pick your landing to retry.' : '');
      }
      return;
    }
    if (world.platformPractice.pattern === 'shield-drop') {
      if (name === 'platformBlock') {
        status.dataset.result = 'guarded';
        status.textContent = 'Blocked ' + label;
        tip.textContent = 'Keep Shield held. Flick a lower diagonal and tap Attack.';
      } else if (name === 'platformDrop') {
        if (world.platformPractice.phase !== 'done') status.textContent = 'Through the platform';
      } else {
        const feedback = {
          counter: [label + ' caught the rival', 'Your aerial reached them before they could shield.'],
          intercept: [label + ' interrupted the jump', 'You reached them first. For the shield-drop counter, let their up air touch your shield.'],
          parried: ['Parried the rising aerial', 'You timed the shield release. Try holding Shield through the hit and dropping at the spark.'],
          guardedReply: ['Rival blocked ' + label, 'They got their shield up on landing. Start your drop at the block spark.'],
          held: ['Held the platform', 'You blocked the hit. Try dropping through at the spark to catch their landing.'],
          early: ['Left before the counter', 'Raise Shield, wait for the block spark, then flick down-left or down-right.'],
          tagged: [label + ' hit you', 'Hold Shield for the rising swing.'],
          landed: ['Landed below', 'Tap Attack with the diagonal or swing on the way down.'],
          missed: ['Opening passed', 'Keep Shield held and watch the rival rise from below.'],
        }[e.outcome];
        status.dataset.result = e.outcome;
        status.textContent = feedback[0];
        tip.textContent = feedback[1] + ' Choose Shield drop to retry.';
      }
      return;
    }
    if (world.platformPractice.defend) {
      const ferry = world.platformPractice.pattern === 'ferry';
      if (name === 'platformDrop') return;
      if (name === 'platformClimb') {
        status.textContent = ferry ? 'Watch their takeoff' : world.platformPractice.phase === 'wing' ? 'Rival on the right wing' : 'Watch the right wing';
        status.dataset.result = 'approach';
        return;
      }
      const feedback = {
        intercept: [label + ' caught the jump', ferry ? 'You hit the challenger before they boarded.' : 'You kept the high platform.'],
        guarded: ['Blocked ' + label, 'You shielded the rising aerial. Try meeting the next jump with an attack.'],
        parried: ['Parried the approach', 'Your shield release caught the incoming aerial.'],
        tagged: [label + ' got through', 'Their up air reaches through the floor. Shield or strike as they rise.'],
        claimed: [ferry ? 'Rival boarded' : 'Rival took the top', ferry ? 'Meet the jump on the approaching side of the ferry.' : 'Cover the right edge before the challenger lands.'],
        vacated: [ferry ? 'Back on the gate' : 'Left the high platform', ferry ? 'Time your drop to meet the rising dog.' : 'Meet the last jump from above the right wing.'],
        low: ['Caught the first jump', 'Let the rival reach the wing, then catch the jump toward the top.'],
      }[e.outcome];
      status.dataset.result = e.outcome;
      status.textContent = feedback[0];
      tip.textContent = feedback[1] + (ferry ? ' Choose Defend the ferry to retry.' : ' Choose Hold the top to retry.');
      return;
    }
    if (name === 'platformDrop') {
      status.textContent = 'Through the platform';
      status.dataset.result = 'fall';
      if (below) tip.textContent = 'Aim down and tap Attack while the other dog is still below you.';
      return;
    }
    status.dataset.result = e.outcome;
    status.textContent = {
      aerial: label + ' hit', tilt: label + ' hit', landed: 'Landed', left: 'Left the platform',
      stayed: 'Swing missed', other: 'Different hit',
    }[e.outcome];
    const result = {
      aerial: 'You caught the rival before your paws touched down.',
      tilt: 'You landed your low tilt and kept the platform.',
      landed: 'You passed through cleanly. Start your aerial a little earlier.',
      left: below ? 'Flick Down from the platform to set up the falling attack.' : 'Press Down and Attack together to stay on top.',
      stayed: below ? 'Your swing came out on top. Drop first, then attack below the platform.' : 'Stay within paw’s reach and tap Down + Attack.',
      other: below ? 'Try catching the rival with an aerial on the way down.' : 'Use your down tilt while both dogs are on the platform.',
    }[e.outcome];
    tip.textContent = result + ' Choose ' + (below ? 'Rival below' : 'Rival on top') + ' to retry.';
  }
  function grappleControls(match,grip) {
    if (grip.carry) return 'Move or jump · Aim + Grab to throw';
    const basic = 'Tap Attack to pummel · Aim to throw';
    return match.dogs[grip.owner].kit.shoulderCarry ? basic + ' · Special to carry' : basic;
  }
  function crouchCounterPrompt() {
    const player = world.dogs[0];
    $('escape-status').dataset.result = 'ready';
    $('escape-status').textContent = 'Stamp Kick · ' + player.damage + '% start';
    return 'Tap Attack to cue Pip. Hold Down before the kick. Tap Attack at the spark for ' + moves[player.kit.tilts.down].label + '.';
  }
  function escapeFeedback(e) {
    const status = $('escape-status'), tip = $('recovery-tip');
    status.dataset.result = e.outcome || e.phase;
    const drill = world.escapePractice;
    if (drill.spacing === 'carry') {
      const release = (throws[drill.moveId]?.label || 'Throw') + ' · ' + (drill.distance || 0) + ' units carried';
      const feedback = {
        ready:['Pip at 85%','Tap Grab. Throw right from here, then try again with a shoulder carry.'],
        approach:['Bear Hug','When the grab connects, tap Special to lift Pip.'],
        gripped:['Lift or throw','Tap Right for an immediate throw. For a carry, tap Special and walk right to the gold stripe.'],
        carrying:['Pip on your shoulder','Hold Right. Tap Grab at the stripe to throw before Pip wriggles free.'],
        atMark:['At the stripe','Keep holding Right and tap Grab for Yard Heave.'],
        flight:[release,'Watch whether Pip can dodge back to the roof.'],
        returned:['Pip got back · ' + release,'Try carrying nearer the stripe before you throw.'],
        ringOut:['Ring-out · ' + release,'Retry with an immediate throw to compare Pip’s return.'],
        brokeFree:['Pip wriggled free','Watch the grip meter. Throw while there is still time.'],
        fell:['Lost your footing','Throw before you fall past the car.'],
        pummel:['Bear Squeeze','The hold timer keeps running. Tap Special to hoist or choose your throw.'],
        missedGrab:['Grab missed','Choose Shoulder carry and tap Grab from the starting mark.'],
        wrongGrip:['Pip got the grab','Choose Shoulder carry to reset.'],
      };
      [status.textContent,tip.textContent] = feedback[e.outcome || e.phase];
      return;
    }
    if (drill.gripDrill) {
      const holder = drill.spacing === 'gripThrow', captive = world.dogs[holder ? 1 : 0].stats.name;
      const throwName = throws[drill.moveId]?.label || 'Throw';
      const counts = (drill.pummels || 0) + ' pummel' + (drill.pummels === 1 ? '' : 's') + ' · ' +
        (drill.struggles || 0) + ' escape input' + (drill.struggles === 1 ? '' : 's');
      const feedback = {
        ready: holder ? ['Tap Grab', 'Catch the rival. Try throwing immediately, then retry and add pummels while they struggle.'] :
          ['Tap Attack to start', 'The rival will try two pummels and a throw. Once caught, rotate the stick, alternate directions, or tap buttons to escape.'],
        approach: [holder ? 'Reach for the rival' : 'Grab coming', holder ? 'Tap Attack to pummel once the grip closes.' : 'Wait for the paws to close, then start your escape inputs.'],
        gripped: [holder ? 'Pummel or throw' : 'Break the grip', holder ? 'Watch the hold meter. Tap a direction to throw before it empties.' :
          'Flick between directions or tap action buttons. Each fresh input takes a bite out of the hold meter.'],
        pummel: ['Pummel ' + e.count, holder ? 'Tap a direction now to throw, or tap Attack again and risk the escape.' :
          'You can keep struggling while the hit is frozen. Alternate directions or tap a button.'],
        brokeFree: [captive + ' broke free · ' + counts, holder ? 'Try committing to the throw one pummel earlier.' : 'Retry with the same inputs at a higher starting damage.'],
        throwLanded: [throwName + ' · ' + counts, holder ? 'Retry and see how many pummels you can add before the rival escapes.' :
          'Retry and start alternating directions as soon as the grab connects.'],
        missedGrab: ['Grab missed', 'Choose the drill again and stay within reach for the catch.'],
        wrongGrip: ['You caught the rival', 'Choose Escape a grab to take the defender’s side again.'],
      };
      [status.textContent,tip.textContent] = feedback[e.outcome || e.phase];
      return;
    }
    if (drill.spacing === 'counter' || drill.spacing === 'break') {
      const defend = drill.spacing === 'counter', low = moves[world.dogs[0].kit.tilts.down].label;
      const answer = moves[drill.answerMove] || specials[drill.answerMove] || smashes[drill.answerMove] || throws[drill.answerMove];
      const feedback = {
        windup: ['Watch Pip’s kick', 'Hold Down before Stamp Kick connects. Tap Attack at the paw spark to answer.'],
        plant: [defend ? 'Paws planted' : 'Rival held ground',
          defend ? 'Keep Down held and tap Attack for ' + low + '.' : 'Their low tilt is coming. Shield or move clear.'],
        stand: ['Kick launched you', 'Try crouching before the first hit connects.'],
        gripped: ['Crouch caught', 'Tap a direction to throw.'],
        punished: [(answer?.label || 'Counter') + ' punished the kick', 'Pip was still recovering when your counter hit.'],
        answered: ['You hit back', 'Your counter reached Pip after his kick recovered.'],
        first: ['You struck first', 'Let the kick reach your crouch, then answer at the spark.'],
        afterKick: ['Hit after the launch', 'Hold Down before contact to try answering with your paws planted.'],
        lifted: ['Crouch lifted', 'You softened the launch. At this percentage the kick can lift you off the floor.'],
        followHit: ['Pip landed the jab', 'Crouch before the kick and tap Attack at the first hit spark.'],
        held: ['Held your ground', 'Add a down tilt after the first impact to take your turn.'],
        away: ['Follow-up missed', 'Try holding Down before Stamp Kick reaches you.'],
        threw: ['Throw beat the crouch', 'The crouch gave the rival no protection against the throw.'],
        opened: ['Rival launched', 'Your hit took the rival off the floor.'],
        reversed: ['Rival hit back', 'Grab the crouch, use a stronger launcher, or strike from outside their low tilt.'],
        safe: ['Outside their counter', 'The rival stayed grounded. Your spacing kept their low tilt from connecting.'],
        blockedReply: ['Counter shielded', 'Your shield caught their low tilt.'],
        shieldedKick: ['Kick shielded', 'To try a crouch cancel, release Shield and hold Down before the kick.'],
        parriedKick: ['Kick parried', 'To try the low counter, hold Down before the kick and tap Attack at the spark.'],
        slipped: ['Rival escaped the grab', 'Choose a throw while your grip holds.'],
        noContact: ['No contact', 'Close the gap and try again.'],
      }[status.dataset.result];
      status.textContent = feedback[0];
      tip.textContent = feedback[1] + (e.outcome ? ' Choose ' + (defend ? 'Crouch counter' : 'Beat crouch') + ' to retry.' : '');
      return;
    }
    status.textContent = {
      windup: 'Watch the disc', follow: 'Flick left!', escaped: 'Second swing missed',
      caught: 'Both swings hit', missed: 'First swing missed', clear: 'Follow-up missed', interrupted: 'Swing interrupted',
    }[status.dataset.result];
    if (e.phase === 'windup')
      tip.textContent = 'Let the first swing hit. Tap left or flick the stick left when the spark appears.';
    if (!e.outcome) return;
    const result = {
      escaped: 'You shifted past the rim and took only the first 3%.',
      caught: e.outward > 0
        ? 'Your flick moved you. The second swing still reached from this spacing.'
        : 'The finisher caught you. Start with movement released, then flick left on the first spark.',
      clear: 'The finisher missed. Try a left flick during the first hit to practice the escape.',
      missed: 'The opening swing missed. Wait in place until Clover’s disc touches you.',
      interrupted: 'Clover lost the swing. Give her room to finish the first pass.',
    }[e.outcome];
    tip.textContent = result + ' Tap Attack to retry.';
  }
  function edgeFeedback(name, e) {
    const d = world.edgePractice, status = $('edge-status');
    if (d.phase === 'done' && name !== 'edgeResult') return;
    const move = (moves[e.moveId] || specials[e.moveId] || smashes[e.moveId] || throws[e.moveId] || grabs[e.moveId])?.label || 'Hit';
    status.dataset.result = e.outcome || name;
    if (d.corner) {
      const result = e.outcome || name;
      status.textContent = {
        cornerCue:'Release Shield to parry', shieldSlip:'Pushed off · grab the lip or jump',
        caughtLip:'Pushed off · caught the ledge', backOnstage:'Pushed off · recovered onstage',
        pushedOff:'Lost the corner', heldCorner:'Blocked · kept your footing', parriedCorner:'Parried · held the corner',
        caught:'Hit by ' + move, interrupted:'Interrupted the swing', avoided:'Evaded the swing',
      }[result];
      if (e.outcome) $('recovery-tip').textContent = 'Compare Block at lip and Block farther in. Repeat at the lip and release Shield as the chalk turns mint.';
      return;
    }
    if (name === 'ledge') {
      status.textContent = 'Catch at ' + e.f.damage + '% · ' + e.guardFrames + 'f protected';
    } else if (name === 'edgeOpen') {
      status.textContent = 'Grip marks gone · punish now';
    } else if (d.timeCatch && name === 'edgeResult') {
      const result = {
        timedHit: move + ' caught the hang', timedGrab: move + ' caught the hang',
        intercepted: move + ' intercepted the approach', rolledAway: 'Rival rolled to safety',
        tooEarly: 'Swing passed through · ' + d.earlyFrames + 'f of protection left',
        caught: 'Rival countered with ' + move, missed: 'Missed the recovery',
      }[e.outcome];
      status.textContent = result + (d.guardFrames ? ' · ' + d.guardFrames + 'f catch' : '');
      $('recovery-tip').textContent = 'Try the same swing after the other recovery, or raise Dummy damage and repeat.';
    } else if (name === 'edgeLand') {
      status.textContent = 'Landed · ' + Math.round(e.f.landingLag * 60) + 'f landing recovery';
    } else if (name === 'edgeCancel') {
      status.textContent = move + ' · ' + e.frames + 'f saved · airborne';
      $('recovery-tip').textContent = 'Aim Down and tap Attack now to catch the dog underneath.';
    } else if (name === 'teeter') {
      status.textContent = 'Balanced at the lip';
    } else if (name === 'edgeCue') {
      status.textContent = 'Rival let go · low tilt now';
    } else {
      status.textContent = {
        covered: move + ' caught the ledge jump', followup: move + ' connected · ' + d.frames + 'f saved',
        caught: 'Rival hit you with ' + move, claimed: 'You took the ledge', offstage: move + ' hit offstage',
        other: move + ' connected', settled: 'Landing recovery finished on the platform',
        overshot: 'Sailed past the platform', waited: 'Rival climbed onstage', missed: 'Rival slipped away',
      }[e.outcome];
      $('recovery-tip').textContent = d.pattern === 'lip' ? 'Retry Guard the ledge. Time Down + Attack as the rival lets go.' :
        'Compare Land at the tip and Land deeper with the same neutral aerial.';
    }
  }
  function footworkFeedback(e) {
    const status = $('footwork-status');
    const state = e.outcome || e.phase;
    status.dataset.result = state;
    const pattern = world.footworkPractice.pattern;
    if (pattern === 'crawl') {
      const feedback = {
        castHigh:['Round Trip away', 'Get low and crawl toward Clover.'],
        under:['First pass clear', 'Keep low and move past the chalk as the disc comes back.'],
        inside:['Inside the chalk', 'Clover is lining up Skip Serve. Shield, or reach her with a tilt.'],
        castLow:['Skip Serve away', 'This shot bounces low. Hold Shield.'],
        shortCrawl:['Both passes clear · short of the chalk', 'Add a side while holding Down to gain ground under the disc.'],
        castHit:['Hit on the way out', 'Hold Down and move toward Clover.'],
        returnHit:['Clipped on the return', 'Stay low until the disc passes your ears a second time.'],
        highGuard:['Blocked the high disc', 'Try holding Down and crawling forward while the disc passes overhead.'],
        lowHit:['Skip Serve hit low', 'The bouncing serve reaches the floor. Shield it or interrupt Clover.'],
        lowGuard:['Blocked Skip Serve', 'You took ground under Round Trip and blocked the low follow-up.'],
        caughtServe:['Caught Clover', 'You reached Clover before Skip Serve could stop you.'],
        earlyHit:['Hit before the return', 'Let Round Trip pass overhead twice to practice the full approach.'],
        avoided:['Disc avoided', 'Try crawling under both passes and reaching the chalk.'],
      }[state];
      if (feedback) [status.textContent,$('recovery-tip').textContent] = feedback;
      return;
    }
    if (pattern === 'armor' || pattern === 'armorGrab') {
      const punch = pattern === 'armor';
      status.textContent = {count:'Beat ' + e.beat, go:punch ? 'Release Smash!' : 'Grab now!',
        caughtArmor:'Grabbed the planted shoulder', ordinaryGrab:'Grab landed outside the armor window',
        armoredPunch:'Jab absorbed · Haymaker landed', cleanPunch:'Haymaker landed clean',
        interruptedPunch:'Punch interrupted', blockedPunch:'Blocked Haymaker', parriedPunch:'Parried Haymaker',
        missedSwing:'No clean hit'}[state];
      if (e.outcome) $('recovery-tip').textContent = punch ?
        'Try again. Holding Smash through the jab leaves Brisket open. Release on the third light to punch through it.' :
        'Retry with Attack on the third light, then try Grab on that same beat. A catch leaves you free to pummel or throw.';
      return;
    }
    if (pattern === 'dashShield') {
      status.textContent = {
        atMark:'Hold Shield now', dashBlocked:'Dash shield · tap Grab', standingBlock:'Blocked · tap Grab',
        caughtCounter:'Caught Brisket', jumpedClear:'Brisket jumped clear', parriedApproach:'Parried Gate Check',
        ranIntoSwing:'Gate Check hit you', shortStop:'Stopped short of the chalk',
        intercepted:'You caught Brisket first', avoided:'Gate Check missed',
      }[state];
      if (state === 'dashBlocked' || state === 'standingBlock')
        $('recovery-tip').textContent = 'Keep Shield held and tap Grab during the block. Brisket will jump as soon as his swing ends.';
      else if (e.outcome) $('recovery-tip').textContent = state === 'caughtCounter'
        ? 'You have the grab. Choose a throw, or tap Run up and shield to retry on the same mark.'
        : 'Run to the chalk. Keep forward held and add Shield as Brisket swings. Tap Grab when his paw hits the shield.';
      return;
    }
    if (world.footworkPractice.discRole) {
      const pip = pattern === 'reflect';
      status.textContent = {
        cast:pip ? 'Bark now!' : 'Round Trip is away',
        reflected:pip ? 'Disc sent back!' : 'Incoming · shield now!',
        returnedHit:'Round Trip hit Clover', returnGuard:'Clover guarded the return',
        returnParry:'Clover parried the return', castParry:'Pip parried the cast',
        discHit:'Round Trip hit Pip', castGuard:'Pip guarded the cast',
        returnMiss:'The return missed', missedSwing:'No disc contact', otherHit:'Close-range hit',
      }[state];
      if (e.outcome) $('recovery-tip').textContent = pip
        ? 'Retry and compare holding Shield with tapping neutral Special just as Clover lets go of the disc.'
        : 'Retry and hold Shield when the mint streak points back at Clover. Switch sides to mirror the throw.';
      return;
    }
    if (world.footworkPractice.boost) {
      const pivot = pattern === 'boostPivot';
      status.textContent = {cancelNow:pivot ? 'Reverse + Grab' : 'Tap Grab now',
        boostCatch:'Boost grab caught the shield', boostPivotCatch:'Caught behind', regularCatch:'Regular grab',
        shortReach:world.footworkPractice.closestGap > 0 ? 'Grab fell short by ' + Math.ceil(world.footworkPractice.closestGap) + ' px' : 'Missed the grab',
        guardedDash:'Dash attack blocked', swingMiss:'Dash attack missed', groundHit:'Ground hit'}[state];
      $('recovery-tip').textContent = state === 'cancelNow' ? (pivot ? 'Press back and tap Grab.' : 'Tap Grab during the windup.') +
        (world.footworkPractice.pauseOnWindup ? ' Tap Attack again to finish the swing.' : '') :
        state === 'boostCatch' || state === 'boostPivotCatch' || state === 'regularCatch' ?
          'You have the collar. Tap Attack to pummel or choose a direction to throw.' :
          'Retry with Attack first. Tap Grab in the first two frames of the dash attack.';
      return;
    }
    if (pattern === 'cancelDash' || pattern === 'cancelTurn') {
      const practice = world.footworkPractice, player = world.dogs[0], dash = pattern === 'cancelDash';
      const aim = dash ? 'Up' : practice.dir > 0 ? 'Right' : 'Left';
      if (state === 'cancelNow') {
        status.textContent = moves[e.moveId].label + ' · windup';
        $('recovery-tip').textContent = 'Press ' + aim + ' + Jump to switch to a rising aerial.' +
          (practice.pauseOnWindup ? ' Or release Attack and tap it again to finish the ground swing.' : '');
      } else {
        status.textContent = {risingCatch:player.lastMove + ' · caught the hop',
          backCatch:player.lastMove + ' · back air connected', otherHit:player.lastMove + ' · hit',
          airMiss:'Aerial missed', groundMiss:'Ground swing missed'}[state];
        $('recovery-tip').textContent = state === 'groundMiss' ? 'The rival cleared the swing. Retry and jump during the windup.' :
          'Turn off Pause at windup and Half speed to practice at match speed. Switch sides to mirror the opening.';
      }
      return;
    }
    if (pattern === 'angleHigh' || pattern === 'angleLow') {
      const move = world.dogs[0].lastMove;
      status.textContent = state === 'missedAngle' ? 'Miss · ' + (move || 'no swing') :
        move + (state === 'angledHit' ? (pattern === 'angleLow' ? ' · caught the recovery' : ' · caught the hop') : ' · hit');
      return;
    }
    if (pattern === 'antiAir') {
      const move = world.dogs[0].lastMove;
      status.textContent = {
        atMark:'Jump + Up Smash', slideCatch:move + ' · caught the landing',
        specialCatch:move + ' · jump-cancel special', otherCatch:move + ' · hit',
        caughtShield:'The rival landed and blocked', overshot:'Missed the landing',
      }[state];
      if (e.outcome) $('recovery-tip').textContent = {
        slideCatch:'Your up smash carried your run under the falling dog. Retry and hold Smash to see when their shield comes up.',
        specialCatch:'Your up special started during jump squat and intercepted the rival.',
        otherCatch:'You landed a hit. To slide underneath, run to the chalk and tap Jump and Up + Smash together.',
        caughtShield:'Your swing reached the shield. Retry and release Smash sooner.',
        overshot:'Retry. Run to the chalk, hold Up, then tap Jump and Smash together as the rival falls.',
      }[state];
      return;
    }
    if (pattern === 'brake' || pattern === 'pivot') {
      const move = world.dogs[0].lastMove;
      status.textContent = {
        atMark: pattern === 'brake' ? 'Brake now' : 'Turn and strike',
        slidingHit: move + (pattern === 'brake' ? ' · sliding hit' : ' · caught the chase'),
        dashHit: move + ' · dash attack', plantedHit: move + ' · planted hit', overshot: 'Missed the opening',
      }[state];
      if (e.outcome) $('recovery-tip').textContent = {
        slidingHit: 'Your tilt connected while carrying the run into its windup. Switch sides to try it the other way.',
        dashHit: 'That was your dash attack. Retry and let go of forward for a beat before aiming and tapping Attack.',
        plantedHit: 'You connected after planting your paws. Tap Attack earlier in the skid to carry speed into the swing.',
        overshot: 'Retry and start your tilt as your lead paw reaches the chalk.',
      }[state];
      return;
    }
    if (pattern !== 'bait') {
      status.textContent = {
        count: 'Beat ' + e.beat, go: pattern === 'power' ? 'Release!' : 'Swing!',
        matched: 'Paws clashed', brokeThrough: 'Breakthrough', overpowered: 'Swing beaten',
        batted: 'Disc batted away', hitTaken: 'Rival hit first', hitFirst: 'You hit first', missedSwing: 'No contact',
      }[state];
      if (e.outcome) {
        const result = {
          matched: pattern === 'power' ? 'Both swings recoiled. Start charging before the first beat.' :
            'Both dogs recoiled at the point of contact. Neither took damage.',
          brokeThrough: 'Your swing beat the rival’s and carried on.',
          overpowered: 'The stronger attack broke through your swing.',
          batted: 'Your swing knocked Clover’s disc out of play.',
          hitTaken: 'Their attack reached your dog first. Watch the chalk lights and take your swing sooner.',
          hitFirst: 'You landed a clean hit before the attacks met.',
          missedSwing: 'The attacks missed each other. Hold your ground and time your swing to the third light.',
        }[state];
        $('recovery-tip').textContent = result + ' Choose the exercise again to retry.';
      }
      return;
    }
    status.textContent = {
      tell: 'Bear Hug coming', opening: 'Grab missed · attack', caught: 'Caught',
      early: 'Hit first', late: 'Brisket recovered', clash: 'Grabs clashed', punish: 'Whiff punish',
    }[state];
    if (e.outcome)
      $('recovery-tip').textContent = {
        caught: 'Brisket caught you. Retry and reverse as your lead paw crosses the chalk.',
        early: 'You beat the grab to the punch. Retry and let his paws close on empty air.',
        late: 'You cleared Bear Hug. Turn back sooner and attack while his paws are still out.',
        clash: 'Both grabs met. Retry and let Bear Hug miss before you counter.',
        punish: 'You caught Brisket with ' + e.remaining + (e.remaining === 1 ? ' frame' : ' frames') + ' left in his recovery.',
      }[state];
  }
  function shieldFeedback(name, e) {
    const result = $('shield-status');
    const tip = $('recovery-tip');
    if (e.pattern === 'crossup') {
      const kit = world.dogs[0].kit;
      const phase = e.outcome || e.phase;
      const back = world.shieldPractice.dir > 0 ? 'Left' : 'Right';
      const timing = ' · ' + e.landingFrames + 'f to spare';
      const feedback = {
        counter:['Blocked · watch Brisket’s paws', 'Keep your facing and watch which side he lands on.'],
        front:['In front · tap Attack', 'Keep holding Shield and tap Attack to grab him.'],
        behind:['Behind · jump and attack ' + back.toLowerCase(), 'Aim ' + back + ' and press Jump + Attack for ' + moves[kit.air.back].label + '. On touch, hold the direction and slide from Jump to Attack.'],
        punish:[grabs[kit.grab].label + timing, 'Tap Attack again to pummel, or choose a direction to throw.'],
        rearPunish:[moves[kit.air.back].label + timing, 'Your back air hit before Brisket could raise his shield.'],
        lateCatch:['Grab after recovery', 'Tap Attack as his front landing touches down.'],
        lateAir:['Back air after recovery', 'Jump and attack toward his rear landing a little sooner.'],
        whiffGrab:['Grab missed', 'A shield grab reaches ahead. Jump and strike back when Brisket crosses you.'],
        counterBlocked:['Brisket blocked', 'He had time to shield. Start your counter closer to touchdown.'],
        counterHit:['Counter connected', 'Try a shield grab in front or a back air behind.'],
        waited:['Brisket recovered', 'Retry and watch his landing before choosing your counter.'],
        parry:['Parried Belly Drop', 'Hold Shield through impact to practice the landing read.'],
        hit:['Belly Drop connected', 'Keep Shield raised until the hit lands.'],
        poked:['Shield poked', 'Hold a centered shield through the drop.'],
        break:['Shield broken', 'Retry with a fresh shield.'],
        interrupted:['Dive interrupted', 'Let the dive reach your shield to practice the counter.'],
      }[phase];
      if (feedback) {
        result.dataset.result = phase;
        [result.textContent,tip.textContent] = feedback;
      }
      return;
    }
    if (e.pattern === 'breakEscape' || e.pattern === 'breakPunish') {
      const defend = e.pattern === 'breakEscape';
      const finish = e.moveId && (smashes[e.moveId] || moves[e.moveId] || specials[e.moveId] || grabs[e.moveId])?.label;
      const timing = e.frames + 'f · ' + e.struggles + (e.struggles === 1 ? ' escape input' : ' escape inputs');
      result.dataset.result = e.phase;
      result.textContent = {
        pop:'Shield burst', dizzy:defend ? 'Dizzy · tap or flick' : 'Dizzy · release a strike',
        awake:'Woke in ' + timing, guarded:'Awake · blocked ' + (finish || 'the swing') + ' · ' + timing,
        clear:'Woke and escaped · ' + timing, lateHit:'Woke but got hit · ' + timing,
        punished:(finish || 'Hit') + ' caught the dizzy dog · ' + timing,
        grabbed:(finish || 'Grab') + ' caught the dizzy dog · ' + timing,
      }[e.phase];
      return;
    }
    if (e.pattern === 'dodgeTiming' && name === 'shieldCue') {
      result.dataset.result = e.phase;
      if (e.phase === 'sweep') {
        result.textContent = (e.dodge.wear ? 'Repeated' : 'Fresh') + ' dodge · protected ' +
          Math.round(e.dodge.safeFrom*60) + '–' + (Math.round(e.dodge.safeUntil*60)-1) + 'f';
      } else {
        result.textContent = e.phase === 'again' ? 'Dodged · repeat now' : 'Fresh again';
        tip.textContent = e.phase === 'again' ? 'Keep Shield held. Tap Down again now to test the shorter window, or wait for Fresh again.' :
          'Tap Down while shielding. Pip will sweep on the same beat as before.';
      }
      return;
    }
    if (world.shieldPractice.jumpIn) {
      if (name === 'shieldCue') {
        result.dataset.result = e.phase;
        result.textContent = e.phase === 'touchdown' ? 'Tap Grab' : 'Watch the jump';
        return;
      }
      const plan = world.shieldPractice.jumpIn;
      const answer = e.outcome === 'miss' ? (e.lastDodge === 'spotDodge' ? 'Spot-dodged' :
        e.lastDodge === 'shieldRoll' ? 'Rolled clear' : e.pattern === 'yourHop' ? 'No catch' : 'Escaped') : {
        block:'Blocked the aerial', parry:'Parried the aerial', grabbed:'Caught by the landing grab',
        interrupted:'Jump-in interrupted', hit:'Hit by the aerial', break:'Shield broken', poked:'Shield poked',
        landGrab:'Grabbed after touchdown', bufferedGrab:'Buffered landing grab', airGrab:'Grab started in the air',
        blockedAir:'Aerial hit the shield',
      }[e.outcome];
      result.dataset.result = e.outcome;
      result.textContent = answer;
      const advice = e.pattern === 'yourHop' ? (e.outcome === 'bufferedGrab' || e.outcome === 'landGrab'
        ? 'Tap a direction to throw.' : 'Hop beside the shield, then tap Grab as your paws reach the ground.') :
        plan.grab ? 'That was an empty hop. Spot-dodge as the paws reach for you, or jump clear.' :
        'That was a falling aerial. Hold Shield through the swing, or release just before impact to parry.';
      tip.textContent = advice + ' Choose Jump-in practice to retry.';
      return;
    }
    const aerial = e.pattern === 'kick' || e.pattern === 'drop';
    const dummy = world.dogs[1];
    const attackName =
      e.pattern === 'low' ? 'Tail Broom' : e.pattern === 'high' ? 'Slip Lead' :
      aerial ? moves[dummy.kit.air[e.pattern === 'kick' ? 'forward' : 'down']].label
        : (e.pattern === 'grab' || e.pattern === 'counterGrab') ? grabs[dummy.kit.grab].label : smashes[dummy.kit.smashes.side].label;
    if (name === 'shieldCue') {
      result.dataset.result = e.phase;
      if (e.pattern === 'counterGrab') {
        result.textContent = e.phase === 'counterTap' ? 'Rise · tap Attack' :
          e.phase === 'windup' ? attackName + ' coming' : attackName + ' · dodge';
        if (e.phase === 'counterTap') tip.textContent = 'Center the stick and tap Attack for a jab, or aim a tilt. You can keep Shield held.';
        return;
      }
      result.textContent = e.phase === 'counter' ? 'Blocked · tap Grab' : e.phase === 'windup' ? attackName + ' coming' : attackName;
      if (e.phase === 'windup' && (e.pattern === 'low' || e.pattern === 'high'))
        tip.textContent = e.pattern === 'low' ? 'Cover the paws. Hold Shield and gently aim down.' : 'Cover the ears. Hold Shield and aim up.';
      return;
    }
    result.dataset.result = e.outcome;
    const feedback = {
      spotPunish: ['Dodge counter · ' + e.landingFrames + 'f left', 'Your strike caught the missed grab. The frame count shows how long the rival still needed to recover.'],
      dodgeClipped: ['Pip caught the repeat', 'The final frame of Dewclaw caught your paws. Retry and wait for Fresh again before your second dodge.'],
      freshClear: ['Both sweeps missed', 'You recovered the full dodge window before the second sweep. Retry and dodge again immediately to compare.'],
      wornClear: ['Cleared the sweep', 'The second dodge had a shorter window. Repeat from the same spot to compare the timing.'],
      ordinaryPunish: ['Grab punished', 'Your strike landed after your dodge finished. Tap Attack while your dog is still rising to counter sooner.'],
      counterBlocked: ['Rival shielded', 'The grab recovered before your hit reached them. Try a quicker strike or start the dodge earlier.'],
      parry: ['Parry', 'Shield released on time. After a melee parry, tap Attack to counter.'],
      block: e.pattern === 'low' || e.pattern === 'high'
        ? ['Covered the ' + (e.pattern === 'low' ? 'paws' : 'ears'), 'The bubble intercepted ' + attackName + '.']
        : ['Blocked', 'You held Shield through contact. Try releasing it just before the hit.'],
      poked: ['Shield poked', 'The attack reached your dog outside the bubble. Hold Shield and gently aim toward the hit.'],
      found: ['Found the opening', 'Your hit reached the dog outside the bubble. Try the same swing against a fresh shield.'],
      sealed: ['Shield held', 'The bubble caught your attack. Aim for the exposed paws with a down tilt.'],
      brokeGuard: ['Shield broken', 'Your attack depleted the bubble. A low poke can deal damage while the rival still has shield left.'],
      caughtGuard: ['Guard grabbed', 'Your grab reached the rival through the shield. Tap a direction to throw.'],
      hitOpen: ['Guard down', 'Your attack reached the rival after the shield dropped. Retry to catch their exposed paws.'],
      woreOut: ['Shield ran out', 'Choose Poke their shield to retry and catch the paws before the bubble breaks.'],
      break: ['Shield broken', 'Choose the matchup again to start with a fresh shield.'],
      hit: ['Hit', aerial ? 'Keep Shield held until the aerial lands. Tap Grab when the shield flashes.' : 'Try holding Shield through the windup, then release as the strike reaches you.'],
      grabbed: ['Grabbed', 'Hold Shield, then tap Down just before the grab reaches you.'],
      interrupted: ['Interrupted', 'You caught the dummy first. Choose the same matchup to retry.'],
      spaced: ['Out of reach', 'Pip dashed clear. At its closest, Disc Hook fell short by ' + e.gap + ' game pixels. Try the same grab against Belly Drop.'],
      punish: ['Grab punish', dummy.stats.name + ' had ' + e.landingFrames + (e.landingFrames === 1 ? ' frame' : ' frames') + ' of landing recovery left when Disc Hook caught him. Aim to throw.'],
      lateCatch: ['Grab landed late', dummy.stats.name + ' had time to act before Disc Hook landed. Tap Grab as the shield flashes.'],
      late: ['Grab missed', dummy.stats.name + ' escaped the grab. Try tapping Grab as the shield flashes.'],
      waited: ['No punish', 'Choose the matchup again. Keep Shield held and tap Grab when the hit lands.'],
      counterHit: ['Counter landed', 'Your counter connected. Choose the same matchup to try Disc Hook.'],
      miss: [
        e.lastDodge === 'shieldRoll'
          ? 'Rolled clear'
          : e.lastDodge === 'spotDodge'
            ? 'Spot-dodged'
            : 'Missed',
        'Choose the same matchup to try another exchange.',
      ],
    };
    [result.textContent, tip.textContent] = feedback[e.outcome];
    if (e.pattern === 'low' || e.pattern === 'high') tip.textContent += ' Release Shield and raise it again to retry.';
  }
  function wallFeedback(name, event) {
    const status = $('wall-status');
    const d = world.wallPractice;
    if (d.ceiling) {
      const away = d.side === 'left' ? 'left' : 'right';
      const feedback = {
        wallCue:['swing','Watch Pip’s Flip Kick'],
        hit:['flight','Flip Kick · tap Shield'],
        ceilingBounce:['ceilingBounce','Missed tech · bounced down'],
        ceilingTech:['ceilingTech','Ceiling tech · air jump saved'],
        ledge:['returned','Caught the ledge'],
      }[name];
      if (feedback) {
        status.dataset.result = feedback[0];
        status.textContent = feedback[1];
        if (name === 'ceilingTech') $('recovery-tip').textContent = 'Steer ' + away + ' past the lip, then use Up + Special to hook it.';
        if (name === 'ceilingBounce') $('recovery-tip').textContent = 'Choose Retry kick. Tap Shield at the hit spark before your head reaches the table.';
        if (name === 'ledge') $('recovery-tip').textContent = 'You made it back. Choose Switch wall to try the other edge.';
      }
      return;
    }
    if (d.runner) {
      if (name === 'wallKick') {
        status.dataset.result = 'kick';
        status.textContent = world.dogs[0].jumps ? 'Wall jump · air jump saved' : 'Wall jump · air jump already spent';
      } else if (name === 'wallReturn') {
        status.dataset.result = d.outcome;
        const landing = d.route === 'platform' ? 'Landed on a platform' :
          (d.route === 'ledge' ? 'Caught ' : 'Landed on ') + (d.crossed ? 'far roof' : 'near roof');
        status.textContent = d.route === 'out' ? 'Missed the roofs' : landing + ' · ' +
          (d.jumps ? 'air jump saved' : 'air jump spent');
      }
      return;
    }
    if (world.wallPractice.phase === 'done' && status.dataset.result !== 'flight') return;
    if (name === 'wallBounce' && event.hard) {
      status.dataset.result = 'hardImpact';
      status.textContent = 'Too fast to tech · ' + Math.round(event.speed) + ' px/s';
      $('recovery-tip').textContent = 'Retry kick. Hold Up as the heel hits and tap Shield. A shallower hit can be teched.';
      return;
    }
    const feedback = {
      wallCue: [
        'swing',
        'Watch Pip’s heel',
        'Tap Shield as the kick connects. Hold Jump at the wall to spring away.',
      ],
      hit: ['flight', 'Back Heel · tap Shield', 'Tap Shield now. Keep Jump held for a wall-tech jump.'],
      wallTech: [
        'wallTech',
        'Wall tech',
        'You stopped at the brickwork. Jump or use Up + Special to reach the roof.',
      ],
      wallTechJump: [
        'wallTechJump',
        'Wall-tech jump',
        'You kicked away and kept your air jump. Steer toward the lip to recover.',
      ],
      wallBounce: [
        'wallBounce',
        'Missed tech',
        'The wall bounced you back. Retry and tap Shield when Back Heel connects.',
      ],
    };
    if (!feedback[name] || (name === 'hit' && world.wallPractice.phase !== 'flight')) return;
    [status.dataset.result, status.textContent, $('recovery-tip').textContent] = feedback[name];
    if (d.heavy && name === 'hit') $('recovery-tip').textContent = 'Hold Up through the hit freeze to soften the impact. Tap Shield before the wall.';
    if (d.heavy && d.phase === 'done') status.textContent += ' · ' + Math.round(event.speed) + ' px/s';
  }
  function chaseFeedback(name, e) {
    const d = world.chasePractice, status = $('launch-status'), tip = $('recovery-tip');
    const attack = d.role === 'attack';
    if (d.bait) {
      const rival = world.dogs[d.slot], move = moves[rival.kit.floorAttack];
      const feedback = {
        fall:['Watch the landing', 'Stay close and watch which way the rival faces.'],
        down:['Rival knocked down', 'Hold Shield to block the sweep, or step outside its reach.'],
        getup:[move.label, move.hint],
        sweepBlock:['Blocked ' + move.label, 'Tap Grab out of shield before the rival stands.'],
        sweepParry:['Parried ' + move.label, 'Their swing stopped. Tap Attack or Grab to punish.'],
        sweep:[move.label + ' hit you', 'Try shielding the swing, then grabbing as the rival gets up.'],
        grabPunish:['Grabbed the recovery', 'Tap Attack to pummel or choose a direction to throw.'],
        punished:['Hit the get-up', 'Your attack landed before the rival could act again.'],
        interrupted:['Hit before the swing', 'Let the rival begin their get-up attack to practice the punish.'],
        heldGuard:['Blocked, rival stood up', 'Tap Grab when the sweep hits your shield.'],
        lateGrab:['Rival recovered before the grab', 'Try parrying the sweep, then jab during the opening.'],
        escaped:['Rival stood up', 'Stay close enough to hit or grab during the recovery.'],
        away:['Left the setup', 'Choose Bait the get-up to retry.'],
      };
      const state = e.outcome || e.phase;
      status.dataset.result = state;
      [status.textContent, tip.textContent] = feedback[state];
      if (d.contactFrame && ['sweep','sweepBlock','sweepParry'].includes(state))
        status.textContent += ' · frame ' + d.contactFrame + ' ' + d.contactSide;
      return;
    }
    if (name === 'chaseCue') {
      status.dataset.result = e.phase;
      if (e.phase === 'fall') status.textContent = attack ? 'Watch the landing' : 'Tap Shield before landing';
      if (e.phase === 'down') status.textContent = attack ? 'Down · tap Attack' : 'Missed tech';
      if (e.phase === 'locked') {
        status.textContent = e.locks === 1 ? 'First jab lock' : 'Second jab lock';
        tip.textContent = attack
          ? e.locks === 1 ? 'Tap Attack again after the paw retracts, or start your finisher.' : 'Tap Down + Smash now to finish.'
          : 'As the bounce settles, tap a side to roll or tap Attack to sweep.';
      }
      if (e.phase === 'getup') {
        status.textContent = e.type === 'getupRoll' ? 'Rolling away' : 'Getting up';
        if (attack && e.type === 'getupRoll') tip.textContent = 'Follow the roll and catch the rival as their paws come down.';
      }
      return;
    }
    const messages = {
      finish: ['Finisher landed', d.locks + (d.locks === 1 ? ' lock' : ' locks') + ' into the finisher.'],
      third: ['Third jab launched', 'A third jab sends the rival airborne. Try a stronger hit after the second.'],
      early: ['Hit before landing', 'Watch for the dust from the landing before you jab.'],
      launched: ['Launched off the floor', 'A quick tap of neutral Attack starts the lock.'],
      escaped: [attack ? 'Rival got away' : 'Escaped', attack ? 'The rival finished getting up. Jab as they touch down.' : 'The jab missed your get-up.'],
      caught: [attack ? 'Caught the get-up' : 'Caught getting up', attack ? 'Your hit landed before the rival could act again.' : 'Try a roll away or sweep as your dog settles.'],
      sweep: [attack ? 'Hit by a sweep' : 'Get-up sweep landed', 'The get-up attack reached the waiting chaser.'],
      tech: ['Tech in place', 'Your Shield press recovered the landing before the jab.'],
      techRoll: ['Tech roll', 'You rolled out as you touched the floor.'],
      away: ['Left the setup', 'Choose the drill again to return to the landing.'],
    };
    const [label, message] = messages[e.outcome];
    const success = attack ? ['finish','caught'].includes(e.outcome) : ['tech','techRoll','escaped','sweep'].includes(e.outcome);
    status.dataset.result = success ? 'clear' : e.outcome;
    status.textContent = label;
    tip.textContent = message + ' Choose ' + (attack ? 'Jab lock' : 'Escape the lock') + ' to retry.';
  }
  function survivalFeedback(name, e) {
    const d = world.survivalPractice, status = $('launch-status'), tip = $('recovery-tip');
    const inward = d.dir > 0 ? 'left' : 'right', move = throws[d.moveId].label;
    const aim = d.moveId === 'cloverForehandPass' ? 'Hold Down to slow the low throw' : 'Hold Up + ' + inward + ' to bend the throw higher';
    let label, message;
    if (name === 'survivalReady' || name === 'survivalStart') {
      label = name === 'survivalReady' ? 'Tap Attack to start' : move;
      message = name === 'survivalReady' && d.study ? 'Tap Attack to take the throw. At impact, change your aim to compare the paths, then tap Attack to launch.' :
        name === 'survivalReady' && d.pattern === 'lastStock' ? 'Take the throw once with the stick centered. Retry and change direction during the last-stock impact.' :
        name === 'survivalReady' ? 'Take ' + move + ' with the stick centered. Tap Attack to retry from the same mark.' :
        aim + ' at the hit spark. Then steer ' + inward + ' toward the ledge.';
    } else if (name === 'survivalAim') {
      const path = d.preview.path;
      label = path.zone ? 'Crosses ' + path.zone + ' boundary in ' + path.ticks + 'f' :
        path.contact ? 'Reaches the ' + path.contact + ' in ' + path.ticks + 'f' : 'Control returns inside the boundary';
      message = 'Change your stick direction to redraw the path. Tap Attack to commit that angle, then steer back toward the stage.';
    } else if (name === 'blastThreat') {
      label = e.finalHit ? 'Last stock · steer now' : 'Blast line · aim now';
      if (e.finalHit) message = aim + ' before the hit releases. The mint arrow shows your launch.';
    } else if (name === 'launchDI') {
      label = Math.round(e.scale * 100) + '% speed · ' + Math.round(Math.abs(e.angle) * 180 / Math.PI) + '° turn';
      message = 'At the mint arrow, aim up-' + inward + ' and tap Shield. Jump toward the ledge and use Up + Special if you need more height.';
      if (d.releaseZone !== undefined) label += d.releaseZone ? ' · on course for the ' + d.releaseZone + ' line' : ' · room to recover';
    } else if (name === 'survivalBuffer') {
      label = 'Shield + up-' + inward;
    } else if (name === 'survivalFree') {
      label = 'Recover to the ledge';
    } else if (name === 'survivalResult') {
      label = { ko: 'Ring-out', ledge: 'Caught the ledge', land: 'Back onstage', miss: 'Missed grab' }[e.outcome];
      message = e.outcome === 'ko' ? (d.free ? 'You survived the throw. Try dodging inward sooner, then use your recovery.' :
        aim + ' during the freeze.') : e.outcome === 'miss' ? 'The rival missed the setup.' :
        'Your launch was ' + Math.round(d.scale * 100) + '% speed. The gold trail on a retry marks your last flight.';
      message += ' Tap Attack to retry.';
    } else return;
    status.dataset.result = e.outcome || name;
    status.textContent = label;
    if (message) tip.textContent = message;
  }
  function stockFeedback(name, e) {
    const d = world.stockPractice, status = $('launch-status'), tip = $('recovery-tip');
    let label, message;
    if (name === 'stockStart') {
      label = 'Lift arriving';
      message = d.slot ? 'Face the landing. Time your grab as the last mail tag goes out.' :
        'Tap Down when the lamps turn mint, or stay aboard and let the lift drop you.';
    } else if (name === 'stockReady') {
      label = d.slot ? 'Watch the mail tags' : 'Lift ready';
    } else if (name === 'stockLeave') {
      label = 'Protected · ' + e.frames + ' frames';
    } else if (name === 'stockOpen') {
      label = 'Open to a grab';
    } else if (name === 'stockResult') {
      [label, message] = {
        protected: ['Grab passed through', 'You landed with protection. Try staying on the lift until it drops you.'],
        caught: ['Caught on landing', 'The last tag expired before the grab. Leave earlier or jump over the rival.'],
        clear: ['Clear of the grab', 'Their paws missed you. Try dropping straight onto the landing.'],
        hit: ['Hit the guard', 'You struck the rival during your return.'],
        timed: ['Grab timed', 'Your grab became active after the last tag went out.'],
        early: ['Still protected', 'Your grab reached the dog while a tag was lit. Try grabbing later.'],
        miss: ['Out of reach', 'Face the landing and let the dog reach paw height before grabbing.'],
        timeout: ['Landing uncontested', 'Try a grab when the last tag goes out.'],
        ko: ['Lost the stock', 'Aim back toward the landing.'],
      }[e.outcome];
      message += ' Tap Attack to retry.';
    } else return;
    status.dataset.result = e.outcome || name;
    status.textContent = label;
    if (message) tip.textContent = message;
  }
  function meteorFeedback(name, e) {
    const d = world.meteorPractice, floor = d.pattern === 'spikeFloor', status = $('launch-status'), tip = $('recovery-tip');
    if (d.phase === 'done' && name !== 'meteorResult') return;
    let label, message;
    if (name === 'meteorReady' || name === 'meteorStart') {
      label = name === 'meteorReady' ? 'Tap Attack to start' : 'Pogo Paw incoming';
      message = floor ? 'Pip will spike you toward the platform. Take the hit, then tap Shield before your paws touch down.' :
        'Pip will spike you past the ledge. When the gold streaks turn mint, tap Jump or Up + Special and steer toward the stage.';
    } else if (name === 'hit' && e.meteor) {
      label = floor ? 'Tap Shield before landing' : 'Falling · wait for mint';
    } else if (name === 'meteorWindow') label = 'Jump or Up + Special';
    else if (name === 'meteorCancel') {
      label = e.option === 'jump' ? 'Jump spent' : 'Up Special spent';
      message = 'Steer ' + (d.dir > 0 ? 'left' : 'right') + ' toward the ledge to save the stock.';
    } else if (name === 'meteorResult') {
      const outcomes = {
        tech: ['Teched in place', 'Your paws met the platform and you stopped the rebound.'],
        techRoll: ['Tech roll', 'You crossed the landing before the attacker could chase the bounce.'],
        bounce: ['Meteor bounce', 'The platform sent you back up. Try Shield at the hit spark, with a side to roll.'],
        hardImpact: ['Too fast to tech · ' + Math.round(d.hardSpeed) + ' px/s', 'Hold ' +
          (d.dir > 0 ? 'Right' : 'Left') + ' through the hit freeze and tap Shield to try a shallower landing.'],
        saved: ['Saved the stock', 'Your ' + (d.cancel === 'jump' ? 'jump' : 'Up Special') + ' broke the spike and you reached the stage.'],
        returned: ['Back onstage', 'You reached safety after the launch.'],
        ko: ['Ring-out', 'Tap a fresh Jump or Up + Special at the mint marks. Keep steering toward the ledge.'],
        weak: ['Light hit', 'Pogo Paw clipped you. Try 100% for a meteor.'],
        avoided: ['Avoided the spike', 'Take the opening hit to practice the response.'],
      };
      [label, message] = outcomes[e.outcome];
      message += ' Tap Attack to retry.';
    } else return;
    status.dataset.result = e.outcome || name;
    status.textContent = label;
    if (message) tip.textContent = message;
  }
  function launchFeedback(name, e) {
    const result = $('launch-status'),
      tip = $('recovery-tip');
    let label, message;
    if (world.launchPractice.pattern === 'breakaway') {
      const d=world.launchPractice;
      if (name==='breakawayWindow') {
        result.dataset.result='window';
        result.textContent='Orbit or air dodge';
        tip.textContent=(d.pauseAtWindow?'Paused. ':'')+'Tap Attack to swing, Shield to dodge' +
          (d.pauseAtWindow?', or Jump to watch Pip’s kick.':'.');
      } else if (name==='hitstunCancel') {
        result.dataset.result=e.option;
        result.textContent=(e.option==='aerial'?moves[e.moveId].label:'Air dodge')+' · '+e.frames+'f early';
      } else if (name==='breakawayResult') {
        result.dataset.result=e.outcome;
        result.textContent={counter:(moves[e.moveId]?.label || 'Aerial')+' interrupted the kick',evaded:'Dodged the kick',
          caughtDodge:'Pip caught the dodge recovery',caught:'Flying Kick connected',clear:'Pip missed',otherHit:'Counterhit'}[e.outcome] +
          (d.saved?' · acted '+d.saved+'f early':'');
        tip.textContent=d.late?'Pip waited before kicking. Retry and watch where each dog will land.':
          'Choose Late kick and try the same response. Pip can catch your dodge as its protection ends.';
      }
      return;
    } else if (world.launchPractice.pattern === 'juggle') {
      const d = world.launchPractice, side = d.dir > 0 ? 'right' : 'left';
      if (d.phase === 'done' && name !== 'juggleResult') return;
      if (name === 'launchDI') {
        label = 'Thrown · release the direction';
        message = d.chase ? 'Brisket is running ' + side + ' to cover your drift. Watch for the opening.' :
          'Wait for the mint arrow. Brisket is stepping under your landing.';
      } else if (name === 'juggleCue') {
        label = d.chase ? 'Choose your drift now' : 'Flick ' + side + ' now';
        message = d.chase ? 'Try the same drift, then retry and cut back behind Brisket.' :
          'Press ' + side + ' from neutral and hold to drift past Crown Lift.';
      } else if (name === 'tumbleWiggle') {
        label = 'Tumble broken · drift free';
        message = 'Keep steering. You can still jump, air dodge, fast-fall or attack.';
      } else if (name === 'juggleResult') {
        label = { clean:'Clean landing · jump and dodge saved', juggled:(moves[d.finisher]?.label || 'Brisket') + ' caught you', downed:'Knocked down',
          landed:'Landed on your feet', counter:'Counterhit', tech:'Teched the landing', ledge:'Caught the ledge', out:'Ring-out' }[e.outcome];
        message = d.chase ? 'Retry and reverse your drift as Brisket runs out. He has to commit to the chase.' :
          'Choose Chase the drift to see how Brisket can cover the same escape.';
      } else return;
      result.dataset.result = e.outcome || name;
      result.textContent = label;
      tip.textContent = message;
      return;
    } else if (name === 'launchDI') {
      label = 'Tap Shield before landing';
      message =
        'The dashed gold line shows the original launch. The solid aqua line shows yours. Hold a side at landing to tech roll.';
    } else if (name === 'tech') {
      label = e.dir ? 'Tech roll ' + (e.dir < 0 ? 'left' : 'right') : 'Tech in place';
      message = 'Clean landing. Choose Launch practice to try the same throw again.';
    } else if (name === 'knockdown') {
      label = 'Missed tech';
      message = 'Tap Attack to sweep, tap a side to roll, or tap Up or Jump to stand.';
    } else if (name === 'getup') {
      label =
        e.type === 'floorAttack'
          ? moves[e.f.kit.floorAttack].label
          : e.dir
            ? 'Get-up roll ' + (e.dir < 0 ? 'left' : 'right')
            : 'Stand up';
      message = 'Choose Launch practice to retry. Tap Shield shortly before your paws touch down.';
    } else if (name === 'tumbleEscape' || name === 'ko') {
      label = name === 'ko' ? 'Ring-out' : e.option;
      message = 'Choose Launch practice to take the throw again.';
    } else return;
    result.dataset.result = name;
    result.textContent = label;
    tip.textContent = message;
  }
  function airFeedback(name, e) {
    const result = $('air-status');
    if (e.pattern === 'interrupted') {
      const phase = name === 'airStart' ? 'approach' : e.phase || e.outcome;
      const move = specials[world.dogs[0].kit.specials.up].label;
      result.dataset.result = phase;
      result.textContent = {approach:'Noodle is covering the ledge',clipped:'Knot Poke · Up Special restored',
        cast:'Cast again now',return:move + ' · second attempt',saved:'Recovered after the hit',
        returned:'Back onstage',miss:'Stock lost',hit:'Grabbed',interrupted:'Guard caught'}[phase];
      if (phase === 'cast') $('recovery-tip').textContent = 'Aim up toward the stage and press Special again for ' + move + '.';
      if (phase === 'miss') $('recovery-tip').textContent = 'Choose Interrupted return to retry. Release Special after your first cast so you can press it again.';
      return;
    }
    if (e.pattern === 'lastDodge') {
      if (name === 'airStart') {
        result.dataset.result = 'approach';
        result.textContent = 'Returning';
      } else {
        result.dataset.result = e.outcome;
        result.textContent = {ledge:'Caught the ledge',land:'Back onstage',miss:'Fell short'}[e.outcome];
        $('recovery-tip').textContent = e.outcome === 'miss' ? (world.airPractice.wide ?
          'Aim straight inward for the full horizontal distance. Choose Last dodge to retry.' :
          'Aim up and inward together, then tap Shield. Choose Last dodge to retry.') :
          'Try the other starting point, or guard this ledge against Rival in a stock match.';
      }
      return;
    }
    if (name === 'airStart') {
      result.dataset.result = 'approach';
      result.textContent = e.pattern === 'edge' ? 'Guard at the ledge' : 'Watch your landing';
      return;
    }
    if (name === 'airCue') {
      result.dataset.result = 'swing';
      result.textContent = moves[e.moveId].label;
      return;
    }
    result.dataset.result = e.outcome;
    const labels = {
      evade: e.evaded === 'neutralAirDodge' ? 'Dodged in place' : 'Dodged the strike',
      ledge: 'Caught the ledge',
      land: 'Back onstage',
      hit: 'Hit',
      interrupted: 'Interrupted',
      miss: 'Missed',
    };
    result.textContent = labels[e.outcome];
    if (e.outcome === 'hit')
      $('recovery-tip').textContent =
        e.pattern === 'neutral'
          ? 'Tap Shield before the up tilt reaches you. Choose In place to try again.'
          : 'Start your dodge as the guard winds up. Choose At the ledge to retry.';
    else if (e.outcome === 'ledge' || e.outcome === 'land')
      $('recovery-tip').textContent =
        (e.evaded ? 'You slipped the guard’s strike. ' : '') +
        (e.outcome === 'ledge'
          ? 'Tap Shield again to roll onstage, or tap Attack.'
          : 'Choose At the ledge to retry, or switch sides.');
    else $('recovery-tip').textContent = 'Choose In place or At the ledge to try another approach.';
  }
  function rollFeedback(name, e) {
    const result = $('roll-status');
    if (name === 'ledgeRoll') {
      result.dataset.result = 'active';
      result.textContent = world.rollPractice.pattern === 'read' ? 'Watch for the grab' : 'Swing at the lip';
      return;
    }
    const labels = {
      passed: 'Past the guard',
      counter: 'Counter connected',
      caught: world.rollPractice.rolled ? 'Roll caught' : 'Grabbed',
      hit: 'Hit',
      clear: 'Guard missed',
    };
    result.dataset.result = e.outcome;
    result.textContent = labels[e.outcome];
    const tips = {
      passed: e.evaded
        ? 'You rolled through the swing. Try Attack as your dog turns back.'
        : 'You cleared the guard. Choose Read the roll to face a waiting grab.',
      counter: 'Your follow-up connected. Choose Close guard to try the timing again.',
      caught: world.rollPractice.rolled
        ? 'The guard waited at the end of your roll. Try jumping from the same ledge.'
        : 'The guard caught you. Choose the same pattern to try another ledge option.',
      hit: 'The strike caught you. Choose Close guard and tap Shield from the ledge.',
      clear: 'The guard missed. Choose either pattern to try another ledge option.',
    };
    $('recovery-tip').textContent = tips[e.outcome];
  }
  function trumpFeedback(name, e) {
    const drill = world.trumpPractice;
    const player = world.dogs[0];
    const status = $('trump-status');
    let result, label, tip;
    if (name === 'ledgeTrump') {
      if (e.target === player) {
        result = 'lost';
        label = 'Bumped off';
        tip = 'You can still jump or use Up + Special. Catching the lip again leaves you open to a hit.';
      } else if (!e.f.ledge.protectedCatch) {
        result = 'regrab';
        label = 'Vulnerable regrab';
        tip = 'You took the ledge back. Roll, jump or attack before the rival reaches you.';
      } else {
        result = 'won';
        label = 'Ledge trump';
        tip =
          'You bumped the other dog off. To try a regrab, tap Down to drop, then jump back toward the lip.';
      }
    } else if (name === 'ledge' && !e.trump && e.f === player && !e.protectedCatch) {
      result = 'regrab';
      label = 'Vulnerable regrab';
      tip = 'You caught the ledge again. Land or take a hit to restore protection for your next catch.';
    } else if (name === 'ledge' && !e.trump && e.f === player && e.protectedCatch) {
      result = 'safe';
      label = 'Protected catch';
      tip = 'You caught a free ledge with fresh protection. Choose either role to try the contest again.';
    } else if (
      name === 'ledge' &&
      !e.trump &&
      e.protectedCatch &&
      e.f.index === 1 &&
      drill.role === 'defend' &&
      drill.phase === 'caught'
    ) {
      result = 'clear';
      label = 'Cleared the ledge';
      tip = 'You left the lip before the rival arrived. Choose Defend the ledge to try a different exit.';
    } else if (name === 'hit' && e.f.index === 1 && drill.phase === 'intercepted') {
      result = 'intercepted';
      label = 'Recovery intercepted';
      tip = 'Your attack reached the rival before they caught the ledge.';
    } else if (
      name === 'ko' &&
      e.f === player &&
      (drill.phase === 'approach' || status.dataset.result === 'lost')
    ) {
      result = 'miss';
      label = 'Missed the ledge';
      tip = 'Choose Take the ledge or Defend the ledge to retry.';
    } else return;
    status.dataset.result = result;
    status.textContent = label;
    $('recovery-tip').textContent = tip;
  }
  function waveFeedback() {
    const d = world.wavePractice, back = d.pattern === 'back', [f, rival] = world.dogs;
    const side = (back ? -d.dir : d.dir) > 0 ? 'right' : 'left';
    const grab = grabs[rival.kit.grab].label;
    const status = $('wave-status'), tip = $('wave-tip');
    const bar = $('wave-recovery');
    bar.hidden = back || d.phase === 'done';
    status.dataset.result = d.outcome || d.phase;
    if (d.phase === 'ready') {
      bar.max = f.kit.airDodge.directional[3];
      bar.value = 0;
      bar.classList.remove('ready');
      status.textContent = back ? 'Slip past ' + grab : 'Catch the shield';
      tip.textContent = (back ? 'Tap Jump, then aim down-' : 'Aim down-') + side + ' and tap Shield. ' +
        (back ? 'Release the direction to keep facing the grab.' : 'Release the direction and tap Grab as your paws settle.');
    } else if (d.phase === 'active') {
      status.textContent = f.lastMove;
      tip.textContent = back ? 'Release the direction to keep facing the rival.' : 'Tap Grab as the slide ends.';
    } else {
      const result = {
        clear: ['Grab whiffed', 'You slid back and kept facing ' + rival.stats.name + '.'],
        caught: ['Caught by ' + grab, 'Dodge diagonally away just after jumping.'],
        grabbed: ['Shield caught', grabs[f.kit.grab].label + ' reached the shield. Aim now to throw.'],
        otherGrab: ['Grab connected', 'Try landing with a diagonal dodge before the catch.'],
        otherDodge: ['Grab missed', 'Try clearing it with a backward wavedash.'],
        short: ['Grab fell short', 'Dodge toward the shield and grab as you finish sliding.'],
        missedFloor: ['Missed the platform', 'Aim the diagonal onto the platform.'],
        late: ['Time up', 'Choose the exercise again to retry.'],
      }[d.outcome];
      status.textContent = result[0] + (d.distance ? ' · ' + d.distance + ' px slide' : '');
      tip.textContent = result[1];
    }
  }
  function drill(ledge, fromHang = false, pattern = 'strike', direction, study) {
    if (!world) return;
    setFrameMode('live');
    const launch = ledge === 'launch';
    const breakaway = launch && pattern === 'breakaway';
    const juggle = launch && pattern === 'juggle';
    const baitSweep = launch && (pattern === 'bait' || pattern === 'baitBack');
    const chase = launch && (pattern === 'attack' || pattern === 'defend' || baitSweep);
    const stock = launch && (pattern === 'stockReturn' || pattern === 'stockCatch');
    const survival = launch && (pattern === 'survival' || pattern === 'lastStock');
    const meteor = launch && (pattern === 'spikeFloor' || pattern === 'spikeEdge');
    const wall = ledge === 'wall';
    const shield = ledge === 'shield';
    const footwork = ledge === 'footwork';
    const edge = ledge === 'edge';
    const freshness = ledge === 'freshness';
    const wave = ledge === 'wave';
    const combo = ledge === 'combo';
    const partner = ledge === 'partner';
    const spacing = ledge === 'spacing';
    const escape = ledge === 'escape';
    const platform = ledge === 'platform';
    const air = ledge === 'air';
    const roll = ledge === 'roll';
    const climb = ledge === 'climb';
    const trump = ledge === 'trump';
    drillSide = launch || wall || shield || footwork || edge || freshness || wave || combo || partner || spacing || escape || platform || air || roll || climb || trump ? null : ledge || null;
    drillWaiting = !!drillSide;
    if (drillSide) practiceSide = drillSide;
    view = new FightView($('blast-radar'));
    view.shakeEnabled = settings.shake;
    if (chase) world.resetChasePractice(pattern, direction ?? world.chasePractice?.dir ?? 1, world.chasePractice?.slow ?? true);
    else if (meteor) world.resetMeteorPractice(pattern, direction ?? world.meteorPractice?.dir ?? 1,
      world.meteorPractice?.slow ?? true, study === 'impact' ? 185 : world.meteorPractice?.baseline ?? 100);
    else if (stock) world.resetStockPractice(pattern, direction ?? world.stockPractice?.dir ?? 1, world.stockPractice?.slow ?? true);
    else if (survival) world.resetSurvivalPractice(direction ?? world.survivalPractice?.dir ?? 1, world.survivalPractice?.slow ?? true,
      world.survivalPractice?.baseline, study, pattern);
    else if (juggle || breakaway) world.resetLaunchPractice(pattern, direction ?? world.launchPractice?.dir ?? 1,
      world.launchPractice?.slow ?? true, breakaway ? !!world.launchPractice?.late : !!world.launchPractice?.chase);
    else if (launch) world.resetLaunchPractice();
    else if (combo) world.resetComboPractice(pattern, direction ?? world.comboPractice?.reply ?? 'stand',
      world.comboPractice?.slow ?? true, study ?? world.comboPractice?.slot ?? 0);
    else if (wave) world.resetWavePractice(pattern, direction ?? world.wavePractice?.dir ?? 1, world.wavePractice?.slow ?? true);
    else if (edge) world.resetEdgePractice(pattern, direction ?? world.edgePractice?.dir ?? 1, world.edgePractice?.slow ?? true);
    else if (freshness) {
      const lab = world.freshnessPractice;
      if (pattern === 'drive' && lab?.drive) world.resetFreshnessPractice();
      else if (pattern === 'drive' || (lab?.drive && ['repeat','edge','percent'].includes(pattern))) {
        const edge = lab?.drive?.edge ?? false;
        const damage = lab?.drive ? lab.baseline : 0;
        world.resetDrivePractice(pattern === 'edge' ? !edge : edge, pattern === 'percent' ? (damage ? 0 : 60) : damage);
      } else if (pattern === 'rage' || (lab?.rageDamage != null && pattern !== 'ko')) {
        if (pattern === 'rage' && lab?.rageDamage != null) world.resetFreshnessPractice();
        else {
          const ownDamage = pattern === 'percent' ? (lab.rageDamage ? 0 : 150) : lab?.rageDamage ?? 0;
          world.resetFreshnessPractice(true, false, true, undefined, ownDamage);
        }
      } else world.resetFreshnessPractice(pattern === 'repeat' || pattern === 'guard',
        pattern === 'guard' ? !lab.guard : pattern === 'ko' ? false : lab?.guard ?? false,
        pattern === 'ko' ? !lab?.koTest : lab?.koTest ?? false);
    }
    else if (footwork) world.resetFootworkPractice(pattern, pattern === 'bait' ? 1 : direction ?? world.footworkPractice?.dir ?? 1,
      world.footworkPractice?.pattern !== 'bait' ? world.footworkPractice?.slow ?? true : true);
    else if (spacing) {
      if ((pattern === 'sweet' || pattern === 'sweetAligned') && !isSweetPractice(world.spacingPractice)) showContactBoxes(true);
      world.resetSpacingPractice(pattern, direction ?? world.spacingPractice?.dir ?? 1,
        world.spacingPractice?.slow ?? true, world.spacingPractice?.pattern === 'wavebounce' ? world.spacingPractice.guard : true);
    }
    else if (escape) world.resetEscapePractice(pattern, world.escapePractice?.slow ?? true, world.escapePractice?.baseline);
    else if (platform) world.resetPlatformPractice(pattern, world.platformPractice?.slow ?? true);
    else if (wall) world.resetWallPractice(pattern, direction === 'impact' ? '' : direction, direction === 'impact');
    else if (shield) world.resetShieldPractice(pattern, direction ?? world.shieldPractice?.worn ?? true, study?.choice, study?.dir);
    else if (air) world.resetAirPractice(pattern, practiceSide,
      pattern === 'lastDodge' && (direction ?? world.airPractice?.wide ?? false),
      study ?? (world.airPractice?.pattern === 'interrupted' ? world.dogs[0].kind : undefined));
    else if (roll) world.resetLedgeRollPractice(pattern, practiceSide);
    else if (climb) world.resetClimbPractice(pattern, practiceSide, world.climbPractice?.slow ?? true);
    else if (trump) world.resetLedgeTrumpPractice(pattern, practiceSide);
    else {
      world.resetTraining(partner ? false : ledge, fromHang);
      world.trainingPartner = partner;
    }
    $('partner-training').setAttribute('aria-pressed',String(partner));
    $('moment-save').hidden = $('moment-retry').hidden = !!ledge && !partner;
    const player = world.dogs[0];
    document.body.classList.toggle('with-drill-readout', freshness || wave || combo);
    $('combo-readout').hidden = $('combo-controls').hidden = !combo;
    $('freshness-readout').hidden = $('freshness-controls').hidden = !freshness;
    $('wave-readout').hidden = $('wave-patterns').hidden = !wave;
    const counterDrill = escape && (pattern === 'counter' || pattern === 'gripEscape');
    showDamageControl(counterDrill || meteor || survival || !!world.comboPractice?.defending, freshness && world.freshnessPractice.koTest,
      meteor || survival ? 'launch-side' : world.edgePractice?.timeCatch ? 'edge-side' : combo ? 'reset-training' : undefined, world.hasSecondPlayer);
    $('damage-control').hidden = stock || juggle || breakaway || (escape && pattern === 'carry');
    $('dummy-damage').value = survival ? world.survivalPractice.baseline : meteor ? world.meteorPractice.baseline : counterDrill ? world.escapePractice.baseline : world.trainingDamage;
    $('damage-output').textContent = $('dummy-damage').value + '%';
    $('match-stage').textContent = arenas[world.stage].name;
    hudKey = '';
    const result = $('launch-status');
    result.hidden = !launch;
    $('launch-patterns').hidden = !launch;
    $('juggle-chase').hidden = !juggle;
    $('breakaway-pause').hidden=$('breakaway-late').hidden=!breakaway;
    if (breakaway) {
      $('breakaway-pause').setAttribute('aria-pressed',String(world.launchPractice.pauseAtWindow));
      $('breakaway-late').setAttribute('aria-pressed',String(world.launchPractice.late));
    }
    if (juggle) $('juggle-chase').setAttribute('aria-pressed', String(world.launchPractice.chase));
    const launchOptions = world.survivalPractice || world.stockPractice || world.meteorPractice || world.chasePractice ||
      ((juggle || breakaway) && world.launchPractice);
    $('launch-side').hidden = $('launch-slow').hidden = !launchOptions;
    $('launch-study').hidden = !survival;
    $('launch-study').setAttribute('aria-pressed', String(!!world.survivalPractice?.study));
    if (launch) {
      $('launch-throw').setAttribute('aria-pressed', String(!launchOptions));
      $('launch-juggle').setAttribute('aria-pressed', String(juggle));
      $('launch-breakaway').setAttribute('aria-pressed',String(breakaway));
      $('launch-survival').setAttribute('aria-pressed', String(pattern === 'survival'));
      $('launch-last-stock').setAttribute('aria-pressed', String(pattern === 'lastStock'));
      $('launch-stock-return').setAttribute('aria-pressed', String(pattern === 'stockReturn'));
      $('launch-stock-catch').setAttribute('aria-pressed', String(pattern === 'stockCatch'));
      $('launch-floor-spike').setAttribute('aria-pressed', String(pattern === 'spikeFloor'));
      $('launch-edge-spike').setAttribute('aria-pressed', String(pattern === 'spikeEdge'));
      $('launch-lock').setAttribute('aria-pressed', String(chase && pattern === 'attack'));
      $('launch-escape').setAttribute('aria-pressed', String(chase && pattern === 'defend'));
      $('launch-bait').setAttribute('aria-pressed', String(baitSweep));
      $('launch-behind').hidden = !baitSweep;
      $('launch-behind').setAttribute('aria-pressed', String(pattern === 'baitBack'));
      if (launchOptions) $('launch-slow').setAttribute('aria-pressed', String(launchOptions.slow));
    }
    $('edge-status').hidden = $('edge-patterns').hidden = !edge;
    $('footwork-status').hidden = $('footwork-patterns').hidden = !footwork;
    $('spacing-status').hidden = $('spacing-patterns').hidden = !spacing;
    $('escape-status').hidden = $('escape-patterns').hidden = !escape;
    $('platform-status').hidden = $('platform-patterns').hidden = !platform;
    $('wall-status').hidden = $('wall-patterns').hidden = !wall;
    $('shield-status').hidden = $('shield-patterns').hidden = !shield;
    $('air-status').hidden = $('air-patterns').hidden = !air;
    $('roll-status').hidden = $('roll-patterns').hidden = !roll;
    $('climb-status').hidden = $('climb-patterns').hidden = !climb;
    $('trump-status').hidden = $('trump-patterns').hidden = !trump;
    let message = 'Positions reset.';
    if (combo) {
      const d = world.comboPractice;
      $('combo-reply').value = d.reply;
      $('combo-fight-pip').hidden = d.source !== 'flurry' && d.source !== 'escapeFlurry';
      $('combo-slot').value = String(d.slot);
      $('combo-reply-label').hidden = $('combo-reply').hidden = d.defending;
      $('combo-slow').setAttribute('aria-pressed', String(d.slow));
      for (const source of Object.keys(comboSources))
        $('combo-' + source).setAttribute('aria-pressed', String(d.source === source));
      const route = { pip: 'Attack, Attack, then Jump + Forward + Attack.', brisket: 'Attack, then Grab. Tap forward to throw.',
        noodle: 'Attack twice, then tap neutral Special.', clover: 'Attack twice, then Jump + Attack.' }[player.kind];
      message = d.source === 'flurry' ? 'Tap Attack once. When Quick Paw hits, press Attack again and hold through Cross. Release during Speed Bag for Bell Kick. Try Flick away as the rival’s response.'
        : d.source === 'escapeFlurry' ? 'You control ' + world.dogs[1].stats.name + '. Tap Attack to start. Let Pip hit you once, then flick away during the spark. Re-center between hits to shift again.'
        : d.defending ? 'You control ' + world.dogs[1].stats.name + '. Tap Attack to start. ' +
        (d.source === 'mix' ? 'Each try picks either take. Watch the rival and choose your response.' :
          world.comboTakes[d.slot]?.length ? 'Try shielding, escaping or hitting back against your recording.' :
          d.slot ? 'Hold Shield once. On the next try, spot-dodge just before the rival lands and punish the missed grab.' :
          'Hold Shield through the falling aerial, then try punishing the landing.') :
        d.reply === 'p2' ? 'P2 plays the defender live. Record P1’s opening, then replay it to try a different response.' :
        d.reply === 'punish' ? 'The rival holds Shield. Try a side smash up close, then try hitting at the tip. Watch for the counter after a blocked smash or landing.' :
        d.source === 'record' ? 'Take ' + takeLetter(d.slot) + ' records 2½ seconds from your first input. ' + route :
        d.source === 'late' ? 'The second jab is delayed. Change the rival’s reply to see who can use the opening.' :
        d.source === 'replay' ? 'Replaying your inputs. Change the rival’s reply to compare.' : route + ' Change the rival’s reply to test the same inputs.';
    } else if (wave) {
      const d = world.wavePractice;
      $('wave-back').setAttribute('aria-pressed', String(d.pattern === 'back'));
      $('wave-platform').setAttribute('aria-pressed', String(d.pattern === 'platform'));
      $('wave-slow').setAttribute('aria-pressed', String(d.slow));
      waveFeedback();
      message = $('wave-tip').textContent;
    } else if (freshness) {
      const lab = world.freshnessPractice;
      const rageTest = lab.rageDamage != null;
      $('freshness-ko').hidden = $('freshness-guard').hidden = $('freshness-clear').hidden =
        $('freshness-history').hidden = rageTest || !!lab.drive;
      $('freshness-rage').hidden = !!lab.drive;
      $('freshness-drive').setAttribute('aria-pressed', String(!!lab.drive));
      $('freshness-edge').hidden = $('freshness-fight').hidden = !lab.drive;
      $('freshness-edge').textContent = lab.drive?.edge ? 'Move to center' : 'Move to ledge';
      $('freshness-percent').hidden = !rageTest && !lab.drive;
      $('freshness-percent').textContent = 'Set yourself to ' + (lab.rageDamage ? 0 : 150) + '%';
      $('freshness-rage').setAttribute('aria-pressed', String(rageTest));
      $('freshness-ko').setAttribute('aria-pressed', String(lab.koTest && !rageTest));
      $('freshness-guard').setAttribute('aria-pressed', String(lab.guard));
      message = lab.drive ? 'Tap Smash for ' + smashes[world.dogs[0].kit.smashes.side].label +
        '. Hold and release to charge. Try the same swing from the ledge or against a hurt rival.' :
        rageTest ? 'Fully charge Up + Smash and release. Switch your own damage and repeat. The mint trail follows the last launch.' :
        lab.koTest ? 'Fully charge Up + Smash, release, then choose Return to marks. The mint trail shows your previous launch.' :
        'Land a hit, choose Return to marks, and repeat. Mix in other moves to restore its power.';
    } else if (spacing) {
      const practice = world.spacingPractice, approach = pattern === 'approach';
      const run = practice.dir > 0 ? 'right' : 'left', back = practice.dir > 0 ? 'left' : 'right';
      const key = keyFor(0,practice.dir > 0 ? 'aimLeft' : 'aimRight');
      $('spacing-approach').setAttribute('aria-pressed', String(approach));
      $('spacing-retreat').setAttribute('aria-pressed', String(pattern === 'retreat'));
      $('spacing-landing').setAttribute('aria-pressed', String(pattern === 'landing'));
      $('spacing-airPower').setAttribute('aria-pressed', String(pattern === 'airPower'));
      $('spacing-fastfall').setAttribute('aria-pressed', String(pattern === 'fastfall'));
      $('spacing-apex-pause').hidden = pattern !== 'fastfall';
      $('spacing-apex-pause').setAttribute('aria-pressed', String(!!practice.pauseAtApex));
      $('spacing-sweet').setAttribute('aria-pressed', String(isSweetPractice(practice)));
      $('spacing-aligned').hidden = !isSweetPractice(practice);
      $('spacing-aligned').setAttribute('aria-pressed', String(pattern === 'sweetAligned'));
      $('spacing-flick').hidden = pattern !== 'landing';
      $('spacing-flick').setAttribute('aria-pressed', String(practice.flickJump ?? settings.flickJump1));
      $('spacing-cancel').setAttribute('aria-pressed', String(pattern === 'cancel'));
      for (const id of ['footstool','footstoolTech']) $('spacing-' + id).setAttribute('aria-pressed', String(pattern === id));
      $('spacing-reverse').setAttribute('aria-pressed', String(pattern === 'reverse'));
      $('spacing-wavebounce').setAttribute('aria-pressed', String(pattern === 'wavebounce'));
      $('spacing-guard').hidden = pattern !== 'wavebounce';
      $('spacing-guard').setAttribute('aria-pressed', String(!!practice.guard));
      $('spacing-slow').setAttribute('aria-pressed', String(practice.slow));
      $('spacing-status').dataset.result = 'ready';
      $('spacing-status').textContent = isFootstoolPractice(practice) ? (pattern === 'footstool' ? 'Footstool rescue' : 'Tech a footstool') :
        pattern === 'cancel' ? 'Down + Attack' : isReversalPractice(practice) ? (pattern === 'reverse' ? 'Rival behind' : 'Rival ahead') :
        pattern === 'landing' ? 'Hop or Jump · hold ' + run : approach ? 'Jump past the shield' : 'Jump away from the shield';
      message = isFootstoolPractice(practice) ? (pattern === 'footstool' ?
        'Your jumps are spent. Tap Attack to fall, then press Jump at the mint marks over the rival’s head. Hold Jump and steer ' + run + ' to the ledge.' :
        'Tap Attack to start. The rival will jump off your head. Tap Shield before you hit the floor to tech, or add a direction for a tech roll.') :
        pattern === 'cancel' ? 'Press Down + Attack. Try holding Shield only after touchdown. On the retry, start holding it as the chalk turns mint.' :
        isReversalPractice(practice) ? reversalTip(practice) : pattern === 'landing' ? 'Hold Hop ('+keyFor(0,'hop')+', '+padFor(0,'hop')+', or Hop on touch) and move ' + run + '. Attack at the gold fork for a late hit or the green stripe for a clean hit. Center and jab on landing. Retry with Jump to compare heights.' : 'Running ' + run + '. ' + (approach
        ? 'Press ' + back + ' and Jump together to turn. Steer ' + run + ' and tap Attack during takeoff.'
        : 'Keep drifting ' + run + '. Tap Jump and aim your back air ' + back + ' with ' + key + ', the right stick, or a flick from Smash.');
      if (pattern === 'landing' && (practice.flickJump ?? settings.flickJump1)) message = flickJumpTip;
      if (pattern === 'airPower') {
        $('spacing-status').textContent = 'Hold Hop or Jump';
        message = 'Hold Hop for a short hop or hold Jump for a full jump. Keep the stick centered. Tap Attack as your paws come down to the chalk beside the rival’s ears.';
      }
      if (pattern === 'fastfall') {
        $('spacing-status').textContent = moves[player.kit.air.neutral].label + ' · tap Attack';
        message = 'You’re rising into Pip’s shield. Tap Attack with no direction. At the apex, hold Shield for an ordinary fall or tap Down and hold Shield to land sooner.';
      }
      if (isSweetPractice(practice)) {
        const move = moves[practice.moveId], aim = practice.side === 'up' ? 'Up' : run;
        $('spacing-status').textContent = move.label + ' · ' + aim + ' + Attack';
        message = 'Aim ' + aim + ' and tap Attack. The gold box marks ' + move.sweetSpot.label.toLowerCase() +
          '. Catch the rival’s mint center in it for the sweet spot.';
      }
    } else if (climb) {
      const trap = pattern === 'trap', inward = practiceSide === 'left' ? 'right' : 'left';
      for (const role of ['escape','trap','rise','coverRise','patience'])
        $('climb-' + role).setAttribute('aria-pressed', String(pattern === role));
      $('climb-slow').setAttribute('aria-pressed', String(world.climbPractice.slow));
      $('climb-status').dataset.result = 'ready';
      $('climb-status').textContent = practiceSide === 'left' ? 'Left ledge' : 'Right ledge';
      message = pattern === 'patience' ? 'Tap Attack to start. Hang below Brisket’s charge. ' + ledgeTrapCounterTip(world.dogs[0]) :
        pattern === 'rise' ? 'Tap Down + Jump to spring from below the lip. Release Down, hold ' + inward + ' and tap Attack. Land onstage after the hit.' :
        pattern === 'coverRise' ? 'Hold Shield or tap Attack to start. Watch the rival spring from below and swing. Block, parry, or intercept the return.' :
        trap ? 'Tap Attack to start. Watch the rival’s paws touch down, then tap Attack again to catch the climb.'
        : 'Press ' + inward + ' to climb. Release the direction and hold Shield as your dog stands up.';
    } else if (platform) {
      const below = pattern === 'below', hold = pattern === 'hold';
      const drop = pattern === 'shield-drop', ferry = pattern === 'ferry';
      const layers = pattern === 'layers';
      for (const id of ['below','top','hold','shield-drop','ferry','layers']) $('platform-' + id).setAttribute('aria-pressed', String(pattern === id));
      $('platform-slow').hidden = !(drop || ferry || layers);
      $('platform-slow').setAttribute('aria-pressed', String(!!world.platformPractice.slow));
      $('platform-status').dataset.result = 'ready';
      $('platform-status').textContent = layers ? 'Jump from the chalk' : ferry ? 'Challenger on the gate' : drop ? 'Hold Shield to start' : hold ? 'Defend the high platform' : below ? 'Rival below' : 'Rival on top';
      message = layers ? 'Jump straight up. At the apex, tap Down and release to land on top, or hold it to pass through. Watch for the second perch below.'
        : ferry ? 'Tap Attack to send the ferry left. Watch the challenger jump from the gate. Block the rising aerial or drop through and strike first.'
        : drop ? 'Hold Shield. When the rising aerial hits your shield, keep holding it, flick down-right and tap Attack for ' + moves[player.kit.air.down].label + '.'
        : hold ? 'Tap Attack to start. Watch the right wing. Shield the rising aerial or intercept the second jump.'
        : below
        ? 'Tap Down to drop. As your paws pass the platform, aim down and tap Attack for ' + moves[player.kit.air.down].label + '.'
        : 'Press Down and Attack together for ' + moves[player.kit.tilts.down].label + '. Keep both paws on the platform.';
    } else if (escape) {
      for (const id of ['tip','close','counter','break','gripEscape','gripThrow','carry']) $('escape-' + id).setAttribute('aria-pressed', String(id === pattern));
      $('escape-slow').setAttribute('aria-pressed', String(world.escapePractice.slow));
      $('escape-status').dataset.result = 'ready';
      if (world.escapePractice.gripDrill) {
        escapeFeedback({phase:'ready'});
        message = $('recovery-tip').textContent;
      } else if (pattern === 'counter') {
        message = crouchCounterPrompt();
      } else if (pattern === 'break') {
        $('escape-status').textContent = 'Rival crouching';
        message = 'Try a light hit and watch for the low tilt. Retry with a grab and throw or a stronger launcher.';
      } else {
        $('escape-status').textContent = 'Rim Rattle';
        message = 'Tap Attack to start. Watch Clover’s disc, then flick left on the first hit spark.';
      }
    } else if (edge) {
      const d = world.edgePractice, side = d.dir > 0 ? 'right' : 'left';
      for (const id of ['lip','shortCatch','longCatch','tip','deep','corner','inside']) $('edge-' + id).setAttribute('aria-pressed', String(id === d.pattern));
      $('edge-slow').setAttribute('aria-pressed', String(d.slow));
      $('edge-status').dataset.result = 'ready';
      $('edge-status').textContent = d.corner ? (pattern === 'corner' ? 'At the lip' : 'One step in') + ' · hold Shield' :
        d.timeCatch ? (pattern === 'longCatch' ? 'Long recovery' : 'Short recovery') + ' · tap Attack to start' :
        pattern === 'lip' ? 'Guard the ' + side + ' ledge' : 'Drifting ' + side + ' · tap Attack';
      message = d.corner ? 'Hold Shield through the charged smash. Compare the two floor marks, then try releasing Shield when the chalk turns mint.' :
        d.timeCatch ? 'Tap Attack to send the rival toward the ledge. Watch the last grip mark turn gold. Time Down + Attack to hit as it disappears.' :
        pattern === 'lip' ? 'Walk ' + side + ' to the chalk (P1: Shift + direction, or slide from the center dot). When the rival lets go, tap Down + Attack.' :
        'Tap Attack with the directions released for ' + moves[player.kit.air.neutral].label + '. Coast through the landing. If you slip off, tap Down + Attack.';
    } else if (footwork) {
      const practice = world.footworkPractice;
      for (const id of footworkPatterns)
        $('footwork-' + id).setAttribute('aria-pressed', String(practice.pattern === id));
      $('footwork-side').hidden = $('footwork-slow').hidden = pattern === 'bait';
      $('footwork-slow').setAttribute('aria-pressed', String(practice.slow));
      $('footwork-pause').hidden = practice.pauseOnWindup === undefined;
      $('footwork-pause').setAttribute('aria-pressed', String(!!practice.pauseOnWindup));
      $('footwork-status').dataset.result = 'ready';
      $('footwork-status').textContent = {
        brake: 'Brake at the chalk', pivot: 'Catch the chase', antiAir: 'Catch the landing',
        dashShield:'Run to the chalk',
        angleHigh: 'Tag the hop', angleLow: 'Clip the recovery',
        cancelDash:'Catch the hop from a run', cancelTurn:'Turn away, then swing back',
        boostGrab:'Shield just beyond dash-grab range', boostPivot:'Rival behind your run',
        bait: 'Bait Bear Hug', match: 'Clash jabs', power: 'Bolt Kick vs. Body Check', disc: 'Bat Round Trip',
        reflect:'Pip · tap Attack to start', returnFire:'Clover · tap neutral Special',
        crawl:'Noodle · get under Round Trip',
        armor:'Brisket · punch through a jab', armorGrab:'Pip · catch the shoulder',
      }[pattern];
      const discInput = player.kind === 'noodle' ? 'aim toward Clover and tap Attack' : 'tap Attack';
      const diagonal = (pattern === 'angleLow' ? 'down-' : 'up-') + (practice.dir > 0 ? 'right' : 'left');
      const angleTip = 'Tap Attack to start the swing. Aim ' + diagonal +
        ' with '+keyFor(0,'walk')+' on keyboard, slide from the center dot on touch, or tilt the stick sideways with a little vertical aim. Repeat with level aim to compare.';
      message = {
        cancelDash:'You’re already running. Hold ' + (practice.dir > 0 ? 'Right' : 'Left') +
          ' and tap Attack for a dash attack. Immediately press Up + Jump to catch the rival above you.',
        cancelTurn:'Tap ' + (practice.dir > 0 ? 'Left' : 'Right') + ' + Attack to start a tilt facing away. Immediately press ' +
          (practice.dir > 0 ? 'Right' : 'Left') + ' + Jump to swing a back air toward the rival.',
        angleHigh: angleTip, angleLow: angleTip,
        boostGrab:'You’re running. Tap Grab once to test its reach. Retry with Attack, then tap Grab as the windup begins.',
        boostPivot:'You’re running away from the rival. Tap Attack, then press back and tap Grab to reach behind you.',
        antiAir: 'Run ' + (practice.dir > 0 ? 'right' : 'left') + ' to the chalk as the rival hops. Hold Up and tap Jump + Smash together. Hold Smash longer to compare.',
        brake: 'Run ' + (practice.dir > 0 ? 'right' : 'left') + ' to the chalk. Release forward for a beat, then press forward and tap Attack together. Compare that with holding forward and tapping Attack.',
        dashShield:'Run ' + (practice.dir > 0 ? 'right' : 'left') + ' to the chalk. Keep forward held and add Shield when Brisket swings. Tap Grab on the block to catch him before he jumps away.',
        pivot: 'Run ' + (practice.dir > 0 ? 'right' : 'left') + ' to the chalk with the rival on your heels. Press back and tap Attack together to catch them during your skid.',
        bait: 'Dash right to the chalk, then reverse. When Brisket misses his grab, dash back in and tap Attack. Choose Footwork practice to retry.',
        match: 'Tap Attack to start the count. On the third chalk light, tap Attack again to meet the other dog’s jab.',
        power: 'You’re Pip. Tap Attack to start and immediately hold Smash. Release on the third light to kick through Brisket’s Body Check.',
        armor:'Tap Attack to start, then hold Smash. Release on the third light. Pip will jab as Brisket plants his feet.',
        armorGrab:'Tap Attack to start the count. Try a jab on the third light. Retry and tap Grab on the same beat to catch Brisket.',
        disc: 'Tap Attack to start. Clover throws Round Trip. On the third light, ' + discInput + ' to bat the disc away.',
        reflect:'Tap Attack to call for the throw. When Clover releases Round Trip, tap Special with the directions released. Catch the disc on the second bark.',
        returnFire:'Tap Special with the directions released. Pip is watching your throw. Hold Shield when you hear the second bark send the disc back.',
        crawl:'Tap Attack to cue Clover. Hold Down and move toward her under both passes. Cross the chalk, then shield her low serve or reach her with a tilt.',
      }[pattern];
    } else if (wall) {
      const d = world.wallPractice;
      $('wall-ceiling').setAttribute('aria-pressed', String(!!d.ceiling));
      $('wall-impact').setAttribute('aria-pressed', String(!!d.heavy));
      for (const kind of ['pip','noodle']) $('wall-'+kind).setAttribute('aria-pressed', String(kind === d.runner));
      $('wall-status').dataset.result = 'ready';
      $('wall-status').textContent = d.ceiling ? 'Below the tabletop' : d.runner ? player.stats.name + ' · one air jump left' : pattern === 'right' ? 'Right wall' : 'Left wall';
      const away = d.inward === 1 ? 'left' : 'right';
      message = d.ceiling ? 'Tap Attack to cue Pip’s Flip Kick. Tap Shield at the hit spark to brace against the underside.' :
        d.runner ? 'Flick '+away+' off the brickwork. Steer back to the near roof, or hold '+away+
        ' to cross the gap. Retry with Jump alone to spend your air jump instead.' :
        d.heavy ? 'Noodle starts at 185%. First tap Shield with no direction. Retry with Up + Shield when Pip’s heel hits.' :
        'You’re Noodle at 90%. Tap Shield when Pip’s Back Heel hits. Hold Jump at the wall to kick away.';
    } else if (trump) {
      const defend = pattern === 'defend';
      $('trump-take').setAttribute('aria-pressed', String(!defend));
      $('trump-defend').setAttribute('aria-pressed', String(defend));
      $('trump-status').dataset.result = 'ready';
      $('trump-status').textContent = (practiceSide === 'left' ? 'Left' : 'Right') + ' ledge';
      message = defend
        ? 'The rival is coming. Wait to feel the bump, or tap Shield to roll before they catch the lip.'
        : 'The rival has the ledge. Drift ' +
          (practiceSide === 'left' ? 'right' : 'left') +
          ' or use your recovery to take it.';
    } else if (roll) {
      const read = pattern === 'read';
      $('roll-status').dataset.result = 'ready';
      $('roll-status').textContent = practiceSide === 'left' ? 'Left ledge' : 'Right ledge';
      $('roll-guard').setAttribute('aria-pressed', String(!read));
      $('roll-read').setAttribute('aria-pressed', String(read));
      message = read
        ? 'The guard is waiting where your roll ends. Tap Shield to test the read, or jump from the ledge.'
        : 'Tap Shield to roll through the guard’s swing. As your dog turns back, tap Attack.';
    } else if (air) {
      const edge = pattern === 'edge', last = pattern === 'lastDodge', wide = world.airPractice.wide;
      const interrupted = pattern === 'interrupted';
      $('air-status').dataset.result = 'ready';
      $('air-status').textContent = edge
        ? practiceSide === 'left'
          ? 'Left ledge'
          : 'Right ledge'
        : 'Jump to begin';
      if (last) $('air-status').textContent = (wide ? 'Wide' : 'Low') + ' · ' + practiceSide + ' ledge';
      if (interrupted) $('air-status').textContent = world.dogs[0].stats.name + ' · ' + practiceSide + ' ledge';
      $('air-neutral').setAttribute('aria-pressed', String(!edge && !last && !interrupted));
      $('air-edge').setAttribute('aria-pressed', String(edge));
      $('air-lastDodge').setAttribute('aria-pressed', String(last));
      $('air-interrupted').setAttribute('aria-pressed', String(interrupted));
      $('air-side').hidden = !edge && !last && !interrupted;
      $('air-dog-label').hidden = $('air-speed').hidden = $('air-return-fight').hidden = !interrupted;
      $('air-dog').value = world.dogs[0].kind;
      $('air-speed').setAttribute('aria-pressed',String(!!world.airPractice.slow));
      $('air-distance').hidden = !last;
      $('air-fight').hidden = !last && !interrupted;
      $('air-fight').textContent = interrupted ? 'Edgeguard as Noodle · 3 stocks' : 'Guard against Rival · 3 stocks';
      $('air-return-fight').textContent = 'Recover as ' + world.dogs[0].stats.name + ' · 3 stocks';
      $('air-distance').textContent = wide ? 'Start low' : 'Start wide';
      message = interrupted ? 'Aim up and ' + (practiceSide === 'left' ? 'right' : 'left') +
        ' and tap Special. Release it as Noodle swings. At “Cast again now,” use Up + Special a second time and steer in.' :
        last ? 'Your jump and Up Special are spent. Aim ' + (wide ? '' : 'up and ') +
        (practiceSide === 'left' ? 'right' : 'left') + ' and tap Shield to catch the ledge.' : edge
        ? 'Aim up and ' +
          (practiceSide === 'left' ? 'right' : 'left') +
          ', then tap Shield to slip past the guard and catch the lip.'
        : 'Jump. As you fall toward the dummy, release the directions and tap Shield before its up tilt connects.';
    } else if (shield) {
      $('shield-status').dataset.result = 'ready';
      const guard = world.shieldPractice;
      $('shield-status').textContent = guard.coverage ? (pattern === 'poke' ? 'Rival shield' : 'Your shield') + (guard.worn ? ' · 30%' : ' · 100%') : 'Hold Shield to begin';
      if (pattern === 'dodgeTiming') $('shield-status').textContent = 'Spot-dodge once';
      if (pattern === 'breakEscape') $('shield-status').textContent = 'Hold your worn shield';
      if (pattern === 'breakPunish') $('shield-status').textContent = 'Rival has a worn shield';
      $('shield-strength').hidden = !guard.coverage;
      $('shield-strength').setAttribute('aria-pressed', String(!!guard.coverage && !guard.worn));
      $('jump-in-options').hidden = !guard.jumpIn;
      $('shield-landing-options').hidden = pattern !== 'crossup';
      if (pattern === 'crossup') {
        $('shield-landing-choice').value = guard.landingChoice;
        $('shield-landing-speed').setAttribute('aria-pressed',String(guard.slow));
      }
      for (const button of $('shield-patterns').querySelectorAll(':scope > button:not(#shield-strength)'))
        button.setAttribute('aria-pressed', String(button.id === 'shield-' + (guard.jumpIn ? 'jumpIn' : pattern)));
      if (guard.jumpIn) {
        $('jump-in-choice').value = pattern;
        $('jump-in-speed').setAttribute('aria-pressed',String(guard.slow));
        if (pattern === 'yourHop') $('shield-status').textContent = 'Hop beside the shield';
      }
      message = {
        yourHop: 'Hold Hop or Jump beside the rival. Tap Grab as your paws touch down, then choose a throw.',
        crossup: 'Block Belly Drop. If Brisket lands in front, tap Attack to grab. If he crosses behind, jump and attack back.',
        emptyHop: 'Hold Shield to start. Let the empty hop grab you once. Retry and tap Down as the rival reaches for you.',
        fallingAir: 'Hold Shield to start. Watch the falling swing, then hold your ground or release Shield to parry.',
        mixHop: 'Hold Shield to start. Watch for a swing on the way down or a grab after touchdown.',
        kick: 'You’re Clover. Hold Shield. Tap Grab when Pip’s Flying Kick hits the far side of your shield.',
        drop: 'You’re Clover. Hold Shield. Tap Grab as Brisket’s Belly Drop hits to catch him before he recovers.',
        strike: 'Raise Shield to start. Roll through the strike, or release Shield as it lands to parry.',
        grab: 'Raise Shield to start. Tap Down just before the grab to spot-dodge, or tap a side to roll.',
        counterGrab: 'Hold Shield. Tap Down as the grab comes out, then release Down. Tap Attack as your dog rises to punish with a jab.',
        dodgeTiming: 'Hold Shield and tap Down, then release Down. Pip sweeps at the end of your dodge. Try repeating the dodge immediately and after a rest.',
        breakEscape: 'Hold Shield until it bursts. Try staying still after landing, then retry and tap Attack or flick the stick repeatedly. Keep Shield held to block the punish as you wake.',
        breakPunish: 'Hold a smash as the rival’s shield wears out. Wait for the dizzy landing, then release. Choose Punish the break to retry.',
        low: 'Hold Shield. Noodle sweeps your paws. Aim Down gently with the stick, Walk + Down, or a drag from the center dot.',
        high: 'Hold Shield. Noodle jumps for your ears. Aim Up as the lead swings over the bubble.',
        poke: 'The rival holds their shield high. Aim Down and tap Attack for ' + moves[player.kit.tilts.down].label + '.',
      }[pattern];
    } else if (survival) {
      survivalFeedback('survivalReady', {});
      message = $('recovery-tip').textContent;
    } else if (stock) {
      result.dataset.result = 'ready';
      result.textContent = 'Tap Attack to begin';
      message = pattern === 'stockReturn' ? 'Tap Down when the lift lights up. The rival will grab at your landing. Retry and stay aboard to compare.'
        : 'The rival will drop in front of you. Try an early grab, then retry and time it as the last mail tag goes out.';
    } else if (meteor) {
      meteorFeedback('meteorReady', {});
      message = $('recovery-tip').textContent;
    } else if (chase) {
      result.dataset.result = 'ready';
      result.textContent = 'Tap Attack to begin';
      message = baitSweep ? 'Tap Attack to start. Try waiting beside the rival, then retry and block their get-up attack. Tap Grab at the shield spark.' :
        pattern === 'attack' ? 'Tap Attack to start the fall. As the rival lands, tap neutral Attack. You can jab twice, then tap Down + Smash.'
        : 'Tap Attack to start the fall. Tap Shield just before you land. If you miss, try rolling away or sweeping as the second jab settles.';
    } else if (breakaway) {
      result.dataset.result='ready';
      result.textContent=world.launchPractice.late?'Delayed Flying Kick':'Rising Flying Kick';
      message='You’re Clover. Tap Attack to take Chin Flick. Watch for the mint dodge mark and gold aerial mark as you slow down.';
    } else if (juggle) {
      result.dataset.result = 'ready';
      result.textContent = 'Escape the juggle · tap Attack';
      message = 'Brisket will up throw you on Picnic at 80%. Tap Attack to start. Stay neutral once, then retry and flick toward the mint arrow.';
    } else if (launch) {
      result.dataset.result = 'ready';
      result.textContent = 'Up throw incoming';
      message =
        'Start at 90%. Hold left or right as the throw hits to bend your launch. Tap Shield just before landing.';
    } else if (fromHang)
      message =
        'Hanging from the ' + ledge + ' ledge. Tap Attack for ' + moves[player.kit.ledgeAttack].label + '.';
    else if (partner) message = 'P2 uses the arrow keys or a controller. Press 1 to save an exchange and 2 to retry.';
    else if (ledge) message = 'Jump or use Special to start. ' + player.kit.recovery;
    $('recovery-tip').textContent = message;
    $('recovery-tip').hidden = !ledge || wave;
    clearInput();
    updateHUD();
    $('game').focus({ preventScroll: true });
    announce(message);
  }
  // The original world is never stepped during a practice visit. Its CPU, shared grabs,
  // clock and best-of-three stay at the pause frame even if the practice fight ends.
  function pausedFight() {
    return practiceFight || {battle:world, view, config:matchConfig, seed:soloSeed, series:localSet,
      countdown, lastCount, call:$('countdown').textContent};
  }
  function rehearsePosition() {
    const visit = pausedFight();
    startMatch(visit.config, undefined, visit.seed, null, {visit});
  }
  function returnToFight() {
    const resume = practiceFight;
    if (resume) startMatch(resume.config, undefined, resume.seed, resume.series, {resume});
  }
  const practiceGroups = [
    ['Movement','Footwork','footwork', footworkPatterns],
    ['Movement','Wavedash','wave',['back','platform']],
    ['Movement','Platforms','platform',['below','top','hold','ferry','shield-drop','layers']],
    ['Attack','Combo practice','combo',['example','late','record','defend','mix','flurry','escapeFlurry']],
    ['Attack','Aerial spacing','spacing',['approach','retreat','landing','airPower','fastfall','sweet','cancel','footstool','footstoolTech','reverse','wavebounce']],
    ['Attack','Knockdowns','launch',['lock','bait','floor-spike','edge-spike']],
    ['Attack','Move freshness','freshness',['training','ko','rage','drive']],
    ['Defense','Combo escape','escape',['tip','close','counter','break','gripEscape','gripThrow','carry']],
    ['Defense','Shield pressure','shield',['kick','drop','crossup','strike','grab','counterGrab','dodgeTiming','breakEscape','breakPunish','jumpIn','low','high','poke']],
    ['Defense','Launch & survival','launch',['throw','juggle','breakaway','survival','last-stock','escape','stock-return','stock-catch']],
    ['Defense','Air dodge','air',['neutral','edge','lastDodge','interrupted']],
    ['Recovery','Edgeguarding','edge',['lip','shortCatch','longCatch','tip','deep','corner','inside']],
    ['Recovery','Ledge recovery','ledge',['training','right','attack-training']],
    ['Recovery','Ledge timing','climb',['escape','trap','rise','coverRise','patience']],
    ['Recovery','Ledge roll','roll',['guard','read']],
    ['Recovery','Contested ledge','trump',['take','defend']],
    ['Recovery','Stage techs & wall jumps','wall',['training','impact','ceiling','pip','noodle']],
    ['Movement','Free practice','',['reset-training','partner-training']],
  ];
  const practiceAliases = {
    'footwork-crawl':'Noodle Clover duck boomerang projectile skip serve', 'footwork-antiAir':'anti-air',
    'footwork-angleHigh':'up angled forward tilt', 'footwork-angleLow':'down angled forward tilt',
    'footwork-reflect':'Pip bark projectile Clover', 'footwork-returnFire':'Clover Pip projectile reflect',
    'footwork-armor':'Brisket Haymaker armor', 'footwork-armorGrab':'Brisket armor grab',
    'footwork-cancelDash':'attack cancel', 'footwork-cancelTurn':'attack cancel',
    'spacing-landing':'short hop full jump flick', 'spacing-fastfall':'fast fall shield',
    'platform-layers':'fall through platform drop fast fall aerial landing',
    'escape-tip':'SDI smash directional influence', 'escape-close':'SDI smash directional influence',
    'launch-survival':'directional influence DI knockout', 'launch-breakaway':'hitstun cancel tumble combo escape',
    'launch-escape':'jab lock tech', 'launch-bait':'getup attack tech chase',
    'launch-stock-return':'respawn invincibility angel platform', 'launch-stock-catch':'respawn invincibility angel platform',
    'shield-kick':'Clover Disc Hook out of shield counter', 'shield-drop':'Clover Disc Hook out of shield counter',
    'shield-grab':'spot dodge roll', 'shield-strike':'perfect shield release',
    'shield-crossup':'shield grab back air out of shield cross up landing punish',
    'shield-jumpIn':'empty hop falling aerial grab', 'freshness-training':'stale moves staling',
    'freshness-drive':'launch height angle ground slide ledge side smash back air',
    'air-lastDodge':'recovery low wide directional air dodge edgeguard',
    'air-interrupted':'up special recovery hit reset return edgeguard',
    'partner-training':'local two players sparring', 'reset-training':'free training dummy',
    'wall-ceiling':'ceiling tech under stage recovery Noodle Pip',
  };
  const practiceTitles = {'reset-training':'Free training', 'shield-drop':'Punish Brisket’s Belly Drop',
    'shield-strike':'Parry or roll through a strike', 'shield-grab':'Dodge an incoming grab', 'wall-impact':'Tech a heavy impact'};
  function searchWords(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function startExercise(id) {
    if (world.mode === 'solo') {
      const visit = pausedFight();
      startMatch({...visit.config, mode:'training', lastStockStart:false, suddenStart:false, fetch:false}, undefined, undefined, null, {visit});
    } else dismiss();
    if (id === 'reset-training' || id === 'partner-training') drill(id === 'partner-training' ? 'partner' : false);
    else if (['wall-impact','wall-ceiling','wall-pip','wall-noodle'].includes(id)) drill('wall', false, world.wallPractice?.side || 'left', id.slice(5));
    else {
      // Freshness toolbar buttons toggle comparisons. A directory selection always starts the named test.
      if (id.startsWith('freshness-') && world.freshnessPractice) world.resetTraining();
      $(id).click();
    }
  }
  function showPractice() {
    backToPause = dialogType === 'pause';
    const lanes = ['All', ...new Set(practiceGroups.map(group => group[0]))];
    showDialog('practice', 'Find a drill',
      '<label class="practice-search">Search drills<input id="practice-query" type="search" placeholder="Try jab lock, crawl, or parry" autocomplete="off"></label>' +
      '<div class="practice-lanes" aria-label="Drill categories" role="group">' +
      lanes.map(lane => '<button type="button" class="utility" data-lane="' + lane + '">' + lane + '</button>').join('') +
      '</div><div id="practice-count" role="status"></div><div id="practice-results"></div>');
    const query = $('practice-query'), results = $('practice-results');
    let lane = 'All';
    function refresh() {
      const words = searchWords(query.value).split(' ').filter(Boolean);
      let count = 0;
      results.replaceChildren();
      for (const [category, family, prefix, names] of practiceGroups) {
        if (lane !== 'All' && lane !== category) continue;
        const section = document.createElement('section');
        const title = document.createElement('h3');
        title.textContent = family;
        section.append(title);
        for (const name of names) {
          const id = prefix ? prefix + '-' + name : name;
          const label = practiceTitles[id] || $(id).textContent.trim();
          const searchable = searchWords([category, family, label, practiceAliases[id] || '', id].join(' '));
          if (!words.every(word => searchable.includes(word))) continue;
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.exercise = id;
          button.textContent = label;
          section.append(button);
          count++;
        }
        if (section.children.length > 1) results.append(section);
      }
      $('practice-count').textContent = count ? count + (count === 1 ? ' drill' : ' drills') : 'No drills found.';
      if (!count) {
        const reset = document.createElement('button');
        reset.className = 'utility'; reset.textContent = 'Show all drills';
        reset.onclick = () => { lane = 'All'; query.value = ''; refresh(); document.querySelector('[data-lane="All"]').focus(); };
        results.append(reset);
      }
      for (const button of document.querySelectorAll('[data-lane]')) button.setAttribute('aria-pressed', String(lane === button.dataset.lane));
      results.scrollTop = 0;
    }
    query.oninput = refresh;
    query.onkeydown = e => {
      if (e.isComposing || !['ArrowDown','Enter'].includes(e.key)) return;
      e.preventDefault();
      const first = results.querySelector('button');
      if (e.key === 'ArrowDown') first?.focus();
      else first?.click();
    };
    for (const button of document.querySelectorAll('[data-lane]')) button.onclick = () => { lane = button.dataset.lane; refresh(); };
    results.onclick = e => {
      const entry = e.target.closest('[data-exercise]');
      if (entry) startExercise(entry.dataset.exercise);
    };
    refresh();
    document.querySelector('[data-lane="All"]').focus();
  }
  $('practice-menu').onclick = showPractice;
  $('return-fight').onclick = returnToFight;
  $('reset-training').onclick = () => drill(world.trainingPartner ? 'partner' : false);
  $('partner-training').onclick = () => drill(world.trainingPartner ? false : 'partner');
  // Chromium can omit click on a training button after two thumbs release the fight controls.
  const trainingTools = $('training-tools');
  let trainingPress = null, handledTrainingTap = false;
  document.addEventListener('pointerdown', () => { handledTrainingTap = false; }, true);
  trainingTools.addEventListener('pointerdown', e => {
    const button = e.target.closest('button');
    trainingPress = button && !button.disabled && e.pointerType === 'touch'
      ? { button, id: e.pointerId, x: e.clientX, y: e.clientY } : null;
  });
  trainingTools.addEventListener('pointercancel', () => { trainingPress = null; });
  trainingTools.addEventListener('pointerup', e => {
    const press = trainingPress;
    trainingPress = null;
    if (!press || press.id !== e.pointerId || press.button.disabled ||
        Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8 ||
        document.elementFromPoint(e.clientX, e.clientY)?.closest('button') !== press.button) return;
    handledTrainingTap = true;
    press.button.click();
  });
  // A toolbar reflow can send the native click from this tap to a different button.
  document.addEventListener('click', e => {
    if (e.detail > 0 && handledTrainingTap) {
      handledTrainingTap = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  $('combo-training').onclick = () => drill('combo', false, 'example');
  $('combo-fight-pip').onclick = fightRivalPip;
  for (const source of Object.keys(comboSources)) $('combo-' + source).onclick = () => drill('combo', false, source);
  $('combo-slot').onchange = e => {
    const d = world.comboPractice, slot = Number(e.target.value);
    drill('combo', false, d.source === 'record' ? 'record' : d.source === 'replay' && world.comboTakes[slot] ? 'replay' : 'defend',
      d.reply, slot);
  };
  $('combo-restore').onclick = () => {
    const d = world.comboPractice;
    world.comboTakes[d.slot] = null;
    drill('combo', false, 'defend', d.reply, d.slot);
  };
  $('combo-reply').onchange = e => {
    const d = world.comboPractice;
    drill('combo', false, d.source === 'record' && d.tape.length ? 'replay' : d.source, e.target.value);
    if (e.target.value !== 'p2') e.target.focus({ preventScroll: true });
  };
  $('combo-slow').onclick = () => {
    const d = world.comboPractice;
    d.slow = !d.slow;
    $('combo-slow').setAttribute('aria-pressed', String(d.slow));
    $('game').focus({ preventScroll: true });
  };
  $('freshness-training').onclick = () => drill('freshness', false, 'repeat');
  $('wave-training').onclick = () => drill('wave', false, world.wavePractice?.pattern || 'back');
  for (const pattern of ['back', 'platform']) $('wave-' + pattern).onclick = () => drill('wave', false, pattern);
  $('wave-side').onclick = () => drill('wave', false, world.wavePractice.pattern, -world.wavePractice.dir);
  $('wave-slow').onclick = () => {
    const d = world.wavePractice;
    d.slow = !d.slow;
    $('wave-slow').setAttribute('aria-pressed', String(d.slow));
    $('game').focus({ preventScroll: true });
  };
  for (const action of ['repeat','clear','guard','ko','rage','percent','drive','edge'])
    $('freshness-' + action).onclick = () => drill('freshness', false, action);
  $('freshness-fight').onclick = () => {
    const lab = world.freshnessPractice;
    if (!lab?.drive) return;
    leaveOnline();
    afterStory = null;
    startMatch({...settings, mode:'solo', p1:world.dogs[0].kind, p2:world.dogs[1].kind, stage:world.stage,
      cpuLevel:'rival', fetch:false, minutes:7, driveOpening:{edge:lab.drive.edge, damage:lab.baseline}}, undefined, 42);
  };
  $('edge-training').onclick = () => drill('edge', false, world.edgePractice?.pattern || 'lip');
  for (const pattern of ['lip','shortCatch','longCatch','tip','deep','corner','inside']) $('edge-' + pattern).onclick = () => drill('edge', false, pattern);
  $('edge-side').onclick = () => drill('edge', false, world.edgePractice.pattern, -world.edgePractice.dir);
  $('edge-slow').onclick = () => {
    const d = world.edgePractice;
    d.slow = !d.slow;
    $('edge-slow').setAttribute('aria-pressed', String(d.slow));
    $('game').focus({ preventScroll: true });
  };
  $('footwork-training').onclick = () => drill('footwork', false, world.footworkPractice?.pattern || 'bait');
  for (const pattern of footworkPatterns)
    $('footwork-' + pattern).onclick = () => drill('footwork', false, pattern);
  $('footwork-side').onclick = () => drill('footwork', false, world.footworkPractice.pattern, -world.footworkPractice.dir);
  $('footwork-pause').onclick = () => {
    const d = world.footworkPractice;
    d.pauseOnWindup = !d.pauseOnWindup;
    $('footwork-pause').setAttribute('aria-pressed', String(d.pauseOnWindup));
    $('game').focus({preventScroll:true});
  };
  $('footwork-slow').onclick = () => {
    const practice = world.footworkPractice;
    practice.slow = !practice.slow;
    $('footwork-slow').setAttribute('aria-pressed', String(practice.slow));
    $('game').focus({ preventScroll: true });
  };
  $('spacing-training').onclick = () => drill('spacing', false, world.spacingPractice?.pattern || 'approach');
  $('spacing-approach').onclick = () => drill('spacing', false, 'approach');
  $('spacing-retreat').onclick = () => drill('spacing', false, 'retreat');
  $('spacing-landing').onclick = () => drill('spacing', false, 'landing');
  $('spacing-airPower').onclick = () => drill('spacing', false, 'airPower');
  $('spacing-fastfall').onclick = () => drill('spacing', false, 'fastfall');
  $('spacing-apex-pause').onclick = () => {
    const d = world.spacingPractice;
    d.pauseAtApex = !d.pauseAtApex;
    if (!d.pauseAtApex && d.apex) d.resumed = true;
    $('spacing-apex-pause').setAttribute('aria-pressed',String(d.pauseAtApex));
    $('game').focus({preventScroll:true});
  };
  $('spacing-sweet').onclick = () => drill('spacing', false, world.spacingPractice?.pattern === 'sweetAligned' ? 'sweetAligned' : 'sweet');
  $('spacing-aligned').onclick = () => drill('spacing', false, world.spacingPractice.pattern === 'sweet' ? 'sweetAligned' : 'sweet');
  const flickJumpTip = 'Tap Up and release for a short hop. Choose Landing hits to reset, then hold Up through takeoff for a full jump. Compare the two heights at the apex.';
  function setFlickTrial(enabled) {
    world.spacingPractice.flickJump = enabled;
    flickJumpStates[0] = {};
    $('spacing-flick').setAttribute('aria-pressed', String(enabled));
    $('recovery-tip').textContent = enabled ? flickJumpTip : 'Use Jump or Hop to compare takeoff heights. Choose Landing hits to return to the mark.';
  }
  $('spacing-flick').onclick = () => setFlickTrial(!(world.spacingPractice.flickJump ?? settings.flickJump1));
  $('spacing-cancel').onclick = () => drill('spacing', false, 'cancel');
  for (const id of ['footstool','footstoolTech']) $('spacing-' + id).onclick = () => drill('spacing', false, id);
  $('spacing-reverse').onclick = () => drill('spacing', false, 'reverse');
  $('spacing-wavebounce').onclick = () => drill('spacing', false, 'wavebounce');
  $('spacing-guard').onclick = () => {
    const practice = world.spacingPractice;
    practice.guard = !practice.guard;
    drill('spacing', false, 'wavebounce', practice.dir);
  };
  $('spacing-side').onclick = () => drill('spacing', false, world.spacingPractice.pattern, -world.spacingPractice.dir);
  $('spacing-slow').onclick = () => {
    const practice = world.spacingPractice;
    practice.slow = !practice.slow;
    $('spacing-slow').setAttribute('aria-pressed', String(practice.slow));
    $('game').focus({ preventScroll: true });
  };
  $('platform-training').onclick = () => drill('platform', false, world.platformPractice?.pattern || 'below');
  $('platform-below').onclick = () => drill('platform', false, 'below');
  $('platform-top').onclick = () => drill('platform', false, 'top');
  $('platform-hold').onclick = () => drill('platform', false, 'hold');
  $('platform-ferry').onclick = () => drill('platform', false, 'ferry');
  $('platform-layers').onclick = () => drill('platform', false, 'layers');
  $('platform-shield-drop').onclick = () => drill('platform', false, 'shield-drop');
  $('platform-slow').onclick = () => {
    const practice = world.platformPractice;
    practice.slow = !practice.slow;
    $('platform-slow').setAttribute('aria-pressed', String(practice.slow));
    $('game').focus({ preventScroll: true });
  };
  $('escape-training').onclick = () => drill('escape', false, world.escapePractice?.spacing || 'tip');
  for (const pattern of ['tip','close','counter','break','gripEscape','gripThrow','carry'])
    $('escape-' + pattern).onclick = () => drill('escape', false, pattern);
  $('escape-slow').onclick = () => {
    const drill = world.escapePractice;
    drill.slow = !drill.slow;
    $('escape-slow').setAttribute('aria-pressed', String(drill.slow));
    $('game').focus({ preventScroll: true });
  };
  $('ledge-training').onclick = () => drill('left');
  $('ledge-right').onclick = () => drill('right');
  $('ledge-attack-training').onclick = () => drill(practiceSide, true);
  $('trump-training').onclick = () => drill('trump', false, world?.trumpPractice?.role || 'take');
  $('trump-take').onclick = () => drill('trump', false, 'take');
  $('trump-defend').onclick = () => drill('trump', false, 'defend');
  $('trump-side').onclick = () => {
    practiceSide = practiceSide === 'left' ? 'right' : 'left';
    drill('trump', false, world.trumpPractice.role);
  };
  $('ledge-roll-training').onclick = () => drill('roll', false, world?.rollPractice?.pattern || 'guard');
  $('climb-training').onclick = () => drill('climb', false, world?.climbPractice?.role || 'escape');
  for (const role of ['escape','trap','rise','coverRise','patience'])
    $('climb-' + role).onclick = () => drill('climb', false, role);
  $('climb-side').onclick = () => {
    practiceSide = practiceSide === 'left' ? 'right' : 'left';
    drill('climb', false, world.climbPractice.role);
  };
  $('climb-slow').onclick = () => {
    const practice = world.climbPractice;
    practice.slow = !practice.slow;
    $('climb-slow').setAttribute('aria-pressed', String(practice.slow));
    $('game').focus({ preventScroll: true });
  };
  $('roll-guard').onclick = () => drill('roll', false, 'guard');
  $('roll-read').onclick = () => drill('roll', false, 'read');
  $('roll-side').onclick = () => {
    practiceSide = practiceSide === 'left' ? 'right' : 'left';
    drill('roll', false, world.rollPractice.pattern);
  };
  $('launch-training').onclick = $('launch-throw').onclick = () => drill('launch');
  $('launch-juggle').onclick = () => drill('launch', false, 'juggle');
  $('launch-breakaway').onclick=()=>drill('launch',false,'breakaway');
  $('breakaway-late').onclick=()=>{
    world.launchPractice.late=!world.launchPractice.late;
    drill('launch',false,'breakaway');
  };
  $('breakaway-pause').onclick=()=>{
    const d=world.launchPractice;
    d.pauseAtWindow=!d.pauseAtWindow;
    if (!d.pauseAtWindow) d.paused=false;
    $('breakaway-pause').setAttribute('aria-pressed',String(d.pauseAtWindow));
    $('game').focus({preventScroll:true});
  };
  $('juggle-chase').onclick = () => {
    world.launchPractice.chase = !world.launchPractice.chase;
    drill('launch', false, 'juggle');
  };
  $('launch-lock').onclick = () => drill('launch', false, 'attack');
  $('launch-escape').onclick = () => drill('launch', false, 'defend');
  $('launch-bait').onclick = () => drill('launch', false, world.chasePractice?.role === 'baitBack' ? 'baitBack' : 'bait');
  $('launch-behind').onclick = () => drill('launch', false, world.chasePractice.role === 'bait' ? 'baitBack' : 'bait');
  $('launch-floor-spike').onclick = () => drill('launch', false, 'spikeFloor');
  $('launch-edge-spike').onclick = () => drill('launch', false, 'spikeEdge');
  $('launch-stock-return').onclick = () => drill('launch', false, 'stockReturn');
  $('launch-survival').onclick = () => drill('launch', false, 'survival');
  $('launch-last-stock').onclick = () => drill('launch', false, 'lastStock');
  $('launch-study').onclick = () => {
    const d = world.survivalPractice;
    drill('launch', false, d.pattern, d.dir, !d.study);
  };
  $('launch-stock-catch').onclick = () => drill('launch', false, 'stockCatch');
  $('launch-side').onclick = () => {
    const d = world.survivalPractice || world.meteorPractice || world.stockPractice || world.chasePractice || world.launchPractice;
    drill('launch', false, d.pattern || d.role, -d.dir);
  };
  $('launch-slow').onclick = () => {
    const d = world.survivalPractice || world.meteorPractice || world.stockPractice || world.chasePractice || world.launchPractice;
    d.slow = !d.slow;
    $('launch-slow').setAttribute('aria-pressed', String(d.slow));
    $('game').focus({ preventScroll: true });
  };
  $('wall-training').onclick = () => drill('wall', false, world.wallPractice?.side || 'left');
  const wallMode = () => world.wallPractice.ceiling ? 'ceiling' : world.wallPractice.heavy ? 'impact' : world.wallPractice.runner;
  $('wall-impact').onclick = () => drill('wall', false, world.wallPractice.side, world.wallPractice.heavy ? '' : 'impact');
  $('wall-retry').onclick = () => drill('wall', false, world.wallPractice.side, wallMode());
  for (const kind of ['pip','noodle','ceiling']) $('wall-'+kind).onclick = () => drill('wall', false, world.wallPractice.side, kind);
  $('wall-side').onclick = () => drill('wall', false, world.wallPractice.side === 'left' ? 'right' : 'left', wallMode());
  $('shield-training').onclick = () => drill('shield', false, world?.shieldPractice?.pattern || 'kick');
  for (const button of $('shield-patterns').querySelectorAll(':scope > button:not(#shield-strength)'))
    button.onclick = () => drill('shield', false, button.id === 'shield-jumpIn' ? $('jump-in-choice').value : button.id.slice('shield-'.length));
  $('jump-in-choice').onchange = () => drill('shield', false, $('jump-in-choice').value);
  $('shield-landing-choice').onchange = e => drill('shield',false,'crossup',undefined,{choice:e.target.value});
  $('shield-landing-side').onclick = () => drill('shield',false,'crossup',undefined,{dir:-world.shieldPractice.dir});
  $('shield-landing-speed').onclick = () => {
    const practice = world.shieldPractice;
    practice.slow = !practice.slow;
    $('shield-landing-speed').setAttribute('aria-pressed',String(practice.slow));
    $('game').focus({preventScroll:true});
  };
  $('shield-landing-fight').onclick = () => {
    const {cross,dir} = world.shieldPractice;
    const defender = world.dogs[0].kind;
    leaveOnline();
    afterStory = null;
    startMatch({...settings,mode:'solo',p1:'brisket',p2:defender,stage:world.stage,cpuLevel:'rival',
      fetch:false,minutes:7,shieldLanding:{dir,cross}},undefined,42);
  };
  $('jump-in-speed').onclick = () => {
    const practice = world.shieldPractice;
    practice.slow = !practice.slow;
    $('jump-in-speed').setAttribute('aria-pressed',String(practice.slow));
  };
  $('shield-strength').onclick = () => drill('shield', false, world.shieldPractice.pattern, !world.shieldPractice.worn);
  $('air-dodge-training').onclick = () => drill('air', false, world?.airPractice?.pattern || 'neutral');
  $('air-neutral').onclick = () => drill('air', false, 'neutral');
  $('air-edge').onclick = () => drill('air', false, 'edge');
  $('air-lastDodge').onclick = () => drill('air', false, 'lastDodge');
  $('air-interrupted').onclick = () => drill('air', false, 'interrupted');
  $('air-dog').onchange = e => drill('air', false, 'interrupted', undefined, e.target.value);
  $('air-speed').onclick = () => {
    world.airPractice.slow = !world.airPractice.slow;
    $('air-speed').setAttribute('aria-pressed',String(world.airPractice.slow));
    $('game').focus({preventScroll:true});
  };
  $('air-distance').onclick = () => drill('air', false, 'lastDodge', !world.airPractice.wide);
  function fightRecovery(slot) {
    const {side,wide,pattern} = world.airPractice;
    const [returner,guard] = world.dogs;
    leaveOnline();
    afterStory = null;
    const opening = pattern === 'interrupted' ? {interruptedReturn:{side,slot}} : {dodgeReturn:{side,wide}};
    startMatch({...settings, mode:'solo', p1:slot ? guard.kind : returner.kind, p2:slot ? returner.kind : guard.kind,
      cpuLevel:'rival', stage:world.stage, fetch:false, minutes:7, ...opening}, undefined, 42);
  }
  $('air-fight').onclick = () => fightRecovery(1);
  $('air-return-fight').onclick = () => fightRecovery(0);
  $('air-side').onclick = () => {
    practiceSide = practiceSide === 'left' ? 'right' : 'left';
    drill('air', false, world.airPractice.pattern);
  };
  const campaign = window.DispatchScript;
  let storage;
  try {
    storage = window.localStorage;
  } catch {}
  let progress = campaign.readSave(storage),
    stored = !!storage;
  let film = null,
    afterStory = null,
    inLibrary = false,
    adventureKey = '',
    noticeUntil = 0;
  function saveProgress(event) {
    // Keep the furthest checkpoint and collected postmarks if two tabs are playing.
    const disk = campaign.readSave(storage);
    if (disk.started) {
      const score = (p) => (p.complete ? 1000 : 0) + p.room * 10 + p.checkpoint;
      if (score(disk) > score(progress)) progress = { ...disk, stamps: progress.stamps | disk.stamps };
      else {
        progress.stamps |= disk.stamps;
        if (score(disk) === score(progress) && disk.atCheckpoint) progress.atCheckpoint = disk.atCheckpoint;
      }
    }
    progress = campaign.record(progress, event);
    try {
      storage.setItem(campaign.saveKey, JSON.stringify(progress));
      stored = true;
    } catch {
      stored = false;
    }
  }
  const countMarks = (bits) => campaign.rooms.filter((_, i) => bits & (1 << i)).length;
  function menuScreen(id, keepRoom = false) {
    localSet = null;
    practiceFight = null;
    $('match-set').hidden = true;
    if (!keepRoom) leaveOnline();
    film?.score.silence();
    film = null;
    dismiss();
    world = null;
    view = null;
    page = id;
    drillSide = null;
    drillWaiting = false;
    document.body.classList.remove('playing', 'training-active', 'adventure-active', 'with-drill-readout');
    document.body.classList.add('menu-screen');
    document.body.classList.toggle('cinema-active', id === 'dispatch-story');
    for (const screen of ['home', 'online-lobby', 'dispatch-route', 'dispatch-story', 'lobby', 'match'])
      $(screen).hidden = screen !== id;
    window.scrollTo(0, 0);
  }
  function showHome(focus = true) {
    menuScreen('home');
    afterStory = null;
    $('school-welcome').hidden = schoolSave.seen;
    $('home').classList.toggle('has-welcome',!schoolSave.seen);
    window.DispatchCovers.draw($('title-cover'), 'title');
    if (focus) $(schoolSave.seen?'home-adventure':'welcome-play').focus({ preventScroll: true });
  }
  function showRoute() {
    menuScreen('dispatch-route');
    afterStory = null;
    window.DispatchCovers.draw($('route-cover'), 'route', progress.room);
    const stops = $('route-stops');
    stops.replaceChildren();
    for (const [i, r] of campaign.rooms.entries()) {
      const li = document.createElement('li'),
        button = document.createElement('button');
      button.type = 'button';
      button.dataset.stop = i;
      const sealed = i > progress.room,
        marked = !!(progress.stamps & (1 << i));
      button.disabled = sealed;
      const status = sealed
        ? 'Sealed'
        : marked
          ? 'Postmark found'
          : i === progress.room && !progress.complete
            ? 'Current stop'
            : 'Open stop';
      button.innerHTML =
        '<em>0' + (i + 1) + '</em><span><b>' + r.name + '</b><small>' + r.type + (r.rules ? ' · 3 stocks' : '') + ' · ' + status + '</small></span>';
      li.append(button);
      stops.append(li);
    }
    $('route-runner-portrait').src = portrait(campaign.chapterFighter);
    $('route-runner-name').textContent = fighters[campaign.chapterFighter].name;
    $('route-progress').textContent = progress.complete
      ? 'Chapter clear'
      : progress.started
        ? (stored ? 'Saved at ' : 'This session · ') +
          campaign.rooms[progress.room].name +
          (progress.checkpoint ? ' · ' + campaign.rooms[progress.room].checkpoints[progress.checkpoint - 1].name : '')
        : 'First stop · Parcel Alley';
    $('route-marks').textContent =
      'Postmarks ' +
      countMarks(progress.stamps) +
      ' / ' + campaign.rooms.length +
      (!stored ? ' · Progress lasts for this session' : '');
    $('dispatch-start').textContent =
      progress.pending === 'ending'
        ? 'Watch ending'
        : progress.complete
          ? 'Replay chapter'
          : progress.started
            ? 'Continue'
            : 'Begin chapter';
    $('dispatch-start').focus({ preventScroll: true });
  }
  function showReels(selected = 'opening') {
    const locks = {
      opening: '',
      rescue: progress.room >= 1 ? '' : 'Finish Parcel Alley',
      boss: progress.room >= campaign.lastRoom ? '' : 'Cross Sorting Bridge',
      ending: progress.complete || progress.pending === 'ending' ? '' : 'Defeat the Copper Hound',
    };
    const rows = Object.entries(campaign.scenes).map(([key, scene]) => {
      const locked = locks[key];
      const print = locked ? '<i class="film-leader" aria-hidden="true"></i>' :
        '<canvas width="160" height="90" aria-hidden="true"></canvas>';
      return '<button type="button" data-reel="' + key + '"' + (locked ? ' disabled' : '') + '>' +
        print + '<span><b>' + scene.title + '</b><small>' + (locked || 'Play cutscene') + '</small></span></button>';
    });
    showDialog('cutscenes', 'Cutscenes', '<div class="film-library">' + rows.join('') + '</div>');
    for (const button of document.querySelectorAll('[data-reel]:enabled')) {
      window.DispatchFilm.poster(button.querySelector('canvas'), button.dataset.reel);
    }
    document.querySelector('[data-reel="' + selected + '"]').focus();
  }
  function filmArea() {
    const screen = $('dispatch-story').getBoundingClientRect();
    const heading = document.querySelector('.film-heading').getBoundingClientRect();
    const tools = document.querySelector('.topbar').getBoundingClientRect();
    const footer = document.querySelector('.film-footer').getBoundingClientRect();
    return {
      width: screen.width,
      height: screen.height,
      above: Math.max(heading.bottom, tools.bottom) - screen.top + 3,
      below: screen.bottom - footer.top + 3,
    };
  }
  function story(key, then, fromLibrary = false) {
    menuScreen('dispatch-story');
    afterStory = then;
    inLibrary = fromLibrary;
    const scene = campaign.scenes[key];
    $('story-cover').setAttribute('aria-label', scene.title + ' animated cutscene');
    $('story-title').textContent = scene.title;
    $('story-map').textContent = fromLibrary ? 'Cutscenes' : 'Route map';
    $('story-skip').hidden = fromLibrary;
    film = new window.DispatchFilm(
      $('story-cover'), key, scene.pages.length,
      () => ({ context: audioContext, volume: settings.sound ? settings.volume / 100 : 0 }),
      (part) => showStoryPage(key, part),
      (time, duration) => {
        $('film-progress').style.transform = 'scaleX(' + time / duration + ')';
        const label = '0:' + String(Math.floor(time)).padStart(2, '0') + ' / 0:' + duration;
        if ($('film-time').textContent !== label) $('film-time').textContent = label;
      }, finishStory, filmArea,
    );
    updateFilmButton();
    $(film.paused && fromLibrary ? 'film-pause' : 'story-next').focus({ preventScroll: true });
  }
  function showStoryPage(key, part) {
    const scene = campaign.scenes[key],
      [speaker, line] = scene.pages[part];
    $('story-speaker').textContent = speaker;
    $('story-text').textContent = line;
    const finalAction = scene.completesChapter ? 'Chapter results' : 'Set out';
    $('story-next').textContent =
      part + 1 < scene.pages.length ? 'Next' : inLibrary ? 'Done' : finalAction;
  }
  function updateFilmButton() {
    $('film-pause').textContent = film.paused ? 'Play' : 'Pause';
    $('film-pause').dataset.paused = String(film.paused);
  }
  function setFilmPaused(value) {
    if (!film) return;
    film.setPaused(value);
    updateFilmButton();
  }
  function toggleFilm() {
    if (!film) return;
    audioReady();
    setFilmPaused(!film.paused);
  }
  function finishStory() {
    const next = afterStory;
    afterStory = null;
    film?.score.silence();
    film = null;
    if (next) next();
  }
  function chapterClear() {
    saveProgress({ room: campaign.lastRoom, pending: '', complete: true });
    showRoute();
    showDialog(
      'dispatch-clear',
      'Chapter clear',
      '<div class="winner"><img alt="" src="' +
        portrait('clover') +
        '"><div><span class="mode-label">The Last Dispatch</span><h3>The Silent Yard</h3><p>' +
        countMarks(progress.stamps) +
        ' of ' + campaign.rooms.length + ' postmarks collected.</p></div></div><p>The bell is back in service. Clover has the next dispatch.</p><div class="dialog-actions"><button class="primary" data-do="close">Route map</button><button class="utility" data-do="home">Main menu</button></div>',
    );
    document.querySelector('[data-do=close]').focus();
  }
  function playScene(key) {
    const scene = campaign.scenes[key],
      room = campaign.rooms.findIndex((r) => r.id === scene.stop);
    if (!progress.complete) saveProgress({ room, pending: key, complete: !!scene.completesChapter });
    story(key, () => {
      if (scene.completesChapter) return chapterClear();
      beginRun(room, 0);
    });
  }
  function enterStop(index, checkpoint = 0) {
    audioReady();
    sound('menu');
    const intro = campaign.rooms[index].intro;
    if (!checkpoint && intro) playScene(intro);
    else beginRun(index, checkpoint, checkpoint ? progress.atCheckpoint : null);
  }
  function beginRun(index, checkpoint, atCheckpoint = null) {
    music?.restart();
    dismiss();
    $('pause-label').textContent = 'Pause';
    $('countdown').classList.remove('net-lag', 'sudden');
    page = 'match';
    drillSide = null;
    drillWaiting = false;
    const pad=getPads()[0];
    if (down(pad,0)) menuPadButtons.set(pad.index,(menuPadButtons.get(pad.index)||0)|1);
    countdown = 0;
    accumulator = 0;
    adventureKey = '';
    for (const id of [
      'home',
      'dispatch-route',
      'dispatch-story',
      'lobby',
      'training-tools',
      'match-clock',
      'school-coach',
      'recovery-tip',
      'hud',
      'grapple-prompt',
    ])
      $(id).hidden = true;
    $('match').hidden = $('dispatch-hud').hidden = $('dispatch-orders').hidden = false;
    $('countdown').textContent = '';
    document.body.classList.remove('menu-screen', 'training-active', 'cinema-active', 'with-drill-readout');
    $('freshness-readout').hidden = $('wave-readout').hidden = $('combo-readout').hidden = true;
    document.body.classList.add('playing', 'adventure-active');
    saveProgress({ room: index, checkpoint, pending: '' });
    $('blast-radar').hidden = true;
    view = new window.DispatchView();
    view.shakeEnabled = settings.shake;
    noticeUntil = 0;
    $('dispatch-notice').hidden = true;
    world = new window.DispatchRun({ room: index, checkpoint, atCheckpoint, stamps: progress.stamps }, (name, e) => {
      view.event(name, e);
      if (name === 'dispatchCheckpoint') {
        saveProgress({ room: index, checkpoint: e.checkpoint, atCheckpoint: e.atCheckpoint });
        tone(485, 735, 0.12);
        tone(735, 980, 0.13, 0.12);
        dispatchNotice(stored ? 'Checkpoint saved' : 'Checkpoint reached');
      } else if (name === 'dispatchStamp') {
        saveProgress({ room: index, stamp: index });
        tone(760, 1150, 0.09);
        dispatchNotice('Postmark collected');
      } else if (name === 'dispatchSignal') {
        tone(330, 660, 0.19);
        dispatchNotice(e.name + ' raised');
      } else if (name === 'dispatchWave') {
        tone(420, 570, 0.12);
        if (campaign.rooms[index].id === 'exchange') dispatchNotice('Wave ' + e.wave);
      } else if (name === 'ko') {
        sound(name, e);
        dispatchNotice(e.f.stats.name + (e.remaining ? ' · ' + stockLabel(e.remaining) + ' left' : ' out'));
      } else if (name === 'stockTie') dispatchNotice('Tiebreak · One stock each');
      else if (name === 'hoist') dispatchNotice('Gantry catch · Armor damaged');
      else if (name === 'dispatchVictory') dispatchNotice('Mission clear');
      else if (name === 'machineWindup') {
        tone(e.move === 'charge' ? 240 : 160, e.move === 'charge' ? 390 : 210, 0.18, 0, 'triangle', 0.07);
      } else if (name === 'machineDown') {
        tone(215, 48, 0.18);
        tone(620, 435, 0.12, 0.1);
      } else if (name === 'machineSwing') tone(135, 55, 0.11);
      else sound(name, e);
    });
    $('match-mode').textContent = 'Mission 0' + (index + 1) + ' · ' + world.layout.type;
    $('match-stage').textContent = world.layout.name;
    $('runner-portrait').src = portrait(world.dogs[0].kind);
    $('runner-name').textContent = world.dogs[0].stats.name;
    updateDispatchHUD();
    view.draw($('game'), world, 0, 0);
    $('game').focus({ preventScroll: true });
    window.scrollTo(0, 0);
    announce('Adventure · ' + world.layout.name);
  }
  function dispatchNotice(message) {
    $('dispatch-notice').textContent = message;
    $('dispatch-notice').hidden = false;
    noticeUntil = world.time + 1.7;
    announce(message);
  }
  function updateDispatchHUD() {
    if (noticeUntil && world.time >= noticeUntil) {
      noticeUntil = 0;
      $('dispatch-notice').hidden = true;
    }
    const hero = world.dogs[0], foes = world.foes, lead = foes[0];
    const boss = world.layout.rules === 'boss', horde = world.layout.rules === 'horde';
    const recovery = world.bridge ? null : offstageOptions(hero, world.terrain);
    const grip = world.grapple;
    const order = !grip || grip.phase === 'throw' ? world.objective : grip.owner === 0
      ? grappleControls(world,grip) : 'Grabbed · Tap action buttons to escape';
    const key = [world.roomIndex, world.wave, hero.stocks, tenth(hero.damage), world.stamps, order, recovery,
      ...foes.flatMap((e) => [e.f.stocks, tenth(e.f.damage), e.hp])].join('|');
    if (key === adventureKey) return;
    adventureKey = key;
    $('runner-score').hidden = !!world.bridge;
    $('runner-recovery').hidden = recovery === null;
    if (recovery !== null) $('runner-recovery').innerHTML = recoveryStrip(recovery);
    if (!world.bridge) {
      showPercent($('runner-percent'), hero.damage);
      showStocks($('runner-lives'), hero.stocks, hero.stats.name);
    }
    $('machine-meter').hidden = !lead;
    if (lead) {
      $('machine-name').textContent = horde ? 'Sorting crew' : lead.f.stats.name;
      $('rival-score').hidden = boss;
      $('machine-health').hidden = !boss;
      if (boss) {
        $('machine-health').max = lead.maxHP;
        $('machine-health').value = lead.hp;
      } else {
        $('rival-percent').hidden = horde;
        if (!horde) showPercent($('rival-percent'), lead.f.damage);
        const team = horde ? 'Sorting crew' : world.layout.rules === 'relay' ? 'Cage guards' : lead.f.stats.name;
        showStocks($('rival-lives'), world.rivalStocks, team);
        if (horde) $('rival-score').setAttribute('aria-label', foes.filter((e) => e.f.stocks)
          .map((e) => e.f.stats.name + ' ' + tenth(e.f.damage) + '%').join(', '));
        else $('rival-score').removeAttribute('aria-label');
      }
    }
    $('dispatch-marks').textContent = 'Postmarks ' + countMarks(world.stamps) + ' / ' + campaign.rooms.length;
    if ($('dispatch-objective').textContent !== order) $('dispatch-objective').textContent = order;
  }
  function showPercent(element, damage) {
    element.className = 'percentage' + (damage >= 110 ? ' danger' : damage >= 65 ? ' high' : '');
    if (element.textContent !== tenth(damage) + '%') element.innerHTML = percentDigits(damage) + '%';
  }
  function showStocks(element, count, name) {
    const label = name + ' · ' + stockLabel(count);
    if (element.getAttribute('aria-label') === label) return;
    element.innerHTML = stockPaws(count);
    element.setAttribute('aria-label', label);
    element.title = label;
  }
  function runAdventure(dt, pads) {
    accumulator += dt;
    while (accumulator >= 1 / 60 && !world.finished) {
      const input = playerInput(0, pads);
      world.step(1 / 60, input);
      taps.clear();
      touchTaps.clear();
      accumulator -= 1 / 60;
    }
    updateDispatchHUD();
    view.draw($('game'), world, dt, world.time);
    if (world.finished === 'exit') {
      const { layout, roomIndex } = world;
      if (layout.outro) playScene(layout.outro);
      else {
        const next = roomIndex + 1;
        saveProgress({ room: next, pending: '' });
        showRoute();
        showDialog('dispatch-next', layout.name + ' clear',
          '<p>' + layout.dispatch + '</p><div class="dialog-actions"><button class="primary" data-next-stop="' +
          next + '">Continue to ' + campaign.rooms[next].name + '</button>' +
          '<button class="utility" data-do="route">Route map</button></div>');
        document.querySelector('[data-next-stop]').focus();
      }
    } else if (world.finished === 'fallen') {
      showDialog(
        'dispatch-fall',
        world.bridge ? 'Runner down' : 'Out of stocks',
        '<p>Restart at ' + (world.layout.checkpoints[world.checkpoint - 1]?.name || world.layout.name) +
          (world.bridge ? '.' : ' with ' + stockLabel(world.atCheckpoint?.stocks ?? campaign.fightStocks) + ' at ' +
          Math.floor(world.atCheckpoint?.damage || 0) + '%.') +
          '</p><div class="dialog-actions"><button class="primary" data-do="dispatch-retry">Retry</button>' +
          (!world.bridge && world.checkpoint ? '<button class="utility" data-do="dispatch-rematch">Restart mission</button>' : '') +
          '<button class="utility" data-do="route">Route map</button></div>',
        false,
      );
      document.querySelector('[data-do=dispatch-retry]').focus();
    }
  }
  function auditionLocation(id) {
    if(arenas[id])return arenas[id].name;
    return id==='menu'?'Main menu':'Victory';
  }
  function refreshAudition() {
    const notice=$('audition-status');
    if(!notice)return;
    const text=!settings.sound || !settings.volume || !settings.musicVolume ? 'Muted in Options' :
      !auditionPlaying ? 'Stopped' : music?.finished ? 'Finished' :
      audioContext?.state!=='running' ? 'Press Play to enable audio' :
      auditionUrgent && !music?.urgent ? 'Final-stock mix at the next bar' : auditionUrgent ? 'Final-stock mix' : 'Playing';
    if(notice.textContent!==text)notice.textContent=text;
  }
  function showSoundTest() {
    const tracks=window.YardScore.scores;
    auditionPlaying=false;auditionUrgent=false;
    showDialog('sound-test','Sound Test','<div class="option-list"><label for="audition-track">Track <select id="audition-track">'+
      Object.values(tracks).map(t=>'<option value="'+t.id+'">'+auditionLocation(t.id)+' · '+t.title+'</option>').join('')+
      '</select></label><button id="audition-mix" type="button" aria-pressed="false">Final-stock mix</button></div>'+
      '<p id="audition-status" role="status">Stopped</p><div class="dialog-actions"><button id="audition-play" class="primary" type="button">Play from start</button>'+
      '<button id="audition-stop" class="utility" type="button">Stop</button><button id="audition-back" class="utility" type="button">Options</button></div>');
    const select=$('audition-track'),mix=$('audition-mix');
    select.value=auditionTrack;
    mix.hidden=!arenas[auditionTrack];
    const play=()=>{
      unlockMusic();auditionPlaying=true;music?.restart();updateMusic();refreshAudition();
    };
    select.onchange=()=>{
      auditionTrack=select.value;auditionUrgent=false;mix.hidden=!arenas[auditionTrack];
      mix.setAttribute('aria-pressed','false');play();
    };
    mix.onclick=()=>{
      auditionUrgent=!auditionUrgent;
      mix.setAttribute('aria-pressed',String(auditionUrgent));
      if(!auditionPlaying)play();else updateMusic();
    };
    $('audition-play').onclick=play;
    $('audition-stop').onclick=()=>{auditionPlaying=false;music?.restart();refreshAudition();};
    $('audition-back').onclick=showOptions;
    refreshAudition();
  }
  function showOptions() {
    showDialog(
      'options',
      'Options',
      '<div class="option-list"><button type="button" data-do="option-sound" aria-pressed="' +
        settings.sound +
        '">Sound <b>' +
        (settings.sound ? 'On' : 'Off') +
        '</b></button><label for="option-volume">Master volume <input type="range" id="option-volume" min="0" max="100" step="5" value="' +
        settings.volume +
        '"><output id="option-volume-value">' +
        settings.volume +
        '%</output></label><label for="option-music">Music level <input type="range" id="option-music" min="0" max="100" step="5" value="'+
        settings.musicVolume+'"><output id="option-music-value">'+settings.musicVolume+'%</output></label>'+
        '<button type="button" id="open-sound-test">Sound Test</button><button type="button" data-do="bindings">Customize controls</button><button type="button" data-do="option-shake" aria-pressed="' +
        settings.shake +
        '">Camera shake <b>' +
        (settings.shake ? 'On' : 'Off') +
        '</b></button><button type="button" data-do="option-tiltStick" aria-pressed="' + settings.tiltStick +
        '">Grounded aim stick <b>' + (settings.tiltStick ? 'Tilt' : 'Smash') +
        '</b></button><p>Also applies to the aim keys and a swipe from Smash on touch.</p>' +
        [1,2].map(slot => {
          const quick = settings['quickAttack'+slot];
          return '<button type="button" data-do="option-quickAttack'+slot+'" aria-pressed="'+quick+'">P'+slot+
            ' ground Attack <b>'+(quick?'On press':'Hold to smash')+'</b></button>';
        }).join('') +
        '<p>On press starts a jab or tilt immediately. Hold Smash to charge. Hold to smash also lets you charge with Attack.</p>' +
        [1,2].map(slot => {
          const enabled = settings['flickJump'+slot];
          return '<button type="button" data-do="option-flickJump'+slot+'" aria-pressed="'+enabled+'">P'+slot+
            ' flick jump <b>'+(enabled?'On':'Off')+'</b></button>';
        }).join('') +
        '<p>Flick the left stick up or tap Up to jump. For an up tilt, aim gently, hold Walk, or slide from the center dot on touch. Online uses your P1 controls.</p></div><div class="dialog-actions"><button class="primary" data-do="close">Done</button></div>',
    );
  }
  $('dialog-body').addEventListener('click',e=>{if(e.target.closest('#open-sound-test'))showSoundTest();});
  $('dialog-body').addEventListener('input', (e) => {
    if(e.target.id==='option-music'){
      settings.musicVolume=Number(e.target.value);
      $('option-music-value').textContent=settings.musicVolume+'%';
      save();audioReady();updateMusic();
    }
    if (e.target.id === 'option-volume') {
      settings.volume = Number(e.target.value);
      $('option-volume-value').textContent = settings.volume + '%';
      save();
      audioReady();
    }
  });
  $('dialog-body').addEventListener('click', (e) => {
    const next = e.target.closest('[data-next-stop]');
    if (next) beginRun(Number(next.dataset.nextStop), 0);
  });
  $('home-adventure').onclick = () => {
    audioReady();
    sound('menu');
    showRoute();
  };
  document.querySelector('.mode-rack').onclick = (e) => {
    const b = e.target.closest('[data-enter-mode]');
    if (!b) return;
    settings.mode = b.dataset.enterMode;
    editing = 0;
    save();
    audioReady();
    sound('menu');
    toLobby();
  };
  const schoolLessons=window.FightSchool.lessons;
  const schoolSave={seen:false,index:0,passed:[]};
  try {
    const record=JSON.parse(localStorage.getItem('dog-fight-3.school') || '{}');
    schoolSave.seen=record.seen===true;
    const index=schoolLessons.findIndex(l=>l.id===record.lesson);
    if (index>=0) schoolSave.index=index;
    if (Array.isArray(record.passed)) schoolSave.passed=schoolLessons.filter(l=>record.passed.includes(l.id)).map(l=>l.id);
  } catch { /* The course also works without storage. */ }
  function saveSchool() {
    schoolSave.seen=true;
    try { localStorage.setItem('dog-fight-3.school',JSON.stringify({seen:true,lesson:schoolLessons[schoolSave.index].id,passed:schoolSave.passed})); } catch {}
  }
  function schoolHint(id,device) {
    const touch={move:'Right on the D-pad',platform:'Jump',jab:'Attack',tilt:'Down + Attack',air:'Jump + Attack',guard:'Shield',throw:'Grab, then Right',special:'Right + Special',return:'Up + Special, then Right',stock:'Right + Smash, release Smash'};
    if(device===2)return touch[id];
    const k=action=>device===1?padFor(0,action):keyFor(0,action);
    const right=device===1?'Stick right':k('right'), down=device===1?'Stick down':k('down');
    switch(id){
      case 'move': return right;
      case 'platform': return k('jump');
      case 'jab': return k('attack');
      case 'tilt': return down+' + '+k('attack');
      case 'air': return k('jump')+' + '+k('attack');
      case 'guard': return k('shield');
      case 'throw': return k('grab')+', then '+right;
      case 'special': return right+' + '+k('special');
      case 'return': return (device===1?'Stick up-right':right+' + '+k('up'))+' + '+k('special')+', then '+right;
      case 'stock': return right+' + '+k('smash')+', release '+k('smash');
    }
  }
  let schoolDevice=null, schoolPadActive=false;
  function renderSchool(pads) {
    const lesson=world.lesson, info=schoolLessons[lesson.index];
    const pad=pads[0], active=!!pad && (pad.buttons.some(b=>b.pressed) || pad.axes.some(a=>Math.abs(a)>.28));
    if(active && !schoolPadActive)schoolDevice=1;
    schoolPadActive=active;
    if(!pad && schoolDevice===1)schoolDevice=null;
    const device=schoolDevice ?? (pad?1:matchMedia('(pointer:coarse)').matches?2:0);
    const state=lesson.missed?'retry':lesson.done?'passed':'playing';
    const key=lesson.id+'/'+state+'/'+device;
    if ($('school-coach').dataset.key===key) return;
    $('school-coach').dataset.key=key;
    $('school-coach').dataset.state=state;
    $('school-count').textContent='Fight School · '+(lesson.index+1)+' / '+schoolLessons.length;
    $('school-title').textContent=info.title;
    $('school-task').textContent=lesson.missed?'The stock ended. Retry to return to the starting position.':lesson.done?info.success:info.task;
    $('school-bindings').textContent=lesson.done ? (device===1?'A to continue':device===0?'Enter to continue':'') :
      lesson.missed?'':schoolHint(info.id,device);
    $('school-next').hidden=!lesson.done;
    $('school-next').textContent=lesson.index===schoolLessons.length-1?'Play first match':'Next lesson';
    if (lesson.done && !schoolSave.passed.includes(lesson.id)) {
      schoolSave.passed.push(lesson.id);
      schoolSave.index=Math.min(lesson.index+1,schoolLessons.length-1);
      saveSchool();
    }
  }
  function startLesson(index) {
    leaveOnline();
    afterStory=null;
    schoolSave.index=index;
    saveSchool();
    startMatch({...settings,mode:'local',stage:schoolLessons[index].id==='platform'?'picnic':'nightmail',
      p1:'pip',p2:'brisket',fetch:false,minutes:0,lesson:index});
    delete $('school-coach').dataset.key;
    renderSchool(getPads());
  }
  function nextLesson() {
    const next=world.lesson.index+1;
    if (next<schoolLessons.length) startLesson(next);
    else startMatch({...settings,mode:'solo',p1:'pip',p2:'brisket',cpuLevel:'rookie',stage:'picnic',fetch:false,minutes:7});
  }
  function resumeCourse() {
    startLesson(schoolSave.passed.length===schoolLessons.length?0:schoolSave.index);
  }
  function schoolList() {
    showDialog('school','Fight School',
      '<p>'+schoolSave.passed.length+' of '+schoolLessons.length+' lessons cleared. Choose a lesson to play as Pip.</p><div id="school-syllabus">'+
      schoolLessons.map((l,i)=>'<button type="button" class="utility" data-lesson="'+i+'">'+(i+1)+'. '+l.title+
        (schoolSave.passed.includes(l.id)?' ✓':'')+'</button>').join('')+'</div><div class="dialog-actions"><button class="primary" id="school-resume">'+
      (world?.lesson?'Back to lesson':schoolSave.passed.length===schoolLessons.length?'Replay course':schoolSave.passed.length?'Continue course':'Start course')+'</button><button class="utility" data-do="home">Main menu</button></div>');
    $('school-syllabus').onclick=e=>{const button=e.target.closest('[data-lesson]');if(button) startLesson(Number(button.dataset.lesson));};
    $('school-resume').onclick=()=>world?.lesson?dismiss():resumeCourse();
    $('school-resume').focus({preventScroll:true});
  }
  $('home').addEventListener('click',e=>{
    if (!$('school-welcome').hidden && e.target.closest('button')) {
      if (!schoolSave.seen) saveSchool();
      $('school-welcome').hidden=true;
      $('home').classList.remove('has-welcome');
    }
  });
  $('welcome-play').onclick=resumeCourse;
  $('welcome-dismiss').onclick=()=>{saveSchool();showHome();};
  $('home-school').onclick=schoolList;
  $('school-next').onclick=nextLesson;
  $('school-retry').onclick=()=>startLesson(world.lesson.index);
  $('school-list').onclick=schoolList;
  $('home-guide').onclick = () => showMoves(settings.p1);
  $('home-options').onclick = showOptions;
  $('lobby-home').onclick = $('route-home').onclick = () => showHome();
  $('route-films').onclick = () => showReels();
  $('story-map').onclick = () => (inLibrary ? finishStory() : showRoute());
  $('story-next').onclick = () => film?.next();
  $('film-pause').onclick = toggleFilm;
  $('story-skip').onclick = finishStory;
  $('route-stops').onclick = (e) => {
    const b = e.target.closest('[data-stop]');
    if (b && !b.disabled) enterStop(Number(b.dataset.stop));
  };
  $('dispatch-start').onclick = () => {
    audioReady();
    sound('menu');
    if (progress.pending) return playScene(progress.pending);
    if (progress.complete) return playScene('opening');
    enterStop(progress.room, progress.checkpoint);
  };
  let onlineDog = settings.p1, peerLibrary = null, onlineRequest = 0;
  const online = new window.DogOnline.OnlineSession({
    status: onlineStatus, start: startMatch, votes: updateVotes,
    closed: (message) => showOnline(message, online.action === 'join' ? online.code : ''),
  });
  function leaveOnline() {
    onlineRequest++;
    online.close();
  }
  function showOnline(message = '', invite = '') {
    menuScreen('online-lobby');
    afterStory = null;
    $('online-code').value = invite;
    const roster = $('online-roster');
    if (!roster.childElementCount) {
      for (const [id, arena] of Object.entries(arenas)) $('online-stage').add(new Option(arena.name, id));
      for (const [kind, dog] of Object.entries(fighters)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'net-dog';
        button.dataset.dog = kind;
        button.innerHTML = '<img alt="" src="' + portrait(kind) + '"><strong>' + dog.name + '</strong><small>' + dog.style + '</small>';
        roster.append(button);
      }
    }
    onlineStatus('idle', message, '');
    $(invite ? 'online-join' : 'online-quick').focus({ preventScroll: true });
  }
  function onlineStatus(phase, message, code) {
    const busy = phase !== 'idle', room = phase === 'room';
    if (room && page === 'match') menuScreen('online-lobby', true);
    $('online-actions').hidden = busy;
    $('online-wait').hidden = !busy;
    $('online-status').textContent = (room && online.roomSet ? 'Best of three · ' : '') + message;
    $('online-connect-title').textContent = room ? 'Friend room' : phase === 'search' ? 'Quickplay' : 'Matchmaking';
    $('online-cancel').textContent = room ? 'Close room' : phase === 'search' ? 'Cancel search' : 'Cancel';
    $('online-invite').hidden = !room;
    $('online-invite-url').hidden = true;
    $('online-room-code').textContent = room ? code : '';
    $('online-copy').textContent = 'Copy invite link';
    for (const button of $('online-roster').children) {
      button.disabled = busy;
      button.setAttribute('aria-pressed', String(button.dataset.dog === onlineDog));
    }
    if (busy && !$('online-wait').contains(document.activeElement)) $('online-cancel').focus({ preventScroll: true });
  }
  function loadPeer() {
    if (window.Peer) return Promise.resolve();
    if (!peerLibrary) peerLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './vendor/peerjs-1.5.5.min.js';
      script.onload = resolve;
      script.onerror = () => { peerLibrary = null; script.remove(); reject(); };
      document.head.append(script);
    });
    return peerLibrary;
  }
  async function seekOpponent(action) {
    const code = $('online-code').value.trim().toUpperCase();
    if (action === 'join' && !window.DogOnline.validCode(code)) {
      $('online-status').textContent = 'Enter a six-character room code. Use letters or the digits 2–9.';
      $('online-code').focus();
      return;
    }
    audioReady();
    sound('menu');
    const request = ++onlineRequest;
    onlineStatus('connecting', 'Connecting…', '');
    try { await loadPeer(); }
    catch {
      if (request === onlineRequest) showOnline('Could not load online play. Please try again.', code);
      return;
    }
    if (request === onlineRequest) online.start(action, onlineDog, code, $('online-stage').value,
      $('online-format').getAttribute('aria-pressed') === 'true');
  }
  function updateVotes() {
    const button = document.querySelector('[data-do=online-rematch], [data-set-next]');
    if (!button) return;
    button.disabled = online.myVote;
    const arena = online.nextStage && arenas[online.nextStage].name;
    $('net-rematch-status').textContent = (arena ? arena + ' selected. ' : '') + (online.myVote ? 'Waiting for your opponent…' :
      online.theirVote ? (online.series ? 'Your opponent is ready.' : 'Your opponent wants a rematch.') : '');
  }
  $('online-format').onclick = () => {
    const button = $('online-format'), on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    button.textContent = 'Best of three · ' + (on ? 'On' : 'Off');
  };
  $('home-online').onclick = () => { audioReady(); sound('menu'); showOnline(); };
  $('online-home').onclick = () => showHome();
  $('online-cancel').onclick = () => showOnline(online.phase === 'room' ? 'Room closed.' : 'Matchmaking canceled.');
  $('online-quick').onclick = () => seekOpponent('quick');
  $('online-create').onclick = () => seekOpponent('create');
  $('online-join-form').onsubmit = (e) => { e.preventDefault(); seekOpponent('join'); };
  $('online-code').oninput = (e) => { e.target.value = e.target.value.toUpperCase(); };
  $('online-roster').onclick = (e) => {
    const dog = e.target.closest('[data-dog]');
    if (!dog || dog.disabled) return;
    onlineDog = dog.dataset.dog;
    sound('menu');
    onlineStatus('idle', '', '');
  };
  $('online-copy').onclick = async () => {
    const code = online.code;
    const url = location.protocol === 'file:' ? new URL('https://caleb-guyer.github.io/dog-fight-3/') : new URL(location.href);
    url.hash = 'room/' + code;
    try {
      await navigator.clipboard.writeText(url.href);
      if (online.phase === 'room' && online.code === code) $('online-copy').textContent = 'Link copied';
    } catch {
      if (online.phase !== 'room' || online.code !== code) return;
      const field = $('online-invite-url');
      field.value = url.href;
      field.hidden = false;
      field.select();
    }
  };
  let returnToOnline = false;
  window.addEventListener('pagehide', () => {
    returnToOnline = !!online.match || page === 'online-lobby';
    leaveOnline();
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && returnToOnline) showOnline();
  });
  const controls=window.FightControls;
  const layoutStore='dog-fight-3.controls';
  let layout=controls.load();
  try { layout=controls.load(JSON.parse(localStorage.getItem(layoutStore))); } catch {}
  let keys=layout.keyboard;
  let matchKeys=new Set(keys.flatMap(map=>Object.values(map)));
  const keyFor=(i,action)=>controls.keyName(keys[i][action]);
  const padFor=(i,action)=>controls.buttons[layout.pad[i][action]];
  const strikeKeys=i=>['aimLeft','aimRight','aimUp','aimDown'].map(a=>keyFor(i,a)).join(' / ');
  const edit={slot:0,device:'keyboard',mode:'idle',source:'home',action:'',value:null,down:new Set(),last:''};
  function applyLayouts(persist) {
    keys=layout.keyboard;
    matchKeys=new Set(keys.flatMap(map=>Object.values(map)));
    clearInput();
    delete $('school-coach').dataset.key;
    if(persist)try {localStorage.setItem(layoutStore,JSON.stringify(layout));} catch {}
  }
  function openLayouts(source) {
    edit.source=source;edit.mode='idle';edit.down.clear();
    drawLayouts();
  }
  function leaveLayouts() {
    if(edit.mode!=='idle'){
      edit.mode='idle';edit.down.clear();drawLayouts();return;
    }
    if(edit.source==='controls') showControls();
    else if(edit.source==='options') showOptions();
    else dismiss();
  }
  function assignControl() {
    controls.assign(layout,edit.device,edit.slot,edit.action,edit.value);
    applyLayouts(true);edit.mode='idle';
    drawLayouts(controls.names[edit.action]+' saved.');
  }
  function chooseBinding(action,value) {
    const map=layout[edit.device][edit.slot];
    edit.action=action;edit.value=value;
    if(map[action]===value){edit.mode='idle';drawLayouts();return;}
    const other=controls.occupant(layout,edit.device,edit.slot,value);
    if(!other){assignControl();return;}
    edit.mode='swap';
    const old=edit.device==='keyboard'?controls.keyName(map[action]):controls.buttons[map[action]];
    const name=edit.device==='keyboard'?controls.keyName(value):controls.buttons[value];
    drawLayouts('Swap '+name+' and '+old+'? P'+(other.slot+1)+' '+controls.names[other.action]+' will move to '+old+'.');
  }
  function showTestInputs(pads) {
    const map=layout[edit.device][edit.slot], pad=pads.length===1?pads[0]:pads[edit.slot];
    const pressed=Object.keys(map).filter(a=>edit.device==='keyboard'?edit.down.has(map[a]):down(pad,map[a]));
    const key=pressed.join(' ');
    if(key===edit.last)return;
    edit.last=key;
    for(const el of $('layout-grid').querySelectorAll('[data-action]'))
      el.classList.toggle('pressed',pressed.includes(el.dataset.action));
    $('layout-status').textContent=pressed.length?pressed.map(a=>controls.names[a]).join(' + '):
      edit.device==='pad' && !pad?'Connect a controller and press a button.':'Press or hold controls together.';
  }
  function drawLayouts(message='') {
    const {device,slot,mode}=edit,keyboard=device==='keyboard',testing=mode==='test',pending=mode==='swap'||mode==='reset';
    const map=layout[device][slot],actions=Object.keys(map);
    const title=keyboard?'Keyboard':'Controller';
    const value=a=>keyboard?controls.keyName(map[a]):controls.buttons[map[a]];
    const rows=actions.map(a=>{
      const label=controls.names[a];
      const binding=testing?'<kbd>'+value(a)+'</kbd>':keyboard?
        '<button type="button" class="utility" data-key="'+a+'" aria-label="Change '+label+' key, currently '+value(a)+'">'+(mode==='capture' && edit.action===a?'Press a key…':value(a))+'</button>':
        '<select data-pad="'+a+'" aria-label="'+label+' button">'+controls.buttons.map((text,n)=>'<option value="'+n+'"'+(n===map[a]?' selected':'')+'>'+text+'</option>').join('')+'</select>';
      return '<div data-action="'+a+'"><span>'+label+'</span>'+binding+'</div>';
    }).join('');
    showDialog('bindings','Customize controls',
      '<div class="layout-switch"><label>Player <select id="layout-slot"><option value="0">P1</option><option value="1">P2</option></select></label>'+
      '<label>Device <select id="layout-device"><option value="keyboard">Keyboard</option><option value="pad">Controller</option></select></label></div>'+
      '<p>'+(testing?(keyboard?'Press your keys to see which actions register.':'Press controller buttons to test them. Start leaves the test.') : keyboard?'Choose an action, then press its new key. Both players share this keyboard.':
        'Choose a button for each action. A and B still select and go back in menus.')+'</p>'+
      '<p id="layout-status" role="status">'+(message || (mode==='capture'?'Press a key for '+controls.names[edit.action]+'. Escape cancels.':
        mode==='reset'?keyboard?'Restore both keyboard layouts to their defaults?':'Restore the P'+(slot+1)+' controller defaults?':'Online uses your P1 layout.'))+'</p>'+
      '<div id="layout-grid"'+(pending?' hidden':'')+'>'+rows+'</div>'+
      '<div class="dialog-actions">'+(pending?'<button type="button" class="primary" id="layout-confirm">'+(mode==='swap'?'Swap assignments':'Restore defaults')+'</button>':'')+
      (mode==='idle'?'<button type="button" class="primary" id="layout-test">Test layout</button><button type="button" class="utility" id="layout-reset">'+(keyboard?'Restore keyboards':'Restore controller')+'</button>':'')+
      '<button type="button" class="utility" id="layout-back">'+(pending||mode==='capture'?'Cancel':testing?'Done testing':'Done')+'</button></div>');
    $('layout-slot').value=String(slot);$('layout-device').value=device;
    $('layout-slot').onchange=e=>{edit.slot=Number(e.target.value);edit.mode='idle';drawLayouts();$('layout-slot').focus();};
    $('layout-device').onchange=e=>{edit.device=e.target.value;edit.mode='idle';drawLayouts();$('layout-device').focus();};
    $('layout-grid').onclick=e=>{
      const b=e.target.closest('[data-key]');
      if(b){edit.mode='capture';edit.action=b.dataset.key;drawLayouts();}
    };
    $('layout-grid').onchange=e=>{if(e.target.dataset.pad)chooseBinding(e.target.dataset.pad,Number(e.target.value));};
    $('layout-back').onclick=leaveLayouts;
    if(mode==='idle'){
      $('layout-test').onclick=()=>{edit.mode='test';edit.down.clear();edit.last=null;drawLayouts();showTestInputs(getPads());};
      $('layout-reset').onclick=()=>{edit.mode='reset';drawLayouts();};
    }
    if(pending) $('layout-confirm').onclick=()=>{
      if(mode==='swap')return assignControl();
      if(keyboard) layout.keyboard=controls.defaults('keyboard');
      else layout.pad[slot]=controls.defaults('pad')[slot];
      applyLayouts(true);edit.mode='idle';drawLayouts('Default assignments restored.');
    };
    const row=$('layout-grid').querySelector('[data-action="'+edit.action+'"] button, [data-action="'+edit.action+'"] select');
    (pending || testing ? $('layout-back') : row || $('layout-slot')).focus({preventScroll:true});
  }
  window.addEventListener('keydown',e=>{
    if(dialogType!=='bindings')return;
    if(edit.mode==='test' && edit.device==='keyboard' && controls.allowed(e.code)){
      e.preventDefault();e.stopImmediatePropagation();edit.down.add(e.code);showTestInputs([]);return;
    }
    if(edit.mode!=='capture')return;
    if(e.code==='Tab'){edit.mode='idle';drawLayouts();return;}
    e.preventDefault();e.stopImmediatePropagation();
    if(e.repeat)return;
    if(e.code==='Escape'){leaveLayouts();return;}
    if(!controls.allowed(e.code) || e.altKey || e.metaKey || (e.ctrlKey && !e.code.startsWith('Control'))){
      $('layout-status').textContent='That key is reserved. Try a letter, number, arrow, punctuation key, Shift or Ctrl.';return;
    }
    chooseBinding(edit.action,e.code);
  },true);
  window.addEventListener('keyup',e=>{
    if(dialogType==='bindings' && edit.mode==='test' && edit.device==='keyboard'){
      edit.down.delete(e.code);showTestInputs([]);
    }
  });
  window.addEventListener('storage',e=>{
    if(e.key!==layoutStore && e.key!==null)return;
    try{layout=controls.load(JSON.parse(localStorage.getItem(layoutStore)));}catch{return;}
    applyLayouts(false);
    if(dialogType==='bindings'){edit.mode='idle';drawLayouts('Layout updated from another tab.');}
  });
  const attackAim = [{}, {}], smashAim = [{}, {}];
  function buttonAim(slot) {
    const map = keys[slot];
    const active = name => held.has(map[name]) || (slot === 0 && touches.has(name));
    const soft = slot === 0 && touchPointers.get(walkPointer)?.dataset.touch;
    const x = Number(active('right')) - Number(active('left'));
    const y = Number(active('down')) - Number(active('up'));
    return {
      x: x * (active('walk') || (soft && (soft.endsWith('left') || soft.endsWith('right'))) ? 64 / 127 : 1),
      rawX: x, y: y > 0 && (active('walk') || soft === 'down') ? 64 / 127 : y,
    };
  }
  window.addEventListener('keydown', (e) => {
    if (page !== 'match' || $('dialog').open) return;
    if (world?.lesson?.done && e.code==='Enter' && !e.repeat && e.target=== $('game')) {
      e.preventDefault(); nextLesson(); return;
    }
    if (e.target instanceof HTMLSelectElement) return;
    if (!matchKeys.has(e.code) && world?.mode === 'training' && !$('moment-save').hidden && (e.code === 'Digit1' || e.code === 'Digit2')) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      if (!e.repeat) $(e.code === 'Digit1' ? 'moment-save' : 'moment-retry').click();
      return;
    }
    if (!matchKeys.has(e.code) && world?.mode === 'training' && (e.code === 'BracketLeft' || e.code === 'BracketRight')) {
      e.preventDefault();
      if (!e.repeat) (e.code === 'BracketLeft' ? toggleFrames : stepTrainingFrame)();
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (!e.repeat) showPause();
      return;
    }
    if (e.target instanceof HTMLInputElement) {
      if (e.target.id !== 'dummy-damage' || e.code !== keys[0].attack ||
          !(world?.edgePractice?.timeCatch || world?.comboPractice?.defending)) return;
      $('game').focus({ preventScroll: true });
    }
    if (!matchKeys.has(e.code)) return;
    if(world?.lesson)schoolDevice=0;
    e.preventDefault();
    held.add(e.code);
    if (!e.repeat) {
      taps.add(e.code);
      const slot = keys.findIndex(map => map.attack === e.code);
      if (slot >= 0) attackAim[slot] = buttonAim(slot);
      const smashSlot = keys.findIndex(map => map.smash === e.code);
      if (smashSlot >= 0) smashAim[smashSlot] = buttonAim(smashSlot);
    }
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  const touchButtons = [...document.querySelectorAll('[data-touch]')];
  function setTouch(pointerId, button) {
    const previous = touchPointers.get(pointerId);
    if (previous === button) return;
    const wasUp = touches.has('up');
    if (button) touchPointers.set(pointerId, button);
    else touchPointers.delete(pointerId);
    touches.clear();
    const pressed = new Set(touchPointers.values());
    for (const el of pressed) for (const key of el.dataset.touch.split('-')) touches.add(key);
    if (button) {
      if (previous)
        for (const key of previous.dataset.touch.split('-')) if (!touches.has(key)) touchTaps.delete(key);
      for (const key of button.dataset.touch.split('-')) touchTaps.add(key);
      if (!wasUp && touches.has('up')) {
        touchTaps.add('flickUp');
        if (walkPointer === pointerId) touchTaps.add('gentleUp');
      }
      if (button.dataset.touch === 'attack') attackAim[0] = buttonAim(0);
      if (button.dataset.touch === 'smash') smashAim[0] = buttonAim(0);
    }
    for (const el of touchButtons) el.classList.toggle('held', pressed.has(el));
  }
  touchButtons.forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      if(world?.lesson)schoolDevice=2;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      if (el.dataset.touch === 'neutral') walkPointer = e.pointerId;
      if (el.dataset.touch === 'smash') touchFlick = { id: e.pointerId, x: e.clientX, y: e.clientY,
        fired: false, deferSmash: settings.tiltStick, started: performance.now(), committed: false };
      setTouch(e.pointerId, el);
      if (el.dataset.touch === 'smash' && touchFlick.deferSmash) touchTaps.delete('smash');
      audioReady();
    });
    if (el.closest('.dpad'))
      el.addEventListener('pointermove', (e) => {
        if (!touchPointers.has(e.pointerId)) return;
        const aim = document.elementFromPoint(e.clientX, e.clientY)?.closest('.dpad [data-touch]');
        if (aim) setTouch(e.pointerId, aim);
      });
    if (el.dataset.touch === 'jump')
      el.addEventListener('pointermove', e => {
        if (touchPointers.get(e.pointerId) !== el) return;
        const next = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-touch]');
        const action = next?.dataset.touch;
        const sideAttack = action === 'attack' && (touches.has('left') || touches.has('right'));
        if (!sideAttack && !(touches.has('up') && (action === 'smash' || action === 'special'))) return;
        const freshJump = touchTaps.has('jump');
        setTouch(e.pointerId, next);
        if (freshJump) touchTaps.add('jump');
      });
    if (el.dataset.touch === 'smash')
      el.addEventListener('pointermove', (e) => {
        if (e.pointerId !== touchFlick?.id || touchFlick.fired || touchFlick.committed) return;
        const dx = e.clientX - touchFlick.x, dy = e.clientY - touchFlick.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return;
        touchFlick.fired = true;
        flickAim = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
        touchTaps.add('aimStick');
      });
    const release = (e) => {
      if (walkPointer === e.pointerId) walkPointer = null;
      if (touchFlick?.id === e.pointerId) {
        if (touchFlick.deferSmash && !touchFlick.fired && !touchFlick.committed && e.type === 'pointerup')
          touchTaps.add('smash');
        touchFlick = null;
      }
      setTouch(e.pointerId, null);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  });
  function onBlur() {
    if(dialogType==='bindings' && edit.mode==='test'){edit.down.clear();showTestInputs([]);}
    musicFocused=false;music?.stop();
    clearInput();
    if (page === 'dispatch-story') setFilmPaused(true);
    if (page === 'match' && !online.match && !paused && world?.end === null) showPause();
  }
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus',()=>{musicFocused=true;});
  const redrawPausedStage = () => {
    if (page === 'match' && world && view && (paused || frameLab.mode === 'frozen'))
      view.draw($('game'), world, 0, frameLab.mode === 'frozen' ? frameLab.renderTime : world.time, online.match?.confirmedWorld || world);
  };
  if (window.ResizeObserver) new ResizeObserver(redrawPausedStage).observe($('game'));
  else window.addEventListener('resize', redrawPausedStage);
  const reframeFilm = () => film?.paint(true);
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(reframeFilm);
    for (const selector of ['#story-cover', '.film-heading', '.film-footer', '.topbar'])
      observer.observe(document.querySelector(selector));
  } else window.addEventListener('resize', reframeFilm);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onBlur();
    else musicFocused=document.hasFocus();
  });
  function getPads() {
    try {
      return navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  const down = (pad, i) => !!pad?.buttons?.[i]?.pressed;
  function menuButtons() {
    const root = $('dialog').open ? $('dialog') : $(page);
    return root
      ? [...root.querySelectorAll('button,input:not([readonly]),select')].filter(
          (el) => el.offsetWidth && el.offsetHeight && !el.disabled,
        )
      : [];
  }
  function moveMenuFocus(direction) {
    const items = menuButtons(),
      i = items.indexOf(document.activeElement);
    if (items.length)
      items[
        i < 0 ? (direction > 0 ? 0 : items.length - 1) : (i + direction + items.length) % items.length
      ].focus();
  }
  function menuBack() {
    if ($('dialog').open) {
      exitDialog();
      return;
    }
    if (page === 'dispatch-story') $('story-map').click();
    else if (page === 'online-lobby' && !$('online-wait').hidden) showOnline();
    else if (page === 'dispatch-route' || page === 'lobby' || page === 'online-lobby') showHome();
  }
  window.addEventListener('keydown', (e) => {
    if (
      (page === 'match' && !$('dialog').open) ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement
    )
      return;
    if (e.code === 'KeyP' && page === 'dispatch-story' && !$('dialog').open) {
      e.preventDefault();
      if (!e.repeat) toggleFilm();
      return;
    }
    if (e.code === 'Escape' && !$('dialog').open) {
      e.preventDefault();
      menuBack();
      return;
    }
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.code)) {
      e.preventDefault();
      moveMenuFocus(e.code === 'ArrowDown' || e.code === 'ArrowRight' ? 1 : -1);
    }
  });
  function playerInput(i, pads, fighterIndex = i) {
    const map = keys[i];
    const tapped = (action) => taps.has(map[action]) || (!i && touchTaps.has(action));
    const key = (action) => held.has(map[action]) || (!i && touches.has(action)) || tapped(action);
    const pad = world.hasSecondPlayer && !world.lesson && !online.match && pads.length === 1 ? (i === 1 ? pads[0] : null) : pads[i];
    const mapped=action=>{
      const n=layout.pad[i][action];
      return down(pad,n) && !(menuPadButtons.get(pad.index) & (1<<n));
    };
    const axis = (n) => (Math.abs(pad?.axes?.[n] || 0) > 0.23 ? pad.axes[n] : 0);
    const left = key('left') || down(pad, 14),
      right = key('right') || down(pad, 15);
    const x = Number(right) - Number(left);
    // A direction released after Attack still belongs to that tap when both edges fall between game ticks.
    const aim = tapped('attack') ? attackAim[i] : null;
    let grabX = x || axis(0) || aim?.rawX || 0;
    if (left && right) {
      // Rolling one direction key onto the other is a turn even during their brief overlap.
      const leftTap = tapped('left'),
        rightTap = tapped('right');
      grabX = leftTap === rightTap ? (world.dogs[fighterIndex].prev.grabX ?? 0) : rightTap ? 1 : -1;
    }
    const up = key('up') || down(pad, 12),
      downAim = key('down') || down(pad, 13);
    const y = Number(downAim) - Number(up);
    // A quick Smash tap can outlive both direction keys or both thumbs in the input queue.
    const savedSmash = tapped('smash') && !x && !y && !axis(0) && !axis(1) ? smashAim[i] : null;
    const digitalAim = left || right || up || downAim || (!i && touches.has('neutral'));
    const rightX = axis(2),
      rightY = axis(3);
    const rightStick = Math.max(Math.abs(rightX), Math.abs(rightY)) > (rightStickHeld[i] ? 0.38 : 0.62);
    rightStickHeld[i] = rightStick;
    const keyAimX = Number(key('aimRight')) - Number(key('aimLeft'));
    const keyAimY = Number(key('aimDown')) - Number(key('aimUp'));
    const flick = !i && (touchFlick?.fired || touchTaps.has('aimStick')) ? flickAim : null;
    const aimStick = !!(rightStick || keyAimX || keyAimY || flick);
    // With an explicit Up + Jump chord the smash must reach the fighter before takeoff.
    if (!i && touchFlick?.deferSmash && !touchFlick.fired) {
      const f = world.dogs[fighterIndex];
      if ((y < 0 && f.ground >= 0 && (tapped('jump') || f.jumpSquat)) || performance.now() - touchFlick.started >= 110)
        touchFlick.committed = true;
    }
    const touchSmash = !i && touches.has('smash') && (!touchFlick?.deferSmash || touchFlick.committed);
    const fromCenter = !i && touchPointers.get(walkPointer)?.dataset.touch;
    // A quick thumb release can leave queued direction taps after the center-slide gesture ends.
    const tappedWalk = aim?.x === x * (64 / 127) && x !== 0;
    const walk = key('walk') || tappedWalk || (fromCenter && (fromCenter.endsWith('left') || fromCenter.endsWith('right')));
    const shield = key('shield') || mapped('shield') || mapped('shieldAlt');
    const shortHop = key('hop') || mapped('hop');
    const grounded = world.dogs[fighterIndex].ground >= 0;
    const gentleGuard = shield && grounded && (key('walk') || fromCenter);
    const softCrawl = world.dogs[fighterIndex].kit.crawl && fromCenter && fromCenter.startsWith('down-');
    const gentleDown = y > 0 && !shield && (key('walk') || fromCenter === 'down' || softCrawl || aim?.y === 64 / 127);
    const side = (walk ? x * (64 / 127) : x) || axis(0) || (!left && !right && aim?.x) || 0;
    const vertical = ((gentleGuard || gentleDown) ? y * (64 / 127) : y) || axis(1) || (!up && !downAim && aim?.y) || 0;
    // Keep a held direction aimed when the second bumper is released. Centering rearms the dodge.
    if (grounded && mapped('shield') && mapped('shieldAlt')) shieldTiltLocked[i] = true;
    else if (!grounded || !shield || Math.max(Math.abs(side), Math.abs(vertical)) < 0.24) shieldTiltLocked[i] = false;
    const input = {
      x: shieldTiltLocked[i] ? clamp(side, -0.5, 0.5) : side,
      grabX,
      y: shieldTiltLocked[i] ? clamp(vertical, -0.5, 0.5) : vertical,
      // Apply the air dodge's radial dead zone to the whole stick, including shallow angles.
      airDodgeX: digitalAim ? (left || right ? grabX : 0) : pad?.axes?.[0] || 0,
      airDodgeY: digitalAim ? y : pad?.axes?.[1] || 0,
      jump: key('jump') || mapped('jump') || shortHop,
      shortHop,
      attack: key('attack') || mapped('attack'),
      quickAttack: settings[i === 0 ? 'quickAttack1' : 'quickAttack2'],
      smash: held.has(map.smash) || tapped('smash') || touchSmash || mapped('smash'),
      aimStick,
      tiltMode: settings.tiltStick && aimStick,
      smashX: aimStick ? (flick?.x ?? (keyAimX || keyAimY ? keyAimX : rightX)) : x || axis(0) || savedSmash?.rawX || 0,
      smashY: aimStick ? (flick?.y ?? (keyAimX || keyAimY ? keyAimY : rightY)) : y || axis(1) || savedSmash?.y || 0,
      special: key('special') || mapped('special'),
      shield,
      grab: key('grab') || mapped('grab'),
      tapped: {
        jump: tapped('jump') || tapped('hop'),
        attack: tapped('attack'),
        smash: tapped('smash'),
        aimStick: !!(flick && touchTaps.has('aimStick')) ||
          ['aimLeft','aimRight','aimUp','aimDown'].some(tapped),
        special: tapped('special'),
        shield: tapped('shield'),
        grab: tapped('grab'),
      },
    };
    const trial = !i && world.spacingPractice?.pattern === 'landing' ? world.spacingPractice.flickJump : undefined;
    if (trial ?? settings[i === 0 ? 'flickJump1' : 'flickJump2']) {
      const device = pad ? pad.index + ':' + pad.id : '';
      if (flickJumpStates[i].device !== device) flickJumpStates[i] = {device};
      const gentle = key('walk') || !!fromCenter || (!i && touchTaps.has('gentleUp')) || shieldTiltLocked[i];
      applyFlickJump(flickJumpStates[i],input,y || axis(1),gentle,taps.has(map.up) || (!i && touchTaps.has('flickUp')));
    }
    return input;
  }
  const idlePad={};
  let oldPad = idlePad;
  const menuPadButtons = new Map();
  function padMenu(pads) {
    if(dialogType==='bindings' && edit.mode==='test' && edit.device==='pad')showTestInputs(pads);
    if (!pads.length) {
      if (oldPad!==idlePad) { oldPad=idlePad; menuPadButtons.clear(); }
      return;
    }
    // A and B also fight. Consume menu presses until that particular pad releases them.
    const menuOpen = page !== 'match' || $('dialog').open;
    for (const pad of pads) {
      const buttons = (down(pad, 0) ? 1 : 0) | (down(pad, 1) ? 2 : 0);
      const used = menuOpen ? buttons : (menuPadButtons.get(pad.index) || 0) & buttons;
      if (used) menuPadButtons.set(pad.index, used);
      else menuPadButtons.delete(pad.index);
    }
    const any = (i) => pads.some((p) => down(p, i));
    const now = {
      pause: any(9),
      freeze: any(10),
      step: any(11),
      confirm: any(0),
      back: any(1),
      horizontal:
        any(15) || pads.some((p) => (p.axes[0] || 0) > 0.65)
          ? 1
          : any(14) || pads.some((p) => (p.axes[0] || 0) < -0.65)
            ? -1
            : 0,
      next: any(13) || any(15) || pads.some((p) => (p.axes[0] || 0) > 0.65 || (p.axes[1] || 0) > 0.65),
      prev: any(12) || any(14) || pads.some((p) => (p.axes[0] || 0) < -0.65 || (p.axes[1] || 0) < -0.65),
    };
    if(dialogType==='bindings' && edit.mode==='test' && edit.device==='pad'){
      if(now.pause && !oldPad.pause)leaveLayouts();
      oldPad=now;return;
    }
    if (!musicUnlocked && now.confirm && !oldPad.confirm) unlockMusic();
    if (now.pause && !oldPad.pause) {
      if (dialogType === 'pause' || dialogType === 'online-menu') dismiss();
      else if (page === 'match' && !dialogType) showPause();
      else if (page === 'dispatch-story' && !dialogType) toggleFilm();
      else if (page === 'lobby' && !dialogType) $('start').click();
    } else if (world?.lesson?.done && !menuOpen && now.confirm && !oldPad.confirm) {
      for (const pad of pads) if (down(pad,0)) menuPadButtons.set(pad.index,1);
      nextLesson();
    } else if (page === 'match' && world?.mode === 'training' && !$('dialog').open &&
        (now.freeze && !oldPad.freeze || now.step && !oldPad.step)) {
      if (now.freeze && !oldPad.freeze) toggleFrames();
      else stepTrainingFrame();
    } else if (menuOpen && (now.horizontal!==oldPad.horizontal || now.back&&!oldPad.back ||
        now.next&&!oldPad.next || now.prev&&!oldPad.prev || now.confirm&&!oldPad.confirm)) {
      const items = menuButtons();
      const n = items.indexOf(document.activeElement);
      if (items[n] instanceof HTMLSelectElement && now.horizontal && now.horizontal !== oldPad.horizontal) {
        const el=items[n];
        el.selectedIndex=(el.selectedIndex+now.horizontal+el.options.length)%el.options.length;
        el.dispatchEvent(new Event('change',{bubbles:true}));
      } else if (n >= 0 && items[n].type === 'range' && now.horizontal && now.horizontal !== oldPad.horizontal) {
        if (now.horizontal > 0) items[n].stepUp();
        else items[n].stepDown();
        items[n].dispatchEvent(new Event('input', { bubbles: true }));
      } else if (now.back && !oldPad.back) menuBack();
      else if (items.length && ((now.next && !oldPad.next) || (now.prev && !oldPad.prev)))
        moveMenuFocus(now.next ? 1 : -1);
      if (now.confirm && !oldPad.confirm) {
        if (n >= 0) items[n].click();
        else if (items.length) items[0].click();
      }
    }
    oldPad = now;
  }
  function roundCall(w) {
    if (w.lesson) return '';
    if (w.endReason === 'time') return 'Time!';
    if (w.suddenDeath) return w.suddenDeath.intro > 0 ? 'Sudden Death' : w.suddenDeath.frames < 22 ? 'GO!' : '';
    return w.time < 0.37 && w.mode !== 'training' ? 'GO!' : '';
  }
  function runOnline(dt, pads) {
    const match = online.match;
    accumulator += dt;
    while (accumulator >= 1 / 60 && match.confirmedWorld.end === null) {
      match.tick(() => {
        const input = $('dialog').open ? idleInput : playerInput(0, pads, online.side);
        taps.clear();
        touchTaps.clear();
        return input;
      }, world);
      accumulator -= 1 / 60;
    }
    const waiting = performance.now() - match.lastStep;
    const ended = match.confirmedWorld.end !== null;
    $('countdown').classList.toggle('net-lag', !ended && waiting > 850);
    if (!ended && waiting > 22000) return online.opponentLeft('The other player stopped responding.');
    const call = !ended && waiting > 850 ? 'Waiting for opponent…' : roundCall(match.confirmedWorld);
    if ($('countdown').textContent!==call) $('countdown').textContent=call;
    updateHUD();
    if (ended) online.finish(match.confirmedWorld.end);
  }
  function frame(timestamp) {
    const now = timestamp / 1000,
      dt = Math.min(0.09, Math.max(0, now - before));
    before = now;
    const pads = getPads();
    padMenu(pads);
    if (page === 'dispatch-story' && film && !document.hidden && !$('dialog').open) {
      film.tick(dt);
    } else if (page === 'lobby') {
      if (now - lastPreview > 1 / 24 && !document.hidden && !$('dialog').open) {
        drawPreview($('preview'), settings, now);
        lastPreview = now;
      }
    } else if (!paused && world?.mode === 'adventure') {
      runAdventure(dt, pads);
    } else if (!paused && world) {
      let steppedFrame = false;
      if (countdown > 0) {
        countdown = Math.max(0, countdown - dt);
        const number = Math.ceil(countdown / 0.8);
        if (number !== lastCount) {
          lastCount = number;
          sound(number ? 'tick' : 'go');
        }
        $('countdown').textContent = number || 'GO!';
        if (!number) {
          // Discard released countdown taps. Held keyboard and touch controls start with the stick on GO.
          taps.clear();
          touchTaps.clear();
          if (online.match) online.match.lastStep = performance.now();
          announce('Fight!');
        }
      } else if (online.match && !online.finished) {
        runOnline(dt, pads);
      } else if (world.end === null) {
        const call=roundCall(world);
        if ($('countdown').textContent!==call) $('countdown').textContent=call;
        if (frameLab.mode === 'frozen') {
          accumulator = frameLab.pending > 0 ? 1 / 60 : 0;
          if (frameLab.pending > 0) frameLab.pending--;
        } else accumulator += world.wallPractice?.heavy || world.launchPractice?.slow || world.edgePractice?.slow || world.footworkPractice?.slow || world.wavePractice?.slow || world.comboPractice?.slow || world.escapePractice?.slow || world.climbPractice?.slow || world.platformPractice?.slow || world.spacingPractice?.slow || world.chasePractice?.slow || world.meteorPractice?.slow || world.stockPractice?.slow || world.survivalPractice?.slow || world.shieldPractice?.slow || world.airPractice?.slow ? dt / 2 : dt;
        while (accumulator >= 1 / 60 && world.end === null) {
          const slot = world.trainingPlayerSlot;
          const input = playerInput(0, pads, slot);
          const player = world.dogs[slot];
          if (drillWaiting) {
            const ready = player.ledge
              ? input.attack ||
                input.jump ||
                input.shield ||
                input.tapped?.shield ||
                Math.abs(input.x) > 0.45 ||
                input.y > 0.5
              : input.jump || input.special;
            if (ready) {
              drillWaiting = false;
              if (!player.ledge) $('recovery-tip').textContent = player.kit.recovery;
            }
          }
          if (!drillWaiting && (!world.lesson || world.lesson.canStep(input))) {
            const airborne = player.ground < 0;
            world.step(1 / 60, input, world.lesson ? world.lesson.partner(input) : world.hasSecondPlayer ? playerInput(1, pads) : idleInput);
            if (world.lesson) world.lesson.afterStep(world);
            if (frameLab.mode === 'frozen') {
              frameLab.count++;
              frameLab.renderTime += 1/60;
              steppedFrame = true;
            } else if (frameLab.mode === 'armed' && airborne && player.ground >= 0 && player.landingLag > 0) {
              setFrameMode('frozen');
              steppedFrame = true;
            }
            if (steppedFrame) showFrameStatus();
            if (drillSide && (player.attack?.ledgeAttack || (player.ground >= 0 && !player.floorAction))) {
              $('recovery-tip').textContent = player.attack?.ledgeAttack
                ? player.lastMove + '. Choose Practice ledge attack to try again.'
                : 'Back on stage. Pick a ledge to go again.';
              drillSide = null;
            }
          }
          taps.clear();
          touchTaps.clear();
          accumulator = Math.max(0, accumulator - 1 / 60);
        }
        if (world.endReason === 'time') $('countdown').textContent = 'Time!';
        if (world.lesson) renderSchool(pads);
        updateHUD();
      } else {
        resultDelay -= dt;
        if (resultDelay <= 0 && (online.match ? !['online-result','set-pick'].includes(dialogType) : !$('dialog').open)) showResult();
      }
      if (world && (frameLab.mode !== 'frozen' || steppedFrame)) {
        const confirmed = online.match?.confirmedWorld;
        const waitingOnKO = confirmed && (world.end !== null && confirmed.end === null ||
          world.suddenDeath?.round !== confirmed.suddenDeath?.round);
        const studying = !!world.survivalPractice?.preview;
        view.draw($('game'), waitingOnKO ? confirmed : world, studying ? 0 : frameLab.mode === 'frozen' ? 1/60 : dt,
          studying ? world.time : frameLab.mode === 'frozen' ? frameLab.renderTime : now, confirmed || world);
      }
    }
    updateMusic();
    requestAnimationFrame(frame);
  }
  updateAudio();
  function openFilmLibraryLink() {
    showRoute();
    showReels();
  }
  function openLink() {
    const hash = location.hash;
    const openingStages = {'#solo/night-mail':'nightmail', '#solo/picnic-table':'picnic', '#solo/canal-lock':'canal'};
    if (hash === '#solo/best-of-three') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings,p1:'pip',p2:'brisket',mode:'solo',stage:'picnic',cpuLevel:'rival',minutes:7,fetch:false},
        undefined,42,new StockSet('picnic'));
    } else if (Object.hasOwn(openingStages, hash)) {
      leaveOnline();
      afterStory = null;
      const stage = openingStages[hash];
      startMatch({ ...settings, p1:'pip', p2:'brisket', mode:'solo', stage,
        cpuLevel:'rival', minutes:7, fetch:false }, undefined, 42);
    } else if (hash === '#solo/intercept-clover') {
      startCloverApproach();
    } else if (hash === '#solo/box-with-pip') {
      fightRivalPip();
    } else if (hash === '#solo/shoulder-charge') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'pip', p2:'brisket', mode:'solo', stage:'picnic', cpuLevel:'rival',
        minutes:7, fetch:false}, undefined, 42, null, {leadInFrames:54});
      showDialog('pause', 'Brisket’s Shoulder Charge', '<p>Brisket is bearing down on Pip. Hold Shield as play starts, then retry the position and jump over him.</p>' +
        '<div class="dialog-actions"><button class="primary" data-do="rehearse">Practice this position</button>' +
        '<button class="utility" data-do="resume">Play the stock</button></div>');
      document.querySelector('[data-do=rehearse]').focus();
    } else if (hash === '#solo/ledge-trap') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'pip', p2:'brisket', mode:'solo', stage:'picnic', cpuLevel:'rival',
        minutes:7, fetch:false, ledgeTrapStart:true}, undefined, 42);
    } else if (hash === '#solo/under-the-table') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'noodle', p2:'pip', mode:'solo', stage:'picnic', cpuLevel:'rival',
        minutes:7, fetch:false, underTableStart:true}, undefined, 42);
    } else if (hash === '#solo/crawl') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'noodle', p2:'clover', mode:'solo', stage:'picnic',
        cpuLevel:'rival', minutes:7, fetch:false}, undefined, 4);
    } else if (hash === '#solo/get-up') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'brisket', p2:'clover', mode:'solo', stage:'picnic',
        cpuLevel:'rival', minutes:7, fetch:false}, undefined, 4);
    } else if (hash === '#solo/shield-punish') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'brisket', p2:'pip', mode:'solo', stage:'picnic', cpuLevel:'rival',
        minutes:7, fetch:false}, undefined, 75);
    } else if (hash === '#solo/last-stock') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'pip', p2:'brisket', mode:'solo', stage:'nightmail', cpuLevel:'rival',
        minutes:7, fetch:false, lastStockStart:true}, undefined, 42);
    } else if (hash === '#solo/sudden-death') {
      leaveOnline();
      afterStory = null;
      startMatch({ ...settings, p1:'pip', p2:'brisket', mode:'solo', stage:'picnic', cpuLevel:'arcade', suddenStart:true }, undefined, 17);
    } else if (hash === '#training/practice') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', fetch:false});
      showPractice();
    } else if (hash === '#training/sparring') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false});
      drill('partner');
    } else if (/^#training\/read-the-landing(?:\/(pip|brisket|noodle|clover))?$/.test(hash)) {
      leaveOnline();
      afterStory = null;
      startMatch({...settings,mode:'training',p1:hash.split('/')[2] || 'pip',p2:'brisket',stage:'nightmail',fetch:false});
      drill('shield',false,'crossup',undefined,{choice:'front',dir:1});
    } else if (hash === '#sound-test') {
      showHome(false);showSoundTest();
    } else if (hash === '#controls') {
      showHome(false);openLayouts('home');
    } else if (hash === '#tutorial') {
      resumeCourse();
    } else if (hash === '#training/shield-punish') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'brisket', p2:'pip', stage:'nightmail', fetch:false});
      drill('combo', false, 'record', 'punish');
    } else if (hash === '#training/read-the-hop') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false});
      drill('combo', false, 'mix');
    } else if (hash === '#training/haymaker' || hash === '#training/catch-haymaker') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'brisket', p2:'pip', stage:'nightmail', fetch:false});
      drill('footwork', false, hash === '#training/haymaker' ? 'armor' : 'armorGrab');
    } else if (hash === '#training/dash-shield') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false});
      drill('footwork',false,'dashShield');
    } else if (hash === '#training/disc-reflect' || hash === '#training/disc-return') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'clover', stage:'nightmail', fetch:false});
      drill('footwork',false,hash === '#training/disc-reflect' ? 'reflect' : 'returnFire');
    } else if (hash === '#training/shoulder-carry') {
      leaveOnline();
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'brisket', p2:'pip', stage:'nightmail', fetch:false });
      drill('escape',false,'carry');
    } else if (hash === '#training/grab-escape') {
      leaveOnline();
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false });
      drill('escape',false,'gripEscape');
    } else if (hash === '#training/shield-break') {
      leaveOnline();
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false });
      drill('shield', false, 'breakEscape');
    } else if (hash === '#training/dodge-timing') {
      leaveOnline();
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'clover', p2:'pip', stage:'nightmail', fetch:false });
      drill('shield', false, 'dodgeTiming');
    } else if (hash === '#training/spot-counter') {
      leaveOnline();
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'clover', p2:'brisket', stage:'nightmail', fetch:false });
      drill('shield', false, 'counterGrab');
    } else if (hash === '#training/ledge-patience') {
      leaveOnline();
      afterStory = null;
      practiceSide = 'left';
      startMatch({...settings, mode:'training', p1:'pip', p2:'brisket', stage:'picnic', fetch:false});
      drill('climb',false,'patience');
    } else if (hash === '#training/ledge-return') {
      leaveOnline();
      afterStory = null;
      practiceSide = 'left';
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false });
      drill('climb',false,'rise');
    } else if (hash === '#training/jump-ins') {
      leaveOnline();
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'pip', stage:'nightmail', fetch:false });
      drill('shield', false, 'yourHop');
    } else if (hash === '#training/blast-radar' || hash === '#training/last-stock') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'clover', stage:'picnic', fetch:false });
      const finish = hash === '#training/last-stock';
      drill('launch', false, finish ? 'lastStock' : 'survival', 1, !finish);
    } else if (hash === '#training/landing-buffer') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'brisket', p2:'pip', stage:'picnic', fetch:false });
      setFrameMode('armed');
    } else if (hash === '#solo/shield-read-set') startShieldReadMatch(true);
    else if (hash === '#solo/shield-read') startShieldReadMatch();
    else if (hash === '#solo') {
      settings.mode = 'solo';
      editing = 0;
      toLobby();
    }
    else if (hash === '#cutscenes') openFilmLibraryLink();
    else if (hash === '#adventure') showRoute();
    else if (hash === '#online') showOnline();
    else if (hash === '#training/corner-pressure') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'picnic', fetch:false });
      drill('edge', false, 'corner');
    }
    else if (hash === '#training/edges' || hash === '#training/ledge-catch') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'brisket', p2: 'pip', stage: 'bandstand', fetch: false });
      drill('edge', false, hash === '#training/ledge-catch' ? 'shortCatch' : 'lip');
    }
    else if (hash === '#training/footstools') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', stage:'picnic', fetch:false });
      drill('spacing', false, 'footstool');
    }
    else if (hash === '#training/wall-jumps' || hash === '#training/impact-tech' || hash === '#training/ceiling-tech') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'laundry', fetch:false });
      drill('wall', false, 'left', hash === '#training/ceiling-tech' ? 'ceiling' : hash === '#training/impact-tech' ? 'impact' : 'pip');
    }
    else if (hash === '#training/spike-impact') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'noodle', stage:'picnic', fetch:false });
      drill('launch', false, 'spikeFloor', 1, 'impact');
    }
    else if (hash === '#training/crawl') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'noodle', p2:'clover', stage:'picnic', mode:'training', fetch:false});
      drill('footwork',false,'crawl');
    }
    else if (hash === '#training/get-up') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'clover', stage:'picnic', fetch:false});
      drill('launch', false, 'bait');
    }
    else if (hash === '#training/boost-grab') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'brisket', p2:'pip', stage:'picnic', fetch:false});
      drill('footwork',false,'boostGrab');
    }
    else if (hash === '#training/attack-cancel') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'noodle', p2:'pip', stage:'nightmail', fetch:false });
      drill('footwork', false, 'cancelDash');
    }
    else if (hash === '#training/angled-tilts') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'noodle', p2:'pip', stage:'picnic', fetch:false });
      drill('footwork', false, 'angleHigh');
    }
    else if (hash === '#training/braking' || hash === '#training/catch-the-landing') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p2: 'pip', stage: 'picnic', fetch: false });
      drill('footwork', false, hash === '#training/braking' ? 'brake' : 'antiAir');
    }
    else if (hash === '#training/breakaway') {
      menuScreen('match');
      afterStory=null;
      startMatch({...settings,mode:'training',p1:'clover',p2:'pip',stage:'nightmail',fetch:false});
      drill('launch',false,'breakaway');
    }
    else if (hash === '#training/tumble') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'picnic', fetch:false });
      drill('launch', false, 'juggle');
    }
    else if (hash === '#training/rapid-jab' || hash === '#training/escape-flurry') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training',p1:'pip',p2:'brisket',stage:'nightmail',fetch:false });
      drill('combo',false,hash === '#training/rapid-jab' ? 'flurry' : 'escapeFlurry');
    }
    else if (hash === '#training/combos') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'clover', p2: 'pip', stage: 'picnic', fetch: false });
      drill('combo', false, 'example');
    }
    else if (hash === '#training/ferry') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'brisket', p2:'pip', stage:'canal', fetch:false });
      drill('platform', false, 'ferry');
    }
    else if (hash === '#training/pick-your-landing') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'bandstand', fetch:false });
      drill('platform', false, 'layers');
    }
    else if (hash === '#training/shield-drop') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'brisket', p2: 'pip', stage: 'bandstand', fetch: false });
      drill('platform', false, 'shield-drop');
    }
    else if (/^#training\/interrupted-return(?:\/(pip|brisket|noodle|clover))?$/.test(hash)) {
      menuScreen('match');
      afterStory = null;
      practiceSide = 'left';
      startMatch({...settings,mode:'training',p1:hash.split('/')[2] || 'pip',p2:'noodle',stage:'nightmail',fetch:false});
      drill('air',false,'interrupted');
    }
    else if (/^#training\/last-dodge(?:\/(pip|brisket|noodle|clover))?$/.test(hash)) {
      menuScreen('match');
      afterStory = null;
      practiceSide = 'left';
      startMatch({...settings, mode:'training', p1:hash.split('/')[2] || 'pip', p2:'brisket', stage:'nightmail', fetch:false});
      drill('air', false, 'lastDodge', false);
    }
    else if (hash === '#training/launch-height') {
      menuScreen('match');
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false});
      drill('freshness', false, 'drive');
    }
    else if (hash === '#training/rage') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'brisket', p2: 'pip', stage: 'nightmail', fetch: false });
      drill('freshness', false, 'rage');
    }
    else if (/^#training\/sweet-spots(?:\/(pip|brisket|noodle|clover))?$/.test(hash)) {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:hash.split('/')[2] || 'noodle', p2:'brisket', stage:'nightmail', fetch:false });
      drill('spacing', false, 'sweet');
    }
    else if (hash === '#training/fast-fall') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'noodle', p2:'pip', stage:'nightmail', fetch:false });
      drill('spacing', false, 'fastfall');
    }
    else if (hash === '#training/jump-in-damage') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false});
      drill('spacing', false, 'airPower');
    }
    else if (hash === '#training/short-hops' || hash === '#training/flick-jump') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'pip', p2: 'brisket', stage: 'picnic', fetch: false });
      drill('spacing', false, 'landing');
      if (hash === '#training/flick-jump') setFlickTrial(true);
    }
    else if (hash === '#training/landing-cancel') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'brisket', p2: 'pip', stage: 'picnic', fetch: false });
      drill('spacing', false, 'cancel');
    }
    else if (hash.startsWith('#room/')) {
      const code = hash.slice(6).toUpperCase();
      if (window.DogOnline.validCode(code)) showOnline('', code);
      else showOnline('This invite has an invalid room code.');
    } else showHome();
  }
  window.addEventListener('hashchange', openLink);
  openLink();
  requestAnimationFrame(frame);
})();
