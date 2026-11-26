(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  function show(footworkPatterns,showDialog,startExercise) {
    const practiceGroups = [
      ['Movement','Footwork','footwork', footworkPatterns],
      ['Movement','Wavedash','wave',['back','platform']],
      ['Movement','Platforms','platform',['below','top','hold','ferry','shield-drop','layers']],
      ['Attack','Combo practice','combo',['example','confirm','throwChase','late','record','defend','mix','tapes','flurry','escapeFlurry']],
      ['Attack','Aerial spacing','spacing',['approach','retreat','landing','airPower','fastfall','sweet','cancel','footstool','footstoolTech','reverse','wavebounce']],
      ['Attack','Knockdowns','launch',['lock','bait','read','floor-spike','edge-spike']],
      ['Attack','Move freshness','freshness',['training','ko','rage','drive']],
      ['Defense','Combo escape','escape',['tip','close','counter','break','gripEscape','gripThrow','carry']],
      ['Defense','Shield pressure','shield',['kick','drop','crossup','strike','grab','counterGrab','dodgeTiming','breakEscape','breakPunish','jumpIn','low','high','poke']],
      ['Defense','Launch & survival','launch',['throw','juggle','breakaway','survival','last-stock','escape','stock-return','stock-catch']],
      ['Defense','Air dodge','air',['neutral','edge','lastDodge','interrupted','highReturn']],
      ['Recovery','Edgeguarding','edge',['lip','shortCatch','longCatch','tip','deep','corner','inside']],
      ['Recovery','Ledge recovery','ledge',['training','right','attack-training']],
      ['Recovery','Ledge timing','climb',['escape','trap','rise','coverRise','patience']],
      ['Recovery','Ledge roll','roll',['guard','read','scout']],
      ['Recovery','Contested ledge','trump',['take','defend','runoff','escape']],
      ['Recovery','Stage techs & wall jumps','wall',['training','impact','ceiling','pip','noodle']],
      ['Movement','Free practice','',['reset-training','partner-training']],
    ];
    const practiceAliases = {
      'combo-tapes':'recording share saved mixup defend attack sequence',
      'footwork-crawl':'Noodle Clover duck boomerang projectile skip serve', 'footwork-antiAir':'anti-air',
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
      'air-interrupted':'up special recovery hit reset return edgeguard',
      'air-highReturn':'offstage high recovery short hop forward aerial edgeguard rival',
      'trump-runoff':'ledge trump run off back aerial edgeguard follow up',
      'trump-escape':'ledge trump run off roll jump avoid edgeguard',
      'partner-training':'local two players sparring', 'reset-training':'free training dummy',
      'wall-ceiling':'ceiling tech under stage recovery Noodle Pip',
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
  window.PracticeDirectory={show};
})();
