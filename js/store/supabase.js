// Supabase-opslag: Postgres + Auth + Realtime. Zelfde interface als demo.js.
// Vereist window.supabase (supabase-js v2 via CDN, zie index.html) en TP_CONFIG.supabaseUrl/anonKey.
const TABLES = ["coaches", "members", "group_members", "seasons", "breaks", "locations", "group_types", "activity_types", "groups",
  "schedule_rules", "overrides", "logs", "attendance", "action_items", "drills", "notifications", "lesson_plans", "group_themes", "requests", "programs"];

export function createSupabaseStore(cfg) {
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const db = {}; TABLES.forEach(t => db[t] = []);
  const listeners = new Set();
  let me = null;
  let channel = null;

  function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

  async function loadAll() {
    const results = await Promise.all(TABLES.map(t => sb.from(t).select("*")));
    results.forEach((r, i) => { if (r.error) console.error(TABLES[i], r.error); else db[TABLES[i]] = r.data || []; });
  }
  async function resolveMe() {
    const { data } = await sb.auth.getUser();
    const user = data && data.user;
    if (!user) { me = null; return null; }
    me = db.coaches.find(c => c.user_id === user.id) || null;
    if (!me) {
      // eerste login: koppel op e-mailadres (coördinator heeft de coach vooraf aangemaakt)
      const byMail = db.coaches.find(c => (c.email || "").toLowerCase() === (user.email || "").toLowerCase());
      if (byMail) { const { data: upd } = await sb.from("coaches").update({ user_id: user.id }).eq("id", byMail.id).select().single(); me = upd || byMail; }
    }
    return me;
  }
  function subscribe() {
    if (channel) return;
    channel = sb.channel("tp-all");
    TABLES.forEach(t => channel.on("postgres_changes", { event: "*", schema: "public", table: t }, payload => {
      const rows = db[t];
      if (payload.eventType === "DELETE") { const i = rows.findIndex(r => r.id === payload.old.id); if (i >= 0) rows.splice(i, 1); }
      else { const i = rows.findIndex(r => r.id === payload.new.id); if (i >= 0) rows[i] = payload.new; else rows.push(payload.new); }
      emit();
    }));
    channel.subscribe();
  }

  return {
    mode: "supabase",
    get me() { return me; },
    async init() {
      const { data } = await sb.auth.getSession();
      if (data && data.session) { await loadAll(); await resolveMe(); subscribe(); }
      sb.auth.onAuthStateChange(async (ev) => {
        if (ev === "SIGNED_IN") { await loadAll(); await resolveMe(); subscribe(); emit(); }
        if (ev === "SIGNED_OUT") { me = null; TABLES.forEach(t => db[t] = []); emit(); }
      });
      return me;
    },
    rows(table) { return db[table] || (db[table] = []); },
    byId(table, id) { return (db[table] || []).find(r => r.id === id) || null; },
    async save(table, row) {
      if (!row.id) row.id = crypto.randomUUID();
      const { data, error } = await sb.from(table).upsert(row).select().single();
      if (error) { console.error(error); throw error; }
      const rows = this.rows(table); const i = rows.findIndex(r => r.id === data.id);
      if (i >= 0) rows[i] = data; else rows.push(data);
      emit(); return data;
    },
    async saveMany(table, list) { for (const r of list) await this.save(table, r); },
    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) { console.error(error); throw error; }
      const rows = this.rows(table); const i = rows.findIndex(r => r.id === id); if (i >= 0) rows.splice(i, 1);
      emit();
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async login(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async magicLink(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
    },
    async logout() { await sb.auth.signOut(); },
    coachesForLogin() { return []; },
  };
}
