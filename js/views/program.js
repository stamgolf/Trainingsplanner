// Programma: profiel → periodisering (fases, pieken) → thema's → sessiematrix met inhoud. Alleen op grotere schermen.
import { store, isCoordinator, groupById, coachById } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, refreshSheet, shead, toast, kpi, klsel, xbtn, val, confirmInline, ICON, tint, searchPil } from "../lib/ui.js";
import { todayISO, addDays, addMonths, daysBetween, weekStart, fmtDate, fmtDateLong, DAGEN, MAANDEN_KORT, MAANDEN, isoWeek, weekday, fromISO } from "../lib/dates.js";
import { sessionsIn, groupsSorted, rulesForGroup, locationsSorted } from "../lib/model.js";
import { PHASES, PROFILES, PEAK_LEVELS, phaseDef, profileDef, programFor, newProgram, buildPhases, buildThemes, phaseAt, THEME_COLORS, DEFAULT_CFG } from "../lib/periodization.js";
import { planFor, generate, themesOf, PHASES as BLOCKS, phaseLabel } from "../lib/generator.js";
import { TAXONOMY } from "../data/taxonomy.js";
import { inBreak } from "../lib/recur.js";
import { openSession } from "./session.js";
import { openThemeForm, labelOfCat } from "./lesson.js";
import { MC_ACCENT } from "./drills.js";

const st = { group_id: null, season_id: null, mode: "compact", q: "" };
try { Object.assign(st, JSON.parse(sessionStorage.getItem("tp_prog") || "{}")); } catch (e) { }
function persist() { try { sessionStorage.setItem("tp_prog", JSON.stringify(st)); } catch (e) { } }
const catLabel = k => labelOfCat(k);

