// Afgeleide gegevens: sessies uit roosterregels, verrijkt met groep/coach/locatie.
import { store, coachById, groupById, locById, groupTypeById, actTypeById, breaksAll } from "../store/index.js";
import { expand, findConflicts } from "./recur.js";
import { durMin } from "./dates.js";

export function enrich(s) {
  s.group = s.group_id ? groupById(s.group_id) : null;
  s.gtype = s.group ? groupTypeById(s.group.type_id) : null;
  s.atype = actTypeById(s.type_id);
  s.coaches = (s.coach_ids || []).map(coachById).filter(Boolean);
  s.location = s.location_id ? locById(s.location_id) : null;
  s.label = s.group ? s.group.name + (s.title ? " · " + s.title : "") : (s.title || (s.atype ? s.atype.name : "Activiteit"));
  s.color = s.type_id === "at_wedstrijd" ? "#F47C20" : (s.gtype ? s.gtype.color : (s.atype ? s.atype.color : "#7A7F85"));
  s.isMatch = s.type_id === "at_wedstrijd";
  s.minutes = durMin(s.van, s.tot);
  s.log = store.rows("logs").find(l => l.session_key === s.key) || null;
  return s;
}

/** Sessies in [from,to], optioneel gefilterd. filter: {coach_id, group_id, type_id, location_id, gtype_id, kind} */
export function sessionsIn(from, to, filter = {}) {
  let list = expand(store.rows("schedule_rules"), store.rows("overrides"), breaksAll(), from, to).map(enrich);
  if (filter.coach_id) list = list.filter(s => s.coach_ids.includes(filter.coach_id));
  if (filter.group_id) list = list.filter(s => s.group_id === filter.group_id);
  if (filter.type_id) list = list.filter(s => s.type_id === filter.type_id);
  if (filter.location_id) list = list.filter(s => s.location_id === filter.location_id);
  if (filter.gtype_id) list = list.filter(s => s.group && s.group.type_id === filter.gtype_id);
  if (filter.kind) list = list.filter(s => s.kind === filter.kind);
  if (filter.q) { const q = filter.q.toLowerCase(); list = list.filter(s => s.label.toLowerCase().includes(q)); }
  return list;
}
export function sessionByKey(key) {
  const i = key.lastIndexOf("_"); const ruleId = key.slice(0, i), date = key.slice(i + 1);
  const rule = store.byId("schedule_rules", ruleId); if (!rule) return null;
  // zoek in ruim venster (verplaatsing mogelijk)
  const all = expand([rule], store.rows("overrides").filter(o => o.rule_id === ruleId), breaksAll(), date.slice(0, 4) + "-01-01", String(+date.slice(0, 4) + 1) + "-12-31");
  const s = all.find(x => x.key === key); return s ? enrich(s) : null;
}
export function conflictsIn(from, to) { return findConflicts(sessionsIn(from, to), store.rows("locations")); }
export function conflictKeys(from, to) { const set = new Set(); conflictsIn(from, to).forEach(c => { set.add(c.a.key); set.add(c.b.key); }); return set; }

export function groupsSorted() { const gt = {}; store.rows("group_types").forEach(t => gt[t.id] = t.order || 99); return store.rows("groups").filter(g => g.active !== false).slice().sort((a, b) => (gt[a.type_id] - gt[b.type_id]) || a.name.localeCompare(b.name)); }
export function rulesForGroup(gid) { return store.rows("schedule_rules").filter(r => r.group_id === gid && !r.archived); }
export function coachesActive() { return store.rows("coaches").filter(c => c.active !== false).slice().sort((a, b) => a.name.localeCompare(b.name)); }
export function locationsSorted() { return store.rows("locations").slice().sort((a, b) => (a.order || 99) - (b.order || 99)); }
export function hoursOf(list) { return Math.round(list.filter(s => s.status !== "afgelast").reduce((a, s) => a + s.minutes, 0) / 6) / 10; }
