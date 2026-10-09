// Drills-database naar C@ddie-model: filterkolom met chips, bibliotheek met zoeken/sorteren en mediakaarten,
// dekkingsmatrix, detailvenster met tabs. (Generator en lesvoorbereiding volgen in fase 2.)
import { store, isCoordinator, coachById } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, refreshSheet, shead, toast, kpi, val, xbtn, confirmInline, ICON } from "../lib/ui.js";
import { TAXONOMY } from "../data/taxonomy.js";
import { todayISO } from "../lib/dates.js";
import { locationsSorted } from "../lib/model.js";

const cfg = window.TP_CONFIG || {};
export const MC_ACCENT = { golfskills: "#2e78e8", spelen: "#7a5ad2", fysiek: "#0f9e73", prestatiegedrag: "#c8791a" };
export const TRAIN_TYPES = [["techniek", "Techniek"], ["skill", "Skill"], ["performance", "Performance"]];
export const LEVELS = ["Kennismaking", "Golfstart", "Baanpermissie", "hcp 54-36", "hcp 36-18", "hcp 18-9", "Competitie recreatief", "Competitie competitief", "Selectie"];
export const MJOP_PHASES = [["F1", "Starten en ontdekken", "U6/U8"], ["F2", "Fundament", "U8/U10"], ["F3", "Leren spelen", "U10/U12"], ["A1", "Beter spelen", "U12/U14"], ["A2", "Competitief golfen", "U14/U16"], ["T1", "Topgolfprincipes", "U16"], ["T2", "Trainen om te presteren", "U18"], ["T3", "Trainen voor de top", "U20/U22"], ["E1", "Trainen om te excelleren", "U22/22+"], ["E2", "Excelleren", "22+"], ["M1", "Langdurig excelleren", "22+"], ["M2", "Wereldpodium", "26+/32+"]];
export const phaseLabel = k => { const p = MJOP_PHASES.find(x => x[0] === k); return p ? p[0] + " · " + p[1] : k; };
export const WORKFORMS = ["Individueel", "Tweetallen", "Stations", "Circuit", "Wedstrijdvorm", "Spel", "Groepsinstructie"];
export const AGES = ["U4", "U6", "U8", "U10", "U12", "U14", "U16", "U18", "Volwassenen", "Senioren"];
export const AUDS = [["ind", "Individueel"], ["groep", "Groep"], ["beide", "Beide"]];
export const INTENS = [["laag", "Laag"], ["midden", "Midden"], ["hoog", "Hoog"]];

export const mainLabel = key => (TAXONOMY.find(t => t.key === key) || {}).label || key;
export const subsOf = key => ((TAXONOMY.find(t => t.key === key) || {}).subs || []);
export const subLabel = (mainKey, key) => { const s = subsOf(mainKey).find(x => x.key === key); return s ? s.label : key; };
const typeLabel = k => (TRAIN_TYPES.find(t => t[0] === k) || [k, k])[1];
const typeCode = d => d.main_cat === "golfskills" ? ({ techniek: "TK", skill: "SK", performance: "PF" })[d.training_type] || "GS" : ({ fysiek: "FY", prestatiegedrag: "PG", spelen: "SP" })[d.main_cat] || "";
export function phaseRange(ph) { const idx = ph.map(p => MJOP_PHASES.findIndex(x => x[0] === p)).filter(i => i >= 0).sort((a, b) => a - b); if (!idx.length) return ""; const a = MJOP_PHASES[idx[0]][0], b = MJOP_PHASES[idx[idx.length - 1]][0]; return a === b ? a : a + " – " + b; }
const lvl = v => ({ laag: 1, midden: 3, hoog: 5 })[v] || 0;

const F0 = () => ({ main: "", subs: [], types: [], levels: [], phases: [], locs: [], ages: [], wfs: [], mats: [], auds: [], eigen: false, fav: false });
const st = { f: F0(), q: "", sort: "naam", more: false, open: window.innerWidth > 699, mx: false, mxBy: "type" };
try { Object.assign(st, JSON.parse(sessionStorage.getItem("tp_drills") || "{}")); } catch (e) { }
function persist() { try { sessionStorage.setItem("tp_drills", JSON.stringify(st)); } catch (e) { } }