export function render(main, params) {
  if (params && params.group) { st.group_id = params.group; history.replaceState(null, "", "#/programma"); }
  const groups = groupsSorted().filter(g => isCoordinator() || (g.coach_ids || []).includes(store.me.id) || rulesForGroup(g.id).some(r => (r.coach_ids || []).includes(store.me.id)));
  if (!st.group_id || !groups.some(g => g.id === st.group_id)) st.group_id = groups[0] ? groups[0].id : null;
  const seasons = store.rows("seasons").slice().sort((a, b) => a.start < b.start ? 1 : -1);
  const today = todayISO();
  if (!st.season_id || !seasons.some(s => s.id === st.season_id)) st.season_id = (seasons.find(s => s.start <= today && s.end >= today) || seasons[0] || {}).id || null;
  persist();
  const g = st.group_id ? groupById(st.group_id) : null; const season = st.season_id ? store.byId("seasons", st.season_id) : null;
  if (!g || !season) { main.innerHTML = `<div class="spkop"><h1>Programma</h1></div><div class="card"><div class="empty">Maak eerst een groep en een seizoen aan.</div></div>`; return; }
  const prog = programFor(g.id, season.id) || newProgram(g, season);
  const all = sessionsIn(season.start, season.end, { group_id: g.id }).filter(s => s.status !== "afgelast");
  const prepared = all.filter(s => planFor(s.key)).length;
  const themes = themesOf(g.id).filter(t => t.start <= season.end && addDays(t.start, (t.weeks || 4) * 7) >= season.start);
  const pdef = profileDef(prog.profile);
  main.innerHTML = `
  <div class="spkop"><h1>Programma</h1>
    ${klsel("pgGroup", groups.map(x => [x.id, x.name]), g.id)}
    ${klsel("pgSeason", seasons.map(s => [s.id, s.name]), season.id)}
    ${kpi([[all.length, "sessies"], [(prog.peaks || []).length, "wedstrijden"], [(prog.phases || []).length, "fases"], [prepared + "/" + all.length, "voorbereid", prepared < all.length ? "att" : ""]])}
    <div class="right">${xbtn("print", 'id="pgPrint" title="Afdrukken"')}<button class="btn o" id="pgGen">⚡ Genereer programma</button></div>
  </div>
  <div class="card"><div class="chead"><h2>Profiel</h2><span class="hdnote">bepaalt de periodisering · ${esc(pdef[2])}</span></div>
    <div class="row" style="gap:14px;flex-wrap:wrap">
      <div class="seg dark" id="pgProfile">${PROFILES.map(p => `<button data-v="${p[0]}" class="${prog.profile === p[0] ? "on" : ""}">${p[1]}</button>`).join("")}</div>
      <span class="muted small">Seizoensdoel</span><input class="in" id="pgGoal" value="${attr(prog.goal || "")}" placeholder="bv. naar hcp 36 · top 3 NGF Jeugdtour" style="width:260px;height:34px">
      <span class="muted small">MJOP</span>${klsel("pgMjop", [["", "—"]].concat([["F1", "F1 Starten en ontdekken"], ["F2", "F2 Fundament"], ["F3", "F3 Leren spelen"], ["A1", "A1 Beter spelen"], ["A2", "A2 Competitief golfen"], ["T1", "T1 Topgolfprincipes"], ["T2", "T2 Trainen om te presteren"], ["T3", "T3 Trainen voor de top"], ["E1", "E1"], ["E2", "E2"]]), prog.mjop || "")}
      <span class="muted small" style="margin-left:auto">${esc(g.level || "")}${g.age ? " · " + esc(g.age) + " jr" : ""} · ${rulesForGroup(g.id).filter(r => (r.end || "9999") >= season.start && r.start <= season.end).map(r => (r.weekdays || []).map(w => DAGEN[w]).join("/") + " " + r.van).join(" + ") || "geen rooster"}</span>
    </div></div>
  <div class="card" id="pgPer"></div>
  ${(prog.phases || []).length ? `<div class="card"><div class="chead"><h2>Fases</h2><span class="cvn">${prog.phases.length}</span><span class="hdnote">tik op een rij voor doel, trainingsmix en accenten</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fase</th><th>Periode</th><th>Doel</th><th>Mix techniek · skill · performance</th><th>Accenten</th><th class="num">Sessies</th></tr></thead><tbody>${prog.phases.map(ph => { const d = phaseDef(ph.type); const n = all.filter(s => s.date >= ph.start && s.date <= ph.end).length; return `<tr class="clk" data-phase="${attr(ph.id)}" style="cursor:pointer"><td style="white-space:nowrap"><span class="st" style="background:${d[2]};color:#fff">${d[3]}</span> <b>${esc(d[1])}</b></td><td style="white-space:nowrap">${fmtDate(ph.start)} – ${fmtDate(ph.end)}<br><span class="muted">${Math.round((daysBetween(ph.start, ph.end) + 1) / 7 * 10) / 10} wk</span></td><td style="max-width:220px">${esc(ph.goal || "")}</td><td><div class="bar3"><i style="width:${ph.mix[0]}%;background:#2e78e8"></i><i style="width:${ph.mix[1]}%;background:#1ea05a"></i><i style="width:${ph.mix[2]}%;background:#F47C20"></i></div><span class="muted small">${ph.mix.join(" · ")} %</span></td><td class="muted small" style="max-width:260px">${Object.entries(ph.accents || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => esc(catLabel(k)) + " " + v).join(" · ")}</td><td class="num"><b>${n}</b></td></tr>`; }).join("")}</tbody></table></div></div>` : ""}
  <div class="card"><div class="chead"><h2>Sessies</h2><span class="cvn">${all.length}</span><div class="seg" id="pgMode" style="margin-left:8px"><button data-v="compact" class="${st.mode === "compact" ? "on" : ""}">Compact</button><button data-v="inhoud" class="${st.mode === "inhoud" ? "on" : ""}">Inhoud</button></div><span class="hdnote">rijen = weken · kolommen = roostermomenten · tik op een cel voor de lesvoorbereiding</span></div><div class="tbl-wrap" id="pgMatrix"></div></div>`;

  $("#pgGroup", main).onchange = e => { st.group_id = e.target.value; persist(); render(main); };
  $("#pgSeason", main).onchange = e => { st.season_id = e.target.value; persist(); render(main); };
  $("#pgPrint", main).onclick = () => window.print();
  $("#pgMode", main).onclick = e => { const b = e.target.closest("button"); if (!b) return; st.mode = b.dataset.v; persist(); render(main); };
  const saveProg = async (patch) => { const row = { ...prog, ...patch }; if (!row.id) delete row.id; const saved = await store.save("programs", row); if (patch.profile || patch.goal != null || patch.mjop != null) await store.save("groups", { ...g, profile: saved.profile, goal: saved.goal, mjop: saved.mjop }); return saved; };
  $("#pgProfile", main).onclick = async e => { const b = e.target.closest("button"); if (!b || !isCoordinator()) return; await saveProg({ profile: b.dataset.v }); };
  $("#pgGoal", main).onchange = e => saveProg({ goal: e.target.value });
  $("#pgMjop", main).onchange = e => saveProg({ mjop: e.target.value });
  $("#pgGen", main).onclick = () => openGenerateSheet(g, season, programFor(g.id, season.id) || prog, main);
  main.onclick = e => {
    const ph = e.target.closest("[data-phase]"); if (ph) { openPhaseForm(g, season, ph.dataset.phase); return; }
    const pk = e.target.closest("[data-peak]"); if (pk) { openPeakForm(g, season, pk.dataset.peak); return; }
    const th = e.target.closest("[data-theme]"); if (th) { openThemeForm(g.id, th.dataset.theme); return; }
    const lk = e.target.closest("[data-lock]"); if (lk) { e.stopPropagation(); const locked = (prog.locked || []).slice(); const i = locked.indexOf(lk.dataset.lock); if (i >= 0) locked.splice(i, 1); else locked.push(lk.dataset.lock); saveProg({ locked }); return; }
    const rg = e.target.closest("[data-regen]"); if (rg) { e.stopPropagation(); const s = all.find(x => x.key === rg.dataset.regen); if (s) { const ex = planFor(s.key); const round = ((ex || {}).round || 0) + 1; const row = { ...(ex || {}), ...generate(s, { round, program: prog }), id: ex ? ex.id : undefined, session_key: s.key, rule_id: s.rule_id, date: s.date, group_id: s.group_id, round, source: "generator", status: "concept" }; if (!row.id) delete row.id; store.save("lesson_plans", row).then(() => toast("Nieuw voorstel")); } return; }
    const k = e.target.closest("[data-key]"); if (k) { openSession(k.dataset.key); return; }
  };
  renderPeriod($("#pgPer", main), g, season, prog, themes, all, main);
  renderMatrix($("#pgMatrix", main), g, season, prog, all);
}

