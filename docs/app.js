(() => {
  'use strict';
  // The HTML menu offers Retry if a required script did not arrive.
  if (![window.DogFight, window.DogFightView, window.DogArt, window.ArenaArt, window.FightControls,
    window.FightRecords, window.YardCup, window.FightSchool, window.DispatchScript].every(Boolean)) return;
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
    arenas,
    stageForms,
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
    validStockCount,
    warmupPartners,
    seededRandom,
    clamp,
  } = window.DogFight;
  const { FightView, drawPreview, drawMoveThumbnail } = window.DogFightView;
  const $ = (id) => document.getElementById(id);
  const footworkPatterns = ['bait','match','power','armor','armorGrab','disc','reflect','returnFire','crawl',
    'center','brace','brake','dashShield','pivot','antiAir','angleHigh','angleLow','cancelDash','cancelTurn','boostGrab','boostPivot','boostSmash'];
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
  const {portrait,coatNames} = window.DogArt;
  const modes = { solo: 'Solo', local: 'Local versus', training: 'Training', parcel:'Parcel Punt' };
  const settings = {
    stage: 'picnic',
    stageForm: 'original',
    coatBook: [{},{}],
    mode: 'solo',
    cpuLevel: 'arcade',
    minutes: 7,
    lives: 3,
    timed: false,
    bestOfThree: false,
    p1: 'pip',
    p2: 'brisket',
    fetch: true,
    sound: true,
    volume: 75,
    musicVolume: 55,
    shake: true,
    fixedCamera:false,
    cornerTips: true,
    stockBreaks: false,
    tiltStick: false,
    tiltStick2: false,
    quickAttack1: true,
    quickAttack2: true,
    flickJump1: false,
    flickJump2: false,
  };
  try {
    const s = JSON.parse(localStorage.getItem('dog-fight-3.config') || '{}');
    if (Object.hasOwn(arenas, s.stage)) settings.stage = s.stage;
    if (Object.hasOwn(stageForms, s.stageForm)) settings.stageForm = s.stageForm;
    for (const slot of [0,1]) for (const kind of Object.keys(fighters)) {
      const coat = s.coatBook?.[slot]?.[kind];
      if (window.DogFight.validCoat(coat)) settings.coatBook[slot][kind] = coat;
    }
    if (Object.hasOwn(modes, s.mode)) settings.mode = s.mode;
    if (Object.hasOwn(cpuLevels, s.cpuLevel)) settings.cpuLevel = s.cpuLevel;
    if (stockMinutes.includes(s.minutes)) settings.minutes = s.minutes;
    if(validStockCount(s.lives))settings.lives=s.lives;
    if(window.DogFight.validHandicap(s.handicap) && s.handicap.some(Boolean))settings.handicap=s.handicap;
    settings.timed=s.timed===true;
    settings.fixedCamera=s.fixedCamera===true;
    settings.guidedLessons=s.guidedLessons===true;
    settings.stockBreaks=s.stockBreaks===true;
    if(settings.timed && !settings.minutes)settings.minutes=3;
    for (const slot of ['p1', 'p2']) if (Object.hasOwn(fighters, s[slot])) settings[slot] = s[slot];
    for (const key of ['fetch', 'sound', 'shake', 'tiltStick','flickJump1','flickJump2','quickAttack1','quickAttack2','bestOfThree','cornerTips']) if (typeof s[key] === 'boolean') settings[key] = s[key];
    if (Number.isFinite(s.volume)) settings.volume = Math.max(0, Math.min(100, s.volume));
    settings.tiltStick2=typeof s.tiltStick2==='boolean'?s.tiltStick2:settings.tiltStick;
    if (Number.isFinite(s.musicVolume)) settings.musicVolume = Math.max(0, Math.min(100, s.musicVolume));
  } catch {
    /* Settings are optional in private browsing. */
  }
  FightView.fixedCamera=settings.fixedCamera;
  function cameraButton(){
    const reduced=reducedReplays.matches;
    const label=reduced?'Wide (reduced motion)':settings.fixedCamera?'Wide':'Follow fighters';
    return '<button class="utility" data-do="camera-mode" aria-pressed="'+(reduced || settings.fixedCamera)+'"'+
      (reduced?' disabled':'')+'>Fight camera · '+label+'</button>';
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
  const strikeSticks = [new window.FightControls.StrikeStick(),new window.FightControls.StrikeStick()];
  const strikeAim = [{x:0,y:0},{x:0,y:0}];
  const horizontalInputs=[new window.FightControls.HorizontalInput(),new window.FightControls.HorizontalInput()];
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
    for(const stick of strikeSticks)stick.clear();
    for(const input of horizontalInputs)input.clear();
    shieldTiltLocked.fill(false);
    flickJumpStates[0] = {};
    flickJumpStates[1] = {};
    document.querySelectorAll('.touch-pad .held').forEach((el) => el.classList.remove('held'));
  }
  let audioContext;
  let music=null, musicUnlocked=false, musicFocused=true;
  const missionMusic=['picnic','bandstand','nightmail','canal','nightmail'];
  function unlockMusic() {
    musicUnlocked=true;
    if (audioContext?.state!=='running') audioReady();
    if(!window.YardScore && !dispatchLoads.has('YardScore'))loadDispatch('YardScore').catch(()=>{});
  }
  window.addEventListener('pointerdown',unlockMusic,{capture:true,passive:true});
  window.addEventListener('keydown',unlockMusic,{capture:true});
  function updateMusic() {
    if(!musicUnlocked || !audioContext || !window.YardScore) return;
    const level=settings.sound ? settings.musicVolume/100*settings.volume/100 : 0;
    if(!music && (!level || audioContext.state!=='running')) return;
    music ||= new window.YardScore.Player(audioContext);
    let id='menu', urgent=false, playing=musicFocused && !document.hidden, gain=level;
    const audition=dialogType==='sound-test' || dialogType==='stage-music';
    if(audition){
      const p=window.StageMusic.preview;
      id=p.id;playing=playing && p.playing;urgent=p.urgent;
    } else if(page==='dispatch-story') id=null;
    else if(page==='match' && world){
      const fight=finishTrial?.player.battle || online.match?.confirmedWorld || world;
      if(world.mode==='adventure'){
        id=world.sideRoute?world.layout.id:missionMusic[world.roomIndex];
        urgent=world.sideRoute && world.wave===2;
        if(world.finished==='exit')id='win-'+world.dogs[0].kind;
        else if(world.finished==='fallen')id=null;
        else playing=playing && !paused;
      } else if(fight.end!==null){
        id=dialogType && fight.endReason!=='fall' && fight.endReason!=='expired' && fight.dogs[fight.end] ? 'win-'+fight.dogs[fight.end].kind : null;
      } else {
        id=matchConfig?.stageTrack===undefined?fight.stage:matchConfig.stageTrack;
        playing=playing && !paused && countdown<=0;
        urgent=!world.lesson && fight.mode!=='training' && (fight.suddenDeath || fight.matchCard?.points && fight.clockFrames<=600 ||
          (fight.dogs[0].stocks===1 && fight.dogs[1].stocks===1));
        if(world.lesson || fight.mode==='training') gain*=.55;
      }
    }
    music.update(id,urgent,gain,playing);
    if(audition) refreshAudition();
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
  function fightSound(name,e) {
    sound(name,e);
    if(currentPads.length && !dialogType && musicFocused && !document.hidden)
      window.PadFeedback?.contact(name,e,finishTrial?.player.battle || world,finishTrial,online.match?online.side:null,playPad,rumble);
  }
  function sound(name, detail = {}) {
    if(name==='clockBeat'){
      const pitch=detail.seconds===1?880:587;
      tone(pitch,pitch,.11,0,'triangle',.09);
      tone(pitch*2,pitch*2,.07,.004,'sine',.035);
      return;
    }
    if(name==='parcelLaunch'){tone(330,740,.18,0,'triangle',.09);tone(640,960,.12,.06,'sine',.06);return;}
    if (name === 'ringBell') {
      const pitch=[392,440,494,587,659,784][detail.count-1];
      tone(pitch,pitch,.19,0,'sine',.14);
      tone(pitch*2.01,pitch*2,.13,.003,'triangle',.045);
      return;
    }
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
    } else if (name === 'footstool' || name === 'pogoShield') {
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
    } else if(name==='plateBreak'){
      const note=440+detail.count*110;tone(note,note*1.5,.07);tone(note*2,note,.12,.045);
    } else if (name === 'counter' || name === 'catch' || name === 'skip') {
      tone(name === 'counter' ? 830 : 560, name === 'counter' ? 350 : 875, 0.07, 0, 'triangle', 0.065);
    } else if (name === 'jump' || name === 'recover')
      tone(name === 'jump' ? 260 : 330, name === 'jump' ? 430 : 720, 0.1, 0, 'triangle', 0.043);
    else if (name === 'ko') {
      if(detail.zone==='top'){
        tone(620,1460,.20,0,'triangle',.10);
        tone(1760,1760,.09,.22,'sine',.065);
      }else tone(690, 71, 0.38, 0, 'sawtooth', 0.056);
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
    else if(name==='ballDrop')tone(620,290,.09,0,'sine',.055);
    else if(name==='ballCatch'){
      tone(440,750,.08,0,'triangle',.05);
      if(detail.aerial)tone(880,1110,.09,.05,'sine',.05);
    }
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
    if(world?.warmupPartner)return i ? warmupPartners[world.warmupPartner].tag : 'YOU';
    if (page === 'match' && world?.comboPractice?.defending) return i === 0 ? 'REPLAY' : 'YOU';
    if (page === 'match' && world?.hasSecondPlayer && world.mode === 'training') {
      if (i === 1) return 'P2';
      return world.comboPractice && !['record','throwChase','confirm','dashPressure'].includes(world.comboPractice.source) ? 'REPLAY' : 'P1';
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
  const lobbyForm = () => settings.mode === 'training' ? 'original' : settings.stageForm;
  const savedCoat = (slot,kind) => settings.coatBook[slot][kind] ?? 0;
  let lobbyCoats = [0,0];
  let previewPick=null;
  function paintLobby(now) {
    if (!$('lobby-options').hidden) return;
    if (previewPick && (now >= previewPick.until || reducedReplays.matches)) previewPick=null;
    const frame=reducedReplays.matches ? 0 : Math.floor(now*(previewPick ? 24 : 9));
    if (frame === lastPreview) return;
    lastPreview=frame;
    drawPreview($('preview'),settings,now,lobbyCoats,previewPick);
  }
  if (window.ResizeObserver) new ResizeObserver(()=>{lastPreview=-1;}).observe($('preview'));
  else window.addEventListener('resize',()=>{lastPreview=-1;});
  function showLobbyOptions(focusId='lobby-options-back') {
    $('lobby-options').hidden=false;
    $('lobby-options-mode').textContent=modes[settings.mode];
    $(focusId).focus();
  }
  function leaveLobbyOptions() {
    $('lobby-options').hidden=true;
    lastPreview=-1;
    $('lobby-more').focus();
  }
  $('lobby-more').onclick=()=>showLobbyOptions();
  $('lobby-options-back').onclick=leaveLobbyOptions;
  let couchPanel=null,lobbySeats=null,rotation=null,rotationPicking=false;
  const eventPads=new WeakMap();
  let rotationStorage;
  const savedEvents={};
  let tournamentOpen=false;
  function saveRotation(){return rotation.save(rotationStorage);}
  function rotationBack(){
    if(page==='match')return showResult();
    dismiss();showLobbyOptions(tournamentOpen?'tournament':'winner-stays');
  }
  function rotationBoard(tournament=tournamentOpen){
    tournamentOpen=tournament;
    const part=tournament?'LocalTournament':'WinnerStays',title=tournament?'Local tournament':'Winner stays';
    if(!window[part] || !versusStyled)return waitForDispatch(title,()=>loadVersusPanel(part),()=>rotationBoard(tournament),rotationBack);
    const event=window[part];
    rotation=savedEvents[part];
    if(!rotation){
      try{rotationStorage=window.sessionStorage;}catch{}
      rotation=event.Lineup.read(rotationStorage);
      const finished=!tournament && page==='match' && world?.mode==='local' && !online.match && world.end!==null;
      if(!rotation){
        const cfg=finished?{...matchConfig,bestOfThree:!!localSet,coats:[world.coatFor(0),world.coatFor(1)]}:
          {...settings,coats:[lobbyCoat(0),lobbyCoat(1)]};
        rotation=new event.Lineup(cfg);
        if(finished)rotation.finish(1,localSet?.champion ?? world.end);
      }
      savedEvents[part]=rotation;
      if(finished)eventPads.set(rotation,matchConfig.couchSeats);
    }
    rotationPicking=false;
    if(tournament)rotation.syncRules(settings);
    showDialog(tournament?'tournament':'rotation',title,'');
    event.board($('dialog-body'),rotation,{portrait,save:saveRotation,back:rotationBack,
      play:()=>{if(page!=='lobby'){settings.mode='local';toLobby();}pickTogether(true);},
      end:()=>{rotation=null;delete savedEvents[part];try{rotationStorage.removeItem(event.key);}catch{}
        settings.mode='local';toLobby();if(tournament)return rotationBoard(true);showLobbyOptions('winner-stays');}});
  }
  function pickTogether(forRotation=false,openingStrikes=false) {
    const saved=forRotation===true && rotation?.restoreSet?.();
    const series=saved || localSet;
    const counter=saved?saved.picker!==null:page==='match' && world?.mode==='local' && !online.match && localSet?.picker!=null;
    const strikes=openingStrikes || (!saved && counter && matchConfig.stageStrikes);
    if(counter && series.pendingStrike)return showStrikeBoard(series.pendingStrike,series);
    if(!counter && (page!=='lobby' || settings.mode!=='local'))return;
    rotationPicking=forRotation===true;
    const title=counter?'Game '+(series.games.length+1)+' · P1 '+series.score[0]+' – '+series.score[1]+' P2':
      rotationPicking?rotation.roundName || 'Winner stays · Bout '+rotation.bout:'Pick together';
    if(!window.CouchSelect || !versusStyled)return waitForDispatch(title,()=>loadVersusPanel('CouchSelect'),()=>pickTogether(forRotation,openingStrikes),
      ()=>rotationPicking?rotationBoard():counter?showResult():$('pick-together').focus());
    const pair=rotationPicking?rotation.pair:null;
    const config=pair?window.CouchSelect.eventConfig(settings,rotation,eventPads.get(rotation) || lobbySeats):
      counter?{...matchConfig,stage:world.stage,stageForm:world.form,coats:[world.coatFor(0),world.coatFor(1)]}:{...settings,couchSeats:lobbySeats};
    if(saved){
      config.stage=saved.current.stage;
      if(!counter){
        rotationPicking=false;
        return startMatch({...config,...lobbyBattleRules(config),form:config.stageForm},undefined,undefined,saved);
      }
    }
    showDialog('couch',title,'');
    couchPanel=window.CouchSelect.panel($('dialog-body'),strikes?{...config,bestOfThree:true}:config,keys,getPads(),{
      sound,announce,drawStageTile,padNames,leave:exitDialog,between:counter?{picker:series.picker,game:series.games.length+1,fromBracket:!!saved}:null,
      lineupReady:strikes?(pick,seats)=>{
        for(const [i,kind] of pick.dogs.entries())pick.coats[i][kind]=pick.colors[i];
        beginStageStrike({...config,p1:pick.dogs[0],p2:pick.dogs[1],coats:pick.colors.slice(),coatBook:pick.coats,couchSeats:seats,
          form:counter?world.form:lobbyForm(),...lobbyBattleRules(config)},counter?localSet:null);
      }:null,
      start(pick,seats) {
        const stage=pick.winner;
        if(!stage)return;
        if(pair || counter){
          if(counter && !series.advance(stage))return;
          for(const [i,kind] of pick.dogs.entries())pick.coats[i][kind]=pick.colors[i];
          if(config.rotationRound){
            rotation.remember(pick.dogs,pick.colors);eventPads.set(rotation,seats);
            if(!config.tourneyRound || !config.bestOfThree)saveRotation();
          }
          rotationPicking=false;
          startMatch({...config,...(pair?lobbyBattleRules(config):{}),p1:pick.dogs[0],p2:pick.dogs[1],stage,form:config.stageForm,coats:pick.colors.slice(),coatBook:pick.coats,couchSeats:seats},
            undefined,undefined,counter?series:config.bestOfThree?new StockSet(stage):null);return;
        }
        [settings.p1,settings.p2]=pick.dogs;
        settings.stage=stage;
        for(const [i,kind] of pick.dogs.entries())settings.coatBook[i][kind]=pick.colors[i];
        save();
        startMatch({...settings,...lobbyBattleRules(settings),stage,form:lobbyForm(),coats:pick.colors.slice(),couchSeats:seats},undefined,undefined,
          settings.bestOfThree?new StockSet(stage):null);
      },
    });
  }
  $('pick-together').onclick=pickTogether;
  function openDepotDuo(rally=false){
    if(!missionReady())return waitForDispatch('Bell Depot doubles',loadMission,()=>openDepotDuo(rally),toLobby);
    window.DispatchView.duoSheet([fighters[settings.p1].name,fighters[settings.p2].name],showDialog,rally);
  }
  $('depot-duo').onclick=()=>openDepotDuo();
  function strikeBack(){
    if(page==='match')return showResult();
    dismiss();$('rules-label').focus({preventScroll:true});
  }
  function beginStageStrike(config,series=null){
    if(!window.StageStrike || !versusStyled)return waitForDispatch('Stage strike set',()=>loadVersusPanel('StageStrike'),()=>beginStageStrike(config,series),strikeBack);
    if(series?.pendingStrike)return showStrikeBoard(series.pendingStrike,series);
    const picker=series?.picker ?? null;
    const draft=new window.StageStrike.Draft(picker===null?crypto.getRandomValues(new Uint8Array(1))[0]%2:1-picker,picker);
    const entry={draft,config:{...config,bestOfThree:true,stageStrikes:true},seats:config.couchSeats || lobbySeats || new controls.Seats(getPads())};
    if(series)series.pendingStrike=entry;
    showStrikeBoard(entry,series);
  }
  function showStrikeBoard(entry,series){
    const {draft,config,seats}=entry;
    showDialog('stage-strike','Stage strike set','');
    couchPanel=window.StageStrike.panel($('dialog-body'),{draft,seats,keys,pads:getPads(),padNames,drawStageTile,sound,leave:strikeBack,
      dogs:[config.p1,config.p2],form:config.form,solo:config.mode==='solo',game:series?series.games.length+1:1,
      previousGame:series?.current,start(stage){
        if(series && !series.advance(stage))return;
        const set=series || new StockSet(stage);
        delete set.pendingStrike;
        set.current.strikes=draft.moves.slice();
        startMatch({...config,stage},undefined,undefined,set);
      }});
  }
  function openStrikeSet(){
    if(settings.mode==='local')return pickTogether(false,true);
    beginStageStrike({...settings,mode:'solo',form:lobbyForm(),...lobbyBattleRules(settings),coats:lobbyCoats.slice()});
  }
  function lobbyBattleRules(config){
    return {stockCount:config.stockCount ?? config.lives,timeBattle:config.timeBattle ?? config.timed,spawnDamage:config.handicap};
  }
  $('winner-stays').onclick=()=>rotationBoard(false);
  $('tournament').onclick=()=>rotationBoard(true);
  const lobbyCoat = slot => window.DogFight.coatFor(slot,settings.p1,settings.p2,lobbyCoats);
  const fighterDraws=[0,1].map(()=>new window.FightControls.FighterShuffle(Object.keys(fighters)));
  const stageName = (stage, form) => arenas[stage].name + (form && form !== 'original' ? ' · ' + stageForms[form].name : '');
  function drawStageTile(canvas, stage, form, time=1.4) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(canvas.width / 1200, canvas.height / 675);
    window.ArenaArt.draw(ctx, stage, time, undefined,form);
    ctx.restore();
  }
  function syncLobby() {
    lobbyCoats = [savedCoat(0,settings.p1),savedCoat(1,settings.p2)];
    const chosen = editing ? settings.p2 : settings.p1;
    $('lobby-random').setAttribute('aria-label','Random dog for '+slotLabel(editing));
    $('lobby-coat').setAttribute('aria-label','Choose coat for ' + labelFor(editing) + ' ' + fighters[chosen].name +
      ', currently ' + coatNames[chosen][lobbyCoat(editing)]);
    $('cpu-level').hidden = settings.mode !== 'solo';
    $('event-matches').hidden=settings.mode!=='solo';
    $('lobby-events').hidden=settings.mode==='training';
    $('pick-together').hidden=settings.mode!=='local';
    $('depot-duo').hidden=settings.mode!=='local';
    $('tournament').hidden=$('winner-stays').hidden=settings.mode!=='local';
    $('cpu-level').textContent = 'CPU · ' + cpuLevels[settings.cpuLevel].name;
    document
      .querySelectorAll('[data-mode]')
      .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.mode === settings.mode)));
    $('stage-title').textContent = stageName(settings.stage,lobbyForm());
    const training = settings.mode === 'training';
    $('rules-label').disabled = training;
    $('rules-label').innerHTML = icon('paw') + (training ? 'Unlimited' :
      (settings.bestOfThree ? 'Best of three' : 'Rules') + (settings.timed?' · Time Battle · ':' · '+stockLabel(settings.lives)+' · ') + (settings.minutes ? settings.minutes + ' min' : 'No clock') + ' ▾');
    $('start').innerHTML =
      icon('play') + '<span>' + (training ? 'Start training' : settings.bestOfThree ? 'Start set' : 'Start fight') + '</span>';
    syncFetch();
    $('picking').innerHTML =
      'Choose for <b class="' + (editing ? 'two' : '') + '">' + labelFor(editing) + '</b>';
    $('slots').innerHTML = [settings.p1, settings.p2]
      .map((kind, i) => {
        const name = fighters[kind].name;
        return `<button class="slot" type="button" data-index="${i}" aria-pressed="${i === editing}" aria-label="Choose ${slotLabel(i)} fighter, currently ${name}, ${coatNames[kind][lobbyCoat(i)]}${!training && settings.handicap?', starting damage '+settings.handicap[i]+'%':''}">
        <span class="small-tag">${labelFor(i)}${!training && settings.handicap?' · '+settings.handicap[i]+'%':''}</span><span class="slot-name">${name}</span>${icon('edit')}
      </button>`;
      })
      .join('');
    $('roster').innerHTML = Object.entries(fighters)
      .map(([kind, f]) => {
        const badges =
          (kind === settings.p1 ? '<span class="badge">P1</span>' : '') +
          (kind === settings.p2 ? '<span class="badge two">' + labelFor(1) + '</span>' : '');
        return `<button type="button" data-kind="${kind}" class="roster-card ${editing ? 'picking-two' : ''}" aria-pressed="${kind === settings[editing ? 'p2' : 'p1']}" aria-label="Choose ${f.name}, ${f.breed}, ${f.style}">
        <span class="mug"><img src="${portrait(kind,kind === chosen ? lobbyCoat(editing) : savedCoat(editing,kind))}" alt=""></span>
        <span class="card-copy"><strong>${f.name}</strong><small>${f.breed}</small></span>
        <span class="card-badges">${badges}</span>
      </button>`;
      })
      .join('');
    const thumbnail = $('stage-mini');
    drawStageTile(thumbnail, settings.stage,lobbyForm());
    tip(settings[editing ? 'p2' : 'p1']);
    $('preview').setAttribute(
      'aria-label',
      'Preview of ' +
        coatNames[settings.p1][lobbyCoat(0)] + ' ' + fighters[settings.p1].name +
        ' and ' +
        coatNames[settings.p2][lobbyCoat(1)] + ' ' + fighters[settings.p2].name +
        ' on ' +
        stageName(settings.stage,lobbyForm()),
    );
    lastPreview = -1;
    paintLobby(performance.now()/1000);
  }
  function showCoats() {
    const net = page === 'online-lobby', slot = net ? 0 : editing;
    const kind = net ? onlineDog : slot ? settings.p2 : settings.p1;
    const current = net ? savedCoat(0,kind) : lobbyCoat(slot);
    const mirror = !net && settings.p1 === settings.p2;
    const options = coatNames[kind].map((name,i) => {
      const swap = mirror && i === lobbyCoat(1-slot);
      return '<button class="coat-option" type="button" data-coat="' + i + '" aria-pressed="' + (current === i) +
        '"><img alt="" src="' + portrait(kind,i) + '"><strong>' + name + '</strong>' +
        (swap ? '<small>Swap with ' + labelFor(1-slot) + '</small>' : '') + '</button>';
    });
    showDialog('coats',(net ? '' : labelFor(slot) + ' · ') + fighters[kind].name + ' coats',
      '<div class="coat-grid">' + options.join('') + '</div>' +
      (net ? '<p>If both players pick the same dog and coat, P2 wears the next coat.</p>' : ''));
    document.querySelector('[data-coat][aria-pressed=true]').focus();
  }
  function chooseCoat(coat) {
    const net = page === 'online-lobby', slot = net ? 0 : editing;
    const kind = net ? onlineDog : slot ? settings.p2 : settings.p1;
    if (!net && settings.p1 === settings.p2) {
      const other = lobbyCoat(1-slot);
      settings.coatBook[1-slot][kind] = other === coat ? lobbyCoat(slot) : other;
    }
    settings.coatBook[slot][kind] = coat;
    save();
    dismiss();
    if (net) onlineStatus('idle','','');
    else syncLobby();
    $(net ? 'online-coat' : 'lobby-coat').focus();
    announce(fighters[kind].name + ' · ' + coatNames[kind][coat]);
  }
  $('lobby-coat').onclick = showCoats;
  $('online-coat').onclick = showCoats;
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
  function pickLobbyFighter(kind,random=false) {
    settings[editing ? 'p2' : 'p1'] = kind;
    const moveId=kits[kind].tilts.forward, start=performance.now()/1000;
    previewPick={slot:editing,moveId,start,until:start+moves[moveId].end*2};
    save();
    syncLobby();
    const focus=random?$('lobby-random'):$('roster').querySelector('[data-kind="' + kind + '"]');
    focus.focus({ preventScroll: true });
    audioReady();
    sound('menu');
    announce(fighters[kind].name + ' selected for ' + slotLabel(editing));
  }
  $('lobby-random').onclick=()=>pickLobbyFighter(fighterDraws[editing].draw(editing?settings.p2:settings.p1),true);
  $('roster').addEventListener('click', (e) => {
    const el=e.target.closest('[data-kind]');
    if(el)pickLobbyFighter(el.dataset.kind);
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
  const dialogPresses=new Set();
  let movePreview=null,refreshCardPin=null,refreshController=null;
  function showDialog(kind, title, html, close = true) {
    arenaPreview=null;refreshCardPin=null;refreshController=null;
    if(dialogType==='rumble')window.PadFeedback?.stop();
    if((kind.startsWith('finish-') || ['match-card','record-card','records','result','online-result','ko-replays'].includes(kind)) && !$('replay-sheet')){
      const link=document.createElement('link');
      link.id='replay-sheet';link.rel='stylesheet';link.href='./replays.css?v=cup-finish-1';
      link.onerror=()=>link.remove();document.head.append(link);
    }
    movePreview=null;
    dialogPresses.clear();
    if (page === 'dispatch-story' && film) setFilmPaused(true);
    couchPanel = null;
    clipScreen?.lifetime.abort();
    clipScreen = null;
    victoryShot = null;
    dialogType = kind;
    $('dialog').dataset.view = kind;
    $('dialog-title').textContent = title;
    $('dialog-body').innerHTML = html;
    $('dialog-close').hidden = !close;
    if (!$('dialog').open) $('dialog').showModal();
    if (page === 'match') {
      paused = !online.match || online.finished;
      clearInput();
    }
    if (kind==='result' || kind==='online-result') presentWinner();
  }
  function dismiss() {
    arenaPreview=null;refreshCardPin=null;refreshController=null;
    if(dialogType==='rumble')window.PadFeedback?.stop();
    movePreview=null;
    couchPanel=null;
    clipScreen?.lifetime.abort();
    clipScreen = null;
    victoryShot = null;
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
    if(dialogType==='cup-schedule')return returnFromCupSchedule();
    if(dialogType==='pause' && $('cup-pause-tools')?.open){
      $('cup-pause-tools').open=false;$('cup-pause-tools').querySelector('summary').focus();return;
    }
    if($('result-review')?.open && ['result','online-result'].includes(dialogType)){
      $('result-review').open=false;$('result-review').querySelector('summary').focus();return;
    }
    if(dialogType==='result' && $('cup-more') && !$('cup-review').hidden){$('cup-more').click();$('cup-more').focus();return;}
    if(dialogType==='event-board')return $('event-back').click();
    if(dialogType==='event-result')return $('event-board').click();
    if(dialogType==='stage-routes')return $('route-back').click();
    if(dialogType==='finish-rematch')return $('rematch-film-back').click();
    if(clipScreen?.aimReader?.cancel())return;
    if(dialogType==='couch-pads')return couchPanel?.cancel();
    if(dialogType==='pad-loss' || dialogType==='solo-pad-loss')return;
    if(dialogType==='fighter-tryout'){dismiss();if(page==='lobby')showLobbyOptions('lobby-tryout');return;}
    if(dialogType==='mission-saving')return;
    if(dialogType==='special-preview')return $('move-back').click();
    if(dialogType==='stage-strike')return strikeBack();
    if(dialogType==='rumble')return $('rumble-back').click();
    if(dialogType==='stick-setup')return $('stick-back').click();
    if(dialogType==='profiles')return $('profile-back').click();
    if(dialogType==='rulebook')return backFromRulebook();
    if(dialogType==='matchup-card')return $('matchup-back').click();
    if(dialogType==='opening-duel')return ($('duel-resume') || $('duel-back')).click();
    if(dialogType==='practice-tapes')return $('tape-back').click();
    if(dialogType==='field-card')return $('field-back').click();
    if(dialogType==='combo-compare')return $('reply-back').click();
    if(dialogType==='pack-relay')return backFromRelay();
    if(dialogType==='finish-picker')return $('finish-picker-back').click();
    if(dialogType==='ko-replays')return $('ko-list-back').click();
    if(dialogType==='finish-film')return $('film-back').click();
    if(dialogType==='finish-second-chance')return $('chance-back').click();
    if(dialogType==='finish-recovery')return $('recovery-back').click();
    if(dialogType==='finish-stock')return $('stock-back').click();
    if(dialogType==='finish-stock-film')return $('stock-film-back').click();
    if(dialogType==='recording-unavailable')return backToRematchLesson();
    if(dialogType==='finish-comparison')return leaveFinishTrial(true);
    if(dialogType==='finish-pause')return dismiss();
    if(dialogType==='code-pad'){
      dismiss();
      if(!document.activeElement?.matches('#online-code,#open-code-pad'))$('open-code-pad').focus();
      return;
    }
    if(dialogType==='sound-test')return backFromSoundTest();
    if(dialogType==='stage-music')return $('music-back').click();
    if(dialogType==='rotation' || dialogType==='tournament')return rotationBack();
    if(dialogType==='fighter-school')return leaveFighterSheet();
    if(dialogType==='dispatch-load')return $('dispatch-load-back').click();
    if (dialogType==='couch'){
      if(rotationPicking)return rotationBoard();
      if(page==='match')return showResult();
      dismiss();$('pick-together').focus({preventScroll:true});return;
    }
    if (dialogType==='record-card') return showRecords(reviewCard.id);
    if (dialogType==='records') {
      dismiss(); $('home-records').focus({preventScroll:true}); return;
    }
    if (dialogType==='bell-result' || dialogType==='parcel-result') return;
    if (dialogType==='bells' || dialogType==='bells-loading' || dialogType==='parcel-sheet') {
      dismiss();
      $('home-bells').focus({preventScroll:true});
      return;
    }
    if (dialogType==='finish-replay') {
      if(clipScreen?.review){
        const r=clipScreen.review;
        if(r.duel)return showPause(false);
        if(r.stockBreak)return showStockBreak();
        if(r.launchLab)return closeRecoveryClinic();
        if(r.moment)return watchMatch(r.film,r.frame);
        if(r.clinic){showHome(false);schoolList();return;}
        if(r.instant){
          showPause(false);$('dialog-body').querySelector('[data-do=instant-replay]')?.focus();return;
        }
        if(r.from==='archive')return backToSavedCard(r);
        if(r.from==='standings'){
          showResult();$('dialog-body').querySelector('[data-latest-fall="'+r.slot+'"]')?.focus();return;
        }
        if(r.finish && r.from==='result'){showResult();return;}
        if(r.from==='card'){
          showMatchCard();
          $('dialog-body').querySelector('[data-card-ko="'+r.clip.first+'"][data-ko-slot="'+r.slot+'"]')?.focus();
        }else showKnockouts(r.from,r.clip.first);
        return;
      }
      showResult();
      document.querySelector('[data-do=watch-finish]')?.focus();
      return;
    }
    if (dialogType==='saved-games') {
      dismiss();
      ($('other-saves').hidden ? $('home-continue') : $('other-saves')).focus({preventScroll:true});
      return;
    }
    if (dialogType==='bindings') return leaveLayouts();
    if (dialogType === 'match-card') {
      showResult();
      document.querySelector('[data-do=match-card]')?.focus();
      return;
    }
    if(dialogType==='arenas'){dismiss();$('choose-stage').focus();return;}
    if (dialogType === 'set-pick' && roomDraft) return showRoomFighters();
    if (dialogType === 'room-fighters' && online.canRepick) {
      roomDraft=null;
      showResult();
      document.querySelector('[data-do=rematch-fighters]')?.focus();
      return;
    }
    if (dialogType === 'set-pick' || dialogType==='room-fighters') return showResult();
    if (dialogType === 'result' || dialogType === 'dispatch-fall' || dialogType === 'boss-result' || dialogType === 'online-result') return;
    if (['controls','moves','cpu-level','practice'].includes(dialogType) && backToPause) {
      backToPause = false;
      showPause();
      return;
    }
    dismiss();
  }
  $('dialog-close').onclick = exitDialog;
  // Releasing a gameplay touch over a newly opened result can synthesize a click there.
  $('dialog').addEventListener('pointerdown',e=>dialogPresses.add(e.pointerId),true);
  $('dialog').addEventListener('pointercancel',e=>dialogPresses.delete(e.pointerId),true);
  $('dialog').addEventListener('click',e=>{
    if(!e.isTrusted || e.detail===0)return;
    const startedHere=e.pointerId===undefined?dialogPresses.size>0:dialogPresses.has(e.pointerId);
    if(e.pointerId===undefined)dialogPresses.clear();else dialogPresses.delete(e.pointerId);
    if(!startedHere){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  $('dialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    menuBack();
  });
  $('dialog').addEventListener('click', (e) => {
    if (e.target === $('dialog')) exitDialog();
  });
  $('ball-info').onclick = () =>
    showDialog(
      'ball',
      'Fetch Ball',
      '<p>Tap Grab to catch a ball. Aim and tap Attack or Grab to throw. Three swats charge a gold shot.</p><p>In the air, release the direction and tap Grab to drop the ball. Let it fall onto a rival, or tap Attack while it’s within reach to catch it during your aerial. A catch keeps the charge.</p><div class="dialog-actions"><button class="primary" data-do="fetch-match">Play a three-stock Fetch match</button><button class="utility" data-do="drop-catch">Try the drop</button><button class="utility" data-do="defend-drop">Defend the landing</button><button class="utility" data-do="close">Got it</button></div>',
    );
  let arenaPreview=null;
  function chooseArena(picking=false,form=picking?world.form:lobbyForm(),stage=picking?world.stage:settings.stage,focusId) {
    const room=picking && roomDraft;
    const back=()=>picking?(room?showRoomFighters():showResult()):$('choose-stage').focus();
    const title=picking?'Pick the next arena':'Stage select';
    if(!window.VersusRulebook || !versusStyled)return waitForDispatch(title,()=>loadVersusPanel('VersusRulebook'),
      ()=>chooseArena(picking,form,stage,focusId),back);
    showDialog(picking?'set-pick':'arenas',title,'');
    arenaPreview=window.VersusRulebook.arenaSelect($('dialog-body'),{
      stage,form,focusId,picking,chooseForm:!picking && settings.mode!=='training',draw:drawStageTile,
      roomFighter:room?coatNames[room.kind][room.coat]+' '+fighters[room.kind].name:'',
      reduced:reducedReplays,
      run:(id,layout)=>stageRunBoard({...lobbyMatchup(),stage:id,stageForm:layout}),
      music:(id,layout)=>openStageMusic(id,()=>chooseArena(false,layout,id,'arena-music'),layout),
      confirm(id,layout){
        if(picking){
          if(!online.series)return startNextSetGame(id);
          showResult();online.rematch(id,room?.kind,room?.coat);return;
        }
        settings.stage=id;
        if(settings.mode!=='training')settings.stageForm=layout;
        save();dismiss();syncLobby();sound('menu');$('choose-stage').focus();
      },
    });
    if(room)updateVotes();
  }
  $('choose-stage').onclick = () => chooseArena();
  function routeUI(){
    return {showDialog,root:$('dialog-body'),store:storage,play:playMatchup,board:stageRunBoard,
      start:(card,slot,best)=>{
        leaveOnline();afterStory=null;
        startMatch({mode:'solo',stage:card.stage,form:card.stageForm,p1:slot?card.p2:card.p1,p2:'pip',coats:[card.coats[slot],0],
          fetch:false,minutes:0,eventId:'stage-run',stageRun:{card,slot,best}},undefined,42);
      },back:card=>chooseArena(false,card.stageForm,card.stage,'arena-run')};
  }
  function stageRunBoard(card,slot=0){
    if(page!=='lobby')toLobby();
    if(!window.StageStrike || !versusStyled)return waitForDispatch('Stage Run',()=>loadVersusPanel('StageStrike'),()=>stageRunBoard(card,slot),()=>chooseArena(false,card.stageForm,card.stage,'arena-run'));
    window.StageStrike.routeSheet(card,slot,routeUI());
  }
  let controlsShown=[];
  function controlTable(){
    controlsShown=[padNames(0,seatPad(0)),padNames(1,seatPad(1)),layout];
    return window.VersusRulebook.controlsTable(!!online.match || page==='online-lobby',settings,keyFor,padFor,strikeKeys,nativeScreen,i=>controlsShown[i][9]);
  }
  function showControls() {
    if (!window.VersusRulebook) return waitForDispatch('Controls', () => loadDispatch('VersusRulebook'), showControls,
      () => page === 'match' ? showPause() : $('controls').focus());
    backToPause = page === 'match';
    showDialog('controls','Controls','<div class="dialog-actions"><button class="primary" data-do="bindings">Customize controls</button>'+
      (page==='lobby' && settings.mode==='local'?'<button class="utility" data-do="couch-pads">Assign controllers</button>':'')+
      '<button class="utility" data-do="pad-check">Check controller</button><button class="utility" data-do="stick-setup">Calibrate sticks</button><button class="utility" data-do="rumble">Controller rumble</button></div>'+controlTable()+window.VersusRulebook.controlsGuide);
  }
  $('controls').onclick = showControls;
  const specialInputs = {
    neutral: 'Special alone',
    side: 'Side + Special',
    up: 'Up + Special',
    down: 'Down + Special',
    'down-air': 'Down + Attack in midair',
    'land-neutral':'Neutral air landing','land-forward':'Forward air landing','land-back':'Back air landing',
    'land-up':'Up air landing','land-down':'Down air landing',
  };
  function showMoves(kind, section='air', fromPause=dialogType==='moves'?backToPause:dialogType==='pause',focusSide) {
    if(!window.MoveGuide)return waitForDispatch(fighters[kind].name+' moves',()=>loadDispatch('MoveGuide'),
      ()=>showMoves(kind,section,fromPause,focusSide),()=>{if(fromPause)showPause();else if(page==='match')$('game').focus();});
    backToPause=fromPause;
    showDialog('moves',fighters[kind].name+' moves',window.MoveGuide.sheet(kind,section,{keyFor,padFor,strikeKeys,specialInputs}));
    for(const canvas of document.querySelectorAll('[data-direction]'))
      drawMoveThumbnail(canvas,kind,canvas.dataset.direction,canvas.dataset.category);
    if(focusSide)document.querySelector('[data-watch-move="'+focusSide+'"]').focus();
  }
  $('lobby-moves').onclick = () => showMoves(settings[editing ? 'p2' : 'p1']);
  $('training-moves').onclick = () => showMoves(world.dogs[world.trainingPlayerSlot].kind);
  function backToMoveCard(source){
    showMoves(source.kind,source.side==='down-air' || source.side.startsWith('land-')?'air':'specials',source.paused,source.side);
  }
  function showSpecialPreview(source){
    const {kind,side}=source,school=window.FighterSchool;
    if(!school || !window.MoveGuide)return waitForDispatch('Move demonstration',
      ()=>Promise.all([loadDispatch('FighterSchool'),loadDispatch('MoveGuide')]),
      ()=>showSpecialPreview(source),()=>backToMoveCard(source));
    const move=school.study(kind,side),canPractice=page==='home' || page==='lobby';
    const coat=page==='lobby' && settings[editing?'p2':'p1']===kind?lobbyCoats[editing?1:0]:
      page==='match' && world.dogs.some(d=>d.kind===kind)?world.coatFor(world.dogs.findIndex(d=>d.kind===kind)):savedCoat(0,kind);
    movePreview=school.preview({kind,side,coat,root:$('dialog-body'),shake:settings.shake,reduced:reducedReplays.matches,
      device:()=>promptDevice(getPads()),keyFor,padFor,showDialog,title:move.title,input:specialInputs[side],canPractice});
    $('move-back').onclick=()=>backToMoveCard(source);
    if(canPractice && school.cleared(storage,kind+'-'+move.index))$('move-try').textContent='Practice again · ✓';
    if(canPractice)$('move-try').onclick=()=>{
      startMatch({...settings,mode:'local',stage:move.stage,form:'original',p1:kind,p2:move.rival,coats:[coat,0],fetch:false,
        minutes:0,lesson:move.index,fighterCourse:kind,specialStudy:source});
      delete $('school-coach').dataset.key;renderSchool(getPads());
    };
    $('move-play').focus({preventScroll:true});
  }
  function leaveSpecialStudy(){
    const source=matchConfig.specialStudy;
    if(source.page==='lobby')toLobby();else showHome(false);
    backToMoveCard(source);
  }
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
    const start = e.target.closest?.('#start, #couch-start, #strike-confirm[data-play=true], #dispatch-start, [data-stop], [data-reel], #online-quick, #online-create, #online-join');
    if (start && !start.disabled && (e.isTrusted || navigator.userActivation?.isActive)) toggleFullscreen(false);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyF' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey ||
      e.target.closest?.('input, textarea, select, [contenteditable=true]')) return;
    e.preventDefault();
    if (!e.repeat) toggleFullscreen();
  });
  const stockLabel = (n) => n + (n === 1 ? ' stock' : ' stocks');
  const pointLabel=n=>n+(Math.abs(n)===1?' point':' points');
  const fighterScore=(battle,slot)=>battle.matchCard?.points ? pointLabel(battle.matchCard.points[slot]) : stockLabel(battle.dogs[slot].stocks);
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
  function stockPaws(count,total=3) {
    return Array.from({ length: total }, (_, i) =>
      '<i class="' + (i >= count ? 'lost' : '') + '" data-icon="paw">' + svg('paw') + '</i>').join('');
  }
  const tenth = n => Number(n.toFixed(1));
  function percentDigits(damage) {
    const [whole, fraction] = String(tenth(damage)).split('.');
    return fraction ? whole + '<small>.' + fraction + '</small>' : whole;
  }
  const hudCards=[];
  function updateFighterCard(f,slot,coat,alert,recovery,label=labelFor(slot),points=null,battle=world){
    const training=world.mode==='training';
    const scored=points!==null;
    const team=battle.relayTeams?.[slot], sudden=!!battle.suddenDeath;
    let card=hudCards[slot];
    const total=battle.stockCount || 3;
    if(!card || card.kind!==f.kind || card.coat!==coat || card.label!==label || card.training!==training || card.scored!==scored || card.team!==team || card.total!==total || (team && card.sudden!==sudden)){
      const root=document.createElement('div');
      root.className='hud-card'+(slot?' two':'');
      root.innerHTML='<span class="hud-portrait"><img alt=""></span><div><span class="hud-name"><small></small></span>'+
        '<strong class="percentage"></strong><span class="lives">'+(team?team.map((kind,i)=>'<img alt="" title="'+fighters[kind].name+
          '" src="'+portrait(kind,battle.relayCoats[slot][i])+'">').join(''):scored?'':training?'∞':stockPaws(total,total))+'</span></div>';
      const picture=root.querySelector('.hud-portrait'), name=root.querySelector('.hud-name');
      picture.firstChild.src=portrait(f.kind,coat);
      name.firstChild.textContent=label;name.append(f.stats.name);
      if(card)card.root.replaceWith(root);else $('hud').append(root);
      card=hudCards[slot]={root,picture,kind:f.kind,coat,label,training,scored,team,sudden,total,lives:root.querySelector('.lives'),
        percent:root.querySelector('.percentage'),alert:'',recovery:null,rage:0};
    }
    if(battle.matchCard)window.DogFightView.hitMeter(card,battle,f,!reducedReplays.matches && settings.shake);
    if(card.damage!==f.damage){
      card.damage=f.damage;
      showPercent(card.percent,f.damage);
      const rage=tenth((rageScale(f.damage)-1)*100);
      if(card.rage!==rage){
        card.rage=rage;
        if(rage){
          if(!card.meter){
            card.picture.insertAdjacentHTML('beforeend','<span class="rage-meter" role="img"><i></i></span>');
            card.meter=card.picture.lastChild;
          }
          const title='Rage +'+rage+'% knockback';
          card.meter.setAttribute('aria-label',title);card.meter.title=title;
          card.meter.firstChild.style.width=(rage*10)+'%';
        }else{card.meter.remove();card.meter=null;}
      }
    }
    if(scored && card.points!==points){
      card.points=points;card.lives.textContent=pointLabel(points);
      card.lives.setAttribute('aria-label',pointLabel(points));
    }else if(!scored && card.stocks!==f.stocks){
      card.stocks=f.stocks;
      const active=team?.indexOf(f.kind);
      Array.from(card.lives.children).forEach((paw,i)=>paw.classList.toggle('lost',team?
        !f.stocks || i<active || (sudden && i!==active):i>=f.stocks));
      const next=team && !sudden && f.stocks>1 && team[active+1];
      card.lives.setAttribute('aria-label',training?'Unlimited stocks':stockLabel(f.stocks)+(next?' · Next '+fighters[next].name:''));
    }
    if(card.alert!==alert){
      card.alert=alert;
      if(!alert){card.badge.remove();card.badge=null;}
      else{
        if(!card.badge){card.badge=document.createElement('span');card.root.prepend(card.badge);}
        card.badge.className='stock-alert'+(alert==='Last tag'?' last':'');card.badge.textContent=alert;
      }
    }
    if(card.recovery!==recovery){
      card.recovery=recovery;
      card.strip?.remove();card.strip=null;
      if(recovery!==null){card.root.insertAdjacentHTML('beforeend',recoveryStrip(recovery));card.strip=card.root.lastChild;}
    }
  }
  const comboSources=['example','late','record','replay','flurry','escapeFlurry','defend','mix','throwChase','confirm','dashPressure'];
  function stockStatus(f,battle,human){
    if(f.stockLift){
      if(!f.stockLift.ready)return battle.relayTeams?'Entering':'Returning';
      return human?'↓ or Jump':'Lift ready';
    }
    if(f.stockGuard)return f.stockGuard<=24/60+1e-8?'Last tag':'Protected';
    if(f.ledge && window.DogFight.gripFramesLeft(f)<=window.DogFight.gripWarningFrames)return 'Grip slipping';
    if(f.ledgeCatches>=window.DogFight.maxLedgeCatches)return f.ledge?'Last grip':'Land to regrab';
    return '';
  }
  function updateHUD() {
    if(world.route)return world.hud($('match-set'));
    if(world.eventId)world.hud($('match-set'));
    if(world.mode==='parcel'){
      const clock=$('match-clock'),badge=$('match-set'),time=world.clock(),label=world.label();
      if(clock.textContent!==time){
        clock.textContent=time;clock.setAttribute('aria-label',world.phase==='prep'?'Time left':'Distance');
        clock.classList.toggle('urgent',world.phase==='prep' && world.matchFrames>=420);
      }
      if(badge.textContent!==label)badge.textContent=label;
      return;
    }
    if (world.bells) {
      const clock=$('match-clock'), count=$('match-set');
      const time=window.BellBreak.formatTime(world.matchFrames,1);
      if (clock.textContent!==time) clock.textContent=time;
      const label=world.cleared+' / '+world.bells.length+' bells';
      if (count.textContent!==label) count.textContent=label;
      return;
    }
    if(world.mode==='training')window.PracticeFeedback?.movementReadout(world);
    else if (!$('hop-compare').hidden) $('hop-compare').hidden=true;
    if (world.mode === 'adventure') return updateDispatchHUD();
    const confirmed = online.match?.confirmedWorld || world;
    const scores = confirmed.dogs;
    const clock = $('match-clock'), seconds = Math.ceil((confirmed.clockFrames || 0) / 60);
    const hideClock = confirmed.clockFrames === null && !confirmed.suddenDeath;
    if (clock.hidden !== hideClock) clock.hidden = hideClock;
    const tiebreak=confirmed.suddenDeath;
    const elapsed=tiebreak?.ceiling!==undefined?tiebreak.frames:0;
    const phase=elapsed>=1500?'Final':elapsed>=600?'Closing':elapsed>=480?'↕ '+Math.ceil((600-elapsed)/60):'';
    const clockText = tiebreak ? 'SD'+(phase?' · '+phase:'') : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0');
    if (clock.textContent !== clockText) clock.textContent = clockText;
    clock.classList.toggle('urgent', !!confirmed.suddenDeath || seconds <= 10);
    const call = $('countdown');
    call.classList.toggle('fight-end', !!confirmed.matchCard && confirmed.end!==null && !confirmed.eventId);
    call.classList.toggle('sudden', !!tiebreak?.intro);
    if (tiebreak?.intro) {
      const caption = tiebreak.cause === 'time' ? (confirmed.matchCard?.points?'Time! Points tied':'Time! Stocks tied') :
        tiebreak.cause === 'double' ? 'Double knockout' : tiebreak.opening==='gap'?'Air jump toward the left deck':
        tiebreak.opening==='perch'?'Short hop under the ceiling':'One stock each';
      if (call.dataset.caption !== caption) call.dataset.caption = caption;
    }
    const clockLabel = tiebreak ? 'Sudden Death · One stock at 300%'+(elapsed>=1500?' · Boundaries at their final positions':
      elapsed>=600?' · Ceiling and floor closing':elapsed>=480?' · Ceiling and floor close in '+Math.ceil((600-elapsed)/60)+' seconds':'') : 'Match clock';
    if (clock.getAttribute('aria-label') !== clockLabel) clock.setAttribute('aria-label', clockLabel);
    const combo = world.lastCombo;
    const grip = world.grapple;
    const prompt = $('grapple-prompt');
    const hideGrip = !grip || grip.phase === 'throw' || world.comboPractice?.source==='throwChase' || world.comboPractice?.source==='confirm' || !!world.launchPractice || !!world.stockPractice || !!world.survivalPractice;
    const carrier=confirmed.ball?.holder;
    const falling=confirmed.ball?.dropped && confirmed.ball.owner>=0;
    const hidePrompt=hideGrip && carrier==null && !falling;
    if (prompt.hidden !== hidePrompt) prompt.hidden = hidePrompt;
    if(hideGrip && falling){
      const text=scores[confirmed.ball.owner].stats.name+' dropped the ball · Attack in the air to catch it';
      if(prompt.textContent!==text)prompt.textContent=text;
    }else if (hideGrip && carrier!=null) {
      const rival=online.match ? online.side!==carrier : !world.hasSecondPlayer && carrier!==world.trainingPlayerSlot;
      const seat=!online.match && world.hasSecondPlayer?'P'+(carrier+1)+' ':'';
      const f=scores[carrier],text=seat+f.stats.name+(f.attack?.itemCatch?' · Aerial catch · ':' has the ball · ')+
        (rival?'Shield the throw or time a Grab to catch it':confirmed.itemDrops && f.ground<0?'Neutral Grab to drop · Aim + Attack to throw':'Aim + Attack or Grab to throw');
      if(prompt.textContent!==text)prompt.textContent=text;
    } else if (!hideGrip) {
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
    const comboLab = world.comboPractice;
    const chargeReadout = $(lab ? 'freshness-charge' : 'training-charge');
    if (lab) {
      $('training-charge').hidden = true;
      $('recovery-tip').hidden = !lab.waiting;
    }
    const power = player.smashCharge ? smashPower(player.charge) : player.lastSmashPower;
    const hideCharge = world.mode !== 'training' || !!world.wavePractice || power === null || (!!lab && !player.smashCharge);
    if(chargeReadout.hidden!==hideCharge)chargeReadout.hidden=hideCharge;
    if (!chargeReadout.hidden) {
      const value = player.smashCharge
        ? power >= 1
          ? 'Full charge'
          : 'Charging ' + Math.round(power * 100) + '%'
        : 'Released at ' + Math.round(power * 100) + '%';
      if (chargeReadout.textContent !== value) chargeReadout.textContent = value;
    }
    const shownMove = player.smashCharge ? smashes[player.smashCharge.moveId].label : player.lastMove;
    const returns=scores.map((f,i)=>stockStatus(f,confirmed,online.match?online.side===i:world.mode==='local' || i===0));
    const recovery = scores.map(f => offstageOptions(f, confirmed.terrain));
    const key =
      scores.map((f, i) => f.kind + ':' + f.damage + ':' + f.stocks + returns[i] + '/' + recovery[i]).join('|') +
      world.mode + (confirmed.matchCard?.points?.join(',') || '') +
      '/' +
      combo.hits +
      '/' +
      combo.damage +
      '/' +
      (world.mode === 'training' ? shownMove : '') +
      (comboLab ? '/' + [comboLab.phase, comboLab.contacts.length, comboLab.counter?.moveId, comboLab.window?.gap, comboLab.shifts, comboLab.dodges, comboLab.launchRead, comboLab.tick >= 150].join('/') : '') +
      (world.freshnessPractice ? '/' + world.freshnessPractice.revision + '/' + player.moveHistory.length : '');
    if (key === hudKey) return;
    hudKey = key;
    if (comboLab) window.ComboLab.readout(world);
    if (world.freshnessPractice) window.PracticeFeedback?.updateFreshnessReadout(world, player, world.freshnessPractice);
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
    scores.forEach((f,i)=>{
      const label=labelFor(i);
      const tag=!online.match && !world.lesson && (world.mode==='local' || world.mode==='solo') && label==='P'+(i+1) && profileTags[i];
      updateFighterCard(f,i,confirmed.coatFor(i),returns[i],recovery[i],tag?label+' · '+tag:label,confirmed.matchCard?.points?.[i]??null,confirmed);
    });
  }
  let matchConfig, soloSeed, localSet = null, practiceFight = null, corner=null, spar=null;
  const schoolRuns=new WeakMap();
  let finishTape=null, clipScreen=null, victoryShot=null, finishTrial=null;
  let bellChoice='pip', parcelChoice='pip';
  function stadiumTabs(parcel){
    return '<div class="dialog-actions stadium-events" role="group" aria-label="Stadium event">'+
      '<button class="utility" data-do="bells-sheet" aria-pressed="'+!parcel+'">Bell Break</button>'+
      '<button class="utility" data-do="parcel-sheet" aria-pressed="'+parcel+'">Parcel Punt</button></div>';
  }
  function parcelSheet(kind=parcelChoice){
    if(!Object.hasOwn(fighters,kind))return;
    if(page!=='home')showHome(false);
    if(!window.ParcelPunt)return waitForDispatch('Parcel Punt',()=>loadDispatch('ParcelPunt'),()=>parcelSheet(kind),showHome);
    parcelChoice=kind;
    showDialog('parcel-sheet','Parcel Punt',stadiumTabs(true)+window.ParcelPunt.sheet(kind,id=>portrait(id,savedCoat(0,id))));
    const device=promptDevice(getPads());
    $('parcel-binding').textContent=device===2?'Hold Smash, aim sideways, then release.':
      'Side smash · Hold '+(device===1?padFor(0,'smash'):keyFor(0,'smash'))+' with a sideways aim, then release.';
    window.ParcelPunt.preview($('parcel-map'),kind,savedCoat(0,kind));
    document.querySelector('[data-do=parcel-start]').focus();
  }
  function parcelResult(){
    const run=world;
    window.ParcelPunt.showResult(run,showDialog,announce,()=>world===run && dialogType==='parcel-result');
  }
  function bellSheet(kind=bellChoice) {
    if (!Object.hasOwn(fighters,kind)) return;
    if (page!=='home') showHome(false);
    if(!window.BellBreak)return waitForDispatch('Bell Break',()=>loadDispatch('BellBreak'),()=>bellSheet(kind),showHome);
    bellChoice=kind;
    const device=getPads().length?1:matchMedia('(pointer:coarse)').matches?2:0;
    showDialog('bells','Bell Break',stadiumTabs(false)+window.BellBreak.courseSheet(kind,id=>portrait(id,savedCoat(0,id))));
    $('bell-bindings').textContent=device===2 ? 'Tap Jump, then Attack to strike in the air.' :
      'Jump · '+schoolHint('platform',device)+'     Attack · '+schoolHint('jab',device);
    window.BellBreak.preview($('bell-map'),kind,savedCoat(0,kind));
    document.querySelector('[data-do=bells-start]').focus({preventScroll:true});
  }
  function startBells() {
    const kind=bellChoice;
    startMatch({mode:'targets',p1:kind,p2:'pip',coats:[savedCoat(0,kind),0],stage:window.BellBreak.courses[kind].stage,fetch:false});
  }
  function bellResult() {
    const run=world;
    window.BellBreak.showResult(run,showDialog,()=>world===run && dialogType==='bell-result');
  }
  const reducedReplays=matchMedia('(prefers-reduced-motion: reduce)');
  const cup = window.YardCup, unsavedCup = new Map();
  let cupAttempt = null, cupChoice, cupShown;
  function cupEntry(kind) {
    if (unsavedCup.has(kind)) return cup.read(unsavedCup.get(kind));
    try {
      const data = localStorage.getItem('dog-fight-3.cup.'+kind);
      if (data) return cup.read(JSON.parse(data));
    } catch {}
    return cup.read(null);
  }
  function updateCup(kind,change) {
    const key = 'dog-fight-3.cup.' + kind;
    const commit = () => {
      const entry = cupEntry(kind), next = change(entry);
      if (next && next !== entry) {
        next.playedAt = Date.now();
        try {
          localStorage.setItem(key,JSON.stringify(next));
          unsavedCup.delete(kind);
        } catch { unsavedCup.set(kind,next); }
      }
      return next;
    };
    if (!navigator.locks) return Promise.resolve(commit());
    return navigator.locks.request(key,commit).catch(error=>{
      if (error.name==='SecurityError') return commit();
      throw error;
    });
  }
  function cupRecord(run) {
    return run.retries + (run.retries === 1 ? ' retry' : ' retries') + ' · ' +
      cup.stocks(run) + '/12 stocks kept · ' + cardTime(cup.frames(run));
  }
  function cupSheet(kind,route=false,resume=false) {
    kind ??= cupChoice ?? savedGames().find(game=>Object.hasOwn(cup.courses,game.id))?.id ?? settings.p1;
    if (!Object.hasOwn(cup.courses,kind)) return;
    if(!window.VersusRulebook || !versusStyled)return waitForDispatch('Arcade Cup',()=>loadVersusPanel('VersusRulebook'),
      ()=>cupSheet(kind,route,resume),()=>page==='match'?(world?.end!=null?showResult():showPause()):returnToHome());
    if(page!=='cup-select')menuScreen('cup-select');else dismiss();
    $('dialog-body').replaceChildren();
    window.VersusRulebook.cupSelect($('cup-select'),{
      kind,route,select:cupSheet,back:returnToHome,start:startCupRound,record:cupRecord,stageName,stockLabel,
      progress:id=>{cupChoice=id;cupShown=cupEntry(id);return cupShown;},
      temporary:id=>unsavedCup.has(id),coatFor:id=>cupEntry(id).active?.coat ?? savedCoat(0,id)
    });
    if(resume)$('cup-select').querySelector('[data-do=cup-start]').click();
  }
  async function startCupRound(kind,button) {
    button ??= $('dialog').querySelector('[data-do=cup-next]');
    if (!button || button.disabled) return;
    button.disabled = true;
    audioReady();
    const expected = cupShown;
    const current = () => cupShown===expected && button.isConnected &&
      ($('cup-select').contains(button)?page==='cup-select' && !$('dialog').open:$('dialog').open);
    if(expected.active?.wins.length===cup.courses[kind].bouts.length && !missionReady()){
      button.textContent='Loading Bell Depot…';
      try { await loadMission(); }
      catch {
        if(current()){button.disabled=false;button.textContent='Retry loading Bell Depot';button.focus();}
        return;
      }
      if(!current())return;
    }
    const entry = await updateCup(kind,latest=>{
      const run = latest.active, shown = expected.active;
      if (!current() || latest.clears!==expected.clears || run?.id!==shown?.id ||
          run?.retries!==shown?.retries || run?.wins.length!==shown?.wins.length || run?.started!==shown?.started) return null;
      const id = run?.id || Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');
      return cup.begin(latest,id,savedCoat(0,kind));
    });
    if (!current()) return;
    if (!entry) return cupSheet(kind);
    cupShown=entry;
    const run = entry.active, round = run.wins.length;
    const attempt = {kind,id:run.id,retries:run.retries,round,coat:run.coat};
    const bout = cup.stockBout(kind,round,run.coat);
    if (!bout) return beginRun(yardChapter.lastRoom,0,null,attempt);
    startMatch(bout,undefined,17+round*31,null,{cupRound:attempt});
  }
  function showCupSchedule(){
    const {kind,settled}=cupAttempt;
    const entry=settled || cupShown,run=entry.active || entry.last;
    const current=!settled?'Fighting now':run.started?'Retry':'Up next';
    const rows=window.VersusRulebook.cupSchedule(kind,entry,{run,current,stageName,stockLabel,record:settled && cupRecord});
    showDialog('cup-schedule','Cup schedule','<div class="cup-route-board">'+rows+'</div><div class="dialog-actions">'+
      '<button class="primary" data-do="'+(settled?'cup-return':'cup-resume')+'">'+(settled?'Back to results':'Resume fight')+'</button></div>');
    $('dialog-body').querySelector('.primary').focus();
  }
  function returnFromCupSchedule(){
    if(cupAttempt.settled)cupResult(world.mode==='adventure'?world.finished==='exit':world.end===0);
    else showPause(false);
    $('dialog-body').querySelector('[data-do=cup-sheet]').focus();
  }
  async function cupResult(won) {
    const attempt = cupAttempt;
    if (!attempt || attempt.saving) return;
    if (!attempt.settled) {
      attempt.saving = true;
      const lives = world.dogs[0].stocks, elapsed = world.matchFrames;
      const entry = await updateCup(attempt.kind,e=>cup.finish(e,attempt,won,lives,elapsed));
      attempt.saving = false;
      if (cupAttempt !== attempt) return;
      if (!entry) return cupSheet(attempt.kind);
      attempt.settled = entry;
    }
    cupShown = attempt.settled;
    window.VersusRulebook.cupResult(world,attempt,won,{showDialog,announce,stockLabel,tenth,record:cupRecord,cardButton});
  }
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
    const heldAerial = world.heldAerials && player.command?.type === 'attack' && player.prev[player.command.button || 'attack'];
    const queued = player.heldRecoveryJump ? (heldAerial ? ' · Jump + Attack held' : ' · Jump held') :
      player.jumpBuffer > 1e-8 && !player.jumpSquat ? ' · Jump buffered' : '';
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
      sticks:structuredClone(strikeSticks), tilt:shieldTiltLocked.slice(), flick:structuredClone(flickJumpStates)};
    $('moment-retry').disabled = false;
    momentNotice('Moment saved');
  };
  $('moment-retry').onclick = () => {
    if (!trainingMoment) return;
    world.restoreTrainingMoment(trainingMoment.battle);
    for (const i of [0,1]) {
      Object.assign(strikeSticks[i],trainingMoment.sticks[i]);
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
    if(!window.VersusRulebook)return waitForDispatch('CPU opponent',()=>loadDispatch('VersusRulebook'),showCpuLevels,
      ()=>restart?showPause():$('cpu-level').focus());
    showDialog('cpu-level',restart?'Replay the opening':'CPU opponent',
      window.VersusRulebook.cpuSheet(cpuLevels,level,restart,!restart || matchConfig?.ledgeTrapStart || matchConfig?.wideReturn));
    document.querySelector('[data-cpu="' + level + '"]').focus({preventScroll:true});
  }
  $('cpu-level').onclick = showCpuLevels;
  function eventUI(){
    return {store:storage,showDialog,coat:savedCoat,open:eventBoard,binding:key=>[keyFor(0,key),padFor(0,key),'Touch '+key][promptDevice(getPads())],back:()=>{dismiss();showLobbyOptions('event-matches');},launch:(id,normal,seed,rehearse)=>{
      leaveOnline();afterStory=null;
      const c=window.SoloEvents.setup(id,normal,seed,rehearse);
      startMatch({...c,coats:[savedCoat(0,c.p1),savedCoat(1,c.p2)]},undefined,42);
    }};
  }
  function eventBoard(id){
    if(page!=='lobby' || settings.mode!=='solo'){settings.mode='solo';toLobby();}
    if(!window.SoloEvents || !versusStyled)return waitForDispatch('Event Matches',()=>loadVersusPanel('SoloEvents'),
      ()=>eventBoard(id),()=>showLobbyOptions('event-matches'));
    window.SoloEvents.board(id,eventUI());
  }
  $('event-matches').onclick=()=>eventBoard();
  function backFromRelay(){
    if(page==='match' && world?.end!=null)return showResult();
    $('rules-label').onclick();
  }
  function openRelay(){
    if(!window.PackRelay)return waitForDispatch('Pack Relay',()=>loadDispatch('PackRelay'),openRelay,backFromRelay);
    const config=world?.relayTeams && page==='match'?matchConfig:{...settings,form:lobbyForm()};
    window.PackRelay.sheet(config,{storage,portrait,showDialog,root:$('dialog-body'),back:backFromRelay,
      start:cfg=>startMatch({...cfg,bestOfThree:false,timeBattle:false},undefined,undefined,null)});
  }
  $('rules-label').onclick = () => {
    if(!window.VersusRulebook)return waitForDispatch('Match rules',()=>loadDispatch('VersusRulebook'),()=>$('rules-label').click(),()=>$('rules-label').focus());
    showDialog('stock-rules',settings.timed?'Time Battle rules':'Stock match rules',window.VersusRulebook.quick(settings,stockLabel));
    document.querySelector('[data-minutes="' + settings.minutes + '"]').focus({preventScroll:true});
  };
  function backFromRulebook(){
    if(page==='online-lobby'){dismiss();$('online-rulebook').focus();return;}
    $('rules-label').onclick();$('dialog-body').querySelector('[data-do="rulebook"]')?.focus();
  }
  function openRulebook(hash,focusDamage=false){
    if(!window.VersusRulebook)return waitForDispatch('Versus rulesets',()=>loadDispatch('VersusRulebook'),()=>openRulebook(hash,focusDamage),backFromRulebook);
    const room=page==='online-lobby';
    showDialog('rulebook',room?'Friend room rulesets':'Versus rulesets','');
    window.VersusRulebook.open($('dialog-body'),room?{...readRoomSetup(),mode:'online'}:settings,{storage,hash,focusDamage,back:backFromRulebook,apply(rules){
      if(room){
        customSetup=rules;
        $('online-rules').options[0].textContent='Stock · '+stockLabel(rules.lives)+' · '+clockLabel(rules.timed?7:rules.minutes);
        $('online-rules').value=String(rules.timed?rules.minutes:0);$('online-form').value=rules.stageForm;
        setRoomFormat(rules.bestOfThree);updateRoomSetup();dismiss();$('online-create').focus();sound('menu');return;
      }
      Object.assign(settings,{handicap:undefined},rules);save();dismiss();syncLobby();$('start').focus();sound('menu');
    }});
  }
  const pinKey='dog-fight-3.pinned-matchup.1';
  let visitPin;
  function pinnedMatchup(){
    if(visitPin!==undefined)return visitPin;
    try{return storage?.getItem(pinKey) || null;}catch{return null;}
  }
  function writeMatchupPin(hash){
    try{
      if(hash)storage.setItem(pinKey,hash);else storage.removeItem(pinKey);
      visitPin=undefined;return true;
    }catch{visitPin=hash;return false;}
  }
  function lobbyMatchup(){
    return {mode:settings.mode,p1:settings.p1,p2:settings.p2,stage:settings.stage,coats:[lobbyCoat(0),lobbyCoat(1)],
      ...(settings.mode==='solo'?{cpuLevel:settings.cpuLevel}:{}),...window.DogFight.versusRules(settings)};
  }
  function playMatchup(card,seats){
    leaveOnline();afterStory=null;
    startMatch({...settings,handicap:undefined,...card,...lobbyBattleRules(card),form:card.stageForm,openingMatchup:card,couchSeats:seats},
      undefined,undefined,card.bestOfThree?new StockSet(card.stage):null);
  }
  function openOpeningDuel(card,duel,phase='setup'){
    if(!window.VersusRulebook)return waitForDispatch('First-hit duel',()=>loadDispatch('VersusRulebook'),()=>openOpeningDuel(card),toLobby);
    duel??=new window.VersusRulebook.OpeningDuel(card,crypto.getRandomValues(new Uint32Array(1))[0]);
    showDialog('opening-duel',phase==='pause'?'First-hit duel paused':'First-hit duel','');
    duel.panel($('dialog-body'),phase,{start:()=>{
      leaveOnline();afterStory=null;
      startMatch({...card,openingDuel:duel,form:card.stageForm,stockCount:3,timeBattle:false,minutes:0,fetch:false,
        spawnDamage:card.handicap,couchSeats:duel.seats},seededRandom(duel.seed),duel.seed);
      duel.seats=matchConfig.couchSeats;
    },review:answer=>{
      const r={duel,result:world,slot:duel.responder,clip:{tape:finishTape}};
      if(answer)startFinishTrial(Math.max(0,finishTape.length-45),r.slot,r);else showFinishReplay(null,r);
    },play:()=>playMatchup(card,duel.seats),resume:dismiss,back:()=>{
      if(page==='lobby')showMatchup(card,'rules');else{showHome(false);showMatchup(card,'shared');}
    }});
  }
  function showMatchup(value,source){
    const back=()=>{
      if(source==='rules'){$('rules-label').click();$('dialog-body').querySelector('[data-do=matchup-card]')?.focus();}
      else if(source==='result'){showResult();$('dialog-body').querySelector('[data-do=matchup-card]')?.focus();}
      else{showHome();if(source==='pin' && !$('home-pin').hidden)$('pin-view').focus({preventScroll:true});}
    };
    if(!window.VersusRulebook)return waitForDispatch('Matchup card',()=>loadDispatch('VersusRulebook'),()=>showMatchup(value,source),back);
    const book=window.VersusRulebook, card=typeof value==='string'?book.decodeMatchup(value):value;
    if(!card){
      showDialog('matchup-card','Matchup unavailable','<p>This matchup link is incomplete or contains an unknown fighter, arena, or rule.</p><button class="primary" id="matchup-back">Main menu</button>');
      $('matchup-back').onclick=back;$('matchup-back').focus();return;
    }
    showDialog('matchup-card',source==='shared'?'Shared matchup':source==='pin'?'Pinned matchup':'Matchup card','');
    refreshCardPin=book.matchupSheet($('dialog-body'),card,{drawPreview,coatNames,stageName,back,play:()=>playMatchup(card),duel:()=>openOpeningDuel(card),
      edit:()=>{
        const {coats,...config}=card;
        Object.assign(settings,{handicap:undefined},config);
        settings.coatBook[0][card.p1]=coats[0];settings.coatBook[1][card.p2]=coats[1];
        editing=0;save();toLobby();$('start').focus({preventScroll:true});
      },pinned:pinnedMatchup,pin:value=>{const saved=writeMatchupPin(value);syncHomePin();return saved;}});
  }
  function syncHomePin(){
    const hash=pinnedMatchup(),box=$('home-pin'),book=window.VersusRulebook;
    if(hash && !book){
      return loadDispatch('VersusRulebook').then(syncHomePin).catch(()=>{box.hidden=true;});
    }
    const card=book?.decodeMatchup(hash),active=box.contains(document.activeElement);
    box.hidden=!card;
    if(!card){if(active && page==='home')focusHome();return;}
    const play=$('pin-play'),pair=fighters[card.p1].name+' vs. '+fighters[card.p2].name;
    play.textContent='▶ '+pair;
    play.setAttribute('aria-label','Play pinned matchup · '+pair+' · '+modes[card.mode]+' · '+stageName(card.stage,card.stageForm));
    play.title=play.getAttribute('aria-label');
  }
  $('pin-play').onclick=()=>{
    const card=window.VersusRulebook?.decodeMatchup(pinnedMatchup());
    if(card)playMatchup(card);else syncHomePin();
  };
  $('pin-view').onclick=()=>showMatchup(pinnedMatchup(),'pin');
  function startShieldReadMatch(series = false) {
    leaveOnline();
    afterStory = null;
    startMatch({ ...settings, p1:'pip', p2:'noodle', mode:'solo', cpuLevel:'rival', stage:'picnic', fetch:false },
      undefined, 42, series ? new StockSet('picnic') : null);
  }
  function startDashPressure(p1,p2,stage='picnic',form='original'){
    leaveOnline();afterStory=null;
    startMatch({mode:'solo',p1,p2,stage,form,coats:[savedCoat(0,p1),savedCoat(1,p2)],cpuLevel:'rival',
      dashPressure:true,stockCount:3,minutes:7,fetch:false},undefined,42);
  }
  function startCloverApproach() {
    leaveOnline();
    afterStory = null;
    startMatch({...settings, mode:'solo', p1:'pip', p2:'clover', cpuLevel:'rival', stage:'picnic',
      fetch:false, minutes:7, openingFrames:49}, undefined, 7);
  }
  function startLedgeFight(hero,guard,side='left',wide=false){
    leaveOnline();afterStory=null;
    startMatch({mode:'solo',p1:hero,p2:guard,cpuLevel:'rival',stage:'nightmail',stockCount:3,
      coats:[savedCoat(0,hero),savedCoat(1,guard)],minutes:7,fetch:false,[wide?'wideReturn':'ledgeTrapStart']:side},undefined,42);
  }
  function startThrowRead(position) {
    leaveOnline();
    afterStory = null;
    startMatch({...settings, mode:'solo', p1:'pip', p2:'brisket', cpuLevel:'rival', stage:'nightmail',
      form:'trio', stockCount:3, timeBattle:false, minutes:7, handicap:undefined, spawnDamage:undefined,
      fetch:false, throwOpening:position}, undefined, 31);
  }
  function startClosingFight(opening,mode='solo',p1='pip',p2='brisket'){
    leaveOnline();
    afterStory=null;
    startMatch({mode,p1,p2,coats:[savedCoat(0,p1),savedCoat(1,p2)],stage:opening==='gap'?'laundry':'bandstand',
      form:'original',cpuLevel:settings.cpuLevel,fetch:false,suddenStart:true,suddenOpening:opening},undefined,17);
  }
  function startFinalCount(mode,p1='brisket',p2='pip',opening=true){
    leaveOnline();afterStory=null;
    startMatch({mode,p1,p2,coats:[savedCoat(0,p1),savedCoat(1,p2)],stage:'nightmail',form:'flat',
      cpuLevel:'rival',fetch:false,timeBattle:true,minutes:1,finalCount:opening},undefined,17);
  }
  function startDashBack(role) {
    leaveOnline(); afterStory = null;
    const p1 = role === 'bait' ? 'pip' : 'brisket', p2 = role === 'bait' ? 'brisket' : 'pip';
    startMatch({mode:'solo', p1, p2, coats:[savedCoat(0,p1),savedCoat(1,p2)], stage:'picnic', cpuLevel:'rival',
      stockCount:3, minutes:7, fetch:false, dashBackOpening:role}, undefined, 42);
  }
  function startLandingRead(landingRead,p1=settings.p1,p2=settings.p2){
    leaveOnline();afterStory=null;
    startMatch({mode:'solo',p1,p2,coats:[savedCoat(0,p1),savedCoat(1,p2)],stage:'nightmail',form:'flat',
      cpuLevel:'rival',stockCount:3,minutes:7,fetch:false,landingRead},undefined,42);
  }
  function startLiftFight(p2=settings.p2,p1=settings.p1,perch=false) {
    leaveOnline();afterStory=null;
    startMatch({mode:'solo',p1,p2,coats:[savedCoat(0,p1),savedCoat(1,p2)],stage:perch?'bandstand':'picnic',form:perch?'original':'flat',
      cpuLevel:'rival',stockCount:3,minutes:7,fetch:false,liftOpening:perch?'perch':true},undefined,42);
  }
  function startPerchFight(p2=settings.p2,p1=settings.p1){
    leaveOnline();afterStory=null;
    startMatch({mode:'solo',p1,p2,coats:[savedCoat(0,p1),savedCoat(1,p2)],stage:'picnic',form:'original',
      cpuLevel:'rival',stockCount:3,minutes:7,fetch:false,perchApproach:true},undefined,42);
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
    const landing=world.bot.coveredLanding;
    if(landing)report+='<p>Rival covered '+({stay:'your landing spot',through:'a tech roll through them',away:'a tech roll away'})[landing]+' after seeing the same landing twice. Change your Shield direction on the next fall.</p>';
    if(world.bot.gavePerch)report+='<p>Rival dropped through the platform as you returned with protection. You can keep the high ground or follow through.</p>';
    if(world.bot.challengedReturn)report+='<p>Rival held the platform and aimed a jab at the end of your protection. Shield when the jab starts to block it.</p>';
    if(world.bot.heldCenter)report+='<p>Rival played for center stage with a late lead. Dash in, then shield before you reach its attack range.</p>';
    if(world.bot.chasedLead)report+='<p>Rival came straight in on foot when it needed a KO. Step back and catch the approach with a tilt.</p>';
    if(world.bot.ledgeRollReads){
      const reads=world.bot.ledgeRollReads, catches=world.bot.ledgeRollCatches || 0;
      report+='<p>Rival covered your ledge roll '+reads+(reads===1?' time':' times')+' and grabbed you during '+catches+
        (catches===1?' roll.':' rolls.')+' A jump or a delayed get-up can leave that grab empty.</p>';
    }
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
  function startFetchMatch(mode) {
    startMatch({...settings,mode,form:'flat',fetch:true,fetchStart:true,stockCount:3,timeBattle:false,
      minutes:7,coats:[savedCoat(0,settings.p1),savedCoat(1,settings.p2)]},undefined,42);
  }
  function startDropCatch(defend){
    leaveOnline();afterStory=null;
    startMatch({...settings,mode:'solo',p1:settings.p1,p2:settings.p2,stage:'nightmail',form:'original',cpuLevel:'rival',
      fetch:true,dropCatchOpening:defend?'defend':'drop',stockCount:3,timeBattle:false,minutes:7,
      coats:[savedCoat(0,settings.p1),savedCoat(1,settings.p2)]},undefined,42);
  }
  function startMatch(config = settings, random = Math.random, opening, series = null, {visit, resume, leadInFrames = 0, cupRound = null, song} = {}) {
    finishTrial=null;
    roomDraft=null;
    cupAttempt = cupRound;
    music?.restart();
    practiceFight = visit || null;
    const rehearsal = !!visit && (config.mode==='solo' || config.mode==='local' && !!visit.returnStart);
    trainingMoment = null;
    $('moment-retry').disabled = true;
    $('moment-save').hidden = $('moment-retry').hidden = false;
    $('partner-training').setAttribute('aria-pressed','false');
    localSet = series;
    matchConfig = { ...config };
    $('match').classList.toggle('event-active', !!config.eventId);
    spar=null;
    corner=config.schoolFinal && !visit ? resume?.corner || new window.FightSchool.Corner(config.schoolTarget,
      config.schoolTarget===schoolSave.rematch?.id && schoolSave.rematch?.ticket) : null;
    if(corner && (config.fieldMatch || corner.field))corner.field=new window.FighterSchool.FieldCard(corner.field);
    $('corner-tip').hidden=true;
    delete $('corner-tip').dataset.cue;
    if(config.mode==='local' && !online.match && config.lesson===undefined){
      const pads=getPads();
      matchConfig.couchSeats ??= lobbySeats || new controls.Seats(pads);
      matchConfig.couchSeats.beginMatch(pads);
    }
    $('school-coach').hidden = config.lesson === undefined;
    if (config.mode === 'solo') {
      soloSeed = opening ?? crypto.getRandomValues(new Uint32Array(1))[0];
      random = seededRandom(soloSeed);
    } else if (config.mode==='local' && config.lesson===undefined && random===Math.random) {
      let seed=crypto.getRandomValues(new Uint32Array(1))[0];
      if(config.tourneyRound && series && !resume && !visit){
        seed=rotation.openGame(config.rotationRound,series,seed);saveRotation();
      }
      random=seededRandom(seed);
    }
    finishTape=resume?.tape || (!visit && !config.eventId && config.lesson===undefined && ['solo','local'].includes(config.mode) ? new window.DogFight.FinishTape(!config.openingDuel) : null);
    if(finishTape && !config.openingDuel)for(const part of ['MatchReview','StockCall'])loadDispatch(part).catch(()=>{});
    // These modes let the player switch straight from the current exchange into a drill.
    if(config.schoolFinal || (config.mode==='training' && !config.warmupPartner)){
      loadDispatch('PracticeFeedback').catch(()=>{});
    }
    if (online.match) online.match.onConfirmedInput=(battle,a,b)=>finishTape?.record(battle,a,b);
    audioReady();
    dismiss();
    $('cup-select').replaceChildren();
    page = 'match';
    for (const id of ['home', 'cup-select', 'online-lobby', 'dispatch-route', 'dispatch-story', 'dispatch-hud', 'dispatch-orders'])
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
    document.body.classList.toggle('training-active', config.mode === 'training' && !config.warmupPartner);
    $('lobby').hidden = true;
    $('match').hidden = false;
    view = resume?.view || new FightView($('blast-radar'));
    showContactBoxes(false);
    view.shakeEnabled = settings.shake;
    const Match = config.stageRun?window.StageStrike.StageRun:config.eventId?window.SoloEvents.Run:config.mode==='targets' ? window.BellBreak.Run : config.mode==='parcel'?window.ParcelPunt.Run:Battle;
    world = resume?.battle || new Match({...config, rivalRead:series?.openingRead}, (name, e) => {
      world?.lesson?.contact(name,e,world);
      corner?.target?.contact(name,e,world);
      corner?.field?.contact(name,e,world);
      spar?.contact(name,e,world);
      view.event(name, e);
      fightSound(name,e);
      if(name==='routeFlag'){sound('tick');announce('Flag '+e.count+' of three');}
      if (name==='ringBell') announce(e.count+' of '+world.bells.length+' bells');
      if (name==='win' && world?.bells) world.saved=window.BellBreak.saveBellTime(world);
      if(name==='win' && world?.mode==='parcel')world.saved=window.ParcelPunt.save(world);
      if (world?.mode === 'training') window.PracticeFeedback?.event(world,name,e,practiceFight);
      if (name === 'footworkCue' || name === 'footworkResult') {
        if(window.PracticeDirectory)window.PracticeDirectory.footworkFeedback(world,e);
        else footworkCues.push(e);
      }
      if (name === 'ledgeRollEnd' && drillSide && e.f.index === 0) {
        $('recovery-tip').textContent =
          e.f.kit.ledgeRoll.label + ' finished. You’re facing the ledge. Tap Attack to jab.';
        drillSide = null;
      }
      if (name === 'blastThreat' && !world.survivalPractice) announce(e.f.stats.name + ' near the ' + e.zone + ' blast line');
      if(name==='ringOutScore')announce(window.StockCall?.describe(e,world.mode==='solo') || e.exits.map(d=>fighters[d.kind].name).join(' and ')+' knocked out');
      if(name==='clockBeat' && e.seconds===5 && !(online.match?.confirmedWorld || world).stockCall)announce('Five seconds left');
      if(name==='ko' && !e.scored)announce(e.f.stats.name+' knocked out');
      if(name==='relayEntry')announce(labelFor(e.f.index)+' sends in '+e.f.stats.name);
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
    if(resume?.checkpoint){
      Object.assign(world,resume.checkpoint.state);
      world.random.state=resume.checkpoint.seed;
    }
    if(corner && !schoolRuns.has(world)){
      schoolRuns.set(world,{previous:resume?.checkpoint?.header,began:Date.now(),writes:Promise.resolve(),
        losses:world.matchCard.losses.length,nextSave:world.matchFrames+900});
      loadDispatch('DispatchSuspend').catch(()=>{});
    }
    if(config.sparring && !visit)spar=resume?.spar || new window.FighterSchool.Sparring(world);
    if (config.lesson !== undefined) world.lesson = config.fighterCourse ?
      window.FighterSchool.makeTrial(config.lesson,world,storage) : new window.FightSchool.Lesson(config.lesson,world,config.schoolReview);
    if(world.lesson && !world.lesson.course && settings.guidedLessons)prepareGuide(world.lesson,world.terrain);
    const openingFrames = leadInFrames || (config.mode === 'solo' && config.openingFrames);
    if (openingFrames && !resume && !rehearsal) {
      const opener = new Battle(config, undefined, seededRandom(soloSeed));
      for (let frame = 0; frame < openingFrames; frame++) opener.step(1 / 60, idleInput, idleInput);
      if (config.openingFrames) {
        opener.matchFrames = 0;
        opener.clockFrames = world.clockFrames;
        opener.matchCard = world.matchCard;
      }
      world.copyFightFrom(opener);
    }
    if (rehearsal) {
      world.copyFightFrom(visit.returnStart || visit.battle);
      if(!visit.returnStart){
        const {cx,cy,zoom,leftFighter}=visit.view;
        Object.assign(view,{cx,cy,zoom,leftFighter});
      }
    }
    config.openingDuel?.place(world);
    $('training-tools').hidden = config.mode !== 'training' || !!world.warmupPartner;
    if(world.route){$('hud').hidden=true;$('match-clock').setAttribute('aria-label','Route time');$('match-clock').classList.remove('urgent');}
    $('return-fight').hidden = !visit;
    $('return-fight').textContent=visit?.review?'Back to match stats':visit?.returnResult?'Back to results':'Back to fight';
    setFrameMode('live');
    $('dummy-damage').value = '0';
    $('damage-output').textContent = '0%';
    const matchName = world.eventId?world.event.name:world.warmupPartner ? 'Online warm-up' : online.match ? 'Online · You are P' + (online.side + 1) : config.mode === 'solo' ?
      (rehearsal ? 'Practice' : 'Solo') + ' · ' + cpuLevels[world.cpuLevel].name + ' CPU' : world.bells ? 'Bell Break' : modes[config.mode];
    $('match-mode').textContent = rehearsal && visit.returnStart ? 'Stock return · '+(config.mode==='local'?'Local versus':cpuLevels[world.cpuLevel].name+' CPU') :
      cupAttempt ? 'Arcade Cup · Round '+(cupAttempt.round+1)+'/4' :
      config.rotationRound?(config.tourneyRound || 'Bout '+config.rotationRound)+' · P1 '+config.rotationTags[0]+' / P2 '+config.rotationTags[1]:
      world.lesson ? 'Fight School' : spar?'Sparring · '+world.dogs[0].stats.name:matchName + (world.relayTeams?' · Pack Relay':world.matchCard?.points?' · Time Battle':config.lastStockStart ? ' · Last stock' : '');
    $('match-stage').textContent = stageName(config.stage,world.form);
    const set = online.series || localSet;
    $('match-set').hidden = !set;
    if(corner?.field)corner.field.hud($('match-set'));
    if(world.warmupPartner){
      const badge=$('match-set');
      badge.hidden=false;
      badge.textContent=online.phase==='room'?'Room '+online.code:'Quickplay · Searching';
      badge.setAttribute('aria-label',badge.textContent);
    }
    if (world.bells || world.mode==='parcel') {
      $('match-stage').textContent=world.bells?world.course.name:'Sorting Yard';
      $('match-set').hidden=$('match-clock').hidden=false;
      $('match-set').removeAttribute('aria-label');
      $('match-clock').setAttribute('aria-label','Course time');
      $('match-clock').classList.remove('urgent');
      $('countdown').classList.remove('sudden');
      for (const id of ['hud','hop-compare','training-move','training-combo','training-charge','grapple-prompt']) $(id).hidden=true;
    }
    if (set) {
      $('match-set').textContent = 'Game ' + set.games.length + ' · ' + set.score.join('–');
      $('match-set').setAttribute('aria-label', 'Best of three, game ' + set.games.length + ', P1 ' + set.score[0] + ', P2 ' + set.score[1]);
    }
    if(config.openingDuel){
      $('match-mode').textContent='First-hit duel';
      const badge=$('match-set');badge.hidden=false;badge.textContent='First to 3 · '+config.openingDuel.score.join(' – ');
      badge.setAttribute('aria-label',badge.textContent);
    }
    $('pause-label').textContent = world.warmupPartner ? 'Warm-up menu' : online.match ? 'Match menu' : 'Pause';
    const position = rehearsal ? visit : resume;
    countdown = position ? position.countdown : world.lesson || config.mode === 'training' || world.suddenDeath || leadInFrames ? 0 : config.openingDuel ? .8 : 2.4;
    if(['solo','local'].includes(config.mode) && !world.lesson && !corner && !spar){
      const current=matchConfig,stage=world.stage;
      current.stageTrack=stage;
      const choose=()=>{
        if(page!=='match' || matchConfig!==current)return;
        const library=window.StageMusic;
        if(position)current.stageTrack=config.stageTrack===null || library.tracks.includes(config.stageTrack)?config.stageTrack:stage;
        else current.stageTrack=library.tracks.includes(song)?song:library.library(storage).pick(stage);
      };
      if(window.StageMusic)choose();
      else loadDispatch('StageMusic').then(()=>{
        if(countdown>0 || !music?.bus || music.track!==stage)choose();
      }).catch(()=>{});
    } else delete matchConfig.stageTrack;
    if(!position && countdown && world.atStartingMarks?.()){
      const intro={remaining:countdown,seats:[labelFor(0),labelFor(1)],still:false};
      view.entrance=intro;
      // A late asset can still identify the matchup without starting a walk-in halfway through.
      loadDispatch('FighterEntrances').then(()=>{intro.still=intro.remaining<1.95;}).catch(()=>{});
    }else if(!position || !countdown)view.entrance=null;
    lastCount = position?.lastCount || 0;
    resultDelay = 0;
    hudKey = '';
    accumulator = 0;
    $('countdown').textContent = position ? position.call : countdown ? String(Math.ceil(countdown/.8)) : '';
    $('countdown').classList.remove('net-lag','opponent-found');
    clearInput();
    updateHUD();
    view.draw($('game'), world, 0, 0);
    $('game').focus({ preventScroll: true });
    window.scrollTo(0, 0);
    const matchup=view.entrance?world.dogs.map((f,i)=>view.entrance.seats[i]+' '+f.stats.name).join(' versus ')+'. ':'';
    announce(matchup + matchName + ' on ' + stageName(config.stage,world.form));
  }
  function toLobby() {
    corner=spar=null;
    const fromMenu=page==='home';
    finishTape=null;
    cupAttempt = null;
    leaveOnline();
    localSet = null;
    practiceFight = null;
    page = 'lobby';
    previewPick=null;
    $('lobby-options').hidden=true;
    dismiss();
    world = null;
    view = null;
    document.body.classList.remove('playing', 'training-active', 'adventure-active', 'menu-screen');
    for (const id of ['home', 'cup-select', 'online-lobby', 'dispatch-route', 'dispatch-story', 'dispatch-hud', 'dispatch-orders'])
      $(id).hidden = true;
    $('lobby').hidden = false;
    $('match').hidden = true;
    $('countdown').textContent = '';
    syncLobby();
    const first=settings.mode==='local'?$('pick-together'):fromMenu?
      $('roster').querySelector('[data-kind="'+settings.p1+'"]'):$('start');
    first.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function showPause(autosave=true) {
    if(finishTrial)return showTrialPause();
    if (page !== 'match' || !world || world.end !== null) return;
    if(world.team)return window.DispatchView.duoPanel(world,showDialog);
    if(matchConfig?.openingDuel)return openOpeningDuel(matchConfig.openingDuel.card,matchConfig.openingDuel,matchConfig.openingDuel.point?'point':'pause');
    if(world.route)return window.StageStrike.routePanel(world,true,routeUI());
    if(world.eventId)return window.SoloEvents.panel(world,true,eventUI());
    if (world.bossLesson) return window.DispatchView.lessonPanel(world, view.parkedBoss.world, showDialog);
    if(world.warmupPartner)return showWarmupMenu();
    if(world.mode==='parcel'){
      window.ParcelPunt.pause(world,showDialog);return;
    }
    if (world.bells) {
      showDialog('pause',world.course.name+' paused','<p>'+world.cleared+' of six bells · '+window.BellBreak.formatTime(world.matchFrames)+
        '</p><div class="dialog-actions"><button class="primary" data-do="resume">Resume</button>'+
        '<button class="utility" data-do="bells-start">Restart course</button><button class="utility" data-do="controls">Controls</button>'+
        '<button class="utility" data-do="moves">Move list</button><button class="utility" data-do="bells-sheet">Choose course</button></div>');
      document.querySelector('[data-do=resume]').focus();
      return;
    }
    if(matchConfig?.cornerLesson){
      showDialog('pause',matchConfig.fighterCourse?'Sparring practice':'First fight practice','<div class="dialog-actions"><button class="primary" data-do="resume">Resume practice</button><button class="utility" data-do="return-fight">Back to fight</button></div>');
      document.querySelector('[data-do="resume"]').focus();return;
    }
    if (world.lesson) return openLessonList();
    const clips=!online.match?knockoutClips(world):[];
    const reviewButton=(!online.match && finishTape?.length?'<button class="utility" data-do="instant-replay">Instant replay</button>':'')+
      (clips.length?stockRetryButton(world)+recoveryButtons(world,clips)+knockoutButton:'');
    if (cupAttempt) {
      const round=cupAttempt.round+1;
      const toolsOpen=$('dialog').open && cupAttempt.pauseToolsOpen;
      showDialog('pause','Arcade Cup paused','<p>'+cup.courses[cupAttempt.kind].name+' · Round '+round+' of '+cup.rounds+'</p><div class="dialog-actions">'+
        '<button class="primary" data-do="resume">Resume</button><button class="utility" data-do="cup-sheet">Cup schedule</button></div>'+
        '<details id="cup-pause-tools"'+(toolsOpen?' open':'')+'><summary>More options</summary><div class="dialog-actions">'+
        '<button class="utility" data-do="moves">Move list</button><button class="utility" data-do="controls">Controls</button>'+reviewButton+'</div>'+
        '<p id="cup-leave-note">Leaving restarts round '+round+' on your next visit. Cleared rounds stay saved.</p>'+
        '<button class="utility" data-do="cup-roster" aria-describedby="cup-leave-note">Leave round</button></details>');
      const tools=$('cup-pause-tools'),attempt=cupAttempt;
      attempt.pauseToolsOpen=tools.open;
      tools.ontoggle=()=>{if(tools.isConnected)attempt.pauseToolsOpen=tools.open;};
      document.querySelector('[data-do=resume]').focus();
      return;
    }
    if (online.match) {
      showDialog('online-menu', 'Match menu',
        '<p id="online-fight-status">'+onlineFightStatus()+'</p><div class="dialog-actions"><button class="primary" data-do="resume">Return to fight</button><button class="utility" data-do="online-leave">Leave match</button></div>');
      document.querySelector('[data-do=resume]').focus();
      return;
    }
    if (world.mode === 'adventure') {
      if (!world.finished) window.DispatchView.pausePanel(world,showDialog,screenAction());
      return;
    }
    showDialog(
      'pause',
      'Paused',
      '<div class="dialog-actions"><button class="primary" data-do="resume">' +
        icon('play') +
        'Resume</button>' + (world.mode==='local' && !countdown && !world.suddenDeath?.intro ?
          '<button class="utility" data-do="resume-countdown">Resume with countdown</button>' : '') +
        '<button class="utility" data-do="controls">' +
        icon('keyboard') +
        'Controls</button>'+(world.mode==='local' && matchConfig.couchSeats?'<button class="utility" data-do="couch-pads">Assign controllers</button>':'')+
        '<button class="utility" data-do="moves">Move list</button>' + screenAction() + cameraButton() + '</div>' +
        (matchConfig.stageTrack!==undefined && window.YardScore?'<p id="music-credit">'+(window.YardScore.scores[matchConfig.stageTrack]?.title || 'Quiet arena')+'</p>':'')+
        targetRecap() + (spar?spar.goals(true):'') + (['solo','training'].includes(world.mode) ? '<div class="dialog-actions">' +
          (corner?fieldButton()+'<button class="utility" data-do="corner-practice">Practice · '+(schoolLessons.find(l=>l.id===corner.practice)?.title || $(corner.practice).textContent)+'</button>'+
            '<button class="utility" data-do="corner-toggle" aria-pressed="'+settings.cornerTips+'">Ringside tips · '+(settings.cornerTips?'On':'Off')+'</button>'+
            stockBreakToggle()+'<button class="utility" data-do="school-suspend">Save &amp; quit</button>':'')+
          (world.mode === 'solo' ? '<button class="utility" data-do="rehearse">' + (practiceFight?.returnStart?'Retry stock return':practiceFight?'Retry position':'Practice this position') + '</button>' : '') +
          '<button class="utility" data-do="practice">Find a drill</button>' +
          (practiceFight ? '<button class="utility" data-do="return-fight">'+$('return-fight').textContent+'</button>' : '') + '</div>' : '') +
        (world.mode==='local' && practiceFight?.returnStart?'<div class="dialog-actions"><button class="utility" data-do="rehearse">Retry stock return</button><button class="utility" data-do="return-fight">'+$('return-fight').textContent+'</button></div>':'')+
        cpuReadReport() + '<div class="dialog-actions">' + reviewButton + (world.mode === 'solo' && !localSet && !practiceFight && !matchConfig.schoolFinal && !spar ?
          '<button class="utility" data-do="cpu-level">Replay with another CPU</button>' : '') +
        (practiceFight ? '' : '<button class="utility" data-do="rematch">' + icon('reset') + 'Restart match</button>') +
        '<button class="utility" data-do="lobby">Fighter select</button><button class="utility" data-do="home">Main menu</button></div>',
    );
    document.querySelector('[data-do=resume]').focus();
    if(autosave && corner && !practiceFight)saveFirstPosition(pausedFight()).catch(()=>{});
  }
  function startNextSetGame(stage) {
    if (localSet?.advance(stage)) startMatch({...matchConfig, stage}, undefined, undefined, localSet);
  }
  const cardButton = '<button class="utility" data-do="match-card">Match stats</button>';
  const knockoutButton='<button type="button" class="utility" data-do="ko-replays">KO replays</button>';
  function stockRetryButton(battle){
    if(!finishTape?.reel || battle.matchCard?.points)return '';
    const seats=online.match?[online.side]:battle.mode==='local'?[0,1]:[0];
    return seats.filter(slot=>finishTape.fallFrames.some(f=>f.slots.includes(slot) &&
      battle.matchCard.losses[f.first+f.slots.indexOf(slot)]?.suddenRound===0)).map(slot=>
      '<button type="button" class="utility" data-do="stock-retry" data-stock-slot="'+slot+'">'+
      (seats.length===2?'Retry P'+(slot+1)+'’s stock':'Retry my stock')+'</button>').join('');
  }
  function latestFall(clips,slot){return clips.findLast(c=>c.losses.some(l=>l.slot===slot && l.zone==='bottom'));}
  function recoveryButtons(battle,clips){
    const seats=online.match?[online.side]:battle.mode==='local'?[0,1]:[0];
    return seats.filter(slot=>latestFall(clips,slot)).map(slot=>'<button type="button" class="utility" data-do="coach-fall" data-recovery-seat="'+slot+'">'+
      (battle.mode==='local' && !online.match?'Recover P'+(slot+1)+'’s last fall':'Recover my last fall')+'</button>').join('');
  }
  function recoverySheet({coach,coachLine,...review},plan=coach) {
    const back=()=>review.rescue?closeRecoveryClinic():review.fromClip?showFinishReplay(null,review):review.stockBreak?showStockBreak():review.from==='pause'?showPause():showResult();
    if(!window.RecoveryCoach)return waitForDispatch('Practice this recovery',()=>loadDispatch('RecoveryCoach'),()=>recoverySheet(review,plan),back);
    const device=promptDevice(getPads());
    const label=a=>device===0?keyFor(0,a):device===1 && !['left','right','up','down'].includes(a)?padFor(0,a):a[0].toUpperCase()+a.slice(1);
    window.RecoveryCoach.sheet(review.clip.tape,{showDialog,back,label,shake:settings.shake,slot:review.slot,follow:review.clip.returnTape,projection:review.rescue || review.projection,launch:review.launch,
      compare:review.rescue && review.launch && (()=>launchLab(review)),kind:review.kind,chooseFighter:review.rescue && !review.launch && (kind=>recoveryClinic(review.wide,false,kind)),
      swap:review.rescue && {title:review.kind?(review.wide?'Try the left ledge':'Try the right ledge'):review.launch?(review.wide?'Try the high throw':'Try the edge throw'):review.wide?'Try the low fall':'Try the wide fall',open:()=>recoveryClinic(!review.wide,!!review.launch,review.kind)},
      play:(route,guided=false)=>startFinishTrial(route.start,route.slot,{...review,coach:route,guided,coachLabel:label,
        coachLine:window.RecoveryCoach.instruction(route,label)})},plan);
  }
  function knockoutClips(battle){
    finishTape?.captureKnockouts(battle);
    return finishTape?.knockouts || [];
  }
  function secondChance({replyPlan,guided,replyPrompt,...review},contact){
    const back=()=>review.chanceClip?showFinishReplay(contact?.frame,review):review.rescue?closeRecoveryClinic():
      review.stockBreak?showStockBreak():showResult();
    if(!window.FinishTools)return waitForDispatch('Second Chance',()=>loadDispatch('FinishTools'),()=>secondChance(review,contact),back);
    const device=promptDevice(getPads()),slot=review.slot ?? 0;
    const label=k=>device===0?keyFor(0,k):device===1 && k!=='down'?padFor(0,k):k;
    window.FinishTools.secondChanceSheet(review.clip.tape,slot,{showDialog,back,label,loadFilm:()=>loadDispatch('MatchReview'),play:(plan,guided,prompt)=>
      startFinishTrial(Math.max(plan.contact.from,plan.cue-45),slot,{...review,replyPlan:plan,guided,replyPrompt:prompt})},contact);
  }
  function stockBreakToggle(){
    return '<button class="utility" data-do="stock-break-toggle" aria-pressed="'+settings.stockBreaks+'">Pause after my KOs · '+(settings.stockBreaks?'On':'Off')+'</button>';
  }
  function showStockBreak(){
    const clip=knockoutClips(world).at(-1),loss=clip?.losses.find(l=>l.slot===0);
    if(!loss || !world.dogs[0].stockLift)return showPause();
    const review={clip,slot:0,from:'pause',stockBreak:true,result:world},fall=loss.zone==='bottom';
    const hit=loss.lastHit && loss.frame-loss.lastHit.frame<=600 && loss.lastHit.id;
    const move=(moves[hit] || specials[hit] || smashes[hit] || pummels[hit] || throws[hit])?.label;
    showDialog('stock-break',stockLabel(world.dogs[0].stocks)+' left',
      '<p id="stock-break-recap"></p><div class="dialog-actions"><button class="primary" data-do="resume">Play next stock</button>'+
      '<button class="utility" id="stock-break-watch">Watch my KO</button>'+
      (move?'<button class="utility" id="stock-chance">Coach this KO</button>':'')+
      (fall?'<button class="utility" id="stock-break-practice">Practice this recovery</button>':'')+
      '<button class="utility" id="stock-break-retry">Retry this stock</button>'+stockBreakToggle()+
      '<button class="utility" data-do="school-suspend">Save &amp; quit</button></div>');
    $('stock-break-recap').textContent='Pip went out at the '+loss.zone+' blast line at '+tenth(loss.damage)+'%. '+
      (move?'Brisket’s last hit was '+move+'. ':'')+'Your next stock is waiting on the lift.';
    if($('stock-chance'))$('stock-chance').onclick=()=>secondChance(review);
    $('stock-break-watch').onclick=()=>showFinishReplay(null,review);
    if(fall)$('stock-break-practice').onclick=()=>recoverySheet(review);
    $('stock-break-retry').onclick=()=>stockSheet(review);
    $('dialog-body').querySelector('[data-do=resume]').focus();
  }
  function knockoutLabel(clip,battle){
    return clip.losses.map(loss=>'P'+(loss.slot+1)+' '+fighters[loss.kind || battle.matchCard.players[loss.slot].kind].name+
      ' at '+tenth(loss.damage)+'%').join(' & ');
  }
  function showKnockouts(from,focus){
    const battle=online.match?.confirmedWorld || world;
    const clips=knockoutClips(battle).slice().reverse();
    const back=()=>{
      if(from==='pause')showPause();else showResult();
      $('dialog-body').querySelector('[data-do=ko-replays]')?.focus();
    };
    if(!window.MatchReview)return waitForDispatch('KO replays',()=>loadDispatch('MatchReview'),()=>showKnockouts(from,focus),back);
    window.MatchReview.koList(clips,from,focus,{showDialog,back,label:c=>cardTime(c.losses[0].frame)+' · '+knockoutLabel(c,battle),
      open:clip=>showFinishReplay(null,{clip,from}),fight:online.match?null:clip=>{
        const source=pausedFight(),visit={...source,returnStart:clip.returnTape.playback(0).battle};
        if(from==='result')visit.returnResult=source;
        startMatch(source.config,undefined,source.seed,null,{visit});
      }});
  }
  function presentWinner() {
    const photo=document.querySelector('#dialog-body .winner :is(img,[data-podium])');
    if (!photo || !world) return;
    const result=online.match?.confirmedWorld || world;
    const slot=result.mode==='adventure' ? (result.finished==='exit'?0:1) : result.end;
    if (slot===null || !result.dogs[slot]) return;
    const dog=result.dogs[slot], canvas=document.createElement('canvas');
    canvas.width=152; canvas.height=104;
    canvas.className='victory-shot';
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',dog.stats.name+' on the winner’s podium');
    photo.replaceWith(canvas);
    victoryShot={canvas,kind:dog.encounter?.kind || dog.kind,coat:result.coatFor(slot),elapsed:0,cel:-1};
    drawVictory(0);
    const stats=document.querySelector('#dialog-body [data-do=match-card]');
    const options=$('result-options'),watch=$('result-watch'),practiceTools=$('result-practice');
    if(stats && result.mode==='local' && !result.relayTeams && !online.match && (!localSet || localSet.champion!==null)){
      if(matchConfig.rotationRound){
        const winner=localSet?.champion ?? result.end;
        const handoff=document.createElement('p');handoff.id='rotation-handoff';
        handoff.textContent=rotation.handoff(winner,matchConfig.rotationTags);
        if(options)$('dialog-body').querySelector('.result-scores').append(handoff);
        else canvas.closest('.winner').after(handoff);
      }else{
        const b=document.createElement('button');b.className='utility';b.dataset.do='rotation';b.textContent='Winner stays';if(options)options.append(b);else stats.before(b);
      }
    }
    if (finishTape?.length && stats) {
      if(matchConfig.openingMatchup)(options || stats).insertAdjacentHTML(options?'beforeend':'beforebegin','<button class="utility" data-do="matchup-card">Opening matchup · Pin or share</button>');
      const clips=knockoutClips(result);
      (practiceTools || stats).insertAdjacentHTML(practiceTools?'beforeend':'beforebegin',stockRetryButton(result)+recoveryButtons(result,clips));
      if(finishTape.reel){
        (watch || stats).insertAdjacentHTML(watch?'beforeend':'beforebegin','<button class="utility" data-do="watch-match">Watch full match</button>');
        const winner=$('result-recap') || $('cup-review')?.querySelector('[data-cup-recap]') || canvas.closest('.winner');
        const recap=()=>window.MatchReview.resultHighlight(winner,result,()=>watchMatch(null,'highlight'));
        if(window.MatchReview)recap();else loadDispatch('MatchReview').then(recap).catch(()=>{});
      }
      if(clips.length)(watch || stats).insertAdjacentHTML(watch?'beforeend':'beforebegin',knockoutButton);
      const schoolLoss=matchConfig.schoolFinal && result.end===1 && result.endReason==='ko';
      if(!watch || matchConfig.schoolFinal){
        const button=document.createElement('button');
        button.className='utility';button.dataset.do='watch-finish';
        button.textContent=schoolLoss?'Replay my last stock':'Watch finish';
        if(watch)watch.append(button);else stats.before(button);
        if(schoolLoss){
          const clip=clips.findLast(c=>c.losses.some(l=>l.slot===0));
          if(clip?.losses.some(l=>l.slot===0 && l.lastHit)){
            const coach=document.createElement('button');
            coach.className='utility';coach.id='result-chance';coach.textContent='Coach my last KO';
            coach.onclick=()=>secondChance({clip,slot:0,from:'result',result});
            practiceTools.append(coach);
          }
        }
      }
      const practice=document.createElement('button');
      practice.className='utility';practice.textContent='Practice finish';practice.dataset.do='practice-finish';
      practice.onclick=()=>chooseFinishFighter();
      if(practiceTools)practiceTools.append(practice);else stats.before(practice);
    }
  }
  function drawVictory(dt) {
    const shot=victoryShot;
    shot.elapsed=Math.min(2.8,shot.elapsed+dt);
    const cel=reducedReplays.matches ? 28 : Math.floor(shot.elapsed*12);
    if (cel===shot.cel) return;
    shot.cel=cel;
    window.DogFightView.drawPodium(shot.canvas,shot.kind,shot.coat,cel);
  }
  function replayTape(review){return review?.returning?review.clip.returnTape:review?.clip?.tape || finishTape;}
  function stockSheet(review){
    const back=()=>review.stockBreak?showStockBreak():review.from==='lesson'?backToRematchLesson():review.film?watchMatch(review.film,review.frame):review.from==='pause'?showPause(false):showResult();
    if(!window.MatchReview)return waitForDispatch('Retry my stock',()=>loadDispatch('MatchReview'),()=>stockSheet(review),back);
    if(!review.stock){
      const film=review.film?.film || new window.MatchReview.MatchFilm(finishTape.fullMatch());
      const slot=review.slot ?? 0, battle=review.result || online.match?.confirmedWorld || world;
      const fall=review.fall || film.data.falls.findLast(f=>f.slots.includes(slot) && battle.matchCard.losses[f.first+f.slots.indexOf(slot)]?.suddenRound===0);
      if(!fall)return back();
      review.stock=new window.MatchReview.StockRetry(film,fall,slot);
    }
    review.stock.sheet({showDialog,shake:settings.shake,back,sample:review.film?.sample,play:together=>
      startFinishTrial(review.stock.start,review.stock.slot,{...review,together})});
  }
  function watchMatch(context,at=null){
    if(!window.MatchReview)return waitForDispatch('Match replay',()=>loadDispatch('MatchReview'),()=>watchMatch(context,at),showResult);
    window.MatchReview.openFilm(context,at,{world:online.match?.confirmedWorld || world,tape:finishTape,stageName,showDialog,shake:settings.shake,records:showRecords,
      cardSheet:showMatchCard,resultSheet:showResult,stockSheet,trial:startFinishTrial,clip:showFinishReplay});
  }
  function showFinishReplay(atFrame=null,review=null) {
    const tape=replayTape(review);
    if (!tape?.length) return;
    const screen=()=>({tape,review,playing:atFrame===null && !reducedReplays.matches,rate:.5,carry:0,lifetime:new AbortController()});
    if(review?.duel){
      showDialog('finish-replay','Opening replay','');
      clipScreen=screen();
      review.duel.reviewPanel($('dialog-body'),tape,review.slot,frame=>{clipScreen.playing=false;seekClip(frame);},
        ()=>startFinishTrial(Math.max(0,tape.length-45),review.slot,review));
      seekClip(atFrame??0);wireClip();return;
    }
    const returning=review?.returning;
    const result=review?.result || online.match?.confirmedWorld || world, ko=review && !review.finish && !returning;
    const loss=!review?.instant && (((ko || returning) && (review.clip.losses.find(l=>l.slot===review.slot) || review.clip.losses[0])) || result.matchCard.losses.findLast(l=>l.slot!==result.end));
    const id=loss?.lastHit?.id;
    const label=(moves[id] || specials[id] || smashes[id] || pummels[id] || throws[id])?.label;
    const recoveries=ko?review.clip.losses.filter(l=>l.zone==='bottom' && (result.mode==='local' || l.slot===0)):[];
    const detail=review?.moment?'Match frame '+review.frame:review?.instant?'Last '+(tape.length/60).toFixed(1)+' seconds':!ko && result.endReason==='time'?'Time expired':label?'Last hit · '+label:
      id==='ball'?'Last hit · Tennis ball':loss?.zone?'Knockout · '+loss.zone+' blast line':'Knockout';
    const caption=ko?cardTime(loss.frame)+' · '+knockoutLabel(review.clip,result)+' · ':'';
    const stageClinic=['wall','heavy','ceiling'].includes(review?.clinic);
    showDialog('finish-replay',review?.launchLab?'Launch steering lab':review?.moment?review.moment.title:stageClinic?'Stage tech clinic':review?.clinic==='ledge'?'Ledge clinic':review?.clinic?'Landing clinic':review?.instant?'Instant replay':returning?'Stock return':ko?'KO replay':'Finish replay','<p class="clip-caption">'+
      (returning?stageName(result.stage,result.form)+' · '+cardTime(review.clip.losses[0].frame)+' · After the knockout':caption+stageName(result.stage,result.form)+' · '+detail)+
      '</p><canvas id="clip-arena" width="640" height="360" role="img" aria-label="Replay of the exchange"></canvas>'+
      '<div class="clip-status"><span id="clip-scores"></span><output id="clip-frame" aria-live="off"></output></div>'+
      '<input id="clip-seek" type="range" min="0" max="'+tape.length+'" value="0" aria-label="Replay frame">'+
      '<div id="clip-moments" class="dialog-actions" role="group" aria-label="Jump to a replay moment" hidden></div>'+
      '<div class="dialog-actions"><button class="primary" id="clip-toggle">Pause</button>'+
      '<button class="utility" id="clip-step">Step 1 frame</button><button class="utility" id="clip-speed">Speed · ½×</button></div>'+
      '<div class="dialog-actions">'+(result.mode==='solo' && !review?'<button class="utility" id="clip-practice">Play from here</button>':'')+
      (ko?'<button class="primary" id="clip-escape" aria-describedby="clip-escape-start">Try to save P'+(loss.slot+1)+'</button>':'')+
      (review?.clip.returnTape?.length?'<button class="utility" id="clip-return">'+(returning?'Watch knockout':'Watch stock return')+'</button>':'')+
      recoveries.map((l,i)=>'<button class="utility" '+(i===0?'id="clip-coach" ':'')+'data-clip-recovery="'+l.slot+'">'+
        (result.mode==='local'?'Practice P'+(l.slot+1)+'’s recovery':'Practice this recovery')+'</button>').join('')+
      '<button class="utility" id="clip-exchange"'+(returning?' disabled':'')+'>'+(returning?'Play the return':'Practice exchange')+'</button><button class="utility" id="clip-export">Make GIF</button><button class="utility" data-do="clip-back">'+
      (review?.instant?'Back to pause':review?['card','archive'].includes(review.from)?'Back to match stats':'Back to KO replays':'Back to results')+'</button></div>'+
      (ko?'<p id="clip-escape-start">Start before the knockout and try to keep that stock.</p>':returning?
        '<p>When the lift turns mint, tap Down, a side, or Jump. Leaving early gives you more protection.</p>':'')+
      '<output id="clip-export-status" aria-live="polite"></output>');
    clipScreen=screen();
    if($('clip-return'))$('clip-return').onclick=()=>showFinishReplay(null,{...review,returning:!returning});
    if(ko)$('clip-escape').onclick=()=>startFinishTrial(Math.max(0,tape.length-90),loss.slot,review);
    if(review?.moment)$('dialog-body').querySelector('[data-do=clip-back]').textContent='Back to full match';
    if(review?.stockBreak)$('dialog-body').querySelector('[data-do=clip-back]').textContent='Back to next stock';
    if(review?.from==='standings')$('dialog-body').querySelector('[data-do=clip-back]').textContent='Back to results';
    if(review?.clinic || review?.launchLab)$('dialog-body').querySelector('[data-do=clip-back]').textContent='Back to Fight School';
    for(const b of $('dialog-body').querySelectorAll('[data-clip-recovery]'))
      b.onclick=()=>recoverySheet({...review,slot:Number(b.dataset.clipRecovery),fromClip:true});
    const {signal}=clipScreen.lifetime;
    const prepare=async()=>{
      const button=$('clip-export');
      button.disabled=true;
      try{
        await loadDispatch('FinishTools');
        if(signal.aborted)return;
        if(returning)review.recordedReturn=window.FinishTools.returnTrace();
        clipScreen.syncInputs=window.FinishTools.install({tape,signal,stage:stageName(result.stage,result.form),shake:settings.shake,root:$('dialog-body'),
          follow:returning?review.recordedReturn:null,stageClinic:stageClinic && review.clinic,chooseClinic:replayClinic,
          ledgeFocus:review?.ledgeFocus,returnTape:review?.clip?.returnTape,practiceLedge:ledge=>startFinishTrial(ledge.mark.frame,ledge.mark.slot,{
            ...(review || {finish:true,from:'result',clip:{tape,losses:[]},result}),ledge,replayFrame:ledge.mark.frame}),
          holdFocus:review?.holdFocus,practiceHold:(hold,originalHold)=>startFinishTrial(hold.frame,hold.slot,{
            ...(review || {finish:true,from:'result',clip:{tape,losses:[]},result}),hold,originalHold,replayFrame:hold.frame}),
          clinic:review?.landingFocus || review?.moment || (stageClinic?{surface:review.clinic==='ceiling'?'ceiling':'wall'}:review?.clinic===true),practiceLanding:(landing,start,guided,options)=>startFinishTrial(start,landing.slot,{
            ...(review || {finish:true,from:'result',clip:{tape,losses:[]},result}),landing,guided,replayFrame:landing.frame,landingFocus:{...options,slot:landing.slot,at:landing.frame}}),
          retryMoment:review?.instant?(frame,slot,contact)=>startFinishTrial(frame,slot,{...review,replayFrame:contact}):null,
          coachDefense:ko?contact=>secondChance({...review,slot:contact.slot,chanceClip:true},contact):null,
          launchStudy:review?.launchStudy,attachAimReader:reader=>{clipScreen.aimReader=reader;},
          rescueLaunch:ko?launch=>recoverySheet({...review,launch,slot:launch.slot,fromClip:true,
            launchStudy:launch.chosenAim?{...launch,aim:launch.chosenAim}:review.launchStudy}):null,
          twoPlayers:result.mode==='local',initialSeat:review?.slot ?? loss?.slot ?? 0,frame:()=>clipScreen.player.frame,
          slot:loss?.slot,practiceLaunch:(frame,slot,study)=>startFinishTrial(frame,slot,study?{
            ...(review || {finish:true,from:'result',clip:{tape,losses:[]},result}),launchStudy:study,launchInput:tape.launchInput(study.frame,slot,study.aim)
          }:review),escapeReady:ko?mark=>{
            $('clip-escape-start').textContent=mark.label+' · frame '+mark.frame;
            $('clip-escape').onclick=()=>startFinishTrial(mark.frame,loss.slot,review);
          }:undefined,
          filename:'dog-fight-3-'+result.dogs.map(d=>d.kind).join('-vs-')+'-'+result.stage+(ko || returning?(returning?'-return-':'-ko-')+(review.clip.first+1):'')+'.gif',
          jump:frame=>{if(!signal.aborted){clipScreen.playing=false;seekClip(frame);}}});
        button.textContent='Make GIF';
        $('clip-exchange').disabled=false;
        $('clip-export-status').textContent='';
      }catch{
        if(signal.aborted)return;
        button.textContent='Retry replay tools';
        $('clip-export-status').textContent='Replay tools could not load.';
      }finally{if(!signal.aborted)button.disabled=false;}
    };
    $('clip-export').onclick=prepare;
    prepare();
    seekClip(atFrame??0);
    if(!window.StockCall || !window.FightCamera)Promise.all(['StockCall','FightCamera'].map(loadDispatch)).then(()=>{if(!signal.aborted)paintClip(0);}).catch(()=>{});
    $('clip-exchange').onclick=()=>chooseFinishFighter(clipScreen.player.frame,review);
    wireClip();
  }
  function wireClip(){
    $('clip-toggle').onclick=()=>{
      if (clipScreen.player.frame===clipScreen.player.length) seekClip(0);
      clipScreen.playing=!clipScreen.playing;
      updateClip();
    };
    $('clip-step').onclick=()=>{
      clipScreen.playing=false;
      clipScreen.carry=0;
      if (clipScreen.player.step()) paintClip(1/60);
      updateClip();
    };
    if($('clip-speed'))$('clip-speed').onclick=()=>{
      clipScreen.rate=clipScreen.rate===1 ? .5 : 1;
      $('clip-speed').textContent='Speed · '+(clipScreen.rate===1?'1×':'½×');
    };
    $('clip-seek').oninput=()=>{
      clipScreen.playing=false;
      seekClip(Number($('clip-seek').value));
    };
    if ($('clip-practice')) $('clip-practice').onclick=()=>{
      if (clipScreen.player.battle.end!==null) return;
      const visit={battle:clipScreen.player.battle,view:clipScreen.view,config:matchConfig,seed:soloSeed,
        countdown:0,lastCount:0,call:'',returnResult:pausedFight()};
      startMatch(visit.config,undefined,visit.seed,null,{visit});
    };
    $('clip-toggle').focus();
  }
  function updateClip() {
    const {player,playing}=clipScreen, end=player.frame===player.length;
    $('clip-toggle').textContent=end?'Watch again':playing?'Pause':'Play';
    $('clip-step').disabled=end;
    if ($('clip-practice')) $('clip-practice').disabled=end || player.battle.end!==null;
    $('clip-seek').value=player.frame;
    $('clip-frame').textContent='Frame '+player.frame+' / '+player.length;
    clipScreen.syncInputs?.();
    const scores=player.battle.dogs.map(d=>d.stats.name+' '+tenth(d.damage)+'% · '+fighterScore(player.battle,d.index)).join('  /  ');
    if ($('clip-scores').textContent!==scores) $('clip-scores').textContent=scores;
  }
  function paintClip(dt) {
    const {view,player}=clipScreen;
    view.draw($('clip-arena'),player.battle,dt,player.battle.time);
  }
  function seekClip(frame) {
    const view=new FightView();
    view.shakeEnabled=settings.shake;
    clipScreen.view=view;
    clipScreen.player=clipScreen.tape.playback(Math.max(0,frame-1),(name,event)=>view.event(name,event));
    if(frame>0)clipScreen.player.step();
    clipScreen.carry=0;
    paintClip(0);
    updateClip();
  }
  function tickClip(dt) {
    if (!clipScreen.playing || document.hidden) return;
    const {player}=clipScreen;
    clipScreen.carry+=dt*60*clipScreen.rate;
    const steps=Math.min(Math.floor(clipScreen.carry),player.length-player.frame);
    if (!steps) return;
    for (let n=0;n<steps;n++) player.step();
    clipScreen.carry-=steps;
    if (player.frame===player.length) clipScreen.playing=false;
    paintClip(steps/60);
    updateClip();
  }
  function chooseFinishFighter(cursor=null,review=null) {
    const tape=replayTape(review);
    if(!tape?.length)return;
    const result=review?.result || online.match?.confirmedWorld || world;
    const start=review?.returning?0:cursor===null || cursor>=tape.length ? Math.max(0,tape.length-120) : cursor;
    const opening=result.relayTeams || review?.returning?tape.playback(start).battle:result;
    const slot=review?.slot ?? review?.clip.losses[0]?.slot ?? (online.match?online.side:result.mode==='solo'?0:1-result.end);
    const back=()=>cursor===null?showResult():showFinishReplay(cursor,review);
    if(!window.FinishTools)return waitForDispatch('Replay practice',()=>loadDispatch('FinishTools'),()=>chooseFinishFighter(cursor,review),back);
    window.FinishTools.chooseFighter({opening,result,start,review,tape,cursor,portrait,showDialog,slot,back,
      pick:i=>startFinishTrial(start,i,review)});
  }
  function startFinishTrial(start,slot,review=null) {
    const tape=review?.stock?null:replayTape(review);
    const original=review ? review.result || finishTrial?.original || (review.stock?world:tape.playback(tape.length).battle) : online.match?.confirmedWorld || world;
    if(review?.from==='archive' && page!=='match'){
      const [first,second]=original.dogs;
      recordedFights.add(original);
      startMatch({mode:original.mode,stage:original.stage,form:original.form,cpuLevel:original.cpuLevel,
        p1:first.kind,p2:second.kind,coats:[original.coatFor(0),original.coatFor(1)]},undefined,undefined,null,
        {resume:{battle:original,tape,countdown:0,call:''}});
    }
    const camera=new FightView($('blast-radar'));camera.shakeEnabled=settings.shake;
    const trace=review?.returning?window.FinishTools.returnTrace():null;
    const emit=(name,e)=>{
      camera.event(name,e);fightSound(name,e);trace?.observe(name,e,player.frame+1);
    };
    const player=review?.replyPlan?window.FinishTools.secondChanceAttempt(tape,review.replyPlan,review.guided,emit):review?.rematchFilm?review.rematchFilm.attempt(tape,emit):review?.duel?review.duel.reply(tape,start,slot,emit):review?.ledge?window.FinishTools.ledgeAttempt(tape,review.ledge.mark,false,emit,review.clip?.returnTape):review?.hold?window.FinishTools.holdAttempt(tape,review.hold,false,emit):review?.stock?review.stock.attempt(emit,start):review?.landing?window.FinishTools.landingTry(tape,review.landing,start,emit):review?.coach?window.RecoveryCoach.attempt(tape,review.coach,emit,review.clip.returnTape):tape.playback(start,emit,slot);
    const saved=finishTrial?.saved || {mode:$('match-mode').textContent,pause:$('pause-label').textContent,
      call:$('countdown').textContent,setHidden:$('match-set').hidden,cornerHidden:$('corner-tip').hidden,schoolHidden:$('school-coach').hidden,
      cornerTitle:$('corner-title').textContent,cornerLine:$('corner-line').textContent};
    dismiss();
    finishTrial={player,camera,start,slot,review,original,saved,trace,returnNames:trace && player.battle.dogs.map(f=>f.stats.name),carry:0,ready:.8};
    if(review?.duel)finishTrial.replySeats=matchConfig.couchSeats;
    if(review?.together){
      const seats=new controls.Seats([]);
      if(matchConfig?.couchSeats)seats.copyFrom(matchConfig.couchSeats);
      seats.sync(getPads());
      finishTrial.seats=seats;
    }
    if(review?.instant)finishTrial.openingDamage=player.battle.matchCard.players.map(p=>p.damage);
    $('school-coach').hidden=true;
    $('corner-tip').hidden=true;
    if(review?.landing){
      [$('corner-title').textContent,$('corner-line').textContent]=window.FinishTools.landingCue(review);
      $('corner-tip').hidden=false;
    }
    if(review?.moment && !review.landing){
      $('corner-title').textContent=review.moment.title;
      $('corner-line').textContent=window.MatchReview.defenseCue(review.moment.type);$('corner-tip').hidden=false;
    }
    if(review?.replyPlan){
      $('corner-title').textContent='Second Chance';
      $('corner-line').textContent=review.replyPrompt+' before '+review.replyPlan.contact.move+'.';$('corner-tip').hidden=false;
    }
    if(review?.coach){
      $('corner-title').textContent='Reach the stage';$('corner-line').textContent=review.coachLine;$('corner-tip').hidden=false;
    }
    if(review?.ledge){
      const {mark,action,watch}=review.ledge,device=promptDevice(getPads());
      const key={climb:mark.left?'right':'left',roll:'shield',jump:'jump',attack:'attack',drop:'down'}[action];
      const control=key && (device===0?keyFor(0,key):device===1 && !['left','right','down'].includes(key)?padFor(0,key):key);
      finishTrial.ledgeCue=key?(watch?'Watch':'Try')+' · '+control:'Hold the stick centered';
      $('corner-title').textContent=watch?'Ledge get-up · ½ speed':'Your ledge get-up';
      $('corner-tip').hidden=false;
    }
    $('match-mode').textContent=(review?.replyPlan?'Second Chance':review?.ledge?'Ledge practice':review?.hold?'Grab escape':review?.landing?.surface?'Stage tech practice':review?.landing?'Landing practice':review?.moment?'Defense practice':review?.stock?'Stock '+review.stock.number+' retry':review?.instant?'Exchange practice':review?.coach?'Recovery practice':trace?'Stock return':review?.film?'Match replay practice':review && !review.finish?'KO practice':'Finish practice')+' · P'+(slot+1)+' '+player.battle.dogs[slot].stats.name;
    if(review?.together)$('match-mode').textContent+=' · Play together';
    if(review?.duel)$('match-mode').textContent='Opening retry · P'+(slot+1)+' '+player.battle.dogs[slot].stats.name;
    if(review?.rematchFilm)$('match-mode').textContent=player.target.line;
    $('match-set').hidden=$('grapple-prompt').hidden=true;
    $('match-clock').hidden=false;
    $('match-clock').setAttribute('aria-label',review?.hold?'Grip remaining':'Practice time left');
    $('match-clock').classList.remove('urgent');
    $('pause-label').textContent='Pause';
    $('countdown').classList.remove('sudden','net-lag');
    $('countdown').textContent='Ready';
    drawFinishTrial(0);
    $('game').focus({preventScroll:true});
    announce($('match-mode').textContent);
  }
  function drawFinishTrial(dt){
    const {player,camera,slot}=finishTrial,battle=player.battle;
    camera.draw($('game'),battle,dt,battle.time);
    const ledge=finishTrial.review?.ledge;
    if(ledge){
      const cue=ledge.action!=='hang' && player.frame-finishTrial.start<ledge.delay?'Wait at the ledge':finishTrial.ledgeCue;
      if($('corner-line').textContent!==cue)$('corner-line').textContent=cue;
    }
    for(const [i,f] of battle.dogs.entries())updateFighterCard(f,i,battle.coatFor(i),stockStatus(f,battle,i===slot || !!finishTrial.seats),offstageOptions(f,battle.terrain),finishTrial.seats?'P'+(i+1):i===slot?'YOU':'RIVAL',battle.matchCard?.points?.[i]??null,battle);
    const stock=finishTrial.review?.stock;
    const clock=$('match-clock'),text=finishTrial.review?.hold && battle.grapple?
      'Grip '+Math.ceil(100*Math.max(0,battle.grapple.remaining)/battle.grapple.capacity)+'%':
      stock && player.frame>=stock.end?'Land':(((stock?.end ?? player.length)-player.frame)/60).toFixed(1)+'s';
    if(clock.textContent!==text)clock.textContent=text;
    const grip=battle.grapple, prompt=$('grapple-prompt');
    const hide=!grip || grip.phase==='throw';
    if(prompt.hidden!==hide)prompt.hidden=hide;
    if(!hide){
      const label=finishTrial.seats?'P'+(grip.owner+1)+' grabbed P'+(2-grip.owner)+' · Aim to throw or tap to escape':
        grip.owner===slot?'Grabbed rival · Aim to throw':'Grabbed · Tap buttons or flick the stick';
      if(prompt.textContent!==label)prompt.textContent=label;
    }
  }
  function tickFinishTrial(dt,pads){
    if(document.hidden || $('dialog').open)return;
    const trial=finishTrial,player=trial.player;
    if(trial.ready>0){
      trial.ready=Math.max(0,trial.ready-dt);
      if(trial.ready)return;
      $('countdown').textContent='';
    }
    const ledge=trial.review?.ledge;
    trial.carry+=ledge?.watch?dt/2:dt;
    trial.seats?.sync(pads);
    while(trial.carry>=1/60 && player.frame<player.length && !player.outcome && player.battle.end===null){
      const applied=player.frame===trial.start && (trial.review?.launchInput || trial.review?.coach?.releaseInput);
      const input=applied || (ledge?.watch?player.reply(ledge.action,ledge.delay):
        playerInput(trial.seats || trial.replySeats?trial.slot:0,pads,trial.slot,player.battle));
      if(trial.review?.guided && trial.review.replyPlan && player.frame===trial.review.replyPlan.cue){
        if(!window.FinishTools.replyGate(trial.review.replyPlan,input)){
          $('countdown').textContent=trial.review.replyPrompt;taps.clear();touchTaps.clear();trial.carry=0;return;
        }
        $('countdown').textContent='';
      }else if(trial.review?.guided && (trial.review.landing || trial.review.coach)){
        const cue=trial.review.landing?window.FinishTools.landingGate(trial,input):
          window.RecoveryCoach.gate(trial.review.coach,player.frame-trial.start,input,trial.review.coachLabel,player.battle.dogs[trial.slot]);
        if($('countdown').textContent!==cue)$('countdown').textContent=cue;
        if(cue){taps.clear();touchTaps.clear();trial.carry=0;return;}
      }else if(!applied && (trial.review?.hold || trial.review?.from==='lesson' || trial.review?.coach && !trial.review.coach.aim) && player.frame===trial.start){
        if(!input.x && !input.y && !input.jump && !input.special && !input.shield && !input.attack && !input.shortHop &&
          !(trial.review.from==='lesson' && Object.values(input.tapped || {}).some(Boolean)) &&
          !((trial.review.hold || trial.review.from==='lesson') && (input.grab || input.smash || input.aimStick))){
          $('countdown').textContent='Your move';trial.carry=0;return;
        }
        $('countdown').textContent='';
      }
      const partner=trial.seats?playerInput(1-trial.slot,pads,1-trial.slot,player.battle):undefined;
      player.step(input,partner);
      taps.clear();touchTaps.clear();trial.carry-=1/60;
    }
    drawFinishTrial(dt);
    if(player.outcome || player.frame>=player.length || player.battle.end!==null)showTrialComparison();
  }
  function leaveFinishTrial(replay) {
    const {saved,start,review}=finishTrial;
    if(review?.launchInput)delete review.launchInput;
    const ledge=review?.ledge,stageImpact=!!review?.landing?.surface;
    finishTrial=null;
    if(review?.ledge){
      const {mark,action,delay}=review.ledge;
      review.ledgeFocus={...mark,action,delay};delete review.ledge;
      $('corner-title').textContent=saved.cornerTitle;$('corner-line').textContent=saved.cornerLine;
    }
    if(review?.hold){review.holdFocus=review.hold.frame;delete review.hold;delete review.originalHold;}
    if(replay && review?.landing){delete review.landing;delete review.guided;}
    if(review?.from==='archive'){
      showHome(false);
      if(review.replyPlan && replay)return secondChance(review,review.replyPlan.contact);
      if(review.rematchFilm)return review.rematchFilm.panel();
      if(replay && stageImpact)return showFinishReplay(review.replayFrame,review);
      if(replay && ledge)return showFinishReplay(ledge.mark.frame,review);
      if(review.stock && replay)return stockSheet(review);
      if(review.coach && replay)return recoverySheet(review,review.coach);
      if(review.launchStudy && replay)return showFinishReplay(review.launchStudy.frame-1,review);
      if(review.moment || review.film?.sample)return replay && review.moment && !review.baseline?showFinishReplay(review.moment.at,review):watchMatch(review.film,review.frame);
      if(review.film)return replay?watchMatch(review.film,review.frame):showMatchCard(0,review.entry,review.id,{first:'full'});
      return replay?showFinishReplay(start,review):backToSavedCard(review);
    }
    $('match-mode').textContent=saved.mode;$('match-set').hidden=saved.setHidden;
    $('pause-label').textContent=saved.pause;$('countdown').textContent=saved.call;
    $('corner-tip').hidden=saved.cornerHidden;
    $('school-coach').hidden=saved.schoolHidden;
    if(review?.replyPlan || review?.coach || review?.landing || review?.landingFocus || review?.moment){$('corner-title').textContent=saved.cornerTitle;$('corner-line').textContent=saved.cornerLine;}
    hudKey='';updateHUD();
    const result=online.match?.confirmedWorld || world;
    view.draw($('game'),result,0,world.time,result,matchFinishPhase(result));
    if(review?.rematchFilm)return review.rematchFilm.panel();
    if(review?.replyPlan && replay)return secondChance(review,review.replyPlan.contact);
    if(review?.replyPlan && review.stockBreak)return showStockBreak();
    if(review?.duel){if(replay)showFinishReplay(null,review);else showPause(false);}
    else if(!replay && (review?.rescue || review?.launchLab))closeRecoveryClinic();
    else if(!replay && review?.clinic){showHome(false);schoolList();}
    else if(replay && ledge)showFinishReplay(ledge.mark.frame,review);
    else if(replay && stageImpact)showFinishReplay(review.replayFrame,review);
    else if(replay && review?.stock)stockSheet(review);
    else if(replay && review?.coach)recoverySheet(review,review.coach);
    else if(review?.moment){if(replay && !review.baseline)showFinishReplay(review.moment.at,review);else watchMatch(review.film,review.frame);}
    else if(replay && review?.film)watchMatch(review.film,review.frame);
    else if(replay)showFinishReplay(review?.replayFrame ?? start,review);
    else if(review?.from==='lesson')backToRematchLesson();
    else if(review?.from==='pause')dismiss();
    else if(review?.from==='card')showMatchCard();
    else showResult();
  }
  function trialActions(){
    if(finishTrial.review?.replyPlan)return window.FinishTools.secondChanceActions(finishTrial.review);
    if(finishTrial.review?.rematchFilm)return finishTrial.review.rematchFilm.actions();
    if(finishTrial.review?.duel)return finishTrial.review.duel.actions();
    if(finishTrial.review?.ledge)return window.FinishTools.ledgeActions(finishTrial.review);
    if(finishTrial.review?.coach)return window.RecoveryCoach.actions(finishTrial.review);
    if(finishTrial.review?.landing)return window.FinishTools.landingActions(finishTrial.review);
    if(finishTrial.review?.stock)return finishTrial.review.stock.actions(finishTrial.review.from,finishTrial.review.film?.sample);
    if(finishTrial.review?.moment || finishTrial.review?.film?.sample)return window.MatchReview.defenseActions();
    return '<div class="dialog-actions"><button class="primary" data-do="trial-retry">'+(finishTrial.trace?'Retry return':'Retry exchange')+'</button>'+
      '<button class="utility" data-do="trial-replay">'+(finishTrial.review?.instant?'Back to instant replay':finishTrial.review?.film?'Back to full match':finishTrial.trace?'Back to return replay':'Choose another frame')+'</button><button class="utility" data-do="trial-results">'+
      (finishTrial.review?.launchLab?'Fight School':finishTrial.review?.from==='pause'?'Back to fight':['card','archive'].includes(finishTrial.review?.from)?'Back to match stats':'Back to results')+'</button></div>';
  }
  function showTrialPause(){
    showDialog('finish-pause','Practice paused','<div class="dialog-actions"><button class="primary" data-do="resume">Resume</button></div>'+trialActions());
    document.querySelector('[data-do=resume]').focus();
  }
  function showTrialComparison(){
    const {player,original,slot,review}=finishTrial;
    if(review?.replyPlan)return window.FinishTools.secondChanceReport(player,review,showDialog);
    if(review?.rematchFilm)return review.rematchFilm.report(player,showDialog);
    if(review?.duel)return review.duel.report(player,slot,showDialog);
    if(review?.ledge)return window.FinishTools.ledgeReport(player,review,showDialog);
    if(review?.hold){
      window.FinishTools.holdReport(review.originalHold,player.result,showDialog,trialActions());
      return;
    }
    if(review?.landing){
      window.FinishTools.landingReport(player,review.landing,showDialog,trialActions());
      return;
    }
    if(review?.stock || review?.baseline){
      const report=review.stock?review.stock.comparison(player):window.MatchReview.defenseReport(review,player.battle);
      showDialog('finish-comparison',report.title,report.html+trialActions(),false);
      if(review.stock && player.take.length){
        const compare=document.createElement('button');compare.id='stock-compare';compare.className='utility';compare.textContent='Compare both runs';
        document.querySelector('#dialog-body .dialog-actions').prepend(compare);
        compare.onclick=()=>{
          const back=()=>{showTrialComparison();$('stock-compare').focus({preventScroll:true});};
          const open=()=>review.stock.compareRuns(player,{showDialog,shake:settings.shake,back,retry:frame=>startFinishTrial(frame,slot,review)});
          if(window.FinishTools)open();else waitForDispatch('Compare both runs',()=>loadDispatch('FinishTools'),open,back);
        };
      }
      if(review.from==='lesson' && ['saved','won'].includes(player.outcome)){
        saveSchool({fight:review.ticket});
        const btn=document.createElement('button');btn.className='primary';btn.textContent='Rematch Brisket';
        btn.onclick=()=>startFirstFight(review.lesson);$('dialog-body').querySelector('.dialog-actions').prepend(btn);
        btn.focus();return;
      }
      document.querySelector('[data-do=trial-results]').focus();return;
    }
    if(review?.coach){
      const landed=player.outcome==='landed';
      const point=player.battle.matchCard.points && !player.battle.suddenDeath;
      showDialog('finish-comparison',landed?(point?'Point saved!':'Stock saved!'):'Try the return again',
        '<p>'+window.RecoveryCoach.feedback(player,review.coach,review.rescue || review.projection)+'</p>'+
        (landed?'':'<p>'+review.coachLine+'</p>')+trialActions(),false);
      document.querySelector('[data-do=trial-'+(landed?'results':'retry')+']').focus();return;
    }
    if(finishTrial.trace){
      const rows=window.FinishTools.returnComparison(review.recordedReturn,finishTrial.trace,review.clip.losses,finishTrial.returnNames);
      showDialog('finish-comparison','Stock return complete','<table class="finish-comparison"><thead><tr>'+
        '<th>Return</th><th>Recorded</th><th>This attempt</th></tr></thead><tbody>'+rows+'</tbody></table>'+trialActions(),false);
      document.querySelector('[data-do=trial-retry]').focus();return;
    }
    const score=(battle,i)=>fighterScore(battle,i)+' · '+tenth(battle.dogs[i].damage)+'%';
    let rows=original.dogs.map((f,i)=>'<tr><th scope="row">'+(i===slot?'You · ':'P'+(i+1)+' · ')+f.stats.name+
      '</th><td>'+score(original,i)+'</td><td>'+score(player.battle,i)+'</td></tr>').join('');
    if(review?.instant)for(const i of [slot,1-slot]){
      const damage=b=>tenth(b.matchCard.players[i].damage-finishTrial.openingDamage[i])+'%';
      rows+='<tr><th scope="row">'+(i===slot?'Damage dealt':'Damage taken')+'</th><td>'+damage(original)+'</td><td>'+damage(player.battle)+'</td></tr>';
    }
    const difference=player.battle.dogs[slot].stocks-original.dogs[slot].stocks;
    const falls=battle=>battle.matchCard.losses.filter(l=>l.slot===slot).length;
    const line=review && review.clip.losses.some(l=>l.slot===slot) && falls(player.battle)<falls(original)?
      'You survived the original knockout.':original.matchCard?.points?'Your score was '+fighterScore(original,slot)+'. This attempt ended at '+fighterScore(player.battle,slot)+'.':
      difference>0?'You kept '+stockLabel(difference)+' more.':difference<0?'You lost '+stockLabel(-difference)+' more.':
      'You finished with the same number of stocks.';
    showDialog('finish-comparison','Exchange complete','<p>'+line+'</p><table class="finish-comparison"><thead><tr>'+
      '<th>'+(review?.instant?'Exchange':'Fighter')+'</th><th>Original</th><th>This attempt</th></tr></thead><tbody>'+rows+'</tbody></table>'+trialActions(),false);
    document.querySelector('[data-do=trial-retry]').focus();
  }
  function cardTime(frame) {
    const seconds = Math.floor(frame / 60);
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0');
  }
  const recordedFights=new WeakSet();
  const replayWrites=new Map();
  const recordModes={solo:'Solo',local:'Local versus',online:'Online versus',cup:'Arcade Cup',school:'Fight School'};
  let reviewCard=null;
  function recordMode() {
    return online.match?'online':cupAttempt?'cup':matchConfig?.schoolFinal || spar?'school':world.mode;
  }
  function recordFight(result) {
    if(result?.eventId)return result.save(storage);
    if (!result?.matchCard || result.end===null || practiceFight || matchConfig?.openingDuel || recordedFights.has(result)) return;
    const series=online.series || localSet;
    const entry={time:Date.now(),mode:recordMode(),side:online.match?online.side:0,stage:result.stage,form:result.form,
      round:series?.games.length || (cupAttempt?cupAttempt.round+1:0),winner:result.end,card:structuredClone(result.matchCard)};
    const tape=finishTape;
    if(tape?.length){tape.captureKnockouts(result);entry.replay=true;}
    if(corner?.previous && corner.target)entry.rematch={previous:corner.previous,skill:corner.target.id,frame:corner.target.tapeFrame ?? null};
    const ticket=records.add(entry);
    if(corner)corner.ticket=ticket;
    spar?.save(storage,result.end);
    if(entry.replay){
      const task=loadDispatch('MatchReview').then(()=>window.MatchReview.save(ticket,tape));
      replayWrites.set(ticket,task);
      task.catch(()=>{}).finally(()=>replayWrites.delete(ticket));
    }
    if(matchConfig.schoolFinal){
      const slot=schoolRuns.get(result);
      if(slot){
        slot.finished=true;
        loadDispatch('DispatchSuspend').then(()=>window.DispatchSuspend.writeSchool(slot,null)).then(readMissionSaves).catch(()=>{});
      }
      schoolSave.firstFightDone=true;
      saveSchool(result.end===0?{won:true}:{loss:window.FightSchool.rematchLesson(result.matchCard).id,ticket});
    }
    if(matchConfig.rotationRound && (matchConfig.tourneyRound && localSet?
      rotation.finishGame(matchConfig.rotationRound,localSet,result.end,result.matchCard):
      window.CouchSelect.finishEvent(rotation,matchConfig.rotationRound,localSet,result.end)))saveRotation();
    recordedFights.add(result);
  }
  function showRecords(focusId) {
    if (page!=='home') showHome(false);
    if(!window.MatchReview)return waitForDispatch('Fight Records',()=>loadDispatch('MatchReview'),()=>showRecords(focusId),()=>$('home-records').focus());
    window.MatchReview.recordList(records,recordModes,portrait,showDialog,focusId,sampleReplay);
  }
  function sampleReplay(stock=false){
    let example;
    waitForDispatch('Sample replay',async()=>{await loadDispatch('MatchReview');example=await window.MatchReview.sampleFight();},()=>{
      const fall=stock===true && example.film.data.falls[0];
      if(fall)return stockSheet({film:example,fall,slot:0,frame:fall.at,from:'archive',result:example.film.playback(fall.at).battle});
      watchMatch(example,0);
    },showRecords);
  }
  function backToSavedCard(review){
    return showMatchCard(0,review.entry,review.id,{first:review.finish?'finish':String(review.clip.first),slot:review.slot});
  }
  function showMatchCard(index,archived=null,id=null,focus=null) {
    if(!window.MatchReview)return waitForDispatch('Match stats',()=>loadDispatch('MatchReview'),
      ()=>showMatchCard(index,archived,id,focus),()=>archived?showRecords(id):showResult());
    const result = archived ? null : online.match?.confirmedWorld || world;
    const set = archived ? null : online.series || localSet;
    const games = archived ? [archived] : set?.games || [{stage:result.stage, winner:result.end, card:result.matchCard}];
    index ??= games.length - 1;
    const game = games[index];
    if (!game?.card) return;
    const mode=archived?.mode || recordMode(), side=archived?.side ?? (online.match ? online.side : 0);
    const form=archived?.form || result.form;
    reviewCard={id,archived,index,game,mode,side};
    const clips=!archived && index===games.length-1 ? knockoutClips(result) : [];
    const html=window.MatchReview.cardHTML({games,index,mode,side,form,set,archived,clips,inRoom:!!online.match,
      recordModes,stageName,cardTime,tenth,portrait,stockLabel});
    showDialog(archived?'record-card':'match-card','Match stats',html);
    if (archived?.replay) window.MatchReview.attach(id,archived,replayWrites.get(id),r=>showFinishReplay(null,r),focus,(film,selection)=>watchMatch({film,entry:archived,id,selection}));
    if(!archived && index===games.length-1 && finishTape?.reel)window.MatchReview.enableStudy(selection=>
      watchMatch({film:new window.MatchReview.MatchFilm(finishTape.fullMatch()),selection},0));
    (document.querySelector('[data-card-game][aria-pressed=true]') || $('dialog-close')).focus();
  }
  const openResultReviews=new WeakSet();
  function versusResult(result,{title,headline,finish,duration,next='',primary,links='',extras='',notes=''}){
    const winner=result.end, dog=result.dogs[winner],card=result.matchCard;
    const timed=!!card?.points,net=!!online.match;
    const clips=knockoutClips(result);
    const rows=[winner,1-winner].map((i,rank)=>{
      const f=result.dogs[i],score=timed?card.points[i]:f.stocks;
      const clip=clips.findLast(c=>c.losses.some(l=>l.slot===i)),loss=clip?.losses.find(l=>l.slot===i);
      const content='<b class="place">'+(rank+1)+'</b><img alt="" src="'+portrait(f.kind,result.coatFor(i))+'">'+
        '<span><small>'+labelFor(i)+'</small><strong>'+ (result.relayTeams?result.relayTeams[i].map(id=>fighters[id].name).join(' / '):f.stats.name)+'</strong></span>'+
        '<b class="final-score">'+score+'</b>';
      return '<li data-result-seat="'+i+'">'+(loss?'<button class="standing" data-latest-fall="'+i+'" data-clip-first="'+clip.first+'">'+content+
        '<span class="fall-link">Watch last fall · '+cardTime(loss.frame)+'</span></button>':'<div class="standing">'+content+'</div>')+'</li>';
    }).join('');
    const type=timed?(result.suddenDeath?'Regulation points':'Points'):result.suddenDeath?'Sudden Death stocks':'Stocks left';
    const art='<div class="result-art"><img src="'+portrait(dog.kind,result.coatFor(winner))+'" alt="">'+
      (finishTape?.length?'<button class="utility" data-do="watch-finish">'+icon('play')+'Watch finish</button>':'')+'</div>';
    const details='<details id="result-review"'+(openResultReviews.has(result)?' open':'')+'><summary>Replays &amp; practice</summary>'+
      '<div class="result-tools"><section id="result-watch"><h4>Watch</h4><span id="result-recap" hidden></span></section>'+
      '<section id="result-practice"><h4>Practice</h4></section><section id="result-options"><h4>Match options</h4>'+extras+
      '</section></div>'+notes+'</details>';
    showDialog(net?'online-result':'result',title,'<div class="result-board">'+(net?'':'<button class="utility result-home" data-do="home">Main menu</button>')+'<div class="winner">'+art+
      '<div class="result-line"><span>'+stageName(result.stage,result.form)+'</span><h3>'+headline+'</h3><p>'+finish+' · '+duration+'</p></div></div>'+
      '<section class="result-scores" aria-label="Final standings"><header><h4>'+type+'</h4>'+cardButton+'</header><ol>'+rows+'</ol>'+next+
      (net?'<p id="net-rematch-status" role="status"></p>':'')+'</section>'+
      '<div class="result-actions">'+primary+links+'</div>'+details+'</div>',false);
    rememberResultReview(result);
  }
  function rememberResultReview(result){
    const review=$('result-review');
    review.ontoggle=()=>{
      if(!review.isConnected)return;
      if(review.open)openResultReviews.add(result);else openResultReviews.delete(result);
    };
  }
  function showSetResult(result, set, finish, duration) {
    roomDraft=null;
    const net = !!online.match;
    if (!net) set.finish(result.end, result.cpuLevel === 'rival' ? result.bot.shieldHabit : null, result.matchCard);
    const champion = set.champion, picker = set.picker;
    const name = (i,kind=result.dogs[i].kind) => labelFor(i) + ' ' + fighters[kind].name;
    const title = champion === null ? 'Game ' + set.games.length + ' result' : 'Set complete';
    const history = set.games.map((g,i) => '<li><span>' + (i+1) + ' · ' + arenas[g.stage].name +
      '</span><strong>' + name(g.winner,g.card?.players[g.winner].kind) + '</strong></li>').join('');
    const stageLog=matchConfig.stageStrikes?window.StageStrike.history(set.games):'';
    let action, text, next = '';
    if (champion !== null) {
      action = net ? 'online-rematch' : matchConfig.rotationRound?'rotation':'new-set';
      text = action==='rotation'?(matchConfig.tourneyRound?'Tournament bracket':'Next challenger'):'Play another set';
    } else if(!net && matchConfig.stageStrikes){
      action='strike-next';text=set.pendingStrike?'Resume stage picks':'Counterpick for game '+(set.games.length+1);
      next='<p>'+name(1-picker)+' bans two arenas. '+name(picker)+' chooses from the remaining three.</p>';
    } else if (!net && world.mode === 'solo' && picker === 1) {
      const stage = set.cpuPick(result.dogs[1].kind);
      next = '<p>' + name(1) + ' picks ' + stageName(stage,result.form) + '. ' + (stageForms[result.form].description || arenas[stage].description) + '</p>';
      action = 'cpu-counterpick';
      text = 'Play game ' + (set.games.length+1);
    } else {
      const canSwitch=net ? online.fighterPicks : world.mode==='local';
      next = '<p>' + name(picker) + (canSwitch?' can change fighters and choose the next arena.':' picks the next arena.')+'</p>';
      const chooses = !net || online.side === picker;
      action = chooses ? 'set-pick' : 'online-rematch';
      text = chooses && canSwitch?'Counterpick for game '+(set.games.length+1):chooses ? 'Pick arena' : 'Ready for game ' + (set.games.length+1);
    }
    const winner = champion ?? result.end;
    versusResult(result,{title,headline:name(winner)+(champion===null?' wins game '+set.games.length:' wins the set'),finish,duration,
      next:'<h3 id="set-score">Set score · P1 '+set.score[0]+' – '+set.score[1]+' '+(world.mode==='solo'?'CPU':'P2')+'</h3>'+next,
      primary:'<button class="primary" data-set-next data-do="'+action+'">'+text+'</button>',
      links:(net?rematchFighterButton():champion===null && matchConfig.tourneyRound?'<button class="utility" data-do="rotation">Tournament bracket</button>':'')+
        '<button class="utility" data-do="'+(net?'online-leave">Online lobby':'lobby">Fighter select')+'</button>',
      notes:'<ol class="set-history" aria-label="Game winners">'+history+'</ol>'+stageLog+(net?'':cpuReadReport())});
    if (net) updateVotes();
    document.querySelector('[data-set-next]:not(:disabled), [data-do=online-leave]')?.focus();
    announce(title + '. ' + name(winner) + ' wins. Set score ' + set.score.join(' to '));
  }
  function showResult() {
    const call=$('countdown');
    if(call.classList.contains('fight-end')){call.textContent='';call.classList.remove('fight-end');}
    if(world.route)return window.StageStrike.routePanel(world,false,routeUI());
    if(world.eventId)return window.SoloEvents.panel(world,false,eventUI());
    if(world.mode==='parcel')return parcelResult();
    if (world.bells) return bellResult();
    const result = online.match?.confirmedWorld || world;
    recordFight(result);
    if (cupAttempt) return cupResult(result.mode==='adventure' ? result.finished==='exit' : result.end===0);
    const f = result.dogs[result.end], elapsed = Math.floor(result.matchFrames / 60);
    const duration = Math.floor(elapsed / 60) + 'm ' + String(elapsed % 60).padStart(2, '0') + 's';
    const finish = result.matchCard?.points?(result.suddenDeath?'Sudden Death KO':'Time expired')+' · P1 '+pointLabel(result.matchCard.points[0])+' / P2 '+pointLabel(result.matchCard.points[1]):
      result.endReason === 'time' ? 'Time expired · ' + result.dogs.map(d=>d.stocks).join('–') + ' stocks (P1–P2)' :
      result.endReason === 'sudden' ? 'Sudden Death KO' : stockLabel(f.stocks);
    if (practiceFight && (world.mode==='solo' || practiceFight.returnStart)) {
      showDialog('result', 'Practice finished', '<p>' + f.stats.name + ' wins this attempt. Your fight is paused.</p>' +
        '<div class="dialog-actions"><button class="primary" data-do="rehearse">Retry position</button>' +
        '<button class="utility" data-do="return-fight">'+(practiceFight.returnResult?'Back to results':'Back to fight')+'</button></div>', false);
      document.querySelector('[data-do=rehearse]').focus();
      return;
    }
    const set = online.series || localSet;
    if (set) return showSetResult(result, set, finish, duration);
    if (matchConfig?.schoolFinal && !online.match) {
      const won=result.end===0;
      const review=won ? null : window.FightSchool.rematchLesson(result.matchCard);
      const round=won?(cupEntry('pip').active?.wins.length || 0):0;
      const bout=cup.courses.pip.bouts[round];
      const next=bout?fighters[bout[0]].name+' on '+stageName(bout[1],bout[2]):'Copper Hound at Bell Depot';
      const advance='<button class="'+(won?'primary':'utility')+'" data-do="school-cup">Pip’s Arcade Cup</button>';
      const practice=review?'<button class="primary" data-school-review="'+review.id+'">'+review.button+'</button>':'';
      const title=won?'First fight won!':'First fight finished';
      showDialog('result',title,'<div class="school-result"><div class="winner"><img alt="" src="'+portrait(f.kind,result.coatFor(f.index))+'"><div><h3>'+
        f.stats.name+' wins!</h3><p>'+finish+' · '+duration+'</p></div></div><p class="school-verdict">'+
        (won?'Next in Pip’s Arcade Cup · '+next:review.reason)+'</p>'+targetRecap()+
        '<div class="school-result-actions">'+(won?advance:practice)+'<button class="utility" data-do="rematch">Rematch Brisket</button></div>'+
        '<details id="result-review"'+(openResultReviews.has(result)?' open':'')+'><summary>More options</summary>'+
        '<div class="result-tools"><section id="result-watch"><h4>Watch</h4><span id="result-recap" hidden></span>'+
        (corner?.previous?'<button class="utility" data-do="rematch-film">Compare my rematch</button>':'')+cardButton+'</section>'+
        '<section id="result-practice"><h4>Practice</h4>'+fieldButton()+'<button class="utility" data-do="fighter-classes">Fighter lessons</button></section>'+
        '<section id="result-options"><h4>Play</h4>'+(won?'':advance)+'<button class="utility" data-do="home">Main menu</button></section></div></details></div>',false);
      rememberResultReview(result);
      document.querySelector('.school-result-actions .primary').focus();
      announce(title);
      return;
    }
    if (online.match) {
      roomDraft=null;
      const title = result.end === online.side ? 'You win!' : 'Opponent wins';
      versusResult(result,{title,headline:f.stats.name+' wins!',finish,duration,
        primary:'<button class="primary" data-do="online-rematch">Rematch</button>',links:rematchFighterButton()+
          '<button class="utility" data-do="online-leave">Online lobby</button>'});
      updateVotes();
      document.querySelector('[data-do=online-rematch]').focus();
      announce(title);
      return;
    }
    versusResult(result,{title:result.relayTeams?'Pack Relay result':spar?'Sparring result':'Match result',
      headline:(result.relayTeams?labelFor(f.index)+'’s pack':f.stats.name)+' wins!',finish,duration,
      primary:'<button class="primary" data-do="'+(matchConfig.rotationRound?'rotation':'rematch')+'">'+
        (matchConfig.rotationRound?(matchConfig.tourneyRound?'Tournament bracket':'Next challenger'):icon('reset')+'Rematch')+'</button>',
      links:(result.relayTeams?'<button class="utility" data-do="pack-relay">Change teams</button>':'')+
        (spar?'<button class="utility" data-do="spar-card">Fighter lessons</button>':'<button class="utility" data-do="lobby">Fighter select</button>'),
      extras:result.matchCard?.openingPoints?'<button class="utility" data-do="swap-clock">'+
        (matchConfig.finalCount==='chase'?'Start a point ahead':'Start a point behind')+'</button>':'',
      notes:spar?spar.goals():cpuReadReport()});
    announce(f.stats.name + ' wins the Golden Tennis Ball');
    document.querySelector('#dialog-body .primary').focus();
  }
  $('start').onclick = () => settings.mode==='training'?
    startMatch({...settings,...lobbyBattleRules(settings),form:lobbyForm(),coats:lobbyCoats}):playMatchup(lobbyMatchup());
  $('pause').onclick = showPause;
  $('dialog-body').addEventListener('click', (e) => {
    const fall=e.target.closest('[data-latest-fall]');
    if(fall){
      const clip=finishTape?.knockouts.find(c=>c.first===Number(fall.dataset.clipFirst));
      if(clip)return showFinishReplay(null,{clip,slot:Number(fall.dataset.latestFall),from:'standings'});
    }
    const coat = e.target.closest('[data-coat]');
    if (coat && dialogType === 'coats') return chooseCoat(Number(coat.dataset.coat));
    const game = e.target.closest('[data-card-game]');
    if (game) return showMatchCard(Number(game.dataset.cardGame));
    const ko=e.target.closest('[data-card-ko]');
    if(ko && dialogType==='match-card'){
      const clip=finishTape?.knockouts.find(c=>c.first===Number(ko.dataset.cardKo));
      if(clip)return showFinishReplay(null,{clip,from:'card',slot:Number(ko.dataset.koSlot)});
    }
    const record=e.target.closest('[data-record-id]');
    if (record && dialogType==='records') {
      const id=record.dataset.recordId, entry=records.get(id);
      return entry?showMatchCard(0,entry,id):showRecords();
    }
    const exercise=e.target.closest('[data-record-drill]');
    if (exercise && ['record-card','match-card'].includes(dialogType) && !online.match)
      return practiceFromCard(Number(exercise.dataset.recordDrill));
    const format = e.target.closest('[data-format]');
    const scoring=e.target.closest('[data-scoring]');
    if(scoring){
      settings.timed=scoring.dataset.scoring==='time';
      if(settings.timed && !settings.minutes)settings.minutes=3;
      save();syncLobby();$('rules-label').onclick();
      document.querySelector('[data-scoring="'+scoring.dataset.scoring+'"]').focus();
      return;
    }
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
      startMatch({ ...settings, form:lobbyForm(), coats:lobbyCoats, suddenStart:true });
      return;
    }
    const closing=e.target.closest('[data-sudden-opening]');
    const clockStart=e.target.closest('[data-do="final-count"],[data-do="clock-opening"]');
    if(clockStart)return startFinalCount(settings.mode==='local'?'local':'solo',settings.p1,settings.p2,clockStart.dataset.opening || true);
    if(e.target.closest('[data-do="swap-clock"]'))return startFinalCount(matchConfig.mode,matchConfig.p1,matchConfig.p2,matchConfig.finalCount==='chase'?'defend':'chase');
    if(closing){
      startClosingFight(closing.dataset.suddenOpening,settings.mode==='local'?'local':'solo',settings.p1,settings.p2);
      return;
    }
    if (e.target.closest('[data-do="last-stock-start"]')) {
      startMatch({ ...settings, form:lobbyForm(), coats:lobbyCoats, lastStockStart:true });
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
      story(key, () => showRoute(()=>showReels(key)), true);
      return;
    }
    const watch=e.target.closest('[data-watch-move]');
    if(watch)return showSpecialPreview({kind:document.querySelector('[data-guide-kind][aria-pressed=true]').dataset.guideKind,
      side:watch.dataset.watchMove,page,paused:backToPause});
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
    const action = e.target.closest('[data-do]')?.dataset.do;
    if(action==='camera-mode'){
      FightView.fixedCamera=settings.fixedCamera=!settings.fixedCamera;save();
      if(dialogType==='options')showOptions();
      else{view.draw($('game'),world,0,world.time,online.match?.confirmedWorld || world);showPause();}
      $('dialog-body').querySelector('[data-do=camera-mode]').focus();return;
    }
    const drill=e.target.closest('[data-spar-lesson]');
    if(spar && drill)return startFighterLesson(spar.kind,Number(drill.dataset.sparLesson),false,pausedFight());
    if(spar && action==='spar-card')return fighterSheet(spar.kind);
    if(action==='rulebook')return openRulebook();
    if(action==='stock-break-toggle'){
      settings.stockBreaks=!settings.stockBreaks;save();
      const button=e.target.closest('button');
      button.textContent='Pause after my KOs · '+(settings.stockBreaks?'On':'Off');
      button.setAttribute('aria-pressed',String(settings.stockBreaks));return;
    }
    if(action==='matchup-card')return page==='match'?showMatchup(matchConfig.openingMatchup,'result'):showMatchup(lobbyMatchup(),'rules');
    if(action==='handicap')return openRulebook(undefined,true);
    if(action==='corner-practice' && corner)return startCornerLesson();
    if(action==='field-card' && corner?.field)return openFieldCard();
    if(action==='stock-retry')return stockSheet({from:dialogType==='pause'?'pause':'result',slot:Number(e.target.closest('[data-stock-slot]').dataset.stockSlot),
      result:online.match?.confirmedWorld || world});
    if(action==='coach-fall'){
      const slot=Number(e.target.closest('[data-recovery-seat]').dataset.recoverySeat);
      const clip=latestFall(knockoutClips(online.match?.confirmedWorld || world),slot);
      if(clip)recoverySheet({clip,slot,from:dialogType==='pause'?'pause':'result'});
      return;
    }
    if(action==='corner-toggle' && corner){
      settings.cornerTips=!settings.cornerTips;save();
      renderCorner(getPads());showPause();$('dialog-body').querySelector('[data-do="corner-toggle"]').focus();return;
    }
    if(action==='pack-relay')return openRelay();
    if(action==='ledge-play')return startFinishTrial(finishTrial.start,finishTrial.slot,{...finishTrial.review,ledge:{...finishTrial.review.ledge,watch:false}});
    if(action==='trial-retry')return startFinishTrial(finishTrial.start,finishTrial.slot,finishTrial.review);
    if(action==='recovery-speed')return startFinishTrial(finishTrial.start,finishTrial.slot,{...finishTrial.review,guided:!finishTrial.review.guided});
    if(action==='landing-speed')return startFinishTrial(finishTrial.review.landing.start,finishTrial.slot,{...finishTrial.review,guided:false});
    if(action==='trial-replay' || action==='trial-results')return leaveFinishTrial(action==='trial-replay');
    if (action==='record-solo') {
      settings.mode='solo'; editing=0; save(); audioReady(); return toLobby();
    }
    const dog=e.target.closest('[data-bell-dog]');
    if (dog) {
      bellSheet(dog.dataset.bellDog);
      document.querySelector('[data-bell-dog][aria-pressed=true]').focus();
      return;
    }
    if (action==='bells-start') return startBells();
    const parcelDog=e.target.closest('[data-parcel-dog]');
    if(parcelDog){parcelSheet(parcelDog.dataset.parcelDog);document.querySelector('[data-parcel-dog][aria-pressed=true]').focus();return;}
    if(action==='parcel-sheet')return parcelSheet();
    if(action==='parcel-start')return startMatch({mode:'parcel',p1:parcelChoice,p2:'brisket',stage:'nightmail',coats:[savedCoat(0,parcelChoice),0]},seededRandom(37));
    if (action==='bells-sheet') return bellSheet();
    if (action==='watch-finish') return showFinishReplay();
    if(action==='instant-replay' && dialogType==='pause' && !online.match && finishTape?.length)
      return showFinishReplay(null,{instant:true,finish:true,from:'pause',result:world,clip:{tape:finishTape,losses:[]}});
    if(action==='ko-replays')return showKnockouts(dialogType==='pause'?'pause':'result');
    if(action==='watch-match')return watchMatch();
    if(action==='rematch-film'){
      const archived=dialogType==='record-card',id=archived?reviewCard.id:corner?.ticket;
      const back=()=>{if(archived)showMatchCard(0,records.get(id),id);else showResult();document.querySelector('[data-do=rematch-film]')?.focus();};
      let study;
      return waitForDispatch('Rematch film',async()=>{
        await loadDispatch('MatchReview');
        study=await window.MatchReview.rematchStudy(records,id,archived?null:finishTape,replayWrites);
      },()=>study.panel({showDialog,back,archived,trial:startFinishTrial}),back);
    }
    if (action==='clip-back') return exitDialog();
    const review=e.target.closest('[data-school-review]');
    if (review && matchConfig?.schoolFinal) return startLesson(schoolLessons.findIndex(l=>l.id===review.dataset.schoolReview),true);
    const saved = e.target.closest('[data-resume-id]');
    if (saved && dialogType==='saved-games') return resumeSavedGame(saved.dataset.resumeId);
    if (action==='school-cup') return cupSheet('pip');
    if (action==='rotation') return rotationBoard(!!matchConfig.tourneyRound);
    if (action==='fighter-classes') return fighterSheet(world?.lesson?.course || settings.p1);
    if (action === 'cup-sheet' && cupAttempt) return showCupSchedule();
    if (action === 'cup-return') return returnFromCupSchedule();
    if (action === 'cup-resume' || (action==='resume' && dialogType==='pause' && cupAttempt)) return dismiss();
    if (action === 'cup-roster') return cupSheet(cupAttempt?.kind || cupChoice);
    if (action === 'cup-start' || action === 'cup-next') return startCupRound(cupAttempt?.kind || cupChoice);
    if (action === 'match-card') return showMatchCard();
    if (action === 'card-back') return exitDialog();
    if(action==='rumble')return openRumble(dialogType);
    if(action==='stick-setup')return openStickSetup(dialogType);
    if(action==='couch-pads')return openCouchPads(dialogType);
    if(action==='pad-check')return controllerCheck(dialogType);
    if (action==='bindings') openLayouts(dialogType);
    if (action === 'practice') showPractice();
    if (action === 'rehearse') rehearsePosition();
    if (action === 'return-fight') returnToFight();
    if(action==='strike-set')return openStrikeSet();
    if(action==='strike-next'){
      if(localSet.pendingStrike)return showStrikeBoard(localSet.pendingStrike,localSet);
      if(world.mode==='local')return pickTogether();
      return beginStageStrike(matchConfig,localSet);
    }
    if (action === 'set-pick') {
      if(!online.match && world.mode==='local')return pickTogether();
      if(online.match && online.fighterPicks)return showRoomFighters();
      return chooseArena(true);
    }
    if(action==='room-stage')return chooseArena(true);
    if(action==='rematch-fighters')return showRoomFighters();
    if(action==='ready-fighter' && roomDraft && online.canRepick && !online.myVote) {
      const {kind,coat}=roomDraft;
      showResult();
      online.rematch(undefined,kind,coat);
      return;
    }
    if(action==='room-fighter-back')return showRoomFighters();
    const roomDog=e.target.closest('[data-room-dog]'), roomCoat=e.target.closest('[data-room-coat]');
    if(roomDraft && (roomDog || roomCoat)) {
      if(roomDog) {
        const kind=roomDog.dataset.roomDog, rival=online.roster[1-online.side];
        const color=roomDraft.colors[kind] ?? savedCoat(0,kind);
        roomDraft.kind=kind;
        roomDraft.coat=!online.canRepick && kind===rival.kind && color===rival.coat ? (color+1)%4 : color;
      } else roomDraft.coat=Number(roomCoat.dataset.roomCoat);
      roomDraft.colors[roomDraft.kind]=roomDraft.coat;
      sound('menu');return showRoomFighters(roomDog?'dog':'coat');
    }
    if (action === 'cpu-counterpick') startNextSetGame(localSet.cpuPick(world.dogs[1].kind));
    if (action === 'new-set') {
      if(matchConfig.stageStrikes)return beginStageStrike(matchConfig);
      const stage = localSet.games[0].stage;
      startMatch({...matchConfig, stage}, undefined, undefined, new StockSet(stage));
    }
    if (action === 'online-rematch') online.rematch();
    if (action === 'online-leave') showOnline();
    if (action === 'fullscreen') toggleFullscreen();
    if (action === 'home') showHome();
    if (action === 'route') showRoute();
    const pattern = e.target.closest('[data-boss-pattern]')?.dataset.bossPattern;
    if (pattern) return startBossPractice(pattern);
    if (action === 'boss-return') return leaveBossPractice();
    if (['depot-start','share-p1','share-p2'].includes(action)) return beginRun(yardChapter.lastRoom,0,null,null,null,action);
    if (action === 'dispatch-retry') beginRun(world.roomIndex, world.checkpoint, world.atCheckpoint);
    if (action === 'suspend-mission') return suspendMission();
    if (action === 'school-suspend') return suspendFirstFight();
    if (action === 'dispatch-rematch') beginRun(world.roomIndex, 0);
    if (['option-sound', 'option-shake', 'option-tiltStick','option-tiltStick2','option-flickJump1','option-flickJump2','option-quickAttack1','option-quickAttack2'].includes(action)) {
      const key = action.slice('option-'.length);
      settings[key] = !settings[key];
      if(key!=='sound' && key!=='shake'){
        profileTags[key.endsWith('2')?1:0]='';
        applyLayouts(true);
      }
      if (key === 'flickJump1' || key === 'flickJump2') flickJumpStates[key === 'flickJump1' ? 0 : 1] = {};
      save();
      updateAudio();
      audioReady();
      sound('menu');
      showOptions();
      document.querySelector('[data-do="' + action + '"]').focus();
    }
    if (action === 'resume' || action === 'close') exitDialog();
    if (action === 'resume-countdown') resumeLocalCountdown();
    if (action === 'lobby') toLobby();
    const pick=e.target.closest('[data-ledge-guard],[data-returner]');
    if(pick) {
      const side=page==='match' ? matchConfig?.wideReturn || matchConfig?.ledgeTrapStart : 'left';
      return startLedgeFight(page==='match'?world.dogs[0].kind:settings.p1,
        pick.dataset.returner || pick.dataset.ledgeGuard,side,!!pick.dataset.returner);
    }
    if (action === 'cpu-level') showCpuLevels();
    if(action==='landing-read')return startLandingRead(e.target.closest('[data-landing-read]').dataset.landingRead);
    if (action === 'shield-read-match') startShieldReadMatch();
    if (action === 'throw-read-perch' || action === 'throw-read-edge') startThrowRead(action.slice('throw-read-'.length));
    if (action === 'perch-fight') startPerchFight();
    if (['dash-back-bait','dash-back-watch','dash-back-delay'].includes(action)) startDashBack(action.slice('dash-back-'.length));
    if (action==='lift-fight')startLiftFight();
    if (action==='return-perch')startLiftFight(settings.p2,settings.p1,true);
    if (action === 'cut-off-clover') startCloverApproach();
    if (action === 'shield-read-set') startShieldReadMatch(true);
    if (action === 'rematch') {
      if(matchConfig.schoolFinal && world.end!==null)return startFirstFight(world.end===1?window.FightSchool.rematchLesson(world.matchCard).id:null,!!corner?.field);
      startMatch(matchConfig, undefined, soloSeed, localSet);
    }
    if (action === 'controls') showControls();
    if(action==='fetch-match')return startFetchMatch(settings.mode==='local'?'local':'solo');
    if(action==='drop-catch' || action==='defend-drop')return startDropCatch(action==='defend-drop');
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
      window.PracticeFeedback.survivalFeedback(world, 'survivalReady', {});
      $('damage-output').textContent = world.survivalPractice.baseline + '%';
    } else if (world.meteorPractice) {
      const m = world.meteorPractice;
      world.resetMeteorPractice(m.pattern, m.dir, m.slow, Number(e.target.value));
      window.PracticeFeedback.meteorFeedback(world, 'meteorReady', {});
      $('damage-output').textContent = world.meteorPractice.baseline + '%';
    } else if (d?.gripDrill) {
      if (d.spacing === 'gripThrow') world.setDummyDamage(e.target.value);
      world.resetEscapePractice(d.spacing, d.slow, Number(e.target.value));
      window.PracticeFeedback.escapeFeedback(world, {phase:'ready'});
      $('damage-output').textContent = e.target.value + '%';
    } else if (d?.spacing === 'counter') {
      world.resetEscapePractice('counter', d.slow, Number(e.target.value));
      $('recovery-tip').textContent = window.PracticeFeedback.crouchCounterPrompt(world);
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
  function grappleControls(match,grip) {
    if (grip.carry) return 'Move or jump · Aim + Grab to throw';
    const basic = 'Tap Attack to pummel · Aim to throw';
    return match.dogs[grip.owner].kit.shoulderCarry ? basic + ' · Special to carry' : basic;
  }
  let footworkCues=[];
  function loadFootworkCues(battle,exercise) {
    const current=()=>world===battle && world.footworkPractice===exercise;
    const flush=()=>{
      if(current())for(const e of footworkCues)window.PracticeDirectory.footworkFeedback(battle,e);
      if(current())footworkCues=[];
    };
    loadDispatch('PracticeDirectory').then(flush,()=>{
      if(current())waitForDispatch('Footwork readout',()=>loadDispatch('PracticeDirectory'),flush,()=>$('game').focus());
    });
  }
  const feedbackDrills = new Set(['freshness','launch','wall','shield','edge','footwork','wave','spacing','escape','platform','air','roll','climb','trump']);
  function drill(ledge, fromHang = false, pattern = 'strike', direction, study) {
    if (!world) return;
    if(feedbackDrills.has(ledge) && !window.PracticeFeedback){
      const fight=world;
      return waitForDispatch('Practice instructions',()=>loadDispatch('PracticeFeedback'),()=>{
        if(page==='match' && world===fight)drill(ledge,fromHang,pattern,direction,study);
      },()=>$('game').focus({preventScroll:true}));
    }
    if(ledge==='combo' && !window.ComboLab)return waitForDispatch('Combo practice',()=>loadDispatch('ComboLab'),
      ()=>drill(ledge,fromHang,pattern,direction,study),()=>$('game').focus());
    setFrameMode('live');
    const launch = ledge === 'launch';
    const breakaway = launch && pattern === 'breakaway';
    const juggle = launch && pattern === 'juggle';
    const baitSweep = launch && (pattern === 'bait' || pattern === 'baitBack');
    const readTech=launch && pattern==='readTech';
    const chase = launch && (pattern === 'attack' || pattern === 'defend' || baitSweep || readTech);
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
    if (chase) world.resetChasePractice(pattern, direction ?? world.chasePractice?.dir ?? 1, world.chasePractice?.slow ?? true,readTech?study:undefined);
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
    else if (footwork) {
      world.resetFootworkPractice(pattern,pattern==='bait'?1:direction ?? world.footworkPractice?.dir ?? 1,
        world.footworkPractice?.pattern!=='bait'?world.footworkPractice?.slow ?? true:true,study ?? world.footworkPractice?.worn ?? false);
      footworkCues=[];
      if(!window.PracticeDirectory)loadFootworkCues(world,world.footworkPractice);
    }
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
      study ?? (world.airPractice?.pattern === pattern ? world.dogs[0].kind : undefined));
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
    $('damage-control').hidden = stock || juggle || breakaway || (combo && pattern==='confirm') || (escape && pattern === 'carry');
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
      $('launch-read').setAttribute('aria-pressed',String(readTech));
      $('launch-response').hidden=!readTech;
      if(readTech)$('launch-response').textContent='Response · '+window.PracticeFeedback.techResponses[world.chasePractice.response];
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
      message=window.ComboLab.setup(world,drill,()=>world);
    } else if (wave) {
      const d = world.wavePractice;
      $('wave-back').setAttribute('aria-pressed', String(d.pattern === 'back'));
      $('wave-platform').setAttribute('aria-pressed', String(d.pattern === 'platform'));
      $('wave-slow').setAttribute('aria-pressed', String(d.slow));
      window.PracticeFeedback.waveFeedback(world);
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
      message=window.PracticeFeedback.spacingPanel(world,pattern,player,keyFor,padFor,settings,flickJumpTip);
    } else if (climb) {
      message=window.PracticeFeedback.climbPanel(world,pattern,practiceSide);
    } else if (platform) {
      message=window.PracticeFeedback.platformPanel(world,pattern,player);
    } else if (escape) {
      message=window.PracticeFeedback.escapePanel(world,pattern);
    } else if (edge) {
      message=window.PracticeFeedback.edgePanel(world,pattern,player,keyFor);
    } else if (footwork) {
      message=window.PracticeFeedback.footworkPanel(world,pattern,player,keyFor,footworkPatterns);
    } else if (wall) {
      message=window.PracticeFeedback.wallPanel(world,pattern,player);
    } else if (trump) {
      message=window.PracticeFeedback.trumpPanel(world,pattern,practiceSide);
    } else if (roll) {
      message=window.PracticeFeedback.rollPanel(world,pattern,practiceSide,practiceFight);
    } else if (air) {
      message=window.PracticeFeedback.airPanel(world,pattern,practiceSide);
    } else if (shield) {
      message=window.PracticeFeedback.shieldPanel(world,pattern,player);
    } else if (survival) {
      window.PracticeFeedback.survivalFeedback(world, 'survivalReady', {});
      message = $('recovery-tip').textContent;
    } else if (stock) {
      result.dataset.result = 'ready';
      result.textContent = 'Tap Attack to begin';
      message = pattern === 'stockReturn' ? 'Tap Down when the lift lights up. The rival will grab at your landing. Retry and stay aboard to compare.'
        : 'The rival will drop in front of you. Try an early grab, then retry and time it as the last mail tag goes out.';
    } else if (meteor) {
      window.PracticeFeedback.meteorFeedback(world, 'meteorReady', {});
      message = $('recovery-tip').textContent;
    } else if (chase) {
      result.dataset.result = 'ready';
      result.textContent = 'Tap Attack to begin';
      message = readTech ? 'Tap Attack to cue the fall. Chase the roll or cover the landing spot, then hit or grab as protection ends. Change Response to rehearse one option.' :
        baitSweep ? 'Tap Attack to start. Try waiting beside the rival, then retry and block their get-up attack. Tap Grab at the shield spark.' :
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
    if (ledge==='spacing' && pattern==='landing' && study==='flick') setFlickTrial(true);
    clearInput();
    updateHUD();
    $('game').focus({ preventScroll: true });
    announce($('recovery-tip').textContent);
  }
  // The original world is never stepped during a practice visit. Its CPU, shared grabs,
  // clock and best-of-three stay at the pause frame even if the practice fight ends.
  function pausedFight() {
    return practiceFight || {battle:world, view, config:matchConfig, seed:soloSeed, series:localSet, tape:finishTape,cupRound:cupAttempt,
      corner,spar,countdown, lastCount, call:$('countdown').textContent};
  }
  function rehearsePosition() {
    const visit = pausedFight();
    startMatch(visit.config, undefined, visit.seed, null, {visit});
  }
  function returnToFight() {
    const review=practiceFight?.review;
    if (review?.archived) {
      showHome(false);
      return showMatchCard(review.index,review.archived,review.id);
    }
    const finished=practiceFight?.returnResult, resume=finished || practiceFight;
    if (!resume) return;
    startMatch(resume.config, undefined, resume.seed, resume.series, {resume,cupRound:resume.cupRound});
    if (finished) {
      showResult();
      if(review)showMatchCard(review.index);
    }
  }
  function practiceFromCard(slot) {
    const review=reviewCard, {card,stage}=review.game;
    const tip=window.FightRecords.coaching(card,slot);
    if(!tip)return;
    const [fighter,rival]=[0,1].map(n=>{
      const seat=n?1-slot:slot;
      return (card.relayTeams && card.losses.findLast(l=>l.slot===seat)) || card.players[seat];
    });
    const visit={review,returnResult:review.archived?null:pausedFight()};
    startMatch({mode:'training',p1:fighter.kind,p2:rival.kind,stage,fetch:false,coats:[fighter.coat,rival.coat]},
      undefined,undefined,null,{visit});
    startExercise(tip.id);
  }
  function startExercise(id) {
    if (world.mode === 'solo') {
      const visit = pausedFight();
      startMatch({...visit.config, mode:'training', lastStockStart:false, suddenStart:false, fetch:false}, undefined, undefined, null, {visit});
    } else dismiss();
    if (id === 'reset-training' || id === 'partner-training') drill(id === 'partner-training' ? 'partner' : false);
    else if(id==='combo-compare')showComboComparison();
    else if (['wall-impact','wall-ceiling','wall-spring','wall-pip','wall-noodle'].includes(id)) drill('wall', false, world.wallPractice?.side || 'left', id.slice(5));
    else {
      // Freshness toolbar buttons toggle comparisons. A directory selection always starts the named test.
      if (id.startsWith('freshness-') && world.freshnessPractice) world.resetTraining();
      $(id).click();
    }
  }
  function showPractice(){
    const pauseMenu=dialogType==='pause';
    const open=()=>{
      backToPause=pauseMenu;
      window.PracticeDirectory.show(footworkPatterns,showDialog,startExercise);
    };
    if(window.PracticeDirectory && window.PracticeFeedback)return open();
    waitForDispatch('Find a drill', () => Promise.all([
      loadDispatch('PracticeDirectory'), loadDispatch('PracticeFeedback')
    ]), open, pauseMenu ? showPause : dismiss);
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
  function practiceTapes(hash=''){
    const active=!hash && world?.mode==='training';
    const back=()=>{dismiss();(active?$('game'):$('home-records')).focus({preventScroll:true});};
    if(!window.ComboLab)return waitForDispatch('Practice tapes',()=>loadDispatch('ComboLab'),()=>practiceTapes(hash),back);
    if(active && !world.comboPractice)drill('combo',false,'example');
    window.ComboLab.shelf(hash,active?world:null,showDialog,back,(card,source,slot)=>{
      leaveOnline();afterStory=null;
      startMatch({...settings,...card.config,dropAerials:!!card.config.dropAerials,heldAerials:!!card.config.heldAerials,dashSmash:!!card.config.dashSmash,impactTech:!!card.config.impactTech,risingCatch:!!card.config.risingCatch,wallSpring:!!card.config.wallSpring,groundSpace:!!card.config.groundSpace,mode:'training',fetch:false},undefined,undefined,null,{visit:active?practiceFight:null});
      window.ComboLab.restore(world,card);
      drill('combo',false,source,'stand',slot);
      if(world.comboPractice.slow!==card.slow)$('combo-slow').click();
    });
  }
  $('combo-tapes').onclick=()=>practiceTapes();
  function showComboComparison(){
    if(!window.ComboLab)return waitForDispatch('Compare defenses',()=>loadDispatch('ComboLab'),showComboComparison,showPractice);
    if(!world.comboPractice || $('combo-compare').hidden || $('combo-compare').disabled)drill('combo',false,'late','stand');
    window.ComboLab.compareSheet(world,showDialog,(source,reply,slot)=>{
      dismiss();drill('combo',false,source,reply,slot);
    },()=>{dismiss();$('combo-compare').focus({preventScroll:true});});
  }
  $('combo-compare').onclick=showComboComparison;
  $('combo-fight-pip').onclick = fightRivalPip;
  $('dash-pressure-fight').onclick=()=>startDashPressure(world.dogs[0].kind,world.dogs[1].kind,world.stage,world.form);
  for (const source of comboSources) $('combo-' + source).onclick = () => {
    if(source!=='throwChase')return drill('combo',false,source);
    if(world.comboPractice?.source!==source && !world.trainingDamage)world.setDummyDamage(95);
    drill('combo',false,source,world.comboPractice?.reply?.startsWith('di')?world.comboPractice.reply:'diMix');
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
  for (const pattern of ['lip','shortCatch','longCatch','tip','deep','corner','inside','light']) $('edge-' + pattern).onclick = () => drill('edge', false, pattern);
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
  $('footwork-worn').onclick = () => drill('footwork',false,'brace',world.footworkPractice.dir,!world.footworkPractice.worn);
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
  for (const role of ['runoff','escape']) $('trump-'+role).onclick=()=>drill('trump',false,role);
  $('trump-speed').onclick=()=>{
    const d=world.trumpPractice;
    d.slow=!d.slow; $('trump-speed').setAttribute('aria-pressed',String(d.slow));
  };
  $('trump-fight').onclick=()=>{
    const {side,guardSlot}=world.trumpPractice;
    startRunoffFight(side,world.dogs[1-guardSlot].kind,world.dogs[guardSlot].kind,world.stage,world.form);
  };
  function startRunoffFight(side,p1,p2,stage,form) {
    leaveOnline(); afterStory=null;
    startMatch({...settings,mode:'solo',p1,p2,stage,form,cpuLevel:'rival',stockCount:3,timeBattle:false,
      fetch:false,minutes:7,runoffTrump:side},undefined,42);
  }
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
  $('roll-scout').onclick = () => drill('roll',false,'scout');
  $('roll-fight').onclick=()=>{
    const d=world.rollPractice;
    if(d?.pattern!=='scout' || d.rollHabit?.count!==2 || practiceFight)return;
    const [p1,p2]=world.dogs.map(f=>f.kind),coats=world.dogs.map((_,i)=>world.coatFor(i));
    startMatch({...settings,p1,p2,coats,stage:world.stage,form:world.form,mode:'solo',cpuLevel:'rival',fetch:false,stockCount:3,
      timeBattle:false,minutes:7,scoutedRoll:{side:d.side,delay:d.rollHabit.delay}});
  };
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
  $('launch-read').onclick=()=>drill('launch',false,'readTech');
  $('launch-response').onclick=()=>{
    const options=Object.keys(window.PracticeFeedback.techResponses),d=world.chasePractice;
    drill('launch',false,'readTech',d.dir,options[(options.indexOf(d.response)+1)%options.length]);
  };
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
  const wallMode = () => world.wallPractice.spring ? 'spring' : world.wallPractice.ceiling ? 'ceiling' : world.wallPractice.heavy ? 'impact' : world.wallPractice.runner;
  $('wall-guide').onclick=()=>{
    world.wallPractice.guided=!world.wallPractice.guided;
    drill('wall',false,world.wallPractice.side,'spring');
  };
  $('wall-impact').onclick = () => drill('wall', false, world.wallPractice.side, world.wallPractice.heavy ? '' : 'impact');
  $('wall-retry').onclick = () => drill('wall', false, world.wallPractice.side, wallMode());
  for (const kind of ['pip','noodle','ceiling','spring']) $('wall-'+kind).onclick = () => drill('wall', false, world.wallPractice.side, kind);
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
  $('air-highReturn').onclick = () => drill('air', false, 'highReturn');
  $('air-dog').onchange = e => drill('air', false, world.airPractice.pattern, undefined, e.target.value);
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
    const opening = pattern === 'highReturn' ? {highReturn:side} :
      pattern === 'interrupted' ? {interruptedReturn:{side,slot}} : {dodgeReturn:{side,wide}};
    startMatch({...settings, mode:'solo', p1:slot ? guard.kind : returner.kind, p2:slot ? returner.kind : guard.kind,
      cpuLevel:'rival', stage:world.stage, form:world.form, fetch:false, minutes:7, stockCount:3, timeBattle:false, ...opening}, undefined, 42);
  }
  $('air-fight').onclick = () => fightRecovery(1);
  $('air-return-fight').onclick = () => fightRecovery(0);
  $('air-side').onclick = () => {
    practiceSide = practiceSide === 'left' ? 'right' : 'left';
    drill('air', false, world.airPractice.pattern);
  };
  const [yardChapter, nightChapter] = window.DispatchScript.chapters;
  let campaign = yardChapter;
  const dispatchSources={
    SoloEvents:'solo-events.js?v=impact-tech-1',
    PracticeFeedback:'practice-feedback.js?v=platform-drop-1', DogOnline:'online.js?v=drop-aerial-1',
    LessonGuide:'lesson-guide.js?v=button-check-1',
    YardScore:'score.js?v=stage-music-1',
    StageMusic:'stage-music.js?v=1',
    RecoveryCoach:'recovery-coach.js?v=launch-aim-1', MatchReview:'match-review.js?v=second-chance-1',
    StockCall:'stock-call.js?v=finish-call-1', BellBreak:'bell-break.js?v=course-result-1',
    FightCamera:'fight-camera.js?v=finish-shot-1',
    FighterEntrances:'fighter-entrances.js?v=1',
    PadFeedback:'pad-feedback.js?v=depot-duo-1',StickCalibration:'stick-calibration.js?v=1',CouchControllers:'couch-controllers.js?v=1',
    PlayerProfiles:'player-profiles.js?v=rumble-1',
    VersusRulebook:'versus-rules.js?v=cup-finish-1',
    PackRelay:'pack-relay.js?v=versus-2',
    WinnerStays:'winner-stays.js?v=tourney-1',LocalTournament:'tournament.js?v=set-resume-1', CouchSelect:'couch-select.js?v=shared-roster-1',StageStrike:'stage-strike.js?v=arena-board-1',
    ComboLab:'combo-lab.js?v=drop-aerial-1', FinishTools:'finish-tools.js?v=second-chance-1',
    MoveGuide:'move-guide.js?v=rising-catch-1', FighterSchool:'fighter-lessons.js?v=field-card-1',
    DispatchCovers:'dispatch-covers.js?v=disc-range-1', DispatchFilm:'dispatch-film.js?v=film-area-1',
    DispatchActors:'dispatch-actors.js?v=missions-1', YardArt:'yard-art.js?v=letter-lift-1',
    DispatchBridge:'dispatch-bridge.js?v=missions-1', DispatchRun:'dispatch-run.js?v=stock-share-1', DispatchView:'dispatch-view.js?v=cup-counter-1',
    ParcelPunt:'parcel-punt.js?v=1', DispatchSuspend:'dispatch-suspend.js?v=depot-practice-1', PracticeDirectory:'practice-directory.js?v=training-topics-1',
  };
  const dispatchLoads=new Map();
  let versusStylesheet, versusStyled=false;
  function loadVersusPanel(part) {
    if(!versusStylesheet){
      versusStylesheet=new Promise((resolve,reject)=>{
        const link=document.createElement('link');
        link.rel='stylesheet';
        link.href='./versus-select.css?v=cup-schedule-1';
        link.onload=()=>{versusStyled=true;resolve();};
        link.onerror=()=>{
          link.remove();versusStylesheet=null;
          reject(new Error('Could not load the versus selection board'));
        };
        document.head.append(link);
      });
    }
    return Promise.all([loadDispatch(part),versusStylesheet]);
  }
  function loadDispatch(part) {
    if(part==='StageMusic' && !window.YardScore)return loadDispatch('YardScore').then(()=>loadDispatch(part));
    if(window[part])return Promise.resolve();
    if(!dispatchLoads.has(part)){
      const task=new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='./'+dispatchSources[part];
        const failed=()=>{script.remove();reject(new Error('Could not load '+part));};
        script.onload=()=>window[part]?resolve():failed();
        script.onerror=failed;
        document.head.append(script);
      });
      dispatchLoads.set(part,task.finally(()=>dispatchLoads.delete(part)));
    }
    return dispatchLoads.get(part);
  }
  FightView.prepare=()=>loadDispatch('FightCamera').catch(()=>{});
  const missionParts=['DispatchActors','YardArt','DispatchBridge','DispatchRun','DispatchView'];
  const missionReady=()=>missionParts.every(part=>window[part]);
  const loadMission=()=>Promise.all(missionParts.map(loadDispatch));
  function waitForDispatch(title,load,enter,back) {
    showDialog('dispatch-load',title,'<p role="status" id="dispatch-loading">Loading…</p><div class="dialog-actions">'+
      '<button class="primary" id="dispatch-load-retry" hidden>Retry</button><button class="utility" id="dispatch-load-back">Back</button></div>',false);
    const cancel=$('dispatch-load-back'), retry=$('dispatch-load-retry');
    cancel.onclick=()=>{dismiss();back();};
    cancel.focus({preventScroll:true});
    function attempt(){
      retry.hidden=true;
      $('dispatch-loading').textContent='Loading…';
      load().then(()=>{
        if(cancel.isConnected && $('dialog').open){dismiss();enter();}
      },()=>{
        if(!cancel.isConnected || !$('dialog').open)return;
        $('dispatch-loading').textContent=title+' could not load.';
        retry.hidden=false;retry.focus({preventScroll:true});
      });
    }
    retry.onclick=attempt;
    attempt();
  }
  let storage;
  try {
    storage = window.localStorage;
  } catch {}
  const records=new window.FightRecords.Book(storage);
  const chapterSaves = new Map(window.DispatchScript.chapters.map(book=>[book, book.readSave(storage)]));
  const nightUnlocked = () => chapterSaves.get(yardChapter).complete && !chapterSaves.get(yardChapter).pending;
  if (nightUnlocked()) campaign = nightChapter;
  let progress = chapterSaves.get(campaign),
    stored = !!storage;
  let liftBest=null;
  function selectChapter(book) {
    campaign = book;
    progress = chapterSaves.get(book);
  }
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
    progress = {...campaign.record(progress, event),playedAt:Date.now()};
    chapterSaves.set(campaign, progress);
    try {
      storage.setItem(campaign.saveKey, JSON.stringify(progress));
      stored = true;
    } catch {
      stored = false;
    }
  }
  const countMarks = (bits) => campaign.rooms.filter((_, i) => bits & (1 << i)).length;
  function menuScreen(id, keepRoom = false) {
    if(id==='online-lobby' && !$('online-sheet')){
      const link=document.createElement('link');link.id='online-sheet';link.rel='stylesheet';link.href='./online.css?v=lobby-1';
      link.onerror=()=>link.remove();document.head.append(link);
    }
    corner=spar=null;
    finishTrial=null;
    finishTape=null;
    cupAttempt = null;
    localSet = null;
    practiceFight = null;
    $('match-set').hidden = true;
    if (!keepRoom) leaveOnline();
    film?.score.silence();
    film = null;
    dismiss();
    world = null;
    view = null;
    if(page==='cup-select' && page!==id)$('cup-select').replaceChildren();
    page = id;
    drillSide = null;
    drillWaiting = false;
    document.body.classList.remove('playing', 'training-active', 'adventure-active', 'with-drill-readout');
    document.body.classList.add('menu-screen');
    document.body.classList.toggle('cinema-active', id === 'dispatch-story');
    for (const screen of ['home', 'cup-select', 'online-lobby', 'dispatch-route', 'dispatch-story', 'lobby', 'match'])
      $(screen).hidden = screen !== id;
    window.scrollTo(0, 0);
  }
  let missionSaves=[],savesRead=0;
  async function readSavedTournament(required=false){
    let storedTournament;
    try{storedTournament=sessionStorage.getItem('dog-fight-3.tournament.1');}catch{return;}
    try{
      if(savedEvents.LocalTournament || !storedTournament)return;
      await loadDispatch('LocalTournament');
      rotationStorage=sessionStorage;
      savedEvents.LocalTournament??=window.LocalTournament.Lineup.read(rotationStorage);
      if(page==='home' && savedEvents.LocalTournament){
        const welcome=document.activeElement===$('welcome-play');
        refreshHomeSaves();
        if(welcome && $('school-welcome').hidden)focusHome();
      }
    }catch(error){if(required)throw error;}
  }
  async function readMissionSaves(required=false){
    const read=++savesRead;
    try{
      if(!window.DispatchSuspend){
        if(!window.indexedDB || (indexedDB.databases && !(await indexedDB.databases()).some(db=>db.name==='dog-fight-3.suspended')))return;
        await loadDispatch('DispatchSuspend');
      }
      const rows=await window.DispatchSuspend.list();
      if(read===savesRead){missionSaves=rows;if(page==='home')refreshHomeSaves();}
    }catch(error){if(required)throw error;}
  }
  async function suspendMission(){
    if(!window.DispatchSuspend)return waitForDispatch('Suspend mission',()=>loadDispatch('DispatchSuspend'),suspendMission,showPause);
    const fight=world;
    showDialog('mission-saving','Saving mission','<p role="status">Saving this fight…</p>',false);
    try{
      await window.DispatchSuspend.save(fight);
    }catch{
      showPause();
      $('dialog-body').insertAdjacentHTML('afterbegin','<p role="alert">This browser could not save the fight. You can keep playing or try again.</p>');
      return;
    }
    await readMissionSaves();
    showHome();
  }
  function saveFirstPosition(position){
    const slot=schoolRuns.get(position.battle);
    const save=()=>{
      if(!slot || slot.finished || position.battle.end!==null)return Promise.resolve();
      const key=position.tape.count+'/'+position.countdown;
      if(slot.key===key)return slot.pending;
      const record=window.DispatchSuspend.schoolCapture(position);
      slot.key=key;
      slot.pending=window.DispatchSuspend.writeSchool(slot,record).then(()=>{
        if(page==='home')return readMissionSaves();
      }).catch(error=>{
        if(slot.key===key)slot.key=null;
        throw error;
      });
      return slot.pending;
    };
    return window.MatchReview && window.DispatchSuspend?Promise.resolve().then(save):
      Promise.all(['DispatchSuspend','MatchReview'].map(loadDispatch)).then(save);
  }
  async function suspendFirstFight(){
    const position=pausedFight();
    showDialog('mission-saving','Saving first match','<p role="status">Saving this fight…</p>',false);
    try{await saveFirstPosition(position);}
    catch(error){
      showPause(false);
      const alert=document.createElement('p');alert.setAttribute('role','alert');
      alert.textContent=error.message==='Another tab has a newer first match.'?error.message:
        'This browser could not save your fight. Keep playing or try again.';
      $('dialog-body').prepend(alert);return;
    }
    await readMissionSaves();showHome();
  }
  function resumeFirstPosition(){
    let resume;
    waitForDispatch('Resume first match',async()=>{
      await Promise.all(['DispatchSuspend','MatchReview'].map(loadDispatch));
      resume=window.DispatchSuspend.schoolPosition(await window.DispatchSuspend.load('school-stock'));
      if(resume.corner.field)await loadDispatch('FighterSchool');
    },()=>{
      leaveOnline();afterStory=null;
      startMatch(firstFightConfig(resume.corner.target?.id,!!resume.corner.field),undefined,resume.checkpoint.openingSeed,null,{resume});
      if(settings.stockBreaks && world.dogs[0].stockLift?.time===0)return showStockBreak();
      showDialog('pause','First match ready','<p>'+window.DispatchSuspend.schoolCard(resume.checkpoint.header).detail+'</p>'+
        '<div class="dialog-actions"><button class="primary" data-do="resume">Resume fight</button></div>');
      document.querySelector('[data-do=resume]').focus();
    },showHome);
  }
  function resumeMission(id){
    let record;
    waitForDispatch('Resume mission',async()=>{
      [record]=await Promise.all([window.DispatchSuspend.load(id),loadMission()]);
    },()=>{
      const h=record.header;
      selectChapter(window.DispatchScript.chapters[h.chapter-1]);
      beginRun(h.room,record.state.checkpoint,record.state.atCheckpoint,null,record);
    },showHome);
  }
  function showHome(focus = true) {
    menuScreen('home');
    if (!$('home').querySelector('[data-opening]')) $('opening-choice').textContent='';
    const pendingPin=syncHomePin();
    afterStory = null;
    if (!schoolUnsaved) Object.assign(schoolSave,readSchool());
    refreshHomeSaves();
    if (!$('home-continue').hasAttribute('data-opening')) {
      readMissionSaves();
      readSavedTournament();
    }
    if (focus) {
      focusHome();
      pendingPin?.then(()=>{if(page==='home' && !$('dialog').open && document.activeElement===$('home-adventure'))focusHome();});
    }
  }
  function focusHome() {
    const id = !$('home-saves').hidden ? 'home-continue' : !$('school-welcome').hidden ? 'welcome-play' :
      !$('home-pin').hidden?'pin-play':'home-adventure';
    $(id).focus({preventScroll:true});
  }
  function savedGames() {
    const items=missionSaves.slice();
    const event=savedEvents.LocalTournament?.continueCard();
    if(event)items.push(event);
    if (!items.some(s=>s.id==='school-stock') && schoolSave.started && (schoolSave.rematch || schoolSave.passed.length<schoolLessons.length || !schoolSave.firstFightDone)) {
      const index=unfinishedLesson(), final=index<0;
      const r=schoolSave.rematch;
      items.push({id:'school',title:'Fight School',kind:'pip',playedAt:schoolSave.playedAt,
        detail:r?(r.fight?'Rematch Brisket':'Rematch practice')+' · '+schoolLessons.find(l=>l.id===r.id).title:
          final?'First stock match · Pip vs. Rookie Brisket':'Lesson '+(index+1)+' · '+schoolLessons[index].title,
        action:r?(r.fight?'Play match':'Practice'):final?'Play match':'Continue'});
    }
    const book = nightUnlocked() ? nightChapter : yardChapter, saved = chapterSaves.get(book);
    if ((saved.started || book===nightChapter) && (!saved.complete || saved.pending)) {
      const room=book.rooms[saved.room];
      items.push({id:'adventure',title:book===yardChapter?'The Last Dispatch':book.title,kind:book.chapterFighter,
        playedAt:saved.playedAt || chapterSaves.get(yardChapter).playedAt,
        detail:saved.pending ? 'Cutscene · '+book.scenes[saved.pending].title : !saved.started ? 'Chapter 02 · Play as Clover' :
          room.name+(saved.checkpoint?' · '+room.checkpoints[saved.checkpoint-1].name:' · '+room.type),
        action:saved.pending?'Watch':saved.started?'Continue':'Begin'});
    }
    for (const [kind,course] of Object.entries(cup.courses)) {
      const entry=cupEntry(kind), run=entry.active;
      if (!run) continue;
      const round=run.wins.length, opponent=course.bouts[round]?.[0];
      items.push({id:kind,title:fighters[kind].name+'’s Arcade Cup',kind,coat:run.coat,playedAt:entry.playedAt,
        detail:'Round '+(round+1)+' of 4 · '+(opponent?fighters[opponent].name:'Copper Hound'),action:run.started?'Retry round':'Continue'});
    }
    return items.sort((a,b)=>(b.playedAt||0)-(a.playedAt||0));
  }
  function refreshHomeSaves() {
    const games=savedGames(), item=games[0];
    $('home-chapter').textContent=nightUnlocked()?'Chapter 02 · The Night Mail':'Chapter 01 · The Silent Yard';
    $('home-saves').hidden=!item;
    $('school-welcome').hidden=!!item || schoolSave.seen;
    $('home').classList.toggle('has-welcome',!$('school-welcome').hidden);
    $('home').classList.toggle('has-saves',!!item);
    if (!item) return;
    $('home-continue').dataset.save=item.id;
    $('continue-dog').src=portrait(item.kind,item.coat);
    $('continue-dog').hidden=false;
    $('continue-title').textContent=item.title;
    $('continue-detail').textContent=item.detail;
    $('continue-action').textContent=item.action;
    $('other-saves').hidden=games.length<2;
  }
  function showSavedGames() {
    const games=savedGames();
    if (!games.length) return showHome();
    showDialog('saved-games','Saved games','<div class="saved-games">'+games.map(g=>
      '<button data-resume-id="'+g.id+'"><img alt="" src="'+portrait(g.kind,g.coat)+'"><span><strong>'+g.title+
      '</strong><small>'+g.detail+'</small></span><b>'+g.action+'</b></button>').join('')+'</div>');
    document.querySelector('[data-resume-id]').focus();
  }
  function resumeLatest() {
    waitForDispatch('Continue saved game', () => Promise.all([readMissionSaves(true), readSavedTournament(true)]), () => {
      const latest = savedGames()[0];
      if (latest) return resumeSavedGame(latest.id);
      showHome();
      $('opening-choice').textContent='No saved game to resume.';
    }, () => showHome());
  }
  function resumeSavedGame(id) {
    if (!savedGames().some(g=>g.id===id)) return showHome();
    if(id==='tournament'){settings.mode='local';editing=0;toLobby();return rotationBoard(true);}
    if (id==='school-stock')return resumeFirstPosition();
    if (missionSaves.some(s=>s.id===id))return resumeMission(id);
    if (id==='school'){
      let checkpoint=false;
      try{checkpoint=storage.getItem('dog-fight-3.stock-ready')==='1';}catch{}
      if(!checkpoint)return resumeCourse();
      return readMissionSaves().then(()=>{
        if(page==='home')missionSaves.some(s=>s.id==='school-stock')?resumeFirstPosition():resumeCourse();
      });
    }
    if (id==='adventure') { selectChapter(nightUnlocked()?nightChapter:yardChapter); return continueAdventure(); }
    // Use the route card's checked transaction, including its cross-tab retry guard.
    cupSheet(id,false,true);
  }
  $('home-continue').onclick=()=>resumeSavedGame($('home-continue').dataset.save);
  $('other-saves').onclick=showSavedGames;
  function showRoute(then) {
    menuScreen('dispatch-route');
    afterStory = null;
    if(!window.DispatchCovers)return waitForDispatch('Route map',()=>loadDispatch('DispatchCovers'),()=>showRoute(then),()=>showHome());
    window.DispatchCovers.routeBoard(campaign,progress,{stored,portrait,canSwitch:nightUnlocked(),marks:countMarks(progress.stamps)});
    if(then)then();
  }
  function showReels(selected = campaign.rooms[0].intro) {
    window.DispatchCovers.reelShelf(campaign,progress,selected,showDialog);
  }
  async function story(key, then, fromLibrary = false) {
    menuScreen('dispatch-story');
    afterStory = then;
    inLibrary = fromLibrary;
    const scene = campaign.scenes[key];
    $('story-cover').setAttribute('aria-label', scene.title + ' animated cutscene');
    $('story-title').textContent = scene.title;
    $('story-map').textContent = fromLibrary ? 'Cutscenes' : 'Route map';
    $('story-skip').hidden = fromLibrary;
    $('story-next').onclick = () => film?.next();
    const needsActors = ['rescue','boss','ending'].includes(key) && !window.DispatchActors;
    const loading=!window.DispatchFilms?.[key] || !window.DispatchFilm || needsActors;
    if (loading) {
      $('film-time').textContent = '';
      $('film-progress').style.transform = 'scaleX(0)';
      $('story-speaker').textContent = '';
      $('story-text').textContent = 'Loading cutscene…';
      $('story-next').textContent = 'Next';
      $('film-pause').disabled = $('story-next').disabled = true;
      $('story-title').focus({preventScroll:true});
      try {
        await loadDispatch('DispatchCovers');
        if (page!=='dispatch-story' || afterStory!==then) return;
        window.DispatchCovers.draw($('story-cover'),key);
        const assets = [loadDispatch('DispatchFilm'),window.DispatchCovers.loadFilm(key)];
        if (needsActors) assets.push(loadDispatch('DispatchActors'));
        await Promise.all(assets);
      }
      catch {
        if (page!=='dispatch-story' || afterStory!==then) return;
        $('story-text').textContent = 'The cutscene could not load.';
        $('story-next').disabled = false;
        $('story-next').textContent = 'Retry cutscene';
        $('story-next').onclick = () => story(key,then,fromLibrary);
        return;
      }
      if (page!=='dispatch-story' || afterStory!==then) return;
    }
    $('film-pause').disabled = $('story-next').disabled = false;
    film = new window.DispatchFilm(
      $('story-cover'), key, scene.pages.length,
      () => ({ context: audioContext, volume: settings.sound ? settings.volume / 100 : 0 }),
      (part) => showStoryPage(key, part),
      (time, duration) => {
        $('film-progress').style.transform = 'scaleX(' + time / duration + ')';
        const label = '0:' + String(Math.floor(time)).padStart(2, '0') + ' / 0:' + duration;
        if ($('film-time').textContent !== label) $('film-time').textContent = label;
      }, finishStory, window.DispatchFilm.area,
    );
    updateFilmButton();
    // A story film leads straight into its mission. Library screenings end on the reel shelf.
    if(!fromLibrary && !scene.completesChapter && !missionReady())loadMission().catch(()=>{});
    if(!loading || document.activeElement===$('story-title'))
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
    showRoute(showChapterClear);
  }
  function showChapterClear() {
    const night = campaign===nightChapter;
    window.DispatchCovers.chapterClear(campaign,night,countMarks(progress.stamps),portrait,showDialog);
    if (!night) {
      $('next-chapter').onclick=()=>{selectChapter(nightChapter);showRoute();};
      $('next-chapter').focus();
    } else document.querySelector('[data-do=close]').focus();
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
  function liftScore(clear) {
    return stockLabel(clear.stocks)+' left · '+cardTime(clear.frames)+'.'+String(Math.floor(clear.frames%60*100/60)).padStart(2,'0');
  }
  function showLiftTicket(clear) {
    const bonus=yardChapter.bonus, open=yardChapter.liftUnlocked(progress);
    const bridge=yardChapter.rooms[bonus.stampRoom], checkpoint=progress.room>bonus.stampRoom?bridge.checkpoints.length:progress.checkpoint;
    liftBest=yardChapter.liftBest(storage,null,liftBest);
    const label=open?(clear?'Ride again':'Ride the lift'):progress.room>=bonus.stampRoom?
      'Search '+(checkpoint?bridge.checkpoints[checkpoint-1].name:bridge.name):progress.started?'Continue chapter':'Begin chapter';
    window.DispatchCovers.liftTicket(bonus,open,label,clear && liftScore(clear),liftBest && liftScore(liftBest),showDialog);
    $('lift-enter').onclick=()=>open?beginRun(bonus.id,0):progress.room>=bonus.stampRoom?enterStop(bonus.stampRoom,checkpoint):continueAdventure();
    $('lift-enter').focus();
  }
  function beginRun(index, checkpoint, atCheckpoint = null, cupRound = null, suspended = null, doubles = false) {
    corner=spar=null;
    const book = cupRound || doubles ? yardChapter : campaign;
    const sideRoute=book.bonus?.id===index, mission=sideRoute?book.bonus:book.rooms[index];
    if(sideRoute && !suspended && !book.liftUnlocked(progress))return showRoute(()=>showLiftTicket());
    if(!missionReady())return waitForDispatch(mission.name,loadMission,
      ()=>beginRun(index,checkpoint,atCheckpoint,cupRound,suspended,doubles),()=>doubles?toLobby():cupRound?cupSheet(cupRound.kind):showRoute());
    finishTape=null;
    cupAttempt = cupRound;
    music?.restart();
    dismiss();
    $('pause-label').textContent = 'Pause';
    $('countdown').classList.remove('net-lag', 'sudden');
    $('cup-select').replaceChildren();
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
      'cup-select',
      'online-lobby',
      'match-set',
      'dispatch-route',
      'dispatch-story',
      'lobby',
      'training-tools',
      'match-clock',
      'school-coach',
      'corner-tip',
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
    const story=!cupRound && !doubles;
    if (story && !sideRoute && !suspended) saveProgress({ room: index, checkpoint, pending: '' });
    if (doubles) {
      const pads=getPads();
      matchConfig={...settings,rallySeat:['share-p1','share-p2'].indexOf(doubles),coats:lobbyCoats.slice(),couchSeats:lobbySeats || new controls.Seats(pads)};
      matchConfig.couchSeats.beginMatch(pads);
      clearInput();
    }
    $('blast-radar').hidden = true;
    view = new window.DispatchView();
    view.shakeEnabled = settings.shake;
    noticeUntil = 0;
    $('dispatch-notice').hidden = true;
    const cues=view.missionCues({tone,sound:fightSound,dispatchNotice,stockLabel,mission,sideRoute,cupRound,
      unlockLift:book.bonus?.stampRoom===index,stored:()=>stored,rivalName:()=>world.foes[0].f.stats.name});
    world = new window.DispatchRun({ chapter:book.number, room: index, checkpoint, atCheckpoint, stamps: cupRound ? 0 : progress.stamps,
      cupFighter:cupRound?.kind,coat:cupRound?.coat,duo:doubles?matchConfig:null }, (name, e) => {
      if(story && name==='dispatchCheckpoint')saveProgress({room:index,checkpoint:e.checkpoint,atCheckpoint:e.atCheckpoint});
      if(story && name==='dispatchStamp')saveProgress({room:index,stamp:index});
      cues(name,e);
    });
    $('match-mode').textContent = world.rally?'Last-stock rally':doubles?'Bell Depot doubles':sideRoute?'Bonus dispatch · Relay':cupRound ? 'Arcade Cup · Final boss' : 'Mission 0' + (index + 1) + ' · ' + world.layout.type;
    if(suspended){
      window.DispatchSuspend.restore(world,suspended);
      Object.defineProperty(world,'suspendHeader',{value:suspended.header});
    }
    $('match-stage').textContent = world.layout.name;
    $('runner-portrait').src = portrait(world.dogs[0].kind,world.coatFor(0));
    $('runner-name').textContent = world.dogs[0].stats.name;
    updateDispatchHUD();
    view.draw($('game'), world, 0, world.time);
    $('game').focus({ preventScroll: true });
    window.scrollTo(0, 0);
    announce((doubles?'Co-op boss fight · ':cupRound ? 'Arcade Cup final · ' : 'Adventure · ') + world.layout.name);
    if(suspended){
      showDialog('pause','Mission ready','<p>'+world.layout.name+' · '+stockLabel(world.dogs[0].stocks)+' · '+tenth(world.dogs[0].damage)+'%</p><div class="dialog-actions"><button class="primary" data-do="resume">Resume fight</button></div>');
      $('dialog-body').querySelector('[data-do=resume]').focus();
    }
  }
  function startBossPractice(move) {
    if (world?.layout?.rules !== 'boss' || cupAttempt) return;
    const parked = view.parkedBoss || {world, view, noticeUntil, notice:$('dispatch-notice').textContent, mode:$('match-mode').textContent};
    const lessonView = new window.DispatchView();
    const lesson = parked.world.rehearseBoss(move, lessonView.missionCues({tone,sound:fightSound,dispatchNotice,stockLabel,mission:world.layout}));
    if (!lesson) return;
    world = lesson;
    view = lessonView;
    view.parkedBoss = parked;
    view.shakeEnabled = settings.shake;
    $('match-mode').textContent = 'Bell Depot · Boss practice';
    $('dispatch-notice').hidden = true;
    noticeUntil = 0;
    adventureKey = '';
    dismiss();
    updateDispatchHUD();
    view.draw($('game'), world, 0);
    announce('Boss practice · '+world.objective);
  }
  function leaveBossPractice() {
    const parked = view?.parkedBoss;
    if (!parked) return;
    world = parked.world;
    view = parked.view;
    if (world.finished) return beginRun(world.roomIndex, world.checkpoint, world.atCheckpoint);
    $('match-mode').textContent = parked.mode;
    $('dispatch-notice').textContent = parked.notice;
    noticeUntil = parked.noticeUntil;
    $('dispatch-notice').hidden = !noticeUntil;
    adventureKey = '';
    dismiss();
    updateDispatchHUD();
    view.draw($('game'), world, 0);
    announce('Bell Depot resumed');
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
    const hero = world.dogs[0], foes = world.foes;
    const recovery = world.bridge || hero.absent ? null : offstageOptions(hero, world.terrain);
    const grip = world.grapple;
    const order = !grip || grip.phase === 'throw' || world.team ? world.objective : grip.owner === 0
      ? grappleControls(world,grip) : 'Grabbed · Tap action buttons to escape';
    const offer=world.stockOffer, jump=offer && (seatPad(offer.seat)?padFor(offer.seat,'jump'):
      !offer.seat && matchMedia('(pointer:coarse)').matches?'Jump':keyFor(offer.seat,'jump'));
    const key = [world.roomIndex, world.wave, hero.stocks, tenth(hero.damage), world.stamps, order, recovery,jump,offer?.held,offer?.release,
      world.team?.[1].stocks,world.team && tenth(world.team[1].damage),...foes.flatMap((e) => [e.f.stocks, tenth(e.f.damage), e.hp])].join('|');
    if (key === adventureKey) return;
    adventureKey = key;
    const marks=world.bossLesson?'Practice · Avoid the hit, then counter':world.sideRoute?'Noodle / Brisket / Clover':cupAttempt ? 'Arcade Cup · Round 4 / 4' :
      'Postmarks ' + countMarks(world.stamps) + ' / ' + campaign.rooms.length;
    window.DispatchView.updateScoreboard(world,recovery,order,marks,{$,tenth,showPercent,showStocks,recoveryStrip,jump});
  }
  function showPercent(element, damage) {
    const css='percentage' + (damage >= 110 ? ' danger' : damage >= 65 ? ' high' : '');
    if(element.className!==css)element.className=css;
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
      if (cupAttempt) world.matchFrames++;
      world.step(1 / 60, input, world.team ? playerInput(1,pads,2) : idleInput);
      taps.clear();
      touchTaps.clear();
      accumulator -= 1 / 60;
    }
    updateDispatchHUD();
    view.draw($('game'), world, dt, world.time);
    if (world.team && world.finished) return window.DispatchView.duoPanel(world,showDialog);
    if (world.bossLesson && world.finished) return window.DispatchView.lessonPanel(world,view.parkedBoss.world,showDialog);
    if (cupAttempt && world.finished) return cupResult(world.finished==='exit');
    if (world.finished === 'exit') {
      if(world.suspendHeader)window.DispatchSuspend.clear(world.suspendHeader).then(readMissionSaves).catch(()=>{});
      if(world.sideRoute){
        const clear={stocks:world.dogs[0].stocks,frames:world.runFrames};
        liftBest=yardChapter.liftBest(storage,clear,liftBest);
        return showRoute(()=>showLiftTicket(clear));
      }
      const { layout, roomIndex } = world;
      if (layout.outro) playScene(layout.outro);
      else {
        const next = roomIndex + 1;
        saveProgress({ room: next, pending: '' });
        showRoute(()=>window.DispatchCovers.nextStop(layout,next,campaign.rooms[next].name,showDialog));
      }
    } else if (world.finished === 'fallen') {
      window.DispatchView.fallPanel(world,campaign.fightStocks,showDialog,stockLabel);
    }
  }
  function refreshAudition() {
    const p=window.StageMusic.preview, notice=$('audition-status');
    const text=!settings.sound || !settings.volume || !settings.musicVolume ? 'Muted in Options' :
      !p.playing ? 'Stopped' : music?.finished ? 'Finished' :
      audioContext?.state!=='running' ? 'Press Play to enable audio' :
      p.urgent && !music?.urgent ? 'Final-stock mix at the next bar' : p.urgent ? 'Final-stock mix' : 'Playing';
    if(notice && notice.textContent!==text)notice.textContent=text;
  }
  function playPreview(restart=true){
    const p=window.StageMusic.preview;
    if(restart || !p.playing)music?.restart();
    p.playing=true;unlockMusic();updateMusic();refreshAudition();
  }
  function stopPreview(){window.StageMusic.preview.playing=false;music?.restart();updateMusic();refreshAudition();}
  function openStageMusic(stage=settings.stage,back=()=>{showSoundTest();$('audition-editor')?.focus();},form=lobbyForm()){
    if(!window.StageMusic || !versusStyled) return waitForDispatch('Stage music',()=>loadVersusPanel('StageMusic'),
      ()=>openStageMusic(stage,back,form),back);
    window.StageMusic.editor(stage,{arenas,storage,showDialog,draw:(canvas,id)=>drawStageTile(canvas,id,form),play:playPreview,stop:stopPreview,back,
      fight:(stage,song)=>startMatch({...settings,mode:page==='lobby' && settings.mode==='local'?'local':'solo',
        stage,form,coats:lobbyCoats.slice(),stockCount:3,timeBattle:false},undefined,undefined,null,{song})});
    updateMusic();refreshAudition();
  }
  function showSoundTest(){
    if(!window.StageMusic)return waitForDispatch('Sound Test',()=>loadDispatch('StageMusic'),showSoundTest,backFromSoundTest);
    window.StageMusic.soundTest({arenas,bonus:yardChapter.bonus.name,showDialog,play:playPreview,stop:stopPreview,
      back:backFromSoundTest,editor:stage=>openStageMusic(stage)});
    updateMusic();refreshAudition();
  }
  function backFromSoundTest(){
    showOptions('sound-test');
  }
  function showOptions(focus) {
    if(!window.VersusRulebook)return waitForDispatch('Options',()=>loadDispatch('VersusRulebook'),()=>showOptions(focus),()=>$('home-options').focus());
    showDialog('options','Options',window.VersusRulebook.options(settings,cameraButton));
    (focus==='sound-test'?$('open-sound-test'):document.querySelector('[data-do=option-sound]')).focus();
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
  $('home-cup').onclick = () => cupSheet();
  $('home-records').onclick=()=>showRecords();
  $('home-bells').onclick = () => bellSheet();
  $('home-adventure').onclick = () => {
    audioReady();
    sound('menu');
    selectChapter(nightUnlocked()?nightChapter:yardChapter);
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
  const schoolKey='dog-fight-3.school';
  function readSchool() {
    let record;
    try { record=JSON.parse(storage.getItem(schoolKey)); } catch {}
    return window.FightSchool.readProgress(record);
  }
  const schoolSave=readSchool();
  let schoolUnsaved=false;
  const unfinishedLesson=()=>window.FightSchool.unfinished(schoolSave);
  function saveSchool(change) {
    const disk=readSchool();
    schoolSave.passed=schoolLessons.filter(l=>disk.passed.includes(l.id) || schoolSave.passed.includes(l.id)).map(l=>l.id);
    schoolSave.firstFightDone ||= disk.firstFightDone;
    schoolSave.firstFightWon ||= disk.firstFightWon;
    if(!schoolUnsaved)schoolSave.rematch=disk.rematch;
    window.FightSchool.updateRematch(schoolSave,change);
    schoolSave.started ||= disk.started;
    schoolSave.seen=true;
    if (schoolSave.started) schoolSave.playedAt=Date.now();
    try {
      const {index,...saved}=schoolSave;
      storage.setItem(schoolKey,JSON.stringify({...saved,lesson:schoolLessons[index].id}));
      schoolUnsaved=false;
    } catch { schoolUnsaved=true; }
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
  let schoolDevice=null, schoolPadBits=0;
  function promptDevice(pads){
    const pad=soloSeat?.get(pads) || (soloSeat && (schoolDevice===0 || schoolDevice===2)?null:pads[0]);
    let bits=0;
    if(pad){
      for(let i=0;i<Math.min(17,pad.buttons.length);i++)if(pad.buttons[i].pressed)bits|=1<<i;
      for(let i=0;i<Math.min(4,pad.axes.length);i++){
        if(pad.axes[i]>.28)bits|=1<<(17+i*2);
        if(pad.axes[i]<-.28)bits|=1<<(18+i*2);
      }
    }
    if(bits & ~schoolPadBits)schoolDevice=1;
    schoolPadBits=bits;
    if(!pad && schoolDevice===1)schoolDevice=null;
    return schoolDevice ?? (pad?1:matchMedia('(pointer:coarse)').matches?2:0);
  }
  function targetRecap(){
    const t=corner?.target;
    return t?'<p id="rematch-target"><strong>'+(world.end!==null && t.doneAt===null?'Still to practice':t.title)+'</strong> · '+t.line+'</p>':'';
  }
  function renderCorner(pads){
    const cue=corner.read(world), device=promptDevice(pads), tip=$('corner-tip');
    const t=corner.target;
    const goal=t && (t.doneAt!==null?world.matchFrames-t.doneAt<160:(!cue || cue==='opening') && world.matchFrames<300);
    const earned=(!cue || cue==='opening') && corner.field?.notice(world.matchFrames);
    if(!settings.cornerTips || (!cue && !goal && !earned)){if(!tip.hidden)tip.hidden=true;return;}
    const key=(goal?t.id+'/'+t.title:earned || cue)+'/'+device+(device===1?padNames(0,seatPad(0,pads))[0]:'');
    if(tip.dataset.cue!==key){
      const label=action=>{
        if(device===0)return keyFor(0,action);
        if(device===2)return action[0].toUpperCase()+action.slice(1);
        return ['left','right','up','down'].includes(action)?'stick '+action:padFor(0,action);
      };
      const [title,line]=goal?[t.title,t.line]:earned?['Skill earned',earned+' · See your skill card in Pause.']:
        corner.field && cue==='opening'?['Take center stage','Hold '+label('right')+' to run across the middle of the table.']:window.FightSchool.cornerLine(cue,label);
      $('corner-title').textContent=title;$('corner-line').textContent=line;tip.dataset.cue=key;
    }
    if(tip.hidden)tip.hidden=false;
  }
  function prepareGuide(lesson,terrain){
    const attach=()=>{if(!lesson.example)lesson.guide=new window.LessonGuide.Guide(lesson.id,terrain);};
    if(window.LessonGuide)return attach();
    lesson.guideLoading=true;
    loadDispatch('LessonGuide').then(attach,()=>{lesson.guideError=true;}).finally(()=>{lesson.guideLoading=false;});
  }
  function toggleGuide(){
    const lesson=page==='match'?world?.lesson:null;
    settings.guidedLessons=!!lesson?.guideError || !settings.guidedLessons;save();
    if(lesson && !lesson.course)return replaySchoolLesson(false);
    const target=schoolSave.rematch?.id;
    startLesson(target?schoolLessons.findIndex(l=>l.id===target):Math.max(0,unfinishedLesson()),!!target);
  }
  function renderSchool(pads) {
    const lesson=world.lesson, info=lesson.info || schoolLessons[lesson.index];
    const device=promptDevice(pads);
    const example=lesson.example;
    const state=example?(lesson.done || lesson.missed?'example-ended':'example'):lesson.missed?'retry':lesson.done?'passed':
      lesson.guide?'guided':lesson.guideLoading?'loading-guide':'playing';
    const names=padNames(0,seatPad(0,pads));
    const key=lesson.id+'/'+state+'/'+device+'/'+(device===1?names[0]+names[8]:'')+'/'+(example?example.index:lesson.guide?.revision ?? lesson.note ?? '');
    if ($('school-coach').dataset.key===key) return;
    $('school-coach').dataset.key=key;
    $('school-coach').dataset.state=state;
    const count=lesson.course?window.FighterSchool.courses[lesson.course].lessons.length:schoolLessons.length;
    $('school-count').textContent=matchConfig.tryout?'Tryouts · '+fighters[lesson.course].name+
      (lesson.pace?' · Pace '+fighters[lesson.pace.kind].name:''):matchConfig.specialStudy?fighters[lesson.course].name+' · '+specialInputs[matchConfig.specialStudy.side]:
      matchConfig.cornerLesson?(lesson.course?'Sparring practice':'First fight practice'):matchConfig.schoolReview?'Rematch practice · Pip vs. Brisket':
      (lesson.course?fighters[lesson.course].name+' · Fighter lessons':'Fight School')+' · '+(lesson.index+1)+' / '+count;
    $('school-list').textContent=(device===1?names[9]+' · ':'')+(matchConfig.tryout?'Tryout card':matchConfig.specialStudy?'Back to moves':matchConfig.cornerLesson?'Back to fight':'Lessons');
    $('school-title').textContent=info.title;
    const watch=$('school-example'),next=$('school-next');
    const personal=$('school-recording');
    if(matchConfig.reviewTicket && lesson.hasRecording===undefined)
      lesson.hasRecording=window.FightSchool.reviewLoss(records.get(matchConfig.reviewTicket),lesson.id)>=0;
    personal.hidden=!lesson.hasRecording || !!example;
    if(!personal.hidden)personal.textContent=(device===1?names[11]+' · ':'')+'Try my knockout';
    const guideButton=$('school-guide');
    guideButton.hidden=!!lesson.course || !!example;
    guideButton.textContent=lesson.guide || lesson.guideLoading?'Restart at match speed':lesson.guideError?'Retry guided practice':'Guide my inputs';
    $('school-retry').hidden=!!example;
    watch.hidden=!!example && !lesson.done && !lesson.missed;
    watch.textContent=(device===1?names[8]+' · ':'')+(example?'Watch again':'Watch example');
    watch.title=device===0 && !lesson.done && !example?'Press Enter to watch this lesson':watch.textContent;
    if(example){
      const {keys,caption}=example.cue;
      $('school-count').textContent+=' · Example '+(example.index+1)+' / '+example.cues.length+' · ½ speed';
      $('school-task').textContent=lesson.done?'Your turn. Try the same technique from the starting position.':lesson.missed?'The example ended. Try the technique from the starting position.':caption;
      $('school-bindings').textContent=lesson.done || lesson.missed ? (lesson.course?window.FighterSchool.hint(info,device,keyFor,padFor):schoolHint(info.id,device)) :
        keys.length?window.FighterSchool.hint({keys:[keys]},device,keyFor,padFor):'Release the controls';
      next.hidden=false;
      next.textContent=(device===1?names[0]+' · ':device===0?'Enter · ':'')+'Try it';
      return;
    }
    $('school-task').textContent=lesson.missed?(info.miss || (lesson.course?'Retry to practice the technique from the starting position.':'The stock ended. Retry to return to the starting position.')):
      lesson.done?info.success:lesson.note || info.task;
    $('school-bindings').textContent=lesson.done ? (device===1?names[0]+' to continue':device===0?'Enter to continue':'') :
      lesson.missed?'':lesson.course?window.FighterSchool.hint(info,device,keyFor,padFor):schoolHint(info.id,device);
    $('school-next').hidden=!lesson.done;
    lesson.guide?.touchPrompts(touchButtons,state==='guided' && device===2);
    if(state==='guided')lesson.guide.render($('school-task'),$('school-bindings'),action=>device===0?keyFor(0,action):
      device===1 && !['right','up','down','left'].includes(action)?padFor(0,action):(device===1?'Stick ':'')+action[0].toUpperCase()+action.slice(1));
    else if(state==='loading-guide')$('school-task').textContent='Loading guided practice…';
    else if(lesson.guideError && state==='playing')$('school-task').textContent=info.task+' Guided practice could not load.';
    if(matchConfig.cornerLesson){
      if(lesson.done && lesson.course)window.FighterSchool.mark(storage,lesson.id);
      if(matchConfig.fieldLesson && lesson.done && !schoolSave.passed.includes(lesson.id)){
        schoolSave.passed.push(lesson.id);saveSchool();
      }
      next.textContent='Return to fight';return;
    }
    if(lesson.course){
      if(lesson.done){if(lesson.index<0)lesson.saveTime(storage);else window.FighterSchool.mark(storage,lesson.id);}
      $('school-next').textContent=matchConfig.tryout?'Tryout card':matchConfig.specialStudy?'Back to moves':lesson.index+1<count?'Next lesson':'Fighter card';
      return;
    }
    if (lesson.done) {
      const passed=schoolSave.passed.includes(lesson.id);
      if(!passed){
        schoolSave.passed.push(lesson.id);
        if(!matchConfig.schoolReview)schoolSave.index=Math.min(lesson.index+1,schoolLessons.length-1);
      }
      if(!passed || matchConfig.reviewTicket && schoolSave.rematch?.ticket===matchConfig.reviewTicket && !schoolSave.rematch.fight)
        saveSchool({fight:matchConfig.reviewTicket});
    }
    $('school-next').textContent=matchConfig.schoolReview?'Rematch Brisket':
      lesson.index===schoolLessons.length-1 && unfinishedLesson()<0?'Play first match':'Next lesson';
  }
  function startLesson(index,schoolReview=false) {
    leaveOnline();
    afterStory=null;
    if(!schoolReview)schoolSave.index=index;
    schoolSave.started=true;
    saveSchool();
    startMatch({...settings,mode:'local',stage:schoolLessons[index].id==='platform'?'picnic':'nightmail',
      p1:'pip',p2:'brisket',fetch:false,minutes:0,lesson:index,schoolReview,
      reviewTicket:schoolReview && schoolSave.rematch?.id===schoolLessons[index].id ? schoolSave.rematch.ticket : null});
    delete $('school-coach').dataset.key;
    renderSchool(getPads());
  }
  function backToRematchLesson(){
    dismiss();renderSchool(getPads());
    if(!$('school-recording').hidden)$('school-recording').focus({preventScroll:true});
  }
  function openLessonRecording(){
    const lesson=world?.lesson,ticket=matchConfig?.reviewTicket;
    if(!lesson?.hasRecording || !ticket)return;
    let review;
    waitForDispatch('Your recorded knockout',async()=>{
      await Promise.all([loadDispatch('MatchReview'),loadDispatch('FinishTools'),replayWrites.get(ticket)]);
      review=await window.MatchReview.schoolKnockout(ticket,records.get(ticket),lesson.id);
    },()=>{
      if(review)return stockSheet({...review,ticket,lesson:lesson.id});
      showDialog('recording-unavailable','Recording unavailable','<p>This knockout is no longer saved on this device. You can still practice the lesson.</p><button class="primary" id="recording-back">Back to lesson</button>');
      $('recording-back').onclick=backToRematchLesson;$('recording-back').focus();
    },backToRematchLesson);
  }
  function nextLesson() {
    if(world.lesson.example)return replaySchoolLesson(false);
    if(matchConfig.tryout)return openTryout(world.lesson.course);
    if(matchConfig.specialStudy)return leaveSpecialStudy();
    if(matchConfig.cornerLesson)return returnToFight();
    if (matchConfig.schoolReview) return startFirstFight(world.lesson.id);
    const next=world.lesson.index+1;
    const kind=world.lesson.course;
    if(kind)return next<window.FighterSchool.courses[kind].lessons.length?startFighterLesson(kind,next):fighterSheet(kind);
    if (next<schoolLessons.length) startLesson(next);
    else if (unfinishedLesson()>=0) startLesson(unfinishedLesson());
    else startFirstFight();
  }
  function startFirstFight(target=schoolSave.rematch?.id,field=false) {
    if(field && !window.FighterSchool)return waitForDispatch('Learn in a match',()=>loadDispatch('FighterSchool'),()=>startFirstFight(target,true),()=>showHome());
    leaveOnline();
    afterStory=null;
    schoolSave.started=true;
    saveSchool({fight:target && schoolSave.rematch?.id===target?schoolSave.rematch.ticket:null});
    startMatch(firstFightConfig(target,field));
  }
  function firstFightConfig(target,field=false){
    return {...settings,mode:'solo',schoolFinal:true,fieldMatch:field,schoolTarget:target,p1:'pip',p2:'brisket',cpuLevel:'rookie',
      stage:'picnic',form:'original',stockCount:3,timeBattle:false,fetch:false,minutes:7};
  }
  function fieldButton(){
    return corner?.field?'<button class="utility" data-do="field-card">Skills from this fight · '+Object.keys(corner.field.marks).length+' / 10</button>':'';
  }
  function openFieldCard(){
    const over=world.end!==null;
    corner.field.panel(schoolLessons,schoolSave.passed,showDialog,index=>{
      const parked=pausedFight();
      startMatch({...settings,mode:'local',lesson:index,cornerLesson:true,fieldLesson:true,form:'original',
        stage:schoolLessons[index].id==='platform'?'picnic':'nightmail',p1:'pip',p2:'brisket',minutes:0,fetch:false},
        undefined,undefined,null,{visit:over?{returnResult:parked}:parked});
      delete $('school-coach').dataset.key;renderSchool(getPads());
    },over?showResult:dismiss,over);
  }
  function startCornerLesson(){
    if(corner.practice==='air-lastDodge'){
      if(!window.RecoveryCoach)return waitForDispatch('Practice this recovery',()=>loadDispatch('RecoveryCoach'),startCornerLesson,showPause);
      const {clip}=window.RecoveryCoach.recordFall(world);
      return clip?recoverySheet({clip,from:'pause',projection:true,result:world}):startExercise(corner.practice);
    }
    if(corner.practice==='launch-escape' && world.matchFrames-corner.landingAt<finishTape?.length)
      return showFinishReplay(null,{instant:true,finish:true,landingFocus:true,from:'pause',result:world,clip:{tape:finishTape,losses:[]}});
    if(corner.practice==='escape-gripEscape' || corner.practice.startsWith('launch-') || corner.practice==='platform-below'){
      if(!window.PracticeFeedback)return waitForDispatch('Practice instructions',()=>loadDispatch('PracticeFeedback'),startCornerLesson,showPause);
      return startExercise(corner.practice);
    }
    const visit=pausedFight(), index=schoolLessons.findIndex(l=>l.id===corner.practice);
    startMatch({...settings,mode:'local',stage:'nightmail',form:'original',p1:'pip',p2:'brisket',fetch:false,minutes:0,
      lesson:index,cornerLesson:true},undefined,undefined,null,{visit});
    delete $('school-coach').dataset.key;renderSchool(getPads());
  }
  function resumeCourse() {
    const r=schoolSave.rematch;
    if(r)return r.fight?startFirstFight(r.id):startLesson(schoolLessons.findIndex(l=>l.id===r.id),true);
    const index=unfinishedLesson();
    if (index<0 && !schoolSave.firstFightDone) return startFirstFight();
    startLesson(index<0?0:index);
  }
  function schoolList() {
    showDialog('school','Fight School',
      '<p>'+schoolSave.passed.length+' of '+schoolLessons.length+' lessons cleared. Choose a lesson to play as Pip.</p><div id="school-syllabus">'+
      schoolLessons.map((l,i)=>'<button type="button" class="utility" data-lesson="'+i+'">'+(i+1)+'. '+l.title+
        (schoolSave.passed.includes(l.id)?' ✓':'')+'</button>').join('')+'</div><div class="dialog-actions"><button class="primary" id="school-resume">'+
      (world?.lesson?'Back to lesson':schoolSave.rematch?(schoolSave.rematch.fight?'Rematch Brisket':'Continue rematch practice'):unfinishedLesson()<0?(schoolSave.firstFightDone?'Replay course':'Play first match'):
        schoolSave.started?'Continue course':'Start course')+'</button><button class="utility" id="syllabus-guide">'+
      (settings.guidedLessons && !world?.lesson?.guideError?'Practice at match speed':'Guide my inputs')+'</button>'+stockBreakToggle()+'<button class="utility" data-do="fighter-classes">Fighter lessons</button><button class="utility" data-do="pad-check">Check controller</button><button class="utility" data-do="home">Main menu</button></div>');
    const clinic=document.createElement('button');clinic.type='button';clinic.className='utility';clinic.textContent='Landing clinic';
    $('syllabus-guide').after(clinic);clinic.onclick=()=>replayClinic('floor');
    const rescue=clinic.cloneNode(false);rescue.textContent='Recovery clinic';clinic.after(rescue);rescue.onclick=()=>recoveryClinic(false);
    const read=clinic.cloneNode(false);read.id='school-read';read.textContent='Read the Rival';clinic.before(read);read.onclick=()=>eventBoard('read-the-rival');
    const field=clinic.cloneNode(false);field.id='school-field';field.textContent='Learn in a match';read.before(field);field.onclick=()=>startFirstFight(null,true);
    const launch=clinic.cloneNode(false);launch.textContent='Launch survival';rescue.after(launch);launch.onclick=()=>recoveryClinic(false,true);
    const chance=clinic.cloneNode(false);chance.textContent='Second Chance';launch.after(chance);chance.onclick=()=>recoveryClinic(true,true,null,'reply');
    const ledge=clinic.cloneNode(false);ledge.textContent='Ledge clinic';launch.after(ledge);ledge.onclick=()=>replayClinic('ledge');
    const stage=clinic.cloneNode(false);stage.textContent='Stage tech clinic';ledge.after(stage);stage.onclick=()=>replayClinic('wall');
    $('syllabus-guide').onclick=toggleGuide;
    $('school-syllabus').onclick=e=>{const button=e.target.closest('[data-lesson]');if(button) startLesson(Number(button.dataset.lesson));};
    $('school-resume').onclick=()=>world?.lesson?dismiss():resumeCourse();
    $('school-resume').focus({preventScroll:true});
  }
  function replayClinic(kind){
    const ledge=kind==='ledge',stage=['wall','heavy','ceiling'].includes(kind);
    if(!window.FinishTools)return waitForDispatch(ledge?'Ledge clinic':stage?'Stage tech clinic':'Landing clinic',()=>loadDispatch('FinishTools'),()=>replayClinic(kind),schoolList);
    leaveOnline();afterStory=null;
    const {config,battle,tape}=ledge?window.FinishTools.ledgeDemo():stage?window.FinishTools.stageTechDemo(kind):window.FinishTools.landingDemo();
    startMatch(config,undefined,undefined,null,{resume:{battle,tape,countdown:0,call:''}});
    showFinishReplay(0,{clinic:kind==='floor'?true:kind,ledgeFocus:ledge?{slot:0,frame:0,delay:60,action:'climb'}:null,instant:true,finish:true,from:'pause',result:battle,clip:{tape,losses:[]}});
  }
  function closeRecoveryClinic(){
    if(matchConfig?.recoveryClinic)showHome(false);
    schoolList();
  }
  function launchLab({clip,result,launch}){
    showFinishReplay(launch.frame-1,{clip,result,from:'school',slot:launch.slot,launchLab:true,
      launchStudy:{...launch,aim:{x:0,y:0}}});
  }
  function recoveryClinic(wide,fromLaunch=false,kind,study=false){
    if(!window.RecoveryCoach)return waitForDispatch(fromLaunch?'Launch survival':'Recovery clinic',()=>loadDispatch('RecoveryCoach'),()=>recoveryClinic(wide,fromLaunch,kind,study),schoolList);
    const {config,battle,tape,clip,launch}=window.RecoveryCoach.example(wide,fromLaunch,kind);
    if(page!=='match')startMatch({...config,recoveryClinic:true},undefined,undefined,null,{resume:{battle,tape,countdown:0,call:''}});
    if(study==='reply')secondChance({rescue:true,clip,result:battle,slot:0,from:'school'});else if(study)launchLab({clip,result:battle,launch});else recoverySheet({rescue:true,wide,kind,clip,launch,result:battle,from:'school'});
  }
  function leaveFighterSheet(){
    if(page==='match' && (matchConfig?.schoolFinal || spar) && world?.end!=null)return showResult();
    if(page==='match' && world?.lesson?.course)return dismiss();
    schoolList();
  }
  function fighterSheet(kind){
    if(!window.FighterSchool)return waitForDispatch('Fighter lessons',()=>loadDispatch('FighterSchool'),()=>fighterSheet(kind),leaveFighterSheet);
    window.FighterSchool.sheet(kind,{storage,fighters,portrait,savedCoat,showDialog,root:$('dialog-body'),
      choose:fighterSheet,start:startFighterLesson,spar:startSparring,cup:cupSheet,back:leaveFighterSheet,
      backLabel:page==='match' && world?.lesson?.course?'Back to lesson':(matchConfig?.schoolFinal || spar) && page==='match'?'Back to results':'Fight School'});
  }
  function openTryout(kind=settings[editing?'p2':'p1']){
    const back=()=>{if(page==='match')toLobby();else dismiss();showLobbyOptions('lobby-tryout');};
    if(!window.FighterSchool)return waitForDispatch('Fighter tryouts',()=>loadDispatch('FighterSchool'),()=>openTryout(kind),back);
    window.FighterSchool.tryoutSheet(kind,{storage,slot:editing,label:slotLabel(editing),coat:savedCoat,portrait,
      duel:settings.mode==='training'?null:()=>{
        const card=lobbyMatchup();card[editing?'p2':'p1']=kind;
        card.coats=[savedCoat(0,card.p1),savedCoat(1,card.p2)];
        card.coats[1]=window.DogFight.coatFor(1,card.p1,card.p2,card.coats);openOpeningDuel(card);
      },
      root:$('dialog-body'),showDialog,choose:openTryout,start:startFighterLesson,back,pick:id=>{
        if(page==='match')toLobby();else dismiss();
        $('lobby-options').hidden=true;
        pickLobbyFighter(id);
      }});
  }
  $('lobby-tryout').onclick=()=>openTryout();
  function startSparring(kind){
    leaveOnline();afterStory=null;
    const course=window.FighterSchool.courses[kind];
    startMatch({mode:'solo',sparring:true,p1:kind,p2:course.rival,cpuLevel:'rookie',stage:course.stage,form:'original',
      stockCount:3,minutes:7,fetch:false,coats:[savedCoat(0,kind),0]});
  }
  function startFighterLesson(kind,index,tryout=false,visit=null){
    leaveOnline();
    afterStory=null;
    const course=window.FighterSchool.courses[kind];
    startMatch({...settings,mode:'local',stage:index===-2?'picnic':index<0?'nightmail':course.stage,form:'original',p1:kind,p2:index<0?'pip':course.rival,
      coats:[savedCoat(tryout?editing:0,kind),0],fetch:false,minutes:0,lesson:index,fighterCourse:kind,tryout,cornerLesson:!!visit},
      undefined,undefined,null,{visit});
    delete $('school-coach').dataset.key;
    renderSchool(getPads());
  }
  function replaySchoolLesson(example){
    if(!world?.lesson || page!=='match')return;
    if(example && !window.FighterSchool)
      return waitForDispatch('Lesson example',()=>loadDispatch('FighterSchool'),()=>replaySchoolLesson(true),()=>{});
    startMatch(matchConfig,undefined,undefined,null,{visit:matchConfig.cornerLesson?practiceFight:null});
    if(example)world.lesson.example=new window.FighterSchool.Example(world.lesson.id,world.lesson);
    delete $('school-coach').dataset.key;
    renderSchool(getPads());
  }
  function openLessonList(){return matchConfig?.tryout?openTryout(world.lesson.course):matchConfig?.specialStudy?leaveSpecialStudy():matchConfig?.cornerLesson?returnToFight():world?.lesson?.course?fighterSheet(world.lesson.course):schoolList();}
  $('home').addEventListener('click',e=>{
    if (!$('school-welcome').hidden && e.target.closest('button')) {
      if (!schoolSave.seen) saveSchool();
      $('school-welcome').hidden=true;
      $('home').classList.remove('has-welcome');
    }
  });
  window.addEventListener('storage',e=>{
    if(e.key===pinKey || e.key===null){
      visitPin=undefined;
      if(page==='home')syncHomePin();
      if(dialogType==='matchup-card' && $('matchup-pin'))refreshCardPin?.();
    }
    if (dialogType==='records' && (e.key===null || e.key.startsWith(window.FightRecords.prefix))) {
      const focused=document.activeElement;
      showRecords(focused?.dataset.recordId);
      if(focused===$('dialog-close')) focused.focus({preventScroll:true});
    }
    const changedBook = window.DispatchScript.chapters.find(book=>book.saveKey===e.key);
    if (e.key!==null && e.key!==schoolKey && !changedBook && !e.key.startsWith('dog-fight-3.cup.')) return;
    if (!schoolUnsaved && (e.key===null || e.key===schoolKey)) {
      const disk=readSchool();
      if (page!=='match' || (!world?.lesson && !matchConfig?.schoolFinal)) Object.assign(schoolSave,disk);
    }
    if ((e.key===null || changedBook) && stored) {
      for (const book of changedBook ? [changedBook] : window.DispatchScript.chapters) chapterSaves.set(book,book.readSave(storage));
      progress=chapterSaves.get(campaign);
      if(page==='dispatch-route' && !$('dialog').open) showRoute();
    }
    if (page!=='home') return;
    const active=document.activeElement;
    refreshHomeSaves();
    if (dialogType==='saved-games') {
      const id=active?.dataset.resumeId;
      showSavedGames();
      if (id) document.querySelector('[data-resume-id="'+id+'"]')?.focus();
    } else if (!$('dialog').open && (active===$('other-saves') && $('other-saves').hidden ||
      active===$('home-continue') && $('home-saves').hidden || active===$('welcome-play') && $('school-welcome').hidden)) focusHome();
  });
  $('welcome-play').onclick=resumeCourse;
  $('welcome-field').onclick=()=>startFirstFight(null,true);
  $('welcome-dismiss').onclick=()=>{saveSchool();showHome();};
  $('home-school').onclick=schoolList;
  $('school-next').onclick=nextLesson;
  $('school-example').onclick=()=>replaySchoolLesson(true);
  $('school-recording').onclick=openLessonRecording;
  $('school-guide').onclick=toggleGuide;
  $('school-retry').onclick=()=>matchConfig.tryout || matchConfig.specialStudy || matchConfig.cornerLesson?replaySchoolLesson(false):world.lesson.course?startFighterLesson(world.lesson.course,world.lesson.index):startLesson(world.lesson.index,matchConfig.schoolReview);
  $('school-list').onclick=openLessonList;
  $('home-guide').onclick = () => showMoves(settings.p1);
  $('home-options').onclick = showOptions;
  let homeLauncher=null;
  $('home').addEventListener('click',e=>{
    const button=e.target.closest('button');
    if(button)homeLauncher=button;
  },true);
  function returnToHome(){
    showHome(false);
    if(homeLauncher?.getClientRects().length && !homeLauncher.disabled)homeLauncher.focus();
    else focusHome();
  }
  $('lobby-home').onclick = $('route-home').onclick = returnToHome;
  $('route-films').onclick = () => showReels();
  $('route-bonus').onclick = () => showLiftTicket();
  $('route-switch').onclick = () => {
    if (!nightUnlocked()) return;
    selectChapter(campaign===yardChapter ? nightChapter : yardChapter);
    showRoute();
  };
  $('story-map').onclick = () => (inLibrary ? finishStory() : showRoute());
  $('film-pause').onclick = toggleFilm;
  $('story-skip').onclick = finishStory;
  $('route-stops').onclick = (e) => {
    const b = e.target.closest('[data-stop]');
    if (b && !b.disabled) enterStop(Number(b.dataset.stop));
  };
  function continueAdventure() {
    audioReady();
    sound('menu');
    if (progress.pending) return playScene(progress.pending);
    if (progress.complete) return playScene(campaign.rooms[0].intro);
    enterStop(progress.room, progress.checkpoint);
  }
  $('dispatch-start').onclick = continueAdventure;
  let onlineDog = settings.p1, peerLibrary = null, onlineRequest = 0, roomDraft=null;
  let customSetup=null;
  const clockLabel=minutes=>minutes?minutes+' min':'No clock';
  function roomRuleLabel(rules){
    return [rules.timed?'Time Battle':stockLabel(rules.lives),clockLabel(rules.minutes),
      rules.bestOfThree?'Best of three':'Single game','Fetch Ball '+(rules.fetch?'on':'off')].join(' · ');
  }
  function readRoomSetup(){
    const time=Number($('online-rules').value);
    return {timed:!!time,minutes:time || (customSetup && !customSetup.timed?customSetup.minutes:7),
      lives:customSetup?.lives ?? 3,fetch:customSetup?.fetch ?? true,stageForm:$('online-form').value,
      bestOfThree:$('online-format').getAttribute('aria-pressed')==='true'};
  }
  function updateRoomSetup(){
    $('online-custom-rules').hidden=!customSetup;
    if(customSetup)$('online-custom-rules').textContent=roomRuleLabel(readRoomSetup());
  }
  const offline = {match:null,phase:'idle'};
  let online = offline;
  function onlineFightStatus(){
    return online.recovery?'Reconnecting to your opponent. The fight is paused.':'The online fight is still running.';
  }
  const roomEvents = {
    status: onlineStatus, start(config,random){
      const warmedUp=!!world?.warmupPartner;
      startMatch(config,random);
      if(warmedUp){
        $('countdown').dataset.caption='Opponent found';
        $('countdown').classList.add('opponent-found');
        tone(523,659,.11);tone(659,880,.16,.11);
        announce('Opponent found. You are P'+(online.side+1)+' on '+stageName(config.stage,config.form)+'.');
      }
    }, votes: updateVotes,
    recovery(active){
      accumulator=0;
      taps.clear();touchTaps.clear();touchFlick=flickAim=null;
      $('countdown').classList.toggle('net-lag',active);
      $('countdown').textContent=active?'Reconnecting…':'';
      if($('online-fight-status'))$('online-fight-status').textContent=onlineFightStatus();
      announce(active?onlineFightStatus():'Reconnected. Fight resumed.');
    },
    closed: (message) => showOnline(message, online.action === 'join' ? online.code : ''),
  };
  function leaveOnline() {
    onlineRequest++;
    if(online!==offline)online.close();
  }
  function showOnline(message = '', invite = '', ready) {
    if(!window.DogOnline)return waitForDispatch('Online lobby',()=>loadDispatch('DogOnline'),()=>showOnline(message,invite,ready),showHome);
    if(online===offline)online=new window.DogOnline.OnlineSession(roomEvents);
    if(invite && !window.DogOnline.validCode(invite)){
      message='This invite has an invalid room code.';
      invite='';
    }
    roomDraft=null;
    menuScreen('online-lobby');
    afterStory = null;
    $('online-code').value = invite;
    const roster = $('online-roster');
    if (!roster.childElementCount) {
      for (const [id, arena] of Object.entries(arenas)) $('online-stage').add(new Option(arena.name, id));
      for (const [id, form] of Object.entries(stageForms)) $('online-form').add(new Option(form.name,id));
      for (const [kind, dog] of Object.entries(fighters)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'net-dog';
        button.dataset.dog = kind;
        button.innerHTML = '<img alt=""><strong>' + dog.name + '</strong><small>' + dog.style + '</small>';
        roster.append(button);
      }
    }
    onlineStatus('idle', message, '');
    $(invite ? 'online-join' : 'online-quick').focus({ preventScroll: true });
    ready?.();
  }
  function onlineStatus(phase, message, code) {
    const busy = phase !== 'idle', room = phase === 'room';
    const warming=page==='match' && !!world?.warmupPartner;
    if (room && page === 'match' && !warming) { roomDraft=null;menuScreen('online-lobby', true); }
    $('online-actions').hidden = busy;
    $('online-wait').hidden = !busy;
    $('online-warmup').hidden=!(room || phase==='search');
    $('online-status').textContent = (room && online.roomSet ? 'Best of three · ' : '') + message;
    const preview=online.preview, reviewing=phase==='review' || phase==='ready';
    $('online-rules-summary').textContent = preview && (room || reviewing)?'Room '+code+' · You are P'+(online.side+1):
      room && online.roomRules?roomRuleLabel(online.roomRules):
      room ? (online.timeMinutes?'Time Battle · '+online.timeMinutes+' min':'Room · 3 stocks · 7 min') : 'Quickplay · 3 stocks · 7 min';
    $('online-review').hidden=!(preview && (room || reviewing));
    if(!$('online-review').hidden){
      const {p1,p2,stage,rules}=preview, host=online.side===0;
      const coats=host?[online.coat,online.remoteCoat]:[online.remoteCoat,online.coat];
      $('room-p1').src=portrait(p1,window.DogFight.coatFor(0,p1,p2,coats));
      $('room-p2').src=portrait(p2,window.DogFight.coatFor(1,p1,p2,coats));
      $('room-pair').textContent=fighters[p1].name+' vs. '+fighters[p2].name;
      $('room-arena').textContent=stageName(stage,rules.stageForm);
      $('room-terms').textContent=roomRuleLabel(rules);
      $('room-ready').hidden=host;$('room-ready').disabled=phase==='ready';
    }
    $('online-connect-title').textContent = reviewing ? 'Match preview' : room ? 'Friend room' : phase === 'search' ? 'Quickplay' : 'Matchmaking';
    $('online-cancel').textContent = room ? 'Close room' : phase === 'search' ? 'Cancel search' : 'Cancel';
    $('online-invite').hidden = !room;
    $('online-invite-url').hidden = true;
    $('online-room-code').textContent = room ? code : '';
    $('online-copy').textContent = 'Copy invite link';
    $('online-coat').disabled = busy;
    $('online-coat').textContent = 'Coat · ' + coatNames[onlineDog][savedCoat(0,onlineDog)];
    for (const button of $('online-roster').children) {
      const kind = button.dataset.dog, coat = savedCoat(0,kind);
      if (button.dataset.color !== String(coat)) {
        button.querySelector('img').src = portrait(kind,coat);
        button.dataset.color = String(coat);
      }
      button.disabled = busy;
      button.setAttribute('aria-pressed', String(button.dataset.dog === onlineDog));
    }
    if(warming){
      if($('warmup-status'))$('warmup-status').textContent=$('online-status').textContent;
    }else if(phase==='review')$('room-ready').focus({preventScroll:true});
    else if (busy && !$('online-wait').contains(document.activeElement)) {
      $(room || phase==='search'?'online-warmup':'online-cancel').focus({preventScroll:true});
    }
  }
  function startWarmup(partner='stand'){
    if(online.match || !['room','search'].includes(online.phase))return;
    const p1=online.kind,p2=p1==='brisket'?'pip':'brisket';
    startMatch({mode:'training',p1,p2,stage:online.openingStage || 'picnic',form:online.roomForm,
      coats:[online.coat,0],fetch:false,warmupPartner:partner});
  }
  function showWarmupMenu(){
    const buttons=Object.entries(warmupPartners).map(([id,partner])=>'<button class="utility" type="button" data-warmup-partner="'+id+
      '" aria-pressed="'+(world.warmupPartner===id)+'">'+partner.title+'</button>').join('');
    showDialog('pause','Online warm-up','<p id="warmup-status"></p><p>'+(online.roomRules?'Your match starts when your opponent is ready.':'Your match starts as soon as an opponent connects.')+'</p>'+
      '<h3>Practice partner · '+world.dogs[1].stats.name+'</h3><div class="dialog-actions">'+buttons+'</div>'+
      '<div class="dialog-actions"><button class="primary" data-do="resume">Resume warm-up</button>'+
      '<button class="utility" id="warmup-reset">Reset positions</button></div>'+
      '<div class="dialog-actions"><button class="utility" id="warmup-lobby">Waiting room</button>'+
      '<button class="utility" id="warmup-cancel">'+(online.phase==='room'?'Close room':'Cancel search')+'</button></div>');
    $('warmup-status').textContent=$('online-status').textContent;
    for(const button of $('dialog-body').querySelectorAll('[data-warmup-partner]'))button.onclick=()=>{
      if(!world?.warmupPartner)return;
      world.warmupPartner=button.dataset.warmupPartner;
      hudKey='';dismiss();updateHUD();
    };
    $('warmup-reset').onclick=()=>{if(world?.warmupPartner)startWarmup(world.warmupPartner);};
    $('warmup-lobby').onclick=()=>{
      if(!world?.warmupPartner)return;
      menuScreen('online-lobby',true);
      $('online-warmup').focus({preventScroll:true});
    };
    $('warmup-cancel').onclick=()=>{if(world?.warmupPartner)cancelMatchmaking();};
    $('dialog-body').querySelector('[data-do=resume]').focus();
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
      $('online-format').getAttribute('aria-pressed') === 'true', $('online-form').value, savedCoat(0,onlineDog), Number($('online-rules').value),
      action==='create' && customSetup?readRoomSetup():null);
  }
  function rematchFighterButton() {
    return online.canRepick ? '<button class="utility" data-do="rematch-fighters">Change fighter</button>' : '';
  }
  function showRoomFighters(focus='next') {
    const free=online.canRepick;
    if(online.myVote || !free && (!online.fighterPicks || online.series?.picker!==online.side))return;
    if(!roomDraft) {
      const dog=online.roster[online.side];
      roomDraft={...dog,colors:{[dog.kind]:dog.coat}};
    }
    if(!window.VersusRulebook)return waitForDispatch('Choose fighter',()=>loadDispatch('VersusRulebook'),()=>showRoomFighters(focus),showResult);
    const action=window.VersusRulebook.roomFighters(roomDraft,online.roster[1-online.side],free,online.series?.games.length,
      {portrait,savedCoat,showDialog,coatNames});
    updateVotes();
    document.querySelector(focus==='dog'?'[data-room-dog][aria-pressed=true]':focus==='coat'?'[data-room-coat][aria-pressed=true]':'[data-do='+action+']').focus({preventScroll:true});
  }
  function updateVotes() {
    const ready=$('net-pick-ready');
    if(ready)ready.textContent=online.theirVote?'Your opponent is ready.':'';
    const button = document.querySelector('[data-do=online-rematch], [data-set-next]');
    if (!button) return;
    button.disabled = online.myVote;
    const change=document.querySelector('[data-do=rematch-fighters]');
    if(change)change.disabled=online.myVote;
    const arena = online.nextStage && arenas[online.nextStage].name;
    const pick=online.canRepick ? online.readyPicks[online.side] : online.nextPick;
    const fighter=pick ? coatNames[pick.kind][pick.coat]+' '+fighters[pick.kind].name+' · ' : '';
    $('net-rematch-status').textContent = fighter + (arena ? arena + ' selected. ' : '') + (online.myVote ? 'Waiting for your opponent…' :
      online.theirVote ? (online.series ? 'Your opponent is ready.' : 'Your opponent wants a rematch.') : '');
  }
  function setRoomFormat(on){
    const button=$('online-format');
    button.setAttribute('aria-pressed', String(on));
    button.textContent = 'Best of three · ' + (on ? 'On' : 'Off');
  }
  $('online-format').onclick=()=>{setRoomFormat($('online-format').getAttribute('aria-pressed')!=='true');updateRoomSetup();};
  $('online-rules').onchange=updateRoomSetup;
  $('online-rulebook').onclick=()=>openRulebook();
  $('room-ready').onclick=()=>online.acceptRules();
  $('home-online').onclick = () => { audioReady(); sound('menu'); showOnline(); };
  $('online-home').onclick = returnToHome;
  function cancelMatchmaking(){showOnline(online.phase==='room'?'Room closed.':'Matchmaking canceled.');}
  $('online-cancel').onclick = cancelMatchmaking;
  $('online-quick').onclick = () => seekOpponent('quick');
  $('online-warmup').onclick=()=>startWarmup();
  function showCodePad(){
    if(!window.VersusRulebook)return waitForDispatch('Enter room code',()=>loadDispatch('VersusRulebook'),showCodePad,()=>$('open-code-pad').focus());
    window.VersusRulebook.codePad({showDialog,dismiss,exitDialog,legend:padNames(0,currentPads[0])});
  }
  $('open-code-pad').onclick=showCodePad;
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
    window.PadFeedback?.stop();
    returnToOnline = !!online.match || !!world?.warmupPartner || page === 'online-lobby';
    leaveOnline();
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && returnToOnline) showOnline();
  });
  const controls=window.FightControls;
  const layoutStore='dog-fight-3.controls';
  const prefKeys=i=>['quickAttack'+(i+1),'flickJump'+(i+1),i?'tiltStick2':'tiltStick'];
  const seatPrefs=i=>prefKeys(i).map(key=>settings[key]);
  let profileTags=['',''], labelStyles=['auto','auto'],rumble=[1,1];
  let layout=controls.load();
  function readLayouts(){
    const raw=JSON.parse(localStorage.getItem(layoutStore));
    layout=controls.load(raw);
    rumble=[0,1].map(i=>[0,1,2].includes(raw?.rumble?.[i])?raw.rumble[i]:1);
    labelStyles=[0,1].map(i=>Object.hasOwn(controls.labelStyles,raw?.labelStyles?.[i])?raw.labelStyles[i]:'auto');
    profileTags=[0,1].map(i=>typeof raw?.tags?.[i]==='string'?raw.tags[i].slice(0,16):'');
    for(const i of [0,1])prefKeys(i).forEach((key,n)=>{
      if(typeof raw?.prefs?.[i]?.[n]==='boolean')settings[key]=raw.prefs[i][n];
    });
  }
  try { readLayouts(); } catch {}
  let keys=layout.keyboard;
  let matchKeys=new Set(keys.flatMap(map=>Object.values(map)));
  const keyFor=(i,action)=>controls.keyName(keys[i][action]);
  let currentPads=[];
  let soloSeat=null,soloWorld=null;
  const labelCache=[{},{}];
  function padNames(i,pad){
    const c=labelCache[i],id=pad?.id,mapping=pad?.mapping,style=labelStyles[i];
    if(c.names && c.id===id && c.mapping===mapping && c.style===style)return c.names;
    Object.assign(c,{id,mapping,style,names:controls.padLegend(pad,style)});
    return c.names;
  }
  function seatPad(i,pads=currentPads){
    if(page==='lobby' && settings.mode==='local' && lobbySeats){lobbySeats.sync(pads);return lobbySeats.get(i,pads);}
    if(!i && soloWorld===world && soloSeat?.index!=null)return soloSeat.get(pads);
    if(page==='match' && matchConfig?.couchSeats && !finishTrial)return matchConfig.couchSeats.get(i,pads);
    return pads[i] || (pads.length===1?pads[0]:null);
  }
  const padFor=(i,action)=>padNames(i,seatPad(i))[layout.pad[i][action]];
  const strikeKeys=i=>['aimLeft','aimRight','aimUp','aimDown'].map(a=>keyFor(i,a)).join(' / ');
  const edit={slot:0,device:'keyboard',mode:'idle',source:'home',action:'',value:null,down:new Set(),last:''};
  function applyLayouts(persist) {
    keys=layout.keyboard;
    couchPanel?.bindings?.(keys);
    matchKeys=new Set(keys.flatMap(map=>Object.values(map)));
    clearInput();
    delete $('school-coach').dataset.key;
    delete $('corner-tip').dataset.cue;
    hudKey='';
    if(persist)try {localStorage.setItem(layoutStore,JSON.stringify({...layout,tags:profileTags,labelStyles,rumble,prefs:[seatPrefs(0),seatPrefs(1)]}));} catch {return false;}
    return true;
  }
  function openProfiles(source,slot){
    const back=()=>{
      if(source==='bindings'){drawLayouts();$('layout-profiles').focus();return;}
      dismiss();showLobbyOptions('lobby-profiles');
    };
    if(!window.PlayerProfiles)return waitForDispatch('Player profiles',()=>loadDispatch('PlayerProfiles'),()=>openProfiles(source,slot),back);
    showDialog('profiles','Player profiles','');
    window.PlayerProfiles.open($('dialog-body'),{
      storage,slot,back,padNames:i=>padNames(i,seatPad(i)),layout:()=>layout,prefs:seatPrefs,tags:()=>profileTags,
      rumble:i=>rumble[i],
      apply(i,next,prefs,tag,displaced,strength){
        if(strength!==undefined)rumble[i]=strength;
        layout=next;profileTags[i]=tag;
        if(displaced)profileTags[1-i]='';
        prefKeys(i).forEach((key,n)=>{settings[key]=prefs[n];});
        flickJumpStates[i]={};
        return applyLayouts(true);
      },
      edit(i){edit.slot=i;openLayouts(source==='bindings'?edit.source:'lobby');}
    });
  }
  $('lobby-profiles').onclick=()=>openProfiles('lobby',settings.mode==='local'?editing:0);
  function openRumble(source){
    const back=()=>{
      if(source==='bindings')drawLayouts();else showControls();
      $('dialog-body').querySelector('[data-do=rumble]')?.focus();
    };
    if(!window.PadFeedback)return waitForDispatch('Controller rumble',()=>loadDispatch('PadFeedback'),()=>openRumble(source),back);
    refreshController=window.PadFeedback.panel({showDialog,back,slot:source==='bindings'?edit.slot:0,padFor:seatPad,
      levels:()=>rumble,save:(i,value)=>{rumble[i]=value;profileTags[i]='';return applyLayouts(true);}});
  }
  function openStickSetup(source){
    const back=()=>{
      if(source==='bindings')drawLayouts();else showControls();
      $('dialog-body').querySelector('[data-do=stick-setup]')?.focus();
    };
    if(!window.StickCalibration || !versusStyled)return waitForDispatch('Calibrate sticks',()=>loadVersusPanel('StickCalibration'),()=>openStickSetup(source),back);
    refreshController=window.StickCalibration.panel({showDialog,back,preferred:seatPad(source==='bindings'?edit.slot:0),pads:()=>currentPads});
  }
  function controllerCheck(source){
    Object.assign(edit,{source,slot:0,device:'pad',mode:'test',last:null});edit.down.clear();drawLayouts();
  }
  function openLayouts(source) {
    edit.source=source;edit.mode='idle';edit.down.clear();
    drawLayouts();
  }
  function leaveLayouts() {
    if(edit.mode!=='idle'){
      edit.mode='idle';edit.down.clear();drawLayouts();return;
    }
    if(edit.source==='school')schoolList();
    else if(edit.source==='controls') showControls();
    else if(edit.source==='options') showOptions();
    else if(edit.source==='lobby')openProfiles('lobby',edit.slot);
    else dismiss();
  }
  let chooseBinding;
  function showTestInputs(pads) {
    const pad=seatPad(edit.slot,pads);
    window.VersusRulebook.testInputs(edit,layout,pad,padNames(edit.slot,pad));
  }
  function drawLayouts(message='') {
    const {device,slot,mode}=edit,keyboard=device==='keyboard',testing=mode==='test',pending=mode==='swap'||mode==='reset';
    if(!window.VersusRulebook || !versusStyled)return waitForDispatch('Customize controls',()=>loadVersusPanel('VersusRulebook'),()=>drawLayouts(message),leaveLayouts);
    edit.legend=padNames(slot,seatPad(slot));
    showDialog('bindings','Customize controls',window.VersusRulebook.layoutSheet(edit,layout,settings,prefKeys,message,padNames(slot,seatPad(slot)),labelStyles[slot]));
    chooseBinding=window.VersusRulebook.wireLayout(edit,layout,settings,profileTags,{drawLayouts,leaveLayouts,applyLayouts,openProfiles,
      style:value=>{labelStyles[slot]=value;applyLayouts(true);drawLayouts();$('pad-label-style').focus();}});
    if(testing){edit.last=null;showTestInputs(currentPads);}
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
    try{readLayouts();}catch{return;}
    applyLayouts(false);
    if(dialogType==='bindings'){edit.mode='idle';drawLayouts('Layout updated from another tab.');}
  });
  const attackAim = [{}, {}], smashAim = [{}, {}];
  function buttonAim(slot) {
    const map = keys[slot];
    const active = name => held.has(map[name]) || (slot === 0 && touches.has(name));
    const soft = slot === 0 && touchPointers.get(walkPointer)?.dataset.touch;
    const x = horizontalInputs[slot].keys(active('left'),active('right'));
    const y = Number(active('down')) - Number(active('up'));
    return {
      x: x * (active('walk') || (soft && (soft.endsWith('left') || soft.endsWith('right'))) ? 64 / 127 : 1),
      rawX: x, y: y > 0 && (active('walk') || soft === 'down') ? 64 / 127 : y,
    };
  }
  function heldStrikeAxis(negative, positive, last, pressed) {
    if (pressed === negative) return -1;
    if (pressed === positive) return 1;
    const neg = held.has(negative), pos = held.has(positive);
    return neg && pos ? last : Number(pos) - Number(neg);
  }
  window.addEventListener('keydown', (e) => {
    if (page !== 'match' || $('dialog').open) return;
    if (!finishTrial && world?.lesson && e.code==='Enter' && !e.repeat && e.target=== $('game')) {
      e.preventDefault();
      if(world.lesson.done || world.lesson.example)nextLesson();else replaySchoolLesson(true);
      return;
    }
    if (e.target instanceof HTMLSelectElement) return;
    if (!matchKeys.has(e.code) && world?.mode === 'training' && !world.warmupPartner && !$('moment-save').hidden && (e.code === 'Digit1' || e.code === 'Digit2')) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      if (!e.repeat) $(e.code === 'Digit1' ? 'moment-save' : 'moment-retry').click();
      return;
    }
    if (!matchKeys.has(e.code) && world?.mode === 'training' && !world.warmupPartner && (e.code === 'BracketLeft' || e.code === 'BracketRight')) {
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
    // A held menu confirmation can repeat after the next fight opens.
    if(e.repeat && !held.has(e.code))return;
    if(!e.repeat && Object.values(keys[0]).includes(e.code)){
      if(soloSeat?.index!=null)soloSeat.useOtherInput(currentPads);
      if(world?.lesson || corner)schoolDevice=0;
    }
    e.preventDefault();
    held.add(e.code);
    if (!e.repeat) {
      taps.add(e.code);
      keys.forEach((map,i)=>{
        if(e.code===map.left)horizontalInputs[i].last=-1;
        if(e.code===map.right)horizontalInputs[i].last=1;
        if(e.code===map.aimLeft || e.code===map.aimRight || e.code===map.aimUp || e.code===map.aimDown){
          // Capture the chord at the newest strike press. A released key can still be in taps.
          const aim=strikeAim[i];
          aim.x=heldStrikeAxis(map.aimLeft,map.aimRight,aim.x,e.code);
          aim.y=heldStrikeAxis(map.aimUp,map.aimDown,aim.y,e.code);
        }
      });
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
    const wasLeft=touches.has('left'),wasRight=touches.has('right');
    if (button) touchPointers.set(pointerId, button);
    else touchPointers.delete(pointerId);
    touches.clear();
    const pressed = new Set(touchPointers.values());
    for (const el of pressed) for (const key of el.dataset.touch.split('-')) touches.add(key);
    if (button) {
      if(!wasLeft && touches.has('left'))horizontalInputs[0].last=-1;
      if(!wasRight && touches.has('right'))horizontalInputs[0].last=1;
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
      if(soloSeat?.index!=null)soloSeat.useOtherInput(currentPads);
      if(world?.lesson || corner)schoolDevice=2;
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
    musicFocused=false;music?.stop();window.PadFeedback?.stop();
    clearInput();
    if(finishTrial && !$('dialog').open)showTrialPause();
    if (page === 'dispatch-story') setFilmPaused(true);
    if (page === 'match' && !online.match && !paused && world?.end === null) showPause();
  }
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus',()=>{musicFocused=true;if(page==='home')readMissionSaves();});
  function matchFinishPhase(result){
    return result.end!==null && result.matchCard && !result.eventId ? (resultDelay>0?'call':'results') : null;
  }
  const redrawPausedStage = () => {
    if(finishTrial)return drawFinishTrial(0);
    if (page === 'match' && world && view && (paused || frameLab.mode === 'frozen')){
      const result=online.match?.confirmedWorld || world;
      view.draw($('game'),world,0,frameLab.mode==='frozen'?frameLab.renderTime:world.time,result,matchFinishPhase(result));
    }
  };
  FightView.observeDisplay($('game'),redrawPausedStage);
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
    return controls.readPads();
  }
  const down = (pad, i) => !!pad?.buttons?.[i]?.pressed;
  function menuButtons() {
    const roots=$('dialog').open?[$('dialog')]:[$(page),document.querySelector('.topbar')];
    return roots.flatMap(root=>root ? [...root.querySelectorAll('button:enabled,input:enabled:not([readonly]),select:enabled,a[href],summary')] : [])
      .filter(el=>el.getClientRects().length && !el.closest('[inert],details:not([open]) > :not(summary)'));
  }
  let focusLane=null;
  function moveMenuFocus(direction,items=menuButtons()) {
    if(!items.length)return;
    const current=items.indexOf(document.activeElement);
    if(current<0){focusLane=null;items[0].focus();return;}
    const rects=items.map(el=>el.getBoundingClientRect()), rect=rects[current];
    const horizontal=direction==='left'||direction==='right';
    const low=horizontal?'top':'left', high=horizontal?'bottom':'right';
    const fraction=focusLane?.item===items[current] && focusLane.horizontal===horizontal ? focusLane.fraction : .5;
    const lane=rect[low]+fraction*(rect[high]-rect[low]);
    const next=window.FightControls.menuNeighbor(rects,current,direction,lane);
    if(next===current)return;
    const dest=rects[next];
    focusLane={item:items[next],horizontal,fraction:clamp((lane-dest[low])/Math.max(1,dest[high]-dest[low]),0,1)};
    items[next].focus();
    tone(440,580,.035,0,'triangle',.026);
  }
  function nativeMenuInput() {
    if(document.body.classList.contains('pad-navigation'))document.body.classList.remove('pad-navigation');
  }
  window.addEventListener('pointerdown',()=>{nativeMenuInput();focusLane=null;},{capture:true,passive:true});
  window.addEventListener('keydown',nativeMenuInput,true);
  function menuBack() {
    if ($('dialog').open) {
      if(dialogType==='practice' && !$('practice-back').hidden)return $('practice-back').click();
      exitDialog();
      return;
    }
    if(page==='cup-select')return $('cup-back').click();
    if(page==='lobby' && !$('lobby-options').hidden)return leaveLobbyOptions();
    if (page === 'dispatch-story') $('story-map').click();
    else if (page === 'online-lobby' && !$('online-wait').hidden) showOnline();
    else if (page === 'dispatch-route' || page === 'lobby' || page === 'online-lobby') returnToHome();
  }
  window.addEventListener('keydown', (e) => {
    if(dialogType==='practice' && e.code==='Escape' && !e.isComposing){
      e.preventDefault();
      if(!e.repeat)menuBack();
      return;
    }
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
    if (['couch','stage-strike'].includes(dialogType) && couchPanel?.keyboard(e)) return;
    if(dialogType==='result' && world?.mode==='local' && !online.match &&
        ['set-pick','strike-next'].includes(document.activeElement?.dataset.do) && keys.some(map=>map.attack===e.code)) {
      e.preventDefault();
      if(!e.repeat)document.activeElement.click();
      return;
    }
    if (e.code === 'Escape' && !$('dialog').open) {
      e.preventDefault();
      menuBack();
      return;
    }
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.code)) {
      e.preventDefault();
      moveMenuFocus(e.code.slice(5).toLowerCase());
    }
  });
  function playPad(i,pads=currentPads){
    if(soloSeat && soloWorld===world)return !i?soloSeat.get(pads):null;
    if(finishTrial?.replySeats)return finishTrial.replySeats.get(i,pads);
    return finishTrial?.seats ? finishTrial.seats.get(i,pads) : finishTrial ? pads[0] : matchConfig?.couchSeats && (world.mode==='local' || world.team) ? matchConfig.couchSeats.get(i,pads) :
      world.hasSecondPlayer && !world.lesson && !online.match && pads.length === 1 ? (i === 1 ? pads[0] : null) : pads[i];
  }
  function playerInput(i, pads, fighterIndex = i, battle = world) {
    const map = keys[i];
    const tapped = (action) => taps.has(map[action]) || (!i && touchTaps.has(action));
    const key = (action) => held.has(map[action]) || (!i && touches.has(action)) || tapped(action);
    const pad=playPad(i,pads);
    const mapped=action=>{
      const n=layout.pad[i][action];
      return down(pad,n) && !(menuPadButtons.get(pad.index) & (1<<n));
    };
    const axis=n=>controls.movementAxis(pad?.axes?.[n]);
    const localLeft=key('left'),localRight=key('right'),padLeft=down(pad,14),padRight=down(pad,15);
    const left=localLeft || padLeft,right=localRight || padRight;
    const horizontal=horizontalInputs[i],padSide=horizontal.samplePad(pad,padLeft,padRight);
    const x=localLeft || localRight ? horizontal.keys(localLeft,localRight) : padSide;
    const rawX=left || right ? x : axis(0);
    // A direction released after Attack still belongs to that tap when both edges fall between game ticks.
    const aim = tapped('attack') ? attackAim[i] : null;
    const grabX=rawX || (!left && !right && aim?.rawX) || 0;
    const up = key('up') || down(pad, 12),
      downAim = key('down') || down(pad, 13);
    const y = Number(downAim) - Number(up);
    // Commit the direction on a keyboard or touch Smash press. A neutral press can still be chorded this tick.
    const savedSmash = tapped('smash') && (smashAim[i].rawX || smashAim[i].y) ? smashAim[i] : null;
    const digitalAim = left || right || up || downAim || (!i && touches.has('neutral'));
    const fighter=battle.dogs[fighterIndex],stick=strikeSticks[i];
    const stickCharging=fighter.smashCharge?.button==='aimStick';
    stick.sample(pad,stickCharging);
    const strikeTap = tapped('aimLeft') || tapped('aimRight') || tapped('aimUp') || tapped('aimDown');
    const keyAimX = strikeTap ? strikeAim[i].x : heldStrikeAxis(map.aimLeft,map.aimRight,strikeAim[i].x);
    const keyAimY = strikeTap ? strikeAim[i].y : heldStrikeAxis(map.aimUp,map.aimDown,strikeAim[i].y);
    const flick = !i && (touchFlick?.fired || touchTaps.has('aimStick')) ? flickAim : null;
    const aimStick = !!(stick.held || keyAimX || keyAimY || flick);
    const flickTap=!!(flick && touchTaps.has('aimStick'));
    const aimTap=stick.pressed || strikeTap || flickTap;
    // With an explicit Up + Jump chord the smash must reach the fighter before takeoff.
    if (!i && touchFlick?.deferSmash && !touchFlick.fired) {
      const f = battle.dogs[fighterIndex];
      if ((y < 0 && f.ground >= 0 && (tapped('jump') || f.jumpSquat)) || performance.now() - touchFlick.started >= 110)
        touchFlick.committed = true;
    }
    const touchSmash = !i && touches.has('smash') && (!touchFlick?.deferSmash || touchFlick.committed);
    const smash=held.has(map.smash) || tapped('smash') || touchSmash || mapped('smash');
    const smashPress=tapped('smash') || (smash && !fighter.prev?.smash);
    // When two controls share the aim axes, the new command owns the direction.
    const useStickAim=aimStick && (aimTap || !fighter.prev?.aimStick || !smash || (stickCharging && !smashPress));
    const useFlick=flick && (flickTap || !stick.pressed && !strikeTap);
    const useKeys=(keyAimX || keyAimY) && (strikeTap || !stick.pressed);
    const fromCenter = !i && touchPointers.get(walkPointer)?.dataset.touch;
    // A quick thumb release can leave queued direction taps after the center-slide gesture ends.
    const tappedWalk = aim?.x === x * (64 / 127) && x !== 0;
    const walk = key('walk') || tappedWalk || (fromCenter && (fromCenter.endsWith('left') || fromCenter.endsWith('right')));
    // Remapped analog triggers can guard before their native pressed threshold.
    const grounded = fighter.ground >= 0;
    const shieldValue=n=>(menuPadButtons.get(pad?.index)&(1<<n))?0:pad?.buttons[n]?.value || 0;
    const squeeze=Math.max(shieldValue(layout.pad[i].shield),shieldValue(layout.pad[i].shieldAlt));
    const shield = key('shield') || mapped('shield') || mapped('shieldAlt') || grounded && squeeze>=.18;
    const shortHop = key('hop') || mapped('hop');
    const gentleGuard = shield && grounded && (key('walk') || fromCenter);
    const softCrawl = battle.dogs[fighterIndex].kit.crawl && fromCenter && fromCenter.startsWith('down-');
    const gentleDown = y > 0 && !shield && (key('walk') || fromCenter === 'down' || softCrawl || aim?.y === 64 / 127);
    const side = left || right ? x*(walk?64/127:1) : rawX || aim?.x || 0;
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
      smash,
      aimStick,
      tiltMode: settings[i?'tiltStick2':'tiltStick'] && aimStick,
      smashX: useStickAim ? (useFlick?flick.x:useKeys?keyAimX:stick.x) : savedSmash?.rawX ?? rawX,
      smashY: useStickAim ? (useFlick?flick.y:useKeys?keyAimY:stick.y) : savedSmash?.y ?? (y || axis(1)),
      special: key('special') || mapped('special'),
      shield,
      ...(grounded && shield && (key('walk') || !i && touches.has('neutral') || down(pad,10) ||
        !key('shield') && squeeze>=.18 && squeeze<.72)?{lightShield:true}:{}),
      grab: key('grab') || mapped('grab'),
      tapped: {
        jump: tapped('jump') || tapped('hop'),
        attack: tapped('attack'),
        smash: tapped('smash'),
        aimStick: aimTap,
        special: tapped('special'),
        shield: tapped('shield'),
        grab: tapped('grab'),
      },
    };
    const trial = !i && battle.spacingPractice?.pattern === 'landing' ? battle.spacingPractice.flickJump : undefined;
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
  function checkSoloPad(pads){
    const one=page==='match' && world && !online.match && !world.warmupPartner &&
      (finishTrial?!finishTrial.seats && !finishTrial.replySeats && !finishTrial.player.outcome && finishTrial.player.battle.end===null:
      world.end===null && !world.finished && (!!world.lesson || !world.hasSecondPlayer));
    if(!one){soloSeat=soloWorld=null;return;}
    if(soloWorld!==world){soloWorld=world;soloSeat=new controls.SoloSeat();}
    soloSeat.track(pads,!paused && !dialogType && !document.hidden,layout.pad[0]);
    if(!soloSeat.lost || (dialogType && dialogType!=='solo-pad-loss'))return;
    if(dialogType!=='solo-pad-loss'){
      const touch=matchMedia('(pointer:coarse)').matches;
      showDialog('solo-pad-loss','Controller disconnected','<p>Your game is paused.</p><p id="solo-pad-info" role="status"></p>'+
        '<div class="dialog-actions"><button id="solo-pad-backup" class="primary">Resume with '+(touch?'touch':'keyboard')+'</button></div>',false);
      $('solo-pad-backup').onclick=()=>{
        soloSeat.useOtherInput(getPads(),true);schoolDevice=touch?2:0;
        dismiss();announce('Game resumed.');
      };
      $('solo-pad-backup').focus({preventScroll:true});
    }
    const info=$('solo-pad-info');
    const message=pads.length?'Center the sticks and release all buttons, then choose a controller. '+pads.map(p=>'Pad '+(p.index+1)+' · Press '+padNames(0,p)[0]).join(' / '):
      'Reconnect your controller or connect another one to take over.';
    if(info.textContent!==message)info.textContent=message;
  }
  function openCouchPads(source){
    const lobby=page==='lobby',seats=lobby?lobbySeats || new controls.Seats(getPads()):matchConfig.couchSeats;
    function back(){
      if(source==='lobby'){dismiss();$('controls').focus();return;}
      if(source==='controls')showControls();
      else if(source==='pad-loss'){dismiss();checkLocalPads(getPads());}
      else showPause();
      $('dialog-body').querySelector('[data-do=couch-pads]')?.focus();
    }
    if(!window.CouchControllers || !versusStyled)return waitForDispatch('Assign controllers',()=>loadVersusPanel('CouchControllers'),()=>openCouchPads(source),back);
    couchPanel=window.CouchControllers.panel({seats,showDialog,back,pads:()=>currentPads,keyFor,confirmName:(i,p)=>padNames(i,p)[0],
      fighters:lobby?[fighters[settings.p1].name,fighters[settings.p2].name]:(world.team || world.dogs).map(f=>f.stats.name),save(draft){
        seats.copyFrom(draft);seats.present=seats.connected(getPads());
        lobbySeats=seats;
        if(source!=='pad-loss')seats.lost=0;
        back();
      }});
  }
  const padLossDirection=new Map();
  function resumeLocalCountdown() {
    for(const pad of getPads()){
      const pressed=pad.buttons.slice(0,8).reduce((mask,b,i)=>b.pressed?mask|(1<<i):mask,0);
      if(pressed)menuPadButtons.set(pad.index,pressed);
    }
    dismiss();
    if(world.suddenDeath?.intro>0)return;
    if(world.team)return;
    view.entrance=null;
    countdown=2.4;
    lastCount=0;
    view.resumeGoUntil=world.matchFrames+22;
    $('countdown').textContent='3';
    announce('Resuming in three.');
  }
  function checkLocalPads(pads) {
    const seats=matchConfig?.couchSeats;
    if(!seats || world.end!==null || online.match || finishTrial || clipScreen || victoryShot)return;
    const before=seats.present, lost=seats.lost,version=seats.version;
    seats.track(pads);
    if(!seats.lost || (dialogType && dialogType!=='pad-loss'))return;
    if(dialogType!=='pad-loss'){
      padLossDirection.clear();
      showDialog('pad-loss','Controller disconnected','<p id="pad-loss-info" role="status"></p><div id="pad-loss-seats"></div><div class="dialog-actions"><button id="pad-resume" class="primary"></button><button class="utility" data-do="couch-pads">Assign controllers</button></div>',false);
      $('pad-resume').onclick=()=>{
        seats.lost=0;
        resumeLocalCountdown();
      };
      $('pad-resume').focus({preventScroll:true});
    }else if(before===seats.present && lost===seats.lost && version===seats.version)return;
    const labels=mask=>['P1','P2'].filter((_,i)=>mask & (1<<i)).join(' and ');
    const missing=seats.lost & ~seats.present;
    $('pad-loss-info').textContent=missing?labels(missing)+' lost controller input. Reconnect a pad or use the keyboard.':
      'Both fighters are ready.';
    $('pad-loss-seats').replaceChildren(...[0,1].map(i=>{
      const line=document.createElement('p'), pad=seats.get(i,pads);
      line.textContent='P'+(i+1)+' · '+(pad?'Pad '+(pad.index+1)+(pad.id?' · '+pad.id:''):'Keyboard · '+keyFor(i,'left')+' / '+keyFor(i,'right')+' move · '+
        keyFor(i,'jump')+' jump · '+keyFor(i,'attack')+' attack · '+keyFor(i,'shield')+' shield');
      return line;
    }));
    $('pad-resume').textContent=missing?'Use keyboard for '+labels(missing):'Resume match';
    for(const p of pads)if(controls.menuDirection(p,'right'))padLossDirection.set(p.index,p.id);
    // A held activation button on a returning pad must not confirm its own reconnection.
    oldPad={...oldPad,confirm:pads.some(p=>down(p,0)),back:pads.some(p=>down(p,1)),pause:pads.some(p=>down(p,9))};
  }
  const menuRepeat=new window.FightControls.MenuRepeat();
  function padMenu(pads,time) {
    const pairing=dialogType==='couch-pads' && couchPanel?.poll(pads);
    const reading=clipScreen?.aimReader?.poll(pads);
    if(dialogType==='controls' && (controlsShown[0]!==padNames(0,seatPad(0)) || controlsShown[1]!==padNames(1,seatPad(1)) || controlsShown[2]!==layout)){
      $('dialog-body').querySelector('.control-table').outerHTML=controlTable();
    }
    if(dialogType==='bindings' && edit.device==='pad'){
      const names=padNames(edit.slot,seatPad(edit.slot,pads));
      if(names!==edit.legend){drawLayouts();}else if(edit.mode==='test')showTestInputs(pads);
    }
    if(!dialogType && pads.length>1 && soloSeat?.index!=null && !soloSeat.lost){
      const owner=soloSeat.get(pads);
      if(owner)pads=[owner];
    }
    if (!pads.length) {
      if(dialogType==='solo-pad-loss')soloSeat?.confirm(pads);
      if (oldPad!==idlePad) { oldPad=idlePad; menuPadButtons.clear();menuRepeat.poll('','',time); }
      return;
    }
    // A and B also fight. Consume menu presses until that particular pad releases them.
    const menuOpen = page !== 'match' || $('dialog').open;
    for (const pad of pads) {
      const claimed=menuOpen ? (dialogType==='code-pad'?7:3) : 0;
      let used=(menuPadButtons.get(pad.index) || 0) | claimed;
      for(let mask=used;mask;mask&=mask-1){
        const bit=mask & -mask;
        if(!down(pad,31-Math.clz32(bit)))used &= ~bit;
      }
      if (used) menuPadButtons.set(pad.index, used);
      else menuPadButtons.delete(pad.index);
    }
    const any = (i) => pads.some((p) => down(p, i));
    let direction='', padIndex=null;
    for(const pad of pads){
      if(dialogType==='pad-loss' && padLossDirection.has(pad.index) && padLossDirection.get(pad.index)===pad.id){
        if(!controls.menuDirection(pad,'right'))padLossDirection.delete(pad.index);
        continue;
      }
      direction=controls.menuDirection(pad,pad.index===oldPad.padIndex ? oldPad.direction : '',dialogType!=='stick-setup');
      if(direction){padIndex=pad.index;break;}
    }
    const now = {
      pause: any(9),
      example: any(8),
      freeze: any(10),
      step: any(11),
      confirm: any(0),
      erase: any(2),
      back: any(1),
      direction,padIndex,
    };
    const move=menuRepeat.poll(direction,menuOpen && !document.hidden ? dialogType || page : '',time);
    const back=now.back && !oldPad.back, confirm=now.confirm && !oldPad.confirm;
    if(pairing){if(back)couchPanel.cancel();oldPad=now;return;}
    if(reading){if(back)clipScreen?.aimReader?.cancel();oldPad=now;return;}
    if(dialogType==='solo-pad-loss'){
      oldPad=now;
      const pad=soloSeat?.confirm(pads);
      if(pad){
        menuPadButtons.set(pad.index,1);schoolDevice=1;
        dismiss();announce('Pad '+(pad.index+1)+' connected. Game resumed.');
      }
      return;
    }
    if(menuOpen && (move || back || confirm || now.pause && !oldPad.pause)){
      document.body.classList.add('pad-navigation');
      const pad=pads.find(p=>p.index===padIndex || down(p,0) || down(p,1) || down(p,9)) || pads[0];
      const names=padNames(Math.min(1,pads.indexOf(pad)),pad);
      $('pad-legend').textContent='D-pad · Choose   '+names[0]+' · Select   '+names[1]+' · Back';
    }
    if(dialogType==='couch' || dialogType==='stage-strike'){oldPad=now;return;}
    if(dialogType==='bindings' && edit.mode==='test' && edit.device==='pad'){
      if(now.pause && !oldPad.pause)leaveLayouts();
      oldPad=now;return;
    }
    if (!musicUnlocked && now.confirm && !oldPad.confirm) unlockMusic();
    if(dialogType==='code-pad' && now.erase && !oldPad.erase){
      document.body.classList.add('pad-navigation');
      $('code-erase').click();
    }else if (now.pause && !oldPad.pause) {
      if (dialogType === 'pause' || dialogType === 'online-menu' || dialogType==='finish-pause') dismiss();
      else if (page === 'match' && !dialogType) showPause();
      else if (page === 'dispatch-story' && !dialogType) toggleFilm();
      else if(arenaPreview)$('arena-confirm').click();
      else if (page === 'lobby' && !dialogType) $('start').click();
    } else if (!finishTrial && world?.lesson && !menuOpen && !$('school-recording').hidden && now.step && !oldPad.step) {
      openLessonRecording();
    } else if (!finishTrial && world?.lesson && !menuOpen && now.example && !oldPad.example) {
      replaySchoolLesson(true);
    } else if (!finishTrial && (world?.lesson?.done || world?.lesson?.example) && !menuOpen && now.confirm && !oldPad.confirm) {
      for (const pad of pads) if (down(pad,0)) menuPadButtons.set(pad.index,1);
      nextLesson();
    } else if (page === 'match' && world?.mode === 'training' && !world.warmupPartner && !$('dialog').open &&
        (now.freeze && !oldPad.freeze || now.step && !oldPad.step)) {
      // Clicking the left stick while guarding changes shield strength in training, too.
      const guardChord=pads.some(p=>down(p,10) && [layout.pad[0].shield,layout.pad[0].shieldAlt].some(n=>down(p,n) || p.buttons[n]?.value>=.18));
      if (now.freeze && !oldPad.freeze) {
        if (!guardChord) toggleFrames();
      } else stepTrainingFrame();
    } else if (menuOpen && back) {
      menuBack();
    } else if (menuOpen && (move || confirm)) {
      const items = menuButtons();
      const active=document.activeElement, horizontal=direction==='right'?1:direction==='left'?-1:0;
      if(move){
        if(horizontal && active instanceof HTMLSelectElement && items.includes(active)){
          const options=[...active.options].filter(o=>!o.matches(':disabled'));
          if(options.length){
            const n=options.indexOf(active.selectedOptions[0]);
            active.selectedIndex=options[(n+horizontal+options.length)%options.length].index;
            active.dispatchEvent(new Event('change',{bubbles:true}));
          }
        }else if(horizontal && active.type==='range' && items.includes(active)){
          if(horizontal>0)active.stepUp();else active.stepDown();
          active.dispatchEvent(new Event('input',{bubbles:true}));
        }else moveMenuFocus(direction,items);
      }
      if(confirm){
        const target=items.includes(document.activeElement)?document.activeElement:items[0];
        if(target===$('online-code'))showCodePad();else target?.click();
      }
    }
    oldPad = now;
  }
  function roundCall(w) {
    if(w.eventId && w.end!==null)return w.end===0?'Clear!':w.endReason==='time'?'Time!':'Finish!';
    if (w.lesson) return '';
    if (w.endReason === 'time') return 'Time!';
    if (w.end!==null) return w.matchCard && (w.endReason==='ko' || w.endReason==='sudden')?'Game!':'';
    if (w.suddenDeath?.intro > 0) return 'Sudden Death';
    if (w.matchFrames < (view.resumeGoUntil ?? 0)) return 'GO!';
    if (w.suddenDeath) return w.suddenDeath.frames-(w.suddenDeath.startFrame || 0) < 22 ? 'GO!' : '';
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
    if (ended) {
      recordFight(match.confirmedWorld);
      online.finish(match.confirmedWorld.end);
    }
  }
  function frame(timestamp) {
    const now = timestamp / 1000,
      dt = Math.min(0.09, Math.max(0, now - before));
    before = now;
    const pads=getPads();
    if(pads.length && !currentPads.length)loadDispatch('PadFeedback').catch(()=>{});
    currentPads=pads;refreshController?.();
    checkSoloPad(pads);
    const couchMatch=page==='match' && (world?.mode==='local' || world?.team);
    if(couchMatch)checkLocalPads(pads);
    padMenu(pads,now);
    if(soloSeat?.lost && !dialogType)checkSoloPad(pads);
    if(couchMatch && matchConfig?.couchSeats?.lost && !dialogType)checkLocalPads(pads);
    if(arenaPreview && !document.hidden)arenaPreview.tick(dt);
    if(movePreview && !document.hidden)movePreview.tick(dt);
    if((dialogType==='couch' || dialogType==='stage-strike') && !document.hidden)couchPanel?.poll(pads,now);
    if (finishTrial) tickFinishTrial(dt,pads);
    else if (clipScreen) tickClip(dt);
    else if (victoryShot) { if (!document.hidden) drawVictory(dt); }
    else if (page === 'dispatch-story' && film && !document.hidden && !$('dialog').open) {
      film.tick(dt);
    } else if (page === 'lobby') {
      if (!document.hidden && !$('dialog').open) paintLobby(now);
    } else if (!paused && world?.mode === 'adventure') {
      runAdventure(dt, pads);
    } else if (!paused && world && dialogType!=='finish-film') {
      let steppedFrame = false;
      if(online.recovery){
        const seconds=Math.max(0,Math.ceil((online.recovery.until-Date.now())/1000));
        const caption='Reconnecting · '+seconds+'s';
        if($('countdown').textContent!==caption)$('countdown').textContent=caption;
      } else if (countdown > 0) {
        countdown = Math.max(0, countdown - dt);
        if(view.entrance){
          const intro=view.entrance;
          for(const f of world.dogs){
            const mark=1.96-.40*f.index;
            if(intro.remaining>mark && countdown<=mark)window.FighterEntrances?.cue(f.kind,tone);
          }
          intro.remaining=countdown;
          if(!countdown)view.entrance=null;
        }
        const number = Math.ceil(countdown / 0.8);
        if (number !== lastCount) {
          lastCount = number;
          sound(number ? 'tick' : 'go');
        }
        const caption=String(number || 'GO!');
        if($('countdown').textContent!==caption)$('countdown').textContent=caption;
        if (!number) {
          $('countdown').classList.remove('opponent-found');
          // Discard released countdown taps. Held keyboard and touch controls start with the stick on GO.
          taps.clear();
          touchTaps.clear();
          if (online.match) online.match.lastStep = performance.now();
          announce('Fight!');
        }
      } else if (online.match && !online.finished) {
        runOnline(dt, pads);
      } else if (world.end === null) {
        if (frameLab.mode === 'frozen') {
          accumulator = frameLab.pending > 0 ? 1 / 60 : 0;
          if (frameLab.pending > 0) frameLab.pending--;
        } else accumulator += world.lesson?.example || world.wallPractice?.heavy || world.launchPractice?.slow || world.edgePractice?.slow || world.footworkPractice?.slow || world.wavePractice?.slow || world.comboPractice?.slow || world.escapePractice?.slow || world.climbPractice?.slow || world.trumpPractice?.slow || world.platformPractice?.slow || world.spacingPractice?.slow || world.chasePractice?.slow || world.meteorPractice?.slow || world.stockPractice?.slow || world.survivalPractice?.slow || world.shieldPractice?.slow || world.airPractice?.slow ? dt / 2 : dt;
        const watchedStocks=corner && settings.stockBreaks && !practiceFight ? world.dogs[0].stocks : 0;
        while (accumulator >= 1 / 60 && world.end === null) {
          const slot = world.trainingPlayerSlot;
          const lesson=world.lesson;
          const input = lesson?.example ? (lesson.done || lesson.missed ? null : lesson.example.input()) : playerInput(0,pads,slot);
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
          if (input && !drillWaiting && (!world.lesson || world.lesson.canStep(input))) {
            const airborne = player.ground < 0;
            const second=world.lesson ? world.lesson.partner(input) : world.hasSecondPlayer ? playerInput(1,pads) : idleInput;
            finishTape?.record(world,input,second);
            world.step(1 / 60, input, second);
            corner?.target?.step(world);
            if(corner?.field){
              const card=corner.field;
              card.step(world,input);
              if(card.changed){
                card.changed=false;
                card.hud($('match-set'));
                const earned=Object.keys(card.marks).filter(id=>!schoolSave.passed.includes(id));
                if(earned.length){schoolSave.passed.push(...earned);saveSchool();}
              }
            }
            if(corner?.target?.doneAt!=null)corner.target.tapeFrame??=finishTape.count;
            spar?.step(world);
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
          const duel=matchConfig?.openingDuel;
          if(duel?.takePoint(world)){openOpeningDuel(duel.card,duel,'point');break;}
          if(watchedStocks>world.dogs[0].stocks && world.dogs[0].stockLift && world.end===null && !world.suddenDeath){
            showStockBreak();break;
          }
        }
        if (world.end!==null && !online.match) recordFight(world);
        const call=roundCall(world);
        if ($('countdown').textContent!==call) $('countdown').textContent=call;
        if (world.lesson) renderSchool(pads);
        if(corner){
          renderCorner(pads);
          const slot=schoolRuns.get(world);
          if(slot && world.end===null && (slot.losses!==world.matchCard.losses.length || world.matchFrames>=slot.nextSave)){
            slot.losses=world.matchCard.losses.length;slot.nextSave=world.matchFrames+900;
            saveFirstPosition(pausedFight()).catch(()=>{});
          }
        }
        if(spar && settings.cornerTips)spar.coach(world.matchFrames,promptDevice(pads),keyFor,padFor,$('corner-tip'),$('corner-title'),$('corner-line'));
        updateHUD();
      } else {
        resultDelay -= dt;
        if (resultDelay <= 0 && (online.match ? !['online-result','room-fighters','set-pick','match-card','finish-picker','finish-film','finish-stock','ko-replays'].includes(dialogType) : !$('dialog').open)) showResult();
      }
      if (world && (frameLab.mode !== 'frozen' || steppedFrame)) {
        const confirmed = online.match?.confirmedWorld;
        const waitingOnKO = confirmed && (world.end !== null && confirmed.end === null ||
          world.suddenDeath?.round !== confirmed.suddenDeath?.round);
        const studying = !!world.survivalPractice?.preview;
        const result=confirmed || world;
        view.draw($('game'), waitingOnKO ? confirmed : world, studying ? 0 : frameLab.mode === 'frozen' ? 1/60 : dt,
          studying ? world.time : frameLab.mode === 'frozen' ? frameLab.renderTime : now, result, matchFinishPhase(result));
      }
    }
    updateMusic();
    requestAnimationFrame(frame);
  }
  updateAudio();
  function openFilmLibraryLink() {
    showRoute(()=>showReels());
  }
  function openLink() {
    const hash = location.hash;
    const openingStages = {'#solo/night-mail':'nightmail', '#solo/picnic-table':'picnic', '#solo/canal-lock':'canal'};
    const [,arena,form] = hash.split('/');
    if(arena==='events' && hash.startsWith('#solo/'))return eventBoard(form);
    if(Object.hasOwn(fighters,arena) && Object.hasOwn(specialInputs,form) && hash==='#moves/'+arena+'/'+form){
      showHome(false);showSpecialPreview({kind:arena,side:form,page:'home',paused:false});
    }else if(hash==='#solo/arenas' || hash==='#local/arenas'){
      settings.mode=hash.startsWith('#local')?'local':'solo';editing=0;toLobby();chooseArena();
    }else if(hash==='#local/stage-run' || hash==='#solo/stage-run'){
      settings.mode=hash.startsWith('#local')?'local':'solo';editing=0;toLobby();stageRunBoard(lobbyMatchup());
    }else if(hash==='#local/first-hit' || hash==='#solo/first-hit'){
      settings.mode=hash.startsWith('#local')?'local':'solo';editing=0;toLobby();openOpeningDuel(lobbyMatchup());
    }else if(/^#(solo|local)\/matchup(?:\/|$)/.test(hash)){
      showHome(false);showMatchup(hash,'shared');
    }else if(hash==='#arcade/disc-range'){
      waitForDispatch('Disc Range',()=>loadDispatch('FighterSchool'),()=>startFighterLesson('clover',-2,true),()=>showHome());
    }else if(/^#(solo|local)\/tryouts(?:\/(pip|brisket|noodle|clover))?$/.test(hash)){
      settings.mode=hash.startsWith('#local')?'local':'solo';editing=0;toLobby();openTryout(form);
    }else if(/^#online\/rules(?:\/|$)/.test(hash)){
      showOnline('','',()=>openRulebook(hash));
    }else if(/^#(local|solo)\/rules(?:\/|$)/.test(hash)){
      settings.mode=hash.startsWith('#local')?'local':'solo';editing=0;toLobby();openRulebook(hash);
    }else if(hash==='#local/pack-relay' || hash==='#solo/pack-relay'){
      settings.mode=hash.startsWith('#local')?'local':'solo';
      editing=0;toLobby();openRelay();
    }else if(hash==='#local/stage-strike' || hash==='#solo/stage-strike'){
      settings.mode=hash.startsWith('#local')?'local':'solo';editing=0;toLobby();openStrikeSet();
    }else if(hash==='#local/winner-stays' || hash==='#local/tournament'){
      settings.mode='local';editing=0;toLobby();rotationBoard(hash==='#local/tournament');
    }else if(hash==='#local/depot-doubles' || hash==='#local/stock-share'){
      settings.mode='local';editing=0;toLobby();openDepotDuo(hash==='#local/stock-share');
    }else if (hash==='#local/pick-together' || hash==='#local/best-of-three') {
      if(hash==='#local/best-of-three')settings.bestOfThree=true;
      settings.mode='local';editing=0;toLobby();pickTogether();
    } else if(Object.hasOwn(fighters,arena) && ['recovery','signature','spar'].includes(form) && hash==='#fighters/'+arena+'/'+form){
      showHome(false);
      waitForDispatch('Fighter lessons',()=>loadDispatch('FighterSchool'),()=>form==='spar'?startSparring(arena):startFighterLesson(arena,form==='recovery'?1:0),()=>showHome());
    } else if(hash==='#fighters' || (hash==='#fighters/'+arena && Object.hasOwn(fighters,arena))){
      showHome(false);
      fighterSheet(arena || 'pip');
    } else if(hash==='#records/study' || hash==='#records/study/stock'){
      showHome(false);sampleReplay(hash.endsWith('/stock'));
    } else if (hash==='#records') {
      showHome(false);
      showRecords();
    } else if (hash==='#parcel-punt' || (hash==='#parcel-punt/'+arena && Object.hasOwn(fighters,arena))){
      showHome(false);parcelSheet(arena || 'pip');
    } else if (hash==='#bells' || (hash==='#bells/'+arena && Object.hasOwn(fighters,arena))) {
      showHome(false);
      bellSheet(arena || 'pip');
    } else if (/^#arcade\/(pip|brisket|noodle|clover)\/relay\/[23]$/.test(hash)) {
      showHome(false);cupSheet(arena);
    } else if (hash === '#arcade' || (hash === '#arcade/'+arena && Object.hasOwn(cup.courses,arena))) {
      showHome(false);
      cupSheet(arena);
    } else if (hash === '#solo/'+arena+'/'+form && Object.hasOwn(arenas,arena) && Object.hasOwn(stageForms,form)) {
      leaveOnline();
      afterStory = null;
      startMatch({...settings,mode:'solo',p1:'pip',p2:'brisket',cpuLevel:'arcade',stage:arena,form,fetch:false,minutes:7},undefined,17);
    } else if (hash === '#solo/mirror') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings,mode:'solo',p1:'pip',p2:'pip',coats:[0,1],stage:'picnic',fetch:false,cpuLevel:'arcade',minutes:7},undefined,17);
    } else if (hash === '#solo/best-of-three') {
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
    } else if (hash === '#solo/runoff-trump') {
      startRunoffFight('left','pip','brisket','nightmail','original');
    } else if (/^#solo\/(?:ledge-trap|guard-the-return)(?:\/(pip|brisket|noodle|clover)(?:\/(left|right))?)?$/.test(hash)) {
      startLedgeFight('pip',form || 'brisket',hash.split('/')[3],arena==='guard-the-return');
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
    } else if (hash === '#solo/tech-chase') {
      leaveOnline();afterStory=null;
      startMatch({...settings,p1:'brisket',p2:'clover',mode:'solo',stage:'picnic',form:'original',
        cpuLevel:'rival',lives:3,stockCount:3,timeBattle:false,minutes:7,fetch:false},undefined,61);
    } else if (hash === '#solo/shield-punish') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'brisket', p2:'pip', mode:'solo', stage:'picnic', cpuLevel:'rival',
        minutes:7, fetch:false}, undefined, 75);
    } else if (hash==='#solo/drop-catch' || hash==='#solo/defend-drop'){
      startDropCatch(hash==='#solo/defend-drop');
    } else if (hash==='#solo/fetch' || hash==='#local/fetch') {
      startFetchMatch(hash.startsWith('#local')?'local':'solo');
    } else if (/^#(solo|local)\/final-count(?:\/(defend|chase))?$/.test(hash)) {
      startFinalCount(hash.slice(1).split('/')[0],undefined,undefined,form || true);
    } else if (hash === '#solo/time-battle') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings,p1:'pip',p2:'brisket',mode:'solo',stage:'picnic',cpuLevel:'rival',minutes:1,fetch:false,timeBattle:true},undefined,42);
    } else if (/^#solo\/throw-read\/(perch|edge)$/.test(hash)) {
      startThrowRead(hash.split('/').pop());
    } else if (/^#solo\/platform-read\/(pip|brisket|noodle|clover)$/.test(hash)) {
      startPerchFight(hash.split('/').pop(),'pip');
    } else if (hash==='#solo/stock-return/perch') {
      startLiftFight('brisket','pip',true);
    } else if (/^#solo\/stock-return\/(pip|brisket|noodle|clover)$/.test(hash)) {
      startLiftFight(hash.split('/').pop(),'pip');
    } else if (/^#solo\/landing-read\/(stay|through)$/.test(hash)) {
      startLandingRead(hash.split('/').pop(),'pip','brisket');
    } else if (/^#solo\/dash-back\/(bait|watch|delay)$/.test(hash)) {
      startDashBack(hash.split('/').pop());
    } else if (hash === '#solo/last-stock') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, p1:'pip', p2:'brisket', mode:'solo', stage:'nightmail', cpuLevel:'rival',
        minutes:7, fetch:false, lastStockStart:true}, undefined, 42);
    } else if (/^#(solo|local)\/sudden-death\/(gap|perch)$/.test(hash)) {
      const [mode,,opening]=hash.slice(1).split('/');
      startClosingFight(opening,mode);
    } else if (hash === '#solo/sudden-death') {
      leaveOnline();
      afterStory = null;
      startMatch({ ...settings, p1:'pip', p2:'brisket', mode:'solo', stage:'picnic', cpuLevel:'arcade', suddenStart:true }, undefined, 17);
    } else if (arena==='free' && hash==='#training/free/'+form && Object.hasOwn(fighters,form)) {
      leaveOnline();afterStory=null;
      startMatch({...settings,mode:'training',p1:form,p2:form==='brisket'?'pip':'brisket',stage:'picnic',fetch:false},undefined,42);
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
    } else if (/^#music\/(picnic|laundry|bandstand|nightmail|canal)$/.test(hash)) {
      showHome(false);openStageMusic(hash.split('/')[1]);
    } else if (hash === '#sound-test') {
      showHome(false);showSoundTest();
    } else if(hash==='#controls/sticks'){
      showHome(false);openStickSetup('controls');
    } else if(hash==='#controls/rumble'){
      showHome(false);openRumble('controls');
    } else if(hash==='#controls/controller'){
      showHome(false);controllerCheck('controls');
    } else if (hash === '#controls') {
      showHome(false);openLayouts('home');
    } else if(hash==='#local/controllers'){
      leaveOnline();settings.mode='local';editing=0;toLobby();openCouchPads('lobby');
    } else if (hash === '#local/profiles') {
      leaveOnline();settings.mode='local';editing=0;toLobby();openProfiles('lobby',0);
    } else if (hash==='#tutorial/guided' || hash.startsWith('#tutorial/guided/') && schoolLessons.some(l=>l.id===hash.split('/')[2])) {
      settings.guidedLessons=true;save();
      const index=schoolLessons.findIndex(l=>l.id===hash.split('/')[2]);
      if(index<0)resumeCourse();else startLesson(index);
    } else if(hash==='#tutorial/second-chance'){
      recoveryClinic(true,true,null,'reply');
    } else if(hash==='#tutorial/launch-lab'){
      recoveryClinic(true,true,undefined,true);
    } else if (hash==='#tutorial/launch-survival') {
      recoveryClinic(false,true);
    } else if(/^#tutorial\/recovery\/(pip|brisket|noodle|clover)$/.test(hash)){
      recoveryClinic(false,false,hash.split('/')[2]);
    } else if (hash==='#tutorial/recovery' || hash==='#tutorial/recovery/wide') {
      recoveryClinic(hash.endsWith('/wide'));
    } else if (['#tutorial/landings','#tutorial/ledge','#tutorial/stage-tech','#tutorial/stage-tech/heavy','#tutorial/stage-tech/ceiling'].includes(hash)) {
      const kind=hash.split('/').at(-1);
      replayClinic(kind==='stage-tech'?'wall':kind==='landings'?'floor':kind);
    } else if (hash === '#tutorial/field') {
      startFirstFight(null,true);
    } else if (hash === '#tutorial/first-match') {
      startFirstFight();
    } else if (hash === '#tutorial') {
      resumeCourse();
    } else if(hash==='#training/hit-confirm'){
      leaveOnline();afterStory=null;
      startMatch({...settings,mode:'training',stage:'nightmail',fetch:false});
      drill('combo',false,'confirm');
    } else if(hash==='#training/throw-chase'){
      leaveOnline();afterStory=null;
      startMatch({...settings,mode:'training',p1:'brisket',p2:'pip',stage:'nightmail',fetch:false});
      world.setDummyDamage(60);drill('combo',false,'throwChase','diMix');
    } else if (/^#(training|solo)\/dash-pressure(?:\/(pip|brisket|noodle|clover)\/(pip|brisket|noodle|clover))?$/.test(hash)) {
      const [,,p1='brisket',p2='pip']=hash.split('/');
      if(hash.startsWith('#solo'))startDashPressure(p1,p2);
      else{
        leaveOnline();afterStory=null;
        startMatch({...settings,mode:'training',stage:'picnic',form:'original',p1,p2,fetch:false});
        drill('combo',false,'dashPressure','punish');
      }
    } else if (hash === '#training/compare-defenses') {
      leaveOnline();afterStory=null;
      startMatch({...settings,mode:'training',p1:'brisket',p2:'pip',stage:'nightmail',fetch:false});
      drill('combo',false,'late','strike');
    } else if (hash === '#training/shield-punish') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'brisket', p2:'pip', stage:'nightmail', fetch:false});
      drill('combo', false, 'record', 'punish');
    } else if (hash === '#training/tapes' || hash.startsWith('#training/tapes/')) {
      showHome(false);practiceTapes(hash);
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
    } else if (hash === '#training/dash-shield' || hash === '#training/hold-center' || hash === '#training/brace') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'brisket', stage:'nightmail', fetch:false});
      drill('footwork',false,hash==='#training/brace'?'brace':hash==='#training/hold-center'?'center':'dashShield');
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
    } else if (hash === '#training/roll-habit') {
      leaveOnline();afterStory=null;practiceSide='left';
      startMatch({...settings,mode:'training',p1:'pip',p2:'brisket',stage:'picnic',fetch:false});
      drill('roll',false,'scout');
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
    else if (hash === '#solo' || hash === '#local') {
      settings.mode = hash.slice(1);
      editing = 0;
      toLobby();
    }
    else if (hash === '#cutscenes') openFilmLibraryLink();
    else if (hash === '#adventure/dead-letter-lift') {selectChapter(yardChapter);showRoute(()=>showLiftTicket());}
    else if (hash === '#adventure') showRoute();
    else if (hash === '#online') showOnline();
    else if (hash === '#online/best-of-three') {
      showOnline('', '', () => {
        setRoomFormat(true);
        updateRoomSetup();
        $('online-create').focus({preventScroll:true});
      });
    }
    else if (hash === '#training/corner-pressure' || hash === '#training/light-shield') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'picnic', fetch:false });
      drill('edge', false, hash === '#training/light-shield'?'light':'corner');
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
    else if (hash === '#training/wall-jumps' || hash === '#training/impact-tech' || hash === '#training/ceiling-tech' || hash === '#training/wall-spring') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'laundry', fetch:false });
      drill('wall', false, 'left', hash === '#training/wall-spring' ? 'spring' : hash === '#training/ceiling-tech' ? 'ceiling' : hash === '#training/impact-tech' ? 'impact' : 'pip');
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
    else if (hash === '#training/read-the-tech') {
      leaveOnline();afterStory=null;
      startMatch({...settings,mode:'training',p1:'pip',p2:'clover',stage:'picnic',fetch:false});
      drill('launch',false,'readTech');
    }
    else if (hash === '#training/get-up') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'pip', p2:'clover', stage:'picnic', fetch:false});
      drill('launch', false, 'bait');
    }
    else if (hash === '#training/boost-grab' || hash === '#training/dash-up-smash') {
      leaveOnline();
      afterStory = null;
      startMatch({...settings, mode:'training', p1:'brisket', p2:'pip', stage:'picnic', fetch:false});
      drill('footwork',false,hash==='#training/boost-grab'?'boostGrab':'boostSmash');
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
    else if (hash === '#training/runoff-trump' || hash === '#training/escape-runoff') {
      afterStory=null; practiceSide='left';
      startMatch({...settings,mode:'training',p1:'pip',p2:'brisket',stage:'nightmail',fetch:false});
      drill('trump',false,hash==='#training/runoff-trump'?'runoff':'escape');
    }
    else if (hash === '#training/beat-the-edgeguard') {
      afterStory = null;
      practiceSide = 'left';
      startMatch({...settings,mode:'training',p1:'pip',p2:'brisket',stage:'picnic',fetch:false});
      drill('air',false,'highReturn');
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
      drill('spacing', false, 'landing',undefined,hash==='#training/flick-jump'?'flick':undefined);
    }
    else if (hash === '#training/landing-cancel') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'brisket', p2: 'pip', stage: 'picnic', fetch: false });
      drill('spacing', false, 'cancel');
    }
    else if (hash.startsWith('#room/')) {
      const code = hash.slice(6).toUpperCase();
      showOnline(code?'':'This invite has an invalid room code.',code);
    } else showHome();
  }
  window.addEventListener('hashchange', openLink);
  const initialFocus = document.activeElement;
  openLink();
  if (page === 'home' && !$('dialog').open && $('home').contains(initialFocus) && initialFocus.matches('button') &&
      !initialFocus.disabled && !initialFocus.closest('[hidden]')) initialFocus.focus({preventScroll:true});
  requestAnimationFrame(frame);
  document.dispatchEvent(new CustomEvent('dogfight-ready', {detail:{
    resumeLatest,
    consumePad(index,held) {
      // A confirm held across startup must not also jump or confirm the next menu.
      menuPadButtons.set(index, held);
      oldPad = {...oldPad, confirm:oldPad.confirm || !!(held & 1), back:oldPad.back || !!(held & 2)};
    }
  }}));
})();
