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
