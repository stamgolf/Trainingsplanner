// Periodisering: profielen, fases (C@ddie-model), pieken (wedstrijden) en automatische fase-opbouw per profiel.
import { store } from "../store/index.js";
import { addDays, daysBetween, weekStart, todayISO } from "./dates.js";

// [key, naam, kleur, afkorting, mix techniek/skill/performance, standaardaccenten]
export const PHASES = [
  ["alg", "Algemene voorbereiding", "#1B4F9C", "AV", [60, 30, 10], { fullswing: 35, fysiek: 20, lageappr: 10, hogeappr: 10, putten: 10, spelen: 15 }],
  ["spec", "Specifieke voorbereiding", "#4E7EB8", "SV", [30, 50, 20], { lageappr: 15, hogeappr: 15, bunker: 10, putten: 20, spelen: 25, fullswing: 15 }],
  ["pre", "Pre-competitie", "#9A8FA8", "PC", [10, 30, 60], { spelen: 45, prestatiegedrag: 20, putten: 15, lageappr: 10, hogeappr: 10 }],
  ["taper", "Taper", "#D98A4E", "TP", [5, 25, 70], { spelen: 50, putten: 30, prestatiegedrag: 20 }],
  ["comp", "Wedstrijd", "#F47C20", "WE", [0, 10, 90], { spelen: 60, putten: 20, prestatiegedrag: 20 }],
  ["herstel", "Herstel", "#A8D5BA", "HE", [20, 30, 50], { fysiek: 50, spelen: 50 }],
  ["ond", "Onderhoud", "#A9C4D6", "OH", [25, 45, 30], { lageappr: 15, hogeappr: 15, fullswing: 25, putten: 15, spelen: 20, fysiek: 10 }],
  ["seizoen", "Speelseizoen", "#7FB2D9", "SZ", [20, 40, 40], { spelen: 40, putten: 15, lageappr: 15, hogeappr: 10, fullswing: 20 }],
  ["trans", "Transitie", "#C3CBD1", "TR", [10, 30, 60], { fysiek: 50, spelen: 50 }],
  ["onderbr", "Onderbreking", "#C2383A", "OB", [0, 0, 0], {}],
];
export const phaseDef = k => PHASES.find(p => p[0] === k) || null;
export const PROFILES = [
  ["beginner", "Beginner", "Geen periodisering, alleen thema's richting een doel (bv. Golfstart, Baanpermissie).", []],
  ["recreatief", "Recreatief", "AV → SV → Speelseizoen (april–september).", ["alg", "spec", "seizoen"]],
  ["competitief", "Competitief", "AV → SV → PC → wedstrijdblokken met onderhoud → transitie. Wedstrijden als B/C-pieken.", ["alg", "spec", "pre", "comp", "ond", "trans"]],
  ["selectie", "Selectie", "Als competitief, plus taper en herstel rond A-pieken; fases volgen de wedstrijdkalender.", ["alg", "spec", "pre", "taper", "comp", "herstel", "ond", "trans"]],
  ["topgolf", "Topgolf", "Alle fases, meerdere piekclusters, onderbrekingen.", PHASES.map(p => p[0])],
];
export const profileDef = k => PROFILES.find(p => p[0] === k) || PROFILES[1];
export const PEAK_LEVELS = [["A", "A · hoofddoel"], ["B", "B · belangrijk"], ["C", "C · wedstrijdtest"]];

export const DEFAULT_CFG = { alg: 8, spec: 4, pre: 2, trans: 2, taperDays: 6, herstelDays: 3, minOnd: 5, clusterGap: 3 };

/** Programma van een groep in een seizoen (één rij in programs). */
export function programFor(groupId, seasonId) { return store.rows("programs").find(p => p.group_id === groupId && p.season_id === seasonId) || null; }
export function newProgram(g, season) {
  return { group_id: g.id, season_id: season.id, profile: g.profile || "recreatief", goal: g.goal || "", mjop: g.mjop || "", notes: "", emphasis: {}, block_shares: [15, 35, 35, 15], locations: [], repeat_weeks: 6, fav_first: true, phases: [], peaks: [], locked: [], cfg: { ...DEFAULT_CFG } };
}

