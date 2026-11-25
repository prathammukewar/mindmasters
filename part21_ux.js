/* ================= UX LAYER: hover explanations and the guided tour =================
   Any element with a data-tip attribute gets a floating explanation on hover
   and on keyboard focus. On touch screens, tapping a non-button element with a
   tip shows it for a moment. The guided tour spotlights parts of the home
   screen for a new student. Functions only; part4 calls initTooltips() at
   boot and maybeHomeTour() from showHome(). */

let TIPF = null;
function hideTooltip() {
  if (!TIPF) return;
  clearTimeout(TIPF.timer);
  TIPF.timer = null;
  TIPF.el.classList.remove("show");
  TIPF.cur = null;
}
function placeTooltip(target) {
  const fl = TIPF.el;
  const r = target.getBoundingClientRect();
  fl.style.left = "0px"; fl.style.top = "0px";
  const w = fl.offsetWidth, h = fl.offsetHeight;
  let x = r.left + r.width / 2 - w / 2;
  x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
  let y = r.top - h - 10, above = true;
  if (y < 8) { y = r.bottom + 10; above = false; }
  fl.style.left = x + "px"; fl.style.top = y + "px";
  fl.classList.toggle("below", !above);
  fl.style.setProperty("--ax", Math.round(r.left + r.width / 2 - x) + "px");
}
function showTooltip(target, delay) {
  const text = target.getAttribute("data-tip");
  if (!text || !TIPF) return;
  clearTimeout(TIPF.timer);
  TIPF.timer = setTimeout(() => {
    TIPF.cur = target;
    TIPF.el.textContent = text;
    TIPF.el.classList.add("show");
    placeTooltip(target);
  }, delay);
}
function initTooltips() {
  if (TIPF) return;
  const fl = document.createElement("div");
  fl.id = "tipfloat";
  fl.setAttribute("role", "tooltip");
  document.body.appendChild(fl);
  TIPF = { el: fl, timer: null, cur: null };
  const tipOf = e => (e.target && e.target.closest) ? e.target.closest("[data-tip]") : null;
  document.addEventListener("mouseover", e => {
    const t = tipOf(e);
    if (t && t !== TIPF.cur) showTooltip(t, 320);
  });
  document.addEventListener("mouseout", e => {
    const t = tipOf(e);
    if (!t) return;
    if (e.relatedTarget && t.contains(e.relatedTarget)) return;
    hideTooltip();
  });
  document.addEventListener("focusin", e => { const t = tipOf(e); if (t) showTooltip(t, 0); });
  document.addEventListener("focusout", hideTooltip);
  document.addEventListener("scroll", hideTooltip, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideTooltip(); });
  document.addEventListener("click", e => {
    const t = tipOf(e);
    if (!t) { if (TIPF.cur) hideTooltip(); return; }
    const interactive = t.matches("button,a,[role=button],input,select,textarea") || !!t.closest("button,a,[role=button]");
    if (window.matchMedia("(hover: none)").matches && !interactive) {
      clearTimeout(TIPF.timer);
      TIPF.cur = t;
      fl.textContent = t.getAttribute("data-tip");
      fl.classList.add("show");
      placeTooltip(t);
      TIPF.timer = setTimeout(hideTooltip, 2600);
    }
  });
}

