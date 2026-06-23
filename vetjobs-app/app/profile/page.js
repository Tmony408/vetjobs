"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../providers";
import SignInCard from "@/components/SignInCard";
import { api } from "@/lib/api";

async function extractPdf(file) {
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = res; s.onerror = rej; document.body.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let t = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const pg = await pdf.getPage(p);
    const c = await pg.getTextContent();
    t += c.items.map((i) => i.str).join(" ") + "\n";
  }
  return t.trim();
}

export default function ProfilePage() {
  const app = useApp();
  const [toast, setToast] = useState("");
  if (!app) return null;
  if (!app.user) return <SignInCard what="manage your profile and CVs" />;
  const { state, update, daysLeft } = app;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  const setPersonal = (k, v) => update((s) => ({ personal: { ...s.personal, [k]: v } }));
  const setAnswer = (k, v) => update((s) => ({ answers: { ...s.answers, [k]: v } }));
  const addRole = () => update((s) => ({ roles: [...s.roles, { id: Date.now(), title: "", skills: "", cvName: "", cvText: "" }] }));
  const delRole = (id) => update((s) => ({ roles: s.roles.filter((r) => r.id !== id) }));
  const setRole = (id, k, v) => update((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, [k]: v } : r)) }));

  const onUpload = async (id, file) => {
    if (!file) return;
    let cvText = "";
    flash("Reading " + file.name + "…");
    try {
      if (/\.pdf$/i.test(file.name)) cvText = await extractPdf(file);
      else if (/\.txt$/i.test(file.name)) cvText = await file.text();
      else cvText = "[CV attached: " + file.name + ". DOCX parsing is a server-side step.]";
    } catch { cvText = "[Could not read " + file.name + " automatically]"; }
    // Best-effort: also store the original file in S3. Skips silently if S3 isn't
    // configured yet, so CV upload keeps working either way.
    let cvUrl = "";
    try {
      const { uploadUrl, publicUrl } = await api.mediaUploadUrl({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      cvUrl = publicUrl;
    } catch {}
    update((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, cvName: file.name, cvText, cvUrl } : r)) }));
    flash(cvUrl ? "CV uploaded to storage ✓" : "CV saved ✓");
  };

  const p = state.personal, a = state.answers;
  const plan = state.subscribed ? "Subscribed" : daysLeft > 0 ? "Free trial" : "Trial ended";

  return (
    <>
      <div className="page-head">
        <h1>Your profile</h1>
        <p>Your details, saved answers, and the CVs we use to auto-apply. Fill these once.</p>
      </div>
      <div className="section-title">Personal details</div>
      <div className="card">
        <p className="small" style={{ marginTop: 0 }}>Used on every application form.</p>
        <div className="grid2">
          <div><label className="fld">Full name</label><input value={p.name} onChange={(e) => setPersonal("name", e.target.value)} placeholder="Chioma Okafor" /></div>
          <div><label className="fld">Phone</label><input value={p.phone} onChange={(e) => setPersonal("phone", e.target.value)} placeholder="0803..." /></div>
        </div>
        <label className="fld">Email</label><input value={p.email} onChange={(e) => setPersonal("email", e.target.value)} placeholder="chioma@email.com" />
        <label className="fld">Location</label><input value={p.loc} onChange={(e) => setPersonal("loc", e.target.value)} placeholder="Lagos, Nigeria" />
        <div className="grid2">
          <div><label className="fld">LinkedIn</label><input value={p.linkedin} onChange={(e) => setPersonal("linkedin", e.target.value)} placeholder="linkedin.com/in/..." /></div>
          <div><label className="fld">Portfolio / GitHub</label><input value={p.portfolio} onChange={(e) => setPersonal("portfolio", e.target.value)} placeholder="github.com/..." /></div>
        </div>
      </div>

      <div className="section-title">Application answers</div>
      <div className="card">
        <p className="small" style={{ marginTop: 0 }}>Real applications ask these again and again. Answer once; we reuse them.</p>
        <div className="grid2">
          <div><label className="fld">Years of experience</label><input value={a.exp} onChange={(e) => setAnswer("exp", e.target.value)} placeholder="3" /></div>
          <div><label className="fld">Notice period</label><input value={a.notice} onChange={(e) => setAnswer("notice", e.target.value)} placeholder="1 month" /></div>
        </div>
        <label className="fld">Work authorization</label>
        <select value={a.auth} onChange={(e) => setAnswer("auth", e.target.value)}>
          <option value="">Select…</option>
          <option>Nigerian citizen — no sponsorship needed</option>
          <option>Need visa sponsorship</option>
          <option>Have work permit for target country</option>
        </select>
        <div className="grid2">
          <div><label className="fld">Salary expectation</label><input value={a.salary} onChange={(e) => setAnswer("salary", e.target.value)} placeholder="₦400k/month" /></div>
          <div><label className="fld">Open to relocation?</label>
            <select value={a.relocate} onChange={(e) => setAnswer("relocate", e.target.value)}><option value="">Select…</option><option>Yes</option><option>No</option><option>Remote only</option></select></div>
        </div>
        <label className="fld">How did you hear about us? (default)</label>
        <input value={a.heard} onChange={(e) => setAnswer("heard", e.target.value)} placeholder="VetJobs" />
      </div>

      <div className="section-title">Target roles &amp; CVs</div>
      <div className="banner info"><span>📄</span><span>Add each role you're chasing and upload a CV tuned for it. Auto-apply picks the right CV per job.</span></div>
      {state.roles.length === 0 && <div className="card center small">No roles yet. Add the first role you're applying for.</div>}
      {state.roles.map((r) => (
        <div className="roleCard" key={r.id}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={r.title} onChange={(e) => setRole(r.id, "title", e.target.value)} placeholder="Role e.g. Frontend Developer" style={{ fontWeight: 600 }} />
            <button className="btn sm danger" onClick={() => delRole(r.id)}>✕</button>
          </div>
          <label className="fld">Key skills (comma separated)</label>
          <input value={r.skills} onChange={(e) => setRole(r.id, "skills", e.target.value)} placeholder="React, JavaScript, UI design" />
          <label className="fld">CV for this role</label>
          {r.cvName ? (
            <div className="cvchip"><span>📄</span><span>{r.cvName}</span><span style={{ marginLeft: "auto", opacity: 0.8 }}>{r.cvText ? Math.round(r.cvText.length / 1000) + "k chars" : "attached"}</span></div>
          ) : null}
          <label className="upload" htmlFor={"cv" + r.id} style={{ marginTop: 8 }}>{r.cvName ? "Replace CV" : "⬆️ Upload CV (PDF or .txt)"}</label>
          <input id={"cv" + r.id} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: "none" }} onChange={(e) => onUpload(r.id, e.target.files[0])} />
        </div>
      ))}
      <motion.button whileTap={{ scale: 0.98 }} className="btn sec" onClick={addRole}>+ Add a role</motion.button>

      <div className="section-title">Account</div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><b>{p.name || "Guest"}</b><div className="small">{plan}</div></div>
          <span className={`vbadge ${daysLeft > 0 ? "v" : "r"}`}>{daysLeft} days left</span>
        </div>
        <div className="divider" />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div><b>{state.applications.length}</b> <span className="small">applied</span></div>
          <div><b>{state.dodged}</b> <span className="small">scams dodged</span></div>
          <div><b>{app.readyRoles.length}</b> <span className="small">roles</span></div>
        </div>
      </div>
      <div className="card">
        <b style={{ fontSize: 14 }}>Invite friends, earn free months</b>
        <p className="small">Every friend who joins with your code gives you <b>+30 free days</b>.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
          <input value="CHIOMA-4827" readOnly style={{ fontWeight: 700, letterSpacing: 1, textAlign: "center", color: "var(--brand)" }} />
          <button className="btn sm brand" onClick={() => { update((s) => ({ referrals: s.referrals + 1, bonusDays: s.bonusDays + 30 })); flash("+30 free days 🎁"); }}>Share</button>
        </div>
        <p className="small" style={{ marginBottom: 0 }}>{state.referrals} friends joined · {state.bonusDays} bonus days</p>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
