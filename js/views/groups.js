// Groepen: overzicht, detail (leden, rooster, komende sessies), bewerken.
import { store, isCoordinator, membersOf, coachById, locById, groupTypeById, activeSeason } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, refreshSheet, shead, toast, avatar, avatars, kpi, val, xbtn, confirmInline, searchPil, klsel, ICON, tile } from "../lib/ui.js";
import { todayISO, addDays, fmtDate, DAGEN } from "../lib/dates.js";
import { groupsSorted, rulesForGroup, sessionsIn, coachesActive, locationsSorted, hoursOf } from "../lib/model.js";
import { describe } from "../lib/recur.js";
import { openSession } from "./session.js";
import { openRuleForm } from "./ruleform.js";
import { sessionRow, groupByDay } from "./today.js";
import { themesCardHtml, bindThemesCard } from "./lesson.js";

const st = { type: "", q: "", mine: false };

export function render(main, params) {
  if (params && params.id) { history.replaceState(null, "", "#/groepen"); openGroup(params.id); }
  const me = store.me; const coord = isCoordinator();
  let groups = groupsSorted();
  if (st.type) groups = groups.filter(g => g.type_id === st.type);
  if (st.mine) groups = groups.filter(g => (g.coach_ids || []).includes(me.id) || rulesForGroup(g.id).some(r => (r.coach_ids || []).includes(me.id)));
  if (st.q) groups = groups.filter(g => g.name.toLowerCase().startsWith(st.q.toLowerCase()) || g.name.toLowerCase().split(/\s+/).some(w => w.startsWith(st.q.toLowerCase())));
  const types = store.rows("group_types").slice().sort((a, b) => a.order - b.order);
  const totalMembers = new Set(store.rows("group_members").map(gm => gm.member_id)).size;
  const today = todayISO();
  main.innerHTML = `
  <div class="spkop"><h1>Groepen</h1>
    ${searchPil("grQ", "Zoek groep …", st.q)}
    ${klsel("grType", [["", "Alle typen"]].concat(types.map(t => [t.id, t.name])), st.type)}
    ${kpi([[groupsSorted().length, "groepen"], [totalMembers, "leden"], [coachesActive().length, "coaches"]])}
    <div class="right"><button class="btn ghost sm" id="grMembers">Spelers</button><div class="seg" id="grMine"><button data-v="0" class="${!st.mine ? "on" : ""}">Alle</button><button data-v="1" class="${st.mine ? "on" : ""}">Mijn groepen</button></div>${coord ? '<button class="plusbtn" id="grAdd" title="Nieuwe groep">+</button>' : ""}</div>
  </div>
  <div class="grid">${types.filter(t => groups.some(g => g.type_id === t.id)).map(t => {
    const gs = groups.filter(g => g.type_id === t.id);
    return `<div class="card"><div class="chead"><span class="dot" style="width:10px;height:10px;border-radius:50%;background:${attr(t.color)}"></span><h2>${esc(t.name)}</h2><span class="cvn">${gs.length}</span></div>
      ${gs.map(g => {
      const m = membersOf(g.id).length; const rules = rulesForGroup(g.id); const next = sessionsIn(today, addDays(today, 60), { group_id: g.id }).find(s => s.status !== "afgelast");
      const coaches = Array.from(new Set((g.coach_ids || []).concat(...rules.map(r => r.coach_ids || [])))).map(coachById).filter(Boolean);
      return `<div class="rij clk" data-group="${attr(g.id)}"><span class="bar" style="background:${attr(t.color)}"></span><span class="grow"><div class="tt ell">${esc(g.name)}</div><div class="sub ell">${rules.length ? rules.map(r => DAGEN[(r.weekdays || [])[0]] !== undefined && r.weekdays.length ? r.weekdays.map(w => DAGEN[w]).join("/") + " " + r.van : r.van).join(" · ") : '<span class="bad">nog geen rooster</span>'}${g.level ? " · " + esc(g.level) : ""}${next ? " · volgende " + fmtDate(next.date, { weekday: true }) : ""}</div></span><span class="val">${avatars(coaches, "xs")}<span class="st ${m > (g.max || 99) ? "bad" : ""}">${m}${g.max ? "/" + g.max : ""}</span><span class="chev">›</span></span></div>`;
    }).join("")}</div>`;
  }).join("") || '<div class="card"><div class="empty">Geen groepen gevonden.</div></div>'}</div>`;
  $("#grQ", main).oninput = e => { st.q = e.target.value; render(main); const i = $("#grQ", main); i.focus(); i.setSelectionRange(99, 99); };
  $("#grType", main).onchange = e => { st.type = e.target.value; render(main); };
  $("#grMine", main).onclick = e => { const b = e.target.closest("button"); if (!b) return; st.mine = b.dataset.v === "1"; render(main); };
  const add = $("#grAdd", main); if (add) add.onclick = () => openGroupForm();
  $("#grMembers", main).onclick = () => openMembers();
  main.onclick = e => { const g = e.target.closest("[data-group]"); if (g) openGroup(g.dataset.group); };
}