export function visibleDrills() { return store.rows("drills").filter(d => d.status !== "concept" || isCoordinator() || d.owner_id === (store.me || {}).id); }
/** Hoe vaak een drill in lesvoorbereidingen is gebruikt (fase 2 vult dit). */
export function usageMap() { const m = {}; store.rows("lesson_plans").forEach(p => (p.blocks || []).forEach(b => { if (b.drill_id) m[b.drill_id] = (m[b.drill_id] || 0) + 1; })); return m; }
function matAll() { const s = new Set(); visibleDrills().forEach(d => (d.material || []).forEach(m => s.add(m))); return Array.from(s).sort(); }
function locOptions() { return locationsSorted().map(l => l.name); }
function nFilters() { const f = st.f; return (f.main ? 1 : 0) + f.subs.length + f.types.length + f.levels.length + (f.phases || []).length + f.locs.length + f.ages.length + f.wfs.length + f.mats.length + f.auds.length + (f.eigen ? 1 : 0) + (f.fav ? 1 : 0); }

export function matches(d, f, skip = {}) {
  const me = (store.me || {}).id;
  if (!skip.main && f.main && d.main_cat !== f.main) return false;
  if (!skip.subs && f.subs.length && !f.subs.some(s => (d.sub_cats || []).includes(s))) return false;
  if (!skip.types && f.types.length && !f.types.includes(d.training_type || "")) return false;
  if (!skip.levels && f.levels.length) { const L = d.levels || []; if (L.length && !f.levels.some(l => L.includes(l))) return false; }
  if (!skip.phases && (f.phases || []).length) { const P = d.phases || []; if (P.length && !f.phases.some(p => P.includes(p))) return false; }
  if (f.locs.length && !f.locs.some(l => (d.location || []).includes(l))) return false;
  if (f.ages.length) { const A = d.age_cats || []; if (A.length && !f.ages.some(a => A.includes(a))) return false; }
  if (f.wfs.length && !f.wfs.includes(d.workform || "")) return false;
  if (f.mats.length && !f.mats.some(m => (d.material || []).includes(m))) return false;
  if (f.auds.length && !f.auds.includes(d.audience || "")) return false;
  if (f.eigen && d.builtin) return false;
  if (f.fav && !(d.fav_ids || []).includes(me)) return false;
  return true;
}
function filtered() {
  const q = st.q.trim().toLowerCase();
  let list = visibleDrills().filter(d => matches(d, st.f));
  if (q) list = list.filter(d => (d.title + " " + (d.goal || "") + " " + (d.exec || "") + " " + (d.tags || []).join(" ")).toLowerCase().includes(q));
  const um = usageMap(); const nm = (a, b) => a.title.localeCompare(b.title, "nl");
  if (st.sort === "duur") list.sort((a, b) => ((+a.dur_min > 0) ? +a.dur_min : 9999) - ((+b.dur_min > 0) ? +b.dur_min : 9999) || nm(a, b));
  else if (st.sort === "populair") list.sort((a, b) => (um[b.id] || 0) - (um[a.id] || 0) || nm(a, b));
  else if (st.sort === "nieuw") list.sort((a, b) => (b.created || "").localeCompare(a.created || "") || nm(a, b));
  else list.sort(nm);
  return list;
}

const chips = (id, items, arr, mini = false) => `<div class="drchips ${mini ? "mini" : ""}" id="${id}"><button data-v="" class="${arr.length ? "" : "on"}">Alle</button>${items.map(o => { const [k, l] = Array.isArray(o) ? o : [o, o]; return `<button data-v="${attr(k)}" class="${arr.includes(k) ? "on" : ""}">${esc(l)}</button>`; }).join("")}</div>`;

