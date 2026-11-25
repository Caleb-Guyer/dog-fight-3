const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux')
  throw new Error('Run these input playtests on the GitHub-hosted Linux runner.');
const { chromium } = require('playwright-core');
const root = 'http://127.0.0.1:8080/';
async function testEdges(page, mobile) {
  await page.goto(root + '#training/edges');
  const status = page.locator('#edge-status');
  const activate = id => mobile ? page.locator('#' + id).tap() : page.locator('#' + id).click();
  const session = mobile && await page.context().newCDPSession(page);
  const touch = (type, touchPoints = []) => session.send('Input.dispatchTouchEvent', {type, touchPoints});
  async function point(id, name) {
    const el = page.locator('[data-touch="' + name + '"]');
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    assert(box && box.width > 0, name);
    return {id, x:box.x + box.width/2, y:box.y + box.height/2};
  }
  async function waitFor(result, limit = 100) {
    for (let i = 0; i < limit; i++) {
      if (await status.getAttribute('data-result') === result) return;
      await page.clock.runFor(32);
    }
    assert.fail('Expected ' + result + ', saw "' + await status.innerText() + '" (' + await page.locator('#recovery-tip').innerText() + ')');
  }
  async function attack(down = false) {
    if (!mobile) {
      if (down) await page.keyboard.down('s');
      await page.keyboard.press('j');
      if (down) await page.keyboard.up('s');
    } else if (down) {
      const d = await point(1,'down'), a = await point(2,'attack');
      await touch('touchStart',[d]);
      await touch('touchStart',[d,a]);
      await touch('touchEnd');
    } else await page.locator('[data-touch="attack"]').tap();
  }
  if (mobile) {
    const center = await point(1, 'neutral'), right = await point(1, 'right');
    await touch('touchStart', [center]);
    await touch('touchMove', [right]);
  } else {
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('d');
  }
  await waitFor('teeter');
  assert.match(await status.innerText(), /Balanced/);
  await waitFor('edgeCue');
  if (mobile) await touch('touchEnd');
  else { await page.keyboard.up('d'); await page.keyboard.up('ShiftLeft'); }
  await attack(true);
  await waitFor('covered');
  assert.match(await status.innerText(), /caught the ledge jump/);
  await activate('edge-tip');
  await attack();
  await waitFor('edgeLand');
  assert.match(await status.innerText(), /9f landing/);
  await waitFor('edgeCancel');
  assert.match(await status.innerText(), /6f saved/);
  await attack(true);
  await waitFor('followup');
  assert.match(await status.innerText(), /Belly Drop connected · 6f saved/);
  await activate('edge-deep');
  await activate('edge-side');
  assert.match(await status.innerText(), /Drifting left/);
  await activate('edge-slow');
  await attack();
  await waitFor('settled');
  await activate('reset-training');
  await status.waitFor({state:'hidden', timeout:4000});
  await activate('edge-training');
  assert(await page.locator('#edge-tip').isVisible());
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed ledge walk, timed low tilt, edge cancel, follow-up and mirrored deep landing.');
  await page.goto(root + '#training/ledge-catch');
  assert.match(await status.innerText(), /Short recovery/);
  await attack();
  await waitFor('ledge');
  assert.match(await status.innerText(), /0% · 15f protected/);
  await attack(true);
  await waitFor('tooEarly');
  assert.match(await status.innerText(), /protection left/);
  await activate('edge-longCatch');
  await activate('edge-side');
  await attack();
  await waitFor('ledge');
  assert.match(await status.innerText(), /0% · 34f protected/);
  await waitFor('edgeOpen');
  await attack(true);
  await waitFor('timedHit');
  assert.match(await status.innerText(), /Doorstop caught the hang · 34f catch/);
  await activate('edge-shortCatch');
  const damage = page.getByRole('slider', {name:'Dummy damage'});
  if (mobile) {
    await damage.scrollIntoViewIfNeeded();
    const box = await damage.boundingBox();
    await page.touchscreen.tap(box.x + box.width - 8, box.y + box.height/2);
  } else await damage.press('End');
  assert(Number(await damage.inputValue()) >= 120);
  await attack();
  await waitFor('ledge');
  assert.match(await status.innerText(), /6f protected/);
  await attack(true);
  await waitFor('timedHit');
  assert.match(await status.innerText(), /Doorstop caught the hang · 6f catch/);
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed short and long catches, changing rival damage and punishing the worn catch.');
  await page.goto(root + '#training/corner-pressure');
  async function guard(held) {
    if (mobile) {
      if (held) await touch('touchStart',[await point(1,'shield')]);
      else await touch('touchEnd');
    } else if (held) await page.keyboard.down('l');
    else await page.keyboard.up('l');
  }
  await guard(true);
  await waitFor('caughtLip');
  assert.match(await status.innerText(),/pushed off.*caught the ledge/i);
  await guard(false);
  await activate('edge-inside');
  await guard(true);
  await waitFor('heldCorner');
  await guard(false);
  await activate('edge-corner');
  await activate('edge-side');
  await guard(true);
  await waitFor('cornerCue');
  await guard(false);
  await waitFor('parriedCorner');
  assert.match(await status.innerText(),/parried.*held the corner/i);
  console.log((mobile ? 'Touch' : 'Keyboard') + ' passed a shield push-off, a deeper block, and a parry on the opposite edge.');
}
async function testTumble(page, mobile) {
  await page.goto(root + '#training/tumble');
  const status = page.locator('#launch-status');
  const activate = id => mobile ? page.locator('#' + id).tap() : page.locator('#' + id).click();
  const attack = () => mobile ? page.locator('[data-touch="attack"]').tap() : page.keyboard.press('j');
  const session = mobile && await page.context().newCDPSession(page);
  async function side(dir) {
    if (!mobile) {
      await page.keyboard.up('a'); await page.keyboard.up('d');
      if (dir) await page.keyboard.down(dir === 'left' ? 'a' : 'd');
    } else {
      if (side.held) await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      if (dir) {
        const el = page.locator('[data-touch="' + dir + '"]');
        await el.scrollIntoViewIfNeeded();
        const b = await el.boundingBox();
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]});
      }
      side.held = !!dir;
    }
  }
  async function waitFor(result) {
    for(let i=0;i<85;i++) {
      if(await status.getAttribute('data-result')===result) return;
      await page.clock.runFor(80);
    }
    assert.fail('Expected '+result+', saw '+await status.innerText());
  }
  assert.match(await status.innerText(),/Escape the juggle/);
  await attack();
  await waitFor('juggled');
  assert.match(await status.innerText(),/Crown Lift caught you/);
  await activate('launch-juggle');
  await attack();
  await waitFor('juggleCue');
  await side('right');
  await waitFor('clean');
  assert.match(await status.innerText(),/jump and dodge saved/);
  await side(null);
  await activate('juggle-chase');
  await attack();
  await waitFor('juggleCue');
  await side('right');
  await waitFor('juggled');
  assert.match(await status.innerText(),/Crown Bump caught you/);
  await side(null);
  await activate('launch-side');
  await attack();
  await waitFor('juggleCue');
  await side('left');
  await page.clock.runFor(240);
  await side('right');
  await waitFor('clean');
  await side(null);
  await activate('reset-training');
  await status.waitFor({state:'hidden', timeout:4000});
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard')+' passed neutral landing, tumble wiggle, aerial chase and reversed drift.');
}
async function testBraking(page, mobile) {
  const activate = locator => mobile ? locator.tap() : locator.click();
  const button = id => activate(page.locator('#' + id));
  const status = page.locator('#footwork-status');
  const cdp = mobile && await page.context().newCDPSession(page);
  const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:points});
  async function point(name, id) {
    const el = page.locator('[data-touch="' + name + '"]');
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    return {id, x:box.x + box.width / 2, y:box.y + box.height / 2};
  }
  async function waitFor(result) {
    for (let i = 0; i < 110; i++) {
      if (await status.getAttribute('data-result') === result) return;
      await page.clock.runFor(32);
    }
    assert.fail('Expected ' + result + ', saw ' + await status.innerText());
  }
  const run = async dir => {
    if (mobile) await touch('touchStart', [await point(dir, 1)]);
    else await page.keyboard.down(dir === 'right' ? 'd' : 'a');
    await waitFor('atMark');
  };
  const release = async () => {
    if (mobile) await touch('touchEnd');
    else { await page.keyboard.up('d'); await page.keyboard.up('a'); }
  };
  const hit = async dir => {
    if (mobile) await touch('touchStart', [await point(dir, 1), await point('attack', 2)]);
    else { await page.keyboard.down(dir === 'right' ? 'd' : 'a'); await page.keyboard.press('j'); }
  };

  await page.goto(root + '#training/braking');
  await run('right');
  await hit('right');
  await waitFor('dashHit'); await release();
  await button('footwork-brake');
  await run('right');
  await release(); await page.clock.runFor(40);
  if (mobile) await touch('touchStart', [await point('right', 1)]);
  await hit('right'); await page.clock.runFor(40); await release();
  await waitFor('slidingHit');
  assert.match(await status.innerText(), /Stamp Kick · sliding hit/);

  await page.goto(root);
  await button('home-options');
  const option = page.locator('[data-do="option-tiltStick"]');
  assert.match(await option.innerText(), /Smash/);
  await activate(option);
  assert.match(await option.innerText(), /Tilt/);
  await page.reload(); await button('home-options');
  assert.equal(await option.getAttribute('aria-pressed'), 'true');
  await activate(page.locator('#dialog-body [data-do="close"]'));
  await page.goto(root + '#training/braking');
  await button('footwork-pivot'); await button('footwork-side');
  await run('left');
  if (mobile) {
    const left = await point('left', 1), thumb = await point('smash', 2);
    await touch('touchStart', [left, thumb]);
    await page.clock.runFor(48);
    await touch('touchMove', [left, {...thumb, x:thumb.x + 21}]);
    await page.clock.runFor(48);
  } else await page.keyboard.press('y');
  await waitFor('slidingHit');
  assert.match(await status.innerText(), /Stamp Kick · caught the chase/);
  await release();
  await page.clock.runFor(400);
  await page.evaluate(() => {
    window.pressTrace = [];
    for (const kind of ['pointerdown','pointerup','pointercancel','click'])
      document.addEventListener(kind, e => window.pressTrace.push([kind, e.target.closest('button')?.id]), true);
  });
  await button('reset-training');
  await page.clock.runFor(400);
  await status.waitFor({state:'hidden', timeout:4000});
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed dash attack, brake tilt, saved tilt-stick setting and mirrored pivot punish.');
}
async function testFootstools(page, mobile) {
  await page.goto(root+'#training/footstools');
  const status=page.locator('#spacing-status');
  const button = id => mobile ? page.locator('#'+id).tap() : page.locator('#'+id).click();
  const start = () => mobile ? page.locator('[data-touch="attack"]').tap() : page.keyboard.press('j');
  const cdp=mobile && await page.context().newCDPSession(page);
  const keys={left:'a',right:'d',jump:'Space',shield:'l'};
  async function hold(names) {
    if (!mobile) {
      for (const name of names) await page.keyboard.down(keys[name]);
      return;
    }
    const points=[];
    for (const name of names) {
      const el=page.locator('[data-touch="'+name+'"]');
      await el.scrollIntoViewIfNeeded();
      const box=await el.boundingBox();
      points.push({id:points.length+1,x:box.x+box.width/2,y:box.y+box.height/2});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...points]});
    }
  }
  async function release() {
    if (mobile) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else for(const key of Object.values(keys)) await page.keyboard.up(key);
  }
  async function waitFor(result) {
    for(let i=0;i<140;i++){
      if(await status.getAttribute('data-result')===result)return;
      await page.clock.runFor(32);
    }
    assert.fail('Expected '+result+', saw '+await status.innerText());
  }
  assert.match(await status.innerText(),/Footstool rescue/);
  await start(); await waitFor('fell');
  await button('spacing-footstool'); await button('spacing-side');
  await start(); await waitFor('footstoolCue');
  await hold(['left','jump']); await waitFor('saved'); await release();
  assert.match(await status.innerText(),/Back onstage/);
  await button('spacing-footstoolTech');
  await start(); await waitFor('downed');
  await button('spacing-footstoolTech');
  await start(); await waitFor('footstool');
  // The victim hits the floor eleven frames after the bounce in this matchup.
  await page.clock.runFor(96);
  await hold(['right','shield']); await waitFor('techRoll'); await release();
  await button('reset-training'); await page.clock.runFor(400);
  await status.waitFor({state:'hidden',timeout:4000});
  console.log((mobile?'Phone touch':'Desktop keyboard')+' passed exhausted footstool rescue, missed tech and directional floor tech.');
}
async function testSoloCpu(page, mobile) {
  const select = selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
  const cpu = page.locator('#cpu-level'), mode = page.locator('#match-mode');
  await page.goto(root + '#solo');
  assert.match(await cpu.innerText(), /Arcade/i);
  await select('#cpu-level');
  await select('[data-cpu="rookie"]');
  await page.reload();
  assert.match(await cpu.innerText(), /Rookie/i);
  for (const other of ['local','training']) {
    await select('[data-mode="'+other+'"]');
    assert(await cpu.isHidden());
  }
  await select('[data-mode="solo"]');
  if (mobile) {
    const box = await cpu.boundingBox();
    assert(box && box.x >= 0 && box.x + box.width <= 391);
  }
  await select('#start');
  assert.match(await mode.innerText(), /Rookie CPU/i);
  await select('#pause');
  await select('[data-do="cpu-level"]');
  await select('#dialog-close');
  assert.equal(await page.locator('#dialog').getAttribute('data-view'), 'pause');
  await select('[data-do="cpu-level"]');
  await select('[data-cpu="rival"]');
  assert.match(await mode.innerText(), /Rival CPU/i);

  await page.goto(root + '#solo/shield-read');
  assert.match(await page.locator('#match-stage').innerText(), /Picnic/i);
  assert.match((await page.locator('.hud-name').allTextContents()).join(' '), /Pip.*Noodle/i);
  assert.equal(await page.locator('.lives[aria-label="3 stocks"]').count(), 2);
  // Observe the dogs and shield impacts so input follows the fight at either device's frame cadence.
  await page.evaluate(() => {
    const battle = window.DogFight.Battle.prototype;
    const block = battle.block, step = battle.step;
    let respond = false;
    battle.block = function (...args) {
      const result = block.apply(this, args);
      if (args[0].index === 0) respond = true;
      return result;
    };
    battle.step = function (...args) {
      const result = step.apply(this, args);
      const [p,q] = this.dogs;
      if (p.floorAction?.type === 'spotDodge') respond = false;
      window.soloProbe = {
        gap:q.x-p.x, grounded:p.ground >= 0 && !p.grip && !p.floorAction, respond,
        caught:this.bot.spotPunishes || 0, predictions:this.bot.spotReads || 0,
        position:p.x, tick:this.time, escape:p.floorAction?.type
      };
      return result;
    };
  });
  await page.clock.runFor(2450);
  const cdp = mobile && await page.context().newCDPSession(page);
  const keys = {left:'a', right:'d', shield:'l', down:'s'};
  const points = {};
  if (mobile) {
    for (const [i, key] of Object.keys(keys).entries()) {
      const box = await page.locator('[data-touch="'+key+'"]').boundingBox();
      points[key] = {id:i+1, x:box.x+box.width/2, y:box.y+box.height/2};
    }
  }
  const touch = (type, names) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:names.map(key => points[key])});
  let held = [];
  async function hold(next) {
    if (next.join() === held.join()) return;
    if (mobile) {
      const contacts = [...held];
      if (held.some(key => !next.includes(key))) {
        await touch('touchEnd', []);
        contacts.length = 0;
      }
      for (const key of next.filter(key => !contacts.includes(key))) {
        contacts.push(key);
        await touch('touchStart', contacts);
      }
    } else {
      for (const key of held.filter(key => !next.includes(key))) await page.keyboard.up(keys[key]);
      for (const key of next.filter(key => !held.includes(key))) await page.keyboard.down(keys[key]);
    }
    held = next;
  }
  for (let frame = 0; frame < 1000; frame++) {
    const state = await page.evaluate(() => window.soloProbe);
    if (state?.caught) break;
    let next = [];
    if (state?.grounded) {
      if (Math.abs(state.gap) > 120) next = [state.gap > 0 ? 'right' : 'left'];
      else next = state.respond ? ['shield','down'] : ['shield'];
    }
    await hold(next);
    await page.clock.runFor(16);
  }
  await hold([]);
  await select('#pause');
  assert.match(await page.locator('#dialog-body').innerText(), /Rival expected a spot-dodge .*caught [1-9]\d* with a delayed down tilt/i);
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed CPU selection, replay and a learned shield punish.');
}

