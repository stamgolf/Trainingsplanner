// Voorbeelddata voor de demo-modus. Alle personen zijn fictief.
import { DRILLS_SEED } from "./drills_seed.js";

const C = (id, name, email, opts = {}) => ({
  id, name, email, phone: "", color: opts.color || "#7A7F85", is_coordinator: !!opts.coord, is_coach: opts.coach !== false,
  specialisaties: opts.spec || [], active: true, user_id: null,
  availability: opts.avail || { 1: ["09:00", "21:00"], 2: ["09:00", "21:00"], 3: ["09:00", "21:00"], 4: ["09:00", "21:00"], 5: ["09:00", "21:00"], 6: ["08:00", "17:00"], 0: null },
});

export const COACHES = [
  C("c_tom", "Tom Stam", "tom@almeerderhout.nl", { coord: true, color: "#F47C20", spec: ["jeugd", "competitie", "putten"] }),
  C("c_sanne", "Sanne de Vries", "sanne@almeerderhout.nl", { color: "#4A6FA5", spec: ["jeugd", "beginners"] }),
  C("c_mark", "Mark Jansen", "mark@almeerderhout.nl", { color: "#17a05c", spec: ["competitie", "full swing"] }),
  C("c_lisa", "Lisa Bakker", "lisa@almeerderhout.nl", { coord: true, color: "#8E6BB5", spec: ["beginners", "dames"] }),
  C("c_daan", "Daan Visser", "daan@almeerderhout.nl", { color: "#C2383A", spec: ["jeugd", "fysiek"] }),
  C("c_eva", "Eva Mulder", "eva@almeerderhout.nl", { color: "#2A9D8F", spec: ["short game", "senioren"] }),
];

export const LOCATIONS = [
  { id: "loc_baan", name: "Grote baan", short: "Baan", type: "baan", shared: true, capacity: 4, order: 1 },
  { id: "loc_par3", name: "Par-3 baan", short: "Par-3", type: "baan", shared: true, capacity: 2, order: 2 },
  { id: "loc_short", name: "Short game", short: "Short game", type: "oefen", shared: false, capacity: 1, order: 3 },
  { id: "loc_putt", name: "Puttinggreen", short: "Putting", type: "oefen", shared: false, capacity: 1, order: 4 },
  { id: "loc_kunst", name: "Kunstgrasgreen", short: "Kunstgras", type: "oefen", shared: false, capacity: 1, order: 5 },
  { id: "loc_range", name: "Driving range", short: "Range", type: "oefen", shared: true, capacity: 3, order: 6 },
  { id: "loc_gym", name: "Gym", short: "Gym", type: "indoor", shared: false, capacity: 1, order: 7 },
  { id: "loc_extern", name: "Extern", short: "Extern", type: "extern", shared: true, capacity: 9, order: 8 },
  { id: "loc_anders", name: "Anders", short: "Anders", type: "anders", shared: true, capacity: 9, order: 9 },
];

export const GROUP_TYPES = [
  { id: "gt_jeugd", name: "Jeugd", color: "#F47C20", order: 1 },
  { id: "gt_comp", name: "Competitie", color: "#4A6FA5", order: 2 },
  { id: "gt_begin", name: "Beginnerscursus", color: "#17a05c", order: 3 },
  { id: "gt_volw", name: "Volwassenen", color: "#8E6BB5", order: 4 },
  { id: "gt_pers", name: "Personeelsles", color: "#2A9D8F", order: 5 },
  { id: "gt_overig", name: "Overig", color: "#7A7F85", order: 6 },
];

export const ACTIVITY_TYPES = [
  { id: "at_training", name: "Training", color: "#7A7F85", order: 1 },
  { id: "at_wedstrijd", name: "Wedstrijd", color: "#F47C20", order: 2 },
  { id: "at_clinic", name: "Clinic", color: "#2A9D8F", order: 3 },
  { id: "at_overleg", name: "Overleg", color: "#8E6BB5", order: 4 },
  { id: "at_cursus", name: "Cursus", color: "#17a05c", order: 5 },
  { id: "at_overig", name: "Overig", color: "#C2383A", order: 6 },
];

