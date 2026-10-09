// Meer: profiel, coaches (coördinator), instellingen (seizoenen, vakanties, locaties, typen), gegevens.
import { store, isCoordinator, coachById } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, refreshSheet, shead, toast, avatar, val, xbtn, confirmInline, ICON, kpi, downloadText, tile } from "../lib/ui.js";
import { DAGEN, DAGEN_LANG, fmtDate, fmtRange, todayISO, weekStart, addDays, isoWeek, daysBetween } from "../lib/dates.js";
import { coachesActive, locationsSorted, sessionsIn, hoursOf, groupsSorted } from "../lib/model.js";
import { buildIcs } from "../lib/ics.js";
import { planFor } from "../lib/generator.js";
import { openRequests } from "../lib/notify.js";
import { mainLabel } from "./drills.js";
import { TAXONOMY } from "../data/taxonomy.js";

const cfg = window.TP_CONFIG || {};
const COLORS = ["#F47C20", "#4A6FA5", "#17a05c", "#8E6BB5", "#C2383A", "#2A9D8F", "#7A7F85", "#B5832A", "#D96A9C", "#2B2F33"];

export function render(main, params) {
  const me = store.me; const coord = isCoordinator();
  if (params && params.sub === "profiel") { history.replaceState(null, "", "#/meer"); openProfile(me.id); }
  const today = todayISO(); const ws = weekStart(today);
  const monthStart = today.slice(0, 8) + "01"; const monthEnd = addDays(today.slice(0, 5) + String(+today.slice(5, 7) + 1).padStart(2, "0") + "-01", -1);
  const myMonth = sessionsIn(monthStart, monthEnd > today ? monthEnd : today, { coach_id: me.id }).filter(s => s.date <= today && s.status !== "afgelast");
  main.innerHTML = `
  <div class="spkop"><h1>Meer</h1>${kpi([[hoursOf(myMonth), "uur deze maand"], [myMonth.length, "sessies"], [coachesActive().length, "coaches"]])}</div>
  <div class="grid">
    <div class="card"><div class="chead"><h2>Ik</h2></div>
      <button class="setrow" data-open="profiel">${avatar(me)}<span><div class="t">${esc(me.name)}</div><div class="d">${me.is_coordinator && me.is_coach ? "Coördinator · Coach" : me.is_coordinator ? "Coördinator" : "Coach"} · ${esc(me.email || "")}</div></span><span class="chev">›</span></button>
      <a class="setrow" href="#/activiteiten"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.flag}</span><span><div class="t">Activiteiten</div><div class="d">Wedstrijden, clinics, overleg en andere events</div></span><span class="chev">›</span></a>
      <button class="setrow" data-open="uren"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.today}</span><span><div class="t">Mijn uren</div><div class="d">Overzicht per maand, exporteerbaar als CSV</div></span><span class="chev">›</span></button>
      <button class="setrow" id="mLogout"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.back}</span><span><div class="t">Uitloggen</div><div class="d">${store.mode === "demo" ? "Terug naar de coachkeuze" : "Op dit apparaat"}</div></span></button>
    </div>
    ${coord ? `<div class="card"><div class="chead"><h2>Beheer</h2><span class="hdnote">coördinator</span></div>
      <button class="setrow" data-open="coaches"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.groups}</span><span><div class="t">Coaches</div><div class="d">Profielen, rechten, uitnodigen</div></span><span class="chev">›</span></button>
      <button class="setrow" data-open="seizoenen"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.cal}</span><span><div class="t">Seizoenen & vakanties</div><div class="d">Periodes waarin trainingen vervallen</div></span><span class="chev">›</span></button>
      <button class="setrow" data-open="locaties"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.pin}</span><span><div class="t">Locaties</div><div class="d">${locationsSorted().map(l => esc(l.short || l.name)).join(", ")}</div></span><span class="chev">›</span></button>
      <button class="setrow" data-open="typen"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.flag}</span><span><div class="t">Groepstypen & activiteiten</div><div class="d">Namen en kleuren in de kalender</div></span><span class="chev">›</span></button>
      <button class="setrow" data-open="bezetting"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.drills}</span><span><div class="t">Bezetting & uren team</div><div class="d">Uren per coach, per maand</div></span><span class="chev">›</span></button>
    </div>` : ""}
    <div class="card"><div class="chead"><h2>Gegevens</h2><span class="hdnote">${store.mode === "demo" ? "demo · lokaal in deze browser" : "Supabase · gedeeld"}</span></div>
      <button class="setrow" id="mExport"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.dl}</span><span><div class="t">Back-up downloaden</div><div class="d">Alle gegevens als JSON</div></span></button>
      ${store.mode === "demo" ? `<button class="setrow" id="mReset"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON.trash}</span><span><div class="t">Demo opnieuw instellen</div><div class="d">Terug naar de voorbeelddata</div></span></button>` : ""}
      <div class="hint" style="padding:10px 2px 0">${esc(cfg.appName || "Trainingsplanner")} · fase 1 · ${esc(cfg.organisation || "")}${store.mode === "demo" ? "<br>Koppel Supabase via js/config.js om met het hele team te werken (zie README)." : ""}</div>
    </div>
  </div>`;
  main.onclick = e => {
    const o = e.target.closest("[data-open]"); if (!o) return;
    ({ profiel: () => openProfile(me.id), uren: () => openHours(me.id), coaches: openCoaches, seizoenen: openSeasons, locaties: openLocations, typen: openTypes, bezetting: openTeamHours })[o.dataset.open]();
  };
  $("#mLogout", main).onclick = () => store.logout();
  $("#mExport", main).onclick = () => { const all = {}; ["coaches", "members", "group_members", "seasons", "breaks", "locations", "group_types", "activity_types", "groups", "schedule_rules", "overrides", "logs", "attendance", "action_items", "drills"].forEach(t => all[t] = store.rows(t)); downloadText("trainingsplanner-backup-" + today + ".json", JSON.stringify(all, null, 1), "application/json"); };
  const rs = $("#mReset", main); if (rs) rs.onclick = () => confirmInline(main.querySelector(".card:last-child"), "Alle demo-gegevens terugzetten naar de voorbeelddata?", async () => { await store.resetDemo(); toast("Demo opnieuw ingesteld"); }, "Terugzetten");
}

