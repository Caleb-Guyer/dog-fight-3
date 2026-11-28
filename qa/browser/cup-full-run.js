const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw Error('Run browser input on the hosted Linux runner.');
const {chromium} = require('playwright-core');

// Pip's route has one continuous deck at each stop. Read the fighters and the deck,
// then move, tap an attack, or recover using the normal controller bindings.
function pipInput(world, tick, deck) {
  const [pip, opponent] = world.dogs;
  const floor = deck || world.terrain.find(platform => !platform.thin);
  const dx = opponent.x - pip.x, dy = opponent.y - pip.y;
  const distance = Math.abs(dx), direction = Math.sign(dx);
  const off = pip.x < floor.x1 - 6 || pip.x > floor.x2 + 6;
  const inward = pip.x < (floor.x1 + floor.x2) / 2 ? 1 : -1;
  const faceOrApproach = stop => distance > stop || (distance > 3 && direction !== pip.face);

  if (world.mode === 'adventure') {
    return {
      x: off ? inward : faceOrApproach(64) ? direction : 0,
      y: off ? -1 : 0,
      jump: off && tick % 30 < 12,
      special: off && !pip.jumps && tick % 8 < 2,
      attack: distance < 139 && Math.abs(dy) < 75 && tick % 8 < 2,
    };
  }
  if (off || pip.ledge) {
    return {
      x: inward, y: -1,
      jump: (pip.ledge || pip.vy > 40) && tick % 12 < 3,
      special: pip.y > floor.y + 12 && !pip.jumps && tick % 8 < 3,
    };
  }
  const grounded = pip.ground >= 0;
  const close = distance < 96 && Math.abs(dy) < 70;
  const approach = opponent.kind === 'brisket' ? 285 : 265;
  if (grounded && distance > 55 && distance < approach && Math.abs(dy) < 55)
    return {x: direction, special: tick % 12 < 4};
  if (grounded && close && opponent.shield) return {x: direction, grab: tick % 9 < 3};
  if (pip.grip) return {x: direction, attack: tick % 8 < 3};
  const targetX = Math.max(floor.x1 + 34, Math.min(floor.x2 - 34, opponent.x));
  return {
    x: distance > 52 ? Math.sign(targetX - pip.x) : faceOrApproach(52) ? direction : 0,
    y: grounded && dy > 74 && world.terrain[pip.ground].thin ? 1 : 0,
    jump: grounded && dy < -67 && distance < 150 && tick % 9 < 3,
    attack: close && (!grounded || opponent.damage < 55) && tick % 10 < 3,
    smash: close && grounded && opponent.damage >= 55 && tick % 18 < 6,
  };
}