async function testFrameAdvance(page, mobile) {
  await page.goto(root + '#training/landing-buffer');
  const status = page.locator('#frame-status');
  const button = id => mobile ? page.locator('#'+id).tap() : page.locator('#'+id).click();
  const session = mobile && await page.context().newCDPSession(page);
  const controls = {jump:'Space', down:'s', attack:'j'};
  async function input(names) {
    if (!mobile) {
      for (const name of names) await page.keyboard.down(controls[name]);
      return;
    }
    const points = [];
    for (const name of names) {
      const box = await page.locator('[data-touch="'+name+'"]').boundingBox();
      points.push({id:points.length+1,x:box.x+box.width/2,y:box.y+box.height/2});
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
    }
  }
  async function release() {
    if (mobile) await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else for (const key of Object.values(controls)) await page.keyboard.up(key);
  }
  assert.match(await status.innerText(), /freeze on landing/i);
  await input(['down','jump','attack']);
  await page.clock.runFor(45);
  await release();
  await page.clock.runFor(1300);
  const start = await status.innerText();
  assert.match(start, /Frame \+0\s+Brisket · Landing recovery 18f/);
  await page.clock.runFor(600);
  assert.equal(await status.innerText(), start);
  await input(['jump']);
  if (mobile) await release(); // A quick touchscreen tap, queued until the first manual tick.
  async function advance() {
    if (mobile) await button('frame-step');
    else await page.keyboard.press('BracketRight');
    await page.clock.runFor(32);
  }
  for (let i=1;i<=18;i++) {
    await advance();
    const text = await status.innerText();
    assert(text.includes('Frame +'+i+'\n'), text);
    if (i === 10) {
      assert.match(text, /Landing recovery 8f/);
      assert.equal(text.includes('Jump held'), !mobile);
    }
  }
  if (mobile) {
    assert.match(await status.innerText(), /Brisket · Grounded/);
    await button('frame-toggle');
  } else {
    assert.match(await status.innerText(), /Jump squat 1\/3/);
    await release();
    for (let i=0;i<3;i++) await advance();
    assert.match(await status.innerText(), /Brisket · Rising/);
    await page.keyboard.press('BracketLeft');
  }
  assert(await status.isHidden());
  await button('frame-toggle');
  assert.match(await status.innerText(), /Frame \+0/);
  await button('reset-training');
  assert(await status.isHidden());
  assert(await page.locator('#frame-step').isHidden());
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard')+' passed landing freeze, exact frame counts, jump timing, resume and reset.');
}

async function testJumpCancel(page, mobile) {
  await page.goto(root + '#training/catch-the-landing');
  await page.evaluate(()=>{
    const proto=window.DogFight.Battle.prototype, capture=proto.captureInput;
    window.catchInputs=[];
    proto.captureInput=function(f,input) {
      if(f.index===0 && this.footworkPractice?.phase==='atMark' && window.catchInputs.length<14)
        window.catchInputs.push([input.y,input.jump,input.smash,input.smashY,!!input.tapped?.smash,f.lastMove]);
      return capture.call(this,f,input);
    };
    window.finishCatchTrace=()=>{proto.captureInput=capture;};
  });
  const status=page.locator('#footwork-status');
  const activate=id=>mobile?page.locator('#'+id).tap():page.locator('#'+id).click();
  const session=mobile && await page.context().newCDPSession(page);
  const touch=(type,points=[])=>session.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  async function point(name,id) {
    const box=await page.locator('[data-touch="'+name+'"]').boundingBox();
    return {id,x:box.x+box.width/2,y:box.y+box.height/2};
  }
  async function waitFor(result) {
    for(let i=0;i<125;i++) {
      if(await status.getAttribute('data-result')===result) return;
      await page.clock.runFor(16);
    }
    assert.fail('Expected '+result+', saw '+await status.innerText()+' '+JSON.stringify(await page.evaluate(()=>window.catchInputs)));
  }
  for(const charge of [false,true]) {
    if(charge) {
      await activate('footwork-antiAir');
      await activate('footwork-side');
    }
    const dir=charge?'left':'right', key=charge?'a':'d';
    if(mobile) await touch('touchStart',[await point(dir,1)]);
    else await page.keyboard.down(key);
    await waitFor('atMark');
    if(mobile) {
      await touch('touchEnd');
      const up=await point('up',1), jump=await point('jump',2), smash=await point('smash',2);
      await touch('touchStart',[up]);
      await touch('touchStart',[up,jump]);
      await page.clock.runFor(32);
      await touch('touchMove',[up,smash]);
    } else {
      await page.keyboard.up(key);
      await page.keyboard.down('w'); await page.keyboard.down('Space');
      await page.clock.runFor(32);
      await page.keyboard.down('i');
    }
    await page.clock.runFor(charge ? 920 : 32);
    if(mobile) await touch('touchEnd');
    else { await page.keyboard.up('i'); await page.keyboard.up('Space'); await page.keyboard.up('w'); }
    await waitFor(charge?'caughtShield':'slideCatch');
  }
  await activate('reset-training');
  assert(await status.isHidden());
  await page.evaluate(()=>window.finishCatchTrace());
  console.log((mobile?'Phone two-thumb slide':'Desktop keyboard')+' passed a running anti-air and a late swing into shield.');
}

async function testStockClock(page, mobile) {
  const press = selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
  const clock = page.locator('#match-clock'), rules = page.locator('#rules-label');
  await page.goto(root + '#solo');
  assert.match(await rules.innerText(), /7 min/i);
  await press('#rules-label');
  await press('[data-minutes="1"]');
  await page.reload();
  assert.match(await rules.innerText(), /1 min/i);
  await press('[data-mode="local"]');
  if (await page.locator('#fetch-switch').getAttribute('aria-checked') === 'true') await press('#fetch-switch');
  await press('#start');
  assert.equal(await clock.innerText(), '1:00');
  await page.clock.runFor(6000);
  assert.match(await clock.innerText(), /^0:5[6-7]$/);
  await press('#pause');
  const paused = await clock.innerText();
  await page.clock.runFor(2000);
  assert.equal(await clock.innerText(), paused);
  await press('[data-do="resume"]');
  if (mobile) {
    await page.goto(root + '#training/combos');
    assert(await clock.isHidden());
    await page.goto(root + '#solo');
    await press('[data-mode="local"]');
    await press('#rules-label');
    await press('[data-do="sudden-start"]');
    await page.clock.runFor(100);
    assert.match(await page.locator('#match-mode').innerText(), /Local/i);
  } else {
    await page.clock.runFor(57000);
    assert.equal(await page.locator('#countdown').getAttribute('data-caption'), 'Time! Stocks tied');
  }
  assert.equal(await clock.innerText(), 'SD');
  assert.deepEqual(await page.locator('#hud .percentage').allTextContents(), ['300%', '300%']);
  assert.equal(await page.locator('.lives[aria-label="1 stock"]').count(), 2);
  await page.goto(root + '#solo/sudden-death');
  await page.clock.runFor(5000);
  assert.equal(await page.locator('#dialog').getAttribute('data-view'), 'result');
  const result = await page.locator('#dialog-body').innerText();
  assert.match(result, /Brisket wins!/i);
  assert.match(result, /Sudden Death KO/i);
  await press('[data-do="rematch"]');
  await page.clock.runFor(100);
  assert.equal(await clock.innerText(), 'SD');
  assert.deepEqual(await page.locator('#hud .percentage').allTextContents(), ['300%', '300%']);
  assert.equal(await page.locator('#countdown').textContent(), 'Sudden Death');
  await page.goto(root + '#training/combos');
  assert(await clock.isHidden());
  console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed stock rules, saved timer, pause, tiebreak, KO and rematch.');
}

async function testAngledTilts(page, mobile) {
  await page.goto(root+'#training/angled-tilts');
  const status = page.locator('#footwork-status');
  const press = id => mobile ? page.locator('#'+id).tap() : page.locator('#'+id).click();
  const session = mobile && await page.context().newCDPSession(page);
  const touch = (type,points) => session.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  async function point(key,id) {
    const box = await page.locator('[data-touch="'+key+'"]').boundingBox();
    return {x:box.x+box.width/2,y:box.y+box.height/2,id};
  }
  for (const [low,angle,quick] of [[false,false,false],[false,true,false],[true,true,false],[true,true,true]]) {
    await press('footwork-'+(low?'angleLow':'angleHigh'));
    if (low && !quick) await press('footwork-side');
    const side = low?'left':'right', vertical = low?'down':'up';
    if (mobile) {
      const aim = await point(angle ? vertical+'-'+side : side,1);
      await touch('touchStart',[await point('neutral',1)]);
      await touch('touchMove',[aim]);
      await touch('touchStart',[aim,await point('attack',2)]);
      if (!quick) await page.clock.runFor(45);
      await touch('touchEnd',[]);
    } else {
      await page.keyboard.down('ShiftLeft');
      await page.keyboard.down(low?'a':'d');
      if (angle) await page.keyboard.down(low?'s':'w');
      await page.keyboard.down('j');
      if (!quick) await page.clock.runFor(45);
      for (const key of ['j','w','s','a','d','ShiftLeft']) await page.keyboard.up(key);
    }
    await page.clock.runFor(1200);
    assert.equal(await status.getAttribute('data-result'), angle?'angledHit':'missedAngle',
      [low?'low':'high',quick?'released immediately':'held',await status.innerText()].join(' · '));
  }
  const distinct = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width=260; canvas.height=190;
    const ctx = canvas.getContext('2d');
    return ['pipStampKick','brisketGateCheck','noodleKnotPoke','cloverOneTwoPass','cloverOneTwoPassFinish'].every(move => {
      const kind = move.match(/^[a-z]+/)[0];
      const variants = ['','High','Low','idle'].map(suffix => {
        ctx.clearRect(0,0,260,190);
        window.DogArt.draw(ctx,kind,90,150,{pose:suffix==='idle'?'idle':move+suffix,phase:.46});
        return canvas.toDataURL();
      });
      return new Set(variants).size===4;
    });
  });
  assert(distinct,'Every dog and both One-Two Pass poses have distinct high, level and low contact art');
  console.log((mobile?'Phone touch':'Desktop keyboard')+' hit the jumper and the low recovery, whiffed level, and painted all angled poses.');
}