const uid = () => "p_" + Math.random().toString(36).slice(2, 9);
const mk = (type, start, end, extra = {}) => { const d = phaseDef(type); return { id: uid(), type, start, end, goal: extra.goal || "", mix: (d ? d[4] : [40, 40, 20]).slice(), accents: { ...(d ? d[5] : {}) }, ...extra }; };
const clampDate = (d, a, b) => d < a ? a : d > b ? b : d;

/**
 * Automatische periodisering. Geeft een lijst fases (aaneengesloten, binnen het seizoen).
 * peaks: [{date,end,level}] ; breaks worden niet uitgesneden (vakanties blijven zichtbaar in de kalender).
 */
export function buildPhases(profile, season, peaks, cfg = DEFAULT_CFG) {
  const S = season.start, E = season.end; const total = daysBetween(S, E) + 1;
  const out = [];
  if (profile === "beginner") return out;
  if (profile === "recreatief") {
    // speelseizoen = 1 april – 30 september binnen het seizoen; anders laatste 40 %
    const y = +S.slice(0, 4); let sz = `${y}-04-01`; if (sz < S) sz = `${y + 1}-04-01`; let szEnd = sz.slice(0, 4) + "-09-30"; if (szEnd > E) szEnd = E;
    if (sz > E) { sz = addDays(S, Math.round(total * 0.6)); szEnd = E; }
    const prep = daysBetween(S, sz); const algEnd = addDays(S, Math.round(prep * 0.6) - 1);
    out.push(mk("alg", S, algEnd, { goal: "Basis leggen: techniek en routine" }));
    out.push(mk("spec", addDays(algEnd, 1), addDays(sz, -1), { goal: "Toepassen: kort spel en spelen" }));
    out.push(mk("seizoen", sz, szEnd, { goal: "Spelen en onderhouden" }));
    if (szEnd < E) out.push(mk("trans", addDays(szEnd, 1), E, { goal: "Afbouwen en evalueren" }));
    return out;
  }
  // competitief / selectie / topgolf: pieken (binnen het seizoen) sturen
  const inS = (peaks || []).filter(p => p.date >= S && p.date <= E);
  const A = inS.filter(p => p.level === "A").sort((a, b) => a.date < b.date ? -1 : 1);
  const allP = inS.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const transWeeks = cfg.trans || 2; const transStart = addDays(E, -7 * transWeeks + 1);
  let firstComp = A[0] ? A[0].date : (allP[0] ? allP[0].date : null);
  if (!firstComp) { const y = +S.slice(0, 4); let d = `${y}-04-15`; if (d < S) d = `${y + 1}-04-15`; firstComp = d; }
  if (firstComp >= transStart) {
    // geen wedstrijdperiode in dit seizoen (bv. winterseizoen): alleen voorbereiding
    const algEnd = addDays(S, Math.round(total * 0.6) - 1); const specEnd = addDays(transStart, -1);
    out.push(mk("alg", S, algEnd, { goal: "Techniek en fysiek fundament" }));
    if (specEnd > algEnd) out.push(mk("spec", addDays(algEnd, 1), specEnd, { goal: "Scoren rond de green, spelvormen" }));
    out.push(mk("trans", transStart, E, { goal: "Afbouwen, evalueren, nieuwe doelen" }));
    return out;
  }
  const preStart = addDays(firstComp, -7 * (cfg.pre || 2));
  const specStart = addDays(preStart, -7 * (cfg.spec || 4));
  const algEnd = addDays(specStart, -1);
  out.push(mk("alg", S, clampDate(algEnd, S, E), { goal: "Techniek en fysiek fundament" }));
  if (specStart < preStart) out.push(mk("spec", clampDate(specStart, S, E), clampDate(addDays(preStart, -1), S, E), { goal: "Scoren rond de green, spelvormen" }));
  const comps = profile === "competitief" ? allP.filter(p => p.level !== "C") : A;
  const useTaper = profile === "selectie" || profile === "topgolf";
  const firstTaper = useTaper && comps.length ? addDays(comps[0].date, -(cfg.taperDays || 6)) : null;
  out.push(mk("pre", clampDate(preStart, S, E), clampDate(addDays(firstTaper || firstComp, -1), S, E), { goal: "Wedstrijdroutines en strategie" }));
  // wedstrijdblokken
  let cursor = firstTaper || firstComp;
  if (!comps.length) { // seizoensblok zonder pieken
    const end = addDays(transStart, -1);
    out.push(mk("comp", cursor, clampDate(end, S, E), { goal: "Wedstrijden spelen" }));
  } else {
    comps.forEach((p, i) => {
      const pEnd = p.end && p.end > p.date ? p.end : p.date;
      if (useTaper) {
        const tStart = addDays(p.date, -(cfg.taperDays || 6));
        if (tStart > cursor) { out.push(mk("ond", cursor, addDays(tStart, -1), { goal: "Niveau vasthouden" })); }
        out.push(mk("taper", clampDate(tStart < cursor ? cursor : tStart, S, E), addDays(p.date, -1), { goal: "Scherp en uitgerust aan de start" }));
        out.push(mk("comp", p.date, clampDate(pEnd, S, E), { goal: p.name || "Wedstrijd" }));
        const hEnd = addDays(pEnd, cfg.herstelDays || 3);
        out.push(mk("herstel", addDays(pEnd, 1), clampDate(hEnd, S, E), { goal: "Bijkomen en evalueren" }));
        cursor = addDays(hEnd, 1);
      } else {
        if (p.date > cursor) out.push(mk("ond", cursor, addDays(p.date, -1), { goal: "Onderhoud tussen wedstrijden" }));
        out.push(mk("comp", p.date, clampDate(pEnd, S, E), { goal: p.name || "Wedstrijd" }));
        cursor = addDays(pEnd, 1);
      }
    });
    if (cursor < transStart) out.push(mk("ond", cursor, addDays(transStart, -1), { goal: "Onderhoud" }));
  }
  if (transStart > S) out.push(mk("trans", clampDate(transStart, S, E), E, { goal: "Afbouwen, evalueren, nieuwe doelen" }));
  // opschonen: lege/omgekeerde fases weg, samenvoegen opeenvolgende ond
  const clean = out.filter(p => p.start <= p.end && p.end >= S && p.start <= E).map(p => ({ ...p, start: clampDate(p.start, S, E), end: clampDate(p.end, S, E) })).filter(p => ["comp", "taper", "herstel"].includes(p.type) || daysBetween(p.start, p.end) >= 6);
  const merged = []; clean.forEach(p => { const last = merged[merged.length - 1]; if (last && last.type === p.type && addDays(last.end, 1) >= p.start) last.end = p.end; else merged.push(p); });
  if (merged.length && merged[0].start > S) merged[0].start = S;
  for (let i = 1; i < merged.length; i++) if (merged[i].start > addDays(merged[i - 1].end, 1)) merged[i].start = addDays(merged[i - 1].end, 1);
  return merged;
}

