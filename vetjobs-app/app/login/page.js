"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "../providers";

export default function LoginPage() {
  const app = useApp();
  const router = useRouter();
  const [mode, setMode] = useState("signup"); // 'login' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in? Don't show the login page — send them into the app.
  useEffect(() => { if (app?.user) router.replace("/jobs"); }, [app?.user, router]);

  const submit = async (e) => {
    e?.preventDefault();
    setErr(""); setMsg("");
    if (!email || !password) { setErr("Email and password are required."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = await app.signup(email.trim(), password, name.trim());
        if (r?.needsConfirmation) { setMsg("Almost there — check your email to confirm your account, then sign in."); return; }
      } else {
        await app.login(email.trim(), password);
      }
      router.push("/jobs");
    } catch (e2) {
      setErr(e2.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr("");
    try { await app.loginGoogle(); } catch (e2) { setErr(e2.message || "Google sign-in failed."); }
  };

  return (
    <div className="auth-split">
      <div className="auth-panel">
        <div className="auth-logo"><span className="logo">V</span> VetJobs</div>
        <h2>Your job hunt,<br />protected.</h2>
        <p>Join thousands of Nigerians finding verified jobs and auto-applying — without the scams.</p>
        <ul className="auth-points">
          <li>✅ Every job fraud-scored</li>
          <li>⚡ Auto-apply with a tailored CV</li>
          <li>🔍 Free scam checker</li>
        </ul>
        <div className="auth-art"><img src="/images/auth.jpg" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
      </div>

      <div className="auth-form">
        <div className="auth-tabs">
          <button className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setErr(""); }}>Create account</button>
          <button className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); }}>Sign in</button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label className="fld">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chioma Okafor" />
            </>
          )}
          <label className="fld">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          <label className="fld">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

          {err && <div className="banner bad" style={{ marginTop: 14 }}><span>⚠️</span><span>{err}</span></div>}
          {msg && <div className="banner ok" style={{ marginTop: 14 }}><span>✅</span><span>{msg}</span></div>}

          <div style={{ height: 16 }} />
          <motion.button whileTap={{ scale: 0.98 }} className="btn brand" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </motion.button>
          {/* Google sign-in is hidden until the Google provider is configured in Supabase.
              Re-enable by restoring this button:
              <button type="button" className="btn sec" style={{ marginTop: 10 }} onClick={google}>Continue with Google</button> */}
        </form>
      </div>
    </div>
  );
}
