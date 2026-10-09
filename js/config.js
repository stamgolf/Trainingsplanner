// Configuratie Trainingsplanner.
// Laat supabaseUrl en supabaseAnonKey leeg om in demo-modus te draaien (gegevens blijven lokaal in de browser).
// Vul ze in na het aanmaken van je Supabase-project (Settings → API). Zie README.md.
window.TP_CONFIG = {
  appName: "Trainingsplanner",
  organisation: "Golfacademy Almeerderhout",
  supabaseUrl: "",
  supabaseAnonKey: "",
  // Mogen coaches drills direct publiceren (true) of eerst ter goedkeuring aan de coördinator (false)?
  drillsDirectPublish: true,
};
