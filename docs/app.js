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
    idleInput,
    isReversalPractice,
    isFootstoolPractice,
    cpuLevels,
    seededRandom,
    clamp,
  } = window.DogFight;
  const { FightView, drawPreview, drawMoveThumbnail } = window.DogFightView;
  const $ = (id) => document.getElementById(id);
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
    p1: 'pip',
    p2: 'brisket',
    fetch: true,
    sound: true,
    volume: 75,
    shake: true,
    tiltStick: false,
  };
  try {
    const s = JSON.parse(localStorage.getItem('dog-fight-3.config') || '{}');
    if (Object.hasOwn(arenas, s.stage)) settings.stage = s.stage;
    if (Object.hasOwn(modes, s.mode)) settings.mode = s.mode;
    if (Object.hasOwn(cpuLevels, s.cpuLevel)) settings.cpuLevel = s.cpuLevel;
    for (const slot of ['p1', 'p2']) if (Object.hasOwn(fighters, s[slot])) settings[slot] = s[slot];
    for (const key of ['fetch', 'sound', 'shake', 'tiltStick']) if (typeof s[key] === 'boolean') settings[key] = s[key];
    if (Number.isFinite(s.volume)) settings.volume = Math.max(0, Math.min(100, s.volume));
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
    document.querySelectorAll('.touch-pad .held').forEach((el) => el.classList.remove('held'));
  }
  let audioContext;
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
    if (name === 'hit') {
      if (detail.lock) {
        const note = detail.lock === 2 ? 285 : 206;
        tone(note, 78, 0.061, 0, 'triangle', 0.09);
        tone(note * 2, note, 0.032, 0.018, 'square', 0.031);
      } else if (detail.timing === 'late' && !detail.emphatic) {
        const pitch = { pip: 410, brisket: 155, noodle: 325, clover: 510 }[detail.owner.kind];
        tone(pitch, pitch * 0.63, 0.045, 0, 'triangle', 0.09);
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
    } else if (name === 'landingCancel') {
      tone(540, 760, 0.055, 0, 'triangle', 0.055);
    } else if (name === 'wallTech' || name === 'wallTechJump') {
      tone(630, 920, 0.052, 0, 'triangle', 0.075);
      if (name === 'wallTechJump') tone(870, 1440, 0.082, 0.04, 'square', 0.024);
    } else if (name === 'wallBounce') {
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
    if (online.match) return 'P' + (i + 1) + (i === online.side ? ' · YOU' : '');
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
    $('rules-label').innerHTML = icon('paw') + (settings.mode === 'training' ? 'Unlimited' : '3 stocks');
    $('start').innerHTML =
      icon('play') + '<span>' + (settings.mode === 'training' ? 'Start training' : 'Start fight') + '</span>';
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
    if (dialogType === 'result' || dialogType === 'dispatch-fall' || dialogType === 'online-result') return;
    if ((dialogType === 'controls' || dialogType === 'moves' || dialogType === 'cpu-level') && backToPause) {
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
  $('choose-stage').onclick = () => {
    const rows = Object.entries(arenas).map(
      ([id, a]) =>
        '<button class="stage-option" type="button" data-stage="' +
        id +
        '" aria-pressed="' +
        (id === settings.stage) +
        '"><canvas width="300" height="169" aria-hidden="true"></canvas><span><strong>' +
        a.name +
        '</strong><small>' +
        a.description +
        '</small></span></button>',
    );
    showDialog('arenas', 'Choose arena', '<div class="stage-options">' + rows.join('') + '</div>');
    document.querySelectorAll('.stage-option').forEach((el) => {
      drawStageTile(el.querySelector('canvas'), el.dataset.stage);
    });
  };
  function showControls() {
    backToPause = page === 'match';
    const networkGame = !!online.match || page === 'online-lobby';
    const rows = [
      ['Move / aim', 'W A S D', 'Arrow keys', 'Stick / D-pad'],
      ['Walk', 'Left Shift + A / D', 'Right Ctrl + ← / →', 'Tilt left stick gently'],
      ['Jump', 'Space', 'Right Shift', 'A'],
      ['Attack / charge', 'J', ',', 'X'],
      ['Aim strike ← / → / ↑ / ↓', 'R / Y / T / G', 'Numpad 4 / 6 / 8 / 2', 'Right stick'],
      ['Smash / charge', 'I', 'N', settings.tiltStick ? 'RT' : 'RT / right stick'],
      ['Special', 'K', '.', 'B'],
      ['Shield / air dodge / tech', 'L', '/', 'LB / RB'],
      ['Tilt shield', 'L + Left Shift + direction', '/ + Right Ctrl + direction', 'Gentle stick / both bumpers + stick'],
      ['Grab / throw', 'U', 'M', 'Y'],
      [networkGame ? 'Match menu' : 'Pause', 'Esc', 'Esc', 'Start'],
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
      table +
        '<p>Flick a side to dash. Reverse in the first few steps to dash-dance. After a full run your dog plants its paws to turn. On touch, slide from the center dot onto a side arrow to walk, or tap a side arrow to dash.</p>' +
        '<p>In a running jump, tap the opposite direction with Jump to turn your dog while carrying your speed. Steer back toward the rival and hit them with your back air. In the air you can aim a strike independently with the right stick, the aim keys, or a swipe out from Smash on touch.</p>' +
        '<p>On a raised platform, flick Down to drop through with an air jump in reserve. Tap Attack as you fall to swing. Press Down and Attack together to keep your grounded down tilt. For a low crouch, ease the stick down, hold Walk + Down on a keyboard, or slide from the center dot onto Down on touch. Try both heights in Training → Platform practice.</p>' +
        '<p>Hold Down before a hit to crouch cancel. You take the damage with less knockback. A light, low hit can leave your paws planted. Tap Attack at the spark to answer with a down tilt. Try a stronger launcher or a grab against a crouching rival.</p>' +
        '<p>On the ground, hold Shield and tap Left or Right to roll, or tap Down to spot-dodge in place. Release a raised Shield just before a strike or projectile lands to parry. A melee parry gives you time for a counterattack. Grabs beat a shield release. Try these in Training → Shield practice.</p>' +
        '<p>Holding Shield or blocking a hit shrinks the bubble. An attack can clip an exposed paw or ear. To cover it, ease the stick toward the hit, or hold both bumpers and aim freely. On keyboard, hold Walk while aiming with Shield. On touch, hold Shield and drag from the center dot toward the hit.</p>' +
        '<p>While holding Shield, press Jump, Grab, Up + Smash, or Up + Special. On a raised platform, flick a lower diagonal to fall through your shield. Tap Attack with the diagonal for a down air, or aim a different aerial as you fall. Try Shield drop in Platform practice.</p>' +
        '<p>Tap during a blocked hit to start your response as soon as shieldstun ends. An immediate shield grab takes four extra frames to reach. A heavier blow pushes you farther away.</p>' +
        '<p>In midair, tap Shield with the stick centered to dodge in place. Aim up and toward the stage to slip past an edgeguard and catch the lip. You get one air dodge until you land or grab a ledge. Aim diagonally down and tap Shield to slide onto a platform. Do this just after jumping to wavedash. Try Training → Air-dodge practice or Training → Wavedash.</p>' +
        '<p>Flick a direction during the hit spark to shift your dog. You can slide sideways on the ground or in eight directions in the air. Try escaping the second swing in Training → Combo escape.</p>' +
        '<p>When a strong hit freezes the action, hold a direction across the launch to bend its path. As you tumble toward a platform, tap Shield just before contact to tech. Hold left or right as you land for a tech roll. Try both in Training → Launch practice.</p>' +
        '<p>Your dog crouches for three frames. Tap Jump for a short hop, or hold Jump through the crouch for a full jump. Jump + Attack during the crouch gives a short-hop aerial. Tap Down once after the top of your jump to fast-fall, then aim freely. Jump again in midair. Press Jump just above a rival’s head for a footstool, even with your air jump spent. A rival stepped on in the air can tech the fall with Shield. Down + Jump drops through a raised platform.</p><p>Tap Attack alone for your dog’s jab combo. On the ground, aim left, right, up, or down and tap Attack for a tilt. Press left or right and Attack together for a forward tilt. Press Attack once your dog is running for a dash attack. In the air, press Attack alone or aim forward, back, up, or down. Forward follows the way your dog faces.</p><p>For a grounded smash, aim sideways, up, or down. Tap Smash to swing immediately, or hold it and release for more power. From a standstill, holding Attack also charges a smash. With the default Smash stick, hold the right stick in a direction and release to swing. Choose Tilt under Options for instant grounded tilts with the aim stick, aim keys, or a swipe from Smash.</p><p>Press Special alone for Neutral Special, or aim as you press it. Up + Special helps you get back to the stage. While hanging from an edge, tap Attack to climb in and strike. The Move list shows every fighter’s inputs.</p><p>Grabs beat shields. Run and press Grab to reach ahead. Press the opposite direction and Grab together as you turn to catch a pursuer. Once you catch a rival, tap Attack to pummel. Tap it again for another hit, or tap a direction to throw. The escape timer keeps running during pummels. Forward follows your facing at the catch. Press Grab again for forward, or tap action buttons to escape when caught.</p><p>Higher damage sends a dog farther. Three knockouts win a match. In local versus, one controller plays P2. Two controllers play one dog each.</p><div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>',
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
      label: 'Get-up Sweep',
      input: 'After a knockdown · tap Attack',
      hint: 'Sweep both sides for 7% as you get up. You can also tap a side to roll or tap Up or Jump to stand. A rival can lock a missed landing with two opening jabs. Choose your get-up as the bounce settles.',
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
        '% from frame ' + Math.round(move.late.start * 60) + '.' : '') +
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
            .map(([key, move]) => guideMoveRow(move, move.input, key, section))
            .join('')
        : Object.entries(entries)
            .map(([side, id]) => guideMoveRow(moveSet[id], inputs[side], side, section))
            .join('');
    const ledgeMove =
      '<h3 class="guide-section">Ledge attack</h3><ul class="move-rows guide-ledge">' +
      guideMoveRow(moves[kit.ledgeAttack], 'While hanging · tap Attack', 'ledge', 'ledge') +
      '</ul>';
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
        '<p class="recovery-note">Shield is L for P1, Slash for P2, either bumper on a gamepad, or Shield on touch.</p><h3 class="guide-section">On the ground</h3><p>Keep Shield held and press Jump, Grab, Up + Smash, or Up + Special. You can tap during impact. A grab immediately after a block needs four extra startup frames.</p><p>In <strong>Training → Shield practice</strong>, use Clover’s Disc Hook against Pip’s spaced kick and Brisket’s Belly Drop. Choose Strike or Grab to practice a parry or dodge with your own dog.</p><ul class="move-rows guide-shield">' +
        groundRows +
        '</ul><h3 class="guide-section">On a platform</h3><ul class="move-rows">' +
        guideMoveRow({ label: 'Shield drop', hint: 'Raise Shield, then tap either lower diagonal. Tap Attack with it for ' +
          moves[kit.air.down].label + ', or aim another aerial as you fall. Try it against the up air in Training → Platform practice.' },
          'Hold Shield, then ↙ or ↘', 'platformDrop', 'defense') +
        '</ul><h3 class="guide-section">Shield coverage</h3><ul class="move-rows guide-coverage">' +
        guideMoveRow({ label: 'Tilt shield', hint: 'Shift the bubble toward a low sweep, high aerial or incoming disc. A hit that reaches an exposed part of your dog deals its normal damage. Try Guard low and Guard high in Shield practice.' },
          'Shield + gentle direction', 'shieldTilt', 'defense') +
        '</ul><h3 class="guide-section">Crouch cancel</h3><ul class="move-rows guide-crouch">' +
        guideMoveRow({ label: 'Crouch cancel', hint: 'You take full damage and two-thirds of the usual launch speed. A light, low blow can leave your paws planted. Tap Attack at the spark for ' +
          moves[kit.tilts.down].label + '. Grabs and tethers can catch a crouch. Try both sides in Training → Combo escape.' }, 'Hold Down before contact', 'crouchHit', 'defense') +
        '</ul><h3 class="guide-section">In the air</h3><p>One dodge per airtime. Landing or catching a ledge refreshes it. Try <strong>Training → Air-dodge practice</strong>.</p><p>For a wavedash, tap Jump, then aim diagonally down and tap Shield. Release the direction to slide forward or backward and keep your facing. Do the same on the way down to waveland on a platform. Try <strong>Training → Wavedash</strong>.</p><ul class="move-rows guide-air-dodge">' +
        airRows +
        '</ul><h3 class="guide-section">At the ledge</h3><p>Try <strong>Training → Ledge timing</strong> to practice the climb from either side.</p><ul class="move-rows guide-ledge-climb">' +
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
        '</ul><h3 class="guide-section">At a wall</h3><p>Try <strong>Training → Wall tech practice</strong> to take Pip’s Back Heel into either wall of Laundry Line.</p><ul class="move-rows guide-wall">' +
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
        '<p class="recovery-note"><strong>Grab</strong> Use U (P1), M (P2), Y on a gamepad, or Grab on touch. Grab during a run to catch ahead. Reverse and press Grab together to catch behind. After a catch, tap Attack to pummel or tap a direction to throw. Forward follows your new facing. Grab again also throws forward. Tap action buttons when caught to escape.</p><ul class="move-rows guide-throws">' +
        rows +
        '</ul>';
    } else if (section === 'smashes') {
      contents =
        '<p class="recovery-note"><strong>Charge</strong> Aim and hold Smash (P1 I, P2 N, gamepad RT), then release. A tap swings immediately. Full charge takes one second. You can hold it for one more second before the move fires. Repeating a move lowers its damage and launch power. Try Training → Move freshness → KO test to see when this changes a stock.</p><ul class="move-rows guide-smashes">' +
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
        '</p><h3 class="guide-section">Ground tilts</h3><p>Aim and tap Attack. Out of a run, release forward briefly, then press forward and Attack together to slide into a tilt. Reverse and tap Attack to strike behind you while your paws still skid forward. Up and down tilts work straight out of the run. You can also set your aim stick to Tilt in Options.</p><ul class="move-rows guide-tilts">' +
        Object.entries(kit.tilts)
          .map(([side, id]) => guideMoveRow(moves[id], tiltInputs[side], side, 'tilts'))
          .join('') +
        '</ul><h3 class="guide-section">Dash attack</h3><ul class="move-rows guide-dash">' +
        guideMoveRow(moves[kit.dashAttack], 'Run + Attack', 'dash', 'dash') +
        '</ul>' +
        ledgeMove +
        '<h3 class="guide-section">Aerial attacks</h3><p>Jump + Attack gives a rising short-hop aerial. To swing on the way down, jump first and time Attack yourself. Tap Down after the apex to fast-fall. Forward follows your facing.</p><p>Press Shield during an aerial in the last seven frames before touchdown to halve its landing recovery, rounded up. Mint streaks at the paws mark a landing cancel. Keep holding Shield to block the reply. Try <strong>Training → Aerial practice → Landing cancel</strong>.</p><p>Each forward air has a clean hit and a softer follow-through. Practice landing the late hit into a jab in <strong>Training → Aerial practice → Landing hits</strong>.</p><p>Steer with the left stick and flick the right stick to swing in a separate direction. On keyboard, aim left/right/up/down with R/Y/T/G for P1 or numpad 4/6/8/2 for P2. On touch, flick outward from Smash. For a running back air, reverse direction with Jump and steer back along your original path. Try <strong>Aerial practice → Approach</strong>.</p><ul class="move-rows guide-airs">' +
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
  $('training-moves').onclick = () => showMoves(world.dogs[0].kind);
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
  function stockPaws(count) {
    return Array.from({ length: 3 }, (_, i) =>
      '<i class="' + (i >= count ? 'lost' : '') + '" data-icon="paw">' + svg('paw') + '</i>').join('');
  }
  const tenth = n => Number(n.toFixed(1));
  const moveLabel = id => (moves[id] || specials[id] || smashes[id] || pummels[id] || throws[id]).label;
  function freshnessResult(sample) {
    const parts = [];
    if (sample.hits) {
      parts.push(tenth(sample.damage) + '% damage');
      if (sample.launch) parts.push(Math.round(sample.launch) + ' px/s');
    }
    if (sample.blocks) parts.push(sample.shieldFrames + 'f shieldstun');
    if (sample.outcome) parts.push(sample.outcome);
    return parts.join(' · ');
  }
  function updateFreshnessReadout(player, lab) {
    const { last, previous } = lab;
    const id = last?.moveId || previous?.last.moveId;
    $('freshness-name').textContent = last ? moveLabel(last.moveId) + ' · ' + tenth(last.power * 100) + '% power' :
      lab.koTest ? smashes[player.kit.smashes.up].label + ' KO test' : 'Move freshness';
    const result = last ? freshnessResult(last) : world.dogs[1].stats.name + ' at ' + lab.baseline + '%';
    if ($('freshness-contact').textContent !== result) $('freshness-contact').textContent = result;
    $('freshness-previous').hidden = !previous;
    if (previous) {
      const label = last?.moveId === previous.last.moveId ? 'Previous' : 'Previous ' + moveLabel(previous.last.moveId);
      $('freshness-previous').textContent = label + ' · ' + freshnessResult(previous.last);
    }
    $('freshness-summary').textContent = 'Recent moves ' + player.moveHistory.length + '/9' +
      (id ? ' · Next ' + tenth(moveFreshness(player, id) * 100) + '%' : '');
    $('freshness-list').replaceChildren(...player.moveHistory.map(entry => {
      const li = document.createElement('li');
      li.textContent = moveLabel(entry.moveId) + (entry.shieldOnly ? ' · shield' : '');
      return li;
    }));
  }
  const comboSources = { example: 'Dog’s combo', late: 'Late jab', record: 'Your take', replay: 'Your take' };
  const comboReplies = { stand: 'Standing', guard: 'Guard', away: 'Flick away' };
  function comboRow(contact) {
    const { moveId, kind, gap } = contact;
    const name = (moves[moveId] || specials[moveId] || smashes[moveId] || grabs[moveId] ||
      throws[moveId] || pummels[moveId])?.label || moveId || 'Hit';
    const result = kind === 'block' ? 'blocked' : kind === 'grab' ? 'caught' : tenth(contact.damage) + '%';
    const timing = gap === null ? 'opener' : gap ? gap + 'f opening' :
      kind === 'pummel' || kind === 'throw' ? 'held' : 'no free frame';
    return name + ' · ' + result + ' · ' + timing;
  }
  function updateComboReadout(d) {
    const title = d.phase === 'ready' ? 'Ready to record' : d.source === 'record' && d.phase === 'active' && d.tick < 150
      ? 'Recording' : comboSources[d.source];
    $('combo-summary').textContent = title + ' · ' + d.hits + (d.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(d.damage) + '%';
    const last = d.contacts.at(-1);
    const response = [d.shifts ? d.shifts + (d.shifts === 1 ? ' shift' : ' shifts') : '',
      d.dodges ? d.dodges + (d.dodges === 1 ? ' air dodge' : ' air dodges') : ''].filter(Boolean).join(' · ');
    $('combo-latest').textContent = last ? comboRow(last) + (response ? ' · ' + response : '') :
      d.phase === 'done' ? 'No contact' : d.phase === 'ready' ? 'Move or attack to start.' : 'Waiting for contact';
    const prior = d.prior;
    $('combo-previous').hidden = !prior;
    if (prior) $('combo-previous').textContent = 'Previous · ' + comboSources[prior.source] + ' · ' + comboReplies[prior.reply] +
      ' at ' + prior.baseline + '% · ' + prior.hits + (prior.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(prior.damage) + '%';
    $('combo-history').hidden = !last;
    $('combo-list').replaceChildren(...d.contacts.map(contact => {
      const row = document.createElement('li');
      row.textContent = comboRow(contact);
      return row;
    }));
    $('combo-replay').disabled = !(d.saved?.length || (d.source === 'record' && d.tape.length));
  }
  function updateHUD() {
    if (world.mode === 'adventure') return updateDispatchHUD();
    const scores = online.match?.confirmedWorld.dogs || world.dogs;
    const combo = world.lastCombo;
    const grip = world.grapple;
    const prompt = $('grapple-prompt');
    prompt.hidden = !grip || grip.phase === 'throw' || !!world.launchPractice || !!world.stockPractice || !!world.survivalPractice;
    if (!prompt.hidden) {
      const holder = world.dogs[grip.owner].stats.name;
      const captive = world.dogs[grip.target].stats.name;
      const text =
        world.mode === 'local'
          ? holder + ' · Tap Attack to pummel, aim to throw / ' + captive + ' · Tap buttons to escape'
          : grip.owner === 0
            ? 'Tap Attack to pummel · Aim to throw'
            : 'Grabbed · Tap action buttons to escape';
      if (prompt.textContent !== text) prompt.textContent = text;
    }
    const player = world.dogs[0], lab = world.freshnessPractice;
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
      if (!f.stockLift) return f.stockGuard ? (f.stockGuard <= 24 / 60 + 1e-8 ? 'Last tag' : 'Protected') : '';
      if (!f.stockLift.ready) return 'Returning';
      const human = online.match ? online.side === i : world.mode === 'local' || i === 0;
      return human ? '↓ or Jump' : 'Lift ready';
    });
    const key =
      scores.map((f, i) => f.kind + ':' + Math.floor(f.damage) + ':' + f.stocks + returns[i]).join('|') +
      world.mode +
      '/' +
      combo.hits +
      '/' +
      combo.damage +
      '/' +
      (world.mode === 'training' ? shownMove : '') +
      (comboLab ? '/' + [comboLab.phase, comboLab.contacts.length, comboLab.shifts, comboLab.dodges, comboLab.tick >= 150].join('/') : '') +
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
        combo.hits + (combo.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(combo.damage) + '% damage';
    }
    $('hud').innerHTML = scores
      .map((f, i) => {
        const lives =
          world.mode === 'training'
            ? '∞'
            : stockPaws(f.stocks);
        return (
          '<div class="hud-card ' +
          (i ? 'two' : '') +
          '">' + (returns[i] ? '<span class="stock-alert' + (returns[i] === 'Last tag' ? ' last' : '') + '">' + returns[i] + '</span>' : '') + '<img alt="" src="' +
          portrait(f.kind) +
          '"><div><span class="hud-name"><small>' +
          labelFor(i) +
          '</small>' +
          f.stats.name +
          '</span><strong class="percentage ' +
          (f.damage >= 110 ? 'danger' : f.damage >= 65 ? 'high' : '') +
          '">' +
          Math.floor(f.damage) +
          '%</strong><span class="lives" aria-label="' +
          (world.mode === 'training' ? 'Unlimited stocks' : f.stocks + ' stocks') +
          '">' +
          lives +
          '</span></div></div>'
        );
      })
      .join('');
  }
  let matchConfig, soloSeed;
  const frameLab = {mode:'live', count:0, pending:0, renderTime:0};
  function frameState(f) {
    const frames = seconds => Math.ceil(seconds * 60 - 1e-8);
    if (world.hitStop > 0 || f.impactLag > 0) return 'Hitstop ' + frames(world.hitStop || f.impactLag) + 'f';
    if (f.stockLift) return 'Respawn platform';
    if (f.grip) return 'Grapple';
    if (f.ledge) return 'Hanging';
    if (f.stun > 0) return 'Hitstun ' + frames(f.stun) + 'f';
    if (f.shieldStun > 0) return 'Shieldstun ' + frames(f.shieldStun) + 'f';
    if (f.landingLag > 1e-8) return 'Landing recovery ' + frames(f.landingLag) + 'f';
    if (f.jumpSquat) return 'Jump squat ' + Math.round(f.jumpSquat.time * 60) + '/3';
    if (f.floorAction) return 'Floor action · ' + frames(f.floorAction.duration - f.floorAction.time) + 'f';
    if (f.airDodge) return 'Air dodge';
    if (f.clashRecoil) return 'Clash recoil';
    if (f.attack) return f.lastMove + ' · frame ' + Math.round(f.attack.time * 60);
    if (f.smashCharge) return 'Charging ' + smashes[f.smashCharge.moveId].label;
    if (f.shield) return 'Shield up';
    if (f.shieldDrop > 0) return 'Lowering shield';
    return f.ground < 0 ? (f.vy < 0 ? 'Rising' : 'Falling') : 'Grounded';
  }
  function showFrameStatus() {
    const status = $('frame-status');
    if (frameLab.mode === 'live') return;
    if (frameLab.mode === 'armed') {
      status.textContent = world.dogs[0].kind === 'brisket' ?
        'Jump, then tap Down + Attack for Belly Drop. Training will freeze on landing.' :
        'Jump, then use an aerial. Training will freeze on landing.';
      return;
    }
    const [player, rival] = world.dogs;
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
  function showCpuLevels() {
    const restart = page === 'match';
    backToPause = restart;
    const level = restart ? world.cpuLevel : settings.cpuLevel;
    const choices = Object.entries(cpuLevels).map(([id, cpu]) =>
      '<button type="button" data-cpu="' + id + '" aria-pressed="' + (level === id) + '">' +
      '<strong>' + cpu.name + '</strong><span>' + cpu.tip + '</span></button>').join('');
    showDialog('cpu-level', restart ? 'Replay the opening' : 'CPU opponent',
      (restart ? '<p>Choose an opponent to restart this three-stock match from the same opening.</p>' : '') +
      '<div class="cpu-choices">' + choices + '</div>' + (restart ? '' :
        '<div class="dialog-actions"><button class="utility" data-do="shield-read-match">Try Rival · Pip vs. Noodle</button></div>'));
    document.querySelector('[data-cpu="' + level + '"]').focus({preventScroll:true});
  }
  $('cpu-level').onclick = showCpuLevels;
  function startShieldReadMatch() {
    leaveOnline();
    afterStory = null;
    startMatch({ ...settings, p1:'pip', p2:'noodle', mode:'solo', cpuLevel:'rival', stage:'picnic', fetch:false },
      undefined, 42);
  }
  function cpuReadReport() {
    const tries = world.bot.spotReads;
    if (world.mode !== 'solo' || world.cpuLevel !== 'rival' || !tries) return '';
    return '<p>Rival expected a spot-dodge ' + tries + (tries === 1 ? ' time' : ' times') +
      ' and caught ' + (world.bot.spotPunishes || 0) + ' with a delayed down tilt.</p>';
  }
  function startMatch(config = settings, random = Math.random, opening) {
    matchConfig = { ...config };
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
    view = new FightView();
    view.shakeEnabled = settings.shake;
    world = new Battle(config, (name, e) => {
      view.event(name, e);
      sound(name, e);
      if (world?.launchPractice && e.f?.index === 0) launchFeedback(name, e);
      if (world?.meteorPractice && e.f?.index === 0) meteorFeedback(name, e);
      if (world?.survivalPractice && e.f?.index === 0) survivalFeedback(name, e);
      if (world?.stockPractice && e.f?.index === world.stockPractice.slot && name.startsWith('stock'))
        stockFeedback(name, e);
      if (name === 'chaseCue' || name === 'chaseResult') chaseFeedback(name, e);
      if (world?.wallPractice && e.f?.index === 0) wallFeedback(name);
      if (name === 'shieldCue' || name === 'shieldResult') shieldFeedback(name, e);
      if (world?.edgePractice && (name === 'edgeCue' || name === 'edgeLand' || name === 'edgeResult' ||
          name === 'edgeOpen' || (world.edgePractice.timeCatch && name === 'ledge' && e.f.index === 1) ||
          ((name === 'teeter' || name === 'edgeCancel') && e.f.index === 0))) edgeFeedback(name, e);
      if (name === 'footworkCue' || name === 'footworkResult') footworkFeedback(e);
      if (name === 'waveContact' || name === 'waveResult') waveFeedback();
      if (world?.spacingPractice && (name === 'spacingContact' || name === 'spacingLand' || name === 'spacingJab' ||
          name === 'spacingCancelStart' || name === 'spacingCancelCue' || name === 'footstoolCue' ||
          (name === 'footstool' && isFootstoolPractice(world.spacingPractice)) ||
          name === 'spacingResult' || name === 'spacingRetry' || (name === 'specialTurn' && e.f.index === 0 && isReversalPractice(world.spacingPractice))))
        spacingFeedback(name, e);
      if (name === 'escapeCue' || name === 'escapeResult') escapeFeedback(e);
      if (world?.climbPractice && (name === 'climbCue' || name === 'climbResult' ||
          (name === 'ledgeClimbPlant' && world.climbPractice.phase === 'active')))
        climbFeedback(name, e);
      if (name === 'platformResult' || name === 'platformClimb' || name === 'platformBlock' ||
          (name === 'platformDrop' && world?.platformPractice && e.f.index === 0))
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
    $('training-tools').hidden = config.mode !== 'training';
    setFrameMode('live');
    $('dummy-damage').value = '0';
    $('damage-output').textContent = '0%';
    const matchName = online.match ? 'Online · You are P' + (online.side + 1) : config.mode === 'solo' ?
      'Solo · ' + cpuLevels[world.cpuLevel].name + ' CPU' : modes[config.mode];
    $('match-mode').textContent = matchName;
    $('match-stage').textContent = arenas[config.stage].name;
    $('pause-label').textContent = online.match ? 'Match menu' : 'Pause';
    countdown = config.mode === 'training' ? 0 : 2.4;
    lastCount = 0;
    resultDelay = 0;
    hudKey = '';
    accumulator = 0;
    $('countdown').textContent = countdown ? '3' : '';
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
        cpuReadReport() + '<div class="dialog-actions">' + (world.mode === 'solo' ?
          '<button class="utility" data-do="cpu-level">Replay with another CPU</button>' : '') + '<button class="utility" data-do="rematch">' +
        icon('reset') +
        'Restart match</button><button class="utility" data-do="lobby">Fighter select</button><button class="utility" data-do="home">Main menu</button></div>',
    );
    document.querySelector('[data-do=resume]').focus();
  }
  function showResult() {
    const f = world.dogs[world.end],
      elapsed = Math.floor(world.time);
    const duration = Math.floor(elapsed / 60) + 'm ' + String(elapsed % 60).padStart(2, '0') + 's';
    if (online.match) {
      const title = world.end === online.side ? 'You win!' : 'Opponent wins';
      showDialog('online-result', title,
        '<div class="winner"><img alt="" src="' + portrait(f.kind) + '"><div><h3>' + f.stats.name +
        ' wins!</h3><p>' + stockLabel(f.stocks) + ' · ' + duration + '</p></div></div><p id="net-rematch-status" role="status"></p>' +
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
        f.stocks +
        ' ' +
        (f.stocks === 1 ? 'stock' : 'stocks') +
        ' left · ' +
        duration +
        '</p></div></div>' + cpuReadReport() + '<div class="dialog-actions"><button class="primary" data-do="rematch">' +
        icon('reset') +
        'Rematch</button><button class="utility" data-do="lobby">Fighter select</button><button class="utility" data-do="home">Main menu</button></div>',
      false,
    );
    announce(f.stats.name + ' wins the Golden Tennis Ball');
    document.querySelector('[data-do=rematch]').focus();
  }
  $('start').onclick = () => startMatch();
  $('pause').onclick = showPause;
  $('dialog-body').addEventListener('click', (e) => {
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
      settings.stage = stage.dataset.stage;
      save();
      syncLobby();
      sound('menu');
      dismiss();
      return;
    }
    const action = e.target.closest('[data-do]')?.dataset.do;
    if (action === 'online-rematch') online.rematch();
    if (action === 'online-leave') showOnline();
    if (action === 'fullscreen') toggleFullscreen();
    if (action === 'home') showHome();
    if (action === 'route') showRoute();
    if (action === 'dispatch-retry') beginRun(world.roomIndex, world.checkpoint, world.atCheckpoint);
    if (action === 'dispatch-rematch') beginRun(world.roomIndex, 0);
    if (['option-sound', 'option-shake', 'option-tiltStick'].includes(action)) {
      const key = action.slice('option-'.length);
      settings[key] = !settings[key];
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
    if (action === 'rematch') startMatch(matchConfig, undefined, soloSeed);
    if (action === 'controls') showControls();
    if (action === 'moves') showMoves(world?.dogs[0].kind || settings.p1);
  });
  function showDamageControl(counter, fineStep = false, before) {
    const control = $('damage-control'), next = $(before || (counter ? 'escape-break' : 'reset-training'));
    if (control.nextElementSibling !== next) next.before(control);
    const label = counter ? 'Your starting damage' : 'Dummy damage';
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
        other: 'Different attack', away: 'Left the setup' };
      status.dataset.result = e.outcome || name;
      if (!e.outcome) {
        status.textContent = name === 'spacingJab' ? 'Tap Attack for jab' :
          name === 'spacingLand' ? 'Landed · center the stick' : (practice.timing === 'clean' ? 'Clean hit' : 'Late hit') + ' · ' + practice.damage + '%';
        return;
      }
      status.textContent = labels[e.outcome];
      const tips = { clean: 'The leading hit connected. To try the late hit, swing earlier at the gold fork.',
        string: moves[practice.contact].label + ' into ' + moves[world.dogs[0].kit.ground[0]].label +
          ' connected before the rival could act. Try the green stripe for the clean hit.',
        guarded: practice.timing === 'clean' ? 'The clean hit gave the rival time to shield your jab. Swing at the gold fork to try the follow-through.' :
          'The rival raised Shield before your jab. Tap Attack as the landing cue appears.',
        gap: 'Both hits landed. The rival had time to act between them.',
        escaped: 'The rival recovered. Release the direction on landing and tap Attack at the jab cue.',
        miss: 'Hold toward the rival for the whole short hop. Tap Attack over either floor mark.',
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
  function climbFeedback(name, e) {
    const drill = world.climbPractice, status = $('climb-status'), trap = drill.role === 'trap';
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
    if (world.platformPractice.pattern === 'hold') {
      if (name === 'platformDrop') return;
      if (name === 'platformClimb') {
        status.textContent = world.platformPractice.phase === 'wing' ? 'Rival on the right wing' : 'Watch the right wing';
        status.dataset.result = 'approach';
        return;
      }
      const feedback = {
        intercept: [label + ' caught the jump', 'You kept the high platform.'],
        guarded: ['Blocked ' + label, 'You shielded the rising aerial. Try meeting the next jump with an attack.'],
        parried: ['Parried the approach', 'Your shield release caught the incoming aerial.'],
        tagged: [label + ' got through', 'Their up air reaches through the floor. Shield or strike as they rise.'],
        claimed: ['Rival took the top', 'Cover the right edge before the challenger lands.'],
        vacated: ['Left the high platform', 'Meet the last jump from above the right wing.'],
        low: ['Caught the first jump', 'Let the rival reach the wing, then catch the jump toward the top.'],
      }[e.outcome];
      status.dataset.result = e.outcome;
      status.textContent = feedback[0];
      tip.textContent = feedback[1] + ' Choose Hold the top to retry.';
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
    const aerial = e.pattern === 'kick' || e.pattern === 'drop';
    const dummy = world.dogs[1];
    const attackName =
      e.pattern === 'low' ? 'Tail Broom' : e.pattern === 'high' ? 'Slip Lead' :
      aerial ? moves[dummy.kit.air[e.pattern === 'kick' ? 'forward' : 'down']].label
        : e.pattern === 'grab' ? grabs[dummy.kit.grab].label : smashes[dummy.kit.smashes.side].label;
    if (name === 'shieldCue') {
      result.dataset.result = e.phase;
      result.textContent = e.phase === 'counter' ? 'Blocked · tap Grab' : e.phase === 'windup' ? attackName + ' coming' : attackName;
      if (e.phase === 'windup' && (e.pattern === 'low' || e.pattern === 'high'))
        tip.textContent = e.pattern === 'low' ? 'Cover the paws. Hold Shield and gently aim down.' : 'Cover the ears. Hold Shield and aim up.';
      return;
    }
    result.dataset.result = e.outcome;
    const feedback = {
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
  function wallFeedback(name) {
    const status = $('wall-status');
    if (world.wallPractice.phase === 'done' && status.dataset.result !== 'flight') return;
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
  }
  function chaseFeedback(name, e) {
    const d = world.chasePractice, status = $('launch-status'), tip = $('recovery-tip');
    const attack = d.role === 'attack';
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
      message = name === 'survivalReady' ? 'Take ' + move + ' with the stick centered. Tap Attack to retry from the same mark.' :
        aim + ' at the hit spark. Then steer ' + inward + ' toward the ledge.';
    } else if (name === 'blastThreat') {
      label = 'Blast line · aim now';
    } else if (name === 'launchDI') {
      label = Math.round(e.scale * 100) + '% speed · ' + Math.round(Math.abs(e.angle) * 180 / Math.PI) + '° turn';
      message = 'At the mint arrow, aim up-' + inward + ' and tap Shield. Jump toward the ledge and use Up + Special if you need more height.';
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
    if (world.launchPractice.pattern === 'juggle') {
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
          ? 'Get-up Sweep'
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
  function drill(ledge, fromHang = false, pattern = 'strike', direction) {
    if (!world) return;
    setFrameMode('live');
    const launch = ledge === 'launch';
    const juggle = launch && pattern === 'juggle';
    const chase = launch && (pattern === 'attack' || pattern === 'defend');
    const stock = launch && (pattern === 'stockReturn' || pattern === 'stockCatch');
    const survival = launch && pattern === 'survival';
    const meteor = launch && (pattern === 'spikeFloor' || pattern === 'spikeEdge');
    const wall = ledge === 'wall';
    const shield = ledge === 'shield';
    const footwork = ledge === 'footwork';
    const edge = ledge === 'edge';
    const freshness = ledge === 'freshness';
    const wave = ledge === 'wave';
    const combo = ledge === 'combo';
    const spacing = ledge === 'spacing';
    const escape = ledge === 'escape';
    const platform = ledge === 'platform';
    const air = ledge === 'air';
    const roll = ledge === 'roll';
    const climb = ledge === 'climb';
    const trump = ledge === 'trump';
    drillSide = launch || wall || shield || footwork || edge || freshness || wave || combo || spacing || escape || platform || air || roll || climb || trump ? null : ledge || null;
    drillWaiting = !!drillSide;
    if (drillSide) practiceSide = drillSide;
    view = new FightView();
    if (chase) world.resetChasePractice(pattern, direction ?? world.chasePractice?.dir ?? 1, world.chasePractice?.slow ?? true);
    else if (meteor) world.resetMeteorPractice(pattern, direction ?? world.meteorPractice?.dir ?? 1,
      world.meteorPractice?.slow ?? true, world.meteorPractice?.baseline ?? 100);
    else if (stock) world.resetStockPractice(pattern, direction ?? world.stockPractice?.dir ?? 1, world.stockPractice?.slow ?? true);
    else if (survival) world.resetSurvivalPractice(direction ?? world.survivalPractice?.dir ?? 1, world.survivalPractice?.slow ?? true,
      world.survivalPractice?.baseline);
    else if (juggle) world.resetLaunchPractice(pattern, direction ?? world.launchPractice?.dir ?? 1,
      world.launchPractice?.slow ?? true, world.launchPractice?.chase ?? false);
    else if (launch) world.resetLaunchPractice();
    else if (combo) world.resetComboPractice(pattern, direction ?? world.comboPractice?.reply ?? 'stand', world.comboPractice?.slow ?? true);
    else if (wave) world.resetWavePractice(pattern, direction ?? world.wavePractice?.dir ?? 1, world.wavePractice?.slow ?? true);
    else if (edge) world.resetEdgePractice(pattern, direction ?? world.edgePractice?.dir ?? 1, world.edgePractice?.slow ?? true);
    else if (freshness) {
      const lab = world.freshnessPractice;
      world.resetFreshnessPractice(pattern === 'repeat' || pattern === 'guard',
        pattern === 'guard' ? !lab.guard : pattern === 'ko' ? false : lab?.guard ?? false,
        pattern === 'ko' ? !lab?.koTest : lab?.koTest ?? false);
    }
    else if (footwork) world.resetFootworkPractice(pattern, pattern === 'bait' ? 1 : direction ?? world.footworkPractice?.dir ?? 1,
      world.footworkPractice?.pattern !== 'bait' ? world.footworkPractice?.slow ?? true : true);
    else if (spacing) world.resetSpacingPractice(pattern, direction ?? world.spacingPractice?.dir ?? 1,
      world.spacingPractice?.slow ?? true, world.spacingPractice?.pattern === 'wavebounce' ? world.spacingPractice.guard : true);
    else if (escape) world.resetEscapePractice(pattern, world.escapePractice?.slow ?? true, world.escapePractice?.baseline);
    else if (platform) world.resetPlatformPractice(pattern, world.platformPractice?.slow ?? true);
    else if (wall) world.resetWallPractice(pattern);
    else if (shield) world.resetShieldPractice(pattern, direction ?? world.shieldPractice?.worn ?? true);
    else if (air) world.resetAirPractice(pattern, practiceSide);
    else if (roll) world.resetLedgeRollPractice(pattern, practiceSide);
    else if (climb) world.resetClimbPractice(pattern, practiceSide, world.climbPractice?.slow ?? true);
    else if (trump) world.resetLedgeTrumpPractice(pattern, practiceSide);
    else world.resetTraining(ledge, fromHang);
    const player = world.dogs[0];
    document.body.classList.toggle('with-drill-readout', freshness || wave || combo);
    $('combo-readout').hidden = $('combo-controls').hidden = !combo;
    $('freshness-readout').hidden = $('freshness-controls').hidden = !freshness;
    $('wave-readout').hidden = $('wave-patterns').hidden = !wave;
    const counterDrill = escape && pattern === 'counter';
    showDamageControl(counterDrill || meteor || survival, freshness && world.freshnessPractice.koTest,
      meteor || survival ? 'launch-side' : world.edgePractice?.timeCatch ? 'edge-side' : undefined);
    $('damage-control').hidden = stock || juggle;
    $('dummy-damage').value = survival ? world.survivalPractice.baseline : meteor ? world.meteorPractice.baseline : counterDrill ? world.escapePractice.baseline : world.trainingDamage;
    $('damage-output').textContent = $('dummy-damage').value + '%';
    $('match-stage').textContent = arenas[world.stage].name;
    hudKey = '';
    const result = $('launch-status');
    result.hidden = !launch;
    $('launch-patterns').hidden = !launch;
    $('juggle-chase').hidden = !juggle;
    if (juggle) $('juggle-chase').setAttribute('aria-pressed', String(world.launchPractice.chase));
    const launchOptions = world.survivalPractice || world.stockPractice || world.meteorPractice || world.chasePractice ||
      (juggle && world.launchPractice);
    $('launch-side').hidden = $('launch-slow').hidden = !launchOptions;
    if (launch) {
      $('launch-throw').setAttribute('aria-pressed', String(!launchOptions));
      $('launch-juggle').setAttribute('aria-pressed', String(juggle));
      $('launch-survival').setAttribute('aria-pressed', String(survival));
      $('launch-stock-return').setAttribute('aria-pressed', String(pattern === 'stockReturn'));
      $('launch-stock-catch').setAttribute('aria-pressed', String(pattern === 'stockCatch'));
      $('launch-floor-spike').setAttribute('aria-pressed', String(pattern === 'spikeFloor'));
      $('launch-edge-spike').setAttribute('aria-pressed', String(pattern === 'spikeEdge'));
      $('launch-lock').setAttribute('aria-pressed', String(chase && pattern === 'attack'));
      $('launch-escape').setAttribute('aria-pressed', String(chase && pattern === 'defend'));
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
      $('combo-slow').setAttribute('aria-pressed', String(d.slow));
      for (const source of ['example','late','record','replay'])
        $('combo-' + source).setAttribute('aria-pressed', String(d.source === source));
      const route = { pip: 'Attack, Attack, then Jump + Forward + Attack.', brisket: 'Attack, then Grab. Tap forward to throw.',
        noodle: 'Attack twice, then tap neutral Special.', clover: 'Attack twice, then Jump + Attack.' }[player.kind];
      message = d.source === 'record' ? 'Play a combo. The first input starts a 2½-second recording. ' + route :
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
      $('freshness-ko').setAttribute('aria-pressed', String(lab.koTest));
      $('freshness-guard').setAttribute('aria-pressed', String(lab.guard));
      message = lab.koTest ? 'Fully charge Up + Smash, release, then choose Return to marks. The mint trail shows your previous launch.' :
        'Land a hit, choose Return to marks, and repeat. Mix in other moves to restore its power.';
    } else if (spacing) {
      const practice = world.spacingPractice, approach = pattern === 'approach';
      const run = practice.dir > 0 ? 'right' : 'left', back = practice.dir > 0 ? 'left' : 'right';
      const key = practice.dir > 0 ? 'R' : 'Y';
      $('spacing-approach').setAttribute('aria-pressed', String(approach));
      $('spacing-retreat').setAttribute('aria-pressed', String(pattern === 'retreat'));
      $('spacing-landing').setAttribute('aria-pressed', String(pattern === 'landing'));
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
        pattern === 'landing' ? 'Tap Jump and hold ' + run : approach ? 'Jump past the shield' : 'Jump away from the shield';
      message = isFootstoolPractice(practice) ? (pattern === 'footstool' ?
        'Your jumps are spent. Tap Attack to fall, then press Jump at the mint marks over the rival’s head. Hold Jump and steer ' + run + ' to the ledge.' :
        'Tap Attack to start. The rival will jump off your head. Tap Shield before you hit the floor to tech, or add a direction for a tech roll.') :
        pattern === 'cancel' ? 'Press Down + Attack. Try holding Shield only after touchdown. On the retry, start holding it as the chalk turns mint.' :
        isReversalPractice(practice) ? reversalTip(practice) : pattern === 'landing' ? 'Short-hop ' + run + '. Tap Attack over the gold fork for a late hit or the green stripe for a clean hit. Center the direction and jab on landing.' : 'Running ' + run + '. ' + (approach
        ? 'Press ' + back + ' and Jump together to turn. Steer ' + run + ' and tap Attack during takeoff.'
        : 'Keep drifting ' + run + '. Tap Jump and aim your back air ' + back + ' with ' + key + ', the right stick, or a flick from Smash.');
    } else if (climb) {
      const trap = pattern === 'trap', inward = practiceSide === 'left' ? 'right' : 'left';
      $('climb-escape').setAttribute('aria-pressed', String(!trap));
      $('climb-trap').setAttribute('aria-pressed', String(trap));
      $('climb-slow').setAttribute('aria-pressed', String(world.climbPractice.slow));
      $('climb-status').dataset.result = 'ready';
      $('climb-status').textContent = practiceSide === 'left' ? 'Left ledge' : 'Right ledge';
      message = trap ? 'Tap Attack to start. Watch the rival’s paws touch down, then tap Attack again to catch the climb.'
        : 'Press ' + inward + ' to climb. Release the direction and hold Shield as your dog stands up.';
    } else if (platform) {
      const below = pattern === 'below', hold = pattern === 'hold';
      const drop = pattern === 'shield-drop';
      for (const id of ['below','top','hold','shield-drop']) $('platform-' + id).setAttribute('aria-pressed', String(pattern === id));
      $('platform-slow').hidden = !drop;
      $('platform-slow').setAttribute('aria-pressed', String(!!world.platformPractice.slow));
      $('platform-status').dataset.result = 'ready';
      $('platform-status').textContent = drop ? 'Hold Shield to start' : hold ? 'Defend the high platform' : below ? 'Rival below' : 'Rival on top';
      message = drop ? 'Hold Shield. When the rising aerial hits your shield, keep holding it, flick down-right and tap Attack for ' + moves[player.kit.air.down].label + '.'
        : hold ? 'Tap Attack to start. Watch the right wing. Shield the rising aerial or intercept the second jump.'
        : below
        ? 'Tap Down to drop. As your paws pass the platform, aim down and tap Attack for ' + moves[player.kit.air.down].label + '.'
        : 'Press Down and Attack together for ' + moves[player.kit.tilts.down].label + '. Keep both paws on the platform.';
    } else if (escape) {
      for (const id of ['tip','close','counter','break']) $('escape-' + id).setAttribute('aria-pressed', String(id === pattern));
      $('escape-slow').setAttribute('aria-pressed', String(world.escapePractice.slow));
      $('escape-status').dataset.result = 'ready';
      if (pattern === 'counter') {
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
      for (const id of ['lip','shortCatch','longCatch','tip','deep']) $('edge-' + id).setAttribute('aria-pressed', String(id === d.pattern));
      $('edge-slow').setAttribute('aria-pressed', String(d.slow));
      $('edge-status').dataset.result = 'ready';
      $('edge-status').textContent = d.timeCatch ? (pattern === 'longCatch' ? 'Long recovery' : 'Short recovery') + ' · tap Attack to start' :
        pattern === 'lip' ? 'Guard the ' + side + ' ledge' : 'Drifting ' + side + ' · tap Attack';
      message = d.timeCatch ? 'Tap Attack to send the rival toward the ledge. Watch the last grip mark turn gold. Time Down + Attack to hit as it disappears.' :
        pattern === 'lip' ? 'Walk ' + side + ' to the chalk (P1: Shift + direction, or slide from the center dot). When the rival lets go, tap Down + Attack.' :
        'Tap Attack with the directions released for ' + moves[player.kit.air.neutral].label + '. Coast through the landing. If you slip off, tap Down + Attack.';
    } else if (footwork) {
      const practice = world.footworkPractice;
      for (const id of ['bait', 'match', 'power', 'disc', 'brake', 'pivot'])
        $('footwork-' + id).setAttribute('aria-pressed', String(practice.pattern === id));
      $('footwork-side').hidden = $('footwork-slow').hidden = pattern === 'bait';
      $('footwork-slow').setAttribute('aria-pressed', String(practice.slow));
      $('footwork-status').dataset.result = 'ready';
      $('footwork-status').textContent = {
        brake: 'Brake at the chalk', pivot: 'Catch the chase',
        bait: 'Bait Bear Hug', match: 'Clash jabs', power: 'Bolt Kick vs. Body Check', disc: 'Bat Round Trip',
      }[pattern];
      const discInput = player.kind === 'noodle' ? 'aim toward Clover and tap Attack' : 'tap Attack';
      message = {
        brake: 'Run ' + (practice.dir > 0 ? 'right' : 'left') + ' to the chalk. Release forward for a beat, then press forward and tap Attack together. Compare that with holding forward and tapping Attack.',
        pivot: 'Run ' + (practice.dir > 0 ? 'right' : 'left') + ' to the chalk with the rival on your heels. Press back and tap Attack together to catch them during your skid.',
        bait: 'Dash right to the chalk, then reverse. When Brisket misses his grab, dash back in and tap Attack. Choose Footwork practice to retry.',
        match: 'Tap Attack to start the count. On the third chalk light, tap Attack again to meet the other dog’s jab.',
        power: 'You’re Pip. Tap Attack to start and immediately hold Smash. Release on the third light to kick through Brisket’s Body Check.',
        disc: 'Tap Attack to start. Clover throws Round Trip. On the third light, ' + discInput + ' to bat the disc away.',
      }[pattern];
    } else if (wall) {
      $('wall-status').dataset.result = 'ready';
      $('wall-status').textContent = pattern === 'right' ? 'Right wall' : 'Left wall';
      message =
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
      const edge = pattern === 'edge';
      $('air-status').dataset.result = 'ready';
      $('air-status').textContent = edge
        ? practiceSide === 'left'
          ? 'Left ledge'
          : 'Right ledge'
        : 'Jump to begin';
      $('air-neutral').setAttribute('aria-pressed', String(!edge));
      $('air-edge').setAttribute('aria-pressed', String(edge));
      $('air-side').hidden = !edge;
      message = edge
        ? 'Aim up and ' +
          (practiceSide === 'left' ? 'right' : 'left') +
          ', then tap Shield to slip past the guard and catch the lip.'
        : 'Jump. As you fall toward the dummy, release the directions and tap Shield before its up tilt connects.';
    } else if (shield) {
      $('shield-status').dataset.result = 'ready';
      const guard = world.shieldPractice;
      $('shield-status').textContent = guard.coverage ? (pattern === 'poke' ? 'Rival shield' : 'Your shield') + (guard.worn ? ' · 30%' : ' · 100%') : 'Hold Shield to begin';
      $('shield-strength').hidden = !guard.coverage;
      $('shield-strength').setAttribute('aria-pressed', String(!!guard.coverage && !guard.worn));
      for (const button of $('shield-patterns').querySelectorAll('button:not(#shield-strength)'))
        button.setAttribute('aria-pressed', String(button.id === 'shield-' + pattern));
      message = {
        kick: 'You’re Clover. Hold Shield. Tap Grab when Pip’s Flying Kick hits the far side of your shield.',
        drop: 'You’re Clover. Hold Shield. Tap Grab as Brisket’s Belly Drop hits to catch him before he recovers.',
        strike: 'Raise Shield to start. Roll through the strike, or release Shield as it lands to parry.',
        grab: 'Raise Shield to start. Tap Down just before the grab to spot-dodge, or tap a side to roll.',
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
      message = pattern === 'attack' ? 'Tap Attack to start the fall. As the rival lands, tap neutral Attack. You can jab twice, then tap Down + Smash.'
        : 'Tap Attack to start the fall. Tap Shield just before you land. If you miss, try rolling away or sweeping as the second jab settles.';
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
    else if (ledge) message = 'Jump or use Special to start. ' + player.kit.recovery;
    $('recovery-tip').textContent = message;
    $('recovery-tip').hidden = !ledge || wave;
    clearInput();
    updateHUD();
    $('game').focus({ preventScroll: true });
    announce(message);
  }
  $('reset-training').onclick = () => drill(false);
  // Chromium can omit click on a training button after two thumbs release the fight controls.
  const trainingTools = $('training-tools');
  let trainingPress = null, activatedTouchButton = null;
  trainingTools.addEventListener('pointerdown', e => {
    activatedTouchButton = null;
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
    activatedTouchButton = press.button;
    press.button.click();
  });
  trainingTools.addEventListener('click', e => {
    if (e.detail > 0 && activatedTouchButton && e.target.closest('button') === activatedTouchButton) {
      activatedTouchButton = null;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  $('combo-training').onclick = () => drill('combo', false, 'example');
  for (const source of ['example','late','record','replay']) $('combo-' + source).onclick = () => drill('combo', false, source);
  $('combo-reply').onchange = e => {
    const d = world.comboPractice;
    drill('combo', false, d.source === 'record' && d.tape.length ? 'replay' : d.source, e.target.value);
    e.target.focus({ preventScroll: true });
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
  for (const action of ['repeat','clear','guard','ko'])
    $('freshness-' + action).onclick = () => drill('freshness', false, action);
  $('edge-training').onclick = () => drill('edge', false, world.edgePractice?.pattern || 'lip');
  for (const pattern of ['lip','shortCatch','longCatch','tip','deep']) $('edge-' + pattern).onclick = () => drill('edge', false, pattern);
  $('edge-side').onclick = () => drill('edge', false, world.edgePractice.pattern, -world.edgePractice.dir);
  $('edge-slow').onclick = () => {
    const d = world.edgePractice;
    d.slow = !d.slow;
    $('edge-slow').setAttribute('aria-pressed', String(d.slow));
    $('game').focus({ preventScroll: true });
  };
  $('footwork-training').onclick = () => drill('footwork', false, world.footworkPractice?.pattern || 'bait');
  for (const pattern of ['bait', 'match', 'power', 'disc', 'brake', 'pivot'])
    $('footwork-' + pattern).onclick = () => drill('footwork', false, pattern);
  $('footwork-side').onclick = () => drill('footwork', false, world.footworkPractice.pattern, -world.footworkPractice.dir);
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
  $('platform-shield-drop').onclick = () => drill('platform', false, 'shield-drop');
  $('platform-slow').onclick = () => {
    const practice = world.platformPractice;
    practice.slow = !practice.slow;
    $('platform-slow').setAttribute('aria-pressed', String(practice.slow));
    $('game').focus({ preventScroll: true });
  };
  $('escape-training').onclick = () => drill('escape', false, world.escapePractice?.spacing || 'tip');
  for (const pattern of ['tip','close','counter','break'])
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
  $('climb-escape').onclick = () => drill('climb', false, 'escape');
  $('climb-trap').onclick = () => drill('climb', false, 'trap');
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
  $('juggle-chase').onclick = () => {
    world.launchPractice.chase = !world.launchPractice.chase;
    drill('launch', false, 'juggle');
  };
  $('launch-lock').onclick = () => drill('launch', false, 'attack');
  $('launch-escape').onclick = () => drill('launch', false, 'defend');
  $('launch-floor-spike').onclick = () => drill('launch', false, 'spikeFloor');
  $('launch-edge-spike').onclick = () => drill('launch', false, 'spikeEdge');
  $('launch-stock-return').onclick = () => drill('launch', false, 'stockReturn');
  $('launch-survival').onclick = () => drill('launch', false, 'survival');
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
  $('wall-training').onclick = $('wall-retry').onclick = () =>
    drill('wall', false, world.wallPractice?.side || 'left');
  $('wall-side').onclick = () => drill('wall', false, world.wallPractice.side === 'left' ? 'right' : 'left');
  $('shield-training').onclick = () => drill('shield', false, world?.shieldPractice?.pattern || 'kick');
  for (const button of $('shield-patterns').querySelectorAll('button:not(#shield-strength)'))
    button.onclick = () => drill('shield', false, button.id.slice('shield-'.length));
  $('shield-strength').onclick = () => drill('shield', false, world.shieldPractice.pattern, !world.shieldPractice.worn);
  $('air-dodge-training').onclick = () => drill('air', false, world?.airPractice?.pattern || 'neutral');
  $('air-neutral').onclick = () => drill('air', false, 'neutral');
  $('air-edge').onclick = () => drill('air', false, 'edge');
  $('air-side').onclick = () => {
    practiceSide = practiceSide === 'left' ? 'right' : 'left';
    drill('air', false, 'edge');
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
    padRelease = false,
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
    window.DispatchCovers.draw($('title-cover'), 'title');
    if (focus) $('home-adventure').focus({ preventScroll: true });
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
    dismiss();
    $('pause-label').textContent = 'Pause';
    $('countdown').classList.remove('net-lag');
    page = 'match';
    drillSide = null;
    drillWaiting = false;
    padRelease = true;
    countdown = 0;
    accumulator = 0;
    adventureKey = '';
    for (const id of [
      'home',
      'dispatch-route',
      'dispatch-story',
      'lobby',
      'training-tools',
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
    const grip = world.grapple;
    const order = !grip || grip.phase === 'throw' ? world.objective : grip.owner === 0
      ? 'Tap Attack to pummel · Aim to throw' : 'Grabbed · Tap action buttons to escape';
    const key = [world.roomIndex, world.wave, hero.stocks, Math.floor(hero.damage), world.stamps, order,
      ...foes.flatMap((e) => [e.f.stocks, Math.floor(e.f.damage), e.hp])].join('|');
    if (key === adventureKey) return;
    adventureKey = key;
    $('runner-score').hidden = !!world.bridge;
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
          .map((e) => e.f.stats.name + ' ' + Math.floor(e.f.damage) + '%').join(', '));
        else $('rival-score').removeAttribute('aria-label');
      }
    }
    $('dispatch-marks').textContent = 'Postmarks ' + countMarks(world.stamps) + ' / ' + campaign.rooms.length;
    if ($('dispatch-objective').textContent !== order) $('dispatch-objective').textContent = order;
  }
  function showPercent(element, damage) {
    element.className = 'percentage' + (damage >= 110 ? ' danger' : damage >= 65 ? ' high' : '');
    element.textContent = Math.floor(damage) + '%';
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
    if (!down(pads[0], 0)) padRelease = false;
    while (accumulator >= 1 / 60 && !world.finished) {
      const input = playerInput(0, pads);
      if (padRelease) input.jump = false;
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
  function showOptions() {
    showDialog(
      'options',
      'Options',
      '<div class="option-list"><button type="button" data-do="option-sound" aria-pressed="' +
        settings.sound +
        '">Sound effects <b>' +
        (settings.sound ? 'On' : 'Off') +
        '</b></button><label for="option-volume">Volume <input type="range" id="option-volume" min="0" max="100" step="5" value="' +
        settings.volume +
        '"><output id="option-volume-value">' +
        settings.volume +
        '%</output></label><button type="button" data-do="option-shake" aria-pressed="' +
        settings.shake +
        '">Camera shake <b>' +
        (settings.shake ? 'On' : 'Off') +
        '</b></button><button type="button" data-do="option-tiltStick" aria-pressed="' + settings.tiltStick +
        '">Grounded aim stick <b>' + (settings.tiltStick ? 'Tilt' : 'Smash') +
        '</b></button><p>Also applies to the aim keys and a swipe from Smash on touch.</p></div><div class="dialog-actions"><button class="primary" data-do="close">Done</button></div>',
    );
  }
  $('dialog-body').addEventListener('input', (e) => {
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
    $('online-status').textContent = message;
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
    if (request === onlineRequest) online.start(action, onlineDog, code, $('online-stage').value);
  }
  function updateVotes() {
    const button = document.querySelector('[data-do=online-rematch]');
    if (!button) return;
    button.disabled = online.myVote;
    $('net-rematch-status').textContent = online.myVote ? 'Waiting for your opponent…' :
      online.theirVote ? 'Your opponent wants a rematch.' : '';
  }
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
  const keys = [
    {
      left: 'KeyA',
      right: 'KeyD',
      up: 'KeyW',
      down: 'KeyS',
      jump: 'Space',
      walk: 'ShiftLeft',
      attack: 'KeyJ',
      smash: 'KeyI',
      special: 'KeyK',
      shield: 'KeyL',
      grab: 'KeyU',
      aimLeft: 'KeyR', aimRight: 'KeyY', aimUp: 'KeyT', aimDown: 'KeyG',
    },
    {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
      jump: 'ShiftRight',
      walk: 'ControlRight',
      attack: 'Comma',
      smash: 'KeyN',
      special: 'Period',
      shield: 'Slash',
      grab: 'KeyM',
      aimLeft: 'Numpad4', aimRight: 'Numpad6', aimUp: 'Numpad8', aimDown: 'Numpad2',
    },
  ];
  const matchKeys = new Set(keys.flatMap((k) => Object.values(k)));
  const attackAim = [{}, {}];
  function rememberAttackAim(slot) {
    const map = keys[slot];
    const active = name => held.has(map[name]) || (slot === 0 && touches.has(name));
    const soft = slot === 0 && touchPointers.get(walkPointer)?.dataset.touch;
    const x = Number(active('right')) - Number(active('left'));
    const y = Number(active('down')) - Number(active('up'));
    attackAim[slot] = {
      x: x * (active('walk') || (soft && (soft.endsWith('left') || soft.endsWith('right'))) ? 64 / 127 : 1),
      rawX: x, y: y > 0 && (active('walk') || soft === 'down') ? 64 / 127 : y,
    };
  }
  window.addEventListener('keydown', (e) => {
    if (page !== 'match' || $('dialog').open) return;
    if (e.target instanceof HTMLSelectElement) return;
    if (world?.mode === 'training' && (e.code === 'BracketLeft' || e.code === 'BracketRight')) {
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
      if (e.target.id !== 'dummy-damage' || !world?.edgePractice?.timeCatch || e.code !== keys[0].attack) return;
      $('game').focus({ preventScroll: true });
    }
    if (!matchKeys.has(e.code)) return;
    e.preventDefault();
    held.add(e.code);
    if (!e.repeat) {
      taps.add(e.code);
      const slot = keys.findIndex(map => map.attack === e.code);
      if (slot >= 0) rememberAttackAim(slot);
    }
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  const touchButtons = [...document.querySelectorAll('[data-touch]')];
  function setTouch(pointerId, button) {
    const previous = touchPointers.get(pointerId);
    if (previous === button) return;
    if (button) touchPointers.set(pointerId, button);
    else touchPointers.delete(pointerId);
    touches.clear();
    const pressed = new Set(touchPointers.values());
    for (const el of pressed) for (const key of el.dataset.touch.split('-')) touches.add(key);
    if (button) {
      if (previous)
        for (const key of previous.dataset.touch.split('-')) if (!touches.has(key)) touchTaps.delete(key);
      for (const key of button.dataset.touch.split('-')) touchTaps.add(key);
      if (button.dataset.touch === 'attack') rememberAttackAim(0);
    }
    for (const el of touchButtons) el.classList.toggle('held', pressed.has(el));
  }
  touchButtons.forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
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
    clearInput();
    if (page === 'dispatch-story') setFilmPaused(true);
    if (page === 'match' && !online.match && !paused && world?.end === null) showPause();
  }
  window.addEventListener('blur', onBlur);
  const redrawPausedStage = () => {
    if (page === 'match' && world && view && (paused || frameLab.mode === 'frozen'))
      view.draw($('game'), world, 0, frameLab.mode === 'frozen' ? frameLab.renderTime : world.time);
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
      ? [...root.querySelectorAll('button,input:not([readonly])')].filter(
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
      e.target instanceof HTMLInputElement
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
    const pad = world.mode === 'local' && !online.match && pads.length === 1 ? (i === 1 ? pads[0] : null) : pads[i];
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
    const digitalAim = left || right || up || downAim || (!i && touches.has('neutral'));
    const rightX = axis(2),
      rightY = axis(3);
    const rightStick = Math.max(Math.abs(rightX), Math.abs(rightY)) > (rightStickHeld[i] ? 0.38 : 0.62);
    rightStickHeld[i] = rightStick;
    const keyAimX = Number(key('aimRight')) - Number(key('aimLeft'));
    const keyAimY = Number(key('aimDown')) - Number(key('aimUp'));
    const flick = !i && (touchFlick?.fired || touchTaps.has('aimStick')) ? flickAim : null;
    const aimStick = !!(rightStick || keyAimX || keyAimY || flick);
    // Let a swipe declare its direction before a stationary thumb starts charging a smash.
    if (!i && touchFlick?.deferSmash && !touchFlick.fired && performance.now() - touchFlick.started >= 110)
      touchFlick.committed = true;
    const touchSmash = !i && touches.has('smash') && (!touchFlick?.deferSmash || touchFlick.committed);
    const fromCenter = !i && touchPointers.get(walkPointer)?.dataset.touch;
    const walk = key('walk') || (fromCenter && (fromCenter.endsWith('left') || fromCenter.endsWith('right')));
    const shield = key('shield') || down(pad, 4) || down(pad, 5);
    const grounded = world.dogs[fighterIndex].ground >= 0;
    const gentleGuard = shield && grounded && (key('walk') || fromCenter);
    const gentleDown = y > 0 && !shield && (key('walk') || fromCenter === 'down');
    const side = (walk ? x * (64 / 127) : x) || axis(0) || (!left && !right && aim?.x) || 0;
    const vertical = ((gentleGuard || gentleDown) ? y * (64 / 127) : y) || axis(1) || (!up && !downAim && aim?.y) || 0;
    // Keep a held direction aimed when the second bumper is released. Centering rearms the dodge.
    if (grounded && down(pad, 4) && down(pad, 5)) shieldTiltLocked[i] = true;
    else if (!grounded || !shield || Math.max(Math.abs(side), Math.abs(vertical)) < 0.24) shieldTiltLocked[i] = false;
    return {
      x: shieldTiltLocked[i] ? clamp(side, -0.5, 0.5) : side,
      grabX,
      y: shieldTiltLocked[i] ? clamp(vertical, -0.5, 0.5) : vertical,
      // Apply the air dodge's radial dead zone to the whole stick, including shallow angles.
      airDodgeX: digitalAim ? (left || right ? grabX : 0) : pad?.axes?.[0] || 0,
      airDodgeY: digitalAim ? y : pad?.axes?.[1] || 0,
      jump: key('jump') || down(pad, 0),
      attack: key('attack') || down(pad, 2),
      smash: held.has(map.smash) || tapped('smash') || touchSmash || down(pad, 7),
      aimStick,
      tiltMode: settings.tiltStick && aimStick,
      smashX: aimStick ? (flick?.x ?? (keyAimX || keyAimY ? keyAimX : rightX)) : x || axis(0),
      smashY: aimStick ? (flick?.y ?? (keyAimX || keyAimY ? keyAimY : rightY)) : y || axis(1),
      special: key('special') || down(pad, 1),
      shield,
      grab: key('grab') || down(pad, 3),
      tapped: {
        jump: tapped('jump'),
        attack: tapped('attack'),
        smash: tapped('smash'),
        aimStick: !!(flick && touchTaps.has('aimStick')) ||
          ['aimLeft','aimRight','aimUp','aimDown'].some(tapped),
        special: tapped('special'),
        shield: tapped('shield'),
        grab: tapped('grab'),
      },
    };
  }
  let oldPad = {};
  function padMenu(pads) {
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
    if (now.pause && !oldPad.pause) {
      if (dialogType === 'pause' || dialogType === 'online-menu') dismiss();
      else if (page === 'match' && !dialogType) showPause();
      else if (page === 'dispatch-story' && !dialogType) toggleFilm();
      else if (page === 'lobby' && !dialogType) startMatch();
    } else if (page === 'match' && world?.mode === 'training' && !$('dialog').open &&
        (now.freeze && !oldPad.freeze || now.step && !oldPad.step)) {
      if (now.freeze && !oldPad.freeze) toggleFrames();
      else stepTrainingFrame();
    } else if (page !== 'match' || $('dialog').open) {
      const items = menuButtons();
      const n = items.indexOf(document.activeElement);
      if (n >= 0 && items[n].type === 'range' && now.horizontal && now.horizontal !== oldPad.horizontal) {
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
    $('countdown').textContent = !ended && waiting > 850 ? 'Waiting for opponent…' : world.time < 0.37 ? 'GO!' : '';
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
          clearInput();
          if (online.match) online.match.lastStep = performance.now();
          announce('Fight!');
        }
      } else if (online.match && !online.finished) {
        runOnline(dt, pads);
      } else if (world.end === null) {
        $('countdown').textContent = world.time < 0.37 && world.mode !== 'training' ? 'GO!' : '';
        if (frameLab.mode === 'frozen') {
          accumulator = frameLab.pending > 0 ? 1 / 60 : 0;
          if (frameLab.pending > 0) frameLab.pending--;
        } else accumulator += world.launchPractice?.slow || world.edgePractice?.slow || world.footworkPractice?.slow || world.wavePractice?.slow || world.comboPractice?.slow || world.escapePractice?.slow || world.climbPractice?.slow || world.platformPractice?.slow || world.spacingPractice?.slow || world.chasePractice?.slow || world.meteorPractice?.slow || world.stockPractice?.slow || world.survivalPractice?.slow ? dt / 2 : dt;
        while (accumulator >= 1 / 60 && world.end === null) {
          const input = playerInput(0, pads);
          const player = world.dogs[0];
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
          if (!drillWaiting) {
            const airborne = player.ground < 0;
            world.step(1 / 60, input, world.mode === 'local' ? playerInput(1, pads) : idleInput);
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
        updateHUD();
      } else {
        resultDelay -= dt;
        if (resultDelay <= 0 && (online.match ? dialogType !== 'online-result' : !$('dialog').open)) showResult();
      }
      if (world && (frameLab.mode !== 'frozen' || steppedFrame)) {
        const confirmed = online.match?.confirmedWorld;
        const waitingOnKO = confirmed && world.end !== null && confirmed.end === null;
        view.draw($('game'), waitingOnKO ? confirmed : world, frameLab.mode === 'frozen' ? 1/60 : dt,
          frameLab.mode === 'frozen' ? frameLab.renderTime : now);
      }
    }
    requestAnimationFrame(frame);
  }
  updateAudio();
  syncLobby();
  function openFilmLibraryLink() {
    showRoute();
    showReels();
  }
  function openLink() {
    const hash = location.hash;
    if (hash === '#training/landing-buffer') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'brisket', p2:'pip', stage:'picnic', fetch:false });
      setFrameMode('armed');
    } else if (hash === '#solo/shield-read') startShieldReadMatch();
    else if (hash === '#solo') {
      settings.mode = 'solo';
      editing = 0;
      toLobby();
    }
    else if (hash === '#cutscenes') openFilmLibraryLink();
    else if (hash === '#adventure') showRoute();
    else if (hash === '#online') showOnline();
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
    else if (hash === '#training/braking') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p2: 'pip', stage: 'picnic', fetch: false });
      drill('footwork', false, 'brake');
    }
    else if (hash === '#training/tumble') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode:'training', p1:'pip', p2:'brisket', stage:'picnic', fetch:false });
      drill('launch', false, 'juggle');
    }
    else if (hash === '#training/combos') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'clover', p2: 'pip', stage: 'picnic', fetch: false });
      drill('combo', false, 'example');
    }
    else if (hash === '#training/shield-drop') {
      menuScreen('match');
      afterStory = null;
      startMatch({ ...settings, mode: 'training', p1: 'brisket', p2: 'pip', stage: 'bandstand', fetch: false });
      drill('platform', false, 'shield-drop');
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
