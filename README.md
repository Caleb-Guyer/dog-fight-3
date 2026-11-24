# Dog Fight 3

A cartoon platform fighter for one or two players. Play **The Last Dispatch** story adventure, or pick Pip, Brisket, Noodle, or Clover for a three-stock fight on Picnic Table, Laundry Line, or Moonbell Bandstand.

## Play

**[Play Dog Fight 3](https://caleb-guyer.github.io/dog-fight-3/)**

From the main menu, choose **Adventure**, **Solo fight**, **Local versus**, **Online versus**, or **Training**. For a solo or local match, choose your dog and select **Start fight**. To play offline, download or clone the repository, extract it if necessary, and open `docs/index.html` in a modern browser. The game, artwork, typeface, and sound effects work locally. A keyboard is enough for both solo and local versus. Touch controls appear on touchscreen devices.

Each dog starts with three stocks. Dealing damage makes the next hit launch a rival farther. Knock a dog beyond the arena boundary to take a stock. When a hard hit sends you tumbling, you can bend the launch and choose how to land. A midair jump and **Up + Special** can bring you back to the ledge.

The game fills the browser window. On browsers with fullscreen support, starting your first fight or chapter also hides the browser controls. Select **Fullscreen** or press **F** to switch at any time. On a phone, rotate to landscape for a wider view with the touch controls over the arena.

On **Moonbell Bandstand**, hold Jump beneath either wing. Once your paws land, jump inward to reach the high center platform with your midair jump still available. The right and left ends of the high platform overlap the wings below. Tap Down there to retreat one level. Dropping through the middle takes you back to the deck.

## Online versus

Pick your dog and select **Quickplay** to fight the next available player on a random arena. To play a friend, choose an **Opening arena**, select **Create room**, and share the six-character code or invite link. Your friend picks a dog and selects **Join room**. The fight starts when both players connect. [Open Online versus](https://caleb-guyer.github.io/dog-fight-3/#online)

Each device uses the P1 keyboard, controller, or touch controls. The HUD marks your fighter with **YOU**. Both dogs start with three stocks. When both players select **Rematch**, the arena advances through Picnic Table, Laundry Line, and Moonbell Bandstand in that order, then repeats. If the guest leaves, the next opponent can join the same code and play the host’s chosen opener.

Your dog responds on the next simulation frame. Both browsers predict the opponent’s held controls for up to eight frames and replay the fight when a late input changes what happened. The damage counter, stock count, and match result use confirmed inputs. A longer interruption briefly pauses the fight until the connection catches up.

Online play uses PeerServer Cloud to find the other browser, then exchanges inputs over a direct WebRTC data channel. Both players need internet access and a network that permits the connection. The bundled PeerJS 1.5.5 client includes its MIT license in `docs/vendor/`. [PeerServer Cloud](https://peerjs.com/server/cloud)

## The Last Dispatch

Choose **Adventure → Begin chapter** to play **The Silent Yard**. You play as Pip for all five missions. When the six o’clock train rolls past without ringing the depot bell, a turquoise envelope leads Pip to Noodle’s cage. After the rescue, Noodle guides you to Bell Depot. [Open the adventure](https://caleb-guyer.github.io/dog-fight-3/#adventure)

| Mission | How to clear it |
| --- | --- |
| Parcel Alley · Brawl | Ring out the Ticket Clipper once and the Baggage Porter twice to free Noodle. The guards share three stocks. |
| The Weigh House · Rival duel | Fight Brisket in a three-stock duel on the suspended scale. Only ring-outs take a stock. |
| Freight Exchange · Horde | Carry three stocks through three waves. Each crew fields three stocks, for nine enemy ring-outs in all. The last three machines fight together. |
| Sorting Bridge · Crossing | Strike the west signal, ride the cable ferry and take the freight lift to the east signal. Cable Dock and Crane House save your progress. The optional postmark hangs above the crane approach. |
| Bell Depot · Boss | Break the Copper Hound’s armor before it takes your three stocks. Its lamp opens after a rush, a stuck stamp or a parry. It charges more often at half armor. |

Winning a fight earns its postmark. Sorting Bridge has a collectible postmark. Clearing each mission opens the next stop. Each combat mission starts you at **three stocks and 0% damage**. Higher damage makes you easier to launch. Crossing a blast boundary costs a stock, and respawning resets your damage. The Copper Hound has an armor meter. **Route map → Continue** restores your saved stop and checkpoint, including the stocks and damage you took into a saved wave. Older checkpoints start you with three fresh stocks. Replay any open mission from the route sheet. Saves from the original three-stop chapter carry forward, including postmarks and unlocked cutscenes.

Four animated pixel-art cutscenes play during the chapter, with timed captions and an original score. Each shot fills your screen with scenery that extends around the dogs on ultrawide monitors and in portrait. **Pause** (P or gamepad Start) holds the current frame. **Next** jumps to the next caption and **Skip scene** moves the adventure along. With reduced motion enabled, each scene opens on a still frame and **Play** starts the animation. Rewatch unlocked scenes from **Adventure → Cutscenes**. [Open the cutscene library](https://caleb-guyer.github.io/dog-fight-3/#cutscenes)

The chapter script, dialogue, encounter order, terrain, checkpoints and postmarks live in `docs/dispatch-script.js`. The runtime in `docs/dispatch-run.js` plays those encounters using the regular fighting engine. The ferry, lift and drawspans use the moving surfaces in `docs/dispatch-bridge.js`.

## Publish on GitHub Pages

1. Create or open your GitHub repository. A public repository named `dog-fight-3` is a simple choice.
2. Put the extracted `docs` folder and this README at the top of the `main` branch. Keep the folder structure so that `docs/index.html` is the entry point.
3. Open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/docs**. Click **Save**.
4. When deployment finishes, use **Visit site** on the Pages settings screen. A project named `dog-fight-3` normally opens at `https://YOUR-USERNAME.github.io/dog-fight-3/`.

GitHub serves the files as written. Asset paths are relative to the game page. [GitHub Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Modes and controls

- **Solo** pits your dog against a computer opponent.
- **Options** saves sound effects, volume and camera shake in this browser. Menus support pointer, touch, arrow keys and Enter, or a gamepad D-pad and its confirm button.
- **Local versus** lets two people play on one device. Select either nameplate in the arena preview, then choose that side's dog from the roster.
- **Training** starts you within striking distance of a stationary dummy. It shows the last move you used and counts hits that connect before the dummy can act again. Reset positions, change the dummy's starting damage, or practice getting back from the ledge.
- **Fetch Ball** adds a tennis ball that both dogs can bat around. The third swat powers up the shot.

| Action | Player 1 | Player 2 | Standard gamepad |
| --- | --- | --- | --- |
| Move or aim | W A S D | Arrow keys | Left stick or D-pad |
| Walk | Left Shift + A or D | Right Ctrl + Left or Right | Gently tilt the left stick |
| Jump | Space | Right Shift | A |
| Attack | J | Comma | X |
| Smash | I | N | RT or right stick |
| Aim a strike left / right / up / down | R / Y / T / G | Numpad 4 / 6 / 8 / 2 | Right stick |
| Special | K | Period | B |
| Shield, dodge, parry, or tech | L | Slash | LB or RB |
| Grab | U | M | Y |
| Pause | Esc | Esc | Start |

Flick a side to dash. Reverse in the first few steps to dash-dance. Once your dog is running, its paws have to brake before it can turn. Pip can reverse a dash later than Brisket, who skids farther when stopping. To walk on touch, slide from the center dot onto a side arrow. A direct tap on the arrow starts a dash.

In **Training → Footwork practice**, dash right to the chalk and reverse to draw out Brisket’s Bear Hug. As his paws close, turn back and attack before he recovers. The drill reports how many frames he still needed when your punish landed. Choose **Footwork practice** again to retry with the same spacing.

Under **Footwork practice**, choose **Clash jabs** to meet a mirror opponent at the tips of your paws. Tap Attack to start the count, then tap it again on the third chalk light. When two grounded strikes meet, comparable attacks recoil. A swing worth at least 9 percentage points more at the point of contact carries through and can still reach the rival. Charge, sweet spots and the late part of a swing all count. Two airborne attacks can trade hits.

In **Break through**, start the count, hold Smash immediately, then release Pip’s Bolt Kick on the third light to beat Brisket’s Body Check. Try the same release with a short charge to see both paws recoil. In **Bat the disc**, time a swing against Clover’s Round Trip. You can swat her Skip Serve and Line Drive in a match, too. A sufficiently strong disc will beat a weak paw. An aerial that clears a disc can keep going. Each exercise has a side switch and a half-speed toggle.

Each dog remembers its last nine moves that connected. Repeating the most recent fresh hit deals 91% of its usual damage. Repeated moves also launch more softly and apply less shield pressure. A shield-only connection counts half as much. Landing other moves pushes older ones out. All hits from a single swing, throw or disc cast share one entry. Each separate pummel earns its own. Whiffs, parries, clashes and Fetch Balls leave the history alone. Losing a stock clears that dog's history.

In **Training → Move freshness**, hit the dummy, choose **Return to marks**, and repeat the move. The dummy returns to the same starting percentage, and your dog keeps its history. The gold trail follows the current launch. The dashed mint trail traces the previous attempt. Open **Recent moves** to see what counted. **Dummy shield** measures shieldstun and **Fresh start** clears the history.

Choose **KO test** for a vertical launch test against Pip. From your chalk mark, fully charge **Up + Smash** and release. Once Pip crosses the top blast line, choose **Return to marks** and do it again. The same charge lets Pip land on the second attempt. Each playable dog has its own starting percentage for this comparison.

Flick **Down** on a raised platform to slip through it. Your horizontal momentum carries into the fall, and you keep an air jump. As your paws pass through, aim your aerial and tap **Attack**. To down tilt on top, press **Down + Attack** together. For a crouch that lets high hits sail over your head, tilt the stick down gently, hold your keyboard Walk modifier with Down, or slide your thumb from the center dot onto Down. Low sweeps can still reach a crouching dog.

In **Training → Platform practice**, choose **Rival below** to catch the other dog with a falling aerial. Choose **Rival on top** to catch them with your down tilt on the same platform. On Laundry Line the second setup puts you both on the moving basket. Select either setup again to retry with your fighters and stage.

Choose **Hold the top** for a drill on Moonbell Bandstand with your selected dogs. Tap Attack to start the climb. The challenger jumps onto the right wing, then comes up through the high platform with their own up air. Try shielding it once. Repeat the drill and tap Down + Attack as the challenger jumps off the wing to intercept them. Returning to free practice or a different setup restores your arena.

Your dog crouches for three frames before a grounded jump. Release Jump during the crouch for a short hop. Hold Jump through it for a full jump. Press Attack with Jump or during the crouch to launch a short-hop aerial in the direction you aimed. To attack on the way down, jump first and press Attack later. Jump a second time in midair, then use Up + Special to recover. Down + Jump drops through a raised platform.

Tap Attack with no direction to start your dog's jab combo. On the ground, aim left, right, up, or down and tap Attack for a tilt. Left or right turns your dog toward the swing. Press before you reach running speed for a forward tilt. At running speed the same input gives you a dash attack. Holding Attack from a standstill charges a smash. Grabs beat shields.

In midair, press Attack alone or aim forward, back, up, or down as you press it. Forward follows the direction your dog faces. Tap Down once after the top of your jump to fast-fall, then release Down to aim your attack. Brisket falls fastest, followed by Pip, Clover, and Noodle. Each aerial has its own landing window in the Move list. Outside that window, a landing during the move takes two frames to recover. Landing during Pip’s Scramble takes three frames in its committed window. Brisket’s Belly Drop takes eighteen.

In local versus, a single controller plays P2 alongside the P1 keyboard. With two controllers, the first plays P1 and the second plays P2.

A running jump carries your ground speed into the air. Let go to coast, or steer opposite your travel to brake. Clover changes direction quickly. Brisket takes longer to reverse and keeps sliding when you let go. Most aerial attacks let you keep steering. Flying Kick, Air Ram and Belly Drop each commit to their own movement.

During a full run, tap the opposite direction with Jump to turn around while your momentum carries you forward. Steer back along your original path and tap Attack for a backward strike toward the opponent. You can also choose an aerial with the aim keys or right stick while steering independently. On touch, swipe outward from **Smash** toward the target while your other thumb steers.

In **Training → Back air practice**, **Approach** starts you running toward a shield. Turn in the jump, tag the shield with your back air and land behind the grab. **Retreat** starts you running away. Aim your back air toward the rival as you jump and carry on out of reach. The two drills work with either facing and your selected matchup.

## Wavedashes and wavelands

Tap Jump, then aim diagonally down and tap Shield during takeoff to **wavedash**. Release the direction to slide along the floor while keeping your facing. To slide backward on the P1 keyboard while facing right, tap **Space**, then **S + A + L**. A fresh diagonal Shield tap also works together with Jump. Holding an already-raised shield and jumping gives you your regular jump.

To **waveland**, dodge diagonally down onto a platform during a fall. Your angle and speed at contact determine how much sideways motion you carry. Clover can act first. Noodle travels farthest from the same short hop. You can be hit or grabbed from the moment your paws touch down. Each dog keeps its usual directional-dodge landing recovery. Tap a grounded move near the end to have it come out as soon as you can act.

In **Training → Wavedash**, **Dodge the grab** starts you inside the rival's grab range. Slide backward to make the grab miss while you still face them. **Platform grab** starts you above a shielded rival's platform. Slide toward them, let go of the direction, and tap Grab as you settle. Laundry Line uses the moving basket. The mint line measures your slide along the surface. Repeat either exercise or switch sides to practice in the other direction.

## Grounded shield defense

Hold **Shield** on the ground to block. On a touchscreen, keep one thumb on Shield and use the other on the direction pad.

- **Shield + Left or Right** rolls in that direction, even through a rival. A forward roll turns you around to face the dog you passed. A backward roll keeps your facing, travels a little less, and takes two extra frames to recover.
- **Shield + Down** spot-dodges in place. Time the duck to slip a grab and stay close enough to answer. Both dodges have a brief invincible stretch between their vulnerable start and recovery. Keep holding Shield after the dodge to block again.
- **Release Shield just before a strike** to parry. The first five frames of the release can catch the hit. A melee parry interrupts the attacker and gives you an opening to counter. A projectile parry absorbs the impact at your position. Grabs can catch a blocking dog or a dog trying to parry.
- A blocked jab gives a short pause and a small shove. A charged smash holds the shield longer and pushes the dogs farther apart. A blocked projectile can pin the defender while its owner keeps moving.
- **Jump**, **Grab**, **Up + Smash**, and **Up + Special** work directly from a grounded shield. Keep Shield held and tap a response during impact or shieldstun. It starts on the first actionable frame. An immediate shield grab adds four frames to the dog's usual grab startup. Holding Up + Smash charges it as usual.

Pip finishes a forward roll fastest at 24 frames. Brisket covers the least ground and starts more slowly, but has the longest invincibility. Noodle travels farthest. Clover recovers from her spot-dodge in 20 frames and can answer with Disc Tap. All timings use 60 game frames per second.

In **Training → Shield practice**, choose **Pip’s spaced kick** or **Brisket’s Belly Drop** to play as Clover. Hold Shield and tap Grab when the aerial hits. Pip lands at the tip of Flying Kick and can dash out of Disc Hook’s reach. Brisket lands beside you and can be grabbed during Belly Drop’s 18 frames of landing recovery. Select a matchup again to retry. **Strike** and **Grab** use your selected fighters for parry and dodge practice. **Reset positions** returns to free training.

## Air dodges

Tap **Shield** in midair with the stick centered or the direction keys released for a **neutral air dodge**. Your dog tucks in place, lets the hit pass, then starts falling. Aim as you tap Shield for a **directional air dodge**. You can burst left, right, up, down, or diagonally. On a controller the left stick sets the angle. On touch, hold an arrow and tap Shield with your other thumb. Lift your direction thumb or slide it to the center dot for neutral.

A directional dodge commits you to its original angle. From outside the stage, aim diagonally up and inward to slip a guard and grab the ledge. Both dodges have vulnerable startup and recovery. The directional dodge travels farther and takes longer to recover. You get one air dodge until you land or catch a ledge. A midair jump and Up + Special remain available afterward if you saved them.

| Dog | What to expect | Landing lag for neutral / directional |
| --- | --- | --- |
| **Pip** | The quickest neutral dodge. A short burst leaves time to act again in the air. | 6 / 11 frames |
| **Brisket** | The longest invincibility and shortest burst. Give the tuck a little more time to start. | 8 / 17 frames |
| **Noodle** | The longest burst. Start farther outside the stage when aiming for a ledge. | 7 / 14 frames |
| **Clover** | A longer burst than Pip’s and the quickest landing recovery. | 5 / 9 frames |

Choose **Training → Air-dodge practice → In place**. Jump and tap Shield as the dummy tries to catch your landing with an up tilt. Choose **At the ledge** to recover past its forward tilt. **Switch ledge** mirrors the approach. **Move list → Defense** illustrates both options for each fighter.

## Launch defense

**Directional influence (DI).** During the brief freeze of a strong hit or throw, hold across the launch path to bend it by up to 18 degrees. Against a near-vertical throw, left or right changes where you come down. Against a sideways hit, holding up can buy height for a recovery. Your final direction during the freeze sets the angle. After hitstun ends, you can jump, use an aerial, or air dodge out of tumble.

**Landing tech.** Tap Shield in the last 11 frames before your tumbling dog hits a platform. Tap it alone for a quick recovery in place. Add left or right to roll through a waiting opponent. A roll covers more ground and leaves a longer opening at the end. A mistimed press starts a 28-frame lockout, so timing beats repeated taps.

**Missed tech.** After the bounce, tap Attack for a two-sided, 7% **Get-up Sweep**, tap a side for a get-up roll, or tap Up or Jump to stand. If you wait, your dog stands automatically. A prone dog can duck a high swing, but a low hit can catch it.

A missed tech carries some of the sideways launch into a skid. A hard landing near the lip can carry you offstage. A timed tech plants you or sends you into your chosen roll.

**Jab lock.** Face a fallen rival, release the directions and tap Attack. Your opening jab bounces them against the floor. You can land two locks during one knockdown. Tap again as your first jab recovers to repeat it, or tap Down + Smash to finish. Pip’s Quick Paw recovers fastest, Noodle’s Ankle Tap reaches farthest, and Brisket’s Body Check gives the longest opening. If the chaser waits, tap a side, Attack or Jump as the bounce settles to choose your get-up.

In **Training → Launch practice**, choose **Jab lock** to catch a rival who will roll away. You can also let the roll start, follow it and hit the recovery. A nearby solo opponent is more likely to chase if you repeat the same roll toward or away from them. Choose **Escape the lock** to play the falling dog. Tap Attack to start each fall. Time Shield for a tech, or let the two jabs connect, then roll away or sweep before the chaser's next jab. **Switch sides** mirrors the landing and **Half speed** lets you rehearse the timing.

Choose **Training → Launch practice**. Your selected opponent grabs you at 90% and uses its own up throw. Compare the dashed gold line showing the original direction with your solid aqua launch line, then try a tech where you land. Choose Launch practice again to repeat the same throw. The **Defense** tab in the Move list illustrates the controls for every dog.

During impact freeze, flick a fresh direction to shift your dog’s position. A ground hit allows a sideways shift. An airborne dog can shift in eight directions. A held direction counts once when you first flick during the freeze. Center and flick again if the impact lasts long enough. Holding an angle as a strong hit releases still steers your launch.

In **Training → Combo escape**, tap Attack to cue Clover’s Rim Rattle. **At the tip**, wait out both swings to take 13%, then tap Attack to retry and flick left as the first hit sparks. A clean escape leaves you at 3%. Choose **Up close** and repeat the same flick to see how spacing changes the result. **Half speed** starts on. Toggle it off to practice at match speed.

**Wall tech.** When you tumble into a solid stage wall, tap Shield in the last 11 frames before impact to brace against it. Hold Jump at contact to spring up and away. Both recoveries preserve the air jump and Up Special you have left. A missed tech bounces you back into open air, still tumbling. Wall and landing techs share the same 28-frame lockout.

Choose **Training → Wall tech practice** to play Noodle at 90% in the gap on Laundry Line. Pip’s Back Heel hits you toward the brickwork. Try letting it hit the wall first, then use **Retry kick** to practice the Shield timing. **Switch wall** mirrors the exchange. **Reset positions** returns to your selected dogs and stage.

## The four fighters

Open **Move list → Attacks** on the select screen, in Training, or from Pause for each dog's ground combo, tilts, dash attack, ledge attack, and aerials.

| Dog | A combo to try | What to practice in the air |
| --- | --- | --- |
| **Pip** | Tap Attack three times for Quick Paw, Cross, and Heel Kick. For an aerial finish, use Jump + Forward + Attack as Cross connects. | Flying Kick bursts forward. Pogo Paw bounces off a successful downward hit once per airtime. |
| **Brisket** | Tap Attack for Body Check, then tap again on contact for Bell Ringer. Press Grab after the check, then tap back to suplex the rival over the ledge behind you. | Hip Check launches backward. Belly Drop stalls before plunging and can hit beside Brisket on landing. |
| **Noodle** | Ankle Tap into Reel In pulls the rival close. Finish with Whiplash or press Special during the pull to cast Tug Rope. | Slip Lead snags from the front, Tail Flick reaches behind, and Underhook lifts a rival from below. |
| **Clover** | Tap Attack twice for Disc Tap and Set Point. On the second hit, use Jump + Up + Attack for Sky Volley, or Jump + Attack for Orbit. | Orbit hits on two beats if the rival stays close. Skip Shot angles the disc downward for a spike. |

## Ground tilts

Aim with the movement keys, left stick, D-pad, or touch arrows and tap **Attack**. Use **J** for P1, **Comma** for P2, **X** on a standard gamepad, or the **Attack** button on touch. In Training, try all three next to the dummy, then take a step back to test their reach.

| Dog | Forward tilt | Up tilt | Down tilt |
| --- | --- | --- | --- |
| **Pip** | **Stamp Kick** snaps a heel straight out and recovers quickly. | **Chin Flick** pops the rival up. Press Jump + Forward + Attack on contact for Flying Kick. | **Dewclaw** rakes the ankles. Release Down and follow with a jab at close range. |
| **Brisket** | **Gate Check** shoves the rival toward the edge with a broad forearm. | **Crown Lift** catches a landing over either shoulder. | **Doorstop** stamps just ahead of Brisket and pops the rival up in front. |
| **Noodle** | **Knot Poke** deals 5% along the lead and 7% at the knot. | **Loop Lift** sends a narrow loop overhead to catch and lift a falling rival. | **Tail Broom** pops a grounded rival upward and knocks an airborne rival down at the ledge. |
| **Clover** | **One-Two Pass** checks with a paw for 2% and flicks the disc for 4% on the same tap. | **Canopy Tap** sends the rival nearly straight up with the flat of the disc. | **Backspin** hooks the rim inward and sends a close rival behind Clover. |

## Dash attacks

Hold left or right to get running, then press **Attack** once. Use **J** for P1, **Comma** for P2, **X** on a standard gamepad, or **Attack** on touch. In Training, back away from the dummy to give yourself a run-up.

| Dog | Dash attack | What to try |
| --- | --- | --- |
| **Pip** | **Grass Skid** | Slide in heel-first for a quick 7% kick. Its low launch and short recovery give you time to chase. |
| **Brisket** | **Yard Buster** | Time the shoulder to meet the rival early for 14%. A late brush deals 8%, and a miss leaves you open while Brisket brakes. |
| **Noodle** | **Lead Sweep** | Catch the rival from a lead's length away. The low sweep deals 6% and tugs them back toward your paws. |
| **Clover** | **Rim Rush** | Scoop low for 3%, then flick the disc upward for another 6%. Jump as the second hit connects to chase with an aerial. |

## Grabs, pummels and throws

Press **U** as P1, **M** as P2, **Y** on a gamepad, or **Grab** on touch. A catch goes through a shield. Once you catch the rival, tap **forward**, **back**, **up**, or **down** on your movement controls. Forward follows the way you faced when you caught them. Tapping Grab a second time also throws forward. If you get caught, tap action buttons to break free sooner. A more damaged rival takes longer to escape.

For a **dash grab**, hold a direction until your dog is running, then press Grab while moving toward the rival. For a **pivot grab**, run in one direction and press the opposite direction together with Grab, or press Grab just as you turn. If you're running right, **D + U** catches ahead and **A + U** catches behind. On touch, slide your movement thumb onto the opposite arrow as you tap Grab with your other thumb.

| Dog | Dash grab | Pivot grab |
| --- | --- | --- |
| **Pip** | **Tag Dash** reaches out quickly with one paw. | **Heel Hook** plants a heel and catches low with very little skid. |
| **Brisket** | **Freight Hug** carries a two-paw scoop forward. | **Gate Swing** opens wide behind him while his weight carries him onward. |
| **Noodle** | **Running Loop** casts the lead low and ahead. | **Backcast** sends the longest loop over his shoulder. |
| **Clover** | **Scoop Slide** skims the disc along the ground. | **Rim Turn** sweeps the rim high enough to catch a low jumper behind her. |

While holding a rival, tap **Attack** to pummel. Use **J** as P1, **Comma** as P2, **X** on a gamepad, or **Attack** on touch. Each hit leaves the rival in your grip. Tap again for another pummel or choose a throw during the strike. The escape timer keeps running, so a rival can break free if you go for one hit too many.

| Dog | Grab and pummel | Forward | Back | Up | Down |
| --- | --- | --- | --- | --- | --- |
| **Pip** | Collar Tag catches quickly at close range. **Paw Drum** taps with the free paw for 1%. | Kickoff boots the rival away. | Slip Turn flicks them low behind you. | Pop Fly sets up a jump into an aerial. | Tumble Trip sets up a dash after their fall. |
| **Brisket** | Bear Hug holds longest. **Bear Squeeze** slowly lifts and squeezes for 4%. | Yard Heave sends them in a heavy arc. | Backyard Suplex launches them over your shoulder. | Bench Press launches almost straight up. | Sit-Down Slam bounces them high off the floor. |
| **Noodle** | Lead Loop reels the rival in from a distance. **Knot Tug** jerks the lead inward for 2%. | Sling Cast releases at full lead length. | Reverse Reel flings them low behind you. | Flagpole lifts them to the top of the loop. | Slack Snap pulls them back toward your feet. |
| **Clover** | Disc Hook catches with the rim during a slide. **Rim Tap** bumps the rival upward for 3%. | Forehand Pass sends them on a flat line. | Bank Pass sends them high behind you. | Set Toss sets up a jumping Sky Volley. | Skip Toss skims them off the next platform they hit. |

Open **Move list → Grabs & throws** for each dog's illustrated moves. In Training, start beside the dummy, run a few steps away, then reverse and grab. After a pivot catch, forward throws the way you're now facing. For a down throw, try the edge and then the middle. Brisket and Clover both need a platform beneath the rival to get their bounce.

## Smash attacks

While grounded, aim sideways, up, or down and press **Smash**. Tap for an immediate swing, or hold to charge and release to strike. The direction locks when the windup begins. A neutral input gives a side smash in the direction you face. Full charge takes one second and adds 40% damage. At two seconds the move releases automatically. An opponent can interrupt the windup.

Use **I** for Player 1, **N** for Player 2, or the **Smash** button on a touchscreen. On a standard controller, aim with the left stick and hold **RT**, or hold the right stick in a direction and let it return to center. In **Training**, the readouts show the move, charge level, and damage.

| Dog | Side smash | Up smash | Down smash |
| --- | --- | --- | --- |
| **Pip** | **Bolt Kick** lunges forward with both feet. | **Scissor Kick** lifts the rival into a second rising kick. | **Dust Devil** kicks in front first, then delivers a stronger rear sweep. |
| **Brisket** | **Haymaker** is a slow, powerful straight punch. | **Roof Raiser** catches either side with a broad headbutt. | **Quake Stomp** sends a shockwave across the floor. It hits hardest near his paws. |
| **Noodle** | **Lead Snap** deals extra damage at the rope's knotted tip. | **Bell Pull** scoops a rival into an overhead rope snap. | **Switchback** sweeps low and flings the rival across Noodle to the opposite side. |
| **Clover** | **Line Drive** fires a straight disc. Charging increases its speed and range. | **Halo Lift** launches a rival highest when the top rim catches them overhead. | **Rim Rattle** spins low on both sides. The first pass sets up the second. |

Open **Move list → Smash attacks** for the illustrated moves.

## Ledge attacks

Once your dog catches a solid edge, tap **Attack** to climb and strike toward the stage. Use **J** for P1, **Comma** for P2, **X** on a standard gamepad, or **Attack** on touch. The direction comes from the ledge you caught.

| Dog | Ledge attack | What it does |
| --- | --- | --- |
| **Pip** | **Rail Kick** | Swings up on one paw for a quick, low 7% kick and a short recovery. |
| **Brisket** | **Porch Bump** | Hauls a shoulder over the lip for a 12% shove. A shield or a missed shoulder leaves time to punish. |
| **Noodle** | **Latch Whip** | Snaps the lead across the lip for 6% while his feet are still below the stage. It reels a distant rival toward where he lands. |
| **Clover** | **Rim Vault** | Springs over the lip and scoops with the disc for 8%. The rival goes up while Clover lands farther in. |

Choose **Training → Practice ledge attack** to start hanging with the dummy in reach. Choose **Left ledge** or **Right ledge** first to set the practice side. You can also do the recovery drill, catch the lip yourself, and tap Attack from there.

## Ledge climbs

Press toward the stage while hanging to climb. Pip pulls up in 26 frames, Clover in 29, Noodle in 31 and Brisket in 36. Each dog stays close to the lip and finishes facing the stage. A fresh catch protects the pull and leaves a short opening as the dog stands. A regrab before landing or taking a hit leaves the whole climb vulnerable. Hold Shield during the climb to guard on the first free frame.

In **Training → Ledge timing**, choose **Get up** to climb and shield the waiting dog's jab. Choose **Set the trap**, tap Attack to start, then jab as the rival plants their paws. An early swing misses and a late swing meets their shield. Both roles use your selected fighters. **Switch ledge** mirrors the setup and **Half speed** gives you more time to read the animation.

## Ledge rolls

While hanging, tap **Shield** to roll past a guard and turn back toward the ledge. Use **L** for P1, **Slash (/)** for P2, either gamepad bumper, or the **Shield** touch button. If you used Shield to air-dodge to the ledge, release it and tap again after the catch.

| Dog | Ledge roll | How to play it |
| --- | --- | --- |
| Pip | Rail Tuck | Shortest roll. Pip turns back in 23 frames, fast enough to jab a guard who swung at the lip. |
| Brisket | Porch Roll | Slow to tuck, then safe from hits and grabs on frames 4 through 19, the longest protected window. |
| Noodle | Slipknot Roll | Travels farthest. Noodle spends 16 frames unwinding at the endpoint, where a waiting guard can grab him. |
| Clover | Rim Cartwheel | Plants the disc at the lip and vaults past the guard. Covers more ground than Brisket and turns sooner. |

In **Training → Ledge roll practice**, **Close guard** swings at the lip. Roll past and tap Attack as your dog turns. **Read the roll** waits at the landing spot with a grab. Try jumping from the same position to make the grab miss. **Switch ledge** mirrors either setup.

## Ledge trumping

Catch the same lip as a hanging dog to take their place. A falling catch, a directional air dodge and Noodle’s Ledge Lasso can all do it. The displaced dog pops outward without taking damage and can jump, attack, or use a recovery special after the brief recoil. Rolling, jumping or dropping before the other dog arrives leaves the lip free.

Your first catch protects you for 15 frames. Let go and catch any ledge again during the same recovery and opponents can hit or grab you immediately. Landing on a platform or taking a hit restores protection for your next catch. You can still trump someone with a vulnerable regrab.

Open **Training → Contested ledge**. **Take the ledge** starts you outside a rival’s grip. Drift inward or use your recovery. **Defend the ledge** starts you hanging while the rival approaches. Wait for the bump, tap Shield to roll clear, or drop early and try a back air. Select Noodle as the dummy to practice against Ledge Lasso. **Switch ledge** mirrors both roles.

## Specials and recovery

Press Special alone for Neutral. Hold left or right, up, or down as you press Special for the other three moves. These inputs work on the ground and in the air. On touchscreens, ↖ and ↗ aim an Up Special toward the stage. Slide your thumb onto a side arrow to steer. In the **Move list**, choose **Specials & recovery** to see the timing and artwork for each move.

| Dog | Neutral | Side | Up | Down |
| --- | --- | --- | --- | --- |
| **Pip** | Snap Bark hits twice at close range. | Double Pounce earns one follow-up pounce on a clean hit. | Fence Hopper gives you two separately aimed leaps. | Dirt Slide slips under a rival and pops them upward. From the air it dives into the slide. |
| **Brisket** | Collar Toss scoops a rival through their shield. | Shoulder Charge drives forward with a heavy hit. | Hold Kennel Cannon to charge, then release for a steep launch. | Stand Firm counters a well-timed blow. A grab beats the stance. |
| **Noodle** | Tug Rope pulls the rival toward Noodle. | Slingshot hooks the rival and pulls Noodle toward them. | Ledge Lasso catches a nearby solid edge and reels Noodle in. Out of reach, it becomes a short hop and an overhead lash. | Trip Line sets a single-use snare on the first platform it touches, including the moving laundry basket. |
| **Clover** | Round Trip throws a disc that can hit going out and coming back. | Disc Chase dashes toward a nearby disc in the chosen direction and can catch it early. | Hold Disc Sail to glide and steer. Release to drop. | Skip Serve sends a low disc bouncing across platforms. |

In **Training**, choose **Left ledge** or **Right ledge**. The drill waits for Jump or Special, so you can read the recovery cue and aim first. With Pip, release and press Up + Special a second time to change course. With Brisket, drift close to the wall before launching. Noodle can hook the side of either roof at Laundry Line. Clover can use the glide to cross a gap and release over safe ground.

## Source and artwork

The editable game lives in `docs/`. Combat, physics, and the CPU are in `engine.js`. The match renderer is in `render.js`. The animated dogs and arenas are drawn in `fighters-art.js` and `arena-art.js`. Menus, controls, and synthesized sound are in `app.js`.

Each fighter is assembled from indexed pixel sprites. The roster, damage meter, and results screen take their portraits from that fighter's in-game artwork. All three arenas are drawn on a 400 × 225 pixel grid. The contact sparks, landing dust, and launch trails share a five-frame atlas in `docs/assets/fight-fx.png`. The Dog Fight 3 wordmark and Brawl Pixel display font are bundled with the game.