export function render(main) {
  const all = visibleDrills(); const me = store.me; const um = usageMap(); const umMax = Math.max(1, ...Object.values(um));
  const list = filtered(); const nf = nFilters(); const f = st.f;
  const pending = store.rows("drills").filter(d => d.status === "concept").length;
  // filterkolom
  let fh = `<div class="drlbl">Hoofdcategorie</div><div class="drchips" id="drMain"><button data-m="" class="${f.main ? "" : "on"}">Alle</button>${TAXONOMY.map(m => `<button data-m="${m.key}" class="${f.main === m.key ? "on" : ""}">${esc(m.label)}</button>`).join("")}</div>`;
  if (f.main && subsOf(f.main).length) fh += `<div class="drlbl">Subcategorie</div>` + chips("drSub", subsOf(f.main).map(x => [x.key, x.label]), f.subs);
  if (!f.main || f.main === "golfskills") fh += `<div class="drlbl">Type</div>` + chips("drType", TRAIN_TYPES, f.types);
  fh += `<div class="drlbl">Niveau</div>` + chips("drLvl", LEVELS, f.levels, true);
  fh += `<div class="drlbl">MJOP-fase</div>` + chips("drPh", MJOP_PHASES.map(p => [p[0], p[0]]), f.phases || (f.phases = []), true);
  fh += `<div class="drlbl">Locatie</div>` + chips("drLoc", locOptions(), f.locs, true);
  fh += `<div class="drlbl">Label</div><div class="drchips" id="drLbl"><button data-k="fav" class="${f.fav ? "on" : ""}">★ Mijn favorieten</button><button data-k="eigen" class="${f.eigen ? "on" : ""}">Eigen drills</button></div>`;
  if (st.more) fh += `<div class="drlbl">Leeftijd</div>` + chips("drAge", AGES, f.ages, true) + `<div class="drlbl">Voor</div>` + chips("drAud", AUDS, f.auds, true) + `<div class="drlbl">Werkvorm</div>` + chips("drWf", WORKFORMS, f.wfs, true) + (matAll().length ? `<div class="drlbl">Materiaal</div>` + chips("drMat", matAll(), f.mats, true) : "");
  fh += `<button class="drmore" id="drMore">${st.more ? "Minder filters" : "Meer filters ›"}</button>`;

  main.innerHTML = `
  <div class="spkop"><h1>Drills-database</h1>
    ${kpi([[all.length, "drills"], [all.filter(d => !d.builtin).length, "eigen"], [all.filter(d => (d.fav_ids || []).includes(me.id)).length, "favoriet"], [pending, "ter beoordeling", pending && isCoordinator() ? "att" : ""]])}
    <div class="right"><button class="plusbtn" id="drAdd" title="Nieuwe drill">+</button></div>
  </div>
  <div class="drgrid">
    <div class="card drfilt ${st.open ? "open" : ""}" id="drFilt"><div class="chead"><h2>Filters</h2>${nf ? `<span class="cvn">${nf}</span>` : ""}<span class="hdnote">${nf ? '<button class="trclear" id="drClear">Wis alles</button>' : ""}<button class="xbtn sm" id="drFiltTog" title="Filters tonen/verbergen">${st.open ? "–" : "▾"}</button></span></div><div class="cbody drfbody">${fh}</div></div>
    <div class="card" id="drLib"><div class="chead" style="flex-wrap:wrap"><h2>Bibliotheek</h2><span class="cvn" id="drCnt">${list.length}</span><input class="in" id="drQ" placeholder="Zoek drill…" value="${attr(st.q)}" style="flex:1 1 140px;min-width:120px;height:32px"><div class="seg" id="drSort">${[["naam", "Naam"], ["duur", "Duur"], ["populair", "Populair"], ["nieuw", "Nieuw"]].map(([k, l]) => `<button data-v="${k}" class="${st.sort === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
      <div class="cbody" id="drList">${list.length ? list.map(d => card(d, um, umMax, me)).join("") : '<div class="empty">Geen drills met deze filters.</div>'}</div></div>
  </div>
  <div class="card drmx ${st.mx ? "open" : ""}" id="drMx"><div class="chead" style="${st.mx ? "" : "border:0;margin:0;padding:0"}"><button class="mxtog" id="drMxTog"><span class="chev">▶</span><h2>Dekking <span class="muted" style="font-weight:400;font-size:12.5px">· ${f.main ? esc(mainLabel(f.main)) : "alle categorieën"}</span></h2></button>${st.mx ? `<span class="hdnote"><div class="seg dark" id="drMxBy"><button data-v="type" class="${st.mxBy === "type" ? "on" : ""}">Type</button><button data-v="niveau" class="${st.mxBy === "niveau" ? "on" : ""}">Niveau</button><button data-v="fase" class="${st.mxBy === "fase" ? "on" : ""}">MJOP-fase</button></div></span>` : ""}</div>${st.mx ? `<div class="tbl-wrap">${matrixHtml()}</div><div class="hint">Aantal drills per ${f.main ? "onderdeel" : "hoofdcategorie"} en ${st.mxBy === "type" ? "type" : st.mxBy === "fase" ? "MJOP-fase" : "niveau"} · tik op een cel om erop te filteren.</div>` : ""}</div>`;

  const rerender = () => { persist(); render(main); };
  $("#drAdd", main).onclick = () => openDrillForm();
  $("#drMain", main).onclick = e => { const b = e.target.closest("button"); if (!b) return; f.main = b.dataset.m; f.subs = []; f.types = f.main && f.main !== "golfskills" ? [] : f.types; rerender(); };
  const bindSet = (id, arr) => { const el = $("#" + id, main); if (!el) return; el.onclick = e => { const b = e.target.closest("button"); if (!b) return; const v = b.dataset.v; if (!v) arr.length = 0; else { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); } rerender(); }; };
  bindSet("drSub", f.subs); bindSet("drType", f.types); bindSet("drLvl", f.levels); bindSet("drPh", f.phases); bindSet("drLoc", f.locs); bindSet("drAge", f.ages); bindSet("drAud", f.auds); bindSet("drWf", f.wfs); bindSet("drMat", f.mats);
  $("#drLbl", main).onclick = e => { const b = e.target.closest("button"); if (!b) return; f[b.dataset.k] = !f[b.dataset.k]; rerender(); };
  $("#drMore", main).onclick = () => { st.more = !st.more; rerender(); };
  $("#drFiltTog", main).onclick = () => { st.open = !st.open; rerender(); };
  const cl = $("#drClear", main); if (cl) cl.onclick = () => { st.f = F0(); rerender(); };
  $("#drQ", main).oninput = e => { st.q = e.target.value; persist(); const l = filtered(); $("#drList", main).innerHTML = l.length ? l.map(d => card(d, um, umMax, me)).join("") : '<div class="empty">Geen drills met deze filters.</div>'; $("#drCnt", main).textContent = l.length; };
  $("#drSort", main).onclick = e => { const b = e.target.closest("button"); if (!b) return; st.sort = b.dataset.v; rerender(); };
  $("#drMxTog", main).onclick = () => { st.mx = !st.mx; rerender(); };
  const mxb = $("#drMxBy", main); if (mxb) mxb.onclick = e => { const b = e.target.closest("button"); if (!b) return; st.mxBy = b.dataset.v; rerender(); };
  main.onclick = async e => {
    const fav = e.target.closest("[data-fav]"); if (fav) { e.stopPropagation(); await toggleFav(fav.dataset.fav); return; }
    const mx = e.target.closest("[data-mxr]"); if (mx) { const r = mx.dataset.mxr, c = mx.dataset.mxc; if (mx.classList.contains("sel")) { if (f.main) f.subs = []; if (st.mxBy === "type") f.types = []; else if (st.mxBy === "fase") f.phases = []; else f.levels = []; } else { if (!f.main) { f.main = r; f.subs = []; } else f.subs = [r]; if (st.mxBy === "type") f.types = c ? [c] : []; else if (st.mxBy === "fase") f.phases = c ? [c] : []; else f.levels = c ? [c] : []; } rerender(); return; }
    const d = e.target.closest("[data-drill]"); if (d) openDrill(d.dataset.drill);
  };
}

function card(d, um, umMax, me) {
  const n = um[d.id] || 0; const lv = n === 0 ? 0 : n >= umMax * .66 ? 3 : n >= umMax * .33 ? 2 : 1;
  const sub = [mainLabel(d.main_cat)].concat((d.sub_cats || []).map(k => subLabel(d.main_cat, k))).join(" · ");
  const foot = [];
  if (+d.dur_min > 0) foot.push(`<span>${d.dur_min} min</span>`); else if (d.dur_value) foot.push(`<span>${esc(d.dur_value)} ${esc(d.dur_unit || "")}</span>`);
  if ((d.levels || []).length) foot.push(`<span>${esc(d.levels.length > 2 ? d.levels[0] + " … " + d.levels[d.levels.length - 1] : d.levels.join(", "))}</span>`); else foot.push(`<span>alle niveaus</span>`);
  foot.push(`<span title="MJOP-fase">${(d.phases || []).length ? esc(phaseRange(d.phases)) : "alle fases"}</span>`);
  if (d.intensity) foot.push(`<span class="drdots" title="Intensiteit"><span><b>I</b>${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lvl(d.intensity) ? "on" : ""}"></i>`).join("")}</span></span>`);
  foot.push(`<span class="drpop" title="${n}× gebruikt in lesvoorbereidingen">${n}× <i class="${lv >= 1 ? "on" : ""}"></i><i class="${lv >= 2 ? "on" : ""}"></i><i class="${lv >= 3 ? "on" : ""}"></i></span>`);
  const isFav = (d.fav_ids || []).includes(me.id);
  const accent = MC_ACCENT[d.main_cat] || "#7A7F85"; const tc = d.main_cat === "golfskills" ? ({ techniek: "#2e78e8", skill: "#1ea05a", performance: "#F47C20" })[d.training_type] || accent : accent;
  const doel = (d.goal || d.exec || "").replace(/\s+/g, " ").trim();
  return `<div class="dc mc-${attr(d.main_cat)}" data-drill="${attr(d.id)}"><div class="dcimg ${d.image ? "has" : ""}" style="background-image:${d.image ? `url('${d.image}')` : `linear-gradient(135deg,${accent}22,${accent}55)`}"><span class="dctk" style="color:${tc}">${typeCode(d)}</span></div>
    <div class="dcbody"><div class="dchd"><div class="t"><b>${esc(d.title)}</b><small>${esc(sub)}${d.training_type ? " · " + esc(typeLabel(d.training_type)) : ""}</small></div><div class="dcr">${d.status === "concept" ? '<span class="drtag" style="color:var(--orange)">concept</span>' : ""}${!d.builtin ? '<span class="drtag">eigen</span>' : ""}<button class="xbtn sm favbtn ${isFav ? "on" : ""}" data-fav="${attr(d.id)}" title="Favoriet">★</button></div></div>
    ${doel ? `<div class="dcdoel">${esc(doel)}</div>` : ""}<div class="meta">${foot.join('<i class="sep"></i>')}</div></div></div>`;
}
async function toggleFav(id) { const d = store.byId("drills", id); if (!d) return; const me = store.me.id; const ids = (d.fav_ids || []).slice(); const i = ids.indexOf(me); if (i >= 0) ids.splice(i, 1); else ids.push(me); await store.save("drills", { ...d, fav_ids: ids }); }

