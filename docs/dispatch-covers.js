/* The Last Dispatch. Six original cartridge illustrations at 320 by 180. */
(() => {
  'use strict';

  const WIDTH = 320,
    HEIGHT = 180;
  const c = {
    ink: '#252337',
    night: '#343349',
    navy: '#394760',
    slate: '#526078',
    steel: '#758396',
    plum: '#5b475e',
    violet: '#756079',
    lilac: '#a6839b',
    smoke: '#aa8995',
    brick: '#804f4a',
    rust: '#a45e49',
    copper: '#c87c53',
    ochre: '#dc975b',
    berry: '#a85261',
    red: '#cf6058',
    coral: '#ed7c62',
    peach: '#ec9e78',
    sand: '#e3b783',
    gold: '#f3c36c',
    wheat: '#f5d69a',
    cream: '#ffe9b7',
    white: '#fff3ce',
    green: '#496769',
    teal: '#4d8984',
    aqua: '#75b3a0',
    mint: '#a6d4b3',
    ice: '#d5e3bd',
  };
  const scenes = new Map();
  const symbols = new Map();

  function surface(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  class PixelPen {
    constructor(canvas) {
      this.g = canvas.getContext('2d');
      this.g.imageSmoothingEnabled = false;
    }
    rect(x, y, w, h, color) {
      this.g.fillStyle = color;
      this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    line(x, y, endX, endY, color, thickness = 1) {
      x = Math.round(x);
      y = Math.round(y);
      endX = Math.round(endX);
      endY = Math.round(endY);
      const dx = Math.abs(endX - x),
        dy = -Math.abs(endY - y);
      const sx = x < endX ? 1 : -1,
        sy = y < endY ? 1 : -1;
      let err = dx + dy;
      while (true) {
        this.rect(x, y, thickness, thickness, color);
        if (x === endX && y === endY) return;
        const twice = err * 2;
        if (twice >= dy) {
          err += dy;
          x += sx;
        }
        if (twice <= dx) {
          err += dx;
          y += sy;
        }
      }
    }
    path(points, color, thickness = 1) {
      for (let i = 2; i < points.length; i += 2)
        this.line(points[i - 2], points[i - 1], points[i], points[i + 1], color, thickness);
    }
    poly(points, color, outline) {
      let min = points[1],
        max = points[1];
      for (let i = 3; i < points.length; i += 2) {
        min = Math.min(min, points[i]);
        max = Math.max(max, points[i]);
      }
      for (let y = Math.floor(min); y <= max; y++) {
        const at = y + 0.5,
          cuts = [];
        for (let v = 0, last = points.length - 2; v < points.length; last = v, v += 2) {
          const ax = points[last],
            ay = points[last + 1],
            bx = points[v],
            by = points[v + 1];
          if (ay > at !== by > at) cuts.push(ax + ((at - ay) * (bx - ax)) / (by - ay));
        }
        cuts.sort((a, b) => a - b);
        for (let k = 0; k + 1 < cuts.length; k += 2) {
          const from = Math.ceil(cuts[k] - 0.5);
          this.rect(from, y, Math.ceil(cuts[k + 1] - 0.5) - from, 1, color);
        }
      }
      if (outline) this.path([...points, points[0], points[1]], outline);
    }
    oval(cx, cy, rx, ry, color) {
      for (let dy = -ry; dy <= ry; dy++) {
        const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
        this.rect(cx - half, cy + dy, half * 2 + 1, 1, color);
      }
    }
    image(canvas, x, y, w = canvas.width, h = canvas.height, flip = false) {
      const g = this.g;
      g.save();
      g.translate(Math.round(flip ? x + w : x), Math.round(y));
      if (flip) g.scale(-1, 1);
      g.drawImage(canvas, 0, 0, Math.round(w), Math.round(h));
      g.restore();
    }
  }

  function symbol(key, width, height, paint) {
    if (!symbols.has(key)) {
      const tile = surface(width, height);
      paint(new PixelPen(tile));
      symbols.set(key, tile);
    }
    return symbols.get(key);
  }

  function dog(p, name, x, feet, size, facing = 1, pose = 'idle', phase = 0.5, time = 0.13) {
    if (window.DogArt) window.DogArt.draw(p.g, name, x, feet, { scale: size, face: facing, pose, phase, time });
  }

  function paw(p, x, y, color, size = 1) {
    const marks = [
      [0, 3, 2, 2],
      [2, 1, 2, 3],
      [5, 0, 2, 3],
      [8, 2, 2, 3],
      [3, 5, 4, 2],
      [2, 6, 6, 2],
      [3, 8, 4, 1],
    ];
    for (const [dx, dy, w, h] of marks) p.rect(x + dx * size, y + dy * size, w * size, h * size, color);
  }

  function envelope() {
    return symbol('sealed-envelope', 39, 28, (p) => {
      p.poly([1, 6, 33, 1, 37, 20, 5, 26], c.teal, c.ink);
      p.poly([3, 7, 32, 3, 35, 19, 6, 24], c.aqua);
      p.path([3, 7, 20, 15, 32, 3], c.green, 2);
      p.path([4, 7, 20, 13, 31, 3], c.ice);
      p.path([6, 23, 14, 14], c.mint);
      p.path([24, 13, 34, 19], c.mint);
      p.oval(20, 16, 7, 6, c.green);
      p.oval(20, 15, 6, 5, c.wheat);
      paw(p, 15, 11, c.navy);
      p.rect(5, 8, 3, 1, c.ice);
    });
  }

  function bell() {
    return symbol('depot-bell', 40, 34, (p) => {
      p.rect(17, 1, 6, 5, c.ink);
      p.rect(18, 1, 3, 2, c.wheat);
      p.poly(
        [7, 25, 11, 20, 12, 11, 15, 7, 18, 5, 23, 5, 27, 8, 30, 12, 31, 21, 35, 25, 37, 26, 37, 29, 3, 29, 3, 26],
        c.ink,
      );
      p.poly([7, 25, 13, 20, 14, 12, 17, 8, 21, 6, 25, 8, 28, 13, 29, 21, 33, 25], c.ochre);
      p.poly([19, 8, 24, 9, 26, 13, 27, 22, 32, 25, 24, 25, 22, 20, 21, 12], c.rust);
      p.path([10, 25, 15, 21, 16, 12, 19, 9], c.wheat, 2);
      p.rect(6, 26, 29, 2, c.gold);
      p.rect(10, 28, 21, 1, c.brick);
      p.rect(18, 29, 5, 3, c.copper);
      p.rect(19, 32, 3, 1, c.ink);
    });
  }

  function cloudStrip(p, x, y, len, tone, light) {
    p.poly(
      [
        x,
        y + 7,
        x + 4,
        y + 5,
        x + 12,
        y + 5,
        x + 15,
        y + 2,
        x + 26,
        y + 2,
        x + 30,
        y,
        x + len - 17,
        y + 1,
        x + len - 11,
        y + 4,
        x + len - 4,
        y + 4,
        x + len,
        y + 7,
      ],
      tone,
    );
    if (light) p.rect(x + 9, y + 7, Math.max(4, len - 15), 1, light);
  }

  function steam(p, x, y, w, h, body, lit) {
    const shape = [
      0, 7, 5, 7, 5, 5, 11, 5, 13, 3, 19, 3, 21, 1, 27, 1, 29, 3, 34, 3, 36, 5, 42, 5, 43, 7, 47, 7, 48, 9, 43, 10, 34,
      10, 30, 9, 23, 11, 14, 10, 8, 10, 5, 9, 0, 9,
    ];
    p.poly(
      shape.map((v, i) => (i % 2 ? y + (v * h) / 11 : x + (v * w) / 48)),
      body,
    );
    p.path(
      [x + w * 0.26, y + h * 0.31, x + w * 0.4, y + h * 0.31, x + w * 0.45, y + h * 0.13, x + w * 0.55, y + h * 0.13],
      lit,
    );
  }

  const distantBlocks = [
    [-8, 28, 13, 0],
    [9, 15, 17, 1],
    [25, 25, 21, 0],
    [46, 18, 11, 2],
    [60, 19, 16, 0],
    [80, 11, 31, 1],
    [91, 24, 21, 0],
    [111, 18, 17, 1],
    [129, 13, 30, 2],
    [144, 26, 15, 0],
    [169, 18, 22, 0],
    [187, 12, 35, 2],
    [201, 19, 16, 1],
    [223, 16, 27, 0],
    [243, 22, 21, 0],
    [269, 12, 31, 2],
    [283, 23, 19, 1],
    [305, 20, 11, 0],
  ];
  function city(p, ground, wall, roof, glow) {
    for (const [x, w, h, style] of distantBlocks) {
      const y = ground - h;
      p.rect(x, y, w, h, wall);
      if (style === 1) p.poly([x - 2, y, x + w / 2, y - 7, x + w + 2, y], wall);
      if (style === 2) {
        p.rect(x + 2, y - 4, w - 4, 4, wall);
        p.rect(x + 5, y - 11, 3, 9, wall);
      }
      p.rect(x, y, w, 2, roof);
      if (glow) for (let n = 4; n < w - 2; n += 6) p.rect(x + n, y + 5 + (n % 3), 2, 2, glow);
    }
    p.rect(0, ground, WIDTH, 9, wall);
  }

  function lamp(p, x, y, large = false) {
    const r = large ? 7 : 4;
    p.rect(x - 1, y + r, 2, large ? 25 : 15, c.ink);
    p.poly([x - r - 2, y - r, x + r + 2, y - r, x + r - 1, y + r, x - r + 1, y + r], c.ink);
    p.poly([x - r, y - r + 2, x + r, y - r + 2, x + r - 2, y + r - 2, x - r + 2, y + r - 2], c.wheat);
    p.rect(x - 1, y - r + 2, 2, r * 2 - 4, c.white);
    p.rect(x - r - 1, y - r - 2, 2 * r + 3, 2, c.ink);
  }

  function stationClock(p, cx, cy, r) {
    p.oval(cx, cy, r + 3, r + 3, c.ink);
    p.oval(cx, cy, r + 1, r + 1, c.copper);
    p.oval(cx, cy, r - 1, r - 1, c.brick);
    p.oval(cx, cy, r - 3, r - 3, c.wheat);
    for (const [a, b] of [
      [0, -1],
      [0.5, -0.86],
      [0.86, -0.5],
      [1, 0],
      [0.86, 0.5],
      [0.5, 0.86],
      [0, 1],
      [-0.5, 0.86],
      [-0.86, 0.5],
      [-1, 0],
      [-0.86, -0.5],
      [-0.5, -0.86],
    ]) {
      p.rect(cx + a * (r - 6), cy + b * (r - 6), 2, 2, c.brick);
    }
    // The six o'clock train has just passed; the hour and minute hands point apart.
    p.line(cx, cy - r * 0.64, cx, cy, c.ink, 2);
    p.line(cx, cy, cx, cy + r * 0.41, c.brick, 2);
    p.rect(cx - 1, cy - 1, 3, 3, c.ochre);
  }

  function train() {
    return symbol('mail-engine', 114, 69, (p) => {
      // Side and smokebox share a three-quarter silhouette. Every wheel sits on the same rail.
      p.poly(
        [
          1, 42, 6, 39, 9, 20, 5, 20, 5, 16, 32, 12, 39, 15, 37, 20, 35, 20, 35, 30, 64, 24, 66, 20, 71, 19, 74, 22, 80,
          21, 82, 9, 78, 8, 77, 3, 92, 1, 95, 5, 93, 9, 90, 10, 91, 19, 97, 21, 101, 26, 105, 33, 106, 42, 103, 47, 106,
          53, 113, 58, 113, 61, 92, 66, 78, 63, 72, 65, 66, 62, 28, 65, 5, 61,
        ],
        c.ink,
      );
      p.poly([8, 17, 32, 14, 36, 16, 8, 20], c.copper);
      p.poly([11, 21, 32, 18, 32, 39, 10, 42], c.navy);
      p.poly([14, 23, 27, 21, 26, 32, 14, 34], c.ochre);
      p.poly([16, 24, 25, 23, 24, 31, 16, 32], c.night);
      p.path([18, 24, 20, 24, 18, 29], c.slate);
      p.rect(12, 35, 2, 5, c.rust);
      p.path([12, 37, 32, 34], c.rust, 2);
      p.poly([33, 30, 80, 22, 88, 23, 94, 27, 90, 44, 33, 51], c.navy);
      p.poly([33, 30, 78, 23, 86, 24, 82, 28, 32, 36], c.copper);
      p.poly([33, 36, 80, 29, 80, 33, 33, 40], c.slate);
      for (const x of [42, 58, 71]) {
        const y = 28 - (x - 40) / 7;
        p.path([x, y, x + 2, y + 3, x + 1, y + 16], c.ink, 2);
        p.rect(x + 1, y, 2, 1, c.gold);
      }
      p.poly([81, 4, 91, 3, 92, 5, 83, 7], c.ochre);
      p.rect(84, 9, 4, 12, c.brick);
      p.oval(92, 35, 12, 15, c.rust);
      p.oval(93, 35, 10, 13, c.ochre);
      p.oval(93, 35, 8, 11, c.night);
      p.oval(93, 35, 5, 7, c.slate);
      p.oval(93, 30, 5, 4, c.ink);
      p.oval(94, 30, 3, 3, c.cream);
      p.rect(93, 29, 2, 2, c.white);
      p.rect(90, 39, 6, 2, c.copper);
      for (const [x, y] of [
        [33, 43],
        [41, 41],
        [51, 40],
        [61, 38],
        [70, 36],
        [84, 28],
        [86, 43],
        [99, 27],
        [100, 39],
      ])
        p.rect(x, y, 1, 1, c.wheat);
      p.poly([5, 45, 77, 35, 81, 40, 8, 51], c.rust);
      p.path([6, 45, 76, 35], c.gold);
      for (const [x, y, r] of [
        [13, 54, 6],
        [31, 53, 8],
        [49, 51, 8],
        [69, 48, 8],
        [86, 49, 5],
      ]) {
        p.oval(x, y, r, r, c.ink);
        p.oval(x, y, r - 2, r - 2, c.slate);
        p.oval(x, y, r - 4, r - 4, c.night);
        p.rect(x - 1, y - 1, 2, 2, c.ochre);
      }
      p.path([28, 54, 47, 50, 67, 51], c.ochre, 2);
      p.poly([91, 50, 101, 49, 111, 58, 92, 62, 79, 59], c.brick, c.ink);
      for (const x of [86, 92, 98, 103]) p.line(x, 55, x + 5, 59, c.ochre);
      p.path([79, 59, 92, 62, 111, 58], c.gold);
    });
  }

  function pipPortrait() {
    // Bespoke cover pose. The coat patch, folded ear and scarf follow Pip's battle palette.
    const dark = '#493542',
      chestnut = '#82503e',
      brown = '#ac6f46',
      tan = '#d99a60';
    const fur = '#e7c697',
      light = '#fff0c4',
      shade = '#c59c75';
    return symbol('pip-portrait', 151, 151, (p) => {
      // Back ear, the long scarf ends, and the nearer shoulder sit behind the head.
      p.poly([78, 27, 76, 11, 73, 3, 75, 1, 81, 2, 92, 11, 99, 23, 98, 34], dark, c.ink);
      p.poly([80, 6, 88, 13, 95, 23, 94, 29, 85, 26], brown);
      p.path([76, 3, 81, 5, 88, 12], tan, 2);
      p.poly(
        [47, 81, 38, 87, 22, 87, 11, 83, 2, 78, 6, 91, 18, 102, 12, 106, 4, 108, 0, 114, 17, 112, 37, 108, 53, 94],
        c.ink,
      );
      p.poly([44, 86, 32, 91, 18, 89, 8, 83, 13, 93, 23, 99, 32, 98, 43, 92], c.red);
      p.poly([35, 100, 17, 106, 5, 111, 17, 110, 38, 105, 47, 96], c.rust);
      p.poly([37, 91, 44, 89, 53, 94, 52, 103, 45, 109, 33, 104, 31, 99], c.red, c.ink);
      p.poly(
        [
          43, 100, 65, 96, 81, 94, 93, 96, 105, 100, 116, 110, 128, 126, 132, 143, 134, 150, 14, 150, 17, 135, 25, 121,
          37, 110,
        ],
        c.ink,
      );
      p.poly(
        [21, 149, 22, 137, 28, 125, 40, 113, 53, 106, 65, 102, 85, 98, 98, 100, 105, 106, 106, 123, 98, 143, 91, 150],
        fur,
      );
      p.poly([19, 149, 26, 135, 39, 122, 45, 119, 43, 127, 51, 122, 47, 133, 55, 128, 53, 138, 47, 150], tan);
      p.poly(
        [
          52, 148, 57, 131, 70, 113, 90, 104, 101, 106, 103, 113, 96, 116, 97, 120, 89, 121, 89, 126, 82, 130, 78, 142,
          79, 150,
        ],
        light,
      );
      p.poly([98, 149, 107, 123, 105, 110, 115, 118, 124, 131, 128, 145, 128, 150], brown);
      p.path([22, 146, 28, 135, 34, 129], chestnut, 2);
      p.path([56, 144, 60, 136, 64, 131], fur, 2);
      // Satchel caught under the arm, with the stamped letter still visible.
      p.poly([43, 111, 51, 105, 58, 105, 101, 140, 102, 151, 92, 151, 67, 126], chestnut, c.ink);
      p.path([49, 108, 72, 124, 94, 144], c.ochre, 2);
      p.poly([84, 140, 112, 126, 127, 130, 135, 147, 136, 151, 82, 151], chestnut, c.ink);
      p.image(envelope(), 99, 114, 32, 23);
      p.poly([84, 140, 117, 131, 131, 132, 133, 139, 123, 145, 92, 150, 83, 148], brown, c.ink);
      p.path([88, 142, 117, 135, 130, 135], c.ochre);
      p.rect(112, 139, 5, 5, c.ink);
      p.rect(113, 140, 3, 2, c.gold);
      // Scruffy outside contour. Stair-step indentations change direction along the ruff.
      p.poly(
        [
          35, 37, 45, 27, 59, 21, 73, 18, 85, 20, 94, 25, 100, 32, 105, 42, 112, 46, 123, 45, 130, 47, 133, 52, 131, 59,
          125, 64, 120, 69, 116, 76, 107, 80, 98, 82, 88, 87, 92, 88, 82, 94, 71, 96, 55, 93, 46, 91, 36, 83, 32, 84,
          31, 79, 25, 77, 22, 73, 23, 69, 18, 68, 20, 63, 18, 59, 23, 52, 22, 46, 28, 40,
        ],
        c.ink,
      );
      p.poly(
        [
          34, 39, 46, 29, 58, 24, 73, 21, 85, 23, 93, 28, 98, 34, 101, 43, 111, 49, 123, 48, 128, 50, 130, 53, 127, 59,
          122, 62, 116, 67, 113, 73, 104, 77, 92, 80, 86, 85, 83, 90, 70, 93, 56, 90, 47, 87, 38, 80, 32, 79, 31, 75,
          25, 72, 27, 68, 23, 66, 25, 62, 23, 58, 27, 52, 25, 47,
        ],
        fur,
      );
      p.poly(
        [
          51, 28, 64, 23, 75, 22, 86, 25, 95, 31, 99, 42, 109, 49, 123, 49, 126, 56, 119, 61, 111, 65, 102, 66, 98, 71,
          83, 74, 68, 70, 62, 65, 63, 56, 57, 48,
        ],
        light,
      );
      p.poly(
        [
          32, 46, 49, 36, 56, 42, 53, 55, 57, 65, 66, 72, 76, 76, 91, 76, 86, 80, 78, 82, 79, 85, 70, 88, 59, 85, 55,
          83, 57, 87, 44, 81, 39, 75, 35, 74, 34, 67, 30, 67, 31, 61, 28, 61,
        ],
        shade,
      );
      p.poly(
        [
          43, 35, 51, 28, 60, 25, 70, 23, 74, 24, 73, 28, 68, 32, 73, 35, 80, 38, 84, 44, 80, 51, 72, 55, 63, 55, 61,
          61, 54, 62, 48, 58, 45, 50,
        ],
        tan,
      );
      p.poly([47, 35, 56, 29, 65, 27, 62, 31, 55, 35, 54, 39, 59, 40, 64, 45, 60, 48, 59, 55, 52, 57, 47, 51], brown);
      // Folded near ear, warm sun along the outside cartilage.
      p.poly([55, 33, 48, 25, 35, 18, 27, 17, 21, 20, 20, 26, 25, 35, 33, 43, 37, 54, 42, 56, 47, 50, 48, 41], c.ink);
      p.poly([49, 32, 43, 26, 33, 21, 26, 20, 23, 23, 26, 30, 36, 40, 40, 49, 43, 50, 45, 41], brown);
      p.poly([26, 21, 32, 22, 41, 28, 46, 33, 42, 34, 35, 32, 30, 28], tan);
      p.poly([28, 29, 35, 33, 41, 36, 44, 36, 42, 45, 38, 39, 33, 35], chestnut);
      p.path([22, 21, 26, 19, 32, 19], c.ochre, 2);
      // Brows and eyes angle toward the departing locomotive.
      p.poly([58, 42, 65, 38, 72, 37, 78, 40, 79, 43, 75, 44, 69, 42, 63, 44, 59, 45], dark);
      p.poly([61, 47, 64, 43, 72, 41, 78, 43, 80, 45, 78, 50, 74, 53, 66, 53, 62, 51], c.ink);
      p.poly([64, 47, 68, 44, 73, 44, 77, 45, 75, 49, 72, 51, 67, 51], c.white);
      p.rect(72, 44, 5, 6, c.ink);
      p.rect(73, 45, 2, 2, c.white);
      p.rect(73, 50, 3, 1, brown);
      p.path([65, 54, 73, 55, 78, 52], shade);
      p.poly([88, 36, 93, 35, 97, 37, 98, 40, 95, 40, 92, 38, 87, 39], dark);
      p.poly([90, 42, 94, 40, 98, 41, 100, 44, 98, 47, 92, 47, 89, 46], c.ink);
      p.rect(91, 43, 5, 3, c.white);
      p.rect(96, 42, 3, 4, c.ink);
      p.rect(96, 42, 1, 1, c.white);
      p.path([78, 30, 82, 28, 87, 29], fur, 2);
      p.path([84, 45, 89, 48, 95, 49], fur, 2);
      // A blunt, dark nose, a smiling muzzle and three freckles keep the face legible at cartridge size.
      p.poly([117, 47, 125, 45, 131, 46, 133, 49, 132, 54, 127, 58, 122, 58, 117, 54, 115, 50], c.ink);
      p.poly([120, 48, 125, 47, 129, 48, 128, 50, 121, 50], c.steel);
      p.rect(129, 51, 2, 2, dark);
      p.path([125, 58, 123, 61, 117, 64, 109, 66, 102, 65], c.ink, 2);
      p.poly([117, 65, 114, 70, 107, 73, 98, 74, 92, 71, 91, 68, 99, 69, 106, 68], dark);
      p.poly([101, 71, 107, 70, 110, 70, 107, 72, 102, 73], c.coral);
      p.poly([112, 66, 117, 65, 114, 69], c.white);
      p.path([81, 63, 84, 61, 88, 61], shade);
      p.rect(107, 56, 2, 2, brown);
      p.rect(112, 59, 2, 1, brown);
      p.rect(103, 59, 2, 1, brown);
      p.path([49, 65, 53, 68, 55, 68], fur, 2);
      p.path([60, 75, 64, 77, 70, 77], fur, 2);
      // Double-folded red-orange neckerchief. A bright edge separates the chin from the cloth.
      p.poly(
        [
          34, 81, 43, 83, 57, 88, 68, 89, 78, 87, 90, 82, 96, 81, 94, 89, 88, 93, 85, 99, 77, 103, 73, 117, 61, 114, 52,
          107, 45, 103, 35, 100, 31, 95,
        ],
        c.ink,
      );
      p.poly([35, 85, 43, 86, 56, 91, 68, 92, 80, 90, 92, 84, 90, 89, 83, 94, 73, 98, 55, 100, 41, 96, 34, 93], c.red);
      p.poly([43, 96, 56, 99, 72, 97, 82, 94, 81, 99, 74, 103, 71, 113, 64, 111, 54, 104], c.rust);
      p.path([36, 87, 52, 93, 66, 95, 76, 93], c.coral, 2);
      p.path([55, 103, 65, 106, 72, 100], c.coral, 2);
      p.path([39, 95, 44, 98, 49, 98], c.berry, 2);
    });
  }

  function title(p) {
    const bands = [
      [0, 26, '#905970'],
      [26, 21, '#b66b72'],
      [47, 20, '#d18172'],
      [67, 22, c.peach],
      [89, 33, c.sand],
    ];
    for (const [y, h, color] of bands) p.rect(0, y, WIDTH, h, color);
    p.oval(207, 59, 49, 49, c.ochre);
    p.oval(207, 58, 47, 47, c.wheat);
    for (const [x, y, l] of [
      [-14, 15, 91],
      [66, 7, 51],
      [100, 28, 50],
      [232, 17, 91],
      [260, 46, 63],
    ])
      cloudStrip(p, x, y, l, '#aa6872', '#d58777');
    p.rect(154, 67, 49, 2, c.peach);
    p.rect(183, 75, 73, 2, c.peach);
    p.rect(168, 82, 52, 2, c.peach);
    city(p, 109, '#9a797d', '#9f7e80', '#ce9a89');
    // Telegraph wires lead the eye along the train instead of boxing in the hero.
    p.path([-2, 20, 31, 25, 56, 28, 80, 29, 115, 28, 147, 24, 177, 17], c.plum);
    p.path([-2, 25, 30, 30, 57, 33, 84, 34, 119, 32, 146, 28, 177, 21], c.plum);
    p.rect(18, 17, 3, 95, c.plum);
    p.rect(11, 17, 19, 2, c.plum);
    p.rect(13, 14, 2, 4, c.brick);
    p.rect(24, 14, 2, 4, c.brick);
    p.poly(
      [
        0, 107, 19, 99, 33, 98, 39, 91, 56, 92, 62, 86, 77, 87, 101, 102, 116, 96, 124, 98, 132, 102, 153, 98, 184, 103,
        190, 121, 0, 132,
      ],
      c.violet,
    );
    // Distant dispatch-bell turret, with an open belfry and copper weather vane.
    p.g.save();
    p.g.translate(16, -12);
    p.poly(
      [
        123, 95, 128, 88, 129, 75, 131, 74, 131, 66, 136, 58, 137, 52, 138, 58, 144, 66, 145, 74, 147, 76, 147, 91, 152,
        95,
      ],
      c.plum,
    );
    p.rect(133, 69, 8, 6, c.peach);
    p.image(bell(), 133, 68, 8, 7);
    p.rect(133, 78, 10, 10, c.copper);
    p.oval(138, 82, 4, 4, c.wheat);
    p.path([137, 80, 138, 82, 140, 82], c.plum);
    p.g.restore();
    steam(p, 157, 29, 58, 14, '#b58891', '#ce9b98');
    steam(p, 183, 36, 51, 14, '#a57a87', '#bc8b8e');
    steam(p, 210, 42, 41, 14, '#976f83', '#ae8190');
    steam(p, 234, 48, 24, 11, '#866b7f', '#a27a89');
    steam(p, 247, 53, 15, 9, c.violet, '#9d7889');
    // Serrated factory roof and signal lamps read below the broad sky shapes.
    p.poly(
      [
        266, 89, 271, 81, 277, 81, 277, 75, 284, 78, 285, 71, 293, 76, 294, 69, 301, 75, 302, 66, 305, 66, 306, 76, 320,
        73, 320, 101,
      ],
      c.violet,
    );
    for (const x of [276, 284, 293, 302, 310]) p.rect(x, 83 - (x % 3), 3, 2, c.peach);
    p.rect(311, 41, 3, 39, c.plum);
    p.rect(307, 41, 12, 2, c.brick);
    p.rect(309, 37, 2, 4, c.violet);
    p.path([285, 36, 296, 39, 312, 41, 319, 41], c.violet);
    p.poly([103, 113, 183, 100, 247, 92, 320, 76, 320, 138, 96, 150], c.navy);
    p.path([103, 116, 194, 101, 273, 86, 319, 76], c.ochre, 2);
    for (let x = 119; x < 319; x += 18) p.line(x, 117 - (x - 119) * 0.18, x + 11, 132 - (x - 119) * 0.1, c.plum, 2);
    // Mail coach in the distance, then the approaching engine.
    p.poly([108, 92, 152, 86, 168, 94, 167, 110, 111, 119], c.ink);
    p.poly([111, 93, 153, 88, 163, 93, 112, 102], c.copper);
    p.poly([111, 103, 163, 95, 163, 107, 111, 115], c.navy);
    for (let x = 117; x < 158; x += 9) p.rect(x, 102 - (x - 117) * 0.15, 5, 3, c.gold);
    p.image(train(), 157, 55, 131, 79);
    p.poly([0, 128, 37, 121, 102, 128, 150, 119, 208, 130, 250, 120, 320, 111, 320, 180, 0, 180], c.night);
    p.path([142, 132, 208, 144, 319, 126], c.slate, 2);
    p.path([189, 155, 319, 134], c.brick, 2);
    p.path([205, 162, 319, 145], c.copper);
    for (let i = 0; i < 7; i++) p.line(196 + i * 22, 165 - i * 3, 212 + i * 22, 170 - i * 3, c.plum, 2);
    p.image(pipPortrait(), 9, 26, 155, 155);
    p.oval(200, 169, 25, 4, c.ink);
    p.oval(264, 169, 24, 4, c.ink);
    dog(p, 'noodle', 196, 170, 0.75, 1, 'idle');
    dog(p, 'clover', 265, 170, 0.81, -1, 'idle');
    // A cropped platform corner frames the group like the lip of a printed cover.
    p.poly([151, 180, 189, 173, 214, 173, 229, 169, 290, 171, 320, 165, 320, 180], c.ink);
    p.path([168, 178, 190, 175, 211, 175], c.slate);
    p.rect(302, 162, 5, 1, c.ochre);
    p.rect(298, 164, 2, 1, c.copper);
  }

  function arch(p, x, y, w, h, frame, inside) {
    const shoulder = Math.round(w * 0.23);
    p.poly(
      [
        x,
        y + h,
        x,
        y + shoulder,
        x + 5,
        y + 10,
        x + shoulder,
        y + 3,
        x + w * 0.41,
        y,
        x + w * 0.63,
        y,
        x + w - shoulder,
        y + 3,
        x + w - 5,
        y + 10,
        x + w,
        y + shoulder,
        x + w,
        y + h,
      ],
      frame,
    );
    p.poly(
      [
        x + 4,
        y + h,
        x + 4,
        y + shoulder + 2,
        x + 8,
        y + 12,
        x + shoulder + 2,
        y + 7,
        x + w * 0.42,
        y + 4,
        x + w * 0.61,
        y + 4,
        x + w - shoulder - 1,
        y + 7,
        x + w - 8,
        y + 12,
        x + w - 4,
        y + shoulder + 2,
        x + w - 4,
        y + h,
      ],
      inside,
    );
  }

  function opening(p) {
    p.rect(0, 0, 320, 180, c.night);
    // High clock hall, its bright ticket window throwing a long parallelogram onto the sorting table.
    p.rect(0, 6, 320, 88, c.navy);
    p.rect(0, 16, 320, 2, c.slate);
    for (const [x, y, w, h] of [
      [-17, 25, 54, 73],
      [174, 22, 51, 76],
      [234, 15, 58, 83],
      [305, 24, 49, 74],
    ]) {
      arch(p, x, y, w, h, c.plum, c.ochre);
      p.rect(x + 6, y + 28, w - 12, h - 30, c.copper);
      p.poly([x + 6, y + 30, x + w * 0.58, y + 30, x + 9, y + h - 4, x + 5, y + h - 4], c.wheat);
      p.rect(x + w * 0.46, y + 4, 3, h - 4, c.plum);
      p.rect(x + 4, y + 26, w - 8, 3, c.plum);
      p.rect(x + 4, y + 45, w - 8, 2, c.brick);
      p.rect(x - 4, y + h, w + 8, 4, c.ink);
    }
    p.rect(32, 11, 119, 71, c.ink);
    p.rect(35, 14, 113, 65, c.slate);
    p.rect(38, 17, 107, 59, c.navy);
    p.path([42, 72, 42, 20, 95, 20], c.plum, 2);
    p.path([89, 19, 142, 19, 142, 71], c.copper);
    for (const [x, y] of [
      [38, 17],
      [143, 17],
      [38, 75],
      [143, 75],
    ]) {
      p.rect(x, y, 2, 2, c.ink);
      p.rect(x, y, 1, 1, c.steel);
    }
    p.rect(79, 62, 20, 6, c.plum);
    p.rect(81, 64, 16, 1, c.slate);
    p.rect(152, 28, 13, 27, c.ink);
    p.rect(153, 29, 11, 25, c.green);
    p.poly([154, 31, 162, 31, 162, 41, 159, 39, 154, 42], c.aqua);
    paw(p, 155, 44, c.sand);
    stationClock(p, 62, 44, 22);
    // The bronze bell has lost its clapper. Show the exposed socket in its dark mouth.
    p.rect(102, 24, 37, 3, c.copper);
    p.rect(118, 25, 3, 8, c.ink);
    p.image(bell(), 102, 28, 35, 30);
    p.rect(117, 54, 5, 5, c.navy);
    p.path([132, 47, 136, 50, 134, 54, 137, 56], c.wheat, 2);
    p.rect(134, 59, 2, 2, c.gold);
    p.rect(0, 84, 320, 8, c.ink);
    p.rect(0, 85, 320, 1, c.copper);
    for (let x = 166; x < 320; x += 18) {
      p.rect(x, 83, 2, 3, c.ochre);
      p.rect(x + 4, 88, 8, 1, c.plum);
    }
    p.poly([0, 97, 179, 87, 320, 95, 320, 180, 0, 180], c.plum);
    p.poly([195, 91, 267, 95, 190, 154, 57, 168], c.rust);
    p.poly([204, 95, 256, 96, 185, 147, 91, 155], c.copper);
    for (const y of [102, 115, 135, 159]) p.path([0, y + 6, 141, y - 3, 319, y + 3], c.brick);
    p.path([3, 176, 125, 104, 149, 92], c.plum);
    p.path([166, 180, 218, 119, 263, 94], c.plum);
    // Flight of pigeonholes and a shallow open delivery crate in the foreground.
    p.rect(0, 61, 34, 42, c.plum);
    p.rect(2, 63, 29, 37, c.brick);
    for (const y of [67, 79, 91])
      for (const x of [2, 16]) {
        p.rect(x, y, 12, 7, c.night);
        p.rect(x + 2, y + 4, 8, 2, c.ochre);
      }
    p.poly([0, 131, 47, 115, 87, 122, 87, 148, 34, 166, 0, 158], c.ink);
    p.poly([1, 130, 47, 118, 82, 123, 34, 139], c.copper);
    p.poly([3, 130, 47, 120, 69, 123, 34, 134], c.night);
    p.poly([0, 136, 35, 142, 35, 162, 0, 155], c.rust);
    p.poly([37, 142, 83, 126, 83, 146, 37, 161], c.brick);
    p.path([2, 142, 31, 147], c.ochre);
    p.path([40, 148, 79, 134], c.rust);
    p.oval(243, 147, 32, 5, c.brick);
    dog(p, 'pip', 234, 148, 0.92, -1, 'land', 0.5);
    p.poly([58, 180, 89, 150, 160, 116, 189, 119, 114, 180], c.brick);
    // Frayed cord and the glowing paw-sealed letter lie together directly below the clock.
    p.path(
      [
        96, 84, 101, 90, 105, 92, 103, 97, 98, 100, 88, 102, 84, 107, 88, 111, 101, 111, 115, 106, 132, 105, 141, 110,
        143, 116,
      ],
      c.ink,
      3,
    );
    p.path(
      [
        96, 84, 102, 90, 105, 92, 102, 96, 96, 99, 86, 102, 83, 107, 88, 111, 101, 110, 115, 105, 132, 104, 141, 109,
        144, 115,
      ],
      c.sand,
      2,
    );
    p.path([143, 115, 146, 118, 147, 120], c.wheat);
    p.path([143, 114, 148, 116, 150, 116], c.wheat);
    p.path([97, 86, 93, 81], c.wheat);
    p.path([97, 85, 96, 80], c.sand);
    for (const [x, y] of [
      [88, 107],
      [95, 109],
      [108, 108],
      [124, 104],
      [136, 106],
    ])
      p.rect(x, y, 2, 2, c.copper);
    p.image(envelope(), 128, 111, 58, 42);
    p.path([182, 127, 190, 122], c.wheat);
    p.rect(194, 120, 3, 1, c.sand);
    for (const [x, y, w] of [
      [111, 139, 9],
      [99, 146, 4],
      [126, 157, 12],
      [200, 150, 7],
      [261, 148, 13],
      [42, 169, 9],
    ])
      p.path([x, y, x + w, y - 1], c.rust);
    p.poly([0, 167, 22, 162, 48, 167, 78, 180, 0, 180], c.night);
    p.poly([278, 180, 299, 161, 320, 155, 320, 180], c.night);
  }

  function crate(p, x, y, w, h) {
    p.rect(x, y, w, h, c.ink);
    p.rect(x + 2, y + 2, w - 4, h - 4, c.brick);
    p.path([x + 3, y + h - 4, x + w - 5, y + 3], c.copper, 3);
    p.rect(x + 2, y + 2, w - 4, 2, c.ochre);
    p.rect(x + 2, y + h - 5, w - 4, 2, c.rust);
    for (const [a, b] of [
      [3, 3],
      [w - 6, 3],
      [3, h - 6],
      [w - 6, h - 6],
    ])
      p.rect(x + a, y + b, 1, 1, c.wheat);
  }

  function clipper(p, x, y) {
    p.poly(
      [
        x,
        y + 26,
        x + 1,
        y + 14,
        x + 5,
        y + 11,
        x + 6,
        y + 4,
        x + 10,
        y,
        x + 20,
        y,
        x + 24,
        y + 4,
        x + 26,
        y + 14,
        x + 30,
        y + 18,
        x + 30,
        y + 27,
      ],
      c.ink,
    );
    p.rect(x + 5, y + 11, 21, 12, c.slate);
    p.rect(x + 8, y + 5, 13, 5, c.copper);
    p.rect(x + 10, y + 7, 9, 2, c.red);
    p.rect(x + 13, y + 7, 3, 2, c.gold);
    p.rect(x + 7, y + 16, 17, 4, c.ink);
    p.rect(x + 9, y + 17, 12, 1, c.wheat);
    p.path([x + 10, y + 20, x + 12, y + 23, x + 18, y + 23, x + 20, y + 20], c.steel);
    p.poly([x + 8, y + 18, x + 14, y + 19, x + 13, y + 23, x + 10, y + 23, x + 10, y + 25, x + 7, y + 25], c.sand);
    p.rect(x + 9, y + 20, 4, 1, c.red);
    p.rect(x + 8, y + 24, 2, 1, c.white);
    p.rect(x + 2, y + 21, 2, 5, c.copper);
    p.rect(x + 25, y + 21, 2, 5, c.copper);
  }

  function rescue(p) {
    // Looking through the parcel alley: cool skylight outside the cage, a warm square within.
    p.rect(0, 0, 320, 180, c.navy);
    p.poly([0, 0, 181, 0, 153, 92, 0, 131], c.slate);
    p.poly([169, 0, 320, 0, 320, 128, 144, 105], c.plum);
    p.poly([104, 0, 173, 0, 151, 91, 121, 102], c.aqua);
    p.poly([110, 0, 128, 0, 127, 80, 120, 88], c.mint);
    p.rect(125, 49, 21, 52, c.green);
    p.rect(127, 42, 15, 8, c.green);
    for (let y = 54; y < 90; y += 9) p.rect(130, y, 3, 4, c.mint);
    for (let y = 15; y < 103; y += 12) p.path([0, y + 7, 88, y - 2, 112, y - 6], c.navy);
    for (let x = 192; x < 323; x += 17) p.line(x, 0, x - 15, 77, c.night, 3);
    p.path([0, 17, 54, 14, 108, 22, 158, 18, 220, 3], c.ink, 2);
    p.path([32, 0, 32, 19, 66, 21, 94, 16], c.brick, 2);
    p.poly([0, 119, 131, 90, 189, 89, 320, 122, 320, 180, 0, 180], c.plum);
    p.poly([26, 180, 117, 113, 159, 92, 177, 91, 178, 100, 74, 180], c.steel);
    for (let y = 116; y < 178; y += 13) p.path([0, y + 7, 131, y - 13, 319, y + 6], c.navy);
    p.rect(161, 21, 41, 26, c.night);
    p.rect(164, 24, 35, 20, c.brick);
    p.image(envelope(), 169, 24, 18, 13);
    p.path([189, 30, 195, 30, 193, 32], c.sand);
    p.path([190, 35, 196, 35], c.rust);
    // Riveted sill, a barred fixed panel and a door swinging toward the alley.
    p.poly([9, 25, 99, 23, 115, 32, 114, 133, 23, 149, 6, 140], c.ink);
    p.poly([13, 33, 98, 31, 105, 36, 104, 128, 20, 139], c.rust);
    p.poly([18, 38, 96, 36, 102, 39, 102, 123, 22, 134], c.brick);
    p.poly([20, 43, 89, 41, 89, 123, 24, 131], c.ochre);
    p.poly([23, 51, 83, 46, 74, 122, 22, 132], c.copper);
    p.poly([23, 111, 98, 103, 103, 124, 22, 136], c.rust);
    for (const x of [18, 29, 40]) {
      p.rect(x, 36, 2, 96, c.night);
      p.rect(x, 38, 1, 88, c.steel);
    }
    p.rect(16, 57, 28, 3, c.plum);
    p.rect(16, 100, 28, 3, c.plum);
    dog(p, 'noodle', 76, 126, 0.77, 1, 'idle');
    p.poly([7, 27, 98, 23, 115, 31, 112, 35, 13, 37, 5, 33], c.slate, c.ink);
    p.path([10, 29, 96, 25, 111, 30], c.steel, 2);
    for (const x of [15, 37, 59, 81, 100]) p.rect(x, 29 - Math.floor(x / 31), 2, 1, c.wheat);
    p.poly([20, 136, 104, 123, 114, 126, 111, 134, 23, 149, 17, 145], c.slate, c.ink);
    p.path([22, 139, 105, 126], c.steel, 2);
    p.poly([111, 33, 140, 18, 139, 136, 110, 132], c.night, c.ink);
    p.poly([115, 38, 136, 28, 135, 128, 115, 126], c.green);
    p.poly([117, 39, 133, 32, 132, 125, 117, 124], c.teal);
    for (const x of [120, 126, 132]) p.line(x, 36 - (x - 120) * 0.4, x, 124 + (x - 120) * 0.15, c.night, 2);
    p.path([113, 63, 136, 57], c.slate, 2);
    p.path([113, 103, 136, 102], c.slate, 2);
    p.path([138, 21, 137, 134], c.aqua, 2);
    p.rect(132, 80, 9, 6, c.ink);
    p.rect(136, 81, 7, 2, c.gold);
    p.rect(110, 48, 5, 6, c.brick);
    p.rect(110, 111, 5, 6, c.brick);
    p.path([112, 48, 112, 52], c.copper);
    p.path([112, 111, 112, 115], c.copper);
    // Parted shackle (not a faux letter) and metal links underline that the lock has opened.
    p.path([139, 89, 143, 94, 147, 94, 150, 99, 150, 105, 154, 108, 155, 112], c.ink, 2);
    p.path([140, 90, 143, 93, 147, 93, 149, 97], c.ochre);
    p.path([156, 118, 160, 115, 162, 118], c.gold, 2);
    p.rect(156, 120, 9, 8, c.rust);
    p.rect(157, 120, 7, 3, c.gold);
    p.oval(184, 144, 28, 4, c.navy);
    dog(p, 'pip', 184, 144, 0.9, -1, 'idle');
    crate(p, 237, 89, 44, 34);
    crate(p, 266, 112, 59, 36);
    crate(p, 278, 79, 40, 31);
    clipper(p, 247, 61);
    clipper(p, 291, 51);
    p.poly([0, 148, 25, 153, 45, 180, 0, 180], c.night);
    p.poly([222, 180, 251, 147, 290, 141, 320, 147, 320, 180], c.night);
    p.path([238, 173, 255, 153, 289, 148], c.slate, 2);
    p.rect(170, 146, 10, 2, c.aqua);
    p.rect(182, 148, 4, 1, c.teal);
  }

  function rivet(p, x, y) {
    p.rect(x, y, 3, 3, c.brick);
    p.rect(x, y, 2, 1, c.wheat);
    p.rect(x, y + 1, 1, 1, c.ochre);
  }

  function axle(p, x, y, r) {
    p.oval(x, y, r, r, c.ink);
    p.oval(x, y, r - 2, r - 2, c.rust);
    p.oval(x, y, r - 5, r - 5, c.night);
    for (const [dx, dy] of [
      [1, 0],
      [0.7, 0.7],
      [0, 1],
      [-0.7, 0.7],
      [-1, 0],
      [-0.7, -0.7],
      [0, -1],
      [0.7, -0.7],
    ])
      p.line(x, y, x + dx * (r - 5), y + dy * (r - 5), c.copper, 2);
    p.oval(x, y, 3, 3, c.ochre);
  }

  function boss(p) {
    p.rect(0, 0, 320, 180, c.night);
    p.rect(0, 18, 320, 80, c.plum);
    for (let x = -24; x < 325; x += 57) {
      arch(p, x, 20, 48, 81, c.ink, c.brick);
      p.poly([x + 6, 50, x + 23, 28, x + 38, 26, x + 7, 75], c.rust);
      p.rect(x + 22, 29, 3, 71, c.plum);
      p.rect(x + 3, 62, 42, 3, c.plum);
    }
    for (const x of [-15, 69, 154, 241, 317]) {
      p.path([x, 0, x + 40, 25, x + 82, 0], c.ink, 4);
      p.line(x + 40, 2, x + 40, 24, c.navy, 3);
    }
    p.rect(0, 14, 320, 3, c.navy);
    p.rect(0, 15, 320, 1, c.copper);
    p.poly([0, 112, 170, 91, 320, 86, 320, 180, 0, 180], c.brick);
    p.poly([0, 133, 320, 96, 320, 110, 0, 170], c.plum);
    p.path([0, 146, 319, 105], c.copper, 2);
    p.path([0, 168, 319, 115], c.ochre, 2);
    for (let x = -15; x < 314; x += 24) p.path([x, 151 - x * 0.13, x + 13, 161 - x * 0.15], c.ink, 3);
    // Copper Hound. Its boiler is the head, its cowcatcher the broad jaw, and the brass collar carries the bell clapper.
    p.poly(
      [
        124, 112, 134, 99, 151, 96, 157, 61, 154, 51, 163, 43, 175, 43, 181, 48, 207, 42, 219, 29, 225, 17, 233, 16,
        236, 24, 239, 27, 250, 29, 266, 25, 277, 28, 278, 39, 292, 37, 299, 29, 307, 28, 312, 35, 310, 51, 317, 60, 320,
        80, 318, 106, 313, 123, 300, 130, 282, 131, 268, 141, 247, 144, 220, 143, 202, 151, 165, 154, 142, 145, 126,
        142,
      ],
      c.ink,
    );
    p.poly([131, 112, 146, 103, 169, 101, 198, 107, 213, 123, 206, 137, 146, 144, 129, 136], c.navy);
    p.poly([166, 57, 175, 49, 205, 46, 219, 52, 223, 83, 212, 102, 160, 113, 151, 103, 155, 72], c.copper);
    p.poly([159, 66, 178, 55, 206, 52, 216, 58, 215, 68, 201, 69, 162, 82], c.ochre);
    p.poly([158, 83, 211, 68, 211, 85, 201, 96, 157, 106], c.rust);
    p.poly([162, 81, 175, 77, 174, 90, 161, 94], c.brick, c.ink);
    for (const [x, y] of [
      [164, 82],
      [168, 81],
      [172, 80],
    ])
      p.line(x, y, x - 1, y + 8, c.plum);
    p.poly([183, 78, 199, 73, 198, 88, 182, 94], c.brick, c.ink);
    p.path([185, 82, 195, 79], c.copper, 2);
    p.path([184, 86, 194, 83], c.copper, 2);
    p.path([168, 64, 173, 64, 177, 68, 173, 96], c.brick, 3);
    p.path([192, 55, 197, 58, 200, 65, 198, 88], c.brick, 3);
    p.path([155, 104, 210, 89, 216, 92], c.gold, 2);
    axle(p, 159, 132, 17);
    axle(p, 187, 129, 18);
    axle(p, 215, 125, 16);
    p.path([156, 134, 185, 126, 215, 128], c.ink, 5);
    p.path([157, 133, 185, 125, 214, 127], c.ochre, 3);
    p.poly(
      [
        205, 80, 206, 57, 216, 43, 226, 36, 235, 36, 249, 35, 265, 39, 278, 38, 291, 42, 303, 51, 310, 68, 309, 88, 302,
        100, 288, 105, 251, 108, 226, 102, 217, 95,
      ],
      c.copper,
      c.ink,
    );
    // Chimney ears, with a pin of sunset along each soot-black rim.
    p.poly([216, 48, 218, 31, 222, 15, 230, 12, 233, 18, 232, 28, 237, 39, 231, 47], c.brick, c.ink);
    p.poly([220, 38, 223, 18, 229, 15, 229, 25, 226, 40], c.ochre);
    p.poly([281, 46, 285, 35, 295, 21, 302, 19, 307, 25, 304, 37, 302, 51], c.rust, c.ink);
    p.poly([288, 38, 297, 24, 302, 22, 300, 32, 294, 41], c.ochre);
    p.poly([212, 60, 221, 48, 235, 43, 248, 44, 242, 52, 225, 54, 216, 65], c.gold);
    p.poly([245, 44, 263, 44, 281, 48, 299, 58, 303, 71, 291, 69, 282, 62, 263, 59, 251, 61, 240, 57], c.ochre);
    p.path([232, 42, 247, 40, 260, 41, 264, 44], c.brick);
    p.path([234, 44, 249, 42, 258, 43], c.wheat);
    p.poly([292, 54, 302, 58, 307, 69, 306, 83, 298, 91, 293, 90, 298, 80, 299, 67], c.rust);
    p.path([303, 64, 305, 72, 302, 84], c.brick, 2);
    p.poly([219, 68, 230, 56, 242, 54, 245, 59, 241, 66, 225, 76, 218, 75], c.ink);
    p.poly([223, 68, 231, 60, 240, 58, 237, 64, 229, 69], c.gold);
    p.poly([260, 58, 269, 55, 285, 60, 294, 67, 293, 71, 281, 70, 270, 66, 261, 67], c.ink);
    p.poly([265, 61, 271, 59, 280, 62, 286, 65, 274, 64, 269, 63], c.gold);
    p.rect(233, 61, 5, 2, c.white);
    p.rect(270, 60, 5, 2, c.white);
    p.poly(
      [215, 80, 226, 72, 243, 70, 261, 72, 274, 79, 276, 88, 270, 97, 258, 102, 237, 103, 219, 98, 211, 91],
      c.brick,
      c.ink,
    );
    p.poly([219, 79, 230, 74, 246, 73, 262, 76, 267, 79, 253, 80, 238, 79, 226, 83], c.ochre);
    p.poly([221, 84, 232, 78, 242, 80, 246, 84, 243, 89, 236, 92, 224, 90], c.ink);
    p.poly([226, 84, 232, 81, 238, 82, 234, 84], c.steel);
    p.path([219, 92, 233, 96, 256, 95, 266, 91], c.ochre, 2);
    for (const [x, y] of [
      [246, 85],
      [251, 84],
      [256, 83],
      [253, 89],
    ])
      p.rect(x, y, 2, 2, c.brick);
    p.poly([228, 99, 241, 102, 267, 100, 277, 96, 276, 100, 267, 104, 241, 106, 230, 103], c.night);
    p.rect(238, 101, 3, 3, c.sand);
    p.rect(245, 102, 3, 3, c.ochre);
    p.rect(261, 100, 3, 3, c.sand);
    p.poly([216, 99, 240, 106, 275, 103, 286, 99, 296, 103, 292, 113, 274, 119, 241, 123, 221, 118], c.ink);
    p.path([220, 103, 243, 109, 275, 106, 290, 101], c.gold, 3);
    p.poly(
      [
        244, 111, 250, 107, 257, 110, 258, 116, 253, 121, 252, 127, 257, 133, 255, 138, 249, 140, 243, 137, 242, 132,
        247, 126, 247, 120, 242, 116,
      ],
      c.gold,
      c.ink,
    );
    p.rect(246, 112, 3, 4, c.cream);
    p.rect(244, 132, 4, 3, c.cream);
    for (const [x, y] of [
      [215, 77],
      [222, 49],
      [249, 48],
      [289, 76],
      [296, 86],
      [278, 109],
      [165, 84],
      [180, 105],
    ])
      rivet(p, x, y);
    // Two pinned links drive a broad cancelling stamp down over the sorting track.
    p.poly([190, 56, 176, 54, 157, 45, 140, 46, 119, 60, 121, 70, 143, 61, 154, 56, 174, 67, 187, 68], c.ink);
    p.path([186, 61, 170, 59, 154, 50, 143, 51, 124, 63], c.ochre, 5);
    p.poly([128, 60, 119, 56, 111, 59, 101, 83, 102, 92, 109, 95, 117, 81], c.brick, c.ink);
    p.path([118, 62, 111, 73, 106, 85], c.copper, 4);
    for (const [x, y] of [
      [187, 62],
      [151, 51],
      [121, 62],
      [106, 88],
    ]) {
      p.oval(x, y, 7, 7, c.ink);
      p.oval(x, y, 5, 5, c.copper);
      p.oval(x, y, 2, 2, c.plum);
      p.rect(x - 3, y - 3, 2, 1, c.wheat);
    }
    p.poly([100, 88, 111, 92, 110, 99, 118, 101, 121, 106, 119, 110, 91, 105, 89, 102, 92, 98, 99, 98], c.ink);
    p.poly([102, 91, 108, 93, 105, 101, 116, 104, 117, 106, 93, 102, 99, 101], c.copper);
    p.path([91, 104, 118, 109], c.gold);
    p.poly([92, 124, 117, 118, 127, 121, 101, 127], c.brick, c.ink);
    p.poly([97, 121, 113, 118, 120, 120, 104, 124], c.aqua);
    p.path([98, 121, 108, 122, 114, 119], c.green);
    // A low viewpoint gives Pip space against the machine's descending stamp.
    p.oval(71, 158, 29, 5, c.night);
    dog(p, 'pip', 67, 158, 0.72, 1, 'idle');
    p.poly(
      [
        0, 163, 42, 158, 72, 164, 100, 162, 117, 167, 145, 167, 161, 173, 182, 170, 207, 175, 244, 172, 272, 159, 320,
        156, 320, 180, 0, 180,
      ],
      c.ink,
    );
    p.path([3, 165, 37, 161, 55, 164], c.copper);
    for (const [x, y] of [
      [86, 91],
      [96, 79],
      [131, 89],
      [114, 115],
      [126, 110],
      [195, 35],
      [304, 19],
    ]) {
      p.path([x, y, x + 3, y - 4], c.ochre);
      p.rect(x + 4, y - 6, 1, 1, c.gold);
    }
  }

  function ending(p) {
    p.rect(0, 0, 320, 180, c.mint);
    p.rect(0, 45, 320, 45, c.ice);
    p.rect(0, 90, 320, 37, c.wheat);
    p.oval(92, 67, 31, 31, c.cream);
    cloudStrip(p, -10, 27, 62, '#bdd2b3', c.ice);
    cloudStrip(p, 113, 19, 64, '#9eb9ad', c.mint);
    cloudStrip(p, 73, 47, 52, c.ice, c.white);
    city(p, 105, '#8b9b91', '#839392', '#b5b09a');
    // Bell swinging at the next stop, with its clapper back in place.
    p.rect(12, 28, 3, 64, c.green);
    p.rect(5, 26, 48, 3, c.green);
    p.poly([0, 24, 17, 17, 43, 16, 54, 21, 56, 24], c.green);
    p.rect(32, 27, 3, 9, c.plum);
    p.image(bell(), 17, 32, 32, 29);
    p.rect(32, 55, 3, 7, c.ochre);
    p.oval(33, 60, 3, 2, c.gold);
    p.path([13, 44, 10, 47, 10, 51], c.green);
    p.path([53, 40, 56, 42, 58, 46], c.green);
    p.path([8, 39, 5, 43, 5, 47], c.teal);
    p.path([57, 36, 62, 39, 64, 43], c.teal);
    for (const [x, y] of [
      [73, 33],
      [80, 28],
      [101, 32],
    ])
      p.path([x, y, x + 2, y + 2, x + 5, y], c.green);
    p.poly([0, 100, 64, 91, 118, 98, 149, 94, 185, 101, 211, 106, 0, 130], c.teal);
    p.path([0, 105, 63, 96, 118, 102], c.aqua, 2);
    // Open mail-car doorway: Pip passes the envelope down to Clover on the platform.
    p.poly([175, 0, 320, 0, 320, 151, 192, 137, 182, 129, 181, 28, 170, 26], c.ink);
    p.poly([177, 2, 320, 2, 320, 14, 178, 21, 172, 19], c.rust);
    p.poly([180, 22, 320, 12, 320, 33, 181, 38], c.ochre);
    p.path([183, 25, 319, 17], c.wheat, 2);
    p.poly([185, 38, 320, 33, 320, 126, 188, 116], c.green);
    p.poly([190, 38, 254, 36, 254, 116, 190, 112], c.night);
    p.poly([194, 42, 250, 40, 250, 111, 194, 108], c.plum);
    p.poly([197, 43, 217, 42, 204, 83, 196, 91], c.rust);
    p.rect(238, 48, 9, 25, c.night);
    p.rect(240, 50, 5, 6, c.brick);
    p.rect(240, 60, 5, 5, c.copper);
    p.rect(234, 77, 16, 3, c.brick);
    p.poly([260, 38, 310, 36, 310, 85, 260, 85], c.ink);
    p.poly([263, 41, 306, 40, 306, 79, 263, 79], c.ochre);
    p.poly([266, 43, 282, 42, 267, 65], c.wheat);
    p.rect(285, 40, 3, 39, c.brick);
    p.poly([185, 116, 320, 127, 320, 141, 188, 129], c.rust);
    p.path([188, 119, 319, 130], c.ochre, 2);
    for (let x = 268; x < 317; x += 9) {
      p.rect(x, 91, 2, 13, c.teal);
      p.rect(x, 118 + Math.floor((x - 267) / 13), 2, 1, c.gold);
    }
    p.poly([190, 132, 320, 144, 320, 158, 201, 146], c.navy);
    p.oval(273, 148, 14, 14, c.ink);
    p.oval(273, 148, 9, 9, c.slate);
    p.oval(273, 148, 3, 3, c.copper);
    dog(p, 'pip', 220, 114, 0.78, -1, 'idle');
    p.poly([186, 106, 251, 108, 251, 113, 188, 111], c.ochre, c.ink);
    p.path([254, 45, 254, 116], c.copper, 2);
    p.rect(246, 90, 2, 8, c.wheat);
    p.path([257, 96, 260, 94, 260, 113, 257, 115], c.ochre, 2);
    p.poly([0, 126, 82, 111, 156, 116, 222, 135, 320, 158, 320, 180, 0, 180], c.rust);
    p.poly([0, 126, 83, 114, 158, 118, 214, 135, 139, 158, 0, 157], c.sand);
    p.poly([0, 155, 139, 155, 214, 134, 225, 136, 140, 162, 0, 162], c.cream);
    p.path([0, 164, 140, 164, 225, 138], c.brick, 2);
    p.path([5, 145, 156, 124], c.copper);
    p.path([33, 150, 169, 128], c.copper);
    lamp(p, 70, 81, true);
    p.oval(143, 139, 25, 4, c.copper);
    dog(p, 'clover', 137, 141, 0.93, 1, 'idle');
    p.image(envelope(), 164, 95, 25, 18);
    p.path([161, 103, 155, 105], c.cream, 2);
    p.rect(151, 108, 3, 1, c.wheat);
    p.poly([0, 171, 50, 160, 91, 168, 134, 180, 0, 180], c.green);
    p.path([2, 171, 49, 163, 72, 167], c.aqua, 2);
    p.poly([246, 178, 288, 166, 320, 167, 320, 180], c.navy);
  }

  const routeStops = [
    { x: 38, y: 116, label: ['PARCEL', 'ALLEY'] },
    { x: 97, y: 105, label: ['THE WEIGH', 'HOUSE'] },
    { x: 157, y: 95, label: ['FREIGHT', 'EXCHANGE'] },
    { x: 218, y: 82, label: ['SORTING', 'BRIDGE'] },
    { x: 280, y: 70, label: ['BELL', 'DEPOT'] },
  ];

  // Seven-row wood type. The lettering is printed with the map, so it stays on
  // the same pixel grid in a thumbnail and before the interface font has loaded.
  const routeLetters = {
    '1': [4, 12, 4, 4, 4, 4, 14],
    '2': [14, 17, 1, 2, 4, 8, 31],
    '3': [30, 1, 1, 14, 1, 1, 30],
    '4': [2, 6, 10, 18, 31, 2, 2],
    '5': [31, 16, 16, 30, 1, 1, 30],
    A: [14, 17, 17, 31, 17, 17, 17],
    B: [30, 17, 17, 30, 17, 17, 30],
    C: [15, 16, 16, 16, 16, 16, 15],
    D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31],
    F: [31, 16, 16, 30, 16, 16, 16],
    G: [15, 16, 16, 23, 17, 17, 15],
    H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14],
    L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17],
    N: [17, 25, 25, 21, 19, 19, 17],
    O: [14, 17, 17, 17, 17, 17, 14],
    P: [30, 17, 17, 30, 16, 16, 16],
    R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30],
    T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14],
    W: [17, 17, 17, 21, 21, 27, 17],
    X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4],
  };

  function routeTextWidth(text) {
    return [...text].reduce((width, letter) => width + (letter === ' ' ? 3 : 6), -1);
  }

  function routeText(p, text, center, y, color) {
    let x = center - Math.floor(routeTextWidth(text) / 2);
    for (const letter of text) {
      if (letter === ' ') {
        x += 3;
        continue;
      }
      for (const [row, bits] of routeLetters[letter].entries()) {
        for (let col = 0; col < 5; col++) if (bits & (16 >> col)) p.rect(x + col, y + row, 1, 1, color);
      }
      x += 6;
    }
  }

  function routePaper(p) {
    const paper = '#eed5a4', sand = '#d8ba8a', road = '#ceb287', bright = '#f6dfae';
    p.rect(0, 0, 320, 180, c.brick);
    p.rect(3, 3, 314, 174, c.ochre);
    p.rect(5, 5, 310, 170, '#c5a677');
    p.rect(7, 6, 306, 168, paper);
    p.poly([7, 6, 73, 6, 62, 21, 42, 25, 26, 36, 7, 33], '#e0c897');
    p.poly([7, 144, 39, 137, 66, 146, 92, 146, 119, 157, 149, 159, 175, 173, 7, 173], '#dfc18e');
    p.poly([261, 117, 278, 115, 300, 126, 313, 120, 313, 139, 297, 143, 279, 133], '#e1c394');
    const streets = [
      [9, 49, 30, 38, 45, 40, 68, 29, 100, 32, 127, 18, 153, 19],
      [8, 57, 31, 46, 47, 48, 71, 37, 100, 40, 129, 26, 149, 27],
      [13, 90, 48, 74, 71, 76, 98, 63, 125, 66, 149, 50],
      [8, 154, 32, 152, 67, 164, 98, 153, 124, 159, 158, 147, 181, 150],
      [81, 173, 99, 163, 123, 168, 157, 156, 180, 159, 206, 147],
      [146, 8, 156, 28, 180, 40, 206, 37, 226, 47, 249, 41],
      [172, 9, 180, 23, 202, 29, 221, 24, 238, 34, 259, 28],
      [235, 152, 254, 144, 277, 149, 300, 137, 311, 138],
      [242, 160, 255, 153, 278, 158, 301, 147, 312, 148],
      [255, 107, 269, 112, 292, 100, 311, 104],
      [30, 7, 40, 20, 64, 29, 71, 40],
      [124, 8, 130, 24, 140, 32, 143, 40],
      [81, 141, 89, 149, 99, 163, 102, 173],
      [284, 7, 293, 13, 304, 16, 312, 15],
    ];
    for (const street of streets) {
      p.path(street, road, 2);
      p.path(street, bright);
    }
    for (const [x, y, w] of [
      [18, 67, 8], [44, 55, 7], [56, 51, 10], [87, 45, 7], [108, 28, 8],
      [134, 39, 8], [155, 36, 7], [168, 43, 7], [229, 25, 8], [245, 21, 9],
      [61, 166, 7], [107, 147, 8], [129, 148, 6], [167, 145, 10], [178, 138, 6],
      [204, 125, 8], [262, 141, 9], [297, 106, 6], [298, 128, 8], [255, 157, 6],
    ]) p.poly([x - w / 2, y, x + 2, y - 4, x + w, y - 1, x + w / 2, y + 3], '#d9bd93');

    // The creek turns east of the freight yards and passes under the printed truss.
    const creek = [
      168, 6, 183, 6, 180, 20, 187, 31, 201, 38, 210, 47, 208, 60, 217, 69,
      232, 76, 238, 88, 234, 102, 223, 118, 224, 129, 237, 140, 257, 148,
      264, 164, 261, 174, 242, 174, 247, 164, 241, 156, 223, 148, 210, 136,
      206, 121, 211, 110, 221, 98, 224, 89, 218, 82, 204, 76, 192, 65, 193, 53,
      187, 47, 173, 39, 164, 27, 163, 18,
    ];
    p.poly(creek, '#82a39a');
    p.path([175, 7, 171, 22, 179, 34, 195, 42, 201, 50, 200, 62, 211, 73, 227, 80, 232, 90,
      227, 101, 216, 116, 216, 130, 232, 144, 249, 152, 256, 164, 251, 173], '#a6c4af', 4);
    for (const [x, y] of [[172, 19], [185, 39], [199, 54], [226, 90], [218, 111], [220, 133], [244, 153], [251, 166]]) {
      p.path([x - 2, y + 1, x + 1, y, x + 5, y], '#cfdbba');
    }

    for (const x of [76, 163, 246]) {
      p.rect(x, 7, 1, 166, '#d8bb8d');
      p.rect(x + 1, 7, 1, 166, '#f2dbaa');
    }
    p.rect(8, 145, 304, 1, '#ddc296');
    for (const [x, y] of [[15, 21], [22, 17], [20, 25], [54, 23], [130, 18], [137, 20],
      [235, 16], [242, 14], [178, 132], [184, 133], [21, 160], [28, 162], [269, 127]]) {
      p.poly([x - 2, y + 1, x, y - 3, x + 2, y + 1], '#98a68c');
      p.rect(x, y + 1, 1, 2, '#a79376');
    }
    for (const [x, y] of [[21, 120], [64, 57], [115, 44], [190, 110], [266, 117], [256, 168]]) {
      p.path([x, y, x + 1, y - 3, x + 3, y, x + 5, y - 2], '#a9aa89');
    }
    for (const [x, y] of [[10, 11], [153, 10], [89, 169], [284, 12], [301, 159]]) p.rect(x, y, 5, 1, sand);
    // An engraver's compass stays away from the stops and their names.
    p.poly([288, 136, 291, 148, 301, 152, 291, 154, 288, 166, 285, 154, 275, 152, 285, 148], c.brick);
    p.poly([288, 139, 288, 151, 285, 151], bright);
    p.poly([288, 152, 292, 152, 288, 163], bright);
    p.oval(288, 152, 2, 2, c.plum);
  }

  function mapAlley(p) {
    p.poly([13, 102, 34, 94, 60, 98, 65, 102, 39, 110, 22, 108], '#bca17c');
    // A narrow loading court between a pair of steep, brick party walls.
    for (const [x, y, w, h] of [[15, 80, 11, 21], [27, 72, 13, 28], [43, 80, 10, 18]]) {
      p.poly([x, y, x + w, y - 5, x + w + 6, y - 1, x + w + 6, y + h - 3, x + 6, y + h + 4, x, y + h], c.brick, c.plum);
      p.poly([x + 1, y + 1, x + w, y - 4, x + w + 5, y - 1, x + 6, y + 4], c.ochre);
      p.poly([x + 7, y + 5, x + w + 5, y, x + w + 5, y + h - 3, x + 7, y + h + 3], c.rust);
      p.path([x + 1, y + 1, x + 7, y + 5, x + w + 4, y + 1], c.copper);
      p.rect(x + 2, y + 8, 2, 4, c.wheat);
      p.rect(x + 9, y + 7, 3, 4, c.gold);
      p.rect(x + 8, y + h - 6, 4, 7, c.plum);
    }
    p.poly([29, 70, 29, 65, 33, 64, 35, 65, 35, 70, 31, 72], c.brick, c.plum);
    p.path([18, 85, 27, 90, 35, 90, 49, 85], c.night);
    p.poly([24, 88, 28, 90, 26, 94], c.red);
    p.poly([38, 89, 42, 88, 41, 93], c.teal);
    crate(p, 40, 96, 12, 8);
    p.rect(43, 98, 4, 2, c.wheat);
  }

  function mapWeighHouse(p) {
    p.poly([72, 90, 99, 80, 123, 85, 125, 90, 102, 100, 80, 96], '#bca17c');
    p.poly([74, 82, 99, 72, 119, 77, 119, 87, 98, 97, 74, 92], c.rust, c.night);
    p.poly([75, 82, 99, 73, 118, 77, 97, 87], c.sand);
    p.poly([77, 85, 96, 89, 96, 94, 77, 91], c.brick);
    p.path([100, 88, 116, 81], c.ochre);
    p.poly([82, 79, 82, 69, 99, 64, 108, 68, 107, 79, 91, 84], c.green, c.night);
    p.poly([81, 69, 96, 62, 109, 66, 108, 69, 92, 75], c.teal, c.night);
    p.poly([85, 74, 90, 76, 90, 80, 85, 79], c.gold);
    p.rect(97, 72, 3, 6, c.ice);
    // The unbalanced brass pans and graduated upright identify the weighing platform.
    p.path([91, 71, 97, 68, 102, 69], c.night, 3);
    p.path([97, 66, 97, 42], c.night, 3);
    p.path([98, 64, 98, 43], c.ochre);
    p.oval(98, 42, 3, 3, c.brick);p.rect(98, 40, 2, 2, c.gold);
    p.path([78, 51, 97, 44, 116, 39], c.night, 3);
    p.path([79, 50, 97, 43, 115, 39], c.ochre);
    p.path([80, 51, 75, 61, 86, 60, 80, 51], c.brick);
    p.path([114, 40, 109, 51, 120, 50, 114, 40], c.brick);
    p.poly([73, 60, 87, 59, 86, 62, 83, 65, 79, 66, 75, 64], c.copper, c.night);
    p.path([74, 60, 86, 59], c.gold);
    p.poly([108, 51, 122, 49, 120, 53, 117, 56, 112, 56, 109, 54], c.copper, c.night);
    p.path([109, 51, 121, 49], c.gold);
  }

  function mapExchange(p) {
    p.poly([131, 82, 151, 71, 180, 73, 184, 80, 159, 89, 136, 87], '#bba17d');
    p.poly([132, 78, 156, 68, 179, 73, 180, 79, 158, 87, 133, 83], c.plum, c.night);
    p.path([134, 78, 157, 70, 177, 74], c.copper, 2);
    p.path([138, 83, 158, 86, 178, 78], c.ochre);
    // Loaded gantry, hoisted parcel and ranks of mail crates at the freight exchange.
    p.poly([138, 77, 141, 50, 146, 48, 149, 76], c.teal, c.night);
    p.path([142, 72, 145, 56, 145, 72], c.aqua);
    p.poly([132, 53, 132, 46, 139, 43, 149, 46, 149, 52, 143, 57], c.rust, c.night);
    p.poly([133, 47, 139, 45, 143, 47, 139, 50], c.gold);
    p.poly([143, 46, 163, 28, 177, 24, 179, 29, 150, 51], c.green, c.night);
    p.path([145, 45, 164, 29, 176, 25], c.aqua);
    p.path([150, 43, 153, 45, 154, 38, 158, 40, 159, 34, 164, 36, 165, 30, 169, 32], c.night);
    p.path([175, 29, 175, 48, 172, 50], c.night);
    p.path([172, 49, 168, 54, 176, 52, 172, 49], c.brick);
    crate(p, 165, 53, 15, 11); p.rect(167, 56, 5, 2, c.cream);
    crate(p, 135, 73, 11, 8); crate(p, 146, 70, 14, 11);
    crate(p, 151, 63, 13, 9); crate(p, 159, 71, 13, 10);
    p.rect(149, 73, 4, 2, c.cream);p.rect(153, 66, 4, 2, c.cream);
  }

  function mapBridge(p) {
    p.poly([193, 72, 202, 69, 204, 76, 201, 80, 195, 79], c.brick);
    p.poly([226, 59, 235, 58, 234, 66, 229, 70, 225, 68], c.brick);
    p.poly([188, 68, 227, 48, 244, 53, 204, 76], c.green, c.night);
    p.path([188, 66, 228, 47, 243, 51], c.aqua, 2);
    p.path([192, 68, 229, 50], c.ochre);
    p.path([197, 71, 235, 51], c.copper);
    p.path([189, 66, 189, 54, 196, 60, 201, 48, 207, 54, 214, 41, 220, 47, 228, 36, 228, 48], c.green, 2);
    p.path([189, 53, 228, 34], c.teal, 2);
    p.path([203, 75, 203, 62, 209, 67, 215, 55, 221, 61, 228, 48, 234, 54, 242, 42, 242, 54], c.night, 2);
    p.path([202, 61, 242, 40], c.teal, 2);
    p.path([203, 61, 203, 72, 242, 52], c.aqua);
    for (const [x, y] of [[189,52],[202,60],[215,54],[228,47],[242,40]]) p.rect(x, y, 2, 1, c.ice);
  }

  function mapDepot(p) {
    p.poly([257, 55, 281, 46, 302, 49, 303, 53, 280, 64, 258, 60], '#b9a080');
    p.poly([259, 41, 275, 32, 299, 36, 298, 51, 278, 60, 259, 55], c.rust, c.night);
    p.poly([278, 45, 297, 37, 297, 50, 279, 58], c.brick);
    p.poly([255, 40, 266, 27, 282, 24, 302, 35, 281, 45], c.green, c.night);
    p.path([258, 39, 268, 29, 280, 27, 297, 35], c.teal, 2);
    p.poly([268, 35, 268, 24, 275, 19, 282, 23, 282, 32, 276, 36], c.brick, c.night);
    p.poly([266, 24, 272, 17, 275, 12, 278, 18, 285, 23, 277, 26], c.green, c.night);
    p.path([268, 23, 274, 16, 276, 15], c.aqua);
    p.rect(270, 25, 9, 8, c.night);
    p.image(bell(), 270, 25, 9, 7);
    p.rect(262, 44, 4, 6, c.gold);p.rect(269, 45, 3, 6, c.wheat);
    p.poly([280, 56, 280, 50, 282, 46, 286, 44, 289, 46, 289, 52], c.night);
    p.rect(292, 41, 3, 7, c.wheat);
    p.path([261, 56, 277, 60, 298, 51], c.copper, 2);
    p.rect(298, 44, 2, 10, c.night);p.rect(297, 42, 4, 4, c.red);
  }

  function route(p, currentStop) {
    routePaper(p);
    const line = [
      13, 124, 29, 118, 38, 116, 58, 116, 68, 108, 83, 105, 97, 105,
      114, 105, 126, 98, 138, 95, 157, 95, 177, 95, 189, 88, 203, 82,
      218, 82, 238, 82, 252, 72, 266, 70, 280, 70, 296, 70, 307, 65,
    ];
    // Short mail-yard sidings sit behind the heavier passenger track.
    p.path([12, 117, 26, 111, 44, 110, 52, 106, 64, 106, 74, 103], '#a78970', 2);
    p.path([116, 102, 130, 91, 145, 88, 166, 88, 177, 84], '#ae8d73', 2);
    p.path([234, 75, 248, 67, 258, 65, 271, 65], '#a78970', 2);
    for (let i = 2; i < line.length; i += 2) {
      const x0 = line[i - 2], y0 = line[i - 1], x1 = line[i], y1 = line[i + 1];
      for (let x = Math.ceil((x0 + 1) / 7) * 7; x < x1; x += 7) {
        const y = Math.round(y0 + (y1 - y0) * (x - x0) / (x1 - x0));
        p.path([x - 1, y - 3, x + 2, y + 3], c.brick, 2);
      }
    }
    p.path(line.map(n => n - 2), c.night, 5);
    p.path(line.map(n => n - 1), c.ochre, 3);
    p.path(line, c.rust);
    for (const [x, y] of [[59, 115], [121, 100], [182, 92], [245, 76], [302, 68]]) {
      p.path([x - 2, y - 3, x + 2, y - 1, x, y + 3], c.night, 2);
      p.path([x - 1, y - 2, x + 1, y - 1, x, y + 1], c.wheat);
    }

    mapAlley(p);
    mapWeighHouse(p);
    mapExchange(p);
    mapBridge(p);
    mapDepot(p);

    for (const [i, stop] of routeStops.entries()) {
      const { x, y, label } = stop, active = i === currentStop;
      const half = Math.ceil(Math.max(...label.map(routeTextWidth)) / 2) + 4;
      const top = y + 12, left = x - half, right = x + half;
      // A typeset name slip hangs from each numbered ticket punch. Only the
      // present stop gets the dispatcher's turquoise stamp and a dark name slip.
      p.path([x, y + 7, x, top + 2], c.brick, 2);
      p.poly([left + 2, top + 1, right - 2, top + 1, right + 1, top + 4, right + 1, top + 18,
        right - 1, top + 21, left + 1, top + 21, left - 1, top + 18, left - 1, top + 4], '#bd9f79');
      p.poly([left + 2, top, right - 2, top, right, top + 2, right, top + 17, right - 2, top + 19,
        left + 2, top + 19, left, top + 17, left, top + 2], active ? '#36575a' : '#f6e0ad', active ? c.night : '#b79872');
      if (active) p.path([left + 2, top + 1, right - 3, top + 1], c.aqua);
      routeText(p, label[0], x, top + 3, active ? c.cream : c.night);
      routeText(p, label[1], x, top + 11, active ? c.cream : c.night);
      if (active) {
        p.oval(x, y + 1, 11, 10, c.green);
        p.oval(x, y, 10, 10, c.aqua);
        p.path([x - 8, y - 4, x - 5, y - 7, x - 2, y - 8], c.ice);
      }
      p.oval(x, y + 1, 8, 8, c.brick);
      p.oval(x, y, 8, 8, c.night);
      p.oval(x, y, 6, 6, active ? c.mint : c.wheat);
      routeText(p, String(i + 1), x, y - 3, c.night);
    }
  }

  function eastRoute(p, currentStop) {
    routePaper(p);
    // The old timetable has the river in blue ink and the missing span in red.
    p.poly([139,0,167,0,146,47,170,84,155,127,171,180,142,180,124,126,143,85,122,49], '#739996');
    for (let y=14; y<180; y+=19) {
      const x=140+Math.round(9*Math.sin(y/14));
      p.path([x-4,y,x,y-1,x+7,y],c.ice);
    }
    const rail=[15,112,75,105,120,95,162,85,212,71,273,71,303,59];
    p.path(rail,c.brick,5); p.path(rail,c.wheat,2);
    for(let i=0;i<3;i++){
      const x=27+i*24,y=94-i*3;
      p.rect(x,y,22,11,c.navy); p.rect(x+2,y-2,17,2,c.green);
      p.rect(x+3,y+3,5,3,c.wheat); p.rect(x+11,y+3,7,3,c.teal);
      p.oval(x+5,y+11,2,2,c.ink);p.oval(x+17,y+11,2,2,c.ink);
    }
    p.rect(224,49,16,20,c.brick);p.rect(222,47,20,3,c.navy);
    p.rect(227,52,8,4,c.gold);p.rect(246,34,2,36,c.ink);
    p.path([246,36,260,27],c.red,3);
    for(const [i,x,y,first,second] of [[0,83,104,'NIGHT MAIL','ROOF'],[1,241,71,'EAST SIGNAL','BOX']]){
      p.oval(x,y,8,8,c.ink);p.oval(x,y,6,6,currentStop===i?c.aqua:c.wheat);
      routeText(p,String(i+1),x,y-3,c.ink);
      routeText(p,first,x,y+12,c.ink);routeText(p,second,x,y+21,c.ink);
    }
  }
  const painters = { title, opening, rescue, boss, ending, route, eastRoute, nightmail:ending, firstlight:eastRoute };
  function draw(canvas, scene, time = 0) {
    // Each card is a still. A resize only reblits its once-painted native canvas.
    const name = Object.hasOwn(painters, scene) ? scene : 'title';
    if (!canvas || canvas.width < 1 || canvas.height < 1) return;
    const isMap = name==='route' || name==='eastRoute';
    const currentStop = isMap && Number.isInteger(time) && time >= 0 && time < routeStops.length ? time : 0;
    const key = isMap ? name + currentStop : name;
    let frame = scenes.get(key);
    if (!frame) {
      frame = surface(WIDTH, HEIGHT);
      const p = new PixelPen(frame);
      p.rect(0, 0, WIDTH, HEIGHT, c.ink);
      painters[name](p, currentStop);
      if (window.DogArt || name === 'route') scenes.set(key, frame);
    }
    const g = canvas.getContext('2d');
    const scale = Math.max(canvas.width / WIDTH, canvas.height / HEIGHT);
    const w = Math.ceil(WIDTH * scale),
      h = Math.ceil(HEIGHT * scale);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(frame, Math.floor((canvas.width - w) / 2), Math.floor((canvas.height - h) / 2), w, h);
    g.restore();
  }
  function routeBoard(campaign,progress,{stored,portrait,canSwitch,marks}){
    const night=campaign.number===2, $=id=>document.getElementById(id);
    $('route-bonus').hidden=night || progress.room<campaign.bonus.stampRoom;
    draw($('route-cover'), night?'eastRoute':'route', progress.room);
    $('route-cover').setAttribute('aria-label','Rail map · '+campaign.rooms.map(r=>r.name).join(' to '));
    $('route-number').textContent = 'Chapter 0'+campaign.number;
    $('route-chapter').textContent = campaign.title;
    $('route-switch').hidden = !canSwitch;
    $('route-switch').textContent = night?'Chapter 01 · The Silent Yard':'Chapter 02 · The Night Mail';
    const stops = $('route-stops');
    stops.replaceChildren();
    for (const [i, r] of campaign.rooms.entries()) {
      const li = document.createElement('li'),
        button = document.createElement('button');
      button.type = 'button';
      button.dataset.stop = i;
      const sealed = i > progress.room,
        marked = !!(progress.stamps & (1 << i));
      button.disabled = sealed;
      const status = sealed
        ? 'Sealed'
        : marked
          ? 'Postmark found'
          : i === progress.room && !progress.complete
            ? 'Current stop'
            : 'Open stop';
      button.innerHTML =
        '<em>0' + (i + 1) + '</em><span><b>' + r.name + '</b><small>' + r.type + (r.rules ? ' · 3 stocks' : '') + ' · ' + status + '</small></span>';
      li.append(button);
      stops.append(li);
    }
    $('route-runner-portrait').src = portrait(campaign.chapterFighter);
    $('route-runner-name').textContent = window.DogFight.fighters[campaign.chapterFighter].name;
    $('route-progress').textContent = progress.complete
      ? 'Chapter clear'
      : progress.started
        ? (stored ? 'Saved at ' : 'This session · ') +
          campaign.rooms[progress.room].name +
          (progress.checkpoint ? ' · ' + campaign.rooms[progress.room].checkpoints[progress.checkpoint - 1].name : '')
        : 'First stop · '+campaign.rooms[0].name;
    $('route-marks').textContent =
      'Postmarks ' +
      marks +
      ' / ' + campaign.rooms.length +
      (!stored ? ' · Progress lasts for this session' : '');
    $('dispatch-start').textContent =
      campaign.scenes[progress.pending]?.completesChapter
        ? 'Watch ending'
        : progress.complete
          ? 'Replay chapter'
          : progress.started
            ? 'Continue'
            : 'Begin chapter';
    $('dispatch-start').focus({ preventScroll: true });
  }
  function reelShelf(campaign,progress,selected,showDialog){
    const locks = {
      opening: '',
      rescue: progress.room >= 1 ? '' : 'Finish Parcel Alley',
      boss: progress.room >= campaign.lastRoom ? '' : 'Cross Sorting Bridge',
      ending: progress.complete || progress.pending === 'ending' ? '' : 'Defeat the Copper Hound',
      nightmail: '', firstlight: progress.complete || progress.pending === 'firstlight' ? '' : 'Win at East Signal Box',
    };
    const rows = Object.entries(campaign.scenes).map(([key, scene]) => {
      const locked = locks[key];
      const print = locked ? '<i class="film-leader" aria-hidden="true"></i>' :
        '<canvas width="160" height="90" aria-hidden="true"></canvas>';
      return '<button type="button" data-reel="' + key + '"' + (locked ? ' disabled' : '') + '>' +
        print + '<span><b>' + scene.title + '</b><small>' + (locked || 'Play cutscene') + '</small></span></button>';
    });
    showDialog('cutscenes', 'Cutscenes', '<div class="film-library">' + rows.join('') + '</div>');
    for (const button of document.querySelectorAll('[data-reel]:enabled')) {
      const canvas = button.querySelector('canvas'), key = button.dataset.reel;
      if (window.DispatchFilms[key] && window.DispatchFilm) window.DispatchFilm.poster(canvas,key);
      else draw(canvas,key);
    }
    document.querySelector('[data-reel="' + selected + '"]').focus();
  }
  const filmLoads = new Map();
  function loadFilm(key) {
    if (window.DispatchFilms[key]) return Promise.resolve();
    if (!filmLoads.has(key)) {
      const task = new Promise((resolve,reject)=>{
        const script = document.createElement('script');
        script.src = Object.hasOwn(window.DispatchScript.chapters[1].scenes,key) ? './film-night-mail.js?v=1' : './film-'+key+'.js?v=widefilm-1';
        script.onload = () => window.DispatchFilms[key] ? resolve() : reject(new Error('Missing animation'));
        script.onerror = () => reject(new Error('Animation unavailable'));
        document.head.append(script);
      });
      filmLoads.set(key,task.finally(()=>filmLoads.delete(key)));
    }
    return filmLoads.get(key);
  }
  function nextStop(layout,next,name,showDialog){
    showDialog('dispatch-next', layout.name + ' clear',
      '<p>' + layout.dispatch + '</p><div class="dialog-actions"><button class="primary" data-next-stop="' +
      next + '">Continue to ' + name + '</button>' +
      '<button class="utility" data-do="route">Route map</button></div>');
    document.querySelector('[data-next-stop]').focus();
  }
  function chapterClear(campaign,night,marks,portrait,showDialog) {
    showDialog(
      'dispatch-clear',
      'Chapter clear',
      '<div class="winner"><img alt="" src="' +
        portrait('clover') +
        '"><div><span class="mode-label">The Last Dispatch</span><h3>'+campaign.title+'</h3><p>' +
        marks +
        ' of ' + campaign.rooms.length + ' postmarks collected.</p></div></div><p>' +
        (night?'The night mail is safe. Both chapters are open for replay.':'The bell is back in service. Clover has the next dispatch.') +
        '</p><div class="dialog-actions">'+(night?'':'<button class="primary" id="next-chapter">Chapter 02 · The Night Mail</button>')+
        '<button class="'+(night?'primary':'utility')+'" data-do="close">Route map</button><button class="utility" data-do="home">Main menu</button></div>',
    );
  }
  function liftTicket(bonus,open,label,score,best,showDialog) {
    showDialog('lift-ticket',score?'Dead Letter Lift clear':bonus.name,
      (open?'<p>The bridge postmark fits the brass slot. Noodle, Brisket and Clover are waiting, one on each landing. Take all three stocks before Pip loses his last.</p>':
      '<p>The lift takes a Sorting Bridge postmark. Look above the Crane House checkpoint, where the short shelves lead up to the gantry.</p>')+
      (score?'<p>Your delivery · '+score+'</p>':'')+
      (best?'<p>Personal best · '+best+'</p>':'')+
      '<div class="dialog-actions"><button class="primary" id="lift-enter">'+label+
      '</button><button class="utility" data-do="route">Route map</button></div>');
  }
  window.DispatchCovers = Object.freeze({draw,routeBoard,reelShelf,loadFilm,chapterClear,liftTicket,nextStop});
  // The films and the printed route map share the same native pixel grid and props.
  function ease(start, end, time) {
    const t = Math.max(0, Math.min(1, (time - start) / (end - start)));
    return t * t * (3 - 2 * t);
  }
  window.DispatchFilmArt = Object.freeze({
    c, PixelPen, plate: symbol, train, bell, envelope, pipPortrait, city, stationClock,
    cloudStrip, steam, crate, lamp, paw, arch, axle, rivet, ease, lerp: (a, b, t) => a + (b - a) * t, dog,
  });
  window.DispatchFilms = Object.create(null);
})();
