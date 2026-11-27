/* Training-only readouts. Events come from the same battle that owns the exercise. */
(() => {
  'use strict';
  const {moves,specials,smashes,throws,grabs,isSweetPractice,isFootstoolPractice,isReversalPractice}=window.DogFight;
  const $=id=>document.getElementById(id);
  const tenth=n=>Number(n.toFixed(1));
  function event(world,name,e,practiceFight) {
    if (world?.launchPractice && e.f?.index === 0) launchFeedback(world, name, e);
    if (world?.meteorPractice && e.f?.index === 0) meteorFeedback(world, name, e);
    if (world?.survivalPractice && e.f?.index === 0) survivalFeedback(world, name, e);
    if (world?.stockPractice && e.f?.index === world.stockPractice.slot && name.startsWith('stock'))
      stockFeedback(world, name, e);
    if (name === 'chaseCue' || name === 'chaseResult') chaseFeedback(world, name, e);
    if (world?.wallPractice && e.f?.index === 0) wallFeedback(world, name, e);
    if (name === 'shieldCue' || name === 'shieldResult') shieldFeedback(world, name, e);
    if (world?.edgePractice && (name === 'edgeCue' || name === 'edgeLand' || name === 'edgeResult' ||
        (world.edgePractice.corner && (name === 'cornerCue' || (name === 'shieldSlip' && e.f.index === 0))) ||
        name === 'edgeOpen' || (world.edgePractice.timeCatch && name === 'ledge' && e.f.index === 1) ||
        ((name === 'teeter' || name === 'edgeCancel') && e.f.index === 0))) edgeFeedback(world, name, e);
    if (name === 'waveContact' || name === 'waveResult') waveFeedback(world);
    if (world?.spacingPractice && (name === 'spacingContact' || name === 'spacingLand' || name === 'spacingJab' ||
        name === 'spacingCancelStart' || name === 'spacingCancelCue' || name === 'footstoolCue' || name === 'apexCue' ||
        name === 'apexGuard' || name === 'apexParry' || name === 'airPowerCue' ||
        (name === 'fastFall' && e.f.index === 0 && world.spacingPractice.pattern === 'fastfall') ||
        (name === 'footstool' && isFootstoolPractice(world.spacingPractice)) ||
        name === 'spacingResult' || name === 'spacingRetry' || (name === 'specialTurn' && e.f.index === 0 && isReversalPractice(world.spacingPractice))))
      spacingFeedback(world, name, e);
    if (name === 'escapeCue' || name === 'escapeResult') escapeFeedback(world, e);
    if (world?.climbPractice && (name === 'climbCue' || name === 'climbResult' ||
        (name === 'ledgeClimbPlant' && world.climbPractice.role !== 'patience' && world.climbPractice.phase === 'active')))
      climbFeedback(world, name, e);
    if (name === 'platformResult' || name === 'platformClimb' || name === 'platformBlock' ||
        (name === 'platformDrop' && world?.platformPractice && e.f.index === 0) ||
        (name === 'airPlatformPass' && world?.platformPractice?.pattern === 'layers' && e.f.index === 0))
      platformFeedback(world, name, e);
    if (name === 'airStart' || name === 'airCue' || name === 'airResult') airFeedback(world, name, e);
    if (world?.rollPractice && e.f?.index === 0 && (name === 'ledgeRoll' || name === 'rollResult'))
      rollFeedback(world, name, e, practiceFight);
    if (world?.trumpPractice) trumpFeedback(world, name, e);
  }
  function reversalTip(world, d) {
    const back = d.dir > 0 ? 'left' : 'right', forward = d.dir > 0 ? 'right' : 'left';
    return d.pattern === 'reverse' ? 'Drifting ' + forward + ', rival behind. Tap Special with no direction, then flick ' + back +
      ' to reverse into them. On a retry, flick and release ' + back + ' before Special to hit while drifting away.' :
      'Rival ahead. Flick ' + back + ', release, tap Special, then immediately flick ' + forward +
      ' and release. ' + (d.guard && world.dogs[0].kind !== 'brisket' ? 'Land beyond the shield grab.' :
        d.guard ? 'Catch the shield with Collar Toss while sliding back.' : 'Hit the rival while sliding back past the chalk.');
  }
  function spacingFeedback(world, name, e) {
    const practice = world.spacingPractice, status = $('spacing-status');
    if (practice.pattern === 'airPower') {
      if (name === 'spacingRetry') {
        status.dataset.result = 'ready';
        status.textContent = 'Watch the chalk';
        $('recovery-tip').textContent = 'Tap Attack as your paws reach the chalk on the way down.';
        return;
      }
      if (name === 'airPowerCue') {
        status.dataset.result = 'swing';
        status.textContent = 'Tap Attack';
        return;
      }
      if (name !== 'spacingResult') return;
      const summarize = r => (r.short ? 'Short hop' : 'Full jump') + ' · ' + r.hits +
        (r.hits === 1 ? ' hit' : ' hits') + ' · ' + tenth(r.damage) + '% · ready on frame ' + r.frames;
      status.dataset.result = e.outcome;
      status.textContent = practice.result ? summarize(practice.result) : e.outcome === 'other' ? 'Different move' : 'Missed';
      $('recovery-tip').textContent = (practice.previous ? 'Last time you got ' + summarize(practice.previous) + '. ' : '') +
        (practice.result ? 'Press Hop or Jump again to compare.' :
          'Press Hop or Jump to retry. Keep the stick centered and tap Attack as your paws reach the chalk on the way down.');
      return;
    }
    if (practice.pattern === 'fastfall') {
      const tip = $('recovery-tip');
      if (name === 'apexCue') {
        status.dataset.result = 'apex';
        status.textContent = practice.pauseAtApex ? 'Apex · choose your descent' : 'Apex · flick Down';
        tip.textContent = 'Hold Shield alone to float. For a fast-fall, tap Down here and hold Shield through Pip’s reply.';
      } else if (name === 'fastFall') {
        status.dataset.result = 'drop';
        status.textContent = 'Fast-fall · hold Shield';
      } else if (name === 'apexGuard' || name === 'apexParry') {
        status.dataset.result = name;
        status.textContent = name === 'apexGuard' ? 'Guard up' : 'Parry · Up + Attack';
      } else if (e.outcome) {
        status.dataset.result = e.outcome;
        status.textContent = {blocked:'Blocked Scramble',clipped:'Hit by Scramble',miss:'Missed the shield',clear:'Cleared the counter',
          parried:'Parried Scramble',punish:'Parry into ' + (moves[practice.punish]?.label || 'punish')}[e.outcome];
        if (practice.attackerReady != null) status.textContent += ' · grounded and ready +' + practice.attackerReady + 'f';
        else if (e.outcome === 'clipped' && practice.landing === null) status.textContent += ' · still airborne';
        tip.textContent = (practice.defenderReady != null ? 'Pip could jump on frame +' + practice.defenderReady + ' after the block. ' : '') +
          (e.outcome === 'blocked' && world.dogs[0].kind !== 'clover' ?
            'Retry and release Shield at Guard up. Tap Up + Attack on the parry.' :
            'Choose Fast-fall pressure to retry. Turn off Pause at apex to practice the timing.');
      }
      return;
    }
    if (isSweetPractice(practice)) {
      if (!e.outcome) return;
      status.dataset.result = e.outcome;
      const show = r => r.label + ' · ' + r.damage + '% · ' + r.angle + '° · ' + r.speed + ' px/s';
      status.textContent = e.outcome === 'miss' ? 'Missed the rival' : e.outcome === 'other' ?
        'Different move · ' + (moves[practice.contact]?.label || 'hit') : show(practice.result);
      const tip = e.outcome === 'miss' || e.outcome === 'other' ? 'Choose Aerial sweet spots to retry the same spacing.' :
        'Choose Line up sweet spot to compare the same swing at the other spacing.';
      $('recovery-tip').textContent = (practice.previous ? 'Previous hit · ' + show(practice.previous) + '. ' : '') + tip;
      return;
    }
    if (isFootstoolPractice(practice)) {
      const rescue = practice.pattern === 'footstool';
      status.dataset.result = e.outcome || name;
      status.textContent = {
        footstoolCue:'Jump off their head', footstool:rescue ? 'Footstool · steer in' : 'Footstooled · tech the landing',
        saved:'Back onstage · footstool rescue', fell:'Missed the ledge', otherSave:'Recovered without a footstool',
        tech:'Teched in place', techRoll:'Tech roll', downed:'Missed tech', evaded:'Avoided the footstool', landed:'Landed',
      }[e.outcome || name];
      if (e.outcome) $('recovery-tip').textContent = rescue ?
        'Retry from the same height. Hold Jump through the bounce for more lift and steer toward the ledge.' :
        'Retry and tap Shield just before you land. Add left or right to roll through the landing.';
      return;
    }
    if (practice.pattern === 'cancel') {
      const tip = $('recovery-tip'), counter = moves[world.dogs[1].kit.tilts.down].label;
      status.dataset.result = e.outcome || name;
      if (name === 'spacingRetry') {
        status.textContent = 'Down + Attack';
        tip.textContent = 'Press Down + Attack to fall again. Start holding Shield when the chalk turns mint.';
      } else if (name === 'spacingCancelStart') {
        status.textContent = moves[world.dogs[0].kit.air.down].label;
        tip.textContent = practice.previousFrames === undefined ? 'Watch for ' + counter + ' as your paws touch down.' :
          'Watch the chalk beneath your paws. Press and hold Shield as it rises.';
      } else if (name === 'spacingCancelCue') {
        status.textContent = 'Hold Shield now';
        tip.textContent = 'Keep Shield held through ' + counter + ' to block it.';
      }
      else if (name === 'spacingLand' && practice.frames !== undefined) {
        status.textContent = (practice.canceled ? 'Canceled' : 'Landed') + ' · ' + practice.frames + ' frames';
      } else if (e.outcome) {
        const label = { blocked: 'Blocked ' + counter, parried: 'Parried ' + counter, caught: 'Caught by ' + counter,
          interrupt: (moves[practice.reply]?.label || 'Counter') + ' · ' + practice.damage + '%',
          other: 'Different aerial', miss: 'Left the mark' };
        status.textContent = label[e.outcome];
        const recovery = practice.frames === undefined ? '' : 'Landing recovery took ' + practice.frames + ' frames. ';
        const advice = e.outcome === 'caught' ? (practice.canceled ? 'Keep Shield held through the counter. ' :
          practice.lead > 7 ? 'Shield came ' + practice.lead + ' frames before touchdown. Wait for the mint chalk. ' :
          'Press Shield just before touchdown and keep it held. ') :
          practice.previousFrames !== undefined ? 'Your previous landing took ' + practice.previousFrames + '. ' : '';
        const counterTip = e.outcome === 'blocked' && world.dogs[0].kind === 'brisket'
          ? 'Try releasing Shield and tapping ' + (practice.dir > 0 ? 'Right' : 'Left') + ' + Attack on landing for Gate Check. ' : '';
        tip.textContent = recovery + advice + counterTip + 'Tap Attack to retry.';
      }
      return;
    }
    if (isReversalPractice(practice)) {
      const labels = { bReverse: 'B-reverse', turnaround: 'Turnaround', wavebounce: 'Wavebounce', straight: 'Straight cast',
        miss: 'Missed the rival', short: 'Landed near the mark', other: 'Different move', away: 'Left the setup',
        caught: 'Shield grab caught you', intercept: 'Grab interrupted', guarded: 'Rival held shield' };
      const tip = $('recovery-tip');
      status.dataset.result = e.outcome || name;
      if (name === 'spacingRetry') {
        status.textContent = practice.pattern === 'reverse' ? 'Rival behind' : 'Rival ahead';
        tip.textContent = reversalTip(world, practice);
      } else if (e.outcome) {
        const result = practice.blocked && practice.grabLive && e.outcome !== 'caught' ? ' · grab missed' :
          practice.damage ? ' · ' + practice.damage + '%' : '';
        status.textContent = labels[e.outcome] + result;
        const traveled = Math.round((practice.landingX - practice.originX) * practice.dir);
        const route = Number.isFinite(traveled) ? 'Landed ' + Math.abs(traveled) + ' px ' + (traveled < 0 ? 'back' : 'ahead') + ' of the chalk.' : '';
        const advice = e.outcome === 'caught' ? 'Try the same cast with a wavebounce to land outside the grab.' :
          e.outcome === 'other' ? 'Center the direction when you press Special.' :
          e.outcome === 'miss' ? 'Aim toward the rival as your move comes out.' : route;
        tip.textContent = advice + ' Tap Attack to retry.';
      } else if (name === 'specialTurn') status.textContent = labels[e.turn];
      else if (name === 'spacingContact') status.textContent = practice.blocked ? 'Shield contact' : specials[practice.contact].label + ' · ' + practice.damage + '%';
      return;
    }
    if (practice.pattern === 'landing') {
      const labels = { clean: 'Clean hit · ' + practice.damage + '%', string: 'True combo · ' + world.lastCombo.damage + '%',
        gap: 'Gap before the jab', guarded: (practice.timing === 'clean' ? 'Clean hit' : 'Late hit') + ' · jab shielded',
        escaped: 'Rival escaped', miss: 'Missed the aerial',
        jumpOnly: 'Jump measured', other: 'Different attack', away: 'Left the setup' };
      status.dataset.result = e.outcome || name;
      if (!e.outcome) {
        status.textContent = name === 'spacingJab' ? 'Tap Attack for jab' :
          name === 'spacingLand' ? 'Landed · center the stick' : (practice.timing === 'clean' ? 'Clean hit' : 'Late hit') + ' · ' + practice.damage + '%';
        return;
      }
      status.textContent = labels[e.outcome];
      const tips = { clean: 'The leading hit connected. To try the late hit, swing earlier at the gold fork.',
        string: moves[world.dogs[0].kit.air.forward].label + ' into ' + moves[world.dogs[0].kit.ground[0]].label +
          ' connected before the rival could act. Try the green stripe for the clean hit.',
        guarded: practice.timing === 'clean' ? 'The clean hit gave the rival time to shield your jab. Swing at the gold fork to try the follow-through.' :
          'The rival raised Shield before your jab. Tap Attack as the landing cue appears.',
        gap: 'Both hits landed. The rival had time to act between them.',
        escaped: 'The rival recovered. Release the direction on landing and tap Attack at the jab cue.',
        miss: 'Hold toward the rival for the whole short hop. Tap Attack over either floor mark.',
        jumpOnly: 'Try the other jump height, or hold toward the rival and swing at the gold fork.',
        other: 'Aim forward for the aerial, then center the direction for your jab.',
        away: 'Stay on this stretch of floor for the landing.' };
      $('recovery-tip').textContent = tips[e.outcome] + ' Choose Landing hits to retry.';
      return;
    }
    if (name === 'spacingContact') {
      status.dataset.result = 'contact';
      status.textContent = moves[e.moveId].label + ' hit shield';
    } else if (name === 'spacingLand') {
      status.dataset.result = 'landing';
      status.textContent = 'Landed · watch the grab';
    } else {
      const outcome = e.outcome;
      status.dataset.result = outcome;
      status.textContent = { crossed: 'Landed behind', spaced: 'Outside the grab', caught: 'Grabbed',
        miss: 'Shield untouched', other: 'Different aerial', close: 'Check your landing', away: 'Left the setup' }[outcome];
      const tip = { crossed: 'You tagged the shield and passed the waiting grab.', spaced: 'Your back air touched the shield as you drifted out of reach.',
        caught: 'The grab reached you. Keep moving through the landing.', miss: 'Swing toward the shield during takeoff.',
        other: 'Your back air strikes behind your facing.', close: practice.pattern === 'approach'
          ? 'Turn during the running jump, then carry your back air past the guard.' : 'Keep drifting away after your hit.',
        away: 'Use a short hop to keep the fight on this stretch of floor.' }[outcome];
      $('recovery-tip').textContent = tip + ' Choose ' + (practice.pattern === 'approach' ? 'Approach' : 'Retreat') + ' to retry.';
    }
  }
  function ledgeTrapCounterTip(f) {
    if (f.kind === 'brisket' || f.kind === 'noodle')
      return 'Stay below the fist until it extends, then tap Attack for ' + moves[f.kit.ledgeAttack].label + '.';
    return 'As the punch comes forward, tap Shield to roll. Aim inward and tap Attack as your paws land.';
  }
  function climbFeedback(world, name, e) {
    const drill = world.climbPractice, status = $('climb-status'), trap = drill.role === 'trap';
    if (drill.role === 'patience') {
      const outcome = e.outcome || e.phase;
      const [label, tip] = {
        start:['Brisket is charging', 'Stay on the ledge and watch his front paw.'],
        swing:['Haymaker released', ledgeTrapCounterTip(world.dogs[0])],
        opening:['Punch missed', world.dogs[0].ledge ? 'Tap Attack from the lip or roll in while Brisket recovers.' :
          'Brisket is recovering. Aim toward him and tap Attack.'],
        punched:['Caught by Haymaker', 'Hold the lip through the charge. An early climb gives Brisket a target.'],
        punished:['Whiff punished', 'Your hit caught Brisket before he recovered.'],
        grabbed:['Grab punish', 'Your grab caught Brisket after the swing.'],
        interrupted:['Beat the punch', 'You reached Brisket first. Try waiting for his swing.'],
        blockedPunch:['Haymaker blocked', 'Your shield took the blow. Try rolling through the swing.'],
        parriedPunch:['Haymaker parried', 'You released Shield just before the punch landed.'],
        guardedReply:['Brisket blocked', 'Roll a little earlier to leave more time for your counter.'],
        escaped:['Back onstage', 'You got past the punch with your stock intact.'],
        slipped:['Lost your grip', 'Leave before the last amber mark disappears.'],
        fell:['Missed the return', 'Try Shield while hanging to roll onto the stage.'],
      }[outcome];
      status.dataset.result = outcome;
      status.textContent = label;
      $('recovery-tip').textContent = tip + (e.outcome ? ' Choose Wait out Haymaker to retry.' : '');
      return;
    }
    if (drill.route) {
      const cover = drill.role === 'coverRise', inward = drill.route.dir > 0 ? 'right' : 'left';
      const outcome = e.outcome || e.phase;
      const label = {
        start:cover ? 'Watch the lip' : 'At the ledge', release:cover ? 'Paws released' : 'Jump back in',
        rise:cover ? 'Rival rising' : 'Aim ' + inward + ' + Attack',
        strike:(moves[e.moveId]?.label || 'Aerial') + ' connected',
        landedHit:(moves[drill.contact]?.label || 'Aerial') + ' · back onstage',
        landedClear:'Back onstage', regrab:'Caught the ledge again', fell:'Below the ledge',
        otherExit:'Used a get-up option', intercepted:cover ? 'Return intercepted' : 'Guard caught the return',
        blockedRise:'Rising aerial blocked', parriedRise:'Rising aerial parried', hitByRise:'Caught by the rising aerial',
      };
      status.dataset.result = outcome;
      status.textContent = label[outcome];
      const tip = $('recovery-tip');
      if (outcome === 'strike') tip.textContent = 'Keep drifting ' + inward + ' and land onstage.';
      else if (e.outcome) tip.textContent = cover ? 'Choose Cover the return to retry. Hold Shield through the swing, or release just before it hits.' :
        outcome === 'landedHit' ? 'Choose Cover the return to defend against the same route.' :
        'Choose Attack from below to retry. Tap Down + Jump, release Down, then hold ' + inward + ' and tap Attack.';
      return;
    }
    const labels = {
      start: trap ? 'Watch the ledge' : 'Climbing', plant: trap ? 'Paws down · jab' : 'Hold Shield',
      guarded: 'Jab blocked', caught: 'Caught standing', timed: 'Climb caught',
      late: 'Jab shielded', early: 'Swung early', missed: 'Swing missed', waited: 'Rival guarded', other: 'Different option',
    };
    const outcome = e.outcome || (name === 'ledgeClimbPlant' ? 'plant' : 'start');
    status.dataset.result = outcome;
    status.textContent = labels[outcome];
    if (name !== 'climbResult') return;
    const tips = {
      guarded: 'Your shield was up on the first free frame.', caught: 'Hold Shield once the climb starts. The jab arrives as you can first act.',
      timed: 'Your jab reached the rival in the opening before shield.', late: 'The rival was already shielding. Jab closer to the paw plant.',
      early: 'Your jab ended before the opening. Wait for the feet to come over the lip.',
      missed: 'The jab missed. Stay within reach of the spot where the rival stands.',
      waited: 'Jab as the paws touch down.', other: 'Try the short inward climb for this setup.',
    };
    $('recovery-tip').textContent = tips[outcome] + ' Choose ' + (trap ? 'Set the trap' : 'Get up') + ' to retry.';
  }
  function platformFeedback(world, name, e) {
    const label = moves[e.moveId]?.label;
    const below = world.platformPractice.pattern === 'below';
    const status = $('platform-status'), tip = $('recovery-tip');
    if (world.platformPractice.pattern === 'layers') {
      const drill = world.platformPractice;
      if (name === 'platformDrop' || (drill.phase === 'done' && name !== 'platformResult')) return;
      const feedback = {
        apex:['At the apex','Tap Down and release to land on top. Hold it to pass through.'],
        belowTop:['Through the top','Release Down to land on the side perch. Hold it to go through both.'],
        fall:['Through both perches',world.dogs[0].kind === 'brisket' ? 'Keep Down held and tap Attack for Belly Drop.' : 'Release Down and tap Attack to catch the rival on the deck.'],
        top:['Top perch','Next time hold Down from the apex until your paws clear the top.'],
        wing:['Side perch','You passed the top and caught the next perch. Keep Down held longer to reach the deck.'],
        deck:['Landed on the deck','Try an aerial as soon as you clear the side perch.'],
        aerial:[label + ' hit the rival','You passed both perches and attacked on the way down.'],
        other:['Hit from another angle','Try a falling aerial after passing both perches.'],
        missed:['Left the perches','Jump straight up from the chalk to try all three landings.'],
      }[e.outcome || drill.phase];
      if (feedback) {
        status.dataset.result = e.outcome || drill.phase;
        status.textContent = feedback[0];
        tip.textContent = feedback[1] + (e.outcome ? ' Choose Pick your landing to retry.' : '');
      }
      return;
    }
    if (world.platformPractice.pattern === 'shield-drop') {
      if (name === 'platformBlock') {
        status.dataset.result = 'guarded';
        status.textContent = 'Blocked ' + label;
        tip.textContent = 'Keep Shield held. Flick a lower diagonal and tap Attack.';
      } else if (name === 'platformDrop') {
        if (world.platformPractice.phase !== 'done') status.textContent = 'Through the platform';
      } else {
        const feedback = {
          counter: [label + ' caught the rival', 'Your aerial reached them before they could shield.'],
          intercept: [label + ' interrupted the jump', 'You reached them first. For the shield-drop counter, let their up air touch your shield.'],
          parried: ['Parried the rising aerial', 'You timed the shield release. Try holding Shield through the hit and dropping at the spark.'],
          guardedReply: ['Rival blocked ' + label, 'They got their shield up on landing. Start your drop at the block spark.'],
          held: ['Held the platform', 'You blocked the hit. Try dropping through at the spark to catch their landing.'],
          early: ['Left before the counter', 'Raise Shield, wait for the block spark, then flick down-left or down-right.'],
          tagged: [label + ' hit you', 'Hold Shield for the rising swing.'],
          landed: ['Landed below', 'Tap Attack with the diagonal or swing on the way down.'],
          missed: ['Opening passed', 'Keep Shield held and watch the rival rise from below.'],
        }[e.outcome];
        status.dataset.result = e.outcome;
        status.textContent = feedback[0];
        tip.textContent = feedback[1] + ' Choose Shield drop to retry.';
      }
      return;
    }
    if (world.platformPractice.defend) {
      const ferry = world.platformPractice.pattern === 'ferry';
      if (name === 'platformDrop') return;
      if (name === 'platformClimb') {
        status.textContent = ferry ? 'Watch their takeoff' : world.platformPractice.phase === 'wing' ? 'Rival on the right wing' : 'Watch the right wing';
        status.dataset.result = 'approach';
        return;
      }
      const feedback = {
        intercept: [label + ' caught the jump', ferry ? 'You hit the challenger before they boarded.' : 'You kept the high platform.'],
        guarded: ['Blocked ' + label, 'You shielded the rising aerial. Try meeting the next jump with an attack.'],
        parried: ['Parried the approach', 'Your shield release caught the incoming aerial.'],
        tagged: [label + ' got through', 'Their up air reaches through the floor. Shield or strike as they rise.'],
        claimed: [ferry ? 'Rival boarded' : 'Rival took the top', ferry ? 'Meet the jump on the approaching side of the ferry.' : 'Cover the right edge before the challenger lands.'],
        vacated: [ferry ? 'Back on the gate' : 'Left the high platform', ferry ? 'Time your drop to meet the rising dog.' : 'Meet the last jump from above the right wing.'],
        low: ['Caught the first jump', 'Let the rival reach the wing, then catch the jump toward the top.'],
      }[e.outcome];
      status.dataset.result = e.outcome;
      status.textContent = feedback[0];
      tip.textContent = feedback[1] + (ferry ? ' Choose Defend the ferry to retry.' : ' Choose Hold the top to retry.');
      return;
    }
    if (name === 'platformDrop') {
      status.textContent = 'Through the platform';
      status.dataset.result = 'fall';
      if (below) tip.textContent = 'Aim down and tap Attack while the other dog is still below you.';
      return;
    }
    status.dataset.result = e.outcome;
    status.textContent = {
      aerial: label + ' hit', tilt: label + ' hit', landed: 'Landed', left: 'Left the platform',
      stayed: 'Swing missed', other: 'Different hit',
    }[e.outcome];
    const result = {
      aerial: 'You caught the rival before your paws touched down.',
      tilt: 'You landed your low tilt and kept the platform.',
      landed: 'You passed through cleanly. Start your aerial a little earlier.',
      left: below ? 'Flick Down from the platform to set up the falling attack.' : 'Press Down and Attack together to stay on top.',
      stayed: below ? 'Your swing came out on top. Drop first, then attack below the platform.' : 'Stay within paw’s reach and tap Down + Attack.',
      other: below ? 'Try catching the rival with an aerial on the way down.' : 'Use your down tilt while both dogs are on the platform.',
    }[e.outcome];
    tip.textContent = result + ' Choose ' + (below ? 'Rival below' : 'Rival on top') + ' to retry.';
  }
  function crouchCounterPrompt(world) {
    const player = world.dogs[0];
    $('escape-status').dataset.result = 'ready';
    $('escape-status').textContent = 'Stamp Kick · ' + player.damage + '% start';
    return 'Tap Attack to cue Pip. Hold Down before the kick. Tap Attack at the spark for ' + moves[player.kit.tilts.down].label + '.';
  }
  function escapeFeedback(world, e) {
    const status = $('escape-status'), tip = $('recovery-tip');
    status.dataset.result = e.outcome || e.phase;
    const drill = world.escapePractice;
    if (drill.spacing === 'carry') {
      const release = (throws[drill.moveId]?.label || 'Throw') + ' · ' + (drill.distance || 0) + ' units carried';
      const feedback = {
        ready:['Pip at 85%','Tap Grab. Throw right from here, then try again with a shoulder carry.'],
        approach:['Bear Hug','When the grab connects, tap Special to lift Pip.'],
        gripped:['Lift or throw','Tap Right for an immediate throw. For a carry, tap Special and walk right to the gold stripe.'],
        carrying:['Pip on your shoulder','Hold Right. Tap Grab at the stripe to throw before Pip wriggles free.'],
        atMark:['At the stripe','Keep holding Right and tap Grab for Yard Heave.'],
        flight:[release,'Watch whether Pip can dodge back to the roof.'],
        returned:['Pip got back · ' + release,'Try carrying nearer the stripe before you throw.'],
        ringOut:['Ring-out · ' + release,'Retry with an immediate throw to compare Pip’s return.'],
        brokeFree:['Pip wriggled free','Watch the grip meter. Throw while there is still time.'],
        fell:['Lost your footing','Throw before you fall past the car.'],
        pummel:['Bear Squeeze','The hold timer keeps running. Tap Special to hoist or choose your throw.'],
        missedGrab:['Grab missed','Choose Shoulder carry and tap Grab from the starting mark.'],
        wrongGrip:['Pip got the grab','Choose Shoulder carry to reset.'],
      };
      [status.textContent,tip.textContent] = feedback[e.outcome || e.phase];
      return;
    }
    if (drill.gripDrill) {
      const holder = drill.spacing === 'gripThrow', captive = world.dogs[holder ? 1 : 0].stats.name;
      const throwName = throws[drill.moveId]?.label || 'Throw';
      const counts = (drill.pummels || 0) + ' pummel' + (drill.pummels === 1 ? '' : 's') + ' · ' +
        (drill.struggles || 0) + ' escape input' + (drill.struggles === 1 ? '' : 's');
      const feedback = {
        ready: holder ? ['Tap Grab', 'Catch the rival. Try throwing immediately, then retry and add pummels while they struggle.'] :
          ['Tap Attack to start', 'The rival will try two pummels and a throw. Once caught, rotate the stick, alternate directions, or tap buttons to escape.'],
        approach: [holder ? 'Reach for the rival' : 'Grab coming', holder ? 'Tap Attack to pummel once the grip closes.' : 'Wait for the paws to close, then start your escape inputs.'],
        gripped: [holder ? 'Pummel or throw' : 'Break the grip', holder ? 'Watch the hold meter. Tap a direction to throw before it empties.' :
          'Flick between directions or tap action buttons. Each fresh input takes a bite out of the hold meter.'],
        pummel: ['Pummel ' + e.count, holder ? 'Tap a direction now to throw, or tap Attack again and risk the escape.' :
          'You can keep struggling while the hit is frozen. Alternate directions or tap a button.'],
        brokeFree: [captive + ' broke free · ' + counts, holder ? 'Try committing to the throw one pummel earlier.' : 'Retry with the same inputs at a higher starting damage.'],
        throwLanded: [throwName + ' · ' + counts, holder ? 'Retry and see how many pummels you can add before the rival escapes.' :
          'Retry and start alternating directions as soon as the grab connects.'],
        missedGrab: ['Grab missed', 'Choose the drill again and stay within reach for the catch.'],
        wrongGrip: ['You caught the rival', 'Choose Escape a grab to take the defender’s side again.'],
      };
      [status.textContent,tip.textContent] = feedback[e.outcome || e.phase];
      return;
    }
    if (drill.spacing === 'counter' || drill.spacing === 'break') {
      const defend = drill.spacing === 'counter', low = moves[world.dogs[0].kit.tilts.down].label;
      const answer = moves[drill.answerMove] || specials[drill.answerMove] || smashes[drill.answerMove] || throws[drill.answerMove];
      const feedback = {
        windup: ['Watch Pip’s kick', 'Hold Down before Stamp Kick connects. Tap Attack at the paw spark to answer.'],
        plant: [defend ? 'Paws planted' : 'Rival held ground',
          defend ? 'Keep Down held and tap Attack for ' + low + '.' : 'Their low tilt is coming. Shield or move clear.'],
        stand: ['Kick launched you', 'Try crouching before the first hit connects.'],
        gripped: ['Crouch caught', 'Tap a direction to throw.'],
        punished: [(answer?.label || 'Counter') + ' punished the kick', 'Pip was still recovering when your counter hit.'],
        answered: ['You hit back', 'Your counter reached Pip after his kick recovered.'],
        first: ['You struck first', 'Let the kick reach your crouch, then answer at the spark.'],
        afterKick: ['Hit after the launch', 'Hold Down before contact to try answering with your paws planted.'],
        lifted: ['Crouch lifted', 'You softened the launch. At this percentage the kick can lift you off the floor.'],
        followHit: ['Pip landed the jab', 'Crouch before the kick and tap Attack at the first hit spark.'],
        held: ['Held your ground', 'Add a down tilt after the first impact to take your turn.'],
        away: ['Follow-up missed', 'Try holding Down before Stamp Kick reaches you.'],
        threw: ['Throw beat the crouch', 'The crouch gave the rival no protection against the throw.'],
        opened: ['Rival launched', 'Your hit took the rival off the floor.'],
        reversed: ['Rival hit back', 'Grab the crouch, use a stronger launcher, or strike from outside their low tilt.'],
        safe: ['Outside their counter', 'The rival stayed grounded. Your spacing kept their low tilt from connecting.'],
        blockedReply: ['Counter shielded', 'Your shield caught their low tilt.'],
        shieldedKick: ['Kick shielded', 'To try a crouch cancel, release Shield and hold Down before the kick.'],
        parriedKick: ['Kick parried', 'To try the low counter, hold Down before the kick and tap Attack at the spark.'],
        slipped: ['Rival escaped the grab', 'Choose a throw while your grip holds.'],
        noContact: ['No contact', 'Close the gap and try again.'],
      }[status.dataset.result];
      status.textContent = feedback[0];
      tip.textContent = feedback[1] + (e.outcome ? ' Choose ' + (defend ? 'Crouch counter' : 'Beat crouch') + ' to retry.' : '');
      return;
    }
    status.textContent = {
      windup: 'Watch the disc', follow: 'Flick left!', escaped: 'Second swing missed',
      caught: 'Both swings hit', missed: 'First swing missed', clear: 'Follow-up missed', interrupted: 'Swing interrupted',
    }[status.dataset.result];
    if (e.phase === 'windup')
      tip.textContent = 'Let the first swing hit. Tap left or flick the stick left when the spark appears.';
    if (!e.outcome) return;
    const result = {
      escaped: 'You shifted past the rim and took only the first 3%.',
      caught: e.outward > 0
        ? 'Your flick moved you. The second swing still reached from this spacing.'
        : 'The finisher caught you. Start with movement released, then flick left on the first spark.',
      clear: 'The finisher missed. Try a left flick during the first hit to practice the escape.',
      missed: 'The opening swing missed. Wait in place until Clover’s disc touches you.',
      interrupted: 'Clover lost the swing. Give her room to finish the first pass.',
    }[e.outcome];
    tip.textContent = result + ' Tap Attack to retry.';
  }
  function edgeFeedback(world, name, e) {
    const d = world.edgePractice, status = $('edge-status');
    if (d.phase === 'done' && name !== 'edgeResult') return;
    const move = (moves[e.moveId] || specials[e.moveId] || smashes[e.moveId] || throws[e.moveId] || grabs[e.moveId])?.label || 'Hit';
    status.dataset.result = e.outcome || name;
    if (d.corner) {
      const result = e.outcome || name;
      status.textContent = {
        cornerCue:d.samples?'Hold Shield through the hit':'Release Shield to parry', shieldSlip:'Pushed off · grab the lip or jump',
        caughtLip:'Pushed off · caught the ledge', backOnstage:'Pushed off · recovered onstage',
        pushedOff:'Lost the corner', heldCorner:'Blocked · kept your footing', parriedCorner:'Parried · held the corner',
        caught:'Hit by ' + move, interrupted:'Interrupted the swing', avoided:'Evaded the swing',
      }[result];
      if (e.outcome && d.samples) {
        const rows=Object.entries(d.samples).map(([kind,b])=>kind+' · '+b.energy+'% shield left, '+b.stunFrames+' frames of shieldstun, '+Math.round(b.slide)+' px of slide.');
        $('recovery-tip').textContent=(rows.length?rows.join(' ')+' ':'Hold Shield until the smash connects. ')+'Choose Compare shield strengths to repeat the same smash.';
      }else if (e.outcome) $('recovery-tip').textContent = 'Compare Block at lip and Block farther in. Repeat at the lip and release Shield as the chalk turns mint.';
      return;
    }
    if (name === 'ledge') {
      status.textContent = 'Catch at ' + e.f.damage + '% · ' + e.guardFrames + 'f protected';
    } else if (name === 'edgeOpen') {
      status.textContent = 'Grip marks gone · punish now';
    } else if (d.timeCatch && name === 'edgeResult') {
      const result = {
        timedHit: move + ' caught the hang', timedGrab: move + ' caught the hang',
        intercepted: move + ' intercepted the approach', rolledAway: 'Rival rolled to safety',
        tooEarly: 'Swing passed through · ' + d.earlyFrames + 'f of protection left',
        caught: 'Rival countered with ' + move, missed: 'Missed the recovery',
      }[e.outcome];
      status.textContent = result + (d.guardFrames ? ' · ' + d.guardFrames + 'f catch' : '');
      $('recovery-tip').textContent = 'Try the same swing after the other recovery, or raise Dummy damage and repeat.';
    } else if (name === 'edgeLand') {
      status.textContent = 'Landed · ' + Math.round(e.f.landingLag * 60) + 'f landing recovery';
    } else if (name === 'edgeCancel') {
      status.textContent = move + ' · ' + e.frames + 'f saved · airborne';
      $('recovery-tip').textContent = 'Aim Down and tap Attack now to catch the dog underneath.';
    } else if (name === 'teeter') {
      status.textContent = 'Balanced at the lip';
    } else if (name === 'edgeCue') {
      status.textContent = 'Rival let go · low tilt now';
    } else {
      status.textContent = {
        covered: move + ' caught the ledge jump', followup: move + ' connected · ' + d.frames + 'f saved',
        caught: 'Rival hit you with ' + move, claimed: 'You took the ledge', offstage: move + ' hit offstage',
        other: move + ' connected', settled: 'Landing recovery finished on the platform',
        overshot: 'Sailed past the platform', waited: 'Rival climbed onstage', missed: 'Rival slipped away',
      }[e.outcome];
      $('recovery-tip').textContent = d.pattern === 'lip' ? 'Retry Guard the ledge. Time Down + Attack as the rival lets go.' :
        'Compare Land at the tip and Land deeper with the same neutral aerial.';
    }
  }
  function shieldFeedback(world, name, e) {
    const result = $('shield-status');
    const tip = $('recovery-tip');
    if (e.pattern === 'crossup') {
      const kit = world.dogs[0].kit;
      const phase = e.outcome || e.phase;
      const back = world.shieldPractice.dir > 0 ? 'Left' : 'Right';
      const timing = ' · ' + e.landingFrames + 'f to spare';
      const feedback = {
        counter:['Blocked · watch Brisket’s paws', 'Keep your facing and watch which side he lands on.'],
        front:['In front · tap Attack', 'Keep holding Shield and tap Attack to grab him.'],
        behind:['Behind · jump and attack ' + back.toLowerCase(), 'Aim ' + back + ' and press Jump + Attack for ' + moves[kit.air.back].label + '. On touch, hold the direction and slide from Jump to Attack.'],
        punish:[grabs[kit.grab].label + timing, 'Tap Attack again to pummel, or choose a direction to throw.'],
        rearPunish:[moves[kit.air.back].label + timing, 'Your back air hit before Brisket could raise his shield.'],
        lateCatch:['Grab after recovery', 'Tap Attack as his front landing touches down.'],
        lateAir:['Back air after recovery', 'Jump and attack toward his rear landing a little sooner.'],
        whiffGrab:['Grab missed', 'A shield grab reaches ahead. Jump and strike back when Brisket crosses you.'],
        counterBlocked:['Brisket blocked', 'He had time to shield. Start your counter closer to touchdown.'],
        counterHit:['Counter connected', 'Try a shield grab in front or a back air behind.'],
        waited:['Brisket recovered', 'Retry and watch his landing before choosing your counter.'],
        parry:['Parried Belly Drop', 'Hold Shield through impact to practice the landing read.'],
        hit:['Belly Drop connected', 'Keep Shield raised until the hit lands.'],
        poked:['Shield poked', 'Hold a centered shield through the drop.'],
        break:['Shield broken', 'Retry with a fresh shield.'],
        interrupted:['Dive interrupted', 'Let the dive reach your shield to practice the counter.'],
      }[phase];
      if (feedback) {
        result.dataset.result = phase;
        [result.textContent,tip.textContent] = feedback;
      }
      return;
    }
    if (e.pattern === 'breakEscape' || e.pattern === 'breakPunish') {
      const defend = e.pattern === 'breakEscape';
      const finish = e.moveId && (smashes[e.moveId] || moves[e.moveId] || specials[e.moveId] || grabs[e.moveId])?.label;
      const timing = e.frames + 'f · ' + e.struggles + (e.struggles === 1 ? ' escape input' : ' escape inputs');
      result.dataset.result = e.phase;
      result.textContent = {
        pop:'Shield burst', dizzy:defend ? 'Dizzy · tap or flick' : 'Dizzy · release a strike',
        awake:'Woke in ' + timing, guarded:'Awake · blocked ' + (finish || 'the swing') + ' · ' + timing,
        clear:'Woke and escaped · ' + timing, lateHit:'Woke but got hit · ' + timing,
        punished:(finish || 'Hit') + ' caught the dizzy dog · ' + timing,
        grabbed:(finish || 'Grab') + ' caught the dizzy dog · ' + timing,
      }[e.phase];
      return;
    }
    if (e.pattern === 'dodgeTiming' && name === 'shieldCue') {
      result.dataset.result = e.phase;
      if (e.phase === 'sweep') {
        result.textContent = (e.dodge.wear ? 'Repeated' : 'Fresh') + ' dodge · protected ' +
          Math.round(e.dodge.safeFrom*60) + '–' + (Math.round(e.dodge.safeUntil*60)-1) + 'f';
      } else {
        result.textContent = e.phase === 'again' ? 'Dodged · repeat now' : 'Fresh again';
        tip.textContent = e.phase === 'again' ? 'Keep Shield held. Tap Down again now to test the shorter window, or wait for Fresh again.' :
          'Tap Down while shielding. Pip will sweep on the same beat as before.';
      }
      return;
    }
    if (world.shieldPractice.jumpIn) {
      if (name === 'shieldCue') {
        result.dataset.result = e.phase;
        result.textContent = e.phase === 'touchdown' ? 'Tap Grab' : 'Watch the jump';
        return;
      }
      const plan = world.shieldPractice.jumpIn;
      const answer = e.outcome === 'miss' ? (e.lastDodge === 'spotDodge' ? 'Spot-dodged' :
        e.lastDodge === 'shieldRoll' ? 'Rolled clear' : e.pattern === 'yourHop' ? 'No catch' : 'Escaped') : {
        block:'Blocked the aerial', parry:'Parried the aerial', grabbed:'Caught by the landing grab',
        interrupted:'Jump-in interrupted', hit:'Hit by the aerial', break:'Shield broken', poked:'Shield poked',
        landGrab:'Grabbed after touchdown', bufferedGrab:'Buffered landing grab', airGrab:'Grab started in the air',
        blockedAir:'Aerial hit the shield',
      }[e.outcome];
      result.dataset.result = e.outcome;
      result.textContent = answer;
      const advice = e.pattern === 'yourHop' ? (e.outcome === 'bufferedGrab' || e.outcome === 'landGrab'
        ? 'Tap a direction to throw.' : 'Hop beside the shield, then tap Grab as your paws reach the ground.') :
        plan.grab ? 'That was an empty hop. Spot-dodge as the paws reach for you, or jump clear.' :
        'That was a falling aerial. Hold Shield through the swing, or release just before impact to parry.';
      tip.textContent = advice + ' Choose Jump-in practice to retry.';
      return;
    }
    const aerial = e.pattern === 'kick' || e.pattern === 'drop';
    const dummy = world.dogs[1];
    const attackName =
      e.pattern === 'low' ? 'Tail Broom' : e.pattern === 'high' ? 'Slip Lead' :
      aerial ? moves[dummy.kit.air[e.pattern === 'kick' ? 'forward' : 'down']].label
        : (e.pattern === 'grab' || e.pattern === 'counterGrab') ? grabs[dummy.kit.grab].label : smashes[dummy.kit.smashes.side].label;
    if (name === 'shieldCue') {
      result.dataset.result = e.phase;
      if (e.pattern === 'counterGrab') {
        result.textContent = e.phase === 'counterTap' ? 'Rise · tap Attack' :
          e.phase === 'windup' ? attackName + ' coming' : attackName + ' · dodge';
        if (e.phase === 'counterTap') tip.textContent = 'Center the stick and tap Attack for a jab, or aim a tilt. You can keep Shield held.';
        return;
      }
      result.textContent = e.phase === 'counter' ? 'Blocked · tap Grab' : e.phase === 'windup' ? attackName + ' coming' : attackName;
      if (e.phase === 'windup' && (e.pattern === 'low' || e.pattern === 'high'))
        tip.textContent = e.pattern === 'low' ? 'Cover the paws. Hold Shield and gently aim down.' : 'Cover the ears. Hold Shield and aim up.';
      return;
    }
    result.dataset.result = e.outcome;
    const feedback = {
      spotPunish: ['Dodge counter · ' + e.landingFrames + 'f left', 'Your strike caught the missed grab. The frame count shows how long the rival still needed to recover.'],
      dodgeClipped: ['Pip caught the repeat', 'The final frame of Dewclaw caught your paws. Retry and wait for Fresh again before your second dodge.'],
      freshClear: ['Both sweeps missed', 'You recovered the full dodge window before the second sweep. Retry and dodge again immediately to compare.'],
      wornClear: ['Cleared the sweep', 'The second dodge had a shorter window. Repeat from the same spot to compare the timing.'],
      ordinaryPunish: ['Grab punished', 'Your strike landed after your dodge finished. Tap Attack while your dog is still rising to counter sooner.'],
      counterBlocked: ['Rival shielded', 'The grab recovered before your hit reached them. Try a quicker strike or start the dodge earlier.'],
      parry: ['Parry', 'Shield released on time. After a melee parry, tap Attack to counter.'],
      block: e.pattern === 'low' || e.pattern === 'high'
        ? ['Covered the ' + (e.pattern === 'low' ? 'paws' : 'ears'), 'The bubble intercepted ' + attackName + '.']
        : ['Blocked', 'You held Shield through contact. Try releasing it just before the hit.'],
      poked: ['Shield poked', 'The attack reached your dog outside the bubble. Hold Shield and gently aim toward the hit.'],
      found: ['Found the opening', 'Your hit reached the dog outside the bubble. Try the same swing against a fresh shield.'],
      sealed: ['Shield held', 'The bubble caught your attack. Aim for the exposed paws with a down tilt.'],
      brokeGuard: ['Shield broken', 'Your attack depleted the bubble. A low poke can deal damage while the rival still has shield left.'],
      caughtGuard: ['Guard grabbed', 'Your grab reached the rival through the shield. Tap a direction to throw.'],
      hitOpen: ['Guard down', 'Your attack reached the rival after the shield dropped. Retry to catch their exposed paws.'],
      woreOut: ['Shield ran out', 'Choose Poke their shield to retry and catch the paws before the bubble breaks.'],
      break: ['Shield broken', 'Choose the matchup again to start with a fresh shield.'],
      hit: ['Hit', aerial ? 'Keep Shield held until the aerial lands. Tap Grab when the shield flashes.' : 'Try holding Shield through the windup, then release as the strike reaches you.'],
      grabbed: ['Grabbed', 'Hold Shield, then tap Down just before the grab reaches you.'],
      interrupted: ['Interrupted', 'You caught the dummy first. Choose the same matchup to retry.'],
      spaced: ['Out of reach', 'Pip dashed clear. At its closest, Disc Hook fell short by ' + e.gap + ' game pixels. Try the same grab against Belly Drop.'],
      punish: ['Grab punish', dummy.stats.name + ' had ' + e.landingFrames + (e.landingFrames === 1 ? ' frame' : ' frames') + ' of landing recovery left when Disc Hook caught him. Aim to throw.'],
      lateCatch: ['Grab landed late', dummy.stats.name + ' had time to act before Disc Hook landed. Tap Grab as the shield flashes.'],
      late: ['Grab missed', dummy.stats.name + ' escaped the grab. Try tapping Grab as the shield flashes.'],
      waited: ['No punish', 'Choose the matchup again. Keep Shield held and tap Grab when the hit lands.'],
      counterHit: ['Counter landed', 'Your counter connected. Choose the same matchup to try Disc Hook.'],
      miss: [
        e.lastDodge === 'shieldRoll'
          ? 'Rolled clear'
          : e.lastDodge === 'spotDodge'
            ? 'Spot-dodged'
            : 'Missed',
        'Choose the same matchup to try another exchange.',
      ],
    };
    [result.textContent, tip.textContent] = feedback[e.outcome];
    if (e.pattern === 'low' || e.pattern === 'high') tip.textContent += ' Release Shield and raise it again to retry.';
  }
  function wallFeedback(world, name, event) {
    const status = $('wall-status');
    const d = world.wallPractice;
    if (d.spring) {
      const back=d.inward<0?'left':'right';
      const line={
        wallCue:['swing','Watch Pip’s heel','His back paw will send you into the brickwork.'],
        hit:['flight','Back Heel · tap Shield','Tap Shield to catch the wall. Keep Jump released to plant your paws.'],
        wallTech:['wallTech','Paws planted','Tap Jump during the brace to kick away.'],
        wallChoice:['choice','Choose your exit','Tap Jump to spring up, or tap Attack to stay against the wall.'],
        wallStay:['stayed','Stayed low','Use Up + Special to reach for the lip with Ledge Lasso.'],
        wallTechJump:['wallTechJump',event.delay?'Sprang on frame '+event.delay:'Sprang at impact','Steer '+back+' toward the roof. Use Up + Special to catch the lip.'],
        wallBounce:['wallBounce','Missed the brace','Retry kick and tap Shield when the heel hits.'],
        ledge:['returned','Caught the ledge','Switch wall to try the other side, or turn off Guided timing for match speed.']
      }[name];
      if(line && (name!=='hit' || d.phase==='flight'))[status.dataset.result,status.textContent,$('recovery-tip').textContent]=line;
      return;
    }
    if (d.ceiling) {
      const away = d.side === 'left' ? 'left' : 'right';
      const feedback = {
        wallCue:['swing','Watch Pip’s Flip Kick'],
        hit:['flight','Flip Kick · tap Shield'],
        ceilingBounce:['ceilingBounce','Missed tech · bounced down'],
        ceilingTech:['ceilingTech','Ceiling tech · air jump saved'],
        ledge:['returned','Caught the ledge'],
      }[name];
      if (feedback) {
        status.dataset.result = feedback[0];
        status.textContent = feedback[1];
        if (name === 'ceilingTech') $('recovery-tip').textContent = 'Steer ' + away + ' past the lip, then use Up + Special to hook it.';
        if (name === 'ceilingBounce') $('recovery-tip').textContent = 'Choose Retry kick. Tap Shield at the hit spark before your head reaches the table.';
        if (name === 'ledge') $('recovery-tip').textContent = 'You made it back. Choose Switch wall to try the other edge.';
      }
      return;
    }
    if (d.runner) {
      if (name === 'wallKick') {
        status.dataset.result = 'kick';
        status.textContent = world.dogs[0].jumps ? 'Wall jump · air jump saved' : 'Wall jump · air jump already spent';
      } else if (name === 'wallReturn') {
        status.dataset.result = d.outcome;
        const landing = d.route === 'platform' ? 'Landed on a platform' :
          (d.route === 'ledge' ? 'Caught ' : 'Landed on ') + (d.crossed ? 'far roof' : 'near roof');
        status.textContent = d.route === 'out' ? 'Missed the roofs' : landing + ' · ' +
          (d.jumps ? 'air jump saved' : 'air jump spent');
      }
      return;
    }
    if (world.wallPractice.phase === 'done' && status.dataset.result !== 'flight') return;
    if (name === 'wallBounce' && event.hard) {
      status.dataset.result = 'hardImpact';
      status.textContent = 'Too fast to tech · ' + Math.round(event.speed) + ' px/s';
      $('recovery-tip').textContent = 'Retry kick. Hold Up as the heel hits and tap Shield. A shallower hit can be teched.';
      return;
    }
    const feedback = {
      wallCue: [
        'swing',
        'Watch Pip’s heel',
        'Tap Shield as the kick connects. Hold Jump at the wall to spring away.',
      ],
      hit: ['flight', 'Back Heel · tap Shield', 'Tap Shield now. Keep Jump held for a wall-tech jump.'],
      wallTech: [
        'wallTech',
        'Wall tech',
        'You stopped at the brickwork. Jump or use Up + Special to reach the roof.',
      ],
      wallTechJump: [
        'wallTechJump',
        'Wall-tech jump',
        'You kicked away and kept your air jump. Steer toward the lip to recover.',
      ],
      wallBounce: [
        'wallBounce',
        'Missed tech',
        'The wall bounced you back. Retry and tap Shield when Back Heel connects.',
      ],
    };
    if (!feedback[name] || (name === 'hit' && world.wallPractice.phase !== 'flight')) return;
    [status.dataset.result, status.textContent, $('recovery-tip').textContent] = feedback[name];
    if (d.heavy && name === 'hit') $('recovery-tip').textContent = 'Hold Up through the hit freeze to soften the impact. Tap Shield before the wall.';
    if (d.heavy && d.phase === 'done') status.textContent += ' · ' + Math.round(d.speed) + ' px/s';
  }
  const techResponses={mix:'Rival mix',stay:'In place',away:'Roll away',through:'Roll through'};
  function chaseFeedback(world, name, e) {
    const d = world.chasePractice, status = $('launch-status'), tip = $('recovery-tip');
    if(d.role==='readTech'){
      const state=e.outcome || e.phase;
      const notes={
        fall:['Watch the landing','Stay near the landing spot. Read the direction at contact.'],
        getup:[techResponses[d.choice],'Move to where their paws will settle. Start your attack before the roll ends.'],
        opening:['Recovery open','A quick low hit or a grab can catch them now.'],
        caught:['Hit the recovery','Your hit landed before the rival could act.'],
        grabPunish:['Grabbed the recovery','You caught their landing. Choose a direction to throw.'],
        early:['Caught them airborne','Let them touch down to practice a grounded punish.'],
        escaped:['Rival recovered','Try starting your swing earlier, or turning to cover the other side.'],
        away:['Left the landing','Stay near the rival as they touch down.']
      };
      const note=notes[state];
      if(!note)return;
      status.dataset.result=state;
      const tally=d.phase==='done' && d.response==='mix'?' · '+d.caught+'/'+d.tries+' reads':'';
      status.textContent=note[0]+tally;
      tip.textContent=note[1]+(d.phase==='done'?' Choose Read the tech to retry.':'');
      return;
    }
    const attack = d.role === 'attack';
    if (d.bait) {
      const rival = world.dogs[d.slot], move = moves[rival.kit.floorAttack];
      const feedback = {
        fall:['Watch the landing', 'Stay close and watch which way the rival faces.'],
        down:['Rival knocked down', 'Hold Shield to block the sweep, or step outside its reach.'],
        getup:[move.label, move.hint],
        sweepBlock:['Blocked ' + move.label, 'Tap Grab out of shield before the rival stands.'],
        sweepParry:['Parried ' + move.label, 'Their swing stopped. Tap Attack or Grab to punish.'],
        sweep:[move.label + ' hit you', 'Try shielding the swing, then grabbing as the rival gets up.'],
        grabPunish:['Grabbed the recovery', 'Tap Attack to pummel or choose a direction to throw.'],
        punished:['Hit the get-up', 'Your attack landed before the rival could act again.'],
        interrupted:['Hit before the swing', 'Let the rival begin their get-up attack to practice the punish.'],
        heldGuard:['Blocked, rival stood up', 'Tap Grab when the sweep hits your shield.'],
        lateGrab:['Rival recovered before the grab', 'Try parrying the sweep, then jab during the opening.'],
        escaped:['Rival stood up', 'Stay close enough to hit or grab during the recovery.'],
        away:['Left the setup', 'Choose Bait the get-up to retry.'],
      };
      const state = e.outcome || e.phase;
      status.dataset.result = state;
      [status.textContent, tip.textContent] = feedback[state];
      if (d.contactFrame && ['sweep','sweepBlock','sweepParry'].includes(state))
        status.textContent += ' · frame ' + d.contactFrame + ' ' + d.contactSide;
      return;
    }
    if (name === 'chaseCue') {
      status.dataset.result = e.phase;
      if (e.phase === 'fall') status.textContent = attack ? 'Watch the landing' : 'Tap Shield before landing';
      if (e.phase === 'down') status.textContent = attack ? 'Down · tap Attack' : 'Missed tech';
      if (e.phase === 'locked') {
        status.textContent = e.locks === 1 ? 'First jab lock' : 'Second jab lock';
        tip.textContent = attack
          ? e.locks === 1 ? 'Tap Attack again after the paw retracts, or start your finisher.' : 'Tap Down + Smash now to finish.'
          : 'As the bounce settles, tap a side to roll or tap Attack to sweep.';
      }
      if (e.phase === 'getup') {
        status.textContent = e.type === 'getupRoll' ? 'Rolling away' : 'Getting up';
        if (attack && e.type === 'getupRoll') tip.textContent = 'Follow the roll and catch the rival as their paws come down.';
      }
      return;
    }
    const messages = {
      finish: ['Finisher landed', d.locks + (d.locks === 1 ? ' lock' : ' locks') + ' into the finisher.'],
      third: ['Third jab launched', 'A third jab sends the rival airborne. Try a stronger hit after the second.'],
      early: ['Hit before landing', 'Watch for the dust from the landing before you jab.'],
      launched: ['Launched off the floor', 'A quick tap of neutral Attack starts the lock.'],
      escaped: [attack ? 'Rival got away' : 'Escaped', attack ? 'The rival finished getting up. Jab as they touch down.' : 'The jab missed your get-up.'],
      caught: [attack ? 'Caught the get-up' : 'Caught getting up', attack ? 'Your hit landed before the rival could act again.' : 'Try a roll away or sweep as your dog settles.'],
      sweep: [attack ? 'Hit by a sweep' : 'Get-up sweep landed', 'The get-up attack reached the waiting chaser.'],
      tech: ['Tech in place', 'Your Shield press recovered the landing before the jab.'],
      techRoll: ['Tech roll', 'You rolled out as you touched the floor.'],
      away: ['Left the setup', 'Choose the drill again to return to the landing.'],
    };
    const [label, message] = messages[e.outcome];
    const success = attack ? ['finish','caught'].includes(e.outcome) : ['tech','techRoll','escaped','sweep'].includes(e.outcome);
    status.dataset.result = success ? 'clear' : e.outcome;
    status.textContent = label;
    tip.textContent = message + ' Choose ' + (attack ? 'Jab lock' : 'Escape the lock') + ' to retry.';
  }
  function survivalFeedback(world, name, e) {
    const d = world.survivalPractice, status = $('launch-status'), tip = $('recovery-tip');
    const inward = d.dir > 0 ? 'left' : 'right', move = throws[d.moveId].label;
    const aim = d.moveId === 'cloverForehandPass' ? 'Hold Down to slow the low throw' : 'Hold Up + ' + inward + ' to bend the throw higher';
    let label, message;
    if (name === 'survivalReady' || name === 'survivalStart') {
      label = name === 'survivalReady' ? 'Tap Attack to start' : move;
      message = name === 'survivalReady' && d.study ? 'Tap Attack to take the throw. At impact, change your aim to compare the paths, then tap Attack to launch.' :
        name === 'survivalReady' && d.pattern === 'lastStock' ? 'Take the throw once with the stick centered. Retry and change direction during the last-stock impact.' :
        name === 'survivalReady' ? 'Take ' + move + ' with the stick centered. Tap Attack to retry from the same mark.' :
        aim + ' at the hit spark. Then steer ' + inward + ' toward the ledge.';
    } else if (name === 'survivalAim') {
      const path = d.preview.path;
      label = path.zone ? 'Crosses ' + path.zone + ' boundary in ' + path.ticks + 'f' :
        path.contact ? 'Reaches the ' + path.contact + ' in ' + path.ticks + 'f' : 'Control returns inside the boundary';
      message = 'Change your stick direction to redraw the path. Tap Attack to commit that angle, then steer back toward the stage.';
    } else if (name === 'blastThreat') {
      label = e.finalHit ? 'Last stock · steer now' : 'Blast line · aim now';
      if (e.finalHit) message = aim + ' before the hit releases. The mint arrow shows your launch.';
    } else if (name === 'launchDI') {
      label = Math.round(e.scale * 100) + '% speed · ' + Math.round(Math.abs(e.angle) * 180 / Math.PI) + '° turn';
      message = 'At the mint arrow, aim up-' + inward + ' and tap Shield. Jump toward the ledge and use Up + Special if you need more height.';
      if (d.releaseZone !== undefined) label += d.releaseZone ? ' · on course for the ' + d.releaseZone + ' line' : ' · room to recover';
    } else if (name === 'survivalBuffer') {
      label = 'Shield + up-' + inward;
    } else if (name === 'survivalFree') {
      label = 'Recover to the ledge';
    } else if (name === 'survivalResult') {
      label = { ko: 'Ring-out', ledge: 'Caught the ledge', land: 'Back onstage', miss: 'Missed grab' }[e.outcome];
      message = e.outcome === 'ko' ? (d.free ? 'You survived the throw. Try dodging inward sooner, then use your recovery.' :
        aim + ' during the freeze.') : e.outcome === 'miss' ? 'The rival missed the setup.' :
        'Your launch was ' + Math.round(d.scale * 100) + '% speed. The gold trail on a retry marks your last flight.';
      message += ' Tap Attack to retry.';
    } else return;
    status.dataset.result = e.outcome || name;
    status.textContent = label;
    if (message) tip.textContent = message;
  }
  function stockFeedback(world, name, e) {
    const d = world.stockPractice, status = $('launch-status'), tip = $('recovery-tip');
    let label, message;
    if (name === 'stockStart') {
      label = 'Lift arriving';
      message = d.slot ? 'Face the landing. Time your grab as the last mail tag goes out.' :
        'Tap Down when the lamps turn mint, or stay aboard and let the lift drop you.';
    } else if (name === 'stockReady') {
      label = d.slot ? 'Watch the mail tags' : 'Lift ready';
    } else if (name === 'stockLeave') {
      label = 'Protected · ' + e.frames + ' frames';
    } else if (name === 'stockOpen') {
      label = 'Open to a grab';
    } else if (name === 'stockResult') {
      [label, message] = {
        protected: ['Grab passed through', 'You landed with protection. Try staying on the lift until it drops you.'],
        caught: ['Caught on landing', 'The last tag expired before the grab. Leave earlier or jump over the rival.'],
        clear: ['Clear of the grab', 'Their paws missed you. Try dropping straight onto the landing.'],
        hit: ['Hit the guard', 'You struck the rival during your return.'],
        timed: ['Grab timed', 'Your grab became active after the last tag went out.'],
        early: ['Still protected', 'Your grab reached the dog while a tag was lit. Try grabbing later.'],
        miss: ['Out of reach', 'Face the landing and let the dog reach paw height before grabbing.'],
        timeout: ['Landing uncontested', 'Try a grab when the last tag goes out.'],
        ko: ['Lost the stock', 'Aim back toward the landing.'],
      }[e.outcome];
      message += ' Tap Attack to retry.';
    } else return;
    status.dataset.result = e.outcome || name;
    status.textContent = label;
    if (message) tip.textContent = message;
  }
  function meteorFeedback(world, name, e) {
    const d = world.meteorPractice, floor = d.pattern === 'spikeFloor', status = $('launch-status'), tip = $('recovery-tip');
    if (d.phase === 'done' && name !== 'meteorResult') return;
    let label, message;
    if (name === 'meteorReady' || name === 'meteorStart') {
      label = name === 'meteorReady' ? 'Tap Attack to start' : 'Pogo Paw incoming';
      message = floor ? 'Pip will spike you toward the platform. Take the hit, then tap Shield before your paws touch down.' :
        'Pip will spike you past the ledge. When the gold streaks turn mint, tap Jump or Up + Special and steer toward the stage.';
    } else if (name === 'hit' && e.meteor) {
      label = floor ? 'Tap Shield before landing' : 'Falling · wait for mint';
    } else if (name === 'meteorWindow') label = 'Jump or Up + Special';
    else if (name === 'meteorCancel') {
      label = e.option === 'jump' ? 'Jump spent' : 'Up Special spent';
      message = 'Steer ' + (d.dir > 0 ? 'left' : 'right') + ' toward the ledge to save the stock.';
    } else if (name === 'meteorResult') {
      const outcomes = {
        tech: ['Teched in place', 'Your paws met the platform and you stopped the rebound.'],
        techRoll: ['Tech roll', 'You crossed the landing before the attacker could chase the bounce.'],
        bounce: ['Meteor bounce', 'The platform sent you back up. Try Shield at the hit spark, with a side to roll.'],
        hardImpact: ['Too fast to tech · ' + Math.round(d.hardSpeed) + ' px/s', 'Hold ' +
          (d.dir > 0 ? 'Right' : 'Left') + ' through the hit freeze and tap Shield to try a shallower landing.'],
        saved: ['Saved the stock', 'Your ' + (d.cancel === 'jump' ? 'jump' : 'Up Special') + ' broke the spike and you reached the stage.'],
        returned: ['Back onstage', 'You reached safety after the launch.'],
        ko: ['Ring-out', 'Tap a fresh Jump or Up + Special at the mint marks. Keep steering toward the ledge.'],
        weak: ['Light hit', 'Pogo Paw clipped you. Try 100% for a meteor.'],
        avoided: ['Avoided the spike', 'Take the opening hit to practice the response.'],
      };
      [label, message] = outcomes[e.outcome];
      message += ' Tap Attack to retry.';
    } else return;
    status.dataset.result = e.outcome || name;
    status.textContent = label;
    if (message) tip.textContent = message;
  }
  function launchFeedback(world, name, e) {
    const result = $('launch-status'),
      tip = $('recovery-tip');
    let label, message;
    if (world.launchPractice.pattern === 'breakaway') {
      const d=world.launchPractice;
      if (name==='breakawayWindow') {
        result.dataset.result='window';
        result.textContent='Orbit or air dodge';
        tip.textContent=(d.pauseAtWindow?'Paused. ':'')+'Tap Attack to swing, Shield to dodge' +
          (d.pauseAtWindow?', or Jump to watch Pip’s kick.':'.');
      } else if (name==='hitstunCancel') {
        result.dataset.result=e.option;
        result.textContent=(e.option==='aerial'?moves[e.moveId].label:'Air dodge')+' · '+e.frames+'f early';
      } else if (name==='breakawayResult') {
        result.dataset.result=e.outcome;
        result.textContent={counter:(moves[e.moveId]?.label || 'Aerial')+' interrupted the kick',evaded:'Dodged the kick',
          caughtDodge:'Pip caught the dodge recovery',caught:'Flying Kick connected',clear:'Pip missed',otherHit:'Counterhit'}[e.outcome] +
          (d.saved?' · acted '+d.saved+'f early':'');
        tip.textContent=d.late?'Pip waited before kicking. Retry and watch where each dog will land.':
          'Choose Late kick and try the same response. Pip can catch your dodge as its protection ends.';
      }
      return;
    } else if (world.launchPractice.pattern === 'juggle') {
      const d = world.launchPractice, side = d.dir > 0 ? 'right' : 'left';
      if (d.phase === 'done' && name !== 'juggleResult') return;
      if (name === 'launchDI') {
        label = 'Thrown · release the direction';
        message = d.chase ? 'Brisket is running ' + side + ' to cover your drift. Watch for the opening.' :
          'Wait for the mint arrow. Brisket is stepping under your landing.';
      } else if (name === 'juggleCue') {
        label = d.chase ? 'Choose your drift now' : 'Flick ' + side + ' now';
        message = d.chase ? 'Try the same drift, then retry and cut back behind Brisket.' :
          'Press ' + side + ' from neutral and hold to drift past Crown Lift.';
      } else if (name === 'tumbleWiggle') {
        label = 'Tumble broken · drift free';
        message = 'Keep steering. You can still jump, air dodge, fast-fall or attack.';
      } else if (name === 'juggleResult') {
        label = { clean:'Clean landing · jump and dodge saved', juggled:(moves[d.finisher]?.label || 'Brisket') + ' caught you', downed:'Knocked down',
          landed:'Landed on your feet', counter:'Counterhit', tech:'Teched the landing', ledge:'Caught the ledge', out:'Ring-out' }[e.outcome];
        message = d.chase ? 'Retry and reverse your drift as Brisket runs out. He has to commit to the chase.' :
          'Choose Chase the drift to see how Brisket can cover the same escape.';
      } else return;
      result.dataset.result = e.outcome || name;
      result.textContent = label;
      tip.textContent = message;
      return;
    } else if (name === 'launchDI') {
      label = 'Tap Shield before landing';
      message =
        'The dashed gold line shows the original launch. The solid aqua line shows yours. Hold a side at landing to tech roll.';
    } else if (name === 'tech') {
      label = e.dir ? 'Tech roll ' + (e.dir < 0 ? 'left' : 'right') : 'Tech in place';
      message = 'Clean landing. Choose Launch practice to try the same throw again.';
    } else if (name === 'knockdown') {
      label = 'Missed tech';
      message = 'Tap Attack to sweep, tap a side to roll, or tap Up or Jump to stand.';
    } else if (name === 'getup') {
      label =
        e.type === 'floorAttack'
          ? moves[e.f.kit.floorAttack].label
          : e.dir
            ? 'Get-up roll ' + (e.dir < 0 ? 'left' : 'right')
            : 'Stand up';
      message = 'Choose Launch practice to retry. Tap Shield shortly before your paws touch down.';
    } else if (name === 'tumbleEscape' || name === 'ko') {
      label = name === 'ko' ? 'Ring-out' : e.option;
      message = 'Choose Launch practice to take the throw again.';
    } else return;
    result.dataset.result = name;
    result.textContent = label;
    tip.textContent = message;
  }
  function airFeedback(world, name, e) {
    const result = $('air-status');
    if (e.pattern === 'highReturn') {
      const phase = name === 'airStart' ? 'approach' : e.phase || e.outcome;
      const guard = world.dogs[1];
      result.dataset.result = phase;
      result.textContent = {approach:'Returning high',takeoff:guard.stats.name+' jumps out',clipped:'Clipped · keep recovering',
        counterHit:'Counter hit · reach the stage',clean:'Clean return',saved:'Recovered after the hit',
        counter:'Countered and recovered',miss:'Stock lost'}[phase];
      if (phase === 'takeoff') $('recovery-tip').textContent = 'Jump over '+moves[guard.kit.air.forward].label+' or dodge through it. Steer back to the stage.';
      if (phase === 'clipped') $('recovery-tip').textContent = 'Steer toward the lip. Use your remaining jump or Up Special as soon as you can act.';
      if (name === 'airResult') $('recovery-tip').textContent = 'Choose Beat the edgeguard to retry, or take this opening into a three-stock fight.';
      return;
    }
    if (e.pattern === 'interrupted') {
      const phase = name === 'airStart' ? 'approach' : e.phase || e.outcome;
      const move = specials[world.dogs[0].kit.specials.up].label;
      result.dataset.result = phase;
      result.textContent = {approach:'Noodle is covering the ledge',clipped:'Knot Poke · Up Special restored',
        cast:'Cast again now',return:move + ' · second attempt',saved:'Recovered after the hit',
        returned:'Back onstage',miss:'Stock lost',hit:'Grabbed',interrupted:'Guard caught'}[phase];
      if (phase === 'cast') $('recovery-tip').textContent = 'Aim up toward the stage and press Special again for ' + move + '.';
      if (phase === 'miss') $('recovery-tip').textContent = 'Choose Interrupted return to retry. Release Special after your first cast so you can press it again.';
      return;
    }
    if (e.pattern === 'lastDodge') {
      if (name === 'airStart') {
        result.dataset.result = 'approach';
        result.textContent = 'Returning';
      } else {
        result.dataset.result = e.outcome;
        result.textContent = {ledge:'Caught the ledge',land:'Back onstage',miss:'Fell short'}[e.outcome];
        $('recovery-tip').textContent = e.outcome === 'miss' ? (world.airPractice.wide ?
          'Aim straight inward for the full horizontal distance. Choose Last dodge to retry.' :
          'Aim up and inward together, then tap Shield. Choose Last dodge to retry.') :
          'Try the other starting point, or guard this ledge against Rival in a stock match.';
      }
      return;
    }
    if (name === 'airStart') {
      result.dataset.result = 'approach';
      result.textContent = e.pattern === 'edge' ? 'Guard at the ledge' : 'Watch your landing';
      return;
    }
    if (name === 'airCue') {
      result.dataset.result = 'swing';
      result.textContent = moves[e.moveId].label;
      return;
    }
    result.dataset.result = e.outcome;
    const labels = {
      evade: e.evaded === 'neutralAirDodge' ? 'Dodged in place' : 'Dodged the strike',
      ledge: 'Caught the ledge',
      land: 'Back onstage',
      hit: 'Hit',
      interrupted: 'Interrupted',
      miss: 'Missed',
    };
    result.textContent = labels[e.outcome];
    if (e.outcome === 'hit')
      $('recovery-tip').textContent =
        e.pattern === 'neutral'
          ? 'Tap Shield before the up tilt reaches you. Choose In place to try again.'
          : 'Start your dodge as the guard winds up. Choose At the ledge to retry.';
    else if (e.outcome === 'ledge' || e.outcome === 'land')
      $('recovery-tip').textContent =
        (e.evaded ? 'You slipped the guard’s strike. ' : '') +
        (e.outcome === 'ledge'
          ? 'Tap Shield again to roll onstage, or tap Attack.'
          : 'Choose At the ledge to retry, or switch sides.');
    else $('recovery-tip').textContent = 'Choose In place or At the ledge to try another approach.';
  }
  function rollFeedback(world, name, e, practiceFight) {
    const result = $('roll-status');
    const drill=world.rollPractice;
    if(drill.pattern==='scout'){
      const count=drill.rollHabit?.count || 0;
      const words={observed:'Roll observed',caught:'Caught by the grab',baited:'Grab missed',hit:'Guard landed a hit',
        counter:'You hit the guard',clear:'Exchange ended'};
      result.dataset.result=name==='ledgeRoll'?'active':e.outcome;
      result.textContent=(name==='ledgeRoll'?'Rolling':words[e.outcome])+' · '+count+'/2 rolls';
      if(name!=='ledgeRoll'){
        $('recovery-tip').textContent=drill.rollForecast?'The guard committed to your usual timing. Choose Next catch to try a different exit.':
          count===2?'The guard has seen two rolls. Choose Next catch and watch where the guard faces.':'Choose Next catch. Roll twice in a row to teach the guard your timing.';
        $('roll-fight').hidden=count!==2 || !!practiceFight;
      }
      return;
    }
    if (name === 'ledgeRoll') {
      result.dataset.result = 'active';
      result.textContent = world.rollPractice.pattern === 'read' ? 'Watch for the grab' : 'Swing at the lip';
      return;
    }
    const labels = {
      passed: 'Past the guard',
      counter: 'Counter connected',
      caught: world.rollPractice.rolled ? 'Roll caught' : 'Grabbed',
      hit: 'Hit',
      clear: 'Guard missed',
    };
    result.dataset.result = e.outcome;
    result.textContent = labels[e.outcome];
    const tips = {
      passed: e.evaded
        ? 'You rolled through the swing. Try Attack as your dog turns back.'
        : 'You cleared the guard. Choose Read the roll to face a waiting grab.',
      counter: 'Your follow-up connected. Choose Close guard to try the timing again.',
      caught: world.rollPractice.rolled
        ? 'The guard waited at the end of your roll. Try jumping from the same ledge.'
        : 'The guard caught you. Choose the same pattern to try another ledge option.',
      hit: 'The strike caught you. Choose Close guard and tap Shield from the ledge.',
      clear: 'The guard missed. Choose either pattern to try another ledge option.',
    };
    $('recovery-tip').textContent = tips[e.outcome];
  }
  function trumpFeedback(world, name, e) {
    const drill = world.trumpPractice;
    const player = world.dogs[0];
    const status = $('trump-status');
    if (drill.guardSlot!==undefined) {
      if (name!=='runoffCue') return;
      const defend=drill.guardSlot===1, guard=world.dogs[drill.guardSlot], move=moves[guard.kit.air.back].label;
      const outward=drill.side, inward=outward==='left'?'right':'left';
      const lines={
        go:defend ? ['Rival is running','Roll or jump before the other dog catches your ledge.'] :
          ['Dash '+outward,'Run off the lip. Steer '+inward+' as you fall to take the ledge.'],
        turn:['Steer '+inward,'Release '+outward+' and steer toward the stage to take the occupied ledge.'],
        bump:defend ? ['Bumped off','Steer '+inward+'. Try to recover after the back air.'] :
          ['Ledge taken','Press Down + Jump together, then aim '+outward+' and tap Attack.'],
        aim:['Aim '+outward+' · Attack','Release Down, hold '+outward+' and press Attack. Steer '+inward+' during the swing.'],
        backAir:[move+' hit',defend?'Steer '+inward+' and use your recovery.':'Steer '+inward+' to land on the stage.'],
        landed:[defend?'Rival landed the follow-up':move+' · back onstage',defend?'Retry and tap Shield as Rival runs toward you.':'Try the opposite ledge, then turn off half speed.'],
        escaped:[defend?'Escaped the run-off':'The rival got away','A roll or jump can clear the lip before it changes hands.'],
        empty:['Ledge taken · no follow-up','Aim away from the stage and tap Attack immediately after the drop jump.'],
        fell:[defend?'Rival fell':'Lost the stock','Steer back toward the deck as soon as the back air starts.'],
        holderLost:[defend?'Lost the stock':'Rival fell before the back air','Retry to play the exchange again.'],
        stranded:['Hit · still offstage','Land on the starting deck to finish the follow-up.'],
        missed:['Missed the ledge','Start with a full dash. Turn inward as soon as your dog runs off.'],
      };
      const [label,tip]=lines[e.phase];
      status.dataset.result=e.phase; status.textContent=label; $('recovery-tip').textContent=tip;
      return;
    }
    let result, label, tip;
    if (name === 'ledgeTrump') {
      if (e.target === player) {
        result = 'lost';
        label = 'Bumped off';
        tip = 'You can still jump or use Up + Special. Catching the lip again leaves you open to a hit.';
      } else if (!e.f.ledge.protectedCatch) {
        result = 'regrab';
        label = 'Vulnerable regrab';
        tip = 'You took the ledge back. Roll, jump or attack before the rival reaches you.';
      } else {
        result = 'won';
        label = 'Ledge trump';
        tip =
          'You bumped the other dog off. To try a regrab, tap Down to drop, then jump back toward the lip.';
      }
    } else if (name === 'ledge' && !e.trump && e.f === player && !e.protectedCatch) {
      result = 'regrab';
      label = 'Vulnerable regrab';
      tip = 'You caught the ledge again. Land or take a hit to restore protection for your next catch.';
    } else if (name === 'ledge' && !e.trump && e.f === player && e.protectedCatch) {
      result = 'safe';
      label = 'Protected catch';
      tip = 'You caught a free ledge with fresh protection. Choose either role to try the contest again.';
    } else if (
      name === 'ledge' &&
      !e.trump &&
      e.protectedCatch &&
      e.f.index === 1 &&
      drill.role === 'defend' &&
      drill.phase === 'caught'
    ) {
      result = 'clear';
      label = 'Cleared the ledge';
      tip = 'You left the lip before the rival arrived. Choose Defend the ledge to try a different exit.';
    } else if (name === 'hit' && e.f.index === 1 && drill.phase === 'intercepted') {
      result = 'intercepted';
      label = 'Recovery intercepted';
      tip = 'Your attack reached the rival before they caught the ledge.';
    } else if (
      name === 'ko' &&
      e.f === player &&
      (drill.phase === 'approach' || status.dataset.result === 'lost')
    ) {
      result = 'miss';
      label = 'Missed the ledge';
      tip = 'Choose Take the ledge or Defend the ledge to retry.';
    } else return;
    status.dataset.result = result;
    status.textContent = label;
    $('recovery-tip').textContent = tip;
  }
  function waveFeedback(world) {
    const d = world.wavePractice, back = d.pattern === 'back', [f, rival] = world.dogs;
    const side = (back ? -d.dir : d.dir) > 0 ? 'right' : 'left';
    const grab = grabs[rival.kit.grab].label;
    const status = $('wave-status'), tip = $('wave-tip');
    const bar = $('wave-recovery');
    bar.hidden = back || d.phase === 'done';
    status.dataset.result = d.outcome || d.phase;
    if (d.phase === 'ready') {
      bar.max = f.kit.airDodge.directional[3];
      bar.value = 0;
      bar.classList.remove('ready');
      status.textContent = back ? 'Slip past ' + grab : 'Catch the shield';
      tip.textContent = (back ? 'Tap Jump, then aim down-' : 'Aim down-') + side + ' and tap Shield. ' +
        (back ? 'Release the direction to keep facing the grab.' : 'Release the direction and tap Grab as your paws settle.');
    } else if (d.phase === 'active') {
      status.textContent = f.lastMove;
      tip.textContent = back ? 'Release the direction to keep facing the rival.' : 'Tap Grab as the slide ends.';
    } else {
      const result = {
        clear: ['Grab whiffed', 'You slid back and kept facing ' + rival.stats.name + '.'],
        caught: ['Caught by ' + grab, 'Dodge diagonally away just after jumping.'],
        grabbed: ['Shield caught', grabs[f.kit.grab].label + ' reached the shield. Aim now to throw.'],
        otherGrab: ['Grab connected', 'Try landing with a diagonal dodge before the catch.'],
        otherDodge: ['Grab missed', 'Try clearing it with a backward wavedash.'],
        short: ['Grab fell short', 'Dodge toward the shield and grab as you finish sliding.'],
        missedFloor: ['Missed the platform', 'Aim the diagonal onto the platform.'],
        late: ['Time up', 'Choose the exercise again to retry.'],
      }[d.outcome];
      status.textContent = result[0] + (d.distance ? ' · ' + d.distance + ' px slide' : '');
      tip.textContent = result[1];
    }
  }
  function edgePanel(world,pattern,player,keyFor){
      const d = world.edgePractice, side = d.dir > 0 ? 'right' : 'left';
      for (const id of ['lip','shortCatch','longCatch','tip','deep','corner','inside','light']) $('edge-' + id).setAttribute('aria-pressed', String(id === d.pattern));
      $('edge-slow').setAttribute('aria-pressed', String(d.slow));
      $('edge-status').dataset.result = 'ready';
      $('edge-status').textContent = d.corner ? (pattern === 'corner' ? 'At the lip' : pattern === 'light' ? 'Twelve pixels inside the lip' : 'One step in') + ' · hold Shield' :
        d.timeCatch ? (pattern === 'longCatch' ? 'Long recovery' : 'Short recovery') + ' · tap Attack to start' :
        pattern === 'lip' ? 'Guard the ' + side + ' ledge' : 'Drifting ' + side + ' · tap Attack';
      if(pattern==='light')return 'Hold '+keyFor(0,'shield')+' for a firm block. Try the same smash with '+keyFor(0,'walk')+' + '+keyFor(0,'shield')+', the center dot + Shield, or left stick click + Shield. Compare your footing and shield energy.';
      return d.corner ? 'Hold Shield through the charged smash. Compare the two floor marks, then try releasing Shield when the chalk turns mint.' :
        d.timeCatch ? 'Tap Attack to send the rival toward the ledge. Watch the last grip mark turn gold. Time Down + Attack to hit as it disappears.' :
        pattern === 'lip' ? 'Walk ' + side + ' to the chalk (P1: Shift + direction, or slide from the center dot). When the rival lets go, tap Down + Attack.' :
        'Tap Attack with the directions released for ' + moves[player.kit.air.neutral].label + '. Coast through the landing. If you slip off, tap Down + Attack.';
  }
  function escapePanel(world,pattern){
    for (const id of ['tip','close','counter','break','gripEscape','gripThrow','carry']) $('escape-' + id).setAttribute('aria-pressed', String(id === pattern));
    $('escape-slow').setAttribute('aria-pressed', String(world.escapePractice.slow));
    $('escape-status').dataset.result = 'ready';
    if (world.escapePractice.gripDrill) {
      escapeFeedback(world, {phase:'ready'});
      return $('recovery-tip').textContent;
    } else if (pattern === 'counter') {
      return crouchCounterPrompt(world);
    } else if (pattern === 'break') {
      $('escape-status').textContent = 'Rival crouching';
      return 'Try a light hit and watch for the low tilt. Retry with a grab and throw or a stronger launcher.';
    } else {
      $('escape-status').textContent = 'Rim Rattle';
      return 'Tap Attack to start. Watch Clover’s disc, then flick left on the first hit spark.';
    }
  }
  function shieldPanel(world,pattern,player){
    $('shield-status').dataset.result = 'ready';
    const guard = world.shieldPractice;
    $('shield-status').textContent = guard.coverage ? (pattern === 'poke' ? 'Rival shield' : 'Your shield') + (guard.worn ? ' · 30%' : ' · 100%') : 'Hold Shield to begin';
    if (pattern === 'dodgeTiming') $('shield-status').textContent = 'Spot-dodge once';
    if (pattern === 'breakEscape') $('shield-status').textContent = 'Hold your worn shield';
    if (pattern === 'breakPunish') $('shield-status').textContent = 'Rival has a worn shield';
    $('shield-strength').hidden = !guard.coverage;
    $('shield-strength').setAttribute('aria-pressed', String(!!guard.coverage && !guard.worn));
    $('jump-in-options').hidden = !guard.jumpIn;
    $('shield-landing-options').hidden = pattern !== 'crossup';
    if (pattern === 'crossup') {
      $('shield-landing-choice').value = guard.landingChoice;
      $('shield-landing-speed').setAttribute('aria-pressed',String(guard.slow));
    }
    for (const button of $('shield-patterns').querySelectorAll(':scope > button:not(#shield-strength)'))
      button.setAttribute('aria-pressed', String(button.id === 'shield-' + (guard.jumpIn ? 'jumpIn' : pattern)));
    if (guard.jumpIn) {
      $('jump-in-choice').value = pattern;
      $('jump-in-speed').setAttribute('aria-pressed',String(guard.slow));
      if (pattern === 'yourHop') $('shield-status').textContent = 'Hop beside the shield';
    }
    return {
        yourHop: 'Hold Hop or Jump beside the rival. Tap Grab as your paws touch down, then choose a throw.',
        crossup: 'Block Belly Drop. If Brisket lands in front, tap Attack to grab. If he crosses behind, jump and attack back.',
        emptyHop: 'Hold Shield to start. Let the empty hop grab you once. Retry and tap Down as the rival reaches for you.',
        fallingAir: 'Hold Shield to start. Watch the falling swing, then hold your ground or release Shield to parry.',
        mixHop: 'Hold Shield to start. Watch for a swing on the way down or a grab after touchdown.',
        kick: 'You’re Clover. Hold Shield. Tap Grab when Pip’s Flying Kick hits the far side of your shield.',
        drop: 'You’re Clover. Hold Shield. Tap Grab as Brisket’s Belly Drop hits to catch him before he recovers.',
        strike: 'Raise Shield to start. Roll through the strike, or release Shield as it lands to parry.',
        grab: 'Raise Shield to start. Tap Down just before the grab to spot-dodge, or tap a side to roll.',
        counterGrab: 'Hold Shield. Tap Down as the grab comes out, then release Down. Tap Attack as your dog rises to punish with a jab.',
        dodgeTiming: 'Hold Shield and tap Down, then release Down. Pip sweeps at the end of your dodge. Try repeating the dodge immediately and after a rest.',
        breakEscape: 'Hold Shield until it bursts. Try staying still after landing, then retry and tap Attack or flick the stick repeatedly. Keep Shield held to block the punish as you wake.',
        breakPunish: 'Hold a smash as the rival’s shield wears out. Wait for the dizzy landing, then release. Choose Punish the break to retry.',
        low: 'Hold Shield. Noodle sweeps your paws. Aim Down gently with the stick, Walk + Down, or a drag from the center dot.',
        high: 'Hold Shield. Noodle jumps for your ears. Aim Up as the lead swings over the bubble.',
        poke: 'The rival holds their shield high. Aim Down and tap Attack for ' + moves[player.kit.tilts.down].label + '.',
      }[pattern];
  }
  window.PracticeFeedback={edgePanel,shieldPanel,escapePanel,event,techResponses,reversalTip,ledgeTrapCounterTip,crouchCounterPrompt,escapeFeedback,survivalFeedback,meteorFeedback,waveFeedback};
})();
