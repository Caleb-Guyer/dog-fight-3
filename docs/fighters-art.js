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
  function makeTable(overrides = {}) {
    const rgba = new Uint8Array(colors.length * 4);
    colors.forEach((color,i) => {
      if (i === 0) return;
      const rgb = Number.parseInt((overrides[color] || palette[color]).slice(1), 16);
      rgba.set([rgb >>> 16, (rgb >>> 8) & 255, rgb & 255, 255], 4*i);
    });
    // Read the RGBA bytes as native words so writing a coat takes one store per pixel.
    return new Uint32Array(rgba.buffer);
  }
  const coats = {
    pip: [
      ['Honey patch'], ['Tuxedo',{L:'#555565',l:'#41404c',H:'#84808a',C:'#302c36',c:'#38323f',R:'#67b4ac',r:'#3c7f81'}],
      ['Copper',{L:'#c4613f',l:'#a34e38',H:'#e79358',C:'#643a35',c:'#814034',W:'#f3d0a0',w:'#d5a279',R:'#5e88a9',r:'#455877'}],
      ['Bluebell',{L:'#91a5bd',l:'#697894',H:'#c5d7dc',C:'#4d4861',c:'#555974',R:'#e3af52',r:'#9c703a'}],
    ],
    brisket: [
      ['Blue steel'], ['Biscuit',{B:'#d6ac71',b:'#9b7755',i:'#e6c698',I:'#f8dcb0',L:'#559a92',l:'#3e686e',H:'#94c7ac'}],
      ['Brick red',{B:'#b16350',b:'#834842',i:'#c78360',I:'#dfa984',L:'#81b2c4',l:'#4c7990',H:'#bed5d7'}],
      ['Night shift',{B:'#4a4559',b:'#383646',i:'#635b70',I:'#887c8f',W:'#d7c6b9',w:'#afa0a1',L:'#ec895a',l:'#a6534a'}],
    ],
    noodle: [
      ['Cinnamon'], ['Shortbread',{C:'#8b7359',c:'#c4a17a',O:'#e5c28f',l:'#ddbd95',L:'#f1d7aa',H:'#ffe6be',T:'#73759e',t:'#505477',J:'#b0a6c6'}],
      ['Black and tan',{C:'#35303e',c:'#494459',O:'#686572',l:'#a9734e',L:'#d39a62',T:'#be6758',t:'#85474e',J:'#e9a980'}],
      ['Chestnut',{C:'#5b3943',c:'#874753',O:'#aa5c58',l:'#c4826a',L:'#e0ac83',T:'#7098b2',t:'#4b657e',J:'#a8c9d0'}],
    ],
    clover: [
      ['Blackberry'], ['Red collie',{k:'#925642',p:'#b17150',P:'#775044',F:'#d29668',f:'#f2c999',w:'#dfbfa3'}],
      ['Silver',{k:'#7a8699',p:'#909eae',P:'#606b85',F:'#4a7a91',f:'#a2cbd1',W:'#f2edf0',w:'#c9ced7'}],
      ['Sandpiper',{k:'#bf9c69',p:'#a78057',P:'#715744',F:'#708e78',f:'#b3c7a3',W:'#fae5af',w:'#dcc08c'}],
    ],
  };
  const coatNames = Object.fromEntries(Object.entries(coats).map(([kind,styles])=>[kind,styles.map(s=>s[0])]));
  const colorTables = Object.fromEntries(Object.entries(coats).map(([kind,styles])=>[kind,styles.map(s=>makeTable(s[1]))]));

  // A dot is transparent. Leading dots position clusters within the drawn tile.
  const tile = drawing => drawing.trim().split(/\s+/).map(row=>Uint8Array.from(row,code=>index[code]));
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
  const bodyScratch = new Uint8Array(W * H), tumbleScratch = new Uint8Array(W * H);

  function ink(buffer, x, y, code) {
    x += originX;
    y += originY;
    if (x >= 0 && y >= 0 && x < W && y < H) buffer[y * W + x] = index[code];
  }

  // Shift entire pixel rows by integer steps to lean a head or a torso during a strike.
  function stamp(buffer, art, x, y, lean = 0, backShade = false) {
    const height = art.length;
    x += originX;
    y += originY;
    for (let row = 0; row < height; row++) {
      const py = y + row;
      if (py < 0 || py >= H) continue;
      const left = x + Math.round(lean * (1 - row / Math.max(1, height - 1)));
      const run = art[row];
      const start = Math.max(0,-left), end = Math.min(run.length,W-left), base = py*W+left;
      for (let col = start; col < end; col++) {
        const color = run[col];
        if (color) buffer[base+col] = backShade ? rearInk[color] : color;
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
  const rearInk = Uint8Array.from(colors,color=>index[rearColors[color] || color]);

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
      const left=x-radius+originX, top=y-radius+originY;
      for (let dy=Math.max(0,-top); dy<diameter && top+dy<H; dy++) {
        const inset=diameter>3 && (dy===0 || dy===diameter-1)?1:0;
        const row=(top+dy)*W, end=row+Math.min(W,left+diameter-inset);
        for(let p=row+Math.max(0,left+inset);p<end;p++)buffer[p]=color;
      }
    };
    const thickness = Array.isArray(width) ? width : points.map(() => width);
    for (const border of [2, 0]) {
      const color = index[border ? '#' : fill];
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
  // Slim side profiles keep the fingertips flat against a vertical surface.
  const wallPaws = {
    pip: tile(`..## .#W# #wW# #WW# .cW# .wW# ..##`),
    brisket: tile(`...## ..#W# .#iW# #wWW# #WbW# .#wW# ..#w# ...##`),
    noodle: tile(`..## .#L# #lL# #LL# .cL# .lL# ..##`),
    clover: tile(`..## .#W# #wW# #WW# .pW# .wW# ..##`),
  };
  const wallShoulders = {
    pip: tile(`..###. .#lLL# #lLLL# #LLWW# #llww# .#cll# ..###.`),
    brisket: tile(`..####. .#iIii# #iIIIi# #iiIBB# #iBBbb# .#Bbbb# ..####.`),
    noodle: tile(`..###. .#cLO# #cOOO# #OOOL# #cOOl# .#Ccc# ..###.`),
    clover: tile(`..###. .#kpP# #kppp# #ppWW# #kpww# .#kkp# ..###.`),
  };
  // Raised pads face the incoming blow, with a dark gap between the outer claws.
  const parryPaws = {
    pip: tile(`..##.##.. .#WW#WW#. .#Ww#WW## #WWWWwWWW# #WcWWcWWw# .#WcccWW#. .#Wcccw#.. ..#www#... ...###....`),
    brisket: tile(`..###.###.. .#iWW#WWW#. .#WWW#WwW## #wWWWwWWWWW# #WWbWWWbWWw# .#WWbbbWWW#. .#iWbbbwW#.. ..#iwwwW#... ...#####....`),
    noodle: tile(`..##.##.. .#LL#LL#. .#Ll#LL## #LLLLlLLL# #LcLLcLLl# .#LcccLL#. .#Lcccl#.. ..#lll#... ...###....`),
  };
  // A curled paw leaves a notch between its claw and thumb where a collar or rim sits.
  const claspPaws = {
    pip: tile(`...####. ..#wWWw# .#WWW### #wWW#... #WWww.## .#wWW#w# ..#www#. ...###..`),
    brisket: tile(`....#####. ..##iWWWw# .#wWWWW### #wWWWW#... #iWWWw..## .#wWWW##W# ..#wwwww#. ...#####..`),
    noodle: tile(`...####. ..#lLLl# .#LLL### #lLL#... #LLll.## .#lLL#l# ..#lll#. ...###..`),
    clover: tile(`...#####. ..#wWWWw# .#WWWW### #wWWW#... #WWWw..## .#wwW##W# ..#wwww#. ...####..`),
  };
  const startledEyes = tile(`.###. #WWW# #W#W# .#W#. ..#..`);
  const impactPaws = {
    flick: tile(`
      .....##..
      ....#WW#.
      ....#wW#.
      ..###WW#.
      .#WWWWw#.
      #WWcWw#..
      .#Wccw#..
      ..#ww#...
      ...##....
    `),
    rake: tile(`
      ........###..
      ....####WW#..
      ..##wWWW###..
      .#WWWWwwWWW#.
      #WcWWW#####..
      .#WccwwwWW#..
      ..#www####...
      ...###.......
    `),
    knuckle: tile(`
      .....######...
      ...##iWwWWw##.
      ..#iWWWW#WWWw#
      .#iWWWwWWWWWw#
      #biiWWWW#WWWw#
      .#biiwwWWwwWw#
      ..###iwwwWWw#.
      .....#######..
    `),
    stamp: tile(`
      ....####....
      ...#iIII#...
      ..#iwwwww#..
      .#bwwwWWWw#.
      #iwwWWWWWWw#
      #wWW#WW#WWw#
      #WWw#WW#wWW#
      .###.##.###.
    `),
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
  const rushingShoulder = tile(`
    ............######.....
    ..........##BiiIii##...
    .......###bBBiIIIIii#..
    .....##bBBBBiiIiiBBii#.
    ...##bbbBBBBiiiiBBBBiI#
    ..#bbbBBBBBBiiBBBBBBBi#
    ..bbBBBBBBBBBBBBBBBBBb#
    .bbBBBBBBBBBbbBBBBbbb#.
    bbBBBBBBBBBbbBBBbbww#..
    bbBBBBBBBBbbbiwwwWw#...
    bbBBBBBBbbbiwwwWWw#....
    .bbBBBBbbbiwwwWWw#.....
    ..bbBBBbiiwwWWWw#......
    ...bbbBbwwwww##........
    ....#bbbww##...........
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

  // Side-lying torsos keep the rump, chest markings, and tail readable at floor height.
  const restingBodies = {
    pip: {
      at: [-23, -12], collar: [8, 7], tailAt: [-31, -11],
      coat: tile(`
        .......#############......
        ....###cLLLLLLLwWWWW##....
        ..##clLHHHLLLLlwWWWWWW#...
        .#clLLLLLLLlllwwWWWWWWW#..
        #clLLLLLlllllcwwWWWWWWw#..
        #clLLlllccccccwWWWWWWw#...
        #cclllllcccCccwwWWWww#....
        .#ccccccCCcccCwWWwww#.....
        ..##cccccccCccwwww##......
        ....##############........
      `),
      tail: tile(`..###........ .#WWw##...... #WwwLll##.... .###clLLl###. ....##clLllC# ......######.`),
    },
    brisket: {
      at: [-23, -13], collar: [7, 7], tailAt: [-29, -12],
      coat: tile(`
        .......################.....
        ....###bBBBiiIIiiiBBBww##...
        ..##bBBBiiiIIIIiiBBwwwWWw#..
        .#bBBBIIIIIiiiBBiwwWWWWWWw#.
        #bBBBiiiiiiBBBBiwwWWWWWWWWw#
        #bBBBBBBBBBBBBBiwwWWWWWWWWw#
        #bbBBBBBBBBBBbiwwWWWWWWWWw#.
        #bbbBBBBbbbBbiwwWWWWWWwww#..
        .#bbbbbbbbbbiwwWWWWWWww##...
        ..##bbbbbbiwwwwWWwwww##.....
        ....#################.......
      `),
      tail: tile(`..#####.. .#iBBIi#. #bBI#BI#. #bbBBb#.. .#bbbBB#. ..#####..`),
    },
    noodle: {
      at: [-25, -11], collar: [6, 6], tailAt: [-36, -10],
      coat: tile(`
        .......##################........
        ....###cOOOOOllOOOOOllLLl##......
        ..##cOOOllllOOOOOllllLLLll#......
        .#cOOOlllOOOOOlllllllLLLLLl#.....
        #ccOOOOOOccccccccccllLLLLLl#.....
        #cccOOccccCCCCcccclllLLLLl#......
        .#ccccccccCCCCCcccllLLLll#.......
        ..##CcccccccCCcccccclll##........
        ....###################..........
      `),
      tail: tile(`###............. #cO##........... .##OO###........ ...##ccO####.... .....###ccOO###. ........###cccC# ...........####.`),
    },
    clover: {
      at: [-24, -13], collar: [8, 7], tailAt: [-38, -12],
      coat: tile(`
        .......##############......
        ....###kkkkppppkkWWwW##....
        ..##kkkppppppkkkWWwWWWw#...
        .#kkkppppppkkkkWWWWWWWWw#..
        #kkppppkkkkkkkWwWWWWWWWW#..
        #kkkkkkkkkkkkkkwWWWWWWWw#..
        .#kkkkkkkk##kkkwwWWWWWw#...
        ..##kkkk##kkkwwWWWWwww#....
        ...#kk##kkkkkwwWWwww##.....
        ....################.......
      `),
      tail: tile(`....####............ ..##WWww###......... .#WWWwwwppp###...... #WWWwwpppkpppp###... .#wwpkkpppkkkkppp##. ..##kkkppkkkkkkkkkk# ....###kkkkkkkkk###. .......#########....`),
    },
  };
  const tuckedTails = {
    pip: tile(`....###.. ..##wWW#. .#lLLw##. #clL###.. #clLL##.. .#clLll#. ..######.`),
    brisket: tile(`...####.. .##iBBi#. #bBI#Bi# #bbBBb#. .#bbbb#. ..#####.`),
    noodle: tile(`....#####. ..##cOOOC# .#cO##CC#. #cO#..##.. #cOO##.... .#ccOO##.. ..###ccC#. .....####.`),
    clover: tile(`.....####.. ...##WWww#. ..#WWWwwp#. .#WWwpkk#.. #kppkkkk#.. #kkkppkkk#. .#kkkkkkk#. ..########.`),
  };
  const foldedEars = Object.fromEntries(Object.entries(fighters).map(([name, dog]) => [
    name, dog.ears.map(([x, y, pixels]) => {
      const height = Math.max(3, Math.round(pixels.length * 0.58));
      const rows = Array.from({ length: height }, (_, i) => pixels[Math.round(i * (pixels.length - 1) / (height - 1))]);
      return [x, y + Math.min(Math.max(0, -y), pixels.length - height), rows];
    }),
  ]));

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
    pipSpeedBag: {
      base: 'attack', ground: true,
      wind: { bodyY: 2, fistX: -5, fistY: 3, rearY: -5 },
      hit: { bodyX: 2, torsoTurn: 9, fistX: 6, fistY: 3, rearX: -6, headTurn: -5 },
      follow: { fistX: -3, fistY: -2, rearX: 4, bodyY: 1 },
    },
    pipSpeedBagCross: {
      base: 'jab2', ground: true,
      wind: { bodyY: 1, rearX: -5, fistY: -5 },
      hit: { torsoTurn: -12, rearX: 8, rearY: -3, fistX: -5, headTurn: 6 },
      follow: { rearX: -3, rearY: 1, fistX: 4, bodyY: 2 },
    },
    pipBellKick: {
      ground: true, sole: 'front',
      wind: { bodyY: 2, torsoTurn: -9, rightX: 4, rightY: -13, rearY: -6 },
      hit: { bodyX: 2, torsoTurn: -19, headTurn: 10, rightX: 21, rightY: -18, rightFootTurn: -26, fistX: -5, rearX: -9 },
      follow: { bodyX: -1, rightX: 6, rightY: -7, rightFootTurn: 12, torsoTurn: 7 },
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

    // Ground smashes keep the charged body and foot positions until the release frame.
    pipBoltKick: {
      smash: true, sole: 'front',
      wind: { bodyX: -4, bodyY: 3, torsoTurn: -12, headX: 2, headTurn: -7,
        fistX: -5, fistY: -5, rearX: 2, rearY: -2, leftX: -3, rightX: 2, kneeOut: 3, scarf: -2 },
      hit: { bodyX: 6, bodyY: -1, torsoTurn: -24, headX: 2, headTurn: 8,
        rightX: 25, rightY: -16, rightFootTurn: -17, leftX: 12, leftY: -7, leftFootTurn: -20, frontKneeY: -3,
        fistX: -6, fistY: -7, rearX: -21, rearY: 1, ear: -3, scarf: 5 },
      beat: { bodyX: 1, rightX: 3, rightY: -1, leftX: 8, leftY: -2, headTurn: 4, rearY: 2 },
      follow: { bodyX: 4, bodyY: 2, torsoTurn: 11, headTurn: 9, rightX: 13,
        rightY: -5, rightFootTurn: 21, leftX: -4, fistX: 3, fistY: -3, rearX: -7, scarf: 2 },
    },
    pipScissors: {
      smash: true, sole: 'front',
      wind: { bodyX: -1, bodyY: 4, headTurn: -12, torsoTurn: 10, fistX: 4,
        fistY: -3, rearX: -6, rearY: -2, leftX: -3, rightX: -2, kneeOut: 3 },
      hit: { bodyX: -2, bodyY: -3, torsoTurn: -26, headX: -2, headTurn: -11,
        rightX: 18, rightY: -26, rightFootTurn: -48, leftX: -2, frontKneeY: -4,
        fistX: 0, fistY: 3, rearX: -17, rearY: -2, scarf: 4 },
      beat: { rightX: -3, rightY: -4, rightFootTurn: -13, torsoTurn: -4, fistY: 2 },
      follow: { bodyX: -2, torsoTurn: -15, headTurn: -7, rightX: 13, rightY: -15,
        rightFootTurn: -13, fistX: -3, fistY: 1, rearX: -7, leftX: -2 },
    },
    pipScissorsFinish: {
      smash: true, sole: 'both', floorRoll: true,
      roll: [0, 0, 0, -102, -117, -59, -16, 0],
      openHands: 'rear', openRange: [3, 5],
      wind: { bodyX: -2, bodyY: 3, torsoTurn: -16, headX: -1, headTurn: -11,
        rightX: 2, leftX: -4, fistX: -2, fistY: 1, rearX: -9, rearY: 5, kneeOut: 3 },
      hit: { bodyY: -1, torsoTurn: 11, headX: 1, headTurn: 14, rightX: 20, rightY: -5,
        rightFootTurn: 12, leftX: 14, leftY: 6, leftFootTurn: 29, kneeOut: 2,
        fistX: -16, fistY: -2, rearX: -27, rearY: -1, rearTurn: 100, scarf: 5 },
      beat: { rightX: 3, rightY: -2, leftX: -4, leftY: 2, rearX: -1, headTurn: 4 },
      follow: { bodyY: 1, torsoTurn: 5, headTurn: 8, rightX: 10, rightY: -4,
        rightFootTurn: 11, leftX: 4, leftY: -1, rearX: -17, rearY: 3, rearTurn: 70, fistX: -8 },
    },
    pipDustDevil: {
      smash: true, sole: 'front',
      wind: { bodyX: -3, bodyY: 5, torsoTurn: -21, headX: 1, headTurn: -8, fistX: -8,
        fistY: 0, rearX: -9, rearY: -4, leftX: -3, rightX: -1, kneeOut: 4, scarf: -5 },
      hit: { bodyX: 1, bodyY: 6, torsoTurn: 18, headX: 2, headY: 1, headTurn: 13,
        rightX: 24, rightY: -1, rightFootTurn: -12, frontKneeY: -1, leftX: -4,
        fistX: -13, fistY: -2, rearX: -18, rearY: -6, scarf: 8, kneeOut: 2 },
      beat: { rightX: -2, rightY: -2, torsoTurn: 8, rearY: 4, fistY: 4, headTurn: 3 },
      follow: { bodyX: 1, bodyY: 4, torsoTurn: 15, headTurn: 11, rightX: 10,
        rightY: -2, rightFootTurn: -9, leftX: -3, fistX: -8, rearX: -8, scarf: 6 },
    },
    pipDustDevilRear: {
      smash: true, sole: 'rear', glance: true,
      wind: { bodyX: 1, bodyY: 5, torsoTurn: 20, headY: 1, headTurn: 8,
        fistX: 1, fistY: 2, rearX: -15, rearY: -5, leftX: -3, rightX: 2, kneeOut: 4, scarf: 6 },
      hit: { bodyX: -2, bodyY: 6, torsoTurn: -18, headX: -1, headTurn: -7,
        leftX: -23, leftY: -2, leftFootTurn: 169, rightX: 3, fistX: 2, fistY: -2,
        rearX: -6, rearY: -6, kneeOut: 1, scarf: -8, tailLift: -3 },
      beat: { leftX: -2, leftY: -1, leftFootTurn: 13, torsoTurn: -5, headTurn: 6, fistY: -2 },
      follow: { bodyX: -2, bodyY: 3, torsoTurn: -13, headTurn: -8, leftX: -10,
        leftY: -2, leftFootTurn: 114, rightX: 3, fistX: 2, rearX: -5, scarf: -4 },
    },

    brisketHaymaker: {
      smash: true, impactPaw: 'knuckle',
      wind: { bodyX: -4, bodyY: 3, torsoTurn: -19, headX: 2, headTurn: -4,
        fistX: -16, fistY: -4, fistTurn: -32, rearX: 3, rearY: -5, leftX: -3, rightX: 2, kneeOut: 2 },
      hit: { bodyX: 5, torsoTurn: 17, lean: 2, headX: -2, headTurn: -8, shoulderY: -2,
        fistX: 16, fistY: -7, fistTurn: -3, rearX: -9, rearY: -3, leftX: -4, rightX: 5, kneeOut: 2 },
      beat: { bodyX: 1, fistX: 2, fistY: 1, torsoTurn: 4, headTurn: 4, rearX: -3 },
      follow: { bodyX: 4, bodyY: 2, torsoTurn: 21, headTurn: 8, fistX: 7, fistY: -3,
        fistTurn: 22, rearX: -8, rearY: -4, leftX: -3, rightX: 4 },
    },
    brisketRoofRaiser: {
      smash: true,
      wind: { bodyX: -2, bodyY: 5, headX: 2, headY: 2, torsoTurn: 9, headTurn: 17,
        fistX: 3, fistY: 1, rearX: -8, rearY: 1, leftX: -2, rightX: 3, kneeOut: 4 },
      hit: { bodyX: -1, bodyY: -7, headX: 3, headY: -4, headTurn: -31, torsoTurn: -7,
        leftX: -1, rightX: 1, fistX: 1, fistY: 5, rearX: -14, rearY: 3, ear: -4, kneeOut: 1 },
      beat: { bodyY: -1, headY: -1, headTurn: -6, torsoTurn: 5, fistX: 4, rearY: 2 },
      follow: { bodyY: -2, headX: 2, headY: -1, headTurn: -17, torsoTurn: 5,
        fistX: 2, fistY: 2, rearX: -7, leftX: -2, rightX: 2, kneeOut: 2 },
    },
    brisketQuake: {
      smash: true, impactPaw: 'stamp', bothHands: true, behindHead: true,
      openHands: 'both', openRange: [0, 5],
      wind: { bodyY: 1, torsoTurn: -4, headX: 2, headY: -1, headTurn: -8, leftX: -4,
        rightX: 5, kneeOut: 3, fistX: 8, fistY: -16, fistTurn: -38, rearX: -22, rearY: -15, rearTurn: -140 },
      hit: { bodyX: -1, bodyY: 3, headX: 2, headY: 1, headTurn: 15, torsoTurn: 8, shoulderY: -3,
        fistX: 12, fistY: 11, rearX: -28, rearY: 13, leftX: -3, rightX: 3, kneeOut: 5, ear: 3 },
      beat: { torsoTurn: -3, headY: 1, fistX: 2, rearX: -2, kneeOut: 1 },
      follow: { bodyY: 4, headY: 1, headTurn: 8, torsoTurn: 3, fistX: 6, fistY: 5,
        rearX: -17, rearY: 6, leftX: -3, rightX: 4, kneeOut: 3 },
    },

    noodleLeadSnap: {
      smash: true, item: 'rope', itemAngles: [-130, -137, -135, -10, 3, 28, 15, 2],
      wind: { bodyX: -4, bodyY: 2, headX: 2, headTurn: -6, torsoTurn: -15,
        fistX: -14, fistY: -4, fistTurn: -56, rearX: 3, rearY: -3, leftX: -3, rightX: 2, kneeOut: 2 },
      hit: { bodyX: 5, bodyY: 1, lean: 3, headX: 1, headY: -2, headTurn: -11, torsoTurn: 13,
        fistX: 14, fistY: -6, fistTurn: -11, rearX: -14, rearY: -1, leftX: -3, rightX: 6, scarf: 4 },
      beat: { fistX: 2, fistY: 2, fistTurn: 9, torsoTurn: 5, headTurn: 3 },
      follow: { bodyX: 3, bodyY: 2, torsoTurn: 17, headTurn: 7, fistX: 6, fistY: -2,
        fistTurn: 21, rearX: -7, leftX: -2, rightX: 4, scarf: 3 },
    },
    noodleBellPull: {
      smash: true, item: 'rope', itemAngles: [18, 19, 21, -60, -82, -72, -34, 1],
      wind: { bodyX: 1, bodyY: 4, torsoTurn: 11, headX: 2, headTurn: 15, fistX: 7,
        fistY: 2, rearX: -3, rearY: 1, leftX: -3, rightX: 3, kneeOut: 4 },
      hit: { bodyX: -1, bodyY: -3, headX: -1, headTurn: -19, torsoTurn: -9, shoulderY: -2,
        fistX: 9, fistY: -16, fistTurn: -33, rearX: -6, rearY: 3, leftX: -3, rightX: 3, ear: -2 },
      beat: { fistX: -3, fistY: -3, headTurn: -6, torsoTurn: -4 },
      follow: { bodyX: -2, bodyY: -1, headTurn: -16, torsoTurn: -9, fistX: 2, fistY: -12,
        rearX: -4, rearY: 2, leftX: -2, rightX: 2 },
    },
    noodleBellPullFinish: {
      smash: true, item: 'rope', behindHead: true, itemAngles: [-55, -58, -61, -127, -157, -163, -95, -10],
      wind: { bodyX: -1, bodyY: 1, headX: 1, headTurn: -14, torsoTurn: -7,
        fistX: 7, fistY: -10, fistTurn: -24, rearX: -4, rearY: 1, leftX: -2, rightX: 3 },
      hit: { bodyX: -3, bodyY: -3, torsoTurn: -15, headX: 4, headTurn: -23, shoulderY: -3,
        fistX: -11, fistY: -30, fistTurn: -97, frontElbowX: -14, rearX: -10, rearY: 1, leftX: -3, rightX: 4, ear: -2 },
      beat: { fistX: -4, fistY: 1, fistTurn: -18, torsoTurn: -5, rearX: -3, headTurn: 4 },
      follow: { bodyX: -3, bodyY: 1, headX: 2, torsoTurn: -16, headTurn: -11,
        fistX: -13, fistY: -9, fistTurn: -65, rearX: -7, leftX: -2, rightX: 3 },
    },
    noodleSwitchback: {
      smash: true, item: 'rope', glance: true, glanceRange: [4, 5],
      itemAngles: [-21, -23, -26, 3, 182, 184, 123, 6],
      wind: { bodyX: -1, bodyY: 3, headTurn: -3, torsoTurn: -7, fistX: 4,
        fistY: -3, rearX: -5, rearY: -4, leftX: -2, rightX: 3, kneeOut: 3 },
      hit: { bodyX: 1, bodyY: 4, headY: 1, headTurn: 13, torsoTurn: 15, fistX: 9,
        fistY: 4, fistTurn: 9, rearX: -7, rearY: -6, leftX: -3, rightX: 5, kneeOut: 3 },
      beat: { bodyX: -4, torsoTurn: -35, headTurn: -19, fistX: -36, fistY: -2,
        fistTurn: 147, rearX: 7, rearY: 3, scarf: -7 },
      follow: { bodyX: -3, bodyY: 3, headTurn: -6, torsoTurn: -15, fistX: -21,
        fistY: 2, fistTurn: 121, rearX: 1, rearY: -4, leftX: -3, rightX: 4, kneeOut: 3 },
    },

    cloverLineDrive: {
      smash: true, item: 'disc', releases: true, itemAngles: [-162, -166, -165, 0, 5, 19, 12, 0],
      openHands: 'front', openRange: [3, 6],
      wind: { bodyX: -4, bodyY: 3, shoulderY: 1, torsoTurn: -22, headX: 2, headTurn: -4,
        fistX: -14, fistY: 1, fistTurn: -51, rearX: 2, rearY: -6, leftX: -3, rightX: 2, kneeOut: 3 },
      hit: { bodyX: 5, bodyY: 2, torsoTurn: 19, headX: -1, headTurn: -10, lean: 2,
        fistX: 8, fistY: -6, fistTurn: -4, rearX: -16, rearY: 0, leftX: -4, rightX: 6, scarf: 4 },
      beat: { bodyX: 1, fistX: 1, fistY: 2, torsoTurn: 6, headTurn: 6, rearX: -2 },
      follow: { bodyX: 4, bodyY: 3, torsoTurn: 24, headTurn: 9, fistX: 5,
        fistY: -1, fistTurn: 39, rearX: -10, leftX: -3, rightX: 4, kneeOut: 2 },
    },
    cloverHaloLift: {
      smash: true, item: 'disc', behindHead: true, itemAngles: [22, 25, 24, -17, 4, -28, -33, 0],
      wind: { bodyX: 1, bodyY: 4, headTurn: 11, torsoTurn: 11, fistX: 4,
        fistY: 0, fistTurn: 19, rearX: -4, rearY: 0, leftX: -2, rightX: 3, kneeOut: 4 },
      hit: { bodyY: -3, headX: 3, headY: 1, headTurn: -14, torsoTurn: -8, shoulderY: -3,
        fistX: -13, fistY: -32, fistTurn: -71, frontElbowX: -15, rearX: 4, rearY: -8, leftX: -1, rightX: 2 },
      beat: { fistX: -4, fistY: -1, fistTurn: -11, headTurn: -5, rearY: -3 },
      follow: { bodyX: -1, bodyY: -1, headTurn: -15, torsoTurn: -7,
        fistX: -4, fistY: -15, fistTurn: -44, rearX: 1, rearY: -4, leftX: -2, rightX: 2 },
    },
    cloverRimRattle: {
      smash: true, item: 'disc', releases: true, itemAngles: [160, 164, 162, 1, 14, 26, 20, 0],
      openHands: 'front', openRange: [3, 5],
      wind: { bodyX: -1, bodyY: 5, torsoTurn: -20, headX: 1, headTurn: -2, fistX: -16,
        fistY: 2, fistTurn: 136, rearX: 4, rearY: -3, leftX: -3, rightX: 1, kneeOut: 4 },
      hit: { bodyX: 1, bodyY: 6, headX: -1, headY: 1, headTurn: 8, torsoTurn: 15,
        fistX: 6, fistY: 4, fistTurn: 35, rearX: -17, rearY: -7, leftX: -3, rightX: 5, kneeOut: 5 },
      beat: { torsoTurn: 12, fistX: -12, fistY: 1, fistTurn: 56, rearX: 4, headTurn: 10, scarf: 5 },
      follow: { bodyX: 1, bodyY: 4, headTurn: 9, torsoTurn: 18, fistX: -9,
        fistY: 1, fistTurn: 81, rearX: -11, rearY: -3, leftX: -3, rightX: 3, kneeOut: 3 },
    },
    cloverRimRattleFinish: {
      smash: true, item: 'disc', releases: true, glance: true, itemAngles: [147, 151, 150, 8, -4, -14, -8, 0],
      openHands: 'front', openRange: [3, 6],
      wind: { bodyX: -2, bodyY: 5, headTurn: 10, torsoTurn: 18, fistX: -13,
        fistY: 1, fistTurn: 119, rearX: -9, rearY: -3, leftX: -3, rightX: 3, kneeOut: 4 },
      hit: { bodyX: -3, bodyY: 5, lean: -2, headX: 1, headTurn: -6, torsoTurn: -19,
        fistX: -27, fistY: 5, fistTurn: 165, rearX: 1, rearY: -7, leftX: -6, rightX: 5, kneeOut: 4 },
      beat: { fistX: -3, fistY: -2, fistTurn: 13, torsoTurn: -6, headTurn: 7, rearY: -2 },
      follow: { bodyX: -2, bodyY: 3, headTurn: -5, torsoTurn: -14, fistX: -16, fistY: 3,
        fistTurn: 129, rearX: -1, rearY: -4, rightX: 4, leftX: -3, kneeOut: 2 },
    },

    // Grab starts, sustained holds and releases share the same hand positions at the handoff.
    // Hold keys breathe on a closed loop with anchored ankles and a continuous grip.
    pipCollarTag: {
      ground: true, openHands: 'front', openRange: [1, 3], clasp: 'front', claspRange: [4, 5],
      wind: { bodyX: -2, bodyY: 3, headTurn: -7, torsoTurn: -8, fistX: -3, fistY: -3,
        rearX: -2, rearY: -4, leftX: -2, rightX: 1, kneeOut: 3 },
      hit: { bodyX: 3, bodyY: 1, lean: 2, headX: 1, headTurn: -10, torsoTurn: 12,
        fistX: 11, fistY: -5, fistTurn: -8, rearX: -8, rearY: 1, leftX: -3, rightX: 5 },
      beat: { bodyX: -1, fistX: -3, fistY: 2, fistTurn: 23, torsoTurn: -5, rearX: 2 },
      follow: { bodyX: 1, headTurn: -6, fistX: 5, fistY: -2, fistTurn: 13, rearX: -2, rightX: 3 },
    },
    pipCollarTagHold: {
      ground: true, clasp: 'front',
      hold: { bodyX: 1, bodyY: 1, headX: 1, headTurn: -7, torsoTurn: 3, fistX: 7,
        fistY: -8, fistTurn: 17, rearX: -3, rearY: -3, leftX: -3, rightX: 3, kneeOut: 2 },
      tug: { bodyX: -2, bodyY: 1, headTurn: -6, torsoTurn: -8, fistX: 1,
        fistY: 1, fistTurn: -6, rearX: -2, rearY: 2, kneeOut: 2, scarf: 2 },
    },
    pipKickoff: {
      ground: true, primed: true, sole: 'front', clasp: 'front', claspRange: [0, 2],
      openHands: 'front', openRange: [3, 5],
      wind: { bodyX: 1, bodyY: 1, torsoTurn: -7, headTurn: -5, fistX: 7, fistY: -4,
        rightX: -2, rightY: -6, leftX: -3, rearX: -6, rearY: -4 },
      hit: { bodyX: -1, bodyY: -2, headX: 1, headTurn: 5, torsoTurn: -19, rightX: 19,
        rightY: -12, rightFootTurn: -18, frontKneeY: -3, fistX: 5, fistY: -7, fistTurn: -23,
        rearX: -12, rearY: -1, leftX: -3, ear: -2 },
      beat: { rightX: 3, rightY: -1, fistX: -2, fistY: 1, torsoTurn: -5, scarf: 3 },
      follow: { bodyY: 2, torsoTurn: 4, rightX: 10, rightY: -4, rightFootTurn: 12,
        fistX: -3, fistY: -3, rearX: -4, leftX: -2 },
    },
    pipSlipTurn: {
      ground: true, primed: true, glance: true, clasp: 'front', claspRange: [0, 2],
      openHands: 'front', openRange: [3, 5],
      wind: { bodyX: 1, bodyY: 2, headTurn: -8, torsoTurn: 13, fistX: 6, fistY: -6,
        rearX: -4, rearY: -2, leftX: -1, rightX: 2, kneeOut: 2 },
      lift: { bodyY: 2, headX: -1, headTurn: -12, torsoTurn: -9, fistX: -7, fistY: -11,
        fistTurn: -43, rearX: -3, rearY: -5, leftX: -1, rightX: 2, kneeOut: 3 },
      hit: { bodyX: -2, bodyY: 1, torsoTurn: -25, headX: 2, headTurn: -7,
        fistX: -30, fistY: -1, fistTurn: 158, rearX: 2, rearY: -6,
        leftX: -6, leftFootTurn: 131, rightX: 2, rightFootTurn: -8, scarf: -6 },
      beat: { fistX: -3, fistY: 1, fistTurn: 10, torsoTurn: -7, headTurn: 9, rearX: -2 },
      follow: { bodyX: -2, torsoTurn: -17, headTurn: -5, fistX: -13, fistY: -2, fistTurn: 108,
        rearX: 2, rearY: -2, leftX: -4, leftFootTurn: 64, rightX: 2 },
    },
    pipPopFly: {
      ground: true, primed: true, clasp: 'front', claspRange: [0, 2], openHands: 'front', openRange: [3, 5],
      wind: { bodyX: 1, bodyY: 5, headTurn: 9, torsoTurn: 9, fistX: 6, fistY: 3,
        rearX: -5, rearY: 1, leftX: -3, rightX: 2, kneeOut: 3 },
      lift: { bodyX: 1, bodyY: 1, torsoTurn: 5, headTurn: -7, fistX: 5, fistY: -6,
        fistTurn: -30, rearX: -7, rearY: 2, leftX: -3, rightX: 2 },
      hit: { bodyY: -3, headX: -1, headTurn: -17, torsoTurn: -8, shoulderY: -2,
        fistX: 8, fistY: -17, fistTurn: -72, rearX: -12, rearY: 4,
        leftX: -2, rightX: 3, rightFootTurn: -6 },
      beat: { fistX: -3, fistY: -4, fistTurn: -12, torsoTurn: -4, headTurn: -5 },
      follow: { headTurn: -14, torsoTurn: -6, fistX: 5, fistY: -10, fistTurn: -43,
        rearX: -6, rearY: 2, leftX: -2, rightX: 2 },
    },
    pipTumbleTrip: {
      ground: true, primed: true, sole: 'front', clasp: 'front', claspRange: [0, 2],
      openHands: 'front', openRange: [3, 5],
      wind: { bodyX: 1, bodyY: 2, torsoTurn: 5, headTurn: 1, fistX: 6, fistY: -2,
        rightX: 1, rightY: -3, rearX: -4, leftX: -3, kneeOut: 2 },
      lift: { bodyX: 2, bodyY: 1, torsoTurn: 8, headTurn: -5, fistX: 9, fistY: -8,
        fistTurn: -23, rightX: 3, rightY: -4, rearX: -5, leftX: -3 },
      hit: { bodyX: 1, bodyY: 5, headX: 1, headTurn: 17, torsoTurn: 16,
        rightX: 16, rightY: -1, rightFootTurn: -16, leftX: -2, fistX: 5,
        fistY: 4, fistTurn: 61, rearX: -11, rearY: -6, kneeOut: 3, scarf: 4 },
      beat: { fistX: -3, fistY: 1, rightX: 3, rightFootTurn: 12, torsoTurn: 5, headTurn: 3 },
      follow: { bodyX: 1, bodyY: 3, torsoTurn: 10, headTurn: 8, rightX: 8,
        rightY: -1, fistX: 1, fistY: 3, fistTurn: 28, rearX: -5, kneeOut: 2 },
    },

    brisketBearHug: {
      ground: true, bothHands: true, behindHead: true, openHands: 'both', openRange: [1, 3],
      clasp: 'both', claspRange: [4, 5],
      wind: { bodyX: -2, bodyY: 3, torsoTurn: -5, headTurn: -4, fistX: -2,
        fistY: 2, rearX: -15, rearY: -6, leftX: -2, rightX: 2, kneeOut: 3 },
      hit: { bodyX: 3, bodyY: 2, lean: 2, headX: 2, torsoTurn: 11, headTurn: -5,
        fistX: 10, fistY: 1, fistTurn: -9, rearX: 9, rearY: -12, rearTurn: 31,
        leftX: -3, rightX: 5, kneeOut: 2 },
      beat: { fistX: -2, fistY: -3, rearX: 1, rearY: 4, fistTurn: -14, rearTurn: 14, torsoTurn: -4 },
      follow: { bodyX: 1, bodyY: 2, torsoTurn: 4, fistX: 4, fistY: -2, rearX: 3,
        rearY: -6, rearTurn: 19, leftX: -2, rightX: 3, kneeOut: 2 },
    },
    brisketBearHugHold: {
      ground: true, bothHands: true, behindHead: true, clasp: 'both',
      hold: { bodyX: 1, bodyY: 2, torsoTurn: 4, headX: 2, headTurn: -5, fistX: 7,
        fistY: -14, fistTurn: -25, rearX: 7, rearY: -18, rearTurn: 41, leftX: -4, rightX: 4, kneeOut: 3 },
      tug: { bodyX: -1, bodyY: 1, torsoTurn: -6, headTurn: -5, fistX: -1, fistY: -1,
        rearX: -2, rearY: 2, rearTurn: 8, fistTurn: -6, kneeOut: 2 },
    },
    brisketShoulderLift: {
      fromHold:'brisketBearHugHold', ground:true, bothHands:true, behindHead:true, clasp:'both',
      wind:{bodyY:3, headTurn:9, torsoTurn:7, kneeOut:3},
      hit:{bodyY:-2, fistX:-9, fistY:-7, fistTurn:-35, rearX:-18, rearY:-9, rearTurn:-74, shoulderY:-2},
      follow:{bodyY:-1, headTurn:9, torsoTurn:-9, fistX:-11, fistY:-9, rearX:-22, rearY:-8},
    },
    brisketShoulderCarry: {
      ground:true, bothHands:true, behindHead:true, clasp:'both',
      hold:{bodyY:2, headX:4, headTurn:9, torsoTurn:-9, shoulderY:-2, fistX:-2, fistY:-23,
        fistTurn:-60, rearX:-18, rearY:-27, rearTurn:-84, leftX:-3, rightX:4, kneeOut:3},
      tug:{bodyY:1, headTurn:2, fistY:-1, rearY:-1, ear:-1},
    },
    brisketCarrySqueeze: {
      fromHold:'brisketShoulderCarry', ground:true, bothHands:true, behindHead:true, clasp:'both',
      wind:{bodyY:2, kneeOut:2, headTurn:4},
      hit:{bodyY:-3, shoulderY:-2, rearX:3, rearY:3, fistX:-3, fistY:-2, headTurn:-7},
      follow:{bodyY:-1, kneeOut:1, rearX:1, fistX:-1},
    },
    brisketYardHeave: {
      ground: true, primed: true, bothHands: true, behindHead: true, clasp: 'both', claspRange: [0, 2],
      openHands: 'both', openRange: [3, 5],
      wind: { bodyX: -2, bodyY: 5, headX: 2, headTurn: 9, torsoTurn: -8,
        fistX: 8, fistY: -14, rearX: 5, rearY: -19, leftX: -4, rightX: 4, kneeOut: 4 },
      lift: { bodyY: -2, headX: 2, headTurn: -15, torsoTurn: -11, shoulderY: -2,
        fistX: -2, fistY: -22, fistTurn: -57, rearX: -12, rearY: -20, rearTurn: -86,
        frontElbowX: 5, leftX: -3, rightX: 4 },
      hit: { bodyX: 4, bodyY: -2, lean: 2, torsoTurn: 13, headTurn: -12, shoulderY: -2,
        fistX: 14, fistY: -13, fistTurn: -39, rearX: 6, rearY: -15, rearTurn: -42,
        leftX: -4, rightX: 6, kneeOut: 2 },
      beat: { fistX: 2, fistY: -1, rearY: -3, torsoTurn: 5, headTurn: -4 },
      follow: { bodyX: 2, bodyY: 1, torsoTurn: 11, headTurn: -5, fistX: 7, fistY: -6,
        rearX: 2, rearY: -8, fistTurn: -18, rightX: 5, leftX: -3 },
    },
    brisketSuplex: {
      ground: true, primed: true, bothHands: true, behindHead: true, clasp: 'both', claspRange: [0, 2],
      openHands: 'both', openRange: [3, 5],
      wind: { bodyX: -1, bodyY: 3, torsoTurn: -9, headX: 1, headTurn: -5,
        fistX: 6, fistY: -14, rearX: 8, rearY: -18, leftX: -1, rightX: 4, kneeOut: 2 },
      lift: { bodyY: -3, headTurn: -23, torsoTurn: -19, shoulderY: -3,
        fistX: -4, fistY: -26, fistTurn: -66, rearX: -17, rearY: -23, rearTurn: -120,
        frontElbowX: 8, leftX: 2, rightX: 5 },
      hit: { bodyX: 1, bodyY: -4, torsoTurn: -70, headX: -2, headY: 1, headTurn: -66,
        fistX: -35, fistY: 3, fistTurn: 144, rearX: -27, rearY: 3, rearTurn: 165,
        leftX: 5, rightX: 7, frontKneeY: -4, kneeOut: 3, ear: -2 },
      beat: { torsoTurn: -9, headTurn: -11, fistX: -4, fistY: 1, rearX: -3, rearY: 3, leftX: 1 },
      follow: { bodyY: 2, torsoTurn: -29, headTurn: -23, headX: -2,
        fistX: -15, fistY: 1, fistTurn: 94, rearX: -10, rearY: 0, leftX: 2, rightX: 5, kneeOut: 3 },
    },
    brisketPress: {
      ground: true, primed: true, bothHands: true, behindHead: true, clasp: 'both', claspRange: [0, 2],
      openHands: 'both', openRange: [3, 5],
      wind: { bodyY: 4, headX: 1, headTurn: -9, fistX: 4, fistY: -15,
        rearX: 4, rearY: -18, leftX: -3, rightX: 3, kneeOut: 4 },
      lift: { bodyY: 1, headX: 1, headTurn: -11, fistX: 2, fistY: -18,
        fistTurn: -49, rearX: -9, rearY: -17, rearTurn: -73, leftX: -3, rightX: 3, kneeOut: 2 },
      hit: { bodyY: -3, headX: 2, headY: 1, headTurn: -12, torsoTurn: -4, shoulderY: -3,
        fistX: 3, fistY: -23, fistTurn: -71, rearX: -18, rearY: -21, rearTurn: -105,
        frontElbowX: 4, leftX: -3, rightX: 3 },
      beat: { bodyY: -1, fistY: -3, rearY: -3, fistTurn: -9, rearTurn: -9, headTurn: -5 },
      follow: { bodyY: 1, headTurn: -11, fistX: 2, fistY: -11, fistTurn: -37,
        rearX: -11, rearY: -12, rearTurn: -45, leftX: -3, rightX: 3, kneeOut: 2 },
    },
    brisketSitSlam: {
      ground: true, primed: true, bothHands: true, behindHead: true, haunch: true,
      clasp: 'both', claspRange: [0, 2], openHands: 'both', openRange: [3, 5],
      wind: { bodyY: 1, headX: 2, headTurn: -6, fistX: 7, fistY: -13, rearX: 6,
        rearY: -16, leftX: -1, rightX: 3, kneeOut: 2 },
      lift: { bodyY: -2, headX: 1, headTurn: -18, torsoTurn: -5, shoulderY: -2,
        fistX: 7, fistY: -22, fistTurn: -51, rearX: -7, rearY: -22, rearTurn: -82,
        leftX: 1, rightX: 5, kneeOut: 3 },
      hit: { bodyX: -2, bodyY: 6, headY: 1, torsoTurn: -15, headTurn: 13, haunchX: -1,
        fistX: 8, fistY: 7, fistTurn: 68, rearX: 0, rearY: 9, rearTurn: 74,
        leftX: 12, rightX: 14, rightFootTurn: -10, kneeOut: 2, tailLift: -2 },
      beat: { bodyY: 1, headY: 1, fistX: 2, rearX: -2, rightX: 2, torsoTurn: 7 },
      follow: { bodyX: -2, bodyY: 4, torsoTurn: -9, headTurn: 6, fistX: 4,
        fistY: 4, rearX: -1, rearY: 4, leftX: 4, rightX: 8, kneeOut: 3 },
    },

    noodleLeadLoop: {
      ground: true, item: 'rope', itemAngles: [-47, -66, -42, -26, -4, 12, 9, 4],
      clasp: 'front', openHands: 'rear', openRange: [2, 4],
      wind: { bodyX: -2, bodyY: 2, torsoTurn: -12, headTurn: -7, fistX: -8,
        fistY: -5, rearX: 0, rearY: -3, leftX: -3, rightX: 2 },
      hit: { bodyX: 3, bodyY: 1, headX: 1, headY: -1, torsoTurn: 10, headTurn: -8,
        fistX: 10, fistY: -7, fistTurn: -21, rearX: -5, rearY: 1, leftX: -2, rightX: 4 },
      beat: { bodyX: -1, fistX: -2, fistY: 2, fistTurn: 16, rearX: 2, torsoTurn: -3 },
      follow: { bodyX: 1, headTurn: -6, fistX: 4, fistY: -3, rearX: -2, leftX: -2, rightX: 3 },
    },
    noodleLeadLoopHold: {
      ground: true, item: 'rope', itemAngles: [-6, -9, -12, -16, -14, -10, -7, -5],
      bothHands: true, behindHead: true, clasp: 'both',
      hold: { bodyX: -2, bodyY: 2, headX: 1, headTurn: -5, torsoTurn: -9, fistX: 5,
        fistY: -7, fistTurn: -9, rearX: 0, rearY: -5, leftX: -4, rightX: 5, kneeOut: 2 },
      tug: { bodyX: -1, bodyY: 1, headTurn: -7, torsoTurn: -8, fistX: -2, fistY: 1,
        rearX: -2, rearY: -1, kneeOut: 2, scarf: 1 },
    },
    noodleSlingCast: {
      ground: true, primed: true, item: 'rope', itemAngles: [-2, -62, -39, -27, -13, 8, 10, 3],
      clasp: 'front', openHands: 'rear', openRange: [3, 5],
      wind: { bodyX: -3, bodyY: 3, headX: 2, headTurn: -6, torsoTurn: -15, fistX: 0,
        fistY: -3, rearX: -1, rearY: -3, leftX: -4, rightX: 4, kneeOut: 3 },
      lift: { bodyX: -2, bodyY: 1, headTurn: -14, torsoTurn: -11, shoulderY: -1,
        fistX: 3, fistY: -15, fistTurn: -49, rearX: -6, rearY: 1, leftX: -4, rightX: 5 },
      hit: { bodyX: 5, bodyY: -1, lean: 3, headX: 1, headY: -2, headTurn: -11, torsoTurn: 15,
        fistX: 13, fistY: -9, fistTurn: -29, rearX: -16, rearY: 3, leftX: -5, rightX: 6, scarf: 5 },
      beat: { fistX: 3, fistY: 3, fistTurn: 13, torsoTurn: 5, headTurn: 3 },
      follow: { bodyX: 3, bodyY: 2, torsoTurn: 15, headTurn: 7, fistX: 7, fistY: -2,
        rearX: -9, rearY: 1, leftX: -3, rightX: 4 },
    },
    noodleReverseReel: {
      ground: true, primed: true, item: 'rope', itemAngles: [-5, -98, -132, -162, 178, 164, 83, 4],
      clasp: 'front', glance: true,
      wind: { bodyX: 1, bodyY: 2, headTurn: 1, torsoTurn: 12, fistX: 6, fistY: -4,
        rearX: 0, rearY: -5, leftX: -1, rightX: 3, kneeOut: 2 },
      lift: { bodyY: 1, torsoTurn: -14, headX: 2, headTurn: -14, fistX: -9,
        fistY: -15, fistTurn: -77, frontElbowX: -5, rearX: 2, rearY: -3, leftX: -3, rightX: 3 },
      hit: { bodyX: -3, bodyY: 1, torsoTurn: -25, headX: 1, headTurn: -9,
        fistX: -29, fistY: -6, fistTurn: -137, rearX: 2, rearY: -4, leftX: -5, rightX: 4, scarf: -4 },
      beat: { fistX: -3, fistY: 3, fistTurn: -16, torsoTurn: -5, headTurn: 7, rearY: -2 },
      follow: { bodyX: -2, bodyY: 2, headTurn: -5, torsoTurn: -17,
        fistX: -16, fistY: -1, fistTurn: -115, rearX: 1, rearY: -5, leftX: -4, rightX: 4 },
    },
    noodleFlagpole: {
      ground: true, primed: true, bothHands: true, behindHead: true, item: 'rope',
      itemAngles: [-7, -51, -69, -84, -95, -72, -31, 1], clasp: 'both',
      wind: { bodyX: -1, bodyY: 4, headX: 1, headTurn: -4, fistX: 4, fistY: -2,
        rearX: 0, rearY: -3, leftX: -4, rightX: 3, kneeOut: 4 },
      lift: { bodyX: -1, bodyY: 1, torsoTurn: -6, headTurn: -11, fistX: 6, fistY: -13,
        fistTurn: -41, rearX: 3, rearY: -4, leftX: -4, rightX: 3, kneeOut: 2 },
      hit: { bodyX: -1, bodyY: -3, headX: -1, headTurn: -17, torsoTurn: -8, shoulderY: -2,
        fistX: 3, fistY: -24, fistTurn: -77, rearX: 5, rearY: -9, rearTurn: -65,
        frontElbowX: 3, leftX: -4, rightX: 4 },
      beat: { fistX: -1, fistY: -3, rearY: -2, fistTurn: -7, torsoTurn: -5, headTurn: -3 },
      follow: { bodyY: 1, headTurn: -12, torsoTurn: -6, fistX: 4, fistY: -11,
        fistTurn: -35, rearX: 2, rearY: -5, leftX: -3, rightX: 3, kneeOut: 1 },
    },
    noodleSlackSnap: {
      ground: true, primed: true, bothHands: true, behindHead: true, item: 'rope',
      itemAngles: [-4, 2, 7, 4, -8, -16, -8, 1], clasp: 'both',
      wind: { bodyX: 2, bodyY: 2, headX: 1, headTurn: 2, torsoTurn: 9, fistX: 7,
        fistY: -2, rearX: 2, rearY: -3, leftX: -3, rightX: 4, kneeOut: 2 },
      lift: { bodyX: 3, bodyY: 1, headX: 1, headTurn: -3, torsoTurn: 11, fistX: 10,
        fistY: -7, rearX: 2, rearY: -3, leftX: -3, rightX: 4, kneeOut: 2 },
      hit: { bodyX: -3, bodyY: 5, torsoTurn: -15, headX: 2, headTurn: 14,
        fistX: 2, fistY: 2, fistTurn: 16, rearX: -5, rearY: 3,
        leftX: -4, rightX: 6, rightFootTurn: -7, kneeOut: 4, scarf: 3 },
      beat: { bodyX: -2, fistX: -8, fistY: 0, rearX: -7, torsoTurn: -9, headTurn: 5, fistTurn: -17 },
      follow: { bodyX: -2, bodyY: 3, headTurn: 7, torsoTurn: -13, fistX: -3, fistY: 1,
        rearX: -5, rearY: 1, leftX: -3, rightX: 4, kneeOut: 3 },
    },

    cloverDiscHook: {
      ground: true, item: 'disc', itemAngles: [-33, -55, -38, -52, -79, -46, -18, -2],
      clasp: 'rear', claspRange: [4, 5], openHands: 'rear', openRange: [1, 3],
      wind: { bodyX: -2, bodyY: 2, torsoTurn: -10, headTurn: -5,
        fistX: -5, fistY: -1, fistTurn: -17, rearX: -2, rearY: -3, leftX: -2, rightX: 2 },
      hit: { bodyX: 2, bodyY: 1, lean: 2, headX: 1, headTurn: -7, torsoTurn: 12,
        fistX: 8, fistY: -3, fistTurn: -36, rearX: 3, rearY: -3, leftX: -3, rightX: 5 },
      beat: { bodyX: -1, fistX: -2, fistY: 1, fistTurn: -13, rearX: 2, torsoTurn: -5 },
      follow: { bodyX: 1, headTurn: -4, torsoTurn: 5, fistX: 3, fistY: -2,
        fistTurn: -21, rearX: 1, rearY: -2, leftX: -2, rightX: 3 },
    },
    cloverDiscHookHold: {
      ground: true, item: 'disc', itemAngles: [-65, -66, -69, -72, -71, -68, -66, -64],
      bothHands: true, behindHead: true, clasp: 'rear',
      hold: { bodyX: 1, bodyY: 2, headX: 1, torsoTurn: 4, headTurn: -4,
        fistX: 4, fistY: -2, fistTurn: -39, rearX: 4, rearY: -4, rearTurn: 21,
        leftX: -3, rightX: 4, kneeOut: 2 },
      tug: { bodyX: -2, torsoTurn: -7, headTurn: -6, fistX: 1, fistY: 1,
        rearX: 1, rearY: -1, fistTurn: -6, kneeOut: 2, scarf: 2 },
    },
    cloverForehandPass: {
      ground: true, primed: true, item: 'disc', itemAngles: [-58, -52, -26, 0, 3, 16, 10, 1],
      clasp: 'rear', claspRange: [0, 2], openHands: 'rear', openRange: [3, 5],
      wind: { bodyX: -2, bodyY: 2, headX: 1, headTurn: -6, torsoTurn: -12, fistX: 1,
        fistY: -2, rearX: 2, rearY: -4, leftX: -3, rightX: 3, kneeOut: 2 },
      hit: { bodyX: 4, bodyY: 1, headX: 1, headTurn: -8, torsoTurn: 14,
        fistX: 10, fistY: -3, fistTurn: -9, rearX: 3, rearY: 0, leftX: -4, rightX: 5 },
      beat: { bodyX: 1, fistX: 3, fistY: 1, torsoTurn: 4, rearY: -2 },
      follow: { bodyX: 2, bodyY: 2, headTurn: 4, torsoTurn: 12,
        fistX: 6, fistY: 0, rearX: 0, leftX: -3, rightX: 4 },
    },
    cloverBankPass: {
      ground: true, primed: true, glance: true, behindHead: true, item: 'disc',
      itemAngles: [-59, -114, -132, -146, -160, -133, -67, -2],
      clasp: 'rear', claspRange: [0, 2], openHands: 'rear', openRange: [3, 5],
      wind: { bodyX: 1, bodyY: 2, torsoTurn: 12, headTurn: 1, fistX: 5,
        fistY: -2, rearX: 4, rearY: -4, leftX: -2, rightX: 3, kneeOut: 2 },
      lift: { bodyY: 1, headX: 2, headTurn: -16, torsoTurn: -11, fistX: -10,
        fistY: -13, fistTurn: -83, frontElbowX: -7, rearX: 1, rearY: -4, leftX: -3, rightX: 3 },
      hit: { bodyX: -2, bodyY: -1, torsoTurn: -22, headX: 1, headTurn: -5,
        fistX: -24, fistY: -10, fistTurn: -133, rearX: 3, rearY: 0,
        leftX: -5, rightX: 3, leftFootTurn: 35, scarf: -4 },
      beat: { fistX: -3, fistY: -3, headTurn: -5, torsoTurn: -4, rearY: 2 },
      follow: { bodyX: -2, bodyY: 1, headTurn: -6, torsoTurn: -14, fistX: -12,
        fistY: -4, fistTurn: -85, rearX: 2, rearY: 1, leftX: -3, rightX: 3 },
    },
    cloverSetToss: {
      ground: true, primed: true, item: 'disc', itemAngles: [-61, -56, -32, -38, -54, -29, -15, -1],
      clasp: 'rear', claspRange: [0, 2], openHands: 'rear', openRange: [3, 5], bothHands: true, behindHead: true,
      wind: { bodyX: 1, bodyY: 4, torsoTurn: 8, headTurn: 5, fistX: 4,
        fistY: 0, rearX: 4, rearY: -2, leftX: -3, rightX: 3, kneeOut: 3 },
      lift: { bodyY: 1, headTurn: -9, torsoTurn: 2, fistX: 3, fistY: -7,
        fistTurn: -26, rearX: 3, rearY: -5, leftX: -3, rightX: 3, kneeOut: 2 },
      hit: { bodyX: 1, bodyY: -3, headX: -1, headTurn: -21, torsoTurn: -6, shoulderY: -2,
        fistX: 7, fistY: -16, fistTurn: -47, rearX: 6, rearY: -8, rearTurn: -43,
        leftX: -3, rightX: 3 },
      beat: { fistX: 0, fistY: -3, fistTurn: -8, rearY: -2, headTurn: -3, torsoTurn: -3 },
      follow: { bodyY: -1, headTurn: -11, torsoTurn: -5, fistX: 5, fistY: -8,
        fistTurn: -27, rearX: 2, rearY: -4, leftX: -2, rightX: 3 },
    },
    cloverSkipToss: {
      ground: true, primed: true, item: 'disc', itemAngles: [-64, -46, -12, 7, 0, -8, 3, 1],
      clasp: 'rear', claspRange: [0, 2], openHands: 'rear', openRange: [3, 5],
      wind: { bodyX: 1, bodyY: 3, headTurn: 4, torsoTurn: 9, fistX: 4,
        fistY: -1, rearX: 3, rearY: -3, leftX: -3, rightX: 3, kneeOut: 3 },
      lift: { bodyX: 2, bodyY: 1, torsoTurn: 7, headTurn: -8, fistX: 7,
        fistY: -10, fistTurn: -40, rearX: 0, rearY: -3, leftX: -3, rightX: 4 },
      hit: { bodyX: 3, bodyY: 5, torsoTurn: 17, lean: 2, headX: 1, headTurn: 15,
        fistX: 10, fistY: 4, fistTurn: 27, rearX: -5, rearY: -5, leftX: -4, rightX: 6, kneeOut: 4 },
      beat: { fistX: 2, fistY: 1, fistTurn: -10, torsoTurn: 5, rearY: 2, headTurn: 3 },
      follow: { bodyX: 2, bodyY: 3, headTurn: 8, torsoTurn: 11, fistX: 5,
        fistY: 2, fistTurn: 15, rearX: -2, rearY: -3, leftX: -3, rightX: 4, kneeOut: 3 },
    },

    // Pummels offset the existing grip. The first and last drawings return to that exact hold.
    pipPawDrum: {
      fromHold: 'pipCollarTagHold', ground: true, clasp: 'front', rearStrike: true,
      openHands: 'rear', openRange: [3, 3],
      wind: { bodyX: -1, bodyY: 1, torsoTurn: -12, headTurn: -6, headX: -1,
        fistX: 1, fistY: -1, rearX: -4, rearY: 4, rearTurn: 25, scarf: -2 },
      hit: { bodyX: 2, bodyY: -1, lean: 1, headX: -1, headTurn: 3, torsoTurn: 13,
        fistX: -1, fistY: -3, fistTurn: -4, rearX: 13, rearY: 1, rearTurn: -9, ear: -2 },
      beat: { bodyX: -1, fistX: 1, rearX: -5, rearY: 2, rearTurn: 13, headTurn: -4, scarf: 2 },
      follow: { bodyX: 1, bodyY: 1, headTurn: 4, torsoTurn: 4, fistY: -1, rearX: 2, rearY: 2, rearTurn: 7 },
    },
    brisketBearSqueeze: {
      fromHold: 'brisketBearHugHold', ground: true, bothHands: true, behindHead: true, clasp: 'both',
      wind: { bodyY: 3, headTurn: 5, torsoTurn: 5, shoulderY: 1, fistX: 3, fistY: -1,
        fistTurn: 15, rearX: -2, rearY: -4, rearTurn: -12, kneeOut: 3 },
      hit: { bodyX: -2, bodyY: -4, torsoTurn: -11, headX: 2, headY: -1, headTurn: -12,
        shoulderY: -3, fistX: -2, fistY: -6, fistTurn: -28, rearX: -3, rearY: -3,
        rearTurn: 17, frontElbowX: 4, kneeOut: -1, charmTurn: -15 },
      beat: { bodyY: -1, fistX: -1, fistY: 1, rearX: 1, headTurn: -3, ear: 2 },
      follow: { bodyX: -1, bodyY: -1, torsoTurn: -5, headTurn: -6, fistX: -1,
        fistY: -3, fistTurn: -9, rearX: -1, rearY: -1, rearTurn: 8, frontElbowX: 2 },
    },
    noodleKnotTug: {
      fromHold: 'noodleLeadLoopHold', ground: true, bothHands: true, behindHead: true, clasp: 'both',
      item: 'rope', itemAngles: [-6, -3, 4, -22, -28, -20, -10, -6],
      wind: { bodyX: 2, bodyY: -1, headX: 1, headTurn: 4, torsoTurn: 10,
        fistX: 1, rearX: 1, rearY: 1, scarf: -3, kneeOut: -1 },
      hit: { bodyX: -3, bodyY: 2, torsoTurn: -18, headX: 1, headY: -1, headTurn: -12,
        fistX: -7, fistY: -3, fistTurn: -15, rearX: -4, rearY: -4, rearTurn: -18,
        kneeOut: 3, frontElbowX: -2, tailLift: -2, scarf: -4 },
      beat: { bodyY: -1, fistX: -2, fistY: 1, rearX: -1, headTurn: 4, scarf: 3 },
      follow: { bodyX: -2, bodyY: 1, headTurn: -5, torsoTurn: -9, fistX: -4,
        fistY: -1, fistTurn: -9, rearX: -2, rearY: -1, kneeOut: 2 },
    },
    cloverRimTap: {
      fromHold: 'cloverDiscHookHold', ground: true, bothHands: true, behindHead: true, clasp: 'rear',
      item: 'disc', itemAngles: [-65, -43, -18, -64, -82, -46, -58, -65],
      wind: { bodyY: 2, torsoTurn: 7, headTurn: 4, fistX: 2, fistY: 2, fistTurn: 26,
        rearX: -1, rearY: -1, kneeOut: 2 },
      hit: { bodyX: 1, bodyY: -2, torsoTurn: -6, headX: -1, headTurn: -12, shoulderY: -1,
        fistX: 2, fistY: -5, fistTurn: -20, rearX: 2, rearY: -5, rearTurn: -11, scarf: 2 },
      beat: { fistX: 2, fistY: -1, fistTurn: -15, headTurn: -4, rearY: -1 },
      follow: { bodyY: 1, headTurn: -4, torsoTurn: 2, fistX: 1, fistY: -2,
        fistTurn: 7, rearX: 1, rearY: -1, rearTurn: -4 },
    },

    // Running catches extend in the attack-facing direction. A pivot brakes against the old run.
    pipTagDash: {
      ground: true, primed: true, openHands: 'front', openRange: [2, 3], clasp: 'front', claspRange: [4, 5],
      wind: { bodyX: 2, bodyY: 1, lean: 2, torsoTurn: 10, headTurn: -6, fistX: -3, fistY: -3,
        rearX: 1, rearY: 2, leftX: 2, leftY: -6, leftFootTurn: 20, rightX: 6, scarf: 3 },
      lift: { bodyX: 3, bodyY: 3, lean: 2, torsoTurn: 14, headTurn: 2, fistX: 1, fistY: 1,
        rearX: -9, rearY: -5, leftX: -4, rightX: 3, rightY: -5, kneeOut: 2, scarf: 4 },
      hit: { bodyX: 5, bodyY: 4, lean: 3, torsoTurn: 19, headX: 1, headY: -1, headTurn: 4,
        fistX: 15, fistY: -1, fistTurn: 8, rearX: -16, rearY: -5, rearTurn: 116,
        leftX: -5, rightX: 6, rightY: -2, kneeOut: 2, scarf: 6 },
      beat: { bodyX: 1, fistX: -2, fistY: -1, fistTurn: 20, rearX: 3, rightY: 2, leftY: -2, ear: 2 },
      follow: { bodyX: 3, bodyY: 2, lean: 1, torsoTurn: 9, headTurn: -2, fistX: 5,
        fistY: -2, fistTurn: 20, rearX: -5, leftX: -2, leftY: -2, rightX: 5, scarf: 3 },
    },
    pipHeelHook: {
      ground: true, primed: true, pivot: true, openHands: 'front', openRange: [2, 3], clasp: 'front', claspRange: [4, 5],
      wind: { bodyX: -4, bodyY: 2, torsoTurn: -17, headX: -2, headTurn: -9, fistX: -10,
        fistY: 0, rearX: -7, rearY: -3, leftX: -5, rightX: 5, rightY: -4, rightFootTurn: 29, scarf: -4 },
      lift: { bodyX: -5, bodyY: 5, torsoTurn: -7, headX: 1, headTurn: 10, fistX: -3,
        fistY: 4, fistTurn: 49, rearX: -9, rearY: -6, leftX: -5, rightX: 8,
        rightY: -2, rightFootTurn: 25, kneeOut: 4 },
      hit: { bodyX: -3, bodyY: 5, torsoTurn: 12, headX: 2, headY: 1, headTurn: 15,
        fistX: 15, fistY: 1, fistTurn: 53, rearX: -12, rearY: -7, rearTurn: -72,
        leftX: -5, rightX: 5, kneeOut: 4, frontKneeY: -1, scarf: -5 },
      beat: { fistX: -2, fistY: -2, fistTurn: -20, torsoTurn: 6, rearX: 2, headTurn: -6 },
      follow: { bodyX: -2, bodyY: 3, torsoTurn: 8, headTurn: 5, fistX: 6, fistY: 0,
        fistTurn: 20, rearX: -4, rearY: -3, leftX: -5, rightX: 3, kneeOut: 2 },
    },

    brisketFreightHug: {
      ground: true, primed: true, bothHands: true, behindHead: true,
      openHands: 'both', openRange: [1, 3], clasp: 'both', claspRange: [4, 5],
      wind: { bodyX: 2, bodyY: 1, torsoTurn: 7, headTurn: -4, fistX: -1, fistY: 2,
        rearX: -14, rearY: -6, leftX: 1, leftY: -4, rightX: 4, kneeOut: 2 },
      lift: { bodyX: 4, bodyY: 5, torsoTurn: 13, headY: 1, headTurn: 11, fistX: 1,
        fistY: 4, fistTurn: 19, rearX: -7, rearY: -6, rearTurn: -32,
        leftX: -4, rightX: 4, rightY: -3, kneeOut: 4 },
      hit: { bodyX: 5, bodyY: 3, lean: 2, torsoTurn: 16, headX: 1, headTurn: -4, shoulderY: -1,
        fistX: 12, fistY: 2, fistTurn: -19, rearX: 12, rearY: -12, rearTurn: 34,
        leftX: -6, rightX: 7, rightY: -1, kneeOut: 3 },
      beat: { bodyX: 1, fistX: -1, fistY: -4, fistTurn: -13, rearX: 1, rearY: 3,
        rearTurn: 10, rightY: 1, leftY: -1 },
      follow: { bodyX: 3, bodyY: 2, torsoTurn: 8, headTurn: -4, fistX: 6, fistY: -3,
        fistTurn: -13, rearX: 2, rearY: -6, rearTurn: 22, leftX: -3, rightX: 5, kneeOut: 2 },
    },
    brisketGateSwing: {
      ground: true, primed: true, pivot: true, bothHands: true, behindHead: true,
      openHands: 'both', openRange: [1, 3], clasp: 'both', claspRange: [4, 5],
      wind: { bodyX: -3, bodyY: 3, torsoTurn: -16, headX: -1, headTurn: -9,
        fistX: -16, fistY: 1, rearX: -15, rearY: -8, leftX: -5, rightX: 5, rightY: -3, kneeOut: 3 },
      lift: { bodyX: -4, bodyY: 3, torsoTurn: -9, headX: 2, headTurn: -7, shoulderY: -2,
        fistX: -3, fistY: -2, fistTurn: -20, rearX: -6, rearY: -16, rearTurn: 36,
        leftX: -5, rightX: 7, rightY: -1, kneeOut: 4 },
      hit: { bodyX: -2, bodyY: 1, torsoTurn: 13, headX: 2, headY: 1, headTurn: -11, shoulderY: -3,
        fistX: 18, fistY: -7, fistTurn: -29, rearX: 16, rearY: -18, rearTurn: 34,
        leftX: -5, rightX: 5, kneeOut: 3 },
      beat: { fistX: 1, fistY: -3, fistTurn: -14, rearX: -2, rearY: 3, rearTurn: 16, torsoTurn: 6 },
      follow: { bodyX: -1, bodyY: 2, headTurn: -6, torsoTurn: 8, fistX: 6, fistY: -3,
        fistTurn: -14, rearX: 4, rearY: -8, rearTurn: 23, leftX: -5, rightX: 3, kneeOut: 2 },
    },

    noodleRunningLoop: {
      ground: true, primed: true, item: 'rope', itemAngles: [-51, -36, -19, -4, 6, 13, 8, 2],
      clasp: 'front', openHands: 'rear', openRange: [2, 4],
      wind: { bodyX: 1, bodyY: 1, lean: 2, torsoTurn: 7, headTurn: -3, fistX: -4, fistY: -5,
        rearX: 1, rearY: 0, leftX: 3, leftY: -5, leftFootTurn: 21, rightX: 6, scarf: 4 },
      lift: { bodyX: 3, bodyY: 3, torsoTurn: 12, headTurn: 9, fistX: 0, fistY: 0,
        rearX: -5, rearY: -2, leftX: -4, rightX: 4, rightY: -3, kneeOut: 3, scarf: 5 },
      hit: { bodyX: 6, bodyY: 3, lean: 3, torsoTurn: 15, headX: 1, headY: -4, headTurn: 1,
        fistX: 12, fistY: -5, fistTurn: -7, rearX: -15, rearY: -3, rearTurn: 106,
        leftX: -5, rightX: 7, rightY: -1, kneeOut: 2, scarf: 6 },
      beat: { fistX: 2, fistY: 1, rearX: 3, rightY: 1, leftY: -2, headTurn: 5 },
      follow: { bodyX: 3, bodyY: 2, torsoTurn: 9, headTurn: 3, fistX: 6,
        fistY: -1, rearX: -4, leftX: -1, leftY: -2, rightX: 4, kneeOut: 2 },
    },
    noodleBackcast: {
      ground: true, primed: true, pivot: true, item: 'rope',
      itemAngles: [167, -142, -48, -9, 5, 21, 13, 2], clasp: 'front',
      openHands: 'rear', openRange: [2, 4],
      wind: { bodyX: -2, bodyY: 2, torsoTurn: -15, headX: -1, headTurn: -6, fistX: -12,
        fistY: -1, fistTurn: 139, rearX: -7, rearY: -4, leftX: -5,
        rightX: 6, rightY: -4, rightFootTurn: 22, scarf: -4 },
      lift: { bodyX: -4, bodyY: 2, torsoTurn: -18, headX: 2, headTurn: -12, shoulderY: -1,
        fistX: -9, fistY: -9, fistTurn: -106, rearX: -9, rearY: -1, leftX: -5,
        rightX: 8, rightY: -2, kneeOut: 3 },
      hit: { bodyX: -4, bodyY: 1, lean: 1, torsoTurn: -11, headX: 3, headY: -2, headTurn: -11,
        fistX: 15, fistY: -11, fistTurn: -14, rearX: -12, rearY: 1, rearTurn: 128,
        leftX: -5, rightX: 5, kneeOut: 2, scarf: -6 },
      beat: { fistX: 1, fistY: 2, fistTurn: 12, torsoTurn: 5, rearX: 2, headTurn: 5 },
      follow: { bodyX: -2, bodyY: 2, torsoTurn: -4, headTurn: -3, fistX: 6,
        fistY: -4, rearX: -4, leftX: -5, rightX: 3, kneeOut: 2 },
    },

    cloverScoopSlide: {
      ground: true, primed: true, item: 'disc', itemAngles: [-61, -39, -22, -14, -32, -28, -13, -2],
      clasp: 'rear', claspRange: [4, 5], openHands: 'rear', openRange: [1, 3],
      wind: { bodyX: 2, bodyY: 1, torsoTurn: 8, headTurn: -3, fistX: -2, fistY: -3,
        rearX: 1, rearY: -1, leftX: 2, leftY: -4, rightX: 6, scarf: 4 },
      lift: { bodyX: 4, bodyY: 4, torsoTurn: 13, headY: 1, headTurn: 7, fistX: 1,
        fistY: 2, rearX: -4, rearY: -4, leftX: -4, rightX: 5, rightY: -2, kneeOut: 4 },
      hit: { bodyX: 4, bodyY: 6, lean: 2, torsoTurn: 17, headX: 1, headY: 1, headTurn: 12,
        fistX: 10, fistY: 0, fistTurn: 19, rearX: 3, rearY: -3, rearTurn: 14,
        leftX: -4, rightX: 9, kneeOut: 4, scarf: 5 },
      beat: { fistX: 1, fistY: -2, fistTurn: -17, rearX: 2, rearY: 2, torsoTurn: -4, headTurn: -6 },
      follow: { bodyX: 2, bodyY: 3, torsoTurn: 11, headTurn: 6, fistX: 5,
        fistY: 1, rearX: 1, rearY: -2, rightX: 6, leftX: -1, kneeOut: 3 },
    },
    cloverRimTurn: {
      ground: true, primed: true, pivot: true, item: 'disc',
      itemAngles: [160, -124, -77, -48, -69, -47, -19, -2],
      clasp: 'rear', claspRange: [4, 5], openHands: 'rear', openRange: [1, 3],
      wind: { bodyX: -3, bodyY: 2, torsoTurn: -17, headX: -2, headTurn: -7,
        fistX: -13, fistY: 0, fistTurn: 129, rearX: -7, rearY: -2,
        leftX: -5, rightX: 5, rightY: -4, rightFootTurn: 18, scarf: -4 },
      lift: { bodyX: -4, bodyY: 2, torsoTurn: -12, headX: 2, headTurn: -9,
        fistX: -6, fistY: -8, fistTurn: -87, rearX: -4, rearY: -4,
        leftX: -5, rightX: 7, rightY: -1, kneeOut: 3 },
      hit: { bodyX: -2, bodyY: -1, lean: 1, torsoTurn: 8, headX: 2, headTurn: -13, shoulderY: -2,
        fistX: 12, fistY: -6, fistTurn: -35, rearX: 7, rearY: -4, rearTurn: 13,
        leftX: -5, rightX: 5, kneeOut: 2, scarf: -5 },
      beat: { fistX: -1, fistY: -1, fistTurn: -19, rearX: 2, rearY: -2, headTurn: -4, torsoTurn: 5 },
      follow: { bodyX: -1, bodyY: 1, torsoTurn: 5, headTurn: -6, fistX: 5,
        fistY: -3, fistTurn: -28, rearX: 2, rearY: -2, leftX: -5, rightX: 3, kneeOut: 2 },
    },
    pipGrassSkid: {
      ground: true, primed: true, sole: 'both', openHands: 'rear', openRange: [2, 5],
      wind: { bodyX: 2, bodyY: 1, torsoTurn: 9, headTurn: -5, fistX: 2, fistY: -4,
        rearX: -9, rearY: 2, leftX: 1, leftY: -5, rightX: 4, ear: -2, scarf: 4 },
      lift: { bodyX: 1, bodyY: 4, torsoTurn: -7, headX: 1, headTurn: -5, fistX: -4, fistY: -4,
        rearX: -13, rearY: 4, leftX: 1, rightX: 6, rightY: -4, kneeOut: 3, scarf: 5 },
      hit: { bodyX: -2, bodyY: 6, torsoTurn: -23, headX: 1, headY: 1, headTurn: 3,
        fistX: -4, fistY: -5, fistTurn: -17, rearX: -20, rearY: 8, rearTurn: 95,
        leftX: 21, leftY: -8, leftFootTurn: -8, rightX: 18, rightY: -2, rightFootTurn: 53,
        kneeOut: 3, frontKneeY: -2, ear: -3, tail: -4, scarf: 7 },
      beat: { bodyX: 1, bodyY: 1, torsoTurn: 5, headTurn: 4, leftX: 2, rightX: 3,
        rightY: 1, rightFootTurn: 10, rearX: 2, ear: 1, scarf: -2 },
      follow: { bodyY: 4, torsoTurn: -13, headX: 1, headTurn: 4, fistX: -3, fistY: -3,
        rearX: -12, rearY: 5, rearTurn: 52, leftX: 4, rightX: 11, rightFootTurn: 24,
        kneeOut: 3, ear: -1, scarf: 3 },
    },
    brisketYardBuster: {
      ground: true, primed: true, shoulderDrive: [0, 2, 5, 9, 4, 2, 0, 0], lateContactPhase: 0.49,
      wind: { bodyX: 1, torsoTurn: 11, headTurn: -3, fistX: 2, fistY: -5, rearX: -7,
        leftX: -2, leftY: -4, rightX: 3, ear: -2 },
      lift: { bodyX: 1, bodyY: 4, torsoTurn: 14, headX: -2, headTurn: -8, shoulderY: -3,
        fistX: -3, fistY: -2, rearX: -8, rearY: -3, leftX: -4, rightX: 5, rightY: -2, kneeOut: 3 },
      hit: { bodyX: 6, bodyY: 1, lean: 3, torsoTurn: 24, headX: -2, headY: 1,
        headTurn: -4, shoulderY: -6, fistX: -7, fistY: 2, fistTurn: 63, rearX: -10, rearY: 1,
        leftX: -6, rightX: 6, rightY: -2, kneeOut: 2, ear: -3, tail: -2 },
      beat: { bodyX: -2, bodyY: 2, lean: -1, torsoTurn: -10, shoulderY: 2, headX: 1,
        headTurn: 6, fistX: 2, rearX: 2, rightY: 2, leftY: -2, rightX: 1, ear: 2 },
      follow: { bodyX: 2, bodyY: 2, torsoTurn: 9, headTurn: 4, shoulderY: -1,
        fistX: -3, fistY: 1, fistTurn: 21, rearX: -4, leftX: -2, leftY: -2, rightX: 4, kneeOut: 2 },
    },
    noodleLeadSweep: {
      ground: true, primed: true, item: 'rope', clasp: 'front', openHands: 'rear', openRange: [2, 4],
      itemAngles: [-43, -75, -29, -6, -24, -17, -9, 0],
      wind: { bodyX: 1, torsoTurn: 7, headTurn: -3, fistX: -1, fistY: -3, rearX: -8,
        leftX: -2, leftY: -4, rightX: 3, ear: -2, scarf: 3 },
      lift: { bodyX: 2, bodyY: 3, torsoTurn: -8, headX: 1, headTurn: -5, fistX: -4, fistY: -8,
        fistTurn: -29, rearX: 1, rearY: -2, leftX: -4, rightX: 4, rightY: -2, kneeOut: 3, ear: -3 },
      hit: { bodyX: 4, bodyY: 5, lean: 2, torsoTurn: 13, headX: 1, headY: -2, headTurn: 8,
        fistX: 10, fistY: -3, fistTurn: 14, rearX: -10, rearY: -5, rearTurn: -48,
        leftX: -4, rightX: 6, rightY: -1, kneeOut: 3, ear: -4, scarf: 5 },
      beat: { bodyX: -3, torsoTurn: -17, headTurn: -8, fistX: -9, fistY: 1, fistTurn: -21,
        rearX: 6, rearY: 3, frontElbowX: -2, rightY: 1, leftY: -1, ear: 2, scarf: -2 },
      follow: { bodyX: -1, bodyY: 2, torsoTurn: -8, headTurn: -5, fistX: 1, fistY: -3,
        rearX: -1, rearY: -2, leftX: -3, leftY: -2, rightX: 4, kneeOut: 2, scarf: 2 },
    },
    cloverRimRush: {
      ground: true, primed: true, item: 'disc', itemAngles: [-42, -51, -28, -8, -23, -31, -25, -4],
      wind: { bodyX: 2, torsoTurn: 8, headTurn: -4, fistX: -2, fistY: -1, rearX: -7,
        leftX: -3, leftY: -4, rightX: 4, ear: -2, scarf: 4 },
      lift: { bodyX: 2, bodyY: 3, torsoTurn: 11, headTurn: 3, fistX: -1, fistY: 2, fistTurn: 8,
        rearX: -9, rearY: -3, leftX: -4, rightX: 5, rightY: -2, kneeOut: 3, scarf: 5 },
      hit: { bodyX: 4, bodyY: 5, torsoTurn: 15, headX: 1, headY: 1, headTurn: 8, fistX: 8,
        fistY: 2, fistTurn: 20, rearX: -6, rearY: -3, leftX: -4, rightX: 7, kneeOut: 4, scarf: 4 },
      beat: { bodyX: -1, fistX: -1, fistY: -1, torsoTurn: -4, headTurn: -4, rightX: -1, rearX: 4 },
      follow: { bodyX: 2, bodyY: 3, torsoTurn: 8, headTurn: -2, fistX: 3, fistY: -1,
        rearX: -2, leftX: -3, leftY: -1, rightX: 4, kneeOut: 2, scarf: 2 },
    },
    cloverRimRushPop: {
      ground: true, primed: true, item: 'disc', itemAngles: [-23, -23, -39, -48, -67, -51, -29, -5],
      wind: { bodyX: 3, bodyY: 5, torsoTurn: 11, headX: 1, headY: 1, headTurn: 4, fistX: 7,
        fistY: 1, fistTurn: 20, rearX: -2, rearY: -3, leftX: -4, rightX: 6, kneeOut: 4, scarf: 4 },
      hit: { bodyX: 2, bodyY: -2, torsoTurn: -9, headX: -1, headTurn: -16, shoulderY: -2,
        fistX: 7, fistY: -11, fistTurn: -42, rearX: 2, rearY: -6, leftX: -3, leftY: -3,
        rightX: 5, frontElbowX: 2, ear: -2, scarf: -4 },
      beat: { bodyY: -1, fistX: -3, fistY: -3, headTurn: -5, rightX: 1, rearX: -3, rearY: 2, scarf: 2 },
      follow: { bodyX: 2, torsoTurn: -6, headTurn: -8, fistX: 3, fistY: -7, fistTurn: -35,
        rearX: -3, rearY: -1, leftX: -3, leftY: -2, rightX: 4, kneeOut: 2, scarf: 2 },
    },
    // Tilts stay on a supporting foot. The attack phase holds each contact cel over its active frames.
    pipStampKick: {
      ground: true, sole: 'front',
      wind: { bodyX: -1, bodyY: 1, headTurn: -3, fistY: -4, rearX: -3, rightX: 1, rightY: -3 },
      lift: { bodyX: -2, torsoTurn: -7, headTurn: 3, fistX: -2, fistY: -6, rearX: -3, rearY: -1,
        rightX: 3, rightY: -13, rightFootTurn: 41, frontKneeY: -5, tail: -2 },
      hit: { bodyX: -1, bodyY: -1, torsoTurn: -6, headTurn: 3, headX: 1,
        rightX: 13, rightY: -11, rightFootTurn: 63, frontKneeY: -4, fistX: -2, fistY: -7,
        rearX: -5, rearY: -1, leftX: -1, tail: -2, scarf: 2 },
      beat: { bodyX: 1, torsoTurn: 3, rightX: -1, rightY: 1, rightFootTurn: 8, rearX: 1, ear: 2 },
      follow: { bodyX: -1, torsoTurn: -3, headTurn: 2, rightX: 4, rightY: -8, rightFootTurn: 32,
        frontKneeY: -2, fistY: -4, rearX: -3, leftX: -1 },
    },
    pipChinFlick: {
      ground: true, trackPaws: true, behindHead: true, impactPaw: 'flick',
      wind: { bodyY: 2, torsoTurn: 5, headTurn: 5, fistX: -2, fistY: 1, rearX: -4, rearY: -5 },
      lift: { bodyY: 3, torsoTurn: 8, headX: -1, headTurn: 4, fistX: 3, fistY: 1, fistTurn: 28,
        rearX: -5, rearY: -4, kneeOut: 2 },
      hit: { bodyY: -1, torsoTurn: -5, headX: -3, headTurn: -8, shoulderY: -2, fistX: 3,
        fistY: -19, fistTurn: -7, frontElbowX: 8, rearX: -4, rearY: -2, leftX: -1, rightX: 2, scarf: -2 },
      beat: { fistX: -2, fistY: -3, fistTurn: -14, headTurn: -4, frontElbowX: -2, ear: 1 },
      follow: { torsoTurn: -4, headX: -1, headTurn: -7, fistX: 3, fistY: -11, fistTurn: -16,
        frontElbowX: 4, rearX: -3, rearY: -2, rightX: 2 },
    },
    pipDewclaw: {
      ground: true, trackPaws: true, impactPaw: 'rake', openHands: 'front', openRange: [2, 6],
      wind: { bodyX: -1, bodyY: 2, torsoTurn: -6, headTurn: 4, fistX: -4, rearY: -4, kneeOut: 2 },
      lift: { bodyX: -2, bodyY: 5, torsoTurn: -10, headX: 2, headTurn: 13, fistX: -4, fistY: 1,
        fistTurn: 26, rearX: -1, rearY: -7, kneeOut: 3, leftX: -2, rightX: 2 },
      hit: { bodyX: 1, bodyY: 6, torsoTurn: 18, headX: 1, headY: 1, headTurn: 13, shoulderY: 1,
        fistX: 6, fistY: 2, fistTurn: 4, frontElbowX: -2, rearX: -5, rearY: -8,
        leftX: -2, rightX: 3, kneeOut: 4, scarf: 3 },
      beat: { torsoTurn: -7, fistX: -3, fistY: -1, fistTurn: -21, headTurn: -3, rearY: 2 },
      follow: { bodyY: 3, torsoTurn: 2, headTurn: 7, fistX: -2, fistY: 2, fistTurn: -28,
        rearX: -3, rearY: -4, leftX: -2, rightX: 2, kneeOut: 2 },
    },
    brisketGateCheck: {
      ground: true, trackPaws: true, openHands: 'front', openRange: [1, 5],
      wind: { bodyY: 1, torsoTurn: -5, headTurn: -4, fistX: -3, fistY: -4, rearX: 1, rearY: -2 },
      lift: { bodyX: -2, bodyY: 2, torsoTurn: -11, headX: 1, headTurn: -5, fistX: -4, fistY: -6,
        fistTurn: -32, rearX: 2, rearY: -4, leftX: -2, rightX: 2, kneeOut: 2 },
      hit: { bodyX: 2, bodyY: 1, torsoTurn: 9, headX: -1, headTurn: -6, shoulderY: -2,
        fistX: 12, fistY: -8, fistTurn: 8, frontElbowX: 2, rearX: -4, rearY: -2,
        leftX: -3, rightX: 3, kneeOut: 1 },
      beat: { bodyX: 1, fistX: 2, fistY: 1, fistTurn: 6, torsoTurn: 3, headTurn: 4, rearX: -1 },
      follow: { bodyX: 1, bodyY: 1, torsoTurn: 5, headTurn: -2, fistX: 6, fistY: -4, fistTurn: 8,
        rearX: -2, rearY: -1, leftX: -2, rightX: 2 },
    },
    brisketCrownLift: {
      ground: true, openHands: 'both', openRange: [2, 4],
      wind: { bodyY: 2, headY: 2, headTurn: 9, fistY: -3, rearY: -3, kneeOut: 2 },
      lift: { bodyY: 5, torsoTurn: 6, headX: -1, headY: 3, headTurn: 16, fistX: -2,
        fistY: -5, rearX: -2, rearY: -4, leftX: -2, rightX: 2, kneeOut: 4 },
      hit: { bodyY: -2, torsoTurn: -4, headX: 2, headY: -3, headTurn: -19, shoulderY: 1,
        fistX: 1, fistY: 4, fistTurn: 46, rearX: -13, rearY: 3, rearTurn: -48,
        leftX: -2, rightX: 2, ear: -2 },
      beat: { bodyY: -1, headY: -1, headTurn: -5, rearX: -1, fistX: 1, fistY: 1, ear: 2 },
      follow: { bodyY: -1, headX: 1, headY: -1, headTurn: -12, torsoTurn: -2, fistY: 2,
        fistTurn: 22, rearX: -6, rearY: 1, leftX: -2, rightX: 2 },
    },
    brisketDoorstop: {
      ground: true, sole: 'front',
      wind: { bodyX: -1, torsoTurn: -4, headTurn: 5, rightX: 1, rightY: -4, fistY: -3, rearX: -4 },
      lift: { bodyX: -2, bodyY: -1, torsoTurn: -12, headX: 2, headTurn: 11, rightX: 4,
        rightY: -15, rightFootTurn: 46, frontKneeY: -5, fistX: 1, fistY: -5, rearX: -9, rearY: -4,
        leftX: -2, ear: -2 },
      hit: { bodyX: 3, bodyY: 3, torsoTurn: 9, headX: 1, headY: 1, headTurn: 11,
        rightX: 12, rightFootTurn: 63, frontKneeY: -2, fistX: -3, fistY: -5, fistTurn: -30,
        rearX: -9, rearY: -2, leftX: -2, kneeOut: 3 },
      beat: { bodyY: 1, headY: 1, headTurn: 4, rightFootTurn: 6, fistY: 2, kneeOut: 1, ear: 2 },
      follow: { bodyX: 2, bodyY: 3, torsoTurn: 6, headTurn: 7, rightX: 8, rightFootTurn: 30,
        fistX: -2, fistY: -2, rearX: -5, leftX: -2, kneeOut: 2 },
    },
    noodleKnotPoke: {
      ground: true, item: 'rope', clasp: 'front', itemAngles: [-27, -56, -28, 0, -5, -23, -18, 0],
      wind: { bodyX: -1, headTurn: -3, fistX: -2, fistY: -2, rearX: -2, rearY: -3, rightX: 1 },
      lift: { bodyX: -2, bodyY: 1, torsoTurn: -9, headX: 1, headTurn: -4, fistX: -5,
        fistY: -5, fistTurn: -20, rearX: 1, rearY: -4, leftX: -2, rightX: 2 },
      hit: { bodyX: 2, bodyY: -1, torsoTurn: 7, headX: 1, headTurn: -4, shoulderY: -1,
        fistX: 13, fistY: -6, fistTurn: -8, frontElbowX: 2, rearX: -5, rearY: -2,
        leftX: -2, rightX: 2, ear: -2, scarf: 2 },
      beat: { fistX: 2, fistY: 1, torsoTurn: 2, headTurn: 3, ear: 2 },
      follow: { bodyX: 1, torsoTurn: 3, headTurn: -3, fistX: 5, fistY: -4,
        rearX: -2, rearY: -2, leftX: -1, rightX: 2, scarf: 1 },
    },
    noodleLoopLift: {
      ground: true, item: 'rope', clasp: 'front', bothHands: true, behindHead: true,
      openHands: 'rear', openRange: [2, 5], itemAngles: [28, 62, -32, -85, -104, -62, -29, 0],
      wind: { bodyX: 1, bodyY: 1, headTurn: 6, fistX: 1, fistY: 1, rearX: 2, rearY: 1, kneeOut: 2 },
      lift: { bodyX: 1, bodyY: 3, torsoTurn: 6, headX: -1, headTurn: 8, fistX: 3, fistY: -4,
        fistTurn: 40, rearX: 2, rearY: -1, leftX: -1, rightX: 2, kneeOut: 2 },
      hit: { bodyY: -2, torsoTurn: -5, headX: -2, headTurn: -16, shoulderY: -1,
        fistX: -3, fistY: -18, fistTurn: -66, frontElbowX: 3, rearX: 2, rearY: -6,
        rearTurn: -16, leftX: -1, rightX: 2, ear: -4, scarf: -3 },
      beat: { fistX: -1, fistY: -2, fistTurn: -14, rearX: -1, rearY: -2,
        headTurn: -3, torsoTurn: -2, ear: 3 },
      follow: { bodyY: -1, torsoTurn: -3, headTurn: -8, fistX: -1, fistY: -10, fistTurn: -39,
        rearX: 1, rearY: -4, leftX: -1, rightX: 2, scarf: -1 },
    },
    noodleTailBroom: {
      ground: true, tailType: 'broom', glance: true, glanceRange: [1, 2],
      wind: { bodyX: 1, bodyY: 1, torsoTurn: 7, headTurn: -4, fistX: -1, fistY: -4,
        rearX: -2, rearY: -4, leftX: 1, rightX: -1 },
      lift: { bodyX: -1, bodyY: 3, torsoTurn: 18, headX: -1, headTurn: -8, fistX: 2, fistY: -5,
        rearX: -3, rearY: -5, leftX: 3, rightX: -3, kneeOut: 3, scarf: -3 },
      hit: { bodyX: -1, bodyY: 4, torsoTurn: -14, headX: 2, headY: -2, headTurn: 9,
        fistX: 1, fistY: -7, fistTurn: -20, rearX: -7, rearY: -8, rearTurn: 20,
        leftX: 4, rightX: -4, leftFootTurn: -16, rightFootTurn: 23, kneeOut: 3, scarf: 3 },
      beat: { torsoTurn: -7, headTurn: -5, leftFootTurn: -9, rightFootTurn: 7, fistY: -1,
        rearX: -2, ear: 3, scarf: 3 },
      follow: { bodyY: 2, torsoTurn: -10, headX: 1, headTurn: 4, fistX: 1, fistY: -4,
        rearX: -4, rearY: -4, leftX: 2, rightX: -2, rightFootTurn: 12, kneeOut: 2 },
    },
    cloverOneTwoPass: {
      ground: true, trackPaws: true, rearStrike: true, openHands: 'rear', openRange: [2, 5],
      item: 'disc', itemAngles: [-35, -97, -132, -153, -163, -114, -62, -8],
      wind: { bodyX: -1, torsoTurn: -4, headTurn: -2, fistX: -3, fistY: 2, rearX: -2, rearY: -2 },
      lift: { bodyX: -1, bodyY: 1, torsoTurn: -8, headX: 1, headTurn: -4, fistX: -6,
        fistY: 1, fistTurn: -24, rearX: -2, rearY: -3, leftX: -2, rightX: 2 },
      hit: { bodyX: 1, torsoTurn: 10, headX: -3, headTurn: -6, fistX: -8, fistY: 2, fistTurn: -47,
        rearX: 8, rearY: -1, rearTurn: 10, leftX: -2, rightX: 2, scarf: 2 },
      beat: { torsoTurn: -4, rearX: -1, rearY: 1, fistX: -1, headTurn: 2 },
      follow: { bodyX: 1, torsoTurn: 3, headTurn: -2, fistX: -5, fistY: 1,
        rearX: 2, rearY: -1, leftX: -1, rightX: 1 },
    },
    cloverOneTwoPassFinish: {
      ground: true, primed: true, item: 'disc', itemAngles: [-163, -163, -62, 0, -5, -16, -21, -8],
      wind: { bodyX: 1, torsoTurn: 6, headX: -3, headTurn: -4, fistX: -9, fistY: 2, fistTurn: -47,
        rearX: 7, rearTurn: 10, leftX: -2, rightX: 2, scarf: 2 },
      hit: { bodyX: 1, torsoTurn: 13, headX: -1, headTurn: -4, shoulderY: -1,
        fistX: 3, fistY: -3, fistTurn: -10, rearX: -5, rearY: -3, rearTurn: -18,
        leftX: -2, rightX: 2, scarf: 4 },
      beat: { bodyX: 1, fistX: 2, fistY: -1, fistTurn: -9, torsoTurn: 3, rearX: -1, headTurn: 4 },
      follow: { bodyX: 1, torsoTurn: 7, headTurn: 1, fistX: 2, fistY: -1, fistTurn: -20,
        rearX: -4, rearY: -2, leftX: -2, rightX: 2, scarf: 2 },
    },
    cloverCanopyTap: {
      ground: true, item: 'disc', behindHead: true, itemAngles: [-29, -40, -25, 4, -3, -13, -18, -6],
      wind: { bodyY: 1, headTurn: 5, fistX: -1, fistY: -2, rearX: -2, rearY: -3, kneeOut: 1 },
      lift: { bodyY: 3, torsoTurn: 7, headX: 1, headTurn: 3, fistX: -3, fistY: -5,
        fistTurn: -24, rearX: -3, rearY: -3, leftX: -1, rightX: 2, kneeOut: 2 },
      hit: { bodyY: -1, torsoTurn: -3, headX: 2, headTurn: -16, shoulderY: -2, fistX: -13,
        fistY: -27, fistTurn: -65, frontElbowX: -13, rearX: 1, rearY: -4,
        leftX: -1, rightX: 2, scarf: -2 },
      beat: { fistX: -1, fistY: -2, fistTurn: -6, frontElbowX: -1, headTurn: -4, rearY: -1, ear: 2 },
      follow: { torsoTurn: -3, headX: 1, headTurn: -9, fistX: -8, fistY: -15, fistTurn: -38,
        frontElbowX: -7, rearY: -3, leftX: -1, rightX: 2 },
    },
    cloverBackspin: {
      ground: true, item: 'disc', itemAngles: [17, 38, 147, 172, -174, -156, -92, -8],
      wind: { bodyY: 2, torsoTurn: 5, headTurn: 2, fistX: 4, fistY: 1,
        rearX: -4, rearY: -3, leftX: -2, rightX: 2 },
      lift: { bodyX: 1, bodyY: 4, torsoTurn: 13, headX: -1, headTurn: 7, fistX: 10, fistY: 1,
        fistTurn: 41, rearX: -8, rearY: -6, leftX: -2, rightX: 3, kneeOut: 3, scarf: -3 },
      hit: { bodyX: 2, bodyY: 5, torsoTurn: 11, headX: 1, headTurn: 8, fistX: 21, fistY: 1,
        fistTurn: 133, rearX: -7, rearY: -6, rearTurn: -34, leftX: -2, rightX: 3, kneeOut: 3 },
      beat: { bodyX: -1, torsoTurn: -16, headTurn: -5, fistX: -10, fistY: 1,
        fistTurn: 31, rearX: 3, rearY: 2, scarf: 4 },
      follow: { bodyX: -1, bodyY: 3, torsoTurn: -12, headX: 1, headTurn: -3, fistX: -8,
        fistY: 2, fistTurn: 146, rearX: 2, rearY: -2, leftX: -2, rightX: 3, kneeOut: 2, scarf: 3 },
    },
    // The lip coordinates are in sprite pixels for stand-alone sheets.
    // In a match the supporting wrists follow the ledgePosition for each climb frame.
    pipRailKick: {
      ground: true, primed: true, trackPaws: true, sole: 'both', openHands: 'rear', openRange: [1, 5],
      lip: { startup: 7, active: 5, front: 8, rear: -1, plantCel: 5,
        preview: [[7, -23], [6, -20], [5, -16], [5, -13], [2, -10], [0, -8], [-2, -5], [-4, -2], [-6, -2]] },
      wind: { bodyX: -7, bodyY: 8, lean: -3, torsoTurn: -4, headX: -2, headY: 2, headTurn: -9,
        rearX: 4, rearY: -9, rearTurn: -6, leftX: -3, leftY: 7, leftFootTurn: 19,
        rightX: -8, rightY: 5, rightFootTurn: 13, scarf: 2 },
      lift: { bodyX: -4, bodyY: 3, torsoTurn: -16, headX: -2, headTurn: -13,
        rearX: -7, rearY: -8, rearTurn: -43, leftX: 3, leftY: -2, leftFootTurn: 25,
        rightX: -1, rightY: -7, rightFootTurn: 45, frontKneeY: -4, ear: -2, scarf: 4 },
      hit: { bodyX: -3, bodyY: -1, torsoTurn: -22, headX: -1, headTurn: 6,
        fistX: -13, fistY: 12, fistTurn: 35, rearX: -9, rearY: -7, rearTurn: -52,
        leftX: 19, leftY: -10, leftFootTurn: 41, rightX: 11, rightY: -6, rightFootTurn: 55,
        frontKneeY: -5, kneeOut: 2, ear: -3, scarf: 5 },
      beat: { bodyX: 2, bodyY: 1, torsoTurn: 11, headTurn: 4, fistY: -4, rearX: 2,
        leftX: 3, leftY: 2, rightX: 2, rightY: 2, rightFootTurn: 9, ear: 2 },
      follow: { bodyX: 2, bodyY: 3, torsoTurn: 9, headX: 1, headTurn: 8, fistX: -3, fistY: 1,
        rearX: -5, rearY: -2, leftX: 2, rightX: 6, rightFootTurn: 17, kneeOut: 4, scarf: 2 },
    },
    brisketPorchBump: {
      ground: true, primed: true, trackPaws: true, shoulderDrive: [0, 0, 2, 4, 6, 2, 0, 0],
      lip: { startup: 13, active: 6, front: 6, rear: 12, plantCel: 3,
        preview: [[7, -23], [6, -21], [6, -20], [5, -18], [5, -16], [4, -14], [3, -13], [2, -11], [0, -9], [-1, -8], [-2, -6], [-4, -4], [-6, -2]] },
      wind: { bodyX: -7, bodyY: 8, lean: -3, torsoTurn: -4, headX: -2, headY: 2, headTurn: -9,
        leftX: -3, leftY: 7, leftFootTurn: 19, rightX: -8, rightY: 5, rightFootTurn: 13 },
      lift: { bodyX: -6, bodyY: 5, lean: -1, torsoTurn: -9, headX: -1, headY: 1, headTurn: -14,
        fistX: 3, fistY: -6, fistTurn: -16, leftX: -4, leftY: 5, rightX: 1, rightY: -4,
        rightFootTurn: 28, frontKneeY: -3, ear: -2 },
      hit: { bodyX: 1, bodyY: 2, lean: 1, torsoTurn: 14, headX: -2, headY: 1, headTurn: -6,
        shoulderY: -4, fistX: -5, fistY: 3, fistTurn: 38, rearX: -15, rearY: 8, rearTurn: 52,
        leftX: -2, leftY: -4, leftFootTurn: 22, rightX: 3, kneeOut: 3 },
      beat: { bodyX: 2, bodyY: 1, torsoTurn: 5, headTurn: 5, shoulderY: 1, rearX: 3, rearY: -4,
        leftX: 5, leftY: 4, leftFootTurn: -16, rightX: 2, ear: 2 },
      follow: { bodyX: 2, bodyY: 3, torsoTurn: 8, headTurn: 5, shoulderY: -1, fistX: -3,
        fistY: 1, fistTurn: 14, rearX: -5, rearY: 1, leftX: 1, rightX: 4, kneeOut: 3 },
    },
    noodleLatchWhip: {
      ground: true, primed: true, trackPaws: true, item: 'rope', clasp: 'front',
      itemAngles: [-36, -62, -27, -4, -19, -33, -19, 0],
      lip: { startup: 9, active: 6, front: -1, rear: 14, plantCel: 5,
        preview: [[7, -23], [6, -21], [6, -19], [5, -17], [5, -14], [4, -13], [4, -11], [3, -10], [2, -8], [2, -7], [0, -6], [-1, -6], [-2, -5], [-3, -4], [-5, -4]] },
      wind: { bodyX: -7, bodyY: 8, lean: -3, torsoTurn: -4, headX: -2, headY: 2, headTurn: -9,
        fistX: 1, fistY: -8, fistTurn: -20, leftX: -3, leftY: 7, leftFootTurn: 19,
        rightX: -8, rightY: 5, rightFootTurn: 13, scarf: 2 },
      lift: { bodyX: -5, bodyY: 5, torsoTurn: -12, headX: 1, headTurn: -9,
        fistX: -3, fistY: -11, fistTurn: -42, leftX: -2, leftY: 6, rightX: 3, rightY: -4,
        rightFootTurn: 27, kneeOut: 2, ear: -4, scarf: 4 },
      hit: { bodyX: 1, bodyY: 1, lean: 1, torsoTurn: 7, headX: 1, headTurn: -6,
        fistX: 11, fistY: -5, fistTurn: -8, frontElbowX: 2, rearX: -10, rearY: 7,
        leftX: -2, leftY: 3, leftFootTurn: 20, rightX: 7, rightY: -7, rightFootTurn: 16,
        kneeOut: 2, ear: -4, scarf: 5 },
      beat: { bodyX: -2, torsoTurn: -12, headTurn: 8, fistX: -7, fistY: -1, fistTurn: -13,
        leftX: 5, leftY: -5, rightY: 2, ear: 2, scarf: -2 },
      follow: { bodyY: 2, torsoTurn: -5, headTurn: -3, fistX: 1, fistY: -3, fistTurn: -18,
        rearX: -4, rearY: 2, leftX: 1, rightX: 4, kneeOut: 2, scarf: 1 },
    },
    cloverRimVault: {
      ground: true, primed: true, trackPaws: true, item: 'disc',
      itemAngles: [-53, -13, 18, -8, 1, -18, -23, -6],
      lip: { startup: 10, active: 5, front: -1, rear: 9, plantCel: 5,
        preview: [[7, -23], [6, -21], [5, -18], [4, -16], [4, -13], [2, -10], [0, -7], [-2, -3], [-4, 0], [-7, 3]] },
      wind: { bodyX: -7, bodyY: 8, lean: -3, torsoTurn: -4, headX: -2, headY: 2, headTurn: -9,
        fistX: 1, fistY: -4, fistTurn: -27, leftX: -3, leftY: 7, leftFootTurn: 19,
        rightX: -8, rightY: 5, rightFootTurn: 13, scarf: 2 },
      lift: { bodyX: -4, bodyY: 3, torsoTurn: -11, headX: 1, headTurn: -8,
        fistX: 3, fistY: 1, fistTurn: 10, leftX: -2, leftY: 1, rightX: 2, rightY: -7,
        rightFootTurn: 27, frontKneeY: -4, ear: -2, scarf: 4 },
      hit: { bodyX: 1, bodyY: -1, torsoTurn: -11, headX: -2, headY: 1, headTurn: -12,
        fistX: -3, fistY: -7, fistTurn: -37, frontElbowX: 2, rearX: -18, rearY: 17, rearTurn: 55,
        leftX: 3, leftY: -3, leftFootTurn: 20, rightX: 7, rightY: -10, rightFootTurn: -24,
        frontKneeY: -4, scarf: -2 },
      beat: { bodyX: 1, bodyY: -1, torsoTurn: -3, headTurn: -4, fistX: 1, fistY: -4,
        fistTurn: -12, rearX: 2, rearY: -4, leftY: -1, rightY: 2, scarf: 3 },
      follow: { bodyX: 1, bodyY: 3, torsoTurn: 7, headTurn: 6, fistX: 2, fistY: -1, fistTurn: -16,
        rearX: -6, rearY: 1, leftX: 1, rightX: 5, kneeOut: 4, scarf: 2 },
    },
  };

  const specials = { pip: 'pounce', brisket: 'shoulder', noodle: 'cast', clover: 'disc' };
  kitMoves.brisketCarryWalk = kitMoves.brisketShoulderCarry;
  const captiveLoops = ['grappled', 'grappledHigh', 'shouldered'];
  const captiveFlinches = ['grappledFlinch', 'grappledHighFlinch'];
  const captivePoses = [...captiveLoops, ...captiveFlinches];
  const landingPoses = ['tumble', 'tech', 'techRoll', 'downed', 'jabLock', 'floorRise', 'floorAttack'];
  const shieldPoses = ['shieldRoll', 'spotDodge', 'parry'];
  const airDodgePoses = ['neutralAirDodge', 'directionalAirDodge'];
  const diagonal = Math.SQRT1_2;
  const airDirections = [
    [1, 0], [diagonal, diagonal], [0, 1], [-diagonal, diagonal],
    [-1, 0], [-diagonal, -diagonal], [0, -1], [diagonal, -diagonal],
  ];
  const aerialStyles = {
    pip: {
      neutral: [24, 2, 11], directional: [34, 3, 13], travel: [3, 16],
      recoil: [-3, -8, -19, -26, -14, 3, 11, 7, 2, 0],
    },
    brisket: {
      neutral: [32, 4, 18], directional: [45, 5, 20], travel: [5, 23],
      recoil: [0, -4, -9, -14, -12, -5, 4, 5, 2, 0],
    },
    noodle: {
      neutral: [28, 3, 14], directional: [40, 4, 15], travel: [4, 21],
      recoil: [3, 6, 14, 22, 13, -3, -10, -7, -2, 0],
    },
    clover: {
      neutral: [26, 3, 13], directional: [36, 3, 14], travel: [3, 18],
      recoil: [-2, -7, -15, -20, -13, -2, 7, 6, 2, 0],
    },
  };
  const wallPoses = ['wallTech', 'wallTechJump', 'wallBounce'];
  const sharedPointPoses = ['floorAttack', 'parry', 'ledgeRoll', 'ledgeClimb', 'ledgeTrump', ...wallPoses];
  const wallStyles = {
    pip: { width: 23, height: 70, farY: -7, turn: [-26, -71, -117, -165] },
    brisket: { width: 31, height: 69, farY: 7, turn: [-19, -51, -90, -132] },
    noodle: { width: 29, height: 62, farY: -6, turn: [-30, -76, -125, -179] },
    clover: { width: 25, height: 77, farY: -8, turn: [-24, -66, -112, -161] },
  };
  const ledgeRollStyles = {
    pip: {
      total: 23, safe: [2, 12], plant: 6, arrive: 16, distance: 96, front: 5, rear: 1,
      turn: [31, 91, 155, 217, 267, 310, 341], height: [0.92, 0.88, 0.83, 0.85, 0.91, 0.94, 0.98],
    },
    brisket: {
      total: 36, safe: [4, 19], plant: 10, arrive: 24, distance: 113, front: 4, rear: 9,
      turn: [25, 65, 121, 176, 225, 274, 324], height: [0.86, 0.79, 0.75, 0.77, 0.82, 0.87, 0.93],
    },
    noodle: {
      total: 39, safe: [3, 15], plant: 7, arrive: 23, distance: 153, front: 2, rear: 6,
      turn: [37, 92, 149, 201, 250, 292, 331], height: [0.8, 0.73, 0.64, 0.67, 0.71, 0.78, 0.86],
    },
    clover: {
      total: 29, safe: [3, 14], plant: 7, arrive: 21, distance: 125, front: 1, rear: 6,
      turn: [35, 102, 161, 205, 247, 300, 342], height: [1, 0.97, 0.93, 0.91, 0.96, 0.99, 1],
    },
  };

  function ledgeRollTiming(name) {
    return window.DogFight?.kits?.[name]?.ledgeRoll || ledgeRollStyles[name];
  }

  function ledgeRollFrame(name, phase) {
    const timing = ledgeRollTiming(name);
    const tick = Math.min(timing.total - 1, Math.floor(phase * timing.total + 1e-7));
    // Moving wrists need every climb tick. The planted sequence shares seven spinning and five recovery cels.
    if (tick < timing.plant) return tick;
    const last = timing.safe[1];
    if (tick <= last) return timing.plant + Math.floor(4 * (tick - timing.plant) / (last - timing.plant + 1));
    if (tick < timing.arrive)
      return timing.plant + 4 + Math.floor(3 * (tick - last - 1) / (timing.arrive - last - 1));
    const recovery = (tick - timing.arrive) / (timing.total - 1 - timing.arrive);
    return timing.plant + 7 + Math.min(4, Math.floor(recovery * 4));
  }
  const shieldStyles = {
    pip: {
      roll: [24, 2, 11], spot: [18, 2, 9],
      turn: [0, 13, 57, 136, 224, 298, 329, 348, -4, 0],
      height: [1, 1, 0.92, 0.86, 0.88, 0.93, 0.95, 1, 1, 1],
      sway: [0, -3, -17, -29, -21, -8, 5, 2, -1, 0],
      slipX: [0, -1, -4, -6, -4, -2, 2, 1, 0, 0], depth: [0, 1, 3, 4, 5, 3, 2, 1, 0, 0],
      parryX: [6, 8, 6, 2, 0, -2, -1, 0], parryY: [-2, -4, -8, -11, -8, -4, -2, 0],
      palm: [-8, -21, -43, -71, -59, -39, -19, -5],
    },
    brisket: {
      roll: [32, 4, 17], spot: [25, 3, 15],
      turn: [0, 8, 37, 101, 177, 243, 295, 328, -8, 0],
      height: [1, 1, 0.92, 0.79, 0.79, 0.85, 0.91, 0.97, 1, 1],
      sway: [0, -4, -13, -22, -29, -20, -8, 4, 2, 0],
      slipX: [0, -1, -3, -5, -6, -5, -3, 1, 1, 0], depth: [0, 1, 2, 3, 3, 4, 3, 2, 1, 0],
      parryX: [4, 5, 6, 5, 3, 2, 1, 0], parryY: [-2, -3, -5, -6, -4, -3, -1, 0],
      palm: [-16, -24, -41, -53, -49, -34, -18, -4],
    },
    noodle: {
      roll: [30, 3, 15], spot: [22, 2, 12],
      turn: [0, 9, 41, 111, 190, 267, 309, 341, -5, 0],
      height: [1, 1, 0.83, 0.68, 0.65, 0.72, 0.83, 0.94, 1, 1],
      sway: [0, -3, -9, -14, -7, 5, 7, 2, 0, 0],
      slipX: [0, -1, -3, -5, -5, -3, 1, 2, 1, 0], depth: [0, 2, 5, 7, 7, 5, 3, 2, 1, 0],
      parryX: [5, 7, 8, 5, 2, -1, -1, 0], parryY: [0, -3, -5, -9, -7, -4, -1, 0],
      palm: [8, -8, -26, -59, -53, -32, -14, -2],
    },
    clover: {
      roll: [26, 3, 13], spot: [20, 2, 11],
      turn: [0, 17, 64, 148, 235, 306, 337, 352, -3, 0],
      height: [1, 1, 0.94, 0.86, 0.89, 0.95, 0.97, 1, 1, 1],
      sway: [0, -4, -17, -30, -32, -16, -6, 4, 1, 0],
      slipX: [0, -1, -3, -5, -6, -4, -2, 1, 1, 0], depth: [0, 1, 2, 2, 3, 2, 1, 1, 0, 0],
      parryX: [1, 3, 5, 4, 2, 0, -1, -1], parryY: [-2, -3, -5, -7, -6, -3, -1, 0],
      palm: [-33, -46, -62, -73, -54, -34, -13, 2],
    },
  };

  const landingStyles = {
    pip: {
      air: [-18, 25, 79, 132, 181, 230, 276, 313], roll: [14, 52, 108, 162, 227, 298, 339, 360],
      slap: [-14, -23, -13, -5, 4, 2, 0, 0], cheek: [6, 13, 7], hips: -1, spring: 4,
    },
    brisket: {
      air: [-28, 11, 54, 114, 178, 231, 267, 299], roll: [16, 43, 88, 142, 209, 284, 329, 360],
      slap: [-21, -31, -20, -12, -4, 2, 0, 0], cheek: [5, 12, 6], hips: -1, spring: 2,
    },
    noodle: {
      air: [-25, 8, 61, 123, 180, 226, 263, 298], roll: [11, 40, 96, 155, 221, 287, 336, 360],
      slap: [-9, -19, -14, -7, 2, 3, 0, 0], cheek: [8, 12, 4], hips: -2, spring: 3,
    },
    clover: {
      air: [-11, 33, 83, 141, 200, 247, 287, 322], roll: [18, 59, 116, 171, 234, 305, 344, 360],
      slap: [-14, -25, -15, -4, 8, 3, 0, 0], cheek: [7, 14, 7], hips: -1, spring: 4,
    },
  };
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

  // The supporting foot stays planted while the striking limb follows the player's aim.
  const tiltLimbs = {
    cloverLineDrive: { fistY:14, shoulderY:4, fistTurn:22, torsoTurn:8, headTurn:5, rearY:-5 },
    pipStampKick: { rightY:10, frontKneeY:4, rightFootTurn:-23, torsoTurn:4, headTurn:3 },
    brisketGateCheck: { fistY:12, shoulderY:2, fistTurn:19, bodyY:2, headTurn:4 },
    noodleKnotPoke: { fistY:8, shoulderY:2, fistTurn:18, headTurn:4 },
    cloverOneTwoPass: { rearY:10, rearTurn:14, headTurn:3 },
    cloverOneTwoPassFinish: { fistY:12, fistTurn:18, shoulderY:2, headTurn:4 },
  };
  for (const [pose, limbs] of Object.entries(tiltLimbs)) {
    for (const dir of [-1,1]) kitMoves[pose + (dir < 0 ? 'High' : 'Low')] = {
      ...kitMoves[pose], tiltLimbs:limbs, tiltAngle:dir,
    };
  }

  function kitStance(s, name, pose, frame) {
    const move = kitMoves[pose];
    const grounded = move.ground || move.smash;
    const holdWind = move.holdWind || move.smash;
    if (move.base) strikeStance(s, name, move.base, [0, 0, 1, 2, 2, 3, 4, 5][frame]);
    const addKey = (key, amount) => {
      if (!key) return;
      for (const [part, offset] of Object.entries(key)) s[part] += Math.round(offset * amount);
    };
    if (move.fromHold) addKey(kitMoves[move.fromHold].hold, 1);
    if (pose === 'brisketCarryWalk') {
      const stride = [0,2,4,3,0,-2,-4,-3][frame];
      s.leftX += stride; s.rightX -= stride;
      s.leftY -= Math.max(0,stride); s.rightY += Math.min(0,stride);
      s.bodyY -= Math.abs(stride)>2 ? 1 : 0;
    }
    if (move.fromHold && frame < 3) {
      addKey(move.wind, [0, 0.7, 1][frame]);
    } else if (move.hold) {
      addKey(move.hold, 1);
      addKey(move.tug, [0, 0.28, 0.65, 1, 0.75, 0.44, 0.2, 0][frame]);
    } else if (frame === 1 && move.lift) addKey(move.lift, 1);
    else if (frame < 2) addKey(move.wind, frame === 0 && !move.primed && !move.smash ? 0.65 : 1);
    else if (frame === 2) {
      addKey(move.lift || move.wind, holdWind ? 1 : 0.38);
      if (!holdWind) addKey(move.hit, 0.62);
    } else if (frame < 5) {
      addKey(move.hit, 1);
      if (frame === 4) addKey(move.beat, 1);
    } else if (frame < 7) addKey(move.follow, frame === 5 ? 1 : 0.43);
    else addKey(move.rest, 1);
    if (move.tiltLimbs) addKey(move.tiltLimbs, move.tiltAngle * [0.12,.38,.75,1,1,.68,.24,0][frame]);
    s.guardFloor = !!(grounded || move.sail || (move.floorWind && (frame < 2 || (holdWind && frame === 2))));
    if (move.lip) s.guardFloor = frame >= move.lip.plantCel;
    if (!grounded && !move.sail && frame >= 6) {
      s.leftY -= 3;
      s.rightY -= 2;
      s.fistY -= 2;
    }
    const driving = !!(move.hold || move.fromHold) || (frame >= (move.smash ? 3 : move.lift ? 1 : 2) && frame <= 5);
    if (!move.base) {
      const drag = (move.hold ? [0, 1, 2, 1, 0, -1, -2, -1] : [move.fromHold ? 0 : 1, 2, -1, -3, -4, -2, 2, 0])[frame];
      s.ear += name === 'noodle' ? 2 * drag : drag;
      s.tail += drag;
      s.scarf -= drag;
      s.powerArm = driving && !move.sole && (!move.clasp || name === 'brisket');
    }
    s.roll = move.roll ? move.roll[frame] : 0;
    if (move.floorRoll && s.roll) {
      s.floorRoll = true;
      s.guardFloor = false;
    }
    if (move.impactPaw && (frame === 3 || frame === 4)) s.impactPaw = impactPaws[move.impactPaw];
    s.heldItem = move.releases && frame >= 3 ? null : move.item || null;
    s.heldAngle = move.itemAngles ? move.itemAngles[frame] : 0;
    if (move.item || move.emptyGear || move.sail) {
      s.palmCharm = false;
      s.hideCharm = true;
      if (move.item === 'backDisc') s.reverseArm = true;
    }
    if (move.openHands && frame >= move.openRange[0] && frame <= move.openRange[1]) s.openHands = move.openHands;
    if (move.clasp && (!move.claspRange || (frame >= move.claspRange[0] && frame <= move.claspRange[1]))) {
      s.clasp = move.clasp;
    }
    if (move.bark) s.barkJaw = frame === 3 ? 2 : frame === 4 ? 1 : 0;
    if (move.bark || move.sail || move.shoulderDrive || move.crossedGuard || pose === 'noodleTripLine') s.powerArm = false;
    if (move.crossedGuard && frame >= 1 && frame < 7) s.reverseArm = true;
    if (move.rearStrike && (frame === 3 || frame === 4)) s.reverseArm = true;
    if ((pose === 'noodleLasso' || pose === 'noodleReelLedge') && driving) {
      s.grip = true;
      s.twoHandsFront = true;
      s.powerArm = false;
    }
    if ((move.sail || move.bothHands) && driving) s.twoHandsFront = true;
    s.behindHead = !!move.behindHead && driving;
    s.rideDisc = !!move.sail;
    if (move.sole) {
      s.soleSide = move.sole;
      s.showSole = driving;
      s.kickFront = move.sole !== 'rear';
      s.kickRear = move.sole !== 'front';
    }
    const glanceRange = move.glanceRange || [3, 5];
    s.glanceBack = !!move.glance && frame >= glanceRange[0] && frame <= glanceRange[1];
    if (move.pivot) {
      s.brakeHeel = frame < 6;
      s.glanceBack = frame === 0;
    }
    s.extraHaunch = !!move.haunch && frame > 0 && frame < 7;
    if (move.shoulderDrive) s.shoulderLead = move.shoulderDrive[frame];
    s.bellyFirst = !!move.belly && frame >= 2 && frame < 6;
    s.tailType = move.tailType || null;
    s.kitFrame = frame;
  }

  function actionCel(pose, phase) {
    if (phase < 0.12) return 0;
    if (phase < 0.24) return 1;
    if (phase < 0.4) return 2;
    if (phase < (kitMoves[pose]?.lateContactPhase || 0.54)) return 3;
    if (phase < 0.68) return 4;
    if (phase < 0.83) return 5;
    if (phase < 0.95) return 6;
    return 7;
  }

  function shieldFrame(name, pose, phase, backRoll) {
    if (pose === 'parry') return Math.min(7, Math.floor(phase * 8));
    const rolling = pose === 'shieldRoll';
    const key = rolling ? 'roll' : 'spot';
    const timing = window.DogFight?.kits?.[name]?.defense?.[key] || shieldStyles[name][key];
    const [length, first, last] = timing;
    const total = length + (rolling && backRoll ? 2 : 0);
    const tick = Math.min(total, Math.floor(phase * total + 1e-7));
    if (tick < first) return Math.floor(2 * tick / first);
    if (tick <= last) return 2 + Math.floor(4 * (tick - first) / (last - first + 1));
    if (tick >= total - 1) return 9;
    return 6 + Math.min(2, Math.floor(3 * (tick - last - 1) / (total - last - 2)));
  }

  function frameNumber(pose, time, phase, name = 'pip', backRoll = false) {
    const tick = (period) => Math.floor((Math.abs(time) % 1000000) * period);
    if (pose === 'ledgeRoll') return ledgeRollFrame(name, phase);
    if (pose === 'ledgeClimb') return Math.round(phase * (window.DogFight?.kits[name].ledgeClimb.total || 26));
    if (pose === 'ledgeTrump') return Math.min(5, Math.round(phase * 5 + 1e-7));
    if (wallPoses.includes(pose)) {
      const total = pose === 'wallTech' ? 10 : pose === 'wallTechJump' ? 8 : 6;
      const tick = Math.min(total - 1, Math.floor(phase * total + 1e-7));
      if (pose === 'wallTech') return [0, 1, 1, 2, 2, 2, 3, 3, 4, 4][tick];
      if (pose === 'wallTechJump') return [0, 1, 2, 2, 3, 4, 4, 5][tick];
      return tick;
    }
    if (airDodgePoses.includes(pose)) {
      const directed = pose === 'directionalAirDodge';
      const spec = window.DogFight?.kits?.[name]?.airDodge || aerialStyles[name];
      const [total, first, last] = spec[directed ? 'directional' : 'neutral'];
      const elapsed = Math.min(total, Math.floor(phase * total + 1e-7));
      if (elapsed < first) return Math.floor(2 * elapsed / first);
      if (elapsed <= last) return 2 + Math.floor(4 * (elapsed - first) / (last - first + 1));
      if (directed && elapsed <= spec.travel[1]) return 6;
      const release = (directed ? spec.travel[1] : last) + 1;
      const firstCel = directed ? 7 : 6;
      return firstCel + Math.min(10 - firstCel, Math.floor((elapsed - release) * (11 - firstCel) / (total - release)));
    }
    if (shieldPoses.includes(pose)) return shieldFrame(name, pose, phase, backRoll);
    if (pose === 'clashRecoil' || pose === 'crouchHit') return Math.min(3, Math.floor(phase * 4));
    if (pose === 'dizzy') return tick(6) % 4;
    if (pose === 'tumble') return tick(14) % 8;
    if (pose === 'righting' || pose === 'footstool') return Math.min(3, Math.floor(phase * 4));
    if (pose === 'jabLock') {
      if (phase < 0.40) return Math.min(3, Math.floor(phase * 10));
      return phase < 0.70 ? 4 : phase < 0.86 ? 5 : 6;
    }
    if (pose === 'downed') {
      if (phase < 0.13) return 0;
      if (phase < 0.33) return 1;
      if (phase < 0.53) return 2;
      if (phase < 0.75) return 3;
      if (phase < 1) return 4;
      return 5 + (tick(2) % 2);
    }
    if (pose === 'tech' || pose === 'techRoll' || pose === 'floorRise')
      return Math.min(7, Math.floor(phase * 8));
    if (pose === 'floorAttack') return actionCel(pose, phase);
    if (captiveLoops.includes(pose) || kitMoves[pose]?.hold) return Math.floor(phase * 8) % 8;
    const lip = kitMoves[pose]?.lip;
    if (lip && phase <= 0.65) {
      const elapsed = phase < 0.4 ? Math.min(lip.startup - 1, Math.round(lip.startup * phase / 0.39)) :
        lip.startup + Math.round(lip.active * (phase - 0.4) / 0.25);
      // Each simulation tick that still bears weight on the rail gets one cached drawing.
      if (elapsed < lip.preview.length) return 8 + elapsed;
    }
    if (Object.prototype.hasOwnProperty.call(kitMoves, pose) || captiveFlinches.includes(pose))
      return actionCel(pose, phase);
    if (pose === 'walk') return tick(8) % 6;
    if (pose === 'teeter') return tick(5) % 6;
    if (pose === 'crouch') return tick(3) % 2;
    if (pose === 'crawl') return Math.min(5, Math.floor(phase * 6 + 1e-6));
    if (pose === 'dashStart') return Math.min(2, Math.floor(phase * 3));
    if (pose === 'run') return tick(12) % 6;
    if (pose === 'win') return tick(6) % 4;
    if (pose === 'idle') {
      if (tick(9) % 47 === 45) return 2;
      return tick(2.8) % 2;
    }
    if (pose === 'ledge') return tick(3) % 4;
    if (pose === 'jumpSquat' || pose === 'turnJumpSquat' || pose === 'backDrift') return Math.min(2, Math.round(phase * 2));
    if (pose === 'rise') return phase < 0.2 ? 0 : 1 + (tick(10) % 3);
    if (pose === 'jump' || pose === 'fall') return phase < 0.3 ? 0 : phase < 0.72 ? 1 : 2;
    if (pose === 'hurt' || pose === 'launch') return Math.min(3, Math.floor(phase * 4));
    if (pose === 'land' || pose === 'skid' || pose === 'waveland' || pose === 'wavelandBack') {
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

  function captiveStance(s, name, high, frame) {
    const pull = [0, 1, 2, 2, 1, 0, -1, -1][frame];
    const step = [0, -1, -2, -1, 0, 1, 2, 1][frame];
    const heavy = name === 'brisket';
    s.bodyX = high ? -1 : -2 - pull;
    s.bodyY = high ? -2 : 1 + Math.max(0, pull);
    s.headX = high ? 1 : -1;
    s.headY = high ? 2 : -1;
    s.headTurn = high ? -12 + 4 * step : -7 - 3 * pull;
    s.torsoTurn = high ? 10 + 2 * step : -13 - 4 * pull;
    s.kneeOut = (heavy ? 3 : 2) + Math.max(0, pull);
    s.frontKneeY = high ? -3 : -1;
    s.leftX = high ? 5 + step : -4;
    s.leftY = high ? -6 - Math.max(0, pull) : 0;
    s.leftFootTurn = high ? 25 - step * 6 : 0;
    s.rightX = high ? 5 - step : 4 + step;
    s.rightY = high ? -12 + step + (heavy ? 2 : 0) : -2 + Math.min(0, step);
    s.rightFootTurn = high ? -43 + step * 6 : -11 + step * 3;
    s.fistX = high ? 4 + step : 4 + pull;
    s.fistY = high ? -10 + step : -6 - pull;
    s.fistTurn = high ? -45 + 7 * step : -23 - 3 * pull;
    s.rearX = high ? -8 - step : -1 + pull;
    s.rearY = high ? -9 - step : -5;
    s.rearTurn = high ? -82 - 7 * step : 24;
    s.ear = (name === 'noodle' ? 3 : 2) * step;
    s.tail = step * 2;
    s.scarf = -3 + step;
    s.charmTurn = high ? 17 + 6 * step : -8 + 3 * pull;
    s.openHands = high ? 'both' : 'front';
    s.clasp = high ? null : 'rear';
    s.guardFloor = !high;
    if (high) {
      s.showSole = true;
      s.kickFront = true;
      s.roll = [-7, -4, 0, 4, 6, 2, -3, -7][frame];
      if (frame === 2 || frame === 3) s.eye = startledEyes;
    } else if (frame === 3) s.eye = shutEyes;
  }

  function flinchStance(s, name, high, frame) {
    // The holder supplies the body's travel. Keep one heel planted, or both knees tucked aloft.
    captiveStance(s, name, high, [0, 1, 1, 1, 1, 1, 0, 0][frame]);
    const jolt = [0, 0, 0, 3, 2, 1, -1, 0][frame];
    s.bodyX -= Math.round(jolt * 0.65);
    s.bodyY += Math.round(jolt * 0.5);
    s.headX -= jolt;
    s.headY -= Math.round(jolt * 0.5);
    s.torsoTurn -= 2 * jolt;
    s.headTurn -= 5 * jolt;
    s.fistX -= jolt;
    s.fistY -= 2 * jolt;
    s.rearX -= jolt;
    s.rearY -= jolt;
    s.rightY -= jolt;
    s.ear -= jolt * (name === 'noodle' ? 2 : 1);
    s.tail += jolt;
    s.scarf += 2 * jolt;
    if (high) s.roll -= 2 * jolt;
    if (frame === 3) s.eye = shutEyes;
  }

  function spinningStance(s, name, pose, frame) {
    const style = landingStyles[name];
    const rolling = pose === 'techRoll';
    const fold = (rolling ? [1, 3, 5, 6, 4, 2, 0, 0] : [0, 2, 4, 5, 4, 2, 1, 0])[frame];
    const flare = [2, 1, -1, -3, -2, 0, 3, 2][frame];
    if (rolling && frame === 7) {
      s.guardFloor = true;
      return;
    }
    s.roll = (rolling ? style.roll : style.air)[frame];
    s.floorRoll = rolling;
    s.bodyY = 1 + Math.round(fold / 2);
    s.torsoTurn = rolling ? 11 + fold : -14 - fold;
    s.headX = -1 - Math.floor(fold / 2);
    s.headY = 1 + fold;
    s.headTurn = rolling ? 5 + 3 * fold : -17 + 4 * fold;
    s.shoulderY = -1;
    s.fistX = (rolling ? 6 : 3) - 2 * fold;
    s.fistY = (rolling ? 4 : -3) - 2 * fold;
    s.fistTurn = -20 - 9 * fold;
    s.rearX = -8 + fold;
    s.rearY = -1 - 2 * fold;
    s.rearTurn = -13 - 7 * fold;
    s.leftX = (rolling ? -2 : 1) + fold;
    s.leftY = -1 - 2 * fold;
    s.leftFootTurn = -13 + 7 * fold;
    s.rightX = 6 - fold;
    s.rightY = -3 - 2 * fold;
    s.rightFootTurn = 22 + 8 * fold;
    s.frontKneeY = -2 - Math.floor(fold / 2);
    s.kneeOut = 1;
    s.ear = name === 'noodle' ? flare * 2 : flare;
    s.scarf = -3 * flare;
    s.tail = 2 * flare;
    s.charmTurn = -13 * flare;
    s.eye = rolling ? (frame < 2 ? shutEyes : null) : fold > 3 ? hitEyes : startledEyes;
    s.packTail = fold >= 2 || (rolling && frame < 6);
    s.foldEars = rolling ? frame >= 2 && frame <= 5 : fold >= 4;
    if (name === 'brisket') {
      s.rightX -= 3;
      s.leftX += 1;
      s.headY += 2;
      s.fistY -= 2;
      s.rearX += 2;
      s.kneeOut += 2;
      s.extraHaunch = fold >= 3;
    } else if (name === 'noodle') {
      s.torsoTurn -= 5;
      s.headX += 2;
      s.rearX -= 3;
      s.leftX -= 2;
      s.tailLift = -2 + flare;
    } else if (name === 'clover') {
      s.fistX -= 2;
      s.fistY -= 2;
      s.leftY -= 2;
      s.palmCharm = true;
    } else {
      s.rightX += Math.max(0, 4 - fold);
      s.rightY -= 2;
    }
    if (rolling && frame >= 5) {
      // The lead foot unfolds from the roll, then the rear foot takes the weight.
      s.rightX = frame === 5 ? 10 : 5;
      s.rightY = frame === 5 ? -6 : -1;
      s.leftX = frame === 5 ? 3 : -3;
      s.leftY = frame === 5 ? -6 : 0;
      s.fistX = frame === 5 ? 8 : 1;
      s.fistY = frame === 5 ? 1 : -2;
      s.rearX = -5;
      s.headTurn = frame === 5 ? 12 : 2;
      s.showSole = frame === 5;
      s.kickFront = frame === 5;
    }
  }

  function restingStance(s, name) {
    const style = landingStyles[name];
    s.lowBody = true;
    s.bodyX = style.hips;
    [s.headX, s.headY, s.headTurn] = style.cheek;
    s.shoulderY = 8;
    s.leftX = -5;
    s.leftY = -1;
    s.leftFootTurn = 23;
    s.rightX = -9;
    s.rightFootTurn = -11;
    s.fistX = 5;
    s.fistY = 9;
    s.fistTurn = 17;
    s.rearX = -2;
    s.rearY = 8;
    s.frontElbowX = -3;
    s.kneeOut = 3;
    s.ear = 2;
    s.scarf = -2;
    s.openHands = 'front';
    s.guardFloor = true;
    if (name === 'brisket') {
      s.fistX += 2;
      s.rearX -= 2;
      s.kneeOut += 2;
    } else if (name === 'noodle') {
      s.leftX -= 2;
      s.headTurn -= 2;
      s.ear += 2;
      s.charmTurn = -16;
    } else if (name === 'clover') {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = -8;
      s.fistX -= 2;
    }
  }

  function downedStance(s, name, frame) {
    restingStance(s, name);
    const jolt = [3, -2, 1, 2, 0, 0, -1][frame];
    s.bodyY += jolt;
    s.headY += [2, -2, 0, 1, 0, 0, 0][frame];
    s.headTurn += [8, -8, -2, 4, 1, 0, -1][frame];
    s.fistX += [4, 2, 3, 1, 0, 0, -1][frame];
    s.rearX -= [4, 3, 2, 1, 0, 0, 0][frame];
    s.leftY -= [0, 4, 2, 0, 0, 0, 0][frame];
    s.rightY -= [0, 2, 1, 0, 0, 0, 0][frame];
    s.ear += jolt;
    s.scarf -= jolt;
    s.tail = [3, -2, 1, 2, 0, 0, 1][frame];
    s.eye = frame < 2 || frame === 3 ? shutEyes : null;
    s.roll = [0, -7, -3, 1, 0, 0, 0][frame];
    s.floorRoll = true;
    s.floorLift = frame === 1 ? landingStyles[name].spring : frame === 2 ? 1 : 0;
  }

  function risingStance(s, name, frame, breakfall) {
    const style = landingStyles[name];
    if (frame < 4) {
      restingStance(s, name);
      const lift = (breakfall ? [0, 1, 5, 9] : [0, 2, 6, 9])[frame];
      s.bodyY -= Math.floor(lift / 4);
      s.headY -= lift;
      s.headTurn -= lift;
      s.shoulderY -= Math.floor(lift / 2);
      s.torsoTurn = -Math.floor(lift / 2);
      s.fistY += Math.floor(lift / 2);
      s.fistX += (breakfall ? [9, 11, 7, 3] : [0, 1, 3, 2])[frame];
      s.rightX += Math.round(lift / 2);
      s.rearX -= breakfall ? 4 : 0;
      s.leftX += Math.floor(lift / 3);
      s.ear -= Math.floor(lift / 3);
      if (breakfall) {
        s.openHands = 'both';
        s.eye = frame < 2 ? shutEyes : null;
        s.scarf = 5 - 2 * frame;
        s.roll = -style.slap[frame];
        s.floorRoll = true;
        s.packTail = true;
        s.foldEars = frame < 2;
      }
      return;
    }
    const crouch = [4, 2, 1, 0][frame - 4];
    s.guardFloor = true;
    s.bodyY = crouch;
    s.headY = Math.round(crouch / 2);
    s.headTurn = 2 * crouch;
    s.torsoTurn = (breakfall ? 2 : 1) * crouch;
    s.kneeOut = crouch;
    s.leftX = -Math.ceil(crouch / 2);
    s.rightX = crouch;
    s.fistX = breakfall ? 2 * crouch : crouch;
    s.fistY = breakfall ? -crouch : crouch;
    s.rearX = -crouch;
    s.rearY = -Math.ceil(crouch / 2);
    s.ear = crouch;
    s.scarf = -crouch;
    if (breakfall) {
      s.roll = style.slap[frame];
      s.floorRoll = frame < 7;
    }
  }

  function floorSweepStance(s, name, frame) {
    if (frame > 4) {
      risingStance(s, name, [3, 5, 7][frame - 5], false);
      return;
    }
    restingStance(s, name);
    if (name === 'noodle') {
      s.hideCharm = true;
      s.heldItem = 'rope';
      s.heldAngle = [-33, -49, -36, -4, -8][frame];
      s.clasp = 'front';
    }
    if (frame < 3) {
      s.bodyX -= frame;
      s.headY -= 2 * frame;
      s.headTurn -= 5 * frame;
      s.torsoTurn = -4 * frame;
      s.fistX -= 2 * frame;
      s.fistY -= frame;
      s.rearY -= 2 * frame;
      s.rightX += 2 * frame;
      s.rightY -= 2 * frame;
      s.leftX += frame;
      s.leftFootTurn += 9 * frame;
      s.scarf += 2 * frame;
      return;
    }
    const rear = frame === 4;
    s.bodyX = rear ? -1 : 0;
    s.headX -= rear ? 1 : 3;
    s.headY -= 5;
    s.headTurn = rear ? -5 : 7;
    s.torsoTurn = rear ? -9 : 7;
    s.ear = rear ? -3 : 3;
    s.scarf = rear ? -5 : 4;
    s.tail = rear ? -2 : 3;
    if (name === 'pip') {
      s.packTail = true;
      s.soleSide = 'both';
      s.showSole = s.kickFront = s.kickRear = true;
      s.rightX = rear ? 15 : 18;
      s.rightY = rear ? -4 : -7;
      s.rightFootTurn = rear ? 58 : 69;
      s.leftX = rear ? -13 : -12;
      s.leftY = rear ? -7 : -5;
      s.leftFootTurn = rear ? -106 : -86;
      s.frontKneeY = -3;
      s.fistX = -4;
      s.fistY = 11;
      s.rearX = -9;
      s.rearY = 5;
    } else if (name === 'brisket') {
      s.lowBody = false;
      s.bodyY = 4;
      s.headY = 0;
      s.shoulderY = 1;
      s.twoHandsFront = s.powerArm = true;
      s.openHands = 'both';
      s.fistX = rear ? 12 : 15;
      s.fistY = rear ? -2 : -4;
      s.fistTurn = rear ? 48 : 57;
      s.rearX = rear ? -33 : -30;
      s.rearY = rear ? -1 : 2;
      s.rearTurn = rear ? -118 : -104;
      s.leftX = -3;
      s.rightX = 4;
      s.kneeOut = 4;
    } else if (name === 'noodle') {
      s.floorTailReach = rear ? 29 : 27;
      s.fistX = rear ? 4 : 7;
      s.fistY = 1;
      s.fistTurn = -8;
      s.rearX = -8;
      s.rearY = 6;
      s.rightX = -2;
      s.leftX = -4;
      s.ear += 2;
    } else {
      s.packTail = true;
      s.soleSide = rear ? 'front' : 'rear';
      s.showSole = true;
      s.kickFront = rear;
      s.kickRear = !rear;
      s.heldAngle = rear ? -174 : -4;
      s.fistX = rear ? -26 : 6;
      s.fistY = 5;
      s.fistTurn = rear ? -135 : 20;
      s.rearX = rear ? 1 : -10;
      s.rearY = 8;
      s.leftX = rear ? -1 : -13;
      s.leftY = rear ? 0 : -6;
      s.leftFootTurn = rear ? 10 : -109;
      s.rightX = rear ? 17 : 2;
      s.rightY = rear ? -6 : -1;
      s.rightFootTurn = rear ? 66 : 13;
      s.kneeOut = 3;
    }
  }

  function shieldGuard(s) {
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
  }

  function shieldRollStance(s, name, frame) {
    shieldGuard(s);
    if (frame === 0 || frame === 9) {
      s.clipFloor = true;
      return;
    }
    const style = shieldStyles[name];
    const fold = [0, 2, 4, 6, 6, 5, 4, 2, 1, 0][frame];
    const trail = [0, 1, 3, 4, 2, -2, -4, -2, 1, 0][frame];
    s.roll = style.turn[frame];
    s.rollHeight = style.height[frame];
    s.guardFloor = false;
    s.floorRoll = true;
    s.packTail = frame >= 2 && frame <= 6;
    s.foldEars = frame >= 2 && frame <= 5;
    s.bodyY = 2 + Math.round(fold / 2);
    s.torsoTurn = 2 * fold;
    s.headX = -1 - Math.floor(fold / 2);
    s.headY = 2 + fold;
    s.headTurn = 4 + 2 * fold;
    s.fistX = 3 - fold;
    s.fistY = -6 - fold;
    s.fistTurn = -24 - 5 * fold;
    s.rearX = 2 - Math.floor(fold / 2);
    s.rearY = -5 - fold;
    s.rearTurn = -15 - 5 * fold;
    s.leftX = -1 + fold;
    s.leftY = -2 * fold;
    s.rightX = 4 - fold;
    s.rightY = -1 - 2 * fold;
    s.rightFootTurn = 17 + 8 * fold;
    s.leftFootTurn = -11 + 8 * fold;
    s.frontKneeY = -Math.ceil(fold / 2);
    s.kneeOut = 1;
    s.ear = trail;
    s.scarf = -3 * trail;
    s.tail = 2 * trail;
    s.charmTurn = -12 * trail;
    if (name === 'pip') {
      s.headTurn += 4;
      s.rightX += frame === 2 ? 6 : 1;
      s.leftX += frame === 5 ? 4 : 1;
      s.scarf -= trail;
    } else if (name === 'brisket') {
      s.extraHaunch = frame >= 2 && frame <= 6;
      s.shoulderLead = [0, 1, 3, 2, 0, 0, 0, 0, 0, 0][frame];
      s.headX -= 1;
      s.headTurn -= 12;
      s.fistX -= 2;
      s.fistY += 2;
      s.rightX -= 3;
      s.kneeOut += 2;
    } else if (name === 'noodle') {
      s.torsoTurn -= 8;
      s.rollWidth = [1, 1, 1.08, 1.14, 1.18, 1.15, 1.08, 1, 1, 1][frame];
      s.headX += 3;
      s.headY += 1;
      s.leftX -= 4;
      s.rightX += 2;
      s.ear = 2 * trail;
      s.tailLift = -2;
    } else {
      // The far rim folds back across Clover's chest until her paws come out of the roll.
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = [0, -105, -145, -151, -162, -157, -126, -82, -41, 0][frame];
      s.fistX += 2;
      s.fistY += 1;
    }
    if (frame >= 6) {
      const settle = frame - 6;
      s.rightX = [7, 5, 3][settle];
      s.rightY = [-4, 0, 0][settle];
      s.leftX = [0, -4, -2][settle];
      s.leftY = [-7, -2, 0][settle];
      s.leftFootTurn = [39, 19, 4][settle];
      s.rightFootTurn = [24, 10, 2][settle];
      s.headTurn = [11, 4, -2][settle];
      s.showSole = frame === 6;
      s.kickFront = frame === 6;
    }
  }

  function spotStance(s, name, frame) {
    shieldGuard(s);
    if (frame === 0 || frame === 9) {
      s.clipFloor = true;
      return;
    }
    s.guardFloor = true;
    const style = shieldStyles[name];
    const depth = style.depth[frame];
    s.bodyX = style.slipX[frame];
    s.bodyY += depth;
    s.torsoTurn = style.sway[frame];
    s.headX = frame < 6 ? -2 : 1;
    s.headY = 1 + Math.floor(depth / 2);
    s.headTurn = -Math.round(s.torsoTurn / 2);
    s.kneeOut = 1 + depth;
    s.frontKneeY = -Math.floor(depth / 2);
    s.fistX -= Math.ceil(depth / 2);
    s.fistY -= depth;
    s.rearX -= depth;
    s.rearY += Math.floor(depth / 2);
    s.ear = frame < 4 ? 3 : -2;
    s.scarf = frame < 4 ? 5 : -3;
    s.tail = frame < 5 ? -3 : 4;
    s.foldEars = frame >= 3 && frame <= 5;
    if (name === 'pip') {
      s.headX += frame >= 4 && frame <= 6 ? 3 : -1;
      s.fistTurn = -24 - 3 * depth;
      s.rearTurn = 14 + 2 * depth;
      s.rightFootTurn = frame >= 3 && frame <= 5 ? -12 : 0;
    } else if (name === 'brisket') {
      s.leftX -= 2;
      s.rightX += 2;
      if (depth > 1) {
        s.bodyY -= 2;
        s.headY -= 2;
      }
      s.fistX += 2;
      s.fistY += 1;
      s.rearX += 4;
      s.openHands = 'front';
      s.fistTurn = -19 - 3 * depth;
      s.charmTurn = -7 * depth;
    } else if (name === 'noodle') {
      // His long body folds under the blow while all four paws stay close to the floor.
      s.lowBody = frame >= 3 && frame <= 5;
      if (s.lowBody) {
        s.bodyY = 0;
        s.headX = 3;
        s.headY = 8 + Math.floor(depth / 2);
        s.headTurn = -4;
        s.shoulderY = 6;
        s.fistX = 2;
        s.fistY = 1;
        s.rearX = -4;
        s.rearY = 3;
        s.tail = frame === 4 ? 4 : -2;
      }
      s.ear *= 2;
      s.charmTurn = 24 - 4 * depth;
    } else {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = [0, -38, -68, -97, -116, -94, -61, -36, -19, 0][frame];
      s.fistX += 3;
      s.fistY -= 1;
      s.rearX -= 2;
      s.tail -= 2;
    }
  }

  function parryStance(s, name, frame) {
    const style = shieldStyles[name];
    shieldGuard(s);
    s.guardFloor = true;
    s.bodyX = [-1, -1, 0, 1, 1, 0, 0, 0][frame];
    s.bodyY += [1, 1, 0, -1, -1, 0, 0, 0][frame];
    s.torsoTurn = [-7, -9, -3, 8, 7, 3, 1, 0][frame];
    s.headX = frame < 3 ? -2 : -1;
    s.headTurn = [-5, -9, -11, -13, -10, -5, -2, 0][frame];
    s.fistX += style.parryX[frame];
    s.fistY += style.parryY[frame];
    s.fistTurn = style.palm[frame];
    s.rearX += [-1, -1, -2, -3, -3, -2, -1, 0][frame];
    s.rearY += [-2, -2, -1, 1, 0, 0, 0, 0][frame];
    s.openHands = frame < 6 ? 'front' : null;
    s.parryPalm = frame < 5 ? parryPaws[name] : null;
    s.frontElbowX = [-3, -3, -2, -1, -1, 0, 0, 0][frame];
    s.frontElbowY = [4, 5, 5, 4, 3, 1, 0, 0][frame];
    s.kneeOut = [3, 3, 2, 2, 1, 1, 1, 0][frame];
    s.ear = [2, 1, -2, -3, -1, 1, 1, 0][frame];
    s.scarf = [4, 5, 3, -4, -3, -1, 1, 0][frame];
    if (name === 'brisket') {
      s.twoHandsFront = true;
      s.powerArm = frame < 5;
      s.rearX += frame < 4 ? 5 : 1;
      s.rearY += frame < 4 ? -1 : 0;
      s.rearTurn = frame < 5 ? -38 : -14;
      s.leftX -= 2;
      s.rightX += 2;
    } else if (name === 'noodle') {
      s.headX -= 2;
      s.headY += frame < 3 ? 2 : 0;
      s.rearX += 3;
      s.ear *= 2;
      s.charmTurn = [-19, -31, -28, 16, 22, 12, 5, 0][frame];
    } else if (name === 'clover') {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = [-63, -44, -18, -6, -26, -48, -43, -30][frame];
      s.openHands = null;
    } else {
      s.fistX += 1;
      s.rearX -= 1;
      s.tail += frame < 4 ? -3 : 2;
    }
  }

  function neutralAirStance(s, name, frame) {
    const tuck = [1, 3, 5, 7, 7, 5, 3, 2, 1, 0][frame];
    const swing = [0, 1, 3, 4, 2, -2, -4, -2, -1, 0][frame];
    const opening = frame >= 6;
    s.roll = aerialStyles[name].recoil[frame];
    s.rollHeight = 1 - tuck * 0.016;
    s.bodyY = Math.floor(tuck / 3);
    s.headX = -Math.ceil(tuck / 3);
    s.headY = Math.ceil(tuck / 2);
    s.headTurn = 1 + 2 * tuck;
    s.torsoTurn = -2 * tuck;
    s.fistX = 5 - tuck;
    s.fistY = -6 - tuck;
    s.fistTurn = -12 - 9 * tuck;
    s.rearX = -5 + tuck;
    s.rearY = -6 - tuck;
    s.rearTurn = -8 - 5 * tuck;
    s.leftX = -3 + tuck;
    s.leftY = -2 * tuck;
    s.rightX = 4 - tuck;
    s.rightY = -2 - 2 * tuck;
    s.leftFootTurn = -3 - 6 * tuck;
    s.rightFootTurn = 4 + 8 * tuck;
    s.frontKneeY = -Math.floor(tuck / 2);
    s.packTail = !opening && tuck >= 5;
    s.foldEars = !opening && tuck >= 5;
    s.openHands = opening ? 'both' : null;
    s.scarf = -2 * swing;
    s.ear = swing;
    s.tail = -2 * swing;
    if (name === 'pip') {
      // One knee flashes across the chest, then the forepaws open on opposite sides.
      s.rightX += swing;
      s.kickFront = !opening && tuck >= 5;
      s.showSole = s.kickFront;
      s.rearX -= 2 * swing;
      s.scarf -= Math.sign(swing);
    } else if (name === 'brisket') {
      s.extraHaunch = tuck >= 4;
      s.twoHandsFront = tuck >= 4;
      s.rollWidth = 1 + 0.012 * tuck;
      s.headTurn -= tuck;
      s.fistX += 3;
      s.rearX -= tuck;
      s.fistY -= 2;
      s.rearY -= 1;
      s.kneeOut = 1 + Math.floor(tuck / 2);
      s.charmTurn = -8 * swing;
    } else if (name === 'noodle') {
      s.torsoTurn += 3 * tuck;
      s.rollWidth = 1 - 0.025 * tuck;
      s.headX += tuck;
      s.headY += Math.floor(tuck / 2);
      s.leftX -= 1 + tuck;
      s.rightX += 3;
      s.ear = Math.round(1.25 * swing);
      s.charmTurn = 12 * swing;
    } else {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = [-30, -72, -123, -157, -168, -144, -95, -63, -42, -31][frame];
      s.openHands = opening ? 'rear' : null;
      s.fistX += 2;
      s.fistY += 2;
      s.rearX -= swing;
    }
    if (opening) {
      const reach = [3, 4, 2, 0][frame - 6];
      s.fistX += reach;
      s.rearX -= 2 * reach;
      s.leftX -= reach;
      s.rightX += reach;
      s.headTurn -= 2 * reach;
    }
  }

  function directedAirStance(s, name, frame, octant) {
    const [aimX, aimY] = airDirections[octant];
    const drive = [-0.12, -0.38, 0.68, 0.94, 1, 0.9, 0.72, 0.46, 0.23, 0.08][frame];
    const x = aimX * drive;
    const y = aimY * drive;
    const burst = frame >= 2 && frame <= 5;
    const r = Math.round;
    s.bodyX = r(2 * x);
    s.bodyY = r(y) - 1;
    s.lean = r(3 * x);
    s.headX = r(3 * x);
    s.headY = r(3 * y) - 1;
    s.torsoTurn = r(12 * x + 4 * y);
    s.headTurn = r(24 * y - 8 * x);
    s.roll = r(23 * x + 14 * y);
    s.fistX = 3 + r((aimX >= 0 ? 8 : -2) * x);
    s.fistY = -5 + r((aimY < 0 ? 15 : 4) * y);
    s.fistTurn = r(-23 + 35 * y - 18 * x);
    s.rearX = -4 + r((aimX < 0 ? 12 : -4) * x);
    s.rearY = -4 - r(7 * y);
    s.rearTurn = r(16 * x - 35 * y);
    s.leftX = -3 - r(5 * x);
    s.rightX = 3 - r(10 * x);
    s.leftY = -3 + r(5 * y - 5 * Math.abs(x));
    s.rightY = -4 + r((aimY < 0 ? -3 : 10) * y - 7 * Math.abs(x));
    s.leftFootTurn = r(-33 * x + 15 * y);
    s.rightFootTurn = r(-40 * x + 28 * y);
    s.frontKneeY = -r(4 * Math.abs(x));
    s.rollHeight = 1 - 0.13 * Math.abs(x) + 0.04 * Math.abs(y);
    s.rollWidth = 1 + 0.06 * Math.abs(x) - 0.08 * Math.abs(y);
    s.foldEars = burst && aimY > -0.5;
    s.scarf = r(6 * x + 4 * y);
    s.ear = r(3 * x - 3 * y);
    s.tail = r(3 * x + 4 * y);
    s.tailLift = r(3 * y);
    if (name === 'pip') {
      s.roll += r(8 * x);
      s.fistY -= r(3 * drive);
      s.leftFootTurn -= r(15 * x);
      s.scarf += r(2 * x - y);
      s.openHands = burst && aimY < 0 ? 'front' : null;
    } else if (name === 'brisket') {
      // The forward shoulder and rear haunch lead different kinds of slip.
      s.roll -= r(7 * x);
      s.extraHaunch = frame >= 2 && frame <= 6;
      s.haunchX = r(3 * Math.min(0, x));
      s.shoulderLead = burst ? r(4 * Math.max(0, x)) : 0;
      s.fistX -= r(6 * x);
      s.fistY -= r(3 * drive);
      s.rearX += r(3 * drive);
      s.kneeOut = 3;
      s.charmTurn = r(-24 * x - 18 * y);
    } else if (name === 'noodle') {
      s.rollWidth += 0.13 * Math.abs(x);
      s.rollHeight -= 0.07 * Math.abs(x);
      s.headX += r(3 * x);
      s.rearX -= r(3 * x);
      s.leftX -= r(4 * x);
      s.ear = r(1.35 * s.ear);
      s.charmTurn = r(-42 * x + 38 * y);
    } else {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = r(-62 + 48 * x + 49 * y);
      s.fistX += 1;
      s.fistY += 2;
      s.tail -= r(5 * x);
    }
    if (frame >= 6) {
      // The slip may still be travelling on cel six; loosen the tuck immediately.
      const spread = [2, 5, 3, 1][frame - 6];
      s.openHands = name === 'clover' ? 'rear' : 'both';
      s.rearX -= spread;
      s.fistX += spread;
      s.rightX += spread;
      s.leftX -= spread;
      s.rightY += 2;
      s.tail -= spread;
      s.ear -= spread;
    }
  }

  function ledgeClimbStance(name, tick) {
    const game = window.DogFight, kit = game?.kits[name].ledgeClimb;
    if (!kit || !tick) return stance(name, 'ledge', 0);
    const r = Math.round;
    const pull = Math.min(1, tick / kit.lift);
    const step = Math.min(1, Math.max(0, (tick - kit.lift) / (kit.plant - kit.lift)));
    const settle = Math.min(1, Math.max(0, (kit.total - tick) / (kit.total - kit.plant)));
    const weight = pull * settle;
    const knee = Math.sin(Math.PI * step);
    const s = stance(name, 'idle', 0);
    s.bodyX = r(-7 * (1 - pull) + 2 * weight);
    s.bodyY = r(8 * (1 - pull) + (name === 'noodle' ? 9 : 5) * weight);
    s.torsoTurn = r((name === 'brisket' ? 26 : 17) * weight);
    s.headTurn = r(-9 * (1 - pull) - 5 * knee);
    s.headX = r(-2 + 2 * pull + 2 * weight);
    s.headY = r(2 * (1 - pull) + 3 * weight);
    s.rightX = r(-8 * (1 - pull) + (name === 'pip' ? 10 : 6) * weight);
    s.rightY = r(5 * (1 - pull) - (name === 'pip' ? 11 : 7) * pull * (1 - step));
    s.leftX = r(-7 * weight);
    s.leftY = r(7 * (1 - step) - 6 * knee);
    s.frontKneeY = -r(4 * weight);
    s.kneeOut = r(4 * weight);
    s.leftFootTurn = r(19 * (1 - step) - 14 * knee);
    s.rightFootTurn = r(13 * (1 - pull) - 16 * knee);
    s.ear = -r((name === 'noodle' ? 6 : 3) * weight);
    s.tail = r(3 * (1 - pull) - 6 * weight);
    s.scarf = r(6 * weight);
    s.guardFloor = step === 1;
    s.grip = false;
    if (name === 'pip') {
      s.kickFront = s.showSole = pull > 0.65 && step < 0.7;
      s.rearX -= r(5 * weight);
    } else if (name === 'brisket') {
      s.shoulderLead = r(6 * weight);
      s.extraHaunch = weight > 0.5;
      s.rightX += r(2 * weight);
    } else if (name === 'noodle') {
      s.headX += r(5 * weight);
      s.charmTurn = r(-19 * weight);
      s.leftX -= r(3 * weight);
    } else if (pull > 0.7 && settle > 0.25) {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = r(-85 + 49 * step);
      s.fistX = r(4 * weight);
      s.fistY = r(6 * weight);
    }
    if (step < 0.65) {
      const feet = game.ledgeClimbPosition(kit, tick / 60);
      const front = name === 'clover' ? pull <= 0.7 : (name === 'brisket' || step <= 0.4);
      const rear = name !== 'pip' || pull < 0.7 || !front;
      setLipPaws(s, name, r(-feet.x / 2), r(-feet.y / 2), front, rear, front && rear ? 3 : 0);
    }
    return s;
  }
  function ledgeRollClimb(name, tick, timing) {
    const s = stance(name, 'ledge', 0);
    if (tick === 0) return s;
    const style = ledgeRollStyles[name];
    const p = tick / timing.plant;
    const r = Math.round;
    s.grip = false;
    s.bodyX = -7 + r(7 * p);
    s.bodyY = 8 - r(6 * p);
    s.lean = -3 + r(7 * p);
    s.torsoTurn = -4 + r(23 * p);
    s.headX = -2 + r(2 * p);
    s.headY = 2 + r(2 * p);
    s.headTurn = -9 + r(15 * p);
    s.rightX = -8 + r(16 * p);
    s.rightY = 5 - r(12 * p);
    s.leftY = 7 - r(9 * p);
    s.leftFootTurn = 19 - r(28 * p);
    s.rightFootTurn = 13 + r(24 * p);
    s.frontKneeY = -r(4 * p);
    s.kneeOut = r(2 * p);
    s.fistX = -2;
    s.fistY = -2;
    s.rearX = -5;
    s.rearY = -4;
    s.scarf = 2 + r(4 * p);
    s.ear = -r(3 * p);
    s.tail = 2 - r(6 * p);
    s.foldEars = tick >= timing.safe[0] && name !== 'clover';
    if (name === 'pip') {
      s.showSole = p > 0.5;
      s.kickFront = s.showSole;
      s.rearX -= r(6 * p);
      s.rearY -= r(3 * p);
    } else if (name === 'brisket') {
      s.bodyY += r(2 * p);
      s.headTurn -= r(8 * p);
      s.extraHaunch = p >= 0.5;
      s.shoulderLead = r(4 * p);
      s.fistX += r(5 * p);
      s.fistY -= r(3 * p);
      s.rightX -= r(3 * p);
    } else if (name === 'noodle') {
      s.headX += r(3 * p);
      s.headY += r(3 * p);
      s.leftX -= r(4 * p);
      s.ear -= r(2 * p);
      s.charmTurn = -14 + r(33 * p);
    } else if (tick > style.front) {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = r(-50 + 52 * p);
      s.fistX = r(5 * p);
      s.fistY = r(12 * p);
      s.leftX -= r(3 * p);
    }
    const seconds = tick / 60;
    const path = window.DogFight?.ledgeRollPosition;
    const ease = (t) => t * t * (3 - 2 * t);
    const feet = path
      ? path({ distance: timing.distance, plantAt: timing.plant / 60, arriveAt: timing.arrive / 60 }, seconds)
      : { x: -13 + (timing.distance + 13) * ease(tick / timing.arrive), y: 46 * (1 - ease(p)) };
    const near = tick <= style.front;
    const far = tick <= style.rear;
    setLipPaws(s, name, r(-feet.x / 2), r(-feet.y / 2), near, far, near && far ? 3 : 1);
    return s;
  }

  function ledgeRollSpin(s, name, cel) {
    const style = ledgeRollStyles[name];
    const fold = [4, 6, 7, 7, 5, 3, 1][cel];
    const flare = [2, 3, 2, -1, -3, -2, 1][cel];
    s.roll = style.turn[cel];
    s.rollHeight = style.height[cel];
    s.floorRoll = true;
    s.bodyY = 2 + Math.floor(fold / 2);
    s.lean = 1;
    s.torsoTurn = 5 + fold;
    s.headX = -1 - Math.floor(fold / 2);
    s.headY = 1 + fold;
    s.headTurn = 3 + 3 * fold;
    s.fistX = 5 - fold;
    s.fistY = -2 - 2 * fold;
    s.fistTurn = -16 - 8 * fold;
    s.rearX = -3 + Math.floor(fold / 2);
    s.rearY = -3 - fold;
    s.rearTurn = -7 - 6 * fold;
    s.leftX = -4 + fold;
    s.leftY = -1 - 2 * fold;
    s.rightX = 5 - fold;
    s.rightY = -2 - 2 * fold;
    s.rightFootTurn = 15 + 9 * fold;
    s.leftFootTurn = -8 + 6 * fold;
    s.frontKneeY = -Math.floor(fold / 2);
    s.kneeOut = 2;
    s.packTail = cel < 6;
    s.foldEars = cel < 5;
    s.ear = flare;
    s.scarf = -2 * flare;
    s.tail = 2 * flare;
    if (name === 'pip') {
      s.kickFront = cel < 4;
      s.showSole = s.kickFront;
      s.rightX += [7, 3, 0, -1, 5, 6, 4][cel];
      s.rightY += cel < 2 ? 2 : -1;
      s.scarf -= flare;
      s.rearTurn -= 8;
    } else if (name === 'brisket') {
      s.extraHaunch = cel < 6;
      s.powerArm = cel < 5;
      s.shoulderLead = [6, 5, 3, 1, 0, 0, 0][cel];
      s.rollWidth = [1.06, 1.1, 1.12, 1.1, 1.08, 1.04, 1][cel];
      s.headTurn -= 9;
      s.headY += 2;
      s.leftX -= 2;
      s.kneeOut += 2;
      s.fistX -= 2;
    } else if (name === 'noodle') {
      s.rollWidth = [1.08, 1.18, 1.21, 1.17, 1.16, 1.12, 1.04][cel];
      s.torsoTurn -= 10;
      s.headX += 3;
      s.leftX -= 6;
      s.ear = 2 * flare;
      s.rightFootTurn -= 19;
      s.charmTurn = [-21, -48, -69, -40, -6, 18, 11][cel];
    } else {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.rightX = [8, 11, 14, 11, 7, 6, 5][cel];
      s.leftX = [-7, -10, -12, -8, -4, -3, -2][cel];
      s.rightY = [-4, -1, 0, -2, -6, -5, -2][cel];
      s.leftY = [-9, -7, -3, -6, -7, -4, -1][cel];
      s.leftFootTurn = [-16, -30, -45, -28, -4, 9, 5][cel];
      s.rightFootTurn = [27, 32, 38, 29, 24, 12, 8][cel];
      s.heldAngle = [0, 0, 0, -128, -93, -58, -34][cel];
      if (cel < 3) {
        // Clover plants the flat rim and brings her split legs over that hand.
        s.plantDisc = true;
        const [x, y] = rotateAt(5, 4, 0, -18, -s.roll);
        s.fistX = x - fighters[name].pawAt[0] - s.bodyX;
        s.fistY = y - fighters[name].pawAt[1] - s.bodyY;
      }
    }
  }

  function ledgeRollFinish(s, name, cel) {
    // The head spots the edge while the hips are still inward. The hind paws pivot next.
    if (cel >= 2) s.faceEdge = true;
    if (cel === 4) return;
    const crouch = [5, 5, 4, 2][cel];
    s.guardFloor = true;
    s.glanceBack = cel === 1;
    s.bodyY = crouch;
    s.lean = [4, 2, -2, -1][cel];
    s.torsoTurn = [18, 12, -10, -4][cel];
    s.headTurn = [8, -5, -7, -2][cel];
    s.headX = [0, -2, -1, 0][cel];
    s.headY = [2, 1, 1, 0][cel];
    s.rightX = [7, 3, 2, 1][cel];
    s.leftX = [-5, -2, -2, -1][cel];
    s.rightFootTurn = [17, 8, -10, -3][cel];
    s.frontKneeY = -2;
    s.kneeOut = crouch;
    s.fistX = [5, -2, 3, 2][cel];
    s.fistY = [1, -3, -6, -3][cel];
    s.rearX = [-4, -8, -2, 0][cel];
    s.rearY = [-2, -5, -4, -2][cel];
    s.tail = [-4, -3, 3, 1][cel];
    s.ear = [4, 1, -2, -1][cel];
    s.scarf = [-5, -2, 4, 2][cel];
    if (name === 'pip') {
      s.leftY = cel === 1 ? -3 : 0;
      s.rearX -= 2;
    } else if (name === 'brisket') {
      s.bodyY += cel < 3 ? 2 : 0;
      s.leftX -= 2;
      s.rightX += 2;
      s.shoulderY = 1;
      s.kneeOut += 1;
    } else if (name === 'noodle') {
      s.lowBody = cel < 2;
      if (s.lowBody) {
        s.bodyY = 0;
        s.headY = 7;
        s.shoulderY = 5;
      }
      s.charmTurn = [-23, -14, 17, 5][cel];
      s.ear *= 2;
    } else if (cel < 3) {
      s.hideCharm = true;
      s.heldItem = 'disc';
      s.heldAngle = [-44, -95, -142][cel];
      s.fistY += 2;
    }
  }

  function ledgeRollStance(name, frame) {
    const timing = ledgeRollTiming(name);
    if (frame < timing.plant) return ledgeRollClimb(name, frame, timing);
    const s = stance(name, 'idle', 0);
    const cel = frame - timing.plant;
    if (cel < 7) ledgeRollSpin(s, name, cel);
    else ledgeRollFinish(s, name, cel - 7);
    return s;
  }

  function ledgeTrumpStance(name, frame) {
    if (frame === 0) return stance(name, 'ledge', 0);
    const s = stance(name, 'fall', 0);
    if (frame === 5) return s;
    const i = frame - 1;
    s.bodyX = [-6, -5, -3, -1][i];
    s.bodyY = [6, 3, 1, 0][i];
    s.lean = [-3, -3, -2, -1][i];
    s.torsoTurn = [-5, -9, -6, -3][i];
    s.headX = [-2, -1, -1, -1][i];
    s.headY = [2, 1, 0, 0][i];
    s.headTurn = [-9, -8, -4, 0][i];
    s.openHands = frame === 4 ? 'front' : 'both';
    s.twoHandsFront = frame <= 2;
    s.behindHead = frame <= 2;
    s.fistTurn = [-9, -24, -18, -8][i];
    s.rearTurn = [7, 19, 15, 5][i];
    s.leftX = [-4, -5, -4, -3][i];
    s.leftY = [6, 4, 0, -3][i];
    s.rightX = [-6, -3, 0, 2][i];
    s.rightY = [4, 0, -4, -5][i];
    s.leftFootTurn = [16, 13, 8, 3][i];
    s.rightFootTurn = [13, 17, 10, 4][i];
    s.ear = [1, 3, 1, -2][i];
    s.tail = [3, 5, 2, 0][i];
    s.scarf = [2, 4, 3, 0][i];
    s.eye = frame === 2 ? startledEyes : null;
    // Inward-facing wrist positions, relative to the feet. The fingers open at the lip
    // before the hands part and the body settles into its normal airborne silhouette.
    let nearX = [8, 13, 13, 13][i];
    let nearY = [-23, -24, -21, -18][i];
    let farX = [11, 5, 1, 3][i];
    let farY = [-23, -22, -19, -19][i];
    if (name === 'pip') {
      nearX += [0, 3, 1, 0][i];
      s.rightY -= [0, 3, 2, 0][i];
      s.rightFootTurn += [0, 12, 5, 0][i];
      s.scarf += [0, 3, 2, 0][i];
    } else if (name === 'brisket') {
      s.bodyY += [1, 3, 1, 0][i];
      nearX -= [0, 2, 1, 0][i];
      farX -= [1, 11, 6, 1][i];
      farY += [0, 6, 3, 0][i];
      s.rearTurn -= [0, 32, 15, 0][i];
      if (frame === 2) s.eye = shutEyes;
      s.kneeOut = [0, 3, 2, 1][i];
      s.rightX += [1, 3, 2, 0][i];
      s.powerArm = frame === 1;
    } else if (name === 'noodle') {
      nearX += [0, 4, 3, 1][i];
      nearY += [0, 4, 5, 2][i];
      farY += [0, 6, 4, 2][i];
      s.headY += frame === 2 ? 2 : 0;
      s.ear += [0, 3, 2, 1][i];
      s.charmTurn = [-9, -20, -12, -3][i];
      s.leftX -= [1, 3, 2, 0][i];
    } else {
      nearY -= [0, 3, 2, 0][i];
      farX -= [0, 7, 4, 0][i];
      farY += [0, 3, 2, 0][i];
      s.rightX += [0, 3, 3, 1][i];
      s.rightY -= [0, 4, 3, 0][i];
      s.leftFootTurn -= [0, 9, 5, 0][i];
      s.tailLift = [0, -2, -1, 0][i];
      s.charmTurn = [-7, -15, -9, -3][i];
    }
    const [x, y] = fighters[name].pawAt;
    s.fistX = nearX - x - s.bodyX;
    s.fistY = nearY - y - s.bodyY;
    s.rearX = farX - (x - 2) - s.bodyX;
    s.rearY = farY - (y - 3) - s.bodyY;
    return s;
  }

  function wallStance(name, pose, frame) {
    const style = wallStyles[name];
    const stats = window.DogFight?.fighters?.[name] || style;
    const d = fighters[name];
    // The ink ends immediately outside the solid. Odd world-unit widths round to the nearest sprite pixel.
    const wall = Math.ceil(stats.width / 2) - 1;
    const palmY = -Math.round(stats.height * 0.52 / 2);
    if (pose === 'wallBounce' && frame >= 2) {
      const i = frame - 2;
      const s = stance(name, 'tumble', [0, 7, 6, 5][i]);
      s.roll = style.turn[i];
      s.headTurn -= [3, 2, 1, 0][i];
      s.packTail = i > 0;
      s.foldEars = i < 3;
      s.eye = i < 2 ? hitEyes : startledEyes;
      return s;
    }
    if (pose === 'wallTechJump' && frame >= 2) {
      if (frame === 5) {
        // Physics already faces outward after the push. Finish in that ordinary rising pose.
        const jump = stance(name, 'jump', 1);
        jump.faceEdge = true;
        return jump;
      }
      const s = stance(name, 'jump', 1);
      const i = frame - 2;
      s.bodyX = [-4, -4, -2][i];
      s.bodyY = [-2, -1, -1][i];
      s.lean = [-4, -3, -1][i];
      s.torsoTurn = [-17, -14, -6][i];
      s.headX = [-3, -2, -1][i];
      s.headTurn = [-5, -7, -3][i];
      s.glanceBack = frame === 4;
      s.fistX = [wall - d.pawAt[0] - s.bodyX - 1, 4, -3][i];
      s.fistY = [-3, -4, -6][i];
      s.rearX = [-7, -9, -6][i];
      s.rearY = [-5, -9, -8][i];
      s.openHands = i === 0 ? 'both' : 'rear';
      s.leftX = [-8, -10, -5][i];
      s.leftY = [-11, -12, -7][i];
      s.rightX = [wall - d.feet[1] + 5, 8, 3][i];
      s.rightY = [-4, -5, -7][i];
      s.rightFootTurn = [-77, -49, -22][i];
      s.leftFootTurn = [-17, -26, -12][i];
      s.showSole = i < 2;
      s.kickFront = i < 2;
      s.frontKneeY = i === 0 ? 2 : -2;
      s.ear = [3, 1, -2][i];
      s.tail = [5, 2, -1][i];
      s.scarf = [6, 3, -1][i];
      if (name === 'pip') s.leftFootTurn -= 16;
      else if (name === 'brisket') {
        s.kneeOut = 3;
        s.rearX += 3;
        s.rightX -= 2;
      } else if (name === 'noodle') {
        s.leftX -= 4;
        s.headX += 2;
        s.ear *= 2;
        s.charmTurn = [26, 12, -8][i];
      } else {
        s.leftY -= 3;
        s.rightFootTurn -= 8;
        s.tailLift = -2;
      }
      return s;
    }
    const s = stance(name, 'fall', 0);
    const missed = pose === 'wallBounce';
    const leaping = pose === 'wallTechJump';
    const tuck = missed ? [4, 6][frame] : leaping ? [4, 2][frame] : [3, 5, 6, 4, 2][frame];
    s.bodyX = -3 - Math.floor(tuck / 3);
    s.bodyY = 1 + Math.floor(tuck / 3);
    s.lean = -2;
    s.torsoTurn = -7 - tuck;
    s.headX = -4 - Math.ceil(tuck / 3);
    s.headY = 1 + Math.floor(tuck / 3);
    s.headTurn = missed ? 5 + tuck : -8 - tuck;
    s.frontElbowX = -4 - Math.floor(tuck / 2);
    s.frontElbowY = 2;
    s.leftX = -5 - tuck;
    s.leftY = leaping ? -9 - tuck : -5 - Math.floor(tuck / 2);
    s.rightX = wall - d.feet[1] - 4;
    s.rightY = leaping ? -9 + frame * 3 : -4 - Math.floor(tuck / 3);
    s.rightFootTurn = leaping ? -77 : -62;
    s.leftFootTurn = -14 - 3 * tuck;
    s.showSole = !missed;
    s.kickFront = !missed;
    s.kneeOut = 1 + Math.floor(tuck / 3);
    s.scarf = -tuck;
    s.ear = -Math.ceil(tuck / 2);
    s.tail = -tuck;
    s.charmTurn = -4 * tuck;
    let nearX = wall;
    let nearY = palmY;
    let farX = wall;
    let farY = palmY + style.farY;
    if (missed) {
      // The shoulder takes the impact. The wrists curl in before the body rolls away.
      s.wallShoulder = frame === 0 ? [wall, palmY] : null;
      s.bodyX = frame === 0 ? 1 : -2;
      s.bodyY = frame === 0 ? -1 : 1;
      s.lean = frame === 0 ? 1 : -1;
      s.torsoTurn = frame === 0 ? 9 : -4;
      s.headX = frame === 0 ? -9 : -5;
      if (name === 'noodle' && frame === 0) s.headX -= 4;
      s.headY = frame === 0 ? 1 : 2;
      s.headTurn = frame === 0 ? 9 : -3;
      s.eye = hitEyes;
      s.foldEars = true;
      s.rightX = -1 - 3 * frame;
      s.rightY = -4 - 3 * frame;
      s.leftY -= 2;
      nearX = wall - 10 - frame;
      farX = wall - 14 - frame;
      nearY = palmY + 5;
      farY = palmY - 2;
      s.fistTurn = -25 - frame * 14;
      s.rearTurn = -37;
    } else {
      s.wallHands = 'both';
      s.twoHandsFront = true;
      s.behindHead = true;
      if (name === 'brisket') {
        s.powerArm = true;
        s.bodyY += 2;
        s.kneeOut += 1;
        s.headTurn += 7;
      } else if (name === 'noodle') {
        s.leftX -= 4;
        s.ear -= 2;
        s.headY += 2;
        s.charmTurn -= 14;
      } else if (name === 'clover') {
        // Her off-paw keeps the disc against her chest while palm and sole catch the wall.
        s.wallHands = 'front';
        s.hideCharm = true;
        s.heldItem = 'backDisc';
        s.heldAngle = -145 + tuck;
        farX = -4;
        farY = palmY + 5;
        s.leftY -= 3;
      } else {
        s.leftY -= 2;
        s.scarf -= 2;
      }
    }
    s.fistX = nearX - d.pawAt[0] - s.bodyX;
    s.fistY = nearY - d.pawAt[1] - s.bodyY;
    s.rearX = farX - (d.pawAt[0] - 2) - s.bodyX;
    s.rearY = farY - (d.pawAt[1] - 3) - s.bodyY;
    return s;
  }

  function stance(name, pose, frame, octant = 0) {
    if (wallPoses.includes(pose)) return wallStance(name, pose, frame);
    if (pose === 'ledgeRoll') return ledgeRollStance(name, frame);
    if (pose === 'ledgeClimb') return ledgeClimbStance(name, frame);
    if (pose === 'ledgeTrump') return ledgeTrumpStance(name, frame);
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
      shoulderLead: 0,
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
      frontElbowX: 0,
      frontElbowY: 0,
      guardFloor: false,
      clipFloor: false,
      brakeHeel: false,
      kickFront: false,
      reverseArm: false,
      grip: false,
      lipHands: null,
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
      rollWidth: 1,
      rollHeight: 1,
      glanceBack: false,
      faceEdge: false,
      extraHaunch: false,
      bellyFirst: false,
      haunchX: 0,
      kickRear: false,
      soleSide: 'front',
      tailType: null,
      kitFrame: 0,
      barkJaw: 0,
      openHands: null,
      clasp: null,
      rideDisc: false,
      twoHandsFront: false,
      impactPaw: null,
      parryPalm: null,
      floorRoll: false,
      floorLift: 0,
      lowBody: false,
      floorTailReach: 0,
      packTail: false,
      foldEars: false,
      behindHead: false,
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
      case 'neutralAirDodge':
      case 'directionalAirDodge':
        if (frame === 10) return stance(name, 'fall', 2);
        if (pose === 'neutralAirDodge') neutralAirStance(s, name, frame);
        else directedAirStance(s, name, frame, octant);
        break;
      case 'shieldRoll':
        shieldRollStance(s, name, frame);
        break;
      case 'spotDodge':
        spotStance(s, name, frame);
        break;
      case 'parry':
        parryStance(s, name, frame);
        break;
      case 'righting': {
        const reach = { pip:6, brisket:3, noodle:8, clover:5 }[name];
        s.roll = [-54,-27,9,0][frame];
        s.fistX = [0,reach,reach+3,2][frame];
        s.fistY = [-8,-12,-7,-2][frame];
        s.rearX = [-2,-8,-10,-4][frame];
        s.leftY = [-8,-6,-2,0][frame];
        s.rightY = [-6,-9,-4,-2][frame];
        s.rightX = [3,6,5,3][frame];
        s.tailLift = [2,7,5,2][frame];
        s.ear = [-2,4,3,0][frame];
        s.headTurn = [-12,7,13,2][frame];
        s.charmTurn = [24,15,-9,-2][frame];
        break;
      }
      case 'footstool': {
        const kick = { pip: 9, brisket: 4, noodle: 7, clover: 11 }[name];
        s.bodyY = [3, 0, -3, -2][frame];
        s.headTurn = [12, 8, -9, -4][frame];
        s.torsoTurn = [6, -4, -9, -2][frame];
        s.leftX = [-5, -7, -4, -2][frame];
        s.leftY = [-6, -8, -10, -6][frame];
        s.rightX = [3, 5, kick, 4][frame];
        s.rightY = [-2, 4, -5, -7][frame];
        s.fistX = [4, 7, 3, 1][frame];
        s.fistY = [-4, -9, -12, -7][frame];
        s.rearX = [-3, -7, -6, -2][frame];
        s.scarf = [0, 4, 6, 2][frame];
        s.ear = [3, 1, -4, -2][frame];
        break;
      }
      case 'tumble':
      case 'techRoll':
        spinningStance(s, name, pose, frame);
        break;
      case 'tech':
      case 'floorRise':
        risingStance(s, name, frame, pose === 'tech');
        break;
      case 'downed':
        downedStance(s, name, frame);
        break;
      case 'jabLock': {
        restingStance(s, name);
        const spring = landingStyles[name].spring;
        s.floorRoll = true;
        s.floorLift = [0, spring + 2, spring, 1, 0, 0, 0][frame];
        s.roll = [7, -13, -10, -3, 2, 0, -3][frame];
        s.bodyX += [-3,-2,0,1,2,1,0][frame];
        s.headTurn += [-7,-16,-9,2,5,1,-7][frame];
        s.leftY -= [2,7,6,3,0,1,2][frame];
        s.rightX -= [1,6,5,3,1,0,-2][frame];
        s.rearX -= [3,5,4,2,0,-3,-6][frame];
        s.fistY -= [2,6,3,0,0,2,5][frame];
        s.tailLift = [2,5,6,1,0,1,3][frame];
        s.ear += name === 'noodle' && frame < 3 ? 6 : 1;
        s.eye = frame < 3 ? shutEyes : null;
        break;
      }
      case 'floorAttack':
        floorSweepStance(s, name, frame);
        break;
      case 'grappledFlinch':
      case 'grappledHighFlinch':
        flinchStance(s, name, pose === 'grappledHighFlinch', frame);
        break;
      case 'grappled':
      case 'grappledHigh':
        captiveStance(s, name, pose === 'grappledHigh', frame);
        break;
      case 'shouldered':
        captiveStance(s, name, true, frame);
        s.roll = 84 + [0,2,4,3,1,-2,-3,-2][frame];
        s.leftX = -1; s.rightX = 0; s.kneeOut = 1;
        s.leftY = 1; s.rightY = 3 + (frame%4===2 ? -2 : 0);
        s.fistX = -2; s.fistY = -3; s.rearX = -6; s.rearY = 3;
        s.rollHeight = .84;
        s.headTurn -= 14;
        break;
      case 'idle':
        s.bodyY = frame === 1 ? 1 : 0;
        s.tail = frame === 1 ? 1 : 0;
        s.fistY = frame === 1 ? -1 : 0;
        if (frame === 2) s.eye = shutEyes;
        break;
      case 'teeter': {
        const sway = [0, 1, 2, 2, 1, 0][frame];
        const reach = { pip: 5, brisket: 3, noodle: 7, clover: 4 }[name];
        s.bodyX = reach - 2 + sway;
        s.headX = reach + sway;
        s.headTurn = 11 + 3 * sway;
        s.bodyY = 1;
        s.lean = reach + sway;
        s.fistX = reach + 2 + sway;
        s.fistY = -4 - 2 * sway;
        s.rearX = -7 - sway;
        s.rearY = -3 - sway;
        s.leftX = -5;
        s.leftY = -2 - sway;
        s.rightX = 3;
        s.kneeOut = name === 'brisket' ? 4 : 2;
        s.tailLift = 6 - sway;
        s.ear = sway;
        s.scarf = -3 - sway;
        s.charmTurn = -14 - 7 * sway;
        break;
      }
      case 'walk': {
        const step = [-3, -1, 2, 3, 1, -2][frame];
        s.leftX = step;
        s.rightX = -step;
        s.leftY = frame === 2 ? -2 : 0;
        s.rightY = frame === 5 ? -2 : 0;
        s.bodyY = frame % 3 === 1 ? -1 : 0;
        s.fistX = -step;
        s.rearX = step;
        s.tail = frame < 3 ? 1 : -1;
        s.ear = frame % 3 === 0 ? 1 : 0;
        break;
      }
      case 'clashRecoil': {
        const spring = { pip: 6, brisket: 3, noodle: 8, clover: 5 }[name];
        const pull = [3, spring, Math.ceil(spring / 2), 1][frame];
        s.bodyX = -pull;
        s.bodyY = [1, -1, 3, 1][frame];
        s.headX = -pull;
        s.headTurn = [-5, -15, -7, 0][frame];
        s.lean = -pull;
        s.fistX = [7, -2, -3, 1][frame];
        s.fistY = [-5, -9, -4, -1][frame];
        s.rearX = [2, -4, -3, 0][frame];
        s.rearY = -pull;
        s.rightX = [3, 5, 4, 1][frame];
        s.leftX = -pull;
        s.rightY = frame === 1 && name !== 'brisket' ? -3 : 0;
        s.kneeOut = name === 'brisket' ? 4 : 2;
        s.ear = frame === 1 ? spring : 1;
        s.scarf = frame < 2 ? 3 : -1;
        s.tailLift = pull;
        s.eye = frame === 1 ? shutEyes : null;
        if (name === 'clover') s.charmTurn = [18, -22, 9, 0][frame];
        break;
      }
      case 'dashStart': {
        const drive = name === 'brisket' ? 3 : 5;
        s.bodyX = frame + 1;
        s.bodyY = 3 - frame;
        s.lean = drive - frame;
        s.headX = drive;
        s.headY = 2 - frame;
        s.leftX = -5 - frame;
        s.rightX = 4 + frame;
        s.leftY = -frame;
        s.fistX = -drive;
        s.rearX = drive + 1;
        s.tailLift = 2;
        s.scarf = -3;
        s.kneeOut = 2;
        break;
      }
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
      case 'crawl': {
        restingStance(s, name);
        const stride = [-4,-2,2,4,2,-2][frame];
        s.headX += 5;
        s.headY = 16;
        s.foldEars = true;
        s.headTurn = -5;
        s.fistX += 5 + stride;
        s.fistY += frame < 3 ? -1 : 1;
        s.rearX -= stride;
        s.leftX += stride;
        s.rightX -= stride;
        s.leftY -= frame === 1 ? 2 : 0;
        s.rightY -= frame === 4 ? 2 : 0;
        s.torsoTurn = stride / 2;
        s.tailLift = 2;
        s.ear += stride / 2;
        s.hideCharm = true;
        break;
      }
      case 'crouchHit':
      case 'crouch': {
        const depth = { pip: 9, brisket: 8, noodle: 7, clover: 10 }[name];
        const impact = pose === 'crouchHit' ? [3,4,2,1][frame] : 0;
        s.bodyY = depth + (impact || frame);
        s.headY = name === 'noodle' ? 3 : 5;
        s.headX = name === 'brisket' ? -1 : 2;
        s.lean = name === 'pip' ? 4 : 2;
        s.headTurn = name === 'clover' ? -5 : -2;
        s.kneeOut = name === 'brisket' ? 6 : 4;
        s.leftX = -3;
        s.rightX = 4;
        s.fistX = name === 'pip' ? 5 : 2;
        s.fistY = -3;
        s.rearX = -4;
        s.tailLift = 1 + (impact || frame);
        s.foldEars = name !== 'noodle';
        s.guardFloor = true;
        if (impact) {
          s.bodyX = -impact;
          s.headX -= impact;
          s.headTurn -= 2 * impact;
          s.leftX -= 3;
          s.rightX += name === 'brisket' ? 4 : 2;
          s.fistX += impact;
          s.fistY -= impact;
          if (frame < 2) s.eye = shutEyes;
        }
        break;
      }
      case 'backDrift': {
        s.bodyX = [-2,-1,0][frame];
        s.lean = -3;
        s.headX = 3;
        s.headTurn = [-8,-3,3][frame];
        s.torsoTurn = [-13,-9,-4][frame];
        s.leftX = [-8,-5,-7][frame];
        s.leftY = [-1,-7,-2][frame];
        s.rightX = [5,7,3][frame];
        s.rightY = [-6,-9,-3][frame];
        s.rightFootTurn = [18,26,8][frame];
        s.fistX = name === 'brisket' ? 6 : 3;
        s.fistY = [-5,-3,-2][frame];
        s.rearX = -5;
        s.rearY = -4;
        s.scarf = [5,7,4][frame];
        s.tail = [4,6,2][frame];
        s.ear = name === 'noodle' ? -6 : -2;
        break;
      }
      case 'turnJumpSquat':
      case 'jumpSquat': {
        const depth = [2, 3, 4][frame] + (name === 'brisket' ? 1 : 0);
        s.bodyY = depth;
        s.headY = Math.round(depth / 2);
        s.headTurn = depth + frame;
        s.torsoTurn = depth;
        s.kneeOut = depth;
        s.fistX = 1 + frame;
        s.rearX = -depth;
        s.fistY = -1 - frame;
        s.leftX = -1 - frame;
        s.rightX = 1 + frame;
        s.tailLift = frame;
        s.scarf = -frame;
        s.guardFloor = true;
        if (pose === 'turnJumpSquat') {
          s.bodyX = [-3,-2,0][frame];
          s.headX = [2,3,2][frame];
          s.torsoTurn = [-15,-21,-12][frame];
          s.headTurn = [-10,-7,-4][frame];
          s.leftX = [-8,-7,-4][frame];
          s.rightX = [5,7,6][frame];
          s.leftFootTurn = [-18,-12,6][frame];
          s.fistX = 5;
          s.rearX = -7;
          s.scarf = [2,5,6][frame];
        }
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
      case 'waveland':
      case 'wavelandBack': {
        const dir = pose === 'waveland' ? 1 : -1, brace = [3, 6, 6, 4, 2, 1][frame];
        s.bodyY = brace + (name === 'brisket' ? 2 : 0);
        s.bodyX = -dir * Math.round(brace * 0.7);
        s.lean = -dir * brace;
        s.headTurn = (dir > 0 ? -2 : 1) * brace;
        s.kneeOut = brace;
        s.leftX = -dir * brace;
        s.rightX = dir * (brace + 1);
        s.fistX = (name === 'clover' ? 2 : 1) * brace;
        s.fistY = -brace;
        s.rearX = -brace;
        s.tail = -dir * brace;
        s.scarf = -dir * (brace + 1);
        s.ear = (name === 'noodle' ? 2 : 1) * brace;
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
      case 'dizzy': {
        const swing = (name === 'brisket' ? 2 : name === 'noodle' ? 5 : 3) * [-1,0,1,0][frame];
        s.bodyX = swing;
        s.bodyY = [3,5,3,4][frame];
        s.headX = -swing;
        s.headTurn = [-15,-4,12,5][frame];
        s.lean = swing;
        s.kneeOut = 3;
        s.fistX = 3 - swing;
        s.rearX = -3 - swing;
        s.fistY = 3 + swing;
        s.rearY = 3 - swing;
        s.ear = -swing;
        s.tailLift = -4;
        s.eye = frame % 2 ? shutEyes : hitEyes;
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
        shieldGuard(s);
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
        s.eye = happyEyes;
        if (name==='pip') {
          s.wholeY=[0,-3,-7,-2][frame];
          s.scarf=[0,-2,-4,-1][frame];
          s.fistY=[-5,-12,-17,-12][frame];
          s.rightY=[0,-1,-6,-2][frame];
          s.rearX=-5; s.barkJaw=frame===2?2:0;
        } else if (name==='brisket') {
          s.bodyY=[2,0,-2,-2][frame]; s.leftX=-3; s.rightX=3;
          s.fistX=[0,3,7,8][frame]; s.rearX=[-2,-5,-9,-8][frame];
          s.fistY=s.rearY=[0,-8,-15,-12][frame]; s.powerArm=true;
          s.headTurn=[0,-6,-10,-6][frame];
        } else if (name==='noodle') {
          s.torsoTurn=[0,10,22,12][frame]; s.headTurn=[-3,7,15,5][frame];
          s.headY=[-2,0,4,1][frame]; s.headX=[0,1,4,2][frame];
          s.fistX=[2,5,8,4][frame]; s.fistY=[-5,-2,0,-3][frame];
          s.heldItem='rope'; s.heldAngle=[-42,-16,18,-20][frame]; s.tailLift=-3;
        } else {
          s.heldItem='disc'; s.heldAngle=[-9,-58,-118,-36][frame];
          s.fistX=[4,6,3,6][frame]; s.fistY=[-4,-9,-15,-10][frame];
          s.headTurn=[-3,-9,-12,-6][frame]; s.rearX=-5; s.leftY=frame===2?-3:0;
        }
        s.tail = [0,3,1,-2][frame];
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
    }, s.brakeHeel && !near);
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
    if (s.plantDisc) return [2 * (s.discFloorX + 12), -6];
    const [x, y] = wrist(d, s, s.heldItem !== 'backDisc');
    const cord = s.heldItem === 'rope';
    const [tipX, tipY] = rotateAt(x + (cord ? 9 : 12), y + (cord ? 1 : -1), x + 1, y, s.heldAngle);
    const [worldX, worldY] = posePoint(tipX, tipY, s);
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
    const elbowX = Math.round((sx + x) / 2) + elbowOffset + (near ? s.frontElbowX : 0);
    const rawElbowY = Math.round((sy + y) / 2) + (Math.abs(x - sx) > 16 ? 1 : 4) + (near ? s.frontElbowY : 0);
    const elbowY = s.guardFloor ? Math.min(rawElbowY, -armClearance) : rawElbowY;
    const foreX = Math.round(elbowX + (x - elbowX) * 0.62);
    const foreY = Math.round(elbowY + (y + 1 - elbowY) * 0.62);
    const onWall = s.wallHands === 'both' || s.wallHands === (near ? 'front' : 'rear');
    const palmInset = onWall ? Math.ceil(d.fistWidth / 2) : 1;
    link(
      buffer,
      [
        [sx, sy],
        [elbowX, elbowY],
        [foreX, foreY],
        [x - palmInset, y + 1],
      ],
      s.powerArm ? [d.fistWidth + 3, d.fistWidth + 1, d.fistWidth + 2, d.fistWidth] : d.fistWidth,
      near ? d.armCoat : rearColors[d.armCoat] || d.armCoat,
    );
    if (s.powerArm && (near || s.reverseArm)) {
      const highlight = { pip: 'L', brisket: 'i', noodle: 'O', clover: 'p' }[name];
      ink(buffer, foreX, foreY - 1, highlight);
      ink(buffer, foreX + Math.sign(x - elbowX), foreY - 1 + Math.sign(y - elbowY), highlight);
    }
    if (!s.behindHead || (!near && !s.twoHandsFront)) drawPaw(buffer, name, d, s, near, x, y);
  }

  function drawPaw(buffer, name, d, s, near, x, y) {
    if (s.wallHands === 'both' || s.wallHands === (near ? 'front' : 'rear')) {
      const pad = wallPaws[name];
      stamp(buffer, pad, x - pad[0].length + 1, y - Math.floor(pad.length / 2), 0, !near);
      return;
    }
    const handOpened = s.openHands === 'both' || s.openHands === (near ? 'front' : 'rear');
    const onLip = s.lipHands === 'both' || s.lipHands === (near ? 'front' : 'rear');
    let paw = s.grip || onLip ? ledgePaws[name] : handOpened ? spreadPaws[name] : d.fist;
    if (s.clasp === 'both' || s.clasp === (near ? 'front' : 'rear')) paw = claspPaws[name];
    if (s.impactPaw && (near || s.twoHandsFront)) paw = s.impactPaw;
    if (near && s.parryPalm) paw = s.parryPalm;
    turned(buffer, x, y, 14, near ? s.fistTurn : s.rearTurn, (part) => {
      stamp(part, paw, x - 3, y - 3, 0, !near);
    });
    if (near && s.palmCharm && d.charm) {
      turned(buffer, x + 1, y + 1, 15, -15, (part) => stamp(part, d.charm[2], x - 2, y - 2));
    }
    const discHand = !s.plantDisc && (near ? s.heldItem === 'disc' : s.heldItem === 'backDisc');
    const ropeHand = near && s.heldItem === 'rope';
    if (discHand || ropeHand) {
      const art = discHand ? heldDisc : ropeHandle;
      turned(buffer, x + 1, y, 16, s.heldAngle, (part) => stamp(part, art, x, y - 2));
    }
  }

  // The dachshund pivots on his front foot. The tail crosses the shins as it uncoils.
  const broomTail = [
    null,
    [[-20, -15], [-24, -19], [-22, -23], [-18, -24], [-16, -22]],
    [[-19, -9], [-20, -5], [-12, -3], [0, -4], [10, -6]],
    [[-19, -7], [-14, -4], [0, -3], [16, -5], [29, -8], [35, -7], [39, -4]],
    [[-16, -6], [-8, -4], [9, -5], [22, -8], [34, -8], [40, -5], [44, -3]],
    [[-15, -7], [-18, -4], [-10, -3], [2, -5], [13, -9]],
    [[-18, -10], [-24, -12], [-26, -17], [-23, -22], [-19, -22]],
    null,
  ];

  function drawTail(buffer, d, s) {
    const frame = s.kitFrame;
    if (s.brakeHeel && frame < 3) {
      // The nose turns before the tail settles behind the dog in the new direction.
      turned(buffer, d.hip[0] + s.bodyX, d.hip[1] + s.bodyY - 2, 33, [-6, -16, -25][frame], (part) => {
        stamp(part, d.tail, d.tailAt[0] + s.bodyX, d.tailAt[1] + s.bodyY + s.tailLift, s.tail);
      }, frame < 2);
      return;
    }
    if (!s.tailType || frame === 0 || frame === 7) {
      stamp(buffer, d.tail, d.tailAt[0] + s.bodyX, d.tailAt[1] + s.bodyY + s.tailLift, s.tail);
      return;
    }
    const [x, y] = withTorso(d, s, -13 + s.bodyX, -11 + s.bodyY);
    if (s.tailType === 'broom') {
      const points = [[x, y], ...broomTail[frame]];
      const shaft = points.slice(0, -1);
      const widths = shaft.map((point, i) => 6 - Math.round((5 * i) / (shaft.length - 1)));
      link(buffer, shaft, widths, 'c');
      for (let i = 1; i < points.length; i++) {
        const atTip = i === points.length - 1;
        if (!atTip && i > 3) continue;
        const [ax, ay] = points[i - 1];
        const [bx, by] = points[i];
        const steps = Math.max(1, Math.abs(bx - ax), Math.abs(by - ay));
        for (let j = 1; j <= steps; j++) {
          const px = Math.round(ax + ((bx - ax) * j) / steps);
          const py = Math.round(ay + ((by - ay) * j) / steps);
          if (atTip) {
            ink(buffer, px, py, j === steps ? 'l' : 'c');
            ink(buffer, px, py + 1, '#');
          } else ink(buffer, px, py - 1, 'O');
        }
      }
      return;
    }
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

  function posePoint(x, y, s) {
    const [px, py] = rotateAt(x, y, 0, -18, s.roll);
    return [Math.round(px * s.rollWidth), -18 + Math.round((py + 18) * s.rollHeight) + s.wholeY];
  }

  function tumble(pixels, s) {
    if (s.roll % 360 === 0 && s.rollWidth === 1 && s.rollHeight === 1 && !s.wholeY && !s.floorRoll) return pixels;
    const output = tumbleScratch;
    output.fill(0);
    const cx = originX;
    const cy = originY - 18;
    const dstY = cy + s.wholeY;
    const angle = (s.roll * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let y = 0; y < H; y++) {
      const offsetY = (y - dstY) / s.rollHeight;
      for (let x = 0; x < W; x++) {
        const offsetX = (x - cx) / s.rollWidth;
        const sx = cx + Math.round(offsetX * cos + offsetY * sin);
        const sy = cy + Math.round(offsetY * cos - offsetX * sin);
        if (sx >= 0 && sx < W && sy >= 0 && sy < H) output[y * W + x] = pixels[sy * W + sx];
      }
    }
    if (s.floorRoll) {
      // Keep the contacting shoulder, foot, or forepaw on the surface during a roll.
      let last = output.length - 1;
      while (last > 0 && !output[last]) last--;
      const rows = originY - 1 - s.floorLift - Math.floor(last / W);
      if (rows > 0) {
        output.copyWithin(rows * W, 0);
        output.fill(0, 0, rows * W);
      } else if (rows < 0) {
        output.copyWithin(0, -rows * W);
        output.fill(0, output.length + rows * W);
      }
      s.wholeY += rows;
    }
    return output;
  }

  function compose(name, s) {
    const d = fighters[name];
    const buffer = bodyScratch;
    buffer.fill(0);
    const resting = s.lowBody ? restingBodies[name] : null;
    const bodyAt = resting ? resting.at : d.bodyAt;
    const bodyX = bodyAt[0] + s.bodyX;
    const bodyY = bodyAt[1] + s.bodyY;
    const hipX = d.hip[0] + s.bodyX;
    const hipY = d.hip[1] + s.bodyY;
    const [neckX, neckY] = withTorso(d, s, d.headAt[0] + s.bodyX + s.lean + 10, d.headAt[1] + s.bodyY + 14);
    const headX = neckX - 10 + s.headX;
    const headY = neckY - 14 + s.headY;
    const tailAcrossFeet = s.tailType === 'broom' && s.kitFrame >= 2 && s.kitFrame <= 5;
    if (s.packTail) {
      const [tx, ty] = withTorso(d, s, hipX - (resting ? 14 : 9), hipY - (resting ? 6 : 10));
      stamp(buffer, tuckedTails[name], tx, ty);
    } else if (resting) {
      if (!s.floorTailReach) stamp(buffer, resting.tail, resting.tailAt[0] + s.bodyX, resting.tailAt[1] + s.bodyY, s.tail);
    } else if (!tailAcrossFeet) drawTail(buffer, d, s);
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
    if (!s.reverseArm && (!s.twoHandsFront || s.behindHead)) drawArm(buffer, name, d, s, false);
    if (!s.kickFront) drawLeg(buffer, name, d, s, true);
    turned(buffer, hipX, hipY, 31, s.torsoTurn, (part) => stamp(part, resting ? resting.coat : d.body, bodyX, bodyY, s.lean));
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
    if (tailAcrossFeet) drawTail(buffer, d, s);
    if (s.floorTailReach) {
      const tip = -s.floorTailReach;
      link(buffer, [[-10, -8], [-14, -5], [-19, -5], [tip + 4, -8], [tip, -10]], [5, 4, 3, 2, 1], 'c');
      ink(buffer, -16, -7, 'O');
      ink(buffer, -17, -7, 'O');
      ink(buffer, tip, -10, 'l');
    }
    turned(buffer, hipX, hipY, 32, s.torsoTurn, (part) => {
      const neckX = d.collarAt[0] + s.bodyX + s.lean + (resting ? resting.collar[0] : 0);
      const neckY = d.collarAt[1] + s.bodyY + (resting ? resting.collar[1] : 0);
      stamp(part, d.collar, neckX, neckY, s.scarf);
    });
    if (s.behindHead) drawArm(buffer, name, d, s, true);
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
        const pieces = s.foldEars ? foldedEars[name] : d.ears;
        ear(pieces[0], false);
        stamp(head, d.head, headX, headY, s.headLean);
        ear(pieces[1], true);
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
    if (s.shoulderLead) {
      const [sx, sy] = withTorso(d, s, d.shoulder[0] + s.bodyX + s.lean, d.shoulder[1] + s.bodyY + s.shoulderY);
      const x = sx + s.shoulderLead;
      const y = sy - 2 - Math.round(s.shoulderLead / 3);
      link(buffer, [[sx - 4, sy + 3], [x, y + 2]], [10, 11], d.armCoat);
      stamp(buffer, rushingShoulder, x - 11, y - 6);
    }
    if (s.twoHandsFront) {
      if (s.behindHead) drawPaw(buffer, name, d, s, false, ...wrist(d, s, false));
      else drawArm(buffer, name, d, s, false);
    }
    if (s.behindHead) {
      const [x, y] = wrist(d, s, true);
      drawPaw(buffer, name, d, s, true, x, y);
    } else drawArm(buffer, name, d, s, true);
    if (s.reverseArm) drawArm(buffer, name, d, s, false);
    if (s.wallShoulder) {
      const [x, y] = s.wallShoulder;
      const [sx, sy] = withTorso(d, s, d.shoulder[0] + s.bodyX, d.shoulder[1] + s.bodyY);
      link(buffer, [[sx, sy], [x - 5, y + 1]], [d.fistWidth + 2, 5], d.armCoat);
      const shoulder = wallShoulders[name];
      stamp(buffer, shoulder, x - shoulder[0].length + 1, y - Math.floor(shoulder.length / 2));
    }
    // A rotated outline can project its last pixel beyond an otherwise planted stance.
    if (s.guardFloor || s.clipFloor) buffer.fill(0, originY * W);
    if (s.rideDisc) {
      stamp(buffer, sailDisc, -18, 0);
      const glint = -10 + (s.kitFrame % 5) * 4;
      ink(buffer, glint, 2, 'f');
      ink(buffer, glint + 1, 2, 'f');
    }
    const pixels = tumble(buffer, s);
    if (s.plantDisc) {
      // After the split-leg body rotates, keep the weight-bearing rim flat against the surface.
      const [x, y] = wrist(d, s, true);
      s.discFloorX = posePoint(x, y, s)[0] - 1;
      stamp(pixels, heldDisc, s.discFloorX, -heldDisc.length);
    }
    return pixels;
  }

  function tracksKitPaws(pose) {
    return kitMoves[pose]?.clasp || kitMoves[pose]?.trackPaws;
  }

  function placeGrippingPaws(name, pose, elapsed) {
    const lip = kitMoves[pose].lip;
    const phase = elapsed < lip.startup ? 0.39 * elapsed / lip.startup :
      0.4 + 0.25 * (elapsed - lip.startup) / lip.active;
    const s = stance(name, pose, actionCel(pose, phase));
    const game = window.DogFight;
    const move = game?.moves?.[pose];
    const feet = move?.climb && game.ledgePosition ? game.ledgePosition(move, elapsed / 60) : null;
    const [x, y] = feet ? [Math.round(-feet.x / 2), Math.round(-feet.y / 2)] : lip.preview[elapsed];
    const front = elapsed <= lip.front;
    const rear = elapsed <= lip.rear;
    setLipPaws(s, name, x, y, front, rear, lip.front >= 0 ? 3 : 1);
    return s;
  }

  function setLipPaws(s, name, x, y, front, rear, rearOffset) {
    const [baseX, baseY] = fighters[name].pawAt;
    s.lipHands = front && rear ? 'both' : front ? 'front' : 'rear';
    if (front) {
      s.fistX = x - baseX - s.bodyX;
      s.fistY = y - baseY - s.bodyY;
      s.fistTurn = 0;
    }
    if (rear) {
      // Space two gripping paws apart. A lone grip sits just inside the corner.
      s.rearX = x + rearOffset - (baseX - 2) - s.bodyX;
      s.rearY = y - (baseY - 3) - s.bodyY;
      s.rearTurn = 0;
      s.twoHandsFront = true;
    }
    if (front && rear) s.behindHead = true;
  }

  function getFrame(name, pose, number, octant = 0) {
    const directionKey = pose === 'directionalAirDodge' && number !== 10 ? '/' + octant : '';
    const key = name + '/' + pose + '/' + number + directionKey;
    if (frames.has(key)) return frames.get(key);
    const s = number >= 8 && kitMoves[pose]?.lip ? placeGrippingPaws(name, pose, number - 8) : stance(name, pose, number, octant);
    const pixels = compose(name, s);
    let left = W,
      top = H,
      right = 0,
      bottom = 0;
    for (let y = 0; y < H; y++) {
      const row = y*W;
      let first=0, last=W-1;
      while(first<W && !pixels[row+first])first++;
      if(first===W)continue;
      while(!pixels[row+last])last--;
      left=Math.min(left,first);right=Math.max(right,last);
      top=Math.min(top,y);bottom=y;
    }
    const width = right - left + 1, height = bottom - top + 1;
    const indices = new Uint8Array(width*height);
    for (let sy = 0; sy < height; sy++) {
      for (let sx = 0; sx < width; sx++) {
        const sourceX = s.faceEdge ? right - sx : left + sx;
        indices[sy*width + sx] = pixels[(top + sy) * W + sourceX];
      }
    }
    const result = {
      indices, width, height, canvases:[],
      x: s.faceEdge ? originX - right - 1 : left - originX,
      y: top - originY,
      item: itemAnchor(fighters[name], s, pixels),
    };
    if (s.faceEdge && result.item) result.item[0] = -result.item[0] - 2;
    if (tracksKitPaws(pose) || captivePoses.includes(pose) || sharedPointPoses.includes(pose)) {
      result.paws = [true, false].map((near) => {
        const [x, y] = wrist(fighters[name], s, near);
        const [px, py] = posePoint(x, y, s);
        return [2 * (s.faceEdge ? -px - 1 : px), 2 * py];
      });
    }
    frames.set(key, result);
    return result;
  }
  function frameCanvas(frame, name, coat) {
    if (frame.canvases[coat]) return frame.canvases[coat];
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d'), image = ctx.createImageData(frame.width,frame.height);
    const table = colorTables[name][coat];
    const words = new Uint32Array(image.data.buffer,image.data.byteOffset,frame.indices.length);
    for (let i=0;i<words.length;i++) words[i]=table[frame.indices[i]];
    ctx.putImageData(image,0,0);
    frame.canvases[coat] = canvas;
    return canvas;
  }

  const names = Object.keys(fighters);
  const poses = [
    'idle',
    'walk',
    'teeter',
    'dashStart',
    'clashRecoil',
    'dizzy',
    'run',
    'crouch',
    'crawl',
    'crouchHit',
    'jumpSquat',
    'turnJumpSquat',
    'backDrift',
    'righting',
    'footstool',
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
    'waveland',
    'wavelandBack',
    'ledge',
    'ledgeRoll',
    'ledgeClimb',
    'ledgeTrump',
    ...wallPoses,
    'rise',
    'win',
    ...landingPoses,
    ...shieldPoses,
    ...airDodgePoses,
    ...captivePoses,
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
      (!sharedPointPoses.includes(pose) && (!pose.startsWith(name) || !Object.prototype.hasOwnProperty.call(kitMoves, pose)))
    ) {
      return null;
    }
    const fraction = Number.isFinite(phase) ? Math.max(0, Math.min(1, phase)) : 0.5;
    const point = getFrame(name, pose, frameNumber(pose, 0, fraction, name)).item;
    return point ? point.slice() : null;
  }

  // Effects can follow the painted wrists through grabs, releases and paw strikes.
  function pawPoint(kind, pose, phase = 0.5, side = 'front') {
    const name = fighterName(kind);
    if (typeof pose !== 'string' || (!sharedPointPoses.includes(pose) && !captivePoses.includes(pose) && !(tracksKitPaws(pose) && pose.startsWith(name)))) return null;
    const fraction = Number.isFinite(phase) ? Math.max(0, Math.min(1, phase)) : 0.5;
    const frame = getFrame(name, pose, frameNumber(pose, 0, fraction, name));
    return frame.paws[side === 'rear' ? 1 : 0].slice();
  }

  function draw(ctx, kind, x, y, options = {}) {
    const name = fighterName(kind);
    const requested = options.pose ?? (options.state === 'ledgeTrump' ? 'ledgeTrump' : undefined);
    const kitMatches =
      !Object.prototype.hasOwnProperty.call(kitMoves, requested) || requested.startsWith(name);
    const pose = kitMatches && poses.includes(requested) ? requested : 'idle';
    const time = Number.isFinite(options.time) ? options.time : 0;
    const phase = Number.isFinite(options.phase) ? Math.max(0, Math.min(1, options.phase)) : 0.5;
    const scale = (Number.isFinite(options.scale) ? options.scale : 1) * 2;
    let octant = 0;
    if (pose === 'directionalAirDodge') {
      const dx = Number.isFinite(options.dodgeX) ? options.dodgeX : 0;
      const dy = Number.isFinite(options.dodgeY) ? options.dodgeY : 0;
      // The caller supplies facing-local X. The canvas reflection below supplies the world facing.
      if (dx || dy) octant = (8 + Math.round(Math.atan2(dy, dx) * 4 / Math.PI)) % 8;
    }
    const frame = getFrame(name, pose, frameNumber(pose, time, phase, name, options.backRoll), octant);
    const canvas = frameCanvas(frame,name,Number.isInteger(options.coat) && colorTables[name][options.coat] ? options.coat : 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (options.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(
      canvas,
      frame.x * scale,
      frame.y * scale,
      frame.width * scale,
      frame.height * scale,
    );
    ctx.restore();
  }

  function portrait(kind, coat = 0) {
    const name = fighterName(kind);
    if (!Number.isInteger(coat) || !colorTables[name][coat]) coat = 0;
    const key = name + '/' + coat;
    if (portraits.has(key)) return portraits.get(key);
    const frame = getFrame(name, 'idle', 0);
    const [left, top, width, height] = fighters[name].portrait;
    const zoom = 4;
    const canvas = document.createElement('canvas');
    canvas.width = width * zoom;
    canvas.height = height * zoom;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      frameCanvas(frame,name,coat),
      (frame.x - left) * zoom,
      (frame.y - top) * zoom,
      frame.width * zoom,
      frame.height * zoom,
    );
    const url = canvas.toDataURL('image/png');
    portraits.set(key, url);
    return url;
  }

  window.DogArt = Object.freeze({ draw, portrait, coatNames, itemPoint, pawPoint });
})();