/* ---------- Periodisering (lanes) ---------- */
function renderPeriod(el, g, season, prog, themes, all, main) {
  const S = season.start, E = season.end; const days = daysBetween(S, E) + 1; const X = d => daysBetween(S, d) / days * 100; const W = d1 => (daysBetween(S, d1) + 1) / days * 100;
  const pdef = profileDef(prog.profile); const breaks = store.rows("breaks").filter(b => !(b.end < S || b.start > E));
  let months = ""; for (let d = S; d <= E;) { const me = addDays(addMonths(d.slice(0, 8) + "01", 1), -1); const end = me < E ? me : E; months += `<span style="left:${X(d)}%;width:${X(addDays(end, 1)) - X(d)}%">${MAANDEN_KORT[fromISO(d).getMonth()]}</span>`; d = addDays(end, 1); }
  const brk = breaks.map(b => `<span class="tlbrk" style="left:${X(b.start < S ? S : b.start)}%;width:${X(addDays(b.end > E ? E : b.end, 1)) - X(b.start < S ? S : b.start)}%"></span>`).join("");
  const today = todayISO(); const now = today >= S && today <= E ? `<span class="tlnow" style="left:${X(today)}%"></span>` : "";
  const phases = (prog.phases || []).map(ph => { const d = phaseDef(ph.type); const w = X(addDays(ph.end, 1)) - X(ph.start); return `<span class="pgph" data-phase="${attr(ph.id)}" style="left:${X(ph.start)}%;width:${w}%;--k:${d[2]}" title="${attr(d[1] + " · " + fmtDate(ph.start) + " – " + fmtDate(ph.end) + (ph.goal ? " · " + ph.goal : ""))}"><b>${w > 7 ? esc(d[1]) : d[3]}</b><span class="mix"><i style="width:${ph.mix[0]}%;background:#2e78e8"></i><i style="width:${ph.mix[1]}%;background:#1ea05a"></i><i style="width:${ph.mix[2]}%;background:#F47C20"></i></span></span>`; }).join("");
  const peaks = (prog.peaks || []).map(p => `<span class="pgpk ${p.level}" data-peak="${attr(p.id)}" style="left:calc(${X(p.date)}% - 12px)" title="${attr(p.name + " · " + fmtDate(p.date) + " · " + p.level)}">${p.level}</span>`).join("");
  const th = themes.map(t => { const a = t.start < S ? S : t.start; const e0 = addDays(t.start, (t.weeks || 4) * 7 - 1); const e = e0 > E ? E : e0; if (e < a) return ""; return `<span class="pgth" data-theme="${attr(t.id)}" style="left:${X(a)}%;width:${X(addDays(e, 1)) - X(a)}%;--k:${attr(t.color || "#7A7F85")}" title="${attr(t.name + " · " + fmtDate(t.start) + " – " + fmtDate(e0) + (t.goal ? " · " + t.goal : ""))}">${esc(t.name)}</span>`; }).join("");
  const prep = all.map(s => { const p = planFor(s.key); return `<span class="pgpp ${p ? (p.status === "definitief" ? "def" : "con") : ""} ${s.log ? "log" : ""}" style="left:${X(s.date)}%;width:${Math.max(0.6, 100 / days)}%" title="${attr(fmtDate(s.date) + " " + s.van + (p ? " · " + (p.thema || "") : " · geen voorbereiding"))}"></span>`; }).join("");
  const hasPhases = pdef[3].length > 0;
  el.innerHTML = `<div class="chead"><h2>Periodisering</h2><span class="cvn">${esc(pdef[1])}</span><span class="hdnote">${hasPhases ? "tik op een fase, piek of thema · " : "geen fases bij dit profiel · "}${isCoordinator() ? `<button class="btn sm ghost" id="pgBuildPh" ${hasPhases ? "" : "disabled"}>Fases opbouwen</button><button class="btn sm ghost" id="pgBuildTh">Thema's genereren</button><button class="btn sm ghost" id="pgAddPeak">+ Wedstrijd</button><button class="btn sm ghost" id="pgLibPeaks">Uit bibliotheek</button><button class="btn sm ghost" id="pgImportPeaks">Uit kalender</button>` : ""}</span></div>
  <div class="pglanes">
    <div class="pgrow"><span></span><div class="pgmonths">${months}</div></div>
    ${hasPhases ? `<div class="pgrow"><span class="cap">Fases</span><div class="pglane tall">${brk}${phases || '<span class="empty" style="padding:8px 10px">Nog geen fases — kies "Fases opbouwen" of "Genereer programma".</span>'}${now}</div></div>` : ""}
    ${prog.profile === "beginner" ? "" : `<div class="pgrow"><span class="cap">Wedstrijden</span><div class="pglane">${brk}${peaks || '<span class="empty" style="padding:6px 10px">Geen wedstrijden — voeg toe met + Wedstrijd of haal ze uit de kalender.</span>'}${now}</div></div>`}
    <div class="pgrow"><span class="cap">Thema's</span><div class="pglane">${brk}${th || '<span class="empty" style="padding:6px 10px">Nog geen thema\'s.</span>'}${now}</div></div>
    <div class="pgrow"><span class="cap">Voorbereid</span><div class="pglane thin">${prep}${now}</div></div>
  </div>
  <div class="legend" style="margin-top:8px">${PHASES.filter(p => pdef[3].includes(p[0])).map(p => `<span class="chip"><i class="tlc-sample" style="background:${p[2]}"></i>${esc(p[1])}</span>`).join("")}${prog.profile !== "beginner" ? '<span class="chip"><i class="tlc-sample" style="background:var(--orange);border-radius:50%"></i>A-piek</span>' : ""}<span class="chip"><i class="tlc-sample" style="background:#17a05c"></i>definitief</span><span class="chip"><i class="tlc-sample" style="background:#F8C9A5"></i>concept</span><span class="chip"><i class="tlc-sample" style="background:#E6E8EA"></i>nog niets</span></div>`;
  const bp = $("#pgBuildPh", el); if (bp) bp.onclick = () => { const go = async () => { const phases = buildPhases(prog.profile, season, prog.peaks || [], prog.cfg || DEFAULT_CFG); const row = { ...prog, phases }; if (!row.id) delete row.id; await store.save("programs", row); toast(phases.length + " fases opgebouwd"); }; if ((prog.phases || []).length) confirmInline(el, "Bestaande fases vervangen door een nieuwe opbouw op basis van profiel en wedstrijden?", go, "Opbouwen"); else go(); };
  const bt = $("#pgBuildTh", el); if (bt) bt.onclick = () => { const go = async () => { for (const t of themes) await store.remove("group_themes", t.id); const rows = buildThemes(programFor(g.id, season.id) || prog, season, g.id); for (const r of rows) await store.save("group_themes", r); toast(rows.length + " thema's gezet"); }; if (themes.length) confirmInline(el, "Bestaande thema's van dit seizoen vervangen door sjabloonthema's?", go, "Vervangen"); else go(); };
  const ap = $("#pgAddPeak", el); if (ap) ap.onclick = () => openPeakForm(g, season, null);
  const ip = $("#pgImportPeaks", el); if (ip) ip.onclick = () => openPeakImport(g, season);
  const lp = $("#pgLibPeaks", el); if (lp) lp.onclick = () => import("./competitions.js").then(m => m.openEditionPicker(g, season));
}

/* ---------- Sessiematrix ---------- */
function renderMatrix(el, g, season, prog, all) {
  const rules = rulesForGroup(g.id).filter(r => (r.end || "9999") >= season.start && r.start <= season.end);
  const cols = rules.map(r => ({ id: r.id, label: (r.weekdays || []).map(w => DAGEN[w]).join("/") + " " + r.van + (r.title ? " · " + r.title : "") }));
  if (!cols.length) { el.innerHTML = '<div class="empty">Deze groep heeft nog geen roostermoment. Voeg dat toe in de groep.</div>'; return; }
  const peaks = prog.peaks || []; const hasPeaks = peaks.length > 0;
  const breaks = store.rows("breaks"); const today = todayISO(); const tws = weekStart(today);
  let rows = "";
  for (let w = weekStart(season.start); w <= season.end; w = addDays(w, 7)) {
    const we = addDays(w, 6); const brk = inBreak(w, breaks) || inBreak(we, breaks); const ph = phaseAt(prog, addDays(w, 3)); const d = ph ? phaseDef(ph.type) : null;
    const th = themesOf(g.id).find(t => w >= t.start && w <= addDays(t.start, (t.weeks || 4) * 7 - 1));
    const inWeek = all.filter(s => s.date >= w && s.date <= we);
    const cells = cols.map(c => {
      const ss = inWeek.filter(s => s.rule_id === c.id);
      if (!ss.length) return `<td>${brk ? `<div class="mxc brk">${esc(brk.name)}</div>` : (w < season.start || w > season.end ? "" : '<div class="mxc skip">—</div>')}</td>`;
      return "<td>" + ss.map(s => cellHtml(s, prog, d, th)).join("") + "</td>";
    }).join("");
    const pk = hasPeaks ? `<td>${peaks.filter(p => p.date >= w && p.date <= we).map(p => `<div class="mxc wed" data-peak="${attr(p.id)}"><b>🏆 ${esc(p.name)} (${p.level})</b><small>${fmtDate(p.date, { weekday: true })}${p.end && p.end !== p.date ? " – " + fmtDate(p.end) : ""}</small></div>`).join("") || ""}</td>` : "";
    rows += `<tr class="${w === tws ? "cur" : ""}"><td class="wkc"><b>Week ${isoWeek(w)}</b>${d ? `<span style="display:block;color:${d[2]};font-weight:700;font-size:10px">${d[3]}${th ? " · " + esc(th.name) : ""}</span>` : th ? `<span style="display:block;color:${attr(th.color)};font-weight:700;font-size:10px">${esc(th.name)}</span>` : ""}${brk ? `<span style="display:block;color:var(--orange);font-size:10px;font-weight:700">${esc(brk.name)}</span>` : ""}</td>${cells}${pk}</tr>`;
  }
  el.innerHTML = `<table class="pgmx" style="min-width:${150 + (cols.length + (hasPeaks ? 1 : 0)) * 180}px"><thead><tr><th class="wkc"></th>${cols.map(c => `<th>${esc(c.label)}</th>`).join("")}${hasPeaks ? `<th class="pkc">Wedstrijden</th>` : ""}</tr></thead><tbody>${rows}</tbody></table>`;
}
function cellHtml(s, prog, d, th) {
  const p = planFor(s.key); const locked = (prog.locked || []).includes(s.key);
  const k = d ? d[2] : (th ? th.color : "#7A7F85");
  if (!p) return `<div class="mxc empty" data-key="${attr(s.key)}" style="--k:${attr(k)}">${fmtDate(s.date, { weekday: true })} · nog geen voorbereiding</div>`;
  const blocks = st.mode === "inhoud" ? `<div class="bl">${(p.blocks || []).map(b => { const dr = b.drill_id ? store.byId("drills", b.drill_id) : null; return `<i>${({ warmup: "WU", techniek: "TK", spelvorm: "SV", afsluiting: "AF" })[b.phase] || b.phase.slice(0, 2).toUpperCase()}</i><span title="${attr(dr ? dr.title : b.title || "")}">${esc(dr ? dr.title : b.title || "—")}${b.minutes ? ` <span class="muted">· ${b.minutes}</span>` : ""}</span>`; }).join("")}</div>` : "";
  return `<div class="mxc ${p.status === "definitief" ? "final" : "concept"}" data-key="${attr(s.key)}" style="--k:${attr(k)}"><b>${esc(p.thema || "—")}${s.override ? ' <span class="st att" style="font-size:8px">aangepast</span>' : ""}</b><small>${fmtDate(s.date, { weekday: true })} ${s.van} · ${esc(p.lesdoel || "")}</small>${blocks}<div class="acts"><i>${s.log ? "gegeven" : p.status === "definitief" ? "definitief" : "concept"}</i>${locked ? "<i>vast</i>" : ""}<button class="xbtn ${locked ? "on" : ""}" data-lock="${attr(s.key)}" title="${locked ? "Losmaken" : "Vastzetten (generator slaat deze over)"}">${ICON.lock}</button>${locked ? "" : `<button class="xbtn" data-regen="${attr(s.key)}" title="Opnieuw genereren">${ICON.refresh}</button>`}</div></div>`;
}

/* ---------- Fase bewerken ---------- */
function openPhaseForm(g, season, phaseId) {
  openSheet(sh => {
    const prog = programFor(g.id, season.id); if (!prog) return; const ph = (prog.phases || []).find(p => p.id === phaseId); if (!ph) { sh.innerHTML = shead("Fase", "niet gevonden"); return; }
    const d = phaseDef(ph.type); const pdef = profileDef(prog.profile);
    const cats = [["fullswing", "Full swing"], ["driving", "Driving"], ["distwedge", "Distance wedges"], ["lageappr", "Lage approach"], ["hogeappr", "Hoge approach"], ["bunker", "Bunker"], ["putten", "Putten"], ["spelen", "Spelen"], ["fysiek", "Fysiek"], ["prestatiegedrag", "Prestatiegedrag"]];
    const sum = Object.values(ph.accents || {}).reduce((a, b) => a + (+b || 0), 0);
    sh.innerHTML = shead(d[1], `${fmtDate(ph.start)} – ${fmtDate(ph.end)} · ${esc(g.name)}`, xbtn("trash", 'id="phDel"', "danger")) + `
    <div class="card"><div class="f2"><div><label class="fld" style="margin-top:0">Type</label><select class="in" id="phType">${PHASES.filter(p => pdef[3].includes(p[0]) || p[0] === ph.type).map(p => `<option value="${p[0]}" ${ph.type === p[0] ? "selected" : ""}>${p[3]} · ${p[1]}</option>`).join("")}</select></div><div><label class="fld" style="margin-top:0">Doel</label><input class="in" id="phGoal" value="${attr(ph.goal || "")}"></div></div>
      <div class="f2"><div><label class="fld">Start</label><input class="in" id="phStart" type="date" value="${ph.start}"></div><div><label class="fld">Einde</label><input class="in" id="phEnd" type="date" value="${ph.end}"></div></div>
      <label class="fld">Trainingsmix (techniek · skill · performance, %)</label><div class="f3"><input class="in" id="phMix0" type="number" min="0" max="100" value="${ph.mix[0]}"><input class="in" id="phMix1" type="number" min="0" max="100" value="${ph.mix[1]}"><input class="in" id="phMix2" type="number" min="0" max="100" value="${ph.mix[2]}"></div>
      <label class="fld">Accenten (percentages per categorie) <span class="muted" id="phSum">· som ${sum}</span></label><div class="f2">${cats.map(([k, l]) => `<div class="row"><span style="width:130px;font-size:12.5px">${l}</span><input class="in" type="number" min="0" max="100" data-acc="${k}" value="${(ph.accents || {})[k] || ""}" style="width:80px;height:32px" placeholder="0"></div>`).join("")}</div>
      <div class="hint">De generator gebruikt de mix voor het type drill per blok en de accenten als gewicht per categorie. Standaardwaarden komen uit het fasetype (C@ddie).</div></div>
    <div class="klvbtn"><button class="btn o" id="phSave">Opslaan</button><button class="btn ghost" id="phReset">Standaard voor dit type</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#phReset", sh).onclick = () => { const nd = phaseDef($("#phType", sh).value); if (!nd) return; ["phMix0", "phMix1", "phMix2"].forEach((id, i) => $("#" + id, sh).value = nd[4][i]); sh.querySelectorAll("[data-acc]").forEach(i => i.value = nd[5][i.dataset.acc] || ""); };
    $("#phDel", sh).onclick = () => confirmInline(sh, "Fase verwijderen?", async () => { await store.save("programs", { ...prog, phases: prog.phases.filter(p => p.id !== phaseId) }); closeSheet(); });
    $("#phSave", sh).onclick = async () => { const accents = {}; sh.querySelectorAll("[data-acc]").forEach(i => { if (+i.value > 0) accents[i.dataset.acc] = +i.value; }); const upd = { ...ph, type: $("#phType", sh).value, goal: val("phGoal", sh), start: val("phStart", sh), end: val("phEnd", sh), mix: [+$("#phMix0", sh).value || 0, +$("#phMix1", sh).value || 0, +$("#phMix2", sh).value || 0], accents }; if (upd.end < upd.start) return toast("Einde ligt voor start"); await store.save("programs", { ...prog, phases: prog.phases.map(p => p.id === phaseId ? upd : p).sort((a, b) => a.start < b.start ? -1 : 1) }); closeSheet(); toast("Fase opgeslagen"); };
  });
}

