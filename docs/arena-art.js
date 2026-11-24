/* Original pixel scenery for Dog Fight 3. The world is 1200 x 675, three world
   units per native scene pixel. Separate stage pieces preserve exact hit edges. */
(() => {
  'use strict';

  const W = 400,
    H = 225;
  const ink = '#252337',
    plum = '#474057',
    cream = '#fff1c7';
  const honey = '#f4c76a',
    coral = '#e5684f';
  const scenes = new Map();
  const sprites = new Map();

  // Every primitive writes opaque, whole pixels. Diagonals are stepped lines.
  class Pixels {
    constructor(w, h) {
      this.canvas =
        typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
      this.canvas.width = w;
      this.canvas.height = h;
      this.g = this.canvas.getContext('2d');
      this.g.imageSmoothingEnabled = false;
    }
    r(x, y, w, h, color) {
      this.g.fillStyle = color;
      this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    dot(x, y, color) {
      this.r(x, y, 1, 1, color);
    }
    line(x0, y0, x1, y1, color) {
      x0 = Math.round(x0);
      y0 = Math.round(y0);
      x1 = Math.round(x1);
      y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0),
        dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1,
        sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.dot(x0, y0, color);
        if (x0 === x1 && y0 === y1) break;
        const twice = 2 * err;
        if (twice >= dy) {
          err += dy;
          x0 += sx;
        }
        if (twice <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    }
    poly(points, color) {
      const yy = points.filter((_, i) => i % 2);
      const end = Math.ceil(Math.max(...yy));
      for (let y = Math.floor(Math.min(...yy)); y < end; y++) {
        const at = y + 0.5,
          hits = [];
        for (let a = 0, b = points.length - 2; a < points.length; b = a, a += 2) {
          const ax = points[a],
            ay = points[a + 1],
            bx = points[b],
            by = points[b + 1];
          if (ay > at !== by > at) hits.push(ax + ((at - ay) * (bx - ax)) / (by - ay));
        }
        hits.sort((a, b) => a - b);
        for (let i = 0; i + 1 < hits.length; i += 2) {
          const x = Math.ceil(hits[i] - 0.5);
          this.r(x, y, Math.ceil(hits[i + 1] - 0.5) - x, 1, color);
        }
      }
    }
    disk(x, y, rx, ry, color) {
      for (let k = -ry; k <= ry; k++) {
        const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (k * k) / (ry * ry))));
        this.r(x - span, y + k, 2 * span + 1, 1, color);
      }
    }
    blit(other, x, y, w = other.width, h = other.height) {
      this.g.drawImage(other, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
  }

  function sprite(key, w, h, painter) {
    if (!sprites.has(key)) {
      const p = new Pixels(w, h);
      painter(p);
      sprites.set(key, p.canvas);
    }
    return sprites.get(key);
  }

  function mapSprite(p, x, y, pattern, colors, flip = false) {
    pattern.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const color = colors[row[i]];
        if (color) p.dot(x + (flip ? row.length - 1 - i : i), y + j, color);
      }
    });
  }

  function random(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function cloud(p, x, y, scale, top, shade, glow, small = false) {
    const key = [top, shade, glow, small].join('/');
    const img = sprite(key, 75, 27, (q) => {
      const mass = [
        1, 19, 5, 19, 5, 16, 11, 16, 11, 12, 16, 12, 16, 9, 22, 9, 22, 10, 26, 10, 26, 6, 30, 6, 30, 3, 36, 3,
        36, 1, 44, 1, 44, 3, 50, 3, 50, 6, 53, 6, 53, 12, 57, 12, 57, 10, 63, 10, 63, 12, 67, 12, 67, 16, 72,
        16, 72, 19, 75, 19, 75, 21, 68, 21, 68, 22, 55, 22, 55, 23, 40, 23, 40, 25, 28, 25, 28, 24, 12, 24,
        12, 23, 2, 23,
      ];
      q.poly(mass, shade);
      q.poly(
        [
          2, 18, 8, 18, 8, 15, 14, 15, 14, 12, 18, 12, 18, 10, 23, 10, 23, 11, 28, 11, 28, 6, 32, 6, 32, 4,
          37, 4, 37, 2, 44, 2, 44, 4, 49, 4, 49, 7, 52, 7, 52, 14, 57, 14, 57, 12, 61, 12, 61, 14, 65, 14, 65,
          17, 68, 17, 68, 19, 58, 19, 58, 20, 50, 20, 50, 18, 43, 18, 43, 20, 35, 20, 35, 21, 24, 21, 24, 20,
          16, 20, 16, 22, 5, 22,
        ],
        top,
      );
      q.r(34, 5, 9, 1, glow);
      q.r(29, 8, 5, 1, glow);
      q.r(17, 13, 5, 1, glow);
      if (!small) {
        q.r(8, 25, 8, 1, shade);
        q.r(48, 25, 16, 1, shade);
        q.r(62, 24, 5, 1, shade);
      }
    });
    p.blit(img, x, y, 75 * scale, 27 * scale);
  }

  function birds(p, x, y, c) {
    p.line(x, y, x + 2, y + 1, c);
    p.line(x + 2, y + 1, x + 5, y - 1, c);
    p.line(x + 9, y + 4, x + 10, y + 5, c);
    p.line(x + 10, y + 5, x + 12, y + 4, c);
  }

  // Tufted foliage. Small pools of light and hard diagonal leaf clusters break
  // up the larger silhouettes while leaving the distant scenery quieter.
  function crown(p, x, y, w, h, colors, flip = false) {
    const key = 'tree' + colors.join('');
    const leaf = sprite(key, 72, 43, (q) => {
      q.poly(
        [
          0, 25, 1, 19, 4, 17, 5, 12, 10, 12, 11, 8, 16, 7, 17, 4, 24, 4, 27, 1, 33, 1, 36, 4, 40, 3, 43, 1,
          48, 2, 51, 5, 57, 5, 59, 9, 63, 9, 64, 13, 67, 14, 66, 18, 70, 20, 69, 24, 72, 25, 70, 30, 63, 31,
          63, 33, 60, 34, 56, 34, 53, 38, 48, 37, 46, 40, 42, 40, 39, 38, 36, 41, 30, 40, 27, 42, 24, 39, 18,
          40, 16, 37, 10, 37, 9, 34, 5, 33, 4, 29, 1, 29,
        ],
        colors[0],
      );
      q.poly(
        [
          0, 22, 4, 18, 5, 13, 10, 12, 12, 8, 16, 8, 18, 5, 25, 5, 28, 2, 32, 2, 36, 5, 41, 4, 44, 2, 48, 3,
          51, 6, 56, 6, 59, 10, 61, 10, 64, 14, 61, 18, 57, 18, 53, 21, 48, 20, 43, 24, 39, 23, 36, 26, 32,
          24, 28, 27, 25, 25, 21, 28, 17, 27, 15, 30, 12, 28, 9, 30, 5, 28, 3, 25,
        ],
        colors[1],
      );
      q.poly(
        [
          4, 18, 7, 14, 11, 14, 13, 10, 17, 10, 19, 6, 25, 6, 28, 3, 32, 3, 34, 6, 31, 7, 28, 7, 27, 10, 23,
          10, 20, 14, 17, 14, 15, 17, 10, 17, 9, 20, 5, 20,
        ],
        colors[2],
      );
      q.poly(
        [31, 16, 34, 11, 39, 11, 42, 7, 46, 6, 50, 9, 50, 11, 46, 11, 43, 15, 39, 14, 36, 18, 33, 17],
        colors[2],
      );
      q.poly([49, 27, 53, 23, 57, 23, 58, 21, 63, 21, 62, 24, 58, 25, 55, 28], colors[1]);
      q.poly([17, 34, 21, 31, 24, 31, 26, 29, 29, 29, 26, 33, 22, 34, 20, 36], colors[1]);
      [
        [9, 16],
        [13, 11],
        [22, 7],
        [29, 4],
        [39, 12],
        [45, 8],
        [16, 24],
        [53, 16],
      ].forEach(([a, b]) => {
        q.r(a, b, 2, 1, colors[3]);
        q.dot(a - 1, b + 1, colors[2]);
      });
      [
        [13, 31],
        [28, 34],
        [34, 30],
        [43, 30],
        [55, 29],
        [61, 25],
        [6, 23],
      ].forEach(([a, b]) => {
        q.r(a, b, 2, 1, colors[0]);
        q.dot(a + 2, b - 1, colors[0]);
      });
    });
    if (!flip) p.blit(leaf, x, y, w, h);
    else {
      p.g.save();
      p.g.translate(Math.round(x + w), Math.round(y));
      p.g.scale(-1, 1);
      p.blit(leaf, 0, 0, w, h);
      p.g.restore();
    }
  }

  function trunk(p, x, y, flip, shade, lit) {
    const point = (a) => a.map((v, i) => (i % 2 ? y + v : x + flip * v));
    p.poly(
      point([
        -5, 0, -10, 0, -5, -8, -4, -26, -6, -36, -17, -46, -15, -47, -6, -42, -10, -55, -7, -55, -3, -46, 0,
        -36, 7, -44, 9, -52, 12, -52, 10, -41, 4, -30, 3, -10, 9, 1, 5, 2, 0, -2,
      ]),
      shade,
    );
    p.poly(point([-5, -2, -2, -11, -2, -28, -3, -37, 0, -33, 0, -15, 0, -6, 3, 0]), lit);
    p.line(x - flip * 2, y - 24, x - flip * 3, y - 17, shade);
  }

  function house(p, x, y, w, roof, wall, trim) {
    p.r(x + 2, y + 8, w - 3, 20, wall);
    p.poly(
      [
        x - 2,
        y + 9,
        x + 7,
        y + 1,
        x + 8,
        y - 1,
        x + w - 10,
        y - 3,
        x + w,
        y + 7,
        x + w,
        y + 9,
        x + w - 13,
        y + 10,
        x + 2,
        y + 11,
      ],
      roof,
    );
    p.line(x + 8, y + 1, x + w - 12, y - 1, trim);
    p.r(x + w - 13, y - 6, 3, 6, roof);
    p.r(x + w - 14, y - 7, 5, 2, trim);
    p.r(x + 6, y + 13, 6, 7, trim);
    p.r(x + 8, y + 14, 3, 5, wall);
    p.r(x + w - 13, y + 12, 5, 6, trim);
    p.r(x + 5, y + 21, 8, 1, roof);
    p.r(x + w - 14, y + 19, 7, 1, roof);
  }

  function gable(p, x, y, roof, wall, shadow) {
    p.poly([x, y + 9, x + 12, y, x + 26, y + 11, x + 26, y + 30, x, y + 30], wall);
    p.poly(
      [x - 3, y + 10, x + 12, y - 2, x + 29, y + 10, x + 28, y + 12, x + 12, y + 1, x - 2, y + 12],
      roof,
    );
    p.r(x + 10, y + 7, 5, 7, shadow);
    p.r(x + 11, y + 8, 3, 1, wall);
    p.r(x + 1, y + 15, 7, 1, shadow);
    p.r(x + 17, y + 17, 6, 1, shadow);
    p.r(x + 4, y + 20, 7, 8, shadow);
    p.r(x + 6, y + 21, 2, 5, wall);
  }

  function mast(p, x, y, c) {
    p.line(x, y, x - 1, y - 15, c);
    p.line(x - 6, y - 12, x + 7, y - 15, c);
    p.line(x - 5, y - 13, x - 3, y - 10, c);
    p.line(x, y - 15, x + 1, y - 12, c);
    p.line(x + 5, y - 16, x + 6, y - 14, c);
  }

  function flagString(p, pts, colors, spacing) {
    for (let i = 2; i < pts.length; i += 2) p.line(pts[i - 2], pts[i - 1], pts[i], pts[i + 1], '#645c64');
    const lx = pts[0],
      rx = pts[pts.length - 2];
    for (let x = lx + 5, n = 0; x < rx - 2; x += spacing, n++) {
      let j = 2;
      while (j < pts.length - 2 && pts[j] < x) j += 2;
      const f = (x - pts[j - 2]) / (pts[j] - pts[j - 2]),
        y = Math.round(pts[j - 1] + (pts[j + 1] - pts[j - 1]) * f);
      p.poly([x, y + 1, x + 5, y + 1, x + 2 + (n % 3), y + 7 + (n % 2)], colors[n % colors.length]);
      p.r(x, y + 1, 4, 1, colors[(n + 1) % colors.length] === cream ? '#edc68d' : '#e7be88');
    }
  }

  function distantGarden(p) {
    p.r(0, 0, 400, 225, '#8bbfc2');
    p.poly(
      [
        0, 78, 18, 75, 46, 75, 58, 73, 93, 73, 111, 70, 152, 72, 173, 70, 204, 70, 226, 67, 246, 68, 282, 68,
        306, 66, 337, 68, 366, 65, 400, 68, 400, 151, 0, 151,
      ],
      '#a8ccbd',
    );
    p.disk(301, 40, 14, 14, '#dcd5a5');
    p.disk(300, 39, 13, 13, '#f8d789');
    p.r(294, 32, 8, 1, '#ffe6a5');
    p.r(286, 43, 13, 1, '#f3d496');
    cloud(p, 19, 13, 1.03, '#efedce', '#bdd3c1', cream);
    cloud(p, 173, 26, 0.52, '#e5e7c8', '#b6cec0', '#f8edcc', true);
    cloud(p, 313, 46, 0.77, '#f2e8c5', '#c5d0b6', cream);
    p.r(130, 28, 10, 1, '#acd2cb');
    p.r(140, 27, 7, 1, '#acd2cb');
    p.r(236, 54, 8, 1, '#c4d8bf');
    birds(p, 234, 32, '#769c9f');
    const far = ['#88aa94', '#97b49a', '#abc3a2', '#b6c9a5'];
    [
      [-15, 84, 64, 31],
      [32, 82, 55, 32],
      [66, 88, 39, 23],
      [96, 82, 53, 33],
      [128, 87, 49, 30],
      [155, 80, 69, 38],
      [202, 85, 53, 31],
      [230, 82, 67, 39],
      [268, 86, 51, 26],
      [315, 79, 65, 31],
      [354, 83, 61, 37],
    ].forEach(([x, y, w, h], i) => crown(p, x, y, w, h, far, !!(i % 2)));
    house(p, 53, 97, 39, '#81968b', '#bec6a0', '#a0aa8e');
    house(p, 94, 91, 46, '#84948b', '#c6c5a5', '#a7ad95');
    house(p, 175, 104, 34, '#98a18b', '#c8c6aa', '#a4ad95');
    house(p, 222, 98, 53, '#97968c', '#cbc3a5', '#a3aa92');
    house(p, 291, 91, 47, '#7e8c86', '#bec0a0', '#a5ab94');
    gable(p, 115, 87, '#7a918a', '#c6c5a5', '#9eaa92');
    gable(p, 269, 96, '#8e948a', '#c6c6a3', '#a4ad91');
    mast(p, 320, 91, '#87978c');
    const middle = ['#688b78', '#789b7f', '#91ac88', '#a1b28b'];
    [
      [-14, 94, 57, 38],
      [38, 106, 35, 28],
      [77, 107, 39, 26],
      [127, 105, 39, 25],
      [151, 109, 48, 24],
      [198, 111, 38, 22],
      [256, 104, 51, 29],
      [320, 101, 52, 32],
      [356, 102, 51, 34],
    ].forEach(([x, y, w, h], i) => crown(p, x, y, w, h, middle, !!(i % 2)));
    trunk(p, 11, 141, 1, '#646c57', '#958b69');
    trunk(p, 389, 141, -1, '#626b58', '#95896a');
    const near = ['#536f68', '#6e8d70', '#8da77b', '#abc294'];
    crown(p, -33, 45, 91, 64, near);
    crown(p, 13, 67, 57, 41, near, true);
    crown(p, 349, 55, 84, 57, near, true);
    crown(p, 337, 79, 39, 30, near);
    flagString(
      p,
      [-8, 6, 12, 17, 33, 23, 52, 25, 72, 23, 94, 16, 117, 6, 127, -1],
      [coral, honey, '#61979a', cream],
      12,
    );
    flagString(
      p,
      [290, -1, 316, 11, 344, 20, 365, 22, 383, 21, 405, 14],
      ['#d99772', '#5c9294', honey, cream],
      13,
    );
  }

  const mutt = [
    '..bb.....b..',
    '..bBb...bBb.',
    '.bBBb..bBBb.',
    '.bBBcbbBcBb.',
    '.bbCCCCcCbb.',
    '..bCkCCkCb..',
    '..bCCCCCCb..',
    '...bCcncCb..',
    '...bCcccb...',
    '....brrb....',
    '...bCrrCb...',
    '..bbCCCCbb..',
  ];
  function fan(p, x, y, dark, light, mark, band, flip = false) {
    mapSprite(p, x, y, mutt, { b: dark, B: mark, C: light, c: '#efce9b', k: ink, n: ink, r: band }, flip);
  }

  function fence(p) {
    const deep = '#728570',
      edge = '#87977b',
      main = '#b4b696',
      sun = '#d1cba6';
    p.r(0, 126, 400, 3, deep);
    p.r(0, 138, 400, 3, deep);
    p.r(1, 126, 397, 1, '#9da68a');
    const tops = [119, 117, 118, 122, 119, 121, 118, 118, 120, 119, 121, 117, 118, 121, 120, 122, 118];
    let x = -4,
      index = 0;
    while (x < 401) {
      const width = [6, 6, 7, 5, 7, 7, 6, 6, 7, 5, 7][index % 11];
      let h = tops[index % tops.length];
      if (x > 110 && x < 210) h += 2;
      if (index === 6 || index === 39) {
        x += width + 1;
        index++;
        continue;
      }
      const lean = index === 17 ? -3 : index === 40 ? 3 : index % 9 === 5 ? 1 : 0;
      const tx = x + lean,
        top = index === 23 ? h + 5 : h;
      p.poly(
        [tx, top + 3, tx + 2, top, tx + width - 2, top, tx + width, top + 3, x + width, 145, x, 145],
        edge,
      );
      p.poly(
        [
          tx + 1,
          top + 3,
          tx + 2,
          top + 1,
          tx + width - 2,
          top + 1,
          tx + width - 1,
          top + 3,
          x + width - 1,
          145,
          x + 1,
          145,
        ],
        main,
      );
      p.line(tx + 1, top + 4, x + 1, 138, sun);
      p.dot(tx + 3, 128, deep);
      if (index % 4 === 0) p.line(x + width - 3, 135, x + width - 4, 140, edge);
      if (index % 7 === 0) {
        p.r(tx + 2, top + 5, 2, 1, sun);
        p.dot(x + 3, 139, deep);
      }
      x += width + 1;
      index++;
    }
    p.poly([30, 128, 50, 123, 51, 125, 30, 131], '#997f62');
    p.line(32, 128, 47, 124, '#beab84');
    p.poly([284, 135, 307, 131, 308, 134, 284, 138], '#9a8d6b');
    p.dot(286, 136, deep);
    p.dot(304, 133, deep);
    // A crooked, faded pennant hung from two old fence nails.
    p.line(188, 123, 194, 126, '#8c846d');
    p.line(204, 126, 208, 122, '#8c846d');
    p.poly([192, 124, 205, 123, 205, 131, 200, 130, 197, 134, 194, 132], '#98876e');
    p.poly([193, 124, 205, 124, 204, 130, 200, 129, 197, 132, 195, 130], '#cfaa85');
    p.r(196, 126, 1, 2, '#a77965');
    p.dot(198, 125, '#a77965');
    p.dot(200, 125, '#a77965');
    p.dot(201, 127, '#a77965');
    p.r(197, 128, 3, 2, '#a77965');
  }

  function flower(p, x, y, light, large = false) {
    p.line(x, y, x + 1, y - 5, '#526951');
    p.r(x - 2, y - 2, 2, 1, '#637e5c');
    p.dot(x + 1, y - 6, light);
    p.dot(x, y - 5, light);
    p.dot(x + 2, y - 5, light);
    p.dot(x + 1, y - 4, light);
    p.dot(x + 1, y - 5, honey);
    if (large) {
      p.dot(x - 1, y - 5, light);
      p.dot(x + 1, y - 7, light);
      p.r(x + 1, y - 2, 2, 1, '#8da46e');
    }
  }

  function grass(p, x, y, z, mid, light) {
    p.line(x, y, x - 2 * z, y - 3 * z, mid);
    p.line(x, y, x + z, y - 4 * z, mid);
    p.line(x + 2 * z, y, x + 4 * z, y - 2 * z, light);
    p.dot(x - 3 * z, y - z, light);
  }

  function ground(p) {
    p.r(0, 142, 400, H - 142, '#91a779');
    p.poly(
      [
        0, 147, 44, 146, 57, 147, 87, 146, 110, 148, 165, 148, 186, 146, 228, 146, 264, 148, 314, 147, 354,
        146, 400, 148, 400, 225, 0, 225,
      ],
      '#849a70',
    );
    p.poly(
      [
        0, 171, 28, 167, 47, 168, 68, 165, 84, 166, 96, 164, 122, 166, 135, 164, 155, 167, 178, 168, 210, 166,
        245, 166, 255, 164, 284, 166, 312, 164, 327, 165, 352, 162, 375, 163, 400, 160, 400, 225, 0, 225,
      ],
      '#78916c',
    );
    p.poly(
      [
        0, 208, 18, 205, 40, 203, 47, 204, 68, 199, 89, 200, 103, 196, 125, 197, 142, 193, 167, 193, 180, 190,
        201, 192, 223, 189, 240, 190, 252, 187, 273, 188, 295, 185, 306, 186, 328, 184, 348, 184, 374, 180,
        400, 181, 400, 225, 0, 225,
      ],
      '#6d8466',
    );
    p.poly(
      [
        116, 216, 145, 209, 181, 204, 235, 194, 264, 192, 275, 188, 300, 188, 298, 191, 279, 194, 267, 199,
        216, 203, 191, 210, 163, 212, 149, 216, 126, 218,
      ],
      '#667e62',
    );
    const scatter = random(994);
    for (let i = 0; i < 69; i++) {
      const x = (scatter() * 400) | 0,
        y = (146 + scatter() * 80) | 0,
        sz = y > 193 && i % 6 === 0 ? 2 : 1;
      if (i % 4 === 0) grass(p, x, y, sz, '#647d5d', '#9aac78');
      else {
        p.r(x, y, 1 + Math.floor(scatter() * 3), 1, i % 2 ? '#8d9e72' : '#708866');
        if (i % 5 === 0) p.r(x + 4, y - 1, 2, 1, '#aab680');
      }
    }
    [
      [8, 162],
      [19, 159],
      [14, 181],
      [33, 180],
      [367, 168],
      [361, 169],
      [386, 196],
      [29, 211],
      [35, 214],
      [325, 198],
    ].forEach(([x, y], i) => flower(p, x, y, i % 3 ? '#e0d6a2' : cream, i % 3 === 0));
    [
      [4, 191],
      [9, 194],
      [16, 190],
      [119, 191],
      [116, 192],
      [363, 205],
      [369, 204],
      [376, 208],
    ].forEach(([x, y]) => grass(p, x, y, 1, '#536f59', '#a2ae78'));
    // A scuffed tennis ball rests in the strip of grass beyond the right ledge.
    p.r(347, 147, 5, 1, '#72815f');
    p.disk(349, 145, 2, 2, '#637d5e');
    p.r(348, 143, 3, 1, '#cbd08a');
    p.r(347, 144, 3, 2, '#bcca72');
    p.dot(350, 144, cream);
    p.dot(349, 145, '#e8dea2');
  }

  function picnicLegs(p) {
    const dark = '#634e48',
      shadow = '#84634d',
      wood = '#b27a52',
      lit = '#d69a61';
    p.poly([110, 155, 126, 155, 184, 226, 162, 226], dark);
    p.poly([114, 157, 125, 157, 179, 226, 164, 226], shadow);
    p.poly([271, 155, 286, 155, 230, 226, 210, 226], dark);
    p.poly([273, 157, 282, 157, 228, 226, 215, 226], shadow);
    p.poly([102, 193, 299, 193, 301, 200, 99, 200], dark);
    p.poly([103, 194, 298, 194, 299, 198, 102, 198], wood);
    p.r(107, 194, 184, 1, lit);
    p.r(149, 197, 28, 1, shadow);
    p.r(202, 196, 28, 1, shadow);
    p.poly([147, 155, 168, 155, 115, 226, 93, 226], ink);
    p.poly([149, 156, 165, 156, 114, 226, 96, 226], wood);
    p.poly([150, 157, 154, 157, 104, 226, 99, 226], lit);
    p.poly([235, 155, 252, 155, 309, 226, 285, 226], ink);
    p.poly([237, 156, 251, 156, 306, 226, 286, 226], wood);
    p.poly([246, 157, 250, 157, 303, 226, 299, 226], lit);
    p.line(143, 173, 125, 197, '#9b664b');
    p.line(126, 193, 122, 199, '#9b664b');
    p.line(257, 176, 269, 191, '#986349');
    p.line(274, 204, 282, 214, '#986349');
    p.line(114, 209, 107, 219, shadow);
    [
      [126, 196],
      [271, 196],
    ].forEach(([x, y]) => {
      p.r(x - 2, y - 2, 5, 5, '#685b52');
      p.r(x - 1, y - 2, 3, 1, '#c4ae84');
      p.r(x - 1, y - 1, 3, 2, '#8e8a75');
      p.dot(x, y, ink);
    });
    p.poly([142, 165, 147, 167, 145, 169, 140, 167], '#677474');
    p.dot(143, 166, '#b8ad8d');
  }

  function hurdleLegs(p, x) {
    [
      [6, 1],
      [57, -1],
    ].forEach(([off, side]) => {
      const bx = x + off;
      p.poly([bx, 113, bx + 3, 113, bx - 1 * side + 2, 150, bx - 2 * side, 150], '#8e8b6a');
      p.line(bx + 1, 115, bx - side, 147, '#b1ac7c');
      p.line(bx + 2, 115, bx + 6 * side, 148, '#8b896c');
      p.r(bx - 2, 148, 7, 1, '#79896b');
    });
  }

  function buildPicnic(p = new Pixels(W, H)) {
    distantGarden(p);
    fan(p, 22, 110, '#665c53', '#caab82', '#8c735e', '#b66d58');
    fan(p, 35, 112, '#68746a', '#c5c1a1', '#929b84', '#68948a', true);
    fan(p, 357, 107, '#666f63', '#b1a889', '#827f6a', '#c58d63', true);
    fence(p);
    ground(p);
    hurdleLegs(p, 105);
    hurdleLegs(p, 235);
    picnicLegs(p);
    return p.canvas;
  }

  function plank() {
    return sprite('plank', 294, 21, (p) => {
      p.poly([0, 0, 294, 0, 294, 4, 291, 9, 288, 10, 8, 10, 3, 8, 0, 5], ink);
      p.poly([1, 1, 293, 1, 290, 4, 3, 4], honey);
      p.poly([2, 2, 291, 2, 289, 4, 4, 4], '#e5ad75');
      p.poly([2, 4, 291, 4, 288, 8, 7, 8, 3, 6], '#ba7956');
      p.poly([9, 9, 285, 9, 280, 14, 16, 14], '#a66a4d');
      p.r(16, 13, 264, 2, '#554249');
      p.r(19, 10, 257, 1, '#cb8a5b');
      p.r(18, 12, 29, 1, '#936143');
      [
        [10, 6, 9],
        [31, 5, 12],
        [54, 6, 20],
        [82, 5, 8],
        [113, 6, 15],
        [168, 5, 18],
        [197, 6, 17],
        [222, 5, 6],
        [278, 6, 8],
      ].forEach(([x, y, w]) => p.r(x, y, w, 1, '#965d49'));
      p.r(46, 2, 21, 1, '#f8c782');
      p.r(101, 2, 12, 1, '#cb905e');
      p.r(159, 2, 26, 1, '#f6ca83');
      p.r(214, 2, 8, 1, '#ce9261');
      [
        [15, 5],
        [86, 5],
        [164, 5],
        [285, 5],
      ].forEach(([x, y]) => {
        p.r(x, y, 2, 2, '#6c5a50');
        p.dot(x, y, '#ccae84');
      });
      p.r(182, 6, 5, 1, '#845247');
      p.r(183, 5, 3, 1, '#cd8b60');
      // Three-pixel checks, a crooked hem, and a square patch sewn by hand.
      const start = 231,
        end = 270;
      for (let x = start; x < end; x++) {
        const bottom = 16 + ((x - start) % 9 < 4 ? 1 : 0) - (x > end - 5 ? 1 : 0);
        for (let y = 0; y <= bottom; y++) {
          const col = Math.floor((x - start + Math.floor(y / 9)) / 4) % 2,
            row = Math.floor(y / 4) % 2;
          let c = col && row ? '#b8564d' : col || row ? '#e19777' : '#f4dfb1';
          if (y === 0) c = col ? '#efae86' : '#ffebbd';
          if (y === bottom) c = '#8c514b';
          p.dot(x, y, c);
        }
      }
      p.r(231, 4, 1, 10, '#8b5850');
      p.r(269, 2, 1, 11, '#7e5050');
      p.r(237, 4, 1, 9, '#cd806a');
      p.r(260, 9, 1, 6, '#cd806a');
      p.r(261, 9, 6, 5, '#738f88');
      p.r(262, 10, 4, 3, '#94aca0');
      [
        [261, 9],
        [264, 9],
        [266, 11],
        [262, 13],
      ].forEach(([x, y]) => p.dot(x, y, cream));
    });
  }

  function agility() {
    return sprite('agility', 65, 8, (p) => {
      p.poly([0, 0, 65, 0, 65, 4, 62, 6, 58, 7, 7, 7, 3, 6, 0, 4], ink);
      p.r(1, 1, 63, 2, honey);
      p.r(1, 3, 63, 1, '#c9925e');
      p.r(4, 4, 57, 1, '#ac7955');
      p.r(7, 5, 49, 1, '#7d6555');
      [5, 52].forEach((x) => {
        p.r(x, 1, 8, 4, '#41676c');
        p.r(x, 1, 7, 1, '#79a3a0');
        p.r(x + 2, 2, 2, 2, '#c1c7a1');
      });
      p.r(20, 2, 11, 1, '#e4b276');
      p.r(38, 2, 4, 1, '#f8d293');
      p.dot(2, 3, '#795d4c');
      p.dot(62, 3, '#795d4c');
    });
  }

  function cityBuilding(p, x, y, w, base, colors, detail) {
    p.r(x, y, w, base - y, colors[0]);
    p.r(x, y, w, 1, colors[1]);
    p.r(x + w - 4, y + 1, 4, base - y, colors[2]);
    const rand = random(x * 19 + y);
    for (let yy = y + 6; yy < base - 3; yy += detail ? 7 : 9) {
      for (let xx = x + 3; xx < x + w - 5; xx += detail ? 6 : 8) {
        if (rand() > 0.43) {
          p.r(xx, yy, detail ? 2 : 1, 2, colors[3]);
          if (detail && rand() > 0.68) p.dot(xx, yy + 2, colors[2]);
        }
      }
    }
    if (detail && w > 27) {
      p.r(x + 3, y - 3, 6, 3, colors[2]);
      p.r(x + 2, y - 4, 8, 1, colors[1]);
    }
  }

  function tower(p, x, y) {
    const sh = '#9c8388',
      lit = '#b59893';
    p.line(x - 4, y, x - 7, y + 11, sh);
    p.line(x + 4, y, x + 7, y + 11, sh);
    p.line(x - 4, y + 2, x + 5, y + 8, sh);
    p.line(x + 4, y + 2, x - 5, y + 8, sh);
    p.poly([x - 6, y - 12, x + 6, y - 12, x + 5, y, x + 3, y + 2, x - 3, y + 2, x - 5, y], sh);
    p.r(x - 4, y - 11, 2, 10, lit);
    p.r(x - 5, y - 5, 10, 1, lit);
    p.poly([x - 8, y - 12, x - 2, y - 17, x + 1, y - 17, x + 8, y - 12], sh);
  }

  function city(p, depth) {
    p.r(0, 0, 400, 225, '#e4a58e');
    p.poly(
      [
        0, 24, 27, 24, 34, 23, 88, 23, 94, 24, 146, 24, 154, 23, 210, 23, 217, 22, 264, 22, 270, 23, 335, 23,
        342, 22, 400, 22, 400, 225, 0, 225,
      ],
      '#e9ad90',
    );
    p.poly(
      [
        0, 40, 40, 40, 46, 39, 85, 39, 93, 40, 129, 40, 133, 39, 167, 39, 174, 38, 203, 38, 209, 39, 251, 39,
        257, 38, 294, 38, 302, 37, 350, 37, 357, 36, 400, 36, 400, 225, 0, 225,
      ],
      '#edb68e',
    );
    p.poly(
      [
        0, 55, 37, 55, 44, 54, 94, 54, 100, 55, 146, 55, 152, 54, 196, 54, 204, 53, 259, 53, 268, 52, 310, 52,
        315, 51, 365, 51, 373, 50, 400, 50, 400, 225, 0, 225,
      ],
      '#efbf93',
    );
    p.poly(
      [
        0, 69, 32, 69, 37, 68, 83, 68, 88, 69, 131, 69, 137, 68, 176, 68, 183, 67, 221, 67, 227, 66, 264, 66,
        271, 65, 310, 65, 316, 64, 354, 64, 363, 63, 400, 63, 400, 225, 0, 225,
      ],
      '#f3c895',
    );
    p.disk(86, 41, 16, 16, '#f7d999');
    p.disk(85, 40, 15, 15, '#ffdf9e');
    p.r(75, 36, 12, 1, '#ffe9b2');
    p.r(75, 47, 20, 1, '#f7d598');
    cloud(p, 0, 46, 0.88, '#f6d2a4', '#dfb59c', '#ffdfac');
    cloud(p, 176, 16, 0.96, '#f8cfad', '#dda79b', '#ffdfb5');
    cloud(p, 312, 53, 0.61, '#f4cc9f', '#dcb197', '#fbd6a5', true);
    p.r(119, 41, 13, 1, '#f2c69b');
    p.r(131, 40, 6, 1, '#f2c69b');
    birds(p, 150, 39, '#ac8e8a');
    const far = ['#c7aa9a', '#d6b5a0', '#bea499', '#ddbea6'];
    const mid = ['#a89494', '#bb9f96', '#9f8c91', '#c7aaa0'];
    const near = ['#84838a', '#a39592', '#777987', '#b6a196'];
    [
      [-9, 113, 30],
      [17, 104, 22],
      [38, 111, 14],
      [52, 94, 17],
      [69, 104, 26],
      [91, 97, 32],
      [122, 103, 16],
      [138, 90, 21],
      [157, 99, 34],
      [191, 91, 16],
      [205, 100, 27],
      [232, 86, 19],
      [251, 92, 22],
      [273, 104, 31],
      [302, 93, 21],
      [324, 100, 32],
      [356, 87, 20],
      [377, 98, 27],
    ].forEach(([x, y, w]) => cityBuilding(p, x, y, w, depth, far, false));
    tower(p, 68, 101);
    tower(p, 330, 108);
    [
      [-14, 116, 38],
      [20, 132, 17],
      [36, 111, 27],
      [61, 119, 34],
      [95, 109, 26],
      [121, 125, 36],
      [155, 108, 17],
      [172, 117, 33],
      [201, 111, 27],
      [228, 125, 23],
      [249, 103, 29],
      [274, 116, 31],
      [302, 112, 23],
      [324, 122, 39],
      [361, 108, 19],
      [380, 118, 29],
    ].forEach(([x, y, w]) => cityBuilding(p, x, y, w, depth, mid, true));
    mast(p, 110, 110, '#9f8b8f');
    mast(p, 262, 101, '#9c8a8e');
    [
      [-6, 152, 33],
      [27, 161, 26],
      [52, 150, 33],
      [84, 160, 23],
      [107, 148, 27],
      [134, 164, 30],
      [162, 157, 21],
      [182, 171, 26],
      [204, 160, 29],
      [232, 152, 31],
      [263, 167, 24],
      [287, 160, 30],
      [315, 149, 18],
      [332, 158, 32],
      [364, 151, 24],
      [387, 161, 20],
    ].forEach(([x, y, w]) => cityBuilding(p, x, y, w, depth, near, true));
    // A row of pitched slate roofs between the flat brick terraces.
    [
      [1, 153],
      [21, 151],
      [354, 153],
      [377, 151],
    ].forEach(([x, y]) => {
      p.poly([x - 2, y + 3, x + 6, y - 5, x + 20, y - 6, x + 27, y + 2, x + 27, y + 3], '#83818a');
      p.r(x + 13, y - 8, 2, 4, '#83818a');
      p.r(x + 3, y + 4, 4, 3, '#aa9895');
    });
  }

  const washerShapes = {
    shirt: [
      '..xxx.xxx..',
      '.xxxx.xxxx.',
      'xxxxxxxxxxx',
      '.xxxxxxxxx.',
      '..xxxxxxx..',
      '..xxxxxxx..',
      '..xxxxxxx..',
      '..xxxxxxx..',
      '..xxxxxxx..',
    ],
    sock: ['.xxxx.', '.xxxx.', '.xxxx.', '.xxxx.', '.xxxx.', '.xxxxx', 'xxxxxx', '.xxxx.'],
    towel: [
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      '.xxxxxxx',
    ],
    pants: [
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxx.xxxx',
      'xxx.xxxx',
      'xxx..xxx',
      'xxx..xxx',
      'xxx..xxx',
      'xxx..xxx',
    ],
  };
  function garment(p, x, y, kind, main, shadow, stripe, style) {
    const shape = washerShapes[kind],
      w = shape[0].length;
    shape.forEach((row, j) => {
      for (let i = 0; i < row.length; i++)
        if (row[i] === 'x') {
          let col = i > w - 3 || j === shape.length - 1 ? shadow : main;
          if ((style === 0 && j === shape.length - 3) || (style === 1 && kind === 'towel' && j % 3 === 1))
            col = stripe;
          if (style === 2 && i === 2 && j === 3) col = stripe;
          p.dot(x + i, y + j, col);
        }
    });
    p.r(x + 2, y - 1, 1, 2, '#7a645c');
    p.r(x + w - 3, y - 1, 1, 2, '#7a645c');
  }
  function clothesWire(p, points, items) {
    for (let i = 2; i < points.length; i += 2)
      p.line(points[i - 2], points[i - 1], points[i], points[i + 1], '#776774');
    items.forEach(([x, k, m, sh, st, pattern]) => {
      let j = 2;
      while (j < points.length - 2 && points[j] < x + 3) j += 2;
      const t = (x + 3 - points[j - 2]) / (points[j] - points[j - 2]);
      const y = Math.round(points[j - 1] + (points[j + 1] - points[j - 1]) * t);
      garment(p, x, y + 1, k, m, sh, st, pattern);
    });
  }

  function buildLaundry(p = new Pixels(W, H), depth = H) {
    city(p, depth);
    clothesWire(
      p,
      [-3, 29, 18, 34, 40, 36, 60, 34, 88, 25, 107, 13, 128, -2],
      [
        [6, 'towel', '#c58472', '#a56d65', '#dec298', 1],
        [23, 'shirt', '#e8c28f', '#c39d78', '#f3d8a5', 0],
        [42, 'sock', '#8faaa0', '#73918d', '#d6ceab', 0],
        [52, 'sock', '#8faaa0', '#73918d', '#d6ceab', 0],
        [74, 'pants', '#a597ac', '#8c839b', '#c4b3bc', 2],
        [95, 'towel', '#db9d84', '#bc847a', '#edd0a2', 1],
      ],
    );
    clothesWire(
      p,
      [273, -3, 290, 9, 317, 21, 340, 27, 364, 30, 389, 29, 405, 25],
      [
        [290, 'shirt', '#e5bd92', '#bf9d84', '#f4d6ac', 0],
        [310, 'towel', '#8daba5', '#748f93', '#c8c5aa', 1],
        [331, 'pants', '#bb949f', '#9e7f8d', '#d8aaa5', 2],
        [352, 'sock', '#dcc18e', '#bd9b77', '#f1d9ad', 0],
        [363, 'sock', '#dcc18e', '#bd9b77', '#f1d9ad', 0],
        [384, 'towel', '#c78979', '#ae746d', '#dfbc9b', 1],
      ],
    );
    clothesWire(
      p,
      [-4, 76, 17, 80, 38, 82, 57, 82, 73, 80, 88, 76],
      [
        [4, 'pants', '#a78b98', '#937e89', '#c9a397', 2],
        [20, 'shirt', '#d7aa81', '#bb9580', '#e9c893', 0],
        [44, 'towel', '#d5ba97', '#b5998b', '#ab8b91', 1],
        [62, 'sock', '#a2ada0', '#8b9790', '#cfb894', 0],
      ],
    );
    clothesWire(
      p,
      [321, 76, 344, 81, 367, 83, 391, 81, 403, 78],
      [
        [338, 'towel', '#b2929f', '#9e8492', '#d1ada2', 1],
        [356, 'shirt', '#d3b29b', '#b59a8d', '#e7c9aa', 0],
        [379, 'pants', '#98a09c', '#858b93', '#bbb2a1', 2],
      ],
    );
    // Repaired leaning masts and the fixed central wire for the basket trolley.
    p.poly([86, 148, 87, 74, 90, 73, 89, 148], '#77767a');
    p.line(88, 75, 87, 148, '#aa9990');
    p.r(85, 74, 6, 2, '#8b7d7d');
    p.poly([319, 150, 320, 73, 322, 72, 322, 150], '#76757b');
    p.line(321, 75, 320, 148, '#ab9990');
    p.r(318, 74, 6, 2, '#8a7b7e');
    p.line(87, 77, 110, 80, '#756975');
    p.line(110, 80, 145, 81, '#756975');
    p.r(145, 81, 112, 1, '#756975');
    p.line(256, 81, 298, 79, '#756975');
    p.line(298, 79, 321, 75, '#756975');
    p.r(113, 81, 12, 1, '#c0a087');
    p.r(276, 80, 14, 1, '#bba08b');
    mast(p, 29, 152, '#757782');
    return p.canvas;
  }

  function windowPane(p, x, y, style, cool) {
    const casing = cool ? '#aa9c91' : '#b58a78',
      shadow = cool ? '#555767' : '#715d69';
    p.r(x, y, 12, 17, shadow);
    p.r(x + 1, y + 1, 10, 14, casing);
    p.r(x + 2, y + 2, 8, 12, style === 1 ? '#53566a' : '#68717b');
    if (style === 0) {
      p.r(x + 2, y + 2, 3, 5, '#d1b391');
      p.r(x + 6, y + 2, 4, 5, '#e3bf92');
      p.r(x + 2, y + 8, 3, 4, '#95958b');
    }
    if (style === 2) {
      p.r(x + 2, y + 2, 8, 4, '#a49a8b');
      p.line(x + 3, y + 8, x + 7, y + 3, '#8d9190');
    }
    p.r(x + 5, y + 2, 1, 12, casing);
    p.r(x + 2, y + 7, 8, 1, casing);
    p.r(x - 1, y + 15, 14, 2, shadow);
    p.r(x - 1, y + 15, 13, 1, casing);
    if (style === 1) {
      p.r(x + 1, y + 11, 10, 4, '#a6a598');
      p.r(x + 2, y + 12, 6, 1, '#777c7e');
      p.dot(x + 9, y + 12, '#d6c3a3');
    }
    if (style === 3) {
      p.r(x + 1, y + 11, 10, 4, '#a16e5f');
      p.r(x + 4, y + 9, 4, 2, '#698677');
      p.dot(x + 3, y + 10, '#8d9b77');
    }
  }

  function roof(cool) {
    return sprite(cool ? 'rightRoof' : 'leftRoof', 130, 76, (p) => {
      const sh = cool ? '#596675' : '#885f68',
        face = cool ? '#83928a' : '#b47b6c',
        mortar = cool ? '#71837e' : '#9b6e66',
        lit = cool ? '#92a28e' : '#c98b73';
      p.r(3, 4, 124, 74, plum);
      p.r(4, 6, 122, 72, face);
      p.r(119, 8, 7, 68, sh);
      const rr = random(cool ? 1707 : 815);
      for (let row = 0; row < 12; row++) {
        const yy = 7 + row * 7;
        let xx = 4 - (row % 2) * 6;
        while (xx < 123) {
          const lw = 11 + ((rr() * 5) | 0);
          if (rr() > 0.25) p.r(Math.max(4, xx), yy, Math.min(lw, 121 - Math.max(4, xx)), 1, mortar);
          if (xx > 4 && xx < 120 && rr() > 0.22) p.r(xx, yy + 1, 1, 5, mortar);
          if (xx > 4 && xx < 112 && rr() > 0.64) p.r(xx + 2, yy + 2, 3 + ((rr() * 4) | 0), 1, lit);
          xx += lw;
        }
      }
      [14, 38, 63, 89].forEach((x, i) => {
        windowPane(p, x, 17 + (i === 2 ? 1 : 0), (i + (cool ? 1 : 0)) % 4, cool);
        windowPane(p, x, 51, (i + 2 + (cool ? 1 : 0)) % 4, cool);
      });
      if (cool) {
        // Uneven striped awning over the end window.
        p.poly([88, 17, 101, 17, 104, 21, 86, 21], plum);
        p.r(89, 17, 11, 1, '#d39d7f');
        p.r(88, 18, 14, 2, '#bc8b77');
        [89, 94, 99].forEach((x) => {
          p.r(x, 18, 2, 2, '#e5c499');
          p.dot(x, 20, '#b79b85');
        });
        p.r(87, 20, 2, 2, '#987b77');
      } else {
        // A little planter on a cracked sill, with one red bloom.
        p.r(37, 31, 13, 3, '#9a6759');
        p.r(37, 31, 13, 1, '#c68968');
        p.r(40, 29, 7, 2, '#758778');
        p.r(42, 28, 2, 2, '#91a083');
        p.dot(46, 28, '#ce8d79');
      }
      const pipe = cool ? 8 : 110;
      p.r(pipe, 6, 3, 70, sh);
      p.r(pipe + 1, 7, 1, 69, cool ? '#9da797' : '#b99079');
      [17, 37, 61].forEach((y) => p.r(pipe - 1, y, 5, 1, plum));
      p.r(3, 6, 124, 4, sh);
      p.r(5, 8, 119, 1, cool ? '#727d7f' : '#996c69');
      p.poly([0, 0, 130, 0, 130, 4, 127, 7, 3, 7, 0, 4], ink);
      p.r(1, 1, 128, 2, cool ? '#c4b59b' : '#e6b187');
      p.r(1, 1, 125, 1, cool ? '#ecd29c' : '#f6ce92');
      p.r(2, 3, 126, 2, cool ? '#9d9b8c' : '#ba8976');
      p.r(5, 5, 120, 1, cool ? '#747d80' : '#916e70');
      [13, 44, 82, 107].forEach((x) => {
        p.dot(x, 2, cool ? '#92988c' : '#ba8d78');
        p.dot(x - 1, 3, sh);
      });
    });
  }

  function chimney() {
    return sprite('chimney', 44, 47, (p) => {
      p.poly([7, 3, 37, 3, 39, 46, 5, 46], plum);
      p.poly([8, 5, 36, 5, 37, 44, 6, 44], '#b48b78');
      p.poly([8, 5, 13, 5, 12, 44, 6, 44], '#cda180');
      for (let i = 0; i < 7; i++) {
        const y = 7 + i * 6;
        p.r(7, y, 29, 1, '#97796f');
        p.r(i % 2 ? 11 : 17, y + 1, 1, 4, '#97796f');
        p.r(i % 2 ? 24 : 30, y + 1, 1, 4, '#97796f');
      }
      p.r(12, 24, 4, 1, '#dbab88');
      p.r(24, 12, 4, 1, '#cda181');
      p.r(27, 36, 5, 1, '#cda181');
      p.r(4, 44, 36, 3, '#75656d');
      p.r(4, 44, 35, 1, '#d6a587');
      p.poly([0, 0, 44, 0, 44, 3, 41, 6, 3, 6, 0, 4], ink);
      p.r(1, 1, 42, 2, '#e3bb93');
      p.r(1, 1, 41, 1, '#f1cf9b');
      p.r(3, 3, 38, 1, '#ac8b83');
    });
  }

  function basketWire() {
    return sprite('basketWire', 47, 42, (p) => {
      p.line(21, 3, 3, 41, '#6c6370');
      p.line(26, 3, 44, 41, '#645d6c');
      p.line(24, 4, 42, 41, '#c19e85');
      p.r(21, 0, 6, 3, plum);
      p.r(22, 0, 4, 1, '#ac9e94');
      p.r(21, 1, 2, 2, '#8b8789');
      p.r(24, 1, 2, 2, '#8b8789');
      p.r(22, 3, 4, 1, '#605e6c');
    });
  }

  function basket() {
    return sprite('basket', 47, 18, (p) => {
      p.poly([0, 0, 47, 0, 47, 3, 44, 5, 40, 15, 37, 17, 9, 17, 6, 15, 3, 5, 0, 3], ink);
      p.poly([4, 4, 43, 4, 39, 14, 37, 15, 10, 15, 8, 14], '#b18a60');
      const cols = ['#947052', '#d9aa71', '#c99b6a'];
      for (let y = 5; y < 15; y++)
        for (let x = 6; x < 42; x++) {
          if (x < 5 + Math.floor((y - 4) / 3) || x > 41 - Math.floor((y - 4) / 3)) continue;
          const xx = x - Math.floor(y / 4);
          p.dot(x, y, y % 3 === 0 ? cols[0] : xx % 5 === 0 ? cols[1] : cols[2]);
        }
      p.r(1, 1, 45, 2, '#e4b681');
      p.r(2, 1, 43, 1, '#f4ce91');
      p.r(4, 3, 39, 1, '#826b60');
      p.r(29, 1, 10, 8, '#718f89');
      p.r(30, 2, 8, 6, '#91afa0');
      p.r(30, 5, 8, 1, '#d9caa0');
      p.r(30, 9, 3, 1, '#617f80');
      p.r(35, 8, 3, 1, '#617f80');
    });
  }

  // The center and the two open sidelines share a pixel grid. Only these outer
  // neighborhoods repeat when the viewport extends beyond the painted panorama.
  const wing = 246,
    above = 112,
    below = 133;

  function sidelines(p, laundry) {
    const tone = laundry ? '#84757c' : '#778373';
    for (const [x, lean] of [
      [-43, -4],
      [445, 5],
    ]) {
      p.poly([x - 2, 134, x + lean - 1, -46, x + lean + 1, -46, x + 1, 134], tone);
      p.r(x + lean - 3, -46, 7, 2, tone);
    }
    const cord = laundry ? '#8e7c83' : '#80928b';
    const tie = laundry ? '#776774' : '#645c64';
    const points = [-47, -45, 16, -37, 100, -31, 165, -28, 207, -27, 239, -28, 333, -32, 402, -38, 450, -45];
    for (let i = 2; i < points.length; i += 2) p.line(...points.slice(i - 2, i + 2), cord);
    p.line(laundry ? 128 : 127, laundry ? -2 : -1, 165, -28, tie);
    p.line(laundry ? 273 : 290, laundry ? -3 : -1, 239, -28, tie);
    p.line(-47, laundry ? 13 : -16, laundry ? -3 : -8, laundry ? 29 : 6, tie);
    p.line(405, laundry ? 25 : 14, 449, laundry ? 11 : -4, tie);
    if (laundry) {
      p.line(-45, 64, -4, 76, '#8b7d82');
      p.line(403, 78, 448, 65, '#8b7d82');
    }
  }

  function widerGarden(p) {
    const left = -wing,
      right = W + wing,
      bottom = H + below;
    p.r(left, -above, right - left, bottom + above, '#8bbfc2');
    p.poly([left, 74, -120, 70, 0, 78, 400, 68, 521, 75, right, 69, right, 150, left, 150], '#a8ccbd');
    cloud(p, -198, 30, 0.83, '#e6e8c9', '#b9cfc0', cream);
    cloud(p, 485, 9, 1.1, '#eeebcf', '#bdd3c1', cream);
    cloud(p, 73, -77, 0.76, '#c4d9ce', '#a0c8c6', '#d6e4d5', true);
    birds(p, -92, 45, '#7da2a0');
    birds(p, 469, -48, '#8caeab');
    const rng = random(3139);
    for (let x = left - 22; x < right; x += 37) {
      crown(
        p,
        x,
        82 + Math.floor(rng() * 9),
        56,
        35,
        ['#88aa94', '#97b49a', '#abc3a2', '#b6c9a5'],
        rng() > 0.5,
      );
    }
    for (const [x, y, w] of [
      [-227, 97, 43],
      [-163, 92, 52],
      [-84, 98, 42],
      [411, 99, 50],
      [474, 92, 43],
      [558, 96, 51],
    ]) {
      house(p, x, y, w, '#82938b', '#c2c3a2', '#9ea88e');
      if (w > 48) gable(p, x + 12, y - 6, '#809388', '#c2c2a1', '#a0a891');
    }
    for (let x = left - 15; x < right; x += 35) {
      crown(
        p,
        x,
        100 + Math.floor(rng() * 8),
        49,
        33,
        ['#688b78', '#789b7f', '#91ac88', '#a1b28b'],
        rng() > 0.5,
      );
    }
    sidelines(p, false);
    for (const x of [-208, -111, 500, 611]) {
      trunk(p, x, 144, 1, '#657464', '#918f70');
      crown(p, x - 31, 58 + Math.round(rng() * 12), 65, 51, ['#596f68', '#708c71', '#8da67b', '#aabd91']);
    }
    for (const offset of [-W, W]) {
      p.g.save();
      p.g.translate(offset, 0);
      fence(p);
      p.g.restore();
    }
    p.r(left, 142, right - left, bottom - 142, '#91a779');
    for (const [a, b, c] of [
      [147, 148, '#849a70'],
      [171, 160, '#78916c'],
      [208, 181, '#6d8466'],
    ]) {
      p.poly(
        [left, a - 4, -116, a + 2, 0, a, W, b, 498, b + 3, right, b - 1, right, bottom, left, bottom],
        c,
      );
    }
    for (let i = 0; i < 325; i++) {
      const x = left + Math.floor(rng() * (right - left)),
        y = 147 + Math.floor(rng() * (bottom - 147));
      if (i % 5 === 0) grass(p, x, y, 1, '#627b5e', '#90a171');
      else if (i % 19 === 0) flower(p, x, y, '#d6cfa0', false);
      else p.r(x, y, 2 + Math.floor(rng() * 5), 1, i % 2 ? '#758b68' : '#697f63');
    }
    // Continue the four specific A-frame members off the old crop and bury
    // their bevelled ends in the lawn.
    for (const [xl, xr, dx, h, front] of [
      [162, 184, 8, 10, 0],
      [210, 230, -8, 10, 0],
      [93, 115, -20, 26, 1],
      [285, 309, 21, 26, 1],
    ]) {
      p.disk(Math.round((xl + xr) / 2 + dx + 5), 226 + h, front ? 23 : 17, 2, '#62795e');
      p.poly(
        [xl, 226, xr, 226, xr + dx, 226 + h, xl + dx + 2, 227 + h, xl + dx, 225 + h],
        front ? ink : '#634e48',
      );
      p.poly(
        [xl + (front ? 3 : 2), 226, xr - (front ? 2 : 4), 226, xr + dx - 3, 224 + h, xl + dx + 3, 225 + h],
        front ? '#b27a52' : '#84634d',
      );
      if (front) {
        const stripe = dx < 0 ? 6 : 14;
        p.poly(
          [xl + stripe, 226, xl + stripe + 4, 226, xl + stripe + dx + 4, 224 + h, xl + stripe + dx, 224 + h],
          '#d69a61',
        );
        grass(p, xl + dx + 3, 228 + h, 1, '#536f59', '#92a173');
      }
    }
    buildPicnic(p);
  }

  function widerCity(p) {
    const left = -wing,
      right = W + wing,
      bottom = H + below;
    p.r(left, -above, right - left, bottom + above, '#e4a58e');
    for (const [a, b, tone] of [
      [24, 22, '#e9ad90'],
      [40, 36, '#edb68e'],
      [55, 50, '#efbf93'],
      [69, 63, '#f3c895'],
    ]) {
      p.poly(
        [left, a - 1, -98, a + 2, 0, a, W, b, 512, b - 3, right, b + 1, right, bottom, left, bottom],
        tone,
      );
    }
    cloud(p, -174, 32, 0.74, '#edc1a1', '#d7a799', '#f3ccaa');
    cloud(p, 483, 44, 0.99, '#f3c9a4', '#dcad97', '#f9d5a7');
    cloud(p, 143, -64, 0.73, '#e9b49f', '#daa195', '#efbfa7', true);
    birds(p, 523, 9, '#bb9890');
    const rng = random(3221);
    for (const [base, colors, detail] of [
      [95, ['#c7aa9a', '#d6b5a0', '#bea499', '#ddbea6'], false],
      [118, ['#a89494', '#bb9f96', '#9f8c91', '#c7aaa0'], true],
      [157, ['#84838a', '#a39592', '#777987', '#b6a196'], true],
    ]) {
      let x = left - 14;
      while (x < right) {
        const w = 16 + Math.floor(rng() * 25),
          y = base + Math.round(rng() * 17 - 8);
        cityBuilding(p, x, y, w, bottom, colors, detail);
        if (base === 118 && w > 34) tower(p, x + 12, y - 2);
        x += w;
      }
    }
    sidelines(p, true);
    buildLaundry(p, bottom);
    // Rows of distant windows end at the far pavement. Slant the cobbles
    // into the street so this plane reads behind the foreground rooftops.
    const street = [
      left,
      259,
      -143,
      255,
      -51,
      254,
      52,
      249,
      139,
      248,
      233,
      243,
      328,
      242,
      401,
      238,
      513,
      237,
      right,
      232,
    ];
    p.poly([...street, right, bottom, left, bottom], '#8d8890');
    const gutter = street.map((v, i) => (i % 2 ? v + 9 : v));
    p.poly([...gutter, right, bottom, left, bottom], '#817f89');
    for (let i = 0; i < 145; i++) {
      const x = left + Math.floor(rng() * (right - left)),
        y = 262 + Math.floor(rng() * (bottom - 262));
      p.r(x, y, 2 + Math.floor(rng() * 7), 1, i % 3 ? '#87838c' : '#797984');
    }
    for (const [x, y] of [
      [-181, 291],
      [-62, 278],
      [179, 295],
      [392, 264],
      [505, 311],
    ]) {
      p.disk(x, y, 11, 3, '#767781');
      p.r(x - 8, y + 2, 13, 1, '#989098');
      for (let k = -5; k < 6; k += 3) p.r(x + k, y - 1, 1, 2, '#918b93');
    }
    for (const [x, cool] of [
      [43, false],
      [227, true],
    ]) {
      const dark = cool ? '#65767a' : '#946f6e',
        shade = cool ? '#576771' : '#80636b';
      p.poly([x + 8, 268, x + 121, 269, x + 134, 275, x + 161, 280, x + 35, 280, x - 3, 274], '#777580');
      p.r(x + 4, 226, 122, 9, dark);
      p.r(x + 7, 234, 117, 28, shade);
      p.r(x + 8, 262, 114, 13, shade);
      for (let bx = 12; bx < 112; bx += 24) {
        p.r(x + bx, 240, 12, 16, cool ? '#556370' : '#765f69');
        p.r(x + bx + 1, 241, 2, 13, cool ? '#738186' : '#9b7973');
        p.r(x + bx, 257, 13, 1, dark);
      }
      p.r(x + 9, 271, 112, 4, cool ? '#576572' : '#7d646c');
    }
  }

  // A repeating riverbank sits behind one bandstand. Only the central pavilion has a moon and a bell.
  function riverbank() {
    return sprite('moonbell-river', 400, 320, p => {
      p.g.translate(0, 64);
      const rng = random(3349);
      const bands = [[-64,41,'#282640'],[-23,46,'#302d49'],[23,36,'#3c3552'],[59,31,'#51405b'],
        [90,21,'#674d65'],[111,22,'#805e72'],[133,15,'#987781']];
      for (const [y,h,c] of bands) p.r(0,y,400,h,c);
      for (let i=0; i<105; i++) {
        const x=Math.floor(rng()*400), y=Math.floor(rng()*149)-62;
        const color=i%5 ? '#817592' : '#c2adac';
        p.dot(x,y,color);
        if (!(i%22)) { p.r(x-1,y,3,1,color); p.r(x,y-1,1,3,color); p.dot(x,y,'#f5d29d'); }
      }
      for (const [x,y,w] of [[8,83,36],[29,86,24],[118,68,48],[126,66,15],[263,86,31],[350,62,36]])
        p.r(x,y,w,1,'#70566f');
      // Houses on the other bank, loosely packed around two slender mill stacks.
      for (let x=-6; x<400;) {
        const w=7+Math.floor(rng()*17), y=110+Math.floor(rng()*19);
        p.r(x,y,w,143-y,'#55455e');
        if (rng()<0.55) p.poly([x-1,y,x+w/2,y-4,x+w+1,y],'#55455e');
        for (let bx=x+2; bx<x+w-1; bx+=4)
          if (rng()>0.49) p.r(bx,y+3+Math.floor(rng()*4),2,2,rng()>0.4?'#b99283':'#816d78');
        x+=w-1;
      }
      for (const x of [45,336]) { p.r(x,103,3,30,'#52445e'); p.r(x-1,103,5,2,'#64516a'); }
      p.r(0,137,400,6,'#514659'); p.r(0,143,400,27,'#715e75');
      p.r(0,144,400,1,'#a18085'); p.r(0,159,400,9,'#65576c');
      for (let i=0;i<93;i++) p.r(rng()*398,146+rng()*18,2+rng()*9,1,i%4?'#807080':'#a28485');
      const tree = (x,y,w,h) => {
        p.r(x-1,y,3,h,'#383a4e');
        p.disk(x,y,w,Math.round(w*0.8),'#454356');
        p.disk(x-2,y-3,w-2,Math.max(2,Math.round(w*0.55)),'#514959');
      };
      for (let x=0;x<=400;x+=16) tree(x,163-Math.floor(rng()*9),7+Math.floor(rng()*8),25);
      p.r(0,174,400,82,'#383848'); p.r(0,177,400,10,'#474354');
      for (let i=0;i<160;i++) p.r(rng()*399,188+rng()*68,1+rng()*4,1,i%3?'#404050':'#454453');
      // Park fence and lamps stay lower and dimmer than the fighting platforms.
      p.r(0,171,400,1,'#4b4656'); p.r(0,173,400,1,'#302f43');
      for (let x=4;x<400;x+=12) p.r(x,169,1,8,'#363646');
      for (const x of [54,345]) {
        p.r(x,145,2,31,'#363448'); p.r(x-3,143,8,2,'#484051'); p.r(x-2,137,6,6,'#806674');
        p.r(x-1,138,4,4,'#d4aa8d'); p.r(x,138,2,3,'#f2d49e'); p.r(x-3,136,8,1,'#454052');
        p.r(x-1,134,4,2,'#514858'); p.dot(x,133,'#5b4f5c');
      }
    });
  }
  function bandstandPavilion() {
    return sprite('moonbell-pavilion',400,225,p => {
      const moonX=37, moonY=86;
      p.disk(moonX,moonY,16,16,'#827187'); p.disk(moonX,moonY,14,14,'#dfbc9c');
      p.disk(moonX,moonY-1,13,13,'#ffe2aa');
      for (const [dx,dy,w] of [[-7,-5,3],[4,-9,2],[-9,4,2],[5,6,4],[3,8,3]]) p.r(moonX+dx,moonY+dy,w,1,'#edca9f');
      // Patinated copper roof seen from the front, with an open bell cupola.
      const eaves=[54,77,84,68,130,56,170,43,188,35,212,35,230,43,270,56,316,68,346,77];
      p.poly(eaves.concat([346,80,54,80]),'#4a4c62');
      p.poly([55,77,137,59,190,37,199,37,168,59,119,74], '#656077');
      p.poly([121,75,167,60,199,37,201,37,200,71], '#586074');
      p.poly([202,37,211,37,233,45,266,57,308,70,344,77,279,73,239,60], '#55536b');
      for (const [x,y] of [[80,76],[128,74],[200,72],[272,74],[320,76]]) {
        p.line(x,y,200+(x-200)*0.35,56,'#727084');
        p.line(200+(x-200)*0.35,56,200+(x-200)*0.085,38,'#6a687f');
      }
      p.r(54,77,292,3,'#575366'); p.r(54,77,292,1,'#8b7279');
      p.r(61,80,278,3,'#514a5f');
      for (let x=65;x<338;x+=10) { p.r(x,83,5,2,'#64596b'); p.r(x+1,85,3,1,'#615466'); }
      for (const x of [73,323]) {
        const side=x<200?1:-1;
        p.r(x,83,5,84,'#555064'); p.r(x,85,1,78,'#797081'); p.r(x+3,85,2,79,'#44475c');
        p.line(x+2,100,x+2+22*side,82,'#666072'); p.line(x+2,103,x+2+25*side,83,'#514c60');
        p.r(x-1,88,7,2,'#736774'); p.r(x-1,153,7,2,'#6b606e');
      }
      p.r(187,34,26,3,'#83727b'); p.r(188,22,3,12,'#726679'); p.r(209,22,3,12,'#726679');
      p.r(190,21,20,2,'#4c475e'); p.r(199,22,2,4,'#988174');
      p.poly([198,24,202,24,203,26,203,29,206,32,194,32,197,29,197,26],'#c49b79');
      p.r(195,31,10,1,'#efd19a'); p.r(199,32,2,2,'#b48f77');
      p.poly([184,21,190,18,196,14,200,11,204,14,210,18,216,21], '#737486');
      p.r(184,21,32,1,'#a28a89'); p.r(199,7,2,6,'#a58a80'); p.dot(200,6,'#e4bd91');
      // The cable sags between trusses. The tiny bulbs have warm glass and dark socket caps.
      const cable=[[77,83],[106,90],[135,92],[166,88],[200,81],[234,88],[265,92],[294,90],[323,83]];
      for (let i=1;i<cable.length;i++) {
        const [x,y]=cable[i-1], [xx,yy]=cable[i]; p.line(x,y,xx,yy,'#504456');
        for (const fraction of [0.28,0.75]) {
          const bx=Math.round(x+(xx-x)*fraction), by=Math.round(y+(yy-y)*fraction);
          p.r(bx,by,1,3,'#574b5c'); p.r(bx-1,by+3,3,2,'#ba8e75'); p.dot(bx,by+3,'#ffe1a3');
        }
      }
      for (const [x,dir] of [[84,1],[316,-1]]) {
        p.poly([x,174,x+9*dir,174,x+40*dir,218,x+32*dir,218],'#403a4c');
        p.line(x+7*dir,176,x+35*dir,216,'#67545d'); p.r(x-3,174,7,48,'#4d424f');
        p.r(x-2,174,2,47,'#71575e'); p.r(x-5,220,11,3,'#48404d');
      }
      // The house band is small and in the cool light behind the playable deck.
      const bandColors={a:'#484253',b:'#645766',c:'#8b7378',d:'#af8e83',e:'#615768',f:'#827384',h:'#b09989'};
      const hound=['.....aaa.....','...aafffa....','..affffffa...','..aaaahhaa...','...abdbdc....',
        '...abdcddd...','...abccddda..','...abbccaa...','....beee.....','...beefec....',
        '..beeeeffb...','..beeeefcc...','...beeeeb....','...beeeeb....'];
      mapSprite(p,149,142,hound,bandColors);
      mapSprite(p,236,141,hound,bandColors,true);
      // Upright bass, including the scroll, fingerboard, bridge and the player's bow hand.
      p.line(141,157,149,137,'#594759'); p.line(142,157,150,137,'#9c7c78');
      p.r(149,135,3,3,'#9f807a'); p.dot(151,135,'#ccb095');
      p.poly([140,145,144,145,145,149,143,151,144,154,146,156,145,160,134,160,133,157,135,153,137,152,137,148], '#594958');
      p.poly([140,146,143,146,143,149,141,152,143,155,144,157,143,160,136,160,135,157,138,152,138,149], '#a17e75');
      p.line(142,150,139,157,'#615261'); p.r(138,156,5,1,'#c09d84');
      p.dot(136,155,'#684f60'); p.dot(143,153,'#684f60'); p.line(150,151,143,151,'#b4998b');
      // Bell-front cornet and a folded sheet on each music stand.
      p.line(238,147,229,151,'#ab9281'); p.line(237,149,230,152,'#705f6b');
      p.poly([232,150,229,149,226,148,227,153,229,154],'#b29883');
      p.line(226,148,228,154,'#d1b293'); p.r(232,150,3,3,'#9d847b');
      for(const x of [161,229]) {
        p.r(x,151,1,9,'#5e5362');
        p.poly([x-5,149,x+4,148,x+3,152,x-6,153],'#6e6271');
        p.line(x-4,149,x+3,148,'#bd9f92'); p.r(x-4,150,3,1,'#9c8790');
      }
      // The bass drum's painted crescent echoes the moon over the river.
      p.disk(200,157,10,9,'#524857'); p.disk(200,157,9,8,'#a3867d'); p.disk(200,157,7,7,'#776779');
      p.disk(199,156,4,4,'#c2a289'); p.disk(201,154,3,3,'#776779');
      for(const x of [189,210]) { p.line(x,159,x-2,160,'#8e7680'); p.dot(x,154,'#b59486'); }
      p.r(185,150,6,3,'#887181'); p.r(185,150,6,1,'#b09289');
      p.r(210,148,1,9,'#7c6c7a'); p.disk(211,147,5,1,'#a38b81');
      // Pleated fabric and its stitched edge hang below the front of the deck.
      for (let x=106;x<290;x+=32) {
        p.poly([x,174,x+32,174,x+30,178,x+24,182,x+17,184,x+11,183,x+5,180], '#6c4e61');
        p.poly([x+2,174,x+9,174,x+12,181,x+6,178], '#865f6a');
        p.line(x+5,179,x+14,183,'#99766f'); p.line(x+15,183,x+23,181,'#a98475');
        p.line(x+24,181,x+31,176,'#85666a');
      }
    });
  }
  function bandstandDeck(w,thin) {
    return sprite('moonbell-deck-'+w+'-'+thin,w,thin?6:15,p => {
      // Brass edging marks the exact walkable lip. Dark cutouts keep the wings light enough to read through.
      p.r(0,0,w,thin?3:5,'#352e40'); p.r(0,0,w,1,'#ffdfa0');
      p.r(1,1,w-2,1,'#cb895e'); p.r(3,0,w-6,1,thin?'#efbe80':'#f0b676');
      if (thin) {
        p.r(2,3,w-4,1,'#95615d'); p.r(4,4,w-8,1,'#4c394d');
        for (let x=8;x<w-4;x+=12) { p.r(x,3,2,2,'#b67e66'); p.dot(x,5,'#554155'); }
      } else {
        p.r(1,3,w-2,5,'#8e5554'); p.r(1,4,w-2,2,'#ad6a58'); p.r(3,8,w-6,4,'#684555');
        for (let x=5;x<w-6;x+=16) {
          p.r(x,3,1,4,'#754952'); p.r(x+4,6,5,1,'#9d6156');
          p.r(x+3,8,9,2,'#443846'); p.dot(x+7,8,'#b2826b');
        }
        p.r(6,12,w-12,3,'#453545'); p.r(6,12,w-12,1,'#9f6c5d');
        for (const x of [1,w-4]) { p.r(x,2,3,5,'#d5a271'); p.dot(x+1,4,'#70505a'); }
      }
    });
  }
  function drawBandstand(ctx, seconds, b) {
    const bank=riverbank(), area=b || { left:0, top:0, right:1200, bottom:675 };
    ctx.fillStyle='#282640'; ctx.fillRect(area.left,area.top,area.right-area.left,area.bottom-area.top);
    for (const upper of [true,false]) {
      const start=upper?area.top:Math.max(768,area.top), end=upper?Math.min(-192,area.bottom):area.bottom;
      if (end<=start) continue;
      const tile=sprite(upper?'moonbell-sky':'moonbell-lawn',152,80,p => {
        const rng=random(upper?174:317); p.r(0,0,152,80,upper?'#282640':'#383848');
        for (let i=0;i<(upper?20:54);i++) p.r(rng()*151,rng()*79,upper?1:3,1,upper?'#786d88':'#414151');
      });
      ctx.save(); ctx.beginPath(); ctx.rect(area.left,start,area.right-area.left,end-start); ctx.clip();
      for (let y=Math.floor(start/240)*240;y<end;y+=240)
        for (let x=Math.floor(area.left/456)*456;x<area.right;x+=456) ctx.drawImage(tile,x,y,456,240);
      ctx.restore();
    }
    for (let x=Math.floor(area.left/1200)*1200;x<area.right;x+=1200) ctx.drawImage(bank,x,-192,1200,960);
    ctx.drawImage(bandstandPavilion(),0,0,1200,675);
    const floors=window.DogFight.platforms('bandstand',0);
    for (const p of floors) {
      const w=p.x2-p.x1, art=bandstandDeck(w/3,p.thin);
      ctx.drawImage(art,p.x1,p.y,w,art.height*3);
    }
    // Two moths circle the outer lamps, well clear of the fighters.
    for (const x of [54,345]) {
      const t=seconds*1.8+x, dx=Math.round(Math.sin(t)*5), dy=Math.round(Math.cos(t*1.7)*3);
      ctx.fillStyle='#ead3a9'; ctx.fillRect((x+dx)*3,(136+dy)*3,3,3);
    }
  }

  function surroundings(ctx, key, b) {
    const laundry = key === 'laundry',
      edge = wing * 3,
      top = -above * 3,
      bottom = (H + below) * 3;
    const art = sprite(key + '-surroundings', W + 2 * wing, H + above + below, (p) => {
      p.g.translate(wing, above);
      if (laundry) widerCity(p);
      else widerGarden(p);
    });
    if (b.top < top || b.bottom > bottom) {
      for (const high of [true, false]) {
        const begin = high ? b.top : Math.max(bottom, b.top);
        const end = high ? Math.min(top, b.bottom) : b.bottom;
        if (end <= begin) continue;
        const tile = sprite(key + (high ? '-height' : '-depth'), 256, 96, (p) => {
          const rng = random(high ? 990 : 112);
          p.r(0, 0, 256, 96, high ? (laundry ? '#e4a58e' : '#8bbfc2') : laundry ? '#817f89' : '#6d8466');
          for (let i = 0; i < (high ? 4 : 58); i++) {
            const x = Math.floor(rng() * 237),
              y = Math.floor(rng() * 88);
            if (high) p.r(x, y, 6 + Math.floor(rng() * 12), 1, laundry ? '#eab29b' : '#9fc9c6');
            else if (laundry) p.r(x, y, 3 + Math.floor(rng() * 6), 1, i % 3 ? '#87838c' : '#797984');
            else grass(p, x, y, 1, '#647b5f', '#81946c');
          }
        });
        const anchor = high ? top : bottom,
          w = tile.width * 3,
          h = tile.height * 3;
        for (let y = anchor + Math.floor((begin - anchor) / h) * h; y < end; y += h) {
          for (let x = Math.floor(b.left / w) * w; x < b.right; x += w) ctx.drawImage(tile, x, y, w, h);
        }
      }
    }
    if (b.top >= bottom || b.bottom <= top) return;
    ctx.drawImage(art, -edge, top, art.width * 3, art.height * 3);
    // Only the outer 144 pixels are distant, repeatable neighborhood art.
    const tileWidth = 144,
      stride = tileWidth * 3;
    for (const side of [-1, 1]) {
      const boundary = side < 0 ? -edge : 1200 + edge;
      const reach = side < 0 ? boundary - b.left : b.right - boundary;
      const first = Math.max(0, Math.floor((side < 0 ? boundary - b.right : b.left - boundary) / stride));
      for (let i = first; i * stride < reach; i++) {
        const x = side < 0 ? boundary - (i + 1) * stride : boundary + i * stride;
        ctx.save();
        ctx.translate(i % 2 ? x : x + stride, top);
        if (i % 2 === 0) ctx.scale(-1, 1);
        ctx.drawImage(
          art,
          side < 0 ? 0 : art.width - tileWidth,
          0,
          tileWidth,
          art.height,
          0,
          0,
          stride,
          art.height * 3,
        );
        ctx.restore();
      }
    }
  }

  const reducedScenery = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)');

  function mailValley() {
    return sprite('mail-valley', 336, 112, p => {
      const rng = random(903);
      const ridge = x => 34 + Math.round(10 * Math.cos(x * Math.PI / 84) + 7 * Math.sin(x * Math.PI / 56));
      for (let x = 0; x < 336; x += 2) {
        const y = ridge(x);
        p.r(x,y,2,112-y,'#655670');
        if (x % 18 < 12) p.r(x,y,2,1,'#897384');
      }
      for (let i = 0; i < 120; i++) {
        const x = Math.floor(rng()*336), y = ridge(x) + 9 + rng()*14;
        p.line(x,y,x+3,y-1,'#726078');
      }
      // A distant ribbon of water winds behind the trees.
      p.poly([0,77,73,74,141,65,234,68,336,57,336,62,234,72,142,68,74,78,0,81], '#aa848e');
      for (let x = 0; x < 336; x += 3) {
        const y = 82 + Math.round(7 * Math.cos(x*Math.PI/56)), h = 2 + Math.floor(rng()*5);
        p.r(x,y,3,112-y,'#46465e');
        p.line(x,y,x+1,y-h,'#46465e');
      }
    });
  }

  function mailStation() {
    return sprite('mail-station', 420, 83, p => {
      const rng = random(706);
      for (let x = 0; x < 420; x += 4) {
        const y = 56 + Math.round(4*Math.cos(x*Math.PI/70)), h = 5 + Math.floor(rng()*16);
        p.r(x,y,4,83-y,'#34384b');
        p.poly([x-3,y,x+1,y-h,x+5,y], '#404355');
        p.poly([x-3,y+3,x+1,y-h+4,x+5,y+3], '#34384b');
      }
      p.r(43,40,43,15,'#48404d'); p.r(38,54,56,3,'#515062');
      p.poly([38,40,47,32,82,32,90,40], '#343849');
      p.line(47,32,82,32,'#7b6974'); p.r(79,27,3,6,'#424253');
      for (const x of [47,55,72,80]) {
        p.r(x,43,4,6,'#c69885'); p.r(x,46,4,1,'#6d5860');
      }
      p.r(63,44,6,11,'#343643'); p.r(65,45,2,3,'#b98a7d');
      // Telegraph wires sag between consecutive poles and meet at the tile seam.
      for (const x of [-12,128,268]) {
        p.line(x,21,x+61,27,'#585266'); p.line(x+61,27,x+80,27,'#585266');
        p.line(x+80,27,x+140,21,'#585266');
      }
      p.line(408,21,420,22,'#585266');
      for (const x of [128,268,408]) {
        p.r(x,18,2,39,'#484451'); p.r(x-4,21,10,2,'#484451');
        p.r(x-3,19,2,2,'#a29299'); p.dot(x+3,20,'#a29299');
      }
    });
  }

  function mailCar() {
    return sprite('mail-car', 294, 48, p => {
      const red = '#963f46', dark = '#572f40', metal = '#484052';
      // Each inset corresponds to a collision band on the outside of the car.
      p.r(0,0,294,4,ink); p.r(0,0,294,1,'#ffe3a6'); p.r(1,1,292,1,'#dfa87d');
      p.r(2,4,290,28,dark); p.r(3,5,288,23,red);
      p.r(3,6,288,1,'#c96959'); p.r(3,25,288,2,'#da9a72');
      p.r(3,28,288,2,'#743447'); p.r(6,32,282,6,ink); p.r(6,32,282,1,'#875b63');
      for (let x = 6; x < 290; x += 9) {
        p.r(x,8,1,16,'#853b45'); p.dot(x,8,'#cf7362'); p.dot(x,23,'#ba5954');
        p.dot(x,30,'#b76a60');
      }
      for (const x of [11,27,43,240,256,272]) {
        p.r(x,9,13,13,dark); p.r(x+1,10,11,9,'#26505c');
        p.r(x+2,11,8,2,'#73a3a0'); p.r(x+2,13,2,4,'#59878b');
        p.r(x+1,19,11,1,'#c38469'); p.r(x+6,10,1,9,metal);
      }
      for (const x of [74,201]) {
        p.r(x-2,6,23,2,ink); p.r(x,8,19,22,dark); p.r(x+1,9,17,20,'#a54b4b');
        for (let y = 11; y < 28; y += 4) p.r(x+2,y,15,1,'#bf6358');
        p.line(x+2,27,x+15,13,'#753a46'); p.r(x+14,16,2,5,'#e3b883');
      }
      // Enamel railway crest: a cream envelope between two feathered wings.
      p.r(123,8,48,16,'#6e3943'); p.r(124,9,46,14,'#854349');
      for (let i = 0; i < 3; i++) {
        p.r(126+i*3,12+i*3,11-i*3,2,'#e4b37c');
        p.r(157,12+i*3,11-i*3,2,'#e4b37c');
      }
      p.r(138,11,18,11,dark); p.r(139,12,16,9,'#ffe1a0');
      p.line(139,12,147,17,'#985850'); p.line(147,17,154,12,'#985850');
      for (const x of [25,237]) {
        p.r(x-4,35,36,5,metal); p.r(x,37,27,3,'#787082');
        for (const hub of [x+1,x+23]) {
          p.disk(hub,40,7,7,ink); p.disk(hub,40,5,5,'#675a69'); p.disk(hub,40,3,3,metal);
          p.dot(hub,40,'#ceb39a');
        }
      }
      for (const x of [3,287]) {
        p.r(x,11,4,6,dark); p.r(x+1,12,2,3,'#ffad69');
      }
    });
  }

  function drawNightMail(ctx, seconds, bounds) {
    const b = bounds || { left:0, top:0, right:1200, bottom:675 };
    const time = reducedScenery?.matches || !Number.isFinite(seconds) ? 0 : seconds;
    function band(start, end, color) {
      const y = Math.max(start,b.top), bottom = Math.min(end,b.bottom);
      if (bottom > y) { ctx.fillStyle = color; ctx.fillRect(b.left,y,b.right-b.left,bottom-y); }
    }
    function repeat(image, y, speed) {
      const width = image.width*3, shift = Math.floor(time*speed/3)*3 % width;
      for (let x = Math.floor((b.left+shift)/width)*width-shift; x < b.right; x += width)
        ctx.drawImage(image,x,y,width,image.height*3);
    }
    band(b.top,150,'#30324b'); band(150,229,'#494660'); band(229,285,'#6c5972');
    band(285,325,'#966f80'); band(325,375,'#c28b88'); band(375,447,'#dca390');
    band(447,b.bottom,'#34384b');
    const sky = sprite('mail-sky', 350, 90, p => {
      const rng = random(279);
      for (let i = 0; i < 65; i++) {
        const x = Math.floor(rng()*350), y = Math.floor(rng()*82);
        p.dot(x,y,i%5 ? '#777289' : '#cbb2ae');
        if (i%19 === 0) p.r(x-1,y,3,1,'#b4a3aa');
      }
    });
    repeat(sky,-80,0);
    const moon = sprite('mail-moon', 22, 24, p => {
      p.disk(11,11,9,10,'#f3cfab');
      p.disk(7,8,8,9,'#30324b');
      p.dot(14,17,'#d9ae9b'); p.r(12,20,2,1,'#d9ae9b');
    });
    ctx.drawImage(moon,903,64,66,72);
    repeat(mailValley(),249,10);
    repeat(mailStation(),345,49);
    // Low embankment sleepers pass below the axles. The roof stays still in world space.
    const ballast = sprite('mail-ballast', 112, 19, p => {
      const rng = random(553);
      p.r(0,1,112,2,'#525063');
      for (let x = 0; x < 112; x += 14) p.poly([x,5,x+6,5,x+2,9,x-4,9],'#514b59');
      for (let i = 0; i < 46; i++) p.r(rng()*112,10+rng()*8,2,1,'#403e50');
    });
    repeat(ballast,596,160);
    const [deck] = window.DogFight.platforms('nightmail',0), car = mailCar();
    const sx = (deck.x2-deck.x1)/car.width;
    ctx.drawImage(car,deck.x1,deck.y,deck.x2-deck.x1,car.height*3);
    const phase = Math.floor(time*9) * Math.PI/4;
    ctx.fillStyle = '#b99b8d';
    for (const hub of [26,48,238,260])
      ctx.fillRect(deck.x1+Math.round((hub+2*Math.cos(phase))*sx),deck.y+(40+Math.round(2*Math.sin(phase)))*3,3,3);
  }

  function canalBank() {
    return sprite('canal-bank', 412, 88, p => {
      const rng = random(831);
      // Pollarded willows, brickwork and moored narrowboats on the far bank.
      for (let x = -10; x < 420; x += 11) {
        const h = 5 + Math.floor(rng() * 10);
        p.disk(x, 52 - h, 12, h, '#8ca998');
        p.r(x - 1, 48 - h, 2, h + 5, '#81998a');
      }
      p.r(0, 52, 412, 7, '#81998a');
      p.r(0, 59, 412, 29, '#709892');
      for (let i = 0; i < 95; i++) p.r(rng()*412, 61+rng()*25, 3+rng()*11, 1, '#88aaa0');
      p.r(83,31,41,24,'#c5b397');
      p.poly([77,32,89,17,117,17,130,32], '#916e61');
      p.line(89,17,117,17,'#ceb691'); p.r(111,11,4,12,'#967b6c'); p.r(110,10,6,2,'#86695e');
      for (const x of [88,98,114]) {
        p.r(x,36,5,8,'#777b73'); p.r(x,36,5,1,'#ad9981'); p.r(x+2,37,1,7,'#b9a58a');
      }
      p.r(102,45,6,10,'#79766a');
      for (const x of [9,147,298]) {
        p.poly([x,62,x+48,62,x+43,66,x+6,66],'#546d67');
        p.r(x+7,56,29,6,'#a57162'); p.r(x+6,55,31,2,'#d0b99a');
        for(let j=11;j<34;j+=7) p.r(x+j,58,3,3,'#ddd0a9');
        p.r(x+31,52,2,4,'#6e766c'); p.r(x+7,68,31,1,'#60877f');
      }
      // A former pumping station with an arched engine-room window.
      p.r(201,27,43,28,'#b48c73');
      p.poly([197,27,222,14,247,27], '#7f7d72');
      p.r(207,11,6,34,'#ad8974'); p.r(206,9,8,3,'#967866');
      for (const x of [217,231]) {
        p.disk(x,37,4,4,'#808981'); p.r(x-4,37,9,11,'#808981');
        p.r(x,35,1,13,'#bba388'); p.r(x-4,40,9,1,'#bba388');
      }
      for (let x=255;x<315;x+=11) { p.r(x,48,2,8,'#737f72'); p.r(x,50,11,1,'#8c9382'); }
    });
  }

  function canalGate() {
    return sprite('canal-gate', 294, 42, p => {
      p.r(0,0,294,5,'#283d42');
      p.r(0,0,294,1,'#bce2c6');
      p.r(2,5,290,29,'#344b4b'); p.r(5,34,284,8,'#314648');
      for (let x=4;x<290;x+=9) {
        p.r(x,6,7,27,x%2 ? '#5b6257' : '#626659');
        p.r(x+1,8+(x%7),1,12,'#797564'); p.r(x+4,26,2,7,'#4b5951');
      }
      for (let x=5;x<288;x+=48) {
        p.poly([x,30,x+42,6,x+47,6,x+47,9,x+5,33,x,33],'#394b49');
        p.line(x+2,30,x+43,7,'#899077');
        p.r(x,4,4,30,'#374d4a'); p.r(x,6,2,26,'#728171');
        p.dot(x+1,9,'#c0aa83'); p.dot(x+1,29,'#c0aa83');
      }
      p.r(2,32,290,2,'#83917a');
      p.r(143,5,8,36,'#34494a'); p.r(147,7,2,33,'#a09472');
      for (const x of [17,271]) {
        p.r(x,9,4,21,'#d8c7a0');
        for (let i=0;i<7;i++) p.r(x,10+i*3,i%2 ? 2 : 3,1,'#656f64');
      }
      for (const x of [4,279]) { p.r(x,1,11,3,'#c7814e'); p.r(x+5,1,3,3,'#514e48'); }
      for(let x=18;x<278;x+=15) p.r(x,2,3,1,'#899988');
    });
  }

  function drawCanal(ctx, seconds, bounds) {
    const b = bounds || {left:0,top:0,right:1200,bottom:675};
    const time = Number.isFinite(seconds) ? seconds : 0;
    const [gate, ferry] = window.DogFight.platforms('canal',time);
    const rect = (x,y,w,h,color) => { ctx.fillStyle=color; ctx.fillRect(x,y,w,h); };
    rect(b.left,b.top,b.right-b.left,b.bottom-b.top,'#bad1ba');
    rect(b.left,210,b.right-b.left,97,'#d8d6b6');
    rect(b.left,307,b.right-b.left,Math.max(0,b.bottom-307),'#709892');
    const bank = canalBank();
    for(let x=Math.floor(b.left/(bank.width*3))*bank.width*3;x<b.right;x+=bank.width*3)
      ctx.drawImage(bank,x,174,bank.width*3,bank.height*3);
    const ripple = sprite('canal-water',132,33,p=>{
      const rng=random(124);
      for(let i=0;i<38;i++){
        const x=rng()*132,y=rng()*33;
        p.r(x,y,2+rng()*9,1,'#84a59a');
        if(i%4===0) p.r(x-2,y+1,3,1,'#658e88');
      }
    });
    const flow = reducedScenery?.matches ? 0 : Math.floor(time*4)%ripple.width*3;
    for(let y=438;y<b.bottom;y+=ripple.height*3)
      for(let x=Math.floor((b.left-flow)/(ripple.width*3))*ripple.width*3+flow;x<b.right;x+=ripple.width*3)
        ctx.drawImage(ripple,x,y,ripple.width*3,ripple.height*3);
    // The trolley follows a taut cable. Only the yellow timber deck is a landing surface.
    rect(24,196,1152,3,'#667a70');
    const tower=sprite('canal-mast',16,96,p=>{
      p.r(7,0,3,96,'#65786b'); p.r(6,3,6,3,'#879383'); p.r(3,1,12,2,'#687a6d');
      p.line(2,95,7,73,'#738575'); p.line(10,73,15,95,'#738575');
      p.r(6,10,4,2,'#a5a389'); p.r(6,60,4,3,'#a5a389');
    });
    for(const x of [0,1152]) ctx.drawImage(tower,x,189,48,288);
    const load=sprite('canal-ferry',64,62,p=>{
      p.r(25,1,14,3,'#4c6059');
      for(const x of [27,36]) {p.disk(x,2,2,2,'#40534f'); p.dot(x,2,'#bcb18b');}
      p.line(27,4,4,55,'#67766a'); p.line(36,4,59,55,'#67766a');
      p.r(0,56,64,4,'#563e38'); p.r(0,56,64,1,'#ffe09a'); p.r(2,57,60,2,'#bd794d');
      for(const x of [3,19,42,58]) {p.r(x,57,3,4,'#604e43'); p.dot(x+1,57,'#efc384');}
      p.r(5,60,54,2,'#404d49');
    });
    ctx.drawImage(load,ferry.x1,ferry.y-168,ferry.x2-ferry.x1,186);
    ctx.drawImage(canalGate(),gate.x1,gate.y,gate.x2-gate.x1,126);
  }

  function draw(ctx, stageId, seconds = 0, bounds) {
    if (stageId === 'canal') {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawCanal(ctx,seconds,bounds);
      ctx.restore();
      return;
    }
    if (stageId === 'nightmail') {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawNightMail(ctx,seconds,bounds);
      ctx.restore();
      return;
    }
    if (stageId === 'bandstand') {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawBandstand(ctx,seconds,bounds);
      ctx.restore();
      return;
    }
    const laundry = stageId === 'laundry',
      key = laundry ? 'laundry' : 'picnic';
    if (!scenes.has(key)) scenes.set(key, laundry ? buildLaundry() : buildPicnic());
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (bounds && (bounds.left < 0 || bounds.top < 0 || bounds.right > 1200 || bounds.bottom > 675))
      surroundings(ctx, key, bounds);
    ctx.drawImage(scenes.get(key), 0, 0, 1200, 675);
    if (laundry) {
      ctx.drawImage(roof(false), 130, 450, 390, 228);
      ctx.drawImage(roof(true), 680, 450, 390, 228);
      ctx.drawImage(chimney(), 805, 310, 130, 141);
      const time = Number.isFinite(seconds) ? seconds : 0;
      const x = 600 + Math.sin(time * 0.7) * 123;
      ctx.drawImage(basketWire(), x - 69.5, 244, 139, 124);
      ctx.drawImage(basket(), x - 69.5, 367, 139, 54);
    } else {
      ctx.drawImage(agility(), 315, 325, 193, 24);
      ctx.drawImage(agility(), 705, 325, 193, 24);
      ctx.drawImage(plank(), 160, 455, 880, 63);
    }
    ctx.restore();
  }

  window.ArenaArt = Object.freeze({ draw });
})();
