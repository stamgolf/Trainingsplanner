// Datumhulpjes — alle datums als ISO-string "YYYY-MM-DD", tijden als "HH:MM".
export const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
export const DAGEN_LANG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
export const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
export const MAANDEN_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function pad(n) { return (n < 10 ? "0" : "") + n; }
export function toISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
export function fromISO(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
export function todayISO() { return toISO(new Date()); }
export function addDays(iso, n) { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
export function addMonths(iso, n) { const d = fromISO(iso); d.setDate(1); d.setMonth(d.getMonth() + n); return toISO(d); }
export function weekday(iso) { return fromISO(iso).getDay(); } // 0=zo
/** Maandag van de week waarin iso valt. */
export function weekStart(iso) { const wd = (weekday(iso) + 6) % 7; return addDays(iso, -wd); }
export function monthStart(iso) { return iso.slice(0, 8) + "01"; }
export function daysBetween(a, b) { return Math.round((fromISO(b) - fromISO(a)) / 86400000); }
export function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

/** ISO-weeknummer. */
export function isoWeek(iso) {
  const d = fromISO(iso); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

export function fmtDate(iso, opts = {}) {
  if (!iso) return "";
  const d = fromISO(iso);
  const s = d.getDate() + " " + (opts.long ? MAANDEN[d.getMonth()] : MAANDEN_KORT[d.getMonth()]);
  return (opts.weekday ? DAGEN[d.getDay()] + " " : "") + s + (opts.year ? " " + d.getFullYear() : "");
}
export function fmtDateLong(iso) { const d = fromISO(iso); return DAGEN_LANG[d.getDay()] + " " + d.getDate() + " " + MAANDEN[d.getMonth()] + " " + d.getFullYear(); }
export function fmtRange(a, b) { return fmtDate(a) + (b && b !== a ? " – " + fmtDate(b) : ""); }

export function timeToMin(t) { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); }
export function minToTime(m) { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
export function addMin(t, n) { return minToTime(timeToMin(t) + n); }
export function durMin(van, tot) { return timeToMin(tot) - timeToMin(van); }
export function nowTime() { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
export function fmtDur(n) { if (!n) return ""; const h = Math.floor(n / 60), m = n % 60; return h ? (h + (m ? ":" + pad(m) : "") + " u") : m + " min"; }

/** Overlap van twee tijdvakken op dezelfde dag. */
export function overlaps(a1, a2, b1, b2) { return timeToMin(a1) < timeToMin(b2) && timeToMin(b1) < timeToMin(a2); }