/* ---------- Piek (wedstrijd) ---------- */
function openPeakForm(g, season, peakId) {
  openSheet(sh => {
    const prog = programFor(g.id, season.id) || newProgram(g, season); const ex = peakId ? (prog.peaks || []).find(p => p.id === peakId) : null;
    const d = ex ? { ...ex } : { id: "pk_" + Math.random().toString(36).slice(2, 8), name: "", date: todayISO() > season.start ? todayISO() : season.start, end: "", level: "B", activity_key: null };
    sh.innerHTML = shead(ex ? "Wedstrijd bewerken" : "Wedstrijd toevoegen", esc(g.name), ex ? xbtn("trash", 'id="pkDel"', "danger") : "") + `
    <div class="card"><label class="fld" style="margin-top:0">Naam</label><input class="in" id="pkName" value="${attr(d.name)}" placeholder="bv. NK Jeugd, Competitiedag 1, Clubkampioenschap">
      <div class="f2"><div><label class="fld">Datum</label><input class="in" id="pkDate" type="date" value="${d.date}"></div><div><label class="fld">Einde (meerdaags)</label><input class="in" id="pkEnd" type="date" value="${d.end || ""}"></div></div>
      <label class="fld">Niveau</label><div class="seg dark" id="pkLevel">${PEAK_LEVELS.map(([v, l]) => `<button data-v="${v}" class="${d.level === v ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="hint">A-pieken sturen de fases (taper ervoor, herstel erna bij Selectie/Topgolf); B is belangrijk maar stuurt niet; C is een wedstrijdtest in de voorbereiding.</div>
      <div class="sw" style="margin-top:10px"><div><div class="t">Ook in de kalender zetten</div><div class="d">Als activiteit van het type Wedstrijd, met de coaches van de groep</div></div><button class="toggle ${d.activity_key ? "on" : ""}" id="pkCal" ${d.activity_key ? "disabled" : ""}></button></div></div>
    <div class="klvbtn"><button class="btn o" id="pkSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#pkLevel", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; d.level = b.dataset.v; $$("button", e.currentTarget).forEach(x => x.classList.toggle("on", x === b)); };
    const cal = $("#pkCal", sh); cal.onclick = () => { if (!cal.disabled) cal.classList.toggle("on"); };
    const del = $("#pkDel", sh); if (del) del.onclick = async () => { await store.save("programs", { ...prog, peaks: prog.peaks.filter(p => p.id !== peakId) }); closeSheet(); };
    $("#pkSave", sh).onclick = async () => {
      d.name = val("pkName", sh) || "Wedstrijd"; d.date = val("pkDate", sh); d.end = val("pkEnd", sh) || ""; if (!d.date) return toast("Kies een datum");
      if (cal.classList.contains("on") && !d.activity_key) { const r = await store.save("schedule_rules", { kind: "activity", group_id: null, type_id: "at_wedstrijd", title: d.name + " · " + g.name, freq: d.end && d.end > d.date ? "custom" : "once", interval: 1, weekdays: [], nth: null, dates: d.end && d.end > d.date ? rangeDates(d.date, d.end) : null, start: d.date, end: null, count: null, van: "09:00", tot: "17:00", location_id: "loc_extern", coach_ids: (g.coach_ids || []).slice(), note: "Wedstrijd " + g.name, season_id: season.id, skip_breaks: false, archived: false }); d.activity_key = r.id; }
      const peaks = (prog.peaks || []).filter(p => p.id !== d.id).concat([d]).sort((a, b) => a.date < b.date ? -1 : 1);
      const row = { ...prog, peaks }; if (!row.id) delete row.id; await store.save("programs", row); closeSheet(); toast("Wedstrijd opgeslagen");
    };
  });
}
function rangeDates(a, b) { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; }
function openPeakImport(g, season) {
  openSheet(sh => {
    const prog = programFor(g.id, season.id) || newProgram(g, season); const have = new Set((prog.peaks || []).map(p => p.activity_key).filter(Boolean));
    const list = sessionsIn(season.start, season.end, { type_id: "at_wedstrijd" }).filter(s => s.status !== "afgelast");
    const uniq = []; const seen = new Set(); list.forEach(s => { if (seen.has(s.rule_id)) return; seen.add(s.rule_id); uniq.push(s); });
    sh.innerHTML = shead("Wedstrijden uit de kalender", "Activiteiten van het type Wedstrijd in " + esc(season.name)) + `<div class="card">${uniq.length ? uniq.map(s => `<div class="rij ${have.has(s.rule_id) ? "" : "clk"}" data-imp="${attr(s.rule_id)}"><span class="bar" style="background:var(--orange)"></span><span class="tm" style="min-width:70px">${fmtDate(s.date, { weekday: true })}</span><span class="grow"><div class="tt">${esc(s.label)}</div><div class="sub">${s.van}–${s.tot} · ${esc(s.location ? s.location.name : "")}</div></span>${have.has(s.rule_id) ? '<span class="st good">al gekoppeld</span>' : '<span class="seg dark" style="pointer-events:auto"><button data-lv="A">A</button><button data-lv="B" class="on">B</button><button data-lv="C">C</button></span>'}</div>`).join("") : '<div class="empty">Geen wedstrijden in de kalender in dit seizoen.</div>'}</div>`;
    sh.onclick = async e => { const lv = e.target.closest("[data-lv]"); const row = e.target.closest("[data-imp]"); if (!row || have.has(row.dataset.imp)) return; const level = lv ? lv.dataset.lv : "B"; const s = uniq.find(x => x.rule_id === row.dataset.imp); const rule = store.byId("schedule_rules", s.rule_id); const dates = rule.freq === "custom" ? rule.dates : [s.date]; const peaks = (prog.peaks || []).concat([{ id: "pk_" + Math.random().toString(36).slice(2, 8), name: s.title || s.label, date: dates[0], end: dates[dates.length - 1] !== dates[0] ? dates[dates.length - 1] : "", level, activity_key: s.rule_id }]).sort((a, b) => a.date < b.date ? -1 : 1); const r = { ...prog, peaks }; if (!r.id) delete r.id; await store.save("programs", r); have.add(s.rule_id); toast("Gekoppeld als " + level + "-piek"); refreshSheet(); };
  });
}

