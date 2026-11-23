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
  function platformFloor(p, t) {
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
  function underBell(p, t) {
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
  function swingingBell(p, t) {
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
  function desk(p, t) {
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
  function lastTrain(p, t) {
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
  window.DispatchFilms.ending = (p, part, t) => {
    if (part === 1) return t < 4.1 ? desk(p, t) : lastTrain(p, t - 4.1);
    if (t < 2.55) return platformFloor(p, t);
    if (t < 4.38) return underBell(p, t - 2.55);
    swingingBell(p, t - 4.38);
  };
})();
