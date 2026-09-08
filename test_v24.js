/* v24 E2E: the friendliness layer. Hover and keyboard tooltips, tap tooltips
   on touch, explanations on the Today card, profile tiles and quiz screen,
   the settings list, the keyboard hint, and the guided home tour */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch(process.env.MM_CHROMIUM ? { executablePath: process.env.MM_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1000, height: 950 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  const ok = m => console.log('ok:', m);
  const fail = m => { console.log('FAIL:', m); process.exitCode = 1; };
  await page.goto('file://' + path.resolve('MindMasters_Academy.html'));
  await page.waitForTimeout(1000);
  await page.fill('#nameInput', 'Zoe'); await page.click('#startBtn');
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => grade(true, Q.entries[Q.i].item));
    await page.waitForTimeout(150);
    await page.evaluate(() => nextQuestion());
    await page.waitForTimeout(150);
  }
  await page.click('#obDone');
  await page.waitForTimeout(900);

  // ---- automation never gets the auto tour; the home screen is usable ----
  (await page.$('#tourov')) ? fail('tour auto-started under automation') : ok('tour stays out of the way under automation');

  // ---- hover tooltips ----
  const tipCount = await page.evaluate(() => document.querySelectorAll('[data-tip]').length);
  tipCount >= 14 ? ok('home screen carries ' + tipCount + ' explanations') : fail('too few tips on home: ' + tipCount);
  await page.hover('#chipCoins');
  await page.waitForTimeout(600);
  let fl = await page.evaluate(() => ({ shown: document.getElementById('tipfloat').classList.contains('show'), text: document.getElementById('tipfloat').textContent }));
  (fl.shown && /Coins/.test(fl.text)) ? ok('hovering the coin chip explains coins') : fail('coin tip: ' + JSON.stringify(fl));
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);
  fl = await page.evaluate(() => document.getElementById('tipfloat').classList.contains('show'));
  !fl ? ok('tooltip hides when the mouse leaves') : fail('tooltip stuck open');

  // ---- keyboard focus shows the same explanation ----
  await page.focus('#trainMath');
  await page.waitForTimeout(150);
  fl = await page.evaluate(() => ({ shown: document.getElementById('tipfloat').classList.contains('show'), text: document.getElementById('tipfloat').textContent }));
  (fl.shown && /ten math problems/.test(fl.text)) ? ok('keyboard focus on Train shows its explanation') : fail('focus tip: ' + JSON.stringify(fl));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  (await page.evaluate(() => document.getElementById('tipfloat').classList.contains('show'))) ? fail('Escape did not hide the tip') : ok('Escape hides the tip');

  // ---- Today card and nav explanations ----
  const today = await page.evaluate(() => ({
    rows: document.querySelectorAll('.todayrow[data-tip]').length,
    streak: !!document.querySelector('.todaystreak [data-tip]'),
    nav: document.querySelectorAll('#bottomnav button[data-tip]').length,
    titles: document.querySelectorAll('.todaystreak [title]').length
  }));
  (today.rows >= 2 && today.streak && today.nav === 6 && today.titles === 0)
    ? ok('Today rows, streak counters and all six nav tabs explain themselves') : fail('today: ' + JSON.stringify(today));

  // ---- quiz: rating and difficulty explained, keyboard hint present ----
  await page.evaluate(() => { startTrain('math'); });
  await page.waitForTimeout(300);
  const quiz = await page.evaluate(() => ({
    meta: document.querySelectorAll('.probmeta [data-tip]').length,
    hint: !!document.querySelector('.keyhint'),
    hintShown: getComputedStyle(document.querySelector('.keyhint')).display
  }));
  (quiz.meta === 2 && quiz.hint && quiz.hintShown === 'block') ? ok('quiz explains rating and difficulty and shows the keyboard hint on desktop') : fail('quiz: ' + JSON.stringify(quiz));

  // ---- profile: settings list and stat explanations ----
  await page.evaluate(() => { Q = null; showProfile(); });
  await page.waitForTimeout(300);
  const prof = await page.evaluate(() => ({
    rows: document.querySelectorAll('.setrow').length,
    tiles: document.querySelectorAll('.stattile[data-tip]').length,
    danger: !!document.querySelector('.setrow.danger #resetBtn'),
    soundLabel: document.getElementById('soundBtn').textContent,
    soundAria: document.getElementById('soundBtn').getAttribute('aria-label')
  }));
  (prof.rows === 11 && prof.tiles >= 28 && prof.danger && prof.soundLabel === 'On' && prof.soundAria === 'Sounds: On')
    ? ok('settings list with ' + prof.rows + ' rows and ' + prof.tiles + ' explained stat tiles') : fail('profile: ' + JSON.stringify(prof));
  await page.click('#textBtn');
  await page.waitForTimeout(300);
  (await page.evaluate(() => document.getElementById('textBtn').textContent)) === 'Large' ? ok('text size toggle reads Large after one tap') : fail('text toggle label');

  // ---- guided tour ----
  await page.click('#tourBtn');
  await page.waitForTimeout(700);
  const t1 = await page.evaluate(() => {
    const spot = document.getElementById('tourspot').getBoundingClientRect();
    const hero = document.querySelector('.hero').getBoundingClientRect();
    return { open: !!document.getElementById('tourov'), title: document.getElementById('tourTitle').textContent,
      step: document.querySelector('.tourstep').textContent, onHero: Math.abs(spot.top - hero.top) < 12 && Math.abs(spot.left - hero.left) < 12,
      done: S.tourDone, focus: document.activeElement.id };
  });
  (t1.open && t1.title === 'This is you' && t1.step === '1 of 5' && t1.onHero && t1.done === 1 && t1.focus === 'tourNext')
    ? ok('tour opens on step 1 with the spotlight on the hero card and focus on Next') : fail('tour1: ' + JSON.stringify(t1));
  await page.click('#tourNext');
  await page.waitForTimeout(300);
  const t2 = await page.evaluate(() => ({ step: document.querySelector('.tourstep').textContent, title: document.getElementById('tourTitle').textContent }));
  (t2.step === '2 of 5' && /Today/.test(t2.title)) ? ok('Next advances to the Today card') : fail('tour2: ' + JSON.stringify(t2));
  for (let i = 0; i < 3; i++) { await page.click('#tourNext'); await page.waitForTimeout(250); }
  const t5 = await page.evaluate(() => ({ step: document.querySelector('.tourstep').textContent, next: !!document.getElementById('tourNext'), skip: document.getElementById('tourSkip').textContent }));
  (t5.step === '5 of 5' && !t5.next && t5.skip === 'Done') ? ok('last step offers Done') : fail('tour5: ' + JSON.stringify(t5));
  await page.click('#tourSkip');
  await page.waitForTimeout(200);
  (await page.$('#tourov')) ? fail('tour did not close') : ok('Done closes the tour');
  await page.evaluate(() => startHomeTour());
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  (await page.$('#tourov')) ? fail('Escape did not close the tour') : ok('Escape closes the tour');

  errors.length === 0 ? ok('zero console errors') : fail('console errors: ' + errors.join(' | '));
  await browser.close();
  console.log(process.exitCode ? 'SUITE FAILED' : 'ALL v24 CHECKS PASSED');
})();
