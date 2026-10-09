// Generator: stelt een conceptlesvoorbereiding samen voor een sessie op basis van groep, niveau, leeftijd,
// periodethema, duur, locatie, eerder gebruikte drills en de notitie "voor volgende keer" uit het vorige log.
import { store, membersOf } from "../store/index.js";
import { addDays } from "./dates.js";

export const PHASES = [["warmup", "Warming-up", 0.15], ["techniek", "Techniek", 0.35], ["spelvorm", "Spelvorm / skill", 0.35], ["afsluiting", "Afsluiting", 0.15]];
export const phaseLabel = k => (PHASES.find(p => p[0] === k) || [k, k])[1];

/** Thema dat op deze datum geldt voor de groep (op volgorde van start). */
export function themeFor(groupId, date) {
  const ts = store.rows("group_themes").filter(t => t.group_id === groupId && t.start <= date).sort((a, b) => a.start < b.start ? 1 : -1);
  const t = ts[0]; if (!t) return null;
  const end = addDays(t.start, (t.weeks || 4) * 7 - 1);
  return date <= end ? t : null;
}
export function themesOf(groupId) { return store.rows("group_themes").filter(t => t.group_id === groupId).sort((a, b) => a.start < b.start ? -1 : 1); }

/** Hoe vaak elke drill recent in deze groep is gebruikt (laatste 90 dagen) en in totaal. */
export function usageFor(groupId, before) {
  const recent = {}, total = {};
  store.rows("lesson_plans").forEach(p => { (p.blocks || []).forEach(b => { if (!b.drill_id) return; total[b.drill_id] = (total[b.drill_id] || 0) + 1; if (p.group_id === groupId && p.date < before && p.date >= addDays(before, -90)) recent[b.drill_id] = (recent[b.drill_id] || 0) + 1; }); });
  return { recent, total };
}

function levelIdx(l) { return ["Kennismaking", "Golfstart", "Baanpermissie", "hcp 54-36", "hcp 36-18", "hcp 18-9", "Competitie recreatief", "Competitie competitief", "Selectie"].indexOf(l); }
function ageBand(age) { // "10-12" → ["U12","U14"]; "13-17" → ["U14","U16","U18"]
  if (!age) return []; const m = String(age).match(/(\d+)\s*-\s*(\d+)/); if (!m) return [];
  const lo = +m[1], hi = +m[2]; const out = []; for (const u of [4, 6, 8, 10, 12, 14, 16, 18]) { if (u > lo && u <= hi + 1) out.push("U" + u); } if (hi >= 18) out.push("Volwassenen"); return out;
}

/** Score van een drill voor deze sessie/fase. Hoger = beter. */
export function score(d, ctx, phase) {
  let s = 0;
  const focus = ctx.focus || [];
  const inFocus = focus.length ? (focus.includes(d.main_cat) || (d.sub_cats || []).some(c => focus.includes(c))) : false;
  if (phase === "warmup") { if (d.main_cat === "fysiek" || (d.sub_cats || []).includes("warmup")) s += 4; else if (inFocus && d.training_type === "techniek") s += 2; else s -= 1; }
  else if (phase === "techniek") { if (inFocus) s += 4; if (d.training_type === "techniek") s += 3; else if (d.training_type === "skill") s += 1; if (d.main_cat === "fysiek" || d.main_cat === "prestatiegedrag") s -= 3; }
  else if (phase === "spelvorm") { if (inFocus) s += 4; if (d.training_type === "skill") s += 3; if (d.training_type === "performance") s += 2; if (d.workform && /spel|wedstrijd|tweetal|station/i.test(d.workform)) s += 1; if (d.main_cat === "fysiek") s -= 3; }
  else { if (d.main_cat === "spelen" || (d.sub_cats || []).includes("putten") || d.training_type === "performance") s += 3; if (d.main_cat === "prestatiegedrag") s += 2; if (d.main_cat === "fysiek") s -= 2; if (inFocus) s += 1; }
  // niveau
  if (ctx.level && (d.levels || []).length) { if (d.levels.includes(ctx.level)) s += 2; else { const li = levelIdx(ctx.level); const near = d.levels.some(l => Math.abs(levelIdx(l) - li) === 1); s += near ? 0 : -3; } }
  // leeftijd
  if (ctx.ages.length && (d.age_cats || []).length) { s += d.age_cats.some(a => ctx.ages.includes(a)) ? 1 : -2; }
  // locatie
  if (ctx.locationName && (d.location || []).length) { s += d.location.includes(ctx.locationName) ? 1 : -1; }
  // groepsgrootte
  if (ctx.n && d.grp_max && +d.grp_max < ctx.n) s -= 2;
  if (d.audience === "ind" && ctx.n > 2) s -= 1;
  // herhaling vermijden
  s -= (ctx.usage.recent[d.id] || 0) * 2.5;
  s -= Math.min(1, (ctx.usage.total[d.id] || 0) * 0.1);
  // favoriet van de coach
  if (ctx.coachId && (d.fav_ids || []).includes(ctx.coachId)) s += 0.5;
  return s;
}