/* ---------- Profiel ---------- */
export function openProfile(cid) {
  openSheet(sh => {
    const c = store.byId("coaches", cid); if (!c) return;
    const self = c.id === store.me.id; const coord = isCoordinator(); const canEdit = self || coord;
    const av = c.availability || {};
    sh.innerHTML = shead(c.name, `${c.is_coordinator && c.is_coach ? "Coördinator · Coach" : c.is_coordinator ? "Coördinator" : "Coach"}${c.active === false ? ' <span class="st bad">inactief</span>' : ""}`, canEdit ? xbtn("edit", 'id="pfEdit"') : "") + `
    <div class="card"><div class="tiles">
      <div class="tile"><div class="lb">E-mail</div><div class="s" style="color:var(--ink);word-break:break-all">${esc(c.email || "—")}</div></div>
      <div class="tile"><div class="lb">Telefoon</div><div class="s" style="color:var(--ink)">${esc(c.phone || "—")}</div></div>
      <div class="tile"><div class="lb">Specialisaties</div><div class="s" style="color:var(--ink)">${(c.specialisaties || []).map(esc).join(", ") || "—"}</div></div>
    </div></div>
    <div class="card"><div class="chead"><h2>Beschikbaarheid</h2><span class="hdnote">standaard per week</span></div>
      ${[1, 2, 3, 4, 5, 6, 0].map(w => `<div class="rij"><span class="tm" style="min-width:90px">${DAGEN_LANG[w]}</span><span class="grow small ${av[w] ? "" : "muted"}">${av[w] ? av[w][0] + " – " + av[w][1] : "niet beschikbaar"}</span></div>`).join("")}
    </div>
    <div class="card"><div class="chead"><h2>Groepen</h2></div>${groupsSorted().filter(g => (g.coach_ids || []).includes(c.id)).map(g => `<div class="rij"><span class="grow tt" style="font-weight:500">${esc(g.name)}</span></div>`).join("") || '<div class="empty">Geen vaste groepen.</div>'}</div>`;
    const ed = $("#pfEdit", sh); if (ed) ed.onclick = () => openCoachForm(cid);
  });
}
export function openCoachForm(cid) {
  const ex = cid ? store.byId("coaches", cid) : null;
  const d = ex ? JSON.parse(JSON.stringify(ex)) : { name: "", email: "", phone: "", color: COLORS[store.rows("coaches").length % COLORS.length], is_coordinator: false, is_coach: true, specialisaties: [], active: true, availability: { 1: ["09:00", "21:00"], 2: ["09:00", "21:00"], 3: ["09:00", "21:00"], 4: ["09:00", "21:00"], 5: ["09:00", "21:00"], 6: ["08:00", "17:00"], 0: null } };
  if (!d.availability) d.availability = {};
  const coord = isCoordinator(); const self = ex && ex.id === store.me.id;
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Profiel bewerken" : "Nieuwe coach", ex ? esc(ex.name) : "De coach logt in met dit e-mailadres", ex && coord && !self ? xbtn("trash", 'id="cfDel"', "danger") : "") + `
    <div class="card">
      <div class="f2"><div><label class="fld" style="margin-top:0">Naam</label><input class="in" id="cfName" value="${attr(d.name)}"></div><div><label class="fld" style="margin-top:0">E-mail</label><input class="in" id="cfMail" type="email" value="${attr(d.email || "")}" ${ex && !coord ? "disabled" : ""}></div></div>
      <div class="f2"><div><label class="fld">Telefoon</label><input class="in" id="cfPhone" value="${attr(d.phone || "")}"></div><div><label class="fld">Kleur in kalender</label><div class="pick" id="cfColor">${COLORS.map(k => `<button data-v="${k}" class="${d.color === k ? "on" : ""}" style="width:28px;padding:0;justify-content:center"><span style="width:14px;height:14px;border-radius:50%;background:${k};display:inline-block"></span></button>`).join("")}</div></div></div>
      <label class="fld">Specialisaties (komma-gescheiden)</label><input class="in" id="cfSpec" value="${attr((d.specialisaties || []).join(", "))}" placeholder="bv. jeugd, putten, beginners">
      ${coord ? `<div class="sw" style="margin-top:12px"><div><div class="t">Coördinator</div><div class="d">Roosters, groepen, coaches en instellingen beheren</div></div><button class="toggle ${d.is_coordinator ? "on" : ""}" id="cfCoord" ${self ? "disabled" : ""}></button></div>
      <div class="sw"><div><div class="t">Coach</div><div class="d">Krijgt trainingen toegewezen en logt lessen</div></div><button class="toggle ${d.is_coach ? "on" : ""}" id="cfCoach"></button></div>
      ${ex && !self ? `<div class="sw"><div><div class="t">Actief</div><div class="d">Inactieve coaches kunnen niet inloggen en worden niet ingeroosterd</div></div><button class="toggle ${d.active !== false ? "on" : ""}" id="cfActive"></button></div>` : ""}` : ""}
    </div>
    <div class="card"><div class="chead"><h2>Beschikbaarheid</h2><span class="hdnote">standaard per weekdag</span></div>
      ${[1, 2, 3, 4, 5, 6, 0].map(w => { const a = d.availability[w]; return `<div class="rij"><button class="toggle ${a ? "on" : ""}" data-avd="${w}" style="width:36px;height:20px"></button><span class="tm" style="min-width:80px">${DAGEN_LANG[w]}</span><input class="in" type="time" data-avf="${w}" value="${a ? a[0] : "09:00"}" style="width:110px;height:32px" ${a ? "" : "disabled"}><span class="muted">–</span><input class="in" type="time" data-avt="${w}" value="${a ? a[1] : "21:00"}" style="width:110px;height:32px" ${a ? "" : "disabled"}></div>`; }).join("")}
    </div>
    <div class="klvbtn"><button class="btn o" id="cfSave">${ex ? "Opslaan" : "Coach toevoegen"}</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#cfColor", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; d.color = b.dataset.v; $$("button", e.currentTarget).forEach(x => x.classList.toggle("on", x === b)); };
    ["cfCoord", "cfCoach", "cfActive"].forEach(id => { const t = $("#" + id, sh); if (t) t.onclick = () => t.classList.toggle("on"); });
    sh.querySelectorAll("[data-avd]").forEach(t => t.onclick = () => { const w = t.dataset.avd; t.classList.toggle("on"); const on = t.classList.contains("on"); $(`[data-avf="${w}"]`, sh).disabled = !on; $(`[data-avt="${w}"]`, sh).disabled = !on; });
    const del = $("#cfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Coach verwijderen? Zet liever op inactief als er historie is.", async () => { await store.remove("coaches", cid); closeSheet(); closeSheet(); toast("Coach verwijderd"); });
    $("#cfSave", sh).onclick = async () => {
      const name = val("cfName", sh); if (!name) { toast("Vul een naam in"); return; }
      const avail = {}; [0, 1, 2, 3, 4, 5, 6].forEach(w => { const on = $(`[data-avd="${w}"]`, sh).classList.contains("on"); avail[w] = on ? [$(`[data-avf="${w}"]`, sh).value, $(`[data-avt="${w}"]`, sh).value] : null; });
      const row = { ...d, name, email: $("#cfMail", sh).disabled ? d.email : val("cfMail", sh), phone: val("cfPhone", sh), specialisaties: val("cfSpec", sh).split(",").map(x => x.trim()).filter(Boolean), availability: avail };
      const tc = $("#cfCoord", sh); if (tc) row.is_coordinator = tc.classList.contains("on"); const th = $("#cfCoach", sh); if (th) row.is_coach = th.classList.contains("on"); const ta = $("#cfActive", sh); if (ta) row.active = ta.classList.contains("on");
      if (!row.is_coordinator && !row.is_coach) { toast("Kies minstens één rol"); return; }
      if (!row.id) delete row.id;
      await store.save("coaches", row); closeSheet(); toast(ex ? "Profiel opgeslagen" : "Coach toegevoegd" + (store.mode === "supabase" ? " — nodig uit via Supabase Auth of laat de coach een inloglink aanvragen" : "")); refreshSheet();
    };
  });
}

