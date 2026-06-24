"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/app/providers";

const items = [
  { href: "/jobs", ic: "🛡️", l: "Find Jobs", s: "Jobs" },
  { href: "/verify", ic: "🔍", l: "Verify", s: "Verify" },
  { href: "/apply", ic: "⚡", l: "Auto-Apply", s: "Apply" },
  { href: "/stats", ic: "📊", l: "Stats", s: "Stats" },
  { href: "/profile", ic: "👤", l: "Profile", s: "Profile" },
];

export default function Shell({ children }) {
  const p = usePathname();
  const router = useRouter();
  const app = useApp();
  const active = (h) => (h === "/" ? p === "/" : p.startsWith(h));
  const user = app?.user;

  return (
    <>
      <header className="topnav">
        <Link href="/" className="brand">
          <span className="logo">V</span> VetJobs{" "}
          <small style={{ opacity: 0.55, fontWeight: 500, fontSize: 13 }}>NG</small>
        </Link>
        <nav className="topnav-links">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className={active(it.href) ? "on" : ""}>{it.l}</Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <span className="pill-plan" title={user.email}>{user.name || user.email.split("@")[0]}</span>
              <button className="btn sm sec" onClick={() => { app.logout(); router.push("/"); }}>Log out</button>
            </>
          ) : (
            <Link href="/login" className="btn sm brand">Sign in</Link>
          )}
        </div>
      </header>

      <main className="app">{children}</main>

      <nav className="nav">
        <div className="nav-items">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className={active(it.href) ? "on" : ""}>
              <span className="ic">{it.ic}</span>
              {it.s}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
