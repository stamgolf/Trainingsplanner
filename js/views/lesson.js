// Lesvoorbereiding: kaart in de sessie-sheet, editor, drill-kiezer, kopiëren, PDF, leerlijn (periodethema's) en seizoen genereren.
import { store, isCoordinator, coachById, groupById } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, refreshSheet, shead, toast, xbtn, confirmInline, val, ICON, searchPil, avatar } from "../lib/ui.js";
import { todayISO, addDays, fmtDate, fmtDateLong, DAGEN, weekStart } from "../lib/dates.js";
import { generate, alternative, materialOf, planFor, PHASES, phaseLabel, themesOf, themeFor, firstSentence } from "../lib/generator.js";
import { lessonPdf, openPdf, downloadPdf } from "../lib/pdf.js";
import { sessionsIn, sessionByKey, groupsSorted } from "../lib/model.js";
import { TAXONOMY } from "../data/taxonomy.js";
import { mainLabel, subLabel, matches, MC_ACCENT } from "./drills.js";

const THEME_COLORS = ["#F47C20", "#4A6FA5", "#17a05c", "#8E6BB5", "#2A9D8F", "#B5832A", "#C2383A", "#7A7F85"];

/* ---------- Kaart in de sessie-sheet ---------- */
export function lessonCardHtml(s, canEdit) {
  const p = planFor(s.key);
  if (!p) return `<div class="card"><div class="chead"><h2>Lesvoorbereiding</h2><span class="hdnote">nog geen</span></div>${canEdit ? `<div class="klvbtn"><button class="btn o" id="lpGen">Voorstel genereren</button><button class="btn ghost" id="lpNew">Zelf opstellen</button><button class="btn ghost" id="lpCopyFrom">Kopiëren van …</button></div><div class="hint">De generator kijkt naar niveau, leeftijd, periodethema, duur, locatie en wat deze groep eerder deed.</div>` : '<div class="empty">Nog geen voorbereiding.</div>'}</div>`;
  const mat = materialOf(p);
  return `<div class="card"><div class="chead"><h2>Lesvoorbereiding</h2><span class="st ${p.status === "definitief" ? "good" : "att"}">${p.status === "definitief" ? "definitief" : "concept"}</span><span class="hdnote">${p.source === "generator" ? "voorstel" : ""} ${xbtn("print", 'id="lpPdf" title="PDF (digitaal / print)"', "sm")}${canEdit ? xbtn("edit", 'id="lpEdit" title="Bewerken"', "sm") + xbtn("copy", 'id="lpCopy" title="Kopiëren naar andere sessie"', "sm") : ""}</span></div>
    <div class="tiles" style="margin-bottom:8px"><div class="tile"><div class="lb">Thema</div><div class="s" style="color:var(--ink);font-size:13px">${esc(p.thema || "—")}</div></div><div class="tile" style="grid-column:span 2"><div class="lb">Lesdoel</div><div class="s" style="color:var(--ink);font-size:13px">${esc(p.lesdoel || "—")}</div></div></div>
    ${(p.blocks || []).map(b => { const d = b.drill_id ? store.byId("drills", b.drill_id) : null; return `<div class="rij ${d ? "clk" : ""}" ${d ? `data-drill="${attr(d.id)}"` : ""}><span class="bar" style="background:${d ? attr(MC_ACCENT[d.main_cat] || "#7A7F85") : "var(--line)"}"></span><span class="tm" style="min-width:48px">${b.minutes} min</span><span class="grow"><div class="tt ell" style="font-weight:500">${esc(d ? d.title : (b.title || phaseLabel(b.phase)))}</div><div class="sub ell">${esc(phaseLabel(b.phase))}${d ? " · " + esc(mainLabel(d.main_cat)) + ((d.sub_cats || []).length ? " · " + esc(subLabel(d.main_cat, d.sub_cats[0])) : "") : ""}${b.note ? " · " + esc(b.note) : ""}</div></span>${d ? '<span class="chev">›</span>' : ""}</div>`; }).join("")}
    ${mat.length ? `<div class="hint" style="margin-top:8px"><b>Materiaal:</b> ${mat.map(esc).join(", ")}</div>` : ""}${p.notitie ? `<div class="hint">${esc(p.notitie)}</div>` : ""}
    ${canEdit && p.status !== "definitief" ? `<div class="klvbtn" style="margin-top:10px"><button class="btn sm o" id="lpFinal">Definitief maken</button><button class="btn sm ghost" id="lpRegen">Opnieuw genereren</button></div>` : ""}</div>`;
}
export function bindLessonCard(sh, s) {
  const p = planFor(s.key);
  const g = $("#lpGen", sh); if (g) g.onclick = async () => { const plan = await savePlan(s, { ...generate(s), source: "generator", status: "concept" }); toast("Voorstel klaargezet"); refreshSheet(); };
  const n = $("#lpNew", sh); if (n) n.onclick = () => openLessonEditor(s, { session_key: s.key, rule_id: s.rule_id, date: s.date, group_id: s.group_id, thema: "", lesdoel: "", notitie: "", status: "concept", source: "coach", blocks: PHASES.map(([k, l, sh]) => ({ id: "b_" + k + Math.random().toString(36).slice(2, 6), phase: k, drill_id: null, title: "", minutes: Math.round((s.minutes || 60) * sh / 5) * 5, note: "" })) });
  const cf = $("#lpCopyFrom", sh); if (cf) cf.onclick = () => openCopyFrom(s);
  const e = $("#lpEdit", sh); if (e) e.onclick = () => openLessonEditor(s, p);
  const c = $("#lpCopy", sh); if (c) c.onclick = () => openCopyTo(s, p);
  const pdf = $("#lpPdf", sh); if (pdf) pdf.onclick = () => exportPdf(s, p);
  const f = $("#lpFinal", sh); if (f) f.onclick = async () => { await store.save("lesson_plans", { ...p, status: "definitief" }); toast("Definitief"); refreshSheet(); };
  const r = $("#lpRegen", sh); if (r) r.onclick = async () => { const round = (p.round || 0) + 1; await store.save("lesson_plans", { ...p, ...generate(s, { round }), round, source: "generator" }); toast("Nieuw voorstel"); refreshSheet(); };
  sh.querySelectorAll("[data-drill]").forEach(el => el.onclick = () => import("./drills.js").then(m => m.openDrill(el.dataset.drill)));
}
async function savePlan(s, data) { const ex = planFor(s.key); const row = { ...(ex || {}), ...data, id: ex ? ex.id : undefined, session_key: s.key, rule_id: s.rule_id, date: s.date, group_id: s.group_id, updated: new Date().toISOString() }; if (!row.id) delete row.id; return store.save("lesson_plans", row); }
async function exportPdf(s, p) { try { toast("PDF maken …"); const bytes = await lessonPdf(s, p); openPdf(bytes, `lesvoorbereiding-${(s.group ? s.group.name : s.label).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${s.date}.pdf`); } catch (e) { console.error(e); toast("PDF kon niet worden gemaakt"); } }

/* ---------- Editor ---------- */
export function openLessonEditor(s, plan) {
  const d = JSON.parse(JSON.stringify(plan)); d.blocks = d.blocks || [];
  openSheet(sh => {
    const total = d.blocks.reduce((a, b) => a + (+b.minutes || 0), 0);
    sh.innerHTML = shead("Lesvoorbereiding", esc(s.label) + " · " + fmtDate(s.date, { weekday: true }) + " " + s.van + " · " + s.minutes + " min", d.id ? xbtn("trash", 'id="leDel"', "danger") : "") + `
    <div class="card"><label class="fld" style="margin-top:0">Thema</label><input class="in" id="leThema" value="${attr(d.thema || "")}" placeholder="bv. Kort spel · chippen"><label class="fld">Lesdoel</label><input class="in" id="leDoel" value="${attr(d.lesdoel || "")}" placeholder="Wat kunnen de spelers na deze les?"></div>
    <div class="card"><div class="chead"><h2>Opbouw</h2><span class="cvn ${total !== s.minutes ? "bad" : ""}">${total} / ${s.minutes} min</span><span class="hdnote"><button class="xbtn sm" id="leAdd" title="Blok toevoegen">${ICON.plus}</button></span></div>
      ${d.blocks.map((b, i) => { const dr = b.drill_id ? store.byId("drills", b.drill_id) : null; return `<div class="leblk" data-i="${i}"><div class="row" style="align-items:flex-start"><select class="in" data-phase="${i}" style="width:150px;height:34px;flex:none">${PHASES.map(([k, l]) => `<option value="${k}" ${b.phase === k ? "selected" : ""}>${l}</option>`).join("")}</select><input class="in" type="number" min="5" step="5" data-min="${i}" value="${b.minutes}" style="width:70px;height:34px;flex:none" title="minuten"><span class="grow"></span><button class="xbtn sm" data-up="${i}" title="Omhoog">↑</button><button class="xbtn sm" data-down="${i}" title="Omlaag">↓</button><button class="xbtn sm danger" data-rm="${i}">${ICON.close}</button></div>
        <div class="row" style="margin-top:6px"><span class="bar" style="width:4px;align-self:stretch;border-radius:2px;background:${dr ? attr(MC_ACCENT[dr.main_cat] || "#7A7F85") : "var(--line)"};min-height:30px"></span><span class="grow" style="min-width:0">${dr ? `<div class="tt ell" style="font-weight:600;font-size:13px">${esc(dr.title)}</div><div class="sub ell" style="font-size:11.5px;color:var(--muted)">${esc(mainLabel(dr.main_cat))}${(dr.sub_cats || []).length ? " · " + esc(subLabel(dr.main_cat, dr.sub_cats[0])) : ""}${dr.dur_min ? " · " + dr.dur_min + " min" : ""}</div>` : `<input class="in" data-title="${i}" value="${attr(b.title || "")}" placeholder="Vrije tekst (of kies een drill)" style="height:34px">`}</span></div>
        <div class="klvbtn" style="margin-top:6px"><button class="btn sm ghost" data-pick="${i}">${dr ? "Andere drill" : "Drill kiezen"}</button>${dr ? `<button class="btn sm ghost" data-alt="${i}">Alternatief</button><button class="btn sm ghost" data-easy="${i}">Makkelijker</button><button class="btn sm ghost" data-hard="${i}">Moeilijker</button><button class="btn sm ghost" data-info="${attr(dr.id)}">i</button>` : ""}</div>
        <input class="in" data-note="${i}" value="${attr(b.note || "")}" placeholder="Notitie bij dit blok (organisatie, variatie, aandachtspunt)" style="height:32px;margin-top:6px;font-size:12.5px"></div>`; }).join("") || '<div class="empty">Nog geen blokken.</div>'}
    </div>
    <div class="card"><label class="fld" style="margin-top:0">Notities</label><textarea class="in" id="leNote" style="min-height:64px" placeholder="Materiaal klaarzetten, afspraken, aandachtspunten per speler …">${esc(d.notitie || "")}</textarea>
      <div class="sw" style="margin-top:8px"><div><div class="t">Definitief</div><div class="d">Concept = nog in bewerking; definitief = klaar om te geven</div></div><button class="toggle ${d.status === "definitief" ? "on" : ""}" id="leFinal"></button></div></div>
    <div class="klvbtn"><button class="btn o" id="leSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    const read = () => { d.thema = val("leThema", sh); d.lesdoel = val("leDoel", sh); d.notitie = val("leNote", sh); d.blocks.forEach((b, i) => { const ph = $(`[data-phase="${i}"]`, sh); if (ph) b.phase = ph.value; const mn = $(`[data-min="${i}"]`, sh); if (mn) b.minutes = +mn.value || 0; const t = $(`[data-title="${i}"]`, sh); if (t) b.title = t.value; const n = $(`[data-note="${i}"]`, sh); if (n) b.note = n.value; }); d.status = $("#leFinal", sh).classList.contains("on") ? "definitief" : "concept"; };
    $("#leFinal", sh).onclick = e => e.target.classList.toggle("on");
    $("#leAdd", sh).onclick = () => { read(); d.blocks.push({ id: "b_" + Math.random().toString(36).slice(2, 8), phase: "spelvorm", drill_id: null, title: "", minutes: 10, note: "" }); refreshSheet(); };
    sh.addEventListener("change", e => { if (e.target.matches("[data-min]")) { read(); const t = d.blocks.reduce((a, b) => a + (+b.minutes || 0), 0); const c = sh.querySelector(".cvn"); if (c) { c.textContent = t + " / " + s.minutes + " min"; c.classList.toggle("bad", t !== s.minutes); } } });
    sh.onclick = async e => {
      const b = e.target.closest("button"); if (!b) return;
      const i = +(b.dataset.rm ?? b.dataset.up ?? b.dataset.down ?? b.dataset.pick ?? b.dataset.alt ?? b.dataset.easy ?? b.dataset.hard ?? -1);
      if (b.dataset.rm != null) { read(); d.blocks.splice(i, 1); refreshSheet(); }
      else if (b.dataset.up != null) { read(); if (i > 0) { [d.blocks[i - 1], d.blocks[i]] = [d.blocks[i], d.blocks[i - 1]]; refreshSheet(); } }
      else if (b.dataset.down != null) { read(); if (i < d.blocks.length - 1) { [d.blocks[i + 1], d.blocks[i]] = [d.blocks[i], d.blocks[i + 1]]; refreshSheet(); } }
      else if (b.dataset.pick != null) { read(); openDrillPicker(s, d, d.blocks[i], dr => { d.blocks[i].drill_id = dr.id; if (!d.blocks[i].minutes && dr.dur_min) d.blocks[i].minutes = +dr.dur_min; refreshSheet(); }); }
      else if (b.dataset.alt != null || b.dataset.easy != null || b.dataset.hard != null) { read(); const dr = alternative(s, d, d.blocks[i], b.dataset.easy != null ? "easier" : b.dataset.hard != null ? "harder" : null); if (dr) { d.blocks[i].drill_id = dr.id; refreshSheet(); toast(dr.title); } else toast("Geen alternatief gevonden"); }
      else if (b.dataset.info) { import("./drills.js").then(m => m.openDrill(b.dataset.info)); }
    };
    const del = $("#leDel", sh); if (del) del.onclick = () => confirmInline(sh, "Deze lesvoorbereiding verwijderen?", async () => { await store.remove("lesson_plans", d.id); closeSheet(); toast("Verwijderd"); refreshSheet(); });
    $("#leSave", sh).onclick = async () => { read(); if (!d.blocks.length) { toast("Voeg minstens één blok toe"); return; } await savePlan(s, { ...d, source: d.source || "coach" }); closeSheet(); toast("Lesvoorbereiding opgeslagen"); refreshSheet(); };
  });
}

