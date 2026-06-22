"use client";
import Link from "next/link";

export default function SignInCard({ what = "this" }) {
  return (
    <>
      <div className="page-head">
        <h1>Sign in required</h1>
        <p>Create a free account to {what}. The scam checker stays free without an account.</p>
      </div>
      <div className="card center" style={{ padding: 28 }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🔒</div>
        <p className="small" style={{ maxWidth: 360, margin: "0 auto 16px" }}>
          You need an account to apply for jobs, save your CVs, and track applications.
        </p>
        <Link href="/login" className="btn brand" style={{ maxWidth: 240, margin: "0 auto" }}>
          Sign in / Create account
        </Link>
      </div>
    </>
  );
}
