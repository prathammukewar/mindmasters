/* v25 E2E: the growth pieces. Landing page content and assets, link-preview
   tags in the app head, the welcome trust line, the Share button on results,
   the Invite a friend row, and the wording of what gets shared */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const ok = m => console.log('ok:', m);
  const fail = m => { console.log('FAIL:', m); process.exitCode = 1; };

  // ---- landing page and its images, straight from disk ----
  const landing = fs.readFileSync(path.resolve('about/index.html'), 'utf8');
  ['og:image', 'og:title', 'name="description"', 'href="../"', 'MindMasters_CoachQuickStart.pdf', 'id="tryone"', 'Add to Home Screen']
    .every(s => landing.includes(s)) ? ok('landing page has preview tags, app links, coach PDF and the sample problem') : fail('landing content incomplete');
  !landing.includes('—') ? ok('landing page has no em dashes') : fail('em dash in landing');
  const dims = f => { const d = fs.readFileSync(f); return [d.readUInt32BE(16), d.readUInt32BE(20)]; };
  const og = dims('about/img/og.png');
  (og[0] === 1200 && og[1] === 630) ? ok('link preview image is 1200 x 630') : fail('og.png dims: ' + og);
  ['home', 'quiz', 'chart', 'phone'].every(n => fs.existsSync('about/img/' + n + '.png')) ? ok('landing screenshots present') : fail('missing landing screenshot');

  const browser = await chromium.launch(process.env.MM_CHROMIUM ? { executablePath: process.env.MM_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1000, height: 950 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve('MindMasters_Academy.html'));
  await page.waitForTimeout(1000);

  // ---- app head: description and preview tags ----
  const head = await page.evaluate(() => ({
    desc: (document.querySelector('meta[name="description"]') || {}).content || '',
    ogImg: (document.querySelector('meta[property="og:image"]') || {}).content || '',
    card: (document.querySelector('meta[name="twitter:card"]') || {}).content || ''
  }));
  (head.desc.length > 80 && /og\.png$/.test(head.ogImg) && head.card === 'summary_large_image') ? ok('app head carries description and link-preview tags') : fail('head: ' + JSON.stringify(head));

  // ---- welcome: trust line (the about link only appears over http) ----
  const welcome = await page.evaluate(() => ({ trust: !!document.querySelector('.trustline'), about: !!document.getElementById('aboutLink') }));
  (welcome.trust && !welcome.about) ? ok('welcome screen shows the trust line and hides the about link on file://') : fail('welcome: ' + JSON.stringify(welcome));

  await page.fill('#nameInput', 'Leo'); await page.click('#startBtn');
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => grade(true, Q.entries[Q.i].item));
    await page.waitForTimeout(150);
    await page.evaluate(() => nextQuestion());
    await page.waitForTimeout(150);
  }
  await page.click('#obDone');
  await page.waitForTimeout(400);

  // ---- a finished session offers Share, with sensible wording ----
  await page.evaluate(() => { startTrain('math'); for (let i = 0; i < 10; i++) { grade(i !== 4, Q.entries[Q.i].item); nextQuestion(); } });
  await page.waitForTimeout(400);
  (await page.$('#shareBtn')) ? ok('results screen offers Share') : fail('no Share button on results');
  const txt = await page.evaluate(() => resultShareText());
  (/solved 9 of 10/.test(txt) && /math rating is \d+/.test(txt) && /mindmasters/.test(txt)) ? ok('share text: "' + txt.slice(0, 60) + '…"') : fail('share text: ' + txt);
  await page.evaluate(() => { delete navigator.share; });
  await page.click('#shareBtn');
  await page.waitForTimeout(500);
  const toastTxt = await page.evaluate(() => document.getElementById('toasts').textContent);
  /Copied/.test(toastTxt) ? ok('without a share sheet, Share copies the text and says so') : fail('toast: ' + toastTxt);

  // ---- profile: invite row ----
  await page.evaluate(() => { Q = null; showProfile(); });
  await page.waitForTimeout(300);
  const inv = await page.evaluate(() => ({ btn: !!document.getElementById('inviteBtn'), text: inviteShareText() }));
  (inv.btn && /free/.test(inv.text) && /mindmasters/.test(inv.text)) ? ok('Invite a friend row present with an invitation that includes the link') : fail('invite: ' + JSON.stringify(inv));

  errors.length === 0 ? ok('zero console errors') : fail('console errors: ' + errors.join(' | '));
  await browser.close();
  console.log(process.exitCode ? 'SUITE FAILED' : 'ALL v25 CHECKS PASSED');
})();
