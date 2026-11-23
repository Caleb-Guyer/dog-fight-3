(() => {
  'use strict';
  const solid = (x1, x2, y) => ({ x1, x2, y, thin: false });
  const shelf = (x1, x2, y) => ({ x1, x2, y, thin: true });
  const fightStocks = 3;
  const foe = (kind, x, stocks = 1) => ({ kind, x, stocks });
  const rooms = [
    {
      id: 'alley', name: 'Parcel Alley', type: 'Brawl', intro: 'opening', outro: 'rescue',
      rules: 'relay',
      length: 1080, start: 425, terrain: [solid(135, 945, 505), shelf(170, 365, 410), shelf(716, 910, 410)],
      objective: 'Launch the cage guards off the dock to free Noodle.',
      waves: [[foe('clipper', 659)], [foe('porter', 344, 2)]],
      checkpoints: [{ wave: 1, name: 'parcel cage' }],
    },
    {
      id: 'weighhouse', name: 'The Weigh House', type: 'Rival duel',
      length: 1120, start: 438, terrain: [solid(145, 975, 508), shelf(235, 419, 407), shelf(698, 883, 407)],
      rules: 'duel',
      objective: 'Take Brisket’s three stocks. Recover if he knocks you off the scale.',
      waves: [[foe('brisket', 682, fightStocks)]],
      dispatch: 'Brisket yields the weigh ticket. Across the tracks, the idle sorting belts roar back to life.',
    },
    {
      id: 'exchange', name: 'Freight Exchange', type: 'Horde',
      rules: 'horde',
      length: 1160, start: 580, terrain: [solid(145, 1015, 510), shelf(181, 388, 408), shelf(770, 977, 408)],
      waves: [
        [foe('clipper', 774, 2), foe('puncher', 320)],
        [foe('porter', 852, 2), foe('puncher', 245)],
        [foe('puncher', 222), foe('clipper', 944), foe('porter', 805)],
      ],
      checkpoints: [{ wave: 2, name: 'last wave' }],
      dispatch: 'The last trolley coasts to a stop. Noodle spots a cable ferry beyond the freight doors.',
    },
    {
      id: 'bridge', name: 'Sorting Bridge', type: 'Crossing', outro: 'boss',
      length: 4880, start: 115, exit: 4775,
      terrain: [
        solid(0, 539, 510), solid(657, 1120, 510), solid(1440, 1960, 510),
        solid(2820, 3255, 510), solid(3360, 4100, 512), solid(4450, 4880, 502),
        shelf(465, 616, 422), shelf(706, 915, 399), shelf(1468, 1655, 419),
        shelf(3120, 3290, 413), shelf(3205, 3325, 317), shelf(3620, 3910, 335),
      ],
      signals: [
        { x: 801, y: 362, gate: 1038, name: 'West drawspan', order: 'Hit the west signal above the broken track.' },
        { x: 3816, y: 298, gate: 4040, name: 'East drawspan', order: 'Ride the freight lift up and hit the gantry signal.' },
      ],
      spans: [shelf(1111, 1449, 510), shelf(4091, 4459, 502)],
      ferry: { from: 1938, to: 2690, width: 185, y: 510, duration: 5.6 },
      lift: { x1: 3465, x2: 3640, bottom: 509, top: 335, duration: 2.4 },
      checkpoints: [{ x: 1580, name: 'Cable Dock', signals: 1 }, { x: 3005, name: 'Crane House', signals: 1 }],
      stamp: { x: 3260, y: 278 },
    },
    {
      id: 'depot', name: 'Bell Depot', type: 'Boss', intro: 'boss', outro: 'ending',
      rules: 'boss',
      length: 1160, start: 426, terrain: [solid(120, 1040, 520), shelf(182, 377, 415), shelf(788, 983, 415)],
      objective: 'Dodge the Copper Hound’s rush. Hit the lamp when its stamp sticks.',
      waves: [[{ ...foe('conductor', 739), hp: 170 }]],
    },
  ];
  for (const room of rooms) {
    room.checkpoints ??= [];
    room.spawns = [room.start, ...Array(3).fill(room.start)].map((x) => ({ x, ground: 0 }));
    room.walls = room.terrain.flatMap((p, index) =>
      p.thin ? [] : [true, false].map((left) => ({
        x: left ? p.x1 : p.x2, top: p.y, bottom: p.y + 135, index, left,
      })),
    );
  }
  const scenes = {
    opening: {
      art: 'opening',
      stop: 'alley',
      title: 'The silent yard',
      pages: [
        [
          'Parcel Alley · 6:00 pm',
          'The six o’clock train rattles past. Above the platform, the brass bell hangs silent. Its pull-cord has been cut.',
        ],
        [
          'Pip',
          'There’s a turquoise envelope under the knot. Three muddy pawprints on the back. That’s Noodle’s mark for “follow me.”',
        ],
      ],
    },
    rescue: {
      art: 'rescue',
      stop: 'weighhouse',
      chooseRunner: true,
      title: 'Return to sender',
      pages: [
        [
          'Parcel Alley',
          'Pip lifts the latch. Out of the parcel cage comes one very long dog, wearing a delivery label on each ear.',
        ],
        [
          'Noodle',
          '“The sorting hound swallowed the clapper. I heard it ring every time he stamped a parcel. Come on. I know the bridge.”',
        ],
      ],
    },
    boss: {
      art: 'boss',
      stop: 'depot',
      title: 'The Copper Hound',
      pages: [
        [
          'Bell Depot',
          'Behind the dispatch door, a brass machine stamps every letter RETURN. Each blow rings in precisely the voice of the missing bell.',
        ],
        ['Noodle', '“Watch that lamp. When the stamp sticks, give him something he can’t send back.”'],
      ],
    },
    ending: {
      art: 'ending',
      stop: 'depot',
      completesChapter: true,
      title: 'Special delivery',
      pages: [
        [
          'Bell Depot',
          'The clapper rolls out of the Copper Hound. Pip hooks it into place and Noodle pulls. One clear note travels the length of the line.',
        ],
        [
          'One station east',
          'Clover opens the turquoise envelope. Inside is a ticket punched with tomorrow’s date. Outside, a train with no lights slows to a stop.',
        ],
      ],
    },
  };
  const saveKey = 'dog-fight-3.last-dispatch.v1';
  const lastRoom = rooms.length - 1;
  function checkpointFighter(value) {
    if (!Number.isInteger(value?.stocks) || value.stocks < 1 || value.stocks > fightStocks ||
        !Number.isFinite(value.damage) || value.damage < 0 || value.damage > 999) return null;
    return { stocks: value.stocks, damage: value.damage };
  }
  function readSave(storage) {
    let raw;
    try { raw = JSON.parse(storage.getItem(saveKey)); } catch {}
    if (raw?.version === 1 && raw.started === true) {
      // Earlier chapters had three stops. A pending rescue still belongs at the cage.
      const oldRoom = [0, 1, 2].includes(raw.room) ? raw.room : 0;
      const room = oldRoom === 1 && raw.pending === 'rescue' ? 1 : [0, 3, lastRoom][oldRoom];
      const bits = Number.isInteger(raw.stamps) ? raw.stamps : 0;
      raw = { ...raw, version: 2, room, checkpoint: raw.midway && (room === 0 || room === 3) ? 1 : 0,
        stamps: (bits & 1) | ((bits & 2) << 2) | ((bits & 4) << 2) };
    }
    if (raw?.version !== 2 || raw.started !== true) raw = {};
    const room = Number.isInteger(raw.room) ? Math.max(0, Math.min(lastRoom, raw.room)) : 0;
    const checkpoint = Number.isInteger(raw.checkpoint)
      ? Math.max(0, Math.min(rooms[room].checkpoints.length, raw.checkpoint)) : 0;
    const scene = Object.hasOwn(scenes, raw.pending) && scenes[raw.pending];
    const pending = scene && scene.stop === rooms[room].id && !checkpoint ? raw.pending : '';
    return {
      version: 2, started: raw.started === true, room, checkpoint, pending,
      atCheckpoint: checkpoint && rooms[room].rules ? checkpointFighter(raw.atCheckpoint) : null,
      hero: room > 0 && raw.hero === 'noodle' ? 'noodle' : 'pip',
      stamps: Number.isInteger(raw.stamps) ? raw.stamps & ((1 << rooms.length) - 1) : 0,
      complete: room === lastRoom && raw.complete === true,
    };
  }
  function record(progress, event) {
    const fresh = { ...progress, started: true };
    if (event.stamp !== undefined) fresh.stamps |= 1 << event.stamp;
    if (event.room < progress.room) return fresh;
    if (event.room > progress.room) {
      fresh.room = event.room;
      fresh.checkpoint = 0;
      fresh.atCheckpoint = null;
      fresh.pending = '';
    }
    if (event.checkpoint && event.checkpoint >= fresh.checkpoint) {
      if (event.checkpoint > fresh.checkpoint || event.atCheckpoint !== undefined)
        fresh.atCheckpoint = checkpointFighter(event.atCheckpoint);
      fresh.checkpoint = event.checkpoint;
    }
    if (event.pending !== undefined && (!fresh.checkpoint || !event.pending) && (!fresh.complete || !event.pending))
      fresh.pending = event.pending;
    if (event.hero && fresh.room > 0) fresh.hero = event.hero;
    if (event.complete) fresh.complete = true;
    return fresh;
  }
  window.DispatchScript = { rooms, scenes, saveKey, lastRoom, fightStocks, readSave, record };
})();
