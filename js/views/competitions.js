// Wedstrijdmodule (C@ddie-model): bibliotheek van wedstrijden (tours, categorie, klasse) en edities per seizoen,
// die met één tik in de kalender en in programma's van groepen gezet worden.
import { store, isCoordinator, groupById, coachById } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, refreshSheet, shead, toast, kpi, klsel, xbtn, val, confirmInline, searchPil, ICON, avatars } from "../lib/ui.js";
import { todayISO, addDays, fmtDate, fmtDateLong, fmtRange, daysBetween } from "../lib/dates.js";
import { groupsSorted, coachesActive, locationsSorted } from "../lib/model.js";
import { programFor, newProgram, PEAK_LEVELS } from "../lib/periodization.js";

export const CATS = ["Jeugd", "Volwassenen", "Senioren", "Open", "Dames", "Heren", "Team"];
export const FORMATS = ["Strokeplay", "Stableford", "Matchplay", "Teamwedstrijd", "Foursome", "Scramble", "Anders"];
const TOUR_COLORS = ["#F47C20", "#4A6FA5", "#17a05c", "#8E6BB5", "#2A9D8F", "#B5832A", "#7A7F85"];
const st = { q: "", tour: "", season_id: null, mode: "komend", open: {} };
try { Object.assign(st, JSON.parse(sessionStorage.getItem("tp_comp") || "{}")); } catch (e) { }
function persist() { try { sessionStorage.setItem("tp_comp", JSON.stringify(st)); } catch (e) { } }

export const tours = () => store.rows("tours").slice().sort((a, b) => (a.order || 99) - (b.order || 99) || a.name.localeCompare(b.name));
export const defs = () => store.rows("competitions").slice().sort((a, b) => a.name.localeCompare(b.name));
export const editions = (seasonId) => store.rows("competition_editions").filter(e => !seasonId || e.season_id === seasonId).slice().sort((a, b) => (a.start || "9") < (b.start || "9") ? -1 : 1);
export function editionLabel(e) { const d = store.byId("competitions", e.competition_id); return e.name || (d ? d.name : "Wedstrijd"); }
function currentSeason() { const t = todayISO(); return store.rows("seasons").find(s => s.start <= t && s.end >= t) || store.rows("seasons").slice().sort((a, b) => a.start < b.start ? 1 : -1)[0] || null; }

