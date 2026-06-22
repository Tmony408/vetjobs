"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { verifyJob } from "@/lib/verify";
import { useApp } from "../providers";

export default function VerifyPage() {
  const app = useApp();
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [res, setRes] = useState(null);

  const run = () => {
    if (!text.trim()) return;
    const r = verifyJob({ text: text.trim(), email: email.trim(), company: company.trim() });
    if (r.level === "risk") app?.update((s) => ({ dodged: s.dodged + 1 }));
    setRes(r);
  };

  const color = res && (res.level === "verified" ? "var(--green)" : res.level === "caution" ? "var(--amber)" : "var(--red)");
  const head = res && (res.level === "verified" ? "Looks legitimate" : res.level === "caution" ? "Be careful" : "Likely a SCAM — do not pay");

  return (
    <>
      <div className="page-head">
        <h1>Scam checker</h1>
        <p>Got a job from WhatsApp, Telegram or a friend? Paste it and we&apos;ll score it for fraud instantly — free, always.</p>
      </div>
      <div className="verify-grid">
        <div>
      <div className="card">
        <label className="fld">Job / recruiter message</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Congratulations! You've been shortlisted… Pay ₦7,500 processing fee. Contact recruiter on WhatsApp." />
        <label className="fld">Contact email (if any)</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr.recruitment2024@gmail.com" />
        <label className="fld">Company name (if any)</label>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Paystack" />
        <div style={{ height: 13 }} />
        <motion.button whileTap={{ scale: 0.98 }} className="btn brand" onClick={run}>Check this job</motion.button>
      </div>

      <AnimatePresence>
        {res && (
          <motion.div className="card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 16, color }}>{head}</b>
              <span className={`vbadge ${res.level === "verified" ? "v" : res.level === "caution" ? "c" : "r"}`}>
                {res.level === "verified" ? "✅ Verified" : res.level === "caution" ? "⚠️ Caution" : "⛔ High-risk"}
              </span>
            </div>
            <div className="scorebar">
              <motion.i style={{ background: color }} initial={{ width: 0 }} animate={{ width: res.score + "%" }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.3, 1] }} />
            </div>
            <div className="small" style={{ marginTop: 4 }}>Safety score: {res.score}/100</div>
            <div className={`banner ${res.level === "verified" ? "ok" : res.level === "caution" ? "warn" : "bad"}`} style={{ marginTop: 12 }}>
              <span>{res.level === "risk" ? "⛔" : res.level === "caution" ? "⚠️" : "✅"}</span>
              <span>
                {res.level === "risk"
                  ? "Never pay money to get a job. No real employer charges you to apply."
                  : res.level === "caution"
                  ? "Some warning signs. Verify the company directly before sharing anything."
                  : "No major red flags, but always confirm via official channels."}
              </span>
            </div>
            {res.reasons.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 8 }}>Why</div>
                <ul className="reasons">{res.reasons.map((x, k) => <li key={k}>• {x}</li>)}</ul>
              </>
            )}
            {res.good.length > 0 && (
              <ul className="reasons" style={{ color: "var(--green)" }}>{res.good.map((x, k) => <li key={k}>✓ {x}</li>)}</ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
        </div>
        <aside className="info-card">
          <h4>How we spot scams</h4>
          <div className="ic-row"><span className="t">✓</span> Demands for fees, BVN, ATM or OTP before a job</div>
          <div className="ic-row"><span className="t">✓</span> Personal Gmail/Yahoo instead of a company email</div>
          <div className="ic-row"><span className="t">✓</span> &quot;Congratulations / act fast / limited slots&quot; pressure</div>
          <div className="ic-row"><span className="t">✓</span> A company that can&apos;t be verified anywhere</div>
          <h4 style={{ marginTop: 16 }}>Always free</h4>
          <div className="ic-row"><span className="t">♥</span> Checking a job never costs anything — that&apos;s our promise.</div>
        </aside>
      </div>
    </>
  );
}