export const SEASONS = [
  { id: "s_zomer26", name: "Zomer 2026", start: "2026-04-01", end: "2026-10-04" },
  { id: "s_winter26", name: "Winter 2026-27", start: "2026-10-05", end: "2027-03-28" },
];
export const BREAKS = [
  { id: "b_herfst", season_id: "s_winter26", name: "Herfstvakantie", start: "2026-10-17", end: "2026-10-25" },
  { id: "b_kerst", season_id: "s_winter26", name: "Kerstvakantie", start: "2026-12-19", end: "2027-01-03" },
  { id: "b_voorjaar", season_id: "s_winter26", name: "Voorjaarsvakantie", start: "2027-02-20", end: "2027-02-28" },
];

const G = (id, name, type_id, opts) => ({
  id, name, type_id, profile: opts.profile || (type_id === "gt_begin" ? "beginner" : type_id === "gt_comp" ? "competitief" : "recreatief"), goal: opts.goal || "", mjop: opts.mjop || "", level: opts.level || "", age: opts.age || "", max: opts.max || 8, location_id: opts.loc || null,
  season_id: opts.season || "s_winter26", coach_ids: opts.coaches || [], description: opts.desc || "", active: true, is_course: !!opts.course,
});
export const GROUPS = [
  G("g_birdies_wo", "Jeugd Birdies (6-9) woensdag", "gt_jeugd", { age: "6-9", level: "Kennismaking", loc: "loc_short", coaches: ["c_sanne", "c_daan"], profile: "beginner", mjop: "F1" }),
  G("g_eagles_wo", "Jeugd Eagles (10-12) woensdag", "gt_jeugd", { age: "10-12", level: "Baanpermissie", loc: "loc_range", coaches: ["c_tom"], goal: "Baanpermissie en hcp 54", mjop: "F3" }),
  G("g_albatros_wo", "Jeugd Albatros (13-17) woensdag", "gt_jeugd", { age: "13-17", level: "hcp 54-36", loc: "loc_range", coaches: ["c_mark"] }),
  G("g_birdies_za", "Jeugd Birdies (6-9) zaterdag", "gt_jeugd", { age: "6-9", level: "Kennismaking", loc: "loc_kunst", coaches: ["c_daan"] }),
  G("g_eagles_za", "Jeugd Eagles (10-12) zaterdag", "gt_jeugd", { age: "10-12", level: "Baanpermissie", loc: "loc_range", coaches: ["c_sanne"] }),
  G("g_jeugdsel", "Jeugdselectie", "gt_comp", { age: "12-18", level: "Competitie competitief", loc: "loc_baan", coaches: ["c_tom", "c_mark"], max: 10, profile: "selectie", goal: "Top 3 NGF Jeugdtour", mjop: "A2" }),
  G("g_heren1", "Competitie Heren 1", "gt_comp", { level: "Competitie competitief", loc: "loc_range", coaches: ["c_mark"], max: 10 }),
  G("g_dames1", "Competitie Dames 1", "gt_comp", { level: "Competitie recreatief", loc: "loc_short", coaches: ["c_lisa"], max: 10 }),
  G("g_begin_okt", "Beginnerscursus oktober", "gt_begin", { level: "Kennismaking", loc: "loc_range", coaches: ["c_lisa"], course: true, desc: "8 lessen, maandagavond" }),
  G("g_begin_nov", "Beginnerscursus november", "gt_begin", { level: "Kennismaking", loc: "loc_range", coaches: ["c_sanne"], course: true, desc: "8 lessen, zaterdagmiddag" }),
  G("g_pers", "Personeelsles", "gt_pers", { level: "Gemengd", loc: "loc_range", coaches: ["c_eva"], max: 6 }),
  G("g_volw_do", "Volwassenen hcp 54-36", "gt_volw", { level: "hcp 54-36", loc: "loc_short", coaches: ["c_eva"] }),
  G("g_senioren", "Senioren dinsdag", "gt_volw", { level: "Gemengd", loc: "loc_short", coaches: ["c_eva"] }),
  G("g_ladies", "Ladies day", "gt_volw", { level: "hcp 36-18", loc: "loc_range", coaches: ["c_lisa"] }),
];