/* ---------- Coaches ---------- */
function openCoaches() {
  openSheet(sh => {
    const list = store.rows("coaches").slice().sort((a, b) => a.name.localeCompare(b.name));
    const today = todayISO(); const ws = weekStart(today);
    sh.innerHTML = shead("Coaches", `${list.filter(c => c.active !== false).length} actief`, xbtn("plus", 'id="chAdd" title="Coach toevoegen"')) + `
    <div class="card">${list.map(c => { const wk = sessionsIn(ws, addDays(ws, 6), { coach_id: c.id }); return `<div class="rij clk" data-coach="${attr(c.id)}">${avatar(c)}<span class="grow"><div class="tt">${esc(c.name)}${c.active === false ? ' <span class="st bad">inactief</span>' : ""}</div><div class="sub">${c.is_coordinator ? "Coördinator" : ""}${c.is_coordinator && c.is_coach ? " · " : ""}${c.is_coach ? "Coach" : ""} · ${esc(c.email || "")}</div></span><span class="val"><span class="st">${hoursOf(wk)} u/wk</span><span class="chev">›</span></span></div>`; }).join("")}</div>
    ${store.mode === "supabase" ? '<div class="hint">Een nieuwe coach logt in met het e-mailadres uit het profiel (wachtwoord of inloglink). Bij de eerste login wordt het account automatisch gekoppeld.</div>' : ""}`;
    $("#chAdd", sh).onclick = () => openCoachForm();
    sh.onclick = e => { const c = e.target.closest("[data-coach]"); if (c) openProfile(c.dataset.coach); };
  });
}