function rnd(seed) { let x = seed % 2147483647 || 1; return () => (x = x * 16807 % 2147483647) / 2147483647; }

/** Genereert blokken voor een sessie. s = verrijkte sessie, opts = {exclude:[], seed}. */
export function generate(s, opts = {}) {
  const g = s.group; const theme = g ? themeFor(g.id, s.date) : null;
  const ctx = {
    focus: theme ? (theme.focus_cats || []) : [], level: g ? g.level : "", ages: g ? ageBand(g.age) : [], locationName: s.location ? s.location.name : "",
    n: g ? membersOf(g.id).length : 0, usage: usageFor(g ? g.id : null, s.date), coachId: s.coach_ids[0] || null,
  };
  const pool = store.rows("drills").filter(d => d.status !== "concept" && !(opts.exclude || []).includes(d.id));
  const random = rnd(opts.seed || (s.key.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + (opts.round || 0) * 97));
  const total = s.minutes || 60; const used = new Set();
  const blocks = PHASES.map(([k, label, share]) => {
    const minutes = Math.max(5, Math.round(total * share / 5) * 5);
    const ranked = pool.filter(d => !used.has(d.id)).map(d => ({ d, v: score(d, ctx, k) + random() * 1.5 })).sort((a, b) => b.v - a.v);
    const pick = ranked[0] ? ranked[0].d : null; if (pick) used.add(pick.id);
    return { id: "b_" + k + "_" + Math.random().toString(36).slice(2, 7), phase: k, drill_id: pick ? pick.id : null, title: pick ? "" : label, minutes, note: "" };
  });
  // minuten laten optellen tot de totale duur
  const sum = blocks.reduce((a, b) => a + b.minutes, 0); blocks[2].minutes += total - sum;
  const prevLog = store.rows("logs").filter(l => g && store.rows("lesson_plans").some(p => p.session_key === l.session_key && p.group_id === g.id) || (g && (store.byId("schedule_rules", l.rule_id) || {}).group_id === g.id)).filter(l => l.date < s.date).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  const thema = theme ? theme.name : (ctx.focus.length ? ctx.focus.join(", ") : "Algemeen");
  const lesdoel = theme && theme.goal ? theme.goal : (pick => pick ? firstSentence(pick.goal) : "")(blocks[1].drill_id ? store.byId("drills", blocks[1].drill_id) : null);
  return { thema, lesdoel, notitie: prevLog && prevLog.next_time ? "Vorige keer: " + prevLog.next_time : "", blocks, theme_id: theme ? theme.id : null };
}
export function firstSentence(t, max = 140) { const z = String(t || "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0]; return z.length > max ? z.slice(0, max - 1) + "…" : z; }

/** Alternatieve drill voor een blok ("andere drill, zelfde doel"). */
export function alternative(s, plan, block, direction) {
  const g = s.group; const theme = g ? themeFor(g.id, s.date) : null;
  const ctx = { focus: theme ? (theme.focus_cats || []) : [], level: g ? g.level : "", ages: g ? ageBand(g.age) : [], locationName: s.location ? s.location.name : "", n: g ? membersOf(g.id).length : 0, usage: usageFor(g ? g.id : null, s.date), coachId: s.coach_ids[0] || null };
  const cur = block.drill_id ? store.byId("drills", block.drill_id) : null;
  const inPlan = new Set((plan.blocks || []).map(b => b.drill_id).filter(Boolean));
  let pool = store.rows("drills").filter(d => d.status !== "concept" && !inPlan.has(d.id));
  if (cur) { // zelfde categorie, zo mogelijk zelfde subcategorie
    const same = pool.filter(d => d.main_cat === cur.main_cat && (d.sub_cats || []).some(c => (cur.sub_cats || []).includes(c)));
    if (same.length) pool = same;
    if (direction === "easier") { const li = levelIdx(ctx.level); pool = pool.filter(d => !(d.levels || []).length || d.levels.some(l => levelIdx(l) <= li)); pool.sort((a, b) => (a.training_type === "techniek" ? -1 : 1) - (b.training_type === "techniek" ? -1 : 1)); }
    if (direction === "harder") { const li = levelIdx(ctx.level); pool = pool.filter(d => !(d.levels || []).length || d.levels.some(l => levelIdx(l) >= li)); pool.sort((a, b) => (a.training_type === "performance" ? -1 : 1) - (b.training_type === "performance" ? -1 : 1)); }
  }
  const random = rnd(Date.now());
  const ranked = pool.map(d => ({ d, v: score(d, ctx, block.phase) + random() * 2 })).sort((a, b) => b.v - a.v);
  return ranked[0] ? ranked[0].d : null;
}

/** Materiaallijst uit de drills van een plan. */
export function materialOf(plan) { const set = new Set(); (plan.blocks || []).forEach(b => { const d = b.drill_id ? store.byId("drills", b.drill_id) : null; (d && d.material || []).forEach(m => set.add(m)); }); return Array.from(set); }
export function planFor(key) { return store.rows("lesson_plans").find(p => p.session_key === key) || null; }