async function testJumpPower(page, mobile) {
  await page.goto(root+'?jump-power#training/jump-in-damage');
  const status=page.locator('#spacing-status');
  const {hold,waitFor}=await trainingControls(page,mobile,status);
  const percent=page.locator('#hud .percentage').nth(1);
  for(const [button,height,damage,frames] of [['hop','Short hop','5.1%',39],['jump','Full jump','6%',61]]) {
    await hold([button]);
    await waitFor('swing');
    await hold(['attack']);
    await waitFor('landed');
    await hold([]);
    assert.equal(await status.textContent(),height+' · 1 hit · '+damage+' · ready on frame '+frames);
    assert.equal(await percent.textContent(),damage);
    if(button==='hop')assert.equal(await percent.locator('small').textContent(),'.1');
    else {
      assert.equal(await percent.locator('small').count(),0);
      assert.match(await page.locator('#recovery-tip').textContent(),/Last time you got Short hop.*5\.1%/);
    }
  }
}

async function testAttackPress(page, mobile) {
  const {hold,press}=await trainingControls(page,mobile);
  const activate=loc=>mobile?loc.tap():loc.click();
  const challenge=root+'?attack-press#solo/intercept-clover';
  async function opening(quick,pad=false) {
    assert.match(await page.locator('#match-mode').innerText(),/solo.*rival/i);
    assert.equal(await page.locator('#match-clock').innerText(),'7:00');
    const before=await page.locator('#hud .percentage').allTextContents();
    assert.deepEqual(before,['0%','0%']);
    if(pad) {
      await page.evaluate(()=>{
        const controller={index:0,id:'Attack timing pad',axes:[1,0,0,0],
          buttons:Array.from({length:17},(_,i)=>({pressed:i===2}))};
        Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[controller]});
      });
    } else await hold(['right','attack']);
    await page.clock.runFor(2760);
    if(pad)await page.evaluate(()=>{delete navigator.getGamepads;});
    else await hold([]);
    const after=await page.locator('#hud .percentage').allTextContents();
    assert.deepEqual(after,quick?['0%','5%']:['7.7%','0%']);
    assert.equal(await page.locator('#hud .lives[aria-label="3 stocks"]').count(),2);
  }
  await page.goto(challenge); await opening(true);
  await press('pause'); await activate(page.locator('[data-do="rematch"]'));
  await opening(true,!mobile);
  const p1=page.locator('[data-do="option-quickAttack1"]'),p2=page.locator('[data-do="option-quickAttack2"]');
  await page.goto(root+'?attack-options'); await press('home-options');
  assert.equal(await p1.getAttribute('aria-pressed'),'true');
  await activate(p1);
  await page.reload(); await press('home-options');
  assert.equal(await p1.getAttribute('aria-pressed'),'false');
  assert.equal(await p2.getAttribute('aria-pressed'),'true');
  await page.goto(challenge); await opening(false);
  await page.goto(root+'?attack-options'); await press('home-options'); await activate(p1);
  console.log((mobile?'Touch':'Keyboard and gamepad')+' intercepted Clover on GO, restarted the stock fight and compared the saved hold-to-smash controls.');
}

async function testLedgePatience(page, mobile) {
  await page.goto(root+'?grip#training/ledge-patience');
  const status=page.locator('#climb-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  async function watch() {
    await page.evaluate(()=>{
      const proto=window.DogFightView.FightView.prototype, draw=proto.draw;
      proto.draw=function(canvas,w,...args) {
        const [p,b]=w.dogs;
        window.gripProbe={swing:b.attack?.moveId==='brisketHaymaker'?Math.round(b.attack.time*60):-1,
          rolling:p.floorAction?.type==='ledgeRoll', standing:p.ground>=0 && !p.floorAction,
          dealt:b.damage, taken:p.damage, stocks:p.stocks};
        return draw.call(this,canvas,w,...args);
      };
    });
  }
  async function until(read) {
    for(let n=0;n<100;n++){
      const state=await page.evaluate(()=>window.gripProbe);
      if(state && read(state))return state;
      await page.clock.runFor(16);
    }
    assert.fail('Ledge position did not arrive: '+JSON.stringify(await page.evaluate(()=>window.gripProbe)));
  }
  async function counter(inward) {
    await until(s=>s.swing>=5 && s.swing<=9);
    await hold(['shield']); await until(s=>s.rolling); await hold([]);
    await until(s=>s.standing); await hold([inward,'attack']);
    await page.clock.runFor(20); await hold([]);
    const result=await until(s=>s.dealt>0);
    assert.equal(result.dealt,5); assert.equal(result.taken,120);
  }
  await watch();
  await press('climb-slow');
  await hold(['attack']); await waitFor('start'); await hold(['right']);
  await waitFor('punched'); await hold([]);
  await press('climb-patience');
  await hold(['attack']); await waitFor('start'); await hold([]);
  await waitFor('opening'); await page.clock.runFor(130);
  assert.match(await page.locator('#hud').innerText(),/grip slipping/i);
  await waitFor('slipped');
  await press('climb-side');
  assert.match(await status.innerText(),/right ledge/i);
  await hold(['attack']); await waitFor('start'); await hold([]);
  await counter('left'); await waitFor('punished');
  await page.goto(root+'?grip-stock#solo/ledge-trap');
  await watch(); await page.clock.runFor(2600);
  await counter('right');
  assert.equal(await page.locator('.lives').first().getAttribute('aria-label'),'3 stocks');
  console.log((mobile?'Touch':'Keyboard')+' baited and punished a charged Haymaker in the drill and the three-stock fight.');
}

async function testCeilingTech(page, mobile) {
  await page.goto(root+'?undertable#training/ceiling-tech');
  const status=page.locator('#wall-status');
  const {press,hold,waitFor}=await trainingControls(page,mobile,status);
  const observe=()=>page.evaluate(()=>{
    const proto=window.DogFightView.FightView.prototype, draw=proto.draw;
    proto.draw=function(canvas,world,...args){
      const f=world.dogs[0];
      window.ceilingProbe={x:f.x, ledge:f.ledge?.x, kind:f.kind, frame:world.matchFrames};
      if(f.ledge)window.caughtLip=f.ledge.x;
      return draw.call(this,canvas,world,...args);
    };
  });
  await observe();
  await hold(['attack']);await waitFor('flight');await hold([]);
  await waitFor('ceilingBounce');
  await press('wall-side');
  assert.equal(await page.locator('#wall-ceiling').getAttribute('aria-pressed'),'true');
  await hold(['attack']);await waitFor('flight');await hold(['shield']);
  await waitFor('ceilingTech');await hold(['right']);
  for(let n=0;n<35;n++) {
    if(await page.evaluate(()=>window.ceilingProbe?.x>1041)) break;
    await page.clock.runFor(20);
  }
  assert(await page.evaluate(()=>window.ceilingProbe.x>1041));
  await hold(['up','special']);await waitFor('returned');await hold([]);
  assert.equal(await page.evaluate(()=>window.ceilingProbe.ledge),1040);
  await page.goto(root+'?stock-under#solo/under-the-table');
  await observe();
  assert.equal(await page.locator('.percentage').first().innerText(),'90%');
  await hold(['up','special']);await page.clock.runFor(3250);await hold([]);
  assert.equal(await page.locator('.lives').first().getAttribute('aria-label'),'2 stocks');
  await press('pause');
  const restart=page.locator('[data-do="rematch"]');
  if(mobile)await restart.tap();else await restart.click();
  await hold(['left']);await page.clock.runFor(2600);
  for(let n=0;n<15 && !await page.evaluate(()=>window.ceilingProbe?.x<159);n++) await page.clock.runFor(16);
  assert(await page.evaluate(()=>window.ceilingProbe.x<159));
  await hold(['up','special']);
  await page.clock.runFor(320);await hold([]);
  assert.equal(await page.locator('.lives').first().getAttribute('aria-label'),'3 stocks');
  assert.equal(await page.evaluate(()=>window.caughtLip),160);
  console.log((mobile?'Touch':'Keyboard')+' played a ceiling bounce, shield tech and mirrored lasso recovery.');
}

async function testWallJumps(page, mobile) {
  await page.goto(root+'#training/wall-jumps');
  const status=page.locator('#wall-status');
  const press=id=>mobile?page.locator('#'+id).tap():page.locator('#'+id).click();
  const session=mobile && await page.context().newCDPSession(page);
  let held=[];
  async function hold(next) {
    if(mobile) {
      if(held.length) await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const points=[];
      for(const name of next) {
        const box=await page.locator('[data-touch="'+name+'"]').boundingBox();
        points.push({x:box.x+box.width/2,y:box.y+box.height/2,id:points.length+1});
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
      }
    } else {
      const keys={right:'d',left:'a',jump:'Space'};
      for(const name of held) if(!next.includes(name)) await page.keyboard.up(keys[name]);
      for(const name of next) if(!held.includes(name)) await page.keyboard.down(keys[name]);
    }
    held=next;
  }
  const check=async (result,detail)=>{
    assert.equal(await status.getAttribute('data-result'),result,await status.innerText());
    assert.match(await status.innerText(),detail);
  };
  await hold(['right']);await page.clock.runFor(48);
  await check('kick',/air jump saved/i);
  await page.clock.runFor(1100);await hold([]);
  await check('saved',/far roof.*air jump saved/i);
  await press('wall-noodle');await press('wall-side');
  await hold(['left']);await page.clock.runFor(48);await hold(['right']);
  await page.clock.runFor(1100);await hold([]);
  await check('saved',/near roof.*air jump saved/i);
  await press('wall-retry');await hold(['right','jump']);
  await page.clock.runFor(180);await hold(['right']);await page.clock.runFor(1000);await hold([]);
  await check('returned',/near roof.*air jump spent/i);
  await press('reset-training');
  assert(await status.isHidden());
  console.log((mobile?'Phone touch':'Desktop keyboard')+' passed crossing the gap, turning toward the near ledge, and spending an ordinary jump on retry.');
}

async function testShortHops(page, mobile) {
  await page.goto(root + '#training/short-hops');
  const compare = page.locator('#hop-compare');
  const retry = page.locator('#spacing-landing');
  const session = mobile && await page.context().newCDPSession(page);
  const activate = locator => mobile ? locator.tap() : locator.click();
  await activate(page.locator('#spacing-slow'));
  async function jump(name) {
    if (mobile) {
      const box = await page.locator('[data-touch="' + name + '"]').boundingBox();
      assert(box && box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844);
      await session.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[
        {x:box.x + box.width / 2, y:box.y + box.height / 2, id:1}
      ]});
    } else await page.keyboard.down(name === 'hop' ? 'e' : 'Space');
    await page.clock.runFor(1450);
    if (mobile) await session.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    else await page.keyboard.up(name === 'hop' ? 'e' : 'Space');
    return compare.innerText();
  }
  assert(await compare.isHidden());
  const full = await jump('jump');
  assert.equal(await page.locator('#spacing-status').innerText(), 'Jump measured');
  assert.match(full, /^Full jump · \d+ px$/);
  await activate(retry);
  assert.equal(await compare.innerText(), 'Previous: ' + full);
  const both = await jump('hop');
  const short = both.split(' / ')[0];
  assert.match(short, /^Short hop · \d+ px$/);
  assert.equal(both, short + ' / Previous: ' + full);
  assert(Number(full.match(/\d+/)[0]) > Number(short.match(/\d+/)[0]) * 2);
  if (!mobile) {
    await activate(retry);
    await page.evaluate(() => {
      const pad = {axes:[0,0,0,0], buttons:Array.from({length:17}, (_,i) => ({pressed:i === 6}))};
      Object.defineProperty(navigator, 'getGamepads', {configurable:true, value:() => [pad]});
    });
    await page.clock.runFor(1450);
    assert.equal(await compare.innerText(), short + ' / Previous: ' + short);
    await page.evaluate(() => { delete navigator.getGamepads; });
  }
  await activate(page.locator('#reset-training'));
  assert(await compare.isHidden());
  console.log((mobile ? 'Touch' : 'Keyboard and controller mapping') + ' passed held short-hop and full-jump comparison.');
}

