"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../providers";
import SignInCard from "@/components/SignInCard";
import { matchRoleToJob, genLetter, filledForm } from "@/lib/match";

export default function ApplyPage() {
  const app = useApp();
  const router = useRouter();
  const [paywall, setPaywall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState("");
  if (!app) return null;
  if (!app.user) return <SignInCard what="auto-apply to jobs" />;
  const { state, update, jobs, hasAccess, readyRoles } = app;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const verified = jobs.filter((j) => j.v.level === "verified");
  const matched = verified.filter((j) => { const r = matchRoleToJob(j, state.roles); return r && r.cvName; });
  const appliedJobs = jobs.filter((j) => state.applications.some((a) => a.jobId === j.id));
  const skipped = verified.length - matched.length;

  const runAutoApply = () => {
    const todo = [];
    verified.forEach((j) => {
      if (state.applications.some((a) => a.jobId === j.id)) return;
      const role = matchRoleToJob(j, state.roles);
      if (role && role.cvName) todo.push({ jobId: j.id, roleId: role.id });
    });
    if (!todo.length) return;
    setBusy(true);
    setTimeout(() => {
      update((s) => ({ applications: [...s.applications, ...todo.map((t) => ({ ...t, ts: Date.now() }))] }));
      setBusy(false);
      flash("Auto-applied to " + todo.length + " verified job(s) 🎉");
    }, 1000);
  };

  const toggle = () => {
    if (!state.autoOn) {
      if (!readyRoles.length) { flash("Add a role with a CV in Profile first"); router.push("/profile"); return; }
      if (!hasAccess) { setPaywall(true); return; }
      update({ autoOn: true });
      runAutoApply();
    } else {
      update({ autoOn: false });
      flash("Auto-apply paused");
    }
  };

  return (
    <>
      <div className={`autohero ${state.autoOn ? "on" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 19, fontWeight: 600 }}>Auto-apply</h2>
            <p style={{ margin: "5px 0 0", fontSize: 12.5, opacity: 0.92 }}>
              {state.autoOn
                ? `On. Watching for verified jobs across your ${readyRoles.length} role(s).`
                : "Set your roles & CVs once. We apply to every verified job that matches — right CV, tailored letter, your saved answers."}
            </p>
          </div>
          <div className={`switch ${state.autoOn ? "on" : ""}`} onClick={toggle}><i /></div>
        </div>
        {state.autoOn && (
          <>
            <div className="autostat">
              <div><b>{appliedJobs.length}</b><span>Applied</span></div>
              <div><b>{matched.length}</b><span>Match your roles</span></div>
              <div><b>{skipped}</b><span>Skipped</span></div>
            </div>
            <div className="watching"><span className="dot" /> Live — new matching jobs get a full application within minutes.</div>
          </>
        )}
      </div>

      {!readyRoles.length && (
        <div className="banner info" style={{ marginTop: 13 }}>
          <span>💡</span><span>Add at least one role with a CV in the <b>Profile</b> tab, then flip the switch on.</span>
        </div>
      )}

      <div className="section-title">Recent applications</div>
      {busy && <div className="card center"><b>Scanning verified jobs…</b><div className="small">Right CV, tailored letter, filled form for each</div></div>}
      {!busy && !appliedJobs.length && <div className="card center small">No applications yet. Turn auto-apply on above.</div>}

      {appliedJobs.map((j) => {
        const a = state.applications.find((x) => x.jobId === j.id);
        const role = state.roles.find((r) => r.id === a.roleId) || {};
        const isOpen = open === j.id;
        return (
          <div className="card" key={j.id}>
            <div className="banner ok" style={{ marginBottom: 9 }}>
              <span>✅</span><span>Applied to <b>{j.title}</b> at {j.company} — using <b>{role.cvName || "CV"}</b></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen(isOpen ? null : j.id)}>
              <span className="small">Tap to see what we submitted</span><span className="small">{isOpen ? "▲" : "▼"}</span>
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                  <div className="section-title" style={{ marginTop: 10 }}>Application form we filled</div>
                  <div className="card" style={{ margin: 0, boxShadow: "none" }}>
                    {filledForm(state.personal, state.answers, role, j).map(([k, v], idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--line)", fontSize: 12.5 }}>
                        <span style={{ color: "var(--muted)", flex: "0 0 44%" }}>{k}</span>
                        <span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="section-title">Tailored cover letter</div>
                  <div className="out">{genLetter(j.company, j.title, role.title, state.personal.name)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <AnimatePresence>
        {paywall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPaywall(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,22,.5)", display: "flex", alignItems: "flex-end", zIndex: 50 }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} onClick={(e) => e.stopPropagation()}
              style={{ background: "#fff", width: "100%", maxWidth: 520, margin: "0 auto", borderRadius: "26px 26px 0 0", padding: "22px 18px 30px" }}>
              <h3 style={{ fontSize: 20 }}>Unlock Auto-Apply</h3>
              <p className="small">Your free month covers this. After that, ₦3,000/mo.</p>
              <div style={{ fontSize: 30, fontWeight: 700, color: "var(--brand)", margin: "8px 0" }}>₦3,000<span style={{ fontSize: 14, color: "var(--muted)" }}>/month · 1st month free</span></div>
              <button className="btn brand" onClick={() => { update({ subscribed: true, autoOn: true }); setPaywall(false); runAutoApply(); flash("Free month started 🎉"); }}>Start free month</button>
              <div style={{ height: 8 }} />
              <button className="btn ghost" onClick={() => setPaywall(false)}>Maybe later</button>
              <p className="small center" style={{ marginTop: 10 }}>[Integration point: Paystack subscription]</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
