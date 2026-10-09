// Sessie-sheet: één voorkomen van een roosterregel bekijken, afwijkend plannen, afgelasten en loggen.
import { store, isCoordinator, membersOf, coachById } from "../store/index.js";
import { $, $$, esc, attr, openSheet, closeSheet, refreshSheet, shead, toast, avatar, avatars, val, xbtn, confirmInline, ICON } from "../lib/ui.js";
import { fmtDateLong, fmtDur, todayISO, nowTime, DAGEN } from "../lib/dates.js";
import { sessionByKey, coachesActive, locationsSorted } from "../lib/model.js";
import { describe } from "../lib/recur.js";
import { openRuleForm } from "./ruleform.js";
import { lessonCardHtml, bindLessonCard } from "./lesson.js";
import { notify, requestFor, candidates } from "../lib/notify.js";


function canEditSession(s) { return isCoordinator() || (store.me && s.coach_ids.includes(store.me.id)); }

export function openSession(key, tab) {
  openSheet(sh => {
    const s = sessionByKey(key);
    if (!s) { sh.innerHTML = shead("Sessie", "niet gevonden"); return; }
    const rule = store.byId("schedule_rules", s.rule_id);
    const members = s.group ? membersOf(s.group.id) : [];
    const past = s.date < todayISO() || (s.date === todayISO() && s.tot <= nowTime());
    const edit = canEditSession(s);
    const status = s.status === "afgelast" ? '<span class="st bad">Afgelast</span>' : s.status === "verplaatst" ? '<span class="st att">Verplaatst</span>' : s.override ? '<span class="st att">Aangepast</span>' : s.log ? '<span class="st good">Gelogd</span>' : past ? '<span class="st">Voorbij</span>' : '<span class="st">Gepland</span>';
    const acts = (edit ? xbtn("edit", 'id="ssEdit" title="Deze keer aanpassen"') : "") + (isCoordinator() && rule ? xbtn("cal", 'id="ssRule" title="Roosterregel bewerken"') : "");
    sh.innerHTML = shead(s.label, `${fmtDateLong(s.date)} · ${s.van}–${s.tot} · ${fmtDur(s.minutes)} ${status}`, acts) + `
    <div class="card">
      <div class="tiles">
        <div class="tile"><div class="lb">Locatie</div><div class="v" style="font-size:15px">${esc(s.location ? s.location.name : "—")}</div></div>
        <div class="tile"><div class="lb">Coach${s.coaches.length > 1 ? "es" : ""}</div><div class="v" style="font-size:15px">${s.coaches.length ? s.coaches.map(c => esc(c.name.split(" ")[0])).join(", ") : '<span class="bad">Geen</span>'}</div></div>
        <div class="tile"><div class="lb">${s.group ? "Deelnemers" : "Type"}</div><div class="v" style="font-size:15px">${s.group ? members.length + (s.group.max ? " / " + s.group.max : "") : esc(s.atype ? s.atype.name : "")}</div></div>
      </div>
      ${s.reason ? `<div class="warn att" style="margin-top:10px">${esc(s.reason)}</div>` : ""}
      ${s.note ? `<div class="hint" style="margin-top:10px">${esc(s.note)}</div>` : ""}
      ${rule ? `<div class="hint">${esc(describe(rule, DAGEN))}${s.group && s.group.level ? " · " + esc(s.group.level) : ""}${s.group && s.group.age ? " · " + esc(s.group.age) + " jr" : ""}</div>` : ""}
    </div>
    ${s.status !== "afgelast" ? lessonCardHtml(s, edit) : ""}
    ${s.group ? `<div class="card"><div class="chead"><h2>Deelnemers</h2><span class="cvn">${members.length}</span>${s.log ? `<span class="hdnote">${s.log.count != null ? s.log.count + " aanwezig" : ""}</span>` : ""}</div><div class="cbody" style="max-height:260px">${members.length ? members.map(m => { const att = store.rows("attendance").find(a => a.session_key === s.key && a.member_id === m.id); return `<div class="rij"><span class="avatar xs" style="background:var(--paper);color:var(--muted)">${esc(m.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span><span class="grow ell">${esc(m.name)}</span>${att ? `<span class="st ${att.present ? "good" : "bad"}">${att.present ? "aanwezig" : "afwezig"}</span>` : ""}</div>`; }).join("") : '<div class="empty">Nog geen leden in deze groep.</div>'}</div></div>` : ""}
    ${s.status !== "afgelast" && !past ? replacementCardHtml(s) : ""}
    ${edit && s.status !== "afgelast" ? `<div class="card"><div class="chead"><h2>${s.log ? "Logboek" : "Hoe ging het?"}</h2>${s.log ? `<span class="hdnote">${esc((coachById(s.log.coach_id) || {}).name || "")}</span>` : ""}</div>${logForm(s, members)}</div>` : ""}
    <div class="klvbtn">
      ${edit && s.status !== "afgelast" ? `<button class="btn ghost" id="ssCancel">Afgelasten</button>` : ""}
      ${!past && s.status !== "afgelast" && store.me && s.coach_ids.includes(store.me.id) && !requestFor(s.key) ? `<button class="btn ghost" id="ssAbsent">Afmelden</button>` : ""}
      ${!past && s.status !== "afgelast" && isCoordinator() ? `<button class="btn ghost" id="ssSub">Vervanger kiezen</button>` : ""}
      ${edit && s.override ? `<button class="btn ghost" id="ssRestore">Terug naar rooster</button>` : ""}
      ${edit ? `<button class="btn ghost" id="ssAction">+ Actiepunt</button>` : ""}
    </div>`;

    const e = $("#ssEdit", sh); if (e) e.onclick = () => openOverrideForm(s);
    const r = $("#ssRule", sh); if (r) r.onclick = () => openRuleForm({ rule });
    const c = $("#ssCancel", sh); if (c) c.onclick = () => openCancelForm(s);
    const rs = $("#ssRestore", sh); if (rs) rs.onclick = async () => { const ov = store.rows("overrides").find(o => o.rule_id === s.rule_id && o.date === s.orig_date); if (ov) await store.remove("overrides", ov.id); toast("Terug naar het rooster"); refreshSheet(); };
    const a = $("#ssAction", sh); if (a) a.onclick = () => openActionForm({ link_group_id: s.group_id, text: "" });
    bindLog(sh, s, members);
    if (s.status !== "afgelast") bindLessonCard(sh, s);
    const ab = $("#ssAbsent", sh); if (ab) ab.onclick = () => openAbsentForm(s);
    const sb = $("#ssSub", sh); if (sb) sb.onclick = () => openSubstitutePicker(s, null);
    bindReplacementCard(sh, s);
  });
}