async function testFlickJumps(page, mobile) {
  const saved = () => page.evaluate(() => {
    const options = JSON.parse(localStorage.getItem('dog-fight-3.config') || '{}');
    return [!!options.flickJump1, !!options.flickJump2];
  });
  const activate = locator => mobile ? locator.tap() : locator.click();
  const launch = () => page.goto(root + '?flick-practice#training/flick-jump');
  await launch();
  const compare = page.locator('#hop-compare'), toggle = page.locator('#spacing-flick');
  const {hold,press} = await trainingControls(page,mobile,page.locator('#spacing-status'));
  assert.deepEqual(await saved(),[false,false]);
  assert.equal(await toggle.getAttribute('aria-pressed'),'true');
  if (await page.locator('#spacing-slow').getAttribute('aria-pressed') === 'true') await press('spacing-slow');
  await hold(['up']);
  await hold([]);
  await page.clock.runFor(1450);
  const short = await compare.innerText();
  assert.match(short,/^Short hop · \d+ px$/);
  await press('spacing-landing');
  await hold(['up']);
  await page.clock.runFor(1450);
  await hold([]);
  const both = await compare.innerText(), full = both.split(' / ')[0];
  assert.match(full,/^Full jump · \d+ px$/);
  assert.equal(both,full+' / Previous: '+short);
  assert(Number(full.match(/\d+/)[0])>Number(short.match(/\d+/)[0])*2);
  await press('spacing-landing');
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    const point = async name => {
      const b = await page.locator('[data-touch="'+name+'"]').boundingBox();
      return [{id:1,x:b.x+b.width/2,y:b.y+b.height/2}];
    };
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:await point('neutral')});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:await point('up')});
    await page.clock.runFor(1100);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await compare.innerText(),'Previous: '+full);
  } else {
    await page.evaluate(() => {
      const pad = {index:0,id:'Hosted analog controller', axes:[0,0,0,0],buttons:[]};
      Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
    });
    for (const y of [0,-.38,-.45,-.55,-.64,-.78,-1]) {
      await page.evaluate(y=>navigator.getGamepads()[0].axes[1]=y,y);
      await page.clock.runFor(56);
    }
    await page.clock.runFor(1000);
    assert.equal(await compare.innerText(),'Previous: '+full);
    for (const [y,ms] of [[0,66],[-1,1300]]) {
      await page.evaluate(y=>navigator.getGamepads()[0].axes[1]=y,y);
      await page.clock.runFor(ms);
    }
    assert.equal(await compare.innerText(),full+' / Previous: '+full);
    await page.evaluate(()=>{delete navigator.getGamepads;});
  }
  await press('spacing-flick');
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  assert.deepEqual(await saved(),[false,false]);
  await page.goto(root+'?flick-options');
  await press('home-options');
  const p1 = page.locator('[data-do="option-flickJump1"]'), p2 = page.locator('[data-do="option-flickJump2"]');
  await activate(p2);
  assert.deepEqual(await saved(),[false,true]);
  await page.reload();
  await press('home-options');
  assert.equal(await p2.getAttribute('aria-pressed'),'true');
  assert.equal(await p1.getAttribute('aria-pressed'),'false');
  await activate(p1);
  assert.deepEqual(await saved(),[true,true]);
  await activate(p2);
  await activate(p1);
  assert.deepEqual(await saved(),[false,false]);
  console.log((mobile?'Touch':'Keyboard and analog controller')+' passed flick height, gentle aim, trial override and per-player preferences.');
}

async function testRage(page, mobile) {
  await page.goto(root+'?rage-comparison#training/rage');
  const contact=page.locator('#freshness-contact'), prior=page.locator('#freshness-previous');
  const {hold,press}=await trainingControls(page,mobile,contact);
  const meter=page.locator('.hud-card').first().locator('.rage-meter');
  assert.equal(await page.locator('#freshness-name').textContent(),'Brisket at 0% · Rage +0%');
  assert.equal(await contact.textContent(),'Pip at 95%');
  assert.equal(await meter.count(),0);
  async function swing() {
    await hold(['up','smash']);
    const charge=page.locator('#freshness-charge');
    for(let frames=0;frames<90 && (await charge.isHidden() || await charge.textContent()!=='Full charge');frames+=3)
      await page.clock.runFor(50);
    assert(await charge.isVisible());
    assert.equal(await charge.textContent(),'Full charge');
    await hold([]);
    await page.clock.runFor(3400);
    return contact.textContent();
  }
  const soft=await swing();
  assert.match(soft,/21% damage · \d+ px\/s · Landed$/);
  await press('freshness-percent');
  assert.equal(await meter.getAttribute('aria-label'),'Rage +10% knockback');
  assert.equal(await page.locator('#freshness-name').textContent(),'Brisket at 150% · Rage +10%');
  assert.equal(await prior.textContent(),'At 0% · '+soft);
  const hard=await swing();
  assert.match(hard,/21% damage · \d+ px\/s · Top KO$/);
  assert(Number(hard.match(/(\d+) px/)[1])>Number(soft.match(/(\d+) px/)[1]));
  await press('freshness-percent');
  assert.equal(await meter.count(),0);
  assert.equal(await prior.textContent(),'At 150% · '+hard);
  // Sample Up alone, then release the smash and aim before the next simulation tick.
  if(mobile) {
    const cdp=await page.context().newCDPSession(page);
    const point=async (name,id)=>{
      const box=await page.locator('[data-touch="'+name+'"]').boundingBox();
      return {id,x:box.x+box.width/2,y:box.y+box.height/2};
    };
    const up=await point('up',1);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[up]});
    await page.clock.runFor(66);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[up,await point('smash',2)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else {
    await page.keyboard.down('w');
    await page.clock.runFor(66);
    await page.keyboard.press('i');
    await page.keyboard.up('w');
  }
  await page.clock.runFor(1400);
  assert.equal(await page.locator('#freshness-list li').first().textContent(),'Roof Raiser');
  await press('reset-training');
  assert(await contact.isHidden());
  console.log((mobile?'Touch':'Keyboard')+' passed a landing at zero rage and a top KO at max rage with the same fully charged smash.');
}

async function testHitstunCancel(page,mobile) {
  await page.goto(root+'?juggle#training/breakaway');
  const status=page.locator('#launch-status'),{hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const [i,[key,outcome]] of [['jump','caught'],['attack','counter'],['shield','evaded'],
      ['shield','caughtDodge'],['jump','clear']].entries()){
    if(i===2)await press('launch-side');
    else if(i===3)await press('breakaway-late');
    else if(i>0)await press('launch-breakaway');
    await hold(['attack']); await page.clock.runFor(70); await hold([]); await waitFor('window');
    await page.clock.runFor(500);assert.equal(await status.getAttribute('data-result'),'window');
    await hold([key]);await waitFor(outcome);await hold([]);
    if(key!=='jump')assert.match(await status.textContent(),/2f early/);
  }
  await press('breakaway-late');await press('breakaway-pause');await press('launch-slow');
  await hold(['attack']);await page.clock.runFor(34);await hold([]);
  await waitFor('caught');
  await press('reset-training');assert(await status.isHidden());
  console.log((mobile?'Touch':'Keyboard')+' passed Orbit, neutral dodge, the delayed punish and real-time juggle.');
}

