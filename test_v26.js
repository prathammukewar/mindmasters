/* v26 E2E: the first minute and the share loop. The first-load screen, the
   shorter student sign-up on a phone, links that open a challenge or an
   assignment (for a brand-new visitor and for an existing account), a
   finished session turning into a playable challenge, and reply links */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const FILE = 'file://' + path.resolve('MindMasters_Academy.html');
  const ok = m => console.log('ok:', m);
  const fail = m => { console.log('FAIL:', m); process.exitCode = 1; };
  const errors = [];
  const watch = p => { p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('pageerror', e => errors.push(String(e))); return p; };
  const hashOf = link => link.slice(link.indexOf('#'));

  // ---- the first-load screen is plain HTML ahead of the script ----
  const html = fs.readFileSync('MindMasters_Academy.html', 'utf8');
  const boot = html.indexOf('class="bootload"'), script = html.indexOf('<script>');
  (boot > 0 && boot < script && html.slice(boot, boot + 900).includes('Getting 13,585 problems ready'))
    ? ok('loading screen sits in the page before the script, so it shows while the app downloads') : fail('bootload missing or after the script');

  const browser = await chromium.launch(process.env.MM_CHROMIUM ? { executablePath: process.env.MM_CHROMIUM } : {});

  // ---- phone: sign-up fits on one screen ----
  const phone = watch(await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage());
  await phone.goto(FILE); await phone.waitForTimeout(900);
  (await phone.$('.bootload')) ? fail('loading screen still showing after boot') : ok('loading screen is replaced by the first real screen');
  let w = await phone.evaluate(() => ({
    hidden: document.getElementById('pwSetup').classList.contains('hidden'),
    bottom: Math.round(document.getElementById('startBtn').getBoundingClientRect().bottom),
    toggle: !!document.getElementById('pwToggle'), vh: innerHeight
  }));
  (w.hidden && w.toggle) ? ok('student sign-up hides the optional password behind one button') : fail('pw block: ' + JSON.stringify(w));
  w.bottom <= w.vh ? ok('Start Training is on screen without scrolling on a phone (bottom at ' + w.bottom + ' of ' + w.vh + ')') : fail('start button below the fold: ' + JSON.stringify(w));
  await phone.click('#pwToggle'); await phone.waitForTimeout(200);
  w = await phone.evaluate(() => ({ hidden: document.getElementById('pwSetup').classList.contains('hidden'), focus: document.activeElement.id, toggle: !!document.getElementById('pwToggle') }));
  (!w.hidden && w.focus === 'pwInput' && !w.toggle) ? ok('the button reveals the password fields and focuses the first one') : fail('toggle: ' + JSON.stringify(w));
  await phone.click('.rolebtn[data-role="teacher"]'); await phone.waitForTimeout(250);
  w = await phone.evaluate(() => ({ hidden: document.getElementById('pwSetup').classList.contains('hidden'), toggle: !!document.getElementById('pwToggle') }));
  (!w.hidden && !w.toggle) ? ok('teacher sign-up still shows its required password') : fail('teacher pw: ' + JSON.stringify(w));

  // ---- student A plays a session; the result becomes a challenge link ----
  const signUp = async (p, name) => { await p.fill('#nameInput', name); await p.click('#startBtn'); await p.waitForTimeout(600); };
  const A = watch(await (await browser.newContext({ viewport: { width: 1000, height: 950 } })).newPage());
  await A.goto(FILE); await A.waitForTimeout(900);
  await signUp(A, 'Ada');
  (await A.evaluate(() => !!(Q && Q.isOnboard))) ? ok('with no link, a new student still gets the Welcome Quest') : fail('quest missing for a normal sign-up');
  await A.evaluate(() => { for (let i = 0; i < 3; i++) { grade(true, Q.entries[Q.i].item); nextQuestion(); } document.getElementById('obDone').click(); });
  await A.waitForTimeout(400);
  await A.evaluate(() => { startTrain('math'); const pat = [true, false, true, true, false, true, true, true, true, true]; for (let i = 0; i < 10; i++) { grade(pat[i], Q.entries[Q.i].item); nextQuestion(); } });
  await A.waitForTimeout(400);
  const share = await A.evaluate(() => {
    const text = resultShareText();
    const link = (text.match(/https?:\/\/\S+/) || [''])[0];
    const code = decodeURIComponent(link.split('#c=')[1] || '');
    const p = parseChallengeCode(code);
    return { text, link, score: p && p.score, n: p && p.refs.length, name: p && p.name, rec: p && S.challenges[challengeKey(p.refs)] };
  });
  (share.link.includes('#c=') && share.score === 3 && share.n === 5 && share.name === 'Ada')
    ? ok('sharing a result sends a challenge on the first five problems, scored 3 of 5') : fail('share: ' + JSON.stringify(share).slice(0, 200));
  (share.rec && share.rec.mine === 3 && share.rec.theirs === null) ? ok('the sender keeps a record so a reply can settle it') : fail('no challenge record: ' + JSON.stringify(share.rec));
  /I got 3 of the first five/.test(share.text) ? ok('share text: "' + share.text.slice(0, 74) + '..."') : fail('share text: ' + share.text);

  // ---- a brand-new visitor opens the link ----
  const B = watch(await (await browser.newContext({ viewport: { width: 1000, height: 950 } })).newPage());
  await B.goto(FILE + hashOf(share.link)); await B.waitForTimeout(900);
  const land = await B.evaluate(() => ({ note: (document.getElementById('linkNote') || {}).textContent || '', hash: location.hash }));
  (/Ada/.test(land.note) && /challenged you/.test(land.note) && land.hash === '') ? ok('the welcome screen says who sent the challenge: "' + land.note.slice(0, 50) + '..."') : fail('landing: ' + JSON.stringify(land));
  await signUp(B, 'Ben');
  const afterSign = await B.evaluate(() => ({ quest: !!(Q && Q.isOnboard), onboarded: S.onboarded, dialog: (document.querySelector('.mbox') || {}).textContent || '', tour: !!document.getElementById('tourov') }));
  (!afterSign.quest && afterSign.onboarded === 1 && /Accept this challenge/.test(afterSign.dialog) && !afterSign.tour)
    ? ok('after one name field the challenge is on screen, with no quest and no tour in the way') : fail('after sign-up: ' + JSON.stringify(afterSign).slice(0, 200));
  await B.click('#mmYes'); await B.waitForTimeout(400);
  const run = await B.evaluate(() => ({ mode: Q.isChallenge && Q.isChallenge.mode, n: Q.entries.length, count: document.querySelector('.qcount').textContent }));
  (run.mode === 'accept' && run.n === 5 && run.count === '1/5') ? ok('the friend plays the same five problems') : fail('run: ' + JSON.stringify(run));
  await B.evaluate(() => { for (let i = 0; i < 5; i++) { grade(true, Q.entries[Q.i].item); nextQuestion(); } });
  await B.waitForTimeout(500);
  const cmp = await B.evaluate(() => ({ text: document.getElementById('screen-root').textContent, reply: (document.querySelector('.mycode') || {}).textContent || '', btn: !!document.getElementById('shareReply') }));
  (/Victory/.test(cmp.text) && cmp.btn && /^MMC1-/.test(cmp.reply)) ? ok('5 beats 3: the friend sees Victory and a Send reply button') : fail('compare: ' + cmp.text.slice(0, 120));
  // a share sheet that exists but fails must not leave the user with nothing
  await B.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: () => Promise.reject(new DOMException('blocked', 'NotAllowedError')) }); });
  await B.click('#shareReply'); await B.waitForTimeout(600);
  /Copied/.test(await B.evaluate(() => document.getElementById('toasts').textContent)) ? ok('when the share sheet fails, Send reply copies the link instead') : fail('failed share left the user with nothing');
  await B.evaluate(() => { document.getElementById('toasts').innerHTML = ''; Object.defineProperty(navigator, 'share', { configurable: true, value: () => Promise.reject(new DOMException('closed', 'AbortError')) }); });
  await B.click('#shareReply'); await B.waitForTimeout(500);
  (await B.evaluate(() => document.getElementById('toasts').textContent)) === '' ? ok('closing the share sheet on purpose stays quiet') : fail('cancelled share still copied');

  // ---- the reply link, opened while A still has the app open ----
  await A.evaluate(c => { location.hash = '#c=' + encodeURIComponent(c); }, cmp.reply);
  await A.waitForTimeout(700);
  const settled = await A.evaluate(() => ({ text: document.getElementById('screen-root').textContent, hash: location.hash, recs: Object.values(S.challenges) }));
  (/Ben/.test(settled.text) && /So close/.test(settled.text) && settled.hash === '' && settled.recs.some(r => r.theirs === 5 && r.mine === 3))
    ? ok('the reply link settles it for the sender without a reload') : fail('settle: ' + settled.text.slice(0, 140));

  // ---- a teacher shares an assignment link ----
  const T = watch(await (await browser.newContext({ viewport: { width: 1000, height: 950 } })).newPage());
  await T.goto(FILE); await T.waitForTimeout(900);
  await T.click('.rolebtn[data-role="teacher"]'); await T.waitForTimeout(250);
  await T.fill('#nameInput', 'Coach T'); await T.fill('#pwInput', 'coachpass1'); await T.fill('#pwConfirm', 'coachpass1');
  await T.click('#startBtn'); await T.waitForTimeout(800);
  await T.click('#newClassBtn'); await T.waitForTimeout(250);
  await T.fill('#clsName', 'Room 5'); await T.click('#createBtn'); await T.waitForTimeout(400);
  const asg = await T.evaluate(() => {
    const cls = loadTS().classes[0];
    const tid = MATH_TOPICS[0].id;
    cls.assignments = cls.assignments || [];
    cls.assignments.push({ id: 'wk1abc', title: 'Week 1 warmup', due: '', probs: [[tid, 0], [tid, 1], [tid, 2]], ts: todayStr() });
    saveTS(); showAssignment(cls.id, 'wk1abc');
    return { btn: !!document.getElementById('copyAsgLink'), link: deepLinkFor('a', assignmentCode(cls, cls.assignments[cls.assignments.length - 1])) };
  });
  (asg.btn && asg.link.includes('#a=MMA1-')) ? ok('the assignment screen has a Share link button') : fail('teacher: ' + JSON.stringify(asg).slice(0, 160));
  await T.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); }); await T.click('#copyAsgLink'); await T.waitForTimeout(600);
  /Copied/.test(await T.evaluate(() => document.getElementById('toasts').textContent)) ? ok('Share link copies a ready-to-paste message') : fail('assignment share gave no confirmation');

  // ---- a new student taps the assignment link ----
  const C = watch(await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage());
  await C.goto(FILE + hashOf(asg.link)); await C.waitForTimeout(900);
  /Week 1 warmup/.test(await C.evaluate(() => (document.getElementById('linkNote') || {}).textContent || '')) ? ok('the welcome screen names the assignment') : fail('no assignment note on welcome');
  await signUp(C, 'Cy');
  let inAsg = await C.evaluate(() => ({ asg: Q && Q.isAssignment, quiz: !!document.querySelector('.quizhead'), n: Q && Q.entries.length, have: !!(S.assignments && S.assignments.wk1abc) }));
  (inAsg.asg === 'wk1abc' && inAsg.quiz && inAsg.n === 3 && inAsg.have) ? ok('one name field later the student is on problem 1 of the assignment') : fail('assignment landing: ' + JSON.stringify(inAsg));

  // ---- the same link again, for an account that already exists ----
  await C.goto('about:blank'); await C.goto(FILE + hashOf(asg.link)); await C.waitForTimeout(1100);
  inAsg = await C.evaluate(() => ({ asg: Q && Q.isAssignment, quiz: !!document.querySelector('.quizhead'), count: Object.keys(S.assignments).length }));
  (inAsg.asg === 'wk1abc' && inAsg.quiz && inAsg.count === 1) ? ok('opening it again goes back into the same assignment, no duplicate') : fail('reopen: ' + JSON.stringify(inAsg));

  // ---- a damaged link fails politely ----
  await C.goto('about:blank'); await C.goto(FILE + '#a=MMA1-bm90cmVhbA==-zzzz'); await C.waitForTimeout(1100);
  const bad = await C.evaluate(() => ({ home: !!document.querySelector('.todaycard'), toast: document.getElementById('toasts').textContent }));
  (bad.home && /did not work/.test(bad.toast)) ? ok('a damaged link lands on home with a plain explanation') : fail('bad link: ' + JSON.stringify(bad));

  errors.length === 0 ? ok('zero console errors') : fail('console errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(process.exitCode ? 'SUITE FAILED' : 'ALL v26 CHECKS PASSED');
})();
