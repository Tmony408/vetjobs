// Default config. The popup lets the user override API_BASE (e.g. for local dev).
// The Supabase anon key is public/safe to ship in a client (it only allows the
// same operations as the website's sign-in form).
export const DEFAULTS = {
  API_BASE: "https://vetjobs-api.onrender.com/api",
  SUPABASE_URL: "https://qmwksltoyvzxenevkbkq.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtd2tzbHRveXZ6eGVuZXZrYmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTMxMTUsImV4cCI6MjA5Nzg4OTExNX0.0w29NWNk2D69K7cD343Ln4DkB2W1jxV75WaicwiWeig",
};

export async function getConfig() {
  const saved = await chrome.storage.local.get(["API_BASE"]);
  return { ...DEFAULTS, ...saved };
}
