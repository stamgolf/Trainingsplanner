// Meldingen en vervangingsverzoeken.
import { store, coachById } from "../store/index.js";
import { timeToMin, weekday, DAGEN } from "./dates.js";
import { sessionsIn } from "./model.js";

/** Stuur een melding naar één of meer coaches. link = sessiesleutel of route. */
export async function notify(coachIds, type, text, link) {
  const ids = Array.from(new Set((Array.isArray(coachIds) ? coachIds : [coachIds]).filter(Boolean)));
  for (const id of ids) {
    if (store.me && id === store.me.id && type !== "self") continue; // jezelf niet melden
    await store.save("notifications", { coach_id: id, type, text, link: link || null, read: false, created_at: new Date().toISOString() });
  }
}
export function myNotifications() { return store.rows("notifications").filter(n => store.me && n.coach_id === store.me.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); }
export function unreadCount() { return myNotifications().filter(n => !n.read).length; }
export async function markRead(id) { const n = store.byId("notifications", id); if (n && !n.read) await store.save("notifications", { ...n, read: true }); }
export async function markAllRead() { for (const n of myNotifications().filter(x => !x.read)) await store.save("notifications", { ...n, read: true }); }

/** Open verzoeken (afmelding / ruil) */
export function openRequests() { return store.rows("requests").filter(r => r.status === "open"); }
export function requestFor(key) { return store.rows("requests").find(r => r.session_key === key && r.status === "open") || null; }

/** Beschikbare vervangers voor een sessie: actieve coaches, binnen beschikbaarheid, zonder overlap, niet al ingepland. */
export function candidates(s) {
  const wd = weekday(s.date); const day = sessionsIn(s.date, s.date).filter(x => x.key !== s.key && x.status !== "afgelast");
  return store.rows("coaches").filter(c => c.active !== false && c.is_coach && !s.coach_ids.includes(c.id)).map(c => {
    const av = (c.availability || {})[wd];
    const within = !!av && timeToMin(av[0]) <= timeToMin(s.van) && timeToMin(av[1]) >= timeToMin(s.tot);
    const clash = day.filter(x => x.coach_ids.includes(c.id) && timeToMin(x.van) < timeToMin(s.tot) && timeToMin(s.van) < timeToMin(x.tot));
    const spec = (c.specialisaties || []).some(sp => (s.group ? (s.group.name + " " + (s.gtype ? s.gtype.name : "")) : s.label).toLowerCase().includes(String(sp).toLowerCase()));
    const score = (within ? 2 : av ? 0 : -1) + (clash.length ? -5 : 0) + (spec ? 1 : 0) + ((s.group && (s.group.coach_ids || []).includes(c.id)) ? 2 : 0);
    return { c, within, av, clash, spec, score };
  }).sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));
}
