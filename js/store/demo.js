// Demo-opslag: alles in localStorage, met voorbeelddata. Zelfde interface als de Supabase-opslag.
import { seedAll } from "../data/seed.js";

const KEY = "tp_demo_v2";
const SESSION_KEY = "tp_demo_user";

export function createDemoStore() {
  let db = null;
  const listeners = new Set();
  let me = null;

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); const seed = seedAll(); Object.keys(seed).forEach(k => { if (!db[k]) db[k] = seed[k]; }); return; } } catch (e) { }
    db = seedAll();
    persist();
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
  function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

  return {
    mode: "demo",
    get me() { return me; },
    async init() {
      load();
      const uid = localStorage.getItem(SESSION_KEY);
      me = uid ? db.coaches.find(c => c.id === uid) || null : null;
      return me;
    },
    rows(table) { return db[table] || (db[table] = []); },
    byId(table, id) { return (db[table] || []).find(r => r.id === id) || null; },
    async save(table, row) {
      const rows = this.rows(table);
      if (!row.id) row.id = "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      const i = rows.findIndex(r => r.id === row.id);
      if (i >= 0) rows[i] = { ...rows[i], ...row }; else rows.push(row);
      persist(); emit();
      return rows.find(r => r.id === row.id);
    },
    async saveMany(table, list) { for (const r of list) await this.save(table, r); },
    async remove(table, id) {
      const rows = this.rows(table);
      const i = rows.findIndex(r => r.id === id);
      if (i >= 0) rows.splice(i, 1);
      persist(); emit();
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    // auth
    async loginDemo(coachId) { me = db.coaches.find(c => c.id === coachId) || null; if (me) localStorage.setItem(SESSION_KEY, me.id); emit(); return me; },
    async login() { throw new Error("Demo-modus: kies een coach om als in te loggen."); },
    async logout() { me = null; localStorage.removeItem(SESSION_KEY); emit(); },
    async resetDemo() { localStorage.removeItem(KEY); db = seedAll(); persist(); emit(); },
    coachesForLogin() { return db.coaches.filter(c => c.active); },
  };
}