/** Fase die op een datum geldt. */
export function phaseAt(program, date) { return (program && program.phases || []).find(p => date >= p.start && date <= p.end) || null; }
/** Piek op/rond een datum. */
export function peakAt(program, date) { return (program && program.peaks || []).find(p => date >= p.date && date <= (p.end || p.date)) || null; }

/** Thema-sjablonen per profiel: naam, weken, focus, lesdoel. Worden over de fases gelegd. */
export const THEME_TEMPLATES = {
  beginner: [["Kennismaking & putten", 2, ["putten"], "Putter leren hanteren, afstandsgevoel"], ["Chippen", 2, ["lageappr"], "Chip met één club op de green"], ["Volle swing basis", 3, ["fullswing"], "Set-up en contact met ijzer 7"], ["Pitchen & bunker", 2, ["hogeappr", "bunker"], "Bal over een hindernis spelen"], ["Spelen op de baan", 2, ["spelen"], "Etiquette, tempo en eerste holes"], ["Herhaling & test", 1, ["putten", "lageappr", "fullswing"], "Alles samen"]],
  recreatief: { alg: [["Putten & chippen", 4, ["putten", "lageappr"], "Vaste routine en afstandsgevoel"], ["Full swing basis", 4, ["fullswing"], "Solide set-up en contact"], ["Pitchen & bunker", 3, ["hogeappr", "bunker"], "Hoge ballen met vertrouwen"]], spec: [["Scoren rond de green", 3, ["lageappr", "putten"], "Up & down"], ["Spelvormen", 3, ["spelen"], "Strategie en scoren"]], seizoen: [["Baan & strategie", 6, ["spelen", "putten"], "Zelfstandig spelen"], ["Onderhoud techniek", 4, ["fullswing", "lageappr"], "Niveau vasthouden"], ["Spelen & scoren", 6, ["spelen"], "Hcp verbeteren"]], trans: [["Evaluatie", 2, ["spelen"], "Terugblik en nieuwe doelen"]] },
  competitief: { alg: [["Techniek lange slag", 6, ["fullswing", "driving"], "Swingaanpassingen vastzetten"], ["Kort spel & fysiek", 6, ["lageappr", "hogeappr", "fysiek"], "Techniek kort spel, kracht en mobiliteit"], ["Distance wedges", 4, ["distwedge"], "Afstandscontrole 30–90 m"]], spec: [["Scoren rond de green", 4, ["lageappr", "hogeappr", "bunker", "putten"], "Up & down percentage omhoog"]], pre: [["Wedstrijdroutines", 2, ["spelen", "prestatiegedrag"], "Routines en strategie"]], comp: [["Wedstrijd", 1, ["spelen"], "Presteren"]], ond: [["Onderhoud · strategie", 4, ["spelen", "putten"], "Niveau vasthouden"], ["Onderhoud · techniek", 4, ["fullswing", "lageappr"], "Kleine aanpassingen"]], trans: [["Evaluatie & nieuwe doelen", 2, ["spelen", "prestatiegedrag"], "Terugblik"]] },
};
THEME_TEMPLATES.selectie = { ...THEME_TEMPLATES.competitief, taper: [["Taper", 1, ["putten", "spelen"], "Scherp aan de start"]], herstel: [["Herstel", 1, ["fysiek"], "Bijkomen"]] };
THEME_TEMPLATES.topgolf = THEME_TEMPLATES.selectie;
export const THEME_COLORS = ["#F47C20", "#4A6FA5", "#17a05c", "#8E6BB5", "#2A9D8F", "#B5832A", "#C2383A", "#7A7F85"];