/* ---------- Drill-kiezer ---------- */
export function openDrillPicker(s, plan, block, onPick) {
  let q = "", main = "", sub = "";
  const inPlan = new Set((plan.blocks || []).map(b => b.drill_id).filter(Boolean));
  openSheet(sh => {
    const mc = TAXONOMY.find(t => t.key === main);
    let list = store.rows("drills").filter(d => d.status !== "concept");
    if (main) list = list.filter(d => d.main_cat === main); if (sub) list = list.filter(d => (d.sub_cats || []).includes(sub));
    if (q) { const ql = q.toLowerCase(); list = list.filter(d => (d.title + " " + (d.goal || "")).toLowerCase().includes(ql)); }
    const lvl = s.group ? s.group.level : ""; const fit = d => !lvl || !(d.levels || []).length || d.levels.includes(lvl);
    list.sort((a, b) => (fit(b) - fit(a)) || a.title.localeCompare(b.title));
    sh.innerHTML = shead("Drill kiezen", esc(phaseLabel(block.phase)) + (lvl ? " · passend bij " + esc(lvl) + " eerst" : "")) + `
    <div class="card"><div class="row" style="flex-wrap:wrap">${searchPil("dpQ", "Zoek drill …", q)}</div>
      <div class="drchips" style="margin-top:8px" id="dpMain"><button data-m="" class="${main ? "" : "on"}">Alle</button>${TAXONOMY.map(m => `<button data-m="${m.key}" class="${main === m.key ? "on" : ""}">${esc(m.label)}</button>`).join("")}</div>
      ${mc && mc.subs ? `<div class="drchips mini" style="margin-top:6px" id="dpSub"><button data-s="" class="${sub ? "" : "on"}">Alle</button>${mc.subs.map(x => `<button data-s="${x.key}" class="${sub === x.key ? "on" : ""}">${esc(x.label)}</button>`).join("")}</div>` : ""}</div>
    <div class="card"><div class="chead"><h2>Drills</h2><span class="cvn">${list.length}</span></div><div class="cbody" style="max-height:60vh">${list.slice(0, 80).map(d => `<div class="rij clk" data-pick="${attr(d.id)}"><span class="bar" style="background:${attr(MC_ACCENT[d.main_cat] || "#7A7F85")}"></span><span class="grow"><div class="tt ell" style="font-weight:500">${esc(d.title)}${inPlan.has(d.id) ? ' <span class="st">in plan</span>' : ""}${!fit(d) ? ' <span class="st">ander niveau</span>' : ""}</div><div class="sub ell">${esc(mainLabel(d.main_cat))}${(d.sub_cats || []).length ? " · " + esc(subLabel(d.main_cat, d.sub_cats[0])) : ""}${d.training_type ? " · " + esc(d.training_type) : ""}${d.dur_min ? " · " + d.dur_min + " min" : ""} · ${esc(firstSentence(d.goal, 70))}</div></span><button class="xbtn sm" data-info="${attr(d.id)}">i</button></div>`).join("") || '<div class="empty">Geen drills gevonden.</div>'}</div></div>`;
    $("#dpQ", sh).oninput = e => { q = e.target.value; refreshSheet(); const i = $("#dpQ"); i.focus(); i.setSelectionRange(99, 99); };
    $("#dpMain", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; main = b.dataset.m; sub = ""; refreshSheet(); };
    const ds = $("#dpSub", sh); if (ds) ds.onclick = e => { const b = e.target.closest("button"); if (!b) return; sub = b.dataset.s; refreshSheet(); };
    sh.onclick = e => { const inf = e.target.closest("[data-info]"); if (inf) { e.stopPropagation(); import("./drills.js").then(m => m.openDrill(inf.dataset.info)); return; } const p = e.target.closest("[data-pick]"); if (p) { const dr = store.byId("drills", p.dataset.pick); closeSheet(); onPick(dr); } };
  });
}

