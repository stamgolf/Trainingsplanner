// PDF-export van een lesvoorbereiding (A4, Albert Sans) met pdf-lib.
import { store, membersOf } from "../store/index.js";
import { fmtDateLong } from "./dates.js";
import { PHASES, phaseLabel, materialOf } from "./generator.js";

let libP = null;
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); }); }
export function loadPdfLib() {
  if (libP) return libP;
  libP = loadScript("lib/pdf-lib.min.js").then(() => loadScript("lib/fontkit.umd.min.js")).then(() => Promise.all(["fonts/AlbertSans-Regular.ttf", "fonts/AlbertSans-SemiBold.ttf"].map(f => fetch(f).then(r => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })))).then(([reg, semi]) => ({ reg, semi }));
  return libP;
}

const ORANGE = [0.957, 0.486, 0.125], INK = [0.169, 0.184, 0.2], MUTED = [0.478, 0.498, 0.522], LINE = [0.902, 0.91, 0.918], PAPER = [0.949, 0.953, 0.961];
const rgb = a => window.PDFLib.rgb(a[0], a[1], a[2]);

function wrap(text, font, size, width) {
  const out = []; String(text || "").split(/\n/).map(x => x.trim()).filter(Boolean).forEach(par => { let line = ""; par.split(/\s+/).forEach(w => { const t = line ? line + " " + w : w; if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t; }); out.push(line); }); return out;
}

/** Maakt de PDF en geeft de bytes terug. */
export async function lessonPdf(s, plan) {
  const { reg, semi } = await loadPdfLib();
  const { PDFDocument } = window.PDFLib;
  const doc = await PDFDocument.create(); doc.registerFontkit(window.fontkit);
  const F = await doc.embedFont(reg, { subset: true }), B = await doc.embedFont(semi, { subset: true });
  const W = 595.28, H = 841.89, M = 44; let page = doc.addPage([W, H]); let y = H - M;
  const cfg = window.TP_CONFIG || {};
  const text = (t, x, size, font = F, color = INK) => page.drawText(String(t), { x, y, size, font, color: rgb(color) });
  const line = () => { page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: .6, color: rgb(LINE) }); };
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const ensure = n => { if (y - n < M + 20) newPage(); };
  const para = (t, size, font = F, color = INK, x = M, width = W - 2 * M, lh = 1.4) => { wrap(t, font, size, width).forEach(l => { ensure(size * lh); text(l, x, size, font, color); y -= size * lh; }); };

  // kop
  page.drawRectangle({ x: M, y: y - 26, width: 26, height: 26, color: rgb(ORANGE) }); page.drawText("T", { x: M + 7.5, y: y - 19, size: 15, font: B, color: rgb([1, 1, 1]) });
  text(cfg.appName || "Trainingsplanner", M + 34, 12, B); y -= 12; text(cfg.organisation || "", M + 34, 9, F, MUTED); y -= 26;
  const title = s.group ? s.group.name : s.label;
  text(title, M, 20, B); y -= 22;
  const sub = `${fmtDateLong(s.date)} · ${s.van}–${s.tot} · ${s.minutes} min · ${s.location ? s.location.name : "—"} · ${s.coaches.length ? s.coaches.map(c => c.name).join(", ") : "geen coach"}`;
  text(sub, M, 10.5, F, MUTED); y -= 18; line(); y -= 14;
  // thema/lesdoel tegels
  const tiles = [["THEMA", plan.thema || "—"], ["LESDOEL", plan.lesdoel || "—"], ["GROEP", s.group ? [s.group.level, s.group.age ? s.group.age + " jr" : "", membersOf(s.group.id).length + " leden"].filter(Boolean).join(" · ") : "—"]];
  const tw = (W - 2 * M - 16) / 3; let tx = M;
  const th = Math.max(...tiles.map(([, v]) => wrap(v, F, 10, tw - 16).length)) * 13 + 30;
  tiles.forEach(([l, v]) => { page.drawRectangle({ x: tx, y: y - th, width: tw, height: th, color: rgb(PAPER), borderWidth: 0 }); page.drawText(l, { x: tx + 8, y: y - 14, size: 7.5, font: B, color: rgb(MUTED) }); let yy = y - 28; wrap(v, F, 10, tw - 16).forEach(ln => { page.drawText(ln, { x: tx + 8, y: yy, size: 10, font: F, color: rgb(INK) }); yy -= 13; }); tx += tw + 8; });
  y -= th + 16;
  // blokken
  let t = 0;
  (plan.blocks || []).forEach((b, i) => {
    const d = b.drill_id ? store.byId("drills", b.drill_id) : null; const name = d ? d.title : (b.title || phaseLabel(b.phase));
    const exec = d ? d.exec : ""; const goal = d ? d.goal : "";
    const lines = wrap(exec, F, 9.5, W - 2 * M - 70); const need = 30 + Math.min(lines.length, 12) * 12.5 + (b.note ? 14 : 0) + (goal ? 13 : 0);
    ensure(need);
    page.drawRectangle({ x: M, y: y - 4, width: 3, height: 16, color: rgb(ORANGE) });
    text(`${phaseLabel(b.phase).toUpperCase()}`, M + 10, 7.5, B, MUTED); text(`${b.minutes} min`, W - M - 60, 9, B, INK); page.drawText(`${minToClock(s.van, t)}`, { x: W - M - 110, y, size: 9, font: F, color: rgb(MUTED) }); y -= 13;
    text(name, M + 10, 12.5, B); y -= 15;
    if (goal) { const gl = wrap(goal, F, 9, W - 2 * M - 70); text(gl[0] + (gl.length > 1 ? " …" : ""), M + 10, 9, F, MUTED); y -= 12; }
    lines.slice(0, 12).forEach(ln => { text(ln, M + 10, 9.5); y -= 12.5; }); if (lines.length > 12) { text("…", M + 10, 9.5, F, MUTED); y -= 12; }
    if (b.note) { text("Notitie: " + b.note, M + 10, 9, F, ORANGE); y -= 13; }
    if (d && (d.material || []).length) { text("Materiaal: " + d.material.join(", "), M + 10, 8.5, F, MUTED); y -= 12; }
    y -= 6; line(); y -= 10; t += b.minutes;
  });
  const mat = materialOf(plan);
  if (mat.length || plan.notitie) { ensure(60); if (mat.length) { text("MATERIAAL", M, 7.5, B, MUTED); y -= 12; para(mat.join(" · "), 9.5); y -= 6; } if (plan.notitie) { text("NOTITIES", M, 7.5, B, MUTED); y -= 12; para(plan.notitie, 9.5); } }
  // voet
  doc.getPages().forEach((p, i) => { p.drawText(`${title} · ${fmtDateLong(s.date)} · pagina ${i + 1}/${doc.getPageCount()}`, { x: M, y: 24, size: 7.5, font: F, color: rgb(MUTED) }); });
  return await doc.save();
}
function minToClock(van, add) { const [h, m] = van.split(":").map(Number); const t = h * 60 + m + add; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); }

export function openPdf(bytes, name) {
  const blob = new Blob([bytes], { type: "application/pdf" }); const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function downloadPdf(bytes, name) { const blob = new Blob([bytes], { type: "application/pdf" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