/* ---------- Genereren (input-venster) ---------- */
function openGenerateSheet(g, season, prog, main) {
  const all = sessionsIn(season.start, season.end, { group_id: g.id }).filter(s => s.status !== "afgelast");
  const d = { notes: prog.notes || "", emphasis: { ...(prog.emphasis || {}) }, block_shares: (prog.block_shares || [15, 35, 35, 15]).slice(), locations: (prog.locations || []).slice(), repeat_weeks: prog.repeat_weeks || 6, fav_first: prog.fav_first !== false, scope: "open", doPhases: !(prog.phases || []).length && profileDef(prog.profile)[3].length > 0, doThemes: !themesOf(g.id).some(t => t.start >= season.start && t.start <= season.end) };
  const cats = [["fullswing", "Full swing"], ["lageappr", "Kort spel"], ["putten", "Putten"], ["spelen", "Spelen"], ["fysiek", "Fysiek"], ["prestatiegedrag", "Prestatiegedrag"]];
  openSheet(sh => {
    const noPlan = all.filter(s => !planFor(s.key) && !(prog.locked || []).includes(s.key)); const openCount = d.scope === "all" ? all.filter(s => !(prog.locked || []).includes(s.key) && (planFor(s.key) || {}).status !== "definitief").length : noPlan.length;
    sh.innerHTML = shead("Programma genereren", `${esc(g.name)} · ${esc(profileDef(prog.profile)[1])}${g.level ? " · " + esc(g.level) : ""} · ${all.length} sessies`) + `
    <div class="card"><label class="fld" style="margin-top:0">Aandachtspunten voor deze groep</label><textarea class="in" id="gnNotes" placeholder="bv. balcontact wisselend: elke les korte set-up check · twee linkshandigen · korte uitleg, veel ballen">${esc(d.notes)}</textarea><div class="hint">Komt bovenaan elke lesvoorbereiding en wordt bewaard bij het programma.</div>
      <label class="fld">Nadruk (t.o.v. fase-accenten)</label>${cats.map(([k, l]) => `<div class="row" style="margin-bottom:6px"><span style="width:120px;font-size:12.5px">${l}</span><div class="seg" data-emp="${k}" style="flex:none">${[[-2, "−−"], [-1, "−"], [0, "·"], [1, "+"], [2, "++"]].map(([v, t]) => `<button data-v="${v}" class="${(d.emphasis[k] || 0) === v ? "on" : ""}">${t}</button>`).join("")}</div></div>`).join("")}
      <label class="fld">Blokopbouw (warming-up · techniek · spelvorm · afsluiting, %)</label><div class="pick" id="gnShares">${[[15, 35, 35, 15], [10, 40, 40, 10], [0, 45, 45, 10], [20, 30, 30, 20]].map(s => `<button data-v="${s.join(",")}" class="${s.join(",") === d.block_shares.join(",") ? "on" : ""}">${s.join(" · ")}</button>`).join("")}</div>
      <label class="fld">Locaties beschikbaar (leeg = alle)</label><div class="pick" id="gnLoc">${locationsSorted().map(l => `<button data-v="${attr(l.name)}" class="${d.locations.includes(l.name) ? "on" : ""}">${esc(l.name)}</button>`).join("")}</div>
      <div class="sw" style="margin-top:10px"><div><div class="t">Mijn favorieten eerst</div><div class="d">drills met ★ krijgen voorrang</div></div><button class="toggle ${d.fav_first ? "on" : ""}" id="gnFav"></button></div>
      <div class="sw"><div><div class="t">Herhaling vermijden binnen</div><div class="d">dezelfde drill niet opnieuw in deze periode</div></div>${klsel("gnRep", [[3, "3 weken"], [6, "6 weken"], [10, "10 weken"], [16, "16 weken"]], d.repeat_weeks)}</div>
      ${profileDef(prog.profile)[3].length ? `<div class="sw"><div><div class="t">Fases opbouwen</div><div class="d">${(prog.phases || []).length ? "bestaande fases vervangen" : "nog geen fases — opbouwen uit profiel en wedstrijden"}</div></div><button class="toggle ${d.doPhases ? "on" : ""}" id="gnPh"></button></div>` : ""}
      <div class="sw"><div><div class="t">Thema's genereren</div><div class="d">${d.doThemes ? "nog geen thema's dit seizoen" : "bestaande thema's vervangen door sjabloon"}</div></div><button class="toggle ${d.doThemes ? "on" : ""}" id="gnTh"></button></div>
      <div class="sw" style="border:0"><div><div class="t">Bereik</div><div class="d">definitieve en vastgezette voorbereidingen blijven altijd staan</div></div><div class="seg dark" id="gnScope"><button data-v="open" class="${d.scope === "open" ? "on" : ""}">Zonder voorbereiding</button><button data-v="all" class="${d.scope === "all" ? "on" : ""}">Alle concepten</button></div></div></div>
    <div class="card"><div class="chead"><h2>Wat er gebeurt</h2></div><div class="small" style="line-height:1.6">${d.doPhases ? "• Fases opbouwen uit profiel <b>" + esc(profileDef(prog.profile)[1]) + "</b> en " + (prog.peaks || []).length + " wedstrijden<br>" : ""}${d.doThemes ? "• Thema's uit het sjabloon over de fases leggen<br>" : ""}• Lesvoorbereiding (concept) voor <b>${openCount}</b> sessies, passend bij fase-mix, accenten, niveau ${esc(g.level || "")}, leeftijd ${esc(g.age || "—")} en je nadruk</div></div>
    <div class="klvbtn"><button class="btn o" id="gnGo">⚡ Programma maken</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    sh.querySelectorAll("[data-emp]").forEach(sg => sg.onclick = e => { const b = e.target.closest("button"); if (!b) return; d.emphasis[sg.dataset.emp] = +b.dataset.v; $$("button", sg).forEach(x => x.classList.toggle("on", x === b)); });
    $("#gnShares", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; d.block_shares = b.dataset.v.split(",").map(Number); $$("button", e.currentTarget).forEach(x => x.classList.toggle("on", x === b)); };
    $("#gnLoc", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; const i = d.locations.indexOf(b.dataset.v); if (i >= 0) d.locations.splice(i, 1); else d.locations.push(b.dataset.v); b.classList.toggle("on"); };
    $("#gnFav", sh).onclick = e => { d.fav_first = !d.fav_first; e.target.classList.toggle("on", d.fav_first); };
    $("#gnRep", sh).onchange = e => d.repeat_weeks = +e.target.value;
    const gp = $("#gnPh", sh); if (gp) gp.onclick = e => { d.doPhases = !d.doPhases; e.target.classList.toggle("on", d.doPhases); };
    $("#gnTh", sh).onclick = e => { d.doThemes = !d.doThemes; e.target.classList.toggle("on", d.doThemes); };
    $("#gnScope", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; d.scope = b.dataset.v; d.notes = val("gnNotes", sh); refreshSheet(); };
    $("#gnGo", sh).onclick = async () => {
      d.notes = val("gnNotes", sh);
      let p = { ...prog, notes: d.notes, emphasis: d.emphasis, block_shares: d.block_shares, locations: d.locations, repeat_weeks: d.repeat_weeks, fav_first: d.fav_first };
      if (d.doPhases) p.phases = buildPhases(p.profile, season, p.peaks || [], p.cfg || DEFAULT_CFG);
      if (!p.id) delete p.id; p = await store.save("programs", p);
      if (d.doThemes) { for (const t of themesOf(g.id).filter(t => t.start >= season.start && t.start <= season.end)) await store.remove("group_themes", t.id); for (const r of buildThemes(p, season, g.id)) await store.save("group_themes", r); }
      const targets = all.filter(s => !(p.locked || []).includes(s.key) && (d.scope === "all" ? (planFor(s.key) || {}).status !== "definitief" : !planFor(s.key)));
      let n = 0; for (const s of targets) { const ex = planFor(s.key); const row = { ...(ex || {}), ...generate(s, { program: p, round: ((ex || {}).round || 0) + 1 }), id: ex ? ex.id : undefined, session_key: s.key, rule_id: s.rule_id, date: s.date, group_id: s.group_id, source: "generator", status: "concept" }; if (!row.id) delete row.id; await store.save("lesson_plans", row); n++; }
      closeSheet(); toast(`Programma gemaakt: ${n} voorbereidingen`);
    };
  });
}