const R = (id, group_id, weekdays, van, tot, opts = {}) => {
  const g = GROUPS.find(x => x.id === group_id);
  return {
    id, kind: "group", group_id, type_id: opts.type || "at_training", title: opts.title || "",
    freq: opts.freq || "weekly", interval: 1, weekdays, nth: null, dates: null,
    start: opts.start || "2026-10-05", end: opts.end === undefined ? "2027-03-28" : opts.end, count: opts.count || null,
    van, tot, location_id: opts.loc || (g ? g.location_id : null), coach_ids: opts.coaches || (g ? g.coach_ids : []),
    note: opts.note || "", season_id: "s_winter26", skip_breaks: opts.skip_breaks !== false, archived: false,
  };
};
export const RULES = [
  R("r_birdies_wo", "g_birdies_wo", [3], "15:30", "16:30"),
  R("r_eagles_wo", "g_eagles_wo", [3], "16:30", "17:45"),
  R("r_albatros_wo", "g_albatros_wo", [3], "18:00", "19:30"),
  R("r_birdies_za", "g_birdies_za", [6], "10:00", "11:00"),
  R("r_eagles_za", "g_eagles_za", [6], "11:15", "12:30"),
  R("r_jeugdsel_vr", "g_jeugdsel", [5], "16:00", "18:00"),
  R("r_jeugdsel_zo", "g_jeugdsel", [0], "09:00", "12:00", { freq: "biweekly", loc: "loc_baan", title: "Baantraining", start: "2026-10-11" }),
  R("r_heren1", "g_heren1", [2], "19:00", "21:00"),
  R("r_dames1", "g_dames1", [4], "19:00", "20:30"),
  R("r_begin_okt", "g_begin_okt", [1], "19:00", "20:30", { type: "at_cursus", start: "2026-10-05", end: null, count: 8 }),
  R("r_begin_nov", "g_begin_nov", [6], "13:00", "14:30", { type: "at_cursus", start: "2026-11-07", end: null, count: 8 }),
  R("r_pers", "g_pers", [1], "12:00", "13:00"),
  R("r_volw_do", "g_volw_do", [4], "10:00", "11:30"),
  R("r_senioren", "g_senioren", [2], "10:00", "11:30"),
  R("r_ladies", "g_ladies", [3], "09:30", "11:00"),
  // losse activiteiten
  { id: "r_overleg", kind: "activity", group_id: null, type_id: "at_overleg", title: "Coachoverleg", freq: "monthly_nth", interval: 1, weekdays: [], nth: { week: 1, weekday: 1 }, dates: null, start: "2026-10-05", end: "2027-03-28", count: null, van: "13:00", tot: "14:00", location_id: "loc_anders", coach_ids: ["c_tom", "c_sanne", "c_mark", "c_lisa", "c_daan", "c_eva"], note: "Clubhuis, vergaderruimte", season_id: "s_winter26", skip_breaks: false, archived: false },
  { id: "r_jeugdwedstrijd", kind: "activity", group_id: null, type_id: "at_wedstrijd", title: "Jeugd clubwedstrijd", freq: "once", interval: 1, weekdays: [], nth: null, dates: null, start: "2026-10-11", end: null, count: null, van: "13:00", tot: "17:00", location_id: "loc_par3", coach_ids: ["c_daan", "c_sanne"], note: "9 holes stableford, prijsuitreiking 16:30", season_id: "s_winter26", skip_breaks: false, archived: false },
  { id: "r_clinic", kind: "activity", group_id: null, type_id: "at_clinic", title: "Clinic bedrijfsuitje Rabobank", freq: "once", interval: 1, weekdays: [], nth: null, dates: null, start: "2026-10-16", end: null, count: null, van: "14:00", tot: "17:00", location_id: "loc_range", coach_ids: ["c_mark", "c_eva"], note: "24 deelnemers, 3 stations", season_id: "s_winter26", skip_breaks: false, archived: false },
  { id: "r_wintercomp", kind: "activity", group_id: null, type_id: "at_wedstrijd", title: "Wintercompetitie", freq: "biweekly", interval: 2, weekdays: [0], nth: null, dates: null, start: "2026-11-01", end: "2027-03-14", count: null, van: "10:00", tot: "15:00", location_id: "loc_baan", coach_ids: ["c_tom"], note: "Begeleiding selectie", season_id: "s_winter26", skip_breaks: true, archived: false },
  { id: "r_golfbeurs", kind: "activity", group_id: null, type_id: "at_overig", title: "Materiaal ophalen Golfbeurs", freq: "once", interval: 1, weekdays: [], nth: null, dates: null, start: "2026-10-09", end: null, count: null, van: "09:00", tot: "12:00", location_id: "loc_extern", coach_ids: ["c_tom"], note: "", season_id: "s_winter26", skip_breaks: false, archived: false },
];

