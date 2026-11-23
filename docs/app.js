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
    arenas,
    Battle,
    idleInput,
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
    chevron: ['............', '.##......##.', '..##....##..', '...##..##...', '....####....', '.....##.....'],
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
  const settings = { stage: 'picnic', mode: 'solo', p1: 'pip', p2: 'brisket', fetch: true, sound: true };
  try {
    const s = JSON.parse(localStorage.getItem('dog-fight-3.config') || '{}');
    if (Object.hasOwn(arenas, s.stage)) settings.stage = s.stage;
    if (Object.hasOwn(modes, s.mode)) settings.mode = s.mode;
    for (const slot of ['p1', 'p2']) if (Object.hasOwn(fighters, s[slot])) settings[slot] = s[slot];
    for (const key of ['fetch', 'sound']) if (typeof s[key] === 'boolean') settings[key] = s[key];
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
  function clearInput() {
    held.clear();
    taps.clear();
    touches.clear();
    touchPointers.clear();
    touchTaps.clear();
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
    if (!settings.sound || !audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime + delay,
      oscillator = audioContext.createOscillator(),
      gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(22, end), now + length);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + length + 0.014);
  }
  function sound(name, detail = {}) {
    if (name === 'hit') {
      if (detail.emphatic) {
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
    } else if (name === 'ledgeTrump') {
      tone(490, 245, 0.075, 0, 'triangle', 0.06);
    } else if (name === 'ledgeRoll') {
      tone(215, 86, 0.085, 0, 'triangle', 0.045);
    } else if (name === 'shieldRoll' || name === 'spotDodge') {
      tone(name === 'shieldRoll' ? 195 : 315, 76, name === 'shieldRoll' ? 0.1 : 0.055, 0, 'triangle', 0.05);
    } else if (name === 'dodge') {
      if (detail.type === 'directionalAirDodge')
        tone(470, 155 - detail.dirY * 55, 0.12, 0, 'triangle', 0.065);
      else tone(260, 370, 0.07, 0, 'sine', 0.07);
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
    } else if (name === 'throwBounce') {
      const heavy = detail.moveId === 'brisketSitSlam';
      tone(heavy ? 109 : 430, heavy ? 45 : 650, 0.1, 0, 'triangle', heavy ? 0.14 : 0.065);
    } else if (name === 'grabEscape' || name === 'grabClash') {
      tone(475, 795, 0.055, 0, 'triangle', 0.065);
    } else if (name === 'smashReady') {
      tone(590, 740, 0.065, 0, 'triangle', 0.08);
      tone(880, 1100, 0.105, 0.048, 'triangle', 0.062);
    } else if (name === 'smashRelease') {
      const pitch = { pip: 400, brisket: 135, noodle: 325, clover: 540 }[detail.f.kind];
      tone(pitch, pitch * 0.52, 0.075, 0, 'triangle', 0.05 + detail.f.attack.power * 0.04);
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
    } else if (name === 'block' || name === 'break') {
      tone(910, 525, 0.044, 0, 'square', 0.025);
      tone(name === 'break' ? 385 : 760, name === 'break' ? 85 : 740, 0.08, 0.022, 'triangle', 0.055);
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
    page = 'lobby',
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
  const labelFor = (i) =>
    i === 0 ? 'P1' : settings.mode === 'local' ? 'P2' : settings.mode === 'training' ? 'DUMMY' : 'CPU';
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
    sound('menu');
  };
  function showDialog(kind, title, html, close = true) {
    dialogType = kind;
    $('dialog').dataset.view = kind;
    $('dialog-title').textContent = title;
    $('dialog-body').innerHTML = html;
    $('dialog-close').hidden = !close;
    if (!$('dialog').open) $('dialog').showModal();
    if (page === 'match') {
      paused = true;
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
    if (dialogType === 'result') return;
    if ((dialogType === 'controls' || dialogType === 'moves') && backToPause) {
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
    const rows = [
      ['Move / aim', 'W A S D', 'Arrow keys', 'Stick / D-pad'],
      ['Jump', 'Space', 'Right Shift', 'A'],
      ['Attack / charge', 'J', ',', 'X'],
      ['Smash / charge', 'I', 'N', 'RT / right stick'],
      ['Special', 'K', '.', 'B'],
      ['Shield / air dodge / tech', 'L', '/', 'LB / RB'],
      ['Grab / throw', 'U', 'M', 'Y'],
      ['Pause', 'Esc', 'Esc', 'Start'],
    ];
    const table =
      '<table class="control-table"><thead><tr><th>Action</th><th>P1</th><th>P2</th><th>Gamepad</th></tr></thead><tbody>' +
      rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
    showDialog(
      'controls',
      'Controls',
      table +
        '<p>On the ground, hold Shield and tap Left or Right to roll, or tap Down to spot-dodge in place. Release a raised Shield just before a strike or projectile lands to parry. A melee parry gives you time for a counterattack. Grabs beat a shield release. Try these in Training → Shield practice.</p>' +
        '<p>In midair, tap Shield with the stick centered to dodge in place. Aim and tap Shield to dodge in that direction, including diagonally. Aim up and toward the stage to slip past an edgeguard and catch the lip. You get one air dodge until you land or grab a ledge. Try Training → Air-dodge practice.</p>' +
        '<p>When a strong hit freezes the action, hold a direction across the launch to bend its path. As you tumble toward a platform, tap Shield just before contact to tech. Hold left or right as you land for a tech roll. Try both in Training → Launch practice.</p>' +
        '<p>Tap Jump for a short hop or hold it for a full jump. Jump again in midair. Down + Jump drops through a raised platform.</p><p>Tap Attack alone for your dog’s jab combo. On the ground, aim left, right, up, or down and tap Attack for a tilt. Press left or right and Attack together for a forward tilt. Press Attack once your dog is running for a dash attack. In the air, press Attack alone or aim forward, back, up, or down. Forward follows the way your dog faces.</p><p>For a grounded smash, aim sideways, up, or down. Tap Smash to swing immediately, or hold it and release for more power. From a standstill, holding Attack also charges a smash. On a controller, you can hold the right stick in a direction and let it return to center to swing.</p><p>Press Special alone for Neutral Special, or aim as you press it. Up + Special helps you get back to the stage. While hanging from an edge, tap Attack to climb in and strike. The Move list shows every fighter’s inputs.</p><p>Grabs beat shields. Run and press Grab to reach ahead. Press the opposite direction and Grab together as you turn to catch a pursuer. Once you catch a rival, tap Attack to pummel. Tap it again for another hit, or tap a direction to throw. The escape timer keeps running during pummels. Forward follows your facing at the catch. Press Grab again for forward, or tap action buttons to escape when caught.</p><p>Higher damage sends a dog farther. Three knockouts win a match. In local versus, one controller plays P2. Two controllers play one dog each.</p><div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>',
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
      hint: 'Hold across the launch path to bend it toward your stick. Try left or right against an up throw. Your angle locks in as the freeze ends.',
    },
    techRoll: {
      label: 'Tech landing',
      input: 'Tap Shield just before landing',
      hint: 'Leave movement neutral to land in place, or hold left or right to roll through. The roll covers more ground and takes longer to finish.',
    },
    floorAttack: {
      label: 'Get-up Sweep',
      input: 'After a knockdown · tap Attack',
      hint: 'Sweep both sides for 7% as you get up. You can also tap a side to roll away, or tap Up or Jump to stand.',
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
        '<p class="recovery-note">Shield is L for P1, Slash for P2, either bumper on a gamepad, or Shield on touch.</p><h3 class="guide-section">On the ground</h3><p>Choose <strong>Training → Shield practice</strong> to face a strike or a grab.</p><ul class="move-rows guide-shield">' +
        groundRows +
        '</ul><h3 class="guide-section">In the air</h3><p>One dodge per airtime. Landing or catching a ledge refreshes it. Try <strong>Training → Air-dodge practice</strong>.</p><ul class="move-rows guide-air-dodge">' +
        airRows +
        '</ul><h3 class="guide-section">At the ledge</h3><p>Release Shield after an air dodge, then tap it again once you catch the lip. Try <strong>Training → Ledge roll practice</strong>.</p><ul class="move-rows guide-ledge-roll">' +
        guideMoveRow(
          { label: kit.ledgeRoll.label, hint: kit.ledgeRoll.tip },
          'While hanging · tap Shield',
          'ledgeRoll',
          'defense',
        ) +
        '</ul><h3 class="guide-section">Ledge trumping</h3><p>Catch an occupied ledge to bump the other dog outward. A fresh catch protects you for 15 frames. Regrabs leave you open until you land or take a hit. Play either side in <strong>Training → Contested ledge</strong>.</p><h3 class="guide-section">After a launch</h3><p>Choose <strong>Training → Launch practice</strong> to take an up throw and try the landing again.</p><ul class="move-rows guide-defense">' +
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
        '<p class="recovery-note"><strong>Charge</strong> Aim and hold Smash (P1 I, P2 N, gamepad RT), then release. A tap swings immediately. Full power takes one second. You can hold for one more second before the move fires.</p><ul class="move-rows guide-smashes">' +
        rows +
        '</ul>';
    } else if (section === 'specials') {
      contents =
        '<p class="recovery-note"><strong>Offstage</strong> ' +
        kit.recovery +
        '</p><ul class="move-rows guide-specials">' +
        rows +
        '</ul>' +
        ledgeMove;
    } else {
      contents =
        '<h3 class="guide-section">Ground combo</h3><div class="guide-chain">' +
        kit.ground.map((id) => moves[id].label).join(' / ') +
        '</div><p>' +
        kit.combo +
        '</p><h3 class="guide-section">Ground tilts</h3><p>Aim and tap Attack. For a forward tilt, tap before your dog gets running.</p><ul class="move-rows guide-tilts">' +
        Object.entries(kit.tilts)
          .map(([side, id]) => guideMoveRow(moves[id], tiltInputs[side], side, 'tilts'))
          .join('') +
        '</ul><h3 class="guide-section">Dash attack</h3><ul class="move-rows guide-dash">' +
        guideMoveRow(moves[kit.dashAttack], 'Run + Attack', 'dash', 'dash') +
        '</ul>' +
        ledgeMove +
        '<h3 class="guide-section">Aerial attacks</h3><p>Forward follows the way your dog faces. You can drift backward.</p><ul class="move-rows guide-airs">' +
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
  $('fullscreen').hidden = !document.fullscreenEnabled;
  $('fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      announce('Fullscreen is unavailable in this window.');
    }
  };
  document.addEventListener('fullscreenchange', () => {
    const s = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen';
    $('fullscreen').setAttribute('aria-label', s);
    $('fullscreen').title = s;
  });
  function updateHUD() {
    const combo = world.lastCombo;
    const grip = world.grapple;
    const prompt = $('grapple-prompt');
    prompt.hidden = !grip || grip.phase === 'throw' || !!world.launchPractice;
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
    const player = world.dogs[0],
      chargeReadout = $('training-charge');
    const power = player.smashCharge ? smashPower(player.charge) : player.lastSmashPower;
    chargeReadout.hidden = world.mode !== 'training' || power === null;
    if (!chargeReadout.hidden) {
      const value = player.smashCharge
        ? power >= 1
          ? 'Full charge'
          : 'Charging ' + Math.round(power * 100) + '%'
        : 'Released at ' + Math.round(power * 100) + '%';
      if (chargeReadout.textContent !== value) chargeReadout.textContent = value;
    }
    const shownMove = player.smashCharge ? smashes[player.smashCharge.moveId].label : player.lastMove;
    const key =
      world.dogs.map((f) => f.kind + ':' + Math.floor(f.damage) + ':' + f.stocks).join('|') +
      world.mode +
      '/' +
      combo.hits +
      '/' +
      combo.damage +
      '/' +
      (world.mode === 'training' ? shownMove : '');
    if (key === hudKey) return;
    hudKey = key;
    const lastMove = $('training-move');
    lastMove.hidden =
      world.mode !== 'training' ||
      !shownMove ||
      (shownMove === 'Parry' && world.shieldPractice?.outcome === 'parry');
    if (!lastMove.hidden) lastMove.textContent = shownMove;
    const readout = $('training-combo');
    readout.hidden = world.mode !== 'training' || combo.hits === 0;
    if (!readout.hidden) {
      readout.textContent =
        combo.hits + (combo.hits === 1 ? ' hit' : ' hits') + ' · ' + Math.floor(combo.damage) + '% damage';
    }
    $('hud').innerHTML = world.dogs
      .map((f, i) => {
        const lives =
          world.mode === 'training'
            ? '∞'
            : Array.from(
                { length: 3 },
                (_, j) =>
                  '<i class="' + (j >= f.stocks ? 'lost' : '') + '" data-icon="paw">' + svg('paw') + '</i>',
              ).join('');
        return (
          '<div class="hud-card ' +
          (i ? 'two' : '') +
          '"><img alt="" src="' +
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
  function startMatch() {
    audioReady();
    dismiss();
    page = 'match';
    drillSide = null;
    drillWaiting = false;
    practiceSide = 'left';
    $('launch-status').hidden = true;
    $('wall-status').hidden = $('wall-patterns').hidden = true;
    $('shield-status').hidden = $('shield-patterns').hidden = true;
    $('air-status').hidden = $('air-patterns').hidden = true;
    $('roll-status').hidden = $('roll-patterns').hidden = true;
    $('trump-status').hidden = $('trump-patterns').hidden = true;
    $('recovery-tip').hidden = true;
    document.body.classList.add('playing');
    document.body.classList.toggle('training-active', settings.mode === 'training');
    $('lobby').hidden = true;
    $('match').hidden = false;
    view = new FightView();
    world = new Battle(settings, (name, e) => {
      view.event(name, e);
      sound(name, e);
      if (world?.launchPractice && e.f?.index === 0) launchFeedback(name, e);
      if (world?.wallPractice && e.f?.index === 0) wallFeedback(name);
      if (name === 'shieldCue' || name === 'shieldResult') shieldFeedback(name, e);
      if (name === 'airStart' || name === 'airCue' || name === 'airResult') airFeedback(name, e);
      if (world?.rollPractice && e.f?.index === 0 && (name === 'ledgeRoll' || name === 'rollResult'))
        rollFeedback(name, e);
      if (world?.trumpPractice) trumpFeedback(name, e);
      if (name === 'ledgeRollEnd' && drillSide && e.f.index === 0) {
        $('recovery-tip').textContent =
          e.f.kit.ledgeRoll.label + ' finished. You’re facing the ledge. Tap Attack to jab.';
        drillSide = null;
      }
      if (name === 'ko') announce(e.f.stats.name + ' knocked out');
      if (name === 'ledge' && drillSide && e.f.index === 0)
        $('recovery-tip').textContent =
          'Caught the ' +
          drillSide +
          ' ledge. Tap Attack for ' +
          moves[e.f.kit.ledgeAttack].label +
          ' or Shield to roll.';
      if (name === 'ko' && drillSide && e.f.index === 0) {
        drillSide = null;
        $('recovery-tip').textContent = 'Missed the ledge. Pick a side to try again.';
      }
      if (name === 'win') resultDelay = 0.7;
    });
    $('training-tools').hidden = settings.mode !== 'training';
    $('dummy-damage').value = '0';
    $('damage-output').textContent = '0%';
    $('match-mode').textContent = modes[settings.mode];
    $('match-stage').textContent = arenas[settings.stage].name;
    countdown = settings.mode === 'training' ? 0 : 2.4;
    lastCount = 0;
    resultDelay = 0;
    hudKey = '';
    accumulator = 0;
    $('countdown').textContent = countdown ? '3' : '';
    clearInput();
    updateHUD();
    view.draw($('game'), world, 0, 0);
    $('game').focus({ preventScroll: true });
    window.scrollTo(0, 0);
    announce(modes[settings.mode] + ' on ' + arenas[settings.stage].name);
  }
  function toLobby() {
    page = 'lobby';
    dismiss();
    world = null;
    view = null;
    document.body.classList.remove('playing', 'training-active');
    $('lobby').hidden = false;
    $('match').hidden = true;
    $('countdown').textContent = '';
    syncLobby();
    $('start').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function showPause() {
    if (page !== 'match' || !world || world.end !== null) return;
    showDialog(
      'pause',
      'Paused',
      '<div class="dialog-actions"><button class="primary" data-do="resume">' +
        icon('play') +
        'Resume</button><button class="utility" data-do="controls">' +
        icon('keyboard') +
        'Controls</button><button class="utility" data-do="moves">Move list</button></div><div class="dialog-actions"><button class="utility" data-do="rematch">' +
        icon('reset') +
        'Restart match</button><button class="utility" data-do="lobby">Fighter select</button></div>',
    );
    document.querySelector('[data-do=resume]').focus();
  }
  function showResult() {
    const f = world.dogs[world.end],
      elapsed = Math.floor(world.time);
    const duration = Math.floor(elapsed / 60) + 'm ' + String(elapsed % 60).padStart(2, '0') + 's';
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
        '</p></div></div><div class="dialog-actions"><button class="primary" data-do="rematch">' +
        icon('reset') +
        'Rematch</button><button class="utility" data-do="lobby">Fighter select</button></div>',
      false,
    );
    announce(f.stats.name + ' wins the Golden Tennis Ball');
    document.querySelector('[data-do=rematch]').focus();
  }
  $('start').onclick = startMatch;
  $('pause').onclick = showPause;
  $('dialog-body').addEventListener('click', (e) => {
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
    if (action === 'resume' || action === 'close') exitDialog();
    if (action === 'lobby') toLobby();
    if (action === 'rematch') startMatch();
    if (action === 'controls') showControls();
    if (action === 'moves') showMoves(world?.dogs[0].kind || settings.p1);
  });
  $('dummy-damage').addEventListener('input', (e) => {
    if (!world) return;
    world.setDummyDamage(e.target.value);
    $('damage-output').textContent = world.trainingDamage + '%';
    updateHUD();
  });
  let drillSide = null,
    drillWaiting = false,
    practiceSide = 'left';
  function shieldFeedback(name, e) {
    const result = $('shield-status');
    const tip = $('recovery-tip');
    const attackName =
      e.pattern === 'grab'
        ? grabs[world.dogs[1].kit.grab].label
        : smashes[world.dogs[1].kit.smashes.side].label;
    if (name === 'shieldCue') {
      result.dataset.result = e.phase;
      result.textContent = e.phase === 'windup' ? attackName + ' coming' : attackName;
      return;
    }
    result.dataset.result = e.outcome;
    const feedback = {
      parry: ['Parry', 'Shield released on time. After a melee parry, tap Attack to counter.'],
      block: ['Blocked', 'You held Shield through contact. Try releasing it just before the hit.'],
      hit: ['Hit', 'Try holding Shield through the windup, then release as the strike reaches you.'],
      grabbed: ['Grabbed', 'Hold Shield, then tap Down just before the grab reaches you.'],
      interrupted: ['Interrupted', 'You caught the dummy first. Choose Strike or Grab to retry.'],
      miss: [
        e.lastDodge === 'shieldRoll'
          ? 'Rolled clear'
          : e.lastDodge === 'spotDodge'
            ? 'Spot-dodged'
            : 'Missed',
        'Choose Strike or Grab to try another exchange.',
      ],
    };
    [result.textContent, tip.textContent] = feedback[e.outcome];
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
  function launchFeedback(name, e) {
    const result = $('launch-status'),
      tip = $('recovery-tip');
    let label, message;
    if (name === 'launchDI') {
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
  function drill(ledge, fromHang = false, pattern = 'strike') {
    if (!world) return;
    const launch = ledge === 'launch';
    const wall = ledge === 'wall';
    const shield = ledge === 'shield';
    const air = ledge === 'air';
    const roll = ledge === 'roll';
    const trump = ledge === 'trump';
    drillSide = launch || wall || shield || air || roll || trump ? null : ledge || null;
    drillWaiting = !!drillSide;
    if (drillSide) practiceSide = drillSide;
    view = new FightView();
    if (launch) world.resetLaunchPractice();
    else if (wall) world.resetWallPractice(pattern);
    else if (shield) world.resetShieldPractice(pattern);
    else if (air) world.resetAirPractice(pattern, practiceSide);
    else if (roll) world.resetLedgeRollPractice(pattern, practiceSide);
    else if (trump) world.resetLedgeTrumpPractice(pattern, practiceSide);
    else world.resetTraining(ledge, fromHang);
    const player = world.dogs[0];
    $('match-stage').textContent = arenas[world.stage].name;
    hudKey = '';
    const result = $('launch-status');
    result.hidden = !launch;
    $('wall-status').hidden = $('wall-patterns').hidden = !wall;
    $('shield-status').hidden = $('shield-patterns').hidden = !shield;
    $('air-status').hidden = $('air-patterns').hidden = !air;
    $('roll-status').hidden = $('roll-patterns').hidden = !roll;
    $('trump-status').hidden = $('trump-patterns').hidden = !trump;
    let message = 'Positions reset.';
    if (wall) {
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
      $('shield-status').textContent = 'Hold Shield to begin';
      $('shield-strike').setAttribute('aria-pressed', String(pattern === 'strike'));
      $('shield-grab').setAttribute('aria-pressed', String(pattern === 'grab'));
      message =
        pattern === 'strike'
          ? 'Raise Shield to start. Roll through the strike, or release Shield as it lands to parry.'
          : 'Raise Shield to start. Tap Down just before the grab to spot-dodge, or tap a side to roll.';
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
    $('recovery-tip').hidden = !ledge;
    clearInput();
    updateHUD();
    $('game').focus({ preventScroll: true });
    announce(message);
  }
  $('reset-training').onclick = () => drill(false);
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
  $('roll-guard').onclick = () => drill('roll', false, 'guard');
  $('roll-read').onclick = () => drill('roll', false, 'read');
  $('roll-side').onclick = () => {
    practiceSide = practiceSide === 'left' ? 'right' : 'left';
    drill('roll', false, world.rollPractice.pattern);
  };
  $('launch-training').onclick = () => drill('launch');
  $('wall-training').onclick = $('wall-retry').onclick = () =>
    drill('wall', false, world.wallPractice?.side || 'left');
  $('wall-side').onclick = () => drill('wall', false, world.wallPractice.side === 'left' ? 'right' : 'left');
  $('shield-training').onclick = () => drill('shield', false, world?.shieldPractice?.pattern || 'strike');
  $('shield-strike').onclick = () => drill('shield', false, 'strike');
  $('shield-grab').onclick = () => drill('shield', false, 'grab');
  $('air-dodge-training').onclick = () => drill('air', false, world?.airPractice?.pattern || 'neutral');
  $('air-neutral').onclick = () => drill('air', false, 'neutral');
  $('air-edge').onclick = () => drill('air', false, 'edge');
  $('air-side').onclick = () => {
    practiceSide = practiceSide === 'left' ? 'right' : 'left';
    drill('air', false, 'edge');
  };
  const keys = [
    {
      left: 'KeyA',
      right: 'KeyD',
      up: 'KeyW',
      down: 'KeyS',
      jump: 'Space',
      attack: 'KeyJ',
      smash: 'KeyI',
      special: 'KeyK',
      shield: 'KeyL',
      grab: 'KeyU',
    },
    {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
      jump: 'ShiftRight',
      attack: 'Comma',
      smash: 'KeyN',
      special: 'Period',
      shield: 'Slash',
      grab: 'KeyM',
    },
  ];
  const matchKeys = new Set(keys.flatMap((k) => Object.values(k)));
  window.addEventListener('keydown', (e) => {
    if (page !== 'match' || $('dialog').open) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (!e.repeat) showPause();
      return;
    }
    if (e.target instanceof HTMLInputElement) return;
    if (!matchKeys.has(e.code)) return;
    e.preventDefault();
    held.add(e.code);
    if (!e.repeat) taps.add(e.code);
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
    }
    for (const el of touchButtons) el.classList.toggle('held', pressed.has(el));
  }
  touchButtons.forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      setTouch(e.pointerId, el);
      audioReady();
    });
    if (el.closest('.dpad'))
      el.addEventListener('pointermove', (e) => {
        if (!touchPointers.has(e.pointerId)) return;
        const aim = document.elementFromPoint(e.clientX, e.clientY)?.closest('.dpad [data-touch]');
        if (aim) setTouch(e.pointerId, aim);
      });
    const release = (e) => setTouch(e.pointerId, null);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  });
  function onBlur() {
    clearInput();
    if (page === 'match' && !paused && world?.end === null) showPause();
  }
  window.addEventListener('blur', onBlur);
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
  function playerInput(i, pads) {
    const map = keys[i];
    const tapped = (action) => taps.has(map[action]) || (!i && touchTaps.has(action));
    const key = (action) => held.has(map[action]) || (!i && touches.has(action)) || tapped(action);
    const pad = world.mode === 'local' && pads.length === 1 ? (i === 1 ? pads[0] : null) : pads[i];
    const axis = (n) => (Math.abs(pad?.axes?.[n] || 0) > 0.23 ? pad.axes[n] : 0);
    const left = key('left') || down(pad, 14),
      right = key('right') || down(pad, 15);
    const x = Number(right) - Number(left);
    let grabX = x || axis(0);
    if (left && right) {
      // Rolling one direction key onto the other is a turn even during their brief overlap.
      const leftTap = tapped('left'),
        rightTap = tapped('right');
      grabX = leftTap === rightTap ? (world.dogs[i].prev.grabX ?? 0) : rightTap ? 1 : -1;
    }
    const up = key('up') || down(pad, 12),
      downAim = key('down') || down(pad, 13);
    const y = Number(downAim) - Number(up);
    const digitalAim = left || right || up || downAim || (!i && touches.has('neutral'));
    const rightX = axis(2),
      rightY = axis(3);
    const rightStick = Math.max(Math.abs(rightX), Math.abs(rightY)) > 0.62;
    return {
      x: x || axis(0),
      grabX,
      y: y || axis(1),
      // Apply the air dodge's radial dead zone to the whole stick, including shallow angles.
      airDodgeX: digitalAim ? (left || right ? grabX : 0) : pad?.axes?.[0] || 0,
      airDodgeY: digitalAim ? y : pad?.axes?.[1] || 0,
      jump: key('jump') || down(pad, 0),
      attack: key('attack') || down(pad, 2),
      smash: key('smash') || down(pad, 7) || rightStick,
      smashX: rightStick ? rightX : x || axis(0),
      smashY: rightStick ? rightY : y || axis(1),
      special: key('special') || down(pad, 1),
      shield: key('shield') || down(pad, 4) || down(pad, 5),
      grab: key('grab') || down(pad, 3),
      tapped: {
        jump: tapped('jump'),
        attack: tapped('attack'),
        smash: tapped('smash'),
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
      confirm: any(0),
      next: any(13) || any(15) || pads.some((p) => (p.axes[0] || 0) > 0.65 || (p.axes[1] || 0) > 0.65),
      prev: any(12) || any(14) || pads.some((p) => (p.axes[0] || 0) < -0.65 || (p.axes[1] || 0) < -0.65),
    };
    if (now.pause && !oldPad.pause) {
      if (dialogType === 'pause') dismiss();
      else if (page === 'match' && !dialogType) showPause();
      else if (page === 'lobby' && !dialogType) startMatch();
    } else if (page === 'lobby' || $('dialog').open) {
      const root = $('dialog').open ? $('dialog') : document,
        items = Array.from(root.querySelectorAll('button')).filter(
          (el) => el.offsetWidth && el.offsetHeight && !el.disabled,
        );
      const n = items.indexOf(document.activeElement);
      if (items.length && ((now.next && !oldPad.next) || (now.prev && !oldPad.prev)))
        items[(n + (now.next ? 1 : -1) + items.length) % items.length].focus({ preventScroll: false });
      if (now.confirm && !oldPad.confirm) {
        if (n >= 0) items[n].click();
        else if (page === 'lobby' && !$('dialog').open) startMatch();
      }
    }
    oldPad = now;
  }
  function frame(timestamp) {
    const now = timestamp / 1000,
      dt = Math.min(0.09, Math.max(0, now - before));
    before = now;
    const pads = getPads();
    padMenu(pads);
    if (page === 'lobby') {
      if (now - lastPreview > 1 / 24 && !document.hidden && !$('dialog').open) {
        drawPreview($('preview'), settings, now);
        lastPreview = now;
      }
    } else if (!paused && world) {
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
          announce('Fight!');
        }
      } else if (world.end === null) {
        $('countdown').textContent = world.time < 0.37 && world.mode !== 'training' ? 'GO!' : '';
        accumulator += dt;
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
            world.step(1 / 60, input, world.mode === 'local' ? playerInput(1, pads) : idleInput);
            if (drillSide && (player.attack?.ledgeAttack || (player.ground >= 0 && !player.floorAction))) {
              $('recovery-tip').textContent = player.attack?.ledgeAttack
                ? player.lastMove + '. Choose Practice ledge attack to try again.'
                : 'Back on stage. Pick a ledge to go again.';
              drillSide = null;
            }
          }
          taps.clear();
          touchTaps.clear();
          accumulator -= 1 / 60;
        }
        updateHUD();
      } else {
        resultDelay -= dt;
        if (resultDelay <= 0 && !$('dialog').open) showResult();
      }
      view.draw($('game'), world, dt, now);
    }
    requestAnimationFrame(frame);
  }
  updateAudio();
  syncLobby();
  requestAnimationFrame(frame);
})();
