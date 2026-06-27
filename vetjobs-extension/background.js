// Service worker: auth (Supabase), profile cache, and API calls. The popup and
// content script talk to it via chrome.runtime messages.
import { getConfig } from "./config.js";

const SESSION_KEY = "vj_session";
const PROFILE_KEY = "vj_profile";

async function saveSession(s) { await chrome.storage.local.set({ [SESSION_KEY]: s }); }
async function getSession() { return (await chrome.storage.local.get(SESSION_KEY))[SESSION_KEY] || null; }
async function clearSession() { await chrome.storage.local.remove([SESSION_KEY, PROFILE_KEY]); }

// --- Supabase auth via REST (email + password) ---
async function signIn(email, password) {
  const cfg = await getConfig();
  const r = await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.msg || j.error || "Sign-in failed");
  const session = {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in || 3600) * 1000,
    user: { id: j.user?.id, email: j.user?.email, name: j.user?.user_metadata?.full_name || "" },
  };
  await saveSession(session);
  return session.user;
}

async function refresh(session) {
  const cfg = await getConfig();
  const r = await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Session expired — sign in again.");
  const next = { ...session, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 };
  await saveSession(next);
  return next;
}

async function validToken() {
  let s = await getSession();
  if (!s) throw new Error("Not signed in");
  if (Date.now() > s.expires_at - 60000) s = await refresh(s);
  return s.access_token;
}

// --- VetJobs API ---
async function apiGet(path) {
  const cfg = await getConfig();
  const token = await validToken();
  const r = await fetch(cfg.API_BASE + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`API ${path} failed (${r.status})`);
  return r.json();
}
async function apiPost(path, body) {
  const cfg = await getConfig();
  const token = await validToken();
  const r = await fetch(cfg.API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`API ${path} failed (${r.status})`);
  return r.json();
}

// Load + cache the user's profile, roles (CV text), and saved answers.
async function loadProfile(force) {
  if (!force) {
    const cached = (await chrome.storage.local.get(PROFILE_KEY))[PROFILE_KEY];
    if (cached && Date.now() - cached.at < 10 * 60000) return cached.data;
  }
  const me = await apiGet("/me");
  const roles = Array.isArray(me.roles) ? me.roles : [];
  // Pick the role with the most CV text as the default context.
  const role = roles.slice().sort((a, b) => (b.cvText || "").length - (a.cvText || "").length)[0] || {};
  const data = {
    profile: {
      name: me.name || "",
      email: me.email || "",
      phone: me.phone || "",
      location: me.location || "",
      linkedin: me.linkedin || "",
      portfolio: me.portfolio || "",
    },
    role: { title: role.title || "", skills: role.skills || "" },
    cvText: role.cvText || "",
    answers: me.answers || {},
    roles: roles.map((r) => ({ id: r.id, title: r.title })),
  };
  await chrome.storage.local.set({ [PROFILE_KEY]: { at: Date.now(), data } });
  return data;
}

// --- message router ---
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case "SIGN_IN": sendResponse({ ok: true, user: await signIn(msg.email, msg.password) }); break;
        case "SIGN_OUT": await clearSession(); sendResponse({ ok: true }); break;
        case "SESSION": { const s = await getSession(); sendResponse({ ok: true, user: s?.user || null }); break; }
        case "PROFILE": sendResponse({ ok: true, data: await loadProfile(msg.force) }); break;
        case "ANSWER_BATCH": sendResponse({ ok: true, data: await apiPost("/answer/batch", msg.body) }); break;
        case "COVER_LETTER": sendResponse({ ok: true, data: await apiPost("/cover-letter", msg.body) }); break;
        case "RECORD_APPLICATION": sendResponse({ ok: true, data: await apiPost("/applications", msg.body) }); break;
        default: sendResponse({ ok: false, error: "Unknown message" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message || String(e) });
    }
  })();
  return true; // async response
});
