// Tiny client for the VetJobs NestJS API.
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

function token() {
  try { return localStorage.getItem("vetjobs_token"); } catch { return null; }
}

async function req(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) { const t = token(); if (t) headers.Authorization = `Bearer ${t}`; }
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const e = await res.json(); if (e?.message) msg = Array.isArray(e.message) ? e.message.join(", ") : e.message; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  base: BASE,
  token,
  setToken: (t) => { try { localStorage.setItem("vetjobs_token", t); } catch {} },
  clearToken: () => { try { localStorage.removeItem("vetjobs_token"); } catch {} },

  signup: (b) => req("/auth/signup", { method: "POST", body: b, auth: false }),
  login: (b) => req("/auth/login", { method: "POST", body: b, auth: false }),

  me: () => req("/me"),
  patchMe: (b) => req("/me", { method: "PATCH", body: b }),

  roles: () => req("/roles"),
  addRole: (b) => req("/roles", { method: "POST", body: b }),
  updateRole: (id, b) => req(`/roles/${id}`, { method: "PATCH", body: b }),
  removeRole: (id) => req(`/roles/${id}`, { method: "DELETE" }),

  applications: () => req("/applications"),
  addApplication: (b) => req("/applications", { method: "POST", body: b }),

  coverLetter: (b) => req("/cover-letter", { method: "POST", body: b }),

  mediaUploadUrl: (b) => req("/media/upload-url", { method: "POST", body: b }),
};