export function openGroup(gid) {
  openSheet(sh => {
    const g = store.byId("groups", gid); if (!g) { sh.innerHTML = shead("Groep", "niet gevonden"); return; }
    const t = groupTypeById(g.type_id); const members = membersOf(g.id); const rules = rulesForGroup(g.id); const coord = isCoordinator();
    const today = todayISO(); const upcoming = sessionsIn(today, addDays(today, 42), { group_id: g.id }); const season = activeSeason();
    const seasonList = season ? sessionsIn(season.start, season.end, { group_id: g.id }) : [];
    const past = seasonList.filter(s => s.date < today && s.status !== "afgelast"); const logged = past.filter(s => s.log).length;
    const coaches = Array.from(new Set((g.coach_ids || []).concat(...rules.map(r => r.coach_ids || [])))).map(coachById).filter(Boolean);
    sh.innerHTML = shead(g.name, `<span class="st" style="background:${attr(t ? t.color : "#7A7F85")};color:#fff">${esc(t ? t.name : "")}</span> ${g.level ? esc(g.level) : ""}${g.age ? " · " + esc(g.age) + " jaar" : ""}${g.description ? " · " + esc(g.description) : ""}`, (coord ? xbtn("edit", 'id="gdEdit"') : "") + xbtn("cal", 'id="gdIcs" title="Agenda-export (ICS)"')) + `
    <div class="card"><div class="tiles">
      ${tile("Leden", members.length + (g.max ? ` <span class="muted" style="font-size:13px">/ ${g.max}</span>` : ""), g.max && members.length >= g.max ? "vol" : g.max ? (g.max - members.length) + " plekken vrij" : "", members.length > (g.max || 99) ? "bad" : "")}
      ${tile("Coaches", coaches.length ? avatars(coaches, "sm") : '<span class="bad">—</span>', coaches.map(c => esc(c.name.split(" ")[0])).join(", "))}
      ${tile("Locatie", `<span style="font-size:15px">${esc((locById(g.location_id) || {}).name || "—")}</span>`, "standaard")}
      ${tile("Dit seizoen", seasonList.filter(s => s.status !== "afgelast").length, hoursOf(seasonList) + " uur · " + logged + "/" + past.length + " gelogd")}
    </div></div>
    <div class="card"><div class="chead"><h2>Rooster</h2><span class="cvn">${rules.length}</span><span class="hdnote">${coord ? `<button class="xbtn sm" id="gdAddRule" title="Roostermoment toevoegen">${ICON.plus}</button>` : ""}</span></div>
      ${rules.length ? rules.map(r => `<div class="rij ${coord ? "clk" : ""}" data-rule="${attr(r.id)}"><span class="tm">${r.van}</span><span class="grow"><div class="tt">${esc(describe(r, DAGEN))}${r.title ? " · " + esc(r.title) : ""}</div><div class="sub">${r.van}–${r.tot} · ${esc((locById(r.location_id) || {}).name || "—")} · ${(r.coach_ids || []).map(id => esc((coachById(id) || {}).name || "").split(" ")[0]).join(", ") || '<span class="bad">geen coach</span>'}${r.count ? " · " + r.count + " keer" : r.end ? " · t/m " + fmtDate(r.end) : ""}</div></span>${coord ? '<span class="chev">›</span>' : ""}</div>`).join("") : `<div class="empty">Nog geen roostermoment. ${coord ? "Voeg er een toe met +." : ""}</div>`}
    </div>
    ${themesCardHtml(g, coord)}
    <div class="card"><div class="chead"><h2>Komende sessies</h2><span class="cvn">${upcoming.length}</span><span class="hdnote">6 weken</span></div><div class="cbody" style="max-height:300px">${upcoming.length ? groupByDay(upcoming) : '<div class="empty">Niets gepland.</div>'}</div></div>
    <div class="card"><div class="chead"><h2>Leden</h2><span class="cvn">${members.length}</span><span class="hdnote">${coord ? `<button class="xbtn sm" id="gdAddMember" title="Lid toevoegen">${ICON.plus}</button>` : ""}</span></div>
      <div class="cbody" style="max-height:360px">${members.length ? members.map(m => { const att = store.rows("attendance").filter(a => a.member_id === m.id); const pres = att.filter(a => a.present).length; return `<div class="rij clk" data-member="${attr(m.id)}"><span class="avatar xs" style="background:var(--paper);color:var(--muted)">${esc(m.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span><span class="grow"><div class="tt" style="font-weight:500">${esc(m.name)}</div><div class="sub">${m.birth_year ? (new Date().getFullYear() - m.birth_year) + " jr" : ""}${m.note ? " · " + esc(m.note) : ""}</div></span><span class="val">${att.length ? `<span class="st ${pres / att.length < .7 ? "att" : ""}">${pres}/${att.length}</span>` : ""}<span class="chev">›</span></span></div>`; }).join("") : '<div class="empty">Nog geen leden.</div>'}</div>
    </div>`;
    const ed = $("#gdEdit", sh); if (ed) ed.onclick = () => openGroupForm(g.id);
    $("#gdIcs", sh).onclick = () => import("./more.js").then(m => m.openIcsSheet(g.id));
    const ar = $("#gdAddRule", sh); if (ar) ar.onclick = () => openRuleForm({ group_id: g.id });
    const am = $("#gdAddMember", sh); if (am) am.onclick = () => openMemberPicker(g.id);
    bindThemesCard(sh, g);
    sh.onclick = e => {
      const r = e.target.closest("[data-rule]"); if (r && coord) { openRuleForm({ rule: store.byId("schedule_rules", r.dataset.rule) }); return; }
      const k = e.target.closest("[data-key]"); if (k) { openSession(k.dataset.key); return; }
      const m = e.target.closest("[data-member]"); if (m) openMember(m.dataset.member, g.id);
    };
  });
}

export function openGroupForm(gid) {
  const ex = gid ? store.byId("groups", gid) : null;
  const d = ex ? { ...ex, coach_ids: (ex.coach_ids || []).slice() } : { name: "", type_id: (store.rows("group_types")[0] || {}).id, level: "", age: "", max: 8, location_id: null, coach_ids: [], description: "", active: true, is_course: false, season_id: (activeSeason() || {}).id || null };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Groep bewerken" : "Nieuwe groep", ex ? esc(ex.name) : "", ex ? xbtn("trash", 'id="gfDel"', "danger") : "") + `
    <div class="card">
      <label class="fld" style="margin-top:0">Naam</label><input class="in" id="gfName" value="${attr(d.name)}" placeholder="bv. Jeugd Eagles (10-12) woensdag">
      <div class="f2"><div><label class="fld">Type</label><select class="in" id="gfType">${store.rows("group_types").slice().sort((a, b) => a.order - b.order).map(t => `<option value="${attr(t.id)}" ${d.type_id === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></div>
      <div><label class="fld">Niveau</label><input class="in" id="gfLevel" value="${attr(d.level)}" placeholder="bv. GVB-traject, hcp 54-36" list="gfLevels"><datalist id="gfLevels">${["Kennismaking", "Golfstart", "Baanpermissie", "hcp 54-36", "hcp 36-18", "hcp 18-9", "Competitie recreatief", "Competitie competitief", "Selectie", "Gemengd"].map(l => `<option value="${l}">`).join("")}</datalist></div></div>
      <div class="f3"><div><label class="fld">Leeftijd</label><input class="in" id="gfAge" value="${attr(d.age)}" placeholder="bv. 10-12"></div><div><label class="fld">Max. leden</label><input class="in" id="gfMax" type="number" min="1" value="${d.max || ""}"></div><div><label class="fld">Standaardlocatie</label><select class="in" id="gfLoc"><option value="">—</option>${locationsSorted().map(l => `<option value="${attr(l.id)}" ${d.location_id === l.id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div></div>
      <label class="fld">Vaste coach(es)</label><div class="pick" id="gfCoach">${coachesActive().map(c => `<button data-id="${attr(c.id)}" class="${d.coach_ids.includes(c.id) ? "on" : ""}">${avatar(c, "xs")}${esc(c.name.split(" ")[0])}</button>`).join("")}</div>
      <label class="fld">Omschrijving</label><input class="in" id="gfDesc" value="${attr(d.description || "")}" placeholder="bv. 8 lessen, maandagavond">
      <div class="sw" style="margin-top:10px"><div><div class="t">Cursus met vaste looptijd</div><div class="d">Bijvoorbeeld een beginnerscursus van 8 lessen</div></div><button class="toggle ${d.is_course ? "on" : ""}" id="gfCourse"></button></div>
      ${ex ? `<div class="sw"><div><div class="t">Actief</div><div class="d">Inactieve groepen verdwijnen uit de lijsten, de historie blijft</div></div><button class="toggle ${d.active !== false ? "on" : ""}" id="gfActive"></button></div>` : ""}
    </div>
    <div class="klvbtn"><button class="btn o" id="gfSave">${ex ? "Opslaan" : "Groep aanmaken"}</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#gfCoach", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; const i = d.coach_ids.indexOf(b.dataset.id); if (i >= 0) d.coach_ids.splice(i, 1); else d.coach_ids.push(b.dataset.id); b.classList.toggle("on"); };
    $("#gfCourse", sh).onclick = e => e.target.classList.toggle("on");
    const act = $("#gfActive", sh); if (act) act.onclick = e => e.target.classList.toggle("on");
    const del = $("#gfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Groep, rooster en ledenkoppelingen verwijderen? Dit kan niet ongedaan worden gemaakt.", async () => { for (const r of rulesForGroup(gid)) await store.remove("schedule_rules", r.id); for (const gm of store.rows("group_members").filter(x => x.group_id === gid)) await store.remove("group_members", gm.id); await store.remove("groups", gid); closeSheet(); closeSheet(); toast("Groep verwijderd"); });
    $("#gfSave", sh).onclick = async () => {
      const name = val("gfName", sh); if (!name) { toast("Geef de groep een naam"); return; }
      const row = { ...d, name, type_id: val("gfType", sh), level: val("gfLevel", sh), age: val("gfAge", sh), max: +val("gfMax", sh) || null, location_id: val("gfLoc", sh) || null, description: val("gfDesc", sh), is_course: $("#gfCourse", sh).classList.contains("on"), active: act ? act.classList.contains("on") : true };
      if (!row.id) delete row.id;
      const saved = await store.save("groups", row); closeSheet(); toast(ex ? "Groep opgeslagen" : "Groep aangemaakt"); if (!ex) openGroup(saved.id); else refreshSheet();
    };
  });
}

/* ---------- Leden ---------- */
export function openMemberPicker(gid) {
  const inGroup = new Set(store.rows("group_members").filter(gm => gm.group_id === gid).map(gm => gm.member_id));
  let q = "";
  openSheet(sh => {
    const all = store.rows("members").filter(m => m.active !== false && !inGroup.has(m.id)).sort((a, b) => a.name.localeCompare(b.name));
    const hits = q ? all.filter(m => m.name.toLowerCase().split(/\s+/).some(w => w.startsWith(q.toLowerCase()))) : all.slice(0, 30);
    sh.innerHTML = shead("Lid toevoegen", esc((store.byId("groups", gid) || {}).name)) + `
    <div class="card"><div class="row">${searchPil("mpQ", "Zoek bestaand lid …", q)}<button class="btn sm ghost" id="mpNew">Nieuw lid</button></div>
      <div style="margin-top:10px">${hits.length ? hits.map(m => `<div class="rij clk" data-add="${attr(m.id)}"><span class="avatar xs" style="background:var(--paper);color:var(--muted)">${esc(m.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span><span class="grow"><div class="tt" style="font-weight:500">${esc(m.name)}</div><div class="sub">${store.rows("group_members").filter(gm => gm.member_id === m.id).map(gm => esc((store.byId("groups", gm.group_id) || {}).name)).join(", ") || "nog in geen groep"}</div></span><span class="st">toevoegen</span></div>`).join("") : '<div class="empty">Geen leden gevonden. Maak een nieuw lid aan.</div>'}</div></div>`;
    $("#mpQ", sh).oninput = e => { q = e.target.value; refreshSheet(); const i = $("#mpQ"); i.focus(); i.setSelectionRange(99, 99); };
    $("#mpNew", sh).onclick = () => openMemberForm(null, gid, q);
    sh.onclick = async e => { const a = e.target.closest("[data-add]"); if (!a) return; await store.save("group_members", { group_id: gid, member_id: a.dataset.add, since: todayISO() }); inGroup.add(a.dataset.add); toast("Toegevoegd aan de groep"); refreshSheet(); };
  });
}
export function openMember(mid, fromGroup) {
  openSheet(sh => {
    const m = store.byId("members", mid); if (!m) { sh.innerHTML = shead("Lid", "niet gevonden"); return; }
    const gms = store.rows("group_members").filter(gm => gm.member_id === mid); const att = store.rows("attendance").filter(a => a.member_id === mid).sort((a, b) => a.date < b.date ? 1 : -1);
    sh.innerHTML = shead(m.name, `${m.birth_year ? (new Date().getFullYear() - m.birth_year) + " jaar · " : ""}${gms.length} groep${gms.length === 1 ? "" : "en"}`, isCoordinator() ? xbtn("edit", 'id="mbEdit"') : "") + `
    <div class="card"><div class="chead"><h2>Groepen</h2><span class="cvn">${gms.length}</span><span class="hdnote">${isCoordinator() ? `<button class="xbtn sm" id="mbAddGroup" title="Aan groep toevoegen">${ICON.plus}</button>` : ""}</span></div>${gms.map(gm => { const g = store.byId("groups", gm.group_id); return g ? `<div class="rij"><span class="bar" style="background:${attr((groupTypeById(g.type_id) || {}).color)}"></span><span class="grow"><div class="tt">${esc(g.name)}</div><div class="sub">sinds ${fmtDate(gm.since || "", { year: true })}</div></span>${isCoordinator() ? `<button class="xbtn sm" data-rm="${attr(gm.id)}" title="Uit groep halen">${ICON.close}</button>` : ""}</div>` : ""; }).join("") || '<div class="empty">In geen enkele groep.</div>'}</div>
    ${m.note ? `<div class="card"><div class="chead"><h2>Notitie</h2></div><div class="small">${esc(m.note)}</div></div>` : ""}
    <div class="card"><div class="chead"><h2>Aanwezigheid</h2><span class="cvn">${att.filter(a => a.present).length}/${att.length}</span></div><div class="cbody" style="max-height:220px">${att.length ? att.slice(0, 20).map(a => `<div class="rij"><span class="tm">${fmtDate(a.date, { weekday: true })}</span><span class="grow small muted">${esc((store.byId("groups", (store.byId("schedule_rules", a.session_key.slice(0, a.session_key.lastIndexOf("_"))) || {}).group_id) || {}).name || "")}</span><span class="st ${a.present ? "good" : "bad"}">${a.present ? "aanwezig" : "afwezig"}</span></div>`).join("") : '<div class="empty">Nog geen aanwezigheid geregistreerd.</div>'}</div></div>`;
    const ed = $("#mbEdit", sh); if (ed) ed.onclick = () => openMemberForm(mid);
    const ag = $("#mbAddGroup", sh); if (ag) ag.onclick = () => openSheet(s2 => { const inG = new Set(gms.map(x => x.group_id)); s2.innerHTML = shead("Aan groep toevoegen", esc(m.name)) + `<div class="card">${groupsSorted().filter(g => !inG.has(g.id)).map(g => `<div class="rij clk" data-g="${attr(g.id)}"><span class="bar" style="background:${attr((groupTypeById(g.type_id) || {}).color)}"></span><span class="grow tt" style="font-weight:500">${esc(g.name)}</span><span class="sub">${membersOf(g.id).length}${g.max ? "/" + g.max : ""}</span><span class="chev">›</span></div>`).join("")}</div>`; s2.onclick = async e => { const r = e.target.closest("[data-g]"); if (!r) return; await store.save("group_members", { group_id: r.dataset.g, member_id: mid, since: todayISO() }); closeSheet(); toast("Toegevoegd"); refreshSheet(); }; });
    sh.onclick = async e => { const r = e.target.closest("[data-rm]"); if (r) { await store.remove("group_members", r.dataset.rm); toast("Uit groep gehaald"); refreshSheet(); } };
  });
}
export function openMemberForm(mid, addToGroup, presetName = "") {
  const ex = mid ? store.byId("members", mid) : null;
  const d = ex ? { ...ex } : { name: presetName, email: "", phone: "", birth_year: null, note: "", active: true };
  openSheet(sh => {
    sh.innerHTML = shead(ex ? "Lid bewerken" : "Nieuw lid", "", ex ? xbtn("trash", 'id="mfDel"', "danger") : "") + `
    <div class="card"><label class="fld" style="margin-top:0">Naam</label><input class="in" id="mfName" value="${attr(d.name)}">
    <div class="f2"><div><label class="fld">Geboortejaar</label><input class="in" id="mfYear" type="number" min="1920" max="2026" value="${d.birth_year || ""}" placeholder="optioneel"></div><div><label class="fld">Telefoon</label><input class="in" id="mfPhone" value="${attr(d.phone || "")}" placeholder="optioneel"></div></div>
    <label class="fld">E-mail</label><input class="in" id="mfMail" type="email" value="${attr(d.email || "")}" placeholder="optioneel">
    <label class="fld">Notitie voor coaches</label><textarea class="in" id="mfNote" style="min-height:56px" placeholder="bv. linkshandig, eigen clubs">${esc(d.note || "")}</textarea>
    <div class="hint">Bewaar hier geen medische of andere gevoelige gegevens.</div></div>
    <div class="klvbtn"><button class="btn o" id="mfSave">${ex ? "Opslaan" : "Lid aanmaken"}</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    const del = $("#mfDel", sh); if (del) del.onclick = () => confirmInline(sh, "Lid en alle koppelingen en aanwezigheid verwijderen?", async () => { for (const gm of store.rows("group_members").filter(x => x.member_id === mid)) await store.remove("group_members", gm.id); for (const a of store.rows("attendance").filter(x => x.member_id === mid)) await store.remove("attendance", a.id); await store.remove("members", mid); closeSheet(); closeSheet(); toast("Lid verwijderd"); });
    $("#mfSave", sh).onclick = async () => {
      const name = val("mfName", sh); if (!name) { toast("Vul een naam in"); return; }
      const row = { ...d, name, birth_year: +val("mfYear", sh) || null, phone: val("mfPhone", sh), email: val("mfMail", sh), note: val("mfNote", sh) }; if (!row.id) delete row.id;
      const saved = await store.save("members", row);
      if (addToGroup) await store.save("group_members", { group_id: addToGroup, member_id: saved.id, since: todayISO() });
      closeSheet(); if (addToGroup) closeSheet(); toast(ex ? "Opgeslagen" : "Lid aangemaakt" + (addToGroup ? " en toegevoegd" : "")); refreshSheet();
    };
  });
}

/* ---------- Spelersdatabase ---------- */
export function openMembers() {
  let q = "", only = "";
  openSheet(sh => {
    const gms = store.rows("group_members"); const coord = isCoordinator();
    let list = store.rows("members").filter(m => m.active !== false).slice().sort((a, b) => a.name.localeCompare(b.name));
    if (only === "los") list = list.filter(m => !gms.some(gm => gm.member_id === m.id));
    if (only === "jeugd") list = list.filter(m => m.birth_year && new Date().getFullYear() - m.birth_year < 18);
    if (q) list = list.filter(m => m.name.toLowerCase().split(/\s+/).some(w => w.startsWith(q.toLowerCase())));
    const total = store.rows("members").filter(m => m.active !== false).length; const loose = store.rows("members").filter(m => m.active !== false && !gms.some(gm => gm.member_id === m.id)).length;
    sh.innerHTML = shead("Spelers", `${total} spelers · ${loose} zonder groep`, (coord ? xbtn("plus", 'id="msAdd" title="Nieuwe speler"') : "") + xbtn("dl", 'id="msCsv" title="CSV"')) + `
    <div class="card"><div class="row" style="flex-wrap:wrap">${searchPil("msQ", "Zoek speler …", q)}<div class="seg" id="msOnly"><button data-v="" class="${only ? "" : "on"}">Alle</button><button data-v="jeugd" class="${only === "jeugd" ? "on" : ""}">Jeugd</button><button data-v="los" class="${only === "los" ? "on" : ""}">Zonder groep</button></div></div></div>
    <div class="card"><div class="chead"><h2>Spelers</h2><span class="cvn">${list.length}</span></div><div class="cbody" style="max-height:65vh">${list.map(m => { const gs = gms.filter(gm => gm.member_id === m.id).map(gm => store.byId("groups", gm.group_id)).filter(Boolean); return `<div class="rij clk" data-member="${attr(m.id)}"><span class="avatar xs" style="background:var(--paper);color:var(--muted)">${esc(m.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span><span class="grow"><div class="tt" style="font-weight:500">${esc(m.name)}</div><div class="sub ell">${m.birth_year ? (new Date().getFullYear() - m.birth_year) + " jr · " : ""}${gs.length ? gs.map(g => esc(g.name)).join(", ") : '<span class="att" style="color:var(--orange)">zonder groep</span>'}</div></span><span class="chev">›</span></div>`; }).join("") || '<div class="empty">Geen spelers gevonden.</div>'}</div></div>`;
    $("#msQ", sh).oninput = e => { q = e.target.value; refreshSheet(); const i = $("#msQ"); i.focus(); i.setSelectionRange(99, 99); };
    $("#msOnly", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; only = b.dataset.v; refreshSheet(); };
    const add = $("#msAdd", sh); if (add) add.onclick = () => openMemberForm(null, null, q);
    $("#msCsv", sh).onclick = () => { import("../lib/ui.js").then(u => u.downloadText("spelers.csv", "naam;geboortejaar;email;telefoon;groepen\n" + list.map(m => [m.name, m.birth_year || "", m.email || "", m.phone || "", gms.filter(gm => gm.member_id === m.id).map(gm => (store.byId("groups", gm.group_id) || {}).name).join(", ")].join(";")).join("\n"), "text/csv")); };
    sh.onclick = e => { const m = e.target.closest("[data-member]"); if (m) openMember(m.dataset.member); };
  });
}
