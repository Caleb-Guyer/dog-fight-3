/* Special delivery. The bell, punched ticket and train share the same brass glint. */
(() => {
  'use strict';
  const { c, plate, ease, lerp, dog, cloudStrip, steam, city, lamp, paw } = window.DispatchFilmArt;
  const night = '#192638',
    blue = '#263c53',
    glass = '#426378',
    iron = '#384455';
  const verdigris = '#608183',
    brass = '#d69859',
    straw = '#ffe0a0';

  // A station wall, floor or rooftop has a fixed place in the shot. Cache only the
  // native-size cells that a screen actually reveals, independent of its CSS size.
  function surround(p, view, key, paint) {
    if (!view) return;
    const firstX = Math.floor(view.left / 320), lastX = Math.ceil(view.right / 320);
    const firstY = Math.floor(view.top / 180), lastY = Math.ceil(view.bottom / 180);
    for (let row = firstY; row < lastY; row++) {
      for (let col = firstX; col < lastX; col++) {
        if (!row && !col) continue;
        const left = 320 * col, top = 180 * row;
        const cell = { left, top, right: left + 320, bottom: top + 180 };
        if (Math.abs(col) <= 2 && Math.abs(row) <= 3) {
          const tile = plate('ending-surround-' + key + '-' + col + '-' + row, 320, 180, (q) => {
            q.g.translate(-left, -top);
            paint(q, cell);
          });
          p.image(tile, left, top);
        } else {
          p.g.save();
          p.g.beginPath();
          p.g.rect(left, top, 320, 180);
          p.g.clip();
          paint(p, cell);
          p.g.restore();
        }
      }
    }
  }
  function band(p, cell, top, bottom, color) {
    const from = Math.max(top, cell.top), to = Math.min(bottom, cell.bottom);
    if (to > from) p.rect(cell.left, from, 320, to - from, color);
  }
  function salt(x, y) {
    const n = Math.imul(x + 31827, 198491317) ^ Math.imul(y - 3961, 6542989);
    return (Math.imul(n ^ (n >>> 14), 122949829) >>> 0);
  }
  function scatter(cell, pitchX, pitchY, callback) {
    for (let row = Math.floor(cell.top / pitchY) - 1; row <= Math.floor(cell.bottom / pitchY); row++) {
      for (let col = Math.floor(cell.left / pitchX) - 1; col <= Math.floor(cell.right / pitchX); col++) {
        const n = salt(col, row);
        callback(col * pitchX + n % pitchX, row * pitchY + (n >>> 9) % pitchY, n);
      }
    }
  }
  // Sides are specified at y=0 and y=180 to preserve the painted vanishing lines.
  function shaft(p, cell, a, b, endA, endB, color, limitTop = cell.top, limitBottom = cell.bottom) {
    const top = Math.max(cell.top, limitTop), bottom = Math.min(cell.bottom, limitBottom);
    if (top >= bottom) return;
    const l = (y) => a + (endA - a) * y / 180;
    const r = (y) => b + (endB - b) * y / 180;
    if (r((top + bottom) / 2) < l((top + bottom) / 2)) return;
    p.poly([l(top), top, r(top), top, r(bottom), bottom, l(bottom), bottom], color);
  }
  function wheel(p, x, y, r) {
    p.oval(x, y, r + 2, r + 2, night);
    p.oval(x, y, r, r, '#768487');
    p.oval(x, y, r - 2, r - 2, '#344755');
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      p.line(x, y, x + (r - 3) * Math.cos(a), y + (r - 3) * Math.sin(a), '#7c817a', 2);
    }
    p.oval(x, y, Math.max(2, Math.floor(r / 4)), Math.max(2, Math.floor(r / 4)), c.brick);
    p.rect(x - 1, y - 1, 2, 2, brass);
  }
  function trunk(p, x, y, w, h, skin, edge) {
    p.poly([x, y, x + 6, y - 4, x + w - 5, y - 4, x + w, y, x + w, y + h - 3,
      x + w - 4, y + h, x + 3, y + h, x, y + h - 3], night);
    p.rect(x + 2, y, w - 4, h - 2, skin);
    p.rect(x + 5, y - 2, w - 10, 2, edge);
    p.rect(x + 2, y + 5, w - 4, 2, night);
    for (const n of [8, w - 13]) {
      p.rect(x + n, y - 2, 4, h + 2, edge);
      p.rect(x + n, y + 5, 5, 4, c.brick);
      p.rect(x + n + 1, y + 5, 3, 1, brass);
    }
    p.path([x + w / 2 - 5, y - 4, x + w / 2 - 5, y - 7, x + w / 2 + 5, y - 7,
      x + w / 2 + 5, y - 4], night, 2);
  }
  function trolley(p, x, y, w) {
    for (const dx of [11, w - 12]) wheel(p, x + dx, y, 5);
    p.rect(x - 2, y - 8, w + 4, 4, night);
    p.rect(x, y - 8, w, 1, verdigris);
    p.path([x + w - 2, y - 9, x + w - 1, y - 27, x + w + 3, y - 29, x + w + 8, y - 29], iron, 3);
    trunk(p, x + 2, y - 29, w - 8, 19, '#66575a', '#9d7863');
  }

  function skyline(p, moonX, moonY) {
    const bands = [
      [0, '#29384f'],
      [22, '#34475c'],
      [40, '#435d70'],
      [60, '#567687'],
      [76, '#718b92'],
      [91, '#93a6a1'],
      [106, '#b5b7a2'],
    ];
    for (const [y, color] of bands) {
      p.rect(0, y, 320, 125 - y, color);
      if (y) for (let x = y % 3; x < 320; x += 4) p.rect(x, y - 1, 1, 1, color);
    }
    p.oval(moonX, moonY, 23, 23, '#b4c6bc');
    p.oval(moonX - 1, moonY - 1, 22, 22, '#e9dbb7');
    p.path([moonX - 15, moonY - 9, moonX - 12, moonY - 14, moonX - 7, moonY - 16], '#fbebc7', 2);
    p.path([moonX + 7, moonY + 13, moonX + 10, moonY + 13, moonX + 13, moonY + 9], '#d2cdb6');
    for (const [x, y] of [
      [22, 22],
      [44, 36],
      [83, 27],
      [101, 8],
      [123, 18],
      [148, 38],
      [198, 19],
      [257, 34],
      [277, 13],
      [305, 23],
    ]) {
      p.rect(x, y, 1, 1, c.ice);
    }
    cloudStrip(p, -8, 49, 83, '#526b7b', '#91a29d');
    cloudStrip(p, moonX - 30, moonY + 10, 71, '#7f9298', '#c0b9a7');
    cloudStrip(p, 231, 58, 91, '#667d89', '#9caaa2');
    city(p, 113, '#536c79', '#73848a', '#bdab89');
  }
  function steelBeam(p, x, top, bottom) {
    p.rect(x, top, 9, bottom - top, night);
    p.rect(x + 1, top, 2, bottom - top, glass);
    p.rect(x + 6, top, 1, bottom - top, iron);
    for (let y = top + 5; y < bottom; y += 14) p.rect(x + 3, y, 2, 1, c.steel);
  }
  function floor(p, y) {
    p.rect(0, y, 320, 180 - y, '#75665e');
    p.rect(0, y, 320, 2, '#dbb488');
    for (let i = -4; i <= 7; i++) p.line(146 + i * 19, y, 146 + i * 83, 179, '#4d4b50');
    for (const row of [y + 4, y + 14, y + 32]) p.rect(0, row, 320, 1, '#a18a74');
    for (let i = 0; i < 39; i++) {
      const x = (23 + i * 59) % 320,
        sy = y + 3 + ((i * 29) % (177 - y));
      p.rect(x, sy, 2 + (i % 8), 1, i % 3 ? '#897970' : '#c1a282');
    }
  }
  function brassBall(p, x, y, radius, turn) {
    p.oval(x, y, radius + 1, radius + 1, c.ink);
    p.oval(x, y, radius, radius, c.rust);
    p.oval(x - 1, y - 2, radius - 2, radius - 2, brass);
    p.oval(x - 2, y - 3, Math.max(2, radius - 4), Math.max(2, radius - 4), c.gold);
    p.rect(x - radius / 2, y - radius / 2 - 1, Math.max(2, radius / 2), 2, c.white);
    p.rect(x + Math.cos(turn) * radius * 0.68, y + Math.sin(turn) * radius * 0.68, 2, 2, c.brick);
  }
  function shell() {
    return plate('film-bell-shell', 104, 92, (p) => {
      p.poly([43, 10, 44, 4, 49, 1, 56, 2, 60, 6, 59, 13, 54, 16, 47, 14], brass, c.ink);
      p.oval(51, 7, 4, 3, night);
      p.poly(
        [
          7, 69, 14, 64, 23, 50, 28, 30, 33, 21, 40, 16, 47, 14, 57, 14, 67, 18, 73, 25, 77, 33, 80, 53, 86,
          63, 96, 69, 101, 74, 100, 80, 91, 85, 72, 89, 48, 91, 25, 89, 8, 84, 2, 79, 3, 74,
        ],
        c.ink,
      );
      p.poly(
        [
          7, 72, 16, 65, 25, 51, 30, 31, 35, 23, 44, 18, 56, 16, 65, 20, 72, 27, 76, 37, 78, 51, 83, 64, 95,
          71, 99, 77, 90, 82, 69, 86, 39, 86, 18, 82, 6, 78,
        ],
        c.rust,
      );
      p.poly(
        [
          9, 72, 18, 64, 25, 51, 31, 32, 36, 25, 44, 20, 51, 18, 59, 18, 65, 22, 60, 29, 56, 41, 55, 57, 61,
          67, 69, 73, 75, 79, 48, 81, 17, 76,
        ],
        brass,
      );
      p.poly([21, 64, 28, 48, 33, 32, 38, 26, 45, 22, 43, 29, 39, 36, 35, 54, 31, 62], c.cream);
      p.poly([34, 62, 42, 48, 41, 43, 48, 27, 52, 23, 55, 22, 50, 34, 47, 55, 51, 63], c.gold);
      p.poly([62, 22, 70, 28, 74, 39, 75, 54, 80, 65, 89, 71, 79, 72, 69, 61, 66, 47], '#925444');
      p.path([32, 33, 43, 37, 60, 38, 73, 33], c.rust, 2);
      p.path([33, 31, 45, 35, 60, 36, 72, 32], c.wheat);
      p.path([20, 62, 34, 68, 53, 69, 70, 67, 80, 63], c.ochre, 2);
      p.path([19, 61, 35, 66, 54, 67, 70, 65], c.wheat);
      p.oval(51, 78, 47, 11, c.ochre);
      p.oval(51, 80, 43, 8, c.brick);
      p.oval(51, 81, 39, 6, c.ink);
      p.path([8, 75, 18, 79, 39, 82, 60, 82, 81, 79, 92, 75], c.wheat, 2);
      p.path([23, 86, 42, 89, 58, 89, 76, 86], c.ochre);
      p.poly([50, 45, 54, 49, 50, 55, 46, 50], c.rust);
      p.path([48, 49, 50, 46, 52, 48], c.wheat);
    });
  }
  function flagstones(p, v, y) {
    if (v.bottom <= y) return;
    band(p, v, y, v.bottom, '#75665e');
    band(p, v, y, y + 2, '#dbb488');
    const start = Math.max(y, v.top), end = v.bottom - 1;
    const gap = (dy) => 19 + (dy - y) * 64 / (179 - y);
    const near = gap(start), far = gap(end);
    const limits = [(v.left - 146) / near, (v.left - 146) / far,
      (v.right - 146) / near, (v.right - 146) / far];
    for (let i = Math.floor(Math.min(...limits)); i <= Math.ceil(Math.max(...limits)); i++) {
      p.line(146 + i * near, start, 146 + i * far, end, '#4d4b50');
    }
    for (const n of [4, 14, 32, 77, 139, 231, 362, 552]) band(p, v, y + n, y + n + 1, '#a18a74');
    scatter(v, 30, 19, (x, py, n) => {
      if (py > y + 3) p.rect(x, py, 2 + n % 7, 1, n % 3 ? '#897970' : '#baa083');
    });
  }
  function sortingHall(p, v) {
    band(p, v, v.top, v.bottom, blue);
    if (v.top < 112) {
      for (let k = Math.floor((v.left + 20) / 62) - 1; -20 + k * 62 < v.right; k++) {
        const x = -20 + k * 62;
        p.rect(x, 1, 45, 82, glass);
        p.poly([x + 2, 5, x + 40, 5, x + 37, 47, x + 2, 67], '#7b827e');
        p.poly([x + 5, 8, x + 24, 8, x + 5, 47], '#c6a57d');
        p.rect(x + 22, 2, 3, 81, iron);
        p.rect(x, 31, 44, 4, iron);
        p.rect(x, 63, 44, 2, iron);
        p.rect(x, -94, 45, 93, glass);
        p.poly([x + 2, -89, x + 41, -89, x + 33, -49, x + 2, -20], '#737f81');
        p.poly([x + 4, -86, x + 27, -86, x + 4, -55], '#a19886');
        p.rect(x + 22, -94, 3, 93, iron);
        p.rect(x, -56, 45, 3, blue);
        p.rect(x, -9, 45, 2, iron);
      }
      band(p, v, 83, 114, '#4b5055');
      band(p, v, 86, 89, '#6f6762');
      for (let x = Math.floor(v.left / 24) * 24; x < v.right; x += 24) p.rect(x, 92, 2, 19, iron);
    }
    if (v.top < 0) {
      band(p, v, v.top, -108, '#364956');
      for (let r = Math.floor(v.top / 46); r * 46 < Math.min(v.bottom, -98); r++) {
        const y = r * 46;
        band(p, v, y, y + 2, '#465967');
        for (let x = Math.floor(v.left / 94) * 94 - 94; x < v.right; x += 94) {
          const sx = x + (r % 2 ? 41 : 0);
          p.rect(sx, y + 2, 2, 43, '#2c4050');
          p.rect(sx + 4, y + 6, 2, 2, '#738084');
          p.rect(sx + 4, y + 8, 2, 1, iron);
        }
      }
      band(p, v, -129, -124, night);
      band(p, v, -125, -121, '#99765e');
      band(p, v, -120, -107, iron);
      band(p, v, -109, -108, '#6e797a');
      for (let k = Math.floor(v.left / 154) - 1; k * 154 < v.right; k++) {
        const x = k * 154;
        p.path([x, -121, x + 75, -187, x + 151, -123], '#263b49', 7);
        p.path([x + 5, -122, x + 75, -181, x + 144, -123], '#70807e', 2);
      }
      p.path([71, -243, 214, -243, 223, -236, 223, -208], night, 5);
      p.path([74, -242, 211, -242, 220, -236], verdigris, 2);
      wheel(p, 97, -126, 16);
      p.line(85, -114, 85, -69, night, 2);
      p.line(108, -113, 99, -67, '#9e8c72', 2);
      p.path([85, -69, 90, -62, 98, -66, 102, -73], brass, 3);
      p.rect(175, -210, 68, 23, night);
      p.rect(178, -208, 62, 18, '#526470');
      for (let x = 182; x < 236; x += 7) p.rect(x, -206, 3, 13, '#273c4c');
    }
    flagstones(p, v, 112);
    shaft(p, v, 437.3, 368.1, 103, 219, '#ac8b6e', 110);
    // A bank of sorting bins and a hand truck flank the toppled machine.
    p.rect(387, 32, 62, 80, night);
    p.rect(391, 36, 54, 72, '#685c59');
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const x = 393 + col * 17, y = 38 + row * 16;
      p.rect(x, y, 14, 12, '#334353');
      p.rect(x, y + 10, 14, 2, '#a1856b');
      if ((row + col) % 3) p.poly([x + 2, y + 7, x + 10, y + 5, x + 12, y + 9, x + 2, y + 10], '#baa486');
    }
    trolley(p, -154, 112, 73);
    if (v.bottom > 180) {
      p.path([-12, 250, 43, 245, 76, 256, 91, 276, 84, 287, 66, 283, 69, 270, 100, 261], '#574f52', 3);
      p.path([-11, 249, 43, 244, 76, 255, 90, 275], '#aa8e73');
      for (const y of [189, 251, 343]) {
        const x = 437.3 - 334.3 * y / 180, end = 368.1 - 149.1 * y / 180;
        p.line(x, y, end, y, '#c7a782');
      }
      p.poly([221, 268, 239, 263, 248, 270, 227, 277], c.brick);
      p.poly([222, 267, 240, 262, 247, 268, 227, 274], '#cfb392');
      p.rect(240, 266, 2, 2, '#7d695f');
      trolley(p, 14, 373, 111);
      trunk(p, 24, 315, 72, 28, '#55676a', '#997c65');
    }
  }
  function platformFloor(p, t, view) {
    const bg = plate('ending-floor', 320, 180, (q) => {
      q.rect(0, 0, 320, 180, blue);
      for (let x = -20; x < 330; x += 62) {
        q.rect(x, 1, 45, 82, glass);
        q.poly([x + 2, 5, x + 40, 5, x + 37, 47, x + 2, 67], '#7b827e');
        q.poly([x + 5, 8, x + 24, 8, x + 5, 47], '#c6a57d');
        q.rect(x + 22, 2, 3, 81, iron);
        q.rect(x, 31, 44, 4, iron);
        q.rect(x, 63, 44, 2, iron);
      }
      q.rect(0, 83, 320, 31, '#4b5055');
      q.rect(0, 86, 320, 3, '#6f6762');
      for (let i = 0; i < 14; i++) q.rect(i * 24, 92, 2, 19, iron);
      floor(q, 112);
      q.poly([233, 110, 277, 110, 219, 180, 103, 180], '#ac8b6e');
      q.path([227, 116, 193, 142, 155, 167], '#d2ac7c');
    });
    surround(p, view, 'sorting-hall', sortingHall);
    p.image(bg, 0, 0);
    const g = p.g;
    g.save();
    g.translate(43, 136);
    g.scale(1.26, 1.26);
    window.DispatchActors.draw(g, 'conductor', 0, 0, { pose: 'defeat', phase: 1, face: 1 });
    g.restore();
    const travel = ease(-0.55, 2.05, t),
      x = lerp(49, 193, travel);
    const bounce = Math.abs(Math.sin(t * 10)) * (1 - travel) * 12;
    const y = 142 - bounce;
    p.oval(x - 1, 145, 10, 2, '#675651');
    p.line(x, y - 2, x + 8 * Math.cos(t * 11), y + 6 * Math.sin(t * 11), c.ink, 3);
    brassBall(p, x, y - 2, 6, t * 13);
    dog(
      p,
      'pip',
      273 - 33 * ease(0.85, 2.25, t),
      141,
      1.02,
      -1,
      t < 0.85 ? 'idle' : t < 1.56 ? 'run' : 'land',
      ease(1.56, 2.3, t),
      t,
    );
    for (let i = 0; i < 8; i++) {
      const dx = (i * 43 + t * 6) % 320,
        dy = (i * 17 + t * 3) % 110;
      p.rect(dx, dy, i % 3 ? 1 : 2, 1, '#c5ac8b');
    }
  }
  function furryPaw(p, x, y, reach, dark = false) {
    const g = p.g;
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.scale(reach, 1);
    // Elbows turn toward the camera outside the original hand close-ups.
    p.poly([-291, 239, -274, 180, -249, 119, -213, 89, -198, 83, -192, 106,
      -211, 132, -229, 171, -242, 236, -253, 286, -297, 286], dark ? '#494151' : c.ochre, c.ink);
    p.poly([-282, 231, -270, 183, -244, 126, -215, 101, -222, 117, -239, 141, -260, 199], dark ? '#5c5665' : '#be8154');
    p.poly([-306, 303, -294, 241, -280, 209, -264, 217, -248, 221, -238, 230, -244, 292,
      -258, 352, -326, 352], dark ? '#4d515e' : '#596a6c', c.ink);
    p.path([-289, 232, -273, 232, -247, 246], dark ? '#8d7588' : '#a68970', 3);
    p.poly(
      [
        -214, 88, -97, 31, -68, 16, -38, 4, -19, -2, -7, -5, 2, -6, 9, -3, 11, 1, 8, 5, 4, 7, -6, 8, -15, 15,
        -31, 22, -59, 32, -113, 60, -207, 119,
      ],
      dark ? '#494151' : c.ochre,
      c.ink,
    );
    p.poly(
      [-162, 74, -82, 33, -49, 17, -61, 26, -47, 23, -65, 34, -92, 47, -138, 70],
      dark ? '#595064' : '#be8154',
    );
    p.poly([-28, 10, -16, 1, -5, -3, 2, -4, 7, -2, 8, 0, 5, 3, -2, 5, -10, 5, -20, 13], c.cream);
    p.path([-11, 4, -5, 2, 1, 2], '#a88f81');
    p.path([-16, 10, -8, 7, -4, 7], '#ae9982');
    p.path([-43, 12, -29, 6, -32, 10, -24, 6], dark ? '#766974' : c.sand);
    g.restore();
  }
  function clockwork(p, v) {
    band(p, v, v.top, v.bottom, '#3b4b59');
    // The bell hangs in a steel cradle. The raking light comes from a single louvre.
    for (let k = Math.floor((v.left - v.bottom * 0.52 + 30) / 66) - 1;
      -30 + k * 66 + v.top * 0.46 < v.right + 66; k++) {
      const x = -30 + 66 * k;
      shaft(p, v, x, x + 9, x + 85, x + 101, '#526270');
      shaft(p, v, x, x + 3, x + 87, x + 92, '#68747a');
    }
    shaft(p, v, 168, 221, 0, 90, '#7a7f7a', -255);
    shaft(p, v, 194, 209, 49, 76, '#9c9b87', -224);
    band(p, v, 13, 24, night);
    band(p, v, 16, 18, brass);
    for (let x = 5 + 22 * Math.floor((v.left - 5) / 22); x < v.right; x += 22) p.rect(x, 19, 2, 2, c.slate);
    p.rect(370, -255, 80, 27, night);
    for (let y = -252; y < -229; y += 5) p.rect(375, y, 70, 2, '#a6a69a');
    if (v.top < 0) {
      band(p, v, -191, -173, '#273b4b');
      band(p, v, -187, -184, '#718285');
      for (let x = Math.floor(v.left / 36) * 36; x < v.right; x += 36) {
        p.rect(x, -180, 23, 4, '#455b65');
        p.rect(x + 2, -181, 2, 2, brass);
      }
      p.path([100, -173, 116, -141, 145, -136, 181, -144, 198, -173], night, 5);
      p.path([106, -173, 118, -147, 141, -141], verdigris, 2);
      wheel(p, 159, -155, 23);
      p.line(140, -144, 149, -66, night, 3);
      p.line(179, -143, 172, -66, night, 3);
      p.line(142, -141, 151, -67, '#9e8d73');
      p.line(177, -140, 171, -68, '#9e8d73');
      p.poly([140, -70, 176, -70, 180, -63, 174, -57, 168, -55, 166, -41,
        157, -38, 152, -42, 152, -55, 144, -56, 138, -61], '#89674f', night);
      p.path([143, -65, 147, -68, 174, -68], c.sand, 2);
      p.rect(155, -55, 4, 12, brass);
    }
    p.path([365, 19, 378, 56, 422, 92, 474, 129], night, 6);
    p.path([390, 16, 431, 41, 472, 81, 499, 125], '#8d8170', 3);
    wheel(p, 430, 69, 32);
    wheel(p, 484, 126, 12);
    wheel(p, -134, 64, 23);
    p.path([-155, 64, -191, 104, -232, 102], '#273c4c', 3);
    if (v.bottom > 180) {
      band(p, v, 232, 242, '#314352');
      band(p, v, 234, 236, '#9c8b72');
      for (let k = Math.floor(v.left / 112); k * 112 < v.right; k++) {
        const x = k * 112;
        p.rect(x + 6, 265, 96, 51, '#2f4251');
        p.rect(x + 8, 267, 92, 47, '#52636a');
        for (let i = 0; i < 8; i++) p.rect(x + 14 + i * 10, 272, 5, 34, '#2c3e4d');
        p.rect(x + 9, 310, 89, 1, '#8d9082');
      }
      p.path([88, 390, 88, 356, 95, 347, 220, 347, 230, 339, 230, 320], '#283a49', 8);
      p.path([90, 387, 90, 358, 96, 351, 222, 351, 234, 340, 234, 320], '#7c7870', 2);
      wheel(p, 161, 349, 17);
    }
  }
  function underBell(p, t, view) {
    const bg = plate('ending-bell-socket', 320, 180, (q) => {
      q.rect(0, 0, 320, 180, '#3b4b59');
      for (let x = -30; x < 355; x += 66) {
        q.poly([x, 0, x + 9, 0, x + 101, 180, x + 85, 180], '#526270');
        q.poly([x, 0, x + 3, 0, x + 92, 180, x + 87, 180], '#68747a');
      }
      q.poly([168, 0, 221, 0, 90, 180, 0, 180], '#7a7f7a');
      q.poly([194, 0, 209, 0, 76, 180, 49, 180], '#9c9b87');
      q.rect(0, 13, 320, 11, night);
      q.rect(0, 16, 320, 2, brass);
      for (let x = 5; x < 320; x += 22) q.rect(x, 19, 2, 2, c.slate);
    });
    surround(p, view, 'bell-cradle', clockwork);
    p.image(bg, 0, 0);
    p.image(shell(), 73, -43, 178, 157);
    const lift = ease(0.1, 0.97, t);
    const x = 160 + (1 - lift) * 22,
      y = 116 + (1 - lift) * 41;
    p.oval(160, 100, 4, 3, c.ink);
    p.path([x - 1, y - 17, x, y - 5], c.ink, 5);
    p.path([x, y - 16, x, y - 7], c.gold, 2);
    brassBall(p, x, y, 11, t);
    const hand = 1 - ease(1.05, 1.69, t);
    furryPaw(p, x - 7 - 61 * (1 - hand), y + 4 + 42 * (1 - hand), 1);
    if (t > 0.97 && t < 1.23) {
      const flare = (1 - ease(0.97, 1.23, t)) * 5;
      p.line(162 - flare, 100, 162 + flare, 100, c.cream);
      p.line(162, 100 - flare, 162, 100 + flare, c.white);
    }
  }
  function nightDistrict(p, v) {
    band(p, v, v.top, v.bottom, '#233347');
    const bands = [[-4096, '#192636'], [-238, '#1d2b3d'], [-164, '#212f41'], [-96, '#253447'],
      [-44, '#28374c'], [0, '#29384f'], [22, '#34475c'], [40, '#435d70'], [60, '#567687'],
      [76, '#718b92'], [91, '#93a6a1'], [106, '#b5b7a2'], [123, '#536c79']];
    for (let i = 0; i < bands.length; i++) {
      const [y, color] = bands[i];
      band(p, v, y, i + 1 < bands.length ? bands[i + 1][0] : v.bottom, color);
      if (y > -4000 && y < 123 && y >= v.top && y < v.bottom) {
        for (let x = v.left + ((y % 3 - v.left) % 4 + 4) % 4; x < v.right; x += 4) p.rect(x, y - 1, 1, 1, color);
      }
    }
    scatter(v, 35, 29, (x, y, n) => {
      if (y < 56 && n % 4) {
        p.rect(x, y, 1, 1, n % 5 ? '#91a8af' : '#d8d7bc');
        if (n % 19 === 0) p.rect(x - 1, y, 3, 1, '#99a3a4');
      }
    });
    const clouds = [[-249, 33, 96], [-118, 51, 66], [320, 58, 73], [445, 38, 100],
      [49, -116, 94], [215, -161, 69], [-115, -38, 89], [363, -68, 95], [91, -242, 61]];
    for (const [x, y, w] of clouds) {
      if (x + w > v.left && x < v.right && y + 8 > v.top && y < v.bottom) {
        cloudStrip(p, x, y, w, y < 0 ? '#34475b' : '#647c87', y < 0 ? '#50616c' : '#95a4a1');
      }
    }
    cloudStrip(p, -8, 49, 83, '#526b7b', '#91a29d');
    cloudStrip(p, 231, 58, 91, '#667d89', '#9caaa2');
    // The first and last roofs of the established skyline actually straddle the frame.
    if (v.top < 123 && v.bottom > 62) {
      city(p, 113, '#536c79', '#73848a', '#bdab89');
      for (let k = Math.floor(v.left / 25) - 1; k <= Math.floor(v.right / 25); k++) {
        const x = 25 * k;
        if (x >= -30 && x < 325) continue;
        const n = salt(k, 3), w = 17 + n % 8, y = 81 + (n >>> 8) % 21;
        p.rect(x, y, w, 113 - y, '#536c79');
        if (n % 3 === 0) p.poly([x - 1, y, x + w / 2, y - 6, x + w + 1, y], '#536c79');
        if (n % 3 === 1) p.rect(x + 5, y - 6, 4, 6, '#536c79');
        p.rect(x, y, w, 2, '#73848a');
        for (let i = 3; i < w - 2; i += 6) p.rect(x + i, y + 5, 2, 2, '#bdab89');
      }
      band(p, v, 113, 123, '#536c79');
    }
  }
  function towerExterior(p, v) {
    nightDistrict(p, v);
    band(p, v, 110, 152, '#5c7278');
    p.poly([-684, 104, -551, 97, -489, 111, -360, 95, -306, 103, -250, 96, -202, 106, -150, 91,
      -103, 101, -62, 96, 0, 108, 34, 95, 283, 96, 320, 109, 354, 103, 390, 107, 423, 94,
      470, 102, 519, 92, 562, 106, 636, 98, 846, 107, 846, 153, -684, 153], '#5c7278');
    p.poly([-607, 144, -319, 132, -214, 120, -137, 130, -71, 123, 0, 140, 108, 115,
      231, 117, 320, 134, 376, 125, 432, 129, 512, 116, 700, 136, 900, 125, 900, 160, -607, 160], '#475866');
    p.path([-138, 134, -71, 127, 1, 144, 110, 119], '#849493', 2);
    p.path([296, 133, 320, 138, 378, 129, 430, 133, 511, 120], '#849493', 2);
    for (const [x, y] of [[-206, 91], [-158, 94], [-116, 90], [-82, 98], [340, 93], [379, 84],
      [423, 88], [476, 79]]) {
      p.rect(x, y, 2, 25, iron);
      p.rect(x - 4, y + 1, 9, 2, iron);
    }
    flagstones(p, v, 145);
    // A slate bell-tower roof with an open cupola and copper lightning finial.
    p.poly([-72, 38, -46, 25, 92, -83, 109, -109, 119, -110, 142, -88, 393, -8,
      411, 0, 320, 5, 125, 13, 0, 29], night);
    p.poly([-46, 21, 93, -81, 111, -102, 120, -103, 135, -84, 320, -28,
      226, -24, 115, -19, 5, -7, -40, 12], '#354856');
    p.poly([112, -99, 125, -80, 149, -20, 115, -19, 5, -7, -40, 12], '#42545d');
    for (const [x, y] of [[-19, 2], [41, -12], [97, -17], [150, -21], [211, -24], [260, -26], [319, -28]]) {
      p.path([116, -98, x, y], '#607071', 1);
    }
    p.path([-72, 36, 0, 27, 119, 12, 318, 4, 408, -2], '#a98065', 2);
    p.rect(100, -142, 30, 32, '#314653');
    p.rect(105, -138, 20, 22, night);
    for (let x = 105; x < 125; x += 6) p.rect(x, -138, 2, 22, '#79817b');
    p.poly([90, -143, 101, -149, 112, -164, 119, -164, 129, -150, 140, -143], '#4e6168', night);
    p.path([92, -144, 110, -154, 114, -163], '#b39879');
    p.rect(114, -194, 2, 30, night);
    p.oval(115, -187, 3, 3, brass);
    p.poly([104, -181, 115, -178, 132, -182, 128, -174, 117, -176, 104, -175], '#9d795e', night);
    if (v.bottom > 195) {
      // The foreground tiles end at the cornice. Below them is the working clock face.
      band(p, v, 202, v.bottom, '#546064');
      band(p, v, 202, 210, '#394b57');
      band(p, v, 203, 206, '#a38b72');
      band(p, v, 216, 223, '#344450');
      for (let row = 0; 225 + row * 27 < v.bottom; row++) {
        const y = 225 + row * 27;
        band(p, v, y, y + 2, '#47555c');
        for (let k = Math.floor(v.left / 58) - 1; k * 58 < v.right; k++) {
          const x = k * 58 + (row % 2) * 28;
          p.rect(x, y + 2, 2, 25, '#47555c');
          p.rect(x + 5, y + 3, 23, 1, '#647174');
        }
      }
      const cx = 150, cy = 329;
      p.oval(cx, cy, 57, 57, '#41525c');
      p.oval(cx, cy, 53, 53, '#968572');
      p.oval(cx, cy, 47, 47, '#263c4c');
      p.oval(cx, cy, 43, 43, '#64767a');
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        p.line(cx + 35 * Math.sin(a), cy - 35 * Math.cos(a), cx + 40 * Math.sin(a),
          cy - 40 * Math.cos(a), '#d2b58c', 2);
      }
      p.path([cx, cy - 30, cx, cy, cx + 22, cy + 8], night, 3);
      p.oval(cx + 1, cy + 1, 3, 3, brass);
      for (const x of [25, 264]) {
        p.poly([x, 357, x, 289, x + 12, 271, x + 25, 289, x + 25, 357], '#394b57');
        for (let y = 295; y < 354; y += 7) p.rect(x + 4, y, 17, 2, '#647477');
      }
    }
  }
  function swingingBell(p, t, view) {
    const bg = plate('ending-tower', 320, 180, (q) => {
      skyline(q, 210, 48);
      q.poly(
        [
          0, 108, 34, 95, 59, 104, 94, 91, 126, 99, 146, 96, 173, 107, 195, 99, 239, 110, 283, 96, 320, 109,
          320, 150, 0, 150,
        ],
        '#5c7278',
      );
      for (const [x, y] of [
        [160, 102],
        [188, 99],
        [220, 105],
        [246, 108],
        [274, 102],
        [305, 111],
      ]) {
        q.rect(x, y - 14, 2, 28, iron);
        q.rect(x - 4, y - 13, 9, 2, iron);
      }
      q.poly([0, 140, 108, 115, 231, 117, 320, 134, 320, 155, 0, 159], '#475866');
      q.path([1, 144, 110, 119, 224, 121, 320, 138], '#849493', 2);
      floor(q, 145);
      q.poly([0, 0, 320, 0, 320, 5, 125, 13, 0, 29], night);
      q.path([0, 27, 119, 12, 318, 4], '#a98065', 2);
      steelBeam(q, 16, 19, 150);
      steelBeam(q, 306, 3, 148);
      q.poly([18, 20, 24, 16, 75, 12, 23, 56], night);
      q.path([26, 43, 56, 19], glass, 2);
      q.rect(65, 12, 69, 6, iron);
      q.rect(98, 13, 5, 17, night);
      q.rect(65, 15, 68, 1, c.copper);
    });
    surround(p, view, 'bell-tower', towerExterior);
    p.image(bg, 0, 0);
    const pull = ease(0.34, 1.18, t),
      release = ease(1.43, 2.12, t);
    const swingT = Math.max(0, t - 1.1);
    const angle = 0.14 * pull + 0.3 * Math.sin(swingT * 4.6) * Math.exp(-swingT * 0.75) - 0.14 * release;
    const g = p.g;
    g.save();
    g.translate(101, 24);
    g.rotate(angle);
    p.image(shell(), -43, 0, 86, 74);
    p.line(0, 63, 4 + Math.sin(swingT * 5.1) * 8, 77, c.ink, 3);
    brassBall(p, 4 + Math.sin(swingT * 5.1) * 8, 79, 5, swingT);
    g.restore();
    const slack = 1 - pull + release;
    const rimX = 101 + 34 * Math.cos(angle) - 48 * Math.sin(angle),
      rimY = 24 + 34 * Math.sin(angle) + 48 * Math.cos(angle);
    const runnerX = 221 + 5 * (pull - release),
      phase = ease(0.4, 1.85, t);
    const takingRope = t >= 0.5 && t < 1.8;
    const grip = takingRope ? window.DogArt.itemPoint('noodle', 'noodleLasso', phase) : null;
    const handX = grip ? runnerX - 0.99 * grip[0] : runnerX - 21,
      handY = grip ? 150 + 0.99 * grip[1] : 124;
    p.path([rimX, rimY, 150, 85 + 6 * slack, 174, 99 + 7 * slack, handX, handY], c.ink, 3);
    p.path([rimX, rimY, 150, 84 + 6 * slack, 174, 98 + 7 * slack, handX, handY - 1], c.sand, 2);
    dog(p, 'pip', 65, 149, 0.69, 1, 'win', 0.5, t);
    dog(p, 'noodle', runnerX, 150, 0.99, -1, takingRope ? 'noodleLasso' : 'idle', phase, t);
    const sent = Math.max(0, t - 1.27);
    for (const [i, x] of [160, 188, 220, 246, 274, 305].entries()) {
      if (sent > i * 0.19) p.rect(x - 2, [88, 85, 91, 94, 88, 97][i], 4, 2, c.gold);
    }
    if (sent > 0) {
      for (let i = 0; i < 5; i++) {
        const x = 155 + i * 11 + sent * (14 + i),
          y = 86 + (i % 3) * 3 - sent * (9 + i);
        const flap = Math.round(Math.sin(sent * 10 + i * 1.7) * 2);
        p.path([x - 3, y + flap, x, y + 1, x + 3, y + flap], iron);
      }
    }
  }
  function punchedDate(p, x, y, digits, color, size) {
    const type = {
      1: ['010', '110', '010', '010', '111'],
      4: ['101', '101', '111', '001', '001'],
      5: ['111', '100', '111', '001', '111'],
    };
    for (const digit of digits) {
      type[digit].forEach((row, dy) => {
        for (let dx = 0; dx < 3; dx++)
          if (row[dx] === '1') p.rect(x + dx * size, y + dy * size, size - 0.35, size - 0.35, color);
      });
      x += size * 4;
    }
  }
  function ticket() {
    return plate('ending-next-ticket', 82, 45, (p) => {
      p.poly(
        [
          4, 1, 78, 1, 78, 5, 81, 6, 81, 19, 77, 22, 81, 25, 81, 38, 77, 39, 77, 43, 5, 43, 5, 39, 1, 37, 1,
          26, 5, 22, 1, 19, 1, 7, 4, 6,
        ],
        c.gold,
        c.ink,
      );
      p.rect(7, 5, 67, 33, c.brick);
      p.rect(8, 6, 65, 31, c.wheat);
      p.rect(11, 8, 4, 26, c.copper);
      p.rect(18, 8, 21, 2, c.rust);
      p.rect(18, 13, 17, 1, c.ochre);
      p.rect(18, 17, 20, 1, c.ochre);
      p.rect(18, 31, 18, 2, c.rust);
      for (let y = 6; y < 39; y += 4) p.rect(45, y, 1, 2, c.brick);
      punchedDate(p, 50, 13, '15', c.brick, 2);
      for (let x = 21; x < 37; x += 4) p.rect(x, 22, 2, 3, iron);
    });
  }
  function postDesk(p, v) {
    band(p, v, v.top, v.bottom, '#655558');
    const low = Math.max(-117, v.top), high = Math.min(v.bottom, 249);
    if (high > low) {
      const first = Math.floor((v.left + low * 0.28) / 63) - 1;
      for (let k = first; k * 63 - high * 0.28 < v.right; k++) {
        const x = k * 63;
        shaft(p, v, x, x + 59, x - 49, x + 11, k % 2 ? '#785d58' : '#826359', low, high);
        p.line(x - low * 49 / 179, low, x - (high - 1) * 49 / 179, high - 1, '#ad8066');
      }
      shaft(p, v, 116, 252, 31, 172, '#ab8268', low, high);
      shaft(p, v, 186, 198, 101, 117, '#c09772', low, high);
      scatter(v, 29, 23, (x, y, n) => {
        if (y < low || y >= high) return;
        p.path([x, y, x + 7 + n % 9, y - 2, x + 13 + n % 11, y - 2], n % 4 ? '#946e5d' : '#ba8c6e');
      });
    }
    if (v.top < -83) {
      band(p, v, v.top, -116, '#45434a');
      for (let row = Math.floor((v.top + 115) / 44) - 1; row * 44 - 115 < Math.min(-150, v.bottom); row++) {
        const y = row * 44 - 115;
        for (let k = Math.floor(v.left / 83) - 1; k * 83 < v.right; k++) {
          const x = k * 83;
          p.rect(x + 3, y, 78, 39, '#343b47');
          p.rect(x + 7, y + 4, 70, 28, '#3f424c');
          const contents = salt(k, row), count = contents % 5;
          for (let i = 0; i < count; i++) {
            const seed = salt(k + i, row), px = x + 7 + (seed >>> 8) % 18;
            const py = y + 29 - (count - i) * 4, w = 31 + (seed >>> 15) % 15;
            const pitch = 2 + (contents >>> 12) % 7;
            p.poly([px, py, px + w, py - pitch, px + w + 5, py - pitch + 8, px + 3, py + 8],
              ['#8d8780', '#b39c83', '#8e9d94', '#c0a083'][i], '#504d51');
            p.path([px + 1, py, px + w / 2, py + 3, px + w - 1, py - pitch], '#6a6260');
          }
          p.rect(x, y + 36, 81, 5, '#7b6259');
          p.rect(x, y + 37, 81, 1, '#ad876a');
          p.rect(x + 33, y + 35, 14, 5, '#92765e');
          p.rect(x + 36, y + 36, 8, 2, '#d2b58d');
        }
      }
      band(p, v, -122, -115, '#3e3e48');
      band(p, v, -116, -113, '#b18a6b');
      band(p, v, -113, -104, '#795e56');
    }
    // Blotter, ink well and cancellation stamp are on the clerk's side of the desk.
    p.poly([-203, 48, -118, 35, -90, 92, -181, 107], '#51454c', night);
    p.poly([-200, 48, -120, 38, -97, 90, -180, 102], '#956b5c');
    p.rect(-172, 55, 29, 20, '#31454c');
    p.poly([-171, 55, -165, 49, -151, 47, -143, 54, -145, 58, -169, 60], '#627d7b', night);
    p.rect(-164, 47, 11, 4, '#343844');
    p.path([-158, 48, -143, 20, -127, 4], '#e1bc8c', 2);
    p.path([-154, 39, -143, 16, -129, 3, -132, 16, -141, 22], '#a78b78', 2);
    p.oval(413, 65, 24, 9, '#4b424a');
    p.oval(413, 61, 23, 7, '#aa8264');
    p.rect(400, 41, 26, 18, '#876852');
    for (let y = 42; y < 59; y += 3) p.rect(400, y, 26, 1, '#d8b081');
    p.oval(413, 39, 22, 6, '#b69570');
    p.oval(413, 39, 4, 2, '#634f4e');
    p.path([421, 59, 445, 66, 455, 75, 449, 81, 435, 76, 444, 72, 467, 77], '#c1a67f');
    p.poly([18, -77, 93, -86, 111, -40, 31, -29], c.brick, night);
    p.poly([22, -74, 91, -82, 107, -43, 34, -34], '#b9a180');
    p.path([31, -65, 87, -71, 93, -52, 40, -44, 31, -65], '#917c66');
    p.path([35, -56, 53, -61, 58, -53, 69, -61, 83, -59], '#586e70');
    p.path([240, 0, 240, -12, 296, -12, 299, 0], night, 2);
    p.rect(243, -10, 53, 10, '#ae805f');
    for (const x of [247, 264, 283]) p.path([x, -2, x, -13, x + 4, -13, x + 5, -1], '#d2ad79', 2);
    // Finish the leather satchel whose flap crosses the near corner of the close-up.
    p.poly([-124, 125, -91, 112, -42, 119, 0, 137, 34, 151, 59, 180, 69, 202,
      55, 223, -70, 211, -124, 176], night);
    p.path([-122, 126, -90, 115, -42, 122, 0, 139, 33, 154, 52, 176, 65, 201, 54, 218], glass, 2);
    p.path([-102, 144, -81, 137, -38, 145, -6, 158, 23, 180, 33, 201, -46, 195], '#3c4d5a', 2);
    p.rect(-49, 190, 16, 8, '#807567');
    p.rect(-47, 191, 11, 5, '#394653');
    if (v.bottom > 247) {
      band(p, v, 248, 254, '#453f46');
      band(p, v, 249, 251, '#c49b75');
      band(p, v, 254, 268, '#826252');
      band(p, v, 265, 270, '#4c4248');
      band(p, v, 270, 338, '#665557');
      for (let k = Math.floor(v.left / 148) - 1; k * 148 < v.right; k++) {
        const x = k * 148;
        p.rect(x + 7, 275, 134, 51, '#4e444c');
        p.rect(x + 10, 277, 128, 46, '#81665c');
        p.path([x + 14, 318, x + 14, 281, x + 133, 281], '#ab876b');
        p.path([x + 58, 293, x + 62, 298, x + 86, 298, x + 90, 293], '#51484b', 3);
        p.path([x + 58, 291, x + 62, 295, x + 85, 295, x + 90, 291], '#b79970', 2);
      }
      band(p, v, 331, 339, '#403e48');
      band(p, v, 339, v.bottom, '#4a4951');
      scatter(v, 71, 25, (x, y, n) => {
        if (y >= 339) p.rect(x, y, 7 + n % 20, 1, '#58565a');
      });
      for (const x of [-114, 37, 289, 449]) {
        p.poly([x, 337, x + 16, 337, x + 13, 404, x + 9, 410, x + 3, 409], '#604f51', night);
        p.rect(x + 3, 342, 3, 54, '#7b6258');
      }
    }
  }
  function desk(p, t, view) {
    const wood = plate('ending-letter-desk', 320, 180, (q) => {
      q.rect(0, 0, 320, 180, '#655558');
      for (let i = -2; i < 6; i++) {
        q.poly(
          [i * 63, 0, i * 63 + 59, 0, i * 63 + 11, 180, i * 63 - 49, 180],
          i % 2 ? '#785d58' : '#826359',
        );
        q.line(i * 63, 0, i * 63 - 49, 179, '#ad8066');
      }
      q.poly([116, 0, 252, 0, 172, 180, 31, 180], '#ab8268');
      q.poly([186, 0, 198, 0, 117, 180, 101, 180], '#c09772');
      for (let i = 0; i < 56; i++) {
        const x = (i * 59) % 320,
          y = (i * 17) % 180;
        q.path([x, y, x + 8 + (i % 9), y - 2, x + 12 + (i % 12), y - 2], i % 4 ? '#946e5d' : '#ba8c6e');
      }
      q.poly([0, 8, 48, 0, 57, 24, 7, 36], c.brick, c.ink);
      q.path([0, 12, 45, 2, 51, 22, 5, 32], c.ochre);
      q.rect(240, 0, 59, 44, night);
      q.rect(242, 2, 55, 40, c.copper);
      q.rect(245, 5, 49, 34, c.wheat);
      q.rect(246, 5, 47, 7, c.brick);
      punchedDate(q, 255, 15, '14', c.brick, 4);
      q.rect(244, 38, 51, 2, c.rust);
      q.poly([0, 137, 34, 151, 59, 180, 0, 180], night);
      q.path([0, 139, 33, 154, 52, 176], glass, 2);
    });
    surround(p, view, 'clerks-desk', postDesk);
    p.image(wood, 0, 0);
    const open = ease(0.55, 1.31, t),
      draw = ease(1.6, 2.85, t);
    const x = 161,
      y = 109 + 2 * Math.sin(Math.PI * open);
    p.oval(x, y + 25, 60, 9, '#84665b');
    p.poly([x - 55, y - 18, x + 48, y - 22, x + 50, y + 23, x - 52, y + 28], c.green, c.ink);
    p.poly(
      [x - 53, y - 16, x + 47, y - 19, x + 4, y - 10 - 47 * open],
      open > 0.5 ? c.mint : c.aqua,
      c.green,
    );
    p.path([x - 48, y - 15, x + 4, y - 13 - 41 * open, x + 44, y - 18], c.ice);
    const ticketX = x - 32 + 16 * draw,
      ticketY = y - 20 - 44 * draw;
    p.image(ticket(), ticketX, ticketY, 70, 38);
    p.poly(
      [x - 53, y - 18, x - 12, y + 2, x + 2, y - 1, x + 47, y - 21, x + 48, y + 22, x - 51, y + 26],
      c.aqua,
      c.green,
    );
    p.path([x - 51, y + 23, x - 13, y + 2], c.mint);
    p.path([x + 4, y + 1, x + 45, y + 19], c.teal);
    if (open < 1) {
      const tip = y - 1 - 49 * open;
      p.poly([x - 53, y - 18, x + 47, y - 21, x + 4, tip], c.teal, c.green);
      p.path([x - 50, y - 16, x + 4, tip - 2, x + 43, y - 19], c.mint);
      p.oval(x + 4, tip - 3, 6, 4, c.wheat);
    }
    for (const [nx, ny] of [
      [-37, 12],
      [-29, 8],
      [-20, 11],
    ])
      paw(p, x + nx, y + ny, c.green, 0.52);
    furryPaw(p, x - 33 - 40 * (1 - ease(0, 0.6, t)), y + 13, 1, true);
    furryPaw(p, ticketX + 72 + 40 * (1 - ease(1.2, 1.7, t)), ticketY + 29, -1, true);
  }
  function carriage() {
    return plate('ending-dark-mail', 126, 57, (p) => {
      p.poly([3, 12, 8, 7, 97, 5, 119, 10, 122, 15, 120, 20, 118, 21, 118, 43, 106, 48, 7, 48, 3, 43], night);
      p.path([5, 13, 10, 9, 95, 7, 118, 11], '#6e7d83', 2);
      p.rect(8, 19, 108, 22, blue);
      for (let x = 13; x < 108; x += 16) {
        p.rect(x, 21, 12, 13, iron);
        p.rect(x + 1, 22, 10, 10, '#1a293a');
        p.path([x + 2, 23, x + 7, 23, x + 2, 29], '#304458');
      }
      p.rect(5, 40, 114, 2, '#586a72');
      p.rect(10, 46, 103, 2, iron);
      for (const x of [20, 34, 92, 106]) {
        p.oval(x, 49, 6, 6, night);
        p.oval(x, 49, 3, 3, iron);
        p.rect(x, 48, 1, 1, '#77868b');
      }
      p.rect(120, 40, 6, 3, iron);
      p.rect(2, 38, 4, 3, '#6f777a');
    });
  }
  function eastYard(p, v) {
    nightDistrict(p, v);
    band(p, v, 107, 141, '#405767');
    p.poly([-690, 105, -498, 99, -330, 103, -270, 92, -229, 98, -193, 87, -153, 99,
      -121, 92, -78, 101, -43, 92, 0, 104, 25, 96, 279, 90, 320, 95, 368, 101, 409, 89,
      449, 96, 486, 85, 525, 97, 571, 91, 630, 104, 780, 93, 901, 105, 901, 135, -690, 135], '#405767');
    for (const [x, y] of [[-233, 80], [-171, 74], [-117, 77], [-63, 69], [361, 77],
      [421, 68], [480, 72], [543, 66], [607, 68]]) {
      p.rect(x, y, 2, 49, iron);
      p.rect(x - 4, y + 2, 10, 2, iron);
    }
    p.path([-235, 82, -207, 88, -170, 76, -142, 84, -117, 80, -94, 82, -63, 72, -31, 80,
      0, 76, 48, 85], iron);
    p.path([290, 80, 320, 82, 343, 83, 361, 79, 390, 81, 421, 70, 448, 80, 480, 74,
      512, 78, 543, 68, 572, 73, 607, 70], iron);
    band(p, v, 118, 144, night);
    band(p, v, 120, 122, '#9ca3a0');
    band(p, v, 127, 128, glass);
    // A water tank and a little signal cabin sit beyond the east end of the platform.
    p.rect(428, 66, 4, 47, '#415461');
    p.rect(452, 66, 4, 47, '#415461');
    p.path([428, 79, 452, 100, 431, 100, 453, 79], '#495e68', 2);
    p.poly([422, 48, 442, 39, 463, 48, 460, 68, 452, 72, 432, 72, 424, 67], '#435866');
    p.path([421, 49, 442, 41, 462, 49], '#86918e');
    p.rect(424, 56, 36, 2, '#697e82');
    p.rect(425, 64, 34, 2, '#697e82');
    p.poly([-216, 91, -194, 75, -174, 88, -177, 90, -177, 117, -212, 117], '#455a65');
    p.path([-218, 91, -195, 74, -173, 88], '#86908c', 2);
    p.rect(-204, 91, 19, 8, '#89928b');
    p.rect(-196, 91, 2, 8, '#4b606a');
  }
  function platformNorth(p, v) {
    // This platform lip is in front of the moving wheels, including outside the old frame.
    band(p, v, 150, v.bottom, '#63565b');
    p.poly([-760, 150, -509, 146, -352, 142, -182, 137, 0, 129, 195, 120, 320, 127,
      446, 135, 556, 146, 736, 155, 951, 155, 951, 187, -760, 187], '#63565b');
    p.path([-740, 148, -350, 146, -181, 142, 0, 134, 195, 124, 320, 130, 446, 138,
      556, 149, 734, 159, 899, 159], '#c4a47f', 3);
    p.path([-356, 209, -182, 188, 0, 157, 160, 132, 296, 133], '#987b6b');
    p.path([345, 137, 432, 154, 589, 194, 798, 250], '#927668');
    scatter(v, 51, 21, (x, y, n) => {
      if (y > 153 && y < 273) p.rect(x, y, 3 + n % 9, 1, n % 3 ? '#766368' : '#8c756b');
    });
    // The eave over Clover narrows to a genuine tip; the opposite track is open to the sky.
    p.poly([-313, -45, -198, -132, -155, -143, 189, -67, 247, -50, 155, -9, 134, 0,
      66, 15, 0, 24, -117, 48, -300, 66], night);
    p.poly([-289, -43, -196, -122, -154, -134, 184, -60, 221, -50, 150, -36,
      86, -25, 5, -7, -113, 18, -289, 39], '#354957');
    p.poly([-191, -116, -155, -131, 184, -59, 217, -50, 96, -45], '#435763');
    for (const [x, y] of [[-250, 34], [-151, 23], [-84, 12], [-7, -5], [68, -21], [125, -31]]) {
      p.path([-162, -127, x, y], '#53686e', 2);
    }
    p.path([-299, 63, -116, 45, 0, 22, 66, 14, 126, 1, 161, -11, 244, -49], glass, 2);
    for (const [x, top, end] of [[-243, 57, 166], [-109, 42, 159]]) {
      steelBeam(p, x, top, end);
      p.path([x + 3, top + 28, x + 32, top - 3], iron, 3);
    }
    p.path([-231, 56, -168, 49, -193, 72], '#415562', 2);
    // The two shapes at the bottom corners are actual luggage on a platform bench.
    p.poly([-86, 198, -63, 192, 0, 175, 35, 162, 62, 164, 77, 180, 87, 193,
      86, 215, 73, 229, -44, 244, -72, 231], night);
    p.path([-74, 198, -47, 190, 1, 174, 36, 164, 58, 166, 77, 183, 82, 195, 79, 210], iron);
    p.path([-64, 215, -39, 221, 65, 207, 82, 194], '#3a4b58', 2);
    p.path([-45, 193, -33, 202, -29, 228], '#4a555d', 3);
    p.path([37, 167, 48, 180, 54, 213], '#4a555d', 3);
    p.poly([225, 210, 263, 180, 285, 162, 320, 158, 343, 155, 394, 163, 415, 187,
      406, 207, 306, 229, 247, 232, 225, 225], night);
    p.path([231, 208, 275, 178, 289, 165, 318, 161, 343, 157, 393, 165], iron);
    p.path([244, 220, 279, 196, 337, 183, 394, 174], '#394a56', 2);
    p.path([353, 159, 366, 170, 375, 209], '#4b555a', 3);
    p.rect(354, 183, 10, 5, '#7a7065');
    if (v.bottom > 241) {
      for (let row = 0; row < 5; row++) {
        const y = 250 + row * 23;
        band(p, v, y, y + 2, '#9d8573');
        band(p, v, y + 2, y + 8, '#544c54');
        band(p, v, y + 8, y + 21, '#6a5d60');
        for (let k = Math.floor(v.left / 98) - 1; k * 98 < v.right; k++) {
          const x = k * 98 + (row % 2 ? 36 : 0);
          p.rect(x, y + 9, 1, 12, '#5c535a');
        }
      }
      band(p, v, 362, v.bottom, '#514c55');
      p.path([-55, 392, -19, 341, 14, 311, 42, 303], '#343c49', 6);
      p.path([-54, 391, -18, 340, 15, 310, 42, 302], '#9a8772', 2);
      p.line(15, 315, 15, 348, '#39414c', 4);
      scatter(v, 53, 20, (x, y, n) => {
        if (y > 364) p.rect(x, y, 3 + n % 11, 1, '#645b60');
      });
    }
  }
  function lastTrain(p, t, view) {
    const backdrop = plate('ending-east-station', 320, 180, (q) => {
      skyline(q, 215, 45);
      q.poly(
        [
          0, 104, 25, 96, 45, 99, 62, 90, 88, 96, 129, 85, 175, 99, 207, 91, 248, 103, 279, 90, 320, 95, 320,
          133, 0, 133,
        ],
        '#405767',
      );
      for (const x of [12, 46, 88, 128, 165, 291]) {
        q.rect(x, 73 + (x % 9), 2, 44, iron);
        q.rect(x - 4, 75 + (x % 9), 10, 2, iron);
      }
      q.path([0, 76, 48, 85, 85, 82, 128, 88, 166, 82, 221, 88, 290, 80, 320, 82], iron);
      q.rect(0, 118, 320, 15, night);
      q.rect(0, 120, 320, 2, '#9ca3a0');
      q.rect(0, 127, 320, 1, glass);
    });
    surround(p, view, 'east-yard', eastYard);
    p.image(backdrop, 0, 0);
    const arrive = 1 - Math.pow(1 - Math.min(1, t / 3.75), 2),
      carX = 324 - 352 * arrive;
    for (let i = 0; i < 4; i++) p.image(carriage(), carX + i * 126, 69, 126, 57);
    // The first car carries an empty headlamp and a plated cab nose.
    p.poly(
      [carX + 23, 77, carX + 14, 78, carX + 1, 86, carX - 6, 103, carX - 8, 111, carX + 24, 113],
      blue,
      night,
    );
    p.path([carX - 8, 108, carX - 4, 98, carX + 3, 85, carX + 13, 79, carX + 22, 78], '#74808a', 2);
    p.poly([carX + 5, 88, carX + 14, 83, carX + 20, 83, carX + 19, 94, carX, 97], night);
    p.path([carX + 5, 89, carX + 14, 84], glass);
    p.oval(carX - 5, 104, 4, 4, iron);
    p.oval(carX - 5, 104, 2, 2, night);
    p.path([carX - 8, 109, carX - 13, 116, carX + 17, 116, carX + 22, 111], night, 2);
    for (let i = 0; i < 5; i++) {
      const x = carX - 15 + i * 48 - t * 4;
      steam(p, x, 114 + Math.sin(t * 2 + i) * 2, 37 + i * 2, 8, '#657b83', '#829190');
    }
    surround(p, view, 'east-platform', platformNorth);
    p.poly([0, 129, 195, 120, 320, 127, 320, 180, 0, 180], '#63565b');
    p.poly([0, 133, 195, 123, 320, 129, 320, 132, 195, 127, 0, 138], '#c4a47f');
    p.path([0, 157, 160, 132, 296, 133], '#987b6b');
    p.poly([0, 0, 134, 0, 66, 15, 0, 24], night);
    p.path([0, 22, 66, 14, 126, 1], glass, 2);
    steelBeam(p, 14, 21, 154);
    p.path([21, 24, 56, 13, 21, 43], night, 3);
    lamp(p, 67, 94, true);
    const turn = ease(0.62, 1.4, t);
    p.oval(99, 155, 25, 4, '#443e49');
    dog(p, 'clover', 99, 154, 0.82, 1, turn < 0.5 ? 'land' : 'idle', turn, t);
    p.image(ticket(), 114, 129 - Math.round(3 * turn), 15, 9);
    p.poly([0, 175, 35, 162, 62, 164, 77, 180, 0, 180], night);
    p.path([1, 174, 36, 164, 58, 166], iron);
    p.poly([263, 180, 285, 162, 320, 158, 320, 180], night);
    p.path([275, 178, 289, 165, 318, 161], iron);
    // Only the station lamp and the ticket catch the light as the dark windows stop.
    if (t > 2.2 && t < 3.15) {
      const f = Math.sin(((t - 2.2) / 0.95) * Math.PI);
      p.line(117, 126, 117 + 4 * f, 126, c.cream);
      p.line(118, 125 - 2 * f, 118, 127, c.cream);
    }
  }
  window.DispatchFilms.ending = (p, part, t, view) => {
    if (part === 1) return t < 4.1 ? desk(p, t, view) : lastTrain(p, t - 4.1, view);
    if (t < 2.55) return platformFloor(p, t, view);
    if (t < 4.38) return underBell(p, t - 2.55, view);
    swingingBell(p, t - 4.38, view);
  };
})();
