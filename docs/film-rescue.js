/* Parcel Alley and the approach to Sorting Bridge, on the native 320 × 180 film canvas. */
(() => {
  'use strict';

  const A = window.DispatchFilmArt;
  const { c, ease, lerp } = A;
  const tau = Math.PI * 2;
  const rad = (degrees) => degrees * Math.PI / 180;
  const limit = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const coat = { '#': '#252337', C: '#795142', c: '#a76c47', O: '#d48a51', l: '#cf9759', L: '#f4c76a', W: '#fff1c7', n: '#77727d' };
  const grid = (str) => str.trim().split(/\s+/);

  function pixels(p, rows, x, y) {
    for (let r = 0; r < rows.length; r++) {
      for (let i = 0; i < rows[r].length;) {
        const at = i, key = rows[r][i++];
        while (rows[r][i] === key) i++;
        if (key !== '.') p.rect(x + at, y + r, i - at, 1, coat[key]);
      }
    }
  }

  // Noodle's original long muzzle and floppy near ear, with separate film cels for speech and blinking.
  const skull = grid(`
    ......######## ....##cOOOOllO## ...#cOOOlllllOOc# ..#ccOOlOOcclllOc#
    .#ccOOOcCCcOOllOO# .#cOOOOcCCcOOllOO# .#ccOOOcccOOOllllO# .#ccOOOlllOOOllllll###
    ..#ccOlllllllllllLLLll#### ..#ccOllllLLLllllLLLLLlLLl## ...#cOllLLLLLLLLLLLLLLLLLll#
    ...#cOllLLLLLLLLLLLLLLLLLl# ....#clLLLLLLLLLLLLLLLLll# ....#clllLLLLlllllll####
    .....#ccllllllll#### ......##cccllll## ........#######
  `);
  const floppy = grid(`
    .....##### ...##cOOOc# ..#ccOOcCc# .#cOOcCCcc# .#ccOcCCcc# .#ccOcCCc#
    #cccOCCcc# #cccCCccC# #ccOCCccC# #ccOcCcc# #cOccCcc# #cOccCc# #cOcCcC# #cOcCc# #cOcCc# #cOcc# .#ccC# ..###
  `);
  const eyes = [grid(`.###. ##..#. .#WW#. .#W##. ..###.`), grid(`.##. #WW# .#W# ..##`)];
  const nose = grid(`.#### #nn### .####. ..#...`);
  const smile = grid(`...c.c........#. ....c......###.. .......####..... ..#####.........`);

  function head(blink, talking) {
    return A.plate('dispatch-film-noodle-face-' + (+blink) + (+talking), 34, 23, (p) => {
      pixels(p, skull, 1, 2);
      if (blink) {
        p.path([9, 7, 11, 8, 14, 7], coat['#']);
        p.line(17, 7, 20, 8, coat['#']);
      } else {
        pixels(p, eyes[0], 9, 5);
        pixels(p, eyes[1], 16, 5);
      }
      pixels(p, nose, 25, 9);
      if (talking) {
        p.poly([15, 14, 23, 14, 27, 12, 25, 16, 21, 18, 18, 18], coat['#']);
        p.line(19, 16, 22, 16, c.coral);
        p.rect(24, 14, 2, 1, coat.W);
      } else pixels(p, smile, 13, 12);
    });
  }

  const earPlate = () => A.plate('dispatch-film-noodle-near-ear', 12, 20, (p) => pixels(p, floppy, 0, 0));

  function strand(p, points, radii, fill, outline) {
    const top = [], bottom = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], mag = Math.hypot(dx, dy) || 1;
      const nx = -dy / mag * radii[i], ny = dx / mag * radii[i];
      top.push(Math.round(points[i][0] + nx), Math.round(points[i][1] + ny));
      bottom.unshift(Math.round(points[i][0] - nx), Math.round(points[i][1] - ny));
    }
    p.poly(top.concat(bottom), fill, outline);
  }

  function tag(p, x, y, angle, near) {
    const sn = Math.sin(angle), cs = Math.cos(angle), size = near ? 1.12 : 0.95;
    function xy(a, b) { return [Math.round(x + (a * cs - b * sn) * size), Math.round(y + (a * sn + b * cs) * size)]; }
    const stripe = near ? c.navy : c.red;
    p.line(...xy(0, -1), ...xy(0, 4), c.ink);
    p.poly([...xy(-1, 3), ...xy(2, 3), ...xy(4, 5), ...xy(4, 12), ...xy(-4, 12), ...xy(-4, 5)], near ? c.white : c.wheat, c.ink);
    p.rect(...xy(0, 4), 1, 1, c.ink);
    p.line(...xy(-2, 9), ...xy(3, 9), stripe, 2);
    p.rect(...xy(-2, 6), 2, 1, near ? c.copper : c.white);
  }

  function angled(g, image, x, y, angle, ax, ay) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.rotate(angle);
    g.drawImage(image, -ax, -ay);
    g.restore();
  }

  let noodleSurface, np;
  function noodle(p, x, y, options) {
    if (!noodleSurface) {
      noodleSurface = document.createElement('canvas');
      noodleSurface.width = 128;
      noodleSurface.height = 80;
      np = new A.PixelPen(noodleSurface);
    }
    const { face = 1, size = 1, turn = 0, length = 31, tuck = 0, arch = 0, nod = 0,
      gait = 0, step = 0, point = 0, shake = 0, speak = false, blink = false, tailLift = 0, narrow = 1 } = options;
    const g = np.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, 128, 80);
    g.translate(63, 40);
    const hip = -length * 0.46, chest = length * 0.43;
    const spine = [[hip - 3, 1], [hip + 2, -1 - tuck], [hip * 0.45, -2 - arch], [chest * 0.44, -2 - arch * 0.8], [chest, -2], [chest + 4, -5]];
    function leg(at, offset, front, far) {
      const swing = Math.sin(gait + offset) * step, high = Math.max(0, Math.cos(gait + offset)) * step;
      const endX = at + swing * 7 + (front ? 3 : -1) + (front && !far ? point * 18 : 0);
      const endY = 10 - tuck - high * 7 - (front && !far ? point * 29 : 0);
      const kx = at + (front ? -1 : -3) + swing * 2, ky = 5 - tuck - high * 3;
      strand(np, [[at, 0], [kx, ky], [endX, endY]], [3.4, 2.8, 2.1], far ? coat.C : coat.O, coat['#']);
      np.poly([endX - 2, endY - 2, endX + 1, endY - 2, endX + 4, endY, endX + 4, endY + 1, endX - 2, endY + 1], far ? coat.c : coat.L, coat['#']);
    }
    leg(hip + 5, Math.PI, false, true);
    leg(chest - 4, 0, true, true);
    const tail = [[hip + 2, -1], [hip - 6, -1], [hip - 11, -5 - tailLift], [hip - 15, -10 - tailLift + Math.sin(gait) * 2]];
    strand(np, tail, [3, 3, 2.2, 0.9], coat.O, coat['#']);
    strand(np, spine, [3, 5.8, 6.3, 6.6, 6.8, 4], coat.c, coat['#']);
    const back = spine.slice(1, 5).map(([sx, sy]) => [sx, sy - 3]);
    strand(np, back, [1.4, 2.2, 2.1, 1.4], coat.O);
    np.line(hip + 4, -4 - tuck, hip + 10, -5 - arch, coat.l);
    leg(hip, 0, false, false);
    leg(chest, Math.PI, true, false);
    np.poly([chest - 7, -8, chest + 4, -10, chest + 8, -6, chest + 4, 3, chest - 1, -1, chest - 8, 1], '#70a78c', coat['#']);
    np.path([chest - 5, -6, chest + 2, -7, chest + 5, -8], '#a6ceb0');
    np.path([chest - 8, -4, chest - 12, 1, chest - 8, 0], '#4a7d73', 2);
    const hx = Math.round(chest + 1), hy = Math.round(-9 + nod * 0.09);
    const pitch = rad(nod);
    g.save();
    g.translate(hx, hy);
    // The far ear ends below the jaw so each label stays legible while he turns.
    np.poly([0, -9, 5, -11, 10, -8, 13, -2, 11, 6, 8, 6, 6, -1], coat.C, coat['#']);
    angled(g, head(blink, speak), 0, 0, pitch, 10, 10);
    const swing = shake + Math.sin(gait) * step * 0.23;
    const inertial = -turn * 0.78;
    tag(np, 11, 5, rad(-15) + swing * 0.64 + inertial, false);
    const nearAngle = pitch * 0.28 + swing * 0.34;
    angled(g, earPlate(), -8, -7, nearAngle, 4, 2);
    const tipX = -8 - Math.sin(nearAngle) * 15, tipY = -7 + Math.cos(nearAngle) * 15;
    tag(np, tipX, tipY, 0.17 + swing + inertial, true);
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const target = p.g;
    target.save();
    target.translate(Math.round(x), Math.round(y));
    target.scale(face * size * narrow, size);
    target.rotate(turn);
    target.drawImage(noodleSurface, -63, -40);
    target.restore();
  }

  function label(p, x, y, w) {
    p.poly([x + 2, y, x + w, y, x + w - 1, y + 6, x, y + 6, x, y + 2], c.sand, c.brick);
    p.rect(x + 2, y + 1, 2, 4, c.red);
    p.rect(x + 6, y + 2, w - 8, 1, c.brick);
    p.rect(x + 6, y + 4, 3, 1, c.cream);
  }

  function cageRoom(p) {
    p.rect(0, 0, 320, 180, c.slate);
    p.poly([0, 6, 110, 8, 118, 107, 0, 145], c.navy);
    A.arch(p, -14, 23, 96, 107, c.steel, c.green);
    p.poly([0, 45, 20, 33, 48, 32, 62, 45, 67, 97, 0, 120], c.aqua);
    p.poly([0, 64, 26, 62, 41, 65, 65, 60, 65, 105, 0, 121], c.ice);
    p.path([0, 87, 8, 87, 8, 80, 15, 80, 15, 88, 25, 87, 25, 75, 31, 72, 35, 77, 35, 86, 65, 84], c.teal, 3);
    for (const x of [8, 33, 56]) p.line(x, 32, x + 5, 116, c.green, 3);
    p.line(0, 67, 66, 62, c.green, 3);
    p.poly([74, 17, 136, 13, 147, 121, 90, 135], c.slate);
    for (const y of [36, 56, 76, 96]) p.line(78, y, 128, y - 5, c.navy);
    p.poly([75, 18, 88, 20, 128, 125, 106, 130], '#6b7b85');
    p.rect(113, 33, 6, 64, c.night);
    p.rect(113, 35, 2, 59, c.copper);
    p.line(113, 95, 122, 102, c.ink, 3);
    p.poly([0, 0, 320, 0, 320, 21, 269, 17, 202, 24, 130, 18, 51, 16, 0, 31], c.ink);
    p.path([0, 25, 50, 12, 132, 13, 208, 18, 278, 10, 319, 13], c.plum, 3);
    p.path([9, 0, 28, 16, 54, 0], c.slate, 3);
    p.path([88, 0, 104, 12, 118, 0], c.slate, 3);
    p.path([138, 2, 165, 11, 204, 12, 227, 9], c.copper, 1);
    p.line(88, 13, 88, 24, c.ink, 2);
    A.axle(p, 89, 30, 9);
    p.path([91, 39, 91, 47, 88, 50, 84, 47, 85, 44], c.night, 2);
    p.poly([0, 130, 123, 108, 228, 105, 320, 124, 320, 180, 0, 180], '#575168');
    p.poly([0, 139, 82, 124, 118, 125, 68, 152, 0, 158], '#78828a');
    p.poly([31, 180, 101, 147, 165, 128, 174, 131, 111, 159, 74, 180], '#8d8d8b');
    for (const [x, y, ex, ey] of [[0, 149, 137, 117], [9, 179, 149, 124], [128, 180, 202, 134], [233, 180, 254, 137]]) p.line(x, y, ex, ey, c.navy, 2);
    p.path([0, 162, 70, 158, 162, 156, 260, 155, 319, 158], c.navy);
    p.path([25, 172, 58, 169, 100, 169, 119, 167], c.steel);
    // The cabinet is a dimensional object. Its warm shelves remain visible through the swinging door.
    p.poly([130, 30, 256, 22, 301, 28, 312, 39, 310, 139, 277, 150, 134, 145], c.ink);
    p.poly([139, 42, 271, 39, 270, 135, 139, 139], c.brick);
    p.poly([145, 48, 264, 45, 264, 130, 145, 134], c.ochre);
    p.poly([145, 48, 190, 46, 207, 113, 145, 133], c.sand);
    p.poly([211, 47, 265, 44, 266, 129, 246, 129], c.copper);
    for (const y of [66, 85]) {
      p.line(145, y, 268, y - 3, c.rust);
      p.line(164, y + 1, 164, y + 9, c.copper);
    }
    p.rect(152, 78, 18, 13, c.brick); p.rect(153, 79, 16, 10, c.copper); label(p, 155, 80, 10);
    p.rect(222, 75, 32, 14, c.brick); p.rect(224, 76, 28, 11, c.rust); p.rect(242, 76, 3, 11, c.sand);
    p.poly([198, 54, 214, 53, 215, 62, 198, 64], '#d8ae7d', c.rust);
    p.path([199, 56, 207, 59, 213, 55], c.ochre);
    p.rect(199, 63, 16, 1, c.copper);
    p.line(144, 94, 265, 90, c.brick, 3); p.line(144, 93, 263, 89, c.wheat);
    p.poly([141, 122, 219, 115, 266, 117, 273, 136, 140, 142], c.rust);
    p.path([144, 129, 220, 123, 263, 123], c.ochre);
    p.poly([235, 103, 251, 100, 261, 104, 261, 119, 244, 123, 235, 118], c.brick, c.rust);
    p.poly([236, 104, 251, 102, 260, 105, 245, 108], c.sand);
    p.path([242, 103, 250, 106, 250, 120], c.wheat, 2);
    p.rect(236, 111, 5, 3, c.ochre);
    p.poly([213, 119, 226, 116, 234, 117, 236, 121, 218, 124], c.sand, c.rust);
    p.path([215, 119, 223, 121, 232, 118], c.copper);
    p.poly([273, 38, 308, 34, 308, 134, 273, 145], c.green);
    for (const x of [279, 287, 295, 302]) {p.line(x, 41, x, 135 - (x - 280) * 0.25, c.night, 3);p.line(x + 1, 42, x + 1, 134 - (x - 280) * 0.25, c.slate);}
    p.poly([130, 31, 251, 22, 306, 28, 313, 36, 272, 42, 133, 45], c.slate, c.ink);
    p.path([134, 33, 251, 25, 302, 30], c.steel, 2);
    p.path([136, 42, 270, 38, 306, 34], c.copper);
    p.poly([130, 139, 270, 135, 311, 125, 310, 138, 275, 150, 135, 148], c.slate, c.ink);
    p.path([133, 140, 272, 137, 307, 128], c.steel, 2);
    for (const x of [139, 169, 203, 235, 262]) A.rivet(p, x, 37 - Math.floor((x - 130) / 38));
    A.crate(p, -11, 110, 37, 27); A.crate(p, -8, 93, 28, 19);
    label(p, 0, 96, 13);
    p.poly([260, 180, 279, 162, 302, 156, 320, 153, 320, 180], c.night);
    p.path([272, 178, 286, 166, 313, 159], c.slate, 2);
    p.poly([176, 167, 208, 160, 230, 161, 198, 169], c.navy, c.ink);
    for (let i = 0; i < 6; i++) p.line(181 + i * 5, 166 - i, 195 + i * 5, 167 - i, c.slate);
    p.path([181, 169, 193, 170, 204, 167], c.steel);
  }

  function value(t, keys) {
    for (let i = 1; i < keys.length; i++)
      if (t < keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(keys[i - 1][0], keys[i][0], t));
    return keys[keys.length - 1][1];
  }

  function gate(q) {
    const angle = q * 1.85;
    const x = 273 - 136 * Math.cos(angle);
    return { x, upper: 42 - 7 * Math.sin(angle), lower: 139 - 15 * Math.sin(angle), ratio: Math.cos(angle) };
  }

  function gateIron(p, q) {
    const { x, upper, lower, ratio } = gate(q);
    const rail = (v) => [x, lerp(upper, lower, v), 273, lerp(39, 136, v)];
    // The opening is transparent. The shortened spacing is the swinging door's foreshortening.
    for (const u of [0.18, 0.38, 0.59, 0.80]) {
      const px = lerp(x, 273, u), top = lerp(upper, 39, u), bottom = lerp(lower, 136, u);
      p.line(px, top, px, bottom, c.night, Math.abs(ratio) > 0.34 ? 3 : 2);
      p.line(px + 1, top + 1, px + 1, bottom - 1, ratio > 0 ? c.steel : c.green);
    }
    for (const v of [0.32, 0.76]) {
      const r = rail(v);
      p.line(...r, c.navy, 2);
      p.line(r[0], r[1], r[2], r[3], c.steel);
    }
    for (const v of [0, 0.98]) {
      const r = rail(v);
      p.line(...r, c.ink, 4); p.line(r[0], r[1] + 1, r[2], r[3] + 1, c.green, 2);
      p.line(...r, c.aqua);
    }
    p.line(x, upper, x, lower, c.ink, 5);
    p.line(x + 1, upper + 1, x + 1, lower - 1, c.teal, 3);
    p.line(x + 1, upper + 1, x + 1, lower - 1, c.aqua);
    p.line(273, 39, 273, 137, c.ink, 4);
    for (const y of [50, 108]) {
      p.rect(270, y, 8, 10, c.ink); p.rect(271, y + 1, 5, 7, c.rust);
      p.rect(272, y + 1, 2, 6, c.ochre);
    }
  }

  function latch(p, q, lift) {
    const at = gate(q), x = at.x + 2, y = lerp(at.upper, at.lower, 0.63);
    const w = Math.max(0.45, Math.abs(at.ratio));
    const hx = x - w * (14 * Math.cos(lift * 1.26)), hy = y + 1 - 14 * Math.sin(lift * 1.26);
    p.rect(126, 98, 7, 12, c.ink); p.rect(127, 99, 5, 9, c.rust);
    p.rect(128, 101, 2, 2, c.gold);
    const bolt = Math.round(11 * (1 - ease(0.46, 0.98, lift)) * w);
    p.rect(x - bolt, y + 2, bolt + 4, 4, c.ink); p.rect(x - bolt, y + 2, bolt + 3, 2, c.sand);
    p.rect(x - 3, y - 5, 8, 11, c.ink); p.rect(x - 2, y - 4, 6, 9, c.copper);
    p.rect(x - 2, y - 4, 6, 1, c.wheat); p.rect(x + 2, y + 2, 2, 2, c.rust);
    p.line(x, y, hx, hy, c.ink, 4); p.line(x, y, hx, hy, c.ochre, 2);
    p.line(x - 1, y - 1, hx, hy - 1, c.wheat);
    p.rect(hx - 2, hy - 2, 5, 5, c.ink); p.rect(hx - 1, hy - 1, 3, 3, c.gold);
    p.rect(hx, hy - 1, 1, 1, c.white);
    return [hx, hy];
  }

  function dust(p, t, x, y, width, height, tone, count) {
    for (let i = 0; i < count; i++) {
      const px = x + (i * 19.7 + t * 3.2) % width;
      const py = y + (i * 13.3 + t * (3 + i % 2)) % height;
      if ((i + Math.floor(t * 2)) % 4 !== 1) p.rect(px, py, i % 4 === 0 ? 2 : 1, 1, tone);
    }
  }

  function freeDog(p, t) {
    const x = value(t, [[0, 207], [1.8, 205], [2.6, 203], [3.1, 196], [3.75, 170], [4.28, 149], [4.65, 140], [5.44, 119], [5.82, 114], [6.12, 112], [8, 114]]);
    const y = value(t, [[0, 124], [2.2, 124], [2.77, 119], [3.18, 124], [4.18, 132], [4.68, 129], [5.1, 111], [5.57, 126], [5.82, 140], [6.02, 134], [6.21, 138], [8, 137]]);
    const length = value(t, [[0, 22], [2.7, 24], [3.45, 38], [4.18, 62], [4.61, 50], [4.91, 25], [5.46, 19], [5.84, 29], [6.3, 33]]);
    const turn = tau * ease(4.57, 5.72, t);
    const jolt = ease(5.76, 5.91, t) - ease(5.92, 6.19, t);
    const wriggle = (ease(3.1, 3.7, t) - ease(4.44, 4.78, t)) * Math.sin(t * 13);
    const shake = (ease(6.12, 6.27, t) - ease(6.69, 6.93, t)) * Math.sin(t * 24);
    noodle(p, x, y, {
      face: -1, size: 1.12, turn, length, tuck: 4 * (1 - ease(2.6, 3.35, t)) + 5 * (ease(4.55, 4.93, t) - ease(5.51, 5.8, t)) + 3 * jolt,
      arch: 4 * (1 - ease(2.7, 3.5, t)) + 2.5 * wriggle,
      nod: -7 + 9 * wriggle + 12 * jolt + 6 * shake, gait: t * 8,
      step: 0.65 * (ease(2.8, 3.27, t) - ease(4.5, 4.82, t)), tailLift: 2 + 3 * wriggle,
      shake: 0.11 * Math.sin(t * 4) + 0.8 * shake + 0.22 * wriggle, speak: t > 3.78 && t < 4.63,
      blink: (t > 1.15 && t < 1.28) || (t > 5.63 && t < 5.92) || (t > 7.21 && t < 7.34),
    });
  }

  function parcelRescue(p, t) {
    p.image(A.plate('dispatch-film-parcel-room', 320, 180, cageRoom), 0, 0);
    dust(p, t, 84, 28, 37, 76, c.ice, 7);
    const sheen = Math.round(Math.sin(t * 1.25) * 2);
    p.path([151, 60 + sheen, 158, 59 + sheen, 167, 59 + sheen, 171, 58 + sheen], '#eac28c');
    p.path([228, 66 - sheen, 234, 65 - sheen, 242, 65 - sheen], '#d69261');
    for (let i = 0; i < 6; i++) {
      const x = 16 + 12 * i + Math.sin(t * 1.7 + i) * 3, y = 145 + (i % 3) * 6;
      p.rect(x, y, 4 + (i % 4), 1, i % 2 ? c.steel : '#95a09d');
    }
    const q = ease(2.35, 3.47, t) + 0.028 * Math.sin((t - 3.47) * 11) * (ease(3.47, 3.53, t) - ease(3.56, 4.04, t));
    const lift = 0.28 * ease(0.96, 1.23, t) - 0.25 * ease(1.24, 1.47, t) + 0.97 * ease(1.66, 2.24, t);
    // Light from the open compartment slants farther across the wet floor as the bars move away.
    if (q > 0.02) {
      p.poly([140, 141, 143 + 100 * q, 137, 98 + 31 * q, 155, 91, 155], '#9b8279');
      p.path([104, 154, 123, 150, 139, 149], c.sand);
    }
    const nx = value(t, [[0, 207], [2.65, 204], [4.2, 150], [5.83, 113], [8, 114]]);
    p.oval(nx, t < 3.0 ? 132 : 150, t > 4.71 && t < 5.57 ? 16 : 25, 3, t < 3.0 ? c.brick : c.navy);
    if (t < 3.36) freeDog(p, t);
    const gateCel = Math.round(q * 40);
    const door = A.plate('dispatch-film-parcel-door-' + gateCel, 192, 118, (tile) => {
      tile.g.save();
      tile.g.translate(-129, -28);
      gateIron(tile, gateCel / 40);
      tile.g.restore();
    });
    p.image(door, 129, 28);
    const grip = latch(p, gateCel / 40, lift);
    let px = 0, py = 146, pose = 'idle', phase = 0.2;
    const size = 0.87;
    if (t < 0.78) {
      px = lerp(63, 96, ease(0.02, 0.77, t));
      pose = t < 0.09 ? 'idle' : 'run';
      phase = 0.25;
    } else if (t < 2.35) {
      pose = 'pipCollarTagHold';
      phase = (0.16 + t * 0.63) % 1;
      const wrist = window.DogArt?.pawPoint('pip', pose, phase) || [35, -43];
      px = grip[0] - wrist[0] * size;
      py = grip[1] - wrist[1] * size;
    } else if (t < 3.08) {
      const u = ease(2.35, 3.07, t);
      px = lerp(101, 83, u); py = lerp(132, 147, u) - 6 * Math.sin(Math.PI * u);
      pose = u < 0.6 ? 'jump' : 'fall'; phase = u;
    } else if (t < 3.52) {
      px = 83; py = 147; pose = 'land'; phase = ease(3.08, 3.52, t);
    } else {
      px = 83 - 27 * ease(3.62, 4.5, t) + 10 * ease(5.94, 6.61, t); py = 147;
      pose = t < 4.65 ? 'skid' : t < 5.76 ? 'shield' : t < 6.1 ? 'land' : t > 6.65 && t < 7.56 ? 'win' : 'idle';
      phase = pose === 'skid' ? ease(3.6, 4.66, t) : pose === 'land' ? ease(5.76, 6.1, t) : 0.55;
    }
    p.oval(Math.round(px), 148, 22, 3, c.navy);
    A.dog(p, 'pip', px, py, size, 1, pose, phase, t);
    if (t >= 3.36) freeDog(p, t);
    if (t > 3.72) {
      const u = ease(3.72, 5.92, t), x = 195 - 32 * u + 8 * Math.sin(u * 8), y = lerp(106, 147, u) - Math.sin(u * Math.PI) * 8;
      p.poly([x, y, x + 10, y - (1 - u) * 4, x + 12, y + 2, x + 2, y + 3], c.sand, c.brick);
      p.line(x + 3, y, x + 6, y - (1 - u), c.red);
    }
    if (t > 5.74 && t < 6.06) {
      const u = ease(5.74, 6.06, t);
      p.rect(130 + 6 * u, 148 - Math.sin(Math.PI * u) * 4, 2, 1, c.steel);
      p.rect(92 - 5 * u, 148 - Math.sin(Math.PI * u) * 3, 3, 1, c.sand);
    }
  }

  function morning(p) {
    p.rect(0, 0, 404, 180, '#d18d88');
    p.rect(0, 23, 404, 23, '#e0a08a');
    p.rect(0, 46, 404, 21, c.peach);
    p.rect(0, 66, 404, 29, '#efbf8b');
    p.oval(249, 48, 23, 23, c.wheat);
    p.oval(249, 48, 20, 20, c.cream);
    A.cloudStrip(p, 18, 24, 90, '#c08791', '#e7a693');
    A.cloudStrip(p, 151, 17, 53, '#da9992', '#edb397');
    A.cloudStrip(p, 276, 38, 68, c.peach, '#f1bc93');
    p.path([224, 51, 240, 51, 246, 52, 266, 52], '#f1c395', 2);
    p.rect(237, 55, 37, 1, c.sand);
    p.poly([0, 77, 37, 65, 62, 69, 91, 59, 110, 65, 143, 62, 174, 70, 198, 64, 228, 67, 253, 60, 294, 65, 333, 57, 382, 62, 404, 59, 404, 97, 0, 97], '#ae858b');
    A.city(p, 91, '#927783', '#aa7f85', '#dda587');
    p.rect(312, 75, 92, 20, '#927783');
    for (const [x, y, w] of [[6, 59, 13], [18, 66, 24], [68, 64, 14], [145, 53, 13], [318, 52, 18], [352, 52, 9]]) {
      p.rect(x, y, w, 33, '#8a7583');
      p.rect(x, y, w, 2, '#bc8e88');
      p.rect(x + 3, y + 4, 2, 3, '#d69a83');
    }
    // A water tank and a trio of terraced sorting sheds on the distant embankment.
    p.rect(82, 53, 2, 26, c.violet); p.rect(95, 53, 2, 25, c.violet);
    p.line(83, 60, 95, 72, c.violet); p.line(95, 60, 83, 72, c.violet);
    p.rect(80, 43, 19, 15, c.violet); p.poly([78, 43, 89, 37, 101, 43], c.plum);
    p.rect(81, 46, 15, 2, c.smoke); p.rect(81, 53, 16, 1, c.smoke);
    p.rect(133, 77, 61, 15, c.violet);
    for (let i = 0; i < 3; i++) p.poly([133 + i * 20, 77, 149 + i * 20, 67, 152 + i * 20, 69, 152 + i * 20, 77], c.violet);
    p.rect(0, 94, 404, 4, c.plum);
    p.rect(0, 98, 404, 55, '#7fa69c');
    p.rect(0, 100, 404, 4, '#a9bdac');
    p.rect(0, 105, 404, 13, '#91b1a3');
    p.rect(0, 126, 404, 27, '#6c9993');
    for (const [x, y, w] of [[5, 109, 44], [69, 104, 36], [133, 111, 19], [73, 120, 44], [2, 130, 52], [185, 125, 31], [266, 116, 40], [339, 110, 35]]) {
      p.rect(x, y, w, 1, '#adc3aa'); p.rect(x + 11, y + 2, Math.round(w * 0.35), 1, '#adc3aa');
    }
  }

  const deckY = (x) => 99 - (x - 88) * 0.11;
  function trestle(p) {
    const xs = [94, 151, 213, 283, 367, 419];
    for (let i = 1; i < xs.length; i++) {
      const x = xs[i], y = deckY(x);
      p.poly([x - 5, y + 1, x + 4, y, x + 7, 120, x + 13, 123, x - 11, 123, x - 7, 119], '#686978', c.plum);
      p.poly([x - 5, y + 5, x - 1, y + 4, x + 1, 118, x - 6, 119], '#b18c86');
      p.line(x - 2, y + 15, x + 4, y + 14, '#9b8285');
      p.rect(x - 9, 120, 19, 2, '#657780');
      p.rect(x - 11, 124, 23, 1, '#b2c0a8');
    }
    p.poly([85, deckY(85) - 1, 420, deckY(420) - 1, 420, deckY(420) + 5, 85, deckY(85) + 4], c.navy);
    p.line(85, deckY(85), 419, deckY(419), '#c79784');
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1], mid = (a + b) / 2, rail = deckY(mid) - (i < 2 ? 15 : 21);
      p.path([a, deckY(a) - 2, mid, rail, b, deckY(b) - 2], c.plum, i < 2 ? 2 : 3);
      p.line(a, deckY(a) - 3, mid, rail, '#b58277');
      p.line(mid, rail, mid, deckY(mid) - 3, c.violet, 2);
      p.line(a, deckY(a) - 6, b, deckY(b) - 6, '#a47d79');
    }
    // The far signal gantry silhouettes the destination; its arm and lamp animate separately.
    p.rect(271, 38, 3, 42, c.plum);
    p.path([269, 39, 269, 34, 285, 32, 287, 35, 286, 37, 274, 39], c.navy, 2);
    p.line(273, 50, 282, 39, c.plum);
    p.rect(269, 41, 2, 25, '#bd8e7e');
  }

  function quay(p) {
    p.poly([0, 136, 85, 129, 157, 128, 222, 133, 255, 132, 404, 111, 404, 180, 0, 180], c.navy);
    p.poly([0, 137, 94, 132, 166, 131, 220, 135, 256, 133, 404, 113, 404, 132, 253, 151, 150, 157, 0, 159], '#ad8a7b');
    p.poly([0, 141, 135, 137, 174, 135, 221, 138, 252, 136, 403, 116, 403, 122, 250, 143, 123, 150, 0, 152], '#c8a485');
    p.path([0, 153, 119, 149, 245, 144, 403, 123], '#876c6c', 2);
    for (const x of [21, 54, 90, 127, 166, 208, 252, 301, 352, 388]) {
      const y = x > 230 ? 136 - (x - 230) * 0.13 : 137;
      p.line(x, y + 1, x - 15, y + 13, '#9a7c74');
      p.rect(x - 6, y + 8, 2, 1, c.wheat);
    }
    p.poly([0, 164, 152, 157, 253, 151, 404, 132, 404, 180, 0, 180], '#484a60');
    p.path([0, 161, 151, 154, 254, 148, 402, 129], c.ink, 3);
    p.path([0, 162, 151, 155, 254, 149, 402, 130], c.copper);
    for (const [x, y] of [[19, 167], [84, 166], [151, 161], [212, 157], [270, 151], [333, 143], [386, 137]]) {
      p.rect(x, y, 4, 3, c.night); p.rect(x + 1, y, 2, 1, c.steel);
    }
    // Low piled luggage at the dock balances the route rising toward the right.
    A.crate(p, -19, 119, 34, 25); label(p, -4, 123, 13);
    A.crate(p, 334, 101, 26, 17); p.rect(343, 103, 4, 12, c.sand);
    A.crate(p, 361, 94, 29, 20); label(p, 366, 98, 12);
  }

  function water(p, t, pan) {
    for (let band = 0; band < 10; band++) {
      const y = 103 + band * 3, width = 5 + band * 2;
      const x = 243 - pan * 0.26 + Math.sin(t * 1.5 + band * 2.2) * (3 + band);
      p.rect(x - width, y, width, 1, band % 2 ? c.sand : c.wheat);
      p.rect(x + 3, y + 1, Math.ceil(width * 0.6), 1, '#c2c7a8');
    }
    for (let i = 0; i < 12; i++) {
      const x = 8 + i * 29 - pan * 0.3 + Math.sin(t + i * 2) * 4;
      p.rect(x, 109 + i % 5 * 4, 4 + i % 4, 1, i % 2 ? c.ice : '#aec6ad');
    }
  }

  function sorter(p, t, pan) {
    const wx = 176 + 20 * ease(0, 1.73, t) + 165 * ease(2.91, 5.72, t);
    const sy = Math.round(deckY(wx)), x = wx - pan * 0.53;
    const pose = t < 1.73 ? 'walk' : t < 2.54 ? 'windup' : t < 2.85 ? 'strike' : 'charge';
    const phase = pose === 'windup' ? ease(1.73, 2.54, t) : pose === 'strike' ? ease(2.54, 2.85, t) : 0.3;
    const boxX = 219 - pan * 0.53;
    p.rect(boxX, deckY(219) - 5, 9, 5, c.brick); p.rect(boxX + 1, deckY(219) - 5, 7, 2, c.sand);
    if (t < 5.8) {
      const g = p.g;
      g.save(); g.translate(Math.round(x), sy); g.scale(0.30, 0.30);
      if (window.DispatchActors) window.DispatchActors.draw(g, 'conductor', 0, 0, { face: 1, pose, phase, time: t });
      else { p.rect(-43, -53, 73, 43, c.navy); p.rect(15, -65, 43, 33, c.plum); p.rect(-28, -77, 10, 28, c.slate); p.rect(-30, -15, 13, 15, c.ink); p.rect(18, -15, 12, 15, c.ink); }
      g.restore();
    }
    const signalX = 283 - pan * 0.53;
    p.rect(signalX - 2, 34, 6, 6, c.ink);
    p.rect(signalX, 35, 2, 3, t > 2.54 && t < 3.51 ? c.white : c.red);
    if (t > 2.54 && t < 3.24) {
      const u = ease(2.54, 3.24, t);
      p.rect(boxX - 3 - u * 10, 108 + u * 3, 4 + u * 11, 1, c.cream);
      p.rect(boxX + 6, 109 + u * 4, 4 + u * 12, 1, c.sand);
      if (u < 0.4) {
        p.rect(boxX + 1, sy - 7 - 5 * u, 2, 1, c.white);
        p.rect(boxX + 9 + u * 5, sy - 6, 2, 1, c.wheat);
      }
    }
  }

  function bridgeEscape(p, t) {
    const pan = Math.round(57 * ease(4.45, 7.93, t));
    p.image(A.plate('dispatch-film-canal-dawn', 404, 180, morning), -Math.round(pan * 0.17), 0);
    water(p, t, pan);
    p.image(A.plate('dispatch-film-bridge-truss', 420, 132, trestle), -Math.round(pan * 0.53), 0);
    sorter(p, t, pan);
    p.image(A.plate('dispatch-film-quay', 404, 180, quay), -pan, 0);
    let nx = 149 + 165 * ease(4.28, 7.95, t);
    const tread = ease(4.24, 4.73, t), point = ease(1.39, 1.94, t) - ease(3.68, 4.22, t);
    const attention = ease(2.52, 2.64, t) - ease(2.84, 3.16, t);
    const turn = ease(1.05, 1.42, t), face = turn < 0.5 ? -1 : 1;
    const squeeze = 1 - 0.45 * Math.sin(Math.PI * turn);
    const stride = (t - 4.32) * 12.9;
    const ramp = (x) => 146 - Math.max(0, x - 230) * 0.143;
    const hop = 7 * Math.sin(Math.PI * ease(6.23, 6.75, t));
    const nod = (point * -15) + Math.sin(t * 7) * (t < 1.68 ? 4 : 0) - attention * 6;
    nx += Math.sin(turn * Math.PI) * 3;
    p.oval(Math.round(nx - pan), Math.round(ramp(nx)), Math.round(26 - hop * 0.5), 3, '#826c72');
    noodle(p, nx - pan, ramp(nx) - 12 - hop - Math.abs(Math.sin(stride)) * tread * 2, {
      face, size: 1.1, narrow: squeeze, length: 31 + Math.sin(stride) * tread * 3,
      point, nod, gait: stride, step: tread, arch: tread * Math.cos(stride),
      tuck: hop * 0.42, tailLift: point * 2 + tread * 2,
      shake: Math.sin(t * 6) * 0.15 + attention * 0.9 + Math.sin(stride) * tread * 0.23,
      speak: t < 4.12 && !attention && [1, 2, 4].includes(Math.floor(t * 8) % 7),
      blink: (t > 0.74 && t < 0.85) || (t > 3.49 && t < 3.58),
    });
    const px = 71 + 172 * ease(4.74, 8, t), py = ramp(px);
    const pose = t > 2.54 && t < 3 ? 'ledgeTrump' : t >= 3 && t < 3.36 ? 'land' : t > 4.68 ? 'run' : 'idle';
    const phase = pose === 'ledgeTrump' ? 0.18 + 0.7 * ease(2.54, 3, t) : pose === 'land' ? ease(3, 3.36, t) : 0.3;
    p.oval(Math.round(px - pan), Math.round(py), 20, 3, '#826c72');
    A.dog(p, 'pip', px - pan, py, 0.79, 1, pose, phase, t);
    // The near roof and mooring chain move fastest in the pan.
    const fg = Math.round(pan * 1.22);
    p.poly([-fg, 0, 87 - fg, 0, 76 - fg, 8, 27 - fg, 14, 3 - fg, 28, -fg, 28], c.night);
    p.path([-fg, 20, 25 - fg, 11, 76 - fg, 4], c.slate);
    p.path([4 - fg, 163, 21 - fg, 172, 39 - fg, 176, 60 - fg, 172, 72 - fg, 165], c.night, 2);
    for (const bx of [3, 72, 366]) {
      const sx = bx - fg;
      p.poly([sx - 4, 180, sx - 4, 164, sx - 6, 162, sx - 4, 158, sx + 3, 158, sx + 5, 161, sx + 2, 164, sx + 3, 180], c.night, c.ink);
      p.rect(sx - 3, 159, 6, 2, c.steel);
    }
  }

  let interiorFrame, interiorPen;
  window.DispatchFilms.rescue = function rescue(p, part, time) {
    const t = limit(Number.isFinite(time) ? time : 0, 0, 8);
    if (part === 1) bridgeEscape(p, t);
    else {
      if (!interiorFrame) {
        interiorFrame = document.createElement('canvas');
        interiorFrame.width = 320; interiorFrame.height = 180;
        interiorPen = new A.PixelPen(interiorFrame);
      }
      parcelRescue(interiorPen, t);
      // Pull in on the resisting latch, then widen just in time for the dog to unfold.
      const zoom = 1 + 0.23 * (ease(0.18, 1.53, t) - ease(2.36, 3.61, t)) + 0.22 * ease(6.08, 7.88, t);
      const w = Math.round(320 / zoom), h = Math.round(180 / zoom);
      const sx = Math.round((320 - w) * (t > 5.8 ? 0.17 : 0.37));
      const sy = Math.round((180 - h) * (t > 5.8 ? 0.81 : 0.66));
      p.g.drawImage(interiorFrame, sx, sy, w, h, 0, 0, 320, 180);
    }
  };
})();
