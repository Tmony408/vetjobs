"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "../providers";

export default function LoginPage() {
  const app = useApp();
  const router = useRouter();
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setErr("");
    if (!email || !password) { setErr("Email and password are required."); return; }
    setBusy(true);
    try {
      if (mode === "signup") await app.signup(email.trim(), password, name.trim());
      else await app.login(email.trim(), password);
      router.push("/");
    } catch (e2) {
      setErr(e2.message || "Something went wrong. Is the API running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p>{mode === "signup" ? "Free to join — apply to verified jobs and track everything in one place." : "Sign in to apply for jobs and see your dashboard."}</p>
      </div>

      <div style={{ maxWidth: 420 }}>
        <form className="card" onSubmit={submit}>
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

          <div style={{ height: 14 }} />
          <motion.button whileTap={{ scale: 0.98 }} className="btn brand" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </motion.button>
        </form>

        <p className="small center" style={{ marginTop: 12 }}>
          {mode === "signup" ? "Already have an account?" : "New to VetJobs?"}{" "}
          <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setErr(""); }} style={{ color: "var(--brand)", fontWeight: 600 }}>
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </>
  );
}
