"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/app/providers";

const items = [
  { href: "/", ic: "🛡️", l: "Jobs" },
  { href: "/verify", ic: "🔍", l: "Verify" },
  { href: "/apply", ic: "⚡", l: "Apply" },
  { href: "/stats", ic: "📊", l: "Stats" },
  { href: "/profile", ic: "👤", l: "Profile" },
];

export default function Nav() {
  const p = usePathname();
  const app = useApp();
  const plan = app?.state.subscribed
    ? "Subscribed"
    : app?.daysLeft > 0
    ? `${app.daysLeft} days left`
    : "Trial ended";

  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="logo">V</span>
        <span>VetJobs <small style={{ opacity: 0.55, fontWeight: 500 }}>NG</small></span>
      </div>
      <div className="nav-items">
        {items.map((it) => {
          const on = it.href === "/" ? p === "/" : p.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className={on ? "on" : ""}>
              <span className="ic">{it.ic}</span>
              {it.l}
            </Link>
          );
        })}
      </div>
      <div className="nav-foot">
        <div className="plan-card">
          <div className="small" style={{ opacity: 0.7 }}>Your plan</div>
          <b>{plan}</b>
        </div>
      </div>
    </nav>
  );
}
