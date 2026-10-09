// Trainingsplanner — app-schil, router en login.
import { store, isCoordinator } from "./store/index.js";
import { $, $$, esc, attr, ICON, toast, avatar, closeAllSheets } from "./lib/ui.js";
import { openSettings } from "./views/more.js";
import { openNotifications } from "./views/notifications.js";
import { unreadCount } from "./lib/notify.js";
import * as Today from "./views/today.js";
import * as Calendar from "./views/calendar.js";
import * as Groups from "./views/groups.js";
import * as Activities from "./views/activities.js";
import * as Drills from "./views/drills.js";
import * as More from "./views/more.js";
import * as Program from "./views/program.js";
import * as Competitions from "./views/competitions.js";

const VIEWS = { vandaag: Today, kalender: Calendar, groepen: Groups, programma: Program, activiteiten: Activities, wedstrijden: Competitions, drills: Drills, meer: More };
const NAV = [["vandaag", "Vandaag", "today"], ["kalender", "Kalender", "cal"], ["groepen", "Groepen", "groups"], ["programma", "Programma", "chart", "desk"], ["activiteiten", "Activiteiten", "flag"], ["drills", "Drills", "drills"]];
const cfg = window.TP_CONFIG || {};
let current = null;

export function go(view, params = {}) {
  const q = Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
  location.hash = "#/" + view + q;
}
export function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [view, qs] = h.split("?");
  return { view: VIEWS[view] ? view : "vandaag", params: Object.fromEntries(new URLSearchParams(qs || "")) };
}

function shell() {
  const me = store.me;
  const app = $("#app");
  app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#/vandaag"><span class="logo">T</span><span>${esc(cfg.appName || "Trainingsplanner")}<small>${esc(cfg.organisation || "")}</small></span></a>
    <span class="spacer"></span>
    ${store.mode === "demo" ? '<span class="demobadge">Demo</span>' : ""}
    <button class="hdricon" id="hdrBell" title="Meldingen" aria-label="Meldingen">${ICON.bell}<span class="badge hide" id="hdrBadge"></span></button>
    <button class="hdricon" id="hdrSettings" title="Instellingen" aria-label="Instellingen">${ICON.gear}</button>
    <button class="userbtn" id="hdrUser" title="Mijn profiel">${avatar(me)}<span><span class="nm">${esc(me.name)}</span><span class="rl">${me.is_coordinator && me.is_coach ? "Coördinator · Coach" : me.is_coordinator ? "Coördinator" : "Coach"}</span></span></button>
  </header>
  <main id="main"></main>
  <div class="subbar"><div class="subbar-in">${NAV.map(([k, l, ic, cls]) => `<button class="sbtn ${cls || ""}" data-nav="${k}" title="${l}" aria-label="${l}">${ICON[ic]}<span>${l}</span></button>`).join("")}</div></div>`;
  $("#hdrSettings", app).onclick = () => openSettings();
  $("#hdrBell", app).onclick = () => openNotifications();
  $("#hdrUser", app).onclick = () => openSettings("profiel");
  app.addEventListener("click", e => {
    const b = e.target.closest("[data-nav]"); if (!b) return;
    e.preventDefault(); closeAllSheets();
    go(b.dataset.nav, b.dataset.sub ? { sub: b.dataset.sub } : {});
  });
}

function render() {
  if (!store.me) { renderLogin(); return; }
  if (!$("#main")) shell();
  const { view, params } = route();
  if (view === "meer") { location.hash = "#/vandaag"; setTimeout(() => openSettings(params.sub), 80); return; }
  $$("[data-nav]").forEach(b => b.classList.toggle("on", b.dataset.nav === view));
  const bd = $("#hdrBadge"); if (bd) { const n = unreadCount(); bd.textContent = n; bd.classList.toggle("hide", !n); }
  current = view;
  const main = $("#main");
  try { VIEWS[view].render(main, params); } catch (err) { console.error(err); main.innerHTML = `<div class="card"><div class="warn">Er ging iets mis bij het tonen van deze pagina: ${esc(err.message)}</div></div>`; }
  window.scrollTo(0, 0);
}

function renderLogin() {
  const app = $("#app");
  const demo = store.mode === "demo";
  app.innerHTML = `<div class="login"><div class="card">
    <div class="brand"><span class="logo">T</span><span>${esc(cfg.appName || "Trainingsplanner")}<small>${esc(cfg.organisation || "")}</small></span></div>
    ${demo ? `
      <div class="cap">Demo-modus</div>
      <p class="small muted" style="margin:4px 0 0">Er is nog geen Supabase-koppeling ingesteld. Kies een coach om de app te verkennen; alle gegevens blijven in deze browser.</p>
      <div class="coachpick">${store.coachesForLogin().map(c => `<button data-coach="${attr(c.id)}">${avatar(c)}<span><span class="nm">${esc(c.name)}</span><br><span class="rl">${c.is_coordinator && c.is_coach ? "Coördinator · Coach" : c.is_coordinator ? "Coördinator" : "Coach"}</span></span></button>`).join("")}</div>
    ` : `
      <label class="fld">E-mailadres</label><input class="in" id="lgMail" type="email" autocomplete="username" placeholder="naam@almeerderhout.nl">
      <label class="fld">Wachtwoord</label><input class="in" id="lgPw" type="password" autocomplete="current-password">
      <div class="klvbtn" style="margin-top:16px"><button class="btn o" id="lgGo">Inloggen</button><button class="btn ghost" id="lgLink">Stuur inloglink</button></div>
      <div class="hint" id="lgMsg"></div>
    `}
  </div></div>`;
  if (demo) {
    $$("[data-coach]", app).forEach(b => b.onclick = async () => { await store.loginDemo(b.dataset.coach); render(); });
  } else {
    $("#lgGo").onclick = async () => { try { await store.login($("#lgMail").value.trim(), $("#lgPw").value); } catch (e) { $("#lgMsg").textContent = e.message; } };
    $("#lgLink").onclick = async () => { try { await store.magicLink($("#lgMail").value.trim()); $("#lgMsg").textContent = "Controleer je e-mail voor de inloglink."; } catch (e) { $("#lgMsg").textContent = e.message; } };
  }
}

window.addEventListener("hashchange", () => { closeAllSheets(); render(); });
store.onChange(() => { if (store.me && !$("#main")) { $("#app").innerHTML = ""; } if (!store.me && $("#main")) { $("#app").innerHTML = ""; } render(); });

(async function boot() {
  try { await store.init(); } catch (e) { console.error(e); toast("Kon gegevens niet laden"); }
  render();
})();