async function testFinalHit(page,mobile) {
  const size=page.viewportSize();
  if(!mobile) await page.setViewportSize({width:1920,height:720});
  await page.goto(root+'?finish#training/last-stock');
  await page.evaluate(()=>{
    const proto=window.DogFightView.FightView.prototype, draw=proto.draw;
    window.finishShots=[];
    proto.draw=function(canvas,world,...args){
      const value=draw.call(this,canvas,world,...args);
      const f=world.dogs[0],s=world.survivalPractice;
      if(s?.pattern==='lastStock' && f.tumble?.pending && f.tumble.finalHit) {
        const w=canvas.width,h=canvas.height,z=this.zoom;
        const inside=world.dogs.every(d=>Math.abs(d.x-this.cx)+d.stats.width < w/(2*z) &&
          d.y< this.cy+h/(2*z) && d.y-d.stats.height>this.cy-h/(2*z));
        const v=window.DogFight.launchInfluence(f.vx,f.vy,f.prev),speed=Math.hypot(f.vx,f.vy);
        const x=w/2+(f.x+f.vx/speed*(f.stats.width+10)+v.x/speed*62-this.cx)*z;
        const y=h/2+(f.y-f.stats.height*.52+f.vy/speed*f.stats.height*.52+v.y/speed*62-this.cy)*z;
        const data=canvas.getContext('2d').getImageData(Math.round(x)-12,Math.round(y)-12,25,25).data;
        let arrow=false;
        for(let i=0;i<data.length;i+=4) if(data[i]===159&&data[i+1]===228&&data[i+2]===215){arrow=true;break;}
        window.finishShots.push({inside,arrow,z,steer:f.prev.y,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
      }
      return value;
    };
  });
  const status=page.locator('#launch-status'), {hold,press,waitFor}=await trainingControls(page,mobile,status);
  await hold(['attack']); await waitFor('blastThreat'); await hold([]);
  assert.match(await status.textContent(),/steer now/);
  await waitFor('ko');
  const shots=await page.evaluate(()=>window.finishShots);
  assert(shots.length>4 && shots.every(s=>s.inside) && shots.some(s=>s.arrow),JSON.stringify(shots));
  assert(shots.at(-1).z>shots[0].z+.1,'close-up should ease toward both dogs');
  await page.emulateMedia({reducedMotion:'reduce'});
  await press('launch-side');
  await hold(['attack']); await waitFor('blastThreat'); await hold(['down']);
  await waitFor('launchDI');
  assert.match(await status.textContent(),/92% speed.*room to recover/);
  const steady=await page.evaluate(()=>window.finishShots.filter(s=>s.reduced));
  assert(steady.some(s=>s.steer>0 && s.arrow) && steady.every(s=>s.inside));
  assert(Math.max(...steady.map(s=>s.z))-Math.min(...steady.map(s=>s.z))<.001,'reduced motion keeps the camera steady');
  await hold(['right']); await waitFor('survivalBuffer');
  await hold(mobile?['up-right','shield']:['up','right','shield']);
  await page.clock.runFor(64); await hold(['right']);
  await waitFor('survivalFree'); await hold([]);
  await page.emulateMedia({reducedMotion:'no-preference'});
  if(!mobile) await page.setViewportSize(size);
  await page.goto(root+'#solo/last-stock');
  assert.deepEqual(await page.locator('#hud .percentage').allTextContents(),['125%','125%']);
  assert.equal(await page.locator('.lives[aria-label="1 stock"]').count(),2);
  assert.match(await page.locator('#match-mode').textContent(),/Last stock/);
  console.log((mobile?'Touch':'Ultrawide keyboard')+' passed the last-stock close-up, neutral KO, aimed save and reduced-motion view.');
}

async function testBlastRadar(page, mobile) {
  await page.goto(root + '#training/blast-radar');
  const radar = page.locator('#blast-radar'), status = page.locator('#launch-status');
  const session = mobile && await page.context().newCDPSession(page);
  const keys = {down:'s',attack:'j'};
  let held = [];
  async function hold(next) {
    if (mobile) {
      if (held.length) await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const points = [];
      for (const action of next) {
        const box = await page.locator('[data-touch="'+action+'"]').boundingBox();
        points.push({id:points.length+1, x:box.x+box.width/2, y:box.y+box.height/2});
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
      }
    } else {
      for (const action of held) if (!next.includes(action)) await page.keyboard.up(keys[action]);
      for (const action of next) if (!held.includes(action)) await page.keyboard.down(keys[action]);
    }
    held = next;
  }
  async function waitFor(text) {
    for (let i=0;i<110;i++) {
      if (text.test(await status.innerText())) return;
      await page.clock.runFor(32);
    }
    assert.fail('Expected '+text+', saw '+await status.innerText());
  }
  async function hasColor(rgb) {
    return radar.evaluate((canvas,[r,g,b]) => {
      const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=0;i<data.length;i+=4) if(data[i]===r && data[i+1]===g && data[i+2]===b && data[i+3]===255) return true;
      return false;
    },rgb);
  }
  const tapAttack = async (aim=[]) => {
    await hold([...aim,'attack']); await page.clock.runFor(55); await hold(aim);
  };
  await page.clock.runFor(64);
  const box = await radar.boundingBox(), arena = await page.locator('#game').boundingBox();
  assert(box && box.x>=arena.x && box.y>=arena.y && box.x+box.width<=arena.x+arena.width && box.y+box.height<=arena.y+arena.height);
  assert.equal(await radar.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  assert(await hasColor([237,150,121]),'visible blast border');
  await tapAttack();
  await waitFor(/Crosses right boundary in 23f/);
  assert(await hasColor([255,152,125]),'dangerous projected course');
  await page.clock.runFor(940);
  assert.match(await status.innerText(),/23f/);
  await hold(['down']); await waitFor(/Control returns inside/);
  assert(await hasColor([159,228,215]),'escape course');
  await hold([]); await waitFor(/Crosses right/);
  await tapAttack(); await waitFor(/Ring-out/);
  await tapAttack(); await waitFor(/Crosses right/);
  await hold(['down']); await waitFor(/Control returns inside/);
  await tapAttack(['down']); await hold([]);
  await waitFor(/92% speed/);
  await waitFor(/Shield \+ up-left/);
  const reset=page.locator('#reset-training');
  if (mobile) await reset.tap(); else await reset.click();
  await page.clock.runFor(120);
  assert(await radar.isHidden());
  if (!mobile) {
    const probe = await page.evaluate(() => {
      const b = new window.DogFight.Battle({mode:'local',stage:'laundry',p1:'pip',p2:'brisket'});
      const canvas = document.createElement('canvas'); canvas.width=160; canvas.height=108; canvas.hidden=true;
      const view = new window.DogFightView.FightView(canvas), ctx=canvas.getContext('2d');
      view.drawRadar(b,0,0,1200,675);
      const quiet = canvas.hidden;
      Object.assign(b.dogs[0],{x:-50,y:330,ground:-1,vy:160});
      b.startTumble(b.dogs[0],false);
      view.drawRadar(b,0,0,1200,675);
      const detected = !canvas.hidden && canvas.getAttribute('aria-label').includes('near the left boundary');
      function leftBorder() {
        const row=ctx.getImageData(0,35,160,1).data;
        for(let i=0;i<row.length;i+=4) if(row[i]===237 && row[i+1]===150 && row[i+2]===121) return i/4;
      }
      const full = leftBorder();
      b.startSuddenDeath(); b.suddenDeath.frames=840;
      view.drawRadar(b,0,0,1200,675);
      const narrowed = leftBorder();
      const calls = [], original = window.DogArt;
      window.DogArt = {...original, draw(ctx,kind,x,y,options) {
        calls.push({pose:options.pose,x,y});
        return original.draw(ctx,kind,x,y,options);
      }};
      try {
        Object.assign(b.dogs[0],{x:-45,y:340,ground:-1});
        Object.assign(b.dogs[1],{x:-52,y:344,ground:-1,vy:210});
        b.startTumble(b.dogs[0],false);
        view.drawOffscreen(ctx,b,0,0,1200,675,1,1);
      } finally { window.DogArt=original; }
      return {quiet,detected,full,narrowed,calls};
    });
    assert(probe.quiet && probe.detected && probe.narrowed>probe.full+15);
    assert.equal(probe.calls[0].pose,'tumble');
    assert.equal(probe.calls.length,2);
    assert(Math.abs(probe.calls[0].y-probe.calls[1].y)>=48,'offscreen portraits remain separate');
  }
  console.log((mobile?'Touch':'Keyboard')+' passed launch study, aim changes, live flight, and radar visibility.');
}

async function testNightMail(page, mobile) {
  const press = selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
  await page.goto(root + '?stage-test#solo');
  await press('#choose-stage');
  const tile = page.locator('[data-stage="nightmail"]');
  assert.match(await tile.innerText(),/Night Mail/);
  assert(await tile.locator('canvas').evaluate(c => c.getContext('2d').getImageData(150,114,1,1).data[3] === 255));
  await press('[data-stage="nightmail"]');
  await page.reload();
  assert.equal(await page.locator('#stage-title').textContent(),'Night Mail');
  await press('[data-mode="training"]');
  await press('#start');
  const stage = page.locator('#match-stage');
  assert.equal(await stage.textContent(),'Night Mail');
  await press('#platform-training');
  assert.equal(await stage.textContent(),'Picnic Table');
  await press('#reset-training');
  assert.equal(await stage.textContent(),'Night Mail');
  await page.goto(root + '#online');
  await page.selectOption('#online-stage','nightmail');
  assert.equal(await page.locator('#online-stage option:checked').textContent(),'Night Mail');

  async function scenery() {
    return page.evaluate(() => {
      const c = document.createElement('canvas'); c.width=2000; c.height=800;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      const bounds={left:-400,top:-60,right:1600,bottom:740};
      function frame(time) {
        ctx.setTransform(1,0,0,1,400,60);
        window.ArenaArt.draw(ctx,'nightmail',time,bounds);
        const color=(x,y)=>Array.from(ctx.getImageData(x+400,y+60,1,1).data);
        return {roof:[color(160,455),color(1039,455)],outside:[color(159,455),color(1040,455)],
          corners:[color(-400,-60),color(1599,739)], image:c.toDataURL()};
      }
      const a=frame(0), b=frame(2);
      return {different:a.image!==b.image,roof:a.roof, outside:a.outside, corners:a.corners, fixed:JSON.stringify(a.roof)===JSON.stringify(b.roof)};
    });
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  const art=await scenery(), gold=[255,227,166,255];
  assert.deepEqual(art.roof,[gold,gold]); assert(art.fixed && art.different);
  assert(art.corners.every(c=>c[3]===255)); assert(art.outside.every(c=>c.join()!==gold.join()));
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal((await scenery()).different,false);
  await page.emulateMedia({reducedMotion:'no-preference'});

  const session = mobile && await page.context().newCDPSession(page);
  for (const [route, arena, landing] of [['night-mail','Night Mail',0],['picnic-table','Picnic Table',1],['canal-lock','Canal Lock',1]]) {
    await page.goto(root + '?landing=' + route + '#solo/' + route);
    assert.equal(await stage.textContent(),arena);
    assert.match(await page.locator('#match-mode').textContent(),/Rival CPU/i);
    assert.equal(await page.locator('.lives[aria-label="3 stocks"]').count(),2);
    assert.equal(await page.locator('#match-clock').innerText(),'7:00');
    await page.evaluate(() => {
      const proto = window.DogFight.Battle.prototype, step = proto.step;
      const probe = window.mailJump = {air:false, landing:null};
      proto.step = function(...args) {
        const result = step.apply(this,args), p=this.dogs[0];
        probe.air ||= p.ground < 0;
        if (probe.air && p.ground >= 0) probe.landing ??= p.ground;
        return result;
      };
    });
    await page.clock.runFor(2430);
    if (mobile) {
      const box=await page.locator('[data-touch="jump"]').boundingBox();
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
    } else await page.keyboard.down('Space');
    await page.clock.runFor(1000);
    if (mobile) await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else await page.keyboard.up('Space');
    assert.deepEqual(await page.evaluate(()=>window.mailJump),{air:true,landing});
  }
}

async function testCanal(page,mobile) {
  const click=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
  await page.goto(root+'?lock-preview#solo');
  await click('#choose-stage');
  await click('[data-stage="canal"]');
  assert.equal(await page.locator('#stage-title').textContent(),'Canal Lock');
  await page.clock.runFor(80);
  await page.goto(root+'?lock-opener#online');
  await page.selectOption('#online-stage','canal');
  assert.equal(await page.locator('#online-stage option:checked').textContent(),'Canal Lock');
  for(const preference of ['reduce','no-preference']) {
    await page.emulateMedia({reducedMotion:preference});
    const samples=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=2000;c.height=800;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      ctx.translate(400,60);
      const pixel=(x,y)=>Array.from(ctx.getImageData(Math.floor(x)+400,y+60,1,1).data);
      return [0,2.4,7.2].map(time=>{
        window.ArenaArt.draw(ctx,'canal',time,{left:-400,top:-60,right:1600,bottom:740});
        const [gate,deck]=window.DogFight.platforms('canal',time);
        return {deck:[pixel(deck.x1+1,365),pixel(deck.x2-2,365)],outside:pixel(deck.x1-2,365),
          gate:pixel(gate.x1+1,455),corners:[pixel(-400,-60),pixel(1599,739)]};
      });
    });
    for(const f of samples) {
      const yellow=[255,224,154,255];
      assert.deepEqual(f.deck,[yellow,yellow]);assert.notDeepEqual(f.outside,yellow);
      assert.deepEqual(f.gate,[188,226,198,255]);assert(f.corners.every(p=>p[3]===255));
    }
  }
  await page.goto(root+'?canal-trial#training/ferry');
  const status=page.locator('#platform-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const result of ['tagged','guarded']){
    await press('platform-ferry');
    assert.equal(await status.textContent(),'Challenger on the gate');
    await hold(['attack']);await waitFor('approach');
    await hold(result==='guarded'?['shield']:[]);await waitFor(result);
    await hold([]);
  }
  await press('reset-training');
  assert.equal(await page.locator('#match-stage').textContent(),'Canal Lock');
}

async function testJumpIns(page,mobile) {
  await page.goto(root+'?jump-in#training/jump-ins');
  const result=page.locator('#shield-status'), choice=page.locator('#jump-in-choice');
  const press=loc=>mobile?loc.tap():loc.click();
  const session=mobile && await page.context().newCDPSession(page);
  const keys={hop:'e',grab:'u',shield:'l'};
  async function hold(name) {
    if (!mobile) return page.keyboard.down(keys[name]);
    const box=await page.locator('[data-touch="'+name+'"]').boundingBox();
    assert(box && box.x>=0 && box.y>=0 && box.y+box.height<=844);
    return session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2,y:box.y+box.height/2}]});
  }
  async function release(name) {
    if (!mobile) return page.keyboard.up(keys[name]);
    return session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  assert.equal(await choice.inputValue(),'yourHop');
  assert.equal(await result.textContent(),'Hop beside the shield');
  await hold('hop'); await page.clock.runFor(190); await release('hop');
  for(let i=0;i<70 && await result.getAttribute('data-result')!=='touchdown';i++) await page.clock.runFor(22);
  assert.equal(await result.textContent(),'Tap Grab');
  await hold('grab'); await page.clock.runFor(65); await release('grab');
  await page.clock.runFor(500);
  assert.equal(await result.getAttribute('data-result'),'bufferedGrab');
  await press(page.locator('#shield-jumpIn'));
  assert.equal(await result.textContent(),'Hop beside the shield');
  await press(page.locator('#jump-in-speed'));
  for(const [value,outcome] of [['emptyHop','grabbed'],['fallingAir','block'],['mixHop','either']]){
    await choice.selectOption(value);
    assert.equal(await page.locator('#jump-in-speed').getAttribute('aria-pressed'),'false');
    await hold('shield'); await page.clock.runFor(1160); await release('shield');
    const actual=await result.getAttribute('data-result');
    if(outcome==='either') assert(['block','grabbed'].includes(actual));
    else assert.equal(actual,outcome);
  }
  await press(page.locator('#shield-strike'));
  assert(await choice.isHidden());
  await press(page.locator('#reset-training'));
  assert(await result.isHidden());
}

async function trainingControls(page,mobile,status) {
  const press=id=>mobile?page.locator('#'+id).tap():page.locator('#'+id).click();
  const cdp=mobile && await page.context().newCDPSession(page);
  const keys={down:'s',up:'w',jump:'Space',hop:'e',attack:'j',special:'k',grab:'u',smash:'i',left:'a',right:'d',shield:'l'};
  let held=[];
  async function hold(names) {
    if(mobile) {
      if(held.length) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const points=[];
      for(const [i,name] of names.entries()){
        const box=await page.locator('[data-touch="'+name+'"]').boundingBox();
        assert(box && box.x>=0 && box.y>=0 && box.y+box.height<=844);
        points.push({id:i+1,x:box.x+box.width/2,y:box.y+box.height/2});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
      }
    } else {
      for(const name of held.filter(n=>!names.includes(n)))await page.keyboard.up(keys[name]);
      for(const name of names.filter(n=>!held.includes(n)))await page.keyboard.down(keys[name]);
    }
    held=names;
  }
  async function waitFor(result) {
    for(let n=0;n<100;n++){
      if(await status.getAttribute('data-result')===result)return;
      await page.clock.runFor(25);
    }
    assert.equal(await status.getAttribute('data-result'),result,await status.textContent());
  }
  return {hold,press,waitFor};
}

async function testDashShield(page,mobile) {
  await page.goto(root+'?guard-approach#training/dash-shield');
  const status=page.locator('#footwork-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const outcome of ['caughtCounter','ranIntoSwing','jumpedClear']){
    await press('footwork-dashShield');
    if(outcome==='jumpedClear')await press('footwork-side');
    const dir=outcome==='jumpedClear'?'left':'right';
    await hold([dir]);await waitFor('atMark');
    if(outcome!=='ranIntoSwing'){
      await hold([dir,'shield']);await waitFor('dashBlocked');
      if(outcome==='caughtCounter')await hold(['shield','grab']);
    }
    await waitFor(outcome);
    assert.match(await status.textContent(), /Brisket|Gate Check/);
    await hold([]);
  }
  await press('reset-training');assert(await status.isHidden());
}

async function testHaymaker(page,mobile) {
  await page.goto(root + '?armor-test#training/haymaker');
  const status = page.locator('#footwork-status');
  const {hold,press,waitFor} = await trainingControls(page,mobile,status);
  for (const [role,answer,outcome] of [
    ['armor','release','armoredPunch'], ['armor','hold','interruptedPunch'],
    ['armorGrab','attack','armoredPunch'], ['armorGrab','grab','caughtArmor'],
  ]) {
    await press('footwork-' + role);
    if (answer === 'grab') await press('footwork-side');
    await hold(['attack']);
    await waitFor('count');
    await hold(role === 'armor' ? ['smash'] : []);
    await waitFor('go');
    if (role === 'armorGrab') {
      await hold([answer]);
      await page.clock.runFor(36);
      await hold([]);
    }
    else if (answer === 'release') await hold([]);
    await waitFor(outcome);
    assert.match(await status.textContent(),/Haymaker landed|Punch interrupted|Grabbed the planted shoulder/);
    await hold([]);
  }
  await press('reset-training');
  assert(await status.isHidden());
}