/* ---- guided tour: a spotlight and a small card, one step at a time ---- */
let TOUR = null;
function endTour() {
  if (TOUR && TOUR.onResize) window.removeEventListener("resize", TOUR.onResize);
  const ov = document.getElementById("tourov");
  if (ov) ov.remove();
  const done = TOUR && TOUR.onDone;
  TOUR = null;
  if (done) done();
}
function startTour(steps, onDone) {
  if (TOUR) endTour();
  hideTooltip();
  const ov = document.createElement("div");
  ov.className = "tourov"; ov.id = "tourov";
  ov.innerHTML = '<div class="tourspot" id="tourspot"></div>' +
    '<div class="tourcard" id="tourcard" role="dialog" aria-modal="true" aria-labelledby="tourTitle"></div>';
  document.body.appendChild(ov);
  TOUR = { steps, i: 0, onDone, onResize: null };
  TOUR.onResize = () => tourPlace();
  window.addEventListener("resize", TOUR.onResize);
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { document.removeEventListener("keydown", esc); endTour(); }
  });
  tourStep();
}
function tourPlace() {
  if (!TOUR) return;
  const st = TOUR.steps[TOUR.i];
  const el = st.sel ? document.querySelector(st.sel) : null;
  const spot = document.getElementById("tourspot"), card = document.getElementById("tourcard");
  if (!spot || !card) return;
  if (el) {
    const r = el.getBoundingClientRect();
    spot.style.display = "block";
    spot.style.left = (r.left - 6) + "px"; spot.style.top = (r.top - 6) + "px";
    spot.style.width = (r.width + 12) + "px"; spot.style.height = (r.height + 12) + "px";
    let y = r.bottom + 14;
    if (y + card.offsetHeight > window.innerHeight - 80) y = Math.max(8, r.top - card.offsetHeight - 14);
    card.style.top = y + "px";
  } else {
    spot.style.display = "none";
    card.style.top = "28%";
  }
}
function tourStep() {
  if (!TOUR) return;
  const st = TOUR.steps[TOUR.i];
  const el = st.sel ? document.querySelector(st.sel) : null;
  const last = TOUR.i === TOUR.steps.length - 1;
  const card = document.getElementById("tourcard");
  card.innerHTML =
    '<div class="tourstep">' + (TOUR.i + 1) + ' of ' + TOUR.steps.length + '</div>' +
    '<h3 id="tourTitle">' + st.title + '</h3><p>' + st.text + '</p>' +
    '<div class="tourrow">' +
      '<button class="btn ghost small" id="tourSkip">' + (last ? "Done" : "Skip tour") + '</button>' +
      (last ? '' : '<button class="btn gold small" id="tourNext">Next</button>') +
    '</div>';
  if (el) el.scrollIntoView({ block: "center", behavior: "auto" });
  tourPlace();
  document.getElementById("tourSkip").addEventListener("click", endTour);
  const nx = document.getElementById("tourNext");
  if (nx) nx.addEventListener("click", () => { TOUR.i++; tourStep(); });
  (nx || document.getElementById("tourSkip")).focus();
}

function homeTourSteps() {
  return [
    { sel: ".hero", title: "This is you", text: "Every solved problem earns XP toward the next level. Your math and chess ratings show how strong you are right now, and they climb as you win." },
    { sel: ".todaycard", title: "Your Today card", text: "A short checklist for today. Finish the Daily Challenge and solve ten problems to unlock a mystery chest." },
    { sel: "#trainMath", title: "One tap to train", text: "Train picks ten problems that match your rating, so a session is never too easy or too hard." },
    { sel: "#goChess", title: "Chess is here", text: "Puzzles, drills against the engine, and full games. It has its own Train button." },
    { sel: '#bottomnav button[data-nav="profile"]', title: "Your profile", text: "Your stats, your rating chart, settings like text size, and a backup of your progress. Anywhere in the app, rest on something or tap a small i to learn what it does." }
  ];
}
function startHomeTour() {
  S.tourDone = 1;
  save();
  startTour(homeTourSteps());
}
function maybeHomeTour() {
  if (!S.name || !S.onboarded || S.tourDone) return;
  if (navigator.webdriver) return;   // automated browsers skip the guided tour
  setTimeout(() => { if (document.querySelector(".todaycard") && !TOUR) startHomeTour(); }, 700);
}


/* ---- sharing: a result, a rating, or an invitation ---- */
function appShareUrl() {
  if (/^https?:$/.test(location.protocol)) return location.origin + location.pathname.replace(/[^/]*$/, "");
  return "https://prathammukewar.github.io/mindmasters/";
}
function shareText(text, title) {
  const done = () => toast("\u2713", "Copied. Paste it in a message to share.");
  const copy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  };
  if (typeof navigator.share === "function") {
    // closing the share sheet is a choice; any other failure falls back to copying
    navigator.share({ title: title || "MindMasters Academy", text }).catch(e => { if (!e || e.name !== "AbortError") copy(); });
    return;
  }
  copy();
}
function resultShareText() {
  const total = Q.entries.length;
  const track = Q.track === "math" ? "math" : "chess";
  const base = "I just solved " + Q.correctThisRun + " of " + total + " in a MindMasters Academy " + track + " session. My " + track + " rating is " + eloOf(Q.track) + ".";
  const ch = sessionChallenge();
  if (ch) return base + " I got " + ch.score + " of the first five. Same five for you, see if you can beat that: " + deepLinkFor("c", ch.code);
  return base + " Free contest practice: " + appShareUrl();
}
function inviteShareText() {
  const r = mindRating();
  return "Come train with me on MindMasters Academy: real AMC and AIME problems, chess puzzles, and a rating that climbs." +
    (r.ready ? " My Mind Rating is " + r.val + "." : "") + " It is free: " + appShareUrl();
}

