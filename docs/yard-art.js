/* The Last Dispatch. One painted pixel spans three world units. */
(() => {
  'use strict';

  const cell = 3;
  const skyWidth = 400;
  const skyHeight = 225;
  const panoramaWidth = 1000;
  const ink = '#252337';
  const cream = '#fff1c7';
  const roomArt = new Map();
  const pieces = new Map();
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  function surface(w, h) {
    const c =
      typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return c;
  }

  // Filling whole cells, including diagonals and silhouettes, keeps every layer on the same grid.
  class Brush {
    constructor(w, h) {
      this.canvas = surface(w, h);
      this.g = this.canvas.getContext('2d');
    }
    r(x, y, w, h, color) {
      if (w <= 0 || h <= 0) return;
      this.g.fillStyle = color;
      this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    dot(x, y, color) {
      this.r(x, y, 1, 1, color);
    }
    line(x, y, u, v, color, weight = 1) {
      x = Math.round(x);
      y = Math.round(y);
      u = Math.round(u);
      v = Math.round(v);
      const dx = Math.abs(u - x),
        dy = -Math.abs(v - y);
      const sx = x < u ? 1 : -1,
        sy = y < v ? 1 : -1;
      let error = dx + dy;
      for (;;) {
        this.r(x, y, weight, weight, color);
        if (x === u && y === v) break;
        const twice = error * 2;
        if (twice >= dy) {
          error += dy;
          x += sx;
        }
        if (twice <= dx) {
          error += dx;
          y += sy;
        }
      }
    }
    poly(points, color) {
      const rows = points.map((p) => p[1]);
      for (let y = Math.floor(Math.min(...rows)); y < Math.max(...rows); y++) {
        const cross = y + 0.5,
          edges = [];
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [x1, y1] = points[j],
            [x2, y2] = points[i];
          if (y1 > cross !== y2 > cross) edges.push(x1 + ((cross - y1) * (x2 - x1)) / (y2 - y1));
        }
        edges.sort((a, b) => a - b);
        for (let i = 0; i + 1 < edges.length; i += 2) {
          const x = Math.ceil(edges[i] - 0.5);
          this.r(x, y, Math.ceil(edges[i + 1] - 0.5) - x, 1, color);
        }
      }
    }
    oval(x, y, rx, ry, color) {
      for (let row = -ry; row <= ry; row++) {
        const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (row / ry) ** 2)));
        this.r(x - span, y + row, span * 2 + 1, 1, color);
      }
    }
  }

  function seeded(seed) {
    let n = seed >>> 0;
    return () => {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      return n / 4294967296;
    };
  }
  function piece(key, w, h, paint) {
    if (!pieces.has(key)) {
      const p = new Brush(w, h);
      paint(p);
      pieces.set(key, p.canvas);
    }
    return pieces.get(key);
  }
  function envelope(p, x, y, w, h, paper, fold, seal) {
    p.r(x, y, w, h, fold);
    p.r(x + 1, y + 1, w - 2, h - 2, paper);
    p.line(x, y, x + Math.floor(w / 2), y + Math.ceil(h * 0.55), fold);
    p.line(x + Math.floor(w / 2), y + Math.ceil(h * 0.55), x + w - 1, y, fold);
    if (seal) p.r(x + Math.floor(w / 2) - 1, y + Math.ceil(h * 0.55), 2, 2, seal);
  }
  function wingedPost(p, x, y, light, shade) {
    for (const s of [-1, 1]) {
      p.line(x + s * 4, y + 1, x + s * 12, y - 2, shade, 2);
      p.line(x + s * 4, y + 1, x + s * 12, y - 3, light);
      p.line(x + s * 5, y + 3, x + s * 10, y + 1, light);
      p.line(x + s * 5, y + 5, x + s * 8, y + 4, shade);
    }
    envelope(p, x - 5, y, 11, 7, light, shade, '#ab6254');
  }
  function pigeon(p, x, y, face = 1, warm = false) {
    const edge = warm ? '#605464' : '#454759',
      breast = warm ? '#a0a0a0' : '#88969f';
    p.g.save();
    p.g.translate(x, y);
    p.g.scale(face, 1);
    p.poly(
      [
        [-6, -2],
        [-4, -3],
        [-2, -5],
        [1, -5],
        [2, -8],
        [5, -8],
        [6, -6],
        [4, -4],
        [4, -2],
        [2, 0],
        [-2, 0],
      ],
      edge,
    );
    p.r(2, -7, 3, 2, breast);
    p.r(5, -6, 2, 1, '#d7ae75');
    p.dot(4, -7, edge);
    p.line(-4, -2, 0, -5, breast);
    p.line(-2, -2, 1, -4, '#6b7280');
    p.r(1, -1, 2, 1, breast);
    p.dot(-1, 0, '#ab836f');
    p.dot(2, 0, '#ab836f');
    p.g.restore();
  }
  function cloud(p, x, y, w, h, top, shadow) {
    const shape = [
      [0, 0.76],
      [0.08, 0.76],
      [0.1, 0.55],
      [0.22, 0.55],
      [0.25, 0.37],
      [0.35, 0.37],
      [0.39, 0.13],
      [0.48, 0.13],
      [0.51, 0],
      [0.61, 0],
      [0.66, 0.26],
      [0.74, 0.26],
      [0.78, 0.55],
      [0.88, 0.55],
      [0.91, 0.74],
      [1, 0.78],
      [1, 0.88],
      [0.82, 0.88],
      [0.76, 1],
      [0.3, 1],
      [0.22, 0.89],
      [0, 0.89],
    ];
    p.poly(
      shape.map(([u, v]) => [x + Math.round(u * w), y + Math.round(v * h)]),
      shadow,
    );
    p.poly(
      shape.slice(0, 19).map(([u, v]) => [x + Math.round(u * w), y + Math.round(v * h * 0.78)]),
      top,
    );
  }
  const skies = {
    alley: ['#7f819e', '#938ca6', '#ab96a3', '#c29d9d', '#d9a697', '#edb58e', '#f1c297', '#f2cc9f'],
    bridge: ['#374768', '#425574', '#516580', '#63778d', '#788999', '#9098a2', '#a6a3a6', '#b9abad'],
    depot: ['#29324c', '#303a54', '#38465d', '#42536a', '#4d6075', '#5c7081', '#687d89', '#758795'],
  };
  function paintSky(room) {
    const p = new Brush(skyWidth, skyHeight),
      band = skies[room];
    p.r(0, 0, skyWidth, skyHeight, band[7]);
    const stops = [0, 19, 36, 53, 71, 88, 105, 123, skyHeight];
    const channels = band.map((hex) => [1, 3, 5].map((a) => parseInt(hex.slice(a, a + 2), 16)));
    for (let i = 0; i < band.length - 1; i++) {
      for (let step = 0; step < 4; step++) {
        const y = Math.round(stops[i] + ((stops[i + 1] - stops[i]) * step) / 4);
        const end = Math.round(stops[i] + ((stops[i + 1] - stops[i]) * (step + 1)) / 4);
        const tone = channels[i].map((a, j) => Math.round(a + ((channels[i + 1][j] - a) * step) / 4));
        p.r(0, y, skyWidth, end - y, 'rgb(' + tone.join(',') + ')');
      }
    }
    const rng = seeded(room === 'alley' ? 5 : 18);
    if (room === 'alley') {
      p.oval(292, 64, 22, 22, '#eabb92');
      p.oval(292, 63, 20, 20, '#ffd69b');
      p.oval(290, 61, 15, 16, '#ffe2ac');
      p.r(267, 70, 43, 2, '#edb593');
      p.r(277, 77, 30, 2, '#e2ab95');
      cloud(p, -17, 28, 98, 12, '#ccacac', '#aba0ac');
      cloud(p, 87, 10, 57, 8, '#b8a5b2', '#9e98ac');
      cloud(p, 180, 44, 68, 9, '#e3b8a5', '#cda7a4');
      cloud(p, 317, 37, 90, 13, '#d8b3ad', '#bd9fa6');
      p.r(27, 56, 32, 1, '#cba7aa');
      p.r(231, 23, 22, 1, '#b09da9');
      p.r(244, 21, 12, 1, '#b09da9');
      p.r(120, 66, 47, 1, '#dbaba3');
    } else {
      const moonX = room === 'bridge' ? 97 : 244,
        moonY = room === 'bridge' ? 43 : 31;
      for (let y = -10; y <= 10; y++)
        for (let x = -10; x <= 10; x++) {
          if (x * x + y * y <= 100 && (x + 4) ** 2 + (y + 3) ** 2 > 81)
            p.dot(moonX + x, moonY + y, room === 'bridge' ? '#cbd1c0' : '#b8c9c4');
        }
      for (let i = 0; i < 35; i++) {
        const x = Math.floor(rng() * 398),
          y = Math.floor(rng() * 75);
        if (Math.abs(x - moonX) > 15 || Math.abs(y - moonY) > 15) p.dot(x, y, i % 5 ? '#8193a1' : '#c1c1b1');
      }
      cloud(p, 9, 66, 88, 7, band[4], band[3]);
      cloud(p, 148, 40, 62, 7, band[3], band[2]);
      cloud(p, 305, 58, 107, 10, band[4], band[3]);
    }
    return p.canvas;
  }
  function cityTower(p, x, y, base, roof, light, kind) {
    if (kind === 0) {
      p.r(x - 8, y, 17, 45, base);
      p.r(x - 10, y + 3, 21, 3, roof);
      p.poly(
        [
          [x - 10, y + 1],
          [x - 6, y - 5],
          [x - 4, y - 7],
          [x - 4, y - 10],
          [x + 5, y - 10],
          [x + 6, y - 5],
          [x + 11, y + 1],
        ],
        roof,
      );
      p.r(x, y - 17, 1, 8, roof);
      p.oval(x, y + 10, 4, 4, roof);
      p.oval(x, y + 10, 3, 3, light);
      p.line(x, y + 8, x, y + 10, roof);
      p.line(x, y + 10, x + 2, y + 11, roof);
      p.r(x - 4, y + 21, 2, 7, roof);
      p.r(x + 2, y + 21, 2, 7, roof);
    } else {
      p.r(x - 11, y, 21, 15, base);
      p.poly(
        [
          [x - 13, y],
          [x - 3, y - 6],
          [x + 3, y - 6],
          [x + 13, y],
        ],
        roof,
      );
      p.r(x - 12, y + 13, 23, 2, roof);
      p.line(x - 8, y + 15, x - 12, y + 37, roof);
      p.line(x + 7, y + 15, x + 11, y + 37, roof);
      p.line(x - 9, y + 20, x + 9, y + 32, roof);
      p.line(x + 8, y + 19, x - 10, y + 31, roof);
      p.r(x - 8, y + 4, 15, 1, light);
    }
  }
  function farTown(room) {
    const p = new Brush(panoramaWidth, skyHeight),
      rng = seeded(room === 'alley' ? 109 : 217);
    const warm = room === 'alley';
    const hilly = warm ? '#b39ba0' : room === 'bridge' ? '#85899e' : '#637388';
    const far = warm ? '#a28d99' : room === 'bridge' ? '#737f94' : '#57677b';
    const roof = warm ? '#948592' : room === 'bridge' ? '#68788e' : '#4c5e72';
    const near = warm ? '#988390' : room === 'bridge' ? '#64758a' : '#46596e';
    const light = warm ? '#c6a097' : room === 'bridge' ? '#b8a999' : '#869798';
    const hills = [[0, 125]];
    for (let x = 0; x <= panoramaWidth + 25; x += 17)
      hills.push([x, 108 + Math.round(9 * Math.sin(x / 73) + 4 * Math.sin(x / 21) + rng() * 3)]);
    hills.push([panoramaWidth + 25, 225], [0, 225]);
    p.poly(hills, hilly);
    let x = -5;
    while (x < panoramaWidth) {
      const w = 9 + Math.floor(rng() * 17),
        base = 126 + Math.floor(rng() * 14),
        h = 14 + Math.floor(rng() * 22);
      const y = base - h;
      p.r(x, y, w, 86, far);
      if (rng() > 0.5)
        p.poly(
          [
            [x - 1, y],
            [x + w * 0.38, y - 4 - Math.round(rng() * 4)],
            [x + w + 1, y],
          ],
          far,
        );
      if (rng() > 0.56) {
        p.r(x + w - 5, y - 9, 3, 10, far);
        p.r(x + w - 6, y - 10, 5, 2, far);
      }
      if (rng() > 0.52) p.r(x + 4, y + 5, 2, 3, light);
      x += w + 2 + Math.floor(rng() * 4);
    }
    for (const [at, top, kind] of [
      [69, 97, 1],
      [192, 82, 0],
      [296, 103, 1],
      [455, 92, 0],
      [591, 90, 1],
      [770, 82, 0],
      [925, 91, 1],
    ])
      cityTower(p, at, top, far, roof, light, kind);
    x = -7;
    while (x < panoramaWidth) {
      const w = 16 + Math.floor(rng() * 29),
        y = 128 + Math.floor(rng() * 20);
      p.r(x, y, w, 100, near);
      const teeth = Math.floor(w / 8);
      for (let i = 0; i < teeth; i++)
        p.poly(
          [
            [x + i * 8, y],
            [x + i * 8 + 7, y - 5],
            [x + i * 8 + 7, y],
          ],
          near,
        );
      for (let i = 5; i < w - 4; i += 8)
        if (rng() > 0.38) {
          p.r(x + i, y + 5, 3, 2, light);
          if (rng() > 0.58) p.r(x + i, y + 10, 3, 2, light);
        }
      x += w + 2;
    }
    return p.canvas;
  }
  function masonry(p, x, y, w, h, seed, mortar, edge) {
    const rng = seeded(seed);
    for (let row = 0; row < h; row += 5) {
      for (let j = row % 10 ? 2 : 8; j < w - 2; j += 11) {
        if (rng() > 0.7) {
          const span = Math.min(w - j - 1, 4 + Math.floor(rng() * 5));
          p.r(x + j, y + row, span, 1, mortar);
          if (rng() > 0.48 && row + 3 < h) p.r(x + j, y + row + 1, 1, 2, mortar);
          if (rng() > 0.71 && row > 1) p.r(x + j + 2, y + row - 2, 3, 1, edge);
        }
      }
    }
  }
  function tenementWindow(p, x, y, w, h, shade, wall, light, lit, blind) {
    p.r(x - 1, y - 1, w + 2, h + 3, shade);
    p.r(x + 1, y + 1, w - 2, h - 2, lit ? light : wall);
    if (blind) {
      p.r(x + 1, y + 1, w - 2, Math.floor(h * 0.39), '#ab8580');
      p.r(x + 1, y + Math.floor(h * 0.39), w - 2, 1, shade);
    } else if (lit) p.r(x + 1, y + 2, 2, h - 4, '#caa38c');
    p.r(x + Math.floor(w * 0.53), y, 1, h, shade);
    p.r(x, y + Math.floor(h * 0.5), w, 1, shade);
    p.r(x - 2, y + h + 1, w + 4, 1, '#b19389');
  }
  function alleyHouse(p, x, y, w, style, seed) {
    const colors = [
      ['#ac8380', '#94757a', '#7f6d77', '#786976', '#c59886'],
      ['#a28a84', '#8f7b7b', '#7c7279', '#7b7079', '#c8a08b'],
      ['#a18184', '#8d747e', '#756a78', '#756778', '#bf9589'],
      ['#a38c81', '#928078', '#817779', '#7c7174', '#c4a58b'],
    ][style % 4];
    const [face, side, roof, window, light] = colors;
    const rng = seeded(seed),
      depth = 8 + (seed % 5);
    p.r(x, y, w, 225 - y, face);
    p.poly(
      [
        [x + w, y],
        [x + w + depth, y + 4],
        [x + w + depth, 225],
        [x + w, 225],
      ],
      side,
    );
    p.poly(
      [
        [x - 2, y],
        [x + 7, y - 3],
        [x + w - 3, y - 3],
        [x + w + depth + 1, y + 2],
        [x + w + 8, y + 5],
        [x - 2, y + 3],
      ],
      roof,
    );
    p.r(x - 1, y, w + 1, 1, '#b7988c');
    p.r(x + 2, y + 4, w - 4, 2, side);
    masonry(p, x + 2, y + 9, w - 4, 180 - y, seed + 4, side, light);
    const columns = w > 47 ? 3 : 2;
    const margin = Math.floor((w - columns * 8) / (columns + 1));
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < columns; col++) {
        const xx = x + margin + (8 + margin) * col,
          yy = y + 11 + row * 19;
        tenementWindow(p, xx, yy, 8, 11, window, '#94868b', light, rng() > 0.56, rng() > 0.7);
      }
    p.r(x + w - 3, y + 5, 2, 100, roof);
    p.r(x + w - 3, y + 6, 1, 30, '#ae8e83');
    const ch = x + Math.floor(w * 0.3);
    p.r(ch, y - 12, 5, 12, roof);
    p.r(ch - 1, y - 13, 7, 2, side);
    p.r(ch + 1, y - 10, 1, 7, side);
    if (style % 3 === 0) {
      p.line(x + w * 0.69, y - 2, x + w * 0.69 + 1, y - 21, roof);
      p.line(x + w * 0.69 - 6, y - 17, x + w * 0.69 + 7, y - 19, roof);
      p.line(x + w * 0.69 - 3, y - 20, x + w * 0.69 - 3, y - 15, roof);
      p.line(x + w * 0.69 + 4, y - 20, x + w * 0.69 + 4, y - 17, roof);
    } else if (style % 3 === 2) {
      p.line(x + w - 12, y - 3, x + w - 8, y - 9, roof);
      p.line(x + w - 13, y - 10, x + w - 8, y - 7, roof, 2);
    }
  }
  function branchOffice(p, x, y) {
    const brick = '#a07872',
      sh = '#80676c',
      stone = '#bd9a80',
      edge = '#72646e';
    p.r(x, y, 70, 225 - y, brick);
    p.r(x + 66, y, 4, 225 - y, sh);
    masonry(p, x + 3, y + 13, 61, 68, 315, sh, '#b18a77');
    p.poly(
      [
        [x - 3, y + 6],
        [x - 3, y + 2],
        [x + 5, y + 1],
        [x + 5, y - 4],
        [x + 13, y - 4],
        [x + 19, y - 10],
        [x + 47, y - 10],
        [x + 53, y - 4],
        [x + 63, y - 4],
        [x + 63, y],
        [x + 72, y + 2],
        [x + 72, y + 6],
      ],
      edge,
    );
    p.poly(
      [
        [x, y + 2],
        [x + 8, y + 1],
        [x + 8, y - 2],
        [x + 15, y - 2],
        [x + 20, y - 7],
        [x + 46, y - 7],
        [x + 52, y - 2],
        [x + 61, y - 2],
        [x + 61, y + 1],
        [x + 68, y + 2],
        [x + 68, y + 4],
        [x, y + 4],
      ],
      stone,
    );
    p.r(x + 16, y + 5, 36, 12, sh);
    p.r(x + 18, y + 6, 32, 9, '#6b7979');
    wingedPost(p, x + 34, y + 7, '#d9b68b', '#886f6b');
    for (const at of [x + 6, x + 40]) {
      p.r(at, y + 23, 23, 45, edge);
      p.r(at + 2, y + 26, 19, 38, '#857a78');
      for (let i = 0; i < 8; i++) p.r(at + 2, y + 28 + i * 4, 19, 1, '#a1897c');
      p.r(at + 7, y + 39, 9, 2, '#6a656b');
      p.r(at + 7, y + 48, 8, 3, '#b39a84');
      p.line(at + 1, y + 57, at + 21, y + 45, '#89746b', 2);
      p.r(at - 1, y + 20, 25, 3, stone);
    }
    p.r(x + 31, y + 36, 5, 9, edge);
    p.r(x + 32, y + 37, 3, 4, '#d2a17d');
    p.r(x + 33, y + 49, 1, 8, edge);
    pigeon(p, x + 12, y - 4, 1, true);
    p.r(x + 54, y - 27, 2, 23, edge);
    p.r(x + 45, y - 27, 12, 2, edge);
    p.line(x + 48, y - 25, x + 54, y - 19, edge);
    p.r(x + 45, y - 25, 1, 4, edge);
    p.poly(
      [
        [x + 41, y - 16],
        [x + 42, y - 20],
        [x + 44, y - 22],
        [x + 47, y - 22],
        [x + 49, y - 19],
        [x + 50, y - 16],
        [x + 52, y - 14],
        [x + 39, y - 14],
      ],
      '#977760',
    );
    p.r(x + 41, y - 16, 9, 1, '#c6a076');
    p.r(x + 44, y - 21, 2, 4, '#c5a279');
    p.line(x + 51, y - 24, x + 51, y - 19, '#8f7c72');
    p.dot(x + 50, y - 18, '#8f7c72');
  }
  function clothes(p, x, y, shape, color, shadow) {
    const fill = (pts, c) =>
      p.poly(
        pts.map(([u, v]) => [x + u, y + v]),
        c,
      );
    if (shape === 0) {
      fill(
        [
          [-5, 1],
          [-3, 0],
          [-1, 0],
          [0, 2],
          [2, 2],
          [3, 0],
          [5, 0],
          [8, 3],
          [6, 6],
          [4, 5],
          [4, 12],
          [-3, 11],
          [-3, 5],
          [-5, 7],
          [-7, 4],
        ],
        color,
      );
      p.line(x - 2, y + 10, x + 3, y + 11, shadow);
      p.r(x + 3, y + 5, 1, 5, shadow);
    } else if (shape === 1) {
      fill(
        [
          [-5, 0],
          [4, 1],
          [5, 14],
          [2, 15],
          [0, 8],
          [-1, 14],
          [-5, 13],
        ],
        color,
      );
      p.r(x - 1, y + 1, 1, 5, shadow);
      p.r(x - 5, y + 12, 3, 1, shadow);
      p.r(x + 2, y + 13, 2, 1, shadow);
    } else if (shape === 2) {
      fill(
        [
          [-3, 0],
          [1, 0],
          [1, 6],
          [5, 7],
          [4, 10],
          [0, 10],
          [-3, 7],
        ],
        color,
      );
      p.r(x - 3, y + 1, 4, 1, shadow);
    } else {
      fill(
        [
          [-7, 0],
          [8, 0],
          [7, 14],
          [2, 13],
          [-1, 14],
          [-7, 13],
        ],
        color,
      );
      p.r(x + 3, y + 2, 1, 10, shadow);
      p.r(x - 6, y + 10, 12, 1, shadow);
    }
    p.r(x - 3, y - 1, 1, 3, '#c39c79');
    if (shape !== 2) p.r(x + 3, y - 1, 1, 3, '#c39c79');
  }
  function laundryLine(p, x1, y1, x2, y2, sag, garments) {
    const at = (t) => Math.round(y1 + (y2 - y1) * t + 4 * t * (1 - t) * sag);
    for (let x = x1; x < x2; x++)
      p.line(x, at((x - x1) / (x2 - x1)), x + 1, at((x + 1 - x1) / (x2 - x1)), '#786e77');
    for (const [t, shape, color, shade] of garments)
      clothes(p, Math.round(x1 + (x2 - x1) * t), at(t) + 1, shape, color, shade);
  }
  function alleyMiddle() {
    const p = new Brush(panoramaWidth, skyHeight);
    const homes = [
      [-14, 87, 45, 2],
      [43, 111, 37, 1],
      [166, 101, 51, 1],
      [231, 119, 42, 2],
      [298, 96, 46, 0],
      [373, 108, 55, 1],
      [454, 91, 34, 2],
      [504, 110, 63, 0],
      [585, 88, 45, 3],
      [665, 102, 42, 2],
      [744, 109, 61, 1],
      [828, 92, 43, 0],
      [916, 106, 73, 2],
    ];
    for (const [x, y, w, style] of homes) alleyHouse(p, x, y, w, style, Math.abs(x) + 49);
    branchOffice(p, 83, 104);
    branchOffice(p, 692, 117);
    const colors = [
      ['#c3a48d', '#aa8d81'],
      ['#839393', '#738080'],
      ['#ab7874', '#936c6f'],
      ['#908595', '#796f83'],
    ];
    const laundry = [
      [0, 77, 92, 82, 7],
      [133, 74, 236, 72, 9],
      [294, 84, 390, 87, 6],
      [409, 71, 518, 78, 9],
      [572, 73, 680, 75, 9],
      [708, 83, 807, 73, 6],
      [844, 77, 948, 80, 9],
    ];
    laundry.forEach(([x, y, u, v, sag], i) => {
      p.line(x, y - 3, x + 2, y + 30, '#81747b');
      p.line(u, v - 3, u - 1, v + 28, '#827680');
      const set =
        i % 2
          ? [
              [0.18, 2, 0],
              [0.3, 0, 1],
              [0.48, 3, 0],
              [0.68, 1, 3],
              [0.84, 2, 2],
            ]
          : [
              [0.17, 0, 2],
              [0.34, 3, 0],
              [0.53, 1, 1],
              [0.71, 2, 0],
              [0.82, 0, 3],
            ];
      laundryLine(
        p,
        x,
        y,
        u,
        v,
        sag,
        set.map(([t, n, c]) => [t, n, ...colors[c]]),
      );
    });
    pigeon(p, 186, 98, -1, true);
    pigeon(p, 378, 106, 1, true);
    pigeon(p, 589, 86, -1, true);
    // The rail siding is well below the loading dock. Catch only fragments through the pits.
    for (const x of [10, 195, 324, 584, 731, 879]) {
      p.r(x, 193, 53, 11, '#816f75');
      p.r(x + 2, 192, 48, 2, '#927c7a');
      p.r(x + 4, 195, 10, 6, '#98817c');
      p.r(x + 19, 194, 14, 8, '#8b7576');
      p.r(x + 25, 194, 1, 8, '#a58d7e');
      p.oval(x + 9, 205, 3, 3, '#776a74');
      p.oval(x + 42, 205, 3, 3, '#776a74');
    }
    return p.canvas;
  }
  function train(p, x, y) {
    const dark = '#566675',
      body = '#637383',
      roof = '#718291';
    p.r(x, y + 5, 14, 9, dark);
    p.r(x - 2, y + 3, 18, 3, roof);
    p.r(x + 2, y + 6, 4, 4, '#a99c86');
    p.r(x + 8, y + 6, 3, 4, '#9b9588');
    p.r(x + 13, y + 7, 23, 7, body);
    p.r(x + 17, y + 6, 15, 2, roof);
    p.r(x + 29, y + 3, 3, 5, dark);
    p.r(x + 28, y + 2, 5, 2, roof);
    p.r(x + 34, y + 8, 3, 7, dark);
    p.r(x + 35, y + 9, 2, 2, '#b5a189');
    p.r(x - 1, y + 13, 39, 2, dark);
    p.line(x + 35, y + 13, x + 40, y + 16, dark);
    for (const u of [3, 10, 18, 25, 32]) {
      p.oval(x + u, y + 16, 3, 3, dark);
      p.dot(x + u, y + 16, '#879092');
    }
    for (let i = 0; i < 3; i++) {
      const at = x - 35 * (i + 1);
      p.r(at, y + 5, 32, 8, body);
      p.r(at - 1, y + 3, 34, 2, roof);
      p.r(at + 1, y + 13, 32, 2, dark);
      p.r(at + 14, y + 7, 4, 4, dark);
      for (const u of [3, 9, 20, 26]) p.r(at + u, y + 7, 3, 2, i === 1 ? '#8f9190' : '#aaa08c');
      p.oval(at + 6, y + 16, 2, 2, dark);
      p.oval(at + 26, y + 16, 2, 2, dark);
    }
  }
  function bridgeArch(p, x, w, rise) {
    const base = 137,
      dark = '#576879',
      lit = '#788896',
      back = '#637686';
    const profile = (t) => Math.round(base - rise * 4 * t * (1 - t));
    const n = Math.ceil(w / 17);
    for (let i = 0; i < n; i++) {
      const a = i / n,
        b = (i + 1) / n,
        u = Math.round(x + a * w),
        v = Math.round(x + b * w);
      const y = profile(a),
        z = profile(b);
      p.line(u, y, v, z, dark, 3);
      p.line(u, y - 1, v, z - 1, lit);
      p.line(u, y + 8, v, z + 8, back, 2);
      if (i % 2) p.line(u, y + 2, v, z + 8, dark);
      else p.line(u, y + 8, v, z + 1, dark);
      if (i > 0 && i % 2 === 0) {
        p.line(u, y + 10, u, 172, back);
        p.r(u - 1, y + 8, 4, 2, lit);
      }
    }
    for (const at of [x, x + w]) {
      p.r(at - 4, base - 2, 10, 93, dark);
      p.r(at - 3, base, 2, 88, lit);
      p.r(at - 6, base - 2, 13, 4, back);
      p.r(at - 7, 192, 16, 5, back);
      p.line(at + 4, 151, at + 23, 171, back, 2);
      p.line(at + 3, 152, at - 12, 172, back, 2);
    }
  }
  function signalBox(p, x, y) {
    const edge = '#536270',
      wall = '#7b7e7e',
      trim = '#a89b88';
    p.r(x + 3, y + 11, 39, 14, edge);
    p.r(x + 5, y + 12, 35, 11, wall);
    p.poly(
      [
        [x - 3, y + 5],
        [x + 5, y - 2],
        [x + 32, y - 3],
        [x + 47, y + 4],
        [x + 45, y + 6],
        [x - 2, y + 7],
      ],
      edge,
    );
    p.line(x + 4, y - 2, x + 32, y - 3, '#899499');
    p.r(x + 2, y + 6, 41, 8, edge);
    for (let i = 0; i < 5; i++) {
      const u = x + 4 + 7 * i;
      p.r(u, y + 7, 5, 6, i === 2 ? '#8f9087' : '#b9a88c');
      p.r(u, y + 8, 3, 1, '#c4b494');
      p.r(u + 3, y + 7, 1, 6, '#8c8c82');
    }
    p.r(x + 12, y + 16, 16, 2, trim);
    p.r(x + 16, y + 19, 7, 1, edge);
    p.r(x, y + 23, 45, 3, edge);
    p.r(x + 9, y + 26, 3, 34, edge);
    p.r(x + 33, y + 26, 3, 34, edge);
    p.line(x + 12, y + 27, x + 32, y + 48, edge, 2);
    p.line(x + 32, y + 27, x + 12, y + 48, edge, 2);
    p.r(x + 40, y + 26, 1, 24, edge);
    p.r(x + 36, y + 26, 1, 24, edge);
    for (let i = 0; i < 6; i++) p.r(x + 37, y + 28 + i * 4, 3, 1, trim);
    p.r(x + 33, y - 9, 3, 8, edge);
    p.r(x + 32, y - 10, 5, 2, edge);
  }
  function bridgeMiddle() {
    const p = new Brush(panoramaWidth, skyHeight);
    // Long sleepers and telegraph gantries recede at an angle below the main crossing.
    for (let track = 0; track < 3; track++) {
      const yy = 170 + track * 14;
      p.line(-9, yy, panoramaWidth, yy + 21, '#657685', 2);
      p.line(-9, yy + 4, panoramaWidth, yy + 25, '#566979');
      for (let x = -5; x < panoramaWidth; x += 13) {
        const j = Math.round((x / panoramaWidth) * 21);
        p.line(x, yy + j - 1, x + 8, yy + j + 6, '#596b7a');
      }
    }
    train(p, 98, 184);
    train(p, 443, 185);
    train(p, 815, 190);
    signalBox(p, 39, 123);
    signalBox(p, 383, 120);
    signalBox(p, 697, 125);
    for (const x of [41, 112, 357, 440, 598, 866]) {
      p.r(x, 124, 2, 47, '#637888');
      p.r(x - 5, 124, 16, 2, '#6c8190');
      p.line(x + 1, 130, x + 8, 125, '#647888');
      p.line(x - 2, 124, x - 2, 121, '#637888');
      p.line(x + 8, 124, x + 8, 121, '#637888');
    }
    bridgeArch(p, -77, 222, 74);
    bridgeArch(p, 145, 284, 94);
    bridgeArch(p, 429, 196, 66);
    bridgeArch(p, 625, 280, 88);
    bridgeArch(p, 905, 228, 72);
    for (const [x, y] of [
      [-3, 66],
      [277, 41],
      [514, 68],
      [763, 49],
    ]) {
      p.r(x + 1, y - 6, 2, 6, '#5c7180');
      p.r(x - 1, y - 8, 6, 3, '#566c7c');
      p.r(x, y - 7, 3, 1, '#ccae89');
    }
    pigeon(p, 264, 43, 1);
    pigeon(p, 273, 42, -1);
    pigeon(p, 504, 71, -1);
    return p.canvas;
  }
  function clerestory(p, x, y, w, h) {
    const edge = '#343747',
      trim = '#505061',
      glint = '#686575',
      glass = '#56647a',
      dim = '#45536a',
      light = '#728493';
    const outline = [
      [0, h],
      [0, 11],
      [2, 11],
      [2, 7],
      [6, 7],
      [6, 4],
      [11, 4],
      [11, 2],
      [w * 0.38, 2],
      [w * 0.38, 0],
      [w * 0.64, 0],
      [w * 0.64, 2],
      [w - 10, 2],
      [w - 10, 4],
      [w - 6, 4],
      [w - 6, 7],
      [w - 2, 7],
      [w - 2, 11],
      [w, 11],
      [w, h],
    ];
    const poly = (ox, oy, scale, color) =>
      p.poly(
        outline.map(([u, v]) => [x + ox + Math.round(u * scale), y + oy + Math.round(v * scale)]),
        color,
      );
    poly(-3, -3, (w + 6) / w, edge);
    poly(-1, -1, (w + 2) / w, glint);
    poly(0, 0, 1, trim);
    poly(2, 2, (w - 4) / w, glass);
    // Distinct roofs and a night train yard outside the window.
    p.poly(
      [
        [x + 3, y + h - 12],
        [x + 9, y + h - 17],
        [x + 15, y + h - 17],
        [x + 22, y + h - 24],
        [x + 27, y + h - 24],
        [x + 29, y + h - 20],
        [x + w - 4, y + h - 20],
        [x + w - 4, y + h - 3],
        [x + 3, y + h - 3],
      ],
      dim,
    );
    p.r(x + 14, y + h - 24, 3, 11, dim);
    p.r(x + 30, y + h - 29, 4, 12, dim);
    p.r(x + 14, y + h - 13, 3, 2, '#ac927d');
    p.r(x + 22, y + h - 21, 1, 2, '#a38d7e');
    p.line(x + 6, y + 20, x + 16, y + 10, light);
    p.line(x + 7, y + 24, x + 13, y + 18, '#657789');
    for (const at of [0.26, 0.51, 0.76]) {
      const u = x + Math.round(w * at);
      p.r(u, y + 4, 2, h - 5, edge);
      p.r(u + 2, y + 6, 1, h - 8, trim);
    }
    p.r(x + 2, y + 17, w - 4, 2, edge);
    p.r(x + 1, y + h - 18, w - 2, 2, edge);
    p.r(x - 3, y + h - 1, w + 6, 4, trim);
    p.r(x - 2, y + h - 1, w + 4, 1, glint);
  }
  function gear(p, x, y, r, outer, ring, hub, angle = 0) {
    for (let i = 0; i < 12; i++) {
      const a = angle + (i * Math.PI) / 6;
      p.r(x + Math.round((r - 1) * Math.cos(a)) - 2, y + Math.round((r - 1) * Math.sin(a)) - 2, 4, 4, outer);
    }
    p.oval(x, y, r - 2, r - 2, outer);
    p.oval(x, y, r - 5, r - 5, ring);
    p.oval(x, y, r - 7, r - 7, hub);
    for (let i = 0; i < 6; i++) {
      const a = angle + (i * Math.PI) / 3;
      p.line(x, y, x + Math.cos(a) * (r - 6), y + Math.sin(a) * (r - 6), outer, 2);
    }
    p.oval(x, y, 4, 4, ring);
    p.r(x - 1, y - 1, 3, 3, outer);
  }
  function sorter(p, x, y) {
    const edge = '#4a424b',
      dark = '#5a4b50',
      tube = '#89685b',
      lit = '#a07b60',
      bright = '#c08e66';
    p.r(x - 23, y + 26, 61, 42, dark);
    p.r(x - 25, y + 24, 65, 4, edge);
    p.oval(x + 1, y + 2, 24, 24, edge);
    p.oval(x + 1, y + 1, 21, 21, '#715751');
    gear(p, x + 1, y + 1, 20, tube, '#a38167', dark, 0.15);
    p.r(x + 17, y + 6, 20, 13, edge);
    p.r(x + 21, y + 8, 17, 5, tube);
    p.line(x - 27, y + 30, x - 12, y + 1, edge, 4);
    p.line(x - 25, y + 28, x - 10, y + 1, tube, 2);
    p.line(x + 22, y + 29, x + 9, y + 5, edge, 4);
    p.line(x + 23, y + 28, x + 11, y + 5, tube, 2);
    p.r(x + 6, y + 26, 27, 8, edge);
    p.r(x + 8, y + 28, 20, 3, lit);
    for (const u of [-15, -7, 1]) p.r(x + u, y + 33, 3, 9, edge);
    p.line(x + 37, y + 9, x + 57, y - 9, edge, 5);
    p.line(x + 37, y + 9, x + 57, y - 9, tube, 3);
    p.r(x + 55, y - 15, 4, 10, tube);
    p.r(x + 52, y - 17, 10, 3, lit);
    p.oval(x + 27, y - 9, 6, 6, edge);
    p.oval(x + 27, y - 9, 4, 4, '#ac957e');
    p.line(x + 27, y - 9, x + 29, y - 11, dark);
    p.r(x + 26, y - 2, 3, 8, tube);
    p.r(x - 17, y + 26, 4, 1, bright);
  }
  function bellAndChute(p, x, y) {
    const edge = '#514751',
      patina = '#866a60',
      copper = '#aa7f61',
      light = '#c6986d';
    p.r(x - 28, 6, 57, 4, '#45424e');
    p.r(x - 24, 10, 3, 8, edge);
    p.r(x + 19, 10, 3, 8, edge);
    p.line(x - 22, 15, x - 6, y - 5, patina);
    p.line(x + 20, 15, x + 5, y - 5, patina);
    p.r(x - 5, y - 7, 10, 4, '#655455');
    p.r(x - 2, y - 5, 4, 6, patina);
    p.poly(
      [
        [x - 16, y + 22],
        [x - 15, y + 19],
        [x - 13, y + 18],
        [x - 10, y + 11],
        [x - 9, y + 5],
        [x - 6, y + 1],
        [x - 3, y - 1],
        [x + 4, y - 1],
        [x + 7, y + 1],
        [x + 10, y + 6],
        [x + 10, y + 12],
        [x + 13, y + 18],
        [x + 17, y + 21],
        [x + 17, y + 24],
        [x - 16, y + 24],
      ],
      edge,
    );
    p.poly(
      [
        [x - 13, y + 20],
        [x - 11, y + 17],
        [x - 8, y + 9],
        [x - 7, y + 5],
        [x - 3, y + 1],
        [x + 3, y + 1],
        [x + 7, y + 5],
        [x + 7, y + 12],
        [x + 10, y + 17],
        [x + 13, y + 20],
      ],
      patina,
    );
    p.poly(
      [
        [x - 10, y + 18],
        [x - 7, y + 10],
        [x - 6, y + 5],
        [x - 3, y + 2],
        [x + 2, y + 2],
        [x - 1, y + 8],
        [x - 3, y + 17],
      ],
      copper,
    );
    p.line(x - 7, y + 11, x - 5, y + 6, light);
    p.r(x - 12, y + 19, 25, 2, '#af8766');
    p.r(x - 14, y + 22, 30, 1, '#99775e');
    p.r(x + 11, y - 4, 2, 11, patina);
    p.line(x + 12, y + 7, x + 14, y + 10, '#ae8b71');
    p.dot(x + 14, y + 12, '#98806d');
    const u = x + 7,
      v = y + 67;
    p.poly(
      [
        [u - 4, v],
        [u + 3, v - 5],
        [u + 13, v - 5],
        [u + 14, v - 2],
        [u + 47, v - 19],
        [u + 50, v - 17],
        [u + 49, v - 13],
        [u + 12, v + 7],
        [u - 4, v + 7],
      ],
      edge,
    );
    p.line(u + 12, v + 3, u + 48, v - 16, patina, 3);
    p.line(u + 12, v + 3, u + 47, v - 15, copper);
    p.r(u - 3, v + 1, 15, 4, patina);
    p.r(u - 1, v + 6, 2, 12, edge);
    p.r(u + 8, v + 6, 2, 9, edge);
    p.g.save();
    p.g.translate(u + 24, v - 7);
    p.poly(
      [
        [0, 0],
        [7, -4],
        [10, 1],
        [3, 5],
      ],
      '#b3997d',
    );
    p.line(1, 0, 5, 1, '#827260');
    p.line(5, 1, 7, -3, '#827260');
    p.g.restore();
  }
  function lamp(p, x, y, wire) {
    p.r(x, y - wire, 1, wire, '#434554');
    p.r(x - 1, y - 3, 3, 4, '#716156');
    p.poly(
      [
        [x - 7, y + 2],
        [x - 3, y - 2],
        [x + 3, y - 2],
        [x + 8, y + 2],
        [x + 8, y + 4],
        [x - 7, y + 4],
      ],
      '#66565a',
    );
    p.r(x - 6, y + 3, 13, 2, '#b08c6c');
    p.r(x - 3, y + 5, 7, 2, '#d3ac7e');
    p.r(x - 1, y + 6, 3, 2, '#e4bd87');
  }
  function depotMiddle() {
    const p = new Brush(panoramaWidth, skyHeight),
      rng = seeded(211);
    p.r(0, 0, panoramaWidth, skyHeight, '#403e50');
    for (let y = 22; y < 220; y += 6)
      for (let x = y % 12 ? 8 : 2; x < panoramaWidth; x += 17) {
        if (rng() > 0.72) p.r(x, y, Math.floor(rng() * 7) + 3, 1, '#4b4656');
        if (rng() > 0.91) p.r(x + 3, y + 1, 1, 3, '#494554');
      }
    for (const [x, y, w, h] of [
      [17, 33, 45, 53],
      [76, 31, 45, 55],
      [171, 26, 53, 58],
      [262, 28, 50, 55],
      [363, 34, 44, 51],
      [432, 31, 49, 54],
      [535, 26, 52, 56],
      [655, 31, 45, 52],
      [742, 30, 51, 54],
      [870, 32, 47, 54],
      [943, 34, 45, 54],
    ])
      clerestory(p, x, y, w, h);
    // Roof trusses, belt drives and a closed sorting hatch against the back wall.
    for (let x = -17; x < panoramaWidth; x += 121) {
      p.r(x, 0, 6, skyHeight, '#353849');
      p.r(x + 4, 0, 2, skyHeight, '#535061');
      p.r(x - 2, 95, 10, 4, '#61575f');
      p.line(x + 5, 33, x + 64, 8, '#343746', 3);
      p.line(x + 65, 9, x + 120, 34, '#353747', 3);
      p.line(x + 6, 31, x + 63, 7, '#565264');
      p.line(x + 8, 16, x + 120, 16, '#494657', 2);
      for (const y of [23, 88, 122, 165]) {
        p.dot(x + 1, y, '#81706a');
        p.dot(x + 1, y + 2, '#65606a');
      }
    }
    p.r(0, 4, panoramaWidth, 5, '#343646');
    for (const x of [20, 294, 516, 861]) {
      p.r(x, 101, 44, 51, '#504851');
      p.r(x + 3, 104, 38, 46, '#5c5357');
      for (let y = 0; y < 36; y += 5) p.r(x + 4, 108 + y, 36, 1, '#72615d');
      p.r(x + 18, 119, 9, 2, '#433f48');
      wingedPost(p, x + 23, 97, '#a7886c', '#685852');
    }
    sorter(p, 143, 127);
    sorter(p, 471, 131);
    sorter(p, 755, 130);
    bellAndChute(p, 237, 57);
    bellAndChute(p, 844, 61);
    for (const [x, y, h] of [
      [60, 43, 27],
      [240, 49, 40],
      [410, 48, 33],
      [634, 52, 45],
      [827, 45, 36],
    ])
      lamp(p, x, y, h);
    for (const [x, y] of [
      [191, 113],
      [355, 114],
      [602, 108],
      [809, 117],
    ]) {
      p.r(x, y, 4, 99, '#67575a');
      p.r(x + 1, y + 1, 1, 88, '#8a6d61');
      p.line(x, y, x + 9, y - 8, '#86695f', 3);
      p.r(x + 9, y - 8, 26, 3, '#81655e');
      for (let i = 13; i < 33; i += 13) p.r(x + i, y - 9, 2, 5, '#a17e67');
    }
    return p.canvas;
  }
  function thinDeck(p, w, room) {
    const wood = room === 'alley',
      steel = room === 'bridge';
    const shade = wood ? '#80584f' : steel ? '#4b5869' : '#61505a';
    const face = wood ? '#ad7555' : steel ? '#799191' : '#9b735c';
    const top = wood ? '#e7b681' : steel ? '#c4c8ac' : '#d5aa75';
    p.r(0, 0, w, 6, ink);
    p.r(1, 1, w - 2, 2, top);
    p.r(2, 3, w - 4, 2, face);
    p.r(3, 6, w - 6, 2, shade);
    for (let i = 8; i < w - 3; i += wood ? 12 : 8) {
      p.r(i, 1, 1, 2, wood ? '#ac8066' : '#8a8b86');
      p.dot(i - 2, 4, cream);
    }
    const pad = Math.min(7, Math.floor(w / 5));
    for (const x of [pad, w - pad - 2]) {
      p.r(x, 7, 3, 5, ink);
      p.line(x, 12, x + (x < w / 2 ? 6 : -5), 7, shade, 2);
      p.dot(x, 8, face);
    }
  }
  function alleyDock(p, w, seed) {
    const brick = '#93664f',
      edge = '#715353',
      light = '#ae7a58';
    p.r(0, 0, w, 45, ink);
    p.r(2, 3, w - 4, 40, brick);
    p.r(2, 28, w - 4, 15, '#865f50');
    masonry(p, 2, 8, w - 4, 33, seed, edge, light);
    const rng = seeded(seed);
    for (let row = 0; row < 4; row++) {
      let x = 5 + Math.floor(rng() * 8);
      while (x < w - 8) {
        const y = 10 + row * 7,
          span = Math.min(5 + Math.floor(rng() * 13), w - x - 3);
        p.r(x, y, span, 1, '#7f5b51');
        if (rng() > 0.6) p.r(x, y + 1, 1, 3, '#7f5b51');
        x += span + 10 + Math.floor(rng() * 19);
      }
    }
    // Old cast-iron ventilation grates interrupt the masonry in small clusters.
    for (let x = 26 + (seed % 11); x < w - 22; x += 80 + Math.floor(rng() * 49)) {
      p.r(x + 2, 19, 17, 14, edge);
      p.r(x, 22, 21, 11, edge);
      p.r(x + 2, 23, 17, 9, '#50444a');
      for (let i = 3; i < 17; i += 4) p.r(x + i, 23, 2, 9, '#816451');
      p.r(x + 1, 32, 19, 2, '#af8059');
      p.dot(x + 2, 22, '#b08769');
    }
    p.r(1, 1, w - 2, 2, '#e3b37d');
    p.r(2, 3, w - 4, 3, '#b7825d');
    p.r(3, 6, w - 6, 2, '#75585a');
    for (let x = 8; x < w - 8; x += 17 + Math.floor(rng() * 17)) {
      p.r(x, 1, 1, 3, '#a57e64');
      p.r(x + 2, 5, 2, 1, '#835f53');
    }
    p.r(3, 42, w - 6, 2, '#705653');
    p.r(1, 9, 1, 31, '#bf8b68');
    p.r(w - 3, 8, 2, 35, '#684e50');
  }
  function bridgeDeck(p, w) {
    const steel = '#586676',
      shade = '#3e4052',
      lit = '#819191',
      patina = '#a3a498';
    p.r(0, 0, w, 10, ink);
    p.r(2, 1, w - 4, 3, '#b8bba3');
    p.r(2, 4, w - 4, 4, steel);
    p.r(0, 9, 6, 36, ink);
    p.r(w - 6, 9, 6, 36, ink);
    p.r(2, 10, 2, 32, lit);
    p.r(w - 4, 10, 2, 32, steel);
    p.r(3, 28, w - 6, 4, shade);
    p.r(3, 28, w - 6, 1, steel);
    const n = Math.max(1, Math.floor((w - 11) / 25));
    for (let i = 0; i < n; i++) {
      const x = Math.round(5 + ((w - 11) * i) / n),
        end = Math.round(5 + ((w - 11) * (i + 1)) / n),
        mid = Math.round((x + end) / 2);
      p.line(x, 10, mid, 27, shade, 3);
      p.line(mid, 27, end, 10, shade, 3);
      p.line(x, 10, mid, 27, steel);
      p.line(mid + 1, 27, end, 10, lit);
      p.r(mid - 2, 26, 7, 3, shade);
      p.dot(mid + 1, 27, patina);
      p.r(x - 1, 4, 4, 4, '#495364');
      p.dot(x, 5, patina);
    }
    for (let x = 11; x < w - 8; x += 10) {
      p.r(x, 1, 2, 1, '#ded0a9');
      p.dot(x + 2, 6, patina);
    }
    p.r(0, 33, 5, 12, shade);
    p.r(w - 5, 33, 5, 12, shade);
    p.r(1, 34, 2, 6, steel);
  }
  function depotDock(p, w, seed) {
    p.r(0, 0, w, 45, ink);
    p.r(2, 4, w - 4, 39, '#514753');
    p.r(3, 7, w - 6, 2, '#875d51');
    p.r(3, 34, w - 6, 3, '#634f51');
    const rng = seeded(seed);
    for (let x = 7; x < w - 17; x += 29) {
      const wide = Math.min(w - x - 4, 25);
      p.r(x, 12, wide, 18, '#463f4c');
      p.r(x + 1, 13, wide - 2, 15, '#604e50');
      p.r(x + 2, 14, wide - 4, 1, '#776055');
      if (rng() > 0.56) {
        for (let i = 4; i < wide - 4; i += 4) p.r(x + i, 18, 2, 7, '#463e49');
      } else {
        p.r(x + 5, 17, wide - 10, 2, '#ad805f');
        p.r(x + 8, 22, wide - 16, 2, '#4c444c');
      }
      p.dot(x + 2, 27, '#ab805f');
      p.dot(x + wide - 3, 27, '#a27b5d');
    }
    p.r(1, 1, w - 2, 2, '#dfb07c');
    p.r(2, 3, w - 4, 3, '#b58159');
    for (let x = 4; x < w - 5; x += 18) {
      p.r(x, 3, 4, 2, '#805954');
      p.r(x + 1, 2, 1, 1, '#f2c28b');
    }
    p.r(1, 9, 1, 32, '#a27a60');
    p.r(w - 3, 9, 2, 33, '#6a5357');
    p.r(3, 41, w - 6, 2, '#715856');
  }
  function platformArt(room, platform, index) {
    const w = Math.max(2, Math.ceil((platform.x2 - platform.x1) / cell)),
      thin = platform.thin;
    const key = ['platform', room, w, thin ? 1 : 0, index % 4].join('/');
    return piece(key, w, thin ? 14 : 45, (p) => {
      if (thin) thinDeck(p, w, room);
      else if (room === 'alley') alleyDock(p, w, 77 + index * 19);
      else if (room === 'bridge') bridgeDeck(p, w);
      else depotDock(p, w, 177 + index * 17);
    });
  }
  function footing(room, w) {
    return piece('footing/' + room + '/' + w, w, 25, (p) => {
      // The supports are recessed past the bottom of the 135-unit exposed end wall.
      if (room === 'bridge') {
        for (let x = 14; x < w - 13; x += 67) {
          p.r(x, 0, 5, 25, '#536273');
          p.r(x + 1, 0, 1, 25, '#687984');
          p.line(x + 4, 13, x + Math.min(18, w - x - 10), 0, '#586979', 2);
          p.r(x - 2, 3, 9, 3, '#667783');
        }
      } else {
        const edge = room === 'alley' ? '#68555b' : '#4b4450';
        const brick = room === 'alley' ? '#826962' : '#5c4f56';
        p.r(9, 0, w - 18, 3, edge);
        for (let x = 11; x < w - 12; x += 45) {
          const width = Math.min(11, w - x - 10);
          p.poly(
            [
              [x, 0],
              [x + width + 5, 0],
              [x + width, 5],
              [x + width, 25],
              [x, 25],
            ],
            brick,
          );
          p.r(x, 0, 2, 25, edge);
          p.r(x + 2, 6, width - 3, 1, edge);
          p.r(x + 4, 13, width - 5, 1, edge);
        }
      }
    });
  }
  function signalLens(p, x, y, color, lit) {
    p.r(x - 3, y - 5, 7, 10, ink);
    p.r(x - 4, y - 3, 9, 6, ink);
    p.r(x - 2, y - 3, 5, 6, '#5a5056');
    p.r(x - 3, y - 2, 7, 4, '#5a5056');
    p.r(x - 2, y - 2, 5, 4, color);
    p.r(x - 1, y - 3, 3, 6, color);
    p.r(x - 1, y - 2, 2, 1, lit ? cream : '#a69a8e');
    p.r(x - 4, y - 5, 9, 2, '#574b52');
  }
  function gateArt(closed) {
    return piece('gate/' + closed, 50, 57, (p) => {
      const ax = 32;
      p.r(ax - 5, 50, 12, 7, ink);
      p.r(ax - 4, 51, 10, 2, '#b18969');
      p.r(ax - 3, 16, 6, 35, ink);
      p.r(ax - 2, 17, 4, 34, '#9a7662');
      p.r(ax - 2, 18, 1, 31, '#d5ac79');
      for (const y of [24, 40, 47]) p.r(ax - 3, y, 6, 2, '#62555b');
      p.r(ax - 1, 10, 3, 10, '#68555a');
      if (closed) {
        p.r(2, 28, 32, 6, ink);
        p.r(3, 29, 29, 3, '#e8c79a');
        for (const u of [6, 13, 20, 27]) {
          p.line(u, 29, u - 2, 31, '#bb6557', 2);
        }
        p.r(8, 33, 8, 3, '#86625b');
        p.r(9, 34, 6, 1, '#c5aa86');
      } else {
        p.line(ax, 30, ax - 4, 3, ink, 5);
        p.line(ax + 1, 29, ax - 3, 4, '#dfbd91', 3);
        for (const y of [9, 16, 23]) {
          p.line(ax - 3 + Math.round(y / 7), y, ax - 1 + Math.round(y / 7), y, '#af6759', 2);
        }
      }
      p.oval(ax, 30, 4, 4, '#5e5053');
      p.oval(ax, 30, 2, 2, '#d8a777');
      p.dot(ax, 30, '#7c5e56');
      signalLens(p, ax, 9, closed ? '#ee745f' : '#8fc7a0', true);
    });
  }
  function checkpointArt(lit, low) {
    const h = low ? 29 : 40;
    return piece('checkpoint/' + lit + '/' + h, 29, h, (p) => {
      const x = 13;
      p.r(x - 5, h - 3, 11, 3, ink);
      p.r(x - 3, 14, 7, h - 16, ink);
      p.r(x - 2, 15, 5, h - 19, '#657a74');
      p.r(x - 2, 17, 1, h - 23, '#8ba497');
      p.r(x - 4, h - 14, 9, 8, '#494e54');
      p.r(x - 3, h - 13, 7, 4, lit ? '#77a9a0' : '#758782');
      envelope(p, x - 2, h - 13, 5, 3, lit ? '#c7d7b9' : '#a8ad9c', '#5e7773');
      p.r(x - 1, 7, 3, 8, '#6a5e56');
      if (lit) {
        p.line(x, 11, x + 8, 3, ink, 4);
        p.line(x + 1, 10, x + 8, 3, '#7bbfb1', 2);
        p.r(x + 6, 4, 2, 2, cream);
      } else {
        p.line(x, 10, x + 8, 15, ink, 3);
        p.line(x + 1, 11, x + 8, 15, '#96786b');
        p.dot(x + 7, 15, '#b59d84');
      }
      signalLens(p, x, 8, lit ? '#8ddccd' : '#73827c', lit);
      p.r(x - 3, h - 4, 7, 1, lit ? '#a5c2ab' : '#978e7c');
    });
  }
  function cargo(p, x, y, amount, dim = false) {
    const paper = dim ? '#ac997f' : '#d2ae81',
      shadow = dim ? '#856f66' : '#a17c61',
      twine = dim ? '#b6a58a' : '#ead19e';
    for (let i = 0; i < amount; i++) {
      const u = x + i * 7,
        y0 = y - (i % 2 ? 7 : 5),
        w = i % 2 ? 8 : 9;
      p.r(u, y0, w, y - y0, shadow);
      p.r(u + 1, y0 + 1, w - 2, y - y0 - 2, paper);
      p.r(u + Math.floor(w / 2), y0 + 1, 1, y - y0 - 2, twine);
      p.r(u + 1, y0 + 2, w - 2, 1, shadow);
    }
  }
  function dispatchDoor(room, open) {
    return piece('door/' + room + '/' + open, 55, 76, (p) => {
      const cage = room === 'alley',
        bridge = room === 'bridge';
      const trim = cage ? '#79938a' : bridge ? '#839393' : '#ad7c5f';
      const border = cage ? '#4d5b5e' : bridge ? '#4b5666' : '#6d5358';
      const pad = cage ? '#d0ad7b' : bridge ? '#c1b99c' : '#d7a475';
      p.r(5, 18, 45, 58, ink);
      p.r(3, 15, 49, 6, ink);
      p.poly(
        [
          [2, 16],
          [2, 11],
          [8, 11],
          [11, 7],
          [18, 7],
          [23, 3],
          [33, 3],
          [38, 7],
          [45, 7],
          [48, 11],
          [53, 11],
          [53, 16],
        ],
        ink,
      );
      p.poly(
        [
          [4, 13],
          [9, 13],
          [12, 9],
          [19, 9],
          [24, 5],
          [32, 5],
          [37, 9],
          [44, 9],
          [47, 13],
          [51, 13],
          [51, 15],
          [4, 15],
        ],
        trim,
      );
      p.r(4, 16, 47, 2, pad);
      p.r(8, 19, 39, 53, border);
      p.r(10, 23, 35, 49, open ? '#795f59' : '#564c56');
      if (open) {
        p.r(12, 25, 31, 46, '#b98f71');
        p.r(14, 27, 26, 41, '#d5ac81');
        p.r(15, 28, 21, 30, '#e5bf8c');
        p.poly(
          [
            [13, 63],
            [30, 56],
            [43, 56],
            [43, 66],
            [27, 71],
            [13, 71],
          ],
          '#e6b981',
        );
        p.r(14, 51, 14, 3, '#947163');
        p.r(15, 54, 2, 9, '#8f7165');
        p.r(24, 54, 2, 7, '#8f7165');
        cargo(p, 14, 51, 1);
        p.r(32, 29, 6, 18, '#b68c72');
        p.r(33, 30, 3, 12, '#eed3a0');
      } else {
        p.r(12, 25, 31, 46, cage ? '#716467' : '#706265');
        p.r(14, 27, 27, 41, cage ? '#947e70' : '#7e6d68');
        cargo(p, 15, 67, 3, true);
        cargo(p, 19, 62, 1, true);
      }
      if (cage) {
        const w = open ? 7 : 30;
        p.g.save();
        p.g.beginPath();
        p.g.rect(12, 25, w, 47);
        p.g.clip();
        for (let i = -45; i < 60; i += 7) {
          p.line(12 + i, 25, 12 + i + 46, 71, '#5c6766');
          p.line(12 + i, 25, 12 + i - 46, 71, '#6d7c76');
        }
        p.g.restore();
        p.r(12, 24, w, 2, '#83928a');
        p.r(12, 70, w, 2, '#5c6667');
        p.r(11 + w, 24, 2, 48, '#535c60');
        if (!open) {
          p.r(39, 47, 4, 6, ink);
          p.r(40, 48, 2, 3, pad);
        }
      } else {
        const shutter = open ? 9 : 44;
        p.r(12, 24, 31, shutter, '#756062');
        for (let i = 1; i < shutter - 1; i += 4) {
          p.r(13, 24 + i, 29, 2, bridge ? '#8e8b81' : '#aa7f65');
          p.r(14, 24 + i, 14, 1, bridge ? '#a2a08c' : '#c59874');
        }
        p.r(12, 24 + shutter - 1, 31, 2, border);
        if (!open) {
          p.r(23, 49, 10, 3, '#544a53');
          p.r(24, 49, 8, 1, pad);
        }
      }
      for (const x of [6, 45]) {
        p.r(x, 19, 4, 55, border);
        p.r(x + 1, 20, 1, 50, trim);
        for (const y of [25, 42, 60, 69]) p.dot(x + 2, y, pad);
        p.r(x - 1, 72, 6, 4, ink);
      }
      p.r(11, 72, 33, 3, border);
      p.r(12, 72, 31, 1, open ? '#e6bb85' : '#a18471');
      p.r(14, 12, 28, 9, border);
      wingedPost(p, 28, 12, pad, border);
      for (const x of [3, 50]) {
        p.r(x - 2, 25, 5, 7, ink);
        p.r(x - 1, 26, 3, 4, open ? '#e5c285' : '#b98d70');
        p.dot(x, 26, open ? cream : '#cfa789');
      }
    });
  }
  function yardCargo(room) {
    return piece('cargo/' + room, 35, 29, (p) => {
      const trolley = room !== 'depot',
        sh = '#625558',
        lit = '#ad947a';
      if (trolley) {
        p.line(3, 23, 7, 8, sh, 2);
        p.line(5, 8, 9, 8, sh);
        p.r(4, 23, 27, 3, sh);
        p.oval(9, 26, 3, 3, sh);
        p.oval(26, 26, 3, 3, sh);
        p.dot(9, 26, lit);
        p.dot(26, 26, lit);
      }
      const y = trolley ? 23 : 29;
      p.poly(
        [
          [8, y - 1],
          [7, y - 4],
          [8, y - 12],
          [12, y - 17],
          [12, y - 20],
          [17, y - 21],
          [17, y - 17],
          [20, y - 13],
          [22, y - 5],
          [21, y],
        ],
        sh,
      );
      p.poly(
        [
          [9, y - 2],
          [9, y - 8],
          [11, y - 14],
          [15, y - 16],
          [18, y - 13],
          [20, y - 5],
          [19, y - 1],
        ],
        '#9c8e74',
      );
      p.line(12, y - 16, 16, y - 16, '#c3a882');
      p.line(12, y - 12, 10, y - 7, '#b3a07e');
      p.r(15, y - 10, 4, 4, '#c1ad8a');
      cargo(p, 20, y - 1, 1, true);
      cargo(p, 23, y, 1, true);
    });
  }
  function flightBird(room, frame) {
    return piece('fly/' + room + '/' + frame, 13, 10, (p) => {
      const wing = room === 'alley' ? '#8d7b85' : '#71818e',
        back = room === 'alley' ? '#a38b8c' : '#83909a';
      p.line(2, 6, 7, 5, wing);
      p.r(6, 5, 4, 2, wing);
      p.r(9, 4, 2, 2, wing);
      p.dot(11, 5, back);
      if (frame === 0) {
        p.line(6, 5, 3, 1, wing, 2);
        p.line(7, 5, 9, 2, back);
      } else if (frame === 1) {
        p.line(7, 5, 1, 4, wing, 2);
        p.line(7, 5, 10, 3, back);
      } else {
        p.line(7, 6, 3, 9, wing);
        p.line(6, 6, 3, 8, wing, 2);
      }
    });
  }
  const cargoSpots = { alley: [260, 1520, 2080], bridge: [335, 1412, 2505], depot: [67, 623, 1246] };
  function restingHeight(terrain, x) {
    const floor = terrain.find((s) => !s.thin && x >= s.x1 && x <= s.x2);
    return floor?.y ?? terrain.find((s) => x >= s.x1 && x <= s.x2)?.y;
  }
  function pan(ctx, bitmap, cameraX, pace, width, height) {
    const span = bitmap.width * cell;
    const shift = Math.round((cameraX * pace) / cell) * cell;
    let x = -(((shift % span) + span) % span);
    for (; x < width; x += span) ctx.drawImage(bitmap, x, 0, span, height);
  }
  function draw(ctx, view) {
    const {
      terrain = [],
      cameraX = 0,
      time = 0,
      checkpointX,
      checkpointLit,
      gateX,
      gateClosed,
      exitX,
      exitOpen,
    } = view;
    const width = view.width || 1200,
      height = view.height || 675;
    const room = view.room === 'depot' ? 'depot' : view.room === 'bridge' ? 'bridge' : 'alley';
    if (!roomArt.has(room))
      roomArt.set(room, {
        sky: paintSky(room),
        town: room === 'depot' ? null : farTown(room),
        middle: room === 'alley' ? alleyMiddle() : room === 'bridge' ? bridgeMiddle() : depotMiddle(),
      });
    const art = roomArt.get(room);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art.sky, 0, 0, width, height);
    if (art.town) pan(ctx, art.town, cameraX, 0.23, width, height);
    if (room !== 'depot') {
      const t = motion?.matches ? 2 : time;
      const distance = (t * 6.4 + 72 - (cameraX * 0.11) / cell) % (skyWidth + 86);
      for (const [offset, y, speed] of [
        [0, 32, 1],
        [-11, 36, 0.83],
        [-21, 30, 0.91],
      ]) {
        const x = Math.round(distance + offset);
        const frame = [0, 1, 2, 1][Math.floor(t * 4.5 * speed) % 4] || 0;
        const bird = flightBird(room, frame);
        ctx.drawImage(
          bird,
          (x * width) / skyWidth,
          Math.round(((y + Math.sin(t * 0.5 + offset)) * height) / skyHeight),
          bird.width * cell,
          bird.height * cell,
        );
      }
    }
    pan(ctx, art.middle, cameraX, room === 'alley' ? 0.64 : room === 'bridge' ? 0.68 : 0.79, width, height);
    const place = (bitmap, x, y, anchor) => {
      const left = Math.round(x - cameraX - anchor * cell);
      if (left + bitmap.width * cell >= 0 && left <= width)
        ctx.drawImage(
          bitmap,
          left,
          Math.round(y) - bitmap.height * cell,
          bitmap.width * cell,
          bitmap.height * cell,
        );
    };
    for (const x of cargoSpots[room]) {
      const y = restingHeight(terrain, x);
      if (y !== undefined && x >= cameraX - 90 && x <= cameraX + width + 90) place(yardCargo(room), x, y, 17);
    }
    if (Number.isFinite(exitX)) {
      const y = restingHeight(terrain, exitX);
      if (y !== undefined) place(dispatchDoor(room, !!exitOpen), exitX, y, 27);
    }
    if (Number.isFinite(checkpointX)) {
      const y = restingHeight(terrain, checkpointX);
      if (y !== undefined) {
        const low = terrain.some(
          (p) => p.thin && checkpointX >= p.x1 - 12 && checkpointX <= p.x2 + 12 && y > p.y && y - p.y < 145,
        );
        place(checkpointArt(!!checkpointLit, low), checkpointX, y, 13);
      }
    }
    if (Number.isFinite(gateX)) {
      const crossing = (x, closed) => {
        const y = restingHeight(terrain, x);
        if (y !== undefined) place(gateArt(closed), x, y, 32);
      };
      // The next gate moves forward when a machine falls. Leave its old crossing visibly raised.
      const layout = window.DispatchScript?.rooms.find((r) => r.terrain === terrain);
      for (const stop of layout?.encounters || []) if (stop.gate < gateX) crossing(stop.gate, false);
      // The route uses the door's position after its last crossing opens.
      if (gateX !== exitX) crossing(gateX, !!gateClosed);
    }
    terrain.forEach((platform, index) => {
      const left = Math.round(platform.x1 - cameraX),
        right = Math.round(platform.x2 - cameraX);
      if (left >= width || right <= 0 || left >= right) return;
      const art = platformArt(room, platform, index);
      if (!platform.thin) {
        const supports = footing(room, art.width);
        ctx.drawImage(supports, left, Math.round(platform.y) + 135, right - left, supports.height * cell);
      }
      ctx.drawImage(art, left, Math.round(platform.y), right - left, art.height * cell);
    });
    ctx.restore();
  }
  window.YardArt = Object.freeze({ draw });
})();
