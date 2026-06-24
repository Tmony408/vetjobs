"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../providers";
import SignInCard from "@/components/SignInCard";
import { genLetter, DEMO_HISTORY, STATUS_COLORS, STATUS_ORDER } from "@/lib/match";

const DAY = 86400000;

function Count({ to }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now(); const d = 750;
    const tick = (t) => { const k = Math.min(1, (t - t0) / d); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

export default function StatsPage() {
  const app = useApp();
  const [fRole, setFRole] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fSort, setFSort] = useState("newest");
  const [open, setOpen] = useState(0);

  const all = useMemo(() => {
    if (!app) return [];
    const { state } = app;
    const real = state.applications.map((a) => ({
      company: a.company || "—",
      title: a.title || "—",
      role: a.roleTitle || "Role",
      cvName: a.cvName || "CV",
      ts: a.appliedAt ? new Date(a.appliedAt).getTime() : Date.now(),
      status: a.status || "Applied",
      letter: a.letter || genLetter(a.company, a.title, a.roleTitle, state.personal.name),
    }));
    const demo = DEMO_HISTORY.map((d) => ({ company: d.company, title: d.title, role: d.role, cvName: d.cvName, ts: Date.now() - d.daysAgo * DAY, status: d.status, letter: genLetter(d.company, d.title, d.role, state.personal.name) }));
    return [...real, ...demo];
  }, [app]);

  if (!app) return null;
  if (!app.user) return <SignInCard what="see your dashboard" />;

  const roles = [...new Set(all.map((a) => a.role))];
  const week = all.filter((a) => Date.now() - a.ts < 7 * DAY).length;
  const responded = all.filter((a) => ["Viewed", "Interview", "Offer"].includes(a.status)).length;
  const resp = all.length ? Math.round((responded / all.length) * 100) : 0;

  const weeks = [0, 0, 0, 0, 0, 0];
  all.forEach((a) => { const w = Math.floor((Date.now() - a.ts) / (7 * DAY)); if (w >= 0 && w < 6) weeks[5 - w]++; });
  const mx = Math.max(1, ...weeks);

  const counts = {}; STATUS_ORDER.forEach((s) => (counts[s] = all.filter((a) => a.status === s).length));
  const tot = all.length || 1;

  const rc = {}; all.forEach((a) => (rc[a.role] = (rc[a.role] || 0) + 1));
  const rmx = Math.max(1, ...Object.values(rc));

  let list = all.slice();
  if (fRole !== "all") list = list.filter((a) => a.role === fRole);
  if (fStatus !== "all") list = list.filter((a) => a.status === fStatus);
  if (fSort === "newest") list.sort((a, b) => b.ts - a.ts);
  else if (fSort === "oldest") list.sort((a, b) => a.ts - b.ts);
  else if (fSort === "company") list.sort((a, b) => a.company.localeCompare(b.company));
  else if (fSort === "status") list.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  const circ = 339;
  const off = circ - (circ * resp) / 100;

  return (
    <>
      <div className="page-head">
        <h1>Your dashboard</h1>
        <p>Every application you&apos;ve sent, where it stands, and the CVs &amp; letters used.</p>
      </div>
      <div className="kpis">
        <div className="kpi a"><span className="ic">📨</span><div className="n"><Count to={all.length} /></div><div className="l">Total applications</div></div>
        <div className="kpi b"><span className="ic">⚡</span><div className="n"><Count to={week} /></div><div className="l">This week</div></div>
        <div className="kpi c"><span className="ic">📈</span><div className="n"><Count to={resp} /></div><div className="l">Response rate %</div></div>
        <div className="kpi d"><span className="ic">🛡️</span><div className="n"><Count to={app.state.dodged} /></div><div className="l">Scams dodged</div></div>
      </div>

      <div className="dashwrap">
        <div>
          <div className="section-title">Response rate</div>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#eee" strokeWidth="11" />
                <motion.circle cx="60" cy="60" r="54" fill="none" stroke="url(#g)" strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: off }}
                  transition={{ duration: 1.1, ease: [0.2, 0.7, 0.3, 1] }} style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
                <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2cbd78" /><stop offset="1" stopColor="#15915a" /></linearGradient></defs>
                <text x="60" y="58" textAnchor="middle" fontSize="26" fontWeight="800" fill="#15151f">{resp}%</text>
                <text x="60" y="78" textAnchor="middle" fontSize="10" fill="#7c7c8c">responded</text>
              </svg>
              <div><b>{responded} of {all.length}</b><div className="small">applications got a recruiter response (viewed, interview or offer).</div></div>
            </div>
          </div>
        </div>

        <div>
          <div className="section-title">Applications over time</div>
          <div className="card">
            <div className="bars">
              {weeks.map((c, i) => (
                <div className="b" key={i}>
                  <motion.div className="bar" initial={{ height: 0 }} animate={{ height: Math.round((c / mx) * 100) + "%" }} transition={{ delay: i * 0.07, type: "spring", stiffness: 120, damping: 16 }} />
                  <small>{i === 5 ? "now" : 5 - i + "w"}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="section-title">Pipeline by status</div>
          <div className="card">
            <div className="stackbar">
              {STATUS_ORDER.map((s, i) => counts[s] ? (
                <motion.i key={s} initial={{ width: 0 }} animate={{ width: (counts[s] / tot) * 100 + "%" }} transition={{ delay: i * 0.08, duration: 0.8 }} style={{ height: "100%", background: STATUS_COLORS[s] }} />
              ) : null)}
            </div>
            <div className="legend">
              {STATUS_ORDER.map((s) => (<span key={s}><i className="ldot" style={{ background: STATUS_COLORS[s] }} />{s} ({counts[s]})</span>))}
            </div>
          </div>
        </div>

        <div>
          <div className="section-title">Applications by role</div>
          <div className="card">
            {Object.entries(rc).sort((a, b) => b[1] - a[1]).map(([r, c], i) => (
              <div className="hbar" key={r}>
                <div className="lab"><span>{r}</span><b>{c}</b></div>
                <div className="track"><motion.div className="fill" initial={{ width: 0 }} animate={{ width: (c / rmx) * 100 + "%" }} transition={{ delay: i * 0.07, duration: 0.9 }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-title">All applications</div>
      <div className="controls">
        <select value={fRole} onChange={(e) => setFRole(e.target.value)}>
          <option value="all">All roles</option>
          {roles.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_ORDER.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={fSort} onChange={(e) => setFSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="company">Company A–Z</option>
          <option value="status">By status</option>
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        {list.length === 0 && <div className="card center small">No applications match these filters.</div>}
        {list.map((a, i) => (
          <div className="approw" key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div><b style={{ fontSize: 14 }}>{a.title}</b><div className="small">{a.company} · {new Date(a.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {a.cvName}</div></div>
              <span className={`appstatus st-${a.status}`}>{a.status}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", marginTop: 8 }} onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="small">CV &amp; cover letter used</span><span className="small">{open === i ? "▲" : "▼"}</span>
            </div>
            {open === i && (
              <div>
                <div className="cvchip"><span>📄</span><span>{a.cvName}</span><span style={{ marginLeft: "auto", opacity: 0.8 }}>{a.role}</span></div>
                <div className="out">{a.letter}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
