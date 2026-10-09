// ICS-export (agendabestand) voor een coach of groep.
import { sessionsIn } from "./model.js";
import { addDays, todayISO } from "./dates.js";
const esc = s => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const dt = (date, time) => date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";
export function buildIcs(filter, name, months = 6) {
  const from = addDays(todayISO(), -14), to = addDays(todayISO(), months * 30);
  const list = sessionsIn(from, to, filter).filter(s => s.status !== "afgelast");
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev = list.map(s => ["BEGIN:VEVENT", "UID:" + s.key + "@trainingsplanner", "DTSTAMP:" + now, "DTSTART;TZID=Europe/Amsterdam:" + dt(s.date, s.van), "DTEND;TZID=Europe/Amsterdam:" + dt(s.date, s.tot),
    "SUMMARY:" + esc((s.isMatch ? "🏆 " : "") + s.label), "LOCATION:" + esc(s.location ? s.location.name : ""), "DESCRIPTION:" + esc([s.coaches.length ? "Coach: " + s.coaches.map(c => c.name).join(", ") : "Geen coach", s.note, s.reason].filter(Boolean).join("\n")), "END:VEVENT"].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Trainingsplanner//NL", "CALSCALE:GREGORIAN", "X-WR-CALNAME:" + esc(name), "BEGIN:VTIMEZONE", "TZID:Europe/Amsterdam", "BEGIN:STANDARD", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "END:STANDARD", "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "END:DAYLIGHT", "END:VTIMEZONE"].concat(ev, ["END:VCALENDAR"]).join("\r\n");
}