function logForm(s, members) {
  const l = s.log || { given: true, as_planned: true, count: null, worked_well: "", next_time: "" };
  const att = {}; store.rows("attendance").filter(a => a.session_key === s.key).forEach(a => att[a.member_id] = a.present);
  return `
    <div class="f2 stack"><div><label class="fld" style="margin-top:4px">Status</label><div class="seg dark" id="lgGiven"><button data-v="1" class="${l.given ? "on" : ""}">Gegeven</button><button data-v="0" class="${!l.given ? "on" : ""}">Niet gegeven</button></div></div>
    <div><label class="fld" style="margin-top:4px">Verloop</label><div class="seg dark" id="lgPlan"><button data-v="1" class="${l.as_planned ? "on" : ""}">Zoals gepland</button><button data-v="0" class="${!l.as_planned ? "on" : ""}">Afwijkend</button></div></div></div>
    ${members.length ? `<label class="fld">Aanwezigheid</label><div class="pick" id="lgAtt">${members.map(m => `<button data-id="${attr(m.id)}" class="${att[m.id] === false ? "" : "on"}">${esc(m.name)}</button>`).join("")}</div><div class="hint">Tik een naam om af- of aanwezig te zetten.</div>` : `<label class="fld">Aantal deelnemers</label><input class="in" id="lgCount" type="number" min="0" value="${l.count != null ? l.count : ""}" style="width:110px">`}
    <label class="fld">Wat werkte goed</label><textarea class="in" id="lgGood" style="min-height:56px">${esc(l.worked_well || "")}</textarea>
    <label class="fld">Voor volgende keer</label><textarea class="in" id="lgNext" style="min-height:56px">${esc(l.next_time || "")}</textarea>
    <div class="klvbtn" style="margin-top:12px"><button class="btn o" id="lgSave">${s.log ? "Log bijwerken" : "Log opslaan"}</button></div>`;
}
function bindLog(sh, s, members) {
  const btn = $("#lgSave", sh); if (!btn) return;
  const segs = ["lgGiven", "lgPlan"]; segs.forEach(id => { const el = $("#" + id, sh); if (el) el.onclick = e => { const b = e.target.closest("button"); if (!b) return; $$("button", el).forEach(x => x.classList.toggle("on", x === b)); }; });
  const attEl = $("#lgAtt", sh); if (attEl) attEl.onclick = e => { const b = e.target.closest("button"); if (b) b.classList.toggle("on"); };
  btn.onclick = async () => {
    const given = $("#lgGiven button.on", sh).dataset.v === "1", as_planned = $("#lgPlan button.on", sh).dataset.v === "1";
    let count = null;
    if (attEl) {
      const present = $$("button", attEl).map(b => ({ member_id: b.dataset.id, present: b.classList.contains("on") }));
      count = present.filter(p => p.present).length;
      for (const p of present) { const ex = store.rows("attendance").find(a => a.session_key === s.key && a.member_id === p.member_id); await store.save("attendance", { ...(ex || {}), id: ex ? ex.id : undefined, session_key: s.key, member_id: p.member_id, present: p.present, date: s.date }); }
    } else { const c = $("#lgCount", sh); count = c && c.value !== "" ? +c.value : null; }
    const row = { ...(s.log || {}), id: s.log ? s.log.id : undefined, session_key: s.key, rule_id: s.rule_id, date: s.date, coach_id: store.me.id, given, as_planned, count, worked_well: val("lgGood", sh), next_time: val("lgNext", sh), created: s.log ? s.log.created : new Date().toISOString() };
    await store.save("logs", row); toast("Log opgeslagen"); refreshSheet();
  };
}

