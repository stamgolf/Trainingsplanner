// Losse activiteiten en events: wedstrijden, clinics, overleg, overig — eenmalig of terugkerend.
import { store, isCoordinator, coachById, locById } from "../store/index.js";
import { $, esc, attr, kpi, klsel, avatars, ICON } from "../lib/ui.js";
import { todayISO, addDays, fmtDate, DAGEN, fmtRange } from "../lib/dates.js";
import { sessionsIn, hoursOf } from "../lib/model.js";
import { describe } from "../lib/recur.js";
import { openSession } from "./session.js";
import { openRuleForm } from "./ruleform.js";
import { groupByDay } from "./today.js";

const st = { type: "", mine: false };

export function render(main) {
  const today = todayISO(); const me = store.me;
  const filter = { kind: "activity" }; if (st.type) filter.type_id = st.type; if (st.mine) filter.coach_id = me.id;
  const upcoming = sessionsIn(today, addDays(today, 120), filter);
  const past = sessionsIn(addDays(today, -60), addDays(today, -1), filter).reverse();
  const rules = store.rows("schedule_rules").filter(r => r.kind === "activity" && !r.archived && (!st.type || r.type_id === st.type) && (!st.mine || (r.coach_ids || []).includes(me.id)) && r.freq !== "once");
  const types = store.rows("activity_types").slice().sort((a, b) => a.order - b.order);
  main.innerHTML = `
  <div class="spkop"><h1>Activiteiten</h1>
    ${klsel("acType", [["", "Alle typen"]].concat(types.map(t => [t.id, t.name])), st.type)}
    ${kpi([[upcoming.filter(s => s.status !== "afgelast").length, "komend"], [upcoming.filter(s => s.isMatch).length, "wedstrijden", "att"], [rules.length, "terugkerend"]])}
    <div class="right"><div class="seg" id="acMine"><button data-v="0" class="${!st.mine ? "on" : ""}">Alle</button><button data-v="1" class="${st.mine ? "on" : ""}">Mijn</button></div><button class="plusbtn" id="acAdd" title="Nieuwe activiteit">+</button></div>
  </div>
  <div class="grid">
    <div class="card fixed" style="height:520px"><div class="chead"><h2>Komende activiteiten</h2><span class="cvn">${upcoming.length}</span><span class="hdnote">4 maanden</span></div><div class="cbody">${upcoming.length ? groupByDay(upcoming) : '<div class="empty">Geen activiteiten gepland. Voeg een wedstrijd, clinic of overleg toe met +.</div>'}</div></div>
    <div>
      <div class="card" style="margin-bottom:14px"><div class="chead"><h2>Terugkerend</h2><span class="cvn">${rules.length}</span><span class="hdnote">${isCoordinator() ? "tik om te bewerken" : ""}</span></div>
        ${rules.length ? rules.map(r => { const t = store.byId("activity_types", r.type_id); return `<div class="rij clk" data-rule="${attr(r.id)}"><span class="bar" style="background:${attr(r.type_id === "at_wedstrijd" ? "#F47C20" : (t || {}).color)}"></span><span class="grow"><div class="tt">${esc(r.title)}</div><div class="sub">${esc(describe(r, DAGEN))} · ${r.van}–${r.tot} · ${esc((locById(r.location_id) || {}).name || "—")}${r.end ? " · t/m " + fmtDate(r.end) : ""}</div></span><span class="val">${avatars((r.coach_ids || []).map(coachById).filter(Boolean), "xs")}<span class="chev">›</span></span></div>`; }).join("") : '<div class="empty">Geen terugkerende activiteiten.</div>'}</div>
      <div class="card fixed" style="height:300px"><div class="chead"><h2>Afgelopen</h2><span class="cvn">${past.length}</span><span class="hdnote">60 dagen</span></div><div class="cbody">${past.length ? groupByDay(past) : '<div class="empty">—</div>'}</div></div>
    </div>
  </div>`;
  $("#acType", main).onchange = e => { st.type = e.target.value; render(main); };
  $("#acMine", main).onclick = e => { const b = e.target.closest("button"); if (!b) return; st.mine = b.dataset.v === "1"; render(main); };
  $("#acAdd", main).onclick = () => openRuleForm({ kind: "activity" });
  main.onclick = e => {
    const r = e.target.closest("[data-rule]"); if (r) { const rule = store.byId("schedule_rules", r.dataset.rule); if (isCoordinator() || (rule.coach_ids || []).includes(store.me.id)) openRuleForm({ rule }); return; }
    const k = e.target.closest("[data-key]"); if (k) openSession(k.dataset.key);
  };
}
