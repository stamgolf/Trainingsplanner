// Vandaag: persoonlijk overzicht van de ingelogde coach (+ coördinatorsignalen).
import { store, isCoordinator, coachById, groupById } from "../store/index.js";
import { $, $$, esc, attr, kpi, avatar, avatars, tile, toast, ICON } from "../lib/ui.js";
import { todayISO, addDays, weekStart, fmtDate, fmtDateLong, DAGEN_LANG, nowTime, fmtDur, isoWeek } from "../lib/dates.js";
import { sessionsIn, conflictsIn, hoursOf, coachesActive } from "../lib/model.js";
import { openSession, openActionForm } from "./session.js";
import { openRuleForm } from "./ruleform.js";
import { planFor } from "../lib/generator.js";
import { openRequests } from "../lib/notify.js";

let scope = "mij"; // mij | team

export function render(main) {
  const me = store.me; const today = todayISO(); const ws = weekStart(today); const we = addDays(ws, 6);
  const coord = isCoordinator();
  const filter = scope === "mij" || !coord ? { coach_id: me.id } : {};
  const todayList = sessionsIn(today, today, filter);
  const weekList = sessionsIn(ws, we, filter);
  const upcoming = sessionsIn(addDays(today, 1), addDays(today, 14), filter);
  const actions = store.rows("action_items").filter(a => a.coach_id === me.id && !a.done).sort((a, b) => (a.date || "9") < (b.date || "9") ? -1 : 1);
  const doneActions = store.rows("action_items").filter(a => a.coach_id === me.id && a.done).length;
  const h = h => { const d = new Date(); d.setDate(d.getDate() + h); return d; };

  // coördinatorsignalen (komende 14 dagen, hele team)
  const horizon = addDays(today, 14);
  const teamAll = sessionsIn(today, horizon);
  const noCoach = teamAll.filter(s => s.status !== "afgelast" && !s.coach_ids.length);
  const conflicts = conflictsIn(today, horizon);
  const cancelled = teamAll.filter(s => s.status === "afgelast");
  const unlogged = sessionsIn(addDays(today, -14), addDays(today, -1), filter).filter(s => s.status !== "afgelast" && !s.log);
  const reqs = openRequests();
  const noPlan = sessionsIn(today, addDays(today, 7), filter).filter(s => s.status !== "afgelast" && s.group_id && !planFor(s.key));

  const greeting = (() => { const hr = new Date().getHours(); return hr < 12 ? "Goedemorgen" : hr < 18 ? "Goedemiddag" : "Goedenavond"; })();

  main.innerHTML = `
  <div class="spkop">
    <h1>${greeting}, ${esc(me.name.split(" ")[0])}</h1>
    ${coord ? `<div class="seg" id="tdScope"><button data-v="mij" class="${scope === "mij" ? "on" : ""}">Mijn programma</button><button data-v="team" class="${scope === "team" ? "on" : ""}">Hele team</button></div>` : ""}
    ${kpi([[todayList.filter(s => s.status !== "afgelast").length, "vandaag"], [weekList.filter(s => s.status !== "afgelast").length, "deze week"], [hoursOf(weekList), "uur"], [actions.length, "acties", actions.some(a => a.date && a.date < today) ? "bad" : ""]])}
    <div class="right"><button class="plusbtn" id="tdAdd" title="Activiteit toevoegen">+</button></div>
  </div>
  <div class="grid two">
    <div class="card fixed">
      <div class="chead"><h2>Vandaag</h2><span class="cvn">${todayList.length}</span><span class="hdnote">${fmtDateLong(today)} · week ${isoWeek(today)}</span></div>
      <div class="cbody">${todayList.length ? todayList.map(sessionRow).join("") : '<div class="empty">Geen trainingen of activiteiten vandaag.</div>'}</div>
    </div>
    <div class="card fixed">
      <div class="chead"><h2>Komende 14 dagen</h2><span class="cvn">${upcoming.length}</span><span class="hdnote"><a href="#/kalender" class="chip link small">Kalender ›</a></span></div>
      <div class="cbody">${upcoming.length ? groupByDay(upcoming) : '<div class="empty">Niets gepland.</div>'}</div>
    </div>
    <div class="card fixed">
      <div class="chead"><h2>Actiepunten</h2><span class="cvn ${actions.some(a => a.date && a.date < today) ? "bad" : ""}">${actions.length}</span><span class="hdnote">${doneActions ? doneActions + " afgerond" : ""} <button class="xbtn sm" id="tdAddAct" title="Actiepunt toevoegen">${ICON.plus}</button></span></div>
      <div class="cbody">${actions.length ? actions.map(a => `<div class="rij clk" data-act="${attr(a.id)}"><button class="xbtn sm" data-done="${attr(a.id)}" title="Afronden">${ICON.check}</button><span class="grow"><div class="tt" style="font-weight:500">${esc(a.text)}</div><div class="sub">${a.date ? (a.date < today ? '<span class="st bad">te laat</span> ' : a.date === today ? '<span class="st att">vandaag</span> ' : "") + fmtDate(a.date, { weekday: true }) : ""}${a.link_group_id && groupById(a.link_group_id) ? " · " + esc(groupById(a.link_group_id).name) : ""}</div></span></div>`).join("") : '<div class="empty">Geen open actiepunten. Lekker.</div>'}</div>
    </div>
    <div class="card fixed">
      <div class="chead"><h2>${coord ? "Signalen team" : "Signalen"}</h2><span class="cvn ${(noCoach.length + conflicts.length + unlogged.length) ? "bad" : ""}">${noCoach.length + conflicts.length + cancelled.length + unlogged.length + noPlan.length}</span><span class="hdnote">komende 14 dagen</span></div>
      <div class="cbody">
        <div class="tiles" style="margin-bottom:8px">
          ${coord ? tile("Zonder coach", noCoach.length, "trainingen", noCoach.length ? "bad" : "") : ""}
          ${coord ? tile("Overlap", conflicts.length, "coach of locatie", conflicts.length ? "bad" : "") : ""}
          ${coord ? tile("Vervanging", reqs.length, "open verzoeken", reqs.length ? "bad" : "") : ""}
          ${tile("Afgelast", cancelled.length, "sessies")}
          ${tile("Niet gelogd", unlogged.length, "afgelopen 14 dgn", unlogged.length ? "att" : "")}
          ${tile("Geen voorbereiding", noPlan.length, "komende 7 dgn", noPlan.length ? "att" : "")}
        </div>
        ${noPlan.slice(0, 6).map(s => `<div class="rij clk" data-key="${attr(s.key)}"><span class="bar" style="background:var(--orange)"></span><span class="grow"><div class="tt">${esc(s.label)}</div><div class="sub">${fmtDate(s.date, { weekday: true })} ${s.van} · nog geen lesvoorbereiding</div></span><span class="chev">›</span></div>`).join("")}
        ${coord ? reqs.map(r => `<div class="rij clk" data-key="${attr(r.session_key)}"><span class="bar" style="background:var(--bad)"></span><span class="grow"><div class="tt">Vervanging: ${esc((coachById(r.coach_id) || {}).name || "")}</div><div class="sub">${fmtDate(r.date, { weekday: true })} · ${esc(r.reason || "")}${r.target_coach_id ? " · gevraagd aan " + esc((coachById(r.target_coach_id) || {}).name) : " · nog niemand gevraagd"}</div></span><span class="chev">›</span></div>`).join("") : ""}
        ${noCoach.map(s => `<div class="rij clk" data-key="${attr(s.key)}"><span class="bar" style="background:var(--bad)"></span><span class="grow"><div class="tt">${esc(s.label)}</div><div class="sub">${fmtDate(s.date, { weekday: true })} ${s.van} · geen coach toegewezen</div></span><span class="chev">›</span></div>`).join("")}
        ${conflicts.slice(0, 8).map(c => `<div class="rij clk" data-key="${attr(c.a.key)}"><span class="bar" style="background:var(--bad)"></span><span class="grow"><div class="tt">${c.type === "coach" ? esc((coachById(c.id) || {}).name) + " dubbel geboekt" : esc((store.byId("locations", c.id) || {}).name) + " dubbel bezet"}</div><div class="sub">${fmtDate(c.a.date, { weekday: true })} · ${esc(c.a.label)} ${c.a.van}–${c.a.tot} ↔ ${esc(c.b.label)} ${c.b.van}–${c.b.tot}</div></span><span class="chev">›</span></div>`).join("")}
        ${unlogged.slice(0, 6).map(s => `<div class="rij clk" data-key="${attr(s.key)}"><span class="bar" style="background:var(--orange)"></span><span class="grow"><div class="tt">${esc(s.label)}</div><div class="sub">${fmtDate(s.date, { weekday: true })} ${s.van} · nog niet gelogd</div></span><span class="chev">›</span></div>`).join("")}
        ${cancelled.map(s => `<div class="rij clk off" data-key="${attr(s.key)}"><span class="bar" style="background:var(--line)"></span><span class="grow"><div class="tt">${esc(s.label)}</div><div class="sub">${fmtDate(s.date, { weekday: true })} ${s.van} · afgelast${s.reason ? " · " + esc(s.reason) : ""}</div></span><span class="chev">›</span></div>`).join("")}
      </div>
    </div>
    ${coord && scope === "team" ? `<div class="card span"><div class="chead"><h2>Bezetting deze week</h2><span class="hdnote">uren per coach, week ${isoWeek(today)}</span></div><div class="tiles">${coachesActive().map(c => { const l = sessionsIn(ws, we, { coach_id: c.id }); return tile(c.name.split(" ")[0], hoursOf(l), l.filter(s => s.status !== "afgelast").length + " sessies"); }).join("")}</div></div>` : ""}
  </div>`;

  const sc = $("#tdScope", main); if (sc) sc.onclick = e => { const b = e.target.closest("button"); if (!b) return; scope = b.dataset.v; render(main); };
  $("#tdAdd", main).onclick = () => openRuleForm({ kind: "activity" });
  $("#tdAddAct", main).onclick = () => openActionForm();
  main.onclick = async e => {
    const dn = e.target.closest("[data-done]"); if (dn) { e.stopPropagation(); const a = store.byId("action_items", dn.dataset.done); await store.save("action_items", { ...a, done: true }); toast("Afgerond ✓"); return; }
    const ac = e.target.closest("[data-act]"); if (ac) { openActionForm(store.byId("action_items", ac.dataset.act)); return; }
    const k = e.target.closest("[data-key]"); if (k) openSession(k.dataset.key);
  };
}

