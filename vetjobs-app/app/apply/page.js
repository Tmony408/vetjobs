"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../providers";
import SignInCard from "@/components/SignInCard";
import { matchRoleToJob, genLetter, filledForm } from "@/lib/match";
import { api } from "@/lib/api";

export default function ApplyPage() {
  const app = useApp();
  const router = useRouter();
  const [paywall, setPaywall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState("");
  if (!app) return null;
  if (!app.user) return <SignInCard what="auto-apply to jobs" />;
  const { state, update, jobs, hasAccess, readyRoles, reloadApplications } = app;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  // Apply to every non-scam job that matches a role (Verified + Caution) — not just "Verified",
  // since most live listings have no company-registry check and score as Caution.
  // A CV makes the application stronger but is NOT required — we still have the
  // profile, saved answers and a tailored letter, so we never skip a real match.
  const eligible = jobs.filter((j) => j.v.level !== "risk");
  const matched = eligible.filter((j) => matchRoleToJob(j, state.roles));
  const appliedJobs = state.applications;
  const skipped = eligible.length - matched.length;

  const runAutoApply = async () => {
    const todo = [];
    eligible.forEach((j) => {
      if (state.applications.some((a) => a.jobId === j.id)) return; // already applied
      const role = matchRoleToJob(j, state.roles);
      if (role) todo.push({ job: j, role });
    });
    if (!todo.length) {
      flash(matched.length ? "Already applied to all matching jobs ✅" : "No jobs match your roles yet — add or broaden a role in Profile");
      return;
    }
    setBusy(true);
    let ok = 0;
    let lastError = "";
    for (const { job, role } of todo) {
      // Real AI cover letter from the backend (Groq); falls back to the local writer.
      let letter = "";
      try {
        const r = await api.coverLetter({
          profile: { name: state.personal.name, email: state.personal.email, phone: state.personal.phone, location: state.personal.loc, linkedin: state.personal.linkedin },
          role: { title: role.title, skills: role.skills },
          job: { title: job.title, company: job.company, description: job.desc },
          cvText: role.cvText,
        });
        letter = r.letter;
      } catch {
        letter = genLetter(job.company, job.title, role.title, state.personal.name);
      }
      try {
        await api.addApplication({ jobId: job.id, company: job.company, title: job.title, roleTitle: role.title, cvName: role.cvName || "", status: "Applied", letter });
        ok++;
      } catch (e) {
        lastError = e?.message || "application failed";
      }
    }
    await reloadApplications();
    setBusy(false);
    if (ok) flash(`Auto-applied to ${ok} job${ok === 1 ? "" : "s"} 🎉`);
    else flash("Couldn't save applications: " + (lastError || "server error") + ". Try again or sign out and back in.");
  };

  const toggle = () => {
    if (!state.autoOn) {
      if (!readyRoles.length) { flash("Add at least one role in Profile first"); router.push("/profile"); return; }
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

      {appliedJobs.map((a, i) => {
        const key = a.id || i;
        const isOpen = open === key;
        const role = { title: a.roleTitle, cvName: a.cvName };
        const job = { company: a.company, title: a.title, desc: "" };
        return (
          <div className="card" key={key}>
            <div className="banner ok" style={{ marginBottom: 9 }}>
              <span>✅</span><span>Applied to <b>{a.title}</b> at {a.company} — using <b>{a.cvName || "CV"}</b></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen(isOpen ? null : key)}>
              <span className="small">Tap to see what we submitted</span><span className="small">{isOpen ? "▲" : "▼"}</span>
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                  <div className="section-title" style={{ marginTop: 10 }}>Application form we filled</div>
                  <div className="card" style={{ margin: 0, boxShadow: "none" }}>
                    {filledForm(state.personal, state.answers, role, job).map(([k, v], idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--line)", fontSize: 12.5 }}>
                        <span style={{ color: "var(--muted)", flex: "0 0 44%" }}>{k}</span>
                        <span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="section-title">Cover letter (AI)</div>
                  <div className="out">{a.letter}</div>
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