async function testDefendTakes(page,mobile) {
  await page.goto(root+'?defense-test#training/read-the-hop');
  const summary=page.locator('#combo-summary'),latest=page.locator('#combo-latest');
  const {hold,press}=await trainingControls(page,mobile,summary);
  await page.evaluate(()=>{
    window.defenseClicks=[];
    document.addEventListener('click',e=>{
      if(e.target.closest('#training-tools'))window.defenseClicks.push([e.target.id,e.detail]);
    },true);
    const proto=window.DogFight.Battle.prototype,step=proto.step;
    proto.step=function(...args){
      const result=step.apply(this,args), d=this.comboPractice;
      if(d)window.defenseFrame={phase:d.phase,tick:d.tick,source:d.source,slot:d.slot,
        saved:d.saved?.length,first:d.saved?.[0] && {
          attack:d.saved[0].attack,jump:d.saved[0].jump,tapped:d.saved[0].tapped}};
      return result;
    };
  });
  async function waitForPhase(phase,tick=0){
    for(let i=0;i<240;i++){
      if(await page.evaluate(([p,n])=>window.defenseFrame?.phase===p && window.defenseFrame.tick>=n,[phase,tick]))return;
      await page.clock.runFor(tick?16:48);
    }
    assert.fail('Expected '+phase+' at '+tick+'; '+await latest.textContent());
  }
  async function startGuard() {
    await hold(['attack']);await page.clock.runFor(64);await hold(['shield']);
    await waitForPhase('active');
  }
  assert.match(await latest.textContent(),/You are Brisket/);
  assert.deepEqual(await page.locator('.hud-name small').allTextContents(),['REPLAY','YOU']);
  assert(await page.locator('#dummy-damage').isVisible());
  assert.equal(await page.locator('#dummy-damage').getAttribute('aria-label'),'Your starting damage');
  await press('combo-slow');
  await startGuard();
  assert.match(await summary.textContent(),/^Mix A and B/);
  await waitForPhase('done');
  assert.match(await summary.textContent(),/^Take (A · Falling aerial|B · Landing grab)/);
  await hold([]);
  await press('combo-defend');await startGuard();await waitForPhase('done');
  assert.match(await latest.textContent(),/Scramble · blocked/);
  await hold([]);await page.selectOption('#combo-slot','1');
  await startGuard();await waitForPhase('done');
  assert.match(await latest.textContent(),/Kickoff/);assert.match(await summary.textContent(),/7%/);
  await hold([]);await press('combo-defend');
  await startGuard();await waitForPhase('active',32);
  await hold(['shield','down']);await page.clock.runFor(32);await hold(['shield']);
  await waitForPhase('active',51);await hold(['attack']);await page.clock.runFor(32);await hold([]);
  await waitForPhase('done');
  assert.match(await latest.textContent(),/Your Body Check connected/);
  assert.match(await summary.textContent(),/Took 0 hits · 0%/);
  await page.selectOption('#combo-slot','0');await press('combo-record');
  await hold(['attack']);await page.clock.runFor(32);await hold([]);await page.clock.runFor(240);
  assert.equal(await page.locator('#combo-slot option:checked').textContent(),'A · Your recording');
  assert.match(await latest.textContent(),/Quick Paw/,JSON.stringify(await page.evaluate(()=>window.defenseFrame)));
  await press('combo-defend');
  assert.match(await summary.textContent(),/Defend A · Your recording/,
    JSON.stringify(await page.evaluate(()=>window.defenseClicks.slice(-6))));
  await startGuard();await waitForPhase('done');
  assert.match(await latest.textContent(),/Quick Paw · blocked/,
    JSON.stringify(await page.evaluate(()=>({frame:window.defenseFrame,clicks:window.defenseClicks.slice(-6)}))));
  await hold([]);await press('reset-training');await press('combo-training');
  assert(await page.locator('#combo-replay').isEnabled());
  await press('combo-restore');
  assert.equal(await page.locator('#combo-slot option:checked').textContent(),'A · Falling aerial');
  assert(await page.locator('#combo-replay').isDisabled());
}

async function testShieldPunish(page,mobile) {
  await page.goto(root+'?pressure-test#training/shield-punish');
  const latest=page.locator('#combo-latest');
  const {hold,press}=await trainingControls(page,mobile,latest);
  assert.equal(await page.locator('#combo-reply').inputValue(),'punish');
  await press('combo-slow');
  await hold(['smash']);await page.clock.runFor(48);await hold([]);
  await page.clock.runFor(3700);
  const result=await latest.innerText();
  assert.match(result,/Haymaker · blocked .*Pip punished with Collar Tag/);
  await page.selectOption('#combo-reply','stand');
  await page.clock.runFor(3700);
  assert.match(await latest.innerText(),/Haymaker · [\d.]+%/);
  await page.selectOption('#combo-reply','punish');
  await page.clock.runFor(3700);
  assert.equal(await latest.innerText(),result);
}

async function testPartnerTraining(page,mobile) {
  await page.goto(root+'?partners#training/sparring');
  const latest=page.locator('#combo-latest'), {press,hold}=await trainingControls(page,mobile,latest);
  const names=()=>page.locator('.hud-name small').allTextContents();
  assert.deepEqual(await names(),['P1','P2']);
  assert.equal(await page.locator('#dummy-damage').getAttribute('aria-label'),'P2 starting damage');
  assert(await page.locator('#moment-retry').isDisabled());
  await page.evaluate(()=>{
    const proto=window.DogFight.Battle.prototype, step=proto.step;
    proto.step=function(...args){
      const result=step.apply(this,args);
      window.partnerFrame={time:this.time,dogs:this.dogs.map(f=>({x:f.x,y:f.y,ground:f.ground,shield:f.shield,damage:f.damage}))};
      return result;
    };
    const pad=i=>({index:i,id:'Test pad '+i,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
    window.partnerPads=[pad(0),pad(1)];
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.partnerPads.slice(0,window.padCount)});
    window.padCount=1;
  });
  const frame=()=>page.evaluate(()=>window.partnerFrame);
  const ticks=ms=>page.clock.runFor(ms);
  await ticks(40);
  await page.evaluate(()=>{window.partnerPads[0].buttons[4].pressed=true;});
  await hold(['attack']);await ticks(48);await hold([]);await ticks(300);
  assert.equal((await frame()).dogs[1].damage,0);
  assert((await frame()).dogs[1].shield);
  assert(!(await frame()).dogs[0].shield);
  await page.evaluate(()=>{window.partnerPads[0].buttons[4].pressed=false;window.padCount=2;});
  await press('reset-training');
  assert.deepEqual(await names(),['P1','P2']);
  await page.evaluate(()=>{window.partnerPads[0].buttons[4].pressed=true;window.partnerPads[1].buttons[2].pressed=true;});
  await ticks(32);
  await page.evaluate(()=>{window.partnerPads[1].buttons[2].pressed=false;});
  await ticks(240);
  assert((await frame()).dogs[0].shield);
  assert.equal((await frame()).dogs[0].damage,0);
  await page.evaluate(()=>{window.padCount=0;window.partnerPads[0].buttons[4].pressed=false;});
  await press('reset-training');
  await page.keyboard.press(',');
  await ticks(240);
  assert.match(await page.locator('#training-combo').innerText(),/P1 took 1 hit/);
  if(mobile)await press('frame-toggle');else await page.keyboard.press('[');
  const saved=await frame();
  if(mobile)await press('moment-save');else await page.keyboard.press('1');
  assert.match(await page.locator('#recovery-tip').innerText(),/Moment saved/);
  await press('frame-toggle');
  await page.keyboard.down('ArrowRight');await ticks(420);await page.keyboard.up('ArrowRight');
  assert((await frame()).dogs[1].x>saved.dogs[1].x+20);
  if(mobile)await press('moment-retry');else await page.keyboard.press('2');
  assert.equal(await page.locator('#frame-toggle').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#recovery-tip').innerText(),/Moment restored/);
  await press('frame-step');await ticks(32);
  const again=await frame();
  assert(Math.abs(again.time-saved.time-1/60)<1e-6);
  assert(Math.abs(again.dogs[1].x-saved.dogs[1].x)<3);
  await press('combo-training');
  assert(await page.locator('#moment-save').isHidden());
  await press('combo-record');
  await page.selectOption('#combo-reply','p2');
  await hold(['attack']);await ticks(48);await hold([]);await ticks(500);
  assert.match(await latest.innerText(),/Quick Paw · [\d.]+%/);
  await press('combo-replay');
  assert.deepEqual(await names(),['REPLAY','P2']);
  await page.keyboard.down('/');await ticks(700);await page.keyboard.up('/');
  assert.match(await latest.innerText(),/Quick Paw · blocked/);
  await press('reset-training');assert.deepEqual(await names(),['P1','DUMMY']);
  assert(await page.locator('#moment-retry').isEnabled());
}

async function testDiscReflect(page,mobile) {
  await page.goto(root+'?disc-matchup#training/disc-reflect');
  const status=page.locator('#footwork-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const result of ['returnedHit','castGuard']){
    await press('footwork-reflect');
    assert.match(await status.textContent(),/Pip/);
    await hold(['attack']);await waitFor('cast');
    await hold([result==='returnedHit'?'special':'shield']);
    if(result==='returnedHit')await waitFor('reflected');
    await waitFor(result);
    assert.match(await status.textContent(),result==='returnedHit'?/hit Clover/:/Pip guarded/);
    await hold([]);
  }
  await page.goto(root+'?return-matchup#training/disc-return');
  for(const result of ['returnGuard','returnedHit']){
    await press('footwork-returnFire');
    assert.match(await status.textContent(),/Clover/);
    await hold(['special']);await waitFor('reflected');
    await hold(result==='returnGuard'?['shield']:[]);
    await waitFor(result);
    assert.match(await status.textContent(),result==='returnGuard'?/Clover guarded/:/hit Clover/);
    await hold([]);
  }
  await press('reset-training');assert(await status.isHidden());
}

async function testShoulderCarry(page,mobile) {
  await page.goto(root+'?carry-playtest#training/shoulder-carry');
  const status=page.locator('#escape-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  assert.equal(await status.textContent(),'Pip at 85%');
  await press('escape-slow');
  for(const result of ['returned','ringOut','brokeFree']){
    await press('escape-carry');await hold(['grab']);await waitFor('gripped');
    if(result==='returned')await hold(['right']);
    else {
      await hold(['special']);await waitFor('carrying');
      assert.match(await page.locator('#grapple-prompt').textContent(),/Aim \+ Grab/);
      if(result==='ringOut'){
        await hold(['right']);await waitFor('atMark');await hold(['right','grab']);
      }else await hold([]);
    }
    await waitFor(result);
    if(result!=='brokeFree')assert.match(await status.textContent(),/Yard Heave/);
    await hold([]);
  }
  await press('reset-training');assert(await status.isHidden());
}

async function testLedgeReturn(page,mobile) {
  await page.goto(root+'?release-return#training/ledge-return');
  const status=page.locator('#climb-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const [side,inward] of [['Left','right'],['Right','left']]){
    assert.equal(await status.textContent(),side+' ledge');
    await hold(['down','jump']);
    await waitFor('rise');
    await hold([inward,'attack']);
    await waitFor('strike');
    await hold([inward]);
    await waitFor('landedHit');
    await hold([]);
    assert.match(await status.textContent(),/Flying Kick/);
    if(side==='Left')await press('climb-side');
  }
  await press('climb-coverRise');
  await hold(['shield']); await waitFor('blockedRise'); await hold([]);
  await press('climb-escape');
  assert.equal(await page.locator('#climb-rise').getAttribute('aria-pressed'),'false');
  await press('reset-training');
  assert(await status.isHidden());
}

async function testSpotCounter(page,mobile) {
  await page.goto(root+'?spot-counter#training/spot-counter');
  const status=page.locator('#shield-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const response of ['jab','charge','stand']){
    if(response!=='jab')await press('shield-counterGrab');
    await waitFor('ready');
    await hold(['shield']);
    await waitFor('attack');
    if(response==='stand'){
      await waitFor('grabbed');
    }else{
      await hold(['shield','down']);
      await waitFor('counterTap');
      await hold(['shield',response==='jab'?'attack':'smash']);
      if(response==='charge'){
        await page.clock.runFor(1200);
        await hold(['shield']);
      }
      await waitFor(response==='jab'?'spotPunish':'counterBlocked');
      if(response==='jab')assert.match(await status.textContent(),/Dodge counter · [1-9]\d*f left/);
    }
    await hold([]);
  }
  await press('reset-training');
  assert(await status.isHidden());
}

async function testGripEscape(page,mobile) {
  await page.goto(root+'?grip#training/grab-escape');
  const status=page.locator('#escape-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  await hold(['attack']);await waitFor('gripped');await hold([]);
  await waitFor('throwLanded');assert.match(await status.textContent(),/2 pummels · 0 escape inputs/);
  await press('escape-gripEscape');await hold(['attack']);await waitFor('gripped');
  for(let n=0;n<16&&await status.getAttribute('data-result')!=='brokeFree';n++){
    await hold([n%2?'left':'right']);await page.clock.runFor(65);
  }
  await waitFor('brokeFree');assert.match(await status.textContent(),/Pip broke free/);
  await hold([]);await press('escape-gripThrow');await hold(['grab']);await waitFor('gripped');
  await hold(['attack']);await waitFor('pummel');await hold(['up']);await waitFor('throwLanded');
  assert.match(await status.textContent(),/Pop Fly · 1 pummel ·/);
  await hold([]);await press('reset-training');assert(await status.isHidden());
}

async function testDodgeTiming(page,mobile) {
  await page.goto(root+'?dodge-rest#training/dodge-timing');
  const status=page.locator('#shield-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const rest of [false,true]){
    if(rest)await press('shield-dodgeTiming');
    await waitFor('ready');
    await hold(['shield','down']);await waitFor('sweep');
    assert.match(await status.textContent(),/Fresh dodge · protected 2–11f/);
    await hold(['shield']);await waitFor('again');
    if(rest)await waitFor('restored');
    await hold(['shield','down']);await waitFor('sweep');
    assert.match(await status.textContent(),rest?/Fresh dodge · protected 2–11f/:/Repeated dodge · protected 3–10f/);
    await hold(['shield']);await waitFor(rest?'freshClear':'dodgeClipped');
    assert.match(await status.textContent(),rest?/Both sweeps missed/:/Pip caught the repeat/);
    await hold([]);
  }
  await press('reset-training');
  assert(await status.isHidden());
}

async function testPracticeRoom(page,mobile) {
  const press = selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
  const action = name => press('[data-do="' + name + '"]');
  const query = page.locator('#practice-query');
  await page.goto(root + '?drill-list#training/practice');
  const entries = await page.locator('[data-exercise]').evaluateAll(items => items.map(el => el.dataset.exercise));
  assert(entries.length >= 85 && new Set(entries).size === entries.length);
  assert(await page.locator('#return-fight').isHidden());
  await press('[data-lane="Defense"]');
  await query.fill('parry');
  assert.deepEqual(await page.locator('[data-exercise]').evaluateAll(items => items.map(el => el.dataset.exercise)), ['shield-strike']);
  await query.fill('xyzzy');
  assert.match(await page.locator('#practice-count').innerText(), /No drills/);
  await press('#practice-results button');
  await query.fill('noodle crawl');
  assert.equal(await page.locator('[data-exercise]').count(), 1);
  if (mobile) await press('[data-exercise="footwork-crawl"]');
  else {
    await query.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.exercise), 'footwork-crawl');
    await page.keyboard.press('Enter');
  }
  assert.equal(await page.locator('#footwork-crawl').getAttribute('aria-pressed'), 'true');
  await press('#practice-menu');
  await query.fill('jab lock');
  await press('[data-exercise="launch-lock"]');
  assert.equal(await page.locator('#launch-lock').getAttribute('aria-pressed'), 'true');
  await press('#practice-menu');
  await press('[data-exercise="wall-noodle"]');
  assert.equal(await page.locator('#wall-noodle').getAttribute('aria-pressed'), 'true');
  await page.goto(root + '?branch-stock#solo/best-of-three');
  await page.evaluate(() => {
    const proto = window.DogFightView.FightView.prototype, draw = proto.draw;
    proto.draw = function(canvas, battle, ...args) {
      window.lastDrawnBattle = battle;
      return draw.call(this, canvas, battle, ...args);
    };
    window.fightStamp = b => ({dogs:b.dogs.map(f => [f.x,f.y,f.vx,f.vy,f.damage,f.stocks,f.lastMove]),
      frames:b.matchFrames, clock:b.clockFrames, time:b.time, bot:b.bot, seed:b.random.state});
  });
  await page.clock.runFor(3600);
  await press('#pause');
  await action('practice');
  await press('#dialog-close');
  assert.equal(await page.locator('#dialog').getAttribute('data-view'), 'pause');
  const mark = await page.evaluate(() => {
    window.originalFight = window.lastDrawnBattle;
    return window.fightStamp(window.originalFight);
  });
  assert(mark.frames > 0);
  await action('rehearse');
  assert.match(await page.locator('#match-mode').innerText(), /Practice.*Rival/i);
  assert(await page.locator('#match-set').isHidden());
  const stamp = () => page.evaluate(() => window.fightStamp(window.lastDrawnBattle));
  assert.deepEqual(await stamp(), mark);
  assert(await page.evaluate(() => window.lastDrawnBattle !== window.originalFight));
  await page.clock.runFor(500);
  await press('#pause');
  const attempt = await stamp();
  assert(attempt.frames > mark.frames);
  await action('rehearse');
  assert.deepEqual(await stamp(), mark);
  await page.clock.runFor(500);
  await press('#pause');
  const again = await stamp();
  assert(Math.abs(again.frames - attempt.frames) <= 1);
  await action('practice');
  await query.fill('noodle crawl');
  await press('[data-exercise="footwork-crawl"]');
  assert.match((await page.locator('.hud-name').allTextContents()).join(' '), /Noodle.*Clover/i);
  assert.deepEqual(await page.evaluate(() => window.fightStamp(window.originalFight)), mark);
  await press('#return-fight');
  assert.deepEqual(await stamp(), mark);
  assert(await page.evaluate(() => window.lastDrawnBattle === window.originalFight));
  assert.match(await page.locator('#match-set').innerText(), /Game 1.*0–0/i);
  assert.match(await page.locator('#match-mode').innerText(), /Solo.*Rival/i);
  await page.clock.runFor(200);
  assert((await stamp()).frames > mark.frames);
  await press('#pause');
  assert.equal(await page.locator('[data-do="return-fight"]').count(), 0);

  await page.goto(root + '?three-answers#solo/shoulder-charge');
  const {hold} = await trainingControls(page,mobile);
  if (!mobile) {
    await page.evaluate(() => {
      const pad = {index:0, id:'Practice pad', axes:[0,0,0,0],
        buttons:Array.from({length:17}, () => ({pressed:false}))};
      Object.defineProperty(navigator,'getGamepads',{configurable:true,value:() => [pad]});
      pad.buttons[0].pressed = true;
    });
    // Keep confirm held. It must select practice without also jumping the charge.
    await page.clock.runFor(500);
    await page.evaluate(() => { delete navigator.getGamepads; });
  } else {
    await action('rehearse');
    await page.clock.runFor(500);
  }
  const damage = () => page.locator('.percentage').first().innerText();
  assert.equal(await damage(),'15%');
  for (const answer of ['shield','jump']) {
    await press('#pause');
    await action('rehearse');
    await hold([answer]);
    await page.clock.runFor(500);
    await hold([]);
    assert.equal(await damage(),'0%', answer);
  }
  await press('#pause');
  await action('return-fight');
  assert.equal(await damage(),'0%');
  assert.equal(await page.locator('.lives[aria-label="3 stocks"]').count(),2);
  await page.goto(root + '?finish-practice#solo/last-stock');
  // Pause in the countdown, then let Rival Brisket win the rehearsal naturally.
  await press('#pause');
  await action('rehearse');
  await page.clock.runFor(5500);
  assert.match(await page.locator('#dialog-title').innerText(), /practice finished/i);
  await action('return-fight');
  assert.equal(await damage(),'125%');
  assert.equal(await page.locator('.lives[aria-label="1 stock"]').count(),2);
  assert.match(await page.locator('#countdown').innerText(), /[123]/);
  console.log((mobile ? 'Touch' : 'Keyboard') + ' launched searched drills, replayed a live Rival position and resumed the unchanged set.');
}

async function testCrawl(page,mobile) {
  await page.goto(root+'?low-approach#training/crawl');
  const status=page.locator('#footwork-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const route of ['stand','rise','stay','guard','tilt']){
    await press('footwork-crawl');
    if(route==='tilt') await press('footwork-side');
    const dir=route==='tilt'?'left':'right';
    const low=mobile?['down-'+dir]:['down',dir];
    await hold(route==='stand'?['attack']:[...low,'attack']);
    await waitFor('castHigh');
    if(route==='stand'){
      await hold([]);await waitFor('castHit');continue;
    }
    await hold(low);
    await waitFor('under');
    if(route==='rise'){
      await hold([]);await waitFor('returnHit');continue;
    }
    await waitFor('inside');
    if(route==='guard')await hold(['shield']);
    if(route==='tilt'){
      await hold([dir,'attack']);await page.clock.runFor(40);await hold([]);
    }
    await waitFor({stay:'lowHit',guard:'lowGuard',tilt:'caughtServe'}[route]);
    await hold([]);
  }
  const art=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=168;
    const ctx=canvas.getContext('2d');
    function sprite(pose,phase){
      ctx.clearRect(0,0,240,168);
      window.DogArt.draw(ctx,'noodle',120,118,{pose,phase,face:1,time:0});
      const pixels=ctx.getImageData(0,0,240,168).data;
      let top=168;
      for(let i=3;i<pixels.length;i+=4)if(pixels[i]){top=Math.floor(i/4/240);break;}
      return {ink:canvas.toDataURL(),top};
    }
    const frames=Array.from({length:6},(_,i)=>sprite('crawl',i/6));
    return {distinct:new Set(frames.map(f=>f.ink)).size,heights:frames.map(f=>118-f.top),crouch:118-sprite('crouch',0).top};
  });
  assert.equal(art.distinct,6);
  assert(art.heights.every(h=>h<art.crouch && Math.abs(h-28)<=2),
    'Every crawl frame should match the lowered body: '+JSON.stringify(art));
  await press('reset-training');
  assert(await status.isHidden());
}

