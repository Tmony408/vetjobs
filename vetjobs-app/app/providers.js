"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";

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
  roles: [],
  applications: [], // [{jobId, roleId, ts}]
};

function load() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem("vetjobs_state");
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

// Merge the server user record into local state (server is source of truth for profile).
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

  // hydrate from localStorage, then from the server if we have a token
  useEffect(() => {
    setState(load());
    (async () => {
      if (api.token()) {
        try {
          const me = await api.me();
          setUser({ id: me.id, email: me.email, name: me.name });
          setState((s) => mergeMe(s, me));
        } catch {
          api.clearToken();
        }
      }
      setReady(true);
    })();
  }, []);

  // persist local state
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("vetjobs_state", JSON.stringify(state)); } catch {}
  }, [state, ready]);

  // live jobs (public)
  useEffect(() => {
    let alive = true;
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => { if (alive) { setJobs(d.jobs || []); setLoadingJobs(false); } })
      .catch(() => { if (alive) setLoadingJobs(false); });
    return () => { alive = false; };
  }, []);

  // when signed in, sync profile + answers + account fields to the backend (debounced)
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

  const login = async (email, password) => {
    const r = await api.login({ email, password });
    api.setToken(r.access_token);
    setUser(r.user);
    try { const me = await api.me(); setState((s) => mergeMe(s, me)); } catch {}
  };
  const signup = async (email, password, name) => {
    const r = await api.signup({ email, password, name });
    api.setToken(r.access_token);
    setUser(r.user);
    setState((s) => ({ ...s, personal: { ...s.personal, name: name || "", email } }));
  };
  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  const daysLeft = Math.max(0, 30 + state.bonusDays - Math.floor((Date.now() - state.trialStart) / DAY));
  const hasAccess = state.subscribed || daysLeft > 0;

  const value = {
    state, update, user, login, signup, logout,
    jobs, loadingJobs, ready, daysLeft, hasAccess,
    readyRoles: state.roles.filter((r) => r.title && r.cvName),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