/* ---- links that open straight into an assignment or a challenge ----
   A link is the app address plus #a=<assignment code> or #c=<challenge code>.
   The code rides in the fragment, so it never reaches a server. It waits in
   sessionStorage through sign-up or login, and opens from the home screen. */
function deepLinkFor(kind, code) { return appShareUrl() + "#" + kind + "=" + encodeURIComponent(code); }
function captureDeepLink() {
  const m = String(location.hash || "").match(/^#(a|c)=(.+)$/);
  if (!m) return false;
  let code;
  try { code = decodeURIComponent(m[2]); } catch (e) { return false; }
  _ssSet("mm_link", m[1] + ":" + code);
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  return true;
}
function pendingDeepLink() {
  const v = _ssGet("mm_link");
  return v && v.length > 2 ? { kind: v[0], code: v.slice(2) } : null;
}
function deepLinkNote(where) {
  const link = pendingDeepLink();
  if (!link) return "";
  const next = where === "login" ? "Choose your account to open it." : "Enter your name and it opens right away.";
  let msg = "You opened a MindMasters link. " + next;
  if (link.kind === "a") {
    const a = parseAssignmentCode(link.code);
    if (a) msg = "Your teacher sent you an assignment: <b>" + esc(a.title) + "</b>. " + next;
  } else {
    const p = parseChallengeCode(link.code);
    if (p) msg = "<b>" + esc(p.name) + "</b> challenged you to five problems. " + next;
  }
  return '<div class="linknote" id="linkNote">' + msg + '</div>';
}
function consumeDeepLink() {
  const link = pendingDeepLink();
  if (!link || !S.name) return false;
  _ssDel("mm_link");
  if (link.kind === "a") {
    const a = parseAssignmentCode(link.code);
    if (!a) { toast("!", "That assignment link did not work. Ask your teacher to send it again."); return false; }
    const fresh = acceptAssignment(a, "code");
    toast("\u2713", fresh ? "Assignment added: " + esc(a.title) + "." : "You already have this assignment. Here it is.");
    showAssignmentPlay(a.id);
    return true;
  }
  if (!parseChallengeCode(link.code)) { toast("!", "That challenge link did not work. Ask your friend to send it again."); return false; }
  acceptChallengeInput(link.code);
  return true;
}
function initDeepLinks() {
  captureDeepLink();
  window.addEventListener("hashchange", () => {
    if (!captureDeepLink()) return;
    if (typeof S === "undefined" || !S.name || Store.get("mm_role", "student") === "teacher") return;
    if (document.querySelector(".quizhead")) { toast("i", "Link saved. It opens when you are back on the home screen."); return; }
    showHome();
  });
}
/* the first five problems of a finished math session, packed as a challenge a friend can play */
function sessionChallenge() {
  if (!Q || Q.track !== "math" || Q.isDaily || Q.isReview || Q.isAssignment || Q.isChallenge) return null;
  const five = Q.entries.filter(e => typeof e.ok === "boolean").slice(0, 5);
  if (five.length < 5) return null;
  const refs = five.map(e => [e.tid || Q.topicId, e.gi]);
  if (!refs.every(r => refItem(r))) return null;
  const score = five.filter(e => e.ok).length;
  S.challenges = S.challenges || {};
  const key = challengeKey(refs);
  if (!S.challenges[key]) { S.challenges[key] = { vs: "", mine: score, theirs: null, total: 5, d: todayStr() }; save(); }
  return { code: challengeCode((S.name || "Player").replace(/\|/g, " ").slice(0, 20), refs, S.challenges[key].mine), score: S.challenges[key].mine };
}
