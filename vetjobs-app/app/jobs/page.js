"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useApp } from "../providers";
import JobCard from "@/components/JobCard";

export default function JobsPage() {
  const app = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [jobType, setJobType] = useState({ full: false, remote: false, abroad: false });
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [toast, setToast] = useState("");

  const jobs = app?.jobs || [];
  const counts = {
    v: jobs.filter((j) => j.v.level === "verified").length,
    c: jobs.filter((j) => j.v.level === "caution").length,
    r: jobs.filter((j) => j.v.level === "risk").length,
  };

  let list = jobs.filter((j) => (j.title + " " + j.company).toLowerCase().includes(q.toLowerCase()));
  if (verifiedOnly) list = list.filter((j) => j.v.level === "verified");
  const anyType = jobType.full || jobType.remote || jobType.abroad;
  if (anyType) {
    list = list.filter(
      (j) =>
        (jobType.full && /full/i.test(j.type)) ||
        (jobType.remote && /remote/i.test(j.loc + " " + j.type)) ||
        (jobType.abroad && /abroad/i.test(j.type))
    );
  }

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const report = () => { app.update((s) => ({ dodged: s.dodged + 1 })); flash("Reported. Thanks for protecting others 🛡️"); };
  const clearAll = () => { setJobType({ full: false, remote: false, abroad: false }); setVerifiedOnly(false); setQ(""); };

  return (
    <>
      <div className="jobs-hero">
        <h2>Looking for your next role?</h2>
        <p>VetJobs is where you find real, scam-free jobs — every listing vetted for fraud, freshest first.</p>
        <div className="jobs-search">
          <span style={{ opacity: 0.85 }}>🔍</span>
          <input placeholder="Search role or company…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button>Search</button>
        </div>
      </div>

      <div className="jobs-body">
        <aside className="filters">
          <div className="filters-head">
            <h4 style={{ fontSize: 15 }}>Filter</h4>
            <button className="clear" onClick={clearAll}>Clear all</button>
          </div>
          <div className="filter-group">
            <h4>Verification</h4>
            <label className="check">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Verified only
            </label>
            <div className="small" style={{ marginTop: 6 }}>{counts.v} verified · {counts.c} caution · {counts.r} blocked</div>
          </div>
          <div className="filter-group">
            <h4>Job type</h4>
            <label className="check"><input type="checkbox" checked={jobType.full} onChange={(e) => setJobType((s) => ({ ...s, full: e.target.checked }))} /> Full-time</label>
            <label className="check"><input type="checkbox" checked={jobType.remote} onChange={(e) => setJobType((s) => ({ ...s, remote: e.target.checked }))} /> Remote</label>
            <label className="check"><input type="checkbox" checked={jobType.abroad} onChange={(e) => setJobType((s) => ({ ...s, abroad: e.target.checked }))} /> Abroad</label>
          </div>
        </aside>

        <div className="jobs-main">
          <div className="section-title">Recommended jobs <span className="count-badge">{list.length}</span></div>
          {app?.loadingJobs ? (
            <div className="card center small">Loading fresh jobs…</div>
          ) : (
            <div id="feed">
              <AnimatePresence mode="popLayout">
                {list.map((job, i) => (
                  <JobCard key={job.id} job={job} i={i} onApply={() => router.push("/apply")} onReport={report} />
                ))}
              </AnimatePresence>
              {!list.length && <div className="card center small">No jobs match these filters.</div>}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
