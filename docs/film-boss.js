/* The Last Dispatch · Bell Depot. All shots are drawn at the cartridge's 320 × 180 resolution. */
(() => {
  'use strict';
  const { c, PixelPen, plate, dog, ease, lerp, arch, paw, rivet, steam } = window.DispatchFilmArt;
  const bank = (name, w, h, draw) => plate('boss-film/' + name, w, h, draw);
  const tau = Math.PI * 2;
  const rounded = Math.round;
  const sets = new Map();

  // Each set uses one source pixel per cell. Resizing can enlarge its cached
  // canvas; ordinary playback reuses it while the actors and machinery move.
  function set(p, name, view, paint, dx = 0, dy = 0, sx = 1, sy = 1) {
    const l = Math.floor((view.left - dx) / sx) - 2,
      t = Math.floor((view.top - dy) / sy) - 2;
    const r = Math.ceil((view.right - dx) / sx) + 2,
      b = Math.ceil((view.bottom - dy) / sy) + 2;
    let image = sets.get(name);
    if (!image || image.l > l || image.t > t || image.r < r || image.b < b) {
      const old = image;
      image = {
        l: Math.floor(Math.min(l, old?.l ?? l) / 96) * 96,
        t: Math.floor(Math.min(t, old?.t ?? t) / 96) * 96,
        r: Math.ceil(Math.max(r, old?.r ?? r) / 96) * 96,
        b: Math.ceil(Math.max(b, old?.b ?? b) / 96) * 96,
      };
      const canvas = document.createElement('canvas');
      canvas.width = image.r - image.l;
      canvas.height = image.b - image.t;
      const pen = new PixelPen(canvas);
      pen.g.translate(-image.l, -image.t);
      paint(pen, image);
      image.canvas = canvas;
      sets.set(name, image);
    }
    p.g.save();
    p.g.translate(dx, dy);
    p.g.scale(sx, sy);
    p.image(image.canvas, image.l, image.t);
    p.g.restore();
  }

  function ray(p, x, y, u, v, end, tone, width = 1) {
    const slope = (u - x) / (v - y);
    p.line(x, y, x + (end - y) * slope, end, tone, width);
  }
  function masonry(p, l, t, r, b, light, dark) {
    for (let row = Math.floor(t / 13); row <= Math.ceil(b / 13); row++) {
      const y = row * 13 + 2;
      for (let col = Math.floor(l / 36) - 1; col <= Math.ceil(r / 36); col++) {
        const x = col * 36 + (Math.abs(row) % 2) * 18;
        const pick = Math.abs(col * 31 + row * 19 + col * row * 11) % 13;
        if (pick < 5) {
          p.rect(x + 2, y, 9 + pick * 4, 1, light);
          p.rect(x + 1, y + 1, 1, 2 + (pick % 3), dark);
        }
        if (pick === 7) p.rect(x + 8, y - 3, 7, 1, light);
      }
    }
  }
  function block(p, x, y, w, h, shade, lit) {
    p.poly(
      [x, y + 5, x + w - 12, y - 4, x + w, y, x + w, y + h - 4, x + 11, y + h + 4, x, y + h],
      shade,
      c.ink,
    );
    p.poly([x, y + 5, x + w - 12, y - 4, x + w, y, x + 11, y + 10], lit, c.ink);
    p.line(x + 11, y + 11, x + 11, y + h + 2, c.ink);
    p.path(
      [x + 16, y + 12, x + w - 5, y + 4, x + w - 5, y + h - 8, x + 16, y + h - 1, x + 16, y + 12],
      c.night,
      2,
    );
    p.line(x + 18, y + 13, x + w - 8, y + h - 9, c.night, 3);
  }
  function grate(p, x, y, w, h) {
    p.rect(x, y, w, h, c.night);
    p.rect(x + 2, y + 2, w - 4, h - 4, c.plum);
    for (let j = 4; j < h - 4; j += 4) p.rect(x + 4, y + j, w - 8, 1, c.slate);
    for (const dx of [2, w - 4]) p.rect(x + dx, y + 1, 2, 1, c.steel);
  }
  function clerestory(p, x, y, w, h, warm) {
    arch(p, x, y, w, h, c.night, warm ? '#635d72' : '#516a7c');
    p.poly(
      [x + 5, y + 32, x + w * 0.42, y + 8, x + w * 0.67, y + 7, x + 5, y + h - 11],
      warm ? '#7a6c78' : '#637d87',
    );
    p.path(
      [
        x + 3,
        y + h - 10,
        x + 12,
        y + h - 15,
        x + 18,
        y + h - 13,
        x + w - 13,
        y + h - 21,
        x + w - 5,
        y + h - 19,
      ],
      c.navy,
      3,
    );
    p.rect(x + w * 0.49, y + 6, 3, h - 8, c.night);
    p.rect(x + 2, y + h * 0.57, w - 4, 2, c.night);
    p.rect(x + 2, y + h, w - 3, 2, warm ? '#8d7278' : '#6d7484');
  }
  function hoist(p, x, y, len) {
    p.oval(x, y, 8, 8, c.ink);
    p.oval(x, y, 5, 5, c.rust);
    p.oval(x, y, 2, 2, c.sand);
    p.line(x - 5, y + 4, x - 5, y + len, c.night, 2);
    p.line(x + 5, y + 4, x + 3, y + len, c.slate);
    for (let j = 10; j < len; j += 7) p.rect(x - 4, y + j, 2, 2, c.steel);
    p.poly(
      [x - 7, y + len, x + 6, y + len, x + 4, y + len + 6, x - 2, y + len + 9, x - 7, y + len + 5],
      c.rust,
      c.ink,
    );
    p.path(
      [
        x - 1,
        y + len + 9,
        x - 1,
        y + len + 16,
        x + 4,
        y + len + 19,
        x + 9,
        y + len + 16,
        x + 9,
        y + len + 12,
      ],
      c.slate,
      3,
    );
  }
  function hall(p, b) {
    const { l, t, r, b: bottom } = b;
    p.rect(l, t, r - l, bottom - t, c.navy);
    p.poly([206, t, r, t, r, bottom, 180, 90], c.plum);
    masonry(p, l, t, r, 136, '#485267', '#364052');
    const beam = (x, y) => {
      p.path([x, y, x + 56, y + 26, x + 108, y], c.ink, 4);
      p.line(x + 5, y + 2, x + 56, y + 22, c.slate);
      p.line(x + 55, y + 2, x + 55, y + 23, c.night, 3);
    };
    for (let i = Math.floor((l - 100) / 113); i <= Math.ceil(r / 113); i++) {
      const x = i * 113 - 10;
      p.rect(x + 5, t, 5, 126 - t, c.night);
      p.rect(x + 6, t, 1, 118 - t, '#5c586b');
      for (let y = -188; y < 20; y += 94) {
        beam(x, y);
        p.rect(x, y - 5, 115, 4, c.ink);
      }
      if (x < 0 || x > 320)
        clerestory(p, x + 17, 18 + (Math.abs(i * 7) % 13), 49 + Math.abs(i % 3) * 5, 57, i > 1);
    }
    for (const [x, y, w] of [
      [-222, -121, 74],
      [-55, -166, 105],
      [75, -128, 83],
      [201, -174, 105],
      [368, -109, 74],
      [495, -158, 89],
    ]) {
      clerestory(p, x, y, w, 46, x > 180);
    }
    // This first arched window continues behind the left edge of the old film gate.
    arch(p, -19, 22, 44, 64, c.ink, c.slate);
    p.poly([-12, 46, 2, 28, 19, 30, -12, 77], '#647e8b');
    p.poly([-11, 74, -3, 66, 3, 68, 10, 60, 19, 64, 19, 81, -11, 81], c.navy);
    p.rect(2, 29, 2, 54, c.night);
    p.rect(-16, 57, 38, 2, c.night);
    p.rect(-12, 85, 34, 1, c.steel);
    p.path([-356, -68, -156, -50, 2, -61, 146, -45, 330, -62, 485, -46, 711, -69], c.ink, 3);
    p.path([-185, -58, -183, -35, -131, -27, -99, -32], c.slate, 2);
    hoist(p, 51, -60, 34);
    hoist(p, 428, -54, 41);
    for (const [x, y] of [
      [-191, 70],
      [-69, 84],
      [365, 66],
      [448, 77],
      [574, 83],
    ])
      grate(p, x, y, 25, 17);
    const fy = (x) => (x <= 178 ? 82 + ((178 - x) * 30) / 178 : 82 + ((x - 178) * 7) / 166);
    p.poly([l, fy(l), 178, 82, r, fy(r), r, bottom, l, bottom], '#61515c');
    p.poly(
      [
        158,
        96,
        190,
        94,
        190 + ((53 - 190) * (bottom - 94)) / 90,
        bottom,
        158 - (158 * (bottom - 96)) / 55,
        bottom,
      ],
      '#746268',
    );
    p.poly(
      [
        190,
        102,
        263,
        95,
        263 + ((228 - 263) * (bottom - 95)) / 91,
        bottom,
        190 + ((92 - 190) * (bottom - 102)) / 84,
        bottom,
      ],
      '#795e59',
    );
    for (const [x, y, u, v] of [
      [175, 90, -17, 166],
      [187, 91, 38, 185],
      [196, 93, 69, 185],
      [241, 96, 231, 186],
      [265, 95, 338, 184],
      [110, 97, -157, 156],
      [310, 100, 525, 162],
    ]) {
      ray(p, x, y, u, v, bottom, c.night, 2);
      ray(p, x, y - 1, u, v - 1, bottom, '#9e7b6c');
    }
    for (let y = 205; y < bottom; y = Math.round(y * 1.44)) {
      p.path([l, y + 25, 32, y + 11, 173, y - 3, 286, y - 2, r, y + 13], '#564c58');
      for (let x = l + 8; x < r; x += 48) p.rect(x, y + Math.round((x - 130) * 0.025), 5, 1, '#88716b');
    }
    block(p, -148, 104, 50, 37, c.plum, '#807079');
    block(p, -116, 92, 33, 26, c.plum, '#8d7676');
    block(p, 402, 105, 48, 29, c.plum, '#876e72');
    block(p, 442, 97, 34, 30, c.plum, '#7e6973');
    for (const [x, y] of [
      [-102, 186],
      [412, 159],
      [201, 246],
      [-216, 228],
    ]) {
      p.poly([x, y, x + 13, y - 4, x + 23, y - 3, x + 10, y + 2], c.smoke, c.plum);
      p.path([x + 2, y, x + 10, y - 1, x + 13, y - 3], c.violet);
    }
  }

  function threshold(p, b) {
    const { l, t, r, b: bottom } = b;
    p.rect(l, t, r - l, bottom - t, '#454955');
    p.rect(l, t, r - l, Math.max(0, -108 - t), '#39465b');
    for (let i = Math.floor(l / 88) - 1; i <= Math.ceil(r / 88); i++) {
      const x = i * 88 + 23;
      for (let j = Math.floor(t / 60); j < -1; j++) {
        if ((i + j) % 3 !== 0) p.rect(x + (Math.abs(j) % 3) * 9, j * 60 + 12, 1, 1, c.steel);
      }
    }
    p.poly([l, -65, 64, -143, 228, -150, r, -59, r, 190, l, 190], '#5c505e', c.night);
    p.path([l, -67, 64, -146, 228, -153, r, -61], c.night, 5);
    p.poly([-113, -110, -112, -154, -105, -159, -94, -157, -93, -112], c.plum, c.night);
    p.rect(-116, -160, 26, 5, c.night);
    p.rect(-112, -159, 17, 1, c.slate);
    p.poly([112, -114, 122, -128, 195, -131, 209, -116, 205, -91, 115, -87], c.night);
    p.poly([118, -113, 126, -122, 192, -125, 201, -115, 199, -96, 119, -92], c.plum);
    for (let j = 0; j < 3; j++) p.path([125, -111 + j * 6, 192, -114 + j * 6], c.slate, 2);
    p.path([l, -63, 67, -140, 225, -146, r, -57], '#7b6974', 2);
    p.rect(l, -51, r - l, 226, '#6a535d');
    masonry(p, l, -53, r, 180, '#896569', '#5e4d5a');
    for (const [x, y, h] of [
      [-220, -60, 194],
      [-70, -71, 235],
      [374, -65, 234],
      [527, -60, 218],
    ]) {
      p.rect(x, y, 13, h, c.plum);
      p.rect(x + 3, y, 2, h, '#927579');
      for (let yy = y + 12; yy < y + h; yy += 48) p.rect(x - 2, yy, 18, 5, c.night);
    }
    for (const [x, y, w] of [
      [-278, -26, 45],
      [-153, -24, 56],
      [414, -31, 49],
      [549, -24, 55],
    ])
      clerestory(p, x, y, w, 58, true);
    // Iron running rail, return pockets and the two door rollers above the opening.
    p.rect(-164, -14, 648, 11, c.ink);
    p.rect(-162, -12, 644, 3, c.slate);
    p.rect(-157, -10, 637, 1, c.steel);
    p.rect(-5, -4, 331, 5, c.ink);
    for (let x = -156; x < 482; x += 38) rivet(p, x, -9);
    p.rect(-9, -3, 9, 183, c.night);
    p.rect(-4, -3, 3, 184, c.steel);
    p.rect(323, -3, 9, 183, c.night);
    p.rect(323, -2, 2, 183, c.steel);
    p.poly([83, -76, 222, -79, 234, -68, 229, -39, 223, -32, 86, -29, 77, -39, 77, -64], c.ink);
    p.poly([84, -70, 221, -73, 228, -66, 224, -39, 85, -35, 82, -39], c.rust);
    p.path([87, -67, 218, -70, 224, -66], c.sand, 2);
    p.poly([135, -59, 177, -59, 177, -43, 135, -42], c.ochre, c.brick);
    p.path([136, -58, 156, -48, 176, -58], c.wheat, 2);
    for (const side of [-1, 1])
      for (let j = 0; j < 3; j++)
        p.path(
          [
            156 + side * 24,
            -54 + j * 3,
            156 + side * (43 - j * 4),
            -61 + j * 4,
            156 + side * (52 - j * 5),
            -67 + j * 5,
          ],
          c.ochre,
          2,
        );
    p.rect(l, 180, r - l, bottom - 180, '#554f5d');
    p.poly([l, 189, 76, 187, 321, 186, r, 191, r, 209, l, 213], '#6b6068');
    p.rect(-165, 181, 646, 3, c.ink);
    p.rect(-162, 182, 639, 1, c.rust);
    for (const x of [-220, -65, 38, 168, 305, 442, 645]) {
      p.line(x, 190, 160 + ((x - 160) * (bottom + 100)) / 290, bottom, '#443f51', 2);
    }
    for (let y = 224; y < bottom; y = Math.round(y * 1.32)) p.line(l, y + 5, r, y - 5, '#453f51', 2);
    for (const [x, y] of [
      [-92, 151],
      [367, 152],
      [503, 188],
    ])
      block(p, x, y, 30, 22, c.plum, '#917875');
    // From outside, the warehouse and its workers are visible only through the doorway.
    p.g.clearRect(0, 0, 323, 180);
  }

  function shop(p, b, kind) {
    const { l, t, r, b: bottom } = b,
      stamp = kind === 'press',
      lamp = kind === 'lamp';
    p.rect(l, t, r - l, bottom - t, stamp ? c.night : c.navy);
    if (stamp) p.poly([l, t, 147, t, 159, 0, 126, 92, l, 126], c.navy);
    if (stamp) p.poly([163, 0, 147, t, r, t, r, 124, 151, 100], '#624958');
    if (!stamp && !lamp) p.poly([189, 0, 205, t, r, t, r, bottom, 105, bottom, 125, 106], c.night);
    masonry(p, l, t, r, 132, stamp ? '#514958' : '#454e63', '#3b3d51');
    for (const [x, y, w, h] of [
      [-270, -49, 67, 111],
      [-159, -41, 72, 104],
      [-42, -125, 61, 65],
      [67, -123, 67, 60],
      [329, -75, 65, 100],
      [431, -42, 87, 108],
      [572, -33, 57, 90],
    ]) {
      clerestory(p, x, y, w, h, stamp && x > 150);
    }
    p.rect(l, -168, r - l, 6, c.night);
    p.rect(l, -167, r - l, 1, c.slate);
    for (let x = Math.floor(l / 170) * 170; x < r; x += 170) {
      p.path([x - 9, -167, x + 52, -111, x + 117, -167], c.night, 4);
      p.line(x, -164, x + 52, -115, c.slate);
      p.line(x + 53, -166, x + 53, -113, c.night, 3);
      p.rect(x - 8, t, 5, Math.max(0, -169 - t), c.night);
      if (t < -184) {
        p.path([x - 7, -191, x + 61, -230, x + 158, -194], c.night, 3);
        p.path([x + 3, -199, x + 63, -233, x + 148, -201], c.slate);
      }
    }
    p.path([l, -80, -94, -60, 6, -68, 79, -61, 206, -82, 360, -63, r, -79], c.night, 3);
    for (const x of [-179, 411]) hoist(p, x, -68, 37);
    const floor = lamp ? 235 : stamp ? 215 : 201;
    p.poly(
      [l, floor + 21, 177, floor - 14, r, floor + 8, r, bottom, l, bottom],
      stamp ? '#544b59' : '#514956',
    );
    for (const x of [-269, -130, 10, 81, 188, 280, 357, 511, 625])
      ray(p, 166, floor - 28, x, floor + 21, bottom, '#494450', 2);
    for (let y = floor + 47; y < bottom; y = Math.round(y * 1.3)) p.line(l, y + 14, r, y - 2, '#635560');
    for (const [x, y] of [
      [-185, floor - 22],
      [468, floor - 27],
      [530, floor - 19],
    ])
      block(p, x, y, 48, 29, c.plum, '#786873');
  }
  function leg(p, x, y, kx, ky, foot, fy) {
    rod(p, x, y, kx, ky, 12, c.brick, c.copper);
    pin(p, x, y, 9);
    rod(p, kx, ky, foot, fy - 10, 7, c.slate, c.ice);
    rod(p, kx, ky, lerp(kx, foot, 0.54), lerp(ky, fy - 10, 0.54), 10, c.navy, c.steel);
    pin(p, kx, ky, 7);
    p.poly(
      [
        foot - 27,
        fy - 3,
        foot - 17,
        fy - 15,
        foot - 3,
        fy - 19,
        foot + 8,
        fy - 16,
        foot + 15,
        fy - 5,
        foot + 13,
        fy + 2,
        foot - 28,
        fy + 4,
      ],
      c.slate,
      c.ink,
    );
    p.path([foot - 25, fy - 2, foot - 15, fy - 12, foot - 2, fy - 15], c.steel, 3);
    for (const dx of [-14, -5, 4]) p.line(foot + dx, fy - 4, foot + dx - 3, fy + 1, c.night, 2);
  }
  function pressRoom(p, b) {
    shop(p, b, 'press');
    p.poly([-285, 56, 98, 0, 112, 0, -13, 87, -285, 144], '#4b6573');
    p.poly([-192, 114, 78, 9, 69, 25, -192, 148], '#637c81');
    p.path([-212, 142, -126, 137, -53, 104, -7, 91, 33, 68], c.ink, 6);
    p.path([-212, 141, -127, 136, -54, 103, -7, 90, 34, 68], c.steel, 2);
    for (const x of [12, 90, 204, 306]) {
      p.rect(x, -85, 5, 179, c.ink);
      p.rect(x + 1, -82, 1, 157, '#5c5768');
    }
    // The return belt travels along the lower face of the cast-iron table.
    const left = -191,
      right = 534;
    p.poly([left, 150, right, 77, right + 2, 132, left + 13, 232], c.navy, c.ink);
    for (const [x, y, h] of [
      [-145, 206, 65],
      [22, 185, 75],
      [234, 158, 71],
      [471, 127, 66],
    ]) {
      p.poly([x, y, x + 17, y - 2, x + 13, y + h, x + 4, y + h + 4, x - 1, y + h], c.night, c.ink);
      p.line(x + 4, y + 2, x + 5, y + h - 4, c.slate, 3);
      p.poly(
        [x - 7, y + h + 1, x + 13, y + h - 2, x + 24, y + h + 4, x + 4, y + h + 8, x - 8, y + h + 6],
        c.slate,
        c.ink,
      );
    }
    p.poly([left, 112, 494, 54, right, 58, right, 81, left, 148], c.ink);
    p.poly([left, 114, 494, 56, right - 4, 61, right - 2, 67, left, 134], c.brick);
    p.line(left, 114, right - 1, 55, c.copper, 2);
    p.poly([left, 147, right, 78, right + 2, 107, left, 198], '#778687', c.ink);
    p.poly([left, 159, right, 91, right + 2, 103, left, 192], '#a29180');
    p.path([left, 196, 0, 173, 319, 136, right, 110], c.ink, 3);
    p.path([left, 201, 0, 177, 319, 140, right, 114], c.copper, 2);
    p.poly([left, 202, 0, 178, 320, 139, right, 113, right, 126, 320, 162, left, 222], c.navy);
    for (const [x, y] of [
      [-183, 195],
      [-89, 186],
      [400, 128],
      [522, 112],
    ])
      wheel(p, x, y, 9, 0.7, c.steel);
    p.poly([left, 202, 0, 178, 320, 139, right, 113, right, 172, left + 12, 248, left, 240], c.navy);
    p.path([left + 12, 248, -86, 236, 205, 208, 421, 186, right - 1, 172], c.ink, 3);
    p.path([left + 12, 245, -87, 233, 205, 205, 421, 183, right - 1, 169], c.slate);
    for (const [x, y] of [
      [-92, 211],
      [76, 208],
      [215, 190],
      [395, 168],
    ]) {
      p.rect(x, y, 8, 1, c.slate);
      p.rect(x + 2, y + 3, 4, 1, c.night);
    }
    // The die guides rejoin the press overhead at the flywheel's bearing.
    p.poly(
      [209, 64, 209, -42, 223, -74, 255, -84, 290, -77, 305, -54, 302, 0, 297, 82, 268, 104, 242, 91],
      c.ink,
    );
    p.poly([215, 57, 215, -37, 230, -68, 255, -77, 282, -70, 296, -51, 287, 0, 285, 64, 264, 84], c.rust);
    p.poly([225, 0, 227, -42, 242, -65, 263, -71, 269, -53, 267, 0, 253, 10, 241, 42, 218, 50], c.copper);
    p.path([233, -42, 246, -63, 266, -67, 276, -61], c.sand, 3);
    p.poly([125, 0, 125, -48, 133, -59, 174, -61, 184, -52, 183, 0], c.ink);
    p.poly([128, 0, 129, -47, 136, -54, 170, -56, 178, -50, 178, 0], c.rust);
    p.rect(138, -86, 10, 38, c.ink);
    p.rect(140, -84, 4, 36, c.steel);
    p.rect(164, -86, 8, 36, c.ink);
    p.rect(166, -83, 3, 33, c.steel);
    rod(p, 135, -83, 240, -103, 7, c.brick, c.copper);
    pin(p, 144, -85, 5);
    wheel(p, 249, -99, 26, 1.05, c.copper);
    p.path([248, -127, 286, -146, 334, -151], c.night, 4);
    p.path([269, -84, 307, -105, 351, -117], c.night, 4);
    pin(p, 249, -99, 7);
    for (let i = 0; i < 4; i++) smallMail(p, -147 + i * 11, 144 - i * 2);
    grate(p, 377, 144, 40, 21);
  }
  function boilerRoom(p, b) {
    shop(p, b, 'boiler');
    p.poly([b.l, 126 - b.l * 0.16, 125, 106, 145, 86, 135, 197, 24, 204, b.l, 224], c.night);
    for (const x of [-31, 34, 105]) {
      p.line(x - 37, -33, x + 46, 41, c.slate, 3);
      p.line(x + 46, 41, x + 92, -30, c.ink, 3);
    }
    p.oval(233, 272, 155, 14, '#443f4d');
    // The bell belongs to the Hound's barrel. Its folded rear leg and tail
    // continue around the curved housing and share its copper highlights.
    leg(p, 202, 157, 184, 196, 206, 254);
    leg(p, 344, 153, 371, 184, 350, 246);
    rod(p, 370, 80, 419, 44, 13, c.brick, c.copper);
    rod(p, 419, 44, 445, 4, 8, c.rust, c.ochre);
    pin(p, 416, 45, 8);
    pin(p, 447, 5, 6);
    p.poly(
      [
        296, 7, 320, 19, 353, 29, 374, 47, 385, 66, 392, 98, 383, 139, 361, 163, 327, 182, 271, 187, 189, 184,
        83, 183, 101, 153, 148, 99,
      ],
      c.ink,
    );
    p.poly(
      [
        300, 14, 320, 26, 348, 35, 369, 52, 380, 72, 384, 103, 374, 134, 351, 155, 308, 170, 253, 176, 198,
        179, 161, 181, 129, 151, 149, 98,
      ],
      c.rust,
    );
    p.poly(
      [
        291, 25, 320, 34, 344, 43, 359, 59, 369, 84, 369, 99, 348, 119, 334, 124, 320, 117, 299, 147, 280,
        157, 273, 138, 290, 102,
      ],
      c.brick,
    );
    p.path([294, 123, 315, 103, 327, 86, 333, 65], c.ink, 7);
    p.path([294, 120, 315, 101, 325, 86, 330, 67], c.ochre, 3);
    p.path([306, 145, 341, 132, 365, 109, 376, 85], c.ink, 4);
    p.path([309, 141, 338, 130, 358, 112], c.copper, 2);
    p.poly([91, 180, 105, 148, 145, 138, 162, 149, 145, 181, 121, 200, 103, 201], c.ink);
    p.poly([116, 180, 131, 153, 151, 146, 160, 150, 145, 180, 129, 191, 111, 194], c.slate);
    leg(p, 140, 184, 132, 218, 108, 269);
    leg(p, 326, 178, 300, 210, 324, 265);
    for (const [x, y] of [
      [335, 45],
      [369, 79],
      [340, 143],
      [206, 185],
    ])
      rivet(p, x, y);
  }
  function lampRoom(p, b) {
    shop(p, b, 'lamp');
    arch(p, -18, 9, 95, 107, c.night, '#5e7781');
    p.path([-140, 157, 0, 128, 128, 99, 223, 103, 320, 131, 443, 163], c.night, 5);
    p.oval(299, 290, 143, 13, '#433f4e');
    leg(p, 255, 175, 242, 219, 257, 273);
    leg(p, 379, 169, 405, 216, 390, 271);
    p.poly(
      [
        169, 180, 174, 110, 188, 87, 197, 43, 215, 26, 236, 17, 260, 18, 272, 11, 306, 11, 320, 19, 354, 25,
        390, 47, 405, 73, 415, 111, 410, 145, 389, 169, 359, 188, 306, 198, 246, 202, 192, 198,
      ],
      c.ink,
    );
    p.poly(
      [
        174, 179, 180, 108, 195, 87, 203, 47, 218, 31, 240, 22, 262, 22, 274, 17, 306, 17, 320, 24, 349, 30,
        384, 51, 399, 78, 406, 111, 403, 139, 381, 164, 353, 181, 306, 190, 243, 195, 192, 191,
      ],
      c.brick,
    );
    p.poly(
      [
        277, 57, 292, 42, 317, 41, 343, 45, 365, 59, 383, 85, 378, 104, 343, 120, 315, 119, 281, 131, 263,
        114,
      ],
      c.rust,
    );
    p.path([312, 156, 349, 143, 375, 123, 387, 96], c.ink, 4);
    p.path([316, 151, 348, 139, 370, 123], c.copper, 2);
    p.poly([283, 5, 284, -40, 279, -47, 281, -57, 299, -60, 308, -55, 307, -47, 301, -42, 299, 12], c.ink);
    p.poly([287, 2, 287, -42, 298, -45, 296, 4], c.steel);
    p.path([289, -40, 294, -42, 293, -9], c.ice, 2);
    p.poly([280, -55, 297, -58, 305, -54, 304, -49, 285, -46, 280, -48], c.rust, c.ink);
    p.path([283, -53, 297, -56, 302, -54], c.gold, 2);
    rod(p, 365, 99, 393, 55, 16, c.brick, c.copper);
    p.image(houndFace(), 345, -19, 142, 121);
    p.rect(423, 29, 5, 2, c.wheat);
    leg(p, 200, 185, 182, 224, 191, 290);
    leg(p, 339, 186, 318, 222, 340, 287);
    p.poly([169, 178, 244, 178, 250, 183, 246, 191, 223, 195, 197, 192, 178, 188, 171, 184], c.ink);
    p.path([181, 186, 203, 190, 226, 191, 242, 188], c.rust, 2);
    p.path([157, 136, 176, 126, 196, 130, 203, 149, 203, 185, 197, 196], c.slate, 3);
    for (const [x, y] of [
      [334, 37],
      [375, 66],
      [370, 119],
      [280, 181],
    ])
      rivet(p, x, y);
    // Noodle leans out of the left foreground. The long low back and his
    // planted hind paw carry the same weight as the pointing foreleg.
    p.oval(-35, 244, 133, 10, '#494251');
    p.poly(
      [
        -103, 158, -156, 147, -182, 128, -194, 105, -195, 94, -191, 92, -185, 104, -168, 122, -140, 132, -92,
        140,
      ],
      '#99613e',
      c.ink,
    );
    p.path([-188, 101, -178, 119, -158, 134, -135, 141], '#c2864d', 3);
    p.poly(
      [
        -115, 169, -105, 145, -84, 136, -56, 137, -22, 147, 1, 148, 29, 147, 42, 126, 74, 118, 102, 128, 120,
        149, 130, 177, 132, 188, 119, 207, 93, 217, 58, 217, 34, 210, 7, 206, -35, 207, -70, 202, -99, 195,
      ],
      '#a66944',
      c.ink,
    );
    p.poly(
      [
        -105, 158, -82, 143, -55, 145, -27, 154, -3, 154, 27, 149, 18, 167, -12, 174, -46, 177, -80, 172,
        -101, 178,
      ],
      '#bc7c48',
    );
    p.path([-95, 151, -78, 145, -56, 146, -36, 151], '#d39754', 3);
    p.poly([54, 161, 87, 150, 107, 168, 108, 190, 99, 205, 79, 211, 60, 206, 49, 191], '#d9a45e');
    p.poly([52, 179, 106, 179, 108, 188, 99, 204, 80, 209, 62, 206, 51, 195], '#d9a45e');
    p.poly(
      [
        -99, 176, -72, 179, -67, 195, -80, 212, -96, 224, -94, 233, -83, 235, -82, 241, -105, 242, -113, 234,
        -112, 218, -106, 194,
      ],
      '#955c3c',
      c.ink,
    );
    p.poly([-105, 237, -98, 231, -91, 229, -79, 231, -70, 237, -72, 242, -102, 244], '#c58b51', c.ink);
    p.poly(
      [48, 199, 66, 201, 73, 211, 69, 227, 80, 230, 88, 236, 85, 242, 51, 242, 43, 236, 46, 227, 45, 215],
      '#a56944',
      c.ink,
    );
    p.poly([49, 235, 60, 229, 67, 229, 74, 233, 80, 233, 85, 238, 80, 241, 52, 242], '#d49b58');
    p.path([62, 238, 65, 234, 68, 234], '#8e603f', 2);
  }

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
  function outside(p, v, draw) {
    p.g.save();
    p.g.beginPath();
    p.g.rect(
      Math.floor(v.left) - 1,
      Math.floor(v.top) - 1,
      Math.ceil(v.right - v.left) + 3,
      Math.ceil(v.bottom - v.top) + 3,
    );
    p.g.rect(0, 0, 320, 180);
    p.g.clip('evenodd');
    draw();
    p.g.restore();
  }
  function foreground(pen, shot) {
    const art = bank('cargo-foreground/' + shot, 504, 84, (p) => {
      p.g.translate(96, -150);
      const tips = { entry: [170, 41], bell: [159, 43], lamp: [172, 42], hall: [163, 51] };
      const [rise, tip] = tips[shot];
      p.poly(
        [
          -94,
          rise + 21,
          -72,
          rise + 5,
          -27,
          rise - 6,
          0,
          rise,
          16,
          rise - 3,
          tip,
          180,
          tip + 6,
          203,
          tip - 8,
          219,
          -75,
          229,
          -94,
          219,
        ],
        c.ink,
      );
      p.poly(
        [-86, rise + 21, -69, rise + 8, -27, rise - 2, -7, rise + 2, -14, rise + 11, -53, rise + 17],
        '#424050',
      );
      p.path([-84, 201, -53, 207, tip + 3, 194], c.night, 3);
      p.path([-60, 221, -61, 209, -53, 204, -48, 206, -47, 217], c.plum, 2);
      if (shot === 'entry' || shot === 'hall') {
        const tip = shot === 'entry' ? 288 : 267;
        p.poly(
          [
            tip,
            180,
            tip + 19,
            165,
            305,
            162,
            320,
            165,
            356,
            156,
            384,
            162,
            401,
            180,
            396,
            200,
            301,
            219,
            tip - 9,
            209,
          ],
          c.ink,
        );
        p.poly([320, 165, 355, 160, 381, 165, 392, 172, 357, 169, 326, 175], c.night);
        p.path([tip - 5, 200, 304, 207, 394, 190], c.navy, 2);
      }
      p.g.clearRect(0, 0, 320, 180);
    });
    pen.image(art, -96, 150);
  }
  function reveal(p, t, view) {
    const glide = ease(0.55, 2.45, t);
    if (view) set(p, 'hall', view, hall, -rounded(glide * 7), -1);
    p.image(warehouse(), -rounded(glide * 7), -1);
    track(p, t);
    smallMail(p, 125 + ((t * 12) % 38), 124 - ((t * 12) % 38) * 0.13);
    machine(p, 225 - rounded(glide * 5), 132, 0.81, 'idle', 0.2, t + 1);
    dog(p, 'pip', 65 + rounded(glide * 2), 157, 0.56, 1, 'idle', 0.2, t);
    dog(p, 'noodle', 99 + rounded(glide * 2), 161, 0.55, 1, 'idle', 0.5, t + 0.3);
    // A real latch retracts before the two heavy door leaves can part.
    const open = rounded(158 * ease(0.48, 2.22, t)),
      bolt = rounded(28 * ease(0.23, 0.62, t));
    if (view) {
      set(p, 'depot-entry', view, threshold);
      for (const xx of [17 - open, 135 - open, 185 + open, 299 + open]) {
        p.rect(xx - 3, -7, 6, 7, c.ink);
        p.oval(xx, -8, 4, 4, c.ink);
        p.oval(xx, -8, 2, 2, c.rust);
      }
      p.rect(2 - open, 180, 158, 2, c.ink);
      p.rect(163 + open, 180, 157, 2, c.ink);
    }
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
    if (view) foreground(p, 'entry');
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
  function pressShot(p, t, jam, view) {
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
    if (view) {
      set(p, 'press', view, pressRoom);
      wheel(p, 249, -99, 26, gearTime * 0.58, c.copper);
      pin(p, 249, -99, 7);
      const first = -16 + (Math.floor(gearTime * 4) % 22);
      for (let i = -8; i < 25; i++) {
        if (i >= 0 && i < 16) continue;
        const x = first + i * 22,
          y = 126 - x * 0.093;
        if (x >= -188 && x < 529) p.line(x, y, x + 20, y + 25, '#677578', 2);
      }
    }
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
  function listening(p, t, view) {
    if (view) set(p, 'boiler', view, boilerRoom);
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
    if (view) foreground(p, 'bell');
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
  function instruction(p, t, view) {
    if (view) set(p, 'lamp', view, lampRoom);
    p.image(lampHousing(), 0, 0);
    lampLens(p, 251, 71, 20, false);
    const lift = ease(0.29, 1.1, t),
      settle = ease(1.34, 2.63, t);
    // The muzzle and leading paw share their sight line with the receiver glass.
    const x = -2 + rounded(3 * lift),
      y = 12 - rounded(3 * lift) + rounded(settle);
    if (view) {
      // The old bust has a closed lower edge beyond the camera. Its painted
      // chest meets the full-length dachshund at the original sight line.
      p.g.drawImage(noodleTorso(), 0, 0, 142, 75, -3, 105, 142, 75);
    } else p.image(noodleTorso(), -3, 105, 142, 84);
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
    if (view) foreground(p, 'lamp');
  }
  function faceOff(p, t, view) {
    const enter = ease(5.7, 7.12, t);
    if (view) set(p, 'hall', view, hall, -21, -11, 350 / 344, 197 / 186);
    p.image(warehouse(), -21, -11, 350, 197);
    if (view)
      outside(p, view, () => {
        p.poly(
          [-192, 186, 0, 152, 186, 118, 320, 116, 464, 102, 467, 109, 320, 124, 123, 151, 0, 177, -192, 218],
          '#816665',
        );
        p.path([-192, 196, 0, 161, 152, 134, 319, 116, 464, 101], c.ink, 4);
        p.path([-192, 195, 0, 160, 153, 133, 319, 116, 464, 101], c.sand);
      });
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
    if (view) foreground(p, 'hall');
  }
  let jamCamera;
  function jamCloseup(p, t, view) {
    if (!jamCamera) {
      const canvas = bank('jam-camera', 320, 180, () => {});
      jamCamera = { canvas, pen: new PixelPen(canvas) };
    }
    pressShot(jamCamera.pen, t, true);
    // Push toward the coupling as it sticks. Scaling the finished cel preserves native ink edges.
    const advance = rounded(9 * ease(3.78, 4.92, t));
    if (view) {
      const dx = -32 - advance,
        dy = -8 - rounded(advance * 0.4),
        sx = (358 + advance) / 320,
        sy = (202 + rounded(advance * 0.56)) / 180;
      const local = {
        left: (view.left - dx) / sx,
        top: (view.top - dy) / sy,
        right: (view.right - dx) / sx,
        bottom: (view.bottom - dy) / sy,
      };
      // The camera pushes in on the same working press. The original center
      // below stays a single pixel cel, including during the coupling's tremor.
      p.g.save();
      p.g.translate(dx, dy);
      p.g.scale(sx, sy);
      pressShot(p, t, true, local);
      p.g.restore();
    }
    p.image(
      jamCamera.canvas,
      -32 - advance,
      -8 - rounded(advance * 0.4),
      358 + advance,
      202 + rounded(advance * 0.56),
    );
  }
  window.DispatchFilms.boss = function (p, part, time, view) {
    const t = Math.max(0, Math.min(8, Number.isFinite(time) ? time : 0));
    const extra =
      view && (view.left < 0 || view.top < 0 || view.right > 320 || view.bottom > 180) ? view : null;
    if (part === 0) {
      if (t < 2.52) reveal(p, t, extra);
      else if (t < 5.52) pressShot(p, t, false, extra);
      else listening(p, t, extra);
    } else {
      if (t < 2.74) instruction(p, t, extra);
      else if (t < 5.7) jamCloseup(p, t, extra);
      else faceOff(p, t, extra);
    }
  };
})();