export function render(main) {
  const seasons = store.rows("seasons").slice().sort((a, b) => a.start < b.start ? 1 : -1);
  if (!st.season_id || !seasons.some(s => s.id === st.season_id)) st.season_id = (currentSeason() || {}).id || null; persist();
  const season = store.byId("seasons", st.season_id); const coord = isCoordinator(); const today = todayISO();
  let lib = defs(); if (st.tour) lib = lib.filter(d => (st.tour === "__none__" ? !d.tour_id : d.tour_id === st.tour)); if (st.q) lib = lib.filter(d => d.name.toLowerCase().split(/\s+/).some(w => w.startsWith(st.q.toLowerCase())));
  const eds = editions(st.season_id); const shown = eds.filter(e => st.mode === "alle" || (st.mode === "komend" ? (e.end || e.start) >= today : (e.end || e.start) < today));
  const noDate = eds.filter(e => !e.start).length;
  const tourGroups = tours().map(t => ({ t, ds: lib.filter(d => d.tour_id === t.id) })).filter(x => x.ds.length); const loose = lib.filter(d => !d.tour_id || !store.byId("tours", d.tour_id));
  const edRow = e => { const d = store.byId("competitions", e.competition_id); const gs = (e.group_ids || []).map(groupById).filter(Boolean); const past = (e.end || e.start) < today; return `<div class="rij clk" data-ed="${attr(e.id)}"><span class="pklv ${e.level || "B"}">${e.level || "B"}</span><span class="tm" style="min-width:86px">${e.start ? fmtDate(e.start, { weekday: true }) + (e.end && e.end !== e.start ? " – " + fmtDate(e.end) : "") : '<span class="bad">geen datum</span>'}</span><span class="grow"><div class="tt ell">${esc(editionLabel(e))}</div><div class="sub ell">${d ? esc([d.category, d.format].filter(Boolean).join(" · ")) : ""}${e.location_name ? " · " + esc(e.location_name) : ""}${gs.length ? " · " + gs.map(g => esc(g.name)).join(", ") : ' · <span class="att" style="color:var(--orange)">geen groep</span>'}</div></span><span class="val">${e.rule_id ? '<span class="st good">kalender</span>' : '<span class="st">niet in kalender</span>'}${gs.length ? `<span class="st ${past ? "" : "good"}">${gs.length} progr.</span>` : ""}<span class="chev">›</span></span></div>`; };
  main.innerHTML = `
  <div class="spkop"><h1>Wedstrijden</h1>
    ${klsel("cpSeason", seasons.map(s => [s.id, s.name]), st.season_id)}
    ${kpi([[defs().length, "in bibliotheek"], [eds.length, "edities " + (season ? season.name.split(" ")[0] : "")], [noDate, "zonder datum", noDate ? "att" : ""], [eds.filter(e => e.rule_id).length, "in kalender"]])}
    <div class="right"><button class="btn ghost sm" id="cpTours">Tours beheren</button>${coord ? '<button class="plusbtn" id="cpAdd" title="Nieuwe wedstrijd in bibliotheek">+</button>' : ""}</div>
  </div>
  <div class="grid two">
    <div class="card fixed" style="height:max(560px,calc(100vh - 260px))"><div class="chead"><h2>Bibliotheek</h2><span class="cvn">${lib.length}</span><span class="hdnote">${searchPil("cpQ", "Zoek wedstrijd …", st.q)}${klsel("cpTour", [["", "Alle tours"]].concat(tours().map(t => [t.id, t.name])).concat([["__none__", "Zonder tour"]]), st.tour)}</span></div>
      <div class="cbody">${tourGroups.map(({ t, ds }) => grp(t.id, t.name, t.color, ds, season)).join("")}${loose.length ? grp("__none__", "Zonder tour", "#7A7F85", loose, season) : ""}${!lib.length ? '<div class="empty">Nog geen wedstrijden in de bibliotheek. Voeg er een toe met +.</div>' : ""}</div></div>
    <div class="card fixed" style="height:max(560px,calc(100vh - 260px))"><div class="chead"><h2>Edities</h2><span class="cvn">${shown.length}</span><div class="seg" id="cpMode" style="margin-left:6px"><button data-v="komend" class="${st.mode === "komend" ? "on" : ""}">Komend</button><button data-v="geweest" class="${st.mode === "geweest" ? "on" : ""}">Geweest</button><button data-v="alle" class="${st.mode === "alle" ? "on" : ""}">Alle</button></div><span class="hdnote">${esc(season ? season.name : "")}</span></div>
      <div class="cbody">${shown.length ? shown.map(edRow).join("") : '<div class="empty">Geen edities. Maak een editie aan vanuit de bibliotheek (+ bij een wedstrijd).</div>'}</div></div>
  </div>`;
  $("#cpSeason", main).onchange = e => { st.season_id = e.target.value; persist(); render(main); };
  $("#cpQ", main).oninput = e => { st.q = e.target.value; persist(); render(main); const i = $("#cpQ", main); i.focus(); i.setSelectionRange(99, 99); };
  $("#cpTour", main).onchange = e => { st.tour = e.target.value; persist(); render(main); };
  $("#cpMode", main).onclick = e => { const b = e.target.closest("button"); if (!b) return; st.mode = b.dataset.v; persist(); render(main); };
  $("#cpTours", main).onclick = openTours;
  const add = $("#cpAdd", main); if (add) add.onclick = () => openDefForm(null);
  main.onclick = e => {
    const tg = e.target.closest("[data-tgl]"); if (tg) { st.open[tg.dataset.tgl] = st.open[tg.dataset.tgl] === false ? true : false; persist(); render(main); return; }
    const ne = e.target.closest("[data-newed]"); if (ne) { e.stopPropagation(); openEditionForm(null, ne.dataset.newed, st.season_id); return; }
    const df = e.target.closest("[data-def]"); if (df) { openDef(df.dataset.def); return; }
    const ed = e.target.closest("[data-ed]"); if (ed) { openEdition(ed.dataset.ed); return; }
  };
}
function grp(key, name, color, ds, season) {
  const open = st.open[key] !== false; const eds = editions(st.season_id);
  return `<div class="tourgrp"><button class="tourgh ${open ? "open" : ""}" data-tgl="${attr(key)}"><span class="chev">▶</span><span class="dot" style="background:${attr(color)}"></span><b>${esc(name)}</b><span class="muted" style="margin-left:auto;font-weight:600">${ds.length}</span></button>${open ? ds.map(d => { const n = eds.filter(e => e.competition_id === d.id).length; return `<div class="rij clk" data-def="${attr(d.id)}"><span class="pklv ${d.klasse || "B"}" style="opacity:.8">${d.klasse || "B"}</span><span class="grow"><div class="tt ell" style="font-weight:500">${esc(d.name)}</div><div class="sub ell">${esc([d.category, d.format, d.location_name].filter(Boolean).join(" · "))}</div></span><span class="val">${n ? `<span class="st good">${n}× ${season ? season.name.split(" ")[0] : ""}</span>` : '<span class="st">geen editie</span>'}${isCoordinator() ? `<button class="xbtn sm" data-newed="${attr(d.id)}" title="Editie aanmaken">${ICON.plus}</button>` : ""}</span></div>`; }).join("") : ""}</div>`;
}

