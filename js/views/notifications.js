// Meldingen: belletje in de kop, lijst met tik-door naar de sessie.
import { store } from "../store/index.js";
import { $, esc, attr, openSheet, closeSheet, shead, ICON } from "../lib/ui.js";
import { myNotifications, markRead, markAllRead, unreadCount } from "../lib/notify.js";
import { openSession } from "./session.js";

const TYPE_ICON = { vervanging: "groups", wijziging: "cal", afgelast: "close", actie: "check", info: "flag" };
function ago(iso) { const d = (Date.now() - new Date(iso).getTime()) / 60000; if (d < 1) return "zojuist"; if (d < 60) return Math.round(d) + " min"; if (d < 1440) return Math.round(d / 60) + " u"; return Math.round(d / 1440) + " d"; }

export function openNotifications() {
  openSheet(sh => {
    const list = myNotifications();
    sh.innerHTML = shead("Meldingen", `${unreadCount()} ongelezen`, list.some(n => !n.read) ? `<button class="btn sm ghost" id="nfAll">Alles gelezen</button>` : "") + `
    <div class="card">${list.length ? list.slice(0, 60).map(n => `<div class="rij clk ${n.read ? "" : ""}" data-n="${attr(n.id)}" style="${n.read ? "opacity:.65" : ""}"><span class="avatar sm" style="background:${n.read ? "var(--paper)" : "#FDE9DA"};color:${n.read ? "var(--muted)" : "var(--orange)"}">${ICON[TYPE_ICON[n.type] || "flag"]}</span><span class="grow"><div class="tt" style="font-weight:${n.read ? 500 : 600}">${esc(n.text)}</div><div class="sub">${ago(n.created_at)} geleden</div></span>${n.link ? '<span class="chev">›</span>' : ""}</div>`).join("") : '<div class="empty">Geen meldingen.</div>'}</div>`;
    const all = $("#nfAll", sh); if (all) all.onclick = async () => { await markAllRead(); };
    sh.onclick = async e => { const r = e.target.closest("[data-n]"); if (!r) return; const n = store.byId("notifications", r.dataset.n); await markRead(n.id); if (n.link && n.link.includes("_")) { closeSheet(); openSession(n.link); } };
  });
}
