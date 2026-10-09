// Kalender: dag (tijdlijn per locatie of coach), week, maand, jaar — filterbaar.
import { store, isCoordinator, coachById } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, shead, klsel, tint, ICON, xbtn, toast } from "../lib/ui.js";
import { todayISO, addDays, addMonths, weekStart, monthStart, fromISO, toISO, fmtDate, fmtDateLong, DAGEN, DAGEN_LANG, MAANDEN, MAANDEN_KORT, timeToMin, minToTime, nowTime, isoWeek, weekday, daysBetween } from "../lib/dates.js";
import { sessionsIn, conflictKeys, groupsSorted, coachesActive, locationsSorted, hoursOf } from "../lib/model.js";
import { inBreak } from "../lib/recur.js";
import { openSession } from "./session.js";
import { openRuleForm } from "./ruleform.js";
import { sessionRow } from "./today.js";
import { themesOf } from "../lib/generator.js";

const st = { mode: "week", date: todayISO(), dayBy: "locatie", tlBy: "groep", tlPer: "kwartaal", tlFrom: null, tlTo: null, filter: {} };
try { Object.assign(st, JSON.parse(sessionStorage.getItem("tp_cal") || "{}")); } catch (e) { }
function persist() { try { sessionStorage.setItem("tp_cal", JSON.stringify(st)); } catch (e) { } }

const H0 = 7, H1 = 22, PX = 44; // uurraster 07:00–22:00, 44 px per uur