export function sessionRow(s) {
  const now = nowTime(); const live = s.date === todayISO() && s.van <= now && s.tot > now;
  return `<div class="rij clk ${s.status === "afgelast" ? "off" : ""}" data-key="${attr(s.key)}">
    <span class="bar" style="background:${attr(s.color)}"></span>
    <span class="tm">${s.van}</span>
    <span class="grow"><div class="tt ell">${esc(s.label)}</div><div class="sub ell">${s.van}–${s.tot} · ${esc(s.location ? s.location.short || s.location.name : "—")}${s.coaches.length ? " · " + s.coaches.map(c => esc(c.name.split(" ")[0])).join(", ") : ' · <span class="bad">geen coach</span>'}${s.reason ? " · " + esc(s.reason) : ""}</div></span>
    <span class="val">${live ? '<span class="st att">nu</span>' : ""}${s.status === "afgelast" ? '<span class="st bad">afgelast</span>' : s.status === "verplaatst" ? '<span class="st att">verplaatst</span>' : s.override ? '<span class="st att">aangepast</span>' : ""}${s.log ? '<span class="st good">gelogd</span>' : ""}${(() => { const p = s.group_id ? planFor(s.key) : null; return p ? `<span class="st ${p.status === "definitief" ? "good" : ""}" title="lesvoorbereiding">${p.status === "definitief" ? "voorb. ✓" : "concept"}</span>` : ""; })()}${s.isMatch ? '<span class="st att">wedstrijd</span>' : ""}<span class="chev">›</span></span>
  </div>`;
}
export function groupByDay(list) {
  const today = todayISO(); let out = "", last = null;
  list.forEach(s => { if (s.date !== last) { last = s.date; const n = list.filter(x => x.date === s.date).length; out += `<div class="daghd ${s.date === today ? "today" : ""}"><span>${s.date === today ? "vandaag" : s.date === addDays(today, 1) ? "morgen" : fmtDate(s.date, { weekday: true })}</span><span class="n">${n}</span></div>`; } out += sessionRow(s); });
  return out;
}
