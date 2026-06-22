"use client";
import { motion } from "framer-motion";

const LOGO_COLORS = ["#15915a", "#1faf6a", "#e0944f", "#9b7be0", "#1f6feb"];

function Badge({ level }) {
  if (level === "verified") return <span className="vbadge v">✅ Verified</span>;
  if (level === "caution") return <span className="vbadge c">⚠️ Caution</span>;
  return <span className="vbadge r">⛔ High-risk</span>;
}

export default function JobCard({ job, i, onApply, onReport }) {
  const scam = job.v.level === "risk";
  const color = scam ? "var(--red)" : LOGO_COLORS[i % LOGO_COLORS.length];
  const tags = (job.tags && job.tags.length ? job.tags : [job.type]).slice(0, 4);

  return (
    <motion.div
      className={`jrow ${scam ? "scam" : ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35 }}
      whileHover={{ y: -3 }}
    >
      <div className="jrow-logo" style={{ background: color }}>{(job.company || "?")[0]}</div>
      <div className="jrow-body">
        <div className="jrow-top">
          <div>
            <div className="jrow-title">{job.title}</div>
            <div className="jrow-meta">
              <b>{job.company}</b> · {job.type}
              {job.pay && job.pay !== "—" ? ` · ${job.pay}` : ""} · {job.loc}
            </div>
          </div>
          <button className="bk2" onClick={() => onApply?.(job)} title="Save / apply">🔖</button>
        </div>

        {job.desc ? <p className="jrow-desc">{job.desc}</p> : null}

        <div className="jrow-tags">
          {tags.map((t, k) => (
            <span className="jtag" key={k}>{t}</span>
          ))}
          {job.source && job.source !== "seed" && <span className="jtag">via {job.source}</span>}
        </div>

        <div className="jrow-foot">
          <Badge level={job.v.level} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="jrow-posted">🕒 {job.days === 0 ? "Today" : job.days + "d ago"}</span>
            {scam ? (
              <motion.button whileTap={{ scale: 0.95 }} className="pill-dark" style={{ background: "var(--red)" }} onClick={() => onReport?.(job)}>
                Report scam
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }} className="pill-dark" style={{ background: "var(--brand)" }} onClick={() => onApply?.(job)}>
                Auto-apply
              </motion.button>
            )}
          </div>
        </div>

        {job.v.reasons.length ? <div className="reasons" style={{ marginTop: 9 }}>• {job.v.reasons[0]}</div> : null}
      </div>
    </motion.div>
  );
}