async function testGetUpAttacks(page,mobile) {
  await page.goto(root+'?wake-up#training/get-up');
  const status=page.locator('#launch-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for (const [behind,answer] of [[false,'take'],[true,'take'],[true,'hold'],[false,'grab']]) {
    await press('launch-bait');
    if ((await page.locator('#launch-behind').getAttribute('aria-pressed')==='true') !== behind)
      await press('launch-behind');
    if (answer==='grab') await press('launch-side');
    await hold(['attack']);
    await waitFor('fall');
    await hold(answer==='take'?[]:['shield']);
    await waitFor(answer==='take'?'sweep':'sweepBlock');
    assert.match(await status.textContent(),behind?/Reverse Rim.*frame 8 behind/:/Reverse Rim.*frame 15 in front/);
    if (answer==='hold') await waitFor('heldGuard');
    if (answer==='grab') {
      await hold(['shield','grab']);
      await waitFor('grabPunish');
      await hold([]);
      await page.clock.runFor(100);
      await hold(['up']);
      await page.clock.runFor(1500);
      assert(parseInt(await page.locator('#hud .percentage').nth(1).textContent(),10)>0);
    }
    await hold([]);
  }
  await press('reset-training');
  assert(await status.isHidden());
  console.log((mobile?'Touch':'Keyboard')+' played both sides of Reverse Rim, held shield, and grabbed the recovery into an up throw.');
}

async function testBoostGrabs(page,mobile) {
  await page.goto(root+'?running-catches#training/boost-grab');
  const status=page.locator('#footwork-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  await hold(['right','grab']);
  await waitFor('shortReach');
  assert.match(await status.textContent(),/short by \d+ px/);
  await hold([]);

  for (const [pattern,run,reach] of [
    ['boostGrab','right','right'],
    ['boostPivot','right','left'],
    ['boostPivot','left','right'],
  ]) {
    await press('footwork-'+pattern);
    if (run==='left') await press('footwork-side');
    await hold([run,'attack']);
    await waitFor('cancelNow');
    await hold([reach,'grab']);
    await waitFor(pattern==='boostPivot'?'boostPivotCatch':'boostCatch');
    assert.match(await page.locator('#recovery-tip').textContent(),/direction to throw/);
    await hold([]);
    await page.clock.runFor(75);
    await hold(['up']);
    await page.clock.runFor(1500);
    await hold([]);
    const target=await page.locator('#hud .percentage').nth(1).textContent();
    assert(parseInt(target,10)>0,'Up throw should damage the shielding rival, got '+target);
  }
  await press('reset-training');
  assert(await status.isHidden());
  console.log((mobile?'Touch':'Keyboard')+' passed short grab, boost grab, both pivot directions and up throws.');
}

async function testAttackCancel(page,mobile) {
  await page.goto(root+'?cancel#training/attack-cancel');
  const status=page.locator('#footwork-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for(const mode of ['ground','dash','back']){
    if(mode==='dash') await press('footwork-cancelDash');
    if(mode==='back'){await press('footwork-cancelTurn');await press('footwork-side');}
    await hold(['right','attack']);
    await waitFor('cancelNow'); await hold([]); await page.clock.runFor(350);
    assert.equal(await status.getAttribute('data-result'),'cancelNow');
    assert.match(await status.textContent(),/windup/);
    await hold(mode==='ground'?['attack']:mode==='dash'?['up','jump']:['left','jump']);
    await waitFor(mode==='ground'?'groundMiss':mode==='dash'?'risingCatch':'backCatch');
    await hold([]);
  }
  await press('footwork-cancelDash'); await press('footwork-slow'); await press('footwork-pause');
  assert.equal(await page.locator('#footwork-pause').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#footwork-slow').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>{
    const proto=window.DogFight.Battle.prototype, original=proto.step;
    window.windupTrace=[];
    proto.step=function(dt,a,b){
      const value=original.call(this,dt,a,b), f=this.dogs[0];
      if(this.footworkPractice?.pattern==='cancelDash' && a && window.windupTrace.length<30)
        window.windupTrace.push({x:a.x,attack:a.attack,jump:a.jump,move:f.attack?.moveId,age:f.attack?.time,phase:this.footworkPractice.phase});
      return value;
    };
    window.endWindupTrace=()=>{proto.step=original;};
  });
  await hold(['left','attack']);
  // RAF can render before a fresh fixed simulation tick has accumulated.
  for(let i=0;i<24;i++){
    if(await page.evaluate(()=>window.windupTrace.some(frame=>frame.move==='noodleLeadSweep')))break;
    await page.clock.runFor(4);
  }
  const trace=await page.evaluate(()=>window.windupTrace);
  assert.equal(trace.at(-1)?.move,'noodleLeadSweep',JSON.stringify(trace));
  await hold(['up','jump']); await waitFor('risingCatch'); await hold([]);
  await page.evaluate(()=>window.endWindupTrace());
  await press('reset-training'); assert(await status.isHidden());
  console.log((mobile?'Touch':'Keyboard')+' passed dash attack to up air, turnaround back air, ground whiff and match timing.');
}

