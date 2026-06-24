"use client";
import Link from "next/link";
import { motion } from "framer-motion";

const F = (d) => ({ initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: d } });

export default function Landing() {
  return (
    <>
      <motion.section className="lp-hero" {...F(0)}>
        <div className="lp-hero-content">
          <h1>Real jobs.<br />Zero scams.</h1>
          <p>Every job in Nigeria — plus remote roles abroad — vetted for fraud, freshest first. Then auto-apply with a tailored CV and cover letter.</p>
          <div className="lp-cta">
            <Link href="/login" className="btn brand">Get started — free</Link>
            <Link href="/verify" className="btn sec">Verify a job</Link>
          </div>
          <div className="lp-stats">
            <div><b>1.9M</b><span>chased 30k jobs</span></div>
            <div><b>0</b><span>scams get through</span></div>
            <div><b>1-tap</b><span>apply to verified jobs</span></div>
          </div>
        </div>
        <div className="lp-hero-art">
          <img src="/images/hero.jpg" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
      </motion.section>

      <div className="lp-features">
        <motion.div className="lp-feature lav" {...F(0.05)}><div className="lp-ic">✅</div><h3>Every listing fraud-scored</h3><p>We score each job Verified, Caution, or High-risk — so you never get scammed.</p></motion.div>
        <motion.div className="lp-feature mint" {...F(0.12)}><div className="lp-ic">⚡</div><h3>Set it once, apply everywhere</h3><p>Upload your CV once. We apply to every matching verified job with a tailored letter.</p></motion.div>
        <motion.div className="lp-feature peach" {...F(0.19)}><div className="lp-ic">🔍</div><h3>Paste any job message</h3><p>Got a job on WhatsApp or Telegram? Check if it&apos;s real in seconds — free, no account.</p></motion.div>
      </div>

      <motion.div className="lp-quote" {...F(0.05)}>
        <p>&quot;I applied to 14 verified jobs in a weekend and dodged 3 scams. VetJobs is the front door my job hunt needed.&quot;</p>
        <span>— Amaka O., Product Designer, Lagos</span>
      </motion.div>

      <div className="center" style={{ margin: "32px 0 10px" }}>
        <Link href="/login" className="btn brand" style={{ maxWidth: 300, margin: "0 auto" }}>Create your free account</Link>
        <div className="small" style={{ marginTop: 10 }}>Free to start · No card · The scam checker is always free.</div>
      </div>
    </>
  );
}