export const OVERRIDES = [
  { id: "o1", rule_id: "r_jeugdsel_vr", date: "2026-10-09", status: "gepland", coach_ids: ["c_mark"], reason: "Tom op golfbeurs", note: "" },
  { id: "o2", rule_id: "r_birdies_wo", date: "2026-10-07", status: "cancelled", reason: "Onweer", note: "" },
  { id: "o3", rule_id: "r_heren1", date: "2026-10-13", status: "moved", new_date: "2026-10-14", van: "19:00", tot: "21:00", reason: "Baan dicht wegens onderhoud", note: "" },
];

const FIRST = ["Sem", "Noor", "Lucas", "Fleur", "Finn", "Julia", "Mees", "Saar", "Daan", "Evi", "Luuk", "Lotte", "Bram", "Zoë", "Thijs", "Mila", "Jesse", "Sophie", "Ruben", "Isa", "Pieter", "Anna", "Henk", "Marijke", "Jan", "Ingrid", "Kees", "Els", "Wim", "Carla", "Rob", "Petra", "Bas", "Linda", "Joost", "Mirjam"];
const LAST = ["de Jong", "Jansen", "de Vries", "van den Berg", "Bakker", "Visser", "Smit", "Meijer", "de Boer", "Mulder", "Bos", "Vos", "Peters", "Hendriks", "Dekker", "Brouwer", "Dijkstra", "Kok", "Vermeulen", "van Dijk"];
export const MEMBERS = []; export const GROUP_MEMBERS = [];
let mi = 0;
GROUPS.forEach((g, gi) => {
  const n = g.type_id === "gt_pers" ? 4 : g.type_id === "gt_begin" ? 6 : 7 + (gi % 3);
  for (let i = 0; i < n; i++) {
    const young = g.type_id === "gt_jeugd" || g.id === "g_jeugdsel";
    const fn = FIRST[(young ? 0 : 20) + ((gi * 5 + i * 3) % (young ? 20 : 16))];
    const ln = LAST[(gi * 7 + i * 5) % LAST.length];
    const id = "m_" + (++mi);
    MEMBERS.push({ id, name: fn + " " + ln, email: "", phone: "", birth_year: young ? 2026 - (7 + ((mi + i) % 10)) : null, note: "", active: true });
    GROUP_MEMBERS.push({ id: "gm_" + mi, group_id: g.id, member_id: id, since: "2026-10-05" });
  }
});

