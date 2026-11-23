/* The Last Dispatch. One indexed pixel occupies two world units. */
(() => {
  'use strict';

  const colors = {
    '#': '#252337', k: '#41394a', b: '#4f667d', B: '#6694a7', i: '#869fa7', I: '#b0c7c3',
    C: '#795142', c: '#a76c47', O: '#d48a51', L: '#f4c76a', H: '#ffe1a0',
    W: '#fff1c7', w: '#e5cba1', r: '#aa4d47', R: '#e5684f', t: '#4a7d73', T: '#70a78c', J: '#a6ceb0',
  };
  const keys = ['.', ...Object.keys(colors)];
  const indices = Object.fromEntries(keys.map((k, i) => [k, i]));
  const rgba = keys.map((k) => {
    const rgb = Number.parseInt((colors[k] || '#000000').slice(1), 16);
    return [rgb >>> 16, (rgb >>> 8) & 255, rgb & 255, k === '.' ? 0 : 255];
  });
  const rear = { I: 'i', i: 'B', B: 'b', b: 'k', H: 'L', L: 'O', O: 'c', c: 'C', C: 'k', W: 'w', w: 'c', R: 'r', J: 'T', T: 't', t: 'b' };
  const width = 134, height = 84, ox = 57, oy = 71;
  const tile = (rows) => rows.trim().split(/\s+/);
  const wheel = tile(`
    ...#####..
    ..#IIBbb#.
    .#iBBbibb#
    #iBb###bk#
    #BB#OLC#k#
    #bB#LcC#k#
    .#bk###k#.
    ..#bkkk#..
    ...#####..
  `);
  const chassis = tile(`
    ...######........#####......
    .##OLOOc#########OLOOc##....
    #LOOOOOOccccccccOOOOOOOc##..
    #wiiIBIIIIIIIIIiIIiiIBibb##.
    .#bbkkkbbbbbbbbbkkkbbbbbbk##
    ..####CccCCCCCCcc##########.
    ......###########...........
  `);
  const cabinet = tile(`
    .....############....
    ...##OLOOOOOOOOOc##..
    ..#OHLLOOOOOOOOccc#..
    .#OOOOOOOOOOccCCcc##.
    .#JJTTTTTTTTTTt#ccC#.
    #JTTTTTTTTTTTTt#ccC#.
    #TTTTTTTTTTTTTt#CcC#.
    #TTTTTTTTTTTtTt#cOC#.
    #TtttTTTTTTTtTt#ccC#.
    #TttttTTttttttt#CCC#.
    #Tt##########tt#CCC#.
    #Tt#kbbbbbbbk#t#ccC#.
    #Tt#bIiiiiiBb#t#cOC#.
    #Tt##########tt#ccC#.
    .#tTTTTTTTTttt#cCC#..
    .#OLOOOOOOccccCCcC#..
    ..#ccccccccCCCCCC#...
    ...##############....
  `);
  const clipEyes = {
    alert: tile(`..####...###. .#WWWH#.#WWW# #WWWWW##WWWW# #WWWkW##WWkW# .#WWkW#.#WkW# ..####...###.`),
    focus: tile(`............. .####.....### #wHHW###.#WH# .#WWWkW##WkW# ..#wwkW#.#w## ...####...##.`),
    dazed: tile(`..####...###. .#WWWW#.#WWW# #WW##W##WW#W# #WWW#W##W#WW# .#WWWW#.#WWW# ..####...###.`),
    shut: tile(`............. .##......##.. ..###....###. ....##.....##`),
  };
  const pin = tile(`..####.. .#LWWL#. #LOOOOc# .#iIIb#. ..#Ib#.. ..#bk#.. ..###...`);
  const smallFlag = tile(`..####### .#WHHHHL# #WHRRWHL# .#WRRHL#. ..##LHL#. ....###..`);
  const openFlag = tile(`..##########. .#WWHHHHHHHH# #WWWRRWWWWWH# #WHWRRRRWHHL# .#WHRRWWWLL#. ..####WHHL#.. ......####...`);
  const ticket = tile(`.#########. #WWWwWWWHH# #rRwWcWwWH# .#########.`);
  const punched = tile(`.####.###. #WWWW#WHH# #rRWW#wwW# .####.###.`);
  const pinHub = tile(`.###.. #wHOC# #LHcC# .#cC#. ..##..`);

  const boiler = tile(`
    ......#########################......
    ....##ccOOOLLOOOOOOOOLLLLOOOOcc##....
    ...#cOOLLHHWWLLLOOOOLHWWLLOOOOOOc#...
    ..#cOOLLHHHHHLLLOOOOLHHHLLOOOOcccc#..
    .#cOOOOOOOLLLOOOOOOOOLLOOOOOOcccccC#.
    .#cOOO#i#OOOOOOOOOOOOOO#i#OOOcccccC#.
    #cOOOO#B#OOOOOOOccccOOO#B#OOOccccCC#.
    #cOOOc#b#OOOccccccccccc#b#OccccCCCC#.
    #cOOcc#b#cccccCCCCCCccc#b#ccccCCCCC#.
    #cOccc#b#ccccCCCCCCCCcc#b#ccCCCCkkC#.
    #ccccc#b#ccccCCCCCCkkCC#b#cCCCCkkkC#.
    .#cccc#b#cccCCCkkkkkkCC#b#CCCkkkkC#..
    .#Cccc#b#CCCkkkkkkkkkkC#b#CCkkkkkC#..
    ..#Ccc#b#CCkkkkkkkkkkkC#b#CkkkkkC#...
    ...#CC#k#CkkkkkkkkkkkkC#k#kkkkkC#....
    ....############################.....
  `);
  const boilerSkirt = tile(`
    ...##############################..
    .##iIBBBBBBbBBBBBBBBBBbBBBBBbibbb#.
    #iiIIBBBbBBbBBBBBBIBBBbBBBBiBBbkk##
    .#bbkkkkkbbkkbbbbbbbbkkbbbbbbbkkk#.
    ..####ccC#########CccC###########..
    .....#####.......#####.............
  `);
  const rearHood = tile(`
    .....#######..
    ...##TTJJTTt#.
    ..#JJTTTTTTt#.
    .#TTTtt###tt#.
    #TTt#WWwWw#t#.
    #TTt#wWwWw#t#.
    #TTt#######t#.
    .#tTTttttttt#.
    ..#tttttttt#..
    ...########...
  `);
  const mailFlap = tile(`
    .############..
    #cOLWLLLLLLLOc#
    #OC#########Cc#
    #O#kbbkkkkkk#c#
    #O#.WWWWWWw.#c#
    #c#..wWwwW..#C#
    .#ccccccccccC#.
    ..###########..
  `);
  const head = tile(`
    ......###########.......
    ....##cOLLOOOOLOO##.....
    ...#OOLHWWLLLOOLLLO##...
    ..#cOLHLLLLLOOOOOOOOc#..
    .#cOOLLLLLLOOOLLOOOcc#..
    #cOOOOOOOOOOcOOOOcccc#..
    #cOOO##cOOOOOOOOOcccc##.
    #COO#iB#OOOOOOOOOOcccC#.
    #COc#Bb#OOOOOOOOOcccCC#.
    .#Ccc##ccOOOOOOOcccCCC#.
    .#CCCCcccccccccccCCCC#..
    ..#CCCCccccccCCCCkkC#...
    ...##CCCCCCkkkkkkCC#....
    .....##kkkCCCkkk##......
    .......#########........
  `);
  const ear = tile(`
    ....######.
    ..##OOLOcc#
    .#OOLLLOcC#
    #cOOOLOccC#
    #cOLOOccC#.
    .#cOOccCC#.
    .#cOccCC#..
    ..#ccCC#...
    ...#Ck#....
    ....##.....
  `);
  const muzzle = tile(`
    ....###########.
    ..##LOOOLLWWHL##
    .#LOOOOLHWWWWWw#
    #cLOOOLHWWWWWWw#
    #cOOOwWWWWwwwC##
    .#CccwwwwCCCC#..
    ..###kkkkkk##...
    .....######.....
  `);
  const nose = tile(`.####. #iBbb# #bbkk# .####.`);
  const houndEyes = {
    alert: tile(`..#######. .#HHWWWW#. #OWW##W#.. .#wW##w#.. ..#####...`),
    focus: tile(`.......... .####..... #cLLW###.. .#WW#kW##. ..######..`),
    dazed: tile(`..#####... .#WWWWW#.. #WW#W#W#.. .#WWWWW#.. ..#####...`),
    shut: tile(`......... .###..... .#Cc####. ...#####.`),
  };
  const whistle = tile(`..###.. .#LWL#. #HLLLO# .#OcC#. .#LOc#. .#LOc#. .#LOc#. .#LOc#. .#LOc#. .#LOc#. #LOOLc# .#####.`);
  const stack = tile(`
    .#########.
    #OHLLOOOOc#
    #cOOccccCC#
    .##bIBBb##.
    ..#bIBBb#..
    ..#bIIBb#..
    ..#bIIBb#..
    ..#bIIBb#..
    ..#bIIBb#..
    ..#bIIBb#..
    ..#iIBBb#..
    .#OLLOOOC#.
    #cccOOOOcC#
    .#########.
  `);
  const lamp = tile(`
    ...#####...
    ..#OLHLO#..
    .#ObbiBbL#.
    #cLHLLLbbc#
    #CLWLOOBbc#
    #COOLccBbC#
    .#ckbbBbc#.
    ..#cOOOc#..
    ...#####...
  `);
  const light = tile(`
    ....#####....
    ..##OLHLO##..
    .#cLHHWHHLc#.
    .#LHWWWWWHL#.
    #LHWWWHWWWWH#
    #HWWWWHWWWWH#
    #HWWWHHHWWWH#
    .#LHWWWWWHL#.
    .#cLHHWHHLc#.
    ..##OLHLO##..
    ....#####....
  `);
  const darkLamp = tile(`...#####... ..#cccCc#.. .#cbIbBbC#. #CbiBbBBbC# #CbbBbbbkC# #CbbbbkkkC# .#CkkkkkC#. ..#CCCCk#.. ...#####...`);
  const foot = tile(`...######.... ..#bIBBBb#... .#BIIIIIBb##. #BBbbcbbIIBb# #bkkC#kCCbk#b# .############.`);
  const joint = tile(`..###.. .#LHO#. #OO#cC# #Oc#CC# .#cCC#. ..###..`);
  const smallJoint = tile(`.###. #iIB# #BBb# .###.`);
  const platen = tile(`
    .......#####.......
    ......#OHWLO#......
    .....##cOOLC##.....
    ...##LLOOOOOLLO##..
    .##LOOOOLLLLLLOOc#.
    #cOOOLLLHLLLLLOOOc#
    #bIIBbBBBBBBIIBbbb#
    .#RRRrRRRRRRrRRRr#.
    .#rrrRRRrrrrrrrrr#.
    ..###############..
  `);
  const tailHook = tile(`....###. ...#IIB# ..#IBb#. .#IBb#.. #cOC#... .#c#.... ..#.....`);
  const steam = tile(`...##.... ..#II#.## .#IWWI#I# #IWWWWI#. .#IWWI#.. ..####...`);
  const envelope = tile(`.########. #WwWWWWwW# #WWwHHwWW# #WWWHHWWW# .########.`);

  function dot(pixels, x, y, color) {
    x += ox;
    y += oy;
    if (x >= 0 && x < width && y >= 0 && y < height) pixels[y * width + x] = indices[color];
  }

  function stamp(pixels, art, x, y, lean = 0, far = false) {
    for (let row = 0; row < art.length; row++) {
      const at = x + Math.round(lean * (1 - row / Math.max(1, art.length - 1)));
      for (let col = 0; col < art[row].length; col++) {
        const code = art[row][col];
        if (code !== '.') dot(pixels, at + col, y + row, far ? rear[code] || code : code);
      }
    }
  }

  function line(pixels, x, y, endX, endY, weight, color) {
    const dx = endX - x, dy = endY - y;
    const steps = Math.max(1, Math.abs(dx), Math.abs(dy));
    const edge = -Math.floor(weight / 2);
    for (let step = 0; step <= steps; step++) {
      const sx = x + Math.round(dx * step / steps), sy = y + Math.round(dy * step / steps);
      for (let j = 0; j < weight; j++) for (let i = 0; i < weight; i++) {
        if (weight > 4 && (i === 0 || i === weight - 1) && (j === 0 || j === weight - 1)) continue;
        dot(pixels, sx + i + edge, sy + j + edge, color);
      }
    }
  }

  function rod(pixels, x, y, endX, endY, weight, color) {
    line(pixels, x, y, endX, endY, weight + 2, '#');
    line(pixels, x, y, endX, endY, weight, color);
  }

  const stride = [-3, -1, 2, 4, 3, 1, -2, -4];
  const lift = [0, 0, 0, -1, -3, -4, -2, 0];
  const pinSpoke = [[-1, -2], [1, -2], [2, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1]];

  function clipper(pixels, pose, f) {
    const walk = pose === 'walk' || pose === 'charge';
    const wind = pose === 'windup', hit = pose === 'strike', hurt = pose === 'hurt';
    const stun = pose === 'stun', dead = pose === 'defeat';
    let bx = walk ? (pose === 'charge' ? 2 : 0) : 0;
    let by = walk ? [0, 0, -1, 0, 0, 1, 0, -1][f] : [0, -1, 0, 0][f % 4];
    let jawX = 12, jawY = -26, flagY = -34, tilt = 0;
    if (pose === 'idle') {
      jawY += [0, -1, 0, 1][f];
      flagY -= f === 2 ? 1 : 0;
    } else if (pose === 'charge') {
      tilt = 2;
      jawX += 2;
      jawY += 3;
      flagY += 2;
    }
    if (wind) {
      bx = [0, -1, -1, -2, -2, -2][f];
      by = [0, 0, 1, 1, 2, 2][f];
      jawX = [12, 12, 11, 10, 9, 9][f];
      jawY = [-27, -29, -30, -32, -33, -33][f];
      tilt = -1;
    } else if (hit) {
      bx = [3, 3, 3, 2, 1, 0][f];
      by = [2, 2, 1, 1, 0, 0][f];
      jawX = [25, 25, 25, 21, 16, 12][f];
      jawY = [-18, -18, -19, -20, -23, -26][f];
      tilt = f < 4 ? 2 : 0;
    } else if (hurt) {
      bx = [-2, -4, -2, 0][f];
      by = [0, 2, 1, 0][f];
      jawX = [11, 9, 10, 12][f];
      jawY = [-25, -28, -27, -26][f];
      tilt = [-2, -3, -2, 0][f];
    } else if (stun) {
      by = f % 2 ? 3 : 2;
      jawX = [12, 10, 11, 13][f]; jawY = [-32, -31, -30, -31][f]; flagY = -38; tilt = -1;
    } else if (dead) {
      bx = [0, -1, -2, -2, -3, -3][f];
      by = [1, 3, 4, 5, 6, 6][f];
      jawX = [11, 11, 12, 13, 14, 14][f];
      jawY = [-24, -21, -19, -18, -17, -17][f];
      flagY = [-31, -28, -26, -24, -22, -22][f];
      tilt = [-1, -2, -3, -4, -4, -4][f];
    }
    for (const center of [-8, 8]) {
      stamp(pixels, wheel, center - 5, -9);
      const [dx, dy] = pinSpoke[walk ? f : center < 0 ? 0 : 4];
      dot(pixels, center + dx, -5 + dy, 'H');
    }
    stamp(pixels, chassis, -14, -11);
    const poleX = -9 + bx + tilt, poleY = flagY + by;
    rod(pixels, -8 + bx, -21 + by, poleX, poleY + 1, 1, 'L');
    const flag = stun ? openFlag : smallFlag;
    stamp(pixels, flag, poleX - flag[0].length + 2, poleY, stun ? f % 2 : 0, dead && f > 2);
    stamp(pixels, cabinet, -11 + bx, -25 + by, tilt);
    const eyes = dead ? 'shut' : stun || hurt ? 'dazed' : wind || hit || pose === 'charge' ? 'focus' : 'alert';
    stamp(pixels, clipEyes[eyes], -8 + bx + tilt, -21 + by);
    const reach = jawX + 1;
    rod(pixels, 2 + bx, -12 + by, reach, -12 + by, 2, 'B');
    line(pixels, reach - 3, -13 + by, reach + 1, -13 + by, 2, 'I');
    if (!dead) stamp(pixels, hit && f <= 2 ? punched : ticket, reach - 8, -16 + by);
    const pivotX = -9 + bx + tilt, pivotY = -24 + by;
    const elbowX = Math.round((pivotX + jawX) / 2), elbowY = jawY - 1 + by;
    rod(pixels, pivotX, pivotY, elbowX, elbowY, 3, 'c');
    rod(pixels, elbowX, elbowY, jawX, jawY + by, 3, 'O');
    line(pixels, pivotX + 1, pivotY - 1, elbowX, elbowY - 1, 1, 'L');
    stamp(pixels, pin, jawX - 3, jawY - 1 + by);
    stamp(pixels, pinHub, pivotX - 2, pivotY - 2);
    if (stun) {
      dot(pixels, poleX - 6, poleY + 2, 'W');
      if (f === 1 || f === 3) dot(pixels, poleX - 4, poleY + 1, 'W');
    }
  }

  function houndLeg(pixels, hipX, hipY, footX, footY, far, front) {
    const kneeX = Math.round((hipX + footX) / 2) + (front ? 2 : -4);
    const kneeY = Math.round((hipY + footY) / 2) - 1;
    rod(pixels, hipX, hipY, kneeX, kneeY, far ? 4 : 5, far ? 'b' : 'c');
    rod(pixels, kneeX, kneeY, footX, footY - 5, 3, far ? 'b' : 'B');
    line(pixels, kneeX, kneeY, footX, footY - 5, 1, far ? 'B' : 'I');
    stamp(pixels, smallJoint, kneeX - 2, kneeY - 2, 0, far);
    stamp(pixels, foot, footX - 4, footY - foot.length, 0, far);
  }

  function conductor(pixels, pose, f) {
    const walk = pose === 'walk' || pose === 'charge', charge = pose === 'charge';
    const wind = pose === 'windup', hit = pose === 'strike', hurt = pose === 'hurt';
    const stun = pose === 'stun', dead = pose === 'defeat';
    const breath = [0, -1, -1, 0, 1, 0, 0, -1][f];
    let bx = 0, by = breath, nod = 0, neck = 0, lean = 0, earTip = 0, tail = breath;
    let elbowX = 19, elbowY = -26, toolX = 23, toolY = -15;
    if (wind) {
      bx = [0, -1, -2, -2, -3, -3][f]; by = [0, 0, 1, 2, 2, 2][f];
      nod = [0, -1, -2, -3, -3, -3][f]; neck = -1; lean = -1; earTip = -2;
      elbowX = [19, 20, 21, 22, 23, 23][f]; elbowY = [-29, -33, -38, -42, -45, -45][f];
      toolX = [23, 28, 31, 35, 38, 38][f]; toolY = [-21, -30, -38, -45, -51, -51][f];
      tail = -f;
    } else if (hit) {
      bx = [4, 4, 3, 2, 1, 0][f]; by = [3, 4, 3, 2, 1, 0][f];
      nod = [3, 4, 2, 1, 0, 0][f]; neck = [3, 2, 2, 1, 0, 0][f]; lean = f < 4 ? 2 : 0;
      elbowX = [29, 29, 28, 25, 21, 19][f]; elbowY = [-23, -24, -25, -26, -27, -26][f];
      toolX = [44, 44, 44, 38, 30, 23][f]; toolY = [-10, -10, -10, -14, -18, -15][f]; tail = 3;
    } else if (hurt) {
      bx = [-2, -4, -2, 0][f]; by = [1, 3, 2, 0][f];
      nod = [-2, -3, -1, 0][f]; neck = -2; lean = -2;
      toolX = [24, 26, 23, 23][f]; toolY = [-20, -23, -18, -15][f]; earTip = 3;
    } else if (stun) {
      by = 4 + f % 2; nod = 5; neck = -1; earTip = 2;
      elbowX = 20; elbowY = -19; toolX = 26; toolY = -10; tail = 7;
    } else if (dead) {
      bx = [0, -1, -2, -2, -3, -3][f]; by = [3, 6, 9, 11, 12, 12][f];
      nod = [1, 3, 5, 6, 7, 7][f]; neck = -2; lean = -2; earTip = 3; tail = 4 + f;
      elbowX = 19; elbowY = -20 + Math.min(f, 4); toolX = 27; toolY = -10;
    } else if (charge) {
      bx = 3; by = 2 + breath; nod = 4; neck = 4; lean = 3; earTip = -3; tail = -4;
      toolX = 23; toolY = -16 + breath; elbowX = 17; elbowY = -25 + breath;
    } else if (walk) {
      nod = [0, 0, -1, -1, 0, 1, 1, 0][f]; tail = stride[(f + 2) % 8];
      toolX += Math.sign(stride[f]); toolY += breath;
    } else {
      nod = f === 2 ? -1 : 0; toolY += breath;
    }

    function leg(base, phase, far, front) {
      const gait = (f + phase) % 8;
      let x = base + (walk ? stride[gait] * (charge ? 2 : 1) : 0);
      const y = walk ? lift[gait] : 0;
      if (wind || hit || dead || stun) x += front ? 3 : -2;
      houndLeg(pixels, base + bx + (front ? -3 : 2), -20 + by, x, y, far, front);
    }
    leg(-11, 4, true, false);
    leg(18, 0, true, true);
    const tailX = -31 + bx, tailY = -36 + by + tail;
    rod(pixels, -20 + bx, -25 + by, tailX + 4, tailY + 8, 3, 'B');
    rod(pixels, tailX + 4, tailY + 8, tailX, tailY, 2, 'O');
    stamp(pixels, tailHook, tailX - 3, tailY - 5);
    stamp(pixels, smallJoint, tailX + 1, tailY + 5);

    const stackX = -8 + bx, stackY = -55 + by;
    stamp(pixels, stack, stackX, stackY, lean);
    stamp(pixels, whistle, -15 + bx, -51 + by, lean);
    const venting = wind || charge || (stun && f % 2 === 0) || (dead && f < 3);
    if (venting) {
      const puff = f % 3;
      stamp(pixels, steam, stackX - 4 - puff * 2, stackY - 5 - puff, -2);
    } else if (!dead) {
      dot(pixels, stackX + 3, stackY - 4 - f % 2, 'I');
      dot(pixels, stackX + 2, stackY - 5 - f % 2, 'I');
    }
    stamp(pixels, rearHood, -25 + bx, -41 + by, lean);
    stamp(pixels, boiler, -22 + bx, -39 + by, lean);
    stamp(pixels, boilerSkirt, -22 + bx, -25 + by, 0);
    leg(-21, 0, false, false);
    leg(8, 4, false, true);
    stamp(pixels, mailFlap, -22 + bx, -34 + by, lean);
    const lit = stun || hurt && f === 0;
    if (stun) {
      rod(pixels, -3 + bx, -34 + by, -6 + bx, -37 + by, 1, 'L');
      rod(pixels, 4 + bx, -34 + by, 7 + bx, -37 + by, 1, 'L');
    }
    stamp(pixels, lit ? light : dead && f >= 2 ? darkLamp : lamp, (lit ? -6 : -5) + bx, (lit ? -35 : -34) + by);
    if (stun && f % 2 === 0) {
      dot(pixels, -8 + bx, -33 + by, 'H');
      dot(pixels, 8 + bx, -37 + by, 'W');
    }
    const hx = 7 + bx + neck, hy = -45 + by + nod;
    rod(pixels, 7 + bx, -28 + by, hx + 5, hy + 11, 8, 'b');
    const shoulderX = 9 + bx, shoulderY = -26 + by;
    rod(pixels, shoulderX, shoulderY, elbowX, elbowY, 5, 'b');
    line(pixels, shoulderX, shoulderY - 1, elbowX, elbowY - 1, 2, 'i');
    rod(pixels, elbowX, elbowY, toolX, toolY + 1, 3, 'B');
    line(pixels, elbowX, elbowY - 1, toolX, toolY, 1, 'I');
    const sleeveX = Math.round((elbowX + toolX) / 2), sleeveY = Math.round((elbowY + toolY) / 2);
    rod(pixels, elbowX, elbowY, sleeveX, sleeveY, 4, 'c');
    line(pixels, elbowX, elbowY - 1, sleeveX, sleeveY - 1, 1, 'L');
    stamp(pixels, joint, shoulderX - 3, shoulderY - 3);
    stamp(pixels, smallJoint, elbowX - 2, elbowY - 2);
    stamp(pixels, head, hx - 3, hy, lean);
    stamp(pixels, muzzle, hx + 10, hy + 7, lean);
    stamp(pixels, nose, hx + 20, hy + 8);
    const eyes = dead ? 'shut' : stun || hurt ? 'dazed' : wind || hit || charge ? 'focus' : 'alert';
    stamp(pixels, houndEyes[eyes], hx + 10, hy + 3);
    stamp(pixels, ear, hx - 4, hy + 1, earTip);
    stamp(pixels, platen, toolX - 10, toolY);
    if (stun) stamp(pixels, envelope, -22 + bx, -29 + by + f % 2, 1);
    if (dead && f >= 3) stamp(pixels, envelope, -31, -envelope.length, -1, f === 5);
  }

  const counts = { idle: 4, walk: 8, windup: 6, strike: 6, hurt: 4, stun: 4, defeat: 6, charge: 8 };
  const rates = { idle: 3, walk: 10, stun: 4, charge: 15 };
  const frames = new Map();

  function picture(kind, pose, f) {
    const key = kind + '/' + pose + '/' + f;
    if (frames.has(key)) return frames.get(key);
    const pixels = new Uint8Array(width * height);
    (kind === 'conductor' ? conductor : clipper)(pixels, pose, f);
    let x1 = width, y1 = height, x2 = 0, y2 = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (pixels[y * width + x]) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y);
        x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = x2 - x1 + 1; canvas.height = y2 - y1 + 1;
    const ctx = canvas.getContext('2d');
    const data = ctx.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const ink = pixels[(y1 + y) * width + x1 + x];
      if (ink) data.data.set(rgba[ink], (y * canvas.width + x) * 4);
    }
    ctx.putImageData(data, 0, 0);
    const frame = { canvas, x: 2 * (x1 - ox), y: 2 * (y1 - oy) };
    frames.set(key, frame);
    return frame;
  }

  function draw(ctx, kind, x, feetY, options = {}) {
    const name = kind === 'conductor' ? 'conductor' : 'clipper';
    const pose = Object.prototype.hasOwnProperty.call(counts, options.pose) ? options.pose : 'idle';
    const phase = Number.isFinite(options.phase) ? Math.max(0, Math.min(1, options.phase)) : 0;
    const time = Number.isFinite(options.time) ? Math.abs(options.time) : 0;
    const n = counts[pose];
    const f = rates[pose] && time > 0 ? Math.floor(time * rates[pose]) % n : Math.min(n - 1, Math.floor(phase * n));
    const frame = picture(name, pose, f);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(feetY));
    if (options.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(frame.canvas, frame.x, frame.y, frame.canvas.width * 2, frame.canvas.height * 2);
    ctx.restore();
  }

  window.DispatchActors = Object.freeze({ draw });
})();