/** Alleen dit voorkomen aanpassen: tijd, datum, locatie, coach, notitie. */
export function openOverrideForm(s) {
  const ex = store.rows("overrides").find(o => o.rule_id === s.rule_id && o.date === s.orig_date);
  const d = { id: ex ? ex.id : undefined, rule_id: s.rule_id, date: s.orig_date, status: ex && ex.status === "cancelled" ? "cancelled" : "gepland", new_date: s.date, van: s.van, tot: s.tot, location_id: s.location_id, coach_ids: s.coach_ids.slice(), note: s.note, reason: s.reason || "" };
  openSheet(sh => {
    const coaches = coachesActive(), locs = locationsSorted();
    sh.innerHTML = shead("Alleen deze keer aanpassen", esc(s.label) + " · " + fmtDateLong(s.orig_date)) + `
    <div class="card">
      <div class="f3"><div><label class="fld" style="margin-top:0">Datum</label><input class="in" id="ovDate" type="date" value="${attr(d.new_date)}"></div><div><label class="fld" style="margin-top:0">Van</label><input class="in" id="ovVan" type="time" value="${attr(d.van)}"></div><div><label class="fld" style="margin-top:0">Tot</label><input class="in" id="ovTot" type="time" value="${attr(d.tot)}"></div></div>
      <label class="fld">Locatie</label><select class="in" id="ovLoc"><option value="">—</option>${locs.map(l => `<option value="${attr(l.id)}" ${d.location_id === l.id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select>
      <label class="fld">Coach(es)</label><div class="pick" id="ovCoach">${coaches.map(c => `<button data-id="${attr(c.id)}" class="${d.coach_ids.includes(c.id) ? "on" : ""}">${avatar(c, "xs")}${esc(c.name.split(" ")[0])}</button>`).join("")}</div>
      <label class="fld">Reden (zichtbaar voor het team)</label><input class="in" id="ovReason" value="${attr(d.reason)}" placeholder="bv. vervanging, baan dicht">
      <label class="fld">Notitie voor deze keer</label><textarea class="in" id="ovNote" style="min-height:56px">${esc(d.note || "")}</textarea>
    </div>
    <div class="klvbtn"><button class="btn o" id="ovSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#ovCoach", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; const i = d.coach_ids.indexOf(b.dataset.id); if (i >= 0) d.coach_ids.splice(i, 1); else d.coach_ids.push(b.dataset.id); b.classList.toggle("on"); };
    $("#ovSave", sh).onclick = async () => {
      const nd = val("ovDate", sh) || s.orig_date;
      const row = { ...d, status: nd !== s.orig_date ? "moved" : "gepland", new_date: nd !== s.orig_date ? nd : null, van: val("ovVan", sh), tot: val("ovTot", sh), location_id: val("ovLoc", sh) || null, reason: val("ovReason", sh), note: val("ovNote", sh) };
      if (!row.id) delete row.id;
      await store.save("overrides", row); closeSheet(); toast("Aangepast voor deze keer"); refreshSheet();
      const txt = `${s.label} op ${fmtDateLong(s.orig_date)} is aangepast${row.status === "moved" ? " (verplaatst naar " + fmtDateLong(nd) + ")" : ""}${row.reason ? ": " + row.reason : ""}`;
      await notify(Array.from(new Set(s.coach_ids.concat(row.coach_ids))), "wijziging", txt, s.key);
    };
  });
}

