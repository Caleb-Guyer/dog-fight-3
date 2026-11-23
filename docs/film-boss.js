/* The Last Dispatch · Bell Depot. All shots are drawn at the cartridge's 320 × 180 resolution. */
(() => {
  'use strict';
  const { c, PixelPen, plate, dog, ease, lerp, arch, paw, rivet, steam } = window.DispatchFilmArt;
  const bank = (name, w, h, draw) => plate('boss-film/' + name, w, h, draw);
  const tau = Math.PI * 2;
  const rounded = Math.round;

  function pin(p, x, y, r = 4) {
    p.oval(x, y, r, r, c.ink);
    p.oval(x, y, r - 1, r - 1, c.rust);
    p.line(x - r + 2, y - 2, x - 1, y - r + 2, c.wheat);
    p.rect(x - 1, y - 1, 2, 2, c.slate);
  }
  function rod(p, x, y, u, v, r, shade, light) {
    const dist = Math.hypot(u - x, v - y) || 1,
      nx = (-(v - y) * r) / dist,
      ny = ((u - x) * r) / dist;
    p.poly([x + nx, y + ny, u + nx, v + ny, u - nx, v - ny, x - nx, y - ny], shade, c.ink);
    p.line(x + nx * 0.63, y + ny * 0.63, u + nx * 0.63, v + ny * 0.63, light, 1);
  }
  function wheel(p, x, y, r, time, tone = c.copper) {
    p.oval(x, y, r, r, c.ink);
    p.oval(x, y, r - 2, r - 2, tone);
    p.oval(x, y, r - 4, r - 4, c.night);
    for (let i = 0; i < 5; i++) {
      const a = time + (i * tau) / 5;
      p.line(x, y, x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4), tone, 2);
    }
    p.oval(x, y, 3, 3, c.plum);
    p.rect(x - 1, y - 1, 2, 2, c.wheat);
  }
  function machine(p, x, y, size, pose, phase, time) {
    p.g.save();
    p.g.translate(rounded(x), rounded(y));
    p.g.scale(size, size);
    window.DispatchActors.draw(p.g, 'conductor', 0, 0, { face: -1, pose, phase, time });
    p.g.restore();
  }
  function warehouse() {
    return bank('hall', 344, 186, (p) => {
      p.rect(0, 0, 344, 186, c.night);
      p.poly([0, 0, 206, 0, 180, 86, 0, 133], c.navy);
      p.poly([186, 0, 344, 0, 344, 98, 180, 90], c.plum);
      for (const [x, y, w, h] of [
        [-19, 22, 44, 64],
        [39, 16, 50, 68],
        [105, 17, 42, 61],
        [183, 24, 31, 43],
        [233, 21, 38, 52],
        [290, 18, 44, 61],
      ]) {
        arch(p, x, y, w, h, c.ink, c.slate);
        p.poly(
          [x + 7, y + 24, x + w * 0.47, y + 6, x + w - 6, y + 8, x + 7, y + h - 9],
          x < 160 ? '#647e8b' : '#7c727a',
        );
        p.poly(
          [
            x + 8,
            y + h - 12,
            x + 16,
            y + h - 20,
            x + 22,
            y + h - 18,
            x + 29,
            y + h - 26,
            x + w - 6,
            y + h - 22,
            x + w - 6,
            y + h - 5,
            x + 8,
            y + h - 5,
          ],
          c.navy,
        );
        p.rect(x + w * 0.48, y + 7, 2, h - 10, c.night);
        p.rect(x + 3, y + h * 0.55, w - 6, 2, c.night);
        p.rect(x + 7, y + h - 1, w - 10, 1, x < 160 ? c.steel : c.smoke);
      }
      p.poly([44, 81, 61, 81, 120, 118, 93, 133, 31, 144], '#586572');
      p.poly([67, 78, 80, 78, 143, 112, 129, 118], '#576170');
      p.poly([0, 112, 178, 82, 344, 89, 344, 186, 0, 186], '#61515c');
      p.poly([0, 151, 158, 96, 190, 94, 53, 184, 0, 184], '#746268');
      p.poly([92, 186, 190, 102, 263, 95, 228, 186], '#795e59');
      for (const [x, y, u, v] of [
        [-17, 166, 175, 90],
        [38, 185, 187, 91],
        [69, 185, 196, 93],
        [231, 186, 241, 96],
        [338, 184, 265, 95],
      ]) {
        p.line(x, y, u, v, c.night, 2);
        p.line(x, y - 1, u, v - 1, '#9e7b6c');
      }
      for (const x of [-10, 97, 218, 333]) {
        p.path([x, 0, x + 52, 23, x + 103, 0], c.ink, 4);
        p.line(x + 11, 3, x + 52, 20, c.slate);
        p.line(x + 51, 2, x + 51, 20, c.ink, 2);
        p.rect(x + 5, 0, 5, 98, c.night);
        p.rect(x + 6, 0, 1, 90, '#5c586b');
      }
      p.path([8, 9, 88, 12, 164, 5, 226, 9, 333, 2], c.ink, 2);
      p.rect(21, 0, 1, 23, c.plum);
      p.poly([16, 25, 19, 21, 23, 21, 27, 25, 27, 27, 16, 27], c.ink);
      p.rect(18, 26, 7, 2, c.sand);
      for (const [x, y] of [
        [20, 79],
        [123, 72],
        [268, 70],
        [303, 75],
      ]) {
        p.rect(x, y, 18, 17, c.ink);
        p.rect(x + 2, y + 2, 14, 13, c.plum);
        for (let i = 0; i < 3; i++) p.rect(x + 4, y + 4 + i * 3, 10, 1, c.violet);
      }
      p.path([246, 29, 252, 24, 303, 22, 313, 28, 313, 85], c.night, 6);
      p.path([248, 29, 253, 25, 303, 24, 311, 29, 311, 80], c.rust, 3);
      for (const x of [266, 289]) p.rect(x, 23, 3, 5, c.copper);
      p.rect(1, 101, 45, 4, c.night);
      p.rect(8, 106, 29, 2, c.slate);
      for (const [x, y, span] of [
        [12, 137, 19],
        [66, 146, 12],
        [91, 120, 8],
        [165, 125, 10],
        [198, 132, 21],
        [292, 154, 28],
        [283, 114, 9],
      ]) {
        p.path([x, y, x + span * 0.4, y - 2, x + span, y - 2], '#8e756d');
        p.rect(x + span * 0.55, y + 1, 4, 1, '#564b59');
      }
      for (const [x, y] of [
        [1, 94],
        [21, 95],
        [301, 93],
      ]) {
        p.poly([x, y, x + 19, y - 3, x + 28, y, x + 10, y + 4], c.smoke, c.plum);
        p.path([x + 2, y, x + 11, y + 1, x + 18, y - 2], c.violet);
      }
    });
  }
  function doorLeaf(right) {
    return bank('door/' + right, 163, 180, (p) => {
      p.rect(0, 0, 163, 180, c.ink);
      p.rect(3, 0, 157, 180, c.navy);
      p.rect(10, 5, 143, 167, c.night);
      p.rect(13, 10, 136, 153, '#454655');
      p.poly([14, 11, 139, 11, 126, 22, 14, 49], '#4c5161');
      p.poly([15, 90, 145, 48, 145, 68, 14, 109], '#494b5b');
      for (const y of [10, 51, 101, 146]) {
        p.rect(11, y, 139, 3, c.ink);
        p.rect(14, y + 1, 130, 1, '#6a606b');
        for (const x of [18, 49, 103, 139]) {
          p.rect(x, y - 4, 2, 2, c.plum);
          p.rect(x, y - 4, 1, 1, c.steel);
        }
      }
      const inner = right ? 3 : 154;
      p.rect(inner, 0, 6, 180, c.ink);
      p.rect(inner + 1, 2, 2, 177, c.copper);
      p.rect(0, 126, 162, 11, c.ink);
      p.rect(2, 127, 157, 7, c.brick);
      p.rect(2, 128, 156, 1, c.copper);
      for (const x of [12, 42, 114, 142]) rivet(p, x, 131);
      const x = right ? 0 : 160,
        wing = right ? 1 : -1;
      const wingShape = [
        14, 69, 28, 65, 50, 51, 59, 49, 49, 63, 62, 59, 56, 67, 43, 75, 48, 76, 42, 81, 21, 89, 12, 86,
      ];
      p.poly(
        wingShape.map((v, i) => (i % 2 ? v : x + wing * v)),
        c.brick,
        c.ink,
      );
      p.path([x + wing * 17, 75, x + wing * 36, 66, x + wing * 54, 54], c.ochre, 2);
      p.path([x + wing * 19, 81, x + wing * 40, 73, x + wing * 52, 65], c.copper, 2);
      p.rect(x - 20, 69, 41, 26, c.ink);
      p.rect(x - 18, 71, 37, 22, c.rust);
      p.rect(x - 16, 73, 33, 17, c.ochre);
      p.path([x - 17, 72, x, 83, x + 17, 72], c.brick, 2);
      p.path([x - 15, 90, x - 7, 83], c.copper);
      p.path([x + 8, 83, x + 16, 90], c.copper);
      p.oval(x, 83, 6, 5, c.brick);
      paw(p, x - 5, 78, c.sand);
      for (const [u, v] of [
        [18, 23],
        [87, 30],
        [44, 113],
        [107, 155],
      ]) {
        p.line(u, v, u + 7, v - 2, '#5b5666');
        p.rect(u + 8, v - 2, 3, 1, c.plum);
      }
    });
  }
  function track(p, t) {
    p.poly([26, 130, 232, 104, 276, 111, 50, 151], c.ink);
    p.poly([31, 130, 230, 107, 268, 112, 49, 146], '#63757a');
    for (let i = 0; i < 14; i++) {
      const x = 26 + ((i * 19 + Math.floor(t * 17)) % 237);
      const y = 130 - (x - 26) * 0.1;
      p.line(x, y, x + 9, y + 5, '#495968', 2);
    }
    p.path([26, 132, 49, 149, 273, 112], c.night, 3);
    p.path([49, 147, 269, 112], c.sand);
    for (const x of [59, 137, 215]) {
      const y = 147 - (x - 49) * 0.16;
      p.line(x, y + 4, x - 1, y + 20, c.ink, 4);
      p.line(x, y + 6, x, y + 17, c.steel);
    }
  }
  function smallMail(p, x, y) {
    p.poly([x - 9, y, x + 4, y - 2, x + 12, y + 1, x - 2, y + 4], c.wheat, c.brick);
    p.path([x - 7, y, x, y + 1, x + 4, y - 1], c.ochre);
    p.rect(x + 5, y, 2, 1, c.berry);
  }
  function reveal(p, t) {
    const glide = ease(0.55, 2.45, t);
    p.image(warehouse(), -rounded(glide * 7), -1);
    track(p, t);
    smallMail(p, 125 + ((t * 12) % 38), 124 - ((t * 12) % 38) * 0.13);
    machine(p, 225 - rounded(glide * 5), 132, 0.81, 'idle', 0.2, t + 1);
    dog(p, 'pip', 65 + rounded(glide * 2), 157, 0.56, 1, 'idle', 0.2, t);
    dog(p, 'noodle', 99 + rounded(glide * 2), 161, 0.55, 1, 'idle', 0.5, t + 0.3);
    // A real latch retracts before the two heavy door leaves can part.
    const open = rounded(158 * ease(0.48, 2.22, t)),
      bolt = rounded(28 * ease(0.23, 0.62, t));
    p.image(doorLeaf(false), -open, 0);
    p.image(doorLeaf(true), 160 + open, 0);
    const x = 143 - open;
    p.rect(x - 8, 107, 25, 13, c.ink);
    p.rect(x - 6, 109, 20, 8, c.brick);
    p.rect(x - 7 - bolt, 110, 37, 5, c.ink);
    p.rect(x - 6 - bolt, 110, 35, 3, c.copper);
    p.rect(x - 3 - bolt, 109, 4, 6, c.sand);
    if (open > 5 && open < 153) {
      p.rect(158 - open, 0, 2, 105, c.ochre);
      p.rect(161 + open, 25, 1, 83, c.copper);
    }
    p.poly([0, 170, 20, 164, 36, 167, 41, 180, 0, 180], c.ink);
    p.poly([288, 180, 300, 168, 319, 164, 320, 180], c.ink);
  }
  function cancellingBench() {
    return bank('press-bed', 320, 180, (p) => {
      p.rect(0, 0, 320, 180, c.night);
      p.poly([0, 0, 159, 0, 126, 92, 0, 109], c.navy);
      p.poly([0, 18, 98, 0, 112, 0, 76, 62, 0, 84], '#4b6573');
      p.poly([0, 39, 78, 9, 69, 25, 0, 63], '#637c81');
      p.poly([163, 0, 320, 0, 320, 133, 151, 100], '#624958');
      p.path([-7, 91, 33, 68, 61, 68, 83, 48, 180, 40], c.ink, 6);
      p.path([-7, 90, 34, 68, 62, 67, 84, 48, 180, 40], c.steel, 2);
      for (const x of [32, 108, 134]) p.rect(x, rounded(x < 35 ? 65 : 43 - (x - 108) * 0.1), 3, 8, c.navy);
      for (const x of [12, 90, 204, 306]) {
        p.rect(x, 0, 5, 94, c.ink);
        p.rect(x + 1, 0, 1, 75, '#5c5768');
      }
      p.poly([0, 96, 314, 69, 320, 73, 320, 104, 0, 132], c.ink);
      p.poly([0, 98, 320, 72, 320, 80, 0, 113], c.brick);
      p.line(0, 98, 319, 73, c.copper, 2);
      p.poly([0, 129, 320, 99, 320, 161, 0, 180], c.ink);
      p.poly([0, 128, 320, 98, 320, 135, 0, 174], '#778687');
      p.poly([0, 141, 320, 111, 320, 132, 0, 169], '#a29180');
      p.path([0, 173, 319, 136], c.ink, 3);
      p.path([0, 177, 319, 140], c.copper, 2);
      p.poly([0, 177, 320, 139, 320, 180, 0, 180], c.navy);
      for (const x of [23, 77, 209, 302]) {
        const y = rounded(180 - x * 0.12);
        p.rect(x, y, 4, 4, c.ink);
        p.rect(x, y, 2, 1, c.wheat);
      }
      // The press lives on a cast-iron standard, with two rails to keep the die square.
      p.poly([209, 0, 302, 0, 297, 82, 272, 103, 245, 106, 235, 75, 209, 61], c.ink);
      p.poly([215, 0, 287, 0, 285, 64, 264, 84, 247, 88, 241, 65, 215, 57], c.rust);
      p.poly([225, 0, 267, 0, 253, 10, 241, 42, 218, 50], c.copper);
      p.poly([267, 8, 287, 2, 285, 52, 265, 73, 263, 51], c.brick);
      p.path([220, 11, 250, 5, 262, 5], c.sand, 2);
      p.path([259, 70, 276, 59, 279, 36], c.ochre, 2);
      for (const [u, v] of [
        [225, 16],
        [234, 50],
        [280, 15],
        [273, 65],
      ])
        rivet(p, u, v);
      p.rect(138, 0, 10, 67, c.ink);
      p.rect(140, 0, 4, 65, c.steel);
      p.rect(141, 0, 1, 54, c.ice);
      p.rect(164, 0, 8, 67, c.ink);
      p.rect(166, 0, 2, 65, c.smoke);
      p.poly([125, 0, 183, 0, 182, 21, 175, 29, 135, 28, 125, 20], c.ink);
      p.poly([128, 0, 178, 0, 178, 20, 171, 24, 137, 23, 129, 18], c.rust);
      p.rect(132, 4, 39, 3, c.ochre);
      p.rect(135, 13, 33, 3, c.brick);
    });
  }
  const dieLetters = {
    R: ['110', '101', '110', '101', '101'],
    E: ['111', '100', '110', '100', '111'],
    T: ['111', '010', '010', '010', '010'],
    U: ['101', '101', '101', '101', '111'],
    N: ['1001', '1101', '1011', '1001', '1001'],
  };
  function impression() {
    return bank('return-ink', 56, 16, (p) => {
      p.rect(0, 0, 55, 1, c.berry);
      p.rect(0, 13, 55, 1, c.berry);
      p.rect(0, 1, 1, 12, c.berry);
      p.rect(54, 1, 1, 12, c.berry);
      let x = 3;
      for (const ch of 'RETURN') {
        const glyph = dieLetters[ch];
        glyph.forEach((row, j) =>
          [...row].forEach((mark, i) => {
            if (mark === '1') p.rect(x + i * 2, 2 + j * 2, 2, 2, '#a54b49');
          }),
        );
        x += glyph[0].length * 2 + 2;
      }
      p.rect(5, 12, 2, 1, c.sand);
      p.rect(35, 0, 3, 1, c.sand);
    });
  }
  function packet(p, x, printed, buckle) {
    const y = 125 - (x - 150) * 0.105,
      fold = rounded(buckle);
    p.poly([x - 52, y - 9, x + 29, y - 14, x + 56, y + 10, x - 36, y + 21], c.ochre, c.ink);
    p.poly([x - 51, y - 10, x + 26, y - 16, x + 55, y + 8, x - 36, y + 18], c.wheat, c.brick);
    p.path([x - 49, y - 9, x - 13, y + 1, x + 27, y - 14], c.sand, 2);
    p.path([x - 40, y + 14, x - 18, y + 1], c.sand);
    p.poly([x + 14, y - 12, x + 24, y - 13, x + 31, y - 7, x + 21, y - 5], c.aqua, c.green);
    if (printed) p.image(impression(), x - 26, y + 1, 55, 14);
    if (fold > 0) {
      p.poly(
        [x + 23, y + 11, x + 37, y + 9 - fold, x + 49, y + 10, x + 56, y + 8, x + 45, y + 15],
        c.cream,
        c.ochre,
      );
      p.line(x + 36, y + 10 - fold, x + 45, y + 13, c.sand);
    }
  }
  function stampHead() {
    return bank('die', 80, 49, (p) => {
      p.rect(29, 0, 24, 27, c.ink);
      p.rect(32, 0, 17, 25, '#94a0a1');
      p.rect(34, 0, 4, 25, c.ice);
      p.rect(43, 0, 4, 25, c.slate);
      p.poly([19, 23, 50, 18, 61, 23, 62, 29, 54, 33, 22, 35, 16, 31], c.ink);
      p.poly([20, 24, 49, 20, 57, 23, 52, 27, 24, 30, 19, 29], c.ochre);
      p.path([22, 25, 47, 22, 52, 22], c.wheat);
      p.poly([8, 31, 54, 24, 72, 32, 72, 39, 18, 48, 4, 40, 4, 35], c.ink);
      p.poly([8, 34, 53, 28, 66, 32, 17, 40, 7, 37], c.copper);
      p.poly([17, 40, 68, 33, 68, 37, 18, 45], c.brick);
      p.path([10, 35, 51, 29, 57, 29], c.sand);
      p.path([8, 40, 18, 46, 69, 38], c.berry, 2);
      for (const [u, v] of [
        [16, 35],
        [51, 30],
      ])
        rivet(p, u, v);
    });
  }
  function linkPress(p, dieBottom, effort) {
    const x = 150,
      y = dieBottom - 30,
      sx = 232,
      sy = 45;
    const dx = x - sx,
      dy = y - sy,
      distance = Math.hypot(dx, dy);
    const u = 52,
      v = 57,
      along = (u * u - v * v + distance * distance) / (2 * distance);
    const above = Math.sqrt(Math.max(0, u * u - along * along));
    const ex = rounded(sx + (dx / distance) * along - (dy / distance) * above);
    const ey = rounded(sy + (dy / distance) * along + (dx / distance) * above - effort);
    rod(p, sx + 1, sy + 3, ex + 1, ey + 3, 6, c.brick, c.rust);
    rod(p, sx, sy, ex, ey, 5, c.copper, c.gold);
    rod(p, ex, ey, x, y, 4, c.navy, c.ice);
    const midX = (ex + x) / 2,
      midY = (ey + y) / 2;
    rod(p, ex, ey, midX, midY, 5, c.rust, c.sand);
    p.image(stampHead(), x - 39, dieBottom - 47);
    pin(p, x, y, 5);
    pin(p, ex, ey, 6);
    pin(p, sx, sy, 8);
  }
  function inkingRibbon(p, bottom, time) {
    const low = 104 + rounded((bottom - 80) * 0.47);
    for (const [x, y] of [
      [40, 91],
      [216, 79],
    ]) {
      p.rect(x - 5, y + 4, 10, 20, c.ink);
      p.rect(x - 3, y + 7, 5, 15, c.slate);
      wheel(p, x, y, 9, time, c.rust);
    }
    // The same ribbon passes over both guide eyes and under the descending die.
    const run = [41, 93, 73, 86, 119, low + 4, 172, low - 3, 192, 84, 214, 79];
    p.path(run, c.ink, 4);
    p.path(run, c.plum, 2);
    p.path([73, 86, 119, low + 4, 172, low - 3], c.lilac);
    for (const [x, y] of [
      [73, 86],
      [192, 84],
    ]) {
      p.oval(x, y, 3, 3, c.ink);
      p.oval(x, y, 2, 2, c.steel);
      p.rect(x, y - 1, 1, 1, c.ice);
    }
  }
  function lampLens(p, x, y, r, lit) {
    p.oval(x + 1, y + 2, r + 4, r + 4, c.ink);
    p.oval(x, y, r + 2, r + 2, c.rust);
    p.oval(x, y, r, r, c.ink);
    p.oval(x, y, r - 2, r - 2, lit ? c.ochre : c.slate);
    p.oval(x - 1, y - 1, r - 4, r - 4, lit ? c.gold : c.green);
    p.oval(x - 2, y - 2, Math.max(1, r - 6), Math.max(1, r - 6), lit ? c.white : c.teal);
    p.line(x - r + 4, y - 3, x - 2, y - r + 4, lit ? c.white : c.steel, 2);
    if (lit) {
      p.rect(x - 1, y - 5, 2, 10, c.white);
      p.rect(x - 4, y - 2, 7, 2, c.cream);
    }
  }
  function pressShot(p, t, jam) {
    const impact = jam ? 3.78 : 3.84,
      delta = t - impact;
    let at, down;
    if (jam) {
      at = lerp(100, 150, ease(2.7, 3.57, t));
      down = lerp(94, 80, ease(2.76, 3.46, t)) + 61 * ease(3.54, impact, t);
    } else {
      at = lerp(27, 150, ease(2.52, 3.58, t)) + 104 * ease(4.24, 5.5, t);
      down = lerp(98, 77, ease(2.56, 3.48, t)) + 64 * ease(3.54, impact, t) - 52 * ease(3.98, 4.31, t);
    }
    const strain = jam && t > 4.08 ? Math.sin((t - 4.08) * 11) * 1.7 : 0;
    const gearTime = jam ? Math.min(t, 3.84) * 5 + strain * 0.06 : t * 4.6;
    p.image(cancellingBench(), 0, 0);
    for (let i = 0; i < 16; i++) {
      const x = ((i * 22 + Math.floor(gearTime * 4)) % 352) - 16,
        y = 126 - x * 0.093;
      p.line(x, y, x + 20, y + 25, '#677578', 2);
    }
    wheel(p, 45, 176, 11, gearTime, c.steel);
    wheel(p, 286, 151, 12, gearTime, c.copper);
    packet(
      p,
      at,
      t >= impact,
      jam ? 8 * ease(impact, 4.18, t) : Math.max(0, 5 * (1 - delta * 7)) * (delta >= 0),
    );
    inkingRibbon(p, down, gearTime * 0.7);
    linkPress(p, down, strain);
    const lit = jam && t >= 4.16;
    lampLens(p, 277, 31, 13, lit);
    if (lit) {
      p.line(256, 11, 252, 8, c.sand);
      p.line(293, 38, 299, 40, c.ochre, 2);
      p.rect(268, 51, 9, 1, c.copper);
    }
    if (delta >= 0 && delta < 0.24) {
      const split = ease(0, 0.23, delta);
      for (const [x, dir] of [
        [112, -1],
        [176, 1],
      ]) {
        p.line(x + dir * split * 3, 138 - split, x + dir * (4 + split * 5), 136 - split * 4, c.sand);
        if (delta < 0.15) p.rect(x + dir * (7 + split * 4), 132 - split * 3, 2, 1, c.cream);
      }
    }
    if (jam && t > 4.25) {
      const u = (t - 4.25) % 1.12;
      if (u < 0.72) steam(p, 188 - u * 21, 61 - u * 14, 12 + u * 25, 5 + u * 7, c.steel, c.smoke);
    }
  }
  function inspectionPlate() {
    return bank('boiler', 320, 180, (p) => {
      p.rect(0, 0, 320, 180, c.night);
      p.poly([0, 0, 189, 0, 125, 106, 0, 126], c.navy);
      for (const x of [-31, 34, 105]) {
        p.line(x, 0, x + 46, 41, c.slate, 3);
        p.line(x + 46, 41, x + 72, 0, c.ink, 3);
      }
      p.poly(
        [
          83, 180, 101, 153, 119, 150, 133, 96, 145, 80, 143, 41, 157, 23, 202, 21, 215, 7, 298, 7, 320, 19,
          320, 180,
        ],
        c.ink,
      );
      p.poly(
        [
          127, 151, 140, 101, 152, 87, 151, 42, 161, 29, 228, 24, 269, 12, 308, 15, 320, 26, 320, 177, 163,
          180,
        ],
        c.rust,
      );
      p.poly([145, 97, 159, 53, 177, 35, 227, 29, 241, 31, 224, 46, 174, 73, 165, 98], c.copper);
      p.poly([291, 25, 320, 34, 320, 117, 299, 147, 280, 157, 273, 138, 290, 102], c.brick);
      p.path([152, 126, 164, 144, 190, 149, 246, 145, 294, 123, 315, 103], c.ink, 7);
      p.path([152, 124, 166, 140, 190, 145, 245, 140, 294, 120, 315, 101], c.ochre, 3);
      for (const [x, y] of [
        [167, 40],
        [153, 79],
        [292, 35],
        [307, 60],
        [311, 102],
        [166, 132],
        [273, 137],
      ])
        rivet(p, x, y);
      p.oval(231, 90, 53, 51, c.ink);
      p.oval(231, 89, 51, 48, c.copper);
      p.oval(231, 90, 45, 43, c.brick);
      p.oval(231, 90, 42, 40, c.night);
      p.oval(233, 91, 37, 35, '#425466');
      p.poly([207, 71, 214, 62, 245, 56, 258, 64, 249, 66, 225, 77, 210, 94], '#596b78');
      p.path([210, 118, 221, 124, 242, 126, 258, 114], c.slate, 2);
      for (const [dx, dy] of [
        [0, -45],
        [-35, -30],
        [-47, 1],
        [-32, 32],
        [5, 44],
        [37, 28],
        [47, -3],
        [32, -32],
      ]) {
        p.oval(231 + dx, 89 + dy, 3, 3, c.brick);
        p.rect(230 + dx, 87 + dy, 3, 1, c.wheat);
      }
      p.poly([115, 181, 129, 158, 159, 144, 174, 146, 157, 164, 146, 180], c.slate, c.ink);
      p.path([132, 176, 139, 160, 158, 151], c.steel, 2);
      for (const x of [286, 295, 304]) p.path([x, 155, x + 8, 151, x + 4, 171, x - 4, 174], c.ink, 2);
    });
  }
  function houndFace() {
    return bank('hound-mask', 153, 130, (p) => {
      // The short steel muzzle, copper drop ear and exhaust stack follow the playable Copper Hound.
      p.poly([12, 55, 23, 26, 25, 8, 35, 3, 45, 4, 49, 10, 47, 31, 41, 51, 35, 68], c.ink);
      p.poly([22, 46, 27, 28, 28, 12, 36, 7, 44, 9, 42, 24, 37, 45], c.slate);
      p.path([29, 27, 32, 14, 40, 11], c.ice, 2);
      p.poly([19, 14, 23, 6, 35, 1, 46, 3, 51, 8, 49, 13, 33, 13, 23, 18], c.rust, c.ink);
      p.path([24, 7, 36, 3, 44, 5], c.gold, 2);
      p.poly(
        [
          8, 48, 17, 33, 34, 24, 51, 20, 72, 19, 90, 22, 107, 31, 116, 43, 120, 60, 126, 71, 119, 89, 100,
          102, 73, 108, 49, 106, 33, 96, 19, 87, 9, 73,
        ],
        c.copper,
        c.ink,
      );
      p.poly(
        [19, 46, 32, 31, 51, 25, 70, 23, 86, 26, 98, 31, 76, 29, 56, 33, 42, 44, 35, 63, 24, 65],
        c.ochre,
      );
      p.path([27, 41, 37, 32, 52, 28, 67, 26], c.wheat, 2);
      p.poly(
        [18, 74, 37, 76, 54, 68, 73, 62, 95, 64, 113, 73, 117, 84, 101, 96, 72, 101, 52, 101, 30, 91],
        c.rust,
      );
      p.path([40, 90, 62, 96, 84, 95, 104, 86], c.brick, 2);
      p.path([46, 94, 66, 98, 80, 97], c.ochre);
      p.path([49, 32, 55, 28, 69, 25, 84, 26], c.gold);
      p.path([42, 73, 51, 78, 62, 79, 68, 78], c.copper, 2);
      p.path([50, 81, 59, 83, 67, 82], c.brick);
      p.poly([73, 53, 80, 43, 94, 41, 104, 47, 110, 55, 106, 61, 94, 59, 82, 65, 74, 62], c.ink);
      p.poly([80, 54, 86, 47, 94, 45, 102, 49, 105, 54, 97, 52, 87, 57], c.gold);
      p.path([73, 48, 82, 40, 94, 38, 101, 41], c.brick, 2);
      p.poly(
        [90, 69, 105, 61, 127, 61, 139, 66, 147, 77, 146, 87, 137, 96, 125, 100, 105, 100, 91, 94, 85, 82],
        c.brick,
        c.ink,
      );
      p.poly([91, 75, 102, 66, 125, 64, 137, 69, 140, 74, 124, 72, 108, 73, 98, 79], c.sand);
      p.poly([101, 83, 115, 76, 133, 77, 141, 83, 138, 89, 122, 94, 108, 92], c.ochre);
      p.poly([134, 72, 142, 68, 149, 70, 152, 76, 148, 83, 137, 85, 132, 80], c.ink);
      p.path([137, 74, 143, 71, 148, 73], c.steel, 2);
      p.path([95, 90, 104, 96, 125, 98, 138, 94], c.ink, 2);
      p.rect(112, 96, 3, 3, c.sand);
      p.rect(128, 95, 3, 2, c.wheat);
      for (const [x, y] of [
        [77, 31],
        [107, 54],
        [98, 81],
        [116, 85],
        [124, 82],
        [122, 88],
        [38, 77],
      ])
        rivet(p, x, y);
      p.poly(
        [27, 92, 42, 101, 64, 107, 94, 105, 102, 108, 99, 116, 82, 122, 54, 122, 36, 117, 24, 106],
        c.ink,
      );
      p.path([27, 101, 42, 111, 61, 115, 82, 115, 96, 110], c.gold, 3);
      p.poly(
        [
          9, 49, 18, 37, 34, 31, 47, 35, 50, 45, 45, 61, 37, 69, 34, 84, 29, 94, 19, 98, 12, 94, 10, 80, 5,
          68,
        ],
        c.brick,
        c.ink,
      );
      p.poly(
        [11, 52, 19, 41, 34, 35, 43, 37, 43, 42, 34, 51, 25, 72, 21, 88, 16, 92, 13, 82, 10, 65],
        c.copper,
      );
      p.path([13, 53, 20, 43, 32, 39], c.gold, 2);
      p.path([27, 87, 31, 70, 39, 57], c.rust, 2);
      pin(p, 36, 42, 4);
    });
  }
  function clapper(p, angle) {
    const ox = 230,
      oy = 60,
      s = Math.sin(angle),
      co = Math.cos(angle);
    const transform = (shape) =>
      shape.flatMap(([x, y]) => [rounded(ox + x * co + y * s), rounded(oy - x * s + y * co)]);
    const outline = [
      [-3, 0],
      [3, 0],
      [5, 4],
      [4, 10],
      [2, 13],
      [3, 28],
      [5, 33],
      [9, 36],
      [11, 41],
      [10, 47],
      [5, 51],
      [-1, 52],
      [-8, 49],
      [-10, 45],
      [-9, 39],
      [-6, 35],
      [-2, 31],
      [-2, 13],
      [-5, 8],
      [-5, 3],
    ];
    p.poly(transform(outline), c.ochre, c.ink);
    p.poly(
      transform([
        [-3, 4],
        [0, 2],
        [3, 4],
        [2, 8],
        [-1, 10],
        [-3, 8],
      ]),
      c.gold,
    );
    p.poly(
      transform([
        [-7, 39],
        [-2, 35],
        [4, 36],
        [6, 39],
        [1, 41],
        [-2, 47],
        [-6, 47],
        [-8, 44],
      ]),
      c.gold,
    );
    p.path(
      transform([
        [-6, 42],
        [-4, 39],
        [0, 37],
      ]),
      c.white,
      2,
    );
    p.path(
      transform([
        [4, 48],
        [8, 44],
        [7, 40],
      ]),
      c.rust,
      2,
    );
    p.rect(ox - 10, oy - 6, 21, 4, c.ink);
    p.rect(ox - 9, oy - 5, 18, 2, c.steel);
    pin(p, ox, oy, 3);
  }
  function listening(p, t) {
    p.image(inspectionPlate(), 0, 0);
    const since = t - 6.12;
    const angle =
      since < 0
        ? lerp(-0.32, 0.74, ease(5.73, 6.12, t))
        : 0.74 * Math.cos(since * 13) * Math.exp(-since * 1.8);
    clapper(p, angle);
    const wiggle = since >= 0 ? Math.sin(since * 47) * Math.exp(-since * 11) * 2 : 0;
    p.path([266, 80, 263, 86, 262 + wiggle, 97, 262 + wiggle, 112], c.ink, 3);
    p.path([265, 83, 263 + wiggle, 95, 263 + wiggle, 108], c.sand);
    p.path([199, 76, 205, 64, 216, 58], c.ice, 2);
    p.path([252, 119, 260, 111, 264, 103], c.steel);
    const nod = rounded(ease(6.46, 7.48, t) * 4);
    p.image(houndFace(), 4 + nod, 28 + rounded(nod * 0.5), 165, 141, true);
    // A hot eye slit narrows as the mechanism notices the listeners.
    p.rect(68 + nod, 79 + rounded(nod * 0.5), 6, 2, c.white);
    if (t > 7.12) p.line(62 + nod, 78 + rounded(nod * 0.5), 72 + nod, 79 + rounded(nod * 0.5), c.ink, 2);
    if (since > 0 && since < 0.21) {
      p.rect(262, 100, 2, 3, c.cream);
      p.rect(266, 98, 3, 1, c.wheat);
    }
    p.poly([0, 159, 16, 154, 36, 162, 43, 180, 0, 180], c.ink);
  }
  function lampHousing() {
    return bank('lamp-shoulder', 320, 180, (p) => {
      p.rect(0, 0, 320, 180, c.navy);
      arch(p, -18, 9, 95, 107, c.night, '#5e7781');
      arch(p, 83, 7, 62, 94, c.night, '#597681');
      p.poly([0, 85, 53, 33, 69, 29, 32, 89], '#8d9890');
      p.path([3, 64, 69, 64], c.navy, 3);
      p.path([99, 47, 141, 47], c.navy, 2);
      p.rect(25, 12, 3, 94, c.navy);
      p.rect(111, 13, 3, 85, c.navy);
      p.path([0, 128, 128, 99, 223, 103, 320, 131], c.night, 5);
      p.poly(
        [
          169, 180, 174, 110, 188, 87, 197, 43, 215, 26, 236, 17, 260, 18, 272, 11, 306, 11, 320, 19, 320,
          180,
        ],
        c.ink,
      );
      p.poly(
        [
          174, 179, 180, 108, 195, 87, 203, 47, 218, 31, 240, 22, 262, 22, 274, 17, 306, 17, 320, 24, 320,
          180,
        ],
        c.brick,
      );
      p.poly([193, 93, 203, 48, 219, 33, 238, 27, 267, 26, 279, 34, 265, 49, 237, 58, 220, 80], c.copper);
      p.poly([206, 51, 221, 37, 241, 31, 259, 32, 250, 39, 232, 41, 218, 53], c.ochre);
      p.poly([277, 57, 292, 42, 317, 41, 320, 57, 320, 117, 281, 131, 263, 114], c.rust);
      p.path([186, 112, 218, 118, 261, 102, 273, 94], c.ink, 5);
      p.path([188, 110, 218, 115, 260, 101, 271, 93], c.copper, 2);
      p.poly([222, 122, 263, 109, 284, 115, 280, 152, 246, 169, 218, 156], c.night, c.ink);
      for (let i = 0; i < 3; i++) p.path([229, 128 + i * 8, 260, 118 + i * 8, 273, 121 + i * 8], c.slate, 2);
      p.poly([284, 13, 284, 0, 300, 0, 299, 12, 305, 17, 304, 22, 280, 24, 277, 19], c.ink);
      p.poly([287, 0, 296, 0, 295, 14, 300, 17, 282, 20, 286, 14], c.steel);
      for (const [x, y] of [
        [202, 71],
        [220, 43],
        [290, 35],
        [307, 84],
        [206, 106],
        [269, 143],
      ])
        rivet(p, x, y);
      p.path([155, 137, 175, 125, 198, 129, 205, 149, 205, 180], c.ink, 7);
      p.path([157, 136, 176, 126, 196, 130, 202, 149, 202, 177], c.steel, 2);
    });
  }
  function noodleHead() {
    return bank('noodle-head', 173, 118, (p) => {
      p.poly(
        [
          15, 73, 18, 50, 28, 33, 43, 21, 62, 16, 78, 14, 91, 18, 102, 24, 112, 33, 118, 43, 121, 54, 131, 61,
          148, 63, 160, 60, 168, 63, 169, 73, 161, 83, 148, 89, 119, 90, 106, 96, 95, 105, 75, 110, 50, 109,
          29, 98,
        ],
        '#a96942',
        c.ink,
      );
      p.poly(
        [
          23, 64, 29, 43, 44, 28, 62, 21, 78, 20, 89, 22, 99, 28, 108, 38, 113, 49, 103, 51, 92, 47, 79, 51,
          66, 71, 57, 81, 40, 88, 28, 82,
        ],
        '#c58a51',
      );
      p.poly([45, 32, 60, 24, 75, 22, 83, 24, 73, 28, 56, 31, 43, 42], c.sand);
      p.path([57, 25, 62, 21, 70, 22, 75, 19], '#a96e47');
      p.path([68, 27, 75, 25, 81, 27], '#e4ac69');
      p.path([41, 70, 51, 69, 58, 66, 62, 67], '#ac7349');
      p.path([58, 85, 68, 85, 75, 83], '#e5ab67');
      p.poly(
        [
          94, 49, 102, 41, 109, 40, 116, 46, 120, 58, 126, 64, 135, 65, 143, 65, 151, 62, 162, 62, 166, 66,
          164, 75, 154, 80, 128, 81, 113, 87, 100, 94, 79, 97, 60, 90, 51, 79, 69, 79, 79, 69, 86, 55,
        ],
        '#e0a85e',
      );
      p.poly(
        [105, 71, 117, 65, 131, 67, 151, 66, 162, 67, 163, 73, 153, 77, 135, 77, 118, 80, 105, 84, 97, 83],
        c.gold,
      );
      p.path([108, 72, 118, 68, 130, 69], c.wheat, 2);
      p.path([106, 87, 122, 80, 145, 78, 156, 77], '#82553e', 2);
      p.poly([155, 61, 164, 58, 170, 60, 172, 66, 168, 71, 160, 72, 155, 68], c.ink);
      p.path([158, 63, 164, 61, 168, 62], c.steel, 2);
      // The foreshortened brow and long folded ear are distinctive to this dachshund.
      p.poly([97, 43, 104, 37, 110, 38, 114, 43, 108, 42, 103, 46], c.brick);
      for (const [x, y] of [
        [139, 72],
        [145, 73],
        [142, 76],
      ])
        p.rect(x, y, 2, 1, '#9e7149');
      p.poly(
        [
          12, 49, 19, 35, 33, 25, 43, 26, 51, 32, 50, 43, 40, 60, 36, 83, 28, 100, 20, 107, 9, 103, 3, 94, 4,
          79, 8, 66,
        ],
        '#88563c',
        c.ink,
      );
      p.poly(
        [14, 48, 23, 36, 34, 29, 43, 29, 45, 34, 37, 42, 30, 57, 27, 78, 19, 93, 12, 99, 8, 92, 9, 76],
        '#b67a47',
      );
      p.path([13, 53, 21, 40, 31, 34], c.ochre, 2);
      p.path([22, 98, 29, 83, 33, 61, 41, 45], '#754e3e', 2);
      p.path([11, 75, 14, 68, 16, 56, 22, 46], '#c48b54');
      p.path([17, 91, 21, 82, 23, 74], '#915b3f');
      p.path([28, 43, 33, 40, 39, 39], '#d59655');
    });
  }
  function noodleTorso() {
    return bank('noodle-coat', 142, 84, (p) => {
      p.poly(
        [-2, 85, 0, 48, 13, 33, 30, 27, 42, 16, 51, 8, 70, 5, 88, 8, 102, 22, 111, 33, 127, 51, 134, 83],
        '#a66944',
        c.ink,
      );
      p.poly([15, 79, 21, 42, 37, 31, 50, 28, 56, 43, 52, 64, 41, 78], '#c68b50');
      p.poly([54, 78, 59, 49, 69, 35, 89, 29, 98, 35, 106, 56, 111, 80], '#d9a45e');
      p.poly(
        [12, 46, 22, 33, 42, 26, 58, 13, 72, 8, 88, 10, 94, 17, 80, 26, 53, 37, 47, 50, 31, 52],
        c.green,
        c.ink,
      );
      p.poly([18, 42, 27, 34, 46, 29, 64, 15, 78, 11, 87, 13, 74, 18, 56, 31, 36, 40], c.teal);
      p.path([24, 38, 44, 31, 65, 18], c.aqua, 2);
      p.poly([42, 39, 51, 36, 55, 45, 49, 62, 40, 59, 36, 47], c.green, c.ink);
      p.path([44, 46, 45, 55, 48, 54], c.aqua, 2);
      p.poly([60, 37, 64, 32, 68, 34, 69, 38, 66, 42], c.gold, c.ink);
      p.poly([62, 41, 69, 37, 75, 40, 77, 48, 71, 54, 63, 52, 59, 47], c.ochre, c.ink);
      p.path([62, 45, 64, 42, 68, 41], c.wheat, 2);
    });
  }
  function instruction(p, t) {
    p.image(lampHousing(), 0, 0);
    lampLens(p, 251, 71, 20, false);
    const lift = ease(0.29, 1.1, t),
      settle = ease(1.34, 2.63, t);
    // The muzzle and leading paw share their sight line with the receiver glass.
    const x = -2 + rounded(3 * lift),
      y = 12 - rounded(3 * lift) + rounded(settle);
    p.image(noodleTorso(), -3, 105, 142, 84);
    const mouth = t > 0.3 && t < 2.46 ? Math.max(0, rounded(4 * Math.sin(t * 14))) : 0;
    p.image(noodleHead(), x, y);
    p.poly(
      [
        x + 102,
        y + 86,
        x + 121,
        y + 81,
        x + 147,
        y + 79,
        x + 158,
        y + 77,
        x + 155,
        y + 80 + mouth,
        x + 146,
        y + 83 + mouth,
        x + 120,
        y + 88 + mouth,
        x + 110,
        y + 92 + mouth,
        x + 101,
        y + 91,
      ],
      '#80563f',
    );
    p.path([x + 103, y + 87, x + 122, y + 82, x + 147, y + 80, x + 155, y + 78], c.ink);
    if (mouth > 1) p.path([x + 125, y + 85 + mouth, x + 139, y + 82 + mouth, x + 146, y + 82], c.peach, 2);
    p.path(
      [x + 108, y + 93 + mouth, x + 124, y + 87 + mouth, x + 146, y + 83 + mouth, x + 155, y + 79 + mouth],
      '#d19b5b',
      2,
    );
    const ex = x + 96,
      ey = y + 54;
    if (t > 0.17 && t < 0.3) {
      p.path([ex - 9, ey + 1, ex - 1, ey - 1, ex + 5, ey], c.ink, 2);
    } else {
      p.oval(ex, ey, 7, 9, c.ink);
      p.oval(ex, ey + 1, 5, 6, c.cream);
      p.oval(ex + rounded(2 * lift), ey, 3, 5, c.ink);
      p.rect(ex + 1, ey - 4, 2, 2, c.white);
      p.path([ex - 8, ey - 12, ex - 4, ey - 15, ex + 2, ey - 15], '#754b38', 2);
    }
    const px = lerp(99, 179, lift) - settle * 2,
      py = lerp(153, 96, lift) + settle * 3;
    const elbowX = lerp(78, 125, lift),
      elbowY = lerp(156, 137, lift);
    // A continuous foreleg shape keeps the elbow soft while it unfolds.
    p.poly(
      [
        65,
        143,
        74,
        138,
        83,
        139,
        elbowX - 4,
        elbowY - 6,
        elbowX + 2,
        elbowY - 7,
        px - 15,
        py + 2,
        px - 6,
        py + 3,
        px - 4,
        py + 9,
        elbowX + 10,
        elbowY + 4,
        elbowX + 5,
        elbowY + 9,
        elbowX - 3,
        elbowY + 11,
        81,
        162,
        72,
        163,
        65,
        158,
        62,
        152,
      ],
      '#bb8150',
      c.ink,
    );
    p.poly(
      [
        66,
        151,
        73,
        154,
        elbowX,
        elbowY + 4,
        elbowX + 5,
        elbowY + 2,
        px - 12,
        py + 5,
        px - 7,
        py + 7,
        elbowX + 8,
        elbowY + 6,
        elbowX + 1,
        elbowY + 9,
        73,
        161,
        65,
        157,
      ],
      '#9d6944',
    );
    p.path([75, 141, 82, 142, elbowX - 2, elbowY - 4, elbowX + 4, elbowY - 5], '#dc9f60', 2);
    p.poly(
      [
        px - 13,
        py + 4,
        px - 9,
        py - 2,
        px - 1,
        py - 7,
        px + 9,
        py - 9,
        px + 17,
        py - 12,
        px + 19,
        py - 9,
        px + 16,
        py - 5,
        px + 7,
        py,
        px + 5,
        py + 5,
        px - 2,
        py + 10,
        px - 10,
        py + 12,
      ],
      '#d49b58',
      c.ink,
    );
    p.path([px - 5, py - 2, px + 4, py - 6, px + 13, py - 8], c.wheat, 2);
    p.path([px - 2, py + 4, px + 3, py + 1], '#8e603f');
    p.poly([0, 172, 14, 169, 31, 176, 42, 180, 0, 180], c.ink);
  }
  function faceOff(p, t) {
    const enter = ease(5.7, 7.12, t);
    p.image(warehouse(), -21, -11, 350, 197);
    p.poly([0, 152, 186, 118, 320, 116, 320, 124, 123, 151, 0, 177], '#816665');
    p.path([0, 161, 152, 134, 319, 116], c.ink, 4);
    p.path([0, 160, 153, 133, 319, 116], c.sand, 1);
    p.oval(242, 155, 52, 9, c.night);
    const stunned = t < 7.14;
    machine(p, 244, 155, 1.08, stunned ? 'stun' : 'idle', 0.6, t + 1);
    if (stunned) {
      const u = (t - 5.7) % 1.15;
      if (u < 0.71) steam(p, 251 - u * 18, 41 - u * 15, 13 + u * 18, 4 + u * 8, c.steel, c.smoke);
    }
    p.oval(73, 164, 28, 5, c.night);
    p.oval(117, 169, 29, 5, c.night);
    dog(p, 'pip', 59 + rounded(enter * 11), 163, 0.74, 1, t < 6.63 ? 'run' : 'idle', 0.35, t);
    dog(p, 'noodle', 102 + rounded(enter * 10), 169, 0.73, 1, t < 6.78 ? 'run' : 'idle', 0.5, t + 0.3);
    p.poly([0, 163, 18, 159, 43, 166, 51, 180, 0, 180], c.ink);
    p.poly([267, 180, 288, 164, 305, 162, 320, 165, 320, 180], c.ink);
    p.path([278, 177, 291, 166, 306, 165], c.slate, 2);
  }
  let jamCamera;
  function jamCloseup(p, t) {
    if (!jamCamera) {
      const canvas = bank('jam-camera', 320, 180, () => {});
      jamCamera = { canvas, pen: new PixelPen(canvas) };
    }
    pressShot(jamCamera.pen, t, true);
    // Push toward the coupling as it sticks. Scaling the finished cel preserves native ink edges.
    const advance = rounded(9 * ease(3.78, 4.92, t));
    p.image(
      jamCamera.canvas,
      -32 - advance,
      -8 - rounded(advance * 0.4),
      358 + advance,
      202 + rounded(advance * 0.56),
    );
  }
  window.DispatchFilms.boss = function (p, part, time) {
    const t = Math.max(0, Math.min(8, Number.isFinite(time) ? time : 0));
    if (part === 0) {
      if (t < 2.52) reveal(p, t);
      else if (t < 5.52) pressShot(p, t, false);
      else listening(p, t);
    } else {
      if (t < 2.74) instruction(p, t);
      else if (t < 5.7) jamCloseup(p, t);
      else faceOff(p, t);
    }
  };
})();
