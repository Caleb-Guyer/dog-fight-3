(() => {
  'use strict';
  const solid = (x1, x2, y) => ({ x1, x2, y, thin: false });
  const shelf = (x1, x2, y) => ({ x1, x2, y, thin: true });
  const rooms = [
    {
      id: 'alley',
      name: 'Parcel Alley',
      intro: 'opening',
      outro: 'rescue',
      length: 2480,
      checkpoint: 1410,
      exit: 2350,
      terrain: [
        solid(0, 1030, 500),
        solid(1170, 2480, 500),
        shelf(565, 800, 387),
        shelf(925, 1065, 405),
        shelf(1190, 1350, 405),
        shelf(1650, 1860, 390),
      ],
      stamp: { x: 693, y: 342 },
      encounters: [
        { at: 370, x: 700, gate: 929, kind: 'clipper' },
        { at: 1690, x: 1990, gate: 2230, kind: 'clipper' },
      ],
      objective: 'Find Noodle at the parcel cage.',
      combat: 'Break the Clipper to release the crossing arm.',
      exitHint: 'Reach the parcel cage.',
    },
    {
      id: 'bridge',
      name: 'Sorting Bridge',
      intro: 'rescue',
      outro: 'boss',
      length: 2770,
      checkpoint: 1260,
      exit: 2640,
      terrain: [
        solid(0, 630, 510),
        solid(790, 1510, 508),
        solid(1645, 2190, 482),
        solid(2335, 2770, 510),
        shelf(484, 650, 411),
        shelf(738, 920, 366),
        shelf(1100, 1250, 400),
        shelf(1450, 1650, 389),
        shelf(1672, 1915, 364),
        shelf(2100, 2300, 396),
      ],
      stamp: { x: 831, y: 317 },
      signal: { x: 1798, y: 332, gate: 2115 },
      encounters: [{ at: 190, x: 452, gate: 585, kind: 'clipper' }],
      objective: 'Cross the gaps to the bridge signal.',
      combat: 'Clear the Clipper from the bridge.',
      exitHint: 'Follow the green signal to Bell Depot.',
    },
    {
      id: 'depot',
      name: 'Bell Depot',
      intro: 'boss',
      outro: 'ending',
      length: 1520,
      checkpoint: 318,
      exit: 1430,
      terrain: [solid(0, 1520, 520), shelf(230, 420, 411), shelf(680, 886, 396), shelf(1195, 1360, 408)],
      stamp: { x: 326, y: 360 },
      encounters: [{ at: 448, x: 1000, gate: 1340, kind: 'conductor' }],
      objective: 'Find the bell clapper.',
      combat: 'Jump the rush. Strike when the stamp sticks.',
      exitHint: 'Take the clapper to the dispatch door.',
    },
  ];
  for (const room of rooms) {
    room.spawns = [
      { x: 110, ground: 0 },
      { x: 330, ground: 0 },
    ];
    room.walls = room.terrain.flatMap((p, index) =>
      p.thin
        ? []
        : [true, false].map((left) => ({
            x: left ? p.x1 : p.x2,
            top: p.y,
            bottom: p.y + 135,
            index,
            left,
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
      stop: 'bridge',
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
  function readSave(storage) {
    let raw;
    try {
      raw = JSON.parse(storage.getItem(saveKey));
    } catch {}
    if (!raw || raw.version !== 1) raw = {};
    const room = Number.isInteger(raw.room) ? Math.max(0, Math.min(rooms.length - 1, raw.room)) : 0;
    const started = raw.started === true;
    const pending =
      started &&
      (raw.pending === rooms[room].intro ||
        (raw.pending === rooms[room].outro && scenes[raw.pending]?.completesChapter))
        ? raw.pending
        : '';
    return {
      version: 1,
      started,
      room: started ? room : 0,
      midway: started && raw.midway === true,
      pending,
      hero: started && room > 0 && raw.hero === 'noodle' ? 'noodle' : 'pip',
      stamps: started && Number.isInteger(raw.stamps) ? raw.stamps & 7 : 0,
      complete: started && room === 2 && raw.complete === true,
    };
  }
  // Replaying an earlier stop can add a postmark without moving the saved train backward.
  function record(progress, event) {
    const fresh = { ...progress, started: true };
    if (event.room > fresh.room || (event.room === fresh.room && event.midway)) {
      fresh.room = event.room;
      fresh.midway = !!event.midway;
    }
    if (event.stamp !== undefined) fresh.stamps |= 1 << event.stamp;
    if (event.complete) fresh.complete = true;
    const nextStory =
      event.room > progress.room ||
      (event.room === progress.room && (!progress.midway || !event.pending || event.pending === 'ending'));
    if (event.pending !== undefined && nextStory && (!progress.complete || event.pending === ''))
      fresh.pending = event.pending;
    if (event.hero && fresh.room > 0 && event.room >= progress.room) fresh.hero = event.hero;
    return fresh;
  }
  window.DispatchScript = { rooms, scenes, saveKey, readSave, record };
})();