export function openCancelForm(s) {
  const ex = store.rows("overrides").find(o => o.rule_id === s.rule_id && o.date === s.orig_date);
  openSheet(sh => {
    sh.innerHTML = shead("Afgelasten", esc(s.label) + " · " + fmtDateLong(s.date)) + `
    <div class="card"><label class="fld" style="margin-top:0">Reden</label><input class="in" id="ccReason" placeholder="bv. onweer, baan gesloten, te weinig deelnemers"><div class="hint">De betrokken coach(es) zien de reden bij de sessie.</div></div>
    <div class="klvbtn"><button class="btn" style="background:var(--bad)" id="ccGo">Afgelasten</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    $("#ccGo", sh).onclick = async () => { const reason = val("ccReason", sh); await store.save("overrides", { ...(ex || {}), id: ex ? ex.id : undefined, rule_id: s.rule_id, date: s.orig_date, status: "cancelled", reason }); closeSheet(); toast("Afgelast"); refreshSheet(); await notify(s.coach_ids, "afgelast", `${s.label} op ${fmtDateLong(s.date)} ${s.van} is afgelast${reason ? ": " + reason : ""}`, s.key); };
  });
}

export function openActionForm(init = {}) {
  const d = { id: init.id, coach_id: init.coach_id || store.me.id, text: init.text || "", date: init.date || todayISO(), done: !!init.done, link_group_id: init.link_group_id || null };
  openSheet(sh => {
    sh.innerHTML = shead(d.id ? "Actiepunt bewerken" : "Nieuw actiepunt", "", d.id ? xbtn("trash", 'id="acDel"', "danger") : "") + `
    <div class="card"><label class="fld" style="margin-top:0">Wat</label><input class="in" id="acText" value="${attr(d.text)}" placeholder="bv. ballen bestellen, ouders mailen">
    <div class="f2"><div><label class="fld">Uiterlijk</label><input class="in" id="acDate" type="date" value="${attr(d.date)}"></div>
    ${isCoordinator() ? `<div><label class="fld">Voor</label><select class="in" id="acWho">${coachesActive().map(c => `<option value="${attr(c.id)}" ${d.coach_id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>` : ""}</div>
    <label class="fld">Gekoppeld aan groep</label><select class="in" id="acGroup"><option value="">—</option>${store.rows("groups").map(g => `<option value="${attr(g.id)}" ${d.link_group_id === g.id ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></div>
    <div class="klvbtn"><button class="btn o" id="acSave">Opslaan</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    const del = $("#acDel", sh); if (del) del.onclick = async () => { await store.remove("action_items", d.id); closeSheet(); };
    $("#acSave", sh).onclick = async () => { const t = val("acText", sh); if (!t) { toast("Vul een omschrijving in"); return; } const who = $("#acWho", sh); await store.save("action_items", { ...d, id: d.id || undefined, text: t, date: val("acDate", sh) || null, coach_id: who ? who.value : d.coach_id, link_group_id: val("acGroup", sh) || null }); closeSheet(); toast("Actiepunt opgeslagen"); };
  });
}

/* ---------- Vervanging ---------- */
function replacementCardHtml(s) {
  const r = requestFor(s.key); if (!r) return "";
  const who = coachById(r.coach_id); const target = r.target_coach_id ? coachById(r.target_coach_id) : null; const me = store.me;
  return `<div class="card" style="border:1.5px solid var(--orange)"><div class="chead"><h2>Vervanging nodig</h2><span class="st att">open</span><span class="hdnote">${esc(who ? who.name : "")}</span></div>
    <div class="small">${esc(who ? who.name.split(" ")[0] : "Coach")} heeft zich afgemeld${r.reason ? ": " + esc(r.reason) : ""}.${target ? ` Gevraagd aan <b>${esc(target.name)}</b>.` : " Nog geen vervanger gevraagd."}</div>
    <div class="klvbtn" style="margin-top:10px">
      ${target && me && target.id === me.id ? `<button class="btn o" id="rqAccept">Ik neem het over</button><button class="btn ghost" id="rqDecline">Lukt niet</button>` : ""}
      ${isCoordinator() ? `<button class="btn ${target && me && target.id === me.id ? "ghost" : "o"}" id="rqPick">Vervanger kiezen</button>` : ""}
      ${me && r.coach_id === me.id ? `<button class="btn ghost" id="rqWithdraw">Afmelding intrekken</button>` : ""}
    </div></div>`;
}
function bindReplacementCard(sh, s) {
  const r = requestFor(s.key); if (!r) return;
  const acc = $("#rqAccept", sh); if (acc) acc.onclick = () => applySubstitute(s, r, store.me.id);
  const dec = $("#rqDecline", sh); if (dec) dec.onclick = async () => { await store.save("requests", { ...r, target_coach_id: null }); await notify([r.coach_id].concat(coachesActive().filter(c => c.is_coordinator).map(c => c.id)), "vervanging", `${store.me.name} kan ${s.label} op ${fmtDateLong(s.date)} niet overnemen`, s.key); toast("Doorgegeven"); refreshSheet(); };
  const pk = $("#rqPick", sh); if (pk) pk.onclick = () => openSubstitutePicker(s, r);
  const wd = $("#rqWithdraw", sh); if (wd) wd.onclick = async () => { await store.save("requests", { ...r, status: "withdrawn" }); toast("Afmelding ingetrokken"); refreshSheet(); };
}
async function applySubstitute(s, r, newCoachId) {
  const ex = store.rows("overrides").find(o => o.rule_id === s.rule_id && o.date === s.orig_date);
  const ids = s.coach_ids.filter(id => !r || id !== r.coach_id); if (!ids.includes(newCoachId)) ids.push(newCoachId);
  const row = { ...(ex || {}), id: ex ? ex.id : undefined, rule_id: s.rule_id, date: s.orig_date, status: ex && ex.status ? ex.status : "gepland", coach_ids: ids, reason: (ex && ex.reason) || (r ? "Vervanging voor " + ((coachById(r.coach_id) || {}).name || "").split(" ")[0] : "Vervanging") }; if (!row.id) delete row.id;
  await store.save("overrides", row);
  if (r) await store.save("requests", { ...r, status: "resolved", resolved_by: newCoachId });
  const nc = coachById(newCoachId);
  await notify([newCoachId], "vervanging", `Je staat ingepland als vervanger voor ${s.label} op ${fmtDateLong(s.date)} ${s.van}–${s.tot}${s.location ? " · " + s.location.name : ""}. De lesvoorbereiding en het laatste log staan bij de sessie.`, s.key);
  if (r) await notify([r.coach_id].concat(coachesActive().filter(c => c.is_coordinator).map(c => c.id)), "vervanging", `${nc ? nc.name : "Een collega"} neemt ${s.label} op ${fmtDateLong(s.date)} over`, s.key);
  toast((nc ? nc.name.split(" ")[0] : "Vervanger") + " ingepland"); refreshSheet();
}
export function openAbsentForm(s) {
  openSheet(sh => {
    const cands = candidates(s);
    sh.innerHTML = shead("Afmelden", esc(s.label) + " · " + fmtDateLong(s.date) + " " + s.van) + `
    <div class="card"><label class="fld" style="margin-top:0">Reden</label><input class="in" id="abReason" placeholder="bv. ziek, verhinderd">
      <label class="fld">Collega vragen (optioneel)</label><div class="hint" style="margin:0 0 6px">Beschikbaar op ${DAGEN[new Date(s.date).getDay()]} ${s.van}–${s.tot} staat bovenaan. Vraag je niemand, dan regelt de coördinator het.</div>
      <div class="pick" id="abTarget"><button data-id="" class="on">Coördinator regelt het</button>${cands.slice(0, 8).map(x => `<button data-id="${attr(x.c.id)}" ${x.clash.length ? 'title="heeft dan al een training"' : ""}>${avatar(x.c, "xs")}${esc(x.c.name.split(" ")[0])}${x.within ? "" : x.clash.length ? " ✕" : " ?"}</button>`).join("")}</div></div>
    <div class="klvbtn"><button class="btn o" id="abGo">Afmelden</button><button class="btn ghost" data-close>Annuleren</button></div>`;
    let target = "";
    $("#abTarget", sh).onclick = e => { const b = e.target.closest("button"); if (!b) return; target = b.dataset.id; $$("button", e.currentTarget).forEach(x => x.classList.toggle("on", x === b)); };
    $("#abGo", sh).onclick = async () => {
      const reason = val("abReason", sh);
      await store.save("requests", { type: "afmelding", session_key: s.key, rule_id: s.rule_id, date: s.date, coach_id: store.me.id, target_coach_id: target || null, reason, status: "open", created_at: new Date().toISOString() });
      const coords = coachesActive().filter(c => c.is_coordinator).map(c => c.id);
      await notify(coords, "vervanging", `${store.me.name} heeft zich afgemeld voor ${s.label} op ${fmtDateLong(s.date)} ${s.van}${reason ? ": " + reason : ""}${target ? " · gevraagd aan " + (coachById(target) || {}).name : " · vervanger nodig"}`, s.key);
      if (target) await notify([target], "vervanging", `${store.me.name} vraagt of je ${s.label} op ${fmtDateLong(s.date)} ${s.van}–${s.tot} kunt overnemen${reason ? " (" + reason + ")" : ""}.`, s.key);
      closeSheet(); toast("Afgemeld" + (target ? " en collega gevraagd" : " — coördinator is op de hoogte")); refreshSheet();
    };
  });
}
export function openSubstitutePicker(s, r) {
  openSheet(sh => {
    const cands = candidates(s);
    sh.innerHTML = shead("Vervanger kiezen", esc(s.label) + " · " + fmtDateLong(s.date) + " " + s.van + "–" + s.tot) + `
    <div class="card">${cands.map(x => `<div class="rij clk" data-c="${attr(x.c.id)}">${avatar(x.c, "sm")}<span class="grow"><div class="tt">${esc(x.c.name)}</div><div class="sub">${x.within ? "beschikbaar" : x.av ? "buiten standaardbeschikbaarheid (" + x.av[0] + "–" + x.av[1] + ")" : "normaal niet beschikbaar"}${x.clash.length ? ' · <span class="bad">al ingepland: ' + x.clash.map(y => esc(y.label) + " " + y.van).join(", ") + "</span>" : ""}${x.spec ? " · specialisatie past" : ""}</div></span><span class="st ${x.score >= 2 ? "good" : x.clash.length ? "bad" : ""}">${x.score >= 2 ? "geschikt" : x.clash.length ? "conflict" : "mogelijk"}</span></div>`).join("") || '<div class="empty">Geen andere coaches.</div>'}</div>
    ${r ? "" : '<div class="hint">De huidige coach(es) blijven staan; de vervanger komt erbij. Wil je iemand vervangen, meld die coach dan eerst af of pas de sessie aan via ✎.</div>'}`;
    sh.onclick = e => { const c = e.target.closest("[data-c]"); if (!c) return; closeSheet(); applySubstitute(s, r, c.dataset.c); };
  });
}