/* ---------- Uren ---------- */
function monthRange(iso) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); const end = new Date(y, m, 0).getDate(); return [iso.slice(0, 8) + "01", iso.slice(0, 8) + String(end).padStart(2, "0")]; }
function openHours(cid) {
  let month = todayISO().slice(0, 7) + "-01";
  openSheet(sh => {
    const c = store.byId("coaches", cid); const [a, b] = monthRange(month);
    const list = sessionsIn(a, b, { coach_id: cid }).filter(s => s.status !== "afgelast");
    const given = list.filter(s => s.log ? s.log.given : s.date < todayISO());
    sh.innerHTML = shead("Uren " + esc(c.name.split(" ")[0]), fmtDate(a, { long: true, year: true }).replace(/^1 /, ""), xbtn("back", 'id="hrPrev"') + xbtn("next", 'id="hrNext"') + xbtn("dl", 'id="hrCsv" title="CSV downloaden"')) + `
    <div class="card"><div class="tiles">${tile("Sessies", list.length, "ingeroosterd")}${tile("Uren", hoursOf(list), "ingeroosterd")}${tile("Gelogd", list.filter(s => s.log).length, "van " + list.filter(s => s.date < todayISO()).length + " voorbij")}</div></div>
    <div class="card">${list.map(s => `<div class="rij clk" data-key="${attr(s.key)}"><span class="tm" style="min-width:60px">${fmtDate(s.date, { weekday: true })}</span><span class="grow"><div class="tt ell" style="font-weight:500">${esc(s.label)}</div><div class="sub">${s.van}–${s.tot} · ${esc(s.location ? s.location.short || s.location.name : "")}</div></span><span class="val">${s.log ? `<span class="st ${s.log.given ? "good" : "bad"}">${s.log.given ? "gegeven" : "niet gegeven"}</span>` : s.date < todayISO() ? '<span class="st att">niet gelogd</span>' : ""}<b>${(s.minutes / 60).toFixed(1).replace(".", ",")}</b></span></div>`).join("") || '<div class="empty">Geen sessies in deze maand.</div>'}</div>`;
    $("#hrPrev", sh).onclick = () => { const d = new Date(+month.slice(0, 4), +month.slice(5, 7) - 2, 1); month = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; refreshSheet(); };
    $("#hrNext", sh).onclick = () => { const d = new Date(+month.slice(0, 4), +month.slice(5, 7), 1); month = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; refreshSheet(); };
    $("#hrCsv", sh).onclick = () => downloadText(`uren-${c.name.replace(/\s+/g, "-").toLowerCase()}-${month.slice(0, 7)}.csv`, "datum;van;tot;uren;activiteit;locatie;status\n" + list.map(s => [s.date, s.van, s.tot, (s.minutes / 60).toFixed(2), s.label, s.location ? s.location.name : "", s.log ? (s.log.given ? "gegeven" : "niet gegeven") : s.status].join(";")).join("\n"), "text/csv");
    sh.onclick = e => { const k = e.target.closest("[data-key]"); if (k) import("./session.js").then(m => m.openSession(k.dataset.key)); };
  });
}
function openTeamHours() {
  let month = todayISO().slice(0, 7) + "-01";
  openSheet(sh => {
    const [a, b] = monthRange(month); const coaches = coachesActive();
    const rows = coaches.map(c => { const l = sessionsIn(a, b, { coach_id: c.id }).filter(s => s.status !== "afgelast"); return { c, n: l.length, h: hoursOf(l), logged: l.filter(s => s.log).length, past: l.filter(s => s.date < todayISO()).length }; });
    const all = sessionsIn(a, b).filter(s => s.status !== "afgelast");
    sh.innerHTML = shead("Bezetting & uren", fmtDate(a, { long: true, year: true }).replace(/^1 /, ""), xbtn("back", 'id="thPrev"') + xbtn("next", 'id="thNext"') + xbtn("dl", 'id="thCsv"')) + `
    <div class="card"><div class="tiles">${tile("Sessies", all.length, "hele team")}${tile("Uren", hoursOf(all), "hele team")}${tile("Zonder coach", all.filter(s => !s.coach_ids.length).length, "open plekken", all.some(s => !s.coach_ids.length) ? "bad" : "")}</div></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Coach</th><th class="num">Sessies</th><th class="num">Uren</th><th class="num">Gelogd</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="row">${avatar(r.c, "xs")} ${esc(r.c.name)}</span></td><td class="num">${r.n}</td><td class="num"><b>${String(r.h).replace(".", ",")}</b></td><td class="num ${r.past && r.logged < r.past ? "muted" : ""}">${r.logged}/${r.past}</td></tr>`).join("")}</tbody></table></div></div>`;
    $("#thPrev", sh).onclick = () => { const d = new Date(+month.slice(0, 4), +month.slice(5, 7) - 2, 1); month = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; refreshSheet(); };
    $("#thNext", sh).onclick = () => { const d = new Date(+month.slice(0, 4), +month.slice(5, 7), 1); month = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; refreshSheet(); };
    $("#thCsv", sh).onclick = () => downloadText(`uren-team-${month.slice(0, 7)}.csv`, "coach;sessies;uren;gelogd\n" + rows.map(r => [r.c.name, r.n, r.h, r.logged].join(";")).join("\n"), "text/csv");
  });
}

/* ---------- Seizoenen & vakanties ---------- */
function openSeasons() {
  openSheet(sh => {
    const seasons = store.rows("seasons").slice().sort((a, b) => a.start < b.start ? 1 : -1);
    sh.innerHTML = shead("Seizoenen & vakanties", "Trainingen vervallen automatisch in vakanties (instelbaar per roosterregel)", xbtn("plus", 'id="snAdd" title="Seizoen toevoegen"')) +
      seasons.map(s => { const brs = store.rows("breaks").filter(b => b.season_id === s.id).sort((a, b) => a.start < b.start ? -1 : 1); return `<div class="card"><div class="chead"><h2>${esc(s.name)}</h2><span class="hdnote">${fmtRange(s.start, s.end)} <button class="xbtn sm" data-copy-season="${attr(s.id)}" title="Rooster kopiëren naar nieuw seizoen">${ICON.copy}</button><button class="xbtn sm" data-edit-season="${attr(s.id)}">${ICON.edit}</button><button class="xbtn sm" data-add-break="${attr(s.id)}" title="Vakantie toevoegen">${ICON.plus}</button></span></div>
        ${brs.map(b => `<div class="rij clk" data-edit-break="${attr(b.id)}"><span class="grow"><div class="tt" style="font-weight:500">${esc(b.name)}</div><div class="sub">${fmtRange(b.start, b.end)}</div></span><span class="chev">›</span></div>`).join("") || '<div class="empty">Nog geen vakanties of sluitingsdagen.</div>'}</div>`; }).join("");
    $("#snAdd", sh).onclick = () => openSeasonForm();
    sh.onclick = e => { const cs = e.target.closest("[data-copy-season]"); if (cs) return openCopySeason(cs.dataset.copySeason); const a = e.target.closest("[data-edit-season]"); if (a) return openSeasonForm(a.dataset.editSeason); const b = e.target.closest("[data-add-break]"); if (b) return openBreakForm(null, b.dataset.addBreak); const c = e.target.closest("[data-edit-break]"); if (c) return openBreakForm(c.dataset.editBreak); };
  });
}
function openSeasonForm(id) {
  const ex = id ? store.byId("seasons", id) : null; const d = ex ? { ...ex } : { name: "", start: todayISO(), end: addDays(todayISO(), 180) };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Seizoen bewerken" : "Nieuw seizoen", "", ex ? xbtn("trash", 'id="sfDel"', "danger") : "") + `<div class="card"><label class="fld" style="margin-top:0">Naam</label><input class="in" id="sfName" value="${attr(d.name)}" placeholder="bv. Winter 2026-27"><div class="f2"><div><label class="fld">Start</label><input class="in" id="sfStart" type="date" value="${d.start}"></div><div><label class="fld">Einde</label><input class="in" id="sfEnd" type="date" value="${d.end}"></div></div></div><div class="klvbtn"><button class="btn o" id="sfSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    const del = $("#sfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Seizoen en bijbehorende vakanties verwijderen?", async () => { for (const b of store.rows("breaks").filter(x => x.season_id === id)) await store.remove("breaks", b.id); await store.remove("seasons", id); closeSheet(); refreshSheet(); });
    $("#sfSave", sh).onclick = async () => { const row = { ...d, name: val("sfName", sh), start: val("sfStart", sh), end: val("sfEnd", sh) }; if (!row.name) return toast("Geef het seizoen een naam"); if (!row.id) delete row.id; await store.save("seasons", row); closeSheet(); refreshSheet(); };
  });
}
function openBreakForm(id, seasonId) {
  const ex = id ? store.byId("breaks", id) : null; const d = ex ? { ...ex } : { season_id: seasonId, name: "", start: todayISO(), end: todayISO() };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Vakantie bewerken" : "Vakantie / sluiting", "", ex ? xbtn("trash", 'id="bfDel"', "danger") : "") + `<div class="card"><label class="fld" style="margin-top:0">Naam</label><input class="in" id="bfName" value="${attr(d.name)}" placeholder="bv. Herfstvakantie, Kerst, Baan gesloten"><div class="f2"><div><label class="fld">Van</label><input class="in" id="bfStart" type="date" value="${d.start}"></div><div><label class="fld">Tot en met</label><input class="in" id="bfEnd" type="date" value="${d.end}"></div></div></div><div class="klvbtn"><button class="btn o" id="bfSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    const del = $("#bfDel", sh); if (del) del.onclick = async () => { await store.remove("breaks", id); closeSheet(); refreshSheet(); };
    $("#bfSave", sh).onclick = async () => { const row = { ...d, name: val("bfName", sh), start: val("bfStart", sh), end: val("bfEnd", sh) }; if (!row.name) return toast("Geef een naam"); if (row.end < row.start) return toast("Einddatum ligt voor de begindatum"); if (!row.id) delete row.id; await store.save("breaks", row); closeSheet(); refreshSheet(); };
  });
}

