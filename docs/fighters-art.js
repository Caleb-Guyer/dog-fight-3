/* Dog Fight 3. Indexed pixel tiles are composed on a two-world-unit grid. */
(() => {
  'use strict';

  const palette = {
    '#': '#252337',
    k: '#41394a',
    n: '#77727d',
    W: '#fff1c7',
    w: '#e5cba1',
    H: '#ffe1a0',
    L: '#f4c76a',
    l: '#cf9759',
    C: '#795142',
    c: '#a76c47',
    O: '#d48a51',
    R: '#e5684f',
    r: '#aa4d47',
    B: '#6694a7',
    b: '#4f667d',
    I: '#b0c7c3',
    i: '#869fa7',
    T: '#70a78c',
    t: '#4a7d73',
    J: '#a6ceb0',
    P: '#715679',
    p: '#51445d',
    F: '#ac85ae',
    f: '#ddbbcc',
  };
  const colors = ['.', ...Object.keys(palette)];
  const index = Object.fromEntries(colors.map((color, i) => [color, i]));
  const rgba = colors.map((color) => {
    if (color === '.') return [0, 0, 0, 0];
    const number = Number.parseInt(palette[color].slice(1), 16);
    return [number >>> 16, (number >>> 8) & 255, number & 255, 255];
  });

  // A dot is transparent. Leading dots position clusters within the drawn tile.
  const tile = (drawing) => drawing.trim().split(/\s+/);
  const fighters = {
    pip: {
      headAt: [-10, -33],
      bodyAt: [-12, -22],
      tailAt: [-20, -24],
      collarAt: [-14, -19],
      hip: [-5, -9],
      feet: [-10, 4],
      shoulder: [3, -18],
      pawAt: [10, -15],
      armCoat: 'l',
      legCoat: 'l',
      legWidth: 3,
      fistWidth: 3,
      portrait: [-14, -39, 34, 30],
      head: tile(`
        ......#######
        ....##lLLHHLL##
        ...#llLLLLHHHWW##
        ..#clLLLllLHWWWWW#
        ..#cLLcccllLWWWWWW#
        .#cccCccCccLWWWWWW#
        .#cLcccCcccLWWWWWWW#
        .#clLLcCccLWWWWWWWWW#
        .#cllLlclLWWWWWWWWWWW###
        ..#llLLLWWWWWWWWwwWWWWWW#
        ..#lLLWWWWWWWWWWWWWWWWWW#
        ...#lWWWWWWWWWWWWWWWwwW#
        ..#wwWWWWWWWWWWWWWWWWW#
        ...#wwWWWWWWWWWWWWwww#
        ....##wwWWWWWWWWww###
        ......##wwwWWwww##
        ........########
      `),
      ears: [
        [
          12,
          -4,
          tile(`
          ...###
          ..#llL#
          .#clLL#
          #cclLLl#
          #cCclll#
          #CCcll#
          .#####
        `),
        ],
        [
          -2,
          -1,
          tile(`
          ....######
          ..##lLHLll#
          .#clLLLLlC#
          #cclLLlcC#
          #cclllcC#
          #CCcccC#
          #CCcC##
          #CCC#
          .#C#
          ..#
        `),
        ],
      ],
      eyes: [
        [7, 4, tile(`##... .###. .#WW# .#W## ..##.`)],
        [16, 4, tile(`.## #W# #W# .##`)],
      ],
      face: [
        [20, 7, tile(`.#### #nn### .####. ..##..`)],
        [11, 11, tile(`..c.c.......# .c.......###. ...######.... ....WH#......`)],
      ],
      body: tile(`
        .......########
        .....##LLHLLLwW##
        ...##clLLLlLWWWWW#
        ..#cCclLLlLWWWWWWW#
        .#lCCclLLLWWWWWWWW#
        .#lCCclLLWWWWWWWWW#
        #clCclllLWWWWWWWw#
        #clllLllLWWWWWWWw#
        #clLLllllwWWWWwww#
        .#cllLLllwwWwwwl#
        .#ccllllccwwllll#
        ..##cccccclll###
        ....#########
      `),
      tail: tile(`
        ..##
        .#WW#
        #WWW#
        #wwW#
        .#wlL#
        .#lLLL#
        ..#clLl##
        ...#clLLl##
        ....##clLLl#
        ......##cll#
        ........###
      `),
      collar: tile(`
        .###.......######
        #rRR##..###RRRRRr##
        .#rRRR##RRRRRHHRrR#
        ..##rRRRRRRRRRRRR##
        ..#RRrrrRRRRRRRr#
        .#RRR####rRRRr##
        #RRr#....#rRRr#
        ####......#rR#
        ...........##
      `),
      foot: tile(`
        .####
        #clL##
        #wwWWw##
        #wwWWWwW#
        .########
      `),
      fist: tile(`
        .####.
        #wWWW##
        #WWW#W#
        #wWWWW#
        .#www#
        ..###
      `),
    },
    brisket: {
      headAt: [-14, -31],
      bodyAt: [-15, -19],
      tailAt: [-19, -18],
      collarAt: [-8, -17],
      hip: [-5, -8],
      feet: [-12, 5],
      shoulder: [3, -14],
      pawAt: [10, -12],
      armCoat: 'B',
      legCoat: 'b',
      legWidth: 5,
      fistWidth: 4,
      portrait: [-17, -36, 37, 30],
      head: tile(`
        .......############
        .....##bbBBIIIIIBBB##
        ...##bbBBIIIIIBBBiBBB##
        ..#bbBBBIBBBBBiBBBBBBB#
        .#bbBBBbBBbbBiiBbbBBBBB#
        .#bbbbBBbbbBbiiBBbbBBBB#
        #bbBBBBbbBBBBiiBBBBiBbbB#
        #bbBBbbBBBBBiiIiiBBiBbBB#
        #bbBbbBBiiBiiIwwiiiBbBBb##
        #bbBBBBiwwwwwwwwwwwwwBBWw##
        .#bbBBiwwwWWWWwwwwwWWwwWWW#
        .#bBiiwwWWWwwWWwwWWWWwwWWw#
        .#bbwwWWWwwwwWWwWWWWWwwWWw#
        ..#wwwWWWwwwWWWWWWwwwwwWw#
        ..#wwWwwwwwwWWwwwwwWWwww#
        ...#wwwwWWwwwwwwWWWWwwww#
        ....#wwwwWWWWWWWWWwwwww#
        .....##wwwwwwwwwwwwww##
        .......#####wwwww####
        ............#####
      `),
      ears: [
        [
          16,
          -3,
          tile(`
          .#####
          #bbBBB##
          #BBiiiiB#
          .#Bbkk#B#
          ..#bkk##
          ...####
        `),
        ],
        [
          -1,
          1,
          tile(`
          ...####
          .##bBBB##
          #bBiiiiiB#
          #BiCCcBB#
          #BCrrCBB#
          #bCrCbB#
          .#CCBb#
          ..####
        `),
        ],
      ],
      eyes: [
        [8, 4, tile(`###.. .####. .#WW## .#W##. ..##..`)],
        [19, 4, tile(`.### ##W# .#W# ..##`)],
      ],
      face: [
        [15, 1, tile(`b..b .bb.`)],
        [18, 8, tile(`..###### .#nnn#n## .###k###. ..#####.. ...#.....`)],
        [
          9,
          12,
          tile(`.c...c....#.....c .W#....#.#..c..W# #WW#....#.....#W# .####....#...###. .....####.###....`),
        ],
      ],
      body: tile(`
        .......###########
        ....###BBBBIIIIIiB###
        ..##BBiIIIBBBIwwwIIII##
        .#bBBIIBBBBiwwWWWWWwWi#
        #bBBiiBBBBiwwWWWWWWWWW#
        #bBBBbBBBBiwwWWWWWWWww#
        #bbBBBbbBBiwwWWWWWWww#
        #bbBbBBBBBiiwWWWWWwww#
        #bbbBBBBBBiiwwwWwwwi#
        .#bbbBBBbbbiiiwwiiiB#
        ..####bbbbBBiiBBbb##
        ......###########
      `),
      tail: tile(`
        ..#####
        .#bBIIB#
        #bB##iB#
        #bb##B#
        .#bBBB##
        ..##bBBB#
        ....###b#
        .......##
      `),
      collar: tile(`
        ###..........####
        #lL###....###LLL#
        #lLHHH####HLLLl#
        .#lLLLLLLLLll##
        ..##llllllL##
        ....######L#
        .........#H#
        ........#LHL#
        .........#L#
        ..........#
      `),
      foot: tile(`
        ..#####
        .#bBiIB#
        #biiwwww##
        #wWWWW#WWw#
        #wwWWWWWWw#
        .#########
      `),
      fist: tile(`
        ..#####
        .#iWWWw##
        #wWWW#WWw#
        #WWW#WWWW#
        #wwWWWWww#
        .##wwwww#
        ...#####
      `),
    },
    noodle: {
      headAt: [-7, -30],
      bodyAt: [-15, -18],
      tailAt: [-24, -18],
      collarAt: [-5, -17],
      hip: [-8, -7],
      feet: [-13, 4],
      shoulder: [7, -15],
      pawAt: [12, -11],
      armCoat: 'c',
      legCoat: 'c',
      legWidth: 3,
      fistWidth: 3,
      portrait: [-13, -33, 38, 27],
      head: tile(`
        ......########
        ....##cOOOOllO##
        ...#cOOOlllllOOc#
        ..#ccOOlOOcclllOc#
        .#ccOOOcCCcOOllOO#
        .#cOOOOcCCcOOllOO#
        .#ccOOOcccOOOllllO#
        .#ccOOOlllOOOllllll###
        ..#ccOlllllllllllLLLll####
        ..#ccOllllLLLllllLLLLLlLLl##
        ...#cOllLLLLLLLLLLLLLLLLLll#
        ...#cOllLLLLLLLLLLLLLLLLLl#
        ....#clLLLLLLLLLLLLLLLLll#
        ....#clllLLLLlllllll####
        .....#ccllllllll####
        ......##cccllll##
        ........#######
      `),
      ears: [
        [
          11,
          -1,
          tile(`
          ..#####
          .#cOccC#
          #cOOccC#
          #ccCCcC#
          .#CCCC#
          ..#CC#
          ...##
        `),
        ],
        [
          -4,
          1,
          tile(`
          .....#####
          ...##cOOOc#
          ..#ccOOcCc#
          .#cOOcCCcc#
          .#ccOcCCcc#
          .#ccOcCCc#
          #cccOCCcc#
          #cccCCccC#
          #ccOCCccC#
          #ccOcCcc#
          #cOccCcc#
          #cOccCc#
          #cOcCcC#
          #cOcCc#
          #cOcCc#
          #cOcc#
          .#ccC#
          ..###
        `),
        ],
      ],
      eyes: [
        [8, 3, tile(`.###. ##..#. .#WW#. .#W##. ..###.`)],
        [15, 3, tile(`.##. #WW# .#W# ..##`)],
      ],
      face: [
        [24, 7, tile(`.#### #nn### .####. ..#...`)],
        [12, 10, tile(`...c.c........#. ....c......###.. .......####..... ..#####.........`)],
      ],
      body: tile(`
        ..............#########
        .....#########cOOlLLlOc#
        ...##cOOOOOOOOOOlllllllO#
        ..#cOOllllOOOOOOOllLLLLl#
        .#cOOlllOOOOOOOOllLLLLLl#
        #ccOOOOOOOclOOOllLLLLLl#
        #cOOOOOlllccOOllLLLLll#
        #cOllOllllllOllllllcc#
        #ccllllllcllllllccc##
        .##ccccccccllllccc#
        ...#######ccccc###
        ..........#####
      `),
      tail: tile(`
        .##
        #cc#
        #cO#
        .#cO#
        ..#cO#
        ...#cO##
        ....#cOO###
        .....##cOOO##
        .......##ccc#
        .........###
      `),
      collar: tile(`
        ...####...########
        .##TTTT###TTTJJTTt#
        #tTTTtTTTTTJJTTTTt#
        .###tTTTTTTTTTTTt#
        ..#tTt##tTTTTTTt#
        .#TTt#..#tTTTTt#
        #tt##....#tTTt#
        ###.......#Tt#
        ...........##
      `),
      foot: tile(`
        .####
        #cOl##
        #llLLl##
        #cLLL#Ll#
        .#######
      `),
      fist: tile(`
        .####
        #lLLl##
        #LLL#L#
        #lLLLL#
        .#lll#
        ..###
      `),
      charm: [
        -11,
        -13,
        tile(`
        ..####
        .#Hlll#
        #Ll##Ll#
        #l#LL#L#
        #L#l##l#
        .#lLlL#l#
        ..####.#L#
        .......#l#
        ........##
      `),
      ],
    },
    clover: {
      headAt: [-10, -34],
      bodyAt: [-12, -22],
      tailAt: [-23, -24],
      collarAt: [-12, -20],
      hip: [-5, -9],
      feet: [-11, 5],
      shoulder: [3, -18],
      pawAt: [10, -15],
      armCoat: 'k',
      legCoat: 'k',
      legWidth: 4,
      fistWidth: 3,
      portrait: [-14, -42, 34, 32],
      head: tile(`
        .......#########
        .....##kkkpnWWnk##
        ....#kkkkkpWWWWkp##
        ...#kkkpppppWWWpkpk#
        ..#kkppppkkkWWWWkkpk#
        .#kkpkkpkkkkWWWkkppk#
        .#kkkkkpkWkkWWWWkkkk#
        .#kkppkppkkWWWWWWwwkk#
        ..#pkpppkkWWWWWWWWWWWw##
        .#kppWkkkWWWWWWWWWWWWWWW#
        #pppWWWWWWWWWWWWWWWWWWWw#
        .#pWWWWWWWWWWWWWWWWWWww#
        .#wWWWWWWWwWWWWWWWWWWW#
        #wwwWWWWWwwWWWWWWWWww#
        ..#wWWWWWwwWwwwwWWw##
        .#wwwWWWWWWWWww####
        ....#wwwWwwww##
        ...#www#www##
        ......##### 
      `),
      ears: [
        [
          13,
          -6,
          tile(`
          .....##
          ....#k#
          ...#pkk#
          ..#pFp#
          .#pffp#
          #kFfpk#
          #kppk#
          .####
        `),
        ],
        [
          -1,
          -6,
          tile(`
          .##
          #kk##..#
          #kppk##k#
          .#pFpkpk#
          .#pffpkk#
          ..#pffpk#
          ..#pppkk#
          ...#pkk#
          ....###
        `),
        ],
      ],
      eyes: [
        [7, 3, tile(`ff... .fff. .#WW# .#W## ..##.`)],
        [16, 3, tile(`.ff. #WW# .#W# ..##`)],
      ],
      face: [
        [19, 8, tile(`.#### #nn### .####. ..#...`)],
        [11, 11, tile(`..n.n.......# ...n.....###. ....#####.... .....W#......`)],
      ],
      body: tile(`
        .........########
        ......###kpppwwwW###
        ....##pkkpkkwWWWWWw#
        ...#pkkpkkpwwwWWWWWw#
        ..#kppkkkkpwwWWWWWWWW#
        .#kpkpkkkpwwwWWWWWWw#
        #kppppkkpwwWWWWWWWWw#
        .#kpppkpwwWWWWwwWWw#
        .#kkppkkpwwwWwwWWWw#
        #kkkkkppkkwWwwWWw#
        ..#kkppkkkwwWWww#
        .#kkk#kkkwwww##
        ....#######w#
        ..........##
      `),
      tail: tile(`
        .###
        #WWW##
        #wwWWW##..#
        .#wWWWw###k#
        .#wwWwWwkkpp#
        ...#wwwkkpkpk#
        ..#wwkkkppkkk#
        ....#pppkpkkk#
        ...#pkpkpkkk#
        .....##kkpk#
        .......####
      `),
      collar: tile(`
        ..###........#####
        .#pFF####.###FFffF#
        #pFFFFFp##fFFFFFf#
        .###pFFFFFFFFFFFp#
        ..#pFp##pFFFFFpp#
        .#pFF#..#pFFFp#
        #pFpp#...#FFp#
        .###......###
      `),
      foot: tile(`
        .####
        #kkp##
        #pwwWW##
        #wWWW#WW#
        .########
      `),
      fist: tile(`
        ..####
        .#WWWW#
        #WWWW#W#
        #wWWWWW#
        .#wWWw#
        ..####
      `),
      charm: [
        -13,
        -14,
        tile(`
        ......####
        ....##FffF#
        ..##FfffF#
        .#pFFFpp#
        #pFFpp##
        #ppp##
        .###
      `),
      ],
    },
  };

  const W = 112;
  const H = 84;
  const originX = 50;
  const originY = 60;
  const frames = new Map();
  const portraits = new Map();
  const turnScratch = new Uint8Array(W * H);

  function ink(buffer, x, y, code) {
    x += originX;
    y += originY;
    if (x >= 0 && y >= 0 && x < W && y < H) buffer[y * W + x] = index[code];
  }

  // Shift entire pixel rows by integer steps to lean a head or a torso during a strike.
  function stamp(buffer, art, x, y, lean = 0, backShade = false) {
    const height = art.length;
    for (let row = 0; row < height; row++) {
      const dx = Math.round(lean * (1 - row / Math.max(1, height - 1)));
      const run = art[row];
      for (let col = 0; col < run.length; col++) {
        let color = run[col];
        if (color === '.') continue;
        if (backShade) color = rearColors[color] || color;
        ink(buffer, x + dx + col, y + row, color);
      }
    }
  }
  const rearColors = {
    W: 'w',
    w: 'l',
    H: 'l',
    L: 'l',
    l: 'c',
    O: 'c',
    c: 'C',
    I: 'B',
    i: 'B',
    B: 'b',
    F: 'P',
    k: 'k',
    p: 'k',
  };

  // Rotate an assembled pixel part as a unit so the eyes, muzzle, and outline stay together.
  function turned(buffer, pivotX, pivotY, radius, degrees, paint, mirrorX = false) {
    if (!degrees && !mirrorX) {
      paint(buffer);
      return;
    }
    turnScratch.fill(0);
    paint(turnScratch);
    const cx = pivotX + originX;
    const cy = pivotY + originY;
    const radians = (degrees * Math.PI) / 180;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    for (let y = Math.max(0, cy - radius); y <= Math.min(H - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(W - 1, cx + radius); x++) {
        const sx = cx + Math.round((x - cx) * c + (y - cy) * s) * (mirrorX ? -1 : 1);
        const sy = cy + Math.round((y - cy) * c - (x - cx) * s);
        if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
        const pixel = turnScratch[sy * W + sx];
        if (pixel) buffer[y * W + x] = pixel;
      }
    }
  }

  // Short pixel links keep shoulders and knees connected between authored hand and foot tiles.
  function link(buffer, points, width, fill) {
    const dot = (x, y, diameter, color) => {
      const radius = Math.floor(diameter / 2);
      for (let dy = 0; dy < diameter; dy++) {
        for (let dx = 0; dx < diameter; dx++) {
          if (diameter > 3 && (dx === 0 || dx === diameter - 1) && (dy === 0 || dy === diameter - 1))
            continue;
          ink(buffer, x - radius + dx, y - radius + dy, color);
        }
      }
    };
    const thickness = Array.isArray(width) ? width : points.map(() => width);
    for (const border of [2, 0]) {
      const color = border ? '#' : fill;
      for (let j = 1; j < points.length; j++) {
        const [ax, ay] = points[j - 1];
        const [bx, by] = points[j];
        const steps = Math.max(1, Math.abs(bx - ax), Math.abs(by - ay));
        for (let i = 0; i <= steps; i++) {
          dot(
            Math.round(ax + ((bx - ax) * i) / steps),
            Math.round(ay + ((by - ay) * i) / steps),
            Math.round(thickness[j - 1] + ((thickness[j] - thickness[j - 1]) * i) / steps) + border,
            color,
          );
        }
      }
    }
  }

  const shutEyes = tile(`..... ##... .###. ..... .....`);
  const hitEyes = tile(`..... #..#. .##.. #..#. .....`);
  const happyEyes = tile(`..... .##.. #..#. ..... .....`);
  const ledgePaws = {
    pip: tile(`.####.. #wWWW## #WW#W#W# .#W#W#W# ..##.#.#`),
    brisket: tile(`..#####. .#iWWWw## #wWWW#W#W# .#WW#WW#W# ..###.##.#`),
    noodle: tile(`.####.. #lLLL## #LL#L#L# .#L#L#L# ..##.#.#`),
    clover: tile(`.#####. #wWWWW## #WWW#W#W# .#WW#W#W# ..##.#.##`),
  };
  const soles = {
    pip: tile(`..###. .#wWW# #WcWcW# #WWWWw# #WWccw# .#wccw# ..####`),
    brisket: tile(`..####. .#iWWW# #WbWbbW# #WWWWWW# #WwwwbW# #WWbbwW# .#wwwW# ..####`),
    noodle: tile(`..###. .#lLL# #LcLcL# #LLLLl# #LLccl# .#lccl# ..####`),
    clover: tile(`..###. .#wWW# #WpWpW# #WWWWw# #WWppw# .#wppw# ..####`),
  };
  const heldDisc = tile(`
    ...########
    .##FfffffffF##
    #pFfFFffFFFPp#
    .#pFPPPPPPPp#
    ...#########
  `);
  const ropeHandle = tile(`
    .....####
    ...##HLLl#
    ..#Ll###Ll#
    #LH##..#Hl#
    .##....#lL#
    ........##
  `);
  const spreadPaws = {
    pip: tile(`..##.##. .#wW#WW# #WWwWWw# #WcWWcW# .#WccW#. ..#ww#.. ...##...`),
    brisket: tile(`..###.##. .#iWW#WW# #wWWWwWWW# #WWbWWbWW# .#WWbbwW#. ..#wwwW#.. ...###....`),
    noodle: tile(`..##.##. .#lL#lL# #LLlLLl# #LcLLcL# .#LccL#. ..#ll#.. ...##...`),
    clover: tile(`..##.##. .#wW#WW# #WWwWWw# #WpWWpW# .#WppW#. ..#ww#.. ...##...`),
  };
  const barkMouths = [
    tile(`..c.c.......# .c.......###. ....#####W#.. .....#rrr#... ......#w#.... .......#.....`),
    tile(`..c.c.......## .c......###WW# ...#####k#WW#. ...#W#kkk###.. ...#rppppr#... ....#rRRRR#... .....#RRR#.... .....#wwW#.... ......###.....`),
  ];
  const sailDisc = tile(`
    ....##########################....
    ..##FFFfffffffffffffffffffFFFF##..
    .#pFffFFFFFFFFFFFFffffFFFFFFFFFP#.
    #pFFFFFPPPPPPPPPPPPPPPPPPFFFFFPPp#
    .#ppPPPPFFFFFFFPPPPPPFFFFFFPPPPp#.
    ...##ppppppppPPPPPPPPPPpppppp##...
    ......######################......
  `);
  const bulldogHaunch = tile(`
    .....######
    ...##bBBBIB##
    ..#bBBiIiiBBb#
    .#bBIIIBBBbBb#
    #bBBiiBBBBBbb#
    #bBBBBbbBBbb#
    .#bbBBBbbbb#
    ..##bbbbb##
    ....#####
  `);
  const bulldogBelly = tile(`
    .....bbbBBBIiiwwww......
    ...#bBBBBIiiwwwWWWw##...
    ..#bBBBIiiwwwWWWWWWWw#..
    .#bBBBIiwwWWWWWWWWWWWw#.
    #bBBiiiwWWWWWWWWWWWWWWw#
    #bBiiwwwWWWWWWWWWWWWWWw#
    #bbiiwwWWWWWWWWWWWWWWww#
    .#biiwwWWWWWWWWWWWWWww#
    ..#iwwwWWWWWWWWWwwwww#.
    ...##wwwwWWWWwwwww##..
    .....###wwwwwww###....
    ........#######.......
  `);

  // Three hand-set keys per move: load the weight, strike, then carry momentum past contact.
  // Grounded paw positions use zero as the sole of the shoe. Angles are in degrees.
  const strikes = {
    attack: [
      { bodyX: -1, bodyY: 2, lean: -1, headTurn: -5, fistX: -5, fistY: 1, rearY: -4 },
      { bodyX: 2, lean: 2, headX: 1, headTurn: -4, fistX: 14, fistY: -4, rearX: -4, leftX: -2 },
      { bodyX: 2, bodyY: 1, lean: 2, headTurn: 3, fistX: 7, fistY: -2, rearX: -2, rightX: 1 },
    ],
    jab2: [
      { bodyX: 1, bodyY: 1, lean: 2, headTurn: 4, fistX: 2, fistY: -4, rearX: -8, rearY: 4 },
      {
        bodyX: 3,
        bodyY: -1,
        lean: 3,
        headX: -1,
        headTurn: -7,
        fistX: -8,
        fistY: 3,
        rearX: 18,
        rearY: -7,
        rearTurn: -14,
        leftX: -2,
        rightX: 2,
      },
      { bodyX: 3, lean: 2, headTurn: 6, fistX: -3, fistY: -1, rearX: 10, rearY: -2, rightX: 2 },
    ],
    finisher: [
      {
        bodyX: -4,
        bodyY: 4,
        lean: -4,
        headX: -1,
        headTurn: -14,
        fistX: -10,
        fistY: 4,
        rearX: 1,
        rearY: -6,
        leftX: -2,
        rightX: 1,
        kneeOut: 2,
      },
      {
        bodyX: 5,
        bodyY: -1,
        lean: 3,
        headX: 1,
        headTurn: -14,
        fistX: 17,
        fistY: -11,
        fistTurn: -25,
        rearX: -10,
        rearY: 3,
        leftX: -2,
        leftY: -2,
        leftFootTurn: -15,
        rightX: 5,
        kneeOut: 1,
      },
      {
        bodyX: 5,
        bodyY: 2,
        lean: 7,
        headX: 2,
        headTurn: 15,
        fistX: 13,
        fistY: 4,
        fistTurn: 19,
        rearX: -7,
        rearY: -6,
        leftX: -2,
        leftY: -2,
        leftFootTurn: -18,
        rightX: 5,
      },
    ],
    upper: [
      {
        bodyX: -2,
        bodyY: 4,
        lean: -1,
        headY: 1,
        headTurn: 6,
        fistX: -5,
        fistY: 4,
        rearX: 2,
        rearY: -4,
        leftX: -2,
        kneeOut: 3,
      },
      {
        bodyX: 2,
        bodyY: -3,
        lean: 1,
        headX: -2,
        headTurn: -22,
        fistX: 4,
        fistY: -21,
        fistTurn: -62,
        rearX: -5,
        rearY: 4,
        leftX: -2,
        leftY: -1,
        rightX: 1,
      },
      {
        bodyX: 1,
        bodyY: -1,
        lean: -1,
        headX: -2,
        headTurn: -12,
        fistX: 3,
        fistY: -19,
        fistTurn: -40,
        rearX: -3,
        rearY: 2,
        rightX: 1,
      },
    ],
    low: [
      {
        bodyX: -2,
        bodyY: 3,
        lean: -1,
        headTurn: 6,
        fistX: -6,
        fistY: 1,
        rearX: 2,
        rearY: -4,
        leftX: -2,
        kneeOut: 2,
      },
      {
        bodyX: 3,
        bodyY: 6,
        lean: 4,
        headX: 1,
        headY: 1,
        headTurn: 14,
        fistX: 17,
        fistY: 6,
        fistTurn: 6,
        rearX: -6,
        rearY: -9,
        leftX: -3,
        rightX: 5,
        kneeOut: 3,
      },
      {
        bodyX: 3,
        bodyY: 5,
        lean: 5,
        headTurn: 9,
        fistX: 12,
        fistY: 5,
        rearX: -5,
        rearY: -5,
        leftX: -3,
        rightX: 5,
        kneeOut: 2,
      },
    ],
    airAttack: [
      {
        bodyY: -1,
        lean: -2,
        headTurn: -10,
        fistX: 1,
        fistY: -4,
        rearX: -3,
        rearY: -3,
        leftX: 3,
        leftY: -6,
        rightX: -1,
        rightY: -10,
        rightFootTurn: -19,
        kneeOut: 3,
      },
      {
        bodyX: -1,
        bodyY: -2,
        lean: -3,
        headX: 2,
        headTurn: 9,
        fistX: -4,
        fistY: -7,
        rearX: -11,
        rearY: 1,
        leftX: 5,
        leftY: -6,
        rightX: 18,
        rightY: -14,
        rightFootTurn: -19,
        frontKneeY: -3,
      },
      {
        bodyX: 1,
        bodyY: -1,
        lean: -2,
        headTurn: 11,
        fistX: 1,
        fistY: -4,
        rearX: -7,
        rearY: 2,
        leftX: 1,
        leftY: -4,
        rightX: 12,
        rightY: -8,
        rightFootTurn: 12,
      },
    ],
    spike: [
      {
        bodyY: -2,
        lean: -2,
        headTurn: 13,
        fistX: 4,
        fistY: -11,
        rearX: 1,
        rearY: -10,
        leftX: 2,
        leftY: -8,
        rightX: 2,
        rightY: -10,
        kneeOut: 3,
      },
      {
        bodyX: 2,
        bodyY: 2,
        lean: 3,
        headX: 1,
        headY: 1,
        headTurn: 33,
        fistX: 4,
        fistY: 16,
        fistTurn: 72,
        rearX: -9,
        rearY: -8,
        leftX: -2,
        leftY: -9,
        rightX: -7,
        rightY: -6,
        leftFootTurn: -20,
        rightFootTurn: 17,
      },
      {
        bodyX: 2,
        bodyY: 2,
        lean: 2,
        headTurn: 24,
        fistX: 4,
        fistY: 12,
        fistTurn: 54,
        rearX: -6,
        rearY: -5,
        leftX: -2,
        leftY: -5,
        rightX: -3,
        rightY: -3,
      },
    ],
    heavy: [
      {
        bodyX: -4,
        bodyY: 4,
        lean: -4,
        headX: -1,
        headTurn: -11,
        fistX: -8,
        fistY: 3,
        rearX: 2,
        rearY: -4,
        leftX: -3,
        kneeOut: 3,
      },
      {
        bodyX: 4,
        bodyY: 1,
        lean: 5,
        headX: 2,
        headTurn: 4,
        fistX: 20,
        fistY: -3,
        rearX: -8,
        rearY: 1,
        leftX: -3,
        rightX: 4,
      },
      {
        bodyX: 4,
        bodyY: 3,
        lean: 6,
        headTurn: 12,
        fistX: 13,
        fistY: 1,
        rearX: -7,
        rearY: -2,
        leftX: -3,
        rightX: 4,
        kneeOut: 1,
      },
    ],
    shoulder: [
      {
        bodyX: -4,
        bodyY: 3,
        lean: -2,
        headTurn: -9,
        fistX: -5,
        fistY: -1,
        rearX: 2,
        rearY: -5,
        leftX: -1,
        rightX: 2,
        kneeOut: 3,
      },
      {
        bodyX: 7,
        bodyY: 4,
        lean: 8,
        headX: 5,
        headY: 1,
        headTurn: 13,
        fistX: 11,
        fistY: -5,
        rearX: -7,
        rearY: -2,
        leftX: -5,
        rightX: 5,
        kneeOut: 2,
      },
      {
        bodyX: 6,
        bodyY: 5,
        lean: 7,
        headX: 3,
        headTurn: 16,
        fistX: 6,
        fistY: -2,
        rearX: -7,
        rearY: 1,
        leftX: -4,
        rightX: 6,
        kneeOut: 2,
      },
    ],
    pounce: [
      {
        bodyX: -1,
        bodyY: 4,
        lean: -1,
        headTurn: -10,
        fistX: -3,
        fistY: 3,
        rearX: -3,
        rearY: 2,
        leftX: 2,
        rightX: -2,
        kneeOut: 3,
      },
      {
        bodyX: 4,
        bodyY: -3,
        lean: 4,
        headTurn: -7,
        fistX: 15,
        fistY: -7,
        rearX: 12,
        rearY: -12,
        leftX: -4,
        leftY: -6,
        rightX: -1,
        rightY: -4,
        leftFootTurn: -18,
      },
      {
        bodyX: 3,
        bodyY: -1,
        lean: 3,
        headTurn: 8,
        fistX: 10,
        fistY: -1,
        rearX: 8,
        rearY: -5,
        leftX: -3,
        leftY: -4,
        rightX: 1,
        rightY: -2,
      },
    ],
    cast: [
      { bodyX: -2, bodyY: 2, lean: -3, headTurn: -6, fistX: -7, fistY: -6, rearY: 2, leftX: -2 },
      {
        bodyX: 3,
        bodyY: 1,
        lean: 4,
        headX: 1,
        headTurn: 4,
        fistX: 18,
        fistY: -4,
        rearX: -7,
        rearY: 3,
        leftX: -2,
        rightX: 3,
      },
      { bodyX: 2, bodyY: 1, lean: 3, headTurn: 6, fistX: 13, fistY: -1, rearX: -5, rightX: 2 },
    ],
    disc: [
      { bodyX: -2, bodyY: 2, lean: -1, headTurn: -6, fistX: -9, fistY: -2, rearX: 2, rearY: -5 },
      {
        bodyX: 3,
        lean: 3,
        headX: 1,
        headTurn: -4,
        fistX: 16,
        fistY: -7,
        fistTurn: -18,
        rearX: -8,
        rearY: 3,
        leftX: -2,
        rightX: 3,
      },
      {
        bodyX: 3,
        bodyY: 1,
        lean: 4,
        headTurn: 6,
        fistX: 9,
        fistY: 1,
        fistTurn: 19,
        rearX: -5,
        rearY: -3,
        rightX: 3,
      },
    ],
  };
  // Directional kits add their own weight shift to a base gesture. Each contact has an optional
  // second beat for a wheel, flick, or tug. Whole-body angles rotate around the airborne fighter’s hips.
  const kitMoves = {
    pipSpin: {
      roll: [-12, -35, 34, 114, 231, 305, 341, 360],
      wind: { bodyY: 2, headY: 1, leftX: 4, leftY: -6, rightX: -2, rightY: -7, fistX: -4, rearX: -6 },
      hit: {
        bodyY: -2,
        headY: 3,
        headTurn: 19,
        leftX: 5,
        leftY: -10,
        rightX: -2,
        rightY: -12,
        fistX: -4,
        fistY: -4,
        rearX: -8,
        kneeOut: 3,
        ear: -3,
      },
      beat: { rightX: 3, rearY: -4, ear: 4 },
      follow: { bodyY: -1, headTurn: -8, leftX: 3, leftY: -5, rightX: 5, rightY: -6, fistX: 4, rearX: -5 },
    },
    pipDiveKick: {
      base: 'airAttack',
      sole: 'front',
      roll: [-5, -9, 1, 15, 24, 20, 8, 0],
      wind: { rightY: -3, fistY: -2, headTurn: -5 },
      hit: { rightX: 3, rightY: 4, rightFootTurn: 19, leftY: -3, headX: 2, rearX: -2, wholeY: 1 },
      beat: { rightY: 2, fistX: -2 },
      follow: { rightX: 4, rightY: 4, fistX: 2 },
    },
    pipBackKick: {
      sole: 'rear',
      roll: [0, -5, 5, 15, 10, 0, -3, 0],
      wind: { leftX: 9, leftY: -9, rightX: 3, rightY: -3, headTurn: -9, fistX: 1, fistY: -6 },
      hit: {
        bodyX: 1,
        bodyY: -2,
        lean: 3,
        torsoTurn: 9,
        headTurn: -13,
        leftX: -22,
        leftY: -14,
        leftFootTurn: 164,
        rightX: 4,
        rightY: -7,
        fistX: 5,
        fistY: -1,
        rearX: 5,
        rearY: -6,
        tail: 3,
      },
      beat: { leftX: -2, leftY: -1, ear: -3 },
      follow: { torsoTurn: -4, leftX: -10, leftY: -9, leftFootTurn: 124, rightY: -4, fistX: 3 },
    },
    pipFlip: {
      sole: 'front',
      roll: [12, 24, -45, -108, -149, -240, -310, -360],
      wind: { leftX: 4, leftY: -6, rightX: 1, rightY: -7, headTurn: -17, fistY: -6, rearY: -5 },
      hit: {
        bodyY: -1,
        torsoTurn: -9,
        headTurn: -15,
        rightX: 18,
        rightY: 3,
        rightFootTurn: -17,
        leftX: 6,
        leftY: -4,
        fistX: -4,
        fistY: -5,
        rearX: -5,
        wholeY: -3,
      },
      beat: { rightX: 3, wholeY: -1 },
      follow: { bodyY: -2, rightX: 7, rightY: -3, leftY: -6, fistY: -4 },
    },
    pipPogo: {
      sole: 'both',
      roll: [5, 11, 3, -3, 0, 5, 3, 0],
      wind: { bodyY: -3, headTurn: 9, leftX: 5, leftY: -9, rightX: -2, rightY: -10, fistY: -5 },
      hit: {
        bodyY: -1,
        headY: 1,
        headTurn: -6,
        leftX: 5,
        leftY: 9,
        rightX: -2,
        rightY: 10,
        leftFootTurn: 27,
        rightFootTurn: 21,
        fistX: -1,
        fistY: -10,
        rearX: -6,
        rearY: -6,
        kneeOut: 1,
      },
      beat: { leftY: 2, rightY: 2, fistY: -2 },
      follow: { bodyY: -3, leftX: 6, leftY: -6, rightX: -2, rightY: -8, fistY: 1, rearY: -2, wholeY: -4 },
    },
    brisketCurl: {
      haunch: true,
      roll: [-9, -23, 3, 12, 21, 28, 10, 0],
      wind: { bodyY: -1, headY: 2, leftX: 5, leftY: -8, rightX: -4, rightY: -9, fistX: -3 },
      hit: {
        bodyY: -2,
        headX: 2,
        headY: 1,
        headTurn: -12,
        torsoTurn: 13,
        leftX: -12,
        leftY: -11,
        leftFootTurn: 138,
        rightX: -5,
        rightY: -6,
        fistX: 9,
        fistY: -4,
        rearX: 5,
        rearY: -8,
        kneeOut: 3,
      },
      beat: { leftX: -2, rightX: -2, fistY: 2, headTurn: -6 },
      follow: { headTurn: -4, leftX: -7, leftY: -6, rightY: -4, fistX: 3 },
    },
    brisketRam: {
      base: 'heavy',
      roll: [-8, -12, -3, -8, -4, 6, 2, 0],
      wind: { leftY: -5, rightY: -6, fistY: -2 },
      hit: {
        bodyX: 1,
        headX: 2,
        shoulderY: -1,
        leftY: -7,
        rightY: -8,
        rightX: -4,
        leftFootTurn: -22,
        rightFootTurn: -14,
        rearX: -3,
        wholeY: -2,
      },
      follow: { leftY: -5, rightY: -3, headTurn: -5 },
    },
    brisketHip: {
      haunch: true,
      roll: [3, 12, -1, -4, -8, -4, 3, 0],
      wind: { bodyX: 3, bodyY: -1, headTurn: 8, leftX: 4, leftY: -6, rightX: 4, rightY: -5, fistY: -5 },
      hit: {
        bodyX: -10,
        bodyY: -3,
        lean: -2,
        torsoTurn: -3,
        headX: 6,
        headTurn: 5,
        leftX: 4,
        leftY: -6,
        rightX: 1,
        rightY: -10,
        fistX: 2,
        fistY: -4,
        rearX: 0,
        rearY: -6,
        haunchX: -4,
      },
      beat: { bodyX: -2, leftX: 2, headY: 1 },
      follow: { bodyX: -6, headTurn: 7, leftY: -3, rightX: 4, rightY: -6, fistX: 4 },
    },
    brisketCrown: {
      haunch: true,
      roll: [9, 12, -4, -13, -15, -9, -3, 0],
      wind: { bodyY: 4, headY: 3, headTurn: 6, leftX: 4, leftY: -5, rightX: -2, rightY: -6, fistY: -2 },
      hit: {
        bodyY: -4,
        headY: -5,
        headTurn: -29,
        torsoTurn: -7,
        leftX: 2,
        leftY: -4,
        rightX: -2,
        rightY: -7,
        fistX: -1,
        fistY: 5,
        rearX: -8,
        rearY: 4,
        wholeY: -2,
      },
      beat: { wholeY: -1, headTurn: -4 },
      follow: { bodyY: -1, headY: -2, headTurn: -19, fistY: 2, rightY: -5 },
    },
    brisketDrop: {
      belly: true,
      roll: [-3, -12, 6, 13, 6, 15, 8, 0],
      wind: { bodyY: -3, leftX: 6, leftY: -9, rightX: -2, rightY: -10, fistY: -6, rearY: -5, wholeY: -3 },
      hit: {
        bodyX: 1,
        bodyY: 4,
        headX: 2,
        headY: -3,
        headTurn: -15,
        torsoTurn: 5,
        leftX: -5,
        leftY: -9,
        rightX: 3,
        rightY: -8,
        fistX: 5,
        fistY: -10,
        rearX: -7,
        rearY: -8,
        wholeY: 5,
        kneeOut: 4,
      },
      beat: { wholeY: 3, fistX: 2, rightX: 2 },
      follow: { bodyX: 2, bodyY: 2, headTurn: -9, leftY: -5, rightY: -4, fistY: -5, wholeY: 3 },
    },
    noodleCoil: {
      tailType: 'coil',
      roll: [-10, -21, 5, 30, -17, -26, -11, 0],
      wind: { bodyY: -1, headY: 2, headTurn: 15, leftX: 5, leftY: -6, rightX: -2, rightY: -8, fistX: -4 },
      hit: {
        bodyY: -2,
        headY: 3,
        headTurn: 23,
        leftX: 7,
        leftY: -8,
        rightX: -3,
        rightY: -9,
        fistX: -3,
        fistY: -5,
        rearX: -5,
        rearY: 1,
        kneeOut: 3,
      },
      beat: { headTurn: -11, fistX: 4 },
      follow: { leftY: -4, rightY: -6, headTurn: 6, fistY: -4 },
    },
    noodleCast: {
      base: 'special',
      item: 'rope',
      itemAngles: [-45, -62, -26, 0, -7, 11, 17, 6],
      wind: { leftY: -3, rightY: -6 },
      hit: { leftY: -6, rightY: -7, fistX: 2, rightX: -2, wholeY: -1 },
      beat: { fistY: 1, rearY: -2 },
      follow: { leftY: -4, rightY: -3, fistX: 3 },
    },
    noodleTail: {
      tailType: 'rear',
      roll: [-4, -11, 0, 6, 3, -4, -2, 0],
      wind: { bodyX: -1, headTurn: -13, leftX: 5, leftY: -5, rightX: 3, rightY: -6, rearY: -5 },
      hit: {
        bodyX: 1,
        bodyY: -2,
        lean: 2,
        torsoTurn: 5,
        headX: 1,
        headTurn: -7,
        leftX: 3,
        leftY: -5,
        rightX: 3,
        rightY: -7,
        fistX: 3,
        fistY: -8,
        rearX: -2,
        rearY: 1,
      },
      beat: { headTurn: 6, ear: -4 },
      follow: { headTurn: 5, leftY: -3, rightY: -4, leftX: 2 },
    },
    noodleLoop: {
      item: 'rope',
      itemAngles: [-21, -32, -60, -87, -97, -69, -35, -9],
      wind: { bodyY: 1, fistX: -4, fistY: 2, leftX: 2, leftY: -6, rightY: -7, headTurn: -8 },
      hit: {
        bodyY: -3,
        headX: -3,
        headTurn: -23,
        torsoTurn: -8,
        shoulderY: -3,
        fistX: 2,
        fistY: -17,
        fistTurn: -43,
        rearX: -6,
        rearY: 4,
        leftX: 3,
        leftY: -3,
        rightX: -3,
        rightY: -7,
      },
      beat: { fistX: -2, fistY: -2 },
      follow: { bodyY: -2, headTurn: -16, fistX: 1, fistY: -12, leftY: -3, rightY: -5 },
    },
    noodleHook: {
      item: 'rope',
      itemAngles: [24, 10, 44, 85, 94, 70, 40, 15],
      wind: { bodyY: -2, headTurn: 7, fistY: -8, rearY: -3, leftX: 2, leftY: -8, rightY: -7 },
      hit: {
        bodyY: 1,
        headY: 1,
        headTurn: 21,
        torsoTurn: 10,
        fistX: 6,
        fistY: 12,
        fistTurn: 46,
        rearX: -7,
        rearY: -8,
        leftX: -1,
        leftY: -6,
        rightX: -3,
        rightY: -5,
        ear: 3,
      },
      beat: { fistY: 2, headTurn: 3 },
      follow: { headTurn: 13, fistX: 5, fistY: 8, leftY: -4, rightY: -4 },
    },
    cloverOrbit: {
      item: 'orbit',
      roll: [-14, -29, -5, 26, -24, -11, 5, 0],
      wind: { bodyX: -1, headTurn: -6, fistX: -5, fistY: -5, rearX: 2, leftY: -5, rightY: -7 },
      hit: {
        bodyY: -2,
        torsoTurn: 13,
        headTurn: -7,
        fistX: 8,
        fistY: -5,
        rearX: -12,
        rearY: 5,
        leftX: 2,
        leftY: -7,
        rightX: 2,
        rightY: -7,
        kneeOut: 2,
      },
      beat: { torsoTurn: -29, fistX: -16, fistY: 10, rearX: 18, rearY: -13, headTurn: 13, rightX: -5 },
      follow: { torsoTurn: -13, fistX: -5, fistY: 3, rearX: 4, rearY: -6, leftY: -3, rightY: -5 },
    },
    cloverFore: {
      base: 'special',
      item: 'disc',
      itemAngles: [-36, -55, -22, -6, 5, 22, 15, 1],
      wind: { leftY: -4, rightY: -6 },
      hit: { fistX: -2, fistY: 2, leftY: -7, rightX: 1, rightY: -6 },
      beat: { fistX: 2, torsoTurn: 5 },
      follow: { leftY: -4, rightY: -4, fistX: 2 },
    },
    cloverBack: {
      item: 'backDisc',
      glance: true,
      itemAngles: [35, 67, 121, 166, 183, 212, 88, 9],
      wind: { bodyX: 1, lean: 3, headTurn: -6, rearX: 5, rearY: -5, fistY: -4, leftY: -6, rightY: -5 },
      hit: {
        bodyX: -4,
        bodyY: -2,
        lean: -2,
        headX: 1,
        headTurn: 3,
        torsoTurn: -19,
        rearX: -26,
        rearY: -4,
        rearTurn: -18,
        fistX: 1,
        fistY: 2,
        leftX: 4,
        leftY: -6,
        rightX: 5,
        rightY: -8,
      },
      beat: { rearX: -3, rearY: 2, headTurn: -5 },
      follow: { bodyX: -2, torsoTurn: -13, rearX: -15, rearY: 0, fistX: 2, fistY: -1, leftY: -3, rightY: -6 },
    },
    cloverVolley: {
      base: 'upper',
      item: 'disc',
      itemAngles: [-42, -33, -18, -16, -23, -9, 7, 0],
      wind: { leftY: -4, rightY: -6 },
      hit: { headTurn: -3, fistX: -1, fistY: -1, rearX: 3, rearY: -6, leftY: -4, rightY: -6 },
      beat: { fistY: -1, fistX: 2 },
      follow: { leftY: -4, rightY: -5 },
    },
    cloverSkip: {
      item: 'disc',
      itemAngles: [-41, -55, -7, 49, 57, 34, 11, 0],
      wind: { headTurn: 9, fistX: -3, fistY: -9, leftX: 2, leftY: -7, rightY: -8 },
      hit: {
        bodyY: 1,
        headX: 1,
        headTurn: 22,
        torsoTurn: 12,
        fistX: 10,
        fistY: 7,
        fistTurn: 25,
        rearX: -8,
        rearY: -6,
        leftX: 2,
        leftY: -6,
        rightX: -1,
        rightY: -7,
      },
      beat: { fistX: 2, fistY: 2 },
      follow: { torsoTurn: 8, headTurn: 13, fistX: 7, fistY: 5, leftY: -4, rightY: -3 },
    },

    pipJab: {
      base: 'attack',
      ground: true,
      wind: { fistX: -1 },
      hit: { lean: 1, fistX: 1, rearY: -2 },
      follow: { fistY: 1 },
    },
    pipCross: {
      base: 'jab2',
      ground: true,
      wind: { rearX: -2 },
      hit: { torsoTurn: -4, rearX: 2, rearY: -1 },
      follow: { rearX: 1 },
    },
    pipHeel: {
      ground: true,
      sole: 'front',
      wind: { bodyX: -1, lean: -1, headTurn: -6, rightX: 1, rightY: -9, fistY: -4 },
      hit: {
        bodyX: -2,
        torsoTurn: -15,
        headX: 2,
        headTurn: 8,
        rightX: 21,
        rightY: -13,
        rightFootTurn: -19,
        frontKneeY: -2,
        fistX: -5,
        fistY: -5,
        rearX: -8,
        rearY: 3,
      },
      beat: { rightX: 2, torsoTurn: 3 },
      follow: { bodyX: 1, torsoTurn: 6, rightX: 9, rightY: -6, rightFootTurn: 13, rearX: -3 },
    },
    brisketCheck: {
      base: 'heavy',
      ground: true,
      wind: { bodyY: 1 },
      hit: { bodyX: -1, fistX: -3, kneeOut: 1 },
      follow: { rightX: 1 },
    },
    brisketLift: {
      base: 'upper',
      ground: true,
      wind: { bodyY: 1, kneeOut: 1 },
      hit: { shoulderY: -1, fistY: -2, fistX: 2, torsoTurn: -3 },
      follow: { fistY: -1 },
    },
    noodleTrip: {
      ground: true,
      item: 'rope',
      itemAngles: [22, 27, 10, -8, -16, 8, 16, 7],
      wind: { bodyX: -2, bodyY: 2, rightX: -3, rightY: -6, fistY: -2, rearY: -4 },
      hit: {
        bodyX: -2,
        bodyY: 4,
        headTurn: 7,
        torsoTurn: -7,
        rightX: 19,
        rightY: -1,
        rightFootTurn: -9,
        kneeOut: 3,
        frontKneeY: -2,
        fistX: -2,
        fistY: -5,
        rearX: -6,
      },
      beat: { rightX: 3, rightY: 1 },
      follow: { bodyY: 3, rightX: 10, rightY: -2, torsoTurn: 5, fistY: -2 },
    },
    noodleReel: {
      ground: true,
      item: 'rope',
      itemAngles: [4, -3, 8, 11, 9, 17, 14, 5],
      wind: { bodyX: 3, lean: 3, torsoTurn: 8, fistX: 13, fistY: -3, rearX: 6, rearY: -2, rightX: 3 },
      hit: {
        bodyX: -5,
        bodyY: 3,
        torsoTurn: -20,
        headTurn: -8,
        fistX: -1,
        fistY: -5,
        rearX: 2,
        rearY: -3,
        leftX: -3,
        rightX: 6,
        kneeOut: 2,
        tail: 3,
      },
      beat: { fistX: -2, rearX: -2, bodyX: -1 },
      follow: { bodyX: -3, bodyY: 2, torsoTurn: -11, fistX: -2, rightX: 4 },
    },
    noodleSnap: {
      base: 'special',
      ground: true,
      item: 'rope',
      itemAngles: [-40, -61, -27, -5, 6, 17, 9, 2],
      wind: { rearY: -3, headTurn: -4 },
      hit: { fistX: 2, lean: 1, leftX: -1, rightX: 1 },
      beat: { fistY: 2 },
      follow: { torsoTurn: 5, fistY: 1 },
    },
    cloverTap: {
      base: 'attack',
      ground: true,
      item: 'disc',
      itemAngles: [-26, -37, -19, -4, 4, 13, 9, 0],
      wind: { fistY: -2 },
      hit: { fistX: -1, fistY: 1 },
      follow: { fistX: 1 },
    },
    cloverSet: {
      base: 'upper',
      ground: true,
      item: 'disc',
      itemAngles: [25, 37, 15, -11, -18, -8, 7, 0],
      wind: { headTurn: 2, fistY: 1 },
      hit: { fistX: -2, fistY: 1, rearX: 7, rearY: -12, headTurn: -3 },
      beat: { fistY: -2, rearY: -2 },
      follow: { rearY: -5 },
    },
    // Each special reuses the fighter's own pixel rig. Persistent rope, disc and
    // movement effects are layered separately by the match renderer.
    pipBark: {
      ground: true, bark: true,
      wind: { bodyX: -1, bodyY: 2, torsoTurn: -5, headX: -1, headTurn: -5, fistX: -3, fistY: -1, rearX: -2 },
      hit: { bodyX: 1, lean: 1, headX: 3, headY: -1, headTurn: -13, torsoTurn: 4,
        fistX: -2, fistY: 3, rearX: -5, rearY: 2, tail: -1 },
      beat: { bodyX: -1, headX: -2, headY: 1, headTurn: 7, ear: 3 },
      follow: { bodyY: 1, headX: -1, headTurn: 5, fistY: -1, rearY: -2 },
    },
    pipPounce: {
      base: 'special', openHands: 'both', openRange: [2, 5], floorWind: true,
      roll: [0, 0, -5, -7, 8, 13, 4, 0],
      wind: { kneeOut: 1, leftX: -1, rightX: 1 },
      hit: { fistX: 2, fistY: -2, rearX: 3, rearY: -1, rightY: -3, leftX: -3, headTurn: -3 },
      beat: { fistY: 5, rearY: 1, rightX: 3, ear: 3 },
      follow: { fistX: 3, rearY: 2, rightX: 2, leftY: -2 },
      rest: { rightX: 2, rightY: -3, fistX: 1, fistY: -2 },
    },
    pipHopper: {
      floorWind: true, openHands: 'both', openRange: [2, 5],
      roll: [0, 0, -8, -16, -11, 2, 3, 0],
      wind: { bodyY: 4, headY: 1, headTurn: -14, torsoTurn: -6, fistX: -2, fistY: -2,
        rearX: -5, kneeOut: 4, rightX: 2 },
      hit: { bodyY: -2, lean: 2, headTurn: -18, torsoTurn: 3, shoulderY: -1, fistX: 13,
        fistY: -15, fistTurn: -39, rearX: 4, rearY: -4, leftX: -5, leftY: -3, leftFootTurn: 12,
        rightX: 5, rightY: -9, wholeY: -2 },
      beat: { fistX: -2, fistY: 3, rearX: 7, rearY: -5, headTurn: 4, rightX: -2 },
      follow: { bodyY: -1, headTurn: -9, fistX: 4, fistY: -6, rearX: 3, rearY: -5,
        leftX: 3, leftY: -6, rightX: -2, rightY: -8, kneeOut: 3 },
      rest: { headTurn: -5, fistX: 3, fistY: -4, leftX: 1, rightX: -2, rightY: -3 },
    },
    pipSlide: {
      ground: true, openHands: 'front', openRange: [2, 4],
      wind: { bodyX: -1, bodyY: 4, lean: 2, headY: 1, headTurn: 8, fistX: -3,
        fistY: 1, leftX: -2, rightX: 2, kneeOut: 3 },
      hit: { bodyX: 4, bodyY: 6, torsoTurn: -16, headX: 2, headY: 2, headTurn: 4,
        leftX: -6, rightX: 11, rightFootTurn: -6, fistX: 4, fistY: 5, rearX: -8,
        rearY: -4, kneeOut: 3, scarf: -3 },
      beat: { torsoTurn: 6, rightX: 1, fistY: -2 },
      follow: { bodyX: 1, bodyY: -2, headY: -1, headTurn: -12, torsoTurn: -4,
        fistX: 4, fistY: -14, fistTurn: -28, rearX: -3, rearY: -3, leftX: -2, leftY: -2,
        rightX: 5, ear: 4 },
    },
    pipSlideDive: {
      openHands: 'both', openRange: [1, 6], roll: [4, 9, 17, 25, 28, 18, 5, 0],
      wind: { bodyY: -1, headTurn: 16, fistY: -5, rearY: -5, leftX: 4, leftY: -7, rightY: -8 },
      hit: { bodyX: 2, headTurn: 18, torsoTurn: 9, fistX: 10, fistY: 12, fistTurn: 39,
        rearX: 8, rearY: 9, rearTurn: 43, leftX: -4, leftY: -8, rightX: -1, rightY: -7, tailLift: -2 },
      beat: { fistY: 2, rearX: 1, headTurn: 3 },
      follow: { torsoTurn: 6, headTurn: 8, fistX: 6, fistY: 6, rearX: 4, rearY: 3, leftY: -5, rightY: -4 },
    },

    brisketClinch: {
      ground: true, openHands: 'both', openRange: [0, 5],
      wind: { bodyY: 3, lean: 1, headX: 1, headTurn: 8, fistX: 3, fistY: 2, rearX: 5,
        rearY: -1, leftX: -2, rightX: 3, kneeOut: 3 },
      hit: { bodyX: 3, bodyY: 3, lean: 3, headY: 1, headTurn: 9, torsoTurn: 7, fistX: 10,
        fistY: 3, fistTurn: -16, rearX: 12, rearY: 0, rearTurn: -22, leftX: -2, rightX: 4, kneeOut: 3 },
      beat: { bodyX: -1, bodyY: -5, lean: -4, headY: -2, headTurn: -27, torsoTurn: -17,
        fistX: 1, fistY: -19, fistTurn: -35, rearX: -3, rearY: -17, rearTurn: -28, shoulderY: -2 },
      follow: { bodyX: 1, bodyY: -1, torsoTurn: -12, headTurn: -17, fistX: 6, fistY: -15,
        fistTurn: -40, rearX: 5, rearY: -12, leftX: -2, rightX: 3 },
    },
    brisketCharge: {
      base: 'heavy', ground: true,
      wind: { bodyX: -1, bodyY: 1, kneeOut: 1, rearY: -1 },
      hit: { bodyX: 2, lean: 2, headX: 2, headY: 1, headTurn: 1, fistX: -4, fistY: -1,
        rearX: -2, leftX: -2, leftY: -2, rightX: 1 },
      beat: { headY: -1, leftY: 1, rightY: -1, scarf: 1 },
      follow: { torsoTurn: -2, headY: -1, rightX: 2, leftY: 1 },
    },
    brisketCannon: {
      floorWind: true, holdWind: true,
      wind: { bodyY: 6, lean: -1, headY: 2, headTurn: -8, torsoTurn: -4, fistX: -4,
        fistY: -2, rearX: 1, rearY: -1, leftX: -2, rightX: 3, kneeOut: 5, ear: 2 },
      hit: { bodyY: -4, headX: -1, headY: -3, headTurn: -24, torsoTurn: -6, shoulderY: -3,
        fistX: 2, fistY: -19, fistTurn: -65, rearX: -2, rearY: -7, leftX: 4, leftY: 4,
        rightX: -2, rightY: 2, leftFootTurn: 28, rightFootTurn: 19, wholeY: -2 },
      beat: { fistX: -1, fistY: -1, rearY: -2, leftY: 1, rightX: 1 },
      follow: { bodyY: -2, headY: -1, headTurn: -17, torsoTurn: -4, fistX: 1, fistY: -13,
        rearY: -3, leftX: 3, leftY: 2, rightX: -1, rightY: -3 },
    },
    brisketBrace: {
      ground: true, holdWind: true, crossedGuard: true,
      wind: { bodyY: 2, torsoTurn: -5, headTurn: 4, fistX: -1, fistY: -4, rearX: 2,
        rearY: -2, leftX: -2, rightX: 3, kneeOut: 2 },
      hit: { bodyX: -1, bodyY: 4, lean: -2, headX: -1, headY: 1, headTurn: 13,
        torsoTurn: -7, fistX: -6, fistY: -7, fistTurn: -31, rearX: 5, rearY: 0,
        rearTurn: 20, leftX: -5, rightX: 6, kneeOut: 4 },
      beat: { bodyY: -1, headTurn: -2, ear: 1, kneeOut: -1 },
      follow: { bodyY: 3, lean: -1, headTurn: 6, fistX: -4, fistY: -5, fistTurn: -20,
        rearX: 3, rearY: -1, leftX: -4, rightX: 5, kneeOut: 3 },
    },
    brisketRiposte: {
      ground: true, primed: true, openHands: 'front', openRange: [2, 5],
      wind: { bodyX: -1, bodyY: 4, lean: -2, torsoTurn: -7, headTurn: 10, fistX: -6,
        fistY: -7, rearX: 5, leftX: -5, rightX: 6, kneeOut: 4 },
      hit: { bodyX: 5, bodyY: 1, lean: 4, torsoTurn: 12, headX: 1, headTurn: -3,
        fistX: 19, fistY: -5, fistTurn: -8, rearX: -5, rearY: -6, leftX: -4, rightX: 5 },
      beat: { fistX: 2, headTurn: 4, ear: -2 },
      follow: { bodyX: 3, bodyY: 2, torsoTurn: 8, fistX: 10, fistY: -1, rearY: -5, leftX: -3, rightX: 4 },
    },

    noodleTug: {
      ground: true, item: 'rope', itemAngles: [-43, -62, -29, 0, 3, 8, 13, 5],
      wind: { bodyX: -2, bodyY: 2, torsoTurn: -10, headTurn: -5, fistX: -7, fistY: -4,
        rearX: 2, rearY: -2, leftX: -1, rightX: 2 },
      hit: { bodyX: 3, lean: 3, torsoTurn: 9, headX: 1, headTurn: 4, fistX: 18,
        fistY: -4, rearX: 1, rearY: -3, leftX: -2, rightX: 3 },
      beat: { bodyX: -4, torsoTurn: -13, fistX: -9, rearX: 3, rearY: 2, ear: 3 },
      follow: { bodyX: -4, bodyY: 2, torsoTurn: -15, headTurn: -5, fistX: -1,
        fistY: -3, rearX: 4, rearY: -2, leftX: -3, rightX: 5, kneeOut: 2 },
    },
    noodleSling: {
      item: 'rope', itemAngles: [-40, -60, -22, -5, -1, 1, 6, 7],
      roll: [0, 0, -2, -6, -3, 2, 1, 0], floorWind: true,
      wind: { bodyX: -3, bodyY: 3, torsoTurn: -10, headTurn: -9, fistX: -5, fistY: -3,
        rearX: 1, rearY: 1, kneeOut: 3 },
      hit: { bodyX: 4, bodyY: -2, lean: 4, torsoTurn: 16, headX: 2, headTurn: -10,
        fistX: 17, fistY: -6, rearX: 10, rearY: -6, leftX: -8, leftY: -6,
        rightX: -3, rightY: -4, leftFootTurn: 22 },
      beat: { bodyX: 2, fistX: -1, headTurn: 3, rightX: -3, rightY: -2, wholeY: -1 },
      follow: { bodyX: 3, bodyY: -1, torsoTurn: 9, headTurn: -3, fistX: 9,
        fistY: -3, rearX: 6, rearY: -5, leftX: -4, leftY: -5, rightY: -4 },
    },
    noodleLasso: {
      item: 'rope', itemAngles: [13, -13, -30, -47, -53, -57, -45, -29], floorWind: true,
      wind: { bodyY: 2, headTurn: -11, torsoTurn: -5, fistX: -3, fistY: 0, rearX: 2,
        rearY: 1, leftX: 1, kneeOut: 3 },
      hit: { bodyX: 1, bodyY: -2, headX: -2, headTurn: -23, torsoTurn: -6, shoulderY: -2,
        fistX: 12, fistY: -15, fistTurn: -37, rearX: 12, rearY: -9, rearTurn: -32,
        leftX: 1, leftY: -3, rightX: -2, rightY: -6 },
      beat: { fistX: -3, fistY: -3, rearX: -1, rearY: -4, torsoTurn: -3, ear: 4 },
      follow: { bodyX: -1, headTurn: -18, torsoTurn: -11, fistX: 6, fistY: -14,
        rearX: 6, rearY: -10, leftX: -2, leftY: 1, rightX: -4, rightY: -2 },
      rest: { headTurn: -8, fistX: 2, fistY: -5, rearY: -3 },
    },
    noodleTripLine: {
      ground: true, item: 'rope', itemAngles: [-17, -19, -4, -6, -3, 6, 12, 5],
      wind: { bodyY: 3, headTurn: 11, torsoTurn: 7, fistX: -4, fistY: 1, rearX: -2, leftX: -1, kneeOut: 2 },
      hit: { bodyX: 2, bodyY: 5, headY: 2, headTurn: 24, torsoTurn: 11, fistX: 9,
        fistY: 5, rearX: 3, rearY: 2, leftX: -3, rightX: 5, kneeOut: 4 },
      beat: { headTurn: -4, fistX: 4, rearX: 4, fistY: 1 },
      follow: { bodyY: 3, headTurn: 14, torsoTurn: 5, fistX: 5, fistY: 2, rearX: -1, rightX: 3, kneeOut: 2 },
    },
    noodleReelLedge: {
      item: 'rope', itemAngles: [-43, -48, -53, -58, -61, -52, -46, -42],
      primed: true, roll: [-4, -7, -9, -12, -9, -7, -5, -3],
      wind: { bodyX: -1, headTurn: -15, fistX: 8, fistY: -12, rearX: 8, rearY: -9, leftY: -2, rightY: -4 },
      hit: { bodyX: -2, bodyY: 1, headX: 0, headTurn: -19, torsoTurn: -9, shoulderY: -2,
        fistX: 9, fistY: -18, fistTurn: -44, rearX: 8, rearY: -12, rearTurn: -36,
        leftX: -3, leftY: 5, rightX: -6, rightY: 2, leftFootTurn: 22, rightFootTurn: 15 },
      beat: { bodyY: -1, fistY: 3, rearY: 2, leftX: 2, rightY: -1 },
      follow: { bodyX: -1, headTurn: -17, fistX: 5, fistY: -11, rearX: 5, rearY: -8,
        leftX: -2, leftY: 1, rightX: -4, rightY: -2 },
      rest: { headTurn: -12, fistX: 6, fistY: -9, rearX: 5, rearY: -6, leftX: -1, rightX: -2 },
    },

    cloverRound: {
      ground: true, item: 'disc', releases: true, itemAngles: [-32, -55, -24, 0, 4, 11, 8, 0],
      openHands: 'front', openRange: [3, 5],
      wind: { bodyX: -3, bodyY: 2, headTurn: -7, torsoTurn: -13, fistX: -8, fistY: -3,
        rearX: 1, rearY: -5, leftX: -2 },
      hit: { bodyX: 3, lean: 3, headX: 1, headTurn: -6, torsoTurn: 12, fistX: 14,
        fistY: -7, fistTurn: -19, rearX: -9, rearY: 2, leftX: -2, rightX: 4 },
      beat: { fistX: 2, fistY: 2, torsoTurn: 4, headTurn: 4 },
      follow: { bodyX: 2, bodyY: 1, headTurn: 5, torsoTurn: 15, fistX: 7,
        fistY: 2, fistTurn: 24, rearX: -5, rearY: -3, rightX: 3 },
    },
    cloverChase: {
      emptyGear: true, openHands: 'front', openRange: [1, 4], floorWind: true,
      roll: [0, 0, -1, -8, -4, 5, 2, 0],
      wind: { bodyX: -1, bodyY: 3, headTurn: -8, fistX: 3, fistY: -2, kneeOut: 3 },
      hit: { bodyX: 4, bodyY: -2, lean: 3, headTurn: -7, torsoTurn: 11, fistX: 16, fistY: -7,
        fistTurn: -17, rearX: -7, rearY: 3, leftX: -7, leftY: -7, leftFootTurn: 24,
        rightX: -1, rightY: -5 },
      beat: { fistX: 2, headTurn: 4, rearX: 3, rightY: -2 },
      follow: { bodyX: 2, torsoTurn: 5, fistX: 1, fistY: -4, rearX: 3, rearY: -5,
        leftX: -2, leftY: -4, rightX: 1, rightY: -4 },
    },
    cloverSail: {
      sail: true, openHands: 'both', openRange: [1, 6], primed: true,
      wind: { bodyY: 4, torsoTurn: 6, headTurn: -7, fistX: 1, fistY: 0,
        rearX: -7, rearY: 2, leftX: -1, rightX: 2, kneeOut: 3 },
      hit: { bodyY: -1, lean: 1, headX: 1, headTurn: -12, torsoTurn: 7, fistX: 12,
        fistY: 1, fistTurn: -14, rearX: -26, rearY: 1, rearTurn: -14, leftX: -1, rightX: 2, kneeOut: 1 },
      beat: { bodyY: 2, torsoTurn: -8, headTurn: 4, fistY: 2, rearY: -2, kneeOut: 2 },
      follow: { bodyY: 3, headTurn: -6, torsoTurn: -4, fistX: 7, fistY: 1,
        rearX: -18, rearY: -3, leftX: -1, rightX: 2, kneeOut: 3 },
      rest: { bodyY: 2, fistX: 3, rearX: -8, headTurn: -4, leftX: -1, rightX: 2, kneeOut: 2 },
    },
    cloverServe: {
      ground: true, item: 'disc', releases: true, itemAngles: [23, 43, 17, 35, 42, 33, 13, 0],
      openHands: 'front', openRange: [3, 5],
      wind: { bodyX: -2, bodyY: 2, headTurn: 9, torsoTurn: -8, fistX: -7,
        fistY: -7, rearX: 2, rearY: -3, leftX: -1 },
      hit: { bodyX: 3, bodyY: 3, lean: 3, headX: 1, headTurn: 16, torsoTurn: 12,
        fistX: 13, fistY: 6, fistTurn: 39, rearX: -8, rearY: -7, leftX: -2, rightX: 4, kneeOut: 2 },
      beat: { fistX: 2, torsoTurn: 4, fistTurn: 11, ear: 2 },
      follow: { bodyX: 2, bodyY: 2, torsoTurn: 7, headTurn: 9, fistX: 6,
        fistY: 3, fistTurn: 18, rearX: -4, leftX: -1, rightX: 3 },
    },
  };

  const specials = { pip: 'pounce', brisket: 'shoulder', noodle: 'cast', clover: 'disc' };
  const torsoAngles = {
    attack: [-4, 1, 7, 5, 1, 0],
    jab2: [7, 2, -8, -4, 1, 0],
    finisher: [-19, -4, 19, 26, 9, 0],
    heavy: [-15, -2, 13, 18, 8, 0],
    upper: [6, 0, -10, -7, -4, 0],
    low: [-5, 2, 10, 11, 4, 0],
    airAttack: [-7, -9, -16, -10, -5, 0],
    spike: [-9, 3, 19, 13, 5, 0],
    pounce: [-4, 2, 12, 10, 3, 0],
    shoulder: [-9, 3, 14, 13, 4, 0],
    disc: [-12, -4, 9, 14, 6, 0],
    cast: [-9, -2, 7, 9, 4, 0],
  };

  function isStrike(pose) {
    return pose === 'special' || Object.prototype.hasOwnProperty.call(strikes, pose);
  }

  function strikeStance(s, breed, pose, frame) {
    let key = pose;
    if (pose === 'special') key = specials[breed];
    if (pose === 'heavy' && breed === 'brisket') key = 'shoulder';
    const [wind, contact, follow] = strikes[key];
    const from = [wind, wind, contact, follow, follow, {}][frame];
    const to = [wind, contact, contact, follow, {}, {}][frame];
    const mix = [0, 0.6, 0, 0, 0.58, 0][frame];
    for (const field of new Set([...Object.keys(from), ...Object.keys(to)])) {
      s[field] = Math.round((from[field] || 0) * (1 - mix) + (to[field] || 0) * mix);
    }
    const trail = [1, -1, -3, -4, 2, 1][frame];
    s.torsoTurn = torsoAngles[key][frame];
    s.ear = trail * (breed === 'noodle' ? 2 : 1);
    s.tail = trail;
    s.tailLift = frame === 2 ? -1 : 0;
    s.scarf = -trail;
    s.charmTurn = [8, -8, -22, -32, 12, 3][frame];
    s.reverseArm = pose === 'jab2' && frame < 5;
    s.kickFront = pose === 'airAttack';
    s.guardFloor = pose === 'low' || key === 'shoulder';
    s.powerArm = frame === 1 || frame === 2 || frame === 3;
    s.showSole = pose === 'airAttack' && s.powerArm;
    if (pose === 'upper') s.shoulderY = [0, -1, -3, -2, -1, 0][frame];
    if (pose === 'spike') {
      s.shoulderY = [-1, 0, 3, 2, 1, 0][frame];
      if (breed === 'brisket' && s.powerArm) {
        s.rearX = s.fistX - 3;
        s.rearY = s.fistY + 2;
        s.rearTurn = s.fistTurn - 10;
      }
    }
    s.hideCharm = (key === 'cast' || key === 'disc') && frame >= 2 && frame <= 4;
    if (key === 'disc' && frame < 2) s.palmCharm = true;
    if ((pose === 'airAttack' || pose === 'spike') && frame > 3) {
      s.leftY -= 2;
      s.rightX += 2;
      s.fistY -= 2;
    }
  }

  function kitStance(s, name, pose, frame) {
    const move = kitMoves[pose];
    if (move.base) strikeStance(s, name, move.base, [0, 0, 1, 2, 2, 3, 4, 5][frame]);
    const addKey = (key, amount) => {
      if (!key) return;
      for (const [part, offset] of Object.entries(key)) s[part] += Math.round(offset * amount);
    };
    if (frame < 2) addKey(move.wind, frame === 0 && !move.primed ? 0.65 : 1);
    else if (frame === 2) {
      addKey(move.wind, move.holdWind ? 1 : 0.38);
      if (!move.holdWind) addKey(move.hit, 0.62);
    } else if (frame < 5) {
      addKey(move.hit, 1);
      if (frame === 4) addKey(move.beat, 1);
    } else if (frame < 7) addKey(move.follow, frame === 5 ? 1 : 0.43);
    else addKey(move.rest, 1);
    s.guardFloor = !!(move.ground || move.sail || (move.floorWind && (frame < 2 || (move.holdWind && frame === 2))));
    if (!move.ground && !move.sail && frame >= 6) {
      s.leftY -= 3;
      s.rightY -= 2;
      s.fistY -= 2;
    }
    const driving = frame >= 2 && frame <= 5;
    if (!move.base) {
      const drag = [1, 2, -1, -3, -4, -2, 2, 0][frame];
      s.ear += name === 'noodle' ? 2 * drag : drag;
      s.tail += drag;
      s.scarf -= drag;
      s.powerArm = driving && !move.sole;
    }
    s.roll = move.roll ? move.roll[frame] : 0;
    s.heldItem = move.releases && frame >= 3 ? null : move.item || null;
    s.heldAngle = move.itemAngles ? move.itemAngles[frame] : 0;
    if (move.item || move.emptyGear || move.sail) {
      s.palmCharm = false;
      s.hideCharm = true;
      if (move.item === 'backDisc') s.reverseArm = true;
    }
    if (move.openHands && frame >= move.openRange[0] && frame <= move.openRange[1]) s.openHands = move.openHands;
    if (move.bark) s.barkJaw = frame === 3 ? 2 : frame === 4 ? 1 : 0;
    if (move.bark || move.sail || move.crossedGuard || pose === 'noodleTripLine') s.powerArm = false;
    if (move.crossedGuard && frame >= 1 && frame < 7) s.reverseArm = true;
    if ((pose === 'noodleLasso' || pose === 'noodleReelLedge') && driving) {
      s.grip = true;
      s.twoHandsFront = true;
      s.powerArm = false;
    }
    if (move.sail && driving) s.twoHandsFront = true;
    s.rideDisc = !!move.sail;
    if (move.sole) {
      s.soleSide = move.sole;
      s.showSole = driving;
      s.kickFront = move.sole !== 'rear';
      s.kickRear = move.sole !== 'front';
    }
    s.glanceBack = !!move.glance && frame >= 3 && frame <= 5;
    s.extraHaunch = !!move.haunch && frame > 0 && frame < 7;
    s.bellyFirst = !!move.belly && frame >= 2 && frame < 6;
    s.tailType = move.tailType || null;
    s.kitFrame = frame;
  }

  function frameNumber(pose, time, phase) {
    const tick = (period) => Math.floor((Math.abs(time) % 1000000) * period);
    if (Object.prototype.hasOwnProperty.call(kitMoves, pose)) {
      if (phase < 0.12) return 0;
      if (phase < 0.24) return 1;
      if (phase < 0.4) return 2;
      if (phase < 0.54) return 3;
      if (phase < 0.68) return 4;
      if (phase < 0.83) return 5;
      if (phase < 0.95) return 6;
      return 7;
    }
    if (pose === 'run') return tick(12) % 6;
    if (pose === 'win') return tick(6) % 4;
    if (pose === 'idle') {
      if (tick(9) % 47 === 45) return 2;
      return tick(2.8) % 2;
    }
    if (pose === 'ledge') return tick(3) % 4;
    if (pose === 'rise') return phase < 0.2 ? 0 : 1 + (tick(10) % 3);
    if (pose === 'jump' || pose === 'fall') return phase < 0.3 ? 0 : phase < 0.72 ? 1 : 2;
    if (pose === 'hurt' || pose === 'launch') return Math.min(3, Math.floor(phase * 4));
    if (pose === 'land' || pose === 'skid') {
      if (phase < 0.12) return 0;
      if (phase < 0.34) return 1;
      if (phase < 0.56) return 2;
      if (phase < 0.76) return 3;
      if (phase < 0.9) return 4;
      return 5;
    }
    if (isStrike(pose)) {
      if (phase < 0.22) return 0;
      if (phase < 0.4) return 1;
      if (phase < 0.68) return 2;
      if (phase < 0.84) return 3;
      if (phase < 0.95) return 4;
      return 5;
    }
    return 0;
  }

  function stance(name, pose, frame) {
    const s = {
      bodyX: 0,
      bodyY: 0,
      headX: 0,
      headY: 0,
      lean: 0,
      headLean: 0,
      headTurn: 0,
      torsoTurn: 0,
      shoulderY: 0,
      powerArm: false,
      showSole: false,
      scarf: 0,
      charmTurn: 0,
      fistTurn: 0,
      rearTurn: 0,
      leftFootTurn: 0,
      rightFootTurn: 0,
      kneeOut: 0,
      frontKneeY: 0,
      guardFloor: false,
      kickFront: false,
      reverseArm: false,
      grip: false,
      palmCharm: false,
      ear: 0,
      tail: 0,
      tailLift: 0,
      leftX: 0,
      leftY: 0,
      rightX: 0,
      rightY: 0,
      fistX: 0,
      fistY: 0,
      rearX: 0,
      rearY: 0,
      eye: null,
      hideCharm: false,
      heldItem: null,
      heldAngle: 0,
      wholeY: 0,
      roll: 0,
      glanceBack: false,
      extraHaunch: false,
      bellyFirst: false,
      haunchX: 0,
      kickRear: false,
      soleSide: 'front',
      tailType: null,
      kitFrame: 0,
      barkJaw: 0,
      openHands: null,
      rideDisc: false,
      twoHandsFront: false,
    };
    if (Object.prototype.hasOwnProperty.call(kitMoves, pose)) {
      kitStance(s, name, pose, frame);
      return s;
    }
    if (isStrike(pose)) {
      strikeStance(s, name, pose, frame);
      return s;
    }
    switch (pose) {
      case 'idle':
        s.bodyY = frame === 1 ? 1 : 0;
        s.tail = frame === 1 ? 1 : 0;
        s.fistY = frame === 1 ? -1 : 0;
        if (frame === 2) s.eye = shutEyes;
        break;
      case 'run': {
        const stride = [-6, -3, 2, 6, 3, -2][frame];
        s.bodyX = 1;
        s.bodyY = [0, -1, -2, 0, -1, -2][frame];
        s.lean = 2;
        s.headLean = 1;
        s.headX = 2;
        s.tailLift = 1;
        s.tail = -2;
        s.ear = (frame % 3) - 1;
        s.leftX = stride;
        s.rightX = -stride;
        s.leftY = [0, 0, -1, -2, -4, -3][frame];
        s.rightY = [-2, -4, -3, 0, 0, -1][frame];
        s.fistX = Math.round(stride * 0.85);
        s.fistY = Math.round(stride / 2);
        s.rearX = -s.fistX;
        s.rearY = -s.fistY;
        break;
      }
      case 'jump':
        s.lean = [2, 1, -1][frame];
        s.headX = 1;
        s.headY = -1;
        s.headTurn = [-8, -3, 2][frame];
        s.torsoTurn = [5, 0, -3][frame];
        s.leftX = [-4, -5, -2][frame];
        s.leftY = [-1, -6, -5][frame];
        s.rightX = [5, 4, 2][frame];
        s.rightY = [-2, -4, -6][frame];
        s.fistX = [1, 3, 5][frame];
        s.fistY = [-8, -6, -3][frame];
        s.rearX = -2;
        s.rearY = -3;
        s.tail = [3, 2, -1][frame];
        s.ear = [2, -1, -3][frame];
        s.scarf = [3, 1, -2][frame];
        break;
      case 'fall':
        s.lean = -1;
        s.headX = -1;
        s.bodyY = -1;
        s.headTurn = [2, 5, 9][frame];
        s.torsoTurn = [-2, 0, 4][frame];
        s.leftX = [-2, 1, -3][frame];
        s.leftY = [-5, -2, 0][frame];
        s.rightX = [2, 3, 4][frame];
        s.rightY = [-6, -3, -1][frame];
        s.fistX = 5;
        s.fistY = [-3, -5, -7][frame];
        s.rearX = -5;
        s.rearY = [-3, -5, -8][frame];
        s.tail = [-1, -2, -4][frame];
        s.ear = [-3, -2, -4][frame];
        s.scarf = [-2, -4, -5][frame];
        break;
      case 'land': {
        const depth = name === 'brisket' ? 1 : 0;
        s.bodyY = [2, 5 + depth, 4 + depth, -1, 0, 0][frame];
        s.headY = [0, 2, 2, -1, -1, 0][frame];
        s.headTurn = [4, 11, 6, -6, -3, 0][frame];
        s.lean = [0, 2, 2, 0, -1, 0][frame];
        s.kneeOut = [1, 5, 3, 0, 0, 0][frame];
        s.fistX = [1, 5, 4, 2, 0, 0][frame];
        s.fistY = [0, 1, 1, -3, -1, 0][frame];
        s.rearX = [0, -5, -4, -1, 0, 0][frame];
        s.tail = [0, -3, 3, 4, -1, 0][frame];
        s.ear = [0, -2, -3, 3, 1, 0][frame];
        s.scarf = [1, -3, -2, 2, 1, 0][frame];
        s.torsoTurn = [2, 8, 5, -4, -1, 0][frame];
        s.charmTurn = [0, 16, 23, -14, -5, 0][frame];
        s.guardFloor = true;
        break;
      }
      case 'skid':
        // The lead foot stays fixed through the brake. The trailing foot catches up on release.
        s.bodyX = [-2, -3, -3, -2, -1, 0][frame];
        s.bodyY = [2, 3, 3, 2, 1, 0][frame];
        s.lean = [-4, -6, -5, -3, -1, 0][frame];
        s.headTurn = [-10, -15, -11, -6, -2, 0][frame];
        s.leftX = [-4, -4, -3, -1, 0, 0][frame];
        s.leftY = [-2, -1, 0, 0, 0, 0][frame];
        s.rightX = [5, 5, 5, 5, 3, 0][frame];
        s.kneeOut = [1, 2, 3, 2, 1, 0][frame];
        s.fistX = [5, 7, 7, 5, 2, 0][frame];
        s.fistY = [-3, -5, -5, -3, -1, 0][frame];
        s.rearX = [-6, -6, -4, -2, -1, 0][frame];
        s.tail = [3, 6, 5, 2, -1, 0][frame];
        s.ear = [2, 4, 3, 1, -1, 0][frame];
        s.scarf = [-4, -6, -4, -1, 0, 0][frame];
        s.torsoTurn = [-5, -11, -8, -5, -2, 0][frame];
        s.charmTurn = [18, 36, 31, 14, -4, 0][frame];
        s.guardFloor = true;
        break;
      case 'ledge': {
        const d = fighters[name];
        const sway = [0, 1, 0, -1][frame];
        s.bodyX = -7 + sway;
        s.bodyY = 8 + (frame === 2 ? 1 : 0);
        s.lean = -3;
        s.headX = -2;
        s.headY = 2;
        s.headTurn = -9 + sway * 2;
        s.leftX = -3 + sway;
        s.rightX = -8 + sway;
        s.leftY = 7;
        s.rightY = 5 + sway;
        s.leftFootTurn = 19 + sway * 4;
        s.rightFootTurn = 13;
        s.tail = 2 + sway;
        s.ear = sway;
        s.scarf = 2;
        s.charmTurn = -12 + sway * 7;
        s.grip = true;
        s.powerArm = true;
        s.torsoTurn = -4;
        // The game positions a hanging fighter 13 world units outside and 46 below the lip.
        s.fistX = 7 - d.pawAt[0] - s.bodyX;
        s.fistY = -23 - d.pawAt[1] - s.bodyY;
        s.rearX = 10 - (d.pawAt[0] - 2) - s.bodyX;
        s.rearY = -23 - (d.pawAt[1] - 3) - s.bodyY;
        break;
      }
      case 'rise': {
        const launching = frame === 0;
        const flutter = [0, 1, 0, -1][frame];
        s.bodyY = launching ? 2 : -2;
        s.headY = launching ? 0 : -1;
        s.headX = -1;
        s.headTurn = launching ? -11 : -25 + flutter * 2;
        s.lean = launching ? 1 : -2;
        s.fistX = launching ? 2 : 3 + flutter;
        s.fistY = launching ? -12 : -23;
        s.fistTurn = launching ? -32 : -69;
        s.rearX = -5;
        s.rearY = launching ? 0 : 5 + flutter;
        s.leftX = -2 + flutter;
        s.rightX = launching ? 1 : -2;
        s.leftY = launching ? -2 : 2 + flutter;
        s.rightY = launching ? -3 : -5 + flutter;
        s.leftFootTurn = launching ? 0 : 25;
        s.rightFootTurn = launching ? -10 : 12;
        s.tail = -3 + flutter;
        s.tailLift = 2;
        s.ear = (name === 'noodle' ? -4 : -2) + flutter;
        s.scarf = 4 + flutter;
        s.torsoTurn = launching ? -3 : -9;
        s.powerArm = true;
        s.shoulderY = launching ? -1 : -3;
        s.charmTurn = 30 + flutter * 4;
        if (name === 'pip') {
          s.rearX = 2;
          s.rearY = launching ? -5 : -15 + flutter;
          s.leftY -= 3;
        } else if (name === 'brisket') {
          s.headY -= 2;
          s.headTurn += 5;
          s.fistX += 3;
          s.fistY += 4;
          s.rearY -= 4;
        } else if (name === 'clover') {
          s.rearX -= 3;
          s.rightX += 4;
        }
        break;
      }
      case 'hurt':
      case 'launch': {
        const hard = pose === 'launch';
        s.bodyX = -2;
        s.headX = [-3, -2, -1, 0][frame];
        s.headY = [-1, -2, -1, 0][frame];
        s.headTurn = (hard ? [-19, -24, -13, -4] : [-10, -7, -2, 2])[frame];
        s.torsoTurn = (hard ? [-11, -18, -13, -5] : [-7, -5, -2, 0])[frame];
        s.lean = [-3, -2, -1, 0][frame];
        s.headLean = -2;
        s.leftX = (hard ? [1, 5, 3, -2] : [-3, -2, -1, 0])[frame];
        s.leftY = (hard ? [-3, -7, -6, -2] : [0, -1, -1, 0])[frame];
        s.rightX = (hard ? [5, 8, 5, 3] : [2, 3, 2, 1])[frame];
        s.rightY = (hard ? [-5, -10, -7, -2] : [-3, -3, -2, 0])[frame];
        s.fistX = [-3, -1, 1, 3][frame];
        s.fistY = [-8, -9, -5, -2][frame];
        s.rearX = [3, 6, 4, 1][frame];
        s.rearY = [-4, -6, -4, -2][frame];
        s.tail = [3, 1, -3, -1][frame];
        s.ear = [3, 1, -3, -1][frame];
        s.scarf = [-2, 3, 4, 1][frame];
        s.eye = hitEyes;
        break;
      }
      case 'shield':
        s.bodyY = 4;
        s.lean = -1;
        s.headY = 1;
        s.leftX = -1;
        s.rightX = 2;
        s.fistX = 3;
        s.fistY = -7;
        s.rearX = 2;
        s.rearY = -6;
        s.tail = 3;
        break;
      case 'dodge':
        s.bodyX = 2;
        s.bodyY = 6;
        s.lean = 4;
        s.headLean = 2;
        s.headX = 1;
        s.leftX = -5;
        s.rightX = 4;
        s.fistX = -5;
        s.rearX = -5;
        s.fistY = -2;
        s.tail = -3;
        s.ear = -2;
        break;
      case 'win':
        s.bodyY = frame % 2 ? 0 : -1;
        s.headY = -1;
        s.fistX = 6 + (frame % 2 ? 0 : 1);
        s.fistY = -13 - (frame % 2);
        s.rearX = -6;
        s.rearY = 1;
        s.tail = [0, 3, 0, -2][frame];
        s.eye = happyEyes;
        break;
    }
    return s;
  }

  function drawLeg(buffer, name, d, s, near) {
    const showPad = s.showSole && (s.soleSide === 'both' || near === (s.soleSide === 'front'));
    const footX = d.feet[near ? 1 : 0] + (near ? s.rightX : s.leftX);
    const footY = near ? s.rightY : s.leftY;
    const hipX = d.hip[0] + (near ? 3 : -2) + s.bodyX;
    const soleClearance = Math.max(3, Math.floor(d.legWidth / 2) + 2);
    const rawHipY = d.hip[1] + s.bodyY;
    const hipY = s.guardFloor ? Math.min(rawHipY, -soleClearance) : rawHipY;
    const kneeX = Math.round((footX + hipX) / 2) - (near ? 2 : 3) + (near ? s.kneeOut : -s.kneeOut);
    const rawKneeY = Math.round((hipY + footY - 2) / 2) + (near ? s.frontKneeY : 0);
    const kneeY = s.guardFloor ? Math.min(rawKneeY, -soleClearance) : rawKneeY;
    const ankleY = footY - soleClearance;
    link(
      buffer,
      [
        [hipX, hipY],
        [kneeX, kneeY],
        [footX, ankleY],
      ],
      showPad ? [d.legWidth + 2, d.legWidth + 1, d.legWidth] : d.legWidth,
      near ? d.legCoat : rearColors[d.legCoat] || d.legCoat,
    );
    const foot = showPad ? soles[name] : d.foot;
    turned(buffer, footX, footY - 3, 15, near ? s.rightFootTurn : s.leftFootTurn, (part) => {
      stamp(part, foot, footX - 2, footY - foot.length, 0, !near);
    });
  }

  function rotateAt(x, y, ox, oy, turn) {
    if (!turn) return [x, y];
    const a = (turn * Math.PI) / 180;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    return [ox + Math.round((x - ox) * c - (y - oy) * sn), oy + Math.round((x - ox) * sn + (y - oy) * c)];
  }

  function withTorso(d, s, x, y) {
    return rotateAt(x, y, d.hip[0] + s.bodyX, d.hip[1] + s.bodyY, s.torsoTurn);
  }

  function wrist(d, s, near) {
    const x = d.pawAt[0] + s.bodyX + (near ? s.fistX : -2 + s.rearX);
    const rawY = d.pawAt[1] + s.bodyY + (near ? s.fistY : -3 + s.rearY);
    const clearance = Math.floor((d.fistWidth + 2) / 2) + 2;
    const y = s.guardFloor ? Math.min(rawY, 3 - d.fist.length, -clearance) : rawY;
    return [x, y];
  }

  function itemAnchor(d, s, pixels) {
    if (!s.heldItem || s.heldItem === 'orbit') return null;
    const [x, y] = wrist(d, s, s.heldItem !== 'backDisc');
    const cord = s.heldItem === 'rope';
    const [tipX, tipY] = rotateAt(x + (cord ? 9 : 12), y + (cord ? 1 : -1), x + 1, y, s.heldAngle);
    const [worldX, rotatedY] = rotateAt(tipX, tipY, 0, -18, s.roll);
    const worldY = rotatedY + s.wholeY;
    // Pixel rotation can round an edge into the neighboring cell. Attach to visible ink.
    const nearby = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (const [ox, oy] of nearby) {
      const px = worldX + ox;
      const py = worldY + oy;
      if (pixels[(py + originY) * W + px + originX]) return [px * 2, py * 2];
    }
    return null;
  }

  function drawArm(buffer, name, d, s, near) {
    const [sx, sy] = withTorso(
      d,
      s,
      d.shoulder[0] + s.bodyX + s.lean + (near ? 0 : 2),
      d.shoulder[1] + s.bodyY + s.shoulderY - (near ? 0 : 2),
    );
    const [x, y] = wrist(d, s, near);
    const armClearance = Math.floor((d.fistWidth + 2) / 2) + 2;
    const elbowOffset = y < sy - 9 && !s.grip ? 3 : near ? -2 : -1;
    const elbowX = Math.round((sx + x) / 2) + elbowOffset;
    const rawElbowY = Math.round((sy + y) / 2) + (Math.abs(x - sx) > 16 ? 1 : 4);
    const elbowY = s.guardFloor ? Math.min(rawElbowY, -armClearance) : rawElbowY;
    const foreX = Math.round(elbowX + (x - elbowX) * 0.62);
    const foreY = Math.round(elbowY + (y + 1 - elbowY) * 0.62);
    link(
      buffer,
      [
        [sx, sy],
        [elbowX, elbowY],
        [foreX, foreY],
        [x - 1, y + 1],
      ],
      s.powerArm ? [d.fistWidth + 3, d.fistWidth + 1, d.fistWidth + 2, d.fistWidth] : d.fistWidth,
      near ? d.armCoat : rearColors[d.armCoat] || d.armCoat,
    );
    if (s.powerArm && (near || s.reverseArm)) {
      const highlight = { pip: 'L', brisket: 'i', noodle: 'O', clover: 'p' }[name];
      ink(buffer, foreX, foreY - 1, highlight);
      ink(buffer, foreX + Math.sign(x - elbowX), foreY - 1 + Math.sign(y - elbowY), highlight);
    }
    const handOpened = s.openHands === 'both' || s.openHands === (near ? 'front' : 'rear');
    const paw = s.grip ? ledgePaws[name] : handOpened ? spreadPaws[name] : d.fist;
    turned(buffer, x, y, 14, near ? s.fistTurn : s.rearTurn, (part) => {
      stamp(part, paw, x - 3, y - 3, 0, !near);
    });
    if (near && s.palmCharm && d.charm) {
      turned(buffer, x + 1, y + 1, 15, -15, (part) => stamp(part, d.charm[2], x - 2, y - 2));
    }
    const discHand = near ? s.heldItem === 'disc' : s.heldItem === 'backDisc';
    const ropeHand = near && s.heldItem === 'rope';
    if (discHand || ropeHand) {
      const art = discHand ? heldDisc : ropeHandle;
      turned(buffer, x + 1, y, 16, s.heldAngle, (part) => stamp(part, art, x, y - 2));
    }
  }

  function drawTail(buffer, d, s) {
    const frame = s.kitFrame;
    if (!s.tailType || frame === 0 || frame === 7) {
      stamp(buffer, d.tail, d.tailAt[0] + s.bodyX, d.tailAt[1] + s.bodyY + s.tailLift, s.tail);
      return;
    }
    const [x, y] = withTorso(d, s, -13 + s.bodyX, -11 + s.bodyY);
    let offsets;
    if (s.tailType === 'rear') {
      const reach = [11, 13, 22, 32, 34, 24, 16, 11][frame];
      const flick = [11, 14, 8, 0, -6, -9, 3, 11][frame];
      offsets = [
        [0, 0],
        [-5, -1],
        [-11, -3],
        [-Math.round(reach * 0.6), -6],
        [-Math.round(reach * 0.82), -5 - Math.round(flick / 2)],
        [-reach, -3 - flick],
      ];
    } else {
      const radius = [5, 7, 10, 14, 16, 11, 7, 5][frame];
      const curl = [3, 6, 10, 16, 21, 12, 5, 3][frame];
      offsets = [
        [0, 0],
        [-7, -4],
        [-radius, -2],
        [-radius - 1, 3],
        [-radius + 3, 8],
        [-radius + 11, 10],
        [curl - 8, 7],
        [curl - 4, 2],
      ];
    }
    const points = offsets.map(([dx, dy]) => [x + dx, y + dy]);
    const widths = points.map((point, i) => Math.max(1, Math.round(4 - (3 * i) / (points.length - 1))));
    link(buffer, points, widths, 'c');
    for (const [px, py] of points.slice(1, -1)) ink(buffer, px, py - 1, 'O');
  }

  function tumble(pixels, s) {
    if (s.roll % 360 === 0 && !s.wholeY) return pixels;
    const output = new Uint8Array(W * H);
    const cx = originX;
    const cy = originY - 18;
    const dstY = cy + s.wholeY;
    const angle = (s.roll * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const sx = cx + Math.round((x - cx) * cos + (y - dstY) * sin);
        const sy = cy + Math.round((y - dstY) * cos - (x - cx) * sin);
        if (sx >= 0 && sx < W && sy >= 0 && sy < H) output[y * W + x] = pixels[sy * W + sx];
      }
    }
    return output;
  }

  function compose(name, s) {
    const d = fighters[name];
    const buffer = new Uint8Array(W * H);
    const bodyX = d.bodyAt[0] + s.bodyX;
    const bodyY = d.bodyAt[1] + s.bodyY;
    const hipX = d.hip[0] + s.bodyX;
    const hipY = d.hip[1] + s.bodyY;
    const [neckX, neckY] = withTorso(d, s, d.headAt[0] + s.bodyX + s.lean + 10, d.headAt[1] + s.bodyY + 14);
    const headX = neckX - 10 + s.headX;
    const headY = neckY - 14 + s.headY;
    drawTail(buffer, d, s);
    if (s.extraHaunch) {
      const [x, y] = withTorso(d, s, -16 + s.bodyX + s.haunchX, -15 + s.bodyY);
      link(
        buffer,
        [
          [x - 3, y],
          [hipX - 6, hipY - 6],
          [hipX, hipY - 3],
        ],
        [7, 8, 5],
        'b',
      );
      stamp(buffer, bulldogHaunch, x - 8, y - 4, -1);
    }
    if (!s.kickRear) drawLeg(buffer, name, d, s, false);
    if (!s.reverseArm && !s.twoHandsFront) drawArm(buffer, name, d, s, false);
    if (!s.kickFront) drawLeg(buffer, name, d, s, true);
    turned(buffer, hipX, hipY, 31, s.torsoTurn, (part) => stamp(part, d.body, bodyX, bodyY, s.lean));
    if (s.bellyFirst) {
      const [x, y] = withTorso(d, s, -12 + s.bodyX, -12 + s.bodyY);
      stamp(buffer, bulldogBelly, x - 1, y, -1);
    }
    if (d.charm && !s.hideCharm && !s.palmCharm) {
      const [x, y] = withTorso(
        d,
        s,
        d.charm[0] + s.bodyX,
        d.charm[1] + (s.guardFloor ? Math.min(1, s.bodyY) : s.bodyY),
      );
      turned(buffer, x + 4, y + 2, 15, s.charmTurn, (part) => stamp(part, d.charm[2], x, y));
    }
    if (s.kickRear) drawLeg(buffer, name, d, s, false);
    if (s.kickFront) drawLeg(buffer, name, d, s, true);
    turned(buffer, hipX, hipY, 32, s.torsoTurn, (part) => {
      stamp(part, d.collar, d.collarAt[0] + s.bodyX + s.lean, d.collarAt[1] + s.bodyY, s.scarf);
    });
    turned(
      buffer,
      headX + 10,
      headY + 14,
      35,
      s.headTurn,
      (head) => {
        const ear = (piece, front) => {
          const [x, y, art] = piece;
          stamp(
            head,
            art,
            headX + x + s.headLean,
            headY + y + (front ? 0 : Math.sign(s.ear)),
            s.headLean + (front ? s.ear : 0),
          );
        };
        ear(d.ears[0], false);
        stamp(head, d.head, headX, headY, s.headLean);
        ear(d.ears[1], true);
        for (const [x, y, art] of d.eyes) {
          stamp(head, s.eye || art, headX + x + Math.round(s.headLean / 2), headY + y);
        }
        for (let i = 0; i < d.face.length; i++) {
          const [x, y, art] = d.face[i];
          stamp(head, s.barkJaw && i === 1 ? barkMouths[s.barkJaw - 1] : art, headX + x, headY + y);
        }
      },
      s.glanceBack,
    );
    if (s.twoHandsFront) drawArm(buffer, name, d, s, false);
    drawArm(buffer, name, d, s, true);
    if (s.reverseArm) drawArm(buffer, name, d, s, false);
    // A rotated outline can project its last pixel beyond an otherwise planted stance.
    if (s.guardFloor) buffer.fill(0, originY * W);
    if (s.rideDisc) {
      stamp(buffer, sailDisc, -18, 0);
      const glint = -10 + (s.kitFrame % 5) * 4;
      ink(buffer, glint, 2, 'f');
      ink(buffer, glint + 1, 2, 'f');
    }
    return tumble(buffer, s);
  }

  function getFrame(name, pose, number) {
    const key = name + '/' + pose + '/' + number;
    if (frames.has(key)) return frames.get(key);
    const s = stance(name, pose, number);
    const pixels = compose(name, s);
    let left = W,
      top = H,
      right = 0,
      bottom = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!pixels[y * W + x]) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = right - left + 1;
    canvas.height = bottom - top + 1;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    for (let sy = 0; sy < canvas.height; sy++) {
      for (let sx = 0; sx < canvas.width; sx++) {
        const inkIndex = pixels[(top + sy) * W + left + sx];
        if (inkIndex) image.data.set(rgba[inkIndex], (sy * canvas.width + sx) * 4);
      }
    }
    ctx.putImageData(image, 0, 0);
    const result = {
      canvas,
      x: left - originX,
      y: top - originY,
      item: itemAnchor(fighters[name], s, pixels),
    };
    frames.set(key, result);
    return result;
  }

  const names = Object.keys(fighters);
  const poses = [
    'idle',
    'run',
    'jump',
    'fall',
    'attack',
    'jab2',
    'finisher',
    'upper',
    'low',
    'airAttack',
    'spike',
    'heavy',
    'special',
    'hurt',
    'launch',
    'shield',
    'dodge',
    'land',
    'skid',
    'ledge',
    'rise',
    'win',
    ...Object.keys(kitMoves),
  ];
  function fighterName(kind) {
    const name = String(kind || '').toLowerCase();
    return names.includes(name) ? name : 'pip';
  }

  // Facing-right world coordinates relative to the same foot anchor as draw().
  function itemPoint(kind, pose, phase = 0.5) {
    const name = fighterName(kind);
    if (
      typeof pose !== 'string' ||
      !pose.startsWith(name) ||
      !Object.prototype.hasOwnProperty.call(kitMoves, pose)
    ) {
      return null;
    }
    const fraction = Number.isFinite(phase) ? Math.max(0, Math.min(1, phase)) : 0.5;
    const point = getFrame(name, pose, frameNumber(pose, 0, fraction)).item;
    return point ? point.slice() : null;
  }

  function draw(ctx, kind, x, y, options = {}) {
    const name = fighterName(kind);
    const requested = options.pose;
    const kitMatches =
      !Object.prototype.hasOwnProperty.call(kitMoves, requested) || requested.startsWith(name);
    const pose = kitMatches && poses.includes(requested) ? requested : 'idle';
    const time = Number.isFinite(options.time) ? options.time : 0;
    const phase = Number.isFinite(options.phase) ? Math.max(0, Math.min(1, options.phase)) : 0.5;
    const scale = (Number.isFinite(options.scale) ? options.scale : 1) * 2;
    const frame = getFrame(name, pose, frameNumber(pose, time, phase));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (options.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(
      frame.canvas,
      frame.x * scale,
      frame.y * scale,
      frame.canvas.width * scale,
      frame.canvas.height * scale,
    );
    ctx.restore();
  }

  function portrait(kind) {
    const name = fighterName(kind);
    if (portraits.has(name)) return portraits.get(name);
    const frame = getFrame(name, 'idle', 0);
    const [left, top, width, height] = fighters[name].portrait;
    const zoom = 4;
    const canvas = document.createElement('canvas');
    canvas.width = width * zoom;
    canvas.height = height * zoom;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      frame.canvas,
      (frame.x - left) * zoom,
      (frame.y - top) * zoom,
      frame.canvas.width * zoom,
      frame.canvas.height * zoom,
    );
    const url = canvas.toDataURL('image/png');
    portraits.set(name, url);
    return url;
  }

  window.DogArt = Object.freeze({ draw, portrait, itemPoint });
})();