/* ---------- Kopiëren ---------- */
function sessionPicker(title, sub, list, onPick) {
  openSheet(sh => {
    sh.innerHTML = shead(title, sub) + `<div class="card"><div class="cbody" style="max-height:70vh">${list.length ? list.map(x => `<div class="rij clk" data-k="${attr(x.key)}"><span class="bar" style="background:${attr(x.color)}"></span><span class="tm" style="min-width:60px">${fmtDate(x.date, { weekday: true })}</span><span class="grow"><div class="tt ell" style="font-weight:500">${esc(x.label)}</div><div class="sub">${x.van}–${x.tot}${x.plan ? " · " + esc(x.plan.thema || "voorbereiding") + (x.plan.status === "definitief" ? " ✓" : " (concept)") : ""}</div></span><span class="chev">›</span></div>`).join("") : '<div class="empty">Geen sessies gevonden.</div>'}</div></div>`;
    sh.onclick = e => { const r = e.target.closest("[data-k]"); if (r) { closeSheet(); onPick(r.dataset.k); } };
  });
}
export function openCopyTo(s, plan) {
  const list = sessionsIn(todayISO(), addDays(todayISO(), 60)).filter(x => x.key !== s.key && x.status !== "afgelast" && (x.group_id || x.kind === "activity")).map(x => ({ ...x, plan: planFor(x.key) })).slice(0, 80);
  sessionPicker("Kopiëren naar", "Zelfde voorbereiding voor een andere sessie (bestaande wordt overschreven)", list, async key => { const t = sessionByKey(key); if (!t) return; const copy = { ...plan, id: undefined, session_key: t.key, rule_id: t.rule_id, date: t.date, group_id: t.group_id, status: "concept", blocks: (plan.blocks || []).map(b => ({ ...b, id: "b_" + Math.random().toString(36).slice(2, 8) })) }; const ex = planFor(t.key); if (ex) copy.id = ex.id; else delete copy.id; await store.save("lesson_plans", copy); toast("Gekopieerd naar " + fmtDate(t.date, { weekday: true })); });
}
export function openCopyFrom(s) {
  const plans = store.rows("lesson_plans").slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 80);
  const list = plans.map(p => { const x = sessionByKey(p.session_key); return x ? { ...x, plan: p } : null; }).filter(Boolean);
  sessionPicker("Kopiëren van", "Kies een bestaande voorbereiding als basis", list, async key => { const src = planFor(key); if (!src) return; const copy = { ...src, session_key: s.key, rule_id: s.rule_id, date: s.date, group_id: s.group_id, status: "concept", blocks: (src.blocks || []).map(b => ({ ...b, id: "b_" + Math.random().toString(36).slice(2, 8) })) }; delete copy.id; await store.save("lesson_plans", copy); toast("Gekopieerd"); refreshSheet(); });
}

