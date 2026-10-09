// Herhalingsengine: roosterregels → sessies (voorkomens) binnen een periode.
// Een sessie is virtueel: regel + oorspronkelijke datum. Afwijkingen per voorkomen staan in overrides.
import { addDays, weekday, daysBetween, fromISO, toISO, cmp } from "./dates.js";

export const FREQ = [
  ["once", "Eenmalig"],
  ["weekly", "Wekelijks"],
  ["biweekly", "Om de week"],
  ["monthly_nth", "Maandelijks (n-de weekdag)"],
  ["custom", "Losse datums"],
];

export function sessionKey(ruleId, date) { return ruleId + "_" + date; }
export function splitKey(key) { const i = key.lastIndexOf("_"); return { ruleId: key.slice(0, i), date: key.slice(i + 1) }; }

/** Ligt datum in een vakantie/sluitingsperiode? */
export function inBreak(date, breaks) {
  return (breaks || []).find(b => date >= b.start && date <= b.end) || null;
}

/** Geeft true als de regel op deze (oorspronkelijke) datum een voorkomen heeft. */
export function ruleMatches(rule, date) {
  if (date < rule.start) return false;
  if (rule.end && date > rule.end) return false;
  const wd = weekday(date);
  switch (rule.freq) {
    case "once": return date === rule.start;
    case "custom": return (rule.dates || []).includes(date);
    case "weekly":
    case "biweekly": {
      if (!(rule.weekdays || []).includes(wd)) return false;
      const iv = rule.freq === "biweekly" ? 2 : (rule.interval || 1);
      if (iv <= 1) return true;
      // weken tellen vanaf de maandag van de startweek
      const ws = addDays(rule.start, -((weekday(rule.start) + 6) % 7));
      const wk = Math.floor(daysBetween(ws, date) / 7);
      return wk % iv === 0;
    }
    case "monthly_nth": {
      const n = rule.nth || {};
      if (wd !== n.weekday) return false;
      const d = fromISO(date);
      if (n.week === -1) { const nx = new Date(d); nx.setDate(nx.getDate() + 7); return nx.getMonth() !== d.getMonth(); }
      return Math.floor((d.getDate() - 1) / 7) + 1 === n.week;
    }
    default: return false;
  }
}

/**
 * Alle sessies in [from, to] (inclusief), met overrides toegepast.
 * @param rules roosterregels
 * @param overrides afwijkingen {rule_id,date,status,new_date,van,tot,location_id,coach_ids,note,reason}
 * @param breaks vakantieperiodes {start,end,name}
 */
export function expand(rules, overrides, breaks, from, to) {
  const ovMap = {};
  (overrides || []).forEach(o => { ovMap[sessionKey(o.rule_id, o.date)] = o; });
  const out = [];
  const seen = new Set();

  function push(rule, origDate, ov) {
    const key = sessionKey(rule.id, origDate);
    if (seen.has(key)) return;
    seen.add(key);
    const date = ov && ov.status === "moved" && ov.new_date ? ov.new_date : origDate;
    if (date < from || date > to) return;
    const brk = rule.skip_breaks !== false ? inBreak(origDate, breaks) : null;
    if (brk && !ov) return; // vervalt in vakantie, tenzij expliciet overschreven
    const s = {
      key, rule_id: rule.id, orig_date: origDate, date,
      kind: rule.kind, group_id: rule.group_id || null, type_id: rule.type_id, title: rule.title || "",
      van: rule.van, tot: rule.tot, location_id: rule.location_id || null,
      coach_ids: (rule.coach_ids || []).slice(), note: rule.note || "",
      status: "gepland", override: !!ov, reason: "", count_limited: false,
    };
    if (ov) {
      if (ov.status === "cancelled") s.status = "afgelast";
      else if (ov.status === "moved") s.status = "verplaatst";
      if (ov.van) s.van = ov.van; if (ov.tot) s.tot = ov.tot;
      if (ov.location_id) s.location_id = ov.location_id;
      if (ov.coach_ids) s.coach_ids = ov.coach_ids.slice();
      if (ov.note != null) s.note = ov.note;
      s.reason = ov.reason || "";
    }
    out.push(s);
  }

  // ruim venster voor verplaatste sessies: kijk 60 dagen voor/na
  const scanFrom = addDays(from, -60), scanTo = addDays(to, 60);
  for (const rule of rules || []) {
    if (!rule || rule.archived) continue;
    if (rule.freq === "once") { if (rule.start >= scanFrom && rule.start <= scanTo) push(rule, rule.start, ovMap[sessionKey(rule.id, rule.start)]); continue; }
    if (rule.freq === "custom") { (rule.dates || []).forEach(d => { if (d >= scanFrom && d <= scanTo) push(rule, d, ovMap[sessionKey(rule.id, d)]); }); continue; }
    let d = rule.start > scanFrom ? rule.start : scanFrom;
    const stop = rule.end && rule.end < scanTo ? rule.end : scanTo;
    let n = 0;
    // bij een aantal-begrenzing moeten we vanaf start tellen
    if (rule.count) { d = rule.start; }
    for (; d <= stop; d = addDays(d, 1)) {
      if (!ruleMatches(rule, d)) continue;
      if (rule.skip_breaks !== false && inBreak(d, breaks) && !ovMap[sessionKey(rule.id, d)]) continue;
      n++;
      if (rule.count && n > rule.count) break;
      push(rule, d, ovMap[sessionKey(rule.id, d)]);
    }
  }
  out.sort((a, b) => cmp(a.date, b.date) || cmp(a.van, b.van) || cmp(a.title, b.title));
  return out;
}

/** Korte omschrijving van de herhaling in het Nederlands. */
export function describe(rule, DAGEN) {
  const wds = (rule.weekdays || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(w => DAGEN[w]).join(", ");
  switch (rule.freq) {
    case "once": return "Eenmalig";
    case "weekly": return (rule.interval > 1 ? "Elke " + rule.interval + " weken" : "Wekelijks") + (wds ? " op " + wds : "");
    case "biweekly": return "Om de week" + (wds ? " op " + wds : "");
    case "monthly_nth": { const n = rule.nth || {}; const w = n.week === -1 ? "laatste" : n.week + "e"; return "Elke " + w + " " + DAGEN[n.weekday] + " van de maand"; }
    case "custom": return (rule.dates || []).length + " losse datums";
    default: return "";
  }
}

/** Conflicten binnen een lijst sessies: dezelfde coach of locatie, overlappend in tijd op dezelfde dag. */
export function findConflicts(sessions, locations) {
  const byDate = {};
  sessions.filter(s => s.status !== "afgelast").forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
  const locMap = {}; (locations || []).forEach(l => { locMap[l.id] = l; });
  const conflicts = [];
  const tm = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  Object.values(byDate).forEach(list => {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (!(tm(a.van) < tm(b.tot) && tm(b.van) < tm(a.tot))) continue;
      const coaches = a.coach_ids.filter(c => b.coach_ids.includes(c));
      coaches.forEach(c => conflicts.push({ type: "coach", id: c, a, b }));
      if (a.location_id && a.location_id === b.location_id) {
        const loc = locMap[a.location_id];
        if (!loc || !loc.shared) conflicts.push({ type: "location", id: a.location_id, a, b });
      }
    }
  });
  return conflicts;
}