function matrixHtml() {
  const f = st.f; const base = visibleDrills().filter(d => matches(d, f, { main: !f.main, subs: true, types: st.mxBy === "type", levels: st.mxBy === "niveau", phases: st.mxBy === "fase" }));
  const rows = f.main ? subsOf(f.main).map(s => ({ k: s.key, l: s.label, test: d => (d.sub_cats || []).includes(s.key) })) : TAXONOMY.map(m => ({ k: m.key, l: m.label, test: d => d.main_cat === m.key }));
  const cols = st.mxBy === "type" ? TRAIN_TYPES.map(([k, l]) => ({ k, l, test: d => (d.training_type || "") === k })).concat([{ k: "", l: "Overig", test: d => !d.training_type }]) : st.mxBy === "fase" ? MJOP_PHASES.map(p => ({ k: p[0], l: p[0], test: d => !(d.phases || []).length || d.phases.includes(p[0]) })) : LEVELS.map(l => ({ k: l, l, test: d => !(d.levels || []).length || d.levels.includes(l) }));
  const selR = f.main ? (f.subs.length === 1 ? f.subs[0] : null) : f.main || null; const selC = st.mxBy === "type" ? (f.types.length === 1 ? f.types[0] : null) : st.mxBy === "fase" ? ((f.phases || []).length === 1 ? f.phases[0] : null) : (f.levels.length === 1 ? f.levels[0] : null);
  const max = Math.max(1, ...rows.flatMap(r => cols.map(c => base.filter(d => r.test(d) && c.test(d)).length)));
  return `<table class="tbl mxt"><thead><tr><th></th>${cols.map(c => `<th>${esc(c.l)}</th>`).join("")}<th class="num">Totaal</th></tr></thead><tbody>${rows.map(r => { const rb = base.filter(r.test); return `<tr><td><b>${esc(r.l)}</b></td>${cols.map(c => { const n = rb.filter(c.test).length; const sel = (f.main ? selR === r.k : f.main === r.k) && selC === c.k; return `<td class="num"><button class="mxcell ${sel ? "sel" : ""} ${n ? "" : "zero"}" data-mxr="${attr(r.k)}" data-mxc="${attr(c.k)}" style="--a:${(n / max).toFixed(2)}">${n || "·"}</button></td>`; }).join("")}<td class="num"><b>${rb.length}</b></td></tr>`; }).join("")}</tbody></table>`;
}

