(() => {
  'use strict';
  const { fighters, kits, moves, specials, arenas, Battle, idleInput } = window.DogFight;
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
      ['Special', 'K', '.', 'B'],
      ['Shield / air-dodge', 'L', '/', 'LB / RB'],
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
        '<p>Tap Jump for a short hop or hold it for a full jump. Jump again in midair. Down + Jump drops through a raised platform.</p><p>Tap Attack on the ground for your dog’s combo. Hold it to charge. In the air, press Attack alone or aim forward, back, up, or down. Forward follows the way your dog faces.</p><p>Press Special alone for Neutral Special. Aim left or right, up, or down as you press it for the other three. Every dog has a different Up Special for getting home. Open Move list for the inputs, then try either ledge in Training.</p><p>Grabs beat shields. Higher damage sends a dog farther. Three knockouts win a match. In local versus, one controller plays P2. Two controllers play one dog each.</p><div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>',
    );
  }
  $('controls').onclick = showControls;
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
    const specialPage = section === 'specials';
    const rows = Object.entries(kit[section])
      .map(([side, id]) => {
        const move = specialPage ? specials[id] : moves[id];
        return (
          '<li><canvas width="124" height="78" data-direction="' +
          side +
          '" aria-hidden="true"></canvas><div><small>' +
          (specialPage ? specialInputs[side] : airInputs[side]) +
          '</small><strong>' +
          move.label +
          '</strong><span>' +
          move.hint +
          '</span></div></li>'
        );
      })
      .join('');
    const sections =
      '<div class="guide-tabs" role="group" aria-label="Move categories">' +
      [
        ['air', 'Attacks'],
        ['specials', 'Specials &amp; recovery'],
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
    const contents = specialPage
      ? '<p class="recovery-note"><strong>Offstage</strong> ' +
        kit.recovery +
        '</p><ul class="move-rows guide-specials">' +
        rows +
        '</ul>'
      : '<h3 class="guide-section">Ground combo</h3><div class="guide-chain">' +
        kit.ground.map((id) => moves[id].label).join(' / ') +
        '</div><p>' +
        kit.combo +
        '</p>' +
        '<h3 class="guide-section">Aerial attacks</h3><p>Forward follows the way your dog faces. You can drift backward.</p><ul class="move-rows guide-airs">' +
        rows +
        '</ul>';
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
      drawMoveThumbnail(canvas, kind, canvas.dataset.direction, section);
  }
  $('lobby-moves').onclick = () => showMoves(settings[editing ? 'p2' : 'p1']);
  $('training-moves').onclick = () => showMoves(settings.p1);
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
    const key =
      world.dogs.map((f) => f.kind + ':' + Math.floor(f.damage) + ':' + f.stocks).join('|') +
      world.mode +
      '/' +
      combo.hits +
      '/' +
      combo.damage +
      '/' +
      (world.mode === 'training' ? world.dogs[0].lastMove : '');
    if (key === hudKey) return;
    hudKey = key;
    const lastMove = $('training-move');
    lastMove.hidden = world.mode !== 'training' || !world.dogs[0].lastMove;
    if (!lastMove.hidden) lastMove.textContent = world.dogs[0].lastMove;
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
    $('recovery-tip').hidden = true;
    document.body.classList.add('playing');
    document.body.classList.toggle('training-active', settings.mode === 'training');
    $('lobby').hidden = true;
    $('match').hidden = false;
    view = new FightView();
    world = new Battle(settings, (name, e) => {
      view.event(name, e);
      sound(name, e);
      if (name === 'ko') announce(e.f.stats.name + ' knocked out');
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
    if (action === 'moves') showMoves(settings.p1);
  });
  $('dummy-damage').addEventListener('input', (e) => {
    if (!world) return;
    world.setDummyDamage(e.target.value);
    $('damage-output').textContent = world.trainingDamage + '%';
    updateHUD();
  });
  let drillSide = null,
    drillWaiting = false;
  function drill(ledge) {
    if (!world) return;
    world.resetTraining(ledge);
    drillSide = ledge || null;
    drillWaiting = !!ledge;
    const message = ledge
      ? 'Jump or use Special to start. ' + world.dogs[0].kit.recovery
      : 'Positions reset.';
    $('recovery-tip').textContent = message;
    $('recovery-tip').hidden = !ledge;
    view = new FightView();
    clearInput();
    updateHUD();
    $('game').focus({ preventScroll: true });
    announce(message);
  }
  $('reset-training').onclick = () => drill(false);
  $('ledge-training').onclick = () => drill('left');
  $('ledge-right').onclick = () => drill('right');
  const keys = [
    {
      left: 'KeyA',
      right: 'KeyD',
      up: 'KeyW',
      down: 'KeyS',
      jump: 'Space',
      attack: 'KeyJ',
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
    const x = Number(key('right') || down(pad, 15)) - Number(key('left') || down(pad, 14));
    const y = Number(key('down') || down(pad, 13)) - Number(key('up') || down(pad, 12));
    return {
      x: x || axis(0),
      y: y || axis(1),
      jump: key('jump') || down(pad, 0),
      attack: key('attack') || down(pad, 2),
      special: key('special') || down(pad, 1),
      shield: key('shield') || down(pad, 4) || down(pad, 5),
      grab: key('grab') || down(pad, 3),
      tapped: {
        jump: tapped('jump'),
        attack: tapped('attack'),
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
          if (drillWaiting && (input.jump || input.special || input.tapped.jump || input.tapped.special)) {
            drillWaiting = false;
            $('recovery-tip').textContent = world.dogs[0].kit.recovery;
          }
          if (!drillWaiting) {
            world.step(1 / 60, input, world.mode === 'local' ? playerInput(1, pads) : idleInput);
            if (drillSide && (world.dogs[0].ledge || world.dogs[0].ground >= 0)) {
              $('recovery-tip').textContent =
                (world.dogs[0].ledge ? 'Caught the ' + drillSide + ' ledge.' : 'Back on stage.') +
                ' Pick a ledge to go again.';
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