async function testFastFallPressure(page,mobile) {
  await page.goto(root+'?apex#training/fast-fall');
  const status=page.locator('#spacing-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  for (const choice of ['float','drop','parry']) {
    if (choice==='drop') await press('spacing-fastfall');
    if (choice==='parry') await press('spacing-side');
    await hold(['attack']); await waitFor('apex'); await hold([]);
    await page.clock.runFor(500);
    assert.equal(await status.getAttribute('data-result'),'apex');
    await hold(choice==='float'?['shield']:['down','shield']);
    if(choice==='parry'){
      await waitFor('apexGuard');
      await hold([]); await waitFor('apexParry');
      await hold(['up','attack']); await page.clock.runFor(34); await hold([]);
      await waitFor('punish');
      assert.match(await status.textContent(),/Parry into Loop Lift/);
    } else {
      await waitFor(choice==='float'?'clipped':'blocked'); await hold([]);
      assert.match(await status.textContent(),choice==='float'?/still airborne/:/grounded and ready \+9f/);
    }
  }
  await press('spacing-fastfall'); await press('spacing-apex-pause'); await press('spacing-slow');
  await hold(['attack']); await page.clock.runFor(900); await hold([]);
  assert.equal(await status.getAttribute('data-result'),'clipped');
  await press('reset-training'); assert(await status.isHidden());
  console.log((mobile?'Touch':'Keyboard')+' passed the float, apex drop, grounded guard and parry into Loop Lift.');
}

async function testAerialSweetSpots(page,mobile) {
  const cases=[
    ['noodle',9,12,'Tail tip'],['pip',7,9,'High heel'],['brisket',12,15,'Hip smash'],['clover',8,9,'Rim scoop'],
  ];
  for (const [kind,body,sweet,label] of cases) {
    await page.goto(root+'?aerial-spot#training/sweet-spots/'+kind);
    const status=page.locator('#spacing-status');
    const {hold,press,waitFor}=await trainingControls(page,mobile,status);
    assert.equal(await page.locator('#training-boxes').getAttribute('aria-pressed'),'true');
    if(kind==='noodle'){
      await page.evaluate(()=>{
        const stroke=CanvasRenderingContext2D.prototype.strokeRect;
        window.contactColors=[];
        CanvasRenderingContext2D.prototype.strokeRect=function(...args){
          if(this.canvas.id==='game' && this.getLineDash().length) window.contactColors.push(this.strokeStyle);
          return stroke.apply(this,args);
        };
      });
      await page.clock.runFor(40);
      const colors=await page.evaluate(()=>window.contactColors);
      assert(colors.includes('#ff8a78') && colors.includes('#f4c76a'));
      await press('training-boxes');
      await page.evaluate(()=>{window.contactColors=[];});await page.clock.runFor(40);
      assert(!await page.evaluate(()=>window.contactColors.includes('#f4c76a')));
      assert(await page.locator('#box-key').isHidden());
      await press('training-boxes');
    }
    const side=kind==='pip'?'up':'right';
    await hold([side,'attack']); await waitFor('body'); await hold([]);
    assert((await status.textContent()).includes('Body hit · '+body+'%'));
    await press('spacing-aligned');
    await hold([side,'attack']); await waitFor('sweet'); await hold([]);
    assert((await status.textContent()).includes(label+' · '+sweet+'%'));
    assert((await page.locator('#recovery-tip').textContent()).includes('Previous hit · Body hit · '+body+'%'));
    await press('spacing-side');
    await hold([kind==='pip'?'up':'left','attack']); await waitFor('sweet'); await hold([]);
    await press('reset-training'); assert(await status.isHidden());
  }
  console.log((mobile?'Touch':'Keyboard')+' played both contact zones and both facings for each dog and verified the canvas box overlay.');
}

async function testImpactTech(page,mobile) {
  await page.goto(root+'?impact#training/impact-tech');
  const wall=page.locator('#wall-status');
  let {hold,press,waitFor}=await trainingControls(page,mobile,wall);
  assert.equal(await page.locator('#wall-impact').getAttribute('aria-pressed'),'true');
  await waitFor('flight'); await hold(['shield']); await waitFor('hardImpact'); await hold([]);
  assert.match(await wall.textContent(),/Too fast to tech · 917 px\/s/);
  await press('wall-retry');
  await waitFor('flight'); await hold(['up','shield']); await waitFor('wallTech'); await hold([]);
  assert.match(await wall.textContent(),/Wall tech · 849 px\/s/);
  await press('wall-side');
  await waitFor('flight'); await hold(['up','shield','jump']); await waitFor('wallTechJump'); await hold([]);
  await press('wall-impact');
  assert.equal(await page.locator('#wall-impact').getAttribute('aria-pressed'),'false');
  await waitFor('flight'); await hold(['shield']); await waitFor('wallTech'); await hold([]);
  assert.equal(await wall.textContent(),'Wall tech');

  await page.goto(root+'?spike-impact#training/spike-impact');
  const floor=page.locator('#launch-status');
  ({hold,press,waitFor}=await trainingControls(page,mobile,floor));
  for (const steer of [false,true]) {
    if(steer) await press('launch-floor-spike');
    await hold(['attack']); await waitFor('hit');
    await hold(steer?['right','shield']:['shield']);
    await waitFor(steer?'techRoll':'hardImpact'); await hold([]);
    assert.match(await floor.textContent(),steer?/Tech roll/:/Too fast to tech · 970 px\/s/);
  }
  await press('reset-training');
  assert(await floor.isHidden());
  console.log((mobile?'Touch':'Keyboard')+' passed the heavy wall slam, steered wall tech and jump, ordinary brace, spike bounce and steered roll.');
}

async function testShieldBreak(page,mobile) {
  await page.goto(root+'?break-practice#training/shield-break');
  const status=page.locator('#shield-status');
  const {hold,press,waitFor}=await trainingControls(page,mobile,status);
  await hold(['shield']);
  await waitFor('pop');
  await waitFor('dizzy');
  await waitFor('punished');
  assert.match(await status.innerText(),/Roof Raiser.*0 escape inputs/);
  await hold([]);
  await press('shield-breakEscape');
  const cdp=mobile && await page.context().newCDPSession(page);
  const point=async (name,id)=>{
    const b=await page.locator('[data-touch="'+name+'"]').boundingBox();
    return {id,x:b.x+b.width/2,y:b.y+b.height/2};
  };
  const shield=mobile && await point('shield',1);
  if(mobile) await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[shield]});
  else await hold(['shield']);
  await waitFor('dizzy');
  const left=mobile && await point('left',2), right=mobile && await point('right',2);
  for(let i=0;i<26 && await status.getAttribute('data-result')==='dizzy';i++){
    if(mobile) {
      await cdp.send('Input.dispatchTouchEvent',{type:i?'touchMove':'touchStart',touchPoints:[shield,i%2?right:left]});
      await page.clock.runFor(64);
    } else {
      await page.keyboard.down('j');await page.clock.runFor(34);
      await page.keyboard.up('j');await page.clock.runFor(34);
    }
  }
  if(mobile) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[shield,await point('neutral',2)]});
  await waitFor('guarded');
  assert.match(await status.innerText(),/blocked Roof Raiser.*[1-9]\d* escape inputs/);
  if(mobile) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  else await hold([]);
  await press('shield-breakPunish');
  await hold(['up','smash']);
  await waitFor('dizzy');
  await page.clock.runFor(520);
  await hold([]);
  await waitFor('punished');
  assert.match(await status.innerText(),/Scissor.*caught the dizzy dog/);
  assert(await page.evaluate(()=>{
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=180;
    const ctx=canvas.getContext('2d');
    return ['brisket','pip','clover','noodle'].every(kind=>{
      const images=new Set();
      for(const time of [0,.18,.35,.52]){
        ctx.clearRect(0,0,180,180);
        window.DogArt.draw(ctx,kind,90,140,{face:1,scale:1,time,pose:'dizzy',phase:0});
        images.add(canvas.toDataURL());
      }
      return images.size===4;
    });
  }));
  await press('reset-training'); assert(await status.isHidden());
  console.log((mobile?'Two-thumb touch':'Keyboard')+' passed the shield-break punish, wakeup guard, attacker role and four dizzy animation frames per dog.');
}
async function testDevice(browser, mobile) {
  const context = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 800 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2030-01-01T00:00:05Z'));
    await testJumpPower(page, mobile);
    await testAttackPress(page, mobile);
    await page.goto(root + '#training/combos');
    const text = id => page.locator('#' + id).innerText();
    const activate = id => mobile ? page.locator('#' + id).tap() : page.locator('#' + id).click();
    const ticks = ms => page.clock.runFor(ms);
    await ticks(4100);
    assert.match(await text('combo-summary'), /4 hits · 17\.7%/);
    await activate('combo-slow');
    await page.selectOption('#combo-reply','away');
    await ticks(2100);
    assert.match(await text('combo-summary'), /2 hits · 10%/);
    assert.match(await text('combo-previous'), /Standing at 0% · 4 hits · 17\.7%/);
    assert.match(await text('combo-latest'), /2 shifts/);
    await page.selectOption('#combo-reply','guard');
    await activate('combo-late');
    await ticks(2100);
    assert.match(await text('combo-summary'), /1 hit · 4%/);
    assert.match(await text('combo-latest'), /blocked · 16f opening/);
    await page.selectOption('#combo-reply','stand');
    await activate('combo-record');
    assert.match(await text('combo-summary'), /Ready to record/);
    async function jab() {
      if (mobile) await page.locator('[data-touch="attack"]').tap();
      else await page.keyboard.press('j');
    }
    await jab();
    await ticks(500);
    await jab();
    await ticks(3200);
    assert.match(await text('combo-summary'), /2 hits/);
    const original = await text('combo-latest');
    await activate('combo-replay');
    await ticks(3700);
    assert.equal(await text('combo-latest'), original);
    await page.selectOption('#combo-reply','guard');
    await ticks(3700);
    assert.match(await text('combo-summary'), /1 hit/);
    assert.match(await text('combo-latest'), /blocked/);
    await page.locator('#combo-history summary').click();
    assert.equal(await page.locator('#combo-list li').count(),2);
    if (mobile) {
      const box = await page.locator('#combo-readout').boundingBox();
      assert(box.width <= 390 && box.x >= 0);
    }
    await activate('reset-training');
    assert(await page.locator('#combo-readout').isHidden());
    await activate('combo-training');
    assert(await page.locator('#combo-record').isVisible());
    assert(await page.locator('#combo-replay').isEnabled());
    assert.equal(await page.locator('#combo-slot option:checked').textContent(),'A · Your recording');
    console.log((mobile ? 'Phone touch' : 'Desktop keyboard') + ' passed examples, recording, replay, reply changes and free-training reset.');
    await testDefendTakes(page, mobile);
    await testShieldPunish(page, mobile);
    await testCrawl(page, mobile);
    await testPracticeRoom(page, mobile);
    await testGetUpAttacks(page, mobile);
    await testBoostGrabs(page, mobile);
    await testPartnerTraining(page, mobile);
    await testEdges(page, mobile);
    await testTumble(page, mobile);
    await testBraking(page, mobile);
    await testFootstools(page, mobile);
    await testSoloCpu(page, mobile);
    await testFrameAdvance(page, mobile);
    await testJumpCancel(page, mobile);
    await testStockClock(page, mobile);
    await testAngledTilts(page, mobile);
    await testWallJumps(page, mobile);
    await testCeilingTech(page, mobile);
    await testLedgePatience(page, mobile);
    await testShortHops(page, mobile);
    await testFlickJumps(page, mobile);
    await testRage(page, mobile);
    await testShieldBreak(page, mobile);
    await testImpactTech(page, mobile);
    await testAerialSweetSpots(page, mobile);
    await testFastFallPressure(page, mobile);
    await testAttackCancel(page, mobile);
    await testBlastRadar(page, mobile);
    await testFinalHit(page, mobile);
    await testHitstunCancel(page, mobile);
    await testNightMail(page, mobile);
    await testCanal(page, mobile);
    await testJumpIns(page, mobile);
    await testLedgeReturn(page, mobile);
    await testSpotCounter(page, mobile);
    await testDodgeTiming(page, mobile);
    await testGripEscape(page, mobile);
    await testShoulderCarry(page, mobile);
    await testDiscReflect(page, mobile);
    await testDashShield(page, mobile);
    await testHaymaker(page, mobile);
    assert.deepEqual(errors, []);
  } catch (error) {
    const panel = await page.locator('.training-readouts output:visible').allTextContents();
    throw new Error((mobile ? 'Phone touch' : 'Desktop keyboard') + ' at ' + page.url() + ' ' +
      JSON.stringify({panel, errors, trace: await page.evaluate(() => window.pressTrace),
        solo:await page.evaluate(() => window.soloProbe)}) + '\n' + error.stack);
  } finally {
    await context.close();
  }
}
async function main() {
  const executablePath = execFileSync('which', ['google-chrome'], { encoding: 'utf8' }).trim();
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    await testDevice(browser, false);
    await testDevice(browser, true);
  } finally {
    await browser.close();
  }
}
main().catch(error => {
  console.error(error);
  console.log('::error::' + error.message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n','%0A'));
  process.exitCode = 1;
});
