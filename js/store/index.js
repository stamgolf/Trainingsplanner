import { createDemoStore } from "./demo.js";
import { createSupabaseStore } from "./supabase.js";

const cfg = window.TP_CONFIG || {};
export const store = (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) ? createSupabaseStore(cfg) : createDemoStore();

// Handige afgeleiden
export const isCoordinator = () => !!(store.me && store.me.is_coordinator);
export const isCoach = () => !!(store.me && store.me.is_coach);
export const coachById = id => store.byId("coaches", id);
export const groupById = id => store.byId("groups", id);
export const locById = id => store.byId("locations", id);
export const groupTypeById = id => store.byId("group_types", id);
export const actTypeById = id => store.byId("activity_types", id);
export const membersOf = gid => store.rows("group_members").filter(gm => gm.group_id === gid).map(gm => store.byId("members", gm.member_id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
export const activeSeason = (date) => { const d = date || new Date().toISOString().slice(0, 10); return store.rows("seasons").find(s => d >= s.start && d <= s.end) || store.rows("seasons").slice().sort((a, b) => (a.start < b.start ? 1 : -1))[0] || null; };
export const breaksAll = () => store.rows("breaks");
export const initials = name => (name || "?").split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
