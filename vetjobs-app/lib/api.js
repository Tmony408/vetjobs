// Tiny client for the VetJobs NestJS API. Auth token comes from the Supabase session.
import { supabase } from "@/lib/supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function token() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

async function req(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) { const t = await token(); if (t) headers.Authorization = `Bearer ${t}`; }
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

  me: () => req("/me"),
  patchMe: (b) => req("/me", { method: "PATCH", body: b }),

  roles: () => req("/roles"),
  addRole: (b) => req("/roles", { method: "POST", body: b }),
  updateRole: (id, b) => req(`/roles/${id}`, { method: "PATCH", body: b }),
  removeRole: (id) => req(`/roles/${id}`, { method: "DELETE" }),

  applications: () => req("/applications"),
  addApplication: (b) => req("/applications", { method: "POST", body: b }),

  coverLetter: (b) => req("/cover-letter", { method: "POST", body: b }),
  answer: (b) => req("/answer", { method: "POST", body: b }),
  answerBatch: (b) => req("/answer/batch", { method: "POST", body: b }),

  mediaUploadUrl: (b) => req("/media/upload-url", { method: "POST", body: b }),
};
