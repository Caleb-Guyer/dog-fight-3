(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  function show(footworkPatterns,showDialog,startExercise) {
    const practiceGroups = [
      ['Movement','Footwork','footwork', footworkPatterns],
      ['Movement','Wavedash','wave',['back','platform']],
      ['Movement','Platforms','platform',['below','top','hold','ferry','shield-drop','layers']],
      ['Attack','Combo practice','combo',['example','confirm','throwChase','late','compare','record','defend','mix','tapes','flurry','escapeFlurry']],
      ['Attack','Aerial spacing','spacing',['approach','retreat','landing','airPower','fastfall','sweet','cancel','footstool','footstoolTech','reverse','wavebounce']],
      ['Attack','Knockdowns','launch',['lock','bait','read','floor-spike','edge-spike']],
      ['Attack','Move freshness','freshness',['training','ko','rage','drive']],
      ['Defense','Combo escape','escape',['tip','close','counter','break','gripEscape','gripThrow','carry']],
      ['Defense','Shield pressure','shield',['kick','drop','crossup','strike','grab','counterGrab','dodgeTiming','breakEscape','breakPunish','jumpIn','low','high','poke']],
      ['Defense','Launch & survival','launch',['throw','juggle','breakaway','survival','last-stock','escape','stock-return','stock-catch']],
      ['Defense','Air dodge','air',['neutral','edge','lastDodge','interrupted','highReturn']],
      ['Recovery','Edgeguarding','edge',['lip','shortCatch','longCatch','tip','deep','corner','inside','light']],
      ['Recovery','Ledge recovery','ledge',['training','right','attack-training']],
      ['Recovery','Ledge timing','climb',['escape','trap','rise','coverRise','patience']],
      ['Recovery','Ledge roll','roll',['guard','read','scout']],
      ['Recovery','Contested ledge','trump',['take','defend','runoff','escape']],
      ['Recovery','Stage techs & wall jumps','wall',['training','impact','ceiling','spring','pip','noodle']],
      ['Movement','Free practice','',['reset-training','partner-training']],
    ];
    const practiceAliases = {
      'combo-tapes':'recording share saved mixup defend attack sequence',
      'combo-compare':'compare defenses escape reply opening gap jab counterattack jump hitstun',
      'footwork-center':'push weight roll jump crossup shoulder ground spacing', 'footwork-crawl':'Noodle Clover duck boomerang projectile skip serve', 'footwork-antiAir':'anti-air',
      'footwork-angleHigh':'up angled forward tilt', 'footwork-angleLow':'down angled forward tilt',
      'footwork-reflect':'Pip bark projectile Clover', 'footwork-returnFire':'Clover Pip projectile reflect',
      'footwork-armor':'Brisket Haymaker armor', 'footwork-armorGrab':'Brisket armor grab',
      'footwork-cancelDash':'attack cancel', 'footwork-cancelTurn':'attack cancel',
      'spacing-landing':'short hop full jump flick', 'spacing-fastfall':'fast fall shield',
      'platform-layers':'fall through platform drop fast fall aerial landing',
      'escape-tip':'SDI smash directional influence', 'escape-close':'SDI smash directional influence',
      'launch-survival':'directional influence DI knockout', 'launch-breakaway':'hitstun cancel tumble combo escape',
      'launch-escape':'jab lock tech', 'launch-bait':'getup attack tech chase', 'launch-read':'tech chase roll reaction read mixup landing grab punish',
      'launch-stock-return':'respawn invincibility angel platform', 'launch-stock-catch':'respawn invincibility angel platform',
      'shield-kick':'Clover Disc Hook out of shield counter', 'shield-drop':'Clover Disc Hook out of shield counter',
      'shield-grab':'spot dodge roll', 'shield-strike':'perfect shield release',
      'shield-crossup':'shield grab back air out of shield cross up landing punish',
      'shield-jumpIn':'empty hop falling aerial grab', 'freshness-training':'stale moves staling',
      'freshness-drive':'launch height angle ground slide ledge side smash back air',
      'air-lastDodge':'recovery low wide directional air dodge edgeguard',
      'edge-light':'light shield firm analog trigger coverage pushback block stun corner pressure',
      'air-interrupted':'up special recovery hit reset return edgeguard',
      'air-highReturn':'offstage high recovery short hop forward aerial edgeguard rival',
      'trump-runoff':'ledge trump run off back aerial edgeguard follow up',
      'trump-escape':'ledge trump run off roll jump avoid edgeguard',
      'partner-training':'local two players sparring', 'reset-training':'free training dummy',
      'wall-ceiling':'ceiling tech under stage recovery Noodle Pip',
      'wall-spring':'late delayed wall tech jump brace stage spike saved recovery',
    };
    const practiceTitles = {'roll-scout':'Teach the guard your ledge roll','reset-training':'Free training', 'shield-drop':'Punish Brisket’s Belly Drop',
      'shield-strike':'Parry or roll through a strike', 'shield-grab':'Dodge an incoming grab', 'wall-impact':'Tech a heavy impact'};
    function searchWords(value) {
      return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    }
    const lanes = ['All', ...new Set(practiceGroups.map(group => group[0]))];
    showDialog('practice', 'Find a drill',
      '<label class="practice-search">Search drills<input id="practice-query" type="search" placeholder="Try jab lock, crawl, or parry" autocomplete="off"></label>' +
      '<div class="practice-lanes" aria-label="Drill categories" role="group">' +
      lanes.map(lane => '<button type="button" class="utility" data-lane="' + lane + '">' + lane + '</button>').join('') +
      '</div><div id="practice-count" role="status"></div><div id="practice-results"></div>');
    const query = $('practice-query'), results = $('practice-results');
    let lane = 'All';
    function refresh() {
      const words = searchWords(query.value).split(' ').filter(Boolean);
      let count = 0;
      results.replaceChildren();
      for (const [category, family, prefix, names] of practiceGroups) {
        if (lane !== 'All' && lane !== category) continue;
        const section = document.createElement('section');
        const title = document.createElement('h3');
        title.textContent = family;
        section.append(title);
        for (const name of names) {
          const id = prefix ? prefix + '-' + name : name;
          const label = practiceTitles[id] || $(id).textContent.trim();
          const searchable = searchWords([category, family, label, practiceAliases[id] || '', id].join(' '));
          if (!words.every(word => searchable.includes(word))) continue;
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.exercise = id;
          button.textContent = label;
          section.append(button);
          count++;
        }
        if (section.children.length > 1) results.append(section);
      }
      $('practice-count').textContent = count ? count + (count === 1 ? ' drill' : ' drills') : 'No drills found.';
      if (!count) {
        const reset = document.createElement('button');
        reset.className = 'utility'; reset.textContent = 'Show all drills';
        reset.onclick = () => { lane = 'All'; query.value = ''; refresh(); document.querySelector('[data-lane="All"]').focus(); };
        results.append(reset);
      }
      for (const button of document.querySelectorAll('[data-lane]')) button.setAttribute('aria-pressed', String(lane === button.dataset.lane));
      results.scrollTop = 0;
    }
    query.oninput = refresh;
    query.onkeydown = e => {
      if (e.isComposing || !['ArrowDown','Enter'].includes(e.key)) return;
      e.preventDefault();
      const first = results.querySelector('button');
      if (e.key === 'ArrowDown') first?.focus();
      else first?.click();
    };
    for (const button of document.querySelectorAll('[data-lane]')) button.onclick = () => { lane = button.dataset.lane; refresh(); };
    results.onclick = e => {
      const entry = e.target.closest('[data-exercise]');
      if (entry) startExercise(entry.dataset.exercise);
    };
    refresh();
    document.querySelector('[data-lane="All"]').focus();
  }
  function footworkFeedback(world,e) {
    const status = $('footwork-status');
    const state = e.outcome || e.phase;
    status.dataset.result = state;
    const pattern = world.footworkPractice.pattern;
    if (pattern === 'center' || pattern==='brace') {
      const result={
        heldLine:['Held the chalk · '+world.footworkPractice.distance+' px pushed','Retry unguarded and compare the distance. A fresh shield braces harder than a worn one.'],
        lostLine:['Pushed past the chalk · '+world.footworkPractice.distance+' px','Retry holding Shield before the shoulders meet, or roll through the runner.'],
        gaveRoom:['Yielded the chalk','The runner reached your mark. Hold Shield in their path or cross over and land behind them.'],
        caughtRunner:['Caught the runner','Choose a throw. Retry and compare a grab with bracing in place.'],
        crossed:['Changed sides','You landed behind the rival. Retry and try pushing through on foot.'],
        tookGround:['Took ground','You pushed the rival back. Retry and roll through them as your shoulders meet.'],
        lostGround:['Rival reached the chalk','Move forward sooner, or jump as the rival approaches and land behind them.'],
        hitFirst:['Hit landed','Retry with movement alone to compare a push with a jump or roll.']
      }[state];
      if(result)[status.textContent,$('recovery-tip').textContent]=result;
      return;
    }
    if (pattern === 'crawl') {
      const feedback = {
        castHigh:['Round Trip away', 'Get low and crawl toward Clover.'],
        under:['First pass clear', 'Keep low and move past the chalk as the disc comes back.'],
        inside:['Inside the chalk', 'Clover is lining up Skip Serve. Shield, or reach her with a tilt.'],
        castLow:['Skip Serve away', 'This shot bounces low. Hold Shield.'],
        shortCrawl:['Both passes clear · short of the chalk', 'Add a side while holding Down to gain ground under the disc.'],
        castHit:['Hit on the way out', 'Hold Down and move toward Clover.'],
        returnHit:['Clipped on the return', 'Stay low until the disc passes your ears a second time.'],
        highGuard:['Blocked the high disc', 'Try holding Down and crawling forward while the disc passes overhead.'],
        lowHit:['Skip Serve hit low', 'The bouncing serve reaches the floor. Shield it or interrupt Clover.'],
        lowGuard:['Blocked Skip Serve', 'You took ground under Round Trip and blocked the low follow-up.'],
        caughtServe:['Caught Clover', 'You reached Clover before Skip Serve could stop you.'],
        earlyHit:['Hit before the return', 'Let Round Trip pass overhead twice to practice the full approach.'],
        avoided:['Disc avoided', 'Try crawling under both passes and reaching the chalk.'],
      }[state];
      if (feedback) [status.textContent,$('recovery-tip').textContent] = feedback;
      return;
    }
    if (pattern === 'armor' || pattern === 'armorGrab') {
      const punch = pattern === 'armor';
      status.textContent = {count:'Beat ' + e.beat, go:punch ? 'Release Smash!' : 'Grab now!',
        caughtArmor:'Grabbed the planted shoulder', ordinaryGrab:'Grab landed outside the armor window',
        armoredPunch:'Jab absorbed · Haymaker landed', cleanPunch:'Haymaker landed clean',
        interruptedPunch:'Punch interrupted', blockedPunch:'Blocked Haymaker', parriedPunch:'Parried Haymaker',
        missedSwing:'No clean hit'}[state];
      if (e.outcome) $('recovery-tip').textContent = punch ?
        'Try again. Holding Smash through the jab leaves Brisket open. Release on the third light to punch through it.' :
        'Retry with Attack on the third light, then try Grab on that same beat. A catch leaves you free to pummel or throw.';
      return;
    }
    if (pattern === 'dashShield') {
      status.textContent = {
        atMark:'Hold Shield now', dashBlocked:'Dash shield · tap Grab', standingBlock:'Blocked · tap Grab',
        caughtCounter:'Caught Brisket', jumpedClear:'Brisket jumped clear', parriedApproach:'Parried Gate Check',
        ranIntoSwing:'Gate Check hit you', shortStop:'Stopped short of the chalk',
        intercepted:'You caught Brisket first', avoided:'Gate Check missed',
      }[state];
      if (state === 'dashBlocked' || state === 'standingBlock')
        $('recovery-tip').textContent = 'Keep Shield held and tap Grab during the block. Brisket will jump as soon as his swing ends.';
      else if (e.outcome) $('recovery-tip').textContent = state === 'caughtCounter'
        ? 'You have the grab. Choose a throw, or tap Run up and shield to retry on the same mark.'
        : 'Run to the chalk. Keep forward held and add Shield as Brisket swings. Tap Grab when his paw hits the shield.';
      return;
    }
    if (world.footworkPractice.discRole) {
      const pip = pattern === 'reflect';
      status.textContent = {
        cast:pip ? 'Bark now!' : 'Round Trip is away',
        reflected:pip ? 'Disc sent back!' : 'Incoming · shield now!',
        returnedHit:'Round Trip hit Clover', returnGuard:'Clover guarded the return',
        returnParry:'Clover parried the return', castParry:'Pip parried the cast',
        discHit:'Round Trip hit Pip', castGuard:'Pip guarded the cast',
        returnMiss:'The return missed', missedSwing:'No disc contact', otherHit:'Close-range hit',
      }[state];
      if (e.outcome) $('recovery-tip').textContent = pip
        ? 'Retry and compare holding Shield with tapping neutral Special just as Clover lets go of the disc.'
        : 'Retry and hold Shield when the mint streak points back at Clover. Switch sides to mirror the throw.';
      return;
    }
    if (world.footworkPractice.boost) {
      const pivot = pattern === 'boostPivot';
      status.textContent = {cancelNow:pivot ? 'Reverse + Grab' : 'Tap Grab now',
        boostCatch:'Boost grab caught the shield', boostPivotCatch:'Caught behind', regularCatch:'Regular grab',
        shortReach:world.footworkPractice.closestGap > 0 ? 'Grab fell short by ' + Math.ceil(world.footworkPractice.closestGap) + ' px' : 'Missed the grab',
        guardedDash:'Dash attack blocked', swingMiss:'Dash attack missed', groundHit:'Ground hit'}[state];
      $('recovery-tip').textContent = state === 'cancelNow' ? (pivot ? 'Press back and tap Grab.' : 'Tap Grab during the windup.') +
        (world.footworkPractice.pauseOnWindup ? ' Tap Attack again to finish the swing.' : '') :
        state === 'boostCatch' || state === 'boostPivotCatch' || state === 'regularCatch' ?
          'You have the collar. Tap Attack to pummel or choose a direction to throw.' :
          'Retry with Attack first. Tap Grab in the first two frames of the dash attack.';
      return;
    }
    if(pattern==='boostSmash'){
      const player=world.dogs[0];
      status.textContent={cancelNow:'Windup · Up + Smash',boostSmashCatch:player.lastMove+' · caught the hop',
        groundMiss:'Ground swing missed',lateSmash:'Up smash missed',otherHit:player.lastMove+' · hit'}[state];
      $('recovery-tip').textContent=state==='cancelNow'?'Release forward, hold Up and tap Smash. Tap Attack again to finish the dash attack instead.':
        state==='boostSmashCatch'?'Turn off Pause at windup and Half speed to try it at match speed.':'Retry and tap Up + Smash in the first two frames of the dash attack.';
      return;
    }
    if (pattern === 'cancelDash' || pattern === 'cancelTurn') {
      const practice = world.footworkPractice, player = world.dogs[0], dash = pattern === 'cancelDash';
      const aim = dash ? 'Up' : practice.dir > 0 ? 'Right' : 'Left';
      if (state === 'cancelNow') {
        status.textContent = window.DogFight.moves[e.moveId].label + ' · windup';
        $('recovery-tip').textContent = 'Press ' + aim + ' + Jump to switch to a rising aerial.' +
          (practice.pauseOnWindup ? ' Or release Attack and tap it again to finish the ground swing.' : '');
      } else {
        status.textContent = {risingCatch:player.lastMove + ' · caught the hop',
          backCatch:player.lastMove + ' · back air connected', otherHit:player.lastMove + ' · hit',
          airMiss:'Aerial missed', groundMiss:'Ground swing missed'}[state];
        $('recovery-tip').textContent = state === 'groundMiss' ? 'The rival cleared the swing. Retry and jump during the windup.' :
          'Turn off Pause at windup and Half speed to practice at match speed. Switch sides to mirror the opening.';
      }
      return;
    }
    if (pattern === 'angleHigh' || pattern === 'angleLow') {
      const move = world.dogs[0].lastMove;
      status.textContent = state === 'missedAngle' ? 'Miss · ' + (move || 'no swing') :
        move + (state === 'angledHit' ? (pattern === 'angleLow' ? ' · caught the recovery' : ' · caught the hop') : ' · hit');
      return;
    }
    if (pattern === 'antiAir') {
      const move = world.dogs[0].lastMove;
      status.textContent = {
        atMark:'Jump + Up Smash', slideCatch:move + ' · caught the landing',
        specialCatch:move + ' · jump-cancel special', otherCatch:move + ' · hit',
        caughtShield:'The rival landed and blocked', overshot:'Missed the landing',
      }[state];
      if (e.outcome) $('recovery-tip').textContent = {
        slideCatch:'Your up smash carried your run under the falling dog. Retry and hold Smash to see when their shield comes up.',
        specialCatch:'Your up special started during jump squat and intercepted the rival.',
        otherCatch:'You landed a hit. To slide underneath, run to the chalk and tap Jump and Up + Smash together.',
        caughtShield:'Your swing reached the shield. Retry and release Smash sooner.',
        overshot:'Retry. Run to the chalk, hold Up, then tap Jump and Smash together as the rival falls.',
      }[state];
      return;
    }
    if (pattern === 'brake' || pattern === 'pivot') {
      const move = world.dogs[0].lastMove;
      status.textContent = {
        atMark: pattern === 'brake' ? 'Brake now' : 'Turn and strike',
        slidingHit: move + (pattern === 'brake' ? ' · sliding hit' : ' · caught the chase'),
        dashHit: move + ' · dash attack', plantedHit: move + ' · planted hit', overshot: 'Missed the opening',
      }[state];
      if (e.outcome) $('recovery-tip').textContent = {
        slidingHit: 'Your tilt connected while carrying the run into its windup. Switch sides to try it the other way.',
        dashHit: 'That was your dash attack. Retry and let go of forward for a beat before aiming and tapping Attack.',
        plantedHit: 'You connected after planting your paws. Tap Attack earlier in the skid to carry speed into the swing.',
        overshot: 'Retry and start your tilt as your lead paw reaches the chalk.',
      }[state];
      return;
    }
    if (pattern !== 'bait') {
      status.textContent = {
        count: 'Beat ' + e.beat, go: pattern === 'power' ? 'Release!' : 'Swing!',
        matched: 'Paws clashed', brokeThrough: 'Breakthrough', overpowered: 'Swing beaten',
        batted: 'Disc batted away', hitTaken: 'Rival hit first', hitFirst: 'You hit first', missedSwing: 'No contact',
      }[state];
      if (e.outcome) {
        const result = {
          matched: pattern === 'power' ? 'Both swings recoiled. Start charging before the first beat.' :
            'Both dogs recoiled at the point of contact. Neither took damage.',
          brokeThrough: 'Your swing beat the rival’s and carried on.',
          overpowered: 'The stronger attack broke through your swing.',
          batted: 'Your swing knocked Clover’s disc out of play.',
          hitTaken: 'Their attack reached your dog first. Watch the chalk lights and take your swing sooner.',
          hitFirst: 'You landed a clean hit before the attacks met.',
          missedSwing: 'The attacks missed each other. Hold your ground and time your swing to the third light.',
        }[state];
        $('recovery-tip').textContent = result + ' Choose the exercise again to retry.';
      }
      return;
    }
    status.textContent = {
      tell: 'Bear Hug coming', opening: 'Grab missed · attack', caught: 'Caught',
      early: 'Hit first', late: 'Brisket recovered', clash: 'Grabs clashed', punish: 'Whiff punish',
    }[state];
    if (e.outcome)
      $('recovery-tip').textContent = {
        caught: 'Brisket caught you. Retry and reverse as your lead paw crosses the chalk.',
        early: 'You beat the grab to the punch. Retry and let his paws close on empty air.',
        late: 'You cleared Bear Hug. Turn back sooner and attack while his paws are still out.',
        clash: 'Both grabs met. Retry and let Bear Hug miss before you counter.',
        punish: 'You caught Brisket with ' + e.remaining + (e.remaining === 1 ? ' frame' : ' frames') + ' left in his recovery.',
      }[state];
  }
  window.PracticeDirectory={show,footworkFeedback};
})();