/* ---------- Locaties ---------- */
function openLocations() {
  openSheet(sh => {
    sh.innerHTML = shead("Locaties", "Gedeelde locaties mogen meerdere groepen tegelijk hebben", xbtn("plus", 'id="lcAdd"')) + `<div class="card">${locationsSorted().map(l => `<div class="rij clk" data-loc="${attr(l.id)}"><span class="grow"><div class="tt">${esc(l.name)}</div><div class="sub">${l.shared ? "gedeeld · max " + (l.capacity || "∞") + " tegelijk" : "exclusief · één groep tegelijk"}</div></span><span class="chev">›</span></div>`).join("")}</div>`;
    $("#lcAdd", sh).onclick = () => openLocationForm();
    sh.onclick = e => { const l = e.target.closest("[data-loc]"); if (l) openLocationForm(l.dataset.loc); };
  });
}
function openLocationForm(id) {
  const ex = id ? store.byId("locations", id) : null; const d = ex ? { ...ex } : { name: "", short: "", type: "oefen", shared: false, capacity: 1, order: locationsSorted().length + 1 };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Locatie bewerken" : "Nieuwe locatie", "", ex ? xbtn("trash", 'id="lfDel"', "danger") : "") + `<div class="card"><div class="f2"><div><label class="fld" style="margin-top:0">Naam</label><input class="in" id="lfName" value="${attr(d.name)}"></div><div><label class="fld" style="margin-top:0">Korte naam</label><input class="in" id="lfShort" value="${attr(d.short || "")}" placeholder="voor de kalender"></div></div>
      <div class="f2"><div><label class="fld">Volgorde</label><input class="in" id="lfOrder" type="number" value="${d.order || 1}"></div><div><label class="fld">Max. groepen tegelijk</label><input class="in" id="lfCap" type="number" min="1" value="${d.capacity || 1}"></div></div>
      <div class="sw" style="margin-top:10px"><div><div class="t">Gedeeld</div><div class="d">Meerdere groepen tegelijk toegestaan (geen overlapmelding)</div></div><button class="toggle ${d.shared ? "on" : ""}" id="lfShared"></button></div></div>
      <div class="klvbtn"><button class="btn o" id="lfSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#lfShared", sh).onclick = e => e.target.classList.toggle("on");
    const del = $("#lfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Locatie verwijderen? Sessies op deze locatie houden geen locatie meer.", async () => { await store.remove("locations", id); closeSheet(); refreshSheet(); });
    $("#lfSave", sh).onclick = async () => { const row = { ...d, name: val("lfName", sh), short: val("lfShort", sh), order: +val("lfOrder", sh) || 99, capacity: +val("lfCap", sh) || 1, shared: $("#lfShared", sh).classList.contains("on") }; if (!row.name) return toast("Geef een naam"); if (!row.id) delete row.id; await store.save("locations", row); closeSheet(); refreshSheet(); };
  });
}