function cupInput(world, tick) {
  const [fighter, rival] = world.dogs;
  if (world.mode === 'adventure' || fighter.kind === 'pip') return pipInput(world, tick);
  const dx = rival.x - fighter.x, dy = rival.y - fighter.y;
  const distance = Math.abs(dx), direction = Math.sign(dx) || fighter.face;
  const floors = world.terrain.filter(platform => !platform.thin);
  const gap = floor => Math.max(floor.x1 - fighter.x, fighter.x - floor.x2, 0);
  const floor = floors.reduce((best, next) => gap(next) < gap(best) ? next : best);
  const center = (floor.x1 + floor.x2) / 2;
  const edge = direction > 0 ? floor.x2 : floor.x1;
  if (fighter.kind === 'brisket') {
    // Leave room to brake a Shoulder Charge. Cover the edge with a jab instead.
    const runway = (edge - fighter.x) * direction;
    if (!fighter.ledge && gap(floor) === 0 && fighter.ground >= 0 && runway < 160)
      return {x:Math.sign(center - fighter.x), attack:distance < 90 && tick % 12 < 4};
    return pipInput(world, tick, floor);
  }
  // Use Disc Chase to close on Noodle when his tether covers the approach.
  if (fighter.kind === 'clover' && rival.kind === 'noodle') return pipInput(world, tick, floor);
  if (gap(floor) > 6 || fighter.ledge) {
    return {x:Math.sign(center - fighter.x), y:-1,
      jump:(fighter.ledge || fighter.vy > 10) && tick % 10 < 3,
      special:fighter.y > floor.y && !fighter.jumps && tick % 12 < 7};
  }
  const reach = fighter.kind === 'noodle' ? 185 : 480;
  const approach = distance > reach - 30 || direction !== fighter.face ? direction : 0;
  // Noodle can interrupt the melee fighters with a short poke between tether swings.
  const poke = fighter.kind === 'noodle' && rival.kind !== 'clover';
  if (poke) {
    const atEdge = Math.abs(fighter.x - edge) < 75 && (rival.x - edge) * direction > -18;
    if (rival.stockLift || rival.absent || !rival.stocks || (atEdge && fighter.ground >= 0))
      return {x:Math.abs(center - fighter.x) > 75 ? Math.sign(center - fighter.x) : 0,
        shield:!rival.stockLift && distance < 90};
    if (fighter.stun > 0) return {x:Math.sign(center - fighter.x), y:-.3, shield:tick % 11 < 2};
  }
  if (fighter.grip) return {x:direction, grab:tick % 8 === 0};
  const across = (rival.x - edge) * direction > 30;
  if (across && distance > reach && Math.abs(fighter.x - edge) < 85)
    return {x:direction, jump:tick % 18 < 10, attack:fighter.ground < 0 && tick % 14 < 3};
  if (fighter.ground < 0)
    return {x:approach, attack:distance < 125 && Math.abs(dy) < 90 && tick % 12 < 3};
  if (dy > 74 && world.terrain[fighter.ground].thin) return {y:1, jump:tick % 10 < 2};
  if (dy < -66 && distance < 145)
    return {x:approach, jump:tick % 19 < 10, smash:tick % 22 < 6, y:-1};
  if (rival.shield && distance < 65) return {x:direction, grab:tick % 10 < 2};
  if (distance > reach) return {x:direction};
  if (poke && !rival.stun && distance < 95 && !fighter.attack)
    return {x:direction, attack:tick % 6 < 3};
  const ready = !fighter.attack && !fighter.smashCharge && !fighter.stun;
  return {x:direction, smash:poke ? ready && tick % 7 < 4 : tick % 14 < 3};
}

function attachPad(policy, signature) {
  const pad = {index:0, id:'Hosted Cup pad', mapping:'standard', connected:true, axes:[0,0,0,0],
    buttons:Array.from({length:17}, () => ({pressed:false,value:0}))};
  let world, ticks = 0, usedSignature = false;
  const step = DogFight.Battle.prototype.step;
  DogFight.Battle.prototype.step = function(...args) {
    if (world !== this) { world = this; ticks = 0; usedSignature = false; }
    ticks++;
    const result = step.apply(this,args);
    if (signature && this.dogs[0].attack?.moveId === signature) usedSignature = true;
    return result;
  };
  Object.defineProperty(navigator,'getGamepads',{value:() => {
    const playing = world && world.end === null && !world.finished && !document.querySelector('#dialog').open;
    const input = playing ? policy(world,ticks) : {};
    pad.axes[0] = input.x || 0;
    pad.axes[1] = input.y || 0;
    for (const [name,index] of Object.entries({jump:0,special:1,attack:2,grab:3,shield:4,smash:7})) {
      pad.buttons[index].pressed = !!input[name];
      pad.buttons[index].value = Number(!!input[name]);
    }
    return [pad];
  }});
  window.cupFight = () => world && ({
    ticks, fighter:world.dogs[0].kind, opponent:world.dogs[1].kind, usedSignature,
    stage:world.stage, stocks:world.dogs.map(d=>d.stocks),
    end:world.end, finished:world.finished, bossHP:world.foes?.[0]?.hp,
    knockouts:world.matchCard?.losses.filter(loss=>loss.slot===1).length,
  });
}

const routes = {
  pip: {opponents:['noodle','clover','brisket'], signature:'pipPounce'},
  brisket: {opponents:['pip','noodle','clover'], signature:'brisketCharge'},
  noodle: {opponents:['brisket','clover','pip'], signature:'noodleLeadSnap'},
  clover: {opponents:['pip','brisket','noodle'], signature:'cloverLineDrive'},
};