/** Thema's genereren over de fases (of over het seizoen bij beginner). Geeft rows voor group_themes. */
export function buildThemes(program, season, groupId) {
  const tpl = THEME_TEMPLATES[program.profile] || THEME_TEMPLATES.recreatief; const out = []; let ci = 0;
  const push = (name, start, weeks, focus, goal, phaseId) => { out.push({ group_id: groupId, name, start, weeks, focus_cats: focus, goal, color: THEME_COLORS[ci++ % THEME_COLORS.length], phase_id: phaseId || null }); };
  if (program.profile === "beginner" || !program.phases.length) {
    let d = weekStart(season.start); const list = Array.isArray(tpl) ? tpl : [].concat(...Object.values(tpl));
    for (const t of list) { if (d > season.end) break; push(t[0], d, t[1], t[2], t[3], null); d = addDays(d, t[1] * 7); }
    return out;
  }
  program.phases.forEach(ph => {
    const list = tpl[ph.type] || []; if (!list.length) return;
    const weeks = Math.max(1, Math.round((daysBetween(ph.start, ph.end) + 1) / 7)); let d = ph.start; let left = weeks; let i = 0;
    while (left > 0 && list.length) { const t = list[i % list.length]; const w = Math.min(t[1], left); push(t[0], d, w, t[2], t[3], ph.id); d = addDays(d, w * 7); left -= w; i++; if (i > 20) break; }
  });
  return out;
}