/* ---------- Typen ---------- */
function openTypes() {
  openSheet(sh => {
    const gt = store.rows("group_types").slice().sort((a, b) => a.order - b.order), at = store.rows("activity_types").slice().sort((a, b) => a.order - b.order);
    const rows = (tbl, list) => list.map(t => `<div class="rij clk" data-type="${tbl}|${attr(t.id)}"><span class="dot" style="background:${attr(t.color)}"></span><span class="grow tt">${esc(t.name)}</span><span class="chev">›</span></div>`).join("");
    sh.innerHTML = shead("Groepstypen & activiteiten", "Kleuren bepalen de weergave in de kalender") + `<div class="card"><div class="chead"><h2>Groepstypen</h2><span class="hdnote"><button class="xbtn sm" data-newtype="group_types">${ICON.plus}</button></span></div>${rows("group_types", gt)}</div><div class="card"><div class="chead"><h2>Activiteittypen</h2><span class="hdnote"><button class="xbtn sm" data-newtype="activity_types">${ICON.plus}</button></span></div>${rows("activity_types", at)}<div class="hint">Wedstrijden worden altijd vol oranje getoond.</div></div>`;
    sh.onclick = e => { const n = e.target.closest("[data-newtype]"); if (n) return openTypeForm(n.dataset.newtype); const t = e.target.closest("[data-type]"); if (t) { const [tbl, id] = t.dataset.type.split("|"); openTypeForm(tbl, id); } };
  });
}
function openTypeForm(tbl, id) {
  const ex = id ? store.byId(tbl, id) : null; const d = ex ? { ...ex } : { name: "", color: COLORS[store.rows(tbl).length % COLORS.length], order: store.rows(tbl).length + 1 };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Type bewerken" : "Nieuw type", tbl === "group_types" ? "Groepstype" : "Activiteittype", ex ? xbtn("trash", 'id="tfDel"', "danger") : "") + `<div class="card"><div class="f2"><div><label class="fld" style="margin-top:0">Naam</label><input class="in" id="tfName" value="${attr(d.name)}"></div><div><label class="fld" style="margin-top:0">Volgorde</label><input class="in" id="tfOrder" type="number" value="${d.order}"></div></div><label class="fld">Kleur</label><div class="pick" id="tfColor">${COLORS.map(k => `<button data-v="${k}" class="${d.color === k ? "on" : ""}" style="width:28px;padding:0;justify-content:center"><span style="width:14px;height:14px;border-radius:50%;background:${k};display:inline-block"></span></button>`).join("")}</div></div><div class="klvbtn"><button class="btn o" id="tfSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#tfColor", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; d.color = b.dataset.v; $$("button", e.currentTarget).forEach(x => x.classList.toggle("on", x === b)); };
    const del = $("#tfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Type verwijderen?", async () => { await store.remove(tbl, id); closeSheet(); refreshSheet(); });
    $("#tfSave", sh).onclick = async () => { const row = { ...d, name: val("tfName", sh), order: +val("tfOrder", sh) || 99 }; if (!row.name) return toast("Geef een naam"); if (!row.id) delete row.id; await store.save(tbl, row); closeSheet(); refreshSheet(); };
  });
}

/* ---------- Instellingen-hub (tandwiel in de kop) ---------- */
export function openSettings(sub) {
  const me = store.me; const coord = isCoordinator();
  if (sub === "profiel") { openProfile(me.id); return; }
  openSheet(sh => {
    const row = (key, icon, t, d) => `<button class="setrow" data-set="${key}"><span class="avatar" style="background:var(--paper);color:var(--muted)">${ICON[icon]}</span><span><div class="t">${t}</div><div class="d">${d}</div></span><span class="chev">›</span></button>`;
    sh.innerHTML = shead("Instellingen", `${esc(me.name)} · ${me.is_coordinator && me.is_coach ? "Coördinator · Coach" : me.is_coordinator ? "Coördinator" : "Coach"}${store.mode === "demo" ? " · demo" : ""}`) + `
    <div class="card"><div class="chead"><h2>Ik</h2></div>
      ${row("profiel", "user", "Mijn profiel", "Gegevens, kleur, specialisaties, beschikbaarheid")}
      ${row("uren", "today", "Mijn uren", "Per maand, exporteerbaar als CSV")}
      ${row("ics", "cal", "Mijn agenda (ICS)", "Download voor Apple/Google/Outlook-agenda")}
    </div>
    ${coord ? `<div class="card"><div class="chead"><h2>Academy</h2><span class="hdnote">coördinator</span></div>
      ${row("coaches", "groups", "Coaches", "Profielen, rechten, uitnodigen")}
      ${row("seizoenen", "cal", "Seizoenen & vakanties", "Periodes waarin trainingen vervallen")}
      ${row("locaties", "pin", "Locaties", locationsSorted().map(l => esc(l.short || l.name)).join(", "))}
      ${row("typen", "flag", "Groepstypen & activiteiten", "Namen en kleuren in de kalender")}
      ${row("bezetting", "drills", "Bezetting & uren team", "Uren per coach, per maand")}
      ${row("rapport", "chart", "Rapportages", "Dekking voorbereiding en logs, thema-heatmap, vervangingen")}
    </div>` : ""}
    <div class="card"><div class="chead"><h2>Gegevens</h2><span class="hdnote">${store.mode === "demo" ? "lokaal in deze browser" : "Supabase · gedeeld"}</span></div>
      ${row("export", "dl", "Back-up downloaden", "Alle gegevens als JSON")}
      ${store.mode === "demo" ? row("reset", "trash", "Demo opnieuw instellen", "Terug naar de voorbeelddata") : ""}
      ${row("logout", "back", "Uitloggen", store.mode === "demo" ? "Terug naar de coachkeuze" : "Op dit apparaat")}
      <div class="hint" style="padding:10px 2px 0">${esc(cfg.appName || "Trainingsplanner")} · fase 1 · ${esc(cfg.organisation || "")}</div>
    </div>`;
    sh.onclick = e => {
      const b = e.target.closest("[data-set]"); if (!b) return; const k = b.dataset.set;
      const today = todayISO();
      const acts = { profiel: () => openProfile(me.id), uren: () => openHours(me.id), coaches: openCoaches, seizoenen: openSeasons, locaties: openLocations, typen: openTypes, bezetting: openTeamHours, rapport: openReports,
        ics: () => openIcsSheet(),
        export: () => { const all = {}; ["coaches", "members", "group_members", "seasons", "breaks", "locations", "group_types", "activity_types", "groups", "schedule_rules", "overrides", "logs", "attendance", "action_items", "drills"].forEach(t => all[t] = store.rows(t)); downloadText("trainingsplanner-backup-" + today + ".json", JSON.stringify(all, null, 1), "application/json"); },
        reset: () => confirmInline(sh.querySelector(".card:last-child"), "Alle demo-gegevens terugzetten naar de voorbeelddata?", async () => { await store.resetDemo(); closeSheet(); toast("Demo opnieuw ingesteld"); }, "Terugzetten"),
        logout: () => { closeSheet(); store.logout(); } };
      if (acts[k]) acts[k]();
    };
  });
}