export function render(main, params) {
  if (params && params.date) { st.date = params.date; if (params.mode) st.mode = params.mode; history.replaceState(null, "", "#/kalender"); }
  const f = st.filter; const nf = Object.values(f).filter(Boolean).length;
  const title = st.mode === "dag" ? fmtDateLong(st.date) : st.mode === "week" ? "Week " + isoWeek(st.date) + " · " + fmtDate(weekStart(st.date)) + " – " + fmtDate(addDays(weekStart(st.date), 6), { year: true }) : st.mode === "maand" ? MAANDEN[fromISO(st.date).getMonth()] + " " + fromISO(st.date).getFullYear() : st.mode === "tijdlijn" ? tlRange().label : st.mode === "team" ? "Week " + isoWeek(st.date) + " · " + fmtDate(weekStart(st.date)) + " – " + fmtDate(addDays(weekStart(st.date), 6), { year: true }) : "Seizoen " + fromISO(st.date).getFullYear() + "/" + (fromISO(st.date).getFullYear() + 1).toString().slice(2);
  main.innerHTML = `
  <div class="spkop"><h1>Kalender</h1>
    <div class="seg" id="calMode">${[["dag", "Dag"], ["week", "Week"], ["maand", "Maand"], ["jaar", "Jaar"], ["tijdlijn", "Tijdlijn"], ["team", "Team"]].map(([v, l]) => `<button data-v="${v}" class="${st.mode === v ? "on" : ""}">${l}</button>`).join("")}</div>
    ${xbtn("filter", 'id="calFilter" title="Filters"') .replace("</button>", (nf ? `<span class="badge">${nf}</span>` : "") + "</button>")}
    <div class="right">${isCoordinator() ? xbtn("print", 'id="calPrint" title="Afdrukken"') : ""}<button class="plusbtn" id="calAdd" title="Toevoegen">+</button></div>
  </div>
  ${nf ? `<div class="chips">${chipList()}<button class="chip link" id="calClear">Wis</button></div>` : ""}
  <div class="cal-tools">
    <div class="cal-nav">${xbtn("back", 'id="calPrev"')}${xbtn("next", 'id="calNext"')}</div>
    <button class="btn ghost sm" id="calToday">Vandaag</button>
    <div class="cal-title">${esc(title)}</div>
    ${st.mode === "tijdlijn" ? `${klsel("calTlPer", [["maand", "Maand"], ["kwartaal", "Kwartaal"], ["jaar", "Jaar"], ["custom", "Van / tot …"]], st.tlPer)}${st.tlPer === "custom" ? `<span class="row"><input class="in" type="date" id="calTlFrom" value="${attr(st.tlFrom || "")}" style="width:150px;height:36px"><span class="muted">–</span><input class="in" type="date" id="calTlTo" value="${attr(st.tlTo || "")}" style="width:150px;height:36px"></span>` : ""}<div class="seg dark" id="calTlBy"><button data-v="groep" class="${st.tlBy === "groep" ? "on" : ""}">Per groep</button><button data-v="coach" class="${st.tlBy === "coach" ? "on" : ""}">Per coach</button><button data-v="locatie" class="${st.tlBy === "locatie" ? "on" : ""}">Per locatie</button></div>` : ""}
    ${st.mode === "dag" ? `<div class="seg dark" id="calDayBy"><button data-v="locatie" class="${st.dayBy === "locatie" ? "on" : ""}">Per locatie</button><button data-v="coach" class="${st.dayBy === "coach" ? "on" : ""}">Per coach</button><button data-v="lijst" class="${st.dayBy === "lijst" ? "on" : ""}">Lijst</button></div>` : ""}
    <span class="hdnote" id="calStats"></span>
  </div>
  <div id="calBody"></div>`;

  $("#calMode", main).onclick = e => { const b = e.target.closest("button"); if (!b) return; st.mode = b.dataset.v; persist(); render(main); };
  const tp = $("#calTlPer", main); if (tp) tp.onchange = () => { st.tlPer = tp.value; if (st.tlPer === "custom" && !st.tlFrom) { st.tlFrom = weekStart(st.date); st.tlTo = addDays(st.tlFrom, 7 * 13 - 1); } persist(); render(main); };
  ["calTlFrom", "calTlTo"].forEach(id => { const el = $("#" + id, main); if (el) el.onchange = () => { st.tlFrom = $("#calTlFrom", main).value || st.tlFrom; st.tlTo = $("#calTlTo", main).value || st.tlTo; if (st.tlTo < st.tlFrom) st.tlTo = addDays(st.tlFrom, 27); persist(); render(main); }; });
  const tb = $("#calTlBy", main); if (tb) tb.onclick = e => { const b = e.target.closest("button"); if (!b) return; st.tlBy = b.dataset.v; persist(); render(main); };
  const db = $("#calDayBy", main); if (db) db.onclick = e => { const b = e.target.closest("button"); if (!b) return; st.dayBy = b.dataset.v; persist(); render(main); };
  $("#calPrev", main).onclick = () => { step(-1); render(main); }; $("#calNext", main).onclick = () => { step(1); render(main); };
  $("#calToday", main).onclick = () => { st.date = todayISO(); persist(); render(main); };
  $("#calFilter", main).onclick = () => openFilter(() => render(main));
  const cl = $("#calClear", main); if (cl) cl.onclick = () => { st.filter = {}; persist(); render(main); };
  $("#calAdd", main).onclick = () => openRuleForm({ date: st.date });
  const pr = $("#calPrint", main); if (pr) pr.onclick = () => window.print();
  main.onclick = e => {
    const ch = e.target.closest("[data-rmf]"); if (ch) { delete st.filter[ch.dataset.rmf]; persist(); render(main); return; }
    const k = e.target.closest("[data-key]"); if (k) { openSession(k.dataset.key); return; }
    const wk = e.target.closest("[data-goweek]"); if (wk) { st.date = wk.dataset.goweek; st.mode = "week"; if (wk.dataset.f && wk.dataset.v) { st.filter = { [wk.dataset.f]: wk.dataset.v }; } persist(); render(main); return; }
    const d = e.target.closest("[data-goday]"); if (d) { st.date = d.dataset.goday; st.mode = "dag"; persist(); render(main); return; }
    const m = e.target.closest("[data-gomonth]"); if (m) { st.date = m.dataset.gomonth; st.mode = "maand"; persist(); render(main); return; }
    const hs = e.target.closest("[data-hslot]"); if (hs && !e.target.closest(".blk")) { const r = hs.getBoundingClientRect(); const frac = (e.clientX - r.left) / r.width; const minutes = Math.floor((H0 * 60 + frac * (H1 - H0) * 60) / 30) * 30; const van = minToTime(minutes); openRuleForm({ date: hs.dataset.hslot, van, tot: addMinStr(van, 90), location_id: hs.dataset.loc, coach_id: hs.dataset.coach }); return; }
    const gg = e.target.closest("[data-gogroup]"); if (gg) { import("./groups.js").then(m => m.openGroup(gg.dataset.gogroup)); return; }
    const slot = e.target.closest("[data-slot]"); if (slot && !e.target.closest(".ev")) { const [date, hh] = slot.dataset.slot.split("|"); const y = e.offsetY; const minutes = Math.floor((y / PX) * 60 / 30) * 30; const van = String(Math.floor((H0 * 60 + minutes) / 60)).padStart(2, "0") + ":" + String((H0 * 60 + minutes) % 60).padStart(2, "0"); openRuleForm({ date, van, tot: addMinStr(van, 90), location_id: slot.dataset.loc, coach_id: slot.dataset.coach }); }
  };
  const body = $("#calBody", main);
  if (st.mode === "dag") renderDay(body); else if (st.mode === "week") renderWeek(body); else if (st.mode === "maand") renderMonth(body); else if (st.mode === "tijdlijn") renderTimeline(body); else if (st.mode === "team") renderTeam(body); else renderYear(body);
}
function addMinStr(t, n) { const m = timeToMin(t) + n; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
function step(n) { if (st.mode === "dag") st.date = addDays(st.date, n); else if (st.mode === "week") st.date = addDays(st.date, 7 * n); else if (st.mode === "maand") st.date = addMonths(st.date, n); else if (st.mode === "tijdlijn") { const r = tlRange(); const len = r.days; if (st.tlPer === "custom") { st.tlFrom = addDays(st.tlFrom, len * n); st.tlTo = addDays(st.tlTo, len * n); } else st.date = addDays(st.date, len * n); } else if (st.mode === "team") st.date = addDays(st.date, 7 * n); else st.date = addMonths(st.date, 12 * n); persist(); }
function chipList() {
  const f = st.filter; const out = [];
  const name = (tbl, id) => (store.byId(tbl, id) || {}).name || id;
  if (f.gtype_id) out.push(["gtype_id", name("group_types", f.gtype_id)]); if (f.group_id) out.push(["group_id", name("groups", f.group_id)]);
  if (f.type_id) out.push(["type_id", name("activity_types", f.type_id)]); if (f.coach_id) out.push(["coach_id", name("coaches", f.coach_id)]); if (f.location_id) out.push(["location_id", name("locations", f.location_id)]); if (f.kind) out.push(["kind", f.kind === "activity" ? "Losse activiteiten" : "Groepstrainingen"]);
  return out.map(([k, l]) => `<span class="chip on">${esc(l)}<button class="x" data-rmf="${k}">×</button></span>`).join("");
}
function stats(list) { const el = $("#calStats"); if (el) el.textContent = list.filter(s => s.status !== "afgelast").length + " sessies · " + hoursOf(list) + " uur"; }

/* ---------- Dag: bezettingsstrip (uren horizontaal, rijen = locaties of coaches) ---------- */
function renderDay(body) {
  const list = sessionsIn(st.date, st.date, st.filter); stats(list);
  const conf = conflictKeys(st.date, st.date);
  if (st.dayBy === "lijst") { body.innerHTML = `<div class="card">${list.length ? list.map(sessionRow).join("") : '<div class="empty">Niets gepland op deze dag.</div>'}</div>`; return; }
  const wd = weekday(st.date);
  let rows;
  if (st.dayBy === "locatie") { rows = locationsSorted().map(l => ({ id: l.id, label: l.name, sub: l.shared ? "gedeeld · max " + (l.capacity || "∞") : "exclusief", items: list.filter(s => s.location_id === l.id), loc: l.id })); const none = list.filter(s => !s.location_id); if (none.length) rows.push({ id: "none", label: "Geen locatie", sub: "", items: none }); }
  else { rows = coachesActive().map(c => { const av = (c.availability || {})[wd]; return { id: c.id, label: c.name, sub: av ? av[0] + "–" + av[1] : "niet beschikbaar", items: list.filter(s => s.coach_ids.includes(c.id)), coach: c.id, color: c.color, avail: av }; }); const none = list.filter(s => !s.coach_ids.length); if (none.length) rows.unshift({ id: "none", label: "Zonder coach", sub: "vervanger nodig", items: none, open: true }); }
  const n = H1 - H0; const x = t => (timeToMin(t) - H0 * 60) / (n * 60) * 100;
  const now = nowTime(); const nowX = x(now);
  const html = rows.map(r => {
    const laid = layout(r.items); const lanes = Math.max(1, ...laid.map(l => l.lanes));
    const h = lanes > 1 ? 18 * lanes + 8 : 44;
    const busy = r.items.filter(s => s.status !== "afgelast").reduce((a, s) => a + s.minutes, 0); const cap = r.avail ? timeToMin(r.avail[1]) - timeToMin(r.avail[0]) : n * 60;
    const blocks = laid.map(({ s, lane, lanes }) => { const top = lanes > 1 ? 4 + lane * 18 : 4; const hh = lanes > 1 ? 16 : 36; return `<span class="blk ${lanes > 1 ? "two" : ""} ${s.isMatch ? "wed" : ""} ${s.status === "afgelast" ? "off" : ""} ${conf.has(s.key) ? "conf" : ""}" data-key="${attr(s.key)}" style="left:${x(s.van)}%;width:${x(s.tot) - x(s.van)}%;top:${top}px;height:${hh}px;--k:${attr(s.color)};--bg:${tint(s.color, .16)}" title="${attr(s.label + " " + s.van + "–" + s.tot)}"><b>${esc(s.group ? shortName(s.group.name) : s.label)}</b>${lanes > 1 ? "" : `<small>${s.van}–${s.tot}${st.dayBy === "locatie" && s.coaches.length ? " · " + s.coaches.map(c => esc(c.name.split(" ")[0])).join(", ") : ""}${st.dayBy === "coach" && s.location ? " · " + esc(s.location.short || s.location.name) : ""}</small>`}</span>`; }).join("");
    const avail = r.coach ? (r.avail ? `<span class="navail" style="left:0;width:${Math.max(0, x(r.avail[0]))}%"></span><span class="navail" style="left:${Math.min(100, x(r.avail[1]))}%;right:0"></span>` : `<span class="navail" style="left:0;right:0"></span>`) : "";
    return `<div class="bzr"><div class="bzl ${r.open ? "bad" : ""}">${r.color ? `<span class="avatar xs" style="background:${attr(r.color)}">${esc(r.label.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span>` : ""}<span class="grow" style="min-width:0"><b class="ell">${esc(r.label)}</b><small>${esc(r.sub)}${r.items.length ? " · " + (Math.round(busy / 6) / 10) + " u" : ""}</small></span></div><div class="bzlane" style="height:${h}px" data-hslot="${attr(st.date)}" ${r.loc ? `data-loc="${attr(r.loc)}"` : ""} ${r.coach ? `data-coach="${attr(r.coach)}"` : ""}>${avail}${blocks}${st.date === todayISO() && nowX > 0 && nowX < 100 ? `<span class="nowv" style="left:${nowX}%"></span>` : ""}<span class="bzfill"><i style="width:${Math.min(100, busy / cap * 100)}%"></i></span></div></div>`;
  }).join("");
  const head = Array.from({ length: n }, (_, i) => `<span>${H0 + i}:00</span>`).join("");
  body.innerHTML = `<div class="calgrid bzwrap"><div class="bz" style="--n:${n}"><div class="bzr"><div class="bzl hd"></div><div class="bzhd">${head}</div></div>${html}</div></div>${list.length ? "" : '<div class="empty" style="text-align:center">Niets gepland op deze dag. Tik in een lege strook om iets in te plannen.</div>'}`;
}

/* ---------- Week ---------- */
function renderWeek(body) {
  const ws = weekStart(st.date); const we = addDays(ws, 6);
  const list = sessionsIn(ws, we, st.filter); stats(list);
  const conf = conflictKeys(ws, we);
  const cols = []; for (let i = 0; i < 7; i++) { const d = addDays(ws, i); const brk = inBreak(d, store.rows("breaks")); cols.push({ id: d, date: d, label: DAGEN[weekday(d)], n: fromISO(d).getDate(), brk: brk ? brk.name : "", items: list.filter(s => s.date === d), today: d === todayISO() }); }
  body.innerHTML = timeGrid(cols, conf, true);
}

function timeGrid(cols, conf, isWeek) {
  const hours = []; for (let h = H0; h <= H1; h++) hours.push(h);
  const height = (H1 - H0) * PX;
  const now = nowTime(); const nowTop = (timeToMin(now) - H0 * 60) / 60 * PX;
  const head = cols.map(c => `<div class="hd ${c.today ? "today" : ""}">${isWeek ? `<div class="d">${c.label}</div><div class="n">${c.n}</div>${c.brk ? `<span class="brk">${esc(c.brk)}</span>` : ""}` : `<div class="d" style="color:${c.color || "var(--muted)"}">${esc(c.label)}</div>${c.sub ? `<span class="sub">${esc(c.sub)}</span>` : ""}`}</div>`).join("");
  const colsHtml = cols.map(c => {
    const laid = layout(c.items);
    const evs = laid.map(({ s, lane, lanes }) => {
      const top = (timeToMin(s.van) - H0 * 60) / 60 * PX, h = Math.max(18, (timeToMin(s.tot) - timeToMin(s.van)) / 60 * PX - 2);
      const w = 100 / lanes, left = lane * w;
      const cls = (s.isMatch ? " wed" : "") + (s.status === "afgelast" ? " off" : "") + (conf.has(s.key) ? " conf" : "");
      return `<div class="ev${cls}" data-key="${attr(s.key)}" style="top:${top}px;height:${h}px;left:calc(${left}% + 2px);width:calc(${w}% - 4px);--k:${attr(s.color)};--bgk:${tint(s.color, .16)}" title="${attr(s.label + " " + s.van + "–" + s.tot)}"><b>${esc(s.group ? shortName(s.group.name) : s.label)}</b><small>${s.van}–${s.tot}${s.location && isWeek ? " · " + esc(s.location.short || s.location.name) : ""}${!isWeek && st.dayBy === "locatie" && s.coaches.length ? " · " + s.coaches.map(x => esc(x.name.split(" ")[0])).join(", ") : ""}${isWeek && s.coaches.length ? " · " + s.coaches.map(x => esc(x.name.split(" ")[0])).join(", ") : ""}</small></div>`;
    }).join("");
    const isToday = c.date === todayISO();
    return `<div class="col ${c.today ? "today" : ""} ${c.brk ? "brk" : ""}" style="height:${height}px;background-size:100% ${PX}px" data-slot="${attr(c.date)}|" ${c.loc ? `data-loc="${attr(c.loc)}"` : ""} ${c.coach ? `data-coach="${attr(c.coach)}"` : ""}>${evs}${isToday && nowTop > 0 && nowTop < height ? `<div class="nowline" style="top:${nowTop}px"></div>` : ""}</div>`;
  }).join("");
  const gut = `<div class="gut" style="height:${height}px">${hours.map(h => `<span style="top:${(h - H0) * PX}px">${h}:00</span>`).join("")}</div>`;
  return `<div class="calgrid"><div class="wk" style="--cols:${cols.length}"><div class="hd" style="border-left:0"></div>${head}${gut}${colsHtml}</div></div>${cols.every(c => !c.items.length) ? '<div class="empty" style="text-align:center">Niets gepland in deze periode' + (Object.values(st.filter).filter(Boolean).length ? " met deze filters" : "") + '.</div>' : ""}`;
}
function shortName(n) { return n.replace(/\s*\((.*?)\)\s*/, " ").replace(/ (woensdag|zaterdag|dinsdag|donderdag|maandag|vrijdag|zondag)$/i, ""); }
/** Gelijktijdige blokken naast elkaar leggen. */
function layout(items) {
  const sorted = items.slice().sort((a, b) => timeToMin(a.van) - timeToMin(b.van) || timeToMin(b.tot) - timeToMin(a.tot));
  const out = []; let cluster = [], clusterEnd = -1;
  const flush = () => { if (!cluster.length) return; const lanes = []; cluster.forEach(s => { let li = lanes.findIndex(end => end <= timeToMin(s.van)); if (li < 0) { li = lanes.length; lanes.push(0); } lanes[li] = timeToMin(s.tot); s._lane = li; }); cluster.forEach(s => out.push({ s, lane: s._lane, lanes: lanes.length })); cluster = []; clusterEnd = -1; };
  sorted.forEach(s => { if (timeToMin(s.van) >= clusterEnd) flush(); cluster.push(s); clusterEnd = Math.max(clusterEnd, timeToMin(s.tot)); });
  flush(); return out;
}

/* ---------- Maand ---------- */
function renderMonth(body) {
  const ms = monthStart(st.date); const first = weekStart(ms); const mEnd = addDays(addMonths(ms, 1), -1); const last = addDays(weekStart(mEnd), 6);
  const list = sessionsIn(first, last, st.filter); stats(list.filter(s => s.date >= ms && s.date <= mEnd));
  const breaks = store.rows("breaks");
  let cells = ""; for (let d = first; d <= last; d = addDays(d, 1)) {
    const items = list.filter(s => s.date === d); const out = d < ms || d > mEnd; const brk = inBreak(d, breaks);
    const show = items.slice(0, 4);
    cells += `<div class="cell ${out ? "out" : ""} ${d === todayISO() ? "today" : ""} ${brk ? "brk" : ""}" data-goday="${d}"><div class="dn"><b>${fromISO(d).getDate()}</b>${brk && (d === brk.start || weekday(d) === 1) ? `<small>${esc(brk.name)}</small>` : ""}</div>${show.map(s => `<div class="mev ${s.isMatch ? "wed" : ""} ${s.status === "afgelast" ? "off" : ""}" style="--k:${attr(s.color)}" data-key="${attr(s.key)}">${s.van} ${esc(s.group ? shortName(s.group.name) : s.label)}</div>`).join("")}${items.length > 4 ? `<div class="mev more">+${items.length - 4} meer</div>` : ""}</div>`;
  }
  body.innerHTML = `<div class="calgrid"><div class="mo">${[1, 2, 3, 4, 5, 6, 0].map(w => `<div class="hd">${DAGEN[w]}</div>`).join("")}${cells}</div></div>`;
}

/* ---------- Jaar / seizoen ---------- */
function renderYear(body) {
  const y = fromISO(st.date).getFullYear();
  // seizoensjaar: augustus t/m juli
  const months = []; for (let i = 0; i < 12; i++) { const m = (7 + i) % 12; const yy = y + (m < 7 ? 1 : 0); months.push(`${yy}-${String(m + 1).padStart(2, "0")}-01`); }
  const from = months[0], to = addDays(addMonths(months[11], 1), -1);
  const list = sessionsIn(from, to, st.filter); stats(list);
  const perDay = {}; list.forEach(s => { (perDay[s.date] = perDay[s.date] || []).push(s); });
  const breaks = store.rows("breaks");
  body.innerHTML = `<div class="yr">${months.map(ms => {
    const d0 = fromISO(ms); const nDays = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate(); const pad = (weekday(ms) + 6) % 7;
    let cells = [1, 2, 3, 4, 5, 6, 0].map(w => `<span class="wd">${DAGEN[w][0]}</span>`).join("") + "<span></span>".repeat(pad);
    for (let i = 1; i <= nDays; i++) { const d = ms.slice(0, 8) + String(i).padStart(2, "0"); const items = perDay[d] || []; const brk = inBreak(d, breaks); const cls = items.some(s => s.isMatch) ? "wed" : items.length >= 4 ? "busy" : items.length ? "has" : brk ? "brk" : ""; cells += `<span class="${cls} ${d === todayISO() ? "today" : ""}" data-goday="${d}" title="${items.length} sessies${brk ? " · " + attr(brk.name) : ""}">${i}</span>`; }
    const mList = list.filter(s => s.date.slice(0, 7) === ms.slice(0, 7));
    return `<div class="ym"><h3 style="display:flex;justify-content:space-between"><button data-gomonth="${ms}" style="font:inherit">${MAANDEN[d0.getMonth()]} ${d0.getFullYear()}</button><span class="muted small">${mList.filter(s => s.status !== "afgelast").length} · ${hoursOf(mList)} u</span></h3><div class="ymg">${cells}</div></div>`;
  }).join("")}</div>`;
}

/* ---------- Filtersheet ---------- */
function openFilter(done) {
  openSheet(sh => {
    const f = st.filter;
    const sel = (id, label, opts) => `<div class="sw"><div class="t">${label}</div>${klsel(id, [["", "Alle"]].concat(opts), f[id] || "")}</div>`;
    sh.innerHTML = shead("Filters", "Kalender") + `<div class="card">
      ${sel("gtype_id", "Groepstype", store.rows("group_types").slice().sort((a, b) => a.order - b.order).map(t => [t.id, t.name]))}
      ${sel("group_id", "Groep", groupsSorted().map(g => [g.id, g.name]))}
      ${sel("type_id", "Activiteit", store.rows("activity_types").slice().sort((a, b) => a.order - b.order).map(t => [t.id, t.name]))}
      ${sel("coach_id", "Coach", coachesActive().map(c => [c.id, c.name]))}
      ${sel("location_id", "Locatie", locationsSorted().map(l => [l.id, l.name]))}
    </div><div class="klvbtn"><button class="btn o" id="ffOk">Toepassen</button><button class="btn ghost" id="ffClear">Wis alles</button></div>`;
    $("#ffOk", sh).onclick = () => { ["gtype_id", "group_id", "type_id", "coach_id", "location_id"].forEach(k => { const v = $("#" + k, sh).value; if (v) st.filter[k] = v; else delete st.filter[k]; }); persist(); closeSheet(); done(); };
    $("#ffClear", sh).onclick = () => { st.filter = {}; persist(); closeSheet(); done(); };
  });
}

/* ---------- Tijdlijn: seizoensbalken met losse trainingen ---------- */
function tlRange() {
  const ws = weekStart(st.date);
  let from, to;
  if (st.tlPer === "custom" && st.tlFrom && st.tlTo) { from = st.tlFrom; to = st.tlTo; }
  else { const wks = st.tlPer === "jaar" ? 52 : st.tlPer === "maand" ? 5 : 13; from = ws; to = addDays(ws, 7 * wks - 1); }
  const days = daysBetween(from, to) + 1;
  return { from, to, days, label: (st.tlPer === "custom" ? "" : ({ jaar: "Jaar", kwartaal: "Kwartaal", maand: "Maand" })[st.tlPer] + " · ") + fmtDate(from) + " – " + fmtDate(to, { year: true }) };
}
function renderTimeline(body) {
  const { from, to, days } = tlRange();
  const list = sessionsIn(from, to, st.filter); stats(list);
  const breaks = store.rows("breaks"); const today = todayISO();
  const X = d => daysBetween(from, d) / days * 100; const W = 100 / days;
  const dense = days > 120, mid = days > 50; // jaar: streepjes, kwartaal: blokjes, maand: blokjes met letter
  const conf = conflictKeys(from, to);
  // kopregels: maanden + weken
  let months = ""; for (let d = from; d <= to;) { const ms = d.slice(0, 7); const me = addDays(addMonths(d.slice(0, 8) + "01", 1), -1); const end = me < to ? me : to; const w = X(addDays(end, 1)) - X(d); months += `<span style="left:${X(d)}%;width:${w}%">${w * days / 100 >= (dense ? 20 : 8) ? MAANDEN[fromISO(d).getMonth()] + (dense ? "" : " " + fromISO(d).getFullYear()) : ""}</span>`; d = addDays(end, 1); }
  let weeks = ""; for (let d = weekStart(from); d <= to; d = addDays(d, 7)) { const a = d < from ? from : d; const b = addDays(d, 6) < to ? addDays(d, 6) : to; const brk = breaks.find(x => !(x.end < a || x.start > b)); const cur = d === weekStart(today); weeks += `<span class="${cur ? "cur" : ""}" style="left:${X(a)}%;width:${X(addDays(b, 1)) - X(a)}%" data-goweek="${d}" title="week ${isoWeek(d)}${brk ? " · " + attr(brk.name) : ""}"><b>${dense && !cur ? (isoWeek(d) % 4 === 1 ? isoWeek(d) : "") : isoWeek(d)}</b>${!mid ? `<small>${fmtDate(d)}</small>` : ""}${brk && !dense ? `<i>${esc(brk.name)}</i>` : ""}</span>`; }
  const brkHtml = breaks.filter(b => !(b.end < from || b.start > to)).map(b => { const a = b.start < from ? from : b.start; const e = b.end > to ? to : b.end; return `<span class="tlbrk" style="left:${X(a)}%;width:${X(addDays(e, 1)) - X(a)}%"></span>`; }).join("");
  const nowHtml = today >= from && today <= to ? `<span class="tlnow" style="left:${X(today) + W / 2}%"></span>` : "";
  // rijen
  const rowFor = (id, label, sub, color, items, f) => ({ id, label, sub, color, items, f });
  let rows;
  if (st.tlBy === "coach") rows = coachesActive().map(c => rowFor(c.id, c.name, hoursOf(list.filter(s => s.coach_ids.includes(c.id))) + " u", c.color, list.filter(s => s.coach_ids.includes(c.id)), "coach_id"));
  else if (st.tlBy === "locatie") rows = locationsSorted().map(l => rowFor(l.id, l.name, l.shared ? "gedeeld" : "", "#7A7F85", list.filter(s => s.location_id === l.id), "location_id"));
  else {
    rows = []; const types = store.rows("group_types").slice().sort((a, b) => a.order - b.order); const hasF = Object.keys(st.filter).length > 0;
    types.forEach(t => { const gRows = groupsSorted().filter(g => g.type_id === t.id).map(g => ({ ...rowFor(g.id, g.name, g.level || "", t.color, list.filter(s => s.group_id === g.id), "group_id"), group: g })).filter(r => r.items.length || !hasF); if (gRows.length) { rows.push({ head: t.name, color: t.color }); rows.push(...gRows); } });
    const act = list.filter(s => s.kind === "activity"); if (act.length) { rows.push({ head: "Activiteiten", color: "#7A7F85" }); store.rows("activity_types").slice().sort((a, b) => a.order - b.order).forEach(t => { const its = act.filter(s => s.type_id === t.id); if (its.length) rows.push(rowFor(t.id, t.name, its.length + " activiteiten", t.id === "at_wedstrijd" ? "#F47C20" : t.color, its, "type_id")); }); }
  }
  if (st.tlBy !== "groep") rows = rows.filter(r => r.items.length || !Object.keys(st.filter).length);
  const html = rows.map(r => {
    if (r.head) return `<div class="tlh"><span class="dot" style="background:${attr(r.color)}"></span>${esc(r.head)}</div>`;
    // doorlopende balk per roosterregel (eerste t/m laatste training in beeld)
    const byRule = {}; r.items.forEach(s => { (byRule[s.rule_id] = byRule[s.rule_id] || []).push(s); });
    const bars = Object.values(byRule).filter(l => l.length > 1).map(l => { const a = l[0].date, b = l[l.length - 1].date; return `<span class="tlbar" style="left:${X(a)}%;width:${X(addDays(b, 1)) - X(a)}%;--k:${attr(r.color)}"></span>`; }).join("");
    const themes = r.group ? themesOf(r.group.id).map(t => { const a = t.start < from ? from : t.start; const e0 = addDays(t.start, (t.weeks || 4) * 7 - 1); const e = e0 > to ? to : e0; if (e < from || a > to) return ""; return `<span class="tltheme" style="left:${X(a)}%;width:${X(addDays(e, 1)) - X(a)}%;--k:${attr(t.color || "#7A7F85")}" title="${attr(t.name + " · " + fmtDate(t.start) + " – " + fmtDate(e0))}"><i>${esc(t.name)}</i></span>`; }).join("") : "";
    const ev = r.items.map(s => { const cls = (s.isMatch ? " wed" : "") + (s.status === "afgelast" ? " off" : "") + (!s.coach_ids.length && s.status !== "afgelast" ? " nocoach" : "") + (conf.has(s.key) ? " conf" : "") + (s.override && s.status !== "afgelast" ? " chg" : ""); return `<span class="tlev${cls}" data-key="${attr(s.key)}" style="left:${X(s.date)}%;width:${W}%;--k:${attr(s.color)}" title="${attr(DAGEN[weekday(s.date)] + " " + fmtDate(s.date) + " " + s.van + "–" + s.tot + " · " + s.label + (s.coaches.length ? " · " + s.coaches.map(c => c.name.split(" ")[0]).join(", ") : " · geen coach") + (s.status === "afgelast" ? " · afgelast" : ""))}">${mid ? "" : `<i>${DAGEN[weekday(s.date)][0]}</i>`}</span>`; }).join("");
    const n = r.items.filter(s => s.status !== "afgelast").length;
    return `<div class="tlr"><div class="tll ${r.group ? "clk" : ""}" ${r.group ? `data-gogroup="${attr(r.id)}"` : ""}><b class="ell">${esc(r.label)}</b><small class="ell">${esc(r.sub)}${r.sub && n ? " · " : ""}${n ? n + "×" : ""}</small></div><div class="tllane" data-f="${r.f}" data-v="${attr(r.id)}">${brkHtml}${themes}${bars}${ev}${nowHtml}</div></div>`;
  }).join("");
  body.innerHTML = `<div class="calgrid tlwrap"><div class="tlg ${dense ? "dense" : mid ? "mid" : "wide"}"><div class="tlr tlhead"><div class="tll"><span class="cap">${esc((store.rows("seasons").find(x => x.start <= st.date && x.end >= st.date) || {}).name || "")}</span></div><div class="tllane tlmonths">${months}</div></div><div class="tlr tlhead2"><div class="tll"></div><div class="tllane tlweeks">${brkHtml}${weeks}${nowHtml}</div></div>${html || `<div class="empty">Niets gepland in deze periode.</div>`}</div></div>
  <div class="legend" style="margin-top:10px"><span class="chip"><i class="tlc-sample" style="opacity:.25"></i>looptijd rooster</span><span class="chip"><i class="tlc-sample" style="height:4px;border-radius:2px"></i>periodethema</span><span class="chip"><i class="tlc-sample"></i>training</span><span class="chip"><i class="tlc-sample wed"></i>wedstrijd</span><span class="chip"><i class="tlc-sample nocoach"></i>zonder coach</span><span class="chip"><i class="tlc-sample off"></i>afgelast</span><span class="chip"><i class="tlc-sample brk"></i>vakantie</span><span class="hint" style="margin:0 0 auto auto">Tik op een training voor details, op een weeknummer voor die week, op een groepsnaam voor de groep.</span></div>`;
  // klik op lege plek in een rij → week openen
  body.querySelectorAll(".tllane[data-f]").forEach(l => l.addEventListener("click", e => { if (e.target.closest(".tlev")) return; const r = l.getBoundingClientRect(); const d = addDays(from, Math.floor((e.clientX - r.left) / r.width * days)); st.date = d; st.mode = "week"; st.filter = { [l.dataset.f]: l.dataset.v }; persist(); render($("#main")); }));
}

/* ---------- Team: coachweek ---------- */
function renderTeam(body) {
  const ws = weekStart(st.date); const we = addDays(ws, 6); const today = todayISO();
  const list = sessionsIn(ws, we, st.filter); stats(list);
  const conf = conflictKeys(ws, we);
  const days = []; for (let i = 0; i < 7; i++) days.push(addDays(ws, i));
  const breaks = store.rows("breaks");
  const pill = s => `<span class="tpill ${s.isMatch ? "wed" : ""} ${s.status === "afgelast" ? "off" : ""} ${conf.has(s.key) ? "conf" : ""}" data-key="${attr(s.key)}" style="--k:${attr(s.color)};--bg:${tint(s.color, .16)}" title="${attr(s.label + " " + s.van + "–" + s.tot)}"><b>${s.van}</b> ${esc(s.group ? shortName(s.group.name) : s.label)}</span>`;
  const rows = coachesActive().map(c => {
    const mine = list.filter(s => s.coach_ids.includes(c.id)); const h = hoursOf(mine);
    const cap = [0, 1, 2, 3, 4, 5, 6].reduce((a, w) => { const av = (c.availability || {})[w]; return a + (av ? (timeToMin(av[1]) - timeToMin(av[0])) / 60 : 0); }, 0);
    const maxH = Math.min(cap, 24) || 1;
    return `<div class="twl"><span class="avatar sm" style="background:${attr(c.color)}">${esc(c.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span><span class="grow" style="min-width:0"><b class="ell">${esc(c.name)}</b><span class="hrs">${String(h).replace(".", ",")} u<i><b class="${h > maxH ? "hi" : ""}" style="width:${Math.min(100, h / maxH * 100)}%"></b></i></span></span></div>${days.map(d => { const av = (c.availability || {})[weekday(d)]; return `<div class="twc ${d === today ? "cur" : ""} ${av ? "" : "na"}" data-hslotday="${d}" data-coach="${attr(c.id)}">${mine.filter(s => s.date === d).map(pill).join("")}</div>`; }).join("")}`;
  }).join("");
  const open = list.filter(s => !s.coach_ids.length && s.status !== "afgelast");
  const openRow = open.length ? `<div class="twl bad"><span class="avatar sm" style="background:var(--bad)">?</span><span class="grow"><b>Zonder coach</b><small style="display:block;font-size:10.5px;color:var(--muted)">vervanger nodig</small></span></div>${days.map(d => `<div class="twc ${d === today ? "cur" : ""}">${open.filter(s => s.date === d).map(s => `<span class="tpill open" data-key="${attr(s.key)}"><b>${s.van}</b> ${esc(s.group ? shortName(s.group.name) : s.label)}</span>`).join("")}</div>`).join("")}` : "";
  const tot = `<div class="twt">per dag</div>${days.map(d => { const l = list.filter(s => s.date === d); return `<div class="twt"><b>${String(hoursOf(l)).replace(".", ",")}</b> u</div>`; }).join("")}`;
  body.innerHTML = `<div class="calgrid"><div class="tw"><div class="twh"></div>${days.map(d => { const brk = inBreak(d, breaks); return `<div class="twh ${d === today ? "cur" : ""}">${DAGEN[weekday(d)]}<b>${fromISO(d).getDate()}</b>${brk ? `<i>${esc(brk.name)}</i>` : ""}</div>`; }).join("")}${openRow}${rows}${tot}</div></div>
  <div class="legend" style="margin-top:10px"><span class="chip">balk = uren t.o.v. beschikbaarheid</span><span class="chip"><i class="tlc-sample" style="background:#FBE8E8;outline:1.5px solid var(--bad)"></i>open plek</span><span class="chip"><i class="tlc-sample" style="background:#FAFAFB;border:1px solid var(--line)"></i>niet beschikbaar</span><span class="hint" style="margin:0 0 auto auto">Tik op een lege cel om die coach op die dag in te plannen.</span></div>`;
  body.querySelectorAll("[data-hslotday]").forEach(c => c.addEventListener("click", e => { if (e.target.closest(".tpill")) return; openRuleForm({ date: c.dataset.hslotday, coach_id: c.dataset.coach }); }));
}
