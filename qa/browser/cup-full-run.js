const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw Error('Run browser input on the hosted Linux runner.');
const {chromium} = require('playwright-core');

// Pip's route has one continuous deck at each stop. Read the fighters and the deck,
// then move, tap an attack, or recover using the normal controller bindings.
function pipInput(world, tick) {
  const [pip, opponent] = world.dogs;
  const floor = world.terrain.find(platform => !platform.thin);
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

function attachPad(policy) {
  const pad = {index:0, id:'Hosted Cup pad', mapping:'standard', connected:true, axes:[0,0,0,0],
    buttons:Array.from({length:17}, () => ({pressed:false,value:0}))};
  let world, ticks = 0;
  const step = DogFight.Battle.prototype.step;
  DogFight.Battle.prototype.step = function(...args) {
    if (world !== this) { world = this; ticks = 0; }
    ticks++;
    return step.apply(this,args);
  };
  Object.defineProperty(navigator,'getGamepads',{value:() => {
    const playing = world && world.end === null && !world.finished && !document.querySelector('#dialog').open;
    const input = playing ? policy(world,ticks) : {};
    pad.axes[0] = input.x || 0;
    pad.axes[1] = input.y || 0;
    for (const [name,index] of Object.entries({jump:0,special:1,attack:2,grab:3,smash:7})) {
      pad.buttons[index].pressed = !!input[name];
      pad.buttons[index].value = Number(!!input[name]);
    }
    return [pad];
  }});
  window.cupFight = () => world && ({
    ticks, opponent:world.dogs[1].kind, stage:world.stage, stocks:world.dogs.map(d=>d.stocks),
    end:world.end, finished:world.finished, bossHP:world.foes?.[0]?.hp,
    knockouts:world.matchCard?.losses.filter(loss=>loss.slot===1).length,
  });
}

async function play(browser) {
  const page = await browser.newPage({viewport:{width:800,height:450},reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
  const save = () => page.evaluate(()=>JSON.parse(localStorage.getItem('dog-fight-3.cup.pip')));
  async function openRoster() {
    await page.goto('http://127.0.0.1:8080/#arcade/pip');
    await page.locator('#cup-select[data-view=roster] [data-cup-dog=pip]').waitFor();
    await page.evaluate('('+attachPad.toString()+')('+pipInput.toString()+')');
  }
  await openRoster();
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
    const entry = await save(), run = entry.active || entry.last;
    runId ??= run.id;
    assert.equal(run.id,runId);assert.equal(run.retries,0);
    assert.equal(run.wins.length,round);
    const won = run.wins[round-1];
    assert.equal(won.stocks,fight.stocks[0]);assert(won.stocks>0 && won.frames>60);
    if(round<4){
      assert.equal(fight.opponent,['noodle','clover','brisket'][round-1]);
      assert.equal(fight.end,0);assert.equal(fight.knockouts,3);
    } else {
      assert.equal(fight.finished,'exit');assert(fight.bossHP<=0);
      assert.equal(entry.clears,1);assert.equal(entry.active,null);
      assert.deepEqual(entry.best,entry.last);
    }
    rounds.push({opponent:round===4?'Copper Hound':fight.opponent,...won});
    if(round===1){
      await page.reload();
      await page.locator('[data-do=cup-start]').waitFor();
      await page.evaluate('('+attachPad.toString()+')('+pipInput.toString()+')');
      assert.equal(await page.locator('[data-do=cup-start]').textContent(),'Continue to round 2');
      await page.keyboard.press('Enter');
    } else if(round<4){
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.do),'cup-next');
      await page.keyboard.press('Enter');
      await result.waitFor({state:'hidden'});
    }
  }
  await page.keyboard.press('Enter');await page.locator('#cup-select[data-view=roster]').waitFor();
  assert.deepEqual(errors,[]);
  console.log('::notice title=Full Cup run::'+JSON.stringify(rounds));
}

if(require.main===module)(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try {await play(browser);} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={attachPad,pipInput};
