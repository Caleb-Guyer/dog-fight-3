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
  const nativeView = { left: 0, top: 0, right: 320, bottom: 180 };
  const expandedSets = new Map();

  function isExpanded(v) {
    return v.left < 0 || v.top < 0 || v.right > 320 || v.bottom > 180;
  }

  function set(p, v, original, continuation) {
    if (!isExpanded(v)) {
      p.image(original(), 0, 0);
      return;
    }
    // Cache painted scenery in world pixels. Only scenery for the two most recent
    // orientations of a set is retained, regardless of window resize events.
    const left = Math.min(0, Math.floor(v.left / 32) * 32);
    const top = Math.min(0, Math.floor(v.top / 32) * 32);
    const right = Math.max(320, Math.ceil(v.right / 32) * 32);
    const bottom = Math.max(180, 180 + Math.ceil((v.bottom - 180) / 32) * 32);
    const key = original.name + (bottom - top > right - left ? '/tall' : '/wide');
    let cached = expandedSets.get(key);
    if (!cached || left < cached.left || top < cached.top || right > cached.right || bottom > cached.bottom) {
      const canvas = document.createElement('canvas');
      canvas.width = right - left;
      canvas.height = bottom - top;
      const pen = new A.PixelPen(canvas);
      pen.g.translate(-left, -top);
      continuation(pen, { left, top, right, bottom });
      pen.image(original(), 0, 0);
      cached = { canvas, left, top, right, bottom };
      expandedSets.set(key, cached);
    }
    p.image(cached.canvas, cached.left, cached.top);
  }

  function outsideFrame(p, v, paint) {
    if (!isExpanded(v)) return;
    const g = p.g;
    g.save();
    g.beginPath();
    g.rect(v.left - 1, v.top - 1, v.right - v.left + 2, v.bottom - v.top + 2);
    g.rect(0, 0, 320, 180);
    g.clip('evenodd');
    paint();
    g.restore();
  }

  function band(p, b, y0, y1, color) {
    p.rect(b.left, y0, b.right - b.left, Math.max(0, y1 - y0), color);
  }

  function roofTruss(p, x, y, w, h, iron, edge) {
    p.path([x, y, x + w, y - 5], iron, 5);
    p.path([x, y + h, x + w, y + h - 5], iron, 5);
    p.path(
      [x + 2, y + h, x + w * 0.25, y - 1, x + w * 0.5, y + h - 3, x + w * 0.75, y - 4, x + w - 2, y + h - 5],
      iron,
      4,
    );
    p.path([x + 2, y + h - 1, x + w * 0.25, y - 2, x + w * 0.5, y + h - 4], edge);
    for (const f of [0, 0.25, 0.5, 0.75, 1]) p.rect(x + w * f + 2, y + h - 2 - 5 * f, 2, 1, edge);
  }

  function drain(p, x, y, w) {
    p.poly([x, y, x + w, y - 4, x + w + 11, y + 2, x + 9, y + 7], c.night);
    p.path([x, y, x + w, y - 4, x + w + 8, y], c.slate);
    for (let i = 6; i < w - 1; i += 6) p.line(x + i, y + 1 - (i * 4) / w, x + i + 5, y + 4 - (i * 4) / w, c.plum, 2);
  }

  function sortingCabinet(p, x, y, w, h) {
    p.rect(x - 2, y - 3, w + 4, h + 6, c.ink);
    p.rect(x, y, w, h, c.brick);
    p.rect(x + 2, y + 1, w - 4, 2, c.copper);
    const cols = Math.max(2, Math.floor(w / 20)),
      rows = Math.max(2, Math.floor(h / 18));
    const dx = (w - 5) / cols,
      dy = (h - 5) / rows;
    for (let iy = 0; iy < rows; iy++)
      for (let ix = 0; ix < cols; ix++) {
        const a = px(x + 3 + ix * dx),
          b = px(y + 4 + iy * dy);
        p.rect(a, b, dx - 3, dy - 3, iy % 3 === 1 ? c.plum : c.night);
        if ((ix * 3 + iy) % 4 !== 1) {
          p.rect(a + 2, b + dy - 8, dx - 7, 3, (ix + iy) % 3 ? c.sand : c.steel);
          p.path([a + 4, b + dy - 8, a + dx * 0.45, b + dy - 6, a + dx - 7, b + dy - 8], c.brick);
        }
      }
    p.rect(x - 4, y + h, w + 8, 3, c.night);
    p.rect(x - 3, y + h, w + 6, 1, c.copper);
  }

  function platformEnd(p, b) {
    p.rect(b.left, b.top, b.right - b.left, b.bottom - b.top, dusk);
    if (b.top < 0) {
      band(p, b, b.top, -169, c.navy);
      band(p, b, -169, -102, '#66667e');
      band(p, b, -102, -45, '#796b83');
      for (let j = Math.floor(b.left / 67); j * 67 < b.right; j++) {
        const x = j * 67 + 22,
          y = -195 + ((Math.abs(j) * 37) % 24);
        p.rect(x, y, 2, 1, c.smoke);
        p.rect(x + 27, y - 28, 1, 1, c.sand);
      }
      A.cloudStrip(p, 37, -200, 79, '#63677e', '#8b7b88');
      A.cloudStrip(p, 201, -135, 92, '#8d7886', '#a08992');
    }
    band(p, b, 28, 51, rose);
    band(p, b, 51, 76, c.peach);
    band(p, b, 76, 116, c.sand);
    for (const [x, y, w] of [
      [-283, 20, 103],
      [-136, 55, 69],
      [341, 35, 73],
      [453, 17, 96],
      [566, 61, 65],
    ])
      A.cloudStrip(p, x, y, w, '#a87580', '#ce9688');
    A.city(p, 110, '#8e7c83', '#987b7d', '#c39482');
    for (let i = Math.floor(b.left / 39) - 1; i * 39 < b.right; i++) {
      const x = i * 39 + 5;
      if (x > -29 && x < 330) continue;
      const n = Math.abs(i * 19 + 29),
        w = 22 + (n % 13),
        y = 75 + (n % 19);
      p.rect(x, y, w, 110 - y, '#8e7c83');
      p.poly([x - 3, y, x + 4, y - 5, x + w - 5, y - 5, x + w + 3, y], '#8e7c83');
      p.rect(x + 4, y - 12, 3, 8, '#8e7c83');
      for (let col = x + 4; col < x + w - 2; col += 7) p.rect(col, y + 4, 3, 3, '#c39482');
    }
    // Signal cabin on one approach, a high water tank and ladder on the other.
    p.poly([-152, 107, -149, 72, -158, 70, -130, 56, -95, 67, -100, 72, -102, 107], c.plum);
    p.poly([-153, 70, -130, 58, -99, 67, -101, 69, -132, 62], c.copper);
    p.rect(-144, 74, 36, 15, c.steel);
    for (const x of [-139, -130, -119]) p.rect(x, 74, 2, 15, c.plum);
    p.rect(-150, 93, 49, 3, c.violet);
    p.rect(-131, 95, 9, 13, c.night);
    p.poly([369, 60, 378, 52, 410, 51, 423, 56, 422, 80, 414, 85, 376, 85, 369, 79], c.violet);
    p.path([367, 59, 378, 51, 409, 49, 424, 55], c.smoke, 2);
    p.path([370, 72, 382, 76, 411, 75, 422, 70], c.plum, 2);
    p.path([377, 82, 373, 111, 411, 84, 418, 109], c.plum, 3);
    p.path([415, 57, 418, 107], c.smoke);
    p.path([419, 56, 422, 107], c.smoke);
    for (let y = 62; y < 108; y += 6) p.rect(415 + (y - 57) * 0.06, y, 6, 1, c.smoke);
    p.path(
      [b.left, 70, -125, 72, -67, 59, 0, 65, 81, 77, 135, 76, 200, 82, 278, 76, 320, 70, 371, 61, 441, 72, b.right, 68],
      c.violet,
    );
    band(p, b, 110, 140, c.plum);
    band(p, b, 113, 117, c.rust);
    band(p, b, 117, 119, c.navy);
    for (let x = Math.floor(b.left / 13) * 13 - 2; x < b.right; x += 13)
      p.path([x, 121, x + 5, 123, x + 11, 123], c.brick, 2);
    band(p, b, 122, 124, c.ochre);
    band(p, b, 126, 128, c.ink);
    band(p, b, 130, 133, c.slate);
    band(p, b, 133, b.bottom, c.plum);
    p.poly([b.left, 147 - b.left * 0.08, 141, 136, 304, 136, 213, 146, 0, 165, b.left, 165 - b.left * 0.09], c.rust);
    p.poly([b.left, 152 - b.left * 0.08, 173, 138, 266, 137, 179, 145, 0, 162, b.left, 162 - b.left * 0.09], c.copper);
    p.path([b.left, 168 - b.left * 0.11, 0, 168, 224, 145, 319, 142, b.right, 142 - (b.right - 319) * 0.03], c.ink, 2);
    // Tracks of light in the paving widen toward the camera.
    for (const y of [221, 252, 291, 334, 393, 471, 572]) {
      p.path([b.left, y - b.left * 0.11, 119, y - 13, b.right, y - 13 - (b.right - 119) * 0.055], c.night, 2);
      for (let j = Math.floor(b.left / 95); j * 95 < b.right; j++) {
        const x = j * 95 + ((y * 3) % 66),
          yy = y - 6 - x * 0.06;
        p.path([x, yy, x + 9, yy - 2, x + 25, yy - 2], c.brick);
      }
    }
    p.path([29, 178, 5, 230, -27, 273, -55, 324], c.night);
    p.path([211, 187, 170, 243, 132, 309, 43, 461], c.navy, 2);
    drain(p, 142, 247, 42);
    drain(p, -119, 178, 33);
    drain(p, 328, 186, 45);
    // The canopy's copper lip continues down its western end. Its pitched roof is visible above the clock.
    p.poly(
      [b.left, -63, b.right, -111, b.right, -3, 320, 5, 227, 9, 98, 16, 80, 20, 0, 25, b.left, 25 - b.left * 0.06],
      c.ink,
    );
    p.poly([b.left, -62, b.right, -110, b.right, -64, b.left, -12], c.navy);
    p.poly([b.left, -62, 249, -88, 321, -89, b.right, -108, b.right, -101, 322, -82, 248, -81, b.left, -54], c.slate);
    for (let x = Math.floor(b.left / 51) * 51 - 51; x < b.right; x += 51)
      p.path([x, -61 - x * 0.057, x + 22, -18 - x * 0.057], c.night, 2);
    for (let x = Math.floor(b.left / 121) * 121; x < b.right; x += 121)
      roofTruss(p, x, -45 - x * 0.056, 121, 24, c.night, c.slate);
    p.path(
      [b.left, 24 - b.left * 0.06, 0, 24, 85, 18, 226, 8, 319, 5, b.right, 5 - (b.right - 319) * 0.035],
      c.copper,
      2,
    );
    p.poly([-4, 24, 1, 23, 1, 48, -2, 42], c.ink);
    p.path([-215, 43, -197, 34, -180, 31, -164, 30], c.night, 3);
    // The original foreground silhouettes are the corners of two parked parcel barrows.
    p.poly(
      [-116, 185, -68, 176, 0, 169, 24, 162, 39, 164, 49, 171, 74, 177, 99, 180, 105, 183, 99, 208, 1, 224, -103, 222],
      c.ink,
    );
    p.path([-98, 196, -12, 187, 65, 181], c.slate, 2);
    p.poly([-95, 201, 0, 192, 95, 185, 93, 203, 0, 218, -93, 215], c.navy);
    p.path([-92, 210, -4, 207, 70, 194], c.plum, 2);
    p.oval(-61, 225, 9, 9, c.ink);
    p.oval(-61, 225, 4, 4, c.slate);
    p.oval(67, 211, 7, 7, c.ink);
    p.oval(67, 211, 3, 3, c.slate);
    p.poly(
      [246, 204, 256, 180, 263, 166, 279, 157, 301, 156, 320, 150, 365, 143, 385, 147, 392, 177, 381, 186, 282, 210],
      c.ink,
    );
    p.poly([259, 190, 318, 183, 340, 176, 363, 160, 382, 159, 384, 176, 281, 202], c.navy);
    p.path([252, 198, 279, 171, 362, 149], c.plum, 2);
    p.path([281, 205, 377, 183], c.slate, 2);
    p.oval(294, 207, 8, 8, c.ink);
    p.oval(294, 207, 4, 4, c.slate);
    p.oval(372, 190, 6, 6, c.ink);
    p.oval(372, 190, 2, 2, c.slate);
  }

  function clerestory(p, b, high, lit) {
    // Steel glazing on the pitched roof. Leaded panes, chains and the deep cornice
    // above the lens supply scale when the phone reveals the top of the hall.
    band(p, b, b.top, 0, c.night);
    p.poly(
      [
        b.left,
        -156 - b.left * 0.08,
        b.right,
        -156 - b.right * 0.08,
        b.right,
        -45 - b.right * 0.045,
        b.left,
        -45 - b.left * 0.045,
      ],
      c.plum,
    );
    for (let i = Math.floor((b.left - 25) / 91) - 1; i * 91 < b.right + 25; i++) {
      const x = i * 91 + 16,
        y = high - x * 0.048,
        w = 65;
      p.poly([x, y + 15, x + 16, y - 11, x + w, y - 13, x + w - 6, y + 36, x + 2, y + 39], c.ink);
      p.poly([x + 4, y + 16, x + 19, y - 7, x + w - 5, y - 9, x + w - 11, y + 31, x + 6, y + 34], lit);
      p.poly([x + 8, y + 17, x + 23, y - 5, x + 36, y - 6, x + 12, y + 29], lit === c.steel ? blueGlass : c.copper);
      p.path([x + 20, y + 35, x + 28, y - 8], c.plum, 3);
      p.path([x + 4, y + 12, x + w - 4, y + 9], c.plum, 3);
      p.path([x + 1, y + 38, x + w - 5, y + 35], c.slate, 2);
    }
    for (let i = Math.floor(b.left / 152) - 1; i * 152 < b.right; i++)
      roofTruss(p, i * 152, -60 - i * 7, 152, 25, c.ink, c.slate);
    p.path([b.left, -161 - b.left * 0.05, b.right, -161 - b.right * 0.05], c.slate, 5);
    p.path([b.left, -182 - b.left * 0.06, b.right, -182 - b.right * 0.06], c.navy, 3);
    for (let i = Math.floor(b.left / 126) - 1; i * 126 < b.right; i++) {
      const x = i * 126 + 37,
        y = -190 - x * 0.055;
      p.path([x - 8, b.top, x + 19, y, x + 36, y + 21], c.navy, 4);
      p.rect(x + 25, y + 4, 3, 2, c.slate);
    }
  }

  function tileFloor(p, b, tint, edge) {
    for (const y of [220, 253, 293, 347, 430, 535, 665]) {
      p.path([b.left, y - b.left * 0.08, 159, y - 15, b.right, y - 15 - (b.right - 159) * 0.1], edge, 2);
      p.path([b.left, y + 3 - b.left * 0.08, 159, y - 12, b.right, y - 12 - (b.right - 159) * 0.1], tint);
      for (let j = Math.floor(b.left / 84); j * 84 < b.right; j++) {
        const x = j * 84 + (y % 43),
          yy = y - 9 - x * 0.07;
        p.path([x, yy, x + 8, yy - 2, x + 14, yy - 2], tint);
      }
    }
    for (const x of [-224, -140, 6, 133, 267, 420, 570]) {
      const x2 = 162 + (x - 162) * (1 + (b.bottom - 182) / 170);
      p.path([x, Math.max(191, 203 - x * 0.08), x2, b.bottom + 9], edge);
    }
  }

  function bellRoom(p, b) {
    p.rect(b.left, b.top, b.right - b.left, b.bottom - b.top, c.navy);
    clerestory(p, b, -111, c.steel);
    // The lifting line carries the bell's weight up to a high lattice gallery.
    p.path([-42, -207, 68, -213, 148, -217], c.slate, 3);
    p.path([-38, -218, 68, -224, 143, -228], c.navy, 2);
    for (const i of [-29, 1, 31, 61, 91, 121]) p.path([i, -208 - i * 0.055, i + 2, -219 - i * 0.055], c.navy, 2);
    p.path([98, -215, 98, -174, 102, -168, 101, -77], c.ink, 3);
    p.path([103, -166, 103, -81], c.slate);
    p.oval(100, -172, 7, 8, c.ink);
    p.oval(100, -172, 4, 5, c.slate);
    p.oval(100, -172, 1, 2, c.rust);
    p.poly([b.left, 30 - b.left * 0.078, b.right, 5 - (b.right - 320) * 0.08, b.right, 132, b.left, 148], c.plum);
    const windows = [-296, -237, -178, -119, -60, 9, 66, 125, 185, 246, 304, 364, 423, 484, 544, 605];
    for (const x of windows) {
      A.arch(p, x, 27, 57, 94, c.night, x < 185 ? c.copper : c.peach);
      p.rect(x + 6, 79, 45, 37, x < 185 ? c.rust : clay);
      p.poly([x + 8, 59, x + 26, 39, x + 39, 37, x + 10, 79], x < 185 ? c.ochre : c.sand);
      p.rect(x + 25, 34, 3, 84, c.plum);
      p.rect(x + 5, 66, 46, 3, c.brick);
    }
    band(p, b, 120, 132, c.plum);
    band(p, b, 127, 131, c.ink);
    p.poly(
      [b.left, 136 - b.left * 0.022, b.right, 129 - (b.right - 320) * 0.022, b.right, b.bottom, b.left, b.bottom],
      c.navy,
    );
    p.path([b.left, 153 - b.left * 0.047, 0, 153, 319, 138, b.right, 138 - (b.right - 319) * 0.047], c.slate, 2);
    p.path([b.left, 181 - b.left * 0.108, 12, 180, 319, 147, b.right, 147 - (b.right - 319) * 0.108], c.plum, 2);
    tileFloor(p, b, c.plum, c.night);
    drain(p, 169, 210, 58);
    drain(p, -92, 153, 33);
    drain(p, 391, 159, 46);
    p.poly(
      [
        b.left,
        -24 - b.left * 0.05,
        b.right,
        -37 - b.right * 0.042,
        b.right,
        12 - (b.right - 320) * 0.065,
        320,
        12,
        225,
        18,
        148,
        18,
        66,
        27,
        0,
        29,
        b.left,
        29 - b.left * 0.06,
      ],
      c.ink,
    );
    p.path(
      [b.left, 30 - b.left * 0.06, 0, 30, 150, 16, 225, 17, 319, 11, b.right, 11 - (b.right - 319) * 0.065],
      c.copper,
      2,
    );
    p.path([b.left, -15 - b.left * 0.05, b.right, -15 - b.right * 0.05], c.navy, 3);
    // A manual hoist sits above the bell and follows its actual hanging bracket.
    p.path([98, -75, 98, -17, 109, -10, 109, 12], c.ink, 3);
    p.oval(98, -65, 12, 12, c.ink);
    p.oval(98, -65, 9, 9, c.slate);
    p.oval(98, -65, 4, 4, c.plum);
    p.path([100, -76, 146, -69, 184, -47, 179, -25], c.rust, 3);
    p.path([101, -78, 148, -71, 186, -47], c.ochre);
    p.poly(
      [b.left, 9 - b.left * 0.037, 0, 9, 172, 4, 193, 11, 192, 20, 70, 27, 0, 31, b.left, 31 - b.left * 0.06],
      c.night,
      c.ink,
    );
    p.path([b.left, 25 - b.left * 0.081, -13, 27, -4, 25], c.ochre, 2);
    p.poly([-5, 7, -1, 6, 1, 10, 1, 30, -4, 32], c.ink);
    p.path([-5, 9, -5, 25], c.slate);
    sortingCabinet(p, -167, 56, 68, 49);
    p.path([386, 17, 386, 90, 399, 101, 424, 101], c.night, 4);
    p.path([388, 24, 388, 87], c.slate);
    // Loading chest at the foot of the bell platform.
    p.poly(
      [-123, 205, -104, 191, -51, 181, 0, 168, 53, 151, 83, 151, 137, 180, 144, 183, 135, 227, 21, 249, -100, 247],
      c.night,
    );
    p.poly([-94, 213, 27, 201, 133, 184, 130, 222, 21, 241, -91, 240], c.plum);
    p.path([-107, 209, 19, 200, 108, 185], c.slate, 2);
    p.path([26, 202, 26, 236, 125, 219], c.night, 3);
    p.rect(73, 203, 13, 5, c.night);
    p.rect(75, 202, 9, 2, c.copper);
    A.crate(p, 365, 119, 47, 32);
    A.crate(p, 403, 111, 56, 39);
  }

  function counterRoom(p, b) {
    p.rect(b.left, b.top, b.right - b.left, b.bottom - b.top, c.navy);
    clerestory(p, b, -127, c.copper);
    // A suspended parcel sack waits on the overhead delivery rail.
    p.path([b.left, -203 - b.left * 0.06, b.right, -203 - b.right * 0.06], c.ink, 5);
    p.path([b.left, -204 - b.left * 0.06, b.right, -204 - b.right * 0.06], c.slate);
    p.oval(76, -208, 5, 5, c.ink);
    p.oval(76, -208, 2, 2, c.slate);
    p.path([76, -207, 76, -198, 81, -194, 80, -187], c.slate, 2);
    p.poly(
      [
        75, -188, 82, -188, 84, -184, 82, -180, 88, -171, 92, -154, 90, -145, 84, -142, 66, -142, 62, -147, 65, -166,
        72, -178, 75, -182,
      ],
      c.plum,
      c.ink,
    );
    p.path([72, -177, 80, -179, 84, -178], c.brick, 3);
    p.path([66, -149, 70, -156, 72, -168], c.slate);
    p.path([72, -144, 85, -144, 89, -149], c.brick, 2);
    band(p, b, 21, 87, c.plum);
    for (const x of [-265, -198, -135, -75, -18, 47, 118, 199, 267, 337, 406, 475, 545]) {
      A.arch(p, x, 22, 51, 71, c.night, x < 120 ? clay : c.copper);
      p.poly([x + 5, 53, x + 17, 34, x + 34, 31, x + 8, 74], x < 120 ? c.copper : c.sand);
      p.rect(x + 24, 32, 3, 60, c.brick);
      p.rect(x + 5, 58, 41, 3, c.brick);
    }
    band(p, b, 87, 97, c.night);
    band(p, b, 88, 90, c.copper);
    p.poly(
      [
        b.left,
        99 - b.left * 0.04,
        153,
        92,
        320,
        96,
        b.right,
        96 + (b.right - 320) * 0.02,
        b.right,
        b.bottom,
        b.left,
        b.bottom,
      ],
      c.plum,
    );
    p.poly([b.left, 140 - b.left * 0.4, 93, 103, 161, 96, 82, 136, 0, 172, b.left, 172 - b.left * 0.44], c.rust);
    p.poly([6, 145, 104, 111, 133, 108, 51, 141], c.copper);
    p.path(
      [b.left, 156 - b.left * 0.26, 0, 156, 136, 120, 319, 112, b.right, 112 - (b.right - 319) * 0.042],
      c.navy,
      2,
    );
    p.path(
      [b.left, 174 - b.left * 0.28, 0, 174, 142, 134, 318, 127, b.right, 127 - (b.right - 318) * 0.043],
      c.night,
      2,
    );
    tileFloor(p, b, c.brick, c.navy);
    drain(p, 166, 208, 47);
    // A row of open pigeonholes ends in a shuttered parcel office.
    sortingCabinet(p, -216, 35, 100, 65);
    sortingCabinet(p, 409, 25, 111, 73);
    p.rect(-94, 46, 24, 34, c.night);
    p.rect(-92, 48, 20, 29, c.teal);
    A.paw(p, -87, 55, c.sand);
    p.path([-90, 70, -74, 70], c.green);
    p.poly([139, 125, 199, 106, 319, 110, 411, 113, 444, 119, 443, 128, 319, 140, 210, 155, 139, 140], c.ink);
    p.poly([141, 125, 202, 109, 319, 112, 411, 115, 435, 118, 319, 122, 213, 145], c.copper);
    p.poly([140, 130, 211, 145, 319, 123, 437, 119, 437, 125, 319, 132, 214, 152, 141, 139], c.brick);
    p.path([143, 128, 212, 144, 319, 122, 434, 118], c.sand, 2);
    p.poly([319, 110, 323, 110, 324, 138, 319, 140], c.plum);
    p.path([325, 113, 325, 135], c.night, 2);
    p.rect(326, 120, 2, 2, c.copper);
    p.rect(423, 127, 7, 30, c.night);
    p.rect(425, 128, 2, 24, c.brick);
    A.crate(p, 290, 62, 35, 24);
    A.crate(p, 344, 88, 44, 26);
    p.poly(
      [
        b.left,
        -20 - b.left * 0.02,
        b.right,
        -39,
        b.right,
        6 - (b.right - 320) * 0.038,
        320,
        6,
        181,
        12,
        86,
        19,
        0,
        18,
        b.left,
        18 - b.left * 0.022,
      ],
      c.ink,
    );
    p.path(
      [b.left, 17 - b.left * 0.022, 1, 17, 84, 17, 182, 10, 319, 5, b.right, 5 - (b.right - 319) * 0.038],
      c.rust,
      2,
    );
    p.path([b.left, -15, b.right, -27], c.slate, 2);
    p.rect(229, -62, 3, 64, c.ink);
    p.rect(230, -57, 1, 48, c.copper);
    p.poly(
      [-125, 200, -97, 188, 0, 170, 25, 162, 45, 165, 57, 172, 81, 180, 87, 186, 79, 214, -52, 235, -125, 223],
      c.night,
    );
    p.poly([-112, 201, -49, 196, 82, 183, 76, 208, -51, 229, -111, 220], c.navy);
    p.path([-101, 203, -48, 208, 55, 189], c.slate, 2);
    A.crate(p, -168, 131, 42, 26);
  }

  function oakRoom(p, b) {
    const l = b.left,
      r = b.right,
      t = b.top,
      z = b.bottom;
    const back = (x) => -97 - x * 0.1,
      front = (x) => 293 - x * 0.095;
    p.rect(l, t, r - l, z - t, c.navy);
    // Pigeonholes behind the back edge of the worktop; drawer apron and bootwell below it.
    band(p, b, t, -91, c.plum);
    for (let i = Math.floor(l / 89) - 1; i * 89 < r; i++) {
      const x = i * 89 + 5,
        y = -205 - x * 0.09;
      sortingCabinet(p, x, y, 85, 66);
      p.rect(x - 4, y + 69, 89, 8, c.night);
      p.rect(x - 4, y + 69, 89, 2, c.copper);
    }
    for (let i = Math.floor(l / 74) - 1; i * 74 < r; i++) A.crate(p, i * 74 + 10, -276 - (i % 2) * 13, 53, 40);
    tileFloor(p, b, c.plum, c.night);
    p.poly([l, front(l) - 4, r, front(r) - 4, r, front(r) + 69, l, front(l) + 69], c.night);
    p.poly([l, front(l) + 7, r, front(r) + 7, r, front(r) + 58, l, front(l) + 58], c.brick);
    for (let i = Math.floor(l / 143) - 1; i * 143 < r; i++) {
      const x = i * 143 + 7,
        y = front(x);
      p.poly([x, y + 15, x + 129, y + 3, x + 129, y + 40, x, y + 52], c.plum, c.ink);
      p.path([x + 2, y + 16, x + 127, y + 5], c.copper);
      p.poly([x + 47, y + 25, x + 74, y + 22, x + 77, y + 25, x + 74, y + 28, x + 48, y + 31], c.ink);
      p.path([x + 50, y + 25, x + 71, y + 23], c.ochre, 2);
    }
    p.path([l, front(l) + 58, r, front(r) + 58], c.ink, 6);
    for (const x of [-191, 49, 258, 472]) {
      const y = front(x) + 60;
      p.poly([x, y, x + 13, y - 1, x + 11, y + 74, x + 6, y + 85, x + 1, y + 84], c.night);
      p.path([x + 3, y + 5, x + 3, y + 69], c.plum, 2);
      p.path([x + 4, y + 84, x + 62, y + 77], c.plum, 3);
    }
    p.g.save();
    p.g.beginPath();
    p.g.moveTo(l, back(l));
    p.g.lineTo(r, back(r));
    p.g.lineTo(r, front(r));
    p.g.lineTo(l, front(l));
    p.g.closePath();
    p.g.clip();
    p.rect(l, t, r - l, z - t, c.plum);
    p.poly([l, 41 - (l * 41) / 210, 210, 0, r, -(r - 210) * 0.098, r, z, l, z], c.brick);
    p.poly(
      [
        10 - ((z - 180) * 130) / 169,
        z,
        10,
        180,
        140,
        11,
        221,
        0,
        221 - t * 0.72,
        t,
        221 - t * 0.71,
        t,
        221,
        0,
        94,
        180,
        94 - ((z - 180) * 127) / 180,
        z,
      ],
      c.copper,
    );
    p.poly(
      [
        97 - ((z - 180) * 125) / 180,
        z,
        97,
        180,
        222,
        0,
        222 - t * 0.69,
        t,
        250 - t * 0.67,
        t,
        250,
        0,
        130,
        180,
        130 - ((z - 180) * 120) / 180,
        z,
      ],
      c.rust,
    );
    p.poly(
      [
        143 - ((z - 180) * 120) / 180,
        z,
        143,
        180,
        263,
        0,
        263 - t * 0.67,
        t,
        316 - t * 0.6,
        t,
        316,
        0,
        208,
        180,
        208 - ((z - 180) * 108) / 180,
        z,
      ],
      c.ochre,
    );
    p.poly([224 - ((z - 180) * 59) / 99, z, 224, 180, 283, 81, 320, 75, r, 75 - (r - 320) * 0.16, r, z], c.rust);
    // Irregular plank lengths and knots stay in fixed world positions across every crop.
    for (const y of [-187, -145, -106, -70, -31, 23, 57, 96, 136, 175, 216, 259, 299, 341, 389]) {
      p.path([l, y + 22 - l * 0.125, 104, y + 9, 319, y - 9, r, y - 9 - (r - 319) * 0.084], c.brick, 3);
      p.path([l, y + 21 - l * 0.125, 104, y + 8, 319, y - 10, r, y - 10 - (r - 319) * 0.084], c.plum);
      for (let j = Math.floor(l / 79) - 1; j * 79 < r; j++) {
        const x = j * 79 + (Math.abs(y * 3 + j * 29) % 44),
          g = y + 11 - x * 0.095;
        if (x > -1 && x < 317 && g >= 0 && g <= 179) continue;
        p.path([x, g, x + 13, g - 2, x + 27, g - 2, x + 33, g - 4], c.brick);
        if (Math.abs(y + j) % 3 === 0) {
          p.path([x + 20, g + 8, x + 26, g + 5, x + 35, g + 4, x + 40, g + 5, x + 34, g + 7, x + 21, g + 8], c.rust);
          p.rect(x + 27, g + 5, 5, 1, c.brick);
        }
        if (Math.abs(y - j) % 4 === 0) {
          p.rect(x + 5, g + 5, 3, 2, c.plum);
          p.rect(x + 5, g + 5, 2, 1, c.copper);
        }
      }
    }
    p.path([l, back(l) + 1, r, back(r) + 1], c.ochre, 4);
    p.path([l, front(l) - 5, r, front(r) - 5], c.ochre, 3);
    p.path([l, front(l) - 1, r, front(r) - 1], c.night, 3);
    // A copper inkpot, a pot of nibs, and the postal scale live at opposite ends of the desk.
    p.oval(-84, 54, 23, 6, c.brick);
    p.poly(
      [-101, 44, -100, 29, -94, 26, -93, 20, -78, 18, -75, 22, -74, 26, -66, 28, -65, 42, -69, 48, -93, 50],
      c.night,
      c.ink,
    );
    p.oval(-85, 21, 9, 4, c.copper);
    p.oval(-85, 21, 6, 2, c.ink);
    p.path([-97, 32, -96, 42, -88, 44], c.slate, 2);
    p.path([-86, 20, -81, -9, -71, -19], c.ink, 3);
    p.path([-82, -6, -74, -15], c.wheat);
    p.path([-86, 20, -91, -11, -99, -18], c.copper, 2);
    p.oval(414, 78, 31, 6, c.brick);
    p.poly([387, 70, 391, 62, 415, 58, 438, 63, 442, 70, 440, 73, 395, 78], c.ink);
    p.path([393, 64, 416, 61, 435, 65], c.ochre, 2);
    p.rect(410, 28, 6, 35, c.ink);
    p.rect(412, 30, 2, 29, c.copper);
    p.path([383, 30, 413, 25, 441, 30], c.plum, 3);
    p.path([386, 28, 412, 24, 440, 28], c.gold);
    p.path([390, 30, 379, 51, 400, 49, 390, 30], c.rust);
    p.oval(389, 51, 13, 4, c.slate);
    p.path([378, 50, 388, 52, 399, 50], c.smoke);
    p.path([432, 29, 422, 48, 443, 48, 432, 29], c.rust);
    p.oval(432, 48, 13, 4, c.copper);
    p.path([422, 47, 431, 49, 443, 47], c.sand);
    p.g.restore();
  }

  function trayCorner(p, reading) {
    const lip = reading ? [0, 46, 35, 38, 66, 19, 109, 0] : [0, 51, 37, 41, 52, 26, 78, 0];
    const end = reading ? 109 : 78;
    p.poly(
      [
        -167,
        28,
        -166,
        -26,
        -39,
        -95,
        61,
        -95,
        end + 50,
        -29,
        end,
        0,
        lip[4],
        lip[5],
        lip[2],
        lip[3],
        0,
        lip[1],
        -112,
        85,
      ],
      c.night,
    );
    p.poly(
      [-165, 30, -162, -26, -38, -92, 61, -92, end + 43, -30, 62, -13, -2, -11, -34, 8, -95, 61, -111, 73],
      c.plum,
    );
    p.poly([-142, -18, -32, -80, 57, -81, end + 21, -32, 10, -17, -30, -5, -98, 51, -144, 35], c.ink);
    for (const [x, y] of [
      [-101, 10],
      [-75, -4],
      [-49, -17],
    ]) {
      p.poly([x - 17, y + 9, x + 14, y - 8, x + 40, y - 6, x + 9, y + 13], c.sand);
      p.path([x - 12, y + 7, x + 12, y + 4, x + 29, y - 4], c.copper);
    }
    p.path([-163, 33, -110, 80, 0, lip[1] - 2, lip[2], lip[3] - 1], c.copper, 2);
    p.path([-161, -24, -38, -91, 58, -91], c.copper, 2);
  }

  function readingRoom(p, b) {
    const l = b.left,
      r = b.right,
      z = b.bottom;
    p.rect(l, b.top, r - l, z - b.top, c.navy);
    clerestory(p, b, -133, c.steel);
    // The reading counter's high ventilator has a single open slat.
    p.poly([166, -227, 254, -233, 253, -211, 166, -204], c.ink);
    p.poly([169, -224, 251, -230, 250, -213, 169, -207], c.slate);
    for (const n of [0, 5, 10]) p.path([171, -211 - n, 246, -217 - n], c.night, 2);
    p.poly([168, -225, 248, -230, 251, -227, 170, -221], c.steel);
    p.poly([l, 27 - (l - 98) * 0.116, r, 2 - (r - 320) * 0.116, r, 166, l, 169], c.plum);
    p.poly([-81, 47, 98, 27, 110, 158, -77, 182], c.navy);
    // The close shot looks along the sorting windows, under the same timber lintel.
    for (const x of [-451, -248, 122, 330, 538]) {
      const y = x === 122 ? 29 : 29 - (x - 122) * 0.135;
      p.poly([x, y, x + 162, y - 22, x + 162, y + 98, x + 1, y + 112], c.copper);
      p.poly([x + 6, y + 5, x + 154, y - 14, x + 154, y + 96, x + 5, y + 107], c.ochre);
      p.poly([x + 32, y + 2, x + 78, y - 4, x + 26, y + 94, x + 7, y + 97], c.wheat);
      p.poly([x + 97, y - 7, x + 116, y - 9, x + 63, y + 104, x + 44, y + 105], c.sand);
      for (const i of [27, 91, 151]) p.rect(x + i, y - 11, 5, 121, c.rust);
      p.path([x, y + 43, x + 163, y + 25], c.brick, 5);
      p.path([x, y + 47, x + 162, y + 31], c.copper, 2);
    }
    p.poly(
      [l, -32 - l * 0.08, r, -57 - r * 0.055, r, 9 - (r - 320) * 0.119, 320, 9, 118, 33, 0, 32, l, 32 + l * 0.008],
      c.night,
    );
    p.path([l, -13 - l * 0.07, r, -13 - r * 0.07], c.slate, 3);
    p.poly([l, 147 - l * 0.106, r, 113 - (r - 320) * 0.106, r, z, l, z], c.night);
    p.path([l, 149 - l * 0.106, 0, 149, 319, 115, r, 115 - (r - 319) * 0.106], c.copper, 2);
    p.poly([l, 220 - l * 0.065, r, 220 - r * 0.065, r, z, l, z], c.plum);
    tileFloor(p, b, c.brick, c.night);
    sortingCabinet(p, -223, 60, 93, 76);
    sortingCabinet(p, 391, 46, 104, 73);
    A.lamp(p, 348, 63, true);
    // Counter toward the camera with the drawer fronts and a parcel rail below its lip.
    p.poly(
      [
        l,
        235 - l * 0.065,
        117,
        224,
        r,
        205 - (r - 320) * 0.07,
        r,
        211 - (r - 320) * 0.07,
        117,
        233,
        l,
        245 - l * 0.065,
      ],
      c.brick,
    );
    p.path([l, 236 - l * 0.065, 117, 225, 320, 207, r, 207 - (r - 320) * 0.07], c.ochre, 2);
    for (const x of [-101, 25, 180, 353, 506]) {
      const y = 241 - x * 0.08;
      p.poly([x, y, x + 109, y - 9, x + 108, y + 23, x, y + 34], c.brick, c.night);
      p.path([x + 1, y + 1, x + 108, y - 8], c.copper, 2);
      p.rect(x + 45, y + 8, 18, 3, c.plum);
    }
  }

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

  function wide(p, t, view) {
    set(p, view, skyline, platformEnd);
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
      if (x < view.right + 1 && x + 89 > view.left)
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

  function bellShot(p, t, view) {
    set(p, view, bellBay, bellRoom);
    const tailX = px(178 + 101 * t);
    if (t < 1.42 || tailX < view.right) p.image(brakeVan(), tailX, 95, 73, 37);
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

  function floorClue(p, t, view) {
    set(p, view, sortingDesk, oakRoom);
    // The decaying draught rolls the bottom knot off the bright corner.
    const move = ease(0.16, 1.07, t),
      settle = Math.sin(t * 8) * Math.exp(-t * 2.1);
    const x = px(130 - 23 * move),
      y = px(74 + 5 * move - 2 * settle);
    p.oval(152, 135, 55, 7, c.brick);
    p.image(A.envelope(), 109, 79, 85, 61);
    outsideFrame(p, view, () => {
      braided(p, [-102, 110, -87, 106, -74, 106, -61, 111, -42, 111, -24, 104, -3, 96], 4);
      p.path([-101, 110, -109, 112, -113, 111], c.wheat, 2);
      p.path([-100, 112, -106, 115, -113, 115], c.copper, 2);
    });
    braided(p, [-3, 96, 27, 91, 48, 80, 56, 66, 50, 56, 37, 56, 31, 64, 37, 72, 56, 75, 83, 69, x + 7, y + 8], 4);
    p.image(knot(), x, y, 64, 41);
    p.poly([0, 0, 78, 0, 52, 26, 37, 41, 0, 51], c.night);
    p.path([0, 49, 35, 40, 54, 25], c.copper, 2);
    outsideFrame(p, view, () => trayCorner(p, false));
    const shade = tile('pip-cast-shadow', 151, 151, (q) => {
      q.image(A.pipPortrait(), 0, 0);
      q.g.globalCompositeOperation = 'source-in';
      q.rect(0, 0, 151, 151, c.plum);
      q.g.globalCompositeOperation = 'source-over';
    });
    const shadowX = px(lerp(-129, -35, ease(0.9, 1.75, t)));
    if (view.bottom > 180) {
      outsideFrame(p, view, () =>
        p.poly(
          [
            shadowX + 13,
            214,
            shadowX + 111,
            214,
            shadowX + 113,
            218,
            shadowX + 107,
            232,
            shadowX + 82,
            253,
            shadowX + 27,
            281,
            shadowX - 4,
            293,
            shadowX - 56,
            300,
            shadowX - 83,
            303,
            shadowX - 48,
            268,
            shadowX - 11,
            245,
            shadowX + 6,
            225,
          ],
          c.plum,
        ),
      );
    }
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

  function pickUp(p, t, view) {
    set(p, view, counterHall, counterRoom);
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

  let gripStage;
  function farGrip(p, x, y, view) {
    if (!isExpanded(view)) {
      p.image(hand(), x, y, 32, 24, true);
      return;
    }
    // Quantize the reflected 43-pixel drawing on the native film grid before the
    // projector translates it. This keeps its thin digit highlights from flickering.
    const grip = tile('far-grip-' + x + '-' + y, 32, 24, (q) => {
      if (!gripStage) {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        gripStage = new A.PixelPen(canvas);
      }
      const g = gripStage.g;
      g.clearRect(x, y, 32, 24);
      gripStage.image(hand(), x, y, 32, 24, true);
      q.g.drawImage(g.canvas, x, y, 32, 24, 0, 0, 32, 24);
    });
    p.image(grip, x, y);
  }

  function readingFigure(face, cel) {
    return tile('full-reading-figure-' + cel, 211, 237, (q) => {
      const fur = '#e7c697',
        light = '#fff0c4',
        shade = '#c59c75',
        tan = '#d99a60',
        brown = '#ac6f46',
        dark = '#82503e';
      q.g.translate(35, 0);
      // Pip sits back on his haunches to study the letter, his dispatch bag resting at his hip.
      q.poly(
        [
          33, 142, 29, 158, 15, 166, 4, 164, -7, 157, -16, 143, -20, 136, -24, 137, -24, 147, -19, 162, -7, 178, 4, 187,
          18, 189, 36, 181, 52, 161,
        ],
        fur,
        c.ink,
      );
      q.poly(
        [-23, 141, -17, 149, -11, 162, 1, 174, 16, 179, 33, 168, 27, 179, 12, 185, 1, 181, -12, 169, -22, 153],
        tan,
      );
      q.path([-22, 140, -19, 139, -15, 147], light, 2);
      q.poly(
        [
          50, 174, 73, 157, 99, 151, 119, 158, 128, 172, 130, 187, 128, 200, 134, 207, 148, 207, 155, 211, 156, 217,
          151, 221, 118, 222, 113, 218, 105, 204, 88, 197, 74, 200, 52, 199,
        ],
        shade,
        c.ink,
      );
      q.poly(
        [120, 183, 126, 180, 126, 198, 121, 209, 132, 213, 145, 212, 151, 213, 151, 217, 121, 219, 116, 215, 112, 203],
        tan,
      );
      q.path([137, 217, 137, 215, 140, 213], dark);
      q.path([145, 217, 146, 215], dark);
      q.poly(
        [
          41, 103, 64, 96, 84, 95, 101, 97, 113, 106, 125, 122, 132, 137, 134, 151, 129, 165, 118, 177, 102, 188, 84,
          201, 65, 209, 42, 210, 25, 202, 13, 190, 9, 173, 12, 151, 16, 135, 26, 121,
        ],
        fur,
        c.ink,
      );
      q.poly(
        [
          18, 139, 25, 130, 36, 122, 45, 118, 43, 127, 50, 122, 48, 134, 55, 128, 54, 138, 46, 148, 41, 161, 46, 160,
          39, 170, 40, 176, 29, 186, 18, 184, 15, 170,
        ],
        tan,
      );
      q.poly(
        [
          54, 110, 76, 100, 98, 102, 109, 111, 113, 124, 107, 143, 99, 153, 101, 155, 91, 166, 88, 175, 77, 186, 63,
          191, 60, 186, 66, 177, 65, 163, 71, 149, 69, 151, 73, 135, 70, 138, 66, 143, 62, 143, 65, 132, 58, 134,
        ],
        light,
      );
      q.path([19, 149, 24, 140, 29, 135], dark, 2);
      q.path([22, 176, 28, 183, 37, 186], brown);
      // The near hind paw projects past the folded knee and carries the dog's weight.
      q.poly(
        [
          37, 167, 54, 161, 69, 163, 78, 171, 78, 180, 74, 190, 67, 201, 75, 209, 88, 212, 96, 212, 102, 215, 105, 222,
          100, 228, 90, 229, 71, 229, 56, 226, 37, 219, 29, 212, 23, 199, 23, 183, 28, 173,
        ],
        fur,
        c.ink,
      );
      q.poly(
        [
          29, 179, 36, 170, 48, 166, 55, 166, 47, 173, 43, 184, 42, 197, 49, 207, 67, 216, 76, 223, 95, 224, 96, 227,
          73, 227, 57, 224, 38, 217, 31, 210, 25, 198, 25, 186,
        ],
        tan,
      );
      q.poly([55, 170, 64, 168, 73, 171, 74, 177, 70, 185, 66, 188, 68, 181, 64, 175], light);
      q.path([81, 224, 82, 219, 87, 217], dark);
      q.path([92, 225, 94, 221, 98, 220], dark);
      q.poly([43, 110, 51, 104, 58, 104, 111, 147, 110, 158, 101, 158, 70, 130], dark, c.ink);
      q.path([49, 107, 72, 124, 101, 148], c.ochre, 2);
      q.poly([87, 139, 115, 126, 132, 128, 140, 143, 145, 160, 141, 171, 114, 182, 87, 177, 81, 167], dark, c.ink);
      q.poly([84, 140, 117, 129, 131, 131, 136, 142, 124, 150, 95, 156, 85, 152], brown, c.ink);
      q.path([87, 141, 117, 132, 128, 133], c.ochre, 2);
      q.rect(113, 147, 7, 8, c.ink);
      q.rect(115, 148, 3, 5, c.gold);
      q.rect(115, 149, 2, 2, dark);
      q.path([88, 161, 92, 173, 113, 177, 135, 168], brown, 2);
      // The face, eyes and flying scarf share the same authored cells as the original close-up.
      q.g.drawImage(face, 0, 0, 151, 114, 0, 0, 151, 114);
    });
  }

  function reaction(p, t, view) {
    set(p, view, readingBay, readingRoom);
    const rise = ease(0.1, 0.88, t),
      focus = ease(1.11, 1.78, t);
    const cel = t > 0.76 && t < 0.92 ? 'blink' : t < 0.34 ? 'normal' : t < 1.17 ? 'down' : 'sharp';
    const face = faceCel(cel);
    const nod = px(3 * rise - 3 * focus);
    outsideFrame(p, view, () => {
      const sx = 207 / 133,
        sy = 185 / 119;
      const figure = readingFigure(face, cel);
      p.oval(106, 359, 100, 9, c.night);
      p.g.drawImage(figure, -15 - 43 * sx, 3 + nod, figure.width * sx, figure.height * sy);
      p.poly(
        [129, 170, 142, 165, 154, 167, 166, 180, 175, 180, 181, 188, 174, 198, 162, 204, 150, 202, 139, 193, 129, 185],
        '#d0a675',
        c.ink,
      );
      p.path([139, 171, 146, 172, 158, 184, 164, 187], c.sand, 3);
      p.poly(
        [
          65, 173, 76, 165, 89, 166, 97, 173, 101, 182, 108, 184, 117, 180, 122, 186, 118, 197, 109, 204, 97, 208, 87,
          207, 78, 204, 70, 197, 66, 187,
        ],
        '#e7c697',
        c.ink,
      );
      p.poly([69, 174, 77, 168, 85, 168, 91, 173, 91, 180, 88, 188, 83, 184, 81, 189, 77, 186, 75, 181], c.cream);
      p.path([74, 194, 81, 201, 92, 204], c.ochre, 2);
    });
    const g = p.g;
    g.save();
    g.beginPath();
    g.rect(0, 0, 320, 180);
    g.clip();
    g.drawImage(face, 8, 0, 133, 119, -15, 3 + nod, 207, 185);
    g.restore();
    // The same paw and sealed face move together as Pip raises the mail to eye level.
    const xx = px(174 - 9 * rise - 4 * focus),
      yy = px(127 - 26 * rise + 2 * focus);
    foreleg(p, 165, 186, xx + 77, yy + 40, 12, true);
    foreleg(p, 103, 187, xx - 19, yy + 55, 15);
    p.image(A.envelope(), xx, yy, 72, 51);
    p.image(hand(), xx - 28, yy + 26, 48, 36);
    farGrip(p, xx + 56, yy + 18, view);
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

  function readingGrip(p, x, y, side, view) {
    const transform = (points) => points.map((n, i) => (i % 2 ? y + n : x + n * side));
    // Both forelegs follow the camera toward the reader. Their elbows are out of the
    // native shot; on wider lenses their contours taper and turn downward at the joint.
    outsideFrame(p, view, () => {
      const leg = side === 1 ? '#e7c697' : '#d5ae7a';
      p.poly(
        transform([
          -107, 87, -128, 103, -147, 118, -156, 129, -163, 151, -167, 167, -166, 191, -174, 226, -195, 266, -232, 318,
          -267, 383, -290, 456, -221, 468, -191, 381, -168, 330, -138, 291, -124, 258, -114, 219, -109, 192, -108, 177,
          -101, 158, -88, 141, -73, 111, -64, 92,
        ]),
        leg,
        c.ink,
      );
      p.poly(
        transform([
          -106, 91, -126, 107, -144, 124, -153, 140, -158, 160, -158, 180, -154, 185, -150, 175, -146, 180, -144, 166,
          -136, 153, -136, 144, -128, 135, -110, 116, -98, 100,
        ]),
        side === 1 ? c.cream : c.wheat,
      );
      p.path(transform([-146, 211, -153, 239, -168, 264, -184, 288]), c.ochre, 3);
    });
    p.poly(
      transform([
        -108, 111, -108, 88, -87, 70, -64, 52, -50, 39, -40, 32, -32, 28, -25, 21, -20, 17, -18, 13, -13, 11, -11, 13,
        -5, 7, 0, 5, 4, 6, 7, 4, 13, 3, 16, 6, 16, 11, 12, 15, 8, 16, 5, 20, 2, 22, -3, 23, -6, 28, -11, 31, -16, 32,
        -21, 36, -24, 40, -28, 43, -45, 64, -64, 92, -73, 111,
      ]),
      side === 1 ? '#e7c697' : '#d5ae7a',
      c.ink,
    );
    outsideFrame(p, view, () => {
      p.poly(
        transform([
          -110, 86, -107, 87, -104, 91, -80, 105, -73, 108, -74, 113, -82, 119, -92, 117, -107, 115, -113, 111,
        ]),
        side === 1 ? '#e7c697' : '#d5ae7a',
      );
    });
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

  function pawReveal(p, t, view) {
    set(p, view, sortingDesk, oakRoom);
    p.poly([0, 0, 109, 0, 66, 19, 35, 38, 0, 46], c.night);
    p.path([0, 44, 36, 35, 64, 17], c.rust, 2);
    outsideFrame(p, view, () => trayCorner(p, true));
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
    readingGrip(p, left, handY, 1, view);
    readingGrip(p, left + w, handY - 17, -1, view);
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

  window.DispatchFilms.opening = function openingFilm(p, part, time = 0, view = nativeView) {
    const t = Math.max(0, Math.min(8, Number.isFinite(time) ? time : 0));
    if (part === 0) {
      if (t < 3.4) wide(p, t, view);
      else if (t < 6.2) bellShot(p, t - 3.4, view);
      else floorClue(p, t - 6.2, view);
    } else if (t < 2.6) pickUp(p, t, view);
    else if (t < 4.75) reaction(p, t - 2.6, view);
    else pawReveal(p, t - 4.75, view);
  };
})();