/* ---------- Detail met tabs ---------- */
export function openDrill(id, tab = "overzicht", replace = false) {
  openSheet(sh => {
    const d = store.byId("drills", id); if (!d) { sh.innerHTML = shead("Drill", "niet gevonden"); return; }
    const me = store.me; const mine = d.owner_id === me.id; const canEdit = isCoordinator() || (mine && !d.builtin); const isFav = (d.fav_ids || []).includes(me.id);
    const um = usageMap(); const n = um[d.id] || 0;
    const sub = [mainLabel(d.main_cat)].concat((d.sub_cats || []).map(k => subLabel(d.main_cat, k))).join(" · ");
    const tabs = [["overzicht", "Overzicht"], ["uitvoering", "Uitvoering"], ["variaties", "Variaties"], ["gebruik", "Gebruik"]];
    const meta = [["Type", d.training_type ? typeLabel(d.training_type) : ""], ["Duur", +d.dur_min > 0 ? d.dur_min + " min" : (d.dur_value ? d.dur_value + " " + (d.dur_unit || "") : "")], ["Niveau", (d.levels || []).join(", ") || "alle niveaus"], ["MJOP-fase", (d.phases || []).length ? phaseRange(d.phases) : "alle fases"], ["Leeftijd", (d.age_cats || []).join(", ") || "alle"], ["Voor", (AUDS.find(a => a[0] === d.audience) || [, ""])[1]], ["Werkvorm", d.workform], ["Groepsgrootte", d.grp_min || d.grp_max ? (d.grp_min || "?") + "–" + (d.grp_max || "?") : ""], ["Intensiteit", (INTENS.find(a => a[0] === d.intensity) || [, ""])[1]], ["Locatie", (d.location || []).join(", ")], ["Materiaal", (d.material || []).join(", ")]].filter(x => x[1]);
    let body = "";
    if (tab === "overzicht") body = `${d.image ? `<div class="card" style="padding:0;overflow:hidden"><img src="${d.image}" alt="" style="display:block;width:100%;max-height:260px;object-fit:cover"></div>` : ""}<div class="card"><div class="tiles" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${meta.map(([l, v]) => `<div class="tile"><div class="lb">${esc(l)}</div><div class="s" style="color:var(--ink);font-size:13px">${esc(v)}</div></div>`).join("")}</div></div>${d.goal ? `<div class="card"><div class="chead"><h2>Doel</h2></div><div class="small" style="line-height:1.55">${esc(d.goal)}</div></div>` : ""}${(d.tags || []).length ? `<div class="chips">${d.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : ""}`;
    else if (tab === "uitvoering") body = `<div class="card"><div class="chead"><h2>Uitvoering</h2></div><div class="small" style="line-height:1.6;white-space:pre-wrap">${esc(d.exec || "—")}</div></div>${(d.material || []).length ? `<div class="card"><div class="chead"><h2>Materiaal</h2></div><div class="chips" style="margin:0">${d.material.map(m => `<span class="chip">${esc(m)}</span>`).join("")}</div></div>` : ""}`;
    else if (tab === "variaties") body = `<div class="card"><div class="chead"><h2>Variaties · makkelijker / moeilijker</h2></div><div class="small" style="line-height:1.6;white-space:pre-wrap">${esc(d.vars || "Nog geen variaties beschreven.")}</div></div>`;
    else body = `<div class="card"><div class="tiles">${[["Gebruikt", n + "×", "in lesvoorbereidingen"], ["Favoriet bij", (d.fav_ids || []).length, "coaches"], ["Bron", d.builtin ? "C@ddie" : (coachById(d.owner_id) || {}).name || "coach", d.created || ""]].map(([l, v, s]) => `<div class="tile"><div class="lb">${esc(l)}</div><div class="v" style="font-size:16px">${esc(String(v))}</div><div class="s">${esc(s)}</div></div>`).join("")}</div><div class="hint">Vanaf fase 2 zie je hier in welke trainingen en groepen deze drill is ingezet.</div></div>`;
    sh.innerHTML = shead(d.title, `${esc(sub)}${d.status === "concept" ? ' <span class="st att">concept</span>' : ""}${!d.builtin ? ' <span class="st">eigen</span>' : ""}`,
      `<button class="xbtn favbtn ${isFav ? "on" : ""}" id="ddFav" title="Favoriet">★</button>` + xbtn("copy", 'id="ddCopy" title="Dupliceren als eigen drill"') + (canEdit ? xbtn("edit", 'id="ddEdit"') : "")) +
      `<div class="seg" id="ddTabs" style="margin-bottom:12px">${tabs.map(([k, l]) => `<button data-v="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</div>${body}
      ${isCoordinator() && d.status === "concept" ? `<div class="klvbtn"><button class="btn o" id="ddApprove">Goedkeuren</button></div>` : ""}`;
    $("#ddTabs", sh).onclick = e => { const b = e.target.closest("button"); if (b) openDrill(id, b.dataset.v, true); };
    $("#ddFav", sh).onclick = async () => { await toggleFav(id); refreshSheet(); };
    const ed = $("#ddEdit", sh); if (ed) ed.onclick = () => openDrillForm(id);
    $("#ddCopy", sh).onclick = async () => { const c = { ...d, title: d.title + " (kopie)", builtin: false, owner_id: me.id, fav_ids: [], status: cfg.drillsDirectPublish || isCoordinator() ? "goedgekeurd" : "concept", created: todayISO() }; delete c.id; const s = await store.save("drills", c); toast("Kopie gemaakt"); openDrillForm(s.id); };
    const ap = $("#ddApprove", sh); if (ap) ap.onclick = async () => { await store.save("drills", { ...d, status: "goedgekeurd" }); toast("Goedgekeurd"); refreshSheet(); };
  }, { replace });
}

/* ---------- Formulier ---------- */
export function openDrillForm(id) {
  const ex = id ? store.byId("drills", id) : null;
  const d = ex ? JSON.parse(JSON.stringify(ex)) : { title: "", main_cat: "golfskills", sub_cats: [], goal: "", exec: "", vars: "", dur_unit: "min", dur_value: "", dur_min: "", audience: "groep", location: [], workform: "", grp_min: "", grp_max: "", material: [], age_cats: [], levels: [], phases: [], intensity: "", training_type: "", tags: [], image: null, fav_ids: [], builtin: false, status: cfg.drillsDirectPublish || isCoordinator() ? "goedgekeurd" : "concept", owner_id: store.me.id, created: todayISO() };
  ["sub_cats", "location", "material", "age_cats", "levels", "phases", "tags", "fav_ids"].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; });
  openSheet(sh => {
    const multi = (id, opts, sel) => `<div class="pick" id="${id}">${opts.map(o => { const [k, l] = Array.isArray(o) ? o : [o, o]; return `<button data-v="${attr(k)}" class="${sel.includes(k) ? "on" : ""}">${esc(l)}</button>`; }).join("")}</div>`;
    sh.innerHTML = shead(ex ? "Drill bewerken" : "Nieuwe drill", "", ex && (isCoordinator() || (ex.owner_id === store.me.id && !ex.builtin)) ? xbtn("trash", 'id="dfDel"', "danger") : "") + `
    <div class="card">
      <label class="fld" style="margin-top:0">Titel</label><input class="in" id="dfTitle" value="${attr(d.title)}">
      <div class="f2"><div><label class="fld">Hoofdcategorie</label><select class="in" id="dfMain">${TAXONOMY.map(t => `<option value="${t.key}" ${d.main_cat === t.key ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></div>
      <div><label class="fld">Type</label><select class="in" id="dfType"><option value="">—</option>${TRAIN_TYPES.map(([v, l]) => `<option value="${v}" ${d.training_type === v ? "selected" : ""}>${l}</option>`).join("")}</select></div></div>
      <label class="fld">Subcategorie(ën)</label>${multi("dfSub", subsOf(d.main_cat).map(s => [s.key, s.label]), d.sub_cats)}
      <label class="fld">Foto</label><div class="row"><div class="dcimg ${d.image ? "has" : ""}" id="dfImg" style="width:96px;height:72px;border-radius:10px;flex:none;background-image:${d.image ? `url('${d.image}')` : "linear-gradient(135deg,#E6E8EA,#F2F3F5)"}"></div><div class="klvbtn"><button class="btn sm ghost" id="dfImgBtn">${d.image ? "Andere foto" : "Foto kiezen"}</button>${d.image ? '<button class="btn sm ghost" id="dfImgDel">Verwijderen</button>' : ""}</div><input type="file" accept="image/*" id="dfImgIn" class="hide"></div>
      <label class="fld">Doel</label><textarea class="in" id="dfGoal" style="min-height:64px">${esc(d.goal || "")}</textarea>
      <label class="fld">Uitvoering</label><textarea class="in" id="dfExec" style="min-height:110px">${esc(d.exec || "")}</textarea>
      <label class="fld">Variaties (makkelijker / moeilijker)</label><textarea class="in" id="dfVars" style="min-height:64px">${esc(d.vars || "")}</textarea>
    </div>
    <div class="card">
      <label class="fld" style="margin-top:0">Niveau</label>${multi("dfLvl", LEVELS, d.levels)}<div class="hint">Niets gekozen = geschikt voor alle niveaus.</div>
      <label class="fld">MJOP-fase</label>${multi("dfPh", MJOP_PHASES.map(p => [p[0], p[0] + " " + p[1]]), d.phases)}<div class="hint">Niets gekozen = alle fases.</div>
      <label class="fld">Leeftijd</label>${multi("dfAge", AGES, d.age_cats)}
      <div class="f3"><div><label class="fld">Duur (min)</label><input class="in" id="dfDur" type="number" min="1" value="${d.dur_min || ""}"></div><div><label class="fld">Min. spelers</label><input class="in" id="dfMin" type="number" min="1" value="${d.grp_min || ""}"></div><div><label class="fld">Max. spelers</label><input class="in" id="dfMax" type="number" min="1" value="${d.grp_max || ""}"></div></div>
      <div class="f2"><div><label class="fld">Voor</label><select class="in" id="dfAud">${AUDS.map(([v, l]) => `<option value="${v}" ${d.audience === v ? "selected" : ""}>${l}</option>`).join("")}</select></div><div><label class="fld">Intensiteit</label><select class="in" id="dfInt"><option value="">—</option>${INTENS.map(([v, l]) => `<option value="${v}" ${d.intensity === v ? "selected" : ""}>${l}</option>`).join("")}</select></div></div>
      <label class="fld">Werkvorm</label>${multi("dfWork", WORKFORMS, [d.workform])}
      <label class="fld">Locatie</label>${multi("dfLoc", locOptions(), d.location)}
      <label class="fld">Materiaal (komma-gescheiden)</label><input class="in" id="dfMat" value="${attr((d.material || []).join(", "))}" placeholder="bv. tourstick, hoepels, 10 ballen">
      <label class="fld">Tags</label><input class="in" id="dfTags" value="${attr((d.tags || []).join(", "))}" placeholder="bv. warming-up, spelvorm">
    </div>
    <div class="klvbtn"><button class="btn o" id="dfSave">${ex ? "Opslaan" : "Drill toevoegen"}</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    const readTexts = () => { d.title = val("dfTitle", sh); d.goal = val("dfGoal", sh); d.exec = val("dfExec", sh); d.vars = val("dfVars", sh); d.training_type = val("dfType", sh); d.dur_min = val("dfDur", sh); d.grp_min = val("dfMin", sh); d.grp_max = val("dfMax", sh); d.audience = val("dfAud", sh); d.intensity = val("dfInt", sh); d.material = val("dfMat", sh).split(",").map(x => x.trim()).filter(Boolean); d.tags = val("dfTags", sh).split(",").map(x => x.trim()).filter(Boolean); };
    $("#dfMain", sh).onchange = e => { readTexts(); d.main_cat = e.target.value; d.sub_cats = []; refreshSheet(); };
    const tog = (id, key, single) => { const el = $("#" + id, sh); if (!el) return; el.onclick = e => { const b = e.target.closest("button"); if (!b) return; if (single) { d[key] = d[key] === b.dataset.v ? "" : b.dataset.v; $$("button", el).forEach(x => x.classList.toggle("on", x.dataset.v === d[key])); return; } const arr = d[key]; const i = arr.indexOf(b.dataset.v); if (i >= 0) arr.splice(i, 1); else arr.push(b.dataset.v); b.classList.toggle("on"); }; };
    tog("dfSub", "sub_cats"); tog("dfLvl", "levels"); tog("dfPh", "phases"); tog("dfAge", "age_cats"); tog("dfLoc", "location"); tog("dfWork", "workform", true);
    $("#dfImgBtn", sh).onclick = () => $("#dfImgIn", sh).click();
    $("#dfImgIn", sh).onchange = e => { const file = e.target.files && e.target.files[0]; if (!file) return; readTexts(); shrinkImage(file, 900, 0.82).then(url => { d.image = url; refreshSheet(); }).catch(() => toast("Foto kon niet worden gelezen")); };
    const di = $("#dfImgDel", sh); if (di) di.onclick = () => { readTexts(); d.image = null; refreshSheet(); };
    const del = $("#dfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Deze drill verwijderen?", async () => { await store.remove("drills", id); closeSheet(); closeSheet(); toast("Drill verwijderd"); });
    $("#dfSave", sh).onclick = async () => { readTexts(); if (!d.title) { toast("Geef de drill een titel"); return; } if (ex && ex.builtin && !isCoordinator()) { toast("Ingebouwde drills kan alleen de coördinator wijzigen; maak een kopie."); return; } const row = { ...d }; if (!row.id) delete row.id; const s = await store.save("drills", row); closeSheet(); toast(ex ? "Opgeslagen" : d.status === "concept" ? "Toegevoegd — wacht op goedkeuring" : "Drill toegevoegd"); if (!ex) openDrill(s.id); else refreshSheet(); };
  }, { replace: false });
}
function shrinkImage(file, max, q) {
  return new Promise((res, rej) => { const img = new Image(); const u = URL.createObjectURL(file); img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", q)); }; img.onerror = rej; img.src = u; });
}
