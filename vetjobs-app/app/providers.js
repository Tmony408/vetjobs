"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const DAY = 86400000;
const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const DEFAULTS = {
  trialStart: Date.now(),
  subscribed: false,
  bonusDays: 0,
  referrals: 0,
  dodged: 0,
  autoOn: false,
  personal: { name: "", email: "", phone: "", loc: "", linkedin: "", portfolio: "" },
  answers: { exp: "", notice: "", auth: "", salary: "", relocate: "", heard: "VetJobs" },
  roles: [],         // server-backed: { id, title, skills, cvName, cvText, cvUrl }
  applications: [],  // server-backed: { id, jobId, company, title, roleTitle, cvName, status, letter, appliedAt }
};

function load() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem("vetjobs_state");
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

// Server is the source of truth once signed in.
function mergeMe(s, me) {
  return {
    ...s,
    personal: {
      ...s.personal,
      name: me.name ?? s.personal.name,
      email: me.email ?? s.personal.email,
      phone: me.phone ?? s.personal.phone,
      loc: me.location ?? s.personal.loc,
      linkedin: me.linkedin ?? s.personal.linkedin,
      portfolio: me.portfolio ?? s.personal.portfolio,
    },
    answers: { ...s.answers, ...(me.answers || {}) },
    roles: me.roles || [],
    applications: me.applications || [],
    subscribed: !!me.subscribed,
    bonusDays: me.bonusDays || 0,
    referrals: me.referrals || 0,
    dodged: me.dodged || 0,
    trialStart: me.trialStart ? new Date(me.trialStart).getTime() : s.trialStart,
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(DEFAULTS);
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [ready, setReady] = useState(false);
  const syncTimer = useRef(null);

  useEffect(() => {
    setState(load());
    const applySession = async (session) => {
      if (session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email, name: u.user_metadata?.full_name || u.user_metadata?.name || "" });
        try { const me = await api.me(); setState((s) => mergeMe(s, me)); } catch {}
      } else {
        setUser(null);
        setState((s) => ({ ...s, roles: [], applications: [] }));
      }
    };
    (async () => {
      const { data } = await supabase.auth.getSession();
      await applySession(data?.session);
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { applySession(session); });
    return () => { sub?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("vetjobs_state", JSON.stringify(state)); } catch {}
  }, [state, ready]);

  useEffect(() => {
    let alive = true;
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => { if (alive) { setJobs(d.jobs || []); setLoadingJobs(false); } })
      .catch(() => { if (alive) setLoadingJobs(false); });
    return () => { alive = false; };
  }, []);

  // debounced sync of profile + answers + account fields to the backend
  useEffect(() => {
    if (!ready || !user) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      api.patchMe({
        name: state.personal.name,
        phone: state.personal.phone,
        location: state.personal.loc,
        linkedin: state.personal.linkedin,
        portfolio: state.personal.portfolio,
        answers: state.answers,
        subscribed: state.subscribed,
        bonusDays: state.bonusDays,
        referrals: state.referrals,
        dodged: state.dodged,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(syncTimer.current);
  }, [state.personal, state.answers, state.subscribed, state.bonusDays, state.referrals, state.dodged, user, ready]);

  const update = useCallback((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  // ---- auth (Supabase) ----
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // onAuthStateChange hydrates the profile.
  };
  const signup = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  };
  const loginGoogle = async () => {
    const redirectTo = typeof window !== "undefined" ? window.location.origin + "/jobs" : undefined;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) throw new Error(error.message);
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setState((s) => ({ ...s, roles: [], applications: [] }));
  };

  // ---- roles (server-backed) ----
  const addRole = async () => {
    try {
      const r = await api.addRole({ title: "", skills: "", cvName: "", cvText: "", cvUrl: "" });
      setState((s) => ({ ...s, roles: [...s.roles, r] }));
    } catch {}
  };
  const updateRoleLocal = (id, patch) =>
    setState((s) => ({ ...s, roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const updateRole = async (id, patch) => {
    updateRoleLocal(id, patch);
    try { await api.updateRole(id, patch); } catch {}
  };
  const removeRole = async (id) => {
    setState((s) => ({ ...s, roles: s.roles.filter((r) => r.id !== id) }));
    try { await api.removeRole(id); } catch {}
  };

  // ---- applications (server-backed) ----
  const reloadApplications = async () => {
    try { const apps = await api.applications(); setState((s) => ({ ...s, applications: apps || [] })); } catch {}
  };

  const daysLeft = Math.max(0, 30 + state.bonusDays - Math.floor((Date.now() - state.trialStart) / DAY));
  const hasAccess = state.subscribed || daysLeft > 0;

  const value = {
    state, update, user, login, signup, logout, loginGoogle,
    addRole, updateRole, updateRoleLocal, removeRole, reloadApplications,
    jobs, loadingJobs, ready, daysLeft, hasAccess,
    readyRoles: state.roles.filter((r) => r.title && r.cvName),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