async function play(browser, kind) {
  const route = routes[kind];
  assert(route, 'Unknown Cup fighter: '+kind);
  const page = await browser.newPage({viewport:{width:800,height:450},reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  const roster = page.locator('#cup-select[data-view=roster]');
  const selected = roster.locator('[aria-pressed=true]');
  const save = () => page.evaluate(k=>JSON.parse(localStorage.getItem('dog-fight-3.cup.'+k)),kind);
  const installPad = () => page.evaluate(
    `(pipInput => (${attachPad})(${cupInput}, ${JSON.stringify(route.signature)}))(${pipInput})`
  );
  await page.goto('http://127.0.0.1:8080/');
  await page.locator('#home-cup').click();
  await roster.waitFor();
  await roster.locator('[data-cup-dog='+kind+']').click();
  assert.equal(await selected.getAttribute('data-cup-dog'),kind);
  await installPad();
  assert.equal(await save(),null);
  await page.keyboard.press('Enter');
  const rounds = [], result = page.locator('.cup-result');
  let runId;
  for (let round=1; round<=4; round++) {
    for(let seconds=0; seconds<430 && !(await result.isVisible()); seconds+=3)
      await page.clock.runFor(3000);
    const fight = await page.evaluate(()=>cupFight());
    const title = await page.locator('#dialog-title').textContent();
    assert.equal(title,round===4?'Arcade Cup clear!':'Round '+round+' clear',JSON.stringify({round,title,fight,errors}));
    assert.equal(fight.fighter,kind);
    assert.deepEqual(await result.locator('button:visible').allTextContents(),
      [round===4?'Choose a fighter':'Play round '+(round+1),'More options']);
    const entry = await save(), run = entry.active || entry.last;
    runId ??= run.id;
    assert.equal(run.id,runId);assert.equal(run.retries,0);
    assert.equal(run.wins.length,round);
    const won = run.wins[round-1];
    assert.equal(won.stocks,fight.stocks[0]);assert(won.stocks>0 && won.frames>60);
    if(round<4){
      assert.equal(fight.opponent,route.opponents[round-1]);
      assert(fight.usedSignature,kind+' never used '+route.signature+' in round '+round);
      assert.equal(fight.end,0);assert.equal(fight.knockouts,3);
    } else {
      assert.equal(fight.finished,'exit');assert(fight.bossHP<=0);
      assert.equal(entry.clears,1);assert.equal(entry.active,null);
      assert.deepEqual(entry.best,entry.last);
    }
    rounds.push({opponent:round===4?'Copper Hound':fight.opponent,...won});
    if(round===1){
      await result.locator('#cup-more').click();
      await result.locator('[data-do=home]').click();
      await page.locator('#home-continue[data-save='+kind+']').waitFor();
      assert.match(await page.locator('#continue-detail').textContent(),/Round 2 of 4/);
      await page.reload();
      await page.locator('#home-cup').click();
      await page.locator('[data-do=cup-start]').waitFor();
      assert.equal(await selected.getAttribute('data-cup-dog'),kind);
      assert.deepEqual(await save(),entry);
      await installPad();
      assert.equal(await page.locator('[data-do=cup-start]').textContent(),'Continue to round 2');
      await page.keyboard.press('Enter');
    } else if(round<4){
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'cup-next');
      await page.keyboard.press('Enter');
      await result.waitFor({state:'hidden'});
    }
  }
  await page.keyboard.press('Enter');await roster.waitFor();
  assert.equal(await selected.getAttribute('data-cup-dog'),kind);
  const others = Object.keys(routes).filter(id=>id!==kind);
  assert(await page.evaluate(ids=>ids.every(id=>localStorage.getItem('dog-fight-3.cup.'+id)===null),others));
  assert.deepEqual(errors,[]);
  console.log('::notice title=Full Cup run::'+kind+' '+JSON.stringify(rounds));
}

if(require.main===module)(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try {await play(browser,process.argv[2] || 'pip');} finally {await browser.close();}
})().catch(error=>{console.error(error);console.log('::error::'+String(error.stack).replaceAll('\n','%0A'));process.exitCode=1;});
module.exports={attachPad,pipInput};