/* ---------- Leerlijn / periodethema's per groep ---------- */
export function themesCardHtml(g, canEdit) {
  const ts = themesOf(g.id); const today = todayISO();
  return `<div class="card"><div class="chead"><h2>Leerlijn</h2><span class="cvn">${ts.length}</span><span class="hdnote">periodethema's ${canEdit ? `<button class="xbtn sm" id="thAdd" title="Thema toevoegen">${ICON.plus}</button>` : ""}</span></div>
    ${ts.length ? ts.map(t => { const end = addDays(t.start, (t.weeks || 4) * 7 - 1); const cur = today >= t.start && today <= end; return `<div class="rij ${canEdit ? "clk" : ""}" data-theme="${attr(t.id)}"><span class="bar" style="background:${attr(t.color || "#7A7F85")}"></span><span class="grow"><div class="tt">${esc(t.name)}${cur ? ' <span class="st att">nu</span>' : ""}</div><div class="sub">${fmtDate(t.start)} – ${fmtDate(end)} · ${t.weeks} wk${(t.focus_cats || []).length ? " · " + t.focus_cats.map(c => esc(labelOfCat(c))).join(", ") : ""}${t.goal ? " · " + esc(t.goal) : ""}</div></span>${canEdit ? '<span class="chev">›</span>' : ""}</div>`; }).join("") : `<div class="empty">Nog geen leerlijn. ${canEdit ? "Deel het seizoen op in thema's (bv. 4 weken kort spel, 4 weken lange slag); de generator gebruikt ze." : ""}</div>`}
    ${canEdit ? `<div class="klvbtn" style="margin-top:10px"><button class="btn sm ghost" id="thGenSeason">Voorstellen genereren voor komende sessies</button>${ts.length ? `<button class="btn sm ghost" id="thCopyLine">Leerlijn kopiëren naar …</button>` : ""}</div>` : ""}</div>`;
}
export function labelOfCat(c) { const m = TAXONOMY.find(t => t.key === c); if (m) return m.label; for (const t of TAXONOMY) { const s = (t.subs || []).find(x => x.key === c); if (s) return s.label; } return c; }
export function bindThemesCard(sh, g) {
  const a = $("#thAdd", sh); if (a) a.onclick = () => openThemeForm(g.id);
  sh.querySelectorAll("[data-theme]").forEach(el => el.onclick = () => openThemeForm(g.id, el.dataset.theme));
  const gs = $("#thGenSeason", sh); if (gs) gs.onclick = async () => { const list = sessionsIn(todayISO(), addDays(todayISO(), 120), { group_id: g.id }).filter(x => x.status !== "afgelast" && !planFor(x.key)); if (!list.length) { toast("Alle komende sessies hebben al een voorbereiding"); return; } for (const x of list) await savePlan(x, { ...generate(x), source: "generator", status: "concept" }); toast(list.length + " voorstellen klaargezet"); refreshSheet(); };
  const cl = $("#thCopyLine", sh); if (cl) cl.onclick = () => openSheet(s2 => { s2.innerHTML = shead("Leerlijn kopiëren naar", esc(g.name)) + `<div class="card">${groupsSorted().filter(x => x.id !== g.id).map(x => `<div class="rij clk" data-g="${attr(x.id)}"><span class="grow tt" style="font-weight:500">${esc(x.name)}</span><span class="sub">${themesOf(x.id).length} thema's</span><span class="chev">›</span></div>`).join("")}</div>`; s2.onclick = async e => { const r = e.target.closest("[data-g]"); if (!r) return; for (const t of themesOf(g.id)) { const c = { ...t, group_id: r.dataset.g }; delete c.id; await store.save("group_themes", c); } closeSheet(); toast("Leerlijn gekopieerd"); }; });
}
export function openThemeForm(groupId, id) {
  const ex = id ? store.byId("group_themes", id) : null; const ts = themesOf(groupId);
  const last = ts[ts.length - 1]; const defStart = last ? addDays(last.start, (last.weeks || 4) * 7) : weekStart(todayISO());
  const d = ex ? { ...ex, focus_cats: (ex.focus_cats || []).slice() } : { group_id: groupId, name: "", start: defStart, weeks: 4, focus_cats: [], goal: "", color: THEME_COLORS[ts.length % THEME_COLORS.length] };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Thema bewerken" : "Nieuw periodethema", esc((groupById(groupId) || {}).name), ex ? xbtn("trash", 'id="tfDel"', "danger") : "") + `
    <div class="card"><label class="fld" style="margin-top:0">Naam</label><input class="in" id="tfName" value="${attr(d.name)}" placeholder="bv. Kort spel, Lange slag, Baan & strategie">
      <div class="f2"><div><label class="fld">Start (maandag)</label><input class="in" id="tfStart" type="date" value="${d.start}"></div><div><label class="fld">Aantal weken</label><input class="in" id="tfWeeks" type="number" min="1" max="26" value="${d.weeks}"></div></div>
      <label class="fld">Focus (categorieën die de generator voorrang geeft)</label>${TAXONOMY.map(m => `<div class="drchips mini" style="margin-bottom:5px" data-cat="${m.key}"><button data-c="${m.key}" class="${d.focus_cats.includes(m.key) ? "on" : ""}"><b>${esc(m.label)}</b></button>${(m.subs || []).map(s => `<button data-c="${s.key}" class="${d.focus_cats.includes(s.key) ? "on" : ""}">${esc(s.label)}</button>`).join("")}</div>`).join("")}
      <label class="fld">Lesdoel van de periode</label><input class="in" id="tfGoal" value="${attr(d.goal || "")}" placeholder="bv. Chip met 3 clubs op afstand kunnen spelen">
      <label class="fld">Kleur</label><div class="pick" id="tfColor">${THEME_COLORS.map(k => `<button data-v="${k}" class="${d.color === k ? "on" : ""}" style="width:28px;padding:0;justify-content:center"><span style="width:14px;height:14px;border-radius:50%;background:${k};display:inline-block"></span></button>`).join("")}</div></div>
    <div class="klvbtn"><button class="btn o" id="tfSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    sh.querySelectorAll("[data-cat]").forEach(el => el.onclick = e => { const b = e.target.closest("button"); if (!b) return; const i = d.focus_cats.indexOf(b.dataset.c); if (i >= 0) d.focus_cats.splice(i, 1); else d.focus_cats.push(b.dataset.c); b.classList.toggle("on"); });
    $("#tfColor", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; d.color = b.dataset.v; $$("button", e.currentTarget).forEach(x => x.classList.toggle("on", x === b)); };
    const del = $("#tfDel", sh); if (del) del.onclick = async () => { await store.remove("group_themes", id); closeSheet(); refreshSheet(); };
    $("#tfSave", sh).onclick = async () => { const row = { ...d, name: val("tfName", sh), start: val("tfStart", sh), weeks: +val("tfWeeks", sh) || 4, goal: val("tfGoal", sh) }; if (!row.name) return toast("Geef het thema een naam"); if (!row.id) delete row.id; await store.save("group_themes", row); closeSheet(); refreshSheet(); };
  });
}
