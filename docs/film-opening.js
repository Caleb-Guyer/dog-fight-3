/* The Silent Yard. Two eight-second, hand-staged pixel sequences. */
(() => {
  'use strict';
  const A = window.DispatchFilmArt;
  const { c, ease, lerp } = A;
  const tau = Math.PI * 2;
  const px = Math.round;
  const clay = '#9a665e',
    rose = '#bd7a76',
    dusk = '#8a7188',
    blueGlass = '#72868b';
  const tile = (name, w, h, paint) => A.plate('film-opening/' + name, w, h, paint);

  function skyline() {
    return tile('six-oclock-yard', 320, 180, (p) => {
      p.rect(0, 0, 320, 180, dusk);
      p.rect(0, 28, 320, 23, rose);
      p.rect(0, 51, 320, 25, c.peach);
      p.rect(0, 76, 320, 39, c.sand);
      p.oval(231, 52, 27, 27, c.wheat);
      A.cloudStrip(p, 73, 25, 62, '#a87580', '#c98a85');
      A.cloudStrip(p, 183, 44, 45, '#ba8584', c.peach);
      A.cloudStrip(p, 245, 20, 55, '#a87580', '#c98a85');
      p.rect(223, 62, 45, 2, c.peach);
      A.city(p, 110, '#8e7c83', '#987b7d', '#c39482');
      p.poly([177, 103, 183, 96, 182, 85, 189, 79, 203, 79, 210, 84, 210, 97, 218, 103], c.violet);
      p.path([182, 85, 196, 80, 208, 84], c.smoke);
      p.rect(185, 95, 23, 3, c.plum);
      p.path([186, 96, 185, 109, 207, 98, 207, 110], c.violet, 2);
      for (const x of [82, 136, 278]) {
        p.rect(x, 74, 2, 37, c.plum);
        p.rect(x - 4, 77, 11, 2, c.plum);
      }
      p.path([0, 65, 81, 77, 135, 76, 200, 82, 278, 76, 320, 70], c.violet);
      p.rect(0, 110, 320, 30, c.plum);
      p.rect(0, 113, 320, 4, c.rust);
      p.rect(0, 117, 320, 2, c.navy);
      for (let x = -15; x < 323; x += 13) p.path([x, 121, x + 5, 123, x + 11, 123], c.brick, 2);
      p.rect(0, 122, 320, 2, c.ochre);
      p.rect(0, 126, 320, 2, c.ink);
      p.rect(0, 130, 320, 3, c.slate);
      p.poly([0, 133, 320, 132, 320, 180, 0, 180], c.plum);
      p.poly([0, 147, 141, 136, 304, 136, 213, 146, 0, 165], c.rust);
      p.poly([0, 152, 173, 138, 266, 137, 179, 145, 0, 162], c.copper);
      for (const [x, y, w] of [
        [8, 154, 24],
        [95, 148, 31],
        [179, 141, 21],
        [250, 151, 15],
        [227, 170, 19],
      ])
        p.path([x, y, x + w, y - 2], c.ochre);
      p.path([0, 168, 224, 145, 319, 142], c.ink, 2);
    });
  }

  function canopy() {
    return tile('canopy-clock', 320, 180, (p) => {
      p.poly([0, 0, 320, 0, 320, 5, 227, 9, 98, 16, 80, 20, 0, 25], c.ink);
      p.path([0, 24, 85, 18, 226, 8, 319, 5], c.copper, 2);
      p.poly([0, 5, 11, 5, 12, 24, 29, 40, 27, 43, 12, 33, 12, 164, 5, 167, 2, 166], c.ink);
      p.path([9, 40, 9, 156], c.slate);
      p.path([12, 28, 29, 40], c.copper);
      p.rect(42, 9, 3, 12, c.ink);
      p.rect(48, 8, 2, 11, c.brick);
      p.poly([23, 19, 47, 15, 70, 18, 74, 23, 22, 26], c.ink);
      A.stationClock(p, 47, 44, 22);
      p.rect(32, 68, 31, 2, c.plum);
      p.rect(35, 70, 25, 1, c.copper);
      for (const x of [118, 181, 242, 296]) p.rect(x, 9 - Math.floor(x / 80), 2, 2, c.copper);
      p.poly([0, 169, 24, 162, 39, 164, 49, 171, 74, 177, 99, 180, 0, 180], c.ink);
      p.poly([256, 180, 263, 166, 279, 157, 301, 156, 320, 150, 320, 180], c.ink);
      p.path([264, 167, 282, 159, 299, 159], c.slate, 2);
    });
  }

  function mailCar() {
    return tile('passenger-post-car', 88, 48, (p) => {
      p.poly([1, 7, 8, 2, 77, 1, 86, 4, 87, 8, 83, 10, 83, 38, 79, 42, 7, 43, 3, 37, 3, 10], c.ink);
      p.rect(6, 8, 75, 24, c.green);
      p.rect(7, 10, 73, 2, c.aqua);
      p.poly([3, 7, 8, 4, 76, 3, 83, 5, 82, 7], c.copper);
      for (const x of [9, 23, 52, 67]) {
        p.rect(x, 13, 11, 13, c.night);
        p.rect(x + 1, 14, 9, 10, c.ochre);
        p.poly([x + 2, 15, x + 7, 15, x + 2, 21], c.wheat);
        p.rect(x + 5, 14, 1, 11, c.brick);
        p.rect(x, 26, 11, 1, c.aqua);
      }
      p.rect(36, 12, 14, 22, c.ink);
      p.rect(38, 14, 10, 18, c.rust);
      p.rect(39, 16, 8, 7, c.sand);
      p.rect(39, 23, 8, 1, c.navy);
      p.rect(44, 26, 2, 2, c.gold);
      p.rect(6, 32, 75, 3, c.copper);
      p.rect(7, 36, 74, 2, c.plum);
      p.rect(0, 35, 4, 2, c.slate);
      p.rect(83, 34, 5, 2, c.slate);
      for (const x of [12, 22, 65, 75]) {
        p.oval(x, 40, 5, 5, c.ink);
        p.oval(x, 40, 3, 3, c.slate);
        p.rect(x - 1, 39, 2, 2, c.brick);
      }
    });
  }

  function brakeVan() {
    return tile('brake-van', 88, 48, (p) => {
      p.image(mailCar(), 0, 0);
      p.rect(8, 12, 25, 19, c.green);
      p.rect(10, 13, 21, 18, c.ink);
      p.rect(12, 15, 17, 13, c.brick);
      p.poly([14, 26, 15, 20, 17, 18, 17, 16, 22, 16, 21, 19, 25, 22, 25, 27], c.sand, c.plum);
      p.path([15, 23, 17, 20, 19, 20], c.wheat);
      p.rect(10, 28, 22, 2, c.copper);
      p.rect(2, 23, 5, 8, c.night);
      p.rect(3, 25, 3, 4, c.red);
      p.rect(3, 25, 1, 2, c.gold);
      p.path([4, 33, 3, 42, 8, 42], c.slate);
    });
  }

  function wheelRods(p, x, y, scale, t) {
    const phase = t * 23,
      dx = Math.cos(phase) * 2.1,
      dy = Math.sin(phase) * 2.1;
    const at = (xw, yw) => [px(x + (xw + dx) * scale), px(y + (yw + dy) * scale)];
    const [a, b, d] = [
      [31, 53],
      [49, 51],
      [69, 48],
    ].map(([xw, yw]) => at(xw, yw));
    p.path([...a, ...b, ...d], c.ink, 2);
    p.path([...a, ...b, ...d], c.ochre);
    p.rect(a[0], a[1], 2, 1, c.wheat);
    p.rect(d[0], d[1], 2, 1, c.wheat);
  }

  function wide(p, t) {
    p.image(skyline(), 0, 0);
    const engineX = px(84 + 101 * t),
      engineY = 58,
      coachY = 81;
    for (let i = 5; i >= 0; i--) {
      const cycle = (t * 1.45 + i / 6) % 1,
        sx = engineX + 85 - cycle * 111;
      A.steam(
        p,
        sx,
        engineY + 1 - cycle * 35,
        12 + cycle * 38,
        7 + cycle * 8,
        cycle > 0.62 ? '#ad8890' : cycle > 0.27 ? '#957989' : c.violet,
        cycle > 0.62 ? '#c69c9b' : '#ae8b92',
      );
    }
    for (let i = 1; i <= 4; i++) {
      const x = engineX - 84 * i;
      if (x < 321 && x + 89 > 0)
        p.image(i === 4 ? brakeVan() : mailCar(), x, coachY + (px(t * 9 + i) % 4 === 0 ? 1 : 0), 86, 45);
    }
    p.image(A.train(), engineX, engineY, 114, 69);
    wheelRods(p, engineX, engineY, 1, t);
    // Fine damp reflections move with the lit windows. The platform remains still.
    for (let i = 0; i < 12; i++) {
      const xx = (((engineX - 14 - i * 24) % 326) + 326) % 326;
      p.rect(xx, 130 + (i % 2), 4 + (i % 4), 1, i % 3 === 0 ? c.copper : c.rust);
    }
    p.image(canopy(), 0, 0);
    p.oval(76, 166, 21, 3, c.night);
    const startled = t >= 0.9 && t < 1.31;
    A.dog(
      p,
      'pip',
      76 + (t > 0.95 ? 1 : 0),
      166,
      0.72,
      1,
      startled ? 'land' : 'idle',
      startled ? ease(0.9, 1.31, t) : 0.48,
      t,
    );
    for (let i = 0; i < 3; i++) {
      const f = (t * 0.72 + i * 0.39) % 1,
        x = px(-12 + 340 * f),
        y = px(139 - 3 * Math.sin(f * 8 + i));
      p.path([x, y, x + 4, y - 1], i === 1 ? c.sand : c.rust);
    }
  }

  function bellBay() {
    return tile('cut-cord-bay', 320, 180, (p) => {
      p.rect(0, 0, 320, 180, c.navy);
      p.poly([0, 30, 320, 5, 320, 132, 0, 148], c.plum);
      for (const x of [9, 66, 125, 185, 246, 304]) {
        A.arch(p, x, 27, 57, 94, c.night, x < 185 ? c.copper : c.peach);
        p.rect(x + 6, 79, 45, 37, x < 185 ? c.rust : clay);
        p.poly([x + 8, 59, x + 26, 39, x + 39, 37, x + 10, 79], x < 185 ? c.ochre : c.sand);
        p.rect(x + 25, 34, 3, 84, c.plum);
        p.rect(x + 5, 66, 46, 3, c.brick);
      }
      p.rect(0, 120, 320, 12, c.plum);
      p.rect(0, 127, 320, 4, c.ink);
      p.poly([0, 136, 320, 129, 320, 180, 0, 180], c.navy);
      p.path([0, 153, 319, 138], c.slate, 2);
      p.path([12, 180, 319, 147], c.plum, 2);
      p.poly([0, 0, 320, 0, 320, 12, 225, 18, 148, 18, 66, 27, 0, 29], c.ink);
      p.path([0, 30, 150, 16, 225, 17, 319, 11], c.copper, 2);
      p.rect(26, 10, 9, 131, c.night);
      p.rect(29, 27, 2, 109, c.slate);
      p.rect(268, 9, 5, 116, c.night);
      p.rect(270, 19, 1, 105, c.slate);
    });
  }

  function emptyBell() {
    return tile('empty-bell', 105, 96, (p) => {
      p.rect(47, 1, 12, 10, c.ink);
      p.rect(50, 2, 5, 7, c.ochre);
      p.poly(
        [
          8, 72, 18, 64, 23, 51, 25, 37, 29, 27, 34, 20, 41, 15, 45, 12, 57, 11, 66, 14, 75, 20, 81, 28, 84, 37, 86, 54,
          91, 66, 99, 72, 102, 78, 100, 82, 86, 85, 17, 84, 4, 80, 4, 75,
        ],
        c.ink,
      );
      p.poly(
        [9, 74, 22, 65, 28, 50, 30, 36, 36, 26, 44, 19, 51, 16, 59, 15, 68, 19, 75, 26, 79, 36, 81, 54, 86, 66, 95, 74],
        c.copper,
      );
      p.poly([16, 71, 26, 62, 32, 47, 34, 35, 41, 25, 49, 20, 55, 19, 48, 28, 45, 40, 44, 54, 38, 66, 31, 72], c.ochre);
      p.poly([26, 66, 34, 55, 37, 43, 38, 35, 43, 28, 48, 25, 46, 31, 42, 37, 40, 50, 35, 61, 31, 66], c.wheat);
      p.poly([55, 19, 64, 20, 72, 27, 76, 37, 78, 54, 82, 66, 89, 71, 72, 69, 66, 59, 65, 41, 62, 29], c.rust);
      p.path([19, 65, 31, 67, 47, 68, 65, 67, 82, 63], c.brick, 2);
      p.path([23, 64, 37, 65, 51, 66, 64, 65, 80, 62], c.gold);
      p.oval(52, 77, 46, 9, c.ink);
      p.oval(52, 75, 45, 7, c.ochre);
      p.oval(52, 78, 39, 5, c.brick);
      p.oval(52, 79, 32, 3, c.night);
      p.path([7, 75, 19, 71, 39, 70, 67, 71, 88, 72, 96, 75], c.gold, 2);
      // Slotted hanger visible inside the empty mouth.
      p.rect(49, 76, 9, 3, c.plum);
      p.rect(50, 76, 6, 1, c.copper);
      p.rect(53, 77, 2, 1, c.ink);
      p.rect(37, 30, 3, 1, c.cream);
      p.rect(34, 37, 2, 5, c.cream);
    });
  }

  function braided(p, pts, width = 4) {
    const points = pts.map(px);
    p.path(points, c.ink, width + 2);
    p.path(
      points.map((v) => v + 1),
      c.copper,
      width,
    );
    for (let i = 2; i < points.length; i += 2) {
      const x = points[i - 2],
        y = points[i - 1],
        dx = points[i] - x,
        dy = points[i + 1] - y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const count = Math.max(1, Math.round(length / 5));
      for (let k = 0; k < count; k++) {
        const f = (k + 0.35) / count,
          xx = px(x + dx * f) + 1,
          yy = px(y + dy * f) + 1;
        p.line(xx, yy + 1, xx + Math.max(1, width - 2), yy - 1, c.sand);
      }
    }
  }

  function knot() {
    return tile('cut-pull-knot', 48, 31, (p) => {
      braided(
        p,
        [2, 21, 9, 19, 17, 16, 25, 16, 31, 11, 32, 5, 26, 3, 19, 5, 17, 11, 22, 17, 31, 20, 36, 20, 39, 17],
        3,
      );
      braided(
        p,
        [7, 15, 15, 17, 20, 21, 26, 24, 34, 23, 38, 19, 37, 14, 31, 12, 25, 14, 24, 18, 30, 23, 39, 26, 43, 27],
        3,
      );
      p.path([2, 22, 0, 23], c.sand);
      p.path([42, 26, 46, 27], c.wheat);
      p.path([42, 29, 46, 30], c.ochre);
    });
  }

  function bellShot(p, t) {
    p.image(bellBay(), 0, 0);
    const tailX = px(178 + 101 * t);
    if (t < 1.42) p.image(brakeVan(), tailX, 95, 73, 37);
    p.poly([0, 9, 172, 4, 193, 11, 192, 20, 70, 27, 0, 31], c.night, c.ink);
    p.path([11, 24, 172, 10, 186, 11], c.ochre, 2);
    p.rect(104, 16, 8, 19, c.ink);
    p.rect(107, 17, 2, 16, c.copper);
    p.image(emptyBell(), 56, 28, 105, 96);
    p.path([119, 20, 156, 18, 166, 25, 168, 38], c.ink, 6);
    p.path([121, 19, 154, 17, 166, 27], c.rust, 4);
    p.oval(168, 37, 10, 10, c.ink);
    p.oval(168, 37, 7, 7, c.copper);
    p.oval(168, 37, 3, 3, c.plum);
    const swing = 34 * Math.exp(-0.6 * t) * Math.sin(t * 4.0 + 0.9);
    const tipX = 171 + swing,
      tipY = 129 - Math.abs(swing) * 0.19;
    const cord = [170, 44, 171 + swing * 0.12, 63, 172 + swing * 0.4, 81, 172 + swing * 0.75, 101, tipX, tipY];
    braided(p, cord, 4);
    p.path([tipX + 1, tipY + 2, tipX - 2, tipY + 8, tipX - 3, tipY + 10], c.sand, 2);
    p.path([tipX + 3, tipY + 2, tipX + 4, tipY + 7, tipX + 2, tipY + 11], c.wheat);
    p.path([tipX + 4, tipY + 2, tipX + 7, tipY + 5, tipX + 7, tipY + 9], c.copper);
    for (let i = 0; i < 4; i++) {
      const f = (t * 0.34 + i * 0.23) % 1,
        xx = px(133 + f * 82 + i * 8),
        yy = px(108 + f * 41 + (i % 2) * 8);
      p.rect(xx, yy, (i % 2) + 1, 1, i % 2 ? c.ochre : c.sand);
    }
    p.poly([0, 168, 53, 151, 83, 151, 137, 180, 0, 180], c.night);
    p.path([0, 167, 50, 152, 66, 152], c.plum, 2);
  }

  function sortingDesk() {
    return tile('oak-sorting-desk', 320, 180, (p) => {
      p.rect(0, 0, 320, 180, c.plum);
      p.poly([0, 41, 210, 0, 320, 0, 320, 180, 0, 180], c.brick);
      p.poly([10, 180, 140, 11, 221, 0, 94, 180], c.copper);
      p.poly([97, 180, 222, 0, 250, 0, 130, 180], c.rust);
      p.poly([143, 180, 263, 0, 316, 0, 208, 180], c.ochre);
      p.poly([224, 180, 283, 81, 320, 75, 320, 180], c.rust);
      for (const y of [23, 57, 96, 136, 175]) {
        p.path([0, y + 22, 104, y + 9, 319, y - 9], c.brick, 3);
        p.path([0, y + 21, 104, y + 8, 319, y - 10], c.plum);
      }
      const grains = [
        [10, 47, 41, 44, 53, 42],
        [77, 35, 89, 33, 111, 32],
        [217, 21, 244, 18, 263, 18],
        [134, 49, 149, 45, 165, 45],
        [30, 86, 54, 82, 75, 82],
        [180, 78, 202, 75, 225, 74],
        [256, 66, 279, 62, 292, 62],
        [4, 131, 42, 127, 64, 126],
        [77, 120, 105, 117, 114, 115],
        [171, 104, 197, 103, 223, 99],
        [244, 106, 270, 103, 299, 103],
        [14, 165, 46, 160],
        [57, 164, 102, 157, 113, 157],
        [190, 147, 215, 142, 243, 141],
        [276, 144, 301, 140],
      ];
      for (const pts of grains) p.path(pts, c.brick);
      p.path([26, 99, 41, 96, 57, 96, 66, 95, 61, 98, 41, 101, 31, 101], c.rust);
      p.path([202, 41, 216, 38, 234, 38, 226, 41, 208, 43], c.rust);
      p.path([207, 42, 222, 40], c.copper);
      for (const [x, y] of [
        [7, 36],
        [271, 37],
        [21, 114],
        [298, 116],
        [189, 164],
      ]) {
        p.rect(x, y, 3, 2, c.plum);
        p.rect(x, y, 2, 1, c.copper);
      }
    });
  }

  function floorClue(p, t) {
    p.image(sortingDesk(), 0, 0);
    // The decaying draught rolls the bottom knot off the bright corner.
    const move = ease(0.16, 1.07, t),
      settle = Math.sin(t * 8) * Math.exp(-t * 2.1);
    const x = px(130 - 23 * move),
      y = px(74 + 5 * move - 2 * settle);
    p.oval(152, 135, 55, 7, c.brick);
    p.image(A.envelope(), 109, 79, 85, 61);
    braided(p, [-3, 96, 27, 91, 48, 80, 56, 66, 50, 56, 37, 56, 31, 64, 37, 72, 56, 75, 83, 69, x + 7, y + 8], 4);
    p.image(knot(), x, y, 64, 41);
    p.poly([0, 0, 78, 0, 52, 26, 37, 41, 0, 51], c.night);
    p.path([0, 49, 35, 40, 54, 25], c.copper, 2);
    const shade = tile('pip-cast-shadow', 151, 151, (q) => {
      q.image(A.pipPortrait(), 0, 0);
      q.g.globalCompositeOperation = 'source-in';
      q.rect(0, 0, 151, 151, c.plum);
      q.g.globalCompositeOperation = 'source-over';
    });
    const shadowX = px(lerp(-129, -35, ease(0.9, 1.75, t)));
    p.image(shade, shadowX, 103, 126, 116);
    if (t < 1.28) {
      const k = ease(0, 1.28, t);
      const xx = px(211 + 56 * k),
        yy = px(74 + 34 * k - 17 * Math.sin(Math.PI * k));
      p.path([xx, yy, xx + 4, yy + 1, xx + 7, yy - 1], c.wheat);
    }
  }

  function counterHall() {
    return tile('parcel-counter-hall', 320, 180, (p) => {
      p.rect(0, 0, 320, 180, c.navy);
      p.rect(0, 21, 320, 66, c.plum);
      for (const x of [-18, 47, 118, 199, 267]) {
        A.arch(p, x, 22, 51, 71, c.night, x < 120 ? clay : c.copper);
        p.poly([x + 5, 53, x + 17, 34, x + 34, 31, x + 8, 74], x < 120 ? c.copper : c.sand);
        p.rect(x + 24, 32, 3, 60, c.brick);
        p.rect(x + 5, 58, 41, 3, c.brick);
      }
      p.rect(0, 87, 320, 10, c.night);
      p.rect(0, 88, 320, 2, c.copper);
      p.poly([0, 99, 153, 92, 320, 96, 320, 180, 0, 180], c.plum);
      p.poly([0, 140, 93, 103, 161, 96, 82, 136, 0, 172], c.rust);
      p.poly([6, 145, 104, 111, 133, 108, 51, 141], c.copper);
      p.path([0, 156, 136, 120, 319, 112], c.navy, 2);
      p.path([0, 174, 142, 134, 318, 127], c.night, 2);
      // The sorting bench puts the lost letter at Pip's paw height.
      p.poly([139, 125, 199, 106, 319, 110, 319, 140, 210, 155, 139, 140], c.ink);
      p.poly([141, 125, 202, 109, 319, 112, 319, 122, 213, 145], c.copper);
      p.poly([146, 126, 202, 111, 247, 112, 192, 132], c.ochre);
      p.poly([140, 130, 211, 145, 319, 123, 319, 132, 214, 152, 141, 139], c.brick);
      p.path([143, 128, 212, 144, 319, 122], c.sand, 2);
      p.rect(148, 140, 8, 36, c.night);
      p.rect(151, 141, 2, 31, c.brick);
      p.poly([283, 136, 295, 135, 294, 166, 288, 168], c.night);
      for (const [x, y] of [
        [164, 122],
        [220, 115],
        [245, 131],
        [274, 127],
      ])
        p.path([x, y, x + 9, y - 2], c.rust);
      A.crate(p, 261, 84, 42, 28);
      A.crate(p, 290, 62, 35, 24);
      p.poly([0, 170, 25, 162, 45, 165, 57, 172, 81, 180, 0, 180], c.night);
      p.path([0, 169, 26, 162, 42, 165], c.slate, 2);
      p.poly([0, 0, 320, 0, 320, 6, 181, 12, 86, 19, 0, 18], c.ink);
      p.path([1, 17, 84, 17, 182, 10, 319, 5], c.rust, 2);
      p.rect(228, 6, 3, 24, c.ink);
      p.image(A.bell(), 217, 26, 24, 21);
      p.rect(227, 45, 4, 3, c.plum);
    });
  }

  function reachPaw(p, rootX, rootY, x, y) {
    const elbowX = rootX + 5,
      elbowY = Math.max(y + 4, rootY + 4);
    p.poly(
      [
        rootX - 3,
        rootY - 5,
        elbowX,
        elbowY - 4,
        x - 3,
        y - 4,
        x + 3,
        y - 5,
        x + 8,
        y - 3,
        x + 9,
        y,
        x + 6,
        y + 2,
        x + 3,
        y + 2,
        x + 2,
        y + 4,
        x - 2,
        y + 4,
        elbowX,
        elbowY + 4,
        rootX - 5,
        rootY + 2,
      ],
      c.ink,
    );
    p.poly(
      [
        rootX - 2,
        rootY - 3,
        elbowX,
        elbowY - 2,
        x - 2,
        y - 2,
        x + 4,
        y - 3,
        x + 7,
        y - 2,
        x + 7,
        y,
        x + 2,
        y + 1,
        x,
        y + 2,
        elbowX,
        elbowY + 2,
        rootX - 3,
        rootY + 1,
      ],
      c.wheat,
    );
    p.path([elbowX + 1, elbowY - 1, x - 2, y - 2, x + 3, y - 3], c.cream, 2);
    p.rect(x + 4, y, 2, 1, c.copper);
  }

  function pickUp(p, t) {
    p.image(counterHall(), 0, 0);
    const travel = ease(0, 1.09, t),
      stop = ease(1.04, 1.4, t),
      look = ease(1.35, 1.86, t),
      lift = ease(1.88, 2.5, t);
    const x = px(32 + 93 * travel - 3 * stop),
      y = 155;
    const knotX = px(157 + 13 * look),
      knotY = px(105 + 4 * look);
    p.oval(x - 1, y + 1, 24, 4, c.night);
    if (t < 1.04) A.dog(p, 'pip', x, y, 0.91, 1, 'run', 0.5, t);
    else if (t < 1.45) A.dog(p, 'pip', x, y, 0.91, 1, 'skid', stop, t);
    else A.dog(p, 'pip', x, y, 0.91, 1, lift > 0.7 ? 'idle' : 'land', lift > 0.7 ? 0.5 : look, t);
    const wristX = px(132 + 19 * look - 8 * lift),
      wristY = px(133 - 11 * look - 19 * lift);
    const mailX = px(151 - 8 * lift),
      mailY = px(109 - 19 * lift - 2 * Math.sin(lift * Math.PI));
    p.image(A.envelope(), mailX, mailY, 34, 24);
    p.image(knot(), knotX, knotY, 32, 21);
    if (t > 1.3) reachPaw(p, x + 8, 130, wristX, wristY);
    // A single fleck drops from the paper as it clears the knot.
    if (t > 2.11 && t < 2.52) {
      const f = ease(2.11, 2.52, t);
      p.rect(mailX + 20 + f * 3, mailY + 19 + f * 15, 2, 1, c.brick);
    }
  }

  function faceCel(eye) {
    return tile('close-portrait-' + eye, 151, 151, (p) => {
      p.image(A.pipPortrait(), 0, 0);
      if (eye === 'down' || eye === 'sharp') {
        p.poly([63, 47, 66, 44, 72, 42, 77, 44, 78, 46, 76, 50, 72, 52, 66, 51], c.white);
        p.rect(72, 47, 5, 4, c.ink);
        p.rect(73, 47, 1, 1, c.white);
        p.rect(75, 50, 1, 1, c.rust);
        p.poly([91, 43, 94, 41, 98, 42, 99, 44, 97, 46, 92, 46], c.white);
        p.rect(95, 44, 3, 3, c.ink);
        if (eye === 'sharp') {
          p.path([60, 44, 66, 40, 72, 40, 78, 43], c.night, 2);
          p.path([89, 39, 94, 37, 98, 38], c.night);
        }
      }
      if (eye === 'blink') {
        p.poly([58, 46, 64, 41, 73, 39, 81, 43, 81, 50, 76, 55, 66, 56, 59, 51], '#d99a60');
        p.path([61, 49, 67, 51, 73, 51, 79, 47], c.ink, 2);
        p.poly([88, 40, 93, 38, 99, 40, 102, 45, 99, 48, 90, 49], c.cream);
        p.path([90, 45, 95, 46, 99, 43], c.ink, 2);
      }
    });
  }

  function readingBay() {
    return tile('reading-bay', 320, 180, (p) => {
      p.rect(0, 0, 320, 180, c.navy);
      p.poly([98, 27, 320, 2, 320, 173, 110, 158], c.plum);
      p.poly([122, 29, 284, 7, 284, 127, 123, 141], c.copper);
      p.poly([128, 34, 276, 15, 276, 125, 127, 136], c.ochre);
      p.poly([154, 31, 200, 25, 148, 123, 129, 126], c.wheat);
      p.poly([219, 22, 238, 20, 185, 133, 166, 134], c.sand);
      for (const x of [149, 213, 273]) p.rect(x, 18, 5, 121, c.rust);
      p.path([122, 72, 285, 54], c.brick, 5);
      p.path([122, 76, 284, 60], c.copper, 2);
      p.poly([0, 0, 320, 0, 320, 9, 118, 33, 0, 32], c.night);
      p.poly([0, 147, 320, 113, 320, 180, 0, 180], c.night);
      p.path([0, 149, 319, 115], c.copper, 2);
    });
  }

  function hand() {
    return tile('cream-paw-grip', 43, 32, (p) => {
      p.poly(
        [
          0, 27, 6, 20, 11, 14, 16, 11, 19, 7, 23, 4, 28, 4, 31, 7, 34, 8, 39, 9, 41, 12, 40, 15, 37, 17, 36, 20, 32,
          22, 28, 22, 24, 25, 18, 25, 15, 28, 13, 31, 0, 32,
        ],
        c.ink,
      );
      p.poly(
        [
          2, 28, 9, 19, 15, 15, 20, 12, 22, 7, 26, 6, 30, 8, 30, 12, 33, 11, 37, 11, 39, 13, 36, 15, 33, 15, 34, 17, 30,
          20, 26, 20, 23, 22, 18, 22, 13, 26, 11, 30, 2, 31,
        ],
        '#e7c697',
      );
      p.poly(
        [
          10, 20, 16, 15, 21, 13, 23, 7, 26, 7, 28, 8, 28, 10, 25, 14, 22, 16, 25, 15, 29, 13, 31, 13, 29, 16, 24, 18,
          17, 18, 12, 22,
        ],
        c.cream,
      );
      p.path([27, 17, 30, 17, 34, 14], c.ochre);
      p.path([19, 21, 23, 21, 26, 19], c.ochre);
      p.poly([0, 27, 3, 26, 5, 27, 3, 29, 8, 29, 13, 27, 11, 31, 0, 32], '#e7c697');
    });
  }

  function foreleg(p, x0, y0, x1, y1, thickness, rear = false) {
    const dx = x1 - x0,
      dy = y1 - y0,
      length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length,
      ny = dx / length;
    const at = (f, w) => [px(x0 + dx * f + nx * w), px(y0 + dy * f + ny * w)];
    const edge = [
      ...at(0, -thickness),
      ...at(0.45, -thickness * 0.79),
      ...at(0.67, -thickness * 0.68),
      ...at(0.76, -thickness * 0.75),
      ...at(0.78, -thickness * 0.61),
      ...at(1, -thickness * 0.47),
      ...at(1, thickness * 0.46),
      ...at(0.8, thickness * 0.56),
      ...at(0.78, thickness * 0.76),
      ...at(0.7, thickness * 0.67),
      ...at(0.58, thickness * 0.83),
      ...at(0.49, thickness * 0.76),
      ...at(0, thickness),
    ];
    p.poly(edge, rear ? '#d0a675' : '#e7c697', c.ink);
    p.poly(
      [
        ...at(0, -thickness * 0.81),
        ...at(0.48, -thickness * 0.56),
        ...at(0.95, -thickness * 0.38),
        ...at(0.95, -thickness * 0.1),
        ...at(0.58, -thickness * 0.2),
        ...at(0.52, 0),
        ...at(0.47, -thickness * 0.12),
        ...at(0.31, thickness * 0.1),
        ...at(0.23, 0),
        ...at(0, thickness * 0.18),
      ],
      rear ? c.sand : c.cream,
    );
    p.path([...at(0.14, thickness * 0.67), ...at(0.4, thickness * 0.5), ...at(0.48, thickness * 0.54)], c.ochre, 2);
  }

  function reaction(p, t) {
    p.image(readingBay(), 0, 0);
    const rise = ease(0.1, 0.88, t),
      focus = ease(1.11, 1.78, t);
    const cel = t > 0.76 && t < 0.92 ? 'blink' : t < 0.34 ? 'normal' : t < 1.17 ? 'down' : 'sharp';
    const face = faceCel(cel);
    const nod = px(3 * rise - 3 * focus);
    p.g.drawImage(face, 8, 0, 133, 119, -15, 3 + nod, 207, 185);
    // The same paw and sealed face move together as Pip raises the mail to eye level.
    const xx = px(174 - 9 * rise - 4 * focus),
      yy = px(127 - 26 * rise + 2 * focus);
    foreleg(p, 165, 186, xx + 77, yy + 40, 12, true);
    foreleg(p, 103, 187, xx - 19, yy + 55, 15);
    p.image(A.envelope(), xx, yy, 72, 51);
    p.image(hand(), xx - 28, yy + 26, 48, 36);
    p.image(hand(), xx + 56, yy + 18, 32, 24, true);
    if (t < 1.1) {
      const f = ease(0.22, 1.1, t);
      p.path([247 + f * 7, 94 + f * 18, 250 + f * 7, 93 + f * 18], c.sand);
    }
  }

  function mudPrint(p, x, y, variant) {
    const darkest = '#594443',
      mud = '#845b49',
      dry = '#a57958';
    const shapes = [
      [0, 10, 1, 7, 4, 6, 7, 8, 7, 12, 5, 15, 2, 14],
      [5, 5, 7, 1, 10, 0, 13, 2, 13, 7, 10, 10, 7, 9],
      [14, 4, 16, 0, 19, 0, 22, 3, 21, 8, 18, 10, 15, 8],
      [22, 9, 24, 5, 27, 5, 29, 7, 29, 11, 26, 15, 23, 14],
      [7, 18, 10, 15, 12, 12, 17, 12, 20, 14, 22, 18, 25, 20, 25, 23, 22, 25, 18, 25, 15, 23, 11, 24, 7, 24, 5, 22],
    ];
    const skew = variant === 0 ? -0.19 : variant === 1 ? 0.08 : 0.22;
    const at = (pts) => pts.map((v, i) => (i % 2 ? y + v : x + v + skew * (pts[i + 1] - 12)));
    for (const s of shapes) p.poly(at(s), mud);
    p.path(at([8, 20, 11, 17, 14, 14, 17, 14]), darkest, 2);
    p.path(at([8, 22, 11, 23, 15, 22, 19, 24, 22, 24]), darkest);
    p.rect(x + 3, y + 8, 2, 2, dry);
    p.rect(x + 9, y + 2, 2, 3, dry);
    p.rect(x + 17, y + 2, 2, 2, dry);
    p.rect(x + 11, y + 20, 2, 2, c.aqua);
    p.rect(x + 19, y + 18, 1, 2, c.aqua);
    p.rect(x + 24, y + 10, 1, 2, c.aqua);
    p.rect(x + 18, y + 5, 1, 1, c.aqua);
    if (variant !== 1) {
      p.rect(x + 2, y + 19, 2, 2, dry);
      p.rect(x + 6, y + 26, 2, 1, mud);
    }
  }

  function mailClose(back) {
    return tile(back ? 'muddy-back' : 'sealed-front', 192, 113, (p) => {
      p.poly([2, 19, 165, 1, 172, 2, 189, 87, 185, 91, 24, 111, 19, 109], c.ink);
      p.poly([5, 20, 166, 4, 185, 87, 24, 108], c.green);
      p.poly([7, 22, 165, 6, 182, 84, 25, 104], c.aqua);
      p.poly([8, 23, 64, 17, 80, 28, 34, 34, 18, 47], c.mint);
      p.path([8, 22, 164, 6, 167, 16], c.ice, 2);
      p.path([25, 105, 183, 85, 183, 80], c.teal, 2);
      p.path([24, 97, 25, 102, 46, 99], c.mint);
      if (!back) {
        p.poly([8, 23, 164, 7, 105, 66, 91, 68], c.teal);
        p.poly([9, 23, 160, 8, 104, 61, 92, 64], c.aqua);
        p.path([10, 23, 92, 65, 103, 63, 163, 8], c.green, 2);
        p.path([14, 24, 93, 62, 102, 60, 157, 11], c.mint);
        p.path([25, 103, 68, 58], c.mint, 2);
        p.path([127, 55, 181, 83], c.mint, 2);
        p.oval(98, 63, 16, 13, c.green);
        p.oval(98, 61, 15, 13, c.wheat);
        A.paw(p, 88, 52, c.navy, 2);
      } else {
        p.path([21, 48, 26, 53, 31, 54], c.teal);
        p.path([139, 16, 149, 17, 157, 15], c.mint);
        p.path([168, 65, 173, 67, 177, 65], c.teal);
        p.path([94, 92, 111, 89, 118, 89], c.mint);
        mudPrint(p, 36, 56, 0);
        mudPrint(p, 83, 32, 1);
        mudPrint(p, 132, 41, 2);
        p.path([45, 88, 51, 87], clay);
        p.rect(55, 85, 2, 1, clay);
        p.rect(124, 73, 3, 2, clay);
        p.rect(128, 75, 1, 1, clay);
      }
    });
  }

  function readingGrip(p, x, y, side) {
    const transform = (points) => points.map((n, i) => (i % 2 ? y + n : x + n * side));
    p.poly(
      transform([
        -108, 111, -108, 88, -87, 70, -64, 52, -50, 39, -40, 32, -32, 28, -25, 21, -20, 17, -18, 13, -13, 11, -11, 13,
        -5, 7, 0, 5, 4, 6, 7, 4, 13, 3, 16, 6, 16, 11, 12, 15, 8, 16, 5, 20, 2, 22, -3, 23, -6, 28, -11, 31, -16, 32,
        -21, 36, -24, 40, -28, 43, -45, 64, -64, 92, -73, 111,
      ]),
      side === 1 ? '#e7c697' : '#d5ae7a',
      c.ink,
    );
    p.poly(
      transform([
        -106, 90, -73, 62, -48, 41, -34, 31, -25, 23, -18, 16, -14, 14, -13, 16, -21, 27, -15, 24, -5, 13, 0, 8, 3, 8,
        3, 11, -7, 19, -11, 24, -18, 29, -22, 32, -29, 33, -40, 40, -55, 52, -72, 67, -90, 82, -106, 96,
      ]),
      side === 1 ? c.cream : c.wheat,
    );
    p.path(transform([-23, 35, -19, 31, -15, 30]), c.ochre);
    p.path(transform([-64, 78, -53, 65, -46, 58]), c.ochre, 2);
    p.path(transform([-13, 25, -8, 24, -3, 19]), c.ochre);
  }

  function pawReveal(p, t) {
    p.image(sortingDesk(), 0, 0);
    p.poly([0, 0, 109, 0, 66, 19, 35, 38, 0, 46], c.night);
    p.path([0, 44, 36, 35, 64, 17], c.rust, 2);
    const turn = ease(0.2, 1.5, t),
      push = ease(1.12, 2.45, t);
    const theta = Math.PI * turn;
    const w = px(186 + 34 * push),
      h = Math.max(4, px((108 + 17 * push) * Math.abs(Math.cos(theta))));
    const centerX = px(166 - 5 * push),
      centerY = px(91 + 4 * Math.sin(theta) - 3 * push);
    const left = px(centerX - w / 2),
      top = px(centerY - h / 2);
    const handY = px(centerY + 15 - 7 * Math.sin(theta));
    p.oval(centerX + 4, 140, px(w * 0.4), 7, c.brick);
    readingGrip(p, left, handY, 1);
    readingGrip(p, left + w, handY - 17, -1);
    if (h <= 8) {
      p.path([left + 7, centerY + 4, left + w - 7, centerY - 6], c.ink, 4);
      p.path([left + 8, centerY + 4, left + w - 8, centerY - 6], c.ice, 2);
    } else {
      p.image(mailClose(turn > 0.5), left, top, w, h);
    }
    // Front digits stay at the edges during the turn. The postal seal and all three muddy
    // prints belong to their respective paper faces and turn with the sheet.
    p.poly(
      [
        left + 3,
        handY + 7,
        left + 5,
        handY + 1,
        left + 12,
        handY - 5,
        left + 18,
        handY - 5,
        left + 21,
        handY - 2,
        left + 19,
        handY + 2,
        left + 15,
        handY + 5,
        left + 11,
        handY + 12,
        left + 7,
        handY + 15,
      ],
      c.ink,
    );
    p.poly(
      [
        left + 6,
        handY + 6,
        left + 8,
        handY + 1,
        left + 14,
        handY - 3,
        left + 18,
        handY - 3,
        left + 19,
        handY - 1,
        left + 15,
        handY + 2,
        left + 12,
        handY + 7,
        left + 8,
        handY + 12,
      ],
      c.wheat,
    );
    p.path([left + 11, handY + 1, left + 15, handY - 2, left + 17, handY - 2], c.white, 2);
    const right = left + w;
    p.poly(
      [
        right - 1,
        handY - 6,
        right - 4,
        handY - 12,
        right - 10,
        handY - 15,
        right - 16,
        handY - 14,
        right - 17,
        handY - 10,
        right - 13,
        handY - 6,
        right - 11,
        handY - 2,
        right - 6,
        handY + 1,
      ],
      c.ink,
    );
    p.poly(
      [
        right - 3,
        handY - 7,
        right - 6,
        handY - 11,
        right - 11,
        handY - 13,
        right - 14,
        handY - 12,
        right - 15,
        handY - 10,
        right - 12,
        handY - 8,
        right - 9,
        handY - 3,
        right - 6,
        handY - 2,
      ],
      c.wheat,
    );
    if (t > 1.35 && t < 2.1) {
      const f = (t - 1.35) / 0.75;
      p.rect(px(right - 42 + 13 * f), px(119 + 29 * f * f), 2, 2, clay);
    }
  }

  window.DispatchFilms.opening = function openingFilm(p, part, time = 0) {
    const t = Math.max(0, Math.min(8, Number.isFinite(time) ? time : 0));
    if (part === 0) {
      if (t < 3.4) wide(p, t);
      else if (t < 6.2) bellShot(p, t - 3.4);
      else floorClue(p, t - 6.2);
    } else if (t < 2.6) pickUp(p, t);
    else if (t < 4.75) reaction(p, t - 2.6);
    else pawReveal(p, t - 4.75);
  };
})();