export const ACTION_ITEMS = [
  { id: "a1", coach_id: "c_tom", text: "Nieuwe oefenballen bestellen voor de range", date: "2026-10-10", done: false, link_group_id: null },
  { id: "a2", coach_id: "c_tom", text: "Ouders Eagles mailen over herfstvakantie", date: "2026-10-09", done: false, link_group_id: "g_eagles_wo" },
  { id: "a3", coach_id: "c_tom", text: "Trainingsplan jeugdselectie winter uitwerken", date: "2026-10-15", done: false, link_group_id: "g_jeugdsel" },
  { id: "a4", coach_id: "c_tom", text: "Rooster winter publiceren", date: "2026-10-05", done: true, link_group_id: null },
  { id: "a5", coach_id: "c_sanne", text: "Startpakketten beginnerscursus november klaarzetten", date: "2026-11-05", done: false, link_group_id: "g_begin_nov" },
];

export const LOGS = [
  { id: "l1", session_key: "r_eagles_wo_2026-10-07", rule_id: "r_eagles_wo", date: "2026-10-07", coach_id: "c_tom", given: true, as_planned: true, count: 8, worked_well: "Puttspel met punten werkte goed, veel energie", next_time: "Volgende keer chippen met verschillende clubs", created: "2026-10-07T17:50:00" },
  { id: "l2", session_key: "r_pers_2026-10-05", rule_id: "r_pers", date: "2026-10-05", coach_id: "c_eva", given: true, as_planned: false, count: 3, worked_well: "Alignment-oefening met stokken", next_time: "Korter warming-up, 1 deelnemer afwezig", created: "2026-10-05T13:05:00" },
];
export const ATTENDANCE = [];

export const DRILLS = DRILLS_SEED;

export const GROUP_THEMES = [
  { id: "t1", group_id: "g_eagles_wo", name: "Kort spel", start: "2026-10-05", weeks: 4, focus_cats: ["lageappr", "hogeappr", "putten"], goal: "Chip en putt met een vaste routine", color: "#F47C20" },
  { id: "t2", group_id: "g_eagles_wo", name: "Lange slag", start: "2026-11-02", weeks: 5, focus_cats: ["fullswing", "distwedge"], goal: "Solide set-up en contact met ijzer 7", color: "#4A6FA5" },
  { id: "t3", group_id: "g_eagles_wo", name: "Spel & baan", start: "2026-12-07", weeks: 4, focus_cats: ["spelen", "putten"], goal: "9 holes spelen met eigen strategie", color: "#17a05c" },
  { id: "t4", group_id: "g_jeugdsel", name: "Techniek & fysiek", start: "2026-10-05", weeks: 6, focus_cats: ["fullswing", "fysiek"], goal: "Swingaanpassingen vastzetten, kracht en mobiliteit", color: "#4A6FA5" },
  { id: "t5", group_id: "g_jeugdsel", name: "Scoren rond de green", start: "2026-11-16", weeks: 6, focus_cats: ["lageappr", "hogeappr", "bunker", "putten"], goal: "Up & down percentage verhogen", color: "#F47C20" },
  { id: "t6", group_id: "g_jeugdsel", name: "Wedstrijdvoorbereiding", start: "2027-01-04", weeks: 8, focus_cats: ["spelen", "prestatiegedrag"], goal: "Routines en strategie onder druk", color: "#8E6BB5" },
  { id: "t7", group_id: "g_begin_okt", name: "Kennismaking", start: "2026-10-05", weeks: 8, focus_cats: ["putten", "lageappr", "fullswing"], goal: "Basis van putten, chippen en de volle swing", color: "#17a05c" },
];

export function seedAll() {
  return {
    coaches: COACHES, members: MEMBERS, group_members: GROUP_MEMBERS, seasons: SEASONS, breaks: BREAKS, locations: LOCATIONS,
    group_types: GROUP_TYPES, activity_types: ACTIVITY_TYPES, groups: GROUPS, schedule_rules: RULES, overrides: OVERRIDES,
    logs: LOGS, attendance: ATTENDANCE, action_items: ACTION_ITEMS, drills: DRILLS, notifications: [], lesson_plans: [], group_themes: GROUP_THEMES, requests: [], programs: [],
  };
}