/* ---------- Tours ---------- */
function openTours() {
  openSheet(sh => {
    sh.innerHTML = shead("Tours", "Groepeer wedstrijden: clubwedstrijden, NGF Jeugdtour, regio, NK …", isCoordinator() ? xbtn("plus", 'id="trAdd"') : "") + `<div class="card">${tours().map(t => `<div class="rij clk" data-tour="${attr(t.id)}"><span class="dot" style="background:${attr(t.color)}"></span><span class="grow tt">${esc(t.name)}</span><span class="sub">${defs().filter(d => d.tour_id === t.id).length} wedstrijden</span><span class="chev">›</span></div>`).join("") || '<div class="empty">Nog geen tours.</div>'}</div>`;
    const a = $("#trAdd", sh); if (a) a.onclick = () => openTourForm(null);
    sh.onclick = e => { const r = e.target.closest("[data-tour]"); if (r) openTourForm(r.dataset.tour); };
  });
}
function openTourForm(id) {
  const ex = id ? store.byId("tours", id) : null; const d = ex ? { ...ex } : { name: "", color: TOUR_COLORS[store.rows("tours").length % TOUR_COLORS.length], order: store.rows("tours").length + 1 };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Tour bewerken" : "Nieuwe tour", "", ex ? xbtn("trash", 'id="tfDel"', "danger") : "") + `<div class="card"><label class="fld" style="margin-top:0">Naam</label><input class="in" id="tfName" value="${attr(d.name)}" placeholder="bv. NGF Jeugdtour"><label class="fld">Kleur</label><div class="pick" id="tfColor">${TOUR_COLORS.map(k => `<button data-v="${k}" class="${d.color === k ? "on" : ""}" style="width:28px;padding:0;justify-content:center"><span style="width:14px;height:14px;border-radius:50%;background:${k};display:inline-block"></span></button>`).join("")}</div></div><div class="klvbtn"><button class="btn o" id="tfSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#tfColor", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; d.color = b.dataset.v; $$("button", e.currentTarget).forEach(x => x.classList.toggle("on", x === b)); };
    const del = $("#tfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Tour verwijderen? Wedstrijden blijven bestaan zonder tour.", async () => { await store.remove("tours", id); closeSheet(); refreshSheet(); });
    $("#tfSave", sh).onclick = async () => { const row = { ...d, name: val("tfName", sh) }; if (!row.name) return toast("Geef een naam"); if (!row.id) delete row.id; await store.save("tours", row); closeSheet(); refreshSheet(); };
  });
}

