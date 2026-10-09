// Formulier voor een roosterregel (groepsrooster of losse activiteit), met herhaling.
import { store, isCoordinator, activeSeason } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, refreshSheet, shead, toast, confirmInline, avatar, val, xbtn } from "../lib/ui.js";
import { DAGEN, todayISO, addMin, durMin, fmtDate, weekday } from "../lib/dates.js";
import { FREQ } from "../lib/recur.js";
import { groupsSorted, coachesActive, locationsSorted, sessionsIn } from "../lib/model.js";
import { findConflicts } from "../lib/recur.js";

/**
 * openRuleForm({rule, group_id, kind, date}) — rule=bestaande regel om te bewerken, anders nieuw.
 */
export function openRuleForm(o = {}) {
  const me = store.me;
  const ex = o.rule ? JSON.parse(JSON.stringify(o.rule)) : null;
  const g = o.group_id ? store.byId("groups", o.group_id) : (ex && ex.group_id ? store.byId("groups", ex.group_id) : null);
  const season = activeSeason(o.date || todayISO());
  const d = ex || {
    id: null, kind: o.kind || (g ? "group" : "activity"), group_id: g ? g.id : null, type_id: g ? (g.is_course ? "at_cursus" : "at_training") : "at_training",
    title: "", freq: g ? "weekly" : "once", interval: 1, weekdays: [weekday(o.date || todayISO())], nth: { week: 1, weekday: 1 }, dates: [],
    start: o.date || todayISO(), end: g && season ? season.end : null, count: null,
    van: o.van || "16:00", tot: o.tot || "17:30", location_id: o.location_id || (g ? g.location_id : null),
    coach_ids: o.coach_id ? [o.coach_id] : (g ? (g.coach_ids || []).slice() : [me.id]), note: "", season_id: season ? season.id : null, skip_breaks: true, archived: false,
  };
  if (!d.nth) d.nth = { week: 1, weekday: 1 }; if (!d.dates) d.dates = []; if (!d.weekdays) d.weekdays = [];
  const canEdit = isCoordinator() || d.kind === "activity";
  if (!canEdit) { toast("Alleen een coördinator kan groepsroosters wijzigen"); return; }

  openSheet(sh => {
    const groups = groupsSorted(), coaches = coachesActive(), locs = locationsSorted(), types = store.rows("activity_types").slice().sort((a, b) => a.order - b.order);
    const isGroup = d.kind === "group";
    sh.innerHTML = shead(ex ? "Roosterregel bewerken" : (isGroup ? "Nieuw roostermoment" : "Nieuwe activiteit"), isGroup && g ? esc(g.name) : "Training, wedstrijd, clinic, overleg …",
      ex ? xbtn("trash", 'id="rfDel"', "danger") : "") + `
    <div class="card">
      ${!isGroup || !g ? `<label class="fld" style="margin-top:0">Soort</label><div class="seg dark" id="rfKind"><button data-v="activity" class="${!isGroup ? "on" : ""}">Losse activiteit</button><button data-v="group" class="${isGroup ? "on" : ""}">Groepstraining</button></div>` : ""}
      ${isGroup ? `<label class="fld" ${g ? 'style="margin-top:0"' : ""}>Groep</label><select class="in" id="rfGroup">${groups.map(x => `<option value="${attr(x.id)}" ${d.group_id === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : ""}
      <label class="fld" ${!isGroup && g ? 'style="margin-top:0"' : ""}>${isGroup ? "Omschrijving (optioneel)" : "Titel"}</label><input class="in" id="rfTitle" value="${attr(d.title)}" placeholder="${isGroup ? "bv. Baantraining" : "bv. Clinic bedrijfsuitje"}">
      <label class="fld">Type</label><select class="in" id="rfType">${types.map(t => `<option value="${attr(t.id)}" ${d.type_id === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
      <div class="f3"><div><label class="fld">Van</label><input class="in" id="rfVan" type="time" value="${attr(d.van)}"></div><div><label class="fld">Tot</label><input class="in" id="rfTot" type="time" value="${attr(d.tot)}"></div><div><label class="fld">Locatie</label><select class="in" id="rfLoc"><option value="">—</option>${locs.map(l => `<option value="${attr(l.id)}" ${d.location_id === l.id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div></div>
      <label class="fld">Coach(es)</label><div class="pick" id="rfCoach">${coaches.map(c => `<button data-id="${attr(c.id)}" class="${d.coach_ids.includes(c.id) ? "on" : ""}">${avatar(c, "xs")}${esc(c.name.split(" ")[0])}</button>`).join("")}</div>
    </div>
    <div class="card">
      <label class="fld" style="margin-top:0">Herhaling</label><select class="in" id="rfFreq">${FREQ.map(([v, l]) => `<option value="${v}" ${d.freq === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <div id="rfWk" class="${["weekly", "biweekly"].includes(d.freq) ? "" : "hide"}"><label class="fld">Dagen</label><div class="daysel" id="rfDays">${[1, 2, 3, 4, 5, 6, 0].map(w => `<button data-w="${w}" class="${d.weekdays.includes(w) ? "on" : ""}">${DAGEN[w]}</button>`).join("")}</div>
        ${d.freq === "weekly" ? `<label class="fld">Elke … weken</label><input class="in" id="rfInt" type="number" min="1" max="8" value="${d.interval || 1}" style="width:100px">` : ""}</div>
      <div id="rfNth" class="${d.freq === "monthly_nth" ? "" : "hide"}"><div class="f2"><div><label class="fld">Welke week</label><select class="in" id="rfNthW">${[[1, "1e"], [2, "2e"], [3, "3e"], [4, "4e"], [-1, "laatste"]].map(([v, l]) => `<option value="${v}" ${d.nth.week === v ? "selected" : ""}>${l}</option>`).join("")}</select></div><div><label class="fld">Weekdag</label><select class="in" id="rfNthD">${[1, 2, 3, 4, 5, 6, 0].map(w => `<option value="${w}" ${d.nth.weekday === w ? "selected" : ""}>${DAGEN[w]}</option>`).join("")}</select></div></div></div>
      <div id="rfCustom" class="${d.freq === "custom" ? "" : "hide"}"><label class="fld">Datums</label><div class="row"><input class="in" id="rfDateAdd" type="date" style="width:170px"><button class="btn sm ghost" id="rfDateBtn">Toevoegen</button></div><div class="chips" id="rfDates" style="margin-top:8px">${d.dates.map(x => `<span class="chip">${fmtDate(x, { weekday: true })}<button class="x" data-rmdate="${x}">×</button></span>`).join("")}</div></div>
      <div class="f2"><div><label class="fld">${d.freq === "once" ? "Datum" : "Vanaf"}</label><input class="in" id="rfStart" type="date" value="${attr(d.start)}"></div>
        <div class="${d.freq === "once" || d.freq === "custom" ? "hide" : ""}"><label class="fld">Tot en met</label><input class="in" id="rfEnd" type="date" value="${attr(d.end || "")}"></div></div>
      <div class="${d.freq === "once" || d.freq === "custom" ? "hide" : ""}"><label class="fld">Of: aantal keer (bv. cursus van 8 lessen)</label><input class="in" id="rfCount" type="number" min="1" max="60" value="${d.count || ""}" placeholder="—" style="width:120px">
        <div class="sw" style="margin-top:8px"><div><div class="t">Vervalt in vakanties</div><div class="d">Schoolvakanties en sluitingsdagen uit de seizoensinstellingen</div></div><button class="toggle ${d.skip_breaks !== false ? "on" : ""}" id="rfSkip"></button></div></div>
      <label class="fld">Notitie</label><textarea class="in" id="rfNote" placeholder="Bijzonderheden, materiaal, afspraken">${esc(d.note || "")}</textarea>
    </div>
    <div id="rfConf"></div>
    <div class="klvbtn" style="margin-top:4px"><button class="btn o" id="rfSave">${ex ? "Opslaan" : "Aanmaken"}</button><button class="btn ghost" data-close>Annuleren</button></div>`;

    const read = () => {
      d.title = val("rfTitle", sh); d.type_id = val("rfType", sh); d.van = val("rfVan", sh) || d.van; d.tot = val("rfTot", sh) || d.tot;
      d.location_id = val("rfLoc", sh) || null; d.freq = val("rfFreq", sh); d.start = val("rfStart", sh) || d.start;
      const e = $("#rfEnd", sh); d.end = e && e.value ? e.value : null; const c = $("#rfCount", sh); d.count = c && c.value ? +c.value : null;
      const it = $("#rfInt", sh); d.interval = it ? Math.max(1, +it.value || 1) : 1;
      const nw = $("#rfNthW", sh); if (nw) d.nth = { week: +nw.value, weekday: +$("#rfNthD", sh).value };
      d.note = val("rfNote", sh); const gsel = $("#rfGroup", sh); if (gsel) d.group_id = gsel.value;
      if (d.freq === "once" || d.freq === "custom") { d.end = null; d.count = null; }
    };
    const kindSeg = $("#rfKind", sh); if (kindSeg) kindSeg.onclick = e => { const b = e.target.closest("button"); if (!b) return; read(); d.kind = b.dataset.v; if (d.kind === "group" && !d.group_id && groups[0]) { d.group_id = groups[0].id; } if (d.kind === "group") { d.freq = d.freq === "once" ? "weekly" : d.freq; } refreshSheet(); };
    const gsel = $("#rfGroup", sh); if (gsel) gsel.onchange = () => { read(); const ng = store.byId("groups", gsel.value); if (ng) { d.location_id = ng.location_id; d.coach_ids = (ng.coach_ids || []).slice(); } refreshSheet(); };
    $("#rfFreq", sh).onchange = () => { read(); if (["weekly", "biweekly"].includes(d.freq) && !d.weekdays.length) d.weekdays = [weekday(d.start)]; refreshSheet(); };
    $("#rfDays", sh) && ($("#rfDays", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; const w = +b.dataset.w; const i = d.weekdays.indexOf(w); if (i >= 0) d.weekdays.splice(i, 1); else d.weekdays.push(w); b.classList.toggle("on"); });
    $("#rfCoach", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; const id = b.dataset.id; const i = d.coach_ids.indexOf(id); if (i >= 0) d.coach_ids.splice(i, 1); else d.coach_ids.push(id); b.classList.toggle("on"); };
    const skip = $("#rfSkip", sh); if (skip) skip.onclick = () => { d.skip_breaks = !skip.classList.contains("on"); skip.classList.toggle("on", d.skip_breaks); };
    const dateBtn = $("#rfDateBtn", sh); if (dateBtn) dateBtn.onclick = () => { const v = $("#rfDateAdd", sh).value; if (v && !d.dates.includes(v)) { d.dates.push(v); d.dates.sort(); read(); refreshSheet(); } };
    sh.addEventListener("click", e => { const r = e.target.closest("[data-rmdate]"); if (r) { d.dates = d.dates.filter(x => x !== r.dataset.rmdate); read(); refreshSheet(); } });
    $("#rfVan", sh).onchange = () => { const dur = durMin(d.van, d.tot); d.van = $("#rfVan", sh).value; $("#rfTot", sh).value = d.tot = addMin(d.van, dur > 0 ? dur : 60); };
    const del = $("#rfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Deze roosterregel en alle bijbehorende sessies verwijderen?", async () => { await store.remove("schedule_rules", d.id); closeSheet(); toast("Roosterregel verwijderd"); });

    $("#rfSave", sh).onclick = async () => {
      read();
      if (d.kind === "activity" && !d.title) { toast("Geef de activiteit een titel"); return; }
      if (d.kind === "group" && !d.group_id) { toast("Kies een groep"); return; }
      if (durMin(d.van, d.tot) <= 0) { toast("Eindtijd moet na de begintijd liggen"); return; }
      if (["weekly", "biweekly"].includes(d.freq) && !d.weekdays.length) { toast("Kies minstens één dag"); return; }
      if (d.freq === "custom" && !d.dates.length) { toast("Voeg minstens één datum toe"); return; }
      if (d.freq === "custom") d.start = d.dates[0];
      if (d.kind === "activity") d.group_id = null;
      // conflictcontrole (voorbeeld: komende 12 weken)
      const probe = { ...d, id: d.id || "nieuw" };
      const others = sessionsIn(d.start, addDaysISO(d.start, 84)).filter(s => s.rule_id !== probe.id);
      const mine = (await import("../lib/recur.js")).expand([probe], [], store.rows("breaks"), d.start, addDaysISO(d.start, 84));
      const conf = findConflicts(others.concat(mine), store.rows("locations")).filter(c => c.a.rule_id === probe.id || c.b.rule_id === probe.id);
      const box = $("#rfConf", sh);
      if (conf.length && !box.dataset.ack) {
        const uniq = {}; conf.forEach(c => { const o = c.a.rule_id === probe.id ? c.b : c.a; const who = c.type === "coach" ? (store.byId("coaches", c.id) || {}).name : (store.byId("locations", c.id) || {}).name; uniq[(who || "?") + "|" + (o.title || (o.group_id && (store.byId("groups", o.group_id) || {}).name) || "")] = (uniq[(who || "?") + "|" + (o.title || "")] || 0) + 1; });
        box.innerHTML = `<div class="warn"><b>Let op: ${conf.length} overlap${conf.length > 1 ? "pen" : ""} in de komende 12 weken.</b><div class="small" style="margin-top:4px">${Object.keys(uniq).slice(0, 6).map(k => { const [who, what] = k.split("|"); return esc(who) + " ↔ " + esc(what || "activiteit"); }).join("<br>")}</div><div class="small" style="margin-top:6px">Klik nogmaals op opslaan om toch door te gaan.</div></div>`;
        box.dataset.ack = "1"; return;
      }
      const row = { ...d }; delete row.coaches;
      if (!row.id) row.id = undefined;
      await store.save("schedule_rules", row);
      closeSheet(); toast(ex ? "Roosterregel opgeslagen" : "Toegevoegd aan de planning");
    };
  });
}
function addDaysISO(iso, n) { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d + n); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); }
