const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {appendFileSync} = require('node:fs');
const {play} = require('./cup-full-run.js');
const {trial} = require('./cup-frame-times.js');
const {lastStockPractice} = require('./cup-relay.js');
const {chromium} = require('playwright-core');

const site = 'https://caleb-guyer.github.io/dog-fight-3/';
async function main() {
  const kind = process.argv[2];
  const browser = await chromium.launch({headless:true,
    executablePath:execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()});
  try {
    await play(browser,kind,site);
    if (kind !== 'pip') return;
    for(const device of ['keyboard','touch','controller']){
      await lastStockPractice(browser,device,site);
      console.log('::notice title=Published last-stock practice::'+device+' completed fighter select, loss, retry, win and round two.');
    }
    // Use separate, real-time browser contexts for timing. The route above uses a virtual clock.
    const samples = [];
    for (let i=0;i<3;i++) samples.push(await trial(browser,site,false));
    const median = key => Number(samples.map(s=>s[key]).sort((a,b)=>a-b)[1].toFixed(1));
    const result = {navigationToMovementMs:median('firstMove'),confirmToMovementMs:median('fromConfirm'),
      frameIntervalP95Ms:median('interval'),fightCallbackP95Ms:median('callback')};
    assert(samples.every(s=>s.reads<=3),'Repeated layout measurements during the live fight');
    const notes = 'Public GitHub Pages, Pip vs Noodle on Picnic Table. Hosted Chrome '+browser.version()+
      ', Ubuntu 24.04, 390×844 viewport, 4× CPU throttling. Median of three fresh browser contexts. '+
      'Each trial entered from fighter select and measured 240 fight frames. Movement timing includes the match countdown.';
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,notes+'\n\n```json\n'+JSON.stringify({result,samples},null,2)+'\n```\n');
    console.log('::notice title=Pages Cup timing::'+JSON.stringify(result));
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);console.log('::error::'+String(error.stack).replaceAll('\n','%0A'));process.exitCode=1;});