/* ---------- Bibliotheek: wedstrijd ---------- */
export function openDef(id) {
  openSheet(sh => {
    const d = store.byId("competitions", id); if (!d) { sh.innerHTML = shead("Wedstrijd", "niet gevonden"); return; }
    const t = d.tour_id ? store.byId("tours", d.tour_id) : null; const eds = store.rows("competition_editions").filter(e => e.competition_id === id).sort((a, b) => (a.start || "9") < (b.start || "9") ? 1 : -1);
    sh.innerHTML = shead(d.name, `${t ? esc(t.name) + " · " : ""}${esc([d.category, d.format, "klasse " + (d.klasse || "B")].filter(Boolean).join(" · "))}`, (isCoordinator() ? xbtn("edit", 'id="cdEdit"') + xbtn("plus", 'id="cdNewEd" title="Editie aanmaken"') : "")) + `
    <div class="card"><div class="tiles"><div class="tile"><div class="lb">Locatie</div><div class="s" style="color:var(--ink)">${esc(d.location_name || "—")}</div></div><div class="tile"><div class="lb">Organisator</div><div class="s" style="color:var(--ink)">${esc(d.organizer || "—")}</div></div><div class="tile"><div class="lb">Dagen</div><div class="s" style="color:var(--ink)">${d.days || 1}</div></div></div>${d.notes ? `<div class="hint">${esc(d.notes)}</div>` : ""}${d.url ? `<div class="hint"><a href="${attr(d.url)}" target="_blank" rel="noopener" style="color:var(--orange)">${esc(d.url)}</a></div>` : ""}${(d.labels || []).length ? `<div class="chips" style="margin:8px 0 0">${d.labels.map(l => `<span class="chip">${esc(l)}</span>`).join("")}</div>` : ""}</div>
    <div class="card"><div class="chead"><h2>Edities</h2><span class="cvn">${eds.length}</span></div>${eds.map(e => { const s = store.byId("seasons", e.season_id); return `<div class="rij clk" data-ed="${attr(e.id)}"><span class="pklv ${e.level || "B"}">${e.level || "B"}</span><span class="grow"><div class="tt" style="font-weight:500">${e.start ? fmtRange(e.start, e.end) : "geen datum"}</div><div class="sub">${esc(s ? s.name : "")}${(e.group_ids || []).length ? " · " + e.group_ids.map(g => esc((groupById(g) || {}).name)).join(", ") : ""}</div></span><span class="val">${e.rule_id ? '<span class="st good">kalender</span>' : ""}<span class="chev">›</span></span></div>`; }).join("") || '<div class="empty">Nog geen edities.</div>'}</div>`;
    const ed = $("#cdEdit", sh); if (ed) ed.onclick = () => openDefForm(id);
    const ne = $("#cdNewEd", sh); if (ne) ne.onclick = () => openEditionForm(null, id, st.season_id || (currentSeason() || {}).id);
    sh.onclick = e => { const r = e.target.closest("[data-ed]"); if (r) openEdition(r.dataset.ed); };
  });
}
export function openDefForm(id) {
  const ex = id ? store.byId("competitions", id) : null;
  const d = ex ? { ...ex, labels: (ex.labels || []).slice() } : { name: "", tour_id: "", category: "Jeugd", format: "Strokeplay", klasse: "B", location_name: "", organizer: "", days: 1, url: "", notes: "", labels: [] };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Wedstrijd bewerken" : "Nieuwe wedstrijd", "Bibliotheek · vaste gegevens, edities per seizoen apart", ex ? xbtn("trash", 'id="dfDel"', "danger") : "") + `
    <div class="card"><label class="fld" style="margin-top:0">Naam</label><input class="in" id="dfName" value="${attr(d.name)}" placeholder="bv. NK Jeugd strokeplay, Clubkampioenschap, Maandbeker">
      <div class="f2"><div><label class="fld">Tour</label><select class="in" id="dfTour"><option value="">—</option>${tours().map(t => `<option value="${attr(t.id)}" ${d.tour_id === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></div><div><label class="fld">Categorie</label><select class="in" id="dfCat">${CATS.map(c => `<option ${d.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
      <div class="f3"><div><label class="fld">Spelvorm</label><select class="in" id="dfFormat">${FORMATS.map(c => `<option ${d.format === c ? "selected" : ""}>${c}</option>`).join("")}</select></div><div><label class="fld">Standaardklasse</label><select class="in" id="dfKl">${PEAK_LEVELS.map(([v, l]) => `<option value="${v}" ${d.klasse === v ? "selected" : ""}>${l}</option>`).join("")}</select></div><div><label class="fld">Dagen</label><input class="in" id="dfDays" type="number" min="1" max="7" value="${d.days || 1}"></div></div>
      <div class="f2"><div><label class="fld">Locatie / baan</label><input class="in" id="dfLoc" value="${attr(d.location_name || "")}" placeholder="bv. Almeerderhout, wisselend"></div><div><label class="fld">Organisator</label><input class="in" id="dfOrg" value="${attr(d.organizer || "")}" placeholder="bv. Club, NGF, Regio"></div></div>
      <label class="fld">Website</label><input class="in" id="dfUrl" value="${attr(d.url || "")}" placeholder="https://"><label class="fld">Labels (komma-gescheiden)</label><input class="in" id="dfLab" value="${attr(d.labels.join(", "))}" placeholder="bv. kwalificatie, teams, 18 holes"><label class="fld">Notities</label><textarea class="in" id="dfNotes" style="min-height:56px">${esc(d.notes || "")}</textarea>
      <div class="hint">Klasse A = hoofddoel (stuurt de periodisering bij Selectie/Topgolf), B = belangrijk, C = wedstrijdtest. Per editie en per groep aan te passen.</div></div>
    <div class="klvbtn"><button class="btn o" id="dfSave">${ex ? "Opslaan" : "Toevoegen"}</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    const del = $("#dfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Wedstrijd en alle edities verwijderen?", async () => { for (const e of store.rows("competition_editions").filter(x => x.competition_id === id)) await removeEdition(e); await store.remove("competitions", id); closeSheet(); closeSheet(); toast("Verwijderd"); });
    $("#dfSave", sh).onclick = async () => { const row = { ...d, name: val("dfName", sh), tour_id: val("dfTour", sh) || null, category: val("dfCat", sh), format: val("dfFormat", sh), klasse: val("dfKl", sh), days: +val("dfDays", sh) || 1, location_name: val("dfLoc", sh), organizer: val("dfOrg", sh), url: val("dfUrl", sh), labels: val("dfLab", sh).split(",").map(x => x.trim()).filter(Boolean), notes: val("dfNotes", sh) }; if (!row.name) return toast("Geef een naam"); if (!row.id) delete row.id; const saved = await store.save("competitions", row); closeSheet(); toast(ex ? "Opgeslagen" : "Toegevoegd aan bibliotheek"); if (!ex) openDef(saved.id); else refreshSheet(); };
  });
}

/* ---------- Editie ---------- */
export function openEdition(id) {
  openSheet(sh => {
    const e = store.byId("competition_editions", id); if (!e) { sh.innerHTML = shead("Editie", "niet gevonden"); return; }
    const d = store.byId("competitions", e.competition_id); const season = store.byId("seasons", e.season_id); const gs = (e.group_ids || []).map(groupById).filter(Boolean); const coord = isCoordinator();
    const rule = e.rule_id ? store.byId("schedule_rules", e.rule_id) : null;
    sh.innerHTML = shead(editionLabel(e), `${e.start ? fmtDateLong(e.start) + (e.end && e.end !== e.start ? " – " + fmtDate(e.end) : "") : "geen datum"} · ${esc(season ? season.name : "")} <span class="pklv ${e.level || "B"}">${e.level || "B"}</span>`, coord ? xbtn("edit", 'id="edEdit"') : "") + `
    <div class="card"><div class="tiles"><div class="tile"><div class="lb">Wedstrijd</div><div class="s" style="color:var(--ink)">${esc(d ? d.name : "—")}${d && d.tour_id ? "<br><span class='muted'>" + esc((store.byId("tours", d.tour_id) || {}).name || "") + "</span>" : ""}</div></div><div class="tile"><div class="lb">Locatie</div><div class="s" style="color:var(--ink)">${esc(e.location_name || (d ? d.location_name : "") || "—")}</div></div><div class="tile"><div class="lb">Tijd</div><div class="s" style="color:var(--ink)">${esc(e.van || "09:00")}–${esc(e.tot || "17:00")}</div></div></div>${e.notes ? `<div class="hint">${esc(e.notes)}</div>` : ""}</div>
    <div class="card"><div class="chead"><h2>Kalender</h2>${rule ? '<span class="st good">staat erin</span>' : '<span class="st">niet in kalender</span>'}<span class="hdnote">${rule ? "coaches: " + ((rule.coach_ids || []).map(c => esc((coachById(c) || {}).name || "").split(" ")[0]).join(", ") || "—") : ""}</span></div>
      ${coord ? `<div class="klvbtn">${rule ? `<button class="btn sm ghost" id="edCalRm">Uit kalender halen</button><button class="btn sm ghost" id="edCalOpen">Openen in kalender</button>` : `<button class="btn sm o" id="edCalAdd" ${e.start ? "" : "disabled"}>In kalender zetten</button>`}</div><div class="hint">Als activiteit van het type Wedstrijd met de coaches van de gekoppelde groepen; wijzigingen aan datum of groepen werken door.</div>` : ""}</div>
    <div class="card"><div class="chead"><h2>Groepen & programma's</h2><span class="cvn">${gs.length}</span><span class="hdnote">${coord ? `<button class="xbtn sm" id="edAddGroup" title="Groep koppelen">${ICON.plus}</button>` : ""}</span></div>
      ${gs.map(g => { const p = programFor(g.id, e.season_id); const pk = p && (p.peaks || []).find(k => k.edition_id === e.id); return `<div class="rij"><span class="bar" style="background:${attr((store.byId("group_types", g.type_id) || {}).color)}"></span><span class="grow"><div class="tt">${esc(g.name)}</div><div class="sub">${pk ? "in programma als " + pk.level + "-piek" : "nog niet in programma"} · profiel ${esc(g.profile || "recreatief")}</div></span>${coord ? `<button class="xbtn sm" data-rmg="${attr(g.id)}" title="Loskoppelen">${ICON.close}</button>` : ""}</div>`; }).join("") || '<div class="empty">Nog geen groepen gekoppeld. Koppel groepen om de wedstrijd als piek in hun programma te zetten.</div>'}
      <div class="hint">Koppelen zet de wedstrijd als piek (klasse ${e.level || "B"}) in het programma van de groep voor dit seizoen; bij Selectie/Topgolf sturen A-pieken de fases.</div></div>`;
    const ed = $("#edEdit", sh); if (ed) ed.onclick = () => openEditionForm(id);
    const ca = $("#edCalAdd", sh); if (ca) ca.onclick = async () => { await syncCalendar(e, true); toast("In de kalender gezet"); refreshSheet(); };
    const cr = $("#edCalRm", sh); if (cr) cr.onclick = async () => { await syncCalendar(e, false); toast("Uit de kalender gehaald"); refreshSheet(); };
    const co = $("#edCalOpen", sh); if (co) co.onclick = () => { closeSheet(); location.hash = "#/kalender?date=" + e.start + "&mode=week"; };
    const ag = $("#edAddGroup", sh); if (ag) ag.onclick = () => openSheet(s2 => { const have = new Set(e.group_ids || []); s2.innerHTML = shead("Groep koppelen", esc(editionLabel(e))) + `<div class="card">${groupsSorted().filter(g => !have.has(g.id)).map(g => `<div class="rij clk" data-g="${attr(g.id)}"><span class="bar" style="background:${attr((store.byId("group_types", g.type_id) || {}).color)}"></span><span class="grow"><div class="tt" style="font-weight:500">${esc(g.name)}</div><div class="sub">${esc(g.profile || "recreatief")}${g.level ? " · " + esc(g.level) : ""}</div></span><span class="seg dark" style="pointer-events:auto"><button data-lv="A">A</button><button data-lv="B" class="${(e.level || "B") === "B" ? "on" : ""}">B</button><button data-lv="C">C</button></span></div>`).join("") || '<div class="empty">Alle groepen zijn al gekoppeld.</div>'}</div><div class="hint">Kies per groep de klasse (standaard: klasse van de editie).</div>`; s2.onclick = async ev => { const r = ev.target.closest("[data-g]"); if (!r) return; const lv = ev.target.closest("[data-lv]"); await linkGroup(e, r.dataset.g, lv ? lv.dataset.lv : (e.level || "B")); toast("Gekoppeld"); closeSheet(); refreshSheet(); }; });
    sh.onclick = async ev => { const r = ev.target.closest("[data-rmg]"); if (r) { await unlinkGroup(e, r.dataset.rmg); toast("Losgekoppeld"); refreshSheet(); } };
  });
}
export function openEditionForm(id, competitionId, seasonId) {
  const ex = id ? store.byId("competition_editions", id) : null; const def = store.byId("competitions", ex ? ex.competition_id : competitionId);
  const seasons = store.rows("seasons").slice().sort((a, b) => a.start < b.start ? 1 : -1);
  const d = ex ? { ...ex } : { competition_id: competitionId, season_id: seasonId || (seasons[0] || {}).id, name: "", start: "", end: "", level: def ? (def.klasse || "B") : "B", location_name: def ? def.location_name : "", van: "09:00", tot: "17:00", group_ids: [], notes: "", rule_id: null };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Editie bewerken" : "Nieuwe editie", esc(def ? def.name : ""), ex ? xbtn("trash", 'id="efDel"', "danger") : "") + `
    <div class="card"><div class="f2"><div><label class="fld" style="margin-top:0">Seizoen</label><select class="in" id="efSeason">${seasons.map(s => `<option value="${attr(s.id)}" ${d.season_id === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div><div><label class="fld" style="margin-top:0">Naam (optioneel, anders bibliotheeknaam)</label><input class="in" id="efName" value="${attr(d.name || "")}" placeholder="${attr(def ? def.name + " 2027" : "")}"></div></div>
      <div class="f3"><div><label class="fld">Datum</label><input class="in" id="efStart" type="date" value="${d.start || ""}"></div><div><label class="fld">Einde (meerdaags)</label><input class="in" id="efEnd" type="date" value="${d.end || ""}"></div><div><label class="fld">Klasse</label><select class="in" id="efLevel">${PEAK_LEVELS.map(([v, l]) => `<option value="${v}" ${d.level === v ? "selected" : ""}>${l}</option>`).join("")}</select></div></div>
      <div class="f3"><div><label class="fld">Van</label><input class="in" id="efVan" type="time" value="${d.van || "09:00"}"></div><div><label class="fld">Tot</label><input class="in" id="efTot" type="time" value="${d.tot || "17:00"}"></div><div><label class="fld">Locatie</label><input class="in" id="efLoc" value="${attr(d.location_name || "")}"></div></div>
      <label class="fld">Notities</label><textarea class="in" id="efNotes" style="min-height:56px">${esc(d.notes || "")}</textarea>
      <div class="hint">Een editie zonder datum staat als "zonder datum" in de lijst; zet de datum zodra die bekend is, dan kan hij in kalender en programma's.</div></div>
    <div class="klvbtn"><button class="btn o" id="efSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    const del = $("#efDel", sh); if (del) del.onclick = () => confirmInline(sh, "Editie verwijderen (ook uit kalender en programma's)?", async () => { await removeEdition(ex); closeSheet(); closeSheet(); toast("Editie verwijderd"); });
    $("#efSave", sh).onclick = async () => {
      const row = { ...d, season_id: val("efSeason", sh), name: val("efName", sh), start: val("efStart", sh) || null, end: val("efEnd", sh) || null, level: val("efLevel", sh), van: val("efVan", sh) || "09:00", tot: val("efTot", sh) || "17:00", location_name: val("efLoc", sh), notes: val("efNotes", sh) };
      if (row.end && row.start && row.end < row.start) return toast("Einde ligt voor de datum"); if (!row.id) delete row.id;
      const saved = await store.save("competition_editions", row);
      if (saved.rule_id) await syncCalendar(saved, true); // datum/tijd doorzetten
      for (const gid of saved.group_ids || []) await linkGroup(saved, gid, null); // pieken bijwerken
      closeSheet(); toast(ex ? "Editie opgeslagen" : "Editie aangemaakt"); if (!ex) openEdition(saved.id); else refreshSheet();
    };
  });
}

/* ---------- Koppelingen: kalender en programma ---------- */
export async function syncCalendar(e, on) {
  const ed = store.byId("competition_editions", e.id) || e; const def = store.byId("competitions", ed.competition_id);
  if (!on) { if (ed.rule_id) { await store.remove("schedule_rules", ed.rule_id); await store.save("competition_editions", { ...ed, rule_id: null }); } return; }
  if (!ed.start) return;
  const coaches = Array.from(new Set((ed.group_ids || []).flatMap(g => (groupById(g) || {}).coach_ids || [])));
  const multi = ed.end && ed.end > ed.start; const dates = []; if (multi) for (let x = ed.start; x <= ed.end; x = addDays(x, 1)) dates.push(x);
  const rule = { ...(ed.rule_id ? store.byId("schedule_rules", ed.rule_id) || {} : {}), id: ed.rule_id || undefined, kind: "activity", group_id: null, type_id: "at_wedstrijd", title: editionLabel(ed), freq: multi ? "custom" : "once", interval: 1, weekdays: [], nth: null, dates: multi ? dates : null, start: ed.start, end: null, count: null, van: ed.van || "09:00", tot: ed.tot || "17:00", location_id: locationsSorted().find(l => l.name === ed.location_name) ? locationsSorted().find(l => l.name === ed.location_name).id : "loc_extern", coach_ids: coaches, note: [ed.location_name || (def ? def.location_name : ""), def ? def.format : "", (ed.group_ids || []).map(g => (groupById(g) || {}).name).join(", ")].filter(Boolean).join(" · "), season_id: ed.season_id, skip_breaks: false, archived: false, edition_id: ed.id };
  if (!rule.id) delete rule.id;
  const saved = await store.save("schedule_rules", rule);
  if (saved.id !== ed.rule_id) await store.save("competition_editions", { ...ed, rule_id: saved.id });
}
export async function linkGroup(e, groupId, level) {
  const ed = store.byId("competition_editions", e.id) || e; const g = groupById(groupId); if (!g) return;
  const ids = Array.from(new Set((ed.group_ids || []).concat([groupId])));
  if (ids.length !== (ed.group_ids || []).length) await store.save("competition_editions", { ...ed, group_ids: ids });
  if (!ed.start) return;
  const season = store.byId("seasons", ed.season_id); if (!season) return;
  const prog = programFor(groupId, ed.season_id) || newProgram(g, season);
  const peaks = (prog.peaks || []).filter(p => p.edition_id !== ed.id);
  const old = (prog.peaks || []).find(p => p.edition_id === ed.id);
  peaks.push({ id: old ? old.id : "pk_" + Math.random().toString(36).slice(2, 8), name: editionLabel(ed), date: ed.start, end: ed.end && ed.end !== ed.start ? ed.end : "", level: level || (old ? old.level : ed.level || "B"), edition_id: ed.id, activity_key: ed.rule_id || null });
  peaks.sort((a, b) => a.date < b.date ? -1 : 1);
  const row = { ...prog, peaks }; if (!row.id) delete row.id; await store.save("programs", row);
  if (ed.rule_id) await syncCalendar(store.byId("competition_editions", ed.id), true);
}
export async function unlinkGroup(e, groupId) {
  const ed = store.byId("competition_editions", e.id) || e;
  await store.save("competition_editions", { ...ed, group_ids: (ed.group_ids || []).filter(x => x !== groupId) });
  const prog = programFor(groupId, ed.season_id); if (prog) await store.save("programs", { ...prog, peaks: (prog.peaks || []).filter(p => p.edition_id !== ed.id) });
  if (ed.rule_id) await syncCalendar(store.byId("competition_editions", ed.id), true);
}
async function removeEdition(ed) { for (const gid of ed.group_ids || []) await unlinkGroup(ed, gid); if (ed.rule_id) await store.remove("schedule_rules", ed.rule_id); await store.remove("competition_editions", ed.id); }

/** Kiezer voor de programmapagina: edities van dit seizoen koppelen aan een groep. */
export function openEditionPicker(g, season, onDone) {
  openSheet(sh => {
    const eds = editions(season.id).filter(e => e.start); const have = new Set((programFor(g.id, season.id) || {}).peaks ? programFor(g.id, season.id).peaks.map(p => p.edition_id).filter(Boolean) : []);
    sh.innerHTML = shead("Wedstrijd uit bibliotheek", `${esc(g.name)} · ${esc(season.name)}`, isCoordinator() ? xbtn("plus", 'id="epNew" title="Nieuwe wedstrijd in bibliotheek"') : "") + `<div class="card">${eds.length ? eds.map(e => `<div class="rij ${have.has(e.id) ? "" : "clk"}" data-e="${attr(e.id)}"><span class="pklv ${e.level || "B"}">${e.level || "B"}</span><span class="tm" style="min-width:70px">${fmtDate(e.start, { weekday: true })}</span><span class="grow"><div class="tt ell">${esc(editionLabel(e))}</div><div class="sub ell">${esc((store.byId("competitions", e.competition_id) || {}).category || "")}${e.location_name ? " · " + esc(e.location_name) : ""}</div></span>${have.has(e.id) ? '<span class="st good">gekoppeld</span>' : '<span class="seg dark" style="pointer-events:auto"><button data-lv="A">A</button><button data-lv="B" class="on">B</button><button data-lv="C">C</button></span>'}</div>`).join("") : '<div class="empty">Geen edities met datum in dit seizoen. Maak ze aan op de pagina Wedstrijden.</div>'}</div><div class="hint">Tik op een rij om te koppelen; kies eerst A/B/C voor de klasse in dit programma.</div>`;
    const nw = $("#epNew", sh); if (nw) nw.onclick = () => { closeSheet(); location.hash = "#/wedstrijden"; };
    sh.onclick = async ev => { const r = ev.target.closest("[data-e]"); if (!r || have.has(r.dataset.e)) return; const lv = ev.target.closest("[data-lv]"); const e = store.byId("competition_editions", r.dataset.e); await linkGroup(e, g.id, lv ? lv.dataset.lv : (e.level || "B")); have.add(e.id); toast("Gekoppeld als " + (lv ? lv.dataset.lv : e.level || "B") + "-piek"); refreshSheet(); if (onDone) onDone(); };
  });
}
