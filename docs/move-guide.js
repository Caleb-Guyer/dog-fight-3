(() => {
  'use strict';
  const tiltInputs = {
    forward: 'Forward tilt · Side + Attack',
    up: 'Up tilt · Up + Attack',
    down: 'Down tilt · Down + Attack',
  };
  const airInputs = {
    neutral: 'Attack alone',
    forward: 'Forward + Attack',
    back: 'Back + Attack',
    up: 'Up + Attack',
    down: 'Down + Attack',
  };
  const smashInputs = { side: 'Side + Smash', up: 'Up + Smash', down: 'Down + Smash' };
  const throwInputs = {
    grab: 'Press Grab',
    dashGrab: 'Dash grab · Run + Grab',
    pivotGrab: 'Pivot grab · Reverse + Grab',
    pummel: 'Pummel · Tap Attack',
    forward: 'After catch · Forward',
    back: 'After catch · Back',
    up: 'After catch · Up',
    down: 'After catch · Down',
  };
  const defenseGuide = {
    tumble: {
      label: 'Directional influence',
      input: 'Aim during the hit freeze',
      hint: 'Hold across the launch path to bend it during the freeze. Once hitstun ends, flick a fresh side to right your dog and regain air drift. You keep your jump and air dodge.',
    },
    techRoll: {
      label: 'Tech landing',
      input: 'Tap Shield just before landing',
      hint: 'Leave movement neutral to land in place, or hold left or right to roll through. The roll covers more ground and takes longer to finish.',
    },
    floorAttack: {
      input: 'After a knockdown · tap Attack',
    },
  };
  function guideMoveRow(move, input, direction, category) {
    return (
      '<li><canvas width="124" height="78" data-direction="' +
      direction +
      '" data-category="' +
      category +
      '" aria-hidden="true"></canvas><div><small>' +
      input +
      '</small><strong>' +
      move.label +
      '</strong><span>' +
      move.hint +
      (category === 'air' && move.late ? ' Clean ' + move.dmg + '%. Late ' + move.late.dmg +
        '% from frame ' + Math.round(move.late.start * 60) + '. A short hop deals 85% of these values.' : '') +
      (category === 'air' && move.meteor ? ' A strong spike rebounds off the floor. A falling rival can cancel from flight frame ' +
        (move.meteor + 1) + ' with a saved jump or Up Special.' : '') +
      (move.landingWindow ? ' Landing on frames ' + move.landingWindow[0] + '–' + (move.landingWindow[1] - 1) +
        ' takes ' + move.land + ' frames to recover. A timed Shield press cuts it to ' + Math.ceil(move.land / 2) +
        '. Elsewhere in the move it takes 2.' : '') +
      '</span>'+(category==='specials'?'<button type="button" class="utility" data-watch-special="'+direction+'" aria-label="Watch '+move.label+'">Watch move</button>':'')+'</div></li>'
    );
  }
  function moveGuide(kind,section,{keyFor,padFor,strikeKeys,specialInputs}) {
    const {kits,fighters,moves,smashes,specials,grabs,pummels,throws}=window.DogFight;
    const kit = kits[kind],
      f = fighters[kind];
    const tabs = Object.entries(fighters)
      .map(
        ([key, dog]) =>
          '<button type="button" data-guide-kind="' +
          key +
          '" aria-pressed="' +
          (key === kind) +
          '">' +
          dog.name +
          '</button>',
      )
      .join('');
    const moveSet =
      section === 'throws' ? { ...grabs, ...pummels, ...throws } : { air: moves, smashes, specials }[section];
    const inputs = { air: airInputs, smashes: smashInputs, specials: specialInputs, throws: throwInputs }[
      section
    ];
    const entries =
      section === 'throws'
        ? {
            grab: kit.grab,
            dashGrab: kit.dashGrab,
            pivotGrab: kit.pivotGrab,
            pummel: kit.pummel,
            ...kit.throws,
          }
        : kit[section];
    const rows =
      section === 'defense'
        ? Object.entries(defenseGuide)
            .map(([key, move]) => guideMoveRow(key === 'floorAttack' ? moves[kit.floorAttack] : move, move.input, key, section))
            .join('')
        : Object.entries(entries)
            .map(([side, id]) => guideMoveRow(moveSet[id], inputs[side], side, section))
            .join('');
    const ledgeMove =
      '<h3 class="guide-section">Ledge attack</h3><ul class="move-rows guide-ledge">' +
      guideMoveRow(moves[kit.ledgeAttack], 'While hanging · tap Attack', 'ledge', 'ledge') +
      '</ul><p>Wait below a swing, then choose your get-up. Three amber marks count down to a slip. Damage and repeated catches shorten your grip.</p>';
    const sections =
      '<div class="guide-tabs" role="group" aria-label="Move categories">' +
      [
        ['air', 'Attacks'],
        ['smashes', 'Smash attacks'],
        ['specials', 'Specials &amp; recovery'],
        ['throws', 'Grabs &amp; throws'],
        ['defense', 'Defense'],
      ]
        .map(
          ([key, label]) =>
            '<button type="button" data-guide-section="' +
            key +
            '" aria-pressed="' +
            (section === key) +
            '">' +
            label +
            '</button>',
        )
        .join('') +
      '</div>';
    let contents;
    if (section === 'defense') {
      const { roll, spot } = kit.defense;
      const { neutral, directional } = kit.airDodge;
      const airRows = [
        [
          'neutralAirDodge',
          'Tap Shield in midair',
          'Neutral air dodge',
          'Center your aim and tap Shield to tuck in place. ' +
            f.name +
            ' evades on frames ' +
            neutral[1] +
            '–' +
            neutral[2] +
            ' and can act again sooner than after a directional dodge.',
        ],
        [
          'directionalAirDodge',
          'Aim + tap Shield in midair',
          'Directional air dodge',
          kit.airDodge.tip +
            ' Landing during the dodge gives you ' +
            directional[3] +
            ' frames of landing lag.',
        ],
      ]
        .map(([key, input, label, hint]) => guideMoveRow({ label, hint }, input, key, 'defense'))
        .join('');
      const groundRows = [
        [
          'shieldRoll',
          'Shield + Left or Right',
          'Shield Roll',
          'Roll through a rival, or roll backward to retreat. ' +
            f.name +
            ' finishes a forward roll in ' +
            roll[0] +
            ' frames. A backward roll is shorter and takes two more frames.',
        ],
        [
          'spotDodge',
          'Shield + Down',
          'Spot-dodge',
          'Evade in place, including grabs. ' +
            f.name +
            ' is untouchable on frames ' +
            spot[1] +
            '–' +
            spot[2] +
            ' and finishes on frame ' +
            spot[0] +
            '.',
        ],
        [
          'parry',
          'Release Shield just before contact',
          'Parry',
          'Release within five frames of a strike to take no damage. Counter a melee attacker immediately. A projectile can be parried from a distance.',
        ],
      ]
        .map(([key, input, label, hint]) => guideMoveRow({ label, hint }, input, key, 'defense'))
        .join('');
      contents =
        '<p class="recovery-note">Shield is L for P1, Slash for P2, either bumper on a gamepad, or Shield on touch.</p><h3 class="guide-section">On the ground</h3><p>Keep Shield held and press Jump, Grab, Up + Smash, or Up + Special. Tapping Attack while shielding also grabs straight ahead. If a falling opponent crosses behind you, aim back and tap Jump + Attack together for a back air. You can tap during impact. A grab immediately after a block needs four extra startup frames.</p><p>In <strong>Training → Shield practice</strong>, use Clover’s Disc Hook against Pip’s spaced kick and Brisket’s Belly Drop. Choose Strike or Grab to practice a parry or dodge with your own dog.</p><ul class="move-rows guide-shield">' +
        groundRows +
        '</ul><h3 class="guide-section">On a platform</h3><ul class="move-rows">' +
        guideMoveRow({ label: 'Shield drop', hint: 'Raise Shield, then tap either lower diagonal. Tap Attack with it for ' +
          moves[kit.air.down].label + ', or aim another aerial as you fall. Try it against the up air in Training → Platform practice.' },
          'Hold Shield, then ↙ or ↘', 'platformDrop', 'defense') +
        '</ul><h3 class="guide-section">Shield coverage</h3><ul class="move-rows guide-coverage">' +
        guideMoveRow({ label: 'Tilt shield', hint: 'Shift the bubble toward a low sweep, high aerial or incoming disc. A hit that reaches an exposed part of your dog deals its normal damage. Try Guard low and Guard high in Shield practice.' },
          'Shield + gentle direction', 'shieldTilt', 'defense') +
        '</ul>' + (kit.crawl ? '<h3 class="guide-section">Crawl</h3><ul class="move-rows">' +
          guideMoveRow({label:'Belly crawl', hint:'Hold Down and a side to move low. Noodle can back up without turning. Hold Down alone after moving to stay flat. Try Crawl under the disc in Footwork practice.'},
            'Down + Left or Right', 'crawl', 'defense') + '</ul>' : '') +
        '<h3 class="guide-section">Crouch cancel</h3><ul class="move-rows guide-crouch">' +
        guideMoveRow({ label: 'Crouch cancel', hint: 'You take full damage and two-thirds of the usual launch speed. A light, low blow can leave your paws planted. Tap Attack at the spark for ' +
          moves[kit.tilts.down].label + '. Grabs and tethers can catch a crouch. Try both sides in Training → Combo escape.' }, 'Hold Down before contact', 'crouchHit', 'defense') +
        '</ul><h3 class="guide-section">In the air</h3><p>One dodge per airtime. Landing or catching a ledge refreshes it. Try <strong>Training → Air-dodge practice</strong>.</p><p>For a wavedash, tap Jump, then aim diagonally down and tap Shield. Release the direction to slide forward or backward and keep your facing. Do the same on the way down to waveland on a platform. Try <strong>Training → Wavedash</strong>.</p><ul class="move-rows guide-air-dodge">' +
        airRows +
        '</ul><h3 class="guide-section">At the ledge</h3><p>Tap Down or away to let go. Down + Jump spends your air jump below the lip. Aim inward and tap Attack for ' +
          moves[kit.air.forward].label + ' as you rise. Try both sides in <strong>Training → Ledge timing</strong>.</p><ul class="move-rows guide-ledge-climb">' +
        guideMoveRow({ label: 'Ledge climb', hint: 'On a fresh catch, protection ends ' +
          (kit.ledgeClimb.total - kit.ledgeClimb.protectedThrough) + ' frames before you can act. Hold Shield during the climb to guard as soon as you stand.' },
          'While hanging · press toward the stage', 'ledgeClimb', 'defense') +
        '</ul><p>Release Shield after an air dodge, then tap it again once you catch the lip. Try <strong>Training → Ledge roll practice</strong>.</p><ul class="move-rows guide-ledge-roll">' +
        guideMoveRow(
          { label: kit.ledgeRoll.label, hint: kit.ledgeRoll.tip },
          'While hanging · tap Shield',
          'ledgeRoll',
          'defense',
        ) +
        '</ul><h3 class="guide-section">Ledge trumping</h3><p>Catch an occupied ledge to bump the other dog outward. On a fresh catch, a longer flight gives you more protected time. High damage shortens it. Watch the grip marks under the lip. The last mark turns gold for the final six frames. Regrabs leave you open until you land or take a hit. Try <strong>Edge practice → Long recovery</strong> to time a punish.</p>' +
        '<h3 class="guide-section">Between hits</h3><p>Flick a fresh direction during impact freeze to move a short distance. Center the stick and flick again for a second shift if time allows. On a keyboard or touch screen, tap a direction at the spark. Try <strong>Training → Combo escape</strong> at two distances.</p>' +
        '<h3 class="guide-section">Surviving a finisher</h3><p>On your last stock, two amber chevrons point toward the blast line if a centered stick would carry you out during hitstun. Hold across the throw during the freeze to bend your flight. On shallow launches, Down also slows you and Up adds speed. A late tap of Shield toward the stage queues an air dodge in open air. Try <strong>Training → Launch practice → Survival DI</strong>.</p>' +
        '<h3 class="guide-section">After a knockout</h3><p>Watch the lamps on the airmail lift. When they turn mint, tap Down, a side, Jump, or an aerial move to leave. Leaving early gives you more protection on landing. The last gold mail tag goes dark when you can be hit again. Try both sides in <strong>Training → Launch practice → Take the lift</strong> and <strong>Catch the return</strong>.</p>' +
        '<h3 class="guide-section">After a launch</h3><p>Choose <strong>Training → Launch practice</strong> to take an up throw and try the landing again.</p><p>On a strong meteor, tap Shield just before the platform to stop the bounce. Over open air, tap a fresh Jump or Up + Special when the gold streaks turn mint, then steer home. Try <strong>Spike landing</strong> and <strong>Offstage spike</strong>.</p><ul class="move-rows guide-defense">' +
        rows +
        '</ul><h3 class="guide-section">Stage walls and undersides</h3><p>Jump around a solid deck to reach the lip. If a hit sends you tumbling up into its underside, tap Shield just before contact to stop the bounce. Try <strong>Tech the underside</strong> in Wall tech practice.</p><p>Pip and Noodle can flick away from a solid wall once per airtime. Pip kicks higher, and Noodle travels farther sideways. The kick keeps your remaining air jump and Up Special. In <strong>Training → Wall tech practice</strong>, choose a dog’s wall jump to try both roofs, or take Pip’s Back Heel to practice a wall tech.</p><ul class="move-rows guide-wall">' +
        guideMoveRow(
          {
            label: 'Wall tech',
            hint: 'Tap in the last 11 frames of a tumble into a solid wall. Your dog plants its paws and briefly stops. Your saved air jump is still available.',
          },
          'Tap Shield before impact',
          'wallTech',
          'defense',
        ) +
        guideMoveRow(
          {
            label: 'Wall-tech jump',
            hint: 'Keep Jump held as the tech lands to spring up and away. You can use your saved recovery afterward.',
          },
          'Tap Shield + hold Jump',
          'wallTechJump',
          'defense',
        ) +
        guideMoveRow(
          {
            label: 'Missed wall tech',
            hint: 'Your dog bounces back into open air, still tumbling. An early Shield press locks out another attempt for 28 frames.',
          },
          'Miss the Shield timing',
          'wallBounce',
          'defense',
        ) +
        '</ul>';
    } else if (section === 'throws') {
      contents =
        '<p class="recovery-note"><strong>Grab</strong> Use U (P1), M (P2), Y on a gamepad, or Grab on touch. Grab during a run to catch ahead. Reverse and press Grab together to catch behind. For a boost grab, start a dash attack and tap Grab in its first two frames. Hold back as you grab for a sliding pivot catch. After a catch, tap Attack to pummel or tap a direction to throw. Forward follows your new facing. Grab again also throws forward. Tap action buttons when caught to escape.</p><ul class="move-rows guide-throws">' +
        rows +
        '</ul>';
    } else if (section === 'smashes') {
      contents =
        '<p class="recovery-note"><strong>Charge</strong> Aim and hold Smash (P1 '+keyFor(0,'smash')+', P2 '+keyFor(1,'smash')+', P1 controller '+padFor(0,'smash')+'), then release. A tap swings immediately. Full charge takes one second. You can hold it for one more second before the move fires. Repeating a move lowers its damage and launch power. Try Training → Move freshness → KO test to see when this changes a stock.</p><ul class="move-rows guide-smashes">' +
        rows +
        '</ul>';
    } else if (section === 'specials') {
      contents =
        '<p class="recovery-note"><strong>Offstage</strong> ' +
        kit.recovery +
        '</p><p>In the air, tap neutral Special, then immediately flick behind you for a <strong>B-reverse</strong>. Your dog turns and reverses its sideways speed. Flick back and release <em>before</em> Special for a turnaround that keeps your drift. Combine both inputs for a <strong>wavebounce</strong>. Try Training → Aerial practice.</p><ul class="move-rows guide-specials">' +
        rows +
        '</ul>' +
        ledgeMove;
    } else {
      contents =
        '<h3 class="guide-section">Ground combo</h3><div class="guide-chain">' +
        kit.ground.map((id) => moves[id].label).join(' / ') +
        '</div><p>' +
        kit.combo +
        '</p><p>Walk to a ledge to balance there. Dash to run off. Land an aerial at the tip of a platform with sideways speed to slide off and attack again. Try Training → Edge practice.' +
        '</p><p>When two ground swings meet, both dogs recoil. A swing worth at least 9 percentage points more carries through. You can also bat Clover’s flying discs. Try Training → Footwork practice → Clash jabs.' +
        '</p><p>If the rival misses a landing, tap neutral Attack for ' + moves[kit.ground[0]].label +
        '. You can jab lock twice before finishing with ' + smashes[kit.smashes.down].label + ' (Down + Smash). Try Training → Launch practice → Jab lock.' +
        '</p><h3 class="guide-section">Ground tilts</h3><p>Aim and tap Attack. Angle a forward tilt with a shallow diagonal on the stick, Walk + a diagonal on keyboard, or a slide from the center dot to a diagonal on touch. Aim high to tag a jumper or low to cover a recovery. With Tilt stick enabled, hold Up or Down and flick the aim stick sideways.</p><p>Out of a run, release forward briefly, then press forward and Attack together to slide into a tilt. Reverse and tap Attack to strike behind you while your paws still skid forward. Up and down tilts work straight out of the run.</p><ul class="move-rows guide-tilts">' +
        Object.entries(kit.tilts)
          .map(([side, id]) => guideMoveRow(moves[id], tiltInputs[side], side, 'tilts'))
          .join('') +
        '</ul><h3 class="guide-section">Dash attack</h3><ul class="move-rows guide-dash">' +
        guideMoveRow(moves[kit.dashAttack], 'Run + Attack', 'dash', 'dash') +
        '</ul>' +
        ledgeMove +
        '<h3 class="guide-section">Aerial attacks</h3><p>Jump + Attack gives a rising short-hop aerial. For a low approach, hold Short hop and wait until you are falling to press Attack. Flick Down in the last three frames before the apex or as you descend to fast-fall. Forward follows your facing.</p><p>Press Shield during an aerial in the last seven frames before touchdown to halve its landing recovery, rounded up. Mint streaks at the paws mark a landing cancel. Keep holding Shield to block the reply. Try <strong>Training → Aerial practice → Landing cancel</strong>.</p><p>Each forward air has a clean hit and a softer follow-through. Practice landing the late hit into a jab in <strong>Training → Aerial practice → Landing hits</strong>.</p><p>Steer with the left stick and flick the right stick to swing in a separate direction. On keyboard, aim left/right/up/down with '+strikeKeys(0)+' for P1 or '+strikeKeys(1)+' for P2. On touch, flick outward from Smash. For a running back air, reverse direction with Jump and steer back along your original path. Try <strong>Aerial practice → Approach</strong>.</p><ul class="move-rows guide-airs">' +
        rows +
        '</ul>';
    }
    return '<div class="guide-dogs" role="group" aria-label="Fighter move list">' +
        tabs +
        '</div>' +
        sections +
        contents +
        '<div class="dialog-actions"><button class="primary" data-do="close">Got it</button></div>';
  }
  window.MoveGuide={sheet:moveGuide};
})();
