// UI-hulpjes: escaping, sheets, toast, iconen.
export const $ = (sel, root) => (root || document).querySelector(sel);
export const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
export function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
export const attr = esc;

export const ICON = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  today: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  groups: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 19c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M15 14c3 0 5.5 1.5 6 4.5"/></svg>',
  drills: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4h12l-2 4 2 4H5"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c.6-4 3.6-6.5 8-6.5s7.4 2.5 8 6.5"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20h16M7 16v-5M12 16V7M17 16v-9"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
};
export const xbtn = (icon, attrs = "", cls = "") => `<button class="xbtn ${cls}" ${attrs}>${ICON[icon] || icon}</button>`;

/* ---------- Toast ---------- */
let toastT = null;
export function toast(msg) {
  let el = $("#toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2400);
}

/* ---------- Sheets (stapelbaar) ---------- */
const stack = [];
function wrap() {
  let w = $("#sheetwrap");
  if (!w) {
    w = document.createElement("div"); w.id = "sheetwrap"; w.className = "sheetwrap";
    w.innerHTML = '<div class="bg"></div><div class="sheet" id="sheet"></div>';
    document.body.appendChild(w);
    $(".bg", w).addEventListener("click", closeSheet);
  }
  return w;
}
/** Opent een sheet. render(el) vult de inhoud; wordt opnieuw aangeroepen bij refresh(). */
export function openSheet(render, opts = {}) {
  const w = wrap(); const sh = $("#sheet", w);
  const entry = { render, opts };
  if (opts.replace && stack.length) stack[stack.length - 1] = entry; else stack.push(entry);
  draw();
  w.classList.add("open"); document.body.style.overflow = "hidden";
}
function draw() {
  const sh = $("#sheet"); const top = stack[stack.length - 1]; if (!top) return;
  sh.className = "sheet" + (top.opts.wide ? " wide" : "");
  sh.innerHTML = ""; sh.scrollTop = 0;
  top.render(sh);
}
export function refreshSheet() { if (stack.length) draw(); }
export function closeSheet() {
  stack.pop();
  if (stack.length) { draw(); return; }
  const w = $("#sheetwrap"); if (w) w.classList.remove("open"); document.body.style.overflow = "";
}
export function closeAllSheets() { stack.length = 0; const w = $("#sheetwrap"); if (w) w.classList.remove("open"); document.body.style.overflow = ""; }
export function sheetOpen() { return stack.length > 0; }
/** Kop van een sheet met titel, subregel en ronde icoonknoppen. */
export function shead(title, sub, acts = "") {
  return `<div class="shead"><div><h2>${esc(title)}</h2>${sub ? `<div class="sx">${sub}</div>` : ""}</div><div class="acts">${acts}${xbtn("close", 'data-close')}</div></div>`;
}
document.addEventListener("click", e => { const b = e.target.closest("[data-close]"); if (b && b.closest("#sheet")) closeSheet(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && stack.length) closeSheet(); });

/** Eenvoudige bevestiging binnen de sheet (geen browser-dialoog). */
export function confirmInline(host, text, onYes, label = "Verwijderen") {
  const box = document.createElement("div"); box.className = "warn"; box.style.display = "flex"; box.style.gap = "10px"; box.style.alignItems = "center";
  box.innerHTML = `<span class="grow">${esc(text)}</span><button class="btn sm ghost" data-no>Annuleren</button><button class="btn sm" style="background:var(--bad)" data-yes>${esc(label)}</button>`;
  host.prepend(box);
  $("[data-no]", box).onclick = () => box.remove();
  $("[data-yes]", box).onclick = () => { box.remove(); onYes(); };
}

/* ---------- Kleine renderers ---------- */
export function avatar(coach, size = "") { if (!coach) return `<span class="avatar ${size}" style="background:var(--line);color:var(--muted)">?</span>`; const ini = (coach.name || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase(); return `<span class="avatar ${size}" title="${attr(coach.name)}" style="background:${attr(coach.color || "#7A7F85")}">${esc(ini)}</span>`; }
export function avatars(coaches, size = "sm") { return `<span class="row" style="gap:2px">${(coaches || []).map(c => avatar(c, size)).join("")}</span>`; }
export function kpi(items) { return `<div class="cvkpi">${items.map(([v, l, cls]) => `<span><b class="${cls || ""}">${v}</b><small>${esc(l)}</small></span>`).join("")}</div>`; }
export function tile(label, value, sub, cls = "", attrs = "") { return `<div class="tile ${cls}" ${attrs}><div class="lb">${esc(label)}</div><div class="v ${cls.includes("bad") ? "bad" : ""}">${value}</div>${sub != null ? `<div class="s">${sub}</div>` : ""}</div>`; }
export function searchPil(id, placeholder = "Zoek …", value = "") { return `<div class="searchpil">${ICON.search}<input id="${id}" placeholder="${attr(placeholder)}" value="${attr(value)}" autocomplete="off"></div>`; }
export function klsel(id, options, value, attrs = "") { return `<span class="klsel"><select id="${id}" ${attrs}>${options.map(([v, l]) => `<option value="${attr(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></span>`; }
export function seg(id, options, value, cls = "") { return `<div class="seg ${cls}" id="${id}">${options.map(([v, l]) => `<button data-v="${attr(v)}" class="${String(v) === String(value) ? "on" : ""}">${esc(l)}</button>`).join("")}</div>`; }
export function bindSeg(el, cb) { if (!el) return; el.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; $$("button", el).forEach(x => x.classList.toggle("on", x === b)); cb(b.dataset.v); }); }
export function toggleHtml(id, on) { return `<button class="toggle ${on ? "on" : ""}" id="${id}" role="switch" aria-checked="${on}"></button>`; }
export function bindToggle(el, cb) { if (!el) return; el.addEventListener("click", () => { const on = !el.classList.contains("on"); el.classList.toggle("on", on); el.setAttribute("aria-checked", on); cb(on); }); }
export function val(id, root) { const el = $("#" + id, root); return el ? el.value.trim() : ""; }

/** Lichte achtergrondtint van een kleur (voor kalenderblokken). */
export function tint(hex, a = 0.14) { const h = (hex || "#7A7F85").replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

export function debounce(fn, ms = 150) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function downloadText(name, text, type = "text/plain") { const b = new Blob([text], { type }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