/* ---------- ICS ---------- */
export function openIcsSheet(groupId) {
  openSheet(sh => {
    const me = store.me;
    sh.innerHTML = shead("Agenda-export", "ICS-bestand met de komende 6 maanden") + `
    <div class="card"><div class="small" style="line-height:1.5">Open het bestand op je telefoon of computer; het wordt in je eigen agenda gezet (Apple Agenda, Google Agenda, Outlook). Wijzigingen in de planner komen niet automatisch mee: download dan opnieuw. Een live abonnement (automatisch bijwerken) komt zodra de app op Supabase draait.</div>
      <div class="klvbtn" style="margin-top:12px"><button class="btn o" id="icsMe">Mijn trainingen</button>${isCoordinator() ? '<button class="btn ghost" id="icsAll">Hele team</button>' : ""}</div>
      <label class="fld">Per groep</label><select class="in" id="icsGroup"><option value="">— kies groep —</option>${groupsSorted().map(g => `<option value="${attr(g.id)}" ${groupId === g.id ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select>
      <div class="klvbtn" style="margin-top:8px"><button class="btn ghost" id="icsGrp">Download groepsagenda</button></div></div>`;
    $("#icsMe", sh).onclick = () => downloadText(`agenda-${me.name.split(" ")[0].toLowerCase()}.ics`, buildIcs({ coach_id: me.id }, "Trainingen " + me.name.split(" ")[0]), "text/calendar");
    const all = $("#icsAll", sh); if (all) all.onclick = () => downloadText("agenda-team.ics", buildIcs({}, "Trainingsplanner team"), "text/calendar");
    $("#icsGrp", sh).onclick = () => { const gid = $("#icsGroup", sh).value; if (!gid) return toast("Kies een groep"); const g = store.byId("groups", gid); downloadText(`agenda-${g.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`, buildIcs({ group_id: gid }, g.name), "text/calendar"); };
  });
}

/* ---------- Rapportages ---------- */
function openReports() {
  openSheet(sh => {
    const today = todayISO(); const season = store.rows("seasons").find(x => x.start <= today && x.end >= today) || store.rows("seasons")[0];
    const from = season ? season.start : addDays(today, -90), to = season ? season.end : addDays(today, 90);
    const all = sessionsIn(from, to).filter(s => s.status !== "afgelast" && s.group_id);
    const past = all.filter(s => s.date < today), future = all.filter(s => s.date >= today && s.date <= addDays(today, 28));
    const groups = groupsSorted();
    const rows = groups.map(g => { const p = past.filter(s => s.group_id === g.id), f = future.filter(s => s.group_id === g.id); return { g, past: p.length, logged: p.filter(s => s.log).length, prepPast: p.filter(s => planFor(s.key)).length, fut: f.length, prepFut: f.filter(s => planFor(s.key)).length }; });
    const pct = (a, b) => b ? Math.round(a / b * 100) : null;
    const cell = v => v == null ? '<span class="muted">—</span>' : `<span class="st ${v >= 80 ? "good" : v >= 50 ? "att" : "bad"}">${v}%</span>`;
    // thema-heatmap: groep × hoofdcategorie uit lesvoorbereidingen
    const mains = TAXONOMY.map(t => t.key); const heat = {}; let max = 1;
    store.rows("lesson_plans").filter(p => p.date >= from && p.date <= to).forEach(p => { (p.blocks || []).forEach(b => { const d = b.drill_id ? store.byId("drills", b.drill_id) : null; if (!d) return; const k = p.group_id + "|" + d.main_cat; heat[k] = (heat[k] || 0) + (+b.minutes || 0); max = Math.max(max, heat[k]); }); });
    const reqs = store.rows("requests"); const open = reqs.filter(r => r.status === "open");
    sh.innerHTML = shead("Rapportages", esc(season ? season.name : "") + " · t/m vandaag en komende 4 weken", xbtn("dl", 'id="rpCsv" title="CSV"')) + `
    <div class="card"><div class="tiles">${tile("Gelogd", pct(past.filter(s => s.log).length, past.length) == null ? "—" : pct(past.filter(s => s.log).length, past.length) + "%", past.length + " sessies voorbij")}${tile("Voorbereid", pct(future.filter(s => planFor(s.key)).length, future.length) == null ? "—" : pct(future.filter(s => planFor(s.key)).length, future.length) + "%", future.length + " komende 4 wk", future.some(s => !planFor(s.key)) ? "att" : "")}${tile("Vervangingen", reqs.filter(r => r.status === "resolved").length, open.length + " open", open.length ? "bad" : "")}</div></div>
    <div class="card"><div class="chead"><h2>Dekking per groep</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Groep</th><th class="num">Voorbij</th><th class="num">Gelogd</th><th class="num">Voorbereid</th><th class="num">Komend</th><th class="num">Voorbereid</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.g.name)}</td><td class="num">${r.past}</td><td class="num">${cell(pct(r.logged, r.past))}</td><td class="num">${cell(pct(r.prepPast, r.past))}</td><td class="num">${r.fut}</td><td class="num">${cell(pct(r.prepFut, r.fut))}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="card"><div class="chead"><h2>Thema-heatmap</h2><span class="hdnote">minuten per hoofdcategorie in lesvoorbereidingen</span></div><div class="tbl-wrap"><table class="tbl mxt"><thead><tr><th></th>${mains.map(m => `<th>${esc(mainLabel(m))}</th>`).join("")}</tr></thead><tbody>${groups.map(g => `<tr><td style="white-space:nowrap"><b>${esc(g.name)}</b></td>${mains.map(m => { const v = heat[g.id + "|" + m] || 0; return `<td class="num"><span class="mxcell ${v ? "" : "zero"}" style="--a:${(v / max).toFixed(2)};cursor:default">${v || "·"}</span></td>`; }).join("")}</tr>`).join("")}</tbody></table></div><div class="hint">Laat zien of elke groep een gebalanceerd aanbod krijgt (golfskills, spelen, fysiek, prestatiegedrag).</div></div>`;
    $("#rpCsv", sh).onclick = () => downloadText("dekking-" + today + ".csv", "groep;voorbij;gelogd;voorbereid;komend;voorbereid_komend\n" + rows.map(r => [r.g.name, r.past, r.logged, r.prepPast, r.fut, r.prepFut].join(";")).join("\n"), "text/csv");
  });
}

/* ---------- Seizoen kopiëren ---------- */
export function openCopySeason(srcId) {
  const src = store.byId("seasons", srcId); if (!src) return;
  openSheet(sh => {
    const rules = store.rows("schedule_rules").filter(r => !r.archived && r.start <= src.end && (!r.end || r.end >= src.start));
    const def = addDays(src.end, 1);
    sh.innerHTML = shead("Seizoen kopiëren", `Rooster van ${esc(src.name)} (${rules.length} roosterregels) naar een nieuw seizoen`) + `
    <div class="card"><label class="fld" style="margin-top:0">Naam nieuw seizoen</label><input class="in" id="csName" value="${attr(src.name.replace(/\d{4}(-\d{2})?/, m => { const y = +m.slice(0, 4) + 1; return m.length > 4 ? y + "-" + String(y + 1).slice(2) : String(y); }))}">
      <div class="f2"><div><label class="fld">Start</label><input class="in" id="csStart" type="date" value="${def}"></div><div><label class="fld">Einde</label><input class="in" id="csEnd" type="date" value="${addDays(def, daysBetween(src.start, src.end))}"></div></div>
      <div class="sw" style="margin-top:10px"><div><div class="t">Leerlijnen meekopiëren</div><div class="d">Periodethema's schuiven mee met dezelfde weekafstand</div></div><button class="toggle on" id="csThemes"></button></div>
      <div class="sw"><div><div class="t">Vakanties meekopiëren</div><div class="d">Namen en duur; datums schuiven mee — controleer ze daarna</div></div><button class="toggle on" id="csBreaks"></button></div>
      <div class="hint">Wekelijkse regels beginnen op dezelfde weekdag in de eerste week van het nieuwe seizoen; cursussen met een vast aantal lessen houden dat aantal. Afwijkingen (afgelast/verplaatst) worden niet gekopieerd.</div></div>
    <div class="klvbtn"><button class="btn o" id="csGo">Kopiëren</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    ["csThemes", "csBreaks"].forEach(id => $("#" + id, sh).onclick = e => e.target.classList.toggle("on"));
    $("#csGo", sh).onclick = async () => {
      const name = val("csName", sh), start = val("csStart", sh), end = val("csEnd", sh); if (!name || !start || !end) return toast("Vul naam, start en einde in");
      const season = await store.save("seasons", { name, start, end });
      // verschuiving: hele weken, zodat weekdagen gelijk blijven
      const shiftDays = Math.round(daysBetween(src.start, start) / 7) * 7;
      let n = 0;
      for (const r of rules) {
        const c = { ...r }; delete c.id; c.season_id = season.id;
        const ns = addDays(r.start, shiftDays); c.start = ns < start ? alignWeekday(start, r) : ns;
        c.end = r.end ? (r.count ? null : end) : null; if (r.freq === "once") { c.end = null; } if (r.freq === "custom") c.dates = (r.dates || []).map(d => addDays(d, shiftDays));
        await store.save("schedule_rules", c); n++;
      }
      if ($("#csThemes", sh).classList.contains("on")) for (const t of store.rows("group_themes").filter(t => t.start >= src.start && t.start <= src.end)) { const c = { ...t, start: addDays(t.start, shiftDays) }; delete c.id; await store.save("group_themes", c); }
      if ($("#csBreaks", sh).classList.contains("on")) for (const b of store.rows("breaks").filter(b => b.season_id === src.id)) { const c = { ...b, season_id: season.id, start: addDays(b.start, shiftDays), end: addDays(b.end, shiftDays) }; delete c.id; await store.save("breaks", c); }
      closeSheet(); toast(`${n} roosterregels gekopieerd naar ${name}`); refreshSheet();
    };
  });
}
function alignWeekday(start, r) { const wds = r.weekdays || []; if (!wds.length) return start; for (let i = 0; i < 7; i++) { const d = addDays(start, i); if (wds.includes(new Date(d).getDay())) return d; } return start; }
